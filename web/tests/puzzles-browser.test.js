const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
const render=require('../render-page'),{normalize}=require('../../shared/ui-preferences');
test('puzzles solve locally, refill below 12, persist and survive offline play in the shared board',async()=>{
 const calls=[],errors=[];let serial=0;
 const puzzle=()=>({id:String(++serial).padStart(5,'0'),fen:'r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24',moves:['f2g3','e6e7','b2b1','b3c1','b1c1','h6c1'],rating:1819,themes:['crushing','long'],gameUrl:'https://lichess.org/787zsVup'});
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://local');
 if(url.pathname==='/api/training/puzzles'){calls.push(url);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({puzzles:Array.from({length:16},puzzle)}));return;}
 if(url.pathname==='/api/training/puzzle-themes'){res.end(JSON.stringify({themes:[{id:'crushing',count:100},{id:'mateIn1',count:20}]}));return;}
 if(url.pathname==='/preferences'){res.end(JSON.stringify({account:false,preferences:normalize()}));return;}
 if(url.pathname==='/loggedin'){res.end('0');return;}
 try{const file=path.join(__dirname,'../web',url.pathname==='/training/puzzles'?'/en/training/puzzles/index.html':url.pathname),ext=path.extname(file),data=fs.readFileSync(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'})[ext]||'application/json');res.end(ext==='.html'?render(data,'en','l'):data);}catch(_){res.statusCode=404;res.end('missing');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
 try{const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1440,height:1000});await page.goto('http://127.0.0.1:'+server.address().port+'/training/puzzles',{waitUntil:'networkidle0'});
 await page.waitForFunction(()=>document.querySelector('#puzzle-buffer').textContent==='15 ready');assert.equal(calls.length,1);
 async function move(uci){for(const s of [uci.slice(0,2),uci.slice(2,4)]){const p=await page.$eval('cg-board',(el,s)=>{const r=el.getBoundingClientRect();return {x:r.x+(s.charCodeAt(0)-97+.5)*r.width/8,y:r.y+(8-Number(s[1])+.5)*r.height/8};},s);await page.mouse.click(p.x,p.y);}}
 await move('e6e5');await page.waitForFunction(()=>document.querySelector('#puzzle-status').textContent==='Try another move.');
 await move('e6e7');await page.waitForFunction(()=>document.querySelector('#puzzle-line').children.length===3);
 await move('b3c1');await page.waitForFunction(()=>document.querySelector('#puzzle-line').children.length===5);
 await move('h6c1');await page.waitForFunction(()=>document.querySelector('#puzzle-status').textContent==='Puzzle solved.');assert.equal(await page.$eval('#puzzle-source',e=>e.hidden),false);
 for(let i=0;i<3;i++)await page.click('#puzzle-next');assert.equal(calls.length,1);
 await page.click('#puzzle-next');await page.waitForFunction(()=>document.querySelector('#puzzle-buffer').textContent==='27 ready');assert.equal(calls.length,2);assert.equal(calls[1].searchParams.get('exclude').split(',').length,16);
 await page.setOfflineMode(true);for(let i=0;i<5;i++)await page.click('#puzzle-next');await page.click('#puzzle-hint');await page.waitForFunction(()=>document.querySelector('#puzzle-status').textContent.startsWith('Try '));await page.click('#puzzle-solution');assert.match(await page.$eval('#puzzle-status',e=>e.textContent),/Solution shown/);assert.equal(calls.length,2);
 await page.setOfflineMode(false);await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>!document.querySelector('#puzzle-next').disabled);assert.match(await page.$eval('#puzzle-buffer',e=>e.textContent),/22 ready/);
 await page.select('#puzzle-type','crushing');await page.waitForFunction(()=>document.querySelector('#puzzle-buffer').textContent==='15 ready');assert.equal(calls.at(-1).searchParams.get('theme'),'crushing');
 await page.setViewport({width:390,height:844});await page.screenshot({path:'/tmp/chessil-puzzles-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const size=await page.$eval('cg-board',e=>e.getBoundingClientRect().width);assert.ok(size>300);assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
