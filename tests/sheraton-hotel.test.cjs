const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let sheraton, terrain, roads, lamps, clearance, siteUtils;
test.before(async () => {
  sheraton = await import('../js/cities/hongkong/sheraton-hotel-architecture.js');
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
    const flat = road[5], margin = road[1] * .5 + .35;
    for (let i = 2; i < flat.length; i += 2) {
      const a = [flat[i - 2], flat[i - 1]], c = [flat[i], flat[i + 1]];
      if (Math.max(a[0], c[0]) < b.minX - margin || Math.min(a[0], c[0]) > b.maxX + margin || Math.max(a[1], c[1]) < b.minZ - margin || Math.min(a[1], c[1]) > b.maxZ + margin) continue;
      let hit = inside(site.ring, ...a) || inside(site.ring, ...c), distance = hit ? 0 : Infinity;
      for (let j = 2; j < site.ring.length; j += 2) {
        const d = [site.ring[j - 2], site.ring[j - 1]], e = [site.ring[j], site.ring[j + 1]];
        if (intersects(a, c, d, e)) hit = true;
        distance = Math.min(distance, segmentDistance(a, c, d, e));
      }
      if (hit) centre.add(id); if (distance < margin) corridor.add(id);
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

test('Sheraton preserves exact current OSM way 124697432 v9 and all source tags', () => {
  const s = sheraton.SHERATON_SITE;
  assert.equal(s.osmId, 124697432); assert.equal(s.source.version, 9); assert.equal(s.source.sourceTimestamp, '2026-04-06T06:18:34Z');
  assert.equal(s.source.geometry.length, 16); assert.equal(s.source.nodes.length, 16); assert.equal(s.source.nodes.at(-1), s.source.nodes[0]);
  assert.equal(s.source.nodes[7], 8974745438); assert.equal(s.source.tags['building:levels'], '17'); assert.equal(s.source.tags.start_date, '1974-02-18');
  assert.equal(s.source.tags['addr:housenumber'], '20'); assert.equal(s.source.tags.height, undefined);
  assert.ok(Math.abs(s.ringArea - 2813.905410766136) < 1e-8); assert.equal(s.localRing.length, s.ring.length);
  assert.equal(sheraton.SHERATON_GROUND_SITES.length, 1);
});

test('unverified height is not invented as an official fact and official Level 18 amenities stay separate', () => {
  assert.equal(sheraton.SHERATON_MODEL_HEIGHT, 72); assert.equal(sheraton.SHERATON_OSM_LEVELS, 17);
  assert.equal(sheraton.SHERATON_VISIBLE_ROOM_ROWS, 16); assert.equal(sheraton.SHERATON_POOL_LEVEL, 18); assert.equal(sheraton.SHERATON_JACUZZI_COUNT, 3);
  assert.match(sheraton.SHERATON_UPPER_SITE.evidence, /not claimed as a surveyed upper-floor plan/);
  assert.ok(sheraton.SHERATON_RESEARCH_SOURCES.some((s) => /experiences/.test(s.url) && /Level 18/.test(s.evidence) && /three heated Jacuzzis/.test(s.evidence)));
  assert.ok(sheraton.SHERATON_RESEARCH_SOURCES.some((s) => /124697432/.test(s.url) && /no height tag/.test(s.evidence) && /72 m is only/.test(s.evidence)));
});

test('photo-directed upper slab remains inside the exact irregular podium ring', () => {
  const upper = sheraton.SHERATON_UPPER_SITE, source = sheraton.SHERATON_SITE;
  assert.equal(upper.photoDirected, true); assert.equal(upper.osmId, null); assert.equal(upper.source, null);
  assert.equal(upper.w, 84); assert.equal(upper.d, 14);
  for (let edge = 0; edge < upper.localRing.length / 2 - 1; edge++) for (let sample = 0; sample <= 40; sample++) {
    const t = sample / 40, i = edge * 2, x = upper.localRing[i] + (upper.localRing[i + 2] - upper.localRing[i]) * t, z = upper.localRing[i + 1] + (upper.localRing[i + 3] - upper.localRing[i + 1]) * t;
    assert.ok(inside(source.localRing, x, z), `upper slab outside podium at ${x},${z}`);
  }
});

test('Nathan Road hotel entrance is not confused with the MTR J4 source node', () => {
  const e = sheraton.SHERATON_MAIN_ENTRANCE, mtr = sheraton.SHERATON_SUBWAY_J4_NODE;
  assert.equal(e.sourceEdge, 3); assert.equal(e.t, .5); assert.match(e.evidence, /Photo-directed/); assert.match(e.evidence, /not the railway=subway_entrance J4/);
  assert.equal(mtr.id, 8974745438); assert.equal(mtr.tags.railway, 'subway_entrance'); assert.equal(mtr.tags.ref, 'J4');
  assert.equal(e.sourceNodeId, undefined); assert.equal(sheraton.SHERATON_SITE.source.nodes[7], mtr.id); assert.equal(sheraton.SHERATON_CANOPY_SOFFIT, 5.2);
});

test('exact podium and photo-directed canopy have no road-centre or carriageway-corridor conflict', () => {
  assert.deepEqual(roadScan(sheraton.SHERATON_SITE), { centre: [], corridor: [] });
  assert.deepEqual(roadScan(sheraton.SHERATON_CANOPY_CLEARANCE_SITE), { centre: [], corridor: [] });
  assert.deepEqual(sheraton.SHERATON_SITE.roadIds, []); assert.deepEqual(sheraton.sheratonRoadRecords(), []);
});

test('no rendered street light occupies the Sheraton building or entrance canopy', () => {
  const finalLamps = clearedLampPositions();
  for (const site of [sheraton.SHERATON_SITE, sheraton.SHERATON_CANOPY_CLEARANCE_SITE]) assert.deepEqual(finalLamps.filter((lamp) => inside(site.ring, lamp.x, lamp.z)).map((lamp) => lamp.index), []);
});

test('Sheraton uses a traceable local DTM pad and leaves outside terrain unchanged', () => {
  const pad = terrain.sheratonPadHeight(); assert.equal(pad, terrain.HONG_KONG_TERRAIN_META.sheratonPadHeight); assert.ok(Number.isFinite(pad));
  const p = sheraton.sheratonLocalToWorld(sheraton.SHERATON_SITE, 0, 25);
  assert.equal(terrain.hongKongTerrainHeight(p.x, p.z), pad); assert.equal(sheraton.sheratonGroundHeightAt(p.x, p.z, 0, pad), pad);
  const e = sheraton.SHERATON_MAIN_ENTRANCE; assert.equal(terrain.hongKongTerrainHeight(e.x, e.z), pad);
  const x = sheraton.SHERATON_SITE.x + 130, z = sheraton.SHERATON_SITE.z - 90;
  assert.equal(terrain.hongKongTerrainHeight(x, z), terrain.rawHongKongTerrainHeight(x, z));
});

test('world authors the room grid, current sign blade, entrance and official rooftop amenities', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/sheraton-hotel-world.js'), 'utf8');
  for (const pattern of [/createRingWindowRows/, /projecting beige concrete room grid/, /current exterior's identifying west-end blade/, /circular S emblem/, /Vertical SHERATON blade lettering/, /Nathan Road lobby doors/, /Warm Sheraton canopy downlights/, /Level 18 outdoor temperature-controlled pool/, /SHERATON_JACUZZI_COUNT/, /Rooftop sundeck lounge chairs/, /harbourCityRingColliders/, /sheratonTerrainHeightAt/]) assert.match(world, pattern);
  assert.doesNotMatch(world, /image-search|\.jpg|\.png/);
});

test('Sheraton is integrated into world, ground, road profiles, map and runtime entry', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  const road = fs.readFileSync(path.join(root, 'js/cities/hongkong/road-elevation.js'), 'utf8');
  const map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  assert.match(simple, /buildSheratonHotel/); assert.match(simple, /sheratonHotel\.groundHeightAt/); assert.match(simple, /\.\.\.sheratonHotel\.colliders/); assert.match(simple, /\.\.\.sheratonHotel\.landmarks/);
  assert.match(road, /SHERATON_GROUND_RINGS/); assert.match(map, /SHERATON_SITE\.ring/); assert.match(map, /sheratonHotelMapSite/); assert.match(index, /sheratonHotel: world\.sheratonHotel/);
});
