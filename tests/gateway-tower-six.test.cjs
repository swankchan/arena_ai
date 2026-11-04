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

test('Gateway Tower 6 preserves its exact current OSM footprint and tags', () => {
  const site = hc.GATEWAY_TOWER_SIX_SITE, source = site.source, snapshot = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/landmarks.json'), 'utf8')), raw = snapshot.elements.find((e) => e.id === site.osmId);
  assert.equal(source.id, 152073864); assert.equal(source.version, 4); assert.equal(source.sourceTimestamp, '2025-10-21T17:00:50Z');
  assert.equal(source.tags.height, '129'); assert.equal(source.tags['building:levels'], '35'); assert.equal(source.tags['addr:unit:ref'], 'T6'); assert.deepEqual(source.tags, raw.tags);
  assert.equal(source.geometry.length, raw.geometry.length); source.geometry.forEach((p, i) => { assert.equal(p.lon, raw.geometry[i].lon); assert.equal(p.lat, raw.geometry[i].lat); });
  assert.equal(site.ring.length / 2 - 1, 32); assert.ok(Math.abs(site.ringArea - 2290.3754) < .001);
});
test('Gateway Tower 6 entrance is the photo-directed long edge and remains road-free', () => {
  const site = hc.GATEWAY_TOWER_SIX_SITE, entrance = hc.GATEWAY_TOWER_SIX_MAIN_ENTRANCE;
  assert.equal(entrance.sourceEdge, 24); assert.ok(Math.abs(entrance.length - 12.9699) < .001); assert.match(entrance.evidence, /Photo-directed landward pink-granite/); assert.match(entrance.evidence, /no OSM entrance node/);
  for (let bay = 0; bay < 12; bay++) assert.ok(!hc.harbourCityPodiumBayConflict(site, 24, bay / 12, (bay + 1) / 12));
});
test('Gateway Tower 6 has no crossing road records and does not move the city roads', () => {
  assert.deepEqual(conflicts(hc.GATEWAY_TOWER_SIX_SITE), []); assert.deepEqual(hc.GATEWAY_TOWER_SIX_SITE.roadIds, []); assert.deepEqual(hc.harbourCityRoadRecords(hc.GATEWAY_TOWER_SIX_SITE), []);
});
test('Gateway Tower 6 ground deck is local to its authored site', () => {
  const site = hc.GATEWAY_TOWER_SIX_SITE, base = terrain.harbourCityPadHeight(site.key);
  assert.ok(Math.abs(base - 5.1058) < .001); assert.equal(hc.harbourCityGroundHeightAt(site, site.x, site.z, base, { deck: base + .12 }), base + .12);
  assert.equal(hc.harbourCityGroundHeightAt(site, site.x + 500, site.z, base, { deck: base + .12 }), base);
});
test('Gateway Tower 6 keeps architect, OSM and CTBUH floor conventions separate', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/gateway-tower-six-world.js'), 'utf8');
  assert.match(source, /GATEWAY_TOWER_SIX_OFFICE_COURSES = 32/); assert.match(source, /GATEWAY_TOWER_SIX_PODIUM_LEVELS = 3/); assert.match(source, /GATEWAY_TOWER_SIX_COMPLETION_YEAR = 1998/);
  assert.ok(hc.HARBOUR_CITY_RESEARCH_SOURCES.some((s) => /wongouyang/.test(s.url) && /one 32-storey office tower/.test(s.evidence)));
  assert.ok(hc.HARBOUR_CITY_RESEARCH_SOURCES.some((s) => /skyscrapercenter/.test(s.url) && /Towers 3 \/ 5 \/ 6: 129 m, 35 floors, 1998/.test(s.evidence)));
  assert.equal(hc.GATEWAY_TOWER_SIX_SITE.levels, 35);
});
test('Gateway Tower 6 has the standalone office facade, stone podium strips and open grille crown', () => {
  const shared = fs.readFileSync(path.join(root, 'js/cities/hongkong/gateway-tower-world-utils.js'), 'utf8'), source = fs.readFileSync(path.join(root, 'js/cities/hongkong/gateway-tower-six-world.js'), 'utf8');
  for (const pattern of [/curved blue-green curtain wall/, /silver horizontal spandrel ribbons/, /pink-granite podium stone panels/, /slender vertical podium window strips/, /open rooftop metal grille crown/, /harbourCityRingColliders/]) assert.match(shared, pattern);
  assert.match(source, /GATEWAY_TOWER_SIX_SERVICE_EDGES = Object\.freeze\(\[30, 31, 0, 1\]\)/); assert.match(source, /apartmentCourses: 0/); assert.doesNotMatch(source, /addGatewayInterconnection/);
  assert.doesNotMatch(shared + source, /image-search|\.jpg|\.png|CHANEL|LOUIS VUITTON|FENDI/);
});
test('Gateway Tower 6 is independently integrated, mapped and documented', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8'), map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8'), inventory = fs.readFileSync(path.join(root, 'docs/hongkong-building-inventory.md'), 'utf8'), landmarks = fs.readFileSync(path.join(root, 'docs/hongkong-landmarks.md'), 'utf8');
  assert.match(simple, /buildGatewayTowerOne/); assert.match(simple, /\.\.\.gatewayTowerSix\.colliders/); assert.match(simple, /gatewayTowerSix\.groundHeightAt/); assert.match(simple, /\.\.\.gatewayTowerSix\.stats/);
  assert.match(map, /GATEWAY_TOWER_SIX_SITE\.name, gatewayTowerSixMapSite/); assert.match(inventory, /`HK-HC-G6`/); assert.match(landmarks, /港威大廈六座 The Gateway Tower 6/);
});
