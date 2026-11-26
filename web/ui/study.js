const {coordinates,historyRail,iconButton}=require('./components');
exports.render=language=>{
 const lang=['en','es','zh'].includes(language)?language:'en';
 const files={en:['Import PGN','Export PGN'],es:['Importar PGN','Exportar PGN'],zh:['导入 PGN','导出 PGN']}[lang];
 const t={en:['Analysis board','Variations'],es:['Tablero de análisis','Variantes'],zh:['分析棋盘','变化']}[lang];
 return `<main id="main-content" class="game-shell" data-analysis-board><h1 class="analysis-sr-only">${t[0]}</h1><p id="study-load-status" role="alert" hidden></p><div class="round__app">${historyRail(lang)}<div class="round__app__board"><div class="cg-wrap"><cg-container><cg-board aria-label="${t[0]}"></cg-board>${coordinates()}</cg-container></div></div><div class="study-actions"><div class="study-files">
 ${iconButton({id:'study-import',label:files[0],path:'M12 16V3m-4 4 4-4 4 4M5 13v7h14v-7'})}
 ${iconButton({id:'study-export',label:files[1],path:'M12 3v13m-4-4 4 4 4-4M5 16v4h14v-4'})}
 <input id="study-pgn-file" type="file" accept=".pgn,application/x-chess-pgn,text/plain" hidden><output id="study-pgn-status" role="status"></output>
 </div></div></div><dialog id="study-tree-dialog" class="board-settings-dialog study-tree-dialog" aria-labelledby="study-tree-title"><div class="study-tree-heading"><h2 id="study-tree-title">${t[1]}</h2>${iconButton({id:'study-tree-close',label:lang==='es'?'Cerrar':lang==='zh'?'关闭':'Close',path:'M6 6l12 12M18 6 6 18'})}</div><p id="study-tree-error" role="alert" hidden></p><div id="study-tree-content" class="variation-tree"></div></dialog></main>`;
};
