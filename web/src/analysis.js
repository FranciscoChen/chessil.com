/* Shared engine/book tools for post-game review and the standalone study board.
 * Game exploration never mutates authoritative history; the study adapter owns
 * its local variation tree. Both use the same engine lifecycle and UI. */
(()=>{
'use strict';
const study=!!window.ChessilStudy;if(!study)return;
const reviewGame=!!new URLSearchParams(location.search).get('game'),freeStudy=!reviewGame;
const initial='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const key=fen=>{const fields=fen.split(' ').slice(0,4);if(fields[3]!=='-'&&!mg(fen).some(move=>move.slice(2,4)===fields[3]&&boardgen(fen)[move.slice(0,2)].p==='p'&&move[0]!==move[2]))fields[3]='-';return fields.join(' ');};
const magnitude=score=>score.kind==='mate'?(score.value>0?100000-Math.min(99,score.value)*100:score.value<0?-100000+Math.min(99,-score.value)*100:-100000):score.value;
const whiteScore=(score,fen)=>magnitude(score)*(fen.split(' ')[1]==='w'?1:-1);
const scoreText=(score,fen)=>{if(!score)return '—';const sign=fen.split(' ')[1]==='w'?1:-1;if(score.kind==='mate')return (whiteScore(score,fen)>=0?'':'−')+'M'+Math.abs(score.value);const value=score.value*sign/100;return (value>0?'+':'')+value.toFixed(2);};
let panel,bookPanel,tools,engine,positions=[],history=[],scores=new Map(),findings=[],book={},opened=false,engineReady=false,token=0,selected=-1,position=initial,exploring=false,autoplay=true,autoplayRun=null,scanning=false,internal=false,viewEpoch=0,suggestionView=false,guide=null,perspective='both',engineLoading=false,processed=new Set(),engineConfig='',bookEpoch=0;
const leelaBook=new ChessilOpeningBook();
const $=id=>document.getElementById('analysis-'+id);
const status=value=>{$('status').textContent=value;panel.classList.toggle('engine-error',/unavailable|timed out|retry|failed|could not/i.test(value));};
function cancelCountdown(){autoplayRun?.cancel();autoplayRun=null;$('countdown').hidden=true;}
function pause(){autoplay=false;cancelCountdown();controls();}
const included=item=>perspective==='both'||(item.ply%2?'w':'b')===perspective;
function adjacent(direction){for(let i=selected+direction;i>=0&&i<findings.length;i+=direction)if(included(findings[i]))return i;return -1;}
function controls(){if(!panel)return;const active=engineReady||engineLoading;const control=(id,symbol,label)=>{const el=$(id);el.innerHTML=ChessilIcons.svg(symbol);el.setAttribute('aria-label',label);el.title=label;};control('engine-toggle',active?'stop':'play',active?'Stop engine':'Start engine');$('engine-toggle').setAttribute('aria-pressed',String(active));control('autoplay',autoplay?'pause':'play',autoplay?'Pause review':'Play backward');$('autoplay').setAttribute('aria-pressed',String(autoplay));$('previous').disabled=adjacent(-1)<0;$('next').disabled=adjacent(1)<0;}

function schedule(){
 if(freeStudy)return;
 if(!opened||!autoplay||autoplayRun)return;
 if(a1ti===0&&!suggestionView){cancelCountdown();autoplay=false;controls();return;}
 if(!suggestionView&&!scores.has(positions[a1ti-1]))return;
 $('countdown').hidden=false;
 autoplayRun=ChessilTiming.start($('countdown'),{seconds:suggestionView?5:1.4,label:'Previous move',format:n=>n+'s',onFinish:()=>{autoplayRun=null;if(!opened||!autoplay)return;
  if(suggestionView){clearGuide();showActual(a1ti);}
  else {const index=findings.findIndex(item=>item.ply===a1ti&&included(item));if(index>=0)reveal(index);else showActual(a1ti-1);}
  schedule();
 }});
}
function showActual(ply){clearGuide();internal=true;gamereplay(ply,true);internal=false;exploring=false;position=positions[a1ti];viewEpoch++;annotate(null);$('alternatives').replaceChildren();$('explanation').textContent=a1ti?'Position after move '+Math.ceil(a1ti/2)+'.':'Starting position. Review complete.';renderDetails();}
function orientReview(side){
 boardView.setOrientation(side);if(study)return;
 const top=document.querySelector('.game-player--top'),bottom=document.querySelector('.game-player--bottom');
 const topIsWhite=!!top.querySelector('.player-mark--white');
 if(topIsWhite!==(side==='b'))for(const selector of ['.ruser','.rclock']){const first=top.querySelector(selector),second=bottom.querySelector(selector);top.append(second);bottom.append(first);}
 top.querySelector('.rclock').classList.replace('rclock-bottom','rclock-top');bottom.querySelector('.rclock').classList.replace('rclock-top','rclock-bottom');
}
function changePerspective(){
 perspective=$('perspective').value;pause();selected=-1;showActual(a1ti);
 findings.forEach(item=>{const entry=movesList.querySelector(`move-entry[ply="${item.ply}"]`),marker=entry?.querySelector('.analysis-marker');if(marker)marker.hidden=!included(item);if(entry){if(included(item))entry.dataset.analysis=item.type;else delete entry.dataset.analysis;}});
 const orientation=perspective==='both'?(playerside==='b'?'b':'w'):perspective;
 orientReview(orientation);renderDetails();
}
function san(move,fen){try{return gensanbase(move,boardgen(fen),fen,mg(fen));}catch(_){return move;}}
function pvText(pv,fen){const out=[];for(const move of pv.slice(0,8)){if(!mg(fen).includes(move))break;out.push(san(move,fen));fen=ucifen(move,fen,boardgen(fen),{}).f;}return out.join(' ');}
function clearGuide(){guide?.close();guide=null;suggestionView=false;movesList?.querySelectorAll('.analysis-marker[aria-current]').forEach(el=>el.removeAttribute('aria-current'));}
function annotate(finding){boardView.annotations=finding?[{square:history[finding.ply-1].slice(0,2),type:'error'},{square:history[finding.ply-1].slice(2,4),type:'error'},...finding.alternatives[0].pv[0].match(/.{2}/g).slice(0,2).map(square=>({square,type:'suggestion'}))]:[];boardView.drawOverlays();}
function evalDisplay(){
 const score=scores.get(position)?.[0],white=score?whiteScore(score,position):0,sign=perspective==='b'?-1:1;
 $('score').textContent=score?scoreText(score,sign===1?position:position.replace(/ [wb] /,position.split(' ')[1]==='w'?' b ':' w ')):'—';
 const percent=score?Math.max(1,Math.min(99,50+50*Math.tanh(white/500))):50;$('eval-white').style.width=(sign===1?percent:100-percent)+'%';$('eval-white').style.background=perspective==='b'?'var(--piece-black)':'var(--piece-white)';$('eval').style.background=perspective==='b'?'var(--piece-white)':'var(--piece-black)';$('eval').setAttribute('aria-label',score?(perspective==='b'?'Black':'White')+' evaluation '+$('score').textContent:'Evaluation available after the game');$('depth').textContent=score?'d'+score.depth:'';
 let wdl=score?.wdl;
 if(score?.kind==='mate')wdl=score.value>0?[1000,0,0]:[0,0,1000];
 if(score&&score.kind==='cp'&&!score.pv.length)wdl=[0,1000,0];
 const labels=perspective==='both'?['White','Draw','Black']:['Win','Draw','Loss'];
 let percentages=null;
 if(wdl){const values=wdl.slice();if(position.split(' ')[1]==='b')values.reverse();if(perspective==='b')values.reverse();const total=values.reduce((a,b)=>a+b,0)||1000,win=Math.round(values[0]*100/total),loss=Math.round(values[2]*100/total);percentages=[win,100-win-loss,loss];}
 $('wdl').dataset.side=perspective==='b'?'b':'w';
 $('wdl').classList.toggle('is-unknown',!percentages);
 $('wdl').setAttribute('aria-label',percentages?labels.map((label,i)=>label+' '+percentages[i]+'%').join(', '):'Win, draw, loss estimates unavailable');$('wdl').title=$('wdl').getAttribute('aria-label');
 $('wdl').querySelectorAll('[data-wdl]').forEach((el,i)=>{el.style.flexBasis=(percentages?percentages[i]:[33,34,33][i])+'%';el.textContent='';$('wdl').querySelectorAll('.wdl-labels span')[i].textContent=labels[i]+' '+(percentages?percentages[i]+'%':'—');el.setAttribute('aria-hidden','true');});

}
function linesDisplay(){const lines=scores.get(position)||[];$('lines').replaceChildren();for(const line of lines){if(!line.pv.length)continue;const button=document.createElement('button'),score=document.createElement('strong'),moves=document.createElement('span');button.type='button';button.className='engine-line';score.textContent=scoreText(line,perspective==='b'?position.replace(/ [wb] /,position.split(' ')[1]==='w'?' b ':' w '):position);moves.textContent=pvText(line.pv,position);button.append(score,moves);button.title=score.textContent+' '+moves.textContent;button.onclick=()=>play(line.pv[0]);$('lines').append(button);}}

async function bookDisplay(){
 if(!bookPanel||bookPanel.hidden)return;
 const epoch=++bookEpoch,fen=position,entry=book[key(fen)];$('book-name').textContent=entry?.names?.map(n=>n.join(' · ')).slice(0,2).join(' / ')||'';$('book-moves').replaceChildren();$('book-note').textContent='';bookPanel.setAttribute('aria-busy','true');
 try{const result=await leelaBook.lookup(key(fen));if(epoch!==bookEpoch||!opened||bookPanel.hidden)return;
  for(const [move,label,weight,total] of result.moves){if(!mg(fen).includes(move))continue;const probability=weight/total,b=document.createElement('button');b.type='button';b.className='book-move';b.style.setProperty('--book-prior',probability*100+'%');const name=document.createElement('strong'),prior=document.createElement('span');name.textContent=label;prior.textContent=(probability*100).toFixed(1)+'%';b.append(name,prior);b.setAttribute('aria-label',label+', book prior '+prior.textContent);b.onclick=()=>play(move);$('book-moves').append(b);}
  bookPanel.classList.toggle('is-empty',!result.moves.length);bookPanel.setAttribute('aria-busy','false');bookPanel.title=result.name+' · normalized move priors';
 }catch(error){if(epoch===bookEpoch){bookPanel.setAttribute('aria-busy','false');$('book-note').textContent='Book unavailable';$('book-note').title=error.message;}}
}
function renderDetails(){evalDisplay();linesDisplay();bookDisplay();controls();}
function setPosition(fen){clearGuide();position=fen;viewEpoch++;annotate(null);renderDetails();}
function reveal(index){if(index<0||index>=findings.length)return;cancelCountdown();clearGuide();selected=index;const item=findings[index],move=history[item.ply-1];internal=true;gamereplay(item.ply-1,true);internal=false;position=positions[item.ply-1];exploring=false;viewEpoch++;annotate(item);
 suggestionView=true;
 const explanation=`${Math.ceil(item.ply/2)}${item.ply%2?'.':'…'} ${san(move,position)} ${item.symbol} — ${item.description} Try ${san(item.alternatives[0].pv[0],position)}.`;
 $('explanation').textContent=explanation;
 const marker=movesList.querySelector(`.analysis-marker[data-ply="${item.ply}"]`);marker?.setAttribute('aria-current','step');if(marker){const outer=movesList.getBoundingClientRect(),inner=marker.getBoundingClientRect();if(inner.right>outer.right)movesList.scrollLeft+=inner.right-outer.right;else if(inner.left<outer.left)movesList.scrollLeft+=inner.left-outer.left;}
 const target=document.querySelector(`cg-board square.annotation-suggestion[data-square="${item.alternatives[0].pv[0].slice(2,4)}"]`);
 guide=ChessilHighlight.show(target,{text:explanation,actions:false,placement:'bottom',subtle:true,areas:[...document.querySelectorAll('cg-board square.annotation-suggestion')]});
 $('alternatives').replaceChildren();for(const line of item.alternatives){const b=document.createElement('button');b.type='button';b.className='engine-line';b.textContent=pvText(line.pv,position);b.onclick=()=>play(line.pv[0]);$('alternatives').append(b);}renderDetails();schedule();}
async function evaluate(fen,options){const legal=mg(fen);if(!legal.length)return [{kind:incheck(fen)?'mate':'cp',value:0,depth:0,pv:[]}];return engine.search(fen,options);}
async function play(move){if(freeStudy){ChessilStudy.play(move);return;}if(!opened||!mg(position).includes(move)){boardView.acknowledge();return;}pause();clearGuide();position=ucifen(move,position,boardgen(position),{}).f;exploring=true;annotate(null);boardView.render(boardgen(position),move,true);$('explanation').textContent='Exploring an alternative. Return to the game to continue review.';const mine=++viewEpoch,run=token;renderDetails();if(!engineReady)return;try{const lines=await evaluate(position);if(run!==token||mine!==viewEpoch)return;scores.set(position,lines);renderDetails();}catch(error){if(run===token)status(error.message);}}
async function scan(run){
 scanning=true;let after=scores.get(positions.at(-1))||await evaluate(positions.at(-1),{history});if(run!==token)return;scores.set(positions.at(-1),after);
 for(let ply=history.length;ply>0;ply--){if(run!==token)return;const beforeFen=positions[ply-1];if(processed.has(ply)){after=scores.get(beforeFen);continue;}const before=scores.get(beforeFen)||await evaluate(beforeFen,{history:history.slice(0,ply-1)});if(run!==token)return;scores.set(beforeFen,before);
  const mover=beforeFen.split(' ')[1]==='w'?1:-1;let loss=(whiteScore(before[0],beforeFen)-whiteScore(after[0],positions[ply]))*mover;const played=history[ply-1];
  if(loss>=100&&before[0].pv[0]!==played){const forced=await evaluate(beforeFen,{multiPV:1,nodes:180000,movetime:1000,searchmoves:[played],history:history.slice(0,ply-1)});if(run!==token)return;loss=magnitude(before[0])-magnitude(forced[0]);
   const alternatives=before.filter(line=>line.pv[0]!==played&&magnitude(before[0])-magnitude(line)<100).slice(0,2);
   const judgment=ChessilAnalysisJudgment.judge(before[0],forced[0],loss);
   if(judgment&&alternatives.length){const item={ply,loss,...judgment,alternatives};findings.push(item);const entry=movesList.querySelector(`move-entry[ply="${ply}"]`);if(entry){
    entry.dataset.analysis=item.type;
    const marker=document.createElement('button');marker.type='button';marker.className='analysis-marker';marker.dataset.ply=ply;marker.textContent=item.symbol;marker.hidden=!included(item);if(!included(item))delete entry.dataset.analysis;marker.title=item.description;marker.setAttribute('aria-label','Review suggestion before '+san(played,beforeFen));marker.onclick=event=>{event.stopPropagation();if(!opened)return;pause();reveal(findings.indexOf(item));};entry.append(marker);
   }
    controls();
   }

  }
  processed.add(ply);after=before;$('progress').value=history.length-ply+1;status(`Reviewed ${history.length-ply+1} of ${history.length} moves, working backward.`);if(!exploring)renderDetails();schedule();
 }
 if(run!==token)return;scanning=false;status(`Review complete · ${findings.filter(item=>item.outcome).length} outcome-changing mistakes · ${findings.filter(item=>!item.outcome).length} suggestions.`);if(!findings.length)$('explanation').textContent='No significant improvement found in this review. Explore the game or opening book.';controls();
}
async function open(review=true){
 if(!ChessilStudy.ready)return;
 if(opened){if(review){autoplay=!freeStudy;await startEngine();}return;}
 if(!study&&(!gamefinished||stat<1||stat>8||!uci.length))return;
 opened=true;engineReady=false;exploring=false;const run=++token;history=uci.slice();positions=[initial];for(const move of history)positions.push(ucifen(move,positions.at(-1),boardgen(positions.at(-1)),{}).f);
 processed=new Set();scores=new Map();findings=[];movesList.querySelectorAll('.analysis-marker').forEach(el=>el.remove());movesList.querySelectorAll('[data-analysis]').forEach(entry=>{delete entry.dataset.analysis;entry.removeAttribute('title');entry.removeAttribute('aria-label');});selected=-1;autoplay=review&&!freeStudy;scanning=review&&!freeStudy;perspective=playerside==='w'||playerside==='b'?playerside:'both';$('perspective').value=perspective;orientReview(perspective==='both'?(playerside==='b'?'b':'w'):perspective);position=positions[a1ti];panel.hidden=false;bookPanel.hidden=false;tools.hidden=false;document.body.classList.add('analysis-open');
 boardView.state=()=>({fen:position,moves:mg(position),turn:position.split(' ')[1],side:position.split(' ')[1],connected:opened,finished:false,watcher:false});boardView.submit=move=>{queueMicrotask(()=>play(move));return true;};
 showActual(review&&!freeStudy?history.length:a1ti);$('progress').max=history.length;$('progress').value=0;$('explanation').textContent='Reviewing from the end. Review moments appear between the recorded moves.';$('alternatives').replaceChildren();status('Loading local Stockfish and neural network…');controls();
 loadBookNames();if(review)await startEngine();

}
let studySearching=false,studyQueued=false;
async function evaluateStudy(){
 if(!engineReady||!opened)return;studyQueued=true;if(studySearching)return;studySearching=true;const run=token;
 try{while(studyQueued&&engineReady&&opened&&run===token){studyQueued=false;const current=position,epoch=viewEpoch;status('Evaluating position…');const lines=await evaluate(current);if(run!==token)return;if(epoch!==viewEpoch)continue;scores.set(current,lines);renderDetails();status('Position evaluated · depth '+lines[0].depth);}}
 catch(error){if(run===token&&engineReady)status(error.message);}
 finally{studySearching=false;if(studyQueued&&engineReady&&opened)evaluateStudy();}
}
function stopEngine(){studyQueued=false;token++;viewEpoch++;engine?.close();engineReady=false;engineLoading=false;scanning=false;pause();status('Engine stopped. Book exploration and saved evaluations remain available.');controls();}
async function startEngine(){
 if(!opened||engineReady||engineLoading)return;
 const settings=ChessilPreferences.get().analysis,signature=JSON.stringify(settings);
 if(engineConfig&&signature!==engineConfig){scores.clear();processed.clear();findings=[];selected=-1;movesList.querySelectorAll('.analysis-marker').forEach(el=>el.remove());movesList.querySelectorAll('[data-analysis]').forEach(el=>delete el.dataset.analysis);$('progress').value=0;clearGuide();annotate(null);}
 engineConfig=signature;const run=++token;engineLoading=true;engine=new ChessilLocalEngine();status('Starting local engine…');controls();
 try{const manifest=await engine.load(settings);if(run!==token)return;engineLoading=false;engineReady=true;$('source').href=manifest.source;renderDetails();
  if(freeStudy){await evaluateStudy();return;}
  if(exploring){const current=position,epoch=viewEpoch,lines=await evaluate(current);if(run!==token)return;if(epoch===viewEpoch){scores.set(current,lines);renderDetails();}}
  await scan(run);
 }catch(error){if(run===token){engineLoading=false;scanning=false;engineReady=false;status(error.message+' Press Start engine to retry.');pause();engine?.close();controls();}}
}

async function updateEngineName(){await ChessilPreferences.ready;const id=ChessilPreferences.get().analysis.engine;try{const catalog=await ChessilPreferences.engineCatalog();if(id!==ChessilPreferences.get().analysis.engine)return;const name=catalog.engines.find(engine=>engine.id===id)?.name||id;$('engine-name').textContent=name;$('engine-name').title=name;}catch(_){$('engine-name').textContent=id;}}
function loadBookNames(){if(Object.keys(book).length)return;fetch('/engine/openings.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{book=data;bookDisplay();}).catch(()=>{});}
function returnToGame(){pause();exploring=false;const ply=suggestionView?findings[selected].ply:a1ti;clearGuide();gamereplay(ply);}
function update(){if(panel&&!opened&&ChessilStudy.ready)open(false);}

document.addEventListener('DOMContentLoaded',()=>{
 if(!document.querySelector('moves-panel'))return;
 const iconButton=(id,name,label)=>`<button id="analysis-${id}" type="button" class="ui-icon-button analysis-icon" aria-label="${label}" title="${label}">${ChessilIcons.svg(name)}</button>`;
 panel=document.createElement('section');panel.id='analysis-panel';panel.className='analysis-panel engine-card';panel.setAttribute('aria-label','Engine');panel.innerHTML=`<div class="engine-toolbar">${iconButton('engine-toggle','play','Start engine')}<span id="analysis-engine-name" class="engine-name"></span><a id="analysis-source" class="ui-icon-button analysis-icon" href="/engine/manifest.json" aria-label="Engine source and license" title="Engine source and license">${ChessilIcons.svg('source')}</a><button id="analysis-options-toggle" type="button" class="ui-icon-button analysis-icon" aria-label="Engine options" title="Engine options" aria-expanded="false" aria-controls="analysis-options">${ChessilIcons.svg('options')}</button></div><div id="analysis-options" class="engine-options-reveal" inert><div class="engine-options-clip"><div id="analysis-options-fields"></div></div></div><p id="analysis-status" class="analysis-sr-only" role="status"></p><div id="analysis-lines" aria-label="Engine variations"></div>`;
 let optionsRendered=false;
 bookPanel=document.createElement('section');bookPanel.id='analysis-book-panel';bookPanel.className='book-panel';bookPanel.setAttribute('aria-label','Opening book');bookPanel.innerHTML='<p id="analysis-book-name"></p><div id="analysis-book-moves" aria-label="Book moves"></div><small id="analysis-book-note" role="status"></small>';
 tools=document.createElement('div');tools.className='board-tools';tools.hidden=true;tools.append(panel,bookPanel);document.querySelector('.round__app').append(tools);
 const review=document.createElement('section');review.className='review-tools';review.setAttribute('aria-label','Review controls');review.innerHTML=`<div class="analysis-controls">${iconButton('previous','previous','Previous review moment')}${iconButton('autoplay','play','Play backward')}${iconButton('next','next','Next review moment')}${iconButton('return','return','Return to game position')}</div><select id="analysis-perspective" aria-label="Review perspective"><option value="w">White</option><option value="b">Black</option><option value="both">Both sides</option></select><progress id="analysis-progress" class="ui-progress" max="1" value="0" aria-label="Review progress"></progress><div id="analysis-countdown" hidden><span data-countdown></span><div class="ui-meter"><span class="ui-meter-fill"></span></div></div><p id="analysis-explanation" class="analysis-sr-only"></p><div id="analysis-alternatives"></div><div class="analysis-evaluation"><strong id="analysis-score">—</strong><div id="analysis-wdl" class="wdl-bar" role="img" aria-label="Win, draw, loss estimates unavailable"><div class="wdl-track"><span data-wdl="win"></span><span data-wdl="draw"></span><span data-wdl="loss"></span></div><div class="wdl-labels" aria-hidden="true"><span>Win —</span><span>Draw —</span><span>Loss —</span></div></div><span id="analysis-depth"></span></div><div id="analysis-eval" class="analysis-eval" role="img" aria-label="Position evaluation"><span id="analysis-eval-white"></span></div>`;
 document.querySelector('.study-actions').prepend(review);
 const evaluation=document.createElement('div');evaluation.className='board-evaluation';evaluation.setAttribute('aria-label','Position evaluation');evaluation.append($('score'),$('eval'),$('wdl'),$('depth'));document.querySelector('.round__app').append(evaluation);
 $('engine-toggle').onclick=()=>engineReady||engineLoading?stopEngine():startEngine();$('perspective').onchange=changePerspective;$('previous').onclick=()=>{pause();reveal(adjacent(-1));};$('next').onclick=()=>{pause();reveal(adjacent(1));};$('autoplay').onclick=()=>{if(autoplay)pause();else{autoplay=true;controls();if(a1ti===0)showActual(history.length);schedule();}};$('return').onclick=returnToGame;
 $('options-toggle').disabled=true;ChessilPreferences.ready.then(()=>{$('options-toggle').disabled=false;});
 $('options-toggle').onclick=()=>{const expanded=$('options-toggle').getAttribute('aria-expanded')!=='true';$('options-toggle').setAttribute('aria-expanded',String(expanded));$('options').classList.toggle('is-expanded',expanded);$('options').inert=!expanded;if(expanded&&!optionsRendered){optionsRendered=true;ChessilPreferences.renderEngineOptions($('options-fields'),{compact:true}).then(success=>{if(!success)optionsRendered=false;});}};
 updateEngineName();
 history=uci.slice();positions=ChessilStudy.positions();position=positions[a1ti];if(freeStudy){review.querySelector('.analysis-controls').hidden=true;$('progress').hidden=true;}controls();update();renderDetails();

});
document.addEventListener('chessil:game-state',update);
document.addEventListener('chessil:study-loaded',()=>{history=uci.slice();positions=ChessilStudy.positions();position=positions[a1ti];update();renderDetails();if(new URLSearchParams(location.search).get('review')==='1')open();});
document.addEventListener('chessil:preferences',()=>{if(panel)updateEngineName();if(opened&&engineConfig!==JSON.stringify(ChessilPreferences.get().analysis)){stopEngine();status('Engine settings changed. Press Start engine to apply.');}});
document.addEventListener('chessil:review',()=>{if(internal||!panel)return;if(study&&(!opened||freeStudy)){history=uci.slice();positions=ChessilStudy.positions();position=positions[a1ti];viewEpoch++;exploring=false;clearGuide();annotate(null);renderDetails();if(engineReady&&freeStudy)evaluateStudy();return;}if(!opened){if(positions[a1ti]&&gamefinished){position=positions[a1ti];evalDisplay();}return;}pause();exploring=false;setPosition(positions[a1ti]);$('explanation').textContent='Game position after move '+a1ti+'.';$('alternatives').replaceChildren();controls();});

function step(direction){
 pause();
 if(suggestionView){const ply=findings[selected].ply;clearGuide();gamereplay(direction>0?ply:ply-1);return;}
 const target=direction>0?a1ti+1:a1ti,index=findings.findIndex(item=>item.ply===target&&included(item));
 if(index>=0)reveal(index);else gamereplay(a1ti+direction);
}
document.addEventListener('keydown',event=>{
 if(freeStudy||!opened||panel.hidden||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||document.querySelector('dialog[open]')||event.target.closest?.('input,textarea,select,[contenteditable]'))return;
 if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopImmediatePropagation();step(event.key==='ArrowRight'?1:-1);}
},true);
document.addEventListener('click',event=>{
 if(freeStudy||!opened||panel.hidden)return;const button=event.target.closest('#sb,#fw');if(!button)return;event.preventDefault();event.stopPropagation();step(button.id==='fw'?1:-1);
},true);
window.addEventListener('pagehide',()=>{guide?.close();token++;engine?.close();autoplayRun?.cancel();if(study){engineReady=false;engineLoading=false;controls();}});
})();
