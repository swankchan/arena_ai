// 多盛大廈 Dorset House (979 King's Road, Quarry Bay) 單元測試
const test = require('node:test');
const assert = require('node:assert/strict');

test('Dorset House (HK-B0049) site metadata and OSM source', async () => {
  const {
    DORSET_HOUSE_HERITAGE,
    DORSET_HOUSE_SITE
  } = await import('../js/cities/hongkong/dorset-house-site.js');

  assert.equal(DORSET_HOUSE_HERITAGE.height, 151.0);
  assert.equal(DORSET_HOUSE_HERITAGE.storeys, 40);
  assert.equal(DORSET_HOUSE_HERITAGE.osmWay, 100652800);

  assert.ok(DORSET_HOUSE_SITE.w > 30 && DORSET_HOUSE_SITE.w < 60, 'Width plausible');
  assert.ok(DORSET_HOUSE_SITE.d > 30 && DORSET_HOUSE_SITE.d < 60, 'Depth plausible');
  assert.equal(DORSET_HOUSE_SITE.height, 151.0);
  assert.equal(DORSET_HOUSE_SITE.levels, 40, 'Site exposes levels (not storeys)');
  assert.equal(DORSET_HOUSE_SITE.osmId, 100652800);
});

test('Dorset House 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildDorsetHouse } = await import('../js/cities/hongkong/dorset-house-world.js');

  const scene = new THREE.Scene();
  const res = buildDorsetHouse(scene, { groundOffset: 10.0 });

  assert.ok(res.group);
  assert.ok(res.group.children.length >= 8, 'Should have merged mesh layers');
  assert.equal(res.colliders.length, 0, 'No dedicated collider required for this integration step');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'dorsetHouse');
  assert.equal(res.stats.dorsetHouseHeight, 151.0);
  assert.equal(res.stats.dorsetHouseLevels, 40);
  assert.ok(res.stats.dorsetHousePanes > 500, 'Windows subdivided into individual bays with randomized lighting');
});
