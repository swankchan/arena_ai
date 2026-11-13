// 統一中心 United Centre (95 Queensway, Admiralty) 單元測試
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

test('United Centre (HK-B0057) site metadata and OSM source', async () => {
  const {
    UNITED_CENTRE_HERITAGE,
    UNITED_CENTRE_SITE,
    UNITED_CENTRE_RING,
    UNITED_CENTRE_RING_AREA,
    unitedCentreLocalToWorld,
    unitedCentreWorldToLocal
  } = await import('../js/cities/hongkong/united-centre-site.js');

  assert.equal(UNITED_CENTRE_HERITAGE.completionYear, 1981);
  assert.equal(UNITED_CENTRE_HERITAGE.height, 140.0);
  assert.equal(UNITED_CENTRE_HERITAGE.storeys, 37);
  assert.equal(UNITED_CENTRE_HERITAGE.osmWay, 107336258);
  assert.equal(UNITED_CENTRE_HERITAGE.architect, 'Wong & Ouyang (HK) Ltd (王歐陽)');

  // Site dimensions
  assert.ok(UNITED_CENTRE_SITE.w > 38 && UNITED_CENTRE_SITE.w < 48, 'Width between 38m and 48m');
  assert.ok(UNITED_CENTRE_SITE.d > 38 && UNITED_CENTRE_SITE.d < 48, 'Depth between 38m and 48m');
  assert.ok(UNITED_CENTRE_RING_AREA > 1600, 'Footprint area > 1600 m²');

  // Coordinate transforms
  const centerWorld = unitedCentreLocalToWorld(0, 0);
  assert.ok(Math.abs(centerWorld.x - UNITED_CENTRE_SITE.x) < 1e-4);
  assert.ok(Math.abs(centerWorld.z - UNITED_CENTRE_SITE.z) < 1e-4);

  const localCenter = unitedCentreWorldToLocal(UNITED_CENTRE_SITE.x, UNITED_CENTRE_SITE.z);
  assert.ok(Math.abs(localCenter.x) < 1e-4);
  assert.ok(Math.abs(localCenter.y || localCenter.z) < 1e-4);
});

test('United Centre does not collide with active surface vehicular through-roads', async () => {
  const { UNITED_CENTRE_RING } = await import('../js/cities/hongkong/united-centre-site.js');

  const roadFiles = ['roads_major.json', 'roads_minor_nw.json', 'roads_minor_sw.json', 'roads_minor_ne.json', 'roads_minor_se.json'];
  let surfaceRoadCollisionCount = 0;

  for (const rf of roadFiles) {
    const fullPath = path.join(__dirname, '../tools/data/hongkong', rf);
    if (!fs.existsSync(fullPath)) continue;
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    for (const el of data.elements) {
      if (el.geometry) {
        // Exclude indoor covered station service bus lanes
        const isCoveredBusStation = el.tags && (el.tags.covered === 'yes' || el.tags.vehicle === 'no' || (el.tags.flags && (el.tags.flags & 4)));
        if (isCoveredBusStation) continue;

        for (const pt of el.geometry) {
          const [x, z] = project(pt.lon, pt.lat);
          if (pointInFlatPolygon(UNITED_CENTRE_RING, x, z)) {
            surfaceRoadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(surfaceRoadCollisionCount, 0, 'United Centre must have zero ground surface through-road collisions');
});

test('United Centre 3D model builds with colliders, landmarks, and materials', async () => {
  const THREE = await import('three/webgpu');
  const { buildUnitedCentre } = await import('../js/cities/hongkong/united-centre-world.js');

  const scene = new THREE.Scene();
  const res = buildUnitedCentre(scene, { groundOffset: 8.66 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 9, 'Should have 9 merged mesh layers');
  assert.ok(res.colliders.length >= 2, 'Should provide colliders for shaft and podium');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'united-centre');
  assert.equal(res.stats.unitedCentreHeight, 140.0);
  assert.equal(res.stats.unitedCentreStoreys, 37);
});
