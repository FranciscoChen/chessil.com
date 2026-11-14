const test=require('node:test'),assert=require('node:assert/strict'),puppeteer=require('puppeteer'),start=require('./helpers/board-server');
const fen='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
for(const mode of ['no-simd','thread-failure','optimized-failure'])test('real engine compatibility: '+mode,async()=>{
 const f=await start(),browser=await puppeteer.launch({headless:'new',args:['--no-sandbox']});try{
  f.preferences.analysis.threads=2;
  const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  if(mode==='no-simd')await p.evaluateOnNewDocument(()=>{const validate=WebAssembly.validate;WebAssembly.validate=function(bytes,...rest){return bytes.byteLength<100?false:validate.call(this,bytes,...rest);};});
  if(mode!=='no-simd'){await p.setRequestInterception(true);p.on('request',r=>{const url=r.url();if(url.endsWith('/chessil-stockfish.js')&&(url.includes('/c843bc805853e0f5/')||mode==='optimized-failure'&&url.includes('/55f00e29b7f308f6/')))r.respond({status:200,contentType:'text/javascript',headers:{'Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin'},body:'throw new Error("Simulated optimized-worker startup failure");'});else r.continue();});}
  await p.goto(f.url+'/en/analysis',{waitUntil:'networkidle0'});
  await p.waitForFunction(()=>document.querySelector('#analysis-status').textContent.startsWith('Analyzing position'),{timeout:60000});
  assert.equal(await p.$eval('#analysis-engine-toggle',e=>e.getAttribute('aria-label')),'Stop engine');
  assert.equal(f.requests.includes('/engine/manifest-scalar.json'),mode!=='thread-failure');
  if(mode==='no-simd'){assert.equal(f.requests.includes('/engine/manifest-threaded.json'),false);assert.equal(f.requests.includes('/engine/manifest.json'),false);}
  assert.equal(f.requests.some(path=>path.endsWith('.nnue')),false);
  const source=await p.$eval('#analysis-source',e=>e.getAttribute('href'));if(mode!=='thread-failure')assert.match(source,/variant=scalar/);
  // A recovered engine must still navigate, search again, and stop normally.
  await p.evaluate(()=>ChessilStudy.play('e2e4'));await p.waitForFunction(()=>document.querySelectorAll('.engine-line').length>0,{timeout:30000});
  await p.click('#analysis-engine-toggle');assert.equal(await p.$eval('#analysis-engine-toggle',e=>e.getAttribute('aria-label')),'Start engine');
  assert.doesNotMatch(await p.$eval('#analysis-status',e=>e.textContent),/SIMD|could not/);assert.deepEqual(errors,[]);
  if(mode==='no-simd'){await p.goto(f.url+source,{waitUntil:'networkidle0'});await p.waitForSelector('[data-engine-source-downloads]:not([hidden])');assert.equal(await p.$eval('[data-source-variant]',e=>e.value),'scalar');assert.match(await p.$eval('[data-source-download]',e=>e.href),/76c9b13c4a387dab/);}
 }finally{await browser.close();await f.close();}
});
test('book probability bars without scores, WDL when available, and accurate failure text',async()=>{
 const f=await start(),browser=await puppeteer.launch({headless:'new',args:['--no-sandbox']});try{
  const p=await browser.newPage();await p.setViewport({width:390,height:844});await p.setRequestInterception(true);p.on('request',r=>r.url().endsWith('/chessil-stockfish.js')?r.respond({status:200,contentType:'text/javascript',headers:{'Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin'},body:'throw new Error("Worker blocked by test browser");'}):r.continue());
  await p.goto(f.url+'/en/analysis',{waitUntil:'networkidle0'});await p.waitForFunction(()=>document.querySelector('#analysis-status').textContent.includes('retry'),{timeout:60000});await p.waitForSelector('.book-wdl.is-probability');
  const status=await p.$eval('#analysis-status',e=>e.textContent);assert.match(status,/Worker blocked by test browser/);assert.doesNotMatch(status,/SIMD/);
  assert.equal(await p.$$eval('.book-wdl.is-unknown',es=>es.length),0);assert.match(await p.$eval('.book-wdl',e=>e.getAttribute('aria-label')),/^Policy probability \d+\.\d%$/);await p.screenshot({path:'/tmp/engine-fallback-book-mobile.png',fullPage:true});
  const result=await p.evaluate(async fen=>{
   const host=document.createElement('div'),book=new ChessilAnalysisBook(host,{lookup:async()=>({name:'test',moves:[['e2e4','e4',250,1000]]})},{play(){},scoreText:()=>'+0.20'});
   await book.render({fen,ply:0,perspective:'b'});const row=host.querySelector('[data-move="e2e4"] .book-wdl'),prior=row.getAttribute('aria-label');
   await book.render({fen,ply:0,perspective:'b',lines:[{pv:['e2e4'],kind:'cp',value:20,depth:12,wdl:[600,300,100]}]});const wdl=row.getAttribute('aria-label'),isPolicy=row.classList.contains('is-probability');
   await book.render({fen,ply:0,perspective:'b'});return{prior,wdl,isPolicy,reset:row.getAttribute('aria-label'),q:ChessilWdl.render(row,{probability:0}).q};
  },fen);assert.deepEqual(result,{prior:'Policy probability 25.0%',wdl:'Win 10%, Draw 30%, Loss 60%',isPolicy:false,reset:'Policy probability 25.0%',q:null});
  await p.setViewport({width:1440,height:1000});await p.screenshot({path:'/tmp/engine-fallback-book-desktop.png',fullPage:true});
 }finally{await browser.close();await f.close();}
});
