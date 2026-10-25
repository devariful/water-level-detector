import { mkdir, copyFile, readdir } from 'node:fs/promises';
const target = new URL('../public/ocr/', import.meta.url);
await mkdir(new URL('core/', target), { recursive: true });
await copyFile(new URL('../node_modules/tesseract.js/dist/worker.min.js', import.meta.url), new URL('worker.min.js', target));
const core = new URL('../node_modules/tesseract.js-core/', import.meta.url);
for (const name of await readdir(core)) if (/\.wasm(\.js)?$/.test(name)) await copyFile(new URL(name, core), new URL(`core/${name}`, target));
await copyFile(new URL('../node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz', import.meta.url), new URL('eng.traineddata.gz', target));
