const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let pp, terrain, elevation, roads, lamps, clearance;
test.before(async () => {
  pp = await import('../js/cities/hongkong/two-pacific-place-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  elevation = await import('../js/cities/hongkong/road-elevation.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
});
function inside(ring, x, z) {
  let value = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) value = !value;
  }
  return value;
}
function pointSegmentDistance(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], lengthSq = dx * dx + dz * dz;
  const t = lengthSq ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / lengthSq)) : 0;
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function segmentsIntersect(a, b, c, d) {
  const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1];
  const denominator = cross(rx, rz, sx, sz), qx = c[0] - a[0], qz = c[1] - a[1];
  if (Math.abs(denominator) < 1e-9) return false;
  const t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator;
  return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9;
}
function segmentDistance(a, b, c, d) {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(pointSegmentDistance(...a, c, d), pointSegmentDistance(...b, c, d), pointSegmentDistance(...c, a, b), pointSegmentDistance(...d, a, b));
}
function bounds(ring) {
  const xs = ring.filter((_, index) => index % 2 === 0), zs = ring.filter((_, index) => index % 2 === 1);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
}
function roadConflicts(ring) {
  const result = [], box = bounds(ring);
  for (const [recordIndex, road] of roads.entries()) {
    const [name, width, , , flags, flat] = road;
    for (let i = 2; i + 1 < flat.length; i += 2) {
      const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]], margin = width * 0.5 + 1;
      if (Math.max(a[0], b[0]) < box.minX - margin || Math.min(a[0], b[0]) > box.maxX + margin
        || Math.max(a[1], b[1]) < box.minZ - margin || Math.min(a[1], b[1]) > box.maxZ + margin) continue;
      let conflict = inside(ring, ...a) || inside(ring, ...b);
      for (let j = 0; j < ring.length - 2 && !conflict; j += 2) conflict = segmentDistance(a, b, [ring[j], ring[j + 1]], [ring[j + 2], ring[j + 3]]) < width * 0.5 - 1e-6;
      if (conflict) result.push({ recordIndex, name, width, flags, segment: i / 2 - 1, a, b });
    }
  }
  return result;
}
const rings = () => ({
  tower: pp.TWO_PACIFIC_PLACE_SITE.ring,
  podium: pp.TWO_PACIFIC_PLACE_PODIUM_WORLD_RING,
  hotel: pp.TWO_PACIFIC_PLACE_HOTEL_FORECOURT_RING,
  office: pp.TWO_PACIFIC_PLACE_OFFICE_FORECOURT_RING
});

test('Two Pacific Place preserves the complete current OSM way and its minimum-area tower geometry', () => {
  const source = pp.TWO_PACIFIC_PLACE_OSM_SOURCE;
  assert.equal(source.id, 41498695); assert.equal(source.version, 14); assert.equal(source.geometry.length, 25);
  assert.deepEqual(source.geometry[0], source.geometry[24]); assert.equal(source.tags.height, '213'); assert.equal(source.tags['building:levels'], '57');
  assert.equal(pp.TWO_PACIFIC_PLACE_SITE.localRing.length, 48); assert.equal(pp.TWO_PACIFIC_PLACE_TOWER_RING.length, 50);
  assert.ok(Math.abs(pp.TWO_PACIFIC_PLACE_SITE.w - 88.5816189191869) < 1e-9);
  assert.ok(Math.abs(pp.TWO_PACIFIC_PLACE_SITE.d - 42.764852508730144) < 1e-9);
  assert.ok(Math.abs(pp.TWO_PACIFIC_PLACE_SITE.ry + 1.197150254305616) < 1e-12);
  assert.equal(pp.TWO_PACIFIC_PLACE_PODIUM_RING.length, 50);
});

