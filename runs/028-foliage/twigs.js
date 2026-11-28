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

  // The growth front. A sphere swelling from the foot of the tree: everything the clock drives reads its own
  // place from this, so the wood and the foliage share one front rather than each having its own.
  function front(tree) {
    const foot = [0, Infinity, 0]; let n = 0;
    for (const s of tree.strands) for (let k = 0; k < s.K; k++) {
      foot[0] += s.X[k * 3]; foot[2] += s.X[k * 3 + 2]; foot[1] = Math.min(foot[1], s.X[k * 3 + 1]); n++;
    }
    foot[0] /= Math.max(1, n); foot[2] /= Math.max(1, n);
    let scale = 1e-9;
    for (const s of tree.strands) for (let k = 0; k < s.K; k++)
      scale = Math.max(scale, H(s.X[k * 3] - foot[0], s.X[k * 3 + 1] - foot[1], s.X[k * 3 + 2] - foot[2]));
    return { foot, scale };
  }

  function build(tree, opt) {
    const o = Object.assign({ from: 0.34, every: 0.03, len: 0.5, fork: 2, droop: 0.42, seg: 6,
      lean: 1.25, out: 0.4, hold: 0.55, wander: 0.1,
      orders: 3, kids: 3, shrink: 0.56, open: 1.5, distal: 2.2, sprout: 0.2, inner: 0.5,
      core: 0.5, cores: 2, bend: 0, ride: 0, long: 1, cant: 0.8, coreOn: 2, mid: null,
      sprigs: 2, size: 0.056, wide: 0.0055, seed: 23, R0: 0.2,
      node: 1, turn: 0, pitch: 1.4, splay: 0.4, fall: 0.35, lie: 0, norm: 0.7, tuft: 2, light: 1, rim: 0.8, vary: 0.12, bunch: 0, wave: 0.72, tier: 0.14, shade: 0.62, curve: 1.1, span: 0.8, tuck: 0.26, sky: 0.56, skew: 1.3 }, opt);
    const r = rng(o.seed * 374761393);

    // where a branchlet may sprout: along a core branch, once the wood is thin enough to carry one
    const seats = [];
    for (const s of tree.strands) {
      if (s.loop) continue; let since = 1e9, gap = o.every;
      for (let k = Math.max(s.root, 1); k < s.K; k++) {
        const rho = s.rho[k]; if (rho > o.from * o.R0) { since = 1e9; continue; }
        const p = [s.X[k * 3], s.X[k * 3 + 1], s.X[k * 3 + 2]];
        const step = H(p[0] - s.X[k * 3 - 3], p[1] - s.X[k * 3 - 2], p[2] - s.X[k * 3 - 1]);
        // `bunch`: the chance the next gap is a short one, so branchlets come in clusters with bare wood
        // between rather than at a constant interval, which is a comb and not a branch. It works on a stub at
        // `every` 0.07 -- twos and threes with gaps -- and it is OFF, because at the seat density a crown wants
        // it cannot work at all. A gap shorter than the strand's own sample spacing is not shorter, and at
        // `every` 0.03 the gaps are ALREADY at that floor: the short gap cannot shorten, only the long gap can
        // lengthen, and the dial thins the crown by a quarter instead of clustering it. Clustering needs seats
        // that are not already as close as the wood can carry them.
        // Before that it was a heavy-tailed gap, which did not cluster either: powering a uniform draw by 3
        // gives a tail of only 2.2x the mean.
        // drawn ONCE when a seat is taken and held until the next, not redrawn every step: redrawn, the seat
        // fires on the smallest of a dozen draws and the dial reads as "more seats" whatever its shape.
        since += step; if (since < gap) continue;
        since = 0; gap = o.bunch ? (r() < o.bunch ? o.every * 0.2 : o.every * (1 + 1.7 * o.bunch)) : o.every;
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

    // How far out each seat is from the foot of the tree. Nothing in the form depends on it: it is the order in
    // which the foliage is DUE, for a growth that unfolds rather than appearing all at once. A spherical front
    // from the foot travels up and out, which is the order a tree's own growth would take if it took no time.
    // Measured from the foot over ALL the wood, not over the seats: the wood then occupies the first part of
    // the front and the foliage the last, and one clock drives both. Normalised over the seats alone the
    // foliage fills the whole clock and a tree with growing wood would finish its trunk and its leaves at once.
    {
      const F = front(tree);
      for (const st of seats) st.far = H(st.p[0] - F.foot[0], st.p[1] - F.foot[1], st.p[2] - F.foot[2]) / F.scale;
    }

    // How ENCLOSED each seat is by the rest of the foliage. This is the coherent half of the shading, and the
    // baked cells cannot supply it: every card carries the same ball of shade wherever it ends up, so two
    // cards side by side give two dark middles with a LIGHT seam between them -- and that seam is a crevice,
    // the one place that should be darkest. Shading that belongs to the card fights the volume.
    //
    // Depth from the crown's middle was tried first and does almost nothing, because `rim` has already culled
    // the inner seats: the crown IS a shell, and a shell-depth term on a shell is flat. What reads as volume
    // is local crowding -- a clump dark through its core and lighter at its edge, and darkest of all where two
    // clumps meet, which is what makes them read as two clumps and not one wall.
    if (seats.length > 2) {
      const rad = Math.max(1e-4, o.len * o.span), inv = 1 / rad, grid = new Map();
      const key = (p) => (Math.floor(p[0] * inv) * 73856093 ^ Math.floor(p[1] * inv) * 19349663 ^ Math.floor(p[2] * inv) * 83492791);
      seats.forEach((st, i) => { const k = key(st.p); const g = grid.get(k); if (g) g.push(i); else grid.set(k, [i]); });
      const dens = new Float64Array(seats.length);
      for (let i = 0; i < seats.length; i++) {
        const p = seats[i].p;
        for (let ax = -1; ax <= 1; ax++) for (let ay = -1; ay <= 1; ay++) for (let az = -1; az <= 1; az++) {
          const g = grid.get(key([p[0] + ax * rad, p[1] + ay * rad, p[2] + az * rad]));
          if (!g) continue;
          for (const j of g) {
            if (j === i) continue;
            const q = H(p[0] - seats[j].p[0], p[1] - seats[j].p[1], p[2] - seats[j].p[2]);
            if (q < rad) { const w = 1 - q * inv; dens[i] += w * w; }
          }
        }
      }
      // Stretched between two quantiles, not divided by one. Divided by a high quantile the least crowded
      // piece still comes out part-shaded, so the whole canopy darkens together and the spread stays narrow --
      // which is a canopy that is dimmer, not one with form in it. Between the quartile and the ninetieth, the
      // open quarter is fully lit and only the crowded end goes dark.
      const sorted = Array.from(dens).sort((x, y) => x - y), at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
      const lo = at(0.25), hi = Math.max(lo + 1e-6, at(0.9));
      for (let i = 0; i < seats.length; i++) seats[i].occ = Math.max(0, Math.min(1, (dens[i] - lo) / (hi - lo)));
    }

    // And the cue a canopy cannot do without, which needs no sun to know: down is down. The underside of a
    // crown is dark and its top is lit, and every piece in the tree agrees about which way that runs -- which
    // is what makes the whole mass read as one solid rather than as a swarm of separately shaded cards.
    let cy0 = Infinity, cy1 = -Infinity;
    for (const st of seats) { cy0 = Math.min(cy0, st.p[1]); cy1 = Math.max(cy1, st.p[1]); }
    const span2 = Math.max(1e-6, cy1 - cy0);
    const sky = (y) => 1 + o.sky * (Math.pow(Math.max(0, Math.min(1, (y - cy0) / span2)), o.skew) - 0.5);

    // Where the light is. Nothing above asks how deep in the crown a seat sits -- only how thick its wood is and
    // how near the end of its branch -- so wood thin enough at the bottom of the tree is furred like wood at the
    // top, and a tree carries foliage down to its root plate where it would long since have shed it.
    // `light` is how much of that falls to height within the crown, `rim` how much to distance from its middle.
    // Both read the crown the seats themselves describe, so nothing is placed: the shape of the lit region comes
    // out of where the wood went.
    if ((o.light || o.rim) && seats.length > 2) {
      let y0 = Infinity, y1 = -Infinity, rmax = 1e-9;
      for (const s of seats) {
        y0 = Math.min(y0, s.p[1]); y1 = Math.max(y1, s.p[1]);
        rmax = Math.max(rmax, H(s.p[0] - mid[0], 0, s.p[2] - mid[2]));
      }
      const keep = [];
      for (const s of seats) {
        const up = (s.p[1] - y0) / Math.max(1e-9, y1 - y0);
        const out = H(s.p[0] - mid[0], 0, s.p[2] - mid[2]) / rmax;
        const p = Math.pow(0.08 + 0.92 * up, o.light) * Math.pow(0.12 + 0.88 * out, o.rim);
        if (r() < p) keep.push(s);
      }
      seats.length = 0; for (const s of keep) seats.push(s);
    }

    // grow one branchlet: a drooping path that forks. returns a list of segments as {a,b,t0,t1,wa,wb}
    const paths = [];
    const grow = (p0, d0, L, depth, t0, far, occ) => {
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
      paths.push({ pts, t0, t1: t0 + 1, depth, L, far, occ });
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
          grow(pts[at], away, L * o.shrink * (0.85 + 0.3 * r()), depth + 1, t0 + at / n, far, occ);
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
      grow(s.p, out, o.len * (0.7 + 0.6 * r()), 0, 0, s.far || 0, s.occ || 0);
    }
    if (!paths.length) return { stem: null, leaf: null, twigs: 0, sprigs: 0 };

    // stems: a flat ribbon per path, its plane turned to face out of the canopy so a twig reads as an edge
    // Two ribbons crossed at right angles, not one. A card may be flat because a leaf is flat; a twig is a line,
    // and a single ribbon seen edge-on is a hairline. A limb's worth of them edge-on at once is a hatched smear
    // across the canopy, which is what the close views kept showing.
    let sv = 0, si = 0;
    for (const pa of paths) sv += pa.pts.length * 4, si += (pa.pts.length - 1) * 12;
    const sp = new Float32Array(sv * 3), sn = new Float32Array(sv * 3), su = new Float32Array(sv * 2), sc = new Float32Array(sv * 3), st = new Float32Array(sv * 3), sidx = new Uint32Array(si);
    // when each piece is due, what it swings from, and what it swings about
    const sb = new Float32Array(sv), svp = new Float32Array(sv * 3), sax = new Float32Array(sv * 3);
    // `wave` is how much of the order comes from the front travelling out of the tree and how much from the
    // branchlet's own inside-out. All of the first and none of the second is a tree that blinks on in rings.
    // `tier` holds the two sheets back behind the wood that carries them, so a branchlet draws itself first and
    // clothes itself after, rather than everything arriving at once in the same place.
    const due = (far, local, off) => far * o.wave + Math.min(1, local) * (1 - o.wave) + (off || 0) * o.tier;
    // `tuck`: how much darker a piece is for sitting INBOARD on its branchlet. This is the cue that was
    // missing. The tier split cannot carry the depth, because at this density the blocker is mostly hidden
    // behind the garnish and darkening it moves few pixels; what the eye sees is fronds, and they were all one
    // value. Every branchlet now runs dark at its inside to lit at its tips, and since every branchlet obeys
    // the same rule the clumps read as clumps -- a lit rim over a dark core, all of them turned the same way
    // out of the mass, which is what makes the combination read as volume rather than as scatter.
    // CENTRED on 1, not falling from it. A term that can only multiply down can only dim: it takes the lit
    // parts with it and the spread NARROWS, which is the opposite of shading. Measured on the renders, every
    // one-sided version lowered both the mean and the standard deviation against no shading at all. Centred,
    // the exposed pieces lift above 1 and the enclosed ones sink below, and the contrast is built rather than
    // spent. `lift` in the atlas drops the whole leaf palette to leave headroom for the lifting.
    const tuck = (local) => 1 + o.tuck * (Math.min(1, local) - 0.5);
    let a = 0, b = 0;
    const leafAt = [];
    for (const pa of paths) {
      // `vary`: one tone per branchlet, carried by its stem, its plumes and its sprigs alike. A canopy built
      // from one texture is one value everywhere however many cards are in it; a tone per branchlet gives it the
      // patchiness a crown has, and costs a vertex attribute rather than a second texture.
      const base = a, N = pa.pts.length, flut = r(), phase = r();
      const piv = pa.pts[0]; let ax0 = null;
      // centred, not one-sided: a tone drawn from [1 - vary, 1] only ever darkens, so the crown goes dimmer
      // rather than patchier, and a measure of its spread comes back saying the values narrowed.
      // the crown's own shade, times the branchlet's own tone. Every piece in a crowded part of the crown is
      // dark and every piece standing clear of its neighbours is lit, whatever its texture says, so the cards
      // reinforce one another into a mass instead of each reading as its own little ball.
      pa.tone = (1 + o.vary * (r() - 0.5)) * (1 + o.shade * (0.5 - Math.pow(pa.occ || 0, o.curve)));
      const away = unit([pa.pts[0][0] - mid[0], pa.pts[0][1] - mid[1] + 0.05, pa.pts[0][2] - mid[2]]);
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1);
        const t = unit(i < N - 1 ? [pa.pts[i + 1][0] - pa.pts[i][0], pa.pts[i + 1][1] - pa.pts[i][1], pa.pts[i + 1][2] - pa.pts[i][2]]
                                 : [pa.pts[i][0] - pa.pts[i - 1][0], pa.pts[i][1] - pa.pts[i - 1][1], pa.pts[i][2] - pa.pts[i - 1][2]]);
        let n = unit([0, 1, 2].map((j) => away[j] - t[j] * (away[0] * t[0] + away[1] * t[1] + away[2] * t[2])));
        const across = unit(cross3(t, n));
        const w = o.wide * (1 - 0.72 * u) * (pa.depth ? 0.6 : 1);
        if (!ax0) ax0 = across.slice();
        for (let pl = 0; pl < 2; pl++) {
          const ax = pl ? n : across, nm = pl ? across : n;
          for (let e = 0; e < 2; e++) {
            const sx = e ? 1 : -1;
            sp[a * 3] = pa.pts[i][0] + ax[0] * w * sx; sp[a * 3 + 1] = pa.pts[i][1] + ax[1] * w * sx; sp[a * 3 + 2] = pa.pts[i][2] + ax[2] * w * sx;
            sn[a * 3] = nm[0]; sn[a * 3 + 1] = nm[1]; sn[a * 3 + 2] = nm[2];
            su[a * 2] = e; su[a * 2 + 1] = u;
            sc[a * 3] = pa.t0 * 0.3 + u * 0.7; sc[a * 3 + 1] = flut; sc[a * 3 + 2] = phase;
            st[a * 3] = st[a * 3 + 1] = st[a * 3 + 2] = pa.tone * tuck((pa.t0 + u) / 2.2) * sky(pa.pts[i][1]);
            // a stem's own vertices are due in order along it, so it draws itself outward from its base rather
            // than appearing whole
            sb[a] = due(pa.far || 0, (pa.t0 + u) / 2.2);
            for (let j = 0; j < 3; j++) { svp[a * 3 + j] = piv[j]; sax[a * 3 + j] = (ax0 || across)[j]; }
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
            leafAt.push({ p: pa.pts[i], t, n, away, u, flut, phase, roll, tone: pa.tone, far: pa.far || 0, t0: pa.t0,
            side: (c + i) % 2 ? 1 : -1, small: pa.depth < o.orders - 1 });
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
        coreAt.push({ p: pa.pts[i], t, away, u, L: pa.L, tone: pa.tone, far: pa.far || 0, t0: pa.t0 });
      }
    }
    const COLS = o.bend > 0 ? 3 : 2, CV = COLS * 2, CI = (COLS - 1) * 6;
    const nC = coreAt.length, cp = new Float32Array(nC * CV * 3), cn = new Float32Array(nC * CV * 3), cuv = new Float32Array(nC * CV * 2), cc = new Float32Array(nC * CV * 3), ct = new Float32Array(nC * CV * 3), cidx = new Uint32Array(nC * CI);
    const cb = new Float32Array(nC * CV), cvp = new Float32Array(nC * CV * 3), cax = new Float32Array(nC * CV * 3);
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
            ct[k * 3 + i] = (C.tone === undefined ? 1 : C.tone) * tuck((C.t0 + C.u) / 2.2) * sky(C.p[1]);
            cvp[k * 3 + i] = C.p[i]; cax[k * 3 + i] = across[i];
          }
          cuv[k * 2] = (fx + 1) / (COLS === 2 ? 2 : 2); cuv[k * 2 + 1] = ry;
          cb[k] = due(C.far, (C.t0 + C.u) / 2.2, 0.55);
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
    // `tuft`: one card per sprig, or two crossed at right angles. One card is the cheap way and it disappears
    // edge-on, which is where a canopy shows its worst: the garnish thins out exactly on the branchlets whose
    // seats happen to face across the view, and the thinning moves as the camera does.
    const TU = Math.max(1, Math.round(o.tuft));
    const nL = leafAt.length, lp = new Float32Array(nL * TU * 12), ln = new Float32Array(nL * TU * 12), lu = new Float32Array(nL * TU * 8), lc = new Float32Array(nL * TU * 12), lt = new Float32Array(nL * TU * 12), lidx = new Uint32Array(nL * TU * 6);
    const lb = new Float32Array(nL * TU * 4), lvp = new Float32Array(nL * TU * 12), lax = new Float32Array(nL * TU * 12);
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
      // mirrored on half the cards, so four drawn cells read as eight. A frond is not symmetric about its rib
      // -- its leaflets skip and lean -- so its mirror is a different frond for nothing.
      const cq0 = Math.floor(r() * 4), cq1 = (cq0 + 1 + Math.floor(r() * 3)) % 4, mir = r() < 0.5;
      for (let c = 0; c < TU; c++) {
        // the second card takes a DIFFERENT cell of the atlas. Two copies of one frond crossed at a right angle
        // read as an asterisk wherever the pair is seen edge-on, because their midribs meet at a point and their
        // leaflets answer each other exactly.
        const cq = c ? cq1 : cq0, cu = (cq & 1) * 0.5, cv = (cq >> 1) * 0.5;
        // the second card keeps the sprig's length and turns its width onto the sheet's own normal
        const wide = c === 0 ? across : trueN, nrm = c === 0 ? trueN : across.map((q) => -q);
        for (let w = 0; w < 4; w++) {
          const sx = (w === 0 || w === 3) ? -1 : 1, sy = (w < 2) ? 0 : 1, k = v;
          for (let i = 0; i < 3; i++) {
            lp[k * 3 + i] = L.p[i] + alongA[i] * sz * 1.7 * sy + wide[i] * sz * 0.85 * sx;
            ln[k * 3 + i] = unit([0, 1, 2].map((j) => nrm[j] + (L.away[j] - nrm[j]) * o.norm))[i];
            lc[k * 3 + i] = i === 0 ? L.u : i === 1 ? L.flut : L.phase;
            lt[k * 3 + i] = (L.tone === undefined ? 1 : L.tone) * tuck((L.t0 + L.u) / 2.2) * sky(L.p[1]);
            lvp[k * 3 + i] = L.p[i]; lax[k * 3 + i] = wide[i];
          }
          lu[k * 2] = cu + (((w === 0 || w === 3) !== mir) ? 0 : 0.5); lu[k * 2 + 1] = cv + (sy ? 0.5 : 0);
          lb[k] = due(L.far === undefined ? 0 : L.far, (L.t0 === undefined ? 0 : L.t0 + L.u) / 2.2, 1);
          v++;
        }
        const o4 = (made * TU + c) * 4;
        lidx[ii++] = o4; lidx[ii++] = o4 + 1; lidx[ii++] = o4 + 2;
        lidx[ii++] = o4; lidx[ii++] = o4 + 2; lidx[ii++] = o4 + 3;
      }
      made++;
    }
    return {
      stem: { pos: sp, nrm: sn, uv: su, col: sc, tin: st, bir: sb, piv: svp, axs: sax, idx: sidx.subarray(0, b) },
      core: { pos: cp, nrm: cn, uv: cuv, col: cc, tin: ct, bir: cb, piv: cvp, axs: cax, idx: cidx.subarray(0, ci) },
      leaf: { pos: lp, nrm: ln, uv: lu, col: lc, tin: lt, bir: lb, piv: lvp, axs: lax, idx: lidx.subarray(0, ii) },
      twigs: paths.length, sprigs: made, cores: cm };
  }
  window.Twigs = { build, front };
})();
