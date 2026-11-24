// Draws grown trees as bare strands, with no surface: a row of columns, one per rule. In each column, from the top:
// seen from the front, seen from the right, seen from above. Each strand is drawn at its girth and coloured by the
// shoot it ends on (the trunk's own are clay), so it can be seen which strands a shoot took and from which side.
// Under each, what the rule made: shoots, tips, how deep the graph goes; and the strands' worst overlap.
// Where a shoot was snapped off there is a red ring the size of the wound.
//   node runs/013-branches/draw.js out.svg '[{"label": "...", "rule": {...}, "grow": {...}}, ...]'
const fs = require('fs'), Trees = require('../../trees.js');
const [out, list] = process.argv.slice(2), cols = JSON.parse(list), W = 300, sc = 135, ink = '#3b3230', clay = '#e7e0d4';
const hue = (i) => (i < 0 ? clay : `hsl(${(i * 67 + 20) % 360} 55% 68%)`);
let svg = ''; const notes = [];
cols.forEach((col, ci) => {
  const g = Trees.sprout(col.rule), t = Trees.grow(Object.assign({ seed: col.rule.seed || 1 }, g, col.grow || {})), x0 = ci * W + W / 2;
  // far pieces first; each piece's outline is drawn just before its fill, so nearer strands cover farther ones
  const seen = (base, hi, vi, di, flip) => { const segs = []; t.strands.forEach((s) => { for (let k = 0; k < s.K - 1; k++) segs.push({ s, k, z: (s.X[k * 3 + di] + s.X[k * 3 + 3 + di]) / 2 * flip }); }); segs.sort((p, q) => p.z - q.z);
    const px = (s, k) => (x0 + s.X[k * 3 + hi] * sc).toFixed(1), py = (s, k) => (vi === 1 ? base - s.X[k * 3 + 1] * sc : base + s.X[k * 3 + vi] * sc).toFixed(1); let o = '';
    for (const { s, k } of segs) { if (vi === 1 && s.X[k * 3 + 1] < -0.02) continue; const w = (s.rho[k] + s.rho[k + 1]) * sc, at = `x1="${px(s, k)}" y1="${py(s, k)}" x2="${px(s, k + 1)}" y2="${py(s, k + 1)}" stroke-linecap="round"`;
      o += `<line ${at} stroke="${ink}" stroke-width="${w.toFixed(1)}"/><line ${at} stroke="${hue(s.limb)}" stroke-width="${Math.max(0.6, w - 1.3).toFixed(1)}"/>`; }
    // where a shoot snapped off: a ring the size of the wound (solid for a hollow, dashed for a knot, dotted for a fresh break)
    for (const v of t.marks || []) o += `<circle cx="${(x0 + v.c[hi] * sc).toFixed(1)}" cy="${(vi === 1 ? base - v.c[1] * sc : base + v.c[vi] * sc).toFixed(1)}" r="${(v.r * sc).toFixed(1)}" fill="none" stroke="#c0392b" stroke-width="1.6" ${v.kind === 'hollow' ? '' : v.kind === 'knot' ? 'stroke-dasharray="5 3"' : 'stroke-dasharray="1.5 3"'}/>`;
    return o; };
  svg += `<text x="${x0}" y="20" text-anchor="middle" font-size="13" fill="${ink}">${col.label}</text>`;
  svg += seen(310, 0, 1, 2, 1) + seen(620, 2, 1, 0, -1) + seen(790, 0, 2, 1, 1);
  const m = t.measure; svg += `<text x="${x0}" y="935" text-anchor="middle" font-size="11" fill="${ink}">${g.made.shoots} shoots, ${g.made.tips} tips, ${g.made.deepest} deep; worst overlap ${m.worstOverlap.toFixed(2)}</text>`;
  notes.push(`${col.label}: ${JSON.stringify(g.made)} overlap ${m.worstOverlap.toFixed(2)} pairs over ${m.overlapping}/${m.touching}`);
});
['front', 'from the right', 'from above'].forEach((s, i) => (svg += `<text x="6" y="${[40, 350, 660][i]}" font-size="11" fill="#7a6c68">${s}</text>`));
fs.writeFileSync(out, `<svg xmlns="http://www.w3.org/2000/svg" width="${cols.length * W}" height="950" font-family="ui-monospace, Menlo, monospace"><rect width="100%" height="100%" fill="#f6f2ea"/>${svg}</svg>`);
fs.writeFileSync(out.replace(/\.svg$/, '.txt'), notes.join('\n') + '\n'); console.log(notes.join('\n'));
