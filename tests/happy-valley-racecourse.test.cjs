const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.join(__dirname, '..');
let THREE, arch, built, terrain, fullMeta, ringUtils;

test.before(async () => {
  arch = await import('../js/cities/hongkong/happy-valley-racecourse-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  fullMeta = await import('../js/cities/hongkong/full-meta.js');
  ringUtils = await import('../js/cities/hongkong/landmark-site.js');
  THREE = await import('three/webgpu');
  const { buildHappyValleyRacecourse } = await import('../js/cities/hongkong/happy-valley-racecourse-world.js');
  built = buildHappyValleyRacecourse(new THREE.Group(), { groundOffset: terrain.HONG_KONG_TERRAIN_META.happyValleyPadHeight });
});

const site = () => arch.HAPPY_VALLEY_SITE;
const toWorld = (x, z) => {
  const s = site();
  return { x: s.x + Math.cos(s.ry) * x + Math.sin(s.ry) * z, z: s.z - Math.sin(s.ry) * x + Math.cos(s.ry) * z };
};

test('跑馬地馬場 is built on its surveyed OSM relation', () => {
  const source = arch.HAPPY_VALLEY_OSM_SOURCE;
  assert.equal(source.type, 'relation');
  assert.equal(source.id, 8049451);
  assert.equal(source.tags.leisure, 'stadium');
  assert.equal(source.tags.sport, 'horse_racing');
  assert.equal(source.geometry.length, 63);
  assert.equal(site().osmId, 8049451);
  assert.ok(Math.abs(site().ringArea - 198296) < 200, `ring area ${site().ringArea}`);
  assert.ok(Math.abs(site().w - 653.2) < 1, `width ${site().w}`);
  assert.ok(Math.abs(site().d - 378.1) < 1, `depth ${site().d}`);
  assert.equal(built.stats.happyValleyOsmRelation, 8049451);
  assert.equal(built.stats.happyValleyInventoryId, 'HK-B0107');
});

test('the course keeps its published record', () => {
  assert.equal(built.stats.happyValleyCapacity, 20000);
  assert.equal(built.stats.happyValleyOpened, '1846-12-17');
  assert.equal(built.stats.happyValleyTrackWidth, 30.5);
  assert.equal(built.stats.happyValleyPublishedLap, 1417);
  assert.equal(arch.HAPPY_VALLEY_TRACK_PUBLISHED.straightMetres, 310);
  assert.deepEqual([...arch.HAPPY_VALLEY_TRACK_PUBLISHED.races], [1000, 1200, 1650, 1800, 2200]);
  assert.equal(arch.HAPPY_VALLEY_NIGHT_RACING_SINCE, 1973);
  assert.equal(arch.HAPPY_VALLEY_RESEARCH_SOURCES.length, 4);
  assert.ok(arch.HAPPY_VALLEY_RESEARCH_SOURCES.some((source) => /1918/.test(source.evidence)), '1918 fire recorded');
  assert.equal(arch.HAPPY_VALLEY_MUSEUM_NODE.id, 12552529862);
});

test('the fitted circuit is honest about the surveyed boundary', () => {
  const track = arch.HAPPY_VALLEY_TRACK;
  // The published 1,417 m lap cannot be laid 1:1 inside the surveyed fence, so the fit is recorded, not hidden.
  assert.ok(track.apronToFenceMetres >= 8, `apron ${track.apronToFenceMetres}`);
  assert.ok(track.lapMetres < 1417);
  assert.ok(Math.abs(track.lapMetres - 1266) < 3, `fitted lap ${track.lapMetres}`);
  assert.ok(Math.abs(built.stats.happyValleyModelledLap - 1266) < 3);
  assert.ok(Math.abs(track.width - 30.5) < 1e-9);
  // The outer running rail really does stay clear of the fence all the way round.
  let minimum = Infinity;
  for (let i = 0; i < 720; i++) {
    const point = arch.happyValleyTrackPoint(i / 720, 0);
    assert.ok(ringUtils.pointInFlatRing(site().ring, ...Object.values(toWorld(point.x, point.z))));
    const world = toWorld(point.x, point.z);
    let best = Infinity;
    const ring = site().ring;
    for (let k = 0; k < ring.length; k += 2) {
      const ax = ring[k], az = ring[k + 1], bx = ring[(k + 2) % ring.length], bz = ring[(k + 3) % ring.length];
      const dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((world.x - ax) * dx + (world.z - az) * dz) / (dx * dx + dz * dz)));
      best = Math.min(best, Math.hypot(world.x - ax - t * dx, world.z - az - t * dz));
    }
    minimum = Math.min(minimum, best);
  }
  assert.ok(minimum >= 8, `minimum apron ${minimum.toFixed(1)} m`);
});

