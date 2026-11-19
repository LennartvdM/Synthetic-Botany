// Wood, as a material with one rule: every tip is the far end of a strand that began as a root.
// A wooden thing is a fixed number of strands. Where strands share a path they lie round it as a bundle
// and wind round it; a fork is the bundle parting in two, each part taking some of the strands; a strand
// left alone runs out to its tip. Each strand is a ribbon, flattened, with a crest along its outer face.
//
// Everything else is age. The thing is shown at a number of years, and nothing is put on it afterwards:
//   - A strand's tip moves outward year by year. What it has not reached yet is not there.
//   - A point on a strand is as thick as it is old. So girth is never set: the base is heavy because it
//     is old and has many strands passing, a tip is fine because it is new and alone.
//   - Bark is laid young, thin and whole. It cannot keep up with the wood thickening under it, so it
//     splits along the grain, and the furrows are widest where the wood is oldest. Old bark is thicker,
//     cracks across as well, and lifts at the cracks.
//   - A strand can die: its stretch fails young, or it refuses a turn, runs straight on and snaps, or it
//     simply dies late. From then it stops thickening while its neighbours go on, so it is left as a thin
//     sunken strip all the way down. It sheds its bark and its grain wears deeper. Its dead end is a crown
//     of slivers, which wears back year by year, and in the end is gone and leaves a hollow.
// Sculpted, not grown cell by cell. The same recipe and seed always give the same thing at every age.
// No dependencies. Works as a plain <script> (globalThis.Wood) and in Node.
(function (root) {
  'use strict';
  const H = Math.hypot, PI = Math.PI, TAU = PI * 2, GA = PI * (3 - Math.sqrt(5)), UP = [0, 1, 0];
  function rng(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a) => { const l = H(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }, mix = (a, b, t) => add(mul(a, 1 - t), mul(b, t));
  const rot = (v, k, t) => { const c = Math.cos(t), s = Math.sin(t), d = dot(k, v) * (1 - c), x = cross(k, v); return [v[0] * c + x[0] * s + k[0] * d, v[1] * c + x[1] * s + k[1] * d, v[2] * c + x[2] * s + k[2] * d]; };
  const perp = (v, h) => unit(sub(v, mul(h, dot(v, h)))), clamp = (x, a, b) => Math.max(a, Math.min(b, x)), sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const wrap = (a) => a - TAU * Math.round(a / TAU);

  // where strands sit round a shared path, in strand radii: a ring in which each takes room by its girth,
  // or two rings when there are many
  function slots(m, fat) {
    if (m === 1) return [[0, 0]];
    if (m === 2) return [[0.8 * fat[0], 0], [-0.8 * fat[1], 0]];
    if (m <= 8) { const sum = fat.reduce((a, b) => a + b, 0), rad = 0.84 * sum / PI; let at = 0; return fat.map((f) => { const a = TAU * (at + f / 2) / sum; at += f; return [rad * Math.cos(a), rad * Math.sin(a)]; }); }
    const ring = (k, rad, turn) => Array.from({ length: k }, (_, j) => [rad * Math.cos(TAU * j / k + turn), rad * Math.sin(TAU * j / k + turn)]);
    const inner = Math.floor(m / 3), ri = inner > 2 ? 0.84 / Math.sin(PI / inner) : 0.8;
    return ring(m - inner, Math.max(0.84 / Math.sin(PI / (m - inner)), ri + 1.6), 0).concat(ring(inner, ri, 0.4));
  }

  function grow(recipe) {
    const P = Object.assign({ age: 45, strands: 9, girth: 0.1, uneven: 0.6, height: 2.6, twist: 0.9, curl: 1.2, sway: 1, spread: 0.8, gap: 0.7, flare: 1, roots: 0.9, flat: 0.9, ridge: 0.9, grain: 0.8, lift: 0.5,
      fail: 0.3, splinter: 0.8, decay: 18, bark: 0.8, yield: 1.3, span: 40, seed: 1 }, recipe);
    const r = rng(P.seed), n = Math.max(1, Math.round(P.strands)), a0 = P.girth, ds = 0.03, reach = P.height * 1.25, fine = 0.012;
    const S = Array.from({ length: n }, () => ({ pts: [], out: [], born: [], died: Infinity, snap: 0, from: 0, fat: 1 + P.uneven * (r() * 1.3 - 0.55) }));   // strands are not all one girth
    const year = (D) => (D / reach) * P.span;                                                    // the year a tip gets this far along
    // how thick wood of that many years is: fast while young, slower and slower once it is old
    const thick = (y) => (y <= 0 ? fine : fine + (a0 - fine) * (y < P.span ? Math.pow(y / P.span, 0.6) : 1 + 0.28 * Math.log(y / P.span)));

    // one stretch of shared path: the strands in ids run along it together, then part in two.
    // A stub is a stretch that failed: it runs a short way, straight, and there its strands die.
    function bundle(ids, p, h, nrm, tw, length, depth, D, carry, stub) {
      const m = ids.length, lone = m === 1, steps = Math.max(6, Math.round(length / ds)), sl = slots(m, ids.map((i) => S[i].fat)), last = new Map(), sway = P.sway * (0.7 + 0.6 * r());
      let axis = rot(nrm, h, r() * TAU); const k = P.curl * (0.4 + 0.9 * r()) * (r() < 0.5 ? -1 : 1) * (lone ? 2 : 1) * (stub ? 0.15 : 1);
      const stop = new Map(ids.map((id) => [id, stub ? Math.round(steps * (0.6 + 0.4 * r())) : steps]));   // the strands of a stub do not all die at one length
      if (stub || lone) for (const id of ids) S[id].from = S[id].pts.length;
      for (let s = carry ? 1 : 0; s <= steps; s++) {
        const f = s / steps;
        if (s) { h = unit(add(rot(h, axis, k * ds * Math.cos(PI * f * sway)), mul(UP, P.lift * ds * (lone || stub ? 0.2 : 0.7)))); nrm = perp(nrm, h); axis = perp(axis, h); p = add(p, mul(h, ds)); D += ds; tw += P.twist * TAU * ds / P.height * Math.pow(n / m, 0.35); }
        const bn = cross(h, nrm), a = thick(P.age - year(D)), c = Math.cos(tw), sn = Math.sin(tw);   // strands sit as far apart as they are thick now
        // a bundle breathes: its strands stand apart in the middle of a stretch and close again at its ends
        const wide = (lone || stub ? 1 : 1 + P.gap * Math.sin(PI * f) ** 2 * (m > 2 ? 1 : 0.5)) * (depth ? 1 : 1 + P.flare * Math.exp(-f * length / (a0 * 5)));
        for (let j = 0; j < m; j++) {
          const id = ids[j]; if (s > stop.get(id)) continue;
          const ox = sl[j][0] * c - sl[j][1] * sn, oy = sl[j][0] * sn + sl[j][1] * c, face = add(mul(nrm, c), mul(bn, sn));
          let off = add(mul(nrm, ox * a * wide), mul(bn, oy * a * wide)), w = 1;
          if (carry) { w = sstep(0, 0.4, f); off = mix(carry.get(id), off, w); }   // ease from where it sat in the bundle it came from
          const o = H(off[0], off[1], off[2]) > 1e-5 ? unit(off) : face;
          S[id].pts.push(add(p, off)); S[id].out.push(lone ? unit(mix(o, face, w)) : o); S[id].born.push(year(D)); last.set(id, off);
          if (stub && s === stop.get(id)) { S[id].died = year(D); S[id].snap = stub; }
        }
      }
      if (stub || lone) return;
      const d = rot(nrm, h, depth * GA + r() * 1.5), sp = P.spread * (0.6 + 0.6 * r()), u = r(); let mA = clamp(Math.round(m * (0.35 + 0.3 * r())), 1, m - 1);
      const order = ids.slice().sort((x, y) => dot(last.get(y), d) - dot(last.get(x), d));   // the strands on that side go that way
      // how a stretch ends. Mostly it parts in two and both parts live. Sometimes the lesser part fails.
      // Sometimes the path turns and one strand on the outside of the turn does not: it runs straight on
      // a little way and snaps.
      const kind = m >= 3 && u < P.fail ? (u < P.fail * 0.55 ? 'overshoot' : 'failed') : 'fork';
      if (kind === 'overshoot') mA = 1; if (kind === 'failed') mA = Math.min(mA, Math.ceil(m / 3));
      for (const [grp, sgn] of [[order.slice(0, mA), 1], [order.slice(mA), -1]]) {
        const dead = kind !== 'fork' && sgn === 1;
        const turn = kind === 'overshoot' ? (dead ? 0 : sp * 0.9) : sp * 1.4 * (1 - grp.length / m);   // the smaller part turns away more
        const hc = unit(add(mul(h, Math.cos(turn)), mul(d, sgn * Math.sin(turn)))), nc = perp(nrm, hc), bc = cross(hc, nc);
        const ang = (id) => Math.atan2(dot(last.get(id), bc), dot(last.get(id), nc)); grp.sort((x, y) => ang(x) - ang(y));
        const s0 = slots(grp.length, grp.map((i) => S[i].fat))[0];
        const len = dead ? length * (kind === 'overshoot' ? 0.2 + 0.25 * r() : 0.15 + 0.5 * r()) : length * (kind === 'fork' ? 0.72 + 0.35 * r() : 0.9 + 0.2 * r()) * (grp.length === 1 ? 1.25 : 1);
        bundle(grp, p, hc, nc, grp.length > 1 ? ang(grp[0]) - Math.atan2(s0[1], s0[0]) : tw, len, depth + 1, D, last, dead ? (kind === 'overshoot' ? 1 : 0.5) : 0);
      }
    }
    const lean = rot(UP, [1, 0, 0], 0.25 * (r() - 0.5)), h0 = unit(rot(lean, UP, r() * TAU));
    bundle(S.map((_, i) => i), [0, a0 * 2.2, 0], h0, perp([1, 0, 0.3], h0), r() * TAU, P.height * 0.42, 0, 0, null, 0);
    // some strands that came through all that die late, of nothing in particular
    for (const s of S) { const u = r(), v = r(); if (s.died === Infinity && u < P.fail * 0.5) { s.died = P.span * (0.5 + 1.3 * v); s.snap = 0.7; } }

    // every strand began as a root: it runs out along the ground, further each year
    for (const s of S) {
      const p0 = s.pts[0], o0 = s.out[0], flatDir = H(o0[0], o0[2]) > 0.05 ? unit([o0[0], 0, o0[2]]) : [Math.cos(r() * TAU), 0, Math.sin(r() * TAU)];
      const len = P.roots * (0.45 + 0.75 * r()), steps = Math.max(4, Math.round(len / ds)), bend = (r() - 0.5) * 2.6, pts = [], out = [], born = []; let q = p0;
      for (let i = 1; i <= steps; i++) {
        const g = i / steps, dir = rot(flatDir, UP, bend * g * g), a = thick(P.age - g * P.span * 0.5) * s.fat;
        q = add(q, mul(dir, ds)); q = [q[0], p0[1] + (a * 0.55 - p0[1]) * sstep(0, 0.4, g), q[2]];
        pts.push(q); out.push(unit(mix(o0, UP, sstep(0, 0.3, g)))); born.push(g * P.span * 0.5);
      }
      s.from += steps; s.rootN = steps; s.pts = pts.reverse().concat(s.pts); s.out = out.reverse().concat(s.out); s.born = born.reverse().concat(s.born);
    }

    // the thing as it stands this year
    for (const s of S) {
      const end = Math.min(P.age, s.died); s.dead = P.age > s.died; s.yd = s.dead ? P.age - s.died : 0;
      let lo = 0, hi = s.pts.length - 1; while (lo < hi && s.born[lo] > end) lo++; while (hi > lo && s.born[hi] > end) hi--;   // what has not been reached yet is not there
      const from = clamp(s.from, lo, Math.max(lo, hi - 6)), worn = s.yd / P.decay; s.gone = worn >= 1; s.fresh = Math.max(0, 1 - worn);
      if (s.dead) hi = s.gone ? Math.min(hi, from + 3) : Math.round(from + (hi - from) * (1 - 0.65 * worn));   // a dead end wears back, and in the end is gone
      s.lo = lo; s.pts = s.pts.slice(lo, hi + 1); s.out = s.out.slice(lo, hi + 1); s.yrs = s.born.slice(lo, hi + 1).map((b) => Math.max(0, end - b)); s.rad = s.yrs.map((y) => thick(y) * s.fat);
      // a living end is always new wood, however old the strand: it fines down to its tip, above ground and below
      const top = s.pts.length - 1, rootEnd = Math.max(1, s.from - lo > top ? top : Math.min(top, Math.max(1, (s.rootN || 0) - lo)));
      s.rad = s.rad.map((a, k) => Math.max(0.0025, a * (s.dead ? 1 : Math.min(1, 0.06 + Math.pow((top - k) * ds / 0.9, 0.6))) * (k < rootEnd ? Math.min(1, 0.04 + Math.pow((k + 0.5) * ds / 0.7, 0.75)) : 1)));
    }

    // strands give way to each other, and each is kept fair
    const cellOf = (p, c) => (Math.floor(p[0] / c) + 512) * 1048576 + (Math.floor(p[1] / c) + 512) * 1024 + Math.floor(p[2] / c) + 512;
    const hash = (c) => { const g = new Map(); S.forEach((s, i) => s.pts.forEach((p, k) => { const key = cellOf(p, c), b = g.get(key); if (b) b.push(i, k); else g.set(key, [i, k]); })); return g; };
    const near = (g, c, p, fn) => { const x = Math.floor(p[0] / c), y = Math.floor(p[1] / c), z = Math.floor(p[2] / c); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let e = -1; e <= 1; e++) { const q = g.get((x + a + 512) * 1048576 + (y + b + 512) * 1024 + z + e + 512); if (q) for (let t = 0; t < q.length; t += 2) fn(q[t], q[t + 1]); } };
    for (let pass = 0; pass < 8; pass++) {
      const c = a0 * 2.4, g = hash(c), move = S.map((s) => s.pts.map(() => [0, 0, 0]));
      S.forEach((s, i) => s.pts.forEach((p, k) => near(g, c, p, (j, l) => { if (j === i) return; const q = S[j].pts[l], d = sub(p, q), dist = H(d[0], d[1], d[2]) || 1e-6, want = 0.8 * (s.rad[k] + S[j].rad[l]); if (dist < want) move[i][k] = add(move[i][k], mul(d, 0.25 * (want - dist) / dist)); })));
      S.forEach((s, i) => { s.pts = s.pts.map((p, k) => add(p, move[i][k])); s.pts = s.pts.map((p, k) => (k === 0 || k === s.pts.length - 1 ? p : add(mul(p, 0.5), mul(add(s.pts[k - 1], s.pts[k + 1]), 0.25)))); s.pts = s.pts.map((p, k) => [p[0], Math.max(p[1], s.rad[k] * 0.5), p[2]]); });
    }
    for (const s of S) for (let pass = 0; pass < 6; pass++) s.out = s.out.map((o, k) => (k === 0 || k === s.out.length - 1 ? o : unit(add(mul(o, 0.5), mul(add(s.out[k - 1], s.out[k + 1]), 0.25)))));

    // each strand drawn as a ribbon in four bands of bark with a furrow between each pair. A band's plate is
    // as wide as the bark still reaches; the furrow is the wood showing where it split.
    const c = a0 * 2.6, g = hash(c), pos = [], nrm = [], tone = [], idx = [];
    S.forEach((s, si) => {
      const q = rng(P.seed * 977 + si * 131 + 7), Kr = s.pts.length; if (Kr < 3) return;
      const K = Kr + (s.gone ? 3 : 0), B = [0.75, 2.15, TAU - 2.15, TAU - 0.75].map((b) => b + 0.24 * (q() - 0.5));
      const bands = [0, 1, 2, 3].map((b) => { const lo = b ? B[b - 1] : B[3] - TAU, hi = B[b], o = { mid: b ? (lo + hi) / 2 : 0, lo, hi, thick: 0.8 + 0.5 * q(), reach: 0.85 + 0.3 * q(), mul: new Float32Array(Kr).fill(1) };
        // bark cracks across the grain at places fixed from the start; each opens in its own year and widens after
        let at = 10 * q(); for (let i = 0; i < 60; i++) { const open = 4 + q() * P.span * 1.3; at += 7 + Math.floor(10 * q()); const k0 = Math.round(at) - s.lo; if (k0 < 6 || k0 >= Kr) continue; const since = s.yrs[k0] - open; if (since <= 0) continue;
          for (let k = k0 - 5; k < k0; k++) o.mul[k] *= 1 + 1.0 * Math.min(1, since / 15) * sstep(k0 - 6, k0 - 1, k);   // and the bark lifts toward it
          for (let k = k0; k < Math.min(Kr, k0 + 1 + Math.min(2, Math.floor(since / 12))); k++) o.mul[k] = 0.12; }
        return o; });
      const young = thick(3) * s.fat, span = s.dead && !s.gone ? s.rad[Kr - 1] * (2 + 6 * P.splinter * s.snap) * (0.35 + 0.65 * s.fresh) : 0, nb = Math.min(Kr - 2, Math.round(span / ds)), sliv = [];
      if (span) { const J = 4 + Math.floor(3 * q()), turn = q() * TAU; for (let j = 0; j < J; j++) sliv.push({ phi: turn + TAU * (j + 0.6 * (q() - 0.5)) / J, len: span * (j ? 0.2 + 0.8 * q() : 1), wid: 0.45 + 0.25 * q() }); }
      const base = pos.length / 3, M = 37, first = new Uint8Array(M), lastOf = new Uint8Array(M); let T, u, w;
      for (let k = 0; k < K; k++) {
        const kr = Math.min(k, Kr - 1), pit = k - kr, a = s.rad[kr], y = s.yrs[kr], old = Math.min(1, y / P.span);
        if (!pit) { T = unit(sub(s.pts[Math.min(Kr - 1, k + 1)], s.pts[Math.max(0, k - 1)])); u = perp(s.out[k], T); w = cross(T, u); }
        const mid = pit ? add(s.pts[kr], mul(T, -a * [0, 0.3, 0.9, 1.4][pit])) : s.pts[kr], shrink = [1, 0.7, 0.45, 0.12][pit];
        let open = 9; near(g, c, s.pts[kr], (j, l) => { if (j !== si) { const o = S[j].pts[l]; open = Math.min(open, H(s.pts[kr][0] - o[0], s.pts[kr][1] - o[1], s.pts[kr][2] - o[2]) - S[j].rad[l] - a); } });
        // how much of the round the bark still covers: all of it while young, less as the wood outgrows it, none once dead a while
        const cover = (a > young ? Math.pow(young / a, 0.6) * P.yield : 1) * (s.dead ? Math.max(0, 1 - s.yd / (P.decay * 0.5)) : 1), bare = P.bark <= 0 || cover < 0.05;
        const dipTo = P.grain * (0.1 + 0.12 * old + 0.3 * Math.min(1, s.yd / 15));   // furrows wear deeper in old wood, deeper still in dead
        const ring = []; const put = (phi, lev, b, t, f, l) => { first[ring.length] = f; lastOf[ring.length] = l; ring.push([phi, lev, b, t]); };
        for (let b = 0; b < 4; b++) {
          const o = bands[b], nx = bands[(b + 1) % 4], cv = clamp(cover * o.reach, 0.02, 0.94), cn = clamp(cover * nx.reach, 0.02, 0.94), lo = o.mid + (o.lo - o.mid) * cv, hi = o.mid + (o.hi - o.mid) * cv, nlo = nx.mid + (nx.lo - nx.mid) * cn + (b === 3 ? TAU : 0);
          put(lo, 1, b, -1, 1, 0); put((lo + o.mid) / 2, 1, b, -0.5, 0, 0);
          if (b) put(o.mid, 1, b, 0, 0, 0); else { put(0, 1, b, 0, 0, 1); put(0, 1, b, 0, 1, 0); }   // the crest is counted twice so the ribbon can turn sharply there
          put((o.mid + hi) / 2, 1, b, 0.5, 0, 0); put(hi, 1, b, 1, 0, 1); put(hi, 0, b, 0, 1, 0); put(o.hi, 2, b, 0, 0, 1); put(o.hi, 2, b, 0, 1, 0); put(nlo, 0, b, 0, 0, 1);
        }
        for (let i = 0; i < M; i++) {
          const [phi, lev, b, t] = ring[i], on = lev === 1 && !bare && !pit, skin = on ? P.bark * (0.05 + 0.22 * old) * bands[b].thick * bands[b].mul[kr] * (1 + 0.5 * old * (1 - t * t)) : 0;
          let whole = 1; if (span && k >= Kr - nb) { const far = (k - (Kr - nb)) * ds, left = sliv.reduce((v, o) => Math.max(v, o.len * Math.max(0, 1 - Math.abs(wrap(phi - o.phi)) / o.wid)), 0); whole = clamp((left - far) / (ds * 2.5), 0, 1); }
          const v = (1 + P.ridge * 0.6 * Math.max(0, 1 - Math.abs(wrap(phi)) / 0.95) - (lev === 2 ? dipTo : 0) + skin) * whole * shrink;
          const x = Math.cos(phi) * (1 - 0.3 * P.flat) * v * a, yy = Math.sin(phi) * (1 + 0.45 * P.flat) * v * a, pt = add(mid, add(mul(u, x), mul(w, yy)));
          pos.push(pt[0], pt[1], pt[2]); nrm.push(0, 0, 0);
          // dark where strands crowd each other, in furrows and hollows, and against the ground; bark a shade under bare wood
          tone.push((0.45 + 0.55 * sstep(-0.5 * a, 1.1 * a, open + Math.max(0, x) * 1.1)) * (0.72 + 0.28 * sstep(0, 0.14, pt[1])) * (lev === 2 ? 0.74 : on ? 0.86 : 1) * [1, 0.6, 0.4, 0.3][pit]);
        }
      }
      const at = (k, i) => { const j = (base + k * M + i) * 3; return [pos[j], pos[j + 1], pos[j + 2]]; };
      for (let k = 0; k < K; k++) for (let i = 0; i < M; i++) {
        // a vertex at an edge takes its facing from its own side only
        const ia = first[i] ? i : (i + M - 1) % M, ib = lastOf[i] ? i : (i + 1) % M, kr = Math.min(k, Kr - 1);
        const cr = cross(sub(at(k, ib), at(k, ia)), sub(at(Math.min(K - 1, k + 1), i), at(Math.max(0, k - 1), i))); let nv = H(cr[0], cr[1], cr[2]) > 1e-12 ? unit(cr) : unit(s.out[kr]); if (dot(nv, sub(at(k, i), s.pts[kr])) < 0 && k < Kr) nv = mul(nv, -1);
        const j = (base + k * M + i) * 3; nrm[j] = nv[0]; nrm[j + 1] = nv[1]; nrm[j + 2] = nv[2];
        if (k < K - 1) { const i2 = (i + 1) % M, A = base + k * M + i, Bq = base + k * M + i2, C = A + M, D = Bq + M; idx.push(A, Bq, D, A, D, C); }
      }
    });
    return { pos: Float32Array.from(pos), nrm: Float32Array.from(nrm), tone: Float32Array.from(tone), idx: Uint32Array.from(idx), strands: n, dead: S.filter((s) => s.dead).length, recipe: P };
  }

  const api = { grow };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Wood = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
