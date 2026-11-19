// Runs every combination of the five switches across the machine's cores, then draws one contact sheet.
// Rows: split and twist. Columns: stiffness, resist, grip. Each cell: the ball's outer face seen from outside,
// the post cut across at the ball, and the measures.
//   node runs/012-manifold/manifold.js out.svg [seed]
'use strict';
const { Worker, isMainThread, parentPort } = require('worker_threads'), fs = require('fs'), os = require('os'), path = require('path');
if (!isMainThread) { const { run } = require('./cables.js'); parentPort.on('message', (rec) => { const b = run(rec); parentPort.postMessage({ rec, c: b.c, m: b.m, cables: b.cables }); }); return; }
const [out, seedArg] = process.argv.slice(2), seed = +(seedArg || 1), recs = [];
for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) recs.push({ seed, split: row >> 1 & 1, twist: (row & 1) * 0.5, stiff: col >> 2 & 1, resist: col >> 1 & 1, grip: col & 1, row, col });
const results = []; let next = 0;
const done = new Promise((resolve) => { const n = Math.min(os.cpus().length, 4); let live = n;
  for (let w = 0; w < n; w++) { const wk = new Worker(__filename); const feed = () => { if (next < recs.length) wk.postMessage(recs[next++]); else { wk.terminate(); if (--live === 0) resolve(); } };
    wk.on('message', (res) => { results.push(res); process.stderr.write(`${results.length}/${recs.length} `); feed(); }); feed(); } });
