// Foliage, the way a game does it: leaves are cards, not geometry. The wood stays the meshed field it already is;
// this reads the grown tree and returns a buffer of quads to hang on it.
//
// Nothing here is a growth rule. The tree is already grown; leaves are an asset laid on what grew, which is what
// was asked for. The one thing it does take from the tree is where the wood is thin enough to carry them.
//
//   Foliage.cards(tree, { under, every, size, cross, seed })
//     under   leaves go where a shoot's girth is under this share of the trunk's
//     every   about how far apart along a shoot, in world units
//     size    a card's half-width
//     cross   quads per cluster, set at even angles about the outward axis
//
// Returns { pos, nrm, uv, col, idx, count }. The normal is NOT the card's own face: it is blended toward the
// canopy's outward direction, which is what stops a crown reading as a heap of flat planes. The colour channels
// carry wind -- R sway, rising from nothing at the trunk to full at a tip; G a per-card flutter; B a phase -- and
// are not used for tint.
(function () {
  const H = Math.hypot;
  const unit = (v) => { const l = H(v[0], v[1], v[2]) || 1e-9; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const rng = (s) => { let x = s >>> 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; }; };

  function cards(tree, opt) {
    const o = Object.assign({ under: 0.42, every: 0.055, size: 0.05, cross: 2, seed: 7, R0: 0.2 }, opt);
    const r = rng(o.seed * 2654435761);
    const at = [];                                   // the places first, so the canopy's middle is known
    for (const s of tree.strands) {
      if (s.loop) continue;
      const start = Math.max(s.root, 0);
      let since = 1e9;
      for (let k = start; k < s.K; k++) {
        const rho = s.rho[k]; if (rho > o.under * o.R0) { since = 1e9; continue; }
        const p = [s.X[k * 3], s.X[k * 3 + 1], s.X[k * 3 + 2]];
        const step = k > start ? H(p[0] - s.X[k * 3 - 3], p[1] - s.X[k * 3 - 2], p[2] - s.X[k * 3 - 1]) : 0;
        since += step;
        // thinner wood carries them closer together, so a crown thickens toward its tips without being told to
        const want = o.every * (0.45 + 1.4 * (rho / (o.under * o.R0)));
        if (since < want) continue;
        since = 0;
        const tip = Math.min(1, (s.K - 1 - k) / 14);          // 0 at a tip, 1 well back from it
        at.push({ p, out: s.O[k] || [0, 1, 0], rho, sway: 1 - tip });
      }
    }
    if (!at.length) return { pos: new Float32Array(0), nrm: new Float32Array(0), uv: new Float32Array(0), col: new Float32Array(0), idx: new Uint32Array(0), count: 0 };
    const mid = [0, 0, 0]; for (const a of at) for (let i = 0; i < 3; i++) mid[i] += a.p[i] / at.length;

    const n = at.length * o.cross, pos = new Float32Array(n * 12), nrm = new Float32Array(n * 12),
      uv = new Float32Array(n * 8), col = new Float32Array(n * 12), idx = new Uint32Array(n * 6);
    let q = 0;
    for (const a of at) {
      const away = unit([a.p[0] - mid[0], a.p[1] - mid[1] + 0.04, a.p[2] - mid[2]]);
      const flutter = r(), phase = r();
      const cell = Math.floor(r() * 4), cu = (cell & 1) * 0.5, cv = (cell >> 1) * 0.5;
      const roll0 = r() * Math.PI;
      for (let c = 0; c < o.cross; c++) {
        const roll = roll0 + c * Math.PI / o.cross;
        // a frame about the outward axis, rolled, then tipped a little so a cluster is not a flat rosette
        let u = unit(cross3(away, Math.abs(away[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
        let v = cross3(away, u);
        const cr = Math.cos(roll), sr = Math.sin(roll);
        const e1 = [0, 1, 2].map((i) => u[i] * cr + v[i] * sr);
        const e2 = [0, 1, 2].map((i) => -u[i] * sr + v[i] * cr);
        const lean = 0.35 * (r() - 0.5), sz = o.size * (0.72 + 0.6 * r());
        const f1 = [0, 1, 2].map((i) => e1[i] + away[i] * lean);
        const f2 = [0, 1, 2].map((i) => e2[i] - away[i] * lean);
        const base = [0, 1, 2].map((i) => a.p[i] + away[i] * o.size * 0.35);
        for (let w = 0; w < 4; w++) {
          const sx = (w === 0 || w === 3) ? -1 : 1, sy = (w < 2) ? -1 : 1, b = (q * 4 + w);
          for (let i = 0; i < 3; i++) {
            pos[b * 3 + i] = base[i] + f1[i] * sz * sx + f2[i] * sz * sy;
            nrm[b * 3 + i] = away[i];                        // the canopy's normal, not the card's
            col[b * 3 + i] = i === 0 ? a.sway : i === 1 ? flutter : phase;
          }
          uv[b * 2] = cu + ((w === 0 || w === 3) ? 0 : 0.5); uv[b * 2 + 1] = cv + ((w < 2) ? 0 : 0.5);
        }
        const o4 = q * 4;
        idx[q * 6] = o4; idx[q * 6 + 1] = o4 + 1; idx[q * 6 + 2] = o4 + 2;
        idx[q * 6 + 3] = o4; idx[q * 6 + 4] = o4 + 2; idx[q * 6 + 5] = o4 + 3;
        q++;
      }
    }
    return { pos, nrm, uv, col, idx, count: q, clusters: at.length };
  }
  window.Foliage = { cards };
})();

// WITHDRAWN as an approach, kept as plumbing. This scatters single leaf cards along the branch lines, which is
// the naive version of foliage and looks like it: cards bedded into the wood, each reading as its own sticker,
// and no canopy silhouette. What a game actually builds is hierarchical, and this skips the middle of it:
//
//   the atlas cell is a FROND -- one branchlet with its whole set of leaves, baked orthographically with albedo,
//     normal, translucency and AO. A card then reads as a twig, not a blob. Single leaves are in the atlas only
//     for breaking up an edge.
//   the card is not a quad. A frond is a low-poly strip, a few segments bent and twisted along its length, so it
//     has a silhouette from any angle and catches light across itself. Flat quads are why this looks like stickers.
//   fronds hang off BRANCHLETS, a level of structure between the grown branch and the leaf, with phyllotaxy and
//     a droop under their own weight. This tree has no such level: its crown ends in thick horns.
//   placement fills a canopy VOLUME with the density falling off inward, so the shell is what is seen and
//     nothing is paid for where nobody looks. Not a scatter along a line.
//   normals blend per frond between the canopy's outward direction and the frond's own, rather than being
//     replaced by the canopy's wholesale, which is what this does.
//   then the LOD chain: frond geometry, fewer and larger cards, a cross-billboard, an impostor atlas.
//
// What is worth keeping here: the wind channels, the atlas-cell indexing, and the placement walk itself, which
// would serve to place fronds once there are branchlets to hang them on.
