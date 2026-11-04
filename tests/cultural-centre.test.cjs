const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let cc, terrain, roads;
test.before(async () => {
  cc = await import('../js/cities/hongkong/cultural-centre-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
});
function inside(ring, x, z) { let value = false; for (let i = 0, j = ring.length - 2; i + 1 < ring.length; j = i, i += 2) { const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) value = !value; } return value; }
function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function intersects(a, b, c, d) { const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1], denominator = cross(rx, rz, sx, sz); if (Math.abs(denominator) < 1e-9) return false; const qx = c[0] - a[0], qz = c[1] - a[1], t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator; return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9; }
function conflicts(site) { const result = new Set(); for (const [id, road] of roads.entries()) { const flat = road[5]; for (let i = 2; i < flat.length; i += 2) { const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]]; if (Math.max(a[0], b[0]) < site.bounds.minX || Math.min(a[0], b[0]) > site.bounds.maxX || Math.max(a[1], b[1]) < site.bounds.minZ || Math.min(a[1], b[1]) > site.bounds.maxZ) continue; let hit = inside(site.ring, ...a) || inside(site.ring, ...b); for (let j = 0; j < site.ring.length - 2 && !hit; j += 2) hit = intersects(a, b, [site.ring[j], site.ring[j + 1]], [site.ring[j + 2], site.ring[j + 3]]); if (hit) result.add(id); } } return [...result]; }

