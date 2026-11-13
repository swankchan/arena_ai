// 交易廣場第三座 Three Exchange Square (8 Connaught Place, Central) 單元測試
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

test('Three Exchange Square site metadata and OSM source', async () => {
  const {
    THREE_EXCHANGE_HERITAGE,
    THREE_EXCHANGE_SITE,
    THREE_EXCHANGE_RING,
    THREE_EXCHANGE_RING_AREA,
    threeExchangeLocalToWorld,
    threeExchangeWorldToLocal
  } = await import('../js/cities/hongkong/three-exchange-square-site.js');

  assert.equal(THREE_EXCHANGE_HERITAGE.completionYear, 1988);
  assert.equal(THREE_EXCHANGE_HERITAGE.height, 144.0);
  assert.equal(THREE_EXCHANGE_HERITAGE.storeys, 32);
  assert.equal(THREE_EXCHANGE_HERITAGE.osmWay, 148554950);
  assert.equal(THREE_EXCHANGE_HERITAGE.architect, 'Palmer & Turner (巴馬丹拿)');

  // Site dimensions
  assert.ok(THREE_EXCHANGE_SITE.w > 32 && THREE_EXCHANGE_SITE.w < 45, 'Width between 32m and 45m');
  assert.ok(THREE_EXCHANGE_SITE.d > 32 && THREE_EXCHANGE_SITE.d < 45, 'Depth between 32m and 45m');
  assert.ok(THREE_EXCHANGE_RING_AREA > 1200, 'Footprint area > 1200 m²');

  // Coordinate transforms
  const centerWorld = threeExchangeLocalToWorld(0, 0);
  assert.ok(Math.abs(centerWorld.x - THREE_EXCHANGE_SITE.x) < 1e-4);
  assert.ok(Math.abs(centerWorld.z - THREE_EXCHANGE_SITE.z) < 1e-4);

  const localCenter = threeExchangeWorldToLocal(THREE_EXCHANGE_SITE.x, THREE_EXCHANGE_SITE.z);
  assert.ok(Math.abs(localCenter.x) < 1e-4);
  assert.ok(Math.abs(localCenter.y || localCenter.z) < 1e-4);
});

test('Three Exchange Square does not collide with active surface vehicular through-roads', async () => {
  const { THREE_EXCHANGE_RING } = await import('../js/cities/hongkong/three-exchange-square-site.js');

  const roadFiles = ['roads_major.json', 'roads_minor_nw.json', 'roads_minor_sw.json', 'roads_minor_ne.json', 'roads_minor_se.json'];
  let surfaceRoadCollisionCount = 0;

  for (const rf of roadFiles) {
    const fullPath = path.join(__dirname, '../tools/data/hongkong', rf);
    if (!fs.existsSync(fullPath)) continue;
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    for (const el of data.elements) {
      if (el.geometry) {
        // Exclude internal indoor bus terminus / private covered service tracks
        const isCoveredBusStation = el.tags && (el.tags.covered === 'yes' || el.tags.vehicle === 'no' || (el.tags.flags && (el.tags.flags & 4)));
        if (isCoveredBusStation) continue;

        for (const pt of el.geometry) {
          const [x, z] = project(pt.lon, pt.lat);
          if (pointInFlatPolygon(THREE_EXCHANGE_RING, x, z)) {
            surfaceRoadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(surfaceRoadCollisionCount, 0, 'Three Exchange Square must have zero ground surface through-road collisions');
});

test('Three Exchange Square 3D model builds with colliders, landmarks, and materials', async () => {
  const THREE = await import('three/webgpu');
  const { buildThreeExchangeSquare } = await import('../js/cities/hongkong/three-exchange-square-world.js');

  const scene = new THREE.Scene();
  const res = buildThreeExchangeSquare(scene, { groundOffset: 3.85 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 8, 'Should have 8 merged mesh layers');
  assert.ok(res.colliders.length >= 2, 'Should provide colliders for shaft and podium');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'three-exchange-square');
  assert.equal(res.stats.threeExchangeHeight, 144.0);
  assert.equal(res.stats.threeExchangeStoreys, 32);
});
