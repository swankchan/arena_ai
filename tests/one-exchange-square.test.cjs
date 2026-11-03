const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let one, terrain, roads, lamps, clearance, elevation;
test.before(async () => {
  one = await import('../js/cities/hongkong/one-exchange-square-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
  elevation = await import('../js/cities/hongkong/road-elevation.js');
});
function inside(ring, x, z) { let value = false; for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) { const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) value = !value; } return value; }
function area(ring) { let value = 0; for (let i = 0; i + 3 < ring.length; i += 2) value += ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1]; return value * .5; }
function pointSegmentDistance(x, z, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], lengthSq = dx * dx + dz * dz, t = lengthSq ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / lengthSq)) : 0; return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); }
function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function segmentsIntersect(a, b, c, d) { const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1], denominator = cross(rx, rz, sx, sz); if (Math.abs(denominator) < 1e-9) return false; const qx = c[0] - a[0], qz = c[1] - a[1], t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator; return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9; }
function segmentDistance(a, b, c, d) { if (segmentsIntersect(a, b, c, d)) return 0; return Math.min(pointSegmentDistance(...a, c, d), pointSegmentDistance(...b, c, d), pointSegmentDistance(...c, a, b), pointSegmentDistance(...d, a, b)); }
function bounds(ring) { const xs = ring.filter((_, index) => index % 2 === 0), zs = ring.filter((_, index) => index % 2 === 1); return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) }; }
function roadConflicts(ring) { const result = [], box = bounds(ring); for (const [recordIndex, road] of roads.entries()) { const [name, width, , , flags, flat] = road; for (let i = 2; i + 1 < flat.length; i += 2) { const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]], margin = width * .5 + 1; if (Math.max(a[0], b[0]) < box.minX - margin || Math.min(a[0], b[0]) > box.maxX + margin || Math.max(a[1], b[1]) < box.minZ - margin || Math.min(a[1], b[1]) > box.maxZ + margin) continue; let conflict = inside(ring, ...a) || inside(ring, ...b); for (let j = 0; j < ring.length - 2 && !conflict; j += 2) conflict = segmentDistance(a, b, [ring[j], ring[j + 1]], [ring[j + 2], ring[j + 3]]) < width * .5 - 1e-6; if (conflict) result.push({ recordIndex, name, width, flags, segment: i / 2 - 1, a, b }); } } return result; }
function lampConflicts(ring) { const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed), result = []; for (let index = 0; index < lamps.length; index++) { if (suppressed.has(index)) continue; const lamp = lamps[index], override = overrides.get(index), x = lamp[0] + (override?.[1] || 0) / 100, z = lamp[1] + (override?.[2] || 0) / 100; if (inside(ring, x, z)) result.push(index); } return result; }

