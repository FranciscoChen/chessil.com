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
const leelaBook=new ChessilOpeningBook();let bookView,explorationOrigin=null,playing=false,freshSearch=null,linesExpanded=false;
const engineRows=new Map(),compactView=matchMedia('(max-width:900px)');
const engineSignature=settings=>JSON.stringify(Object.fromEntries(['engine','network','multiPV','hash','threads'].map(key=>[key,settings[key]])));
const moveScores=new Map(),bookEvaluated=new Set();
const stablePlan=new ChessilStablePlan();let planArrows=[],threatArrows=[],guidancePosition='',planTimer;
function original(ply){if(reviewGame)return ChessilStudy.selectOriginal(ply);gamereplay(ply,true);return true;}
const $=id=>document.getElementById('analysis-'+id);
const status=value=>{$('status').textContent=value;panel.classList.toggle('engine-error',/unavailable|timed out|retry|failed|could not|paused after/i.test(value));};
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
function showActual(ply){clearGuide();internal=true;const restored=original(ply);internal=false;if(!restored)return;exploring=false;position=positions[a1ti];viewEpoch++;annotate(null);$('alternatives').replaceChildren();$('explanation').textContent=a1ti?'Position after move '+Math.ceil(a1ti/2)+'.':'Starting position. Review complete.';renderDetails();if(engineReady)queuePosition();}
function orientReview(side){
 boardView.contextSide=perspective==='both'?(['w','b'].includes(playerside)?playerside:null):perspective;boardView.setOrientation(side);boardView.syncContext();if(study)return;
 const top=document.querySelector('.game-player--top'),bottom=document.querySelector('.game-player--bottom');
 const topIsWhite=!!top.querySelector('.player-mark--white');
 if(topIsWhite!==(side==='b'))for(const selector of ['.ruser','.rclock']){const first=top.querySelector(selector),second=bottom.querySelector(selector);top.append(second);bottom.append(first);}
 top.querySelector('.rclock').classList.replace('rclock-bottom','rclock-top');bottom.querySelector('.rclock').classList.replace('rclock-top','rclock-bottom');
}
function changePerspective(){
 perspective=$('perspective').value;pause();selected=-1;if(ChessilStudy.inVariation())renderDetails();else showActual(a1ti);
 findings.forEach(item=>{const entry=movesList.querySelector(`move-entry[ply="${item.ply}"]`),marker=entry?.querySelector('.analysis-marker');if(marker)marker.hidden=!included(item);if(entry){if(included(item))entry.dataset.analysis=item.type;else delete entry.dataset.analysis;}});
 const orientation=perspective==='both'?(playerside==='b'?'b':'w'):perspective;
 orientReview(orientation);renderDetails();threatFor='';if(engineReady)queuePosition();
}
function san(move,fen){try{return gensanbase(move,boardgen(fen),fen,mg(fen));}catch(_){return move;}}
function pvText(pv,fen){const out=[];for(const move of pv.slice(0,8)){if(!mg(fen).includes(move))break;out.push(san(move,fen));fen=ucifen(move,fen,boardgen(fen),{}).f;}return out.join(' ');}
function clearGuide(){guide?.close();guide=null;suggestionView=false;movesList?.querySelectorAll('.analysis-marker[aria-current]').forEach(el=>el.removeAttribute('aria-current'));}
function annotate(finding){boardView.annotations=finding?[{square:history[finding.ply-1].slice(0,2),type:'error'},{square:history[finding.ply-1].slice(2,4),type:'error'},...finding.alternatives[0].pv[0].match(/.{2}/g).slice(0,2).map(square=>({square,type:'suggestion'}))]:[];boardView.drawOverlays();}
function evalDisplay(){
 const score=scores.get(position)?.[0],white=score?whiteScore(score,position):0,sign=perspective==='b'?-1:1;
 $('score').textContent=score?scoreText(score,sign===1?position:position.replace(/ [wb] /,position.split(' ')[1]==='w'?' b ':' w ')):'—';
 const percent=score?Math.max(1,Math.min(99,50+50*Math.tanh(white/500))):50;$('eval-white').style.width=(sign===1?percent:100-percent)+'%';$('eval-white').style.background=perspective==='b'?'var(--piece-black)':'var(--piece-white)';$('eval').style.background=perspective==='b'?'var(--piece-white)':'var(--piece-black)';$('eval').setAttribute('aria-label',score?(perspective==='b'?'Black':'White')+' evaluation '+$('score').textContent:'Evaluation available after the game');
 const result=ChessilWdl.render($('wdl'),{score,fen:position,perspective});
 $('q').textContent=result.q===null?'—':(result.q>0?'+':'')+result.q.toFixed(2);
 $('q').title='Expected outcome: win minus loss (−1 to +1)';
}
function linesDisplay(){
 const settings=ChessilPreferences.get().analysis,lines=(scores.get(position)||[]).slice(0,settings.multiPV),visible=linesExpanded?settings.multiPV:Math.min(settings.multiPV,compactView.matches?1:3);
 panel.style.setProperty('--engine-visible-lines',visible);const toggle=$('lines-toggle');toggle.hidden=!lines.some(line=>line.pv.length)||settings.multiPV<=(compactView.matches?1:3);toggle.setAttribute('aria-expanded',String(linesExpanded));toggle.setAttribute('aria-label',linesExpanded?'Collapse engine variations':'Expand engine variations');
 const current=lines[0],nodes=current?.nodes||0;const count=nodes>=1000000?(nodes/1000000).toFixed(1)+'M':nodes>=1000?Math.round(nodes/1000)+'k':String(nodes);
 $('metrics').textContent=current?'d'+current.depth+' · '+count:'';$('metrics').title=current?'Depth '+current.depth+' · '+nodes.toLocaleString()+' nodes':'';
 const keep=new Set();for(const line of lines){if(!line.pv.length)continue;const move=line.pv[0];keep.add(move);let row=engineRows.get(move);if(!row){const button=document.createElement('button'),value=document.createElement('strong'),moves=document.createElement('span');button.type='button';button.className='engine-line';button.append(value,moves);button.onclick=()=>play(move);row={button,value,moves};engineRows.set(move,row);}
 const text=scoreText(line,perspective==='b'?position.replace(/ [wb] /,position.split(' ')[1]==='w'?' b ':' w '):position),moves=pvText(line.pv,position);if(row.value.textContent!==text)row.value.textContent=text;if(row.moves.textContent!==moves)row.moves.textContent=moves;row.button.title=text+' '+moves;
 }
 for(const [move,row] of engineRows)if(!keep.has(move)){row.button.remove();engineRows.delete(move);}let before=$('lines').firstElementChild;for(const line of lines){const row=engineRows.get(line.pv[0]);if(!row)continue;if(row.button===before)before=before.nextElementSibling;else $('lines').insertBefore(row.button,before);}
}

