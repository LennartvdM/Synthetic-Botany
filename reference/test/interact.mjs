// Drives the real page: edits a genome through the UI, runs a parameter sweep, and repeats once without Web Workers.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const three = readFileSync('node_modules/three/build/three.min.js', 'utf8');
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>' + readFileSync('dist/morphoclay.html', 'utf8') + '</body></html>';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const idle = (page) => page.waitForFunction(() => !document.getElementById('status').classList.contains('busy') && document.getElementById('status').textContent !== 'starting…', null, { timeout: 120000 });
async function open(noWorker, vw, vh) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  if (noWorker) await page.addInitScript(() => { window.Worker = undefined; });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await page.route('**/*', (r) => { const u = r.request().url(); if (u.includes('three.min.js')) return r.fulfill({ contentType: 'text/javascript', body: three }); if (u.startsWith('http://local/')) return r.fulfill({ contentType: 'text/html', body: html }); if (u.startsWith('blob:') || u.startsWith('data:')) return r.continue(); return r.abort(); });
  await page.goto('http://local/'); await idle(page);
  return { page, errs };
}
const st = (page) => page.evaluate(() => document.getElementById('status').textContent);
{
  const { page, errs } = await open(false, 1400, 900);
  console.log('load        |', await st(page));
  await page.selectOption('#recipe', { label: 'whorl' }); await page.waitForTimeout(300); await idle(page);
  console.log('recipe whorl|', await st(page));
  await page.selectOption('#n-addkid', 'keel|lamella'); await page.waitForTimeout(300); await idle(page);
  console.log('add child   |', await st(page), '| tree rows', await page.locator('#tree .node').count());
  await page.locator('#n0-scale').evaluate((e) => { e.value = 2.5; e.dispatchEvent(new Event('input', { bubbles: true })); }); await page.waitForTimeout(300); await idle(page);
  await page.locator('#tree .node').first().click();
  await page.selectOption('#n-addmod', 'ribs'); await page.waitForTimeout(300); await idle(page);
  console.log('add ribs    |', await st(page), '| genome', await page.evaluate(() => JSON.stringify(window.__morpho.S.genome).slice(0, 150)));
  await page.click('#mutate'); await page.waitForTimeout(300); await idle(page);
  await page.click('#breed'); await page.waitForTimeout(300); await idle(page);
  console.log('breed       |', await st(page));
  await page.selectOption('#recipe', { label: 'lamella' }); await page.waitForTimeout(300); await idle(page);
  await page.click('[data-mode=sweep]'); await page.waitForTimeout(300);
  await page.selectOption('#sweep-x', 'cup'); await page.waitForTimeout(200); await page.selectOption('#sweep-y', 'ruffle'); await page.waitForTimeout(300); await idle(page);
  console.log('sweep       |', await st(page), '| tiles with image', await page.locator('#grid img[src]').count());
  await page.locator('#stage').screenshot({ path: 'shots/sweep.png' });
  await page.locator('#grid .tile').nth(23).click(); await page.waitForTimeout(300); await idle(page);
  console.log('adopt tile  |', await st(page), '| cup,ruffle =', await page.evaluate(() => [window.__morpho.S.genome.p.cup, window.__morpho.S.genome.p.ruffle].join(',')));
  console.log('errors      |', errs.length ? errs : 'none');
  await page.close();
}
{
  const { page, errs } = await open(true, 400, 800);
  console.log('no worker   |', await st(page));
  await page.screenshot({ path: 'shots/phone.png' });
  console.log('h-scroll    |', await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
  console.log('errors      |', errs.length ? errs : 'none');
}
await browser.close();
