const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let peninsula, terrain, roads, lamps, clearance, siteUtils;
test.before(async () => {
  peninsula = await import('../js/cities/hongkong/peninsula-hotel-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  siteUtils = await import('../js/cities/hongkong/landmark-site.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
});
function inside(ring, x, z) { return siteUtils.pointInFlatRing(ring, x, z); }
function pointSegment(x, z, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz, t = l ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l)) : 0; return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); }
function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function intersects(a, b, c, d) { const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1], denominator = cross(rx, rz, sx, sz); if (Math.abs(denominator) < 1e-9) return false; const qx = c[0] - a[0], qz = c[1] - a[1], t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator; return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9; }
function segmentDistance(a, b, c, d) { return intersects(a, b, c, d) ? 0 : Math.min(pointSegment(...a, c, d), pointSegment(...b, c, d), pointSegment(...c, a, b), pointSegment(...d, a, b)); }
function roadScan(site) {
  const centre = new Set(), corridor = new Set(), b = site.bounds;
  for (const [id, road] of roads.entries()) {
    const flat = road[5], clearanceWidth = road[1] * .5 + .35;
    for (let i = 2; i < flat.length; i += 2) {
      const a = [flat[i - 2], flat[i - 1]], c = [flat[i], flat[i + 1]];
      if (Math.max(a[0], c[0]) < b.minX - clearanceWidth || Math.min(a[0], c[0]) > b.maxX + clearanceWidth || Math.max(a[1], c[1]) < b.minZ - clearanceWidth || Math.min(a[1], c[1]) > b.maxZ + clearanceWidth) continue;
      let hit = inside(site.ring, ...a) || inside(site.ring, ...c), distance = hit ? 0 : Infinity;
      for (let j = 2; j < site.ring.length; j += 2) {
        const d = [site.ring[j - 2], site.ring[j - 1]], e = [site.ring[j], site.ring[j + 1]];
        if (intersects(a, c, d, e)) hit = true;
        distance = Math.min(distance, segmentDistance(a, c, d, e));
      }
      if (hit) centre.add(id);
      if (distance < clearanceWidth) corridor.add(id);
    }
  }
  return { centre: [...centre], corridor: [...corridor] };
}
function clearedLampPositions() {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed), result = [];
  for (let index = 0; index < lamps.length; index += 1) {
    if (suppressed.has(index)) continue;
    const lamp = lamps[index], override = overrides.get(index);
    result.push({ index, x: lamp[0] + (override?.[1] || 0) / 100, z: lamp[1] + (override?.[2] || 0) / 100 });
  }
  return result;
}

test('Peninsula preserves separate exact OSM heritage and tower ways, tags and closed rings', () => {
  const h = peninsula.PENINSULA_HERITAGE_SITE, t = peninsula.PENINSULA_TOWER_SITE;
  assert.equal(h.osmId, 120833435); assert.equal(h.source.version, 12); assert.equal(h.source.sourceTimestamp, '2023-10-15T16:42:39Z');
  assert.equal(t.osmId, 152073879); assert.equal(t.source.version, 4); assert.equal(t.source.sourceTimestamp, '2023-05-07T14:06:22Z');
  assert.equal(h.source.geometry.length, 14); assert.equal(t.source.geometry.length, 13);
  assert.equal(h.source.nodes.at(-1), h.source.nodes[0]); assert.equal(t.source.nodes.at(-1), t.source.nodes[0]);
  assert.equal(h.source.tags.height, '40'); assert.equal(h.source.tags['building:levels'], '7');
  assert.equal(t.source.tags.height, '115'); assert.equal(t.source.tags['building:levels'], '28'); assert.equal(t.source.tags.layer, '1');
  assert.ok(Math.abs(h.ringArea - 4186.3198759482475) < 1e-8); assert.ok(Math.abs(t.ringArea - 1105.1867126348661) < 1e-8);
  assert.equal(h.localRing.length, h.ring.length); assert.equal(t.localRing.length, t.ring.length);
  assert.equal(peninsula.PENINSULA_BUILDING_SITES.length, 2); assert.equal(peninsula.PENINSULA_GROUND_SITES.length, 3);
  assert.equal(peninsula.PENINSULA_IDENTITY_OSM_SOURCE.id, 709674355);
});

