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

test('Convention Plaza Office Tower (HK-B0034) site metadata and OSM source', async () => {
  const {
    CONVENTION_PLAZA_OFFICE_TOWER_HERITAGE,
    CONVENTION_PLAZA_OFFICE_TOWER_SITE,
    CONVENTION_PLAZA_OFFICE_TOWER_RING
  } = await import('../js/cities/hongkong/convention-plaza-office-tower-site.js');

  assert.equal(CONVENTION_PLAZA_OFFICE_TOWER_HERITAGE.completionYear, 1990);
  assert.equal(CONVENTION_PLAZA_OFFICE_TOWER_HERITAGE.height, 181.0);
  assert.equal(CONVENTION_PLAZA_OFFICE_TOWER_HERITAGE.storeys, 51);
  assert.equal(CONVENTION_PLAZA_OFFICE_TOWER_HERITAGE.osmWay, 107497689);

  assert.ok(CONVENTION_PLAZA_OFFICE_TOWER_SITE.w > 45 && CONVENTION_PLAZA_OFFICE_TOWER_SITE.w < 56, 'Width ~51m');
  assert.ok(CONVENTION_PLAZA_OFFICE_TOWER_SITE.d > 35 && CONVENTION_PLAZA_OFFICE_TOWER_SITE.d < 48, 'Depth ~41m');
  assert.equal(CONVENTION_PLAZA_OFFICE_TOWER_SITE.height, 181.0);
  assert.equal(CONVENTION_PLAZA_OFFICE_TOWER_SITE.osmId, 107497689);
});

test('Convention Plaza Office Tower does not collide with active surface through-roads', async () => {
  const {
    CONVENTION_PLAZA_OFFICE_TOWER_RING
  } = await import('../js/cities/hongkong/convention-plaza-office-tower-site.js');

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
          if (pointInFlatPolygon(CONVENTION_PLAZA_OFFICE_TOWER_RING, x, z)) {
            surfaceRoadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(surfaceRoadCollisionCount, 0, 'Convention Plaza Office Tower must have zero ground surface through-road collisions');
});

test('Convention Plaza Office Tower 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildConventionPlazaOfficeTower } = await import('../js/cities/hongkong/convention-plaza-office-tower-world.js');

  const scene = new THREE.Scene();
  const res = buildConventionPlazaOfficeTower(scene, { groundOffset: 24.0 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 9, 'Should have 9 merged mesh layers');
  assert.equal(res.colliders.length, 1, 'Should provide a main tower collider');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'conventionPlazaOffice');
  assert.equal(res.stats.conventionPlazaOfficeHeight, 181.0);
  assert.equal(res.stats.conventionPlazaOfficeLevels, 51);
  assert.ok(res.stats.conventionPlazaOfficePanes > 1000, 'Windows subdivided into individual bays with randomized lighting');
});
