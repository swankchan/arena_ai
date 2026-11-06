const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.join(__dirname, '..');
let THREE, architecture, world, terrain;

test.before(async () => {
  globalThis.document = { createElement: () => {
    const canvas = { width: 0, height: 0 };
    const context = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, {
      get: (target, key) => target[key] || (() => {}), set: (target, key, value) => { target[key] = value; return true; },
    });
    canvas.getContext = () => context; return canvas;
  } };
  architecture = await import('../js/cities/hongkong/hong-kong-stadium-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  THREE = await import('three/webgpu');
  const { buildHongKongStadium } = await import('../js/cities/hongkong/hong-kong-stadium-world.js');
  world = buildHongKongStadium(new THREE.Group(), { groundOffset: terrain.HONG_KONG_TERRAIN_META.hongKongStadiumPadHeight });
});

test('HK-B0102 keeps the exact OSM Hong Kong Stadium bowl outline', () => {
  const source = architecture.HONG_KONG_STADIUM_OSM_SOURCE;
  assert.equal(source.type, 'way'); assert.equal(source.id, 230843881); assert.equal(source.version, 6);
  assert.equal(source.tags['name:zh'], '香港大球場'); assert.equal(source.tags['addr:street'], '東院道 Eastern Hospital Road');
  assert.equal(source.tags['addr:housenumber'], '55'); assert.equal(source.geometry.length, 45);
  assert.equal(source.geometry[0].lat, 22.2740858); assert.equal(source.geometry[0].lon, 114.1876406);
  assert.equal(source.geometry.at(-1).lat, 22.2740858);
  const site = architecture.HONG_KONG_STADIUM_SITE;
  assert.ok(Math.abs(site.ringArea - 48302.94991471595) < 1e-6);
  assert.ok(site.localRing.length / 2 - 1 === 44);
  assert.match(source.attribution, /OpenStreetMap/);
});

test('the 1994 stadium is a continuous ~40,000-seat bowl with two membrane roofs on four arches', () => {
  assert.equal(architecture.HKS_SEATS, 40000);
  assert.equal(architecture.HKS_BOWL_ROWS, 36);
  assert.equal(architecture.HKS_ROOF_COUNT, 2);
  assert.equal(architecture.HKS_ARCHES_PER_ROOF, 2);
  assert.equal(architecture.HKS_PITCH_SURFACE, 'natural grass');
  assert.equal(architecture.HKS_REBUILD_YEAR, 1994); assert.equal(architecture.HKS_ORIGINAL_YEAR, 1953);
  assert.ok(architecture.HKS_ROOF_APEX > architecture.HKS_TIER_TOP, 'the roof clears the top of the tier');
  assert.ok(architecture.HKS_OUTER_HALF_LENGTH * 2 < 309 && architecture.HKS_OUTER_HALF_WIDTH * 2 < 269,
    'the bowl stays inside the OSM block');
  // Modelled seat shells must back the published capacity, not just repeat it.
  assert.ok(Math.abs(world.stats.hongKongStadiumSeatShells - 40000) <= 2000,
    `seat shells ${world.stats.hongKongStadiumSeatShells}`);
  assert.equal(world.stats.hongKongStadiumRows, 36);
  assert.equal(world.stats.hongKongStadiumArches, 4);
});

