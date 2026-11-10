/* Game pages only link to analysis; they load no engine/book UI or assets. */
document.addEventListener('DOMContentLoaded',()=>{
 const match=location.pathname.match(/\/game\/([a-zA-Z0-9]{9})/),host=document.querySelector('.game-heading-actions');if(!match||!host)return;
 const link=document.createElement('a');link.id='analyze-game';link.className='ui-button ui-primary';link.hidden=true;link.textContent={en:'Analyze game',es:'Analizar partida',zh:'分析对局'}[document.documentElement.lang]||'Analyze game';link.href='/'+(document.documentElement.lang||'en')+'/analysis?game='+match[1]+'&review=1';host.prepend(link);
 const update=()=>{link.hidden=!(gamefinished&&stat>=1&&stat<=8&&uci.length);};document.addEventListener('chessil:game-state',update);update();
});
