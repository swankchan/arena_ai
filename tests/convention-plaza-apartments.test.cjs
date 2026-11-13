// 會景閣 Convention Plaza Apartments (1 Harbour Road, Wan Chai) 單元測試
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

test('Convention Plaza Apartments (HK-B0044) site metadata and OSM source', async () => {
  const {
    CONVENTION_PLAZA_APARTMENTS_HERITAGE,
    CONVENTION_PLAZA_APARTMENTS_SITE,
    CONVENTION_PLAZA_APARTMENTS_RING,
    CONVENTION_PLAZA_APARTMENTS_RING_AREA,
    conventionPlazaApartmentsLocalToWorld,
    conventionPlazaApartmentsWorldToLocal
  } = await import('../js/cities/hongkong/convention-plaza-apartments-site.js');

  assert.equal(CONVENTION_PLAZA_APARTMENTS_HERITAGE.completionYear, 1989);
  assert.equal(CONVENTION_PLAZA_APARTMENTS_HERITAGE.height, 164.0);
  assert.equal(CONVENTION_PLAZA_APARTMENTS_HERITAGE.storeys, 47);
  assert.equal(CONVENTION_PLAZA_APARTMENTS_HERITAGE.osmWay, 107497692);
  assert.equal(CONVENTION_PLAZA_APARTMENTS_HERITAGE.architect, 'Ng Chun Man & Associates (伍振民建築師事務所)');

  // Site dimensions
  assert.ok(CONVENTION_PLAZA_APARTMENTS_SITE.w > 75 && CONVENTION_PLAZA_APARTMENTS_SITE.w < 90, 'Width between 75m and 90m');
  assert.ok(CONVENTION_PLAZA_APARTMENTS_SITE.d > 40 && CONVENTION_PLAZA_APARTMENTS_SITE.d < 55, 'Depth between 40m and 55m');
  assert.ok(CONVENTION_PLAZA_APARTMENTS_RING_AREA > 1600, 'Footprint area > 1600 m²');

  // Coordinate transforms
  const centerWorld = conventionPlazaApartmentsLocalToWorld(0, 0);
  assert.ok(Math.abs(centerWorld.x - CONVENTION_PLAZA_APARTMENTS_SITE.x) < 1e-4);
  assert.ok(Math.abs(centerWorld.z - CONVENTION_PLAZA_APARTMENTS_SITE.z) < 1e-4);

  const localCenter = conventionPlazaApartmentsWorldToLocal(CONVENTION_PLAZA_APARTMENTS_SITE.x, CONVENTION_PLAZA_APARTMENTS_SITE.z);
  assert.ok(Math.abs(localCenter.x) < 1e-4);
  assert.ok(Math.abs(localCenter.y || localCenter.z) < 1e-4);
});

test('Convention Plaza Apartments does not collide with active public through-roads', async () => {
  const { CONVENTION_PLAZA_APARTMENTS_RING } = await import('../js/cities/hongkong/convention-plaza-apartments-site.js');

  const roadFiles = ['roads_major.json', 'roads_minor_nw.json', 'roads_minor_sw.json', 'roads_minor_ne.json', 'roads_minor_se.json'];
  let publicRoadHits = 0;

  for (const rf of roadFiles) {
    const fullPath = path.join(__dirname, '../tools/data/hongkong', rf);
    if (!fs.existsSync(fullPath)) continue;
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    for (const el of data.elements) {
      if (el.geometry && el.tags && el.tags.highway !== 'service') {
        for (const pt of el.geometry) {
          const [x, z] = project(pt.lon, pt.lat);
          if (pointInFlatPolygon(CONVENTION_PLAZA_APARTMENTS_RING, x, z)) {
            publicRoadHits++;
          }
        }
      }
    }
  }

  assert.equal(publicRoadHits, 0, 'Convention Plaza Apartments must have zero public through-road collisions');
});

test('Convention Plaza Apartments 3D model builds with colliders, landmarks, and materials', async () => {
  const THREE = await import('three/webgpu');
  const { buildConventionPlazaApartments } = await import('../js/cities/hongkong/convention-plaza-apartments-world.js');

  const scene = new THREE.Scene();
  const res = buildConventionPlazaApartments(scene, { groundOffset: 5.0 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 11, 'Should have 11 merged mesh layers');
  assert.ok(res.colliders.length >= 3, 'Should provide colliders for wings and podium');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'convention-plaza-apartments');
  assert.equal(res.stats.conventionPlazaApartmentsHeight, 164.0);
  assert.equal(res.stats.conventionPlazaApartmentsStoreys, 47);
});
