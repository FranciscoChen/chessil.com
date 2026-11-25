const test = require('node:test');
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer');
const start = require('./helpers/board-server');

test('Hybrid V5 uses its match weights, supports stopping search, and falls back without SIMD', async () => {
 const fixture = await start();
 const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
 try {
  const page = await browser.newPage();
  await page.goto(fixture.url + '/board-harness', { waitUntil: 'domcontentloaded' });
  await page.addScriptTag({ url: fixture.url + '/js/analysis.min.js' });
  assert.equal(await page.evaluate(() => ChessilPreferences.get().analysis.engine), 'stockfish-lite');
  const defaultEngine = await page.evaluate(async () => {
   const engine = new ChessilLocalEngine();
   try {
    await engine.load();
    return engine.engineId;
   } finally {
    engine.close();
   }
  });
  assert.equal(defaultEngine, 'stockfish-lite');
  assert.ok(fixture.requests.includes('/engine/manifest.json'));
  assert.equal(fixture.requests.some(path => /manifest-hybrid|\.(policy|nnue.gz)$/.test(path)), false);
  const result = await page.evaluate(async () => {
   const engine = new ChessilLocalEngine();
   const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
   const messages = [];
   try {
    const manifest = await engine.load({ engine: 'stockfish-hybrid', network: 'default', threads: 1, hash: 16 });
    engine.worker.addEventListener('message', event => messages.push(event.data));
    engine.worker.postMessage('setoption name PolicySearchStats value true');
    engine.worker.postMessage('position startpos');
    const bounded = await engine.command('go depth 8', line => line.startsWith('bestmove '), 15000);
    const line = messages.find(entry => /^info depth 8 .* nodes 3219 /.test(entry));
    const active = messages.some(entry => /^info string PolicySearch hybrid active/.test(entry));
    const statistics = messages.filter(entry => entry.startsWith('info string PolicySearchStats ')).pop();
    const infinite = engine.search(fen, { infinite: true, multiPV: 1, onUpdate: () => engine.interruptContinuous() });
    let timeout;
    const deadline = new Promise((_, reject) => { timeout = setTimeout(() => reject(Error('Stop timed out')), 15000); });
    const stopped = await Promise.race([infinite, deadline]).finally(() => clearTimeout(timeout));
    return { id: engine.engineId, simd: manifest.simd, bounded, line, active,
     calls: JSON.parse(statistics.replace('info string PolicySearchStats ', '')).quiet_calls,
     stopped: stopped.length };
   } finally {
    engine.close();
   }
  });
  assert.equal(result.id, 'stockfish-hybrid');
  assert.equal(result.simd, true);
  assert.match(result.bounded, /^bestmove d2d4 /);
  assert.match(result.line, /score cp 13 .* pv d2d4 d7d5 c2c4 d5c4 b1c3 g8f6$/);
  assert.equal(result.active, true);
  assert.ok(result.calls > 0);
  assert.equal(result.stopped, 1);
  const fallback = await page.evaluate(async () => {
   const validate = WebAssembly.validate;
   WebAssembly.validate = () => false;
   const engine = new ChessilLocalEngine();
   try {
    const selected = await engine.load({ engine: 'stockfish-hybrid', network: 'default', threads: 1, hash: 16 });
    return { id: engine.engineId, simd: selected.simd };
   } finally {
    engine.close();
    WebAssembly.validate = validate;
   }
  });
  assert.deepEqual(fallback, { id: 'stockfish-lite', simd: false });
  await page.goto(fixture.url + '/en/engine-source?engine=stockfish-hybrid', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-engine-source-downloads]:not([hidden])');
  for (const index of ['0', '1', '2', '3']) {
   const href = await page.$eval(`[data-source-asset="${index}"]`, link => link.href);
   assert.ok(href.startsWith(fixture.url + '/engine/'));
  }
  await page.select('[data-source-engine]', 'stockfish-lite');
  await page.waitForFunction(() => document.querySelector('[data-engine-source-name]').textContent.includes('Stockfish 19 Lite'));
 } finally {
  await browser.close();
  await fixture.close();
 }
});
