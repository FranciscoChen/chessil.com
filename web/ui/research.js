'use strict';

const { button } = require('./components');
const reports = require('../research/reports');
const copy = {
 en: {
  index: 'Engine research', series: 'Stockfish Hybrid', reports: 'Research reports',
  intro: 'Follow the development of our Stockfish hybrid, from legal move generation to neural move ordering and selective search.',
  tools: 'Research tools', analysis: 'Open analysis board', database: 'Browse games',
  browse: 'All reports', evidence: 'Experiment records', sources: 'References',
  previous: 'Previous report', next: 'Next report', contents: 'On this page',
 },
 es: {
  index: 'Investigación del motor', series: 'Stockfish híbrido', reports: 'Informes de investigación',
  intro: 'Sigue el desarrollo de nuestro Stockfish híbrido, desde la generación de jugadas legales hasta el orden neuronal y la búsqueda selectiva.',
  tools: 'Herramientas de investigación', analysis: 'Abrir tablero de análisis', database: 'Explorar partidas',
  browse: 'Todos los informes', evidence: 'Registros de los experimentos', sources: 'Referencias',
  previous: 'Informe anterior', next: 'Siguiente informe', contents: 'En esta página',
 },
 zh: {
  index: '引擎研究', series: 'Stockfish 混合引擎', reports: '研究报告',
  intro: '了解 Stockfish 混合引擎的开发过程，从生成合法着法，到神经网络排序和选择性搜索。',
  tools: '研究工具', analysis: '打开分析棋盘', database: '浏览棋局',
  browse: '全部报告', evidence: '实验记录', sources: '参考资料',
  previous: '上一篇报告', next: '下一篇报告', contents: '本页目录',
 },
};
const translations = { en: require('../research/en'), es: require('../research/es'), zh: require('../research/zh') };
const locales = { en: 'en', es: 'es', zh: 'zh-CN' };
const dateFormatter = Object.fromEntries(Object.entries(locales).map(([lang, locale]) =>
 [lang, new Intl.DateTimeFormat(locale, { timeZone: 'UTC', dateStyle: 'medium' })]));
const escape = value => String(value).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
const reportUrl = (lang, report) => `/${lang}/report/${report.slug}`;
const date = (lang, value) => `<time datetime="${value}">${dateFormatter[lang].format(new Date(value))}</time>`;

function index(lang, tools) {
 const t = copy[lang], articles = translations[lang];
 const cards = reports.map(report => {
  const article = articles[report.slug];
  const heading = tools ? 'h3' : 'h2';
  return `<li class="ui-panel research-entry">
   ${date(lang, report.date)}
   <${heading}><a href="${reportUrl(lang, report)}">${escape(article.title)}</a></${heading}>
   <p class="ui-muted">${escape(article.summary)}</p>
  </li>`;
 }).join('');
 return `<main id="main-content" class="ui-page research-page">
  <header class="ui-page-heading"><p class="eyebrow">${t.series}</p><h1>${tools ? t.index : t.reports}</h1><p class="ui-intro">${t.intro}</p>
   ${tools ? `<nav class="ui-actions research-tools" aria-label="${t.tools}">${button(lang, 'analysis', t.analysis, 'ui-primary')}${button(lang, 'database', t.database)}</nav>` : ''}
  </header>
  <section${tools ? ' aria-labelledby="research-report-list"' : ''}>${tools ? `<h2 id="research-report-list">${t.reports}</h2>` : ''}
   <ol class="research-list"${tools ? '' : ` aria-label="${t.reports}"`}>${cards}</ol>
  </section>
 </main>`;
}

function table(report, lang) {
 const languageIndex = { en: 0, es: 1, zh: 2 }[lang];
 const headings = report.headings[languageIndex];
 return `<div class="ui-table-wrap research-table" tabindex="0" role="region" aria-label="${escape(headings[0])}">
  <table><thead><tr>${headings.map(heading => `<th scope="col">${escape(heading)}</th>`).join('')}</tr></thead>
  <tbody>${report.rows.map(([label, ...values]) => `<tr><th scope="row">${escape(label[languageIndex])}</th>${values.map(value => `<td>${escape(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>
 </div>`;
}

function article(lang, slug) {
 const position = reports.findIndex(report => report.slug === slug);
 const report = reports[position], t = copy[lang], articles = translations[lang];
 const { title, summary, sections } = articles[slug];
 const sectionId = index => `method-${index + 1}`;
 const adjacent = [[reports[position - 1], t.previous], [reports[position + 1], t.next]];
 return `<main id="main-content" class="ui-page research-page">
  <header class="research-report-heading ui-page-heading">
   <nav aria-label="${t.reports}"><a href="/${lang}/research">← ${t.browse}</a></nav>
   <div class="research-byline"><span>${t.series}</span>${date(lang, report.date)}</div>
   <h1>${escape(title)}</h1><p class="ui-intro">${escape(summary)}</p>
  </header>
  <div class="research-reading">
   <nav class="research-contents" aria-label="${t.contents}"><p class="eyebrow">${t.contents}</p><ol>
    ${sections.map(([heading], index) => `<li><a href="#${sectionId(index)}">${escape(heading)}</a></li>`).join('')}
   </ol></nav>
   <article class="research-article">
    ${sections.map(([heading, text], index) => `<section id="${sectionId(index)}"><h2>${escape(heading)}</h2><p>${escape(text)}</p>${index === sections.length - 1 ? table(report, lang) : ''}</section>`).join('')}
    <section class="research-sources"><h2>${t.evidence}</h2><ul>${report.evidence.map(entry => `<li><code>${escape(entry)}</code></li>`).join('')}</ul>
     <h2>${t.sources}</h2><ul>${report.sources.map(([label, url]) => `<li><a href="${escape(url)}">${escape(label)}</a></li>`).join('')}</ul>
    </section>
    <nav class="research-pagination" aria-label="${t.reports}">${adjacent.filter(([other]) => other).map(([other, label]) =>
     `<a href="${reportUrl(lang, other)}"><span>${label}</span>${escape(articles[other.slug].title)}</a>`).join('')}</nav>
   </article>
  </div>
 </main>`;
}

exports.render = (name, lang) => {
 if (name === 'research' || name === 'report') return index(lang, name === 'research');
 return article(lang, name.slice('report-'.length));
};
