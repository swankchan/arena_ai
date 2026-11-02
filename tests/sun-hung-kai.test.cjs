const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let shk, terrain;
test.before(async () => {
  shk = await import('../js/cities/hongkong/sun-hung-kai-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
});
function near(actual, expected, epsilon = 1e-9) { assert.ok(Math.abs(actual - expected) < epsilon, `${actual} != ${expected}`); }

test('Sun Hung Kai Centre preserves its 16-vertex OSM chamfered tower and separated published conventions', () => {
  const site = shk.SUN_HUNG_KAI_SITE;
  assert.equal(site.osmId, 107497703); assert.equal(site.source.version, 7); assert.equal(site.source.changeset, 158122574);
  assert.equal(site.source.tags.height, '215'); assert.equal(site.source.tags['building:levels'], '57');
  assert.equal(site.source.attribution, '© OpenStreetMap contributors'); assert.equal(site.source.license, 'ODbL 1.0');
  assert.equal(site.localRing.length / 2, 16); assert.equal(site.ring.length, 34); assert.equal(shk.SUN_HUNG_KAI_TOWER_RING.length, 34);
  near(site.x, 1786.7784910621674); near(site.z, 173.91897159900114);
  near(site.w, 48.15195521150213); near(site.d, 32.5409409095401); near(site.area, 1566.909929216312); near(site.ry, 0.09258241307825177);
  assert.equal(shk.SUN_HUNG_KAI_OSM_HEIGHT, 215); assert.equal(shk.SUN_HUNG_KAI_OSM_LEVELS, 57);
  assert.equal(shk.SUN_HUNG_KAI_HEIGHT, 214.5); assert.equal(shk.SUN_HUNG_KAI_TO_TIP_HEIGHT, 214.5);
  assert.equal(shk.SUN_HUNG_KAI_CTBUH_LEVELS, 56); assert.equal(shk.SUN_HUNG_KAI_CTBUH_TOWER_GFA, 83984);
  assert.equal(shk.SUN_HUNG_KAI_CTBUH_COMPLETION_YEAR, 1991); assert.equal(shk.SUN_HUNG_KAI_OFFICIAL_LEVELS, 53);
  assert.equal(shk.SUN_HUNG_KAI_OFFICIAL_GFA_SQFT, 800000); assert.equal(shk.SUN_HUNG_KAI_FIRST_COMPLETED_YEAR, 1981);
  assert.equal(shk.SUN_HUNG_KAI_PREVIOUS_HEIGHT, 193); assert.equal(shk.SUN_HUNG_KAI_PREVIOUS_LEVELS, 51); assert.equal(shk.SUN_HUNG_KAI_ADDED_STOREYS, 5);
});

test('Sun Hung Kai Centre keeps its addition, roof, two logos and photo-directed Harbour Road entrance traceable', () => {
  assert.deepEqual(shk.SUN_HUNG_KAI_MAIN_EDGES, [1, 5, 9, 13]); assert.deepEqual(shk.SUN_HUNG_KAI_LOGO_EDGES, [5, 9]);
  near(shk.sunHungKaiFloorY(0), 18); near(shk.sunHungKaiFloorY(46), 193); near(shk.sunHungKaiFloorY(51), 211.5);
  assert.equal(shk.SUN_HUNG_KAI_VISUAL_COURSES, 51); assert.equal(shk.SUN_HUNG_KAI_ADDED_VISUAL_COURSES, 5);
  assert.equal(shk.SUN_HUNG_KAI_PARAPET_TOP, 212.4); assert.equal(shk.SUN_HUNG_KAI_TO_TIP_HEIGHT, 214.5);
  assert.equal(shk.SUN_HUNG_KAI_ENTRANCE_SOURCE_EDGE, 9);
  near(shk.SUN_HUNG_KAI_ENTRANCE.x, 1788.7474929603632); near(shk.SUN_HUNG_KAI_ENTRANCE.z, 194.89327626029163);
  near(shk.SUN_HUNG_KAI_ENTRANCE.nx, 0.092450208008946); near(shk.SUN_HUNG_KAI_ENTRANCE.nz, 0.9957173087975837);
  assert.match(shk.SUN_HUNG_KAI_ENTRANCE.evidence, /no entrance-tagged node/); assert.match(shk.SUN_HUNG_KAI_ENTRANCE.evidence, /Photo-directed/);
  assert.equal(shk.SUN_HUNG_KAI_GROUND_RINGS.length, 3);
  assert.equal(shk.sunHungKaiRingColliders(shk.SUN_HUNG_KAI_TOWER_RING, 18, 212.4).length, 16);
});

test('Sun Hung Kai Centre world contains authored bronze grid, stone corners, open covered driveway, roof plant and sloping atrium without photo assets', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/sun-hung-kai-world.js'), 'utf8');
  for (const pattern of [/SunHungKaiDarkBronzeOfficeCurtainWall/, /SunHungKaiIlluminatedChamferedStoneCornerPiers/,
    /SunHungKaiDenseVerticalAluminiumMullions/, /SunHungKaiFineHorizontalTransomsAndAdditionSeam/,
    /SunHungKaiRoofMonogramEdge/, /SunHungKaiRoofPlantAndSatellitePedestals/, /SunHungKaiTwoRoofSatelliteDishes/,
    /SunHungKaiOpenRetailPodiumAndCoveredDrivewayGlazing/, /SunHungKaiInsetCoveredDrivewayGroundColumns/,
    /SunHungKaiHarbourRoadSlopingAtriumAndIlluminatedPodium/, /SunHungKaiSlopingHarbourRoadAtriumGlass/,
    /SunHungKaiHarbourRoadBilingualIdentification/, /HK-B0017/]) assert.match(source, pattern);
  assert.match(source, /fillText\('H'/); assert.match(source, /fillText\('K'/);
  assert.match(source, /drawChinese\(ctx, '新鴻基中心'/);
  assert.doesNotMatch(source, /TextureLoader|GLTFLoader|image-search|https?:\/\//);
});

test('Sun Hung Kai Centre terrain uses the Harbour Road DTM sample while road queries remain independent', () => {
  const meta = terrain.HONG_KONG_TERRAIN_META;
  near(meta.sunHungKaiPadHeight, terrain.rawHongKongTerrainHeight(shk.SUN_HUNG_KAI_GROUND_SAMPLE.x, shk.SUN_HUNG_KAI_GROUND_SAMPLE.z));
  near(meta.sunHungKaiPadHeight, 5);
  for (const ring of shk.SUN_HUNG_KAI_GROUND_RINGS) {
    let x = 0, z = 0; const count = ring.length / 2 - 1;
    for (let i = 0; i < count; i++) { x += ring[i * 2]; z += ring[i * 2 + 1]; }
    near(terrain.hongKongTerrainHeight(x / count, z / count), meta.sunHungKaiPadHeight);
  }
  assert.equal(shk.isSunHungKaiPlazaPoint(shk.SUN_HUNG_KAI_ENTRANCE.x, shk.SUN_HUNG_KAI_ENTRANCE.z), true);
  assert.equal(shk.isSunHungKaiPlazaPoint(0, 0), false);
});