test('Two Pacific Place keeps office, hotel, OSM and CTBUH conventions separate', () => {
  assert.equal(pp.TWO_PACIFIC_PLACE_OSM_HEIGHT, 213); assert.equal(pp.TWO_PACIFIC_PLACE_HEIGHT, 213.1);
  assert.equal(pp.TWO_PACIFIC_PLACE_OCCUPIED_HEIGHT, 197.8); assert.equal(pp.TWO_PACIFIC_PLACE_CTBUH_LEVELS, 57);
  assert.equal(pp.TWO_PACIFIC_PLACE_CURRENT_HOTEL_FLOORS, 56); assert.equal(pp.TWO_PACIFIC_PLACE_OFFICIAL_OFFICE_FLOORS, 27);
  assert.equal(pp.TWO_PACIFIC_PLACE_WONG_TOWER_STOREYS_ABOVE_PODIUM, 50);
  assert.equal(pp.TWO_PACIFIC_PLACE_VISUAL_COURSES, 50); assert.equal(pp.TWO_PACIFIC_PLACE_OFFICE_VISUAL_COURSES, 27);
  assert.equal(pp.TWO_PACIFIC_PLACE_HOTEL_VISUAL_COURSES, 23);
  assert.equal(pp.twoPacificPlaceFloorY(0), 24); assert.equal(pp.twoPacificPlaceFloorY(50), 197.8);
  assert.equal(pp.TWO_PACIFIC_PLACE_CROWN_BASE, 203.1); assert.ok(pp.TWO_PACIFIC_PLACE_CROWN_BASE < pp.TWO_PACIFIC_PLACE_HEIGHT);
  assert.deepEqual(pp.TWO_PACIFIC_PLACE_BLUE_END_EDGES, [0, 10, 11, 23]);
});

test('Two Pacific Place has separate non-OSM hotel and office entrance frames with exact DTM ground pads', () => {
  const meta = terrain.HONG_KONG_TERRAIN_META;
  const hotel = pp.TWO_PACIFIC_PLACE_HOTEL_ENTRANCE, office = pp.TWO_PACIFIC_PLACE_OFFICE_ENTRANCE;
  assert.equal(hotel.sourceEdge, 4); assert.equal(office.sourceEdge, 16); assert.equal(hotel.projection, 4); assert.equal(office.projection, 4);
  assert.ok(Math.abs(meta.twoPacificPlacePadHeight - 29.794768780862512) < 1e-9);
  assert.ok(Math.abs(meta.twoPacificPlaceHotelPadHeight - 36.18290299409062) < 1e-9);
  assert.ok(Math.abs(meta.twoPacificPlaceOfficePadHeight - 27.157740721831653) < 1e-9);
  assert.equal(terrain.hongKongTerrainHeight(hotel.x, hotel.z), meta.twoPacificPlaceHotelPadHeight);
  assert.equal(terrain.hongKongTerrainHeight(office.x, office.z), meta.twoPacificPlaceOfficePadHeight);
  assert.equal(terrain.hongKongTerrainHeight(pp.TWO_PACIFIC_PLACE_SITE.x, pp.TWO_PACIFIC_PLACE_SITE.z), meta.twoPacificPlacePadHeight);
  const grounds = { tower: meta.twoPacificPlacePadHeight + 0.12, hotel: meta.twoPacificPlaceHotelPadHeight, office: meta.twoPacificPlaceOfficePadHeight };
  assert.equal(pp.twoPacificPlaceGroundHeightAt(hotel.x, hotel.z, 999, grounds), grounds.hotel);
  assert.equal(pp.twoPacificPlaceGroundHeightAt(office.x, office.z, 999, grounds), grounds.office);
  assert.equal(pp.twoPacificPlaceGroundHeightAt(pp.TWO_PACIFIC_PLACE_SITE.x, pp.TWO_PACIFIC_PLACE_SITE.z, 999, grounds), grounds.tower);
  assert.equal(pp.twoPacificPlaceGroundHeightAt(0, 0, 999, grounds), 999);
});

