// Foliage as plumes at the branch tips, not a canopy scattered along the wood.
//
// The references are Ori: long sinuous dark branches, each ending in one pale feathery spray, and the crown is a
// few big soft masses rather than a continuous dome. That suits this tree, whose shoots already end in horns --
// a horn is a tip, and a tip takes a plume.
//
// A plume is a FAN OF STRIPS, not two crossed sheets. Each strip is a low-poly ribbon of several segments that
// bends away from the branch's line and droops under itself, tapering to a point, so it has a silhouette from
// any angle and catches light along its length. The atlas cell is a feathery spray -- a midrib with leaves along
// it -- so one strip reads as a whole frond.
//
//   Sprays.build(tree, { tips, fan, len, wide, droop, spread, seed })
//
// Returns { pos, nrm, uv, col, idx, count }. Normals blend between the plume's own outward axis and the strip's
// face, so a plume shades as one soft mass without going dead flat. Colour carries wind: R sway along the strip
// (0 at the stem, 1 at the tip), G a per-strip flutter, B a phase.
(function () {
  const H = Math.hypot;
  const unit = (v) => { const l = H(v[0], v[1], v[2]) || 1e-9; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const rng = (s) => { let x = s >>> 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; }; };

  function build(tree, opt) {
    const o = Object.assign({ fan: 7, len: 0.42, wide: 0.1, droop: 0.3, spread: 0.85, flat: 0.3, seg: 5, seed: 11, R0: 0.2, under: 0.3 }, opt);
    const r = rng(o.seed * 2246822519);
    // a tip: the far end of a shoot, where the wood has thinned. one plume each.
    const tips = [];
    for (const s of tree.strands) {
      if (s.loop) continue;
      const k = s.K - 1; if (k <= s.root + 2) continue;
      if (s.rho[k] > o.under * o.R0) continue;
      const p = [s.X[k * 3], s.X[k * 3 + 1], s.X[k * 3 + 2]];
      const q = [s.X[k * 3 - 9], s.X[k * 3 - 8], s.X[k * 3 - 7]];
      tips.push({ p, d: unit([p[0] - q[0], p[1] - q[1], p[2] - q[2]]), rho: s.rho[k] });
    }
    if (!tips.length) return { pos: new Float32Array(0), nrm: new Float32Array(0), uv: new Float32Array(0), col: new Float32Array(0), idx: new Uint32Array(0), count: 0, plumes: 0 };

    const nStrip = tips.length * o.fan, nv = nStrip * (o.seg + 1) * 2, ni = nStrip * o.seg * 6;
    const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3);
    const idx = new Uint32Array(ni);
    let vi = 0, ii = 0, strips = 0;
    for (const t of tips) {
      const up = Math.abs(t.d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const a1 = unit(cross3(t.d, up)), a2 = cross3(t.d, a1);
      const roll0 = r() * Math.PI * 2, scale = 0.75 + 0.6 * r();
      for (let f = 0; f < o.fan; f++) {
        const ph = roll0 + f * Math.PI * 2 / o.fan + 0.3 * (r() - 0.5);
        const side = [0, 1, 2].map((i) => a1[i] * Math.cos(ph) + a2[i] * Math.sin(ph) * o.flat);
        // the strip leaves the tip along the branch, leans out into the fan, and sags as it goes
        const out = unit([0, 1, 2].map((i) => t.d[i] + side[i] * o.spread * (0.55 + 0.9 * r())));
        const L = o.len * scale * (0.7 + 0.6 * r()), W = o.wide * scale * (0.8 + 0.5 * r());
        const flutter = r(), phase = r(), cq = Math.floor(r() * 4), cu = (cq & 1) * 0.5, cv = (cq >> 1) * 0.5;
        // the plane the ribbon lies in: its own axis and a roll about it
        const rl = r() * Math.PI, u0 = unit(cross3(out, up)), v0 = cross3(out, u0);
        const face = [0, 1, 2].map((i) => u0[i] * Math.cos(rl) + v0[i] * Math.sin(rl));
        const across = unit(cross3(out, face));
        const base = vi;
        for (let g = 0; g <= o.seg; g++) {
          const u = g / o.seg, sag = o.droop * L * u * u;
          const w = W * Math.pow(1 - u, 0.55) * (u < 0.12 ? u / 0.12 : 1);   // a point at the far end, a stem at the near
          const c = [0, 1, 2].map((i) => t.p[i] + out[i] * L * u - (i === 1 ? sag : 0));
          const n = unit([0, 1, 2].map((i) => face[i] * 0.45 + out[i] * 0.12 + (c[i] - t.p[i]) * 1.2));
          for (let e = 0; e < 2; e++) {
            const sx = e ? 1 : -1;
            pos[vi * 3] = c[0] + across[0] * w * sx; pos[vi * 3 + 1] = c[1] + across[1] * w * sx; pos[vi * 3 + 2] = c[2] + across[2] * w * sx;
            nrm[vi * 3] = n[0]; nrm[vi * 3 + 1] = n[1]; nrm[vi * 3 + 2] = n[2];
            uv[vi * 2] = cu + (e ? 0.5 : 0); uv[vi * 2 + 1] = cv + u * 0.5;
            col[vi * 3] = u; col[vi * 3 + 1] = flutter; col[vi * 3 + 2] = phase;
            vi++;
          }
          if (g < o.seg) { const b = base + g * 2;
            idx[ii++] = b; idx[ii++] = b + 1; idx[ii++] = b + 2;
            idx[ii++] = b + 1; idx[ii++] = b + 3; idx[ii++] = b + 2; }
        }
        strips++;
      }
    }
    return { pos, nrm, uv, col, idx: idx.subarray(0, ii), count: strips, plumes: tips.length };
  }
  window.Sprays = { build };
})();
