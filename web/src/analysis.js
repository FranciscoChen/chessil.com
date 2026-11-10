/* Post-game review. The scan owns immutable game positions; exploration owns a
 * separate FEN. Neither can mutate the authoritative game history. */
(()=>{
'use strict';
const initial='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const key=fen=>{const fields=fen.split(' ').slice(0,4);if(fields[3]!=='-'&&!mg(fen).some(move=>move.slice(2,4)===fields[3]&&boardgen(fen)[move.slice(0,2)].p==='p'&&move[0]!==move[2]))fields[3]='-';return fields.join(' ');};
const magnitude=score=>score.kind==='mate'?(score.value>0?100000-Math.min(99,score.value)*100:score.value<0?-100000+Math.min(99,-score.value)*100:-100000):score.value;
const whiteScore=(score,fen)=>magnitude(score)*(fen.split(' ')[1]==='w'?1:-1);
const scoreText=(score,fen)=>{if(!score)return '—';const sign=fen.split(' ')[1]==='w'?1:-1;if(score.kind==='mate')return (whiteScore(score,fen)>=0?'':'−')+'M'+Math.abs(score.value);const value=score.value*sign/100;return (value>0?'+':'')+value.toFixed(2);};
let panel,button,bookPanel,bookButton,tools,engine,positions=[],history=[],scores=new Map(),findings=[],book={},opened=false,engineReady=false,token=0,selected=-1,position=initial,exploring=false,autoplay=true,autoplayRun=null,scanning=false,originalState,originalSubmit,internal=false,viewEpoch=0,suggestionView=false,guide=null,perspective='both',engineLoading=false,processed=new Set(),engineConfig='',bookEpoch=0,bookPath=[];
const leelaBook=new ChessilOpeningBook();
const $=id=>document.getElementById('analysis-'+id);
const status=value=>{$('status').textContent=value;};
function cancelCountdown(){autoplayRun?.cancel();autoplayRun=null;$('countdown').hidden=true;}
function pause(){autoplay=false;cancelCountdown();controls();}
const included=item=>perspective==='both'||(item.ply%2?'w':'b')===perspective;
function adjacent(direction){for(let i=selected+direction;i>=0&&i<findings.length;i+=direction)if(included(findings[i]))return i;return -1;}
function controls(){if(!panel)return;$('book-return').hidden=!exploring;$('engine-toggle').textContent=engineReady||engineLoading?'Stop engine':'Start engine';$('engine-toggle').setAttribute('aria-pressed',String(engineReady||engineLoading));const eligible=findings.filter(included);$('autoplay').textContent=autoplay?'Pause':'Play backward';$('autoplay').setAttribute('aria-pressed',String(autoplay));$('previous').disabled=adjacent(-1)<0;$('next').disabled=adjacent(1)<0;$('finding').textContent=eligible.length?`${eligible.length} review moments`:(scanning?'Analyzing every move…':'No review moments for this side');}
function schedule(){
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
 boardView.setOrientation(side);
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
function linesDisplay(){const lines=scores.get(position)||[];$('lines').replaceChildren();for(const line of lines){if(!line.pv.length)continue;const b=document.createElement('button');b.type='button';b.className='ui-button ui-secondary analysis-line';b.textContent=scoreText(line,perspective==='b'?position.replace(/ [wb] /,position.split(' ')[1]==='w'?' b ':' w '):position)+'  '+pvText(line.pv,position);b.onclick=()=>play(line.pv[0]);$('lines').append(b);}}
async function bookDisplay(){
 if(!bookPanel||bookPanel.hidden)return;
 const epoch=++bookEpoch,fen=position,entry=book[key(fen)];$('book-name').textContent=entry?.names?.map(n=>n.join(' · ')).slice(0,2).join(' / ')||'';$('book-back').disabled=!bookPath.length;$('book-moves').replaceChildren();$('book-note').textContent='Loading Leela priors…';
 try{const result=await leelaBook.lookup(key(fen));if(epoch!==bookEpoch||!opened||bookPanel.hidden)return;
  for(const [move,label,weight,total] of result.moves){if(!mg(fen).includes(move))continue;const probability=weight/total,b=document.createElement('button');b.type='button';b.className='book-move';b.style.setProperty('--book-prior',probability*100+'%');const name=document.createElement('strong'),prior=document.createElement('span');name.textContent=label;prior.textContent=(probability*100).toFixed(1)+'%';b.append(name,prior);b.setAttribute('aria-label',label+', book prior '+prior.textContent);b.onclick=()=>play(move);$('book-moves').append(b);}
  $('book-note').textContent=result.moves.length?result.name+' · normalized book priors, not win probabilities.':'Outside the Leela book. Navigate back to an opening position.';
 }catch(error){if(epoch===bookEpoch)$('book-note').textContent=error.message+'. Revisit the position to retry.';}
}
function renderDetails(){evalDisplay();linesDisplay();bookDisplay();controls();}
function setPosition(fen){bookPath=[];clearGuide();position=fen;viewEpoch++;annotate(null);renderDetails();}
function reveal(index){if(index<0||index>=findings.length)return;cancelCountdown();clearGuide();selected=index;const item=findings[index],move=history[item.ply-1];internal=true;gamereplay(item.ply-1,true);internal=false;position=positions[item.ply-1];exploring=false;viewEpoch++;annotate(item);
 suggestionView=true;
 const explanation=`${Math.ceil(item.ply/2)}${item.ply%2?'.':'…'} ${san(move,position)} ${item.symbol} — ${item.description} Try ${san(item.alternatives[0].pv[0],position)}.`;
 $('explanation').textContent=explanation;
 const marker=movesList.querySelector(`.analysis-marker[data-ply="${item.ply}"]`);marker?.setAttribute('aria-current','step');if(marker){const outer=movesList.getBoundingClientRect(),inner=marker.getBoundingClientRect();if(inner.right>outer.right)movesList.scrollLeft+=inner.right-outer.right;else if(inner.left<outer.left)movesList.scrollLeft+=inner.left-outer.left;}
 const target=document.querySelector(`cg-board square.annotation-suggestion[data-square="${item.alternatives[0].pv[0].slice(2,4)}"]`);
 guide=ChessilHighlight.show(target,{text:explanation,actions:false,placement:'bottom',subtle:true,areas:[...document.querySelectorAll('cg-board square.annotation-suggestion')]});
 $('alternatives').replaceChildren();for(const line of item.alternatives){const b=document.createElement('button');b.type='button';b.className='ui-button ui-secondary analysis-line';b.textContent='Better: '+pvText(line.pv,position);b.onclick=()=>play(line.pv[0]);$('alternatives').append(b);}renderDetails();schedule();}
async function evaluate(fen,options){const legal=mg(fen);if(!legal.length)return [{kind:incheck(fen)?'mate':'cp',value:0,depth:0,pv:[]}];return engine.search(fen,options);}
async function play(move){if(!opened||!mg(position).includes(move)){boardView.acknowledge();return;}pause();clearGuide();bookPath.push(position);position=ucifen(move,position,boardgen(position),{}).f;exploring=true;annotate(null);boardView.render(boardgen(position),move,true);$('explanation').textContent='Exploring an alternative. Return to the game to continue review.';const mine=++viewEpoch,run=token;renderDetails();if(!engineReady)return;try{const lines=await evaluate(position);if(run!==token||mine!==viewEpoch)return;scores.set(position,lines);renderDetails();}catch(error){if(run===token)status(error.message);}}
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
 if(review){tools.prepend(panel);tools.scrollTop=0;}
 if(opened){if(review&&panel.hidden){panel.hidden=false;button.disabled=true;autoplay=true;await startEngine();}return;}
 if(!gamefinished||stat<1||stat>8||!uci.length)return;
 opened=true;engineReady=false;exploring=false;const run=++token;history=uci.slice();positions=[initial];for(const move of history)positions.push(ucifen(move,positions.at(-1),boardgen(positions.at(-1)),{}).f);
 processed=new Set();bookPath=[];scores=new Map();findings=[];movesList.querySelectorAll('.analysis-marker').forEach(el=>el.remove());movesList.querySelectorAll('[data-analysis]').forEach(entry=>{delete entry.dataset.analysis;entry.removeAttribute('title');entry.removeAttribute('aria-label');});selected=-1;autoplay=review;scanning=review;perspective=playerside==='w'||playerside==='b'?playerside:'both';$('perspective').value=perspective;position=positions[a1ti];panel.hidden=!review;tools.hidden=false;document.body.classList.add('analysis-open');button.disabled=review;originalState=boardView.state;originalSubmit=boardView.submit;
 boardView.state=()=>({fen:position,moves:mg(position),turn:position.split(' ')[1],side:position.split(' ')[1],connected:opened,finished:false,watcher:false});boardView.submit=move=>{queueMicrotask(()=>play(move));return true;};
 showActual(review?history.length:a1ti);$('progress').max=history.length;$('progress').value=0;$('explanation').textContent='Reviewing from the end. Review moments appear between the recorded moves.';$('alternatives').replaceChildren();status('Loading local Stockfish and neural network…');controls();
 if(review)await startEngine();

}
function stopEngine(){token++;viewEpoch++;engine?.close();engineReady=false;engineLoading=false;scanning=false;pause();status('Engine stopped. Book exploration and saved evaluations remain available.');controls();}
async function startEngine(){
 if(!opened||engineReady||engineLoading)return;
 const settings=ChessilPreferences.get().analysis,signature=JSON.stringify(settings);
 if(engineConfig&&signature!==engineConfig){scores.clear();processed.clear();findings=[];selected=-1;movesList.querySelectorAll('.analysis-marker').forEach(el=>el.remove());movesList.querySelectorAll('[data-analysis]').forEach(el=>delete el.dataset.analysis);$('progress').value=0;clearGuide();annotate(null);}
 engineConfig=signature;const run=++token;engineLoading=true;engine=new ChessilLocalEngine();status('Starting local engine…');controls();
 try{const manifest=await engine.load(settings);if(run!==token)return;engineLoading=false;engineReady=true;$('engine').textContent=manifest.name+' · '+engine.settings.threads+' thread · '+engine.settings.hash+' MB';$('source').href=manifest.source;renderDetails();
  if(exploring){const current=position,epoch=viewEpoch,lines=await evaluate(current);if(run!==token)return;if(epoch===viewEpoch){scores.set(current,lines);renderDetails();}}
  await scan(run);
 }catch(error){if(run===token){engineLoading=false;scanning=false;engineReady=false;status(error.message+' Press Start engine to retry.');pause();engine?.close();controls();}}
}

function closeWorkspace(){if(!opened)return;opened=false;engineReady=false;engineLoading=false;bookEpoch++;token++;viewEpoch++;clearGuide();cancelCountdown();engine?.close();boardView.state=originalState;boardView.submit=originalSubmit;orientReview(playerside==='b'?'b':'w');annotate(null);panel.hidden=true;bookPanel.hidden=true;bookButton.setAttribute('aria-expanded','false');tools.hidden=true;document.body.classList.remove('analysis-open');internal=true;gamereplay(a1ti);internal=false;update();}
function close(){if(bookPanel.hidden){closeWorkspace();return;}stopEngine();clearGuide();annotate(null);panel.hidden=true;tools.scrollTop=0;update();}
async function toggleBook(){
 if(!bookPanel.hidden){bookPanel.hidden=true;bookEpoch++;bookButton.setAttribute('aria-expanded','false');if(panel.hidden)closeWorkspace();return;}
 bookPanel.hidden=false;tools.prepend(bookPanel);tools.scrollTop=0;bookButton.setAttribute('aria-expanded','true');await open(false);bookDisplay();
 if(!Object.keys(book).length)fetch('/engine/openings.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{book=data;bookDisplay();}).catch(()=>{});
}
function returnToGame(){pause();exploring=false;const ply=suggestionView?findings[selected].ply:a1ti;clearGuide();gamereplay(ply);}
function update(){if(!button)return;button.hidden=bookButton.hidden=!(gamefinished&&stat>=1&&stat<=8&&uci.length);button.disabled=opened&&!panel.hidden;}

document.addEventListener('DOMContentLoaded',()=>{
 if(!document.querySelector('moves-panel'))return;button=document.createElement('button');button.type='button';button.id='analyze-game';button.className='ui-button ui-primary';button.textContent='Analyze game';button.hidden=true;button.onclick=()=>open();document.querySelector('.game-heading-actions').prepend(button);
 panel=document.createElement('section');panel.id='analysis-panel';panel.className='analysis-panel';panel.hidden=true;panel.setAttribute('aria-label','Game analysis');panel.innerHTML=`<div class="analysis-heading"><h2>Game analysis</h2><button id="analysis-close" class="ui-button ui-quiet" type="button">Close</button></div><div class="engine-toolbar"><button id="analysis-engine-toggle" type="button" class="ui-button ui-secondary">Start engine</button><a href="/settings#analysis-engine-settings">Engine settings</a></div><p id="analysis-engine">Local Stockfish</p><p id="analysis-status" role="status"></p><progress id="analysis-progress" class="ui-progress" max="1" value="0" aria-label="Analysis progress"></progress><div class="analysis-evaluation"><strong id="analysis-score">—</strong><div id="analysis-wdl" class="wdl-bar" role="img" aria-label="Win, draw, loss estimates unavailable"><div class="wdl-track"><span data-wdl="win"></span><span data-wdl="draw"></span><span data-wdl="loss"></span></div><div class="wdl-labels" aria-hidden="true"><span>Win —</span><span>Draw —</span><span>Loss —</span></div></div><span id="analysis-depth"></span></div><div id="analysis-eval" class="analysis-eval" role="img" aria-label="Position evaluation"><span id="analysis-eval-white"></span></div><div class="analysis-controls"><button id="analysis-previous" type="button" class="ui-button ui-secondary">Previous</button><button id="analysis-next" type="button" class="ui-button ui-secondary">Next moment</button><button id="analysis-autoplay" type="button" class="ui-button ui-secondary">Pause autoplay</button></div><label class="analysis-perspective">Review <select id="analysis-perspective"><option value="w">White</option><option value="b">Black</option><option value="both">Both sides</option></select></label><p id="analysis-finding"></p><div id="analysis-countdown" hidden>Next moment in <span data-countdown></span><div class="ui-meter"><span class="ui-meter-fill"></span></div></div><p id="analysis-explanation"></p><div id="analysis-alternatives"></div><button id="analysis-return" class="ui-button ui-quiet" type="button">Return to game position</button><details><summary>Engine lines</summary><div id="analysis-lines"></div></details><p class="analysis-note ui-mobile-secondary">Estimates from a bounded local search. Explore alternatives on the board.</p><a id="analysis-source" href="/engine/manifest.json">Engine source &amp; license</a>`;
 bookButton=document.createElement('button');bookButton.id='open-book';bookButton.type='button';bookButton.className='ui-button ui-secondary';bookButton.textContent='Book';bookButton.setAttribute('aria-label','Opening book');bookButton.title='Opening book';bookButton.hidden=true;bookButton.setAttribute('aria-controls','analysis-book-panel');bookButton.setAttribute('aria-expanded','false');bookButton.onclick=toggleBook;button.after(bookButton);
 bookPanel=document.createElement('section');bookPanel.id='analysis-book-panel';bookPanel.className='book-panel';bookPanel.hidden=true;bookPanel.setAttribute('aria-labelledby','analysis-book-title');bookPanel.innerHTML=`<div class="book-heading"><h2 id="analysis-book-title">Opening book</h2><button id="analysis-book-close" type="button" class="ui-button ui-quiet" aria-label="Close opening book">Close</button></div><div class="book-controls"><button id="analysis-book-back" type="button" class="ui-button ui-secondary" disabled>← Back</button><button id="analysis-book-return" type="button" class="ui-button ui-quiet" hidden>Return to game position</button></div><p id="analysis-book-name"></p><div id="analysis-book-moves"></div><small id="analysis-book-note" role="status"></small>`;
 tools=document.createElement('div');tools.className='board-tools';tools.hidden=true;tools.append(panel,bookPanel);document.querySelector('.round__app').append(tools);$('book-close').onclick=toggleBook;$('book-return').onclick=returnToGame;
 const evaluation=document.createElement('div');evaluation.className='board-evaluation';evaluation.setAttribute('aria-label','Position evaluation');evaluation.append($('score'),$('eval'),$('wdl'),$('depth'));document.querySelector('.round__app').append(evaluation);
 $('engine-toggle').onclick=()=>engineReady||engineLoading?stopEngine():startEngine();$('book-back').onclick=()=>{if(!bookPath.length)return;pause();position=bookPath.pop();viewEpoch++;clearGuide();annotate(null);boardView.render(boardgen(position));renderDetails();};$('perspective').onchange=changePerspective;$('close').onclick=close;$('previous').onclick=()=>{pause();reveal(adjacent(-1));};$('next').onclick=()=>{pause();reveal(adjacent(1));};$('autoplay').onclick=()=>{if(autoplay)pause();else{autoplay=true;controls();if(a1ti===0)showActual(history.length);schedule();}};$('return').onclick=returnToGame;update();
});
document.addEventListener('chessil:game-state',update);
document.addEventListener('chessil:preferences',()=>{if(opened&&engineConfig!==JSON.stringify(ChessilPreferences.get().analysis)){stopEngine();status('Engine settings changed. Press Start engine to apply.');}});
document.addEventListener('chessil:review',()=>{if(internal)return;if(!opened){if(positions[a1ti]&&gamefinished){position=positions[a1ti];evalDisplay();}return;}pause();exploring=false;setPosition(positions[a1ti]);$('explanation').textContent='Game position after move '+a1ti+'.';$('alternatives').replaceChildren();controls();});

function step(direction){
 pause();
 if(suggestionView){const ply=findings[selected].ply;clearGuide();gamereplay(direction>0?ply:ply-1);return;}
 const target=direction>0?a1ti+1:a1ti,index=findings.findIndex(item=>item.ply===target&&included(item));
 if(index>=0)reveal(index);else gamereplay(a1ti+direction);
}
document.addEventListener('keydown',event=>{
 if(!opened||panel.hidden||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||document.querySelector('dialog[open]')||event.target.closest?.('input,textarea,select,[contenteditable]'))return;
 if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopImmediatePropagation();step(event.key==='ArrowRight'?1:-1);}
},true);
document.addEventListener('click',event=>{
 if(!opened||panel.hidden)return;const button=event.target.closest('#sb,#fw');if(!button)return;event.preventDefault();event.stopPropagation();step(button.id==='fw'?1:-1);
},true);
window.addEventListener('pagehide',()=>{guide?.close();token++;engine?.close();autoplayRun?.cancel();});
})();
