// Headless look at the built page. Usage: node test/shot.mjs <out.png> [js to run in page] [wait ms] [width] [height]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { readFileSync } from 'node:fs';
const [out, script, wait = '4000', w = '1500', hgt = '860'] = process.argv.slice(2);
const three = readFileSync('node_modules/three/build/three.min.js', 'utf8');
const page_html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>' + readFileSync('dist/morphoclay.html', 'utf8') + '</body></html>';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +hgt }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error') console.log('console.error:', m.text()); });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.route('**/*', (r) => {
  const u = r.request().url();
  if (u.includes('three.min.js')) return r.fulfill({ contentType: 'text/javascript', body: three });
  if (u.startsWith('http://local/')) return r.fulfill({ contentType: 'text/html', body: page_html });
  if (u.startsWith('blob:') || u.startsWith('data:')) return r.continue();
  return r.abort();
});
await page.goto('http://local/');
await page.waitForFunction(() => window.__morpho && !document.getElementById('status').classList.contains('busy') && document.getElementById('status').textContent !== 'starting…', null, { timeout: 60000 });
if (script) { await page.evaluate(script); await page.waitForTimeout(300); await page.waitForFunction(() => !document.getElementById('status').classList.contains('busy'), null, { timeout: 180000 }); }
await page.waitForTimeout(+wait);
console.log('status:', await page.evaluate(() => document.getElementById('status').textContent));
await page.locator(process.env.SEL || 'body').screenshot({ path: out });
await browser.close();
