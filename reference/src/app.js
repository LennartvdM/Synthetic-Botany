import { build } from './world.js';
import { KINDS, MODS, RECIPES, SITE_N, breed, mutate, defaults, fillParams } from './genome.js';
import { makeRng, hash32, clamp } from './util.js';

const T = window.THREE;
const BG = 0x14242b, GROUND = 0x41565f, ROBOT = 0xe8481c;
const $ = (id) => document.getElementById(id);
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const k in props || {}) {
    const v = props[k];
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, ''); else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c);
  return e;
}

// ------------------------------------------------------------------ kernel (worker with fallback)
class Kernel {
  constructor() { this.q = []; this.busy = false; this.nid = 1; this.where = 'starting'; this.ready = this.boot(); }
  async boot() {
    try {
      const src = $('kernel-src').textContent;
      const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      await new Promise((ok, no) => {
        const t = setTimeout(() => no(new Error('timeout')), 2500);
        w.onmessage = (e) => { if (e.data.pong) { clearTimeout(t); ok(); } };
        w.onerror = (e) => { clearTimeout(t); no(e); };
        w.postMessage({ id: 0, job: 'ping' });
      });
      this.w = w; this.where = 'worker';
    } catch (e) { this.w = null; this.where = 'main thread'; }
  }
  // key: a newer job with the same key replaces a queued one
  run(job, key, onProgress, front) {
    return new Promise((resolve) => {
      if (key) this.q = this.q.filter((j) => { if (j.key === key) { j.resolve(null); return false; } return true; });
      const item = { job, key, resolve, onProgress };
      front ? this.q.unshift(item) : this.q.push(item);
      this.pump();
    });
  }
  drop(prefix) { this.q = this.q.filter((j) => { if (j.key && j.key.startsWith(prefix)) { j.resolve(null); return false; } return true; }); }
  async pump() {
    if (this.busy) return;
    this.busy = true;
    await this.ready;
    while (this.q.length) {
      const it = this.q.shift();
      let out = null;
      try {
        if (this.w) out = await new Promise((ok, no) => {
          const id = this.nid++;
          this.w.onmessage = (e) => { if (e.data.id !== id) return; if (e.data.progress) it.onProgress && it.onProgress(e.data.progress); else if (e.data.error) no(new Error(e.data.error)); else ok(e.data.result); };
          this.w.postMessage({ id, job: it.job });
        });
        else { await new Promise((r) => setTimeout(r, 15)); out = build(it.job, it.onProgress || (() => {})); }
      } catch (e) { out = { error: String(e.message || e) }; }
      it.resolve(out);
    }
    this.busy = false;
  }
}

// ------------------------------------------------------------------ stage
function robotMesh() {
  const g = new T.Group(), m = new T.MeshStandardMaterial({ color: new T.Color(ROBOT).convertSRGBToLinear(), roughness: 0.6 });
  const r = 0.2, body = 0.6;
  const c = new T.Mesh(new T.CylinderGeometry(r, r, body, 20), m); c.position.y = r + body / 2;
  const a = new T.Mesh(new T.SphereGeometry(r, 20, 12), m); a.position.y = r;
  const b = new T.Mesh(new T.SphereGeometry(r, 20, 12), m); b.position.y = r + body;
  g.add(c, a, b); g.traverse((o) => { o.castShadow = true; });
  return g;
}
const STONE = new T.Color(0x6f8791).convertSRGBToLinear(), STONE_DEEP = new T.Color(0x2c3f47).convertSRGBToLinear();
const CLAY = new T.Color(0xe4ddd1).convertSRGBToLinear(), DEEP = new T.Color(0x8a6a62).convertSRGBToLinear();

// how bodies are shown: whole, with the near half removed, or as a thin slice through the middle
let CUT = 'none';

