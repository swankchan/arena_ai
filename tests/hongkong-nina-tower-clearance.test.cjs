const assert = require('node:assert/strict');
const test = require('node:test');
let nina, roads, lamps, clearance, elevation, terrain;
test.before(async () => {
  nina = await import('../js/cities/hongkong/nina-tower-architecture.js');
  elevation = await import('../js/cities/hongkong/road-elevation.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
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
function roadConflicts(site) {
  const conflicts = [], { ring, bounds } = site;
  for (const [wayId, road] of roads.entries()) {
    const [name, width, , , flags, flat] = road;
    for (let i = 2; i + 1 < flat.length; i += 2) {
      const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]], margin = width * 0.5 + 1;
      if (Math.max(a[0], b[0]) < bounds.minX - margin || Math.min(a[0], b[0]) > bounds.maxX + margin
        || Math.max(a[1], b[1]) < bounds.minZ - margin || Math.min(a[1], b[1]) > bounds.maxZ + margin) continue;
      let conflict = inside(ring, ...a) || inside(ring, ...b);
      for (let j = 0; j < ring.length - 2 && !conflict; j += 2) {
        conflict = segmentDistance(a, b, [ring[j], ring[j + 1]], [ring[j + 2], ring[j + 3]]) < width * 0.5 - 1e-6;
      }
      if (conflict) conflicts.push({ wayId, name, width, flags, segment: i / 2 - 1 });
    }
  }
  return conflicts;
}

test('Nina Tower keeps its main shaft clear and reserves only unnamed service/tunnel corridors below the elevated complex', () => {
  assert.deepEqual(roadConflicts(nina.NINA_TOWER_MAIN_SITE), []);
  const hotel = roadConflicts(nina.NINA_TOWER_HOTEL_SITE);
  assert.equal(hotel.length, 9); assert.ok(hotel.every((entry) => !entry.name && !(entry.flags & 6)));
  assert.deepEqual([...new Set(hotel.map((entry) => entry.wayId))].sort((a, b) => a - b), [52752, 52761, 61113, 61114, 61117, 61120]);
  const podium = roadConflicts(nina.NINA_TOWER_PODIUM_SITE), surface = podium.filter((entry) => !(entry.flags & 4)), tunnels = podium.filter((entry) => entry.flags & 4);
  assert.equal(podium.length, 52); assert.equal(surface.length, 12); assert.equal(tunnels.length, 40);
  assert.ok(podium.every((entry) => !entry.name && !(entry.flags & 2)));
  assert.deepEqual([...new Set(surface.map((entry) => entry.wayId))].sort((a, b) => a - b), [52752, 52761, 61113, 61114, 61117, 61120, 63156, 63157]);
  let highestRenderedRoad = -Infinity;
  for (const conflict of surface) {
    const profile = elevation.roadRibbonProfileAtSegment(conflict.wayId, conflict.segment);
    highestRenderedRoad = Math.max(highestRenderedRoad, ...profile.heights);
  }
  const pad = terrain.HONG_KONG_TERRAIN_META.ninaTowerPadHeight;
  const lintelSoffit = pad + nina.NINA_TOWER_PODIUM_SOFFIT - 0.15 - 0.36 * 0.5;
  const occupiedSoffit = pad + nina.NINA_TOWER_PODIUM_SOFFIT;
  assert.ok(lintelSoffit - highestRenderedRoad > 4.5,
    `portal lintel clearance ${lintelSoffit - highestRenderedRoad} m must retain the 4.5 m vehicle envelope`);
  assert.ok(occupiedSoffit - highestRenderedRoad > 4.5, 'occupied mall clears the rendered service-road profiles');
  assert.ok(pad + nina.NINA_TOWER_PODIUM_ROOF - highestRenderedRoad > 4.5, 'hotel/podium body clears the rendered roads');
  assert.ok(nina.NINA_TOWER_PODIUM_ROOF > nina.NINA_TOWER_PODIUM_SOFFIT);
});

test('Nina Tower ground openings cover every surface-road crossing and no rendered lamp is inside the complex', () => {
  const ring = nina.NINA_TOWER_PODIUM_SITE.ring, openEdges = [];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, a = [ring[i], ring[i + 1]], b = [ring[i + 2], ring[i + 3]]; let conflict = false;
    for (const road of roads) {
      if (road[4] & 4) continue;
      const width = road[1], flat = road[5];
      for (let j = 2; j + 1 < flat.length && !conflict; j += 2) {
        const c = [flat[j - 2], flat[j - 1]], d = [flat[j], flat[j + 1]], margin = width * 0.5 + 0.5;
        if (Math.max(c[0], d[0]) < Math.min(a[0], b[0]) - margin || Math.min(c[0], d[0]) > Math.max(a[0], b[0]) + margin
          || Math.max(c[1], d[1]) < Math.min(a[1], b[1]) - margin || Math.min(c[1], d[1]) > Math.max(a[1], b[1]) + margin) continue;
        conflict = segmentDistance(a, b, c, d) < margin;
      }
      if (conflict) break;
    }
    if (conflict) openEdges.push(edge);
  }
  assert.deepEqual(openEdges, [...nina.NINA_TOWER_PODIUM_VEHICLE_PORTAL_EDGES]);
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed);
  for (const site of [nina.NINA_TOWER_MAIN_SITE, nina.NINA_TOWER_HOTEL_SITE, nina.NINA_TOWER_PODIUM_SITE]) {
    const conflicts = [];
    for (let index = 0; index < lamps.length; index++) {
      if (suppressed.has(index)) continue;
      const lamp = lamps[index], override = overrides.get(index);
      const x = lamp[0] + (override?.[1] || 0) / 100, z = lamp[1] + (override?.[2] || 0) / 100;
      if (inside(site.ring, x, z)) conflicts.push(index);
    }
    assert.deepEqual(conflicts, [], `${site.englishName} contains rendered lamps`);
  }
});