test('Cultural Centre preserves the exact current OSM civic-building source', () => {
  const site = cc.CULTURAL_CENTRE_SITE, snapshot = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/landmarks.json'), 'utf8')), raw = snapshot.elements.find((e) => e.id === 37664345);
  assert.equal(site.osmId, 37664345); assert.equal(site.source.version, 27); assert.equal(site.source.sourceTimestamp, '2025-11-23T09:38:29Z');
  assert.equal(site.source.tags.building, 'civic'); assert.equal(site.source.tags.amenity, 'arts_centre'); assert.equal(site.source.tags['name:ja-Hira'], 'ホンコンぶんかちゅうしん');
  assert.deepEqual(site.source.tags, raw.tags); assert.equal(site.source.geometry.length, raw.geometry.length);
  site.source.geometry.forEach((p, i) => { assert.equal(p.lon, raw.geometry[i].lon); assert.equal(p.lat, raw.geometry[i].lat); });
  assert.equal(site.ring.length / 2 - 1, 13); assert.ok(Math.abs(site.ringArea - 9123.4517105) < .001);
  assert.ok(Math.abs(site.w - 124.220936) < .001); assert.ok(Math.abs(site.d - 114.226869) < .001);
});
test('official site and floor-area facts are not confused with footprint or visual heights', () => {
  assert.equal(cc.CULTURAL_CENTRE_OPENING_YEAR, 1989); assert.equal(cc.CULTURAL_CENTRE_OPENING_DATE, '1989-11-08');
  assert.equal(cc.CULTURAL_CENTRE_SITE_HECTARES, 5.2); assert.equal(cc.CULTURAL_CENTRE_GROSS_FLOOR_AREA, 82231);
  assert.equal(cc.CULTURAL_CENTRE_SITE.height, null); assert.equal(cc.CULTURAL_CENTRE_SITE.levels, null);
  assert.equal(cc.CULTURAL_CENTRE_EAST_PEAK_HEIGHT, 35); assert.equal(cc.CULTURAL_CENTRE_ADMIN_HEIGHT, 16.5);
  assert.ok(cc.CULTURAL_CENTRE_RESEARCH_SOURCES.some((s) => /lcsd\.gov\.hk\/en\/hkcc\/index/.test(s.url) && /82,231/.test(s.evidence) && /5.2-hectare/.test(s.evidence)));
});
test('the fixed Cultural Centre footprint has no road crossing or corridor conflict', () => {
  const site = cc.CULTURAL_CENTRE_SITE; assert.deepEqual(conflicts(site), []); assert.deepEqual(site.roadIds, []); assert.deepEqual(cc.culturalCentreRoadRecords(site), []);
});
test('auditorium and administration partitions conserve the exact source area and sail profile', () => {
  assert.ok(Math.abs(cc.CULTURAL_CENTRE_MAIN_RING_AREA + cc.CULTURAL_CENTRE_ADMIN_RING_AREA - cc.CULTURAL_CENTRE_SITE.ringArea) < .0001);
  assert.ok(cc.CULTURAL_CENTRE_MAIN_RING_AREA > cc.CULTURAL_CENTRE_ADMIN_RING_AREA);
  assert.ok(Math.abs(cc.CULTURAL_CENTRE_CHAIN_LENGTH - 198.9795991) < .0001);
  assert.equal(cc.culturalCentreSailHeightAtDistance(0), 33);
  assert.equal(cc.culturalCentreSailHeightAtDistance(cc.CULTURAL_CENTRE_VALLEY_DISTANCE), 16);
  assert.equal(cc.culturalCentreSailHeightAtDistance(cc.CULTURAL_CENTRE_CHAIN_LENGTH), 35);
  assert.equal(cc.CULTURAL_CENTRE_PARTITION_T, .64);
});
test('Salisbury Road arrival is honestly photo/access-directed rather than an invented OSM node', () => {
  const entrance = cc.CULTURAL_CENTRE_MAIN_ENTRANCE; assert.equal(entrance.sourceEdge, 12); assert.equal(entrance.t, .52); assert.ok(entrance.nz < -.99);
  assert.match(entrance.evidence, /no OSM entrance node is claimed/);
  assert.ok(cc.CULTURAL_CENTRE_RESEARCH_SOURCES.some((s) => /barrierfree/.test(s.url) && /automatic doors/.test(s.evidence) && /Salisbury Road/.test(s.evidence)));
});
test('Cultural Centre has a local DTM pad, road-priority ground and unchanged outside terrain', () => {
  const site = cc.CULTURAL_CENTRE_SITE, pad = terrain.culturalCentrePadHeight(); assert.ok(Math.abs(pad - 5.1691352355) < .0001);
  assert.equal(terrain.HONG_KONG_TERRAIN_META.culturalCentrePadHeight, pad); assert.equal(terrain.hongKongTerrainHeight(site.x, site.z), pad);
  assert.equal(cc.culturalCentreGroundHeightAt(site.x, site.z, 0, pad), pad);
  const x = site.x + 220, z = site.z; assert.equal(terrain.hongKongTerrainHeight(x, z), terrain.rawHongKongTerrainHeight(x, z));
});
test('photo-directed sails, tiled fins, slit, foyer and Piazza are authored geometry', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/cultural-centre-world.js'), 'utf8');
  for (const pattern of [/sailRoofGeometry/, /two concave-profile windowless tiled sail walls/, /inward-sloping lower tiled wall/, /repeated inward-sloping tiled base fins/, /small pink ceramic tile joints/, /narrow vertical glazed sail slit/, /dark horizontal administration glazing/, /covered Salisbury Road foyer/, /six curved entrance canopy ribs/, /eight piazza palm trunks/, /individual curved palm fronds/, /accessible ramp/]) assert.match(world, pattern);
  assert.doesNotMatch(world, /image-search|\.jpg|\.png|dreamstime/i);
  assert.ok(cc.CULTURAL_CENTRE_RESEARCH_SOURCES.some((s) => /detail\.php\?id=945/.test(s.url) && /inward-sloping/.test(s.evidence) && /palm rows/.test(s.evidence)));
});
test('night treatment keeps sail walls restrained and the covered foyer warm', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/cultural-centre-world.js'), 'utf8');
  assert.match(world, /wall\.emissiveNode = color\(\.34, \.43, \.58\)\.mul\(nightAmount\(\)\)\.mul\(\.025\)/);
  assert.match(world, /glass\.emissiveNode = color\(1, \.67, \.34\)\.mul\(nightAmount\(\)\)\.mul\(\.55\)/);
  assert.match(world, /warmLight\.emissiveNode = color\(1, \.63, \.26\)\.mul\(nightAmount\(\)\)\.mul\(2\.1\)/);
  assert.match(world, /restrained cool sail uplight fixtures/); assert.match(world, /warm canopy downlights/);
});
test('Cultural Centre is independently integrated, mapped, sourced and documented', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8'), map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8');
  const inventory = fs.readFileSync(path.join(root, 'docs/hongkong-building-inventory.md'), 'utf8'), landmarks = fs.readFileSync(path.join(root, 'docs/hongkong-landmarks.md'), 'utf8');
  assert.match(simple, /buildCulturalCentre\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.culturalCentrePadHeight \}\)/);
  assert.match(simple, /culturalCentre\.groundHeightAt/); assert.match(simple, /\.\.\.culturalCentre\.stats/); assert.match(simple, /\.\.\.culturalCentre\.colliders/);
  assert.match(map, /culturalCentreMapSite/); assert.match(map, /CULTURAL_CENTRE_SITE\.ring/);
  assert.match(inventory, /`HK-TST-CC`/); assert.match(landmarks, /香港文化中心 Hong Kong Cultural Centre/);
});
