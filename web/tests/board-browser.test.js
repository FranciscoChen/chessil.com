const test=require('node:test'),assert=require('node:assert/strict');
const puppeteer=require('puppeteer');
const start=require('./helpers/board-server');
let fixture,browser,page,errors=[];
test('board and sound browser integration',async t=>{
 fixture=await start();browser=await puppeteer.launch({headless:'new',args:['--no-sandbox']});page=await browser.newPage();await page.setViewport({width:1440,height:1000});
 page.on('pageerror',error=>errors.push(error.message));
 await page.evaluateOnNewDocument(url=>{
  window.notifyWsUrl=url.replace('http:','ws:')+'/notify';
  window.audioNotes=[];
  const original=AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator=function(){const oscillator=original.call(this);const set=oscillator.frequency.setValueAtTime.bind(oscillator.frequency);oscillator.frequency.setValueAtTime=(value,time)=>{window.audioNotes.push(value);return set(value,time);};return oscillator;};
 },fixture.url);

try {
async function square(name){const box=await page.$eval('cg-board',el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width};});return {x:box.x+(name.charCodeAt(0)-97+.5)*box.w/8,y:box.y+(8-Number(name[1])+.5)*box.w/8};}
async function click(name){const p=await square(name);await page.mouse.click(p.x,p.y);}
async function waitMoves(count){await page.waitForFunction(n=>uci.length===n,{},count);}
await t.test('production page: click, drag, illegal drop, last move, premove, keyboard, replay and settings',async()=>{
 await page.goto(fixture.url+'/game/verify001',{waitUntil:'networkidle0'});
 await page.waitForFunction(()=>gameConnectionReady);
 assert.equal(await page.$$eval('cg-board piece',nodes=>nodes.length),32);
 await click('e2');await click('e4');await waitMoves(1);
 assert.deepEqual(await page.$$eval('square.last-move',nodes=>nodes.map(n=>n.dataset.square)),['e2','e4']);
 assert.equal(await page.$$eval('square.move-dest',nodes=>nodes.length),0);
 // Premove acknowledges but does not change any piece placement.
 await click('g1');await click('f3');await page.waitForSelector('square.current-premove');
 assert.equal(await page.$$eval('cg-board piece[data-square="g1"]',nodes=>nodes.length),1);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('square.current-premove'));
 await page.evaluate(()=>ChessilPreferences.update({slide:320}));
 fixture.move('e7e5');await waitMoves(2);
 assert.ok(await page.$eval('piece[data-square="e5"]',el=>el.getAnimations().length)>0);
 const from=await square('g1'),to=await square('f3');
 await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});await page.mouse.up();await waitMoves(3);
 assert.equal(await page.$$eval('cg-board piece[data-square="f3"]',nodes=>nodes.length),1);
 fixture.move('b8c6');await waitMoves(4);
 // Invalid drag returns to origin and never sends a move.
 const a=await square('a1'),b=await square('a3');await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});await page.mouse.up();
 assert.equal(await page.evaluate(()=>uci.length),4);
 // Resizing and scrolling do not invalidate board coordinates.
 await page.setViewport({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,100));
 await click('f1');await click('c4');await waitMoves(5);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 fixture.move('g8f6');await waitMoves(6);
 // Keyboard uses the same legal-move submission path.
 await page.evaluate(()=>{boardView.active='d2';boardView.root.focus();});
 await page.keyboard.press('Enter');await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');await waitMoves(7);
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.click('#open-board-settings');await page.waitForSelector('#board-settings-dialog[open]');
 await page.select('#board-settings-dialog [data-preference="pieces"]','sculpted');
 await page.select('#board-settings-dialog [data-preference="board"]','walnut');
 await page.select('#board-settings-dialog [data-preference="slide"]','0');
 await page.select('#board-settings-dialog [data-preference="sound"]','midnight');
 await page.click('#board-settings-dialog summary');
 await page.select('#board-settings-dialog [data-preference="events.capture"]','ivory');
 await page.select('#board-settings-dialog [data-preference="events.slide"]','off');
 const prior=await page.evaluate(()=>audioNotes.length);
 await page.click('#board-settings-dialog .sound-event button');
 assert.ok(await page.evaluate(n=>audioNotes.length>n,prior));
 await page.keyboard.press('Escape');
 await page.waitForFunction(()=>document.querySelector('[data-preference-status]')?.textContent==='Saved to your account.');
 assert.equal(fixture.preferences.pieces,'sculpted');assert.equal(fixture.preferences.slide,0);assert.equal(fixture.preferences.events.capture,'ivory');
 fixture.move('e5d4');await waitMoves(8);
 await page.click('.resign');await page.waitForFunction(()=>gamefinished);
 await page.click('#rw');assert.equal(await page.evaluate(()=>a1ti),0);assert.equal(await page.$$eval('cg-board piece',nodes=>nodes.length),32);
 await page.click('#ff');assert.equal(await page.evaluate(()=>a1ti),8);assert.equal(await page.$$eval('cg-board piece',nodes=>nodes.length),31);
 await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>gamefinished);
 assert.equal(await page.evaluate(()=>ChessilPreferences.get().sound),'midnight');
 assert.deepEqual(errors,[]);
});
await t.test('board renderer special moves and promotion chooser use the same mapping',async()=>{
 await page.setViewport({width:700,height:800});
 await page.goto(fixture.url+'/board-harness',{waitUntil:'networkidle0'});
 await page.evaluate(async()=>{
  await ChessilPreferences.ready;
  window.model={fen:'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',turn:'w',side:'w',watcher:false,finished:false,connected:true};
  model.moves=mg(model.fen);window.submissions=[];
  window.view=new ChessilBoard(document.querySelector('cg-board'),{state:()=>model,submit:m=>{submissions.push(m);return true;},cancelPremove(){}});
  view.render(boardgen(model.fen));
  window.renderMove=m=>{const next=ucifen(m,model.fen,boardgen(model.fen),{});model.fen=next.f;model.moves=mg(next.f);model.turn=next.f.split(' ')[1];view.render(next.b,m,true);};
 });
 await click('e1');await click('g1');assert.equal(await page.evaluate(()=>submissions.at(-1)),'e1g1');
 await page.evaluate(()=>renderMove('e1g1'));
 assert.equal(await page.$eval('piece[data-square="f1"]',el=>el.className),'white rook');
 assert.equal(await page.$eval('piece[data-square="g1"]',el=>el.className),'white king');
 // En passant removes only the captured pawn.
 await page.evaluate(()=>{model.fen='4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1';model.moves=mg(model.fen);model.turn='w';view.render(boardgen(model.fen));renderMove('e5d6');});
 assert.equal(await page.$('piece[data-square="d5"]'),null);assert.equal(await page.$$eval('piece',nodes=>nodes.length),3);
 // Underpromotion requires explicit choice, then uses the usual submit path.
 await page.evaluate(()=>{model.fen='4k3/P7/8/8/8/8/8/4K3 w - - 0 1';model.moves=mg(model.fen);model.turn='w';view.render(boardgen(model.fen));});
 await click('a7');await click('a8');await page.waitForSelector('.promotion-dialog[open]');
 await page.click('.promotion-dialog button:last-child');assert.equal(await page.evaluate(()=>submissions.at(-1)),'a7a8n');
 await page.evaluate(()=>renderMove('a7a8n'));assert.equal(await page.$eval('piece[data-square="a8"]',el=>el.className),'white knight');
 // Cancelled gesture cannot leave a piece attached to the pointer.
 await page.evaluate(()=>{model.turn='w';model.side='w';view.render(boardgen('4k3/8/8/8/8/8/P7/4K3 w - - 0 1'));});
 const a=await square('a2');await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(a.x+30,a.y-30);
 await page.evaluate(()=>document.querySelector('cg-board').dispatchEvent(new PointerEvent('pointercancel',{pointerId:1})));
 assert.equal(await page.$('piece.dragging'),null);await page.mouse.up();
 assert.deepEqual(errors,[]);
});

