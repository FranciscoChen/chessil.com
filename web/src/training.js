/* Curriculum data and lesson flow are independent of shared board input/rendering. */
document.addEventListener('DOMContentLoaded',()=>{
'use strict';
const root=document.querySelector('#training-app');if(!root)return;
const $=id=>document.getElementById('training-'+id),initial='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
let data,section=root.dataset.initialSection||'tutorial',lesson,fen=initial,index=0,stage=0,active=false,busy=false,complete=false,free=false,side='w',timer,autoplayRun,epoch=0,rush=null,rushCountdown,positions=new Map(),progress={},account=null,saving=Promise.resolve();
const storage='chessil.training.v1';try{progress=JSON.parse(localStorage.getItem(storage)||'{}');if(!progress||typeof progress!=='object'||Array.isArray(progress))progress={};}catch(_){}
const text=(id,value)=>{const element=$(id);element.textContent=value;if(id==='summary'){const plain=text=>String(text||'').toLowerCase().replace(/[.!?。！？…\s]+$/g,'');element.hidden=!value||plain(value)===plain($('title').textContent);}},status=message=>text('status',message);
async function request(url,options={}){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);try{return await fetch(url,{...options,signal:controller.signal});}finally{clearTimeout(timeout);}}
function expiredRush(){if(rush&&Date.now()>=rush.end){endRush('Time is up.');return true;}return false;}
function drawClaim(){return Number(fen.split(' ')[4])>=100||positions.get(fen.split(' ').slice(0,4).join(' '))>=3;}
function stopTimers(){clearTimeout(timer);autoplayRun?.cancel();$('autoplay').hidden=true;epoch++;busy=false;}
function notation(move,position=fen){return gensanbase(move,boardgen(position),position,mg(position));}
const view=new ChessilBoard(root.querySelector('cg-board'),{state:()=>({fen,autoQueen:lesson?.moves[index]?.length===5&&lesson.moves[index][4]!=='q'?false:undefined,moves:active&&!busy?mg(fen):[],turn:fen.split(' ')[1],side,watcher:!active,finished:complete,connected:active&&!busy}),submit:move=>{queueMicrotask(()=>attempt(move));return true;},cancelPremove(){}});
function resetPositionCount(){positions=new Map([[fen.split(' ').slice(0,4).join(' '),1]]);}
function orient(){view.orientation=side;root.querySelectorAll('coords.files coord').forEach((el,i)=>el.textContent=String.fromCharCode(side==='w'?97+i:104-i));root.querySelectorAll('coords.ranks coord').forEach((el,i)=>el.textContent=side==='w'?8-i:i+1);}
function paint(move='',animate=false){view.render(boardgen(fen),move,animate);}
function lessons(){return (data?.[section]||[]).filter(l=>section!=='openings'||l.repertoire===$('repertoire').value);}
function updateLibrary(){
 const query=$('search').value.toLowerCase(),list=lessons().filter(l=>(l.title+' '+l.summary).toLowerCase().includes(query));
 $('library').replaceChildren(...list.map(l=>{const b=document.createElement('button'),title=document.createElement('strong'),summary=document.createElement('small');b.type='button';b.className='training-lesson';b.setAttribute('aria-pressed',String(lesson?.id===l.id));title.textContent=l.title;summary.textContent=(progress[l.id]?.completed?'✓ Completed · ':'')+l.summary;b.append(title,summary);b.onclick=()=>{endRush();select(l);};return b;}));
 if(!list.length){const p=document.createElement('p');p.textContent='No lessons match this search.';$('library').append(p);}
}
function save(completed=false){
 if(!lesson)return;const old=progress[lesson.id]||{};const record={stage:Math.max(old.stage||0,completed?3:Math.min(2,stage+1)),completed:!!old.completed||completed,updatedAt:Date.now()};progress[lesson.id]=record;
 if(account===null){status('Progress sync is unavailable. Progress lasts for this visit; refresh to retry syncing.');updateLibrary();return;}
 if(!account){try{localStorage.setItem(storage,JSON.stringify(progress));}catch(_){status('Browser storage is unavailable; progress lasts for this visit.');}}
 else{const id=lesson.id;saving=saving.catch(()=>{}).then(async()=>{const r=await request('/api/training/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lessonId:id,...record})});if(!r.ok)throw Error('save');}).catch(()=>status('Account progress could not be saved. Retry this lesson to save it.'));}updateLibrary();
}
function select(item,pass){
 if(!item)return;stopTimers();lesson=item;free=false;active=false;complete=false;stage=pass??(section==='openings'?Math.min(2,progress[item.id]?.stage||0):0);index=0;side=item.side||item.fen?.split(' ')[1]||'w';fen=item.fen||initial;orient();
 text('title',item.title);text('summary',item.summary);text('concept',item.concept||item.summary);text('stage',section==='openings'?'01 / Learn the line':'Learn the idea');text('meta',section==='openings'?`${side==='w'?'White':'Black'} repertoire · ${item.family||item.title}`:'Practice the idea, then apply it on the board.');
 $('retry').hidden=true;$('next').hidden=true;$('hint').hidden=true;$('freeplay').hidden=section!=='endgames';$('progress').value=0;$('progress').max=1;$('line').replaceChildren();updateLibrary();start(stage);
}
function later(fn,ms){const token=epoch;timer=setTimeout(()=>{if(token===epoch)fn();},ms);}
function start(pass=stage){
 if(!lesson)return;stopTimers();view.guidance=null;stage=pass;index=0;free=false;complete=false;active=true;side=lesson.side||lesson.fen?.split(' ')[1]||'w';fen=lesson.fen||initial;resetPositionCount();paint();$('retry').hidden=false;$('next').hidden=true;$('hint').hidden=stage===2||!!rush;$('freeplay').hidden=section!=='endgames';text('stage',section==='openings'?['01 / Learn the line','02 / Remember with a pause','03 / Recall without guidance'][stage]:'Your turn');text('summary',section==='openings'&&stage===2?'Reproduce the opening sequence from memory.':lesson.summary);text('concept',section==='openings'&&stage===2?'Play the repertoire from memory. The lesson explanation returns when you restart.':lesson.concept||lesson.summary);text('meta',stage===2?'Recall the moves from memory. Restart to see the line again.':lesson.summary);$('line').replaceChildren();advance();
}
function guide(){
 const move=lesson.moves[index];if(!active||complete||!move)return;
 view.guidance=null;view.drawOverlays();
 if(stage===0&&!rush&&!['tactics','strategy'].includes(section)){view.guidance={from:move.slice(0,2),to:move.slice(2,4)};view.active=view.guidance.from;view.drawOverlays();status(`Play ${notation(move)}: ${move.slice(0,2)} → ${move.slice(2,4)}. ${lesson.notes?.[index]||''}`);}
 else if(stage===1&&!rush){status('What is the next move? Take a moment to remember.');later(()=>{if(active&&!busy){view.guidance={from:move.slice(0,2),to:move.slice(2,4)};view.drawOverlays();status(`Hint: ${notation(move)} (${move.slice(0,2)} → ${move.slice(2,4)}).`);}},7000);}
 else status(rush?'Find the tactical move.':'What comes next? Play your move without hints.');
}
function advance(){
 if(expiredRush())return;
 $('progress').max=lesson.moves.length||1;$('progress').value=index;if(index>=lesson.moves.length){finish();return;}
 const turn=fen.split(' ')[1];if(lesson.playBoth){side=turn;guide();return;}
 if(turn!==side){view.guidance=null;view.drawOverlays();busy=true;later(()=>{apply(lesson.moves[index]);busy=false;advance();},rush?150:650);return;}guide();
}
function apply(move){clearTimeout(timer);const san=notation(move),next=ucifen(move,fen,boardgen(fen),{});fen=next.f;const key=fen.split(' ').slice(0,4).join(' ');positions.set(key,(positions.get(key)||0)+1);index++;paint(move,true);const entry=document.createElement('span');entry.className='training-ply';entry.textContent=san;$('line').append(entry);window.ChessilSound?.play('move');}
function attempt(move){
 if(expiredRush()){view.acknowledge();return;}
 if(!active||busy||complete){view.acknowledge();return;}if(free){playEndgame(move);return;}
 if(move!==lesson.moves[index]){view.acknowledge();if(rush){rush.mistakes++;text('score',`${rush.score} solved · ${rush.mistakes}/3 mistakes`);if(rush.mistakes>=3){endRush('Three mistakes. Try again and build accuracy.');return;}}status(section==='strategy'?'That move is legal, but this exercise asks for the plan described above. Try another move.':'Try again. Recall the idea and look at the position.');return;}
 stopTimers();apply(move);advance();
}
function finish(){
 if(expiredRush())return;
 active=false;complete=true;view.guidance=null;view.drawOverlays();$('hint').hidden=true;$('progress').value=lesson.moves.length;
 if(rush){rush.score++;text('score',`${rush.score} solved · ${rush.mistakes}/3 mistakes`);if(rush.index+1>=rush.order.length){endRush('You solved the entire training set.');return;}rush.index++;later(()=>{const session=rush;select(data.tactics.find(l=>l.id===session.order[session.index]),2);},500);return;}
 if(section==='openings'&&stage<2){save(false);$('next').hidden=false;$('next').textContent=stage===0?'Repeat with delayed hints now':'Recall without hints now';status(stage===0?'Look over the moves and memorize the sequence. Then repeat it.':'Now repeat the line without guidance.');scheduleNext();}
 else{save(true);const list=lessons(),pos=list.findIndex(l=>l.id===lesson.id),hasNext=pos+1<list.length;$('next').hidden=!hasNext;$('next').textContent='Next lesson now';status('Lesson complete. '+(section==='endgames'?'Continue with tablebase practice to play the position out.':'Carry this idea into your next game.'));if(hasNext)scheduleNext();}
}
function scheduleNext(){
 const token=epoch;$('autoplay').hidden=false;text('autoplay-label',`${section==='openings'&&stage<2?'Next practice stage':'Next lesson'} in `);
 autoplayRun=ChessilTiming.start($('autoplay'),{seconds:5,format:n=>n+'s',label:'Next lesson',onFinish:()=>{if(token===epoch)next();}});
}
function next(){stopTimers();if(section==='openings'&&stage<2){start(stage+1);return;}const list=lessons(),pos=list.findIndex(l=>l.id===lesson.id);if(pos+1<list.length){select(list[pos+1]);}else{status('You have completed this collection. Choose another section or repertoire.');$('next').hidden=true;}}
function hint(){if(!lesson||stage===2||rush)return;if(free){status('Consider king activity, passed pawns and the opponent’s threats.');return;}const move=lesson.moves[index];if(move){view.guidance={from:move.slice(0,2),to:move.slice(2,4)};view.active=move.slice(0,2);view.drawOverlays();status(`Try ${notation(move)} (${move.slice(0,2)} → ${move.slice(2,4)}). ${lesson.notes?.[index]||''}`);}}
async function tablebase(position){const r=await request('/api/training/tablebase?fen='+encodeURIComponent(position));if(!r.ok)throw Error('Tablebase unavailable');return r.json();}
async function playEndgame(move){
 const token=epoch,position=fen;busy=true;
 try{const result=await tablebase(position);if(token!==epoch)return;if(result.insufficientMaterial||result.stalemate||result.checkmate){view.acknowledge();endPractice(result);return;}const best=result.moves?.[0],chosen=result.moves?.find(m=>m.uci===move);if(!chosen||!best||result.certainty!=='exact')throw Error('No exact tablebase move');
  // Child categories are from the opponent's perspective; accept all moves
  // preserving the best result rather than using DTZ as a teaching principle.
  if(!result.optimalMoves.includes(move)){view.acknowledge();status('That move changes the tablebase result. Try to preserve the win or draw.');busy=false;return;}
  const after=ucifen(move,position,boardgen(position),{}).f;
  const reply=await tablebase(after);if(token!==epoch)return;if(reply.certainty!=='exact')throw Error('No exact reply');
  apply(move);status('Result preserved. '+(result.optimalMoves.length>1?'Several moves preserve this result.':'This is the only move preserving this result.'));
  if(!reply.moves?.length||reply.insufficientMaterial){endPractice(reply);return;}if(drawClaim()){endPractice({category:'draw'});return;}if(index>=120){active=false;status('Practice move limit reached. Restart to explore another plan.');return;}
  apply(reply.moves[0].uci);busy=false;
  if(drawClaim()){endPractice({category:'draw'});return;}
  if(!mg(fen).length)endPractice({checkmate:incheck(fen),stalemate:!incheck(fen),category:'draw'});
 }catch(_){if(token!==epoch)return;view.acknowledge();busy=false;status('Tablebase unavailable. Your position is preserved; retry shortly.');}
}
function endPractice(result){active=false;complete=true;busy=false;save(true);status(result.checkmate?'Checkmate. Endgame complete.':result.stalemate?'Stalemate. Think about the opponent’s legal moves.':'Endgame finished: '+result.category+'.');}
async function freeplay(){
 if(!lesson)return;stopTimers();view.guidance=null;active=false;free=true;complete=false;fen=lesson.fen||initial;index=0;side=fen.split(' ')[1];orient();resetPositionCount();paint();$('line').replaceChildren();text('stage','Tablebase practice');status('Loading endgame tablebase…');const token=epoch;
 try{const result=await tablebase(fen);if(token!==epoch)return;if(result.certainty!=='exact')throw Error('No exact result');if(!result.moves?.length||result.insufficientMaterial){endPractice(result);return;}active=true;status('Play against tablebase replies. Preserve the best result and find the plan.');$('hint').hidden=false;}catch(_){if(token===epoch)status('Tablebase unavailable. Guided lessons remain available; retry practice shortly.');}
}
function endRush(message=''){if(!rush)return;rushCountdown?.cancel();const score=rush.score;rush=null;stopTimers();active=false;complete=true;view.guidance=null;view.drawOverlays();$('stop').hidden=true;$('storm').hidden=section!=='tactics';$('hint').hidden=true;if(message)status(`${message} ${score} puzzles solved. This curated set is for practice, not a rating.`);}
function storm(){
 changeSection('tactics');const order=data.tactics.map(l=>l.id);if(!order.length)return;for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 rush={score:0,mistakes:0,index:0,order,end:Date.now()+180000};select(data.tactics.find(l=>l.id===order[0]),2);$('stop').hidden=false;$('storm').hidden=true;text('score','0 solved · 0/3 mistakes');
 rushCountdown=ChessilTiming.start($('clock'),{seconds:180,format:n=>`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`,label:'Rush time remaining',onFinish:()=>endRush('Time is up.')});
}
function changeSection(value){endRush();stopTimers();section=value;$('search').value='';$('repertoire').closest('label').hidden=section!=='openings';$('storm').hidden=section!=='tactics';$('stop').hidden=true;text('score','');text('clock','');root.querySelectorAll('[data-section]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.section===section)));const list=lessons();if(list.length)select(list[0]);else{lesson=null;active=false;complete=true;free=false;view.guidance=null;fen=initial;paint();text('title','No lessons available');text('summary','');text('concept','');status('This collection is empty. Choose another section.');['hint','retry','next','freeplay'].forEach(id=>$(id).hidden=true);}updateLibrary();history.replaceState(null,'','#'+section);}
root.querySelectorAll('[data-section]').forEach(b=>b.onclick=()=>changeSection(b.dataset.section));$('hint').onclick=hint;$('retry').onclick=()=>{endRush();start(0);};$('next').onclick=next;$('freeplay').onclick=freeplay;$('storm').onclick=storm;$('stop').onclick=()=>endRush('Session stopped.');$('search').oninput=updateLibrary;$('repertoire').onchange=()=>{select(lessons()[0]);updateLibrary();};
window.addEventListener('pagehide',event=>{endRush();stopTimers();rushCountdown?.cancel();if(event.persisted){active=false;view.cancel();view.acknowledge();}else view.destroy();});
window.addEventListener('pageshow',event=>{if(event.persisted&&lesson)start(stage);});
root.querySelectorAll('button,select,input').forEach(el=>el.disabled=true);
(async()=>{try{await ChessilPreferences.ready;const r=await request('/api/training/curriculum');if(!r.ok)throw Error('curriculum');data=await r.json();try{const p=await request('/api/training/progress');if(p.ok){const saved=await p.json();account=!!saved.account;if(account)progress=saved.progress||{};}}catch(_){}root.querySelectorAll('button,select,input').forEach(el=>el.disabled=false);const hash=location.hash.slice(1);changeSection(['tutorial','openings','endgames','tactics','strategy'].includes(hash)?hash:section);if(account===null)status('Progress sync is unavailable. You can train, but progress lasts for this visit.');}catch(_){status('Training could not load. Refresh to try again.');}})();
},{once:true});