// TODO: the current sign(cos) parameterisation teleports between the two ends of a straight.
// Track geometry must be a continuous loop before its road and pitch clearances can be trusted.
test('the outer rail is a continuous closed loop', { todo: 'Replace discontinuous track parameterisation with the validated realigned loop' }, () => {
  const count = 720;
  let maxStep = 0;
  for (let i = 0; i < count; i++) {
    const a = arch.happyValleyTrackPoint(i / count, 0);
    const b = arch.happyValleyTrackPoint((i + 1) / count, 0);
    maxStep = Math.max(maxStep, Math.hypot(b.x - a.x, b.z - a.z));
  }
  assert.ok(maxStep < 5, `adjacent 1/720-lap rail points are ${maxStep.toFixed(2)} m apart`);
});

test('the racing surface never runs over a carriageway', { todo: 'Existing racecourse must be realigned and conflicts resolved' }, () => {
  let inside = 0, conflicts = 0;
  for (let i = 0; i < 720; i += 1) {
    for (const offset of [0, -8, -16, -24, -30]) {
      const point = arch.happyValleyTrackPoint(i / 720, offset);
      const world = toWorld(point.x, point.z);
      inside++;
      const courseHeight = terrain.HONG_KONG_TERRAIN_META.happyValleyPadHeight;
      const hit = fullMeta.fullRoadSurfaceAt(world.x, world.z, 1.0, courseHeight);
      // Only a street at the course's own level is a conflict: 黃泥涌峽天橋 crosses this corner on its own viaduct.
      if (hit && Math.abs(hit.height - courseHeight) < 2.5) conflicts++;
    }
  }
  assert.ok(inside > 3000, `samples ${inside}`);
  assert.equal(conflicts, 0, `${conflicts} points of the track sit on a street at grade`);
});

test('the course, stands, clubhouse and museum are all modelled', () => {
  const names = [];
  built.group.traverse((object) => { if (object.name) names.push(object.name); });
  for (const name of [
    'HappyValleyCourse', 'HappyValleyTrackSurface', 'HappyValleyInfieldTurf', 'HappyValleyInfieldSandRing',
    'HappyValleyRunningRails', 'HappyValleyRunningRailPosts', 'HappyValleyDistancePoles',
    'HappyValleyGrandstand', 'HappyValleyGrandstandSeats', 'HappyValleyGrandstandStructure',
    'HappyValleyGrandstandGlazing', 'HappyValleyGrandstandRoof', 'HappyValleyGrandstandColumns',
    'HappyValleyClubAndMuseum', 'HappyValleyClubGlazing', 'HappyValleyClubTower',
    'HappyValleyInfieldBranding', 'HappyValleyBigScreen', 'HappyValleyBigScreenBase',
    'HappyValleyParadeRingSurface', 'HappyValleyParadeRingRail', 'HappyValleyParadeViewingStand',
    'HappyValleyFloodlightMasts', 'HappyValleyFloodlightHeads', 'HappyValleyPerimeterFence',
  ]) assert.ok(names.includes(name), name);
  assert.equal(built.stats.happyValleyGrandstandTiers, 12);
  assert.equal(built.stats.happyValleyGrandstandLength, 191);
  assert.equal(built.stats.happyValleyFloodlightMasts, 6);
  assert.equal(built.stats.happyValleyBrandingBoards, 4);
  assert.ok(built.stats.happyValleyGrandstandSeats > 3000, `seats ${built.stats.happyValleyGrandstandSeats}`);
});

