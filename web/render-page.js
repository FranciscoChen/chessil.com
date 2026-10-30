const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const versions = new Map();
const ui = require('./ui/pages');
const importPattern = /@import\s+url\(['"]?([^'"\)]+)['"]?\)/g;
function localImport(url, reference) {
  if (/^(?:[a-z]+:|\/\/)/i.test(reference)) return null;
  const imported = path.posix.resolve(path.posix.dirname(url), reference.split('?')[0]);
  return imported.startsWith('/css/') ? imported : null;
}
function assetVersion(url) {
  if (!versions.has(url)) {
    const content = fs.readFileSync(path.join(__dirname, 'web', url));
    const hash = crypto.createHash('sha256').update(content);
    if (url.endsWith('.css')) {
      for (const [, reference] of content.toString('utf8').matchAll(importPattern)) {
        const imported = localImport(url, reference);
        if (imported) hash.update(assetVersion(imported));
      }
    }
    versions.set(url, hash.digest('hex').slice(0, 12));
  }
  return url + '?v=' + versions.get(url);
}

// Load shared markup once per process; deployments restart both web instances.
const components = {};
for (const language of ['en', 'es', 'zh']) {
  components[language] = {};
  for (const name of ['header', 'footer']) {
    components[language][name] = fs.readFileSync(
      path.join(__dirname, 'web', 'components', `${name}-${language}.html`), 'utf8');
  }
}

module.exports = function renderPage(data, language, theme) {
  const parts = components[language] || components.en;
  const html = data.toString('utf8')
    .replace(/<!-- ui:([a-z-]+) -->/g, (_, name) => ui.render(name, language))
    .replace('</head>', '<link rel="stylesheet" href="/css/design-system.css"><link rel="stylesheet" href="/css/preferences.min.css"><script defer src="/js/ui.js"></script><script defer src="/js/preferences.min.js"></script></head>')
    .replace(/<!-- component:(header|footer) -->/g, (_, name) => parts[name])
    .replace(/(href|src)="(\/(?:css|js)\/[^"?]+)"/g, (_, attribute, url) => `${attribute}="${assetVersion(url)}"`)
    .replace('<html ', `<html data-theme="${theme === 'l' ? 'light' : 'dark'}" `);
  return Buffer.from(html);
};

// Imported styles need their own versioned URLs; a parent query string alone
// does not invalidate the browser's cached header/layout stylesheets.
module.exports.styles = function renderStyles(data, url) {
  return Buffer.from(data.toString('utf8').replace(importPattern, (match, reference) => {
    const imported = localImport(url, reference);
    return imported ? '@import url("' + assetVersion(imported) + '")' : match;
  }));
};
