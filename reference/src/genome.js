// A genome is a small tree: { kind, p, mods, kids:[{ at, n, scale, up, g }] }.
// Expanding it walks the tree, handing each child a frame published by its parent.
import { KINDS, MODS, fillParams, defaults } from './skeletons.js';
import { makeRng, makeFrame, hash32, norm, add, mul, sub, clamp, lerp } from './util.js';
import { nodeBounds } from './clay.js';

class Builder {
  constructor(F, node, ctx) { this.F = F; this.n = node; this.sites = {}; this.ctx = ctx; }
  w(p) { const F = this.F, s = F.s; return [F.o[0] + s * (p[0] * F.x[0] + p[1] * F.y[0] + p[2] * F.z[0]), F.o[1] + s * (p[0] * F.x[1] + p[1] * F.y[1] + p[2] * F.z[1]), F.o[2] + s * (p[0] * F.x[2] + p[1] * F.y[2] + p[2] * F.z[2])]; }
  wd(v) { const F = this.F; return [v[0] * F.x[0] + v[1] * F.y[0] + v[2] * F.z[0], v[0] * F.x[1] + v[1] * F.y[1] + v[2] * F.z[1], v[0] * F.x[2] + v[1] * F.y[2] + v[2] * F.z[2]]; }
  cap(a, b, ra, rb, bl = 0) { const A = this.w(a), C = this.w(b), s = this.F.s; this.n.caps.push(A[0], A[1], A[2], C[0], C[1], C[2], ra * s, rb * s, bl * s); }
  ball(c, r, bl = 0) { this.cap(c, c, r, r, bl); }
  tri(a, b, c, th, bl = 0) { const A = this.w(a), C = this.w(b), E = this.w(c), s = this.F.s; this.n.tris.push(A[0], A[1], A[2], C[0], C[1], C[2], E[0], E[1], E[2], th * s, bl * s); }
  field(fn, lmin, lmax, bl = 0) {
    const wmin = [1e9, 1e9, 1e9], wmax = [-1e9, -1e9, -1e9];
    for (let c = 0; c < 8; c++) {
      const q = this.w([c & 1 ? lmax[0] : lmin[0], c & 2 ? lmax[1] : lmin[1], c & 4 ? lmax[2] : lmin[2]]);
      for (let a = 0; a < 3; a++) { wmin[a] = Math.min(wmin[a], q[a]); wmax[a] = Math.max(wmax[a], q[a]); }
    }
    this.n.fields.push({ fn, wmin, wmax, bl: bl * this.F.s });
  }
  // ref (optional) fixes which way the child's +x faces, for organs that must face their parent
  site(tag, pos, dir, size, u = 0, ref = null) { (this.sites[tag] ??= []).push({ o: this.w(pos), y: norm(this.wd(dir)), s: size * this.F.s, u, x: ref ? norm(this.wd(ref)) : null }); }

