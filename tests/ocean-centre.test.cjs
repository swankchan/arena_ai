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

test('Ocean Centre preserves the exact current OSM footprint and tags', () => {
  const site = hc.OCEAN_CENTRE_SITE, source = site.source, snapshot = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/landmarks.json'), 'utf8')), raw = snapshot.elements.find((e) => e.id === site.osmId);
  assert.equal(source.id, 1443753403); assert.equal(source.version, 2); assert.equal(source.sourceTimestamp, '2025-10-23T13:30:45Z');
  assert.equal(source.tags.height, '55'); assert.equal(source.tags['building:levels'], '18'); assert.deepEqual(source.tags, raw.tags);
  assert.equal(source.geometry.length, raw.geometry.length); source.geometry.forEach((p, i) => { assert.equal(p.lon, raw.geometry[i].lon); assert.equal(p.lat, raw.geometry[i].lat); });
  assert.equal(site.ring.length / 2 - 1, 40); assert.ok(Math.abs(site.ringArea - 10232.18) < .02);
});
test('Ocean Centre entrance uses the verified long Canton Road frontage, not a corner fragment', () => {
  const entrance = hc.OCEAN_CENTRE_MAIN_ENTRANCE; assert.equal(entrance.sourceEdge, 34); assert.ok(entrance.length > 90 && entrance.length < 91);
  assert.match(entrance.evidence, /photo-directed long Canton Road frontage/); assert.match(entrance.evidence, /not the tiny extreme-corner segment/);
});
test('Ocean Centre retains all six exact crossing road records', () => {
  const expected = [37749, 51332, 51340, 51341, 51342, 51349]; assert.deepEqual(conflicts(hc.OCEAN_CENTRE_SITE), expected); assert.deepEqual(hc.OCEAN_CENTRE_SITE.roadIds, expected);
  for (const road of hc.harbourCityRoadRecords(hc.OCEAN_CENTRE_SITE)) { assert.equal(road.points, roads[road.recordIndex][5]); assert.equal(road.flags, roads[road.recordIndex][4]); }
});
test('Ocean Centre road-safe six-metre ground floor preserves vehicle clearance', () => {
  const site = hc.OCEAN_CENTRE_SITE, base = terrain.harbourCityPadHeight(site.key); let minimum = Infinity, samples = 0;
  for (const road of hc.harbourCityRoadRecords(site)) for (let seg = 0; seg + 3 < road.points.length; seg += 2) { const ax = road.points[seg], az = road.points[seg + 1], bx = road.points[seg + 2], bz = road.points[seg + 3], length = Math.hypot(bx - ax, bz - az), steps = Math.max(1, Math.ceil(length)); for (let step = 0; step <= steps; step++) { const t = step / steps, x = ax + (bx - ax) * t, z = az + (bz - az) * t; if (!inside(site.ring, x, z)) continue; minimum = Math.min(minimum, base + 6 - hc.HARBOUR_CITY_ROAD_LINTEL_DEPTH - elevation.roadRibbonHeightAtSegment(road.recordIndex, seg >> 1, t)); samples++; } }
  assert.ok(samples > 30); assert.ok(minimum >= hc.HARBOUR_CITY_ROAD_VEHICLE_CLEARANCE, `minimum clearance ${minimum}`);
});
test('Ocean Centre keeps official office data separate from OSM and visible floor conventions', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/ocean-centre-world.js'), 'utf8');
  assert.match(source, /OCEAN_CENTRE_OFFICE_FLOORS = 13/); assert.match(source, /OCEAN_CENTRE_MALL_LEVELS = 5/); assert.match(source, /OCEAN_CENTRE_OFFICE_TYPICAL_FLOOR_SQFT = 48000/);
  assert.match(source, /OCEAN_CENTRE_OFFICE_CLEAR_HEIGHT = 2.44/); assert.match(source, /OCEAN_CENTRE_COMPLETION_YEAR = 1977/);
  assert.ok(hc.HARBOUR_CITY_RESEARCH_SOURCES.some((s) => /office\.harbourcity\.com\.hk/.test(s.url) && /17 office floors/.test(s.evidence)));
  assert.ok(hc.HARBOUR_CITY_RESEARCH_SOURCES.some((s) => /Secondary floor-convention/.test(s.publisher) && /5\/F–17\/F/.test(s.evidence)));
});
test('Ocean Centre model has continuous white ribbons, mall panels and a glazed atrium', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/ocean-centre-world.js'), 'utf8');
  assert.match(source, /Thirteen continuous office glazing ribbons/); assert.match(source, /deep horizontal white facade bands/); assert.match(source, /white panelized mall podium/);
  assert.match(source, /tall glazed Canton Road atrium/); assert.match(source, /three entry portals/); assert.match(source, /harbourCitySegmentCollider/);
  assert.doesNotMatch(source, /image-search|\.jpg|\.png|CHANEL|LOUIS VUITTON|FENDI/);
});
test('Ocean Centre is independently integrated and inventoried', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8'), map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8'), doc = fs.readFileSync(path.join(root, 'docs/hongkong-building-inventory.md'), 'utf8');
  assert.match(simple, /buildOceanCentre/); assert.match(simple, /\.\.\.oceanCentre\.colliders/); assert.match(simple, /oceanCentre\.groundHeightAt/); assert.match(map, /OCEAN_CENTRE_SITE\.name, oceanCentreMapSite/);
  assert.match(doc, /HK-B0086` \| 海洋中心 Ocean Centre \| 尖沙咀 \| 已加入 \| \*\*是\*\* \| \*\*是\*\*/);
  const summary = doc.match(/目前已實際加入 \*\*(\d+) 幢\*\*；其餘 \*\*(\d+) 幢\*\*/); assert.ok(summary); assert.equal(Number(summary[1]) + Number(summary[2]), 100);
});
