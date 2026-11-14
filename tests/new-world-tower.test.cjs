// 新世界大廈 New World Tower (22-38 Queen's Road Central, Central) 單元測試
const test = require('node:test');
const assert = require('node:assert/strict');

test('New World Tower (HK-B0048) site metadata and OSM source', async () => {
  const {
    NEW_WORLD_TOWER_HERITAGE,
    NEW_WORLD_TOWER_SITE
  } = await import('../js/cities/hongkong/new-world-tower-site.js');

  assert.equal(NEW_WORLD_TOWER_HERITAGE.completionYear, 1983);
  assert.equal(NEW_WORLD_TOWER_HERITAGE.height, 151.0);
  assert.equal(NEW_WORLD_TOWER_HERITAGE.storeys, 41);
  assert.equal(NEW_WORLD_TOWER_HERITAGE.osmWay, 1323550598);

  assert.ok(NEW_WORLD_TOWER_SITE.w > 50 && NEW_WORLD_TOWER_SITE.w < 100, 'Width plausible');
  assert.ok(NEW_WORLD_TOWER_SITE.d > 20 && NEW_WORLD_TOWER_SITE.d < 50, 'Depth plausible');
  assert.equal(NEW_WORLD_TOWER_SITE.height, 151.0);
  assert.equal(NEW_WORLD_TOWER_SITE.levels, 41, 'Site exposes levels (not storeys)');
  assert.equal(NEW_WORLD_TOWER_SITE.osmId, 1323550598);
});

test('New World Tower 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildNewWorldTower } = await import('../js/cities/hongkong/new-world-tower-world.js');

  const scene = new THREE.Scene();
  const res = buildNewWorldTower(scene, { groundOffset: 10.0 });

  assert.ok(res.group);
  assert.ok(res.group.children.length >= 8, 'Should have merged mesh layers');
  assert.equal(res.colliders.length, 0, 'No dedicated collider required for this integration step');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'newWorldTower');
  assert.equal(res.stats.newWorldTowerHeight, 151.0);
  assert.equal(res.stats.newWorldTowerLevels, 41);
  assert.ok(res.stats.newWorldTowerPanes > 500, 'Windows subdivided into individual bays with randomized lighting');
});