test('Two Pacific Place preserves the only conflicting service driveway below an open podium overhang', () => {
  const site = rings();
  assert.deepEqual(roadConflicts(site.tower), []); assert.deepEqual(roadConflicts(site.hotel), []); assert.deepEqual(roadConflicts(site.office), []);
  const podium = roadConflicts(site.podium);
  assert.deepEqual(podium.map((entry) => [entry.recordIndex, entry.segment]), [[49182, 2], [49182, 3]]);
  assert.ok(podium.every((entry) => !entry.name && entry.width === 5.5 && entry.flags === 2));
  assert.deepEqual(roads[49182], ['', 5.5, 0, 1, 2, [464.8, 558.6, 477.9, 547.7, 481.3, 547.8, 492.4, 556.4, 492.7, 559.8, 485.3, 572.8]]);
  const source = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/roads_minor_sw.json'), 'utf8'));
  const way = source.elements.find((element) => element.type === 'way' && element.id === 1206722419);
  assert.deepEqual(way.tags, { highway: 'service', layer: '1', service: 'driveway' });
  assert.equal(pp.TWO_PACIFIC_PLACE_DRIVEWAY_SOURCE.id, 1206722419);
  let highestRoad = -Infinity;
  for (const conflict of podium) highestRoad = Math.max(highestRoad, ...elevation.roadRibbonProfileAtSegment(conflict.recordIndex, conflict.segment).heights);
  const soffit = terrain.HONG_KONG_TERRAIN_META.twoPacificPlacePadHeight + pp.TWO_PACIFIC_PLACE_PODIUM_BAND_BASE;
  assert.ok(soffit - highestRoad > pp.TWO_PACIFIC_PLACE_ROAD_VEHICLE_CLEARANCE,
    `insufficient overhang clearance: ${soffit - highestRoad}`);
  assert.ok(Math.abs(soffit - highestRoad - 5.374504722694418) < 1e-9);
});

test('Two Pacific Place ground glazing and every colonnade column remain outside the preserved carriageway', () => {
  const flat = roads[49182][5], ring = pp.TWO_PACIFIC_PLACE_TOWER_RING;
  let minimumEdgeDistance = Infinity;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, aLocal = [ring[i], ring[i + 1]], bLocal = [ring[i + 2], ring[i + 3]];
    const aWorld = pp.twoPacificPlaceLocalToWorld(...aLocal), bWorld = pp.twoPacificPlaceLocalToWorld(...bLocal);
    const a = [aWorld.x, aWorld.z], b = [bWorld.x, bWorld.z];
    for (let j = 2; j < flat.length; j += 2) minimumEdgeDistance = Math.min(minimumEdgeDistance,
      segmentDistance(a, b, [flat[j - 2], flat[j - 1]], [flat[j], flat[j + 1]]));
  }
  assert.ok(minimumEdgeDistance - 0.85 * 0.5 > roads[49182][1] * 0.5);
  for (let vertex = 0; vertex < ring.length / 2 - 1; vertex++) {
    const point = pp.twoPacificPlaceLocalToWorld(ring[vertex * 2], ring[vertex * 2 + 1]);
    for (let j = 2; j < flat.length; j += 2) {
      const distance = pointSegmentDistance(point.x, point.z, [flat[j - 2], flat[j - 1]], [flat[j], flat[j + 1]]);
      assert.ok(distance - Math.SQRT2 * 1.08 * 0.5 > roads[49182][1] * 0.5, `column ${vertex} enters carriageway`);
    }
  }
});

test('Two Pacific Place tower, overhang and both arrival forecourts contain no rendered street lamps', () => {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed);
  for (const [name, ring] of Object.entries(rings())) {
    const conflicts = [];
    for (let index = 0; index < lamps.length; index++) {
      if (suppressed.has(index)) continue;
      const lamp = lamps[index], override = overrides.get(index);
      const x = lamp[0] + (override?.[1] || 0) / 100, z = lamp[1] + (override?.[2] || 0) / 100;
      if (inside(ring, x, z)) conflicts.push(index);
    }
    assert.deepEqual(conflicts, [], `${name} contains rendered lamps`);
  }
});

test('Two Pacific Place collider helpers emit closed finite ring geometry', () => {
  const colliders = pp.twoPacificPlaceRingColliders(pp.TWO_PACIFIC_PLACE_TOWER_RING, 24, 213.1);
  assert.equal(colliders.length, 24);
  for (const collider of colliders) {
    assert.equal(collider.shape, 'box'); assert.equal(collider.minY, 24); assert.equal(collider.maxY, 213.1);
    for (const key of ['x', 'z', 'w', 'd', 'ry', 'minX', 'maxX', 'minZ', 'maxZ']) assert.ok(Number.isFinite(collider[key]), key);
    assert.ok(collider.minX <= collider.x && collider.maxX >= collider.x); assert.ok(collider.minZ <= collider.z && collider.maxZ >= collider.z);
  }
});
