const {randomBytes}=require('crypto');
const requests='game:bot:requests', ready='game:bot:ready';
const fields=['botProgram','botDifficulty','botSide','bw','bb','f','t','m','l','n','o','z','s','j','botReadyMove','botReadyExpected'];
const releaseLua="if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0";
// One scheduler per process, shared durable queues per regional Redis. No sleeping engine workers.
module.exports=function createBots({redis,request,move,now=Date.now,pollMs=100}) {
 let preparing=false,delivering=false,closed=false;
 async function enqueue(gameid) {await redis.zadd(requests,'NX',now(),gameid);}
 async function own(gameid,fn) {
  const key='game:bot:pending:'+gameid,token=randomBytes(16).toString('hex');
  if(await redis.set(key,token,'NX','PX',30000)!=='OK')return;
  try {await fn();} finally {await redis.eval(releaseLua,1,key,token);}
 }
 async function state(gameid) {
  const values=await redis.hmget(gameid,...fields);
  return Object.fromEntries(fields.map((field,i)=>[field,values[i]]));
 }
 async function prepare(gameid) {
  return own(gameid,async()=>{
   const s=await state(gameid),side=s.t;
   const builtin=s.botProgram==='swift' && s.botSide===side;
   const elo=Number.parseInt(side==='w'?s.bw:s.bb,10);
   if(s.f!=='0' || (!builtin && !Number.isFinite(elo))) {await redis.zrem(requests,gameid);return;}
   if(s.botReadyMove && s.botReadyExpected===s.m) {await redis.zrem(requests,gameid);return;}
   // A worker crash leaves the request recoverable after this lease deadline.
   await redis.zadd(requests,now()+15000,gameid);
   const plies=s.m?s.m.split(' ').length:0,started=Number(s.s)>0?Number(s.s):now();
   const uuidhm=gameid+'-bot-'+plies+'-'+randomBytes(8).toString('hex')+'-'+side;
   try {
    const result=await request({gameid,uuidhm,moves:s.m || '',wtime:Number(s.l),btime:Number(s.n),winc:Number(s.o),binc:Number(s.z),turn:side,
     ...(builtin?{bot:'swift',difficulty:Number(s.botDifficulty)}:{elo})});
    if(result.uuidhm!==uuidhm || !(s.j || '').split(' ').includes(result.bestmove))throw new Error('Invalid bot response');
    const delay=builtin?Number(result.bot?.thinkTimeMs):0;
    if(!Number.isFinite(delay) || delay<0 || delay>8000)throw new Error('Invalid bot pacing');
    const due=Math.max(now(),started+delay);
    await redis.eval(`
      if redis.call('HGET',KEYS[1],'f') ~= '0' or redis.call('HGET',KEYS[1],'m') ~= ARGV[1]
        or redis.call('HGET',KEYS[1],'t') ~= ARGV[2] then redis.call('ZREM',KEYS[2],KEYS[1]); return 0 end
      redis.call('HSET',KEYS[1],'botReadyMove',ARGV[3],'botReadyExpected',ARGV[1],'botReadySide',ARGV[2])
      redis.call('ZADD',KEYS[3],ARGV[4],KEYS[1]);redis.call('ZREM',KEYS[2],KEYS[1]);return 1`,
      3,gameid,requests,ready,s.m || '',side,result.bestmove,due);
   } catch(error) {await redis.zadd(requests,now()+1000,gameid);console.error('Bot search deferred:',gameid,error.message);}
  });
 }
 async function deliver(gameid) {
  return own(gameid,async()=>{
   const s=await state(gameid),side=await redis.hget(gameid,'botReadySide');
   if(s.f!=='0' || !s.botReadyMove || s.m!==s.botReadyExpected || s.t!==side) {await redis.zrem(ready,gameid);return;}
   await move(gameid,side,s.botReadyMove,{expectedMoves:s.m,send(){},terminate(){}});
   const next=await redis.hmget(gameid,'m','f');
   if(next[0]!==s.m || next[1]!=='0') {
    await redis.zrem(ready,gameid);
    await enqueue(gameid);
   } else await redis.zadd(ready,now()+250,gameid);
  });
 }
 async function tickReady() {
  if(delivering || closed)return;delivering=true;
  try {const due=await redis.zrangebyscore(ready,'-inf',now(),'LIMIT',0,16);await Promise.all(due.map(deliver));}
  catch(error){console.error('Bot delivery:',error.message);}finally{delivering=false;}
 }
 async function tickRequests() {
  if(preparing || closed)return;preparing=true;
  try {const pending=await redis.zrangebyscore(requests,'-inf',now(),'LIMIT',0,8);await Promise.all(pending.map(prepare));}
  catch(error){console.error('Bot scheduler:',error.message);}finally{preparing=false;}
 }
 const tick=()=>Promise.all([tickReady(),tickRequests()]);
 const timer=setInterval(()=>{tickReady();tickRequests();},pollMs);timer.unref();
 return {enqueue,tick,close(){closed=true;clearInterval(timer);}};
};
