const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let langham, terrain;
test.before(async () => {
  langham = await import('../js/cities/hongkong/langham-place-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
});
const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);

test('Langham Place preserves the current 49-vertex OSM shaft and separate height conventions', () => {
  const site = langham.LANGHAM_PLACE_SITE;
  assert.equal(site.osmId, 65259283); assert.equal(site.source.version, 10); assert.equal(site.source.changeset, 167256890);
  assert.equal(site.localRing.length / 2, 49); assert.equal(site.ring.length, 100); assert.equal(langham.LANGHAM_PLACE_TOWER_RING.length, 100);
  near(site.x, 916.7048484092081); near(site.z, -4089.400066604031);
  near(site.w, 44.270143917100995); near(site.d, 44.11146237165258); near(site.ry, 0.19350471089742882);
  near(site.ring[0], 924.8112691982667); near(site.ring[1], -4071.006168386452);
  assert.equal(site.source.tags.height, '255'); assert.equal(site.source.tags['building:levels'], '59'); assert.equal(site.source.tags.layer, '1');
  assert.equal(langham.LANGHAM_PLACE_OSM_HEIGHT, 255); assert.equal(langham.LANGHAM_PLACE_HEIGHT, 255.1);
  assert.equal(langham.LANGHAM_PLACE_TO_TIP_HEIGHT, 255.1); assert.equal(langham.LANGHAM_PLACE_LEVELS, 59);
  assert.equal(langham.LANGHAM_PLACE_BELOW_GROUND_LEVELS, 5); assert.equal(langham.LANGHAM_PLACE_TOWER_GFA, 65868);
  assert.equal(langham.LANGHAM_PLACE_COMPLETED_YEAR, 2004); assert.equal(langham.LANGHAM_PLACE_CONSTRUCTION_START_YEAR, 1999);
  assert.equal(langham.LANGHAM_PLACE_WO_OFFICE_STOREYS, 57); assert.equal(langham.LANGHAM_PLACE_WO_OFFICE_GFA, 66000);
  assert.equal(langham.LANGHAM_PLACE_WO_GRAND_ATRIUM_STOREYS, 10);
});

test('Langham Place keeps its stepped roofs, ribbed dome, grey bands and exact OSM entrance traceable', () => {
  assert.deepEqual(langham.LANGHAM_PLACE_ROOF_ZONES.map((zone) => zone.height), [239, 230, 226, 233]);
  assert.equal(langham.LANGHAM_PLACE_ROOF_ZONES.reduce((sum, zone) => sum + zone.edges.length, 0), 49);
  assert.equal(langham.langhamPlaceRoofYForEdge(0), 239); assert.equal(langham.langhamPlaceRoofYForEdge(21), 226);
  assert.equal(langham.LANGHAM_PLACE_MAIN_ROOF, 239); near(langham.LANGHAM_PLACE_DOME_HEIGHT, 16.1);
  near(langham.LANGHAM_PLACE_DOME_BASE + langham.LANGHAM_PLACE_DOME_HEIGHT, 255.1);
  near(langham.langhamPlaceFloorY(59), 239); assert.deepEqual(langham.LANGHAM_PLACE_VISUAL_GREY_BAND_LEVELS, [18, 19, 38, 39]);
  assert.equal(langham.LANGHAM_PLACE_ENTRANCE_SOURCE.id, 10199055644); assert.equal(langham.LANGHAM_PLACE_ENTRANCE_SOURCE.tags.entrance, 'yes');
  assert.equal(langham.LANGHAM_PLACE_ENTRANCE_EDGE_BEFORE, 30); assert.equal(langham.LANGHAM_PLACE_ENTRANCE_EDGE_AFTER, 31);
  near(langham.LANGHAM_PLACE_ENTRANCE.x, 925.1101339689501); near(langham.LANGHAM_PLACE_ENTRANCE.z, -4106.252831228634);
  near(langham.LANGHAM_PLACE_ENTRANCE.nx, 0.5515105172878662); near(langham.LANGHAM_PLACE_ENTRANCE.nz, -0.8341679383198987);
  assert.match(langham.LANGHAM_PLACE_ENTRANCE.evidence, /Exact OSM entrance=yes node/);
  assert.equal(langham.LANGHAM_PLACE_GROUND_RINGS.length, 2);
  assert.equal(langham.langhamPlaceRingColliders(langham.LANGHAM_PLACE_TOWER_RING).length, 49);
  const colliders = langham.langhamPlaceRingColliders(langham.LANGHAM_PLACE_TOWER_RING);
  assert.ok(colliders.every((c) => c.obb && c.maxY > c.minY && c.minX < c.maxX && c.minZ < c.maxZ));
});

test('Langham Place world has authored blue curves, grey braces, dome ribs, podium columns and office entrance without photo assets', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/langham-place-world.js'), 'utf8');
  for (const pattern of [/LanghamPlaceBlueCurvedVisionGlass/, /LanghamPlaceTwoGreyGlassIntervals/,
    /LanghamPlaceGreyBandDiagonalBraces/, /LanghamPlaceFourSteppedRoofZones/,
    /LanghamPlaceEllipticalGlazedDome/, /LanghamPlaceDomeHorizontalAndVerticalRibs/,
    /LanghamPlaceTallSlopingSilverPodiumColumns/, /LanghamPlaceExactOSMOfficeEntrance/,
    /LanghamPlaceTallOfficeLobbyGlazing/, /LanghamPlaceOfficeTowerIdentification/]) assert.match(source, pattern);
  assert.doesNotMatch(source, /TextureLoader|GLTFLoader|\.jpg|\.png|image-search/);
  assert.match(source, /for \(const collider of colliders\) \{ collider\.minY \+= groundOffset; collider\.maxY \+= groundOffset; \}/);
  const meta = terrain.HONG_KONG_TERRAIN_META;
  near(meta.langhamPlacePadHeight, terrain.rawHongKongTerrainHeight(langham.LANGHAM_PLACE_SITE.x, langham.LANGHAM_PLACE_SITE.z));
  near(meta.langhamPlacePadHeight, 5.436054588567316);
  for (const ring of langham.LANGHAM_PLACE_GROUND_RINGS) {
    let x = 0, z = 0; const count = ring.length / 2 - 1;
    for (let i = 0; i < ring.length - 2; i += 2) { x += ring[i]; z += ring[i + 1]; }
    near(terrain.hongKongTerrainHeight(x / count, z / count), meta.langhamPlacePadHeight);
  }
});