class Stage {
  constructor(canvas, thumb) {
    this.thumb = thumb;
    const r = (this.r = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: !!thumb }));
    r.outputEncoding = T.sRGBEncoding; r.localClippingEnabled = true;
    r.shadowMap.enabled = !thumb; r.shadowMap.type = T.PCFSoftShadowMap;
    const s = (this.scene = new T.Scene());
    s.background = new T.Color(BG);
    this.cam = new T.PerspectiveCamera(36, 1, 0.05, 900);
    s.add(this.cam);
    this.hemi = new T.HemisphereLight(0xeaf2f5, 0x33464e, 0.66); s.add(this.hemi);
    this.key = new T.DirectionalLight(0xfff3e2, 0.6); this.key.castShadow = !thumb; this.key.shadow.mapSize.set(2048, 2048); this.key.shadow.bias = -0.0006;
    s.add(this.key, this.key.target);
    this.head = new T.PointLight(0xfff0dc, 0, 120, 1.2); this.head.position.set(3.5, 3, 1); this.cam.add(this.head);
    this.mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0, side: T.DoubleSide });
    // flat ground: an unlit disc, with a second disc that only catches shadow
    this.ground = new T.Group();
    const disc = new T.Mesh(new T.CircleGeometry(1, 96), new T.MeshBasicMaterial({ color: new T.Color(GROUND).convertSRGBToLinear() }));
    const shade = new T.Mesh(new T.CircleGeometry(1, 96), new T.ShadowMaterial({ opacity: 0.32 }));
    shade.position.z = 0.002; shade.receiveShadow = true;
    this.ground.add(disc, shade);
    this.ground.rotation.x = -Math.PI / 2; s.add(this.ground);
    this.robots = new T.Group(); s.add(this.robots);
    this.mesh = null;
  }
  applyCut() {
    if (!this.cutAt) return;
    const [cz, ext] = this.cutAt, w = ext * 0.012;
    this.mat.clippingPlanes = CUT === 'half' ? [new T.Plane(new T.Vector3(0, 0, -1), cz)] : CUT === 'slice' ? [new T.Plane(new T.Vector3(0, 0, -1), cz + w), new T.Plane(new T.Vector3(0, 0, 1), -(cz - w))] : [];
    this.mat.needsUpdate = true;
  }
  size(w, hh, dpr) { this.r.setPixelRatio(dpr); this.r.setSize(w, hh, false); this.cam.aspect = w / hh; this.cam.updateProjectionMatrix(); }
  show(res, mode) {
    if (this.mesh) { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); }
    const g = new T.BufferGeometry(), n = res.ao.length, col = new Float32Array(n * 3);
    const wall = res.wallVerts || 0;
    for (let i = 0; i < n; i++) {
      const a = Math.pow(res.ao[i], 1.2), l = 0.42 + 0.58 * a;
      // the void's own surface takes the ground tone, so organisms read against it by value alone
      const hi = i < wall ? STONE : CLAY, lo = i < wall ? STONE_DEEP : DEEP;
      col[i * 3] = (lo.r + (hi.r - lo.r) * a) * l; col[i * 3 + 1] = (lo.g + (hi.g - lo.g) * a) * l; col[i * 3 + 2] = (lo.b + (hi.b - lo.b) * a) * l;
    }
    g.setAttribute('position', new T.BufferAttribute(res.pos, 3));
    g.setAttribute('normal', new T.BufferAttribute(res.nrm, 3));
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    g.setIndex(new T.BufferAttribute(res.idx, 1));
    this.mesh = new T.Mesh(g, this.mat);
    this.mesh.castShadow = this.mesh.receiveShadow = mode === 'specimen';
    this.scene.add(this.mesh);
    const b = res.bounds, cx = (b[0] + b[3]) / 2, cy = (b[1] + b[4]) / 2, cz = (b[2] + b[5]) / 2;
    const ext = Math.max(b[3] - b[0], b[4] - b[1], b[5] - b[2]);
    this.cutAt = [cz, ext]; this.applyCut();
    while (this.robots.children.length) this.robots.remove(this.robots.children[0]);
    const cave = mode === 'cavern';
    this.ground.visible = !cave;
    this.scene.fog = cave ? new T.FogExp2(new T.Color(BG).convertSRGBToLinear().getHex(), 0.015) : null;
    this.hemi.intensity = cave ? 0.55 : 0.66; this.key.intensity = cave ? 0 : 0.6; this.head.intensity = cave ? 0.7 : 0;
    this.hemi.groundColor.set(cave ? 0x0c1418 : 0x33464e);
    this.cam.fov = cave ? 62 : 36; this.cam.updateProjectionMatrix();
    this.key.castShadow = !cave && !this.thumb;
    if (cave) {
      for (const p of res.stands) { const m = robotMesh(); m.position.set(p[0], p[1], p[2]); this.robots.add(m); }
      this.frame = { cave: true, views: res.views };
    } else {
      const rad = Math.max(b[3] - cx, cx - b[0], b[5] - cz, cz - b[2]);
      this.ground.scale.setScalar(Math.max(9, rad * 2.6));
      this.key.position.set(cx + ext * 0.7, b[4] + ext * 1.3, cz + ext * 0.9); this.key.target.position.set(cx, cy, cz);
      const sc = this.key.shadow.camera, e = ext * 0.95 + 1;
      sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e; sc.near = 0.1; sc.far = ext * 5 + 10; sc.updateProjectionMatrix();
      const az = 0.5, m = robotMesh();
      m.position.set(cx + Math.sin(az) * (rad + 0.7), 0, cz + Math.cos(az) * (rad + 0.7)); this.robots.add(m);
      const top = Math.max(b[4], 1), mid = top / 2;
      this.frame = { cave: false, target: [cx, mid * 0.95, cz], radius: Math.max(top * 0.62, rad + 0.9) / Math.tan((this.cam.fov * Math.PI) / 360) * 1.12, az };
    }
  }
  render() { this.r.render(this.scene, this.cam); }
}

