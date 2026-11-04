const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let hc, terrain, roads;
test.before(async () => { hc = await import('../js/cities/hongkong/harbour-city-architecture.js'); terrain = await import('../js/cities/hongkong/terrain.js'); roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads; });
function inside(ring, x, z) { let value = false; for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) { const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) value = !value; } return value; }
function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function intersects(a, b, c, d) { const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1], denominator = cross(rx, rz, sx, sz); if (Math.abs(denominator) < 1e-9) return false; const qx = c[0] - a[0], qz = c[1] - a[1], t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator; return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9; }
function conflicts(site) { const result = new Set(); for (const [id, road] of roads.entries()) { const flat = road[5]; for (let i = 2; i < flat.length; i += 2) { const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]]; if (Math.max(a[0], b[0]) < site.bounds.minX || Math.min(a[0], b[0]) > site.bounds.maxX || Math.max(a[1], b[1]) < site.bounds.minZ || Math.min(a[1], b[1]) > site.bounds.maxZ) continue; let hit = inside(site.ring, ...a) || inside(site.ring, ...b); for (let j = 0; j < site.ring.length - 2 && !hit; j += 2) hit = intersects(a, b, [site.ring[j], site.ring[j + 1]], [site.ring[j + 2], site.ring[j + 3]]); if (hit) result.add(id); } } return [...result]; }

test('Gateway Hotel preserves its exact current OSM footprint and hotel tags', () => {
  const site = hc.GATEWAY_HOTEL_SITE, source = site.source, snapshot = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/landmarks.json'), 'utf8')), raw = snapshot.elements.find((e) => e.id === site.osmId);
  assert.equal(source.id, 152073859); assert.equal(source.version, 6); assert.equal(source.sourceTimestamp, '2025-10-21T17:00:50Z');
  assert.equal(source.tags.height, '55'); assert.equal(source.tags['building:levels'], '16'); assert.equal(source.tags.rooms, '400'); assert.equal(source.tags['addr:housenumber'], '13'); assert.deepEqual(source.tags, raw.tags);
  assert.equal(source.geometry.length, raw.geometry.length); source.geometry.forEach((p, i) => { assert.equal(p.lon, raw.geometry[i].lon); assert.equal(p.lat, raw.geometry[i].lat); });
  assert.equal(site.ring.length / 2 - 1, 59); assert.ok(Math.abs(site.ringArea - 1825.5405) < .001);
});
test('Gateway Hotel entrance is the photo-directed Canton Road edge and remains road-free', () => {
  const site = hc.GATEWAY_HOTEL_SITE, entrance = hc.GATEWAY_HOTEL_MAIN_ENTRANCE;
  assert.equal(entrance.sourceEdge, 58); assert.ok(Math.abs(entrance.length - 37.5013) < .001); assert.match(entrance.evidence, /Photo-directed long eastern entrance edge 58/); assert.match(entrance.evidence, /not an invented OSM door/);
  for (let bay = 0; bay < 12; bay++) assert.ok(!hc.harbourCityPodiumBayConflict(site, 58, bay / 12, (bay + 1) / 12));
});
test('Gateway Hotel has no crossing road records and does not move the city roads', () => {
  assert.deepEqual(conflicts(hc.GATEWAY_HOTEL_SITE), []); assert.deepEqual(hc.GATEWAY_HOTEL_SITE.roadIds, []); assert.deepEqual(hc.harbourCityRoadRecords(hc.GATEWAY_HOTEL_SITE), []);
});
test('Gateway Hotel ground deck is local to its authored site', () => {
  const site = hc.GATEWAY_HOTEL_SITE, base = terrain.harbourCityPadHeight(site.key);
  assert.ok(Math.abs(base - 5.9304) < .001); assert.equal(hc.harbourCityGroundHeightAt(site, site.x, site.z, base, { deck: base + .12 }), base + .12);
  assert.equal(hc.harbourCityGroundHeightAt(site, site.x + 500, site.z, base, { deck: base + .12 }), base);
});
test('Gateway Hotel separates official hotel facts from OSM massing conventions', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/gateway-hotel-world.js'), 'utf8'), landmarks = fs.readFileSync(path.join(root, 'docs/hongkong-landmarks.md'), 'utf8');
  assert.match(source, /GATEWAY_HOTEL_ROOM_FLOORS = 13/); assert.match(source, /GATEWAY_HOTEL_ROOMS = 400/); assert.match(source, /GATEWAY_HOTEL_RENOVATION_YEAR = 2012/); assert.match(source, /THREE_ON_CANTON_LEVEL = 3/);
  assert.match(source, /\(GATEWAY_HOTEL_HEIGHT - GATEWAY_HOTEL_PODIUM_TOP\) \/ GATEWAY_HOTEL_ROOM_FLOORS/);
  assert.ok(hc.HARBOUR_CITY_RESEARCH_SOURCES.some((s) => /three_on_canton_at_gateway_hotel/.test(s.url) && /fully renovated in December 2012/.test(s.evidence) && /Level 3/.test(s.evidence)));
  assert.equal(hc.GATEWAY_HOTEL_SITE.levels, 16); assert.match(landmarks, /400間客房及套房/); assert.match(landmarks, /2012年12月全面翻新/); assert.match(landmarks, /Three on Canton在3樓/);
});
test('Gateway Hotel has articulated white room frames, a transparent entrance and red lobby art', () => {
  const shared = fs.readFileSync(path.join(root, 'js/cities/hongkong/harbour-city-hotel-world-utils.js'), 'utf8'), source = fs.readFileSync(path.join(root, 'js/cities/hongkong/gateway-hotel-world.js'), 'utf8');
  for (const pattern of [/projecting white guestroom window surrounds and sills/, /three podium floor bands/, /thirteen articulated guestroom window courses/, /roof lift overrun and plant/, /harbourCityRingColliders/]) assert.match(shared, pattern);
  assert.match(source, /transparent: true, opacity: 0\.38/); assert.match(source, /red lobby art visible behind the glass/); assert.match(source, /white entrance columns and door frames/); assert.match(source, /warm linear canopy lights/);
  assert.match(source, /'GATEWAY'/); assert.match(source, /'THREE ON CANTON'/); assert.doesNotMatch(shared + source, /image-search|\.jpg|\.png/);
});
test('Gateway Hotel is independently integrated, mapped and documented', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8'), map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8'), inventory = fs.readFileSync(path.join(root, 'docs/hongkong-building-inventory.md'), 'utf8'), landmarks = fs.readFileSync(path.join(root, 'docs/hongkong-landmarks.md'), 'utf8');
  assert.match(simple, /buildGatewayHotel\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.harbourCityPadHeights\.gatewayHotel \}\)/); assert.match(simple, /\.\.\.gatewayHotel\.colliders/); assert.match(simple, /gatewayHotel\.groundHeightAt/); assert.match(simple, /\.\.\.gatewayHotel\.stats/);
  assert.match(map, /GATEWAY_HOTEL_SITE\.name, gatewayHotelMapSite/); assert.match(inventory, /`HK-HC-GH`/); assert.match(landmarks, /香港港威酒店 Gateway Hotel/);
});
