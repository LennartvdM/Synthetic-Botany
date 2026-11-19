// Sculpted reference shapes. NOT grown: every form here is put in by hand, from profiles and
// petal outlines chosen to look right. They exist to be studied, so that later work can ask
// which of their features a growth rule can reach. Nothing in the growth kernel may use them.
//
// Two ways of building are used:
//   petals(...)  separate sheets arranged round an axis (they may overlap)
//   bell(...)    one fused sheet round the axis, with a lobed rim
// Each sheet is a thin two-faced shell with a real rim, so it can be cut and sliced.
(function (root) {
  'use strict';
  const TAU = Math.PI * 2, PI = Math.PI;
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x), lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // a smooth curve through evenly spaced control values: numbers, or [radius, height] pairs
  function curve(pts) {
    const n = pts.length - 1, dim = Array.isArray(pts[0]) ? pts[0].length : 0;
    const get = (i, k) => { i = clamp(i, 0, n); return dim ? pts[i][k] : pts[i]; };
    const at = (u, k) => {
      const x = clamp(u, 0, 1) * n, i = Math.min(n - 1, Math.floor(x)), t = x - i, a = get(i - 1, k), b = get(i, k), c = get(i + 1, k), d = get(i + 2, k);
      return 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
    };
    const ev = (u, k) => (u <= 1 ? at(u, k) : at(1, k) + ((u - 1) * (at(1, k) - at(0.98, k))) / 0.02);
    return dim ? (u) => [ev(u, 0), ev(u, 1)] : (u) => ev(u, 0);
  }

  class Mesh {
    constructor() { this.pos = []; this.idx = []; this.tone = []; }
    // rows[j][i]: points; inward[j][i]: which way is "inside the flower" there; us[j]: 0 at the base, 1 at the tip
    shell(rows, inward, us, th, closeU) {
      const nv = rows.length, nu = rows[0].length, base = this.pos.length / 3, P = this.pos;
      const at = (j, i) => rows[clamp(j, 0, nv - 1)][closeU ? (i + nu) % nu : clamp(i, 0, nu - 1)];
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
        const a = at(j, i + 1), b = at(j, i - 1), c = at(j + 1, i), d = at(j - 1, i);
        const ux = a[0] - b[0], uy = a[1] - b[1], uz = a[2] - b[2], vx = c[0] - d[0], vy = c[1] - d[1], vz = c[2] - d[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        const q = rows[j][i], t = th(us[j], closeU ? 0 : (i / (nu - 1)) * 2 - 1) * 0.5, w = inward[j][i], inTop = nx * w[0] + ny * w[1] + nz * w[2] > 0;
        P.push(q[0] + nx * t, q[1] + ny * t, q[2] + nz * t, q[0] - nx * t, q[1] - ny * t, q[2] - nz * t);
        const inside = 0.5 + 0.38 * us[j], outside = 0.94 + 0.06 * us[j];
        this.tone.push(inTop ? inside : outside, inTop ? outside : inside);
      }
      const id = (j, i, s) => base + (j * nu + (i % nu)) * 2 + s, iu = closeU ? nu : nu - 1, I = this.idx;
      for (let j = 0; j < nv - 1; j++) for (let i = 0; i < iu; i++) {
        I.push(id(j, i, 0), id(j, i + 1, 0), id(j + 1, i + 1, 0), id(j, i, 0), id(j + 1, i + 1, 0), id(j + 1, i, 0));
        I.push(id(j, i, 1), id(j + 1, i + 1, 1), id(j, i + 1, 1), id(j, i, 1), id(j + 1, i, 1), id(j + 1, i + 1, 1));
      }
      if (!closeU) for (let j = 0; j < nv - 1; j++) { I.push(id(j, 0, 0), id(j + 1, 0, 0), id(j + 1, 0, 1), id(j, 0, 0), id(j + 1, 0, 1), id(j, 0, 1)); I.push(id(j, nu - 1, 0), id(j + 1, nu - 1, 1), id(j + 1, nu - 1, 0), id(j, nu - 1, 0), id(j, nu - 1, 1), id(j + 1, nu - 1, 1)); }
      for (let i = 0; i < iu; i++) { I.push(id(0, i, 0), id(0, i, 1), id(0, i + 1, 1), id(0, i, 0), id(0, i + 1, 1), id(0, i + 1, 0)); I.push(id(nv - 1, i, 0), id(nv - 1, i + 1, 1), id(nv - 1, i, 1), id(nv - 1, i, 0), id(nv - 1, i + 1, 0), id(nv - 1, i + 1, 1)); }
    }
    tube(pts, radii, sides = 8, tone = 0.86) {
      const n = pts.length, base = this.pos.length / 3; let N = null;
      for (let i = 0; i < n; i++) {
        const a = pts[Math.min(n - 1, i + 1)], b = pts[Math.max(0, i - 1)]; let T = [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; const tl = Math.hypot(T[0], T[1], T[2]) || 1; T = [T[0] / tl, T[1] / tl, T[2] / tl];
        if (!N) N = Math.abs(T[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
        const dt = N[0] * T[0] + N[1] * T[1] + N[2] * T[2]; N = [N[0] - T[0] * dt, N[1] - T[1] * dt, N[2] - T[2] * dt]; const nl = Math.hypot(N[0], N[1], N[2]) || 1; N = [N[0] / nl, N[1] / nl, N[2] / nl];
        const B = [T[1] * N[2] - T[2] * N[1], T[2] * N[0] - T[0] * N[2], T[0] * N[1] - T[1] * N[0]];
        for (let k = 0; k < sides; k++) { const f = (TAU * k) / sides, c = Math.cos(f) * radii[i], s = Math.sin(f) * radii[i]; this.pos.push(pts[i][0] + N[0] * c + B[0] * s, pts[i][1] + N[1] * c + B[1] * s, pts[i][2] + N[2] * c + B[2] * s); this.tone.push(tone); }
        if (i) for (let k = 0; k < sides; k++) { const r0 = base + (i - 1) * sides, r1 = base + i * sides, k1 = (k + 1) % sides; this.idx.push(r0 + k, r0 + k1, r1 + k1, r0 + k, r1 + k1, r1 + k); }
      }
      const c0 = this.pos.length / 3; this.pos.push(...pts[0], ...pts[n - 1]); this.tone.push(tone, tone);
      for (let k = 0; k < sides; k++) { const k1 = (k + 1) % sides, l = base + (n - 1) * sides; this.idx.push(c0, base + k1, base + k, c0 + 1, l + k, l + k1); }
    }
    map(fn) { for (let i = 0; i < this.pos.length; i += 3) { const q = fn(this.pos[i], this.pos[i + 1], this.pos[i + 2]); this.pos[i] = q[0]; this.pos[i + 1] = q[1]; this.pos[i + 2] = q[2]; } return this; }
    add(m) { const b = this.pos.length / 3; for (const v of m.pos) this.pos.push(v); for (const v of m.tone) this.tone.push(v); for (const v of m.idx) this.idx.push(v + b); return this; }
  }

  // separate petals round the axis. profile(u) -> [radius, height]; width(u) -> share of its sector (1 = just touching neighbours)
  function petals(M, o) {
    const n = o.n, nu = o.nu || 30, nv = o.nv || 12, th = o.th || 0.012;
    for (let k = 0; k < n; k++) {
      const f0 = (o.phase || 0) + (TAU * k) / n, rows = [], inw = [], us = [];
      for (let j = 0; j <= nu; j++) {
        const u = j / nu, row = [], iw = [], ha = (Math.max(0, o.width(u)) * PI) / n;
        for (let i = 0; i <= nv; i++) {
          const v = (i / nv) * 2 - 1, ue = u * (1 - (o.notch || 0) * (1 - v * v) * u), [r, y] = o.profile(ue), [r2, y2] = o.profile(ue + 0.01);
          const f = f0 + v * ha + (o.twist || 0) * u, rr = (r + (o.offset || 0)) * (1 - (o.cup || 0) * v * v) + (o.tilt || 0) * v;
          const yy = y + (o.wave || 0) * Math.sin((o.waves || 3) * PI * u) * v * v * u;
          row.push([rr * Math.cos(f), yy, rr * Math.sin(f)]);
          const dr = r2 - r, dy = y2 - y, dl = Math.hypot(dr, dy) || 1; iw.push([(-dy / dl) * Math.cos(f), dr / dl, (-dy / dl) * Math.sin(f)]);
        }
        rows.push(row); inw.push(iw); us.push(u);
      }
      M.shell(rows, inw, us, (u, v) => th * (1 - 0.5 * u) * (1 - 0.45 * v * v), false);
    }
  }

  // one fused sheet round the axis. Beyond `fuse` the rim is shorter between lobes, so lobes are part of the same sheet.
  function bell(M, o) {
    const nu = o.nu || 44, n = o.n || 0, na = o.na || Math.max(48, n * 16), rows = [], inw = [], us = [], fuse = o.fuse ?? 0.75, th = o.th || 0.012;
    for (let j = 0; j <= nu; j++) {
      const u = j / nu, row = [], iw = [];
      for (let a = 0; a < na; a++) {
        const f = (TAU * a) / na, lam = n ? Math.pow(Math.abs(Math.cos((n * (f - (o.lobePhase || 0))) / 2)), o.sharp || 1) : 1;
        const ell = (1 - (o.depth || 0) * (1 - lam)) * (o.lip ? o.lip(f) : 1), ue = u <= fuse ? u : fuse + (u - fuse) * ell;
        let [r, y] = o.profile(ue); const [r2, y2] = o.profile(ue + 0.01), e = sstep(o.ruffleFrom ?? 0.7, 1, ue);
        const k = (1 + (o.pouch || 0) * Math.cos(f) * Math.sin(PI * Math.min(1, ue))) * (1 + (o.pleat || 0) * (o.pleatFn ? o.pleatFn(f) : Math.cos((o.pleatN || 5) * f)) * (o.pleatAll ? 1 : ue));
        r = r * k + (o.ruffle || 0) * Math.sin((o.ruffleN || 12) * f) * e; y += (o.ruffle || 0) * 0.6 * Math.cos((o.ruffleN || 12) * f) * e;
        row.push([r * Math.cos(f), y, r * Math.sin(f)]);
        const dr = r2 * k - r, dy = y2 - y, dl = Math.hypot(dr, dy) || 1; iw.push([(-dy / dl) * Math.cos(f), dr / dl, (-dy / dl) * Math.sin(f)]);
      }
      rows.push(row); inw.push(iw); us.push(u);
    }
    M.shell(rows, inw, us, (u) => th * (1 - 0.45 * u), true);
  }

  // thin parts inside a flower: n filaments from the base, each ending in a small swelling
  function filaments(M, n, len, spread, o = {}) {
    for (let k = 0; k < n; k++) {
      const f = (TAU * k) / n + (o.phase || 0), pts = [], rad = [];
      for (let q = 0; q <= 6; q++) { const t = q / 6, r = spread * Math.pow(t, o.bow || 1.4), y = (o.from || 0.05) + len * t; pts.push([r * Math.cos(f), y, r * Math.sin(f)]); rad.push(o.r || 0.008); }
      const e = pts[6], d = [e[0] - pts[5][0], e[1] - pts[5][1], e[2] - pts[5][2]], dl = Math.hypot(...d) || 1, s = (o.head || 0.05) / dl;
      pts.push([e[0] + d[0] * s * 0.5, e[1] + d[1] * s * 0.5, e[2] + d[2] * s * 0.5], [e[0] + d[0] * s, e[1] + d[1] * s, e[2] + d[2] * s]); rad.push((o.r || 0.008) * (o.fat || 2.6), (o.r || 0.008) * 0.6);
      M.tube(pts, rad, 6, 0.8);
    }
  }
  const column = (M, h, r, top) => M.tube([[0, 0.02, 0], [0, h * 0.6, 0], [0, h, 0], [0, h + top, 0], [0, h + top * 2, 0]], [r, r * 0.8, r * 0.75, r * 1.9, r * 0.5], 8, 0.8);

  const C = curve;
  const SHAPES = [
    { name: 'tulip', nod: 0, stem: 1.0, build(M) {
      const w = C([0.55, 1.2, 1.34, 1.26, 0.98, 0.5, 0.0]);
      petals(M, { n: 3, profile: C([[0.03, 0], [0.24, 0.05], [0.38, 0.26], [0.42, 0.52], [0.4, 0.8], [0.36, 1.0]]), width: w, cup: 0.07, tilt: 0.02, th: 0.016 });
      petals(M, { n: 3, phase: PI / 3, profile: C([[0.03, 0], [0.22, 0.05], [0.35, 0.26], [0.385, 0.5], [0.365, 0.77], [0.32, 0.96]]), width: w, cup: 0.07, tilt: 0.02, th: 0.016 });
      column(M, 0.3, 0.035, 0.035); filaments(M, 6, 0.22, 0.09, { head: 0.1, fat: 2.2 });
    } },
    { name: 'lily', nod: 1.15, stem: 1.25, build(M) {
      const p = C([[0.03, 0], [0.07, 0.2], [0.13, 0.42], [0.26, 0.62], [0.48, 0.76], [0.7, 0.74], [0.84, 0.58]]), w = C([0.7, 1.0, 1.1, 1.0, 0.78, 0.48, 0.0]);
      petals(M, { n: 3, profile: p, width: w, cup: -0.12, wave: 0.03, waves: 5, th: 0.014, nu: 36 });
      petals(M, { n: 3, phase: PI / 3, profile: (u) => { const q = p(u); return [q[0] * 0.96, q[1] * 0.985]; }, width: (u) => w(u) * 1.12, cup: -0.12, wave: 0.03, waves: 5, th: 0.014, nu: 36 });
      filaments(M, 6, 0.78, 0.26, { head: 0.13, fat: 2.4, bow: 2 }); column(M, 0.92, 0.014, 0.03);
    } },
    { name: 'daffodil', nod: 1.35, stem: 1.25, build(M) {
      const p = C([[0.05, 0], [0.07, 0.03], [0.3, 0.07], [0.58, 0.1], [0.8, 0.09]]), w = C([0.35, 0.95, 1.2, 0.95, 0.0]);
      petals(M, { n: 3, profile: p, width: w, twist: 0.12, th: 0.012 });
      petals(M, { n: 3, phase: PI / 3, profile: (u) => { const q = p(u); return [q[0] * 0.97, q[1] + 0.012]; }, width: w, twist: 0.12, th: 0.012 });
      bell(M, { profile: C([[0.07, 0.02], [0.13, 0.12], [0.15, 0.32], [0.17, 0.5], [0.24, 0.62]]), n: 6, fuse: 0.85, depth: 0.25, ruffle: 0.022, ruffleN: 18, ruffleFrom: 0.6, th: 0.012 });
      bell(M, { profile: C([[0.045, -0.4], [0.05, -0.2], [0.065, 0.02]]), th: 0.012, nu: 10 });
      filaments(M, 6, 0.3, 0.03, { head: 0.07 });
    } },
    { name: 'snowdrop', nod: 3.0, stem: 1.75, build(M) {
      petals(M, { n: 3, profile: C([[0.03, 0.1], [0.13, 0.2], [0.24, 0.48], [0.29, 0.78], [0.25, 1.08]]), width: C([0.4, 0.86, 1.0, 0.92, 0.0]), cup: 0.28, th: 0.016 });
      petals(M, { n: 3, phase: PI / 3, profile: C([[0.03, 0.1], [0.1, 0.18], [0.135, 0.36], [0.15, 0.58]]), width: C([0.6, 1.08, 1.12, 1.1]), notch: 0.22, th: 0.014 });
      bell(M, { profile: C([[0.0, -0.1], [0.07, -0.08], [0.085, 0.0], [0.06, 0.1], [0.03, 0.12]]), th: 0.02, nu: 14 });
    } },
    { name: 'fritillary', nod: 3.05, stem: 1.75, build(M) {
      const p = C([[0.04, 0], [0.26, 0.0], [0.36, 0.1], [0.385, 0.45], [0.37, 0.8], [0.31, 1.0]]), w = C([0.9, 1.04, 1.1, 1.1, 1.06, 0.7, 0.0]);
      petals(M, { n: 3, profile: p, width: w, cup: 0.04, tilt: 0.012, th: 0.016 });
      petals(M, { n: 3, phase: PI / 3, profile: (u) => { const q = p(u); return [q[0] * 0.95, q[1] * 0.99]; }, width: w, cup: 0.04, tilt: 0.012, th: 0.016 });
      filaments(M, 6, 0.6, 0.05, { head: 0.09 }); column(M, 0.74, 0.016, 0.03);
    } },
    { name: 'foxglove', nod: 2.0, stem: 1.6, build(M) {
      bell(M, { profile: C([[0.05, 0], [0.09, 0.08], [0.19, 0.22], [0.235, 0.5], [0.245, 0.78], [0.3, 0.97], [0.37, 1.04]]), n: 4, lobePhase: 0, fuse: 0.8, depth: 0.3, sharp: 0.6,
        lip: (f) => 1 + 0.5 * Math.pow(Math.max(0, Math.cos(f)), 2) - 0.12 * Math.pow(Math.max(0, -Math.cos(f)), 2), pouch: 0.16, th: 0.014 });
      petals(M, { n: 5, profile: C([[0.05, -0.01], [0.1, 0.06], [0.15, 0.22]]), width: C([0.9, 0.8, 0.0]), th: 0.012, nu: 12, nv: 6 });
      filaments(M, 4, 0.62, 0.04, { head: 0.07, phase: PI * 0.8 });
      M.map((x, y, z) => { const a = 0.32 * y, c = Math.cos(a), s = Math.sin(a), R = 1 / 0.32; return [R - (R - x) * c, (R - x) * s, z]; });
    } },
    { name: 'bellflower', nod: 1.9, stem: 1.55, build(M) {
      bell(M, { profile: C([[0.05, 0], [0.17, 0.05], [0.245, 0.28], [0.27, 0.56], [0.33, 0.82], [0.47, 1.0]]), n: 5, fuse: 0.6, depth: 0.62, sharp: 1.7, th: 0.013 });
      petals(M, { n: 5, phase: PI / 5, profile: C([[0.05, -0.01], [0.12, 0.02], [0.22, 0.16], [0.3, 0.3]]), width: C([0.7, 0.55, 0.3, 0.0]), th: 0.012, nu: 14, nv: 6 });
      column(M, 0.62, 0.016, 0.04);
    } },
    { name: 'lily of the valley', nod: 2.9, stem: 1.6, build(M) {
      bell(M, { profile: C([[0.04, 0], [0.2, 0.04], [0.31, 0.26], [0.33, 0.5], [0.27, 0.74], [0.21, 0.84], [0.27, 0.93], [0.33, 0.9]]), n: 6, fuse: 0.84, depth: 0.5, sharp: 1.1, th: 0.016 });
    } },
    { name: 'bluebell', nod: 2.45, stem: 1.65, build(M) {
      bell(M, { profile: C([[0.04, 0], [0.12, 0.06], [0.15, 0.36], [0.16, 0.62], [0.22, 0.8], [0.34, 0.88], [0.44, 0.8], [0.43, 0.66]]), n: 6, fuse: 0.5, depth: 0.5, sharp: 1.2, th: 0.013, nu: 56 });
      filaments(M, 6, 0.6, 0.04, { head: 0.07 });
    } },
    { name: 'angel\'s trumpet', nod: 2.75, stem: 1.9, build(M) {
      bell(M, { profile: C([[0.035, 0], [0.05, 0.28], [0.085, 0.56], [0.19, 0.82], [0.4, 0.96], [0.6, 0.99]]), n: 5, fuse: 0.8, depth: 0.42, sharp: 3.2, pleat: 0.07, pleatN: 5, th: 0.012, nu: 56, na: 100 });
      bell(M, { profile: C([[0.04, -0.02], [0.065, 0.1], [0.06, 0.26], [0.075, 0.34]]), n: 5, fuse: 0.75, depth: 0.6, sharp: 2, th: 0.012, nu: 14 });
    } },
    { name: 'calla', nod: 0, stem: 0.75, build(M) {
      petals(M, { n: 1, profile: C([[0.04, 0], [0.07, 0.3], [0.13, 0.56], [0.27, 0.78], [0.38, 0.96], [0.31, 1.2]]), width: C([1.22, 1.18, 1.08, 0.84, 0.46, 0.0]), tilt: 0.035, th: 0.018, nu: 40, nv: 40 });
      M.tube([[0, 0.02, 0], [0, 0.3, 0], [0, 0.62, 0], [0, 0.7, 0]], [0.03, 0.038, 0.036, 0.012], 10, 0.85);
    } },
    { name: 'lantern', nod: 3.0, stem: 1.75, build(M) {
      bell(M, { profile: C([[0.02, 0], [0.2, 0.04], [0.36, 0.28], [0.385, 0.55], [0.27, 0.82], [0.07, 0.98], [0.005, 1.03]]), pleat: 0.07, pleatAll: true, pleatFn: (f) => 1 - 2 * Math.pow(Math.abs(Math.sin(2.5 * f)), 0.6), th: 0.012, na: 100 });
    } },
  ];

  // build one shape: sculpt it upright, tip it over by `nod`, and set it on a stalk
  function build(i) {
    const s = SHAPES[i], M = new Mesh();
    s.build(M);
    const c = Math.cos(s.nod), sn = Math.sin(s.nod), T = [0.18 * sn, s.stem, 0];
    M.map((x, y, z) => [x * c + y * sn + T[0], -x * sn + y * c + T[1], z]);
    const a = [sn, c], G = [T[0] - 0.55 * sn - 0.1 * (s.nod > 2 ? 1 : 0), 0], K = [T[0] - a[0] * 0.4, T[1] - a[1] * 0.4], pts = [], rad = [];
    for (let q = 0; q <= 16; q++) { const t = q / 16, m = 1 - t; pts.push([m * m * m * G[0] + 3 * m * m * t * G[0] + 3 * m * t * t * K[0] + t * t * t * T[0], 3 * m * m * t * s.stem * 0.7 + 3 * m * t * t * K[1] + t * t * t * T[1], 0]); rad.push(lerp(0.026, 0.017, t)); }
    M.tube(pts, rad, 8, 0.8);
    return { name: s.name, pos: Float32Array.from(M.pos), idx: Uint32Array.from(M.idx), tone: Float32Array.from(M.tone), centre: [T[0] + a[0] * 0.5, T[1] + a[1] * 0.5, 0] };
  }

  const api = { names: SHAPES.map((s) => s.name), build };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Cheats = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
