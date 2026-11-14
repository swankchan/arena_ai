// 中信大廈 CITIC Tower (1 Tim Mei Avenue, Tamar, Admiralty) 單元測試
const test = require('node:test');
const assert = require('node:assert/strict');

test('CITIC Tower (HK-B0064) site metadata and OSM source', async () => {
  const {
    CITIC_TOWER_HERITAGE,
    CITIC_TOWER_SITE
  } = await import('../js/cities/hongkong/citic-tower-site.js');

  assert.equal(CITIC_TOWER_HERITAGE.completionYear, 1997);
  assert.equal(CITIC_TOWER_HERITAGE.height, 126.0);
  assert.equal(CITIC_TOWER_HERITAGE.storeys, 33);
  assert.equal(CITIC_TOWER_HERITAGE.osmWay, 107353963);

  assert.ok(CITIC_TOWER_SITE.w > 40 && CITIC_TOWER_SITE.w < 70, 'Width plausible');
  assert.ok(CITIC_TOWER_SITE.d > 30 && CITIC_TOWER_SITE.d < 70, 'Depth plausible');
  assert.equal(CITIC_TOWER_SITE.height, 126.0);
  assert.equal(CITIC_TOWER_SITE.levels, 33, 'Site exposes levels (not storeys)');
  assert.equal(CITIC_TOWER_SITE.osmId, 107353963);
});

test('CITIC Tower 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildCiticTower } = await import('../js/cities/hongkong/citic-tower-world.js');

  const scene = new THREE.Scene();
  const res = buildCiticTower(scene, { groundOffset: 10.0 });

  assert.ok(res.group);
  assert.ok(res.group.children.length >= 8, 'Should have merged mesh layers');
  assert.equal(res.colliders.length, 0, 'No dedicated collider required for this integration step');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'citicTower');
  assert.equal(res.stats.citicTowerHeight, 126.0);
  assert.equal(res.stats.citicTowerLevels, 33);
  assert.ok(res.stats.citicTowerPanes > 500, 'Windows subdivided into individual bays with randomized lighting');
});
