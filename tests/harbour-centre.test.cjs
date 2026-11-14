// 海港中心 Harbour Centre (25 Harbour Road, Wan Chai) 單元測試
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

test('Harbour Centre (HK-B0053) site metadata and OSM source', async () => {
  const {
    HARBOUR_CENTRE_HERITAGE,
    HARBOUR_CENTRE_SITE,
    HARBOUR_CENTRE_RING
  } = await import('../js/cities/hongkong/harbour-centre-site.js');

  assert.equal(HARBOUR_CENTRE_HERITAGE.completionYear, 1977);
  assert.equal(HARBOUR_CENTRE_HERITAGE.height, 146.0);
  assert.equal(HARBOUR_CENTRE_HERITAGE.storeys, 35);
  assert.equal(HARBOUR_CENTRE_HERITAGE.osmRelation, 18183384);

  assert.ok(HARBOUR_CENTRE_SITE.w > 30 && HARBOUR_CENTRE_SITE.w < 40, 'Width ~34m');
  assert.ok(HARBOUR_CENTRE_SITE.d > 40 && HARBOUR_CENTRE_SITE.d < 50, 'Depth ~45m');
  assert.equal(HARBOUR_CENTRE_SITE.height, 146.0);
  assert.equal(HARBOUR_CENTRE_SITE.osmId, 18183384);
});

test('Harbour Centre does not collide with active surface through-roads', async () => {
  const {
    HARBOUR_CENTRE_RING
  } = await import('../js/cities/hongkong/harbour-centre-site.js');

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
          if (pointInFlatPolygon(HARBOUR_CENTRE_RING, x, z)) {
            surfaceRoadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(surfaceRoadCollisionCount, 0, 'Harbour Centre must have zero ground surface through-road collisions');
});

test('Harbour Centre 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildHarbourCentre } = await import('../js/cities/hongkong/harbour-centre-world.js');

  const scene = new THREE.Scene();
  const res = buildHarbourCentre(scene, { groundOffset: 24.0 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 9, 'Should have 9 merged mesh layers');
  assert.equal(res.colliders.length, 1, 'Should provide a main tower collider');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'harbour-centre');
  assert.equal(res.stats.harbourCentreHeight, 146.0);
  assert.equal(res.stats.harbourCentreLevels, 35);
  assert.ok(res.stats.harbourCentrePanes > 1000, 'Windows subdivided into individual bays with randomized lighting');
});