test('the twin white roofs, arches, seats, pitch and site works are real meshes', () => {
  const names = [];
  world.group.traverse((object) => { if (object.name) names.push(object.name); });
  const expected = [
    'HongKongStadiumWhiteMembraneRoofs', 'HongKongStadiumWhiteTubularArches', 'HongKongStadiumArchLatticeBracing',
    'HongKongStadiumRoofEdgeFascia', 'HongKongStadiumBowlTreads', 'HongKongStadiumBowlRisers',
    'HongKongStadiumGreenSeatShells', 'HongKongStadiumRedSeatShells', 'HongKongStadiumNaturalGrassPitch',
    'HongKongStadiumWhitePitchMarkings', 'HongKongStadiumGoalFrames', 'HongKongStadiumGoalNets',
    'HongKongStadiumFloodlightLampBanks', 'HongKongStadiumPerimeterRailing', 'HongKongStadiumExactOsmSiteSurface',
    'HongKongStadiumBowlPlinthAndOuterWalls',
  ];
  for (const name of expected) assert.ok(names.includes(name), name);
  let nonFinite = 0, meshes = 0;
  world.group.traverse((object) => {
    if (!object.isMesh) return; meshes++;
    const position = object.geometry?.getAttribute('position');
    if (position) for (const value of position.array) if (!Number.isFinite(value)) nonFinite++;
  });
  assert.equal(nonFinite, 0); assert.ok(meshes > 20, `meshes ${meshes}`);
  assert.equal(world.landmarks.length, 1);
  assert.equal(world.landmarks[0].id, 'hong-kong-stadium');
  assert.ok(world.landmarks[0].height > architecture.HKS_ROOF_APEX);
});

test('the bowl is solid at ground level and the pitch inside it stays open', () => {
  assert.equal(world.colliders.length, 8);
  for (const collider of world.colliders) {
    assert.ok([collider.minX, collider.maxX, collider.minZ, collider.maxZ, collider.minY, collider.maxY].every(Number.isFinite));
    assert.ok(collider.maxY > collider.minY);
  }
  const site = architecture.HONG_KONG_STADIUM_SITE;
  const centre = { x: site.x, z: site.z };
  const inside = world.colliders.filter((collider) => centre.x > collider.minX && centre.x < collider.maxX
    && centre.z > collider.minZ && centre.z < collider.maxZ);
  assert.equal(inside.length, 0, 'no collider covers the centre spot of the pitch');
});

test('the bowl and the So Kon Po block sit on one DTM datum', () => {
  const pad = terrain.HONG_KONG_TERRAIN_META.hongKongStadiumPadHeight;
  assert.ok(Number.isFinite(pad));
  const site = architecture.HONG_KONG_STADIUM_SITE;
  assert.ok(Math.abs(terrain.hongKongTerrainHeight(site.x, site.z) - pad) < 1e-9);
  assert.ok(pad >= terrain.rawHongKongTerrainHeight(site.x, site.z) - 1e-9);
  assert.equal(world.groundHeightAt(site.x, site.z, pad - 4), pad);
  assert.equal(world.stats.hongKongStadiumGroundOffset, pad);
});

test('the stadium is wired into the unified world without disturbing other landmarks', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  assert.match(simple, /import \{ buildHongKongStadium \} from '\.\/hong-kong-stadium-world\.js';/);
  assert.match(simple, /const hongKongStadium = buildHongKongStadium\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.hongKongStadiumPadHeight \}\);/);
  assert.match(simple, /!groundUsesRoad \? hongKongStadium\.groundHeightAt\(x, z, stadiumGround\) : stadiumGround/);
  assert.match(simple, /\.\.\.hongKongStadium\.stats,/);
  assert.match(simple, /\.\.\.hongKongStadium\.colliders,/);
  assert.match(simple, /\.\.\.hongKongStadium\.landmarks,/);
  assert.match(simple, /\+ hongKongStadium\.landmarks\.length/);
  assert.match(simple, /\n    hongKongStadium,/);
  // The Mong Kok stadium added in the previous commit must still be present.
  assert.match(simple, /mongKokStadium\.groundHeightAt\(x, z, victoriaParkGround\)/);
});

test('the twin-roof design cites the tensile-roof record and public documentation', () => {
  const sources = architecture.HKS_RESEARCH_SOURCES;
  assert.ok(sources.length >= 3);
  assert.ok(sources.some((source) => /tensinet\.com/.test(source.url) && /tubular lattice arches/.test(source.evidence)));
  assert.ok(sources.some((source) => /wikipedia\.org/.test(source.url) && /40,000/.test(source.evidence)));
  assert.ok(architecture.HKS_COLOURS.membrane.every((value) => value > 0.88));
  assert.notDeepEqual(architecture.HKS_COLOURS.seatGreen, architecture.HKS_COLOURS.seatRed);
});
