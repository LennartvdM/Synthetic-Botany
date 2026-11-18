// The clay: a signed distance field on a regular grid.
// Skeletons emit primitives (round cones, thick triangles, analytic fields);
// each node is rasterised into its own aligned layer, modified, then merged into the world.
export const BIG = 1e6;

export function smin(a, b, k) {
  const m = a < b ? a : b;
  if (k <= 0) return m;
  const h = k - Math.abs(a - b);
  return h <= 0 ? m : m - (h * h * 0.25) / k;
}

export class Grid {
  constructor(ox, oy, oz, h, nx, ny, nz, fill = BIG) {
    this.ox = ox; this.oy = oy; this.oz = oz; this.h = h;
    this.nx = nx; this.ny = ny; this.nz = nz;
    this.d = new Float32Array(nx * ny * nz);
    if (fill !== 0) this.d.fill(fill);
  }
}

export function splatCaps(L, caps, minR) {
  const { ox, oy, oz, h, nx, ny, nz, d } = L;
  for (let c = 0; c < caps.length; c += 9) {
    const ax = caps[c], ay = caps[c + 1], az = caps[c + 2];
    const bx = caps[c + 3] - ax, by = caps[c + 4] - ay, bz = caps[c + 5] - az;
    const ra = Math.max(caps[c + 6], minR), rb = Math.max(caps[c + 7], minR), bl = caps[c + 8];
    const m = Math.max(ra, rb) + Math.max(bl, 2.5 * h);
    const i0 = Math.max(0, Math.floor((Math.min(ax, ax + bx) - m - ox) / h)), i1 = Math.min(nx - 1, Math.ceil((Math.max(ax, ax + bx) + m - ox) / h));
    const j0 = Math.max(0, Math.floor((Math.min(ay, ay + by) - m - oy) / h)), j1 = Math.min(ny - 1, Math.ceil((Math.max(ay, ay + by) + m - oy) / h));
    const k0 = Math.max(0, Math.floor((Math.min(az, az + bz) - m - oz) / h)), k1 = Math.min(nz - 1, Math.ceil((Math.max(az, az + bz) + m - oz) / h));
    const bb = bx * bx + by * by + bz * bz, ib = bb > 1e-14 ? 1 / bb : 0, dr = rb - ra;
    const lim = m - Math.max(ra, rb);
    for (let k = k0; k <= k1; k++) {
      const pz = oz + k * h - az;
      for (let j = j0; j <= j1; j++) {
        const py = oy + j * h - ay;
        let idx = i0 + nx * (j + ny * k);
        for (let i = i0; i <= i1; i++, idx++) {
          const px = ox + i * h - ax;
          let t = (px * bx + py * by + pz * bz) * ib;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const qx = px - bx * t, qy = py - by * t, qz = pz - bz * t;
          const dist = Math.sqrt(qx * qx + qy * qy + qz * qz) - (ra + dr * t);
          if (dist < lim) {
            const cur = d[idx];
            d[idx] = cur >= BIG ? dist : smin(cur, dist, bl);
          }
        }
      }
    }
  }
}

