const {coordinates,historyRail}=require('./components');
exports.render=language=>{
 const lang=['en','es','zh'].includes(language)?language:'en';
 const t={en:['Analysis board','Explore','Flip board','Reset board','Variations'],es:['Tablero de análisis','Explorar','Girar tablero','Reiniciar tablero','Variantes'],zh:['分析棋盘','探索','翻转棋盘','重置棋盘','变化']}[lang];
 return `<main id="main-content" class="game-shell" data-analysis-board><div class="game-heading"><h1>${t[0]}</h1><div class="game-heading-actions"><a class="ui-button ui-quiet" href="/${lang}/research">← ${t[1]}</a></div></div><p id="study-load-status" role="alert" hidden></p><div class="round__app">${historyRail(lang)}<div class="round__app__board"><div class="cg-wrap"><cg-container><cg-board aria-label="${t[0]}"></cg-board>${coordinates()}</cg-container></div></div><div class="study-actions"><div class="ui-actions"><button id="study-flip" class="ui-button ui-secondary" type="button">${t[2]}</button><button id="study-reset" class="ui-button ui-secondary" type="button">${t[3]}</button></div><nav id="study-variations" aria-label="${t[4]}" hidden></nav></div></div></main>`;
};
