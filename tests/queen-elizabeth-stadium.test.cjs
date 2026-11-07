const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.join(__dirname, '..');
let THREE, architecture, world, terrain, fullMeta, ringUtils;

test.before(async () => {
  globalThis.document = { createElement: () => {
    const canvas = { width: 0, height: 0 };
    const context = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, {
      get: (target, key) => target[key] || (() => {}), set: (target, key, value) => { target[key] = value; return true; },
    });
    canvas.getContext = () => context; return canvas;
  } };
  architecture = await import('../js/cities/hongkong/queen-elizabeth-stadium-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  fullMeta = await import('../js/cities/hongkong/full-meta.js');
  ringUtils = await import('../js/cities/hongkong/landmark-site.js');
  THREE = await import('three/webgpu');
  const { buildQueenElizabethStadium } = await import('../js/cities/hongkong/queen-elizabeth-stadium-world.js');
  world = buildQueenElizabethStadium(new THREE.Group(), {
    groundOffset: terrain.HONG_KONG_TERRAIN_META.queenElizabethStadiumPadHeight,
  });
});

test('伊利沙伯體育館 is built on the exact OSM sports_hall outline', () => {
  const source = architecture.QE_STADIUM_OSM_SOURCE;
  assert.equal(source.type, 'way');
  assert.equal(source.id, 260868015);
  assert.equal(source.version, 9);
  assert.equal(source.license, 'ODbL 1.0');
  assert.equal(source.tags.leisure, 'sports_hall');
  assert.equal(source.tags['addr:housenumber'], '18');
  assert.equal(source.tags['addr:street'], '愛群道 Oi Kwan Road');
  assert.equal(source.tags.wikidata, 'Q631386');
  assert.equal(source.geometry.length, 18);
  const site = architecture.QE_STADIUM_SITE;
  assert.equal(site.osmId, 260868015);
  assert.equal(site.key, 'queenElizabethStadium');
  assert.ok(Math.abs(site.ringArea - 2738.6) < 1, `ring area ${site.ringArea}`);
  assert.equal(world.stats.qeStadiumOsmWay, 260868015);
});

test('the modelled envelope follows the real stepped ring, not an invented rectangle', () => {
  const ring = architecture.QE_STADIUM_SITE.localRing;
  const xs = [], zs = [];
  for (let i = 0; i + 1 < ring.length; i += 2) { xs.push(ring[i]); zs.push(ring[i + 1]); }
  const maxX = Math.max(...xs), minX = Math.min(...xs);
  // The east side really is set back: a 4 m recess between lz -15.6 and +16.0.
  const recessPoints = [];
  for (let i = 0; i + 1 < ring.length; i += 2) if (ring[i] > 20 && ring[i] < 24) recessPoints.push(ring[i]);
  assert.ok(recessPoints.length >= 2, 'recess vertices exist');
  assert.ok(Math.abs(maxX - 26.3) < 0.4, `east face ${maxX}`);
  assert.ok(Math.abs(22.2 - Math.min(...recessPoints)) < 0.4);
  assert.ok(Math.abs((maxX - Math.min(...recessPoints)) - architecture.QE_STADIUM_MASSING.eastRecessDepth) < 0.2);
  // West side steps in at least three places and the south-west corner is chamfered.
  assert.ok(Math.abs(minX + 26.3) < 0.5, `west face ${minX}`);
  const westXs = new Set();
  for (let i = 0; i + 1 < ring.length; i += 2) if (ring[i] < -22) westXs.add(Math.round(ring[i] * 10) / 10);
  assert.ok(westXs.size >= 3, `west steps ${[...westXs]}`);
  assert.equal(world.stats.qeStadiumWallEdges, 17);
  assert.equal(world.stats.qeStadiumServiceBaySetback, 4);
});

test('the documented facts of the 1980 Urban Council hall are recorded', () => {
  assert.equal(world.stats.qeStadiumCapacity, 3500);
  assert.equal(world.stats.qeStadiumArenaFloorSquareMetres, 590);
  assert.equal(world.stats.qeStadiumOpened, '1980-08-27');
  assert.equal(world.stats.qeStadiumFoundationStone, '1977-12-21');
  assert.equal(world.stats.qeStadiumOpenedBy, 'Governor Sir Murray MacLehose');
  assert.equal(world.stats.qeStadiumBuilder, 'Urban Council');
  assert.equal(world.stats.qeStadiumManager, 'Leisure and Cultural Services Department');
  assert.equal(world.stats.qeStadiumInventoryId, 'HK-B0103');
  assert.equal(architecture.QE_STADIUM_RESEARCH_SOURCES.length, world.stats.qeStadiumResearchSources);
});

