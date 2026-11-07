const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.join(__dirname, '..');
let THREE, arenaArch, youthArch, arena, youth, terrain, fullMeta, ringUtils;

test.before(async () => {
  globalThis.document = { createElement: () => {
    const canvas = { width: 0, height: 0 };
    const context = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, {
      get: (target, key) => target[key] || (() => {}), set: (target, key, value) => { target[key] = value; return true; },
    });
    canvas.getContext = () => context; return canvas;
  } };
  arenaArch = await import('../js/cities/hongkong/kai-tak-arena-architecture.js');
  youthArch = await import('../js/cities/hongkong/kai-tak-youth-sports-ground-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  fullMeta = await import('../js/cities/hongkong/full-meta.js');
  ringUtils = await import('../js/cities/hongkong/landmark-site.js');
  THREE = await import('three/webgpu');
  const { buildKaiTakArena } = await import('../js/cities/hongkong/kai-tak-arena-world.js');
  const { buildKaiTakYouthSportsGround } = await import('../js/cities/hongkong/kai-tak-youth-sports-ground-world.js');
  arena = buildKaiTakArena(new THREE.Group(), { groundOffset: terrain.HONG_KONG_TERRAIN_META.kaiTakArenaPadHeight });
  youth = buildKaiTakYouthSportsGround(new THREE.Group(), { groundOffset: terrain.HONG_KONG_TERRAIN_META.kaiTakYouthPadHeight });
});

test('啟德體藝館 is built on its exact OSM sports_centre block', () => {
  const source = arenaArch.KAI_TAK_ARENA_OSM_SOURCE;
  assert.equal(source.id, 1339751141);
  assert.equal(source.tags.leisure, 'sports_centre');
  assert.equal(source.tags.name, 'Kai Tak Arena');
  assert.equal(source.geometry.length, 60);
  const site = arenaArch.KAI_TAK_ARENA_SITE;
  assert.equal(site.osmId, 1339751141);
  assert.ok(Math.abs(site.ringArea - 28705) < 60, `ring area ${site.ringArea}`);
  assert.equal(arena.stats.kaiTakArenaOsmWay, 1339751141);
  assert.equal(arena.stats.kaiTakArenaInventoryId, 'HK-B0105');
});

test('the arena keeps its documented capacity, hall and colour-field identity', () => {
  assert.equal(arena.stats.kaiTakArenaCapacity, 10000);
  assert.equal(arena.stats.kaiTakArenaSecondarySeats, 500);
  assert.equal(arena.stats.kaiTakArenaMainHallSquareMetres, 7066);
  assert.equal(arena.stats.kaiTakArenaCeilingHeight, 12.5);
  assert.equal(arena.stats.kaiTakArenaRetractableShare, 0.8);
  assert.equal(arena.stats.kaiTakArenaOpened, '2025-03-01');
  assert.equal(arenaArch.KAI_TAK_ARENA_SPORTS.length, 8);
  assert.match(arena.stats.kaiTakArenaSports, /badminton/);
  assert.match(arena.stats.kaiTakArenaSports, /table tennis/);
  assert.match(arena.stats.kaiTakArenaArchitects, /Populous/);
  assert.ok(arena.stats.kaiTakArenaFacadePanels > 150, `panels ${arena.stats.kaiTakArenaFacadePanels}`);
  const names = [];
  arena.group.traverse((object) => { if (object.name) names.push(object.name); });
  for (const name of [
    'KaiTakArenaColourFieldPanels', 'KaiTakArenaCharcoalBand', 'KaiTakArenaBandLetteringSouth',
    'KaiTakArenaGlazedBase', 'KaiTakArenaBaseMullions', 'KaiTakArenaFlatRoof', 'KaiTakArenaRoofMasts',
    'KaiTakArenaRoofAntennae', 'KaiTakArenaHallDrum', 'KaiTakArenaHallDrumPanels', 'KaiTakArenaGymnastStatue',
    'KaiTakArenaGymnastLimbs', 'KaiTakArenaPlazaPaving', 'KaiTakArenaPlanters',
  ]) assert.ok(names.includes(name), name);
  // The gold end really exists: the colour field mixes greens with gold and white strips.
  assert.equal(arenaArch.KAI_TAK_ARENA_COLOURS.gold.length, 3);
  assert.equal(arenaArch.KAI_TAK_ARENA_COLOURS.greens.length, 5);
  assert.ok(arenaArch.KAI_TAK_ARENA_COLOURS.band[0] < 0.2, 'charcoal band is dark');
});

