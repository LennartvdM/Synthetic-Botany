// What shape is a root in section? From the outside a root reads as a strap or a cord, and a still cannot tell
// you which: a strap seen edge-on is a cord, and a cord with a plate on it is a strap. So cut it.
//
//   node runs/024-section/section.js [page] [overrides] > out.svg
//
// For every root of every tree it walks out from the strand's own line, in the plane across the root, in 180
// directions, and finds the skin. It draws each section at the size it really is, side by side along the root,
// with the strand's circle (its girth) behind it in outline. Beside each: the width across (along the side
// vector) over the height (along the out vector). 1.0 is round. The drawing is the point; the number is a label.
const vm = require('vm'), fs = require('fs'), path = require('path'), R = path.join(__dirname, '../../'), H = Math.hypot;
const page = process.argv[2] || 'sketch/page9.js', over = process.argv[3];
const g = { console: { log: () => {} }, Math, Float64Array, Float32Array, Uint8Array, Int16Array, Int32Array, Map, Set, URLSearchParams, JSON, Object, Array, Number, location: { search: '?x=1' } };
g.window = g; g.globalThis = g; vm.createContext(g);
for (const f of ['cheats/fantastic.js', 'sketch/page5.js', 'trees.js', 'sketch/page7.js']) vm.runInContext(fs.readFileSync(R + f, 'utf8'), g, { filename: f });
let src = fs.readFileSync(R + page, 'utf8');
if (over) src = src.replace(/const \{ tree \} = Trees7,/, 'const tree = (rec) => Trees7.tree(Object.assign({}, rec, ' + over + ')),');
vm.runInContext(src, g, { filename: page });
const unit = (v) => { const l = H(v[0], v[1], v[2]) || 1e-9; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const at = (s, k) => [s.X[k * 3], s.X[k * 3 + 1], s.X[k * 3 + 2]];
const tan = (s, k) => unit([0, 1, 2].map((i) => at(s, Math.min(s.K - 1, k + 1))[i] - at(s, Math.max(0, k - 1))[i]));
// the skin along one ray: walk out until the field turns positive, then halve in on the crossing
const edge = (f, p, d, far) => { let lo = 0, hi = 0, step = far / 48;
  for (let t = step; t <= far; t += step) { if (f(p[0] + d[0] * t, p[1] + d[1] * t, p[2] + d[2] * t) > 0) { hi = t; lo = t - step; break; } }
  if (!hi) return far; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (f(p[0] + d[0] * m, p[1] + d[1] * m, p[2] + d[2] * m) > 0) hi = m; else lo = m; } return (lo + hi) / 2; };
const N = 180, rows = [];
const pick = process.env.ONLY === undefined ? null : process.env.ONLY.split(',').map(Number);
g.Fantastic.fields.forEach((f, ti) => {
  if (pick && !pick.includes(ti)) return;
  const name = g.Fantastic.names[ti] || ('tree ' + ti), t = f.tree || null;
  const strands = (t && t.strands) || [];
  if (!strands.length) { rows.push({ name, cuts: [], note: 'no strands on the field' }); return; }
  strands.forEach((s, si) => {
    if (!(s.root > 16) || s.loop || s.vine || s.rootOf >= 0) return;
    const cuts = [];
    // which end is the trunk? the one nearer the foot. a root drawn from tip to trunk reads as swelling when it
    // is in fact tapering, and that mistake is exactly the one a row of pictures is meant to stop.
    const foot = f.recipe.trunk[0], dA = H(at(s, 2)[0] - foot[0], at(s, 2)[2] - foot[2]), dB = H(at(s, s.root - 2)[0] - foot[0], at(s, s.root - 2)[2] - foot[2]), flip = dB < dA;
    for (const qq of [0.08, 0.3, 0.5, 0.7, 0.92]) { const q = flip ? 1 - qq : qq, k = Math.round(q * (s.root - 4)) + 2, p = at(s, k), T = tan(s, k), o = unit(s.O[k]), sv = unit(cross(T, o)), rho = s.rho[k];
      if (f(p[0], p[1], p[2]) > 0) continue;   // the line is outside its own wood here: nothing to cut
      const rr = [];
      for (let i = 0; i < N; i++) { const a = (i / N) * 2 * Math.PI, d = [0, 1, 2].map((j) => o[j] * Math.cos(a) + sv[j] * Math.sin(a)); rr.push(edge(f, p, d, 8 * rho)); }
      const ro = (rr[0] + rr[N / 2]) / 2, rs = (rr[N / 4] + rr[(3 * N) / 4]) / 2;
      let area = 0; for (let i = 0; i < N; i++) area += 0.5 * rr[i] * rr[(i + 1) % N] * Math.sin(2 * Math.PI / N);
      cuts.push({ q: qq, k, rho, rr, area, wide: rs * 2, high: ro * 2, ratio: rs / Math.max(1e-9, ro) }); }
    if (cuts.length) { rows.push({ name, si, cuts });
      process.stderr.write(name.padEnd(14) + ' root ' + String(si).padStart(3) + '   girth ' + cuts.map((c) => c.rho.toFixed(3)).join(' ') +
        '   wood/girth ' + cuts.map((c) => (c.area / (Math.PI * c.rho * c.rho)).toFixed(1).padStart(5)).join(' ') + '\n'); }
  });
});
// drawn, not scored: each section at its true size, the girth circle behind it
const SC = 560, PAD = 18, W = 1180; let y = PAD, out = [];
for (const row of rows) {
  if (!row.cuts.length) { out.push('<text x="' + PAD + '" y="' + (y + 12) + '" font="12px mono" fill="#888">' + row.name + ': ' + row.note + '</text>'); y += 26; continue; }
  const big = Math.max(...row.cuts.map((c) => Math.max(...c.rr))) * SC, h = 2 * big + 24;
  out.push('<text x="' + PAD + '" y="' + (y + 11) + '" font-family="monospace" font-size="11" fill="#ccc">' + row.name + '  root ' + row.si + '</text>');
  row.cuts.forEach((c, i) => { const cx = 120 + i * 205 + big, cy = y + 18 + big;
    const pts = c.rr.map((r, j) => { const a = (j / N) * 2 * Math.PI; return (cx + Math.sin(a) * r * SC).toFixed(1) + ',' + (cy - Math.cos(a) * r * SC).toFixed(1); }).join(' ');
    out.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + (c.rho * SC).toFixed(1) + '" fill="none" stroke="#45606c" stroke-dasharray="3 3"/>');
    out.push('<polygon points="' + pts + '" fill="#d8d2c6" fill-opacity="0.85" stroke="#6d6458"/>');
    out.push('<text x="' + (cx - big) + '" y="' + (cy + big + 12) + '" font-family="monospace" font-size="10" fill="#9ab">' +
      (c.q * 100).toFixed(0) + '%  w/h ' + c.ratio.toFixed(2) + '  area ' + (c.area * 1e4).toFixed(1) + '  x' + (c.area / (Math.PI * c.rho * c.rho)).toFixed(1) + '</text>'); });
  y += h + 22;
}
const Hgt = Math.round(y + PAD);
console.log('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + Hgt + '" viewBox="0 0 ' + W + ' ' + Hgt + '"><rect width="100%" height="100%" fill="#14242b"/>' + out.join('') + '</svg>');
