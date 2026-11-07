/* Global timed UI boundary: construct once, complete via CSS animationend.
 * No polling, per-frame updates or number repaint timers. */
(()=>{
'use strict';
const running=new WeakMap();
function start(root,{seconds=5,format=String,label='Countdown',onFinish}={}){
 if(!root)return null;
 seconds=Math.max(1,Math.min(3600,Math.ceil(seconds)));running.get(root)?.cancel();
 const abort=new AbortController();let closed=false;
 let display=root.querySelector('[data-countdown]');if(!display){display=document.createElement('span');display.dataset.countdown='';root.append(display);}
 display.className='ui-countdown';display.setAttribute('role','timer');display.setAttribute('aria-label',`${label}: ${format(seconds)}`);
 const track=document.createElement('span');track.className='ui-countdown-track';track.setAttribute('aria-hidden','true');
 const fragment=document.createDocumentFragment();for(let i=seconds;i>=0;i--){const number=document.createElement('span');number.textContent=format(i);fragment.append(number);}track.append(fragment);display.replaceChildren(track);
 root.style.setProperty('--ui-duration',seconds+'s');root.style.setProperty('--ui-steps',seconds);
 // Replace the fill to restart its CSS animation without a forced layout read.
 const fill=root.querySelector('.ui-meter-fill');if(fill)fill.replaceWith(fill.cloneNode(false));
 const cancel=()=>{if(closed)return;closed=true;abort.abort();root.classList.remove('ui-timed');display.replaceChildren();running.delete(root);};
 const handle={cancel};running.set(root,handle);root.classList.add('ui-timed');
 track.addEventListener('animationend',event=>{if(event.animationName!=='ui-countdown'||closed)return;cancel();onFinish?.();},{signal:abort.signal});
 return handle;
}
window.ChessilTiming={start,cancel:root=>running.get(root)?.cancel()};
})();
