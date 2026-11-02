const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let summit, terrain;
test.before(async () => {
  summit = await import('../js/cities/hongkong/summit-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
});
const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);

test('The Summit preserves its 64-vertex OSM butterfly and separated height, floor and date conventions', () => {
  const site = summit.THE_SUMMIT_SITE;
  assert.equal(site.osmId, 65257281); assert.equal(site.source.version, 9); assert.equal(site.source.changeset, 142910648);
  assert.equal(site.localRing.length / 2, 64); assert.equal(site.ring.length, 130); assert.equal(summit.THE_SUMMIT_TOWER_RING.length, 130);
  near(site.x, 2480.1916635285093); near(site.z, 1802.6617586407342);
  near(site.w, 34.26816106655042); near(site.d, 18.55579374716308); near(site.ry, -0.019566131082668026);
  assert.equal(site.source.tags.height, '220'); assert.equal(site.source.tags['building:levels'], '69'); assert.equal(site.source.tags['building:use'], 'residential');
  assert.equal(summit.THE_SUMMIT_OSM_HEIGHT, 220); assert.equal(summit.THE_SUMMIT_HEIGHT, 219.8); assert.equal(summit.THE_SUMMIT_TO_TIP_HEIGHT, 219.8);
  assert.equal(summit.THE_SUMMIT_LEVELS, 69); assert.equal(summit.THE_SUMMIT_BELOW_GROUND_LEVELS, 2);
  assert.equal(summit.THE_SUMMIT_TOWER_GFA, 15225); assert.equal(summit.THE_SUMMIT_ELEVATORS, 3); assert.equal(summit.THE_SUMMIT_UNITS, 54);
  assert.equal(summit.THE_SUMMIT_COMPLETED_YEAR, 2002); assert.equal(summit.THE_SUMMIT_CTBUH_CONSTRUCTION_START_YEAR, 1996);
  assert.equal(summit.THE_SUMMIT_WIKIPEDIA_LEVELS, 65); assert.equal(summit.THE_SUMMIT_WIKIPEDIA_CONSTRUCTION_START_YEAR, 1999);
  assert.equal(summit.THE_SUMMIT_WIKIPEDIA_COMPLETED_YEAR, 2001);
});

test('The Summit keeps unequal wing crowns, metal service tail, podium and modelled Happy Valley lobby traceable', () => {
  assert.deepEqual(summit.THE_SUMMIT_ROOF_ZONES.map((zone) => zone.height), [216.8, 211, 219.8, 212.6]);
  assert.equal(summit.THE_SUMMIT_ROOF_ZONES.reduce((sum, zone) => sum + zone.edges.length, 0), 64);
  assert.equal(summit.summitRoofYForEdge(0), 216.8); assert.equal(summit.summitRoofYForEdge(17), 211); assert.equal(summit.summitRoofYForEdge(30), 219.8);
  near(summit.summitFloorY(65), 211); assert.equal(summit.THE_SUMMIT_PODIUM_HEIGHT, 18); assert.equal(summit.THE_SUMMIT_VISUAL_SHAFT_COURSES, 65);
  assert.equal(summit.THE_SUMMIT_METAL_CORE_EDGES.length, 28); assert.deepEqual(summit.THE_SUMMIT_SADDLE_EDGES, [13, 14, 20, 21]);
  assert.equal(summit.THE_SUMMIT_PODIUM_RING.length, 130); assert.equal(summit.THE_SUMMIT_PODIUM_WORLD_RING.length, 130);
  assert.equal(summit.THE_SUMMIT_ENTRANCE_SOURCE_VERTEX, 17); assert.equal(summit.THE_SUMMIT_ENTRANCE_SOURCE_NODE, 797836721);
  near(summit.THE_SUMMIT_ENTRANCE.x, 2480.241178339267); near(summit.THE_SUMMIT_ENTRANCE.z, 1792.6406806278126);
  near(summit.THE_SUMMIT_ENTRANCE.nx, -0.0011793095188998687); near(summit.THE_SUMMIT_ENTRANCE.nz, -0.9999993046142877);
  assert.match(summit.THE_SUMMIT_ENTRANCE.evidence, /no entrance tag/); assert.match(summit.THE_SUMMIT_ENTRANCE.evidence, /Happy Valley-facing/);
  assert.equal(summit.THE_SUMMIT_GROUND_RINGS.length, 3); assert.equal(summit.summitRingColliders(summit.THE_SUMMIT_TOWER_RING).length, 64);
  assert.equal(summit.summitRingColliders(summit.THE_SUMMIT_PODIUM_RING, 0, 0.85, () => 19.2).length, 64);
});

test('The Summit world contains authored green glass, screw-on metal, curved podium, water tanks and lobby without photo assets', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/summit-world.js'), 'utf8');
  for (const pattern of [/SummitCurvedButterflyGreenCurtainWall/, /SummitScrewOnGreenMetalPanelCladding/,
    /SummitUnequalCurvedWingCrowns/, /SummitDeepButterflySaddleChannels/, /SummitFourCurvedPodiumLevels/,
    /SummitPodiumRoofLawn/, /SummitPodiumPilotis/, /SummitCompartmentalisedRoofWaterTanks/,
    /SummitRoofTankDivisionFrames/, /SummitHappyValleyFacingMainLobbyTerrace/, /SummitThinGlassLobbyCanopy/,
    /SummitIdentification/]) assert.match(source, pattern);
  assert.doesNotMatch(source, /TextureLoader|GLTFLoader|\.jpg|\.png|image-search/);
  assert.match(source, /for \(const collider of colliders\) \{ collider\.minY \+= groundOffset; collider\.maxY \+= groundOffset; \}/);
  const meta = terrain.HONG_KONG_TERRAIN_META;
  near(meta.summitPadHeight, terrain.rawHongKongTerrainHeight(summit.THE_SUMMIT_GROUND_SAMPLE.x, summit.THE_SUMMIT_GROUND_SAMPLE.z));
  near(meta.summitPadHeight, 142.56601499466683);
  for (const ring of summit.THE_SUMMIT_GROUND_RINGS) {
    let x = 0, z = 0; const count = ring.length / 2 - 1;
    for (let i = 0; i < ring.length - 2; i += 2) { x += ring[i]; z += ring[i + 1]; }
    near(terrain.hongKongTerrainHeight(x / count, z / count), meta.summitPadHeight);
  }
});
