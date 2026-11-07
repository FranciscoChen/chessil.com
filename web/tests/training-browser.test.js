const test=require('node:test'),assert=require('node:assert/strict'),http=require('http'),fs=require('fs'),path=require('path'),puppeteer=require('puppeteer');
const render=require('../render-page'),curriculum=require('../training/curriculum'),{normalize}=require('../../shared/ui-preferences');
test('training shared board flows, recall, puzzles, progress and responsive layout',async()=>{
 const errors=[];let prefs=normalize();const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://local');if(url.pathname==='/api/training/curriculum'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(curriculum));return;}if(url.pathname==='/api/training/progress'){res.end(JSON.stringify({account:false,progress:{}}));return;}if(url.pathname==='/preferences'){if(req.method==='POST'){let body='';for await(const c of req)body+=c;prefs=normalize(JSON.parse(body));}res.end(JSON.stringify({account:false,preferences:prefs}));return;}if(url.pathname==='/loggedin'){res.end('0');return;}const file=url.pathname==='/training'?'/en/training/index.html':url.pathname;try{const actual=path.join(__dirname,'../web',file),ext=path.extname(file),body=fs.readFileSync(actual);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'})[ext]||'application/json');res.end(ext==='.html'?render(body,'en','l'):body);}catch(_){res.statusCode=404;res.end('missing');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
 try{const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1440,height:1050});await page.goto('http://127.0.0.1:'+server.address().port+'/training',{waitUntil:'networkidle0'});await page.waitForSelector('.training-lesson');assert.ok(await page.$eval('#training-title',e=>e.textContent.length>2));
 async function square(name){return page.$eval('cg-board',(root,s)=>{const r=root.getBoundingClientRect(),f=s.charCodeAt(0)-97,k=8-Number(s[1]);return {x:r.x+(f+.5)*r.width/8,y:r.y+(k+.5)*r.height/8};},name);}
 async function move(uci){for(const s of [uci.slice(0,2),uci.slice(2,4)]){const p=await square(s);await page.mouse.click(p.x,p.y);}}
 assert.equal(await page.$('#training-start'),null);
 assert.ok(await page.$('cg-board square.guide-source'));
 await page.screenshot({path:'/tmp/training-guided-source.png'});
 const first=curriculum.tutorial[0].moves[0];await page.mouse.click(...Object.values(await square(first.slice(0,2))));
 assert.ok(await page.$(`cg-board square.guide-destination[data-square="${first.slice(2,4)}"]`));
 assert.ok(await page.$('cg-board square.move-dest'));
 await page.screenshot({path:'/tmp/training-guided-destination.png'});
 await page.click('[data-section="openings"]');const opening=curriculum.openings.find(l=>l.repertoire==='d4');
 assert.ok(await page.$(`cg-board square.guide-source[data-square="${opening.moves[0].slice(0,2)}"]`));
 for(let pass=0;pass<3;pass++){
  if(pass===1){assert.match(await page.$eval('#training-status',e=>e.textContent),/Take a moment/);await page.waitForFunction(()=>document.querySelector('#training-status').textContent.startsWith('Hint:'),{timeout:9000});}
  if(pass===2){assert.equal(await page.$eval('#training-hint',e=>e.hidden),true);await move('a2a3');assert.match(await page.$eval('#training-status',e=>e.textContent),/Try again/);}
  for(let i=0;i<opening.moves.length;i++){
   if(i%2===0){await page.waitForFunction(n=>document.querySelectorAll('#training-line .training-ply').length===n,{},i);await move(opening.moves[i]);}
  }
  await page.waitForFunction(()=>!document.querySelector('#training-next').hidden,{timeout:5000}).catch(async e=>{throw Error('Pass '+pass+': '+await page.$eval('#training-status',el=>el.textContent)+' errors '+errors.join(', '));});
  if(pass===0){assert.equal(await page.$eval('#training-autoplay',e=>e.hidden),false);assert.match(await page.$eval('#training-autoplay-label',e=>e.textContent),/Next practice stage in 5s/);await page.waitForFunction(()=>document.querySelector('#training-stage').textContent.startsWith('02'),{timeout:7000});assert.equal(await page.$eval('#training-autoplay',e=>e.hidden),true);}
  if(pass===1)await page.click('#training-next');
 }
 assert.match(await page.$eval('#training-status',e=>e.textContent),/Lesson complete/);assert.equal(await page.evaluate(id=>JSON.parse(localStorage.getItem('chessil.training.v1'))[id].completed,opening.id),true);
 assert.equal(await page.$eval('#training-autoplay',e=>e.hidden),false);
 await page.screenshot({path:'/tmp/training-autoplay.png'});
 await page.waitForFunction(title=>document.querySelector('#training-title').textContent!==title,{timeout:7000},opening.title);
 assert.equal(await page.$eval('#training-autoplay',e=>e.hidden),true);
 assert.ok(await page.$('cg-board square.guide-source'));
 await page.click('[data-section="tactics"]');await page.click('#training-storm');await page.waitForFunction(()=>!document.querySelector('#training-stop').hidden);assert.equal(await page.$eval('#training-hint',e=>e.hidden),true);await page.click('#training-stop');assert.match(await page.$eval('#training-status',e=>e.textContent),/Session stopped/);
 await page.click('#training-storm');await page.evaluate(()=>{window.originalTrainingNow=Date.now;const expired=Date.now()+181000;Date.now=()=>expired;});await page.waitForFunction(()=>document.querySelector('#training-status').textContent.includes('Time is up'));assert.match(await page.$eval('#training-status',e=>e.textContent),/0 puzzles solved/);await page.evaluate(()=>Date.now=window.originalTrainingNow);
 await page.click('[data-section="strategy"]');assert.ok(await page.$$eval('.training-lesson',n=>n.length)>5);await page.click('#training-hint');assert.match(await page.$eval('#training-status',e=>e.textContent),/Try /);
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));assert.equal(await page.$$eval('cg-board piece',n=>n.length),32);await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));assert.match(await page.$eval('#training-status',e=>e.textContent),/Play your move/);
 await page.screenshot({path:'/tmp/training-desktop.png',fullPage:true});await page.evaluate(()=>document.documentElement.dataset.theme='dark');await page.screenshot({path:'/tmp/training-dark.png',fullPage:true});await page.evaluate(()=>document.documentElement.dataset.theme='light');await page.setViewport({width:390,height:844});await page.goto('http://127.0.0.1:'+server.address().port+'/training#strategy',{waitUntil:'networkidle0'});await page.waitForSelector('.training-lesson');assert.equal(await page.$eval('#x',el=>el.checked),false);await page.waitForFunction(()=>getComputedStyle(document.querySelector('#n')).opacity==='0');await page.screenshot({path:'/tmp/training-mobile-viewport.png'});await page.screenshot({path:'/tmp/training-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