class Controls {
  constructor(stage, el, onChange) {
    this.s = stage; this.el = el; this.on = onChange; this.mode = 'orbit';
    this.t = new T.Vector3(); this.rad = 10; this.az = 0.5; this.pol = 1.3;
    this.p = new T.Vector3(); this.yaw = 0; this.pitch = 0; this.keys = new Set(); this.hold = 0;
    const pts = new Map(); let pinch = 0;
    el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY, e.button, e.shiftKey]); pinch = 0; });
    el.addEventListener('pointerup', (e) => { pts.delete(e.pointerId); pinch = 0; });
    el.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); pinch = 0; });
    el.addEventListener('pointermove', (e) => {
      const q = pts.get(e.pointerId); if (!q) return;
      const dx = e.clientX - q[0], dy = e.clientY - q[1]; q[0] = e.clientX; q[1] = e.clientY;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch) { if (this.mode === 'orbit') this.rad *= pinch / d; else this.move(0, 0, (d - pinch) * 0.06); }
        pinch = d;
      } else if (this.mode === 'orbit') {
        if (q[2] !== 0 || q[3]) this.pan(dx, dy);
        else { this.az -= dx * 0.008; this.pol = clamp(this.pol - dy * 0.008, 0.08, 3.05); }
      } else { this.yaw -= dx * 0.005; this.pitch = clamp(this.pitch - dy * 0.005, -1.5, 1.5); }
      this.apply();
    });
    el.addEventListener('wheel', (e) => { e.preventDefault(); if (this.mode === 'orbit') this.rad *= Math.exp(e.deltaY * 0.0012); else this.move(0, 0, -e.deltaY * 0.012); this.apply(); }, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('keydown', (e) => { if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; this.keys.add(e.key.toLowerCase()); this.on(); });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
  }
  pan(dx, dy) {
    const c = this.s.cam, k = this.rad * 0.0016;
    const right = new T.Vector3().setFromMatrixColumn(c.matrix, 0), up = new T.Vector3().setFromMatrixColumn(c.matrix, 1);
    this.t.addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
  }
  move(r, u, f) {
    const c = this.s.cam, fw = new T.Vector3(); c.getWorldDirection(fw);
    const right = new T.Vector3().setFromMatrixColumn(c.matrix, 0);
    this.p.addScaledVector(fw, f).addScaledVector(right, r); this.p.y += u;
  }
  setFrame(f) {
    if (f.cave) { this.mode = 'fly'; this.view = 0; this.views = f.views; this.goto(0); }
    else { this.mode = 'orbit'; this.t.set(...f.target); this.rad = f.radius; this.az = f.az; this.pol = 1.36; }
    this.apply();
  }
  goto(i) {
    if (!this.views || !this.views.length) return;
    const v = this.views[((i % this.views.length) + this.views.length) % this.views.length];
    this.view = i; this.p.set(...v.eye);
    const dx = v.look[0] - v.eye[0], dy = v.look[1] - v.eye[1], dz = v.look[2] - v.eye[2];
    this.yaw = Math.atan2(-dx, -dz); this.pitch = Math.atan2(dy, Math.hypot(dx, dz));
    this.apply();
  }
  tick(dt) {
    if (this.mode !== 'fly') return false;
    const k = this.keys, sp = (k.has('shift') ? 16 : 6) * dt;
    let r = 0, u = 0, f = this.hold;
    if (k.has('w') || k.has('arrowup')) f += 1; if (k.has('s') || k.has('arrowdown')) f -= 1;
    if (k.has('d') || k.has('arrowright')) r += 1; if (k.has('a') || k.has('arrowleft')) r -= 1;
    if (k.has('e') || k.has(' ')) u += 1; if (k.has('q')) u -= 1;
    if (!r && !u && !f) return false;
    this.move(r * sp, u * sp, f * sp); this.apply(true);
    return true;
  }
  apply(quiet) {
    const c = this.s.cam;
    if (this.mode === 'orbit') {
      this.rad = clamp(this.rad, 0.5, 400);
      const s = Math.sin(this.pol);
      c.position.set(this.t.x + this.rad * s * Math.sin(this.az), this.t.y + this.rad * Math.cos(this.pol), this.t.z + this.rad * s * Math.cos(this.az));
      c.lookAt(this.t);
    } else { c.position.copy(this.p); c.rotation.set(this.pitch, this.yaw, 0, 'YXZ'); }
    c.updateMatrixWorld();
    if (!quiet) this.on();
  }
}

