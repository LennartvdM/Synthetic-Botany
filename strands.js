// Strands with an inside. A piece is a bundle of strands that fill it; there is no core apart from them.
// A strand is a line of points with a girth. Each pass, every strand is pulled taut, resists bending (more
// if it is thick), and gives way to every other strand. A ball can sit among them. A strand either gives
// the ball its room or does not; one that does not still cannot pass through the ball itself.
// Nothing here has a surface. This is only where the strands go.
// No dependencies. Works as a plain <script> (globalThis.Strands) and in Node.
(function (root) {
  'use strict';
  const H = Math.hypot, PI = Math.PI, GA = PI * (3 - Math.sqrt(5));
  function rng(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function settle(recipe) {
    const P = Object.assign({ strands: 24, girth: 0.3, fill: 0.75, uneven: 0.4, height: 1.8, points: 91, twist: 0.4, taut: 0.35, stiff: 0.05, ball: { at: 0.45, r: 0.17, room: 0.6 }, giving: 0.75, passes: 700, seed: 1 }, recipe);
    const r = rng(P.seed), n = P.strands, K = P.points, rho0 = P.girth * Math.sqrt(P.fill / n), S = [];
    const c = P.ball ? [0, P.height * P.ball.at, 0] : null, room = P.ball ? P.ball.r * (1 + P.ball.room) : 0;
    // strands start packed in the section, the same at every height but for a slow turn
    for (let j = 0; j < n; j++) {
      const rho = rho0 * (1 + P.uneven * (r() - 0.5)), d = P.girth * Math.sqrt((j + 0.5) / n) * 0.85, a0 = j * GA, give = r() < P.giving ? 1 : 0.25 * r(), X = new Float64Array(K * 3);
      for (let k = 0; k < K; k++) { const t = k / (K - 1), a = a0 + P.twist * 2 * PI * t; X[k * 3] = d * Math.cos(a); X[k * 3 + 1] = P.height * t; X[k * 3 + 2] = d * Math.sin(a); }
      S.push({ X, rho, give, keep: P.ball ? P.ball.r + rho + (room - P.ball.r) * give : 0, bend: P.stiff * Math.min(1.6, (rho / rho0) ** 2) });
    }
    const cell = rho0 * 3.2, key = (x, y, z) => (Math.floor(x / cell) + 512) * 1048576 + (Math.floor(y / cell) + 512) * 1024 + Math.floor(z / cell) + 512;
    const each = (fn) => {   // every pair of points of unlike strands that are near each other
      const g = new Map(); S.forEach((s, i) => { for (let k = 0; k < K; k++) { const q = key(s.X[k * 3], s.X[k * 3 + 1], s.X[k * 3 + 2]), b = g.get(q); if (b) b.push(i, k); else g.set(q, [i, k]); } });
      S.forEach((s, i) => { for (let k = 0; k < K; k++) { const x = s.X[k * 3], y = s.X[k * 3 + 1], z = s.X[k * 3 + 2], cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let e = -1; e <= 1; e++) { const q = g.get((cx + a + 512) * 1048576 + (cy + b + 512) * 1024 + cz + e + 512); if (!q) continue;
          for (let t = 0; t < q.length; t += 2) { const j = q[t]; if (j <= i) continue; const l = q[t + 1], o = S[j].X, dx = x - o[l * 3], dy = y - o[l * 3 + 1], dz = z - o[l * 3 + 2], d = H(dx, dy, dz), want = s.rho + S[j].rho; if (d < want) fn(i, k, j, l, dx, dy, dz, d || 1e-9, want); } } } });
    };
    const M = S.map(() => new Float64Array(K * 3));
    for (let pass = 0; pass < P.passes; pass++) {
      // taut and stiff. The two points at each end are held, so a strand leaves and arrives straight.
      S.forEach((s, i) => { const X = s.X, m = M[i]; m.fill(0);
        for (let k = 2; k < K - 2; k++) for (let q = 0; q < 3; q++) { const a = X[(k - 2) * 3 + q], b = X[(k - 1) * 3 + q], p = X[k * 3 + q], d = X[(k + 1) * 3 + q], e = X[(k + 2) * 3 + q]; m[k * 3 + q] = P.taut * ((b + d) / 2 - p) - s.bend * (a - 4 * b + 6 * p - 4 * d + e); }
        for (let q = 6; q < (K - 2) * 3; q++) X[q] += m[q]; });
      // they give way to each other, each by half
      M.forEach((m) => m.fill(0));
      each((i, k, j, l, dx, dy, dz, d, want) => { const f = 0.25 * (want - d) / d, hk = k > 1 && k < K - 2 ? 1 : 0, hl = l > 1 && l < K - 2 ? 1 : 0;   // the held ends give way sideways only
        M[i][k * 3] += dx * f; M[i][k * 3 + 1] += dy * f * hk; M[i][k * 3 + 2] += dz * f; M[j][l * 3] -= dx * f; M[j][l * 3 + 1] -= dy * f * hl; M[j][l * 3 + 2] -= dz * f; });
      S.forEach((s, i) => { for (let q = 0; q < K * 3; q++) s.X[q] += M[i][q]; });
      // and to the ball: each keeps as far off as it is willing to
      if (c) for (const s of S) for (let k = 2; k < K - 2; k++) { const dx = s.X[k * 3] - c[0], dy = s.X[k * 3 + 1] - c[1], dz = s.X[k * 3 + 2] - c[2], d = H(dx, dy, dz) || 1e-9; if (d < s.keep) { const f = s.keep / d; s.X[k * 3] = c[0] + dx * f; s.X[k * 3 + 1] = c[1] + dy * f; s.X[k * 3 + 2] = c[2] + dz * f; } }
    }
    // measures, to set beside the pictures and not in place of them
    let worst = 0; each((i, k, j, l, dx, dy, dz, d, want) => { worst = Math.max(worst, (want - d) / want); });
    let inBall = 0; if (c) for (const s of S) for (let k = 0; k < K; k++) if (H(s.X[k * 3] - c[0], s.X[k * 3 + 1] - c[1], s.X[k * 3 + 2] - c[2]) < P.ball.r + s.rho * 0.9) inBall++;
    const cross = (y) => S.map((s) => { let k = 0; while (k < K - 2 && s.X[(k + 1) * 3 + 1] < y) k++; const t = (y - s.X[k * 3 + 1]) / ((s.X[(k + 1) * 3 + 1] - s.X[k * 3 + 1]) || 1e-9); return { x: s.X[k * 3] + (s.X[(k + 1) * 3] - s.X[k * 3]) * t, z: s.X[k * 3 + 2] + (s.X[(k + 1) * 3 + 2] - s.X[k * 3 + 2]) * t, rho: s.rho, give: s.give }; });
    const radius = (sec) => Math.max(...sec.map((q) => H(q.x, q.z) + q.rho));
    // how much of the way round the ball's widest part is open: no strand between the ball and the outside
    const open = (sec) => { let free = 0; const N = 720; for (let a = 0; a < N; a++) { const t = 2 * PI * a / N, ux = Math.cos(t), uz = Math.sin(t); if (!sec.some((q) => { const along = q.x * ux + q.z * uz; return along > 0 && Math.abs(q.x * uz - q.z * ux) < q.rho; })) free++; } return free / N; };
    const mid = c ? cross(c[1]) : null, far = cross(P.height * 0.92), widths = S.reduce((v, s) => v + 2 * s.rho, 0), rhoMean = widths / (2 * n);
    return { S, K, ball: c && { c, r: P.ball.r, room }, cross, recipe: P,
      measure: { bundle: radius(far), bulb: mid ? radius(mid) : 0, bulbPredicted: c ? Math.sqrt(room * room + radius(far) ** 2) : 0, open: mid ? open(mid) : 0, roomToOpen: widths / (2 * PI) - rhoMean, worstOverlap: worst, pointsInBall: inBall } };
  }

  const api = { settle };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Strands = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
