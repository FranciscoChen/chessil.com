document.addEventListener('DOMContentLoaded',()=>{
 const form=document.getElementById('easy-form'),button=document.getElementById('easy-quick-start'),status=document.getElementById('easy-status');
 if (!form) return;
 let starting=false;
 form.addEventListener('submit',async event=>{
  event.preventDefault(); if(starting)return;
  starting=true; button.disabled=true; form.setAttribute('aria-busy','true');status.textContent=form.dataset.starting;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),35000);
  try {
   if(window.chessilMeasureLatency)await window.chessilMeasureLatency();
   const response=await fetch('/easy/start',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
    body:JSON.stringify({bot:'swift',difficulty:Number(document.getElementById('easy-difficulty').value),
     timecontrol:document.getElementById('easy-time').value,color:document.getElementById('easy-color').value})});
   const data=await response.json();
   if(!response.ok || !data.success || !/^[a-zA-Z0-9]{9}$/.test(data.gameid || ''))throw new Error(data.error || form.dataset.failed);
   location.assign('/game/'+data.gameid);
  } catch(error) {status.textContent=error.name==='AbortError'?form.dataset.failed:error.message || form.dataset.failed;}
  finally {clearTimeout(timeout);starting=false;button.disabled=false;form.removeAttribute('aria-busy');}
 });
});
