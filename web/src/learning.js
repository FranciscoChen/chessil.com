/* Playable lessons own immutable FEN/history and pedagogical state. The native
 * board owns input and animation; the shared browser engine owns all searches.
 * A generation cancels stale searches/messages on lesson changes or restarts. */
document.addEventListener('DOMContentLoaded',()=>{
'use strict';
const app=document.querySelector('#learning-app');if(!app)return;
const $=id=>document.getElementById('learning-'+id),section=app.dataset.section;
const initial='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const lang=document.documentElement.lang,words={en:{tap:'Tap to continue',retry:'Retry',next:'Continue'},es:{tap:'Toca para continuar',retry:'Reintentar',next:'Continuar'},zh:{tap:'轻触继续',retry:'重试',next:'继续'}}[lang]||{tap:'Tap to continue',retry:'Retry',next:'Continue'};
const locale = { en: 0, es: 1, zh: 2 }[lang] ?? 0;
const localize = translations => translations?.[locale];
const coaching = window.ChessilLearningCopy;
let lessons=[],lesson,fen=initial,side='w',moves=[],counts=new Map(),humanMoves=0,generation=0,busy=false,ended=false,awaiting=null,guide=null,engine=null,engineReady=null,engineSignature='',coordinatePhase='free',target=null,seenCheck=false,seenCues=new Set(),progress={},account=null,saving=Promise.resolve(),lastResult=null,book=null,openingTimer,autoplay;
let teachingDefense=false,hintRequest=null;
const boardRoot=app.querySelector('cg-board'),anchor=app.querySelector('.learning-anchor'),storage='chessil.training.v1';
function status(message=''){$('status').textContent=message;}
const view=new ChessilBoard(boardRoot,{
 state:()=>{
  const turn=fen.split(' ')[1];
  const connected=!!lesson&&!busy&&!ended&&!awaiting&&turn===side;
  return {fen,side,turn,moves:connected?mg(fen):[],connected,finished:ended,watcher:false};
 },
 submit:move=>{
  const token=generation;
  queueMicrotask(()=>{if(token===generation)attempt(move);});
  return true;
 },
 cancelPremove(){}
});
function paint(move='',animate=false){view.positionTurn=fen.split(' ')[1];view.render(boardgen(fen),move,animate);}
function king(color=side){return Object.keys(boardgen(fen)).find(s=>boardgen(fen)[s].p==='k'&&boardgen(fen)[s].c===color);}
function focus(){const pieces=boardgen(fen);return lesson.focus||Object.keys(pieces).find(s=>pieces[s].p===lesson.piece&&pieces[s].c===side)||king();}
function clearGuide(){guide?.close();guide=null;view.guidance=null;view.guideSquares=[];view.drawOverlays();}
function placeAnchor(square){const [x,y]=view.point(square||king());anchor.style.left=x*12.5+'%';anchor.style.top=y*12.5+'%';guide?.update();}
function callout(square,text,{ack,areas=[],destination=null,highlight=true}={}){
 clearGuide();placeAnchor(square);view.guideSquares=areas;view.guidance=highlight?{from:square,to:destination}:null;view.drawOverlays();
 guide=ChessilHighlight.show(anchor,{text,actions:false,highlight:false,boundary:boardRoot,dismissible:false});
 if(guide?.box){guide.box.classList.add('learning-callout');guide.box.dataset.awaiting=String(!!ack);if(ack){const button=document.createElement('button');button.type='button';button.className='learning-continue';button.textContent=words.tap;button.onclick=event=>{event.stopPropagation();acknowledge();};guide.box.append(button);}}
 awaiting=ack||null;
}
function acknowledge(){if(!awaiting)return;const next=awaiting;awaiting=null;clearGuide();next();}
// A move may create a message during pointerdown. Its eventual click must not
// also acknowledge that new message; only a fresh gesture can continue.
let pointerAcknowledgement=null,keyAcknowledgement=null;
document.addEventListener('pointerdown',()=>pointerAcknowledgement=awaiting,true);
document.addEventListener('keydown',()=>keyAcknowledgement=awaiting,true);
// Acknowledgement is a page gesture, but never consumes navigation/settings.
 document.addEventListener('click',event=>{if(!awaiting||pointerAcknowledgement!==awaiting||event.target.closest('dialog,header,a,input,select,summary,[data-board-settings]'))return;if(event.target.closest('button')&&!event.target.closest('.learning-continue'))return;event.preventDefault();event.stopPropagation();acknowledge();},true);
 document.addEventListener('keydown',event=>{if(awaiting&&keyAcknowledgement===awaiting&&['Enter',' '].includes(event.key)&&!event.target.closest('input,select,button,a,dialog')){event.preventDefault();acknowledge();}});
function signature(){const p=ChessilPreferences.get().analysis;return JSON.stringify([p.engine,p.network,p.policy,p.hash,p.threads]);}
function dropEngine(){engine?.close();engine=null;engineReady=null;engineSignature='';}
async function getEngine(){const key=signature();if(engine&&key===engineSignature&&!engine.closed)return engineReady;dropEngine();engineSignature=key;engine=new ChessilLocalEngine();const instance=engine;engineReady=engine.load({...ChessilPreferences.get().analysis,multiPV:1}).then(()=>instance).catch(error=>{if(engine===instance){engine=null;engineReady=null;}throw error;});return engineReady;}
async function search(playMove=false,searchmoves=[]){
 clearEngineFailure();
 const position=fen,token=generation;
 const options={
  history:lesson.history?[...lesson.history,...moves]:moves.slice(),
  startFen:lesson.history?null:lesson.fen||initial,
  multiPV:1,nodes:1000000000,movetime:700,searchmoves
 };
 const instance=await getEngine();
 if(token!==generation||position!==fen)throw Error('Position changed');
 return playMove?instance.bestMove(position,options):instance.search(position,options);
}
let retryEngine;
function failure(error,retry){
 busy=false;
 view.acknowledge();
 retryEngine=retry;
 status('The local engine could not run. '+error.message);
 $('reconnect').hidden=false;
}
function clearEngineFailure(){
 if(!retryEngine)return;
 retryEngine=null;
 $('reconnect').hidden=true;
 status('');
}
function reconnect(){
 const retry=retryEngine;
 if(!retry)return;
 clearEngineFailure();
 generation++;
 dropEngine();
 retry();
}
function remember(){const key=ChessilPosition.key(fen);counts.set(key,(counts.get(key)||0)+1);}
function apply(move){const pieces=boardgen(fen),capture=pieces[move.slice(2,4)]?.p!==' '||pieces[move.slice(0,2)]?.p==='p'&&move[0]!==move[2];fen=ucifen(move,fen,pieces,{}).f;moves.push(move);remember();clearGuide();paint(move,true);ChessilSound?.play(capture?'capture':'move');}
function title(item) { return localize(item.coaching?.titles) || item.title; }
function intro(item) { return localize(item.coaching?.intro) || item.intro; }
function cueMove(move) {
 clearGuide();
 view.guidance = { from: move.slice(0, 2), to: move.slice(2, 4) };
 view.drawOverlays();
}
function teachPosition() {
 for (const cue of lesson.coaching?.cues || []) {
  if (seenCues.has(cue) || moves.length !== cue.line.length ||
      !cue.line.every((move, index) => moves[index] === move)) continue;
  seenCues.add(cue);
  callout(cue.square, localize(cue.text), { ack: turn });
  return true;
 }
 return false;
}
function library() {
 const list = $('lessons');
 if (!list) return;
 const query = $('search').value.trim().toLocaleLowerCase(lang);
 const contents = document.createDocumentFragment();
 let previousGroup;
 lessons.forEach((item, index) => {
  const group = localize(item.group);
  if (![title(item), intro(item), group].join(' ').toLocaleLowerCase(lang).includes(query)) return;
  if (group && group !== previousGroup) {
   const heading = document.createElement('h2');
   heading.className = 'learning-lesson-group';
   heading.textContent = group;
   contents.append(heading);
  }
  previousGroup = group;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'learning-lesson';
  if (item.id === lesson?.id) button.setAttribute('aria-current', 'true');
  const number = document.createElement('span');
  number.textContent = progress[item.id]?.completed ? '✓' : String(index + 1).padStart(2, '0');
  button.append(number, document.createTextNode(title(item)));
  button.onclick = () => {
   if ($('library-dialog').open) $('library-dialog').close();
   select(item);
  };
  contents.append(button);
 });
 list.replaceChildren(contents);
}
function save(){if(!lesson||section==='openings')return;progress[lesson.id]={stage:3,completed:true,updatedAt:Date.now()};library();if(account===false){try{localStorage.setItem(storage,JSON.stringify(progress));}catch(_){status('Browser storage is unavailable; progress lasts for this visit.');}}else if(account===true){const record={lessonId:lesson.id,...progress[lesson.id]};saving=saving.catch(()=>{}).then(async()=>{const response=await fetch('/api/training/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(record)});if(!response.ok)throw Error('Progress could not sync.');}).catch(error=>status(error.message));}else status('Progress could not sync; it is kept for this visit.');}
function select(item,{restart=false}={}){
 if(!item)return;
 if(busy||engine?.active)dropEngine();
 else if(engineReady)engineReady.then(instance=>{
  if(engine===instance&&!instance.closed)instance.worker.postMessage('ucinewgame');
 }).catch(()=>{});
 generation++;retryEngine=null;hintRequest=null;autoplay?.cancel();if($('autoplay'))$('autoplay').hidden=true;clearTimeout(openingTimer);view.cancel();view.acknowledge();clearGuide();ChessilResult.close();lesson=item;teachingDefense=item.id==='endgame-lucena';fen=item.setup?.fen||item.fen||initial;side=section==='openings'?$('side').value:item.side||fen.split(' ')[1];moves=[];counts=new Map();remember();humanMoves=0;busy=false;ended=false;awaiting=null;target=null;coordinatePhase='free';seenCheck=false;seenCues=new Set();lastResult=null;$('result').hidden=true;$('reconnect').hidden=true;
 view.setOrientation(side);paint();$('title').textContent=title(item);$('mobile-title').textContent=title(item);$('source').textContent=item.source||'';status('');library();if(section!=='openings'){const url=new URL(location.href);url.searchParams.set('lesson',item.id);history.replaceState(null,'',url);}
 // Warm up only lessons that need search. An idle engine survives lesson changes.
 if(item.mode!=='guided'&&item.mode!=='coordinates')getEngine().catch(()=>{});
 if(section==='openings'){$('book').replaceChildren();$('engine-lines').textContent='';turn();updateTools();return;}
 const begin=()=>{if(item.secondIntro)callout(item.secondIntro.square,localize(coaching.diagonal),{ack:()=>turn()});else turn();};
 const introduce=()=>restart?turn():callout(focus(),intro(item)||title(item),{ack:begin});
 if(!item.setup){introduce();return;}
 busy=true;
 const token=generation;
 setTimeout(()=>{
  if(token!==generation)return;
  apply(item.setup.move);
  moves=[];
  counts.clear();
  remember();
  setTimeout(()=>{
   if(token!==generation)return;
   busy=false;
   introduce();
  },ChessilPreferences.duration()+40);
 },180);
}
function restartLesson(){select(lesson,{restart:true});}
function next(){const index=lessons.indexOf(lesson);if(index+1<lessons.length)select(lessons[index+1]);else{ChessilResult.show({outcome:'success',title:'Collection complete',reason:'You can revisit any lesson from the library.',actions:[{label:words.retry,run:()=>select(lessons[0])},{label:'Training',primary:true,run:()=>location.assign('/'+lang+'/training')}]});}}
function result(outcome){
 const complete=outcome.reason==='Concept practised';
 const won=outcome.winner===side,draw=outcome.winner===null,success=complete||lesson.mode==='guided'||(lesson.goal==='hold'?(won||draw):lesson.goal==='draw'?draw:won);
 ended=true;busy=false;awaiting=null;clearGuide();if(success)save();ChessilSound?.play('end');
 lastResult=()=>ChessilResult.show({outcome:complete?'success':won?'win':draw?'draw':'loss',reason:outcome.reason,score:complete?'':draw?'½–½':outcome.winner==='w'?'1–0':'0–1',actions:[{label:words.retry,run:restartLesson},{label:words.next,primary:true,disabled:!success,run:next}]});$('result').hidden=false;lastResult();
}
function terminal(){if(lesson.mode==='coordinates')return false;const outcome=ChessilPosition.outcome(fen,counts.get(ChessilPosition.key(fen)));if(!outcome)return false;
 if(lesson.teachCheck&&outcome.reason==='Checkmate'&&outcome.winner===side){callout(king(side==='w'?'b':'w'),localize(coaching.mate),{ack:()=>result(outcome)});}
 else if(section==='tutorial'&&outcome.reason==='Stalemate'){callout(king(fen.split(' ')[1]),localize(coaching.stalemate),{ack:()=>result(outcome)});}
 else if(lesson.captureText&&outcome.winner===null&&outcome.reason==='Insufficient material'){callout(king(),localize(coaching[{p:'caught',b:'bishop',n:'knight'}[lesson.piece]||'caught']),{ack:()=>result(outcome)});}
 else result(outcome);return true;
}
function guided(){const expected=lesson.moves[moves.length];if(!expected){result(ChessilPosition.outcome(fen,counts.get(ChessilPosition.key(fen)))||{winner:side,reason:'Concept practised'});return;}if(fen.split(' ')[1]!==side){busy=true;const token=generation;setTimeout(()=>{if(token!==generation)return;apply(expected);busy=false;turn();},250);}else if(hintsEnabled())cueMove(expected);}
function randomTarget(){const options=mg(fen).filter(move=>boardgen(fen)[move.slice(0,2)].p==='k');return options[Math.floor(Math.random()*options.length)];}
function coordinateLesson(){
 if(coordinatePhase==='free'&&humanMoves>=4){target=randomTarget();coordinatePhase='file';const file=target[2],rank=target[3];callout(target.slice(2,4),localize(coaching.file(file)),{areas:Array.from({length:8},(_,i)=>file+(i+1)),ack:()=>{coordinatePhase='rank';callout(target.slice(2,4),localize(coaching.rank(rank)),{areas:[...'abcdefgh'].map(f=>f+rank),ack:()=>{coordinatePhase='square';callout(target.slice(2,4),localize(coaching.square(file, rank)),{areas:[file+rank],ack:()=>{coordinatePhase='target';if(hintsEnabled())cueMove(target);}});}});}});}
 else if(coordinatePhase==='recall-ready'){target=randomTarget();coordinatePhase='recall';callout(king(),localize(coaching.recall(target.slice(2,4))),{ack:hint});}
 else hint();
}
async function turn(){
 if(ended||awaiting)return;if(teachPosition()||terminal())return;
 if(lesson.mode==='guided'){guided();return;}
 if(section==='openings'&&moves.length>=Number($('depth').value)*2){openingComplete();return;}
 if(fen.split(' ')[1]===side){busy=false;if(lesson.mode==='coordinates')coordinateLesson();else hint();return;}
 busy=true;const token=generation,position=fen;
 try{
  const candidates=teachingDefense?ChessilLucenaDefense(position):[];
  if(!candidates.length)teachingDefense=false;
  const reply=await search(true,candidates);
  if(token!==generation||position!==fen)return;
  if(!mg(fen).includes(reply)||(candidates.length&&!candidates.includes(reply)))throw Error('No legal engine reply.');
  apply(reply);busy=false;turn();updateTools();}catch(error){if(token===generation)failure(error,turn);}
}
function attempt(move){
 if(busy||ended||awaiting||fen.split(' ')[1]!==side||!mg(fen).includes(move)){view.acknowledge();return;}
 if(lesson.mode==='guided'&&move!==lesson.moves[moves.length]){view.acknowledge();if(hintsEnabled())cueMove(lesson.moves[moves.length]);return;}
 if(lesson.mode==='coordinates'&&target&&move!==target){view.acknowledge();if(hintsEnabled())cueMove(target);return;}
 const coordinateTarget=lesson.mode==='coordinates'&&target&&move===target;
 apply(move);humanMoves++;
 if(coordinateTarget){target=null;if(coordinatePhase==='target')coordinatePhase='recall-ready';else{result({winner:side,reason:'Concept practised'});return;}}
 if(lesson.mode!=='guided'&&terminal())return;
 if(lesson.teachCheck&&!seenCheck&&incheck(fen)){
  const queen=Object.keys(boardgen(fen)).find(s=>boardgen(fen)[s].p==='q'&&boardgen(fen)[s].c===side),safe=queen&&!mg(fen).some(m=>m.slice(2,4)===queen);
  if(safe){seenCheck=true;callout(king(side==='w'?'b':'w'),localize(coaching.check),{ack:()=>turn()});return;}
 }
 turn();updateTools();
}
function hint(){
 if(!hintsEnabled()||!lesson||busy||ended||awaiting||fen.split(' ')[1]!==side)return;
 if(lesson.mode==='guided'){
  const move=lesson.moves[moves.length];
  if(move)cueMove(move);
  return;
 }
 if(lesson.mode==='coordinates'){
  if(target)cueMove(target);
  else {view.guidance={from:king()};view.drawOverlays();}
  return;
 }
 const token=generation,position=fen;
 if(hintRequest?.position===position&&hintRequest.token===token){
  if(hintRequest.move)cueMove(hintRequest.move);
  return;
 }
 const request=hintRequest={position,token};
 search(true).then(move=>{
  if(token!==generation||position!==fen||hintRequest!==request||!mg(fen).includes(move))return;
  request.move=move;
  if(hintsEnabled()&&!busy&&!awaiting&&!ended)cueMove(move);
 }).catch(()=>{if(hintRequest===request)hintRequest=null;});
}
function openingComplete(){ended=true;busy=false;clearGuide();$('autoplay').hidden=false;autoplay=ChessilTiming.start($('autoplay'),{seconds:4,format:n=>n+'s',label:'Next round',onFinish:restartLesson});lastResult=restartLesson;$('result').hidden=false;}
async function updateTools(){if(section!=='openings'||!$('tools').open||busy||ended)return;const token=generation,position=fen;try{if(!book){const catalog=await (await fetch('/engine/catalog.json')).json();const id=ChessilPreferences.get().analysis.book;book=new ChessilOpeningBook(catalog.books.find(b=>b.id===id)?.manifest);}
 const found=await book.lookup(position,moves.length);if(token!==generation||position!==fen)return;$('book').replaceChildren(...found.moves.slice().sort((a,b)=>b[2]-a[2]).map(([move,san,weight,total])=>{const button=document.createElement('button');button.type='button';button.className='learning-book-move';const name=document.createElement('span'),prior=document.createElement('span');name.textContent=san;prior.textContent=(weight/total*100).toFixed(1)+'%';button.append(name,prior);button.onclick=()=>{if(!busy&&!awaiting&&!ended&&fen.split(' ')[1]===side)attempt(move);};return button;}));if(!found.moves.length)$('book').textContent='No book moves in this position.';
 // Optional suggestions share the existing worker, serial with opponent replies.
 const lines=await search();if(token!==generation||position!==fen)return;$('engine-lines').textContent=lines.map(line=>{let position=fen;const notation=[];for(const move of line.pv.slice(0,8)){if(!mg(position).includes(move))break;notation.push(gensanbase(move,boardgen(position),position,mg(position)));position=ucifen(move,position,boardgen(position),{}).f;}return (line.kind==='mate'?'#'+line.value:(line.value/100).toFixed(2))+' · '+notation.join(' ');}).join('\n');
 }catch(error){if(token===generation)$('engine-lines').textContent=error.message;}}
const hintsEnabled=ChessilHintToggle([$('hint'),$('mobile-hint')],enabled=>{
 if(enabled)hint();
 else if(!awaiting){view.guidance=null;view.drawOverlays();}
});
$('restart').onclick=restartLesson;
$('mobile-restart').onclick=restartLesson;
$('result').onclick=()=>lastResult?.();
$('reconnect').onclick=reconnect;
if($('search'))$('search').oninput=library;
if(section==='openings'){for(const id of ['side','depth'])$(id).onchange=restartLesson;$('tools').ontoggle=()=>updateTools();$('autoplay-stop').onclick=()=>{autoplay?.cancel();$('autoplay').hidden=true;status('Round complete. Restart when ready.');};}
ChessilLearningNavigation.mount(app,'learning');
document.addEventListener('chessil:preferences',()=>{view.drawOverlays();if(engineSignature&&signature()!==engineSignature){generation++;dropEngine();busy=false;if(!awaiting&&!ended)turn();}book=null;});
window.addEventListener('pagehide',()=>{autoplay?.cancel();generation++;clearTimeout(openingTimer);dropEngine();clearGuide();view.cancel();});window.addEventListener('pageshow',event=>{if(event.persisted&&lesson)select(lesson);});
// Read-only diagnostic snapshot is useful for accessibility and integration tests.
window.ChessilLearning={snapshot:()=>({lesson:lesson?.id,fen,side,moves:moves.slice(),busy,awaiting:!!awaiting,ended,phase:coordinatePhase,target})};
(async()=>{try{await ChessilPreferences.ready;const response=await fetch('/api/training/curriculum');if(!response.ok)throw Error('Lessons could not load.');const data=await response.json();lessons=section==='openings'?[{id:'opening-drill',title:'Opening practice',fen:initial,goal:'hold'}]:data.courses[section];
 try{const saved=await fetch('/api/training/progress');if(saved.ok){const state=await saved.json();account=!!state.account;progress=account?state.progress||{}:JSON.parse(localStorage.getItem(storage)||'{}');}}catch(_){account=null;}
 const id=new URL(location.href).searchParams.get('lesson');select(lessons.find(l=>l.id===id)||lessons[0]);
 }catch(error){status(error.message||'Lessons could not load. Refresh to retry.');}})();
},{once:true});
