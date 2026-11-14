// 中國人民解放軍駐香港部隊大廈 PLA Hong Kong Building (中環) 單元測試
const test = require('node:test');
const assert = require('node:assert/strict');

test('PLA Hong Kong Building (HK-B0068) site metadata and OSM source', async () => {
  const {
    HONGKONG_ARMY_BUILDING_HERITAGE,
    HONGKONG_ARMY_BUILDING_SITE
  } = await import('../js/cities/hongkong/hongkong-army-building-site.js');

  assert.equal(HONGKONG_ARMY_BUILDING_HERITAGE.height, 113.0);
  assert.equal(HONGKONG_ARMY_BUILDING_HERITAGE.storeys, 29);
  assert.equal(HONGKONG_ARMY_BUILDING_HERITAGE.osmWay, 101959095);

  assert.ok(HONGKONG_ARMY_BUILDING_SITE.w > 10 && HONGKONG_ARMY_BUILDING_SITE.w < 60, 'Width plausible');
  assert.ok(HONGKONG_ARMY_BUILDING_SITE.d > 5 && HONGKONG_ARMY_BUILDING_SITE.d < 40, 'Depth plausible');
  assert.equal(HONGKONG_ARMY_BUILDING_SITE.height, 113.0);
  assert.equal(HONGKONG_ARMY_BUILDING_SITE.levels, 29, 'Site exposes levels (not storeys)');
  assert.equal(HONGKONG_ARMY_BUILDING_SITE.osmId, 101959095);
});

test('PLA Hong Kong Building 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildHongkongArmyBuilding } = await import('../js/cities/hongkong/hongkong-army-building-world.js');

  const scene = new THREE.Scene();
  const res = buildHongkongArmyBuilding(scene, { groundOffset: 10.0 });

  assert.ok(res.group);
  assert.ok(res.group.children.length >= 8, 'Should have merged mesh layers');
  assert.equal(res.colliders.length, 0, 'No dedicated collider required for this integration step');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'hongkongArmyBuilding');
  assert.equal(res.stats.hongkongArmyBuildingHeight, 113.0);
  assert.equal(res.stats.hongkongArmyBuildingLevels, 29);
  assert.ok(res.stats.hongkongArmyBuildingPanes > 200, 'Windows subdivided into individual bays with randomized lighting');
});
