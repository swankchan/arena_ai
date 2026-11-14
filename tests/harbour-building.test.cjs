// 海港政府大樓 Harbour Building (中環) 單元測試
const test = require('node:test');
const assert = require('node:assert/strict');

test('Harbour Building (HK-B0073) site metadata and OSM source', async () => {
  const {
    HARBOUR_BUILDING_HERITAGE,
    HARBOUR_BUILDING_SITE
  } = await import('../js/cities/hongkong/harbour-building-site.js');

  assert.equal(HARBOUR_BUILDING_HERITAGE.height, 96.0);
  assert.equal(HARBOUR_BUILDING_HERITAGE.storeys, 25);
  assert.equal(HARBOUR_BUILDING_HERITAGE.osmWay, 26599387);

  assert.ok(HARBOUR_BUILDING_SITE.w > 10 && HARBOUR_BUILDING_SITE.w < 100, 'Width plausible');
  assert.ok(HARBOUR_BUILDING_SITE.d > 5 && HARBOUR_BUILDING_SITE.d < 60, 'Depth plausible');
  assert.equal(HARBOUR_BUILDING_SITE.height, 96.0);
  assert.equal(HARBOUR_BUILDING_SITE.levels, 25, 'Site exposes levels (not storeys)');
  assert.equal(HARBOUR_BUILDING_SITE.osmId, 26599387);
});

test('Harbour Building 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildHarbourBuilding } = await import('../js/cities/hongkong/harbour-building-world.js');

  const scene = new THREE.Scene();
  const res = buildHarbourBuilding(scene, { groundOffset: 10.0 });

  assert.ok(res.group);
  assert.ok(res.group.children.length >= 8, 'Should have merged mesh layers');
  assert.equal(res.colliders.length, 0, 'No dedicated collider required for this integration step');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'harbourBuilding');
  assert.equal(res.stats.harbourBuildingHeight, 96.0);
  assert.equal(res.stats.harbourBuildingLevels, 25);
  assert.ok(res.stats.harbourBuildingPanes > 200, 'Windows subdivided into individual bays with randomized lighting');
});
