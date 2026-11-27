const labels = {
  en:{
    title:'Game archive', series:'STC show matches', watch:'Watch live', query:'Player or game ID', search:'Search',
    players:'White / Black', opening:'Opening', result:'Hybrid result', more:'More games', empty:'No matching games', error:'Archive unavailable', loading:'Loading…',
    totals:'Series results', games:'Games', wins:'Wins', draws:'Draws', losses:'Losses', score:'Hybrid score', flags:'Time forfeits',
    statistics:'Paired SPRT monitor', elo:'Estimated Elo', interval:'95% interval', los:'Likelihood of superiority', pairs:'Opening pairs',
    bins:'Points per opening pair', llr:'Log likelihood ratio', comparison:'Logistic Elo · 0 vs +5 · α = β = 5%',
    method:'Method', note:'Series totals include all finished STC show games. Elo, the approximate 95% interval, likelihood of superiority, and LLR use complete color-reversed opening pairs from the current engine builds with Syzygy. The live series continues beyond the reference bounds.',
    buildDetails:'Engine builds and source code', hybridSource:'Hybrid V5 release source', stockfishSource:'Stockfish dev source',
    commonBuild:'Both binaries use GCC 13.3 and x86-64-bmi2 (AVX2, BMI2, SSE4.1, SSSE3, SSE2, POPCNT). Both use the evaluation NNUE nn-c9e480e92425.nnue.',
    policyBuild:'Hybrid policy V5 batch 6257 (7a702165ba92), depth-6 economical quiet ordering, margin LMR off.',
    liveSetup:'Live games use one search thread per engine, 64 MiB hash, five-piece Syzygy, and color-reversed openings after eight book plies.',
    matchReference:'These exact binaries scored +9.3 Elo for the hybrid in a separate 1,600-game match at 50 ms per move with 16 MiB hash.',
    showGames:'Games and PGNs', engine:'Perspective', filter:'Outcome', all:'All outcomes', originalResult:'Stockfish result', outcomes:['Win','Draw','Loss']
  },
  es:{
    title:'Archivo de partidas', series:'Partidas STC en directo', watch:'Ver en directo', query:'Jugador o ID', search:'Buscar',
    players:'Blancas / Negras', opening:'Apertura', result:'Resultado del híbrido', more:'Más partidas', empty:'Sin coincidencias', error:'Archivo no disponible', loading:'Cargando…',
    totals:'Resultados de la serie', games:'Partidas', wins:'Victorias', draws:'Tablas', losses:'Derrotas', score:'Puntuación del híbrido', flags:'Derrotas por tiempo',
    statistics:'SPRT por pares', elo:'Elo estimado', interval:'Intervalo del 95 %', los:'Probabilidad de superioridad', pairs:'Pares de aperturas',
    bins:'Puntos por par de aperturas', llr:'Logaritmo de la razón de verosimilitud', comparison:'Elo logístico · 0 frente a +5 · α = β = 5 %',
    method:'Método', note:'Los totales incluyen todas las partidas STC de la serie que han terminado. El Elo, el intervalo aproximado del 95 %, la probabilidad de superioridad y el LLR usan pares completos con colores invertidos, las mismas versiones de los motores y Syzygy. La serie continúa al cruzar los límites de referencia.',
    buildDetails:'Versiones de los motores y código fuente', hybridSource:'Código de la versión híbrida V5', stockfishSource:'Código de Stockfish dev',
    commonBuild:'Ambos ejecutables usan GCC 13.3 y x86-64-bmi2 (AVX2, BMI2, SSE4.1, SSSE3, SSE2, POPCNT). Ambos usan la red de evaluación NNUE nn-c9e480e92425.nnue.',
    policyBuild:'Red de política híbrida V5, lote 6257 (7a702165ba92), ordenación económica de jugadas tranquilas desde profundidad 6 y LMR por margen desactivado.',
    liveSetup:'Las partidas en directo usan un hilo de búsqueda por motor, 64 MiB de hash, Syzygy de cinco piezas y aperturas con colores invertidos tras ocho medias jugadas de libro.',
    matchReference:'Con estos mismos ejecutables, el híbrido obtuvo +9,3 Elo en una prueba separada de 1600 partidas a 50 ms por jugada y con 16 MiB de hash.',
    showGames:'Partidas y PGN', engine:'Perspectiva', filter:'Resultado', all:'Todos los resultados', originalResult:'Resultado de Stockfish', outcomes:['Victoria','Tablas','Derrota']
  },
  zh:{
    title:'对局档案', series:'STC 直播对局', watch:'观看直播', query:'棋手或对局编号', search:'搜索',
    players:'白方 / 黑方', opening:'开局', result:'混合引擎战绩', more:'更多对局', empty:'没有匹配的对局', error:'暂时无法加载档案', loading:'加载中…',
    totals:'系列赛战绩', games:'对局数', wins:'胜', draws:'和', losses:'负', score:'混合引擎得分率', flags:'超时判负',
    statistics:'配对 SPRT 监测', elo:'Elo 估计', interval:'95% 区间', los:'优势概率', pairs:'开局配对数',
    bins:'各开局对的得分', llr:'对数似然比', comparison:'逻辑斯蒂 Elo · 0 对 +5 · α = β = 5%',
    method:'统计方法', note:'总计包含所有已结束的 STC 直播对局。Elo、近似 95% 区间、优势概率和 LLR 仅统计启用 Syzygy 后使用相同引擎版本且交换先后手的完整对局对。越过参考界限后直播对局仍会继续。',
    buildDetails:'引擎版本与源代码', hybridSource:'混合引擎 V5 发布源码', stockfishSource:'Stockfish 开发版源码',
    commonBuild:'两款引擎均以 GCC 13.3 编译，目标为 x86-64-bmi2（AVX2、BMI2、SSE4.1、SSSE3、SSE2、POPCNT），并使用相同的 NNUE 评估网络 nn-c9e480e92425.nnue。',
    policyBuild:'混合引擎使用 V5 策略网络第 6257 批（7a702165ba92），从剩余深度 6 启用经济型安静走法排序，并关闭基于策略分差的 LMR。',
    liveSetup:'直播中，每个引擎使用一个搜索线程、64 MiB 哈希表及五子 Syzygy 残局库。同一开局交换先后手，各从开局库给出的八个半回合后开始搜索。',
    matchReference:'使用完全相同的两个可执行文件，混合引擎在另一场 1600 局测试中取得 +9.3 Elo。该测试采用每步 50 毫秒、16 MiB 哈希表。',
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
        <details class="archive-method"><summary>${t.buildDetails}</summary>
          <p>ChessiL Hybrid V5 <code>2ffd877d</code> · SHA-256 <code title="46a0bd48ad6ffa0b0c36acca287bedb2328df7120fd9f4000b7f6b020ea057fc">46a0bd48ad6f</code> · <a href="https://github.com/FranciscoChen/stockfish-hybrid-v5/tree/1d6489069fc04558f2d03ca34e7dc17655ed405d">${t.hybridSource}</a></p>
          <p>Stockfish dev <code>ff3a6c50</code> · SHA-256 <code title="b75d83809713b2b5072e204e232ed7820089a109b4bce40e19665e065118cc12">b75d83809713</code> · <a href="https://github.com/official-stockfish/Stockfish/tree/ff3a6c508ed731f0dcf253f4ddf646df19a62f84">${t.stockfishSource}</a></p>
          <p>${t.commonBuild}</p><p>${t.policyBuild}</p><p>${t.liveSetup}</p><p>${t.matchReference}</p>
        </details>
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
