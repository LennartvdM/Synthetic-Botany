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
    { H, PI, clamp, sstep } = Fantastic.kit, mesh = Fantastic.mesh;
  function rng(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const unit = (a) => { const l = H(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }, cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  function tree(recipe) {
    const t = Trees.grow(recipe), r = rng((recipe.seed || 1) + 50), all = [], count = { bands: 0, fine: 0, slivers: 0, plates: 0, cut: 0, dropped: 0 };
    const at = (s, k) => [s.X[k * 3], s.X[k * 3 + 1], s.X[k * 3 + 2]], tan = (s, k) => unit([0, 1, 2].map((q) => s.X[Math.min(s.K - 1, k + 1) * 3 + q] - s.X[Math.max(0, k - 1) * 3 + q]));
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
    const mass = recipe.mass === undefined ? 1 : recipe.mass;
    // Elbows. A strand does not keep one width round a bend: the inside of the bend fills in, so it is broadest
    // at the elbow and its inner edge goes round on an easier curve than its middle. The sharper the bend the
    // more it fills, eased in before the corner and out after it, and never further than there is free room
    // on that side (another strand, or an orb's room), so that nothing is made to pass through anything. Where
    // the bend is a split's join, the inside is the other half of the same body, and the fill is the crotch.
    const gain = recipe.elbow === undefined ? 3 : recipe.elbow, pts = []; t.strands.forEach((q, qi) => { if (!q.thread) for (let i = 0; i < q.K; i++) pts.push([q.X[i * 3], q.X[i * 3 + 1], q.X[i * 3 + 2], q.rho[i], qi, q.fam]); });
    const roomToward = (p, n, want, rho, qi, fam) => { for (const o of pts) { if (o[4] === qi || (fam !== undefined && o[5] === fam)) continue; const d = [o[0] - p[0], o[1] - p[1], o[2] - p[2]], dl = H(d[0], d[1], d[2]); if (dl > want + rho + o[3] + 0.02 || dot(d, n) < 0.3 * dl) continue; want = Math.min(want, Math.max(0, dl - rho - o[3] - 0.012)); }
      if (t.orb) { const d = [t.orb.c[0] - p[0], t.orb.c[1] - p[1], t.orb.c[2] - p[2]], dl = H(d[0], d[1], d[2]); if (dot(d, n) > 0.3 * dl) want = Math.min(want, Math.max(0, dl - t.orb.room - rho)); } return want; };
    const ease = t.strands.map((q, qi) => { const K = q.K, g = new Float64Array(K), dir = new Array(K).fill(null), room = new Float64Array(K).fill(9); if (q.thread || !gain || K < 7) return { g, dir };
      for (let i = 2; i < K - 2; i++) { const p = at(q, i), a = at(q, i - 2), b = at(q, i + 2), h = (H(b[0] - p[0], b[1] - p[1], b[2] - p[2]) + H(a[0] - p[0], a[1] - p[1], a[2] - p[2])) / 2 || 1e-9, T = tan(q, i);
        let kv = [0, 1, 2].map((j) => (a[j] + b[j] - 2 * p[j]) / (h * h)); const al = dot(kv, T); kv = kv.map((v, j) => v - T[j] * al); const kap = H(kv[0], kv[1], kv[2]), rho = q.rho[i]; if (kap * rho < 0.06) continue;
        const n = kv.map((v) => v / kap); dir[i] = n; let want = rho * Math.min(1.5, gain * (kap * rho - 0.06));
        for (const o of pts) { if (o[4] === qi || (q.fam !== undefined && o[5] === q.fam)) continue;
          const d = [o[0] - p[0], o[1] - p[1], o[2] - p[2]], dl = H(d[0], d[1], d[2]); if (dl > want + rho + o[3] + 0.02 || dot(d, n) < 0.3 * dl) continue; want = Math.min(want, Math.max(0, dl - rho - o[3] - 0.012)); }
        if (t.orb) { const d = [t.orb.c[0] - p[0], t.orb.c[1] - p[1], t.orb.c[2] - p[2]], dl = H(d[0], d[1], d[2]); if (dot(d, n) > 0.3 * dl) want = Math.min(want, Math.max(0, dl - t.orb.room - rho)); }
        g[i] = want; room[i] = want; }
      for (let pass = 0; pass < 3; pass++) { const c = Float64Array.from(g); for (let i = 1; i < K - 1; i++) g[i] = Math.max(c[i] * 0.5 + 0.25 * (c[i - 1] + c[i + 1]), 0); }   // eased in and out along the strand
      for (let i = 0; i < K; i++) { if (!dir[i]) { let j = 1; while (j < 4 && !(dir[i - j] || dir[i + j])) j++; dir[i] = dir[i - j] || dir[i + j] || null; if (!dir[i]) g[i] = 0; else room[i] = Math.min(room[Math.max(0, i - j)], room[Math.min(K - 1, i + j)], 9) === 9 ? 0 : Math.min(room[i - j] === undefined ? 9 : room[i - j], room[i + j] === undefined ? 9 : room[i + j]); } g[i] = Math.min(g[i], room[i]); }
      return { g, dir }; });
    for (const [si, s] of t.strands.entries()) {
      const K = s.K, fine = !!s.vine, ridge0 = 0.7 * (r() - 0.5); let k = 0, first = true;
      while (k < K - 1) {
        const rho0 = s.rho[Math.min(K - 1, k + 2)], want = chain && !s.thread ? Math.max(7, Math.round((7 + 10 * r()) * Math.max(rho0, 0.02) / 0.035)) : K; let k1 = Math.min(K - 1, k + want); if (K - 1 - k1 < 6) k1 = K - 1;
        const k0 = first ? 0 : Math.max(0, k - 3), n = k1 - k0, last = k1 === K - 1, wide = (fine ? 0.95 : 1.15) + 0.2 * r(), high = (fine ? 0.8 : 0.62) + 0.25 * r(), stiff = chain ? 0.55 + 0.35 * r() : 0, proud = chain ? 0.1 + 0.25 * r() : 0, massW = 1.55 + 0.4 * r(), e = r(), ending = last ? 'own' : e < 0.4 ? 'point' : e < 0.75 ? 'blunt' : 'step';
        const A = at(s, k0), B = at(s, k1), C = [], O = [], W = [], Hh = [], D = [];
        for (let i = k0; i <= k1; i++) { const q = (i - k0) / n, base = at(s, i), rho = s.rho[i], off = [0, 1, 2].map((j) => A[j] + (B[j] - A[j]) * q - base[j]), far = H(off[0], off[1], off[2]) || 1e-9, stay = Math.min(stiff, 0.35 * rho / far);
          const no = nearOrb(base), tornHere = s.gap && s.inner && s.inner[i] ? Math.min(1, s.gap[i] / (1.2 * rho)) : 0, alone = 1 - sstep(0.9, 2.0, s.far[i] / rho), free = s.thread ? 1 : Math.max(no, tornHere, alone, 1 - sstep(s.root, s.root + 8, i)), body = mass * (1 - free),   // a strand running alone is a limb, not part of a mass
          toMid = Math.max(0.95 * rho, Math.min(s.far[i] * 0.9, (s.limb >= 0 ? 1.5 : 3.2) * rho));   // a limb is thin: reaching for its middle must not come out of its other side
          const lift = first ? proud * q * q : -0.28 * (1 - sstep(0, 0.3, q)) + proud * q * q, front = ending === 'point' ? Math.pow(Math.min(1, (1 - q) / 0.3), 0.7) : 1, back = first ? 1 : 0.7 + 0.3 * sstep(0, 0.3, q), w = Math.min(wide, 1.05 + (wide - 1.05) * (1 - no)) + body * (massW - 1.05);
          let deepHere = rho * 0.95 + body * (toMid - rho * 0.95); if (t.orb) deepHere = Math.max(rho * 0.5, Math.min(deepHere, H(base[0] - t.orb.c[0], base[1] - t.orb.c[1], base[2] - t.orb.c[2]) - t.orb.room - 0.01));   // never into an orb's room
          const eg = ease[si].g[i], en = ease[si].dir[i], inn = s.inner && s.gap && s.gap[i] > 0 ? s.inner[i] : null, sv = eg || inn ? unit(cross(tan(s, i), s.O[i])) : null, gu = eg ? eg * dot(en, sv) : 0, gv = eg ? eg * dot(en, s.O[i]) : 0;   // the elbow's fill, across the strand and through it
          // a tear's lip: toward what it tore from, a part reaches a quarter of the way across the gap, so that
          // where the gap is narrow the two lips all but meet (a web with a slit), and where it is wide they stand apart
          let lipU = 0; if (inn) { const sg = dot(inn, sv); if (Math.abs(sg) > 0.4) lipU = Math.sign(sg) * roomToward(base, sv.map((v) => v * Math.sign(sg)), Math.min(0.25 * s.gap[i], 1.0 * rho), rho, si, s.fam); }
          C.push([0, 1, 2].map((j) => base[j] + off[j] * stay + s.O[i][j] * rho * lift + (sv ? sv[j] * (gu + lipU) / 2 : 0))); O.push(s.O[i]); W.push(Math.max(0.006, rho * w * front * back + (Math.abs(gu) + Math.abs(lipU)) / 2)); Hh.push(rho * high * (0.6 + 0.4 * front) + Math.max(0, gv) * 0.5); D.push(deepHere + Math.max(0, -gv)); }
        const w1 = W[W.length - 1], end = ending === 'own' ? (s.snapped ? { skew: (r() < 0.5 ? -1 : 1) * (1.8 + 1.4 * r()), step: r() < 0.5 ? { u: 0.5 * (r() - 0.5), side: r() < 0.5 ? -1 : 1, a: w1 * (0.8 + 1.4 * r()) } : null } : { skew: 0 })
          : ending === 'step' ? { skew: (r() < 0.5 ? -1 : 1) * (1.8 + 1.2 * r()), step: { u: 0.5 * (r() - 0.5), side: r() < 0.5 ? -1 : 1, a: w1 * (0.9 + 1.2 * r()) } } : ending === 'blunt' ? { skew: (r() < 0.5 ? -1 : 1) * (1.8 + 1.4 * r()) } : { skew: 0 };
        // a part that has torn from another is thickest on its far side and thins to a lip toward the tear
        const mid = (k0 + k1) >> 1, inn = s.inner && s.inner[mid], sg = inn ? dot(inn, unit(cross(tan(s, mid), s.O[mid]))) : 0, torn = Math.abs(sg) > 0.4 ? Math.sign(sg) : 0, e1 = 0.2 + 0.5 * r(), e2 = 0.2 + 0.5 * r(), rd = clamp(ridge0 + 0.4 * (r() - 0.5), -0.6, 0.6);
        all.push(Object.assign(shard(Object.assign({ C, O, W, Hh, D, deep: Math.max(...D), seed: 1 + Math.floor(r() * 1e6), wiggle: 1, ridge: torn ? -0.4 * torn : rd, eL: torn < 0 ? 0.3 : torn > 0 ? 0.55 : e1, eR: torn > 0 ? 0.3 : torn < 0 ? 0.55 : e2, feather: torn, featherAmt: 0.78 }, s.thread ? { skew: 0 } : end)), { layer: fine || torn || (s.gap && s.gap[mid] > 0) ? 1 : 0 }));
        count[fine ? 'fine' : 'bands'] = (count[fine ? 'fine' : 'bands'] || 0) + 1; k = k1; first = false;
      }
    }
    // where a strand is on the outside of the wood, and off the ground
    const outer = (s, k) => k > s.root + 4 && k < s.K - 3 && s.far[k] > 1.1 * s.rho[k] && s.rho[k] > 0.03;
    const stretch = (s, len) => { for (let go = 0; go < 6; go++) { const k0 = s.root + 4 + Math.floor(r() * Math.max(1, s.K - s.root - len - 8)), k1 = k0 + len; if (k1 < s.K - 2 && outer(s, k0) && outer(s, k1) && outer(s, (k0 + k1) >> 1)) return [k0, k1]; } return null; };
    const thick = t.strands.filter((q) => !q.vine && !(q.inner && q.inner.some((v) => v)) && Math.max(...q.rho) > 0.045);
    if (!recipe.bare) for (const s of thick) for (let j = 0; j < 2; j++) {   // slivers
      const u = r(), len = 10 + Math.floor(18 * r()), side = (r() < 0.5 ? -1 : 1) * (0.25 + 0.5 * r()), lift = 0.3 + 0.7 * r(), wide = 0.3 + 0.25 * r(), high = 0.3 + 0.2 * r(), sd = 1 + Math.floor(r() * 1e6), rd = 0.8 * (r() - 0.5), eL = 0.1 + 0.6 * r(), eR = 0.1 + 0.6 * r(), st = u < 0.6 ? stretch(s, len) : null; if (!st) continue;
      const C = [], O = [], W = [], Hh = [], D = [];
      for (let k = st[0]; k <= st[1]; k++) { const q = (k - st[0]) / len, o = s.O[k], sv = unit(cross(tan(s, k), o)), rho = s.rho[k], fine = Math.min(1, q / 0.3, (1 - q) / 0.5), p = at(s, k);
        C.push([0, 1, 2].map((i) => p[i] + o[i] * rho * (0.5 + lift * q * q) + sv[i] * rho * side)); O.push(o); W.push(Math.max(0.004, rho * wide * fine)); Hh.push(rho * high * (0.5 + 0.5 * fine)); D.push(rho * 0.5); }
      all.push(Object.assign(shard({ C, O, W, Hh, D, deep: Math.max(...D), seed: sd, wiggle: 1, ridge: rd, eL, eR, skew: 0 }), { layer: 2 })); count.slivers++;
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
        if (!hit.some((h) => h)) { const sh = Object.assign(shard(K), { layer: 2 }); all.push(sh); shell.push(sh); count.plates++; if (go) count.cut++; return; }
        let best = [0, -1], from = 0; for (let k = 0; k <= n; k++) if (k === n || hit[k]) { if (k - 1 - from > best[1] - best[0]) best = [from, k - 1]; from = k + 1; }
        const a = best[0] + (best[0] > 0 ? 1 : 0), b = best[1] - (best[1] < n - 1 ? 1 : 0); if (b - a < 6) break;
        if (forward) { const z = k0; k0 = z + a; k1 = z + b; } else { const z = k1; k1 = z - a; k0 = z - b; }
      }
      count.dropped++;
    };
    const want = recipe.bare ? 0 : recipe.plates === undefined ? 16 : recipe.plates, splitAt = [Math.floor(want * r()), Math.floor(want * r())];
    for (let j = 0; j < want; j++) {
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
    const BK = recipe.bare || recipe.bark === 0 ? null : Object.assign({ cell: 0.045, stretch: 2.5, cover: 0.3, percolate: 0.985, cohere: 0.6, least: 14, thick: 0.03 }, recipe.bark || {}), rb = rng((recipe.seed || 1) + 123);
    const wcell = 0.15, wgrid = new Map(), wkey = (x, y, z) => (Math.floor(x / wcell) + 512) * 1048576 + (Math.floor(y / wcell) + 512) * 1024 + Math.floor(z / wcell) + 512;
    for (const q of t.strands) if (!q.thread) for (let i = 0; i < q.K; i++) { const p = [q.X[i * 3], q.X[i * 3 + 1], q.X[i * 3 + 2], q.rho[i]], k = wkey(p[0], p[1], p[2]), b = wgrid.get(k); if (b) b.push(p); else wgrid.set(k, [p]); }
    // how far a place is outside the wood, taken softly so that the grooves between strands are bridged
    const soft = 0.011, envelope = (x, y, z) => { let sum = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) { const g = wgrid.get(wkey(x + a * wcell, y + b * wcell, z + c * wcell)); if (!g) continue; for (const p of g) { const d = H(x - p[0], y - p[1], z - p[2]) - 0.92 * p[3]; if (d < 0.08) sum += Math.exp(-d / soft); } } return sum > 0 ? -soft * Math.log(sum) : 0.2; };
    const hash3 = (i, j, k, n) => { let v = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1440662683) ^ Math.imul(n, 2246822519); v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) / 4294967296; };
    const vnoise = (x, y, z, n) => { const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), u = x - i, v = y - j, w = z - k, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v), sw = w * w * (3 - 2 * w), L = (a, b, t) => a + (b - a) * t;
      return L(L(L(hash3(i, j, k, n), hash3(i + 1, j, k, n), su), L(hash3(i, j + 1, k, n), hash3(i + 1, j + 1, k, n), su), sv), L(L(hash3(i, j, k + 1, n), hash3(i + 1, j, k + 1, n), su), L(hash3(i, j + 1, k + 1, n), hash3(i + 1, j + 1, k + 1, n), su), sv), sw); };
    count.bark = 0; count.barkCells = 0; count.cells = 0;
    if (BK) {
      // the cells: points on the outside of the wood. A cell is long along the grain and narrow across it, as bark
      // tears: distance from a cell's point is counted short along its strand's direction. No point is nearer
      // another than a cell's width, so counted.
      const sp = BK.cell, st = BK.stretch, P = [], gs = Math.max(0.1, sp * st), sgrid = new Map(), skey = (x, y, z) => (Math.floor(x / gs) + 512) * 1048576 + (Math.floor(y / gs) + 512) * 1024 + Math.floor(z / gs) + 512, cand = [];
      for (const q of t.strands) if (!q.thread) for (let i = q.root + 1; i < q.K - 1; i++) if (q.rho[i] > 0.02 && q.far[i] > 0.9 * q.rho[i]) { const T = tan(q, i), sv = unit(cross(T, q.O[i])); for (const e of [-0.8, 0, 0.8]) cand.push([0, 1, 2].map((c) => q.X[i * 3 + c] + (q.O[i][c] * 0.8 + sv[c] * e) * q.rho[i]).concat(T, q.rho[i])); }
      for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rb() * (i + 1)), x = cand[i]; cand[i] = cand[j]; cand[j] = x; }
      const dist = (c, x, y, z) => { const vx = x - c[0], vy = y - c[1], vz = z - c[2], al = vx * c[3] + vy * c[4] + vz * c[5]; return Math.sqrt(Math.max(0, vx * vx + vy * vy + vz * vz - al * al) + (al / st) ** 2); };
      const nearSeeds = (x, y, z, fn) => { const cx = Math.floor(x / gs), cy = Math.floor(y / gs), cz = Math.floor(z / gs); for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) for (let c = -2; c <= 2; c++) { const g = sgrid.get((cx + a + 512) * 1048576 + (cy + b + 512) * 1024 + cz + c + 512); if (g) for (const i of g) fn(i); } };
      for (const c of cand) { if (t.orb && H(c[0] - t.orb.c[0], c[1] - t.orb.c[1], c[2] - t.orb.c[2]) < t.orb.room * 1.25) continue; let ok = true; nearSeeds(c[0], c[1], c[2], (i) => { if (ok && dist(c, P[i][0], P[i][1], P[i][2]) < sp) ok = false; }); if (!ok) continue; const k = skey(c[0], c[1], c[2]), g = sgrid.get(k); if (g) g.push(P.length); else sgrid.set(k, [P.length]); P.push(c); }
      const N = P.length, nb = P.map((p, i) => { const out = []; nearSeeds(p[0], p[1], p[2], (j) => { if (j !== i && dist(p, P[j][0], P[j][1], P[j][2]) < 1.8 * sp) out.push(j); }); return out; }), girth = Math.max(...P.map((p) => p[6]));
      // swathes. cohere runs from 0 (a swathe reaches out in arms: it prefers a cell touching only one of its own)
      // to 1 (it stays compact: it prefers a cell touching several).
      const on = new Uint8Array(N), tried = new Uint8Array(N), power = -3 + 7 * BK.cohere; let lit = 0, swathes = 0;
      for (let go = 0; go < 2000 && lit < BK.cover * N; go++) {
        const start = Math.floor(rb() * N); if (on[start] || tried[start] || rb() > P[start][6] / girth || nb[start].some((j) => on[j])) continue; tried[start] = 1;   // bark begins on heavy wood more often than on a twig
        const mine = [start], inIt = new Set(mine);
        while (lit + mine.length < BK.cover * N && rb() < BK.percolate) { const front = new Map(); for (const i of mine) for (const j of nb[i]) if (!inIt.has(j) && !on[j]) front.set(j, (front.get(j) || 0) + 1); if (!front.size) break;
          let total = 0; const w = []; for (const [j, c] of front) { const v = Math.pow(c, power); w.push([j, v]); total += v; } let pick = rb() * total, chosen = w[0][0]; for (const [j, v] of w) { pick -= v; if (pick <= 0) { chosen = j; break; } } mine.push(chosen); inIt.add(chosen); }
        if (mine.length < BK.least) continue;   // not worth having
        for (const i of mine) on[i] = 1; lit += mine.length; swathes++; }
      count.bark = swathes; count.barkCells = lit; count.cells = N;
      // how far outside the wood, kept at the corners of a fine grid as they are asked for
      const g0 = 0.02, memo = new Map(), Eat = (i, j, k) => { const key = (i + 512) * 1048576 + (j + 512) * 1024 + k + 512; let v = memo.get(key); if (v === undefined) { v = envelope(i * g0, j * g0, k * g0); memo.set(key, v); } return v; };
      const th = BK.thick, peel = th * 1.4, seed = 1 + Math.floor(rb() * 1e6);
      const f = (x, y, z) => { let d1 = 9, d0 = 9; nearSeeds(x, y, z, (i) => { const d = dist(P[i], x, y, z); if (on[i]) { if (d < d1) d1 = d; } else if (d < d0) d0 = d; });
        if (d1 > 2 * sp) return 0.03; const border = (d0 - d1) / 2; let edge = Math.min(border, 1.6 * sp - d1); if (edge < -0.03) return 0.03;   // border: how far inside the boundary between a cell that is on and one that is off
        if (t.orb) edge = Math.min(edge, H(x - t.orb.c[0], y - t.orb.c[1], z - t.orb.c[2]) - t.orb.room * 1.35);
        const fi = x / g0, fj = y / g0, fk = z / g0, i = Math.floor(fi), j = Math.floor(fj), k = Math.floor(fk), wi = fi - i, wj = fj - j, wk = fk - k;
        const e = ((Eat(i, j, k) * (1 - wk) + Eat(i, j, k + 1) * wk) * (1 - wj) + (Eat(i, j + 1, k) * (1 - wk) + Eat(i, j + 1, k + 1) * wk) * wj) * (1 - wi) + ((Eat(i + 1, j, k) * (1 - wk) + Eat(i + 1, j, k + 1) * wk) * (1 - wj) + (Eat(i + 1, j + 1, k) * (1 - wk) + Eat(i + 1, j + 1, k + 1) * wk) * wj) * wi;
        const near = sstep(0.05, 0, border) * sstep(0.52, 0.64, vnoise(x / 0.2, y / 0.2, z / 0.2, seed)), up = peel * near;   // peeled in places, and only along a real border
        return Math.max(e - th - up, -0.035 + (0.035 + up * 0.85) * near - e, -edge * 0.9); };
      const C = [], reach = []; for (let i = 0; i < N; i++) if (on[i]) { C.push(P[i].slice(0, 3)); reach.push(sp * st * 0.9 + th + peel); }
      if (C.length) all.push({ f, C, reach, layer: 3 });
    }
    // which strands are near which place, so that only those are asked
    const cell = 0.12, grid = new Map(), key = (x, y, z) => (x + 64) * 16384 + (y + 64) * 128 + z + 64;
    all.forEach((s, i) => { const seen = new Set(); s.C.forEach((c, j) => { const m = s.reach[j] + 0.06;
      for (let x = Math.floor((c[0] - m) / cell); x <= Math.floor((c[0] + m) / cell); x++) for (let y = Math.floor((c[1] - m) / cell); y <= Math.floor((c[1] + m) / cell); y++) for (let z = Math.floor((c[2] - m) / cell); z <= Math.floor((c[2] + m) / cell); z++) { const k = key(x, y, z); if (seen.has(k)) continue; seen.add(k); const b = grid.get(k); if (b) b.push(i); else grid.set(k, [i]); } }); });
    const o = t.orb, f = (x, y, z) => { const b = grid.get(key(Math.floor(x / cell), Math.floor(y / cell), Math.floor(z / cell))); let d = 0.1; if (b) for (const i of b) d = Math.min(d, all[i].f(x, y, z)); return d; };
    // which layer the surface belongs to at a place: that of whichever piece is nearest there
    f.layerAt = (x, y, z) => { const b = grid.get(key(Math.floor(x / cell), Math.floor(y / cell), Math.floor(z / cell))); let d = 9, l = 0; if (b) for (const i of b) { const v = all[i].f(x, y, z); if (v < d) { d = v; l = all[i].layer || 0; } } return l; };
    f.orb = o; f.measure = t.measure; f.count = count; return f;
  }
  // the same four trees. bare: bands only, so the body can be judged by itself.
  const bare = false, S = [
    ['one limb', tree({ bare, seed: 1, trunk: [[0, 0.22, 0, 0.27], [0.08, 0.7, 0.02, 0.25], [-0.1, 1.1, 0.05, 0.22], [-0.32, 1.45, 0, 0.18], [-0.3, 1.8, -0.05, 0.14]], limbs: [{ at: 0.5, share: 0.38, path: [[0.35, 1.25, 0.15], [0.62, 1.3, 0.2], [0.8, 1.1, 0.15]] }] })],
    ['a loop', tree({ bare, seed: 2, twist: 0.9, trunk: [[0, 0.22, 0, 0.28], [0.1, 0.7, 0, 0.26], [0.42, 1.05, 0.08, 0.23], [0.3, 1.5, 0.16, 0.2], [-0.26, 1.52, 0.08, 0.18], [-0.54, 1.08, -0.08, 0.16], [-0.2, 0.82, -0.22, 0.14], [0.2, 1.0, -0.34, 0.11]], limbs: [{ at: 0.42, share: 0.25, path: [[0.6, 1.8, 0.3], [0.82, 1.72, 0.36]] }] })],
    ['holding an orb', tree({ bare, seed: 3, strands: 12, uneven: 0.9, lmax: 0.9, settle: 60, trunk: [[0, 0.22, 0, 0.3], [0, 0.6, 0, 0.28], [0.1, 1.0, 0, 0.23], [0.3, 1.4, 0.1, 0.18], [0.55, 1.7, 0.2, 0.13]], limbs: [{ at: 0.6, share: 0.3, path: [[-0.3, 1.3, -0.1], [-0.6, 1.5, -0.1], [-0.8, 1.35, 0]] }], orb: { at: 0.27, r: 0.13, room: 0.4, off: 0.75, split: { at: 1.2 } } }), 0.0065],
    ['forked low', tree({ bare, seed: 4, strands: 10, twist: 0.3, trunk: [[0, 0.22, 0, 0.3], [-0.05, 0.6, 0, 0.28], [-0.2, 0.98, -0.05, 0.22], [-0.45, 1.35, -0.1, 0.17], [-0.5, 1.72, 0, 0.13]], limbs: [{ at: 0.3, share: 0.4, path: [[0.35, 0.9, 0.1], [0.55, 1.25, 0.2], [0.5, 1.6, 0.1]] }, { at: 0.62, share: 0.25, path: [[-0.6, 1.1, 0.25], [-0.85, 1.2, 0.35]] }] })],
  ];
  if (typeof location !== 'undefined') { const only = new URLSearchParams(location.search).get('only'); if (only) { const keep = only.split(',').map(Number).map((i) => S[i]).filter(Boolean); S.length = 0; S.push(...keep); } }   // ?only=2 builds just that tree
  window.Trees7 = { tree };   // later pages build on this
  window.Fantastic = { names: S.map((s) => s[0]), orbs: S.map((s) => s[1].orb), measures: S.map((s) => s[1].measure), counts: S.map((s) => s[1].count), build: (i) => { const g = mesh(S[i][1], S[i][0], S[i][2] || 0.0095, 2.05), n = g.pos.length / 3; g.layer = new Uint8Array(n); for (let q = 0; q < n; q++) g.layer[q] = S[i][1].layerAt(g.pos[q * 3] - g.nrm[q * 3] * 0.004, g.pos[q * 3 + 1] - g.nrm[q * 3 + 1] * 0.004, g.pos[q * 3 + 2] - g.nrm[q * 3 + 2] * 0.004); return g; }, mesh, kit: Fantastic.kit };
})();
