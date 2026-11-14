// 力寶中心第二座 Lippo Centre Tower 2 (48-64 Queensway, Admiralty) 單元測試
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

test('Lippo Centre Tower 2 (HK-B0031) site metadata and OSM source', async () => {
  const {
    LIPPO_CENTRE_TOWER_2_HERITAGE,
    LIPPO_CENTRE_TOWER_2_SITE,
    LIPPO_CENTRE_TOWER_2_RING
  } = await import('../js/cities/hongkong/lippo-centre-tower-2-site.js');

  assert.equal(LIPPO_CENTRE_TOWER_2_HERITAGE.completionYear, 1989);
  assert.equal(LIPPO_CENTRE_TOWER_2_HERITAGE.height, 186.0);
  assert.equal(LIPPO_CENTRE_TOWER_2_HERITAGE.storeys, 48);
  assert.equal(LIPPO_CENTRE_TOWER_2_HERITAGE.osmWay, 107336263);

  assert.ok(LIPPO_CENTRE_TOWER_2_SITE.w > 39 && LIPPO_CENTRE_TOWER_2_SITE.w < 48, 'Width ~43.4m');
  assert.ok(LIPPO_CENTRE_TOWER_2_SITE.d > 36 && LIPPO_CENTRE_TOWER_2_SITE.d < 46, 'Depth ~41.3m');
  assert.equal(LIPPO_CENTRE_TOWER_2_SITE.height, 186.0);
  assert.equal(LIPPO_CENTRE_TOWER_2_SITE.osmId, 107336263);
});

test('Lippo Centre Tower 2 does not collide with active surface through-roads', async () => {
  const {
    LIPPO_CENTRE_TOWER_2_RING
  } = await import('../js/cities/hongkong/lippo-centre-tower-2-site.js');

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
          if (pointInFlatPolygon(LIPPO_CENTRE_TOWER_2_RING, x, z)) {
            surfaceRoadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(surfaceRoadCollisionCount, 0, 'Lippo Centre Tower 2 must have zero ground surface through-road collisions');
});

test('Lippo Centre Tower 2 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildLippoCentreTower2 } = await import('../js/cities/hongkong/lippo-centre-tower-2-world.js');

  const scene = new THREE.Scene();
  const res = buildLippoCentreTower2(scene, { groundOffset: 24.0 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 9, 'Should have 9 merged mesh layers');
  assert.equal(res.colliders.length, 1, 'Should provide a main tower collider');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'lippo-centre-tower-2');
  assert.equal(res.stats.lippoCentreTower2Height, 186.0);
  assert.equal(res.stats.lippoCentreTower2Levels, 48);
  assert.ok(res.stats.lippoCentreTower2Panes > 1000, 'Windows subdivided into individual bays with randomized lighting');
});
