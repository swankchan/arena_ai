const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let ct, terrain, roads, fullMeta, cc, ferry, lamps, clearance;
test.before(async () => {
  ct = await import('../js/cities/hongkong/clock-tower-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
  fullMeta = await import('../js/cities/hongkong/full-meta.js');
  cc = await import('../js/cities/hongkong/cultural-centre-architecture.js');
  ferry = await import('../js/cities/hongkong/star-ferry-data.js');
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
});
function inside(ring, x, z) { let value = false; for (let i = 0, j = ring.length - 2; i + 1 < ring.length; j = i, i += 2) { const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) value = !value; } return value; }
function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function intersects(a, b, c, d) { const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1], denominator = cross(rx, rz, sx, sz); if (Math.abs(denominator) < 1e-9) return false; const qx = c[0] - a[0], qz = c[1] - a[1], t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator; return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9; }
function conflicts(site) { const result = new Set(); for (const [id, road] of roads.entries()) { const flat = road[5]; for (let i = 2; i < flat.length; i += 2) { const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]]; if (Math.max(a[0], b[0]) < site.bounds.minX || Math.min(a[0], b[0]) > site.bounds.maxX || Math.max(a[1], b[1]) < site.bounds.minZ || Math.max(a[1], b[1]) > site.bounds.maxZ) continue; let hit = inside(site.ring, ...a) || inside(site.ring, ...b); for (let j = 0; j < site.ring.length - 2 && !hit; j += 2) hit = intersects(a, b, [site.ring[j], site.ring[j + 1]], [site.ring[j + 2], site.ring[j + 3]]); if (hit) result.add(id); } } return [...result]; }
function ringsIntersect(a, b) { for (let i = 2; i < a.length; i += 2) for (let j = 2; j < b.length; j += 2) if (intersects([a[i - 2], a[i - 1]], [a[i], a[i + 1]], [b[j - 2], b[j - 1]], [b[j], b[j + 1]])) return true; return inside(b, a[0], a[1]) || inside(a, b[0], b[1]); }
function clearedLampPositions() {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed), result = [];
  for (let index = 0; index < lamps.length; index += 1) {
    if (suppressed.has(index)) continue;
    const lamp = lamps[index], override = overrides.get(index);
    result.push({ index, x: lamp[0] + (override?.[1] || 0) / 100, z: lamp[1] + (override?.[2] || 0) / 100 });
  }
  return result;
}
function lampConflicts(ring) { return clearedLampPositions().filter((lamp) => inside(ring, lamp.x, lamp.z)).map((lamp) => lamp.index); }
function assertLandRing(ring) { for (let i = 2; i < ring.length; i += 2) { const ax = ring[i - 2], az = ring[i - 1], bx = ring[i], bz = ring[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az))); for (let j = 0; j <= n; j += 1) { const t = j / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; assert.ok(fullMeta.isTerritoryLand(x, z), `expected land at ${x},${z}`); } } }

