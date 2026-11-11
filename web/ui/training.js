/* Shared training shell. Lesson content, board state and control visibility are
 * owned by the training controller; keep its IDs and section values stable. */
const {coordinates,progress,meter,countdown}=require('./components');
const labels = {
 en: {
  heading:'A little study. A stronger game.',
  intro:'Build understanding, then put it into practice on the board.',
  navigation:'Training sections', tutorial:'Tutorial', openings:'Openings', endgames:'Endgames', tactics:'Tactics', strategy:'Strategy',
  library:'Lesson library', repertoire:'Repertoire', d4:'White · 1.d4', e4:'White · 1.e4', black:'Black repertoire',
  search:'Find a lesson', searchPlaceholder:'Search lessons…',
  board:'Training board', boardHelp:'Select a piece, then its destination, or drag to move. With the board focused, use arrow keys and Enter; Escape clears the selection.',
  coach:'Your lesson', title:'Start with the essentials', summary:'Select a lesson from the library to explore the idea and practise it on the board.',
  concept:'The idea', conceptHelp:'Your lesson’s key idea will appear here.',
  stage:'Ready to learn', status:'Choose a lesson to begin.', progress:'Lesson progress',
  line:'Lesson moves', meta:'Lesson details appear when you select a lesson.',
  hint:'Hint', retry:'Try again', next:'Next lesson', storm:'3 min rush', freeplay:'Endgame practice', stop:'Stop',
  score:'Score', clock:'Time', guidance:'How to train',
  beginner:'New to chess? Start here walks you through the board, the pieces and your first moves. Work through the lessons in order, then explore openings, endgames, tactics and strategy.',
  steps:['Choose a lesson and play your move on the board.', 'The pulsing square shows which piece to move; select it to see legal destinations.', 'Use a hint when you need one. Try again to reinforce the idea.'],
  settings:'Board & sound settings'
 },
 es: {
  heading:'Un poco de estudio. Un juego más sólido.',
  intro:'Comprende las ideas y ponlas en práctica en el tablero.',
  navigation:'Secciones de entrenamiento', tutorial:'Tutorial', openings:'Aperturas', endgames:'Finales', tactics:'Táctica', strategy:'Estrategia',
  library:'Biblioteca de lecciones', repertoire:'Repertorio', d4:'Blancas · 1.d4', e4:'Blancas · 1.e4', black:'Repertorio con negras',
  search:'Buscar una lección', searchPlaceholder:'Buscar lecciones…',
  board:'Tablero de entrenamiento', boardHelp:'Selecciona una pieza y su destino, o arrástrala. Con el foco en el tablero, usa las flechas y Entrar; Escape borra la selección.',
  coach:'Tu lección', title:'Empieza por lo esencial', summary:'Selecciona una lección de la biblioteca para descubrir la idea y practicarla en el tablero.',
  concept:'La idea', conceptHelp:'Aquí aparecerá la idea clave de la lección.',
  stage:'Listo para aprender', status:'Elige una lección para empezar.', progress:'Progreso de la lección',
  line:'Jugadas de la lección', meta:'Los detalles aparecerán al seleccionar una lección.',
  hint:'Pista', retry:'Reintentar', next:'Siguiente lección', storm:'Reto de 3 min', freeplay:'Práctica de finales', stop:'Detener',
  score:'Puntuación', clock:'Tiempo', guidance:'Cómo entrenar',
  beginner:'¿Es tu primera vez? Empieza aquí te guía por el tablero, las piezas y tus primeras jugadas. Sigue las lecciones en orden y después explora aperturas, finales, táctica y estrategia.',
  steps:['Elige una lección y juega en el tablero.', 'La casilla que parpadea indica qué pieza mover; selecciónala para ver los destinos legales.', 'Pide una pista si la necesitas. Reintenta para afianzar la idea.'],
  settings:'Ajustes del tablero y sonido'
 },
 zh: {
  heading:'日积月累，棋艺精进。',
  intro:'理解棋理，再到棋盘上练习。',
  navigation:'训练分类', tutorial:'教程', openings:'开局', endgames:'残局', tactics:'战术', strategy:'战略',
  library:'课程库', repertoire:'开局库', d4:'白棋 · 1.d4', e4:'白棋 · 1.e4', black:'黑棋开局',
  search:'查找课程', searchPlaceholder:'搜索课程…',
  board:'训练棋盘', boardHelp:'选择棋子和目标格，或拖动棋子。棋盘获得焦点后，可用方向键和回车走子，按 Escape 取消选择。',
  coach:'当前课程', title:'从基础开始', summary:'从课程库中选择一课，理解要点并在棋盘上练习。',
  concept:'核心思路', conceptHelp:'课程的核心思路将在这里显示。',
  stage:'准备学习', status:'选择课程以开始。', progress:'课程进度',
  line:'课程着法', meta:'选择课程后显示详细信息。',
  hint:'提示', retry:'重试', next:'下一课', storm:'3 分钟挑战', freeplay:'残局练习', stop:'停止',
  score:'得分', clock:'时间', guidance:'如何训练',
  beginner:'初学国际象棋？“从这里开始”将带你认识棋盘、棋子和基本走法。按顺序完成课程，然后探索开局、残局、战术与战略。',
  steps:['选择课程，直接在棋盘上走子。', '闪烁的格子提示要移动的棋子；选中后可查看合法落点。', '需要时可以查看提示。反复练习，巩固理解。'],
  settings:'棋盘与声音设置'
 }
};

