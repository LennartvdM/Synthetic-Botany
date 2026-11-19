// A cross-section. Equal fibres in concentric rings fill a round trunk. A fibre is linked to its two
// neighbours in its own ring; a link snaps when stretched past a limit. A round body grows at the middle.
// Asks: what sizes of piece are left, and where do they lie?
//   node runs/009-why-girths-differ/rings.js out.svg '[{"label": "...", "R": 0.6, "limit": 0.25, "seed": 1}, ...]'
const fs = require('fs'), H = Math.hypot, PI = Math.PI;
function rng(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function run(recipe) {
  const P = Object.assign({ rings: 9, a: 0.05, R: 0.6, limit: 0.25, uneven: 0.2, steps: 600, seed: 1 }, recipe), r = rng(P.seed), F = [], L = [];
  for (let k = 1; k <= P.rings; k++) { const rho = k * 2 * P.a, n = Math.floor(2 * PI * rho / (2 * P.a)), ph = r() * 2 * PI, first = F.length;
    for (let j = 0; j < n; j++) F.push({ x: rho * Math.cos(ph + 2 * PI * j / n), y: rho * Math.sin(ph + 2 * PI * j / n), ring: k });
    const rest = 2 * rho * Math.sin(PI / n); for (let j = 0; j < n; j++) L.push({ a: first + j, b: first + (j + 1) % n, rest, max: rest * (1 + P.limit * (1 + P.uneven * (r() * 2 - 1))), ring: k, whole: true, torn: -1 }); }
  const N = F.length;
  for (let s = 1; s <= P.steps; s++) {
    const Rb = P.R * Math.min(1, s / (P.steps * 0.8));
    for (let it = 0; it < 6; it++) {
      for (const l of L) { if (!l.whole) continue; const A = F[l.a], B = F[l.b], dx = B.x - A.x, dy = B.y - A.y, d = H(dx, dy) || 1e-9, f = 0.5 * (d - l.rest) / d; if (d > l.rest) { A.x += dx * f; A.y += dy * f; B.x -= dx * f; B.y -= dy * f; } }   // a link only pulls
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const A = F[i], B = F[j], dx = B.x - A.x, dy = B.y - A.y, d2 = dx * dx + dy * dy; if (d2 < 4 * P.a * P.a) { const d = Math.sqrt(d2) || 1e-9, f = 0.5 * (2 * P.a - d) / d; A.x -= dx * f; A.y -= dy * f; B.x += dx * f; B.y += dy * f; } }
      for (const A of F) { const d = H(A.x, A.y) || 1e-9; if (d < Rb + P.a) { const f = (Rb + P.a) / d; A.x *= f; A.y *= f; } }
    }
    for (const l of L) if (l.whole && H(F[l.b].x - F[l.a].x, F[l.b].y - F[l.a].y) > l.max) { l.whole = false; l.torn = Rb; }
  }
  // pieces: runs of fibres of one ring still linked together
  const piece = new Int32Array(N).fill(-1); let np = 0; const sizes = [];
  for (let i = 0; i < N; i++) { if (piece[i] >= 0) continue; const q = [i]; piece[i] = np; let c = 0; while (q.length) { const u = q.pop(); c++; for (const l of L) if (l.whole && (l.a === u || l.b === u)) { const v = l.a === u ? l.b : l.a; if (piece[v] < 0) { piece[v] = np; q.push(v); } } } sizes.push(c); np++; }
  const byRing = []; for (let k = 1; k <= P.rings; k++) { const ids = new Set(), fib = F.filter((f, i) => f.ring === k && ids.add(piece[i])), sz = [...ids].map((p) => sizes[p]).sort((x, y) => y - x), tears = L.filter((l) => l.ring === k && !l.whole);
    byRing.push({ ring: k, fibres: fib.length, pieces: sz, tears: tears.length, firstTear: tears.length ? Math.min(...tears.map((l) => l.torn)) : null, dist: fib.reduce((v, f) => v + H(f.x, f.y), 0) / fib.length - P.R }); }
  return { F, L, P, byRing };
}
const [out, list] = process.argv.slice(2), cols = JSON.parse(list), W = 360, sc = 150; let svg = ''; const rows = [];
cols.forEach((rec, ci) => { const { label, ...recipe } = rec, b = run(recipe), P = b.P, x0 = ci * W + W / 2, y0 = 210, px = (x) => (x0 + x * sc).toFixed(1), py = (y) => (y0 + y * sc).toFixed(1);
  svg += `<circle cx="${x0}" cy="${y0}" r="${(P.R * sc).toFixed(1)}" fill="#ffe9b8" stroke="#3b3230" stroke-width="0.6"/>`;
  for (const l of b.L) if (l.whole) svg += `<path d="M${px(b.F[l.a].x)} ${py(b.F[l.a].y)}L${px(b.F[l.b].x)} ${py(b.F[l.b].y)}" stroke="#3b3230" stroke-width="${(P.a * sc * 1.1).toFixed(1)}" stroke-linecap="round"/>`;
  // inner rings pale, outer rings dark, so that where each ended up can be read
  for (const f of b.F) { const t = (f.ring - 1) / (P.rings - 1), c = Math.round(236 - 150 * t); svg += `<circle cx="${px(f.x)}" cy="${py(f.y)}" r="${(P.a * sc * 0.9).toFixed(1)}" fill="rgb(${c},${Math.round(c * 0.95)},${Math.round(c * 0.88)})" stroke="#3b3230" stroke-width="0.4"/>`; }
  svg += `<text x="${x0}" y="22" text-anchor="middle" font-size="13" fill="#d9e2e3">${label}</text>`;
  b.byRing.forEach((q, i) => { svg += `<text x="${x0 - 165}" y="${430 + i * 15}" font-size="10.5" fill="#9fb3ba">ring ${q.ring} (${q.fibres}): ${q.tears} tears, pieces ${q.pieces.slice(0, 9).join(' ')}${q.pieces.length > 9 ? ' …' : ''}</text>`; });
  rows.push(label + '\n' + b.byRing.map((q) => `  ring ${q.ring}: ${q.fibres} fibres, ${q.tears} tears${q.firstTear === null ? '' : ' (first when the body was ' + q.firstTear.toFixed(2) + ')'}, pieces [${q.pieces.join(' ')}], mean piece ${(q.fibres / q.pieces.length).toFixed(1)}, lies ${q.dist.toFixed(2)} off the body`).join('\n')); });
fs.writeFileSync(out, `<svg xmlns="http://www.w3.org/2000/svg" width="${cols.length * W}" height="580" font-family="ui-monospace, Menlo, monospace" fill="none"><rect width="100%" height="100%" fill="#41565f"/>${svg}</svg>`);
console.log(rows.join('\n'));
