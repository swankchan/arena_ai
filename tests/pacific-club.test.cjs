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
function checkSource(site, id, version, timestamp) {
  const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/landmarks.json'), 'utf8')), raw = snapshot.elements.find((e) => e.id === id), source = site.source;
  assert.equal(source.id, id); assert.equal(source.version, version); assert.equal(source.sourceTimestamp, timestamp); assert.deepEqual(source.tags, raw.tags);
  assert.equal(source.geometry.length, raw.geometry.length); source.geometry.forEach((p, i) => { assert.equal(p.lon, raw.geometry[i].lon); assert.equal(p.lat, raw.geometry[i].lat); });
}

test('Pacific Club preserves separate exact clubhouse and piled-pier OSM sources', () => {
  const site = hc.PACIFIC_CLUB_SITE, pier = hc.PACIFIC_CLUB_PIER_SITE;
  checkSource(site, 387482610, 4, '2025-10-21T17:00:50Z'); checkSource(pier, 1443753442, 2, '2025-10-23T13:30:45Z');
  assert.equal(site.ring.length / 2 - 1, 4); assert.ok(Math.abs(site.ringArea - 4098.3938) < .001);
  assert.equal(pier.ring.length / 2 - 1, 7); assert.ok(Math.abs(pier.ringArea - 5636.2507) < .001);
  assert.equal(pier.source.tags.pier, 'piled'); assert.equal(pier.source.tags.access, 'private'); assert.equal(pier.source.tags['seamark:shoreline_construction:restriction'], 'restricted_berthing');
  assert.equal(site.source.tags.height, '15'); assert.equal(pier.source.tags.height, '15');
});
test('Pacific Club landward entrance is road-free and does not erase the private pier', () => {
  const entrance = hc.PACIFIC_CLUB_MAIN_ENTRANCE; assert.equal(entrance.sourceEdge, 3); assert.ok(Math.abs(entrance.length - 19.2968) < .001); assert.match(entrance.evidence, /private pier remains a separate exact OSM source/);
  for (let bay = 0; bay < 12; bay++) assert.ok(!hc.harbourCityPodiumBayConflict(hc.PACIFIC_CLUB_SITE, 3, bay / 12, (bay + 1) / 12));
});
test('Pacific Club and its pier have no crossing roads and do not move the shoreline roads', () => {
  for (const site of hc.PACIFIC_CLUB_SITES) { assert.deepEqual(conflicts(site), []); assert.deepEqual(site.roadIds, []); assert.deepEqual(hc.harbourCityRoadRecords(site), []); }
});
test('Pacific Club pier deck is local, DTM-anchored and does not reclaim surrounding water', () => {
  const site = hc.PACIFIC_CLUB_SITE, pier = hc.PACIFIC_CLUB_PIER_SITE, base = terrain.harbourCityPadHeight(site.key);
  assert.ok(Math.abs(base - 3.6378) < .001); assert.equal(terrain.harbourCityPadHeight(pier.key), base);
  assert.equal(hc.harbourCityGroundHeightAt(pier, site.x, site.z, base, { deck: base + .18 }), base + .18);
  assert.equal(hc.harbourCityGroundHeightAt(pier, pier.x - 300, pier.z, base, { deck: base + .18 }), base);
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/pacific-club-world.js'), 'utf8'); assert.match(world, /harbourCityGroundHeightAt\(pier/); assert.doesNotMatch(world, /reclaim|landfill|new coastline/);
});
test('Pacific Club keeps official history and OSM height separate from visual facade bands', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/pacific-club-world.js'), 'utf8'), landmarks = fs.readFileSync(path.join(root, 'docs/hongkong-landmarks.md'), 'utf8');
  assert.match(world, /PACIFIC_CLUB_OPENING_YEAR = 1990/); assert.match(world, /PACIFIC_CLUB_HEIGHT = 15/); assert.match(world, /PACIFIC_CLUB_BARREL_SPRING = 12\.05/);
  assert.match(world, /PACIFIC_CLUB_BARREL_RISE = PACIFIC_CLUB_HEIGHT - PACIFIC_CLUB_BARREL_SPRING/);
  assert.ok(hc.HARBOUR_CITY_RESEARCH_SOURCES.some((s) => /pacificclub\.com\.hk\/about-us/.test(s.url) && /opened in 1990/.test(s.evidence)));
  assert.equal(hc.PACIFIC_CLUB_SITE.levels, 0); assert.match(landmarks, /1990年開業/); assert.match(landmarks, /沒有虛構官方樓層數/);
});
test('Pacific Club has photo-directed arches, circular windows, barrel vault and piled pier', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/pacific-club-world.js'), 'utf8');
  for (const pattern of [/five tall arched seaward windows/, /white fanlight arch tracery/, /circular upper windows/, /green rectangular windows/, /seaward barrel-vault roof/, /barrel-vault standing seams/, /individual concrete pier piles/, /pale-green waterside promenade railings/, /red-brown landward service core/]) assert.match(world, pattern);
  assert.ok(hc.HARBOUR_CITY_RESEARCH_SOURCES.some((s) => /dreamstime/.test(s.url) && /arched seaward fanlights/.test(s.evidence) && /barrel-vault roof/.test(s.evidence)));
  assert.doesNotMatch(world, /image-search|\.jpg|\.png|WET Deck|Red Sugar/);
});
test('Pacific Club is independently integrated, mapped and documented', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8'), map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8'), inventory = fs.readFileSync(path.join(root, 'docs/hongkong-building-inventory.md'), 'utf8'), landmarks = fs.readFileSync(path.join(root, 'docs/hongkong-landmarks.md'), 'utf8');
  assert.match(simple, /buildPacificClub\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.harbourCityPadHeights\.pacificClub \}\)/); assert.match(simple, /pacificClub\.groundHeightAt/); assert.match(simple, /\.\.\.pacificClub\.stats/); assert.match(simple, /\.\.\.pacificClub\.colliders/);
  assert.match(map, /PACIFIC_CLUB_SITE\.name, pacificClubMapSite/); assert.match(map, /PACIFIC_CLUB_PIER_SITE\.ring/); assert.match(inventory, /`HK-HC-PC`/); assert.match(landmarks, /太平洋會 Pacific Club/);
});
