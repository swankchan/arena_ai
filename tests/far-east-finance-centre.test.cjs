// 遠東金融中心 Far East Finance Centre (16-20 Des Voeux Road Central, Central) 單元測試
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

test('Far East Finance Centre (HK-B0039) site metadata and OSM source', async () => {
  const {
    FAR_EAST_FINANCE_CENTRE_HERITAGE,
    FAR_EAST_FINANCE_CENTRE_SITE,
    FAR_EAST_FINANCE_CENTRE_RING
  } = await import('../js/cities/hongkong/far-east-finance-centre-site.js');

  assert.equal(FAR_EAST_FINANCE_CENTRE_HERITAGE.completionYear, 1978);
  assert.equal(FAR_EAST_FINANCE_CENTRE_HERITAGE.height, 176.0);
  assert.equal(FAR_EAST_FINANCE_CENTRE_HERITAGE.storeys, 44);
  assert.equal(FAR_EAST_FINANCE_CENTRE_HERITAGE.osmWay, 107336261);

  assert.ok(FAR_EAST_FINANCE_CENTRE_SITE.w > 32 && FAR_EAST_FINANCE_CENTRE_SITE.w < 44, 'Width ~37.7m');
  assert.ok(FAR_EAST_FINANCE_CENTRE_SITE.d > 18 && FAR_EAST_FINANCE_CENTRE_SITE.d < 30, 'Depth ~23.5m');
  assert.equal(FAR_EAST_FINANCE_CENTRE_SITE.height, 176.0);
  assert.equal(FAR_EAST_FINANCE_CENTRE_SITE.osmId, 107336261);
});

test('Far East Finance Centre does not collide with active surface through-roads', async () => {
  const {
    FAR_EAST_FINANCE_CENTRE_RING
  } = await import('../js/cities/hongkong/far-east-finance-centre-site.js');

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
          if (pointInFlatPolygon(FAR_EAST_FINANCE_CENTRE_RING, x, z)) {
            surfaceRoadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(surfaceRoadCollisionCount, 0, 'Far East Finance Centre must have zero ground surface through-road collisions');
});

test('Far East Finance Centre 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildFarEastFinanceCentre } = await import('../js/cities/hongkong/far-east-finance-centre-world.js');

  const scene = new THREE.Scene();
  const res = buildFarEastFinanceCentre(scene, { groundOffset: 24.0 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 9, 'Should have 9 merged mesh layers');
  assert.equal(res.colliders.length, 1, 'Should provide a main tower collider');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'farEastFinance');
  assert.equal(res.stats.farEastFinanceHeight, 176.0);
  assert.equal(res.stats.farEastFinanceLevels, 44);
  assert.ok(res.stats.farEastFinancePanes > 1000, 'Windows subdivided into individual bays with randomized lighting');
});
