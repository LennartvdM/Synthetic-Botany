// Sketchbook, page 7. Trees. The structure is trees.js: strands settled against each other, each running from
// a root up the trunk and out to a point. The surface is page 5's shard, one to a strand: flat faces meeting
// at a ridge that wanders, a little give in its width, hard joins. No shell yet, and nothing swept or blended.
// Throwaway like the other pages.
(function () {
  const { shard } = Wood5, { H, PI } = Fantastic.kit, mesh = Fantastic.mesh;
  function rng(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function tree(recipe) {
    const t = Trees.grow(recipe), r = rng((recipe.seed || 1) + 50), all = [];
    for (const s of t.strands) {
      const K = s.K, wide = 1.15 + 0.3 * r(), high = 0.45 + 0.4 * r(), draw = 0.25 * (r() < 0.5 ? -1 : 1) * (0.5 + 0.5 * r()), waves = 1 + Math.floor(2 * r()), C = [], W = [], Hh = [], D = [];
      for (let k = 0; k < K; k++) { const q = k / (K - 1), bow = Math.sin(PI * waves * q) * Math.sqrt(Math.sin(PI * q)); C.push([s.X[k * 3], s.X[k * 3 + 1], s.X[k * 3 + 2]]); W.push(Math.max(0.004, s.rho[k] * wide * (1 + draw * bow))); Hh.push(s.rho[k] * high); D.push(s.rho[k] * 0.95); }
      all.push(shard({ C, O: s.O, W, Hh, D, deep: Math.max(...D), seed: 1 + Math.floor(r() * 1e6), wiggle: 1, ridge: 0.7 * (r() - 0.5), eL: 0.2 + 0.5 * r(), eR: 0.2 + 0.5 * r(), skew: 0 }));
    }
    // which strands are near which place, so that only those are asked
    const cell = 0.12, grid = new Map(), key = (x, y, z) => (x + 64) * 16384 + (y + 64) * 128 + z + 64;
    all.forEach((s, i) => { const seen = new Set(); s.C.forEach((c, j) => { const m = s.reach[j] + 0.06;
      for (let x = Math.floor((c[0] - m) / cell); x <= Math.floor((c[0] + m) / cell); x++) for (let y = Math.floor((c[1] - m) / cell); y <= Math.floor((c[1] + m) / cell); y++) for (let z = Math.floor((c[2] - m) / cell); z <= Math.floor((c[2] + m) / cell); z++) { const k = key(x, y, z); if (seen.has(k)) continue; seen.add(k); const b = grid.get(k); if (b) b.push(i); else grid.set(k, [i]); } }); });
    const o = t.orb, f = (x, y, z) => { const b = grid.get(key(Math.floor(x / cell), Math.floor(y / cell), Math.floor(z / cell))); let d = 0.1; if (b) for (const i of b) d = Math.min(d, all[i].f(x, y, z)); return d; };
    f.orb = o; f.measure = t.measure; return f;
  }
  const S = [
    ['one limb', tree({ seed: 1, trunk: [[0, 0.14, 0, 0.27], [0.08, 0.6, 0.02, 0.25], [-0.1, 1.05, 0.05, 0.21], [-0.32, 1.45, 0, 0.15], [-0.3, 1.85, -0.05, 0.07]], limbs: [{ at: 0.5, share: 0.35, path: [[0.35, 1.25, 0.15], [0.62, 1.3, 0.2], [0.8, 1.1, 0.15]] }] })],
    ['a loop', tree({ seed: 2, twist: 0.9, trunk: [[0, 0.14, 0, 0.28], [0.1, 0.6, 0, 0.26], [0.42, 1.0, 0.08, 0.22], [0.3, 1.5, 0.16, 0.18], [-0.26, 1.52, 0.08, 0.15], [-0.54, 1.08, -0.08, 0.12], [-0.2, 0.82, -0.22, 0.09], [0.2, 1.0, -0.34, 0.05]], limbs: [{ at: 0.42, share: 0.3, path: [[0.6, 1.8, 0.3], [0.82, 1.72, 0.36]] }] })],
    ['holding an orb', tree({ seed: 3, strands: 14, trunk: [[0, 0.14, 0, 0.3], [0, 0.55, 0, 0.28], [0.1, 1.0, 0, 0.22], [0.3, 1.4, 0.1, 0.15], [0.55, 1.7, 0.2, 0.06]], limbs: [{ at: 0.6, share: 0.3, path: [[-0.3, 1.3, -0.1], [-0.6, 1.5, -0.1], [-0.8, 1.35, 0]] }], orb: { at: 0.28, r: 0.15, room: 0.6, off: 0.45 } })],
    ['forked low', tree({ seed: 4, strands: 14, twist: 0.3, trunk: [[0, 0.14, 0, 0.3], [-0.05, 0.5, 0, 0.28], [-0.2, 0.95, -0.05, 0.2], [-0.45, 1.35, -0.1, 0.13], [-0.5, 1.75, 0, 0.06]], limbs: [{ at: 0.3, share: 0.38, path: [[0.35, 0.85, 0.1], [0.55, 1.25, 0.2], [0.5, 1.65, 0.1]] }, { at: 0.62, share: 0.25, path: [[-0.6, 1.1, 0.25], [-0.85, 1.2, 0.35]] }] })],
  ];
  window.Fantastic = { names: S.map((s) => s[0]), orbs: S.map((s) => s[1].orb), measures: S.map((s) => s[1].measure), build: (i) => mesh(S[i][1], S[i][0], 0.011, 2.05), mesh, kit: Fantastic.kit };
})();
