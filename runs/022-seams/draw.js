// Does a root take a crack in the rock, or cross it as if it were not there?
//
// Prediction, written first: with `crease` at 0 a root crosses a crack without a sign of it. With it on, a root
// that meets one will drop into it and run along it for a stretch, and -- the part that matters -- two roots that
// meet the same crack will dip at the same place, because the crack belongs to the rock and not to the root.
//
//   node runs/022-seams/draw.js out.svg
// One crack across a plain slab. The same tree at three seeds, with the rule off and on, from above, each root at
// its real width; beside each, how much of the roots' length runs within 0.06 of the crack.
//
// Held, but weakly. Over twelve seeds, root length on the crack:
//
//        crack radius 0.036   5.7% -> 9.5%    (spread between seeds 3.1 -> 4.8)
//        crack radius 0.070   8.6% -> 13.8%   (spread between seeds 6.4 -> 7.1)
//
// About two thirds more, with the spread between seeds as big as the gain: over a wood you would see it, on one
// tree you may not. And the first ground tried -- a slab with three crossing cracks -- could show nothing at all,
// because the cracks' own width covered a fifth of it and a root was within 0.06 of one by chance.
//
// Two measures were wrong before this one. How much root lay INSIDE the groove read 1-4% however the rule was set,
// because a root running along a crack rides on it and is not in it. And the fixed size of what counts as a seam
// (dip over 0.045) meant only cracks of about one width were ever taken: it is the root's own girth now, so a
// slight root takes a crack a heavy one cannot feel and could not lie in anyway.
const fs = require('fs'), Trees = require('../../trees.js'), H = Math.hypot;
const unit = (a) => { const l = H(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const under = (n, at) => { const u = unit(n), d = u[0] * at[0] + u[1] * at[1] + u[2] * at[2]; return (x, y, z) => u[0] * x + u[1] * y + u[2] * z - d; };
const groove = (a, b, R) => (x, y, z) => { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [x - a[0], y - a[1], z - a[2]];
  const t = Math.max(0, Math.min(1, (w[0] * d[0] + w[1] * d[1] + w[2] * d[2]) / (d[0] * d[0] + d[1] * d[1] + d[2] * d[2])));
  return H(w[0] - d[0] * t, w[1] - d[1] * t, w[2] - d[2] * t) - R; };
const cut = (a, b) => (x, y, z) => Math.max(a(x, y, z), -b(x, y, z));
const A = [-0.95, 0.335, -0.25], B = [0.9, 0.3, 0.3], R = 0.05;
const ground = cut(under([0.05, 1, 0.04], [0, 0.34, 0]), groove(A, B, R)), line = groove(A, B, 0);
const out = process.argv[2] || 'runs/022-seams/seams.svg', W = 300, S = 0.9, px = (v) => ((v + S) / (2 * S) * W).toFixed(1);
let svg = '', wide = 0, tall = 0;
[0, 3.2].forEach((crease) => { wide = 0;
  for (const seed of [24, 25, 26]) {
    const t = Trees.grow(Object.assign({ seed, crease }, Trees.sprout({ seed, strands: 14, feet: 6, foot: 0.16, tall: 0.8, reach: 0.85, twig: 0.2, ground, site: [-0.2, 0.25], roots: 0.85 })));
    let img = '';
    for (let a = 0; a < 110; a++) for (let b = 0; b < 110; b++) { const x = -S + 2 * S * (a + 0.5) / 110, z = -S + 2 * S * (b + 0.5) / 110;
      let y = 0.6; for (let it = 0; it < 50; it++) { if (ground(x, y, z) <= 0) break; y -= 0.01; }
      const c = Math.round(128 + 112 * Math.max(0, Math.min(1, (y - 0.29) / 0.05)));
      img += '<rect x="' + (a * W / 110).toFixed(1) + '" y="' + (b * W / 110).toFixed(1) + '" width="' + (W / 110 + 0.6).toFixed(1) + '" height="' + (W / 110 + 0.6).toFixed(1) + '" fill="rgb(' + c + ',' + (c - 6) + ',' + (c - 14) + ')"/>'; }
    let paths = '', on = 0, len = 0;
    for (const s of t.strands) { if (!(s.root > 7) || s.loop) continue;
      let d = '', w = 0;
      for (let k = 0; k <= s.root; k++) { d += (k ? ' L' : 'M') + px(s.X[k * 3]) + ' ' + px(s.X[k * 3 + 2]); w += s.rho[k];
        if (k < Math.min(s.root, s.K - 1)) { const step = H(s.X[k * 3 + 3] - s.X[k * 3], s.X[k * 3 + 4] - s.X[k * 3 + 1], s.X[k * 3 + 5] - s.X[k * 3 + 2]);
          len += step; if (line(s.X[k * 3], 0.33, s.X[k * 3 + 2]) < 0.06) on += step; } }
      paths += '<path d="' + d + '" fill="none" stroke="#8c3b2f" stroke-opacity="0.9" stroke-width="' + (w / (s.root + 1) / (2 * S) * W * 2).toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round"/>'; }
    svg += '<g transform="translate(' + wide + ',' + tall + ')">' + img + paths + '<text x="7" y="' + (W - 9) + '" font-size="12" fill="#1b1512">seed ' + seed + ', crease ' + crease + '   on the crack: ' + (100 * on / (len || 1)).toFixed(0) + '%</text></g>';
    wide += W + 6;
  }
  tall += W + 6;
});
fs.writeFileSync(out, '<svg xmlns="http://www.w3.org/2000/svg" width="' + wide + '" height="' + tall + '" font-family="ui-monospace, Menlo, monospace"><rect width="100%" height="100%" fill="#f6f2ea"/>' + svg + '</svg>');
console.log('wrote ' + out);