// ------------------------------------------------------------------ state
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const clone = (o) => JSON.parse(JSON.stringify(o));
const S = {
  habit: 'formula', mode: 'specimen', genome: clone((RECIPES.find((r) => r.name === 'cells') || RECIPES[0]).g), seed: 7, res: 112, sel: [],
  sweep: { src: 'params', x: '', y: '', tiles: [] },
  cav: { kind: 'halls', seed: 3, count: 34, detail: 54, pinned: [], built: false },
};
const saved = store.get('morphoclay', null);
if (saved && saved.genome && KINDS[saved.genome.kind]) { S.genome = saved.genome; S.seed = saved.seed | 0; S.cav.pinned = saved.pinned || []; }

const kernel = new Kernel();
const stage = new Stage($('view'), false);
let dirty = true;
const controls = new Controls(stage, $('view'), () => { dirty = true; });
let thumbStage = null;

function nodeAt(path) { let n = S.genome, kid = null; for (const i of path) { kid = n.kids[i]; n = kid.g; } return { n, kid }; }
function title(g) { let s = g.kind; if (g.mods && g.mods.length) s += ' ⊕ ' + g.mods.map((m) => m.kind).join(' ⊕ '); if (g.kids && g.kids.length) s += ' ▸ ' + g.kids.map((k) => title(k.g)).join(' + '); return s; }
function status(t, busy) { $('status').textContent = t; $('status').classList.toggle('busy', !!busy); }

let buildTimer = 0, lastFrameKey = '';
function rebuild(reframe) {
  store.set('morphoclay', { genome: S.genome, seed: S.seed, pinned: S.cav.pinned });
  $('json').value = JSON.stringify({ seed: S.seed, genome: S.genome });
  if (S.mode !== 'specimen') return;
  clearTimeout(buildTimer);
  buildTimer = setTimeout(async () => {
    status('shaping…', true);
    const res = await kernel.run({ mode: 'specimen', genome: clone(S.genome), seed: S.seed, res: S.res }, 'main', null, true);
    if (!res || S.mode !== 'specimen') return;
    if (res.error) { status('could not build: ' + res.error.split('\n')[0]); return; }
    stage.show(res, 'specimen');
    S.last = res;
    const fk = title(S.genome);
    if (reframe || fk !== lastFrameKey) controls.setFrame(stage.frame);
    lastFrameKey = fk; dirty = true;
    const st = res.stats;
    status(`${st.nodes} node${st.nodes > 1 ? 's' : ''} · ${st.prims.toLocaleString()} primitives · ${Math.round(st.tris / 1000)}k triangles · ${(st.ms / 1000).toFixed(1)} s · ${kernel.where}${st.truncated ? ' · truncated at budget' : ''}${st.crossing ? ` · inside another bell ${st.crossing.raw ? st.crossing.raw[0] + '% → ' : ''}${st.crossing.final[0]}% · mislayered ${st.crossing.raw ? st.crossing.raw[1] + '% → ' : ''}${st.crossing.final[1]}%` : ''}`);
  }, 90);
}

