const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const {normalize}=require('../../shared/ui-preferences');
test('preferences validate every sound event independently and clamp numeric limits',()=>{
 const p=normalize({board:'invalid',pieces:'sculpted',slide:-50,volume:1000,sound:'midnight',events:{move:'off',capture:'ivory',start:'evil'},admin:true});
 assert.equal(p.board,'auto');assert.equal(p.slide,0);assert.equal(p.volume,100);assert.equal(p.pieces,'sculpted');
 assert.equal(p.events.move,'off');assert.equal(p.events.capture,'ivory');assert.equal(p.events.start,'theme');assert.equal(p.admin,undefined);
 assert.deepEqual(normalize(null),normalize({}));
});
test('account sound settings and guest sound settings persist separately',async()=>{
 const source=fs.readFileSync(require.resolve('../server'),'utf8'),handler=source.slice(source.indexOf('async function handleUiPreferences('));
 const accounts=new Map(),guests=new Map();
 const context={require:name=>{assert.equal(name,'../shared/ui-preferences');return {normalize};},console,
  lobbyDb:{query:async(sql,args)=>{if(sql.startsWith('UPDATE')){accounts.set(args[1],JSON.parse(args[0]));return {};}return {rows:[{ui_preferences:accounts.get(args[0]) || {}}]};}},
  redis:{get:async key=>guests.get(key),set:async(key,value)=>guests.set(key,value)},readLobbyJson:async req=>req.body};
 vm.createContext(context);vm.runInContext(handler,context);
 async function request(method,user,body,session='a'.repeat(32)) {
  let data,status;
  await context.handleUiPreferences({method,body,headers:{cookie:'s='+session}},{writeHead:code=>status=code,end:value=>data=JSON.parse(value)}, {},[null,user]);
  assert.equal(status,200);return data;
 }
 await request('POST','1',{sound:'ivory',events:{capture:'midnight',move:'off'},slide:0});
 await request('POST','2',{sound:'midnight',events:{capture:'off'}});
 await request('POST','0',{muted:true},'b'.repeat(32));
 const one=await request('GET','1'),two=await request('GET','2'),guest=await request('GET','0',null,'b'.repeat(32));
 assert.equal(one.preferences.events.capture,'midnight');assert.equal(one.preferences.events.move,'off');assert.equal(one.preferences.slide,0);
 assert.equal(two.preferences.events.capture,'off');assert.equal(guest.preferences.muted,true);assert.equal(one.preferences.muted,false);
 assert.equal(one.account,true);assert.equal(guest.account,false);
});
test('browser rules preserve start-position move counts and special-move FENs',()=>{
 const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../src/chess-rules.js'),'utf8'),context);
 const initial='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
 function perft(f,d){return d?context.mg(f).reduce((sum,m)=>sum+perft(context.ucifen(m,f,context.boardgen(f),{}).f,d-1),0):1;}
 assert.equal(perft(initial,3),8902);
 assert.equal(context.ucifen('e1g1','r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',0).b.f1.p,'r');
 assert.equal(context.ucifen('e5d6','4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1',0).b.d5.p,' ');
});
