// A tree or two to hang leaves on. Not a page of the sketchbook: a bench for the foliage work.
(function () {
  const { tree } = Trees7, mesh = Fantastic.mesh;
  const level = Object.assign((x, y, z) => y, { level: true });
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  const seed = q && q.get('seed') ? +q.get('seed') : 1;
  const S = [['foliage s' + seed, tree(Object.assign({ seed }, Trees.sprout({ share: 0.35, seed, ground: level })))]];
  window.Fantastic = { fields: S.map((s) => s[1]), names: S.map((s) => s[0]), orbs: S.map((s) => s[1].orb), counts: S.map((s) => s[1].count),
    build: (i) => { const g = mesh(S[i][1], S[i][0], 0.011, 2.05), n = g.pos.length / 3; g.layer = new Uint8Array(n);
      for (let k = 0; k < n; k++) g.layer[k] = S[i][1].layerAt(g.pos[k * 3] - g.nrm[k * 3] * 0.004, g.pos[k * 3 + 1] - g.nrm[k * 3 + 1] * 0.004, g.pos[k * 3 + 2] - g.nrm[k * 3 + 2] * 0.004); return g; },
    mesh, kit: Fantastic.kit };
  window.__grown = S.map((s) => s[1].tree);
  window.__R0 = S.map((s) => s[1].recipe ? s[1].recipe.trunk[0][3] : 0.2);
})();
