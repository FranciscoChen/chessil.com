/* One preference owner across settings and the game dialog. Account storage is
 * authoritative; local storage is a guest/offline cache, never another account's profile. */
window.ChessilPreferences = (() => {
 const defaults=normalizeBoardPreferences();
 let value=structuredClone(defaults),version=0,saveTimer,account=false,saving=Promise.resolve();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function apply() {
  const root=document.documentElement;
  root.dataset.board=value.board;root.dataset.pieces=value.pieces;
  root.style.setProperty('--piece-slide',duration()+'ms');
  syncEngineOptions();
  document.dispatchEvent(new CustomEvent('chessil:preferences',{detail:get()}));
 }
 function get(){return structuredClone(value);}
 function duration(){return reduced.matches?0:value.slide;}
 function message(text){document.querySelectorAll('[data-preference-status]').forEach(el=>el.textContent=text);}
 function cache(){if(!account)try{localStorage.setItem('chessil:guest-board',JSON.stringify(value));}catch(_){} }
 const ready=fetch('/preferences',{cache:'no-store'}).then(async response=>{
  if(!response.ok)throw new Error('Preferences unavailable');
  const data=await response.json();account=data.account;
  value=normalizeBoardPreferences(data.preferences);
 }).catch(()=>{
  // Only guest preferences are cached; account data never leaks between logins.
  try {const cached=localStorage.getItem('chessil:guest-board');if(cached)value=normalizeBoardPreferences(JSON.parse(cached));}catch(_){}
  message(words().failed);
 }).finally(()=>{apply();});
 function update(patch) {
  value=normalizeBoardPreferences({...value,...patch,analysis:{...value.analysis,...patch.analysis},events:{...value.events,...patch.events}});version++;apply();cache();
  clearTimeout(saveTimer);message(words().saving);
  saveTimer=setTimeout(()=>{
   const snapshot=get(),revision=version;
   // Serialize writes so dragging a slider cannot save older values last.
   saving=saving.catch(()=>{}).then(async()=>{
    try {
     const response=await fetch('/preferences',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot)});
     if(!response.ok)throw new Error();
     if(revision===version)message(account?words().saved:words().guestSaved);
    } catch(_){if(revision===version)message(words().failed);}
   });
  },250);
 }
 reduced.addEventListener('change',apply);
 const labels={
 en:{autoQueen:'Automatically promote to queen',title:'Board & sound',board:'Board palette',pieces:'Piece style',slide:'Piece sliding',none:'No sliding',fast:'Quick · 100 ms',normal:'Smooth · 180 ms',slow:'Relaxed · 320 ms',sound:'Sound theme',auto:'Follow website theme',ivory:'Ivory Study',midnight:'Midnight Observatory',walnut:'Walnut',classic:'Classic',sculpted:'Sculpted',volume:'Volume',mute:'Mute all sounds',events:'Personalize each sound',theme:'Selected sound theme',off:'Off',preview:'Preview',move:'Move',capture:'Capture',start:'Game start',end:'Game end',clock:'Low clock',check:'Check',slideEvent:'Sliding',saving:'Saving…',saved:'Saved to your account.',guestSaved:'Saved for this browser session.',failed:'Could not sync. Your selection is applied; change a setting to retry.',help:'Sounds start after you interact. Low-clock alerts play once below 10 seconds on your turn. Reduced motion disables sliding.',reset:'Reset board & sound',close:'Close'},
 es:{autoQueen:'Promocionar automáticamente a dama',title:'Tablero y sonido',board:'Paleta del tablero',pieces:'Estilo de piezas',slide:'Deslizamiento',none:'Sin animación',fast:'Rápido · 100 ms',normal:'Suave · 180 ms',slow:'Pausado · 320 ms',sound:'Tema sonoro',auto:'Seguir el tema del sitio',ivory:'Ivory Study',midnight:'Midnight Observatory',walnut:'Nogal',classic:'Clásico',sculpted:'Esculpido',volume:'Volumen',mute:'Silenciar todo',events:'Personalizar cada sonido',theme:'Tema sonoro elegido',off:'Desactivado',preview:'Escuchar',move:'Jugada',capture:'Captura',start:'Inicio',end:'Final',clock:'Poco tiempo',check:'Jaque',slideEvent:'Deslizamiento',saving:'Guardando…',saved:'Guardado en tu cuenta.',guestSaved:'Guardado para esta sesión del navegador.',failed:'No se pudo sincronizar. Cambia un ajuste para reintentar.',help:'El audio empieza tras interactuar. La alerta suena una vez bajo 10 segundos en tu turno. Movimiento reducido desactiva las animaciones.',reset:'Restablecer tablero y sonido',close:'Cerrar'},
 zh:{autoQueen:'自动升变为后',title:'棋盘与声音',board:'棋盘配色',pieces:'棋子风格',slide:'棋子滑动',none:'关闭滑动',fast:'快速 · 100 毫秒',normal:'平滑 · 180 毫秒',slow:'舒缓 · 320 毫秒',sound:'声音主题',auto:'跟随网站主题',ivory:'Ivory Study',midnight:'Midnight Observatory',walnut:'胡桃木',classic:'经典',sculpted:'雕塑',volume:'音量',mute:'静音',events:'自定义每种声音',theme:'所选声音主题',off:'关闭',preview:'试听',move:'走子',capture:'吃子',start:'对局开始',end:'对局结束',clock:'时间不足',check:'将军',slideEvent:'滑动',saving:'保存中…',saved:'已保存到账户。',guestSaved:'已保存到当前浏览器会话。',failed:'同步失败，请修改设置重试。',help:'交互后启用声音。轮到你且不足10秒时提醒一次。减少动态效果会关闭滑动。',reset:'重置棋盘与声音',close:'关闭'}
 };
 function words(){return labels[document.documentElement.lang] || labels.en;}
 let catalogRequest;
 function loadEngineCatalog(){return catalogRequest||(catalogRequest=fetch('/engine/catalog.json').then(r=>{if(!r.ok)throw Error();return r.json();}).catch(error=>{catalogRequest=null;throw error;}));}
 const engineForms=new Set();
 function syncEngineOptions(){for(const form of engineForms){if(!form.host.isConnected){engineForms.delete(form);continue;}form.sync();}}
 function renderEngineOptions(host,{compact=false}={}){
  for(const form of engineForms)if(form.host===host||!form.host.isConnected)engineForms.delete(form);
  host.replaceChildren();host.classList.add('engine-option-fields');
  const labels={en:['Engine','Network','Lines (MultiPV)','Hash memory','Threads'],es:['Motor','Red','Líneas (MultiPV)','Memoria hash','Hilos'],zh:['引擎','网络','变化 (MultiPV)','哈希内存','线程']}[document.documentElement.lang]||['Engine','Network','Lines (MultiPV)','Hash memory','Threads'];
  const fields={};let catalog,selectedId;
  for(const [index,key] of ['engine','network','multiPV','hash','threads'].entries()){
   const label=document.createElement('label'),input=document.createElement('select');label.className='ui-field';label.textContent=labels[index];input.dataset.preference='analysis.'+key;input.dataset.engineOption=key;label.append(input);host.append(label);fields[key]=input;
   input.onchange=()=>{if(key==='engine'){const chosen=catalog?.engines.find(engine=>engine.id===input.value);if(chosen)update({analysis:{engine:chosen.id,threads:chosen.threads[0],network:chosen.networks[0].id}});}else update({analysis:{[key]:['multiPV','hash','threads'].includes(key)?Number(input.value):input.value}});};
  }
  const fill=(key,options)=>fields[key].replaceChildren(...options.map(([id,label])=>new Option(label,String(id))));
  fill('multiPV',Array.from({length:8},(_,i)=>[i+1,String(i+1)]));fill('hash',[8,16,32,64,128,256].map(n=>[n,n+' MB']));
  const hint=document.createElement('p');hint.className='ui-muted';if(!compact)host.append(hint);
  if(compact){const status=document.createElement('output');status.className='preference-status';status.dataset.preferenceStatus='';status.setAttribute('role','status');host.append(status);}
  const form={host,sync(){
   const config=value.analysis,chosen=catalog?.engines.find(engine=>engine.id===config.engine)||catalog?.engines[0];
   if(chosen&&selectedId!==chosen.id){selectedId=chosen.id;fill('engine',catalog.engines.map(engine=>[engine.id,engine.name]));fill('threads',chosen.threads.map(n=>[n,String(n)]));fill('network',chosen.networks.map(network=>[network.id,network.name]));hint.textContent='Changes apply on engine start.'+(chosen.threads.length===1?' This build supports '+chosen.threads[0]+' thread.':'');}
   for(const [key,input] of Object.entries(fields)){input.disabled=!catalog&&['engine','network','threads'].includes(key);input.value=String(config[key]);if(!input.value&&input.options.length)input.selectedIndex=0;}
  }};engineForms.add(form);form.sync();
  return loadEngineCatalog().then(result=>{if(!host.isConnected)return false;catalog=result;form.sync();return true;}).catch(()=>{hint.textContent='Engine choices unavailable. Reopen options to retry.';if(compact){hint.setAttribute('role','status');host.append(hint);}return false;});
 }
 function render(host) {
  const t=words();host.replaceChildren();
  function el(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text)e.textContent=text;return e;}
  host.append(el('h2','',t.title));
  const grid=el('div','board-settings-grid');host.append(grid);
  function select(parent,label,key,options,eventKey) {
   const field=el('label','ui-field',label),input=el('select');field.append(input);parent.append(field);
   options.forEach(([value,label])=>input.add(new Option(label,String(value))));
   input.value=String(eventKey?value.events[eventKey]:value[key]);
   input.dataset.preference=eventKey?'events.'+eventKey:key;
   input.addEventListener('change',()=>update(eventKey?{events:{[eventKey]:input.value}}:{[key]:key==='slide'?Number(input.value):input.value}));
   return input;
  }
  select(grid,t.board,'board',[['auto',t.auto],['ivory',t.ivory],['midnight',t.midnight],['walnut',t.walnut]]);
  select(grid,t.pieces,'pieces',[['classic',t.classic],['sculpted',t.sculpted]]);
  select(grid,t.slide,'slide',[[0,t.none],[100,t.fast],[180,t.normal],[320,t.slow]]);
  select(grid,t.sound,'sound',[['auto',t.auto],['ivory',t.ivory],['midnight',t.midnight]]);
  const queenField=el('label','board-settings-toggle'),queen=el('input');queen.type='checkbox';queen.checked=value.autoQueen;queen.dataset.preference='autoQueen';queenField.append(queen,document.createTextNode(t.autoQueen));grid.append(queenField);
  queen.addEventListener('change',()=>update({autoQueen:queen.checked}));
  const volumeField=el('label','ui-field',t.volume),volume=el('input');volume.type='range';volume.min=0;volume.max=100;volume.value=value.volume;volume.dataset.preference='volume';volumeField.append(volume);grid.append(volumeField);
  volume.addEventListener('input',()=>update({volume:Number(volume.value)}));
  const muteField=el('label','board-settings-toggle'),mute=el('input');mute.type='checkbox';mute.checked=value.muted;mute.dataset.preference='muted';muteField.append(mute,document.createTextNode(t.mute));grid.append(muteField);
  mute.addEventListener('change',()=>update({muted:mute.checked}));
  const details=el('details','sound-customize');details.append(el('summary','',t.events));host.append(details);
  for(const key of Object.keys(defaults.events)) {
   const row=el('div','sound-event');details.append(row);
   select(row,key==='slide'?t.slideEvent:t[key],null,[['theme',t.theme],['ivory',t.ivory],['midnight',t.midnight],['off',t.off]],key);
   const preview=el('button','ui-button ui-secondary',t.preview);preview.type='button';preview.setAttribute('aria-label',t.preview+' · '+(key==='slide'?t.slideEvent:t[key]));preview.addEventListener('click',()=>{ChessilSound.unlock();ChessilSound.play(key,true);});row.append(preview);
  }
  const analysis=el('section','engine-settings');if(!host.closest('dialog'))analysis.id='analysis-engine-settings';analysis.append(el('h3','','Analysis engine'));host.append(analysis);
  const engineGrid=el('div','board-settings-grid');analysis.append(engineGrid);renderEngineOptions(engineGrid);
  const help=el('p','ui-muted',t.help);host.append(help);
  const status=el('p','preference-status');status.dataset.preferenceStatus='';status.setAttribute('role','status');host.append(status);
  const reset=el('button','ui-button ui-quiet',t.reset);reset.type='button';reset.addEventListener('click',()=>{update(structuredClone(defaults));render(host);});host.append(reset);
 }
 document.addEventListener('DOMContentLoaded',async()=>{
  await ready;
  document.querySelectorAll('[data-board-settings]').forEach(host=>{if(!host.closest('dialog'))render(host);});
  const dialog=document.querySelector('#board-settings-dialog');
  if(dialog) {
   const open=document.querySelector('#open-board-settings');open.textContent=words().title;
   open.addEventListener('click',()=>{document.querySelector('.dasher')?.classList.remove('shown');render(dialog.querySelector('[data-board-settings]'));dialog.showModal();});
   const close=dialog.querySelector('[data-close-board-settings]');close.setAttribute('aria-label',words().close);close.addEventListener('click',()=>dialog.close());
   dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom)dialog.close();}});
  }
 });
 return {ready,get,update,duration,renderEngineOptions,engineCatalog:loadEngineCatalog};
})();
