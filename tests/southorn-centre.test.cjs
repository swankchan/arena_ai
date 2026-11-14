// 修頓中心 Southorn Centre (130-150 Hennessy Road, Wan Chai) 單元測試
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

test('Southorn Centre (HK-B0071) site metadata and OSM source', async () => {
  const {
    SOUTHORN_CENTRE_HERITAGE,
    SOUTHORN_CENTRE_SITE,
    SOUTHORN_CENTRE_RING
  } = await import('../js/cities/hongkong/southorn-centre-site.js');

  assert.equal(SOUTHORN_CENTRE_HERITAGE.completionYear, 1978);
  assert.equal(SOUTHORN_CENTRE_HERITAGE.height, 107.0);
  assert.equal(SOUTHORN_CENTRE_HERITAGE.storeys, 30);
  assert.equal(SOUTHORN_CENTRE_HERITAGE.osmWay, 148858987);

  assert.ok(SOUTHORN_CENTRE_SITE.w > 40 && SOUTHORN_CENTRE_SITE.w < 50, 'Width ~45m');
  assert.ok(SOUTHORN_CENTRE_SITE.d > 25 && SOUTHORN_CENTRE_SITE.d < 38, 'Depth ~31m');
  assert.equal(SOUTHORN_CENTRE_SITE.height, 107.0);
  assert.equal(SOUTHORN_CENTRE_SITE.osmId, 148858987);
});

test('Southorn Centre does not collide with active surface through-roads', async () => {
  const {
    SOUTHORN_CENTRE_RING
  } = await import('../js/cities/hongkong/southorn-centre-site.js');

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
          if (pointInFlatPolygon(SOUTHORN_CENTRE_RING, x, z)) {
            surfaceRoadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(surfaceRoadCollisionCount, 0, 'Southorn Centre must have zero ground surface through-road collisions');
});

test('Southorn Centre 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildSouthornCentre } = await import('../js/cities/hongkong/southorn-centre-world.js');

  const scene = new THREE.Scene();
  const res = buildSouthornCentre(scene, { groundOffset: 24.0 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 7, 'Should have 7 merged mesh layers');
  assert.equal(res.colliders.length, 1, 'Should provide a main tower collider');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'southorn-centre');
  assert.equal(res.stats.southornCentreHeight, 107.0);
  assert.equal(res.stats.southornCentreLevels, 30);
  assert.ok(res.stats.southornCentrePanes > 1000, 'Windows subdivided into individual bays with randomized lighting');
});
