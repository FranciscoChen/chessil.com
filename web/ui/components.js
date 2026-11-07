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
