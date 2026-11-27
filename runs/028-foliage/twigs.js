// Branchlets, and the foliage that sits on them.
//
// The meshed branches are the CORE. Everything finer than them is flat: a branchlet is a ribbon, two-dimensional
// in section, that sprouts from a core branch, forks a couple of times, droops under itself and carries sprigs
// along its length. That is where the geometry budget goes -- a tree cannot afford tubes at this scale, and does
// not need them, because a twig seen against the sky is an edge and a silhouette, not a cylinder.
//
// This is the level that was missing. Plumes hung straight off the core tips floated free of the wood, because
// there was nothing between a thick horn and a leaf.
//
//   Twigs.build(tree, { from, every, len, fork, droop, sprigs, size, seed, R0 })
//
// Returns { stem, leaf }, each { pos, nrm, uv, col, idx, count }. Stems are untextured ribbons; leaves sample the
// sprig atlas. Wind rides in the colour channels of both -- R along the branchlet from its base, G a per-piece
// flutter, B a phase -- so a branchlet and the sprigs on it can sway together.
(function () {
  const H = Math.hypot;
  const unit = (v) => { const l = H(v[0], v[1], v[2]) || 1e-9; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const rng = (s) => { let x = s >>> 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; }; };

  function build(tree, opt) {
    const o = Object.assign({ from: 0.34, every: 0.07, len: 0.3, fork: 2, droop: 0.42, seg: 6,
      lean: 1.25, out: 0.4, hold: 0.55, wander: 0.1,
      orders: 3, kids: 2, shrink: 0.56, open: 1.5, distal: 2.2,
      sprigs: 4, size: 0.062, wide: 0.011, seed: 23, R0: 0.2 }, opt);
    const r = rng(o.seed * 374761393);

    // where a branchlet may sprout: along a core branch, once the wood is thin enough to carry one
    const seats = [];
    for (const s of tree.strands) {
      if (s.loop) continue; let since = 1e9;
      for (let k = Math.max(s.root, 1); k < s.K; k++) {
        const rho = s.rho[k]; if (rho > o.from * o.R0) { since = 1e9; continue; }
        const p = [s.X[k * 3], s.X[k * 3 + 1], s.X[k * 3 + 2]];
        const step = H(p[0] - s.X[k * 3 - 3], p[1] - s.X[k * 3 - 2], p[2] - s.X[k * 3 - 1]);
        since += step; if (since < o.every) continue; since = 0;
        // where along the branch: a tree carries its fine wood at the ends, not evenly down its length. Without
        // this every branch is furred along its whole run and the tree is a hairy hand.
        const tipness = (k - s.root) / Math.max(1, s.K - 1 - s.root);
        if (r() > Math.pow(tipness, o.distal)) continue;
        const q = [s.X[k * 3 - 3], s.X[k * 3 - 2], s.X[k * 3 - 1]];
        seats.push({ p, d: unit([p[0] - q[0], p[1] - q[1], p[2] - q[2]]), o: s.O[k] || [0, 1, 0],
          grow: Math.min(1, (1 - rho / (o.from * o.R0)) * 1.3 + 0.25) });
      }
    }
    const mid = [0, 0, 0]; for (const s of seats) for (let i = 0; i < 3; i++) mid[i] += s.p[i] / Math.max(1, seats.length);

    // grow one branchlet: a drooping path that forks. returns a list of segments as {a,b,t0,t1,wa,wb}
    const paths = [];
    const grow = (p0, d0, L, depth, t0) => {
      let p = p0.slice(), d = d0.slice();
      const n = o.seg, pts = [p.slice()];
      for (let i = 1; i <= n; i++) {
        const u = i / n;
        // it holds the line it set out on -- `hold` pulls back toward d0 every step -- so a branchlet reads as a
        // continuation of its branch and not as a wire stuck into it. Only droop and a little noise bend it.
        d = unit([0, 1, 2].map((c) => d[c] + o.hold * (d0[c] - d[c]) + (r() - 0.5) * o.wander - (c === 1 ? o.droop * u * 0.5 : 0)));
        p = [p[0] + d[0] * L / n, p[1] + d[1] * L / n, p[2] + d[2] * L / n];
        pts.push(p.slice());
      }
      paths.push({ pts, t0, t1: t0 + 1, depth });
      // The hierarchy. Each order is shorter than its parent and there are more of them, and they leave at a wider
      // angle, so the thing opens out toward its end instead of running on as one wire. That is the burst: little
      // at the base of a branchlet and a spray at the end of it.
      if (depth + 1 < o.orders) {
        const kids = depth === 0 ? o.kids : Math.max(1, o.kids - (r() < 0.35 ? 1 : 0));
        for (let c = 0; c < kids; c++) {
          const at = Math.max(1, Math.round(n * (0.45 + 0.5 * r())));
          const dd = unit([pts[Math.min(n, at)][0] - pts[at - 1][0], pts[Math.min(n, at)][1] - pts[at - 1][1], pts[Math.min(n, at)][2] - pts[at - 1][2]]);
          const side = unit(cross3(dd, Math.abs(dd[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
          const ph = (c / kids) * Math.PI * 2 + r() * 1.1;
          const wide = o.out * o.open * (0.7 + 0.6 * r());
          const away = unit([0, 1, 2].map((i) => dd[i] * 1.0 + (side[i] * Math.cos(ph) + cross3(dd, side)[i] * Math.sin(ph)) * wide));
          grow(pts[at], away, L * o.shrink * (0.85 + 0.3 * r()), depth + 1, t0 + at / n);
        }
      }
    };
    for (const s of seats) {
      if (r() > s.grow) continue;
      const side = unit(cross3(s.d, s.o));
      const ph = r() * Math.PI * 2;
      // along the branch first, out from it second: the trajectory of the core branch is what a branchlet obeys
      const out = unit([0, 1, 2].map((i) => s.d[i] * o.lean * (0.8 + 0.5 * r())
        + (s.o[i] * Math.cos(ph) + side[i] * Math.sin(ph)) * o.out * (0.6 + 0.8 * r())));
      grow(s.p, out, o.len * (0.7 + 0.6 * r()), 0, 0);
    }
    if (!paths.length) return { stem: null, leaf: null, twigs: 0, sprigs: 0 };

    // stems: a flat ribbon per path, its plane turned to face out of the canopy so a twig reads as an edge
    let sv = 0, si = 0;
    for (const pa of paths) sv += pa.pts.length * 2, si += (pa.pts.length - 1) * 6;
    const sp = new Float32Array(sv * 3), sn = new Float32Array(sv * 3), su = new Float32Array(sv * 2), sc = new Float32Array(sv * 3), sidx = new Uint32Array(si);
    let a = 0, b = 0;
    const leafAt = [];
    for (const pa of paths) {
      const base = a, N = pa.pts.length, flut = r(), phase = r();
      const away = unit([pa.pts[0][0] - mid[0], pa.pts[0][1] - mid[1] + 0.05, pa.pts[0][2] - mid[2]]);
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1);
        const t = unit(i < N - 1 ? [pa.pts[i + 1][0] - pa.pts[i][0], pa.pts[i + 1][1] - pa.pts[i][1], pa.pts[i + 1][2] - pa.pts[i][2]]
                                 : [pa.pts[i][0] - pa.pts[i - 1][0], pa.pts[i][1] - pa.pts[i - 1][1], pa.pts[i][2] - pa.pts[i - 1][2]]);
        let n = unit([0, 1, 2].map((j) => away[j] - t[j] * (away[0] * t[0] + away[1] * t[1] + away[2] * t[2])));
        const across = unit(cross3(t, n));
        const w = o.wide * (1 - 0.72 * u) * (pa.depth ? 0.6 : 1);
        for (let e = 0; e < 2; e++) {
          const sx = e ? 1 : -1;
          sp[a * 3] = pa.pts[i][0] + across[0] * w * sx; sp[a * 3 + 1] = pa.pts[i][1] + across[1] * w * sx; sp[a * 3 + 2] = pa.pts[i][2] + across[2] * w * sx;
          sn[a * 3] = n[0]; sn[a * 3 + 1] = n[1]; sn[a * 3 + 2] = n[2];
          su[a * 2] = e; su[a * 2 + 1] = u;
          sc[a * 3] = pa.t0 * 0.3 + u * 0.7; sc[a * 3 + 1] = flut; sc[a * 3 + 2] = phase;
          a++;
        }
        if (i < N - 1) { const q = base + i * 2;
          sidx[b++] = q; sidx[b++] = q + 1; sidx[b++] = q + 2;
          sidx[b++] = q + 1; sidx[b++] = q + 3; sidx[b++] = q + 2; }
        // sprigs sit along the branchlet, not at its tip, and alternate sides as leaves do
        // leaves ride the outer orders. An inner branchlet is structure; the mass belongs at the ends of it.
        const share = pa.depth >= o.orders - 1 ? 1 : pa.depth === 0 ? 0.12 : 0.45;
        if (i > 0 && i < N) for (let c = 0; c < o.sprigs; c++) if (r() < 0.5 * share)
          leafAt.push({ p: pa.pts[i], t, n, away, u, flut, phase, side: (c + i) % 2 ? 1 : -1, small: pa.depth < o.orders - 1 });
      }
    }

    // sprigs: a small card each, rolled about the branchlet and tipped out from it
    const nL = leafAt.length, lp = new Float32Array(nL * 12), ln = new Float32Array(nL * 12), lu = new Float32Array(nL * 8), lc = new Float32Array(nL * 12), lidx = new Uint32Array(nL * 6);
    let v = 0, ii = 0, made = 0;
    for (const L of leafAt) {
      const sz = o.size * (0.62 + 0.7 * r()) * (L.small ? 0.78 : 1);
      const roll = r() * Math.PI * 2;
      const u0 = unit(cross3(L.t, L.n)), v0 = L.n;
      const face = [0, 1, 2].map((i) => u0[i] * Math.cos(roll) + v0[i] * Math.sin(roll));
      const alongA = unit([0, 1, 2].map((i) => L.t[i] * 0.5 + face[i] * L.side * 1.1 - (i === 1 ? 0.35 : 0)));
      const across = unit(cross3(alongA, L.away));
      const cq = Math.floor(r() * 4), cu = (cq & 1) * 0.5, cv = (cq >> 1) * 0.5;
      for (let w = 0; w < 4; w++) {
        const sx = (w === 0 || w === 3) ? -1 : 1, sy = (w < 2) ? 0 : 1, k = v;
        for (let i = 0; i < 3; i++) {
          lp[k * 3 + i] = L.p[i] + alongA[i] * sz * 1.7 * sy + across[i] * sz * 0.85 * sx;
          ln[k * 3 + i] = unit([0, 1, 2].map((j) => L.away[j] * 0.7 + face[j] * 0.3))[i];
          lc[k * 3 + i] = i === 0 ? L.u : i === 1 ? L.flut : L.phase;
        }
        lu[k * 2] = cu + ((w === 0 || w === 3) ? 0 : 0.5); lu[k * 2 + 1] = cv + (sy ? 0.5 : 0);
        v++;
      }
      const o4 = made * 4;
      lidx[ii++] = o4; lidx[ii++] = o4 + 1; lidx[ii++] = o4 + 2;
      lidx[ii++] = o4; lidx[ii++] = o4 + 2; lidx[ii++] = o4 + 3;
      made++;
    }
    return {
      stem: { pos: sp, nrm: sn, uv: su, col: sc, idx: sidx.subarray(0, b) },
      leaf: { pos: lp, nrm: ln, uv: lu, col: lc, idx: lidx.subarray(0, ii) },
      twigs: paths.length, sprigs: made };
  }
  window.Twigs = { build };
})();
