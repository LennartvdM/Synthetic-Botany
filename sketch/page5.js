// Sketchbook, page 5. Wood again, after page 4 came out like something squeezed through a nozzle.
// Nothing here is swept or blended. A piece is a heap of shards laid along the grain: each shard has flat
// faces meeting at a ridge, starts somewhere and ends somewhere, and is a little too stiff for the line
// it follows, so on the outside of a bend or a twist its far end stands off. Between its ends a shard has a
// little give: it draws in or spreads, drifts and sinks, very slightly.
// The same four test pieces: a twist, a turn, a winding, and all three.
// Throwaway like the other pages. Built with the clay kit from cheats/fantastic.js.
(function () {
  const { PI, TAU, H, clamp, sstep } = Fantastic.kit;
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a) => { const l = H(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }, lerp = (a, b, t) => a + (b - a) * t, mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  function rng(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function through(C, M) {
    const out = [];
    for (let i = 0; i <= M; i++) { const f = (i / M) * (C.length - 1), a = Math.min(C.length - 2, Math.floor(f)), t = f - a, p0 = C[Math.max(0, a - 1)], p1 = C[a], p2 = C[a + 1], p3 = C[Math.min(C.length - 1, a + 2)];
      out.push(p1.map((_, k) => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t * t * t))); }
    return out;
  }
  // one shard: a long piece with two flat faces meeting at a ridge, and a flat wall down each side.
  // C its line, O which way its ridge looks, W half-width, Hh ridge height. ridge: where across it the ridge runs;
  // eL, eR: how high its two edges stand; skew: how slanted its far end is cut.
  function shard(K) {
    const n = K.C.length, L = [0], Tv = K.C.map((c, i) => unit([0, 1, 2].map((k) => K.C[Math.min(n - 1, i + 1)][k] - K.C[Math.max(0, i - 1)][k])));
    for (let i = 1; i < n; i++) L.push(L[i - 1] + H(K.C[i][0] - K.C[i - 1][0], K.C[i][1] - K.C[i - 1][1], K.C[i][2] - K.C[i - 1][2]));
    const lo = [9, 9, 9], hi = [-9, -9, -9]; K.C.forEach((c, i) => { const m = K.W[i] + K.Hh[i] + K.deep; for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], c[k] - m); hi[k] = Math.max(hi[k], c[k] + m); } });
    const f = (x, y, z) => {
      // the nearest stretch of its line: found roughly first, then exactly near there
      let near = 0, nd = 1e9; for (let i = 0; i < n; i += 6) { const c = K.C[i], q = (x - c[0]) ** 2 + (y - c[1]) ** 2 + (z - c[2]) ** 2; if (q < nd) { nd = q; near = i; } }
      let bd = 1e9, bi = 0, bt = 0;
      for (let i = Math.max(0, near - 7); i < Math.min(n - 1, near + 7); i++) { const a = K.C[i], b = K.C[i + 1], ax = b[0] - a[0], ay = b[1] - a[1], az = b[2] - a[2], t = clamp(((x - a[0]) * ax + (y - a[1]) * ay + (z - a[2]) * az) / (ax * ax + ay * ay + az * az), 0, 1), dx = x - a[0] - ax * t, dy = y - a[1] - ay * t, dz = z - a[2] - az * t, d2 = dx * dx + dy * dy + dz * dz; if (d2 < bd) { bd = d2; bi = i; bt = t; } }
      // then settle on the place along the line where the way to this point is square to the line's own
      // direction there. Without this the place moves in straight steps while the facing turns smoothly, and
      // every face comes out ribbed across the grain.
      let at = bi + bt, T = Tv[0], c = K.C[0];
      for (let pass = 0; pass < 4; pass++) { const i = clamp(Math.floor(at), 0, n - 2), g = at - i; c = mix(K.C[i], K.C[i + 1], g); T = unit(mix(Tv[i], Tv[i + 1], g)); if (pass < 3) at = clamp(at + ((x - c[0]) * T[0] + (y - c[1]) * T[1] + (z - c[2]) * T[2]) / (L[i + 1] - L[i]), 0, n - 1); }
      // if that has wandered off (it can, on the inside of a tight bend), go back to the rough answer
      if ((x - c[0]) ** 2 + (y - c[1]) ** 2 + (z - c[2]) ** 2 > (Math.sqrt(bd) + 0.03) ** 2) { at = bi + bt; c = mix(K.C[bi], K.C[bi + 1], bt); T = unit(mix(Tv[bi], Tv[bi + 1], bt)); }
      bi = clamp(Math.floor(at), 0, n - 2); bt = at - bi;
      const side = unit(cross(T, mix(K.O[bi], K.O[bi + 1], bt))), o = cross(side, T), d3 = [x - c[0], y - c[1], z - c[2]];
      const pre = at <= 0 || at >= n - 1 ? dot(d3, T) : 0, u = dot(d3, side), v = dot(d3, o), w = lerp(K.W[bi], K.W[bi + 1], bt), h = lerp(K.Hh[bi], K.Hh[bi + 1], bt), s = lerp(L[bi], L[bi + 1], bt) + pre;
      const xm = K.ridge * w, yl = h * K.eL, yr = h * K.eR, lx = -(h - yl), ly = xm + w, rx = h - yr, ry = w - xm;
      // inside all of: the two faces of the roof, the two side walls, a floor well below, and the two ends
      return Math.max(((u + w) * lx + (v - yl) * ly) / H(lx, ly), ((u - xm) * rx + (v - h) * ry) / H(rx, ry), -u - w, u - w, -v - K.deep, -s, s - L[n - 1] + K.skew * u);
    };
    return { f, lo, hi };
  }
  // wood round a guide line that carries a girth. Two layers of shards on a hidden core: wide ones that give
  // the piece its bulk, and narrower, shorter ones lying on them.
  function wood(guide, o) {
    const M = 216, G = through(guide, M), frames = [], r = rng(o.seed || 1), r2 = rng((o.seed || 1) + 100), give = o.give === undefined ? 1 : o.give; let N = null;
    for (let i = 0; i <= M; i++) { const T = unit([0, 1, 2].map((k) => G[Math.min(M, i + 1)][k] - G[Math.max(0, i - 1)][k])); N = unit((N || [1, 0, 0.2]).map((v, k, A) => v - T[k] * dot(A, T))); frames.push([T, N, cross(T, N)]); }
    const all = [];
    const lay = (i0, i1, th0, rho, wide, high, lift, point, stiff, P) => {
      const fine = (q) => Math.min(1, (1 - q) / point, i0 ? q / 0.3 : 1);
      const C = [], O = [], W = [], Hh = [], n = i1 - i0; let run = 0, straight = null, T0 = null;
      // a band is held in a few places far apart and has give between them: it draws in or spreads, drifts to
      // one side, and sinks. Nothing marks where it is held; the give is the only sign of it.
      const waves = Math.max(1, Math.round(n / 110)), skew = 0.75 + 0.6 * r2(), sign = () => (r2() < 0.5 ? -1 : 1) * (0.5 + 0.5 * r2()), draw = 0.3 * sign() * give, drift = 0.32 * sign() * give, sink = 0.28 * r2() * give;
      const bow = (q) => Math.sin(PI * waves * Math.pow(q, skew)) * Math.sin(PI * q) ** 0.5;
      for (let i = i0; i <= i1; i += 2) {
        const [Tn, Nn, Bn] = frames[i], R = G[i][3], q = (i - i0) / n, th = th0 + TAU * o.turns * Math.pow(i / M, o.ramp || 1), out = [0, 1, 2].map((k) => Nn[k] * Math.cos(th) + Bn[k] * Math.sin(th));
        const b = bow(q), on = [0, 1, 2].map((k) => G[i][k] + out[k] * R * (rho + lift * q * q) + (Bn[k] * Math.cos(th) - Nn[k] * Math.sin(th)) * R * wide * drift * b);
        if (!straight) { straight = on; T0 = unit([0, 1, 2].map((k) => Tn[k] + (Bn[k] * Math.cos(th) - Nn[k] * Math.sin(th)) * TAU * o.turns * rho * R * 0.5)); } else run += H(G[i][0] - G[i - 2][0], G[i][1] - G[i - 2][1], G[i][2] - G[i - 2][2]);
        // too stiff for its line: part way between following it and running straight on from where it began
        // and never more than about half a girth off it
        const off = [0, 1, 2].map((k) => straight[k] + T0[k] * run - on[k]), far = H(off[0], off[1], off[2]) || 1e-9, stay = Math.min(stiff * q * q, 0.55 * R / far), p = [0, 1, 2].map((k) => on[k] + off[k] * stay);
        C.push(p); O.push(out); W.push(Math.max(0.004, R * wide * (1 + draw * b) * fine(q))); Hh.push(R * high * (1 - sink * Math.abs(b)) * (0.5 + 0.5 * fine(q)));
      }
      if (C.length > 1) all.push(shard(Object.assign({ C, O, W, Hh, deep: G[i0][3] * 0.5 }, P)));
    };
    // the wide ones: side by side all the way round, most from the ground up, ending at different heights
    const nA = o.wide || 6;
    for (let j = 0; j < nA; j++) lay(0, Math.round(M * (j % 3 === 0 ? 1 : 0.55 + 0.45 * r())), o.phase + TAU * (j + 0.4 * (r() - 0.5)) / nA, 0.56, 3.6 / nA * (0.85 + 0.3 * r()), 0.2 + 0.2 * r(), 0, 0.3, o.stiff * 0.3, { ridge: 0.7 * (r() - 0.5), eL: 0.2 + 0.5 * r(), eR: 0.2 + 0.5 * r(), skew: 1.5 * (r() - 0.5) });
    // the narrow ones: anywhere, any length, their far ends lifting
    for (let j = 0; j < (o.narrow || 14); j++) { const i0 = Math.round(M * 0.86 * r()), len = Math.round(M * (0.12 + 0.3 * r()));
      lay(i0, Math.min(M, i0 + len), TAU * r(), 0.7 + 0.1 * r(), 0.2 + 0.2 * r(), 0.14 + 0.14 * r(), o.lift * (0.4 + r()), 0.6, o.stiff, { ridge: 0.8 * (r() - 0.5), eL: 0.1 + 0.6 * r(), eR: 0.1 + 0.6 * r(), skew: 2 * (r() - 0.5) }); }
    // which shards are near which place, so that only those are asked
    const cell = 0.12, grid = new Map(), key = (x, y, z) => (x + 64) * 16384 + (y + 64) * 128 + z + 64;
    all.forEach((s, i) => { for (let x = Math.floor((s.lo[0] - 0.1) / cell); x <= Math.floor((s.hi[0] + 0.1) / cell); x++) for (let y = Math.floor((s.lo[1] - 0.1) / cell); y <= Math.floor((s.hi[1] + 0.1) / cell); y++) for (let z = Math.floor((s.lo[2] - 0.1) / cell); z <= Math.floor((s.hi[2] + 0.1) / cell); z++) { const k = key(x, y, z), b = grid.get(k); if (b) b.push(i); else grid.set(k, [i]); } });
    return (x, y, z) => { const b = grid.get(key(Math.floor(x / cell), Math.floor(y / cell), Math.floor(z / cell))); if (!b) return 0.1; let d = 0.1; for (const i of b) d = Math.min(d, all[i].f(x, y, z)); return d; };   // joined hard: no blending anywhere
  }
  const S = [
    ['twist', wood([[-0.1, -0.06, 0, 0.32], [-0.03, 0.5, 0, 0.29], [0.03, 1.05, 0, 0.24], [0.1, 1.62, 0, 0.15]], { seed: 1, turns: 1.3, ramp: 2, phase: 0.5, stiff: 0.5, lift: 0.25 })],
    ['turn', wood([[-0.45, -0.06, 0, 0.32], [-0.42, 0.5, 0, 0.29], [-0.3, 1.0, 0, 0.26], [0.15, 1.2, 0, 0.21], [0.62, 0.95, 0, 0.15], [0.72, 0.55, 0, 0.08]], { seed: 2, turns: 0.3, phase: 3.3, stiff: 0.5, lift: 0.25 })],
    ['winding', wood([[0, -0.06, 0, 0.3], [0.3, 0.4, 0.3, 0.27], [0, 0.8, 0.42, 0.24], [-0.3, 1.1, 0.1, 0.2], [0, 1.4, -0.2, 0.15], [0.25, 1.62, 0, 0.09]], { seed: 3, turns: 0.6, phase: 1.2, stiff: 0.45, lift: 0.25 })],
    ['all three', wood([[0.1, -0.06, 0, 0.34], [0.2, 0.5, 0, 0.3], [0.52, 0.98, 0.08, 0.24], [0.4, 1.48, 0.16, 0.2], [-0.16, 1.5, 0.08, 0.17], [-0.44, 1.06, -0.08, 0.14], [-0.1, 0.8, -0.22, 0.1], [0.3, 0.98, -0.34, 0.06]], { seed: 4, turns: 1.4, phase: 1.1, stiff: 0.45, lift: 0.25 })],
  ];
  window.Fantastic = { names: S.map((s) => s[0]), build: (i) => Fantastic.mesh(S[i][1], S[i][0], 0.0085, 1.9), mesh: Fantastic.mesh, kit: Fantastic.kit };
})();
