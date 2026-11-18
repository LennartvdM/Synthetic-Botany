import { build } from '../src/world.js';
import { RECIPES, breed } from '../src/genome.js';
import { makeRng } from '../src/util.js';
for (const r of RECIPES) {
  try {
    const m = build({ mode: 'specimen', genome: r.g, seed: 7, res: 96 });
    console.log(r.name.padEnd(20), JSON.stringify(m.stats));
  } catch (e) { console.log(r.name, 'FAILED', e.stack.split('\n').slice(0, 4).join(' | ')); }
}
let worst = 0;
for (let i = 0; i < 40; i++) {
  const g = breed(makeRng(i + 1));
  try { const m = build({ mode: 'specimen', genome: g, seed: i, res: 64 }); worst = Math.max(worst, m.stats.ms); if (m.stats.tris < 50 || m.stats.ms > 2500) console.log('bred', i, g.kind, JSON.stringify(m.stats)); }
  catch (e) { console.log('bred', i, 'FAILED', JSON.stringify(g).slice(0, 200), e.stack.split('\n').slice(0, 3).join(' | ')); }
}
console.log('worst bred ms', worst);
