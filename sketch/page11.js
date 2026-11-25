// Sketchbook, page 11. Trees on ground that is not level. The ground is given (it is the place, not an organism): a
// few faceted rocks and tilted planes, throwaway. The tree is grown on it: its shoots keep off the rock, its strands
// are pushed out of it, and its roots are walked over its surface (see trees.js). Four sites.
(function () {
  const { tree } = Trees7, mesh = Fantastic.mesh, H = Math.hypot;
  function rng(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // Ground is a function of a place: how far outside the ground it is. Made of:
  //   under(n, at)   everything under a plane through `at` facing n
  //   rock(c, R, seed, squash)   a stone: what is inside a dozen planes set round a middle at uneven distances
  //   all(...)       any of them
  const unit = (a) => { const l = H(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const under = (n, at) => { const u = unit(n), d = u[0] * at[0] + u[1] * at[1] + u[2] * at[2]; return (x, y, z) => u[0] * x + u[1] * y + u[2] * z - d; };
  const rock = (c, R, seed, squash = [1, 1, 1]) => { const r = rng(seed), P = []; for (let i = 0; i < 12; i++) { const y = 1 - 2 * (i + 0.5) / 12, rad = Math.sqrt(1 - y * y), a = i * 2.39996 + 6.28 * r(), u = unit([rad * Math.cos(a) + 0.5 * (r() - 0.5), y + 0.5 * (r() - 0.5), rad * Math.sin(a) + 0.5 * (r() - 0.5)]); P.push([u[0] / squash[0], u[1] / squash[1], u[2] / squash[2], R * (0.72 + 0.28 * r())]); }
    return (x, y, z) => { let d = -9; for (const p of P) d = Math.max(d, (p[0] * (x - c[0]) + p[1] * (y - c[1]) + p[2] * (z - c[2])) / H(p[0], p[1], p[2]) - p[3] / H(p[0], p[1], p[2]) * 1); return d; }; };
  const both = (a, b) => (x, y, z) => Math.max(a(x, y, z), b(x, y, z)), all = (...fs) => (x, y, z) => { let d = 9; for (const f of fs) d = Math.min(d, f(x, y, z)); return d; };
  // cut(ground, shape): what is left of the ground once that shape has been taken out of it. A hollow scooped
  // under a tree is the soil it sprouted in, gone; the tree is left standing on what its roots had reached.
  const cut = (a, b) => (x, y, z) => Math.max(a(x, y, z), -b(x, y, z));
  const bowl = (c, R, squash = [1, 1, 1]) => (x, y, z) => H((x - c[0]) / squash[0], (y - c[1]) / squash[1], (z - c[2]) / squash[2]) - R;
  const SITES = [
    ['on a slope', all(under([0.38, 1, 0.1], [0, 0.42, 0]), rock([0.42, 0.3, 0.3], 0.24, 3), rock([-0.5, 0.62, -0.35], 0.2, 5)), [0, 0], 1],
    ['at a cliff edge', all(both(under([0, 1, 0.05], [0, 0.62, 0]), under([1, 0.18, 0], [0.14, 0.3, 0])), under([-0.08, 1, 0], [0, 0.07, 0]), rock([0.55, 0.1, -0.4], 0.2, 7)), [-0.17, 0.02], 2],
    ['on a boulder', all(under([0.05, 1, -0.05], [0, 0.1, 0]), rock([0, 0.32, 0], 0.4, 11, [1.1, 0.85, 1])), [0.03, 0.02], 3],
    ['in a cleft', all(under([0, 1, 0.06], [0, 0.08, 0]), rock([-0.5, 0.3, 0.02], 0.36, 13, [1, 1.1, 1.2]), rock([0.5, 0.28, -0.04], 0.36, 17, [1, 1.05, 1.2])), [0, 0], 4],
    ['on a bank the rain has cut away', cut(all(under([0.1, 1, 0.3], [0, 0.46, 0]), rock([0.55, 0.12, -0.5], 0.18, 19)), bowl([0.2, 0.18, 0.34], 0.52, [1, 0.75, 1])), [-0.1, -0.06], 6],
  ];
  const quick = typeof location !== 'undefined' ? +new URLSearchParams(location.search).get('h') : 0;   // ?h=0.013 for a quick look
  const S = SITES.map(([name, ground, site, seed]) => [name, tree(Object.assign({ seed }, Trees.sprout({ seed, strands: 14, feet: 6, foot: 0.16, tall: 0.8, reach: 0.85, twig: 0.2, ground, site, roots: 0.65 })))]);
  if (typeof location !== 'undefined') { const only = new URLSearchParams(location.search).get('only'); if (only) { const keep = only.split(',').map(Number).map((i) => S[i]).filter(Boolean); S.length = 0; S.push(...keep); } }   // ?only=2 builds just that one
  window.Fantastic = { grounds: SITES.map((s) => s[1]), fields: S.map((s) => s[1]), names: S.map((s) => s[0]), orbs: S.map((s) => s[1].orb), counts: S.map((s) => s[1].count), build: (i) => { const g = mesh(S[i][1], S[i][0], quick || 0.0085, 2.05), n = g.pos.length / 3; g.layer = new Uint8Array(n); for (let q = 0; q < n; q++) g.layer[q] = S[i][1].layerAt(g.pos[q * 3] - g.nrm[q * 3] * 0.004, g.pos[q * 3 + 1] - g.nrm[q * 3 + 1] * 0.004, g.pos[q * 3 + 2] - g.nrm[q * 3 + 2] * 0.004); return g; }, mesh, kit: Fantastic.kit };
})();
