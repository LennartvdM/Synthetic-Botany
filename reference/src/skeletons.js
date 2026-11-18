// Skeletons: each one is a different answer to "what kind of thing is this before it has a surface?"
// A skeleton receives a builder bound to a frame, emits primitives in its own unit space
// (roughly one unit tall, rooted at the origin, growing along +y) and publishes sites:
// frames where another skeleton may grow. Frame in, clay and frames out.
import { TAU, GOLDEN, clamp, lerp, sstep, add, sub, mul, dot, cross, norm, len, lerpv, dist, vnoise, makeWave, gyroid, makeVoronoi, voronoiSeed, hash32 } from './util.js';

// ---- envelopes: only ever a region to grow in, never the organism itself
const ENV = {
  ball: (x, y, z) => (Math.hypot(x, (y - 0.5) * 2, z) - 1) * 0.5,
  column: (x, y, z) => Math.max(Math.hypot(x, z) - 0.5, Math.abs(y - 0.5) - 0.5),
  cone: (x, y, z) => Math.max((Math.hypot(x, z) - y) * 0.707, y - 1),
  dome: (x, y, z) => Math.max(Math.hypot(x, y, z) - 1, -y),
  torus: (x, y, z) => Math.hypot(Math.hypot(x, z) - 0.7, y - 0.35) - 0.3,
  canopy: (x, y, z) => (Math.hypot(x, (y - 0.8) * 5, z) - 1) * 0.2,
  shell: (x, y, z) => Math.abs((Math.hypot(x, (y - 0.5) * 2, z) - 0.85) * 0.5) - 0.07,
};
const ENVS = Object.keys(ENV);
function envelope(kind, width) {
  const f = ENV[kind] || ENV.ball, s = Math.min(1, width);
  return (x, y, z) => f(x / width, y, z / width) * s;
}
function sampleEnv(env, width, R) {
  for (let t = 0; t < 60; t++) {
    const p = [R.range(-width, width), R(), R.range(-width, width)];
    if (env(p[0], p[1], p[2]) < 0) return p;
  }
  return [0, 0.5, 0];
}

export const KINDS = {};

// ---------------------------------------------------------------- arbor
// A graph grown by competition for space. Thickness is inherited: every limb
// carries the summed cross-section of everything it feeds (pipe model).
KINDS.arbor = {
  dim: 'graph', sites: ['tips', 'forks'],
  schema: {
    crown: ENVS, spread: [0.25, 1.1, 0.55], trunk: [0, 0.7, 0.3], density: [60, 900, 320, 1],
    step: [0.025, 0.08, 0.045], reach: [3, 14, 7], tropism: [-1, 1, 0.1], swirl: [0, 1, 0],
    girth: [0.02, 0.12, 0.055], pipe: [1.7, 3.2, 2.3], fuse: [0, 1, 0], skin: ['clay', 'crisp'],
  },
  grow(B, p, R) {
    const env = envelope(p.crown, p.spread), y0 = p.trunk, nA = Math.round(p.density);
    const A = new Float32Array(nA * 3);
    for (let i = 0; i < nA; i++) { const q = sampleEnv(env, p.spread, R); A[i * 3] = q[0]; A[i * 3 + 1] = y0 + q[1] * (1 - y0); A[i * 3 + 2] = q[2]; }
    const D = p.step, reach = p.reach * D, kill = 1.8 * D, ns = R.int(0, 9999);
    const P = [[0, 0, 0]], par = [-1], kids = [[]];
    const near = new Int32Array(nA).fill(-1), nd = new Float32Array(nA).fill(1e9), alive = new Uint8Array(nA).fill(1);
    let from = 0;
    for (let iter = 0; iter < 500 && P.length < 2400; iter++) {
      const n = P.length;
      for (let a = 0; a < nA; a++) {
        if (!alive[a]) continue;
        const ax = A[a * 3], ay = A[a * 3 + 1], az = A[a * 3 + 2];
        for (let m = from; m < n; m++) { const q = P[m], dd = Math.hypot(ax - q[0], ay - q[1], az - q[2]); if (dd < nd[a]) { nd[a] = dd; near[a] = m; } }
      }
      from = n;
      const acc = new Map();
      let left = 0, cx = 0, cy = 0, cz = 0;
      for (let a = 0; a < nA; a++) {
        if (!alive[a]) continue;
        if (nd[a] < kill) { alive[a] = 0; continue; }
        left++; cx += A[a * 3]; cy += A[a * 3 + 1]; cz += A[a * 3 + 2];
        if (nd[a] < reach) {
          const m = near[a], q = P[m];
          let v = acc.get(m); if (!v) acc.set(m, (v = [0, 0, 0]));
          v[0] += (A[a * 3] - q[0]) / nd[a]; v[1] += (A[a * 3 + 1] - q[1]) / nd[a]; v[2] += (A[a * 3 + 2] - q[2]) / nd[a];
        }
      }
      if (!left) break;
      if (!acc.size) {
        // nothing in reach yet: the trunk walks toward the remaining space
        const m = n - 1, q = P[m];
        let d = norm([cx / left - q[0], cy / left - q[1], cz / left - q[2]]);
        d = norm(add(d, [0.5 * vnoise(q[1] * 4, 1.3, 0, ns), 0, 0.5 * vnoise(q[1] * 4, 7.7, 0, ns)]));
        P.push(add(q, mul(d, D))); par.push(m); kids.push([]); kids[m].push(P.length - 1);
        continue;
      }
      let grew = 0;
      for (const [m, v] of acc) {
        if (kids[m].length >= 3) continue;
        const q = P[m], rr = Math.hypot(q[0], q[2]) || 1;
        let d = norm(v);
        d = norm([d[0] - (p.swirl * 0.8 * q[2]) / rr, d[1] + p.tropism * 0.45, d[2] + (p.swirl * 0.8 * q[0]) / rr]);
        const np = add(q, mul(d, D));
        let dup = false;
        for (const c of kids[m]) if (dist(P[c], np) < 0.35 * D) dup = true;
        if (dup) continue;
        P.push(np); par.push(m); kids.push([]); kids[m].push(P.length - 1); grew++;
      }
      if (!grew) break;
    }
    const n = P.length;
    // relax straight runs so limbs read as curves, not step marks
    for (let pass = 0; pass < 2; pass++) for (let i = 1; i < n; i++) if (kids[i].length === 1) P[i] = lerpv(P[i], lerpv(P[par[i]], P[kids[i][0]], 0.5), 0.5);
    const r = new Float32Array(n);
    for (let i = n - 1; i >= 0; i--) {
      if (!kids[i].length) r[i] = 1;
      else { let s = 0; for (const c of kids[i]) s += Math.pow(r[c], p.pipe); r[i] = Math.pow(s, 1 / p.pipe); }
    }
    const k = p.girth / r[0], twig = p.girth * 0.09;
    for (let i = 0; i < n; i++) r[i] = Math.max(r[i] * k, twig);
    if (p.skin === 'crisp') {
      // each limb is one drawn tube from fork to fork, so limbs stay distinct instead of melting together
      for (let i = 1; i < n; i++) if (par[i] === 0 || kids[par[i]].length > 1) {
        const pts = [P[par[i]], P[i]], rr = [r[par[i]] * (par[i] === 0 ? 1 : 0.8), r[i]];
        let c = i;
        while (kids[c].length === 1) { c = kids[c][0]; pts.push(P[c]); rr.push(r[c]); }
        if (!kids[c].length) rr[rr.length - 1] *= 0.4;
        B.tube(pts, rr, { sides: 8 });
      }
    } else for (let i = 1; i < n; i++) B.cap(P[par[i]], P[i], r[par[i]], r[i], 0.5 * r[i]);
    let ti = 0;
    for (let i = 1; i < n; i++) {
      if (!kids[i].length) {
        const d = sub(P[i], P[par[i]]);
        if (p.fuse > 0 && R() < p.fuse) {
          // anastomosis: a tip reaches for a limb that is not its own ancestor, closing a loop
          const anc = new Set(); let a = i; for (let s = 0; s < 14 && a >= 0; s++) { anc.add(a); a = par[a]; }
          let best = -1, bd = 6 * D;
          for (let m = 0; m < n; m++) { if (anc.has(m)) continue; const dd = dist(P[m], P[i]); if (dd < bd) { bd = dd; best = m; } }
          if (best >= 0) { const mid = add(lerpv(P[i], P[best], 0.5), mul(norm(d), 0.3 * bd)); B.cap(P[i], mid, r[i], r[i], 0.5 * r[i]); B.cap(mid, P[best], r[i], r[i], r[i]); continue; }
        }
        B.site('tips', P[i], d, 0.16, ti++ / 40);
      } else if (kids[i].length > 1) B.site('forks', P[i], sub(P[i], P[par[i]]), 0.1 + r[i], P[i][1]);
    }
  },
};

// ---------------------------------------------------------------- fascicle
// The pipe model taken literally: the organism is a bundle of continuous strands.
// Limbs are sub-bundles; a split is the bundle dividing, never a new part being added.
KINDS.fascicle = {
  dim: 'graph', sites: ['tips'],
  schema: {
    fibers: [6, 72, 30, 1], fiber: [0.006, 0.03, 0.013], length: [0.25, 0.7, 0.42], splits: [0, 4, 3, 1],
    decay: [0.5, 0.95, 0.72], spread: [0.1, 1.4, 0.6], twist: [0, 14, 4], wander: [0, 1, 0.35],
    slack: [0.9, 3.5, 1.3], tropism: [-1, 1, 0.15], root: [0, 1, 0.4], fray: [0, 1, 0.35], skin: ['crisp', 'clay'],
  },
  grow(B, p, R) {
    const n = Math.round(p.fibers), fr = p.fiber, ds = 0.028, ns = R.int(0, 9999);
    const fib = [];
    for (let i = 0; i < n; i++) fib.push({ pts: [], r: fr * R.range(0.8, 1.25) });
    const bundle = (ids, o, dir, u, length, depth, start) => {
      const m = ids.length, Rb = p.slack * fr * Math.sqrt(m) * 1.15;
      const steps = Math.max(5, Math.round(length / ds)), tw0 = R.range(0, TAU);
      const last = depth >= p.splits || m <= 2;
      let v = cross(dir, u);
      const ang = new Array(m);
      for (let s = start ? 1 : 0; s <= steps; s++) {
        const t = s / steps;
        if (s > 0) {
          const nz = [vnoise(o[0] * 2.3, o[1] * 2.3, o[2] * 2.3, ns), vnoise(o[0] * 2.3, o[1] * 2.3, o[2] * 2.3, ns + 5), vnoise(o[0] * 2.3, o[1] * 2.3, o[2] * 2.3, ns + 9)];
          dir = norm(add(add(dir, mul(nz, p.wander * ds * 7)), [0, p.tropism * ds * 2.2, 0]));
          o = add(o, mul(dir, ds));
          u = norm(sub(u, mul(dir, dot(u, dir)))); v = cross(dir, u);
        }
        const w = start ? sstep(0, 0.5, t) : 1;
        const flare = (depth === 0 ? 1 + p.root * 3.5 * Math.pow(1 - Math.min(1, t / 0.35), 2) : 1) * (last ? 1 + p.fray * 5 * t * t : 1);
        for (let q = 0; q < m; q++) {
          const rho = Math.sqrt((q + 0.5) / m) * Rb * flare, a = q * GOLDEN + tw0 + p.twist * t * length;
          ang[q] = a;
          let off = add(mul(u, Math.cos(a) * rho), mul(v, Math.sin(a) * rho));
          if (start) off = lerpv(start[q], off, w);
          fib[ids[q]].pts.push(add(o, off));
        }
      }
      if (last) return;
      const k = m >= 9 && R.chance(0.35) ? 3 : 2;
      const order = ids.map((id, q) => ({ id, a: ((ang[q] % TAU) + TAU) % TAU })).sort((x, y) => x.a - y.a);
      const rot = R.int(0, m - 1), cuts = [0];
      for (let c = 1; c < k; c++) cuts.push(Math.round(m * (c / k + R.range(-0.12, 0.12))));
      cuts.push(m);
      for (let g = 0; g < k; g++) {
        const grp = [];
        for (let q = cuts[g]; q < cuts[g + 1]; q++) grp.push(order[(q + rot) % m].id);
        if (!grp.length) continue;
        let c = [0, 0, 0];
        const ends = grp.map((id) => fib[id].pts[fib[id].pts.length - 1]);
        for (const e of ends) c = add(c, e);
        c = mul(c, 1 / grp.length);
        const out = sub(c, o), ol = len(out);
        const d2 = ol > 1e-6 ? norm(add(dir, mul(out, p.spread / ol))) : dir;
        const u2 = norm(sub(u, mul(d2, dot(u, d2))));
        bundle(grp, c, d2, u2, length * p.decay, depth + 1, ends.map((e) => sub(e, c)));
      }
    };
    bundle(fib.map((_, i) => i), [0, 0, 0], [0, 1, 0], [1, 0, 0], p.length, 0, null);
    fib.forEach((f, fi) => {
      const m = f.pts.length;
      if (p.skin === 'crisp' && m > 1) B.tube(f.pts, f.pts.map((_, i) => f.r * (1 - 0.6 * sstep(0.75, 1, i / (m - 1)))), { sides: 6 });
      else for (let i = 1; i < m; i++) {
        const t0 = (i - 1) / (m - 1), t1 = i / (m - 1);
        B.cap(f.pts[i - 1], f.pts[i], f.r * (1 - 0.45 * sstep(0.8, 1, t0)), f.r * (1 - 0.45 * sstep(0.8, 1, t1)), f.r * 0.5);
      }
      if (m > 1) B.site('tips', f.pts[m - 1], sub(f.pts[m - 1], f.pts[m - 2]), 0.13, fi / n);
    });
  },
};

