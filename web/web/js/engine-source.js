/* Resolve only installed engines; links appear after their source is explained. */
document.addEventListener('DOMContentLoaded',async()=>{
 const name=document.querySelector('[data-engine-source-name]');if(!name)return;
 try{const get=async url=>{const response=await fetch(url);if(!response.ok)throw Error();return response.json();},catalog=await get('/engine/catalog.json'),id=new URLSearchParams(location.search).get('engine')||catalog.engines[0]?.id,engine=catalog.engines.find(item=>item.id===id);if(!engine)throw Error();const manifest=await get(engine.manifest);
  const local=url=>{const parsed=new URL(url,location.origin);if(parsed.origin!==location.origin||!parsed.pathname.startsWith('/engine/'))throw Error();return parsed.href;};
  name.textContent=engine.name+' · '+manifest.revision;document.querySelector('[data-source-download]').href=local(manifest.source);document.querySelector('[data-source-license]').href=local(manifest.license);document.querySelector('[data-engine-source-downloads]').hidden=false;
 }catch(_){name.textContent=name.dataset.sourceError;}
});
