const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let cullinan, terrain;
test.before(async () => {
  cullinan = await import('../js/cities/hongkong/cullinan-i-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
});
const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);

test('Cullinan I preserves the 14-vertex OSM North Tower and all published height/date/floor conventions separately', () => {
  const site = cullinan.CULLINAN_I_SITE;
  assert.equal(site.osmId, 200726114); assert.equal(site.source.version, 14); assert.equal(site.source.changeset, 168911077);
  assert.equal(site.localRing.length / 2, 14); assert.equal(site.ring.length, 30); assert.equal(cullinan.CULLINAN_I_TOWER_RING.length, 30);
  near(site.x, 143.7297083494973); near(site.z, -2625.408353509354);
  near(site.w, 68.12211685417242); near(site.d, 42.345256782545334); near(site.ry, 1.1783266023835839);
  near(site.ring[0], 137.1274014126583); near(site.ring[1], -2664.8160266953614);
  assert.equal(site.source.tags.height, '270'); assert.equal(site.source.tags['building:levels'], '68');
  assert.equal(site.source.tags['building:min_level'], '1'); assert.equal(site.source.tags.location, 'podium'); assert.equal(site.source.tags.podium, 'bulk');
  assert.equal(cullinan.CULLINAN_I_OSM_HEIGHT, 270); assert.equal(cullinan.CULLINAN_I_OFFICIAL_APPROX_HEIGHT, 270);
  assert.equal(cullinan.CULLINAN_I_HEIGHT, 269.9); assert.equal(cullinan.CULLINAN_I_TO_TIP_HEIGHT, 269.9);
  assert.equal(cullinan.CULLINAN_I_OSM_LEVELS, 68); assert.equal(cullinan.CULLINAN_I_LEVELS, 68); assert.equal(cullinan.CULLINAN_I_BELOW_GROUND_LEVELS, 1);
  assert.equal(cullinan.CULLINAN_I_OSM_START_DATE, 2007); assert.equal(cullinan.CULLINAN_I_COMPLETED_YEAR, 2008);
});

test('Cullinan I keeps the 40 m north-tower glass box, separate covered arrival and folded crown on authored frames', () => {
  assert.equal(cullinan.CULLINAN_I_GLASS_BOX_HEIGHT, 40); near(cullinan.cullinanIFloorY(11), 40); near(cullinan.cullinanIFloorY(68), 253.6);
  assert.equal(cullinan.CULLINAN_I_CROWN_VERTEX_HEIGHTS.length, 14);
  assert.equal(Math.max(...cullinan.CULLINAN_I_CROWN_VERTEX_HEIGHTS), 269.9);
  assert.ok(cullinan.CULLINAN_I_CROWN_VERTEX_HEIGHTS.every((height) => height >= cullinan.CULLINAN_I_VISUAL_WALL_TOP));
  assert.equal(cullinan.CULLINAN_I_ENTRANCE_EDGE, 0); near(cullinan.CULLINAN_I_ENTRANCE.x, 126.5640776156065); near(cullinan.CULLINAN_I_ENTRANCE.z, -2639.2973542103323);
  assert.ok(cullinan.CULLINAN_I_ENTRANCE.nx < -0.9 && cullinan.CULLINAN_I_ENTRANCE.nz < 0);
  assert.match(cullinan.CULLINAN_I_ENTRANCE.evidence, /Serviced Apartments/); assert.match(cullinan.CULLINAN_I_ENTRANCE.evidence, /no OSM door tag/);
  assert.equal(cullinan.CULLINAN_I_DROP_OFF_EDGE, 5); near(cullinan.CULLINAN_I_DROP_OFF.x, 136.61211732481863); near(cullinan.CULLINAN_I_DROP_OFF.z, -2602.1516016171845);
  assert.ok(cullinan.CULLINAN_I_DROP_OFF.nx < -0.9 && cullinan.CULLINAN_I_DROP_OFF.nz > 0);
  assert.equal(cullinan.CULLINAN_I_GROUND_RINGS.length, 3); assert.ok(cullinan.CULLINAN_I_GROUND_RINGS.every((ring) => ring.length >= 10));
  assert.equal(cullinan.cullinanIRingColliders(cullinan.CULLINAN_I_TOWER_RING, 0, 40, 0.85, [0]).length, 13);
  const collider = cullinan.cullinanIEdgeCollider(cullinan.CULLINAN_I_TOWER_RING, 0, 0, 0.25, 0, 40);
  assert.ok(Number.isFinite(collider.x) && Number.isFinite(collider.z) && collider.w > 0 && collider.maxY === 40);
  assert.ok([collider.minX, collider.maxX, collider.minZ, collider.maxZ].every(Number.isFinite));
  assert.ok(collider.minX < collider.maxX && collider.minZ < collider.maxZ);
  assert.ok(Number.isFinite(collider.obb?.cs) && Number.isFinite(collider.obb?.sn) && collider.obb?.hx > 0 && collider.obb?.hz > 0,
    'tower colliders must use the controller’s indexed OBB representation, not an unindexed shape-only box');
});

test('Cullinan I world has authored unitized glass, louvres, folded crown, gold C, arrival canopies and terrain wiring without photo assets', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/cullinan-i-world.js'), 'utf8');
  for (const pattern of [/CullinanIBlueSilverUnitizedVisionGlass/, /CullinanIContinuousVerticalAluminiumFins/,
    /CullinanIThreeVisualGraphiteLouvreBelts/, /CullinanIFoldedAngularCrownGlazing/, /CullinanIAngularCrownMetalCopings/,
    /CullinanINorthTower40mServicedApartmentsGlassBox/, /CullinanIGoldCAtriumEmblem/, /CullinanI40mGlassBoxIndividualTransparentPanes/,
    /CullinanIBetweenTowersDoubleHeightCoveredDropOff/, /CullinanIDropOffSweptMetalUpperCanopy/,
    /CullinanIDropOffPaleCylindricalColumns/, /CullinanIDropOffProceduralWaveStonePaving/]) assert.match(source, pattern);
  assert.doesNotMatch(source, /TextureLoader|GLTFLoader|\.jpg|\.png|image-search/);
  assert.match(source, /for \(const collider of colliders\) \{ collider\.minY \+= groundOffset; collider\.maxY \+= groundOffset; \}/);
  const meta = terrain.HONG_KONG_TERRAIN_META;
  near(meta.cullinanIPadHeight, terrain.rawHongKongTerrainHeight(cullinan.CULLINAN_I_SITE.x, cullinan.CULLINAN_I_SITE.z));
  near(meta.cullinanIPadHeight, 7.862226175755751);
  for (const ring of cullinan.CULLINAN_I_GROUND_RINGS) {
    let x = 0, z = 0; const count = ring.length / 2 - 1;
    for (let i = 0; i < ring.length - 2; i += 2) { x += ring[i]; z += ring[i + 1]; }
    near(terrain.hongKongTerrainHeight(x / count, z / count), meta.cullinanIPadHeight);
  }
});