// ---------------------------------------------------------------- lamella
// A sheet whose margin has more length than its interior can hold flat, so it must ruffle.
// Buckling frequency doubles toward the edge.
KINDS.lamella = {
  dim: 'sheet', sites: ['margin', 'face', 'center'],
  schema: {
    flare: [0.2, 0.9, 0.5], cup: [-1, 1, 0.4], height: [0, 0.8, 0.3], arc: [0.2, 1, 1], scroll: [0, 2.5, 0],
    ruffle: [0, 0.3, 0.1], lobes: [2, 9, 4, 1], octaves: [1, 4, 3, 1], curl: [0, 1, 0.3], thick: [0.012, 0.07, 0.03], skin: ['crisp', 'clay'],
  },
  grow(B, p, R) {
    const O = Math.round(p.octaves), n0 = Math.round(p.lobes), TH = TAU * (p.arc + p.scroll);
    const closed = p.arc > 0.995 && p.scroll < 0.01;
    const ph = [], u0 = 0.03;
    for (let o = 0; o < O + 1; o++) ph.push(R.range(0, TAU));
    const env = (o, u) => Math.pow(sstep(o / (O + 0.5), 1, u), 1.4) * u;
    const sc = Math.min(1, p.scroll);
    const surf = (u, v) => {
      let th = TH * v;
      const m = 1 - 0.7 * sc * (1 - v);
      const rho = p.flare * u * m, y = p.height + 0.6 * p.cup * Math.pow(u, 1.6) + 0.25 * p.scroll * (v - 0.5) * u;
      const dr = p.flare * m, dy = 0.96 * p.cup * Math.pow(u, 0.6), dl = Math.hypot(dr, dy) || 1;
      const nr = -dy / dl, ny = dr / dl;
      let w = 0;
      for (let o = 0; o < O; o++) w += Math.pow(0.55, o) * env(o, u) * Math.sin(n0 * (1 << o) * th + ph[o]);
      w *= p.ruffle;
      th += (p.curl * env(0, u) * 0.6 * Math.sin(2 * n0 * th + ph[O])) / n0;
      const r = rho + nr * w;
      return [r * Math.cos(th), y + ny * w, r * Math.sin(th)];
    };
    const nu = 26, nv = clamp(Math.round((TH / TAU) * Math.max(56, 14 * n0 * (1 << (O - 1)))), 24, 440);
    const G = [];
    for (let j = 0; j <= nv; j++) { const row = []; for (let i = 0; i <= nu; i++) row.push(surf(lerp(u0, 1, Math.pow(i / nu, 0.8)), closed && j === nv ? 0 : j / nv)); G.push(row); }
    if (p.skin === 'crisp') B.sheet(closed ? G.slice(0, nv) : G, (i) => p.thick * 0.6 * (1 - 0.7 * (i / nu)), { closeV: closed });
    else for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const th = p.thick * (1 - 0.45 * (i / nu));
      B.tri(G[j][i], G[j][i + 1], G[j + 1][i + 1], th); B.tri(G[j][i], G[j + 1][i + 1], G[j + 1][i], th);
    }
    const c = [0, p.height, 0];
    if (p.height > 0.03) B.cap([0, 0, 0], c, p.thick * 2.4, p.thick * 1.6, p.thick * 2);
    B.ball(c, p.thick * 1.6, p.thick);
    const K = 48;
    for (let i = 0; i < K; i++) {
      const v = (i + 0.5) / K, a = surf(1, v), b = surf(0.9, v);
      B.site('margin', a, sub(a, b), 0.16 * p.flare / 0.5, v);
    }
    for (let i = 0; i < 40; i++) {
      const u = Math.sqrt(R.range(0.08, 0.8)), v = R();
      const a = surf(u, v), nn = norm(cross(sub(surf(u, v + 0.01), a), sub(surf(u + 0.02, v), a)));
      B.site('face', a, nn[1] < 0 && p.cup > -0.2 ? mul(nn, -1) : nn, 0.1, u);
    }
    B.site('center', c, [0, 1, 0], 0.3, 0);
  },
};

// ---------------------------------------------------------------- whorl
// Accretion: one aperture curve swept along a logarithmic spiral, growing as it goes.
// Four numbers (expansion, bore, rise, turns) span horns, coils, corkscrews and closed shells.
KINDS.whorl = {
  dim: 'sheet', sites: ['aperture', 'keel'],
  schema: {
    turns: [0.4, 4.5, 2.6], expand: [1.15, 4, 1.7], bore: [0.08, 1.2, 0.22], rise: [0, 3, 1.5],
    aspect: [0.5, 2, 1], lobes: [0, 7, 0, 1], lobeAmp: [0, 0.4, 0.15], ribs: [0, 14, 0, 1], ribAmp: [0, 0.4, 0.2], thick: [0.012, 0.06, 0.025], skin: ['crisp', 'clay'],
  },
  grow(B, p, R) {
    const PHI = TAU * p.turns, nphi = clamp(Math.round(p.turns * 46), 20, 230), npsi = 20, m = Math.round(p.lobes);
    const G = [], cen = [], gs = [];
    const at = (phi, psi) => {
      const g = Math.pow(p.expand, (phi - PHI) / TAU);
      const rib = p.ribs > 0 ? 1 + p.ribAmp * Math.pow(Math.abs(Math.sin((p.ribs * phi) / 2)), 3) : 1;
      const a = p.bore * g * rib * (1 + (m ? p.lobeAmp * Math.cos(m * psi) : 0));
      const cr = g, cy = -p.rise * g;
      const r = cr + a * Math.cos(psi), y = cy + a * p.aspect * Math.sin(psi);
      return [r * Math.cos(phi), y, r * Math.sin(phi)];
    };
    let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (let i = 0; i <= nphi; i++) {
      const phi = (PHI * i) / nphi, row = [];
      for (let j = 0; j < npsi; j++) { const q = at(phi, (TAU * j) / npsi); row.push(q); for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], q[c]); mx[c] = Math.max(mx[c], q[c]); } }
      G.push(row);
      const g = Math.pow(p.expand, (phi - PHI) / TAU);
      gs.push(g); cen.push([g * Math.cos(phi), -p.rise * g, g * Math.sin(phi)]);
    }
    const sc = 1 / Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
    const off = [-(mn[0] + mx[0]) / 2, -mn[1], -(mn[2] + mx[2]) / 2];
    const T = (q) => [(q[0] + off[0]) * sc, (q[1] + off[1]) * sc, (q[2] + off[2]) * sc];
    for (let i = 0; i <= nphi; i++) { for (let j = 0; j < npsi; j++) G[i][j] = T(G[i][j]); cen[i] = T(cen[i]); }
    if (p.skin === 'crisp') {
      let i0 = 0; while (i0 < nphi - 2 && gs[i0] * sc * p.bore < 0.004) i0++;
      B.sheet(G.slice(i0), (i, j) => p.thick * 0.6 * (0.4 + 0.6 * gs[j + i0]), { closeU: true });
    } else for (let i = 0; i < nphi; i++) {
      if (gs[i + 1] * sc < 0.006) continue;
      const th = p.thick * (0.45 + 0.55 * gs[i]);
      for (let j = 0; j < npsi; j++) {
        const j1 = (j + 1) % npsi;
        B.tri(G[i][j], G[i + 1][j], G[i + 1][j1], th); B.tri(G[i][j], G[i + 1][j1], G[i][j1], th);
      }
    }
    B.site('aperture', cen[nphi], sub(cen[nphi], cen[nphi - 1]), p.bore * sc * 2.4, 1);
    const stepK = Math.max(2, Math.round(nphi / (p.turns * 9)));
    for (let i = nphi; i > 0 && gs[i] > 0.12; i -= stepK) B.site('keel', G[i][0], sub(G[i][0], cen[i]), gs[i] * sc * (0.5 + 1.6 * p.bore), 1 - i / nphi);
  },
};

// ---------------------------------------------------------------- foam
// A partition of space into cells. The same partition read three ways:
// its walls (membranes), its edges (struts), or its cells (packed polyhedra).
KINDS.foam = {
  dim: 'cells', sites: ['cells'],
  schema: {
    env: ENVS, width: [0.3, 1, 0.5], cell: [0.09, 0.4, 0.2], mode: ['walls', 'struts', 'cells'],
    thick: [0.01, 0.06, 0.022], jitter: [0, 1, 0.85], stretch: [0.5, 3, 1], grade: [-1, 1, 0],
  },
  grow(B, p, R) {
    const env = envelope(p.env, p.width), seed = R.int(1, 1e6), vor = makeVoronoi(seed, p.jitter);
    const cs = p.cell, st = p.stretch, gr = p.grade * 0.9;
    // grading: compress or dilate cells along the axis
    const wy = (y) => (y + gr * y * (1 - y)) / st;
    const mode = p.mode;
    const fn = (x, y, z, hl) => {
      const e = env(x, y, z);
      if (e > cs * 1.2) return e;
      const v = vor(x / cs, wy(y) / cs, z / cs);
      const in1 = env(v.px * cs, clamp(v.py * cs * st, 0, 1), v.pz * cs) < 0;
      let d;
      if (mode === 'cells') {
        const hh = Math.max(0, 0.14 - Math.abs(v.d12 - v.d13));
        d = p.thick - (Math.min(v.d12, v.d13) - (hh * hh) / 0.56) * cs;
        return in1 ? d : Math.max(d, 0.02) + 0.02;
      }
      const in2 = env(v.qx * cs, clamp(v.qy * cs * st, 0, 1), v.qz * cs) < 0;
      if (mode === 'struts') {
        const c = clamp(v.c, -0.95, 0.95);
        d = Math.sqrt(Math.max(0, (v.d12 * v.d12 + v.d13 * v.d13 - 2 * v.d12 * v.d13 * c) / (1 - c * c))) * cs - Math.max(p.thick, 0.85 * hl);
      } else d = v.d12 * cs - Math.max(p.thick * 0.5, 0.9 * hl);
      // membranes facing the outside are left off, so the partition is open to walk into
      return (mode === 'struts' ? in1 || in2 : in1 && in2) ? d : Math.max(d, 0.02) + 0.02;
    };
    const w = p.width * 1.05 + cs;
    B.field(fn, [-w, -cs, -w], [w, 1 + cs, w], 0);
    const N = Math.ceil(w / cs) + 1;
    let ci = 0;
    for (let k = -N; k <= N; k++) for (let j = -1; j <= Math.ceil(1 / (cs * st)) + 1; j++) for (let i = -N; i <= N; i++) {
      const s = voronoiSeed(i, j, k, seed, p.jitter), q = [s[0] * cs, s[1] * cs * st, s[2] * cs];
      if (q[1] < 0 || q[1] > 1 || env(q[0], q[1], q[2]) > 0) continue;
      B.site('cells', q, sub(q, [0, 0.35, 0]), cs * 0.8, ci++ / 60);
    }
  },
};

// ---------------------------------------------------------------- wave
// A level set of interfering waves. Ordered wave vectors give a gyroid,
// random ones a spinodal labyrinth: a single surface dividing space into two interlocked halves.
KINDS.wave = {
  dim: 'field', sites: ['crown'],
  schema: {
    env: ENVS, width: [0.3, 1, 0.5], lambda: [0.14, 0.7, 0.3], mode: ['sheet', 'solid'],
    level: [0.05, 0.9, 0.42], order: [0, 1, 0], aniso: [-0.95, 0.95, 0],
  },
  grow(B, p, R) {
    const env = envelope(p.env, p.width), wv = makeWave(R, 18, p.aniso), L = p.lambda, k = L / TAU;
    const sheet = p.mode === 'sheet', lv = sheet ? p.level * 0.6 : p.level - 0.45;
    const fn = (x, y, z, hl) => {
      const e = env(x, y, z);
      if (e > 0.08) return e;
      let f = wv(x / L, y / L, z / L);
      if (p.order > 0) f = lerp(f, gyroid(x / L, y / L, z / L), p.order);
      const d = sheet ? Math.abs(f) * k - Math.max(lv * k, 0.9 * hl) : (f - lv) * k;
      return Math.max(d, e);
    };
    const w = p.width * 1.05;
    B.field(fn, [-w, -0.03, -w], [w, 1.05, w], 0);
    B.site('crown', [0, 0.9, 0], [0, 1, 0], 0.3, 0);
  },
};

