const assert = require('node:assert/strict');
const test = require('node:test');
let central, roads, lamps, clearance;
test.before(async () => {
  central = await import('../js/cities/hongkong/central-plaza-architecture.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
});
function inside(x, z) {
  const ring = central.CENTRAL_PLAZA_SITE.ring; let value = false;
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
function nearestRoadClearance(x, z) {
  let nearest = Infinity;
  for (const road of roads) {
    const width = road[1], flat = road[5];
    for (let i = 2; i + 1 < flat.length; i += 2) {
      const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]];
      if (Math.max(a[0], b[0]) < x - 40 || Math.min(a[0], b[0]) > x + 40 || Math.max(a[1], b[1]) < z - 40 || Math.min(a[1], b[1]) > z + 40) continue;
      nearest = Math.min(nearest, pointSegmentDistance(x, z, a, b) - width * 0.5);
    }
  }
  return nearest;
}
test('Central Plaza preserves its building-first footprint with zero formal-road conflicts', () => {
  const site = central.CENTRAL_PLAZA_SITE, conflicts = [];
  for (const [wayId, road] of roads.entries()) {
    const [name, width, , , flags, flat] = road;
    for (let i = 2; i + 1 < flat.length; i += 2) {
      const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]], margin = width * 0.5 + 1;
      if (Math.max(a[0], b[0]) < site.bounds.minX - margin || Math.min(a[0], b[0]) > site.bounds.maxX + margin
        || Math.max(a[1], b[1]) < site.bounds.minZ - margin || Math.min(a[1], b[1]) > site.bounds.maxZ + margin) continue;
      let conflict = inside(...a) || inside(...b);
      for (let j = 0; j < site.ring.length && !conflict; j += 2) {
        const next = (j + 2) % site.ring.length;
        conflict = segmentDistance(a, b, [site.ring[j], site.ring[j + 1]], [site.ring[next], site.ring[next + 1]]) < width * 0.5 - 1e-6;
      }
      if (conflict) conflicts.push({ wayId, name, width, flags, segment: i / 2 - 1 });
    }
  }
  assert.deepEqual(conflicts, []);
  const i = 18, ring = central.CENTRAL_PLAZA_LOCAL_RING;
  const x = (ring[i] + ring[i + 2]) * 0.5, z = (ring[i + 1] + ring[i + 3]) * 0.5;
  const length = Math.hypot(x, z), nx = x / length, nz = z / length;
  const canopy = central.centralPlazaLocalToWorld(x + nx * 1.8, z + nz * 1.8);
  assert.ok(nearestRoadClearance(canopy.x, canopy.z) > 2, 'entrance canopy must not encroach on a formal carriageway');
});
test('Central Plaza footprint contains no rendered street lamp', () => {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row]));
  const suppressed = new Set(clearance.suppressed), conflicts = [];
  for (let index = 0; index < lamps.length; index++) {
    if (suppressed.has(index)) continue;
    const lamp = lamps[index], override = overrides.get(index);
    const x = lamp[0] + (override?.[1] || 0) / 100, z = lamp[1] + (override?.[2] || 0) / 100;
    if (inside(x, z)) conflicts.push(index);
  }
  assert.deepEqual(conflicts, []);
});