await t.test('touch input works as Black; spectators cannot submit; reduced motion cancels sliding',async()=>{
 fixture.game.history=[];fixture.game.times=[];fixture.game.events='';fixture.game.state=0;fixture.game.side='b';
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 await page.goto(fixture.url+'/game/verify001',{waitUntil:'networkidle0'});await page.waitForFunction(()=>gameConnectionReady);
 fixture.move('e2e4');await waitMoves(1);
 async function blackSquare(name){return page.evaluate(name=>{const r=boardView.root.getBoundingClientRect(),[x,y]=boardView.point(name);return {x:r.x+(x+.5)*r.width/8,y:r.y+(y+.5)*r.height/8};},name);}
 for(const square of ['e7','e5']){const p=await blackSquare(square);await page.touchscreen.tap(p.x,p.y);}await waitMoves(2);
 assert.deepEqual(await page.$$eval('square.last-move',nodes=>nodes.map(n=>n.dataset.square)),['e7','e5']);
 await page.evaluate(()=>ChessilPreferences.update({slide:320}));
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 assert.equal(await page.evaluate(()=>ChessilPreferences.duration()),0);
 fixture.move('g1f3');await waitMoves(3);assert.equal(await page.$eval('piece[data-square="f3"]',el=>el.getAnimations().length),0);
 fixture.game.side='s';
 await page.goto(fixture.url+'/game/verify001',{waitUntil:'networkidle0'});await page.waitForFunction(()=>gameConnectionReady);
 const before=fixture.game.history.length;await click('a2');await click('a4');assert.equal(fixture.game.history.length,before);
 assert.equal(await page.evaluate(()=>boardView.canInput()),false);
 assert.deepEqual(errors,[]);
});
await t.test('sound palettes generate distinct move, capture, slide, start, end, check and clock cues',async()=>{
 await page.evaluate(()=>{
  ChessilPreferences.update({muted:false,volume:50,events:{move:'theme',capture:'theme',slide:'theme',start:'theme',end:'theme',clock:'theme',check:'theme'}});
  ChessilSound.unlock();window.samples={};
  for(const theme of ['ivory','midnight'])for(const event of ['move','capture','slide','start','end','clock','check']){
   audioNotes=[];ChessilSound.play(event,true,theme);samples[theme+':'+event]=audioNotes.slice();
  }
 });
 const samples=await page.evaluate(()=>samples);
 assert.notDeepEqual(samples['ivory:move'],samples['midnight:move']);
 assert.notDeepEqual(samples['ivory:move'],samples['ivory:capture']);
 assert.notDeepEqual(samples['midnight:slide'],samples['midnight:move']);
 for(const [event,notes] of Object.entries(samples))assert.ok(notes.length>0,event);
 await page.evaluate(()=>{ChessilPreferences.update({events:{capture:'off'}});audioNotes=[];ChessilSound.play('capture',true);});
 assert.equal(await page.evaluate(()=>audioNotes.length),0);
});

} finally {await browser?.close();await fixture?.close();}
});
