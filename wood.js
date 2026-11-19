// Wood, as a material with one rule: every tip is the far end of a strand that began as a root.
// A wooden thing is a fixed number of strands. Where strands share a path they lie round it as a bundle
// and wind round it; a fork is the bundle parting in two, each part taking some of the strands; a strand
// left alone runs out to a point. So girth is never set anywhere: it is how many strands are passing.
// Each strand is a ribbon: flattened, with a crest along its outer face and a few grooves running its
// length, so that every turn of a bundle shows on its surface. At the ground the strands splay and lie flat.
// Wood also keeps a record. A stretch can fail and be left as a stub; a strand on the outside of a turn
// can refuse the turn, run straight on and snap into slivers; hollows are left where something was; and
// bark goes from thin and whole where the strand is young to thick, broken, lifting and swollen where it is old.
// Sculpted, not grown. The same recipe and seed always give the same thing.
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
    const P = Object.assign({ strands: 9, girth: 0.1, uneven: 0.6, height: 2.6, twist: 0.9, curl: 1.2, sway: 1, spread: 0.8, gap: 0.7, flare: 1, roots: 0.9, flat: 0.9, ridge: 0.9, grain: 0.8, taper: 0.7, lift: 0.5,
      fail: 0.45, splinter: 0.8, hollows: 0.7, bark: 0.8, seed: 1 }, recipe);
    const r = rng(P.seed), n = Math.max(1, Math.round(P.strands)), a0 = P.girth, ds = 0.03, reach = P.height * 1.25;
    const S = Array.from({ length: n }, () => ({ pts: [], out: [], rad: [], broken: 0, fat: 1 + P.uneven * (r() * 1.3 - 0.55) }));   // strands are not all one girth
    const girth = (D) => a0 * (1 - P.taper * Math.pow(Math.min(1, D / reach), 1.2));

    // one stretch of shared path: the strands in ids run along it together, then part in two.
    // A stub is a stretch that failed: it runs a short way, straight, and its strands snap off.
    function bundle(ids, p, h, nrm, tw, length, depth, D, carry, stub) {
      const m = ids.length, lone = m === 1, steps = Math.max(6, Math.round(length / ds)), sl = slots(m, ids.map((i) => S[i].fat)), last = new Map(), sway = P.sway * (0.7 + 0.6 * r());
      let axis = rot(nrm, h, r() * TAU); const k = P.curl * (0.4 + 0.9 * r()) * (r() < 0.5 ? -1 : 1) * (lone ? 2 : 1) * (stub ? 0.15 : 1);
      const stop = new Map(ids.map((id) => [id, stub ? Math.round(steps * (0.6 + 0.4 * r())) : steps]));   // the strands of a stub do not all snap at one length
      for (let s = carry ? 1 : 0; s <= steps; s++) {
        const f = s / steps;
        if (s) { h = unit(add(rot(h, axis, k * ds * Math.cos(PI * f * sway)), mul(UP, P.lift * ds * (lone || stub ? 0.2 : 0.7)))); nrm = perp(nrm, h); axis = perp(axis, h); p = add(p, mul(h, ds)); D += ds; tw += P.twist * TAU * ds / P.height * Math.pow(n / m, 0.35); }
        const bn = cross(h, nrm), a = girth(D) * (lone && !stub ? Math.pow(1 - f, 0.45) : 1), c = Math.cos(tw), sn = Math.sin(tw);
        // a bundle breathes: its strands stand apart in the middle of a stretch and close again at its ends
        const wide = (lone || stub ? 1 : 1 + P.gap * Math.sin(PI * f) ** 2 * (m > 2 ? 1 : 0.5)) * (depth ? 1 : 1 + P.flare * Math.exp(-f * length / (a0 * 5)));
        for (let j = 0; j < m; j++) {
          const id = ids[j]; if (s > stop.get(id)) continue;
          const ox = sl[j][0] * c - sl[j][1] * sn, oy = sl[j][0] * sn + sl[j][1] * c, face = add(mul(nrm, c), mul(bn, sn));
          let off = add(mul(nrm, ox * a * wide), mul(bn, oy * a * wide)), w = 1;
          if (carry) { w = sstep(0, 0.4, f); off = mix(carry.get(id), off, w); }   // ease from where it sat in the bundle it came from
          const o = H(off[0], off[1], off[2]) > 1e-5 ? unit(off) : face;
          S[id].pts.push(add(p, off)); S[id].out.push(lone ? unit(mix(o, face, w)) : o); S[id].rad.push(Math.max(0.0025, a * S[id].fat)); last.set(id, off);
        }
      }
      if (stub) { for (const id of ids) S[id].broken = stub; return; }
      if (lone) return;
      const d = rot(nrm, h, depth * GA + r() * 1.5), sp = P.spread * (0.6 + 0.6 * r()), u = r(); let mA = clamp(Math.round(m * (0.35 + 0.3 * r())), 1, m - 1);
      const order = ids.slice().sort((x, y) => dot(last.get(y), d) - dot(last.get(x), d));   // the strands on that side go that way
      // how a stretch ends. Mostly it parts in two and both parts live. Sometimes the lesser part fails and is
      // left as a stub. Sometimes the path turns and one strand on the outside of the turn does not: it runs
      // straight on a little way and snaps.
      const kind = m >= 3 && u < P.fail ? (u < P.fail * 0.55 ? 'overshoot' : 'failed') : 'fork';
      if (kind === 'overshoot') mA = 1; if (kind === 'failed') mA = Math.min(mA, Math.ceil(m / 3));
      for (const [grp, sgn] of [[order.slice(0, mA), 1], [order.slice(mA), -1]]) {
        const dead = kind !== 'fork' && sgn === 1;
        const turn = kind === 'overshoot' ? (dead ? 0 : sp * 0.9) : sp * 1.4 * (1 - grp.length / m);   // the smaller part turns away more
        const hc = unit(add(mul(h, Math.cos(turn)), mul(d, sgn * Math.sin(turn)))), nc = perp(nrm, hc), bc = cross(hc, nc);
        const ang = (id) => Math.atan2(dot(last.get(id), bc), dot(last.get(id), nc)); grp.sort((x, y) => ang(x) - ang(y));
        const s0 = slots(grp.length, grp.map((i) => S[i].fat))[0];
        const len = dead ? girth(D) * (kind === 'overshoot' ? 4 + 5 * r() : 3 + 4 * r()) : length * (kind === 'fork' ? 0.72 + 0.35 * r() : 0.9 + 0.2 * r()) * (grp.length === 1 ? 1.25 : 1);
        bundle(grp, p, hc, nc, grp.length > 1 ? ang(grp[0]) - Math.atan2(s0[1], s0[0]) : tw, len, depth + 1, D, last, dead ? (kind === 'overshoot' ? 1 : 0.45) : 0);
      }
    }
    const lean = rot(UP, [1, 0, 0], 0.25 * (r() - 0.5)), h0 = unit(rot(lean, UP, r() * TAU));
    bundle(S.map((_, i) => i), [0, a0 * 2.2, 0], h0, perp([1, 0, 0.3], h0), r() * TAU, P.height * 0.42, 0, 0, null, 0);

    // every strand began as a root: it comes in along the ground and rises into the bundle
    for (const s of S) {
      const p0 = s.pts[0], o0 = s.out[0], flatDir = H(o0[0], o0[2]) > 0.05 ? unit([o0[0], 0, o0[2]]) : [Math.cos(r() * TAU), 0, Math.sin(r() * TAU)];
      const len = P.roots * (0.45 + 0.75 * r()), steps = Math.max(4, Math.round(len / ds)), bend = (r() - 0.5) * 2.6, pts = [], out = [], rad = []; let q = p0;
      for (let i = 1; i <= steps; i++) {
        const g = i / steps, dir = rot(flatDir, UP, bend * g * g), a = s.rad[0] * Math.pow(1 - g, 0.75) + 0.0025;
        q = add(q, mul(dir, ds)); q = [q[0], p0[1] + (a * 0.55 - p0[1]) * sstep(0, 0.4, g), q[2]];
        pts.push(q); out.push(unit(mix(o0, UP, sstep(0, 0.3, g)))); rad.push(a);
      }
      s.root = steps; s.pts = pts.reverse().concat(s.pts); s.out = out.reverse().concat(s.out); s.rad = rad.reverse().concat(s.rad);
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
    // radius and facing are evened out along each strand, so nothing jumps where a root or a fork joins
    for (const s of S) for (let pass = 0; pass < 6; pass++) {
      s.rad = s.rad.map((a, k) => (k === 0 || k === s.rad.length - 1 ? a : 0.5 * a + 0.25 * (s.rad[k - 1] + s.rad[k + 1])));
      s.out = s.out.map((o, k) => (k === 0 || k === s.out.length - 1 ? o : unit(add(mul(o, 0.5), mul(add(s.out[k - 1], s.out[k + 1]), 0.25)))));
    }

    // each strand drawn as a ribbon: flattened, crested on its outer face, grooved along its length. On that
    // go the marks of what has happened to it: a snapped end, hollows, and bark.
    const c = a0 * 2.6, g = hash(c), pos = [], nrm = [], tone = [], idx = [];
    S.forEach((s, si) => {
      const K = s.pts.length, grooves = [1.5 + 0.5 * (r() - 0.5), -1.5 + 0.5 * (r() - 0.5), PI + 0.6 * (r() - 0.5)].map(wrap), hard = [0, ...grooves];
      // bark lies on the outer face in three bands that split along the grain. Each band is a run of plates.
      // Bark is oldest at the root: young bark is thin and whole, old bark thick, broken into short plates
      // with bare wood between, cracked across the grain as well, some lifting at an end, some swollen.
      const edges = [-1.35, -0.5, 0.42, 1.3].map((e) => { let v = e + 0.2 * (r() - 0.5); for (const x of hard) if (Math.abs(wrap(v - x)) < 0.14) v = x + (v < x ? -0.16 : 0.16); return v; });
      const bands = [0, 1, 2].map(() => { const th = new Float32Array(K), sw = new Float32Array(K); let k = Math.round(6 * r());
        while (P.bark > 0 && k < K - 4) { const age = P.bark * (1.15 - 0.9 * k / K), len = Math.max(5, Math.round((12 + 40 * r()) / (0.5 + 1.5 * age))), k1 = Math.min(K - 3, k + len), thick = (0.09 + 0.22 * age) * (0.8 + 0.5 * r()), lifts = r() < 0.6 * age, swells = r() < 0.35 * age, mid = (k + k1) / 2, crack = age > 0.5 ? 5 + Math.floor(6 * r()) : 0;
          for (let i = k; i <= k1; i++) { th[i] = thick * clamp(Math.min(i - k + 1, k1 - i + 1) / 2, 0, 1) * (1 + (lifts ? 2.2 * sstep(k1 - 7, k1 - 1, i) : 0)) * (crack && (i - k) % crack === crack - 1 ? 0.3 : 1); if (swells) sw[i] = thick * 2.4 * Math.max(0, 1 - ((i - mid) / 5) ** 2); }
          k = k1 + 1 + Math.round(age * age * (3 + 12 * r())); }
        return { th, sw }; });
      for (const e of edges) hard.push(e);
      // hollows: where something was and is gone. A sharp-rimmed pit, with the wood swollen round its rim.
      const pits = []; for (let i = Math.floor(P.hollows * (0.3 + 1.4 * r())); i > 0; i--) { const half = 5 + 6 * r(); pits.push({ k: s.root + 6 + r() * Math.max(1, K * 0.7 - s.root - 6), half, phi: 2.4 * (r() - 0.5), wid: 0.6 + 0.35 * r(), deep: 0.6 + 0.3 * r(), rim: 0.45 }); }
      // notches: short sharp cuts across the outer face
      for (let i = Math.floor(P.hollows * 2.5 * r()); i > 0; i--) pits.push({ k: s.root + r() * Math.max(1, K * 0.85 - s.root), half: 1.6, phi: 0.5 * (r() - 0.5), wid: 1, deep: 0.3 + 0.2 * r(), rim: 0 });
      // a snapped end: the strand keeps its girth to the break and ends in slivers of uneven length
      const span = s.broken ? s.rad[K - 1] * (2 + 6 * P.splinter * s.broken) : 0, nb = Math.min(K - 2, Math.round(span / ds)), sliv = [];
      if (s.broken) { const J = 4 + Math.floor(3 * r()), turn = r() * TAU; for (let j = 0; j < J; j++) sliv.push({ phi: wrap(turn + TAU * (j + 0.6 * (r() - 0.5)) / J), len: span * (j ? 0.2 + 0.8 * r() : 1), wid: 0.45 + 0.25 * r() }); }
      const angs = []; for (let i = 0; i < 20; i++) angs.push(-PI + TAU * i / 20);
      for (const a of [0.95, -0.95, ...grooves.flatMap((x) => [x - 0.24, x + 0.24]), ...pits.flatMap((q) => [q.phi, q.phi - q.wid * 0.7, q.phi + q.wid * 0.7, q.phi - q.wid, q.phi + q.wid, q.phi - q.wid * 1.35, q.phi + q.wid * 1.35]), ...sliv.flatMap((q) => [q.phi, q.phi - q.wid, q.phi + q.wid, q.phi - q.wid / 2, q.phi + q.wid / 2])]) angs.push(wrap(a));
      const soft = angs.filter((a) => hard.every((x) => Math.abs(wrap(a - x)) > 0.07)).sort((x, y) => x - y).filter((a, i, A) => !i || a - A[i - 1] > 0.04);
      // the ring of angles. The crest, each groove floor and each bark edge are counted twice, once for each
      // side, so the surface can turn sharply or step there.
      const ring = []; hard.slice().sort((x, y) => x - y).forEach((a) => ring.push([a, 0], [a, 1])); soft.forEach((a) => ring.push([a, 2])); ring.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
      const M = ring.length, base = pos.length / 3;
      const dip = (phi) => grooves.reduce((v, x) => Math.max(v, 1 - Math.abs(wrap(phi - x)) / 0.24), 0);
      for (let k = 0; k < K; k++) {
        const T = unit(sub(s.pts[Math.min(K - 1, k + 1)], s.pts[Math.max(0, k - 1)])), u = perp(s.out[k], T), w = cross(T, u), a = s.rad[k];
        let open = 9; near(g, c, s.pts[k], (j, l) => { if (j !== si) { const q = S[j].pts[l]; open = Math.min(open, H(s.pts[k][0] - q[0], s.pts[k][1] - q[1], s.pts[k][2] - q[2]) - S[j].rad[l] - a); } });
        for (let q = 0; q < M; q++) {
          const phi = ring[q][0] + (ring[q][1] === 0 ? -1e-3 : ring[q][1] === 1 ? 1e-3 : 0);
          let pit = 0, rim = 0; for (const o of pits) { const rho = H((k - o.k) / o.half, wrap(phi - o.phi) / o.wid); pit = Math.max(pit, o.deep * (1 - sstep(0.72, 1, rho))); rim = Math.max(rim, o.deep * o.rim * Math.max(0, 1 - Math.abs(rho - 1.15) / 0.3)); }
          let cover = 0; for (let b = 0; b < 3; b++) if (phi > edges[b] && phi < edges[b + 1]) cover = bands[b].th[k] + bands[b].sw[k] * Math.sin(PI * (phi - edges[b]) / (edges[b + 1] - edges[b])) ** 2;
          cover *= pit > 0 ? 0 : 1;
          let whole = 1; if (s.broken && k >= K - nb) { const far = (k - (K - nb)) * ds, left = sliv.reduce((v, o) => Math.max(v, o.len * Math.max(0, 1 - Math.abs(wrap(phi - o.phi)) / o.wid)), 0); whole = clamp((left - far) / (ds * 2.5), 0, 1); }
          const v = (1 + P.ridge * 0.6 * Math.max(0, 1 - Math.abs(phi) / 0.95) - P.grain * 0.3 * dip(phi) - pit + rim + cover) * whole;
          const x = Math.cos(phi) * (1 - 0.3 * P.flat) * v * a, y = Math.sin(phi) * (1 + 0.45 * P.flat) * v * a, pt = add(s.pts[k], add(mul(u, x), mul(w, y)));
          pos.push(pt[0], pt[1], pt[2]); nrm.push(0, 0, 0);
          // dark where strands crowd each other, in grooves and hollows, and against the ground; bare wood a shade under bark
          tone.push((0.45 + 0.55 * sstep(-0.5 * a, 1.1 * a, open + Math.max(0, x) * 1.1)) * (1 - 0.3 * P.grain * dip(phi)) * (0.72 + 0.28 * sstep(0, 0.14, pt[1])) * (1 - 0.6 * pit) * (P.bark > 0 && cover === 0 ? 0.84 : 1));
        }
      }
      const at = (k, q) => { const i = (base + k * M + q) * 3; return [pos[i], pos[i + 1], pos[i + 2]]; };
      for (let k = 0; k < K; k++) for (let q = 0; q < M; q++) {
        // a doubled angle takes its facing from its own side only
        const qa = ring[q][1] === 1 ? q : (q + M - 1) % M, qb = ring[q][1] === 0 ? q : (q + 1) % M;
        const cr = cross(sub(at(k, qb), at(k, qa)), sub(at(Math.min(K - 1, k + 1), q), at(Math.max(0, k - 1), q))); let nv = H(cr[0], cr[1], cr[2]) > 1e-12 ? unit(cr) : unit(s.out[k]); if (dot(nv, sub(at(k, q), s.pts[k])) < 0) nv = mul(nv, -1);
        const i = (base + k * M + q) * 3; nrm[i] = nv[0]; nrm[i + 1] = nv[1]; nrm[i + 2] = nv[2];
        if (k < K - 1) { const q2 = (q + 1) % M, A = base + k * M + q, B = base + k * M + q2, C = A + M, D = B + M; idx.push(A, B, D, A, D, C); }
      }
    });
    return { pos: Float32Array.from(pos), nrm: Float32Array.from(nrm), tone: Float32Array.from(tone), idx: Uint32Array.from(idx), strands: n, recipe: P };
  }

  const api = { grow };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Wood = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
