/* Serial UCI transport. A single dedicated worker owns all engine memory.
 * Engine/network manifests are replaceable; no requests go to engine servers. */
window.ChessilLocalEngine=class {
 constructor(){this.queue=Promise.resolve();this.pending=null;this.closed=false;this.abort=new AbortController();}
 async load(settings=window.ChessilPreferences?.get().analysis||{}){
  const catalogResponse=await fetch('/engine/catalog.json',{signal:this.abort.signal});if(!catalogResponse.ok)throw Error('Engine catalog unavailable');
  const catalog=await catalogResponse.json(),selected=catalog.engines.find(e=>e.id===(settings.engine||'stockfish-lite'));if(!selected)throw Error('Selected engine is not installed');
  const networkChoice=selected.networks.find(n=>n.id===(settings.network||'default'));if(!networkChoice)throw Error('Selected network is not compatible with this engine');
  this.settings={...settings,multiPV:settings.multiPV||3,hash:settings.hash||32,threads:selected.threads.includes(settings.threads)?settings.threads:selected.threads[0]};

  const response=await fetch(selected.manifest,{cache:'no-store',signal:this.abort.signal});if(!response.ok)throw Error('Engine manifest unavailable');this.manifest=await response.json();
  this.worker=new Worker(this.manifest.worker);this.worker.onmessage=e=>this.line(String(e.data));this.worker.onerror=()=>this.fail(Error('Browser engine could not run. WebAssembly SIMD support is required.'));
  const options=new Set();await this.command('uci',line=>line==='uciok',30000,line=>{const match=line.match(/^option name (.+?) type /);if(match)options.add(match[1]);});
  for(const network of networkChoice.mode==='embedded'?[]:(networkChoice.files||this.manifest.networks||[])){
   if(!options.has(network.option||'EvalFile'))throw Error('This engine does not support the configured network option');
   const r=await fetch(network.url,{signal:this.abort.signal});if(!r.ok)throw Error('Neural network download failed');const data=await r.arrayBuffer();
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),n=>n.toString(16).padStart(2,'0')).join('');if(digest!==network.sha256)throw Error('Neural network checksum mismatch');
   await this.command({type:'loadNetwork',name:network.name,option:network.option||'EvalFile',data},line=>line==='networkready',15000);
  }
  this.worker.postMessage('setoption name UCI_ShowWDL value true');this.worker.postMessage('setoption name Hash value '+this.settings.hash);if(options.has('Threads'))this.worker.postMessage('setoption name Threads value '+this.settings.threads);this.worker.postMessage('setoption name UCI_AnalyseMode value true');await this.command('isready',line=>line==='readyok');return this.manifest;
 }
 line(line){if(/networkerror|ERROR:|Aborted\(/.test(line)){this.fail(Error(line));return;}const p=this.pending;if(!p)return;p.onLine?.(line);if(p.match(line)){clearTimeout(p.timer);this.pending=null;p.resolve(line);}}
 command(message,match,timeout=15000,onLine){return new Promise((resolve,reject)=>{if(this.closed)return reject(Error('Analysis stopped'));if(this.pending)return reject(Error('Engine command overlap'));const timer=setTimeout(()=>this.fail(Error('Browser analysis timed out. Try restarting.')),timeout);this.pending={resolve,reject,match,onLine,timer};this.worker.postMessage(message);});}
 search(position,{multiPV=this.settings?.multiPV||3,nodes=120000,movetime=700,searchmoves=[],history,onUpdate}={}){
  const task=async()=>{if(this.closed)throw Error('Analysis stopped');this.worker.postMessage('setoption name MultiPV value '+multiPV);this.worker.postMessage(history?'position startpos'+(history.length?' moves '+history.join(' '):''):'position fen '+position);const lines=new Map();let lastUpdate=0;
   await this.command(`go nodes ${nodes} movetime ${movetime}${searchmoves.length?' searchmoves '+searchmoves.join(' '):''}`,line=>line.startsWith('bestmove '),15000,line=>{const score=line.match(/\bscore (cp|mate) (-?\d+)/),pv=line.match(/\bpv (.+)/),depth=line.match(/\bdepth (\d+)/),rank=line.match(/\bmultipv (\d+)/);if(!score||!pv||!depth||/\b(?:upperbound|lowerbound)\b/.test(line))return;const moves=pv[1].trim().split(/\s+/);if(!moves.every(m=>/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m)))return;lines.set(Number(rank?.[1]||1),{kind:score[1],value:Number(score[2]),depth:Number(depth[1]),nodes:Number(line.match(/\bnodes (\d+)/)?.[1]||0),pv:moves,wdl:line.match(/\bwdl (\d+) (\d+) (\d+)/)?.slice(1).map(Number)});if(onUpdate&&Date.now()-lastUpdate>=100){lastUpdate=Date.now();onUpdate([...lines].sort((a,b)=>a[0]-b[0]).map(pair=>pair[1]));}});
   const seen=new Set(),result=[...lines].sort((a,b)=>a[0]-b[0]).map(pair=>pair[1]).filter(line=>{const move=line.pv[0];if(seen.has(move))return false;seen.add(move);return true;});if(!result.length)throw Error('Engine returned no evaluation');return result;};
  const result=this.queue.then(task);this.queue=result.catch(()=>{});return result;
 }
 fail(error){const p=this.pending;this.pending=null;if(p){clearTimeout(p.timer);p.reject(error);}this.closed=true;this.abort.abort();this.worker?.terminate();}
 close(){this.fail(Error('Analysis stopped'));}
};
