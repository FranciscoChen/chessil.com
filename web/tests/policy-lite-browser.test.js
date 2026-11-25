const test = require('node:test');
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer');
const start = require('./helpers/board-server');

test('Lite can use embedded evaluation and download only the optional V5 policy', async () => {
 const fixture = await start();
 const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
 try {
  const page = await browser.newPage();
  await page.goto(fixture.url + '/en/analysis', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.engine-line');
  assert.equal(await page.$eval('#analysis-engine-name', el => el.textContent), 'Stockfish 19 Lite');
  assert.equal(fixture.requests.some(path => path.endsWith('.policy')), false);
  await page.click('#analysis-options-toggle');
  const choice = '#analysis-options-fields [data-engine-option="policy"]';
  await page.waitForSelector(choice + ' option[value="v5"]');
  assert.equal(await page.$eval(choice, el => el.value), 'none');
  await page.click('#analysis-engine-toggle');
  await page.select(choice, 'v5');
  assert.equal(await page.$eval('#analysis-options-fields [data-engine-option="network"]', el => el.value), 'default');
  const scores = await page.evaluate(async () => {
   const engine = new ChessilLocalEngine();
   try {
    const manifest = await engine.load();
    const lines = [];
    engine.worker.postMessage('setoption name CompactPolicyStats value true');
    engine.worker.postMessage('position startpos');
    const move = await engine.command('go depth 13', line => line.startsWith('bestmove '), 15000, line => lines.push(line));
    return { engine: engine.engineName, network: manifest.embeddedNetwork, move, lines };
   } finally {
    engine.close();
   }
  });
  assert.equal(scores.engine, 'Stockfish 19 Lite + V5');
  assert.match(scores.network, /^61e7af4bb97d/);
  assert.ok(scores.lines.some(line => line.includes('Lite V5 policy active')));
  assert.ok(scores.lines.some(line => /Lite V5 quiet inferences [1-9]\d*/.test(line)));
  assert.match(scores.move, /^bestmove [a-h][1-8][a-h][1-8]/);
  assert.ok(fixture.requests.includes('/engine/manifest-policy-lite.json'));
  assert.equal(fixture.requests.filter(path => path.endsWith('.policy')).length, 1);
  assert.equal(fixture.requests.some(path => /\.nnue(?:\.gz)?$/.test(path)), false);
  await page.goto(fixture.url + '/en/engine-source?engine=stockfish-lite&policy=v5', { waitUntil: 'networkidle0' });
  assert.equal(await page.$eval('[data-source-policy]', el => el.value), 'v5');
  assert.match(await page.$eval('[data-source-asset="2"]', el => el.href), /v5-7a702165ba92\.policy$/);
 } finally {
  await browser.close();
  await fixture.close();
 }
});