test('啟德青年運動場 keeps its 5,000 seats, its track and the tunnel record', () => {
  assert.equal(youth.stats.kaiTakYouthSeats, 5000);
  assert.equal(youth.stats.kaiTakYouthOpened, '2025-03-01');
  assert.equal(youth.stats.kaiTakYouthPitchLength, 100);
  assert.equal(youth.stats.kaiTakYouthPitchWidth, 60);
  assert.equal(youth.stats.kaiTakYouthTrack, '400 m eight-lane running track');
  assert.equal(youth.stats.kaiTakYouthFloodlightMasts, 4);
  assert.equal(youth.stats.kaiTakYouthMastHeight, 32);
  assert.equal(youth.stats.kaiTakYouthTunnelBeneath, true);
  assert.match(youth.stats.kaiTakYouthTunnelNote, /啟德隧道/);
  assert.equal(youth.stats.kaiTakYouthInventoryId, 'HK-B0106');
  assert.equal(youthArch.KAI_TAK_YOUTH_SITE.osmId, 609099607);
  assert.ok(Math.abs(youthArch.KAI_TAK_YOUTH_SITE.ringArea - 34058) < 80, `area ${youthArch.KAI_TAK_YOUTH_SITE.ringArea}`);
  const names = [];
  youth.group.traverse((object) => { if (object.name) names.push(object.name); });
  for (const name of [
    'KaiTakYouthPitch', 'KaiTakYouthRunningTrack', 'KaiTakYouthTrackLaneLines', 'KaiTakYouthMainStandSeats',
    'KaiTakYouthMainStandStructure', 'KaiTakYouthMainStandCanopy', 'KaiTakYouthEastTerraceSeats',
    'KaiTakYouthFloodlightMasts', 'KaiTakYouthFloodlightHeads', 'KaiTakYouthPerimeterFence',
    'KaiTakYouthEntranceBuildings', 'KaiTakYouthConcoursePaving',
  ]) assert.ok(names.includes(name), name);
  assert.ok(youth.stats.kaiTakYouthLaneLines > 500, `lane lines ${youth.stats.kaiTakYouthLaneLines}`);
});

test('both new venues have finite geometry and sensible extents', () => {
  for (const [name, built, maxHeight] of [['arena', arena, 45], ['youth', youth, 45]]) {
    let nonFinite = 0, meshes = 0, maxY = -Infinity;
    built.group.traverse((object) => {
      if (!object.isMesh) return; meshes++;
      const position = object.geometry?.getAttribute('position');
      if (!position) return;
      for (let i = 1; i < position.array.length; i += 3) maxY = Math.max(maxY, position.array[i]);
      for (const value of position.array) if (!Number.isFinite(value)) nonFinite++;
    });
    assert.equal(nonFinite, 0, `${name} finite`);
    assert.ok(meshes > 8, `${name} meshes ${meshes}`);
    assert.ok(maxY < maxHeight, `${name} apex ${maxY}`);
  }
  for (const built of [arena, youth]) {
    for (const collider of built.colliders) {
      for (const key of ['x', 'z', 'w', 'd', 'minY', 'maxY', 'minX', 'maxX', 'minZ', 'maxZ']) {
        assert.ok(Number.isFinite(collider[key]), `${key} finite`);
      }
      assert.ok(collider.maxY > collider.minY);
    }
  }
});

test('the arena block is clear of every carriageway', () => {
  const site = arenaArch.KAI_TAK_ARENA_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  let inside = 0, conflicts = 0;
  for (let lz = -70; lz <= 70; lz += 2) {
    for (let lx = -140; lx <= 140; lx += 2) {
      if (!ringUtils.pointInFlatRing(site.localRing, lx, lz)) continue;
      inside++;
      const wx = site.x + cs * lx + sn * lz, wz = site.z - sn * lx + cs * lz;
      if (fullMeta.fullRoadSurfaceAt(wx, wz, 1.0, 0)) conflicts++;
    }
  }
  assert.ok(inside > 4000, `samples ${inside}`);
  assert.equal(conflicts, 0, `${conflicts} arena samples on a carriageway`);
});

