#!/usr/bin/env node
// Build a specimen or a cavern without a browser and write it as a Wavefront OBJ.
//   node cli.mjs specimen genome.json out.obj [--seed 7] [--res 160] [--scale 5]
//   node cli.mjs recipe "arbor ▸ lamella" out.obj
//   node cli.mjs cavern halls out.obj [--seed 3] [--count 34] [--detail 54]
//   node cli.mjs breed out.obj [--seed 12]          (also prints the genome it bred)
import { readFileSync, writeFileSync } from 'node:fs';
import { build } from './src/world.js';
import { RECIPES, breed } from './src/genome.js';
import { makeRng } from './src/util.js';

const args = process.argv.slice(2), flags = {};
for (let i = args.length - 2; i >= 0; i--) if (args[i].startsWith('--')) { flags[args[i].slice(2)] = +args[i + 1]; args.splice(i, 2); }
const [cmd, a, b] = args;
let job, out;
if (cmd === 'specimen') { const j = JSON.parse(readFileSync(a, 'utf8')); job = { mode: 'specimen', genome: j.genome || j, seed: flags.seed ?? j.seed ?? 1, res: flags.res ?? 160, scale: flags.scale ?? 5 }; out = b; }
else if (cmd === 'recipe') { const k = (t) => t.replace(/[^a-z]+/g, ' ').trim(), r = RECIPES.find((r) => k(r.name) === k(a)); if (!r) { console.error('recipes: ' + RECIPES.map((r) => r.name).join(', ')); process.exit(1); } job = { mode: 'specimen', genome: r.g, seed: flags.seed ?? 7, res: flags.res ?? 160, scale: flags.scale ?? 5 }; out = b; }
else if (cmd === 'breed') { const g = breed(makeRng(flags.seed ?? 1)); console.log(JSON.stringify({ seed: flags.seed ?? 1, genome: g })); job = { mode: 'specimen', genome: g, seed: flags.seed ?? 1, res: flags.res ?? 160, scale: flags.scale ?? 5 }; out = a; }
else if (cmd === 'cavern') { job = { mode: 'cavern', kind: a, seed: flags.seed ?? 3, count: flags.count ?? 34, organismRes: flags.detail ?? 54 }; out = b; }
else { console.error(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 6).join('\n')); process.exit(1); }

const m = build(job, (s) => console.error(s));
const lines = ['# morphoclay ' + JSON.stringify(m.stats)];
for (let i = 0; i < m.pos.length; i += 3) lines.push(`v ${m.pos[i].toFixed(4)} ${m.pos[i + 1].toFixed(4)} ${m.pos[i + 2].toFixed(4)}`);
for (let i = 0; i < m.idx.length; i += 3) lines.push(`f ${m.idx[i] + 1} ${m.idx[i + 1] + 1} ${m.idx[i + 2] + 1}`);
writeFileSync(out, lines.join('\n') + '\n');
console.error(`${out}: ${m.pos.length / 3} vertices, ${m.idx.length / 3} triangles, y is up, 1 unit = one robot height`);
