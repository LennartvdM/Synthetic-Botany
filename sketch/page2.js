// Sketchbook, page 2. A foxglove-style bulb said in thick clay, as five specimens of one kind.
// Throwaway like page 1. Built with the clay kit from cheats/fantastic.js.
(function () {
  const { PI, TAU, H, clamp, sstep, smin, smax, ball, egg, cone, limb, fold } = Fantastic.kit;
  const lerp = (a, b, t) => a + (b - a) * t;
  const WARTS = [[0.6, 0, 0.04], [0.72, 0.42, 0.035], [0.72, -0.42, 0.035], [0.84, 0, 0.045], [0.86, 0.64, 0.03], [0.86, -0.64, 0.03], [0.97, 0.32, 0.04], [0.97, -0.32, 0.04], [1.07, 0, 0.045]];
  // One build. The bell is modelled straight, then read along an arc so it nods. +lx is its lower side.
  function bulb(P) {
    const Cx = P.bx + Math.cos(P.a0) / P.kap, Cy = P.by - Math.sin(P.a0) / P.kap, L = P.L;
    // wall radius: opens fast, runs parallel, opens again at the mouth; bellied on the lower side
    const Rf = (u, cf) => { const uc = clamp(u, 0, 1.2); return (P.base + (P.throat - P.base) * (1 - Math.pow(1 - Math.min(uc / 0.35, 1), 2)) + P.flare * Math.pow(sstep(0.75, 1.1, uc), 2)) * (1 - P.close * sstep(0.55, 1, uc)) * (1 + P.belly * cf * Math.sin(PI * clamp(u, 0, 1))); };
    const tw = (u) => lerp(P.th, P.th * 1.5, clamp(u, 0, 1));
    return (x, y, z) => {
      // a swollen stalk from a mound
      // the five roles: a meaty base with a lipped seat, rooting under it, a few warts on it, and the body on a swollen stalk
      const sx = P.bx - 0.42;
      let d = limb(x, y, z, [[sx, 0.1, 0.16], [sx - 0.08, 0.5, 0.13], [sx + 0.02, P.by - 0.3, 0.115], [P.bx - 0.2, P.by + 0.06, 0.1], [P.bx, P.by, 0.09]]);
      d = smin(d, ball(x, y, z, sx - 0.08, 0.52, 0, 0.165), 0.05);
      d = smin(d, smin(egg(x, y, z, sx, 0.07, 0, 0.42, 0.15, 0.38), H(H(x - sx, z) - 0.22, y - 0.19) - 0.06, 0.03), 0.06);
      const [rx, rz] = fold(x - sx, z, 7, 0.2);
      d = smin(smin(d, limb(rx, y, rz, [[0.3, 0.1, 0.06], [0.52, 0.07, 0.045], [0.7, 0.03, 0.035]]), 0.04), egg(rx, y, rz, 0.74, 0.025, 0, 0.09, 0.03, 0.09), 0.02);
      for (const [wa, wr2, wy2, ws] of [[0.9, 0.36, 0.13, 0.05], [2.6, 0.33, 0.15, 0.04], [4.4, 0.38, 0.12, 0.055], [5.5, 0.3, 0.17, 0.035]]) d = smin(d, ball(x, y, z, sx + wr2 * Math.cos(wa), wy2, wr2 * Math.sin(wa), ws), 0.012);
      // into the bell's own space
      const wx = x - Cx, wy = y - Cy, t = (Math.atan2(wy, -wx) - P.a0) / P.kap, lx = 1 / P.kap - H(wx, wy), q = H(lx, z) || 1e-9, cf = lx / q, f = Math.atan2(z, lx), u = t / L;
      const R = Rf(u, cf), tm = L * (1 + P.pout * Math.pow(Math.max(0, cf), 1.5) - 0.1 * Math.max(0, -cf));
      let b = smax(smax(Math.abs(q - R) - tw(u), t - tm, 0.03), -t - 0.03, 0.03);
      // cords along the outside
      const a = (f * 7) / TAU + 0.25 * Math.sin(6 * u), tv = Math.abs(a - Math.round(a));
      b -= P.va * Math.exp(-((tv / 0.11) ** 2)) * sstep(-0.01, 0.02, q - R) * sstep(0, 0.15, u) * (1 - 0.5 * clamp(u, 0, 1));
      // a rolled lip, fattest on the lower side
      b = smin(b, H(q - (R + 0.01), t - tm) - P.lip * (0.65 + 0.7 * Math.max(0, cf)), 0.035);
      b = smin(b, H(lx, z, t - 0.02) - (P.base + P.th), 0.03);
      // warts inside the lower lip
      for (let j = 0; j < P.warts; j++) { const [wu, wf, wr] = WARTS[j], rr = Rf(wu, Math.cos(wf)) - tw(wu); b = smin(b, H(lx - rr * Math.cos(wf), z - rr * Math.sin(wf), t - wu * L) - wr, 0.012); }
      // fat bracts gripping the base
      const [gx, gz] = fold(lx, z, 5, 0.3), r0 = Rf(0.25, 0);
      b = smin(b, limb(gx, t, gz * 0.55, [[0.03, -0.06, 0.08], [P.base + 0.08, 0.1, 0.085], [r0 + 0.08, 0.28 * L, 0.06], [r0 + 0.14, 0.48 * L, 0.014]]), 0.03);
      // two knobbed prongs under the upper side
      for (const sg of [-1, 1]) { const r1 = Rf(0.2, -1) - 0.07, r2 = Rf(0.78, -1) - 0.08; b = smin(b, cone(lx, t, z, -r1, 0.15 * L, sg * 0.04, -r2, 0.78 * L, sg * 0.07, 0.022, 0.02), 0.02); b = smin(b, H(lx + r2, t - 0.8 * L, z - sg * 0.07) - 0.042, 0.015); }
      return smin(d, b, 0.04);
    };
  }
  const base = { L: 0.9, base: 0.09, throat: 0.3, belly: 0.3, flare: 0.12, close: 0, lip: 0.075, pout: 0.3, th: 0.04, va: 0.032, kap: 1.0, a0: 1.75, bx: -0.2, by: 1.42, warts: 9 };
  const S = [
    ['specimen 1', {}],
    ['squat and fat', { L: 0.7, throat: 0.36, belly: 0.42, lip: 0.09, pout: 0.36, kap: 1.15, a0: 1.9, by: 1.3, va: 0.038 }],
    ['long and lean', { L: 1.08, throat: 0.23, belly: 0.18, flare: 0.16, lip: 0.06, pout: 0.2, kap: 0.8, a0: 1.6, by: 1.5, warts: 7 }],
    ['big pout', { L: 0.85, throat: 0.31, belly: 0.38, flare: 0.22, lip: 0.105, pout: 0.5, kap: 1.2, a0: 1.85, by: 1.42 }],
    ['not open yet', { L: 0.75, throat: 0.29, belly: 0.3, flare: 0, close: 0.74, lip: 0.06, pout: 0.08, th: 0.045, kap: 0.8, a0: 1.5, by: 1.38, warts: 0 }],
  ];
  window.Fantastic = { names: S.map((s) => s[0]), build: (i) => Fantastic.mesh(bulb(Object.assign({}, base, S[i][1])), S[i][0], 0.016, 1.9), mesh: Fantastic.mesh, kit: Fantastic.kit };
})();
