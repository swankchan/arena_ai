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

test('China Resources Building (HK-B0038) site metadata and OSM source', async () => {
  const {
    CHINA_RESOURCES_BUILDING_HERITAGE,
    CHINA_RESOURCES_BUILDING_SITE,
    CHINA_RESOURCES_BUILDING_RING
  } = await import('../js/cities/hongkong/china-resources-building-site.js');

  assert.equal(CHINA_RESOURCES_BUILDING_HERITAGE.completionYear, 1982);
  assert.equal(CHINA_RESOURCES_BUILDING_HERITAGE.height, 178.0);
  assert.equal(CHINA_RESOURCES_BUILDING_HERITAGE.storeys, 49);
  assert.equal(CHINA_RESOURCES_BUILDING_HERITAGE.osmWay, 107497701);

  assert.ok(CHINA_RESOURCES_BUILDING_SITE.w > 50 && CHINA_RESOURCES_BUILDING_SITE.w < 65, 'Width ~57.3m');
  assert.ok(CHINA_RESOURCES_BUILDING_SITE.d > 30 && CHINA_RESOURCES_BUILDING_SITE.d < 45, 'Depth ~36.7m');
  assert.equal(CHINA_RESOURCES_BUILDING_SITE.height, 178.0);
  assert.equal(CHINA_RESOURCES_BUILDING_SITE.osmId, 107497701);
});

test('China Resources Building does not collide with active surface through-roads', async () => {
  const {
    CHINA_RESOURCES_BUILDING_RING
  } = await import('../js/cities/hongkong/china-resources-building-site.js');

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
          if (pointInFlatPolygon(CHINA_RESOURCES_BUILDING_RING, x, z)) {
            surfaceRoadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(surfaceRoadCollisionCount, 0, 'China Resources Building must have zero ground surface through-road collisions');
});

test('China Resources Building 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildChinaResourcesBuilding } = await import('../js/cities/hongkong/china-resources-building-world.js');

  const scene = new THREE.Scene();
  const res = buildChinaResourcesBuilding(scene, { groundOffset: 24.0 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 9, 'Should have 9 merged mesh layers');
  assert.equal(res.colliders.length, 1, 'Should provide a main tower collider');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'chinaResources');
  assert.equal(res.stats.chinaResourcesHeight, 178.0);
  assert.equal(res.stats.chinaResourcesLevels, 49);
  assert.ok(res.stats.chinaResourcesPanes > 1000, 'Windows subdivided into individual bays with randomized lighting');
});
