// 太古廣場一座 One Pacific Place (1 Pacific Place, Admiralty) 單元測試
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

test('One Pacific Place (HK-B0045) site metadata and OSM source', async () => {
  const {
    ONE_PACIFIC_PLACE_HERITAGE,
    ONE_PACIFIC_PLACE_SITE,
    ONE_PACIFIC_PLACE_RING
  } = await import('../js/cities/hongkong/one-pacific-place-site.js');

  assert.equal(ONE_PACIFIC_PLACE_HERITAGE.completionYear, 2004);
  assert.equal(ONE_PACIFIC_PLACE_HERITAGE.height, 161.0);
  assert.equal(ONE_PACIFIC_PLACE_HERITAGE.storeys, 41);
  assert.equal(ONE_PACIFIC_PLACE_HERITAGE.osmWay, 41498860);

  assert.ok(ONE_PACIFIC_PLACE_SITE.w > 62 && ONE_PACIFIC_PLACE_SITE.w < 76, 'Width ~69m');
  assert.ok(ONE_PACIFIC_PLACE_SITE.d > 32 && ONE_PACIFIC_PLACE_SITE.d < 44, 'Depth ~38m');
  assert.equal(ONE_PACIFIC_PLACE_SITE.height, 161.0);
  assert.equal(ONE_PACIFIC_PLACE_SITE.osmId, 41498860);
});

test('One Pacific Place does not collide with active surface through-roads', async () => {
  const {
    ONE_PACIFIC_PLACE_RING
  } = await import('../js/cities/hongkong/one-pacific-place-site.js');

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
          if (pointInFlatPolygon(ONE_PACIFIC_PLACE_RING, x, z)) {
            surfaceRoadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(surfaceRoadCollisionCount, 0, 'One Pacific Place must have zero ground surface through-road collisions');
});

test('One Pacific Place 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildOnePacificPlace } = await import('../js/cities/hongkong/one-pacific-place-world.js');

  const scene = new THREE.Scene();
  const res = buildOnePacificPlace(scene, { groundOffset: 24.3 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 9, 'Should have 9 merged mesh layers');
  assert.equal(res.colliders.length, 1, 'Should provide a main tower collider');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'one-pacific-place');
  assert.equal(res.stats.onePacificPlaceHeight, 161.0);
  assert.equal(res.stats.onePacificPlaceLevels, 41);
  assert.ok(res.stats.onePacificPlacePanes > 1000, 'Windows subdivided into individual bays with randomized lighting');
});
