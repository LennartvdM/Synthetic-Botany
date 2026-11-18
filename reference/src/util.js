// Shared maths: seeded randomness, vectors, frames, noise, wavefields.
export const TAU = Math.PI * 2;
export const GOLDEN = Math.PI * (3 - Math.sqrt(5));
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export function hash32(a, b = 0, c = 0, d = 0) {
  let h = 0x9e3779b9 ^ Math.imul(a | 0, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) ^ Math.imul(b | 0, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 13), 0x297a2d39) ^ Math.imul(c | 0, 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) ^ Math.imul(d | 0, 0x165667b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 13;
  return h >>> 0;
}
const h01 = (a, b, c, d) => hash32(a, b, c, d) / 4294967296;

export function makeRng(seed) {
  let a = hash32(seed, 0x51ed) >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * r());
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.chance = (p) => r() < p;
  r.gauss = () => (r() + r() + r() + r() - 2) * 1.2;
  r.dir = () => {
    const y = 2 * r() - 1, t = TAU * r(), s = Math.sqrt(1 - y * y);
    return [s * Math.cos(t), y, s * Math.sin(t)];
  };
  return r;
}

// vectors as plain [x,y,z]
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l > 1e-12 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 1, 0];
};
export const lerpv = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// A frame is where and how big something grows: origin, right-handed basis, scale.
export function makeFrame(o, yDir, s, spin = 0) {
  const y = norm(yDir);
  const a = Math.abs(y[2]) < 0.95 ? [0, 0, 1] : [1, 0, 0];
  let x = norm(cross(y, a));
  let z = cross(x, y);
  if (spin) {
    const c = Math.cos(spin), sn = Math.sin(spin);
    const x2 = add(mul(x, c), mul(z, sn));
    z = add(mul(z, c), mul(x, -sn));
    x = x2;
  }
  return { o: o.slice(), x, y, z, s };
}

// value noise in [-1,1]
export function vnoise(x, y, z, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let fx = x - xi, fy = y - yi, fz = z - zi;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const a = h01(xi, yi, zi, seed), b = h01(xi + 1, yi, zi, seed);
  const c = h01(xi, yi + 1, zi, seed), d = h01(xi + 1, yi + 1, zi, seed);
  const e = h01(xi, yi, zi + 1, seed), f = h01(xi + 1, yi, zi + 1, seed);
  const g = h01(xi, yi + 1, zi + 1, seed), h = h01(xi + 1, yi + 1, zi + 1, seed);
  const ab = a + (b - a) * fx, cd = c + (d - c) * fx, ef = e + (f - e) * fx, gh = g + (h - g) * fx;
  const lo = ab + (cd - ab) * fy, hi = ef + (gh - ef) * fy;
  return (lo + (hi - lo) * fz) * 2 - 1;
}
export function fbm(x, y, z, seed, oct = 3) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, z * f, seed + i * 17); a *= 0.5; f *= 2.03; }
  return s;
}

// Wavefield: a sum of plane waves that all share one wavelength (1 unit).
// Random directions give a spinodal labyrinth; aniso squeezes directions:
// >0 pushes wave vectors horizontal (columns), <0 vertical (stacked lamellae).
export function makeWave(rng, n = 18, aniso = 0) {
  const k = new Float64Array(n * 4);
  for (let i = 0; i < n; i++) {
    let d = rng.dir();
    if (aniso > 0) d[1] *= 1 - aniso; else { d[0] *= 1 + aniso; d[2] *= 1 + aniso; }
    d = norm(d);
    k[i * 4] = d[0] * TAU; k[i * 4 + 1] = d[1] * TAU; k[i * 4 + 2] = d[2] * TAU; k[i * 4 + 3] = rng() * TAU;
  }
  const amp = 1 / Math.sqrt(n / 2);
  return (x, y, z) => {
    let s = 0;
    for (let j = 0; j < k.length; j += 4) s += Math.cos(k[j] * x + k[j + 1] * y + k[j + 2] * z + k[j + 3]);
    return s * amp;
  };
}
export const gyroid = (x, y, z) => {
  x *= TAU; y *= TAU; z *= TAU;
  return (Math.sin(x) * Math.cos(y) + Math.sin(y) * Math.cos(z) + Math.sin(z) * Math.cos(x)) * 1.155;
};

// Jittered-lattice Voronoi. Returns nearest seed and the distance to the two nearest cell walls.
export function makeVoronoi(seed, jitter = 1) {
  const out = { d12: 0, d13: 0, c: 0, px: 0, py: 0, pz: 0, qx: 0, qy: 0, qz: 0 };
  // seeds are cached in a dense block around the origin; anything outside is hashed on demand
  const N = 48, H = 24, cache = new Float32Array(N * N * N * 3).fill(NaN);
  return (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let d1 = 1e9, d2 = 1e9, d3 = 1e9;
    let ax = 0, ay = 0, az = 0, bx = 0, by = 0, bz = 0, cx = 0, cy = 0, cz = 0;
    for (let k = zi - 1; k <= zi + 1; k++) for (let j = yi - 1; j <= yi + 1; j++) for (let i = xi - 1; i <= xi + 1; i++) {
      let sx, sy, sz;
      const a = i + H, b = j + H, c = k + H;
      if (a < 0 || b < 0 || c < 0 || a >= N || b >= N || c >= N) {
        sx = i + 0.5 + jitter * (h01(i, j, k, seed) - 0.5); sy = j + 0.5 + jitter * (h01(i, j, k, seed + 1) - 0.5); sz = k + 0.5 + jitter * (h01(i, j, k, seed + 2) - 0.5);
      } else {
        const q = ((a * N + b) * N + c) * 3;
        if (cache[q] !== cache[q]) {
          cache[q] = i + 0.5 + jitter * (h01(i, j, k, seed) - 0.5); cache[q + 1] = j + 0.5 + jitter * (h01(i, j, k, seed + 1) - 0.5); cache[q + 2] = k + 0.5 + jitter * (h01(i, j, k, seed + 2) - 0.5);
        }
        sx = cache[q]; sy = cache[q + 1]; sz = cache[q + 2];
      }
      const dx = sx - x, dy = sy - y, dz = sz - z, dd = dx * dx + dy * dy + dz * dz;
      if (dd < d1) { d3 = d2; cx = bx; cy = by; cz = bz; d2 = d1; bx = ax; by = ay; bz = az; d1 = dd; ax = sx; ay = sy; az = sz; }
      else if (dd < d2) { d3 = d2; cx = bx; cy = by; cz = bz; d2 = dd; bx = sx; by = sy; bz = sz; }
      else if (dd < d3) { d3 = dd; cx = sx; cy = sy; cz = sz; }
    }
    const ux = bx - ax, uy = by - ay, uz = bz - az, l12 = Math.hypot(ux, uy, uz);
    const vx = cx - ax, vy = cy - ay, vz = cz - az, l13 = Math.hypot(vx, vy, vz);
    out.d12 = (d2 - d1) / (2 * l12);
    out.d13 = (d3 - d1) / (2 * l13);
    out.c = (ux * vx + uy * vy + uz * vz) / (l12 * l13);
    out.px = ax; out.py = ay; out.pz = az;
    out.qx = bx; out.qy = by; out.qz = bz;
    return out;
  };
}
export function voronoiSeed(i, j, k, seed, jitter = 1) {
  return [i + 0.5 + jitter * (h01(i, j, k, seed) - 0.5), j + 0.5 + jitter * (h01(i, j, k, seed + 1) - 0.5), k + 0.5 + jitter * (h01(i, j, k, seed + 2) - 0.5)];
}