// ---------------------------------------------------------------- phyllo
// A lattice law on a surface of revolution: each new module sits a fixed divergence
// angle from the last. The modules can be anything, including another lattice.
const PROFILE = {
  cone: (t, w) => [w * (1 - t), t],
  dome: (t, w) => [w * Math.cos((t * Math.PI) / 2), 0.75 * Math.sin((t * Math.PI) / 2)],
  spindle: (t, w) => [w * Math.pow(Math.sin(Math.PI * (0.06 + 0.94 * t)), 0.8), t],
  disc: (t, w) => [w * (1 - t) * 1.6, 0.12 * t + 0.05],
  column: (t, w) => [w * (0.7 - 0.12 * t), t],
  urn: (t, w) => [w * (0.45 + 0.55 * Math.sin(Math.PI * (0.1 + 0.8 * t))), t],
};
KINDS.phyllo = {
  dim: 'lattice', sites: ['sites', 'apex'],
  schema: {
    shape: Object.keys(PROFILE), width: [0.12, 0.6, 0.3], count: [12, 420, 140, 1], angle: [90, 180, 137.508],
    core: [0, 1, 0.85], module: ['spike', 'knob', 'scale', 'none'], size: [0.4, 2.4, 1], lean: [-1, 1, 0.3], grad: [-1, 1, 0.4],
  },
  grow(B, p, R, used) {
    const prof = PROFILE[p.shape] || PROFILE.cone, w = p.width, S = 160, N = Math.round(p.count);
    const cum = [0], pts = [prof(0, w)];
    for (let i = 1; i <= S; i++) { const a = pts[i - 1], b = prof(i / S, w); pts.push(b); cum.push(cum[i - 1] + Math.PI * (a[0] + b[0]) * Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const total = cum[S], unit = Math.sqrt(total / N);
    if (p.core > 0.03) for (let i = 0; i < S; i += 4) { const a = pts[i], b = pts[Math.min(S, i + 4)]; B.cap([0, a[1], 0], [0, b[1], 0], Math.max(0.004, a[0] * p.core), Math.max(0.004, b[0] * p.core), 0); }
    const custom = used.has('sites'), ang = (p.angle * Math.PI) / 180;
    let s = 0;
    for (let i = 0; i < N; i++) {
      const target = ((i + 0.5) / N) * total;
      while (s < S - 1 && cum[s + 1] < target) s++;
      const f = (target - cum[s]) / (cum[s + 1] - cum[s] || 1), t = (s + f) / S;
      const a = pts[s], b = pts[s + 1], r = lerp(a[0], b[0], f), y = lerp(a[1], b[1], f);
      const tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, tr = (b[0] - a[0]) / tl, ty = (b[1] - a[1]) / tl;
      const th = i * ang, c = Math.cos(th), sn = Math.sin(th);
      const pos = [r * c, y, r * sn], nrm = [ty * c, -tr, ty * sn], tan = [tr * c, ty, tr * sn];
      const dir = norm(add(nrm, mul(tan, p.lean)));
      const sz = p.size * unit * (1 + p.grad * (0.5 - t) * 1.3);
      B.site('sites', pos, dir, sz * 1.7, t);
      if (custom || p.module === 'none') continue;
      if (p.module === 'knob') B.ball(add(pos, mul(dir, 0.25 * sz)), 0.52 * sz, 0.2 * sz);
      else if (p.module === 'spike') B.cap(pos, add(pos, mul(dir, 2.3 * sz)), 0.42 * sz, 0.06 * sz, 0.25 * sz);
      else {
        const side = norm(cross(dir, tan)), tip = add(pos, mul(norm(add(dir, mul(tan, 0.9))), 1.9 * sz));
        const l = add(pos, mul(side, 0.6 * sz)), rr = add(pos, mul(side, -0.6 * sz)), mid = add(lerpv(pos, tip, 0.5), mul(dir, 0.25 * sz));
        B.tri(l, rr, mid, 0.3 * sz); B.tri(l, mid, tip, 0.22 * sz); B.tri(rr, tip, mid, 0.22 * sz);
      }
    }
    const top = pts[S];
    B.site('apex', [0, top[1], 0], [0, 1, 0], 0.25, 1);
  },
};

// ---------------------------------------------------------------- plexus
// A network with loops: points claim space, struts join neighbours that nothing sits between.
// Unlike a tree it has no root and no tips, only cycles.
KINDS.plexus = {
  dim: 'graph', sites: ['nodes'],
  schema: {
    env: ENVS, width: [0.3, 1, 0.5], nodes: [14, 220, 70, 1], shell: [0, 1, 0], strut: [0.008, 0.045, 0.018],
    sag: [-0.4, 0.4, 0.1], knot: [1, 3, 1.5], prune: [0, 0.6, 0.1],
  },
  grow(B, p, R) {
    const env = envelope(p.env, p.width), N = Math.round(p.nodes), P = [];
    for (let i = 0; i < N; i++) {
      let best = null, bd = -1;
      for (let c = 0; c < 6; c++) {
        let q = sampleEnv(env, p.width, R);
        if (R() < p.shell) for (let it = 0; it < 3; it++) {
          const e = env(q[0], q[1], q[2]), h = 0.01;
          const g = norm([env(q[0] + h, q[1], q[2]) - e, env(q[0], q[1] + h, q[2]) - e, env(q[0], q[1], q[2] + h) - e]);
          q = sub(q, mul(g, e));
        }
        let m = 1e9;
        for (const o of P) m = Math.min(m, dist(o, q));
        if (m > bd) { bd = m; best = q; }
      }
      P.push(best);
    }
    const deg = new Int32Array(N), edges = [];
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const mx = (P[i][0] + P[j][0]) / 2, my = (P[i][1] + P[j][1]) / 2, mz = (P[i][2] + P[j][2]) / 2;
      const r2 = (dist(P[i], P[j]) / 2) ** 2 * 0.999;
      let ok = true;
      for (let k = 0; k < N && ok; k++) if (k !== i && k !== j) { const dx = P[k][0] - mx, dy = P[k][1] - my, dz = P[k][2] - mz; if (dx * dx + dy * dy + dz * dz < r2) ok = false; }
      if (ok && !(R() < p.prune && deg[i] > 1 && deg[j] > 1)) { edges.push([i, j]); deg[i]++; deg[j]++; }
    }
    let mean = 0;
    for (const [i, j] of edges) {
      const a = P[i], b = P[j], L = dist(a, b); mean += L;
      let prev = a;
      for (let s = 1; s <= 4; s++) { const t = s / 4, q = lerpv(a, b, t); q[1] -= p.sag * L * 4 * t * (1 - t); B.cap(prev, q, p.strut, p.strut, p.strut * 0.8); prev = q; }
    }
    mean /= edges.length || 1;
    P.forEach((q, i) => {
      if (!deg[i]) return;
      B.ball(q, p.strut * p.knot, p.strut);
      B.site('nodes', q, sub(q, [0, 0.4, 0]), 0.45 * mean, i / N);
    });
  },
};

// ---------------------------------------------------------------- axis
// A jointed axis: nodes and internodes, with a rule for where each node's organ faces.
// It is the only skeleton that knows "first, second, third": children can differ by position.
KINDS.axis = {
  dim: 'jointed', sites: ['nodes', 'clasp', 'tip'],
  schema: {
    nodes: [3, 40, 9, 1], basal: [0, 0.9, 0], law: ['spiral', 'distichous', 'decussate', 'whorl', 'secund'], angle: [90, 180, 137.508], whorl: [2, 8, 3, 1],
    splay: [0.1, 1.5, 0.8], girth: [0.008, 0.08, 0.026], taper: [0, 0.95, 0.5], flutes: [0, 16, 8, 1], flute: [0, 0.5, 0.2],
    joint: [1, 2.2, 1.35], zigzag: [0, 0.6, 0.06], wander: [0, 1, 0.15],
  },
  grow(B, p, R) {
    const n = Math.round(p.nodes), nb = Math.min(n - 1, Math.round(p.basal * n)), ns = R.int(0, 9999), hs = [];
    for (let i = 0; i < nb; i++) hs.push(0.012 + (0.07 * i) / Math.max(1, nb));
    const lo = nb ? 0.1 : 0.04, m = n - nb;
    let acc = 0; const w = [];
    for (let i = 0; i < m; i++) { w.push(acc); acc += Math.pow(0.9, i); }
    for (let i = 0; i < m; i++) hs.push(lo + ((0.93 - lo) * w[i]) / (w[m - 1] || 1));
    const k = p.law === 'decussate' ? 2 : p.law === 'whorl' ? Math.round(p.whorl) : 1;
    // secund: every organ faces the same side, with a little scatter
    const ang = (i, j) => (p.law === 'secund' ? 0.55 * Math.sin(i * 2.4) : p.law === 'spiral' ? (i * p.angle * Math.PI) / 180 : p.law === 'distichous' ? i * Math.PI : p.law === 'decussate' ? (i % 2) * (Math.PI / 2) + j * Math.PI : (TAU * j) / k + (i * Math.PI) / k);
    const pts = [[0, 0, 0]], rad = [p.girth * 1.15], marks = [];
    let pos = [0, 0, 0], dir = [0, 1, 0], y = 0;
    const rAt = (t) => p.girth * (1 - p.taper * t);
    for (let i = 0; i <= n; i++) {
      const target = i < n ? hs[i] : 1, sub2 = i < nb ? 1 : 4, dl = (target - y) / sub2;
      for (let q = 1; q <= sub2; q++) {
        dir = norm(add(dir, [p.wander * 0.5 * dl * vnoise(pos[1] * 3, 1.7, 0, ns), 0.9 * dl, p.wander * 0.5 * dl * vnoise(pos[1] * 3, 9.1, 0, ns)]));
        pos = add(pos, mul(dir, dl)); pts.push(pos);
        rad.push(rAt(target - dl * (sub2 - q)) * (q === sub2 && i < n ? p.joint : 1));
      }
      y = target;
      if (i < n) {
        const a0 = ang(i, 0), e0 = [Math.cos(a0), 0, Math.sin(a0)];
        marks.push({ at: pts.length - 1, dir: dir.slice(), i });
        if (i >= nb) dir = norm(sub(dir, mul(e0, p.zigzag * 0.45)));
      }
    }
    rad[rad.length - 1] = rAt(1) * 0.4;
    const fl = Math.round(p.flutes);
    B.tube(pts, rad, { sides: clamp(fl * 4, 10, 56), ref: [1, 0, 0], profile: fl ? (a) => 1 - p.flute * (0.5 - 0.5 * Math.cos(fl * a)) : null });
    for (const mk of marks) {
      const P0 = pts[mk.at], T = mk.dir, u = n > 1 ? mk.i / (n - 1) : 0, r = rad[mk.at];
      for (let j = 0; j < k; j++) {
        const a = ang(mk.i, j);
        let e = [Math.cos(a), 0, Math.sin(a)];
        e = norm(sub(e, mul(T, dot(e, T))));
        const out = norm(add(mul(T, Math.cos(p.splay)), mul(e, Math.sin(p.splay))));
        B.site('nodes', add(P0, mul(e, r * 0.6)), out, 0.3, u, cross(T, e));
        B.site('clasp', P0, T, 0.3, u, e);
      }
    }
    B.site('tip', pts[pts.length - 1], dir, 0.3, 1);
  },
};

// ---------------------------------------------------------------- sheath
// A sheet that clasps the axis it grows from: wrapped most of the way round, swollen low,
// narrowing into a channelled stalk. Several on successive nodes overlap like a bulb's coats.
KINDS.sheath = {
  dim: 'sheet', sites: ['tip', 'rim'],
  schema: {
    wrap: [0.3, 1.3, 0.9], radius: [0.03, 0.4, 0.12], belly: [0, 2.5, 0.8], height: [0.2, 1.2, 0.6], neck: [0.15, 1, 0.4], flare: [0, 1, 0.1],
    lean: [0, 1, 0.3], veins: [0, 24, 11, 1], vein: [0, 0.8, 0.4], thick: [0.004, 0.05, 0.014], stalk: [0, 2, 0.7], channel: [0, 0.8, 0.5],
  },
  grow(B, p, R) {
    const nt = 26, na = 44, H = p.height, vn = Math.round(p.veins);
    const cen = (t) => [0.6 * p.lean * H * t * t, H * t, 0];
    const tan = (t) => norm([1.2 * p.lean * H * t, H, 0]);
    const rho = (t) => p.radius * (1 + p.belly * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.6)), 1.3)) * lerp(1, p.neck, sstep(0.45, 1, t)) + p.flare * p.radius * Math.pow(t, 6);
    const rows = [];
    for (let j = 0; j <= nt; j++) {
      const t = j / nt, c = cen(t), tg = tan(t), e1 = [tg[1], -tg[0], 0], r0 = rho(t), wr = p.wrap * lerp(1, 0.3, sstep(0.5, 1, t)), row = [];
      for (let i = 0; i <= na; i++) {
        const a = (i / na) * 2 - 1, ph = a * Math.PI * wr, r = r0 * (1 + 0.07 * a * wr);
        row.push([c[0] + e1[0] * Math.cos(ph) * r, c[1] + e1[1] * Math.cos(ph) * r, Math.sin(ph) * r]);
      }
      rows.push(row);
    }
    B.sheet(rows, (i) => { const a = (i / na) * 2 - 1; return p.thick * (1 + (vn ? p.vein * (0.5 + 0.5 * Math.cos(vn * Math.PI * a)) : 0)) * (1 - 0.55 * Math.abs(a * a * a)); });
    const tg = tan(1), e1 = [tg[1], -tg[0], 0], top = add(cen(1), mul(e1, rho(1) * 0.55));
    let end = top, d = norm(add(tg, mul(e1, 0.35 * p.lean)));
    if (p.stalk > 0.02) {
      const L = p.stalk * H, pts = [sub(top, mul(d, 0.12 * H))], rad = [], r0 = Math.max(rho(1) * 0.6, p.thick * 1.6);
      for (let q = 1; q <= 8; q++) { d = norm(add(d, mul(e1, 0.03 * p.lean))); pts.push(add(pts[q - 1], mul(d, (L + 0.12 * H) / 8))); }
      for (let q = 0; q <= 8; q++) rad.push(r0 * (1 - 0.5 * (q / 8)));
      B.tube(pts, rad, { sides: 12, ref: e1, profile: (a) => 1 - p.channel * Math.pow(Math.max(0, -Math.cos(a)), 2) });
      end = pts[8];
    }
    B.site('tip', end, d, 0.9 * H, 1, [0, 0, 1]);
    for (let i = 4; i <= na - 4; i += 4) { const q = rows[nt][i]; B.site('rim', q, add(tg, mul(norm(sub(q, cen(1))), 0.6)), 0.25 * H, i / na); }
  },
};

