// Sketchbook, page 8. One tree, four barks. The tree and its mesh of cells are the same in all four; only how the
// swathes of bark spread differs. Throwaway like the other pages.
(function () {
  const { tree } = Trees7, mesh = Fantastic.mesh;
  const R = (bark) => tree({ seed: 4, strands: 10, twist: 0.3, trunk: [[0, 0.22, 0, 0.3], [-0.05, 0.6, 0, 0.28], [-0.2, 0.98, -0.05, 0.22], [-0.45, 1.35, -0.1, 0.17], [-0.5, 1.72, 0, 0.13]], limbs: [{ at: 0.3, share: 0.4, path: [[0.35, 0.9, 0.1], [0.55, 1.25, 0.2], [0.5, 1.6, 0.1]] }, { at: 0.62, share: 0.25, path: [[-0.6, 1.1, 0.25], [-0.85, 1.2, 0.35]] }], bark });
  const S = [
    ['few, compact', R({ percolate: 0.99, cohere: 1 })],
    ['few, reaching', R({ percolate: 0.99, cohere: 0 })],
    ['many, small', R({ percolate: 0.95, cohere: 0.6 })],
    ['most of the tree', R({ cover: 0.65, percolate: 0.997, cohere: 0.6 })],
  ];
  if (typeof location !== 'undefined') { const only = new URLSearchParams(location.search).get('only'); if (only) { const keep = only.split(',').map(Number).map((i) => S[i]).filter(Boolean); S.length = 0; S.push(...keep); } }   // ?only=2 builds just that one
  window.Fantastic = { names: S.map((s) => s[0]), orbs: S.map((s) => s[1].orb), counts: S.map((s) => s[1].count), build: (i) => { const g = mesh(S[i][1], S[i][0], 0.0095, 2.05), n = g.pos.length / 3; g.layer = new Uint8Array(n); for (let q = 0; q < n; q++) g.layer[q] = S[i][1].layerAt(g.pos[q * 3] - g.nrm[q * 3] * 0.004, g.pos[q * 3 + 1] - g.nrm[q * 3 + 1] * 0.004, g.pos[q * 3 + 2] - g.nrm[q * 3 + 2] * 0.004); return g; }, mesh, kit: Fantastic.kit };
})();
