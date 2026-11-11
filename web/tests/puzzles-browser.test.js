const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
const render=require('../render-page'),{normalize}=require('../../shared/ui-preferences');
test('puzzles solve locally, refill below 12, persist and survive offline play in the shared board',async()=>{
 const calls=[],errors=[];let serial=0;
 const puzzle=(black=false)=>({id:String(++serial).padStart(5,'0'),fen:'r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24',moves:['f2g3','e6e7','b2b1','b3c1','b1c1','h6c1'],rating:1819,themes:['crushing','long'],gameUrl:'https://lichess.org/787zsVup'});
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://local');
 if(url.pathname==='/api/training/puzzles'){calls.push(url);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({puzzles:Array.from({length:16},()=>{const p=puzzle();if(url.searchParams.get('theme')==='mateIn1'){p.fen='7k/pQp2Bpp/1n1p2r1/8/3P4/4rP1q/PP2R2P/R6K w - - 0 24';p.moves=['f7g6','e3e2','b7b8','b6c8','b8c8','h3c8'];}return p;})}));return;}
 if(url.pathname==='/api/training/puzzle-themes'){res.end(JSON.stringify({themes:[{id:'crushing',count:100},{id:'mateIn1',count:20}]}));return;}
 if(url.pathname==='/api/training/curriculum'){res.end(JSON.stringify(require('../training/curriculum')));return;}
 if(url.pathname==='/api/training/progress'){res.end(JSON.stringify({account:false,progress:{}}));return;}
 if(url.pathname==='/preferences'){res.end(JSON.stringify({account:false,preferences:normalize()}));return;}
 if(url.pathname==='/loggedin'){res.end('0');return;}
 try{const file=path.join(__dirname,'../web',url.pathname==='/training/puzzles'?'/en/training/puzzles/index.html':url.pathname==='/training'?'/en/training/index.html':url.pathname),ext=path.extname(file),data=fs.readFileSync(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'})[ext]||'application/json');res.end(ext==='.html'?render(data,'en','l'):data);}catch(_){res.statusCode=404;res.end('missing');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
 try{const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.evaluateOnNewDocument(()=>{window.pieceAnimations=[];const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){if(this.tagName==='PIECE')window.pieceAnimations.push({square:this.dataset.square,frames});return animate.call(this,frames,options);};});await page.setViewport({width:1440,height:1000});await page.goto('http://127.0.0.1:'+server.address().port+'/training/puzzles',{waitUntil:'networkidle0'});
 await page.waitForFunction(()=>!document.querySelector('#puzzle-hint').disabled);assert.equal(calls.length,1);assert.ok(await page.evaluate(()=>pieceAnimations.some(a=>a.square==='g3'&&a.frames[0].transform!==a.frames[1].transform)));
 async function move(uci){for(const s of [uci.slice(0,2),uci.slice(2,4)]){const p=await page.$eval('cg-board',(el,s)=>{const r=el.getBoundingClientRect();return {x:r.x+(s.charCodeAt(0)-97+.5)*r.width/8,y:r.y+(8-Number(s[1])+.5)*r.height/8};},s);await page.mouse.click(p.x,p.y);}}
 await move('e6e5');await page.waitForFunction(()=>document.querySelector('#puzzle-status').textContent==='Try another move.');
 await move('e6e7');await page.waitForFunction(()=>document.querySelector('moves-list').querySelectorAll('move-entry').length===3);
 await move('b3c1');await page.waitForFunction(()=>document.querySelector('moves-list').querySelectorAll('move-entry').length===5);
 await move('h6c1');await page.waitForFunction(()=>document.querySelector('#puzzle-status').textContent==='Puzzle solved.');assert.equal(await page.$eval('#puzzle-source',e=>e.hidden),false);
 for(let i=0;i<3;i++)await page.click('#puzzle-next');assert.equal(calls.length,1);
 await page.click('#puzzle-next');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('chessil.puzzles.v1.mixed')).items.length===28);assert.equal(calls.length,2);assert.equal(calls[1].searchParams.get('exclude').split(',').length,16);
 await page.setOfflineMode(true);for(let i=0;i<5;i++)await page.click('#puzzle-next');await page.waitForFunction(()=>!document.querySelector('#puzzle-hint').disabled);await page.click('#puzzle-hint');await page.waitForFunction(()=>document.querySelector('#puzzle-status').textContent.startsWith('Try '));await page.click('#puzzle-solution');await page.waitForFunction(()=>document.querySelector('#puzzle-status').textContent.startsWith('Solution shown'));assert.equal(calls.length,2);
 await page.setOfflineMode(false);await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>!document.querySelector('#puzzle-next').disabled);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('chessil.puzzles.v1.mixed')).items.length),23);
 await page.select('#puzzle-type','crushing');await page.waitForFunction(()=>!document.querySelector('#puzzle-hint').disabled);assert.equal(calls.at(-1).searchParams.get('theme'),'crushing');
 // Switch both ways while most pieces remain unchanged: each piece must move
 // to its oriented square, not just the pieces involved in the setup move.
 async function orientation(black){assert.equal(await page.$eval('coords.files coord',e=>e.textContent),black?'h':'a');assert.equal(await page.$eval('coords.ranks coord',e=>e.textContent),black?'1':'8');assert.equal(await page.$$eval('cg-board piece',(els,black)=>els.every(el=>{const sq=el.dataset.square,f=sq.charCodeAt(0)-97,r=Number(sq[1])-1;return el.style.transform===`translate(${(black?7-f:f)*100}%, ${(black?r:7-r)*100}%)`;}),black),true);}
 await orientation(false);await page.select('#puzzle-type','mateIn1');await page.waitForFunction(()=>!document.querySelector('#puzzle-hint').disabled);await orientation(true);
 await page.select('#puzzle-type','crushing');await page.waitForFunction(()=>!document.querySelector('#puzzle-hint').disabled);await orientation(false);
 assert.equal(await page.$('#puzzle-buffer'),null);assert.equal(await page.$eval('#puzzle-connection',e=>e.hidden),true);
 // Review does not permit solving from a past position and never reveals
 // unplayed solution moves. Navigation supports the game's keyboard shortcuts.
 await page.click('#rw');assert.equal(await page.$eval('#puzzle-hint',e=>e.disabled),true);assert.equal(await page.$eval('moves-list',e=>e.querySelectorAll('move-entry').length),1);
 await page.keyboard.press('End');assert.equal(await page.$eval('#puzzle-hint',e=>e.disabled),false);
 await page.click('#puzzle-solution');assert.equal(await page.$eval('moves-list',e=>e.querySelectorAll('move-entry').length),2);
 await page.waitForFunction(()=>document.querySelector('moves-list').querySelectorAll('move-entry').length===3);
 assert.equal(await page.$eval('#puzzle-status',e=>e.textContent),'Solution…');
 await page.waitForFunction(()=>document.querySelector('#puzzle-status').textContent.startsWith('Solution shown'));
 await page.click('#sb');assert.equal(await page.$eval('move-entry.a1t',e=>e.getAttribute('ply')),'5');await page.click('move-entry[ply="2"]');assert.equal(await page.$eval('move-entry.a1t',e=>e.getAttribute('ply')),'2');await page.keyboard.press('End');assert.equal(await page.$eval('move-entry.a1t',e=>e.getAttribute('ply')),'6');
 await page.setViewport({width:390,height:844});await page.screenshot({path:'/tmp/chessil-puzzles-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const size=await page.$eval('cg-board',e=>e.getBoundingClientRect().width);assert.ok(size>300);// Existing lesson boards also reposition stationary pieces when switching
 // from a white repertoire to a black repertoire and back.
 await page.goto('http://127.0.0.1:'+server.address().port+'/training',{waitUntil:'networkidle0'});await page.waitForSelector('.training-lesson');await page.click('[data-section="openings"]');
 await page.select('#training-repertoire','black');await orientation(true);await page.select('#training-repertoire','e4');await orientation(false);
 assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
