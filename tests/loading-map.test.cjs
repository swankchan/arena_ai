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
