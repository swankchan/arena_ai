const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
let source, clearance, manifest, builder;
test.before(async () => {
  source = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
  manifest = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/street-light-clearance-manifest.json'), 'utf8'));
  builder = await import('../tools/cities/hongkong/build-street-light-clearance.mjs');
});

test('lamp clearance preserves every source record and uses bounded, unique runtime overrides', () => {
  assert.equal(source.lamps.length, 144995);
  assert.equal(manifest.source.sha256, source.source.sha256);
  assert.equal(clearance.overrides.length, manifest.counts.relocated);
  assert.equal(clearance.suppressed.length, manifest.counts.suppressed);
  assert.equal(manifest.counts.remainingCarriagewayConflicts, 0);
  assert.equal(manifest.counts.rendered, source.lamps.length - clearance.suppressed.length);
  const indices = new Set(), suppressed = new Set(clearance.suppressed);
  for (const [index, dx, dz, baseY] of clearance.overrides) {
    assert.ok(Number.isInteger(index) && index >= 0 && index < source.lamps.length);
    assert.ok(!indices.has(index));
    assert.ok(!suppressed.has(index));
    assert.ok([dx, dz, baseY].every(Number.isInteger));
    assert.ok(Math.hypot(dx / 100, dz / 100) <= manifest.derivation.maxRelocation + 0.001);
    indices.add(index);
  }
  assert.ok(manifest.counts.relocated > 30000);
  assert.ok(manifest.counts.suppressed < source.lamps.length * 0.001);
});

test('territory-wide lamp clearance generation is deterministic and revalidates to zero conflicts', { timeout: 360000 }, async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hk-street-clearance-'));
  const outFile = path.join(directory, 'clearance.js'), manifestFile = path.join(directory, 'manifest.json');
  const generated = await builder.buildHongKongStreetLightClearance({ outFile, manifestFile });
  assert.equal(generated.counts.remainingCarriagewayConflicts, 0);
  assert.deepEqual(generated, manifest);
  assert.ok(fs.readFileSync(outFile).equals(fs.readFileSync(path.join(root, 'js/hk-street-light-clearance-data.js'))));
});
