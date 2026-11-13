// 太古廣場三座 Three Pacific Place (1 Queen's Road East, Admiralty) 單元測試
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KX = 103056.81753522092;
const KY = 110734.09626824585;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

function pointInFlatPolygon(ring, x, z) {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

test('Three Pacific Place (HK-B0033) site metadata and OSM source', async () => {
  const {
    THREE_PACIFIC_PLACE_HERITAGE,
    THREE_PACIFIC_PLACE_SITE,
    THREE_PACIFIC_PLACE_RING
  } = await import('../js/cities/hongkong/three-pacific-place-site.js');

  assert.equal(THREE_PACIFIC_PLACE_HERITAGE.completionYear, 2004);
  assert.equal(THREE_PACIFIC_PLACE_HERITAGE.height, 182.0);
  assert.equal(THREE_PACIFIC_PLACE_HERITAGE.storeys, 40);
  assert.equal(THREE_PACIFIC_PLACE_HERITAGE.osmWay, 88391081);

  assert.ok(THREE_PACIFIC_PLACE_SITE.w > 55 && THREE_PACIFIC_PLACE_SITE.w < 72, 'Width ~64m');
  assert.ok(THREE_PACIFIC_PLACE_SITE.d > 28 && THREE_PACIFIC_PLACE_SITE.d < 42, 'Depth ~35m');
  assert.equal(THREE_PACIFIC_PLACE_SITE.height, 182.0);
  assert.equal(THREE_PACIFIC_PLACE_SITE.osmId, 88391081);
});

test('Three Pacific Place does not collide with active surface through-roads', async () => {
  const {
    THREE_PACIFIC_PLACE_RING
  } = await import('../js/cities/hongkong/three-pacific-place-site.js');

  const roadFiles = ['roads_major.json', 'roads_minor_nw.json', 'roads_minor_sw.json', 'roads_minor_ne.json', 'roads_minor_se.json'];
  let surfaceRoadCollisionCount = 0;

  for (const rf of roadFiles) {
    const fullPath = path.join(__dirname, '../tools/data/hongkong', rf);
    if (!fs.existsSync(fullPath)) continue;
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    for (const el of data.elements) {
      if (el.geometry && !el.tags?.tunnel) {
        for (const pt of el.geometry) {
          const [x, z] = project(pt.lon, pt.lat);
          if (pointInFlatPolygon(THREE_PACIFIC_PLACE_RING, x, z)) {
            surfaceRoadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(surfaceRoadCollisionCount, 0, 'Three Pacific Place must have zero ground surface through-road collisions');
});

test('Three Pacific Place 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildThreePacificPlace } = await import('../js/cities/hongkong/three-pacific-place-world.js');

  const scene = new THREE.Scene();
  const res = buildThreePacificPlace(scene, { groundOffset: 24.25 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 9, 'Should have 9 merged mesh layers');
  assert.equal(res.colliders.length, 3, 'Should provide colliders for shaft and two podium flanks');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'three-pacific-place');
  assert.equal(res.stats.threePacificPlaceHeight, 182.0);
  assert.equal(res.stats.threePacificPlaceLevels, 40);
  assert.ok(res.stats.threePacificPlacePanes > 1000, 'Windows subdivided into individual bays with randomized lighting');
});