export function splatTris(L, tris, minT) {
  const { ox, oy, oz, h, nx, ny, nz, d } = L;
  for (let c = 0; c < tris.length; c += 11) {
    const ax = tris[c], ay = tris[c + 1], az = tris[c + 2];
    const abx = tris[c + 3] - ax, aby = tris[c + 4] - ay, abz = tris[c + 5] - az;
    const acx = tris[c + 6] - ax, acy = tris[c + 7] - ay, acz = tris[c + 8] - az;
    const ht = Math.max(tris[c + 9], minT) * 0.5, bl = tris[c + 10];
    const lim = Math.max(bl, 2.5 * h), m = ht + lim;
    const mnx = ax + Math.min(0, abx, acx), mxx = ax + Math.max(0, abx, acx);
    const mny = ay + Math.min(0, aby, acy), mxy = ay + Math.max(0, aby, acy);
    const mnz = az + Math.min(0, abz, acz), mxz = az + Math.max(0, abz, acz);
    const i0 = Math.max(0, Math.floor((mnx - m - ox) / h)), i1 = Math.min(nx - 1, Math.ceil((mxx + m - ox) / h));
    const j0 = Math.max(0, Math.floor((mny - m - oy) / h)), j1 = Math.min(ny - 1, Math.ceil((mxy + m - oy) / h));
    const k0 = Math.max(0, Math.floor((mnz - m - oz) / h)), k1 = Math.min(nz - 1, Math.ceil((mxz + m - oz) / h));
    const bcx = acx - abx, bcy = acy - aby, bcz = acz - abz;
    for (let k = k0; k <= k1; k++) {
      const pz = oz + k * h - az;
      for (let j = j0; j <= j1; j++) {
        const py = oy + j * h - ay;
        let idx = i0 + nx * (j + ny * k);
        for (let i = i0; i <= i1; i++, idx++) {
          const px = ox + i * h - ax;
          // closest point on triangle (Ericson), p relative to a
          let cx, cy, cz;
          const d1 = abx * px + aby * py + abz * pz, d2 = acx * px + acy * py + acz * pz;
          if (d1 <= 0 && d2 <= 0) { cx = 0; cy = 0; cz = 0; }
          else {
            const bpx = px - abx, bpy = py - aby, bpz = pz - abz;
            const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
            if (d3 >= 0 && d4 <= d3) { cx = abx; cy = aby; cz = abz; }
            else {
              const vc = d1 * d4 - d3 * d2;
              if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); cx = abx * v; cy = aby * v; cz = abz * v; }
              else {
                const cpx = px - acx, cpy = py - acy, cpz = pz - acz;
                const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
                if (d6 >= 0 && d5 <= d6) { cx = acx; cy = acy; cz = acz; }
                else {
                  const vb = d5 * d2 - d1 * d6;
                  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); cx = acx * w; cy = acy * w; cz = acz * w; }
                  else {
                    const va = d3 * d6 - d5 * d4;
                    if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
                      const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
                      cx = abx + bcx * w; cy = aby + bcy * w; cz = abz + bcz * w;
                    } else {
                      const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
                      cx = abx * v + acx * w; cy = aby * v + acy * w; cz = abz * v + acz * w;
                    }
                  }
                }
              }
            }
          }
          const qx = px - cx, qy = py - cy, qz = pz - cz;
          const dist = Math.sqrt(qx * qx + qy * qy + qz * qz) - ht;
          if (dist < lim) {
            const cur = d[idx];
            d[idx] = cur >= BIG ? dist : smin(cur, dist, bl);
          }
        }
      }
    }
  }
}

// bounds of a node's primitives in world space
export function nodeBounds(node) {
  const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  const grow = (x, y, z, r) => {
    if (x - r < b[0]) b[0] = x - r; if (y - r < b[1]) b[1] = y - r; if (z - r < b[2]) b[2] = z - r;
    if (x + r > b[3]) b[3] = x + r; if (y + r > b[4]) b[4] = y + r; if (z + r > b[5]) b[5] = z + r;
  };
  const c = node.caps, t = node.tris;
  for (let i = 0; i < c.length; i += 9) { const r = Math.max(c[i + 6], c[i + 7]); grow(c[i], c[i + 1], c[i + 2], r); grow(c[i + 3], c[i + 4], c[i + 5], r); }
  for (let i = 0; i < t.length; i += 11) { const r = t[i + 9] * 0.5; grow(t[i], t[i + 1], t[i + 2], r); grow(t[i + 3], t[i + 4], t[i + 5], r); grow(t[i + 6], t[i + 7], t[i + 8], r); }
  for (const f of node.fields) { grow(f.wmin[0], f.wmin[1], f.wmin[2], 0); grow(f.wmax[0], f.wmax[1], f.wmax[2], 0); }
  // drawn geometry is bounded through its occlusion proxies
  const pc = node.pcaps || [], pt = node.ptris || [];
  for (let i = 0; i < pc.length; i += 9) { const r = Math.max(pc[i + 6], pc[i + 7]); grow(pc[i], pc[i + 1], pc[i + 2], r); grow(pc[i + 3], pc[i + 4], pc[i + 5], r); }
  for (let i = 0; i < pt.length; i += 11) { const r = pt[i + 9] * 0.5; grow(pt[i], pt[i + 1], pt[i + 2], r); grow(pt[i + 3], pt[i + 4], pt[i + 5], r); grow(pt[i + 6], pt[i + 7], pt[i + 8], r); }
  return b;
}

