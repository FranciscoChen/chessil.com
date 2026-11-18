const test=require('node:test'),assert=require('node:assert/strict'),puppeteer=require('puppeteer'),start=require('./helpers/board-server');
test('playable learning: real local engine, coordinates, guided rules, responsive library and outcomes',async t=>{
 const fixture=await start(),browser=await puppeteer.launch({headless:'new',args:['--no-sandbox']});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1440,height:1000});
 const snapshot=()=>page.evaluate(()=>ChessilLearning.snapshot());
 async function load(section='tutorial',id){await page.goto(fixture.url+'/en/training/'+section+(id?'?lesson='+id:''),{waitUntil:'networkidle0'});await page.waitForFunction(()=>window.ChessilLearning?.snapshot().lesson);}
 async function ack(){await page.click('.learning-continue');await page.waitForFunction(()=>!ChessilLearning.snapshot().busy,{timeout:30000});}
 async function move(uci){for(const square of [uci.slice(0,2),uci.slice(2,4)]){const point=await page.$eval('cg-board',(el,s)=>{const r=el.getBoundingClientRect(),flipped=el.dataset.orientation==='b',file=s.charCodeAt(0)-97,rank=Number(s[1])-1;return [r.left+((flipped?7-file:file)+.5)*r.width/8,r.top+((flipped?rank:7-rank)+.5)*r.height/8];},square);await page.mouse.click(...point);}await page.waitForFunction(()=>!ChessilLearning.snapshot().busy,{timeout:30000});}
 await t.test('hub orders the courses and has no interactive board',async()=>{await page.goto(fixture.url+'/en/training',{waitUntil:'networkidle0'});assert.deepEqual(await page.$$eval('.learning-course',links=>links.map(l=>l.getAttribute('href').split('/').pop())),['tutorial','endgames','tactics','strategy','openings']);assert.equal(await page.$('cg-board'),null);await page.screenshot({path:'/tmp/training-hub.png'});});
 await t.test('king lesson locks acknowledgements and teaches a named file, rank and square',async()=>{await load();assert.equal((await snapshot()).awaiting,true);assert.equal((await snapshot()).moves.length,0);await ack();for(let i=0;i<4;i++)await move(await page.evaluate(()=>mg(ChessilLearning.snapshot().fen)[0]));assert.equal((await snapshot()).phase,'file');assert.equal(await page.$$eval('square.guide-area',els=>els.length),8);await ack();assert.equal((await snapshot()).phase,'rank');await ack();assert.equal((await snapshot()).phase,'square');await ack();const target=(await snapshot()).target;await move(target);assert.equal((await snapshot()).phase,'recall');assert.equal((await snapshot()).awaiting,true);await ack();const recall=(await snapshot()).target;const wrong=await page.evaluate(target=>mg(ChessilLearning.snapshot().fen).find(m=>m!==target),recall);await move(wrong);assert.equal((await snapshot()).target,recall);assert.equal(await page.$('.learning-callout'),null);assert.ok(await page.$('square.guide-source'));await move(recall);assert.equal((await snapshot()).lesson,'learn-stop-the-pawn');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('chessil.training.v1'))['learn-king-coordinates'].completed),true);});
 await t.test('stalemate, castling, repetition and en passant are playable, with shared dialogs',async()=>{
 for(const [id,line,reason] of [['learn-stalemate',['b6c7'],'Stalemate'],['learn-castle-king',['e1g1'],'Concept practised'],['learn-castle-queen',['e1c1'],'Concept practised'],['learn-repetition',['e1f1','f1e1','e1f1','f1e1'],'Threefold repetition'],['learn-en-passant',['e5d6'],'Concept practised']]){await load('tutorial',id);await ack();for(const m of line)await move(m);if(id==='learn-stalemate'){assert.equal((await snapshot()).awaiting,true);assert.equal(await page.$('.ui-result-dialog'),null);assert.ok(await page.$('square.guide-source[data-square="a8"]'));await ack();}await page.waitForSelector('.ui-result-dialog[open]');assert.equal(await page.$eval('.ui-result-reason',el=>el.textContent),reason);assert.equal(await page.$eval('.ui-result-dialog .ui-primary',el=>el.disabled),false);}
 });
 await t.test('accidental stalemate in a winning queen lesson teaches first and requires retry',async()=>{
 const respond=async request=>{if(new URL(request.url()).pathname==='/api/training/curriculum'){const data=structuredClone(require('../training/curriculum'));data.courses.tutorial.find(l=>l.id==='learn-queen-and-mate').fen='k7/8/1Q2K3/8/8/8/8/8 w - - 0 1';await request.respond({status:200,contentType:'application/json',body:JSON.stringify(data)});}else await request.continue();};await page.setRequestInterception(true);page.on('request',respond);
 try{await load('tutorial','learn-queen-and-mate');await ack();await move('b6c7');assert.equal((await snapshot()).awaiting,true);assert.equal(await page.$('.ui-result-dialog'),null);assert.ok(await page.$('square.guide-source[data-square="a8"]'));assert.match(await page.$eval('.learning-callout',el=>el.getAttribute('aria-label')),/not in check.*no legal move/);await ack();await page.waitForSelector('.ui-result-dialog[open]');assert.equal(await page.$eval('.ui-result-dialog',el=>el.dataset.outcome),'draw');assert.equal(await page.$eval('.ui-result-dialog .ui-primary',el=>el.disabled),true);}finally{page.off('request',respond);await page.setRequestInterception(false);}
 });
 await t.test('Lucena shows its translated rook lesson after the book reply',async()=>{
 await page.goto(fixture.url+'/zh/training/endgames?lesson=endgame-lucena',{waitUntil:'networkidle0'});
 await page.waitForFunction(()=>window.ChessilLearning?.snapshot().lesson==='endgame-lucena');
 assert.equal(await page.$eval('#learning-title',el=>el.textContent),'卢塞纳局面');
 assert.match(await page.$eval('.learning-callout',el=>el.getAttribute('aria-label')),/f7/);
 await page.evaluate(()=>{
  const command=ChessilLocalEngine.prototype.command;
  ChessilLocalEngine.prototype.command=function(message,match,timeout,onLine){
   if(!String(message).startsWith('go '))return command.call(this,message,match,timeout,onLine);
   window.trainingSearchCommand=message;
   if(!message.includes('searchmoves'))return Promise.resolve('bestmove g2g1');
   onLine('info depth 20 multipv 1 score cp -500 pv d7c6');
   return Promise.resolve('bestmove d7c7');
  };
 });
 await ack();assert.equal(await page.$('.learning-callout'),null);
 await move('e1d1');
 assert.match(await page.evaluate(()=>trainingSearchCommand),/movetime 700 searchmoves (d7c[78] ?){2}$/);
 assert.equal((await snapshot()).moves.at(-1),'d7c7');
 assert.match(await page.$eval('.learning-callout',el=>el.getAttribute('aria-label')),/搭桥/);
 assert.ok(await page.$('square.guide-source[data-square="d1"]'));
 await ack();assert.equal(await page.$('.learning-callout'),null);
 await move('d1g1');
 assert.equal((await snapshot()).moves.at(-1),'g2g1');
 assert.match(await page.evaluate(()=>trainingSearchCommand),/movetime 700$/);
 });
 await t.test('Retry from the result immediately restores board input',async()=>{
 await load('tutorial','learn-stalemate');await ack();await move('b6c7');await ack();
 await page.click('.ui-result-dialog .ui-secondary');
 assert.equal((await snapshot()).awaiting,false);
 assert.equal((await snapshot()).moves.length,0);
 await move('b6c7');
 assert.deepEqual((await snapshot()).moves,['b6c7']);
 });
 await t.test('Restart ignores a stale opponent reply and Retry engine resumes the same position',async()=>{
 await load('endgames','endgame-lucena');await ack();
 await page.evaluate(()=>{
  let searches=0;
  ChessilLocalEngine.prototype.bestMove=async function(){
   searches++;
   if(searches===1)return new Promise(resolve=>{window.finishOldReply=resolve;});
   if(searches===2)throw Error('Simulated worker failure');
   return 'd7c7';
  };
 });
 // Submit by pointer without waiting for the blocked Stockfish search.
 const pending=move('e1d1');
 await page.waitForFunction(()=>typeof window.finishOldReply==='function');
 await page.click('#learning-restart');
 await pending;
 assert.equal((await snapshot()).awaiting,false);
 await page.evaluate(()=>finishOldReply('d7c7'));
 assert.equal((await snapshot()).moves.length,0);
 await move('e1d1');
 await page.waitForSelector('#learning-reconnect',{visible:true});
 assert.deepEqual((await snapshot()).moves,['e1d1']);
 await page.click('#learning-reconnect');
 await page.waitForFunction(()=>ChessilLearning.snapshot().moves.length===2);
 assert.deepEqual((await snapshot()).moves,['e1d1','d7c7']);
 assert.equal(await page.$eval('#learning-reconnect',el=>el.hidden),true);
 });
 await t.test('winning queen lesson can be completed against the actual browser engine',async()=>{
 await load('tutorial','learn-queen-and-mate');await ack();await page.evaluate(async()=>{window.solver=new ChessilLocalEngine();await solver.load();});
 for(let i=0;i<20;i++){const s=await snapshot();if(s.ended)break;if(s.awaiting){if(await page.evaluate(()=>incheck(ChessilLearning.snapshot().fen))){assert.ok(await page.$('square.king-in-check'));await page.evaluate(()=>ChessilPreferences.update({checkIndicator:false}));assert.equal(await page.$('square.king-in-check'),null);await page.evaluate(()=>ChessilPreferences.update({checkIndicator:true}));}await ack();continue;}const m=await page.evaluate(async()=>{const lines=await solver.search(ChessilLearning.snapshot().fen,{multiPV:1,nodes:1000000,movetime:100});return lines[0].pv[0];});await move(m);}
 if((await snapshot()).awaiting)await ack();await page.waitForSelector('.ui-result-dialog[open]');assert.equal(await page.$eval('.ui-result-dialog',el=>el.dataset.outcome),'win');await page.evaluate(()=>solver.close());
 });
 await t.test('catching the pawn passes on a draw, but losing the queen requires retry',async()=>{
 await load('tutorial','learn-stop-the-pawn');await ack();for(let i=0;i<16;i++){let state=await snapshot();if(state.awaiting){await ack();state=await snapshot();}if(state.ended)break;const m=await page.evaluate(()=>{const f=ChessilLearning.snapshot().fen,p=boardgen(f),pawn=Object.keys(p).find(s=>p[s].p==='p'&&p[s].c==='b');if(!pawn)return null;const distance=s=>Math.max(Math.abs(s.charCodeAt(0)-pawn.charCodeAt(0)),Math.abs(Number(s[1])-Number(pawn[1])));return mg(f).sort((a,b)=>distance(a.slice(2,4))-distance(b.slice(2,4))||Math.abs(Number(a[3])-4)-Math.abs(Number(b[3])-4))[0];});if(m)await move(m);}
 if((await snapshot()).awaiting)await ack();assert.equal((await snapshot()).ended,true,JSON.stringify(await snapshot()));await page.waitForSelector('.ui-result-dialog[open]');assert.equal(await page.$eval('.ui-result-dialog',el=>el.dataset.outcome),'draw');assert.equal(await page.$eval('.ui-result-dialog .ui-primary',el=>el.disabled),false);
 await load('tutorial','learn-queen-and-mate');await ack();for(let i=0;i<12;i++){const state=await snapshot();if(state.ended)break;if(state.awaiting){await ack();continue;}const m=await page.evaluate(()=>{const fen=ChessilLearning.snapshot().fen,p=boardgen(fen),queen=Object.keys(p).find(s=>p[s].p==='q'&&p[s].c==='w'),king=Object.keys(p).find(s=>p[s].p==='k'&&p[s].c==='b'),options=mg(fen).filter(m=>m.startsWith(queen));const sacrifice=options.find(m=>{const after=ucifen(m,fen,p,{}).f;return mg(after).some(reply=>reply.slice(2,4)===m.slice(2,4));});return sacrifice||options.sort((a,b)=>{const d=m=>Math.max(Math.abs(m.charCodeAt(2)-king.charCodeAt(0)),Math.abs(Number(m[3])-Number(king[1])));return d(a)-d(b);})[0];});if(m)await move(m);}
 if((await snapshot()).awaiting)await ack();await page.waitForSelector('.ui-result-dialog[open]');assert.equal(await page.$eval('.ui-result-dialog',el=>el.dataset.outcome),'draw');assert.equal(await page.$eval('.ui-result-dialog .ui-primary',el=>el.disabled),true);
 });
 await t.test('mobile library retains the same controls and stays within the viewport',async()=>{await page.setViewport({width:390,height:844});await load('endgames','endgame-philidor');assert.equal(await page.$eval('cg-board',el=>el.dataset.orientation),'b');await page.click('#learning-library-open');await page.waitForSelector('#learning-library-dialog[open]');assert.equal(await page.$$eval('#learning-sidebar',els=>els.length),1);await page.click('#learning-library-close');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'/tmp/training-new-mobile.png'});});
 await t.test('opening practice supports Black and independent round depth',async()=>{await page.setViewport({width:1440,height:1000});await load('openings');await page.select('#learning-depth','1');await page.select('#learning-side','b');await page.waitForFunction(()=>ChessilLearning.snapshot().moves.length===1&&!ChessilLearning.snapshot().busy,{timeout:30000});const legal=await page.evaluate(()=>mg(ChessilLearning.snapshot().fen)[0]);await move(legal);await page.waitForSelector('#learning-autoplay:not([hidden])');assert.equal((await snapshot()).side,'b');await page.waitForFunction(()=>ChessilLearning.snapshot().moves.length===1&&!ChessilLearning.snapshot().ended,{timeout:8000});});
 await t.test('tactics selects curated levels without duplicating mobile controls',async()=>{await page.goto(fixture.url+'/en/training/tactics',{waitUntil:'networkidle0'});await page.waitForFunction(()=>!document.querySelector('#puzzle-hint').disabled);assert.equal(await page.$eval('#puzzle-app',el=>el.dataset.curated),'true');assert.ok(await page.evaluate(()=>{const board=document.querySelector('cg-board').getBoundingClientRect(),rail=document.querySelector('#puzzle-sidebar').getBoundingClientRect();return rail.left>=board.right&&Math.abs(rail.top-board.top)<2&&rail.right<=innerWidth;}));assert.deepEqual(await page.$$eval('#puzzle-type option',els=>els.map(el=>el.value)),['mixed','fork','pin']);await page.select('#puzzle-level','intermediate');await page.waitForFunction(()=>document.querySelector('#puzzle-type option[value="overloading"]'));assert.equal(await page.$('#puzzle-type option[value="fork"]'),null);await page.screenshot({path:'/tmp/training-tactics-desktop.png'});await page.setViewport({width:390,height:844});await page.click('#puzzle-library-open');await page.waitForSelector('#puzzle-library-dialog[open]');assert.equal(await page.$$eval('#puzzle-sidebar',els=>els.length),1);await page.screenshot({path:'/tmp/training-tactics-mobile.png'});});
 assert.deepEqual(errors,[]);
 }finally{await browser.close();await fixture.close();}
});
