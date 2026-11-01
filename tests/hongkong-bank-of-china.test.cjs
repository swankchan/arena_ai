const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
let boc;
let terrain;
let frameModule;
let config;

test.before(async () => {
  boc = await import('../js/cities/hongkong/bank-of-china-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  frameModule = await import('../tools/geo/frame.mjs');
  config = (await import('../tools/cities/hongkong/config.mjs')).default;
});

test('Bank of China preserves the external OSM way without inventing OSM height or level tags', () => {
  const site = boc.BANK_OF_CHINA_SITE, source = boc.BANK_OF_CHINA_OSM_SOURCE;
  assert.equal(site.osmId, 25604760);
  assert.equal(source.version, 12);
  assert.equal(source.geometry.length, 5);
  assert.ok(!('h' in source) && !('height' in source.tags) && !('building:levels' in source.tags));
  const frame = frameModule.makeFrame(config.frame);
  const expected = source.geometry.flatMap((point) => frame.toWorld(point.lon, point.lat));
  assert.equal(site.ring.length, expected.length);
  for (let i = 0; i < expected.length; i++) assert.ok(Math.abs(site.ring[i] - expected[i]) < 1e-8);
  assert.ok(Math.abs(site.w - 53.416074802873425) < 1e-9);
  assert.ok(Math.abs(site.d - 53.16040967639964) < 1e-9);
  assert.equal(boc.BANK_OF_CHINA_HEIGHT, 367.4);
  assert.equal(boc.BANK_OF_CHINA_ROOF_HEIGHT, 315);
  assert.ok(Math.abs(boc.BANK_OF_CHINA_MAST_HEIGHT - 52.4) < 1e-9);
  assert.equal(boc.BANK_OF_CHINA_OFFICIAL_LEVELS, 70);
  assert.equal(boc.BANK_OF_CHINA_OTHER_REPORTED_LEVELS, 72);
});

test('four triangular quadrants step down from the south prism with inclined roof planes and twin masts', () => {
  const prisms = boc.BANK_OF_CHINA_PRISMS;
  assert.equal(prisms.length, 4);
  assert.deepEqual(prisms.map((prism) => prism.id), ['north', 'east', 'west', 'south']);
  assert.equal(Math.max(...prisms[0].roof), 88);
  assert.equal(Math.max(...prisms[3].roof), 315);
  for (const prism of prisms) {
    assert.equal(new Set(prism.roof).size > 1, true, `${prism.id} has a sloping roof`);
    const points = boc.bankOfChinaPrismPoints(prism);
    assert.equal(points.length, 3);
    points.forEach((point, index) => {
      assert.ok(Math.abs(boc.bankOfChinaRoofAt(prism, point[0], point[1]) - prism.roof[index]) < 1e-8);
    });
    const centre = [points.reduce((sum, point) => sum + point[0], 0) / 3,
      points.reduce((sum, point) => sum + point[1], 0) / 3];
    const average = prism.roof.reduce((sum, value) => sum + value, 0) / 3;
    assert.ok(Math.abs(boc.bankOfChinaRoofAt(prism, centre[0], centre[1]) - average) < 1e-8);
  }
  const masts = boc.bankOfChinaMastPositions();
  assert.equal(masts.length, 2);
  assert.equal(masts[0].topY, 367.4);
  assert.ok(Math.abs(masts[0].topY - masts[0].baseY - 52.4) < 1e-9);
  assert.ok(masts.every((mast) => mast.baseY === 315));
});

test('Bank of China has a DTM construction pad and oriented local collision helpers', () => {
  const pad = terrain.HONG_KONG_TERRAIN_META.bankOfChinaPadHeight;
  assert.ok(Math.abs(pad - 11.541116111795219) < 1e-9);
  assert.equal(terrain.hongKongTerrainHeight(boc.BANK_OF_CHINA_SITE.x, boc.BANK_OF_CHINA_SITE.z), pad);
  assert.equal(boc.isBankOfChinaPlazaPoint(boc.BANK_OF_CHINA_SITE.x, boc.BANK_OF_CHINA_SITE.z), true);
  const world = boc.bankOfChinaLocalToWorld(7, -9);
  const local = boc.bankOfChinaWorldToLocal(world.x, world.z);
  assert.ok(Math.abs(local.x - 7) < 1e-9 && Math.abs(local.z + 9) < 1e-9);
  const collider = boc.bankOfChinaLocalCollider({ w: 12, d: 8, minY: 0, maxY: 315 });
  assert.equal(collider.obb.hx, 6);
  assert.equal(collider.obb.hz, 4);
  assert.equal(collider.maxY, 315);
});

test('the authored Bank of China model has fine glass, real space-frame beams, sloping roofs and a granite entrance', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/bank-of-china-world.js'), 'utf8');
  assert.match(source, /group\.userData\.internalId = 'HK-B0005'/);
  assert.match(source, /BocFourTriangularPrismsSilverBlueCurtainWall/);
  assert.match(source, /BocFineAluminiumCurtainWallMullions/);
  assert.match(source, /BocExternalDiagonalSpaceFrameAndFourCornerColumns/);
  assert.match(source, /BocFourInclinedTriangularGlassRoofs/);
  assert.match(source, /BocSlopingRoofRaftersAndPerimeterFlashings/);
  assert.match(source, /BocTwoStoreyGranitePodium/);
  assert.match(source, /BocIndividualGraniteCladdingPanels/);
  assert.match(source, /BocNorthDoubleArchedPassage/);
  assert.match(source, /BocRedAncientCoinBankLogo/);
  assert.match(source, /BocNorthHuabiaoOrnamentalLampShafts/);
  assert.match(source, /BocTwinMastDiagonalSpaceFrame/);
  assert.match(source, /cityUniforms\.uInteriorGlow/);
  assert.doesNotMatch(source, /TextureLoader|image-search|https?:\/\//);
});

test('simple Hong Kong integrates Bank of China as an authored landmark without generic buildings', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  assert.match(source, /buildBankOfChinaTower/);
  assert.match(source, /bankOfChina\.colliders/);
  assert.match(source, /isBankOfChinaPlazaPoint/);
  assert.match(source, /\.\.\.bankOfChina\.stats/);
  assert.match(source, /buildings: 0/);
});
