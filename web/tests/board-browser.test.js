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
 await page.click('#board-settings-dialog [data-preference="autoQueen"]');
 await page.select('#board-settings-dialog [data-preference="pieces"]','sculpted');
 await page.select('#board-settings-dialog [data-preference="board"]','walnut');
 assert.ok(await page.$eval('cg-board',el=>getComputedStyle(el).backgroundImage.includes('157, 114, 85')));
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
 assert.equal(fixture.preferences.autoQueen,true);assert.equal(fixture.preferences.pieces,'sculpted');assert.equal(fixture.preferences.slide,0);assert.equal(fixture.preferences.events.capture,'ivory');
 fixture.move('e5d4');await waitMoves(8);
 await page.click('.resign');await page.waitForFunction(()=>gamefinished);
 await page.click('#rw');assert.equal(await page.evaluate(()=>a1ti),0);assert.equal(await page.$$eval('cg-board piece',nodes=>nodes.length),32);
 await page.click('#ff');assert.equal(await page.evaluate(()=>a1ti),8);assert.equal(await page.$$eval('cg-board piece',nodes=>nodes.length),31);
 await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>gamefinished);
 assert.equal(await page.evaluate(()=>ChessilPreferences.get().autoQueen),true);assert.equal(await page.evaluate(()=>ChessilPreferences.get().sound),'midnight');
 assert.deepEqual(errors,[]);
});
await t.test('arrows review live and finished games without changing authoritative play',async()=>{
 fixture.game.history=[];fixture.game.times=[];fixture.game.state=0;fixture.game.events='';fixture.game.side='w';
 await page.goto(fixture.url+'/game/verify001',{waitUntil:'networkidle0'});await page.waitForFunction(()=>gameConnectionReady);
 await click('e2');await click('e4');await waitMoves(1);fixture.move('e7e5');await waitMoves(2);
 await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>a1ti),1);
 assert.equal(await page.evaluate(()=>turn),'w');assert.equal(await page.evaluate(()=>board.e5.p),'p');
 assert.ok(await page.$('piece[data-square="e7"]'));assert.equal(await page.$('piece[data-square="e5"]'),null);
 await click('g1');await click('f3');assert.equal(await page.evaluate(()=>uci.length),2);
 fixture.move('g1f3');await waitMoves(3);assert.equal(await page.evaluate(()=>a1ti),1);
 await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>a1ti),3);assert.ok(await page.$('piece[data-square="f3"]'));
 await page.click('#open-board-settings');await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>a1ti),3);await page.keyboard.press('Escape');
 await page.evaluate(()=>{const input=document.createElement('input');input.id='navigation-input';document.body.append(input);input.focus();});
 await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>a1ti),3);await page.evaluate(()=>document.querySelector('#navigation-input').remove());
 await page.click('.resign');await page.waitForFunction(()=>gamefinished);await page.keyboard.press('Home');assert.equal(await page.evaluate(()=>a1ti),0);
 await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>a1ti),1);await page.keyboard.press('End');assert.equal(await page.evaluate(()=>a1ti),3);
});
await t.test('auto queen persists and recapture premoves can target an owned piece',async()=>{
 await page.goto(fixture.url+'/board-harness',{waitUntil:'networkidle0'});
 await page.evaluate(async()=>{
  await ChessilPreferences.ready;ChessilPreferences.update({autoQueen:true});
  window.model={fen:'4k3/P7/8/8/8/8/8/4K3 w - - 0 1',turn:'w',side:'w',watcher:false,finished:false,connected:true};model.moves=mg(model.fen);window.submissions=[];
  window.view=new ChessilBoard(document.querySelector('cg-board'),{state:()=>model,submit:m=>{submissions.push(m);return true;},cancelPremove(){}});view.render(boardgen(model.fen));
 });
 await click('a7');await click('a8');assert.deepEqual(await page.evaluate(()=>submissions),['a7a8q']);assert.equal(await page.$('.promotion-dialog'),null);
 await page.waitForFunction(()=>ChessilPreferences.get().autoQueen && document.querySelector('[data-preference-status]')===null);await new Promise(r=>setTimeout(r,350));assert.equal(fixture.preferences.autoQueen,true);
 await page.evaluate(()=>{view.acknowledge();model.fen='4k3/8/8/8/8/8/p7/4K3 w - - 0 1';model.side='b';model.turn='w';model.moves=mg(model.fen);submissions=[];view.render(boardgen(model.fen));});
 await click('a2');await click('a1');assert.deepEqual(await page.evaluate(()=>submissions),['a2a1q']);
 await page.evaluate(()=>{ChessilPreferences.update({autoQueen:false});model.side='w';model.fen='4k3/8/3p4/4P3/8/5N2/8/4K3 b - - 0 1';model.turn='b';model.moves=mg(model.fen);submissions=[];view.render(boardgen(model.fen));});
 await click('f3');await click('e5');assert.deepEqual(await page.evaluate(()=>submissions),['f3e5']);assert.ok(await page.$('piece.white.pawn[data-square="e5"]'));
 await page.evaluate(()=>{view.acknowledge();submissions=[];});
 const from=await square('f3'),to=await square('e5');await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});await page.mouse.up();assert.deepEqual(await page.evaluate(()=>submissions),['f3e5']);
 await page.evaluate(()=>{view.acknowledge();model.turn='w';model.fen='4k3/8/3p4/4P3/8/5N2/8/4K3 w - - 0 1';model.moves=mg(model.fen);submissions=[];view.render(boardgen(model.fen));});
 await click('f3');await click('e5');assert.deepEqual(await page.evaluate(()=>submissions),[]);
 await Promise.all([page.waitForResponse(r=>r.url().endsWith('/preferences') && r.request().method()==='POST'),page.evaluate(()=>ChessilPreferences.update({autoQueen:false}))]);
});
await t.test('shared board has stable DOM and follows the pointer synchronously under 6x CPU throttling',async()=>{
 await page.goto(fixture.url+'/board-harness',{waitUntil:'networkidle0'});
 const cdp=await page.target().createCDPSession();await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
 try {
 const result=await page.evaluate(async()=>{
  await ChessilPreferences.ready;document.querySelector('.game-page').classList.remove('game-page');
  const fen='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',position=boardgen(fen),root=document.querySelector('cg-board');
  const view=new ChessilBoard(root,{state:()=>({fen,moves:mg(fen),turn:'w',side:'w',connected:true}),submit:()=>true,cancelPremove(){}});view.render(position);
  const boardRect=root.getBoundingClientRect(),pieceRect=view.pieces.get('e2').getBoundingClientRect();
  const observer=new MutationObserver(()=>{});observer.observe(root,{subtree:true,attributes:true,childList:true});
  const originalStyle=window.getComputedStyle;let styleReads=0;window.getComputedStyle=(...args)=>{styleReads++;return originalStyle(...args);};
  for(let i=0;i<60;i++)view.render(position);
  const mutations=observer.takeRecords().length;observer.disconnect();window.getComputedStyle=originalStyle;
  let rectReads=0;const rect=root.getBoundingClientRect.bind(root);root.getBoundingClientRect=()=>{rectReads++;return rect();};
  const x=boardRect.left+boardRect.width*4.5/8,y=boardRect.top+boardRect.width*6.5/8;
  // Synthetic pointers have no browser capture; real capture is covered by the drag tests.
  root.setPointerCapture=()=>{};
  root.dispatchEvent(new PointerEvent('pointerdown',{button:0,isPrimary:true,pointerId:1,clientX:x,clientY:y}));
  let frames=0;const originalFrame=window.requestAnimationFrame;window.requestAnimationFrame=()=>{frames++;return 0;};
  for(let i=0;i<1000;i++)view.drag({pointerId:1,clientX:x+i/20,clientY:y-i/20});
  view.drag({pointerId:1,clientX:x,clientY:y,getCoalescedEvents:()=>[{clientX:x+55,clientY:y-55}]});
  const moving=view.pieces.get('e2'),painted=moving.getBoundingClientRect();
  const error=Math.hypot(painted.left+painted.width/2-(x+55),painted.top+painted.height/2-(y-55));
  const focus=originalStyle(root,'::after'),focusBorder=originalStyle(root).outlineStyle==='none' && (!root.matches(':focus-visible') || focus.borderTopWidth==='3px');
  const transition=originalStyle(moving).transitionDuration,pixelDrag=moving.style.transform.includes('px'),composited=originalStyle(moving).willChange==='transform';
  view.cancel();const restored=moving.style.transform.replaceAll(' ','')===view.transform('e2').replaceAll(' ','');window.requestAnimationFrame=originalFrame;await new Promise(requestAnimationFrame);
  const cancelled=!root.querySelector('.dragging') && restored;view.destroy();
  return {mutations,styleReads,rectReads,frames,error,transition,focusBorder,pixelDrag,composited,cancelled,empty:root.childElementCount===0,squareRatio:pieceRect.width/boardRect.width};
 });
 assert.equal(result.mutations,0);assert.equal(result.styleReads,0);assert.equal(result.rectReads,1);assert.equal(result.frames,0);assert.ok(result.error<.1);assert.equal(result.transition,'0s');assert.equal(result.focusBorder,true);assert.equal(result.pixelDrag,true);assert.equal(result.composited,true);assert.equal(result.cancelled,true);assert.equal(result.empty,true);assert.equal(result.squareRatio,.125);
 }finally{await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});await cdp.detach();}
});
await t.test('legal drops stay at destination through delayed confirmation, with sliding off or on',async()=>{
 await page.setViewport({width:700,height:800});
 await page.goto(fixture.url+'/board-harness',{waitUntil:'networkidle0'});
 const cases=[
  ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1','e2e4','w'],
  ['4k3/8/3p4/4P3/8/8/8/4K3 w - - 0 1','e5d6','w'],
  ['4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1','e5d6','w'],
  ['r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1','e1g1','w'],
  ['4k3/P7/8/8/8/8/8/4K3 w - - 0 1','a7a8q','w'],
  ['4k3/7p/8/8/8/8/8/4K3 b - - 0 1','h7h5','b']
 ];
 for(const slide of [0,320])for(const [fen,move,side] of cases){
  const points=await page.evaluate(async({fen,move,side,slide})=>{
   await ChessilPreferences.ready;ChessilPreferences.update({slide,autoQueen:true});window.view?.destroy();
   window.model={fen,moves:mg(fen),turn:side,side,connected:true};window.submissions=[];
   window.view=new ChessilBoard(document.querySelector('cg-board'),{state:()=>model,submit:m=>{submissions.push(m);return true;},cancelPremove(){}});
   view.orientation=side;view.render(boardgen(fen));window.moving=view.pieces.get(move.slice(0,2));
   const rect=view.root.getBoundingClientRect();return [move.slice(0,2),move.slice(2,4)].map(s=>{const [x,y]=view.point(s);return {x:rect.left+(x+.5)*rect.width/8,y:rect.top+(y+.5)*rect.height/8};});
  },{fen,move,side,slide});
  await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();await page.mouse.move(points[1].x,points[1].y,{steps:5});await page.mouse.up();
  const result=await page.evaluate(async({move,target})=>{
   const samples=[];const sample=()=>{const r=moving.getBoundingClientRect();samples.push(Math.hypot(r.x+r.width/2-target.x,r.y+r.height/2-target.y));};
   sample();for(let i=0;i<8;i++){await new Promise(requestAnimationFrame);sample();}
   const unchanged=!!view.position[move.slice(0,2)],hidden=view.preview.changes.filter(c=>c.element.style.visibility==='hidden').length;
   const next=ucifen(move,model.fen,boardgen(model.fen),{});view.render(next.b,move,true);sample();
   await new Promise(requestAnimationFrame);sample();
   return {samples,unchanged,hidden,same:moving===view.pieces.get(move.slice(2,4)),animations:moving.getAnimations().length,submissions};
  },{move,target:points[1]});
  assert.ok(result.samples.every(n=>n<.1),move+' must never flash back');assert.equal(result.unchanged,true);assert.equal(result.same,true);assert.equal(result.animations,0);assert.deepEqual(result.submissions,[move]);
  if(move==='e5d6')assert.equal(result.hidden,1);
 }
 // Rejection/snapshot, timeout and failed submission restore the original view.
 const rollback=await page.evaluate(async()=>{
  view.destroy();const fen='4k3/8/3p4/4P3/8/8/8/4K3 w - - 0 1';model={fen,moves:mg(fen),turn:'w',side:'w',connected:true};
  view=new ChessilBoard(document.querySelector('cg-board'),{state:()=>model,submit:()=>true,cancelPremove(){}});view.render(boardgen(fen));
  const restored=()=>view.pieces.get('e5').style.transform.replaceAll(' ','')===view.transform('e5').replaceAll(' ','') && view.pieces.get('d6').style.visibility!== 'hidden' && !view.preview;
  view.propose('e5d6',true);view.render(boardgen(fen));const snapshot=restored();
  view.propose('e5d6',true);view.acknowledge();const rejected=restored();
  view.propose('e5d6',true);await new Promise(resolve=>setTimeout(resolve,5100));const timeout=restored() && !view.pending;
  view.submit=()=>false;view.propose('e5d6',true);return {snapshot,rejected,timeout,failed:restored() && !view.pending};
 });
 assert.deepEqual(rollback,{snapshot:true,rejected:true,timeout:true,failed:true});
 await page.screenshot({path:'/tmp/board-drop-verified.png'});
 await Promise.all([page.waitForResponse(r=>r.url().endsWith('/preferences') && r.request().method()==='POST'),page.evaluate(()=>ChessilPreferences.update({autoQueen:false}))]);
});
await t.test('dragging a focused board does not repaint the board on every pointer sample',async()=>{
 await page.goto(fixture.url+'/board-harness',{waitUntil:'networkidle0'});
 await page.evaluate(async()=>{await ChessilPreferences.ready;const fen='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';window.view=new ChessilBoard(document.querySelector('cg-board'),{state:()=>({fen,moves:mg(fen),turn:'w',side:'w',connected:true}),submit:()=>true,cancelPremove(){}});view.render(boardgen(fen));});
 const cdp=await page.target().createCDPSession();await cdp.send('LayerTree.enable');await cdp.send('DOM.enable');await cdp.send('CSS.enable');const {root:dom}=await cdp.send('DOM.getDocument');const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:dom.nodeId,selector:'cg-board'});await cdp.send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['focus-visible']});await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
 const rect=await page.$eval('cg-board',el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});let boardPaints=0;
 const record=event=>{if(event.clip.width>=rect.w-1 && event.clip.height>=rect.h-1)boardPaints++;};
 try {
  await page.mouse.move(rect.x+rect.w*4.5/8,rect.y+rect.h*6.5/8);await page.mouse.down();await page.mouse.move(rect.x+rect.w*.6,rect.y+rect.h*.6);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  cdp.on('LayerTree.layerPainted',record);
  await page.mouse.move(rect.x+rect.w*.8,rect.y+rect.h*.2,{steps:15});await page.mouse.move(rect.x+rect.w*.2,rect.y+rect.h*.8,{steps:15});
  cdp.off('LayerTree.layerPainted',record);
  assert.ok(boardPaints<=3,'expected compositor-only dragging, observed '+boardPaints+' board-sized paints');
 }finally{await page.mouse.up();await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});await cdp.detach();}
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