// ---------------------------------------------------------------- frond
// Division repeated in a plane: an axis bears paired side axes, which bear their own,
// down to threads or blades. Each order is thinner, so one organ spans several scales.
KINDS.frond = {
  dim: 'graph', sites: ['tips', 'apex'],
  schema: {
    orders: [1, 4, 3, 1], pairs: [2, 14, 7, 1], ratio: [0.2, 0.7, 0.42], angle: [0.3, 1.4, 0.85], stalk: [0, 0.6, 0.2], droop: [-1, 1, 0.2],
    twist: [0, 1, 0], thick: [0.003, 0.03, 0.014], thin: [0.3, 0.9, 0.6], blade: [1, 8, 1], outline: [0, 1, 0.7],
  },
  grow(B, p, R) {
    const O = Math.round(p.orders);
    let tips = 0;
    const rach = (o, d, nr, L, r, order) => {
      if (B.ctx.direct > B.ctx.maxDirect) { B.ctx.truncated = true; return; }
      const last = order === O, steps = order === 0 ? 10 : last ? 3 : 6, pts = [o], ds = [d], ns = [nr], rad = [r];
      for (let q = 1; q <= steps; q++) {
        d = norm(sub(d, mul(nr, (p.droop * 0.9) / steps)));
        nr = norm(sub(nr, mul(d, dot(nr, d))));
        o = add(o, mul(d, L / steps)); pts.push(o); ds.push(d); ns.push(nr); rad.push(r * (1 - 0.6 * (q / steps)));
      }
      const side0 = cross(ds[0], ns[0]);
      if (last && p.blade > 1.05) B.tube(pts, rad.map((x) => x * Math.sqrt(p.blade) * 1.4), { sides: 6, flat: 1 / p.blade, ref: side0 });
      else B.tube(pts, rad, { sides: order >= 2 ? 4 : order === 1 ? 5 : 8, ref: side0 });
      if (last) { if (tips++ < 160) B.site('tips', o, d, 0.12, tips / 160); return; }
      const P = Math.max(2, Math.round(p.pairs) - 2 * order), st = order === 0 ? p.stalk : 0.1;
      for (let k = 0; k < P; k++) {
        const sv = st + ((1 - st) * (k + 0.5)) / P, f = sv * steps, a = Math.min(steps - 1, Math.floor(f)), g = f - a;
        const q = lerpv(pts[a], pts[a + 1], g), dd = ds[a], nn = ns[a], sd = cross(dd, nn);
        const env = lerp(1, (1 - 0.75 * sv) * Math.min(1, 0.55 + sv * 3), p.outline) * (0.75 + 0.25 * Math.sin(Math.PI * sv));
        for (const sg of [-1, 1]) {
          const cd = norm(add(mul(dd, Math.cos(p.angle)), mul(sd, sg * Math.sin(p.angle)))), tw = p.twist * (Math.PI / 2) * sg;
          const n2 = norm(add(mul(nn, Math.cos(tw)), mul(cross(cd, nn), Math.sin(tw))));
          rach(q, cd, n2, L * p.ratio * env * 1.6, lerp(rad[a], rad[a + 1], g) * p.thin, order + 1);
        }
      }
      if (order === 0) B.site('apex', o, d, 0.2, 1);
    };
    rach([0, 0, 0], [0, 1, 0], [0, 0, 1], 1, p.thick, 0);
  },
};

// ---------------------------------------------------------------- umbel
// Rays leave one point and all end on one shared surface, flat or domed.
// Put an umbel on every ray end and the surface is tiled at two scales.
KINDS.umbel = {
  dim: 'radiate', sites: ['rays', 'hub'],
  schema: {
    rays: [3, 60, 18, 1], spread: [0.2, 1.5, 0.75], crown: [0, 1, 0.15], reach: [0.2, 1, 0.55], curve: [-1, 1, 0.3],
    thick: [0.003, 0.03, 0.009], bud: [0, 3, 1.2], bracts: [0, 12, 0, 1],
  },
  grow(B, p, R, used) {
    const n = Math.round(p.rays), ph = R.range(0, TAU), nb = Math.round(p.bracts);
    const rTop = p.reach * Math.tan(Math.min(p.spread, 1.3)), spacing = (1.9 * Math.max(rTop, 0.25 * p.reach)) / Math.sqrt(n);
    for (let i = 0; i < n; i++) {
      const th = p.spread * Math.sqrt((i + 0.5) / n), f = i * GOLDEN + ph;
      const L = Math.min(lerp(p.reach / Math.max(0.2, Math.cos(th)), p.reach, p.crown), 2.6 * p.reach);
      const e = [Math.sin(th) * Math.cos(f) * L, Math.cos(th) * L, Math.sin(th) * Math.sin(f) * L];
      const c = [e[0] * (0.5 + 0.35 * p.curve), e[1] * (0.5 - 0.25 * p.curve), e[2] * (0.5 + 0.35 * p.curve)];
      const pts = [], rad = [];
      for (let q = 0; q <= 7; q++) { const t = q / 7, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), cc = t * t; pts.push([b * c[0] + cc * e[0], b * c[1] + cc * e[1], b * c[2] + cc * e[2]]); rad.push(p.thick * (1 - 0.35 * t)); }
      B.tube(pts, rad, { sides: 5 });
      const tg = norm(sub(e, c)), out = norm(add(tg, [0, 0.6, 0]));
      B.site('rays', e, out, spacing, i / n);
      if (!used.has('rays') && p.bud > 0.05) B.tube([e, add(e, mul(tg, p.thick * p.bud * 2.2)), add(e, mul(tg, p.thick * p.bud * 4.5))], [p.thick * 0.7, p.thick * p.bud * 1.7, p.thick * 0.25], { sides: 6 });
    }
    for (let i = 0; i < nb; i++) {
      const f = (TAU * i) / nb, dv = [Math.cos(f) * 0.93, 0.35, Math.sin(f) * 0.93], L = 0.32 * p.reach;
      B.tube([[0, 0, 0], mul(dv, L * 0.5), add(mul(dv, L), [0, -0.12 * L, 0])], [p.thick * 2.4, p.thick * 3, p.thick * 0.3], { sides: 6, flat: 0.22, ref: [-Math.sin(f), 0, Math.cos(f)] });
    }
    B.site('hub', [0, 0, 0], [0, 1, 0], 0.3, 0);
  },
};

// ================================================================ stemless body plans
// Nothing below has an axis that carries other parts. Order comes from a centre, a surface or a weave.

// ---------------------------------------------------------------- rosette
// Sheets packed round a point by a divergence angle. Position in the sequence sets size and posture:
// outer ones lie open, inner ones stand closed, so the whole grades from splayed to furled.
KINDS.rosette = {
  dim: 'sheet', sites: ['leaves', 'heart'],
  schema: {
    count: [5, 90, 30, 1], angle: [90, 180, 137.508], open: [0, 1.6, 0.85], close: [-0.3, 0.7, 0.05], length: [0.3, 1, 0.7], grade: [-0.8, 0.85, 0.5],
    width: [0.08, 0.6, 0.2], point: [0.3, 3, 1.5], cup: [-1, 1.5, 0.8], curl: [-2, 2, 0.35], keel: [0, 1, 0.25], ruffle: [0, 0.2, 0.03], thick: [0.004, 0.05, 0.016],
  },
  grow(B, p, R) {
    const n = Math.round(p.count), nt = 22, na = 8;
    for (let i = 0; i < n; i++) {
      const u = n > 1 ? i / (n - 1) : 0, f = (i * p.angle * Math.PI) / 180, er = [Math.cos(f), 0, Math.sin(f)], ef = [-Math.sin(f), 0, Math.cos(f)];
      const al = lerp(p.open, p.close, Math.pow(u, 0.8)), L = p.length * Math.max(0.18, 1 - p.grade * u), W = (p.width * L) / p.length, ph = R.range(0, TAU);
      let pos = add(mul(er, 0.015 + 0.05 * (1 - u)), [0, 0.04 * u, 0]);
      const rows = [];
      let tg = [0, 1, 0];
      for (let j = 0; j <= nt; j++) {
        const t = j / nt, th = al + p.curl * t * t * 0.9;
        tg = add(mul(er, Math.sin(th)), [0, Math.cos(th), 0]);
        const ad = add(mul(er, -Math.cos(th)), [0, Math.sin(th), 0]);
        if (j) pos = add(pos, mul(tg, L / nt));
        const w = W * (0.25 + 0.75 * Math.sin(Math.PI * Math.pow(t, 0.6))) * Math.pow(Math.max(0, 1 - Math.pow(t, 2 * p.point)), 0.6), row = [];
        for (let a = 0; a <= na; a++) {
          const sv = (a / na) * 2 - 1, as = Math.abs(sv);
          const lift = p.cup * w * sv * sv * 0.6 + p.keel * w * 0.35 * as + p.ruffle * L * Math.pow(as, 1.5) * Math.sin(5 * Math.PI * t + ph + (sv > 0 ? 1.3 : 0)) * t;
          row.push(add(add(pos, mul(ef, sv * w)), mul(ad, lift)));
        }
        rows.push(row);
      }
      B.sheet(rows, (a, j) => p.thick * (1 - 0.5 * (j / nt)) * (1 - 0.4 * Math.abs((a / na) * 2 - 1)));
      B.site('leaves', pos, tg, 0.3 * L, u, ef);
    }
    B.site('heart', [0, 0.05, 0], [0, 1, 0], 0.3, 0);
  },
};

// ---------------------------------------------------------------- calyx
// A cup divided by radial blades in cycles: a first set reaching far in, a second between them, a third between those.
KINDS.calyx = {
  dim: 'sheet', sites: ['septa', 'center'],
  schema: {
    radius: [0.15, 0.6, 0.35], depth: [0.1, 1, 0.42], flare: [-0.5, 1, 0.35], septa: [4, 36, 12, 1], cycles: [1, 3, 3, 1], reach: [0.2, 0.95, 0.72],
    exsert: [0, 0.8, 0.25], column: [0, 0.5, 0.16], twist: [-1.5, 1.5, 0], thick: [0.005, 0.05, 0.014],
  },
  grow(B, p, R) {
    const N = Math.round(p.septa), na = Math.max(24, N * 4), rAt = (t) => p.radius * (1 - p.flare * 0.5 * (1 - t));
    const ring = (r, y) => { const row = []; for (let a = 0; a < na; a++) { const f = (TAU * a) / na; row.push([r * Math.cos(f), y, r * Math.sin(f)]); } return row; };
    const rows = [ring(0.02, 0.004), ring(rAt(0) * 0.6, 0)];
    for (let j = 0; j <= 8; j++) rows.push(ring(rAt(j / 8), p.depth * (j / 8)));
    B.sheet(rows, () => p.thick, { closeU: true });
    const cyc = Math.round(p.cycles), blades = [];
    for (let k = 0; k < N; k++) blades.push([(TAU * k) / N, p.reach, 0]);
    if (cyc > 1) for (let k = 0; k < N; k++) blades.push([(TAU * (k + 0.5)) / N, p.reach * 0.6, 1]);
    if (cyc > 2) for (let k = 0; k < 2 * N; k++) blades.push([(TAU * (k + 0.5)) / (2 * N), p.reach * 0.34, 2]);
    for (const [f0, ext, c] of blades) {
      const g = [], ns = 7, nv = 6;
      for (let a = 0; a <= ns; a++) {
        const sv = a / ns, f = f0 + p.twist * sv * 0.5 * ext, top = p.depth * (1 + p.exsert * (1 - 0.5 * c) * Math.cos((sv * Math.PI) / 2)) * (1 - 0.6 * sv * sv), row = [];
        for (let v = 0; v <= nv; v++) { const t = v / nv, y = top * t, r = rAt(Math.min(1, y / p.depth)) * (1 - ext * sv); row.push([r * Math.cos(f), y, r * Math.sin(f)]); }
        g.push(row);
      }
      B.sheet(g, (v, a) => p.thick * (0.85 - 0.2 * c) * (1 - 0.5 * (a / ns)));
      if (c === 0) { const q = g[0][nv]; B.site('septa', q, [Math.cos(f0) * 0.5, 1, Math.sin(f0) * 0.5], 0.5 * p.radius, f0 / TAU, [-Math.sin(f0), 0, Math.cos(f0)]); }
    }
    const ch = p.depth * 0.5;
    if (p.column > 0.02) B.tube([[0, 0, 0], [0, ch * 0.6, 0], [0, ch, 0]], [p.column * p.radius, p.column * p.radius * 0.9, p.column * p.radius * 0.5], { sides: 20, profile: (a) => 1 - 0.25 * (0.5 - 0.5 * Math.cos(5 * a)) });
    B.site('center', [0, p.column > 0.02 ? ch : 0.01, 0], [0, 1, 0], 0.5 * p.radius, 0);
  },
};

