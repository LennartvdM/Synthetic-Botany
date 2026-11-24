// Trees, as strands with an inside. A tree is a fixed number of fat strands and nothing else. Each strand
// begins as a root, goes up the trunk with the rest, leaves with some of them along a limb
// or carries on to the top, and ends in a point. Where strands share a way they are a bundle; a fork is the
// bundle parting. The trunk's and limbs' lines are given; where each strand lies is not. That is settled:
// every strand is anchored at the far end of its root and nowhere else, is pulled taut, resists bending, and
// gives way to every other strand, to the ground, and to an orb if the tree holds one. Only the bundle as
// a whole is kept on its line, and not where a limb leaves: a limb is held only along its far part. So
// whatever pushes or pulls a strand is felt all the way along it: there is tension, from the root's anchor to
// the strand's end, and a fork is strands drawn apart, not a branch set on a trunk.
// A strand pressed against an orb divides (see Splitting below); that is where fine strands come from.
// Nothing here has a surface. grow() returns where the strands go, how thick they are and which way each
// faces outward. No dependencies. Works as a plain <script> (globalThis.Trees) and in Node.
(function (root) {
  'use strict';
  const H = Math.hypot, PI = Math.PI, TAU = PI * 2, GA = PI * (3 - Math.sqrt(5)), UP = [0, 1, 0];
  function rng(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a) => { const l = H(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }, sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // a smooth line through a few given points, then stepped evenly along its length
  function line(C, ds) {
    const M = 240, pts = [];
    for (let i = 0; i <= M; i++) { const f = (i / M) * (C.length - 1), a = Math.min(C.length - 2, Math.floor(f)), t = f - a, p0 = C[Math.max(0, a - 1)], p1 = C[a], p2 = C[a + 1], p3 = C[Math.min(C.length - 1, a + 2)];
      pts.push(p1.map((_, k) => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t * t * t)), f); }
    const out = [pts[0]]; let need = ds;
    for (let i = 2; i < pts.length; i += 2) { const a = pts[i - 2], b = pts[i]; let len = H(b[0] - a[0], b[1] - a[1], b[2] - a[2]), at = 0; while (len - at >= need) { at += need; out.push(a.map((v, k) => v + (b[k] - v) * at / len)); need = ds; } need -= len - at; }
    return out;
  }
  // which way is "sideways" at every step of a line, carried along it without spinning
  function frames(P) { let N = null; return P.map((p, i) => { const T = unit([0, 1, 2].map((k) => P[Math.min(P.length - 1, i + 1)][k] - P[Math.max(0, i - 1)][k])); N = unit((N || [1, 0, 0.2]).map((v, k, A) => v - T[k] * dot(A, T))); return [T, N, cross(T, N)]; }); }

  function grow(recipe) {
    const P = Object.assign({ strands: 8, fill: 0.75, uneven: 0.5, twist: 0.5, taut: 0.3, stiff: 0.05, hug: 0.15, bind: 0.004, roots: 0.6, wind: 1.1, mixed: false, lmax: 0, clear: 1, settle: 0, giving: 0.75, passes: 1500, ds: 0.035, seed: 1, trunk: [[0, 0.14, 0, 0.27], [0, 1.6, 0, 0.1]], limbs: [], orb: null }, recipe);
    const r = rng(P.seed), n = P.strands, ds = P.ds, trunk = line(P.trunk, ds), nT = trunk.length, R0 = trunk[0][3], rho0 = R0 * Math.sqrt(P.fill / n), turn = (i) => P.twist * TAU * i / nT;
    // every strand has a place in the bundle's section, and a girth of its own (mixed: most thin, a few heavy)
    const S = Array.from({ length: n }, (_, j) => { const d = Math.sqrt((j + 0.5) / n), a = j * GA + 0.5 * (r() - 0.5); return { a: d * Math.cos(a), b: d * Math.sin(a), fat: P.mixed ? 0.35 + 1.9 * Math.pow(r(), 2.5) : 1 + P.uneven * (r() - 0.5), limb: -1, give: r() < P.giving ? 1 : 0.25 * r() }; });
    // limbs take their strands from the side of the bundle they leave on
    const tf = frames(trunk), limbs = P.limbs.map((L) => ({ L, fi: Math.round(L.at * (nT - 1)) })).sort((x, y) => x.fi - y.fi);
    for (const [li, lb] of limbs.entries()) {
      const fi = lb.fi, ctrl = [trunk[Math.max(0, fi - 14)], trunk[fi], ...lb.L.path.map((p) => [p[0], p[1], p[2], 0])], all = line(ctrl, ds), skip = all.findIndex((p) => H(p[0] - trunk[fi][0], p[1] - trunk[fi][1], p[2] - trunk[fi][2]) < ds * 0.8);
      const own = all.slice(Math.max(1, skip + 1)), count = Math.max(1, Math.round(lb.L.share * n)), Rl = trunk[fi][3] * Math.sqrt(count / n);
      own.forEach((p, i) => (p[3] = Rl * (1 - 0.45 * i / own.length)));   // a limb keeps most of its girth to its end
      const [, Nn, Bn] = tf[fi], d = unit([0, 1, 2].map((k) => own[Math.min(own.length - 1, 8)][k] - trunk[fi][k])), dn = dot(d, Nn), db = dot(d, Bn), c = Math.cos(turn(fi)), s = Math.sin(turn(fi));
      S.filter((q) => q.limb < 0).sort((x, y) => ((y.a * c - y.b * s) * dn + (y.a * s + y.b * c) * db) - ((x.a * c - x.b * s) * dn + (x.a * s + x.b * c) * db)).slice(0, count).forEach((q) => (q.limb = li));
      lb.path = trunk.slice(0, fi + 1).concat(own); lb.frames = frames(lb.path); lb.scale = trunk[fi][3] / R0;
    }
    // where a strand would lie if it had its bundle to itself: its place in the section of whoever shares its way there
    const group = (s, i) => (s.limb >= 0 && i > limbs[s.limb].fi ? S.filter((q) => q.limb === s.limb) : S.filter((q) => q.limb < 0 || limbs[q.limb].fi >= i)), seen = new Map();
    const place = (s, i) => { const g = group(s, i), k = g.map((q) => S.indexOf(q)).join(); let m = seen.get(k);
      if (!m) { const ca = g.reduce((v, q) => v + q.a, 0) / g.length, cb = g.reduce((v, q) => v + q.b, 0) / g.length; m = { ca, cb, ext: Math.max(1e-6, ...g.map((q) => H(q.a - ca, q.b - cb))) + 0.35 / Math.sqrt(g.length), n: g.length }; seen.set(k, m); }
      return [(s.a - m.ca) / m.ext, (s.b - m.cb) / m.ext, m.n]; };
    for (const s of S) {
      const path = s.limb >= 0 ? limbs[s.limb].path : trunk, fr = s.limb >= 0 ? limbs[s.limb].frames : tf, fi = s.limb >= 0 ? limbs[s.limb].fi : -1, own = path.length - 1 - Math.max(0, fi);
      const first = s === S.find((q) => q.limb === s.limb), u1 = r(), u2 = r(), u3 = r(); s.snapped = !first && u1 < 0.6;   // some strands snap short of the end, and keep their girth to the break
      const end = path.length - 1 - (first ? 0 : Math.round(own * (s.snapped ? 0.25 + 0.4 * u2 : 0.3 * u2))), fine = 0.12 + 0.2 * u3, X = [], rho = [], goal = [], hold = [];
      for (let i = 0; i <= end; i++) {
        const [u, v, m] = place(s, i), onLimb = fi >= 0 && i > fi, Rg = (onLimb ? path[i][3] : path[i][3] * Math.sqrt(m / n)) * 0.8, wind = turn(i) + (onLimb ? P.wind * TAU * (i - fi) / own : 0), c = Math.cos(wind), sn = Math.sin(wind), a = u * c - v * sn, b = u * sn + v * c, [, Nn, Bn] = fr[i];
        // (a limb's strands wind round each other as they go out)
        const tip = s.snapped ? 1 : Math.max(0.12, Math.pow(Math.min(1, (end - i) * ds / fine), 0.7));   // or it fines down to a point
        X.push([0, 1, 2].map((k) => path[i][k] + (Nn[k] * a + Bn[k] * b) * Rg)); goal.push(path[i].slice(0, 3)); hold.push(0);
        rho.push(rho0 * s.fat * tip * (onLimb ? limbs[s.limb].scale * (0.7 + 0.3 * path[i][3] / path[fi + 1][3]) : path[i][3] / R0));
      }
      // its root: the strand itself coming down from the foot of the trunk the way it faces there, heavy, and
      // most often going into the ground. A few stay on it and run out to a point.
      const p0 = X[0], away = H(p0[0] - trunk[0][0], p0[2] - trunk[0][2]) > 1e-4 ? unit([p0[0] - trunk[0][0], 0, p0[2] - trunk[0][2]]) : [1, 0, 0], len = P.roots * (0.5 + 0.5 * r()), Kr = Math.max(6, Math.round(len / ds)), bend = 2.6 * (r() - 0.5), dives = r() < 0.75, rx = [], rr = [], rg = []; let q = p0;
      for (let m = 1; m <= Kr; m++) { const g = m / Kr, t = bend * g * g, dir = [away[0] * Math.cos(t) - away[2] * Math.sin(t), 0, away[0] * Math.sin(t) + away[2] * Math.cos(t)], rad = rho[0] * (dives ? 0.5 + 0.5 * (1 - g) : 0.2 + 0.8 * Math.pow(1 - g, 0.8));
        q = [q[0] + dir[0] * ds, p0[1] + (rad * 0.6 - p0[1]) * sstep(0, 0.8, g) - (dives ? 0.35 * sstep(0.6, 1, g) : 0), q[2] + dir[2] * ds]; rx.push(q); rr.push(rad); rg.push(q); }
      s.root = Kr; s.K = Kr + X.length; const all = rx.reverse().concat(X), goals = rg.reverse().concat(goal);
      s.X = Float64Array.from(all.flat()); s.goal = Float64Array.from(goals.flat()); s.rho = Float64Array.from(rr.reverse().concat(rho)); s.hold = Float64Array.from(Array.from({ length: Kr }, (_, k) => (k < Kr * 0.45 ? 0.2 : 0)).concat(hold));   // anchored at the far end of its root, and nowhere else
      s.limbAt = fi; s.bend = P.stiff * Math.min(1.6, s.fat * s.fat);
    }
    // an orb held in the trunk: a ball, with room round it for the strands that are willing to give it
    let orb = null;
    if (P.orb) { const i = Math.round(P.orb.at * (nT - 1)), to = P.orb.toward || [0.43, 0.9], off = (P.orb.off || 0) * trunk[i][3], l = H(to[0], to[1]) || 1;
      orb = { c: [trunk[i][0] + to[0] / l * off, trunk[i][1], trunk[i][2] + to[1] / l * off], r: P.orb.r, room: P.orb.r * (1 + P.orb.room) }; }
    const rhoMax = Math.max(...S.map((s) => Math.max(...s.rho))), cell = rhoMax * 2.1;
    // a strand that has split off another is let out of it where the two join
    const kin = (i, k, j, l) => { const A = S[i], B = S[j]; let ch, m, pl; if (B.parent === i) { ch = B; m = l; pl = k; } else if (A.parent === j) { ch = A; m = k; pl = l; } else return false; return (m <= 3 || m >= ch.K - 4) && Math.abs(pl - (ch.po + m)) <= 3; };
    const each = (fn) => {   // every pair of points of unlike strands that are closer than their girths allow
      const g = new Map(); S.forEach((s, i) => { for (let k = 0; k < s.K; k++) { const q = (Math.floor(s.X[k * 3] / cell) + 512) * 1048576 + (Math.floor(s.X[k * 3 + 1] / cell) + 512) * 1024 + Math.floor(s.X[k * 3 + 2] / cell) + 512, b = g.get(q); if (b) b.push(i, k); else g.set(q, [i, k]); } });
      S.forEach((s, i) => { for (let k = 0; k < s.K; k++) { const x = s.X[k * 3], y = s.X[k * 3 + 1], z = s.X[k * 3 + 2], cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let e = -1; e <= 1; e++) { const q = g.get((cx + a + 512) * 1048576 + (cy + b + 512) * 1024 + cz + e + 512); if (!q) continue;
          for (let t = 0; t < q.length; t += 2) { const j = q[t]; if (j <= i) continue; const l = q[t + 1], o = S[j].X, dx = x - o[l * 3], dy = y - o[l * 3 + 1], dz = z - o[l * 3 + 2], d = H(dx, dy, dz), want = s.rho[k] + S[j].rho[l]; if (d < want && !kin(i, k, j, l)) fn(i, k, j, l, dx, dy, dz, d || 1e-9, want); } } } });
    };
    // which strands pass each step of the trunk and of each limb together
    const stations = new Map();
    S.forEach((s) => { for (let k = s.root; k < s.K; k++) { const i = k - s.root, key = (s.limbAt >= 0 && i > s.limbAt ? 'limb' + s.limb : 'trunk') + ':' + i; let st = stations.get(key); if (!st) { const onL = key[0] === 'l', lb = onL ? limbs[s.limb] : null;
        // a limb is held to its line only along its far part: how it gets there from the trunk is its strands' business.
        // And the trunk is let go where a limb leaves it, so the parting can pull it about.
        const h = onL ? sstep(0.35, 0.8, (i - lb.fi) / (lb.path.length - 1 - lb.fi)) : limbs.reduce((v, q) => v * (1 - 0.9 * Math.exp(-(((i - q.fi) / 9) ** 2))), 1);
        st = { goal: [s.goal[k * 3], s.goal[k * 3 + 1], s.goal[k * 3 + 2]], who: [], limb: onL, h }; stations.set(key, st); } st.who.push(s, k); } });
    const M = S.map((s) => new Float64Array(s.K * 3));
    S.forEach((s) => { s.parent = -1; s.press = 0; s.on = new Uint8Array(s.K); });
    // a split strand rejoins the one it split from at both its ends
    const joins = () => { for (const s of S) if (s.child) { const p = S[s.parent].X; for (const [e, k] of [[0, s.po], [s.K - 1, s.po + s.K - 1]]) for (let q = 0; q < 3; q++) s.X[e * 3 + q] = p[k * 3 + q]; } };
    // Splitting. A strand's girth is how much passes along it. One pressed against the orb long enough divides
    // lengthwise over the stretch where it is pressed: two of half the area, which part sideways over the orb and
    // rejoin beyond it. Either may divide again. So the most pressed end up the finest, and a fine strand is
    // what is left of a heavy one. (Run 012: this one rule gave thin strands over a body, forks, crossings,
    // and the thinnest nearest.)
    const SP = orb && P.orb.split ? Object.assign({ at: 0.5, every: 40, floor: 0.012, most: 160 }, P.orb.split === true ? {} : P.orb.split) : null; let forks = 0;
    const divide = (i) => { const s = S[i], n = s.K; let a = -1, b = -1; for (let k = Math.max(1, s.root); k < n - 1; k++) if (s.on[k]) { if (a < 0) a = k; b = k; } if (a < 0) return;
      const ka = Math.max(1, s.root, a - 6), kb = Math.min(n - 2, b + 6); if (kb - ka < 8) return; for (let k = ka; k <= kb; k++) if (s.rho[k] / Math.SQRT2 < SP.floor) return;
      const nc = kb - ka + 1, X = new Float64Array(nc * 3), rr = new Float64Array(nc);
      for (let m = 0; m < nc; m++) { const k = ka + m, p = [s.X[k * 3], s.X[k * 3 + 1], s.X[k * 3 + 2]], tg = [0, 1, 2].map((q) => s.X[(k + 1) * 3 + q] - s.X[(k - 1) * 3 + q]), side = unit(cross(tg, [p[0] - orb.c[0], p[1] - orb.c[1], p[2] - orb.c[2]]));
        const rn = s.rho[k] / Math.SQRT2, amt = rn * 0.7 * Math.sin(PI * m / (nc - 1)); for (let q = 0; q < 3; q++) { X[m * 3 + q] = p[q] + side[q] * amt; s.X[k * 3 + q] = p[q] - side[q] * amt; } s.rho[k] = rn; rr[m] = rn; }
      const mean = rr.reduce((v, x) => v + x, 0) / nc;
      S.push({ X, rho: rr, K: nc, root: 0, limb: -1, limbAt: -1, goal: Float64Array.from(X).fill(1), hold: new Float64Array(nc), bend: P.stiff * Math.min(1.6, (mean / rho0) ** 2), give: 1, fat: mean / rho0, snapped: false, child: true, parent: i, po: ka, press: 0, on: new Uint8Array(nc) });
      M.push(new Float64Array(nc * 3)); forks++; };
    for (let pass = 0; pass < P.passes; pass++) {
      const grown = orb ? (SP ? Math.min(1, pass / (P.passes * 0.6)) : 1) : 0;   // an orb that splits what holds it grows; otherwise it is simply there
      S.forEach((s, i) => { const X = s.X, m = M[i], K = s.K; m.fill(0);   // taut, stiff, and kept to its bundle's line
        for (let k = 0; k < K; k++) for (let q = 0; q < 3; q++) { const p = X[k * 3 + q]; let v = s.hold[k] * (s.goal[k * 3 + q] - p);
          if (k > 1 && k < K - 2) { const a = X[(k - 2) * 3 + q], b = X[(k - 1) * 3 + q], d = X[(k + 1) * 3 + q], e = X[(k + 2) * 3 + q]; v += P.taut * ((b + d) / 2 - p) - s.bend * (a - 4 * b + 6 * p - 4 * d + e); } m[k * 3 + q] = v; }
        for (let q = 0; q < K * 3; q++) X[q] += m[q]; });
      // stiffness by girth (lmax): a strand leaves the tree's line only gradually, over a stretch that rises with
      // its girth squared. A heavy strand pushed aside is pushed aside over a long way; a fine one just there.
      if (P.lmax) S.forEach((s, i) => { if (s.child) return; const X = s.X, m = M[i], K = s.K, g = s.goal;
        for (let st = 2; st * ds <= P.lmax * Math.min(1, (s.fat / 2.25) ** 2) && s.root + 2 * st < K; st *= 2) { m.fill(0);
          for (let k = s.root + st; k < K - st; k++) for (let q = 0; q < 3; q++) { const a = (k - st) * 3 + q, b = (k + st) * 3 + q, c = k * 3 + q; m[c] = P.taut * (((X[a] - g[a]) + (X[b] - g[b])) / 2 - (X[c] - g[c])); }
          for (let q = 0; q < K * 3; q++) X[q] += m[q]; } });
      joins();
      // the bundle as a whole is kept on its line: all the strands at a step are moved together, so the line holds
      // the tree's gesture without pulling any one strand back to where it began
      for (const st of stations.values()) { let cx = 0, cy = 0, cz = 0, w = 0; for (let t = 0; t < st.who.length; t += 2) { const o = st.who[t], k = st.who[t + 1], m = o.rho[k] ** 2; cx += o.X[k * 3] * m; cy += o.X[k * 3 + 1] * m; cz += o.X[k * 3 + 2] * m; w += m; }
        const dx = P.hug * st.h * (st.goal[0] - cx / w), dy = P.hug * st.h * (st.goal[1] - cy / w), dz = P.hug * st.h * (st.goal[2] - cz / w); for (let t = 0; t < st.who.length; t += 2) { const o = st.who[t], k = st.who[t + 1], b = k >= o.K - 5 ? 0.04 : st.limb ? P.bind * 8 : P.bind;   // a limb's few strands are bound closer, into a round   // each is bound to the bundle's middle, very lightly; its free end more, or it would wander off
          o.X[k * 3] += dx + b * (cx / w - o.X[k * 3]); o.X[k * 3 + 1] += dy + b * (cy / w - o.X[k * 3 + 1]); o.X[k * 3 + 2] += dz + b * (cz / w - o.X[k * 3 + 2]); } }
      for (let again = 0; again < P.clear; again++) { M.forEach((m) => m.fill(0));   // they give way to each other, the thinner one more (clear: how many times a pass)
      // (a strand lying on the orb holds its place: the other gives)
      each((i, k, j, l, dx, dy, dz, d, want) => { const ai = S[i].rho[k] * (S[i].on[k] ? 8 : 1), aj = S[j].rho[l] * (S[j].on[l] ? 8 : 1), f = 0.5 * (want - d) / d, wi = aj / (ai + aj), wj = ai / (ai + aj); M[i][k * 3] += dx * f * wi; M[i][k * 3 + 1] += dy * f * wi; M[i][k * 3 + 2] += dz * f * wi; M[j][l * 3] -= dx * f * wj; M[j][l * 3 + 1] -= dy * f * wj; M[j][l * 3 + 2] -= dz * f * wj; });
      S.forEach((s, i) => { for (let q = 0; q < s.K * 3; q++) s.X[q] += M[i][q]; }); }
      for (const s of S) for (let k = 0; k < s.K; k++) {   // to the orb, each as far as it is willing; and to the ground
        if (orb) { const keep = (orb.r + (orb.room - orb.r) * s.give) * grown + s.rho[k], dx = s.X[k * 3] - orb.c[0], dy = s.X[k * 3 + 1] - orb.c[1], dz = s.X[k * 3 + 2] - orb.c[2], d = H(dx, dy, dz) || 1e-9; s.on[k] = d < keep + 0.004 ? 1 : 0; if (d < keep) { s.press += keep - d; const f = keep / d; s.X[k * 3] = orb.c[0] + dx * f; s.X[k * 3 + 1] = orb.c[1] + dy * f; s.X[k * 3 + 2] = orb.c[2] + dz * f; } }
        if (s.goal[k * 3 + 1] > 0 && s.X[k * 3 + 1] < s.rho[k] * 0.6) s.X[k * 3 + 1] = s.rho[k] * 0.6; }   // but a root that dives is let through
      joins();
      if (SP && pass % SP.every === 0) { const cand = S.map((s, i) => [s.press, i]).filter((q) => q[0] > SP.at).sort((a, b) => b[0] - a[0]); for (const [, i] of cand) { if (S.length >= SP.most) break; divide(i); } for (const s of S) s.press = 0; }
    }
    // last, the strands are cleared of each other: the same giving way and keeping off, with nothing pulling them
    // together any more. What tension pressed into each other comes apart.
    for (let pass = 0, grown = orb ? 1 : 0; pass < P.settle; pass++) {
      { M.forEach((m) => m.fill(0));   // they give way to each other, the thinner one more (clear: how many times a pass)
      // (a strand lying on the orb holds its place: the other gives)
      each((i, k, j, l, dx, dy, dz, d, want) => { const ai = S[i].rho[k] * (S[i].on[k] ? 8 : 1), aj = S[j].rho[l] * (S[j].on[l] ? 8 : 1), f = 0.5 * (want - d) / d, wi = aj / (ai + aj), wj = ai / (ai + aj); M[i][k * 3] += dx * f * wi; M[i][k * 3 + 1] += dy * f * wi; M[i][k * 3 + 2] += dz * f * wi; M[j][l * 3] -= dx * f * wj; M[j][l * 3 + 1] -= dy * f * wj; M[j][l * 3 + 2] -= dz * f * wj; });
      S.forEach((s, i) => { for (let q = 0; q < s.K * 3; q++) s.X[q] += M[i][q]; }); }
      for (const s of S) for (let k = 0; k < s.K; k++) {   // to the orb, each as far as it is willing; and to the ground
        if (orb) { const keep = (orb.r + (orb.room - orb.r) * s.give) * grown + s.rho[k], dx = s.X[k * 3] - orb.c[0], dy = s.X[k * 3 + 1] - orb.c[1], dz = s.X[k * 3 + 2] - orb.c[2], d = H(dx, dy, dz) || 1e-9; s.on[k] = d < keep + 0.004 ? 1 : 0; if (d < keep) { const f = keep / d; s.X[k * 3] = orb.c[0] + dx * f; s.X[k * 3 + 1] = orb.c[1] + dy * f; s.X[k * 3 + 2] = orb.c[2] + dz * f; } }
        if (s.goal[k * 3 + 1] > 0 && s.X[k * 3 + 1] < s.rho[k] * 0.6) s.X[k * 3 + 1] = s.rho[k] * 0.6; }   // but a root that dives is let through
      joins();
    }
    // which way each strand faces outward: away from the middle of whatever wood is round it
    const big = R0 * 1.3, g = new Map(), kk = (x, y, z) => (Math.floor(x / big) + 512) * 1048576 + (Math.floor(y / big) + 512) * 1024 + Math.floor(z / big) + 512;
    S.forEach((s) => { for (let k = 0; k < s.K; k++) { const q = kk(s.X[k * 3], s.X[k * 3 + 1], s.X[k * 3 + 2]), b = g.get(q); if (b) b.push(s, k); else g.set(q, [s, k]); } });
    for (const s of S) { s.O = []; s.F = []; let last = [1, 0, 0];
      for (let k = 0; k < s.K; k++) { const x = s.X[k * 3], y = s.X[k * 3 + 1], z = s.X[k * 3 + 2]; let cx = 0, cy = 0, cz = 0, w = 0;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let e = -1; e <= 1; e++) { const q = g.get(kk(x + a * big, y + b * big, z + e * big)); if (!q) continue; for (let t = 0; t < q.length; t += 2) { const o = q[t], l = q[t + 1], dx = o.X[l * 3] - x, dy = o.X[l * 3 + 1] - y, dz = o.X[l * 3 + 2] - z; if (dx * dx + dy * dy + dz * dz < big * big) { const m = o.rho[l] ** 2; cx += dx * m; cy += dy * m; cz += dz * m; w += m; } } }
        let o = [-cx / w, -cy / w, -cz / w]; s.F.push(H(o[0], o[1], o[2])); if (H(o[0], o[1], o[2]) < 0.25 * s.rho[k]) o = last; o = unit(o); if (orb) { const rx = x - orb.c[0], ry = y - orb.c[1], rz = z - orb.c[2], rd = H(rx, ry, rz) || 1, w = 1 - sstep(1.15, 1.7, rd / orb.room); o = unit([o[0] * (1 - w) + rx / rd * w, o[1] * (1 - w) + ry / rd * w, o[2] * (1 - w) + rz / rd * w]); }   // near an orb it faces away from the orb
        if (k < s.root) { const t = sstep(0, 0.7, 1 - k / s.root); o = unit([o[0] * (1 - t), o[1] * (1 - t) + t, o[2] * (1 - t)]); } s.O.push(o); last = o; }
      for (let pass = 0; pass < 8; pass++) s.O = s.O.map((o, k) => (k === 0 || k === s.K - 1 ? o : unit([0, 1, 2].map((q) => 0.5 * o[q] + 0.25 * (s.O[k - 1][q] + s.O[k + 1][q])))));
    }
    // (where a split strand joins the one it came from the two are one, so those places are not counted)
    let worst = 0, over = 0, pairs = 0; each((i, k, j, l, dx, dy, dz, d, want) => { if ((S[i].child && (k < 6 || k >= S[i].K - 6)) || (S[j].child && (l < 6 || l >= S[j].K - 6))) return; const v = (want - d) / want; worst = Math.max(worst, v); pairs++; if (v > 0.15) over++; });
    return { strands: S.map((s) => ({ X: s.X, rho: s.rho, O: s.O, far: s.F, K: s.K, root: s.root, limb: s.limb, give: s.give, snapped: s.snapped, vine: !!s.child })), orb, measure: { worstOverlap: worst, touching: pairs, overlapping: over, forks, strands: S.length }, recipe: P };
  }

  const api = { grow };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Trees = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
