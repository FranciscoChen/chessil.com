const pieceVersions=require('../assets/sculpted-versions.json');

function board(t, art=false) {
 const pieces = ['br','bn','bb','bq','bk','bb','bn','br',...Array(8).fill('bp'),...Array(32).fill(null),...Array(8).fill('wp'),'wr','wn','wb','wq','wk','wb','wn','wr'];
 return `<div class="ui-board" role="img" aria-label="${t.board}">${pieces.map((piece,i)=>`<span class="ui-square ${(Math.floor(i/8)+i)%2?'is-dark':''}">${piece?`<img src="/img/pieces/${piece}.svg?v=${pieceVersions[piece]}" alt="" ${art?'fetchpriority="high"':''}>`:''}</span>`).join('')}</div>`;
}

exports.board = board;
exports.button = (language, route, label, style = "ui-secondary") => `<a class="ui-button ${style}" href="/${language}/${route}">${label}</a>`;

// Coordinates share board geometry/styles and are updated for orientation by consumers.
exports.coordinates = () => `<coords class="ranks" aria-hidden="true">${[8,7,6,5,4,3,2,1].map(n=>`<coord>${n}</coord>`).join('')}</coords><coords class="files" aria-hidden="true">${[...'abcdefgh'].map(n=>`<coord>${n}</coord>`).join('')}</coords>`;

// Shared loading/progress markup; animation belongs exclusively to timing.css.
const attribute=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
exports.progress=({id,label='Progress',value=0,max=100}={})=>`<progress${id?` id="${attribute(id)}"`:''} class="ui-progress" aria-label="${attribute(label)}" max="${Number(max)||100}" value="${Number(value)||0}"></progress>`;
exports.meter=({id,label='Loading',loading=false}={})=>`<div${id?` id="${attribute(id)}"`:''} class="ui-meter" role="img" aria-label="${attribute(label)}"${loading?' data-mode="loading"':''}><span class="ui-meter-fill"></span></div>`;
exports.countdown=()=>'<span class="ui-countdown" data-countdown></span>';

// One history rail for every live-game/review layout. Navigation stays fixed.
exports.historyRail = language => {
 const labels={en:['First move','Previous move','Next move','Last move'],es:['Primera jugada','Jugada anterior','Siguiente jugada','Última jugada'],zh:['第一步','上一步','下一步','最后一步']}[language]||['First move','Previous move','Next move','Last move'];
 const control=(id,label,path)=>`<button id="${id}" type="button" class="fbt ui-icon-button" title="${label}" aria-label="${label}" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg></button>`;
 return `<moves-panel aria-label="Move history"><nav class="board-history" aria-label="Game navigation">${control('rw',labels[0],'M6 5v14M17 6l-6 6 6 6')}${control('sb',labels[1],'m15 6-6 6 6 6')}<moves-list></moves-list>${control('fw',labels[2],'m9 6 6 6-6 6')}${control('ff',labels[3],'M18 5v14M7 6l6 6-6 6')}</nav><p class="game-sr-only" id="moves-empty">Waiting for the first move.</p><span class="game-sr-only status" data-game-field="state" role="status">Connecting…</span><span class="game-sr-only" id="game-perspective"></span><span class="game-sr-only" id="history-hint"></span></moves-panel>`;
};

// Shared accessible icon control; consumers supply state and the SVG path.
exports.iconButton=({id,label,path,hidden=false,disabled=false})=>`<button type="button" id="${attribute(id)}" class="ui-button ui-icon-button" aria-label="${attribute(label)}" title="${attribute(label)}"${hidden?' hidden':''}${disabled?' disabled':''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${attribute(path)}"/></svg></button>`;