// ---------------------------------------------------------------- thallus
// A ribbon that creeps over the ground and forks as it goes. No up, no trunk: only a spreading margin.
KINDS.thallus = {
  dim: 'sheet', sites: ['face', 'lobes'],
  schema: {
    rays: [1, 7, 4, 1], forks: [1, 6, 3, 1], length: [0.12, 0.6, 0.3], width: [0.05, 0.3, 0.17], fork: [0.2, 1.3, 0.6], decay: [0.6, 1, 0.84],
    lift: [0, 1, 0.45], arch: [0, 1, 0.3], ruffle: [0, 0.15, 0.04], wander: [0, 1, 0.35], thick: [0.005, 0.04, 0.013],
  },
  grow(B, p, R) {
    const F = Math.round(p.forks), nt = 14, na = 8, ns = R.int(0, 9999);
    let li = 0;
    const lobe = (o, hd, L, W, depth, y0) => {
      const rows = [], last = depth === F, ph = R.range(0, TAU);
      let pos = o.slice(), mid = null, dir = [Math.cos(hd), 0, Math.sin(hd)];
      for (let j = 0; j <= nt; j++) {
        const t = j / nt;
        if (j) { hd += p.wander * 0.25 * vnoise(pos[0] * 5, pos[2] * 5, depth, ns); dir = [Math.cos(hd), 0, Math.sin(hd)]; pos = add(pos, mul(dir, L / nt)); }
        const sd = [-dir[2], 0, dir[0]], w = W * (0.8 + 0.2 * Math.sin(Math.PI * t)) * (last ? Math.sqrt(Math.max(0, 1 - Math.pow(t, 4))) : 1) * (depth === 0 ? 0.35 + 0.65 * sstep(0, 0.4, t) : 1);
        const y = y0 + p.arch * 0.3 * L * Math.sin(Math.PI * t), row = [];
        for (let a = 0; a <= na; a++) {
          const sv = (a / na) * 2 - 1, as = Math.abs(sv);
          row.push([pos[0] + sd[0] * sv * w, y + p.lift * w * Math.pow(as, 2.2) * 0.8 + p.ruffle * 6 * w * as * as * Math.sin(3 * Math.PI * t + ph + (sv > 0 ? 2 : 0)), pos[2] + sd[2] * sv * w]);
        }
        rows.push(row);
        if (j === Math.round(nt * 0.6)) mid = [pos[0], y, pos[2]];
      }
      B.sheet(rows, (a) => p.thick * (1 - 0.45 * Math.abs((a / na) * 2 - 1)));
      B.site('face', mid, [0, 1, 0], 2.4 * W, depth / Math.max(1, F), dir);
      if (last) { B.site('lobes', [pos[0], y0, pos[2]], add(dir, [0, 0.7, 0]), 2.6 * W, (li++ % 32) / 32, [-dir[2], 0, dir[0]]); return; }
      const sd = [-dir[2], 0, dir[0]];
      for (const sg of [-1, 1]) lobe(add(pos, mul(sd, sg * W * 0.4)), hd + sg * p.fork * R.range(0.35, 0.65), L * p.decay, W * p.decay * 0.78, depth + 1, y0 + p.thick * 0.5 * sg);
    };
    const K = Math.round(p.rays);
    for (let k = 0; k < K; k++) lobe([0, 0, 0], (TAU * k) / K + R.range(-0.25, 0.25), p.length, p.width, 0, 0.012 + 0.004 * k);
  },
};

// ---------------------------------------------------------------- weave
// Two families of threads crossing over and under each other on a surface. The form is held by interlacing alone.
KINDS.weave = {
  dim: 'weave', sites: ['rim', 'knots'],
  schema: {
    shape: Object.keys(PROFILE), width: [0.12, 0.6, 0.34], warp: [6, 60, 22, 1], weft: [4, 50, 16, 1], thread: [0.004, 0.03, 0.011],
    relief: [0.5, 3, 1.4], skew: [-3, 3, 0.7], flat: [1, 5, 1.6], open: [0, 0.6, 0.18], splay: [0, 1, 0.35],
  },
  grow(B, p, R) {
    const prof = PROFILE[p.shape] || PROFILE.urn, N = Math.round(p.warp / 2) * 2, M = Math.round(p.weft), amp = p.relief * p.thread;
    const t0 = 0.03, t1 = Math.min(0.97, 1 - p.open), fl = Math.sqrt(p.flat);
    const at = (t, f, off) => { const q = prof(Math.min(t, 0.985), p.width), r = Math.max(0.01, q[0]) + off; return [r * Math.cos(f), q[1], r * Math.sin(f)]; };
    for (let i = 0; i < N; i++) {
      const pts = [], steps = M * 4 + 6, sg = i % 2 ? -1 : 1;
      for (let s2 = 0; s2 <= steps; s2++) {
        const t = t0 + ((0.985 - t0) * s2) / steps, f = (TAU * i) / N + p.skew * t;
        const wv = t <= t1 ? amp * sg * Math.cos(Math.PI * (((t - t0) / (t1 - t0)) * M - 0.5)) * sstep(0, 0.04, t - t0) : p.splay * p.width * Math.pow((t - t1) / Math.max(0.02, 0.985 - t1), 2);
        pts.push(at(t, f, wv));
      }
      B.tube(pts, pts.map((_, k) => p.thread * fl * (1 - 0.5 * sstep(0.85, 1, k / steps))), { sides: 6, flat: 1 / p.flat, ref: [-Math.sin((TAU * i) / N), 0, Math.cos((TAU * i) / N)] });
      const e = pts[steps];
      B.site('rim', e, sub(e, pts[steps - 2]), 0.22, i / N, [-Math.sin((TAU * i) / N + p.skew), 0, Math.cos((TAU * i) / N + p.skew)]);
    }
    for (let j = 0; j < M; j++) {
      const t = t0 + ((t1 - t0) * (j + 0.5)) / M, pts = [], steps = N * 4, sg = j % 2 ? -1 : 1;
      for (let s2 = 0; s2 <= steps; s2++) { const f = (TAU * s2) / steps; pts.push(at(t, f, -amp * sg * Math.cos((N * (f - p.skew * t)) / 2))); }
      B.tube(pts, pts.map(() => p.thread * fl), { sides: 6, flat: 1 / p.flat, ref: [0, 1, 0] });
      if (j % 2 === 0) for (let i = 0; i < N; i += 3) { const f = (TAU * i) / N + p.skew * t, q = at(t, f, amp); B.site('knots', q, [Math.cos(f), 0.3, Math.sin(f)], 0.14, j / M); }
    }
  },
};

// ---------------------------------------------------------------- bell
// A whorl of sheets fused edge to edge into a tube, splitting into free lobes at the mouth.
// fusion slides from separate petals to a seamless tube; lip breaks the radial symmetry so the
// organ has a top and a bottom; open slides from a sealed bud to a flared mouth. +x is the lower side.
KINDS.bell = {
  dim: 'sheet', sites: ['mouth', 'lobes'],
  schema: {
    length: [0.3, 1.2, 0.9], base: [0.02, 0.2, 0.05], throat: [0.06, 0.5, 0.16], belly: [0, 1, 0.3], bend: [-1.5, 1.5, 0.3], lobes: [3, 9, 5, 1],
    fusion: [0, 1, 0.78], flare: [-0.5, 1.6, 0.6], lip: [0, 1, 0.5], notch: [0, 1, 0.45], open: [0, 1, 1], thick: [0.004, 0.04, 0.012],
    stamens: [0, 8, 4, 1], sepals: [0, 8, 5, 1], pedicel: [0, 0.6, 0.18], nod: [0, 2.6, 0.4],
  },
  grow(B, p, R) {
    const N = Math.round(p.lobes), L = p.length, fus = clamp(p.fusion, 0.06, 0.97), Lt = L * fus, Lf = L * (1 - fus), S = [0, 0, 1];
    const dirAt = (a) => [Math.sin(a), Math.cos(a), 0];
    let pos = [0, 0, 0], th = 0;
    const ped = p.pedicel * L, pp = [pos];
    if (ped > 0.005) { for (let q = 1; q <= 6; q++) { th += p.nod / 6; pos = add(pos, mul(dirAt(th), ped / 6)); pp.push(pos); } B.tube(pp, pp.map(() => p.thick * 1.3), { sides: 6 }); }
    const nt = 18, na = Math.max(20, N * 8), rows = [], cen = [], Vs = [], rs = [], bud = lerp(0.62, 1, p.open);
    const rad = (t) => (lerp(p.base, p.throat, Math.pow(sstep(0, 0.8, t), 0.8)) + p.belly * p.throat * 0.6 * Math.sin(Math.PI * t)) * lerp(1, bud, sstep(0.45, 1, t));
    let T = dirAt(th), V = [Math.cos(th), -Math.sin(th), 0];
    for (let j = 0; j <= nt; j++) {
      const t = j / nt;
      if (j) { th += p.bend / nt; pos = add(pos, mul(dirAt(th), Lt / nt)); }
      T = dirAt(th); V = [Math.cos(th), -Math.sin(th), 0];
      const r = rad(t), row = [];
      for (let a = 0; a < na; a++) {
        const f = (TAU * a) / na, rr = r * (1 + 0.5 * p.lip * p.belly * Math.max(0, Math.cos(f)) * Math.sin(Math.PI * t));
        row.push([pos[0] + V[0] * Math.cos(f) * rr, pos[1] + V[1] * Math.cos(f) * rr, Math.sin(f) * rr]);
      }
      rows.push(row); cen.push(pos); Vs.push(V); rs.push(r);
    }
    B.sheet(rows, () => p.thick, { closeU: true });
    const r1 = rs[nt], fl = lerp(-1, p.flare, p.open);
    for (let k = 0; k < N; k++) {
      const fc = (TAU * k) / N, ell = Lf * (1 + 0.7 * p.lip * Math.cos(fc)), g = [];
      for (let i = 0; i <= 8; i++) {
        const tau = i / 8, w = (1 - p.notch * 0.8 * tau) * Math.sqrt(Math.max(0, 1 - Math.pow(tau, 4))), row = [];
        const along = ell * (tau - 0.35 * Math.max(0, fl) * tau * tau), out = Math.max(ell * fl * 0.8 * tau * tau, -r1 * 0.96 * tau);
        for (let c = 0; c <= 8; c++) {
          const f = fc + (c / 8 - 0.5) * (TAU / N) * w, rr = r1 + out;
          row.push([pos[0] + V[0] * Math.cos(f) * rr + T[0] * along, pos[1] + V[1] * Math.cos(f) * rr + T[1] * along, Math.sin(f) * rr]);
        }
        g.push(row);
      }
      B.sheet(g, (c, i) => p.thick * (1 - 0.4 * (i / 8)));
      B.site('lobes', g[8][4], add(T, mul(add(mul(V, Math.cos(fc)), mul(S, Math.sin(fc))), Math.max(0, fl))), 0.6 * p.throat, k / N);
    }
    const M = Math.round(p.stamens);
    for (let m = 0; m < M; m++) {
      const f = Math.PI + (m - (M - 1) / 2) * 0.55, pts = [], rr = [];
      for (let j = 0; j <= Math.round(nt * 0.85); j += 3) { pts.push([cen[j][0] + Vs[j][0] * Math.cos(f) * rs[j] * 0.6, cen[j][1] + Vs[j][1] * Math.cos(f) * rs[j] * 0.6, Math.sin(f) * rs[j] * 0.6]); rr.push(p.thick * 0.45); }
      const e = pts[pts.length - 1], d = norm(sub(e, pts[pts.length - 2]));
      pts.push(add(e, mul(d, p.thick * 2.5)), add(e, mul(d, p.thick * 5))); rr.push(p.thick * 1.25, p.thick * 0.4);
      B.tube(pts, rr, { sides: 5 });
    }
    const K = Math.round(p.sepals), T0 = dirAt(p.pedicel > 0.008 ? p.nod : 0), V0 = Vs[0];
    for (let k = 0; k < K; k++) {
      const f = (TAU * (k + 0.5)) / K, Rv = add(mul(V0, Math.cos(f)), mul(S, Math.sin(f))), st = add(cen[0], mul(Rv, p.base * 0.9));
      B.tube([st, add(st, mul(add(mul(T0, 0.6), mul(Rv, 0.5)), 0.13 * L)), add(st, mul(add(mul(T0, 1), mul(Rv, 0.95)), 0.2 * L))], [p.thick * 2.2, p.thick * 2.6, p.thick * 0.3], { sides: 6, flat: 0.25, ref: cross(T0, Rv) });
    }
    B.site('mouth', pos, T, r1 * 2.5, 1, V);
  },
};

