// 交易廣場第三座 Three Exchange Square (8 Connaught Place, Central) 單元測試
const test = require('node:test');
const assert = require('node:assert/strict');

test('Three Exchange Square (HK-B0055) site metadata and OSM source', async () => {
  const {
    THREE_EXCHANGE_HERITAGE,
    THREE_EXCHANGE_SITE
  } = await import('../js/cities/hongkong/three-exchange-square-site.js');

  assert.equal(THREE_EXCHANGE_HERITAGE.completionYear, 1988);
  assert.equal(THREE_EXCHANGE_HERITAGE.height, 144.0);
  assert.equal(THREE_EXCHANGE_HERITAGE.storeys, 32);
  assert.equal(THREE_EXCHANGE_HERITAGE.osmWay, 148554950);

  assert.ok(THREE_EXCHANGE_SITE.w > 30 && THREE_EXCHANGE_SITE.w < 60, 'Width plausible');
  assert.ok(THREE_EXCHANGE_SITE.d > 30 && THREE_EXCHANGE_SITE.d < 60, 'Depth plausible');
  assert.equal(THREE_EXCHANGE_SITE.height, 144.0);
  assert.equal(THREE_EXCHANGE_SITE.levels, 32, 'Site exposes levels (not storeys)');
  assert.equal(THREE_EXCHANGE_SITE.osmId, 148554950);
});

test('Three Exchange Square 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildThreeExchangeSquare } = await import('../js/cities/hongkong/three-exchange-square-world.js');

  const scene = new THREE.Scene();
  const res = buildThreeExchangeSquare(scene, { groundOffset: 10.0 });

  assert.ok(res.group);
  assert.ok(res.group.children.length >= 8, 'Should have merged mesh layers');
  assert.equal(res.colliders.length, 0, 'No dedicated collider required for this integration step');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'threeExchange');
  assert.equal(res.stats.threeExchangeHeight, 144.0);
  assert.equal(res.stats.threeExchangeLevels, 32);
  assert.ok(res.stats.threeExchangePanes > 500, 'Windows subdivided into individual bays with randomized lighting');
});
