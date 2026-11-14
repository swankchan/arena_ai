// 啟匯 Harbourside HQ (香港啟德) 單元測試
const test = require('node:test');
const assert = require('node:assert/strict');

test('Harbourside HQ (HK-B0079) site metadata and OSM source', async () => {
  const {
    HARBOURSIDE_HQ_HERITAGE,
    HARBOURSIDE_HQ_SITE
  } = await import('../js/cities/hongkong/harbourside-hq-site.js');

  assert.equal(HARBOURSIDE_HQ_HERITAGE.height, 85.0);
  assert.equal(HARBOURSIDE_HQ_HERITAGE.osmWay, 198558927);

  assert.ok(HARBOURSIDE_HQ_SITE.w > 10 && HARBOURSIDE_HQ_SITE.w < 100, 'Width plausible');
  assert.ok(HARBOURSIDE_HQ_SITE.d > 5 && HARBOURSIDE_HQ_SITE.d < 60, 'Depth plausible');
  assert.equal(HARBOURSIDE_HQ_SITE.height, 85.0);
  assert.equal(HARBOURSIDE_HQ_SITE.levels, 24, 'Site exposes levels (not storeys)');
  assert.equal(HARBOURSIDE_HQ_SITE.osmId, 198558927);
});

test('Harbourside HQ 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildHarboursideHq } = await import('../js/cities/hongkong/harbourside-hq-world.js');

  const scene = new THREE.Scene();
  const res = buildHarboursideHq(scene, { groundOffset: 10.0 });

  assert.ok(res.group);
  assert.ok(res.group.children.length >= 8, 'Should have merged mesh layers');
  assert.equal(res.colliders.length, 0, 'No dedicated collider required for this integration step');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'harboursideHq');
  assert.equal(res.stats.harboursideHqHeight, 85.0);
  assert.equal(res.stats.harboursideHqLevels, 24);
  assert.ok(res.stats.harboursideHqPanes > 200, 'Windows subdivided into individual bays with randomized lighting');
});
