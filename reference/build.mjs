// Bundles the kernel (worker) and the app into one self-contained page.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const bundle = async (entry) => (await build({ entryPoints: [entry], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', charset: 'utf8' })).outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const [kernel, app] = await Promise.all([bundle('src/worker.js'), bundle('src/app.js')]);
const html = readFileSync('src/index.template.html', 'utf8').replace('/*KERNEL*/', () => kernel).replace('/*APP*/', () => app);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/morphoclay.html', html);
console.log('dist/morphoclay.html', (html.length / 1024).toFixed(0) + ' KB');
