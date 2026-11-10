/* Standalone board adapter for the shared review tools. It exposes the same
 * small board/history interface as game.js, with no clocks or game transport.
 * A variation tree preserves alternate continuations when moving from the past. */
var uci=[],a1ti=0,playerside=null,boardView,movesList;
(function(){
'use strict';
const initial='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
let root,line=[],current;
function reset(){root={fen:initial,children:new Map(),ply:0};line=[root];uci=[];a1ti=0;current=root;renderHistory();gamereplay(0);}
function choose(child){child.parent.next=child;line=[root];let node=root;while(node.next){node=node.next;line.push(node);}uci=line.slice(1).map(node=>node.move);renderHistory();gamereplay(child.ply,true);}
function play(move){const pieces=boardgen(current.fen),capture=!!pieces[move.slice(2,4)]||pieces[move.slice(0,2)]?.p==='p'&&move[0]!==move[2];if(!mg(current.fen).includes(move)){boardView.acknowledge();return false;}let child=current.children.get(move);if(!child){const next=ucifen(move,current.fen,boardgen(current.fen),{}).f;child={fen:next,move,san:gensanbase(move,boardgen(current.fen),current.fen,mg(current.fen)),ply:current.ply+1,parent:current,children:new Map()};current.children.set(move,child);}choose(child);window.ChessilSound?.play(capture?'capture':'move');return true;}
function renderHistory(){document.querySelector('#moves-empty').hidden=uci.length>0;movesList.replaceChildren();for(let ply=1;ply<line.length;ply++){if(ply%2){const number=document.createElement('move-number');number.textContent=Math.ceil(ply/2);movesList.append(number);}const entry=document.createElement('move-entry');entry.textContent=line[ply].san;entry.setAttribute('ply',ply);movesList.append(entry);}}
window.gamereplay=function(ply,animate=false){const previous=a1ti;a1ti=Math.max(0,Math.min(uci.length,ply));current=line[a1ti];const adjacent=Math.abs(previous-a1ti)===1,move=a1ti<previous?uci[a1ti]?.slice(2,4)+uci[a1ti]?.slice(0,2):uci[a1ti-1]||'';boardView.render(boardgen(current.fen),move,animate&&adjacent);boardView.lastMove=uci[a1ti-1]||'';boardView.drawOverlays();movesList.querySelector('.a1t')?.classList.remove('a1t');const entry=movesList.querySelector(`[ply="${a1ti}"]`);entry?.classList.add('a1t');if(entry&&matchMedia('(max-width:900px)').matches){const outer=movesList.getBoundingClientRect(),inner=entry.getBoundingClientRect();if(inner.right>outer.right)movesList.scrollLeft+=inner.right-outer.right;if(inner.left<outer.left)movesList.scrollLeft+=inner.left-outer.left;}
 for(const id of ['rw','sb','fw','ff'])document.getElementById(id).disabled=['rw','sb'].includes(id)?a1ti===0:a1ti===uci.length;
 const branches=document.querySelector('#study-variations');branches.replaceChildren();branches.hidden=current.children.size<2;for(const child of current.children.values()){const button=document.createElement('button');button.type='button';button.className='ui-button ui-secondary';button.textContent=child.san;button.onclick=()=>choose(child);branches.append(button);}document.dispatchEvent(new CustomEvent('chessil:review'));};
window.ChessilStudy={play,positions:()=>line.map(node=>node.fen)};
document.addEventListener('DOMContentLoaded',()=>{
 const host=document.querySelector('[data-analysis-board]');if(!host)return;movesList=host.querySelector('moves-list');current={fen:initial};host.querySelector('[data-game-field="state"]').textContent='';
 boardView=new ChessilBoard(host.querySelector('cg-board'),{state:()=>({fen:current.fen,moves:mg(current.fen),turn:current.fen.split(' ')[1],side:current.fen.split(' ')[1],connected:true,finished:false,watcher:false}),submit:move=>{queueMicrotask(()=>play(move));return true;},cancelPremove(){}});
 host.querySelector('moves-panel').addEventListener('click',event=>{const target=event.target.closest('button,[ply]');if(!target)return;const plies={rw:0,sb:a1ti-1,fw:a1ti+1,ff:uci.length},ply=target.hasAttribute('ply')?Number(target.getAttribute('ply')):plies[target.id];if(ply!==undefined)gamereplay(ply,true);});
 document.addEventListener('keydown',event=>{if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||document.querySelector('dialog[open]')||event.target.closest?.('input,textarea,select,[contenteditable]'))return;const plies={ArrowLeft:a1ti-1,ArrowRight:a1ti+1,ArrowUp:0,ArrowDown:uci.length,Home:0,End:uci.length};if(Object.hasOwn(plies,event.key)){event.preventDefault();gamereplay(plies[event.key],true);}});
 document.querySelector('#study-flip').onclick=()=>boardView.setOrientation(boardView.orientation==='w'?'b':'w');document.querySelector('#study-reset').onclick=reset;reset();window.addEventListener('pagehide',event=>{if(!event.persisted)boardView.destroy();});
});
})();
