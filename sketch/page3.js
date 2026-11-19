// Sketchbook, page 3. The bulbs of page 2 threaded on the string of page 1: once standing, once hanging.
// Throwaway like the other pages. Built with the clay kit from cheats/fantastic.js.
(function () {
  const { PI, TAU, H, clamp, sstep, smin, smax, ball, egg, cone, limb, fold } = Fantastic.kit;
  const lerp = (a, b, t) => a + (b - a) * t;
  const WARTS = [[0.6, 0, 0.04], [0.72, 0.42, 0.035], [0.72, -0.42, 0.035], [0.84, 0, 0.045], [0.86, 0.64, 0.03], [0.86, -0.64, 0.03], [0.97, 0.32, 0.04], [0.97, -0.32, 0.04], [1.07, 0, 0.045]];
  // one bulb in its own space: base near the origin, leaving along +x and nodding downward
  function bell(P) {
    const Cx = P.bx + Math.cos(P.a0) / P.kap, Cy = P.by - Math.sin(P.a0) / P.kap, L = P.L;
    const Rf = (u, cf) => { const uc = clamp(u, 0, 1.2); return (P.base + (P.throat - P.base) * (1 - Math.pow(1 - Math.min(uc / 0.35, 1), 2)) + P.flare * Math.pow(sstep(0.75, 1.1, uc), 2)) * (1 - P.close * sstep(0.55, 1, uc)) * (1 + P.belly * cf * Math.sin(PI * clamp(u, 0, 1))); };
    const tw = (u) => lerp(P.th, P.th * 1.5, clamp(u, 0, 1));
    return (x, y, z) => {
      const wx = x - Cx, wy = y - Cy, t = (Math.atan2(wy, -wx) - P.a0) / P.kap, lx = 1 / P.kap - H(wx, wy), q = H(lx, z) || 1e-9, cf = lx / q, f = Math.atan2(z, lx), u = t / L;
      const R = Rf(u, cf), tm = L * (1 + P.pout * Math.pow(Math.max(0, cf), 1.5) - 0.1 * Math.max(0, -cf));
      let b = smax(smax(Math.abs(q - R) - tw(u), t - tm, 0.03), -t - 0.03, 0.03);
      const a = (f * 7) / TAU + 0.25 * Math.sin(6 * u), tv = Math.abs(a - Math.round(a));
      b -= P.va * Math.exp(-((tv / 0.11) ** 2)) * sstep(-0.01, 0.02, q - R) * sstep(0, 0.15, u) * (1 - 0.5 * clamp(u, 0, 1));
      b = smin(b, H(q - (R + 0.01), t - tm) - P.lip * (0.65 + 0.7 * Math.max(0, cf)), 0.035);
      b = smin(b, H(lx, z, t - 0.02) - (P.base + P.th), 0.03);
      for (let j = 0; j < P.warts; j++) { const [wu, wf, wr] = WARTS[j], rr = Rf(wu, Math.cos(wf)) - tw(wu); b = smin(b, H(lx - rr * Math.cos(wf), z - rr * Math.sin(wf), t - wu * L) - wr, 0.012); }
      const [gx, gz] = fold(lx, z, 5, 0.3), r0 = Rf(0.25, 0);
      b = smin(b, limb(gx, t, gz * 0.55, [[0.03, -0.06, 0.08], [P.base + 0.08, 0.1, 0.085], [r0 + 0.08, 0.28 * L, 0.06], [r0 + 0.14, 0.48 * L, 0.014]]), 0.03);
      return smin(b, cone(x, y, z, -0.12, 0.05, 0, P.bx, P.by, 0, 0.085, 0.075), 0.03);
    };
  }
  const base = { L: 0.9, base: 0.09, throat: 0.3, belly: 0.3, flare: 0.12, close: 0, lip: 0.075, pout: 0.3, th: 0.045, va: 0.032, kap: 1.0, a0: 1.75, bx: 0.12, by: 0, warts: 9 };
  // ten bulbs round one string, a fixed turn apart, graded from large and open to small and shut
  function string(hang) {
    const bells = [];
    for (let j = 0; j < 10; j++) {
      const g = j / 9, k = 0.47 * (1 - 0.6 * g), ang = j * 2.4, y0 = hang ? 1.68 - 1.3 * g : 0.47 + 1.3 * g, shut = sstep(0.5, 0.95, g);
      const P = Object.assign({}, base, { a0: 1.95 - 0.35 * g, close: 0.74 * shut, flare: 0.14 * (1 - shut), pout: (0.3 + 0.12 * Math.sin(j * 1.7)) * (1 - 0.7 * shut), belly: 0.3 + 0.1 * Math.cos(j * 2.3), warts: shut > 0.3 ? 0 : 9 });
      const c = Math.cos(ang), s = Math.sin(ang);
      bells.push({ f: bell(P), k, y0, c, s, ox: c * 0.45 * k, oy: y0 - 0.25 * k, oz: s * 0.45 * k, rad: 0.98 * k });
    }
    return (x, y, z) => {
      let d;
      if (hang) d = smin(limb(x, y, z, [[0.02, 1.98, 0.11], [-0.03, 1.4, 0.085], [0.03, 0.8, 0.06], [0, 0.3, 0.03]]), egg(x, y, z, 0.02, 1.97, 0, 0.3, 0.09, 0.3), 0.06);
      else {
        d = limb(x, y, z, [[0, 0.1, 0.13], [0.03, 0.7, 0.095], [-0.03, 1.3, 0.065], [0.01, 1.9, 0.03]]);
        d = smin(d, smin(egg(x, y, z, 0, 0.07, 0, 0.42, 0.15, 0.38), H(H(x, z) - 0.22, y - 0.19) - 0.06, 0.03), 0.06);
        const [rx, rz] = fold(x, z, 7, 0.2);
        d = smin(smin(d, limb(rx, y, rz, [[0.3, 0.1, 0.06], [0.52, 0.07, 0.045], [0.7, 0.03, 0.035]]), 0.04), egg(rx, y, rz, 0.74, 0.025, 0, 0.09, 0.03, 0.09), 0.02);
        for (const [wa, wr, wy, ws] of [[0.9, 0.36, 0.13, 0.05], [2.6, 0.33, 0.15, 0.04], [4.4, 0.38, 0.12, 0.055], [5.5, 0.3, 0.17, 0.035]]) d = smin(d, ball(x, y, z, wr * Math.cos(wa), wy, wr * Math.sin(wa), ws), 0.012);
      }
      for (const B of bells) {
        if (H(x - B.ox, y - B.oy, z - B.oz) - B.rad > 0.12) continue;
        d = smin(d, B.f((x * B.c + z * B.s) / B.k, (y - B.y0) / B.k, (z * B.c - x * B.s) / B.k) * B.k, 0.02);
      }
      return d;
    };
  }
  const S = [['standing', string(false)], ['hanging', string(true)]];
  window.Fantastic = { names: S.map((s) => s[0]), build: (i) => Fantastic.mesh(S[i][1], S[i][0], 0.015, 2.1), mesh: Fantastic.mesh, kit: Fantastic.kit };
})();
