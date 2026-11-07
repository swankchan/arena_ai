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
  architecture = await import('../js/cities/hongkong/kai-tak-stadium-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  fullMeta = await import('../js/cities/hongkong/full-meta.js');
  ringUtils = await import('../js/cities/hongkong/landmark-site.js');
  THREE = await import('three/webgpu');
  const { buildKaiTakStadium } = await import('../js/cities/hongkong/kai-tak-stadium-world.js');
  world = buildKaiTakStadium(new THREE.Group(), {
    groundOffset: terrain.HONG_KONG_TERRAIN_META.kaiTakStadiumPadHeight,
  });
});

test('啟德主場館 is built on the exact OSM stadium oval', () => {
  const source = architecture.KAI_TAK_STADIUM_OSM_SOURCE;
  assert.equal(source.id, 609099609);
  assert.equal(source.version, 21);
  assert.equal(source.license, 'ODbL 1.0');
  assert.equal(source.tags.leisure, 'stadium');
  assert.equal(source.tags['addr:street'], '承啟道 Shing Kai Road');
  assert.equal(source.tags['addr:housenumber'], '39');
  assert.equal(source.tags.wikidata, 'Q134593792');
  // The OSM tags themselves record the movable roof, the architects, the engineer and the builder.
  assert.equal(source.tags.weather_protection, 'movable');
  assert.match(source.tags.architect, /Populous/);
  assert.match(source.tags.architect, /Simon Kwan/);
  assert.match(source.tags.engineer, /Arup/);
  assert.match(source.tags.builder, /Hip Hing/);
  assert.equal(source.tags.operator, 'ASM Global');
  assert.equal(source.geometry.length, 71);
  const site = architecture.KAI_TAK_STADIUM_SITE;
  assert.equal(site.osmId, 609099609);
  assert.ok(Math.abs(site.ringArea - 76163.6) < 5, `ring area ${site.ringArea}`);
  assert.ok(Math.abs(site.w - 226) < 1 && Math.abs(site.d - 281) < 1, `${site.w} x ${site.d}`);
  assert.equal(world.stats.kaiTakStadiumOsmWay, 609099609);
});

test('the documented facts and the ten OSM gates are recorded', () => {
  assert.equal(world.stats.kaiTakStadiumCapacity, 50000);
  assert.equal(world.stats.kaiTakStadiumHeight, 55);
  assert.equal(world.stats.kaiTakStadiumWidth, 270);
  assert.equal(world.stats.kaiTakStadiumFacadePanels, 27000);
  assert.equal(world.stats.kaiTakStadiumRoofTonnes, 4800);
  assert.equal(world.stats.kaiTakStadiumRoofTrussSpan, '150-180 m');
  assert.equal(world.stats.kaiTakStadiumTowerCores, 4);
  assert.equal(world.stats.kaiTakStadiumTowerCoresModelled, 4);
  assert.equal(world.stats.kaiTakStadiumSkyboxes, 57);
  assert.equal(world.stats.kaiTakStadiumOpened, '2025-03-01');
  assert.equal(world.stats.kaiTakStadiumConstructionStart, '2019-04-23');
  assert.equal(world.stats.kaiTakStadiumParkHectares, 28);
  assert.match(world.stats.kaiTakStadiumFacadeCoating, /Fluropon Kameleon/);
  assert.equal(world.stats.kaiTakStadiumGates, 10);
  assert.deepEqual(architecture.KAI_TAK_STADIUM_GATES.map((gate) => gate.ref).join(''), 'ABCDEFGHJK');
  assert.equal(world.stats.kaiTakStadiumInventoryId, 'HK-B0104');
  assert.equal(architecture.KAI_TAK_STADIUM_RESEARCH_SOURCES.length, world.stats.kaiTakStadiumResearchSources);
});

test('the pearl skin, the harbour mouth and the roof seam are real geometry', () => {
  const names = [];
  world.group.traverse((object) => { if (object.name) names.push(object.name); });
  for (const name of [
    'KaiTakStadiumPearlFacets', 'KaiTakStadiumPearlBacking', 'KaiTakStadiumHarbourMouthGlass',
    'KaiTakStadiumGlazedSkirt', 'KaiTakStadiumSkirtGlass', 'KaiTakStadiumSkirtMullions',
    'KaiTakStadiumSkirtFascia', 'KaiTakStadiumGranitePlinth', 'KaiTakStadiumRoofGutters',
    'KaiTakStadiumRoofTrackRails', 'KaiTakStadiumRoofTrusses', 'KaiTakStadiumPitch',
    'KaiTakStadiumSeatTiers', 'KaiTakStadiumConcourseEdges', 'KaiTakStadiumTowerCores',
    'KaiTakStadiumPodiumPaving', 'KaiTakStadiumPodiumKerbs', 'KaiTakStadiumGateCanopies',
    'KaiTakStadiumGateColumns', 'KaiTakStadiumGatePortals', 'KaiTakStadiumGateDoors',
    'KaiTakStadiumGateSignA', 'KaiTakStadiumGateSignK',
  ]) assert.ok(names.includes(name), name);

  let nonFinite = 0, meshes = 0, triangles = 0, maxY = -Infinity;
  world.group.traverse((object) => {
    if (!object.isMesh) return; meshes++;
    const position = object.geometry?.getAttribute('position');
    if (!position) return;
    const index = object.geometry.getIndex();
    triangles += (index ? index.count : position.count) / 3;
    for (let i = 1; i < position.array.length; i += 3) maxY = Math.max(maxY, position.array[i]);
    for (const value of position.array) if (!Number.isFinite(value)) nonFinite++;
  });
  assert.equal(nonFinite, 0);
  assert.ok(meshes > 25, `meshes ${meshes}`);
  assert.ok(world.stats.kaiTakStadiumModelledFacets > 9000, `facets ${world.stats.kaiTakStadiumModelledFacets}`);
  // The skin tops out at the documented 55 m above the podium, not at some arbitrary height.
  assert.ok(Math.abs(maxY - 55) < 1.0, `apex ${maxY}`);
  // Both openings really remove pearl panels: the mouth is a lens, the roof seam a crown slot.
  assert.ok(world.stats.kaiTakStadiumFacetsInMouth > 60);
  assert.ok(world.stats.kaiTakStadiumFacetsInRoofSeam >= 30, `seam ${world.stats.kaiTakStadiumFacetsInRoofSeam}`);
});