  // ---- drawn geometry: exact meshes that never pass through the voxel clay.
  // A tube sweeps any cross-section (fluted, flattened, channelled) along a path, down to thread thickness.
  tube(pts, radii, o = {}) {
    const n = pts.length, c = this.ctx;
    if (n < 2) return;
    if (c.direct > c.maxDirect) { c.truncated = true; return; }
    const sides = o.sides || 6, prof = o.profile, flat = o.flat || 1, s = this.F.s, M = this.n.mesh, P = M.pos, I = M.idx;
    const W = pts.map((q) => this.w(q)), base = P.length / 3;
    let N = o.ref ? this.wd(o.ref) : null;
    for (let i = 0; i < n; i++) {
      const T = norm(sub(W[Math.min(n - 1, i + 1)], W[Math.max(0, i - 1)]));
      if (!N) N = Math.abs(T[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      N = sub(N, mul(T, T[0] * N[0] + T[1] * N[1] + T[2] * N[2]));
      const nl = Math.hypot(N[0], N[1], N[2]);
      N = nl > 1e-6 ? mul(N, 1 / nl) : norm([T[1], -T[0], 0.001]);
      const Bn = [T[1] * N[2] - T[2] * N[1], T[2] * N[0] - T[0] * N[2], T[0] * N[1] - T[1] * N[0]], t = i / (n - 1);
      for (let k = 0; k < sides; k++) {
        const a = (Math.PI * 2 * k) / sides, r = radii[i] * s * (prof ? prof(a, t) : 1), ca = Math.cos(a) * r, sa = Math.sin(a) * r * flat;
        P.push(W[i][0] + N[0] * ca + Bn[0] * sa, W[i][1] + N[1] * ca + Bn[1] * sa, W[i][2] + N[2] * ca + Bn[2] * sa);
      }
      if (i) {
        const r0 = base + (i - 1) * sides, r1 = base + i * sides;
        for (let k = 0; k < sides; k++) { const k1 = (k + 1) % sides; I.push(r0 + k, r0 + k1, r1 + k1, r0 + k, r1 + k1, r1 + k); }
        this.n.pcaps.push(W[i - 1][0], W[i - 1][1], W[i - 1][2], W[i][0], W[i][1], W[i][2], radii[i - 1] * s, radii[i] * s, 0);
      }
    }
    const c0 = P.length / 3; P.push(W[0][0], W[0][1], W[0][2], W[n - 1][0], W[n - 1][1], W[n - 1][2]);
    const last = base + (n - 1) * sides;
    for (let k = 0; k < sides; k++) { const k1 = (k + 1) % sides; I.push(c0, base + k1, base + k, c0 + 1, last + k, last + k1); }
    c.direct += n * sides * 2;
  }
  // A grown surface: cells and the triangles between linked cells, drawn exactly as they ended up.
  cells(X, tris, thick) {
    const M = this.n.mesh, base = M.pos.length / 3, s = this.F.s, W = [];
    for (let i = 0; i < X.length; i += 3) { const q = this.w([X[i], X[i + 1], X[i + 2]]); W.push(q); M.pos.push(q[0], q[1], q[2]); }
    for (let t = 0; t < tris.length; t += 3) {
      const a = W[tris[t]], b = W[tris[t + 1]], c = W[tris[t + 2]];
      M.idx.push(base + tris[t], base + tris[t + 1], base + tris[t + 2]);
      this.n.ptris.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], thick * s, 0);
    }
    this.ctx.direct += tris.length;
  }
  // A sheet is a real two-faced shell with a rim: as thin as asked, with a true edge.
  sheet(rows, th, o = {}) {
    const c = this.ctx;
    if (c.direct > c.maxDirect) { c.truncated = true; return; }
    const nv = rows.length, nu = rows[0].length, cu = !!o.closeU, cv = !!o.closeV, s = this.F.s, M = this.n.mesh, P = M.pos, I = M.idx;
    const W = rows.map((r) => r.map((q) => this.w(q))), base = P.length / 3;
    const at = (j, i) => W[cv ? (j + nv) % nv : Math.max(0, Math.min(nv - 1, j))][cu ? (i + nu) % nu : Math.max(0, Math.min(nu - 1, i))];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const du = sub(at(j, i + 1), at(j, i - 1)), dv = sub(at(j + 1, i), at(j - 1, i));
      const nn = norm([du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]]), q = W[j][i], t = th(i, j) * s * 0.5;
      P.push(q[0] + nn[0] * t, q[1] + nn[1] * t, q[2] + nn[2] * t, q[0] - nn[0] * t, q[1] - nn[1] * t, q[2] - nn[2] * t);
    }
    const id = (j, i, bot) => base + ((j % nv) * nu + (i % nu)) * 2 + bot;
    const ju = cv ? nv : nv - 1, iu = cu ? nu : nu - 1;
    for (let j = 0; j < ju; j++) for (let i = 0; i < iu; i++) {
      I.push(id(j, i, 0), id(j, i + 1, 0), id(j + 1, i + 1, 0), id(j, i, 0), id(j + 1, i + 1, 0), id(j + 1, i, 0));
      I.push(id(j, i, 1), id(j + 1, i + 1, 1), id(j, i + 1, 1), id(j, i, 1), id(j + 1, i, 1), id(j + 1, i + 1, 1));
      const a = W[j][i], b = W[j][(i + 1) % nu], e = W[(j + 1) % nv][(i + 1) % nu], f = W[(j + 1) % nv][i], t = th(i, j) * s;
      this.n.ptris.push(a[0], a[1], a[2], b[0], b[1], b[2], e[0], e[1], e[2], t, 0, a[0], a[1], a[2], e[0], e[1], e[2], f[0], f[1], f[2], t, 0);
    }
    if (!cu) for (let j = 0; j < ju; j++) {
      I.push(id(j, 0, 0), id(j + 1, 0, 0), id(j + 1, 0, 1), id(j, 0, 0), id(j + 1, 0, 1), id(j, 0, 1));
      I.push(id(j, nu - 1, 0), id(j + 1, nu - 1, 1), id(j + 1, nu - 1, 0), id(j, nu - 1, 0), id(j, nu - 1, 1), id(j + 1, nu - 1, 1));
    }
    if (!cv) for (let i = 0; i < iu; i++) {
      I.push(id(0, i, 0), id(0, i, 1), id(0, i + 1, 1), id(0, i, 0), id(0, i + 1, 1), id(0, i + 1, 0));
      I.push(id(nv - 1, i, 0), id(nv - 1, i + 1, 1), id(nv - 1, i, 1), id(nv - 1, i, 0), id(nv - 1, i + 1, 0), id(nv - 1, i + 1, 1));
    }
    c.direct += nv * nu * 4;
  }
}

