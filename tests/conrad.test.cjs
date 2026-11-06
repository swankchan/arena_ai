const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let conrad, terrain, elevation, roads, lamps, clearance;
test.before(async () => {
  conrad = await import('../js/cities/hongkong/conrad-architecture.js');
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

test('Conrad preserves its exact 31-node curved hotel and residential footprint', () => {
  const source = conrad.CONRAD_OSM_SOURCE;
  assert.equal(source.id, 41498759); assert.equal(source.version, 29); assert.equal(source.geometry.length, 32);
  assert.equal(new Set(source.geometry.slice(0, -1).map((p) => p.id)).size, 31);
  assert.equal(source.tags.building, 'hotel'); assert.equal(source.tags['building:levels'], '62'); assert.equal(source.tags.height, '198');
  assert.equal(source.tags.rooms, '513'); assert.equal(source.tags.layer, '3'); assert.equal(source.tags.location, 'roof');
  assert.equal(conrad.CONRAD_LOCAL_RING.length, 64);
  assert.ok(Math.abs(Math.abs(area(conrad.CONRAD_LOCAL_RING)) - 1920.4157856197853) < 1e-8);
  assert.ok(Math.abs(conrad.CONRAD_SITE.area - 2589.612401622119) < 1e-8);
  assert.ok(Math.abs(conrad.CONRAD_SITE.w - 79.52983903309769) < 1e-9); assert.ok(Math.abs(conrad.CONRAD_SITE.d - 32.56151946371233) < 1e-9);
  for (const g of source.geometry) { const x = (g.lon - 114.1596) * 103056.81753522092, z = -(g.lat - 22.2819) * 110734.09626824585, p = conrad.conradWorldToLocal(x, z), q = conrad.conradLocalToWorld(p.x, p.z); assert.ok(Math.hypot(q.x - x, q.z - z) < 1e-9); }
});
test('Conrad keeps OSM, CTBUH and hotel floor conventions separate', () => {
  assert.equal(conrad.CONRAD_OSM_HEIGHT, 198); assert.equal(conrad.CONRAD_CTBUH_HEIGHT, 198.9); assert.equal(conrad.CONRAD_HEIGHT, 198.9);
  assert.equal(conrad.CONRAD_TO_TIP_HEIGHT, 198.9); assert.equal(conrad.CONRAD_OCCUPIED_HEIGHT, 183.9);
  assert.equal(conrad.CONRAD_OSM_LEVELS, 62); assert.equal(conrad.CONRAD_CTBUH_LEVELS, 61);
  assert.equal(conrad.CONRAD_COMPLETION_YEAR, 1990); assert.equal(conrad.CONRAD_ROOMS, 513);
  assert.deepEqual(conrad.CONRAD_HOTEL_FLOORS, [40, 61]); assert.equal(conrad.CONRAD_ARCHITECT, 'Wong & Ouyang');
  assert.equal(conrad.CONRAD_DEVELOPER, 'Swire Properties'); assert.match(conrad.CONRAD_SITE.address, /88 Queensway/);
});
test('Conrad has 57 photo-directed shaft courses, one mechanical band and thirteen main fins', () => {
  assert.equal(conrad.CONRAD_PODIUM_HEIGHT, 14); assert.equal(conrad.CONRAD_PODIUM_LEVELS, 4);
  assert.equal(conrad.CONRAD_SHAFT_COURSES, 57); assert.equal(conrad.CONRAD_PODIUM_LEVELS + conrad.CONRAD_SHAFT_COURSES, 61);
  assert.equal(conrad.CONRAD_PANEL_TARGET_WIDTH, 1.65); assert.deepEqual(conrad.CONRAD_MECHANICAL_COURSES, [32, 33]);
  assert.deepEqual(conrad.CONRAD_MECHANICAL_BAND, [conrad.conradFloorY(32), conrad.conradFloorY(34)]);
  assert.equal(conrad.CONRAD_MAJOR_FIN_VERTICES.length, 13); assert.deepEqual(conrad.CONRAD_CROWN_SIGN_EDGES, [20, 21, 22, 23, 24]);
  assert.equal(conrad.conradRingColliders(conrad.CONRAD_LOCAL_RING, 14, 183.9).length, 31);
  assert.equal(conrad.conradRingColliders(conrad.CONRAD_LOCAL_RING, 183.9, 198.9).length, 31);
});
test('Conrad uses a documented Supreme Court Road entrance frame without inventing an OSM door node', () => {
  const entrance = conrad.CONRAD_ENTRANCE;
  assert.equal(entrance.sourceEdge, 5); assert.equal(entrance.projection, -2.5); assert.match(entrance.name, /Supreme Court Road/);
  assert.match(entrance.evidence, /Official Conrad Dining directions/); assert.match(entrance.evidence, /entrance photographs/);
  assert.equal(entrance.nodeId, undefined); assert.ok(!conrad.conradPointInRoadCorridor(entrance.x, entrance.z));
  const outward = conrad.conradFrameToWorld(entrance, 0, 1);
  assert.ok(Math.hypot(outward.x - entrance.x - entrance.nx, outward.z - entrance.z - entrance.nz) < 1e-9);
  const local = conrad.conradWorldToLocal(entrance.x, entrance.z); assert.ok(Math.hypot(local.x - entrance.localX, local.z - entrance.localZ) < 1e-9);
});
test('Conrad shares a tower DTM pad but keeps the arrival landing and road corridors independent', () => {
  const meta = terrain.HONG_KONG_TERRAIN_META;
  assert.ok(Math.abs(meta.conradPadHeight - 33.02822556338832) < 1e-9);
  assert.equal(conrad.CONRAD_ENTRANCE_LANDING_RISE, 1.85);
  assert.ok(Math.abs(meta.conradEntrancePadHeight - 38.60687319338536) < 1e-9);
  assert.ok(Math.abs(meta.conradEntrancePadHeight - terrain.rawHongKongTerrainHeight(conrad.CONRAD_ENTRANCE.x, conrad.CONRAD_ENTRANCE.z) - conrad.CONRAD_ENTRANCE_LANDING_RISE) < 1e-9);
  assert.equal(terrain.hongKongTerrainHeight(conrad.CONRAD_SITE.x, conrad.CONRAD_SITE.z), meta.conradPadHeight);
  assert.equal(terrain.hongKongTerrainHeight(conrad.CONRAD_ENTRANCE.x, conrad.CONRAD_ENTRANCE.z), meta.conradEntrancePadHeight);
  const grounds = { plaza: meta.conradPadHeight + .12, entrance: meta.conradEntrancePadHeight + .12 };
  assert.equal(conrad.conradGroundHeightAt(conrad.CONRAD_ENTRANCE.x, conrad.CONRAD_ENTRANCE.z, 999, grounds), grounds.entrance);
  const landing = conrad.conradFrameToWorld(conrad.CONRAD_ENTRANCE, 0, -1);
  assert.equal(conrad.conradGroundHeightAt(landing.x, landing.z, 999, grounds), grounds.entrance);
  const secondStep = conrad.conradFrameToWorld(conrad.CONRAD_ENTRANCE, 0, 1.17);
  assert.ok(Math.abs(conrad.conradEntranceStepDrop(secondStep.x, secondStep.z) - .28) < 1e-9);
  assert.ok(Math.abs(conrad.conradGroundHeightAt(secondStep.x, secondStep.z, 999, grounds) - (grounds.entrance - .28)) < 1e-9);
  assert.equal(conrad.conradGroundHeightAt(0, 0, 999, grounds), 999);
  const x = 564.7, z = 583.9; assert.ok(conrad.conradPointInRoadCorridor(x, z)); assert.ok(!conrad.isConradPlazaPoint(x, z));
  assert.equal(terrain.hongKongTerrainHeight(x, z), terrain.rawHongKongTerrainHeight(x, z));
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/road-elevation.js'), 'utf8'); assert.match(source, /QGO_SITE\.ring, CONRAD_SITE\.ring/);
});
test('Conrad preserves all three crossing road records with open-arrival vehicle clearance', () => {
  const conflicts = roadConflicts(conrad.CONRAD_SITE.ring);
  assert.deepEqual([...new Set(conflicts.map((c) => `${c.recordIndex}:${c.segment}`))].sort(), ['44556:1', '49177:0', '49181:0']);
  for (const expected of conrad.CONRAD_CROSSING_ROADS) { const road = roads[expected.recordIndex]; assert.equal(road[0], expected.name); assert.equal(road[1], expected.width); assert.equal(road[4], expected.flags); assert.deepEqual(road[5], expected.points); }
  let highest = -Infinity; for (const c of conflicts) { const profile = elevation.roadRibbonProfileAtSegment(c.recordIndex, c.segment); assert.ok(profile.heights.every(Number.isFinite)); highest = Math.max(highest, ...profile.heights); }
  const soffit = terrain.HONG_KONG_TERRAIN_META.conradPadHeight + conrad.CONRAD_PODIUM_HEIGHT;
  assert.ok(soffit - highest > conrad.CONRAD_ROAD_VEHICLE_CLEARANCE, `insufficient clearance ${soffit - highest}`);
});
test('Conrad contains no rendered street lamps and keeps every pilotis outside road corridors', () => {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed), conflicts = [], canopyConflicts = [];
  const entrance = conrad.CONRAD_ENTRANCE, cs = Math.cos(entrance.ry), sn = Math.sin(entrance.ry);
  for (let index = 0; index < lamps.length; index++) { if (suppressed.has(index)) continue; const lamp = lamps[index], override = overrides.get(index), x = lamp[0] + (override?.[1] || 0) / 100, z = lamp[1] + (override?.[2] || 0) / 100; if (inside(conrad.CONRAD_SITE.ring, x, z)) conflicts.push(index); const dx = x - entrance.x, dz = z - entrance.z, lx = cs * dx - sn * dz, lz = sn * dx + cs * dz; if (Math.abs(lx) <= 8 && lz >= -1 && lz <= 8.2) canopyConflicts.push(index); }
  assert.deepEqual(conflicts, []); assert.deepEqual(canopyConflicts, []);
  let columns = 0; for (let edge = 0; edge < 31; edge++) { const i = edge * 2; if (!conrad.conradRoadConflictAtLocal(conrad.CONRAD_LOCAL_RING[i], conrad.CONRAD_LOCAL_RING[i + 1])) columns++; }
  assert.equal(columns, 25);
  const colliders = conrad.conradRingColliders(conrad.CONRAD_LOCAL_RING, 14, 183.9);
  assert.ok(colliders.every((c) => [c.minX, c.maxX, c.minZ, c.maxZ, c.minY, c.maxY].every(Number.isFinite)));
});
test('Conrad hand-built world includes the researched curved facade, crown lettering and porte-cochere', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/conrad-world.js'), 'utf8');
  for (const pattern of [/ConradBlueGreenHotelAndApartmentGlass/, /ConradWhiteFloorSpandrels/, /ConradWhiteHorizontalRibbonsAndThirteenVerticalFins/, /ConradSingleDarkMechanicalBand/, /ConradCurvedWhiteCrownFascia/, /ConradCurvedRedCrownLettering/, /ConradRoadSafePilotis/, /ConradSupremeCourtRoadPorteCochere/, /ConradRoundedArrivalCanopy/, /ConradGreyMarbleSignWall/, /ConradFourPanelGlassEntrance/, /ConradRedArrivalCarpet/, /ConradCanopyDownlights/, /CONRAD/, /香港港麗酒店/, /cityUniforms\.uInteriorGlow/, /conradGroundHeightAt/]) assert.match(world, pattern);
});
test('Conrad is integrated as the twenty-fifth authored landmark without generic replacement buildings', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  const debug = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  assert.match(simple, /buildConrad\(scene/); assert.match(simple, /\.\.\.conrad\.stats/); assert.match(simple, /\.\.\.conrad\.colliders/);
  assert.match(simple, /qgo\.landmarks\.length \+ centralGovernment\.landmarks\.length \+ heritage1881\.landmarks\.length \+ theArch\.landmarks\.length \+ conrad\.landmarks\.length/); assert.match(simple, /buildings: 0/);
  assert.match(debug, /conrad: world\.conrad/);
});
