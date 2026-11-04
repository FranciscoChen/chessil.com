const test=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{once}=require('node:events');
const Redis=require('ioredis'),live=require('../../shared/live-games');
const publisher=require('../live-games'),index=require('../../web/lobby-index');
test('live registry and challenge leases with real Redis',async t=>{
 const socket='/tmp/chessil-live-'+process.pid+'.sock';
 const child=spawn('redis-server',['--port','0','--unixsocket',socket,'--save','','--appendonly','no']);
 await new Promise((resolve,reject)=>{child.on('error',reject);child.stdout.on('data',data=>{if(data.toString().includes('ready to accept connections'))resolve();});});
 const redis=new Redis(socket);await once(redis,'ready');let registry,service;
 try {
  await t.test('snapshots expire, older publishers cannot overwrite newer data, ended games disappear',async()=>{
   const game={gameid:'testlive1',plies:0};
   await live.publish(redis,'test',[game],1000);
   assert.equal((await live.read(redis,['testlive1'])).size,1);
   await live.publish(redis,'test',[{...game,plies:2}],2000);
   await live.publish(redis,'test',[game],1500);
   assert.equal((await live.read(redis,['testlive1'])).get('testlive1').plies,2);
   await redis.pexpire('lobby:game:testlive1',1);await new Promise(resolve=>setTimeout(resolve,5));
   assert.equal((await live.read(redis,['testlive1'])).size,0);
   await live.publish(redis,'test',[game],3000);await live.publish(redis,'test',[],4000);
   assert.equal((await live.read(redis,['testlive1'])).size,0);
   assert.equal(await redis.zscore('lobby:live','testlive1'),null);
  });
  await t.test('regional recovery restores deadlines without resetting them and excludes finished games',async()=>{
   await redis.flushdb();
   await redis.hset('testlive2',{f:0,m:'e2e4 e7e5',t:'w',l:300000,n:299000,s:Date.now()});
   await redis.hset('testlive3',{f:7,m:'',t:'w'});
   await redis.zadd('game:timeouts:finish',42,'testlive2');
   service=publisher({redis,central:redis,region:'test',intervalMs:1000000});
   await service.tick();
   const games=await live.read(redis);
   assert.equal(games.size,1);assert.equal(games.get('testlive2').plies,2);
   assert.equal(await redis.zscore('game:timeouts:finish','testlive2'),'42');
   assert.equal(await redis.sismember('game:active','testlive3'),0);
   await redis.hset('testlive2','f',7);await service.tick();
   assert.equal((await live.read(redis)).size,0);service.close();
  });
  await t.test('only a challenge owner can renew; expired challenges cannot be resurrected; events reach subscribers',async()=>{
   let events=0;
   registry=index({client:redis,db:{query:async()=>({rows:[],rowCount:0})},notify(){}});
   registry.subscribe(()=>events++);
   await new Promise(resolve=>setTimeout(resolve,30));
   await registry.open('challenge',0,'owner');
   assert.equal(await registry.renew('challenge',0,'someone-else'),false);
   assert.equal(await registry.renew('challenge',0,'owner'),true);
   assert.ok((await registry.openIds(['challenge'])).has('challenge'));
   await redis.pexpire('lobby:challenge:challenge',1);await new Promise(resolve=>setTimeout(resolve,10));
   assert.equal(await registry.renew('challenge',0,'owner'),false);
   assert.equal((await registry.openIds(['challenge'])).size,0);
   assert.ok(events>0);
  });
 }finally{registry?.stop();service?.close();redis.disconnect();child.kill('SIGTERM');await once(child,'exit');}
});
