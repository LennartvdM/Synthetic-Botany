// Sketchbook, page 5. Wood again, after page 4 came out like something squeezed through a nozzle.
// Nothing here is swept or blended. A piece is a heap of shards laid along the grain: each shard has flat
// faces meeting at a ridge, starts somewhere and ends somewhere, and is a little too stiff for the line
// it follows, so on the outside of a bend or a twist its far end stands off. Between its ends a shard has a
// little give: it draws in or spreads, drifts and sinks. And its ridge and edges do not run true: they hold,
// lean, and jog to one side, at uneven intervals.
// Over that, in a few patches only, is a shell of the same wood: thin plates more rigid than what they sit
// on. Each has a direction: its back is sunk out of sight and its front lies on top, pointed, blunt or stepped.
// No plate passes through another: each is laid clear of those already there, cut back where it would meet one.
// Rarest of all, a band or a plate has split along the grain: a coarse gap, with one side lifted.
// A piece can hold an orb inside it (used from page 6 on): the wood swells to leave room round it, and parts to show it.
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
  // a line that wanders as it goes: it holds for a stretch, leans a little, then jogs to one side over a
  // short length and holds again. Stretches are of uneven length, longer on a wider band, so that a jog is
  // always a slant along the grain and never a step across it. Values lie between -1 and 1.
  function wander(len, r, wide) {
    const ks = [0], vs = [r() - 0.5]; let at = 0, v = vs[0];
    while (at < len) { at += wide * (0.8 + 1.9 * r()); v = clamp(v * 0.5 + (r() * 2 - 1), -1, 1); ks.push(at); vs.push(v); }
    return (x) => { let i = 0; while (i < ks.length - 2 && ks[i + 1] < x) i++; const t = clamp((x - ks[i]) / (ks[i + 1] - ks[i]), 0, 1); return lerp(vs[i], vs[i + 1], 0.25 * t + 0.75 * sstep(0.5, 1, t)); };
  }
  // one shard: a long piece with two flat faces meeting at a ridge, and a flat wall down each side.
  // C its line, O which way its ridge looks, W half-width, Hh ridge height. ridge: where across it the ridge runs;
  // eL, eR: how high its two edges stand; skew: how slanted its far end is cut.
  function shard(K) {
    const n = K.C.length, L = [0], Tv = K.C.map((c, i) => unit([0, 1, 2].map((k) => K.C[Math.min(n - 1, i + 1)][k] - K.C[Math.max(0, i - 1)][k])));
    for (let i = 1; i < n; i++) L.push(L[i - 1] + H(K.C[i][0] - K.C[i - 1][0], K.C[i][1] - K.C[i - 1][1], K.C[i][2] - K.C[i - 1][2]));
    const rw = rng(K.seed), wmax = Math.max(0.05, ...K.W), jog = wander(L[n - 1], rw, wmax), rjog = wander(L[n - 1], rw, wmax);   // its whole run wanders a little side to side, and its ridge wanders more
    const sp = K.split, sjog = sp ? wander(L[n - 1], rng(K.seed + 7), wmax * 0.5) : null;   // a split keeps to the grain, raggedly
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
      const along = dot(d3, T), pre = at <= 0 || at >= n - 1 ? along : 0, v = dot(d3, o), w = lerp(K.W[bi], K.W[bi + 1], bt), h = lerp(K.Hh[bi], K.Hh[bi + 1], bt), s = lerp(L[bi], L[bi + 1], bt) + pre, u = dot(d3, side) - jog(s) * 0.16 * K.wiggle * w;
      const xm = clamp(K.ridge + rjog(s) * 0.3 * K.wiggle, -0.85, 0.85) * w, yl = h * K.eL, yr = h * K.eR, lx = -(h - yl), ly = xm + w, rx = h - yr, ry = w - xm;
      // a split: the band has parted along the grain. There is a gap between the two sides, and one side has
      // lifted. Either it has opened from the band's front end and closes inward, or it gapes in the middle.
      let vv = v, gap = 0, cu = 0;
      if (sp && s > sp.s0 * L[n - 1] && s < sp.s1 * L[n - 1]) {
        const t = (s / L[n - 1] - sp.s0) / (sp.s1 - sp.s0), open = sp.fromEnd ? Math.pow(t, 0.8) : Math.pow(Math.sin(PI * t), 0.6);
        cu = clamp(sp.u + 0.25 * sjog(s), -0.6, 0.6) * w; gap = sp.wide * w * open; if (u > cu) vv = v - sp.lift * (h + K.deep) * open;
      }
      // inside all of: the two faces of the roof, the two side walls, a floor below, and the two ends. The front end
      // may be cut on the slant, or stepped: one side of it ending short of the other.
      const dp = K.D ? lerp(K.D[bi], K.D[bi + 1], bt) : K.deep;   // how far it goes down below its line: one depth, or one for each step of it
      const cut = K.skew * u + (K.step && (u - K.step.u * w) * K.step.side > 0 ? K.step.a : 0);
      // feather: toward one edge the piece thins, above and below, to a lip (a torn edge is drawn thin, not cut square)
      const thin = K.feather ? 1 - K.featherAmt * clamp(K.feather * u / w, 0, 1) : 1, roofH = u < xm ? yl + (u + w) * (h - yl) / (xm + w) : yr + (w - u) * (h - yr) / (w - xm), vf = vv + roofH * (1 - thin);
      let d = Math.max(((u + w) * lx + (vf - yl) * ly) / H(lx, ly), ((u - xm) * rx + (vf - h) * ry) / H(rx, ry), -u - w, u - w, -vv - dp * thin, -s, s - L[n - 1] + cut, pre ? -1 : Math.abs(along) - 0.03);   // and never out past a fold in its own line
      if (gap) d = Math.max(d, Math.min(gap - Math.abs(u - cu), v + sp.depth * K.deep));
      return d;
    };
    return { f, C: K.C, reach: K.C.map((c, i) => K.W[i] + K.Hh[i] + K.deep) };
  }
  // wood round a guide line that carries a girth. Two layers of shards on a hidden core: wide ones that give
  // the piece its bulk, and narrower, shorter ones lying on them.
  function wood(guide, o) {
    const M = 216, G = through(guide, M), frames = [], r = rng(o.seed || 1), r2 = rng((o.seed || 1) + 100), r3 = rng((o.seed || 1) + 200), r4 = rng((o.seed || 1) + 300), give = o.give === undefined ? 1 : o.give; let N = null;
    for (let i = 0; i <= M; i++) { const T = unit([0, 1, 2].map((k) => G[Math.min(M, i + 1)][k] - G[Math.max(0, i - 1)][k])); N = unit((N || [1, 0, 0.2]).map((v, k, A) => v - T[k] * dot(A, T))); frames.push([T, N, cross(T, N)]); }
    const all = []; let turns = o.turns;
    // splits are rarer than anything else here: one band of the inner wood has one, and two plates of the shell
    const splitAt = { band: Math.floor(6 * r4()), plates: [Math.floor(10 * r4()), Math.floor(10 * r4())] }; let plates = 0;
    // an orb held inside the piece (o.orb): a plain ball on the piece's own line, which does not bend for it.
    // Round the ball is a ball of room that the wood keeps clear. To leave that room the wood swells: every
    // band passing the orb is carried outward, far enough to clear the room with some wood to spare, and back
    // in again beyond it. And it opens: on one side the bands part and go round, leaving a window on the orb.
    const wrap = (a) => a - TAU * Math.round(a / TAU), eyes = []; let orb = null;
    if (o.orb) {
      const ic = Math.round(M * o.orb.at), c = G[ic].slice(0, 3), Rc = o.orb.r * (1 + o.orb.room), wall = o.orb.wall === undefined ? 0.07 : o.orb.wall, far = G.map((g) => H(g[0] - c[0], g[1] - c[1], g[2] - c[2]));
      orb = { c, r: o.orb.r, Rc, far, reach: 1.6 * Rc, out: (i) => (Rc + wall) * Math.pow(Math.cos(PI / 2 * Math.min(1, far[i] / (1.6 * Rc))), 0.8) };
      const [, Nn, Bn] = frames[ic], to = o.orb.toward || [0.43, 0.15, 0.9], step = H(G[ic + 1][0] - G[ic][0], G[ic + 1][1] - G[ic][1], G[ic + 1][2] - G[ic][2]);
      if (o.orb.window !== 0) eyes.push({ i: ic, th: Math.atan2(dot(Bn, to), dot(Nn, to)) - TAU * o.turns * Math.pow(ic / M, o.ramp || 1), a: o.orb.window || 0.75, l: Math.round(1.2 * Rc / step) });
    }
    const swell = (i, rad) => (orb ? H(rad, orb.out(i)) : rad);
    // a band that would pass through a window goes round it: it shifts to one side, and narrows a little as it squeezes past
    const eye = (th0, i, Wk, rad) => { let dth = 0;
      for (const e of eyes) { const di = (i - e.i) / e.l; if (Math.abs(di) >= 1) continue; const dq = wrap(th0 + dth - e.th), ab = Wk / rad, need = e.a * (1 - di * di) - (Math.abs(dq) - ab); if (need <= 0) continue;
        const less = Math.min(need / 2, 0.4 * ab); dth += (dq >= 0 ? 1 : -1) * (need - less); Wk -= less * rad; }
      return { dth, W: Wk }; };
    const lay = (i0, i1, th0, rho, wide, high, lift, point, stiff, P) => {
      const fine = (q) => Math.min(1, (1 - q) / point, i0 ? q / 0.3 : 1);
      const C = [], O = [], W = [], Hh = [], n = i1 - i0; let run = 0, straight = null, T0 = null;
      // a band is held in a few places far apart and has give between them: it draws in or spreads, drifts to
      // one side, and sinks. Nothing marks where it is held; the give is the only sign of it.
      const waves = Math.max(1, Math.round(n / 110)), skew = 0.75 + 0.6 * r2(), sign = () => (r2() < 0.5 ? -1 : 1) * (0.5 + 0.5 * r2()), draw = 0.3 * sign() * give, drift = 0.32 * sign() * give, sink = 0.28 * r2() * give;
      const bow = (q) => Math.sin(PI * waves * Math.pow(q, skew)) * Math.sin(PI * q) ** 0.5;
      for (let i = i0; i <= i1; i += 2) {
        const [Tn, Nn, Bn] = frames[i], R = G[i][3], q = (i - i0) / n, b = bow(q), rh = typeof rho === 'function' ? rho(q) : rho, rad = swell(i, R * (rh + lift * q * q)), ey = eye(th0, i, R * wide * (1 + draw * b) * fine(q), rad);
        const th = th0 + ey.dth + TAU * turns * Math.pow(i / M, o.ramp || 1), out = [0, 1, 2].map((k) => Nn[k] * Math.cos(th) + Bn[k] * Math.sin(th));
        const on = [0, 1, 2].map((k) => G[i][k] + out[k] * rad + (Bn[k] * Math.cos(th) - Nn[k] * Math.sin(th)) * R * wide * drift * b);
        if (!straight) { straight = on; T0 = unit([0, 1, 2].map((k) => Tn[k] + (Bn[k] * Math.cos(th) - Nn[k] * Math.sin(th)) * TAU * turns * rh * R * 0.5)); } else run += H(G[i][0] - G[i - 2][0], G[i][1] - G[i - 2][1], G[i][2] - G[i - 2][2]);
        // too stiff for its line: part way between following it and running straight on from where it began
        // and never more than about half a girth off it
        const off = [0, 1, 2].map((k) => straight[k] + T0[k] * run - on[k]), far = H(off[0], off[1], off[2]) || 1e-9, stay = Math.min(stiff * q * q, 0.55 * R / far), p = [0, 1, 2].map((k) => on[k] + off[k] * stay);
        C.push(p); O.push(out); W.push(Math.max(0.004, ey.W)); Hh.push(R * high * (1 - sink * Math.abs(b)) * (0.5 + 0.5 * fine(q)));
      }
      for (let pass = 0; pass < 4; pass++) for (let k = 1; k < C.length - 1; k++) C[k] = [0, 1, 2].map((q) => 0.5 * C[k][q] + 0.25 * (C[k - 1][q] + C[k + 1][q]));   // its line is kept fair
      if (C.length > 1) all.push(shard(Object.assign({ C, O, W, Hh, deep: G[i0][3] * 0.5, seed: 1 + Math.floor(r3() * 1e6), wiggle: o.wiggle === undefined ? 1 : o.wiggle }, P)));
    };
    // the wide ones: side by side all the way round, most from the ground up, ending at different heights
    const nA = o.wide || 6;
    for (let j = 0; j < nA; j++) lay(0, Math.round(M * (j % 3 === 0 ? 1 : 0.55 + 0.45 * r())), o.phase + TAU * (j + 0.4 * (r() - 0.5)) / nA, 0.56, 3.6 / nA * (0.85 + 0.3 * r()), 0.2 + 0.2 * r(), 0, 0.3, o.stiff * 0.3, { ridge: 0.7 * (r() - 0.5), eL: 0.2 + 0.5 * r(), eR: 0.2 + 0.5 * r(), skew: 1.5 * (r() - 0.5), split: j === splitAt.band && o.splits !== 0 ? { s0: 0.18 + 0.2 * r4(), s1: 0.62 + 0.25 * r4(), u: 0.5 * (r4() - 0.5), wide: 0.16 + 0.1 * r4(), lift: 0.12 + 0.1 * r4(), depth: 0.45 } : null });
    // the narrow ones: anywhere, any length, their far ends lifting
    for (let j = 0; j < (o.narrow || 14); j++) { const i0 = Math.round(M * 0.86 * r()), len = Math.round(M * (0.12 + 0.3 * r()));
      lay(i0, Math.min(M, i0 + len), TAU * r(), 0.7 + 0.1 * r(), 0.2 + 0.2 * r(), 0.14 + 0.14 * r(), o.lift * (0.4 + r()), 0.6, o.stiff, { ridge: 0.8 * (r() - 0.5), eL: 0.1 + 0.6 * r(), eR: 0.1 + 0.6 * r(), skew: 2 * (r() - 0.5) }); }
    // the shell: the same wood again, as plates, in a few patches and nowhere else. A plate is more rigid
    // than what it sits on, and it has a direction. Its back is sunk into the wood, deep enough that where it
    // ends cannot be seen. From there it comes up through the surface and its front lies on top, clear of
    // what is under it. Nearly all plates point the same way, back toward the foot of the piece and front
    // toward its tip; now and then one is the other way round. The front is not always a point: it may be cut
    // off blunt, or stepped, one side of it ending short of the other.
    const makePlate = (i0, i1, forward, th0, wide, high, ending, P) => {
      if (i1 - i0 < 10) return null;
      const on = [], outs = [], Rs = [], qs = [], Is = [];
      for (let i = forward ? i0 : i1; forward ? i <= i1 : i >= i0; i += forward ? 2 : -2) {   // from its back to its front
        const [, Nn, Bn] = frames[i], R = G[i][3], q = Math.abs(i - (forward ? i0 : i1)) / (i1 - i0), th = th0 + TAU * o.turns * Math.pow(i / M, o.ramp || 1), out = [0, 1, 2].map((k) => Nn[k] * Math.cos(th) + Bn[k] * Math.sin(th));
        const rho = 0.42 + 0.63 * sstep(0, 0.5, q) + 0.1 * q * q;
        on.push([0, 1, 2].map((k) => G[i][k] + out[k] * R * rho)); outs.push(out); Rs.push(R); qs.push(q); Is.push(i);
      }
      const n = on.length, km = clamp(Math.round(n * 0.62), 1, n - 2), Tm = unit([0, 1, 2].map((k) => on[km + 1][k] - on[km - 1][k])), arc = new Array(n).fill(0);
      for (let k = km + 1; k < n; k++) arc[k] = arc[k - 1] + H(on[k][0] - on[k - 1][0], on[k][1] - on[k - 1][1], on[k][2] - on[k - 1][2]);
      for (let k = km - 1; k >= 0; k--) arc[k] = arc[k + 1] - H(on[k][0] - on[k + 1][0], on[k][1] - on[k + 1][1], on[k][2] - on[k + 1][2]);
      const rigid = o.rigid === undefined ? 0.8 : o.rigid, C = [], O = [], W = [], Hh = [];
      for (let k = 0; k < n; k++) {
        // part way between lying on the piece and running dead straight, and never more than a third of a girth off
        const off = [0, 1, 2].map((q) => on[km][q] + Tm[q] * arc[k] - on[k][q]), far = H(off[0], off[1], off[2]) || 1e-9, stay = Math.min(rigid, 0.3 * Rs[k] / far);
        const front = ending === 'point' ? Math.pow(Math.min(1, (1 - qs[k]) / 0.3), 0.7) : 1, back = 0.55 + 0.45 * sstep(0, 0.35, qs[k]);
        C.push([0, 1, 2].map((q) => on[k][q] + off[q] * stay)); O.push(unit(mix(outs[k], outs[km], rigid))); W.push(Math.max(0.004, Rs[k] * wide * front * back)); Hh.push(Rs[k] * high * (0.5 + 0.5 * front) * (1 - 0.45 * qs[k] * qs[k]));   // thinner toward its front
      }
      const w1 = Rs[n - 1] * wide, r5 = rng(1 + Math.floor(r3() * 1e6));
      const end = ending === 'step' ? { skew: 0.4 * (r5() - 0.5), step: { u: 0.5 * (r5() - 0.5), side: r5() < 0.5 ? -1 : 1, a: w1 * (0.9 + 1.2 * r5()) } } : ending === 'blunt' ? { skew: (r5() < 0.5 ? -1 : 1) * (0.5 + 0.9 * r5()) } : { skew: 0 };   // a blunt front is cut on the slant, never square
      return Object.assign({ I: Is, C, O, W, Hh, deep: Rs[km] * 0.06, seed: 1 + Math.floor(r5() * 1e6), wiggle: o.wiggle === undefined ? 1 : o.wiggle }, P, end);
    };
    // plates give way to each other. A plate is laid only where it is clear of every plate laid before it.
    // Where it would run into one, it is cut back to its longest clear stretch and made again over that, with
    // its back sunk and its front raised as before; if too little is left, it is not laid at all. So no plate
    // ever passes through another. One may still lie over another's sunk back, with room between.
    const shell = [], laid = { whole: 0, cut: 0, none: 0 }, room = 0.015;
    const plate = (i0, i1, forward, th0, wide, high, ending, P) => {
      i0 = Math.max(0, i0 - (i0 % 2)); i1 = Math.min(M, i1 - (i1 % 2));
      for (let go = 0; go < 4; go++) {
        const K = makePlate(i0, i1, forward, th0, wide, high, ending, P); if (!K) break;
        const n = K.C.length, hit = new Uint8Array(n);
        for (let k = 0; k < n; k++) {
          if (orb && orb.far[K.I[k]] < orb.reach) { hit[k] = 1; continue; }   // the shell is rigid: it does not go over a swelling
          const T = unit([0, 1, 2].map((q) => K.C[Math.min(n - 1, k + 1)][q] - K.C[Math.max(0, k - 1)][q])), side = unit(cross(T, K.O[k])), up = cross(side, T);
          for (let a = -3; a <= 3 && !hit[k]; a++) for (const v of [0, K.Hh[k] * 0.6]) { const pt = [0, 1, 2].map((q) => K.C[k][q] + side[q] * K.W[k] * a * 0.31 + up[q] * v); if (shell.some((A) => A.f(pt[0], pt[1], pt[2]) < room)) { hit[k] = 1; break; } }
        }
        if (!hit.some((h) => h)) { const sh = shard(K); all.push(sh); shell.push(sh); laid[go ? 'cut' : 'whole']++; return; }
        let best = [0, -1], from = 0; for (let k = 0; k <= n; k++) if (k === n || hit[k]) { if (k - 1 - from > best[1] - best[0]) best = [from, k - 1]; from = k + 1; }
        const a = best[0] + (best[0] > 0 ? 1 : 0), b = best[1] - (best[1] < n - 1 ? 1 : 0); if (b - a < 6) break;   // and a little clear of where it would have met
        if (forward) { const z = i0; i0 = z + 2 * a; i1 = z + 2 * b; } else { const z = i1; i1 = z - 2 * a; i0 = z - 2 * b; }
      }
      laid.none++;
    };
    // a patch is one to three plates near each other, of unlike length and width, set off from each other along
    // the piece, with unlike fronts
    for (let j = 0; j < (o.patches === undefined ? 5 : o.patches); j++) {
      const mid = Math.round(M * (0.14 + 0.72 * r3())), half = Math.round(M * (0.08 + 0.09 * r3())), th = TAU * r3(), u = r3(), m = u < 0.25 ? 1 : u < 0.65 ? 2 : 3, forward = r3() < 0.9; let at = th - 0.3 * (m - 1);
      for (let k = 0; k < m; k++) {
        const wide = 0.2 + 0.24 * r3(), h2 = Math.round(half * (0.55 + 0.8 * r3())), c = mid + Math.round(M * 0.14 * (r3() - 0.5)), e = r3(), split = splitAt.plates.includes(plates++) && o.splits !== 0;
        plate(c - h2, c + h2, forward, at, wide, 0.08 + 0.05 * r3(), split ? 'blunt' : e < 0.3 ? 'point' : e < 0.62 ? 'blunt' : 'step', { ridge: 0.6 * (r3() - 0.5), eL: 0.5 + 0.4 * r3(), eR: 0.5 + 0.4 * r3(),
          split: split ? { fromEnd: true, s0: 0.42 + 0.2 * r4(), s1: 1.001, u: 0.4 * (r4() - 0.5), wide: 0.2 + 0.12 * r4(), lift: 0.5 + 0.5 * r4(), depth: 9 } : null });
        at += 0.36 + 0.5 * wide;
      }
    }
    // which shards are near which place, so that only those are asked
    const cell = 0.12, grid = new Map(), key = (x, y, z) => (x + 64) * 16384 + (y + 64) * 128 + z + 64;
    // a shard is entered only in the cells along its own line, not in every cell of the box round it
    all.forEach((s, i) => { const seen = new Set(); s.C.forEach((c, j) => { const m = s.reach[j] + 0.1;
      for (let x = Math.floor((c[0] - m) / cell); x <= Math.floor((c[0] + m) / cell); x++) for (let y = Math.floor((c[1] - m) / cell); y <= Math.floor((c[1] + m) / cell); y++) for (let z = Math.floor((c[2] - m) / cell); z <= Math.floor((c[2] + m) / cell); z++) { const k = key(x, y, z); if (seen.has(k)) continue; seen.add(k); const b = grid.get(k); if (b) b.push(i); else grid.set(k, [i]); } }); });
    const f = (x, y, z) => { const b = grid.get(key(Math.floor(x / cell), Math.floor(y / cell), Math.floor(z / cell))); let d = 0.1; if (b) for (const i of b) d = Math.min(d, all[i].f(x, y, z));   // joined hard: no blending anywhere
      return orb ? Math.max(d, orb.Rc - H(x - orb.c[0], y - orb.c[1], z - orb.c[2])) : d; };   // the room round an orb is kept clear
    f.orb = orb && { c: orb.c, r: orb.r, room: orb.Rc };
    return f;
  }
  const S = [
    ['twist', wood([[-0.1, -0.06, 0, 0.32], [-0.03, 0.5, 0, 0.29], [0.03, 1.05, 0, 0.24], [0.1, 1.62, 0, 0.15]], { seed: 1, turns: 1.3, ramp: 2, phase: 0.5, stiff: 0.5, lift: 0.25 })],
    ['turn', wood([[-0.45, -0.06, 0, 0.32], [-0.42, 0.5, 0, 0.29], [-0.3, 1.0, 0, 0.26], [0.15, 1.2, 0, 0.21], [0.62, 0.95, 0, 0.15], [0.72, 0.55, 0, 0.08]], { seed: 2, turns: 0.3, phase: 3.3, stiff: 0.5, lift: 0.25 })],
    ['winding', wood([[0, -0.06, 0, 0.3], [0.3, 0.4, 0.3, 0.27], [0, 0.8, 0.42, 0.24], [-0.3, 1.1, 0.1, 0.2], [0, 1.4, -0.2, 0.15], [0.25, 1.62, 0, 0.09]], { seed: 3, turns: 0.6, phase: 1.2, stiff: 0.45, lift: 0.25 })],
    ['all three', wood([[0.1, -0.06, 0, 0.34], [0.2, 0.5, 0, 0.3], [0.52, 0.98, 0.08, 0.24], [0.4, 1.48, 0.16, 0.2], [-0.16, 1.5, 0.08, 0.17], [-0.44, 1.06, -0.08, 0.14], [-0.1, 0.8, -0.22, 0.1], [0.3, 0.98, -0.34, 0.06]], { seed: 4, turns: 1.4, phase: 1.1, stiff: 0.45, lift: 0.25 })],
  ];
  window.Wood5 = { wood, shard };   // later pages build on this material
  window.Fantastic = { names: S.map((s) => s[0]), build: (i) => Fantastic.mesh(S[i][1], S[i][0], 0.0085, 1.9), mesh: Fantastic.mesh, kit: Fantastic.kit };
})();