test('official tower convention remains separate from OSM and visible facade rows are not a floor-count claim', () => {
  assert.equal(peninsula.PENINSULA_OPENING_DATE, '1928-12-11'); assert.equal(peninsula.PENINSULA_TOWER_COMPLETION_YEAR, 1994);
  assert.equal(peninsula.PENINSULA_HERITAGE_HEIGHT, 40); assert.equal(peninsula.PENINSULA_TOWER_OSM_HEIGHT, 115);
  assert.equal(peninsula.PENINSULA_TOWER_HEIGHT, 117.7); assert.equal(peninsula.PENINSULA_TOWER_CTBUH_LEVELS, 33);
  assert.equal(peninsula.PENINSULA_TOWER_VISIBLE_ROOM_ROWS, 24); assert.notEqual(peninsula.PENINSULA_TOWER_VISIBLE_ROOM_ROWS, peninsula.PENINSULA_TOWER_CTBUH_LEVELS);
  assert.ok(peninsula.PENINSULA_RESEARCH_SOURCES.some((s) => /skyscrapercenter/.test(s.url) && /117\.7 m/.test(s.evidence) && /33 floors/.test(s.evidence)));
  assert.ok(peninsula.PENINSULA_RESEARCH_SOURCES.some((s) => /peninsula\.com/.test(s.url) && /11 December 1928/.test(s.evidence)));
});

test('forecourt is honestly photo-directed and the two entrance conventions stay distinct', () => {
  const f = peninsula.PENINSULA_FORECOURT_SITE, main = peninsula.PENINSULA_MAIN_ENTRANCE, arcade = peninsula.PENINSULA_ARCADE_ENTRANCE;
  assert.equal(f.photoDirected, true); assert.equal(f.osmId, null); assert.equal(f.source, null);
  assert.ok(Math.abs(f.ringArea - 1218.0318373786286) < 1e-8); assert.match(f.evidence, /No precise OSM fountain or driveway footprint/);
  assert.equal(main.sourceEdge, 4); assert.match(main.evidence, /Photo-directed/); assert.equal(main.sourceNodeId, undefined);
  assert.equal(arcade.sourceEdge, 9); assert.equal(arcade.t, 1); assert.equal(arcade.sourceNodeId, 11264962679);
  assert.equal(arcade.sourceNode.tags.name, 'The Peninsula Arcade'); assert.equal(arcade.sourceNode.lon, 114.1721797); assert.equal(arcade.sourceNode.lat, 22.2952014);
  const h = peninsula.PENINSULA_HERITAGE_SITE;
  assert.ok(Math.abs(arcade.x - h.ring[20]) < 1e-8 && Math.abs(arcade.z - h.ring[21]) < 1e-8);
});

test('exact buildings have no road conflict and all five forecourt access ways remain connected', () => {
  for (const site of peninsula.PENINSULA_BUILDING_SITES) {
    assert.deepEqual(roadScan(site), { centre: [], corridor: [] }, site.key);
    assert.deepEqual(site.roadIds, []); assert.deepEqual(peninsula.peninsulaRoadRecords(site), []);
  }
  const forecourt = peninsula.PENINSULA_FORECOURT_SITE, expected = [44092, 44093, 44094, 44096, 44097];
  assert.deepEqual(roadScan(forecourt), { centre: expected, corridor: expected });
  assert.deepEqual(forecourt.roadIds, expected); assert.deepEqual(peninsula.peninsulaRoadRecords(forecourt).map((road) => road.recordIndex), expected);
  for (const road of peninsula.peninsulaRoadRecords(forecourt)) { assert.ok(road.width >= 5.2); assert.equal(road.flags, 0); }
});

