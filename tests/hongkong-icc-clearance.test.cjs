const assert = require('node:assert/strict');
const test = require('node:test');

let icc;
let roads;
let lamps;
let clearance;
let elevation;
let terrain;

test.before(async () => {
  icc = await import('../js/cities/hongkong/icc-architecture.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
  elevation = await import('../js/cities/hongkong/road-elevation.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
});

function inside(x, z) {
  const ring = icc.ICC_SITE.ring;
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
  return Math.min(pointSegmentDistance(...a, c, d), pointSegmentDistance(...b, c, d),
    pointSegmentDistance(...c, a, b), pointSegmentDistance(...d, a, b));
}

test('ICC gives building priority to the two elevated arrival ways with verified vertical clearance', () => {
  const conflicts = [];
  for (const [wayId, road] of roads.entries()) {
    const [name, width, , , flags, flat] = road;
    for (let i = 2; i + 1 < flat.length; i += 2) {
      const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]];
      const margin = width * 0.5 + 1;
      if (Math.max(a[0], b[0]) < icc.ICC_SITE.bounds.minX - margin || Math.min(a[0], b[0]) > icc.ICC_SITE.bounds.maxX + margin
        || Math.max(a[1], b[1]) < icc.ICC_SITE.bounds.minZ - margin || Math.min(a[1], b[1]) > icc.ICC_SITE.bounds.maxZ + margin) continue;
      let conflict = inside(...a) || inside(...b);
      for (let j = 0; j < icc.ICC_SITE.ring.length && !conflict; j += 2) {
        const next = (j + 2) % icc.ICC_SITE.ring.length;
        const c = [icc.ICC_SITE.ring[j], icc.ICC_SITE.ring[j + 1]];
        const d = [icc.ICC_SITE.ring[next], icc.ICC_SITE.ring[next + 1]];
        conflict = segmentDistance(a, b, c, d) < width * 0.5 - 1e-6;
      }
      if (conflict) conflicts.push({ wayId, name, width, flags, segment: i / 2 - 1, a, b });
    }
  }
  assert.deepEqual([...new Set(conflicts.map((conflict) => conflict.wayId))].sort((a, b) => a - b),
    [...icc.ICC_ARRIVAL_ROAD_WAY_IDS]);
  assert.ok(conflicts.every((conflict) => conflict.flags & 2), 'a surface carriageway would need local building-priority adjustment');

  const pad = terrain.HONG_KONG_TERRAIN_META.iccPadHeight;
  const canopyUnderside = pad + icc.ICC_DRAGON_TAIL.y0 - 0.35;
  const northPlan = icc.iccPlanAt(icc.ICC_LOBBY_HEIGHT);
  let doorZ = Infinity;
  for (let i = 1; i < northPlan.length; i += 2) doorZ = Math.min(doorZ, northPlan[i]);
  doorZ += 0.35;
  for (const conflict of conflicts) {
    for (let sample = 0; sample <= 20; sample++) {
      const t = sample / 20;
      const roadHeight = elevation.roadRibbonHeightAtSegment(conflict.wayId, conflict.segment, t);
      assert.ok(canopyUnderside - roadHeight >= 4.5,
        `way ${conflict.wayId} segment ${conflict.segment} loses the vehicle envelope below the Dragon Tail`);
      const x = conflict.a[0] + (conflict.b[0] - conflict.a[0]) * t;
      const z = conflict.a[1] + (conflict.b[1] - conflict.a[1]) * t;
      const local = icc.iccWorldToLocal(x, z), relativeY = roadHeight - pad;
      if (relativeY < 0 || relativeY > icc.ICC_LOBBY_HEIGHT) continue;
      for (const column of icc.ICC_MEGA_COLUMNS) {
        const point = icc.iccMegaColumnPoint(column, relativeY);
        const world = icc.iccLocalToWorld(point.x, point.z);
        assert.ok(pointSegmentDistance(world.x, world.z, conflict.a, conflict.b) > conflict.width * 0.5 + 0.7,
          `mega-column intersects arrival way ${conflict.wayId}`);
        const lowerCollider = icc.iccMegaColumnPoint(column, 7);
        assert.ok(!(Math.abs(local.x - lowerCollider.x) < 1.15 + conflict.width * 0.5
          && Math.abs(local.z - lowerCollider.z) < 1.25 + conflict.width * 0.5),
        `lower mega-column collider intersects arrival way ${conflict.wayId}`);
      }
      const lobby = icc.ICC_LOBBY_COLLIDER;
      assert.ok(!(Math.abs(local.x - lobby.x) < lobby.w * 0.5 + conflict.width * 0.5
        && Math.abs(local.z - lobby.z) < lobby.d * 0.5 + conflict.width * 0.5),
      `lobby collider intersects arrival way ${conflict.wayId}`);
      if (relativeY <= 10.2) {
        assert.ok(!(Math.abs(local.x) < 10 + conflict.width * 0.5
          && Math.abs(local.z - doorZ) < 0.35 + conflict.width * 0.5),
        `north entrance wall intersects arrival way ${conflict.wayId}`);
      }
    }
  }
});

test('ICC footprint contains no rendered street lamp', () => {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row]));
  const suppressed = new Set(clearance.suppressed);
  const conflicts = [];
  for (let index = 0; index < lamps.length; index++) {
    if (suppressed.has(index)) continue;
    const lamp = lamps[index], override = overrides.get(index);
    const x = lamp[0] + (override?.[1] || 0) / 100;
    const z = lamp[1] + (override?.[2] || 0) / 100;
    if (inside(x, z)) conflicts.push(index);
  }
  assert.deepEqual(conflicts, []);
});
