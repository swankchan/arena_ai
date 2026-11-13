// 美國銀行中心 Bank of America Tower (12 Harcourt Road, Admiralty) 單元測試
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

test('Bank of America Tower (HK-B0052) site metadata and OSM source', async () => {
  const {
    BANK_OF_AMERICA_TOWER_HERITAGE,
    BANK_OF_AMERICA_TOWER_SITE,
    BANK_OF_AMERICA_TOWER_RING,
    BANK_OF_AMERICA_TOWER_RING_AREA,
    bankOfAmericaTowerLocalToWorld,
    bankOfAmericaTowerWorldToLocal
  } = await import('../js/cities/hongkong/bank-of-america-tower-site.js');

  assert.equal(BANK_OF_AMERICA_TOWER_HERITAGE.completionYear, 1977);
  assert.equal(BANK_OF_AMERICA_TOWER_HERITAGE.height, 146.0);
  assert.equal(BANK_OF_AMERICA_TOWER_HERITAGE.storeys, 38);
  assert.equal(BANK_OF_AMERICA_TOWER_HERITAGE.osmRelation, 17045256);
  assert.equal(BANK_OF_AMERICA_TOWER_HERITAGE.osmWay, 107328020);

  // Site dimensions
  assert.ok(BANK_OF_AMERICA_TOWER_SITE.w > 45 && BANK_OF_AMERICA_TOWER_SITE.w < 60, 'Width between 45m and 60m');
  assert.ok(BANK_OF_AMERICA_TOWER_SITE.d > 60 && BANK_OF_AMERICA_TOWER_SITE.d < 75, 'Depth between 60m and 75m');
  assert.ok(BANK_OF_AMERICA_TOWER_RING_AREA > 3000, 'Footprint area > 3000 m²');

  // Coordinate transforms
  const centerWorld = bankOfAmericaTowerLocalToWorld(0, 0);
  assert.ok(Math.abs(centerWorld.x - BANK_OF_AMERICA_TOWER_SITE.x) < 1e-4);
  assert.ok(Math.abs(centerWorld.z - BANK_OF_AMERICA_TOWER_SITE.z) < 1e-4);

  const localCenter = bankOfAmericaTowerWorldToLocal(BANK_OF_AMERICA_TOWER_SITE.x, BANK_OF_AMERICA_TOWER_SITE.z);
  assert.ok(Math.abs(localCenter.x) < 1e-4);
  assert.ok(Math.abs(localCenter.y || localCenter.z) < 1e-4);
});

test('Bank of America Tower does not collide with active surface vehicular roads', async () => {
  const { BANK_OF_AMERICA_TOWER_RING } = await import('../js/cities/hongkong/bank-of-america-tower-site.js');

  const roadFiles = ['roads_major.json', 'roads_minor_nw.json', 'roads_minor_sw.json'];
  let roadCollisionCount = 0;

  for (const rf of roadFiles) {
    const fullPath = path.join(__dirname, '../tools/data/hongkong', rf);
    if (!fs.existsSync(fullPath)) continue;
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    for (const el of data.elements) {
      if (el.geometry) {
        for (const pt of el.geometry) {
          const [x, z] = project(pt.lon, pt.lat);
          if (pointInFlatPolygon(BANK_OF_AMERICA_TOWER_RING, x, z)) {
            roadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(roadCollisionCount, 0, 'Bank of America Tower must have zero ground road collisions');
});

test('Bank of America Tower 3D model builds with colliders, landmarks, and materials', async () => {
  const THREE = await import('three/webgpu');
  const { buildBankOfAmericaTower } = await import('../js/cities/hongkong/bank-of-america-tower-world.js');

  const scene = new THREE.Scene();
  const res = buildBankOfAmericaTower(scene, { groundOffset: 6.90 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 9, 'Should have 9 merged mesh layers');
  assert.ok(res.colliders.length >= 2, 'Should provide colliders for shaft and podium');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'bank-of-america-tower');
  assert.equal(res.stats.boaHeight, 146.0);
  assert.equal(res.stats.boaStoreys, 38);
});