test('the youth ground keeps its pitch, track and stands off the road network', () => {
  const site = youthArch.KAI_TAK_YOUTH_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  // The built facility (pitch, track, both stands, concourse around them) must sit on clear ground.
  // 啟德隧道 passes deep beneath the ground and the unnamed ways are the park's internal service lanes, so neither
  // can be counted as the ground standing on a public carriageway.
  const builtRoads = new Set();
  let built = 0, builtConflicts = 0;
  for (let lz = -72; lz <= 72; lz += 2) {
    for (let lx = -76; lx <= 76; lx += 2) {
      built++;
      const wx = site.x + cs * lx + sn * lz, wz = site.z - sn * lx + cs * lz;
      if (!fullMeta.fullRoadSurfaceAt(wx, wz, 1.0, 0)) continue;
      const named = (fullMeta.fullRoadWaysNear(wx, wz, 14) ?? []).filter((way) => way.name && way.name !== '啟德隧道');
      if (named.length) { builtConflicts++; for (const way of named) builtRoads.add(way.name); }
    }
  }
  assert.ok(built > 4000, `samples ${built}`);
  assert.equal(builtConflicts, 0, `${builtConflicts} built-facility samples under ${[...builtRoads].join(', ')}`);

  // Outside that, the surveyed ring is clipped only by the tunnel beneath it and by unnamed internal service ways —
  // never by a named public carriageway.
  const named = new Set();
  let inside = 0, overlaps = 0;
  for (let lz = -96; lz <= 96; lz += 3) {
    for (let lx = -114; lx <= 114; lx += 3) {
      if (!ringUtils.pointInFlatRing(site.localRing, lx, lz)) continue;
      inside++;
      const wx = site.x + cs * lx + sn * lz, wz = site.z - sn * lx + cs * lz;
      if (!fullMeta.fullRoadSurfaceAt(wx, wz, 1.0, 0)) continue;
      overlaps++;
      for (const way of fullMeta.fullRoadWaysNear(wx, wz, 14) ?? []) if (way.name) named.add(way.name);
    }
  }
  assert.ok(inside > 2000, `samples ${inside}`);
  assert.ok(overlaps > 0, 'checks the ring does meet the tunnel alignment');
  // 13/31廣場 is the former-runway plaza (a paved square, not a street) whose way is carried by the road network.
  const notStreets = new Set(['啟德隧道', '承啟道', '13/31廣場']);
  const publicRoads = [...named].filter((name) => !notStreets.has(name));
  assert.deepEqual(publicRoads, [], `named roads inside the block: ${publicRoads.join(', ')}`);
});

test('both venues are wired into the terrain chain and the unified world', () => {
  const meta = terrain.HONG_KONG_TERRAIN_META;
  for (const [key, site] of [['kaiTakArenaPadHeight', arenaArch.KAI_TAK_ARENA_SITE],
    ['kaiTakYouthPadHeight', youthArch.KAI_TAK_YOUTH_SITE]]) {
    const pad = meta[key];
    assert.ok(Number.isFinite(pad), key);
    assert.ok(Math.abs(terrain.hongKongTerrainHeight(site.x, site.z) - pad) < 1e-9, key);
  }
  assert.equal(arena.groundHeightAt(arenaArch.KAI_TAK_ARENA_SITE.x, arenaArch.KAI_TAK_ARENA_SITE.z, 0), meta.kaiTakArenaPadHeight);
  assert.equal(youth.groundHeightAt(youthArch.KAI_TAK_YOUTH_SITE.x, youthArch.KAI_TAK_YOUTH_SITE.z, 0), meta.kaiTakYouthPadHeight);

  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  assert.match(simple, /import \{ buildKaiTakArena \} from '\.\/kai-tak-arena-world\.js';/);
  assert.match(simple, /import \{ buildKaiTakYouthSportsGround \} from '\.\/kai-tak-youth-sports-ground-world\.js';/);
  assert.match(simple, /\.\.\.kaiTakArena\.stats,/);
  assert.match(simple, /\.\.\.kaiTakYouth\.stats,/);
  assert.match(simple, /\.\.\.kaiTakArena\.colliders,/);
  assert.match(simple, /\.\.\.kaiTakYouth\.colliders,/);
  assert.match(simple, /\.\.\.kaiTakArena\.landmarks,/);
  assert.match(simple, /\.\.\.kaiTakYouth\.landmarks,/);
  assert.match(simple, /\+ kaiTakArena\.landmarks\.length \+ kaiTakYouth\.landmarks\.length/);
  assert.match(simple, /!groundUsesRoad \? kaiTakArena\.groundHeightAt\(x, z, kaiTakStadiumGround\) : kaiTakStadiumGround/);
  // The racecourse sits between the Kai Tak venues and the airport in the chain: Sha Tin is sampled first, then
  // the airport takes that height as its fallback.
  assert.match(simple, /!groundUsesRoad \? shaTin\.groundHeightAt\(x, z, happyValleyGround\) : happyValleyGround/);
  assert.match(simple, /!groundUsesRoad \? airport\.groundHeightAt\(x, z, shaTinGround\) : shaTinGround/);
  assert.equal(arena.landmarks[0].id, 'kai-tak-arena');
  assert.equal(youth.landmarks[0].id, 'kai-tak-youth-sports-ground');
});

test('Kai Tak Arena rendered footprint follows its mapped world frame', () => {
  const site = arenaArch.KAI_TAK_ARENA_SITE;
  arena.group.updateMatrixWorld(true);
  assert.equal(arena.group.rotation.y, site.ry);
  for (let i = 0; i < site.localRing.length; i += 2) {
    const p = arena.group.localToWorld(new THREE.Vector3(site.localRing[i], 0, site.localRing[i+1]));
    assert.ok(Math.hypot(p.x-site.ring[i], p.z-site.ring[i+1]) < 1e-5);
  }
});
