const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
async function architecture() { return import(path.join(root, 'js/cities/hongkong/the-center-architecture.js')); }

test('The Center retains the OSM sixteen-edge eight-point star and separate source conventions', async () => {
  const c = await architecture();
  assert.equal(c.THE_CENTER_SITE.osmId, 148228888);
  assert.equal(c.THE_CENTER_SITE.source.h, 346);
  assert.equal(c.THE_CENTER_LOCAL_RING.length, 32);
  assert.deepEqual(c.THE_CENTER_SITE.ring.slice(0, 2), c.THE_CENTER_SITE.ring.slice(-2));
  const radii = Array.from({ length: 16 }, (_, index) => Math.hypot(c.THE_CENTER_LOCAL_RING[index * 2], c.THE_CENTER_LOCAL_RING[index * 2 + 1]));
  assert.ok(radii.filter((_, index) => index % 2 === 0).every((radius) => radius > 29));
  assert.ok(radii.filter((_, index) => index % 2 === 1).every((radius) => radius > 22 && radius < 24));
  assert.equal(c.THE_CENTER_HEIGHT, 346);
  assert.equal(c.THE_CENTER_ROOF_HEIGHT, 292);
  assert.equal(c.THE_CENTER_OCCUPIED_HEIGHT, 275);
  assert.equal(c.THE_CENTER_LEVELS, 73);
  assert.equal(c.THE_CENTER_TOURISM_LEVELS, 79);
  assert.equal(c.THE_CENTER_BELOW_GROUND_LEVELS, 3);
  const raw = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/landmarks.json'), 'utf8'));
  const way = raw.elements.find((element) => element.type === 'way' && element.id === 148228888);
  assert.equal(way.tags.height, '346'); assert.equal(way.tags['building:levels'], '73');
});

test('The Center crown is a sequence of setbacks and a glazed drum, not a reused Central Plaza pyramid', async () => {
  const c = await architecture();
  assert.equal(c.THE_CENTER_CROWN_SEGMENTS.length, 5);
  assert.equal(c.THE_CENTER_CROWN_SEGMENTS[3].kind, 'drum');
  assert.equal(c.THE_CENTER_BODY_START, 12);
  assert.equal(c.THE_CENTER_MAST_SUPPORT_TOP, 328);
  assert.deepEqual(c.theCenterPlanAt(200), [...c.THE_CENTER_LOCAL_RING]);
  assert.ok(Math.abs(c.theCenterPlanAt(310)[0] - c.THE_CENTER_LOCAL_RING[0] * 0.48) < 1e-9);
  assert.ok(Math.abs(c.theCenterPlanAt(318)[0] - c.THE_CENTER_LOCAL_RING[0] * 0.32) < 1e-9);
  assert.equal(c.theCenterBodyColliders().length, 9);
});

test('The Center neon bars increase in frequency towards the crown', async () => {
  const c = await architecture();
  assert.equal(c.theCenterNeonZone(20), 0);
  assert.equal(c.theCenterNeonZone(100), 1);
  assert.equal(c.theCenterNeonZone(180), 2);
  assert.equal(c.theCenterNeonZone(250), 3);
  assert.equal(c.theCenterNeonZone(285), 4);
  assert.equal(c.theCenterNeonZone(300), 5);
  assert.equal(c.theCenterNeonRow(1, 20), false);
  assert.equal(c.theCenterNeonRow(4, 20), true);
  assert.equal(c.theCenterNeonRow(1, 180), false);
  assert.equal(c.theCenterNeonRow(1, 250), true);
  assert.equal(c.theCenterNeonRow(1, 285), true);
});

test('The Center has a DTM pad, public ground, oriented collision and runtime wiring', async () => {
  const c = await architecture();
  const terrain = await import(path.join(root, 'js/cities/hongkong/terrain.js'));
  assert.ok(Math.abs(terrain.HONG_KONG_TERRAIN_META.theCenterPadHeight - 7.21873626373619) < 1e-9);
  for (const point of [{ x: c.THE_CENTER_SITE.x, z: c.THE_CENTER_SITE.z }, c.theCenterLocalToWorld(5, 5), c.theCenterLocalToWorld(-6, 3)]) {
    assert.equal(terrain.hongKongTerrainHeight(point.x, point.z), terrain.HONG_KONG_TERRAIN_META.theCenterPadHeight);
  }
  const world = c.theCenterLocalToWorld(7, -9), local = c.theCenterWorldToLocal(world.x, world.z);
  assert.ok(Math.abs(local.x - 7) < 1e-9 && Math.abs(local.z + 9) < 1e-9);
  const collider = c.theCenterLocalCollider({ w: 12, d: 8, minY: 0, maxY: 292, ry: Math.PI / 4 });
  assert.ok(Math.abs(collider.obb.cs - Math.cos(c.THE_CENTER_SITE.ry + Math.PI / 4)) < 1e-12);
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  for (const token of ['buildTheCenter(scene', '...theCenter.stats', '...theCenter.colliders', '...theCenter.landmarks', 'theCenter.update?.', 'isTheCenterPlazaPoint']) assert.ok(source.includes(token), token);
  assert.ok(fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8').includes('theCenter: world.theCenter'));
});

test('The Center world has authored silver facets, dense neon, elevated public lobby and lattice spire without photo assets', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/the-center-world.js'), 'utf8');
  assert.match(source, /internalId = 'HK-B0007'/);
  assert.match(source, /TheCenterSixteenFaceSilverReflectiveStarCurtainWall/);
  assert.match(source, /TheCenterEightTriangularProwVerticalFins/);
  assert.match(source, /TheCenterIncreasingFrequencyRainbowNeonZone/);
  assert.match(source, /TheCenterSteppedHippedMetalCrownRoofs/);
  assert.match(source, /TheCenterGlazedCrownDrumPanels/);
  assert.match(source, /TheCenterFourInclinedMastSupportLegs/);
  assert.match(source, /TheCenterTaperedWhiteLatticeSpire/);
  assert.match(source, /TheCenterFourWhiteAntennaPanels/);
  assert.match(source, /TheCenterCylindricalStainlessSteelCore/);
  assert.match(source, /TheCenterPairedPublicLobbyEscalatorSteps/);
  assert.match(source, /TheCenterGlazedPublicLobbyCanopy/);
  assert.match(source, /TheCenterEightElevatedTowerSteelColumns/);
  assert.match(source, /TheCenterElevatedPublicSpacePlanters/);
  assert.match(source, /TheCenterBambooStalks/);
  assert.match(source, /cityUniforms\.uInteriorGlow/);
  assert.doesNotMatch(source, /TextureLoader|image-search|https?:\/\//);
});
