const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let one, terrain, elevation, roads, lamps, clearance;
test.before(async () => {
  one = await import('../js/cities/hongkong/one-ifc-architecture.js');
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
function area(ring) { let value = 0; for (let i = 0; i + 3 < ring.length; i += 2) value += ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1]; return value * 0.5; }
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
function localWorldRing(local) {
  const ring = [];
  for (let i = 0; i < local.length; i += 2) { const point = one.oneIfcLocalToWorld(local[i], local[i + 1]); ring.push(point.x, point.z); }
  return ring;
}

test('One IFC preserves the exact 32-node stepped-square OSM tower footprint', () => {
  const source = one.ONE_IFC_OSM_SOURCE;
  assert.equal(source.id, 148554945); assert.equal(source.version, 14); assert.equal(source.geometry.length, 33);
  assert.equal(new Set(source.geometry.slice(0, -1).map((point) => point.id)).size, 32);
  assert.equal(source.tags.building, 'yes'); assert.equal(source.tags['building:use'], 'office'); assert.equal(source.tags.layer, '3');
  assert.equal(source.tags.height, '210'); assert.equal(source.tags['building:levels'], '38');
  assert.equal(one.ONE_IFC_LOCAL_RING.length, 66);
  assert.ok(Math.abs(Math.abs(area(one.ONE_IFC_LOCAL_RING)) - 2239.237667082749) < 1e-8);
  assert.ok(Math.abs(one.ONE_IFC_SITE.area - 2572.2584531642883) < 1e-8, 'OBB area is not the stepped-ring area');
  assert.ok(Math.abs(one.ONE_IFC_SITE.w - 50.82473795154908) < 1e-9);
  assert.ok(Math.abs(one.ONE_IFC_SITE.d - 50.610363315919244) < 1e-9);
  const longEdges = [];
  for (let edge = 0; edge < 32; edge++) if (one.oneIfcEdgeOutward(one.ONE_IFC_LOCAL_RING, edge).length > 25) longEdges.push(edge);
  assert.deepEqual(longEdges, [0, 8, 16, 24], 'published stepped-square plan no longer matches the OSM ring');
  for (const g of source.geometry) {
    const x = (g.lon - 114.1596) * 103056.81753522092, z = -(g.lat - 22.2819) * 110734.09626824585;
    const point = one.oneIfcWorldToLocal(x, z), roundTrip = one.oneIfcLocalToWorld(point.x, point.z);
    assert.ok(Math.hypot(roundTrip.x - x, roundTrip.z - z) < 1e-9);
  }
});

test('One IFC keeps source heights, floor counts, areas, address and completion conventions separate', () => {
  assert.equal(one.ONE_IFC_OSM_HEIGHT, 210); assert.equal(one.ONE_IFC_HEIGHT, 210); assert.equal(one.ONE_IFC_TO_TIP_HEIGHT, 210);
  assert.equal(one.ONE_IFC_OSM_LEVELS, 38); assert.equal(one.ONE_IFC_CTBUH_LEVELS, 38); assert.equal(one.ONE_IFC_CTBUH_UNDERGROUND_LEVELS, 4);
  assert.equal(one.ONE_IFC_CTBUH_COMPLETION_YEAR, 1999); assert.equal(one.ONE_IFC_PUBLISHED_COMPLETION_YEAR, 1998);
  assert.equal(one.ONE_IFC_PUBLISHED_LEVELS, 39); assert.equal(one.ONE_IFC_INTERASIA_LEVELS, 41);
  assert.equal(one.ONE_IFC_CTBUH_TOWER_GFA, 72880); assert.equal(one.ONE_IFC_INTERASIA_GFA_SQFT, 647868);
  assert.equal(one.ONE_IFC_TYPICAL_LETTABLE_SQFT, 21000); assert.equal(one.ONE_IFC_STRUCTURE, 'All-Steel');
  assert.equal(one.ONE_IFC_PASSENGER_LIFTS, 18); assert.equal(one.ONE_IFC_CARGO_LIFTS, 2); assert.equal(one.ONE_IFC_TRADING_FLOORS, 4);
  assert.equal(one.ONE_IFC_OSM_SOURCE.tags['addr:housenumber'], '8');
  assert.match(one.ONE_IFC_SITE.address, /1 Harbour View Street/);
});

test('One IFC uses tapered setback tiers, unitized modules and an open finial crown', () => {
  assert.equal(one.ONE_IFC_CURTAIN_TIERS.length, 5); assert.equal(one.ONE_IFC_SETBACK_COUNT, 4);
  assert.equal(one.ONE_IFC_CURTAIN_TIERS.reduce((sum, tier) => sum + tier.courses, 0), 38);
  assert.equal(one.ONE_IFC_PANEL_WIDTH, 1.61); assert.equal(one.ONE_IFC_OFFICE_PANEL_HEIGHT, 4.17); assert.equal(one.ONE_IFC_TRADING_PANEL_HEIGHT, 4.85);
  assert.deepEqual(one.ONE_IFC_BELT_LEVELS, [82, 142, 176]);
  assert.equal(one.ONE_IFC_GLAZED_CROWN_TOP, 202); assert.equal(one.ONE_IFC_OPEN_CROWN.y1, 210);
  assert.equal(one.oneIfcScaleAt(14), 0.992); assert.equal(one.oneIfcScaleAt(202), 0.742); assert.equal(one.oneIfcScaleAt(210), 0.68);
  for (const tier of one.ONE_IFC_CURTAIN_TIERS) {
    assert.ok(tier.topScale < tier.bottomScale); assert.ok(tier.y1 > tier.y0); assert.ok(tier.courses > 0);
  }
});

test('One IFC main entrance is photo-directed on the long Harbour View Street elevation', () => {
  const entrance = one.ONE_IFC_ENTRANCE;
  assert.equal(one.ONE_IFC_ENTRANCE_EDGE, 24); assert.equal(entrance.edge, 24);
  assert.ok(one.oneIfcEdgeOutward(one.ONE_IFC_LOCAL_RING, 24).length > 25);
  assert.match(entrance.evidence, /no entrance-tagged node/);
  const a = one.ONE_IFC_OSM_SOURCE.geometry[24], b = one.ONE_IFC_OSM_SOURCE.geometry[25];
  const x = ((a.lon + b.lon) * 0.5 - 114.1596) * 103056.81753522092, z = -((a.lat + b.lat) * 0.5 - 22.2819) * 110734.09626824585;
  assert.ok(Math.hypot(entrance.x - x, entrance.z - z) < 1e-9);
  assert.ok(Math.abs(Math.hypot(entrance.nx, entrance.nz) - 1) < 1e-12);
  const outward = one.oneIfcFrameToWorld(entrance, 0, 1);
  assert.ok(Math.hypot(outward.x - entrance.x - entrance.nx, outward.z - entrance.z - entrance.nz) < 1e-9, 'entrance local +Z is not outward');
  const forecourt = one.oneIfcFrameToWorld(entrance, 0, 2.4);
  assert.ok(one.isOneIfcEntranceForecourtPoint(forecourt.x, forecourt.z));
});

test('One IFC has one exact DTM pad shared by terrain, ground queries and road profiles', () => {
  const meta = terrain.HONG_KONG_TERRAIN_META;
  assert.ok(Math.abs(meta.oneIfcPadHeight - 3.332616040109656) < 1e-9);
  assert.equal(terrain.hongKongTerrainHeight(one.ONE_IFC_SITE.x, one.ONE_IFC_SITE.z), meta.oneIfcPadHeight);
  assert.equal(terrain.hongKongTerrainHeight(one.ONE_IFC_ENTRANCE.x, one.ONE_IFC_ENTRANCE.z), meta.oneIfcPadHeight);
  const forecourt = one.oneIfcFrameToWorld(one.ONE_IFC_ENTRANCE, 0, 2.4);
  assert.equal(terrain.hongKongTerrainHeight(forecourt.x, forecourt.z), meta.oneIfcPadHeight);
  const grounds = { plaza: meta.oneIfcPadHeight + 0.12 };
  assert.equal(one.oneIfcGroundHeightAt(one.ONE_IFC_SITE.x, one.ONE_IFC_SITE.z, 0, grounds), grounds.plaza);
  assert.equal(one.oneIfcGroundHeightAt(forecourt.x, forecourt.z, 999, grounds), grounds.plaza, 'raw DTM recreates an entrance step');
  assert.equal(one.oneIfcGroundHeightAt(0, 0, 999, grounds), 999);
  const elevationSource = fs.readFileSync(path.join(root, 'js/cities/hongkong/road-elevation.js'), 'utf8');
  assert.match(elevationSource, /LEE_GARDEN_ONE_SITE\.ring, ONE_IFC_SITE\.ring/);
});

test('One IFC preserves the drive-through road conflict while clearing paving and the entrance forecourt', () => {
  const conflicts = roadConflicts(one.ONE_IFC_SITE.ring);
  assert.deepEqual(conflicts.map((entry) => entry.recordIndex), [44957, 45026]);
  assert.ok(conflicts.every((entry) => entry.width === 5.5 && entry.flags === 0));
  assert.deepEqual(roadConflicts(localWorldRing(one.oneIfcRingAtScale(0.92))), [], 'inset plaza covers the drive-through');
  const forecourt = [];
  for (const [x, z] of [[-6.4,-0.2],[6.4,-0.2],[6.4,3],[-6.4,3],[-6.4,-0.2]]) {
    const point = one.oneIfcFrameToWorld(one.ONE_IFC_ENTRANCE, x, z); forecourt.push(point.x, point.z);
  }
  assert.deepEqual(roadConflicts(forecourt), [], 'entrance forecourt reaches a carriageway');
  let minimumClearance = Infinity;
  for (const recordIndex of [44957, 45026]) {
    const profile = elevation.roadRibbonProfileAtSegment(recordIndex, 0); assert.ok(profile.heights.every(Number.isFinite));
    minimumClearance = Math.min(minimumClearance, terrain.HONG_KONG_TERRAIN_META.oneIfcPadHeight + one.ONE_IFC_GROUND_SOFFIT - Math.max(...profile.heights) - 4.7);
  }
  assert.ok(minimumClearance > 4.5, `drive-through vehicle clearance ${minimumClearance}`);
});

test('One IFC tower and forecourt contain no rendered street lamps', () => {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed), conflicts = [];
  for (let index = 0; index < lamps.length; index++) {
    if (suppressed.has(index)) continue;
    const lamp = lamps[index], override = overrides.get(index), x = lamp[0] + (override?.[1] || 0) / 100, z = lamp[1] + (override?.[2] || 0) / 100;
    if (inside(one.ONE_IFC_SITE.ring, x, z) || one.isOneIfcEntranceForecourtPoint(x, z)) conflicts.push(index);
  }
  assert.deepEqual(conflicts, []);
});

