"""Turn saved particles into two surfaces: the sheet, and the body.

  python sim/skin.py frames_dir frame_number out.json
"""
import sys, json
import numpy as np
from scipy.ndimage import gaussian_filter
from skimage.measure import marching_cubes

d, k, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
X = np.load(f'{d}/x_{k:02d}.npy'); m = np.load(f'{d}/m_{k:02d}.npy')
R = 160

def surface(pts, blur, level):
    g = np.zeros((R,) * 3, np.float32)
    i = np.clip((pts * R).astype(int), 0, R - 1); np.add.at(g, (i[:, 0], i[:, 1], i[:, 2]), 1)
    g = gaussian_filter(g, blur)
    v, f, nrm, _ = marching_cubes(g, level * g.max())
    return {'pos': np.round((v + 0.5) / R, 5).ravel().tolist(), 'idx': f.ravel().tolist()}

# the sheet is whatever sheet particles have not failed; failed ones are left out of both surfaces
json.dump({'sheet': surface(X[m == 1], 2.0, 0.35), 'body': surface(X[m == 0], 2.0, 0.35), 'failed': int((m == 2).sum()), 'n': len(m)}, open(out, 'w'))
