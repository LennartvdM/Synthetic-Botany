// Two ways to look at clay: one specimen on a table, or a hall you stand inside.
import { Grid, BIG, rasterNode, surfaceNets, smin, meshNodes } from './clay.js';
import { expand, breed } from './genome.js';
import { makeRng, makeFrame, makeWave, fbm, hash32, norm, add, sub, mul, dist, clamp, lerp } from './util.js';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function finish(W, nodes, t0, extra, aoReach) {
  const mesh = meshNodes(W, nodes, aoReach);
  return { ...mesh, ...extra, stats: { ms: Math.round(now() - t0), voxels: W.d.length, h: W.h, tris: mesh.idx.length / 3, ...extra.stats } };
}

export function buildSpecimen(job) {
  const t0 = now(), scale = job.scale || 5;
  const ctx = { nodes: [], prims: 0, maxPrims: job.maxPrims || 260000, maxNodes: job.maxNodes || 1500, maxDirect: job.maxDirect || 1300000 };
  expand(job.genome, makeFrame([0, 0, 0], [0, 1, 0], scale), job.seed | 0, ctx);
  const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  for (const n of ctx.nodes) for (let a = 0; a < 3; a++) { b[a] = Math.min(b[a], n.bounds[a]); b[a + 3] = Math.max(b[a + 3], n.bounds[a + 3]); }
  if (b[0] > b[3]) { b[0] = b[1] = b[2] = -1; b[3] = b[4] = b[5] = 1; }
  const ext = Math.max(b[3] - b[0], b[4] - b[1], b[5] - b[2]);
  let h = ext / (job.res || 96);
  const pad = 4 * h;
  let nx = Math.ceil((b[3] - b[0] + 2 * pad) / h) + 1, ny = Math.ceil((b[4] - b[1] + 2 * pad) / h) + 1, nz = Math.ceil((b[5] - b[2] + 2 * pad) / h) + 1;
  const W = new Grid(b[0] - pad, b[1] - pad, b[2] - pad, h, nx, ny, nz, BIG);
  return finish(W, ctx.nodes, t0, { bounds: b, stats: { nodes: ctx.nodes.length, prims: Math.round(ctx.prims), truncated: !!ctx.truncated, crossing: ctx.info || null } }, scale * 0.14);
}