// Rasterise one node into a layer aligned with the world grid, apply its modifiers, merge.
export function rasterNode(W, node, mods) {
  const h = W.h, F = node.frame;
  const b = node.bounds || nodeBounds(node);
  if (b[0] > b[3]) return;
  const pad = 3 * h + (node.pad || 0);
  const i0 = Math.max(0, Math.floor((b[0] - pad - W.ox) / h)), i1 = Math.min(W.nx - 1, Math.ceil((b[3] + pad - W.ox) / h));
  const j0 = Math.max(0, Math.floor((b[1] - pad - W.oy) / h)), j1 = Math.min(W.ny - 1, Math.ceil((b[4] + pad - W.oy) / h));
  const k0 = Math.max(0, Math.floor((b[2] - pad - W.oz) / h)), k1 = Math.min(W.nz - 1, Math.ceil((b[5] + pad - W.oz) / h));
  if (i1 < i0 || j1 < j0 || k1 < k0) return;
  const nx = i1 - i0 + 1, ny = j1 - j0 + 1, nz = k1 - k0 + 1;
  const L = new Grid(W.ox + i0 * h, W.oy + j0 * h, W.oz + k0 * h, h, nx, ny, nz, BIG);
  const d = L.d;
  if (node.caps.length) splatCaps(L, node.caps, 0.8 * h);
  if (node.tris.length) splatTris(L, node.tris, 1.8 * h);
  const s = F.s, is = 1 / s, o = F.o, X = F.x, Y = F.y, Z = F.z;
  for (const f of node.fields) {
    const a0 = Math.max(0, Math.floor((f.wmin[0] - L.ox) / h)), a1 = Math.min(nx - 1, Math.ceil((f.wmax[0] - L.ox) / h));
    const b0 = Math.max(0, Math.floor((f.wmin[1] - L.oy) / h)), b1 = Math.min(ny - 1, Math.ceil((f.wmax[1] - L.oy) / h));
    const c0 = Math.max(0, Math.floor((f.wmin[2] - L.oz) / h)), c1 = Math.min(nz - 1, Math.ceil((f.wmax[2] - L.oz) / h));
    const lim = Math.max(f.bl, 3 * h);
    for (let k = c0; k <= c1; k++) for (let j = b0; j <= b1; j++) {
      let idx = a0 + nx * (j + ny * k);
      const wy = L.oy + j * h - o[1], wz = L.oz + k * h - o[2];
      for (let i = a0; i <= a1; i++, idx++) {
        const wx = L.ox + i * h - o[0];
        const v = f.fn((wx * X[0] + wy * X[1] + wz * X[2]) * is, (wx * Y[0] + wy * Y[1] + wz * Y[2]) * is, (wx * Z[0] + wy * Z[1] + wz * Z[2]) * is, h * is) * s;
        if (v < lim) { const cur = d[idx]; d[idx] = cur >= BIG ? v : smin(cur, v, f.bl); }
      }
    }
  }
  if (mods && mods.length) {
    for (const m of mods) {
      const band = m.band * s + 2 * h, deep = m.deep ? -BIG : -(m.band * s + 3 * h);
      let idx = 0;
      for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) {
        const wy = L.oy + j * h - o[1], wz = L.oz + k * h - o[2];
        for (let i = 0; i < nx; i++, idx++) {
          const v = d[idx];
          if (v > band || v < deep) continue;
          const wx = L.ox + i * h - o[0];
          d[idx] = m.fn(v * is, (wx * X[0] + wy * X[1] + wz * X[2]) * is, (wx * Y[0] + wy * Y[1] + wz * Y[2]) * is, (wx * Z[0] + wy * Z[1] + wz * Z[2]) * is) * s;
        }
      }
    }
  }
  const wd = W.d, bw = 0.6 * h;
  let idx = 0;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) {
    let w = i0 + W.nx * (j + j0 + W.ny * (k + k0));
    for (let i = 0; i < nx; i++, idx++, w++) {
      const v = d[idx];
      if (v < BIG) { const cur = wd[w]; wd[w] = cur >= BIG ? v : smin(cur, v, bw); }
    }
  }
}

class Buf {
  constructor(T, n) { this.T = T; this.a = new T(n); this.n = 0; }
  need(k) {
    if (this.n + k > this.a.length) { const b = new this.T(Math.max(this.a.length * 2, this.n + k)); b.set(this.a); this.a = b; }
  }
  done() { return this.a.slice(0, this.n); }
}

const EA = [0, 2, 4, 6, 0, 1, 4, 5, 0, 1, 2, 3], EB = [1, 3, 5, 7, 2, 3, 6, 7, 4, 5, 6, 7];

