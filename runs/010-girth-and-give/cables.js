// A lengthwise test. A post of cables of unlike girth; a ball grows among them. The only place girth enters:
// a cable will not bend over a stretch shorter than its stiff length, which rises with girth (power p).
//   node runs/010-girth-and-give/cables.js out.svg '[{"label": "...", "p": 2, "off": 0, "seed": 1}, ...]'
const fs = require('fs'), H = Math.hypot, PI = Math.PI, GA = PI * (3 - Math.sqrt(5));
function rng(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function run(recipe) {
  const P = Object.assign({ p: 2, off: 0, R: 0.3, T: 0.3, height: 2.4, K: 81, lmax: 0.9, taut: 0.3, bind: 0.03, grow: 1200, rest: 500, seed: 1 }, recipe), r = rng(P.seed), K = P.K, ds = P.height / (K - 1), S = [];
  // cables, most of them thin, until the post's section is three quarters full
  let area = 0; while (area < 0.75 * P.T * P.T) { const rho = 0.014 + 0.05 * Math.pow(r(), 2.5); S.push({ rho }); area += rho * rho; }
  const n = S.length, rmax = Math.max(...S.map((s) => s.rho)), order = S.map((_, i) => i).sort(() => r() - 0.5);
  order.forEach((i, j) => { const s = S[i], d = P.T * Math.sqrt((j + 0.5) / n) * 0.9, a = j * GA; s.X = new Float64Array(K * 3); for (let k = 0; k < K; k++) { s.X[k * 3] = d * Math.cos(a); s.X[k * 3 + 1] = k * ds; s.X[k * 3 + 2] = d * Math.sin(a); }
    const len = P.p === 0 ? P.lmax * 0.3 : P.lmax * Math.pow(s.rho / rmax, P.p); s.stiff = len; s.strides = [1]; for (let q = 2; q * ds <= len; q *= 2) s.strides.push(q); s.M = new Float64Array(K * 3); s.press = 0; });
  const c = [P.off * P.T, P.height / 2, 0], cell = rmax * 2.05;
  const collide = () => { const g = new Map(); S.forEach((s, i) => { for (let k = 0; k < K; k++) { const q = (Math.floor(s.X[k * 3] / cell) + 512) * 1048576 + (Math.floor(s.X[k * 3 + 1] / cell) + 512) * 1024 + Math.floor(s.X[k * 3 + 2] / cell) + 512, b = g.get(q); if (b) b.push(i, k); else g.set(q, [i, k]); } });
    for (const s of S) s.M.fill(0);
    S.forEach((s, i) => { for (let k = 0; k < K; k++) { const x = s.X[k * 3], y = s.X[k * 3 + 1], z = s.X[k * 3 + 2], cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let e = -1; e <= 1; e++) { const q = g.get((cx + a + 512) * 1048576 + (cy + b + 512) * 1024 + cz + e + 512); if (!q) continue;
        for (let t = 0; t < q.length; t += 2) { const j = q[t]; if (j <= i) continue; const o = S[j], l = q[t + 1], dx = x - o.X[l * 3], dy = y - o.X[l * 3 + 1], dz = z - o.X[l * 3 + 2], want = s.rho + o.rho, d2 = dx * dx + dy * dy + dz * dz; if (d2 >= want * want) continue;
          const d = Math.sqrt(d2) || 1e-9, f = 0.5 * (want - d) / d, mi = s.rho * s.rho, mj = o.rho * o.rho, wi = mj / (mi + mj), wj = mi / (mi + mj);   // the thinner gives more
          s.M[k * 3] += dx * f * wi; s.M[k * 3 + 2] += dz * f * wi; o.M[l * 3] -= dx * f * wj; o.M[l * 3 + 2] -= dz * f * wj; if (k > 0 && k < K - 1) s.M[k * 3 + 1] += dy * f * wi; if (l > 0 && l < K - 1) o.M[l * 3 + 1] -= dy * f * wj; } } } });
    for (const s of S) for (let q = 0; q < K * 3; q++) s.X[q] += s.M[q]; };
  const pass = (Rb) => {
    for (const s of S) { const X = s.X, M = s.M;
      for (const st of s.strides) { M.fill(0); for (let k = st; k < K - st; k++) for (let q = 0; q < 3; q++) M[k * 3 + q] = P.taut * ((X[(k - st) * 3 + q] + X[(k + st) * 3 + q]) / 2 - X[k * 3 + q]); for (let q = 3; q < (K - 1) * 3; q++) X[q] += M[q]; }
      for (const [e, a, b] of [[0, 1, 2], [K - 1, K - 2, K - 3]]) for (const q of [0, 2]) { X[e * 3 + q] += 0.5 * (2 * X[a * 3 + q] - X[b * 3 + q] - X[e * 3 + q]); X[e * 3 + q] *= 1 - P.bind; X[a * 3 + q] *= 1 - P.bind; }   // free ends, kept in the bundle
      X[1] = 0; X[(K - 1) * 3 + 1] = P.height; }
    collide();
    if (Rb > 0) for (const s of S) { let pr = 0; for (let k = 0; k < K; k++) { const dx = s.X[k * 3] - c[0], dy = s.X[k * 3 + 1] - c[1], dz = s.X[k * 3 + 2] - c[2], d = H(dx, dy, dz) || 1e-9, keep = Rb + s.rho; if (d < keep) { pr += keep - d; const f = keep / d; s.X[k * 3] = c[0] + dx * f; s.X[k * 3 + 1] = c[1] + dy * f; s.X[k * 3 + 2] = c[2] + dz * f; } } s.press = pr; }
  };
  for (let i = 0; i < 300; i++) pass(0);
  for (const s of S) s.start = Float64Array.from(s.X);
  for (let i = 1; i <= P.grow + P.rest; i++) pass(P.R * Math.min(1, i / P.grow));
  // what each cable did
  for (const s of S) { const X = s.X, a = [X[0], X[1], X[2]], b = [X[(K - 1) * 3], X[(K - 1) * 3 + 1], X[(K - 1) * 3 + 2]], ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2; let bow = 0, touch = 0, near = 9;
    for (let k = 0; k < K; k++) { const p = [X[k * 3] - a[0], X[k * 3 + 1] - a[1], X[k * 3 + 2] - a[2]], t = (p[0] * ab[0] + p[1] * ab[1] + p[2] * ab[2]) / L2; bow = Math.max(bow, H(p[0] - ab[0] * t, p[1] - ab[1] * t, p[2] - ab[2] * t)); const gap = H(X[k * 3] - c[0], X[k * 3 + 1] - c[1], X[k * 3 + 2] - c[2]) - P.R - s.rho; if (gap < 0.004) touch++; near = Math.min(near, gap); }
    s.bow = bow; s.touch = touch * ds; s.gap = near; s.shift = (H(X[0] - s.start[0], X[2] - s.start[2]) + H(X[(K - 1) * 3] - s.start[(K - 1) * 3], X[(K - 1) * 3 + 2] - s.start[(K - 1) * 3 + 2])) / 2;
    s.inWay = H(s.start[0] - c[0], s.start[2] - c[2]) < P.R + s.rho;
    // at the ball's widest: is it on the ball's outer face (the side away from the post's line), and close to it?
    const m = ((K - 1) / 2) * 3, ol = H(c[0], c[2]) || 1, ex = X[m] - c[0], ez = X[m + 2] - c[2]; s.face = P.off > 0 && (ex * c[0] + ez * c[2]) / ol > 0.25 * P.R && H(ex, ez) < P.R + 2.5 * s.rho + 0.03; }
  return { S, K, c, P, rmax };
}
const [out, list] = process.argv.slice(2), cols = JSON.parse(list), W = 340, sc = 150; let svg = ''; const notes = [];
const shade = (rho, rmax) => { const t = Math.pow((rho - 0.014) / (rmax - 0.014), 0.7), v = Math.round(236 - 150 * t); return `rgb(${v},${Math.round(v * 0.95)},${Math.round(v * 0.88)})`; };   // thin pale, thick dark
cols.forEach((rec, ci) => { const { label, ...recipe } = rec, b = run(recipe), P = b.P, K = b.K, x0 = ci * W + W / 2, ink = '#3b3230', px = (x) => (x0 + x * sc).toFixed(1);
  const ball = (cy, h) => `<circle cx="${px(h)}" cy="${cy.toFixed(1)}" r="${(P.R * sc).toFixed(1)}" fill="#ffe9b8" stroke="${ink}" stroke-width="0.6"/>`;
  // seen from the front
  const base = 410, segs = []; b.S.forEach((s) => { for (let k = 0; k < K - 1; k++) segs.push({ s, k, z: (s.X[k * 3 + 2] + s.X[k * 3 + 5]) / 2 }); }); segs.sort((p, q) => p.z - q.z); let drawn = false;
  for (const g of segs) { if (!drawn && g.z > b.c[2]) { svg += ball(base - b.c[1] * sc, b.c[0]); drawn = true; } const X = g.s.X, k = g.k, d = `M${px(X[k * 3])} ${(base - X[k * 3 + 1] * sc).toFixed(1)}L${px(X[k * 3 + 3])} ${(base - X[k * 3 + 4] * sc).toFixed(1)}`, w = 2 * g.s.rho * sc;
    svg += `<path d="${d}" stroke="${ink}" stroke-width="${(w + 1).toFixed(1)}"/><path d="${d}" stroke="${shade(g.s.rho, b.rmax)}" stroke-width="${w.toFixed(1)}" stroke-linecap="round"/>`; }
  // cut lengthwise through the middle
  const base2 = 800; svg += ball(base2 - b.c[1] * sc, b.c[0]);
  b.S.forEach((s) => { for (let k = 0; k < K; k++) { const z = s.X[k * 3 + 2] - b.c[2]; if (Math.abs(z) < s.rho) svg += `<circle cx="${px(s.X[k * 3])}" cy="${(base2 - s.X[k * 3 + 1] * sc).toFixed(1)}" r="${(Math.sqrt(s.rho * s.rho - z * z) * sc).toFixed(1)}" fill="${shade(s.rho, b.rmax)}" stroke="${ink}" stroke-width="0.4"/>`; } });
  // cut across at the ball's widest, and across the end of the post
  const sect = (cy, kq, withBall) => { if (withBall) svg += ball(cy, b.c[0]); for (const s of b.S) svg += `<circle cx="${px(s.X[kq * 3])}" cy="${(cy + s.X[kq * 3 + 2] * sc).toFixed(1)}" r="${(s.rho * sc).toFixed(1)}" fill="${shade(s.rho, b.rmax)}" stroke="${ink}" stroke-width="0.5"/>`; };
  sect(940, (K - 1) / 2, true); sect(1130, K - 1, false);
  svg += `<text x="${x0}" y="24" text-anchor="middle" font-size="13" fill="#d9e2e3">${label}</text>`;
  // cables in the ball's way, in thirds by girth
  const way = b.S.filter((s) => s.inWay).sort((p, q) => p.rho - q.rho), third = Math.ceil(way.length / 3), mean = (A, f) => (A.reduce((v, s) => v + f(s), 0) / (A.length || 1));
  const rows = ['thin', 'middling', 'thick'].map((name, i) => { const A = way.slice(i * third, (i + 1) * third); return { name, n: A.length, rho: mean(A, (s) => s.rho), bow: mean(A, (s) => s.bow), shift: mean(A, (s) => s.shift), touch: mean(A, (s) => s.touch), gap: mean(A, (s) => s.gap), press: mean(A, (s) => s.press) }; });
  rows.forEach((q, i) => { svg += `<text x="${x0 - 155}" y="${1232 + i * 15}" font-size="10.5" fill="#9fb3ba">${q.name.padEnd(8)} bow ${q.bow.toFixed(2)}  shift ${q.shift.toFixed(2)}  lies on ball ${q.touch.toFixed(2)}</text>`; });
  const onFace = b.S.filter((q) => q.face), allT = b.S.slice().sort((p, q) => p.rho - q.rho), cut1 = allT[Math.floor(allT.length / 3)].rho, cut2 = allT[Math.floor(2 * allT.length / 3)].rho;
  if (P.off > 0) notes.push(`${label}: over the ball's outer face: ${onFace.length} cables; thin ${onFace.filter((q) => q.rho < cut1).length}, middling ${onFace.filter((q) => q.rho >= cut1 && q.rho < cut2).length}, thick ${onFace.filter((q) => q.rho >= cut2).length}; their radii ${onFace.map((q) => q.rho.toFixed(3)).sort().join(' ')}`);
  notes.push(`${label}: ${b.S.length} cables, ${way.length} in the ball's way\n` + rows.map((q) => `  ${q.name.padEnd(8)} (${q.n}, mean radius ${q.rho.toFixed(3)}): bow ${q.bow.toFixed(3)}, ends shifted ${q.shift.toFixed(3)}, lies on the ball for ${q.touch.toFixed(3)}, nearest gap ${q.gap.toFixed(3)}, pressed in ${q.press.toFixed(4)}`).join('\n')); });
fs.writeFileSync(out, `<svg xmlns="http://www.w3.org/2000/svg" width="${cols.length * W}" height="1290" font-family="ui-monospace, Menlo, monospace" fill="none"><rect width="100%" height="100%" fill="#41565f"/>${svg}</svg>`);
console.log(notes.join('\n'));
