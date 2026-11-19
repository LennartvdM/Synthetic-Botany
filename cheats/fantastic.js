// Sculpted reference shapes, second set: thick, solid, invented forms. NOT grown.
// Each is a distance function put together by hand from a few bold parts (cores, thick plates,
// limbs, rings of spheres), then meshed. They exist to be studied. The growth kernel must not use them.
(function (root) {
  'use strict';
  const PI = Math.PI, TAU = 2 * PI, GA = PI * (3 - Math.sqrt(5)), H = Math.hypot;
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  const smax = (a, b, k) => -smin(-a, -b, k);
  const ball = (x, y, z, cx, cy, cz, r) => H(x - cx, y - cy, z - cz) - r;
  const egg = (x, y, z, cx, cy, cz, rx, ry, rz) => (H((x - cx) / rx, (y - cy) / ry, (z - cz) / rz) - 1) * Math.min(rx, ry, rz);
  function cone(x, y, z, ax, ay, az, bx, by, bz, ra, rb) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, px = x - ax, py = y - ay, pz = z - az, t = clamp((px * dx + py * dy + pz * dz) / (dx * dx + dy * dy + dz * dz), 0, 1);
    return H(px - dx * t, py - dy * t, pz - dz * t) - (ra + (rb - ra) * t);
  }
  // a limb lying in the plane z = 0, through [distance from axis, height, radius] points
  const limb = (x, y, z, pts) => { let d = 1e9; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; d = smin(d, cone(x, y, z, a[0], a[1], 0, b[0], b[1], 0, a[2], b[2]), 0.02); } return d; };
  // turn a point so the nearest of n copies round the axis sits at angle 0
  const fold = (x, z, n, ph = 0) => { const s = TAU / n; let a = Math.atan2(z, x) - ph; a -= Math.round(a / s) * s; const r = H(x, z); return [r * Math.cos(a), r * Math.sin(a)]; };
  // a thick piece of spherical shell: centre, radius R, half-thickness t, covering angle al round direction d
  function plate(x, y, z, cx, cy, cz, R, t, dx, dy, dz, al, k = 0.05) {
    const px = x - cx, py = y - cy, pz = z - cz, l = H(px, py, pz) || 1e-9, ang = Math.acos(clamp((px * dx + py * dy + pz * dz) / l, -1, 1));
    return smax(Math.abs(l - R) - t, (ang - al) * l, k);
  }

  const SHAPES = [
    // a core under ten thick plates laid in a spiral from the top; each stands off the core, leaving crescent gaps
    ['plated dome', (x, y, z) => {
      let d = smin(egg(x, y, z, 0, 0.5, 0, 0.47, 0.42, 0.47), egg(x, y, z, 0, 0.07, 0, 0.52, 0.1, 0.52), 0.1);
      for (let k = 0; k < 10; k++) {
        const th = 1.5 * Math.pow(k / 9, 0.75), f = k * GA, dx = Math.sin(th) * Math.cos(f), dy = Math.cos(th), dz = Math.sin(th) * Math.sin(f);
        d = smin(d, plate(x, y, z, dx * 0.07, 0.48 + dy * 0.07, dz * 0.07, 0.56 - 0.008 * k, 0.035, dx, dy, dz, 0.7 - 0.02 * k), 0.015);
      }
      return d;
    }],
    // a globe split into ten gores by slits that close at the poles, held in a crown of eight knobbed prongs
    ['crowned globe', (x, y, z) => {
      const cy = 0.66, R = 0.42, l = H(x, y - cy, z), rho = H(x, z), s = TAU / 10;
      let a = Math.atan2(z, x); a -= Math.round(a / s) * s;
      let d = smin(l - 0.35, smax(Math.abs(l - R) - 0.04, 0.03 * clamp(rho / R, 0, 1) - rho * Math.sin(PI / 10 - Math.abs(a)), 0.025), 0.015);
      const [fx, fz] = fold(x, z, 8, PI / 8);
      d = smin(d, limb(fx, y, fz, [[0.04, 0.14, 0.06], [0.3, 0.2, 0.05], [0.46, 0.4, 0.045], [0.5, 0.62, 0.04], [0.54, 0.8, 0.035], [0.64, 0.9, 0.03]]), 0.03);
      d = smin(d, ball(fx, y, fz, 0.66, 0.92, 0, 0.055), 0.02);
      d = smin(smin(d, egg(x, y, z, 0, 0.2, 0, 0.3, 0.12, 0.3), 0.06), cone(x, y, z, 0, 0, 0, 0, 0.2, 0, 0.1, 0.08), 0.05);
      const [gx, gz] = fold(x, z, 5, 0.3);
      return smin(d, limb(gx, y, gz, [[0.1, 0.1, 0.03], [0.4, 0.04, 0.025], [0.6, 0.03, 0.02], [0.7, 0.1, 0.014], [0.66, 0.17, 0.012]]), 0.03);
    }],
    // a softly ribbed globe under a cap of seven pointed tongues, with rings of spheres round its base
    ['capped globe', (x, y, z) => {
      const cy = 0.5, R = 0.5, py = y - cy, l = H(x, py, z) || 1e-9, rho = H(x, z), th = Math.acos(clamp(py / l, -1, 1)), f = Math.atan2(z, x), s = TAU / 7, tm = 1.15;
      let d = l - R * (1 + 0.03 * Math.cos(12 * f) * Math.sin(th));
      const a = f - Math.round(f / s) * s, q = clamp(th / tm, 0, 1), Rs = R + 0.03 + 0.09 * q * q * q;
      let t = smax(Math.abs(l - Rs) - 0.028, Math.abs(a) * rho - 0.24 * Math.pow(Math.sin(PI * Math.pow(q, 0.6)), 0.8), 0.03);
      t = smax(t, (th - tm) * l, 0.03);
      d = smin(smin(d, t, 0.012), plate(x, y, z, 0, cy, 0, R + 0.03, 0.028, 0, 1, 0, 0.4, 0.03), 0.012);
      d = smin(d, cone(x, y, z, 0, 1.02, 0, 0.03, 1.17, 0.02, 0.045, 0.035), 0.03);
      const [bx, bz] = fold(x, z, 9, 0), [ex, ez] = fold(x, z, 9, PI / 9), [hx, hz] = fold(x, z, 6, 0.2);
      return Math.min(d, ball(bx, y, bz, 0.56, 0.1, 0, 0.1), ball(ex, y, ez, 0.68, 0.065, 0, 0.065), ball(hx, y, hz, 0.52, 0.27, 0, 0.06));
    }],
    // twenty-four fat fingers from one mound, each leaving along its own direction and then turning upward
    ['finger tuft', (x, y, z) => {
      let d = egg(x, y, z, 0, 0.1, 0, 0.34, 0.16, 0.34);
      for (let k = 0; k < 24; k++) {
        const u = k / 23, th = 0.12 + 1.2 * Math.sqrt(u), f = k * GA, sx = Math.sin(th) * Math.cos(f), sy = Math.cos(th), sz = Math.sin(th) * Math.sin(f), L = 0.95 - 0.4 * u;
        const ax = sx * 0.14, ay = 0.12 + sy * 0.1, az = sz * 0.14, bx = ax + sx * L * 0.5, by = ay + sy * L * 0.5, bz = az + sz * L * 0.5;
        d = smin(d, smin(cone(x, y, z, ax, ay, az, bx, by, bz, 0.085, 0.06), cone(x, y, z, bx, by, bz, bx + sx * L * 0.3, by + (sy * 0.3 + 0.28) * L, bz + sz * L * 0.3, 0.06, 0.028), 0.04), 0.03);
      }
      return d;
    }],
    // an egg-shaped shell cut by four slanting crescent openings over a smooth inner body, on three stubby fins
    ['split pod', (x, y, z) => {
      const sx = x / 0.42, sy = (y - 0.66) / 0.6, sz = z / 0.42, q = H(sx, sy, sz) || 1e-9, nx = sx / q, ny = sy / q, nz = sz / q;
      let sh = Math.abs(q - 1) * 0.42 - 0.04;
      for (let k = 0; k < 4; k++) {
        const f = (k * PI) / 2 + 0.4, off = (nx * Math.cos(f) * 0.75 + ny * 0.5 + nz * Math.sin(f) * 0.75) / 0.9014;
        const ang = Math.acos(clamp(-nx * Math.sin(f) + nz * Math.cos(f), -1, 1)), w = 0.12 * Math.cos((clamp(ang / 1.05, 0, 1) * PI) / 2);
        sh = smax(sh, (w - Math.abs(off)) * 0.42, 0.02);
      }
      let d = smin((q - 0.8) * 0.42, sh, 0.015);
      const [fx, fz] = fold(x, z, 3, 0.2);
      return smin(smin(d, egg(fx, y, fz, 0.38, 0.13, 0, 0.27, 0.12, 0.065), 0.06), egg(x, y, z, 0, 0.05, 0, 0.3, 0.09, 0.3), 0.08);
    }],
    // five hollow caps of falling size threaded on one stalk, each overhanging the one below
    ['tiered caps', (x, y, z) => {
      let d = cone(x, y, z, 0, 0, 0, 0, 1.02, 0, 0.11, 0.06);
      const R = [0.62, 0.5, 0.39, 0.29, 0.2], Y = [0.2, 0.44, 0.66, 0.85, 1.0];
      for (let j = 0; j < 5; j++) {
        const r = R[j], hh = 0.3 * r + 0.08;
        let c = smax(egg(x, y, z, 0, Y[j], 0, r, hh, r), -egg(x, y, z, 0, Y[j] - 0.07, 0, r * 0.93, hh * 0.85, r * 0.93), 0.03);
        d = smin(d, smax(c, Y[j] - 0.03 - y, 0.04), 0.02);
      }
      return d;
    }],
    // a ball seated in three rings of thick scales, each ring wider open than the one inside it
    ['scaled cup', (x, y, z) => {
      const cy = 0.42;
      let d = smin(ball(x, y, z, 0, cy + 0.06, 0, 0.27), egg(x, y, z, 0, 0.1, 0, 0.3, 0.14, 0.3), 0.08);
      for (const [n, R, tl, al, ph] of [[5, 0.34, 0.7, 0.62, 0], [5, 0.46, 0.95, 0.6, PI / 5], [8, 0.6, 1.2, 0.42, 0.2]]) {
        const [fx, fz] = fold(x, z, n, ph);
        d = smin(d, plate(fx, y, fz, Math.sin(tl) * 0.05, cy - 0.05, 0, R, 0.035, Math.sin(tl), Math.cos(tl), 0, al), 0.015);
      }
      return d;
    }],
    // two swellings joined at a collar, the lower one ribbed, with six horns curling in over the top
    ['horned gourd', (x, y, z) => {
      const rib = 1 + 0.03 * Math.cos(8 * Math.atan2(z, x));
      let d = smin(egg(x, y, z, 0, 0.36, 0, 0.4 * rib, 0.36, 0.4 * rib), egg(x, y, z, 0, 0.82, 0, 0.25, 0.24, 0.25), 0.14);
      d = smin(d, H(H(x, z) - 0.25, y - 0.63) - 0.045, 0.03);
      const [hx, hz] = fold(x, z, 6, 0);
      return smin(d, limb(hx, y, hz, [[0.1, 0.96, 0.06], [0.26, 1.08, 0.05], [0.36, 1.24, 0.04], [0.35, 1.4, 0.028], [0.27, 1.5, 0.014]]), 0.04);
    }],
  ];

  // mesh a distance function: sample it on a grid (skipping blocks far from the surface), then one vertex per surface cell
  function mesh(f, name, h = 0.0145, top = 1.73) {
    const ox = -1.03, oy = -0.07, oz = -1.03, nx = Math.ceil(2.06 / h) + 1, ny = Math.ceil((top + 0.07) / h) + 1, nz = nx, nxy = nx * ny, d = new Float32Array(nx * ny * nz);
    for (let k = 0; k < nz; k += 4) for (let j = 0; j < ny; j += 4) for (let a = 0; a < nx; a += 4) {
      const c = f(ox + (a + 1.5) * h, oy + (j + 1.5) * h, oz + (k + 1.5) * h), far = Math.abs(c) > 5.9 * h;
      for (let kk = k; kk < Math.min(nz, k + 4); kk++) for (let jj = j; jj < Math.min(ny, j + 4); jj++) for (let ii = a; ii < Math.min(nx, a + 4); ii++)
        d[ii + nx * (jj + ny * kk)] = far ? c : f(ox + ii * h, oy + jj * h, oz + kk * h);
    }
    const pos = [], idx = [], EA = [0, 2, 4, 6, 0, 1, 4, 5, 0, 1, 2, 3], EB = [1, 3, 5, 7, 2, 3, 6, 7, 4, 5, 6, 7], v = new Float64Array(8);
    let prev = new Int32Array(nxy), cur = new Int32Array(nxy), nv = 0;
    const quad = (a, b, c, e, keep) => { if (keep) idx.push(a, b, c, a, c, e); else idx.push(a, c, b, a, e, c); };
    for (let k = 0; k < nz - 1; k++) {
      cur.fill(-1);
      for (let j = 0; j < ny - 1; j++) for (let a = 0; a < nx - 1; a++) {
        const b = a + nx * (j + ny * k);
        v[0] = d[b]; v[1] = d[b + 1]; v[2] = d[b + nx]; v[3] = d[b + nx + 1]; v[4] = d[b + nxy]; v[5] = d[b + nxy + 1]; v[6] = d[b + nxy + nx]; v[7] = d[b + nxy + nx + 1];
        let mask = 0; for (let c = 0; c < 8; c++) if (v[c] < 0) mask |= 1 << c;
        if (mask === 0 || mask === 255) continue;
        let sx = 0, sy = 0, sz = 0, n = 0;
        for (let e = 0; e < 12; e++) { const p = EA[e], q = EB[e]; if (((mask >> p) & 1) === ((mask >> q) & 1)) continue; const t = v[p] / (v[p] - v[q]); sx += (p & 1) + ((q & 1) - (p & 1)) * t; sy += ((p >> 1) & 1) + (((q >> 1) & 1) - ((p >> 1) & 1)) * t; sz += ((p >> 2) & 1) + (((q >> 2) & 1) - ((p >> 2) & 1)) * t; n++; }
        pos.push(ox + (a + sx / n) * h, oy + (j + sy / n) * h, oz + (k + sz / n) * h);
        const me = nv++, s0 = v[0] < 0; cur[a + nx * j] = me;
        if (v[1] < 0 !== s0 && j > 0 && k > 0) quad(me, cur[a + nx * (j - 1)], prev[a + nx * (j - 1)], prev[a + nx * j], s0);
        if (v[2] < 0 !== s0 && a > 0 && k > 0) quad(me, prev[a + nx * j], prev[a - 1 + nx * j], cur[a - 1 + nx * j], s0);
        if (v[4] < 0 !== s0 && a > 0 && j > 0) quad(me, cur[a - 1 + nx * j], cur[a - 1 + nx * (j - 1)], cur[a + nx * (j - 1)], s0);
      }
      const t = prev; prev = cur; cur = t;
    }
    // normals from the function itself, and how open each point is: dark where the surface faces more of itself
    const nrm = new Float32Array(pos.length), tone = new Float32Array(nv), e = 0.004;
    for (let q = 0; q < nv; q++) {
      const x = pos[q * 3], y = pos[q * 3 + 1], z = pos[q * 3 + 2];
      let gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e); const l = H(gx, gy, gz) || 1; gx /= l; gy /= l; gz /= l;
      nrm[q * 3] = gx; nrm[q * 3 + 1] = gy; nrm[q * 3 + 2] = gz;
      let occ = 0; for (const t of [0.03, 0.07, 0.14, 0.26]) occ += 1 - clamp(f(x + gx * t, y + gy * t, z + gz * t) / t, 0, 1);
      tone[q] = 1 - 0.22 * occ;
    }
    return { name, pos: Float32Array.from(pos), idx: Uint32Array.from(idx), nrm, tone, centre: [0, 0.62, 0] };
  }

  const build = (i) => mesh(SHAPES[i][1], SHAPES[i][0]);
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const api = { names: SHAPES.map((s) => s[0]), build, mesh, kit: { PI, TAU, GA, H, clamp, sstep, smin, smax, ball, egg, cone, limb, fold, plate } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Fantastic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
