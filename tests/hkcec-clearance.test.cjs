const assert = require('node:assert/strict');
const test = require('node:test');
let h, roads, lamps, clearance;

test.before(async () => {
  h = await import('../js/cities/hongkong/hkcec-architecture.js');
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
  const denominator = cross(rx, rz, sx, sz); if (Math.abs(denominator) < 1e-9) return false;
  const qx = c[0] - a[0], qz = c[1] - a[1];
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
      const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]], margin = width * .5 + 1;
      if (Math.max(a[0], b[0]) < box.minX - margin || Math.min(a[0], b[0]) > box.maxX + margin || Math.max(a[1], b[1]) < box.minZ - margin || Math.min(a[1], b[1]) > box.maxZ + margin) continue;
      let conflict = inside(ring, ...a) || inside(ring, ...b);
      for (let j = 0; j < ring.length - 2 && !conflict; j += 2) conflict = segmentDistance(a, b, [ring[j], ring[j + 1]], [ring[j + 2], ring[j + 3]]) < width * .5 - 1e-6;
      if (conflict) result.push({ recordIndex, name, width, flags, segment: i / 2 - 1 });
    }
  }
  return result;
}
function lampConflicts(ring) {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed), result = [];
  for (let index = 0; index < lamps.length; index++) {
    if (suppressed.has(index)) continue;
    const lamp = lamps[index], override = overrides.get(index);
    const x = lamp[0] + (override?.[1] || 0) / 100, z = lamp[1] + (override?.[2] || 0) / 100;
    if (inside(ring, x, z)) result.push(index);
  }
  return result;
}

test('HKCEC keeps every intersecting carriageway record and distinguishes surface ways from tunnels', () => {
  const sites = [h.HKCEC_NEW_WING_SITE, h.HKCEC_OLD_WING_SITE, h.HKCEC_ATRIUM_SITE, h.HKCEC_APARTMENT_SITE];
  const expected = [25, 30, 39, 4];
  for (let i = 0; i < sites.length; i++) {
    const conflicts = roadConflicts(sites[i].ring);
    assert.equal(conflicts.length, expected[i], `${sites[i].englishName} conflict ledger`);
    for (const conflict of conflicts) { assert.ok(roads[conflict.recordIndex]); assert.equal(roads[conflict.recordIndex][0], conflict.name); }
    assert.ok(conflicts.some((conflict) => (conflict.flags & 4) === 0), `${sites[i].englishName} has a retained surface conflict`);
  }
  const newWing = roadConflicts(h.HKCEC_NEW_WING_SITE.ring);
  assert.ok(newWing.some((conflict) => (conflict.flags & 4) !== 0), 'New Wing also crosses source-tagged tunnels');
  assert.deepEqual(roadConflicts(h.HKCEC_APARTMENT_SITE.ring).map((row) => row.recordIndex), [44704, 44707, 44708, 47688]);
});

test('HKCEC ground-to-soffit columns preserve lane clearance on every non-tunnel road', () => {
  const entries = [['newWing', h.HKCEC_NEW_WING_SITE, 118], ['oldWing', h.HKCEC_OLD_WING_SITE, 69], ['atrium', h.HKCEC_ATRIUM_SITE, 30]];
  for (const [key, site, expectedCount] of entries) {
    const positions = h.HKCEC_COLUMN_POSITIONS[key]; assert.equal(positions.length, expectedCount);
    for (const [lx, lz] of positions) {
      const { x, z } = h.hkcecLocalToWorld(site, lx, lz);
      let boundaryDistance = Infinity; for (let i = 2; i + 1 < site.ring.length; i += 2) boundaryDistance = Math.min(boundaryDistance, pointSegmentDistance(x, z, [site.ring[i - 2], site.ring[i - 1]], [site.ring[i], site.ring[i + 1]]));
      assert.ok(inside(site.ring, x, z) || boundaryDistance < .01);
      for (const road of roads) {
        const [, width, , , flags, flat] = road; if ((flags & 4) !== 0) continue;
        for (let i = 2; i + 1 < flat.length; i += 2) {
          const distance = pointSegmentDistance(x, z, [flat[i - 2], flat[i - 1]], [flat[i], flat[i + 1]]);
          assert.ok(distance >= width * .5 + 1.19, `${key} column ${lx},${lz} conflicts with road`);
        }
      }
    }
  }
  assert.ok(h.HKCEC_COVERED_ROAD_SOFFIT - h.HKCEC_PLAZA_TOP > h.HKCEC_VEHICLE_ENVELOPE);
  assert.equal(h.HKCEC_COVERED_ROAD_SOFFIT, 8); assert.equal(h.HKCEC_VEHICLE_ENVELOPE, 4.7);
});