test('One IFC ground drive-through stays open below the continuous upper soffit', () => {
  assert.equal(one.ONE_IFC_DRIVETHROUGH_EDGE, 0); assert.equal(one.ONE_IFC_GROUND_SOFFIT, 12);
  const upper = one.oneIfcRingColliders(one.ONE_IFC_LOCAL_RING, 12, 14);
  assert.equal(upper.length, 32); assert.ok(upper.every((collider) => collider.minY === 12 && collider.maxY === 14));
  assert.ok(upper.every((collider) => [collider.minX, collider.maxX, collider.minZ, collider.maxZ, collider.minY, collider.maxY].every(Number.isFinite)));
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/one-ifc-world.js'), 'utf8');
  assert.match(world, /edge === ONE_IFC_DRIVETHROUGH_EDGE \|\| entranceGap/);
  assert.match(world, /only ground-level glazing and colliders open/);
  assert.match(world, /oneIfcRingAtScale\(0\.92\)/);
});

test('One IFC hand-built world includes the researched facade, entrance, crown and night materials', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/one-ifc-world.js'), 'utf8');
  for (const pattern of [
    /OneIfcDoubleGlazedVisionPanels/, /OneIfcFrittedSpandrelPanels/, /OneIfcUnitizedPilasterFins/,
    /OneIfcMechanicalBeltsAndGlassLouvres/, /OneIfcOpenCrownTriangularFinials/, /OneIfcGroundRoundStructuralColumns/,
    /OneIfcHarbourViewStreetEntrance/, /OneIfcThreeVectorRibbonLogo/, /OneIfcHarbourViewLevelForecourt/,
    /1 HARBOUR VIEW STREET/, /cityUniforms\.uInteriorGlow/, /oneIfcGroundHeightAt/
  ]) assert.match(world, pattern);
});
