// The leaf atlases. Two cells of one plant: a dense plume for the blocker tier and a slender spray for the
// garnish. Kept out of the pages because both the whole-tree bench and the single-branchlet bench draw from
// them, and a leaf that differs between the two benches is two experiments pretending to be one.
(function () {
  const T = THREE;
  // A frond atlas: two cells, each a feathery spray -- a midrib with small leaves along it, tapering to a point,
  // pale against dark wood as the references are. Drawn here because the repository has no texture assets; a real
  // one would be baked from geometry with a normal and a translucency map beside it.
  function frondAtlas() {
    // Slender leaves SPREAD across the cell, not fat ones huddled at the midrib. The cell read meagre because its
    // leaves clustered within a thirtieth of its width and the sides were empty; fattening them fixed the emptiness
    // and made foam -- round discs merging into one white mass with no leaf in it. The answer to empty sides is to
    // reach into them. Eight to eleven pairs, long and narrow, pointed, set well out from the rib, with daylight
    // between neighbours so a leaf is still a leaf when a dozen sheets overlap.
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    const rnd = (() => { let s = 90210; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; })();
    for (let cell = 0; cell < 4; cell++) {
      const ox = (cell & 1) * 256, oy = (cell >> 1) * 256, pairs = 8 + (cell % 4);
      x.strokeStyle = 'rgba(198,214,224,0.7)'; x.lineWidth = 2.4;
      x.beginPath(); x.moveTo(ox + 128, oy + 250); x.lineTo(ox + 128, oy + 20); x.stroke();
      for (let i = 0; i < pairs; i++) {
        const v = (i + 0.4) / (pairs + 0.25), y = oy + 240 - v * 206, reach = 100 * Math.pow(1 - v * 0.55, 0.8);
        for (const sgn of [-1, 1]) {
          if (rnd() < 0.1) continue;
          // `rake` is the angle a leaflet stands off the midrib. At the quarter-turn it had, a leaflet lay back
        // along the rib and the cell was a forty-pixel stripe down the middle of a two-hundred-and-fifty-six
        // pixel cell: five sixths of every sprig card was empty, which is why the sheets read meagre however
        // long the leaves were made.
        const lean = TEX.rake * (0.78 + 0.44 * rnd()), ll = reach * (0.82 + 0.28 * rnd()), lw = 10 + 6 * rnd();
          // a leaflet is drawn along +x, so turning it by a signed angle only ever sent it up or down the right
        // half of the cell: the two of a pair both leaned the same way and the left half was blank by
        // construction. The left one has to be turned past the half-circle to face the other way.
        const tilt = Math.PI / 2 - lean;
        x.save(); x.translate(ox + 128, y + (rnd() - 0.5) * 10); x.rotate(sgn > 0 ? -tilt : Math.PI + tilt);
          x.fillStyle = leafTone(rnd, 214, 38);
          drawLeaf(x, ll, lw);
          x.restore();
        }
      }
    }
    const t = new T.CanvasTexture(c); t.anisotropy = 8; t.encoding = T.sRGBEncoding; return t;
  }

  // TIER ONE's cell: a dense plume, many leaves over a soft underlay. Wrong when a sheet had to BE the foliage;
  // right as a blocker behind a scatter of sprigs.

  // One leaf shape for both tiers. The core was round discs and the sprigs were lances, so the two read as two
  // different plants in the same crown. A blocker and a garnish may differ in density; they may not differ in kind.
  // `blunt` carries the width further along the leaf before the tip closes: 0 is a lance, 1 an ovate blade.
  // `lift`, `range` and `green` are the leaf's value and hue, held in one place so both tiers draw the same plant.
  const TEX = { blunt: 0, lift: 0, range: 1, green: 0, rake: 1.0, deep: 0 };
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
  function plumeAtlas() {
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    const rnd = (() => { let s = 4242; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; })();
    // a faint bed of the same leaf, laid flat and pale, so the cell blocks without reading as a cloud of pebbles
    for (const pass of [0, 1]) {
      const n = pass ? 200 : 90, far = pass ? 236 : 190;
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2, rr = Math.pow(rnd(), pass ? 0.5 : 0.72) * far;
        const px = 256 + Math.cos(a) * rr, py = 256 + Math.sin(a) * rr * 0.9;
        const ll = (pass ? 46 : 74) + rnd() * (pass ? 34 : 40), lw = (pass ? 11 : 15) + rnd() * 9;
        x.save(); x.translate(px, py); x.rotate(a + (rnd() - 0.5) * 1.5);
        // `deep` darkens the blocker alone. The two tiers do the same job at the same value and the canopy is one
      // white lump; the blocker is the inside of the mass and belongs below the garnish in value, not beside it.
      x.fillStyle = leafTone(rnd, (pass ? 212 : 226) - TEX.deep, 30);
        drawLeaf(x, ll, lw); x.restore();
      }
    }
    const t = new T.CanvasTexture(c); t.anisotropy = 8; t.encoding = T.sRGBEncoding; return t;
  }
  const coreMat = new T.MeshStandardMaterial({ map: plumeAtlas(), alphaTest: 0.5, side: T.DoubleSide, shadowSide: T.DoubleSide, roughness: 0.84, metalness: 0 });
  const stemMat = new T.MeshStandardMaterial({ color: new T.Color(0x8e8375).convertSRGBToLinear(), side: T.DoubleSide, shadowSide: T.DoubleSide, roughness: 0.95, metalness: 0 });
  const frondMat = new T.MeshStandardMaterial({ map: frondAtlas(), alphaTest: 0.42, side: T.DoubleSide, shadowSide: T.DoubleSide, roughness: 0.8, metalness: 0 });
  window.Atlas = { TEX, drawLeaf, plumeAtlas, frondAtlas, coreMat, stemMat, frondMat,
    // a pair of materials with their own freshly drawn maps, for a bench that shows several atlases at once
    // without each cell overwriting the last one's texture
    make: (over) => {
      Object.assign(TEX, { blunt: 0, lift: 0, range: 1, green: 0, rake: 1.0, deep: 0 }, over || {});
      const c = coreMat.clone(); c.map = plumeAtlas();
      const f = frondMat.clone(); f.map = frondAtlas();
      return { core: c, frond: f };
    },
    redraw: (over) => {
      // reset, then apply: a setting left over from the last variant is how a batch comes back all alike
      Object.assign(TEX, { blunt: 0, lift: 0, range: 1, green: 0, rake: 1.0, deep: 0 }, over || {});
      coreMat.map.dispose(); coreMat.map = plumeAtlas(); coreMat.needsUpdate = true;
      frondMat.map.dispose(); frondMat.map = frondAtlas(); frondMat.needsUpdate = true;
    } };
})();
