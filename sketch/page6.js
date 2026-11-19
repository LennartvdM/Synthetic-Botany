// Sketchbook, page 6. Intrusions, the kind kind first: an orb of life held inside the wood.
// The wood is page 5's, unchanged. What is new is how it answers something inside it. The orb is a plain
// ball on the piece's own line; the line does not bend for it. Round the orb is a ball of room. The wood
// swells to leave that room and parts on one side to show the orb. How much room is the one thing varied
// here: the last piece is the first again with little room, for comparison.
// Throwaway like the other pages.
(function () {
  const { wood } = Wood5, mesh = Fantastic.mesh;
  const turn = [[-0.3, -0.06, 0, 0.32], [-0.27, 0.5, 0, 0.29], [-0.15, 1.0, 0, 0.26], [0.3, 1.2, 0, 0.21], [0.77, 0.95, 0, 0.15], [0.87, 0.55, 0, 0.08]];
  const winding = [[0, -0.06, -0.2, 0.3], [0.3, 0.4, 0.1, 0.27], [0, 0.8, 0.22, 0.24], [-0.3, 1.1, -0.1, 0.2], [0, 1.4, -0.4, 0.15], [0.25, 1.62, -0.2, 0.09]];
  const loop = [[0.0, -0.06, 0, 0.34], [0.1, 0.5, 0, 0.3], [0.42, 0.98, 0.08, 0.24], [0.3, 1.48, 0.16, 0.2], [-0.26, 1.5, 0.08, 0.17], [-0.54, 1.06, -0.08, 0.14], [-0.2, 0.8, -0.22, 0.1], [0.2, 0.98, -0.34, 0.06]];
  const S = [
    ['low in a turn', wood(turn, { seed: 2, turns: 0.3, phase: 3.3, stiff: 0.5, lift: 0.25, orb: { at: 0.2, r: 0.17, room: 0.6 } })],
    ['in a winding', wood(winding, { seed: 3, turns: 0.6, phase: 1.2, stiff: 0.45, lift: 0.25, orb: { at: 0.2, r: 0.16, room: 0.6 } })],
    ['at the foot of a loop', wood(loop, { seed: 4, turns: 1.4, phase: 1.1, stiff: 0.45, lift: 0.25, orb: { at: 1 / 7, r: 0.18, room: 0.6 } })],
    ['the first, with little room', wood(turn, { seed: 2, turns: 0.3, phase: 3.3, stiff: 0.5, lift: 0.25, orb: { at: 0.2, r: 0.17, room: 0.15 } })],
  ];
  window.Fantastic = { names: S.map((s) => s[0]), orbs: S.map((s) => s[1].orb), build: (i) => mesh(S[i][1], S[i][0], 0.0085, 1.9), mesh, kit: Fantastic.kit };
})();
