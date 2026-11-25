// Bounded FIFO foreground/background queues, with one result owner per engine and UUID.
const http=require('http');
const {parseJob}=require('./sf');
const {stockfish,hybrid,parseEngine}=require('./variants');
const obs=require('../observability').createObserver('engine-queue');
obs.installProcessHandlers();
const maxJobs=5000,jobs=new Map(),workers=new Set(),skipped=new Map();
const lanes=new Map([stockfish,hybrid].map(engine=>[engine,{foreground:[],background:[],foregroundRun:0}]));
let stopping=false;
function send(res,status,data) {if(res.destroyed || res.writableEnded)return;res.writeHead(status,{'Content-Type':typeof data==='object'?'application/json':'text/plain'});res.end(typeof data==='object'?JSON.stringify(data):data || '');}
function finish(job,status,value) {if(jobs.get(job.key)!==job)return;jobs.delete(job.key);clearTimeout(job.timer);send(job.res,status,value);}
function next(engine) {
 const lane=lanes.get(engine),{foreground,background}=lane;
 while(foreground.length || background.length) {
  const list=foreground.length && (lane.foregroundRun<8 || !background.length)?foreground:background;
  const job=list.shift(),id=job.uuidhm;
  if(jobs.get(job.key)!==job || job.dispatched)continue;
  if(skipped.has(id.split('-')[0])) {finish(job,410,{uuidhm:id,error:'Game ended'});continue;}
  if(list===foreground)lane.foregroundRun++;else lane.foregroundRun=0;
  job.dispatched=true;return job;
 }
}
function dispatch() {
 for(const worker of workers) {
  const job=next(worker.engine);if(!job)continue;
  workers.delete(worker);clearTimeout(worker.timer);send(worker.res,200,job.sf);
 }
}
const server=http.createServer((req,res)=>{
 const route=new URL(req.url,'http://localhost').pathname;
 if(route==='/health') {
  const queue=[...lanes.values()].reduce((total,lane)=>total+lane.foreground.length+lane.background.length,0);
  return send(res,200,{status:'ok',queue,outstanding:jobs.size});
 }
 if(stopping)return send(res,503,{error:'Queue restarting'});
 let engine;
 try {engine=parseEngine(req.headers.engine);}catch(error){return send(res,400,{error:error.message});}
 if(route==='/lpush' || route==='/rpush') {
  let job;
  try {job=parseJob(req.headers.sf || '');}catch(error){return send(res,400,{error:error.message});}
  const key=engine+':'+job.uuidhm;
  if(jobs.has(key))return send(res,409,{error:'Duplicate engine request'});
  if(jobs.size>=maxJobs)return send(res,429,{error:'Engine queue is full'});
  const entry={key,uuidhm:job.uuidhm,sf:req.headers.sf,res,dispatched:false};
  entry.timer=setTimeout(()=>finish(entry,504,{uuidhm:job.uuidhm,error:'Engine request expired'}),route==='/lpush'?11000:100000);
  jobs.set(key,entry);
  res.on('close',()=>{if(jobs.get(key)===entry){clearTimeout(entry.timer);jobs.delete(key);}});
  const lane=lanes.get(engine);
  (route==='/lpush'?lane.foreground:lane.background).push(entry);dispatch();return;
 }
 if(route==='/lpop') {
  const job=next(engine);if(job)return send(res,200,job.sf);
  if(workers.size>=128)return send(res,429,'Too many engine workers');
  const worker={res,engine};worker.timer=setTimeout(()=>{workers.delete(worker);send(res,404,'');},1000);
  workers.add(worker);res.on('close',()=>{clearTimeout(worker.timer);workers.delete(worker);});return;
 }
 if(route==='/set') {
  const id=req.headers.uuidhm;
  if(!/^[a-zA-Z0-9-]{1,128}$/.test(id || ''))return send(res,400,'Invalid identifier');
  const job=jobs.get(engine+':'+id);
  if(!job)return send(res,200,''); // Expired or unrelated results are discarded.
  if(!job.dispatched)return send(res,409,{error:'Result does not match the dispatched engine request'});
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
  finish(job,result.error?502:200,{...result,engine});return send(res,200,'');
 }
 if(route==='/spush') {skipped.set(req.headers.fg,Date.now());return send(res,200,'');}
 send(res,404,'Not found');
});
const cleanup=setInterval(()=>{
 for(const [id,time] of skipped)if(Date.now()-time>120000)skipped.delete(id);
 // Compact expired/cancelled IDs, even when no worker is connected.
 for(const {foreground,background} of lanes.values()) {
  for(const list of [foreground,background])for(let i=list.length-1;i>=0;i--)if(jobs.get(list[i].key)!==list[i])list.splice(i,1);
 }
},1000);cleanup.unref();
server.listen(Number(process.env.PORT || 8092),process.env.QUEUE_BIND || '127.0.0.1');
function shutdown(){if(stopping)return;stopping=true;clearInterval(cleanup);for(const job of jobs.values())finish(job,503,{uuidhm:job.uuidhm,error:'Queue restarting'});for(const worker of workers){clearTimeout(worker.timer);send(worker.res,503,'');}workers.clear();server.close(()=>process.exit(0));}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