test('photo-directed fountain island and its stone rim stay out of every preserved access-road corridor', () => {
  const h = peninsula.PENINSULA_HERITAGE_SITE, c = peninsula.PENINSULA_FOUNTAIN_CENTER, radii = peninsula.PENINSULA_FOUNTAIN_RADII;
  const local = peninsula.peninsulaWorldToLocal(h, c.x, c.z); let minimum = Infinity;
  for (let sample = 0; sample < 256; sample += 1) {
    const angle = sample / 256 * Math.PI * 2;
    const p = peninsula.peninsulaLocalToWorld(h, local.x + Math.cos(angle) * radii.x, local.z + Math.sin(angle) * radii.z);
    for (const road of peninsula.peninsulaRoadRecords(peninsula.PENINSULA_FORECOURT_SITE)) {
      for (let i = 2; i < road.points.length; i += 2) minimum = Math.min(minimum, pointSegment(p.x, p.z, [road.points[i - 2], road.points[i - 1]], [road.points[i], road.points[i + 1]]) - road.width * .5);
    }
  }
  assert.ok(minimum > .7, `fountain/asphalt gap only ${minimum}`); assert.match(c.evidence, /not claimed as an OSM fountain survey/);
});

test('no rendered street light occupies any Peninsula building or forecourt ring', () => {
  const finalLamps = clearedLampPositions();
  for (const site of peninsula.PENINSULA_GROUND_SITES) assert.deepEqual(finalLamps.filter((lamp) => inside(site.ring, lamp.x, lamp.z)).map((lamp) => lamp.index), [], site.key);
});

test('Peninsula shares a reproducible DTM-derived pad without relabelling it as a surveyed elevation', () => {
  const pad = terrain.peninsulaPadHeight();
  assert.equal(pad, terrain.HONG_KONG_TERRAIN_META.peninsulaPadHeight); assert.ok(Number.isFinite(pad));
  for (const site of peninsula.PENINSULA_GROUND_SITES) assert.equal(terrain.hongKongTerrainHeight(site.x, site.z), pad, site.key);
  const main = peninsula.PENINSULA_MAIN_ENTRANCE;
  assert.equal(terrain.hongKongTerrainHeight(main.x, main.z), pad);
  assert.equal(peninsula.peninsulaGroundHeightAt(main.x, main.z, 0, pad), pad);
  const x = peninsula.PENINSULA_HERITAGE_SITE.x - 130, z = peninsula.PENINSULA_HERITAGE_SITE.z + 85;
  assert.equal(terrain.hongKongTerrainHeight(x, z), terrain.rawHongKongTerrainHeight(x, z));
});

test('world authors arches, room panes, classical details, striped awnings, tower crown, helipad and fountain', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/peninsula-hotel-world.js'), 'utf8');
  for (const pattern of [/createRingWindowRows/, /Projecting heritage window jambs/, /Rounded ground-floor arcade and portico openings/, /Alternating Peninsula-green and ivory striped awnings/, /THE PENINSULA/, /curved central balcony/, /Alternating dressed-stone corner quoins/, /Dark vertical tower atrium glazing channel/, /stepped crown/, /PENINSULA_TOWER_HEIGHT/, /helipad/, /jets: 13/, /Photo-directed lobby stone walkway clear of preserved access roads/]) assert.match(world, pattern);
  assert.match(world, /harbourCityRingColliders/); assert.match(world, /peninsulaRoadRecords/); assert.match(world, /peninsulaTerrainHeightAt/);
  assert.doesNotMatch(world, /image-search|\.jpg|\.png|Business Insider|Lartisien/);
});

test('Peninsula is integrated into world ground, colliders, map and runtime entry without editing the bundle', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  const map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  assert.match(simple, /buildPeninsulaHotel/); assert.match(simple, /peninsulaHotel\.groundHeightAt/); assert.match(simple, /\.\.\.peninsulaHotel\.colliders/); assert.match(simple, /\.\.\.peninsulaHotel\.landmarks/);
  assert.match(map, /PENINSULA_HERITAGE_SITE\.ring/); assert.match(map, /PENINSULA_TOWER_SITE\.ring/); assert.match(map, /peninsulaHotelMapSite/);
  assert.match(index, /peninsulaHotel: world\.peninsulaHotel/);
});
