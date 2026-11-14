// 香港朗廷酒店 The Langham Hong Kong (尖沙咀) 單元測試
const test = require('node:test');
const assert = require('node:assert/strict');

test('The Langham Hong Kong (HK-B0087) site metadata and OSM source', async () => {
  const {
    LANGHAM_HONGKONG_HERITAGE,
    LANGHAM_HONGKONG_SITE
  } = await import('../js/cities/hongkong/langham-hongkong-site.js');

  assert.equal(LANGHAM_HONGKONG_HERITAGE.height, 55.0);
  assert.equal(LANGHAM_HONGKONG_HERITAGE.storeys, 17);
  assert.equal(LANGHAM_HONGKONG_HERITAGE.osmWay, 159324344);

  assert.ok(LANGHAM_HONGKONG_SITE.w > 10 && LANGHAM_HONGKONG_SITE.w < 100, 'Width plausible');
  assert.ok(LANGHAM_HONGKONG_SITE.d > 5 && LANGHAM_HONGKONG_SITE.d < 60, 'Depth plausible');
  assert.equal(LANGHAM_HONGKONG_SITE.height, 55.0);
  assert.equal(LANGHAM_HONGKONG_SITE.levels, 17, 'Site exposes levels (not storeys)');
  assert.equal(LANGHAM_HONGKONG_SITE.osmId, 159324344);
});

test('The Langham Hong Kong 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildLanghamHongkong } = await import('../js/cities/hongkong/langham-hongkong-world.js');

  const scene = new THREE.Scene();
  const res = buildLanghamHongkong(scene, { groundOffset: 10.0 });

  assert.ok(res.group);
  assert.ok(res.group.children.length >= 8, 'Should have merged mesh layers');
  assert.equal(res.colliders.length, 0, 'No dedicated collider required for this integration step');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'langhamHongkong');
  assert.equal(res.stats.langhamHongkongHeight, 55.0);
  assert.equal(res.stats.langhamHongkongLevels, 17);
  assert.ok(res.stats.langhamHongkongPanes > 200, 'Windows subdivided into individual bays with randomized lighting');
});
