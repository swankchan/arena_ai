// 萬麗海景酒店 Renaissance Hong Kong Harbour View Hotel (101-109 Harbour Road, Wan Chai) 單元測試
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

test('Renaissance Harbour View Hotel (HK-B0050) site metadata and OSM source', async () => {
  const {
    RENAISSANCE_HARBOUR_VIEW_HERITAGE,
    RENAISSANCE_HARBOUR_VIEW_SITE,
    RENAISSANCE_HARBOUR_VIEW_RING
  } = await import('../js/cities/hongkong/renaissance-harbour-view-site.js');

  assert.equal(RENAISSANCE_HARBOUR_VIEW_HERITAGE.completionYear, 1989);
  assert.equal(RENAISSANCE_HARBOUR_VIEW_HERITAGE.height, 150.0);
  assert.equal(RENAISSANCE_HARBOUR_VIEW_HERITAGE.storeys, 42);
  assert.equal(RENAISSANCE_HARBOUR_VIEW_HERITAGE.osmWay, 107497707);

  assert.ok(RENAISSANCE_HARBOUR_VIEW_SITE.w > 70 && RENAISSANCE_HARBOUR_VIEW_SITE.w < 82, 'Width ~76m');
  assert.ok(RENAISSANCE_HARBOUR_VIEW_SITE.d > 28 && RENAISSANCE_HARBOUR_VIEW_SITE.d < 38, 'Depth ~32m');
  assert.equal(RENAISSANCE_HARBOUR_VIEW_SITE.height, 150.0);
  assert.equal(RENAISSANCE_HARBOUR_VIEW_SITE.osmId, 107497707);
});

test('Renaissance Harbour View Hotel does not collide with active surface through-roads', async () => {
  const {
    RENAISSANCE_HARBOUR_VIEW_RING
  } = await import('../js/cities/hongkong/renaissance-harbour-view-site.js');

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
          if (pointInFlatPolygon(RENAISSANCE_HARBOUR_VIEW_RING, x, z)) {
            surfaceRoadCollisionCount++;
          }
        }
      }
    }
  }

  assert.equal(surfaceRoadCollisionCount, 0, 'Renaissance Harbour View Hotel must have zero ground surface through-road collisions');
});

test('Renaissance Harbour View Hotel 3D model builds with colliders, landmarks, and randomized window night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildRenaissanceHarbourView } = await import('../js/cities/hongkong/renaissance-harbour-view-world.js');

  const scene = new THREE.Scene();
  const res = buildRenaissanceHarbourView(scene, { groundOffset: 24.0 });

  assert.ok(res.group);
  assert.equal(res.group.children.length, 9, 'Should have 9 merged mesh layers');
  assert.equal(res.colliders.length, 1, 'Should provide a main tower collider');
  assert.equal(res.landmarks.length, 1);
  assert.equal(res.landmarks[0].id, 'renaissance-harbour-view');
  assert.equal(res.stats.renaissanceHarbourViewHeight, 150.0);
  assert.equal(res.stats.renaissanceHarbourViewLevels, 42);
  assert.ok(res.stats.renaissanceHarbourViewPanes > 1000, 'Windows subdivided into individual bays with randomized lighting');
});
