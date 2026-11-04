const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let ts, terrain, elevation, roads, lamps, clearance;
test.before(async () => {
  ts = await import('../js/cities/hongkong/times-square-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  elevation = await import('../js/cities/hongkong/road-elevation.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
});
function inside(ring, x, z) { let value = false; for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) { const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) value = !value; } return value; }
function area(ring) { let value = 0; for (let i = 0; i + 3 < ring.length; i += 2) value += ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1]; return value * .5; }
function pointSegmentDistance(x, z, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], lengthSq = dx * dx + dz * dz, t = lengthSq ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / lengthSq)) : 0; return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); }
function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function segmentsIntersect(a, b, c, d) { const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1], denominator = cross(rx, rz, sx, sz), qx = c[0] - a[0], qz = c[1] - a[1]; if (Math.abs(denominator) < 1e-9) return false; const t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator; return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9; }
function bounds(ring) { const xs = ring.filter((_, index) => index % 2 === 0), zs = ring.filter((_, index) => index % 2 === 1); return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) }; }
function centrelineConflicts(ring) {
  const result = new Set(), box = bounds(ring);
  for (const [recordIndex, road] of roads.entries()) {
    const flat = road[5];
    for (let i = 2; i + 1 < flat.length; i += 2) {
      const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]];
      if (Math.max(a[0], b[0]) < box.minX || Math.min(a[0], b[0]) > box.maxX || Math.max(a[1], b[1]) < box.minZ || Math.min(a[1], b[1]) > box.maxZ) continue;
      let conflict = inside(ring, ...a) || inside(ring, ...b);
      for (let j = 0; j < ring.length - 2 && !conflict; j += 2) conflict = segmentsIntersect(a, b, [ring[j], ring[j + 1]], [ring[j + 2], ring[j + 3]]);
      if (conflict) result.add(recordIndex);
    }
  }
  return [...result];
}