// Surface nets: one vertex per surface cell, quads across sign-changing edges.
export function surfaceNets(G, aoReach = 0) {
  const { nx, ny, nz, d, h, ox, oy, oz } = G;
  const nxy = nx * ny, cl = 3 * h;
  const P = new Buf(Float32Array, 1 << 16), I = new Buf(Uint32Array, 1 << 17);
  let prev = new Int32Array(nxy), cur = new Int32Array(nxy), nv = 0;
  const v = new Float64Array(8);
  const quad = (a, b, c, e, keep) => {
    I.need(6);
    const A = I.a; let n = I.n;
    if (keep) { A[n++] = a; A[n++] = b; A[n++] = c; A[n++] = a; A[n++] = c; A[n++] = e; }
    else { A[n++] = a; A[n++] = c; A[n++] = b; A[n++] = a; A[n++] = e; A[n++] = c; }
    I.n = n;
  };
  for (let k = 0; k < nz - 1; k++) {
    cur.fill(-1);
    for (let j = 0; j < ny - 1; j++) {
      let b = nx * (j + ny * k);
      for (let i = 0; i < nx - 1; i++, b++) {
        const v0 = d[b], s0 = v0 < 0;
        // quick reject on the three leading edges and the far corner
        v[0] = v0; v[1] = d[b + 1]; v[2] = d[b + nx]; v[3] = d[b + nx + 1];
        v[4] = d[b + nxy]; v[5] = d[b + nxy + 1]; v[6] = d[b + nxy + nx]; v[7] = d[b + nxy + nx + 1];
        let mask = 0;
        for (let c = 0; c < 8; c++) if (v[c] < 0) mask |= 1 << c;
        if (mask === 0 || mask === 255) continue;
        let sx = 0, sy = 0, sz = 0, n = 0;
        for (let e = 0; e < 12; e++) {
          const a = EA[e], bb = EB[e];
          if (((mask >> a) & 1) === ((mask >> bb) & 1)) continue;
          let va = v[a], vb = v[bb];
          va = va < -cl ? -cl : va > cl ? cl : va; vb = vb < -cl ? -cl : vb > cl ? cl : vb;
          const t = va / (va - vb);
          const dx = (bb & 1) - (a & 1), dy = ((bb >> 1) & 1) - ((a >> 1) & 1), dz = ((bb >> 2) & 1) - ((a >> 2) & 1);
          sx += (a & 1) + dx * t; sy += ((a >> 1) & 1) + dy * t; sz += ((a >> 2) & 1) + dz * t; n++;
        }
        P.need(3);
        P.a[P.n++] = ox + (i + sx / n) * h; P.a[P.n++] = oy + (j + sy / n) * h; P.a[P.n++] = oz + (k + sz / n) * h;
        const me = nv++;
        cur[i + nx * j] = me;
        if (v[1] < 0 !== s0 && j > 0 && k > 0) quad(me, cur[i + nx * (j - 1)], prev[i + nx * (j - 1)], prev[i + nx * j], s0);
        if (v[2] < 0 !== s0 && i > 0 && k > 0) quad(me, prev[i + nx * j], prev[i - 1 + nx * j], cur[i - 1 + nx * j], s0);
        if (v[4] < 0 !== s0 && i > 0 && j > 0) quad(me, cur[i - 1 + nx * j], cur[i - 1 + nx * (j - 1)], cur[i + nx * (j - 1)], s0);
      }
    }
    const t = prev; prev = cur; cur = t;
  }
  const pos = P.done(), idx = I.done();
  const nrm = meshNormals(pos, idx);
  const ao = aoReach < 0 ? null : bakeAO(G, pos, nrm, aoReach || 10 * h);
  return { pos, nrm, ao, idx };
}

export function meshNormals(pos, idx) {
  const nrm = new Float32Array(pos.length);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const wx = pos[c] - pos[a], wy = pos[c + 1] - pos[a + 1], wz = pos[c + 2] - pos[a + 2];
    const fx = uy * wz - uz * wy, fy = uz * wx - ux * wz, fz = ux * wy - uy * wx;
    nrm[a] += fx; nrm[a + 1] += fy; nrm[a + 2] += fz;
    nrm[b] += fx; nrm[b + 1] += fy; nrm[b + 2] += fz;
    nrm[c] += fx; nrm[c + 1] += fy; nrm[c + 2] += fz;
  }
  for (let i = 0; i < nrm.length; i += 3) {
    const l = Math.hypot(nrm[i], nrm[i + 1], nrm[i + 2]) || 1;
    nrm[i] /= l; nrm[i + 1] /= l; nrm[i + 2] /= l;
  }
  return nrm;
}

