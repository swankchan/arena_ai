const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let taikoo, terrain, elevation, roads, lamps, clearance;
test.before(async () => {
  taikoo = await import('../js/cities/hongkong/two-taikoo-place-architecture.js');
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

test('Two Taikoo Place preserves the exact 52-node rounded OSM building and raw source response', () => {
  const source = taikoo.TWO_TAIKOO_OSM_SOURCE, raw = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/two-taikoo-place-osm-full.json'), 'utf8'));
  const rawWay = raw.elements.find((element) => element.type === 'way' && element.id === 710522581), rawNodes = new Map(raw.elements.filter((element) => element.type === 'node').map((element) => [element.id, element]));
  assert.equal(rawWay.version, 8); assert.equal(rawWay.timestamp, source.sourceTimestamp); assert.deepEqual(rawWay.nodes, source.geometry.map((point) => point.id));
  for (const point of source.geometry) { assert.equal(rawNodes.get(point.id).lon, point.lon); assert.equal(rawNodes.get(point.id).lat, point.lat); }
  assert.equal(source.id, 710522581); assert.equal(source.version, 8); assert.equal(source.geometry.length, 53); assert.equal(new Set(source.geometry.slice(0, -1).map((p) => p.id)).size, 52);
  assert.equal(source.tags.building, 'office'); assert.equal(source.tags['building:levels'], '46'); assert.equal(source.tags['building:material'], 'glass'); assert.equal(source.tags.height, '195');
  assert.equal(source.tags['addr:housenumber'], '979'); assert.equal(source.tags.start_date, '2022-09'); assert.equal(taikoo.TWO_TAIKOO_LOCAL_RING.length, 106);
  assert.ok(Math.abs(Math.abs(area(taikoo.TWO_TAIKOO_LOCAL_RING)) - 2651.4818416275084) < 1e-8); assert.ok(Math.abs(taikoo.TWO_TAIKOO_SITE.area - 2725.13649488804) < 1e-8);
  assert.ok(Math.abs(taikoo.TWO_TAIKOO_SITE.w - 72.7005378178319) < 1e-9); assert.ok(Math.abs(taikoo.TWO_TAIKOO_SITE.d - 37.48440626005413) < 1e-9);
  for (const g of source.geometry) { const x = (g.lon - 114.1596) * 103056.81753522092, z = -(g.lat - 22.2819) * 110734.09626824585, p = taikoo.twoTaikooWorldToLocal(x, z), q = taikoo.twoTaikooLocalToWorld(p.x, p.z); assert.ok(Math.hypot(q.x - x, q.z - z) < 1e-9); }
});
test('Two Taikoo Place keeps OSM, CTBUH, Swire and NBBJ conventions separate', () => {
  assert.equal(taikoo.TWO_TAIKOO_OSM_HEIGHT, 195); assert.equal(taikoo.TWO_TAIKOO_CTBUH_HEIGHT, 191); assert.equal(taikoo.TWO_TAIKOO_HEIGHT, 191); assert.equal(taikoo.TWO_TAIKOO_ROOF_DECK, 187.6);
  assert.equal(taikoo.TWO_TAIKOO_OSM_LEVELS, 46); assert.equal(taikoo.TWO_TAIKOO_CTBUH_LEVELS, 46); assert.equal(taikoo.TWO_TAIKOO_SWIRE_LEVELS, 42); assert.equal(taikoo.TWO_TAIKOO_VISUAL_COURSES, 46);
  assert.equal(taikoo.TWO_TAIKOO_START_DATE, '2022-09'); assert.equal(taikoo.TWO_TAIKOO_COMPLETION_YEAR, 2022); assert.equal(taikoo.TWO_TAIKOO_NBBJ_GFA, 92000); assert.equal(taikoo.TWO_TAIKOO_PANEL_WIDTH, 3);
  assert.equal(taikoo.TWO_TAIKOO_GREAT_ROOM_HEIGHT, 15); assert.equal(taikoo.TWO_TAIKOO_GREAT_ROOM_BOTTOM, 0); assert.equal(taikoo.TWO_TAIKOO_GREAT_ROOM_TOP, 15); assert.equal(taikoo.TWO_TAIKOO_GARDEN_BOTTOM, 15); assert.equal(taikoo.TWO_TAIKOO_GARDEN_TOP, 23);
  assert.equal(taikoo.TWO_TAIKOO_ARCHITECT, 'Wong & Ouyang'); assert.equal(taikoo.TWO_TAIKOO_FACADE_DESIGNER, 'NBBJ'); assert.equal(taikoo.TWO_TAIKOO_FACADE_ENGINEER, "Eckersley O'Callaghan"); assert.equal(taikoo.TWO_TAIKOO_DEVELOPER, 'Swire Properties Limited');
});
test('Two Taikoo Place uses all three source entrance nodes with outward frames', () => {
  assert.equal(taikoo.TWO_TAIKOO_MAIN_ENTRANCE.nodeId, 12361796907); assert.equal(taikoo.TWO_TAIKOO_MAIN_ENTRANCE.sourceEdge, 8);
  assert.equal(taikoo.TWO_TAIKOO_EAST_ENTRANCE.nodeId, 6680285871); assert.equal(taikoo.TWO_TAIKOO_EAST_ENTRANCE.sourceEdge, 31);
  assert.equal(taikoo.TWO_TAIKOO_NORTH_ENTRANCE.nodeId, 6680285873); assert.equal(taikoo.TWO_TAIKOO_NORTH_ENTRANCE.sourceEdge, 47);
  for (const frame of [taikoo.TWO_TAIKOO_MAIN_ENTRANCE, taikoo.TWO_TAIKOO_EAST_ENTRANCE, taikoo.TWO_TAIKOO_NORTH_ENTRANCE]) {
    const outward = taikoo.twoTaikooFrameToWorld(frame, 0, 1); assert.ok(Math.hypot(outward.x - frame.x - frame.nx, outward.z - frame.z - frame.nz) < 1e-9);
    const local = taikoo.twoTaikooWorldToLocal(frame.x, frame.z); assert.ok(Math.hypot(local.x - frame.localX, local.z - frame.localZ) < 1e-9);
    assert.equal(taikoo.TWO_TAIKOO_OSM_SOURCE.geometry[frame.sourceEdge].id, frame.nodeId);
  }
});
test('Two Taikoo Place has its own DTM pad and distinguishes surface mouths from the tunnel below', () => {
  const meta = terrain.HONG_KONG_TERRAIN_META; assert.ok(Math.abs(meta.twoTaikooPadHeight - 6.923079698879263) < 1e-9);
  assert.equal(meta.twoTaikooPadHeight, terrain.rawHongKongTerrainHeight(taikoo.TWO_TAIKOO_SITE.x, taikoo.TWO_TAIKOO_SITE.z));
  assert.equal(terrain.hongKongTerrainHeight(taikoo.TWO_TAIKOO_SITE.x, taikoo.TWO_TAIKOO_SITE.z), meta.twoTaikooPadHeight);
  assert.equal(terrain.hongKongTerrainHeight(taikoo.TWO_TAIKOO_MAIN_ENTRANCE.x, taikoo.TWO_TAIKOO_MAIN_ENTRANCE.z), meta.twoTaikooPadHeight);
  const grounds = { plaza: meta.twoTaikooPadHeight + .12 }; assert.equal(taikoo.twoTaikooGroundHeightAt(taikoo.TWO_TAIKOO_MAIN_ENTRANCE.x, taikoo.TWO_TAIKOO_MAIN_ENTRANCE.z, 999, grounds), grounds.plaza); assert.equal(taikoo.twoTaikooGroundHeightAt(0, 0, 999, grounds), 999);
  const surface = [5448.1, -533.4]; assert.ok(taikoo.twoTaikooPointInRoadCorridor(...surface)); assert.ok(!taikoo.isTwoTaikooPlazaPoint(...surface)); assert.equal(terrain.hongKongTerrainHeight(...surface), terrain.rawHongKongTerrainHeight(...surface)); assert.equal(taikoo.twoTaikooGroundHeightAt(...surface, 999, grounds), 999);
  const tunnel = [5447.5, -514.8]; assert.ok(!taikoo.twoTaikooPointInRoadCorridor(...tunnel)); assert.ok(taikoo.twoTaikooPointInRoadCorridor(...tunnel, .3, false)); assert.ok(taikoo.isTwoTaikooPlazaPoint(...tunnel)); assert.equal(terrain.hongKongTerrainHeight(...tunnel), meta.twoTaikooPadHeight);
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/road-elevation.js'), 'utf8'); assert.match(source, /HYSAN_SITE\.ring, TWO_TAIKOO_SITE\.ring/);
});
test('Two Taikoo Place preserves two surface mouths and one tunnel with verified vehicle clearance', () => {
  const conflicts = roadConflicts(taikoo.TWO_TAIKOO_SITE.ring); assert.deepEqual([...new Set(conflicts.map((c) => `${c.recordIndex}:${c.segment}`))], ['35728:0', '50426:0', '50427:0']); assert.equal(taikoo.TWO_TAIKOO_CROSSING_ROADS.length, 3);
  const pad = terrain.HONG_KONG_TERRAIN_META.twoTaikooPadHeight;
  for (const expected of taikoo.TWO_TAIKOO_CROSSING_ROADS) {
    const road = roads[expected.recordIndex]; assert.equal(road[0], expected.name); assert.equal(road[1], 5.5); assert.equal(road[4], expected.flags); assert.deepEqual(road[5], expected.points);
    const profile = elevation.roadRibbonProfileAtSegment(expected.recordIndex, 0), highest = Math.max(...profile.heights), soffitClearance = pad + taikoo.TWO_TAIKOO_PUBLIC_GROUND_TOP - highest, lintelClearance = soffitClearance - taikoo.TWO_TAIKOO_PORTAL_LINTEL;
    assert.ok(soffitClearance > taikoo.TWO_TAIKOO_ROAD_VEHICLE_CLEARANCE, `${expected.recordIndex} soffit ${soffitClearance}`); assert.ok(lintelClearance > taikoo.TWO_TAIKOO_ROAD_VEHICLE_CLEARANCE, `${expected.recordIndex} lintel ${lintelClearance}`);
  }
  assert.deepEqual(taikoo.TWO_TAIKOO_CROSSING_ROADS.map((road) => road.flags), [0, 0, 4]);
});
test('Two Taikoo Place has no lamp conflict and leaves eleven road bays plus four entrance bays open', () => {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed), conflicts = [];
  for (let index = 0; index < lamps.length; index++) { if (suppressed.has(index)) continue; const lamp = lamps[index], override = overrides.get(index), x = lamp[0] + (override?.[1] || 0) / 100, z = lamp[1] + (override?.[2] || 0) / 100; if (inside(taikoo.TWO_TAIKOO_SITE.ring, x, z)) conflicts.push(index); }
  assert.deepEqual(conflicts, []); let open = 0, entrance = 0, closed = 0, columns = 0; const entranceEdges = new Set([8, 31, 47]);
  for (let edge = 0; edge < 52; edge++) {
    const length = taikoo.twoTaikooEdgeOutward(taikoo.TWO_TAIKOO_LOCAL_RING, edge).length, bays = Math.max(1, Math.ceil(length / taikoo.TWO_TAIKOO_PANEL_WIDTH));
    for (let bay = 0; bay < bays; bay++) { if (taikoo.twoTaikooPodiumBayConflict(taikoo.TWO_TAIKOO_LOCAL_RING, edge, bay / bays, (bay + 1) / bays)) { open++; continue; } if (entranceEdges.has(edge) && (edge === 8 ? bay < 2 : bay === 0)) entrance++; else closed++; }
    if (length > 7) { const count = Math.max(1, Math.floor(length / 11)); for (let i = 0; i <= count; i++) { const t = (i + .5) / (count + 1), k = edge * 2, { nx, nz } = taikoo.twoTaikooEdgeOutward(taikoo.TWO_TAIKOO_LOCAL_RING, edge), x = taikoo.TWO_TAIKOO_LOCAL_RING[k] + (taikoo.TWO_TAIKOO_LOCAL_RING[k + 2] - taikoo.TWO_TAIKOO_LOCAL_RING[k]) * t - nx * 1.05, z = taikoo.TWO_TAIKOO_LOCAL_RING[k + 1] + (taikoo.TWO_TAIKOO_LOCAL_RING[k + 3] - taikoo.TWO_TAIKOO_LOCAL_RING[k + 1]) * t - nz * 1.05; if (!taikoo.twoTaikooRoadConflictAtLocal(x, z, 1)) columns++; } }
  }
  assert.deepEqual({ open, entrance, closed, columns }, { open: 11, entrance: 4, closed: 81, columns: 17 });
  const colliders = taikoo.twoTaikooRingColliders(taikoo.TWO_TAIKOO_LOCAL_RING, 23, 187.6); assert.equal(colliders.length, 52); assert.ok(colliders.every((c) => [c.minX, c.maxX, c.minZ, c.maxZ, c.minY, c.maxY].every(Number.isFinite)));
});
test('Two Taikoo hand-built world includes the researched conical facade, gardens, entrances and renewable roof', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/two-taikoo-place-world.js'), 'utf8');
  for (const pattern of [/TOWER_TOP_RING/, /TwoTaikooPlaceConicalCornerUnitizedGlass/, /TwoTaikooPlaceExternalVerticalSolarShadingFins/, /TwoTaikooPlace15mFramelessGreatRoomGlazing/, /TwoTaikooPlaceDiagonalSilverBandsAndPortalLintels/, /TwoTaikooPlaceGoldCubeChandeliers/, /TwoTaikooPlaceTwoLevelsOfSkyGardens/, /TwoTaikooPlaceGardenLawns/, /TwoTaikooPlaceGardenShrubs/, /TwoTaikooPlaceWestPublicEntrance/, /TwoTaikooPlaceEastEntrance/, /TwoTaikooPlaceNorthEntrance/, /TwoTaikooPlaceTwinArchedBridgeBalustrades/, /TAIKOO_SIGN_GLYPHS/, /'太':/, /'古':/, /'坊':/, /'二':/, /'座':/, /TwoTaikooPlaceRoundedRoofParapetTo191m/, /TwoTaikooPlaceSixCoolingTowers/, /TwoTaikooPlaceTwoInclinedPhotovoltaicRacks/, /TwoTaikooPlaceVerticalAxisWindDevice/, /TwoTaikooPlaceRoadSafeGreatRoomColumns/, /cityUniforms\.uInteriorGlow/, /twoTaikooGroundHeightAt/]) assert.match(world, pattern);
  assert.doesNotMatch(world, /TextureLoader|image-search|https?:\/\//);
});
test('Two Taikoo Place is integrated as the twenty-seventh authored landmark without generic replacement buildings', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8'), debug = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  assert.match(simple, /buildTwoTaikooPlace\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.twoTaikooPadHeight \}\)/); assert.match(simple, /\.\.\.twoTaikoo\.stats/); assert.match(simple, /\.\.\.twoTaikoo\.colliders/);
  assert.match(simple, /hysan\.landmarks\.length \+ twoTaikoo\.landmarks\.length/); assert.match(simple, /buildings: 0/); assert.match(simple, /!groundUsesRoad \? twoTaikoo\.groundHeightAt\(x, z, hysanGround\) : hysanGround/); assert.match(debug, /twoTaikoo: world\.twoTaikoo/);
});
