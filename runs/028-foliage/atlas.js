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
  // `heart`, `under`, `root` and `wash` are the shading BAKED into the cells. A card is flat, so the only
  // depth it can have is painted on it: without these a plume is one value from its heart to its rim and reads
  // as a cut-out of foliage rather than a handful of it.
  const TEX = { blunt: 0.6, lift: 0, range: 1, green: 0, rake: 1.0, deep: 95, grain: 1.6,
    heart: 46, under: 26, root: 34, wash: 0.5, stalk: 0.45 };
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
  // `root` darkens a frond toward the base of its rachis: the leaflets near the stalk sit under the ones
  // beyond them and under whatever else the branchlet carries, and the tip is what stands in the light.
  function drawFrond(x, H, reach0, pairs, rnd, base, span) {
    x.strokeStyle = leafTone(rnd, base - TEX.root * TEX.stalk, span * 0.4); x.lineWidth = Math.max(0.7, H * 0.011);
    x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -H * 0.97); x.stroke();
    for (let i = 0; i < pairs; i++) {
      const v = (i + 0.4) / (pairs + 0.25), y = -v * H, reach = reach0 * Math.pow(1 - v * 0.55, 0.8);
      const bv = base - TEX.root * (1 - v);
      for (const sgn of [-1, 1]) {
        if (rnd() < 0.1) continue;
        const tilt = Math.PI / 2 - TEX.rake * (0.78 + 0.44 * rnd());
        const ll = reach * (0.82 + 0.28 * rnd()), lw = reach * (0.13 + 0.09 * rnd());
        x.save(); x.translate(0, y + (rnd() - 0.5) * H * 0.05); x.rotate(sgn > 0 ? -tilt : Math.PI + tilt);
        x.fillStyle = leafTone(rnd, bv, span); drawLeaf(x, ll, lw); x.restore();
      }
    }
    // a frond ends in a terminal leaflet, not in a bare spike of rachis
    x.save(); x.translate(0, -H * 0.93); x.rotate(-Math.PI / 2);
    x.fillStyle = leafTone(rnd, base, span);
    drawLeaf(x, reach0 * 0.52 * (0.85 + 0.3 * rnd()), reach0 * 0.11);
    x.restore();
  }

  // A wash laid over what has already been drawn and NOWHERE else. `source-atop` keeps it inside the leaves'
  // own alpha, so the shading follows the shapes instead of filling the gaps between them with a grey haze --
  // which is what `multiply` would do, since multiplying into transparency gives opaque grey.
  function wash(x, grad, ox, oy, w, h) {
    if (TEX.wash <= 0) return;
    x.save(); x.beginPath(); x.rect(ox, oy, w, h); x.clip();
    x.globalCompositeOperation = 'source-atop'; x.globalAlpha = TEX.wash;
    x.fillStyle = grad; x.fillRect(ox, oy, w, h); x.restore();
  }

  // TIER TWO's cell: one frond, four of them, at a size where a single card is a readable spray.
  function frondAtlas() {
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    const rnd = (() => { let s = 90210; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; })();
    for (let cell = 0; cell < 4; cell++) {
      // the four cells differ in more than how many pairs they carry: a long slender frond and a short broad
      // one are different leaves, and with the mirror that is eight to draw the garnish from rather than four
      // near-copies.
      const H = 196 + cell * 10, reach = 118 - cell * 11;
      const ox = (cell & 1) * 256, oy = (cell >> 1) * 256, by = oy + 246 - (206 - H) * 0.5;
      x.save(); x.translate(ox + 128, by);
      drawFrond(x, H, reach, 7 + cell * 2, rnd, 214, 38);
      x.restore();
      // and a soft fall from the stalk upward over the whole spray, so a sprig reads as hanging off the twig
      // rather than floating free of it
      const g = x.createLinearGradient(0, by, 0, by - H);
      g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.45, 'rgba(0,0,0,0.16)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      wash(x, g, ox, oy, 256, 256);
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
        // the bed is UNDER the top pass and belongs below it in value. It was the paler of the two, which is
        // the one thing a layer beneath another cannot be.
        // `heart` then darkens by where in the cell a frond fell: the middle of a plume is the inside of a
        // handful of foliage and sees no sky; its rim is the outside and sees nothing else.
        const lit = pass ? 226 : 212 - TEX.under;
        x.save(); x.translate(256 + Math.cos(a) * rr, 256 + Math.sin(a) * rr * 0.92); x.rotate(rnd() * Math.PI * 2);
        drawFrond(x, H, H * (0.26 + 0.1 * rnd()), 6 + Math.floor(rnd() * 5), rnd,
          lit - TEX.deep - TEX.heart * (1 - rr / far), 30);
        x.restore();
      }
    }
    // and a continuous fall into the middle over the top of it all, so the step from one frond to the next
    // does not read as the shading
    const gr = x.createRadialGradient(256, 250, 8, 256, 256, 184);
    gr.addColorStop(0, 'rgba(0,0,0,0.62)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.34)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    wash(x, gr, 0, 0, 512, 512);
    const t = new T.CanvasTexture(c); t.anisotropy = 8; t.encoding = T.sRGBEncoding; return t;
  }

  // THE UNFOLDING. Not a tree growing: a tree that has already grown, arriving. Every piece of foliage carries
  // when it is due (`birth`), what it swings from (`pivot`) and what it swings about (`axis`), and a single
  // clock sweeps a front through them. A piece scales up from nothing about its own seat while it swings open
  // through `uSwing`, so a frond unrolls off its twig the way a fern's crozier does rather than fading in where
  // it will end up. `uOver` is how far it goes past its size before settling -- the overshoot is the whole
  // reason it reads as sprung rather than keyframed.
  //
  // It is a vertex transform, so nothing is rebuilt per frame and the whole canopy is one clock.
  const U = { uT: { value: 9 }, uWin: { value: 0.26 }, uSwing: { value: 2.3 }, uOver: { value: 1.35 } };
  const PRE = `
    attribute float birth;
    attribute vec3 pivot;
    attribute vec3 axis;
    uniform float uT; uniform float uWin; uniform float uSwing; uniform float uOver;
    float unfP; vec3 unfA; float unfAng; float unfE;
    void unfInit() {
      unfP = clamp((uT - birth) / max(1e-4, uWin), 0.0, 1.0);
      float q = unfP - 1.0;
      float c1 = 1.70158 * uOver, c3 = c1 + 1.0;
      unfE = 1.0 + c3 * q * q * q + c1 * q * q;
      unfA = normalize(axis + vec3(1e-5, 1e-5, 1e-5));
      unfAng = (1.0 - unfP) * uSwing;
    }
    vec3 unfRot(vec3 v) {
      float c = cos(unfAng), sn = sin(unfAng);
      return v * c + cross(unfA, v) * sn + unfA * dot(unfA, v) * (1.0 - c);
    }`;
  function unfold(m) {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uT = U.uT; sh.uniforms.uWin = U.uWin; sh.uniforms.uSwing = U.uSwing; sh.uniforms.uOver = U.uOver;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>' + PRE)
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n  unfInit();\n  objectNormal = unfRot(objectNormal);')
        // `unfInit` again here, not only above: the DEPTH material's vertex shader has beginnormal_vertex
        // inside an #ifdef it does not meet, so the shadow pass would transform by uninitialised values.
        .replace('#include <begin_vertex>', 'unfInit();\n  vec3 transformed = pivot + unfRot(position - pivot) * unfE;');
    };
    m.customProgramCacheKey = () => 'unfold';
    return m;
  }

  const coreMat = unfold(new T.MeshStandardMaterial({ map: plumeAtlas(), vertexColors: true, alphaTest: 0.5, side: T.DoubleSide, shadowSide: T.DoubleSide, roughness: 0.84, metalness: 0 }));
  const stemMat = unfold(new T.MeshStandardMaterial({ vertexColors: true, color: new T.Color(0x796d5f).convertSRGBToLinear(), side: T.DoubleSide, shadowSide: T.DoubleSide, roughness: 0.95, metalness: 0 }));
  const frondMat = unfold(new T.MeshStandardMaterial({ map: frondAtlas(), vertexColors: true, alphaTest: 0.42, side: T.DoubleSide, shadowSide: T.DoubleSide, roughness: 0.8, metalness: 0 }));

  // The wood on the same front. It is a single blob mesh with no branch axis per vertex to shrink toward, so
  // it is revealed rather than grown: a fragment is kept once the front has passed it. The edge is broken up by
  // the vertex's own position so the wood creeps along a limb instead of a clean sphere passing over it.
  function reveal(m) {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uT = U.uT;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\n  attribute float birth;\n  varying float vBirth;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vBirth = birth;');
      // cut in `clipping_planes_fragment`, which the DEPTH material has too. Cut in `dithering_fragment` the
      // shadow pass keeps every triangle, and the tree's whole shadow lies on the ground before the tree does.
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\n  uniform float uT;\n  varying float vBirth;')
        .replace('#include <clipping_planes_fragment>', 'if (vBirth > uT) discard;\n  #include <clipping_planes_fragment>');
    };
    m.customProgramCacheKey = () => 'reveal';
    return m;
  }

  // The shadow pass draws with its own material, which knows nothing of the unfold: cards scaled to nothing
  // still cast, so a canopy's whole shadow lies on the ground before a leaf of it is out. One of these per
  // foliage mesh, carrying the same map and cutout so the shadow is leaf-shaped and not card-shaped.
  function depthFor(m) {
    const d = unfold(new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, side: T.DoubleSide }));
    if (m.map) { d.map = m.map; d.alphaTest = m.alphaTest; }
    return d;
  }

  window.Atlas = { TEX, drawLeaf, drawFrond, plumeAtlas, frondAtlas, coreMat, stemMat, frondMat, unfold, reveal, depthFor, U,
    // the clock. `at` runs from 0 (nothing) to about 1 + uWin (everything)
    clock: (at, over, swing, win) => { U.uT.value = at;
      if (over !== undefined) U.uOver.value = over;
      if (swing !== undefined) U.uSwing.value = swing;
      if (win !== undefined) U.uWin.value = win; },
    // a pair of materials with their own freshly drawn maps, for a bench showing several atlases at once
    // without each cell overwriting the last one's texture
    make: (over) => {
      Object.assign(TEX, DEF, over || {});
      const c = unfold(coreMat.clone()); c.map = plumeAtlas();
      const f = unfold(frondMat.clone()); f.map = frondAtlas();
      return { core: c, frond: f };
    },
    redraw: (over) => {
      // reset, then apply: a setting left over from the last variant is how a batch comes back all alike
      Object.assign(TEX, DEF, over || {});
      coreMat.map.dispose(); coreMat.map = plumeAtlas(); coreMat.needsUpdate = true;
      frondMat.map.dispose(); frondMat.map = frondAtlas(); frondMat.needsUpdate = true;
    } };
})();
