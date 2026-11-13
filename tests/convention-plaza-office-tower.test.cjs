// 會展廣場辦公大樓 Convention Plaza Office Tower (1 Harbour Road, Wan Chai) 單元測試
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

test('Convention Plaza Office Tower (HK-B0036) site metadata and OSM source', async () => {
  const {
    CONVENTION_PLAZA_OFFICE_HERITAGE,
    CONVENTION_PLAZA_OFFICE_SITE,
    CONVENTION_PLAZA_OFFICE_RING,
    CONVENTION_PLAZA_OFFICE_RING_AREA,
    conventionPlazaOfficeLocalToWorld,
    conventionPlazaOfficeWorldToLocal
  } = await import('../js/cities/hongkong/convention-plaza-office-tower-site.js');

  assert.equal(CONVENTION_PLAZA_OFFICE_HERITAGE.completionYear, 1989);
  assert.equal(CONVENTION_PLAZA_OFFICE_HERITAGE.height, 181.0);
  assert.equal(CONVENTION_PLAZA_OFFICE_HERITAGE.storeys, 51);
  assert.equal(CONVENTION_PLAZA_OFFICE_HERITAGE.osmWay, 107497689);
  assert.equal(CONVENTION_PLAZA_OFFICE_HERITAGE.architect, 'Ng Chun Man & Associates (伍振民建築師事務所)');

  // Site dimensions
  assert.ok(CONVENTION_PLAZA_OFFICE_SITE.w > 45 && CONVENTION_PLAZA_OFFICE_SITE.w < 58, 'Width between 45m and 58m');
  assert.ok(CONVENTION_PLAZA_OFFICE_SITE.d > 35 && CONVENTION_PLAZA_OFFICE_SITE.d < 48, 'Depth between 35m and 48m');
  assert.ok(CONVENTION_PLAZA_OFFICE_RING_AREA > 1500, 'Footprint area > 1500 m²');

  // Coordinate transforms
  const centerWorld = conventionPlazaOfficeLocalToWorld(0, 0);
  assert.ok(Math.abs(centerWorld.x - CONVENTION_PLAZA_OFFICE_SITE.x) < 1e-4);
  assert.ok(Math.abs(centerWorld.z - CONVENTION_PLAZA_OFFICE_SITE.z) < 1e-4);

  const localCenter = conventionPlazaOfficeWorldToLocal(CONVENTION_PLAZA_OFFICE_SITE.x, CONVENTION_PLAZA_OFFICE_SITE.z);
  assert.ok(Math.abs(localCenter.x) < 1e-4);
  assert.ok(Math.abs(localCenter.y || localCenter.z) < 1e-4);
});

test('Convention Plaza Office Tower does not collide with active surface vehicular roads', async () => {
  const { CONVENTION_PLAZA_OFFICE_RING } = await import('../js/cities/hongkong/convention-plaza-office-tower-site.js');

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
          if (pointInFlatPolygon(CONVENTION_PLAZA_OFFICE_RING, x, z)) {
            roadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(roadCollisionCount, 0, 'Convention Plaza Office Tower must have zero ground road collisions');
});

test('Convention Plaza Office Tower 3D model builds with colliders, landmarks, and materials', async () => {
  const THREE = await import('three/webgpu');
  const { buildConventionPlazaOfficeTower } = await import('../js/cities/hongkong/convention-plaza-office-tower-world.js');

  const scene = new THREE.Scene();
  const res = buildConventionPlazaOfficeTower(scene, { groundOffset: 5.0 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 9, 'Should have 9 merged mesh layers');
  assert.ok(res.colliders.length >= 2, 'Should provide colliders for shaft and podium');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'convention-plaza-office-tower');
  assert.equal(res.stats.conventionPlazaOfficeHeight, 181.0);
  assert.equal(res.stats.conventionPlazaOfficeStoreys, 51);
});
