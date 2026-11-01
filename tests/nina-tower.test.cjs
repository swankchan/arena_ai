const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let nina, terrain;
test.before(async () => {
  nina = await import('../js/cities/hongkong/nina-tower-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
});
const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);

test('Nina Tower preserves three retrieved OSM building rings instead of the commercial land-use footprint', () => {
  const main = nina.NINA_TOWER_MAIN_SITE, hotel = nina.NINA_TOWER_HOTEL_SITE, podium = nina.NINA_TOWER_PODIUM_SITE;
  assert.equal(main.osmId, 112284860); assert.equal(hotel.osmId, 112284790); assert.equal(podium.osmId, 492365420);
  assert.equal(main.source.version, 13); assert.equal(hotel.source.version, 22); assert.equal(podium.source.version, 22);
  assert.equal(main.localRing.length / 2, 25); assert.equal(hotel.localRing.length / 2, 24); assert.equal(podium.localRing.length / 2, 60);
  assert.equal(main.ring.length, 52); assert.equal(hotel.ring.length, 50); assert.equal(podium.ring.length, 122);
  near(main.x, -4806.0863918039195); near(main.z, -9618.113184112208); near(main.w, 43.30156671352552); near(main.d, 41.674366658062354); near(main.ry, 0.2507984573423666);
  near(hotel.x, -4749.361351480684); near(hotel.z, -9588.015960774475); near(hotel.w, 71.83410282965269); near(hotel.d, 28.84230737585267); near(hotel.ry, -1.3264206704917731);
  near(podium.w, 187.97244512293446); near(podium.d, 113.05828798821676);
  near(main.ring[0], -4824.192685640304); near(main.ring[1], -9601.919588563982);
  assert.equal(main.source.tags.height, 318); assert.equal(main.source.tags.buildingLevels, 80);
  assert.equal(hotel.source.tags.height, undefined); assert.equal(hotel.source.tags.buildingLevels, 42);
  assert.equal(podium.source.tags.building, 'retail');
});

test('Nina Tower keeps OSM, CVU and locally reported height and floor conventions separate', () => {
  assert.equal(nina.NINA_TOWER_OSM_HEIGHT, 318);
  assert.equal(nina.NINA_TOWER_HEIGHT, 320.4); assert.equal(nina.NINA_TOWER_ROOF_HEIGHT, 319.8);
  assert.equal(nina.NINA_TOWER_OCCUPIED_HEIGHT, 301.1); assert.equal(nina.NINA_TOWER_OBSERVATORY_HEIGHT, 151.7);
  assert.equal(nina.NINA_TOWER_LEVELS, 80); assert.equal(nina.NINA_TOWER_TOP_LEVEL_LABEL, 89); assert.equal(nina.NINA_TOWER_BELOW_GROUND_LEVELS, 2);
  assert.equal(nina.NINA_TOWER_HOTEL_HEIGHT, 170.4); assert.equal(nina.NINA_TOWER_HOTEL_OCCUPIED_HEIGHT, 148.1);
  assert.equal(nina.NINA_TOWER_HOTEL_LOCAL_REPORTED_HEIGHT, 163.7); assert.equal(nina.NINA_TOWER_HOTEL_LEVELS, 42);
  near(nina.ninaTowerMainFloorY(80), 301.1); near(nina.ninaTowerHotelFloorY(42), 148.1);
  near(nina.ninaTowerMainRoofAt(0), 319.8); near(nina.ninaTowerMainRoofAt(0) + 0.6, 320.4);
  assert.ok(nina.ninaTowerMainRoofAt(nina.NINA_TOWER_MAIN_SITE.w * 0.5) < 319.8);
  near(nina.ninaTowerHotelRoofAt(nina.NINA_TOWER_HOTEL_SITE.w * 0.5) + 0.6, 170.4);
  assert.ok(nina.ninaTowerHotelRoofAt(0) < nina.ninaTowerHotelRoofAt(nina.NINA_TOWER_HOTEL_SITE.w * 0.5));
  assert.deepEqual([...nina.NINA_TOWER_MAIN_PLANT_LEVELS], [24, 25, 32, 52, 53, 54, 73, 76]);
});

