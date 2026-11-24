const test = require('node:test');
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer');
const start = require('./helpers/board-server');

test('research shows a single dated and verifiable hybrid report in each language', async () => {
 const fixture = await start();
 const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
 try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 390, height: 844 });
  for (const lang of ['en', 'es', 'zh']) {
   await page.goto(fixture.url + '/' + lang + '/research');
   const reports = await page.$$eval('.research-entry h2 a', links => links.map(link => link.href));
   assert.deepEqual(reports, [fixture.url + '/' + lang + '/report']);
   assert.ok(await page.$(`a[href="/${lang}/analysis"]`));
   const response = await page.goto(reports[0]);
   assert.equal(response.status(), 200);
   assert.equal(await page.$$eval('h1', headings => headings.length), 1);
   assert.equal(await page.$eval('time', time => time.dateTime), '2026-11-24');
   assert.match(await page.$eval('.research-elo', label => label.textContent), /\+9[.,]3 Elo/);
   assert.match(await page.$eval('.research-interval', label => label.textContent), /\+1[.,]5 – \+17[.,]1/);
   assert.deepEqual(await page.$$eval('.research-stats dd', fields => fields.slice(1).map(field => field.textContent)),
    ['486', '671', '443']);
   assert.ok(await page.$('.research-table tbody tr'));
   assert.match(await page.$eval('.ui-code-snippet code', block => block.textContent), /promoteStableTopThree/);
   assert.ok(await page.$(`.research-report-heading a[href="/${lang}/research"]`));
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }
  const rows = await page.$eval('a[download]', async link => {
   const response = await fetch(link.href);
   if (!response.ok) throw new Error('Missing match results');
   return (await response.text()).trimEnd().split('\n').length;
  });
  assert.equal(rows, 1601);
  await page.screenshot({ path: '/tmp/chessil-depth-six-mobile.png' });
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(fixture.url + '/en/report');
  await page.screenshot({ path: '/tmp/chessil-depth-six-desktop.png' });
  assert.deepEqual(errors, []);
 } finally {
  await browser.close();
  await fixture.close();
 }
});
