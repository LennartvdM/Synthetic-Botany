// A fictional material, not a real one. One skin of linked cells round a volume that grows a little each
// step. The skin has two states and the whole toy is the difference between them:
//   covered  thick. Clenches back toward the shape it started with. A link stretched past its limit rips.
//   bare     thin. Where a link has ripped the skin is bare: it grows wherever it is stretched, its cells
//            dividing to keep up, it pulls itself round, it hangs, and it rides over covered skin it meets.
// The inside presses on everything alike, so it goes wherever it is not clenched. Nothing says where a rip
// starts except where the cover is weakest, and that is the one thing put in: a few faint flaws.
// None of this is meant to be right. Each trait is there to be turned up past what a real stuff would do.
// No dependencies. Works as a plain <script> (globalThis.Tear) and in Node.
(function (root) {
  'use strict';
  const H = Math.hypot, TAU = Math.PI * 2;
  function rng(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const unit = (v) => { const l = H(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

  // a ball of evenly spread cells
  function ball(sub) {
    const t = (1 + Math.sqrt(5)) / 2;
    const V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(unit);
    let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    for (let s = 0; s < sub; s++) {
      const mid = new Map(), m = (a, b) => { const k = a < b ? a * 1e6 + b : b * 1e6 + a; let i = mid.get(k); if (i === undefined) { i = V.length; V.push(unit([V[a][0] + V[b][0], V[a][1] + V[b][1], V[a][2] + V[b][2]])); mid.set(k, i); } return i; };
      const G = []; for (const [a, b, c] of F) { const ab = m(a, b), bc = m(b, c), ca = m(c, a); G.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); } F = G;
    }
    return { V, F };
  }

  function start(recipe) {
    const P = Object.assign({ steps: 260, strength: 0.2, clench: 0.08, thick: 0.06, expanse: 0.2, tension: 0.15, sag: 0.6, flaws: 4, weak: 0.7, lip: 0.35, seed: 1, detail: 5, rate: 0.003, press: 0.012, stiff: 0.45, soft: 0.25, room: 5 }, recipe);
    const { V, F } = ball(P.detail), n0 = V.length, r = rng(P.seed), C = n0 * P.room, E = F.length * 1.5 * P.room, TC = F.length * P.room;
    const X = new Float64Array(C * 3), A = new Float64Array(n0 * 3), N = new Float64Array(C * 3), S = new Float64Array(C * 3), cnt = new Int32Array(C), pin = new Uint8Array(C), cov = new Int16Array(C), torn = new Uint8Array(n0);
    const la = new Int32Array(E), lb = new Int32Array(E), t1 = new Int32Array(E), t2 = new Int32Array(E), rest = new Float64Array(E), limit = new Float64Array(E), bare = new Uint8Array(E), tri = new Int32Array(TC * 3), key = new Map();
    let nc = n0, ne = 0, nt = 0, h0 = 0, snapped = 0, t = 0;
    const K = (a, b) => (a < b ? a * 1e6 + b : b * 1e6 + a), far = (a, b) => H(X[a * 3] - X[b * 3], X[a * 3 + 1] - X[b * 3 + 1], X[a * 3 + 2] - X[b * 3 + 2]);
    for (let i = 0; i < n0; i++) { for (let k = 0; k < 3; k++) X[i * 3 + k] = A[i * 3 + k] = V[i][k]; }
    const link = (a, b, q) => { const k = K(a, b); let e = key.get(k); if (e === undefined) { e = ne++; la[e] = a; lb[e] = b; rest[e] = far(a, b); t1[e] = q; t2[e] = -1; key.set(k, e); cov[a]++; cov[b]++; } else t2[e] = q; };
    for (const [a, b, c] of F) { tri.set([a, b, c], nt * 3); link(a, b, nt); link(b, c, nt); link(c, a, nt); nt++; }
    const m0 = ne; for (let e = 0; e < m0; e++) h0 += rest[e] / m0;
    // flaws: a few tall faint weak streaks on the upper body. A link's breaking strain is lower inside one.
    const flaws = [];
    for (let i = 0; i < P.flaws; i++) { const pol = 0.85 + 0.8 * r(), az = (TAU * i) / P.flaws + (r() - 0.5) * 0.9, d = [Math.sin(pol) * Math.cos(az), Math.cos(pol), Math.sin(pol) * Math.sin(az)]; const e1 = unit([d[0] * d[1], d[1] * d[1] - 1, d[2] * d[1]]); flaws.push({ d, e1, e2: [d[1] * e1[2] - d[2] * e1[1], d[2] * e1[0] - d[0] * e1[2], d[0] * e1[1] - d[1] * e1[0]], len: 0.3 + 0.3 * r(), wid: 0.07 + 0.05 * r() }); }
    for (let e = 0; e < m0; e++) {
      const q = unit([V[la[e]][0] + V[lb[e]][0], V[la[e]][1] + V[lb[e]][1], V[la[e]][2] + V[lb[e]][2]]); let w = 0;
      for (const f of flaws) { const ang = Math.acos(Math.max(-1, Math.min(1, q[0] * f.d[0] + q[1] * f.d[1] + q[2] * f.d[2]))), az = Math.atan2(q[0] * f.e2[0] + q[1] * f.e2[1] + q[2] * f.e2[2], q[0] * f.e1[0] + q[1] * f.e1[1] + q[2] * f.e1[2]); w = Math.max(w, Math.exp(-((ang * Math.sin(az) / f.wid) ** 2) - (ang * Math.cos(az) / f.len) ** 2)); }
      limit[e] = P.strength * (1 - P.weak * w);
    }
    // a bare link becomes two, with a new cell between: this is how bare skin gains expanse
    function divide(e) {
      if (nc >= C || ne + 3 > E || nt + 2 > TC) return;
      const a = la[e], b = lb[e], ta = t1[e], tb = t2[e], p = nc++, t3 = nt++, t4 = nt++; let c = -1, d = -1;
      for (let k = 0; k < 3; k++) X[p * 3 + k] = (X[a * 3 + k] + X[b * 3 + k]) / 2;
      for (let k = 0; k < 3; k++) { const v = tri[ta * 3 + k]; tri[t3 * 3 + k] = v === a ? p : v; if (v === b) tri[ta * 3 + k] = p; else if (v !== a) c = v; }
      for (let k = 0; k < 3; k++) { const v = tri[tb * 3 + k]; tri[t4 * 3 + k] = v === b ? p : v; if (v === a) tri[tb * 3 + k] = p; else if (v !== b) d = v; }
      const add = (u, v, q1, q2, len) => { const f = ne++; la[f] = u; lb[f] = v; rest[f] = len; bare[f] = 1; t1[f] = q1; t2[f] = q2; key.set(K(u, v), f); };
      key.delete(K(a, b)); lb[e] = p; key.set(K(a, p), e); rest[e] /= 2; t1[e] = ta; t2[e] = t4;
      add(p, b, t3, tb, rest[e]); add(p, c, ta, t3, far(p, c)); add(p, d, tb, t4, far(p, d));
      const bc = key.get(K(b, c)), ad = key.get(K(a, d)); if (t1[bc] === ta) t1[bc] = t3; else t2[bc] = t3; if (t1[ad] === tb) t1[ad] = t4; else t2[ad] = t4;
    }
    const pull = (a, b, len, k) => {
      const wa = pin[a] ? 0 : 1, wb = pin[b] ? 0 : 1, ws = wa + wb; if (!ws) return;
      const dx = X[b * 3] - X[a * 3], dy = X[b * 3 + 1] - X[a * 3 + 1], dz = X[b * 3 + 2] - X[a * 3 + 2], d = H(dx, dy, dz) || 1e-9, f = ((d - len) / d) * k / ws;
      X[a * 3] += dx * f * wa; X[a * 3 + 1] += dy * f * wa; X[a * 3 + 2] += dz * f * wa; X[b * 3] -= dx * f * wb; X[b * 3 + 1] -= dy * f * wb; X[b * 3 + 2] -= dz * f * wb;
    };
    // the volume inside, the area of the skin, and which way each cell faces
    let area = 0;
    const measure = () => {
      N.fill(0, 0, nc * 3); let v = 0; area = 0;
      for (let q = 0; q < nt; q++) {
        const a = tri[q * 3] * 3, b = tri[q * 3 + 1] * 3, c = tri[q * 3 + 2] * 3, ax = X[a], ay = X[a + 1], az = X[a + 2], bx = X[b], by = X[b + 1], bz = X[b + 2], cx = X[c], cy = X[c + 1], cz = X[c + 2];
        const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az, x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
        area += H(x, y, z) / 2; v += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
        N[a] += x; N[a + 1] += y; N[a + 2] += z; N[b] += x; N[b + 1] += y; N[b + 2] += z; N[c] += x; N[c + 1] += y; N[c + 2] += z;
      }
      return v / 6;
    };
    const V0 = measure(); let want = V0; const reach = h0 * 0.75;
    function one() {
      want += V0 * P.rate;
      for (let i = 0; i < nc; i++) if (!cov[i] && !pin[i]) X[i * 3 + 1] -= 0.0012 * P.sag;   // bare skin hangs
      for (let it = 0; it < 4; it++) {
        // the inside presses on every cell alike, up to a most it can press
        const d = Math.max(-0.002, Math.min(P.press, (want - measure()) / area));
        for (let i = 0; i < nc; i++) { if (pin[i]) continue; const l = H(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]) || 1; X[i * 3] += (N[i * 3] / l) * d; X[i * 3 + 1] += (N[i * 3 + 1] / l) * d; X[i * 3 + 2] += (N[i * 3 + 2] / l) * d; }
        for (let e = 0; e < ne; e++) pull(la[e], lb[e], rest[e], bare[e] ? P.soft : P.stiff);
        // covered skin clenches back toward where it started
        for (let i = 0; i < n0; i++) if (cov[i] && !pin[i]) for (let k = 0; k < 3; k++) X[i * 3 + k] += (A[i * 3 + k] - X[i * 3 + k]) * P.clench;
        // bare skin pulls itself round
        if (P.tension) {
          S.fill(0, 0, nc * 3); cnt.fill(0, 0, nc);
          for (let e = 0; e < ne; e++) { if (!bare[e]) continue; const a = la[e], b = lb[e]; if (!cov[a]) { S[a * 3] += X[b * 3]; S[a * 3 + 1] += X[b * 3 + 1]; S[a * 3 + 2] += X[b * 3 + 2]; cnt[a]++; } if (!cov[b]) { S[b * 3] += X[a * 3]; S[b * 3 + 1] += X[a * 3 + 1]; S[b * 3 + 2] += X[a * 3 + 2]; cnt[b]++; } }
          for (let i = 0; i < nc; i++) if (cnt[i] && !pin[i]) for (let k = 0; k < 3; k++) X[i * 3 + k] += (S[i * 3 + k] / cnt[i] - X[i * 3 + k]) * P.tension;
        }
        for (let i = 0; i < nc; i++) if (X[i * 3 + 1] < -1.02) X[i * 3 + 1] = -1.02;
      }
      // bare skin that has come up past the cover gives way to it: it rides over the outer face, not through it
      const grid = new Map(), top = P.thick + 0.01;
      for (let j = 0; j < n0; j++) { if (!cov[j]) continue; const k = (Math.floor(X[j * 3] / reach) + 512) * 1048576 + (Math.floor(X[j * 3 + 1] / reach) + 512) * 1024 + Math.floor(X[j * 3 + 2] / reach) + 512, g = grid.get(k); if (g) g.push(j); else grid.set(k, [j]); }
      for (let i = 0; i < nc; i++) {
        if (cov[i] || pin[i]) continue; const px = X[i * 3], py = X[i * 3 + 1], pz = X[i * 3 + 2], gx = Math.floor(px / reach), gy = Math.floor(py / reach), gz = Math.floor(pz / reach); let up = 0, ux = 0, uy = 0, uz = 0;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
          const g = grid.get((gx + a + 512) * 1048576 + (gy + b + 512) * 1024 + gz + c + 512); if (!g) continue;
          for (const j of g) { const l = H(N[j * 3], N[j * 3 + 1], N[j * 3 + 2]) || 1, nx = N[j * 3] / l, ny = N[j * 3 + 1] / l, nz = N[j * 3 + 2] / l, dx = px - X[j * 3], dy = py - X[j * 3 + 1], dz = pz - X[j * 3 + 2], h = dx * nx + dy * ny + dz * nz;
            if (h >= top || h < P.thick * 0.4 || dx * dx + dy * dy + dz * dz - h * h > reach * reach) continue; if (top - h > up) { up = top - h; ux = nx; uy = ny; uz = nz; } }
        }
        if (up) { X[i * 3] += ux * up; X[i * 3 + 1] += uy * up; X[i * 3 + 2] += uz * up; }
      }
      // a covered link stretched past its limit rips, and there is bare skin where it was
      for (let e = 0; e < m0; e++) { if (bare[e]) continue; const a = la[e], b = lb[e]; if (far(a, b) > rest[e] * (1 + limit[e])) { bare[e] = 1; cov[a]--; cov[b]--; torn[a] = torn[b] = 1; snapped++; divide(e); } }
      // a bare link that is stretched grows to fit, and one grown long enough becomes two
      for (let e = 0, end = ne; e < end; e++) { if (!bare[e]) continue; const len = far(la[e], lb[e]); if (len > rest[e] * 1.03) rest[e] += (len - rest[e]) * P.expanse; if (rest[e] > h0 * 1.5) divide(e); }
      t++;
    }
    // the skin as two things to draw: all of it thin, and over that the cover with its thickness and a wall
    // along every torn edge. The cover stands a little taller at a torn edge.
    function mesh() {
      measure();
      const whole = new Uint8Array(nt), sp = new Float32Array(n0 * 6), si = [];
      for (let q = 0; q < nt; q++) { const a = tri[q * 3], b = tri[q * 3 + 1], c = tri[q * 3 + 2]; if (a >= n0 || b >= n0 || c >= n0) continue; whole[q] = !bare[key.get(K(a, b))] && !bare[key.get(K(b, c))] && !bare[key.get(K(c, a))] ? 1 : 0; }
      for (let i = 0; i < n0; i++) { const l = H(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]) || 1, up = P.thick * (1 + (torn[i] ? P.lip : 0)); for (let k = 0; k < 3; k++) { sp[i * 3 + k] = X[i * 3 + k] + (N[i * 3 + k] / l) * up; sp[(n0 + i) * 3 + k] = X[i * 3 + k] - (N[i * 3 + k] / l) * 0.004; } }
      for (let q = 0; q < nt; q++) { if (!whole[q]) continue; const a = tri[q * 3], b = tri[q * 3 + 1], c = tri[q * 3 + 2]; si.push(a, b, c);
        for (const [u, v] of [[a, b], [b, c], [c, a]]) { const e = key.get(K(u, v)), other = t1[e] === q ? t2[e] : t1[e]; if (!whole[other]) si.push(u, n0 + u, n0 + v, u, n0 + v, v); } }
      let out = 0; for (let i = 0; i < nc; i++) if (!cov[i]) out++;
      return { sheet: { pos: sp, idx: Uint32Array.from(si) }, membrane: { pos: Float32Array.from(X.subarray(0, nc * 3)), idx: Uint32Array.from(tri.subarray(0, nt * 3)) }, snapped, links: m0, out, cells: nc, step: t, recipe: P };
    }
    return { step(k) { for (let i = 0; i < (k || 0); i++) one(); return t; }, mesh, recipe: P };
  }

  function burst(recipe) { const s = start(recipe); s.step(s.recipe.steps); return s.mesh(); }

  const api = { start, burst };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Tear = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