test('One Exchange Square preserves the exact 43-node OSM tower ring and saved current source', () => {
  const source = one.ONE_EXCHANGE_OSM_SOURCE, raw = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/one-exchange-square-osm-full.json'), 'utf8'));
  const rawWay = raw.elements.find((element) => element.type === 'way' && element.id === 32530560), rawNodes = new Map(raw.elements.filter((element) => element.type === 'node').map((element) => [element.id, element]));
  assert.equal(raw.elements.length, 44); assert.equal(rawNodes.size, 43); assert.equal(rawWay.version, 11); assert.equal(rawWay.timestamp, source.sourceTimestamp);
  assert.deepEqual(rawWay.nodes, source.geometry.map((point) => point.id)); assert.deepEqual(rawWay.tags, source.tags);
  for (const point of source.geometry) { assert.equal(rawNodes.get(point.id).lon, point.lon); assert.equal(rawNodes.get(point.id).lat, point.lat); }
  assert.equal(source.id, 32530560); assert.equal(source.geometry.length, 44); assert.equal(new Set(source.geometry.slice(0, -1).map((point) => point.id)).size, 43);
  assert.equal(source.tags.building, 'office'); assert.equal(source.tags['building:levels'], '52'); assert.equal(source.tags.height, '188'); assert.equal(source.tags['building:colour'], '#c3ae99'); assert.equal(source.tags.location, 'podium');
  assert.equal(one.ONE_EXCHANGE_LOCAL_RING.length, 88); assert.ok(Math.abs(Math.abs(area(one.ONE_EXCHANGE_LOCAL_RING)) - 1612.0205610386329) < 1e-8); assert.ok(Math.abs(one.ONE_EXCHANGE_SITE.area - 1849.6627058764952) < 1e-8);
  assert.ok(Math.abs(one.ONE_EXCHANGE_SITE.w - 53.97726369464803) < 1e-9); assert.ok(Math.abs(one.ONE_EXCHANGE_SITE.d - 34.267441127437024) < 1e-9);
  for (const g of source.geometry) { const x = (g.lon - 114.1596) * 103056.81753522092, z = -(g.lat - 22.2819) * 110734.09626824585, p = one.oneExchangeWorldToLocal(x, z), q = one.oneExchangeLocalToWorld(p.x, p.z); assert.ok(Math.hypot(q.x - x, q.z - z) < 1e-9); }
});
test('One Exchange Square keeps OSM, CVU, Emporis, P&T and leasing conventions separate', () => {
  assert.equal(one.ONE_EXCHANGE_OSM_HEIGHT, 188); assert.equal(one.ONE_EXCHANGE_CTBUH_HEIGHT, 188); assert.equal(one.ONE_EXCHANGE_EMPORIS_HEIGHT, 188.01); assert.equal(one.ONE_EXCHANGE_HEIGHT, 188);
  assert.equal(one.ONE_EXCHANGE_EMPORIS_MAIN_ROOF, 182.03); assert.equal(one.ONE_EXCHANGE_MAIN_ROOF, 182.03);
  assert.equal(one.ONE_EXCHANGE_OSM_LEVELS, 52); assert.equal(one.ONE_EXCHANGE_CTBUH_LEVELS, 52); assert.equal(one.ONE_EXCHANGE_EMPORIS_LEVELS, 52); assert.equal(one.ONE_EXCHANGE_UNDERGROUND_LEVELS, 1);
  assert.equal(one.ONE_EXCHANGE_CONSTRUCTION_START, 1982); assert.equal(one.ONE_EXCHANGE_COMPLETION_YEAR, 1985); assert.equal(one.ONE_EXCHANGE_STRUCTURAL_MATERIAL, 'All-Concrete');
  assert.equal(one.ONE_EXCHANGE_ARCHITECT, 'P & T Group'); assert.equal(one.ONE_EXCHANGE_LEAD_DESIGNER, 'Remo Riva'); assert.equal(one.ONE_EXCHANGE_COMPLEX_GFA, 162400);
  assert.equal(one.ONE_EXCHANGE_JLL_TOTAL_AREA_SQFT, 600000); assert.equal(one.ONE_EXCHANGE_JLL_TYPICAL_FLOOR_SQFT, 13000); assert.deepEqual(one.ONE_EXCHANGE_SAVVI_OFFICE_FLOORS, { first: 5, last: 50, count: 45 });
  assert.equal(one.ONE_EXCHANGE_OFFICE_COURSES, 45); assert.deepEqual(one.ONE_EXCHANGE_PRISM_EDGES, [3, 15, 30]);
});
test('One Exchange Square marks the photo-directed arrival honestly and emits finite ring colliders', () => {
  const frame = one.ONE_EXCHANGE_MAIN_ENTRANCE; assert.equal(frame.nodeId, null); assert.equal(frame.sourceEdge, 30); assert.match(frame.evidence, /No entrance-tagged OSM node/);
  const outward = one.oneExchangeFrameToWorld(frame, 0, 1); assert.ok(Math.hypot(outward.x - frame.x - frame.nx, outward.z - frame.z - frame.nz) < 1e-9);
  const local = one.oneExchangeWorldToLocal(frame.x, frame.z); assert.ok(Math.hypot(local.x - frame.localX, local.z - frame.localZ) < 1e-9);
  const i = frame.sourceEdge * 2, midpoint = { x: (one.ONE_EXCHANGE_LOCAL_RING[i] + one.ONE_EXCHANGE_LOCAL_RING[i + 2]) * .5, z: (one.ONE_EXCHANGE_LOCAL_RING[i + 1] + one.ONE_EXCHANGE_LOCAL_RING[i + 3]) * .5 };
  assert.ok(Math.hypot(midpoint.x - frame.localX, midpoint.z - frame.localZ) < 1e-9);
  const colliders = one.oneExchangeRingColliders(one.ONE_EXCHANGE_LOCAL_RING, 12.03, 182.03); assert.equal(colliders.length, 43); assert.ok(colliders.every((c) => [c.minX, c.maxX, c.minZ, c.maxZ, c.minY, c.maxY].every(Number.isFinite)));
});
test('One Exchange Square has its own DTM pad and road-priority ground, not a surveyed terminal elevation', () => {
  const meta = terrain.HONG_KONG_TERRAIN_META; assert.ok(Math.abs(meta.oneExchangePadHeight - 4.371980624896196) < 1e-9);
  assert.equal(meta.oneExchangePadHeight, terrain.rawHongKongTerrainHeight(one.ONE_EXCHANGE_SITE.x, one.ONE_EXCHANGE_SITE.z));
  assert.ok(Math.abs(terrain.rawHongKongTerrainHeight(one.ONE_EXCHANGE_MAIN_ENTRANCE.x, one.ONE_EXCHANGE_MAIN_ENTRANCE.z) - 4.272993371681963) < 1e-9);
  assert.equal(terrain.hongKongTerrainHeight(one.ONE_EXCHANGE_SITE.x, one.ONE_EXCHANGE_SITE.z), meta.oneExchangePadHeight);
  const outside = one.oneExchangeFrameToWorld(one.ONE_EXCHANGE_MAIN_ENTRANCE, 0, 2); assert.equal(terrain.hongKongTerrainHeight(outside.x, outside.z), meta.oneExchangePadHeight);
  const grounds = { plaza: meta.oneExchangePadHeight + .12 }; assert.equal(one.oneExchangeGroundHeightAt(outside.x, outside.z, 999, grounds), grounds.plaza); assert.equal(one.oneExchangeGroundHeightAt(0, 0, 999, grounds), 999);
  assert.equal(one.ONE_EXCHANGE_MAIN_FORECOURT_DEPTH, 4.6); assert.equal(one.ONE_EXCHANGE_GROUND_RINGS.length, 2);
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/road-elevation.js'), 'utf8'); assert.match(source, /\.\.\.ONE_EXCHANGE_GROUND_RINGS/);
});
test('One Exchange Square preserves the bus-terminal road with seven open bays and verified clearance', () => {
  const conflicts = roadConflicts(one.ONE_EXCHANGE_SITE.ring); assert.equal(conflicts.length, 7); assert.ok(conflicts.every((row) => row.recordIndex === 45686 && row.flags === 0 && row.width === 5.5));
  assert.deepEqual(conflicts.map((row) => row.segment), [0, 1, 2, 3, 4, 5, 6]); assert.deepEqual(roadConflicts(one.ONE_EXCHANGE_MAIN_FORECOURT_RING), []);
  assert.deepEqual(one.ONE_EXCHANGE_ROAD_OPEN_EDGES, [3, 4, 5, 11, 12, 13, 14]); assert.equal(one.ONE_EXCHANGE_GROUND_SOFFIT, 7.2); assert.equal(one.ONE_EXCHANGE_VEHICLE_ENVELOPE, 4.7);
  const road = roads[45686], flat = road[5];
  for (const vertex of one.ONE_EXCHANGE_COLUMN_VERTICES) { const i = vertex * 2, x = one.ONE_EXCHANGE_SITE.ring[i], z = one.ONE_EXCHANGE_SITE.ring[i + 1]; let distance = Infinity; for (let j = 2; j < flat.length; j += 2) distance = Math.min(distance, pointSegmentDistance(x, z, [flat[j - 2], flat[j - 1]], [flat[j], flat[j + 1]])); assert.ok(distance > road[1] * .5 + 1, `column ${vertex} clears the carriageway`); }
  let highest = -Infinity; for (let segment = 0; segment <= 6; segment++) { const profile = elevation.roadRibbonProfileAtSegment(45686, segment); for (const height of profile.heights) highest = Math.max(highest, height); }
  const clearance = terrain.HONG_KONG_TERRAIN_META.oneExchangePadHeight + one.ONE_EXCHANGE_GROUND_SOFFIT - highest;
  assert.ok(Math.abs(clearance - 6.83100020706347) < 1e-9); assert.ok(clearance > one.ONE_EXCHANGE_VEHICLE_ENVELOPE, `podium clearance ${clearance} exceeds the vehicle envelope`);
});
test('One Exchange Square site and arrival court have no clearance-adjusted street-lamp conflict', () => {
  assert.deepEqual(lampConflicts(one.ONE_EXCHANGE_SITE.ring), []); assert.deepEqual(lampConflicts(one.ONE_EXCHANGE_MAIN_FORECOURT_RING), []);
});
test('One Exchange Square hand-built world includes silver cylinders, granite, open podium, lobby art and stepped roof', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/one-exchange-square-world.js'), 'utf8');
  for (const pattern of [/OneExchangeSquareSilverGlassCylindersAndAngularPrismWindows/, /OneExchangeSquarePolishedPinkGraniteHorizontalBandsAndSpines/, /OneExchangeSquareBusTerminalPodiumAndOpenRoadBays/, /OneExchangeSquareSevenPointTwoMetreBusTerminalSoffit/, /OneExchangeSquareTwelveRoadClearBusTerminalColumns/, /OneExchangeSquare182Point03MetreMainRoofDeck/, /OneExchangeSquareSteppedAngularRoofPenthouse/, /OneExchangeSquareCrownLouversAnd188mCap/, /OneExchangeSquarePairedLobbyEscalators/, /OneExchangeSquareSidneyNolanLandscapeColourMuralLeft/, /OneExchangeSquareCyanHKEXArrivalDisplay/, /OneExchangeSquareHenryMooreOvalWithPointsBronze/, /cityUniforms\.uInteriorGlow/, /oneExchangeGroundHeightAt/]) assert.match(world, pattern);
  assert.doesNotMatch(world, /TextureLoader|image-search|https?:\/\//);
});
test('One Exchange Square is integrated as the twenty-ninth authored landmark without generic replacement buildings', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8'), debug = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  assert.match(simple, /buildOneExchangeSquare\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.oneExchangePadHeight \}\)/); assert.match(simple, /\.\.\.oneExchange\.stats/); assert.match(simple, /\.\.\.oneExchange\.colliders/);
  assert.match(simple, /theHenderson\.landmarks\.length \+ oneExchange\.landmarks\.length/); assert.match(simple, /buildings: 0/); assert.match(simple, /!groundUsesRoad \? oneExchange\.groundHeightAt\(x, z, hendersonGround\) : hendersonGround/); assert.match(debug, /oneExchange: world\.oneExchange/);
});
