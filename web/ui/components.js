
function board(t, art=false) {
 const pieces = ['br','bn','bb','bq','bk','bb','bn','br',...Array(8).fill('bp'),...Array(32).fill(null),...Array(8).fill('wp'),'wr','wn','wb','wq','wk','wb','wn','wr'];
 return `<div class="ui-board" role="img" aria-label="${t.board}">${pieces.map((piece,i)=>`<span class="ui-square ${(Math.floor(i/8)+i)%2?'is-dark':''}">${piece?`<img src="/img/pieces/${piece}.svg" alt="" ${art?'fetchpriority="high"':''}>`:''}</span>`).join('')}</div>`;
}

exports.board = board;
exports.button = (language, route, label, style = "ui-secondary") => `<a class="ui-button ${style}" href="/${language}/${route}">${label}</a>`;