done.then(() => {
  const CW = 240, CH = 600, sc = 266, ink = '#3b3230', shade = (r) => { const t = Math.pow(Math.max(0, Math.min(1, (r - 0.007) / 0.057)), 0.7), v = Math.round(240 - 160 * t); return `rgb(${v},${Math.round(v * 0.95)},${Math.round(v * 0.88)})`; };
  let svg = '';
  for (const res of results) { const { rec, c, m, cables } = res, x0 = rec.col * CW, y0 = rec.row * CH + 40, cx = x0 + CW / 2, fy = y0 + 30 + 165, id = `c${rec.row}${rec.col}`;
    svg += `<clipPath id="${id}"><rect x="${x0}" y="${y0 + 30}" width="${CW}" height="330"/></clipPath><g clip-path="url(#${id})">`;
    // the ball's outer face, seen from outside: across is z, up is y, nearer is larger x. Cables drawn in short pieces, far ones first.
    const pieces = []; for (const s of cables) for (let k = 0; k < s.n - 1; k += 3) { const e = Math.min(s.n - 1, k + 3); if (Math.abs(s.X[k * 3 + 1] - c[1]) > 0.75) continue; let dep = 0, pts = []; for (let q = k; q <= e; q++) { dep += s.X[q * 3]; pts.push(`${(cx + s.X[q * 3 + 2] * sc).toFixed(1)} ${(fy - (s.X[q * 3 + 1] - c[1]) * sc).toFixed(1)}`); } pieces.push({ d: dep / (e - k + 1), p: 'M' + pts.join('L'), r: s.r[Math.min(s.n - 1, k + 1)] }); }
    pieces.sort((a, b) => a.d - b.d); let ball = false;
    for (const q of pieces) { if (!ball && q.d > c[0]) { svg += `<circle cx="${(cx + c[2] * sc).toFixed(1)}" cy="${fy}" r="${(0.2 * sc).toFixed(1)}" fill="#ffe9b8" stroke="${ink}" stroke-width="0.6"/>`; ball = true; } const w = 2 * q.r * sc; svg += `<path d="${q.p}" stroke="${ink}" stroke-width="${(w + 1).toFixed(1)}" stroke-linejoin="round"/><path d="${q.p}" stroke="${shade(q.r)}" stroke-width="${w.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`; }
    if (!ball) svg += `<circle cx="${(cx + c[2] * sc).toFixed(1)}" cy="${fy}" r="${(0.2 * sc).toFixed(1)}" fill="#ffe9b8" stroke="${ink}" stroke-width="0.6"/>`;
    svg += `</g>`;
    // cut across at the ball, seen from above: across is z, down the page is -x (so the ball's outer side is up)
    const sy = y0 + 30 + 330 + 100; svg += `<circle cx="${(cx + c[2] * sc * 0.6).toFixed(1)}" cy="${(sy - c[0] * sc * 0.6).toFixed(1)}" r="${(0.2 * sc * 0.6).toFixed(1)}" fill="#ffe9b8" stroke="${ink}" stroke-width="0.6"/>`;
    for (const s of cables) { let best = -1, bd = 0.03; for (let k = 0; k < s.n; k++) { const e = Math.abs(s.X[k * 3 + 1] - c[1]); if (e < bd) { bd = e; best = k; } } if (best < 0) continue; svg += `<circle cx="${(cx + s.X[best * 3 + 2] * sc * 0.6).toFixed(1)}" cy="${(sy - s.X[best * 3] * sc * 0.6).toFixed(1)}" r="${Math.max(0.6, s.r[best] * sc * 0.6).toFixed(1)}" fill="${shade(s.r[best])}" stroke="${ink}" stroke-width="0.4"/>`; }
    const lit = (on, ch) => `<tspan fill="${on ? '#ffe9b8' : '#5d7480'}">${ch}</tspan>`;
    svg += `<text x="${cx}" y="${y0 + 20}" text-anchor="middle" font-size="15" font-weight="bold">${lit(rec.stiff, 'S')} ${lit(rec.resist, 'R')} ${lit(rec.grip, 'G')} ${lit(rec.twist, 'T')} ${lit(rec.split, 'X')}</text>`;
    svg += `<text x="${x0 + 10}" y="${y0 + CH - 50}" font-size="10.5" fill="#c9d6da">face: ${m.thin} thin ${m.mid} mid ${m.thick} thick</text><text x="${x0 + 10}" y="${y0 + CH - 35}" font-size="10.5" fill="#c9d6da">crossings ${m.crossings}  forks ${m.forks}</text><text x="${x0 + 10}" y="${y0 + CH - 20}" font-size="10.5" fill="#c9d6da">thin nearest ${m.grad.toFixed(2)}  ball out ${m.out.toFixed(2)}</text>`;
  }
  for (let col = 1; col < 8; col++) svg += `<path d="M${col * CW} 40V${40 + 4 * CH}" stroke="#2c3d44"/>`; for (let row = 1; row < 4; row++) svg += `<path d="M0 ${40 + row * CH}H${8 * CW}" stroke="#2c3d44"/>`;
  svg += `<text x="12" y="26" font-size="13" fill="#d9e2e3">S stiffness by girth  R resist  G grip  T twist  X split   (lit = on)   seed ${seed}</text>`;
  fs.writeFileSync(out, `<svg xmlns="http://www.w3.org/2000/svg" width="${8 * CW}" height="${40 + 4 * CH}" font-family="ui-monospace, Menlo, monospace" fill="none"><rect width="100%" height="100%" fill="#41565f"/>${svg}</svg>`);
  // the table, and what each switch does on average with the others in every state
  const rows = results.map((q) => ({ ...q.rec, ...q.m })).sort((a, b) => a.row * 8 + a.col - (b.row * 8 + b.col)), keys = ['thin', 'mid', 'thick', 'crossings', 'forks', 'grad', 'out'];
  let txt = 'S R G T X | ' + keys.join(' ') + '\n' + rows.map((q) => [q.stiff, q.resist, q.grip, q.twist ? 1 : 0, q.split].join(' ') + ' | ' + keys.map((k) => (+q[k]).toFixed(k === 'grad' || k === 'out' ? 2 : 0)).join(' ')).join('\n');
  txt += '\n\nmean with the switch on minus mean with it off:\n' + ['stiff', 'resist', 'grip', 'twist', 'split'].map((sw) => sw.padEnd(7) + keys.map((k) => { const on = rows.filter((q) => q[sw]), off = rows.filter((q) => !q[sw]), mean = (A) => A.reduce((v, q) => v + q[k], 0) / A.length; return `${k} ${(mean(on) - mean(off)).toFixed(2)}`; }).join('  ')).join('\n');
  fs.writeFileSync(out.replace(/\.svg$/, '.txt'), txt + '\n'); console.log('\n' + txt);
});
