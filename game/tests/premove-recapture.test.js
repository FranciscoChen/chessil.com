const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {spawn}=require('node:child_process'),{once}=require('node:events'),Redis=require('ioredis');
test('server executes a queued recapture only after the own piece is captured',async()=>{
 const socket='/tmp/chessil-recapture-'+process.pid+'.sock',child=spawn('redis-server',['--port','0','--unixsocket',socket,'--save','','--appendonly','no']);let redis;
 await new Promise((resolve,reject)=>{child.on('error',reject);child.stdout.on('data',d=>{if(d.toString().includes('ready to accept connections'))resolve();});});
 try{
 redis=new Redis(socket);const rules={};vm.createContext(rules);vm.runInContext(fs.readFileSync(require.resolve('../../web/src/chess-rules.js'),'utf8'),rules);
 const history='e2e4 d7d5 e4e5 f7f6 g1f3',fen=rules.ucifen(history).f;
 const handler=require('../moves')({redis,movegen:{generate:(f,done)=>done(null,rules.mg(f).join(' '))},broadcastGameUpdate(){},requestBotMove(){},checkgame(){},persistFinishedGame:async()=>{},finishgame(){},aborttimer:14000,timeback:2,lagCompensationPercent:.5,lagCompensationLimitMilliseconds:150,timeoutKeyAbort:'abort',timeoutKeyFinish:'finish'});
 async function seed(id){await redis.hset(id,{f:0,m:history,i:'300000 300000 300000 300000 300000',t:'b',j:rules.mg(fen).join(' '),l:300000,n:300000,o:0,z:0,q:'f3e5',r:'',s:Date.now()});}
 await seed('recapture');await handler('recapture','b','f6e5');
 assert.equal(await redis.hget('recapture','m'),history+' f6e5 f3e5');assert.equal(await redis.hget('recapture','pm'),'01');assert.equal(await redis.hget('recapture','q'),'');
 await seed('noCapture');await handler('noCapture','b','b8c6');
 assert.equal(await redis.hget('noCapture','m'),history+' b8c6');assert.equal(await redis.hget('noCapture','q'),'');
 }finally{redis?.disconnect();child.kill('SIGTERM');await once(child,'exit');}
});
