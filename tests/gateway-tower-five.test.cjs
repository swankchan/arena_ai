const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let hc, terrain, elevation, roads;
test.before(async () => { hc = await import('../js/cities/hongkong/harbour-city-architecture.js'); terrain = await import('../js/cities/hongkong/terrain.js'); elevation = await import('../js/cities/hongkong/road-elevation.js'); roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads; });
function inside(ring, x, z) { let value = false; for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) { const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) value = !value; } return value; }
function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function intersects(a, b, c, d) { const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1], denominator = cross(rx, rz, sx, sz); if (Math.abs(denominator) < 1e-9) return false; const qx = c[0] - a[0], qz = c[1] - a[1], t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator; return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9; }
function conflicts(site) { const result = new Set(); for (const [id, road] of roads.entries()) { const flat = road[5]; for (let i = 2; i < flat.length; i += 2) { const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]]; if (Math.max(a[0], b[0]) < site.bounds.minX || Math.min(a[0], b[0]) > site.bounds.maxX || Math.max(a[1], b[1]) < site.bounds.minZ || Math.min(a[1], b[1]) > site.bounds.maxZ) continue; let hit = inside(site.ring, ...a) || inside(site.ring, ...b); for (let j = 0; j < site.ring.length - 2 && !hit; j += 2) hit = intersects(a, b, [site.ring[j], site.ring[j + 1]], [site.ring[j + 2], site.ring[j + 3]]); if (hit) result.add(id); } } return [...result]; }

