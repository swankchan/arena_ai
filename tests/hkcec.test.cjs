const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let h, terrain;

test.before(async () => {
  h = await import('../js/cities/hongkong/hkcec-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
});

const siteCases = () => [
  ['newWing', h.HKCEC_NEW_WING_SITE, h.HKCEC_NEW_WING_OSM_SOURCE, 26490011, 20, '2023-10-21T07:19:47Z', 142910648, 64, 34600.33889737001],
  ['oldWing', h.HKCEC_OLD_WING_SITE, h.HKCEC_OLD_WING_OSM_SOURCE, 26490161, 13, '2024-10-16T02:27:19Z', 157944489, 31, 19189.888868512462],
  ['atrium', h.HKCEC_ATRIUM_SITE, h.HKCEC_ATRIUM_OSM_SOURCE, 79444510, 14, '2024-10-16T02:27:19Z', 157944489, 25, 11484.963987002553],
  ['apartments', h.HKCEC_APARTMENT_SITE, h.HKCEC_APARTMENT_OSM_SOURCE, 107497692, 8, '2025-12-27T08:33:19Z', 176470912, 14, 1797.5301828316806]
];

test('HKCEC preserves four exact current OSM ways, tags, node order and source hashes', () => {
  const raw = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/landmarks.json'), 'utf8'));
  for (const [key, site, source, id, version, timestamp, changeset, count, area] of siteCases()) {
    const way = raw.elements.find((element) => element.type === 'way' && element.id === id); assert.ok(way, key);
    assert.equal(site.osmId, id); assert.equal(source.id, id); assert.equal(source.version, version); assert.equal(source.wayTimestamp, timestamp); assert.equal(source.changeset, changeset);
    assert.equal(source.retrieved, '2026-11-03'); assert.equal(source.sourceSha256, raw.source.sha256); assert.equal(source.sourceTimestamp, raw.source.sourceTimestamp);
    assert.deepEqual(source.tags, way.tags); assert.deepEqual(source.geometry.map(({ lon, lat }) => ({ lon, lat })), way.geometry);
    assert.equal(source.geometry.length, count); assert.equal(source.geometry[0].id, source.geometry.at(-1).id); assert.equal(new Set(source.geometry.slice(0, -1).map((point) => point.id)).size, count - 1);
    assert.ok(Math.abs(site.area - area) < 1e-8); assert.equal(site.ring.length, count * 2); assert.equal(site.localRing.length, count * 2);
    assert.equal(h.HKCEC_OSM_SOURCES[key], source);
  }
});

test('HKCEC scope is B0043 Convention Plaza Apartments, not B0034 office tower or either hotel', () => {
  const inventory = fs.readFileSync(path.join(root, 'docs/hongkong-building-inventory.md'), 'utf8');
  assert.match(inventory, /B0043[^\n]*會景閣/); assert.match(inventory, /B0034[^\n]*會展廣場辦公大樓/);
  assert.equal(h.HKCEC_APARTMENT_SITE.osmId, 107497692); assert.equal(h.HKCEC_APARTMENT_SITE.name, '會景閣 Convention Plaza');
  assert.deepEqual(Object.values(h.HKCEC_OSM_SOURCES).map((source) => source.id), [26490011, 26490161, 79444510, 107497692]);
  assert.ok(!Object.values(h.HKCEC_OSM_SOURCES).some((source) => [107497689, 107497699, 107497707].includes(source.id)));
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/hkcec-architecture.js'), 'utf8');
  assert.match(source, /Convention Plaza Office Tower \(way 107497689\)/); assert.match(source, /Grand Hyatt and Renaissance Harbour View are NOT substituted/);
});

test('HKCEC official architectural facts remain distinct from OSM levels and visual conventions', () => {
  assert.equal(h.HKCEC_SOM_HEIGHT, 55); assert.equal(h.HKCEC_SOM_STORIES, 6); assert.equal(h.HKCEC_SOM_SITE_AREA_HECTARES, 6.48); assert.equal(h.HKCEC_SOM_GROSS_AREA, 158000);
  assert.equal(h.HKCEC_SOM_CLEAR_SPAN, 80); assert.equal(h.HKCEC_SOM_VAULTED_CEILING_FEET, 75); assert.equal(h.HKCEC_PHASE2_COMPLETION_YEAR, 1997);
  assert.equal(h.HKCEC_WO_ATRIUM_LEVELS, 3); assert.equal(h.HKCEC_WO_ATRIUM_AREA, 19400); assert.equal(h.HKCEC_WO_ATRIUM_SPAN, 80); assert.equal(h.HKCEC_ATRIUM_COMPLETION_YEAR, 2009);
  assert.equal(h.HKCEC_WO_PHASE2_HALLS, 3); assert.equal(h.HKCEC_WO_PHASE2_EXHIBITION_AREA, 26000); assert.equal(h.HKCEC_WO_CONVENTION_HALL_SEATS, 4200);
  assert.equal(h.HKCEC_NEW_WING_OSM_LEVELS, 5); assert.equal(h.HKCEC_OLD_WING_OSM_LEVELS, 10); assert.equal(h.HKCEC_ATRIUM_OSM_LEVELS, 8); assert.equal(h.HKCEC_ATRIUM_OSM_SOURCE.tags.fixme, 'Check floors');
  assert.equal(h.HKCEC_APARTMENT_HEIGHT, 164); assert.equal(h.HKCEC_APARTMENT_OSM_LEVELS, 47); assert.equal(h.HKCEC_APARTMENT_OSM_MIN_LEVEL, 10);
  assert.equal(h.HKCEC_APARTMENT_OFFICIAL_RESIDENTIAL_LEVELS, 35); assert.equal(h.HKCEC_APARTMENT_OFFICIAL_FIRST_RESIDENTIAL_LEVEL, 11); assert.equal(h.HKCEC_APARTMENT_OFFICIAL_LAST_RESIDENTIAL_LEVEL, 46);
  assert.equal(h.HKCEC_APARTMENT_OFFICIAL_APPROX_UNITS, 600); assert.equal(h.HKCEC_APARTMENT_COMPLETION_YEAR, 1989); assert.equal(h.HKCEC_APARTMENT_VISUAL_COURSES, 35);
  assert.equal(h.HKCEC_APARTMENT_MAIN_ROOF, 158); assert.equal(h.HKCEC_ORIGINAL_COMPLETION_YEAR, 1988);
  assert.match(h.HKCEC_PHASE2_ARCHITECTS, /Wong & Ouyang/); assert.match(h.HKCEC_PHASE2_ARCHITECTS, /Skidmore, Owings & Merrill/); assert.equal(h.HKCEC_ORIGINAL_ARCHITECT, 'Ng Chun Man & Associates Architects & Engineers');
});

test('HKCEC OBB-local coordinates round-trip every source vertex and collider', () => {
  for (const [, site] of siteCases()) {
    assert.ok(Math.abs(site.localBounds.maxX - site.localBounds.minX - site.w) < 1e-8);
    assert.ok(Math.abs(site.localBounds.maxZ - site.localBounds.minZ - site.d) < 1e-8);
    for (let i = 0; i < site.ring.length; i += 2) {
      const local = h.hkcecWorldToLocal(site, site.ring[i], site.ring[i + 1]), world = h.hkcecLocalToWorld(site, local.x, local.z);
      assert.ok(Math.hypot(world.x - site.ring[i], world.z - site.ring[i + 1]) < 1e-9);
      assert.ok(Math.hypot(local.x - site.localRing[i], local.z - site.localRing[i + 1]) < 1e-9);
    }
    const colliders = h.hkcecRingColliders(site, site.localRing, h.HKCEC_COVERED_ROAD_SOFFIT, 34);
    assert.equal(colliders.length, site.localRing.length / 2 - 1);
    for (let edge = 0; edge < colliders.length; edge++) {
      const ring = site.localRing, i = edge * 2, expected = h.hkcecLocalToWorld(site, (ring[i] + ring[i + 2]) * .5, (ring[i + 1] + ring[i + 3]) * .5);
      assert.ok(Math.hypot(colliders[edge].x - expected.x, colliders[edge].z - expected.z) < 1e-9);
      assert.equal(colliders[edge].minY, 8); assert.equal(colliders[edge].maxY, 34); assert.equal(colliders[edge].shape, 'box'); assert.ok(colliders[edge].obb);
    }
  }
});

test('HKCEC uses its own traceable DTM pad and road-priority non-road ground query', () => {
  assert.equal(terrain.HONG_KONG_TERRAIN_META.hkcecPadHeight, 5);
  for (const [, site] of siteCases()) {
    assert.equal(terrain.hongKongTerrainHeight(site.x, site.z), 5);
    assert.equal(h.hkcecGroundHeightAt(site.x, site.z, -99, { plaza: 5.15 }), 5.15);
  }
  assert.equal(h.hkcecGroundHeightAt(0, 0, 42, { plaza: 5.15 }), 42);
  assert.equal(h.HKCEC_GROUND_SAMPLE.x, h.HKCEC_MAIN_ENTRANCE.x); assert.equal(h.HKCEC_GROUND_SAMPLE.z, h.HKCEC_MAIN_ENTRANCE.z);
  assert.equal(h.HKCEC_GROUND_RINGS.length, 4);
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  assert.match(world, /!groundUsesRoad \? hkcec\.groundHeightAt/); assert.match(world, /HONG_KONG_TERRAIN_META\.hkcecPadHeight/);
  const elevation = fs.readFileSync(path.join(root, 'js/cities/hongkong/road-elevation.js'), 'utf8'); assert.match(elevation, /\.\.\.HKCEC_GROUND_RINGS/);
});

test('HKCEC photo-directed entrances have correct world frames and open-door collision pieces', () => {
  const main = h.HKCEC_MAIN_ENTRANCE, apartment = h.HKCEC_APARTMENT_ENTRANCE;
  assert.equal(main.sourceEdge, 9); assert.equal(apartment.sourceEdge, 11); assert.equal(main.nodeId, null); assert.equal(apartment.nodeId, null);
  assert.ok(Math.hypot(main.x - 1380.4100009983708, main.z - 134.04916023749172) < 1e-9);
  assert.ok(Math.hypot(apartment.x - 1318.2152116161876, apartment.z - 138.8605567203163) < 1e-9);
  assert.ok(main.nz > .99 && apartment.nz > .99); assert.match(apartment.evidence, /28Hse/); assert.match(apartment.evidence, /red carpet/);
  for (const [site, frame] of [[h.HKCEC_OLD_WING_SITE, main], [h.HKCEC_APARTMENT_SITE, apartment]]) {
    const c = h.hkcecFrameCollider(site, frame, -3.65, -5, 2.6, .18, .15, 4.35), expected = h.hkcecFrameToWorld(frame, -3.65, -5);
    assert.ok(Math.hypot(c.x - expected.x, c.z - expected.z) < 1e-9); assert.equal(c.ry, frame.ry); assert.equal(c.minY, .15); assert.equal(c.maxY, 4.35);
  }
});

test('HKCEC world contains authored bird roofs, glass courses, roof garden, entrances and day-night materials', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/hkcec-world.js'), 'utf8');
  assert.match(world, /ThreeLayerFlyingBirdRoof/); assert.match(world, /centre-40/); assert.match(world, /centre\+40/); assert.match(world, /\['main', \[\.61/); assert.match(world, /\['left', \[\.72/); assert.match(world, /\['right', \[\.72/);
  assert.match(world, /NewWingCurvedHarbourGlassWall/); assert.match(world, /ApartmentsBlueGreenGlass35Courses/); assert.match(world, /HKCEC_APARTMENT_VISUAL_COURSES/);
  assert.match(world, /AtriumNineExposedWhiteArchedTrusses/); assert.match(world, /AtriumRoofGardenTreeCanopies/); assert.match(world, /AtriumRoofGardenBenches/);
  assert.match(world, /ConventionPlazaApartmentsRedEntranceCarpet/); assert.match(world, /會景閣  CONVENTION PLAZA APARTMENTS/); assert.match(world, /香港會議展覽中心  HKCEC/);
  assert.match(world, /HKCEC_ENTRANCE_LAYOUTS\[apartment \? 'apartment' : 'main'\]/); assert.match(world, /EntranceSideBayGlassDoors/); assert.match(world, /hkcecApartmentEntranceRoadPortalWidth/);
  assert.match(world, /glass\.emissiveNode = color\(0xffd2a0\)/); assert.match(world, /attribute\('aLit'\)/); assert.match(world, /nightAmount\(\)/);
  assert.match(world, /OldWingRoadClearUpperPodiumSoffit/); assert.match(world, /NewWingRoadClearUpperPodiumSoffit/); assert.match(world, /AtriumRoadBridgeSoffit/);
  assert.match(world, /OldWingRoadSafeGroundGlass/); assert.match(world, /NewWingRoadSafeGroundGlass/); assert.match(world, /hkcecGroundFacadeColliders/);
  assert.match(world, /The roof was not separately surveyed/i); assert.match(world, /hkcecColliders: colliders\.length/);
  const integration = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  assert.match(integration, /\.\.\.hkcec\.stats/); assert.match(integration, /\.\.\.hkcec\.colliders/); assert.match(integration, /\.\.\.hkcec\.landmarks/);
  const cityIndex = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8'); assert.match(cityIndex, /hkcec: world\.hkcec/);
});
