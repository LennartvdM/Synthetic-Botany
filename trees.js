// Trees, as strands with an inside. A tree is a fixed number of fat strands and nothing else. Each strand
// begins as a root, goes up the trunk with the rest, leaves with some of them along a limb
// or carries on to the top, and ends in a point. Where strands share a way they are a bundle; a fork is the
// bundle parting. A limb may leave a limb, so the lines are a graph; they are given, or grown by sprout() at
// the foot of this file. Where each strand lies is not given. That is settled:
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
    const P = Object.assign({ strands: 8, fill: 0.75, uneven: 0.5, twist: 0.5, taut: 0.3, stiff: 0.05, hug: 0.15, bind: 0.004, roots: 0.6, wind: 1.1, mixed: false, lmax: 0, set: 0, swell: 1, clear: 1, settle: 0, giving: 0.75, passes: 1500, ds: 0.035, seed: 1, trunk: [[0, 0.14, 0, 0.27], [0, 1.6, 0, 0.1]], limbs: [], orb: null }, recipe);
    const r = rng(P.seed), n = P.strands, ds = P.ds, trunk = line(P.trunk, ds), nT = trunk.length, R0 = trunk[0][3], rho0 = R0 * Math.sqrt(P.fill / n), turn = (i) => P.twist * TAU * i / nT;
    // every strand has a place in the bundle's section, and a girth of its own (mixed: most thin, a few heavy)
    const S = Array.from({ length: n }, (_, j) => { const d = Math.sqrt((j + 0.5) / n), a = j * GA + 0.5 * (r() - 0.5); return { a: d * Math.cos(a), b: d * Math.sin(a), fat: P.mixed ? 0.35 + 1.9 * Math.pow(r(), 2.5) : 1 + P.uneven * (r() - 0.5), limb: -1, give: r() < P.giving ? 1 : 0.25 * r() }; });
    // Limbs. A limb leaves the trunk, or another limb (its own `limbs`), part way along it (`at`), and takes its
    // strands (`share` of all, or `count`) from the side of the bundle it leaves on. So the tree is a graph: every
    // strand goes from its root up the trunk, out along one limb after another, and ends on the last.
    const tf = frames(trunk), limbs = [];
    const lay = (Ls, parent) => { for (const L of Ls || []) {
      const base = parent ? parent.path : trunk, from = parent ? parent.fi : 0, fi = Math.min(base.length - 2, Math.max(from + (parent ? 1 : 0), from + Math.round(L.at * (base.length - 1 - from))));
      const ctrl = [base[Math.max(0, fi - 14)], base[fi], ...L.path.map((p) => [p[0], p[1], p[2], 0])], all = line(ctrl, ds), skip = all.findIndex((p) => H(p[0] - base[fi][0], p[1] - base[fi][1], p[2] - base[fi][2]) < ds * 0.8);
      // (a snapped shoot is cut short here: a fresh stub is longer than it is wide, a knot's is nearly flush, a hollow's is only a direction)
      const want = Math.max(1, L.count || Math.round(L.share * n)), Re = base[fi][3] * Math.sqrt(want / (parent ? parent.want : n)), keep = L.stub ? Math.max(2, Math.round((0.75 * base[fi][3] + (L.stub === 'fresh' ? 1.6 * Re + 0.05 : L.stub === 'knot' ? 0.25 * Re + 0.02 : 0.07)) / ds)) : Infinity;   // (measured from where it comes out of the wood it leaves, not from that wood's middle)
      const own = all.slice(Math.max(1, skip + 1)).slice(0, keep), lb = { L, fi, parent, own, base, want };
      lb.path = base.slice(0, fi + 1).concat(own); limbs.push(lb); lay(L.limbs, lb); } };
    lay(P.limbs, null); limbs.sort((x, y) => x.fi - y.fi); limbs.forEach((lb, li) => (lb.i = li));
    // how far round the bundle has wound by a step of the way out to a limb (li: -1 is the trunk)
    const chain = (li) => { const c = []; for (let q = li >= 0 ? limbs[li] : null; q; q = q.parent) c.unshift(q); return c; };
    const windAt = (li, i) => { const c = chain(li); let w = turn(i); for (let e = 0; e < c.length; e++) if (i > c[e].fi) w += P.wind * TAU * (Math.min(i, e + 1 < c.length ? c[e + 1].fi : Infinity) - c[e].fi) / (c[e].path.length - 1 - c[e].fi); return w; };
    for (const lb of limbs) {
      const fi = lb.fi, base = lb.base, own = lb.own, from = S.filter((q) => q.limb === (lb.parent ? lb.parent.i : -1)), count = Math.max(1, Math.min(lb.want, from.length - (lb.parent ? 1 : 0))), Rl = base[fi][3] * Math.sqrt(count / (lb.parent ? lb.parent.count : n));
      own.forEach((p, i) => (p[3] = Rl * (1 - 0.45 * i / own.length)));   // a limb keeps most of its girth to its end
      const [, Nn, Bn] = (lb.parent ? lb.parent.frames : tf)[fi], d = unit([0, 1, 2].map((k) => own[Math.min(own.length - 1, 8)][k] - base[fi][k])), dn = dot(d, Nn), db = dot(d, Bn), wd = windAt(lb.parent ? lb.parent.i : -1, fi), c = Math.cos(wd), s = Math.sin(wd);
      from.sort((x, y) => ((y.a * c - y.b * s) * dn + (y.a * s + y.b * c) * db) - ((x.a * c - x.b * s) * dn + (x.a * s + x.b * c) * db)).slice(0, count).forEach((q) => (q.limb = lb.i));
      lb.count = count; lb.frames = frames(lb.path); lb.scale = lb.parent ? lb.parent.scale * (0.7 + 0.3 * base[fi][3] / base[lb.parent.fi + 1][3]) : trunk[fi][3] / R0;
    }
    // whose stretch of the way a step is: the trunk's (-1), or that of the limb on the way out to limb li that has left by then
    const ownerAt = (li, i) => { let q = li >= 0 ? limbs[li] : null; while (q && i <= q.fi) q = q.parent; return q ? q.i : -1; };
    // where a strand would lie if it had its bundle to itself: its place in the section of whoever shares its way there
    const group = (s, i) => { const ow = ownerAt(s.limb, i); return S.filter((q) => ownerAt(q.limb, i) === ow); }, seen = new Map();
    const place = (s, i) => { const g = group(s, i), k = g.map((q) => S.indexOf(q)).join(); let m = seen.get(k);
      if (!m) { const ca = g.reduce((v, q) => v + q.a, 0) / g.length, cb = g.reduce((v, q) => v + q.b, 0) / g.length; m = { ca, cb, ext: Math.max(1e-6, ...g.map((q) => H(q.a - ca, q.b - cb))) + 0.35 / Math.sqrt(g.length), n: g.length }; seen.set(k, m); }
      return [(s.a - m.ca) / m.ext, (s.b - m.cb) / m.ext, m.n]; };
    for (const s of S) {
      const path = s.limb >= 0 ? limbs[s.limb].path : trunk, fr = s.limb >= 0 ? limbs[s.limb].frames : tf, fi = s.limb >= 0 ? limbs[s.limb].fi : -1, own = path.length - 1 - Math.max(0, fi);
      const first = s === S.find((q) => q.limb === s.limb), u1 = r(), u2 = r(), u3 = r(), stub = s.limb >= 0 ? limbs[s.limb].L.stub : null; s.snapped = stub ? stub !== 'hollow' : !first && u1 < 0.6;   // some strands snap short of the end, and keep their girth to the break
      // (a shoot that snapped off: all its strands end at the break, a little apart; where it has rotted out they end below where it left, fined down to points like any other end)
      const end = stub ? (stub === 'hollow' ? Math.max(4, fi - 3 - Math.round(5 * u2)) : path.length - 1 - (stub === 'knot' ? 0 : Math.round(own * 0.4 * u2))) : path.length - 1 - (first ? 0 : Math.round(own * (s.snapped ? 0.25 + 0.4 * u2 : 0.3 * u2))), fine = 0.12 + 0.2 * u3, X = [], rho = [], goal = [], hold = [];
      for (let i = 0; i <= end; i++) {
        const [u, v, m] = place(s, i), ow = ownerAt(s.limb, i), Rg = path[i][3] * Math.sqrt(m / (ow >= 0 ? limbs[ow].count : n)) * 0.8, wind = windAt(s.limb, i), c = Math.cos(wind), sn = Math.sin(wind), a = u * c - v * sn, b = u * sn + v * c, [, Nn, Bn] = fr[i];
        // (a limb's strands wind round each other as they go out)
        const tip = s.snapped ? 1 : Math.max(0.12, Math.pow(Math.min(1, (end - i) * ds / fine), 0.7));   // or it fines down to a point
        X.push([0, 1, 2].map((k) => path[i][k] + (Nn[k] * a + Bn[k] * b) * Rg)); goal.push(path[i].slice(0, 3)); hold.push(0);
        rho.push(rho0 * s.fat * tip * (ow >= 0 ? limbs[ow].scale * (0.7 + 0.3 * path[i][3] / path[limbs[ow].fi + 1][3]) : path[i][3] / R0));
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
    // Where a shoot snapped off (a limb given as a `stub`). Three ages of the same event:
    //   fresh   the stub stands, its strands broken off a little apart
    //   knot    the stub is nearly flush, and the wood that stayed has thickened round it
    //   hollow  the stub has rotted out: its strands end inside
    // In all three the place where the shoot was stays its own: a tunnel along its line, from inside the wood it
    // left to well outside, which no other strand may lie in. So the wood that stayed flows round the wound and
    // never closes across it. And the wood near the wound thickens (the collar). How much stub is left in the
    // tunnel, how deep it goes and how thick the collar is, is the age.
    const marks = [];
    for (const lb of limbs) if (lb.L.stub) { const b = lb.base[lb.fi], own = lb.own, d = unit([0, 1, 2].map((k) => own[Math.min(own.length - 1, 3)][k] - b[k])), s0 = S.find((q) => q.limb === lb.i), m = place(s0, lb.fi)[2], kind = lb.L.stub;
      // (a hollow is no wider than leaves the wood a back: wider, it is a window through it)
      const Rb = b[3] * Math.sqrt(m / (lb.parent ? lb.parent.count : n)) * 0.8, r = Math.min(Math.max(0.045, own[0][3] * 0.9), kind === 'hollow' ? Math.max(0.045, 0.55 * Rb) : 9), deep = kind === 'hollow' ? 0.9 * r : 0.6 * r, at = (f) => [0, 1, 2].map((k) => b[k] + d[k] * f);
      marks.push({ c: at(Rb), a: at(Math.max(0, Rb - deep)), e: at(Rb + 1.5 * r), o: at(0.85 * Rb), R: Math.max(0.07, 0.75 * Rb), r, d, kind, limb: lb.i }); }
    let vg = 1;
    // an orb held in the trunk: a ball, with room round it for the strands that are willing to give it
    let orb = null;
    if (P.orb) { const i = Math.round(P.orb.at * (nT - 1)), to = P.orb.toward || [0.43, 0.9], off = (P.orb.off || 0) * trunk[i][3], l = H(to[0], to[1]) || 1;
      orb = { c: [trunk[i][0] + to[0] / l * off, trunk[i][1], trunk[i][2] + to[1] / l * off], r: P.orb.r, room: P.orb.r * (1 + P.orb.room) }; }
    // A hollow is an orb's room with no orb in it: room inside the wood, toward the side the shoot left on, which the strands
    // that stayed part round. It opens gradually, as a splitting orb's does: opened all at once it throws strands across its own
    // mouth. Given `hollow: { at }` (0.4, say) the strands also split over it, as over an orb: an older, more ravaged hollow.
    // (The first hollow of a tree that holds no orb; any other is only its tunnel.)
    else { const v = marks.find((q) => q.kind === 'hollow'); if (v) { orb = { c: v.o, r: 0.7 * v.R, room: v.R, empty: true }; v.asOrb = true; } }
    const rhoMax = Math.max(...S.map((s) => Math.max(...s.rho))), cell = rhoMax * 2.1;
    // a strand that has split off another parts from it gradually: at the join the two are one, and they come
    // fully apart only some way along. (0: still one; 1: two.)
    // Nothing meets the grain square. A part that has split off may never stand further from the strand it split
    // from than half the way it has run from the join: it stays inside a wedge of about 27 degrees at each end.
    const WEDGE = P.wedge === undefined ? 0.5 : P.wedge;
    const kin = (i, k, j, l) => { const A = S[i], B = S[j]; let ch, m, pl; if (B.parent === i) { ch = B; m = l; pl = k; } else if (A.parent === j) { ch = A; m = k; pl = l; } else return 1; if (Math.abs(pl - (ch.po + m)) > 12) return 1; const w = WEDGE * Math.min(m, ch.K - 1 - m) * ds / (A.rho[k] + B.rho[l]); return w < 0.05 ? 0 : Math.min(1, w); };
    const each = (fn) => {   // every pair of points of unlike strands that are closer than their girths allow
      const g = new Map(); S.forEach((s, i) => { for (let k = 0; k < s.K; k++) { const q = (Math.floor(s.X[k * 3] / cell) + 512) * 1048576 + (Math.floor(s.X[k * 3 + 1] / cell) + 512) * 1024 + Math.floor(s.X[k * 3 + 2] / cell) + 512, b = g.get(q); if (b) b.push(i, k); else g.set(q, [i, k]); } });
      S.forEach((s, i) => { for (let k = 0; k < s.K; k++) { const x = s.X[k * 3], y = s.X[k * 3 + 1], z = s.X[k * 3 + 2], cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let e = -1; e <= 1; e++) { const q = g.get((cx + a + 512) * 1048576 + (cy + b + 512) * 1024 + cz + e + 512); if (!q) continue;
          for (let t = 0; t < q.length; t += 2) { const j = q[t]; if (j <= i) continue; const l = q[t + 1], o = S[j].X, dx = x - o[l * 3], dy = y - o[l * 3 + 1], dz = z - o[l * 3 + 2], d = H(dx, dy, dz), apart = kin(i, k, j, l), want = (s.rho[k] + S[j].rho[l]) * apart; if (apart && d < want) fn(i, k, j, l, dx, dy, dz, d || 1e-9, want); } } } });
    };
    // which strands pass each step of the trunk and of each limb together
    const stations = new Map();
    S.forEach((s) => { for (let k = s.root; k < s.K; k++) { const i = k - s.root, ow = ownerAt(s.limb, i), key = (ow >= 0 ? 'limb' + ow : 'trunk') + ':' + i; let st = stations.get(key); if (!st) { const onL = ow >= 0, lb = onL ? limbs[ow] : null;
        // a limb is held to its line only along its far part: how it gets there from the trunk is its strands' business.
        // And the trunk, or a limb, is let go where a limb leaves it, so the parting can pull it about.
        const h = limbs.reduce((v, q) => (q.parent === lb ? v * (1 - 0.9 * Math.exp(-(((i - q.fi) / 9) ** 2))) : v), onL ? sstep(P.set ? 0.05 : 0.35, P.set ? 0.3 : 0.8, (i - lb.fi) / (lb.path.length - 1 - lb.fi)) : 1);
        st = { goal: [s.goal[k * 3], s.goal[k * 3 + 1], s.goal[k * 3 + 2]], who: [], limb: onL, h }; stations.set(key, st); } st.who.push(s, k); (s.stn || (s.stn = []))[k] = st; } });
    const M = S.map((s) => new Float64Array(s.K * 3));
    S.forEach((s, i) => { s.parent = -1; s.fam = i; s.press = 0; s.on = new Uint8Array(s.K); });
    // a split strand rejoins the one it split from at both its ends
    // a tear closes inside its wedge (see WEDGE): toward each end a part is held as near its strand as that allows
    const joins = () => { for (const s of S) if (s.child) { const p = S[s.parent].X, K = s.K;
      for (const dir of [1, -1]) { let run = 0; for (let e = 0; e < K >> 1; e++) { const m = dir > 0 ? e : K - 1 - e, k = s.po + m; if (e) run += H(p[k * 3] - p[(k - dir) * 3], p[k * 3 + 1] - p[(k - dir) * 3 + 1], p[k * 3 + 2] - p[(k - dir) * 3 + 2]); const lim = WEDGE * run; if (lim > 0.5) break;
        const dx = s.X[m * 3] - p[k * 3], dy = s.X[m * 3 + 1] - p[k * 3 + 1], dz = s.X[m * 3 + 2] - p[k * 3 + 2], d = H(dx, dy, dz); if (d > lim) { const f = d > 1e-12 ? lim / d : 0; s.X[m * 3] = p[k * 3] + dx * f; s.X[m * 3 + 1] = p[k * 3 + 1] + dy * f; s.X[m * 3 + 2] = p[k * 3 + 2] + dz * f; } } } } };
    // Splitting. A strand's girth is how much passes along it. One pressed against the orb long enough divides
    // lengthwise over the stretch where it is pressed: two of half the area, which part sideways over the orb and
    // rejoin beyond it. Either may divide again. So the most pressed end up the finest, and a fine strand is
    // what is left of a heavy one. (Run 012: this one rule gave thin strands over a body, forks, crossings,
    // and the thinnest nearest.)
    const splitAs = P.orb ? P.orb.split : orb ? (P.hollow || { at: 99 }) : null, SP = orb && splitAs ? Object.assign({ at: 0.5, every: 40, floor: 0.012, most: 160, neck: 1.0, least: 0.009, strings: 0, run: 34 }, splitAs === true ? {} : splitAs) : null; let forks = 0;
    const rs = rng(P.seed + 55);
    const divide = (i) => { const s = S[i], n = s.K; let a = -1, b = -1; for (let k = Math.max(1, s.root); k < n - 1; k++) if (s.on[k]) { if (a < 0) a = k; b = k; } if (a < 0) return;
      // a tear runs on along the grain past where the strand was pressed: a little, or a long way, each end its own
      const low = Math.max(1, s.root + 2), ka = Math.max(low, a - 3 - Math.floor(Math.min(SP.run * rs() * rs(), Math.max(0, a - 3 - low) * rs()))),   // a tear starts anywhere between the foot and the press, each at its own height: held to one height they make a ring
        kb = Math.min(n - 2, b + 4 + Math.floor(SP.run * rs() * rs())); if (kb - ka < 8) return; for (let k = ka; k <= kb; k++) if (s.rho[k] / Math.SQRT2 < SP.floor) return;
      const nc = kb - ka + 1, X = new Float64Array(nc * 3), rr = new Float64Array(nc);
      for (let m = 0; m < nc; m++) { const k = ka + m, p = [s.X[k * 3], s.X[k * 3 + 1], s.X[k * 3 + 2]], tg = [0, 1, 2].map((q) => s.X[(k + 1) * 3 + q] - s.X[(k - 1) * 3 + q]), side = unit(cross(tg, [p[0] - orb.c[0], p[1] - orb.c[1], p[2] - orb.c[2]]));
        const rn = s.rho[k] / Math.SQRT2, amt = rn * 0.7 * Math.sin(PI * m / (nc - 1)); for (let q = 0; q < 3; q++) { X[m * 3 + q] = p[q] + side[q] * amt; s.X[k * 3 + q] = p[q] - side[q] * amt; } s.rho[k] = rn; rr[m] = rn; }
      const mean = rr.reduce((v, x) => v + x, 0) / nc;
      S.push({ X, rho: rr, K: nc, root: 0, limb: -1, limbAt: -1, goal: Float64Array.from(X).fill(1), hold: new Float64Array(nc), bend: P.stiff * Math.min(1.6, (mean / rho0) ** 2), give: 1, fat: mean / rho0, snapped: false, child: true, parent: i, fam: s.fam, po: ka, press: 0, on: new Uint8Array(nc) });
      M.push(new Float64Array(nc * 3)); forks++; };
    for (let pass = 0; pass < P.passes; pass++) {
      const grown = orb ? (SP ? Math.min(1, pass / (P.passes * 0.6)) : 1) : 0;   // an orb that splits what holds it grows; otherwise it is simply there
      vg = Math.min(1, pass / (P.passes * 0.4));   // a hollow opens gradually, so the wood round it parts and is not thrown
      // the collar: half way through, the wood near each wound thickens, most at the wound, and then settles again
      if (marks.length && pass === Math.floor(P.passes * 0.5)) for (const v of marks) { const D = 2.4 * v.r, gain = P.swell * (v.kind === 'knot' ? 0.6 : v.kind === 'hollow' ? 0.45 : 0.2);
        for (const s of S) if (s.limb !== v.limb) for (let k = s.root; k < s.K; k++) { const d = H(s.X[k * 3] - v.c[0], s.X[k * 3 + 1] - v.c[1], s.X[k * 3 + 2] - v.c[2]); if (d < D) s.rho[k] *= 1 + gain * (1 - d / D) ** 2; } }
      S.forEach((s, i) => { const X = s.X, m = M[i], K = s.K; m.fill(0);   // taut, stiff, and kept to its bundle's line
        // set: wood keeps the shape it grew in. A strand is then taut and stiff about its line, corners and all, and not
        // about a straight one: what is pulled smooth is how far it lies from its line, so a corner in the line stays a corner.
        const G = s.goal, w = s.child ? 0 : P.set;
        for (let k = 0; k < K; k++) for (let q = 0; q < 3; q++) { const p = X[k * 3 + q]; let v = s.hold[k] * (G[k * 3 + q] - p);
          if (k > 1 && k < K - 2) { const a = X[(k - 2) * 3 + q] - w * G[(k - 2) * 3 + q], b = X[(k - 1) * 3 + q] - w * G[(k - 1) * 3 + q], c = p - w * G[k * 3 + q], d = X[(k + 1) * 3 + q] - w * G[(k + 1) * 3 + q], e = X[(k + 2) * 3 + q] - w * G[(k + 2) * 3 + q]; v += P.taut * ((b + d) / 2 - c) - s.bend * (a - 4 * b + 6 * c - 4 * d + e); } m[k * 3 + q] = v; }
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
        for (const v of marks) { if (v.asOrb || (s.limb === v.limb && v.kind !== 'hollow')) continue;   // and out of the tunnel where a shoot was (its own stub, if it has one, is what lies there)
          const ax = v.e[0] - v.a[0], ay = v.e[1] - v.a[1], az = v.e[2] - v.a[2], t = Math.max(0, Math.min(1, ((s.X[k * 3] - v.a[0]) * ax + (s.X[k * 3 + 1] - v.a[1]) * ay + (s.X[k * 3 + 2] - v.a[2]) * az) / (ax * ax + ay * ay + az * az))), qx = v.a[0] + ax * t, qy = v.a[1] + ay * t, qz = v.a[2] + az * t;
          const keep = v.r * (v.kind === 'hollow' ? 1 : 0.8) * vg + s.rho[k], dx = s.X[k * 3] - qx, dy = s.X[k * 3 + 1] - qy, dz = s.X[k * 3 + 2] - qz, d = H(dx, dy, dz) || 1e-9; if (d < keep) { const f = keep / d; s.X[k * 3] = qx + dx * f; s.X[k * 3 + 1] = qy + dy * f; s.X[k * 3 + 2] = qz + dz * f; } }
        if (s.goal[k * 3 + 1] > 0 && s.X[k * 3 + 1] < s.rho[k] * 0.6) s.X[k * 3 + 1] = s.rho[k] * 0.6; }   // but a root that dives is let through
      joins();
      if (SP && pass % SP.every === 0) { const cand = S.map((s, i) => [s.press, i]).filter((q) => q[0] > SP.at).sort((a, b) => b[0] - a[0]); for (const [, i] of cand) { if (S.length >= SP.most) break; divide(i); } for (const s of S) s.press = 0; }
    }
    vg = 1;
    // last, the strands are cleared of each other: the same giving way and keeping off, with nothing pulling them
    // together any more. What tension pressed into each other comes apart.
    for (let pass = 0, grown = orb ? 1 : 0; pass < P.settle; pass++) {
      { M.forEach((m) => m.fill(0));   // they give way to each other, the thinner one more (clear: how many times a pass)
      // (a strand lying on the orb holds its place: the other gives)
      each((i, k, j, l, dx, dy, dz, d, want) => { const ai = S[i].rho[k] * (S[i].on[k] ? 8 : 1), aj = S[j].rho[l] * (S[j].on[l] ? 8 : 1), f = 0.5 * (want - d) / d, wi = aj / (ai + aj), wj = ai / (ai + aj); M[i][k * 3] += dx * f * wi; M[i][k * 3 + 1] += dy * f * wi; M[i][k * 3 + 2] += dz * f * wi; M[j][l * 3] -= dx * f * wj; M[j][l * 3 + 1] -= dy * f * wj; M[j][l * 3 + 2] -= dz * f * wj; });
      S.forEach((s, i) => { for (let q = 0; q < s.K * 3; q++) s.X[q] += M[i][q]; }); }
      for (const s of S) for (let k = 0; k < s.K; k++) {   // to the orb, each as far as it is willing; and to the ground
        if (orb) { const keep = (orb.r + (orb.room - orb.r) * s.give) * grown + s.rho[k], dx = s.X[k * 3] - orb.c[0], dy = s.X[k * 3 + 1] - orb.c[1], dz = s.X[k * 3 + 2] - orb.c[2], d = H(dx, dy, dz) || 1e-9; s.on[k] = d < keep + 0.004 ? 1 : 0; if (d < keep) { const f = keep / d; s.X[k * 3] = orb.c[0] + dx * f; s.X[k * 3 + 1] = orb.c[1] + dy * f; s.X[k * 3 + 2] = orb.c[2] + dz * f; } }
        for (const v of marks) { if (v.asOrb || (s.limb === v.limb && v.kind !== 'hollow')) continue;   // and out of the tunnel where a shoot was (its own stub, if it has one, is what lies there)
          const ax = v.e[0] - v.a[0], ay = v.e[1] - v.a[1], az = v.e[2] - v.a[2], t = Math.max(0, Math.min(1, ((s.X[k * 3] - v.a[0]) * ax + (s.X[k * 3 + 1] - v.a[1]) * ay + (s.X[k * 3 + 2] - v.a[2]) * az) / (ax * ax + ay * ay + az * az))), qx = v.a[0] + ax * t, qy = v.a[1] + ay * t, qz = v.a[2] + az * t;
          const keep = v.r * (v.kind === 'hollow' ? 1 : 0.8) * vg + s.rho[k], dx = s.X[k * 3] - qx, dy = s.X[k * 3 + 1] - qy, dz = s.X[k * 3 + 2] - qz, d = H(dx, dy, dz) || 1e-9; if (d < keep) { const f = keep / d; s.X[k * 3] = qx + dx * f; s.X[k * 3 + 1] = qy + dy * f; s.X[k * 3 + 2] = qz + dz * f; } }
        if (s.goal[k * 3 + 1] > 0 && s.X[k * 3 + 1] < s.rho[k] * 0.6) s.X[k * 3 + 1] = s.rho[k] * 0.6; }   // but a root that dives is let through
      joins();
    }
    // which way each strand faces outward: away from the middle of its own bundle, the strands that go its way
    // with it, and square to its own direction. (Taking the middle of all the wood near by was wrong for a limb
    // close to the trunk: its strands then faced away from the trunk, which is along their own length.)
    // far: how far it lies from that middle. A strand with a way to itself lies on it.
    for (const st of stations.values()) { let cx = 0, cy = 0, cz = 0, w = 0; for (let q = 0; q < st.who.length; q += 2) { const o = st.who[q], k = st.who[q + 1], m = o.rho[k] ** 2; cx += o.X[k * 3] * m; cy += o.X[k * 3 + 1] * m; cz += o.X[k * 3 + 2] * m; w += m; } st.c = [cx / w, cy / w, cz / w]; }
    const stnOf = (q, k) => (q.child ? stnOf(S[q.parent], Math.min(S[q.parent].K - 1, q.po + k)) : (q.stn && q.stn[k]) || null);
    const big = R0 * 1.3, g = new Map(), kk = (x, y, z) => (Math.floor(x / big) + 512) * 1048576 + (Math.floor(y / big) + 512) * 1024 + Math.floor(z / big) + 512;
    S.forEach((s) => { for (let k = 0; k < s.K; k++) { const q = kk(s.X[k * 3], s.X[k * 3 + 1], s.X[k * 3 + 2]), b = g.get(q); if (b) b.push(s, k); else g.set(q, [s, k]); } });
    for (const s of S) { s.O = []; s.F = []; let last = [1, 0, 0];
      for (let k = 0; k < s.K; k++) { const x = s.X[k * 3], y = s.X[k * 3 + 1], z = s.X[k * 3 + 2], st = stnOf(s, k), k0 = Math.max(0, k - 1), k1 = Math.min(s.K - 1, k + 1), T = unit([s.X[k1 * 3] - s.X[k0 * 3], s.X[k1 * 3 + 1] - s.X[k0 * 3 + 1], s.X[k1 * 3 + 2] - s.X[k0 * 3 + 2]]); let o;
        if (st) o = [x - st.c[0], y - st.c[1], z - st.c[2]];
        else { let cx = 0, cy = 0, cz = 0, w = 0;   // a root: away from the middle of the wood near by
          for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let e = -1; e <= 1; e++) { const q = g.get(kk(x + a * big, y + b * big, z + e * big)); if (!q) continue; for (let t = 0; t < q.length; t += 2) { const o2 = q[t], l = q[t + 1], dx = o2.X[l * 3] - x, dy = o2.X[l * 3 + 1] - y, dz = o2.X[l * 3 + 2] - z; if (dx * dx + dy * dy + dz * dz < big * big) { const m = o2.rho[l] ** 2; cx += dx * m; cy += dy * m; cz += dz * m; w += m; } } }
          o = [-cx / w, -cy / w, -cz / w]; }
        s.F.push(H(o[0], o[1], o[2])); const al = dot(o, T); o = [o[0] - T[0] * al, o[1] - T[1] * al, o[2] - T[2] * al];
        if (H(o[0], o[1], o[2]) < 0.25 * s.rho[k]) { const lt = dot(last, T); o = [last[0] - T[0] * lt, last[1] - T[1] * lt, last[2] - T[2] * lt]; if (H(o[0], o[1], o[2]) < 1e-6) o = cross(T, [T[1], T[2], T[0]]); } o = unit(o);
        if (orb) { const rx = x - orb.c[0], ry = y - orb.c[1], rz = z - orb.c[2], rd = H(rx, ry, rz) || 1, w = 1 - sstep(1.15, 1.7, rd / orb.room); o = unit([o[0] * (1 - w) + rx / rd * w, o[1] * (1 - w) + ry / rd * w, o[2] * (1 - w) + rz / rd * w]); }   // near an orb it faces away from the orb
        if (k < s.root) { const t = sstep(0, 0.7, 1 - k / s.root); o = unit([o[0] * (1 - t), o[1] * (1 - t) + t, o[2] * (1 - t)]); } s.O.push(o); last = o; }
      for (let pass = 0; pass < 8; pass++) s.O = s.O.map((o, k) => (k === 0 || k === s.K - 1 ? o : unit([0, 1, 2].map((q) => 0.5 * o[q] + 0.25 * (s.O[k - 1][q] + s.O[k + 1][q])))));
    }
    // Pulled apart like string cheese. What has split is still one body drawn apart, and three things show it.
    // Each part knows which way its other part lies (inner), so it can be drawn with a torn face toward it.
    // It necks: the further a part has been drawn from what it split from, the thinner it is there.
    // And near where a split closes, a fine thread may still hang on across the gap, on a slant: drawn out,
    // thickest where it is rooted and thinnest in its middle.
    const threads = [];
    if (SP) {
      const rt = rng(P.seed + 91), fams = new Map(), pt = (o, k) => [o.X[k * 3], o.X[k * 3 + 1], o.X[k * 3 + 2]];
      // where a part still runs with what it split from, the two are one strand of the whole girth
      for (const q of S) if (q.child) { const par = S[q.parent]; for (let m = 0; m < q.K; m++) { const k = q.po + m, w = Math.min(1, WEDGE * Math.min(m, q.K - 1 - m) * ds / (par.rho[k] + q.rho[m])); if (w >= 1) continue; const whole = Math.sqrt(par.rho[k] ** 2 + q.rho[m] ** 2); par.rho[k] = whole + (par.rho[k] - whole) * w; q.rho[m] = Math.max(0.004, q.rho[m] * w); } }
      S.forEach((q, i) => { const f = fams.get(q.fam); if (f) f.push(i); else fams.set(q.fam, [i]); q.inner = new Array(q.K).fill(null); q.gap = new Float64Array(q.K); });
      for (const mem of fams.values()) { if (mem.length < 2) continue;
        for (const i of mem) { const a = S[i]; for (let k = 0; k < a.K; k++) { let bd = 1e9, bj = -1, bl = 0;
          for (const j of mem) { if (j === i) continue; const o = S[j]; for (let l = 0; l < o.K; l++) { const d = H(a.X[k * 3] - o.X[l * 3], a.X[k * 3 + 1] - o.X[l * 3 + 1], a.X[k * 3 + 2] - o.X[l * 3 + 2]); if (d < bd) { bd = d; bj = j; bl = l; } } }
          const o = S[bj], both = a.rho[k] + o.rho[bl]; if (bd > 1e-6 && bd < 5 * both) { a.inner[k] = unit([o.X[bl * 3] - a.X[k * 3], o.X[bl * 3 + 1] - a.X[k * 3 + 1], o.X[bl * 3 + 2] - a.X[k * 3 + 2]]); a.gap[k] = Math.max(0, bd - both); } } } }
      for (const q of S) { for (let k = 0; k < q.K; k++) if (q.gap[k] > 0) q.rho[k] = Math.max(Math.min(q.rho[k], SP.least), q.rho[k] / Math.sqrt(1 + SP.neck * q.gap[k] / (2 * q.rho[k])));
        for (let pass = 0; pass < 2; pass++) { const c = Float64Array.from(q.rho); for (let k = 1; k < q.K - 1; k++) q.rho[k] = Math.min(c[k], 0.5 * c[k] + 0.25 * (c[k - 1] + c[k + 1])); } }
      S.forEach((q) => { if (!q.child) return; const par = S[q.parent];
        for (const [from, dir] of [[2, 1], [q.K - 3, -1]]) { let made = 0;
          for (let m = from; m > 1 && m < q.K - 2 && made < SP.strings; m += dir) { const k0 = Math.max(1, Math.min(par.K - 2, q.po + m)), a = pt(q, m), b0 = pt(par, k0), across = H(a[0] - b0[0], a[1] - b0[1], a[2] - b0[2]), g = across - q.rho[m] - par.rho[k0], tr = 0.009 + 0.003 * rt();
            // a thread runs along the grain at least twice as far as it goes across: long and shallow, or not at all
            const l = Math.max(1, Math.min(par.K - 2, k0 + dir * Math.ceil((2.2 + 1.5 * rt()) * across / ds))), b = pt(par, l), d = H(a[0] - b[0], a[1] - b[1], a[2] - b[2]), tg = unit([q.X[(m + 1) * 3] - q.X[(m - 1) * 3], q.X[(m + 1) * 3 + 1] - q.X[(m - 1) * 3 + 1], q.X[(m + 1) * 3 + 2] - q.X[(m - 1) * 3 + 2]]);
            if (Math.abs((b[0] - a[0]) * tg[0] + (b[1] - a[1]) * tg[1] + (b[2] - a[2]) * tg[2]) < 0.85 * d) continue;
            if (g < 0.012 || g > 0.08) continue; let clear = true;
            for (const o of S) { if (o === q || o === par || !clear) continue; for (let e = 0; e < o.K; e++) { const px = o.X[e * 3] - a[0], py = o.X[e * 3 + 1] - a[1], pz = o.X[e * 3 + 2] - a[2], t = Math.max(0, Math.min(1, (px * (b[0] - a[0]) + py * (b[1] - a[1]) + pz * (b[2] - a[2])) / (d * d))); if (H(px - (b[0] - a[0]) * t, py - (b[1] - a[1]) * t, pz - (b[2] - a[2]) * t) < tr + o.rho[e]) { clear = false; break; } } }
            if (!clear) continue; const X = [], O = [], mid = [(a[0] + b[0]) / 2 - orb.c[0], (a[1] + b[1]) / 2 - orb.c[1], (a[2] + b[2]) / 2 - orb.c[2]], ax = unit([b[0] - a[0], b[1] - a[1], b[2] - a[2]]), dm = mid[0] * ax[0] + mid[1] * ax[1] + mid[2] * ax[2], face = unit([mid[0] - ax[0] * dm, mid[1] - ax[1] * dm, mid[2] - ax[2] * dm]);
            for (let e = 0; e < 9; e++) { X.push(a[0] + (b[0] - a[0]) * e / 8, a[1] + (b[1] - a[1]) * e / 8, a[2] + (b[2] - a[2]) * e / 8); O.push(face); }
            threads.push({ X: Float64Array.from(X), rho: Float64Array.from([1.7, 1.25, 0.95, 0.78, 0.7, 0.78, 0.95, 1.25, 1.7], (v) => v * tr), O, far: new Array(9).fill(0), K: 9, root: 0, limb: -1, give: 1, snapped: false, vine: true, thread: true, inner: null }); made++; m += dir * (2 + Math.floor(3 * rt())); } } });
    }
    // (where a split strand joins the one it came from the two are one, so those places are not counted)
    let worst = 0, over = 0, pairs = 0; each((i, k, j, l, dx, dy, dz, d, want) => { if ((S[i].child && (k < 18 || k >= S[i].K - 18)) || (S[j].child && (l < 18 || l >= S[j].K - 18))) return; const v = (want - d) / want; worst = Math.max(worst, v); pairs++; if (v > 0.15) over++; });
    // a strand that has been drawn out has its points far apart and would be drawn as a polygon. It is stepped
    // again at the usual spacing along the same line, and eased.
    const fair = (q) => { const K = q.K, L = [0]; for (let k = 1; k < K; k++) L.push(L[k - 1] + H(q.X[k * 3] - q.X[k * 3 - 3], q.X[k * 3 + 1] - q.X[k * 3 - 2], q.X[k * 3 + 2] - q.X[k * 3 - 1]));
      const n = Math.round(L[K - 1] / ds) + 1; if (n <= K * 1.15) return q;
      const X = new Float64Array(n * 3), rho = new Float64Array(n), gap = q.gap ? new Float64Array(n) : null, O = [], F = [], inner = q.inner ? [] : null; let i = 0;
      for (let j = 0; j < n; j++) { const at = L[K - 1] * j / (n - 1); while (i < K - 2 && L[i + 1] < at) i++; const u = Math.max(0, Math.min(1, (at - L[i]) / ((L[i + 1] - L[i]) || 1e-9))), a = Math.max(0, i - 1), d = Math.min(K - 1, i + 2);
        for (let c = 0; c < 3; c++) X[j * 3 + c] = q.X[i * 3 + c] + (q.X[(i + 1) * 3 + c] - q.X[i * 3 + c]) * u;
        rho[j] = q.rho[i] + (q.rho[i + 1] - q.rho[i]) * u; if (gap) gap[j] = q.gap[i] + (q.gap[i + 1] - q.gap[i]) * u; O.push(unit([0, 1, 2].map((c) => q.O[i][c] + (q.O[i + 1][c] - q.O[i][c]) * u))); F.push(q.F[i] + (q.F[i + 1] - q.F[i]) * u); if (inner) inner.push(q.inner[u < 0.5 ? i : i + 1]); }
      for (let pass = 0; pass < 3; pass++) { const c = Float64Array.from(X); for (let j = 1; j < n - 1; j++) for (let e = 0; e < 3; e++) X[j * 3 + e] = 0.5 * c[j * 3 + e] + 0.25 * (c[(j - 1) * 3 + e] + c[(j + 1) * 3 + e]); }   // straight between the old points, then eased: this cannot loop
      let root = 0; if (q.root) { const at = L[Math.min(K - 1, q.root)]; root = Math.round((n - 1) * at / L[K - 1]); }
      return Object.assign({}, q, { X, rho, gap, O, F, inner, K: n, root }); };
    if (P.fair !== false) for (let i = 0; i < S.length; i++) S[i] = fair(S[i]);
    return { strands: S.map((s) => ({ X: s.X, rho: s.rho, O: s.O, far: s.F, K: s.K, root: s.root, limb: s.limb, give: s.give, snapped: s.snapped, stub: s.limb >= 0 && limbs[s.limb] ? limbs[s.limb].L.stub || null : null, vine: !!s.child, inner: s.inner || null, gap: s.gap || null, fam: s.fam })).concat(threads), orb, marks: marks.map((v) => ({ c: v.c, a: v.a, e: v.e, r: v.r, d: v.d, kind: v.kind, limb: v.limb, asOrb: !!v.asOrb })), measure: { worstOverlap: worst, touching: pairs, overlapping: over, forks, strands: S.length, threads: threads.length }, recipe: P };
  }

  // The tree's lines, grown and not given. A shoot carries some of the tree's strands. It grows in bouts: it runs
  // straight for a stretch, then turns a corner (`kink`: how sharp) and runs straight again, choosing at each
  // corner the way that is more open and more upward. Its length goes with how many strands it carries. At intervals it forks: a share of what it
  // still carries leaves to one side as a shoot of its own, toward whichever side is most open, and the rest
  // is turned the other way by as much as it lost. A heavy shoot runs further between forks than a light one,
  // and a shoot down to one strand cannot fork. Nothing else: one
  // rule, and `share` is its main number (small: a leader with side shoots; a half: even forks and no leader).
  // Returns { strands, trunk, limbs } for grow(), and what it made (shoots, tips, deepest).
  function sprout(rule) {
    const Q = Object.assign({ strands: 18, seed: 1, share: 0.35, every: 0.1, first: 0.25, spread: 1.3, up: 0.4, wander: 0.5, reach: 1.15, tall: 1.1, twig: 0.22, foot: 0.2, step: 0.08, kink: 0.7, bout: 0.16, set: 0.8, snap: 0, as: 'mixed', least: 2, most: 0.25 }, rule), r = rng(Q.seed + 700), n = Q.strands, st = Q.step;
    const length = (c) => Q.reach * (Q.twig + Math.sqrt(c / n)), inside = (p) => Math.abs(p[0]) < 0.9 && Math.abs(p[2]) < 0.9 && p[1] < 1.9 && p[1] > 0.3, laid = [];   // every point of every shoot so far
    const open = (p) => { let d = 9; for (const q of laid) d = Math.min(d, H(p[0] - q[0], p[1] - q[1], p[2] - q[2])); return d; };
    let shoots = 0, tips = 0, deepest = 0;
    const shoot = (p, d, c, len, depth, lead) => {
      const pts = [], kids = [], phase = TAU * r(); const gap = () => Q.every * (0.4 + 2.2 * Math.sqrt(c / n)) * (0.7 + 0.6 * r());   // a heavy shoot runs further between forks than a light one
      const bout = () => Q.bout * (0.5 + 1.1 * Math.sqrt(c / n)) * (0.6 + 0.8 * r()), bend = () => Q.kink * (0.6 + 0.8 * r()) * (1 - 0.6 * Math.sqrt(c / n));   // a heavy shoot runs further between corners and turns less at each
      let gone = 0, next = lead ? Q.first * len : gap(), w = [0, 0, 0], turnN = 0, node = Q.kink ? bout() : 0; shoots++; deepest = Math.max(deepest, depth);
      while (gone < len) {
        w = w.map((v) => 0.6 * v + 0.4 * (2 * r() - 1)); const al = dot(w, d), lift = Q.up * (lead ? 0.4 : 1);
        d = unit(d.map((v, k) => v + st * (Q.wander * (Q.kink ? 0.25 : 1.6) * (w[k] - d[k] * al) + (Q.kink ? 0 : lift) * (UP[k] - v * d[1]))));
        const q = p.map((v, k) => v + d[k] * st); if (!inside(q) && pts.length >= 2) break; p = q; gone += st; pts.push(p); laid.push(p);
        if (c >= 2 && gone >= next && gone >= node && len - gone > 0.15) {
          const k = Math.max(1, Math.min(c - 1, Math.round(Q.share * c * (0.7 + 0.6 * r())))), kl = length(k), th = Q.spread * (0.75 + 0.5 * r()), T = d, N = unit(cross(T, Math.abs(T[1]) < 0.9 ? UP : [1, 0, 0])), B = cross(T, N);
          let best = null; for (let e = 0; e < 6; e++) { const ph = phase + turnN * GA + e * TAU / 6 + 0.5 * (r() - 0.5), side = N.map((v, j) => v * Math.cos(ph) + B[j] * Math.sin(ph)), dir = unit(T.map((v, j) => v * Math.cos(th) + side[j] * Math.sin(th))), probe = p.map((v, j) => v + dir[j] * kl * 0.6);
            const score = (inside(probe) ? 0 : -1) + open(probe) + 0.15 * dir[1]; if (!best || score > best.score) best = { score, side, dir }; }
          turnN++; const part = Math.max(th * k / c, Q.kink ? 0.6 * bend() : 0); d = unit(T.map((v, j) => v * Math.cos(part) - best.side[j] * Math.sin(part)));
          const kid = shoot(p, best.dir, k, kl, depth + 1, false); if (kid.path.length >= 2) { kid.s = gone; kid.count = k; kid.from = p; kid.dir = best.dir; kids.push(kid); c -= k; }
          next = gone + gap(); if (Q.kink) node = gone + bout();
        } else if (Q.kink && gone >= node && len - gone > 0.1) {   // a corner: the shoot goes on a new way
          const a = bend(), T = d, N = unit(cross(T, Math.abs(T[1]) < 0.9 ? UP : [1, 0, 0])), B = cross(T, N), ph0 = TAU * r(); let best = null;
          for (let e = 0; e < 6; e++) { const ph = ph0 + e * TAU / 6, side = N.map((v, j) => v * Math.cos(ph) + B[j] * Math.sin(ph)), dir = unit(T.map((v, j) => v * Math.cos(a) + side[j] * Math.sin(a))), probe = p.map((v, j) => v + dir[j] * Math.min(0.3, len - gone));
            const score = (inside(probe) ? 0 : -1) + 0.5 * Math.min(0.4, open(probe)) + 0.5 * lift * dir[1] + 0.25 * r(); if (!best || score > best.score) best = { score, dir }; }
          d = best.dir; node = gone + bout();
        }
      }
      tips++; return { path: pts, limbs: kids, total: gone };
    };
    const R0 = Q.foot, p0 = [0, 0.22, 0], d0 = unit([0.25 * (r() - 0.5), 1, 0.25 * (r() - 0.5)]), top = shoot(p0, d0, n, Q.tall, 0, true);
    const tidy = (sh) => sh.limbs.map((k) => ({ at: Math.min(0.97, k.s / sh.total), count: k.count, path: k.path, from: k.from, dir: k.dir, limbs: tidy(k) }));
    // Snapping. `snap` of the side shoots break off close to where they left: ones carrying at least `least` strands and
    // at most `most` of the tree's, so the wound is worth seeing and the tree is still a tree. All that grew from one goes with it, and its strands end at the break. Each is one of three ages (`as`, or mixed).
    const limbs = tidy(top), every = [], walk = (Ls, fn) => Ls.forEach((l) => { fn(l); walk(l.limbs, fn); }); walk(limbs, (l) => every.push(l)); let snapped = 0;
    for (let e = 0; e < Q.snap; e++) { const holds = (l) => { let any = false; walk(l.limbs, (q) => { if (q.stub) any = true; }); return any; }, el = every.filter((l) => !l.stub && !l.gone && l.count >= Q.least && l.count <= Math.max(Q.least, Math.round(Q.most * n)) && !holds(l)); if (!el.length) break; let pick = r() * el.reduce((v, l) => v + l.count ** 1.5, 0), L = el[0]; for (const l of el) { pick -= l.count ** 1.5; if (pick <= 0) { L = l; break; } }
      const kind = Q.as === 'mixed' ? ['hollow', 'knot', 'fresh'][e % 3] : Q.as;
      walk(L.limbs, (l) => (l.gone = true)); L.limbs = []; L.stub = kind; snapped++; }
    return { strands: n, trunk: [[p0[0], p0[1], p0[2], R0]].concat(top.path.map((p, i) => [p[0], p[1], p[2], R0 * (1 - 0.5 * (i + 1) / top.path.length)])), limbs, set: Q.set, made: { shoots, tips, deepest, snapped } };
  }

  const api = { grow, sprout };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Trees = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
