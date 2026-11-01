const assert = require('node:assert/strict');
const test = require('node:test');

let site;
let roads;
let lamps;
let clearance;

test.before(async () => {
  site = (await import('../js/cities/hongkong/two-ifc-architecture.js')).TWO_IFC_SITE;
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
});

function inside(x, z) {
  const ring = site.ring;
  let value = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) value = !value;
  }
  return value;
}

function pointSegmentDistance(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, lengthSq = dx * dx + dz * dz;
  const t = lengthSq ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq)) : 0;
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
}

function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function segmentsIntersect(a, b, c, d) {
  const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1];
  const denominator = cross(rx, rz, sx, sz);
  const qpx = c[0] - a[0], qpz = c[1] - a[1];
  if (Math.abs(denominator) < 1e-9) {
    if (Math.abs(cross(qpx, qpz, rx, rz)) > 1e-7) return false;
    const rr = rx * rx + rz * rz;
    if (!rr) return Math.hypot(a[0] - c[0], a[1] - c[1]) < 1e-7;
    const t0 = (qpx * rx + qpz * rz) / rr, t1 = t0 + (sx * rx + sz * rz) / rr;
    return Math.max(Math.min(t0, t1), 0) <= Math.min(Math.max(t0, t1), 1) + 1e-9;
  }
  const t = cross(qpx, qpz, sx, sz) / denominator;
  const u = cross(qpx, qpz, rx, rz) / denominator;
  return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9;
}

function segmentDistance(a, b, c, d) {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(
    pointSegmentDistance(a[0], a[1], c[0], c[1], d[0], d[1]),
    pointSegmentDistance(b[0], b[1], c[0], c[1], d[0], d[1]),
    pointSegmentDistance(c[0], c[1], a[0], a[1], b[0], b[1]),
    pointSegmentDistance(d[0], d[1], a[0], a[1], b[0], b[1])
  );
}

test('Two IFC keeps building-priority clearance without moving any current road or lamp', () => {
  const roadConflicts = [];
  for (const [wayId, road] of roads.entries()) {
    const [name, width, , , , flat] = road;
    for (let i = 2; i + 1 < flat.length; i += 2) {
      const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]];
      const margin = width * 0.5 + 1;
      if (Math.max(a[0], b[0]) < site.bounds.minX - margin || Math.min(a[0], b[0]) > site.bounds.maxX + margin
        || Math.max(a[1], b[1]) < site.bounds.minZ - margin || Math.min(a[1], b[1]) > site.bounds.maxZ + margin) continue;
      let conflict = inside(...a) || inside(...b);
      for (let j = 0; j < site.ring.length && !conflict; j += 2) {
        const next = (j + 2) % site.ring.length;
        const c = [site.ring[j], site.ring[j + 1]], d = [site.ring[next], site.ring[next + 1]];
        conflict = segmentDistance(a, b, c, d) < width * 0.5 - 1e-6;
      }
      if (conflict) roadConflicts.push({ wayId, name, segment: i / 2 - 1 });
    }
  }
  assert.deepEqual(roadConflicts, [], 'these roads would need building-priority local adjustment');

  const overrides = new Map(clearance.overrides.map((row) => [row[0], row]));
  const suppressed = new Set(clearance.suppressed);
  const lampConflicts = [];
  for (let index = 0; index < lamps.length; index++) {
    if (suppressed.has(index)) continue;
    const lamp = lamps[index], override = overrides.get(index);
    const x = lamp[0] + (override?.[1] || 0) / 100;
    const z = lamp[1] + (override?.[2] || 0) / 100;
    if (inside(x, z)) lampConflicts.push(index);
  }
  assert.deepEqual(lampConflicts, [], 'these lamps would need relocation or suppression for the authored footprint');
});