async function bookDisplay(){
 if(!bookPanel||bookPanel.hidden||!bookView)return;
 const epoch=++bookEpoch,fen=position,entry=book[key(fen)];$('book-name').textContent=entry?.names?.map(n=>n.join(' · ')).slice(0,2).join(' / ')||'';bookPanel.setAttribute('aria-busy','true');
 try{const result=await bookView.render({fen,ply:a1ti,lines:moveScores.has(fen)?[...moveScores.get(fen).values()]:scores.get(fen)||[],current:engineReady&&freshSearch?.fen===fen&&freshSearch.epoch===viewEpoch&&freshSearch.run===token?freshSearch.lines:[],perspective});if(epoch!==bookEpoch)return;bookPanel.classList.toggle('is-empty',!result.moves.length);bookPanel.setAttribute('aria-busy','false');bookPanel.title=result.name+' · '+($('book-moves').dataset.ranking==='policy'?'policy order':'engine order');$('book-note').textContent='';}catch(_){if(epoch===bookEpoch){bookPanel.setAttribute('aria-busy','false');$('book-note').textContent='Book unavailable';}}
}
function guidance(){
 clearTimeout(planTimer);
 const settings=ChessilPreferences.get().analysis,score=scores.get(position)?.[0],side=perspective==='both'?position.split(' ')[1]:perspective,identity=position+'|'+side;
 if(guidancePosition!==identity){guidancePosition=identity;stablePlan.reset();planArrows=[];threatArrows=[];}
 if(settings.plan&&score){const stable=stablePlan.observe(position,score.pv,side,score.depth);if(stable.length)planArrows=stable;else if(engineReady&&stablePlan.wait)planTimer=setTimeout(guidance,stablePlan.wait);}else planArrows=[];
 if(!settings.threat||threatArrows.length&&threatArrows[0].from+threatArrows[0].to!==score?.pv[0])threatArrows=[];boardView.setArrows([...planArrows,...threatArrows]);
 for(const [id,enabled] of [['plan-toggle',settings.plan],['threat-toggle',settings.threat]])if($(id)){$(id).setAttribute('aria-pressed',String(enabled));$(id).classList.toggle('is-active',enabled);}
}
function decorateHistory(){for(const item of findings){const entry=movesList?.querySelector(`move-entry[ply="${item.ply}"]`);if(!entry)continue;if(included(item))entry.dataset.analysis=item.type;else delete entry.dataset.analysis;if(entry.querySelector('.analysis-marker'))continue;const marker=document.createElement('button');marker.type='button';marker.className='analysis-marker';marker.dataset.ply=item.ply;marker.textContent=item.symbol;marker.title=item.description;marker.hidden=!included(item);marker.setAttribute('aria-label','Review suggestion before '+san(history[item.ply-1],positions[item.ply-1]));marker.onclick=event=>{event.stopPropagation();pause();reveal(findings.indexOf(item));};entry.append(marker);}}
function renderDetails(){decorateHistory();evalDisplay();linesDisplay();bookDisplay();controls();guidance();}
function reveal(index){if(index<0||index>=findings.length)return;cancelCountdown();clearGuide();selected=index;const item=findings[index],move=history[item.ply-1];internal=true;const restored=original(item.ply-1);internal=false;if(!restored)return;position=positions[item.ply-1];exploring=false;viewEpoch++;annotate(item);
 suggestionView=true;
 const explanation=`${Math.ceil(item.ply/2)}${item.ply%2?'.':'…'} ${san(move,position)} ${item.symbol} — ${item.description} Try ${san(item.alternatives[0].pv[0],position)}.`;
 $('explanation').textContent=explanation;
 const marker=movesList.querySelector(`.analysis-marker[data-ply="${item.ply}"]`);marker?.setAttribute('aria-current','step');if(marker){const outer=movesList.getBoundingClientRect(),inner=marker.getBoundingClientRect();if(inner.right>outer.right)movesList.scrollLeft+=inner.right-outer.right;else if(inner.left<outer.left)movesList.scrollLeft+=inner.left-outer.left;}
 const target=document.querySelector(`cg-board square.annotation-suggestion[data-square="${item.alternatives[0].pv[0].slice(2,4)}"]`);
 guide=ChessilHighlight.show(target,{text:explanation,actions:false,placement:'bottom',subtle:true,areas:[...document.querySelectorAll('cg-board square.annotation-suggestion')]});
 $('alternatives').replaceChildren();for(const line of item.alternatives){const b=document.createElement('button');b.type='button';b.className='engine-line';b.textContent=pvText(line.pv,position);b.onclick=()=>play(line.pv[0]);$('alternatives').append(b);}renderDetails();if(engineReady)queuePosition();schedule();}