test('HKCEC ground curtain-wall panels leave every non-tunnel carriageway portal open', () => {
  for (const [key, site, expected] of [['newWing', h.HKCEC_NEW_WING_SITE, 193], ['oldWing', h.HKCEC_OLD_WING_SITE, 173]]) {
    const segments = h.HKCEC_GROUND_FACADE_SEGMENTS[key]; assert.equal(segments.length, expected);
    if (key === 'oldWing') assert.ok(segments.every(([edge]) => edge !== h.HKCEC_MAIN_ENTRANCE.sourceEdge));
    const box = bounds(site.ring), relevant = roads.filter((road) => {
      if ((road[4] & 4) !== 0) return false; const flat = road[5], margin = road[1] * .5 + 1;
      for (let i = 0; i + 3 < flat.length; i += 2) if (Math.max(flat[i], flat[i + 2]) >= box.minX - margin && Math.min(flat[i], flat[i + 2]) <= box.maxX + margin && Math.max(flat[i + 1], flat[i + 3]) >= box.minZ - margin && Math.min(flat[i + 1], flat[i + 3]) <= box.maxZ + margin) return true;
      return false;
    });
    for (const [edge, t0, t1] of segments) {
      const ring = site.localRing, i = edge * 2;
      const p0 = h.hkcecLocalToWorld(site, ring[i] + (ring[i + 2] - ring[i]) * t0, ring[i + 1] + (ring[i + 3] - ring[i + 1]) * t0);
      const p1 = h.hkcecLocalToWorld(site, ring[i] + (ring[i + 2] - ring[i]) * t1, ring[i + 1] + (ring[i + 3] - ring[i + 1]) * t1);
      for (const road of relevant) {
        const [, width, , , , flat] = road;
        for (let k = 2; k + 1 < flat.length; k += 2) assert.ok(segmentDistance([p0.x, p0.z], [p1.x, p1.z], [flat[k - 2], flat[k - 1]], [flat[k], flat[k + 1]]) >= width * .5 + .79, `${key} ground panel blocks road`);
      }
    }
  }
});

test('HKCEC ground facade leaves both photo-directed entrance centre portals unobstructed', () => {
  assert.equal(h.HKCEC_GROUND_FACADE_SEGMENTS.newWing.length + h.HKCEC_GROUND_FACADE_SEGMENTS.oldWing.length, 366);
  for (const [frame, edge, clearWidth] of [[h.HKCEC_MAIN_ENTRANCE, 9, 6.5], [h.HKCEC_APARTMENT_ENTRANCE, 6, 15.8]]) {
    const site = h.HKCEC_OLD_WING_SITE, ring = site.localRing, i = edge * 2;
    const point = h.hkcecWorldToLocal(site, frame.x, frame.z);
    const dx = ring[i + 2] - ring[i], dz = ring[i + 3] - ring[i + 1], length = Math.hypot(dx, dz);
    const centre = ((point.x - ring[i]) * dx + (point.z - ring[i + 1]) * dz) / (length * length), half = clearWidth * .5 / length;
    assert.ok(centre > 0 && centre < 1);
    for (const [panelEdge, t0, t1] of h.HKCEC_GROUND_FACADE_SEGMENTS.oldWing) {
      if (panelEdge !== edge) continue;
      assert.ok(t1 <= centre - half + 1e-6 || t0 >= centre + half - 1e-6, `${frame.name} ground portal is covered`);
    }
  }
});

test('HKCEC entrance walls, cylindrical supports, carpet and signs preserve the carriageways', () => {
  const framePoint = (frame, x, z) => ({ x: frame.x + Math.cos(frame.ry) * x + Math.sin(frame.ry) * z, z: frame.z - Math.sin(frame.ry) * x + Math.cos(frame.ry) * z });
  for (const [key, frame] of [['main', h.HKCEC_MAIN_ENTRANCE], ['apartment', h.HKCEC_APARTMENT_ENTRANCE]]) {
    const layout = h.HKCEC_ENTRANCE_LAYOUTS[key], nearby = roads.filter((road) => {
      if ((road[4] & 4) !== 0) return false; const box = bounds(road[5]);
      return box.maxX >= frame.x - 45 && box.minX <= frame.x + 45 && box.maxZ >= frame.z - 45 && box.minZ <= frame.z + 45;
    });
    assert.ok(nearby.length > 0); assert.ok(layout.canopy - layout.signHeight / 2 > h.HKCEC_VEHICLE_ENVELOPE);
    const walls = [-1, 1].map((side) => [
      framePoint(frame, side * layout.bayCentre - layout.bayWidth / 2, -layout.depth + .25),
      framePoint(frame, side * layout.bayCentre + layout.bayWidth / 2, -layout.depth + .25)
    ]);
    const carpet = key === 'apartment' ? [
      framePoint(frame, -layout.bayCentre - 1.2, -layout.depth + .3), framePoint(frame, -layout.bayCentre + 1.2, -layout.depth + .3),
      framePoint(frame, -layout.bayCentre + 1.2, -layout.depth + 1.7), framePoint(frame, -layout.bayCentre - 1.2, -layout.depth + 1.7)
    ] : null;
    for (const road of nearby) {
      const [, width, , , , flat] = road;
      for (let i = 2; i + 1 < flat.length; i += 2) {
        const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]];
        for (const wall of walls) assert.ok(segmentDistance([wall[0].x, wall[0].z], [wall[1].x, wall[1].z], a, b) >= width * .5 + .54, `${key} recessed wall blocks a road`);
        for (const [x, z] of layout.columns) { const p = framePoint(frame, x, z); assert.ok(pointSegmentDistance(p.x, p.z, a, b) >= width * .5 + layout.columnRadius + .19, `${key} canopy column blocks a road`); }
        if (carpet) for (let edge = 0; edge < 4; edge++) { const p = carpet[edge], q = carpet[(edge + 1) % 4]; assert.ok(segmentDistance([p.x, p.z], [q.x, q.z], a, b) >= width * .5 + .02, 'red carpet covers a carriageway'); }
      }
    }
  }
});

test('HKCEC exact rings contain no clearance-adjusted street lamps', () => {
  for (const site of [h.HKCEC_NEW_WING_SITE, h.HKCEC_OLD_WING_SITE, h.HKCEC_ATRIUM_SITE, h.HKCEC_APARTMENT_SITE]) assert.deepEqual(lampConflicts(site.ring), []);
});
