// Sketchbook, page 9. Branches. The trees' lines are not given here: they are grown by Trees.sprout (one rule: a
// shoot grows in straight bouts joined by corners, and at intervals parts with a share of its strands to one
// side), settled by Trees.grow as wood that keeps the shape it grew in, and given page 7's wood. The fifth is the
// second with three of its shoots snapped off and each made up for by a new one. Four of the rule's range. Throwaway like the other pages.
(function () {
  const { tree } = Trees7, mesh = Fantastic.mesh;
  const R = (rule) => tree(Object.assign({ seed: rule.seed || 1 }, Trees.sprout(rule)));
  const S = [
    ['a leader (share 0.15)', R({ share: 0.15, seed: 2 })],
    ['share 0.35', R({ share: 0.35, seed: 1 })],
    ['even forks (share 0.5)', R({ share: 0.5, seed: 2 })],
    ['sharper corners (kink 1.1)', R({ kink: 1.1, seed: 1 })],
    ['share 0.35, three snapped and made up', R({ share: 0.35, seed: 1, snap: 3 })],
  ];
  if (typeof location !== 'undefined') { const only = new URLSearchParams(location.search).get('only'); if (only) { const keep = only.split(',').map(Number).map((i) => S[i]).filter(Boolean); S.length = 0; S.push(...keep); } }   // ?only=2 builds just that one
  window.Fantastic = { fields: S.map((s) => s[1]), names: S.map((s) => s[0]), orbs: S.map((s) => s[1].orb), counts: S.map((s) => s[1].count), build: (i) => { const g = mesh(S[i][1], S[i][0], 0.0085, 2.05), n = g.pos.length / 3; g.layer = new Uint8Array(n); for (let q = 0; q < n; q++) g.layer[q] = S[i][1].layerAt(g.pos[q * 3] - g.nrm[q * 3] * 0.004, g.pos[q * 3 + 1] - g.nrm[q * 3 + 1] * 0.004, g.pos[q * 3 + 2] - g.nrm[q * 3 + 2] * 0.004); return g; }, mesh, kit: Fantastic.kit };
})();
