// Sketchbook, page 7. Trees. The structure is trees.js: strands settled against each other, each running from
// a root up the trunk and out to its end. The surface is page 5's wood, laid on the strands:
//   (strands that split off round an orb are drawn the same way, as deep as they are wide)
//   bands    one to a strand: flat faces meeting at a ridge that wanders, a little give in its width. A strand
//            that snapped ends in a break, cut on the slant or stepped.
//   slivers  narrow shards lying on the bands, pointed at both ends, their far ends standing off.
//   shell    thin plates in a few places, a little broader than a strand, lying close.
//   bark     the third layer: the tree is encased in an unseen mesh of cells, and bark is swathes of them switched on. Back sunk into the band, front lying on
//            top and ending in a point, a slant or a step; nearly all face toward the tip. No plate passes
//            through another. One or two have split from the front.
// Nothing is swept or blended. Throwaway like the other pages.
(function () {
  const shard = (K) => Wood5.shard(Object.assign(K, { inset: true })),   // a slanted end cuts back into its piece, never out past it
    { H, PI, clamp, sstep, smin } = Fantastic.kit, mesh = Fantastic.mesh;
  function rng(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const unit = (a) => { const l = H(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }, cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  // ?set={...} in the page's address overrides any part of every recipe, for finding out what causes what
  const OVER = typeof location !== 'undefined' && new URLSearchParams(location.search).get('set') ? JSON.parse(new URLSearchParams(location.search).get('set')) : null;
  function tree(recipe) {
    if (OVER) recipe = Object.assign({}, recipe, OVER);
    const t = Trees.grow(recipe), walked = !!recipe.ground, r = rng((recipe.seed || 1) + 50), all = [], count = { bands: 0, fine: 0, slivers: 0, plates: 0, cut: 0, dropped: 0 };
    const at = (s, k) => [s.X[k * 3], s.X[k * 3 + 1], s.X[k * 3 + 2]], tan = (s, k) => unit([0, 1, 2].map((q) => s.X[Math.min(s.K - 1, k + 1) * 3 + q] - s.X[Math.max(0, k - 1) * 3 + q]));
    // Room kept clear in the wood: round an orb, and where a snapped shoot has rotted out. And every wound, hollow or not,
    // is left quiet: no bark, shell or slivers near it, so that it is not one more detail among the others.
    // (An orb's room is a ball; a hollow's is the tunnel the shoot left, from a to e. `to` is the nearest point of a room's middle.)
    const rooms = (t.orb ? [{ a: t.orb.c, e: t.orb.c, room: t.orb.room, orb: true }] : []).concat((t.marks || []).filter((v) => v.kind !== 'fresh' && !v.asOrb).map((v) => ({ a: v.a, e: v.e, room: v.r }))), wounds = t.marks || [];
    const to = (o, x, y, z) => { const ax = o.e[0] - o.a[0], ay = o.e[1] - o.a[1], az = o.e[2] - o.a[2], l = ax * ax + ay * ay + az * az, u = l ? Math.max(0, Math.min(1, ((x - o.a[0]) * ax + (y - o.a[1]) * ay + (z - o.a[2]) * az) / l)) : 0; return [o.a[0] + ax * u, o.a[1] + ay * u, o.a[2] + az * u]; },
      away = (o, x, y, z) => { const q = to(o, x, y, z); return H(x - q[0], y - q[1], z - q[2]); };
    const nearOrb = (p) => (t.orb ? 1 - sstep(1.3, 2.2, H(p[0] - t.orb.c[0], p[1] - t.orb.c[1], p[2] - t.orb.c[2]) / t.orb.room) : 0);
    // A strand is not drawn as one piece: one section pushed along one line is a ribbon. It is drawn as a chain
    // of stiff pieces, as page 5's wood was. Each piece is nearly as deep as it is wide, runs for some girths
    // of the strand, and is too stiff for the strand's line, so the chain bends in knees. Its back is sunk under
    // the piece before it; its front lies a little proud and ends in a point, a slant or a step. All face the tip.
    // No end is cut square: a cut meets the grain at 30 degrees or less.
    const chain = recipe.chain === undefined ? 1 : recipe.chain;
    // Mass. A trunk is one body with its strands as relief, not cords with air between. Away from any tear a
    // strand is drawn wide enough to run into its neighbours and deep enough to reach the middle of the wood
    // round it. Where it has torn from another, or passes an orb, it is drawn at its own girth, so that the only
    // gaps are tears. (mass: 0 turns this off.)
    // How far in there is wood to meet: to the far side of the nearest other strand on that side. Where neighbours
    // are close they reach each other and the gap between them fills into one body; where a strand has parted from
    // the rest, as at the foot where the roots leave, there is nothing to meet and it keeps its own girth. (Before,
    // a strand reached toward the middle of its bundle however far that was, so the foot, where the bundle is
    // widest, swelled to three times the wood that is in it.)
    const mass = recipe.mass === undefined ? 1 : recipe.mass;
    const skirtOn = recipe.skirt === undefined ? 1 : recipe.skirt;
    const meet = (p, n, rho, qi, cap) => { let best = Infinity;
      for (const o of pts) { if (o[4] === qi) continue; const vx = o[0] - p[0], vy = o[1] - p[1], vz = o[2] - p[2], al = vx * n[0] + vy * n[1] + vz * n[2];
        if (al <= 0 || al > cap || al >= best) continue; const across = Math.sqrt(Math.max(0, vx * vx + vy * vy + vz * vz - al * al)); if (across > rho + o[3]) continue; best = al + o[3] * 0.7; }
      return best === Infinity ? 0.95 * rho : Math.min(cap, best); };
    // Elbows. A strand does not keep one width round a bend: the inside of the bend fills in, so it is broadest
    // at the elbow and its inner edge goes round on an easier curve than its middle. The sharper the bend the
    // more it fills, eased in before the corner and out after it, and never further than there is free room
    // on that side (another strand, or an orb's room), so that nothing is made to pass through anything. Where
    // the bend is a split's join, the inside is the other half of the same body, and the fill is the crotch.
    const gain = recipe.elbow === undefined ? 3 : recipe.elbow, pts = []; t.strands.forEach((q, qi) => { if (!q.thread) for (let i = 0; i < q.K; i++) pts.push([q.X[i * 3], q.X[i * 3 + 1], q.X[i * 3 + 2], q.rho[i], qi, q.fam]); });
    const roomToward = (p, n, want, rho, qi, fam) => { for (const o of pts) { if (o[4] === qi || (fam !== undefined && o[5] === fam)) continue; const d = [o[0] - p[0], o[1] - p[1], o[2] - p[2]], dl = H(d[0], d[1], d[2]); if (dl > want + rho + o[3] + 0.02 || dot(d, n) < 0.3 * dl) continue; want = Math.min(want, Math.max(0, dl - rho - o[3] - 0.012)); }
      for (const o of rooms) { const q = to(o, p[0], p[1], p[2]), d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], dl = H(d[0], d[1], d[2]); if (dot(d, n) > 0.3 * dl) want = Math.min(want, Math.max(0, dl - o.room - rho)); } return want; };
    const ease = t.strands.map((q, qi) => { const K = q.K, g = new Float64Array(K), dir = new Array(K).fill(null), room = new Float64Array(K).fill(9); if (q.thread || !gain || K < 7) return { g, dir };
      for (let i = 2; i < K - 2; i++) { const p = at(q, i), a = at(q, i - 2), b = at(q, i + 2), h = (H(b[0] - p[0], b[1] - p[1], b[2] - p[2]) + H(a[0] - p[0], a[1] - p[1], a[2] - p[2])) / 2 || 1e-9, T = tan(q, i);
        let kv = [0, 1, 2].map((j) => (a[j] + b[j] - 2 * p[j]) / (h * h)); const al = dot(kv, T); kv = kv.map((v, j) => v - T[j] * al); const kap = H(kv[0], kv[1], kv[2]), rho = q.rho[i]; if (kap * rho < 0.06) continue;
        const n = kv.map((v) => v / kap); dir[i] = n; let want = rho * Math.min(1.5, gain * (kap * rho - 0.06));
        for (const o of pts) { if (o[4] === qi || (q.fam !== undefined && o[5] === q.fam)) continue;
          const d = [o[0] - p[0], o[1] - p[1], o[2] - p[2]], dl = H(d[0], d[1], d[2]); if (dl > want + rho + o[3] + 0.02 || dot(d, n) < 0.3 * dl) continue; want = Math.min(want, Math.max(0, dl - rho - o[3] - 0.012)); }
        for (const o of rooms) { const q = to(o, p[0], p[1], p[2]), d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], dl = H(d[0], d[1], d[2]); if (dot(d, n) > 0.3 * dl) want = Math.min(want, Math.max(0, dl - o.room - rho)); }
        g[i] = want; room[i] = want; }
      for (let pass = 0; pass < 3; pass++) { const c = Float64Array.from(g); for (let i = 1; i < K - 1; i++) g[i] = Math.max(c[i] * 0.5 + 0.25 * (c[i - 1] + c[i + 1]), 0); }   // eased in and out along the strand
      for (let i = 0; i < K; i++) { if (!dir[i]) { let j = 1; while (j < 4 && !(dir[i - j] || dir[i + j])) j++; dir[i] = dir[i - j] || dir[i + j] || null; if (!dir[i]) g[i] = 0; else room[i] = Math.min(room[Math.max(0, i - j)], room[Math.min(K - 1, i + j)], 9) === 9 ? 0 : Math.min(room[i - j] === undefined ? 9 : room[i - j], room[i + j] === undefined ? 9 : room[i + j]); } g[i] = Math.min(g[i], room[i]); }
      return { g, dir }; });
    for (const [si, s] of t.strands.entries()) {
      // where a torn part still runs with what it tore from it is not drawn: there the two are one, and the other carries the girth
      const fine = !!s.vine, ridge0 = 0.7 * (r() - 0.5); let kA = 0, kB = s.K - 1; if (fine && !s.thread) { while (kA < kB && s.rho[kA] < 0.02) kA++; while (kB > kA && s.rho[kB] < 0.02) kB--; if (kB - kA < 5) continue; }
      const K = kB + 1; let k = kA, first = true, backBy = 3;
      while (k < K - 1) {
        const rho0 = s.rho[Math.min(K - 1, k + 2)]; let want = chain && !s.thread ? Math.max(7, Math.round((7 + 10 * r()) * Math.max(rho0, 0.02) / 0.035)) : K;
        if (k < s.root && chain) want = walked ? Math.max(6, Math.round(want * 1.6)) : Math.max(4, Math.round(want * 0.5));
        let k1 = Math.min(K - 1, k + want); if (K - 1 - k1 < 6) k1 = K - 1;
        // a root that doubles back is drawn a run at a time: a piece ends at the turn, and does not lie across it
        let turned = false; if (k < s.root) { if (k1 > s.root) k1 = s.root;   // a piece never runs from root into trunk: they are different stuff, and tapered differently
          const sg = (j) => unit([0, 1, 2].map((c) => s.X[(j + 1) * 3 + c] - s.X[j * 3 + c])), d0 = sg(Math.min(K - 2, k + 1));
          for (let j = k + (walked ? 4 : 3); j < Math.min(k1, s.root); j++) { const t = dot(sg(j), d0); if (t < (walked ? 0.955 : 0.3)) { k1 = j; turned = t < 0.3; break; } } }
        const k0 = first ? kA : Math.max(kA, k - backBy), n = k1 - k0, last = k1 === K - 1, wide = (fine ? 0.95 : 1.15) + 0.2 * r(), high = (fine ? 0.8 : 0.62) + 0.25 * r(), stiff = chain ? 0.55 + 0.35 * r() : 0, proud = chain ? 0.1 + 0.25 * r() : 0, massW = 1.55 + 0.4 * r(), e = r(), ending = last ? 'own' : turned ? 'turn' : e < 0.4 ? 'point' : e < 0.75 ? 'blunt' : 'step';
        const A = at(s, k0), B = at(s, k1), C = [], O = [], W = [], Hh = [], D = [];
        for (let i = k0; i <= k1; i++) { const q = (i - k0) / n, base = at(s, i), rho = s.rho[i], off = [0, 1, 2].map((j) => A[j] + (B[j] - A[j]) * q - base[j]), far = H(off[0], off[1], off[2]) || 1e-9, stay = Math.min(stiff, 0.35 * rho / far);
          const no = nearOrb(base), tornHere = s.gap && s.inner && s.inner[i] ? Math.min(1, s.gap[i] / (1.2 * rho)) : 0, alone = 1 - sstep(0.9, 2.0, s.far[i] / rho), free = s.thread ? 1 : Math.max(no, tornHere, alone, s.rootOf >= 0 ? 1 : 1 - sstep(s.root - 7, s.root - 2, i)),   // the flare is still the body, and a root leaves it: mass runs down into a root's first steps and is gone a little further out
           body = mass * (1 - free),   // a strand running alone is a limb, not part of a mass
          toMid = body > 0.01 ? Math.max(0.95 * rho, meet(base, [-s.O[i][0], -s.O[i][1], -s.O[i][2]], rho, si, Math.min(s.far[i] * 0.9, (s.limb >= 0 ? 1.5 : 3.2) * rho))) : 0.95 * rho;   // a limb is thin: reaching for its middle must not come out of its other side
          // (so does a strand that divided off another, where it comes out of it)
          // (a torn part leaves and rejoins what it tore from from underneath: laid level with it there, the two surfaces run through each other and come out pitted)
          const lift = (first ? (fine || s.stem >= 0 ? -0.9 * (1 - sstep(0, 0.35, q)) : 0) : -0.28 * (1 - sstep(0, 0.3, q))) + proud * q * q - ((fine || s.rootOf >= 0) && last ? 0.9 * sstep(0.65, 1, q) : 0), front = ending === 'point' ? Math.pow(Math.min(1, (1 - q) / 0.3), 0.7) : 1, back = first && !(s.stem >= 0) ? 1 : 0.7 + 0.3 * sstep(0, 0.3, q), w = Math.min(wide, 1.05 + (wide - 1.05) * (1 - no)) + body * (massW - 1.05);
          let deepHere = rho * 0.95 + body * (toMid - rho * 0.95); for (const o of rooms) deepHere = Math.max(rho * 0.5, Math.min(deepHere, away(o, base[0], base[1], base[2]) - o.room - 0.01));
          let wCap = 9; for (const o of rooms) if (!o.orb) wCap = Math.min(wCap, Math.max(0.6 * rho, away(o, base[0], base[1], base[2]) - o.room));   // nor is it drawn so wide that its edge stands in a hollow   // never into an orb's room
          const eg = ease[si].g[i], en = ease[si].dir[i], inn = s.inner && s.gap && s.gap[i] > 0 ? s.inner[i] : null, sv = eg || inn || (s.rootOf < 0 && i < s.root) ? unit(cross(tan(s, i), s.O[i])) : null, gu = eg ? eg * dot(en, sv) : 0, gv = eg ? eg * dot(en, s.O[i]) : 0;   // the elbow's fill, across the strand and through it
          // a tear's lip: toward what it tore from, a part reaches a quarter of the way across the gap, so that
          // where the gap is narrow the two lips all but meet (a web with a slit), and where it is wide they stand apart
          let lipU = 0; if (inn) { const sg = dot(inn, sv); if (Math.abs(sg) > 0.4) lipU = Math.sign(sg) * roomToward(base, sv.map((v) => v * Math.sign(sg)), Math.min(0.25 * s.gap[i], 1.0 * rho), rho, si, s.fam); }
          const home = fine && !s.thread && s.inner && s.inner[i] ? (first ? 1 - sstep(0, 0.35, q) : 0) + (last ? sstep(0.65, 1, q) : 0) : 0, hm = home ? home * (s.gap[i] + 0.6 * rho) : 0;   // its two ends bend back into what it tore from, so that it is never left hanging
          // The skirt. Where a root leaves the trunk it is not a cord but part of a cone: over its first few steps
          // it is wide enough to meet the legs either side of it, so the foot is one flaring body that divides
          // lower down, as a tree's is. A step or two out it is its own girth again.
          let skirt = 0;
          if (sv && s.rootOf < 0 && i < s.root) { const near = sstep(s.root - 10, s.root - 1, i);
            if (near > 0.02) { const lft = meet(base, sv, rho, si, 3.5 * rho), rgt = meet(base, [-sv[0], -sv[1], -sv[2]], rho, si, 3.5 * rho);
              skirt = skirtOn * near * Math.max(0, Math.min(lft, rgt) - 0.95 * rho); } }
          C.push([0, 1, 2].map((j) => base[j] + off[j] * stay + s.O[i][j] * rho * lift + (sv ? sv[j] * (gu + lipU) / 2 : 0) + (hm ? s.inner[i][j] * hm : 0))); O.push(s.O[i]); W.push(Math.max(0.006, Math.min(wCap, rho * w * front * back + (Math.abs(gu) + Math.abs(lipU)) / 2 + skirt))); Hh.push(rho * high * (0.6 + 0.4 * front) + Math.max(0, gv) * 0.5); D.push(deepHere + Math.max(0, -gv)); }
        const w1 = W[W.length - 1], end = ending === 'own' ? (s.snapped ? { skew: (r() < 0.5 ? -1 : 1) * (1.8 + 1.4 * r()), step: r() < 0.5 ? { u: 0.5 * (r() - 0.5), side: r() < 0.5 ? -1 : 1, a: w1 * (0.8 + 1.4 * r()) } : null } : { skew: 0 })
          : ending === 'turn' ? { skew: 0.6 * (r() - 0.5) } : ending === 'step' ? { skew: (r() < 0.5 ? -1 : 1) * (1.8 + 1.2 * r()), step: { u: 0.5 * (r() - 0.5), side: r() < 0.5 ? -1 : 1, a: w1 * (0.9 + 1.2 * r()) } } : ending === 'blunt' ? { skew: (r() < 0.5 ? -1 : 1) * (1.8 + 1.4 * r()) } : { skew: 0 };
        // The next piece starts under this one's front, as far back as the front is cut away: a point takes the last
        // third, a slant runs back by its skew times the width. Started any later it leaves a hole where the cut
        // was, and a root or a limb, which has nothing beside it to hide the hole, comes apart there.
        { const dsl = H(B[0] - at(s, k1 - 1)[0], B[1] - at(s, k1 - 1)[1], B[2] - at(s, k1 - 1)[2]) || 0.035, cutLen = ending === 'point' ? 0.3 * n * dsl : (end.skew ? 2 * Math.abs(end.skew) * w1 : 0) + (end.step ? end.step.a : 0); backBy = clamp(Math.ceil(cutLen / dsl) + 2, 3, Math.max(3, n - 2)); }
        // a part that has torn from another is thickest on its far side and thins to a lip toward the tear
        const mid = (k0 + k1) >> 1, inn = s.inner && s.inner[mid], sg = inn ? dot(inn, unit(cross(tan(s, mid), s.O[mid]))) : 0, torn = Math.abs(sg) > 0.4 ? Math.sign(sg) : 0, e1 = 0.2 + 0.5 * r(), e2 = 0.2 + 0.5 * r(), rd = clamp(ridge0 + 0.4 * (r() - 0.5), -0.6, 0.6);
        all.push(Object.assign(shard(Object.assign({ C, O, W, Hh, D, deep: Math.max(...D), seed: 1 + Math.floor(r() * 1e6), wiggle: 1, ridge: torn ? -0.4 * torn : rd, eL: torn < 0 ? 0.3 : torn > 0 ? 0.55 : e1, eR: torn > 0 ? 0.3 : torn < 0 ? 0.55 : e2, feather: torn, featherAmt: 0.78 }, s.thread ? { skew: 0 } : end)), { who: si, layer: k1 <= s.root ? (s.rootOf >= 0 ? 7 : 6) : fine || torn || (s.gap && s.gap[mid] > 0) ? 1 : 0 }));   // 6, 7: root, and root that parted off a root
        count[fine ? 'fine' : 'bands'] = (count[fine ? 'fine' : 'bands'] || 0) + 1; k = k1; first = false;
      }
    }
    // where a strand is on the outside of the wood, and off the ground
    const rhoTop = Math.max(...t.strands.map((q) => Math.max(...q.rho))), outer = (s, k) => k > s.root + 4 && k < s.K - 3 && s.far[k] > 1.1 * s.rho[k] && s.rho[k] > Math.min(0.03, 0.4 * rhoTop) && !wounds.some((v) => H(s.X[k * 3] - v.c[0], s.X[k * 3 + 1] - v.c[1], s.X[k * 3 + 2] - v.c[2]) < 2 * v.r);
    const stretch = (s, len) => { for (let go = 0; go < 6; go++) { const k0 = s.root + 4 + Math.floor(r() * Math.max(1, s.K - s.root - len - 8)), k1 = k0 + len; if (k1 < s.K - 2 && outer(s, k0) && outer(s, k1) && outer(s, (k0 + k1) >> 1)) return [k0, k1]; } return null; };
    const alongRoot = (s, k) => k > 3 && k < s.root - 5 && s.far[k] > 0.95 * s.rho[k] && s.rho[k] > 0.013 && !wounds.some((v) => H(s.X[k * 3] - v.c[0], s.X[k * 3 + 1] - v.c[1], s.X[k * 3 + 2] - v.c[2]) < 2 * v.r);
    const runOfRoot = (s, len) => { for (let go = 0; go < 6; go++) { const k0 = 3 + Math.floor(r() * Math.max(1, s.root - len - 8)), k1 = k0 + len; if (k1 < s.root - 4 && alongRoot(s, k0) && alongRoot(s, k1) && alongRoot(s, (k0 + k1) >> 1)) return [k0, k1]; } return null; };
    const thick = t.strands.filter((q) => !q.vine && !(q.inner && q.inner.some((v) => v)) && Math.max(...q.rho) > Math.min(0.045, 0.6 * rhoTop));   // (thick: for a small tree, by its own measure)
    if (!recipe.bare && walked) for (const s of t.strands) { if (s.vine || s.loop || !(s.root > 16)) continue;
      for (let j = 0; j < 3; j++) {   // a root's flutes
        const len = 9 + Math.floor(20 * r()), st = runOfRoot(s, len); if (!st) continue;
        const side = (r() < 0.5 ? -1 : 1) * (0.2 + 0.62 * r()), wide = 0.34 + 0.3 * r(), high = 0.5 + 0.4 * r(), sd = 1 + Math.floor(r() * 1e6), rd = 0.7 * (r() - 0.5), eL = 0.15 + 0.6 * r(), eR = 0.15 + 0.6 * r();
        const C = [], O = [], W = [], Hh = [], D = [];
        for (let k = st[0]; k <= st[1]; k++) { const q = (k - st[0]) / len, o = s.O[k], sv = unit(cross(tan(s, k), o)), rho = s.rho[k], fine = Math.min(1, q / 0.25, (1 - q) / 0.35), p = at(s, k);
          // round the root, not into it: a flute lies on the skin and faces out from the axis, and it wanders
          // slowly round as it runs, the way a root's ridges do
          const a2 = side * 1.6 + 0.5 * Math.sin(q * 3.1 + sd % 7);
          const dir = [0, 1, 2].map((i) => o[i] * Math.cos(a2) + sv[i] * Math.sin(a2));
          C.push([0, 1, 2].map((i) => p[i] + dir[i] * rho * 0.78)); O.push(dir); W.push(Math.max(0.003, rho * wide * fine)); Hh.push(rho * high * (0.4 + 0.6 * fine)); D.push(rho * 0.7); }
        all.push(Object.assign(shard({ C, O, W, Hh, D, deep: Math.max(...D), seed: sd, wiggle: 1, ridge: rd, eL, eR, skew: 0 }), { layer: 2, who: t.strands.indexOf(s) })); count.slivers++;
      } }
    if (!recipe.bare) for (const s of thick) for (let j = 0; j < 2; j++) {   // slivers
      const u = r(), len = 10 + Math.floor(18 * r()), side = (r() < 0.5 ? -1 : 1) * (0.25 + 0.5 * r()), lift = 0.3 + 0.7 * r(), wide = 0.3 + 0.25 * r(), high = 0.3 + 0.2 * r(), sd = 1 + Math.floor(r() * 1e6), rd = 0.8 * (r() - 0.5), eL = 0.1 + 0.6 * r(), eR = 0.1 + 0.6 * r(), st = u < 0.6 ? stretch(s, len) : null; if (!st) continue;
      const C = [], O = [], W = [], Hh = [], D = [];
      for (let k = st[0]; k <= st[1]; k++) { const q = (k - st[0]) / len, o = s.O[k], sv = unit(cross(tan(s, k), o)), rho = s.rho[k], fine = Math.min(1, q / 0.3, (1 - q) / 0.5), p = at(s, k);
        C.push([0, 1, 2].map((i) => p[i] + o[i] * rho * (0.5 + lift * q * q) + sv[i] * rho * side)); O.push(o); W.push(Math.max(0.004, rho * wide * fine)); Hh.push(rho * high * (0.5 + 0.5 * fine)); D.push(rho * 0.5); }
      all.push(Object.assign(shard({ C, O, W, Hh, D, deep: Math.max(...D), seed: sd, wiggle: 1, ridge: rd, eL, eR, skew: 0 }), { layer: 2, who: t.strands.indexOf(s) })); count.slivers++;
    }
    // the shell
    const shell = [], room = 0.012, rigid = 0.5;
    const makePlate = (s, k0, k1, forward, side, wide, high, ending, P, seed) => {
      if (k1 - k0 < 8) return null; const on = [], outs = [], Rs = [], qs = [], n0 = k1 - k0;
      for (let k = forward ? k0 : k1; forward ? k <= k1 : k >= k0; k += forward ? 1 : -1) { const q = Math.abs(k - (forward ? k0 : k1)) / n0, o = s.O[k], sv = unit(cross(tan(s, k), o)), rho = s.rho[k], p = at(s, k), lift = -0.3 + 1.1 * sstep(0, 0.5, q) + 0.25 * q * q;   // from its back to its front: sunk, then up through the band, then lying on it
        on.push([0, 1, 2].map((i) => p[i] + o[i] * rho * lift + sv[i] * rho * side)); outs.push(o); Rs.push(rho); qs.push(q); }
      const n = on.length, km = clamp(Math.round(n * 0.62), 1, n - 2), Tm = unit([0, 1, 2].map((i) => on[km + 1][i] - on[km - 1][i])), arc = new Array(n).fill(0);
      for (let k = km + 1; k < n; k++) arc[k] = arc[k - 1] + H(on[k][0] - on[k - 1][0], on[k][1] - on[k - 1][1], on[k][2] - on[k - 1][2]);
      for (let k = km - 1; k >= 0; k--) arc[k] = arc[k + 1] - H(on[k][0] - on[k + 1][0], on[k][1] - on[k + 1][1], on[k][2] - on[k + 1][2]);
      const C = [], O = [], W = [], Hh = [], rr = rng(seed);
      for (let k = 0; k < n; k++) {   // rigid: part way to dead straight, and never more than about half a strand's girth off its line
        const off = [0, 1, 2].map((i) => on[km][i] + Tm[i] * arc[k] - on[k][i]), far = H(off[0], off[1], off[2]) || 1e-9, stay = Math.min(rigid, 0.3 * Rs[k] / far), front = ending === 'point' ? Math.pow(Math.min(1, (1 - qs[k]) / 0.3), 0.7) : 1, back = 0.55 + 0.45 * sstep(0, 0.35, qs[k]);
        C.push([0, 1, 2].map((i) => on[k][i] + off[i] * stay)); O.push(unit([0, 1, 2].map((i) => outs[k][i] + (outs[km][i] - outs[k][i]) * rigid))); W.push(Math.max(0.004, Rs[k] * wide * front * back)); Hh.push(Rs[k] * high * (0.5 + 0.5 * front) * (1 - 0.45 * qs[k] * qs[k])); }
      const w1 = Rs[n - 1] * wide, end = ending === 'step' ? { skew: (rr() < 0.5 ? -1 : 1) * (1.8 + 1.2 * rr()), step: { u: 0.5 * (rr() - 0.5), side: rr() < 0.5 ? -1 : 1, a: w1 * (0.9 + 1.2 * rr()) } } : ending === 'blunt' ? { skew: (rr() < 0.5 ? -1 : 1) * (1.8 + 1.4 * rr()) } : { skew: 0 };
      return Object.assign({ C, O, W, Hh, deep: Rs[km] * 0.25, seed: 1 + Math.floor(rr() * 1e6), wiggle: 1 }, P, end);
    };
    const plate = (s, k0, k1, forward, ...rest) => {   // laid only where it is clear of every plate before it; cut back where it would meet one
      for (let go = 0; go < 4; go++) {
        const K = makePlate(s, k0, k1, forward, ...rest); if (!K) break; const n = K.C.length, hit = new Uint8Array(n);
        for (let k = 0; k < n; k++) { const T = unit([0, 1, 2].map((i) => K.C[Math.min(n - 1, k + 1)][i] - K.C[Math.max(0, k - 1)][i])), sv = unit(cross(T, K.O[k])), up = cross(sv, T);
          for (let a = -3; a <= 3 && !hit[k]; a++) for (const v of [0, K.Hh[k] * 0.6]) { const pt = [0, 1, 2].map((i) => K.C[k][i] + sv[i] * K.W[k] * a * 0.31 + up[i] * v); if (shell.some((A) => A.f(pt[0], pt[1], pt[2]) < room)) { hit[k] = 1; break; } } }
        if (!hit.some((h) => h)) { const sh = Object.assign(shard(K), { layer: 2, who: t.strands.indexOf(s) }); all.push(sh); shell.push(sh); count.plates++; if (go) count.cut++; return; }
        let best = [0, -1], from = 0; for (let k = 0; k <= n; k++) if (k === n || hit[k]) { if (k - 1 - from > best[1] - best[0]) best = [from, k - 1]; from = k + 1; }
        const a = best[0] + (best[0] > 0 ? 1 : 0), b = best[1] - (best[1] < n - 1 ? 1 : 0); if (b - a < 6) break;
        if (forward) { const z = k0; k0 = z + a; k1 = z + b; } else { const z = k1; k1 = z - a; k0 = z - b; }
      }
      count.dropped++;
    };
    const want = recipe.bare ? 0 : recipe.plates === undefined ? 16 : recipe.plates, splitAt = [Math.floor(want * r()), Math.floor(want * r())];
    for (let j = 0; j < want && thick.length; j++) {
      const s = thick[Math.floor(r() * thick.length)], len = 12 + Math.floor(18 * r()), forward = r() < 0.9, side = 0.7 * (r() - 0.5), wide = 0.95 + 0.6 * r(), high = 0.2 + 0.1 * r(), e = r(), rd = 0.6 * (r() - 0.5), eL = 0.5 + 0.4 * r(), eR = 0.5 + 0.4 * r(), sd = 1 + Math.floor(r() * 1e6), u1 = r(), u2 = r(), u3 = r(), u4 = r(), st = stretch(s, len), split = splitAt.includes(j);
      if (!st) { count.dropped++; continue; }
      plate(s, st[0], st[1], forward, side, wide, high, split ? 'blunt' : e < 0.7 ? 'point' : 'blunt', { ridge: rd, eL, eR, split: split ? { fromEnd: true, s0: 0.42 + 0.2 * u1, s1: 1.001, u: 0.4 * (u2 - 0.5), wide: 0.2 + 0.12 * u3, lift: 0.5 + 0.5 * u4, depth: 9 } : null }, sd);
    }
    // Bark: the third layer. The tree is encased in an unseen mesh of cells: points scattered evenly over its
    // surface, each owning the space nearer to it than to any other. Bark is a swathe of those cells switched on.
    // A swathe starts at one cell and spreads to neighbours. Two things steer it:
    //   percolate  the chance it goes on spreading after each cell: how far a swathe runs
    //   cohere     how strongly it prefers a cell that already touches several of its own: high keeps it compact,
    //              low lets it reach out in arms
    // Swathes are laid until `cover` of the cells are on. One smaller than `least` cells is not worth having and
    // is taken off again. Where bark stops, it stops on the boundary between two cells, so its edge is straight
    // runs and angles. The sheet itself is thin, flat-faced, of one thickness to its edge, and lies over the
    // strands, spanning the grooves between them. In places along the edge it has peeled.
    // Scar. Where a shoot has rotted out and the wood has healed over the place, what closes it is a different
    // stuff: soft and swollen, rolling in from the rim of the opening as a few lips of unequal size that press
    // together in creases. It is not wood and is not built of wood's pieces. It lies in the room the strands left
    // and nowhere else, so the strands hold it as they would an orb. It is narrower across the grain than along it,
    // as the opening is, and does not stand far out of the wood. heal: 0 none (an open hollow), about 0.45
    // lips round a hole, 0.9 closed (a knot).
    const heal = Object.assign({ knot: 0.9, hollow: 0 }, recipe.heal || {}); count.scars = 0;
    for (const v of wounds) { const hl = heal[v.kind] || 0; if (!hl || !v.asOrb || !t.orb) continue;
      const c = t.orb.c, R = t.orb.room, d = v.d, u = unit(cross(d, Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), w = cross(d, u), rs = rng((recipe.seed || 1) + 77), n = 3 + Math.floor(2 * rs()), cuts = [], lips = [];
      for (let i = 0, a = 2 * PI * rs(); i < n; i++) { cuts.push(a); a += 2 * PI / n * (0.6 + 0.8 * rs()); }
      for (let i = 0; i < n; i++) { const a0 = cuts[i], a1 = i + 1 < n ? cuts[i + 1] : cuts[0] + 2 * PI, lr = R * (0.2 + 0.42 * hl) * (0.6 + 0.8 * rs()), rr = Math.max(0, R - lr * 0.95), m = R * (0.15 + 0.2 * rs()), pts = [];
        for (let q = 0; q <= 4; q++) { const a = a0 + (a1 - a0) * (0.08 + 0.84 * q / 4); pts.push([0, 1, 2].map((k) => c[k] + d[k] * m + (u[k] * Math.cos(a) * 0.78 + w[k] * Math.sin(a)) * rr).concat(lr * (0.7 + 0.3 * Math.sin(PI * q / 4)))); }   // thickest in its middle
        lips.push(pts); }
      const f = (x, y, z) => { let dd = 9; for (const pts of lips) { let e = 9; for (let q = 0; q < 4; q++) { const a = pts[q], b = pts[q + 1], bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], tt = clamp(((x - a[0]) * bx + (y - a[1]) * by + (z - a[2]) * bz) / (bx * bx + by * by + bz * bz || 1e-9), 0, 1);
            e = Math.min(e, H(x - a[0] - bx * tt, y - a[1] - by * tt, z - a[2] - bz * tt) - (a[3] + (b[3] - a[3]) * tt)); } dd = smin(dd, e, 0.012); }
        return Math.max(dd, H(x - c[0], y - c[1], z - c[2]) - R * 0.99, (x - c[0]) * d[0] + (y - c[1]) * d[1] + (z - c[2]) * d[2] - 0.6 * R); };
      all.push({ f, C: [c], reach: [R + 0.02], layer: 4 }); count.scars++; }
    const bs = Math.min(1, (recipe.trunk && recipe.trunk[0] ? recipe.trunk[0][3] : 0.27) / 0.27);
    const BK = recipe.bare || recipe.bark === 0 ? null : Object.assign({ cell: 0.075 * bs, stretch: 1.6, cover: 0.4, percolate: 0.985, cohere: 0.6, least: 10, thick: 0.02 * bs, peel: 0.08, onRoots: false }, recipe.bark || {}), rb = rng((recipe.seed || 1) + 123);
    // which pieces are near which place, so that only those are asked
    const cell = 0.12, grid = new Map(), key = (x, y, z) => (x + 64) * 16384 + (y + 64) * 128 + z + 64;
    const index = (i) => { const s = all[i], seen = new Set(); s.C.forEach((c, j) => { const m = s.reach[j] + 0.06;
      for (let x = Math.floor((c[0] - m) / cell); x <= Math.floor((c[0] + m) / cell); x++) for (let y = Math.floor((c[1] - m) / cell); y <= Math.floor((c[1] + m) / cell); y++) for (let z = Math.floor((c[2] - m) / cell); z <= Math.floor((c[2] + m) / cell); z++) { const k = key(x, y, z); if (seen.has(k)) continue; seen.add(k); const b = grid.get(k); if (b) b.push(i); else grid.set(k, [i]); } }); };
    const solid = (x, y, z) => { const b = grid.get(key(Math.floor(x / cell), Math.floor(y / cell), Math.floor(z / cell))); let d = 0.1; if (b) for (const i of b) d = Math.min(d, all[i].f(x, y, z)); return d; };
    all.forEach((s, i) => index(i));
    count.bark = 0; count.barkCells = 0; count.cells = 0;
    if (BK) {
      // the cells: points on the outside of the wood. A cell is long along the grain and narrow across it, as bark
      // tears: distance from a cell's point is counted short along its strand's direction. No point is nearer
      // another than a cell's width, so counted.
      const sp = BK.cell, st = BK.stretch, P = [], gs = Math.max(0.1, sp * st), sgrid = new Map(), skey = (x, y, z) => (Math.floor(x / gs) + 512) * 1048576 + (Math.floor(y / gs) + 512) * 1024 + Math.floor(z / gs) + 512, cand = [];
      for (const q of t.strands) if (!q.thread) for (let i = walked && BK.onRoots ? 1 : q.root + 1; i < q.K - 1; i++) if (q.rho[i] > 0.012 * bs) { const low = walked && i <= q.root;
        const bar = (low ? i > q.root - 6 || q.rho[i] <= 0.016 * bs : i < q.root + 5 || q.rho[i] <= 0.02 * bs) || q.far[i] <= 0.9 * q.rho[i] ? 1 : 0; const T = tan(q, i), sv = unit(cross(T, q.O[i])); for (const e of [-0.8, 0, 0.8]) { let n = [0, 1, 2].map((c) => q.O[i][c] * (q.far[i] + 0.8 * q.rho[i]) + sv[c] * e * q.rho[i]); const al = dot(n, T); n = unit(n.map((v, c) => v - T[c] * al)); cand.push([0, 1, 2].map((c) => q.X[i * 3 + c] + (q.O[i][c] * 0.8 + sv[c] * e) * q.rho[i]).concat(T, q.far[i] + q.rho[i], n, bar, low ? 1 : 0, low ? st * 1.9 : st)); } }   // each with the way out from the middle of the wood there
      for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rb() * (i + 1)), x = cand[i]; cand[i] = cand[j]; cand[j] = x; }
      const dist = (c, x, y, z) => { const vx = x - c[0], vy = y - c[1], vz = z - c[2], al = vx * c[3] + vy * c[4] + vz * c[5]; return Math.sqrt(Math.max(0, vx * vx + vy * vy + vz * vz - al * al) + (al / (c[12] || st)) ** 2); };   // a root's bark tears longer along the grain than a trunk's
      const nearSeeds = (x, y, z, fn) => { const cx = Math.floor(x / gs), cy = Math.floor(y / gs), cz = Math.floor(z / gs); for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) for (let c = -2; c <= 2; c++) { const g = sgrid.get((cx + a + 512) * 1048576 + (cy + b + 512) * 1024 + cz + c + 512); if (g) for (const i of g) fn(i); } };
      // Bark may not lie on the foot, on a strand buried in the middle, on thin wood, or within reach of an orb's room. Those places have cells
      // all the same, barred from being switched on, so that wherever bark stops it stops on a boundary between two cells.
      for (const c of cand) { if (rooms.some((o) => away(o, c[0], c[1], c[2]) < o.room * 1.35 + 0.6 * sp * st) || wounds.some((v) => H(c[0] - v.c[0], c[1] - v.c[1], c[2] - v.c[2]) < v.r * 2 + 0.6 * sp * st)) c[10] = 1;
        let ok = true; nearSeeds(c[0], c[1], c[2], (i) => { if (ok && dist(c, P[i][0], P[i][1], P[i][2]) < sp) ok = false; }); if (!ok) continue; const k = skey(c[0], c[1], c[2]), g = sgrid.get(k); if (g) g.push(P.length); else sgrid.set(k, [P.length]); P.push(c); }
      const N = P.length, barred = P.map((p) => p[10]), nb = P.map((p, i) => { const out = []; nearSeeds(p[0], p[1], p[2], (j) => { if (j !== i && dist(p, P[j][0], P[j][1], P[j][2]) < 1.8 * sp) out.push(j); }); return out; }), girth = Math.max(0.01, ...P.filter((p, i) => !p[11] && (!walked || !barred[i])).map((p) => p[6])), girthL = Math.max(0.01, ...P.filter((p, i) => p[11] && (!walked || !barred[i])).map((p) => p[6]));
      const ref = (p) => (p[11] ? girthL : girth);   // a root is judged against the roots, a limb against the trunk
      for (let i = 0; i < N; i++) if (P[i][6] < 0.4 * ref(P[i])) barred[i] = 1;   // and not where the wood is a thin limb or a tip
      // swathes. cohere runs from 0 (a swathe reaches out in arms: it prefers a cell touching only one of its own)
      // to 1 (it stays compact: it prefers a cell touching several).
      const free = barred.filter((b) => !b).length, on = new Uint8Array(N), tried = new Uint8Array(N), power = -3 + 7 * BK.cohere; let lit = 0, swathes = 0;
      for (let go = 0; go < 2000 && lit < BK.cover * free; go++) {
        const start = Math.floor(rb() * N); if (on[start] || barred[start] || tried[start] || rb() > (P[start][6] / ref(P[start])) ** 2 || nb[start].some((j) => on[j])) continue; tried[start] = 1;   // bark begins where the wood is broad far more often than on a limb
        const mine = [start], inIt = new Set(mine);
        // (it spreads over broad wood sooner than out along a limb)
        while (lit + mine.length < BK.cover * free && rb() < BK.percolate) { const front = new Map(); for (const i of mine) for (const j of nb[i]) if (!inIt.has(j) && !on[j] && !barred[j]) front.set(j, (front.get(j) || 0) + 1); if (!front.size) break;
          let total = 0; const w = []; for (const [j, c] of front) { const v = Math.pow(c, power) * (P[j][6] / ref(P[j])) ** 2; w.push([j, v]); total += v; } let pick = rb() * total, chosen = w[0][0]; for (const [j, v] of w) { pick -= v; if (pick <= 0) { chosen = j; break; } } mine.push(chosen); inIt.add(chosen); }
        if (mine.length < BK.least) continue;   // not worth having
        for (const i of mine) on[i] = 1; lit += mine.length; swathes++; }
      count.bark = swathes; count.barkCells = lit; count.cells = N;
      // The sheet. Each cell that is on is one flat plate. It faces out from the middle of the wood and rests on the
      // highest wood under it, so it spans the grooves between strands and lies over whatever stands proud; plates
      // of neighbouring cells meet at an angle, or at a step where one rests higher. A plate on the border of its
      // swathe is hinged: it lifts toward the open side, a little everywhere and far in places (peel: the share
      // of border plates that have come away), and at the border the sheet is its own thickness and no more, so
      // that it is seen to lie on the wood and not to be the wood.
      // (Sunk, since: a plate is laid to the slope of the wood under it, not held level on its highest point, and it is as
      // thick as it takes to cover whatever stands proud of that slope, so no strand shows through. It is solid down to
      // the wood right to its border, which is then a step and not a sheet held clear. Only a few plates still lift.)
      const skin = BK.thick * 0.4, la = 0.4 * sp * st, lb = 0.4 * sp, plates = new Array(N).fill(null);
      for (let i = 0; i < N; i++) if (on[i]) { const p = P[i], T = [p[3], p[4], p[5]], n = [p[7], p[8], p[9]], u = cross(T, n), hs = []; let sum = 0, cnt = 0;
        for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) { const q = [0, 1, 2].map((c) => p[c] + T[c] * a * la + u[c] * b * lb), at = (tt) => solid(q[0] + n[0] * tt, q[1] + n[1] * tt, q[2] + n[2] * tt);
          if (at(0.1) < 0) { hs.push(null); continue; } let tt = 0.094; while (tt > -0.08 && at(tt) >= 0) tt -= 0.006; if (tt <= -0.08) { hs.push(null); continue; }
          let lo = tt, hi = tt + 0.006; for (let s = 0; s < 4; s++) { const m = (lo + hi) / 2; if (at(m) < 0) lo = m; else hi = m; } hs.push(hi); sum += hi; cnt++; }
        const t0 = cnt ? sum / cnt : 0; let ga = 0, gb = 0, e = 0; for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) { const h = hs[e++]; ga += a * (h === null ? t0 : h) / 6; gb += b * (h === null ? t0 : h) / 6; }
        ga = clamp(ga, -0.03, 0.03); gb = clamp(gb, -0.03, 0.03); let cover = 0; e = 0; for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) { const h = hs[e++]; if (h !== null) cover = Math.max(cover, h - (t0 + ga * a + gb * b)); }
        const off = nb[i].filter((j) => !on[j]); let bd = null, slope = 0;
        if (off.length) { let v = [0, 0, 0]; for (const j of off) { const d = unit([P[j][0] - p[0], P[j][1] - p[1], P[j][2] - p[2]]); v = v.map((x, c) => x + d[c]); } const al = dot(v, n); v = v.map((x, c) => x - n[c] * al);
          if (H(v[0], v[1], v[2]) > 0.2) { bd = unit(v); const u1 = rb(), u2 = rb(); slope = u1 < BK.peel ? 0.45 + 0.4 * u2 : 0; } }
        plates[i] = { n, T, u, t0, ga: ga / la, gb: gb / lb, top: Math.min(0.05, cover) + (p[11] ? skin * 0.5 : skin), bd, slope }; }   // and it is a thinner sheet
      // Between two plates the sheet does not break: over a band it passes from one to the other, a crease where
      // they meet at an angle and a ramp where one lies higher. Only a plate that has peeled is cut free of its
      // neighbours along its sides, and stands as a flake.
      const tau = 0.2 * sp, got = [];
      const f = (x, y, z) => { let d1 = 9, d0 = 9, i1 = -1; got.length = 0; nearSeeds(x, y, z, (i) => { const d = dist(P[i], x, y, z); if (on[i]) { if (d < 2.2 * sp) got.push(i, d); if (d < d1) { d1 = d; i1 = i; } } else if (d < d0) d0 = d; });
        if (d1 > 2 * sp) return 0.03; const border = (d0 - d1) / 2, pc = P[i1], vx = x - pc[0], vy = y - pc[1], vz = z - pc[2], al = Math.abs(vx * pc[3] + vy * pc[4] + vz * pc[5]), ac = Math.sqrt(Math.max(0, vx * vx + vy * vy + vz * vz - al * al));
        let edge = Math.min(border, 1.5 * sp - Math.max(al / st, ac, 0.75 * (al / st + ac))); if (edge < -0.03) return 0.03;   // border: how far inside the boundary between a cell that is on and one that is off; with no cell beyond it, a cell ends eight-sided, not round
        for (const o of rooms) edge = Math.min(edge, away(o, x, y, z) - o.room * 1.35);
        const flake = plates[i1].slope > 0.4; let sv = 0, sl = 0, sw = 0;
        for (let a = 0; a < got.length; a += 2) { const i = got[a], q = plates[i]; if (i !== i1 && (flake || q.slope > 0.4 || got[a + 1] > d1 + 5 * tau)) continue; const p = P[i], w = Math.exp(-(got[a + 1] - d1) / tau), ex = x - p[0], ey = y - p[1], ez = z - p[2];
          sv += w * (ex * q.n[0] + ey * q.n[1] + ez * q.n[2] - q.t0 - q.ga * (ex * q.T[0] + ey * q.T[1] + ez * q.T[2]) - q.gb * (ex * q.u[0] + ey * q.u[1] + ez * q.u[2]) - q.top); sw += w;
          if (q.bd) sl += w * Math.min(0.07, q.slope * Math.max(0, ex * q.bd[0] + ey * q.bd[1] + ez * q.bd[2] + 0.25 * sp)); }
        // v: how far above the sheet's top. Under the top it is solid for 0.07, well into the wood, unless it has lifted: then it is a sheet.
        const v = sv / sw, lift = sl / sw, thin = sstep(0.003, 0.012, lift), bottom = -0.07 + (0.07 + lift - BK.thick) * thin;
        return Math.max(v - lift, bottom - v, -edge * 0.9); };
      const C = [], reach = []; for (let i = 0; i < N; i++) if (on[i]) { C.push(P[i].slice(0, 3)); reach.push(sp * st * 0.9 + 0.08 + Math.abs(plates[i].t0) + plates[i].top); }
      if (C.length) { all.push({ f, C, reach, layer: 3 }); index(all.length - 1); }
    }
    // which layer the surface belongs to at a place: that of whichever piece is nearest there
    // the ground the tree was given, if any, is part of what is shown: its own layer, and no part of the wood
    const o = t.orb, gr = recipe.ground && !recipe.ground.level ? recipe.ground : null, f = gr ? (x, y, z) => Math.min(solid(x, y, z), gr(x, y, z)) : (x, y, z) => solid(x, y, z);
    // which STRAND the surface belongs to at a place -- the same nearest-piece rule as layerAt, reporting the root instead of the kind.
    // an aid, not a rule: it is what the colour-by-root view is drawn from, so a pile of lobes can be read as one root or several.
    f.whoAt = (x, y, z) => { const b = grid.get(key(Math.floor(x / cell), Math.floor(y / cell), Math.floor(z / cell))); let d = 9, w = -1; if (b) for (const i of b) { const v = all[i].f(x, y, z); if (v < d) { d = v; w = all[i].who === undefined ? -1 : all[i].who; } } if (gr && gr(x, y, z) < d) w = -1; return w; };
    f.layerAt = (x, y, z) => { const b = grid.get(key(Math.floor(x / cell), Math.floor(y / cell), Math.floor(z / cell))); let d = 9, l = 0; if (b) for (const i of b) { const v = all[i].f(x, y, z); if (v < d) { d = v; l = all[i].layer || 0; } } if (gr && gr(x, y, z) < d) l = 5; return l; };
    f.orb = o && !o.empty ? o : null; f.marks = wounds; f.measure = t.measure; f.count = count; f.recipe = recipe;
    // the settled strands, kept on the field so a probe can cut across a root it can see
    f.tree = t;
    return f;
  }
  // the same four trees. bare: bands only, so the body can be judged by itself. eyes: 0, because these four are
  // the record of what was approved and are kept as they were; eyes came later and belong to the grown trees.
  const bare = false, S = [
    ['one limb', tree({ bare, eyes: 0, seed: 1, trunk: [[0, 0.22, 0, 0.27], [0.08, 0.7, 0.02, 0.25], [-0.1, 1.1, 0.05, 0.22], [-0.32, 1.45, 0, 0.18], [-0.3, 1.8, -0.05, 0.14]], limbs: [{ at: 0.5, share: 0.38, path: [[0.35, 1.25, 0.15], [0.62, 1.3, 0.2], [0.8, 1.1, 0.15]] }] })],
    ['a loop', tree({ bare, eyes: 0, seed: 2, twist: 0.9, trunk: [[0, 0.22, 0, 0.28], [0.1, 0.7, 0, 0.26], [0.42, 1.05, 0.08, 0.23], [0.3, 1.5, 0.16, 0.2], [-0.26, 1.52, 0.08, 0.18], [-0.54, 1.08, -0.08, 0.16], [-0.2, 0.82, -0.22, 0.14], [0.2, 1.0, -0.34, 0.11]], limbs: [{ at: 0.42, share: 0.25, path: [[0.6, 1.8, 0.3], [0.82, 1.72, 0.36]] }] })],
    ['holding an orb', tree({ bare, eyes: 0, seed: 3, strands: 12, uneven: 0.9, lmax: 0.9, settle: 60, trunk: [[0, 0.22, 0, 0.3], [0, 0.6, 0, 0.28], [0.1, 1.0, 0, 0.23], [0.3, 1.4, 0.1, 0.18], [0.55, 1.7, 0.2, 0.13]], limbs: [{ at: 0.6, share: 0.3, path: [[-0.3, 1.3, -0.1], [-0.6, 1.5, -0.1], [-0.8, 1.35, 0]] }], orb: { at: 0.27, r: 0.13, room: 0.4, off: 0.75, split: { at: 1.2 } } }), 0.0065],
    ['forked low', tree({ bare, eyes: 0, seed: 4, strands: 10, twist: 0.3, trunk: [[0, 0.22, 0, 0.3], [-0.05, 0.6, 0, 0.28], [-0.2, 0.98, -0.05, 0.22], [-0.45, 1.35, -0.1, 0.17], [-0.5, 1.72, 0, 0.13]], limbs: [{ at: 0.3, share: 0.4, path: [[0.35, 0.9, 0.1], [0.55, 1.25, 0.2], [0.5, 1.6, 0.1]] }, { at: 0.62, share: 0.25, path: [[-0.6, 1.1, 0.25], [-0.85, 1.2, 0.35]] }] })],
  ];
  if (typeof location !== 'undefined') { const only = new URLSearchParams(location.search).get('only'); if (only) { const keep = only.split(',').map(Number).map((i) => S[i]).filter(Boolean); S.length = 0; S.push(...keep); } }   // ?only=2 builds just that tree
  window.Trees7 = { tree };   // later pages build on this
  window.Fantastic = { fields: S.map((s) => s[1]), names: S.map((s) => s[0]), orbs: S.map((s) => s[1].orb), measures: S.map((s) => s[1].measure), counts: S.map((s) => s[1].count), build: (i) => { const g = mesh(S[i][1], S[i][0], S[i][2] || 0.0095, 2.05), n = g.pos.length / 3; g.layer = new Uint8Array(n); g.who = new Int16Array(n); for (let q = 0; q < n; q++) { const px = g.pos[q * 3] - g.nrm[q * 3] * 0.004, py = g.pos[q * 3 + 1] - g.nrm[q * 3 + 1] * 0.004, pz = g.pos[q * 3 + 2] - g.nrm[q * 3 + 2] * 0.004; g.layer[q] = S[i][1].layerAt(px, py, pz); g.who[q] = S[i][1].whoAt(px, py, pz); } return g; }, mesh, kit: Fantastic.kit };
})();
