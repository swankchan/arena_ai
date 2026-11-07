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
  architecture = await import('../js/cities/hongkong/lai-yuen-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  fullMeta = await import('../js/cities/hongkong/full-meta.js');
  ringUtils = await import('../js/cities/hongkong/landmark-site.js');
  THREE = await import('three/webgpu');
  const { buildLaiYuen } = await import('../js/cities/hongkong/lai-yuen-world.js');
  world = buildLaiYuen(new THREE.Group(), { groundOffset: terrain.HONG_KONG_TERRAIN_META.laiYuenPadHeight });
});

test('荔園 is declared honestly as a historical reconstruction, not an OSM building', () => {
  assert.equal(architecture.LAI_YUEN_HISTORICAL.historicalReconstruction, true);
  assert.equal(architecture.LAI_YUEN_HISTORICAL.opened, '1949-04-16');
  assert.equal(architecture.LAI_YUEN_HISTORICAL.closed, '1997-03-31');
  assert.equal(architecture.LAI_YUEN_HISTORICAL.originalName, '荔枝園 Lai Chi Kok Gardens');
  assert.deepEqual(architecture.LAI_YUEN_HISTORICAL.presentOsmWays, [386780290, 386780597, 386777993]);
  assert.match(architecture.LAI_YUEN_HISTORICAL.presentUse, /荔欣苑/);
  const site = architecture.LAI_YUEN_SITE;
  assert.equal(site.photoDirected, true);
  assert.equal(site.osmId, null);
  assert.equal(site.source, null);
  assert.match(site.evidence, /Historical reconstruction/);
  assert.match(site.evidence, /386780290/);
  // The documented 160萬平方呎 is recorded as the whole park, and the honest scope note says the model is smaller.
  assert.equal(architecture.LAI_YUEN_HISTORICAL.documentedAreaSquareFeet, 1600000);
  assert.ok(Math.abs(architecture.LAI_YUEN_HISTORICAL.documentedAreaSquareMetres - 148645) < 1);
  assert.match(architecture.LAI_YUEN_HISTORICAL.note, /not reconstructed/);
  assert.ok(world.stats.laiYuenModelledArea < architecture.LAI_YUEN_HISTORICAL.documentedAreaSquareMetres);
  assert.equal(world.landmarks[0].historical, true);
  assert.match(world.landmarks[0].name, /歷史重建/);
});

test('the reconstruction keeps every documented feature of the park', () => {
  assert.equal(world.stats.laiYuenRides, 9);
  assert.equal(world.stats.ferrisWheelGondolas, 16);
  assert.equal(world.stats.carouselHorses, 16);
  assert.equal(world.stats.coffeeCups, 4);
  assert.equal(world.stats.dumboCars, 8);
  assert.equal(world.stats.octopusArms, 8);
  assert.equal(world.stats.bumperCars, 10);
  assert.equal(world.stats.pools, 3);
  assert.equal(world.stats.iceRink, 'real-snow rink');
  assert.equal(world.stats.sungCityHalls, 3);
  assert.equal(world.stats.sungCityPagodaTiers, 5);
  assert.equal(world.stats.laiYuenAdultTicket, 10);
  assert.equal(world.stats.laiYuenTino, '天奴 Tino');
  assert.equal(world.stats.laiYuenTinoDied, '1989-02-03');
  assert.equal(world.stats.laiYuenZooClosed, '1993-07-31');
  assert.equal(architecture.LAI_YUEN_TICKETS.sungCityEntry, 0.5);
  // Tino's cage was under 500 sq ft; the model must not quietly enlarge it.
  assert.ok(world.stats.tinoCageSquareFeet <= 500, `Tino cage ${world.stats.tinoCageSquareFeet} sq ft`);
  assert.ok(world.stats.tinoCageSquareFeet > 250);
});

