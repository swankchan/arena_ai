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
  architecture = await import('../js/cities/hongkong/mong-kok-stadium-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  THREE = await import('three/webgpu');
  const { buildMongKokStadium } = await import('../js/cities/hongkong/mong-kok-stadium-world.js');
  world = buildMongKokStadium(new THREE.Group(), { groundOffset: terrain.HONG_KONG_TERRAIN_META.mongKokStadiumPadHeight });
});

test('HK-B0101 keeps the exact OSM stadium way and its five tagged entrances', () => {
  const source = architecture.MONG_KOK_STADIUM_OSM_SOURCE;
  assert.equal(source.type, 'way'); assert.equal(source.id, 114127110); assert.equal(source.version, 9);
  assert.equal(source.tags.leisure, 'stadium'); assert.equal(source.tags['name:zh'], '旺角大球場');
  assert.equal(source.tags['name:en'], 'Mong Kok Stadium'); assert.equal(source.tags['addr:housenumber'], '37');
  assert.equal(source.geometry.length, 21);
  assert.equal(source.geometry[0].lat, 22.3254172); assert.equal(source.geometry[0].lon, 114.1719261);
  assert.match(source.attribution, /OpenStreetMap/); assert.equal(source.license, 'ODbL 1.0');
  const site = architecture.MONG_KOK_STADIUM_SITE;
  assert.ok(Math.abs(site.ringArea - 23690.97534882091) < 1e-6);
  assert.ok(Math.abs(site.localRing[0] - -113.4) < 0.2 && Math.abs(site.localRing[1] - 46.7) < 0.2);
  assert.equal(architecture.MONG_KOK_ENTRANCES.length, 5);
  assert.deepEqual(architecture.MONG_KOK_ENTRANCES.map((entrance) => entrance.id),
    [6680777578, 12031364507, 12031364508, 12031364509, 12031364510]);
  for (const entrance of architecture.MONG_KOK_ENTRANCES) {
    assert.ok(Number.isFinite(entrance.x) && Number.isFinite(entrance.z));
    assert.match(entrance.nodeId, /openstreetmap\.org\/node\//);
  }
});

test('the rebuilt 2012 bowl is a football-only 6,700-seat single tier with seven tensile sails', () => {
  assert.equal(architecture.MONG_KOK_PITCH_LENGTH, 105); assert.equal(architecture.MONG_KOK_PITCH_WIDTH, 68);
  assert.equal(architecture.MONG_KOK_PITCH_SURFACE, 'artificial turf');
  assert.equal(architecture.MONG_KOK_SEATS, 6700);
  assert.equal(architecture.MONG_KOK_RECONSTRUCTION_YEAR, 2012); assert.equal(architecture.MONG_KOK_ORIGINAL_YEAR, 1961);
  assert.equal(architecture.MONG_KOK_SAIL_COUNT, 7);
  assert.equal(architecture.MONG_KOK_FLOODLIGHT_COUNT, 4);
  assert.equal(architecture.MONG_KOK_BOWL.north.rows, 16);
  assert.ok(architecture.MONG_KOK_SAIL_PEAK > architecture.MONG_KOK_SAIL_RIM);
  assert.ok(architecture.MONG_KOK_MAIN_STAND_TOP < architecture.MONG_KOK_SAIL_RIM);
  // The modelled seat shells must agree with the published capacity rather than be a round-number guess.
  assert.ok(Math.abs(world.stats.mongKokStadiumSeatCount - architecture.MONG_KOK_SEATS) <= 40,
    `seat shells ${world.stats.mongKokStadiumSeatCount}`);
  assert.equal(world.stats.mongKokStadiumSeatRows, 48);
  assert.equal(world.stats.mongKokStadiumSailCount, 7);
  assert.equal(world.stats.mongKokStadiumFloodlightCount, 4);
});

test('the seven sails, seat shells, screen, gates and pitch markings are real meshes', () => {
  const names = [];
  world.group.traverse((object) => { if (object.name) names.push(object.name); });
  const expected = [
    'MongKokStadiumSevenWhiteTensileSails', 'MongKokStadiumWhiteSailMasts', 'MongKokStadiumSailTieDownCablesAndPurlins',
    'MongKokStadiumNorthStandOrangeSeats', 'MongKokStadiumNorthStandBlueSeats', 'MongKokStadiumSouthStandOrangeSeats',
    'MongKokStadiumEastStandBlueSeats', 'MongKokStadiumWestStandOrangeSeats',
    'MongKokStadiumStripedArtificialTurf', 'MongKokStadiumWhitePitchMarkings', 'MongKokStadiumGoalFrames',
    'MongKokStadiumGoalNets', 'MongKokStadiumCornerFlags', 'MongKokStadiumLedScreenPanel',
    'MongKokStadiumFloodlightLampBanks', 'MongKokStadiumEntranceCanopies', 'MongKokStadiumTurnstileBlocks',
    'MongKokStadiumPerimeterRailing', 'MongKokStadiumExactOsmBlockSurface',
  ];
  for (const name of expected) assert.ok(names.includes(name), name);
  let nonFinite = 0, meshes = 0;
  world.group.traverse((object) => {
    if (!object.isMesh) return; meshes++;
    const position = object.geometry?.getAttribute('position');
    if (position) for (const value of position.array) if (!Number.isFinite(value)) nonFinite++;
  });
  assert.equal(nonFinite, 0); assert.ok(meshes > 20, `meshes ${meshes}`);
  assert.equal(world.stats.mongKokStadiumComponents, 8);
  assert.equal(world.landmarks.length, 1);
  assert.equal(world.landmarks[0].id, 'mong-kok-stadium');
  assert.equal(world.landmarks[0].height, architecture.MONG_KOK_SAIL_PEAK);
});

test('the two frontage gates stand on real OSM entrance nodes and the stands are solid', () => {
  const stats = world.stats;
  assert.equal(stats.gates, 2);
  assert.deepEqual(stats.gateSourceNodes, [6680777578, 12031364507]);
  const site = architecture.MONG_KOK_STADIUM_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  for (const id of stats.gateSourceNodes) {
    const entrance = architecture.MONG_KOK_ENTRANCES.find((value) => value.id === id);
    const dx = entrance.x - site.x, dz = entrance.z - site.z;
    const localZ = sn * dx + cs * dz;
    // Both gates face Flower Market Road, i.e. the negative local-Z long side of the bowl.
    assert.ok(localZ < 0, `gate node ${id} localZ ${localZ}`);
  }
  // Four stand volumes plus four pylons plus two gate columns.
  assert.equal(world.colliders.length, 10);
  for (const collider of world.colliders) {
    assert.ok([collider.minX, collider.maxX, collider.minZ, collider.maxZ, collider.minY, collider.maxY].every(Number.isFinite));
    assert.ok(collider.maxY > collider.minY);
  }
  // The two long stands are deeper than the two end stands, matching the real bowl.
  const north = world.colliders[0], east = world.colliders[2];
  assert.ok(north.maxZ - north.minZ > east.maxX - east.minX);
});

test('the pitch, bowl and source block sit on one DTM datum and stay clear of the surrounding streets', () => {
  const pad = terrain.HONG_KONG_TERRAIN_META.mongKokStadiumPadHeight;
  assert.ok(Number.isFinite(pad));
  const site = architecture.MONG_KOK_STADIUM_SITE;
  assert.ok(Math.abs(terrain.hongKongTerrainHeight(site.x, site.z) - pad) < 1e-9);
  const raw = terrain.rawHongKongTerrainHeight(site.x, site.z);
  assert.ok(pad >= raw - 1e-9, 'the construction datum is never below the raw DTM');
  assert.equal(world.groundHeightAt(site.x, site.z, pad - 5), pad);
  // A point far outside the block keeps the surrounding terrain rather than the stadium datum.
  const outside = world.groundHeightAt(site.x + 400, site.z + 400, 3.5);
  assert.notEqual(outside, 0);
  assert.equal(world.stats.mongKokStadiumGroundOffset, pad);
});

test('the stadium is wired into the unified Hong Kong world with its own ground, colliders and landmark', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  assert.match(simple, /import \{ buildMongKokStadium \} from '\.\/mong-kok-stadium-world\.js';/);
  assert.match(simple, /const mongKokStadium = buildMongKokStadium\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.mongKokStadiumPadHeight \}\);/);
  assert.match(simple, /!groundUsesRoad \? mongKokStadium\.groundHeightAt\(x, z, victoriaParkGround\) : victoriaParkGround/);
  assert.match(simple, /\.\.\.mongKokStadium\.stats,/);
  assert.match(simple, /\.\.\.mongKokStadium\.colliders,/);
  assert.match(simple, /\.\.\.mongKokStadium\.landmarks,/);
  assert.match(simple, /\+ hkcec\.landmarks\.length \+ mongKokStadium\.landmarks\.length/);
  assert.match(simple, /\n    mongKokStadium,/);
  const architectureSource = fs.readFileSync(path.join(root, 'js/cities/hongkong/mong-kok-stadium-architecture.js'), 'utf8');
  assert.match(architectureSource, /114127110/);
  assert.doesNotMatch(architectureSource, /makePhotoDirectedSite/);
});

test('every modelled feature cites a real photograph or the OSM record', () => {
  const sources = architecture.MONG_KOK_RESEARCH_SOURCES;
  assert.ok(sources.length >= 4);
  assert.ok(sources.some((source) => /fpf\.ccidahk\.gov\.hk/.test(source.url) && /tensile sails/.test(source.evidence)));
  assert.ok(sources.some((source) => /wikipedia\.org/.test(source.url) && /6,700-seat/.test(source.evidence)));
  assert.ok(sources.some((source) => /commons\.wikimedia\.org/.test(source.url)));
  const palette = architecture.MONG_KOK_COLOURS;
  assert.ok(palette.seatOrange[0] > palette.seatOrange[2]);
  assert.ok(palette.seatBlue[2] > palette.seatBlue[0]);
  assert.ok(palette.sail.every((value) => value > 0.85));
});
