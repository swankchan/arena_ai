const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let airside, terrain, elevation, roads, lamps, clearance;
test.before(async () => {
  airside = await import('../js/cities/hongkong/airside-architecture.js');
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
function area(ring) {
  let value = 0; for (let i = 0; i + 3 < ring.length; i += 2) value += ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1]; return value * 0.5;
}

test('AIRSIDE preserves the complete current OSM complex and an exactly orthogonal local frame', () => {
  const source = airside.AIRSIDE_OSM_SOURCE;
  assert.equal(source.id, 1212412229); assert.equal(source.version, 9); assert.equal(source.geometry.length, 64);
  assert.deepEqual(source.geometry[0], source.geometry[63]); assert.equal(source.tags.height, '213'); assert.equal(source.tags['building:levels'], '47');
  const local = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/landmarks.json'), 'utf8')).elements.find((element) => element.type === 'way' && element.id === source.id);
  assert.deepEqual(source.geometry, local.geometry); assert.deepEqual(source.tags, local.tags);
  assert.equal(airside.AIRSIDE_COMPLEX_RING.length, 128); assert.equal(airside.AIRSIDE_SITE.ring.length, 128);
  assert.ok(Math.abs(airside.AIRSIDE_MAIN_WIDTH - 49.14934426296074) < 1e-9);
  assert.ok(Math.abs(airside.AIRSIDE_MAIN_DEPTH - 44.5461924655298) < 1e-9);
  assert.equal(airside.AIRSIDE_MAIN_TOWER_RING.length, 18);
  assert.ok(Math.abs(area(airside.AIRSIDE_MAIN_TOWER_RING) - (airside.AIRSIDE_MAIN_WIDTH * airside.AIRSIDE_MAIN_DEPTH - 4 * 2.4 * 2.4 / 2)) < 1e-8);
  for (const g of source.geometry) {
    const x = (g.lon - 114.1596) * 103056.81753522092, z = -(g.lat - 22.2819) * 110734.09626824585;
    const point = airside.airsideWorldToLocal(x, z), roundTrip = airside.airsideLocalToWorld(point.u, point.v);
    assert.ok(Math.hypot(roundTrip.x - x, roundTrip.z - z) < 1e-9);
  }
  for (const ring of airside.AIRSIDE_UPPER_VOLUME_RINGS) {
    assert.ok(Math.abs(area(ring)) > 1); assert.equal(ring[0], ring.at(-2)); assert.equal(ring[1], ring.at(-1));
  }
});

test('AIRSIDE keeps official, OSM and CTBUH height and floor conventions separate', () => {
  assert.equal(airside.AIRSIDE_OSM_HEIGHT, 213); assert.equal(airside.AIRSIDE_OFFICIAL_HEIGHT, 213); assert.equal(airside.AIRSIDE_HEIGHT, 213);
  assert.equal(airside.AIRSIDE_OSM_LEVELS, 47); assert.equal(airside.AIRSIDE_OFFICIAL_LEVELS, 47); assert.equal(airside.AIRSIDE_OSM_UNDERGROUND_LEVELS, 4);
  assert.equal(airside.AIRSIDE_CTBUH_HEIGHT, 207.1); assert.equal(airside.AIRSIDE_CTBUH_TO_TIP_HEIGHT, 207.1);
  assert.equal(airside.AIRSIDE_CTBUH_OCCUPIED_HEIGHT, 189.5); assert.equal(airside.AIRSIDE_CTBUH_LEVELS, 43); assert.equal(airside.AIRSIDE_CTBUH_UNDERGROUND_LEVELS, 4);
  assert.equal(airside.AIRSIDE_CTBUH_COMPLETION_YEAR, 2022); assert.equal(airside.AIRSIDE_OPENING_DATE, '2023-09-28');
  assert.equal(airside.AIRSIDE_SECONDARY_LEVELS, 18); assert.equal(airside.AIRSIDE_RETAIL_LEVELS, 9);
  assert.equal(airside.AIRSIDE_ROOF_DIRECTION_DEGREES, 201.93); assert.equal(airside.AIRSIDE_ROOF_RISE, 13);
  assert.equal(airside.AIRSIDE_TOTAL_GFA, 177670); assert.equal(airside.AIRSIDE_OFFICE_GFA, 110000); assert.equal(airside.AIRSIDE_RETAIL_GFA, 60000);
  assert.equal(airside.AIRSIDE_PV_AREA, 1350); assert.equal(airside.AIRSIDE_EDUCATIONAL_GARDEN_AREA, 600); assert.equal(airside.AIRSIDE_SOFT_LANDSCAPE_RATIO, 0.30);
  assert.equal(airside.airsideMainFloorY(0), 45); assert.equal(airside.airsideMainFloorY(38), 189.5);
  const roof = [];
  for (let i = 0; i < airside.AIRSIDE_MAIN_TOWER_RING.length - 2; i += 2) roof.push(airside.airsideMainRoofY(airside.AIRSIDE_MAIN_TOWER_RING[i], airside.AIRSIDE_MAIN_TOWER_RING[i+1]));
  assert.ok(Math.abs(Math.max(...roof) - 213) < 1e-9); assert.ok(Math.abs(Math.min(...roof) - 200) < 1e-9);
  assert.ok(Math.abs((Math.max(...roof) - Math.min(...roof)) - airside.AIRSIDE_ROOF_RISE) < 1e-9);
});

test('AIRSIDE uses its source-tagged office and retail entrance nodes without inventing a tower entrance', () => {
  const office = airside.AIRSIDE_OFFICE_ENTRANCE, mall = airside.AIRSIDE_MALL_ENTRANCE;
  assert.deepEqual(office.osmNodes, [13788270483, 11228949741]); assert.equal(airside.AIRSIDE_OFFICE_DOOR_NODES.length, 2);
  assert.deepEqual(airside.AIRSIDE_OFFICE_DOOR_NODES.map((node) => node.sourceNodeIndex), [40, 41]);
  assert.equal(mall.osmNode, 11232828740); assert.equal(mall.sourceNodeIndex, 6); assert.equal(mall.sourceEdge, 6);
  const g = airside.AIRSIDE_OSM_SOURCE.geometry[6];
  assert.ok(Math.abs(mall.x - (g.lon - 114.1596) * 103056.81753522092) < 1e-9);
  assert.ok(Math.abs(mall.z + (g.lat - 22.2819) * 110734.09626824585) < 1e-9);
  assert.match(office.evidence, /shared canopy is photograph-directed/); assert.match(mall.evidence, /abutters=retail/);
});

test('AIRSIDE has one exact DTM construction pad shared by terrain and surface road profiles', () => {
  const meta = terrain.HONG_KONG_TERRAIN_META;
  assert.ok(Math.abs(meta.airsidePadHeight - 6.209510786436553) < 1e-9);
  assert.equal(terrain.hongKongTerrainHeight(airside.AIRSIDE_SITE.x, airside.AIRSIDE_SITE.z), meta.airsidePadHeight);
  assert.equal(terrain.hongKongTerrainHeight(airside.AIRSIDE_OFFICE_ENTRANCE.x, airside.AIRSIDE_OFFICE_ENTRANCE.z), meta.airsidePadHeight);
  assert.equal(terrain.hongKongTerrainHeight(airside.AIRSIDE_MALL_ENTRANCE.x, airside.AIRSIDE_MALL_ENTRANCE.z), meta.airsidePadHeight);
  const grounds = { plaza: meta.airsidePadHeight + 0.12 };
  assert.equal(airside.airsideGroundHeightAt(airside.AIRSIDE_SITE.x, airside.AIRSIDE_SITE.z, 999, grounds), grounds.plaza);
  assert.equal(airside.airsideGroundHeightAt(0, 0, 999, grounds), 999);
  const elevationSource = fs.readFileSync(path.join(root, 'js/cities/hongkong/road-elevation.js'), 'utf8');
  assert.match(elevationSource, /HSBC_SITE\.ring, SCB_SITE\.ring, ICC_SITE\.ring, AIRSIDE_SITE\.ring/);
});

test('AIRSIDE preserves all 18 surface access ways and eight B1 tunnels with vehicle clearance', () => {
  const conflicts = roadConflicts(airside.AIRSIDE_SITE.ring), unique = [...new Map(conflicts.map((entry) => [entry.recordIndex, entry])).values()];
  const surface = unique.filter((entry) => !(entry.flags & 4)), tunnel = unique.filter((entry) => entry.flags & 4);
  assert.deepEqual(surface.map((entry) => entry.recordIndex).sort((a,b) => a-b), airside.AIRSIDE_SURFACE_ACCESS_WAYS.map((way) => way.recordIndex).sort((a,b) => a-b));
  assert.deepEqual(tunnel.map((entry) => entry.recordIndex).sort((a,b) => a-b), airside.AIRSIDE_TUNNEL_WAYS.map((way) => way.recordIndex).sort((a,b) => a-b));
  let highestRoad = -Infinity;
  for (const way of airside.AIRSIDE_SURFACE_ACCESS_WAYS) {
    const road = roads[way.recordIndex]; assert.equal(road[1], way.width); assert.deepEqual(road[5], way.points); assert.ok(!(road[4] & 4));
    assert.ok(!elevation.isTunnelRoad(way.recordIndex));
    for (let segment = 0; segment < road[5].length / 2 - 1; segment++) {
      const profile = elevation.roadRibbonProfileAtSegment(way.recordIndex, segment);
      assert.ok(profile.heights.every(Number.isFinite)); highestRoad = Math.max(highestRoad, ...profile.heights);
    }
  }
  const soffit = terrain.HONG_KONG_TERRAIN_META.airsidePadHeight + airside.AIRSIDE_BASE_SOFFIT;
  assert.ok(soffit - highestRoad > airside.AIRSIDE_ROAD_VEHICLE_CLEARANCE, `insufficient ground portal clearance: ${soffit - highestRoad}`);
  for (const way of airside.AIRSIDE_TUNNEL_WAYS) {
    assert.ok(roads[way.recordIndex][4] & 4); assert.ok(elevation.isTunnelRoad(way.recordIndex));
    for (let segment = 0; segment < roads[way.recordIndex][5].length / 2 - 1; segment++) {
      const profile = elevation.roadRibbonProfileAtSegment(way.recordIndex, segment);
      assert.ok(profile.heights.every(Number.isFinite)); assert.ok(Math.min(...profile.heights) < terrain.HONG_KONG_TERRAIN_META.airsidePadHeight - 1);
    }
  }
});

test('AIRSIDE ground glazing bays and columns leave every crossing carriageway open', () => {
  const ring = airside.AIRSIDE_COMPLEX_RING, crossingWays = new Set(); let portals = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const bays = Math.max(1, Math.ceil(airside.airsideEdgeOutward(ring, edge).length / 2.8));
    for (let bay = 0; bay < bays; bay++) {
      const conflict = airside.airsideGroundBayConflict(ring, edge, bay / bays, (bay + 1) / bays);
      if (conflict) { portals++; crossingWays.add(conflict.osmWay); }
    }
  }
  assert.equal(portals, 38);
  assert.deepEqual([...crossingWays].sort((a,b) => a-b), [659030634,903684312,903684313,931435255,1266504085,1266504087,1502803422,1502803423]);
  const columns = airside.airsideGroundColumnSites(); assert.equal(columns.length, 14);
  for (const column of columns) assert.ok(column.clearance > 0.52 + 0.25, `column ${column.sourceVertex} enters a carriageway`);
});

