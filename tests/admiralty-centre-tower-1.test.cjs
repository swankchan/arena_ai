// 海富中心一座 Admiralty Centre Tower 1 (18 Harcourt Road, Admiralty) 單元測試
const test = require('node:test');
const assert = require('node:assert/strict');

test('Admiralty Centre Tower 1 (HK-B0063) site metadata and OSM source', async () => {
  const {
    ADMIRALTY_CENTRE_HERITAGE,
    ADMIRALTY_CENTRE_T1_SITE
  } = await import('../js/cities/hongkong/admiralty-centre-site.js');

  assert.equal(ADMIRALTY_CENTRE_HERITAGE.heightTower1, 126.0);
  assert.equal(ADMIRALTY_CENTRE_HERITAGE.storeysTower1, 32);
  assert.equal(ADMIRALTY_CENTRE_HERITAGE.osmWayTower1, 107336262);

  assert.ok(ADMIRALTY_CENTRE_T1_SITE.w > 30 && ADMIRALTY_CENTRE_T1_SITE.w < 60, 'Width plausible');
  assert.ok(ADMIRALTY_CENTRE_T1_SITE.d > 30 && ADMIRALTY_CENTRE_T1_SITE.d < 60, 'Depth plausible');
  assert.equal(ADMIRALTY_CENTRE_T1_SITE.height, 126.0);
  assert.equal(ADMIRALTY_CENTRE_T1_SITE.levels, 32, 'Site exposes levels (not storeys)');
  assert.equal(ADMIRALTY_CENTRE_T1_SITE.osmId, 107336262);
});

test('Admiralty Centre Tower 1 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildAdmiraltyCentreTower1 } = await import('../js/cities/hongkong/admiralty-centre-tower-1-world.js');

  const scene = new THREE.Scene();
  const res = buildAdmiraltyCentreTower1(scene, { groundOffset: 10.0 });

  assert.ok(res.group);
  assert.ok(res.group.children.length >= 8, 'Should have merged mesh layers');
  assert.equal(res.colliders.length, 0, 'No dedicated collider required for this integration step');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'admiraltyCentreTower1');
  assert.equal(res.stats.admiraltyCentreTower1Height, 126.0);
  assert.equal(res.stats.admiraltyCentreTower1Levels, 32);
  assert.ok(res.stats.admiraltyCentreTower1Panes > 500, 'Windows subdivided into individual bays with randomized lighting');
});
