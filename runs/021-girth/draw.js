// Does the wood add up? Two cuts of the same tree, to scale: the trunk where it is thickest, and the roots where
// they leave the foot. (A root that parted off another is inside its parent's girth already and is not counted
// again; it is drawn hollow where it parts, to show where that wood goes.) The red ring is the same area as one
// disc, so the two can be told apart by eye. Under them, how much root crosses a ring at each distance out.
//   node runs/021-girth/draw.js out.svg '[{"label": "...", "rule": {...}, "grow": {...}}, ...]'
const fs = require('fs'), Trees = require('../../trees.js'), H = Math.hypot, PI = Math.PI;
const [out, list] = process.argv.slice(2), cols = JSON.parse(list), W = 300, sc = 250, ink = '#3b3230';
let svg = ''; const notes = [];
cols.forEach((col, ci) => {
  const g = Trees.sprout(col.rule), t = Trees.grow(Object.assign({ seed: col.rule.seed || 1 }, g, col.grow || {})), x0 = ci * W + W / 2;
  let best = 0, bestY = 0;
  for (let y = 0.2; y < 1.1; y += 0.02) { let a = 0;
    for (const s of t.strands) { if (s.rootOf >= 0) continue; for (let k = s.root; k < s.K - 1; k++) if ((s.X[k * 3 + 1] - y) * (s.X[k * 3 + 4] - y) <= 0) a += PI * s.rho[k] ** 2; }
    if (a > best) { best = a; bestY = y; } }
  const disc = (cx, cy, r, fill, st) => `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * sc).toFixed(1)}" fill="${fill}" stroke="${st || ink}" stroke-width="0.7"/>`;
  let o = '', trunkA = 0, rootA = 0, nP = 0, nF = 0;
  for (const s of t.strands) { if (s.rootOf >= 0) continue;
    for (let k = s.root; k < s.K - 1; k++) if ((s.X[k * 3 + 1] - bestY) * (s.X[k * 3 + 4] - bestY) <= 0) { trunkA += PI * s.rho[k] ** 2; o += disc(x0 + s.X[k * 3] * sc, 130 + s.X[k * 3 + 2] * sc, s.rho[k], '#cdbfae'); } }
  for (const s of t.strands) { if (!s.root) continue; const k = s.rootOf >= 0 ? s.K - 1 : s.root - 1;
    if (s.rootOf >= 0) { nF++; o += disc(x0 + s.X[k * 3] * sc, 350 + s.X[k * 3 + 2] * sc, s.rho[k], 'none', '#b98f6e'); }
    else { nP++; rootA += PI * s.rho[k] ** 2; o += disc(x0 + s.X[k * 3] * sc, 350 + s.X[k * 3 + 2] * sc, s.rho[k], '#b98f6e'); } }
  for (const [cy, a] of [[130, trunkA], [350, rootA]]) o += `<circle cx="${x0 + 108}" cy="${cy}" r="${(Math.sqrt(a / PI) * sc).toFixed(1)}" fill="none" stroke="#c0392b" stroke-width="1.6"/>`;
  const ring = [];
  for (let R = 0.1; R <= 0.8; R += 0.05) { let a = 0;
    for (const s of t.strands) { const top = (s.rootOf >= 0 ? s.K : s.root) - 1;
      for (let k = 0; k < top; k++) { const r0 = H(s.X[k * 3], s.X[k * 3 + 2]), r1 = H(s.X[k * 3 + 3], s.X[k * 3 + 5]); if ((r0 - R) * (r1 - R) > 0) continue;
        a += PI * s.rho[k] ** 2 * Math.min(1, Math.abs(r1 - r0) / (H(s.X[k * 3 + 3] - s.X[k * 3], s.X[k * 3 + 4] - s.X[k * 3 + 1], s.X[k * 3 + 5] - s.X[k * 3 + 2]) || 1e-9)); } }
    ring.push([R, a / trunkA]); }
  const gx = (i) => x0 - 120 + i * 240 / (ring.length - 1), gy = (v) => 560 - Math.min(1.2, v) * 110;
  o += `<line x1="${x0 - 120}" y1="${gy(1)}" x2="${x0 + 120}" y2="${gy(1)}" stroke="#c0392b" stroke-width="1"/>`;
  o += `<polyline fill="none" stroke="${ink}" stroke-width="1.6" points="${ring.map((q, i) => gx(i).toFixed(1) + ',' + gy(q[1]).toFixed(1)).join(' ')}"/>`;
  const peak = Math.max(...ring.map((q) => q[1]));
  svg += o + `<text x="${x0}" y="20" text-anchor="middle" font-size="13" fill="${ink}">${col.label}</text>`
    + `<text x="${x0}" y="236" text-anchor="middle" font-size="11" fill="${ink}">trunk at its thickest (y=${bestY.toFixed(2)})</text>`
    + `<text x="${x0}" y="456" text-anchor="middle" font-size="11" fill="${ink}">${nP} roots at the foot: ${(rootA / trunkA).toFixed(2)}x the trunk</text>`
    + `<text x="${x0}" y="474" text-anchor="middle" font-size="11" fill="${ink}">(+${nF} that part off them, hollow)</text>`
    + `<text x="${x0}" y="590" text-anchor="middle" font-size="11" fill="${ink}">crossing a ring 0.1 to 0.8 out: at most ${peak.toFixed(2)}x</text>`;
  notes.push(`${col.label}: trunk ${trunkA.toFixed(4)} at y=${bestY.toFixed(2)}; ${nP} roots at the foot ${rootA.toFixed(4)} = ${(rootA / trunkA).toFixed(2)}x, parting into ${nF} more; most crossing a ring ${peak.toFixed(2)}x`);
});
fs.writeFileSync(out, `<svg xmlns="http://www.w3.org/2000/svg" width="${cols.length * W}" height="610" font-family="ui-monospace, Menlo, monospace"><rect width="100%" height="100%" fill="#f6f2ea"/>${svg}</svg>`);
fs.writeFileSync(out.replace(/\.svg$/, '.txt'), notes.join('\n') + '\n'); console.log(notes.join('\n'));
