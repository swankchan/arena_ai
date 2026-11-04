const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let sm, terrain, roads;
test.before(async () => {
  sm = await import('../js/cities/hongkong/space-museum-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
});
function inside(ring, x, z) { let value = false; for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) { const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) value = !value; } return value; }
function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function intersects(a, b, c, d) { const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1], denominator = cross(rx, rz, sx, sz); if (Math.abs(denominator) < 1e-9) return false; const qx = c[0] - a[0], qz = c[1] - a[1], t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator; return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9; }
function conflicts(site) { const result = new Set(); for (const [id, road] of roads.entries()) { const flat = road[5]; for (let i = 2; i < flat.length; i += 2) { const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]]; if (Math.max(a[0], b[0]) < site.bounds.minX || Math.min(a[0], b[0]) > site.bounds.maxX || Math.max(a[1], b[1]) < site.bounds.minZ || Math.min(a[1], b[1]) > site.bounds.maxZ) continue; let hit = inside(site.ring, ...a) || inside(site.ring, ...b); for (let j = 0; j < site.ring.length - 2 && !hit; j += 2) hit = intersects(a, b, [site.ring[j], site.ring[j + 1]], [site.ring[j + 2], site.ring[j + 3]]); if (hit) result.add(id); } } return [...result]; }
function checkSource(site, id, version, timestamp) {
  const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/landmarks.json'), 'utf8')), raw = snapshot.elements.find((e) => e.id === id), source = site.source;
  assert.equal(source.id, id); assert.equal(source.version, version); assert.equal(source.sourceTimestamp, timestamp); assert.deepEqual(source.tags, raw.tags);
  assert.equal(source.geometry.length, raw.geometry.length); source.geometry.forEach((p, i) => { assert.equal(p.lon, raw.geometry[i].lon); assert.equal(p.lat, raw.geometry[i].lat); });
}

