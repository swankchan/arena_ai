#!/usr/bin/env node
// Generic geodata builder: node tools/build-city.mjs <city> [out.js]
// The Manhattan build stays in tools/build-geodata.mjs until the shared pipeline is migrated.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const id = process.argv[2];
if (!id) {
  console.error('usage: node tools/build-city.mjs <city> [out.js]');
  process.exit(2);
}
const out = process.argv[3] ? path.resolve(process.argv[3]) : undefined;

const modulePath = new URL(`./cities/${id}/build.mjs`, import.meta.url);
let mod;
try {
  mod = await import(modulePath.href);
} catch (error) {
  console.error(`no builder for "${id}" at ${fileURLToPath(modulePath)}`);
  throw error;
}
const build = mod[`build${id[0].toUpperCase()}${id.slice(1)}`] || mod.build;
if (typeof build !== 'function') {
  console.error(`tools/cities/${id}/build.mjs must export build${id[0].toUpperCase()}${id.slice(1)}() or build()`);
  process.exit(2);
}
await build({ outFile: out });