// ================================================================ unfold
// One rule, applied to itself. There are no organ types here.
// Every part is the same object: a ribbon swept along a curve, described by a few numbers.
// Each of those numbers is a closed-form function of one variable G, the part's developmental age:
//   width/length = slender * widen^G        wrap = wrap - unwrap*G        bend = bend + curl*G
//   children     = count * multiply^G       divergence = angle + drift*G  placement = at, spread shifted by gather*G
// A child of a part with age G, sitting at fraction u along it, has age G + 1 + advance*(u - 1/2)
// and length  parentLength * ratio^(its age step) * (1 - fade*(u - 1/2)).
// So a tube, a channel, a blade and a thread are the same formula read at different G,
// and "what grows where" is the same formula read at different u.
KINDS.unfold = {
  dim: 'one rule', sites: ['tips'],
  schema: {
    depth: [1, 5, 3, 1], age: [0.2, 6, 6], slender: [0.004, 0.5, 0.05], wrap: [0, 1, 1], bend: [-4, 4, 0.2], twist: [-6, 6, 0], base: [0, 1.5, 0], tip: [0, 1.5, 0.35],
    count: [1, 40, 9, 1], angle: [0, 180, 137.508], at: [0, 1, 0.62], spread: [0, 1, 0.7], splay: [0, 2.2, 0.9],
    ratio: [0.15, 0.9, 0.45], widen: [0.3, 6, 2.2], unwrap: [-1, 1, 0.45], curl: [-3, 3, 0.6], multiply: [0.3, 2, 0.8], gather: [-1, 1, 0], drift: [-60, 60, 0],
    advance: [-1.5, 1.5, 0.4], fade: [-1, 1, 0.3], gravity: [-1, 1, 0], thick: [0.004, 0.04, 0.012],
  },
  grow(B, p, R) {
    const D = Math.round(p.depth);
    let made = 0, tips = 0;
    const part = (o, T, N, L, G, g) => {
      const grown = clamp(p.age - g, 0, 1);
      if (grown < 0.03 || made > 4500 || B.ctx.direct > B.ctx.maxDirect) return;
      made++; L *= grown;
      const w = clamp(p.wrap - p.unwrap * G, 0, 1), closed = w > 0.97, be = p.bend + p.curl * G, tw = p.twist;
      const b0 = Math.min(0.7, p.slender * Math.pow(p.widen, G)) * L;
      const nt = g === 0 ? 26 : g === 1 ? 14 : g === 2 ? 9 : 6, na = closed ? (g === 0 ? 14 : g === 1 ? 8 : 5) : g < 2 ? 8 : 5;
      const shape = (t) => Math.pow(t + 0.03, p.base) * Math.pow(1 - t + 0.03, p.tip);
      let smax = 0; for (let j = 0; j <= 20; j++) smax = Math.max(smax, shape(j / 20));
      const rows = [], fr = [];
      let pos = o;
      for (let j = 0; j <= nt; j++) {
        if (j) {
          const a = be / nt, c = Math.cos(a), sn = Math.sin(a);
          let T2 = add(mul(T, c), mul(N, sn)); N = sub(mul(N, c), mul(T, sn)); T = T2;
          if (p.gravity) { T = norm(add(T, [0, (-p.gravity * 1.5) / nt, 0])); N = norm(sub(N, mul(T, dot(N, T)))); }
          if (tw) { const b2 = cross(T, N), q = tw / nt; N = norm(add(mul(N, Math.cos(q)), mul(b2, Math.sin(q)))); }
          pos = add(pos, mul(T, L / nt));
        }
        const Bn = cross(T, N), b = (b0 * shape(j / nt)) / smax, row = [];
        if (closed) { const r = b / Math.PI; for (let a = 0; a < na; a++) { const f = (TAU * a) / na; row.push(add(pos, add(mul(N, Math.cos(f) * r), mul(Bn, Math.sin(f) * r)))); } }
        else {
          const ww = Math.max(w, 0.02), r = b / (Math.PI * ww);
          for (let a = 0; a <= na; a++) { const f = ((a / na) * 2 - 1) * Math.PI * ww; row.push(add(pos, add(mul(Bn, Math.sin(f) * r), mul(N, (1 - Math.cos(f)) * r - (w * w * b) / Math.PI)))); }
        }
        rows.push(row); fr.push([pos, T, N, (w * w * b) / Math.PI]);
      }
      const th = p.thick * Math.pow(L, 0.6);
      B.sheet(rows, closed ? () => th : (a) => th * (1 - 0.5 * Math.abs((a / na) * 2 - 1)), { closeU: closed });
      if (g >= D) { if (tips++ < 120) B.site('tips', pos, T, 0.3 * L, tips / 120); return; }
      const n = Math.max(1, Math.round(p.count * Math.pow(p.multiply, G))), ang = ((p.angle + p.drift * G) * Math.PI) / 180;
      const sp = clamp(p.spread - p.gather * G, 0, 1), at = clamp(p.at + 0.5 * p.gather * G, 0, 1);
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n, t = clamp(at + sp * (u - 0.5), 0.02, 1), fi = Math.min(nt, Math.round(t * nt)), [c, Tp, Np, rad] = fr[fi];
        const Bp = cross(Tp, Np), f = i * ang, e = add(mul(Np, Math.cos(f)), mul(Bp, Math.sin(f)));
        const step = Math.max(0.3, 1 + p.advance * (u - 0.5));
        const Tc = add(mul(Tp, Math.cos(p.splay)), mul(e, Math.sin(p.splay))), Nc = add(mul(e, -Math.cos(p.splay)), mul(Tp, Math.sin(p.splay)));
        part(add(c, mul(e, rad * 0.8)), Tc, Nc, (L / grown) * Math.pow(p.ratio, step) * Math.max(0.15, 1 - p.fade * (u - 0.5)), G + step, g + 1);
      }
    };
    part([0, 0, 0], [0, 1, 0], [1, 0, 0], 1, 0, 0);
  },
};

// ================================================================ corolla
// One surface, one rule. The only object is a bell: a single closed-form surface S(u, f),
// u from throat to rim, f around. There is no stem, leaf or sheath anywhere in it.
//   radius(u, f) = base + (throat - base) * (1 - (1 - u)^swell) + flare * u^edge      tube opening into a flared limb
//   rim(f)       = 1 - notch * (1 - |cos(lobes * f / 2)|^point)                        the limb is shorter between lobes,
//                                                                                      so petals are the same sheet, not parts
//   height(u)    = u - recurve * u^(edge + 1)                                          the rim rolls back on itself
// lip and pouch break the round symmetry, twist spirals the lobes, bend arcs the axis.
// A bell bears smaller bells directly on its own surface, at (where, 2*pi*i/count), and each of those is
// the same formula with notch, flare and throat advanced by one step. Nothing else exists.
KINDS.corolla = {
  dim: 'one rule', sites: ['tips'],
  schema: {
    length: [0.3, 1.4, 1], base: [0.01, 0.3, 0.05], throat: [0.05, 0.6, 0.27], swell: [0.3, 4, 2.2], flare: [0, 1.5, 0.2], edge: [1.5, 10, 4.5], recurve: [0, 1.2, 0.12],
    lobes: [0, 12, 5, 1], fusion: [0.05, 0.95, 0.72], notch: [0, 0.95, 0.35], point: [0.3, 4, 1], lip: [0, 1, 0.3], pouch: [0, 1, 0.15], twist: [-3, 3, 0],
    ruffle: [0, 0.15, 0.015], waves: [2, 24, 10, 1], bend: [-2.5, 2.5, 0.5], thick: [0.004, 0.04, 0.012],
    depth: [0, 4, 2, 1], count: [1, 12, 5, 1], where: [0, 1, 1], perch: [-1, 1, 0.35], ratio: [0.15, 0.9, 0.5],
    split: [-0.4, 0.6, 0.1], curl: [-0.6, 0.8, 0.04], narrow: [0.4, 1.6, 0.95], drift: [-3.14, 3.14, 0], advance: [-1, 1, 0], age: [0.2, 5, 5],
  },
  grow(B, p, R) {
    const D = Math.round(p.depth), n = Math.round(p.lobes), wv = Math.round(p.waves), cnt = Math.round(p.count);
    let made = 0, tips = 0;
    const bell = (o, T, N, size, G, g) => {
      const grown = clamp(p.age - g, 0, 1);
      if (grown < 0.03 || made > 1600 || B.ctx.direct > B.ctx.maxDirect) return;
      made++; size *= grown;
      const Bn = cross(T, N), LN = p.length, be = p.bend;
      const notch = clamp(p.notch + p.split * G, 0, 0.95), flare = Math.max(0, p.flare + p.curl * G), throat = clamp(p.throat * Math.pow(p.narrow, G), 0.03, 0.7), base = Math.min(p.base, throat * 0.8);
      const surf = (u, f, r0) => {
        const lam = n ? Math.pow(Math.abs(Math.cos((n * f) / 2)), p.point) : 1;
        const ue = u <= p.fusion ? u : p.fusion + (u - p.fusion) * (1 - notch * (1 - lam)) * (1 + 0.5 * p.lip * Math.cos(f));
        const uc = Math.min(1, ue), e = Math.pow(ue, p.edge);
        let r = base + (throat - base) * (1 - Math.pow(1 - uc, p.swell)) + flare * LN * e;
        r = r * (1 + p.pouch * Math.cos(f) * Math.sin(Math.PI * uc)) + p.ruffle * LN * e * Math.sin(wv * f);
        if (r0 !== undefined) r = r0;
        const z = LN * (ue - p.recurve * e * ue) + p.ruffle * LN * e * 0.5 * Math.cos(wv * f), ft = f + p.twist * ue, a = (be * z) / LN;
        let cx = 0, cy = z;
        if (Math.abs(be) > 1e-3) { const rho = LN / be; cx = rho * (1 - Math.cos(a)); cy = rho * Math.sin(a); }
        const lx = cx + r * Math.cos(ft) * Math.cos(a), ly = cy - r * Math.cos(ft) * Math.sin(a), lz = r * Math.sin(ft);
        return [o[0] + size * (lx * N[0] + ly * T[0] + lz * Bn[0]), o[1] + size * (lx * N[1] + ly * T[1] + lz * Bn[1]), o[2] + size * (lx * N[2] + ly * T[2] + lz * Bn[2])];
      };
      const nu = g === 0 ? 34 : g === 1 ? 20 : g === 2 ? 13 : 9, na = clamp(Math.max(n * (g === 0 ? 14 : g === 1 ? 10 : 8), g === 0 ? 40 : g === 1 ? 24 : 14), 8, 140), rows = [];
      for (let j = 0; j <= nu; j++) { const row = []; for (let a = 0; a < na; a++) row.push(surf(j / nu, (TAU * a) / na)); rows.push(row); }
      const th = p.thick * Math.pow(size, 0.6);
      B.sheet(rows, (a, j) => th * (1 - 0.5 * (j / nu)), { closeU: true });
      if (g >= D) { if (tips++ < 100) B.site('tips', surf(1, 0), T, 0.3 * size, tips / 100); return; }
      const w = p.where;
      for (let i = 0; i < cnt; i++) {
        const f = (TAU * i) / cnt + p.drift * (G + 1), step = Math.max(0.3, 1 + p.advance * ((i + 0.5) / cnt - 0.5));
        let P0, dir, Nc;
        if (cnt === 1) {
          // a single child sits on the axis: a bell inside a bell
          P0 = surf(w, 0, 0); dir = norm(sub(surf(Math.min(1, w + 0.04), 0, 0), surf(Math.max(0, w - 0.04), 0, 0)));
          Nc = norm(sub(N, mul(dir, dot(N, dir))));
          const c = Math.cos(p.drift), sn = Math.sin(p.drift); Nc = norm(add(mul(Nc, c), mul(cross(dir, Nc), sn)));
        } else {
          P0 = surf(w, f);
          const tm = norm(sub(surf(Math.min(1, w + 0.02), f), surf(Math.max(0, w - 0.02), f))), tf = norm(sub(surf(w, f + 0.05), P0));
          let nn = norm(cross(tf, tm));
          if (dot(nn, sub(P0, surf(w, f, 0))) < 0) nn = mul(nn, -1);
          dir = norm(add(mul(tm, 1 - Math.abs(p.perch)), mul(nn, p.perch)));
          Nc = sub(nn, mul(dir, dot(nn, dir)));
          Nc = len(Nc) > 0.15 ? norm(Nc) : norm(sub(tm, mul(dir, dot(tm, dir))));
        }
        bell(P0, dir, Nc, (size / grown) * Math.pow(p.ratio, step), G + step, g + 1);
      }
    };
    bell([0, 0, 0], [0, 1, 0], [1, 0, 0], 1, 0, 0);
  },
};

