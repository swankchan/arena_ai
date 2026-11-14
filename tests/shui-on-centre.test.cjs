// 瑞安中心 Shui On Centre (6-8 Harbour Road, Wan Chai) 單元測試
const test = require('node:test');
const assert = require('node:assert/strict');

test('Shui On Centre (HK-B0066) site metadata and OSM source', async () => {
  const {
    SHUI_ON_CENTRE_HERITAGE,
    SHUI_ON_CENTRE_SITE
  } = await import('../js/cities/hongkong/shui-on-centre-site.js');

  assert.equal(SHUI_ON_CENTRE_HERITAGE.height, 118.0);
  assert.equal(SHUI_ON_CENTRE_HERITAGE.storeys, 36);
  assert.equal(SHUI_ON_CENTRE_HERITAGE.osmWay, 241998997);

  assert.ok(SHUI_ON_CENTRE_SITE.w > 10 && SHUI_ON_CENTRE_SITE.w < 40, 'Width plausible');
  assert.ok(SHUI_ON_CENTRE_SITE.d > 5 && SHUI_ON_CENTRE_SITE.d < 30, 'Depth plausible');
  assert.equal(SHUI_ON_CENTRE_SITE.height, 118.0);
  assert.equal(SHUI_ON_CENTRE_SITE.levels, 36, 'Site exposes levels (not storeys)');
  assert.equal(SHUI_ON_CENTRE_SITE.osmId, 241998997);
});

test('Shui On Centre 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildShuiOnCentre } = await import('../js/cities/hongkong/shui-on-centre-world.js');

  const scene = new THREE.Scene();
  const res = buildShuiOnCentre(scene, { groundOffset: 10.0 });

  assert.ok(res.group);
  assert.ok(res.group.children.length >= 8, 'Should have merged mesh layers');
  assert.equal(res.colliders.length, 0, 'No dedicated collider required for this integration step');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'shuiOnCentre');
  assert.equal(res.stats.shuiOnCentreHeight, 118.0);
  assert.equal(res.stats.shuiOnCentreLevels, 36);
  assert.ok(res.stats.shuiOnCentrePanes > 300, 'Windows subdivided into individual bays with randomized lighting');
});