async function evaluate(fen,options){const legal=mg(fen);if(!legal.length)return [{kind:incheck(fen)?'mate':'cp',value:0,depth:0,pv:[]}];return engine.search(fen,options);}
async function play(move){if(!opened)return;pause();clearGuide();if(reviewGame&&explorationOrigin===null)explorationOrigin=a1ti;playing=true;try{ChessilStudy.play(move);}finally{playing=false;}}
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
 if(run!==token)return;scanning=false;status(`Review complete · ${findings.filter(item=>item.outcome).length} outcome-changing mistakes · ${findings.filter(item=>!item.outcome).length} suggestions.`);if(!findings.length)$('explanation').textContent='No significant improvement found in this review. Explore the game or opening book.';controls();if(engineReady)queuePosition();
}
async function open(review=true){
 if(!ChessilStudy.ready)return;
 if(opened){if(review){autoplay=!freeStudy;await startEngine();}return;}
 if(!study&&(!gamefinished||stat<1||stat>8||!uci.length))return;
 opened=true;engineReady=false;exploring=false;const run=++token;history=reviewGame?ChessilStudy.source().moves:uci.slice();positions=[initial];for(const move of history)positions.push(ucifen(move,positions.at(-1),boardgen(positions.at(-1)),{}).f);
 processed=new Set();scores=new Map();findings=[];movesList.querySelectorAll('.analysis-marker').forEach(el=>el.remove());movesList.querySelectorAll('[data-analysis]').forEach(entry=>{delete entry.dataset.analysis;entry.removeAttribute('title');entry.removeAttribute('aria-label');});selected=-1;autoplay=review&&!freeStudy;scanning=review&&!freeStudy;perspective=playerside==='w'||playerside==='b'?playerside:'both';$('perspective').value=perspective;orientReview(perspective==='both'?(playerside==='b'?'b':'w'):perspective);position=positions[a1ti];panel.hidden=false;bookPanel.hidden=false;tools.hidden=false;document.body.classList.add('analysis-open');
 boardView.state=()=>({fen:ChessilStudy.position(),moves:mg(ChessilStudy.position()),turn:ChessilStudy.position().split(' ')[1],side:ChessilStudy.position().split(' ')[1],connected:opened,finished:false,watcher:false});boardView.submit=move=>{queueMicrotask(()=>play(move));return true;};
 showActual(review&&!freeStudy?history.length:a1ti);$('progress').max=history.length;$('progress').value=0;$('explanation').textContent='Reviewing from the end. Review moments appear between the recorded moves.';$('alternatives').replaceChildren();status('Loading local Stockfish and neural network…');controls();
 loadBookNames();await startEngine();

}
const MAX_ANALYSIS_MS=15*60*1000;let engineLimitTimer;
let studySearching=false,studyQueued=false,threatFor='',threatRefreshTimer,threatCandidate='';
function queuePosition(){clearTimeout(threatRefreshTimer);threatRefreshTimer=null;engine?.interruptContinuous();studyQueued=true;evaluateStudy();}
function refreshThreat(fen,lines,epoch,run){
 const settings=ChessilPreferences.get().analysis,side=perspective==='both'?fen.split(' ')[1]:perspective,move=lines[0]?.pv[0],candidate=fen+'|'+side+'|'+move;
 if(!settings.threat||!move||lines[0].depth<8||candidate===threatFor)return;
 if(threatRefreshTimer&&candidate===threatCandidate)return;clearTimeout(threatRefreshTimer);threatCandidate=candidate;
 threatRefreshTimer=setTimeout(()=>{threatRefreshTimer=null;if(run===token&&epoch===viewEpoch&&engineReady&&ChessilPreferences.get().analysis.threat&&scores.get(fen)?.[0]?.pv[0]===move)queuePosition();},1000);
}
async function evaluateStudy(){
 if(!engineReady||!opened||document.hidden)return;studyQueued=true;if(studySearching)return;studySearching=true;const run=token;
 try{while(studyQueued&&engineReady&&opened&&run===token){studyQueued=false;const current=position,epoch=viewEpoch,legal=mg(current);status('Evaluating position…');
 const retain=lines=>{if(!moveScores.has(current)){if(moveScores.size>=128){const oldest=moveScores.keys().next().value;moveScores.delete(oldest);bookEvaluated.delete(oldest);}moveScores.set(current,new Map());}const saved=moveScores.get(current);for(const line of lines)if(line.pv[0])saved.set(line.pv[0],line);};
 const progress=(lines,continuous=false)=>{if(run!==token||epoch!==viewEpoch)return;retain(lines);freshSearch={fen:current,epoch,run,lines:lines.slice(0,ChessilPreferences.get().analysis.multiPV)};scores.set(current,lines);renderDetails();if(continuous)refreshThreat(current,lines,epoch,run);};
 let lines=scores.get(current)||[];if(!bookEvaluated.has(current)||scanning){lines=await evaluate(current,{multiPV:bookEvaluated.has(current)?ChessilPreferences.get().analysis.multiPV:Math.max(1,legal.length),nodes:180000,movetime:900,onUpdate:progress});if(run!==token)return;if(epoch!==viewEpoch)continue;retain(lines);if(moveScores.get(current).size>=legal.length)bookEvaluated.add(current);freshSearch={fen:current,epoch,run,lines:lines.slice(0,ChessilPreferences.get().analysis.multiPV)};scores.set(current,lines);renderDetails();status('Position evaluated · depth '+lines[0].depth);}
 const settings=ChessilPreferences.get().analysis,side=perspective==='both'?current.split(' ')[1]:perspective,best=lines[0];
 const threatKey=current+'|'+side+'|'+best?.pv[0];if(settings.threat&&threatFor!==threatKey&&best?.pv[0]){threatFor=threatKey;const probe=ChessilAnalysisGuidance.probe(current,best.pv[0],side);if(probe){const threat=await evaluate(probe,{multiPV:1,nodes:50000,movetime:250});if(run!==token)return;if(epoch===viewEpoch&&ChessilAnalysisGuidance.improves(best,threat[0])){const move=threat[0].pv[0];threatArrows=[{from:best.pv[0].slice(0,2),to:best.pv[0].slice(2,4),type:'setup',label:'Setup '+san(best.pv[0],current)},{from:move.slice(0,2),to:move.slice(2,4),type:'threat',label:'Threat after '+san(best.pv[0],current)+': '+san(move,probe)}];guidance();}}}
 if(epoch===viewEpoch&&!scanning&&legal.length&&!studyQueued){status('Analyzing position…');await evaluate(current,{multiPV:ChessilPreferences.get().analysis.multiPV,infinite:true,onUpdate:lines=>progress(lines,true)});if(run!==token)return;} }
 }catch(error){if(run===token&&engineReady)status(error.message);}
 finally{studySearching=false;if(studyQueued&&engineReady&&opened)evaluateStudy();}
}
function stopEngine(message='Engine stopped. Book exploration and saved evaluations remain available.'){clearTimeout(engineLimitTimer);clearTimeout(threatRefreshTimer);threatRefreshTimer=null;clearTimeout(planTimer);studyQueued=false;boardView.setArrows([]);token++;viewEpoch++;engine?.close();engineReady=false;engineLoading=false;scanning=false;pause();status(message);controls();bookDisplay();}
async function startEngine(){
 if(!opened||engineReady||engineLoading)return;
 const settings=ChessilPreferences.get().analysis,signature=engineSignature(settings);
 if(engineConfig&&signature!==engineConfig){scores.clear();moveScores.clear();bookEvaluated.clear();processed.clear();findings=[];selected=-1;movesList.querySelectorAll('.analysis-marker').forEach(el=>el.remove());movesList.querySelectorAll('[data-analysis]').forEach(el=>delete el.dataset.analysis);$('progress').value=0;clearGuide();annotate(null);}
 engineConfig=signature;const run=++token;engineLoading=true;engine=new ChessilLocalEngine();status('Starting local engine…');controls();
 try{const manifest=await engine.load(settings);if(run!==token)return;engineLoading=false;engineReady=true;clearTimeout(engineLimitTimer);engineLimitTimer=setTimeout(()=>stopEngine('Analysis paused after 15 minutes. Press Start to continue.'),MAX_ANALYSIS_MS);updateEngineName();renderDetails();
  if(reviewGame)scan(run).catch(error=>{if(run===token&&engineReady){scanning=false;status(error.message);}});
  queuePosition();
 }catch(error){if(run===token){engineLoading=false;scanning=false;engineReady=false;status(error.message+' Press Start engine to retry.');pause();engine?.close();controls();}}
}

