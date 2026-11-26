const labels = {
  en:{
    title:'Game archive', series:'STC show matches', watch:'Watch live', query:'Player or game ID', search:'Search',
    players:'White / Black', opening:'Opening', result:'Hybrid result', more:'More games', empty:'No matching games', error:'Archive unavailable', loading:'Loading…',
    totals:'Series results', games:'Games', wins:'Wins', draws:'Draws', losses:'Losses', score:'Hybrid score', flags:'Time forfeits',
    statistics:'Paired SPRT monitor', elo:'Estimated Elo', interval:'95% interval', los:'Likelihood of superiority', pairs:'Opening pairs',
    bins:'Points per opening pair', llr:'Log likelihood ratio', comparison:'Logistic Elo · 0 vs +5 · α = β = 5%',
    method:'Method', note:'Series totals include all finished STC show games. Elo, the approximate 95% interval, likelihood of superiority, and LLR use complete color-reversed opening pairs from the current engine builds with Syzygy. The live series continues beyond the reference bounds.',
    showGames:'Games and PGNs', engine:'Perspective', filter:'Outcome', all:'All outcomes', originalResult:'Stockfish result', outcomes:['Win','Draw','Loss']
  },
  es:{
    title:'Archivo de partidas', series:'Partidas STC en directo', watch:'Ver en directo', query:'Jugador o ID', search:'Buscar',
    players:'Blancas / Negras', opening:'Apertura', result:'Resultado del híbrido', more:'Más partidas', empty:'Sin coincidencias', error:'Archivo no disponible', loading:'Cargando…',
    totals:'Resultados de la serie', games:'Partidas', wins:'Victorias', draws:'Tablas', losses:'Derrotas', score:'Puntuación del híbrido', flags:'Derrotas por tiempo',
    statistics:'SPRT por pares', elo:'Elo estimado', interval:'Intervalo del 95 %', los:'Probabilidad de superioridad', pairs:'Pares de aperturas',
    bins:'Puntos por par de aperturas', llr:'Logaritmo de la razón de verosimilitud', comparison:'Elo logístico · 0 frente a +5 · α = β = 5 %',
    method:'Método', note:'Los totales incluyen todas las partidas STC de la serie que han terminado. El Elo, el intervalo aproximado del 95 %, la probabilidad de superioridad y el LLR usan pares completos con colores invertidos, las mismas versiones de los motores y Syzygy. La serie continúa al cruzar los límites de referencia.',
    showGames:'Partidas y PGN', engine:'Perspectiva', filter:'Resultado', all:'Todos los resultados', originalResult:'Resultado de Stockfish', outcomes:['Victoria','Tablas','Derrota']
  },
  zh:{
    title:'对局档案', series:'STC 直播对局', watch:'观看直播', query:'棋手或对局编号', search:'搜索',
    players:'白方 / 黑方', opening:'开局', result:'混合引擎战绩', more:'更多对局', empty:'没有匹配的对局', error:'暂时无法加载档案', loading:'加载中…',
    totals:'系列赛战绩', games:'对局数', wins:'胜', draws:'和', losses:'负', score:'混合引擎得分率', flags:'超时判负',
    statistics:'配对 SPRT 监测', elo:'Elo 估计', interval:'95% 区间', los:'优势概率', pairs:'开局配对数',
    bins:'各开局对的得分', llr:'对数似然比', comparison:'逻辑斯蒂 Elo · 0 对 +5 · α = β = 5%',
    method:'统计方法', note:'总计包含所有已结束的 STC 直播对局。Elo、近似 95% 区间、优势概率和 LLR 仅统计启用 Syzygy 后使用相同引擎版本且交换先后手的完整对局对。越过参考界限后直播对局仍会继续。',
    showGames:'对局及 PGN', engine:'引擎视角', filter:'结果', all:'所有结果', originalResult:'Stockfish 战绩', outcomes:['胜','和','负']
  }
};
exports.render = function(lang) {
  const t = labels[lang] || labels.en;
  const metric = (key,label=t[key]) => `<div><dt>${label}</dt><dd data-stat="${key}">—</dd></div>`;
  const outcomes = ['wins','draws','losses'];
  return `<main id="main-content" class="ui-page ui-layout-database" data-archive data-empty="${t.empty}" data-error="${t.error}" data-wins="${t.outcomes[0]}" data-draws="${t.outcomes[1]}" data-losses="${t.outcomes[2]}" data-hybrid-result="${t.result}" data-stockfish-result="${t.originalResult}">
    <link rel="stylesheet" href="/css/archive.css">
    <header class="archive-heading"><div><p class="eyebrow">${t.title} / ${t.series}</p>
    <h1>ChessiL Hybrid <span class="archive-versus">vs</span> <span class="archive-engine">Stockfish dev</span></h1><p class="archive-control"><span>STC</span> <span>10s + 0.1s</span></p></div>
    <a class="ui-button ui-secondary" href="/${lang}/lobby?mode=watch">${t.watch}</a></header>
    <div class="archive-overview" data-archive-stats>
      <section class="ui-panel archive-card" aria-labelledby="archive-results-title">
        <h2 id="archive-results-title">${t.totals}</h2>
        <dl class="archive-metrics archive-totals">${metric('games')}${metric('score')}${metric('flags')}</dl>
        <div class="archive-wdl" aria-hidden="true">${outcomes.map(key=>`<span data-outcome="${key}"></span>`).join('')}</div>
        <dl class="archive-metrics archive-outcomes">${outcomes.map(key=>`<div data-outcome="${key}"><dt>${t[key]}</dt><dd data-stat="${key}">—</dd></div>`).join('')}</dl>
      </section>
      <section class="ui-panel archive-card" aria-labelledby="archive-sprt-title">
        <h2 id="archive-sprt-title">${t.statistics}</h2>
        <dl class="archive-metrics archive-estimate">${metric('elo')}${metric('interval')}${metric('los')}</dl>
        <dl class="archive-llr">${metric('llr')}</dl>
        <div class="archive-gauge" aria-hidden="true"><span data-marker hidden></span></div>
        <div class="archive-gauge-labels" aria-hidden="true"><span data-stat="lower">−2.94</span><span>0</span><span data-stat="upper">+2.94</span></div>
        <p class="archive-hypotheses">${t.comparison}</p>
      </section>
      <section class="ui-panel archive-pairs" aria-label="${t.bins}">
        <dl class="archive-metrics">${metric('pairs')}</dl>
        <div><h2>${t.bins}</h2>
          <dl class="archive-bins">${['0','½','1','1½','2'].map((label,i)=>`<div data-bin="${i}"><dt>${label}</dt><dd>—</dd></div>`).join('')}</dl>
        </div>
        <details class="archive-method"><summary>${t.method}</summary><p>${t.note}</p></details>
      </section>
      <p class="archive-stats-error" data-stats-error role="status" hidden>${t.error}</p>
    </div>
    <section class="ui-panel archive-list" aria-labelledby="archive-games-title">
      <div class="archive-list-heading"><h2 id="archive-games-title">${t.showGames}</h2>
        <form class="ui-filters" role="search"><label class="ui-field">${t.query}<input type="search" name="q" maxlength="64"></label>
        <label class="ui-field">${t.engine}<select name="perspective"><option value="hybrid">ChessiL Hybrid</option><option value="stockfish">Stockfish dev</option></select></label>
        <label class="ui-field">${t.filter}<select name="outcome"><option value="">${t.all}</option>${outcomes.map(key=>`<option value="${key}">${t[key]}</option>`).join('')}</select></label>
        <button class="ui-button ui-secondary">${t.search}</button></form></div>
      <div class="ui-table-wrap"><table><thead><tr><th scope="col">${t.players}</th><th scope="col">${t.opening}</th><th scope="col" data-result-heading>${t.result}</th><th scope="col">PGN</th></tr></thead>
      <tbody></tbody></table></div><p data-list-status role="status">${t.loading}</p>
      <button class="ui-button ui-secondary" data-more hidden>${t.more}</button>
    </section>
    <script defer src="/js/archive.js"></script></main>`;
};