// Ambient occlusion read straight from a distance field: how quickly does open space appear along the normal?
export function bakeAO(G, pos, nrm, reach) {
  const { nx, ny, nz, d, h, ox, oy, oz } = G, nxy = nx * ny, nv = pos.length / 3;
  const ao = new Float32Array(nv), steps = [reach * 0.12, reach * 0.3, reach * 0.6, reach];
  const sample = (x, y, z) => {
    let gx = (x - ox) / h, gy = (y - oy) / h, gz = (z - oz) / h;
    if (gx < 0 || gy < 0 || gz < 0 || gx >= nx - 1 || gy >= ny - 1 || gz >= nz - 1) return BIG;
    const i = gx | 0, j = gy | 0, k = gz | 0; gx -= i; gy -= j; gz -= k;
    const b = i + nx * (j + ny * k);
    const a0 = d[b] + (d[b + 1] - d[b]) * gx, a1 = d[b + nx] + (d[b + nx + 1] - d[b + nx]) * gx;
    const a2 = d[b + nxy] + (d[b + nxy + 1] - d[b + nxy]) * gx, a3 = d[b + nxy + nx] + (d[b + nxy + nx + 1] - d[b + nxy + nx]) * gx;
    const lo = a0 + (a1 - a0) * gy, hi = a2 + (a3 - a2) * gy;
    return lo + (hi - lo) * gz;
  };
  for (let i = 0; i < nv; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    const ax = nrm[i * 3], ay = nrm[i * 3 + 1], az = nrm[i * 3 + 2];
    let occ = 0;
    for (let s = 0; s < 4; s++) {
      const t = steps[s];
      let q = sample(x + ax * t, y + ay * t, z + az * t) / t;
      q = q < 0 ? 0 : q > 1 ? 1 : q;
      occ += 1 - q;
    }
    ao[i] = 1 - occ * 0.22;
  }
  return ao;
}

// Clay and drawn geometry together: voxel clay is meshed with surface nets, drawn tubes and sheets
// are appended exactly as built, and both are shaded from one occlusion field.
export function meshNodes(G, nodes, reach) {
  for (const n of nodes) rasterNode(G, n, n.mods);
  const clay = surfaceNets(G, -1);
  let dv = 0, di = 0;
  for (const n of nodes) if (n.mesh) { dv += n.mesh.pos.length; di += n.mesh.idx.length; }
  if (!dv) return { pos: clay.pos, nrm: clay.nrm, idx: clay.idx, ao: bakeAO(G, clay.pos, clay.nrm, reach), clayVerts: clay.pos.length / 3 };
  const pos = new Float32Array(clay.pos.length + dv), idx = new Uint32Array(clay.idx.length + di);
  pos.set(clay.pos); idx.set(clay.idx);
  let v0 = clay.pos.length, i0 = clay.idx.length;
  for (const n of nodes) if (n.mesh) {
    const mp = n.mesh.pos, mi = n.mesh.idx, base = v0 / 3;
    for (let q = 0; q < mp.length; q++) pos[v0 + q] = mp[q];
    for (let q = 0; q < mi.length; q++) idx[i0 + q] = mi[q] + base;
    v0 += mp.length; i0 += mi.length;
  }
  const dn = meshNormals(pos.subarray(clay.pos.length), idx.subarray(clay.idx.length).map((q) => q - clay.pos.length / 3));
  const nrm = new Float32Array(pos.length); nrm.set(clay.nrm); nrm.set(dn, clay.pos.length);
  // occlusion field = the clay plus fattened stand-ins for everything drawn
  const O = new Grid(G.ox, G.oy, G.oz, G.h, G.nx, G.ny, G.nz, 0); O.d.set(G.d);
  for (const n of nodes) { if (n.pcaps && n.pcaps.length) splatCaps(O, n.pcaps, 0.8 * G.h); if (n.ptris && n.ptris.length) splatTris(O, n.ptris, 1.8 * G.h); }
  const ao = bakeAO(O, pos, nrm, reach);
  // drawn parts sit inside their own fattened stand-ins, so their occlusion reads too strong; ease it
  for (let i = clay.pos.length / 3; i < ao.length; i++) ao[i] = 1 - (1 - ao[i]) * 0.5;
  return { pos, nrm, idx, ao, clayVerts: clay.pos.length / 3 };
}
