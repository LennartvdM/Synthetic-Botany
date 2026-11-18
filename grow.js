// Growth kernel. No dependencies. Works as a plain <script> (globalThis.Grow) and in Node (require).
//
// A body is cells (points) and links (the edges of triangles between them). Link length is 1.
// Every cell carries its own state; nothing is decided per row or for the body as a whole.
//
// One generation:
//   1. Each edge cell reads how much the edge turns around it, measured inside the sheet
//      (pi minus the corner angles of the triangles that meet at it), and adds c * turn * H to its credit.
//   2. Each edge cell divides away from the body. The daughter takes its place on the edge and its credit.
//   3. An edge cell whose credit has reached 1 also divides along the edge, and spends the credit.
//   4. The body settles: links return to length 1, the sheet resists bending, unlinked cells give way.
//
// With c = 1 a flat sheet gains exactly the cells it needs to stay flat. That is the only tuning in here.
(function (root) {
  'use strict';
  const H = 0.87; // how far a daughter sits from the edge it came from, in link lengths

  function rng(seed) {
    let a = (seed * 2654435761) >>> 0;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  function grow(recipe) {
    const r = Object.assign({ c: 1, generations: 40, lift: 0.15, stiff: 0.6, settle: 30, setAfter: 0, maxCells: 12000, seed: 1 }, recipe);
    const X = [], tris = [], born = [], credit = [], nb = [], vt = [];
    const li = [], lj = [], linkAt = new Map();
    const key = (a, b) => (a < b ? a * 1e7 + b : b * 1e7 + a);
    const cell = (x, y, z, g) => { X.push(x, y, z); born.push(g); credit.push(0); nb.push([]); vt.push([]); return born.length - 1; };
    const link = (a, b) => { const k = key(a, b); if (!linkAt.has(k)) { linkAt.set(k, li.length); li.push(a); lj.push(b); nb[a].push(b); nb[b].push(a); } };
    const unlink = (a, b) => { const k = key(a, b), e = linkAt.get(k); if (e === undefined) return; linkAt.delete(k); li[e] = -1; nb[a].splice(nb[a].indexOf(b), 1); nb[b].splice(nb[b].indexOf(a), 1); };
    const tri = (a, b, c) => { const t = tris.length / 3; tris.push(a, b, c); vt[a].push(t); vt[b].push(t); vt[c].push(t); link(a, b); link(b, c); link(c, a); return t; };
    const P = (i) => [X[i * 3], X[i * 3 + 1], X[i * 3 + 2]];
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], len = (a) => Math.hypot(a[0], a[1], a[2]);
    const unit = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

    // start: one cell lying on the ground and the six it is linked to
    const c0 = cell(0, 0.01, 0, 0);
    let edge = [];
    for (let j = 0; j < 6; j++) edge.push(cell(Math.cos((j * Math.PI) / 3), 0.01, Math.sin((j * Math.PI) / 3), 0));
    for (let j = 0; j < 6; j++) tri(c0, edge[j], edge[(j + 1) % 6]);

    // how much the edge turns at cell v, measured in the sheet
    const turn = (v) => {
      let s = 0;
      for (const t of vt[v]) {
        const q = [tris[t * 3], tris[t * 3 + 1], tris[t * 3 + 2]], i = q.indexOf(v), a = unit(sub(P(q[(i + 1) % 3]), P(v))), b = unit(sub(P(q[(i + 2) % 3]), P(v)));
        s += Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
      }
      return Math.PI - s;
    };
    // away from the body, at cell v: from the middle of the cells it is linked to, toward itself
    const away = (v) => { let m = [0, 0, 0]; for (const q of nb[v]) { m[0] += X[q * 3]; m[1] += X[q * 3 + 1]; m[2] += X[q * 3 + 2]; } const k = nb[v].length; return unit(sub(P(v), [m[0] / k, m[1] / k, m[2] / k])); };

    const history = [];
    for (let g = 1; g <= r.generations && born.length < r.maxCells; g++) {
      const N = edge.length;
      let total = 0;
      const out = edge.map((v) => { const t = turn(v); total += t; credit[v] += r.c * t * H; let o = away(v); if (g === 1) o = unit([o[0], o[1] + r.lift, o[2]]); return o; });
      // every edge cell divides away from the body; its daughter sits over the gap to the next edge cell
      const old = edge.slice(), pos = old.map(P), next = [];
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N, o = unit([out[i][0] + out[j][0], out[i][1] + out[j][1], out[i][2] + out[j][2]]);
        const d = cell((pos[i][0] + pos[j][0]) / 2 + o[0] * H, (pos[i][1] + pos[j][1]) / 2 + o[1] * H, (pos[i][2] + pos[j][2]) / 2 + o[2] * H, g);
        credit[d] = credit[old[i]]; credit[old[i]] = 0;
        next.push(d);
      }
      for (let i = 0; i < N; i++) { tri(old[(i + 1) % N], old[i], next[i]); tri(old[i], next[(i + N - 1) % N], next[i]); }
      edge = next;
      // an edge cell with enough credit also divides along the edge
      let along = 0;
      for (let i = 0; i < edge.length; i++) {
        const v = edge[i];
        if (credit[v] < 1) continue;
        const n = edge[(i + 1) % edge.length], t = vt[v].find((q) => vt[n].includes(q));
        if (t === undefined) continue;
        const m = cell((X[v * 3] + X[n * 3]) / 2, (X[v * 3 + 1] + X[n * 3 + 1]) / 2, (X[v * 3 + 2] + X[n * 3 + 2]) / 2, g);
        credit[v] -= 1;
        const q = [tris[t * 3], tris[t * 3 + 1], tris[t * 3 + 2]], x = q.find((u) => u !== v && u !== n);
        unlink(v, n);
        tris[t * 3 + q.indexOf(n)] = m; vt[n].splice(vt[n].indexOf(t), 1); vt[m].push(t); link(v, m); link(m, x);
        const k = q.slice(); k[q.indexOf(v)] = m; tri(k[0], k[1], k[2]);
        edge.splice(i + 1, 0, m); i++; along++;
      }
      history.push({ generation: g, edge: N, turning: total, along, cells: born.length });
      settle(g);
    }

    function settle(g) {
      const n = born.length, rep = 0.8, HS = 1 << 15, head = new Int32Array(HS), nxt = new Int32Array(n), nm = new Float32Array(n * 3), dev = new Float32Array(n), onEdge = new Uint8Array(n);
      for (const v of edge) onEdge[v] = 1;
      const free = (i) => born[i] > 0 && (r.setAfter <= 0 || g - born[i] <= r.setAfter);
      const hk = (x, y, z) => ((Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) >>> 0) & (HS - 1);
      for (let it = 0; it < r.settle; it++) {
        if (r.stiff > 0) {
          // resisting bending. Pulling a cell toward the middle of its linked cells shrinks every curved surface,
          // so a plain tube never reached its link lengths. Instead a cell resists being bent differently from its neighbours.
          nm.fill(0);
          for (let t = 0; t < tris.length; t += 3) {
            const a = tris[t] * 3, b = tris[t + 1] * 3, c = tris[t + 2] * 3;
            const ux = X[b] - X[a], uy = X[b + 1] - X[a + 1], uz = X[b + 2] - X[a + 2], vx = X[c] - X[a], vy = X[c + 1] - X[a + 1], vz = X[c + 2] - X[a + 2];
            const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
            nm[a] += x; nm[a + 1] += y; nm[a + 2] += z; nm[b] += x; nm[b + 1] += y; nm[b + 2] += z; nm[c] += x; nm[c + 1] += y; nm[c + 2] += z;
          }
          // how far each cell sits from the middle of its linked cells, along the normal
          for (let i = 0; i < n; i++) {
            if (onEdge[i]) continue;
            let cx = 0, cy = 0, cz = 0; const q = nb[i];
            for (const u of q) { cx += X[u * 3]; cy += X[u * 3 + 1]; cz += X[u * 3 + 2]; }
            const l = Math.hypot(nm[i * 3], nm[i * 3 + 1], nm[i * 3 + 2]) || 1; nm[i * 3] /= l; nm[i * 3 + 1] /= l; nm[i * 3 + 2] /= l;
            dev[i] = (cx / q.length - X[i * 3]) * nm[i * 3] + (cy / q.length - X[i * 3 + 1]) * nm[i * 3 + 1] + (cz / q.length - X[i * 3 + 2]) * nm[i * 3 + 2];
          }
          // a cell moves only by how much its own bend differs from its neighbours' bend
          for (let i = 0; i < n; i++) {
            if (onEdge[i] || !free(i)) continue;
            let m = 0, k = 0;
            for (const u of nb[i]) if (!onEdge[u]) { m += dev[u]; k++; }
            if (!k) continue;
            const d = (dev[i] - m / k) * 0.5 * r.stiff;
            X[i * 3] += nm[i * 3] * d; X[i * 3 + 1] += nm[i * 3 + 1] * d; X[i * 3 + 2] += nm[i * 3 + 2] * d;
          }
        }
        if (it % 2 === 0) {
          // unlinked cells give way to each other
          head.fill(-1);
          for (let i = 0; i < n; i++) { const h = hk(Math.floor(X[i * 3] / rep), Math.floor(X[i * 3 + 1] / rep), Math.floor(X[i * 3 + 2] / rep)); nxt[i] = head[h]; head[h] = i; }
          for (let i = 0; i < n; i++) {
            const fi = free(i), gx = Math.floor(X[i * 3] / rep), gy = Math.floor(X[i * 3 + 1] / rep), gz = Math.floor(X[i * 3 + 2] / rep);
            for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) for (let j = head[hk(gx + a, gy + b, gz + c)]; j >= 0; j = nxt[j]) {
              if (j <= i) continue;
              const fj = free(j), ws = (fi ? 1 : 0) + (fj ? 1 : 0); if (!ws) continue;
              const dx = X[i * 3] - X[j * 3], dy = X[i * 3 + 1] - X[j * 3 + 1], dz = X[i * 3 + 2] - X[j * 3 + 2], d2 = dx * dx + dy * dy + dz * dz;
              if (d2 >= rep * rep || d2 < 1e-12 || linkAt.has(key(i, j))) continue;
              const d = Math.sqrt(d2), f = (rep - d) / d / ws;
              if (fi) { X[i * 3] += dx * f; X[i * 3 + 1] += dy * f; X[i * 3 + 2] += dz * f; }
              if (fj) { X[j * 3] -= dx * f; X[j * 3 + 1] -= dy * f; X[j * 3 + 2] -= dz * f; }
            }
          }
        }
        for (let e = 0; e < li.length; e++) {
          const u = li[e]; if (u < 0) continue;
          const v = lj[e], wu = free(u) ? 1 : 0, wv = free(v) ? 1 : 0, ws = wu + wv; if (!ws) continue;
          const dx = X[v * 3] - X[u * 3], dy = X[v * 3 + 1] - X[u * 3 + 1], dz = X[v * 3 + 2] - X[u * 3 + 2], d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-9, f = (d - 1) / d / ws;
          X[u * 3] += dx * f * wu; X[u * 3 + 1] += dy * f * wu; X[u * 3 + 2] += dz * f * wu; X[v * 3] -= dx * f * wv; X[v * 3 + 1] -= dy * f * wv; X[v * 3 + 2] -= dz * f * wv;
        }
        for (let i = 0; i < n; i++) if (X[i * 3 + 1] < 0.01) X[i * 3 + 1] = 0.01;
      }
    }

    // how far links are from their set length: a check that the body has actually settled
    let strain = 0, links = 0;
    for (let e = 0; e < li.length; e++) { if (li[e] < 0) continue; strain += Math.abs(len(sub(P(li[e]), P(lj[e]))) - 1); links++; }
    return { X: Float32Array.from(X), tris: Uint32Array.from(tris), edge, born, history, strain: strain / links, recipe: r };
  }

  const api = { grow, rng, H };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Grow = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
