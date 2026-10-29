const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const { rankRegions, configuredRegions } = require('../game-regions');
const createStarts = require('../game-starts');
const regions=[{id:'ws0',enabled:true},{id:'ws1',enabled:true},{id:'ws2',enabled:true}];
test('placement balances worst ping and disparity instead of preferring an equally slow region',()=>{
  const ranked=rankRegions(regions,{ws0:20,ws1:85,ws2:300},{ws0:160,ws1:95,ws2:300});
  assert.deepEqual(ranked.map(r=>r.id),['ws1','ws0','ws2']);
});
test('bot games choose human latency, stale/missing measurements rank last, disabled nodes are excluded',()=>{
  assert.equal(rankRegions(regions,{ws0:50,ws1:15},{},true)[0].id,'ws1');
  assert.equal(rankRegions(regions,{ws0:20,ws1:10},{ws0:30})[0].id,'ws0');
  assert.equal(rankRegions([{id:'ws1',enabled:false},regions[0]],{ws0:40,ws1:5},{ws0:45,ws1:5}).length,1);
});
test('single-server configuration remains compatible and invalid region IDs fail early',()=>{
  assert.equal(configuredRegions({web:{},game:{serverName:'ws0'},engine:{gameHost:'ws0.chessil.com'}})[0].id,'ws0');
  assert.throws(()=>configuredRegions({web:{gameServers:[{id:'../../evil'}]}}));
});
test('failed initialization stays queued, then retry finishes without changing game identity',async()=>{
  const task={payload:{gameid:'abcdef123',region:{id:'ws1'},time:{minutes:5,increment:0}},creatorId:'1',userId:'2',rated:true,whiteIsPlayer1:true,rating1:1500,rating2:1600};
  let leased=false,deleted=false,attempts=0,notifications=[];
  const db={query:async(sql,args)=>{
    if(sql.includes('RETURNING payload')) {if(leased||deleted)return {rows:[]};leased=true;return {rows:[{payload:task}]};}
    if(sql.includes('lease_until=NULL'))leased=false;
    if(sql.startsWith('DELETE'))deleted=true;
    return {rows:[],rowCount:1};
  }};
  const worker=createStarts({db,start:(payload,done)=>{assert.equal(payload.gameid,'abcdef123');done(++attempts===1?new Error('lost reply'):null);},notify:()=>{},publish:(id,message)=>notifications.push([id,message])});
  try {assert.equal(await worker.run('abcdef123'),false);assert.equal(deleted,false);assert.equal(await worker.run('abcdef123'),true);assert.equal(deleted,true);assert.equal(notifications[0][1].server,'ws1');assert.equal(await worker.run('abcdef123'),false);} finally {worker.stop();}
});
test('one worker owns initialization while another request is trying the same game',async()=>{
  let leased=false,finish;
  const db={query:async sql=>{if(sql.includes('RETURNING payload')){if(leased)return {rows:[]};leased=true;return {rows:[{payload:{payload:{region:{id:'ws0'},time:{}},creatorId:1,userId:2}}]};}return {rows:[]};}};
  const worker=createStarts({db,start:(_,done)=>finish=done,notify:()=>{},publish:()=>{}});
  try {const first=worker.run('abcdef123');await new Promise(setImmediate);assert.equal(await worker.run('abcdef123'),false);finish(null);assert.equal(await first,true);}finally{worker.stop();}
});
test('Easy Game null rating limits remain unbounded in the database query',async()=>{
 const source=fs.readFileSync(require.resolve('../server'),'utf8');
 const handler=source.slice(source.indexOf('function handleEasyBots('),source.indexOf('function handleEasyStart('));
 let limits;
 const context={pg:{Client:class{connect(){}end(){}query(sql,args,done){limits=args;done(null,{rows:[{id:1}]});}}},conString:'',normalizeTimeControl:()=> '5+0',console};
 vm.createContext(context);vm.runInContext(handler,context);
 const events={};context.handleEasyBots(null,null,null,{writeHead(){},end(){}},{on:(name,fn)=>events[name]=fn},null,[]);
 events.data(JSON.stringify({eloMin:null,eloMax:null}));events.end();
 assert.equal(limits[0],null);assert.equal(limits[1],null);
});
