// 中信大廈 CITIC Tower (1 Tim Mei Avenue, Tamar, Admiralty) 單元測試
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

test('CITIC Tower (HK-B0022 / HK-B0062) site metadata and OSM source', async () => {
  const {
    CITIC_TOWER_HERITAGE,
    CITIC_TOWER_SITE,
    CITIC_TOWER_RING,
    CITIC_TOWER_RING_AREA,
    citicTowerLocalToWorld,
    citicTowerWorldToLocal
  } = await import('../js/cities/hongkong/citic-tower-site.js');

  assert.equal(CITIC_TOWER_HERITAGE.completionYear, 1997);
  assert.equal(CITIC_TOWER_HERITAGE.height, 126.0);
  assert.equal(CITIC_TOWER_HERITAGE.storeys, 33);
  assert.equal(CITIC_TOWER_HERITAGE.osmWay, 107353963);
  assert.equal(CITIC_TOWER_HERITAGE.architect, 'P&T Architects and Engineers Ltd (巴馬丹拿)');

  // Site dimensions
  assert.ok(CITIC_TOWER_SITE.w > 45 && CITIC_TOWER_SITE.w < 65, 'Width between 45m and 65m');
  assert.ok(CITIC_TOWER_SITE.d > 40 && CITIC_TOWER_SITE.d < 60, 'Depth between 40m and 60m');
  assert.ok(CITIC_TOWER_RING_AREA > 1800, 'Footprint area > 1800 m²');

  // Coordinate transforms
  const centerWorld = citicTowerLocalToWorld(0, 0);
  assert.ok(Math.abs(centerWorld.x - CITIC_TOWER_SITE.x) < 1e-4);
  assert.ok(Math.abs(centerWorld.z - CITIC_TOWER_SITE.z) < 1e-4);

  const localCenter = citicTowerWorldToLocal(CITIC_TOWER_SITE.x, CITIC_TOWER_SITE.z);
  assert.ok(Math.abs(localCenter.x) < 1e-4);
  assert.ok(Math.abs(localCenter.y || localCenter.z) < 1e-4);
});

test('CITIC Tower does not collide with active surface vehicular roads', async () => {
  const { CITIC_TOWER_RING } = await import('../js/cities/hongkong/citic-tower-site.js');

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
          if (pointInFlatPolygon(CITIC_TOWER_RING, x, z)) {
            roadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(roadCollisionCount, 0, 'CITIC Tower must have zero ground road collisions');
});

test('CITIC Tower 3D model builds with colliders, landmarks, and materials', async () => {
  const THREE = await import('three/webgpu');
  const { buildCiticTower } = await import('../js/cities/hongkong/citic-tower-world.js');

  const scene = new THREE.Scene();
  const res = buildCiticTower(scene, { groundOffset: 5.68 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 8, 'Should have 8 merged mesh layers');
  assert.ok(res.colliders.length >= 2, 'Should provide colliders for shaft and podium');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'citic-tower');
  assert.equal(res.stats.citicHeight, 126.0);
  assert.equal(res.stats.citicStoreys, 33);
});
