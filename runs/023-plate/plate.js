// The root plate, counted. There is a failure that keeps coming back: the foot floods and the tree stands in a
// fringe of wires instead of on roots -- "a cancerous growth blasting from the bottom". It is hard to see in a
// still, and it has got past me more than once.
//
//   node runs/023-plate/plate.js [page] [overrides]
//     node runs/023-plate/plate.js                                   sketch/page11.js as it stands
//     node runs/023-plate/plate.js sketch/page9.js
//     node runs/023-plate/plate.js sketch/page11.js '{"clearFoot":0}'   to see the fault on purpose
//
// TWO numbers, and the first of them is the one that matters. I got this wrong the first time and it is worth
// saying how: I assumed the fault was wood -- too much of it, a mass -- and measured how much of a ball at the
// foot is solid. That number was calibrated against a tree with twice the root girth, passed the trees that
// actually had the fault, and I reported it as a clean bill. The fault is not wood. It is COUNT: a dozen and
// more roots leaving the foot, which must all share one trunk's worth of section, so every one of them is a
// wire. A fringe of wires round a swollen trunk is what reads as a tumour. Volume cannot see it, because
// fourteen wires and six roots weigh the same.
//
//   leaving     how many separate roots cross a ring at 1.4 trunk radii, and how many of those are under
//               three tenths of the trunk's radius. A tree leaves its foot on five to eight, and they are not
//               all wires.
//   fill        how much of a ball at the foot is wood. Kept as a second opinion: it catches the other fault,
//               a foot gone solid, which is real but is not this one.
//
// Calibrated on page 11's seven sites, with the dividing let back into the collar (`clearFoot: 0`), which is
// how the fault was made:
//
//        as it stands              leaving  4 to 7    fill 0.17 to 0.23
//        clearFoot 0 (the fault)   leaving 10 to 19   fill 0.16 to 0.21   -- the fill does not move at all
//        grip 1.0 (a solid foot)   leaving  4 to 7    fill 0.27 to 0.33   -- the other fault, caught by fill
//
// Flags, not budgets. Nothing is clamped. Run it before believing a picture.
const vm = require('vm'), fs = require('fs'), path = require('path'), R = path.join(__dirname, '../../'), H = Math.hypot;
const page = process.argv[2] || 'sketch/page11.js', over = process.argv[3];
const manyLeaving = 8, fullFoot = 0.25;
const g = { console: { log: () => {} }, Math, Float64Array, Float32Array, Uint8Array, Int32Array, Map, Set, URLSearchParams, JSON, Object, Array, Number, location: { search: '?x=1' } };
g.window = g; g.globalThis = g; vm.createContext(g);
for (const f of ['cheats/fantastic.js', 'sketch/page5.js', 'trees.js', 'sketch/page7.js']) vm.runInContext(fs.readFileSync(R + f, 'utf8'), g, { filename: f });
let src = fs.readFileSync(R + page, 'utf8');
if (over) src = src.replace(/const \{ tree \} = Trees7,/, 'const tree = (rec) => Trees7.tree(Object.assign({}, rec, ' + over + ')),');
vm.runInContext(src, g, { filename: page });
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const fill = (f, cx, cy, cz, rad, n) => { let hit = 0;
  for (let i = 0; i < n; i++) { let x, y, z, d2;
    do { x = 2 * rnd() - 1; y = 2 * rnd() - 1; z = 2 * rnd() - 1; d2 = x * x + y * y + z * z; } while (d2 > 1);
    const px = cx + x * rad, py = cy + y * rad, pz = cz + z * rad;
    if (f(px, py, pz) < 0 && f.layerAt(px, py, pz) !== 5) hit++; }
  return hit / n; };
const leaving = (rec, ring) => { const t = g.Trees.grow(Object.assign({}, rec, { passes: 0 })), foot = rec.trunk[0], R0 = foot[3];
  let n = 0, thin = 0;
  t.strands.forEach((s) => { if (!(s.root > 5) || s.loop) return;
    for (let k = 0; k < Math.min(s.root, s.K - 1); k++) {
      const r0 = H(s.X[k * 3] - foot[0], s.X[k * 3 + 2] - foot[2]), r1 = H(s.X[k * 3 + 3] - foot[0], s.X[k * 3 + 5] - foot[2]);
      if ((r0 - ring) * (r1 - ring) <= 0) { n++; if (s.rho[k] < 0.3 * R0) thin++; break; } } });
  return [n, thin]; };
console.log(page + (over ? '  with ' + over : '') + '   roots leaving the foot (flag over ' + manyLeaving + '), wood in a ball at the foot (flag over ' + fullFoot + ')');
let flags = 0;
g.Fantastic.fields.forEach((f, i) => {
  const rec = f.recipe, trunk = rec.trunk[0], R0 = trunk[3], rad = 2.2 * R0;
  const [n, thin] = leaving(rec, 1.4 * R0);
  const got = fill(f, trunk[0], trunk[1] + 0.35 * rad, trunk[2], rad, 12000);
  const bad = n > manyLeaving || got > fullFoot; if (bad) flags++;
  console.log((bad ? ' FLAG ' : '      ') + (g.Fantastic.names[i] || ('tree ' + i)).padEnd(32) +
    ' leaving ' + String(n).padStart(2) + ' (' + thin + ' of them wires)   fill ' + got.toFixed(3));
});
console.log(flags ? '  ' + flags + ' flagged: look at the foot before believing anything else about the tree.' : '  none flagged');
