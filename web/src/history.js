/* Shared history interaction for a native board and the game's history rail.
 * Consumers retain authoritative position/move validation. */
window.ChessilHistory=class ChessilHistory {
 constructor(root,{onSelect,signal}){
  this.root=root;root.querySelector('[data-game-field="state"]').textContent='';this.list=root.querySelector('moves-list');this.onSelect=onSelect;this.positions=[];this.moves=[];this.ply=0;
  root.addEventListener('click',event=>{const target=event.target.closest('button,[ply]');if(!target||this.locked)return;const plies={rw:0,sb:this.ply-1,fw:this.ply+1,ff:this.moves.length};const ply=target.hasAttribute('ply')?Number(target.getAttribute('ply')):plies[target.id];if(ply!==undefined)this.select(ply);},{signal});
  document.addEventListener('keydown',event=>{
   if(this.locked||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||document.querySelector('dialog[open]')||event.target.closest?.('input,textarea,select,[contenteditable]'))return;
   const plies={ArrowLeft:this.ply-1,ArrowRight:this.ply+1,ArrowUp:0,ArrowDown:this.moves.length,Home:0,End:this.moves.length};
   if(this.moves.length&&Object.hasOwn(plies,event.key)){event.preventDefault();this.select(plies[event.key]);}
  },{signal});
 }
 reset(fen){this.positions=[fen];this.moves=[];this.ply=0;this.list.replaceChildren();this.update();}
 push(move,fen,san){const before=this.positions.at(-1).split(' '),number=document.createElement('move-number');
  if(before[1]==='w'||!this.moves.length){number.textContent=before[5]+(before[1]==='b'?'…':'.');this.list.append(number);}
  this.moves.push(move);this.positions.push(fen);this.ply=this.moves.length;
  const entry=document.createElement('move-entry');entry.textContent=san;entry.setAttribute('ply',this.ply);entry.tabIndex=0;entry.setAttribute('role','button');entry.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();if(!this.locked)this.select(Number(entry.getAttribute('ply')));}});this.list.append(entry);this.update();
 }
 select(value){if(this.locked)return;const previous=this.ply;this.ply=Math.max(0,Math.min(this.moves.length,value));this.update();this.onSelect(this.ply,previous);}
 lock(value){this.locked=value;this.update();}
 update(){for(const id of ['rw','sb','fw','ff'])this.root.querySelector('#'+id).disabled=this.locked||(['rw','sb'].includes(id)?this.ply===0:this.ply===this.moves.length);
  this.list.querySelectorAll('[ply]').forEach(entry=>{const active=Number(entry.getAttribute('ply'))===this.ply;entry.classList.toggle('a1t',active);if(active)entry.setAttribute('aria-current','step');else entry.removeAttribute('aria-current');entry.setAttribute('aria-disabled',String(!!this.locked));});
  window.ChessilHistoryFocus?.(this.list,this.list.querySelector('.a1t'));
  this.root.querySelector('#moves-empty').hidden=!!this.moves.length;
 }
};
