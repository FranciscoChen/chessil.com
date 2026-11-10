/* Standalone board adapter for the shared review tools. It exposes the same
 * small board/history interface as game.js, with no clocks or game transport.
 * A variation tree preserves alternate continuations when moving from the past. */
var uci=[],a1ti=0,playerside=null,boardView,movesList;
(function(){
'use strict';
const initial='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const sourceGame=new URLSearchParams(location.search).get('game');
let root,line=[],current;
function childFor(parent,move){let child=parent.children.get(move);if(!child){const pieces=boardgen(parent.fen),legal=mg(parent.fen);if(!legal.includes(move))throw Error('Invalid recorded move');const san=gensanbase(move,pieces,parent.fen,legal),next=ucifen(move,parent.fen,pieces,{}).f;child={fen:next,move,san,ply:parent.ply+1,parent,children:new Map()};parent.children.set(move,child);}return child;}
function reset(ready=true){ChessilStudy.ready=ready;root={fen:initial,children:new Map(),ply:0};line=[root];uci=[];a1ti=0;current=root;renderHistory();gamereplay(0);}
function choose(child){child.parent.next=child;line=[root];let node=root;while(node.next){node=node.next;line.push(node);}uci=line.slice(1).map(node=>node.move);renderHistory();gamereplay(child.ply,true);}
function play(move){if(!ChessilStudy.ready){boardView.acknowledge();return false;}const pieces=boardgen(current.fen),capture=!!pieces[move.slice(2,4)]||pieces[move.slice(0,2)]?.p==='p'&&move[0]!==move[2];if(!mg(current.fen).includes(move)){boardView.acknowledge();return false;}const child=childFor(current,move);choose(child);window.ChessilSound?.play(capture?'capture':'move');return true;}
function renderHistory(){document.querySelector('#moves-empty').hidden=uci.length>0;movesList.replaceChildren();for(let ply=1;ply<line.length;ply++){if(ply%2){const number=document.createElement('move-number');number.textContent=Math.ceil(ply/2);movesList.append(number);}const entry=document.createElement('move-entry');entry.textContent=line[ply].san;entry.setAttribute('ply',ply);movesList.append(entry);}}
window.gamereplay=function(ply,animate=false){const previous=a1ti;a1ti=Math.max(0,Math.min(uci.length,ply));current=line[a1ti];const adjacent=Math.abs(previous-a1ti)===1,move=a1ti<previous?uci[a1ti]?.slice(2,4)+uci[a1ti]?.slice(0,2):uci[a1ti-1]||'';boardView.render(boardgen(current.fen),move,animate&&adjacent);boardView.lastMove=uci[a1ti-1]||'';boardView.drawOverlays();movesList.querySelector('.a1t')?.classList.remove('a1t');const entry=movesList.querySelector(`[ply="${a1ti}"]`);entry?.classList.add('a1t');if(entry&&matchMedia('(max-width:900px)').matches){const outer=movesList.getBoundingClientRect(),inner=entry.getBoundingClientRect();if(inner.right>outer.right)movesList.scrollLeft+=inner.right-outer.right;if(inner.left<outer.left)movesList.scrollLeft+=inner.left-outer.left;}
 for(const id of ['rw','sb','fw','ff'])document.getElementById(id).disabled=['rw','sb'].includes(id)?a1ti===0:a1ti===uci.length;
 const branches=document.querySelector('#study-variations');branches.replaceChildren();branches.hidden=current.children.size<2;for(const child of current.children.values()){const button=document.createElement('button');button.type='button';button.className='ui-button ui-secondary';button.textContent=child.san;button.onclick=()=>choose(child);branches.append(button);}document.dispatchEvent(new CustomEvent('chessil:review'));};
window.ChessilStudy={play,ready:false,positions:()=>line.map(node=>node.fen)};
async function loadGame(){
 const status=document.querySelector('#study-load-status');status.hidden=false;status.textContent='Loading game…';
 try{
  if(!/^[a-zA-Z0-9]{9}$/.test(sourceGame))throw Error('Invalid game link.');
  const request=async path=>{const response=await fetch(path,{method:'POST',body:sourceGame,signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Game could not be loaded.');return response.json();};
  const info=await request('/gameinfo');if(!(info.state>=1&&info.state<=8))throw Error('Analysis is available after this game finishes.');
  const saved=await request('/gamestate'),recorded=String(saved.m||'').trim().split(/\s+/).filter(Boolean);let node=root;const imported=[root];for(const move of recorded){const child=childFor(node,move);node.next=child;node=child;imported.push(node);}line=imported;uci=recorded;playerside=['w','b'].includes(info.side)?info.side:null;ChessilStudy.ready=true;renderHistory();gamereplay(uci.length);status.hidden=true;document.dispatchEvent(new CustomEvent('chessil:study-loaded'));
 }catch(error){status.textContent=error.message;}
}

document.addEventListener('DOMContentLoaded',()=>{
 const host=document.querySelector('[data-analysis-board]');if(!host)return;movesList=host.querySelector('moves-list');current={fen:initial};host.querySelector('[data-game-field="state"]').textContent='';
 boardView=new ChessilBoard(host.querySelector('cg-board'),{state:()=>({fen:current.fen,moves:ChessilStudy.ready?mg(current.fen):[],turn:current.fen.split(' ')[1],side:current.fen.split(' ')[1],connected:ChessilStudy.ready,finished:false,watcher:false}),submit:move=>{queueMicrotask(()=>play(move));return true;},cancelPremove(){}});
 host.querySelector('moves-panel').addEventListener('click',event=>{const target=event.target.closest('button,[ply]');if(!target)return;const plies={rw:0,sb:a1ti-1,fw:a1ti+1,ff:uci.length},ply=target.hasAttribute('ply')?Number(target.getAttribute('ply')):plies[target.id];if(ply!==undefined)gamereplay(ply,true);});
 document.addEventListener('keydown',event=>{if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||document.querySelector('dialog[open]')||event.target.closest?.('input,textarea,select,[contenteditable]'))return;const plies={ArrowLeft:a1ti-1,ArrowRight:a1ti+1,ArrowUp:0,ArrowDown:uci.length,Home:0,End:uci.length};if(Object.hasOwn(plies,event.key)){event.preventDefault();gamereplay(plies[event.key],true);}});
 document.querySelector('#study-flip').onclick=()=>boardView.setOrientation(boardView.orientation==='w'?'b':'w');document.querySelector('#study-reset').onclick=()=>{if(sourceGame)location.assign(location.pathname);else reset();};reset(!sourceGame);if(sourceGame)loadGame();window.addEventListener('pagehide',event=>{if(!event.persisted)boardView.destroy();});
});
})();
