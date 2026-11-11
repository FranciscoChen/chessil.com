const {coordinates,progress,iconButton}=require('./components');
const labels={
 en:{training:'Training',puzzles:'Puzzles',type:'Puzzle type',mixed:'Mixed',hint:'Hint',retry:'Restart puzzle',next:'Next puzzle',solution:'Show solution',retryLoad:'Retry loading',moves:'Puzzle moves',loading:'Loading…'},
 es:{training:'Entrenamiento',puzzles:'Problemas',type:'Tipo de problema',mixed:'Mixto',hint:'Pista',retry:'Reiniciar problema',next:'Siguiente problema',solution:'Mostrar solución',retryLoad:'Reintentar carga',moves:'Jugadas del problema',loading:'Cargando…'},
 zh:{training:'训练',puzzles:'习题',type:'习题类型',mixed:'混合',hint:'提示',retry:'重新开始',next:'下一题',solution:'显示答案',retryLoad:'重新加载',moves:'习题着法',loading:'加载中…'}
};
exports.render=function(language){
 const lang=labels[language]?language:'en',t=labels[lang];
 const icon=(id,label,path)=>iconButton({id:'puzzle-'+id,label,path,disabled:true});
 return `<main id="main-content" class="ui-page training-page"><section id="puzzle-app" aria-label="${t.puzzles}">
 <nav class="ui-tabs training-tabs" aria-label="${t.training}"><a class="ui-button ui-quiet" href="/${lang}/training">${t.training}</a><a class="ui-button ui-quiet" href="/${lang}/training/puzzles" aria-current="page">${t.puzzles}</a></nav>
 <div class="training-workspace"><section class="training-board-area" aria-label="${t.puzzles}">
 <div class="training-bar"><label class="ui-field puzzle-type"><span class="training-sr-only">${t.type}</span><select id="puzzle-type" aria-label="${t.type}"><option value="mixed">${t.mixed}</option></select></label><span id="puzzle-rating" class="ui-muted"></span><div class="training-quick-actions">${icon('hint',t.hint,'M9 18h6m-5 3h4M9 15c0-2-4-3.5-4-7a7 7 0 0 1 14 0c0 3.5-4 5-4 7H9z')}${icon('restart',t.retry,'M3 11a9 9 0 1 1 2 6M3 4v7h7')}${icon('next',t.next,'M4 12h15m-6-6 6 6-6 6')}</div></div>
 <div class="training-board-wrap"><cg-board aria-label="${t.puzzles}"></cg-board>${coordinates()}</div>
 </section><aside class="ui-panel puzzle-details"><p id="puzzle-status" role="status" aria-live="polite">${t.loading}</p>${progress({id:'puzzle-progress',label:t.moves})}<div id="puzzle-line" aria-label="${t.moves}"></div><div class="ui-actions"><button id="puzzle-solution" class="ui-button ui-quiet" disabled>${t.solution}</button><button id="puzzle-reload" class="ui-button ui-quiet" hidden>${t.retryLoad}</button></div><p id="puzzle-buffer" class="ui-muted" role="status"></p><p id="puzzle-themes" class="ui-muted"></p><a id="puzzle-source" class="ui-muted" href="https://lichess.org/training" target="_blank" rel="noopener" hidden>Lichess ↗</a></aside></div>
 </section></main>`;
};
