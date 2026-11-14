// 香港君悅酒店 Grand Hyatt Hong Kong (1 Harbour Road, Wan Chai) 單元測試
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

test('Grand Hyatt Hong Kong (HK-B0062) site metadata and OSM source', async () => {
  const {
    GRAND_HYATT_HONG_KONG_HERITAGE,
    GRAND_HYATT_HONG_KONG_SITE,
    GRAND_HYATT_HONG_KONG_RING
  } = await import('../js/cities/hongkong/grand-hyatt-hong-kong-site.js');

  assert.equal(GRAND_HYATT_HONG_KONG_HERITAGE.completionYear, 1989);
  assert.equal(GRAND_HYATT_HONG_KONG_HERITAGE.height, 129.0);
  assert.equal(GRAND_HYATT_HONG_KONG_HERITAGE.storeys, 36);
  assert.equal(GRAND_HYATT_HONG_KONG_HERITAGE.osmWay, 107497699);

  assert.ok(GRAND_HYATT_HONG_KONG_SITE.w > 70 && GRAND_HYATT_HONG_KONG_SITE.w < 82, 'Width ~76m');
  assert.ok(GRAND_HYATT_HONG_KONG_SITE.d > 28 && GRAND_HYATT_HONG_KONG_SITE.d < 40, 'Depth ~35m');
  assert.equal(GRAND_HYATT_HONG_KONG_SITE.height, 129.0);
  assert.equal(GRAND_HYATT_HONG_KONG_SITE.osmId, 107497699);
});

test('Grand Hyatt Hong Kong does not collide with active surface through-roads', async () => {
  const {
    GRAND_HYATT_HONG_KONG_RING
  } = await import('../js/cities/hongkong/grand-hyatt-hong-kong-site.js');

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
          if (pointInFlatPolygon(GRAND_HYATT_HONG_KONG_RING, x, z)) {
            surfaceRoadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(surfaceRoadCollisionCount, 0, 'Grand Hyatt Hong Kong must have zero ground surface through-road collisions');
});

test('Grand Hyatt Hong Kong 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildGrandHyattHongKong } = await import('../js/cities/hongkong/grand-hyatt-hong-kong-world.js');

  const scene = new THREE.Scene();
  const res = buildGrandHyattHongKong(scene, { groundOffset: 24.0 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 9, 'Should have 9 merged mesh layers');
  assert.equal(res.colliders.length, 1, 'Should provide a main tower collider');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'grand-hyatt-hong-kong');
  assert.equal(res.stats.grandHyattHongKongHeight, 129.0);
  assert.equal(res.stats.grandHyattHongKongLevels, 36);
  assert.ok(res.stats.grandHyattHongKongPanes > 1000, 'Windows subdivided into individual bays with randomized lighting');
});
