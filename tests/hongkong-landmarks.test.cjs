const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
let architecture;
let geo;

test.before(async () => {
  architecture = await import('../js/cities/hongkong/hsbc-headquarters-architecture.js');
  geo = (await import('../js/hk-geodata.js')).GEO;
});

test('HSBC uses its real OSM site, oriented footprint and 178.8 m landmark height', () => {
  const { HSBC_SITE, HSBC_HEIGHT, hsbcWorldToLocal } = architecture;
  assert.equal(HSBC_SITE.name, '滙豐總行大廈');
  assert.equal(HSBC_SITE.source, geo.landmarks['滙豐總行大廈']);
  assert.equal(HSBC_HEIGHT, 178.8);
  assert.ok(Math.abs(HSBC_SITE.x - HSBC_SITE.source.x) < 0.7);
  assert.ok(Math.abs(HSBC_SITE.z - HSBC_SITE.source.z) < 0.1);
  assert.ok(HSBC_SITE.ry < 0 && HSBC_SITE.ry > -0.4, 'the facade follows the real oblique street block');
  assert.ok(HSBC_SITE.area <= HSBC_SITE.source.w * HSBC_SITE.source.d);
  for (let i = 0; i + 1 < HSBC_SITE.ring.length; i += 2) {
    const local = hsbcWorldToLocal(HSBC_SITE.ring[i], HSBC_SITE.ring[i + 1]);
    assert.ok(Math.abs(local.x) <= HSBC_SITE.w * 0.5 + 1e-6);
    assert.ok(Math.abs(local.z) <= HSBC_SITE.d * 0.5 + 1e-6);
  }
});

test('three stepped bays and five suspension levels preserve the open public plaza', () => {
  const {
    HSBC_BAYS, HSBC_MAIN_BAY, HSBC_MAIN_ROOF_Y, HSBC_TRUSS_LEVELS, HSBC_HEIGHT, HSBC_BANKING_HALL_BASE,
    HSBC_FRAME_WIDTH, HSBC_GLASS_WIDTH, HSBC_MAST_X,
    HSBC_PLAZA_TOP, HSBC_SITE, hsbcSuspensionLevelsForRoof,
    hsbcLocalToWorld, isHsbcPlazaPoint, hsbcLocalCollider
  } = architecture;
  assert.deepEqual(HSBC_BAYS.map((bay) => bay.floors), [44, 36, 29]);
  assert.deepEqual([...HSBC_BAYS.map((bay) => bay.floors)].sort((a, b) => a - b), [29, 36, 44]);
  assert.equal(HSBC_TRUSS_LEVELS.length, 5);
  assert.deepEqual(HSBC_BAYS.map((bay) => hsbcSuspensionLevelsForRoof(bay.roofY).length), [5, 4, 3]);
  assert.equal(HSBC_MAIN_BAY.id, 'north');
  assert.equal(HSBC_MAIN_BAY.floors, 44, 'the supplied front elevation is not hidden by a lower front wing');
  assert.ok(Math.abs(HSBC_MAIN_ROOF_Y - 169.2) < 1e-9);
  assert.ok(HSBC_GLASS_WIDTH / HSBC_FRAME_WIDTH > 0.45 && HSBC_GLASS_WIDTH / HSBC_FRAME_WIDTH < 0.6);
  assert.ok(Math.abs(HSBC_MAST_X[1]) < HSBC_FRAME_WIDTH * 0.35, 'inner masts frame the narrower central glass');
  assert.ok(HSBC_BANKING_HALL_BASE > 10, 'the banking hall is raised above people and vehicles');
  assert.ok(HSBC_PLAZA_TOP > 0);
  assert.ok(isHsbcPlazaPoint(HSBC_SITE.x, HSBC_SITE.z));
  const north = hsbcLocalToWorld(0, -10), south = hsbcLocalToWorld(0, 10);
  assert.ok(north.z < south.z, 'local -z is the harbour-facing entrance');
  const elevated = hsbcLocalCollider({
    x: 0, z: 0, w: 40, d: 15, minY: HSBC_BANKING_HALL_BASE, maxY: HSBC_HEIGHT
  });
  assert.ok(elevated.minY > 2.3, 'the elevated tower collider does not seal the ground-level plaza');
  assert.ok(elevated.obb && Number.isFinite(elevated.obb.cs) && Number.isFinite(elevated.obb.sn));
});

test('the hand-built HSBC model includes its photographic identifying features without bundled photo assets', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/hsbc-headquarters-world.js'), 'utf8');
  assert.match(source, /HSBCInvertedVSuspensionTrusses/);
  assert.match(source, /HSBCExposedSteelMasts/);
  assert.match(source, /HSBCOvalSunscoopCrown/);
  assert.match(source, /HSBCBronzeLions/);
  assert.match(source, /HSBCEscalatorSteps/);
  assert.match(source, /HSBCRoundedStairLandingWindows/);
  assert.match(source, /double-height reception band/);
  assert.match(source, /createHsbcCurtainWallMaterial/);
  assert.match(source, /createHsbcSignTexture/);
  assert.match(source, /cityUniforms\.uInteriorGlow/);
  assert.doesNotMatch(source, /TextureLoader|image-search|https?:\/\//);
});

test('unified simple mode adds only the authored landmark and keeps generic buildings disabled', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  assert.match(source, /buildHsbcHeadquarters\(scene\)/);
  assert.match(source, /isHsbcPlazaPoint\(x, z\)/);
  assert.match(source, /\.\.\.hsbc\.stats/);
  assert.match(source, /\.\.\.hsbc\.colliders/);
  assert.match(source, /landmarks: hsbc\.landmarks\.length/);
  assert.match(source, /buildings: 0/);
  assert.match(source, /landmarks: hsbc\.landmarks/);
});
