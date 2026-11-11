/* Puzzle flow uses the shared rules, board, preferences and persistent buffer. */
document.addEventListener('DOMContentLoaded',()=>{
'use strict';
const root=document.querySelector('#puzzle-app');if(!root)return;
const $=id=>document.getElementById('puzzle-'+id);
let queue,current,fen='8/8/8/8/8/8/4k3/6K1 w - - 0 1',side='w',index=0,busy=false,done=false,assisted=false,timer,theme='mixed';
const label=id=>id.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/([a-zA-Z])(\d)/g,'$1 $2').replace(/^./,c=>c.toUpperCase());
const message=value=>{$('status').textContent=value;};
const valid=p=>p&&/^[a-zA-Z0-9]{5,8}$/.test(p.id)&&typeof p.fen==='string'&&p.fen.length<128&&Array.isArray(p.moves)&&p.moves.length>=2&&p.moves.length<100&&p.moves.every(m=>/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m))&&Number.isFinite(p.rating)&&Array.isArray(p.themes)&&p.themes.every(t=>/^[a-zA-Z][a-zA-Z0-9]{0,47}$/.test(t));
const board=new ChessilBoard(root.querySelector('cg-board'),{
 state:()=>({fen,side,turn:fen.split(' ')[1],moves:current&&!done&&!busy&&history.ply===index?mg(fen):[],connected:!!current&&!busy&&history.ply===index,finished:done,watcher:!current||history.ply!==index,autoQueen:false}),
 submit:move=>{queueMicrotask(()=>attempt(move));return true;},cancelPremove(){}
});
const history=new ChessilHistory(root.querySelector('moves-panel'),{signal:board.abort.signal,onSelect:(ply,previous)=>{
 board.guidance=null;const move=ply<previous?history.moves[ply]?.slice(2,4)+history.moves[ply]?.slice(0,2):history.moves[ply-1]||'';
 board.render(boardgen(history.positions[ply]),move,Math.abs(ply-previous)===1);
 board.lastMove=history.moves[ply-1]||'';board.drawOverlays();controls();
 message(ply<index?'Reviewing puzzle moves.':done?'Puzzle complete.':side==='w'?'White to move.':'Black to move.');
}});
history.reset(fen);
function paint(move='',animate=false){board.render(boardgen(fen),move,animate);}
function cancel(){clearTimeout(timer);busy=false;board.cancel();board.acknowledge();board.guidance=null;}
function controls(){for(const id of ['hint','restart','solution'])$(id).disabled=!current||(id!=='restart'&&(busy||done||history.ply!==index));$('next').disabled=!current;history.lock(busy);}
function apply(move,animate=true){
 const san=gensanbase(move,boardgen(fen),fen,mg(fen));fen=ucifen(move,fen,boardgen(fen),{}).f;index++;
 history.push(move,fen,san);
 $('progress').value=Math.max(0,index-1);paint(move,animate);
}
function finished(revealed=false){done=true;busy=false;board.guidance=null;board.drawOverlays();controls();$('progress').value=$('progress').max;
 message(revealed?'Solution shown. Restart to practise it.':assisted?'Solved with a hint.':'Puzzle solved.');
 $('themes').textContent=current.themes.map(label).join(' · ');
}
function attempt(move){
 if(!current||busy||done||history.ply!==index){board.acknowledge();return;}
 const next=ucifen(move,fen,boardgen(fen),{}).f;
 // Every checkmate wins a mate-in-one, including a different mating move.
 const alternativeMate=index===1&&current.themes.includes('mateIn1')&&incheck(next)&&mg(next).length===0;
 if(move!==current.moves[index]&&!alternativeMate){board.acknowledge();message('Try another move.');return;}
 board.guidance=null;apply(move);window.ChessilSound?.play('move');
 if(index>=current.moves.length||alternativeMate){finished();return;}
 busy=true;controls();message('Correct.');
 timer=setTimeout(()=>{apply(current.moves[index]);busy=false;controls();if(index>=current.moves.length)finished();else message(side==='w'?'White to move.':'Black to move.');},450);
}
function start(puzzle){
 cancel();current=puzzle;done=false;assisted=false;index=0;
 history.reset(fen);$('themes').textContent='';
 if(!current){controls();paint();return;}
 // Validate the complete line before allowing interaction, including the setup move.
 try{let position=current.fen;for(const move of current.moves){if(!mg(position).includes(move))throw Error('Invalid line');position=ucifen(move,position,boardgen(position),{}).f;}}
 catch(_){current=null;controls();message('This puzzle could not load. Choose Next to skip it.');$('next').disabled=false;return;}
 fen=current.fen;side=fen.split(' ')[1]==='w'?'b':'w';board.setOrientation(side);
 history.reset(fen);$('progress').max=current.moves.length-1;$('progress').value=0;
 paint();$('rating').textContent=String(current.rating);busy=true;controls();message('');
 timer=setTimeout(()=>{apply(current.moves[0]);timer=setTimeout(()=>{busy=false;controls();message(side==='w'?'White to move.':'Black to move.');},ChessilPreferences.duration()+40);},180);
}
function changed(){
 if(!queue)return;
 const notice=!navigator.onLine?'Offline':queue.error?'Could not load more puzzles. Reconnect and retry.':'';
 $('connection').textContent=notice;$('connection').hidden=!notice;
 $('reload').hidden=!queue.error&&!(!queue.loading&&!queue.peek());
 if(!current&&queue.peek())start(queue.peek());
 else if(!current)message(queue.loading?'Loading puzzles…':queue.error?'Could not load puzzles. Reconnect and retry.':'No puzzles available for this type. Choose another type.');
}
function select(value){
 queue?.destroy();cancel();current=null;theme=value;done=false;$('rating').textContent='';history.reset(fen);$('themes').textContent='';$('progress').value=0;
 try{localStorage.setItem('chessil.puzzle-type',theme);}catch(_){}
 queue=new ChessilBuffer({key:'chessil.puzzles.v1.'+theme,validate:valid,onChange:changed,
  fetchBatch:async(exclude,signal)=>{const params=new URLSearchParams({theme,exclude:exclude.join(',')});const r=await fetch('/api/training/puzzles?'+params,{signal});if(!r.ok)throw Error('Load failed');return (await r.json()).puzzles;}
 });
 if(queue.peek())start(queue.peek());else{controls();paint();}changed();queue.fill();
}
$('type').onchange=()=>select($('type').value);
$('hint').onclick=()=>{if(!current||done||busy)return;assisted=true;const move=current.moves[index];board.guidance={from:move.slice(0,2),to:move.slice(2,4)};board.active=move.slice(0,2);board.drawOverlays();message(`Try ${gensanbase(move,boardgen(fen),fen,mg(fen))}.`);};
$('restart').onclick=()=>start(current);
$('next').onclick=()=>{cancel();current=null;$('rating').textContent='';history.reset(fen);$('themes').textContent='';queue.advance();if(!current){controls();paint();}};
$('solution').onclick=()=>{
 if(!current||done||busy||history.ply!==index)return;cancel();busy=true;assisted=true;controls();message('Solution…');
 const step=()=>{apply(current.moves[index]);timer=setTimeout(()=>{if(index<current.moves.length)step();else finished(true);},Math.max(650,ChessilPreferences.duration()+200));};step();
};
$('reload').onclick=()=>{queue.fill();loadThemes();};
async function loadThemes(){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
 try{const r=await fetch('/api/training/puzzle-themes',{signal:controller.signal});if(!r.ok)throw Error();const data=await r.json();
 const previous=$('type').value;$('type').querySelectorAll('option:not([value="mixed"])').forEach(el=>el.remove());
 data.themes.sort((a,b)=>label(a.id).localeCompare(label(b.id))).forEach(t=>{if(!/^[a-zA-Z][a-zA-Z0-9]{0,47}$/.test(t.id))return;const option=document.createElement('option');option.value=t.id;option.textContent=label(t.id);$('type').append(option);});
 $('type').value=[...$('type').options].some(o=>o.value===previous)?previous:'mixed';
 try{localStorage.setItem('chessil.puzzle-themes',JSON.stringify(data.themes));}catch(_){}
 }catch(_){/* Mixed and previously cached types remain usable offline. */}finally{clearTimeout(timeout);}
}
window.addEventListener('online',loadThemes);
window.addEventListener('offline',changed);
window.addEventListener('pagehide',event=>{cancel();if(!event.persisted){queue?.destroy();board.destroy();}});
window.addEventListener('pageshow',event=>{if(event.persisted){if(current)start(current);queue?.fill();}});
(async()=>{
 await ChessilPreferences.ready;
 try{const types=JSON.parse(localStorage.getItem('chessil.puzzle-themes')||'[]');types.forEach(t=>{if(!/^[a-zA-Z][a-zA-Z0-9]{0,47}$/.test(t.id))return;const o=document.createElement('option');o.value=t.id;o.textContent=label(t.id);$('type').append(o);});const saved=localStorage.getItem('chessil.puzzle-type');if([...$('type').options].some(o=>o.value===saved))$('type').value=saved;}catch(_){}
 select($('type').value);loadThemes();
})();
},{once:true});
