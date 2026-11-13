/* Shared history activation; hold cancels as soon as a user starts scrolling. */
window.ChessilHistoryGestures={bind(host,{open}){
 const abort=new AbortController(),options={signal:abort.signal};let timer,origin,lastTap,suppressUntil=0;
 const cancel=()=>{clearTimeout(timer);origin=null;};
 host.setAttribute('aria-haspopup','dialog');host.setAttribute('aria-keyshortcuts','V Shift+F10');host.title='Double-click or press and hold for variations';host.tabIndex=0;
 host.addEventListener('pointerdown',event=>{if(event.button!==0||!event.isPrimary)return;cancel();origin={x:event.clientX,y:event.clientY};timer=setTimeout(()=>{origin=null;suppressUntil=performance.now()+800;open();},550);},options);
 host.addEventListener('pointermove',event=>{if(origin&&Math.hypot(event.clientX-origin.x,event.clientY-origin.y)>8)cancel();},options);
 host.addEventListener('pointerup',event=>{
  if(event.pointerType==='touch'&&origin){const now=performance.now();if(lastTap&&now-lastTap.time<350&&Math.hypot(event.clientX-lastTap.x,event.clientY-lastTap.y)<20){event.preventDefault();suppressUntil=now+800;lastTap=null;open();}else lastTap={time:now,x:event.clientX,y:event.clientY};}cancel();
 },options);
 for(const type of ['pointercancel','pointerleave'])host.addEventListener(type,cancel,options);
 host.addEventListener('dblclick',event=>{event.preventDefault();cancel();open();},options);
 host.addEventListener('contextmenu',event=>{event.preventDefault();cancel();open();},options);
 host.addEventListener('click',event=>{if(performance.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();}}, {...options,capture:true});
 host.addEventListener('keydown',event=>{if(event.key.toLowerCase()==='v'||event.key==='F10'&&event.shiftKey){event.preventDefault();open();}},options);
 return()=>{cancel();abort.abort();};
}};
