const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const Redis=require('ioredis');
test('real Redis initialization handles duplicate requests without resetting moved positions or clocks',async()=>{
 const socket='/tmp/chessil-redis-'+process.pid+'.sock';
 const processRedis=spawn('redis-server',['--port','0','--unixsocket',socket,'--save','','--appendonly','no'],{stdio:['ignore','pipe','pipe']});
 let redis;
 try {
  await new Promise((resolve,reject)=>{processRedis.on('error',reject);processRedis.stdout.on('data',chunk=>{if(chunk.toString().includes('ready to accept connections'))resolve();});setTimeout(()=>reject(new Error('Redis startup timeout')),3000).unref();});
  redis=new Redis(socket);
  const source=fs.readFileSync(require.resolve('../../game/gameserver'),'utf8');
  const part=source.slice(source.indexOf('const entries = Object.entries(gameData).flat();'));
  const lua=part.match(/redis\.eval\(`([\s\S]*?)`, 1, r.gn/)[1];
  const args=['creationKey','immutable-payload','m','','l','300000'];
  assert.deepEqual((await Promise.all([redis.eval(lua,1,'abcdef123',...args),redis.eval(lua,1,'abcdef123',...args)])).sort(),[1,2]);
  await redis.hset('abcdef123','m','e2e4','l','290000');
  assert.equal(await redis.eval(lua,1,'abcdef123',...args),2);
  assert.equal(await redis.hget('abcdef123','m'),'e2e4');
  assert.equal(await redis.hget('abcdef123','l'),'290000');
  assert.equal(await redis.eval(lua,1,'abcdef123','creationKey','different-players','m',''),0);
 } finally {if(redis)redis.disconnect();processRedis.kill('SIGTERM');await once(processRedis,'exit');try{fs.unlinkSync(socket)}catch{}}
});