test('Nina Tower curved glass-bottom skybridge joins both real tower rings with three-metre trusses', () => {
  const bridge = nina.NINA_TOWER_SKYBRIDGE;
  near(bridge.start.x, -4783.405635665874); near(bridge.start.z, -9606.079207951669);
  near(bridge.end.x, -4755.051248201699); near(bridge.end.z, -9591.034911336788);
  assert.equal(bridge.floorY, 148.1); assert.equal(bridge.trussDepth, 3); assert.equal(bridge.bow, 2.2);
  assert.equal(bridge.clearHeight, 3); assert.equal(bridge.roofRise, 0.45);
  const start = nina.ninaTowerSkybridgePoint(0), end = nina.ninaTowerSkybridgePoint(1), middle = nina.ninaTowerSkybridgePoint(0.5);
  near(start.x, bridge.start.x); near(start.z, bridge.start.z); near(end.x, bridge.end.x); near(end.z, bridge.end.z);
  const straightX = (bridge.start.x + bridge.end.x) * 0.5, straightZ = (bridge.start.z + bridge.end.z) * 0.5;
  near(Math.hypot(middle.x - straightX, middle.z - straightZ), 1.1, 1e-8);
  assert.equal(nina.ninaTowerRingColliders(nina.NINA_TOWER_MAIN_SITE, 0, 320.4).length, 25);
  assert.equal(nina.ninaTowerRingColliders(nina.NINA_TOWER_HOTEL_SITE, 24, 170.4).length, 24);
});

test('Nina Tower has authored curtain walls, crowns, podium portals and entrance without photograph assets', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/nina-tower-world.js'), 'utf8');
  for (const pattern of [/NinaTowerMainContinuousVerticalAluminiumFins/, /NinaTowerMainHorizontalMechanicalLouvres/,
    /NinaTowerMainOpenArchedRoofFrameAndRafters/, /NinaTowerHotelUpsweptOpenRoofFrame/, /NinaTowerGlassBottomCurvedSkybridgeDeck/,
    /NinaTowerTwinThreeMetreTriangularSpaceTrusses/, /NinaTowerEnclosedCurvedGlassSkybridgeRoof/, /NinaTowerSkybridgeStructuralArchRibs/, /NinaTowerExactPodiumAndVehiclePortals/, /NinaTowerActualOsmEntranceCanopy/,
    /NinaTowerPodiumAtriumGlazedBarrelPanels/, /NinaTowerPodiumLargeLedDisplay/, /NINA_TOWER_PODIUM_VEHICLE_PORTAL_EDGES/]) assert.match(source, pattern);
  assert.doesNotMatch(source, /TextureLoader|GLTFLoader|\.jpg|\.png|image-search/);
  assert.equal(nina.NINA_TOWER_PODIUM_SOFFIT, 8); assert.equal(nina.NINA_TOWER_PODIUM_ROOF, 24);
  assert.equal(nina.NINA_TOWER_PODIUM_VEHICLE_PORTAL_EDGES.length, 16);
  assert.ok(!nina.NINA_TOWER_PODIUM_VEHICLE_PORTAL_EDGES.includes(nina.NINA_TOWER_PODIUM_ENTRANCE_EDGE));
  assert.equal(nina.NINA_TOWER_ENTRANCE.nodeId, 6298459729);
  assert.equal(nina.NINA_TOWER_PODIUM_SITE.source.geometry[2].lon, 114.1119145);
  assert.equal(nina.NINA_TOWER_PODIUM_SITE.source.geometry[2].lat, 22.3680698);
  assert.equal(nina.NINA_TOWER_PODIUM_SITE.source.geometry[47].lon, 114.1132612);
  assert.equal(nina.NINA_TOWER_PODIUM_SITE.source.geometry[47].lat, 22.3680656);
  const meta = terrain.HONG_KONG_TERRAIN_META;
  near(meta.ninaTowerPadHeight, terrain.rawHongKongTerrainHeight(nina.NINA_TOWER_PODIUM_SITE.x, nina.NINA_TOWER_PODIUM_SITE.z));
  for (const site of [nina.NINA_TOWER_PODIUM_SITE, nina.NINA_TOWER_MAIN_SITE, nina.NINA_TOWER_HOTEL_SITE]) {
    near(terrain.hongKongTerrainHeight(site.x, site.z), meta.ninaTowerPadHeight);
  }
});
