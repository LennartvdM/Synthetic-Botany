// Asset kinds. Each kind is a build plus the ways its specimens differ, and each specimen is delivered
// as separate parts by role: body, base, rooting, flourish. (No kind has a moving part yet.)
// Masters are dense on purpose; a low-poly pass comes later. Sculpted, not grown.
// Works as a plain <script> after cheats/fantastic.js, and in Node.
(function (root) {
  'use strict';
  const F = root.Fantastic || require('../cheats/fantastic.js');
  const { PI, TAU, GA, H, clamp, sstep, smin, smax, ball, egg, cone, limb, fold, plate } = F.kit;
  const lerp = (a, b, t) => a + (b - a) * t;
  function rng(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---- shared pieces
  const WARTS = [[0.6, 0, 0.04], [0.72, 0.42, 0.035], [0.72, -0.42, 0.035], [0.84, 0, 0.045], [0.86, 0.64, 0.03], [0.86, -0.64, 0.03], [0.97, 0.32, 0.04], [0.97, -0.32, 0.04], [1.07, 0, 0.045]];
  // a nodding bell in its own space: base at the origin, leaving along +x, lower side bellied and lipped
  function bell(P) {
    const Cx = Math.cos(P.a0) / P.kap, Cy = -Math.sin(P.a0) / P.kap, L = P.L;
    const Rf = (u, cf) => { const uc = clamp(u, 0, 1.2); return (P.base + (P.throat - P.base) * (1 - Math.pow(1 - Math.min(uc / 0.35, 1), 2)) + P.flare * Math.pow(sstep(0.75, 1.1, uc), 2)) * (1 + P.belly * cf * Math.sin(PI * clamp(u, 0, 1))); };
    const tw = (u) => lerp(P.th, P.th * 1.5, clamp(u, 0, 1));
    return (x, y, z) => {
      const wx = x - Cx, wy = y - Cy, t = (Math.atan2(wy, -wx) - P.a0) / P.kap, lx = 1 / P.kap - H(wx, wy), q = H(lx, z) || 1e-9, cf = lx / q, f = Math.atan2(z, lx), u = t / L;
      const R = Rf(u, cf), tm = L * (1 + P.pout * Math.pow(Math.max(0, cf), 1.5) - 0.1 * Math.max(0, -cf));
      let b = smax(smax(Math.abs(q - R) - tw(u), t - tm, 0.03), -t - 0.03, 0.03);
      const a = (f * 7) / TAU + 0.25 * Math.sin(6 * u), tv = Math.abs(a - Math.round(a));
      b -= P.va * Math.exp(-((tv / 0.11) ** 2)) * sstep(-0.01, 0.02, q - R) * sstep(0, 0.15, u) * (1 - 0.5 * clamp(u, 0, 1));
      b = smin(b, H(q - (R + 0.01), t - tm) - P.lip * (0.65 + 0.7 * Math.max(0, cf)), 0.035);
      b = smin(b, H(lx, z, t - 0.02) - (P.base + P.th), 0.03);
      for (const [wu, wf, wr] of WARTS) { const rr = Rf(wu, Math.cos(wf)) - tw(wu); b = smin(b, H(lx - rr * Math.cos(wf), z - rr * Math.sin(wf), t - wu * L) - wr, 0.012); }
      const [gx, gz] = fold(lx, z, 5, 0.3), r0 = Rf(0.25, 0);
      b = smin(b, limb(gx, t, gz * 0.55, [[0.03, -0.06, 0.08], [P.base + 0.08, 0.1, 0.085], [r0 + 0.08, 0.28 * L, 0.06], [r0 + 0.14, 0.48 * L, 0.014]]), 0.03);
      return smin(b, cone(x, y, z, -0.12, 0.05, 0, 0, 0, 0, 0.085, 0.075), 0.03);
    };
  }
  // a fleshy tongue lying on a rounded body: longer on its downhill side, fat rolled edge, cords along it,
  // tip lifting away. Used instead of a flat round plate, which reads as geometry and not as flesh.
  function tongue(x, y, z, cx, cy, cz, R, th, dx, dy, dz, wid, stretch, lift, va) {
    const px = x - cx, py = y - cy, pz = z - cz, l = H(px, py, pz) || 1e-9, nx = px / l, ny = py / l, nz = pz / l;
    let e1 = [dx * dy, dy * dy - 1, dz * dy]; const el = H(e1[0], e1[1], e1[2]); e1 = el > 0.05 ? e1.map((v) => v / el) : [1, 0, 0];
    const e2 = [dy * e1[2] - dz * e1[1], dz * e1[0] - dx * e1[2], dx * e1[1] - dy * e1[0]];
    const ang = Math.acos(clamp(nx * dx + ny * dy + nz * dz, -1, 1)), az = Math.atan2(nx * e2[0] + ny * e2[1] + nz * e2[2], nx * e1[0] + ny * e1[1] + nz * e1[2]);
    const down = Math.pow(Math.max(0, Math.cos(az)), 1.5), A = wid * (1 + stretch * down), q = ang / A, Rs = R + lift * Math.pow(clamp(q, 0, 1.2), 3) * down;
    let b = smax(Math.abs(l - Rs) - th * (1 - 0.35 * q * q), (ang - A) * l, 0.05);
    const t = Math.abs(az / 0.45 - Math.round(az / 0.45));
    b -= va * Math.exp(-((t / 0.2) ** 2)) * sstep(0.15, 0.55, q) * sstep(-0.01, 0.02, l - Rs);
    return smin(b, H(l - Rs, (ang - A) * l) - th * (0.75 + 0.5 * down), 0.035);
  }
  // base: a meaty mound with a lipped seat and a few lumps round its edge
  const baseSDF = (o) => (x0, y, z) => {
    const x = x0 - o.cx;
    let d = smin(egg(x, y, z, 0, 0.07, 0, o.R, 0.15, o.R * 0.9), H(H(x, z) - o.seat, y - 0.19) - 0.06, 0.03);
    d = smin(d, H(H(x, z) - o.seat * 0.55, y - 0.2) - 0.035, 0.03);
    for (const [a, s] of o.lumps) d = smin(d, egg(x, y, z, o.R * 0.82 * Math.cos(a), 0.09, o.R * 0.74 * Math.sin(a), s, s * 0.75, s), 0.05);
    return d;
  };
  // rooting: limbs of different lengths from one knot, each ending in a flared foot
  const rootSDF = (o) => (x0, y, z) => {
    const x = x0 - o.cx;
    let d = egg(x, y, z, 0, 0.05, 0, 0.2, 0.06, 0.2);
    for (const [a, L, t] of o.roots) {
      const rx = x * Math.cos(a) + z * Math.sin(a), rz = z * Math.cos(a) - x * Math.sin(a), e = 0.15 + 0.62 * L;
      d = smin(d, smin(limb(rx, y, rz, [[0.12, 0.09, t], [0.15 + 0.3 * L, 0.11, t * 0.85], [e, 0.035, t * 0.6]]), egg(rx, y, rz, e + 0.04, 0.025, 0, t * 1.9, 0.03, t * 1.9), 0.02), 0.03);
    }
    return d;
  };
  // flourishes, each about one unit across; they are shrunk when placed
  const FLOURISH = {
    warts: (x, y, z) => smin(smin(ball(x, y, z, 0, 0.3, 0, 0.36), ball(x, y, z, 0.4, 0.2, 0.1, 0.25), 0.04), smin(ball(x, y, z, -0.3, 0.18, 0.27, 0.23), ball(x, y, z, -0.1, 0.15, -0.38, 0.21), 0.04), 0.04),
    craters: (x, y, z) => { const v = (px, py, pz, k) => smax(cone(px, py, pz, 0, 0, 0, 0, 0.5 * k, 0, 0.36 * k, 0.17 * k) + 0.016 * Math.cos(7 * Math.atan2(pz, px)), -ball(px, py, pz, 0, 0.56 * k, 0, 0.14 * k), 0.03); return smin(smin(v(x, y, z, 1), v(x - 0.46, y, z - 0.1, 0.7), 0.04), v(x + 0.3, y, z + 0.36, 0.6), 0.04); },
    beads: (x, y, z) => { let d = egg(x, y, z, 0, 0.04, 0, 0.3, 0.08, 0.3); for (const [a, r, h, s] of [[0, 0.02, 0.62, 0.2], [2.2, 0.26, 0.42, 0.15], [4.3, 0.24, 0.3, 0.12]]) { const bx = r * Math.cos(a), bz = r * Math.sin(a); d = smin(d, smin(cone(x, y, z, bx * 0.5, 0.04, bz * 0.5, bx, h, bz, 0.07, 0.05), ball(x, y, z, bx, h + s * 0.6, bz, s), 0.03), 0.04); } return d; },
  };
  const roots = (r, n, lo, hi, t) => { const out = []; for (let i = 0; i < n; i++) out.push([(TAU * i) / n + (r() - 0.5) * 0.5, lerp(lo, hi, r()), t * lerp(0.8, 1.2, r())]); return out; };
  const lumps = (r, n) => { const out = []; for (let i = 0; i < n; i++) out.push([r() * TAU, lerp(0.07, 0.13, r())]); return out; };

  // ---- the kinds. make(r) draws one specimen: r() is its own stream of numbers, so a specimen is repeatable
  const KINDS = [
    { name: 'pout bell', flourish: 'warts', specimens: 5, make(r) {
      const u = (a, b) => lerp(a, b, r()), cx = -0.5, k = u(0.85, 1.12), hgt = u(1.1, 1.45), lean = u(-0.12, 0.12);
      const f = bell({ L: u(0.72, 1.05), base: 0.09, throat: u(0.25, 0.36), belly: u(0.2, 0.42), flare: u(0.08, 0.22), lip: u(0.07, 0.105), pout: u(0.2, 0.5), th: 0.045, va: 0.035, kap: u(0.85, 1.2), a0: u(1.65, 2.0) });
      const bx = cx + 0.18 + lean, kn = u(0.35, 0.5);
      return { top: 2.0, base: { cx, R: u(0.38, 0.46), seat: 0.22, lumps: lumps(r, 3) }, roots: { cx, roots: roots(r, 5 + Math.floor(r() * 4), 0.6, 1, 0.055) },
        body: (x, y, z) => { let d = limb(x, y, z, [[cx, 0.12, 0.16], [cx + lean * 0.6 - 0.07, hgt * kn, 0.13], [cx + lean - 0.02, hgt * 0.78, 0.115], [bx - 0.12, hgt + 0.05, 0.1], [bx, hgt, 0.09]]);
          d = smin(d, ball(x, y, z, cx + lean * 0.6 - 0.07, hgt * kn + 0.02, 0, 0.165), 0.05); return smin(d, f((x - bx) / k, (y - hgt) / k, z / k) * k, 0.04); } };
    } },
    { name: 'knuckle bundle', flourish: 'craters', specimens: 5, make(r) {
      const u = (a, b) => lerp(a, b, r()), J = 2 + Math.floor(r() * 3), fr = u(0.085, 0.12), lean = u(-0.16, 0.16), ld = u(0, TAU), pad = u(1.05, 1.5), rise = u(0.22, 0.3), sk = u(0.5, 0.62);
      return { top: 2.05, base: { cx: 0, R: u(0.44, 0.54), seat: 0.3, lumps: lumps(r, 4) }, roots: { cx: 0, roots: roots(r, 4 + Math.floor(r() * 3), 0.7, 1, 0.07) },
        body: (x0, y, z0) => { const x = x0 - lean * y * y * Math.cos(ld), z = z0 - lean * y * y * Math.sin(ld);
          let d = cone(x, y, z, 0, 0.1, 0, 0, 0.3 + rise * J, 0, 0.2, 0.09);
          for (let j = 0; j < J; j++) { const [fx, fz] = fold(x, z, 8 - j, j * 0.45 + ld), y0 = 0.1 + rise * j, rr = 0.27 - 0.035 * j, len = 0.42 + 0.06 * ((j * 7) % 3);
            d = smin(d, cone(fx, y, fz, rr, y0, 0, rr + 0.05, y0 + len, 0, fr, fr * 0.85), 0.02); d = smin(d, egg(fx, y, fz, rr + 0.06, y0 + len + 0.05, 0, fr * pad, fr * pad * 0.75, fr * pad), 0.015); }
          const [sx, sz] = fold(x, z, 9, ld + 0.2);
          d = smin(d, limb(sx, y, sz, [[0.22, 0.22, fr], [sk * 0.75, 0.22, fr * 0.9], [sk, 0.11, fr * 0.75]]), 0.03); return smin(d, egg(sx, y, sz, sk + 0.03, 0.09, 0, fr * pad * 0.85, fr * pad * 0.6, fr * pad * 0.85), 0.015); } };
    } },
    { name: 'tongue dome', flourish: 'warts', specimens: 5, make(r) {
      const u = (a, b) => lerp(a, b, r()), n = 7 + Math.floor(r() * 4), ry = u(0.4, 0.52), cx = u(-0.06, 0.06), ph = u(0, TAU), cy = 0.2 + ry, sag = u(0.06, 0.14), lean = u(-0.1, 0.1), tuft = u(0.22, 0.36);
      const T = []; for (let k = 0; k < n; k++) T.push([u(0.46, 0.66), u(0.45, 0.95), u(0.04, 0.12), u(0.045, 0.06)]);
      return { top: 1.8, base: { cx, R: u(0.5, 0.6), seat: 0.36, lumps: lumps(r, 4) }, roots: { cx, roots: roots(r, 6 + Math.floor(r() * 3), 0.6, 0.95, 0.055) },
        body: (x0, y, z) => { const x = x0 - lean * y * y;
          // a heavy body: wider low down, with a neck where it meets the seat and cords under the tongues
          let d = smin(egg(x, y, z, cx, cy, 0, 0.45, ry, 0.45), egg(x, y, z, cx, cy - ry * 0.45, 0, 0.5, ry * 0.55, 0.5), 0.12);
          d = smin(d, egg(x, y, z, cx, 0.13, 0, 0.3, 0.14, 0.3), 0.07);
          const f0 = Math.atan2(z, x - cx), a = (f0 * 6) / TAU + 0.3 * Math.sin(6 * y), tv = Math.abs(a - Math.round(a)); d -= 0.022 * Math.exp(-((tv / 0.12) ** 2)) * sstep(0.2, 0.5, y);
          for (let k = 0; k < n; k++) { const th = Math.min(1.75, 0.2 + 1.5 * Math.pow(k / (n - 1), 0.8)), f = k * GA + ph, dx = Math.sin(th) * Math.cos(f), dy = Math.cos(th), dz = Math.sin(th) * Math.sin(f), [wid, st, lf, tk] = T[k];
            d = smin(d, tongue(x, y, z, cx + dx * 0.05, cy + dy * 0.05 - sag * Math.sin(th), dz * 0.05, lerp(0.47, ry, dy * dy) + 0.075 - 0.006 * k, tk, dx, dy, dz, wid, st, lf, 0.018), 0.018); }
          // a few fat capped fingers on top, of the same family as the knuckle bundle
          const [tx, tz] = fold(x - cx, z, 3, ph), ty = cy + ry * 0.9;
          d = smin(d, cone(tx, y, tz, 0.05, ty, 0, 0.15, ty + tuft, 0, 0.085, 0.07), 0.04); return smin(d, egg(tx, y, tz, 0.16, ty + tuft + 0.04, 0, 0.11, 0.085, 0.11), 0.02); } };
    } },
  ];

  // turn a mesh result into a plain part
  const part = (role, m) => ({ role, pos: m.pos, idx: m.idx, nrm: m.nrm, tone: m.tone });
  const flourishCache = {};
  // one specimen of one kind, as parts. h is the mesh cell size: smaller is denser.
  function specimen(ki, si, h = 0.016) {
    const K = KINDS[ki], r = rng(ki * 1000 + si * 37 + 11), S = K.make(r);
    const body = F.mesh(S.body, 'body', h, S.top), base = F.mesh(baseSDF(S.base), 'base', h, 0.5), rooting = F.mesh(rootSDF(S.roots), 'rooting', h, 0.4);
    // flourish: small clusters placed where the form is sheltered and low. Never out in the open, never underneath.
    const key = K.flourish + h, fm = flourishCache[key] || (flourishCache[key] = F.mesh(FLOURISH[K.flourish], 'flourish', Math.max(0.016, h * 1.1), 1.1));
    const spots = [], want = 3 + Math.floor(r() * 3);
    for (const src of [base, body]) { const n = src.tone.length;
      for (let tries = 0; tries < 4000 && spots.length < want; tries++) {
        const q = Math.floor(r() * n), y = src.pos[q * 3 + 1], t = src.tone[q], ny = src.nrm[q * 3 + 1];
        if (y < 0.06 || y > 0.8 || t < 0.5 || t > 0.86 || ny < -0.05) continue;
        const p = [src.pos[q * 3], y, src.pos[q * 3 + 2]];
        if (spots.some((s) => H(s.p[0] - p[0], s.p[1] - p[1], s.p[2] - p[2]) < 0.3)) continue;
        spots.push({ p, n: [src.nrm[q * 3], ny, src.nrm[q * 3 + 2]], s: lerp(0.17, 0.27, r()), a: r() * TAU });
        if (src === base && spots.length >= Math.ceil(want / 2)) break;
      } }
    const fp = [], fn = [], ft = [], fi = [];
    for (const s of spots) {
      const Y = s.n, A = Math.abs(Y[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]; let X = [A[1] * Y[2] - A[2] * Y[1], A[2] * Y[0] - A[0] * Y[2], A[0] * Y[1] - A[1] * Y[0]]; const xl = H(...X); X = X.map((v) => v / xl);
      let Z = [X[1] * Y[2] - X[2] * Y[1], X[2] * Y[0] - X[0] * Y[2], X[0] * Y[1] - X[1] * Y[0]]; const c = Math.cos(s.a), sn = Math.sin(s.a), X2 = X.map((v, i) => v * c + Z[i] * sn); Z = Z.map((v, i) => v * c - X[i] * sn);
      const b = fp.length / 3;
      for (let q = 0; q < fm.tone.length; q++) { const lx = fm.pos[q * 3], ly = fm.pos[q * 3 + 1] - 0.06, lz = fm.pos[q * 3 + 2], nx = fm.nrm[q * 3], ny = fm.nrm[q * 3 + 1], nz = fm.nrm[q * 3 + 2];
        for (let i = 0; i < 3; i++) { fp.push(s.p[i] + s.s * (lx * X2[i] + ly * Y[i] + lz * Z[i])); fn.push(nx * X2[i] + ny * Y[i] + nz * Z[i]); } ft.push(fm.tone[q]); }
      for (let q = 0; q < fm.idx.length; q++) fi.push(fm.idx[q] + b);
    }
    const flourish = { role: 'flourish', pos: Float32Array.from(fp), idx: Uint32Array.from(fi), nrm: Float32Array.from(fn), tone: Float32Array.from(ft) };
    return { kind: K.name, specimen: si, parts: [part('body', body), part('base', base), part('rooting', rooting), flourish], placements: spots.map((s) => ({ at: s.p, facing: s.n, size: s.s, turn: s.a })) };
  }

  const api = { kinds: KINDS.map((k) => ({ name: k.name, specimens: k.specimens })), specimen };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Kinds = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
