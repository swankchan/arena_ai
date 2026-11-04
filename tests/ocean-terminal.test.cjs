const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let hc, terrain, elevation, roads, lamps, clearance, landmarkSite;
test.before(async () => {
  hc = await import('../js/cities/hongkong/harbour-city-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  elevation = await import('../js/cities/hongkong/road-elevation.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
  landmarkSite = await import('../js/cities/hongkong/landmark-site.js');
});
function inside(ring, x, z) { let value = false; for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) { const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) value = !value; } return value; }
function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function intersects(a, b, c, d) { const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1], denominator = cross(rx, rz, sx, sz); if (Math.abs(denominator) < 1e-9) return false; const qx = c[0] - a[0], qz = c[1] - a[1], t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator; return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9; }
function bounds(ring) { const xs = ring.filter((_, i) => i % 2 === 0), zs = ring.filter((_, i) => i % 2 === 1); return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) }; }
function conflicts(ring) { const result = new Set(), box = bounds(ring); for (const [id, road] of roads.entries()) { const flat = road[5]; for (let i = 2; i < flat.length; i += 2) { const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]]; if (Math.max(a[0], b[0]) < box.minX || Math.min(a[0], b[0]) > box.maxX || Math.max(a[1], b[1]) < box.minZ || Math.min(a[1], b[1]) > box.maxZ) continue; let hit = inside(ring, ...a) || inside(ring, ...b); for (let j = 0; j < ring.length - 2 && !hit; j += 2) hit = intersects(a, b, [ring[j], ring[j + 1]], [ring[j + 2], ring[j + 3]]); if (hit) result.add(id); } } return [...result]; }

