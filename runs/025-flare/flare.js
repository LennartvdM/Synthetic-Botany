// The foot, in profile. Every view of a tree so far has been from outside it, and the root plate is a thing you
// cannot read from outside: a shelf and a knot of legs look the same from the side. So cut the tree open on a
// vertical plane through its axis and draw what is solid.
//
//   node runs/025-flare/flare.js [page] [tree] [overrides] > out.svg
//
// Four cuts at four azimuths, side by side, each at true scale. The trunk's own radius at the foot is drawn as a
// pair of uprights, so wood standing outside them is flare, and wood standing outside them AND lying flat is the
// shelf the complaint is about. Nothing is scored. Look at it.
const vm = require('vm'), fs = require('fs'), path = require('path'), R = path.join(__dirname, '../../');
const page = process.argv[2] || 'sketch/page9.js', which = Number(process.argv[3] || 1), over = process.argv[4];
const g = { console: { log: () => {} }, Math, Float64Array, Float32Array, Uint8Array, Int16Array, Int32Array, Map, Set, URLSearchParams, JSON, Object, Array, Number, location: { search: '?x=1' } };
g.window = g; g.globalThis = g; vm.createContext(g);
for (const f of ['cheats/fantastic.js', 'sketch/page5.js', 'trees.js', 'sketch/page7.js']) vm.runInContext(fs.readFileSync(R + f, 'utf8'), g, { filename: f });
let src = fs.readFileSync(R + page, 'utf8');
if (over) src = src.replace(/const \{ tree \} = Trees7,/, 'const tree = (rec) => Trees7.tree(Object.assign({}, rec, ' + over + ')),');
vm.runInContext(src, g, { filename: page });
const f = g.Fantastic.fields[which], foot = f.recipe.trunk[0], R0 = foot[3];
const XR = 9 * R0, Y0 = -3 * R0, Y1 = 6 * R0, NX = 300, NY = Math.round(NX * (Y1 - Y0) / (2 * XR));
const SC = 620 / (2 * XR), PAD = 18, cuts = [0, 0.785, 1.571, 2.356];
let out = [], W = PAD;
cuts.forEach((a, ci) => {
  const oy = PAD + Math.floor(ci / 2) * ((Y1 - Y0) * SC + 34), ox = PAD + (ci % 2) * (2 * XR * SC + 30), dx = Math.cos(a), dz = Math.sin(a);
  const sol = [];
  for (let j = 0; j < NY; j++) { const y = Y0 + (Y1 - Y0) * (j + 0.5) / NY, row = [];
    for (let i = 0; i < NX; i++) { const x = -XR + 2 * XR * (i + 0.5) / NX, px = foot[0] + dx * x, pz = foot[2] + dz * x;
      row.push(f(px, y, pz) < 0 && f.layerAt(px, y, pz) !== 5 ? 1 : 0); }
    sol.push(row); }
  // run-length, so the drawing is a few hundred rects and not twenty thousand
  const hy = (Y1 - Y0) * SC / NY, wx = 2 * XR * SC / NX;
  for (let j = 0; j < NY; j++) { const y = oy + (Y1 - (Y0 + (Y1 - Y0) * (j + 1) / NY)) * SC; let i = 0;
    while (i < NX) { if (!sol[j][i]) { i++; continue; } let k = i; while (k < NX && sol[j][k]) k++;
      out.push('<rect x="' + (ox + i * wx).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + ((k - i) * wx).toFixed(1) + '" height="' + (hy + 0.4).toFixed(1) + '" fill="#d8d2c6"/>'); i = k; } }
  const mid = ox + XR * SC, yg = oy + (Y1 - 0) * SC;
  out.push('<line x1="' + (mid - R0 * SC) + '" y1="' + oy + '" x2="' + (mid - R0 * SC) + '" y2="' + (oy + (Y1 - Y0) * SC) + '" stroke="#e6c36a" stroke-width="1" stroke-dasharray="4 4"/>');
  out.push('<line x1="' + (mid + R0 * SC) + '" y1="' + oy + '" x2="' + (mid + R0 * SC) + '" y2="' + (oy + (Y1 - Y0) * SC) + '" stroke="#e6c36a" stroke-width="1" stroke-dasharray="4 4"/>');
  out.push('<line x1="' + ox + '" y1="' + yg.toFixed(1) + '" x2="' + (ox + 2 * XR * SC) + '" y2="' + yg.toFixed(1) + '" stroke="#6f9fe0" stroke-width="1"/>');
  out.push('<text x="' + ox + '" y="' + (oy + (Y1 - Y0) * SC + 14) + '" font-family="monospace" font-size="10" fill="#9ab">cut at ' + (a * 180 / Math.PI).toFixed(0) + ' deg</text>');
  W = Math.max(W, ox + 2 * XR * SC + 30); });
const Hh = Math.round(PAD + 2 * ((Y1 - Y0) * SC + 34) + 8);
console.log('<svg xmlns="http://www.w3.org/2000/svg" width="' + Math.round(W) + '" height="' + Hh + '" viewBox="0 0 ' + Math.round(W) + ' ' + Hh + '"><rect width="100%" height="100%" fill="#14242b"/>' +
  '<text x="' + PAD + '" y="11" font-family="monospace" font-size="10" fill="#ccc">' + (g.Fantastic.names[which] || which) + '   dashed: the trunk\'s radius at the foot   blue: the ground</text>' + out.join('') + '</svg>');
