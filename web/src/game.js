/* Game controller: owns authoritative history, clocks and protocol handling.
 * The view receives snapshots; it never mutates a position on pointer input.
 * Pure notation/rules are in chess-rules.js; sound/preferences are independent. */
var INITIAL_FEN='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// These names are the small compatibility interface consumed by gamepage.js.
var wsc,gameConnectionReady=false,gamefinished=false,stat=-1,playerside='w',watcher=true;
var fen=INITIAL_FEN,board=boardgen(INITIAL_FEN),moves=mg(INITIAL_FEN),turn='w',uci=[],events=[],eventstimes=[];
var clock={w:0,b:0},lastmovetime=0,clocktick,a1ti=0,allmovetimes=[];
var boardView,movesList,gameId,initialClock=0,snapshotReady=false,startSoundPlayed=false,lowClockPlayed=false,reconnectTimer,reconnectAttempts=0,disposed=false;
const gameDescriptions={
 en:['Playing','Checkmate','Stalemate','Insufficient material','Threefold repetition','50-move rule','Time out','Resigned','Draw agreed','Game canceled'],
 es:['En curso','Jaque mate','Ahogado','Material insuficiente','Triple repetición','Regla de 50 movimientos','Tiempo agotado','Rendición','Tablas acordadas','Partida cancelada'],
 zh:['进行中','将死','逼和','子力不足','三次重复','50步规则','超时','认输','协议和棋','对局已取消']
};
function msToTime(value) {
 const ms=Math.max(0,Number(value)||0),seconds=Math.floor(ms/1000),minutes=Math.floor(seconds/60);
 const label=String(minutes).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 return label+(ms<60000?'.'+Math.floor(ms%1000/100):'');
}
function sendGameMessage(message) {
 if(!wsc || wsc.readyState!==WebSocket.OPEN)return false;
 wsc.send(message);return true;
}
function updateGameUi(){if(typeof gameUiState==='function')gameUiState();}
function statusMessage(text) {const status=document.querySelector('[data-game-field="state"]');if(status)status.textContent=text;}
function paintClocks() {
 for(const side of ['w','b']) {
  const clockRuns=uci.length>=2 || document.querySelector('.setup').dataset.botSide===turn;
  const active=stat===0 && snapshotReady && clockRuns && side===turn && lastmovetime>0;
  const value=clock[side]-(active?Math.max(0,Date.now()-lastmovetime):0);
  const element=document.querySelector('.rclock-'+(side==='w'?'white':'black')+' .time');
  if(element)element.textContent=msToTime(value);
  if(active && side===playerside && !watcher && value>0 && value<=10000 && !lowClockPlayed){lowClockPlayed=true;ChessilSound.play('clock');}
 }
}
function appendNotation(move) {
 const side=fen.split(' ')[1],before=gensanbase(move,board,fen,moves);
 const position=ucifen(move,fen,boardgen(fen),{});
 fen=position.f;board=position.b;moves=mg(fen);turn=fen.split(' ')[1];
 if(side==='w'){const number=document.createElement('move-number');number.textContent=fen.split(' ')[5];movesList.append(number);}
 movesList.querySelector('.a1t')?.classList.remove('a1t');
 const entry=document.createElement('move-entry');entry.textContent=before+gensancheck(moves,fen);entry.setAttribute('ply',uci.length);entry.className='a1t';movesList.append(entry);
 a1ti=uci.length;
}
function loadHistory(history) {
 const list=history?history.trim().split(/\s+/):[];
 fen=INITIAL_FEN;board=boardgen(fen);moves=mg(fen);turn='w';uci=[];movesList.replaceChildren();
 for(const move of list){if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move))throw new Error('Invalid stored move');uci.push(move);appendNotation(move);}
 boardView.render(board,uci.at(-1)||'',false);a1ti=uci.length;
}
function receiveMove(raw) {
 const [move,side,remaining,plyString,timestamp,finished]=raw,ply=Number(plyString);
 if(ply<=uci.length)return; // Duplicate broadcasts are harmless.
 if(ply!==uci.length+1 || side!==turn || !moves.includes(move)) {
  // Re-subscribe to a complete snapshot instead of applying a partial history.
  snapshotReady=false;gameConnectionReady=false;sendGameMessage('s');return;
 }
 const from=move.slice(0,2),to=move.slice(2,4),capture=board[to].p!==' ' || (board[from].p==='p' && from[0]!==to[0]);
 uci.push(move);appendNotation(move);boardView.premove='';boardView.render(board,move,true);
 clock[side]=Number(remaining);allmovetimes.push(Number(remaining));lastmovetime=Number(timestamp);
 if(snapshotReady){if(ChessilPreferences.duration()>0)ChessilSound.play('slide');ChessilSound.play(capture?'capture':'move');if(incheck(fen))ChessilSound.play('check');}
 movesList.scrollTop=movesList.scrollHeight;paintClocks();
 if(Number(finished)>0)displayTermination(Number(finished),true);
}
function showResult(code) {
 movesList.querySelector('.result-wrap')?.remove();
 let result='½–½';
 if(code===9)result='—';
 if(code===1)result=turn==='w'?'0–1':'1–0';
 if(code===7){const resigned=events.at(-1)?.[0];result=resigned==='w'?'0–1':'1–0';}
 if(code===6){const material=turn==='w'?bpiececount(fen.split(' ')[0]):wpiececount(fen.split(' ')[0]);if(material>1)result=turn==='w'?'0–1':'1–0';}
 const wrapper=document.createElement('div'),label=document.createElement('p');wrapper.className='result-wrap';label.className='result';label.textContent=result;wrapper.append(label);movesList.append(wrapper);
}
function displayTermination(code,audible=false) {
 code=Number(code);if(gamefinished && stat===code)return;
 const active=stat===0 && snapshotReady;stat=code;gamefinished=code>0;
 if(!gamefinished)return;
 boardView.cancel();boardView.acknowledge();boardView.promotion?.close();clearInterval(clocktick);paintClocks();
 const status=document.querySelector('[data-game-field="state"]');status.dataset.state=String(code);status.textContent=(gameDescriptions[document.documentElement.lang] || gameDescriptions.en)[code] || 'Finished';
 showResult(code);if(active && audible)ChessilSound.play('end');updateGameUi();
}
function gamereplay(ply) {
 if(!gamefinished)return;
 a1ti=Math.max(0,Math.min(uci.length,ply));
 const position=ucifen(uci.slice(0,a1ti).join(' '));fen=position.f;board=position.b;moves=mg(fen);turn=fen.split(' ')[1];
 boardView.render(board,uci[a1ti-1] || '',false);
 movesList.querySelector('.a1t')?.classList.remove('a1t');movesList.querySelector(`[ply="${a1ti}"]`)?.classList.add('a1t');
 for(const side of ['w','b']) {
  const index=Array.from({length:a1ti},(_,i)=>i).reverse().find(i=>(i%2===0?'w':'b')===side);
  const value=a1ti===uci.length?clock[side]:index===undefined?initialClock:allmovetimes[index];
  document.querySelector('.rclock-'+(side==='w'?'white':'black')+' .time').textContent=msToTime(value);
 }
}
async function dbgame() {
 const response=await fetch('/gamestate',{method:'POST',body:gameId});if(!response.ok)throw new Error('History unavailable');
 const data=await response.json();loadHistory(data.m || '');allmovetimes=(data.c || '').split(' ').filter(Boolean).map(Number);
 events=(data.e || '').match(/.{2}/g) || [];eventstimes=(data.d || '').split(' ').filter(Boolean).map(Number);
 clock.w=Number(data.t)||0;clock.b=Number(data.u)||0;paintClocks();displayTermination(stat,false);
}
async function wsgame() {
 if(disposed)return;
 clearTimeout(reconnectTimer);if(wsc){wsc.onclose=null;wsc.close();}gameConnectionReady=false;snapshotReady=false;
 const setup=document.querySelector('.setup');let server=String(setup.dataset.server || 'ws0');if(/^\d+$/.test(server))server='ws'+server;
 if(!/^ws\d+$/.test(server))throw new Error('Invalid game region');
 let base='wss://'+server+'.chessil.com';
 try {const regions=await window.chessilGameServers();const region=regions.find(item=>item.id===server);if(region)base=new URL(region.url).origin;}catch(_){}
 const socket=new WebSocket(base+'/game/'+gameId);wsc=socket;
 let heartbeatTimer;
 const heartbeat=()=>{clearTimeout(heartbeatTimer);heartbeatTimer=setTimeout(()=>socket.close(),10000);};
 socket.onopen=()=>{heartbeat();socket.send('s');};
 socket.onmessage=event=>{
  heartbeat();const message=String(event.data),type=message[0],data=message.slice(1);
  try {
   if(type==='1'){socket.send('0');return;}
   if(type==='a'){socket.send('b');return;}
   if(type==='z'){watcher=!['w','b'].includes(data);if(!watcher)playerside=data;return;}
   if(type==='s'){lastmovetime=Number(data);return;}
   if(type==='m'){if(data[0]===':')receiveMove(data.slice(1).split(':'));else loadHistory(data);}
   if(type==='i')allmovetimes=data?data.split(' ').map(Number):[];
   if(type==='l')clock.w=Number(data);
   if(type==='n')clock.b=Number(data);
   if(type==='p')boardView.acknowledge(data);
   if(type==='e') {
    if(data[0]===':') {const [action,side,time,finished]=data.slice(1).split(':');events.push(side+action);eventstimes.push(Number(time));if(Number(finished)>0)displayTermination(Number(finished),true);}
    else events=data.match(/.{2}/g) || [];
   }
   if(type==='k')eventstimes=data?data.split(' ').map(Number):[];
   if(type==='f') {
    if(Number(data)>0)displayTermination(Number(data),false);
    else {const first=!snapshotReady;stat=0;gamefinished=false;snapshotReady=true;gameConnectionReady=true;reconnectAttempts=0;statusMessage((gameDescriptions[document.documentElement.lang] || gameDescriptions.en)[0]);if(first && !uci.length && !startSoundPlayed){startSoundPlayed=true;ChessilSound.play('start');}}
   }
   if(type==='t'){const [side,value,code]=data.slice(1).split(':');clock[side]=Number(value);if(Number(code)>0)displayTermination(Number(code),true);}
   if(type==='9')displayTermination(9,true);
   if(type==='d'){const diffs=data.slice(1).split(':');['w','b'].forEach((side,i)=>{const rating=document.querySelector('.rclock-'+(side==='w'?'white':'black'))?.closest('.game-player')?.querySelector('rating');if(rating)rating.textContent+=' ('+(Number(diffs[i])>=0?'+':'')+diffs[i]+')';});}
   paintClocks();updateGameUi();
  }catch(error){console.error('Game message:',error);statusMessage('Unable to synchronize. Reload the game.');}
 };
 socket.onclose=()=>{
  clearTimeout(heartbeatTimer);if(wsc!==socket)return;
  gameConnectionReady=false;boardView.cancel();updateGameUi();
  if(disposed || gamefinished)return;
  // Results can be saved between reconnects. Recheck metadata before opening another socket.
  if(reconnectAttempts++<4)reconnectTimer=setTimeout(async()=>{
   try {const res=await fetch('/gameinfo',{method:'POST',body:gameId});if(res.ok){const info=await res.json();if(info.state>0){stat=Number(info.state);await dbgame();return;}}await wsgame();}
   catch(_){statusMessage('Connection lost. Reload to reconnect.');}
  },Math.min(5000,500*2**reconnectAttempts));
  else statusMessage('Connection lost. Reload to reconnect.');
 };
}
async function roundstart() {
 if(boardView)return;
 await ChessilPreferences.ready;
 gameId=location.pathname.split('/')[2];const setup=document.querySelector('.setup');
 stat=Number(document.querySelector('[data-game-field="state"]').dataset.state);playerside=setup.dataset.side;watcher=!['w','b'].includes(playerside);
 const orientation=watcher?(new URLSearchParams(location.search).get('s')==='b'?'b':'w'):playerside;
 initialClock=Number(setup.dataset.timeControl.split('+')[0])*60000;clock={w:initialClock,b:initialClock};
 movesList=document.querySelector('moves-list');
 boardView=new ChessilBoard(document.querySelector('cg-board'),{
  state:()=>({fen,moves,turn,side:playerside,watcher,finished:gamefinished,connected:gameConnectionReady}),
  submit:move=>sendGameMessage((turn===playerside?'m':'p')+move),cancelPremove:()=>sendGameMessage('p')
 });
 boardView.orientation=orientation;boardView.active=orientation==='w'?'e2':'e7';
 const wrap=document.querySelector('.cg-wrap');wrap.classList.add('orientation-'+(orientation==='w'?'white':'black'));
 // Card positions change once; piece coordinates always use the same orientation.
 const top=document.querySelector('.game-player--top'),bottom=document.querySelector('.game-player--bottom');
 if(orientation==='b') {const node=top.querySelector('.ruser'),other=bottom.querySelector('.ruser');top.prepend(other);bottom.prepend(node);}
 document.querySelector('.rclock-top').classList.add('rclock-'+(orientation==='w'?'black':'white'));
 document.querySelector('.rclock-bottom').classList.add('rclock-'+(orientation==='w'?'white':'black'));
 document.querySelectorAll('coords.ranks coord').forEach((el,i)=>el.textContent=orientation==='w'?8-i:i+1);
 document.querySelectorAll('coords.files coord').forEach((el,i)=>el.textContent=String.fromCharCode(orientation==='w'?97+i:104-i));
 boardView.render(board);paintClocks();
 document.querySelector('.draw-yes').addEventListener('click',()=>sendGameMessage('e2'));
 document.querySelector('.resign').addEventListener('click',()=>sendGameMessage('e1'));
 document.querySelector('moves-panel').addEventListener('click',event=>{
  if(!gamefinished)return;const target=event.target.closest('button,[ply]');if(!target)return;
  const plies={rw:0,sb:a1ti-1,fw:a1ti+1,ff:uci.length};
  const ply=target.hasAttribute('ply')?Number(target.getAttribute('ply')):plies[target.id];if(ply!==undefined)gamereplay(ply);
 });
 if(stat===0)await wsgame();else await dbgame();
 clocktick=setInterval(()=>{if(!gamefinished)paintClocks();},100);
 window.addEventListener('pagehide',()=>{disposed=true;clearInterval(clocktick);clearTimeout(reconnectTimer);boardView.destroy();wsc?.close();},{once:true});
 updateGameUi();
}
