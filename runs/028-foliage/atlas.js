// The leaf atlases. Two cells of one plant: a dense plume for the blocker tier and a single slender spray for
// the garnish. Kept out of the pages because both the whole-tree bench and the single-branchlet bench draw from
// them, and a leaf that differs between the two benches is two experiments pretending to be one.
//
// Drawn here because the repository has no texture assets. A real one would be baked from geometry with a
// normal and a translucency map beside it; the shape of the problem is the same either way, because a card
// samples a cell and is cut out by alphaTest.
(function () {
  const T = THREE;

  // One leaf, one frond, both tiers. The two started as round discs and lances and read as two different plants
  // in the same crown; then as loose leaves and pinnate sprays, which read as two plants again, more quietly.
  // A blocker and a garnish may differ in density and in value. They may not differ in kind.
  //
  // `blunt` carries the width further along the leaf before the tip closes: 0 is a lance, 1 an ovate blade.
  // `rake`  is the angle a leaflet stands off its midrib. At the quarter-turn it had, a leaflet lay back along
  //         the rib and the cell was a forty-pixel stripe down a two-hundred-and-fifty-six pixel cell: five
  //         sixths of every card empty, which is why the sheets read meagre however long the leaves were drawn.
  // `grain` is how many fronds the blocker packs into its cell, and so how small each is. At 1 one leaf of the
  //         blocker is the size of a whole frond of the garnish and the mass reads as a plant with huge leaves
  //         rather than as the same plant seen deeper in.
  // `deep`  darkens the blocker alone. Both tiers at one value make one white lump; the blocker is the inside
  //         of the mass and belongs below the garnish in value, not beside it.
  // `lift`, `range` and `green` are the value and hue of the whole plant.
  const TEX = { blunt: 0.6, lift: 0, range: 1, green: 0, rake: 1.0, deep: 95, grain: 1.6 };
  const DEF = Object.assign({}, TEX);

  function drawLeaf(x, ll, lw) {
    const b = TEX.blunt, a1 = 0.2 + 0.06 * b, a2 = 0.5 + 0.36 * b, w2 = 0.34 + 0.72 * b;
    x.beginPath(); x.moveTo(0, 0);
    x.bezierCurveTo(ll * a1, -lw, ll * a2, -lw * w2, ll, 0);
    x.bezierCurveTo(ll * a2, lw * w2, ll * a1, lw, 0, 0);
    x.fill();
  }
  function leafTone(rnd, base, span) {
    const t = base - TEX.lift + Math.floor(rnd() * span * TEX.range), g = TEX.green;
    const cl = (v) => Math.max(0, Math.min(255, Math.round(v)));
    return 'rgb(' + cl(t - 22 - 78 * g) + ',' + cl(t - 6 * g) + ',' + cl(t + 6 - 92 * g) + ')';
  }

  // A frond, drawn from the origin running up -y: a midrib with leaflets in pairs along it, each pair a little
  // shorter than the last, with daylight between neighbours so a leaf is still a leaf when a dozen sheets
  // overlap. A leaflet is drawn along +x, so turning it by a signed angle only ever sends it up or down the
  // RIGHT half: the left one has to be turned past the half-circle to face the other way.
  function drawFrond(x, H, reach0, pairs, rnd, base, span) {
    x.strokeStyle = leafTone(rnd, base, span * 0.4); x.lineWidth = Math.max(0.7, H * 0.011);
    x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -H); x.stroke();
    for (let i = 0; i < pairs; i++) {
      const v = (i + 0.4) / (pairs + 0.25), y = -v * H, reach = reach0 * Math.pow(1 - v * 0.55, 0.8);
      for (const sgn of [-1, 1]) {
        if (rnd() < 0.1) continue;
        const tilt = Math.PI / 2 - TEX.rake * (0.78 + 0.44 * rnd());
        const ll = reach * (0.82 + 0.28 * rnd()), lw = reach * (0.13 + 0.09 * rnd());
        x.save(); x.translate(0, y + (rnd() - 0.5) * H * 0.05); x.rotate(sgn > 0 ? -tilt : Math.PI + tilt);
        x.fillStyle = leafTone(rnd, base, span); drawLeaf(x, ll, lw); x.restore();
      }
    }
  }

  // TIER TWO's cell: one frond, four of them, at a size where a single card is a readable spray.
  function frondAtlas() {
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    const rnd = (() => { let s = 90210; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; })();
    for (let cell = 0; cell < 4; cell++) {
      x.save(); x.translate((cell & 1) * 256 + 128, (cell >> 1) * 256 + 240);
      drawFrond(x, 206, 100, 8 + (cell % 4), rnd, 214, 38);
      x.restore();
    }
    const t = new T.CanvasTexture(c); t.anisotropy = 8; t.encoding = T.sRGBEncoding; return t;
  }

  // TIER ONE's cell: the same frond, many times over, small and packed and turned every which way, under a
  // sparser bed of larger ones. It blocks; it is not asked to be a readable spray, and nothing in it is a shape
  // the garnish does not also have.
  function plumeAtlas() {
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    const rnd = (() => { let s = 4242; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; })();
    const G = TEX.grain || 1;
    for (const pass of [0, 1]) {
      const n = Math.round((pass ? 62 : 22) * G), far = pass ? 164 : 132;
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2, rr = Math.pow(rnd(), pass ? 0.5 : 0.72) * far;
        const H = ((pass ? 120 : 172) + rnd() * 54) / G;
        x.save(); x.translate(256 + Math.cos(a) * rr, 256 + Math.sin(a) * rr * 0.92); x.rotate(rnd() * Math.PI * 2);
        drawFrond(x, H, H * (0.26 + 0.1 * rnd()), 6 + Math.floor(rnd() * 5), rnd, (pass ? 212 : 226) - TEX.deep, 30);
        x.restore();
      }
    }
    const t = new T.CanvasTexture(c); t.anisotropy = 8; t.encoding = T.sRGBEncoding; return t;
  }

  const coreMat = new T.MeshStandardMaterial({ map: plumeAtlas(), vertexColors: true, alphaTest: 0.5, side: T.DoubleSide, shadowSide: T.DoubleSide, roughness: 0.84, metalness: 0 });
  const stemMat = new T.MeshStandardMaterial({ vertexColors: true, color: new T.Color(0x796d5f).convertSRGBToLinear(), side: T.DoubleSide, shadowSide: T.DoubleSide, roughness: 0.95, metalness: 0 });
  const frondMat = new T.MeshStandardMaterial({ map: frondAtlas(), vertexColors: true, alphaTest: 0.42, side: T.DoubleSide, shadowSide: T.DoubleSide, roughness: 0.8, metalness: 0 });

  window.Atlas = { TEX, drawLeaf, drawFrond, plumeAtlas, frondAtlas, coreMat, stemMat, frondMat,
    // a pair of materials with their own freshly drawn maps, for a bench showing several atlases at once
    // without each cell overwriting the last one's texture
    make: (over) => {
      Object.assign(TEX, DEF, over || {});
      const c = coreMat.clone(); c.map = plumeAtlas();
      const f = frondMat.clone(); f.map = frondAtlas();
      return { core: c, frond: f };
    },
    redraw: (over) => {
      // reset, then apply: a setting left over from the last variant is how a batch comes back all alike
      Object.assign(TEX, DEF, over || {});
      coreMat.map.dispose(); coreMat.map = plumeAtlas(); coreMat.needsUpdate = true;
      frondMat.map.dispose(); frondMat.map = frondAtlas(); frondMat.needsUpdate = true;
    } };
})();
