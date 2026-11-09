/* One optional callout per guide. Geometry is read only on layout changes;
 * typing uses textContent and timers, never HTML or a pointer/frame loop. */
(()=>{
'use strict';
let current=null;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const words={en:{next:'Next',done:'Done',skip:'Skip tour'},es:{next:'Siguiente',done:'Listo',skip:'Omitir guía'},zh:{next:'下一步',done:'完成',skip:'跳过引导'}};
const copy=()=>words[document.documentElement.lang]||words.en;
function show(target,{text='',step='',nextLabel=copy().next,onNext,onClose,actions=true,placement='auto'}={}){
 current?.close();target=typeof target==='string'?document.querySelector(target):target;
 if(!target)return null;
 const abort=new AbortController(),overlay=document.createElement('div');overlay.className='ui-highlight ui-highlight-overlay';overlay.setAttribute('aria-hidden','true');document.body.append(overlay);
 let box,timer,closed=false,observer;
 const letters=Array.from(text);let count=0;
 function type(direction,done){clearTimeout(timer);if(reduced()){count=direction>0?letters.length:0;if(box)box.querySelector('p').textContent=letters.slice(0,count).join('');done?.();return;}
  const tick=()=>{if(closed)return;count=Math.max(0,Math.min(letters.length,count+direction));box.querySelector('p').textContent=letters.slice(0,count).join('');if(direction>0?count<letters.length:count>0)timer=setTimeout(tick,direction>0?24:12);else done?.();};tick();
 }
 const close=()=>{if(closed)return;closed=true;clearTimeout(timer);abort.abort();observer?.disconnect();overlay.remove();box?.remove();if(current===handle)current=null;};
 const dismiss=()=>{close();onClose?.();};
 function position(){if(!target.isConnected){dismiss();return;}const r=target.getBoundingClientRect(),visible=r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;overlay.hidden=!visible;if(box)box.hidden=!visible;if(!visible)return;
  Object.assign(overlay.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
  if(box){const height=box.offsetHeight,left=Math.max(16,Math.min(innerWidth-box.offsetWidth-16,r.left));const top=placement==='bottom'||r.bottom+12+height<innerHeight?r.bottom+12:Math.max(16,r.top-height-12);Object.assign(box.style,{left:left+'px',top:top+'px'});}
 }
 if(text){box=document.createElement('aside');box.className='ui-guide';box.setAttribute('role','region');box.setAttribute('aria-label',text);const p=document.createElement('p');p.setAttribute('aria-hidden','true');const actionRow=document.createElement('div');actionRow.className='ui-guide-actions';const label=document.createElement('small');label.textContent=step;const skip=document.createElement('button');skip.type='button';skip.className='ui-button ui-quiet';skip.textContent=copy().skip;skip.onclick=dismiss;const next=document.createElement('button');next.type='button';next.className='ui-button ui-primary';next.textContent=nextLabel;next.onclick=()=>{next.disabled=true;skip.disabled=true;type(-1,()=>{close();onNext?.();});};actionRow.append(label,skip,next);box.append(p);if(actions)box.append(actionRow);else box.classList.add('ui-guide-label');document.body.append(box);type(1);}
 const handle={close,update:position,element:overlay};current=handle;
 window.addEventListener('resize',position,{signal:abort.signal});window.addEventListener('scroll',position,{signal:abort.signal,capture:true,passive:true});document.addEventListener('keydown',event=>{if(event.key==='Escape')dismiss();},{signal:abort.signal});
 observer=new ResizeObserver(position);observer.observe(target);if(box)observer.observe(box);position();return handle;
}
function tour(id,steps,{force=false}={}){
 const key='chessil.guide.'+id;try{if(!force&&localStorage.getItem(key))return null;}catch(_){}
 const available=steps.filter(s=>{const el=document.querySelector(s.target);if(!el||!el.getClientRects().length)return false;for(let parent=el;parent;parent=parent.parentElement){const style=getComputedStyle(parent);if(style.visibility==='hidden'||style.display==='none'||Number(style.opacity)===0)return false;}return true;});if(!available.length)return null;
 let index=0;const finish=()=>{try{localStorage.setItem(key,'seen');}catch(_){};};
 const advance=()=>{if(index>=available.length){finish();return;}const s=available[index++];show(s.target,{...s,step:index+' / '+available.length,nextLabel:index===available.length?copy().done:copy().next,onNext:advance,onClose:finish});};advance();finish();return {close:()=>{current?.close();finish();}};
}
window.ChessilHighlight={show,tour,clear:()=>current?.close()};
window.addEventListener('pagehide',()=>current?.close());
})();
