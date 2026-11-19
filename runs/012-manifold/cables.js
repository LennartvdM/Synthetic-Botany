// The manifold's experiment: a post of cables of unlike girth, anchored at both ends; a ball grows among them.
// Five switches: stiff (stiffness by girth), resist (thick cables push the ball), grip (thin cables on the ball
// hold their place), twist (cables start wound round the post), split (a cable pressed long enough against the
// ball divides lengthwise over the pressed stretch). run(recipe) returns the cables and the measures.
'use strict';
const H = Math.hypot, PI = Math.PI, GA = PI * (3 - Math.sqrt(5)), RMAX = 0.064;
function rng(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const thickOf = (r) => Math.pow(Math.max(0, Math.min(1, (r - 0.010) / (RMAX - 0.010))), 0.7);
const unit = (v) => { const l = H(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }, cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function run(recipe) {
  const P = Object.assign({ stiff: 1, resist: 1, grip: 1, twist: 0, split: 0, off: 0.3, R: 0.2, T: 0.3, height: 2.4, K: 81, lmax: 0.9, taut: 0.3, hold: 0.03, grow: 1200, rest: 500, seed: 1, splitAt: 1.2, splitEvery: 40, maxCables: 1000, rfloor: 0.008 }, recipe);
  const r = rng(P.seed), K = P.K, ds = P.height / (K - 1), S = [];
  let area = 0; const radii = []; while (area < 0.75 * P.T * P.T) { const q = 0.014 + 0.05 * Math.pow(r(), 2.5); radii.push(q); area += q * q; }
  const n0 = radii.length, order = radii.map((_, i) => i).sort(() => r() - 0.5), stiffLen = (q) => (P.stiff ? P.lmax * (q / RMAX) ** 2 : P.lmax * 0.3);
  const make = (X, rr, parent, po) => ({ X, r: rr, n: rr.length, parent, po, start: Float64Array.from(X), M: new Float64Array(rr.length * 3), on: new Uint8Array(rr.length), dig: new Float64Array(rr.length), press: 0 });
  order.forEach((i, j) => { const d = P.T * Math.sqrt((j + 0.5) / n0) * 0.9, a = j * GA, X = new Float64Array(K * 3);
    for (let k = 0; k < K; k++) { const y = k * ds, t = a + P.twist * 2 * PI * (y / P.height - 0.5); X[k * 3] = d * Math.cos(t); X[k * 3 + 1] = y; X[k * 3 + 2] = d * Math.sin(t); }
    S.push(make(X, new Float64Array(K).fill(radii[i]), -1, 0)); });
  const c0 = [P.off * P.T, P.height / 2, 0], c = c0.slice(), cell = 2.05 * RMAX; let forks = 0;
  const famSkip = (i, k, j, l) => { const A = S[i], B = S[j]; let ch, m, pl; if (B.parent === i) { ch = B; m = l; pl = k; } else if (A.parent === j) { ch = A; m = k; pl = l; } else return false; return (m <= 3 || m >= ch.n - 4) && Math.abs(pl - (ch.po + m)) <= 3; };
  const collide = () => {
    const g = new Map(); S.forEach((s, i) => { for (let k = 0; k < s.n; k++) { const q = (Math.floor(s.X[k * 3] / cell) + 512) * 1048576 + (Math.floor(s.X[k * 3 + 1] / cell) + 512) * 1024 + Math.floor(s.X[k * 3 + 2] / cell) + 512, b = g.get(q); if (b) b.push(i, k); else g.set(q, [i, k]); } });
    for (const s of S) s.M.fill(0);
    S.forEach((s, i) => { for (let k = 0; k < s.n; k++) { const x = s.X[k * 3], y = s.X[k * 3 + 1], z = s.X[k * 3 + 2], cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let e = -1; e <= 1; e++) { const q = g.get((cx + a + 512) * 1048576 + (cy + b + 512) * 1024 + cz + e + 512); if (!q) continue;
        for (let t = 0; t < q.length; t += 2) { const j = q[t]; if (j <= i) continue; const o = S[j], l = q[t + 1], dx = x - o.X[l * 3], dy = y - o.X[l * 3 + 1], dz = z - o.X[l * 3 + 2], want = s.r[k] + o.r[l], d2 = dx * dx + dy * dy + dz * dz; if (d2 >= want * want || famSkip(i, k, j, l)) continue;
          const d = Math.sqrt(d2) || 1e-9, f = 0.5 * (want - d) / d, mi = s.r[k] ** 2 * (1 + 20 * P.grip * (1 - thickOf(s.r[k])) * s.on[k]), mj = o.r[l] ** 2 * (1 + 20 * P.grip * (1 - thickOf(o.r[l])) * o.on[l]), wi = mj / (mi + mj), wj = mi / (mi + mj);
          s.M[k * 3] += dx * f * wi; s.M[k * 3 + 1] += dy * f * wi; s.M[k * 3 + 2] += dz * f * wi; o.M[l * 3] -= dx * f * wj; o.M[l * 3 + 1] -= dy * f * wj; o.M[l * 3 + 2] -= dz * f * wj; } } } });
    for (const s of S) for (let q = 3; q < (s.n - 1) * 3; q++) s.X[q] += s.M[q];
  };
  const ends = () => S.forEach((s) => { const X = s.X, n = s.n;
    if (s.parent < 0) { for (const e of [0, n - 1]) for (let q = 0; q < 3; q++) X[e * 3 + q] = s.start[e * 3 + q]; }   // roots: anchored
    else { const p = S[s.parent].X; for (const [e, k] of [[0, s.po], [n - 1, s.po + n - 1]]) for (let q = 0; q < 3; q++) X[e * 3 + q] = p[k * 3 + q]; } });   // a split rejoins its parent
  const split = (i) => { const s = S[i], n = s.n; let a = -1, b = -1; for (let k = 1; k < n - 1; k++) if (s.on[k]) { if (a < 0) a = k; b = k; } if (a < 0) return;
    const ka = Math.max(1, a - 6), kb = Math.min(n - 2, b + 6); if (kb - ka < 8) return; for (let k = ka; k <= kb; k++) if (s.r[k] / Math.SQRT2 < P.rfloor) return;
    const nc = kb - ka + 1, X = new Float64Array(nc * 3), rr = new Float64Array(nc);
    for (let m = 0; m < nc; m++) { const k = ka + m, p = [s.X[k * 3], s.X[k * 3 + 1], s.X[k * 3 + 2]], tg = [s.X[(k + 1) * 3] - s.X[(k - 1) * 3], s.X[(k + 1) * 3 + 1] - s.X[(k - 1) * 3 + 1], s.X[(k + 1) * 3 + 2] - s.X[(k - 1) * 3 + 2]], side = unit(cross(tg, [p[0] - c[0], p[1] - c[1], p[2] - c[2]]));
      const rn = s.r[k] / Math.SQRT2, amt = rn * 0.7 * Math.sin(PI * m / (nc - 1)); for (let q = 0; q < 3; q++) { X[m * 3 + q] = p[q] + side[q] * amt; s.X[k * 3 + q] = p[q] - side[q] * amt; } s.r[k] = rn; rr[m] = rn; }
    S.push(make(X, rr, i, ka)); forks++; };
  const pass = (Rb, step) => {
    for (const s of S) { const X = s.X, M = s.M, n = s.n;
      for (const st of [1, 2, 4, 8, 16, 32]) { if (2 * st >= n) break; M.fill(0); let any = false;
        for (let k = st; k < n - st; k++) { if (st > 1 && st * ds > stiffLen(s.r[k])) continue; any = true; for (let q = 0; q < 3; q++) M[k * 3 + q] = P.taut * ((X[(k - st) * 3 + q] + X[(k + st) * 3 + q]) / 2 - X[k * 3 + q]); }
        if (!any) break; for (let q = 3; q < (n - 1) * 3; q++) X[q] += M[q]; } }
    ends(); collide();
    if (Rb > 0 && P.resist) { let px = 0, py = 0, pz = 0, w = 0;
      for (const s of S) for (let k = 0; k < s.n; k++) { const dx = s.X[k * 3] - c[0], dy = s.X[k * 3 + 1] - c[1], dz = s.X[k * 3 + 2] - c[2], d = H(dx, dy, dz) || 1e-9, over = Rb + s.r[k] - d; if (over > 0) { const t = thickOf(s.r[k]), f = t * over / d; px -= dx * f; py -= dy * f; pz -= dz * f; w += t; } }
      if (w > 0) { c[0] += 0.6 * px / w; c[1] += 0.6 * py / w; c[2] += 0.6 * pz / w; } for (let q = 0; q < 3; q++) c[q] += P.hold * (c0[q] - c[q]); }
    if (Rb > 0) for (const s of S) for (let k = 1; k < s.n - 1; k++) { const dx = s.X[k * 3] - c[0], dy = s.X[k * 3 + 1] - c[1], dz = s.X[k * 3 + 2] - c[2], d = H(dx, dy, dz) || 1e-9, keep = Rb + s.r[k]; s.on[k] = d < keep + 0.004 ? 1 : 0; if (d < keep) { s.press += keep - d; const f = keep / d; s.X[k * 3] = c[0] + dx * f; s.X[k * 3 + 1] = c[1] + dy * f; s.X[k * 3 + 2] = c[2] + dz * f; } }
    ends();
    if (P.split && Rb > 0 && step % P.splitEvery === 0) { const cand = S.map((s, i) => [s.press, i]).filter((q) => q[0] > P.splitAt).sort((a, b) => b[0] - a[0]); for (const [, i] of cand) { if (S.length >= P.maxCables) break; split(i); } for (const s of S) s.press = 0; }
  };
  for (let i = 0; i < 300; i++) pass(0, i);
  for (let i = 1; i <= P.grow + P.rest; i++) pass(P.R * Math.min(1, i / P.grow), i);
  // measures
  const u = unit([c0[0], 0, c0[2]]), at = (s, y) => { let best = -1, bd = ds; for (let k = 0; k < s.n; k++) { const e = Math.abs(s.X[k * 3 + 1] - y); if (e < bd) { bd = e; best = k; } } return best; };
  const face = [], near = [];
  S.forEach((s, i) => { const k = at(s, c[1]); if (k < 0) return; const dx = s.X[k * 3] - c[0], dz = s.X[k * 3 + 2] - c[2], dd = H(dx, dz), gap = dd - P.R - s.r[k];
    if ((dx * u[0] + dz * u[2]) > 0.25 * P.R && dd < P.R + 2.5 * s.r[k] + 0.03) face.push(s.r[k]); if (dd < 2.5 * P.R) near.push([s.r[k], gap]); });
  const az = (s, y) => { const k = at(s, y); if (k < 0) return null; const dx = s.X[k * 3] - c[0], dz = s.X[k * 3 + 2] - c[2]; if (dx * u[0] + dz * u[2] < 0 || H(dx, dz) > P.R + 3 * s.r[k] + 0.05) return null; return Math.atan2(dx * u[2] - dz * u[0], dx * u[0] + dz * u[2]); };
  const both = S.map((s) => [az(s, c[1] - 0.6 * P.R), az(s, c[1] + 0.6 * P.R)]).filter((q) => q[0] !== null && q[1] !== null); let crossings = 0;
  for (let a = 0; a < both.length; a++) for (let b = a + 1; b < both.length; b++) if ((both[a][0] - both[b][0]) * (both[a][1] - both[b][1]) < 0) crossings++;
  const rank = (v) => { const o = v.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]), R2 = new Array(v.length); o.forEach((p, i) => (R2[p[1]] = i)); return R2; };
  let grad = 0; if (near.length > 3) { const a = rank(near.map((q) => q[0])), b = rank(near.map((q) => q[1])), n = near.length, ma = (n - 1) / 2; let num = 0, da = 0, db = 0; for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - ma); da += (a[i] - ma) ** 2; db += (b[i] - ma) ** 2; } grad = num / Math.sqrt(da * db); }
  return { cables: S.map((s) => ({ X: s.X, r: s.r, n: s.n })), c, P,
    m: { thin: face.filter((q) => q < 0.02).length, mid: face.filter((q) => q >= 0.02 && q < 0.032).length, thick: face.filter((q) => q >= 0.032).length, crossings, forks, grad, out: H(c[0], c[2]) / P.T, cables: S.length } };
}
module.exports = { run };