test('Space Museum preserves separate exact east and west OSM wing sources', () => {
  checkSource(sm.SPACE_MUSEUM_EAST_SITE, 184731572, 13, '2025-05-22T10:46:32Z');
  checkSource(sm.SPACE_MUSEUM_WEST_SITE, 37664428, 17, '2026-04-29T14:24:38Z');
  assert.equal(sm.SPACE_MUSEUM_EAST_SITE.ring.length / 2 - 1, 41); assert.equal(sm.SPACE_MUSEUM_WEST_SITE.ring.length / 2 - 1, 19);
  assert.ok(Math.abs(sm.SPACE_MUSEUM_EAST_SITE.ringArea - 1643.265554) < .001); assert.ok(Math.abs(sm.SPACE_MUSEUM_WEST_SITE.ringArea - 1087.635091) < .001);
  assert.notEqual(sm.SPACE_MUSEUM_EAST_SITE.osmId, sm.SPACE_MUSEUM_WEST_SITE.osmId);
});
test('official 23 m theatre screen is not confused with the exterior egg dome', () => {
  assert.equal(sm.SPACE_MUSEUM_SCREEN_DIAMETER, 23); assert.equal(sm.SPACE_MUSEUM_DOME_HEIGHT, 25);
  assert.equal(sm.SPACE_MUSEUM_EAST_SITE.source.tags.height, '25'); assert.equal(sm.SPACE_MUSEUM_EAST_SITE.source.tags['roof:shape'], 'dome');
  assert.equal(sm.SPACE_MUSEUM_WEST_SITE.source.tags['building:levels'], '3'); assert.equal(sm.SPACE_MUSEUM_WEST_SITE.height, null);
  assert.equal(sm.SPACE_MUSEUM_OPENING_YEAR, 1980);
  assert.ok(sm.SPACE_MUSEUM_RESEARCH_SOURCES.some((s) => /hk\.space\.museum/.test(s.url) && /23 m INTERNAL/.test(s.evidence) && /Joseph Ming Gun LEE/.test(s.evidence)));
});
test('neither wing crosses a road, so no carriageway is moved or deleted', () => {
  for (const site of sm.SPACE_MUSEUM_SITES) { assert.deepEqual(conflicts(site), []); assert.deepEqual(site.roadIds, []); assert.deepEqual(sm.spaceMuseumRoadRecords(site), []); }
});
test('north entrance uses the exact OSM entrance and door node', () => {
  const entrance = sm.SPACE_MUSEUM_MAIN_ENTRANCE, site = sm.SPACE_MUSEUM_WEST_SITE;
  assert.equal(entrance.sourceNodeId, 7260839550); assert.equal(entrance.sourceNode.tags.entrance, 'yes'); assert.equal(entrance.sourceNode.tags.door, 'yes');
  assert.equal(entrance.sourceEdge, 1); assert.equal(entrance.t, 1); assert.ok(entrance.nz < -.99);
  assert.ok(Math.abs(entrance.localX - site.localRing[4]) < 1e-8); assert.ok(Math.abs(entrance.localZ - site.localRing[5]) < 1e-8);
  assert.ok(Math.abs(entrance.x - site.ring[4]) < 1e-8); assert.ok(Math.abs(entrance.z - site.ring[5]) < 1e-8);
  assert.match(entrance.evidence, /Exact OSM entrance=yes/);
});
test('both wings share a local DTM-anchored pad and outside terrain is unchanged', () => {
  const pad = terrain.spaceMuseumPadHeight(); assert.ok(Math.abs(pad - 5.0598334437) < .0001); assert.equal(terrain.HONG_KONG_TERRAIN_META.spaceMuseumPadHeight, pad);
  for (const site of sm.SPACE_MUSEUM_SITES) assert.equal(terrain.hongKongTerrainHeight(site.x, site.z), pad);
  const x = sm.SPACE_MUSEUM_EAST_SITE.x + 180, z = sm.SPACE_MUSEUM_EAST_SITE.z;
  assert.equal(terrain.hongKongTerrainHeight(x, z), terrain.rawHongKongTerrainHeight(x, z));
  assert.equal(sm.spaceMuseumGroundHeightAt(sm.SPACE_MUSEUM_EAST_SITE.x, sm.SPACE_MUSEUM_EAST_SITE.z, 0, pad), pad);
});
test('photo-directed dome, tile wall, blades and arrival details are authored geometry', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/space-museum-world.js'), 'utf8');
  for (const pattern of [/domeGeometry\(\)/, /domePanelSeams\(\)/, /sweepingFacadeGeometry/, /fine beige ceramic tile grid/, /two tall narrow tiled blade walls/, /five flat-roof skylight monitors/, /three long west-wing horizontal reveals/, /high tiled entrance entablature/, /recessed north entrance and arrival ramp/, /stainless-steel ramp and stair handrails/, /direct wall lettering/]) assert.match(world, pattern);
  assert.doesNotMatch(world, /image-search|\.jpg|\.png|gettyimages/i);
  assert.ok(sm.SPACE_MUSEUM_RESEARCH_SOURCES.some((s) => /gohk\.gov\.hk/.test(s.url) && /curved beige tiled/.test(s.evidence)));
});
test('night treatment keeps the dome restrained and the entrance warm', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/space-museum-world.js'), 'utf8');
  assert.match(world, /dome\.emissiveNode = color\(\.32, \.42, \.55\)\.mul\(nightAmount\(\)\)\.mul\(\.11\)/);
  assert.match(world, /glass\.emissiveNode = color\(1, \.69, \.35\)\.mul\(nightAmount\(\)\)\.mul\(\.7\)/);
  assert.match(world, /restrained dome uplight fixtures/);
});
test('Space Museum is independently integrated, mapped and documented', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8'), map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8');
  const inventory = fs.readFileSync(path.join(root, 'docs/hongkong-building-inventory.md'), 'utf8'), landmarks = fs.readFileSync(path.join(root, 'docs/hongkong-landmarks.md'), 'utf8');
  assert.match(simple, /buildSpaceMuseum\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.spaceMuseumPadHeight \}\)/);
  assert.match(simple, /spaceMuseum\.groundHeightAt/); assert.match(simple, /\.\.\.spaceMuseum\.stats/); assert.match(simple, /\.\.\.spaceMuseum\.colliders/);
  assert.match(map, /spaceMuseumMapSite/); assert.match(map, /SPACE_MUSEUM_WEST_SITE\.ring/);
  assert.match(inventory, /`HK-TST-SM`/); assert.match(landmarks, /香港太空館 Hong Kong Space Museum/);
});
