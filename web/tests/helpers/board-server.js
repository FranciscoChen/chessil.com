// Local browser verification fixture. Production assets and protocol, isolated games/preferences.
const http=require('http'),fs=require('fs'),path=require('path'),vm=require('vm');
const {WebSocketServer}=require('ws');
const render=require('../../render-page'),{normalize}=require('../../../shared/ui-preferences');
module.exports=async()=>{
 const rules={};vm.createContext(rules);vm.runInContext(fs.readFileSync(path.join(__dirname,'../../src/chess-rules.js'),'utf8'),rules);
 let preferences=normalize(),saves=0;
 const game={id:'verify001',history:[],state:0,events:'',times:[],side:'w',sockets:new Set()};
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost'),chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks).toString();
  const send=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
  if(url.pathname==='/preferences'){if(req.method==='POST'){preferences=normalize(JSON.parse(body));saves++;}return send({preferences,account:true});}
  if(url.pathname==='/game-servers')return send([{id:'ws0',url:'ws://127.0.0.1:'+server.address().port+'/ping',enabled:true}]);
  if(url.pathname==='/loggedin')return send(1);
  if(url.pathname==='/gameinfo')return send({username1:'You',username2:'Opponent',rating1:1500,rating2:1500,initialtime:5,increment:0,rated:false,state:game.state,side:game.side,gameserver:'ws0'});
  if(url.pathname==='/gamestate')return send({m:game.history.join(' '),c:game.times.join(' '),e:game.events,d:'',t:300000,u:300000});
  if(url.pathname==='/board-harness'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="en" data-theme="light"><head><link rel="stylesheet" href="/css/design-system.css"><link rel="stylesheet" href="/css/board.min.css"><link rel="stylesheet" href="/css/preferences.min.css"><script src="/js/preferences.min.js"></script><script src="/js/game.min.js"></script></head><body><div class="game-page"><div style="position:relative;width:480px;height:480px"><cg-board id="harness"></cg-board></div></div></body></html>');return;}
  let file=url.pathname.startsWith('/game/')?'/en/play/index.html':url.pathname;
  if(!path.extname(file))file+='/index.html';
  try {const actual=path.join(__dirname,'../../web',file);let data=fs.readFileSync(actual);const ext=path.extname(file);if(ext==='.html')data=render(data,'en','l');res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'})[ext] || 'application/octet-stream');res.end(data);}catch(_){res.statusCode=404;res.end('Not found');}
 });
 const wss=new WebSocketServer({server});
 function broadcast(message){for(const socket of game.sockets)if(socket.readyState===1)socket.send(message);}
 function move(move) {
  const pos=rules.ucifen(game.history.join(' ')),side=pos.f.split(' ')[1];
  if(!rules.mg(pos.f).includes(move))throw new Error('Illegal fixture move: '+move);
  game.history.push(move);game.times.push(299000);broadcast('m:'+move+':'+side+':299000:'+game.history.length+':'+Date.now());
 }
 wss.on('connection',(socket,req)=>{
  if(req.url==='/ping'){socket.send('a');socket.on('message',()=>socket.close());return;}
  if(req.url==='/notify')return;
  game.sockets.add(socket);socket.on('close',()=>game.sockets.delete(socket));
  socket.on('message',raw=>{
   const message=raw.toString();
   if(message==='s')for(const packet of ['z'+game.side,'s'+Date.now(),'l300000','n300000','m'+game.history.join(' '),'i'+game.times.join(' '),'e'+game.events,'k','f'+game.state])socket.send(packet);
   else if(message[0]==='m')move(message.slice(1));
   else if(message[0]==='p')socket.send(message);
   else if(message==='e1'){game.events=game.side+'1';game.state=7;broadcast('e:1:'+game.side+':'+Date.now()+':7');}
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const heartbeat=setInterval(()=>broadcast('1'),3000);
 return {url:'http://127.0.0.1:'+server.address().port,game,move,broadcast,get preferences(){return preferences;},get saves(){return saves;},
  async close(){clearInterval(heartbeat);for(const socket of wss.clients)socket.terminate();await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}};
};