// ------------------------------------------------------------------ cavern
// The void has a skeleton too. 'halls' is a loop network of floored chambers,
// 'sponge' is one wave surface at architectural scale, 'geode' is a single vault.
function makeVoid(kind, size, R) {
  const [X, Y, Z] = size, ns = R.int(0, 9999);
  const rough = (x, y, z) => 1.1 * fbm(x / 9, y / 9, z / 9, ns, 3) + 0.4 * fbm(x / 2.6, y / 2.6, z / 2.6, ns + 40, 2);
  const edge = (x, y, z) => Math.max(Math.abs(x) - X / 2, Math.abs(y - Y / 2) - Y / 2, Math.abs(z) - Z / 2) + 3.5;
  if (kind === 'sponge') {
    const wv = makeWave(R, 14, 0.25), L = 19, k = L / (Math.PI * 2);
    const smooth = (x, y, z) => Math.max((wv(x / L, y / (L * 0.8), z / L) + 0.05) * k * 0.9, edge(x, y, z));
    return { smooth, full: (x, y, z) => smooth(x, y, z) + 0.6 * rough(x, y, z), amp: 1.0, rooms: [] };
  }
  const rooms = [];
  const want = kind === 'geode' ? 1 : R.int(5, 7);
  for (let i = 0; i < want; i++) {
    let best = null, bd = -1;
    for (let c = 0; c < 12; c++) {
      const q = kind === 'geode' ? [0, Y * 0.5, 0] : [R.range(-X / 2 + 12, X / 2 - 12), R.range(Y * 0.34, Y * 0.62), R.range(-Z / 2 + 12, Z / 2 - 12)];
      let m = 1e9;
      for (const o of rooms) m = Math.min(m, dist(o.c, q));
      if (m > bd) { bd = m; best = q; }
    }
    const big = kind === 'geode' ? 1.9 : 1;
    const r = [R.range(7, 11) * big, Math.min(R.range(5.5, 8.5) * (kind === 'geode' ? 1.5 : 1), best[1] - 2.5, Y - best[1] - 2.5), R.range(7, 11) * big];
    rooms.push({ c: best, r, floor: best[1] - r[1] * R.range(0.35, 0.6) });
  }
  const tunnels = [];
  for (let i = 0; i < rooms.length; i++) for (let j = i + 1; j < rooms.length; j++) {
    const a = rooms[i].c, b = rooms[j].c, m = mul(add(a, b), 0.5), r2 = (dist(a, b) / 2) ** 2;
    if (rooms.some((o, k) => k !== i && k !== j && dist(o.c, m) ** 2 < r2)) continue;
    const pa = [a[0], rooms[i].floor + 2.2, a[2]], pb = [b[0], rooms[j].floor + 2.2, b[2]];
    const mid = add(mul(add(pa, pb), 0.5), [R.range(-4, 4), R.range(-1.5, 2.5), R.range(-4, 4)]);
    const rad = R.range(1.7, 2.8);
    tunnels.push([pa, mid, rad], [mid, pb, rad]);
  }
  const seg = (x, y, z, a, b, r) => {
    const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], px = x - a[0], py = y - a[1], pz = z - a[2];
    const t = clamp((px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz), 0, 1);
    return Math.hypot(px - bx * t, py - by * t, pz - bz * t) - r;
  };
  const smooth = (x, y, z) => {
    let d = 1e9;
    for (const o of rooms) {
      const qx = (x - o.c[0]) / o.r[0], qy = (y - o.c[1]) / o.r[1], qz = (z - o.c[2]) / o.r[2];
      const e = (Math.hypot(qx, qy, qz) - 1) * Math.min(o.r[0], o.r[1], o.r[2]);
      d = smin(d, Math.max(e, o.floor - y), 2.5);
    }
    for (const t of tunnels) d = smin(d, seg(x, y, z, t[0], t[1], t[2]), 2);
    return Math.max(d, edge(x, y, z));
  };
  // floors stay comparatively calm so a body has somewhere to stand; walls and vaults do not
  // strata: the walls step in and out with height, leaving ledges a body can use
  const period = R.range(2.6, 4.2);
  const strata = (x, y, z) => { const t = y / period + 0.35 * fbm(x / 14, y / 14, z / 14, ns + 90, 2); return Math.abs((t - Math.floor(t)) * 2 - 1) - 0.5; };
  const full = (x, y, z) => smooth(x, y, z) + rough(x, y, z) * 0.85 + strata(x, y, z) * 0.9;
  return { smooth, full, amp: 2.1, rooms };
}