test('Ocean Terminal preserves the current OSM way and every local snapshot coordinate', () => {
  const site = hc.OCEAN_TERMINAL_SITE, source = site.source;
  const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/landmarks.json'), 'utf8'));
  const raw = snapshot.elements.find((element) => element.id === 112453139);
  assert.equal(source.id, 112453139); assert.equal(source.version, 14); assert.equal(source.sourceTimestamp, '2026-03-12T12:31:43Z');
  assert.equal(source.tags.height, '24'); assert.equal(source.tags['building:levels'], '4'); assert.equal(source.tags['roof:height'], '6');
  assert.equal(source.geometry.length, raw.geometry.length); assert.deepEqual(source.tags, raw.tags);
  source.geometry.forEach((point, index) => { assert.equal(point.lon, raw.geometry[index].lon); assert.equal(point.lat, raw.geometry[index].lat); });
  assert.equal(site.ring.length / 2 - 1, 61); assert.ok(Math.abs(site.ringArea - 23201.48) < .02);
  assert.match(source.sourceUrl, /way\/112453139\/full\.json$/);
});
test('Ocean Terminal and all Harbour City components share the exact app georef', () => {
  const site = hc.OCEAN_TERMINAL_SITE;
  assert.ok(Math.abs(site.x - 719.9643867794192) < 1e-9); assert.ok(Math.abs(site.z + 1457.477515581999) < 1e-9);
  assert.ok(Math.abs(site.w - 382.2894) < .001); assert.ok(Math.abs(site.d - 127.9378) < .001);
  const localBounds = bounds(site.localRing);
  assert.ok(Math.abs(localBounds.minX + 191.1447152993493) < 1e-9); assert.ok(Math.abs(localBounds.maxX - 191.14471529934937) < 1e-9);
  assert.ok(Math.abs(localBounds.minZ + 63.96891167013348) < 1e-9); assert.ok(Math.abs(localBounds.maxZ - 63.968911670133494) < 1e-9);
  for (const source of hc.HARBOUR_CITY_SITES.map((s) => s.source)) for (const g of source.geometry) {
    const x = (g.lon - 114.1596) * 103056.81753522092, z = -(g.lat - 22.2819) * 110734.09626824585;
    const siteForPoint = hc.HARBOUR_CITY_SITES.find((s) => s.source === source), local = hc.harbourCityWorldToLocal(siteForPoint, x, z), roundtrip = hc.harbourCityLocalToWorld(siteForPoint, local.x, local.z);
    assert.ok(Math.hypot(roundtrip.x - x, roundtrip.z - z) < 1e-9);
  }
});
test('LCX and the 2017 extension retain official identity and design evidence', () => {
  assert.equal(hc.OCEAN_TERMINAL_EXTENSION_LEVELS, 5); assert.equal(hc.OCEAN_TERMINAL_EXTENSION_COMPLETION, 2017);
  assert.equal(hc.OCEAN_TERMINAL_EXTENSION_ARCHITECT, 'Foster + Partners'); assert.equal(hc.OCEAN_TERMINAL_EXTENSION_EXECUTIVE_ARCHITECT, 'Ronald Lu & Partners');
  assert.equal(hc.OCEAN_TERMINAL_EXTENSION_GFA_SQM, 9290);
  assert.ok(hc.HARBOUR_CITY_RESEARCH_SOURCES.some((source) => /harbourcity\.com\.hk\/en\/shop\/lcx/.test(source.url) && /L3 OT300/.test(source.evidence)));
  assert.ok(hc.HARBOUR_CITY_RESEARCH_SOURCES.some((source) => /fosterandpartners\.com/.test(source.url) && /cascading|cantilevered/.test(source.evidence)));
  assert.ok(hc.HARBOUR_CITY_RESEARCH_SOURCES.some((source) => /rlp\.asia/.test(source.url) && /Five-storey/.test(source.evidence)));
});
test('Ocean Terminal crossing list is recomputed from the unchanged territory road data', () => {
  const expected = [40855, 40856, 40857, 40858, 40859, 48323, 48536, 51350, 51351, 51352, 51355, 51356];
  assert.deepEqual(conflicts(hc.OCEAN_TERMINAL_SITE.ring), expected); assert.deepEqual(hc.OCEAN_TERMINAL_SITE.roadIds, expected);
  const records = hc.harbourCityRoadRecords(hc.OCEAN_TERMINAL_SITE);
  assert.equal(records.length, expected.length);
  for (const road of records) { assert.equal(road.points, roads[road.recordIndex][5]); assert.equal(road.width, roads[road.recordIndex][1]); assert.equal(road.flags, roads[road.recordIndex][4]); }
  assert.deepEqual(records.filter((road) => road.flags & 2).map((road) => road.recordIndex), [40856, 40857, 40858, 40859]);
});
test('Eight-metre road-safe terminal soffit clears every original crossing profile', () => {
  const site = hc.OCEAN_TERMINAL_SITE, base = terrain.harbourCityPadHeight(site.key); let minimum = Infinity, samples = 0;
  for (const road of hc.harbourCityRoadRecords(site)) for (let seg = 0; seg + 3 < road.points.length; seg += 2) {
    const ax = road.points[seg], az = road.points[seg + 1], bx = road.points[seg + 2], bz = road.points[seg + 3], length = Math.hypot(bx - ax, bz - az), steps = Math.max(1, Math.ceil(length));
    for (let step = 0; step <= steps; step++) {
      const t = step / steps, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      if (!inside(site.ring, x, z)) continue;
      const clearance = base + hc.OCEAN_TERMINAL_ROAD_SOFFIT - hc.HARBOUR_CITY_ROAD_LINTEL_DEPTH - elevation.roadRibbonHeightAtSegment(road.recordIndex, seg >> 1, t);
      minimum = Math.min(minimum, clearance); samples++;
    }
  }
  assert.ok(samples > 100); assert.ok(minimum >= hc.HARBOUR_CITY_ROAD_VEHICLE_CLEARANCE, `minimum clearance ${minimum}`);
  assert.equal(hc.OCEAN_TERMINAL_ROAD_SOFFIT, 8);
});
test('Harbour City pads never raise a crossing carriageway and remain DTM traceable', () => {
  const site = hc.OCEAN_TERMINAL_SITE, pad = terrain.harbourCityPadHeight(site.key);
  assert.ok(Number.isFinite(pad)); assert.ok(pad >= terrain.rawHongKongTerrainHeight(site.x, site.z));
  const entrance = hc.OCEAN_TERMINAL_MAIN_ENTRANCE;
  assert.equal(entrance.sourceEdge, 4);
  const groundSample = { x: entrance.x - entrance.nx * .5, z: entrance.z - entrance.nz * .5 };
  if (!hc.harbourCityPointInRoadCorridor(site, groundSample.x, groundSample.z)) assert.ok(terrain.hongKongTerrainHeight(groundSample.x, groundSample.z) >= pad);
  for (const road of hc.harbourCityRoadRecords(site)) for (let i = 0; i < road.points.length; i += 2) {
    const x = road.points[i], z = road.points[i + 1]; if (!inside(site.ring, x, z)) continue;
    assert.equal(terrain.hongKongTerrainHeight(x, z), terrain.rawHongKongTerrainHeight(x, z));
  }
  assert.equal(terrain.HONG_KONG_TERRAIN_META.harbourCityPadHeights.oceanTerminal, pad);
});
test('No current or relocated street lamp lies inside any Harbour City source footprint', () => {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed), hits = [];
  for (let index = 0; index < lamps.length; index++) {
    if (suppressed.has(index)) continue; const lamp = lamps[index], override = overrides.get(index), x = lamp[0] + (override?.[1] || 0) / 100, z = lamp[1] + (override?.[2] || 0) / 100;
    for (const site of hc.HARBOUR_CITY_SITES) if (landmarkSite.pointInFlatRing(site.ring, x, z)) hits.push([site.key, index]);
  }
  assert.deepEqual(hits, []);
});
test('Ocean Terminal model contains authored terminal, LCX, cascading decks and marine details', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/ocean-terminal-world.js'), 'utf8');
  assert.match(source, /OCEAN_TERMINAL_EXTENSION_LEVELS/); assert.match(source, /addGlazedLevel\(group, oldCore, 13, OCEAN_TERMINAL_MAIN_ROOF/);
  assert.match(source, /LCX — L3/); assert.match(source, /addTerraceRail/); assert.match(source, /addGrandSteps/);
  assert.match(source, /Ocean Terminal Deck roof lawn/); assert.match(source, /Mooring bitts/); assert.match(source, /Rooftop car-park painted bays/);
  assert.match(source, /photo-directed modelling plane, not a surveyed structural gridline/);
  assert.doesNotMatch(source, /image-search|\.jpg|\.png/);
});
test('Ocean Terminal is integrated without replacing the territory road / ground systems', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8'), map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8');
  assert.match(simple, /buildOceanTerminal/); assert.match(simple, /\.\.\.oceanTerminal\.colliders/); assert.match(simple, /oceanTerminal\.groundHeightAt/);
  assert.match(map, /Ocean Terminal · LCX/); assert.match(map, /h: 24, authored: true/);
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/ocean-terminal-world.js'), 'utf8');
  assert.match(world, /harbourCityRingColliders\(oldCore, base \+ 8/); assert.match(world, /harbourCityGroundHeightAt/);
});
