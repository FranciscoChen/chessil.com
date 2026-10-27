const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const versions = new Map();
function assetVersion(url) {
  if (!versions.has(url)) {
    const content = fs.readFileSync(path.join(__dirname, 'web', url));
    versions.set(url, crypto.createHash('sha256').update(content).digest('hex').slice(0, 12));
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
    .replace(/<!-- component:(header|footer) -->/g, (_, name) => parts[name])
    .replace(/(href|src)="(\/(?:css|js)\/[^"?]+)"/g, (_, attribute, url) => `${attribute}="${assetVersion(url)}"`)
    .replace('<html ', `<html data-theme="${theme === 'l' ? 'light' : 'dark'}" `);
  return Buffer.from(html);
};
