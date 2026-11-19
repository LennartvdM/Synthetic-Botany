"""An elastic body inside a thick elastic sheet, in a material-point solver (Taichi, MLS-MPM).

Both are elastic solids made of particles; the sheet is the outer layer and is stiffer. The body swells.
A sheet particle stretched past its limit fails: from then on it only resists being squashed. Nothing
says where the sheet fails except a few faint weak streaks.

  python sim/burst.py out_dir [key=value ...]     writes particles as .npy at intervals
"""
import sys, os, math, time
import numpy as np
import taichi as ti

P = dict(grid=64, radius=0.25, thick=0.04, body=120.0, sheet=900.0, swell=1.3, limit=0.3, weak=0.7, flaws=4,
         gravity=3.0, damp=6.0, steps=6000, frames=6, seed=1)
out = sys.argv[1] if len(sys.argv) > 1 else 'sim/out'
for a in sys.argv[2:]:
    k, v = a.split('='); P[k] = type(P[k])(v)
os.makedirs(out, exist_ok=True)
ti.init(arch=ti.cpu, default_fp=ti.f32, random_seed=P['seed'], verbose=False)

n_grid = P['grid']; dx = 1.0 / n_grid; inv_dx = float(n_grid)
rng = np.random.default_rng(P['seed'])
# particles: two a side in every cell of a ball, the outer layer being sheet
s = (np.arange(n_grid * 2) + 0.5) * dx / 2
g = np.stack(np.meshgrid(s, s, s, indexing='ij'), -1).reshape(-1, 3)
c = np.array([0.5, 0.05 + P['radius'] + 0.02, 0.5])
r = np.linalg.norm(g - c, axis=1)
pos = g[r < P['radius']].astype(np.float32); r = r[r < P['radius']]
n = len(pos)
kind = (r > P['radius'] - P['thick']).astype(np.int32)          # 0 body, 1 sheet, 2 failed sheet
# weak streaks on the upper half, running top to bottom
d = (pos - c) / np.maximum(r, 1e-6)[:, None]; weak = np.zeros(n)
for i in range(P['flaws']):
    pol = 0.85 + 0.8 * rng.random(); az = math.tau * i / P['flaws'] + (rng.random() - 0.5) * 0.9
    f = np.array([math.sin(pol) * math.cos(az), math.cos(pol), math.sin(pol) * math.sin(az)])
    e1 = np.array([f[0] * f[1], f[1] * f[1] - 1, f[2] * f[1]]); e1 /= np.linalg.norm(e1); e2 = np.cross(f, e1)
    ang = np.arccos(np.clip(d @ f, -1, 1)); a2 = np.arctan2(d @ e2, d @ e1)
    weak = np.maximum(weak, np.exp(-(ang * np.sin(a2) / (0.07 + 0.05 * rng.random())) ** 2 - (ang * np.cos(a2) / (0.3 + 0.3 * rng.random())) ** 2))
limit = (P['limit'] * (1 - P['weak'] * weak)).astype(np.float32)

p_vol = (dx * 0.5) ** 3; p_mass = p_vol * 1.0
E_max = max(P['body'], P['sheet']); dt = 0.25 * dx / math.sqrt(E_max * 1.5)
nu = 0.35
x = ti.Vector.field(3, ti.f32, n); v = ti.Vector.field(3, ti.f32, n)
C = ti.Matrix.field(3, 3, ti.f32, n); F = ti.Matrix.field(3, 3, ti.f32, n)
mat = ti.field(ti.i32, n); lim = ti.field(ti.f32, n)
grid_v = ti.Vector.field(3, ti.f32, (n_grid,) * 3); grid_m = ti.field(ti.f32, (n_grid,) * 3)
x.from_numpy(pos); mat.from_numpy(kind); lim.from_numpy(limit)
mu_b, la_b = P['body'] / (2 * (1 + nu)), P['body'] * nu / ((1 + nu) * (1 - 2 * nu))
mu_s, la_s = P['sheet'] / (2 * (1 + nu)), P['sheet'] * nu / ((1 + nu) * (1 - 2 * nu))
gravity, damp = P['gravity'], P['damp']

@ti.kernel
def init():
    for p in x:
        F[p] = ti.Matrix.identity(ti.f32, 3)