test('Times Square preserves four distinct OSM sources and the local landmark snapshot geometry', () => {
  assert.equal(ts.TIMES_SQUARE_OSM_SOURCES.length, 4);
  const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/landmarks.json'), 'utf8'));
  const elements = new Map(snapshot.elements.map((element) => [element.id, element]));
  for (const source of [ts.TIMES_SQUARE_MALL_OSM_SOURCE, ts.TIMES_SQUARE_TOWER_ONE_OSM_SOURCE, ts.TIMES_SQUARE_TOWER_TWO_OSM_SOURCE]) {
    const raw = elements.get(source.id); assert.ok(raw, `missing local way ${source.id}`);
    assert.equal(source.geometry.length, raw.geometry.length);
    assert.deepEqual(source.tags, raw.tags);
    source.geometry.forEach((point, index) => { assert.equal(point.lon, raw.geometry[index].lon); assert.equal(point.lat, raw.geometry[index].lat); });
  }
  assert.equal(ts.TIMES_SQUARE_MALL_OSM_SOURCE.id, 26469269); assert.equal(ts.TIMES_SQUARE_MALL_OSM_SOURCE.version, 8);
  assert.equal(ts.TIMES_SQUARE_MALL_OSM_SOURCE.sourceTimestamp, '2016-07-01T10:45:30Z');
  assert.equal(new Set(ts.TIMES_SQUARE_MALL_OSM_SOURCE.geometry.slice(0, -1).map((p) => p.id)).size, 22);
  assert.equal(ts.TIMES_SQUARE_TOWER_ONE_OSM_SOURCE.id, 199045545); assert.equal(ts.TIMES_SQUARE_TOWER_TWO_OSM_SOURCE.id, 199045544);
  assert.equal(ts.TIMES_SQUARE_TOWER_ONE_OSM_SOURCE.tags.height, '194'); assert.equal(ts.TIMES_SQUARE_TOWER_TWO_OSM_SOURCE.tags.height, '169');
  assert.equal(ts.TIMES_SQUARE_TOWER_ONE_OSM_SOURCE.tags['building:levels'], '47'); assert.equal(ts.TIMES_SQUARE_TOWER_TWO_OSM_SOURCE.tags['building:levels'], '40');
  assert.equal(ts.TIMES_SQUARE_LANDUSE_OSM_SOURCE.id, 294351176); assert.equal(ts.TIMES_SQUARE_LANDUSE_OSM_SOURCE.version, 6);
  assert.equal(ts.TIMES_SQUARE_LANDUSE_OSM_SOURCE.tags.landuse, 'commercial'); assert.equal(ts.TIMES_SQUARE_LANDUSE_OSM_SOURCE.tags['addr:housenumber'], '1');
  assert.equal(new Set(ts.TIMES_SQUARE_LANDUSE_OSM_SOURCE.geometry.slice(0, -1).map((p) => p.id)).size, 21);
  assert.equal(ts.TIMES_SQUARE_LANDUSE_OSM_SOURCE.tags.building, undefined, 'landuse is not promoted to another building');
  assert.ok(ts.TIMES_SQUARE_RESEARCH_SOURCES.some((source) => /wongouyang\.com/.test(source.url)));
  assert.ok(ts.TIMES_SQUARE_RESEARCH_SOURCES.some((source) => /office\.timessquare\.com\.hk/.test(source.url)));
});
test('Times Square shares one exact georef and photo-directed frontage frames without inventing OSM doors', () => {
  const site = ts.TIMES_SQUARE_SITE;
  assert.ok(Math.abs(site.x - 2326.5974154259075) < 1e-9); assert.ok(Math.abs(site.z - 393.9817683292447) < 1e-9);
  assert.ok(Math.abs(site.w - 129.26303692987176) < 1e-9); assert.ok(Math.abs(site.d - 65.84499572363711) < 1e-9);
  assert.ok(Math.abs(site.ry - .39425563327132884) < 1e-12); assert.ok(Math.abs(site.ringArea - 6357.6727505784365) < 1e-8);
  for (const ring of [ts.TIMES_SQUARE_LOCAL_RING, ts.TIMES_SQUARE_TOWER_ONE_LOCAL_RING, ts.TIMES_SQUARE_TOWER_TWO_LOCAL_RING, ts.TIMES_SQUARE_LANDUSE_LOCAL_RING]) assert.ok(area(ring) < 0);
  for (const source of ts.TIMES_SQUARE_OSM_SOURCES) for (const g of source.geometry) {
    const x = (g.lon - 114.1596) * 103056.81753522092, z = -(g.lat - 22.2819) * 110734.09626824585;
    const local = ts.timesSquareWorldToLocal(x, z), roundtrip = ts.timesSquareLocalToWorld(local.x, local.z);
    assert.ok(Math.hypot(roundtrip.x - x, roundtrip.z - z) < 1e-9);
  }
  assert.equal(ts.TIMES_SQUARE_MAIN_ENTRANCE.sourceEdge, 6); assert.equal(ts.TIMES_SQUARE_CURVED_ATRIUM.sourceEdge, 10);
  assert.equal(ts.TIMES_SQUARE_LED_FRONTAGE.sourceEdge, 8); assert.match(ts.TIMES_SQUARE_MAIN_ENTRANCE.evidence, /Photo-directed/);
  assert.doesNotMatch(ts.TIMES_SQUARE_MAIN_ENTRANCE.evidence, /entrance=yes/);
  assert.equal(ts.TIMES_SQUARE_CLOCK.localX, 72); assert.equal(ts.TIMES_SQUARE_CLOCK.localZ, -22);
  assert.ok(Math.abs(ts.TIMES_SQUARE_CLOCK.x - 2384.623110457618) < 1e-9); assert.ok(Math.abs(ts.TIMES_SQUARE_CLOCK.z - 346.01283342250645) < 1e-9);
  assert.notEqual(ts.TIMES_SQUARE_CLOCK.x, ts.TIMES_SQUARE_MAIN_ENTRANCE.x, 'freestanding clock is not the circular wall device');
});
test('Times Square separates OSM, architect and secondary height / floor conventions', () => {
  assert.equal(ts.TIMES_SQUARE_TOWER_ONE_HEIGHT, 193.9); assert.equal(ts.TIMES_SQUARE_TOWER_ONE_OSM_HEIGHT, 194);
  assert.equal(ts.TIMES_SQUARE_TOWER_TWO_HEIGHT, 168.8); assert.equal(ts.TIMES_SQUARE_TOWER_TWO_OSM_HEIGHT, 169);
  assert.equal(ts.TIMES_SQUARE_TOWER_ONE_OFFICE_LEVELS, 33); assert.equal(ts.TIMES_SQUARE_TOWER_TWO_OFFICE_LEVELS, 26);
  assert.equal(ts.TIMES_SQUARE_TOWER_ONE_OSM_LEVELS, 47); assert.equal(ts.TIMES_SQUARE_TOWER_TWO_OSM_LEVELS, 40);
  assert.equal(ts.TIMES_SQUARE_RETAIL_LEVELS, 14); assert.equal(ts.TIMES_SQUARE_OSM_MALL_LEVELS, 10);
  assert.equal(ts.TIMES_SQUARE_OFFICE_FLOOR_TO_FLOOR, 3.525); assert.equal(ts.TIMES_SQUARE_FEATURE_FLOOR_TO_FLOOR, 4.3);
  assert.equal(ts.TIMES_SQUARE_TOWER_ONE_OFFICE_TOP, 176.325); assert.ok(Math.abs(ts.TIMES_SQUARE_TOWER_TWO_OFFICE_TOP - 151.65) < 1e-9);
  assert.equal(ts.TIMES_SQUARE_PODIUM_HEIGHT, 60); assert.equal(ts.TIMES_SQUARE_ARCHITECT, 'Wong & Ouyang');
  assert.equal(ts.TIMES_SQUARE_COMPLETION_YEAR, 1993); assert.equal(ts.TIMES_SQUARE_OPENING_DATE, '1994-04-13');
});
test('Times Square has exactly three original tunnel ways through the mall and no surface way through it', () => {
  assert.deepEqual(centrelineConflicts(ts.TIMES_SQUARE_SITE.ring), [47462, 47464, 47465]);
  assert.equal(ts.TIMES_SQUARE_CROSSING_ROADS.length, 3);
  for (const expected of ts.TIMES_SQUARE_CROSSING_ROADS) {
    const raw = roads[expected.recordIndex]; assert.ok(raw); assert.equal(raw[0], expected.name); assert.equal(raw[1], expected.width);
    assert.equal(raw[4], 4); assert.equal(expected.flags, 4); assert.deepEqual(raw[5], expected.points, 'full original point list, not a shortened signature');
    assert.ok(elevation.isTunnelRoad(expected.recordIndex));
  }
});
test('Times Square ground is continuous max(raw DTM, piazza pad), with roads and the building / landuse roles kept separate', () => {
  const meta = terrain.HONG_KONG_TERRAIN_META, sample = ts.TIMES_SQUARE_GROUND_SAMPLE;
  assert.equal(meta.timesSquarePadHeight, 5.75); assert.equal(meta.timesSquarePadHeight, terrain.rawHongKongTerrainHeight(sample.x, sample.z));
  assert.equal(terrain.hongKongTerrainHeight(sample.x, sample.z), 5.75);
  const clockRaw = terrain.rawHongKongTerrainHeight(ts.TIMES_SQUARE_CLOCK.x, ts.TIMES_SQUARE_CLOCK.z);
  assert.ok(Math.abs(clockRaw - 5.735760119366105) < 1e-9); assert.equal(terrain.hongKongTerrainHeight(ts.TIMES_SQUARE_CLOCK.x, ts.TIMES_SQUARE_CLOCK.z), 5.75);
  const west = ts.timesSquareLocalToWorld(-70, 0), westRaw = terrain.rawHongKongTerrainHeight(west.x, west.z);
  assert.ok(Math.abs(westRaw - 6.806329838330868) < 1e-9); assert.equal(terrain.hongKongTerrainHeight(west.x, west.z), westRaw, 'higher natural DTM is not globally flattened');
  const grounds = { plaza: meta.timesSquarePadHeight + .12 };
  assert.equal(ts.timesSquareGroundHeightAt(sample.x, sample.z, -99, grounds), grounds.plaza);
  assert.equal(ts.timesSquareGroundHeightAt(west.x, west.z, westRaw - .08, grounds), westRaw - .08);
  assert.equal(ts.timesSquareGroundHeightAt(0, 0, 999, grounds), 999);
  assert.ok(ts.isTimesSquareOpenPiazzaPoint(ts.TIMES_SQUARE_CLOCK.x, ts.TIMES_SQUARE_CLOCK.z));
  assert.ok(!ts.isTimesSquareOpenPiazzaPoint(ts.TIMES_SQUARE_SITE.x, ts.TIMES_SQUARE_SITE.z));
  assert.ok(ts.isTimesSquarePlazaPoint(ts.TIMES_SQUARE_SITE.x, ts.TIMES_SQUARE_SITE.z));
  const roadPoint = { x: 2276.2, z: 422.1 }; assert.ok(ts.timesSquarePointInRoadCorridor(roadPoint.x, roadPoint.z));
  assert.ok(!ts.isTimesSquarePlazaPoint(roadPoint.x, roadPoint.z));
  assert.equal(terrain.hongKongTerrainHeight(roadPoint.x, roadPoint.z), terrain.rawHongKongTerrainHeight(roadPoint.x, roadPoint.z));
  assert.equal(ts.timesSquareGroundHeightAt(roadPoint.x, roadPoint.z, 2.5, grounds), 2.5);
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/road-elevation.js'), 'utf8');
  assert.match(source, /\.\.\.TIMES_SQUARE_GROUND_RINGS/);
});
test('Times Square keeps the complete vehicle envelope below its road lintels at every swept road shoulder', () => {
  let minimum = Infinity, critical = null, samples = 0;
  for (const road of ts.TIMES_SQUARE_CROSSING_ROADS) {
    const flat = roads[road.recordIndex][5];
    for (let segment = 0; segment < flat.length / 2 - 1; segment++) {
      const ax = flat[segment * 2], az = flat[segment * 2 + 1], bx = flat[segment * 2 + 2], bz = flat[segment * 2 + 3];
      const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz), steps = Math.max(1, Math.ceil(length / .25));
      for (let step = 0; step <= steps; step++) {
        const t = step / steps, x = ax + dx * t, z = az + dz * t, roadHeight = elevation.roadRibbonHeightAtSegment(road.recordIndex, segment, t);
        for (const lateral of [-1, -.5, 0, .5, 1]) {
          const px = x + dz / length * road.width * .5 * lateral, pz = z - dx / length * road.width * .5 * lateral;
          if (!inside(ts.TIMES_SQUARE_SITE.ring, px, pz)) continue;
          const value = terrain.HONG_KONG_TERRAIN_META.timesSquarePadHeight + ts.TIMES_SQUARE_ROAD_SOFFIT - ts.TIMES_SQUARE_ROAD_LINTEL_DEPTH - roadHeight;
          samples++; if (value < minimum) { minimum = value; critical = { recordIndex: road.recordIndex, segment, t, lateral, roadHeight }; }
        }
      }
    }
  }
  assert.ok(samples > 500, `only ${samples} under-podium shoulder samples`);
  assert.ok(minimum > ts.TIMES_SQUARE_ROAD_VEHICLE_CLEARANCE, `insufficient swept vehicle clearance ${minimum} at ${JSON.stringify(critical)}`);
  assert.ok(minimum > 5.7, `unexpected portal / profile regression ${minimum}`);
});
test('Times Square road bays stay open, colliders are finite and no existing lamp needs suppression', () => {
  let open = 0, entrance = 0, closed = 0, columns = 0;
  for (let edge = 0; edge < 22; edge++) {
    const length = ts.timesSquareEdgeOutward(ts.TIMES_SQUARE_LOCAL_RING, edge).length, bays = Math.max(1, Math.ceil(length / ts.TIMES_SQUARE_PODIUM_BAY_WIDTH));
    const custom = edge === 6 || edge === 10;
    for (let bay = 0; bay < bays; bay++) {
      if (ts.timesSquarePodiumBayConflict(ts.TIMES_SQUARE_LOCAL_RING, edge, bay / bays, (bay + 1) / bays)) { open++; continue; }
      if (custom) { entrance++; continue; }
      closed++;
      const collider = ts.timesSquareSegmentCollider(ts.TIMES_SQUARE_LOCAL_RING, edge, bay / bays, (bay + 1) / bays, 0, 6);
      assert.ok([collider.minX, collider.maxX, collider.minZ, collider.maxZ, collider.minY, collider.maxY].every(Number.isFinite));
    }
    if (custom) continue;
    for (let bay = 0; bay <= bays; bay++) {
      const t = bay / bays, i = edge * 2, x = ts.TIMES_SQUARE_LOCAL_RING[i] + (ts.TIMES_SQUARE_LOCAL_RING[i + 2] - ts.TIMES_SQUARE_LOCAL_RING[i]) * t;
      const z = ts.TIMES_SQUARE_LOCAL_RING[i + 1] + (ts.TIMES_SQUARE_LOCAL_RING[i + 3] - ts.TIMES_SQUARE_LOCAL_RING[i + 1]) * t;
      if (!ts.timesSquareRoadConflictAtLocal(x, z)) columns++;
    }
  }
  assert.deepEqual({ open, entrance, closed, columns }, { open: 12, entrance: 14, closed: 93, columns: 113 });
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed), conflicts = [];
  for (let index = 0; index < lamps.length; index++) {
    if (suppressed.has(index)) continue; const lamp = lamps[index], override = overrides.get(index);
    const x = lamp[0] + (override?.[1] || 0) / 100, z = lamp[1] + (override?.[2] || 0) / 100;
    if (inside(ts.TIMES_SQUARE_SITE.ring, x, z)) conflicts.push(index);
  }
  assert.deepEqual(conflicts, []);
});
test('Times Square hand-built world includes researched identifying features and night materials without photo assets', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/times-square-world.js'), 'utf8');
  for (const pattern of [/TimesSquareTowerOne/, /TimesSquareTowerTwo/, /TimesSquarePinkBeigeHorizontalStonePodium/, /TimesSquareRussellStreetArchedMainEntrance/,
    /TimesSquareTallArchedAtriumGlazing/, /TimesSquarePiazzaCurvedGlassAtrium/, /TimesSquareCornerLEDMediaFrontage/, /TimesSquareVerticalChineseLettering/,
    /TimesSquareCircularWallDeviceNotThePiazzaClock/, /TimesSquareFreestandingFourFacedPiazzaClock/, /TimesSquareClockFace\$\{side \+ 1\}/,
    /TimesSquareClockOpenDomedMetalCanopy/, /NearTopArchedRecess/, /RoundedDarkPlantCrown/, /TimesSquareContinuousDTMSensitivePiazzaPaving/,
    /TimesSquareContinuousRoadClearPodiumSoffit/, /cityUniforms\.uInteriorGlow/, /TIMES_SQUARE_GLYPHS/, /'時':/, /'代':/, /'廣':/, /'場':/]) assert.match(world, pattern);
  assert.doesNotMatch(world, /TextureLoader|image-search|https?:\/\//);
});
test('Times Square is integrated as one authored complex with road-priority ground and a single map label', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  const pack = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  const map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8');
  const inventory = fs.readFileSync(path.join(root, 'docs/hongkong-building-inventory.md'), 'utf8');
  assert.match(simple, /buildTimesSquare\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.timesSquarePadHeight \}\)/);
  assert.match(simple, /\.\.\.timesSquare\.stats/); assert.match(simple, /\.\.\.timesSquare\.colliders/);
  assert.match(simple, /!groundUsesRoad \? timesSquare\.groundHeightAt\(x, z, hkcecGround\) : hkcecGround/);
  assert.match(simple, /buildings: 0/); assert.match(pack, /timesSquare: world\.timesSquare/);
  assert.match(map, /stockLandmarks/); assert.match(map, /\[TIMES_SQUARE_SITE\.name, timesSquareMapSite\]/);
  assert.match(map, /!pointInFlatRing\(TIMES_SQUARE_SITE\.ring, landmark\.x, landmark\.z\)/);
  assert.match(inventory, /\| `HK-B0090` \| 時代廣場 Times Square \| 銅鑼灣 \| 已加入 \| \*\*是\*\* \| \*\*是\*\*/);
  const summary = inventory.match(/目前已實際加入 \*\*(\d+) 幢\*\*；其餘 \*\*(\d+) 幢\*\*/); assert.ok(summary);
  assert.match(inventory, new RegExp(`\\| 已加入場景的建築物 \\| ${summary[1]} \\|`)); assert.match(inventory, new RegExp(`\\| 待製作 \\| ${summary[2]} \\|`));
});
