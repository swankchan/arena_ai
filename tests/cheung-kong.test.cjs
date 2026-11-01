const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let ckc, terrain, sites;
test.before(async () => {
  ckc = await import('../js/cities/hongkong/cheung-kong-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  sites = await import('../js/cities/hongkong/landmark-site.js');
});
const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);

test('Cheung Kong Center preserves the retrieved six-vertex OSM way and separate height/floor conventions', () => {
  const site = ckc.CHEUNG_KONG_SITE;
  assert.equal(site.osmId, 64897826); assert.equal(site.source.version, 12); assert.equal(site.source.changeset, 186966169);
  assert.equal(site.localRing.length / 2, 6); assert.equal(site.ring.length, 14);
  near(site.x, 98.70266699412689); near(site.z, 263.1983367150925);
  near(site.w, 47.75832551153819); near(site.d, 47.339042385344925); near(site.ry, 0.7795071424558585);
  near(site.ring[0], 132.3249537150471); near(site.ring[1], 263.24816705840544);
  assert.equal(site.source.tags.height, 283); assert.equal(site.source.tags['building:levels'], '63');
  assert.equal(ckc.CHEUNG_KONG_OSM_HEIGHT, 283); assert.equal(ckc.CHEUNG_KONG_HEIGHT, 282.8); assert.equal(ckc.CHEUNG_KONG_TO_TIP_HEIGHT, 282.8);
  assert.equal(ckc.CHEUNG_KONG_OSM_LEVELS, 63); assert.equal(ckc.CHEUNG_KONG_LEVELS, 63);
  assert.equal(ckc.CHEUNG_KONG_CONVENTIONAL_LEVELS, 62); assert.equal(ckc.CHEUNG_KONG_TOP_LEVEL_LABEL, 70);
  assert.equal(ckc.CHEUNG_KONG_BELOW_GROUND_LEVELS, 5); assert.equal(ckc.CHEUNG_KONG_PANEL_WIDTH, 2.4); assert.equal(ckc.CHEUNG_KONG_PANEL_HEIGHT, 2.1);
  assert.equal(ckc.CHEUNG_KONG_STRUCTURAL_PLAN, 47.4); assert.equal(ckc.CHEUNG_KONG_CHAMFER, 1);
});

test('Cheung Kong Center chamfers the four real corners and places its canopy on the verified OSM entrance', () => {
  assert.equal(ckc.CHEUNG_KONG_VISUAL_RING.length / 2 - 1, 8);
  assert.equal(ckc.CHEUNG_KONG_LOBBY_RING.length / 2 - 1, 12);
  for (const ring of [ckc.CHEUNG_KONG_VISUAL_RING, ckc.CHEUNG_KONG_LOBBY_RING]) {
    for (let i = 0; i + 1 < ring.length; i += 2) {
      const world = ckc.cheungKongLocalToWorld(ring[i], ring[i + 1]);
      const x = world.x + (ckc.CHEUNG_KONG_SITE.x - world.x) * 1e-7, z = world.z + (ckc.CHEUNG_KONG_SITE.z - world.z) * 1e-7;
      assert.ok(sites.pointInFlatRing(ckc.CHEUNG_KONG_SITE.ring, x, z), 'authored corner escapes the OSM footprint');
    }
  }
  assert.equal(ckc.CHEUNG_KONG_ENTRANCE.nodeId, 8039390420); assert.equal(ckc.CHEUNG_KONG_ENTRANCE_EDGE, 4);
  assert.equal(ckc.CHEUNG_KONG_SITE.source.geometry[4].lon, 114.1604123); assert.equal(ckc.CHEUNG_KONG_SITE.source.geometry[4].lat, 22.2793552);
  near(ckc.CHEUNG_KONG_ENTRANCE.x, 83.7130528845681); near(ckc.CHEUNG_KONG_ENTRANCE.z, 281.79612818332294);
  assert.equal(ckc.cheungKongRingColliders(ckc.CHEUNG_KONG_VISUAL_RING, 9, 282.8).length, 8);
  assert.equal(ckc.cheungKongRingColliders(ckc.CHEUNG_KONG_LOBBY_RING, 0, 9).length, 12);
  near(ckc.cheungKongFloorY(1), 9); near(ckc.cheungKongFloorY(5), 27); near(ckc.cheungKongFloorY(63), 276.3);
});

test('Cheung Kong Center has authored sunshades, rounded lobby, flat roof and optical-fibre night treatment', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/cheung-kong-world.js'), 'utf8');
  for (const pattern of [/CheungKongUniformBlueGreenGlassPanels/, /CheungKongProjectingAerofoilSunshades/,
    /CheungKongContinuousStainlessSteelVerticalFins/, /CheungKongRoundedDoubleHeightGlassLobby/,
    /CheungKongLowerMechanicalFloorLouvres/, /CheungKongNightOpticalFibreSparkles/, /CheungKongFlatRoofDeck/,
    /CheungKongActualOsmEntranceBarrelCanopy/, /CheungKongSegmentedBarrelVaultCanopy/, /CHEUNG_KONG_PANEL_WIDTH/]) assert.match(source, pattern);
  assert.doesNotMatch(source, /TextureLoader|GLTFLoader|\.jpg|\.png|image-search/);
  assert.match(source, /for \(const collider of colliders\) \{ collider\.minY \+= groundOffset; collider\.maxY \+= groundOffset; \}/);
  const meta = terrain.HONG_KONG_TERRAIN_META;
  near(meta.cheungKongPadHeight, terrain.rawHongKongTerrainHeight(ckc.CHEUNG_KONG_SITE.x, ckc.CHEUNG_KONG_SITE.z));
  near(meta.cheungKongPadHeight, 13.13482158596429);
  near(terrain.hongKongTerrainHeight(ckc.CHEUNG_KONG_SITE.x, ckc.CHEUNG_KONG_SITE.z), meta.cheungKongPadHeight);
});