export function expand(g, frame, seed, ctx, depth = 0) {
  const K = KINDS[g.kind];
  if (!K) return;
  const p = fillParams(K.schema, g.p);
  const node = { frame, caps: [], tris: [], fields: [], pcaps: [], ptris: [], mesh: { pos: [], idx: [] }, kind: g.kind, mods: [] };
  ctx.direct ??= 0; ctx.maxDirect ??= 1200000;
  const B = new Builder(frame, node, ctx), R = makeRng(seed);
  const used = new Set((g.kids || []).map((k) => k.at));
  K.grow(B, p, R, used);
  node.bounds = nodeBounds(node);
  if (g.mods && g.mods.length && node.bounds[0] <= node.bounds[3]) {
    // modifiers work in the node's own unit space, so they need its local extent
    const b = node.bounds, lb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (let c = 0; c < 8; c++) {
      const w = [(c & 1 ? b[3] : b[0]) - frame.o[0], (c & 2 ? b[4] : b[1]) - frame.o[1], (c & 4 ? b[5] : b[2]) - frame.o[2]];
      const l = [(w[0] * frame.x[0] + w[1] * frame.x[1] + w[2] * frame.x[2]) / frame.s, (w[0] * frame.y[0] + w[1] * frame.y[1] + w[2] * frame.y[2]) / frame.s, (w[0] * frame.z[0] + w[1] * frame.z[1] + w[2] * frame.z[2]) / frame.s];
      for (let a = 0; a < 3; a++) { lb[a] = Math.min(lb[a], l[a]); lb[a + 3] = Math.max(lb[a + 3], l[a]); }
    }
    node.lbox = lb;
    g.mods.forEach((m, mi) => {
      const M = MODS[m.kind];
      if (M) node.mods.push(M.make(fillParams(M.schema, m.p), makeRng(hash32(seed, 77, mi)), node));
    });
  }
  ctx.nodes.push(node);
  ctx.prims += node.caps.length / 9 + node.tris.length / 11 + node.mesh.idx.length / 12;
  if (depth >= 3 || !g.kids) return;
  g.kids.forEach((kid, ki) => {
    let sites = B.sites[kid.at] || [];
    // from/to restrict a child to part of the parent, so organs can differ along an axis
    if (kid.from > 0 || kid.to < 1) sites = sites.filter((q) => q.u >= (kid.from ?? 0) - 1e-6 && q.u <= (kid.to ?? 1) + 1e-6);
    if (!sites.length || !kid.g) return;
    const want = clamp(Math.round(kid.n ?? sites.length), 1, sites.length);
    for (let c = 0; c < want; c++) {
      if (ctx.prims > ctx.maxPrims || ctx.nodes.length > ctx.maxNodes) { ctx.truncated = true; return; }
      const si = Math.min(sites.length - 1, Math.floor(((c + 0.5) * sites.length) / want)), s = sites[si];
      const up = kid.up || 0;
      const y = up ? norm(add(mul(s.y, 1 - Math.abs(up)), [0, up, 0])) : s.y;
      const sc = s.s * (kid.scale ?? 1) * (kid.taper ? lerp(1, 1 - kid.taper, s.u) : 1);
      const o = sub(s.o, mul(y, 0.06 * sc));
      let cg = kid.g;
      if (kid.grad) {
        // a gradient re-tunes the child by where it sits: { param: [value at u=0, value at u=1] }
        cg = { ...kid.g, p: { ...kid.g.p } };
        for (const k in kid.grad) cg.p[k] = lerp(kid.grad[k][0], kid.grad[k][1], s.u);
      }
      let F;
      if (s.x && !up) {
        const x = norm(sub(s.x, mul(y, s.x[0] * y[0] + s.x[1] * y[1] + s.x[2] * y[2])));
        F = { o, x, y, z: [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]], s: sc };
      } else if (up && Math.abs(y[1]) < 0.97) {
        // a child that responds to gravity is also turned so its +x side faces down
        const x = norm([y[0] * y[1], y[1] * y[1] - 1, y[2] * y[1]]);
        F = { o, x, y, z: [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]], s: sc };
      } else F = makeFrame(o, y, sc, (hash32(seed, ki, si) % 628) / 100);
      expand(cg, F, kid.clone ? hash32(seed, ki) : hash32(seed, ki, si + 1), ctx, depth + 1);
    }
  });
}

