const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let cl, terrain, roads, lamps, clearance, siteUtils;
test.before(async () => {
  cl = await import('../js/cities/hongkong/central-library-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  siteUtils = await import('../js/cities/hongkong/landmark-site.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
});
function inside(ring, x, z) { return siteUtils.pointInFlatRing(ring, x, z); }
function pointSegment(x, z, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz, t = l ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l)) : 0; return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); }
function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function intersects(a, b, c, d) { const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1], denominator = cross(rx, rz, sx, sz); if (Math.abs(denominator) < 1e-9) return false; const qx = c[0] - a[0], qz = c[1] - a[1], t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator; return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9; }
function segmentDistance(a, b, c, d) { return intersects(a, b, c, d) ? 0 : Math.min(pointSegment(...a, c, d), pointSegment(...b, c, d), pointSegment(...c, a, b), pointSegment(...d, a, b)); }
function roadScan(site) {
  const centre = new Set(), corridor = new Set(), b = site.bounds;
  for (const [id, road] of roads.entries()) {
    const flat = road[5], margin = road[1] * .5 + .35;
    for (let i = 2; i < flat.length; i += 2) {
      const a = [flat[i - 2], flat[i - 1]], c = [flat[i], flat[i + 1]];
      if (Math.max(a[0], c[0]) < b.minX - margin || Math.min(a[0], c[0]) > b.maxX + margin || Math.max(a[1], c[1]) < b.minZ - margin || Math.min(a[1], c[1]) > b.maxZ + margin) continue;
      let hit = inside(site.ring, ...a) || inside(site.ring, ...c), distance = hit ? 0 : Infinity;
      for (let j = 2; j < site.ring.length; j += 2) {
        const d = [site.ring[j - 2], site.ring[j - 1]], e = [site.ring[j], site.ring[j + 1]];
        if (intersects(a, c, d, e)) hit = true;
        distance = Math.min(distance, segmentDistance(a, c, d, e));
      }
      if (hit) centre.add(id);
      if (distance < margin) corridor.add(id);
    }
  }
  return { centre: [...centre], corridor: [...corridor] };
}
function clearedLampPositions() {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed), result = [];
  for (let index = 0; index < lamps.length; index++) {
    if (suppressed.has(index)) continue;
    const lamp = lamps[index], override = overrides.get(index);
    result.push({ index, x: lamp[0] + (override?.[1] || 0) / 100, z: lamp[1] + (override?.[2] || 0) / 100 });
  }
  return result;
}

test('Central Library preserves the complete current OSM building and outer-site rings', () => {
  assert.equal(cl.CENTRAL_LIBRARY_BUILDING_SITE.osmId, 856995407);
  assert.equal(cl.CENTRAL_LIBRARY_SITE.osmId, 856995408);
  assert.equal(cl.CENTRAL_LIBRARY_BUILDING_SITE.source.version, 5);
  assert.equal(cl.CENTRAL_LIBRARY_SITE.source.version, 5);
  assert.equal(cl.CENTRAL_LIBRARY_BUILDING_SITE.source.tags.building, 'civic');
  assert.equal(cl.CENTRAL_LIBRARY_BUILDING_SITE.source.tags['building:levels'], '11');
  assert.equal(cl.CENTRAL_LIBRARY_BUILDING_SITE.ring.length / 2 - 1, 10);
  assert.equal(cl.CENTRAL_LIBRARY_SITE.ring.length / 2 - 1, 9);
  assert.ok(cl.CENTRAL_LIBRARY_BUILDING_SITE.source.geometry.some((p) => p.id === 12304843892));
  assert.ok(Math.abs(cl.CENTRAL_LIBRARY_BUILDING_SITE.ringArea - 5724.673746519256) < .0001);
  assert.ok(Math.abs(cl.CENTRAL_LIBRARY_SITE.ringArea - 8140.451107973844) < .0001);
  assert.deepEqual([...cl.CENTRAL_LIBRARY_MAIN_FACADE_EDGES], [7, 8]);
  assert.ok(Math.abs(cl.CENTRAL_LIBRARY_MAIN_FACADE_LENGTH - 70.31571550824631) < .001);
});

