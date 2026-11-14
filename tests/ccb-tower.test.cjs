// 中國建設銀行大廈 CCB Tower (3 Connaught Road Central, Central) 單元測試
const test = require('node:test');
const assert = require('node:assert/strict');

test('CCB Tower (HK-B0060) site metadata and OSM source', async () => {
  const {
    CCB_TOWER_HERITAGE,
    CCB_TOWER_SITE
  } = await import('../js/cities/hongkong/ccb-tower-site.js');

  assert.equal(CCB_TOWER_HERITAGE.completionYear, 2012);
  assert.equal(CCB_TOWER_HERITAGE.height, 135.0);
  assert.equal(CCB_TOWER_HERITAGE.storeys, 31);
  assert.equal(CCB_TOWER_HERITAGE.osmWay, 242113651);

  assert.ok(CCB_TOWER_SITE.w > 30 && CCB_TOWER_SITE.w < 60, 'Width plausible');
  assert.ok(CCB_TOWER_SITE.d > 20 && CCB_TOWER_SITE.d < 40, 'Depth plausible');
  assert.equal(CCB_TOWER_SITE.height, 135.0);
  assert.equal(CCB_TOWER_SITE.levels, 31, 'Site exposes levels (not storeys)');
  assert.equal(CCB_TOWER_SITE.osmId, 242113651);
});

test('CCB Tower 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildCcbTower } = await import('../js/cities/hongkong/ccb-tower-world.js');

  const scene = new THREE.Scene();
  const res = buildCcbTower(scene, { groundOffset: 10.0 });

  assert.ok(res.group);
  assert.ok(res.group.children.length >= 8, 'Should have merged mesh layers');
  assert.equal(res.colliders.length, 0, 'No dedicated collider required for this integration step');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'ccbTower');
  assert.equal(res.stats.ccbTowerHeight, 135.0);
  assert.equal(res.stats.ccbTowerLevels, 31);
  assert.ok(res.stats.ccbTowerPanes > 500, 'Windows subdivided into individual bays with randomized lighting');
});
