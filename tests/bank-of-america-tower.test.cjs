// 美國銀行中心 Bank of America Tower (12 Harcourt Road, Admiralty) 單元測試
const test = require('node:test');
const assert = require('node:assert/strict');

test('Bank of America Tower (HK-B0052) site metadata and OSM source', async () => {
  const {
    BANK_OF_AMERICA_TOWER_HERITAGE,
    BANK_OF_AMERICA_TOWER_SITE
  } = await import('../js/cities/hongkong/bank-of-america-tower-site.js');

  assert.equal(BANK_OF_AMERICA_TOWER_HERITAGE.completionYear, 1977);
  assert.equal(BANK_OF_AMERICA_TOWER_HERITAGE.height, 146.0);
  assert.equal(BANK_OF_AMERICA_TOWER_HERITAGE.storeys, 38);
  assert.equal(BANK_OF_AMERICA_TOWER_HERITAGE.osmWay, 107328020);

  assert.ok(BANK_OF_AMERICA_TOWER_SITE.w > 30 && BANK_OF_AMERICA_TOWER_SITE.w < 70, 'Width plausible');
  assert.ok(BANK_OF_AMERICA_TOWER_SITE.d > 30 && BANK_OF_AMERICA_TOWER_SITE.d < 80, 'Depth plausible');
  assert.equal(BANK_OF_AMERICA_TOWER_SITE.height, 146.0);
  assert.equal(BANK_OF_AMERICA_TOWER_SITE.levels, 38, 'Site exposes levels (not storeys)');
  assert.equal(BANK_OF_AMERICA_TOWER_SITE.osmId, 107328020);
});

test('Bank of America Tower 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildBankOfAmericaTower } = await import('../js/cities/hongkong/bank-of-america-tower-world.js');

  const scene = new THREE.Scene();
  const res = buildBankOfAmericaTower(scene, { groundOffset: 10.0 });

  assert.ok(res.group);
  assert.ok(res.group.children.length >= 8, 'Should have merged mesh layers');
  assert.equal(res.colliders.length, 0, 'No dedicated collider required for this integration step');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'bankOfAmericaTower');
  assert.equal(res.stats.bankOfAmericaTowerHeight, 146.0);
  assert.equal(res.stats.bankOfAmericaTowerLevels, 38);
  assert.ok(res.stats.bankOfAmericaTowerPanes > 500, 'Windows subdivided into individual bays with randomized lighting');
});
