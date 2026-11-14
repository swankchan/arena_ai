// 香港JW萬豪酒店 JW Marriott Hotel Hong Kong (8 Pacific Place, Admiralty) 單元測試
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

test('JW Marriott Hotel (HK-B0042) site metadata and OSM source', async () => {
  const {
    JW_MARRIOTT_HERITAGE,
    JW_MARRIOTT_SITE,
    JW_MARRIOTT_RING
  } = await import('../js/cities/hongkong/jw-marriott-site.js');

  assert.equal(JW_MARRIOTT_HERITAGE.completionYear, 1989);
  assert.equal(JW_MARRIOTT_HERITAGE.height, 164.0);
  assert.equal(JW_MARRIOTT_HERITAGE.storeys, 51);
  assert.equal(JW_MARRIOTT_HERITAGE.osmWay, 41499014);

  assert.ok(JW_MARRIOTT_SITE.w > 38 && JW_MARRIOTT_SITE.w < 52, 'Width ~45m');
  assert.ok(JW_MARRIOTT_SITE.d > 38 && JW_MARRIOTT_SITE.d < 52, 'Depth ~45m');
  assert.equal(JW_MARRIOTT_SITE.height, 164.0);
  assert.equal(JW_MARRIOTT_SITE.osmId, 41499014);
});

test('JW Marriott Hotel does not collide with active surface through-roads', async () => {
  const {
    JW_MARRIOTT_RING
  } = await import('../js/cities/hongkong/jw-marriott-site.js');

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
          if (pointInFlatPolygon(JW_MARRIOTT_RING, x, z)) {
            surfaceRoadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(surfaceRoadCollisionCount, 0, 'JW Marriott Hotel must have zero ground surface through-road collisions');
});

test('JW Marriott Hotel 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildJwMarriott } = await import('../js/cities/hongkong/jw-marriott-world.js');

  const scene = new THREE.Scene();
  const res = buildJwMarriott(scene, { groundOffset: 24.5 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 9, 'Should have 9 merged mesh layers');
  assert.equal(res.colliders.length, 1, 'Should provide a main tower collider');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'jw-marriott');
  assert.equal(res.stats.jwMarriottHeight, 164.0);
  assert.equal(res.stats.jwMarriottLevels, 51);
  assert.ok(res.stats.jwMarriottPanes > 1000, 'Windows subdivided into individual bays with randomized lighting');
});
