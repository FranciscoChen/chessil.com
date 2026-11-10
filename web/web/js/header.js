/* Global header controller: one open surface, native controls, no DOM swapping.
 * Search cancels stale requests; keyboard navigation follows the visible links. */
var lang=document.documentElement.lang||'en',loggedin=0;
function headerfunctions(){
 const header=document.querySelector('.site-header');if(!header||header.dataset.ready)return;header.dataset.ready='true';
 const triggers=[...header.querySelectorAll('[data-header-toggle]')],nav=header.querySelector('#n'),mobile=matchMedia('(max-width:900px)'),backdrop=header.querySelector('.header-backdrop');let active=null;
 function setOpen(trigger){
  if(trigger!==active)header.querySelectorAll("[data-header-view]").forEach(el=>el.hidden=el.dataset.headerView!=="main");
  for(const item of triggers){const open=item===trigger;item.setAttribute('aria-expanded',String(open));item.parentElement.classList.toggle('shown',open);}
  active=trigger;const navOpen=trigger?.getAttribute('aria-controls')==='n';nav.classList.toggle('header-nav-open',navOpen);header.querySelector('#x').checked=navOpen;backdrop.hidden=!navOpen;
  document.body.classList.toggle('header-nav-open',navOpen&&mobile.matches);
  if(trigger){header.dispatchEvent(new CustomEvent('chessil:menu-open',{bubbles:true,detail:{id:trigger.getAttribute('aria-controls')}}));if(trigger.id==='search-toggle')header.querySelector('#header-search-input').focus();}
 }
 window.ChessilHeader={close:()=>setOpen(null),toggle:trigger=>setOpen(active===trigger?null:trigger)};
 header.addEventListener('click',event=>{
  const trigger=event.target.closest('[data-header-toggle]');if(trigger){window.ChessilHeader.toggle(trigger);return;}
  if(event.target.closest('.header-backdrop'))setOpen(null);
  const view=event.target.closest('[data-header-show]');if(view){const name=view.dataset.headerShow;header.querySelectorAll('[data-header-view]').forEach(el=>el.hidden=el.dataset.headerView!==name);const first=header.querySelector('[data-header-view="'+name+'"] button');first?.focus();}
  if(event.target.closest('#open-board-settings,#n a'))setOpen(null);
 });
 document.addEventListener('click',event=>{if(!header.contains(event.target))setOpen(null);});
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&active){const previous=active;setOpen(null);previous.focus();event.preventDefault();}
  if(!active||!['ArrowDown','ArrowUp','Home','End'].includes(event.key)||event.target.matches('input,textarea,select'))return;
  const panel=document.getElementById(active.getAttribute('aria-controls')),items=[...panel.querySelectorAll('a[href],button,input')].filter(el=>el.getClientRects().length&&!el.disabled);if(!items.length)return;
  event.preventDefault();const index=items.indexOf(document.activeElement);items[event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length].focus();
 });
 document.addEventListener('focusin',event=>{if(active&&!header.contains(event.target))setOpen(null);});
 mobile.addEventListener('change',()=>setOpen(null));
 const input=header.querySelector('#header-search-input'),results=header.querySelector('.complete-list'),host=header.querySelector('#clinput');let timer,request,sequence=0;
 input.addEventListener('input',()=>{clearTimeout(timer);request?.abort();const current=++sequence;results.replaceChildren();if(input.value.trim().length<2)return;timer=setTimeout(async()=>{request=new AbortController();try{const response=await fetch('/search',{method:'POST',body:input.value.trim(),signal:request.signal});if(!response.ok)throw Error();const users=await response.json();if(current!==sequence)return;for(const username of users){const a=document.createElement('a');a.className='header-row';a.href='/@/'+encodeURIComponent(username);a.textContent=username;results.append(a);}if(!users.length)results.textContent=host.dataset.empty;}catch(error){if(error.name!=='AbortError'&&current===sequence)results.textContent=host.dataset.error;}},300);});
 isloggedin();
}
async function isloggedin(){try{const response=await fetch('/loggedin',{method:'POST'});if(response.ok){loggedin=Number(await response.text())===1?1:0;updateuserbutton();}}catch(_){}}
function updateuserbutton(){for(const id of ['login','header-register','profile','logout']){const el=document.getElementById(id);if(el)el.classList.toggle('none',['profile','logout'].includes(id)?!loggedin:!!loggedin);}}
document.addEventListener('DOMContentLoaded',headerfunctions);