// ------------------------------------------------------------------ panel: specimen
function slider(label, sch, value, onInput, id) {
  if (typeof sch[0] === 'string') {
    const sel = h('select', { id, onchange: (e) => onInput(e.target.value) }, sch.map((o) => h('option', { value: o, selected: o === value, text: o })));
    return h('label', { class: 'row' }, h('span', { class: 'k', text: label }), sel);
  }
  const step = sch[3] ? 1 : (sch[1] - sch[0]) / 200;
  const out = h('span', { class: 'v', text: fmt(value) });
  const inp = h('input', { id, type: 'range', min: sch[0], max: sch[1], step, value, oninput: (e) => { const v = +e.target.value; out.textContent = fmt(v); onInput(v); } });
  return h('label', { class: 'row' }, h('span', { class: 'k', text: label }), inp, out);
}
const fmt = (v) => (Math.abs(v) >= 100 || Number.isInteger(v) ? String(Math.round(v)) : Math.abs(v) < 0.1 ? v.toFixed(3) : v.toFixed(2));

function renderTree() {
  const box = $('tree'); box.textContent = '';
  const walk = (g, path, kid) => {
    const selected = path.join() === S.sel.join();
    const row = h('button', { class: 'node' + (selected ? ' on' : ''), style: `padding-left:${8 + path.length * 14}px`, onclick: () => { S.sel = path; renderPanel(); } },
      h('span', { class: 'kind', text: g.kind }),
      kid ? h('span', { class: 'at', text: `at ${kid.at} ×${kid.n ?? 'all'}` }) : h('span', { class: 'at', text: 'root · ' + KINDS[g.kind].dim }),
      g.mods && g.mods.length ? h('span', { class: 'at', text: '⊕ ' + g.mods.map((m) => m.kind).join(' ') }) : null);
    box.append(row);
    (g.kids || []).forEach((k, i) => walk(k.g, path.concat(i), k));
  };
  walk(S.genome, [], null);
}

function renderPanel() {
  renderTree();
  const { n, kid } = nodeAt(S.sel), K = KINDS[n.kind], box = $('node'); box.textContent = '';
  n.p = fillParams(K.schema, n.p);
  const pid = 'n' + S.sel.join('-');
  box.append(h('div', { class: 'row' }, h('span', { class: 'k', text: 'skeleton' }),
    h('select', { id: pid + '-kind', onchange: (e) => { n.kind = e.target.value; n.p = defaults(KINDS[n.kind].schema); n.kids = []; renderPanel(); rebuild(true); } }, Object.keys(KINDS).map((k) => h('option', { value: k, selected: k === n.kind, text: `${k} (${KINDS[k].dim})` }))),
    S.sel.length ? h('button', { class: 'ghost', title: 'Remove this node', onclick: () => { const par = nodeAt(S.sel.slice(0, -1)).n; par.kids.splice(S.sel[S.sel.length - 1], 1); S.sel = S.sel.slice(0, -1); renderPanel(); rebuild(true); }, text: 'remove' }) : null));
  if (kid) {
    const parent = nodeAt(S.sel.slice(0, -1)).n, tags = KINDS[parent.kind].sites;
    box.append(h('div', { class: 'group' }, h('div', { class: 'gh', text: 'attachment to parent' }),
      slider('site', tags, kid.at, (v) => { kid.at = v; kid.n = Math.min(kid.n ?? 99, SITE_N[v][1]); renderTree(); rebuild(); }, pid + '-at'),
      slider('count', [1, Math.max(2, SITE_N[kid.at][1] * 2), kid.n ?? SITE_N[kid.at][1], 1], kid.n ?? SITE_N[kid.at][1], (v) => { kid.n = v; renderTree(); rebuild(); }, pid + '-n'),
      slider('scale', [0.3, 3.5, 1], kid.scale ?? 1, (v) => { kid.scale = v; rebuild(); }, pid + '-scale'),
      slider('gravity', [-1, 1, 0], kid.up || 0, (v) => { kid.up = v; rebuild(); }, pid + '-up'),
      slider('from', [0, 1, 0], kid.from ?? 0, (v) => { kid.from = v; rebuild(); }, pid + '-from'),
      slider('to', [0, 1, 1], kid.to ?? 1, (v) => { kid.to = v; rebuild(); }, pid + '-to'),
      kid.grad ? h('span', { class: 'hint', text: 'graded along the parent: ' + Object.keys(kid.grad).map((k) => `${k} ${kid.grad[k][0]}→${kid.grad[k][1]}`).join(', ') }) : null));
  }
  const g = h('div', { class: 'group' }, h('div', { class: 'gh', text: n.kind + ' parameters' }));
  for (const k in K.schema) g.append(slider(k, K.schema[k], n.p[k], (v) => { n.p[k] = v; rebuild(); }, pid + '-p-' + k));
  box.append(g);
  (n.mods || []).forEach((m, mi) => {
    const M = MODS[m.kind]; m.p = fillParams(M.schema, m.p);
    const mg = h('div', { class: 'group' }, h('div', { class: 'gh' }, h('span', { text: '⊕ ' + m.kind }), h('button', { class: 'ghost', onclick: () => { n.mods.splice(mi, 1); renderPanel(); rebuild(); }, text: 'remove' })));
    for (const k in M.schema) mg.append(slider(k, M.schema[k], m.p[k], (v) => { m.p[k] = v; rebuild(); }, `${pid}-m${mi}-${k}`));
    box.append(mg);
  });
  const addMod = h('select', { id: pid + '-addmod', onchange: (e) => { if (!e.target.value) return; (n.mods ??= []).push({ kind: e.target.value, p: defaults(MODS[e.target.value].schema) }); renderPanel(); rebuild(); } }, h('option', { value: '', text: '+ surface modifier' }), Object.keys(MODS).map((k) => h('option', { value: k, text: k })));
  const addKid = h('select', { id: pid + '-addkid', onchange: (e) => {
    if (!e.target.value) return;
    const [at, kind] = e.target.value.split('|');
    (n.kids ??= []).push({ at, n: Math.round((SITE_N[at][0] + SITE_N[at][1]) / 2), scale: 1.2, g: { kind, p: defaults(KINDS[kind].schema) } });
    S.sel = S.sel.concat(n.kids.length - 1); renderPanel(); rebuild(true);
  } }, h('option', { value: '', text: '+ grow something at…' }), K.sites.map((at) => h('optgroup', { label: 'at ' + at }, Object.keys(KINDS).map((k) => h('option', { value: at + '|' + k, text: `${k} at ${at}` })))));
  box.append(h('div', { class: 'adders' }, S.sel.length < 3 ? addKid : null, addMod));
  // sweep axes follow the selected node
  const nums = Object.keys(K.schema).filter((k) => typeof K.schema[k][0] !== 'string');
  if (!nums.includes(S.sweep.x)) S.sweep.x = nums[0];
  if (!nums.includes(S.sweep.y) || S.sweep.y === S.sweep.x) S.sweep.y = nums.find((k) => k !== S.sweep.x) || nums[0];
  for (const ax of ['x', 'y']) {
    const sel = $('sweep-' + ax); sel.textContent = '';
    nums.forEach((k) => sel.append(h('option', { value: k, selected: k === S.sweep[ax], text: k })));
  }
  $('sweep-node').textContent = n.kind;
  $('seed').value = S.seed;
}

