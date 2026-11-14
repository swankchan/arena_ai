// 中國工商銀行大廈 ICBC Tower (33-35 Des Voeux Road Central, Central) 單元測試
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

test('ICBC Tower (HK-B0041) site metadata and OSM source', async () => {
  const {
    ICBC_TOWER_HERITAGE,
    ICBC_TOWER_SITE,
    ICBC_TOWER_RING
  } = await import('../js/cities/hongkong/icbc-tower-site.js');

  assert.equal(ICBC_TOWER_HERITAGE.completionYear, 1993);
  assert.equal(ICBC_TOWER_HERITAGE.height, 167.0);
  assert.equal(ICBC_TOWER_HERITAGE.storeys, 40);
  assert.equal(ICBC_TOWER_HERITAGE.osmWay, 107497693);

  assert.ok(ICBC_TOWER_SITE.w > 65 && ICBC_TOWER_SITE.w < 76, 'Width ~70.8m');
  assert.ok(ICBC_TOWER_SITE.d > 30 && ICBC_TOWER_SITE.d < 42, 'Depth ~36.3m');
  assert.equal(ICBC_TOWER_SITE.height, 167.0);
  assert.equal(ICBC_TOWER_SITE.osmId, 107497693);
});

test('ICBC Tower does not collide with active surface through-roads', async () => {
  const {
    ICBC_TOWER_RING
  } = await import('../js/cities/hongkong/icbc-tower-site.js');

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
          if (pointInFlatPolygon(ICBC_TOWER_RING, x, z)) {
            surfaceRoadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(surfaceRoadCollisionCount, 0, 'ICBC Tower must have zero ground surface through-road collisions');
});

test('ICBC Tower 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildIcbcTower } = await import('../js/cities/hongkong/icbc-tower-world.js');

  const scene = new THREE.Scene();
  const res = buildIcbcTower(scene, { groundOffset: 24.0 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 9, 'Should have 9 merged mesh layers');
  assert.equal(res.colliders.length, 1, 'Should provide a main tower collider');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'icbc-tower');
  assert.equal(res.stats.icbcTowerHeight, 167.0);
  assert.equal(res.stats.icbcTowerLevels, 40);
  assert.ok(res.stats.icbcTowerPanes > 1000, 'Windows subdivided into individual bays with randomized lighting');
});
