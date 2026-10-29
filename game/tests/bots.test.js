const test=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{once}=require('node:events');
const Redis=require('ioredis');
const createBots=require('../bots');
test('bot scheduler with real Redis',async t=>{
let child,redis;
 const socket='/tmp/chessil-bots-'+process.pid+'.sock';
 child=spawn('redis-server',['--port','0','--unixsocket',socket,'--save','','--appendonly','no'],{stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{child.on('error',reject);child.stdout.on('data',c=>{if(c.toString().includes('ready to accept connections'))resolve();});});
 redis=new Redis(socket);

try {
async function game(id,extra={}) {await redis.hset(id,{botProgram:'swift',botDifficulty:3,botSide:'w',f:0,t:'w',m:'',l:300000,n:300000,o:0,z:0,s:0,j:'e2e4 d2d4',...extra});}
await t.test('search finishes once; move waits without a worker, survives restart, and stale/resigned games cannot move',async()=>{
 const id='abcdef123';await game(id);let time=100000,searches=0,moves=[];
 const options={redis,now:()=>time,pollMs:1000000,request:async p=>{searches++;return {uuidhm:p.uuidhm,bestmove:'e2e4',bot:{thinkTimeMs:4000}};},move:async(...args)=>{moves.push(args);await redis.hset(id,'m','e2e4','t','b');}};
 let bots=createBots(options);
 try {
  await bots.enqueue(id);await bots.tick();assert.equal(searches,1);assert.equal(moves.length,0);
  time+=3999;await bots.tick();assert.equal(moves.length,0);
  bots.close();bots=createBots(options);time++;await bots.tick();assert.equal(moves.length,1);assert.equal(searches,1);
  assert.equal(moves[0][3].expectedMoves,'');
  const resigned='abcdef124';await game(resigned);await bots.enqueue(resigned);await bots.tick();await redis.hset(resigned,'f','7');time+=5000;await bots.tick();assert.equal(moves.length,1);
 }finally{bots.close();}
});
await t.test('two service instances share a search lease',async()=>{
 const id='abcdef125';await game(id);let searches=0;
 const options={redis,now:()=>200000,pollMs:1000000,request:async p=>{searches++;await new Promise(r=>setTimeout(r,20));return {uuidhm:p.uuidhm,bestmove:'e2e4',bot:{thinkTimeMs:2000}};},move:async()=>{}};
 const one=createBots(options),two=createBots(options);
 try{await one.enqueue(id);await Promise.all([one.tick(),two.tick()]);assert.equal(searches,1);}finally{one.close();two.close();}
});
await t.test('delayed bot moves use normal elapsed game-clock time',async()=>{
 await redis.flushdb();const id='abcdef126',start=Date.now()-3000;
 await game(id,{m:'e2e4 e7e5',j:'g1f3',s:start,l:30000,n:30000,i:'30000 30000',q:'',r:''});
 const move=require('../moves')({redis,movegen:{generate:(fen,done)=>done(null,'b8c6')},broadcastGameUpdate(){},requestBotMove(){},checkgame(){},persistFinishedGame:async()=>{},finishgame(){},aborttimer:14000,timeback:2,lagCompensationPercent:.5,lagCompensationLimitMilliseconds:150,timeoutKeyAbort:'abort',timeoutKeyFinish:'finish'});
 const bots=createBots({redis,pollMs:1000000,request:async p=>({uuidhm:p.uuidhm,bestmove:'g1f3',bot:{thinkTimeMs:3000}}),move});
 try{await bots.enqueue(id);await bots.tick();await bots.tick();assert.equal(await redis.hget(id,'m'),'e2e4 e7e5 g1f3');assert.ok(Number(await redis.hget(id,'l'))<28000);assert.equal(await redis.hget(id,'pm'),'0');}finally{bots.close();}
});

} finally {redis?.disconnect();child?.kill('SIGTERM');if(child)await once(child,'exit');}
});
