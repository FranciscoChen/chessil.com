const test=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{once}=require('node:events');
const http=require('node:http');
const {settings,thinkTime}=require('../bots/swift');
const {parseJob}=require('../sf');
const Stockfish=require('../stockfish-process');
test('eight levels are distinct, bounded profiles; invalid inputs fail',()=>{
 assert.equal(new Set(Array.from({length:8},(_,i)=>settings(i+1).skill)).size,8);
 for(let level=1;level<=8;level++){const p=settings(level);assert.equal(p.mtime,6);assert.equal(p.nodes,2048);assert.equal(p.syzygy,0);}
 assert.throws(()=>settings(0));assert.throws(()=>settings(9));assert.throws(()=>settings(1.5));
 assert.equal(parseJob('abcdef123-bot-0-w 300000 300000 0 0 6 0 0 bot:swift:3 e2e4 e7e5').difficulty,3);
 assert.throws(()=>parseJob('abcdef123-bot-0-w 300000 300000 0 0 6 0 0 bot:swift:9'));
});
test('pacing fits the clock and does not consume the entire game budget',()=>{
 assert.equal(thinkTime({remaining:300000,increment:0,plies:0}),7500);
 assert.equal(thinkTime({remaining:90,increment:1000,plies:80}),0);
 assert.ok(thinkTime({remaining:1000,increment:2000,plies:50})<=120);
});
test('real Stockfish produces moves at every level with a bounded search',async()=>{
 const engine=new Stockfish();try {
  await engine.initialize();
  for(let level=1;level<=8;level++){
   const result=await engine.analyse({uuidhm:'abcdef123-bot-0-w',wtime:300000,btime:300000,winc:0,binc:0,moves:'',...settings(level)});
   assert.match(result.bestmove,/^[a-h][1-8][a-h][1-8][qrbn]?$/);
   assert.ok(result.analysis?.nodes<5000,'node cap bounded search work');
  }
 }finally{engine.close();}
});
function request(port,path,headers={}) {return new Promise((resolve,reject)=>{const req=http.get({hostname:'127.0.0.1',port,path,headers},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,body}));});req.on('error',reject);req.setTimeout(5000,()=>req.destroy(new Error('test request timeout')));});}
test('real queue and persistent worker serve simultaneous bot requests',async()=>{
 const port=19000+Math.floor(Math.random()*1000),env={...process.env,PORT:String(port),QUEUE_PORT:String(port)};
 const queue=spawn(process.execPath,[require.resolve('../queue')],{env,stdio:'ignore'});let worker;
 try {
  for(let i=0;i<100;i++){try{if((await request(port,'/health')).status===200)break;}catch{}await new Promise(r=>setTimeout(r,20));}
  worker=spawn(process.execPath,[require.resolve('../sf')],{env,stdio:'ignore'});
  const started=Date.now();
  const results=await Promise.all(Array.from({length:30},(_,i)=>request(port,'/lpush',{sf:`test${String(i).padStart(5,'0')}-bot-0-w 300000 300000 0 0 6 0 0 bot:swift:${i%8+1}`})));
  for(const result of results){assert.equal(result.status,200,result.body);assert.match(JSON.parse(result.body).bestmove,/^[a-h][1-8][a-h][1-8][qrbn]?$/);}
  console.log('Thirty queued bot moves, including engine startup:',Date.now()-started,'ms');
 }finally {
  if(worker){worker.kill('SIGTERM');await once(worker,'exit');}queue.kill('SIGTERM');await once(queue,'exit');
 }
});