test('the identifying features are real meshes with finite geometry', () => {
  const names = [];
  world.group.traverse((object) => { if (object.name) names.push(object.name); });
  for (const name of [
    'QueenElizabethStadiumCurtainWallGlass', 'QueenElizabethStadiumCurtainWallMullions',
    'QueenElizabethStadiumCurtainWallTransoms', 'QueenElizabethStadiumEntranceDoors',
    'QueenElizabethStadiumEntranceCanopy', 'QueenElizabethStadiumCanopyLettering',
    'QueenElizabethStadiumCanopySoffitLights', 'QueenElizabethStadiumLobbyBehindGlass',
    'QueenElizabethStadiumWhiteFlutedRibs', 'QueenElizabethStadiumRenderedPiers',
    'QueenElizabethStadiumCornerPiers', 'QueenElizabethStadiumClerestoryFrames',
    'QueenElizabethStadiumParapetCap', 'QueenElizabethStadiumGranitePlinth',
    'QueenElizabethStadiumRoofDeck', 'QueenElizabethStadiumRoofPlantRoom',
    'QueenElizabethStadiumRoofLouvreScreens', 'QueenElizabethStadiumPunchedWindows',
    'QueenElizabethStadiumRollerShutters', 'QueenElizabethStadiumRampBalustrade',
    'QueenElizabethStadiumForecourtPaving', 'QueenElizabethStadiumFlagpoles',
    'QueenElizabethStadiumTreeCrowns',
  ]) assert.ok(names.includes(name), name);

  let nonFinite = 0, meshes = 0, triangles = 0;
  world.group.traverse((object) => {
    if (!object.isMesh) return; meshes++;
    const position = object.geometry?.getAttribute('position');
    if (!position) return;
    const index = object.geometry.getIndex();
    triangles += (index ? index.count : position.count) / 3;
    for (const value of position.array) if (!Number.isFinite(value)) nonFinite++;
  });
  assert.equal(nonFinite, 0);
  assert.ok(meshes > 20, `meshes ${meshes}`);
  assert.ok(triangles > 4000, `triangles ${triangles}`);
  // 12 flutes on every long elevation, 33 glazing bays at the photographed 1.45 m mullion pitch.
  assert.equal(world.stats.qeStadiumRibCount, 12);
  assert.equal(world.stats.qeStadiumRibPitch, 1.35);
  assert.ok(world.stats.qeStadiumGlassBays >= 30, `bays ${world.stats.qeStadiumGlassBays}`);
  assert.equal(world.stats.qeStadiumServiceShutters, 3);
});

test('the hall and its footway stay off every retained carriageway', () => {
  const site = architecture.QE_STADIUM_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const toWorld = (lx, lz) => ({ x: site.x + cs * lx + sn * lz, z: site.z - sn * lx + cs * lz });
  let inside = 0, insideConflicts = 0;
  for (let lz = -29; lz <= 29; lz += 1.5) {
    for (let lx = -27; lx <= 27; lx += 1.5) {
      if (!ringUtils.pointInFlatRing(site.localRing, lx, lz)) continue;
      inside++;
      const p = toWorld(lx, lz);
      if (fullMeta.fullRoadSurfaceAt(p.x, p.z, 1.0, 0)) insideConflicts++;
    }
  }
  assert.ok(inside > 500, `samples ${inside}`);
  assert.equal(insideConflicts, 0, `${insideConflicts} hall samples sit on a retained road`);
  // The Oi Kwan Road kerb, footway, planters and trees must stay on the pavement side of the carriageway.
  let footwayConflicts = 0;
  for (let lx = -26; lx <= 26; lx += 0.5) {
    for (let lz = 29.0; lz <= 30.4; lz += 0.2) {
      const p = toWorld(lx, lz);
      if (fullMeta.fullRoadSurfaceAt(p.x, p.z, 1.0, 0)) footwayConflicts++;
    }
  }
  assert.equal(footwayConflicts, 0, `${footwayConflicts} frontage samples sit on a carriageway`);
  assert.equal(fullMeta.fullRoadSurfaceAt(site.x, site.z, 1.0, 0), null);
});

test('one reproducible DTM datum feeds terrain, ground height and colliders', () => {
  const pad = terrain.HONG_KONG_TERRAIN_META.queenElizabethStadiumPadHeight;
  const site = architecture.QE_STADIUM_SITE;
  assert.ok(Number.isFinite(pad));
  assert.ok(Math.abs(terrain.hongKongTerrainHeight(site.x, site.z) - pad) < 1e-9);
  assert.ok(pad >= terrain.rawHongKongTerrainHeight(site.x, site.z) - 1e-9);
  assert.equal(world.groundHeightAt(site.x, site.z, pad - 6), pad);
  assert.equal(world.stats.qeStadiumGroundOffset, pad);
  assert.equal(world.colliders.length, world.stats.qeStadiumColliders);
  for (const collider of world.colliders) {
    for (const key of ['x', 'z', 'w', 'd', 'minY', 'maxY', 'minX', 'maxX', 'minZ', 'maxZ']) {
      assert.ok(Number.isFinite(collider[key]), `${key} finite`);
    }
    assert.ok(collider.maxY > collider.minY);
    assert.ok(collider.maxY <= pad + architecture.QE_STADIUM_MASSING.plantHeight + 0.5);
  }
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  assert.match(simple, /!groundUsesRoad \? queenElizabethStadium\.groundHeightAt\(x, z, laiYuenGround\) : laiYuenGround/);
  const terrainSource = fs.readFileSync(path.join(root, 'js/cities/hongkong/terrain.js'), 'utf8');
  assert.match(terrainSource, /queenElizabethStadiumPadHeight/);
  assert.match(terrainSource, /queenElizabethStadiumTerrainHeightAt\(x, z, laiYuenHeight/);
});

test('伊利沙伯體育館 is wired into the unified Hong Kong world', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  assert.match(simple, /import \{ buildQueenElizabethStadium \} from '\.\/queen-elizabeth-stadium-world\.js';/);
  assert.match(simple, /const queenElizabethStadium = buildQueenElizabethStadium\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.queenElizabethStadiumPadHeight \}\);/);
  assert.match(simple, /\.\.\.queenElizabethStadium\.stats,/);
  assert.match(simple, /\.\.\.queenElizabethStadium\.colliders,/);
  assert.match(simple, /\.\.\.queenElizabethStadium\.landmarks,/);
  assert.match(simple, /\+ queenElizabethStadium\.landmarks\.length/);
  assert.equal(world.landmarks.length, 1);
  assert.equal(world.landmarks[0].id, 'queen-elizabeth-stadium');
  assert.ok(Math.abs(world.landmarks[0].height - 33) < 0.5);
});