test('AIRSIDE complex contains no rendered street lamps', () => {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed), conflicts = [];
  for (let index = 0; index < lamps.length; index++) {
    if (suppressed.has(index)) continue;
    const lamp = lamps[index], override = overrides.get(index);
    const x = lamp[0] + (override?.[1] || 0) / 100, z = lamp[1] + (override?.[2] || 0) / 100;
    if (inside(airside.AIRSIDE_SITE.ring, x, z)) conflicts.push(index);
  }
  assert.deepEqual(conflicts, []);
});

test('AIRSIDE ring colliders are finite elevated edge walls rather than a sealed ground solid', () => {
  const colliders = airside.airsideRingColliders(airside.AIRSIDE_COMPLEX_RING, 8, 45);
  assert.equal(colliders.length, 63);
  for (const collider of colliders) {
    assert.equal(collider.shape, 'box'); assert.equal(collider.minY, 8); assert.equal(collider.maxY, 45);
    for (const key of ['x','z','w','d','ry','minX','maxX','minZ','maxZ']) assert.ok(Number.isFinite(collider[key]), key);
    assert.ok(collider.obb && Number.isFinite(collider.obb.cs) && Number.isFinite(collider.obb.sn));
  }
});

test('AIRSIDE hand-built world includes textile cuts, four-radius glass, source entrances, PV and night materials', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/airside-world.js'), 'utf8');
  for (const pattern of [
    /AirsideFiveInterconnectedTextileVolumes/, /FourRadiusFlutedAndFlatGlass/, /DiagonalCutsAndSlopingCrown/,
    /VariableDepthLedFins/, /AirsideConcordeRoadTwinSourceNodeOfficeLobby/, /AirsideSourceNodeRetailAtriumEntrance/,
    /AirsideServiceRoadPortalLintels/, /AirsideRoofAndPodiumPhotovoltaicFarm/, /AirsideNativeTreesAndShrubs/,
    /AirsideNineGraniteGroundPaversBelowRoadSurface/, /AirsideRetailSourceEntranceLevelGraniteForecourt/, /airsideGroundBayConflict/, /cityUniforms\.uInteriorGlow/
  ]) assert.match(source, pattern);
  assert.doesNotMatch(source, /AIRSIDE_OSM_SOURCE_VERTICES_PLACEHOLDER|TextureLoader|image-search|https?:\/\//);
  assert.equal(airside.AIRSIDE_FLUTE_DEPTHS.length, 4); assert.equal(airside.AIRSIDE_MAIN_VISUAL_COURSES, 38);
});
