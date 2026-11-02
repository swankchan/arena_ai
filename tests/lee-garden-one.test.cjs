const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let lee, terrain, elevation, roads, lamps, clearance;
test.before(async () => {
  lee = await import('../js/cities/hongkong/lee-garden-one-architecture.js');
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
function area(ring) {
  let value = 0; for (let i = 0; i + 3 < ring.length; i += 2) value += ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1]; return value * 0.5;
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
function towerWorldRing() {
  const ring = [];
  for (let i = 0; i < lee.LEE_GARDEN_ONE_TOWER_RING.length; i += 2) {
    const point = lee.leeGardenOneLocalToWorld(lee.LEE_GARDEN_ONE_TOWER_RING[i], lee.LEE_GARDEN_ONE_TOWER_RING[i + 1]); ring.push(point.x, point.z);
  }
  return ring;
}

test('Lee Garden One separates the OSM building base, authored six-sided tower and complex site boundary', () => {
  const source = lee.LEE_GARDEN_ONE_OSM_SOURCE, complex = lee.LEE_GARDEN_ONE_COMPLEX_SOURCE;
  assert.equal(source.id, 1424342883); assert.equal(source.version, 1); assert.equal(source.geometry.length, 11);
  assert.equal(source.tags.building, 'commercial'); assert.equal(source.tags.mall, 'yes'); assert.equal(source.tags.height, '211');
  assert.equal(complex.id, 292229804); assert.equal(complex.version, 8); assert.equal(complex.geometry.length, 12);
  assert.equal(complex.tags.building, undefined); assert.equal(complex.tags.commerce, 'complex');
  assert.equal(lee.LEE_GARDEN_ONE_BUILDING_RING.length, 22); assert.equal(lee.LEE_GARDEN_ONE_COMPLEX_RING.length, 24);
  assert.equal(lee.LEE_GARDEN_ONE_TOWER_RING.length, 14);
  assert.ok(Math.abs(area(lee.LEE_GARDEN_ONE_BUILDING_RING) - 4496.7959470638725) < 1e-8);
  assert.ok(Math.abs(Math.abs(area(lee.LEE_GARDEN_ONE_COMPLEX_RING)) - 5364.6784018451435) < 1e-8);
  assert.ok(Math.abs(area(lee.LEE_GARDEN_ONE_TOWER_RING) - 1554.8318406250005) < 1e-8);
  for (let i = 0; i < lee.LEE_GARDEN_ONE_TOWER_RING.length; i += 2) {
    assert.ok(inside(lee.LEE_GARDEN_ONE_BUILDING_RING, lee.LEE_GARDEN_ONE_TOWER_RING[i], lee.LEE_GARDEN_ONE_TOWER_RING[i + 1]), `tower vertex ${i / 2} leaves OSM base`);
  }
  for (const g of source.geometry) {
    const x = (g.lon - 114.1596) * 103056.81753522092, z = -(g.lat - 22.2819) * 110734.09626824585;
    const point = lee.leeGardenOneWorldToLocal(x, z), roundTrip = lee.leeGardenOneLocalToWorld(point.x, point.z);
    assert.ok(Math.hypot(roundTrip.x - x, roundTrip.z - z) < 1e-9);
  }
  assert.ok(Math.abs(lee.LEE_GARDEN_ONE_SITE.w - 114.61782709856607) < 1e-9);
  assert.ok(Math.abs(lee.LEE_GARDEN_ONE_SITE.d - 45.73061598829872) < 1e-9);
});

test('Lee Garden One keeps OSM, CTBUH, Hysan and published conventions separate', () => {
  assert.equal(lee.LEE_GARDEN_ONE_OSM_HEIGHT, 211); assert.equal(lee.LEE_GARDEN_ONE_OSM_LEVELS, 52);
  assert.equal(lee.LEE_GARDEN_ONE_HEIGHT, 240.4); assert.equal(lee.LEE_GARDEN_ONE_TO_TIP_HEIGHT, 240.4);
  assert.equal(lee.LEE_GARDEN_ONE_OCCUPIED_HEIGHT, 198); assert.equal(lee.LEE_GARDEN_ONE_CTBUH_LEVELS, 50);
  assert.equal(lee.LEE_GARDEN_ONE_CTBUH_UNDERGROUND_LEVELS, 4); assert.equal(lee.LEE_GARDEN_ONE_CONSTRUCTION_START, 1996);
  assert.equal(lee.LEE_GARDEN_ONE_CTBUH_COMPLETION_YEAR, 1998); assert.equal(lee.LEE_GARDEN_ONE_PUBLISHED_HEIGHT, 240.35);
  assert.equal(lee.LEE_GARDEN_ONE_PUBLISHED_COMPLETION_YEAR, 1997); assert.equal(lee.LEE_GARDEN_ONE_HYSAN_LEVELS, 53);
  assert.equal(lee.LEE_GARDEN_ONE_HYSAN_GFA_SQFT, 903000); assert.equal(lee.LEE_GARDEN_ONE_HYSAN_TYPICAL_LETTABLE_MIN_SQFT, 14661);
  assert.equal(lee.LEE_GARDEN_ONE_HYSAN_TYPICAL_LETTABLE_MAX_SQFT, 16793); assert.equal(lee.LEE_GARDEN_ONE_HYSAN_WHOLE_FLOOR_EFFICIENCY, 0.88);
  assert.equal(lee.LEE_GARDEN_ONE_HYSAN_CLEAR_HEADROOM, 2.5); assert.equal(lee.LEE_GARDEN_ONE_MAKE_PROJECT_AREA, 83900);
  assert.equal(lee.LEE_GARDEN_ONE_CTBUH_TOWER_GFA, 84665); assert.equal(lee.LEE_GARDEN_ONE_MAKE_ROOFTOP_STOREYS, 2);
  assert.equal(lee.leeGardenOneFloorY(0), 28); assert.equal(lee.leeGardenOneFloorY(39), 198);
  const lettableSqft = area(lee.LEE_GARDEN_ONE_TOWER_RING) * 0.88 * 10.76391041671;
  assert.ok(lettableSqft >= 14661 && lettableSqft <= 16793, `authored plate outside official range: ${lettableSqft}`);
});

test('Lee Garden One uses the exact source pedestrian and underground-parking entrance nodes', () => {
  const entrance = lee.LEE_GARDEN_ONE_ENTRANCE, parking = lee.LEE_GARDEN_ONE_PARKING_ENTRANCE;
  assert.equal(entrance.osmNode, 2957737898); assert.equal(entrance.sourceVertex, 8);
  assert.equal(parking.osmNode, 2093159628); assert.equal(parking.sourceVertex, 5);
  for (const [frame, vertex] of [[entrance, 8], [parking, 5]]) {
    const g = lee.LEE_GARDEN_ONE_OSM_SOURCE.geometry[vertex];
    assert.ok(Math.abs(frame.x - (g.lon - 114.1596) * 103056.81753522092) < 1e-9);
    assert.ok(Math.abs(frame.z + (g.lat - 22.2819) * 110734.09626824585) < 1e-9);
    assert.ok(Math.abs(Math.hypot(frame.nx, frame.nz) - 1) < 1e-12);
  }
  assert.match(parking.evidence, /parking=underground/); assert.match(entrance.evidence, /entrance=yes/);
});

test('Lee Garden One has one exact DTM pad shared by terrain, ground queries and road profiles', () => {
  const meta = terrain.HONG_KONG_TERRAIN_META;
  assert.ok(Math.abs(meta.leeGardenOnePadHeight - 8.883145681894632) < 1e-9);
  assert.equal(terrain.hongKongTerrainHeight(lee.LEE_GARDEN_ONE_SITE.x, lee.LEE_GARDEN_ONE_SITE.z), meta.leeGardenOnePadHeight);
  assert.equal(terrain.hongKongTerrainHeight(lee.LEE_GARDEN_ONE_ENTRANCE.x, lee.LEE_GARDEN_ONE_ENTRANCE.z), meta.leeGardenOnePadHeight);
  const forecourt = lee.leeGardenOneFrameToWorld(lee.LEE_GARDEN_ONE_ENTRANCE, 0, 2.4);
  assert.equal(terrain.hongKongTerrainHeight(forecourt.x, forecourt.z), meta.leeGardenOnePadHeight);
  const grounds = { plaza: meta.leeGardenOnePadHeight + 0.12 };
  assert.equal(lee.leeGardenOneGroundHeightAt(lee.LEE_GARDEN_ONE_SITE.x, lee.LEE_GARDEN_ONE_SITE.z, 0, grounds), grounds.plaza);
  assert.equal(lee.leeGardenOneGroundHeightAt(0, 0, 999, grounds), 999);
  const elevationSource = fs.readFileSync(path.join(root, 'js/cities/hongkong/road-elevation.js'), 'utf8');
  assert.match(elevationSource, /AIRSIDE_SITE\.ring, LEE_GARDEN_ONE_SITE\.ring/);
});

test('Lee Garden One preserves the only building-base service crossing and all complex access records', () => {
  const building = roadConflicts(lee.LEE_GARDEN_ONE_SITE.ring), tower = roadConflicts(towerWorldRing()), complex = roadConflicts(lee.LEE_GARDEN_ONE_COMPLEX_WORLD_RING);
  assert.deepEqual(building.map((entry) => entry.recordIndex), [46221]);
  assert.equal(building[0].width, 8.4); assert.equal(building[0].flags, 0); assert.deepEqual(tower, []);
  const forecourtRing = [];
  for (const [x, z] of [[-7.6,-0.2],[7.6,-0.2],[2,3],[-2,3],[-7.6,-0.2]]) {
    const point = lee.leeGardenOneFrameToWorld(lee.LEE_GARDEN_ONE_ENTRANCE, x, z); forecourtRing.push(point.x, point.z);
  }
  assert.deepEqual(roadConflicts(forecourtRing), [], '3 m entrance forecourt reaches a carriageway');
  assert.deepEqual([...new Set(complex.map((entry) => entry.recordIndex))].sort((a, b) => a - b), [35549, 46219, 46220, 46221]);
  for (const way of lee.LEE_GARDEN_ONE_SERVICE_WAYS) for (const recordIndex of way.generatedRecordIndices) {
    const record = roads[recordIndex]; assert.equal(record[1], way.width);
    const expected = way.geometry.flatMap((g) => [(g.lon - 114.1596) * 103056.81753522092, -(g.lat - 22.2819) * 110734.09626824585]);
    // Generated records retain the source signature but may be RDP-simplified; never overwrite them with raw JSON.
    assert.ok(record[5].length <= expected.length && record[5].length >= 4);
    assert.ok(Math.hypot(record[5][0] - expected[0], record[5][1] - expected[1]) < 0.150001);
    assert.ok(Math.hypot(record[5].at(-2) - expected.at(-2), record[5].at(-1) - expected.at(-1)) < 0.150001);
    for (let i = 0; i < record[5].length; i += 2) {
      let distance = Infinity;
      for (let j = 0; j + 3 < expected.length; j += 2) distance = Math.min(distance, pointSegmentDistance(record[5][i], record[5][i + 1], [expected[j], expected[j + 1]], [expected[j + 2], expected[j + 3]]));
      assert.ok(distance < 0.150001, `${way.id} generated coordinate ${i} leaves source line`);
    }
  }
  const profile = elevation.roadRibbonProfileAtSegment(46221, 0), highest = Math.max(...profile.heights), pad = terrain.HONG_KONG_TERRAIN_META.leeGardenOnePadHeight;
  assert.ok(profile.heights.every(Number.isFinite));
  assert.ok(Math.abs((pad + lee.LEE_GARDEN_ONE_LOBBY_TOP - highest - 4.7) - lee.LEE_GARDEN_ONE_ROAD_VEHICLE_CLEARANCE) < 1e-9);
  const parkingSoffitClearance = pad + lee.LEE_GARDEN_ONE_PLAZA_TOP + 4.98 - highest;
  assert.ok(parkingSoffitClearance > 4.5, `parking portal clearance ${parkingSoffitClearance}`);
});

test('Lee Garden One ground glazing and pavers leave the service carriageway open', () => {
  const ring = lee.LEE_GARDEN_ONE_BUILDING_RING; let portals = 0, paverBays = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const bays = Math.max(1, Math.ceil(lee.leeGardenOneEdgeOutward(ring, edge).length / 3));
    for (let bay = 0; bay < bays; bay++) if (lee.leeGardenOneGroundBayConflict(ring, edge, bay / bays, (bay + 1) / bays)) portals++;
    const pavers = Math.max(1, Math.ceil(lee.leeGardenOneEdgeOutward(ring, edge).length / 2.4));
    for (let bay = 0; bay < pavers; bay++) if (!lee.leeGardenOneGroundBayConflict(ring, edge, bay / pavers, (bay + 1) / pavers, 0.12)) paverBays++;
  }
  assert.equal(portals, 5); assert.ok(paverBays > 80);
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/lee-garden-one-world.js'), 'utf8');
  assert.match(source, /LeeGardenOneGroundPaversClearOfSourceServiceRoad/);
  assert.doesNotMatch(source, /roofGeometry\(LEE_GARDEN_ONE_BUILDING_RING, LEE_GARDEN_ONE_PLAZA_TOP\)/);
});

test('Lee Garden One building and complex contain no rendered street lamps', () => {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed), conflicts = [];
  for (let index = 0; index < lamps.length; index++) {
    if (suppressed.has(index)) continue;
    const lamp = lamps[index], override = overrides.get(index);
    const x = lamp[0] + (override?.[1] || 0) / 100, z = lamp[1] + (override?.[2] || 0) / 100;
    if (inside(lee.LEE_GARDEN_ONE_SITE.ring, x, z) || inside(lee.LEE_GARDEN_ONE_COMPLEX_WORLD_RING, x, z)
      || lee.isLeeGardenOneEntranceForecourtPoint(x, z)) conflicts.push(index);
  }
  assert.deepEqual(conflicts, []);
});

