const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let hopewell, terrain;
test.before(async () => {
  hopewell = await import('../js/cities/hongkong/hopewell-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
});
const near = (actual, expected, epsilon = 1e-8, message = '') => assert.ok(Math.abs(actual - expected) <= epsilon, message || `${actual} != ${expected}`);

test('Hopewell Centre preserves its 41-vertex OSM cylinder and separated height, floor, area and date conventions', () => {
  const site = hopewell.HOPEWELL_SITE;
  assert.equal(site.osmId, 88391069); assert.equal(site.source.version, 11); assert.equal(site.source.changeset, 186337064);
  assert.equal(site.localRing.length / 2, 41); assert.equal(site.ring.length, 84); assert.equal(hopewell.HOPEWELL_TOWER_RING.length, 84);
  near(site.x, 1235.5292258979); near(site.z, 800.5136217406646);
  near(site.w, 45.54252657121617); near(site.d, 45.70628985749818); near(site.ry, 1.2546400529770054);
  assert.equal(site.source.tags.height, '216'); assert.equal(site.source.tags['building:levels'], '63');
  assert.equal(site.source.tags['building:min_level'], '13'); assert.equal(site.source.tags.layer, '2');
  assert.equal(hopewell.HOPEWELL_OSM_HEIGHT, 216); assert.equal(hopewell.HOPEWELL_MAIN_ROOF, 216);
  assert.equal(hopewell.HOPEWELL_CTBUH_TO_TIP_HEIGHT, 222); assert.equal(hopewell.HOPEWELL_OSM_LEVELS, 63);
  assert.equal(hopewell.HOPEWELL_OSM_MIN_LEVEL, 13); assert.equal(hopewell.HOPEWELL_CTBUH_LEVELS, 64);
  assert.equal(hopewell.HOPEWELL_OFFICIAL_LEVELS, 66); assert.equal(hopewell.HOPEWELL_CTBUH_TOWER_GFA, 111000);
  assert.equal(hopewell.HOPEWELL_OFFICIAL_GFA_SQFT, 840000); assert.equal(hopewell.HOPEWELL_CONSTRUCTION_START_YEAR, 1977);
  assert.equal(hopewell.HOPEWELL_COMPLETED_YEAR, 1981); assert.equal(hopewell.HOPEWELL_OFFICE_TOP, 184);
  assert.equal(hopewell.hopewellFloorY(50), 184); assert.equal(hopewell.HOPEWELL_OFFICE_COURSES, 50);
});

test('Hopewell uses actual QRE 3/F and Kennedy Road 17/F entrance nodes plus a separately identified photo-directed lift', () => {
  const qre = hopewell.HOPEWELL_QRE_ENTRANCE, kennedy = hopewell.HOPEWELL_KENNEDY_ENTRANCE;
  assert.equal(qre.sourceNode, 1026827584); assert.equal(qre.sourceVertex, 29); assert.equal(qre.levelRef, '3');
  near(qre.x, 1212.566515120296); near(qre.z, 799.7770102975186);
  near(qre.nx, -0.998464450142293); near(qre.nz, -0.05539622552167679);
  assert.match(qre.evidence, /access=yes, level=2, level:ref=3/);
  assert.equal(kennedy.sourceNode, 12419988600); assert.equal(kennedy.sourceVertex, 34); assert.equal(kennedy.levelRef, '17');
  near(kennedy.x, 1215.256298057911); near(kennedy.z, 811.2712094899398);
  assert.match(kennedy.evidence, /17 Kennedy Road/); assert.match(kennedy.evidence, /level:ref=17/);
  assert.equal(hopewell.HOPEWELL_EXTERNAL_LIFT.sourceVertex, 0); assert.equal(hopewell.HOPEWELL_EXTERNAL_LIFT.sourceNode, null);
  assert.match(hopewell.HOPEWELL_EXTERNAL_LIFT.evidence, /not separately surveyed/);
  assert.equal(hopewell.HOPEWELL_GROUND_RINGS.length, 3); assert.equal(hopewell.hopewellRingColliders(hopewell.HOPEWELL_TOWER_RING).length, 41);
  assert.equal(hopewell.HOPEWELL_POOL_RADIUS, 4.35); assert.equal(hopewell.HOPEWELL_CROWN_RING.length, 84);
});

test('Hopewell retains sloping DTM under the tower and uses only local entrance pads and a continuous escalator ground field', () => {
  const meta = terrain.HONG_KONG_TERRAIN_META, site = hopewell.HOPEWELL_SITE;
  near(meta.hopewellDatumHeight, 37.73671751692041); near(meta.hopewellQreUpperPadHeight, 37.856717516920405);
  near(meta.hopewellQreLowerPadHeight, 35.456717516920406); near(meta.hopewellKennedyPadHeight, 42.35839206414999);
  near(terrain.hongKongTerrainHeight(site.x, site.z), terrain.rawHongKongTerrainHeight(site.x, site.z));
  near(terrain.hongKongTerrainHeight(site.x, site.z), 32.32825022725507);
  const qre = hopewell.HOPEWELL_QRE_ENTRANCE;
  near(terrain.hongKongTerrainHeight(qre.x, qre.z), meta.hopewellQreUpperPadHeight);
  const lower = hopewell.hopewellFrameToWorld(qre, 0, 5);
  near(terrain.hongKongTerrainHeight(lower.x, lower.z), meta.hopewellQreLowerPadHeight);
  const mid = hopewell.hopewellFrameToWorld(qre, 0, 2.85), grounds = {
    qreUpper: meta.hopewellQreUpperPadHeight, qreLower: meta.hopewellQreLowerPadHeight, kennedy: meta.hopewellKennedyPadHeight
  };
  near(hopewell.hopewellGroundHeightAt(mid.x, mid.z, 0, grounds), (meta.hopewellQreUpperPadHeight + meta.hopewellQreLowerPadHeight) * 0.5);
  near(hopewell.hopewellGroundHeightAt(mid.x, mid.z, 40, grounds), (meta.hopewellQreUpperPadHeight + meta.hopewellQreLowerPadHeight) * 0.5,
    1e-8, 'a higher coarse DTM triangle must not bury the authored escalator');
  assert.equal(hopewell.HOPEWELL_COLLISION_BASE, -20);
});

test('Hopewell world contains authored fins, window bands, restaurant crown, pool, lift, podium louvres and both entrances without photo assets', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/hopewell-world.js'), 'utf8');
  for (const pattern of [/HopewellDarkHorizontalOfficeWindowBands/, /HopewellEightyTwoStrongWhiteVerticalFacadeFins/,
    /HopewellRevolvingRestaurantAndStackedCrownGlazing/, /HopewellBroadWhiteRevolvingRestaurantBelts/,
    /HopewellCircularRooftopSwimmingPool/, /HopewellBronzeCircularRoofDeck/, /HopewellExternalObservationLiftAndRooftopSign/,
    /HopewellCurvedWhiteObservationLiftCapsule/, /HopewellRedRooftopIdentification/, /HopewellHillsideBeigePodiumStone/,
    /HopewellPodiumIndividualVerticalLouvreSlats/, /HopewellQueensRoadEastEscalatorLobby/,
    /HopewellQueensRoadTwinEscalatorTreads/, /HopewellQueensRoad183Identification/,
    /HopewellKennedyRoadLevel17HillsideLobby/, /HopewellKennedyRoad17Identification/]) assert.match(source, pattern);
  assert.match(source, /materials\.solidStone/); assert.match(source, /HOPEWELL_SIGN_GLYPHS/); assert.match(source, /escalatorBed/);
  assert.doesNotMatch(source, /TextureLoader|GLTFLoader|\.jpg|\.png|image-search/);
  assert.match(source, /for \(const collider of colliders\) \{ collider\.minY \+= groundOffset; collider\.maxY \+= groundOffset; \}/);
});
