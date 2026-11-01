const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

async function architecture() { return import(path.join(root, 'js/cities/hongkong/central-plaza-architecture.js')); }

test('Central Plaza uses the actual chamfered OSM triangle, not a generated land-use box', async () => {
  const c = await architecture();
  assert.equal(c.CENTRAL_PLAZA_SITE.osmId, 27087018);
  assert.equal(c.CENTRAL_PLAZA_SITE.source.h, 309);
  assert.equal(c.CENTRAL_PLAZA_LOCAL_RING.length, 26);
  const ring = c.CENTRAL_PLAZA_SITE.ring;
  assert.deepEqual(ring.slice(0, 2), ring.slice(-2));
  const lengths = [];
  for (let i = 0; i + 3 < c.CENTRAL_PLAZA_LOCAL_RING.length; i += 2) {
    lengths.push(Math.hypot(c.CENTRAL_PLAZA_LOCAL_RING[i + 2] - c.CENTRAL_PLAZA_LOCAL_RING[i], c.CENTRAL_PLAZA_LOCAL_RING[i + 3] - c.CENTRAL_PLAZA_LOCAL_RING[i + 1]));
  }
  assert.equal(lengths.filter((value) => value > 30).length, 3);
  const raw = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/landmarks.json'), 'utf8'));
  const way = raw.elements.find((element) => element.type === 'way' && element.id === 27087018);
  assert.equal(way.tags.height, '309');
  assert.equal(way.tags['building:levels'], '78');
});

test('Central Plaza preserves roof, architectural, official rounded and mast conventions separately', async () => {
  const c = await architecture();
  assert.equal(c.CENTRAL_PLAZA_OSM_ROOF_HEIGHT, 309);
  assert.equal(c.CENTRAL_PLAZA_HEIGHT, 373.9);
  assert.equal(c.CENTRAL_PLAZA_OFFICIAL_ROUNDED_HEIGHT, 374);
  assert.equal(c.CENTRAL_PLAZA_OSM_LEVELS, 78);
  assert.equal(c.CENTRAL_PLAZA_OFFICIAL_OFFICE_LEVELS, 75);
  assert.equal(c.CENTRAL_PLAZA_MAST_HEIGHT, 102);
  assert.equal(c.CENTRAL_PLAZA_BODY_TOP, 265.9);
  assert.equal(c.CENTRAL_PLAZA_CROWN_PLANT_FLOORS, 6);
  assert.equal(c.CENTRAL_PLAZA_LIGHTIME_BAND_LEVELS.length, 4);
});

test('Lightime follows four sequential quarter-hour bands and a six-hour Hong Kong-local cycle', async () => {
  const { centralPlazaLightimeState } = await architecture();
  const at = (hour, minute) => centralPlazaLightimeState(Date.UTC(2026, 10, 1, hour - 8, minute));
  assert.deepEqual(at(18, 0).bands.map((band) => band.name), ['white', 'white', 'white', 'white']);
  assert.deepEqual(at(18, 15).bands.map((band) => band.name), ['red', 'white', 'white', 'white']);
  assert.deepEqual(at(18, 30).bands.map((band) => band.name), ['red', 'red', 'white', 'white']);
  assert.deepEqual(at(18, 45).bands.map((band) => band.name), ['red', 'red', 'red', 'white']);
  assert.deepEqual(at(19, 0).bands.map((band) => band.name), ['red', 'red', 'red', 'red']);
  assert.deepEqual(at(18, 30).bands.map((band) => band.hex), at(0, 30).bands.map((band) => band.hex));
  assert.equal(at(18, 59).quarter, 3);
});

