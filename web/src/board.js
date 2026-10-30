/* Board view + input boundary.
 * Model positions are immutable snapshots owned by game.js. render() is the only
 * writer of piece placement. Input proposes UCI moves; it never edits the model.
 * Percent transforms make scroll/resize independent of input coordinates. */
window.ChessilBoard = class ChessilBoard {
 constructor(root,{state,submit,cancelPremove}) {
  this.root=root;this.state=state;this.submit=submit;this.cancelPremove=cancelPremove;
  this.pieces=new Map();this.position={};this.selected=null;this.gesture=null;this.active='e2';
  this.orientation='w';this.pending=null;this.lastMove='';this.premove='';this.overlay=[];
  root.tabIndex=0;root.setAttribute('role','application');root.setAttribute('aria-roledescription','chessboard');
  this.announcement=document.createElement('span');this.announcement.className='game-sr-only';this.announcement.setAttribute('aria-live','polite');root.parentElement.append(this.announcement);
  this.abort=new AbortController();const options={signal:this.abort.signal};
  root.addEventListener('pointerdown',event=>this.down(event),options);
  root.addEventListener('pointermove',event=>this.drag(event),options);
  root.addEventListener('pointerup',event=>this.up(event),options);
  root.addEventListener('pointercancel',()=>this.cancel(),options);
  root.addEventListener('lostpointercapture',()=>{if(this.gesture)this.cancel();},options);
  root.addEventListener('contextmenu',event=>{event.preventDefault();this.clear();cancelPremove();},options);
  root.addEventListener('keydown',event=>this.key(event),options);
  window.addEventListener('blur',()=>this.cancel(),options);
  this.reduced=()=>{this.cancel();for(const piece of this.pieces.values())piece.getAnimations().forEach(animation=>animation.cancel());};document.addEventListener('chessil:preferences',this.reduced,options);
 }
 point(square) {
  const file=square.charCodeAt(0)-97,rank=Number(square[1])-1;
  return this.orientation==='w'?[file,7-rank]:[7-file,rank];
 }
 transform(square){const [x,y]=this.point(square);return `translate(${x*100}%,${y*100}%)`;}
 at(event) {
  const rect=this.root.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height;
  if(x<0 || y<0 || x>=1 || y>=1)return null;
  const file=Math.floor(x*8),rank=Math.floor(y*8);
  return String.fromCharCode(97+(this.orientation==='w'?file:7-file))+(this.orientation==='w'?8-rank:rank+1);
 }
 canInput(){const s=this.state();return s.connected && !s.finished && !s.watcher && !this.pending;}
 // Premove destinations describe geometry, not a prediction of the opponent's move.
 // The server checks legality when it executes a premove.
 candidates(from) {
  const s=this.state();if(s.turn===s.side)return s.moves.filter(move=>move.startsWith(from));
  const piece=this.position[from];if(!piece || piece.c!==s.side)return [];
  const results=[],x=from.charCodeAt(0)-97,y=Number(from[1])-1;
  for(let tx=0;tx<8;tx++)for(let ty=0;ty<8;ty++) {
   const to=String.fromCharCode(97+tx)+(ty+1),dx=tx-x,dy=ty-y,a=Math.abs(dx),b=Math.abs(dy);
   if(!a&&!b || this.position[to]?.c===s.side)continue;
   let valid=false;
   if(piece.p==='n')valid=a*b===2;
   if(piece.p==='k')valid=Math.max(a,b)===1 || (!b && a===2 && from[0]==='e' && s.fen.split(' ')[2].includes(s.side==='w'?(tx===6?'K':'Q'):(tx===6?'k':'q')));
   if(['r','b','q'].includes(piece.p)) {
    valid=piece.p==='r'?(!a||!b):piece.p==='b'?a===b:(!a||!b||a===b);
    if(valid)for(let i=1;i<Math.max(a,b);i++)if(this.position[String.fromCharCode(97+x+Math.sign(dx)*i)+(y+Math.sign(dy)*i+1)]){valid=false;break;}
   }
   if(piece.p==='p') {
    const step=s.side==='w'?1:-1;
    valid=(dy===step && a<=1 && (a===1 || !this.position[to])) ||
     (!a && dy===2*step && y===(s.side==='w'?1:6) && !this.position[to] && !this.position[from[0]+(y+step+1)]);
   }
   if(valid)results.push(from+to+(piece.p==='p' && (ty===0||ty===7)?'q':''));
  }
  return results;
 }
 clear(){this.selected=null;this.drawOverlays();}
 cancel() {
  if(this.gesture) {
   const {from,pointer}=this.gesture;this.gesture=null;
   const piece=this.pieces.get(from);if(piece){piece.classList.remove('dragging');piece.style.transform=this.transform(from);}
   if(this.root.hasPointerCapture(pointer))this.root.releasePointerCapture(pointer);
  }
  this.clear();
 }
 select(square){this.selected=square;this.active=square;this.drawOverlays();}
 down(event) {
  if(event.button!==0 || !event.isPrimary || !this.canInput())return;
  const square=this.at(event);if(!square)return;
  event.preventDefault();this.root.focus({preventScroll:true});this.active=square;
  if(this.selected && square!==this.selected && this.tryMove(this.selected,square))return;
  if(this.position[square]?.c!==this.state().side){this.clear();this.cancelPremove();return;}
  const same=this.selected===square;this.select(square);
  this.gesture={from:square,pointer:event.pointerId,x:event.clientX,y:event.clientY,moved:false,same};
  this.root.setPointerCapture(event.pointerId);
 }
 drag(event) {
  const gesture=this.gesture;if(!gesture || gesture.pointer!==event.pointerId)return;
  if(!gesture.moved && Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)<5)return;
  gesture.moved=true;
  const piece=this.pieces.get(gesture.from);if(!piece)return;
  piece.getAnimations().forEach(animation=>animation.cancel());piece.classList.add('dragging');
  const rect=this.root.getBoundingClientRect();
  piece.style.transform=`translate(${(event.clientX-rect.left)*8/rect.width*100-50}%,${(event.clientY-rect.top)*8/rect.height*100-50}%)`;
 }
 up(event) {
  const gesture=this.gesture;if(!gesture || gesture.pointer!==event.pointerId)return;
  const to=this.at(event);this.gesture=null;
  const piece=this.pieces.get(gesture.from);if(piece){piece.classList.remove('dragging');piece.style.transform=this.transform(gesture.from);}
  if(this.root.hasPointerCapture(event.pointerId))this.root.releasePointerCapture(event.pointerId);
  if(gesture.moved){if(!to || !this.tryMove(gesture.from,to))this.clear();}
  else if(gesture.same)this.clear();
 }
 tryMove(from,to) {
  const candidates=this.candidates(from).filter(move=>move.slice(2,4)===to);
  if(!candidates.length)return false;
  const promote=this.position[from]?.p==='p' && (to[1]==='1'||to[1]==='8');
  this.clear();
  if(promote)this.choosePromotion(from,to);else this.propose(from+to);
  return true;
 }
 propose(move) {
  if(!this.canInput())return;
  const candidates=this.candidates(move.slice(0,2));
  if(!candidates.some(candidate=>this.state().turn===this.state().side?candidate===move:candidate.slice(0,4)===move.slice(0,4)))return;
  if(this.submit(move)) {
   this.pending=move;this.drawOverlays();
   clearTimeout(this.pendingTimer);this.pendingTimer=setTimeout(()=>{this.pending=null;this.drawOverlays();},5000);
  }
 }
 choosePromotion(from,to) {
  if(this.promotion)return;
  const dialog=document.createElement('dialog');dialog.className='promotion-dialog';this.promotion=dialog;
  const titles={en:'Promote pawn',es:'Promocionar peón',zh:'兵升变'};
  const title=document.createElement('h2');title.textContent=titles[document.documentElement.lang] || titles.en;dialog.append(title);dialog.setAttribute('aria-label',title.textContent);
  const names={en:['Queen','Rook','Bishop','Knight'],es:['Dama','Torre','Alfil','Caballo'],zh:['后','车','象','马']};
  ['q','r','b','n'].forEach((piece,i)=>{
   const button=document.createElement('button');button.type='button';button.textContent=(names[document.documentElement.lang] || names.en)[i];button.className='ui-button ui-secondary';
   button.addEventListener('click',()=>{dialog.close();this.propose(from+to+piece);});dialog.append(button);
  });
  dialog.addEventListener('close',()=>{dialog.remove();this.promotion=null;this.root.focus({preventScroll:true});},{once:true});
  document.body.append(dialog);dialog.showModal();
 }
 key(event) {
  if(event.key==='Escape'){this.cancel();this.cancelPremove();return;}
  const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if(directions[event.key]) {
   event.preventDefault();const [dx,dy]=directions[event.key],[x,y]=this.point(this.active);
   const file=Math.max(0,Math.min(7,x+dx)),rank=Math.max(0,Math.min(7,y+dy));
   this.active=String.fromCharCode(97+(this.orientation==='w'?file:7-file))+(this.orientation==='w'?8-rank:rank+1);
   this.drawOverlays();this.announcement.textContent=this.active+' '+this.pieceName(this.position[this.active]);return;
  }
  if((event.key==='Enter'||event.key===' ') && this.canInput()) {
   event.preventDefault();if(this.selected && this.tryMove(this.selected,this.active))return;
   if(this.position[this.active]?.c===this.state().side)this.select(this.active);
  }
 }
 pieceName(piece) {return piece?`${piece.c==='w'?'White':'Black'} ${{p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'}[piece.p]}`:'empty';}
 drawOverlays() {
  this.overlay.forEach(el=>el.remove());this.overlay=[];
  const add=(square,type)=>{if(!/^[a-h][1-8]$/.test(square || ''))return;const node=document.createElement('square');node.className=type;node.dataset.square=square;node.style.transform=this.transform(square);this.root.append(node);this.overlay.push(node);};
  if(this.lastMove){add(this.lastMove.slice(0,2),'last-move');add(this.lastMove.slice(2,4),'last-move');}
  if(this.selected){add(this.selected,'selected');for(const move of this.candidates(this.selected))add(move.slice(2,4),this.position[move.slice(2,4)]?'move-dest capture-dest':'move-dest');}
  for(const move of [this.premove,this.pending])if(move){add(move.slice(0,2),'current-premove');add(move.slice(2,4),'current-premove');}
  add(this.active,'keyboard-square');
 }
 acknowledge(move=''){clearTimeout(this.pendingTimer);this.pending=null;this.premove=move;this.drawOverlays();}
 render(board,move='',animate=false) {
  this.cancel();this.acknowledge();this.promotion?.close();
  const next=Object.fromEntries(Object.entries(board).filter(([,p])=>p.p!==' ').map(([s,p])=>[s,{...p}]));
  const previous=this.position,relocated=new Map();
  // Move the actual element; the same path handles promotions, EP and castling.
  if(move && animate) {
   const from=move.slice(0,2),to=move.slice(2,4),piece=this.pieces.get(from);
   if(piece && previous[from]) {
    relocated.set(to,piece);this.pieces.delete(from);
    if(previous[from].p==='k' && Math.abs(from.charCodeAt(0)-to.charCodeAt(0))===2) {
     const rookFrom=(to[0]==='g'?'h':'a')+from[1],rookTo=(to[0]==='g'?'f':'d')+from[1];
     const rook=this.pieces.get(rookFrom);if(rook){relocated.set(rookTo,rook);this.pieces.delete(rookFrom);}
    }
   }
  }
  const duration=animate?ChessilPreferences.duration():0;
  for(const [square,element] of this.pieces)if(!next[square] || relocated.has(square) || previous[square]?.p!==next[square].p || previous[square]?.c!==next[square].c){element.remove();this.pieces.delete(square);}
  for(const [square,piece] of Object.entries(next)) {
   let element=relocated.get(square) || this.pieces.get(square),created=!element;
   if(created){element=document.createElement('piece');this.root.append(element);}
   const old=getComputedStyle(element).transform;
   element.getAnimations().forEach(animation=>animation.cancel());
   element.className=(piece.c==='w'?'white':'black')+' '+({p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'}[piece.p]);
   element.dataset.square=square;element.setAttribute('aria-hidden','true');element.style.transform=this.transform(square);this.pieces.set(square,element);
   if(duration && !created && relocated.has(square) && old!=='none')element.animate([{transform:old},{transform:getComputedStyle(element).transform}],{duration,easing:'cubic-bezier(.22,.65,.3,1)'});
  }
  this.position=next;this.lastMove=move || '';this.drawOverlays();
  if(move)this.announcement.textContent=move.slice(0,2)+' → '+move.slice(2,4);
 }
 destroy(){this.abort.abort();this.cancel();clearTimeout(this.pendingTimer);this.promotion?.close();this.announcement.remove();}
};