// ------------------------------------------------------------------ sweep
function tileCanvas() {
  if (!thumbStage) { thumbStage = new Stage(h('canvas'), true); thumbStage.size(300, 300, 1); thumbStage.ctl = new Controls(thumbStage, h('div'), () => {}); }
  return thumbStage;
}
async function runSweep() {
  kernel.drop('tile');
  const grid = $('grid'); grid.textContent = '';
  const { n } = nodeAt(S.sel), K = KINDS[n.kind], src = S.sweep.src, gen = (S.sweep.gen = (S.sweep.gen || 0) + 1);
  const tiles = [];
  for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) {
    let g, seed = S.seed, label;
    if (src === 'params') {
      g = clone(S.genome);
      let t = g; for (const q of S.sel) t = t.kids[q].g;
      const sx = K.schema[S.sweep.x], sy = K.schema[S.sweep.y];
      let vx = sx[0] + ((sx[1] - sx[0]) * i) / 4, vy = sy[0] + ((sy[1] - sy[0]) * j) / 4;
      if (sx[3]) vx = Math.round(vx); if (sy[3]) vy = Math.round(vy);
      t.p[S.sweep.x] = vx; t.p[S.sweep.y] = vy;
      label = `${S.sweep.x} ${fmt(vx)} · ${S.sweep.y} ${fmt(vy)}`;
    } else if (src === 'mutants') {
      g = i === 2 && j === 2 ? clone(S.genome) : mutate(S.genome, makeRng(hash32(S.seed, gen, i + j * 5)), 0.1 + 0.05 * Math.max(Math.abs(i - 2), Math.abs(j - 2)));
      label = i === 2 && j === 2 ? 'current' : 'mutant';
    } else if (src === 'recipes') {
      const r = RECIPES[i + j * 5]; if (!r) continue;
      g = clone(r.g); label = r.name;
    } else { g = breed(makeRng(hash32(Date.now() & 0xffffff, gen, i + j * 5)), 0, null, { stemless: S.habit === 'stemless', formula: S.habit === 'formula' }); seed = hash32(gen, i, j) % 1000; label = title(g); }
    const img = h('img', { alt: label }), tile = h('button', { class: 'tile wait', title: label, onclick: () => { S.genome = clone(g); S.seed = seed; S.sel = src === 'params' ? S.sel : []; setMode('specimen'); renderPanel(); rebuild(true); } }, img, h('span', { class: 'cap', text: label }));
    grid.append(tile); tiles.push({ g, seed, img, tile });
  }
  const total = tiles.length;
  status(`sweeping ${total} variants…`, true);
  let done = 0;
  await Promise.all(tiles.map((t, i) => kernel.run({ mode: 'specimen', genome: t.g, seed: t.seed, res: 60, maxPrims: 120000, maxDirect: 400000 }, 'tile' + i).then((res) => {
    if (!res || gen !== S.sweep.gen) return;
    t.tile.classList.remove('wait');
    if (res.error) { t.tile.classList.add('bad'); return; }
    const ts = tileCanvas(); ts.show(res, 'specimen'); ts.ctl.setFrame(ts.frame);
    if (CUT !== 'none') { ts.ctl.az = 0; ts.ctl.pol = CUT === 'slice' ? 1.5 : 1.3; ts.ctl.apply(); }
    ts.render();
    t.img.src = ts.r.domElement.toDataURL('image/jpeg', 0.88);
    done++; status(`sweep ${done}/${total}`, done < total);
  })));
  if (gen === S.sweep.gen) status('sweep complete · click a tile to adopt it');
}

