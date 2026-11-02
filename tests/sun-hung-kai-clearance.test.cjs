const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let shk, roads, lamps, clearance;
test.before(async () => {
  shk = await import('../js/cities/hongkong/sun-hung-kai-architecture.js');
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
function roadConflicts(ring, allowDocumentedCoveredDriveway = false) {
  const result = [], box = bounds(ring);
  for (const [recordIndex, road] of roads.entries()) {
    if (allowDocumentedCoveredDriveway && recordIndex === 48641) continue;
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
  tower: shk.SUN_HUNG_KAI_SITE.ring,
  podium: shk.SUN_HUNG_KAI_PODIUM_WORLD_RING,
  harbourRoadEntrance: shk.SUN_HUNG_KAI_ENTRANCE_FORECOURT_RING
});

test('Sun Hung Kai Centre clears traffic while retaining only the source-tagged covered service driveway below its open west podium', () => {
  assert.deepEqual(roadConflicts(rings().tower, true), []);
  assert.deepEqual(roadConflicts(rings().podium, true), []);
  assert.deepEqual(roadConflicts(rings().harbourRoadEntrance), []);
  assert.deepEqual(roadConflicts(rings().tower).map((conflict) => conflict.recordIndex), [48641]);
  assert.deepEqual(roads[48641], ['', 8.4, 1, 2, 0, [1752.1, 153.8, 1758, 153.3, 1759.3, 154.4, 1763.6, 204.4]]);
  const source = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/roads_minor_se.json'), 'utf8'));
  const way = source.elements.find((element) => element.type === 'way' && element.id === 1184418781);
  assert.equal(way.tags.highway, 'service'); assert.equal(way.tags.covered, 'yes'); assert.equal(way.tags.lanes, '2');
  assert.deepEqual(shk.SUN_HUNG_KAI_COVERED_DRIVEWAY_EDGES, [11, 12, 13, 14, 15]);
  assert.equal(shk.SUN_HUNG_KAI_COVERED_SERVICE_WAY_ID, 1184418781);
  assert.ok(shk.SUN_HUNG_KAI_COVERED_DRIVEWAY_CLEARANCE >= 7.2);
  assert.equal(shk.SUN_HUNG_KAI_COVERED_DRIVEWAY_COLUMN_INSET, 4.8);
  // The three west ground columns must be wholly outside the 8.4 m carriageway, not merely miss one driven line.
  const flat = roads[48641][5], a = [flat[4], flat[5]], b = [flat[6], flat[7]];
  const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz), tx = dx / length, tz = dz / length;
  const rx = tz, rz = -tx, ring = shk.SUN_HUNG_KAI_PODIUM_RING, edge = 13, i = edge * 2;
  const { nx, nz } = shk.sunHungKaiEdgeOutward(ring, edge);
  for (const t of [0.18, 0.50, 0.82]) {
    const localX = ring[i] + (ring[i + 2] - ring[i]) * t - nx * shk.SUN_HUNG_KAI_COVERED_DRIVEWAY_COLUMN_INSET;
    const localZ = ring[i + 1] + (ring[i + 3] - ring[i + 1]) * t - nz * shk.SUN_HUNG_KAI_COVERED_DRIVEWAY_COLUMN_INSET;
    const p = shk.sunHungKaiLocalToWorld(localX, localZ), along = ((p.x - a[0]) * tx + (p.z - a[1]) * tz) / length;
    const centreX = a[0] + dx * along, centreZ = a[1] + dz * along, offset = Math.abs((p.x - centreX) * rx + (p.z - centreZ) * rz);
    const conservativeColumnHalfWidth = Math.SQRT2 * 0.82 * 0.5;
    assert.ok(along > 0 && along < 1, `column ${t} lies beyond the covered segment`);
    assert.ok(offset - conservativeColumnHalfWidth > roads[48641][1] * 0.5,
      `column ${t} intrudes into a traffic lane: ${offset - conservativeColumnHalfWidth}`);
  }
});

test('Sun Hung Kai Centre tower, podium and Harbour Road entrance contain no rendered street lamps', () => {
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
