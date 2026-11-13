const test=require('node:test'),assert=require('node:assert/strict'),puppeteer=require('puppeteer'),start=require('./helpers/board-server');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('shared study: bounded history, nested branches, reorder, promotion, deletion, book and flipped coordinates',async()=>{
 const f=await start(),browser=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
 try{
  const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.setViewport({width:1440,height:1000});await p.goto(f.url+'/en/analysis',{waitUntil:'networkidle0'});
  await p.waitForFunction(()=>document.querySelector('#analysis-engine-toggle')?.getAttribute('aria-label')==='Stop engine');
  await p.waitForFunction(()=>[...document.querySelectorAll('.book-eval')].every(e=>e.textContent!=='—'),{timeout:60000});
  assert.equal(await p.$eval('#analysis-book-moves',e=>e.dataset.ranking),'policy');
  await p.click('#analysis-engine-toggle');
  await p.evaluate(()=>{for(let i=0;i<40;i++)for(const move of ['g1f3','g8f6','f3g1','f6g8'])ChessilStudy.play(move);});await delay(150);
  const bounds=await p.evaluate(()=>{const list=document.querySelector('moves-list'),panel=document.querySelector('moves-panel'),board=document.querySelector('cg-board'),entry=list.querySelector('.a1t'),l=list.getBoundingClientRect(),r=entry.getBoundingClientRect();return{scroll:list.scrollHeight>list.clientHeight,panel:panel.getBoundingClientRect().height,board:board.getBoundingClientRect().height,center:Math.abs((l.top+l.bottom-r.top-r.bottom)/2)};});
  assert.equal(bounds.scroll,true);assert.ok(bounds.panel<=bounds.board);assert.ok(bounds.center<25,JSON.stringify(bounds));
  await p.evaluate(()=>{const list=document.querySelector('moves-list');list.scrollTop=0;ChessilHistoryFocus(list,list.querySelector('.a1t'));});await delay(100);assert.equal(await p.$eval('moves-list',e=>e.scrollTop),0,'same position must not recenter manual scrolling');
  await p.evaluate(()=>{document.querySelector('#study-reset').click();ChessilStudy.play('e2e4');ChessilStudy.play('e7e5');gamereplay(0);ChessilStudy.play('d2d4');ChessilStudy.play('d7d5');gamereplay(0);ChessilStudy.play('c2c4');ChessilStudy.play('c7c5');document.querySelector('moves-list move-entry[data-ply="1"]').click();ChessilStudy.play('c7c5');});
  assert.equal(await p.evaluate(()=>ChessilStudy.branches()),7);
  const rootBranches=()=>p.$$eval('#study-tree-content > details',es=>es.map(e=>e.querySelector('summary').textContent).filter(text=>text.startsWith('1. ')));
  assert.deepEqual(await rootBranches(),['1. d4','1. c4']);
  await p.evaluate(()=>document.querySelectorAll('#study-tree-content > details')[1].querySelector('[data-branch-action="earlier"]').click());assert.deepEqual(await rootBranches(),['1. c4','1. d4']);
  await p.evaluate(()=>document.querySelector('#study-tree-content > details [data-branch-action="promote"]').click());assert.deepEqual(await rootBranches(),['1. e4','1. d4']);
  await p.evaluate(()=>[...document.querySelectorAll('#study-tree-content > details')].find(e=>e.querySelector('summary').textContent==='1. e4').querySelector('[data-branch-action="delete"]').click());assert.equal(await p.evaluate(()=>ChessilStudy.branches()),4);assert.deepEqual(await rootBranches(),['1. d4']);
  await p.setViewport({width:390,height:844});await p.click('#study-tree-toggle');await p.waitForSelector('#study-tree-dialog[open]');await p.$eval('#study-tree-content details summary',e=>e.click());await p.click('#study-tree-content [data-branch-action="select"]');assert.equal(await p.$('#study-tree-dialog[open]'),null);assert.equal(await p.evaluate(()=>uci[0]),'d2d4');
  await p.click('#study-flip');assert.equal(await p.evaluate(()=>boardView.orientation),'b');assert.equal(await p.$eval('coords.files coord',e=>e.textContent),'h');
  assert.equal(await p.evaluate(()=>{const ranks=document.querySelector('coords.ranks').getBoundingClientRect(),files=document.querySelector('coords.files').getBoundingClientRect(),board=document.querySelector('cg-board').getBoundingClientRect();return ranks.left<board.left+20&&files.top<board.top+20;}),true);
  assert.ok(await p.$('cg-board .board-cue-turn'));
  for(const width of [320,390,1440]){await p.setViewport({width,height:1000});await p.evaluate(()=>{document.activeElement.blur();scrollTo(0,0)});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:'/tmp/study-'+width+'.png',fullPage:true});}
  assert.equal(f.requests.some(s=>s==='/gameinfo'||s==='/gamestate'),false);assert.deepEqual(errors,[]);
 }finally{await browser.close();await f.close();}
});
test('played-game source survives promotion and deletion of its local displayed branch',async()=>{
 const f=await start(),browser=await puppeteer.launch({headless:'new',args:['--no-sandbox']});try{f.game.history=['e2e4','e7e5','g1f3'];f.game.times=[299000,299000,299000];f.game.state=7;f.game.side='b';const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.setViewport({width:1440,height:1000});await p.goto(f.url+'/en/analysis?game=verify001',{waitUntil:'networkidle0'});await p.waitForFunction(()=>ChessilStudy.ready&&uci.length===3);await p.evaluate(()=>{document.querySelector('#analysis-engine-toggle').click();ChessilStudy.selectOriginal(0);ChessilStudy.play('d2d4');ChessilStudy.play('d7d5');document.querySelector('#study-tree-content > details [data-branch-action="promote"]').click();[...document.querySelectorAll('#study-tree-content > details')].find(e=>e.querySelector('summary').textContent==='1. e4').querySelector('[data-branch-action="delete"]').click();});assert.deepEqual(await p.evaluate(()=>ChessilStudy.source().moves),f.game.history);assert.equal(await p.evaluate(()=>ChessilStudy.branches()),2);assert.equal(await p.evaluate(()=>ChessilStudy.selectOriginal(3)),true);assert.deepEqual(await p.evaluate(()=>uci),f.game.history);assert.equal(await p.evaluate(()=>ChessilStudy.inVariation()),false);assert.equal(await p.evaluate(()=>boardView.orientation),'b');assert.deepEqual(errors,[]);}finally{await browser.close();await f.close();}
});
