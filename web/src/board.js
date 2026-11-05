/* Board view + input boundary.
 * Model positions are immutable snapshots owned by game.js. render() is the only
 * writer of piece placement. Input proposes UCI moves; it never edits the model.
 * Percent transforms make scroll/resize independent of input coordinates. */
window.ChessilBoard = class ChessilBoard {
 constructor(root,{state,submit,cancelPremove}) {
  this.root=root;this.state=state;this.submit=submit;this.cancelPremove=cancelPremove;
  this.pieces=new Map();this.position={};this.selected=null;this.keyboardMode=false;this.gesture=null;this.active='e2';
  this.orientation='w';this.pending=null;this.lastMove='';this.premove='';this.overlay=new Map();this.dragFrame=0;
  this.paintDrag=()=>{this.dragFrame=0;const g=this.gesture;if(!g || !g.moved)return;const piece=this.pieces.get(g.from);if(piece)piece.style.transform=`translate(${(g.clientX-g.rect.left)*800/g.rect.width-50}%,${(g.clientY-g.rect.top)*800/g.rect.height-50}%)`;};
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
  window.addEventListener('resize',()=>this.cancel(),options);
  window.addEventListener('scroll',()=>{if(this.gesture)this.cancel();},{...options,capture:true,passive:true});
  this.reduced=()=>{this.cancel();for(const piece of this.pieces.values())piece.getAnimations().forEach(animation=>animation.cancel());};document.addEventListener('chessil:preferences',this.reduced,options);
 }
 point(square) {
  const file=square.charCodeAt(0)-97,rank=Number(square[1])-1;
  return this.orientation==='w'?[file,7-rank]:[7-file,rank];
 }
 transform(square){const [x,y]=this.point(square);return `translate(${x*100}%,${y*100}%)`;}
 at(event,rect=this.root.getBoundingClientRect()) {
  const x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height;
  if(x<0 || y<0 || x>=1 || y>=1)return null;
  const file=Math.floor(x*8),rank=Math.floor(y*8);
  return String.fromCharCode(97+(this.orientation==='w'?file:7-file))+(this.orientation==='w'?8-rank:rank+1);
 }
 canInput(){const s=this.state();return s.connected && !s.finished && !s.watcher && !this.pending;}
 // Premove destinations describe geometry, not a prediction of the opponent's move.
 // Own occupied targets are allowed for anticipated recaptures.
 // The server checks legality when it executes a premove.
 candidates(from) {
  const s=this.state();if(s.turn===s.side)return s.moves.filter(move=>move.startsWith(from));
  const piece=this.position[from];if(!piece || piece.c!==s.side)return [];
  const results=[],x=from.charCodeAt(0)-97,y=Number(from[1])-1;
  for(let tx=0;tx<8;tx++)for(let ty=0;ty<8;ty++) {
   const to=String.fromCharCode(97+tx)+(ty+1),dx=tx-x,dy=ty-y,a=Math.abs(dx),b=Math.abs(dy);
   if(!a&&!b)continue;
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
 clear(){this.selected=null;this.keyboardMode=false;this.drawOverlays();}
 cancel(redraw=true) {
  cancelAnimationFrame(this.dragFrame);this.dragFrame=0;this.root.classList.remove('is-dragging');
  if(this.gesture) {
   const {from,pointer}=this.gesture;this.gesture=null;
   const piece=this.pieces.get(from);if(piece){piece.classList.remove('dragging');piece.style.transform=this.transform(from);}
   if(this.root.hasPointerCapture(pointer))this.root.releasePointerCapture(pointer);
  }
  if(redraw)this.clear();else {this.selected=null;this.keyboardMode=false;}
 }
 select(square){this.selected=square;this.active=square;this.drawOverlays();}
 down(event) {
  if(event.button!==0 || !event.isPrimary || !this.canInput())return;
  const rect=this.root.getBoundingClientRect(),square=this.at(event,rect);if(!square)return;
  event.preventDefault();this.root.focus({preventScroll:true});this.active=square;
  if(this.selected && square!==this.selected && this.tryMove(this.selected,square))return;
  if(this.position[square]?.c!==this.state().side){this.clear();this.cancelPremove();return;}
  const same=this.selected===square;this.select(square);
  this.gesture={from:square,pointer:event.pointerId,x:event.clientX,y:event.clientY,moved:false,same,rect};
  this.root.setPointerCapture(event.pointerId);
 }
 drag(event) {
  const gesture=this.gesture;if(!gesture || gesture.pointer!==event.pointerId)return;
  if(!gesture.moved && Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)<5)return;
  if(!gesture.moved) {
   gesture.moved=true;
   this.pieces.get(gesture.from)?.getAnimations().forEach(animation=>animation.cancel());
   this.pieces.get(gesture.from)?.classList.add('dragging');this.root.classList.add('is-dragging');
  }
  gesture.clientX=event.clientX;gesture.clientY=event.clientY;
  if(!this.dragFrame)this.dragFrame=requestAnimationFrame(this.paintDrag);
 }
 up(event) {
  const gesture=this.gesture;if(!gesture || gesture.pointer!==event.pointerId)return;
  cancelAnimationFrame(this.dragFrame);this.dragFrame=0;this.root.classList.remove('is-dragging');
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
  if(promote && !ChessilPreferences.get().autoQueen)this.choosePromotion(from,to);else this.propose(from+to+(promote?'q':''));
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
  if(directions[event.key] && this.keyboardMode && this.canInput()) {
   event.preventDefault();const [dx,dy]=directions[event.key],[x,y]=this.point(this.active);
   const file=Math.max(0,Math.min(7,x+dx)),rank=Math.max(0,Math.min(7,y+dy));
   this.active=String.fromCharCode(97+(this.orientation==='w'?file:7-file))+(this.orientation==='w'?8-rank:rank+1);
   this.drawOverlays();this.announcement.textContent=this.active+' '+this.pieceName(this.position[this.active]);return;
  }
  if((event.key==='Enter'||event.key===' ') && this.canInput()) {
   event.preventDefault();if(this.selected && this.tryMove(this.selected,this.active))return;
   if(this.position[this.active]?.c===this.state().side){this.select(this.active);this.keyboardMode=true;}
  }
 }
 pieceName(piece) {return piece?`${piece.c==='w'?'White':'Black'} ${{p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'}[piece.p]}`:'empty';}
 drawOverlays() {
  const wanted=new Set(),fragment=document.createDocumentFragment();
  const add=(square,type)=>{
   if(!/^[a-h][1-8]$/.test(square || ''))return;
   const key=type+':'+square;wanted.add(key);let node=this.overlay.get(key);
   if(!node){node=document.createElement('square');node.className=type;node.dataset.square=square;this.overlay.set(key,node);fragment.append(node);}
   const transform=this.transform(square);if(node.style.transform!==transform)node.style.transform=transform;
  };
  if(this.lastMove){add(this.lastMove.slice(0,2),'last-move');add(this.lastMove.slice(2,4),'last-move');}
  if(this.selected){add(this.selected,'selected');for(const move of this.candidates(this.selected))add(move.slice(2,4),this.position[move.slice(2,4)]?'move-dest capture-dest':'move-dest');}
  for(const move of [this.premove,this.pending])if(move){add(move.slice(0,2),'current-premove');add(move.slice(2,4),'current-premove');}
  add(this.active,'keyboard-square');
  for(const [key,node] of this.overlay)if(!wanted.has(key)){node.remove();this.overlay.delete(key);}
  if(fragment.childNodes.length)this.root.append(fragment);
 }
 acknowledge(move=''){clearTimeout(this.pendingTimer);this.pending=null;this.premove=move;this.drawOverlays();}
 render(board,move='',animate=false) {
  this.cancel(false);clearTimeout(this.pendingTimer);this.pending=null;this.premove='';this.promotion?.close();
  const next=Object.fromEntries(Object.entries(board).filter(([,p])=>p.p!==' ').map(([s,p])=>[s,{...p}]));
  const previous=this.position,relocated=new Map(),origins=new Map();
  const relocate=(from,to)=>{const element=this.pieces.get(from);if(!element)return;
   // Only an interrupted moving piece needs a computed style sample.
   const animations=element.getAnimations();origins.set(to,animations.length?getComputedStyle(element).transform:this.transform(from));
   animations.forEach(animation=>animation.cancel());relocated.set(to,element);this.pieces.delete(from);};
  // Move the actual element; the same path handles promotions, EP and castling.
  if(move && animate) {
   const from=move.slice(0,2),to=move.slice(2,4),piece=this.pieces.get(from);
   if(piece && previous[from]) {
    relocate(from,to);
    if(previous[from].p==='k' && Math.abs(from.charCodeAt(0)-to.charCodeAt(0))===2) {
     const rookFrom=(to[0]==='g'?'h':'a')+from[1],rookTo=(to[0]==='g'?'f':'d')+from[1];
     relocate(rookFrom,rookTo);
    }
   }
  }
  const duration=animate?ChessilPreferences.duration():0;
  for(const [square,element] of this.pieces)if(!next[square] || relocated.has(square) || previous[square]?.p!==next[square].p || previous[square]?.c!==next[square].c){element.remove();this.pieces.delete(square);}
  for(const [square,piece] of Object.entries(next)) {
   let element=relocated.get(square) || this.pieces.get(square),created=!element;
   if(created){element=document.createElement('piece');this.root.append(element);}
   const moved=relocated.has(square),changed=created || moved || previous[square]?.p!==piece.p || previous[square]?.c!==piece.c;
   if(!changed)continue;
   element.getAnimations().forEach(animation=>animation.cancel());
   element.className=(piece.c==='w'?'white':'black')+' '+({p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'}[piece.p]);
   element.dataset.square=square;element.setAttribute('aria-hidden','true');const target=this.transform(square);element.style.transform=target;this.pieces.set(square,element);
   if(duration && moved)element.animate([{transform:origins.get(square)},{transform:target}],{duration,easing:'cubic-bezier(.22,.65,.3,1)'});
  }
  this.position=next;this.lastMove=move || '';this.drawOverlays();
  if(move)this.announcement.textContent=move.slice(0,2)+' → '+move.slice(2,4);
 }
 destroy(){this.abort.abort();this.cancel(false);clearTimeout(this.pendingTimer);this.promotion?.close();this.announcement.remove();for(const element of this.pieces.values()){element.getAnimations().forEach(animation=>animation.cancel());element.remove();}for(const element of this.overlay.values())element.remove();this.pieces.clear();this.overlay.clear();}
};