test('Central Plaza crown steps back vertically, then supports a glazed pyramid and open mast cage', async () => {
  const c = await architecture();
  const span = (plan) => Math.max(...plan.filter((_, index) => index % 2 === 0)) - Math.min(...plan.filter((_, index) => index % 2 === 0));
  assert.equal(span(c.centralPlazaPlanAt(c.CENTRAL_PLAZA_PODIUM_HEIGHT)), span(c.centralPlazaPlanAt(c.CENTRAL_PLAZA_BODY_TOP - 0.01)));
  assert.ok(span(c.centralPlazaPlanAt(c.CENTRAL_PLAZA_BODY_TOP)) < span(c.centralPlazaPlanAt(c.CENTRAL_PLAZA_BODY_TOP - 0.01)));
  assert.equal(span(c.centralPlazaPlanAt(c.CENTRAL_PLAZA_OSM_ROOF_HEIGHT)), span(c.centralPlazaPlanAt(c.CENTRAL_PLAZA_BODY_TOP)));
  assert.ok(span(c.centralPlazaPlanAt(c.CENTRAL_PLAZA_PYRAMID_TOP - 0.1)) < 2);
  assert.equal(c.CENTRAL_PLAZA_FRAME_BOTTOM, 276);
  assert.equal(c.CENTRAL_PLAZA_FRAME_TOP, c.CENTRAL_PLAZA_OSM_ROOF_HEIGHT);
});

test('Central Plaza has DTM pad, terrain, ground, road, clock-update and runtime wiring', async () => {
  const c = await architecture();
  const terrain = await import(path.join(root, 'js/cities/hongkong/terrain.js'));
  assert.equal(terrain.HONG_KONG_TERRAIN_META.centralPlazaPadHeight, 5);
  for (let i = 0; i < c.CENTRAL_PLAZA_SITE.ring.length; i += 2) {
    assert.equal(terrain.hongKongTerrainHeight(c.CENTRAL_PLAZA_SITE.ring[i], c.CENTRAL_PLAZA_SITE.ring[i + 1]), 5);
  }
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  for (const token of ['buildCentralPlaza(scene', '...centralPlaza.stats', '...centralPlaza.colliders', '...centralPlaza.landmarks', 'centralPlaza.update?.', 'isCentralPlazaPlazaPoint']) assert.ok(source.includes(token), token);
  const runtime = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  assert.ok(runtime.includes('centralPlaza: world.centralPlaza'));
  const collider = c.centralPlazaLocalCollider({ w: 20, d: 10, minY: 5, maxY: 30.5 });
  const point = c.centralPlazaLocalToWorld(3, 2);
  const dx = point.x - collider.obb.cx, dz = point.z - collider.obb.cz;
  const lx = collider.obb.cs * dx - collider.obb.sn * dz, lz = collider.obb.sn * dx + collider.obb.cs * dz;
  assert.ok(Math.abs(lx) <= collider.obb.hx && Math.abs(lz) <= collider.obb.hz);
});

test('Central Plaza world contains authored podium, detailed curtain wall, crown and four Lightime bands without photo assets', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/central-plaza-world.js'), 'utf8');
  assert.match(source, /internalId = 'HK-B0006'/);
  assert.match(source, /CentralPlazaThreeColourChamferedTriangleCurtainWall/);
  assert.match(source, /CentralPlazaFineMullionsAndFourPointSixMetreStructure/);
  assert.match(source, /CentralPlazaVerticalGoldFacadeNeonStrips/);
  assert.match(source, /CentralPlazaSixMechanicalCrownFloors/);
  assert.match(source, /CentralPlazaOpenCrownFrameAroundPyramid/);
  assert.match(source, /CentralPlazaGlazedPyramidalRoofPanels/);
  assert.match(source, /CentralPlazaThreeLeggedMastSpaceFrame/);
  assert.match(source, /CentralPlazaLightimeQuarterBand/);
  assert.match(source, /CentralPlazaThirtyPointFiveMetreGlazedEntrancePodium/);
  assert.match(source, /CentralPlazaTwoMetreGraniteEntranceColumns/);
  assert.match(source, /CentralPlazaMainEntranceDoors/);
  assert.match(source, /CentralPlazaEntranceIdentification/);
  assert.match(source, /centralPlazaLightimeState/);
  assert.match(source, /cityUniforms\.uInteriorGlow/);
  assert.doesNotMatch(source, /TextureLoader|image-search|https?:\/\//);
});
