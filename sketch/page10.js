// Sketchbook, page 10. A snapped limb, on a test piece: page 7's one-limb trunk whole, and with its limb broken
// off: a fresh break; a hollow; the hollow with lips of scar round it; healed over (a knot); and the hollow with
// the strands split over it.
// Throwaway like the other pages.
(function () {
  const { tree } = Trees7, mesh = Fantastic.mesh;
  // the test piece: page 7's one-limb trunk, its limb (three of its eight strands) snapped off. No bark: on this trunk it comes out as loose tiles, which is its own fault to look into.
  const R = (stub, more) => tree(Object.assign({ seed: 1, set: 0.8, bark: 0, trunk: [[0, 0.22, 0, 0.27], [0.08, 0.7, 0.02, 0.25], [-0.1, 1.1, 0.05, 0.22], [-0.32, 1.45, 0, 0.18], [-0.3, 1.8, -0.05, 0.14]], limbs: [{ at: 0.5, share: 0.38, path: [[0.35, 1.25, 0.15], [0.62, 1.3, 0.2], [0.8, 1.1, 0.15]], stub }] }, more));
  const S = [
    ['whole', R(undefined)],
    ['fresh break', R('fresh')],
    ['hollow', R('hollow')],
    ['hollow, lips round it', R('hollow', { heal: { hollow: 0.45 } })],
    ['knot: healed over', R('knot')],
    ['hollow, torn over', R('hollow', { hollow: { at: 0.4 } })],
  ];
  if (typeof location !== 'undefined') { const only = new URLSearchParams(location.search).get('only'); if (only) { const keep = only.split(',').map(Number).map((i) => S[i]).filter(Boolean); S.length = 0; S.push(...keep); } }   // ?only=2 builds just that one
  window.Fantastic = { fields: S.map((s) => s[1]), names: S.map((s) => s[0]), orbs: S.map((s) => s[1].orb), marks: S.map((s) => s[1].marks), counts: S.map((s) => s[1].count), build: (i) => { const g = mesh(S[i][1], S[i][0], 0.0085, 2.05), n = g.pos.length / 3; g.layer = new Uint8Array(n); g.who = new Int16Array(n); for (let q = 0; q < n; q++) { const px = g.pos[q * 3] - g.nrm[q * 3] * 0.004, py = g.pos[q * 3 + 1] - g.nrm[q * 3 + 1] * 0.004, pz = g.pos[q * 3 + 2] - g.nrm[q * 3 + 2] * 0.004; g.layer[q] = S[i][1].layerAt(px, py, pz); g.who[q] = S[i][1].whoAt ? S[i][1].whoAt(px, py, pz) : -1; } return g; }, mesh, kit: Fantastic.kit };
})();
