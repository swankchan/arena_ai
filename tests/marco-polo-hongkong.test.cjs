const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let hc, terrain, elevation, roads;
test.before(async () => {
  hc = await import('../js/cities/hongkong/harbour-city-architecture.js'); terrain = await import('../js/cities/hongkong/terrain.js');
  elevation = await import('../js/cities/hongkong/road-elevation.js'); roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
});
function inside(ring, x, z) { let value = false; for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) { const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) value = !value; } return value; }
function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function intersects(a, b, c, d) { const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1], denominator = cross(rx, rz, sx, sz); if (Math.abs(denominator) < 1e-9) return false; const qx = c[0] - a[0], qz = c[1] - a[1], t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator; return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9; }
function conflicts(site) { const result = new Set(); for (const [id, road] of roads.entries()) { const flat = road[5]; for (let i = 2; i < flat.length; i += 2) { const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]]; if (Math.max(a[0], b[0]) < site.bounds.minX || Math.min(a[0], b[0]) > site.bounds.maxX || Math.max(a[1], b[1]) < site.bounds.minZ || Math.min(a[1], b[1]) > site.bounds.maxZ) continue; let hit = inside(site.ring, ...a) || inside(site.ring, ...b); for (let j = 0; j < site.ring.length - 2 && !hit; j += 2) hit = intersects(a, b, [site.ring[j], site.ring[j + 1]], [site.ring[j + 2], site.ring[j + 3]]); if (hit) result.add(id); } } return [...result]; }

test('Marco Polo Hongkong Hotel preserves its exact current OSM source', () => {
  const site = hc.MARCO_POLO_HONGKONG_SITE, source = site.source, snapshot = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/landmarks.json'), 'utf8')), raw = snapshot.elements.find((e) => e.id === site.osmId);
  assert.equal(source.id, 1443753382); assert.equal(source.version, 3); assert.equal(source.sourceTimestamp, '2026-07-29T06:24:49Z');
  assert.equal(source.tags.height, '55'); assert.equal(source.tags['building:levels'], '18'); assert.deepEqual(source.tags, raw.tags);
  assert.equal(source.geometry.length, raw.geometry.length); source.geometry.forEach((p, i) => { assert.equal(p.lon, raw.geometry[i].lon); assert.equal(p.lat, raw.geometry[i].lat); });
  assert.equal(site.ring.length / 2 - 1, 20); assert.ok(Math.abs(site.ringArea - 6303.8) < .02); assert.equal(site.levels, 18);
});
test('Canton Road entrance is photo-directed on the long eastern frontage', () => {
  const entrance = hc.MARCO_POLO_MAIN_ENTRANCE; assert.equal(entrance.sourceEdge, 10); assert.ok(entrance.length > 57 && entrance.length < 58);
  assert.match(entrance.evidence, /Photo-directed Canton Road/); assert.match(entrance.evidence, /gold hotel lettering/); assert.doesNotMatch(entrance.evidence, /entrance=yes/);
  assert.ok(entrance.x > hc.MARCO_POLO_HONGKONG_SITE.x + 40);
});
test('Marco Polo crossing roads are the exact original centreline conflicts', () => {
  const expected = [48323, 51329, 51330, 51331, 51335, 51336, 51337];
  assert.deepEqual(conflicts(hc.MARCO_POLO_HONGKONG_SITE), expected); assert.deepEqual(hc.MARCO_POLO_HONGKONG_SITE.roadIds, expected);
  for (const road of hc.harbourCityRoadRecords(hc.MARCO_POLO_HONGKONG_SITE)) assert.equal(road.points, roads[road.recordIndex][5]);
});
test('Six-metre road-safe hotel podium clears all crossing profiles', () => {
  const site = hc.MARCO_POLO_HONGKONG_SITE, base = terrain.harbourCityPadHeight(site.key), soffit = 6; let minimum = Infinity, samples = 0;
  for (const road of hc.harbourCityRoadRecords(site)) for (let seg = 0; seg + 3 < road.points.length; seg += 2) {
    const ax = road.points[seg], az = road.points[seg + 1], bx = road.points[seg + 2], bz = road.points[seg + 3], length = Math.hypot(bx - ax, bz - az), steps = Math.max(1, Math.ceil(length));
    for (let step = 0; step <= steps; step++) { const t = step / steps, x = ax + (bx - ax) * t, z = az + (bz - az) * t; if (!inside(site.ring, x, z)) continue; minimum = Math.min(minimum, base + soffit - hc.HARBOUR_CITY_ROAD_LINTEL_DEPTH - elevation.roadRibbonHeightAtSegment(road.recordIndex, seg >> 1, t)); samples++; }
  }
  assert.ok(samples > 40); assert.ok(minimum >= hc.HARBOUR_CITY_ROAD_VEHICLE_CLEARANCE, `minimum clearance ${minimum}`);
});
test('Hotel model has fourteen recessed room floors, stone podium, glass canopy and gold horse', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/marco-polo-hongkong-world.js'), 'utf8');
  assert.match(source, /MARCO_POLO_ROOM_FLOORS = 14/); assert.match(source, /MARCO_POLO_HEIGHT = 55/); assert.match(source, /MARCO_POLO_ROAD_SOFFIT = 6/);
  assert.match(source, /gold rearing-horse device/); assert.match(source, /Transparent Canton Road entrance canopy/); assert.match(source, /Recessed Marco Polo guest-room windows/);
  assert.match(source, /harbourCityRingColliders\(site, base \+ MARCO_POLO_ROAD_SOFFIT/); assert.doesNotMatch(source, /image-search|\.jpg|\.png/);
});
test('Marco Polo is a separate landmark, ground query and map label', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8'), map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8');
  assert.match(simple, /buildMarcoPoloHongkongHotel/); assert.match(simple, /\.\.\.marcoPolo\.colliders/); assert.match(simple, /marcoPolo\.groundHeightAt/);
  assert.match(map, /MARCO_POLO_HONGKONG_SITE\.name, marcoPoloMapSite/); assert.match(map, /pointInFlatRing\(MARCO_POLO_HONGKONG_SITE\.ring/);
});
test('Inventory marks only the completed Marco Polo inventory entry', () => {
  const doc = fs.readFileSync(path.join(root, 'docs/hongkong-building-inventory.md'), 'utf8');
  assert.match(doc, /HK-B0085` \| 馬哥孛羅香港酒店 Marco Polo Hongkong Hotel \| 尖沙咀 \| 已加入 \| \*\*是\*\* \| \*\*是\*\*/);
  assert.match(doc, /目前已實際加入 \*\*34 幢\*\*；其餘 \*\*66 幢\*\*/); assert.match(doc, /\| 待製作 \| 66 \|/);
  assert.match(doc, /HK-B0084` \| 星光行 Star House \| 尖沙咀 \| 待製作/); assert.match(doc, /HK-B0086` \| 海洋中心 Ocean Centre \| 尖沙咀 \| 待製作/);
});