exports.render = function(name, language) {
 const lang = labels[language] ? language : 'en';
 const t = labels[lang];
 const initial = name === 'drills' ? 'openings' : name === 'puzzles' ? 'tactics' : 'tutorial';
 const sections = ['tutorial', 'openings', 'endgames', 'tactics', 'strategy'];
 const action = (id, label, icon, hidden = false) =>
  `<button type="button" id="training-${id}" class="ui-button ui-icon-button" aria-label="${label}" title="${label}"${hidden ? ' hidden' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icon}"/></svg></button>`;
 const icons={hint:'M9 18h6m-5 3h4M9 15c0-2-4-3.5-4-7a7 7 0 0 1 14 0c0 3.5-4 5-4 7H9z',retry:'M3 11a9 9 0 1 1 2 6M3 4v7h7',next:'M4 12h15m-6-6 6 6-6 6',storm:'M12 3 4 13h7l-1 8 10-12h-7l1-6z',freeplay:'M8 5l11 7-11 7z',stop:'M6 6h12v12H6z',book:'M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1zm0 0v15'};

 return `<main id="main-content" class="ui-page ui-layout-${name} training-page">
 <section id="training-app" data-initial-section="${initial}" aria-label="${t.navigation}">
  <div class="training-heading ui-mobile-secondary">
   <h1>${t.heading}</h1>
   <p class="ui-intro">${t.intro}</p>
  </div>
  <nav class="ui-tabs training-tabs" aria-label="${t.navigation}">
   ${sections.map(section => `<button type="button" class="ui-button ui-quiet" data-section="${section}" aria-pressed="${section === initial}">${t[section]}</button>`).join('\n   ')}
  </nav>
  <div class="training-workspace">
   <section class="training-board-area" aria-label="${t.board}">
    <div class="training-bar"><h2 id="training-title">${t.title}</h2><button type="button" id="training-open-library" class="ui-button ui-icon-button" aria-label="${t.library}" title="${t.library}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons.book}"/></svg></button><div class="training-quick-actions">${action('hint',t.hint,icons.hint,true)}${action('retry',t.retry,icons.retry,true)}${action('next',t.next,icons.next,true)}</div>    <div class="ui-actions training-session-actions">
     ${action('storm', t.storm, icons.storm, true)}
     ${action('freeplay', t.freeplay, icons.freeplay, true)}
     ${action('stop', t.stop, icons.stop, true)}
    </div></div>
    <div class="training-board-wrap">
     <cg-board aria-label="${t.board}" aria-describedby="training-board-help"></cg-board>
     ${coordinates()}
     <div id="training-guidance-callout"></div>
    </div>
        <dl class="training-session-metrics">
     <div><dt>${t.score}</dt><dd id="training-score">—</dd></div>
     <div><dt>${t.clock}</dt><dd id="training-clock">—</dd></div>
    </dl>
    <p id="training-board-help" class="ui-muted training-board-help ui-mobile-secondary">${t.boardHelp}</p>

   </section>
   <aside class="ui-panel training-coach" aria-label="${t.coach}">
    <p id="training-stage" class="training-stage">${t.stage}</p>
    <div hidden>
    <p id="training-summary" class="ui-muted">${t.summary}</p>
    <div class="training-concept-block">
     <h3>${t.concept}</h3>
     <p id="training-concept">${t.conceptHelp}</p>
    </div>
    </div>
    <div class="training-feedback">
     <p id="training-status" class="training-sr-only" role="status" aria-live="polite" aria-atomic="true">${t.status}</p>
     <label for="training-progress" class="ui-muted training-progress-label">${t.progress}</label>
     ${progress({id:'training-progress',label:t.progress})}
     <div id="training-autoplay" class="training-autoplay" hidden>
      <span id="training-autoplay-label" role="status" aria-live="polite"></span>
      ${countdown()}
      ${meter({id:'training-autoplay-progress',label:'Time until next lesson'})}
     </div>
    </div>

    <div class="training-line-block">
     <h3 id="training-line-label">${t.line}</h3>
     <div id="training-line" aria-labelledby="training-line-label"></div>
    </div>
    <p id="training-meta" hidden class="ui-muted">${t.meta}</p>


    <details class="training-guidance">
     <summary>${t.guidance}</summary>
     <p class="ui-muted">${t.beginner}</p>
     <ol>${t.steps.map(step => `<li>${step}</li>`).join('')}</ol>
    </details>
   </aside>
   <dialog id="training-library-dialog" class="training-library-dialog" aria-labelledby="training-library-heading"><div class="training-library-head"><h2 id="training-library-heading">${t.library}</h2><button type="button" id="training-close-library" class="ui-button ui-icon-button" aria-label="Close" title="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div id="training-filters" class="ui-filters">
     <label class="ui-field" for="training-repertoire">${t.repertoire}
      <select id="training-repertoire">
       <option value="d4">${t.d4}</option>
       <option value="e4">${t.e4}</option>
       <option value="black">${t.black}</option>
      </select>
     </label>
     <label class="ui-field" for="training-search">${t.search}
      <input id="training-search" type="search" placeholder="${t.searchPlaceholder}" autocomplete="off" aria-controls="training-library">
     </label>
    </div>
    <div id="training-library" aria-labelledby="training-library-heading"></div>
   </dialog>
  </div>
 </section>
 </main>`;
};