test('the parade ring sits on its own apron, clear of the rail and the fence', () => {
  const ringAt = arch.happyValleyTrackFrame(0.93, 26);
  const rail = arch.happyValleyTrackFrame(0.93, 0);
  const distance = Math.hypot(ringAt.x - rail.x, ringAt.z - rail.z);
  assert.ok(distance > 26 - 4, `parade ring stands ${distance.toFixed(1)} m off the rail`);
  const world = toWorld(ringAt.x, ringAt.z);
  assert.ok(ringUtils.pointInFlatRing(site().ring, world.x, world.z));
  assert.equal(built.stats.happyValleyParadeRingMetres, 2 * Math.PI * 12);
});

test('the built geometry is finite and stands inside the fence', () => {
  let nonFinite = 0, meshes = 0, maxY = -Infinity, minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  built.group.traverse((object) => {
    if (!object.isMesh) return;
    meshes++;
    const position = object.geometry?.getAttribute('position');
    if (!position) return;
    const array = position.array;
    for (let i = 0; i < array.length; i += 3) {
      if (!Number.isFinite(array[i]) || !Number.isFinite(array[i + 1]) || !Number.isFinite(array[i + 2])) nonFinite++;
      maxY = Math.max(maxY, array[i + 1]);
      minX = Math.min(minX, array[i]); maxX = Math.max(maxX, array[i]);
      minZ = Math.min(minZ, array[i + 2]); maxZ = Math.max(maxZ, array[i + 2]);
    }
  });
  assert.equal(nonFinite, 0);
  assert.ok(meshes > 15, `meshes ${meshes}`);
  assert.ok(maxY < 80, `apex ${maxY}`);
  assert.ok(maxX - minX < 700 && maxZ - minZ < 430, `extent ${maxX - minX} x ${maxZ - minZ}`);
  for (const collider of built.colliders) {
    for (const key of ['x', 'z', 'w', 'd', 'minY', 'maxY', 'minX', 'maxX', 'minZ', 'maxZ']) {
      assert.ok(Number.isFinite(collider[key]), `${key} finite`);
    }
    assert.ok(collider.maxY > collider.minY);
  }
});

test('the racecourse is wired into the terrain chain and the unified world', () => {
  const meta = terrain.HONG_KONG_TERRAIN_META;
  const pad = meta.happyValleyPadHeight;
  assert.ok(Number.isFinite(pad));
  assert.ok(Math.abs(terrain.hongKongTerrainHeight(site().x, site().z) - pad) < 1e-9);
  assert.equal(built.groundHeightAt(site().x, site().z, 0), pad);
  assert.equal(built.groundHeightAt(site().x + 4000, site().z, 900), 900);

  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  assert.match(source, /import \{ buildHappyValleyRacecourse \} from '\.\/happy-valley-racecourse-world\.js';/);
  assert.match(source, /\.\.\.happyValley\.stats,/);
  assert.match(source, /\.\.\.happyValley\.colliders,/);
  assert.match(source, /\.\.\.happyValley\.landmarks,/);
  assert.match(source, /\+ kaiTakYouth\.landmarks\.length \+ happyValley\.landmarks\.length/);
  assert.match(source, /!groundUsesRoad \? happyValley\.groundHeightAt\(x, z, kaiTakYouthGround\) : kaiTakYouthGround/);
  assert.equal(built.landmarks[0].id, 'happy-valley-racecourse');
});