test('official library facts, OSM levels and photo-directed dimensions stay separate', () => {
  assert.equal(cl.CENTRAL_LIBRARY_OPENING_YEAR, 2001);
  assert.equal(cl.CENTRAL_LIBRARY_OFFICIAL_STOREYS, 12);
  assert.equal(cl.CENTRAL_LIBRARY_OSM_LEVELS, 11);
  assert.equal(cl.CENTRAL_LIBRARY_OFFICIAL_SITE_AREA, 9400);
  assert.equal(cl.CENTRAL_LIBRARY_OFFICIAL_GROSS_FLOOR_AREA, 33800);
  assert.equal(cl.CENTRAL_LIBRARY_HEIGHT, 58.8);
  assert.equal(cl.CENTRAL_LIBRARY_PODIUM_HEIGHT, 8.4);
  assert.equal(cl.CENTRAL_LIBRARY_FLOOR_HEIGHT, 4.35);
  assert.ok(cl.CENTRAL_LIBRARY_RESEARCH_SOURCES.some((s) => /building\.hk/.test(s.url) && /yellow GRC/.test(s.evidence) && /Ionic columns/.test(s.evidence)));
  assert.ok(cl.CENTRAL_LIBRARY_RESEARCH_SOURCES.some((s) => /Window of Hope/.test(s.evidence) && /seventh-floor/.test(s.evidence)));
  assert.match(cl.CENTRAL_LIBRARY_MAIN_ENTRANCE.evidence, /no OSM entrance node is claimed/);
  assert.match(cl.CENTRAL_LIBRARY_BUILDING_SITE.evidence, /visual height is separately photo-directed/);
});

test('building, arrival and fountain stay clear of roads while the outer site retains its road audit', () => {
  assert.deepEqual(roadScan(cl.CENTRAL_LIBRARY_BUILDING_SITE), { centre: [], corridor: [] });
  assert.deepEqual(roadScan(cl.CENTRAL_LIBRARY_ARRIVAL_SITE), { centre: [], corridor: [] });
  assert.deepEqual(roadScan(cl.CENTRAL_LIBRARY_FOUNTAIN_SITE), { centre: [], corridor: [] });
  assert.deepEqual(roadScan(cl.CENTRAL_LIBRARY_SITE).centre, [45333]);
  assert.deepEqual(cl.CENTRAL_LIBRARY_SITE_ROAD_IDS, [45333]);
  assert.equal(cl.centralLibraryRoadRecords(cl.CENTRAL_LIBRARY_SITE).length, 1);
});

test('Central Library ground is DTM-derived, road-priority and local', () => {
  const pad = terrain.centralLibraryPadHeight();
  assert.ok(Number.isFinite(pad));
  assert.equal(terrain.HONG_KONG_TERRAIN_META.centralLibraryPadHeight, pad);
  assert.equal(terrain.hongKongTerrainHeight(cl.CENTRAL_LIBRARY_BUILDING_SITE.x, cl.CENTRAL_LIBRARY_BUILDING_SITE.z), pad);
  const road = roads[45333][5], x = road[0], z = road[1];
  if (inside(cl.CENTRAL_LIBRARY_SITE.ring, x, z)) assert.equal(cl.centralLibraryTerrainHeightAt(x, z, 0, pad), 0);
  const outsideX = cl.CENTRAL_LIBRARY_SITE.x + 260, outsideZ = cl.CENTRAL_LIBRARY_SITE.z + 180;
  assert.equal(terrain.hongKongTerrainHeight(outsideX, outsideZ), terrain.rawHongKongTerrainHeight(outsideX, outsideZ));
});

test('photo-directed forecourt, source-site reservation and cleared lamps do not collide', () => {
  assert.equal(cl.CENTRAL_LIBRARY_ARRIVAL_SITE.ringArea, 270);
  assert.ok(Math.abs(cl.CENTRAL_LIBRARY_FOUNTAIN_SITE.ringArea - Math.PI * 5.2 ** 2) < 1);
  assert.match(cl.CENTRAL_LIBRARY_ARRIVAL_SITE.evidence, /Photo-directed/);
  assert.match(cl.CENTRAL_LIBRARY_FOUNTAIN_SITE.evidence, /not a fabricated OSM footprint/);
  assert.ok(cl.centralLibraryGenericLotConflict({ x: cl.CENTRAL_LIBRARY_BUILDING_SITE.x, z: cl.CENTRAL_LIBRARY_BUILDING_SITE.z, w: 8, d: 8, ry: 0 }));
  assert.ok(!cl.centralLibraryGenericLotConflict({ x: cl.CENTRAL_LIBRARY_SITE.x + 500, z: cl.CENTRAL_LIBRARY_SITE.z, w: 8, d: 8, ry: 0 }));
  for (const lamp of clearedLampPositions()) assert.equal(cl.centralLibraryLampConflictAt(lamp.x, lamp.z), false, `lamp ${lamp.index}`);
});