export function buildCavern(job, progress = () => {}) {
  const t0 = now(), R = makeRng(job.seed | 0);
  const size = job.size || [72, 34, 72], h = job.h || 0.3;
  const [X, Y, Z] = size;
  const nx = Math.ceil(X / h) + 1, ny = Math.ceil(Y / h) + 1, nz = Math.ceil(Z / h) + 1;
  const W = new Grid(-X / 2, 0, -Z / 2, h, nx, ny, nz, -BIG);
  const V = makeVoid(job.kind || 'halls', size, R);
  progress('carving the void');
  // coarse blocks decide where the wall can possibly be; only those are evaluated per voxel
  const S = 4, skip = V.amp + S * h * 0.87 + 0.3, d = W.d;
  for (let k = 0; k < nz; k += S) for (let j = 0; j < ny; j += S) for (let i = 0; i < nx; i += S) {
    const c = V.smooth(W.ox + (i + S / 2) * h, W.oy + (j + S / 2) * h, W.oz + (k + S / 2) * h);
    if (c > skip) continue;
    const far = c < -skip;
    for (let kk = k; kk < Math.min(nz, k + S); kk++) for (let jj = j; jj < Math.min(ny, j + S); jj++) {
      let idx = i + nx * (jj + ny * kk);
      for (let ii = i; ii < Math.min(nx, i + S); ii++, idx++) d[idx] = far ? BIG : -V.full(W.ox + ii * h, W.oy + jj * h, W.oz + kk * h);
    }
  }
  // colonise the walls
  progress('finding places to grow');
  const species = (job.species && job.species.length ? job.species : null) || Array.from({ length: job.nSpecies || 5 }, (_, i) => breed(makeRng(hash32(job.seed, 900 + i)), 0, null, { stemless: !!job.stemless, formula: !!job.formula }));
  const grad = (p) => {
    const e = 0.25, f = V.full;
    return norm([f(p[0] + e, p[1], p[2]) - f(p[0] - e, p[1], p[2]), f(p[0], p[1] + e, p[2]) - f(p[0], p[1] - e, p[2]), f(p[0], p[1], p[2] + e) - f(p[0], p[1], p[2] - e)]);
  };
  const placed = [], ctx = { nodes: [], prims: 0, maxPrims: 900000, maxNodes: 6000 };
  const want = job.count ?? 34;
  for (let tries = 0; tries < want * 60 && placed.length < want; tries++) {
    let p = [R.range(-X / 2, X / 2), R.range(0, Y), R.range(-Z / 2, Z / 2)];
    let v = V.full(p[0], p[1], p[2]);
    if (v > 0 || v < -6) continue;
    for (let it = 0; it < 5; it++) { p = sub(p, mul(grad(p), V.full(p[0], p[1], p[2]))); }
    if (Math.abs(V.full(p[0], p[1], p[2])) > 0.3) continue;
    const n = mul(grad(p), -1);
    let clear = 30;
    for (let t = 1.5; t < 30; t += 0.75) if (V.full(p[0] + n[0] * t, p[1] + n[1] * t, p[2] + n[2] * t) > -0.4) { clear = t; break; }
    if (clear < 5) continue;
    const sp = placed.length < species.length ? placed.length : R.int(0, species.length - 1);
    const s = clamp(clear * R.range(0.45, 0.8), 4, 20);
    if (placed.some((q) => dist(q.p, p) < 0.4 * (q.s + s))) continue;
    // floors grow up, ceilings hang, walls reach out and then turn toward open space
    const y = norm(add(n, [0, n[1] > 0.5 ? 0.8 : n[1] < -0.5 ? -0.5 : 0.35, 0]));
    placed.push({ p, s, sp });
    // every organism gets its own budget, so one heavy species cannot starve the rest
    const one = { nodes: [], prims: 0, maxPrims: 70000, maxNodes: 320, maxDirect: 160000 };
    expand(species[sp], makeFrame(sub(p, mul(y, 0.05 * s)), y, s, R.range(0, 6.28)), hash32(job.seed, 5000 + placed.length), one);
    placed[placed.length - 1].nodes = one.nodes;
    ctx.prims += one.prims; ctx.count = (ctx.count || 0) + one.nodes.length; if (one.truncated) ctx.truncated = true;
  }
  progress(`shaping ${placed.length} organisms`);
  // somewhere to stand: floor points in the rooms, or any upward-facing surface
  const stands = [];
  for (let tries = 0; tries < 4000 && stands.length < 6; tries++) {
    const room = V.rooms.length ? V.rooms[stands.length % V.rooms.length] : null;
    let p = room ? [room.c[0] + R.range(-4, 4), room.floor + 2, room.c[2] + R.range(-4, 4)] : [R.range(-X / 3, X / 3), R.range(4, Y - 4), R.range(-Z / 3, Z / 3)];
    if (V.full(p[0], p[1], p[2]) > -1) continue;
    let ok = false;
    for (let s = 0; s < 80; s++) { p[1] -= 0.25; if (V.full(p[0], p[1], p[2]) > -0.05) { ok = true; break; } }
    if (!ok || placed.some((q) => dist(q.p, p) < 0.6 * q.s)) continue;
    if (V.full(p[0], p[1] + 3, p[2]) > -1) continue;
    stands.push(p);
  }
  // for each standing place, the direction with the longest open sightline
  const views = stands.map((p) => {
    let best = { eye: [p[0], p[1] + 2, p[2]], look: [0, Y / 2, 0], open: 0, at: p };
    for (let a = 0; a < 16; a++) {
      const dx = Math.cos((a * Math.PI) / 8), dz = Math.sin((a * Math.PI) / 8);
      const eye = [p[0] - dx * 5.5, p[1] + 2.5, p[2] - dz * 5.5];
      if (V.full(eye[0], eye[1], eye[2]) > -0.7 || placed.some((q) => dist(q.p, eye) < 0.55 * q.s)) continue;
      let c = 0;
      for (let t = 1; t < 48; t++) { if (V.full(p[0] + dx * t, p[1] + 1.9 + t * 0.08, p[2] + dz * t) > -0.3) break; c = t; }
      if (c > best.open) best = { eye, look: [p[0] + dx * 9, p[1] + 3.4, p[2] + dz * 9], open: c, at: p };
    }
    return best;
  }).sort((a, b) => b.open - a.open);
  // The void is meshed on the coarse world grid. Each organism is meshed on its own finer grid,
  // sized to it, so structure survives no matter how large the hall is.
  const parts = [surfaceNets(W, 3.2)];
  placed.forEach((o, i) => {
    if (i % 6 === 0) progress(`shaping organism ${i + 1} of ${placed.length}`);
    const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (const n of o.nodes) for (let a = 0; a < 3; a++) { b[a] = Math.min(b[a], n.bounds[a]); b[a + 3] = Math.max(b[a + 3], n.bounds[a + 3]); }
    if (b[0] > b[3]) return;
    let ho = clamp(o.s / (job.organismRes || 54), 0.07, 0.3);
    const vol = (b[3] - b[0] + 8 * ho) * (b[4] - b[1] + 8 * ho) * (b[5] - b[2] + 8 * ho);
    if (vol / ho ** 3 > 5e6) ho = Math.cbrt(vol / 5e6);
    const G = new Grid(b[0] - 4 * ho, b[1] - 4 * ho, b[2] - 4 * ho, ho, Math.ceil((b[3] - b[0]) / ho) + 9, Math.ceil((b[4] - b[1]) / ho) + 9, Math.ceil((b[5] - b[2]) / ho) + 9, BIG);
    parts.push(meshNodes(G, o.nodes, o.s * 0.14));
    o.nodes = null;
  });
  let nv = 0, ni = 0;
  for (const m of parts) { nv += m.ao.length; ni += m.idx.length; }
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), ao = new Float32Array(nv), idx = new Uint32Array(ni);
  let v0 = 0, i0 = 0;
  for (const m of parts) {
    pos.set(m.pos, v0 * 3); nrm.set(m.nrm, v0 * 3); ao.set(m.ao, v0);
    for (let q = 0; q < m.idx.length; q++) idx[i0 + q] = m.idx[q] + v0;
    v0 += m.ao.length; i0 += m.idx.length;
  }
  return {
    pos, nrm, ao, idx, wallVerts: parts[0].ao.length, bounds: [-X / 2, 0, -Z / 2, X / 2, Y, Z / 2], stands, views, species,
    stats: { ms: Math.round(now() - t0), voxels: W.d.length, h, tris: ni / 3, nodes: ctx.count || 0, prims: Math.round(ctx.prims), organisms: placed.length, truncated: !!ctx.truncated },
  };
}

export function build(job, progress) {
  return job.mode === 'cavern' ? buildCavern(job, progress) : buildSpecimen(job);
}
