const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let hysan, terrain, elevation, roads, lamps, clearance;
test.before(async () => {
  hysan = await import('../js/cities/hongkong/hysan-place-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  elevation = await import('../js/cities/hongkong/road-elevation.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
});
function inside(ring, x, z) { let value = false; for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) { const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) value = !value; } return value; }
function area(ring) { let value = 0; for (let i = 0; i + 3 < ring.length; i += 2) value += ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1]; return value * .5; }
function pointSegmentDistance(x, z, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], lengthSq = dx * dx + dz * dz, t = lengthSq ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / lengthSq)) : 0; return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); }
function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function segmentsIntersect(a, b, c, d) { const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1], denominator = cross(rx, rz, sx, sz), qx = c[0] - a[0], qz = c[1] - a[1]; if (Math.abs(denominator) < 1e-9) return false; const t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator; return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9; }
function segmentDistance(a, b, c, d) { if (segmentsIntersect(a, b, c, d)) return 0; return Math.min(pointSegmentDistance(...a, c, d), pointSegmentDistance(...b, c, d), pointSegmentDistance(...c, a, b), pointSegmentDistance(...d, a, b)); }
function bounds(ring) { const xs = ring.filter((_, index) => index % 2 === 0), zs = ring.filter((_, index) => index % 2 === 1); return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) }; }
function roadConflicts(ring) { const result = [], box = bounds(ring); for (const [recordIndex, road] of roads.entries()) { const [name, width, , , flags, flat] = road; for (let i = 2; i + 1 < flat.length; i += 2) { const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]], margin = width * .5 + 1; if (Math.max(a[0], b[0]) < box.minX - margin || Math.min(a[0], b[0]) > box.maxX + margin || Math.max(a[1], b[1]) < box.minZ - margin || Math.min(a[1], b[1]) > box.maxZ + margin) continue; let conflict = inside(ring, ...a) || inside(ring, ...b); for (let j = 0; j < ring.length - 2 && !conflict; j += 2) conflict = segmentDistance(a, b, [ring[j], ring[j + 1]], [ring[j + 2], ring[j + 3]]) < width * .5 - 1e-6; if (conflict) result.push({ recordIndex, name, width, flags, segment: i / 2 - 1, a, b }); } } return result; }
function insideOrBoundary(ring, x, z) { if (inside(ring, x, z)) return true; for (let i = 0; i + 3 < ring.length; i += 2) if (pointSegmentDistance(x, z, [ring[i], ring[i + 1]], [ring[i + 2], ring[i + 3]]) < 1e-7) return true; return false; }

