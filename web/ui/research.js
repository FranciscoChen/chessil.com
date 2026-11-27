'use strict';

const { button, codeSnippet } = require('./components');
const { date, match, benchmark, code } = require('../research/reports');
const copy = { en: require('../research/en'), es: require('../research/es'), zh: require('../research/zh') };
const score = (match.wins + match.draws / 2) / match.games;

exports.render = (name, lang) => {
 const t = copy[lang];
 const number = (value, digits = 0) => new Intl.NumberFormat(lang, {
  minimumFractionDigits: digits, maximumFractionDigits: digits,
 }).format(value);
 const signed = value => '+' + number(value, 1);
 const formattedDate = new Intl.DateTimeFormat(lang, { timeZone: 'UTC', dateStyle: 'long' }).format(new Date(date));
 const time = `<time datetime="${date}">${formattedDate}</time>`;
 const elo = `${signed(match.elo)} Elo`;
 const interval = `${signed(match.low)} – ${signed(match.high)} Elo`;
 if (name === 'research') {
  return `<main id="main-content" class="ui-page research-page">
   <header class="ui-page-heading"><h1>${t.index}</h1>
    <nav class="ui-actions research-tools" aria-label="${t.index}">${button(lang, 'analysis', t.analysis, 'ui-primary')}${button(lang, 'database', t.database)}</nav>
   </header>
   <article class="ui-panel research-entry">
    ${time}<h2><a href="/${lang}/report">${t.title}</a></h2>
    <p><strong>${elo}</strong><span class="ui-muted"> · ${t.confidence} ${interval}</span></p>
    <p class="ui-muted">${t.intro}</p>
   </article>
  </main>`;
 }
 const numbers = Object.fromEntries(Object.entries(match)
  .filter(([, value]) => Number.isInteger(value)).map(([key, value]) => [key, number(value)]));
 const stats = [
  [t.score, new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: 2 }).format(score)],
  [t.wins, numbers.wins], [t.draws, numbers.draws], [t.losses, numbers.losses],
 ];
 const buildDetails = [match.hybrid, match.baseline, match.seed, match.network, match.hybridSha256, match.baselineSha256];
 const rowValues = [
  benchmark.nodes.map(value => number(value)),
  benchmark.milliseconds.map(value => number(value, 2) + ' ms'),
  benchmark.depthAt50ms.map(value => number(value, 2)),
 ];
 return `<main id="main-content" class="ui-page research-page">
  <article class="research-article">
   <header class="research-report-heading ui-page-heading">
    <nav aria-label="${t.research}"><a href="/${lang}/research">← ${t.research}</a></nav>
    <div class="research-byline">${time}</div>
    <h1>${t.title}</h1><p class="ui-intro">${t.intro}</p>
   </header>
   <section class="ui-panel research-result" aria-labelledby="hybrid-result">
    <h2 id="hybrid-result">${t.result}</h2>
    <p class="research-elo">${elo}</p>
    <p class="research-interval">${t.confidence} <strong>${interval}</strong></p>
    <dl class="research-stats">${stats.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>
    <p>${t.conditions(numbers)}</p>
    <p>${t.conclusion}</p>
    <details class="research-details"><summary>${t.evidence}</summary><p>${t.evidenceNote}</p>
     <dl>${t.builds.map((label, index) => `<div><dt>${label}</dt><dd><code>${buildDetails[index]}</code></dd></div>`).join('')}</dl>
     <a href="${match.results}" download>${t.download}</a>
    </details>
   </section>
   <section><h2>${t.liveBuilds}</h2>
    <p>${t.livePrevious}</p><p>${t.liveCurrent}</p><p>${t.liveConditions}</p>
    <ul><li><a href="${match.hybridSource}">${t.hybridSource}</a></li>
     <li><a href="${match.baselineSource}">${t.baselineSource}</a></li>
     <li><a href="/${lang}/database">${t.database}</a></li></ul>
   </section>
   <section><h2>${t.movegen}</h2><p>${t.generation}</p>
    <p>${t.perft({ leaves: number(benchmark.leaves), perft: benchmark.perft.map(value => number(value, 3)),
     early: benchmark.early.map(value => number(value, 1)), later: benchmark.later.map(value => number(value, 3)) })}</p></section>
   <section><h2>${t.policy}</h2><p>${t.training}</p><p>${t.labels}</p></section>
   <section><h2>${t.search}</h2><p>${t.ordering}</p>
    <div class="ui-table-wrap research-table">
     <table><thead><tr>${t.headers.map(heading => `<th scope="col">${heading}</th>`).join('')}</tr></thead>
      <tbody>${t.rows.map((label, index) => `<tr><th scope="row">${label}</th>${rowValues[index].map(value => `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody>
     </table>
    </div>
    <p>${t.changes}</p><p class="ui-muted">${t.methods.join(' ')}</p>
   </section>
   <section><h2>${t.core}</h2><p>${t.codeNote}</p>
    ${codeSnippet({ code, label: t.pseudocode, copy: t.copy })}
   </section>
  </article>
 </main>`;
};