async function updateEngineName(){await ChessilPreferences.ready;const id=ChessilPreferences.get().analysis.engine;$('source').href='/'+(document.documentElement.lang||'en')+'/engine-source?engine='+encodeURIComponent(id)+'&threads='+(engineReady?engine.settings.threads:ChessilPreferences.get().analysis.threads);try{const catalog=await ChessilPreferences.engineCatalog();if(id!==ChessilPreferences.get().analysis.engine)return;const name=catalog.engines.find(engine=>engine.id===id)?.name||id;$('engine-name').textContent=name;$('engine-name').title=name;}catch(_){$('engine-name').textContent=id;}}
function loadBookNames(){if(Object.keys(book).length)return;fetch('/engine/openings.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{book=data;bookDisplay();}).catch(()=>{});}
function returnToGame(){pause();exploring=false;const ply=explorationOrigin??(suggestionView?findings[selected].ply:a1ti);explorationOrigin=null;clearGuide();original(ply);}
function update(){if(panel&&!opened&&ChessilStudy.ready)open(false);}

document.addEventListener('DOMContentLoaded',()=>{
 if(!document.querySelector('moves-panel'))return;
 const iconButton=(id,name,label)=>`<button id="analysis-${id}" type="button" class="ui-icon-button analysis-icon" aria-label="${label}" title="${label}">${ChessilIcons.svg(name)}</button>`;
 panel=document.createElement('section');panel.id='analysis-panel';panel.className='analysis-panel engine-card';panel.setAttribute('aria-label','Engine');panel.innerHTML=`<div class="engine-toolbar">${iconButton('engine-toggle','play','Start engine')}${iconButton('plan-toggle','plan','Show stable plan')}${iconButton('threat-toggle','threat','Show immediate threat')}<span class="engine-identity"><span id="analysis-engine-name" class="engine-name"></span><span id="analysis-metrics" class="engine-metrics"></span></span><button id="analysis-options-toggle" type="button" class="ui-icon-button analysis-icon" aria-label="Analysis options" title="Analysis options" aria-expanded="false" aria-controls="analysis-options">${ChessilIcons.svg('options')}</button></div><div id="analysis-options" class="engine-options-reveal" inert><div class="engine-options-clip"><div class="analysis-view-options"><label class="ui-field" for="analysis-perspective">Point of view<select id="analysis-perspective" aria-label="Point of view"><option value="w">White</option><option value="b">Black</option><option value="both">Both sides</option></select></label><button id="study-flip" type="button" class="ui-icon-button analysis-icon" aria-label="Flip board" title="Flip board">${ChessilIcons.svg('flip')}</button></div><div id="analysis-options-fields"></div><a id="analysis-source" class="analysis-source-link" href="/en/engine-source">View source</a></div></div><p id="analysis-status" class="analysis-sr-only" role="status"></p><div id="analysis-lines" aria-label="Engine variations"></div><button id="analysis-lines-toggle" type="button" class="engine-expand ui-icon-button" aria-label="Expand engine variations" aria-expanded="false" aria-controls="analysis-lines">${ChessilIcons.svg('chevron')}</button>`;
 let optionsRendered=false;
 bookPanel=document.createElement('section');bookPanel.id='analysis-book-panel';bookPanel.className='book-panel';bookPanel.setAttribute('aria-label','Opening book');bookPanel.innerHTML='<p id="analysis-book-name"></p><div id="analysis-book-moves" aria-label="Book moves"></div><small id="analysis-book-note" role="status"></small>';
 tools=document.createElement('div');tools.className='board-tools';tools.hidden=true;tools.append(panel,bookPanel);document.querySelector('.round__app').append(tools);
 bookView=new ChessilAnalysisBook($('book-moves'),leelaBook,{play,scoreText:(score,fen,side)=>scoreText(score,side==='b'?fen.replace(/ [wb] /,fen.split(' ')[1]==='w'?' b ':' w '):fen)});

 const review=document.createElement('section');review.className='review-tools';review.setAttribute('aria-label','Review controls');review.innerHTML=`<div class="analysis-controls">${iconButton('previous','previous','Previous review moment')}${iconButton('autoplay','play','Play backward')}${iconButton('next','next','Next review moment')}${iconButton('return','return','Return to game position')}</div><progress id="analysis-progress" class="ui-progress" max="1" value="0" aria-label="Review progress"></progress><div id="analysis-countdown" hidden><span data-countdown></span><div class="ui-meter"><span class="ui-meter-fill"></span></div></div><p id="analysis-explanation" class="analysis-sr-only"></p><div id="analysis-alternatives"></div>`;
 document.querySelector('.study-actions').prepend(review);
 const evaluation=document.createElement('div');evaluation.className='board-evaluation';evaluation.setAttribute('aria-label','Position evaluation');evaluation.innerHTML='<strong id="analysis-score">—</strong><span id="analysis-q" class="analysis-q">—</span><div id="analysis-eval" class="analysis-eval" role="img" aria-label="Position evaluation"><span id="analysis-eval-white"></span></div><div id="analysis-wdl"></div>';document.querySelector('.round__app').append(evaluation);
 $('lines-toggle').onclick=()=>{linesExpanded=!linesExpanded;linesDisplay();};compactView.addEventListener('change',linesDisplay);document.getElementById('study-flip').onclick=()=>boardView.setOrientation(boardView.orientation==='w'?'b':'w');
 $('plan-toggle').onclick=()=>{ChessilPreferences.update({analysis:{plan:!ChessilPreferences.get().analysis.plan}});if(engineReady)queuePosition();};$('threat-toggle').onclick=()=>{threatFor='';ChessilPreferences.update({analysis:{threat:!ChessilPreferences.get().analysis.threat}});if(engineReady)queuePosition();};
 $('engine-toggle').onclick=()=>engineReady||engineLoading?stopEngine():startEngine();$('perspective').onchange=changePerspective;$('previous').onclick=()=>{pause();reveal(adjacent(-1));};$('next').onclick=()=>{pause();reveal(adjacent(1));};$('autoplay').onclick=()=>{if(autoplay)pause();else{autoplay=true;controls();if(a1ti===0)showActual(history.length);schedule();}};$('return').onclick=returnToGame;
 $('options-toggle').disabled=true;ChessilPreferences.ready.then(()=>{$('options-toggle').disabled=false;});
 $('options-toggle').onclick=()=>{const expanded=$('options-toggle').getAttribute('aria-expanded')!=='true';$('options-toggle').setAttribute('aria-expanded',String(expanded));$('options').classList.toggle('is-expanded',expanded);$('options').inert=!expanded;if(expanded&&!optionsRendered){optionsRendered=true;ChessilPreferences.renderEngineOptions($('options-fields'),{compact:true}).then(success=>{if(!success)optionsRendered=false;});}};
 updateEngineName();
 history=uci.slice();positions=ChessilStudy.positions();position=positions[a1ti];if(freeStudy){review.hidden=true;review.querySelector('.analysis-controls').hidden=true;$('progress').hidden=true;}controls();update();renderDetails();

});
document.addEventListener('chessil:game-state',update);
document.addEventListener('chessil:study-loaded',()=>{history=uci.slice();positions=ChessilStudy.positions();position=positions[a1ti];update();renderDetails();if(new URLSearchParams(location.search).get('review')==='1')open();});
let guidanceSettings='';
document.addEventListener('chessil:preferences',()=>{const settings=ChessilPreferences.get().analysis,flags=JSON.stringify([settings.plan,settings.threat]),changed=guidanceSettings!==flags;guidanceSettings=flags;if(panel){updateEngineName();if(opened)guidance();}if(opened&&engineConfig!==engineSignature(settings)){const running=engineReady||engineLoading;stopEngine();if(running)startEngine();}else if(opened&&engineReady&&changed){threatFor='';queuePosition();}});
document.addEventListener('chessil:review',()=>{if(internal||!panel)return;if(!opened){if(freeStudy){history=uci.slice();positions=ChessilStudy.positions();}position=ChessilStudy.position();return;}pause();if(!playing)explorationOrigin=null;exploring=ChessilStudy.inVariation();if(freeStudy){history=uci.slice();positions=ChessilStudy.positions();}position=ChessilStudy.position();viewEpoch++;clearGuide();annotate(null);$('alternatives').replaceChildren();renderDetails();if(engineReady)queuePosition();});
document.addEventListener('chessil:history-rendered',()=>{decorateHistory();if(suggestionView&&findings[selected])movesList.querySelector(`.analysis-marker[data-ply="${findings[selected].ply}"]`)?.setAttribute('aria-current','step');guide?.update();});
let resumeAfterHidden=false;document.addEventListener('visibilitychange',()=>{if(document.hidden){resumeAfterHidden=engineReady||engineLoading;if(resumeAfterHidden)stopEngine();}else if(resumeAfterHidden){resumeAfterHidden=false;startEngine();}});

function step(direction){
 pause();
 if(suggestionView){const ply=findings[selected].ply;clearGuide();original(direction>0?ply:ply-1);return;}
 const target=direction>0?a1ti+1:a1ti,index=findings.findIndex(item=>item.ply===target&&included(item));
 if(index>=0)reveal(index);else original(a1ti+direction);
}
document.addEventListener('keydown',event=>{
 if(freeStudy||ChessilStudy.inVariation()||!opened||panel.hidden||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||document.querySelector('dialog[open]')||event.target.closest?.('input,textarea,select,[contenteditable]'))return;
 if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopImmediatePropagation();step(event.key==='ArrowRight'?1:-1);}
},true);
document.addEventListener('click',event=>{
 if(freeStudy||ChessilStudy.inVariation()||!opened||panel.hidden)return;const button=event.target.closest('#sb,#fw');if(!button)return;event.preventDefault();event.stopPropagation();step(button.id==='fw'?1:-1);
},true);
window.addEventListener('pagehide',()=>{guide?.close();clearTimeout(planTimer);clearTimeout(engineLimitTimer);clearTimeout(threatRefreshTimer);token++;engine?.close();autoplayRun?.cancel();if(study){engineReady=false;engineLoading=false;controls();}});
})();
