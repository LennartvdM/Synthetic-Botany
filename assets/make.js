// Write the masters to disk: one folder per specimen, one OBJ per role, plus where the flourishes sit.
//   node assets/make.js            all kinds, all specimens
//   node assets/make.js 0          kind 0 only
//   node assets/make.js 0 2        kind 0, specimen 2
// Output goes to assets/out/ (not kept in git; it is rebuilt from this code).
const fs = require('fs'), path = require('path');
const Kinds = require('./kinds.js');
const [kArg, sArg] = process.argv.slice(2).map(Number);
Kinds.kinds.forEach((K, ki) => {
  if (kArg !== undefined && !isNaN(kArg) && kArg !== ki) return;
  for (let si = 0; si < K.specimens; si++) {
    if (sArg !== undefined && !isNaN(sArg) && sArg !== si) continue;
    const S = Kinds.specimen(ki, si), dir = path.join(__dirname, 'out', K.name.replace(/ /g, '-'), 'specimen-' + (si + 1));
    fs.mkdirSync(dir, { recursive: true });
    let total = 0;
    for (const p of S.parts) {
      const lines = ['# ' + K.name + ', specimen ' + (si + 1) + ', ' + p.role + '. y is up; all parts of a specimen share one origin.'];
      for (let i = 0; i < p.pos.length; i += 3) lines.push('v ' + p.pos[i].toFixed(4) + ' ' + p.pos[i + 1].toFixed(4) + ' ' + p.pos[i + 2].toFixed(4));
      for (let i = 0; i < p.nrm.length; i += 3) lines.push('vn ' + p.nrm[i].toFixed(3) + ' ' + p.nrm[i + 1].toFixed(3) + ' ' + p.nrm[i + 2].toFixed(3));
      for (let i = 0; i < p.idx.length; i += 3) { const a = p.idx[i] + 1, b = p.idx[i + 1] + 1, c = p.idx[i + 2] + 1; lines.push('f ' + a + '//' + a + ' ' + b + '//' + b + ' ' + c + '//' + c); }
      fs.writeFileSync(path.join(dir, p.role + '.obj'), lines.join('\n') + '\n'); total += p.idx.length / 3;
    }
    fs.writeFileSync(path.join(dir, 'flourish-placements.json'), JSON.stringify(S.placements, null, 1));
    console.log(K.name + ' specimen ' + (si + 1) + ': ' + Math.round(total / 1000) + 'k triangles, ' + S.placements.length + ' flourishes -> ' + path.relative(process.cwd(), dir));
  }
});