test('the stadium never spills onto the roads or outside its OSM oval', () => {
  const site = architecture.KAI_TAK_STADIUM_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  let inside = 0, conflicts = 0;
  for (let lz = -141; lz <= 141; lz += 3) {
    for (let lx = -113; lx <= 113; lx += 3) {
      if (!ringUtils.pointInFlatRing(site.localRing, lx, lz)) continue;
      inside++;
      const wx = site.x + cs * lx + sn * lz, wz = site.z - sn * lx + cs * lz;
      if (fullMeta.fullRoadSurfaceAt(wx, wz, 1.0, 0)) conflicts++;
    }
  }
  assert.ok(inside > 4000, `samples ${inside}`);
  assert.equal(conflicts, 0, `${conflicts} stadium samples sit on a retained road`);
  // The shell must stay inside the surveyed oval: nothing wider than the ring's own semi-axes.
  // The shell semi-axis, the podium apron and its kerb all stay inside the surveyed oval.
  const shellMax = architecture.KAI_TAK_STADIUM_MASSING.halfX - 1.2 + 0.6;
  const ringMaxX = Math.max(...site.localRing.filter((_, index) => index % 2 === 0).map(Math.abs));
  assert.ok(shellMax <= ringMaxX, `shell ${shellMax} vs ring ${ringMaxX}`);
  assert.equal(fullMeta.fullRoadSurfaceAt(site.x, site.z, 1.0, 0), null);
});

test('one reproducible DTM datum feeds terrain, ground height and colliders', () => {
  const pad = terrain.HONG_KONG_TERRAIN_META.kaiTakStadiumPadHeight;
  const site = architecture.KAI_TAK_STADIUM_SITE;
  assert.ok(Number.isFinite(pad));
  assert.ok(Math.abs(terrain.hongKongTerrainHeight(site.x, site.z) - pad) < 1e-9);
  assert.ok(pad >= terrain.rawHongKongTerrainHeight(site.x, site.z) - 1e-9);
  assert.equal(world.groundHeightAt(site.x, site.z, pad - 4), pad);
  assert.equal(world.stats.kaiTakStadiumGroundOffset, pad);
  assert.equal(world.colliders.length, world.stats.kaiTakStadiumColliders);
  for (const collider of world.colliders) {
    for (const key of ['x', 'z', 'w', 'd', 'minY', 'maxY', 'minX', 'maxX', 'minZ', 'maxZ']) {
      assert.ok(Number.isFinite(collider[key]), `${key} finite`);
    }
    assert.ok(collider.maxY > collider.minY);
    assert.ok(collider.maxY <= pad + 56);
  }
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  assert.match(simple, /!groundUsesRoad \? kaiTakStadium\.groundHeightAt\(x, z, qeStadiumGround\) : qeStadiumGround/);
  const terrainSource = fs.readFileSync(path.join(root, 'js/cities/hongkong/terrain.js'), 'utf8');
  assert.match(terrainSource, /kaiTakStadiumPadHeight/);
  assert.match(terrainSource, /kaiTakStadiumTerrainHeightAt\(x, z, qeStadiumHeight/);
});

test('啟德主場館 is wired into the unified Hong Kong world', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  assert.match(simple, /import \{ buildKaiTakStadium \} from '\.\/kai-tak-stadium-world\.js';/);
  assert.match(simple, /const kaiTakStadium = buildKaiTakStadium\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.kaiTakStadiumPadHeight \}\);/);
  assert.match(simple, /\.\.\.kaiTakStadium\.stats,/);
  assert.match(simple, /\.\.\.kaiTakStadium\.colliders,/);
  assert.match(simple, /\.\.\.kaiTakStadium\.landmarks,/);
  assert.match(simple, /\+ kaiTakStadium\.landmarks\.length/);
  assert.equal(world.landmarks.length, 1);
  assert.equal(world.landmarks[0].id, 'kai-tak-stadium');
  assert.match(world.landmarks[0].name, /東方之珠/);
  assert.equal(world.landmarks[0].height, 55);
});