// ================================================================ pack
// Compose, then pack and relax. Nothing here is placed by rule. Petals are separate sheets of particles.
// 1. Compose: every petal is laid out at full size and allowed to pass through the others. That is wrong
//    as a shape but right as a measurement. From the crossings we read the composition: within a bell,
//    which petal lies outside which where they overlap; between bells, which way each one is being crowded.
// 2. Scaffold: crowded bells are leaned away from what crowds them and composed again; the layering is kept.
// 3. Grow: petals restart small on the shared base and grow to full width while a solver keeps each one a
//    sheet. Contact is resolved along the sheet's normal toward the side the composition assigned, so a
//    petal that belongs behind stays behind, and one that ends up on the wrong side is moved back through.
KINDS.pack = {
  dim: 'compose, pack, relax', sites: ['tips'],
  schema: {
    bells: [1, 40, 12, 1], petals: [1, 9, 5, 1], length: [0.3, 1.2, 0.8], base: [0.01, 0.12, 0.03], throat: [0.05, 0.5, 0.17], swell: [0.3, 4, 1.6], flare: [0, 1, 0.2],
    overlap: [0.6, 2.4, 1.3], excess: [0, 0.8, 0.2], fusion: [0, 1, 0.55], contort: [-1, 1, 0.5], crowd: [0.4, 3, 1], fan: [0, 1.6, 0.15], grade: [-0.8, 0.8, 0.3],
    stiff: [0, 1, 0.65], gravity: [0, 1, 0.15], compose: [0, 5, 4, 1], lean: [0, 1, 0.7], relax: [0, 240, 120, 1], thick: [0.004, 0.03, 0.011],
  },
  grow(B, p, R) {
    const NB = Math.round(p.bells), P = Math.round(p.petals), iters = Math.round(p.relax), K = NB * P;
    let NR = 18, NC = 8;
    if (K * (NR + 1) * (NC + 1) > 12000) { NR = 11; NC = 6; }
    if (K * (NR + 1) * (NC + 1) > 12000) { NR = 8; NC = 5; }
    const row = NC + 1, per = (NR + 1) * row, n = K * per;
    const X = new Float32Array(n * 3), NM = new Float32Array(n * 3), W = new Float32Array(n), pid = new Int32Array(n), tOf = new Float32Array(n);
    const ci = [], cj = [], ca = [], cl = [], ck = [];
    const link = (i, j, a, l, k) => { ci.push(i); cj.push(j); ca.push(a); cl.push(l); ck.push(k); };
    const sep = (0.62 * p.length) / NR, Rp = p.crowd * p.base * 1.15 * Math.sqrt(NB), bells = [];
    for (let b = 0; b < NB; b++) {
      const rho = Math.sqrt((b + 0.5) / NB), th = b * GOLDEN, sz = Math.max(0.3, 1 - p.grade * (rho - 0.5)), L = p.length * sz, rb = p.base * sz;
      const rad = (t) => rb + ((p.throat - p.base) * (1 - Math.pow(1 - t, p.swell)) + p.flare * Math.pow(t, 4)) * sz;
      bells.push({ o: [Rp * rho * Math.cos(th), 0.01, Rp * rho * Math.sin(th)], T: norm([Math.cos(th) * p.fan * rho, 1, Math.sin(th) * p.fan * rho]), L, rb, rad });
      for (let k = 0; k < P; k++) {
        const off = (b * P + k) * per;
        for (let r = 0; r <= NR; r++) {
          const t = r / NR, wa = (((p.overlap * TAU * rad(t)) / P) * (1 + p.excess * t * t * t)) / NC, la = L / NR;
          for (let c = 0; c <= NC; c++) {
            const i = off + r * row + c;
            W[i] = r === 0 ? 0 : 1; pid[i] = b * P + k; tOf[i] = t;
            if (c < NC) link(i, i + 1, wa, 0, 1);
            if (r < NR) link(i, i + row, 0, la, 1);
            if (c < NC && r < NR) { link(i, i + row + 1, wa, la, 0.6); link(i + 1, i + row, wa, la, 0.6); }
            if (c < NC - 1) link(i, i + 2, 2 * wa, 0, 0.5 * p.stiff);
            if (r < NR - 1) link(i, i + 2 * row, 0, 2 * la, 0.5 * p.stiff);
          }
        }
        // below the fusion line neighbouring petals are stitched where they overlap: a tube. Above it they are free.
        if (P > 1) {
          const nx = (b * P + ((k + 1) % P)) * per, cb = clamp(Math.round((1 - 1 / p.overlap) * NC), 0, NC);
          for (let r = 1; r <= Math.floor(p.fusion * NR); r++) { link(off + r * row + NC, nx + r * row + cb, 0, sep * 1.05, 0.8); link(nx + r * row, off + r * row + NC - cb, 0, sep * 1.05, 0.8); }
        }
      }
    }
    // lay every petal on its bell at scale q (1 = full size, small = the crowded start)
    const place = (q) => {
      for (let b = 0; b < NB; b++) {
        const { o, T, L, rb, rad } = bells[b], N = norm(sub([1, 0, 0], mul(T, T[0]))), Bn = cross(T, N);
        for (let k = 0; k < P; k++) for (let r = 0; r <= NR; r++) {
          const t = r / NR, R1 = rad(t), wid = ((p.overlap * TAU * R1) / P) * (1 + p.excess * t * t * t), Rq = rb + (R1 - rb) * q;
          for (let c = 0; c <= NC; c++) {
            const sv = c / NC - 0.5, a = (TAU * k) / P + b * 2.4 + (sv * wid) / R1, rr = Rq * (1 + p.contort * 0.3 * sv) + (p.contort < 0 ? -1 : 1) * sv * sep * 1.5, i = ((b * P + k) * per + r * row + c) * 3;
            for (let d = 0; d < 3; d++) X[i + d] = o[d] + T[d] * L * t + (N[d] * Math.cos(a) + Bn[d] * Math.sin(a)) * rr;
          }
        }
      }
    };
    // centre of every ring of every bell: between bells, "inside" is judged against this, because a tube
    // is too tightly curved for a local tangent plane to say which side a neighbour is on
    const CEN = new Float32Array(NB * (NR + 1) * 3), rOf = (i) => ((i % per) / row) | 0;
    const cen = (i) => (((pid[i] / P) | 0) * (NR + 1) + rOf(i)) * 3;
    const rin = (a, b) => { const c = cen(b); return Math.hypot(X[a * 3] - CEN[c], X[a * 3 + 1] - CEN[c + 1], X[a * 3 + 2] - CEN[c + 2]); };
    // outward normals of every sheet
    const normals = () => {
      CEN.fill(0);
      for (let i = 0; i < n; i++) { const c = cen(i); CEN[c] += X[i * 3] / (P * row); CEN[c + 1] += X[i * 3 + 1] / (P * row); CEN[c + 2] += X[i * 3 + 2] / (P * row); }
      for (let id = 0; id < K; id++) for (let r = 0; r <= NR; r++) for (let c = 0; c <= NC; c++) {
        const o = id * per, i = (o + r * row + c) * 3, a = (o + r * row + Math.min(NC, c + 1)) * 3, b = (o + r * row + Math.max(0, c - 1)) * 3, e = (o + Math.min(NR, r + 1) * row + c) * 3, f = (o + Math.max(0, r - 1) * row + c) * 3;
        const ux = X[a] - X[b], uy = X[a + 1] - X[b + 1], uz = X[a + 2] - X[b + 2], vx = X[e] - X[f], vy = X[e + 1] - X[f + 1], vz = X[e + 2] - X[f + 2];
        const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx, l = Math.hypot(x, y, z) || 1;
        NM[i] = x / l; NM[i + 1] = y / l; NM[i + 2] = z / l;
      }
    };
    const HS = 1 << 15, head = new Int32Array(HS), next = new Int32Array(n), cell = 1.1 * sep;
    const key = (x, y, z) => ((Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) >>> 0) & (HS - 1);
    // visit every pair of nearby particles that belong to different petals
    const pairs = (fn) => {
      head.fill(-1);
      for (let i = 0; i < n; i++) { const h = key(Math.floor(X[i * 3] / cell), Math.floor(X[i * 3 + 1] / cell), Math.floor(X[i * 3 + 2] / cell)); next[i] = head[h]; head[h] = i; }
      for (let i = 0; i < n; i++) {
        const gx = Math.floor(X[i * 3] / cell), gy = Math.floor(X[i * 3 + 1] / cell), gz = Math.floor(X[i * 3 + 2] / cell);
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) for (let j = head[key(gx + a, gy + b, gz + c)]; j >= 0; j = next[j]) {
          if (j <= i || pid[j] === pid[i]) continue;
          const dx = X[i * 3] - X[j * 3], dy = X[i * 3 + 1] - X[j * 3 + 1], dz = X[i * 3 + 2] - X[j * 3 + 2], d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < cell * cell && d2 > 1e-12) fn(i, j, dx, dy, dz, d2);
        }
      }
    };
    // the side petal A should keep relative to petal B's outward normal: +1 outside, -1 inside
    // Within a bell the layering is cyclic (each petal outside the next, all the way round), so it only means
    // something where two petals really overlap. `over` remembers, per particle, which petals it overlapped
    // in the composition; `vote` holds which side won for that pair of petals. 0 = no assigned side.
    const vote = new Map(), over = new Set();
    const side = (a, b) => { const A = pid[a], Bp = pid[b]; if (((A / P) | 0) !== ((Bp / P) | 0)) return 2; if (!over.has(a * K + Bp)) return 0; return (vote.get(A * K + Bp) || 0) >= 0 ? 1 : -1; };
    const wrong = () => { const bad = new Uint8Array(n), bad2 = new Uint8Array(n); pairs((i, j, dx, dy, dz) => { const a = dx * NM[j * 3] + dy * NM[j * 3 + 1] + dz * NM[j * 3 + 2], b = -(dx * NM[i * 3] + dy * NM[i * 3 + 1] + dz * NM[i * 3 + 2]); const si = side(i, j); if (si === 2) { if (rin(i, j) < rin(j, j) - 0.3 * sep) bad[i] = 1; if (rin(j, i) < rin(i, i) - 0.3 * sep) bad[j] = 1; return; } if (a * si < 0) bad2[i] = 1; if (b * side(j, i) < 0) bad2[j] = 1; }); let s2 = 0, s3 = 0; for (let i = 0; i < n; i++) { s2 += bad[i]; s3 += bad2[i]; } return [Math.round((1000 * s2) / n) / 10, Math.round((1000 * s3) / n) / 10]; };
    // ---- 1 and 2: compose at full size, read the crossings, lean, repeat
    const rounds = Math.round(p.compose);
    let raw = null;
    for (let c = 0; c < rounds; c++) {
      place(1); normals(); vote.clear(); over.clear();
      const push = bells.map(() => [0, 0, 0, 0]);
      pairs((i, j, dx, dy, dz, d2) => {
        const A = pid[i], Bp = pid[j], ba = (A / P) | 0, bb = (Bp / P) | 0;
        if (ba === bb) {
          const a = dx * NM[j * 3] + dy * NM[j * 3 + 1] + dz * NM[j * 3 + 2], b = -(dx * NM[i * 3] + dy * NM[i * 3 + 1] + dz * NM[i * 3 + 2]);
          vote.set(A * K + Bp, (vote.get(A * K + Bp) || 0) + Math.sign(a)); vote.set(Bp * K + A, (vote.get(Bp * K + A) || 0) + Math.sign(b));
          over.add(i * K + Bp); over.add(j * K + A);
        } else { const d = Math.sqrt(d2); push[ba][0] += dx / d; push[ba][1] += dy / d; push[ba][2] += dz / d; push[ba][3]++; push[bb][0] -= dx / d; push[bb][1] -= dy / d; push[bb][2] -= dz / d; push[bb][3]++; }
      });
      if (raw === null) raw = wrong();
      if (c < rounds - 1) bells.forEach((bl, b) => {
        // a bell leans away from the bells it passes through, by how one-sided the crowding is
        const q = push[b]; if (!q[3]) return;
        const T = norm(add(bl.T, mul([q[0] / q[3], 0, q[2] / q[3]], p.lean)));
        bl.T = T[1] < 0.25 ? norm([T[0], 0.25, T[2]]) : T;
      });
    }
    // ---- 3: grow from the crowded start, keeping every contact on its assigned side
    place(iters > 0 ? 0.06 : 1);
    const m = ci.length, grav = p.gravity * 0.0009, q0 = 0.06;
    for (let it = 0; it < iters; it++) {
      const q = Math.min(1, q0 + ((1 - q0) * it) / (0.7 * iters));
      for (let i = 0; i < n; i++) if (W[i]) { X[i * 3 + 1] -= grav * tOf[i]; if (X[i * 3 + 1] < 0.004) X[i * 3 + 1] = 0.004; }
      for (let pass = 0; pass < 3; pass++) for (let e = 0; e < m; e++) {
        const i = ci[e], j = cj[e], wi = W[i], wj = W[j], ws = wi + wj;
        if (!ws) continue;
        const dx = X[j * 3] - X[i * 3], dy = X[j * 3 + 1] - X[i * 3 + 1], dz = X[j * 3 + 2] - X[i * 3 + 2], d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-9;
        const f = ((d - Math.hypot(ca[e] * q, cl[e])) / d) * ck[e] / ws;
        X[i * 3] += dx * f * wi; X[i * 3 + 1] += dy * f * wi; X[i * 3 + 2] += dz * f * wi;
        X[j * 3] -= dx * f * wj; X[j * 3 + 1] -= dy * f * wj; X[j * 3 + 2] -= dz * f * wj;
      }
      normals();
      pairs((i, j, dx, dy, dz, d2) => {
        const ws = W[i] + W[j]; if (!ws) return;
        // i against j's sheet, then j against i's: each is moved along the other's normal to its assigned side
        const si = side(i, j), sj = side(j, i);
        if (si === 2) {
          // different bells: whichever particle sits nearer the other bell's axis than that bell's own wall is moved back out
          for (let h = 0; h < 2; h++) {
            const a = h ? j : i, b = h ? i : j, c = cen(b), ra = rin(a, b), rb2 = rin(b, b);
            if (!W[a] || ra >= rb2 || ra < 1e-6) continue;
            const f = Math.min(rb2 - ra + 0.5 * sep, 0.6 * sep) * 0.5 / ra;
            X[a * 3] += (X[a * 3] - CEN[c]) * f; X[a * 3 + 1] += (X[a * 3 + 1] - CEN[c + 1]) * f; X[a * 3 + 2] += (X[a * 3 + 2] - CEN[c + 2]) * f;
          }
        }
        if (si === 2 || (!si && !sj)) {
          // no assigned side here: plain separation along the line between them
          if (d2 < sep * sep) { const d = Math.sqrt(d2), f = ((sep - d) / d) * 0.5 / ws; X[i * 3] += dx * f * W[i]; X[i * 3 + 1] += dy * f * W[i]; X[i * 3 + 2] += dz * f * W[i]; X[j * 3] -= dx * f * W[j]; X[j * 3 + 1] -= dy * f * W[j]; X[j * 3 + 2] -= dz * f * W[j]; }
          return;
        }
        for (let h = 0; h < 2; h++) {
          const a = h ? j : i, b = h ? i : j, sg0 = h ? -1 : 1, nx = NM[b * 3], ny = NM[b * 3 + 1], nz = NM[b * 3 + 2], sg = h ? sj : si;
          if (!sg) continue;
          const d = sg0 * (dx * nx + dy * ny + dz * nz), s2 = sg * d;
          if (s2 >= sep || d2 - d * d > sep * sep) continue;
          const f = (sg * Math.min(sep - s2, 0.6 * sep) * 0.5) / ws;
          X[a * 3] += nx * f * W[a]; X[a * 3 + 1] += ny * f * W[a]; X[a * 3 + 2] += nz * f * W[a];
          X[b * 3] -= nx * f * W[b]; X[b * 3 + 1] -= ny * f * W[b]; X[b * 3 + 2] -= nz * f * W[b];
        }
      });
    }
    normals();
    B.ctx.info = { raw, final: wrong() };
    // Catmull-Rom doubling: the solver's lattice is coarse, so a smooth sheet is drawn through it
    const cr = (a, b2, c, d) => [0, 1, 2].map((k) => (0.5 * (-a[k] + 9 * b2[k] + 9 * c[k] - d[k])) / 8);
    const line = (L) => { const out = []; for (let i = 0; i < L.length - 1; i++) out.push(L[i], cr(L[Math.max(0, i - 1)], L[i], L[i + 1], L[Math.min(L.length - 1, i + 2)])); out.push(L[L.length - 1]); return out; };
    for (let id = 0; id < K; id++) {
      const rows = [], off = id * per;
      for (let r = 0; r <= NR; r++) { const rw = []; for (let c = 0; c <= NC; c++) { const i = (off + r * row + c) * 3; rw.push([X[i], X[i + 1], X[i + 2]]); } rows.push(rw); }
      const cols = rows.map(line)[0].map((_, c) => line(rows.map(line).map((rw) => rw[c])));
      const fine = cols[0].map((_, r) => cols.map((cl2) => cl2[r]));
      B.sheet(fine, (c, r) => p.thick * (1 - 0.4 * (r / (fine.length - 1))));
      const tip = rows[NR][NC >> 1];
      if (id < 100) B.site('tips', tip, sub(tip, rows[NR - 1][NC >> 1]), 0.2, id / K);
    }
  },
};

