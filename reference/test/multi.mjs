// Contact sheet of large specimen renders. Usage: node test/multi.mjs out.png '<json array of {recipe|genome, seed, res, az, pol}>'
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [out, spec, cols = '3', cell = '520'] = process.argv.slice(2);
const items = JSON.parse(spec);
const three = readFileSync('node_modules/three/build/three.min.js', 'utf8');
const html = '<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + readFileSync('dist/morphoclay.html', 'utf8') + '</body></html>';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const C = +cell, n = items.length, nc = Math.min(+cols, n), nr = Math.ceil(n / nc);
const page = await browser.newPage({ viewport: { width: C + 340, height: C }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.route('**/*', (r) => { const u = r.request().url(); if (u.includes('three.min.js')) return r.fulfill({ contentType: 'text/javascript', body: three }); if (u.startsWith('http://local/')) return r.fulfill({ contentType: 'text/html', body: html }); if (u.startsWith('blob:') || u.startsWith('data:')) return r.continue(); return r.abort(); });
await page.goto('http://local/');
await page.waitForFunction(() => window.__morpho && !document.getElementById('status').classList.contains('busy') && document.getElementById('status').textContent !== 'starting…', null, { timeout: 60000 });
const shots = [];
for (const it of items) {
  await page.evaluate((it) => {
    const M = window.__morpho;
    if (it.recipe) { const sel = document.getElementById('recipe'); const k = (t) => t.replace(/[^a-z]+/g, ' ').trim(); const o = [...sel.options].find((o) => k(o.textContent) === k(it.recipe)); sel.value = o.value; sel.dispatchEvent(new Event('change')); }
    else { M.S.genome = it.genome; M.S.sel = []; M.renderPanel(); }
    if (it.seed != null) M.S.seed = it.seed;
    M.S.res = it.res || 112; M.rebuild(true);
  }, it);
  await page.waitForTimeout(250);
  await page.waitForFunction(() => !document.getElementById('status').classList.contains('busy'), null, { timeout: 120000 });
  if (it.az != null || it.pol != null || it.zoom) await page.evaluate((it) => { const c = window.__morpho.controls; if (it.az != null) c.az = it.az; if (it.pol != null) c.pol = it.pol; if (it.zoom) c.rad *= it.zoom; c.apply(); }, it);
  await page.waitForTimeout(700);
  console.log((it.recipe || it.genome.kind) + ':', await page.evaluate(() => document.getElementById('status').textContent));
  shots.push((await page.locator('#view').screenshot()).toString('base64'));
}
const sheet = await browser.newPage({ viewport: { width: nc * C, height: nr * C } });
await sheet.setContent('<body style="margin:0;display:grid;grid-template-columns:repeat(' + nc + ',' + C + 'px);background:#000">' + shots.map((s) => '<img style="width:' + C + 'px;height:' + C + 'px" src="data:image/png;base64,' + s + '">').join('') + '</body>');
await sheet.screenshot({ path: out });
await browser.close();
