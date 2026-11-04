const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(require.resolve('../server'),'utf8');
function context(extra){return vm.createContext({console,Map,Set,Date,...extra});}
test('pending status distinguishes expired challenges, starting games and confirmed live games',async()=>{
 let game={started:null,finished:null,state:null,userid2:null,sessionid2:null},live=false,lease=false;
 const c=context({lobbyDb:{query:async()=>({rows:[game]})},lobbyError:(status,message)=>Object.assign(new Error(message),{status}),lobbyIndex:{read:async()=>new Map(live?[['abcdef123',{}]]:[]),openIds:async()=>new Set(lease?['abcdef123']:[])}});
 vm.runInContext(source.slice(source.indexOf('async function lobbyGameStatus('),source.indexOf('function handleLobbyStatus(')),c);
 assert.equal((await c.lobbyGameStatus('abcdef123')).expired,true);
 lease=true;assert.equal((await c.lobbyGameStatus('abcdef123')).finished,false);
 game={...game,started:new Date(),sessionid2:'joining'};
 assert.equal((await c.lobbyGameStatus('abcdef123')).started,false);
 live=true;assert.equal((await c.lobbyGameStatus('abcdef123')).started,true);
 game.finished=new Date();assert.equal((await c.lobbyGameStatus('abcdef123')).finished,true);
});
test('watch action rejects historical SQL-active games without a live snapshot',async()=>{
 const c=context({validLobbyId:()=>true,lobbyDb:{query:async()=>({rows:[{gameid:'abcdef123',started:new Date(),finished:null,state:0}]})},lobbyIndex:{read:async()=>new Map()},lobbyError:(status,message)=>Object.assign(new Error(message),{status})});
 vm.runInContext(source.slice(source.indexOf('async function joinLobbyGame('),source.indexOf('function handleLobbyCreate(')),c);
 await assert.rejects(c.joinLobbyGame({id:1,action:'watch'},{},[]),{status:410});
});

test('joining again cannot resume a lost game through a stale invitation',async()=>{
 const c=context({validLobbyId:()=>true,lobbyDb:{query:async()=>({rows:[{gameid:'abcdef123',started:new Date(),finished:null,state:0,sessionid2:'joining'}]})},lobbyIndex:{read:async()=>new Map()},lobbyError:(status,message)=>Object.assign(new Error(message),{status})});
 vm.runInContext(source.slice(source.indexOf('async function joinLobbyGame('),source.indexOf('function handleLobbyCreate(')),c);
 await assert.rejects(c.joinLobbyGame({id:1,action:'join'},{headers:{cookie:'s=joining'}},[]),{status:410});
});
