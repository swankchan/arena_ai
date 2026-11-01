const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
let icc;
let terrain;
let geo;

test.before(async () => {
  icc = await import('../js/cities/hongkong/icc-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  geo = (await import('../js/hk-geodata.js')).GEO;
});

test('ICC keeps its OSM site, 484 m height and separate floor-count conventions', () => {
  const {
    ICC_SITE, ICC_HEIGHT, ICC_OSM_HEIGHT, ICC_OSM_LEVELS, ICC_DESIGN_LEVELS,
    ICC_REPORTED_ABOVE_GROUND_LEVELS, ICC_LOCAL_RING, ICC_ROOF_Y, ICC_PARAPET_HEIGHT,
    iccWorldToLocal
  } = icc;
  assert.equal(ICC_SITE.name, '環球貿易廣場');
  assert.equal(ICC_SITE.osmId, 25590249);
  assert.equal(ICC_SITE.source, geo.landmarks['環球貿易廣場']);
  assert.equal(ICC_SITE.source.h, ICC_OSM_HEIGHT);
  assert.equal(ICC_HEIGHT, 484);
  assert.equal(ICC_OSM_LEVELS, 118);
  assert.equal(ICC_DESIGN_LEVELS, 118);
  assert.equal(ICC_REPORTED_ABOVE_GROUND_LEVELS, 108);
  assert.equal(ICC_ROOF_Y, 478);
  assert.equal(ICC_PARAPET_HEIGHT, 6);
  assert.equal(ICC_LOCAL_RING.length, 40, 'four re-entrant corners retain the twenty OSM-derived vertices');
  for (let i = 0; i < ICC_SITE.ring.length; i += 2) {
    const local = iccWorldToLocal(ICC_SITE.ring[i], ICC_SITE.ring[i + 1]);
    assert.ok(Math.abs(local.x - ICC_LOCAL_RING[i]) < 1e-9);
    assert.ok(Math.abs(local.z - ICC_LOCAL_RING[i + 1]) < 1e-9);
  }
});

test('ICC has a flared base, one-degree upper taper, widening crevasses and eight three-degree columns', () => {
  const {
    ICC_LOCAL_RING, ICC_BASE_FLARE_END_Y, ICC_ROOF_Y, ICC_SHAFT_SCALE, ICC_UPPER_TAPER,
    ICC_REENTRANT_WIDENING, ICC_MEGA_COLUMNS, ICC_MEGA_COLUMN_SPLAY,
    ICC_DRAGON_TAIL, ICC_BAY_WIDTH, ICC_VISION_HEIGHT, ICC_PANEL_TILT,
    iccPlanAt, iccScaleAt, iccReentrantExtraAt, iccMegaColumnPoint
  } = icc;
  assert.equal(ICC_BASE_FLARE_END_Y, 70);
  assert.equal(ICC_SHAFT_SCALE, 0.91);
  assert.ok(Math.abs(ICC_UPPER_TAPER - Math.PI / 180) < 1e-12);
  assert.equal(ICC_REENTRANT_WIDENING, 2.2);
  assert.equal(ICC_BAY_WIDTH, 3);
  assert.equal(ICC_VISION_HEIGHT, 1.5);
  assert.ok(Math.abs(ICC_PANEL_TILT - 5 * Math.PI / 180) < 1e-12);
  assert.equal(ICC_DRAGON_TAIL.projection, 12);
  assert.equal(ICC_DRAGON_TAIL.ribs, 13);
  assert.equal(ICC_MEGA_COLUMNS.length, 8);
  const base = iccPlanAt(0);
  assert.deepEqual(base, [...ICC_LOCAL_RING]);
  assert.ok(iccScaleAt(ICC_ROOF_Y) < iccScaleAt(ICC_BASE_FLARE_END_Y));
  assert.equal(iccReentrantExtraAt(0), 0);
  assert.equal(iccReentrantExtraAt(ICC_ROOF_Y), ICC_REENTRANT_WIDENING);
  for (const column of ICC_MEGA_COLUMNS) {
    const bottom = iccMegaColumnPoint(column, 0), top = iccMegaColumnPoint(column, ICC_BASE_FLARE_END_Y);
    assert.ok(Math.abs(Math.hypot(bottom.x - top.x, bottom.z - top.z)
      - Math.tan(ICC_MEGA_COLUMN_SPLAY) * ICC_BASE_FLARE_END_Y) < 1e-9);
  }
});

test('ICC world contains authored shingles, Dragon Tail, canopies, roof and night materials without photo assets', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/icc-world.js'), 'utf8');
  assert.match(source, /IccShingledSilverLowECurtainWallPanels/);
  assert.match(source, /IccThreeMetreMullionsAndProjectingTransoms/);
  assert.match(source, /IccFourMechanicalBeltsAndCrownPlant/);
  assert.match(source, /IccSixMetrePerimeterParapet/);
  assert.match(source, /IccNorthDragonTailScoopedGlassAtrium/);
  assert.match(source, /IccDragonTailCurvedSilverRibs/);
  assert.match(source, /IccDragonTailPointedMetalSoffit/);
  assert.match(source, /Glazed returns close both sides of the scoop/);
  assert.match(source, /IccThreeAngularOfficeAndHotelCanopies/);
  assert.match(source, /IccEightThreeDegreeSplayedMegaColumns/);
  assert.match(source, /IccDragonTailIdentificationSign/);
  assert.match(source, /IccHotelArrivalSign/);
  assert.match(source, /cityUniforms\.uInteriorGlow/);
  assert.match(source, /internalId = 'HK-B0004'/);
  assert.doesNotMatch(source, /TextureLoader|image-search|https?:\/\//);
});

test('ICC terrain pad reproduces the DTM centre and the runtime exposes the landmark', () => {
  const { ICC_SITE } = icc;
  assert.equal(terrain.HONG_KONG_TERRAIN_META.iccPadHeight,
    terrain.rawHongKongTerrainHeight(ICC_SITE.x, ICC_SITE.z));
  assert.equal(terrain.hongKongTerrainHeight(ICC_SITE.x, ICC_SITE.z),
    terrain.HONG_KONG_TERRAIN_META.iccPadHeight);
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  const pack = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  assert.match(simple, /\.\.\.icc\.stats/);
  assert.match(simple, /\.\.\.icc\.colliders/);
  assert.match(simple, /icc,/);
  assert.match(pack, /icc: world\.icc/);
});