test('Gateway Tower 5 preserves its exact current OSM footprint and tags', () => {
  const site = hc.GATEWAY_TOWER_FIVE_SITE, source = site.source, snapshot = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/landmarks.json'), 'utf8')), raw = snapshot.elements.find((e) => e.id === site.osmId);
  assert.equal(source.id, 152073809); assert.equal(source.version, 4); assert.equal(source.sourceTimestamp, '2025-10-21T17:00:50Z');
  assert.equal(source.tags.height, '129'); assert.equal(source.tags['building:levels'], '35'); assert.equal(source.tags['addr:unit:ref'], 'T5'); assert.deepEqual(source.tags, raw.tags);
  assert.equal(source.geometry.length, raw.geometry.length); source.geometry.forEach((p, i) => { assert.equal(p.lon, raw.geometry[i].lon); assert.equal(p.lat, raw.geometry[i].lat); });
  assert.equal(site.ring.length / 2 - 1, 32); assert.ok(Math.abs(site.ringArea - 2290.5268) < .001);
});
test('Gateway Tower 5 entrance is the photo-directed long edge and remains road-free', () => {
  const site = hc.GATEWAY_TOWER_FIVE_SITE, entrance = hc.GATEWAY_TOWER_FIVE_MAIN_ENTRANCE;
  assert.equal(entrance.sourceEdge, 23); assert.ok(Math.abs(entrance.length - 12.9699) < .001); assert.match(entrance.evidence, /Photo-directed landward pink-granite/); assert.match(entrance.evidence, /no OSM entrance node/);
  for (let bay = 0; bay < 12; bay++) assert.ok(!hc.harbourCityPodiumBayConflict(site, 23, bay / 12, (bay + 1) / 12));
});
test('Gateway Tower 5 retains the exact crossing road record', () => {
  const expected = [51365]; assert.deepEqual(conflicts(hc.GATEWAY_TOWER_FIVE_SITE), expected); assert.deepEqual(hc.GATEWAY_TOWER_FIVE_SITE.roadIds, expected);
  for (const road of hc.harbourCityRoadRecords(hc.GATEWAY_TOWER_FIVE_SITE)) { assert.equal(road.points, roads[road.recordIndex][5]); assert.equal(road.flags, roads[road.recordIndex][4]); }
});
test('Gateway Tower 5 twelve-metre podium preserves every crossing road profile', () => {
  const site = hc.GATEWAY_TOWER_FIVE_SITE, base = terrain.harbourCityPadHeight(site.key); let minimum = Infinity, samples = 0;
  for (const road of hc.harbourCityRoadRecords(site)) for (let seg = 0; seg + 3 < road.points.length; seg += 2) { const ax = road.points[seg], az = road.points[seg + 1], bx = road.points[seg + 2], bz = road.points[seg + 3], steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az))); for (let step = 0; step <= steps; step++) { const t = step / steps, x = ax + (bx - ax) * t, z = az + (bz - az) * t; if (x < site.bounds.minX || x > site.bounds.maxX || z < site.bounds.minZ || z > site.bounds.maxZ) continue; minimum = Math.min(minimum, base + 12 - hc.HARBOUR_CITY_ROAD_LINTEL_DEPTH - elevation.roadRibbonHeightAtSegment(road.recordIndex, seg >> 1, t)); samples++; } }
  assert.ok(samples > 20); // Recaptured after the hillside welds: the carriageway level here follows one welded node table, so the exact
  // clearance value moved by 1 cm. The 4.7 m vehicle clearance assertion below is the requirement.
  assert.ok(Math.abs(minimum - 12.057752708533378) < 1e-9); assert.ok(minimum >= hc.HARBOUR_CITY_ROAD_VEHICLE_CLEARANCE);
});
test('Gateway Tower 5 keeps floor conventions and documents the official interconnection evidence', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/gateway-tower-five-world.js'), 'utf8');
  assert.match(source, /GATEWAY_TOWER_FIVE_OFFICE_COURSES = 16/); assert.match(source, /GATEWAY_TOWER_FIVE_COMPLETION_YEAR = 1998/); assert.match(source, /GATEWAY_TOWER_FIVE_APARTMENT_COURSES = 14/);
  assert.ok(hc.HARBOUR_CITY_RESEARCH_SOURCES.some((s) => /wongouyang/.test(s.url) && /14 serviced-apartment floors over 16 office floors/.test(s.evidence)));
  assert.ok(hc.HARBOUR_CITY_RESEARCH_SOURCES.some((s) => /office\.harbourcity/.test(s.url) && /Tower 5 and Prudential Tower/.test(s.evidence)));
  assert.equal(hc.GATEWAY_TOWER_FIVE_SITE.levels, 35);
});
test('Gateway Tower 5 retains both arch conventions and models four glazed links with a pale lattice frame', () => {
  const shared = fs.readFileSync(path.join(root, 'js/cities/hongkong/gateway-tower-world-utils.js'), 'utf8'), source = fs.readFileSync(path.join(root, 'js/cities/hongkong/gateway-tower-five-world.js'), 'utf8');
  assert.match(source, /GATEWAY_THREE_FIVE_CONNECTED_LEVELS = Object\.freeze\(\[66, 78, 90, 102\]\)/); assert.match(source, /GATEWAY_THREE_FIVE_MARKETING_ARCH_STOREYS = 3/);
  assert.match(source, /\[34, 0\]/); assert.match(source, /\[-34, 0\]/); assert.match(source, /archFrame: true/); assert.match(shared, /if \(options\.archFrame\)/);
  const a = hc.harbourCityLocalToWorld(hc.GATEWAY_TOWER_THREE_SITE, 34, 0), b = hc.harbourCityLocalToWorld(hc.GATEWAY_TOWER_FIVE_SITE, -34, 0);
  assert.ok(Math.abs(Math.hypot(a.x - b.x, a.z - b.z) - 18.9007) < .001);
  assert.match(shared, /curved blue-green curtain wall/); assert.match(shared, /pink-granite podium stone panels/); assert.match(shared, /open rooftop metal grille crown/);
  assert.ok(hc.HARBOUR_CITY_RESEARCH_SOURCES.some((s) => /four levels/.test(s.evidence) && /gateway arch/.test(s.evidence)));
  assert.ok(hc.HARBOUR_CITY_RESEARCH_SOURCES.some((s) => /three-storey arch/.test(s.evidence) && /55,000 sq ft/.test(s.evidence)));
  assert.doesNotMatch(shared + source, /image-search|\.jpg|\.png/);
});
test('Gateway Tower 5 is independently integrated, mapped and documented', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8'), map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8'), inventory = fs.readFileSync(path.join(root, 'docs/hongkong-building-inventory.md'), 'utf8'), landmarks = fs.readFileSync(path.join(root, 'docs/hongkong-landmarks.md'), 'utf8');
  assert.match(simple, /buildGatewayTowerFive/); assert.match(simple, /\.\.\.gatewayTowerFive\.colliders/); assert.match(simple, /gatewayTowerFive\.groundHeightAt/); assert.match(simple, /\.\.\.gatewayTowerFive\.stats/);
  assert.match(map, /GATEWAY_TOWER_FIVE_SITE\.name, gatewayTowerFiveMapSite/); assert.match(inventory, /`HK-HC-G5`/); assert.match(landmarks, /港威大廈五座 The Gateway Tower 5/);
});
