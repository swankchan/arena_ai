#!/usr/bin/env node
// Render a top-down PNG preview of an emitted city geodata module:
//   node tools/preview-city.mjs hongkong [out.png] [px-per-metre] [--crop=minX,minZ,maxX,maxZ] [--grid]
import { renderPreview } from './geo/preview.mjs';

const id = process.argv[2] || 'hongkong';
const out = process.argv[3] || `tools/data/${id}/preview.png`;
const ppm = Number(process.argv[4] || 0.7);
const cropArg = process.argv.find((a) => a.startsWith('--crop='))?.slice(7) || '';
const crop = cropArg
  ? (([minX, minZ, maxX, maxZ]) => ({ minX, minZ, maxX, maxZ }))(cropArg.split(',').map(Number))
  : null;
const grid = process.argv.includes('--grid');
const FILES = {
  hongkong: '../js/hk-geodata.js',
  newyork: '../js/nyc-geodata.js'
};
if (!FILES[id]) {
  console.error(`no geodata file mapped for "${id}"`);
  process.exit(2);
}
const { GEO } = await import(FILES[id]);
renderPreview(GEO, out, { ppm, crop, grid });
