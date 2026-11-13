// 華潤大廈 China Resources Building (26 Harbour Road, Wan Chai) 單元測試
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

test('China Resources Building (HK-B0042) site metadata and OSM source', async () => {
  const {
    CHINA_RESOURCES_HERITAGE,
    CHINA_RESOURCES_SITE,
    CHINA_RESOURCES_RING,
    CHINA_RESOURCES_RING_AREA,
    chinaResourcesLocalToWorld,
    chinaResourcesWorldToLocal
  } = await import('../js/cities/hongkong/china-resources-building-site.js');

  assert.equal(CHINA_RESOURCES_HERITAGE.completionYear, 1983);
  assert.equal(CHINA_RESOURCES_HERITAGE.renovationYear, 2012);
  assert.equal(CHINA_RESOURCES_HERITAGE.height, 178.0);
  assert.equal(CHINA_RESOURCES_HERITAGE.storeys, 49);
  assert.equal(CHINA_RESOURCES_HERITAGE.osmWay, 107497701);

  // Site dimensions
  assert.ok(CHINA_RESOURCES_SITE.w > 50 && CHINA_RESOURCES_SITE.w < 65, 'Width between 50m and 65m');
  assert.ok(CHINA_RESOURCES_SITE.d > 30 && CHINA_RESOURCES_SITE.d < 42, 'Depth between 30m and 42m');
  assert.ok(CHINA_RESOURCES_RING_AREA > 2000, 'Footprint area > 2000 m²');

  // Coordinate transforms
  const centerWorld = chinaResourcesLocalToWorld(0, 0);
  assert.ok(Math.abs(centerWorld.x - CHINA_RESOURCES_SITE.x) < 1e-4);
  assert.ok(Math.abs(centerWorld.z - CHINA_RESOURCES_SITE.z) < 1e-4);

  const localCenter = chinaResourcesWorldToLocal(CHINA_RESOURCES_SITE.x, CHINA_RESOURCES_SITE.z);
  assert.ok(Math.abs(localCenter.x) < 1e-4);
  assert.ok(Math.abs(localCenter.y || localCenter.z) < 1e-4);
});

test('China Resources Building does not collide with active surface vehicular roads', async () => {
  const { CHINA_RESOURCES_RING } = await import('../js/cities/hongkong/china-resources-building-site.js');

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
          if (pointInFlatPolygon(CHINA_RESOURCES_RING, x, z)) {
            roadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(roadCollisionCount, 0, 'China Resources Building must have zero ground road collisions');
});

test('China Resources Building 3D model builds with colliders, landmarks, and materials', async () => {
  const THREE = await import('three/webgpu');
  const { buildChinaResourcesBuilding } = await import('../js/cities/hongkong/china-resources-building-world.js');

  const scene = new THREE.Scene();
  const res = buildChinaResourcesBuilding(scene, { groundOffset: 5.0 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 9, 'Should have 9 merged mesh layers');
  assert.ok(res.colliders.length >= 2, 'Should provide colliders for shaft and podium');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'china-resources-building');
  assert.equal(res.stats.crbHeight, 178.0);
  assert.equal(res.stats.crbStoreys, 49);
});
