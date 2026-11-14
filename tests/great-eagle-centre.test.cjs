// 鷹君中心 Great Eagle Centre (23 Harbour Road, Wan Chai) 單元測試
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

test('Great Eagle Centre (HK-B0054) site metadata and OSM source', async () => {
  const {
    GREAT_EAGLE_CENTRE_HERITAGE,
    GREAT_EAGLE_CENTRE_SITE,
    GREAT_EAGLE_CENTRE_RING
  } = await import('../js/cities/hongkong/great-eagle-centre-site.js');

  assert.equal(GREAT_EAGLE_CENTRE_HERITAGE.completionYear, 1979);
  assert.equal(GREAT_EAGLE_CENTRE_HERITAGE.height, 146.0);
  assert.equal(GREAT_EAGLE_CENTRE_HERITAGE.storeys, 35);
  assert.equal(GREAT_EAGLE_CENTRE_HERITAGE.osmRelation, 18183385);

  assert.ok(GREAT_EAGLE_CENTRE_SITE.w > 40 && GREAT_EAGLE_CENTRE_SITE.w < 48, 'Width ~44.5m');
  assert.ok(GREAT_EAGLE_CENTRE_SITE.d > 28 && GREAT_EAGLE_CENTRE_SITE.d < 40, 'Depth ~34m');
  assert.equal(GREAT_EAGLE_CENTRE_SITE.height, 146.0);
  assert.equal(GREAT_EAGLE_CENTRE_SITE.osmId, 18183385);
});

test('Great Eagle Centre does not collide with active surface through-roads', async () => {
  const {
    GREAT_EAGLE_CENTRE_RING
  } = await import('../js/cities/hongkong/great-eagle-centre-site.js');

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
          if (pointInFlatPolygon(GREAT_EAGLE_CENTRE_RING, x, z)) {
            surfaceRoadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(surfaceRoadCollisionCount, 0, 'Great Eagle Centre must have zero ground surface through-road collisions');
});

test('Great Eagle Centre 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildGreatEagleCentre } = await import('../js/cities/hongkong/great-eagle-centre-world.js');

  const scene = new THREE.Scene();
  const res = buildGreatEagleCentre(scene, { groundOffset: 24.0 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 9, 'Should have 9 merged mesh layers');
  assert.equal(res.colliders.length, 1, 'Should provide a main tower collider');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'great-eagle-centre');
  assert.equal(res.stats.greatEagleCentreHeight, 146.0);
  assert.equal(res.stats.greatEagleCentreLevels, 35);
  assert.ok(res.stats.greatEagleCentrePanes > 1000, 'Windows subdivided into individual bays with randomized lighting');
});