// ================================================================ cells
// An open sheet of cells that grows at its edge. No shape is put in: the start is six linked cells
// in a loop, and everything after is division and settling.
//   each row, every edge cell divides away from the body (the edge advances by one row);
//   `gain` more edge cells per row also divide along the edge (the edge gets longer);
//   after each row the young part of the body settles: links return to one set length,
//   the sheet resists bending, and cells that are not linked give way to each other.
// Nothing random touches the surface. The seed only turns the starting point of the along-edge divisions.
// The rule under study here is WHERE the along-edge divisions happen. `bias` 0 spreads them evenly
// round the edge; `bias` 1 gives them to the cells that currently stand highest.
KINDS.cells = {
  dim: 'grown sheet', sites: ['edge'],
  schema: { rows: [4, 60, 44, 1], gain: [0, 14, 4], bias: [0, 1, 0], lift: [0, 1, 0.15], stiff: [0, 1, 0.6], settle: [4, 80, 30, 1] },
  grow(B, p, R) {
    const L = 0.02, H = L * 0.87, rows = Math.round(p.rows), its = Math.round(p.settle), turn = R(), YOUNG = 14, nb = [], triAt = [0];
    const X = [], ring = [], pa = [], pb = [], tris = [], li = [], lj = [], bi = [], bj = [], seen = new Set(), opp = new Map(), rings = [], linkAt = [0], bendAt = [0];
    const add = (x, y, z, r, a, b) => { X.push(x, y, z); ring.push(r); pa.push(a); pb.push(b); nb.push([]); return ring.length - 1; };
    const P = (i) => [X[i * 3], X[i * 3 + 1], X[i * 3 + 2]];
    const link = (a, b) => { const k = a < b ? a * 1e6 + b : b * 1e6 + a; if (!seen.has(k)) { seen.add(k); li.push(a); lj.push(b); nb[a].push(b); nb[b].push(a); } };
    const tri = (a, b, c) => {
      tris.push(a, b, c); link(a, b); link(b, c); link(c, a);
      for (const [u, v, w] of [[a, b, c], [b, c, a], [c, a, b]]) { const k = u < v ? u * 1e6 + v : v * 1e6 + u, o = opp.get(k); if (o === undefined) opp.set(k, w); else { bi.push(o); bj.push(w); } }
    };
    // The start is one cell lying on the ground and the six it is linked to, flat. Nothing points it upward:
    // new cells continue in the sheet's own direction, and only the link lengths decide whether it can stay flat.
    const n0 = 6, first = [], c0 = add(0, 0.004, 0, 0, -1, -1);
    for (let j = 0; j < n0; j++) first.push(add(L * Math.cos((TAU * j) / n0), 0.004, L * Math.sin((TAU * j) / n0), 0, c0, c0));
    for (let j = 0; j < n0; j++) tri(c0, first[j], first[(j + 1) % n0]);
    rings.push(first);
    let acc = 0;
    for (let k = 1; k <= rows; k++) {
      const prev = rings[k - 1], N = prev.length;
      acc += p.gain; let ex = Math.min(N, Math.floor(acc)); acc -= Math.floor(acc);
      // which edge cells also divide along the edge
      let ymin = 1e9, ymax = -1e9;
      for (const i of prev) { ymin = Math.min(ymin, X[i * 3 + 1]); ymax = Math.max(ymax, X[i * 3 + 1]); }
      const w = prev.map((i) => { const h = (X[i * 3 + 1] - ymin) / (ymax - ymin + 1e-6); return 1 - p.bias + p.bias * 3 * h * h + 1e-4; });
      const tot = w.reduce((a, b) => a + b, 0), extra = new Uint8Array(N);
      for (let m = 0; m < ex; m++) {
        let q = (((m + ((k * 0.618 + turn) % 1)) / ex) % 1) * tot, j = 0;
        while (j < N - 1 && q > w[j]) { q -= w[j]; j++; }
        let g = 0; while (extra[j] && g++ < N) j = (j + 1) % N;
        extra[j] = 1;
      }
      // away from the body: the direction each edge cell last moved from the cells it came from
      // `lift`: the first row leans away from the ground it sits on, so a sheet that cannot stay flat knows which way is free
      const out = prev.map((i) => { const o = norm(sub(P(i), mul(add3(P(pa[i]), P(pb[i])), 0.5))); return k === 1 ? norm(add3(o, [0, p.lift, 0])) : o; });
      const cur = [], par = [];
      for (let j = 0; j < N; j++) {
        const i = prev[j], i2 = prev[(j + 1) % N], A = P(i), C = P(i2), mid = mul(add3(A, C), 0.5), o = norm(add3(out[j], out[(j + 1) % N]));
        const tg = sub(C, A), d = add3(mid, mul(o, H));
        cur.push(add(d[0], d[1], d[2], k, i, i2)); par.push((j + 0.5) / N);
        if (extra[j]) { const e = add3(d, mul(tg, 0.3)); cur.push(add(e[0], e[1], e[2], k, i, i2)); par.push((j + 0.8) / N); }
      }
      const M = cur.length;
      let a = 0, m = 0;
      while (a < N || m < M) {
        const na = (a + 1) / N, nb = m + 1 < M ? par[m + 1] : 1 + par[0];
        if (m >= M || (a < N && na < nb)) { tri(prev[a % N], prev[(a + 1) % N], cur[m % M]); a++; } else { tri(prev[a % N], cur[(m + 1) % M], cur[m % M]); m++; }
      }
      rings.push(cur); linkAt.push(li.length); bendAt.push(bi.length); triAt.push(tris.length);
      // settle the young part of the body; older rows have set and no longer move
      const y0 = Math.max(1, k - YOUNG), from = rings[y0][0], l0 = linkAt[Math.max(0, y0 - 1)], b0 = bendAt[Math.max(0, y0 - 1)], n = ring.length, rep = 0.8 * L;
      const h0 = rings[Math.max(0, y0 - 3)][0], HS = 1 << 14, head = new Int32Array(HS), next = new Int32Array(n);
      const key = (x, y, z) => ((Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) >>> 0) & (HS - 1);
      const pull = (u, v, rest, kk) => {
        const wu = u >= from ? 1 : 0, wv = v >= from ? 1 : 0, ws = wu + wv; if (!ws) return;
        const dx = X[v * 3] - X[u * 3], dy = X[v * 3 + 1] - X[u * 3 + 1], dz = X[v * 3 + 2] - X[u * 3 + 2], d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-9, f = (((d - rest) / d) * kk) / ws;
        X[u * 3] += dx * f * wu; X[u * 3 + 1] += dy * f * wu; X[u * 3 + 2] += dz * f * wu; X[v * 3] -= dx * f * wv; X[v * 3 + 1] -= dy * f * wv; X[v * 3 + 2] -= dz * f * wv;
      };
      for (let it = 0; it < its; it++) {
        for (let e = l0; e < li.length; e++) pull(li[e], lj[e], L, 1);
        if (p.stiff > 0) {
          // resisting bending: a cell moves toward the middle of the cells it is linked to, but only along the
          // sheet's own normal there. (Holding opposite cells a fixed distance apart assumed a regular lattice
          // and raised a bump at every place a cell had been added.)
          const nm = new Float32Array(n * 3);
          for (let t = triAt[Math.max(0, y0 - 1)]; t < tris.length; t += 3) {
            const a = tris[t] * 3, b = tris[t + 1] * 3, c = tris[t + 2] * 3;
            const ux = X[b] - X[a], uy = X[b + 1] - X[a + 1], uz = X[b + 2] - X[a + 2], vx = X[c] - X[a], vy = X[c + 1] - X[a + 1], vz = X[c + 2] - X[a + 2];
            const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
            for (const q of [a, b, c]) { nm[q] += x; nm[q + 1] += y; nm[q + 2] += z; }
          }
          const edgeFrom = cur[0];
          for (let i = from; i < edgeFrom; i++) {
            const N2 = nb[i]; let cx = 0, cy = 0, cz = 0;
            for (const q of N2) { cx += X[q * 3]; cy += X[q * 3 + 1]; cz += X[q * 3 + 2]; }
            const l = Math.hypot(nm[i * 3], nm[i * 3 + 1], nm[i * 3 + 2]) || 1, nx = nm[i * 3] / l, ny = nm[i * 3 + 1] / l, nz = nm[i * 3 + 2] / l;
            const d = ((cx / N2.length - X[i * 3]) * nx + (cy / N2.length - X[i * 3 + 1]) * ny + (cz / N2.length - X[i * 3 + 2]) * nz) * 0.6 * p.stiff;
            X[i * 3] += nx * d; X[i * 3 + 1] += ny * d; X[i * 3 + 2] += nz * d;
          }
        }
        head.fill(-1);
        for (let i = h0; i < n; i++) { const h = key(Math.floor(X[i * 3] / rep), Math.floor(X[i * 3 + 1] / rep), Math.floor(X[i * 3 + 2] / rep)); next[i] = head[h]; head[h] = i; }
        for (let i = from; i < n; i++) {
          const gx = Math.floor(X[i * 3] / rep), gy = Math.floor(X[i * 3 + 1] / rep), gz = Math.floor(X[i * 3 + 2] / rep);
          for (let a2 = -1; a2 <= 1; a2++) for (let b2 = -1; b2 <= 1; b2++) for (let c2 = -1; c2 <= 1; c2++) for (let j = head[key(gx + a2, gy + b2, gz + c2)]; j >= 0; j = next[j]) {
            if (j === i || (j > i && j >= from)) continue;
            const dx = X[i * 3] - X[j * 3], dy = X[i * 3 + 1] - X[j * 3 + 1], dz = X[i * 3 + 2] - X[j * 3 + 2], d2 = dx * dx + dy * dy + dz * dz;
            if (d2 >= rep * rep || d2 < 1e-14) continue;
            const d = Math.sqrt(d2), wj = j >= from ? 1 : 0, f = ((rep - d) / d) / (1 + wj);
            X[i * 3] += dx * f; X[i * 3 + 1] += dy * f; X[i * 3 + 2] += dz * f;
            if (wj) { X[j * 3] -= dx * f; X[j * 3 + 1] -= dy * f; X[j * 3 + 2] -= dz * f; }
          }
          if (X[i * 3 + 1] < 0.003) X[i * 3 + 1] = 0.003;
        }
      }
    }
    B.cells(X, tris, L * 0.5);
    const edge = rings[rings.length - 1];
    for (let j = 0; j < edge.length; j += Math.max(1, Math.floor(edge.length / 24))) B.site('edge', P(edge[j]), sub(P(edge[j]), P(pa[edge[j]])), 0.2, j / edge.length);
  },
};
const add3 = add;

// ================================================================ modifiers
// These act on a node's finished distance field, so they work on any skeleton.
export const MODS = {
  // grooves along the nodal lines of a wavefield: cortical folding on whatever is underneath
  sulci: {
    schema: { lambda: [0.05, 0.4, 0.14], depth: [0.004, 0.06, 0.022], width: [0.1, 0.8, 0.35], aniso: [-0.9, 0.9, 0] },
    make(p, R) {
      const wv = makeWave(R, 14, p.aniso), L = p.lambda;
      return { band: p.depth, fn: (d, x, y, z) => d + p.depth * (1 - sstep(0, p.width, Math.abs(wv(x / L, y / L, z / L)))) };
    },
  },
  // cell-shaped pits with ridges between them
  pits: {
    schema: { cell: [0.03, 0.25, 0.09], depth: [0.004, 0.06, 0.025], wall: [0.1, 0.6, 0.3] },
    make(p, R) {
      const vor = makeVoronoi(R.int(1, 1e6), 0.9), c = p.cell;
      return { band: p.depth, fn: (d, x, y, z) => d + p.depth * sstep(0, p.wall, vor(x / c, y / c, z / c).d12 * 2) };
    },
  },
  // longitudinal flutes and transverse rings about the node's own axis
  ribs: {
    schema: { n: [0, 24, 8, 1], rings: [0, 16, 0], depth: [0.004, 0.06, 0.02], twist: [-8, 8, 0] },
    make(p) {
      const n = Math.round(p.n);
      return {
        band: p.depth * 2,
        fn: (d, x, y, z) => {
          let g = 0;
          if (n) g += 0.5 - 0.5 * Math.cos(n * (Math.atan2(z, x) + p.twist * y));
          if (p.rings > 0) g += 0.5 - 0.5 * Math.cos(TAU * p.rings * y);
          return d + p.depth * g;
        },
      };
    },
  },
  // empty the interior and open a mouth, so the form becomes a vessel a body can enter
  hollow: {
    schema: { wall: [0.01, 0.08, 0.03], mouth: [0, 0.8, 0.3] },
    make(p, R, node) {
      const y0 = node.lbox[1], y1 = node.lbox[4], cut = lerp(y1, y0, p.mouth);
      return { band: 0, deep: true, fn: (d, x, y, z) => Math.max(Math.max(d, -(d + p.wall)), p.mouth > 0.01 ? y - cut : -1) };
    },
  },
  // fine-grained displacement; a little goes a long way
  grain: {
    schema: { freq: [2, 30, 9], amp: [0.002, 0.03, 0.008] },
    make(p, R) {
      const s = R.int(0, 9999);
      return { band: p.amp, fn: (d, x, y, z) => d + p.amp * (vnoise(x * p.freq, y * p.freq, z * p.freq, s) + 0.5 * vnoise(x * p.freq * 2.1, y * p.freq * 2.1, z * p.freq * 2.1, s + 3)) };
    },
  },
};

for (const k of ['arbor', 'fascicle', 'axis', 'frond', 'umbel']) KINDS[k].stem = true;

export function defaults(schema) {
  const p = {};
  for (const k in schema) { const s = schema[k]; p[k] = typeof s[0] === 'string' ? s[0] : s[2]; }
  return p;
}
export function fillParams(schema, given) {
  const p = defaults(schema);
  if (given) for (const k in given) if (k in schema) {
    const s = schema[k];
    if (typeof s[0] === 'string') { if (s.includes(given[k])) p[k] = given[k]; }
    else if (Number.isFinite(+given[k])) p[k] = clamp(+given[k], s[0], s[1]);
  }
  return p;
}
export { hash32 };
