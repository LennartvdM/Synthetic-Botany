// Sketchbook, page 4. Wood as heavy clay: a few fat planks laid round a line.
// Not trees. Four test pieces, each a plain line that asks one thing of the material: a twist, a turn,
// a winding, and all three in one.
// Throwaway like the other pages. Built with the clay kit from cheats/fantastic.js.
(function () {
  const { PI, TAU, H, clamp, sstep, smin, smax } = Fantastic.kit;
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a) => { const l = H(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }, lerp = (a, b, t) => a + (b - a) * t, mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  // a smooth line through a few given points (each any list of numbers)
  function through(C, M) {
    const out = [];
    for (let i = 0; i <= M; i++) { const f = (i / M) * (C.length - 1), a = Math.min(C.length - 2, Math.floor(f)), t = f - a, p0 = C[Math.max(0, a - 1)], p1 = C[a], p2 = C[a + 1], p3 = C[Math.min(C.length - 1, a + 2)];
      out.push(p1.map((_, k) => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t * t * t))); }
    return out;
  }
  // one plank: a wide, thin, crested blade following a line. C centres, O which way its face looks, W half-width, T half-thickness.
  function plank(K) {
    const n = K.C.length, L = [0], Tv = K.C.map((c, i) => unit([0, 1, 2].map((k) => K.C[Math.min(n - 1, i + 1)][k] - K.C[Math.max(0, i - 1)][k])));
    for (let i = 1; i < n; i++) L.push(L[i - 1] + H(K.C[i][0] - K.C[i - 1][0], K.C[i][1] - K.C[i - 1][1], K.C[i][2] - K.C[i - 1][2]));
    let cx = 0, cy = 0, cz = 0, R = 0; for (const c of K.C) { cx += c[0] / n; cy += c[1] / n; cz += c[2] / n; } K.C.forEach((c, i) => (R = Math.max(R, H(c[0] - cx, c[1] - cy, c[2] - cz) + K.W[i])));
    const steps = [0, 1.7, 0.5, 2.8, 1.1, 0.2, 2.1];
    return (x, y, z) => {
      const far = H(x - cx, y - cy, z - cz) - R; if (far > 0.2) return far;
      let bd = 1e9, bi = 0, bt = 0;
      for (let i = 0; i < n - 1; i++) { const a = K.C[i], b = K.C[i + 1], ax = b[0] - a[0], ay = b[1] - a[1], az = b[2] - a[2], t = clamp(((x - a[0]) * ax + (y - a[1]) * ay + (z - a[2]) * az) / (ax * ax + ay * ay + az * az), 0, 1), dx = x - a[0] - ax * t, dy = y - a[1] - ay * t, dz = z - a[2] - az * t, d2 = dx * dx + dy * dy + dz * dz; if (d2 < bd) { bd = d2; bi = i; bt = t; } }
      const a = K.C[bi], b = K.C[bi + 1], T = unit(mix(Tv[bi], Tv[bi + 1], bt)), side = unit(cross(T, mix(K.O[bi], K.O[bi + 1], bt))), o = cross(side, T), d3 = [x - lerp(a[0], b[0], bt), y - lerp(a[1], b[1], bt), z - lerp(a[2], b[2], bt)];
      // a place before the first point or past the last counts as lying beyond the end
      const pre = (bi === 0 && bt === 0) || (bi === n - 2 && bt === 1) ? dot(d3, T) : 0;
      const u = dot(d3, side), v = dot(d3, o), w = lerp(K.W[bi], K.W[bi + 1], bt), th = lerp(K.T[bi], K.T[bi + 1], bt), s = lerp(L[bi], L[bi + 1], bt) + pre;
      const e = clamp(Math.abs(u) / w, 0, 1), thin = th * (1 - 0.6 * e * e), qx = Math.abs(u) - w, qy = Math.abs(v) - thin;   // thick down the middle, an edge at each side
      let d = Math.min(Math.max(qx, qy), 0) + H(Math.max(qx, 0), Math.max(qy, 0)); if (pre) d = H(Math.max(d, 0), pre) + Math.min(d, 0);
      const face = sstep(0, th * 0.5, v);
      d -= 0.4 * th * Math.max(0, 1 - Math.abs(u) / (0.45 * w)) * face;                                  // a crest down the outer face
      d += 0.3 * th * Math.max(0, 1 - Math.abs(Math.abs(u) / w - 0.6) / 0.13) * face;                    // a gouge either side of it
      if (K.torn) d = smax(d, s - (L[n - 1] - th * steps[clamp(Math.floor((u / w * 0.5 + 0.5) * 7), 0, 6)] * K.torn), 0.006);   // snapped: slivers of uneven length
      for (const q of K.notch || []) d = smax(d, q[2] - H(s - q[0] * L[n - 1], u - q[1] * w), 0.01);   // bites out of an edge
      return d;
    };
  }
  // wood: n planks laid round a guide line that carries a girth, turning round it as they go.
  //   turns  how many times they go round over the whole line       ramp   >1 saves the turning for the far end
  //   out    how far from the line they sit, in girths              ends   where along the line each plank stops
  //   torn   whether it stops in a break (how ragged) or a point    fly    a plank that stops early may run straight on
  //                                                                        this many steps, refusing the line's turn
  function wood(guide, o) {
    const M = 72, G = through(guide, M), frames = []; let N = null;
    for (let i = 0; i <= M; i++) { const T = unit([0, 1, 2].map((k) => G[Math.min(M, i + 1)][k] - G[Math.max(0, i - 1)][k])); N = unit((N || [1, 0, 0.2]).map((v, k, A) => v - T[k] * dot(A, T))); frames.push([T, N, cross(T, N)]); }
    const planks = [];
    for (let j = 0; j < o.n; j++) {
      const end = Math.round(M * o.ends[j]), torn = o.torn[j], fly = (o.fly || [])[j] || 0, last = end + fly, C = [], O = [], W = [], Th = [];
      for (let i = 0; i <= last; i++) {
        const k = Math.min(i, end), t = k / M, [Tn, Nn, Bn] = frames[k], R = G[k][3], th = o.phase + (TAU * j) / o.n + TAU * o.turns * Math.pow(t, o.ramp || 1), out = [0, 1, 2].map((q) => Nn[q] * Math.cos(th) + Bn[q] * Math.sin(th));
        const tip = torn ? 1 : Math.pow(clamp((last - i) / (M * 0.22), 0, 1), 0.7);   // a whole plank fines down to a point; a broken one keeps its girth to the break
        const step = H(G[Math.min(M, k + 1)][0] - G[k][0], G[Math.min(M, k + 1)][1] - G[k][1], G[Math.min(M, k + 1)][2] - G[k][2]) || 0.03;
        C.push([0, 1, 2].map((q) => G[k][q] + out[q] * R * o.out + Tn[q] * step * (i - k))); O.push(out); W.push(Math.max(0.012, R * o.wide * tip * (o.fat ? o.fat[j] : 1))); Th.push(Math.max(0.01, R * o.thick * (0.35 + 0.65 * tip)));
      }
      planks.push(plank({ C, O, W, T: Th, torn, notch: (o.notch || [])[j] }));
    }
    return (x, y, z) => { let d = 1e9; for (const f of planks) d = smin(d, f(x, y, z), o.weld || 0.03); return d; };
  }
  const both = (a, b) => (x, y, z) => smin(a(x, y, z), b(x, y, z), 0.03);
  const S = [
    // a straight bar, three planks, untwisted at the ground and wrung harder toward the top
    ['twist', wood([[-0.1, -0.06, 0, 0.3], [-0.03, 0.5, 0, 0.27], [0.03, 1.05, 0, 0.22], [0.1, 1.62, 0, 0.14]],
      { n: 3, turns: 1.5, ramp: 2, phase: 0.5, out: 0.5, wide: 0.8, thick: 0.34, ends: [1, 0.86, 0.94], torn: [0, 0.8, 0], notch: [[[0.5, 1, 0.05]], [], [[0.3, -1, 0.06]]] })],
    // a bar that turns hard. The plank on the outside of the turn does not take it: it runs straight on and snaps
    ['turn', wood([[-0.45, -0.06, 0, 0.3], [-0.42, 0.5, 0, 0.27], [-0.3, 1.0, 0, 0.24], [0.15, 1.2, 0, 0.2], [0.62, 0.95, 0, 0.15], [0.72, 0.55, 0, 0.08]],
      { n: 3, turns: 0.35, phase: 3.3, out: 0.5, wide: 0.8, thick: 0.34, ends: [0.42, 1, 0.9], torn: [1.3, 0, 0], fly: [9, 0, 0], notch: [[], [[0.6, 1, 0.06]], []] })],
    // two planks standing well off a post and going round it
    ['winding', both(wood([[0, -0.06, 0, 0.2], [0.04, 0.6, 0, 0.18], [-0.04, 1.2, 0, 0.14], [0, 1.7, 0, 0.07]], { n: 2, turns: 0.3, phase: 0, out: 0.3, wide: 0.75, thick: 0.4, ends: [1, 0.8], torn: [0, 1] }),
      wood([[0, -0.06, 0, 0.3], [0.04, 0.6, 0, 0.27], [-0.04, 1.2, 0, 0.2], [0, 1.6, 0, 0.12]], { n: 2, turns: 2.2, phase: 1.2, out: 0.95, wide: 0.5, thick: 0.34, ends: [0.95, 0.7], torn: [0, 1] }))],
    // all three in one line: it leans, turns back over itself and comes round to a point
    ['all three', wood([[0.1, -0.06, 0, 0.33], [0.2, 0.5, 0, 0.29], [0.52, 0.98, 0.08, 0.23], [0.4, 1.48, 0.16, 0.19], [-0.16, 1.5, 0.08, 0.16], [-0.44, 1.06, -0.08, 0.13], [-0.1, 0.8, -0.22, 0.1], [0.3, 0.98, -0.34, 0.06]],
      { n: 3, turns: 1.6, phase: 1.1, out: 0.48, wide: 0.82, thick: 0.36, ends: [1, 0.36, 0.72], torn: [0, 1.3, 0.8], fly: [0, 8, 0], notch: [[[0.35, -1, 0.06], [0.6, 1, 0.05]], [], []] })],
  ];
  window.Fantastic = { names: S.map((s) => s[0]), build: (i) => Fantastic.mesh(S[i][1], S[i][0], 0.0135, 1.9), mesh: Fantastic.mesh, kit: Fantastic.kit };
})();
