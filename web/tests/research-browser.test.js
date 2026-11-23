const test = require('node:test');
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer');
const start = require('./helpers/board-server');

test('research reports render and link across all supported languages', async () => {
 const fixture = await start();
 const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
 try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 390, height: 844 });
  for (const lang of ['en', 'es', 'zh']) {
   await page.goto(fixture.url + '/' + lang + '/research');
   const reports = await page.$$eval('.research-list a', links => links.map(link => link.href));
   assert.equal(reports.length, 5);
   assert.ok(await page.$(`a[href="/${lang}/analysis"]`));
   for (const url of reports) {
    const response = await page.goto(url);
    assert.equal(response.status(), 200, url);
    assert.equal(await page.$$eval('h1', headings => headings.length), 1, url);
    assert.ok(await page.$('.research-table tbody tr'), url);
    assert.ok(await page.$(`.research-report-heading a[href="/${lang}/research"]`), url);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, url);
    assert.ok(await page.evaluate(() => Array.from(document.querySelectorAll('.research-contents a'))
     .every(link => document.getElementById(link.hash.slice(1)))), url);
   }
   await page.screenshot({ path: '/tmp/chessil-research-' + lang + '.png' });
  }
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(fixture.url + '/en/research');
  await page.screenshot({ path: '/tmp/chessil-research-index.png' });
  assert.deepEqual(errors, []);
 } finally {
  await browser.close();
  await fixture.close();
 }
});
