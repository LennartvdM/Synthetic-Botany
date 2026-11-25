// Draws only the roots of grown trees on level ground, from above, each at its girth: a row of trees, one per rule.
//   node runs/020-roots/draw.js out.svg '[{"label": "...", "rule": {...}, "grow": {...}}, ...]'
const fs = require('fs'), Trees = require('../../trees.js');
const [out, list] = process.argv.slice(2), cols = JSON.parse(list), W = 420, sc = 190, ink = '#3b3230';
let svg = '';
cols.forEach((col, ci) => { const g = Trees.sprout(col.rule), t = Trees.grow(Object.assign({ seed: col.rule.seed || 1 }, g, col.grow || {})), x0 = ci * W + W / 2, y0 = 240; let o = '', n = 0;
  t.strands.forEach((s, i) => { if (!s.root) return; n++; const hue = `hsl(${(i * 67 + 20) % 360} 45% 62%)`;
    for (const pass of [0, 1]) for (let k = 0; k < Math.min(s.root, s.K - 1); k++) { const w = (s.rho[k] + s.rho[k + 1]) * sc; o += `<line x1="${(x0 + s.X[k * 3] * sc).toFixed(1)}" y1="${(y0 + s.X[k * 3 + 2] * sc).toFixed(1)}" x2="${(x0 + s.X[k * 3 + 3] * sc).toFixed(1)}" y2="${(y0 + s.X[k * 3 + 5] * sc).toFixed(1)}" stroke="${pass ? hue : ink}" stroke-width="${(pass ? Math.max(0.6, w - 1.4) : w).toFixed(1)}" stroke-linecap="round"/>`; } });
  svg += o + `<text x="${x0}" y="20" text-anchor="middle" font-size="13" fill="${ink}">${col.label}</text><text x="${x0}" y="470" text-anchor="middle" font-size="11" fill="${ink}">${n} roots</text>`; });
fs.writeFileSync(out, `<svg xmlns="http://www.w3.org/2000/svg" width="${cols.length * W}" height="480" font-family="ui-monospace, Menlo, monospace"><rect width="100%" height="100%" fill="#f6f2ea"/>${svg}</svg>`);
