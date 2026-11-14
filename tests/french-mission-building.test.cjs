// 法國外方傳道會大樓 French Mission Building (中環) 單元測試
const test = require('node:test');
const assert = require('node:assert/strict');

test('French Mission Building (HK-B0094) site metadata and OSM source', async () => {
  const {
    FRENCH_MISSION_BUILDING_HERITAGE,
    FRENCH_MISSION_BUILDING_SITE
  } = await import('../js/cities/hongkong/french-mission-building-site.js');

  assert.equal(FRENCH_MISSION_BUILDING_HERITAGE.storeys, 4);
  assert.equal(FRENCH_MISSION_BUILDING_HERITAGE.osmWay, 85320697);

  assert.ok(FRENCH_MISSION_BUILDING_SITE.w > 5 && FRENCH_MISSION_BUILDING_SITE.w < 60, 'Width plausible');
  assert.ok(FRENCH_MISSION_BUILDING_SITE.d > 5 && FRENCH_MISSION_BUILDING_SITE.d < 60, 'Depth plausible');
  assert.equal(FRENCH_MISSION_BUILDING_SITE.levels, 4, 'Site exposes levels (not storeys)');
  assert.equal(FRENCH_MISSION_BUILDING_SITE.osmId, 85320697);
});

test('French Mission Building 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildFrenchMissionBuilding } = await import('../js/cities/hongkong/french-mission-building-world.js');

  const scene = new THREE.Scene();
  const res = buildFrenchMissionBuilding(scene, { groundOffset: 10.0 });

  assert.ok(res.group);
  assert.ok(res.group.children.length >= 8, 'Should have merged mesh layers');
  assert.equal(res.colliders.length, 0, 'No dedicated collider required for this integration step');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'frenchMissionBuilding');
  assert.equal(res.stats.frenchMissionBuildingLevels, 4);
  assert.ok(res.stats.frenchMissionBuildingPanes > 50, 'Windows subdivided into individual bays with randomized lighting');
});
