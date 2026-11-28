// A ream. Not a page of the sketchbook and not a record of anything -- a wide, cheap sample for looking at a
// setting across variety rather than on one tree. Seeds, sprout rules and three grounds: level, a slope, and a
// boulder. Coarse mesh, because the point is how many there are, not how fine any one is.
//
//   PAGE=runs/027-ream/ream.html node shots.cjs out '[[0,"none",0.9,1.2,0,null,0], ...]'   with ?from=&to=
//
// The recipes are listed first and only the asked-for slice is GROWN -- growing all of them to render one is
// half an hour of settling for a single picture, which is how the first version of this file wasted a run.
(function () {
  const { tree } = Trees7, mesh = Fantastic.mesh;
  const level = Object.assign((x, y, z) => y, { level: true });
  const slope = (tilt) => (x, y, z) => (y - tilt * x) / Math.sqrt(1 + tilt * tilt);
  const boulder = (r) => (x, y, z) => Math.min(y + 0.04, Math.hypot(x, y - 0.02, z) - r);
  const PLAN = [];
  for (const [lbl, rule] of [['share .15', { share: 0.15 }], ['share .35', { share: 0.35 }], ['share .5', { share: 0.5 }],
                             ['kink 1.1', { kink: 1.1 }], ['kink .4', { kink: 0.4 }], ['strands 24', { strands: 24 }],
                             ['strands 12', { strands: 12 }], ['snapped', { share: 0.35, snap: 3 }]])
    for (const seed of [1, 2]) PLAN.push([lbl + ' s' + seed, Object.assign({ seed }, rule), level]);
  for (const seed of [1, 2, 3, 4]) PLAN.push(['slope s' + seed, { seed, share: 0.35 }, slope(0.45)]);
  for (const seed of [1, 2, 3, 4]) PLAN.push(['boulder s' + seed, { seed, share: 0.35 }, boulder(0.34)]);
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  const from = q && q.get('from') ? +q.get('from') : 0, to = q && q.get('to') ? +q.get('to') : PLAN.length;
  const K = PLAN.slice(from, to).map(([lbl, rule, ground]) => [lbl, tree(Object.assign({ seed: rule.seed || 1 }, Trees.sprout(Object.assign({ ground }, rule))))]);
  window.Fantastic = { fields: K.map((s) => s[1]), names: K.map((s) => s[0]), orbs: K.map((s) => s[1].orb), counts: K.map((s) => s[1].count),
    build: (i) => { const g = mesh(K[i][1], K[i][0], 0.013, 2.05), n = g.pos.length / 3; g.layer = new Uint8Array(n);
      for (let k = 0; k < n; k++) g.layer[k] = K[i][1].layerAt(g.pos[k * 3] - g.nrm[k * 3] * 0.004, g.pos[k * 3 + 1] - g.nrm[k * 3 + 1] * 0.004, g.pos[k * 3 + 2] - g.nrm[k * 3 + 2] * 0.004); return g; },
    mesh, kit: Fantastic.kit };
  window.__plan = PLAN.length;
  // so the foliage bench can hang a canopy on each of them
  window.__grown = K.map((s) => s[1].tree);
  window.__R0 = K.map((s) => s[1].recipe ? s[1].recipe.trunk[0][3] : 0.2);
})();
