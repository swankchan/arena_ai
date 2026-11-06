const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let THREE, architecture, world, scene, GEO, siteUtils, colliders, lamps, clearance, starFerry;

const clearedLampPositions = () => {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed), result = [];
  for (let index = 0; index < lamps.length; index++) {
    if (suppressed.has(index)) continue;
    const lamp = lamps[index], override = overrides.get(index);
    const x = lamp[0] + (override?.[1] || 0) / 100, z = lamp[1] + (override?.[2] || 0) / 100;
    if (x > 950 && x < 1900 && z > -1700 && z < -1100) result.push({ index, x, z });
  }
  return result;
};

test.before(async () => {
  THREE = await import('three/webgpu');
  architecture = await import('../js/cities/hongkong/tst-waterfront-railing-architecture.js');
  GEO = (await import('../js/hk-geodata.js')).GEO;
  siteUtils = await import('../js/cities/hongkong/landmark-site.js');
  starFerry = await import('../js/cities/hongkong/star-ferry-data.js');
  colliders = await import('../js/cities/hongkong/colliders.js');
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
  const { buildTstWaterfrontRailing } = await import('../js/cities/hongkong/tst-waterfront-railing-world.js');
  scene = new THREE.Scene(); world = buildTstWaterfrontRailing(scene);
});

test('the railing follows the canonical Star Ferry to Tsim East coastline without moving the shore', () => {
  const source = architecture.TST_WATERFRONT_RAILING_SOURCE;
  assert.equal(source.landRing, 0); assert.equal(source.firstVertex, 346); assert.equal(source.lastVertex, 373);
  assert.deepEqual([GEO.land[0][source.firstVertex * 2], GEO.land[0][source.firstVertex * 2 + 1]], [1024, -1226]);
  assert.deepEqual([GEO.land[0][source.lastVertex * 2], GEO.land[0][source.lastVertex * 2 + 1]], [1806, -1587]);
  const path = architecture.tstWaterfrontRailingPath();
  assert.ok(path.length > 1600); assert.ok(world.stats.tstWaterfrontRailingLength > 1000);
  assert.ok(world.stats.tstWaterfrontRailingLength < 1100);
  for (const point of path) {
    assert.equal(siteUtils.pointInFlatRing(GEO.land[0], point.x, point.z), true);
    assert.equal(siteUtils.pointInFlatRing(starFerry.STAR_FERRY_TERMINAL_BY_ID['tsim-sha-tsui'].ring, point.x, point.z), false);
  }
  assert.match(source.coastlineEvidence, /source coastline is not moved/);
});

test('the official wide wood-substitute handrail and undulating steel balustrade are geometric and asset-free', () => {
  assert.match(architecture.TST_WATERFRONT_RAILING_SOURCE.designEvidence, /greening\.gov\.hk/);
  assert.match(architecture.TST_WATERFRONT_RAILING_SOURCE.designNote, /bio-based wood substitute/);
  assert.match(architecture.TST_WATERFRONT_RAILING_SOURCE.designNote, /undulating wave-like/);
  assert.equal(architecture.TST_WATERFRONT_RAILING_STYLE.handrailWidth, .28);
  assert.ok(architecture.TST_WATERFRONT_RAILING_STYLE.waveAmplitude > 0);
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/tst-waterfront-railing-world.js'), 'utf8');
  assert.doesNotMatch(source, /TextureLoader|\.(?:jpg|jpeg|png|webp)/);
  assert.equal(world.stats.tstWaterfrontRailingPhotoTextures, 0);
});

test('the real service-road mouth remains open through both visible rails and collision bays', () => {
  assert.equal(world.stats.tstWaterfrontRailingRoadOpenings, 1);
  assert.ok(world.stats.tstWaterfrontRailingRoadOpeningSamples >= 8);
  const open = world.samples.filter((point) => point.roadOpen);
  assert.ok(open.every((point) => point.x > 1680 && point.x < 1700 && point.z < -1390 && point.z > -1420));
  for (const point of open) for (const collider of world.colliders) {
    assert.equal(colliders.colliderContains(collider, point.x, point.z), false, 'service-road mouth blocked by railing collider');
  }
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/tst-waterfront-railing-world.js'), 'utf8');
  assert.match(source, /point\.roadOpen \|\| next\.roadOpen\) continue/);
});

test('no cleared promenade streetlight intersects the new railing centreline', () => {
  const positions = clearedLampPositions();
  for (const point of world.samples) for (const lamp of positions) {
    assert.ok(Math.hypot(point.x - lamp.x, point.z - lamp.z) >= .6, `lamp ${lamp.index} intersects railing`);
  }
});

test('Node geometry is finite and densely authored along the full promenade', () => {
  let meshes = 0, vertices = 0, nonFinite = 0;
  scene.traverse((object) => {
    if (!object.isMesh) return; meshes++;
    const positions = object.geometry.getAttribute('position'); vertices += positions?.count || 0;
    if (positions) for (const value of positions.array) if (!Number.isFinite(value)) nonFinite++;
  });
  assert.equal(nonFinite, 0); assert.equal(meshes, 5); assert.ok(vertices > 150000);
  assert.ok(world.stats.tstWaterfrontRailingBalusters > 1600);
  assert.ok(world.stats.tstWaterfrontRailingPosts > 300);
  assert.ok(world.stats.tstWaterfrontRailingColliders > 400);
  assert.ok(world.samples.every((point) => Number.isFinite(point.y)));
});

test('the railing is integrated into unified world stats, collisions, debug access and runtime', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  assert.match(simple, /buildTstWaterfrontRailing/);
  assert.match(simple, /\.\.\.tstWaterfrontRailing\.stats/);
  assert.match(simple, /\.\.\.tstWaterfrontRailing\.colliders/);
  assert.match(index, /tstWaterfrontRailing: world\.tstWaterfrontRailing/);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'js/app.runtime.manifest.json'), 'utf8'));
  assert.ok(manifest.inputs.includes('js/cities/hongkong/tst-waterfront-railing-world.js'));
  assert.ok(manifest.inputs.includes('js/cities/hongkong/tst-waterfront-railing-architecture.js'));
});
