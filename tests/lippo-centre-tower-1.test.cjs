// 力寶中心第一座 Lippo Centre Tower 1 (48-64 Queensway, Admiralty) 單元測試
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

test('Lippo Centre Tower 1 (HK-B0040) site metadata and OSM source', async () => {
  const {
    LIPPO_CENTRE_TOWER_1_HERITAGE,
    LIPPO_CENTRE_TOWER_1_SITE,
    LIPPO_CENTRE_TOWER_1_RING
  } = await import('../js/cities/hongkong/lippo-centre-tower-1-site.js');

  assert.equal(LIPPO_CENTRE_TOWER_1_HERITAGE.completionYear, 1988);
  assert.equal(LIPPO_CENTRE_TOWER_1_HERITAGE.height, 172.0);
  assert.equal(LIPPO_CENTRE_TOWER_1_HERITAGE.storeys, 45);
  assert.equal(LIPPO_CENTRE_TOWER_1_HERITAGE.osmWay, 107336260);

  assert.ok(LIPPO_CENTRE_TOWER_1_SITE.w > 38 && LIPPO_CENTRE_TOWER_1_SITE.w < 48, 'Width ~42.7m');
  assert.ok(LIPPO_CENTRE_TOWER_1_SITE.d > 36 && LIPPO_CENTRE_TOWER_1_SITE.d < 46, 'Depth ~41.6m');
  assert.equal(LIPPO_CENTRE_TOWER_1_SITE.height, 172.0);
  assert.equal(LIPPO_CENTRE_TOWER_1_SITE.osmId, 107336260);
});

test('Lippo Centre Tower 1 does not collide with active surface through-roads', async () => {
  const {
    LIPPO_CENTRE_TOWER_1_RING
  } = await import('../js/cities/hongkong/lippo-centre-tower-1-site.js');

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
          if (pointInFlatPolygon(LIPPO_CENTRE_TOWER_1_RING, x, z)) {
            surfaceRoadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(surfaceRoadCollisionCount, 0, 'Lippo Centre Tower 1 must have zero ground surface through-road collisions');
});

test('Lippo Centre Tower 1 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildLippoCentreTower1 } = await import('../js/cities/hongkong/lippo-centre-tower-1-world.js');

  const scene = new THREE.Scene();
  const res = buildLippoCentreTower1(scene, { groundOffset: 24.0 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 9, 'Should have 9 merged mesh layers');
  assert.equal(res.colliders.length, 1, 'Should provide a main tower collider');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'lippo-centre-tower-1');
  assert.equal(res.stats.lippoCentreTower1Height, 172.0);
  assert.equal(res.stats.lippoCentreTower1Levels, 45);
  assert.ok(res.stats.lippoCentreTower1Panes > 1000, 'Windows subdivided into individual bays with randomized lighting');
});