test('Central Library world authors GRC, Gate to Knowledge, Hope window, stairs and globe without photo textures', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/central-library-world.js'), 'utf8');
  for (const pattern of [/yellow GRC/, /Gate to Knowledge six Ionic/, /triangular pediment/, /seventh-floor solid/, /Window of Hope/, /double entrance stairs/, /rotating globe/, /bilingual GRC entrance sign/, /CENTRAL_LIBRARY_MAIN_ENTRANCE/]) assert.match(world, pattern);
  assert.doesNotMatch(world, /image-search|\.jpg|\.png|TextureLoader|https?:\/\//i);
});

test('Central Library is integrated into ground, scene, legacy suppression, map, debug reference, clearance and docs', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  const legacy = fs.readFileSync(path.join(root, 'js/cities/hongkong/world.js'), 'utf8');
  const map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  const clearanceBuilder = fs.readFileSync(path.join(root, 'tools/cities/hongkong/build-street-light-clearance.mjs'), 'utf8');
  const inventory = fs.readFileSync(path.join(root, 'docs/hongkong-building-inventory.md'), 'utf8');
  const landmarks = fs.readFileSync(path.join(root, 'docs/hongkong-landmarks.md'), 'utf8');
  assert.match(simple, /buildCentralLibrary\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.centralLibraryPadHeight \}\)/);
  assert.match(simple, /centralLibrary\.groundHeightAt/); assert.match(simple, /\.\.\.centralLibrary\.stats/); assert.match(simple, /\.\.\.centralLibrary\.colliders/);
  assert.match(legacy, /centralLibraryGenericLotConflict/); assert.match(map, /centralLibraryMapSite/); assert.match(map, /CENTRAL_LIBRARY_SITE\.ring/);
  assert.match(index, /centralLibrary: world\.centralLibrary/); assert.match(clearanceBuilder, /centralLibraryLampConflictAt/);
  assert.match(inventory, /`HK-CENTRAL-LIBRARY`/); assert.match(landmarks, /香港中央圖書館 Hong Kong Central Library `HK-CENTRAL-LIBRARY`/);
});

test('Node Central Library geometry is finite and actual-base colliders leave the main door open', async () => {
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, fillText() {}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }) }) };
  const THREE = await import('three/webgpu');
  const { buildCentralLibrary } = await import('../js/cities/hongkong/central-library-world.js');
  const { colliderContains } = await import('../js/cities/hongkong/colliders.js');
  const scene = new THREE.Scene(), world = buildCentralLibrary(scene, { groundOffset: 5 });
  let meshes = 0, nonFinite = 0;
  scene.traverse((object) => {
    if (!object.isMesh) return;
    meshes++;
    const positions = object.geometry.getAttribute('position');
    if (positions) for (const value of positions.array) if (!Number.isFinite(value)) nonFinite++;
  });
  assert.equal(nonFinite, 0); assert.ok(meshes >= 35); assert.equal(world.stats.centralLibraryNonFinite, 0);
  assert.equal(world.stats.centralLibraryBuildingRoadCrossings, 0); assert.equal(world.landmarks.length, 1);
  assert.ok(world.colliders.length >= 14); assert.equal(Math.min(...world.colliders.map((c) => c.minY)), 5);
  assert.equal(Math.max(...world.colliders.map((c) => c.maxY)), 5 + cl.CENTRAL_LIBRARY_HEIGHT);
  const occupied = (x, z) => world.colliders.some((c) => c.minY <= 6.5 && c.maxY >= 6.5 && colliderContains(c, x, z));
  const site = cl.CENTRAL_LIBRARY_BUILDING_SITE, count = site.ring.length / 2 - 1;
  const sampleDoor = (index, direction, distance) => {
    const i = index * 2, j = (direction === 'previous' ? (index - 1 + count) % count : (index + 1) % count) * 2;
    const dx = site.ring[j] - site.ring[i], dz = site.ring[j + 1] - site.ring[i + 1], length = Math.hypot(dx, dz);
    return [site.ring[i] + dx / length * distance, site.ring[i + 1] + dz / length * distance];
  };
  // The 12 m door is centred on the shared source vertex of edges 7 and 8.
  for (const direction of ['previous', 'next']) assert.equal(occupied(...sampleDoor(8, direction, 5.5)), false);
  assert.equal(occupied(cl.CENTRAL_LIBRARY_MAIN_ENTRANCE.x, cl.CENTRAL_LIBRARY_MAIN_ENTRANCE.z), false);
});