test('Hysan Place preserves the exact 27-node commercial building and its source tags', () => {
  const source = hysan.HYSAN_OSM_SOURCE;
  const raw = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/hysan-place-osm-full.json'), 'utf8'));
  const rawWay = raw.elements.find((element) => element.type === 'way' && element.id === 755914808);
  const rawNodes = new Map(raw.elements.filter((element) => element.type === 'node').map((element) => [element.id, element]));
  assert.equal(rawWay.version, 4); assert.equal(rawWay.timestamp, source.sourceTimestamp);
  assert.deepEqual(rawWay.nodes, source.geometry.map((point) => point.id));
  for (const point of source.geometry) { assert.equal(rawNodes.get(point.id).lon, point.lon); assert.equal(rawNodes.get(point.id).lat, point.lat); }
  assert.equal(source.id, 755914808); assert.equal(source.version, 4); assert.equal(source.geometry.length, 28);
  assert.equal(new Set(source.geometry.slice(0, -1).map((p) => p.id)).size, 27);
  assert.equal(source.tags.building, 'commercial'); assert.equal(source.tags.mall, 'yes');
  assert.equal(source.tags['building:levels'], '38'); assert.equal(source.tags['building:levels:underground'], '4');
  assert.equal(source.tags.height, '197'); assert.equal(source.tags['addr:housenumber'], '500');
  assert.equal(hysan.HYSAN_LOCAL_RING.length, 56);
  assert.ok(Math.abs(Math.abs(area(hysan.HYSAN_LOCAL_RING)) - 3853.043734533363) < 1e-8);
  assert.ok(Math.abs(hysan.HYSAN_SITE.area - 5355.810254189192) < 1e-8);
  assert.ok(Math.abs(hysan.HYSAN_SITE.w - 80.4656692931535) < 1e-9);
  assert.ok(Math.abs(hysan.HYSAN_SITE.d - 66.56019021822635) < 1e-9);
  for (const g of source.geometry) { const x = (g.lon - 114.1596) * 103056.81753522092, z = -(g.lat - 22.2819) * 110734.09626824585, p = hysan.hysanWorldToLocal(x, z), q = hysan.hysanLocalToWorld(p.x, p.z); assert.ok(Math.hypot(q.x - x, q.z - z) < 1e-9); }
});
test('Hysan Place keeps OSM, CTBUH, KPF and project-team conventions separate', () => {
  assert.equal(hysan.HYSAN_OSM_HEIGHT, 197); assert.equal(hysan.HYSAN_CTBUH_HEIGHT, 204.1);
  assert.equal(hysan.HYSAN_HEIGHT, 204.1); assert.equal(hysan.HYSAN_TO_TIP_HEIGHT, 204.1);
  assert.equal(hysan.HYSAN_OCCUPIED_HEIGHT, 190.1); assert.equal(hysan.HYSAN_OSM_LEVELS, 38);
  assert.equal(hysan.HYSAN_CTBUH_LEVELS, 36); assert.equal(hysan.HYSAN_BELOW_GROUND_LEVELS, 4);
  assert.equal(hysan.HYSAN_COMPLETION_YEAR, 2012); assert.equal(hysan.HYSAN_CTBUH_GFA, 66511);
  assert.equal(hysan.HYSAN_KPF_GFA, 66600); assert.equal(hysan.HYSAN_ARCHITECT, 'Kohn Pedersen Fox Associates');
  assert.match(hysan.HYSAN_ASSOCIATE_ARCHITECT, /Dennis Lau/); assert.equal(hysan.HYSAN_RETAIL_INTERIOR_ARCHITECT, 'Benoy');
  assert.equal(hysan.HYSAN_CONTRACTOR, 'Gammon Construction Limited');
});
test('Hysan Place has five shifted volumes, three real garden intervals and 36 visual courses', () => {
  assert.equal(hysan.HYSAN_VOLUMES.length, 5); assert.equal(hysan.HYSAN_VISUAL_COURSES, 36);
  assert.deepEqual(hysan.HYSAN_VOLUMES.map((v) => v.courses), [3, 4, 8, 10, 10]);
  assert.deepEqual(hysan.HYSAN_GARDEN_OF_EDEN, { bottom: 19.2, top: 24, sourceLevel: '4/F' });
  assert.deepEqual(hysan.HYSAN_RETAIL_SKY_GARDEN, { bottom: 42, top: 54 });
  assert.deepEqual(hysan.HYSAN_OFFICE_SKY_GARDEN, { bottom: 136, top: 148 });
  assert.equal(hysan.HYSAN_UPPER_OFFICE.y1, 190.1); assert.equal(hysan.HYSAN_HEIGHT, 204.1);
  for (const volume of hysan.HYSAN_VOLUMES) {
    assert.equal(volume.ring.length, 56); assert.ok(volume.y1 > volume.y0);
    for (let i = 0; i < volume.ring.length - 2; i += 2) { const p = hysan.hysanLocalToWorld(volume.ring[i], volume.ring[i + 1]); assert.ok(insideOrBoundary(hysan.HYSAN_SITE.ring, p.x, p.z), `${volume.id} vertex ${i / 2} escapes its building site`); }
    assert.equal(hysan.hysanRingColliders(volume.ring, volume.y0, volume.y1).length, 27);
  }
});
test('Hysan Place uses real entrance nodes and does not mistake the F2 subway node for a mall door', () => {
  assert.equal(hysan.HYSAN_MAIN_ENTRANCE.nodeId, 7060156467); assert.equal(hysan.HYSAN_MAIN_ENTRANCE.sourceEdge, 25);
  assert.equal(hysan.HYSAN_WEST_ENTRANCE.nodeId, 7060156468); assert.equal(hysan.HYSAN_SOUTH_ENTRANCE.nodeId, 7060156469);
  assert.equal(hysan.HYSAN_PARKING_ENTRANCE.nodeId, 1966250272); assert.equal(hysan.HYSAN_F2_SUBWAY_SOURCE.id, 7060182527);
  assert.equal(hysan.HYSAN_F2_SUBWAY_SOURCE.tags.door, 'no'); assert.equal(hysan.HYSAN_F2_SUBWAY_SOURCE.tags.railway, 'subway_entrance');
  assert.equal(hysan.HYSAN_F2_SUBWAY_SOURCE.tags.ref, 'F2'); assert.match(hysan.HYSAN_WEST_ENTRANCE.evidence, /photo-directed, not an OSM tag/);
  for (const frame of [hysan.HYSAN_MAIN_ENTRANCE, hysan.HYSAN_WEST_ENTRANCE, hysan.HYSAN_SOUTH_ENTRANCE, hysan.HYSAN_PARKING_ENTRANCE]) {
    const outward = hysan.hysanFrameToWorld(frame, 0, 1);
    assert.ok(Math.hypot(outward.x - frame.x - frame.nx, outward.z - frame.z - frame.nz) < 1e-9);
    const local = hysan.hysanWorldToLocal(frame.x, frame.z); assert.ok(Math.hypot(local.x - frame.localX, local.z - frame.localZ) < 1e-9);
  }
});
test('Hysan Place shares one DTM pad while the parking road and entrance forecourts keep their own ground rules', () => {
  const meta = terrain.HONG_KONG_TERRAIN_META;
  assert.ok(Math.abs(meta.hysanPadHeight - 5.676151158982634) < 1e-9);
  assert.equal(meta.hysanPadHeight, terrain.rawHongKongTerrainHeight(hysan.HYSAN_SITE.x, hysan.HYSAN_SITE.z));
  assert.equal(terrain.hongKongTerrainHeight(hysan.HYSAN_SITE.x, hysan.HYSAN_SITE.z), meta.hysanPadHeight);
  assert.equal(terrain.hongKongTerrainHeight(hysan.HYSAN_MAIN_ENTRANCE.x, hysan.HYSAN_MAIN_ENTRANCE.z), meta.hysanPadHeight);
  const grounds = { plaza: meta.hysanPadHeight + .12 };
  assert.equal(hysan.hysanGroundHeightAt(hysan.HYSAN_MAIN_ENTRANCE.x, hysan.HYSAN_MAIN_ENTRANCE.z, 999, grounds), grounds.plaza);
  assert.equal(hysan.hysanGroundHeightAt(0, 0, 999, grounds), 999);
  const x = 2463, z = 251; assert.ok(hysan.hysanPointInRoadCorridor(x, z)); assert.ok(!hysan.isHysanPlazaPoint(x, z));
  assert.equal(terrain.hongKongTerrainHeight(x, z), terrain.rawHongKongTerrainHeight(x, z));
  assert.equal(hysan.hysanGroundHeightAt(x, z, 999, grounds), 999);
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/road-elevation.js'), 'utf8');
  assert.match(source, /CONRAD_SITE\.ring, HYSAN_SITE\.ring/);
});
test('Hysan Place preserves the parking-access road with actual lintel clearance above the vehicle envelope', () => {
  const conflicts = roadConflicts(hysan.HYSAN_SITE.ring);
  assert.deepEqual([...new Set(conflicts.map((c) => `${c.recordIndex}:${c.segment}`))], ['44763:0']);
  const expected = hysan.HYSAN_CROSSING_ROADS[0], road = roads[44763];
  assert.equal(expected.recordIndex, 44763); assert.equal(road[0], expected.name); assert.equal(road[1], 8.4);
  assert.equal(road[4], 0); assert.deepEqual(road[5], expected.points);
  const profile = elevation.roadRibbonProfileAtSegment(44763, 0), highest = Math.max(...profile.heights);
  const pad = terrain.HONG_KONG_TERRAIN_META.hysanPadHeight;
  const soffitClearance = pad + hysan.HYSAN_STREET_HEIGHT - highest;
  const lintelClearance = soffitClearance - .36;
  assert.ok(soffitClearance > hysan.HYSAN_ROAD_VEHICLE_CLEARANCE, `insufficient soffit clearance ${soffitClearance}`);
  assert.ok(lintelClearance > hysan.HYSAN_ROAD_VEHICLE_CLEARANCE, `insufficient lintel clearance ${lintelClearance}`);
  assert.ok(lintelClearance > 7.6);
});
test('Hysan Place has no street lamps in the site and leaves eight road bays and all entrance bays open', () => {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed), conflicts = [];
  for (let index = 0; index < lamps.length; index++) { if (suppressed.has(index)) continue; const lamp = lamps[index], override = overrides.get(index), x = lamp[0] + (override?.[1] || 0) / 100, z = lamp[1] + (override?.[2] || 0) / 100; if (inside(hysan.HYSAN_SITE.ring, x, z)) conflicts.push(index); }
  assert.deepEqual(conflicts, []);
  let open = 0, entrance = 0, closed = 0, columns = 0;
  for (let edge = 0; edge < 27; edge++) {
    const length = hysan.hysanEdgeOutward(hysan.HYSAN_LOCAL_RING, edge).length, bays = Math.max(1, Math.ceil(length / hysan.HYSAN_PODIUM_BAY_WIDTH));
    for (let bay = 0; bay < bays; bay++) {
      if (hysan.hysanPodiumBayConflict(hysan.HYSAN_LOCAL_RING, edge, bay / bays, (bay + 1) / bays)) { open++; continue; }
      if ((edge === 25 && bay < 3) || edge === 4 || edge === 15) { entrance++; continue; } closed++;
    }
    for (let bay = 0; bay <= bays; bay++) {
      const t = bay / bays, i = edge * 2, x = lerpValue(hysan.HYSAN_LOCAL_RING[i], hysan.HYSAN_LOCAL_RING[i + 2], t), z = lerpValue(hysan.HYSAN_LOCAL_RING[i + 1], hysan.HYSAN_LOCAL_RING[i + 3], t);
      if (hysan.hysanRoadConflictAtLocal(x, z) || (edge === 25 && bay <= 3) || edge === 4) continue; columns++;
    }
  }
  assert.deepEqual({ open, entrance, closed, columns }, { open: 8, entrance: 6, closed: 91, columns: 113 });
  const colliders = hysan.HYSAN_VOLUMES.flatMap((v) => hysan.hysanRingColliders(v.ring, v.y0, v.y1));
  assert.ok(colliders.every((c) => [c.minX, c.maxX, c.minZ, c.maxZ, c.minY, c.maxY].every(Number.isFinite)));
});
function lerpValue(a, b, t) { return a + (b - a) * t; }
test('Hysan hand-built world includes the researched shifting forms, gardens, entrances and rooftop farm', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/hysan-place-world.js'), 'utf8');
  for (const pattern of [/\$\{prefix\}LowEGlass/, /\$\{prefix\}HorizontalSunshadesAndVerticalFins/, /HysanGardenOfEden4F/, /HysanRetailSkyGardenAndWindOpening/, /HysanOfficeSkyGardenAndWindOpening/, /HysanHennessyDiagonalExpressEscalators/, /\$\{name\}Glass/, /HysanHennessyRoadMainMallEntrance/, /HysanPlaceMainDeviceAndLettering/, /sign\.position\.set\(cx, 8\.15, \.62\)/, /HYSAN_SIGN_GLYPHS/, /'希':/, /'慎':/, /'廣':/, /'場':/, /HysanWestOfficeLobbyRevolvingDoor/, /HysanOfficeRevolvingGlassDrum/, /HysanRooftopUrbanFarmAndOpenCrown/, /HysanUrbanFarmCropRows/, /HysanOpenRoofCanopy204Point1m/, /HysanRoadSafeStreetColumns/, /cityUniforms\.uInteriorGlow/, /hysanGroundHeightAt/]) assert.match(world, pattern);
  assert.doesNotMatch(world, /TextureLoader|image-search|https?:\/\//);
});
test('Hysan Place is integrated as the twenty-sixth authored landmark without generic replacement buildings', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  const debug = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  assert.match(simple, /buildHysanPlace\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.hysanPadHeight \}\)/);
  assert.match(simple, /\.\.\.hysan\.stats/); assert.match(simple, /\.\.\.hysan\.colliders/);
  assert.match(simple, /conrad\.landmarks\.length \+ hysan\.landmarks\.length/); assert.match(simple, /buildings: 0/);
  assert.match(simple, /!groundUsesRoad \? hysan\.groundHeightAt\(x, z, conradGround\) : conradGround/);
  assert.match(debug, /hysan: world\.hysan/);
});
