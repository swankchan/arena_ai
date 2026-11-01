const assert = require('node:assert/strict');
const test = require('node:test');
let k11, roads, lamps, clearance, elevation, terrain;
test.before(async () => {
  k11 = await import('../js/cities/hongkong/k11-atelier-architecture.js');
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
function bounds(ring) {
  const xs = ring.filter((_, index) => index % 2 === 0), zs = ring.filter((_, index) => index % 2 === 1);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
}
function roadConflicts(ring) {
  const result = [], box = bounds(ring);
  for (const [wayId, road] of roads.entries()) {
    const [name, width, , , flags, flat] = road;
    for (let i = 2; i + 1 < flat.length; i += 2) {
      const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]], margin = width * 0.5 + 1;
      if (Math.max(a[0], b[0]) < box.minX - margin || Math.min(a[0], b[0]) > box.maxX + margin
        || Math.max(a[1], b[1]) < box.minZ - margin || Math.min(a[1], b[1]) > box.maxZ + margin) continue;
      let conflict = inside(ring, ...a) || inside(ring, ...b);
      for (let j = 0; j < ring.length - 2 && !conflict; j += 2) conflict = segmentDistance(a, b, [ring[j], ring[j + 1]], [ring[j + 2], ring[j + 3]]) < width * 0.5 - 1e-6;
      if (conflict) result.push({ wayId, name, width, flags, segment: i / 2 - 1, a, b });
    }
  }
  return result;
}
function canopyRing() {
  const e = k11.K11_ATELIER_ENTRANCE, cs = Math.cos(e.ry), sn = Math.sin(e.ry), ring = [];
  for (const [x, z] of [[-5.15, 0], [5.15, 0], [5.15, 3.75], [-5.15, 3.75], [-5.15, 0]]) ring.push(e.x + cs * x + sn * z, e.z - sn * x + cs * z);
  return ring;
}

test('K11 Atelier preserves both tunnel interfaces and opens every conflicting surface-road edge at lobby level', () => {
  const source = k11.K11_ATELIER_SITE.ring, conflicts = roadConflicts(source);
  assert.equal(conflicts.length, 4);
  assert.deepEqual([...new Set(conflicts.map((row) => row.wayId))].sort((a, b) => a - b), [44075, 44081, 50542, 50914]);
  assert.equal(conflicts.filter((row) => row.flags & 4).length, 2);
  assert.equal(conflicts.filter((row) => !(row.flags & 4)).length, 2);
  const portals = new Set(k11.K11_ATELIER_GROUND_VEHICLE_PORTAL_EDGES);
  for (const conflict of conflicts.filter((row) => !(row.flags & 4))) {
    const intersected = [];
    for (let edge = 0; edge < source.length / 2 - 1; edge++) {
      const i = edge * 2;
      if (segmentDistance(conflict.a, conflict.b, [source[i], source[i + 1]], [source[i + 2], source[i + 3]]) < conflict.width * 0.5 + 0.5) intersected.push(edge);
    }
    assert.ok(intersected.length > 0, `surface way ${conflict.wayId} has no lobby interface`);
    assert.ok(intersected.every((edge) => portals.has(edge)), `surface way ${conflict.wayId} hits a closed lobby edge: ${intersected}`);
  }
  let highestRenderedRoad = -Infinity;
  for (const conflict of conflicts.filter((row) => !(row.flags & 4))) {
    const profile = elevation.roadRibbonProfileAtSegment(conflict.wayId, conflict.segment);
    highestRenderedRoad = Math.max(highestRenderedRoad, ...profile.heights);
  }
  const pad = terrain.HONG_KONG_TERRAIN_META.k11AtelierPadHeight;
  const lintelSoffit = pad + k11.K11_ATELIER_LOBBY_HEIGHT - 0.56;
  assert.ok(lintelSoffit - highestRenderedRoad > 4.5,
    `portal lintel clearance ${lintelSoffit - highestRenderedRoad} m must retain the 4.5 m vehicle envelope`);
  assert.deepEqual(roadConflicts(canopyRing()).filter((row) => !(row.flags & 4)), [], 'entrance canopy intersects a surface road');
});

test('K11 Atelier source outline and entrance canopy contain no rendered street lamps', () => {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed);
  for (const [name, ring] of Object.entries({ source: k11.K11_ATELIER_SITE.ring, canopy: canopyRing() })) {
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
