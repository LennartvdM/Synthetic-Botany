// The root plate, counted. There is a failure that keeps coming back: the foot floods with wood and the tree
// stands on a mass instead of on roots -- a cancerous growth blasting from the bottom. It is hard to see in a
// still, because a dense foot and a strong foot look much alike from most angles, and it has got past me more
// than once. So it is counted here rather than looked at.
//
//   node runs/023-plate/plate.js [page] [overrides]
//     node runs/023-plate/plate.js                          sketch/page11.js as it stands
//     node runs/023-plate/plate.js sketch/page9.js
//     node runs/023-plate/plate.js sketch/page11.js '{"grip":1}'    to see the fault on purpose
//
// What is counted is how much of the space at the foot is wood: a ball about the foot, of a radius a little over
// two trunks, sampled. Roots that leave the foot and go somewhere fill a modest share of it. A mass fills a lot.
// The second ball, at twice the radius, says whether what is there is a plate that spreads or a lump that does
// not: a plate keeps some fill out there, a lump falls away to nothing.
//
// Calibrated against the fault made on purpose, on page 11's seven sites:
//
//        as it stands                       foot 0.13 to 0.21
//        more roots      (feet 14)          foot 0.17 to 0.21   -- no worse, which is right
//        more dividing   (forks 3)          foot 0.19 to 0.20   -- no worse, which is right
//        roots twice as thick (grip 1.0)    foot 0.27 to 0.33   -- the fault
//
// So the number answers to wood and not to how many roots there are, which is the distinction that matters:
// a foot may have as many roots as it likes, and may not be made of wood.
//
// It is a flag, not a budget. Nothing is clamped and nothing fails. Run it before believing a picture.
const vm = require('vm'), fs = require('fs'), path = require('path'), R = path.join(__dirname, '../../');
const page = process.argv[2] || 'sketch/page11.js', over = process.argv[3];
const loud = 0.25;
const g = { console: { log: () => {} }, Math, Float64Array, Float32Array, Uint8Array, Int32Array, Map, Set, URLSearchParams, JSON, Object, Array, Number, location: { search: '?x=1' } };
g.window = g; g.globalThis = g; vm.createContext(g);
for (const f of ['cheats/fantastic.js', 'sketch/page5.js', 'trees.js', 'sketch/page7.js']) vm.runInContext(fs.readFileSync(R + f, 'utf8'), g, { filename: f });
let src = fs.readFileSync(R + page, 'utf8');
if (over) src = src.replace(/const \{ tree \} = Trees7,/, 'const tree = (rec) => Trees7.tree(Object.assign({}, rec, ' + over + ')),');
vm.runInContext(src, g, { filename: page });
const names = g.Fantastic.names, fields = g.Fantastic.fields;
// a scatter of its own, so the number does not move when nothing else has
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const fill = (f, cx, cy, cz, rad, n) => { let hit = 0;
  for (let i = 0; i < n; i++) { let x, y, z, d2;
    do { x = 2 * rnd() - 1; y = 2 * rnd() - 1; z = 2 * rnd() - 1; d2 = x * x + y * y + z * z; } while (d2 > 1);
    const px = cx + x * rad, py = cy + y * rad, pz = cz + z * rad;
    if (f(px, py, pz) < 0 && f.layerAt(px, py, pz) !== 5) hit++; }
  return hit / n; };
console.log(page + (over ? '  with ' + over : '') + '   wood in a ball at the foot (flag over ' + loud + ')');
let flags = 0;
fields.forEach((f, i) => {
  const rec = f.recipe || {}, trunk = (rec.trunk || [[0, 0.14, 0, 0.2]])[0], R0 = trunk[3], rad = 2.2 * R0;
  const foot = fill(f, trunk[0], trunk[1] + 0.35 * rad, trunk[2], rad, 12000);
  const wide = fill(f, trunk[0], trunk[1] + 0.35 * rad, trunk[2], rad * 2, 12000);
  const bad = foot > loud; if (bad) flags++;
  console.log((bad ? ' FLAG ' : '      ') + (names[i] || ('tree ' + i)).padEnd(32) +
    ' foot ' + foot.toFixed(3) + '   twice as wide ' + wide.toFixed(3) + '   spread ' + (wide / (foot || 1e-9)).toFixed(2));
});
console.log(flags ? '  ' + flags + ' over ' + loud + ': the foot is a mass. Look at it before believing anything else about the tree.'
  : '  none over ' + loud);