test('Lee Garden One rooftop addition is on podium, and colliders do not seal the ground roadway', () => {
  const e = lee.LEE_GARDEN_ONE_ROOF_EXTENSION, cs = Math.cos(e.ry), sn = Math.sin(e.ry);
  for (const x of [-e.w / 2, e.w / 2]) for (const z of [-e.d / 2, e.d / 2]) {
    const px = e.x + cs * x + sn * z, pz = e.z - sn * x + cs * z;
    assert.ok(inside(lee.LEE_GARDEN_ONE_BUILDING_RING, px, pz), 'roof extension leaves podium');
    assert.ok(!inside(lee.LEE_GARDEN_ONE_TOWER_RING, px, pz), 'roof extension intersects tower');
  }
  const tower = lee.leeGardenOneRingColliders(lee.LEE_GARDEN_ONE_TOWER_RING, 28, 211);
  const podium = lee.leeGardenOneRingColliders(lee.LEE_GARDEN_ONE_BUILDING_RING, 18, 28);
  assert.equal(tower.length, 6); assert.equal(podium.length, 10);
  for (const collider of [...tower, ...podium]) {
    assert.equal(collider.shape, 'box');
    for (const key of ['x','z','w','d','ry','minY','maxY','minX','maxX','minZ','maxZ']) assert.ok(Number.isFinite(collider[key]), key);
    assert.ok(collider.obb && Number.isFinite(collider.obb.cs) && Number.isFinite(collider.obb.sn));
  }
  assert.ok(tower.every((collider) => collider.minY === 28)); assert.ok(podium.every((collider) => collider.minY === 18));
  assert.equal(lee.LEE_GARDEN_ONE_SPIRE_LOCAL.x, lee.LEE_GARDEN_ONE_TOWER_RING[4]);
  assert.equal(lee.LEE_GARDEN_ONE_ROOF_HEIGHT + 8 + 12 + 9.4, lee.LEE_GARDEN_ONE_HEIGHT);
});