test('Clock Tower preserves exact OSM way 37664321 v17 and the existing snapshot element', () => {
  const site = ct.CLOCK_TOWER_SITE, snapshot = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/landmarks.json'), 'utf8')), matches = snapshot.elements.filter((e) => e.id === 37664321), raw = matches[0];
  assert.equal(matches.length, 1); assert.equal(site.osmId, 37664321); assert.equal(site.source.version, 17); assert.equal(site.source.sourceTimestamp, '2023-10-21T07:19:47Z');
  assert.deepEqual(site.source.nodes, [441536070, 6980052362, 441536071, 441536072, 441536073, 441536070]); assert.deepEqual(site.source.tags, raw.tags);
  assert.equal(site.source.geometry.length, raw.geometry.length); site.source.geometry.forEach((p, i) => { assert.equal(p.lon, raw.geometry[i].lon); assert.equal(p.lat, raw.geometry[i].lat); });
  assert.equal(site.ring.length / 2 - 1, 5); assert.ok(Math.abs(site.ringArea - 50.4254929378) < .0001);
  assert.equal(site.source.tags.faces, '4'); assert.equal(site.source.tags.height, '44'); assert.equal(site.source.tags['roof:shape'], 'dome'); assert.equal(site.source.tags['tower:type'], 'bell_tower');
});
test('four logical facades retain the real main-entrance node and correct geographic directions', () => {
  const e = ct.CLOCK_TOWER_MAIN_ENTRANCE, s = ct.CLOCK_TOWER_SITE;
  assert.equal(e.sourceNodeId, 6980052362); assert.equal(e.source.version, 5); assert.equal(e.source.tags.entrance, 'main'); assert.equal(e.sourceEdge, 0); assert.equal(e.t, 1);
  assert.ok(Math.abs(e.x - s.ring[2]) < 1e-8 && Math.abs(e.z - s.ring[3]) < 1e-8); assert.ok(Math.abs(e.localX - s.localRing[2]) < 1e-8 && Math.abs(e.localZ - s.localRing[3]) < 1e-8);
  assert.equal(ct.CLOCK_TOWER_FACADES.length, 4); assert.deepEqual(ct.CLOCK_TOWER_FACADES[0].sourceEdges, [0, 1]);
  assert.deepEqual(ct.CLOCK_TOWER_FACADES.map((f) => f.windowed), [true, false, true, false]); assert.equal(ct.CLOCK_TOWER_FACADES[3].fountain, true);
  assert.ok(ct.CLOCK_TOWER_FACADES[3].worldNx < -.6 && ct.CLOCK_TOWER_FACADES[3].worldNz > .7, 'pool facade faces southwest toward the photographed waterfront garden');
});
test('official monument facts stay separate from photo-directed stage proportions', () => {
  assert.equal(ct.CLOCK_TOWER_HEIGHT, 44); assert.equal(ct.CLOCK_TOWER_LIGHTNING_ROD_HEIGHT, 7); assert.equal(ct.CLOCK_TOWER_TOTAL_HEIGHT, 51);
  assert.equal(ct.CLOCK_TOWER_MAIN_LEVELS, 6); assert.equal(ct.CLOCK_TOWER_TURRET_LEVELS, 2); assert.equal(ct.CLOCK_TOWER_CLOCK_FACES, 4);
  assert.equal(ct.CLOCK_TOWER_COMPLETED_YEAR, 1915); assert.equal(ct.CLOCK_TOWER_CLOCKS_COMMISSIONED_YEAR, 1921); assert.equal(ct.CLOCK_TOWER_DECLARED_MONUMENT_DATE, '1990-07-13');
  assert.equal(ct.CLOCK_TOWER_MAIN_CORNICE_HEIGHT, 34); assert.equal(ct.CLOCK_TOWER_BELFRY_TOP, 41);
  assert.ok(ct.CLOCK_TOWER_RESEARCH_SOURCES.some((s) => /clock_tower\.pdf/.test(s.url) && /six-storey square/.test(s.evidence) && /two-storey octagonal/.test(s.evidence)));
  assert.ok(ct.CLOCK_TOWER_RESEARCH_SOURCES.some((s) => /monuments_43/.test(s.url) && /Edwardian Classical Revival/.test(s.evidence) && /44 m/.test(s.evidence)));
});
test('tower, fountain apron and pool have no road or rendered street-light crossing', () => {
  for (const site of [ct.CLOCK_TOWER_SITE, ct.CLOCK_TOWER_GARDEN_SITE]) { assert.deepEqual(conflicts(site), []); assert.deepEqual(site.roadIds, []); assert.deepEqual(ct.clockTowerRoadRecords(site), []); }
  const finalLamps = clearedLampPositions();
  for (const ring of [ct.CLOCK_TOWER_SITE.ring, ct.CLOCK_TOWER_GARDEN_SITE.ring, ct.CLOCK_TOWER_POOL_RING]) assert.deepEqual(lampConflicts(ring), []);
  for (const palm of ct.CLOCK_TOWER_PALMS) assert.equal(finalLamps.some((lamp) => Math.hypot(lamp.x - palm.worldX, lamp.z - palm.worldZ) < .75), false, `street light too close to palm ${palm.index}:${palm.side}`);
});
test('pool and palms stay on land and do not absorb the Cultural Centre or Star Ferry Pier', () => {
  assertLandRing(ct.CLOCK_TOWER_GARDEN_SITE.ring); assertLandRing(ct.CLOCK_TOWER_POOL_RING);
  for (const palm of ct.CLOCK_TOWER_PALMS) assert.ok(fullMeta.isTerritoryLand(palm.worldX, palm.worldZ));
  const pier = ferry.STAR_FERRY_TERMINALS.find((site) => site.id === 'tsim-sha-tsui');
  for (const ring of [ct.CLOCK_TOWER_SITE.ring, ct.CLOCK_TOWER_GARDEN_SITE.ring, ct.CLOCK_TOWER_POOL_RING]) {
    assert.equal(ringsIntersect(ring, cc.CULTURAL_CENTRE_SITE.ring), false); assert.equal(ringsIntersect(ring, pier.ring), false);
  }
});
test('fountain garden is honestly photo-directed, with no fictitious precise OSM fountain', () => {
  const garden = ct.CLOCK_TOWER_GARDEN_SITE;
  assert.equal(garden.photoDirected, true); assert.equal(garden.osmId, null); assert.equal(garden.source, null); assert.ok(Math.abs(garden.ringArea - 136) < .0001);
  assert.equal(ct.CLOCK_TOWER_POOL_LENGTH, 18); assert.equal(ct.CLOCK_TOWER_POOL_WIDTH, 4.4); assert.equal(ct.CLOCK_TOWER_POOL_OFFSET, 2);
  assert.equal(ct.CLOCK_TOWER_JETS.length, 5); assert.equal(ct.CLOCK_TOWER_PALMS.length, 10); assert.equal(new Set(ct.CLOCK_TOWER_PALMS.map((p) => `${p.index}:${p.side}`)).size, 10);
  assert.match(ct.CLOCK_TOWER_MODEL_NOTES, /not surveyed dimensions or a claimed OSM fountain/); assert.match(garden.evidence, /No precise OSM fountain footprint/);
});
test('Clock Tower and apron share a local DTM pad while outside terrain and palm datums stay traceable', () => {
  const pad = terrain.clockTowerPadHeight(); assert.ok(Math.abs(pad - 4.5305935288) < .0001); assert.equal(terrain.HONG_KONG_TERRAIN_META.clockTowerPadHeight, pad);
  assert.equal(terrain.hongKongTerrainHeight(ct.CLOCK_TOWER_SITE.x, ct.CLOCK_TOWER_SITE.z), pad);
  const f = ct.CLOCK_TOWER_FOUNTAIN_FACADE, centre = ct.harbourCityLocalToWorld(ct.CLOCK_TOWER_SITE, f.x + f.nx * 11, f.z + f.nz * 11);
  assert.equal(terrain.hongKongTerrainHeight(centre.x, centre.z), pad); assert.equal(ct.clockTowerGroundHeightAt(centre.x, centre.z, 0, pad), pad);
  const x = ct.CLOCK_TOWER_SITE.x - 90, z = ct.CLOCK_TOWER_SITE.z - 40; assert.equal(terrain.hongKongTerrainHeight(x, z), terrain.rawHongKongTerrainHeight(x, z));
});
test('red brick, granite quoins, four clocks, pediment windows, octagonal belfry and 51 m tip are authored', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/clock-tower-world.js'), 'utf8');
  for (const pattern of [/brickTexture/, /exact OSM six-storey red-brick square main shaft/, /alternating dressed-granite corner quoins/, /analog Roman-numeral clock face/, /granite pediment main entrance/, /diamond-pattern dark window/, /paired white classical scroll buttresses/, /octagonal open belfry second storey/, /eight white belfry columns/, /official 44 m concrete domed crown/, /7 m lightning rod and slender three-leg steel lattice support/]) assert.match(world, pattern);
  assert.match(world, /CLOCK_TOWER_TOTAL_HEIGHT/); assert.doesNotMatch(world, /hoarding|scaffolding|festival|image-search|\.jpg|\.png|vecteezy|dreamstime/i);
});
test('reflecting pool, five central jets and ten pinnate palms are real geometry with DTM-grounded trunks', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/clock-tower-world.js'), 'utf8');
  for (const pattern of [/recessed rectangular fountain basin/, /long narrow dark reflecting pool/, /five central water columns with arcing spray and foam rings/, /five pairs of tall slender palm trunks/, /individual pinnate palm leaflets/, /rawHongKongTerrainHeight\(palm\.worldX, palm\.worldZ\)/, /no invented OSM fountain footprint/]) assert.match(world, pattern);
  assert.match(world, /CLOCK_TOWER_POOL_LENGTH/); assert.match(world, /CLOCK_TOWER_PALMS/); assert.match(world, /clockTowerTerrainHeightAt/);
});
test('night treatment is warm and restrained rather than a self-luminous white tower', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/clock-tower-world.js'), 'utf8');
  assert.match(world, /brick\.emissiveNode = color\(1, \.48, \.19\)\.mul\(nightAmount\(\)\)\.mul\(\.065\)/);
  assert.match(world, /dome\.emissiveNode = color\(1, \.72, \.42\)\.mul\(nightAmount\(\)\)\.mul\(\.055\)/);
  assert.match(world, /clock\.emissiveNode = color\(1, \.86, \.57\)\.mul\(nightAmount\(\)\)\.mul\(\.07\)/);
  assert.match(world, /restrained warm facade uplight fixture/); assert.match(world, /jet\.emissiveNode/);
});
test('Clock Tower is independently integrated, mapped, sourced and documented', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8'), map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8');
  const inventory = fs.readFileSync(path.join(root, 'docs/hongkong-building-inventory.md'), 'utf8'), landmarks = fs.readFileSync(path.join(root, 'docs/hongkong-landmarks.md'), 'utf8');
  assert.match(simple, /buildClockTower\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.clockTowerPadHeight \}\)/);
  assert.match(simple, /clockTower\.groundHeightAt/); assert.match(simple, /\.\.\.clockTower\.stats/); assert.match(simple, /\.\.\.clockTower\.colliders/); assert.match(simple, /clockTower\.update/);
  assert.match(map, /clockTowerMapSite/); assert.match(map, /CLOCK_TOWER_SITE\.ring/); assert.match(inventory, /`HK-TST-CT`/); assert.match(landmarks, /尖沙咀鐘樓 Tsim Sha Tsui Clock Tower/);
});