@ti.kernel
def substep(grow: ti.f32):
    for I in ti.grouped(grid_m):
        grid_v[I] = ti.zero(grid_v[I]); grid_m[I] = 0.0
    for p in x:
        Xp = x[p] * inv_dx; base = int(Xp - 0.5); fx = Xp - base
        w = [0.5 * (1.5 - fx) ** 2, 0.75 - (fx - 1) ** 2, 0.5 * (fx - 0.5) ** 2]
        F[p] = (ti.Matrix.identity(ti.f32, 3) + dt * C[p]) @ F[p]
        gp = 1.0
        if mat[p] == 0: gp = grow                      # the body's size at ease grows
        Fe = F[p] / gp
        U, sig, V = ti.svd(Fe)
        J = sig[0, 0] * sig[1, 1] * sig[2, 2]
        mu, la = mu_b, la_b
        if mat[p] > 0: mu, la = mu_s, la_s
        if mat[p] == 1 and ti.max(sig[0, 0], sig[1, 1], sig[2, 2]) > 1 + lim[p]: mat[p] = 2
        stress = ti.zero(F[p])
        if mat[p] == 2:                                # failed sheet only resists being squashed
            if J > 1:
                F[p] = ti.Matrix.identity(ti.f32, 3)
            else:
                F[p] = ti.Matrix.identity(ti.f32, 3) * ti.pow(J, 1 / 3)
                stress = ti.Matrix.identity(ti.f32, 3) * la * J * (J - 1)
        else:
            stress = 2 * mu * (Fe - U @ V.transpose()) @ Fe.transpose() + ti.Matrix.identity(ti.f32, 3) * la * J * (J - 1)
        affine = (-dt * p_vol * gp ** 3 * 4 * inv_dx * inv_dx) * stress + p_mass * C[p]
        for off in ti.static(ti.ndrange(3, 3, 3)):
            dpos = (ti.Vector(off) - fx) * dx; weight = w[off[0]][0] * w[off[1]][1] * w[off[2]][2]
            grid_v[base + ti.Vector(off)] += weight * (p_mass * v[p] + affine @ dpos); grid_m[base + ti.Vector(off)] += weight * p_mass
    for I in ti.grouped(grid_m):
        if grid_m[I] > 0:
            grid_v[I] = grid_v[I] / grid_m[I] * ti.exp(-dt * damp)
            grid_v[I].y -= dt * gravity
            if I.y < 3: grid_v[I] = ti.zero(grid_v[I])                      # the ground holds what touches it
            for k in ti.static(range(3)):
                if I[k] > n_grid - 3 and grid_v[I][k] > 0: grid_v[I][k] = 0
                if k != 1 and I[k] < 3 and grid_v[I][k] < 0: grid_v[I][k] = 0
    for p in x:
        Xp = x[p] * inv_dx; base = int(Xp - 0.5); fx = Xp - base
        w = [0.5 * (1.5 - fx) ** 2, 0.75 - (fx - 1) ** 2, 0.5 * (fx - 0.5) ** 2]
        nv = ti.zero(v[p]); nC = ti.zero(C[p])
        for off in ti.static(ti.ndrange(3, 3, 3)):
            dpos = (ti.Vector(off) - fx) * dx; weight = w[off[0]][0] * w[off[1]][1] * w[off[2]][2]
            gv = grid_v[base + ti.Vector(off)]; nv += weight * gv; nC += 4 * weight * gv.outer_product(dpos) * inv_dx * inv_dx
        v[p] = nv; x[p] += dt * nv; C[p] = nC

init()
print(f'{n} particles, {int((kind == 1).sum())} of them sheet, dt {dt:.2e}, {P["steps"]} steps', flush=True)
t0 = time.time(); every = P['steps'] // P['frames']
for s_ in range(P['steps'] + 1):
    if s_ % every == 0:
        m = mat.to_numpy(); X = x.to_numpy()
        np.save(f'{out}/x_{s_ // every:02d}.npy', X); np.save(f'{out}/m_{s_ // every:02d}.npy', m)
        print(f'step {s_}: swell {1 + (P["swell"] - 1) * min(1, s_ / (0.7 * P["steps"])):.3f}, failed {int((m == 2).sum())}, finite {bool(np.isfinite(X).all())}, {time.time() - t0:.0f}s', flush=True)
    substep(1 + (P['swell'] - 1) * min(1.0, s_ / (0.7 * P['steps'])))