// ------------------------------------------------------------------ cavern
async function growCavern() {
  status('growing a cavern, about ten seconds…', true);
  $('grow').disabled = true;
  const c = S.cav;
  const res = await kernel.run({ mode: 'cavern', kind: c.kind, seed: c.seed, count: c.count, organismRes: c.detail, stemless: S.habit === 'stemless', formula: S.habit === 'formula', species: c.pinned.length ? clone(c.pinned.map((p) => p.g)) : null }, 'cavern', (m) => status(m + '…', true), true);
  $('grow').disabled = false;
  if (!res || S.mode !== 'cavern') return;
  if (res.error) { status('could not build: ' + res.error.split('\n')[0]); return; }
  stage.show(res, 'cavern'); controls.setFrame(stage.frame); c.built = true; dirty = true;
  const st = res.stats;
  status(`${st.organisms} organisms of ${res.species.length} species · ${(st.tris / 1e6).toFixed(2)}M triangles · ${(st.ms / 1000).toFixed(1)} s · drag to look, WASD or scroll to move`);
  const list = $('species'); list.textContent = '';
  res.species.forEach((g) => list.append(h('button', { class: 'chip', title: 'Open this species as a specimen', onclick: () => { S.genome = clone(g); S.sel = []; setMode('specimen'); renderPanel(); rebuild(true); }, text: title(g) })));
}
function renderPinned() {
  const box = $('pinned'); box.textContent = '';
  if (!S.cav.pinned.length) box.append(h('span', { class: 'hint', text: 'None pinned, so each cavern breeds five species of its own.' }));
  S.cav.pinned.forEach((p, i) => box.append(h('span', { class: 'chip' }, title(p.g), h('button', { class: 'x', 'aria-label': 'Unpin', onclick: () => { S.cav.pinned.splice(i, 1); renderPinned(); rebuild(); }, text: '×' }))));
}

// ------------------------------------------------------------------ modes and wiring
function setMode(m) {
  S.mode = m;
  for (const b of document.querySelectorAll('#modes button')) b.classList.toggle('on', b.dataset.mode === m);
  for (const p of document.querySelectorAll('[data-pane]')) p.hidden = p.dataset.pane !== m;
  $('grid').hidden = m !== 'sweep'; $('fly').hidden = m !== 'cavern';
  if (m === 'specimen') { lastFrameKey = ''; rebuild(true); }
  if (m === 'sweep') runSweep();
  if (m === 'cavern') { renderPinned(); if (S.cav.built) growCavern(); else status('choose a void and press Grow cavern'); }
}
for (const b of document.querySelectorAll('#modes button')) b.addEventListener('click', () => setMode(b.dataset.mode));