test('Lee Garden One hand-built world includes the researched facade, entrances, roof and night materials', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/lee-garden-one-world.js'), 'utf8');
  for (const pattern of [
    /LeeGardenOneFloorPlanDirectedChamferedTriangularTower/, /LeeGardenOneBlueGreenOfficeGlassAndMechanicalBands/,
    /LeeGardenOneThreeCurvedCantileveredCornerLobes/, /LeeGardenOneContinuousSilverHorizontalSunshades/,
    /LeeGardenOneLanFongRoadCopperLatticeVeils/, /LeeGardenOneDiagonalPodiumTransitionBraces/,
    /LeeGardenOneGascogneBeigeEntranceColumns/, /LeeGardenOneDiamondCarvedEntranceMotif/,
    /LeeGardenOneSourceEntranceLevelForecourt/,
    /LeeGardenOneSourceUndergroundParkingPortal/, /LeeGardenOneMake2026TwoStoreyRoofGlassBox/,
    /LeeGardenOneMakeRooftopGreenWall/, /LeeGardenOneOffsetSouthwestSpireAndRoofPlant/,
    /LeeGardenOneSpireTipBeacon/, /leeGardenOneGroundBayConflict/, /cityUniforms\.uInteriorGlow/
  ]) assert.match(source, pattern);
  assert.doesNotMatch(source, /TextureLoader|image-search|https?:\/\//);
  assert.deepEqual(lee.LEE_GARDEN_ONE_LOBE_SOURCE_VERTICES, [0, 2, 4]);
  assert.equal(lee.LEE_GARDEN_ONE_OFFICE_VISUAL_COURSES, 39);
});
