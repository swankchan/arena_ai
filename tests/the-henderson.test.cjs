const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let henderson, terrain, roads, lamps, clearance;
test.before(async () => {
  henderson = await import('../js/cities/hongkong/the-henderson-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
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
function lampConflicts(ring) { const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed), result = []; for (let index = 0; index < lamps.length; index++) { if (suppressed.has(index)) continue; const lamp = lamps[index], override = overrides.get(index), x = lamp[0] + (override?.[1] || 0) / 100, z = lamp[1] + (override?.[2] || 0) / 100; if (inside(ring, x, z)) result.push(index); } return result; }

test('The Henderson preserves the exact 58-node OSM office ring and saved source data', () => {
  const source = henderson.HENDERSON_OSM_SOURCE, raw = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/the-henderson-osm-full.json'), 'utf8'));
  const rawWay = raw.elements.find((element) => element.type === 'way' && element.id === 26434768), rawNodes = new Map(raw.elements.filter((element) => element.type === 'node').map((element) => [element.id, element]));
  assert.equal(raw.elements.length, 59); assert.equal(rawNodes.size, 58); assert.equal(rawWay.version, 17); assert.equal(rawWay.timestamp, source.sourceTimestamp);
  assert.deepEqual(rawWay.nodes, source.geometry.map((point) => point.id)); assert.deepEqual(rawWay.tags, source.tags);
  for (const point of source.geometry) { assert.equal(rawNodes.get(point.id).lon, point.lon); assert.equal(rawNodes.get(point.id).lat, point.lat); }
  assert.equal(source.id, 26434768); assert.equal(source.geometry.length, 59); assert.equal(new Set(source.geometry.slice(0, -1).map((point) => point.id)).size, 58);
  assert.equal(source.tags.building, 'office'); assert.equal(source.tags['building:levels'], '36'); assert.equal(source.tags['building:levels:underground'], '5'); assert.equal(source.tags['building:material'], 'glass'); assert.equal(source.tags.height, '190'); assert.equal(source.tags['addr:housenumber'], '2');
  assert.equal(henderson.HENDERSON_LOCAL_RING.length, 118); assert.ok(Math.abs(Math.abs(area(henderson.HENDERSON_LOCAL_RING)) - 1713.7690360519955) < 1e-8); assert.ok(Math.abs(henderson.HENDERSON_SITE.area - 1851.0951213584349) < 1e-8);
  assert.ok(Math.abs(henderson.HENDERSON_SITE.w - 39.33343974557545) < 1e-9); assert.ok(Math.abs(henderson.HENDERSON_SITE.d - 47.06161305322048) < 1e-9);
  for (const g of source.geometry) { const x = (g.lon - 114.1596) * 103056.81753522092, z = -(g.lat - 22.2819) * 110734.09626824585, p = henderson.hendersonWorldToLocal(x, z), q = henderson.hendersonLocalToWorld(p.x, p.z); assert.ok(Math.hypot(q.x - x, q.z - z) < 1e-9); }
});
test('The Henderson keeps OSM, WSP, seele, ZHA and workplace conventions separate', () => {
  assert.equal(henderson.HENDERSON_OSM_HEIGHT, 190); assert.equal(henderson.HENDERSON_WSP_HEIGHT, 190); assert.equal(henderson.HENDERSON_DISCOVER_HK_HEIGHT, 190);
  assert.equal(henderson.HENDERSON_SEELE_HEIGHT, 200); assert.equal(henderson.HENDERSON_LIGHTING_DESIGN_HEIGHT, 200); assert.equal(henderson.HENDERSON_HEIGHT, 190); assert.equal(henderson.HENDERSON_ROOF_TOP, 190);
  assert.equal(henderson.HENDERSON_OSM_LEVELS, 36); assert.equal(henderson.HENDERSON_ZHA_LEVELS, 36); assert.equal(henderson.HENDERSON_UNDERGROUND_LEVELS, 5);
  assert.deepEqual(henderson.HENDERSON_HIP_HING_TYPICAL_FLOORS, { first: 6, last: 38 }); assert.deepEqual(henderson.HENDERSON_WORKPLACE_TYPICAL_FLOORS, { first: 6, last: 37 }); assert.deepEqual(henderson.HENDERSON_SEELE_BANQUET_FLOORS, [37, 38]);
  assert.equal(henderson.HENDERSON_OFFICE_FLOORS, 24); assert.equal(henderson.HENDERSON_SKY_GARDEN_FLOOR, 22); assert.equal(henderson.HENDERSON_CLOUD_39_FLOOR, 39);
  assert.equal(henderson.HENDERSON_MEGA_COLUMNS, 6); assert.equal(henderson.HENDERSON_CORE_SIDE, 'east'); assert.equal(henderson.HENDERSON_FACADE_PANELS_OVER, 4000); assert.equal(henderson.HENDERSON_FACADE_PLIES, 4); assert.equal(henderson.HENDERSON_FACADE_LAMINATIONS, 2);
  assert.equal(henderson.HENDERSON_SEELE_ENTRANCE_GLASS_HEIGHT, 11); assert.equal(henderson.HENDERSON_CLOUD_39_ROOF_PANELS, 132); assert.equal(henderson.HENDERSON_CLOUD_39_GLASS_FINS, 119); assert.equal(henderson.HENDERSON_CLOUD_39_CEILING_HEIGHT, 8);
  assert.equal(henderson.HENDERSON_COLUMN_FREE_SPAN, 26); assert.equal(henderson.HENDERSON_FLOOR_TO_FLOOR, 5); assert.equal(henderson.HENDERSON_WSP_GFA, 43200);
});
test('The Henderson marks both photo-directed entrance frames honestly and preserves outward normals', () => {
  assert.equal(henderson.HENDERSON_MAIN_ENTRANCE.nodeId, null); assert.equal(henderson.HENDERSON_MAIN_ENTRANCE.sourceEdge, 42);
  assert.equal(henderson.HENDERSON_UPPER_ENTRANCE.nodeId, null); assert.equal(henderson.HENDERSON_UPPER_ENTRANCE.sourceEdge, 12); assert.equal(henderson.HENDERSON_UPPER_LOBBY_GROUND, 6.2);
  assert.match(henderson.HENDERSON_MAIN_ENTRANCE.evidence, /No entrance-tagged OSM node/); assert.match(henderson.HENDERSON_UPPER_ENTRANCE.evidence, /Not an OSM entrance node/);
  for (const frame of [henderson.HENDERSON_MAIN_ENTRANCE, henderson.HENDERSON_UPPER_ENTRANCE]) {
    const outward = henderson.hendersonFrameToWorld(frame, 0, 1); assert.ok(Math.hypot(outward.x - frame.x - frame.nx, outward.z - frame.z - frame.nz) < 1e-9);
    const local = henderson.hendersonWorldToLocal(frame.x, frame.z); assert.ok(Math.hypot(local.x - frame.localX, local.z - frame.localZ) < 1e-9);
    const i = frame.sourceEdge * 2, midpoint = { x: (henderson.HENDERSON_LOCAL_RING[i] + henderson.HENDERSON_LOCAL_RING[i + 2]) * .5, z: (henderson.HENDERSON_LOCAL_RING[i + 1] + henderson.HENDERSON_LOCAL_RING[i + 3]) * .5 };
    assert.ok(Math.hypot(midpoint.x - frame.localX, midpoint.z - frame.localZ) < 1e-9);
  }
  const colliders = henderson.hendersonRingColliders(henderson.HENDERSON_LOCAL_RING, 0, 190); assert.equal(colliders.length, 58); assert.ok(colliders.every((c) => [c.minX, c.maxX, c.minZ, c.maxZ, c.minY, c.maxY].every(Number.isFinite)));
});
test('The Henderson has its own DTM pad and a flush ground-level arrival, not a surveyed road elevation', () => {
  const meta = terrain.HONG_KONG_TERRAIN_META; assert.ok(Math.abs(meta.hendersonPadHeight - 8.819865857148969) < 1e-9);
  assert.equal(meta.hendersonPadHeight, terrain.rawHongKongTerrainHeight(henderson.HENDERSON_SITE.x, henderson.HENDERSON_SITE.z));
  assert.ok(Math.abs(terrain.rawHongKongTerrainHeight(henderson.HENDERSON_MAIN_ENTRANCE.x, henderson.HENDERSON_MAIN_ENTRANCE.z) - 8.693326252710179) < 1e-9);
  assert.equal(terrain.hongKongTerrainHeight(henderson.HENDERSON_SITE.x, henderson.HENDERSON_SITE.z), meta.hendersonPadHeight); assert.equal(terrain.hongKongTerrainHeight(henderson.HENDERSON_MAIN_ENTRANCE.x, henderson.HENDERSON_MAIN_ENTRANCE.z), meta.hendersonPadHeight);
  const outside = henderson.hendersonFrameToWorld(henderson.HENDERSON_MAIN_ENTRANCE, 0, 2); assert.equal(terrain.hongKongTerrainHeight(outside.x, outside.z), meta.hendersonPadHeight);
  const grounds = { plaza: meta.hendersonPadHeight + .12 }; assert.equal(henderson.hendersonGroundHeightAt(outside.x, outside.z, 999, grounds), grounds.plaza); assert.equal(henderson.hendersonGroundHeightAt(0, 0, 999, grounds), 999);
  assert.equal(henderson.HENDERSON_MAIN_FORECOURT_DEPTH, 3.2); assert.equal(henderson.HENDERSON_GROUND_RINGS.length, 2);
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/road-elevation.js'), 'utf8'); assert.match(source, /\.\.\.HENDERSON_GROUND_RINGS/);
});
test('The Henderson exact site and reduced arrival forecourt have no road conflict', () => {
  const siteConflicts = roadConflicts(henderson.HENDERSON_SITE.ring), forecourtConflicts = roadConflicts(henderson.HENDERSON_MAIN_FORECOURT_RING);
  assert.deepEqual(siteConflicts, []); assert.deepEqual(forecourtConflicts, []);
  assert.equal(roads[2679][0], '美利道'); assert.equal(roads[2679][1], 11.6); // The earlier 5.5 m forecourt was reduced before integration, not by moving the tower or road.
});
test('The Henderson exact site and arrival forecourt have no clearance-adjusted street-lamp conflict', () => {
  assert.deepEqual(lampConflicts(henderson.HENDERSON_SITE.ring), []); assert.deepEqual(lampConflicts(henderson.HENDERSON_MAIN_FORECOURT_RING), []);
});
test('The Henderson hand-built world includes the researched petals, gardens, Cloud 39, entrances and Art Garden', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/the-henderson-world.js'), 'utf8');
  for (const pattern of [/TheHendersonThreeClusterDoubleCurvedInsulatedGlass/, /TheHendersonSixMegaColumns/, /TheHendersonRecessedEasternCore/, /TheHenderson11mDoubleHeightCurvedFoyerGlazing/, /TheHendersonRecessedElongatedPetalApertures/, /TheHenderson22FSkyGardenRunningTrackAndAquaponics/, /TheHendersonSkyGardenTwoLaneRunningTrack/, /TheHendersonCloud39Exactly132CurvedRoofGlassPanels/, /TheHendersonCloud39Exactly119StructuralGlassFinSegments/, /TheHendersonRoofWeatherStationBelow190m/, /TheHendersonMurrayRoad11mArrivalFoyer/, /TheHendersonElevatedWalkwayPublicLobby/, /TheHendersonBreathingTree36KineticMetalRods/, /TheHendersonArtGardenWarmRingLighting/, /cityUniforms\.uInteriorGlow/, /hendersonGroundHeightAt/]) assert.match(world, pattern);
  assert.doesNotMatch(world, /TextureLoader|image-search|https?:\/\//);
});
test('The Henderson is integrated as the twenty-eighth authored landmark without generic replacement buildings', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8'), debug = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  assert.match(simple, /buildTheHenderson\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.hendersonPadHeight \}\)/); assert.match(simple, /\.\.\.theHenderson\.stats/); assert.match(simple, /\.\.\.theHenderson\.colliders/);
  assert.match(simple, /twoTaikoo\.landmarks\.length \+ theHenderson\.landmarks\.length/); assert.match(simple, /buildings: 0/); assert.match(simple, /!groundUsesRoad \? theHenderson\.groundHeightAt\(x, z, twoTaikooGround\) : twoTaikooGround/); assert.match(debug, /theHenderson: world\.theHenderson/);
});