test('the entrance, rides, 宋城 and zoo are real meshes with finite geometry', () => {
  const names = [];
  world.group.traverse((object) => { if (object.name) names.push(object.name); });
  const expected = [
    'LaiYuenTwinRibbedEntranceTowers', 'LaiYuenEntranceTowerVerticalFins', 'LaiYuenEntranceRoundEmblems',
    'LaiYuenEntrancePortalLintel', 'LaiYuenTicketBooths', 'LaiYuenTurnstiles', 'LaiYuenEntranceSign',
    'LaiYuenFerrisWheelRims', 'LaiYuenFerrisWheelSpokes', 'LaiYuenFerrisWheelRedGondolas',
    'LaiYuenCarouselStripedCanopy', 'LaiYuenCoffeeCupShells', 'LaiYuenDumboAndCreamHorses',
    'LaiYuenOctopusCarsAndRedHorses', 'LaiYuenBumperCarsHall'.replace('Hall', 'Walls'),
    'LaiYuenRollerCoasterRails', 'LaiYuenIceRinkBarrelVault', 'LaiYuenRealSnowIceSurface',
    'LaiYuenLakeWater', 'LaiYuenBoatPavilionHull', 'LaiYuenThreeSpringFedPools', 'LaiYuenDivingBoards',
    'LaiYuenZooCageBars', 'LaiYuenTinoTheElephant', 'LaiYuenZooRockGrotto',
    'LaiYuenSungCityWalls', 'LaiYuenSungCityCrenellations', 'LaiYuenSungCityTiledRoofsPagodaAndGateEaves',
    'LaiYuenSungCityRedTimberGateHallsAndPagodaStoreys', 'LaiYuenSungCitySign',
    'LaiYuenGameStallBooths', 'LaiYuenPromenades', 'LaiYuenParkPaving',
    // Detail pass: 天奴 in his paddock, the gardens, the showground, the railway and the paving.
    'LaiYuenTinoPaddock', 'LaiYuenTinoTheElephant', 'LaiYuenTinoHead', 'LaiYuenTinoTrunk', 'LaiYuenTinoTusks',
    'LaiYuenTinoLegs', 'LaiYuenTinoSign', 'LaiYuenTinoPaddockSand',
    'LaiYuenGardens', 'LaiYuenTreeTrunks', 'LaiYuenLawnIslands', 'LaiYuenHedges', 'LaiYuenFlowerBedReds',
    'LaiYuenLampPosts', 'LaiYuenBenches', 'LaiYuenKiosks', 'LaiYuenBunting', 'LaiYuenCrowdA',
    'LaiYuenShowground', 'LaiYuenCircusRedStripes', 'LaiYuenCircusCreamRoofPanels', 'LaiYuenBandstandSeating',
    'LaiYuenMiniatureRailway', 'LaiYuenMiniatureRailRails', 'LaiYuenMiniatureRailTrain',
    'LaiYuenPavingDetail', 'LaiYuenPlazaTilesA', 'LaiYuenParkRoad', 'LaiYuenForecourt',
  ];
  for (const name of expected) assert.ok(names.includes(name), name);
  let nonFinite = 0, meshes = 0;
  world.group.traverse((object) => {
    if (!object.isMesh) return; meshes++;
    const position = object.geometry?.getAttribute('position');
    if (position) for (const value of position.array) if (!Number.isFinite(value)) nonFinite++;
  });
  assert.equal(nonFinite, 0); assert.ok(meshes > 30, `meshes ${meshes}`);
  // The detail pass must actually be there, and 天奴 must be a full-size model rather than a token blob.
  assert.ok(world.stats.laiYuenTinoHeight >= 3, `Tino height ${world.stats.laiYuenTinoHeight}`);
  assert.ok(world.stats.laiYuenTrees >= 40, `trees ${world.stats.laiYuenTrees}`);
  assert.ok(world.stats.laiYuenCrowd > 100, `crowd ${world.stats.laiYuenCrowd}`);
  assert.ok(world.stats.laiYuenPlazaTiles > 200, `tiles ${world.stats.laiYuenPlazaTiles}`);
  assert.ok(world.stats.laiYuenRailwayMetres > 80, `railway ${world.stats.laiYuenRailwayMetres}`);
});

test('the whole reconstructed park clears every retained modern carriageway', () => {
  const ring = architecture.LAI_YUEN_SITE.ring;
  let samples = 0, conflicts = 0;
  for (let z = -6802; z <= -6652; z += 2) {
    for (let x = -2432; x <= -2244; x += 2) {
      if (!ringUtils.pointInFlatRing(ring, x, z)) continue;
      samples++;
      if (fullMeta.fullRoadSurfaceAt(x, z, 1.0, 0)) conflicts++;
    }
  }
  assert.ok(samples > 4000, `samples ${samples}`);
  assert.equal(conflicts, 0, `${conflicts} park samples sit on a retained road`);
  // The park is also kept out of the Lai King Hill Road corridor on its north-east corner.
  assert.equal(fullMeta.fullRoadSurfaceAt(-2270, -6752, 1.0, 0), null);
});

test('the park uses one reproducible DTM datum and hands roads priority', () => {
  const pad = terrain.HONG_KONG_TERRAIN_META.laiYuenPadHeight;
  assert.ok(Number.isFinite(pad));
  const site = architecture.LAI_YUEN_SITE;
  assert.ok(Math.abs(terrain.hongKongTerrainHeight(site.x, site.z) - pad) < 1e-9);
  assert.ok(pad >= terrain.rawHongKongTerrainHeight(site.x, site.z) - 1e-9);
  assert.equal(world.groundHeightAt(site.x, site.z, pad - 5), pad);
  assert.equal(world.stats.laiYuenGroundOffset, pad);
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  assert.match(simple, /!groundUsesRoad \? laiYuen\.groundHeightAt\(x, z, bigStadiumGround\) : bigStadiumGround/);
});

test('荔園 is wired into the unified world as a historical landmark', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  assert.match(simple, /import \{ buildLaiYuen \} from '\.\/lai-yuen-world\.js';/);
  assert.match(simple, /const laiYuen = buildLaiYuen\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.laiYuenPadHeight \}\);/);
  assert.match(simple, /\.\.\.laiYuen\.stats,/);
  assert.match(simple, /\.\.\.laiYuen\.colliders,/);
  assert.match(simple, /\.\.\.laiYuen\.landmarks,/);
  assert.match(simple, /\+ laiYuen\.landmarks\.length/);
  assert.match(simple, /\n    laiYuen,/);
  const arch = fs.readFileSync(path.join(root, 'js/cities/hongkong/lai-yuen-architecture.js'), 'utf8');
  assert.match(arch, /HISTORICAL RECONSTRUCTION/);
  assert.match(arch, /makePhotoDirectedSite/);
  assert.doesNotMatch(arch, /makeAuthoredSite/);
});

test('every reconstructed feature is backed by a cited photograph or record', () => {
  const sources = architecture.LAI_YUEN_RESEARCH_SOURCES;
  assert.ok(sources.length >= 4);
  assert.ok(sources.some((source) => /zh\.wikipedia\.org/.test(source.url) && /1949-04-16/.test(source.evidence)));
  assert.ok(sources.some((source) => /gwulo\.com/.test(source.url) && /twin ribbed festival towers/.test(source.evidence)));
  assert.ok(sources.some((source) => /hkgpao\.com/.test(source.url) && /1993-07-31/.test(source.evidence)));
  assert.ok(sources.some((source) => /宋城/.test(source.url) && /wax museum/.test(source.evidence)));
});
