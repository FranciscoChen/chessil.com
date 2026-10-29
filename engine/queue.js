// Bounded FIFO foreground/background queues, with one result owner per UUID.
const http=require('http');
const {parseJob}=require('./sf');
const obs=require('../observability').createObserver('engine-queue');
obs.installProcessHandlers();
const maxJobs=5000,jobs=new Map(),foreground=[],background=[],workers=new Set(),skipped=new Map();
let foregroundRun=0,stopping=false;
function send(res,status,data) {if(res.destroyed || res.writableEnded)return;res.writeHead(status,{'Content-Type':typeof data==='object'?'application/json':'text/plain'});res.end(typeof data==='object'?JSON.stringify(data):data || '');}
function finish(id,status,value) {const job=jobs.get(id);if(!job)return;jobs.delete(id);clearTimeout(job.timer);send(job.res,status,value);}
function next() {
 while(foreground.length || background.length) {
  const list=foreground.length && (foregroundRun<8 || !background.length)?foreground:background;
  if(list===foreground)foregroundRun++;else foregroundRun=0;
  const id=list.shift(),job=jobs.get(id);
  if(!job || job.dispatched)continue;
  if(skipped.has(id.split('-')[0])) {finish(id,410,{uuidhm:id,error:'Game ended'});continue;}
  job.dispatched=true;return job;
 }
}
function dispatch() {
 for(const worker of workers) {
  const job=next();if(!job)break;
  workers.delete(worker);clearTimeout(worker.timer);send(worker.res,200,job.sf);
 }
}
const server=http.createServer((req,res)=>{
 const route=new URL(req.url,'http://localhost').pathname;
 if(route==='/health')return send(res,200,{status:'ok',queue:foreground.length+background.length,outstanding:jobs.size});
 if(stopping)return send(res,503,{error:'Queue restarting'});
 if(route==='/lpush' || route==='/rpush') {
  let job;
  try {job=parseJob(req.headers.sf || '');}catch(error){return send(res,400,{error:error.message});}
  if(jobs.has(job.uuidhm))return send(res,409,{error:'Duplicate engine request'});
  if(jobs.size>=maxJobs)return send(res,429,{error:'Engine queue is full'});
  const entry={sf:req.headers.sf,res,dispatched:false};
  entry.timer=setTimeout(()=>finish(job.uuidhm,504,{uuidhm:job.uuidhm,error:'Engine request expired'}),route==='/lpush'?11000:100000);
  jobs.set(job.uuidhm,entry);
  res.on('close',()=>{if(jobs.get(job.uuidhm)===entry){clearTimeout(entry.timer);jobs.delete(job.uuidhm);}});
  (route==='/lpush'?foreground:background).push(job.uuidhm);dispatch();return;
 }
 if(route==='/lpop') {
  const job=next();if(job)return send(res,200,job.sf);
  if(workers.size>=128)return send(res,429,'Too many engine workers');
  const worker={res};worker.timer=setTimeout(()=>{workers.delete(worker);send(res,404,'');},1000);
  workers.add(worker);res.on('close',()=>{clearTimeout(worker.timer);workers.delete(worker);});return;
 }
 if(route==='/set') {
  const id=req.headers.uuidhm;
  if(!/^[a-zA-Z0-9-]{1,128}$/.test(id || ''))return send(res,400,'Invalid identifier');
  if(!jobs.has(id))return send(res,200,''); // Expired results are acknowledged and discarded.
  let result;
  try {
   if(req.headers.error)result={uuidhm:id,error:req.headers.error};
   else {
    const best=req.headers.bm,evaluation=req.headers.eval || '';
    if(!/^(?:[a-h][1-8][a-h][1-8][qrbn]?|0000)$/.test(best || '') || (evaluation && !/^(?:cp|mate) -?\d+$/.test(evaluation)))throw new Error('Invalid result');
    result={uuidhm:id,bestmove:best==='0000'?null:best,eval:evaluation || null};
    if(req.headers.analysis)result.analysis=JSON.parse(req.headers.analysis);
    if(req.headers.ponder && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(req.headers.ponder))result.ponder=req.headers.ponder;
   }
  }catch(error){return send(res,400,{error:error.message});}
  finish(id,result.error?502:200,result);return send(res,200,'');
 }
 if(route==='/spush') {skipped.set(req.headers.fg,Date.now());return send(res,200,'');}
 send(res,404,'Not found');
});
const cleanup=setInterval(()=>{
 for(const [id,time] of skipped)if(Date.now()-time>120000)skipped.delete(id);
 // Compact expired/cancelled IDs, even when no worker is connected.
 for(const list of [foreground,background])for(let i=list.length-1;i>=0;i--)if(!jobs.has(list[i]))list.splice(i,1);
},1000);cleanup.unref();
server.listen(Number(process.env.PORT || 8092),process.env.QUEUE_BIND || '127.0.0.1');
function shutdown(){if(stopping)return;stopping=true;clearInterval(cleanup);for(const id of jobs.keys())finish(id,503,{uuidhm:id,error:'Queue restarting'});for(const worker of workers){clearTimeout(worker.timer);send(worker.res,503,'');}workers.clear();server.close(()=>process.exit(0));}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