export const SITE_N = { tips: [5, 36], forks: [4, 14], margin: [5, 24], face: [4, 14], center: [1, 1], aperture: [1, 1], keel: [4, 16], cells: [5, 36], crown: [1, 1], sites: [16, 90], apex: [1, 1], nodes: [5, 36], clasp: [3, 12], tip: [1, 1], rim: [3, 10], rays: [6, 36], hub: [1, 1], leaves: [5, 30], heart: [1, 1], septa: [4, 12], knots: [6, 30], lobes: [4, 24], mouth: [1, 1] };
const SITE_SCALE = { tips: [0.8, 2.2], forks: [0.8, 1.6], margin: [0.7, 1.8], face: [0.8, 1.8], center: [0.8, 1.6], aperture: [0.6, 1.3], keel: [0.7, 1.8], cells: [0.7, 1.4], crown: [0.8, 1.6], sites: [0.7, 1.6], apex: [0.8, 2], nodes: [0.7, 1.8], clasp: [0.8, 1.4], tip: [0.8, 2], rim: [0.6, 1.4], rays: [0.8, 1.4], hub: [0.8, 1.5], leaves: [0.7, 1.6], heart: [0.8, 2], septa: [0.6, 1.4], knots: [0.7, 1.6], lobes: [0.8, 1.8], mouth: [0.6, 1.4] };

function randomParams(schema, R, wild) {
  const p = {};
  for (const k in schema) {
    const s = schema[k];
    if (typeof s[0] === 'string') p[k] = R.pick(s);
    else {
      let v = lerp(s[2], R.range(s[0], s[1]), R() < wild ? 1 : R() * 0.5);
      if (s[3]) v = Math.round(v);
      p[k] = +v.toFixed(4);
    }
  }
  return p;
}
// children are small and numerous, so keep each one cheap
function slim(g) {
  const p = g.p;
  if (g.kind === 'arbor') { p.density = Math.min(p.density, 70); p.step = Math.max(p.step, 0.07); p.girth = Math.max(p.girth, 0.06); }
  if (g.kind === 'fascicle') { p.fibers = Math.min(p.fibers, 9); p.splits = Math.min(p.splits, 2); p.fiber = Math.max(p.fiber, 0.022); }
  if (g.kind === 'phyllo') { p.count = Math.min(p.count, 34); }
  if (g.kind === 'plexus') { p.nodes = Math.min(p.nodes, 22); p.strut = Math.max(p.strut, 0.03); }
  if (g.kind === 'foam') { p.cell = Math.max(p.cell, 0.26); p.thick = Math.max(p.thick, 0.04); }
  if (g.kind === 'wave') { p.lambda = Math.max(p.lambda, 0.4); }
  if (g.kind === 'lamella') { p.thick = Math.max(p.thick, 0.045); p.octaves = Math.min(p.octaves, 2); }
  if (g.kind === 'rosette') { p.count = Math.min(p.count, 12); p.thick = Math.max(p.thick, 0.02); }
  if (g.kind === 'calyx') { p.septa = Math.min(p.septa, 8); p.cycles = Math.min(p.cycles, 2); }
  if (g.kind === 'thallus') { p.forks = Math.min(p.forks, 2); p.rays = Math.min(p.rays, 3); }
  if (g.kind === 'weave') { p.warp = Math.min(p.warp, 12); p.weft = Math.min(p.weft, 7); p.thread = Math.max(p.thread, 0.02); }
  if (g.kind === 'frond') { p.orders = Math.min(p.orders, 2); p.pairs = Math.min(p.pairs, 5); }
  if (g.kind === 'umbel') { p.rays = Math.min(p.rays, 10); }
  if (g.kind === 'axis') { p.nodes = Math.min(p.nodes, 6); }
  if (g.kind === 'whorl') { p.thick = Math.max(p.thick, 0.04); p.turns = Math.min(p.turns, 2.5); p.bore = Math.max(p.bore, 0.25); }
  return g;
}
const SOLID = { phyllo: 1, foam: 1, wave: 1, arbor: 0.5, plexus: 0.3 };
function randomMod(kind, R) {
  const solid = SOLID[kind] || 0;
  const k = R.pick(solid >= 1 ? ['sulci', 'pits', 'ribs', 'grain', 'sulci'] : ['grain', 'ribs', 'sulci']);
  const p = randomParams(MODS[k].schema, R, 0.5);
  if ('depth' in p && solid < 1) p.depth = Math.min(p.depth, 0.012);
  return { kind: k, p };
}

