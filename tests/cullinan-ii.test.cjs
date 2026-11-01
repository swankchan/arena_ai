const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let cullinan, terrain;
test.before(async () => {
  cullinan = await import('../js/cities/hongkong/cullinan-ii-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
});
const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);

test('Cullinan II preserves the current 15-vertex OSM South Tower and separate published conventions', () => {
  const site = cullinan.CULLINAN_II_SITE;
  assert.equal(site.osmId, 25608721); assert.equal(site.source.version, 21); assert.equal(site.source.changeset, 169345401);
  assert.equal(site.localRing.length / 2, 15); assert.equal(site.ring.length, 32); assert.equal(cullinan.CULLINAN_II_TOWER_RING.length, 32);
  near(site.x, 107.96646025342716); near(site.z, -2539.040799037352);
  near(site.w, 68.26897054668052); near(site.d, 42.35054879406937); near(site.ry, 1.1782885607080757);
  near(site.ring[0], 75.34483929957509); near(site.ring[1], -2515.6018319737464);
  assert.equal(site.source.tags.height, '270'); assert.equal(site.source.tags['building:levels'], '68');
  assert.equal(site.source.tags['building:min_level'], '1'); assert.equal(site.source.tags.hotel, 'separate');
  assert.equal(site.source.tags.location, 'podium'); assert.equal(site.source.tags.podium, 'bulk');
  assert.equal(cullinan.CULLINAN_II_OSM_HEIGHT, 270); assert.equal(cullinan.CULLINAN_II_OFFICIAL_APPROX_HEIGHT, 270);
  assert.equal(cullinan.CULLINAN_II_HEIGHT, 269.9); assert.equal(cullinan.CULLINAN_II_TO_TIP_HEIGHT, 269.9);
  assert.equal(cullinan.CULLINAN_II_OSM_LEVELS, 68); assert.equal(cullinan.CULLINAN_II_LEVELS, 68);
  assert.equal(cullinan.CULLINAN_II_BELOW_GROUND_LEVELS, 1);
  assert.equal(cullinan.CULLINAN_II_OSM_START_DATE, 2007); assert.equal(cullinan.CULLINAN_II_COMPLETED_YEAR, 2008);
});

test('Cullinan II distinguishes the west W atrium from the tagged level-1 door and keeps a folded crown', () => {
  assert.equal(cullinan.CULLINAN_II_GLASS_BOX_HEIGHT, 40); near(cullinan.cullinanIIFloorY(11), 40); near(cullinan.cullinanIIFloorY(68), 253.6);
  assert.equal(cullinan.CULLINAN_II_CROWN_VERTEX_HEIGHTS.length, 15);
  assert.equal(Math.max(...cullinan.CULLINAN_II_CROWN_VERTEX_HEIGHTS), 269.9);
  assert.ok(cullinan.CULLINAN_II_CROWN_VERTEX_HEIGHTS.every((height) => height >= cullinan.CULLINAN_II_VISUAL_WALL_TOP));
  assert.equal(cullinan.CULLINAN_II_W_ATRIUM_EDGE, 0); near(cullinan.CULLINAN_II_W_ATRIUM.x, 85.91846877923308); near(cullinan.CULLINAN_II_W_ATRIUM.z, -2541.142651278091);
  assert.ok(cullinan.CULLINAN_II_W_ATRIUM.nx < -0.9 && cullinan.CULLINAN_II_W_ATRIUM.nz < 0);
  assert.match(cullinan.CULLINAN_II_W_ATRIUM.evidence, /W Hotel/); assert.match(cullinan.CULLINAN_II_W_ATRIUM.evidence, /west elevated-road/);
  assert.equal(cullinan.CULLINAN_II_OSM_DOOR.id, 10703681997); assert.equal(cullinan.CULLINAN_II_OSM_DOOR.tags.level, '1');
  assert.equal(cullinan.CULLINAN_II_OSM_DOOR.tags.indoor, 'yes'); assert.equal(cullinan.CULLINAN_II_OSM_DOOR_FRAME.edge, 12);
  near(cullinan.CULLINAN_II_DOOR_WORLD.x, 123.13228559185384); near(cullinan.CULLINAN_II_DOOR_WORLD.z, -2520.3301778845794);
  assert.equal(cullinan.CULLINAN_II_GROUND_RINGS.length, 2);
  assert.equal(cullinan.cullinanIIRingColliders(cullinan.CULLINAN_II_TOWER_RING, 0, 40, 0.85, [0]).length, 14);
  const collider = cullinan.cullinanIIEdgeCollider(cullinan.CULLINAN_II_TOWER_RING, 0, 0, 0.25, 0, 40);
  assert.ok([collider.minX, collider.maxX, collider.minZ, collider.maxZ].every(Number.isFinite));
  assert.ok(collider.minX < collider.maxX && collider.minZ < collider.maxZ && collider.obb?.hx > 0 && collider.obb?.hz > 0);
});

test('Cullinan II world has authored hotel crystal W, glass atrium, louvres, crown and terrain wiring without photo assets', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/cullinan-ii-world.js'), 'utf8');
  for (const pattern of [/CullinanIIBlueSilverUnitizedVisionGlass/, /CullinanIIThreeVisualGraphiteLouvreBelts/,
    /CullinanIIFoldedAngularCrownGlazing/, /CullinanIIAngularCrownMetalCopings/, /CullinanIIWestForecourt40mWHotelGlassAtrium/,
    /CullinanIIWAtriumCrystalBeadCurtain/, /CullinanIIGiantWCrystalPendants/, /CullinanIIGiantWVectorCore/,
    /CullinanIIWHotelWarmLobbyStoneAndFloor/, /CullinanIIWHotelFlatGlassDropOffCanopy/, /CullinanIIWHotelTotemWMark/,
    /CullinanIIOsmLevelOneIndoorDoor10703681997/]) assert.match(source, pattern);
  assert.match(source, /canopyPostXs = \[-11, -6, 6, 11\]/);
  assert.doesNotMatch(source, /TextureLoader|GLTFLoader|\.jpg|\.png|image-search/);
  assert.match(source, /for \(const collider of colliders\) \{ collider\.minY \+= groundOffset; collider\.maxY \+= groundOffset; \}/);
  const meta = terrain.HONG_KONG_TERRAIN_META;
  near(meta.cullinanIIPadHeight, terrain.rawHongKongTerrainHeight(cullinan.CULLINAN_II_SITE.x, cullinan.CULLINAN_II_SITE.z));
  near(meta.cullinanIIPadHeight, 7.36966376037843);
  for (const ring of cullinan.CULLINAN_II_GROUND_RINGS) {
    let x = 0, z = 0; const count = ring.length / 2 - 1;
    for (let i = 0; i < ring.length - 2; i += 2) { x += ring[i]; z += ring[i + 1]; }
    near(terrain.hongKongTerrainHeight(x / count, z / count), meta.cullinanIIPadHeight);
  }
});
