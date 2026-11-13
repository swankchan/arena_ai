// 海富中心 Admiralty Centre (18 Harcourt Road, Admiralty) 單元測試
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

test('Admiralty Centre (HK-B0063 / HK-B0064) site metadata and OSM sources', async () => {
  const {
    ADMIRALTY_CENTRE_HERITAGE,
    ADMIRALTY_CENTRE_SITE,
    ADMIRALTY_CENTRE_T1_RING,
    ADMIRALTY_CENTRE_T2_RING
  } = await import('../js/cities/hongkong/admiralty-centre-site.js');

  assert.equal(ADMIRALTY_CENTRE_HERITAGE.completionYear, 1980);
  assert.equal(ADMIRALTY_CENTRE_HERITAGE.heightTower1, 126.0);
  assert.equal(ADMIRALTY_CENTRE_HERITAGE.heightTower2, 104.0);
  assert.equal(ADMIRALTY_CENTRE_HERITAGE.osmWayTower1, 107336262);
  assert.equal(ADMIRALTY_CENTRE_HERITAGE.osmWayTower2, 107336259);

  // Tower 1 & Tower 2 dimensions
  assert.ok(ADMIRALTY_CENTRE_SITE.t1.w > 40 && ADMIRALTY_CENTRE_SITE.t1.w < 50, 'T1 Width ~44m');
  assert.ok(ADMIRALTY_CENTRE_SITE.t1.d > 38 && ADMIRALTY_CENTRE_SITE.t1.d < 48, 'T1 Depth ~43m');
  assert.ok(ADMIRALTY_CENTRE_SITE.t2.w > 25 && ADMIRALTY_CENTRE_SITE.t2.w < 35, 'T2 Width ~30m');
  assert.ok(ADMIRALTY_CENTRE_SITE.t2.d > 25 && ADMIRALTY_CENTRE_SITE.t2.d < 35, 'T2 Depth ~30m');
});

test('Admiralty Centre does not collide with active surface vehicular roads', async () => {
  const {
    ADMIRALTY_CENTRE_T1_RING,
    ADMIRALTY_CENTRE_T2_RING
  } = await import('../js/cities/hongkong/admiralty-centre-site.js');

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
          if (pointInFlatPolygon(ADMIRALTY_CENTRE_T1_RING, x, z) ||
              pointInFlatPolygon(ADMIRALTY_CENTRE_T2_RING, x, z)) {
            roadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(roadCollisionCount, 0, 'Admiralty Centre must have zero ground road collisions');
});

test('Admiralty Centre 3D model builds twin towers with colliders, landmarks, and materials', async () => {
  const THREE = await import('three/webgpu');
  const { buildAdmiraltyCentre } = await import('../js/cities/hongkong/admiralty-centre-world.js');

  const scene = new THREE.Scene();
  const res = buildAdmiraltyCentre(scene, { groundOffsetT1: 5.37, groundOffsetT2: 6.27 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 9, 'Should have 9 merged mesh layers');
  assert.equal(res.colliders.length, 4, 'Should provide colliders for both towers (shaft + podium)');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'admiralty-centre');
  assert.equal(res.stats.admiraltyCentreHeightT1, 126.0);
  assert.equal(res.stats.admiraltyCentreHeightT2, 104.0);
});
