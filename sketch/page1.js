// Sketchbook, page 1. Throwaway. Each sketch takes one term from LANGUAGE.md and pushes it too far.
// Built with the clay kit from cheats/fantastic.js. Nothing here is grown, tested or meant to last.
(function () {
  const { PI, TAU, GA, H, clamp, sstep, smin, smax, ball, egg, cone, limb, fold, plate } = Fantastic.kit;
  const torus = (x, y, z, cy, R, r) => H(H(x, z) - R, y - cy) - r;
  // fat forking cords standing proud of a surface: subtract from a distance
  const vein = (x, y, z, n, amp, cy = 0.5) => { const f = Math.atan2(z, x), a = (f * n) / TAU + 0.3 * Math.sin(5 * y + f), t = Math.abs(a - Math.round(a)), b = (f * 2 * n) / TAU + 0.4 * Math.sin(7 * y), t2 = Math.abs(b - Math.round(b)); return amp * (Math.exp(-((t / 0.1) ** 2)) + 0.6 * clamp((cy - y) * 4, 0, 1) * Math.exp(-((t2 / 0.1) ** 2))); };
  const S = [
    ['fat lip', (x, y, z) => { let d = smax(egg(x, y, z, 0, 0.45, 0, 0.42, 0.45, 0.42), -egg(x, y, z, 0, 0.55, 0, 0.33, 0.45, 0.33), 0.04); return smin(d, torus(x, y - 0.22 * x, z, 0.78, 0.3, 0.14), 0.05); }],
    ['too many teeth', (x, y, z) => { let d = egg(x, y, z, 0, 0.08, 0, 0.4, 0.14, 0.4); const az = Math.abs(z);
      for (const sg of [-1, 1]) { const c = Math.cos(0.3), s = Math.sin(0.3) * sg, xr = x * c - y * s, yr = x * s + y * c, X = sg * xr + 0.04;
        d = smin(d, smax(Math.abs(egg(X, yr, z, 0, 0.66, 0, 0.36, 0.64, 0.46)) - 0.055, 0.02 - X, 0.04), 0.03);
        for (let j = 0; j < 5; j++) { const t = 0.35 + j * 0.55, yy = 0.66 + 0.6 * Math.cos(t), zz = 0.42 * Math.sin(t); d = smin(d, cone(X, yr, az, 0.03, yy, zz, -0.13, yy - 0.03, zz * 0.8, 0.04, 0.008), 0.02); } }
      return d; }],
    ['vein ball', (x, y, z) => smin(ball(x, y, z, 0, 0.52, 0, 0.46) - vein(x, y, z, 7, 0.04), egg(x, y, z, 0, 0.05, 0, 0.3, 0.08, 0.3), 0.08)],
    ['tip parade', (x, y, z) => { let d = egg(x, y, z, 0, 0.06, 0, 0.36, 0.1, 0.36);
      for (const [n, ph, r, h] of [[5, 0, 0.2, 0.9], [5, PI / 5, 0.3, 0.6], [1, 0, 0, 1.2]]) { const [fx, fz] = n > 1 ? fold(x, z, n, ph) : [x, z]; d = smin(d, cone(fx, y, fz, r * 0.7, 0.05, 0, r * 1.1, h, 0, 0.09, 0.07), 0.03); d = smin(d, egg(fx, y, fz, r * 1.12, h + 0.06, 0, 0.14, 0.1, 0.14), 0.02); }
      return d; }],
    ['skirt only', (x, y, z) => { const [fx, fz] = fold(x, z, 11, 0), [gx, gz] = fold(x, z, 11, PI / 11);
      let d = smin(limb(fx, y, fz, [[0.2, 0.14, 0.1], [0.5, 0.08, 0.085], [0.74, 0.1, 0.06], [0.82, 0.24, 0.04]]), limb(gx, y, gz, [[0.2, 0.2, 0.09], [0.4, 0.3, 0.07], [0.5, 0.5, 0.045]]), 0.04);
      return smin(d, torus(x, y, z, 0.16, 0.18, 0.09), 0.05); }],
    ['one-sided comb', (x, y, z) => { const P = [[0, 0, 0.17], [0.04, 0.5, 0.15], [0.22, 0.95, 0.12], [0.52, 1.12, 0.09], [0.78, 0.95, 0.06]]; let d = 1e9;
      for (let i = 0; i < 4; i++) d = smin(d, cone(x, y, z, P[i][0] - 0.3, P[i][1], 0, P[i + 1][0] - 0.3, P[i + 1][1], 0, P[i][2], P[i + 1][2]), 0.03);
      for (let j = 0; j < 7; j++) { const t = 0.2 + j * 0.1, bx = -0.3 + 0.16 + 0.95 * t * t, by = 0.25 + 0.95 * t - 0.25 * t * t; d = smin(d, cone(x, y, z, bx - 0.05, by, 0, bx + 0.14, by - 0.16, 0, 0.045, 0.02), 0.015); }
      return d; }],
    ['stand-off', (x, y, z) => { const [fx, fz] = fold(x, z, 6, 0); let d = ball(x, y, z, 0, 0.55, 0, 0.3);
      d = smin(d, cone(fx, y, fz, 0.25, 0.55, 0, 0.58, 0.58, 0, 0.05, 0.04), 0.03); d = Math.min(d, plate(fx, y, fz, 0, 0.55, 0, 0.64, 0.04, 0.995, 0.1, 0, 0.36, 0.04));
      d = smin(d, cone(x, y, z, 0, 0.8, 0, 0, 1.12, 0, 0.05, 0.04), 0.03); d = Math.min(d, plate(x, y, z, 0, 0.55, 0, 0.64, 0.04, 0, 1, 0, 0.5, 0.04));
      return smin(d, cone(x, y, z, 0, 0, 0, 0, 0.3, 0, 0.12, 0.08), 0.05); }],
    ['gut stack', (x, y, z) => { let d = egg(x, y, z, -0.08, 0.18, 0, 0.52, 0.2, 0.46);
      for (const [cx, cy, cz, rx, ry, rz] of [[0.12, 0.5, 0, 0.42, 0.2, 0.4], [-0.08, 0.8, 0.04, 0.34, 0.18, 0.32], [0.1, 1.06, 0, 0.25, 0.16, 0.24], [-0.02, 1.27, 0, 0.14, 0.11, 0.14]]) d = smin(d, egg(x, y, z, cx, cy, cz, rx, ry, rz), 0.035);
      return d - vein(x, y, z, 5, 0.018, 0.9); }],
    ['knuckle column', (x, y, z) => { let d = cone(x, y, z, 0, 0, 0, 0, 1.2, 0, 0.2, 0.1);
      for (let j = 0; j < 4; j++) { const [fx, fz] = fold(x, z, 7, j * 0.45), y0 = 0.02 + 0.26 * j, r = 0.24 - 0.03 * j; d = smin(d, cone(fx, y, fz, r, y0, 0, r + 0.05, y0 + 0.45, 0, 0.1, 0.085), 0.02); d = smin(d, egg(fx, y, fz, r + 0.06, y0 + 0.5, 0, 0.1, 0.075, 0.1), 0.015); }
      return d; }],
    ['organ pipes', (x, y, z) => { let d = egg(x, y, z, 0, 0.05, 0, 0.6, 0.1, 0.6);
      const pipe = (px, py, pz, r, h) => smax(cone(px, py, pz, r, 0, 0, r * 1.08, h, 0, 0.14, 0.13), -cone(px, py, pz, r * 1.07, h - 0.35, 0, r * 1.08, h + 0.2, 0, 0.085, 0.095), 0.02);
      const [fx, fz] = fold(x, z, 5, 0), [gx, gz] = fold(x, z, 5, PI / 5);
      return smin(smin(smin(d, pipe(fx, y, fz, 0.27, 0.95), 0.02), pipe(gx, y, gz, 0.46, 0.55), 0.02), smax(cone(x, y, z, 0, 0, 0, 0, 1.3, 0, 0.14, 0.13), -cone(x, y, z, 0, 0.95, 0, 0, 1.5, 0, 0.085, 0.095), 0.02), 0.02); }],
    ['belly on legs', (x, y, z) => { const [fx, fz] = fold(x, z, 5, 0.3); let d = egg(x, y, z, 0, 0.82, 0, 0.56, 0.5, 0.52) - vein(x, y, z, 6, 0.03, 0.8);
      return smin(smin(d, limb(fx, y, fz, [[0.18, 0.45, 0.055], [0.3, 0.2, 0.04], [0.38, 0.03, 0.035]]), 0.03), egg(fx, y, fz, 0.4, 0.025, 0, 0.1, 0.03, 0.1), 0.02); }],
    ['double chin', (x, y, z) => { let d = egg(x, y, z, 0, 0.85, 0, 0.38, 0.5, 0.38); for (const [cy, R, r] of [[0.46, 0.27, 0.13], [0.28, 0.34, 0.13], [0.11, 0.41, 0.11]]) d = smin(d, torus(x + 0.05 * (cy - 0.3), y, z, cy, R, r), 0.025); return d; }],
    ['seats', (x, y, z) => { let d = egg(x, y, z, 0, 0.05, 0, 0.8, 0.15, 0.62);
      for (const [cx, cz, k] of [[-0.38, 0.05, 1.15], [0.2, 0.22, 1], [0.34, -0.26, 0.8]]) { const px = (x - cx) / k, pz = (z - cz) / k, py = y / k; d = smin(d, smin(torus(px, py, pz, 0.17, 0.2, 0.06), smin(torus(px, py, pz, 0.24, 0.12, 0.05), ball(px, py, pz, 0, 0.26, 0, 0.07), 0.02), 0.02) * k, 0.03); }
      return d; }],
    ['nest pod', (x, y, z) => { const [fx, fz] = fold(x, z, 7, 0), [gx, gz] = fold(x, z, 7, PI / 7); let d = egg(x, y, z, 0, 0.68, 0, 0.33, 0.56, 0.33);
      d = smin(d, limb(fx, y, fz * 0.6, [[0.12, 0.05, 0.1], [0.42, 0.22, 0.085], [0.5, 0.55, 0.05], [0.42, 0.85, 0.012]]), 0.03);
      return smin(d, limb(gx, y, gz * 0.6, [[0.14, 0.04, 0.1], [0.5, 0.1, 0.08], [0.66, 0.32, 0.045], [0.64, 0.52, 0.012]]), 0.03); }],
    ['twist trunks', (x, y, z) => { let d = egg(x, y, z, 0, 0.05, 0, 0.4, 0.1, 0.4);
      for (let k = 0; k < 3; k++) { const a = (k * TAU) / 3 + 2.4 * y, R = 0.17 - 0.03 * y, t = smax(H(x - R * Math.cos(a), z - R * Math.sin(a)) - (0.15 - 0.045 * y), y - 1.35, 0.05); d = smin(d, t, 0.025); const e = (k * TAU) / 3 + 2.4 * 1.38; d = smin(d, ball(x, y, z, 0.13 * Math.cos(e), 1.4, 0.13 * Math.sin(e), 0.13), 0.03); }
      return d; }],
    ['hood', (x, y, z) => { let d = smax(Math.abs(egg(x, y, z, 0, 0.6, 0, 0.42, 0.62, 0.44)) - 0.05, -ball(x, y, z, 0.48, 0.6, 0, 0.34), 0.05);
      d = smin(d, limb(x, y, z, [[0.0, 1.16, 0.13], [0.2, 1.3, 0.1], [0.42, 1.2, 0.07], [0.5, 1.02, 0.04]]), 0.05); return smin(d, ball(x, y, z, -0.02, 0.5, 0, 0.2), 0.02); }],
    ['bead tassel', (x, y, z) => { let d = smin(ball(x, y, z, 0, 1.3, 0, 0.12), cone(x, y, z, 0, 1.3, 0, 0, 1.65, 0, 0.04, 0.03), 0.03);
      for (const [n, ph, r, yy] of [[9, 0, 0.36, 0.45], [9, PI / 9, 0.24, 0.3], [5, 0.2, 0.1, 0.18]]) { const [fx, fz] = fold(x, z, n, ph); d = smin(d, limb(fx, y, fz, [[0.05, 1.25, 0.022], [r * 0.8, 0.95, 0.018], [r, yy + 0.05, 0.016]]), 0.015); d = smin(d, ball(fx, y, fz, r, yy, 0, 0.055), 0.01); }
      return d; }],
    ['scale string', (x, y, z) => { let d = cone(x, y, z, 0, 0.25, 0, 0, 1.65, 0, 0.03, 0.03);
      for (let j = 0; j < 7; j++) { const a = j * 2.4, k = 1 - 0.07 * j, cy = 1.45 - 0.2 * j, cx = 0.1 * Math.cos(a), cz = 0.1 * Math.sin(a); d = smin(d, egg(x - cx, y, z - cz, 0.07 * Math.cos(a), cy, 0.07 * Math.sin(a), 0.19 * k, 0.15 * k, 0.19 * k), 0.012); }
      return d; }],
    ['pursed mouth', (x, y, z) => { const f = Math.atan2(z, x), pk = 0.035 * Math.cos(11 * f) * sstep(0.7, 1.0, y);
      let d = smin(egg(x, y, z, 0, 0.48, 0, 0.5, 0.46, 0.5), cone(x, y, z, 0, 0.8, 0, 0, 1.0, 0, 0.24, 0.15), 0.1) + pk;
      return smax(smin(d, torus(x, y, z, 1.02, 0.12, 0.075) + pk, 0.04), -cone(x, y, z, 0, 0.85, 0, 0, 1.2, 0, 0.05, 0.075), 0.03); }],
    ['slit grin', (x, y, z) => { const sl = Math.max(Math.abs(y - 0.58 - 0.12 * z * z) - 0.13 * (1 - (z / 0.44) ** 2), -x);
      return smin(smax(Math.abs(egg(x, y, z, 0, 0.55, 0, 0.5, 0.5, 0.46)) - 0.06, -sl, 0.03), ball(x, y, z, 0.1, 0.56, 0, 0.36), 0.01); }],
    ['crown too big', (x, y, z) => { const [fx, fz] = fold(x, z, 7, 0); let d = smin(ball(x, y, z, 0, 0.55, 0, 0.17), cone(x, y, z, 0, 0, 0, 0, 0.4, 0, 0.1, 0.07), 0.05);
      d = smin(d, limb(fx, y, fz, [[0.05, 0.22, 0.075], [0.42, 0.3, 0.065], [0.62, 0.7, 0.055], [0.52, 1.1, 0.045], [0.32, 1.32, 0.035]]), 0.03); return smin(d, ball(fx, y, fz, 0.3, 1.36, 0, 0.085), 0.02); }],
    ['tongue out', (x, y, z) => { const sl = Math.max(Math.abs(y - 0.5) - 0.1 * (1 - (z / 0.4) ** 2), -x);
      let d = smax(Math.abs(egg(x, y, z, 0, 0.5, 0, 0.5, 0.45, 0.45)) - 0.07, -sl, 0.03);
      return smin(smin(d, ball(x, y, z, 0, 0.5, 0, 0.3), 0.01), limb(x, y, z / 2.2, [[0.15, 0.5, 0.075], [0.6, 0.47, 0.07], [0.84, 0.28, 0.065], [0.93, 0.07, 0.05]]), 0.02); }],
    ['rooting', (x, y, z) => { const [fx, fz] = fold(x, z, 9, 0), [gx, gz] = fold(x, z, 5, 0.3); let d = ball(x, y, z, 0, 0.32, 0, 0.13);
      d = smin(d, limb(fx, y, fz, [[0.08, 0.3, 0.05], [0.42, 0.24, 0.036], [0.76, 0.05, 0.03]]), 0.03); d = smin(d, egg(fx, y, fz, 0.82, 0.03, 0, 0.11, 0.035, 0.11), 0.02);
      d = smin(d, limb(gx, y, gz, [[0.06, 0.36, 0.045], [0.26, 0.52, 0.035], [0.5, 0.3, 0.028], [0.56, 0.05, 0.026]]), 0.03); return smin(d, egg(gx, y, gz, 0.58, 0.03, 0, 0.09, 0.03, 0.09), 0.02); }],
    ['crater cluster', (x, y, z) => { const v = (px, py, pz, k) => smax(cone(px, py, pz, 0, 0, 0, 0, 0.34 * k, 0, 0.26 * k, 0.12 * k) + 0.012 * Math.cos(7 * Math.atan2(pz, px)), -ball(px, py, pz, 0, 0.38 * k, 0, 0.1 * k), 0.02);
      const [fx, fz] = fold(x, z, 4, 0.3); return smin(smin(v(x, y, z, 1.45), v(fx - 0.42, y, fz, 1), 0.03), v(fold(x, z, 4, 0.3 + PI / 4)[0] - 0.66, y, fold(x, z, 4, 0.3 + PI / 4)[1], 0.65), 0.03); }],
  ];
  const names = S.map((s) => s[0]);
  window.Fantastic = { names, build: (i) => Fantastic.mesh(S[i][1], S[i][0], 0.021, 1.75), mesh: Fantastic.mesh, kit: Fantastic.kit };
})();
