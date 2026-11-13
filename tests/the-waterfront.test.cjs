const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let waterfront, terrain, siteUtils, authored;

test.before(async () => {
  waterfront = await import('../js/cities/hongkong/the-waterfront-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  siteUtils = await import('../js/cities/hongkong/landmark-site.js');
  authored = await import('../js/cities/hongkong/authored-landmark-site.js');
});

const inside = (ring, x, z) => siteUtils.pointInFlatRing(ring, x, z);

test('The Waterfront preserves the estate and all six exact OSM tower rings', () => {
  assert.equal(waterfront.WATERFRONT_ID, 'HK-KLN-WATERFRONT');
  assert.deepEqual(waterfront.WATERFRONT_TOWER_SITES.map((site) => site.osmId), [
    200720171, 200720174, 200720175, 200720173, 200720169, 200720172,
  ]);
  assert.deepEqual(waterfront.WATERFRONT_TOWER_SITES.map((site) => site.source.geometry.length), [
    76, 100, 85, 73, 85, 76,
  ]);
  assert.equal(waterfront.WATERFRONT_TOWER_SITES.length, 6);
  assert.ok(waterfront.WATERFRONT_SITE.ringArea > 8000);
});

test('source tower heights, levels and visual courses stay distinct and no T4 is invented', () => {
  for (const site of waterfront.WATERFRONT_TOWER_SITES) {
    assert.equal(site.height, 142.46);
    assert.equal(site.levels, 46);
    assert.equal(site.minHeight, 20);
    assert.equal(site.source.tags['building:min_level'], '4');
    assert.equal(site.source.tags.height, '142.46');
  }
  assert.equal(waterfront.WATERFRONT_VISUAL_COURSES, 42);
  assert.equal(waterfront.WATERFRONT_CROWN_HEIGHT, 6.5);
  // Verify tower numbers are 1, 2, 3, 5, 6, 7 — exactly six towers, no Tower 4
  const refs = waterfront.WATERFRONT_TOWER_SITES.map((s) => s.source.tags.ref);
  assert.deepEqual(refs, ['T1', 'T2', 'T3', 'T5', 'T6', 'T7']);
});

test('all retained station-road records under the podium are explicit', () => {
  assert.deepEqual(waterfront.WATERFRONT_T1_SITE.roadIds, [40425, 41217, 41227, 48411, 48412]);
  assert.deepEqual(waterfront.WATERFRONT_T2_SITE.roadIds, [40427, 40428, 41219, 41220, 48412, 48413, 48414, 48415]);
  assert.deepEqual(waterfront.WATERFRONT_T3_SITE.roadIds, [41221, 42116, 48416]);
  assert.deepEqual(waterfront.WATERFRONT_T5_SITE.roadIds, [40422, 40424, 41223, 48407, 48410, 48415]);
  assert.deepEqual(waterfront.WATERFRONT_T6_SITE.roadIds, [40431, 49064, 49065, 49066, 49069]);
  assert.deepEqual(waterfront.WATERFRONT_T7_SITE.roadIds, [40409, 40421, 40431, 40432, 49063, 49064, 49069]);
});

test('the Waterfront DTM pad is reproducible and all six towers sit within the podium', () => {
  const pad = terrain.theWaterfrontPadHeight();
  assert.equal(pad, terrain.HONG_KONG_TERRAIN_META.theWaterfrontPadHeight);
  assert.equal(pad, authored.authoredHighestRawDatum(waterfront.WATERFRONT_GROUND_SITES, terrain.rawHongKongTerrainHeight));
  for (const site of waterfront.WATERFRONT_TOWER_SITES) {
    for (let i = 0; i < site.ring.length; i += 2) {
      assert.ok(inside(waterfront.WATERFRONT_SITE.ring, site.ring[i], site.ring[i + 1]));
    }
  }
});

test('world source authors terracotta facades, white pilasters, stepped pyramidal crowns and garden deck without external textures', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/the-waterfront-world.js'), 'utf8');
  for (const pattern of [
    /warm terracotta ceramic spandrel tiles/,
    /individual azure residential window panes/,
    /full-height white vertical pilasters/,
    /stepped decorative white pediment cornices/,
    /The Waterfront — four-level podium and private landscaped garden deck/,
  ]) {
    assert.match(world, pattern);
  }
  assert.doesNotMatch(world, /\.(?:jpg|jpeg|png|webp)|TextureLoader/);
});

test('The Waterfront is integrated into world, ground, roads, map and runtime entry', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  const road = fs.readFileSync(path.join(root, 'js/cities/hongkong/road-elevation.js'), 'utf8');
  const map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  assert.match(simple, /buildTheWaterfront/);
  assert.match(simple, /theWaterfront\.groundHeightAt/);
  assert.match(simple, /\.\.\.theWaterfront\.colliders/);
  assert.match(simple, /\.\.\.theWaterfront\.landmarks/);
  assert.match(road, /WATERFRONT_GROUND_RINGS/);
  assert.match(map, /waterfrontMapSite/);
  assert.match(map, /waterfrontTowerMapSites/);
  assert.match(index, /theWaterfront: world\.theWaterfront/);
});

test('Node geometry is finite, all six towers and crowns are detailed', async () => {
  const THREE = await import('three/webgpu');
  const { buildTheWaterfront } = await import('../js/cities/hongkong/the-waterfront-world.js');
  const scene = new THREE.Scene(), world = buildTheWaterfront(scene, { groundOffset: 5.977 });
  let meshes = 0, vertices = 0, nonFinite = 0;
  scene.traverse((object) => {
    if (!object.isMesh) return;
    meshes++;
    const positions = object.geometry.getAttribute('position');
    vertices += positions?.count ?? 0;
    if (positions) for (const value of positions.array) if (!Number.isFinite(value)) nonFinite++;
  });
  assert.equal(nonFinite, 0);
  assert.ok(meshes >= 45);
  assert.ok(vertices > 1200000);
  assert.equal(world.stats.theWaterfrontSourceTowers, 6);
  assert.equal(world.stats.theWaterfrontHeight, 142.46);
  assert.equal(world.landmarks.length, 7);
});

test('residential glazing is double-sided and node-lit across all six towers and podium', async () => {
  const THREE = await import('three/webgpu');
  const { buildTheWaterfront } = await import('../js/cities/hongkong/the-waterfront-world.js');
  const scene = new THREE.Scene();
  buildTheWaterfront(scene, { groundOffset: 5.977 });
  let residential = 0;
  scene.traverse((o) => {
    if (!o.name.includes('individual azure residential window panes')) return;
    residential++;
    assert.equal(o.material.side, THREE.DoubleSide);
    assert.ok(o.material.isNodeMaterial && o.material.emissiveNode);
  });
  assert.equal(residential, 7); // 6 towers + 1 podium upper courses
});
