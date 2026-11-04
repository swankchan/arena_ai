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

test('Prince Hotel preserves its exact current OSM footprint and hotel tags', () => {
  const site = hc.PRINCE_HOTEL_SITE, source = site.source, snapshot = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/landmarks.json'), 'utf8')), raw = snapshot.elements.find((e) => e.id === site.osmId);
  assert.equal(source.id, 152073861); assert.equal(source.version, 9); assert.equal(source.sourceTimestamp, '2025-10-23T13:30:45Z');
  assert.equal(source.tags.height, '55'); assert.equal(source.tags['building:levels'], '16'); assert.equal(source.tags.rooms, '394'); assert.equal(source.tags['addr:housenumber'], '23'); assert.deepEqual(source.tags, raw.tags);
  assert.equal(source.geometry.length, raw.geometry.length); source.geometry.forEach((p, i) => { assert.equal(p.lon, raw.geometry[i].lon); assert.equal(p.lat, raw.geometry[i].lat); });
  assert.equal(site.ring.length / 2 - 1, 62); assert.ok(Math.abs(site.ringArea - 1830.6869) < .001);
});
test('Prince Hotel entrance is the photo-directed Canton Road edge and remains road-free', () => {
  const site = hc.PRINCE_HOTEL_SITE, entrance = hc.PRINCE_HOTEL_MAIN_ENTRANCE;
  assert.equal(entrance.sourceEdge, 61); assert.ok(Math.abs(entrance.length - 31.1591) < .001); assert.match(entrance.evidence, /Photo-directed long eastern entrance edge 61/); assert.match(entrance.evidence, /not an invented OSM door/);
  for (let bay = 0; bay < 12; bay++) assert.ok(!hc.harbourCityPodiumBayConflict(site, 61, bay / 12, (bay + 1) / 12));
});
test('Prince Hotel retains its exact crossing road record', () => {
  const expected = [51361]; assert.deepEqual(conflicts(hc.PRINCE_HOTEL_SITE), expected); assert.deepEqual(hc.PRINCE_HOTEL_SITE.roadIds, expected);
  for (const road of hc.harbourCityRoadRecords(hc.PRINCE_HOTEL_SITE)) { assert.equal(road.points, roads[road.recordIndex][5]); assert.equal(road.flags, roads[road.recordIndex][4]); }
});
test('Prince Hotel twelve-metre podium preserves the road profile and local ground deck', () => {
  const site = hc.PRINCE_HOTEL_SITE, base = terrain.harbourCityPadHeight(site.key); let minimum = Infinity, samples = 0;
  for (const road of hc.harbourCityRoadRecords(site)) for (let seg = 0; seg + 3 < road.points.length; seg += 2) { const ax = road.points[seg], az = road.points[seg + 1], bx = road.points[seg + 2], bz = road.points[seg + 3], steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az))); for (let step = 0; step <= steps; step++) { const t = step / steps, x = ax + (bx - ax) * t, z = az + (bz - az) * t; if (x < site.bounds.minX || x > site.bounds.maxX || z < site.bounds.minZ || z > site.bounds.maxZ) continue; minimum = Math.min(minimum, base + 12 - hc.HARBOUR_CITY_ROAD_LINTEL_DEPTH - elevation.roadRibbonHeightAtSegment(road.recordIndex, seg >> 1, t)); samples++; } }
  assert.equal(samples, 41); assert.ok(Math.abs(minimum - 11.700417741055878) < 1e-9); assert.ok(minimum >= hc.HARBOUR_CITY_ROAD_VEHICLE_CLEARANCE);
  assert.ok(Math.abs(base - 7.1928) < .001); assert.equal(hc.harbourCityGroundHeightAt(site, site.x, site.z, base, { deck: base + .12 }), base + .12); assert.equal(hc.harbourCityGroundHeightAt(site, site.x + 500, site.z, base, { deck: base + .12 }), base);
});
test('Prince Hotel keeps official room and reopening facts separate from OSM massing', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/prince-hotel-world.js'), 'utf8'), landmarks = fs.readFileSync(path.join(root, 'docs/hongkong-landmarks.md'), 'utf8');
  assert.match(source, /PRINCE_HOTEL_ROOM_FLOORS = 13/); assert.match(source, /PRINCE_HOTEL_ROOMS = 394/); assert.match(source, /PRINCE_HOTEL_REOPENING_DATE = '2023-08-01'/);
  assert.match(source, /\(PRINCE_HOTEL_HEIGHT - PRINCE_HOTEL_PODIUM_TOP\) \/ PRINCE_HOTEL_ROOM_FLOORS/);
  assert.ok(hc.HARBOUR_CITY_RESEARCH_SOURCES.some((s) => /prince-hotel-hong-kong\/rooms-suites/.test(s.url) && /394 newly renovated rooms and suites/.test(s.evidence)));
  assert.ok(hc.HARBOUR_CITY_RESEARCH_SOURCES.some((s) => /wharfhotels/.test(s.url) && /reopened on 1 August 2023/.test(s.evidence)));
  assert.equal(hc.PRINCE_HOTEL_SITE.levels, 16); assert.match(landmarks, /394間新裝修客房及套房/); assert.match(landmarks, /2023年8月1日重開/);
});
test('Prince Hotel has dark vertical window strips, a broad stone core and a deep porte-cochere', () => {
  const shared = fs.readFileSync(path.join(root, 'js/cities/hongkong/harbour-city-hotel-world-utils.js'), 'utf8'), source = fs.readFileSync(path.join(root, 'js/cities/hongkong/prince-hotel-world.js'), 'utf8');
  assert.match(shared, /broad pale stone service-core panels/); assert.match(shared, /dark horizontal guestroom spandrel bands/); assert.match(shared, /white vertical guestroom frames/);
  assert.match(source, /PRINCE_HOTEL_CORE_BAYS = Object\.freeze\(\[5, 6, 7\]\)/); assert.match(source, /broad rectangular porte-cochere columns/); assert.match(source, /deep Canton Road porte-cochere slab/);
  assert.match(source, /dark metal and glass canopy underside/); assert.match(source, /warm linear downlights/); assert.match(source, /'THE PRINCE HOTEL'/);
  assert.ok(hc.HARBOUR_CITY_RESEARCH_SOURCES.some((s) => /third-party photo gallery/.test(s.publisher) && /dark vertical guestroom window strips/.test(s.evidence)));
  assert.doesNotMatch(shared + source, /image-search|\.jpg|\.png|EMPORIO ARMANI|GIORGIO ARMANI/);
});
test('Prince Hotel is independently integrated, mapped and documented', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8'), map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8'), inventory = fs.readFileSync(path.join(root, 'docs/hongkong-building-inventory.md'), 'utf8'), landmarks = fs.readFileSync(path.join(root, 'docs/hongkong-landmarks.md'), 'utf8');
  assert.match(simple, /buildPrinceHotel\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.harbourCityPadHeights\.princeHotel \}\)/); assert.match(simple, /\.\.\.princeHotel\.colliders/); assert.match(simple, /princeHotel\.groundHeightAt/); assert.match(simple, /\.\.\.princeHotel\.stats/);
  assert.match(map, /PRINCE_HOTEL_SITE\.name, princeHotelMapSite/); assert.match(inventory, /`HK-HC-PH`/); assert.match(landmarks, /香港太子酒店 Prince Hotel/);
});
