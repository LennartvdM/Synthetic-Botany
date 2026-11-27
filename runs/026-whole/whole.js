// Is the organism one body? A tree that has come apart reads as a tree right up until you notice a root ending in
// mid-air with its tip floating on past the gap. It is easy to miss in a still and impossible to miss once counted.
//
//   node runs/026-whole/whole.js [page] [sproutOverrides] [recipeOverrides]
//
// The field is sampled on a grid and the solid cells are grouped. One group is a whole organism. More than one
// means wood that touches nothing: the band pieces chain along a strand, each starting back under the one before
// to cover where that one was cut away, and when the cut is longer than the piece before it there is nothing to
// start back under. Fat roots make long cuts, so this appears exactly when the roots get heavy enough to be worth
// looking at.
//
// Reported as a share of the whole, so a speck and a severed root are told apart. Nothing is clamped.
const vm = require('vm'), fs = require('fs'), path = require('path'), R = path.join(__dirname, '../../');
const page = process.argv[2] || 'sketch/page9.js', sp = process.argv[3], gr = process.argv[4];
const g = { console: { log: () => {} }, Math, Float64Array, Float32Array, Uint8Array, Int16Array, Int32Array, Map, Set, URLSearchParams, JSON, Object, Array, Number, location: { search: '?x=1' + (process.env.ONLY ? '&only=' + process.env.ONLY : '') } };
g.window = g; g.globalThis = g; vm.createContext(g);
for (const f of ['cheats/fantastic.js', 'sketch/page5.js', 'trees.js', 'sketch/page7.js']) vm.runInContext(fs.readFileSync(R + f, 'utf8'), g, { filename: f });
let src = fs.readFileSync(R + page, 'utf8');
if (sp) src = src.replace(/Trees\.sprout\(rule\)/, 'Trees.sprout(Object.assign({}, rule, ' + sp + '))');
if (gr) src = src.replace(/const \{ tree \} = Trees7,/, 'const tree = (rec) => Trees7.tree(Object.assign({}, rec, ' + gr + ')),');
vm.runInContext(src, g, { filename: page });
const STEP = Number(process.env.STEP || 0.014);
g.Fantastic.fields.forEach((f, ti) => {
  const name = g.Fantastic.names[ti] || ('tree ' + ti), rec = f.recipe, foot = rec.trunk[0];
  const x0 = foot[0] - 1.6, x1 = foot[0] + 1.6, z0 = foot[2] - 1.6, z1 = foot[2] + 1.6, y0 = -0.5, y1 = 2.3;
  const NX = Math.round((x1 - x0) / STEP), NY = Math.round((y1 - y0) / STEP), NZ = Math.round((z1 - z0) / STEP);
  const sol = new Uint8Array(NX * NY * NZ), lay = new Uint8Array(NX * NY * NZ); let total = 0;
  for (let j = 0; j < NY; j++) { const y = y0 + (j + 0.5) * STEP;
    for (let i = 0; i < NX; i++) { const x = x0 + (i + 0.5) * STEP;
      for (let k = 0; k < NZ; k++) { const z = z0 + (k + 0.5) * STEP;
        if (f(x, y, z) < 0) { const L = f.layerAt(x, y, z); if (L !== 5) { sol[(j * NX + i) * NZ + k] = 1; lay[(j * NX + i) * NZ + k] = L; total++; } } } } }
  // group the solid cells: six-way, iterative so a long root does not blow the stack
  const seen = new Int32Array(NX * NY * NZ).fill(-1), sizes = [], stack = new Int32Array(total + 16);
  let grp = 0;
  for (let a = 0; a < sol.length; a++) { if (!sol[a] || seen[a] >= 0) continue;
    let sp2 = 0, cnt = 0, cx = 0, cy = 0, cz = 0; stack[sp2++] = a; seen[a] = grp;
    while (sp2) { const c = stack[--sp2]; cnt++;
      const k = c % NZ, i = ((c - k) / NZ) % NX, j = ((c - k) / NZ - i) / NX;
      cx += x0 + (i + 0.5) * STEP; cy += y0 + (j + 0.5) * STEP; cz += z0 + (k + 0.5) * STEP;
      const push = (ii, jj, kk) => { if (ii < 0 || jj < 0 || kk < 0 || ii >= NX || jj >= NY || kk >= NZ) return;
        const d = (jj * NX + ii) * NZ + kk; if (sol[d] && seen[d] < 0) { seen[d] = grp; stack[sp2++] = d; } };
      push(i + 1, j, k); push(i - 1, j, k); push(i, j + 1, k); push(i, j - 1, k); push(i, j, k + 1); push(i, j, k - 1); }
    sizes.push({ cnt, lay: lay[a], at: [cx / cnt, cy / cnt, cz / cnt] }); grp++; }
  sizes.sort((a, b) => b.cnt - a.cnt);
  const loose = sizes.slice(1), lost = loose.reduce((s, v) => s + v.cnt, 0);
  // what the loose pieces are made of: 0 band, 1 fine or torn, 2 sliver or shell plate, 3 bark, 4 scar, 6 root, 7 root off a root
  const byLayer = {}; for (const o of loose) byLayer[o.lay] = (byLayer[o.lay] || 0) + 1;
  const NAME = { 0: 'band', 1: 'fine', 2: 'sliver/plate', 3: 'bark', 4: 'scar', 6: 'root', 7: 'root-of-root' };
  console.log((sizes.length === 1 ? '  one body  ' : ' COME APART ') + name.padEnd(34) +
    ' bodies ' + String(sizes.length).padStart(3) + '   adrift ' + (lost / total * 100).toFixed(2) + '% of the wood' +
    (loose.length ? '   made of ' + Object.entries(byLayer).sort((a, b) => b[1] - a[1]).map(([k, v]) => v + ' ' + (NAME[k] || ('layer ' + k))).join(', ') +
      '   largest ' + loose.slice(0, 4).map((v) => (v.cnt / total * 100).toFixed(2) + '%').join(' ') : ''));
  // where they are: height above the ground and distance from the trunk's axis, both in trunk radii
  if (loose.length) { const R0 = foot[3];
    const hi = loose.filter((o) => o.at[1] > 1.2).length, low = loose.filter((o) => o.at[1] <= 1.2).length;
    console.log('             of those, ' + low + ' below 1.2 and ' + hi + ' above; first eight at (height, out) in trunk radii: ' +
      loose.slice(0, 8).map((o) => '(' + (o.at[1] / R0).toFixed(1) + ', ' + (Math.hypot(o.at[0] - foot[0], o.at[2] - foot[2]) / R0).toFixed(1) + ')').join(' ')); }
});