// opt.stemless keeps to body plans with no supporting axis, and removes the stalks other plans can grow
export function breed(R, depth = 0, avoid = null, opt = {}) {
  // formula mode: no parts list at all, only a random point in the one rule's parameter space
  if (opt.formula) return { kind: 'pack', p: randomParams(KINDS.pack.schema, R, 0.5) };
  const names = Object.keys(KINDS).filter((k) => k !== avoid && k !== 'unfold' && k !== 'corolla' && k !== 'pack' && k !== 'cells' && !(opt.stemless && KINDS[k].stem));
  const kind = R.pick(names), K = KINDS[kind];
  const g = { kind, p: randomParams(K.schema, R, 0.55) };
  if (depth > 0) slim(g);
  if (opt.stemless) { if (kind === 'lamella') g.p.height = 0; if (kind === 'sheath') g.p.stalk = 0; if (kind === 'bell') g.p.pedicel = 0; }
  if (R.chance(depth ? 0.15 : 0.35)) g.mods = [randomMod(kind, R)];
  if (depth < 2 && R.chance(depth === 0 ? 0.85 : 0.2)) {
    g.kids = [];
    const nk = depth === 0 && R.chance(0.3) ? 2 : 1, tags = K.sites.slice();
    for (let i = 0; i < nk && tags.length; i++) {
      const at = tags.splice(R.int(0, tags.length - 1), 1)[0], rn = SITE_N[at], rs = SITE_SCALE[at];
      if (kind === 'phyllo' && at === 'sites') g.p.count = Math.min(g.p.count, 80);
      g.kids.push({ at, n: R.int(rn[0], rn[1]), scale: +R.range(rs[0], rs[1]).toFixed(2), up: R.chance(0.25) ? +R.range(-0.6, 0.8).toFixed(2) : 0, g: breed(R, depth + 1, kind, opt) });
    }
  }
  return g;
}

export function mutate(g, R, amount = 0.18) {
  const c = JSON.parse(JSON.stringify(g));
  const walk = (n) => {
    const S = KINDS[n.kind].schema;
    n.p = fillParams(S, n.p);
    for (const k in S) {
      const s = S[k];
      if (typeof s[0] === 'string') { if (R.chance(amount * 0.4)) n.p[k] = R.pick(s); }
      else if (R.chance(0.6)) { let v = clamp(n.p[k] + R.gauss() * amount * (s[1] - s[0]), s[0], s[1]); if (s[3]) v = Math.round(v); n.p[k] = +v.toFixed(4); }
    }
    (n.kids || []).forEach((k) => { if (R.chance(0.5)) k.scale = +clamp((k.scale ?? 1) * (1 + R.gauss() * amount), 0.3, 3).toFixed(2); walk(k.g); });
  };
  walk(c);
  return c;
}

export function estimateCost(g) { return JSON.stringify(g).length; }

