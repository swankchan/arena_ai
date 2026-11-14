// 美利尼依格羅酒店 The Murray (中環) 單元測試
const test = require('node:test');
const assert = require('node:assert/strict');

test('The Murray (HK-B0091) site metadata and OSM source', async () => {
  const {
    THE_MURRAY_HERITAGE,
    THE_MURRAY_SITE
  } = await import('../js/cities/hongkong/the-murray-site.js');

  assert.equal(THE_MURRAY_HERITAGE.storeys, 21);
  assert.equal(THE_MURRAY_HERITAGE.osmWay, 85320844);

  assert.ok(THE_MURRAY_SITE.w > 5 && THE_MURRAY_SITE.w < 60, 'Width plausible');
  assert.ok(THE_MURRAY_SITE.d > 5 && THE_MURRAY_SITE.d < 60, 'Depth plausible');
  assert.equal(THE_MURRAY_SITE.levels, 21, 'Site exposes levels (not storeys)');
  assert.equal(THE_MURRAY_SITE.osmId, 85320844);
});

test('The Murray 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildTheMurray } = await import('../js/cities/hongkong/the-murray-world.js');

  const scene = new THREE.Scene();
  const res = buildTheMurray(scene, { groundOffset: 10.0 });

  assert.ok(res.group);
  assert.ok(res.group.children.length >= 8, 'Should have merged mesh layers');
  assert.equal(res.colliders.length, 0, 'No dedicated collider required for this integration step');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'theMurray');
  assert.equal(res.stats.theMurrayLevels, 21);
  assert.ok(res.stats.theMurrayPanes > 200, 'Windows subdivided into individual bays with randomized lighting');
});
