const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');
const root = join(__dirname, '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

test('loading screen uses the game atlas rather than a city-initial badge', () => {
  const html = read('index.html');
  const loader = html.slice(html.indexOf('id="loading-overlay"'), html.indexOf('<!-- 3D WebGPU'));
  assert.match(loader, /assets\/hong-kong-loading-map\.svg/);
  assert.match(loader, /OpenStreetMap contributors/);
  assert.doesNotMatch(loader, /loader-bullet/);
  assert.match(loader, /id="loading-progress"/);
  assert.match(loader, /id="loading-status"/);
  assert.match(read('css/style.css'), /@media \(max-height: 520px\)/);
});

test('the compact map is reproducibly derived from the game road and coastline data', () => {
  const before = read('assets/hong-kong-loading-map.svg');
  execFileSync(process.execPath, ['tools/graphics/build-loading-map.mjs'], { cwd: root });
  assert.equal(read('assets/hong-kong-loading-map.svg'), before);
  assert.match(before, /OpenStreetMap contributors, ODbL/);
  assert.ok(before.length < 500000);
  assert.match(read('tools/graphics/build-loading-map.mjs'), /HK_FULL_ROADS\.roads/);
  assert.match(read('tools/graphics/build-loading-map.mjs'), /HK_FULL_MAP\.land/);
});

test('the atlas is a bounded and uncropped background behind readable loader content', () => {
  const html = read('index.html');
  const loader = html.slice(html.indexOf('id="loading-overlay"'), html.indexOf('<!-- 3D WebGPU'));
  assert.ok(loader.indexOf('class="loader-map"') < loader.indexOf('class="loader"'));
  assert.match(loader, /class="loader-map" aria-hidden="true"/);
  const css = read('css/style.css');
  assert.match(css, /\.loader-map\s*\{\s*position:\s*absolute;\s*inset:\s*0/);
  assert.match(css, /\.loader-map img\s*\{[^}]*width:\s*min\(680px, 82vw\)[^}]*object-fit:\s*contain/);
  assert.match(css, /\.loader-map::after\s*\{[^}]*radial-gradient/);
  assert.match(loader, /OpenStreetMap contributors/);
});