const recipeSel = $('recipe');
recipeSel.append(h('option', { value: '', text: 'recipes…' }), ...RECIPES.map((r, i) => h('option', { value: i, text: r.name })));
recipeSel.addEventListener('change', () => { if (recipeSel.value === '') return; S.genome = clone(RECIPES[+recipeSel.value].g); S.sel = []; recipeSel.value = ''; renderPanel(); rebuild(true); });
$('habit').addEventListener('change', (e) => { S.habit = e.target.value; });
$('breed').addEventListener('click', () => { S.genome = breed(makeRng((Math.random() * 1e9) | 0), 0, null, { stemless: S.habit === 'stemless', formula: S.habit === 'formula' }); S.seed = (Math.random() * 1000) | 0; S.sel = []; renderPanel(); rebuild(true); });
$('mutate').addEventListener('click', () => { S.genome = mutate(S.genome, makeRng((Math.random() * 1e9) | 0), 0.14); renderPanel(); rebuild(); });
$('seed').addEventListener('input', (e) => { S.seed = +e.target.value | 0; rebuild(); });
$('reseed').addEventListener('click', () => { S.seed = (Math.random() * 10000) | 0; $('seed').value = S.seed; rebuild(); });
$('cut').addEventListener('change', (e) => { CUT = e.target.value; stage.applyCut(); if (CUT !== 'none') { controls.az = 0; controls.pol = CUT === 'slice' ? 1.5 : 1.3; controls.apply(); } dirty = true; });
$('res').addEventListener('change', (e) => { S.res = +e.target.value; rebuild(); });
$('copy').addEventListener('click', async () => { const t = $('json'); try { await navigator.clipboard.writeText(t.value); $('copy').textContent = 'Copied'; } catch (e) { t.select(); $('copy').textContent = 'Selected, press Ctrl+C'; } setTimeout(() => ($('copy').textContent = 'Copy genome'), 1600); });
$('apply').addEventListener('click', () => {
  try { const o = JSON.parse($('json').value), g = o.genome || o; if (!KINDS[g.kind]) throw new Error('unknown skeleton'); S.genome = g; if (Number.isFinite(o.seed)) S.seed = o.seed | 0; S.sel = []; renderPanel(); rebuild(true); }
  catch (e) { status('That genome did not parse: ' + e.message); }
});
$('sweep-src').addEventListener('change', (e) => { S.sweep.src = e.target.value; $('axes').hidden = S.sweep.src !== 'params'; runSweep(); });
$('sweep-x').addEventListener('change', (e) => { S.sweep.x = e.target.value; runSweep(); });
$('sweep-y').addEventListener('change', (e) => { S.sweep.y = e.target.value; runSweep(); });
$('sweep-run').addEventListener('click', runSweep);
$('cav-kind').addEventListener('change', (e) => (S.cav.kind = e.target.value));
$('cav-seed').addEventListener('input', (e) => (S.cav.seed = +e.target.value | 0));
$('cav-count').addEventListener('input', (e) => { S.cav.count = +e.target.value; $('cav-count-v').textContent = e.target.value; });
$('cav-detail').addEventListener('change', (e) => (S.cav.detail = +e.target.value));
$('grow').addEventListener('click', growCavern);
$('pin').addEventListener('click', () => { S.cav.pinned.push({ g: clone(S.genome) }); renderPinned(); rebuild(); status('pinned ' + title(S.genome) + ' for the next cavern'); });
$('next-view').addEventListener('click', () => controls.goto((controls.view || 0) + 1));
for (const [id, dir] of [['fwd', 1], ['back', -1]]) {
  const b = $(id);
  b.addEventListener('pointerdown', () => { controls.hold = dir; dirty = true; });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => (controls.hold = 0));
}

function fit() {
  const el = $('stage'), w = el.clientWidth, hh = el.clientHeight;
  if (!w || !hh) return;
  stage.size(w, hh, Math.min(devicePixelRatio || 1, 2)); dirty = true;
}
new ResizeObserver(fit).observe($('stage'));
let prev = performance.now();
function loop(t) {
  const dt = Math.min(0.05, (t - prev) / 1000); prev = t;
  if (controls.tick(dt)) dirty = true;
  if (dirty) { dirty = false; stage.render(); }
  requestAnimationFrame(loop);
}
fit(); renderPanel(); renderPinned(); setMode('specimen'); requestAnimationFrame(loop);
window.__morpho = { setCut: (v) => { $('cut').value = v; $('cut').dispatchEvent(new Event('change')); }, S, stage, controls, kernel, setMode, growCavern, runSweep, renderPanel, rebuild };
