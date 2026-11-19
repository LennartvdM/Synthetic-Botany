// Draws settled strands as slices, with no surface: a row of columns, one per recipe. In each column, from the
// top: seen from the front; cut lengthwise through the middle; cut across at the ball's widest.
//   node runs/008-strands-round-a-ball/draw.js out.svg '[{"label": "...", ...recipe}, ...]'
const fs = require('fs'), Strands = require('../../strands.js');
const [out, list] = process.argv.slice(2), cols = JSON.parse(list), W = 330, sc = 190, ink = '#3b3230', wood = '#e7e0d4', firm = '#a98f84', glow = '#ffe9b8';
let svg = '', notes = [];
cols.forEach((rec, ci) => {
  const { label, ...recipe } = rec, b = Strands.settle(recipe), m = b.measure, x0 = ci * W + W / 2, K = b.K, H = recipe.height || 1.8;
  const px = (x) => (x0 + x * sc).toFixed(1), py = (y, base) => (base - y * sc).toFixed(1), tone = (s) => (s.give === 1 ? wood : firm);
  // from the front: every piece of every strand, far ones first, the ball in its place among them
  const segs = []; b.S.forEach((s) => { for (let k = 0; k < K - 1; k++) segs.push({ s, k, z: (s.X[k * 3 + 2] + s.X[k * 3 + 5]) / 2 }); }); segs.sort((p, q) => p.z - q.z);
  const base1 = 400; let ball = !b.ball;
  const orb = (base) => (b.ball ? `<circle cx="${px(b.ball.c[0])}" cy="${py(b.ball.c[1], base)}" r="${(b.ball.r * sc).toFixed(1)}" fill="${glow}" stroke="${ink}" stroke-width="0.6"/>` : '');
  for (const g of segs) { if (!ball && g.z > 0) { svg += orb(base1); ball = true; } const X = g.s.X, k = g.k, d = `M${px(X[k * 3])} ${py(X[k * 3 + 1], base1)}L${px(X[k * 3 + 3])} ${py(X[k * 3 + 4], base1)}`, w = 2 * g.s.rho * sc;
    svg += `<path d="${d}" stroke="${ink}" stroke-width="${(w + 1.2).toFixed(1)}"/><path d="${d}" stroke="${tone(g.s)}" stroke-width="${w.toFixed(1)}" stroke-linecap="round"/>`; }
  // cut lengthwise: where each strand passes through the middle plane it shows as a run of its own width
  const base2 = 800; if (b.ball) svg += `<circle cx="${px(0)}" cy="${py(b.ball.c[1], base2)}" r="${(b.ball.room * sc).toFixed(1)}" fill="none" stroke="${ink}" stroke-width="0.7" stroke-dasharray="3 3"/>` + orb(base2);
  b.S.forEach((s) => { for (let k = 0; k < K; k++) { const z = s.X[k * 3 + 2]; if (Math.abs(z) < s.rho) svg += `<circle cx="${px(s.X[k * 3])}" cy="${py(s.X[k * 3 + 1], base2)}" r="${(Math.sqrt(s.rho * s.rho - z * z) * sc).toFixed(1)}" fill="${tone(s)}" stroke="${ink}" stroke-width="0.5"/>`; } });
  // cut across at the ball's widest (or at the same height if there is no ball)
  const cy = 960, yc = b.ball ? b.ball.c[1] : H * 0.45;
  if (b.ball) svg += `<circle cx="${px(0)}" cy="${cy}" r="${(b.ball.room * sc).toFixed(1)}" fill="none" stroke="${ink}" stroke-width="0.7" stroke-dasharray="3 3"/><circle cx="${px(0)}" cy="${cy}" r="${(b.ball.r * sc).toFixed(1)}" fill="${glow}" stroke="${ink}" stroke-width="0.6"/>`;
  for (const q of b.cross(yc)) svg += `<circle cx="${px(q.x)}" cy="${(cy + q.z * sc).toFixed(1)}" r="${(q.rho * sc).toFixed(1)}" fill="${q.give === 1 ? wood : firm}" stroke="${ink}" stroke-width="0.6"/>`;
  svg += `<text x="${x0}" y="24" text-anchor="middle" font-size="14" fill="#d9e2e3">${label}</text>`;
  svg += `<text x="${x0}" y="1108" text-anchor="middle" font-size="11.5" fill="#9fb3ba">bulb ${m.bulb.toFixed(2)} (budget says ${m.bulbPredicted.toFixed(2)})</text><text x="${x0}" y="1124" text-anchor="middle" font-size="11.5" fill="#9fb3ba">${(100 * m.open).toFixed(0)}% of the way round is open</text>`;
  notes.push(`${label}: bundle ${m.bundle.toFixed(3)}, bulb ${m.bulb.toFixed(3)}, budget ${m.bulbPredicted.toFixed(3)}, open ${(100 * m.open).toFixed(0)}%, room radius ${b.ball ? b.ball.room.toFixed(3) : '-'} (opens past ${m.roomToOpen.toFixed(3)}), worst overlap ${(100 * m.worstOverlap).toFixed(1)}%, points in ball ${m.pointsInBall}`);
});
fs.writeFileSync(out, `<svg xmlns="http://www.w3.org/2000/svg" width="${cols.length * W}" height="1140" font-family="ui-monospace, Menlo, monospace" fill="none"><rect width="100%" height="100%" fill="#41565f"/>${svg}</svg>`);
console.log(notes.join('\n'));
