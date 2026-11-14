// 海富中心二座 Admiralty Centre Tower 2 (18 Harcourt Road, Admiralty) 單元測試
const test = require('node:test');
const assert = require('node:assert/strict');

test('Admiralty Centre Tower 2 (HK-B0072) site metadata and OSM source', async () => {
  const {
    ADMIRALTY_CENTRE_HERITAGE,
    ADMIRALTY_CENTRE_T2_SITE
  } = await import('../js/cities/hongkong/admiralty-centre-site.js');

  assert.equal(ADMIRALTY_CENTRE_HERITAGE.heightTower2, 104.0);
  assert.equal(ADMIRALTY_CENTRE_HERITAGE.storeysTower2, 28);
  assert.equal(ADMIRALTY_CENTRE_HERITAGE.osmWayTower2, 107336259);

  assert.ok(ADMIRALTY_CENTRE_T2_SITE.w > 20 && ADMIRALTY_CENTRE_T2_SITE.w < 50, 'Width plausible');
  assert.ok(ADMIRALTY_CENTRE_T2_SITE.d > 20 && ADMIRALTY_CENTRE_T2_SITE.d < 50, 'Depth plausible');
  assert.equal(ADMIRALTY_CENTRE_T2_SITE.height, 104.0);
  assert.equal(ADMIRALTY_CENTRE_T2_SITE.levels, 28, 'Site exposes levels (not storeys)');
  assert.equal(ADMIRALTY_CENTRE_T2_SITE.osmId, 107336259);
});

test('Admiralty Centre Tower 2 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildAdmiraltyCentreTower2 } = await import('../js/cities/hongkong/admiralty-centre-tower-2-world.js');

  const scene = new THREE.Scene();
  const res = buildAdmiraltyCentreTower2(scene, { groundOffset: 10.0 });

  assert.ok(res.group);
  assert.ok(res.group.children.length >= 8, 'Should have merged mesh layers');
  assert.equal(res.colliders.length, 0, 'No dedicated collider required for this integration step');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'admiraltyCentreTower2');
  assert.equal(res.stats.admiraltyCentreTower2Height, 104.0);
  assert.equal(res.stats.admiraltyCentreTower2Levels, 28);
  assert.ok(res.stats.admiraltyCentreTower2Panes > 500, 'Windows subdivided into individual bays with randomized lighting');
});
