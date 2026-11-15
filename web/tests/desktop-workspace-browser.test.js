const test=require('node:test'),assert=require('node:assert/strict'),puppeteer=require('puppeteer'),start=require('./helpers/board-server');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('desktop board workspaces use available space, top-align history and keep footer below viewport',async()=>{
 const f=await start(),browser=await puppeteer.launch({headless:'new',args:['--no-sandbox']});try{
  const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  for(const viewport of [{width:1440,height:1000},{width:1366,height:768},{width:1920,height:1440}]){
   await p.setViewport(viewport);const sizes=[];
   for(const [name,path] of [['game','/game/verify001'],['analysis','/en/analysis'],['training','/en/training']]){
    await p.goto(f.url+path,{waitUntil:'networkidle0'});await p.waitForFunction(()=>document.querySelector('cg-board piece'));
    if(name==='analysis')await p.waitForSelector('.book-move');
    if(name==='training')await p.waitForSelector('square.guide-source');
    const layout=await p.evaluate(()=>{const board=document.querySelector('cg-board').getBoundingClientRect();return{size:board.width,footer:document.querySelector('footer').getBoundingClientRect().top,overflow:document.documentElement.scrollWidth>innerWidth};});
    assert.ok(layout.footer>=viewport.height-1,JSON.stringify({name,viewport,layout}));assert.equal(layout.overflow,false);sizes.push(layout.size);
    if(name==='game'){assert.equal(await p.$('.game-heading'),null);assert.equal(await p.$eval('#share-game',e=>e.getBoundingClientRect().height),0);}
    if(name==='analysis'){
     const rail=await p.evaluate(()=>{const board=document.querySelector('cg-board').getBoundingClientRect(),book=document.querySelector('.book-panel').getBoundingClientRect();return{bottom:Math.abs(board.bottom-book.bottom),width:book.width,scrollbar:getComputedStyle(document.querySelector('#analysis-book-moves')).scrollbarWidth};});assert.ok(rail.bottom<2,JSON.stringify(rail));assert.ok(rail.width>=320);assert.equal(rail.scrollbar,'none');
    }
   }
   assert.ok(sizes.every(n=>Math.abs(n-sizes[0])<1),JSON.stringify(sizes));if(viewport.width===1440)assert.ok(sizes[0]>800);
  }
  await p.setViewport({width:1440,height:1000});await p.goto(f.url+'/en/analysis',{waitUntil:'networkidle0'});await p.waitForSelector('.book-move');await p.evaluate(()=>{if(document.querySelector('#analysis-engine-toggle').getAttribute('aria-label')==='Stop engine')document.querySelector('#analysis-engine-toggle').click();ChessilStudy.play('e2e4');ChessilStudy.play('e7e5');ChessilStudy.play('g1f3');ChessilStudy.play('b8c6');ChessilStudy.play('f1b5');});
  await p.waitForFunction(()=>document.querySelector('#analysis-book-eco').textContent==='C60');assert.equal(await p.$eval('#analysis-book-name',e=>e.textContent),'Ruy Lopez');
  const top=await p.evaluate(()=>{const list=document.querySelector('moves-list'),first=list.querySelector('move-entry');return first.getBoundingClientRect().top-list.getBoundingClientRect().top;});assert.ok(top<3);await delay(250);await p.screenshot({path:'/tmp/workspace-final-analysis-desktop.png',fullPage:true});
  await p.evaluate(()=>{gamereplay(1);ChessilStudy.play('c7c5');});assert.equal(await p.$('moves-list .history-variation'),null);assert.deepEqual(await p.$$eval('moves-list>move-entry',es=>es.map(e=>e.childNodes[0].textContent)),['e4','c5']);assert.ok(await p.$('moves-list [data-branch-point]'));await p.click('moves-list [data-branch-point]');await p.waitForSelector('#study-tree-dialog[open]');assert.ok(await p.$('#study-tree-content .history-variation'));await p.click('#study-tree-close');
  await p.evaluate(()=>{gamereplay(0);for(let i=0;i<60;i++)for(const move of ['g1f3','g8f6','f3g1','f6g8'])ChessilStudy.play(move);gamereplay(1);});await delay(100);assert.equal(await p.$eval('moves-list',e=>e.scrollTop),0);assert.ok(await p.$eval('moves-list',e=>e.scrollHeight>e.clientHeight));
  f.game.history=['e2e4','e7e5'];f.game.times=[299000,299000];f.game.state=7;f.game.events='b1';
  for(const width of [1440,390]){await p.setViewport({width,height:1000});await p.goto(f.url+'/game/verify001',{waitUntil:'networkidle0'});await p.waitForSelector('.result-wrap #analyze-game:not([hidden])');assert.ok(await p.$eval('.result-wrap #share-game',e=>e.getBoundingClientRect().height>0&&!e.disabled));assert.equal(await p.$('.game-heading'),null);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:'/tmp/workspace-result-'+width+'.png',fullPage:true});}
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await f.close();}
});
test('engine idle timeout follows position changes, shares options and supports Never without a transport cap',async()=>{
 const f=await start(),browser=await puppeteer.launch({headless:'new',args:['--no-sandbox']});try{
  const p=await browser.newPage();await p.evaluateOnNewDocument(()=>{
   window.idleTimers=[];window.engineCommands=[];const schedule=setTimeout,cancel=clearTimeout,post=Worker.prototype.postMessage;window.setTimeout=(fn,ms,...args)=>{const id=schedule(fn,ms,...args);if(String(fn).includes('minutes without a position change'))idleTimers.push({id,fn,ms,cancelled:false});return id;};window.clearTimeout=id=>{const timer=idleTimers.find(t=>t.id===id);if(timer)timer.cancelled=true;cancel(id);};Worker.prototype.postMessage=function(message,...args){if(typeof message==='string')engineCommands.push(message);return post.call(this,message,...args);};
  });await p.goto(f.url+'/en/analysis',{waitUntil:'networkidle0'});await p.waitForFunction(()=>engineCommands.includes('go infinite'),{timeout:60000});
  const first=await p.evaluate(()=>idleTimers.length);assert.ok(first>0);await delay(400);assert.equal(await p.evaluate(()=>idleTimers.length),first,'engine output must not reset inactivity');
  await p.evaluate(()=>ChessilStudy.play('e2e4'));await p.waitForFunction(n=>idleTimers.length>n,{},first);assert.equal(await p.evaluate(()=>idleTimers[0].cancelled),true);assert.ok(await p.evaluate(()=>idleTimers.at(-1).ms>14*60000));
  await p.click('#analysis-options-toggle');await p.waitForSelector('[data-engine-option="idleMinutes"] option');assert.deepEqual(await p.$$eval('[data-engine-option="idleMinutes"] option',es=>es.map(e=>e.value)),['5','10','15','30','0']);assert.equal(await p.$eval('[data-engine-option="idleMinutes"]',e=>e.value),'15');
  const commands=await p.evaluate(()=>engineCommands.filter(c=>c==='uci').length);await p.select('[data-engine-option="idleMinutes"]','0');assert.equal(await p.evaluate(()=>idleTimers.every(t=>t.cancelled)),true);await p.evaluate(()=>ChessilStudy.play('e7e5'));assert.equal(await p.evaluate(()=>idleTimers.every(t=>t.cancelled)),true);assert.equal(await p.evaluate(()=>engineCommands.filter(c=>c==='uci').length),commands,'timeout setting must not restart the worker');
  await p.select('[data-engine-option="idleMinutes"]','5');assert.ok(await p.evaluate(()=>idleTimers.at(-1).ms<=5*60000&&idleTimers.at(-1).ms>4*60000));
  await p.click('.dasher > button');await p.click('#open-board-settings');await p.waitForSelector('#board-settings-dialog [data-engine-option="idleMinutes"] option');assert.equal(await p.$eval('#board-settings-dialog [data-engine-option="idleMinutes"]',e=>e.value),'5');await p.select('#board-settings-dialog [data-engine-option="idleMinutes"]','30');await p.keyboard.press('Escape');assert.equal(await p.$eval('#analysis-options-fields [data-engine-option="idleMinutes"]',e=>e.value),'30');
  await p.evaluate(()=>idleTimers.at(-1).fn());assert.equal(await p.$eval('#analysis-engine-toggle',e=>e.getAttribute('aria-label')),'Start engine');assert.match(await p.$eval('#analysis-status',e=>e.textContent),/30 minutes without a position change/);
  // No timer exists on an infinite UCI command; bounded commands retain one.
  assert.equal(await p.evaluate(async()=>{const e=new ChessilLocalEngine();e.worker={postMessage(){},terminate(){}};const pending=e.command('go infinite',()=>false,0).catch(()=>{});const timer=e.pending.timer;e.close();await pending;return timer;}),null);
 }finally{await browser.close();await f.close();}
});
