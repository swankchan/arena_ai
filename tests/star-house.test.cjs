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

test('Star House preserves its exact current OSM footprint, address and tags', () => {
  const site = hc.STAR_HOUSE_SITE, source = site.source, snapshot = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/landmarks.json'), 'utf8')), raw = snapshot.elements.find((e) => e.id === site.osmId);
  assert.equal(source.id, 1169655254); assert.equal(source.version, 4); assert.equal(source.sourceTimestamp, '2025-10-30T12:06:54Z'); assert.equal(source.tags.height, '55'); assert.equal(source.tags['building:levels'], '18'); assert.equal(source.tags['addr:street:en'], 'Salisbury Road'); assert.deepEqual(source.tags, raw.tags);
  assert.equal(source.geometry.length, raw.geometry.length); source.geometry.forEach((p, i) => { assert.equal(p.lon, raw.geometry[i].lon); assert.equal(p.lat, raw.geometry[i].lat); }); assert.equal(site.ring.length / 2 - 1, 12); assert.ok(Math.abs(site.ringArea - 4120.93) < .02);
});
test('Star House entrance uses the long Salisbury Road frontage rather than a corner fragment', () => {
  const entrance = hc.STAR_HOUSE_MAIN_ENTRANCE; assert.equal(entrance.sourceEdge, 3); assert.ok(entrance.length > 91 && entrance.length < 92); assert.ok(hc.harbourCityEdgeOutward(hc.STAR_HOUSE_SITE.localRing, 4).length < 5); assert.match(entrance.evidence, /Photo-directed long Salisbury Road/); assert.match(entrance.evidence, /not the tiny extreme-corner segment/);
});
test('Star House keeps the original road network unchanged and has no centreline crossing', () => { assert.deepEqual(conflicts(hc.STAR_HOUSE_SITE), []); assert.deepEqual(hc.STAR_HOUSE_SITE.roadIds, []); assert.deepEqual(hc.harbourCityRoadRecords(hc.STAR_HOUSE_SITE), []); });
test('Star House ground pad remains DTM-traceable and local to the authored footprint', () => {
  const site = hc.STAR_HOUSE_SITE, base = terrain.harbourCityPadHeight(site.key); assert.ok(Number.isFinite(base)); assert.equal(base, 5); assert.equal(base, terrain.HONG_KONG_TERRAIN_META.harbourCityPadHeights.starHouse); assert.equal(hc.harbourCityGroundHeightAt(site, site.x, site.z, 1, { deck: base + .12 }), base + .12); assert.equal(hc.harbourCityGroundHeightAt(site, site.bounds.maxX + 2, site.z, 1, { deck: base + .12 }), 1);
});
test('Star Annex identity and the 18 / 19-floor conventions remain separately sourced', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/star-house-world.js'), 'utf8'); assert.match(source, /STAR_HOUSE_OFFICE_FLOORS = 14/); assert.match(source, /STAR_HOUSE_RETAIL_LEVELS = 4/); assert.match(source, /STAR_HOUSE_SECONDARY_FLOOR_COUNT = 19/); assert.match(source, /STAR_HOUSE_COMPLETION_YEAR = 1967/); assert.ok(hc.HARBOUR_CITY_RESEARCH_SOURCES.some((s) => /HC_FloorPlans_Web_Mar2023\.pdf/.test(s.url) && /STAR ANNEX @ Star House/.test(s.evidence))); assert.ok(hc.HARBOUR_CITY_RESEARCH_SOURCES.some((s) => /Secondary Star House history/.test(s.publisher) && /19-floor/.test(s.evidence) && /18 building levels/.test(s.evidence)));
});
test('Star House model has the photographed lattice, canopy, Star Annex and rooftop sign', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/star-house-world.js'), 'utf8'); assert.match(source, /fourteen recessed office window floors/); assert.match(source, /photographed pale concrete lattice and deep reveals/); assert.match(source, /Star Annex two-storey shopfront glazing/); assert.match(source, /illuminated rectangular canopy soffit/); assert.match(source, /red entrance carpet/); assert.match(source, /photographed rooftop Prudential sign/); assert.match(source, /保誠保險/); assert.match(source, /harbourCitySegmentCollider/); assert.match(source, /harbourCityRingColliders/); assert.doesNotMatch(source, /image-search|\.jpg|\.png|eslite|誠品/);
});
test('Star House is independently integrated, mapped and inventoried', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8'), map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8'), doc = fs.readFileSync(path.join(root, 'docs/hongkong-building-inventory.md'), 'utf8'); assert.match(simple, /buildStarHouse/); assert.match(simple, /\.\.\.starHouse\.colliders/); assert.match(simple, /\.\.\.starHouse\.stats/); assert.match(simple, /starHouse\.groundHeightAt/); assert.match(map, /STAR_HOUSE_SITE/); assert.match(map, /星光行 Star House · Star Annex/); assert.match(map, /!pointInFlatRing\(STAR_HOUSE_SITE\.ring/); assert.match(doc, /HK-B0084` \| 星光行 Star House \| 尖沙咀 \| 已加入 \| \*\*是\*\* \| \*\*是\*\*/); const summary = doc.match(/目前已實際加入 \*\*(\d+) 幢\*\*；其餘 \*\*(\d+) 幢\*\*/); assert.ok(summary); assert.equal(Number(summary[1]) + Number(summary[2]), 100);
});
