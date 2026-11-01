const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let masterpiece, terrain;
test.before(async () => {
  masterpiece = await import('../js/cities/hongkong/masterpiece-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
});
const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);

test('The Masterpiece preserves the current 44-vertex OSM tower and separate height conventions', () => {
  const site = masterpiece.MASTERPIECE_SITE;
  assert.equal(site.osmId, 124697429); assert.equal(site.source.version, 6); assert.equal(site.source.changeset, 150164286);
  assert.equal(site.localRing.length / 2, 44); assert.equal(site.ring.length, 90); assert.equal(masterpiece.MASTERPIECE_TOWER_RING.length, 90);
  near(site.x, 1467.4534154961186); near(site.z, -1735.245184758726);
  near(site.w, 80.18536265601915); near(site.d, 26.90738567586004); near(site.ry, -0.7300713453042845);
  near(site.ring[0], 1463.5098658176628); near(site.ring[1], -1720.719268731437);
  assert.equal(site.source.tags.height, '261'); assert.equal(site.source.tags['building:levels'], '64');
  assert.equal(site.source.tags['building:min_level'], '8'); assert.equal(site.source.tags.layer, '2');
  assert.equal(site.source.tags.hotel, 'separate'); assert.equal(site.source.tags.location, 'podium');
  assert.equal(masterpiece.MASTERPIECE_OSM_HEIGHT, 261); assert.equal(masterpiece.MASTERPIECE_HEIGHT, 257);
  assert.equal(masterpiece.MASTERPIECE_TO_TIP_HEIGHT, 257); assert.equal(masterpiece.MASTERPIECE_OCCUPIED_HEIGHT, 241.7);
  assert.equal(masterpiece.MASTERPIECE_LEVELS, 64); assert.equal(masterpiece.MASTERPIECE_BELOW_GROUND_LEVELS, 4);
  assert.equal(masterpiece.MASTERPIECE_APARTMENTS, 345); assert.equal(masterpiece.MASTERPIECE_HOTEL_ROOMS, 384);
  assert.equal(masterpiece.MASTERPIECE_CONSTRUCTION_START_YEAR, 2000); assert.equal(masterpiece.MASTERPIECE_COMPLETED_YEAR, 2009);
  assert.equal(masterpiece.MASTERPIECE_WIKIPEDIA_SPIRE_HEIGHT, 261); assert.equal(masterpiece.MASTERPIECE_WIKIPEDIA_ROOF_HEIGHT, 241.7);
  assert.equal(masterpiece.MASTERPIECE_WIKIPEDIA_HOTEL_ROOMS, 381); assert.equal(masterpiece.MASTERPIECE_WIKIPEDIA_CONSTRUCTION_START_YEAR, 2002);
  assert.equal(masterpiece.MASTERPIECE_WIKIPEDIA_COMPLETED_YEAR, 2007);
});

test('The Masterpiece keeps hotel, residence, sky gardens, open crown and Hanoi Road entrance visually distinct', () => {
  near(masterpiece.masterpieceFloorY(6), 30); near(masterpiece.masterpieceFloorY(24), 96);
  near(masterpiece.masterpieceFloorY(64), 241.7); assert.equal(masterpiece.MASTERPIECE_CROWN_LOUVRE_TOP, 250.5);
  assert.deepEqual(masterpiece.MASTERPIECE_PUBLISHED_REFUGE_FLOOR_LABELS, [26, 47]);
  assert.deepEqual(masterpiece.MASTERPIECE_VISUAL_SKY_GARDEN_LEVELS, [24, 25, 45, 46]);
  assert.ok(masterpiece.MASTERPIECE_CENTRAL_GLASS_EDGES.includes(43));
  assert.deepEqual(masterpiece.MASTERPIECE_PORTAL_EDGES, [1, 41, 20, 25]);
  assert.equal(masterpiece.MASTERPIECE_ENTRANCE_EDGE, 25);
  near(masterpiece.MASTERPIECE_ENTRANCE.x, 1460.000781180954); near(masterpiece.MASTERPIECE_ENTRANCE.z, -1754.8253703821033);
  assert.ok(masterpiece.MASTERPIECE_ENTRANCE.nx > 0.6 && masterpiece.MASTERPIECE_ENTRANCE.nz < -0.7);
  assert.match(masterpiece.MASTERPIECE_ENTRANCE.evidence, /not an OSM door node/);
  assert.equal(masterpiece.MASTERPIECE_GROUND_RINGS.length, 2);
  assert.equal(masterpiece.masterpieceRingColliders(masterpiece.MASTERPIECE_TOWER_RING, 0, 241.7).length, 44);
  const collider = masterpiece.masterpieceEdgeCollider(masterpiece.MASTERPIECE_TOWER_RING, 25, 0, 241.7);
  assert.ok([collider.minX, collider.maxX, collider.minZ, collider.maxZ].every(Number.isFinite));
  assert.ok(collider.minX < collider.maxX && collider.minZ < collider.maxZ && collider.obb?.hx > 0 && collider.obb?.hz > 0);
});

test('The Masterpiece world has authored curved balconies, blue spines, sky gardens, open portals and entrance without photo assets', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/masterpiece-world.js'), 'utf8');
  for (const pattern of [/MasterpieceHotelAndResidentialVisionGlass/, /MasterpieceContinuousBlueGlassSpines/,
    /MasterpieceCurvedResidentialBalconyBands/, /MasterpieceDoubleHeightSkyGardenPlanting/,
    /MasterpieceFourOpenRectangularCrownPortals/, /MasterpieceHorizontalCrownAndPlantLouvres/,
    /MasterpieceRoofMaintenanceBoom/, /MasterpieceHanoiRoadResidentialEntrance/,
    /MasterpieceSkyGardenWarmLinearAccents/, /MasterpieceDecorativeBronzeLobbyScreens/,
    /MasterpieceFlatGlassEntranceCanopy/, /MasterpieceEntranceIdentification/]) assert.match(source, pattern);
  assert.doesNotMatch(source, /TextureLoader|GLTFLoader|\.jpg|\.png|image-search/);
  assert.match(source, /for \(const collider of colliders\) \{ collider\.minY \+= groundOffset; collider\.maxY \+= groundOffset; \}/);
  const meta = terrain.HONG_KONG_TERRAIN_META;
  near(meta.masterpiecePadHeight, terrain.rawHongKongTerrainHeight(masterpiece.MASTERPIECE_SITE.x, masterpiece.MASTERPIECE_SITE.z));
  near(meta.masterpiecePadHeight, 5.75);
  for (const ring of masterpiece.MASTERPIECE_GROUND_RINGS) {
    let x = 0, z = 0; const count = ring.length / 2 - 1;
    for (let i = 0; i < ring.length - 2; i += 2) { x += ring[i]; z += ring[i + 1]; }
    near(terrain.hongKongTerrainHeight(x / count, z / count), meta.masterpiecePadHeight);
  }
});
