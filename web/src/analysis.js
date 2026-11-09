/* Post-game review. The scan owns immutable game positions; exploration owns a
 * separate FEN. Neither can mutate the authoritative game history. */
(()=>{
'use strict';
const initial='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const key=fen=>{const fields=fen.split(' ').slice(0,4);if(fields[3]!=='-'&&!mg(fen).some(move=>move.slice(2,4)===fields[3]&&boardgen(fen)[move.slice(0,2)].p==='p'&&move[0]!==move[2]))fields[3]='-';return fields.join(' ');};
const magnitude=score=>score.kind==='mate'?(score.value>0?100000-Math.min(99,score.value)*100:score.value<0?-100000+Math.min(99,-score.value)*100:-100000):score.value;
const whiteScore=(score,fen)=>magnitude(score)*(fen.split(' ')[1]==='w'?1:-1);
const scoreText=(score,fen)=>{if(!score)return '—';const sign=fen.split(' ')[1]==='w'?1:-1;if(score.kind==='mate')return (whiteScore(score,fen)>=0?'':'−')+'M'+Math.abs(score.value);const value=score.value*sign/100;return (value>0?'+':'')+value.toFixed(2);};
let panel,button,engine,positions=[],history=[],scores=new Map(),findings=[],book={},opened=false,engineReady=false,token=0,selected=-1,position=initial,exploring=false,autoplay=true,autoplayRun=null,scanning=false,originalState,originalSubmit,internal=false,viewEpoch=0,suggestionView=false,guide=null;
const $=id=>document.getElementById('analysis-'+id);
const status=value=>{$('status').textContent=value;};
function cancelCountdown(){autoplayRun?.cancel();autoplayRun=null;$('countdown').hidden=true;}
function pause(){autoplay=false;cancelCountdown();controls();}
function controls(){if(!panel)return;$('autoplay').textContent=autoplay?'Pause autoplay':'Resume autoplay';$('autoplay').setAttribute('aria-pressed',String(autoplay));$('previous').disabled=selected<=0;$('next').disabled=selected+1>=findings.length;$('finding').textContent=findings.length?`${Math.max(0,selected+1)} / ${findings.length} moments`:(scanning?'Looking for review moments…':'No outcome-changing mistakes found');}
function schedule(){if(!opened||!autoplay||autoplayRun||selected+1>=findings.length)return;$('countdown').hidden=false;autoplayRun=ChessilTiming.start($('countdown'),{seconds:6,label:'Next moment',format:n=>n+'s',onFinish:()=>{autoplayRun=null;if(opened&&autoplay)reveal(selected+1);}});}
function san(move,fen){try{return gensanbase(move,boardgen(fen),fen,mg(fen));}catch(_){return move;}}
function pvText(pv,fen){const out=[];for(const move of pv.slice(0,8)){if(!mg(fen).includes(move))break;out.push(san(move,fen));fen=ucifen(move,fen,boardgen(fen),{}).f;}return out.join(' ');}
function clearGuide(){guide?.close();guide=null;suggestionView=false;movesList?.querySelectorAll('.analysis-marker[aria-current]').forEach(el=>el.removeAttribute('aria-current'));}
function annotate(finding){boardView.annotations=finding?[{square:history[finding.ply-1].slice(0,2),type:'error'},{square:history[finding.ply-1].slice(2,4),type:'error'},...finding.alternatives[0].pv[0].match(/.{2}/g).slice(0,2).map(square=>({square,type:'suggestion'}))]:[];boardView.drawOverlays();}
function evalDisplay(){const lines=scores.get(position),score=lines?.[0];$('score').textContent=scoreText(score,position);const cp=score?whiteScore(score,position):0;const percent=score?Math.max(1,Math.min(99,50+50*Math.tanh(cp/500))):50;$('eval-white').style.width=percent+'%';$('eval').setAttribute('aria-label',score?'White evaluation '+scoreText(score,position):'Position not yet evaluated');$('depth').textContent=score?'Depth '+score.depth:'Awaiting evaluation';}
function linesDisplay(){const lines=scores.get(position)||[];$('lines').replaceChildren();for(const line of lines.slice(0,3)){if(!line.pv.length)continue;const b=document.createElement('button');b.type='button';b.className='ui-button ui-secondary analysis-line';b.textContent=scoreText(line,position)+'  '+pvText(line.pv,position);b.onclick=()=>play(line.pv[0]);$('lines').append(b);}}
function bookDisplay(){const entry=book[key(position)];$('book-name').textContent=entry?.names?.length?entry.names.map(n=>n.join(' · ')).slice(0,2).join(' / '):'No named opening at this position';$('book-moves').replaceChildren();for(const [move,label] of Object.entries(entry?.moves||{})){if(!mg(position).includes(move))continue;const b=document.createElement('button');b.type='button';b.className='ui-button ui-secondary';b.textContent=label;b.onclick=()=>play(move);$('book-moves').append(b);}if(!entry)$('book-name').textContent='Outside the opening book';}
function renderDetails(){evalDisplay();linesDisplay();bookDisplay();controls();}
function setPosition(fen){clearGuide();position=fen;viewEpoch++;annotate(null);renderDetails();}
function reveal(index){if(index<0||index>=findings.length)return;cancelCountdown();clearGuide();selected=index;const item=findings[index],move=history[item.ply-1];internal=true;gamereplay(item.ply-1);internal=false;position=positions[item.ply-1];exploring=false;viewEpoch++;annotate(item);
 suggestionView=true;
 const explanation=`${Math.ceil(item.ply/2)}${item.ply%2?'.':'…'} ${san(move,position)} ${item.symbol} — ${item.description} Try ${san(item.alternatives[0].pv[0],position)}.`;
 $('explanation').textContent=explanation;
 const marker=movesList.querySelector(`.analysis-marker[data-ply="${item.ply}"]`);marker?.setAttribute('aria-current','step');marker?.scrollIntoView({block:'nearest',inline:'nearest'});
 const target=document.querySelector(`cg-board square.annotation-suggestion[data-square="${item.alternatives[0].pv[0].slice(2,4)}"]`);
 guide=ChessilHighlight.show(target,{text:explanation,actions:false,placement:'bottom'});
 $('alternatives').replaceChildren();for(const line of item.alternatives){const b=document.createElement('button');b.type='button';b.className='ui-button ui-secondary analysis-line';b.textContent='Better: '+pvText(line.pv,position);b.onclick=()=>play(line.pv[0]);$('alternatives').append(b);}renderDetails();schedule();}
async function evaluate(fen,options){const legal=mg(fen);if(!legal.length)return [{kind:incheck(fen)?'mate':'cp',value:0,depth:0,pv:[]}];return engine.search(fen,options);}
async function play(move){if(!opened||!engineReady||!mg(position).includes(move)){boardView.acknowledge();return;}pause();clearGuide();position=ucifen(move,position,boardgen(position),{}).f;exploring=true;annotate(null);boardView.render(boardgen(position),move,true);$('explanation').textContent='Exploring an alternative. Return to the game to continue review.';const mine=++viewEpoch,run=token;renderDetails();try{const lines=await evaluate(position);if(run!==token||mine!==viewEpoch)return;scores.set(position,lines);renderDetails();}catch(error){if(run===token)status(error.message);}}
async function scan(run){
 scanning=true;let after=await evaluate(positions.at(-1),{history});if(run!==token)return;scores.set(positions.at(-1),after);
 for(let ply=history.length;ply>0;ply--){if(run!==token)return;const beforeFen=positions[ply-1],before=await evaluate(beforeFen,{history:history.slice(0,ply-1)});if(run!==token)return;scores.set(beforeFen,before);
  const mover=beforeFen.split(' ')[1]==='w'?1:-1;let loss=(whiteScore(before[0],beforeFen)-whiteScore(after[0],positions[ply]))*mover;const played=history[ply-1];
  if(loss>=100&&before[0].pv[0]!==played){const forced=await evaluate(beforeFen,{multiPV:1,nodes:180000,movetime:1000,searchmoves:[played],history:history.slice(0,ply-1)});if(run!==token)return;loss=magnitude(before[0])-magnitude(forced[0]);
   const alternatives=before.filter(line=>line.pv[0]!==played&&magnitude(before[0])-magnitude(line)<100).slice(0,2);
   const judgment=ChessilAnalysisJudgment.judge(before[0],forced[0],loss);
   if(judgment&&alternatives.length){const item={ply,loss,...judgment,alternatives};findings.push(item);const entry=movesList.querySelector(`move-entry[ply="${ply}"]`);if(entry){
    entry.dataset.analysis=item.type;
    const marker=document.createElement('button');marker.type='button';marker.className='analysis-marker';marker.dataset.ply=ply;marker.textContent=item.symbol;marker.title=item.description;marker.setAttribute('aria-label','Review suggestion before '+san(played,beforeFen));marker.onclick=event=>{event.stopPropagation();if(!opened)return;pause();reveal(findings.indexOf(item));};entry.prepend(marker);
   }
    if(autoplay&&selected<0)reveal(0);else schedule();controls();
   }

  }
  after=before;$('progress').value=history.length-ply+1;status(`Reviewed ${history.length-ply+1} of ${history.length} moves, working backward.`);if(!exploring)renderDetails();
 }
 if(run!==token)return;scanning=false;status(`Review complete · ${findings.filter(item=>item.outcome).length} outcome-changing mistakes · ${findings.filter(item=>!item.outcome).length} suggestions.`);if(!findings.length)$('explanation').textContent='No significant improvement found in this review. Explore the game or opening book.';controls();
}
async function open(){
 if(opened||!gamefinished||stat<1||stat>8||!uci.length)return;
 opened=true;engineReady=false;exploring=false;const run=++token;history=uci.slice();positions=[initial];for(const move of history)positions.push(ucifen(move,positions.at(-1),boardgen(positions.at(-1)),{}).f);
 scores=new Map();findings=[];movesList.querySelectorAll('.analysis-marker').forEach(el=>el.remove());movesList.querySelectorAll('[data-analysis]').forEach(entry=>{delete entry.dataset.analysis;entry.removeAttribute('title');entry.removeAttribute('aria-label');});selected=-1;autoplay=true;scanning=true;position=positions[a1ti];panel.hidden=false;document.body.classList.add('analysis-open');button.disabled=true;originalState=boardView.state;originalSubmit=boardView.submit;
 boardView.state=()=>({fen:position,moves:mg(position),turn:position.split(' ')[1],side:position.split(' ')[1],connected:opened&&engineReady,finished:false,watcher:false});boardView.submit=move=>{queueMicrotask(()=>play(move));return true;};
 $('progress').max=history.length;$('progress').value=0;$('explanation').textContent='Reviewing from the end. Review moments appear between the recorded moves.';$('alternatives').replaceChildren();status('Loading local Stockfish and neural network…');controls();
 engine=new ChessilLocalEngine();
 fetch('/engine/openings.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{if(run===token){book=data;bookDisplay();}}).catch(()=>{if(run===token)$('book-name').textContent='Opening book unavailable. Reload to retry.';});
 try{const manifest=await engine.load();if(run!==token)return;engineReady=true;$('engine').textContent=manifest.name;$('source').href=manifest.source;renderDetails();await scan(run);}catch(error){if(run===token){scanning=false;engineReady=false;status(error.message+' Close and reopen analysis to retry.');pause();engine?.close();}}
}
function close(){if(!opened)return;opened=false;engineReady=false;token++;viewEpoch++;clearGuide();cancelCountdown();engine?.close();boardView.state=originalState;boardView.submit=originalSubmit;annotate(null);panel.hidden=true;document.body.classList.remove('analysis-open');internal=true;gamereplay(a1ti);internal=false;update();}
function update(){if(!button)return;button.hidden=!(gamefinished&&stat>=1&&stat<=8&&uci.length);button.disabled=opened;}
document.addEventListener('DOMContentLoaded',()=>{
 if(!document.querySelector('moves-panel'))return;button=document.createElement('button');button.type='button';button.id='analyze-game';button.className='ui-button ui-primary';button.textContent='Analyze game';button.hidden=true;button.onclick=open;document.querySelector('.game-heading-actions').prepend(button);
 panel=document.createElement('section');panel.id='analysis-panel';panel.className='analysis-panel';panel.hidden=true;panel.setAttribute('aria-label','Game analysis');panel.innerHTML=`<div class="analysis-heading"><h2>Game analysis</h2><button id="analysis-close" class="ui-button ui-quiet" type="button">Close</button></div><p id="analysis-engine">Local Stockfish</p><p id="analysis-status" role="status"></p><progress id="analysis-progress" class="ui-progress" max="1" value="0" aria-label="Analysis progress"></progress><div class="analysis-evaluation"><strong id="analysis-score">—</strong><span id="analysis-depth"></span></div><div id="analysis-eval" class="analysis-eval" role="img" aria-label="Position evaluation"><span id="analysis-eval-white"></span></div><div class="analysis-controls"><button id="analysis-previous" type="button" class="ui-button ui-secondary">Previous</button><button id="analysis-next" type="button" class="ui-button ui-secondary">Next moment</button><button id="analysis-autoplay" type="button" class="ui-button ui-secondary">Pause autoplay</button></div><p id="analysis-finding"></p><div id="analysis-countdown" hidden>Next moment in <span data-countdown></span><div class="ui-meter"><span class="ui-meter-fill"></span></div></div><p id="analysis-explanation"></p><div id="analysis-alternatives"></div><button id="analysis-return" class="ui-button ui-quiet" type="button">Return to game position</button><details><summary>Engine lines</summary><div id="analysis-lines"></div></details><details><summary>Opening book</summary><p id="analysis-book-name">Loading book…</p><div id="analysis-book-moves" class="ui-actions"></div><small>Named opening lines; not recommendations or game statistics.</small></details><p class="analysis-note">Estimates from a bounded local search. Explore alternatives on the board.</p><a id="analysis-source" href="/engine/manifest.json">Engine source &amp; license</a>`;
 document.querySelector('moves-panel').append(panel);$('close').onclick=close;$('previous').onclick=()=>{pause();reveal(selected-1);};$('next').onclick=()=>{pause();reveal(selected+1);};$('autoplay').onclick=()=>{if(autoplay)pause();else{autoplay=true;controls();if(selected<0&&findings.length)reveal(0);else schedule();}};$('return').onclick=()=>{pause();exploring=false;const ply=suggestionView?findings[selected].ply:a1ti;clearGuide();gamereplay(ply);};update();
});
document.addEventListener('chessil:game-state',update);
document.addEventListener('chessil:review',()=>{if(!opened||internal)return;pause();exploring=false;setPosition(positions[a1ti]);$('explanation').textContent='Game position after move '+a1ti+'.';$('alternatives').replaceChildren();controls();});

function step(direction){
 pause();
 if(suggestionView){const ply=findings[selected].ply;clearGuide();gamereplay(direction>0?ply:ply-1);return;}
 const target=direction>0?a1ti+1:a1ti,index=findings.findIndex(item=>item.ply===target);
 if(index>=0)reveal(index);else gamereplay(a1ti+direction);
}
document.addEventListener('keydown',event=>{
 if(!opened||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||document.querySelector('dialog[open]')||event.target.closest?.('input,textarea,select,[contenteditable]'))return;
 if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopImmediatePropagation();step(event.key==='ArrowRight'?1:-1);}
},true);
document.addEventListener('click',event=>{
 if(!opened)return;const button=event.target.closest('#sb,#fw');if(!button)return;event.preventDefault();event.stopPropagation();step(button.id==='fw'?1:-1);
},true);
window.addEventListener('pagehide',()=>{guide?.close();token++;engine?.close();autoplayRun?.cancel();});
})();
