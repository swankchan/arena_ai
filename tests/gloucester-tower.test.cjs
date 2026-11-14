// 告羅士打大廈 Gloucester Tower (1-3 Gloucester Road, Central) 單元測試
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

test('Gloucester Tower (HK-B0046) site metadata and OSM source', async () => {
  const {
    GLOUCESTER_TOWER_HERITAGE,
    GLOUCESTER_TOWER_SITE,
    GLOUCESTER_TOWER_RING
  } = await import('../js/cities/hongkong/gloucester-tower-site.js');

  assert.equal(GLOUCESTER_TOWER_HERITAGE.completionYear, 1987);
  assert.equal(GLOUCESTER_TOWER_HERITAGE.height, 159.0);
  assert.equal(GLOUCESTER_TOWER_HERITAGE.storeys, 47);
  assert.equal(GLOUCESTER_TOWER_HERITAGE.osmWay, 107302745);

  assert.ok(GLOUCESTER_TOWER_SITE.w > 36 && GLOUCESTER_TOWER_SITE.w < 46, 'Width ~40m');
  assert.ok(GLOUCESTER_TOWER_SITE.d > 36 && GLOUCESTER_TOWER_SITE.d < 46, 'Depth ~40m');
  assert.equal(GLOUCESTER_TOWER_SITE.height, 159.0);
  assert.equal(GLOUCESTER_TOWER_SITE.osmId, 107302745);
});

test('Gloucester Tower does not collide with active surface through-roads', async () => {
  const {
    GLOUCESTER_TOWER_RING
  } = await import('../js/cities/hongkong/gloucester-tower-site.js');

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
          if (pointInFlatPolygon(GLOUCESTER_TOWER_RING, x, z)) {
            surfaceRoadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(surfaceRoadCollisionCount, 0, 'Gloucester Tower must have zero ground surface through-road collisions');
});

test('Gloucester Tower 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildGloucesterTower } = await import('../js/cities/hongkong/gloucester-tower-world.js');

  const scene = new THREE.Scene();
  const res = buildGloucesterTower(scene, { groundOffset: 24.0 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 9, 'Should have 9 merged mesh layers');
  assert.equal(res.colliders.length, 1, 'Should provide a main tower collider');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'gloucester-tower');
  assert.equal(res.stats.gloucesterTowerHeight, 159.0);
  assert.equal(res.stats.gloucesterTowerLevels, 47);
  assert.ok(res.stats.gloucesterTowerPanes > 1000, 'Windows subdivided into individual bays with randomized lighting');
});
