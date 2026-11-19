// Sketchbook, page 7. Trees. The structure is trees.js: strands settled against each other, each running from
// a root up the trunk and out to its end. The surface is page 5's wood, laid on the strands:
//   bands    one to a strand: flat faces meeting at a ridge that wanders, a little give in its width. A strand
//            that snapped ends in a break, cut on the slant or stepped.
//   slivers  narrow shards lying on the bands, pointed at both ends, their far ends standing off.
//   shell    thin rigid plates in a few places on the outer strands. Back sunk into the band, front lying on
//            top and ending in a point, a slant or a step; nearly all face toward the tip. No plate passes
//            through another. One or two have split from the front.
// Nothing is swept or blended. Throwaway like the other pages.
(function () {
  const { shard } = Wood5, { H, PI, clamp, sstep } = Fantastic.kit, mesh = Fantastic.mesh;
  function rng(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const unit = (a) => { const l = H(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }, cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  function tree(recipe) {
    const t = Trees.grow(recipe), r = rng((recipe.seed || 1) + 50), all = [], count = { bands: 0, slivers: 0, plates: 0, cut: 0, dropped: 0 };
    const at = (s, k) => [s.X[k * 3], s.X[k * 3 + 1], s.X[k * 3 + 2]], tan = (s, k) => unit([0, 1, 2].map((q) => s.X[Math.min(s.K - 1, k + 1) * 3 + q] - s.X[Math.max(0, k - 1) * 3 + q]));
    for (const s of t.strands) {   // bands
      const K = s.K, wide = 1.4 + 0.3 * r(), high = 0.3 + 0.25 * r(), draw = 0.25 * (r() < 0.5 ? -1 : 1) * (0.5 + 0.5 * r()), waves = 1 + Math.floor(2 * r()), C = [], W = [], Hh = [], D = [];
      for (let k = 0; k < K; k++) { const q = k / (K - 1), bow = Math.sin(PI * waves * q) * Math.sqrt(Math.sin(PI * q)); const alone = 1 - sstep(0.9, 2.0, s.far[k] / s.rho[k]);   // in a bundle a strand shows one broad face; by itself it is a whole limb, and as deep as it is wide
        C.push(at(s, k)); W.push(Math.max(0.004, s.rho[k] * (wide + (1.05 - wide) * alone) * (1 + draw * bow))); Hh.push(s.rho[k] * (high + (0.85 - high) * alone)); D.push(s.rho[k] * 0.95); }
      const w1 = W[K - 1], brk = s.snapped ? { skew: (r() < 0.5 ? -1 : 1) * (0.6 + 1.0 * r()), step: r() < 0.5 ? { u: 0.5 * (r() - 0.5), side: r() < 0.5 ? -1 : 1, a: w1 * (0.8 + 1.4 * r()) } : null } : { skew: 0 };
      all.push(shard(Object.assign({ C, O: s.O, W, Hh, D, deep: Math.max(...D), seed: 1 + Math.floor(r() * 1e6), wiggle: 1, ridge: 0.7 * (r() - 0.5), eL: 0.2 + 0.5 * r(), eR: 0.2 + 0.5 * r() }, brk))); count.bands++;
    }
    // where a strand is on the outside of the wood, and off the ground
    const outer = (s, k) => k > s.root + 4 && k < s.K - 3 && s.far[k] > 1.1 * s.rho[k] && s.rho[k] > 0.03;
    const stretch = (s, len) => { for (let go = 0; go < 6; go++) { const k0 = s.root + 4 + Math.floor(r() * Math.max(1, s.K - s.root - len - 8)), k1 = k0 + len; if (k1 < s.K - 2 && outer(s, k0) && outer(s, k1) && outer(s, (k0 + k1) >> 1)) return [k0, k1]; } return null; };
    if (!recipe.bare) for (const s of t.strands) for (let j = 0; j < 2; j++) {   // slivers
      const u = r(), len = 10 + Math.floor(18 * r()), side = (r() < 0.5 ? -1 : 1) * (0.25 + 0.5 * r()), lift = 0.3 + 0.7 * r(), wide = 0.3 + 0.25 * r(), high = 0.3 + 0.2 * r(), sd = 1 + Math.floor(r() * 1e6), rd = 0.8 * (r() - 0.5), eL = 0.1 + 0.6 * r(), eR = 0.1 + 0.6 * r(), st = u < 0.6 ? stretch(s, len) : null; if (!st) continue;
      const C = [], O = [], W = [], Hh = [], D = [];
      for (let k = st[0]; k <= st[1]; k++) { const q = (k - st[0]) / len, o = s.O[k], sv = unit(cross(tan(s, k), o)), rho = s.rho[k], fine = Math.min(1, q / 0.3, (1 - q) / 0.5), p = at(s, k);
        C.push([0, 1, 2].map((i) => p[i] + o[i] * rho * (0.5 + lift * q * q) + sv[i] * rho * side)); O.push(o); W.push(Math.max(0.004, rho * wide * fine)); Hh.push(rho * high * (0.5 + 0.5 * fine)); D.push(rho * 0.5); }
      all.push(shard({ C, O, W, Hh, D, deep: Math.max(...D), seed: sd, wiggle: 1, ridge: rd, eL, eR, skew: 0 })); count.slivers++;
    }
    // the shell
    const shell = [], room = 0.012, rigid = 0.8;
    const makePlate = (s, k0, k1, forward, side, wide, high, ending, P, seed) => {
      if (k1 - k0 < 8) return null; const on = [], outs = [], Rs = [], qs = [], n0 = k1 - k0;
      for (let k = forward ? k0 : k1; forward ? k <= k1 : k >= k0; k += forward ? 1 : -1) { const q = Math.abs(k - (forward ? k0 : k1)) / n0, o = s.O[k], sv = unit(cross(tan(s, k), o)), rho = s.rho[k], p = at(s, k), lift = -0.3 + 1.45 * sstep(0, 0.5, q) + 0.3 * q * q;   // from its back to its front: sunk, then up through the band, then lying on it
        on.push([0, 1, 2].map((i) => p[i] + o[i] * rho * lift + sv[i] * rho * side)); outs.push(o); Rs.push(rho); qs.push(q); }
      const n = on.length, km = clamp(Math.round(n * 0.62), 1, n - 2), Tm = unit([0, 1, 2].map((i) => on[km + 1][i] - on[km - 1][i])), arc = new Array(n).fill(0);
      for (let k = km + 1; k < n; k++) arc[k] = arc[k - 1] + H(on[k][0] - on[k - 1][0], on[k][1] - on[k - 1][1], on[k][2] - on[k - 1][2]);
      for (let k = km - 1; k >= 0; k--) arc[k] = arc[k + 1] - H(on[k][0] - on[k + 1][0], on[k][1] - on[k + 1][1], on[k][2] - on[k + 1][2]);
      const C = [], O = [], W = [], Hh = [], rr = rng(seed);
      for (let k = 0; k < n; k++) {   // rigid: part way to dead straight, and never more than about half a strand's girth off its line
        const off = [0, 1, 2].map((i) => on[km][i] + Tm[i] * arc[k] - on[k][i]), far = H(off[0], off[1], off[2]) || 1e-9, stay = Math.min(rigid, 0.6 * Rs[k] / far), front = ending === 'point' ? Math.pow(Math.min(1, (1 - qs[k]) / 0.3), 0.7) : 1, back = 0.55 + 0.45 * sstep(0, 0.35, qs[k]);
        C.push([0, 1, 2].map((i) => on[k][i] + off[i] * stay)); O.push(unit([0, 1, 2].map((i) => outs[k][i] + (outs[km][i] - outs[k][i]) * rigid))); W.push(Math.max(0.004, Rs[k] * wide * front * back)); Hh.push(Rs[k] * high * (0.5 + 0.5 * front) * (1 - 0.45 * qs[k] * qs[k])); }
      const w1 = Rs[n - 1] * wide, end = ending === 'step' ? { skew: 0.4 * (rr() - 0.5), step: { u: 0.5 * (rr() - 0.5), side: rr() < 0.5 ? -1 : 1, a: w1 * (0.9 + 1.2 * rr()) } } : ending === 'blunt' ? { skew: (rr() < 0.5 ? -1 : 1) * (1.0 + 1.2 * rr()) } : { skew: 0 };
      return Object.assign({ C, O, W, Hh, deep: Rs[km] * 0.25, seed: 1 + Math.floor(rr() * 1e6), wiggle: 1 }, P, end);
    };
    const plate = (s, k0, k1, forward, ...rest) => {   // laid only where it is clear of every plate before it; cut back where it would meet one
      for (let go = 0; go < 4; go++) {
        const K = makePlate(s, k0, k1, forward, ...rest); if (!K) break; const n = K.C.length, hit = new Uint8Array(n);
        for (let k = 0; k < n; k++) { const T = unit([0, 1, 2].map((i) => K.C[Math.min(n - 1, k + 1)][i] - K.C[Math.max(0, k - 1)][i])), sv = unit(cross(T, K.O[k])), up = cross(sv, T);
          for (let a = -3; a <= 3 && !hit[k]; a++) for (const v of [0, K.Hh[k] * 0.6]) { const pt = [0, 1, 2].map((i) => K.C[k][i] + sv[i] * K.W[k] * a * 0.31 + up[i] * v); if (shell.some((A) => A.f(pt[0], pt[1], pt[2]) < room)) { hit[k] = 1; break; } } }
        if (!hit.some((h) => h)) { const sh = shard(K); all.push(sh); shell.push(sh); count.plates++; if (go) count.cut++; return; }
        let best = [0, -1], from = 0; for (let k = 0; k <= n; k++) if (k === n || hit[k]) { if (k - 1 - from > best[1] - best[0]) best = [from, k - 1]; from = k + 1; }
        const a = best[0] + (best[0] > 0 ? 1 : 0), b = best[1] - (best[1] < n - 1 ? 1 : 0); if (b - a < 6) break;
        if (forward) { const z = k0; k0 = z + a; k1 = z + b; } else { const z = k1; k1 = z - a; k0 = z - b; }
      }
      count.dropped++;
    };
    const want = recipe.bare ? 0 : recipe.plates === undefined ? 14 : recipe.plates, splitAt = [Math.floor(want * r()), Math.floor(want * r())];
    for (let j = 0; j < want; j++) {
      const s = t.strands[Math.floor(r() * t.strands.length)], len = 12 + Math.floor(18 * r()), forward = r() < 0.9, side = 0.7 * (r() - 0.5), wide = 0.5 + 0.4 * r(), high = 0.26 + 0.12 * r(), e = r(), rd = 0.6 * (r() - 0.5), eL = 0.5 + 0.4 * r(), eR = 0.5 + 0.4 * r(), sd = 1 + Math.floor(r() * 1e6), u1 = r(), u2 = r(), u3 = r(), u4 = r(), st = stretch(s, len), split = splitAt.includes(j);
      if (!st) { count.dropped++; continue; }
      plate(s, st[0], st[1], forward, side, wide, high, split ? 'blunt' : e < 0.5 ? 'point' : e < 0.75 ? 'blunt' : 'step', { ridge: rd, eL, eR, split: split ? { fromEnd: true, s0: 0.42 + 0.2 * u1, s1: 1.001, u: 0.4 * (u2 - 0.5), wide: 0.2 + 0.12 * u3, lift: 0.5 + 0.5 * u4, depth: 9 } : null }, sd);
    }
    // which strands are near which place, so that only those are asked
    const cell = 0.12, grid = new Map(), key = (x, y, z) => (x + 64) * 16384 + (y + 64) * 128 + z + 64;
    all.forEach((s, i) => { const seen = new Set(); s.C.forEach((c, j) => { const m = s.reach[j] + 0.06;
      for (let x = Math.floor((c[0] - m) / cell); x <= Math.floor((c[0] + m) / cell); x++) for (let y = Math.floor((c[1] - m) / cell); y <= Math.floor((c[1] + m) / cell); y++) for (let z = Math.floor((c[2] - m) / cell); z <= Math.floor((c[2] + m) / cell); z++) { const k = key(x, y, z); if (seen.has(k)) continue; seen.add(k); const b = grid.get(k); if (b) b.push(i); else grid.set(k, [i]); } }); });
    const o = t.orb, f = (x, y, z) => { const b = grid.get(key(Math.floor(x / cell), Math.floor(y / cell), Math.floor(z / cell))); let d = 0.1; if (b) for (const i of b) d = Math.min(d, all[i].f(x, y, z)); return d; };
    f.orb = o; f.measure = t.measure; f.count = count; return f;
  }
  // the same four trees. bare: bands only, so the body can be judged by itself.
  const bare = false, S = [
    ['one limb', tree({ bare, seed: 1, trunk: [[0, 0.22, 0, 0.27], [0.08, 0.7, 0.02, 0.25], [-0.1, 1.1, 0.05, 0.22], [-0.32, 1.45, 0, 0.18], [-0.3, 1.8, -0.05, 0.14]], limbs: [{ at: 0.5, share: 0.38, path: [[0.35, 1.25, 0.15], [0.62, 1.3, 0.2], [0.8, 1.1, 0.15]] }] })],
    ['a loop', tree({ bare, seed: 2, twist: 0.9, trunk: [[0, 0.22, 0, 0.28], [0.1, 0.7, 0, 0.26], [0.42, 1.05, 0.08, 0.23], [0.3, 1.5, 0.16, 0.2], [-0.26, 1.52, 0.08, 0.18], [-0.54, 1.08, -0.08, 0.16], [-0.2, 0.82, -0.22, 0.14], [0.2, 1.0, -0.34, 0.11]], limbs: [{ at: 0.42, share: 0.25, path: [[0.6, 1.8, 0.3], [0.82, 1.72, 0.36]] }] })],
    ['holding an orb', tree({ bare, seed: 3, strands: 10, trunk: [[0, 0.22, 0, 0.3], [0, 0.6, 0, 0.28], [0.1, 1.0, 0, 0.23], [0.3, 1.4, 0.1, 0.18], [0.55, 1.7, 0.2, 0.13]], limbs: [{ at: 0.6, share: 0.3, path: [[-0.3, 1.3, -0.1], [-0.6, 1.5, -0.1], [-0.8, 1.35, 0]] }], orb: { at: 0.27, r: 0.15, room: 0.6, off: 0.45 } })],
    ['forked low', tree({ bare, seed: 4, strands: 10, twist: 0.3, trunk: [[0, 0.22, 0, 0.3], [-0.05, 0.6, 0, 0.28], [-0.2, 0.98, -0.05, 0.22], [-0.45, 1.35, -0.1, 0.17], [-0.5, 1.72, 0, 0.13]], limbs: [{ at: 0.3, share: 0.4, path: [[0.35, 0.9, 0.1], [0.55, 1.25, 0.2], [0.5, 1.6, 0.1]] }, { at: 0.62, share: 0.25, path: [[-0.6, 1.1, 0.25], [-0.85, 1.2, 0.35]] }] })],
  ];
  window.Fantastic = { names: S.map((s) => s[0]), orbs: S.map((s) => s[1].orb), measures: S.map((s) => s[1].measure), counts: S.map((s) => s[1].count), build: (i) => mesh(S[i][1], S[i][0], 0.0095, 2.05), mesh, kit: Fantastic.kit };
})();
