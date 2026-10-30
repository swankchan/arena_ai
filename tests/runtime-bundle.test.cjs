const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { readFileSync, statSync } = require('node:fs');
const { join, resolve } = require('node:path');
const test = require('node:test');

const root = join(__dirname, '..');
const manifest = JSON.parse(readFileSync(join(root, 'js/app.runtime.manifest.json'), 'utf8'));

test('the self-contained city runtime is current and has no external module imports', () => {
  assert.equal(manifest.entry, 'js/app.js');
  assert.equal(manifest.bundle, 'js/app.runtime.js');
  assert.equal(manifest.builder, 'esbuild 0.28.2');
  assert.deepEqual(manifest.externalImports, []);
  assert.ok(manifest.inputs.includes('js/cities/hongkong/index.js'));
  assert.ok(manifest.inputs.includes('js/cities/newyork/index.js'));
  assert.ok(manifest.inputs.includes('js/cities/grid/index.js'));
  assert.ok(manifest.inputs.includes('vendor/three/build/three.webgpu.js'));
  assert.ok(!manifest.inputs.includes('js/building-collision.js'));

  const sourceHash = createHash('sha256');
  for (const path of [...manifest.inputs].sort()) {
    sourceHash.update(path);
    sourceHash.update('\0');
    sourceHash.update(readFileSync(resolve(root, path)));
    sourceHash.update('\0');
  }
  assert.equal(sourceHash.digest('hex'), manifest.sourceHash, 'rebuild the runtime after changing its source or build settings');

  const bundle = readFileSync(join(root, manifest.bundle));
  assert.equal(bundle.length, manifest.bundleBytes);
  assert.equal(statSync(join(root, manifest.bundle)).size, manifest.bundleBytes);
  assert.equal(createHash('sha256').update(bundle).digest('hex'), manifest.bundleHash);
  assert.match(readFileSync(join(root, 'js/main.js'), 'utf8'), /import\('\.\/app\.runtime\.js'\)/);
});
