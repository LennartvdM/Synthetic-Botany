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
    const o = Object.assign({ from: 0.34, every: 0.055, len: 0.5, fork: 2, droop: 0.42, seg: 6,
      lean: 1.25, out: 0.4, hold: 0.55, wander: 0.1,
      orders: 3, kids: 3, shrink: 0.56, open: 1.5, distal: 2.2, sprout: 0.2, inner: 0.5,
      core: 0.75, cores: 2, bend: 0, ride: 0, long: 1, cant: 0.8, coreOn: 1, mid: null,
      sprigs: 3, size: 0.045, wide: 0.011, seed: 23, R0: 0.2,
      node: 1, turn: 0, pitch: 0.5, splay: 1.1, fall: 0.35, lie: 0, norm: 0.7 }, opt);
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
    // the middle of the canopy: cards turn their faces away from it. On a whole tree the seats give it; a bench
    // that grows one branchlet has to say where the rest of the tree would have been, or every card faces up.
    const mid = o.mid ? o.mid.slice() : [0, 0, 0];
    if (!o.mid) for (const s of seats) for (let i = 0; i < 3; i++) mid[i] += s.p[i] / Math.max(1, seats.length);

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
      paths.push({ pts, t0, t1: t0 + 1, depth, L });
      // The hierarchy. Each order is shorter than its parent and there are more of them, and they leave at a wider
      // angle, so the thing opens out toward its end instead of running on as one wire. That is the burst: little
      // at the base of a branchlet and a spray at the end of it.
      if (depth + 1 < o.orders) {
        const kids = depth === 0 ? o.kids : Math.max(1, o.kids - (r() < 0.35 ? 1 : 0));
        for (let c = 0; c < kids; c++) {
          // `sprout`: how far along its parent the earliest child may leave. Held late, every order leaves in
          // the outer half of the one before it, and the leaves end up in the last quarter of the system with
          // bare wire behind them -- a stick with a tuft on the end.
          const at = Math.max(1, Math.round(n * (o.sprout + (0.95 - o.sprout) * r())));
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
    // Two ribbons crossed at right angles, not one. A card may be flat because a leaf is flat; a twig is a line,
    // and a single ribbon seen edge-on is a hairline. A limb's worth of them edge-on at once is a hatched smear
    // across the canopy, which is what the close views kept showing.
    let sv = 0, si = 0;
    for (const pa of paths) sv += pa.pts.length * 4, si += (pa.pts.length - 1) * 12;
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
        for (let pl = 0; pl < 2; pl++) {
          const ax = pl ? n : across, nm = pl ? across : n;
          for (let e = 0; e < 2; e++) {
            const sx = e ? 1 : -1;
            sp[a * 3] = pa.pts[i][0] + ax[0] * w * sx; sp[a * 3 + 1] = pa.pts[i][1] + ax[1] * w * sx; sp[a * 3 + 2] = pa.pts[i][2] + ax[2] * w * sx;
            sn[a * 3] = nm[0]; sn[a * 3 + 1] = nm[1]; sn[a * 3 + 2] = nm[2];
            su[a * 2] = e; su[a * 2 + 1] = u;
            sc[a * 3] = pa.t0 * 0.3 + u * 0.7; sc[a * 3 + 1] = flut; sc[a * 3 + 2] = phase;
            a++;
          }
        }
        if (i < N - 1) for (let pl = 0; pl < 2; pl++) {
          const q = base + i * 4 + pl * 2, q2 = base + (i + 1) * 4 + pl * 2;
          sidx[b++] = q; sidx[b++] = q + 1; sidx[b++] = q2;
          sidx[b++] = q + 1; sidx[b++] = q2 + 1; sidx[b++] = q2; }
        // sprigs sit along the branchlet, not at its tip, and alternate sides as leaves do
        // leaves ride the outer orders. An inner branchlet is structure; the mass belongs at the ends of it.
        const share = pa.depth >= o.orders - 1 ? 1 : pa.depth === 0 ? o.inner : 0.45;
        // leaves sit at nodes along a twig, not evenly down every millimetre of it. `node` is how many steps
        // apart the nodes are, `turn` how far round the twig each node is turned from the last: 0 leaves it to
        // chance, 0.5 puts the leaves in two ranks, 0.382 winds them up the twig as most plants do.
        if (i > 0 && i % o.node === 0) { const nd = i / o.node;
          for (let c = 0; c < o.sprigs; c++) if (r() < 0.5 * share * o.node) {
            const roll = o.turn ? (nd * o.turn + c / o.sprigs) * Math.PI * 2 : r() * Math.PI * 2;
            leafAt.push({ p: pa.pts[i], t, n, away, u, flut, phase, roll, side: (c + i) % 2 ? 1 : -1, small: pa.depth < o.orders - 1 });
          } }
      }
    }

    // TIER ONE: the core. A few big cards with the dense plume cell, sitting inside each branchlet system where
    // its wood is thickest. They are the mass -- they block, they hold the silhouette, they give the canopy a
    // solid middle. Nothing finer can do that job: a sparse sprig blown up only reads as a bigger sparse sprig.
    const coreAt = [];
    for (const pa of paths) {
      // `coreOn`: the deepest order that carries a plume. Kept to the first order the mass sits inboard of
      // everything, on the one stretch of the system that has no leaves on it.
      if (pa.depth > o.coreOn) continue;
      const N = pa.pts.length;
      for (let c = 0; c < o.cores; c++) {
        const u = 0.35 + 0.42 * (c + r()) / o.cores, i = Math.min(N - 2, Math.max(1, Math.round(u * (N - 1))));
        const t = unit([pa.pts[i + 1][0] - pa.pts[i][0], pa.pts[i + 1][1] - pa.pts[i][1], pa.pts[i + 1][2] - pa.pts[i][2]]);
        const away = unit([pa.pts[i][0] - mid[0], pa.pts[i][1] - mid[1] + 0.05, pa.pts[i][2] - mid[2]]);
        coreAt.push({ p: pa.pts[i], t, away, u, L: pa.L });
      }
    }
    const COLS = o.bend > 0 ? 3 : 2, CV = COLS * 2, CI = (COLS - 1) * 6;
    const nC = coreAt.length, cp = new Float32Array(nC * CV * 3), cn = new Float32Array(nC * CV * 3), cuv = new Float32Array(nC * CV * 2), cc = new Float32Array(nC * CV * 3), cidx = new Uint32Array(nC * CI);
    let cv = 0, ci = 0, cm = 0;
    for (const C of coreAt) {
      // sized against the twig that carries it, not against the first order, so a plume on a child is a child's
      // plume and `core` means one thing wherever it is read
      const sz = C.L * o.core * (0.78 + 0.5 * r());
      const roll = r() * Math.PI * 2;
      const u0 = unit(cross3(C.t, C.away)), v0 = cross3(C.t, u0);
      const free = [0, 1, 2].map((i) => u0[i] * Math.cos(roll) + v0[i] * Math.sin(roll));
      // `ride`: how far the card's long axis is pulled onto the branchlet's own direction. At 0 it spins freely
      // and a plume is a disc stuck on a stick; at 1 the plume lies along the wood that carries it.
      const dt = C.t[0] * C.away[0] + C.t[1] * C.away[1] + C.t[2] * C.away[2];
      const flat = unit([0, 1, 2].map((i) => C.t[i] - C.away[i] * dt));
      const face = unit([0, 1, 2].map((i) => free[i] + (flat[i] - free[i]) * o.ride));
      // `cant`: how far a card is tilted off the direction out of the canopy. At 0 every card in the tier faces
      // the same way, and the tier is a pane of glass -- a mass from the front and a line from the side. Tilted,
      // the cards of one plume cross each other and the plume has a thickness. A plume is sheets, not a sheet.
      const per = unit(cross3(C.away, face)), ang = o.cant * (r() - 0.5) * 2;
      const out = unit([0, 1, 2].map((i) => C.away[i] * Math.cos(ang) + per[i] * Math.sin(ang)));
      // the card stands across the view out of the canopy, turned a little so the two on a branchlet do not align
      const across = unit(cross3(out, face)), upc = unit(cross3(across, out));
      const flut = r(), phase = r();
      const base = cv;
      for (let cx = 0; cx < COLS; cx++) {
        const fx = COLS === 2 ? (cx ? 1 : -1) : (cx - 1);        // -1, 0, 1 when bent
        const outAmt = o.bend * sz * (COLS === 3 && cx === 1 ? 1 : 0);
        for (let ry = 0; ry < 2; ry++) {
          const sy = ry ? 1 : -1, k = cv;
          for (let i = 0; i < 3; i++) {
            cp[k * 3 + i] = C.p[i] + across[i] * sz * 0.62 * fx + upc[i] * sz * 0.62 * o.long * sy + out[i] * (sz * 0.1 + outAmt);
            cn[k * 3 + i] = unit([0, 1, 2].map((j) => out[j] + across[j] * fx * o.bend * 0.8))[i];
            cc[k * 3 + i] = i === 0 ? C.u : i === 1 ? flut : phase;
          }
          cuv[k * 2] = (fx + 1) / (COLS === 2 ? 2 : 2); cuv[k * 2 + 1] = ry;
          cv++;
        }
      }
      // wound so the face looks OUT of the canopy. Wound the other way the card still draws -- it is
      // double-sided -- but every pixel of it shades with its normal flipped, against the ground instead of
      // the sky, and the whole blocker tier comes out grey while the garnish on top of it comes out white.
      for (let cx = 0; cx < COLS - 1; cx++) { const q = base + cx * 2;
        cidx[ci++] = q; cidx[ci++] = q + 3; cidx[ci++] = q + 2;
        cidx[ci++] = q; cidx[ci++] = q + 1; cidx[ci++] = q + 3; }
      cm++;
    }

    // TIER TWO: the garnish. Small sprigs on the branchlets, breaking the core's edge and giving it detail.
    const nL = leafAt.length, lp = new Float32Array(nL * 12), ln = new Float32Array(nL * 12), lu = new Float32Array(nL * 8), lc = new Float32Array(nL * 12), lidx = new Uint32Array(nL * 6);
    let v = 0, ii = 0, made = 0;
    for (const L of leafAt) {
      const sz = o.size * (0.62 + 0.7 * r()) * (L.small ? 0.78 : 1);
      const u0 = unit(cross3(L.t, L.n)), v0 = L.n;
      const face = [0, 1, 2].map((i) => u0[i] * Math.cos(L.roll) + v0[i] * Math.sin(L.roll));
      // where the sprig points: `pitch` along the twig it grew on, `splay` out from it, `fall` down under itself.
      const alongA = unit([0, 1, 2].map((i) => L.t[i] * o.pitch + face[i] * L.side * o.splay - (i === 1 ? o.fall : 0)));
      // which way its sheet is turned: at `lie` 0 it swings round to face out of the canopy, the flat billboard
      // of every game tree; at 1 it keeps the plane it is seated in, and shows its edge when the light is wrong.
      const outAx = unit(cross3(alongA, L.away));
      let ownAx = unit(cross3(alongA, face));
      if (ownAx[0] * outAx[0] + ownAx[1] * outAx[1] + ownAx[2] * outAx[2] < 0) ownAx = ownAx.map((q) => -q);
      const across = unit([0, 1, 2].map((i) => outAx[i] + (ownAx[i] - outAx[i]) * o.lie));
      let trueN = unit(cross3(alongA, across));
      if (trueN[0] * L.away[0] + trueN[1] * L.away[1] + trueN[2] * L.away[2] < 0) trueN = trueN.map((q) => -q);
      const cq = Math.floor(r() * 4), cu = (cq & 1) * 0.5, cv = (cq >> 1) * 0.5;
      for (let w = 0; w < 4; w++) {
        const sx = (w === 0 || w === 3) ? -1 : 1, sy = (w < 2) ? 0 : 1, k = v;
        for (let i = 0; i < 3; i++) {
          lp[k * 3 + i] = L.p[i] + alongA[i] * sz * 1.7 * sy + across[i] * sz * 0.85 * sx;
          ln[k * 3 + i] = unit([0, 1, 2].map((j) => trueN[j] + (L.away[j] - trueN[j]) * o.norm))[i];
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
      core: { pos: cp, nrm: cn, uv: cuv, col: cc, idx: cidx.subarray(0, ci) },
      leaf: { pos: lp, nrm: ln, uv: lu, col: lc, idx: lidx.subarray(0, ii) },
      twigs: paths.length, sprigs: made, cores: cm };
  }
  window.Twigs = { build };
})();
