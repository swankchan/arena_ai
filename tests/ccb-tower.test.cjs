// 中國建設銀行大廈 CCB Tower (3 Connaught Road Central, Central) 單元測試
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

test('CCB Tower site metadata and OSM source', async () => {
  const {
    CCB_TOWER_HERITAGE,
    CCB_TOWER_SITE,
    CCB_TOWER_RING,
    CCB_TOWER_RING_AREA,
    ccbTowerLocalToWorld,
    ccbTowerWorldToLocal
  } = await import('../js/cities/hongkong/ccb-tower-site.js');

  assert.equal(CCB_TOWER_HERITAGE.completionYear, 2012);
  assert.equal(CCB_TOWER_HERITAGE.height, 135.0);
  assert.equal(CCB_TOWER_HERITAGE.storeys, 31);
  assert.equal(CCB_TOWER_HERITAGE.osmWay, 242113651);
  assert.equal(CCB_TOWER_HERITAGE.architect, 'Aedas');

  // Site dimensions
  assert.ok(CCB_TOWER_SITE.w > 40 && CCB_TOWER_SITE.w < 50, 'Width between 40m and 50m');
  assert.ok(CCB_TOWER_SITE.d > 20 && CCB_TOWER_SITE.d < 32, 'Depth between 20m and 32m');
  assert.ok(CCB_TOWER_RING_AREA > 1000, 'Footprint area > 1000 m²');

  // Coordinate transforms
  const centerWorld = ccbTowerLocalToWorld(0, 0);
  assert.ok(Math.abs(centerWorld.x - CCB_TOWER_SITE.x) < 1e-4);
  assert.ok(Math.abs(centerWorld.z - CCB_TOWER_SITE.z) < 1e-4);

  const localCenter = ccbTowerWorldToLocal(CCB_TOWER_SITE.x, CCB_TOWER_SITE.z);
  assert.ok(Math.abs(localCenter.x) < 1e-4);
  assert.ok(Math.abs(localCenter.y || localCenter.z) < 1e-4);
});

test('CCB Tower does not collide with active surface vehicular roads', async () => {
  const { CCB_TOWER_RING } = await import('../js/cities/hongkong/ccb-tower-site.js');

  const roadFiles = ['roads_major.json', 'roads_minor_nw.json', 'roads_minor_sw.json', 'roads_minor_ne.json', 'roads_minor_se.json'];
  let roadCollisionCount = 0;

  for (const rf of roadFiles) {
    const fullPath = path.join(__dirname, '../tools/data/hongkong', rf);
    if (!fs.existsSync(fullPath)) continue;
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    for (const el of data.elements) {
      if (el.geometry) {
        for (const pt of el.geometry) {
          const [x, z] = project(pt.lon, pt.lat);
          if (pointInFlatPolygon(CCB_TOWER_RING, x, z)) {
            roadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(roadCollisionCount, 0, 'CCB Tower must have zero ground road collisions');
});

test('CCB Tower 3D model builds with colliders, landmarks, and materials', async () => {
  const THREE = await import('three/webgpu');
  const { buildCcbTower } = await import('../js/cities/hongkong/ccb-tower-world.js');

  const scene = new THREE.Scene();
  const res = buildCcbTower(scene, { groundOffset: 5.33 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 8, 'Should have 8 merged mesh layers');
  assert.ok(res.colliders.length >= 2, 'Should provide colliders for shaft and podium');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'ccb-tower');
  assert.equal(res.stats.ccbHeight, 135.0);
  assert.equal(res.stats.ccbStoreys, 31);
});