// Recipes are named for what they compose, not for anything that lives on Earth.
export const RECIPES = [
  { name: 'arbor', g: { kind: 'arbor', p: {} } },
  { name: 'fascicle', g: { kind: 'fascicle', p: {} } },
  { name: 'lamella', g: { kind: 'lamella', p: {} } },
  { name: 'whorl', g: { kind: 'whorl', p: {} } },
  { name: 'foam', g: { kind: 'foam', p: {} } },
  { name: 'wave', g: { kind: 'wave', p: {} } },
  { name: 'phyllo', g: { kind: 'phyllo', p: {} } },
  { name: 'plexus', g: { kind: 'plexus', p: {} } },
  { name: 'cells', g: { kind: 'cells', p: {} } },
  { name: 'pack', g: { kind: 'pack', p: {} } },
  { name: 'corolla', g: { kind: 'corolla', p: {} } },
  { name: 'unfold', g: { kind: 'unfold', p: {} } },
  { name: 'bell', g: { kind: 'bell', p: {} } },
  // range test: a one-sided series of hanging fused bells, open low and sealed high, over a ground rosette
  { name: 'rosette ▸ axis ▸ bell', g: { kind: 'rosette', p: { count: 16, open: 1.35, close: 0.6, length: 0.34, width: 0.2, grade: 0.35, cup: 0.4, curl: 0.5, point: 1.1, ruffle: 0.02 }, kids: [{ at: 'heart', scale: 4.2, g: { kind: 'axis', p: { nodes: 26, law: 'secund', girth: 0.012, taper: 0.6, flutes: 0, splay: 1.1, zigzag: 0, wander: 0.3, joint: 1.1 }, kids: [
    { at: 'nodes', from: 0.24, to: 1, scale: 0.66, taper: 0.62, up: -0.25, grad: { open: [1.35, -0.25], nod: [0.85, 0.15], flare: [0.8, 0.2] }, g: { kind: 'bell', p: { length: 1, base: 0.04, throat: 0.13, belly: 0.28, bend: 0.25, lobes: 5, fusion: 0.8, lip: 0.7, notch: 0.4, pedicel: 0.16, thick: 0.014, stamens: 4 } } }] } }] } },
  // the same organ with nothing holding it up
  { name: 'thallus ▸ bell', g: { kind: 'thallus', p: { rays: 4, forks: 3, width: 0.18, lift: 0.4 }, kids: [{ at: 'lobes', n: 20, scale: 1.5, grad: { open: [1, 0.2] }, g: { kind: 'bell', p: { pedicel: 0, bend: 0.5, lobes: 5, fusion: 0.7, lip: 0.6, flare: 0.8, belly: 0.5, thick: 0.02 } } }] } },
  { name: 'rosette', g: { kind: 'rosette', p: {} } },
  { name: 'calyx', g: { kind: 'calyx', p: {} } },
  { name: 'thallus', g: { kind: 'thallus', p: {} } },
  { name: 'weave', g: { kind: 'weave', p: {} } },
  // stemless range tests: three scales of structure with no supporting axis anywhere
  { name: 'phyllo ▸ calyx', g: { kind: 'phyllo', p: { shape: 'dome', width: 0.6, count: 44, module: 'none', core: 0.97, lean: 0, grad: 0.25 }, kids: [{ at: 'sites', scale: 0.95, g: { kind: 'calyx', p: { depth: 0.3, flare: 0.5, septa: 10, cycles: 3, exsert: 0.4, thick: 0.02 } } }] } },
  { name: 'thallus ▸ calyx + rosette', g: { kind: 'thallus', p: { rays: 4, forks: 3, length: 0.32, width: 0.18, lift: 0.5, ruffle: 0.04 }, kids: [
    { at: 'face', from: 0, to: 0.7, n: 12, scale: 0.75, g: { kind: 'calyx', p: { depth: 0.5, flare: 0.6, septa: 8, cycles: 2, thick: 0.03, exsert: 0.3 } } },
    { at: 'lobes', n: 16, scale: 0.9, g: { kind: 'rosette', p: { count: 11, open: 1.2, length: 0.6, width: 0.26, curl: 0.8, thick: 0.03 } } }] } },
  { name: 'rosette ▸ rosette', g: { kind: 'rosette', p: { count: 34, open: 1.25, close: 0, length: 0.75, grade: 0.6, width: 0.26, cup: 0.8, curl: 0.3, point: 1.6 }, kids: [{ at: 'leaves', from: 0, to: 0.3, scale: 1.2, g: { kind: 'rosette', p: { count: 13, open: 1.1, length: 0.6, width: 0.3, thick: 0.03 } } }] } },
  { name: 'weave ▸ rosette', g: { kind: 'weave', p: { shape: 'urn', width: 0.4, warp: 24, weft: 16, open: 0.22, splay: 0.5, skew: 0.9 }, kids: [{ at: 'knots', n: 18, scale: 1.3, g: { kind: 'rosette', p: { count: 9, open: 1.3, length: 0.6, width: 0.34, thick: 0.035, curl: 0.9 } } }] } },
  { name: 'rosette ▸ weave', g: { kind: 'rosette', p: { count: 16, open: 1.35, close: 0.5, length: 0.7, grade: 0.2, width: 0.34, cup: 0.3, curl: -0.4 }, kids: [{ at: 'heart', scale: 2.1, g: { kind: 'weave', p: { shape: 'spindle', width: 0.3, warp: 20, weft: 22, open: 0.05, skew: 1.6, thread: 0.012 } } }] } },
  { name: 'axis', g: { kind: 'axis', p: {} } },
  { name: 'sheath', g: { kind: 'sheath', p: {} } },
  { name: 'frond', g: { kind: 'frond', p: {} } },
  { name: 'umbel', g: { kind: 'umbel', p: {} } },
  // the range test: clasping coats low on a jointed axis, thread-fine division above, a two-scale radiate crown
  { name: 'axis ▸ sheath ▸ frond + umbel ▸ umbel', g: { kind: 'axis', p: { nodes: 11, basal: 0.5, law: 'distichous', girth: 0.022, flutes: 12, taper: 0.55, zigzag: 0.1, splay: 0.6 }, kids: [
    { at: 'clasp', from: 0, to: 0.72, scale: 1.25, grad: { radius: [0.15, 0.045], belly: [1.0, 0.1], height: [0.85, 0.45], stalk: [0.35, 1.1], wrap: [1.05, 0.8], lean: [0.12, 0.5] }, g: { kind: 'sheath', p: { veins: 13, vein: 0.5, thick: 0.014, neck: 0.3 }, kids: [{ at: 'tip', scale: 1.15, g: { kind: 'frond', p: { orders: 3, pairs: 6, ratio: 0.46, angle: 0.75, twist: 0.85, thick: 0.015, thin: 0.62, stalk: 0.12, droop: 0.15 } } }] } },
    { at: 'nodes', from: 0.78, to: 0.95, scale: 0.9, g: { kind: 'umbel', p: { rays: 10, spread: 0.6, reach: 0.6, thick: 0.012 }, kids: [{ at: 'rays', g: { kind: 'umbel', p: { rays: 12, bud: 1.4, thick: 0.012 } } }] } },
    { at: 'tip', scale: 1.5, g: { kind: 'umbel', p: { rays: 20, spread: 0.7, crown: 0.1, reach: 0.6, bracts: 0, thick: 0.011 }, kids: [{ at: 'rays', g: { kind: 'umbel', p: { rays: 16, spread: 0.8, bud: 1.4, thick: 0.014 } } }] } },
  ] } },
  { name: 'axis ▸ frond', g: { kind: 'axis', p: { nodes: 16, law: 'whorl', whorl: 5, splay: 1.2, girth: 0.03, flutes: 10, joint: 1.6 }, kids: [{ at: 'nodes', scale: 1.2, taper: 0.7, g: { kind: 'frond', p: { orders: 2, pairs: 5, twist: 0.5, thick: 0.014, ratio: 0.4, blade: 3 } } }] } },
  { name: 'umbel ▸ umbel ▸ lamella', g: { kind: 'umbel', p: { rays: 9, spread: 0.9, crown: 0.6, reach: 0.7, thick: 0.02, curve: 0.6 }, kids: [{ at: 'rays', scale: 1.1, g: { kind: 'umbel', p: { rays: 7, spread: 0.9, crown: 0.5, thick: 0.02 }, kids: [{ at: 'rays', scale: 1.2, g: { kind: 'lamella', p: { height: 0.02, cup: 0.6, flare: 0.5, ruffle: 0.1, lobes: 3, octaves: 2, thick: 0.03 } } }] } }] } },
  { name: 'arbor ▸ lamella', g: { kind: 'arbor', p: { crown: 'dome', spread: 0.6, density: 150, step: 0.06, girth: 0.07, trunk: 0.25 }, kids: [{ at: 'tips', n: 22, scale: 1.5, up: 0.4, g: { kind: 'lamella', p: { height: 0.15, cup: 0.7, flare: 0.5, ruffle: 0.12, lobes: 3, octaves: 2, thick: 0.05 } } }] } },
  { name: 'fascicle ▸ foam', g: { kind: 'fascicle', p: { fibers: 28, splits: 3, spread: 0.8, twist: 6, root: 0.7, fray: 0.15 }, kids: [{ at: 'tips', n: 14, scale: 1.7, g: { kind: 'foam', p: { env: 'ball', width: 0.5, mode: 'cells', cell: 0.3, thick: 0.03 } } }] } },
  { name: 'whorl ▸ arbor', g: { kind: 'whorl', p: { turns: 2.4, expand: 1.7, bore: 0.2, rise: 1.6, ribs: 9, ribAmp: 0.25, thick: 0.03 }, kids: [{ at: 'keel', n: 12, scale: 2, taper: 0.5, g: { kind: 'arbor', p: { crown: 'cone', spread: 0.5, density: 60, step: 0.08, girth: 0.07, trunk: 0.1 } } }] } },
  { name: 'phyllo ▸ whorl', g: { kind: 'phyllo', p: { shape: 'spindle', width: 0.3, count: 54, core: 0.9, lean: 0.5, grad: 0.5 }, kids: [{ at: 'sites', scale: 1.7, g: { kind: 'whorl', p: { turns: 0.9, expand: 3.4, bore: 0.4, rise: 2.2, thick: 0.05 } } }] } },
  { name: 'plexus ▸ lamella', g: { kind: 'plexus', p: { env: 'shell', width: 0.6, nodes: 60, shell: 1, strut: 0.022, sag: 0 }, kids: [{ at: 'nodes', n: 30, scale: 2.4, g: { kind: 'lamella', p: { height: 0.05, cup: 0.5, arc: 0.6, flare: 0.6, ruffle: 0.14, lobes: 3, octaves: 2, thick: 0.05 } } }] } },
  { name: 'lamella ▸ phyllo', g: { kind: 'lamella', p: { flare: 0.6, cup: 0.8, height: 0.2, ruffle: 0.06, lobes: 5, octaves: 2, thick: 0.045 }, kids: [{ at: 'margin', n: 16, scale: 1.6, up: 0.5, g: { kind: 'phyllo', p: { shape: 'cone', width: 0.22, count: 30, module: 'knob', core: 0.9 } } }] } },
  { name: 'phyllo ▸ phyllo', g: { kind: 'phyllo', p: { shape: 'cone', width: 0.4, count: 70, core: 0.9, lean: 0.6, grad: 0.7 }, kids: [{ at: 'sites', scale: 1.5, clone: true, g: { kind: 'phyllo', p: { shape: 'cone', width: 0.4, count: 30, module: 'knob', core: 0.9, size: 1.1 } } }] } },
  { name: 'foam ⊕ sulci', g: { kind: 'foam', p: { env: 'dome', width: 0.6, mode: 'cells', cell: 0.3, thick: 0.035, jitter: 1 }, mods: [{ kind: 'sulci', p: { lambda: 0.2, depth: 0.035, width: 0.3 } }] } },
  { name: 'phyllo ⊕ hollow', g: { kind: 'phyllo', p: { shape: 'urn', width: 0.42, count: 110, module: 'scale', core: 1, size: 1.2, lean: 0.8 }, mods: [{ kind: 'hollow', p: { wall: 0.03, mouth: 0.22 } }] } },
  { name: 'wave ▸ fascicle', g: { kind: 'wave', p: { env: 'column', width: 0.45, lambda: 0.26, mode: 'sheet', level: 0.5, aniso: 0.6 }, kids: [{ at: 'crown', scale: 2.2, g: { kind: 'fascicle', p: { fibers: 20, splits: 2, spread: 1, fiber: 0.02, root: 0.9 } } }] } },
];

export { KINDS, MODS, defaults, fillParams };
