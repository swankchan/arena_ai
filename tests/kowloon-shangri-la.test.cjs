const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let ksl, terrain, elevation, siteUtils, roads, lamps, clearance, worldUtils, tstUtils;
test.before(async () => {
  ksl = await import('../js/cities/hongkong/kowloon-shangri-la-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  elevation = await import('../js/cities/hongkong/road-elevation.js');
  siteUtils = await import('../js/cities/hongkong/landmark-site.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
  worldUtils = await import('../js/cities/hongkong/harbour-city-world-utils.js');
  tstUtils = await import('../js/cities/hongkong/tst-hotel-site.js');
});
function inside(ring, x, z) { return siteUtils.pointInFlatRing(ring, x, z); }
function pointSegment(x, z, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz, t = l ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l)) : 0; return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); }
function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function intersects(a, b, c, d) { const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1], denominator = cross(rx, rz, sx, sz); if (Math.abs(denominator) < 1e-9) return false; const qx = c[0] - a[0], qz = c[1] - a[1], t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator; return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9; }
function segmentDistance(a, b, c, d) { return intersects(a, b, c, d) ? 0 : Math.min(pointSegment(...a, c, d), pointSegment(...b, c, d), pointSegment(...c, a, b), pointSegment(...d, a, b)); }
function roadScan(site) {
  const centre = new Set(), corridor = new Set(), b = site.bounds;
  for (const [id, road] of roads.entries()) {
    const flat = road[5], margin = road[1] * .5 + .35;
    for (let i = 2; i < flat.length; i += 2) {
      const a = [flat[i - 2], flat[i - 1]], c = [flat[i], flat[i + 1]];
      if (Math.max(a[0], c[0]) < b.minX - margin || Math.min(a[0], c[0]) > b.maxX + margin || Math.max(a[1], c[1]) < b.minZ - margin || Math.min(a[1], c[1]) > b.maxZ + margin) continue;
      let hit = inside(site.ring, ...a) || inside(site.ring, ...c), distance = hit ? 0 : Infinity;
      for (let j = 2; j < site.ring.length; j += 2) {
        const d = [site.ring[j - 2], site.ring[j - 1]], e = [site.ring[j], site.ring[j + 1]];
        if (intersects(a, c, d, e)) hit = true; distance = Math.min(distance, segmentDistance(a, c, d, e));
      }
      if (hit) centre.add(id); if (distance < margin) corridor.add(id);
    }
  }
  return { centre: [...centre], corridor: [...corridor] };
}
function clearedLampPositions() {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed), result = [];
  for (let index = 0; index < lamps.length; index += 1) {
    if (suppressed.has(index)) continue;
    const lamp = lamps[index], override = overrides.get(index); result.push({ index, x: lamp[0] + (override?.[1] || 0) / 100, z: lamp[1] + (override?.[2] || 0) / 100 });
  }
  return result;
}

test('Kowloon Shangri-La preserves exact OSM way 29403978 v7, source tags and entrance node', () => {
  const s = ksl.KOWLOON_SHANGRI_LA_SITE;
  assert.equal(s.osmId, 29403978); assert.equal(s.source.version, 7); assert.equal(s.source.sourceTimestamp, '2022-12-06T13:39:55Z');
  assert.equal(s.source.geometry.length, 11); assert.equal(s.source.nodes.at(-1), s.source.nodes[0]);
  assert.equal(s.source.tags.building, 'yes'); assert.equal(s.source.tags['building:levels'], '16'); assert.equal(s.source.tags.layer, '2');
  assert.equal(s.source.tags.height, undefined); assert.equal(s.source.tags.name, undefined); assert.equal(s.height, null);
  assert.equal(s.ring.length / 2 - 1, 10); assert.ok(Math.abs(s.ringArea - 2891.6056955673266) < 1e-8);
  assert.deepEqual(s.roadIds, [44185, 44186]);
  const node = ksl.KOWLOON_SHANGRI_LA_SOURCE_ENTRANCE_NODE;
  assert.equal(node.id, 2441357636); assert.deepEqual(node.tags, { entrance: 'yes', exit: 'yes' });
  const projected = tstUtils.tstHotelProject(node.lon, node.lat), source = ksl.KOWLOON_SHANGRI_LA_SOURCE_ENTRANCE;
  assert.equal(source.sourceNodeId, node.id); assert.equal(source.sourceEdge, 2); assert.equal(source.t, 1);
  assert.ok(Math.hypot(source.x - projected[0], source.z - projected[1]) < 1e-9);
});

test('official Kowloon identity and architect floor conventions stay separate from photo-derived height', () => {
  assert.match(ksl.KOWLOON_SHANGRI_LA_SITE.name, /Kowloon Shangri-La/); assert.doesNotMatch(ksl.KOWLOON_SHANGRI_LA_SITE.name, /Island Shangri-La/);
  assert.equal(ksl.KOWLOON_SHANGRI_LA_COMPLETION_YEAR, 1981); assert.equal(ksl.KOWLOON_SHANGRI_LA_OSM_LEVELS, 16);
  assert.equal(ksl.KOWLOON_SHANGRI_LA_GUESTROOM_ROWS, 14); assert.equal(ksl.KOWLOON_SHANGRI_LA_MODEL_HEIGHT, 62);
  assert.ok(ksl.KOWLOON_SHANGRI_LA_RESEARCH_SOURCES.some((s) => /shangri-la\.com\/hongkong\/kowloonshangrila/.test(s.url) && /64 Mody Road/.test(s.evidence) && /not the separate Island Shangri-La/.test(s.evidence)));
  assert.ok(ksl.KOWLOON_SHANGRI_LA_RESEARCH_SOURCES.some((s) => /wongouyang\.com/.test(s.url) && /14 guestroom floors, two podium floors/.test(s.evidence) && /no overall height/.test(s.evidence)));
  assert.match(ksl.KOWLOON_SHANGRI_LA_TOWER_SITE.evidence, /No surveyed height or separate OSM tower\/part footprint/);
});

test('photo-derived inset tower remains inside the exact podium and its bays fit the terrace', () => {
  const source = ksl.KOWLOON_SHANGRI_LA_SITE, tower = ksl.KOWLOON_SHANGRI_LA_TOWER_SITE;
  assert.equal(tower.photoDirected, true); assert.equal(tower.osmId, null); assert.equal(tower.source, null);
  assert.equal(tower.localRing.length / 2 - 1, 9); assert.equal(ksl.KOWLOON_SHANGRI_LA_TOWER_INSET, 1.35);
  assert.ok(ksl.KOWLOON_SHANGRI_LA_BAY_PROJECTION < ksl.KOWLOON_SHANGRI_LA_TOWER_INSET);
  for (let edge = 0; edge < tower.localRing.length / 2 - 1; edge++) for (let sample = 0; sample <= 40; sample++) {
    const t = sample / 40, i = edge * 2, x = tower.localRing[i] + (tower.localRing[i + 2] - tower.localRing[i]) * t, z = tower.localRing[i + 1] + (tower.localRing[i + 3] - tower.localRing[i + 1]) * t;
    assert.ok(inside(source.localRing, x, z), `upper tower edge ${edge} outside exact podium`);
  }
});

test('photo-directed arrival-court lobby stays distinct from the exact OSM side access', () => {
  const main = ksl.KOWLOON_SHANGRI_LA_MAIN_ENTRANCE;
  assert.equal(main.sourceEdge, 6); assert.equal(main.t, .5); assert.equal(main.sourceNodeId, undefined);
  assert.match(main.evidence, /Photo-directed/); assert.match(main.evidence, /distinct from the exact OSM entrance\/exit node/);
  assert.equal(ksl.KOWLOON_SHANGRI_LA_CANOPY_WIDTH, 18); assert.equal(ksl.KOWLOON_SHANGRI_LA_CANOPY_DEPTH, 5.2);
  assert.deepEqual(roadScan(ksl.KOWLOON_SHANGRI_LA_CANOPY_CLEARANCE_SITE), { centre: [], corridor: [] });
});

test('both original one-way arrival roads remain connected below open bays with full vehicle clearance', () => {
  assert.deepEqual(roadScan(ksl.KOWLOON_SHANGRI_LA_SITE), { centre: [44185, 44186], corridor: [44185, 44186] });
  assert.deepEqual(ksl.kowloonShangriLaRoadRecords().map((road) => road.recordIndex), [44185, 44186]);
  assert.deepEqual(roads[44185], ['', 5.5, 1, 1, 0, [1757.4, -1681.9, 1748.5, -1690.8, 1741.5, -1694.9]]);
  assert.deepEqual(roads[44186], ['', 5.5, 1, 1, 0, [1779.4, -1701.7, 1781.2, -1698.8, 1780.2, -1695.8, 1763.9, -1680.3, 1759.2, -1680.6, 1757.4, -1681.9]]);
  const street = worldUtils.createStreetLevel(ksl.KOWLOON_SHANGRI_LA_SITE, { soffit: ksl.KOWLOON_SHANGRI_LA_ROAD_SOFFIT, customEdges: [6], bayWidth: 3.4 });
  assert.equal(street.openRoadBays, 7); assert.ok(street.closedBays > 0);
  let minimum = Infinity, samples = 0;
  for (const road of ksl.kowloonShangriLaRoadRecords()) {
    const f = road.points;
    for (let segment = 0; segment < f.length / 2 - 1; segment++) {
      const ax = f[segment * 2], az = f[segment * 2 + 1], bx = f[segment * 2 + 2], bz = f[segment * 2 + 3], dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz), steps = Math.max(1, Math.ceil(length / .25));
      for (let step = 0; step <= steps; step++) {
        const t = step / steps, x = ax + dx * t, z = az + dz * t, roadHeight = elevation.roadRibbonHeightAtSegment(road.recordIndex, segment, t);
        for (const lateral of [-1, -.5, 0, .5, 1]) {
          const px = x + dz / length * road.width * .5 * lateral, pz = z - dx / length * road.width * .5 * lateral;
          if (!inside(ksl.KOWLOON_SHANGRI_LA_SITE.ring, px, pz)) continue;
          minimum = Math.min(minimum, terrain.HONG_KONG_TERRAIN_META.kowloonShangriLaPadHeight + ksl.KOWLOON_SHANGRI_LA_ROAD_SOFFIT - .42 - roadHeight); samples++;
        }
      }
    }
  }
  assert.equal(samples, 289); assert.ok(minimum > 4.7, `minimum vehicle clearance ${minimum}`);
});

test('the two source facade lamps are relocated to footways and no lamp occupies building or canopy', () => {
  for (const index of [118698, 118699]) assert.ok(inside(ksl.KOWLOON_SHANGRI_LA_SITE.ring, lamps[index][0], lamps[index][1]));
  const finalLamps = clearedLampPositions(), overrides = new Map(clearance.overrides.map((row) => [row[0], row]));
  for (const site of [ksl.KOWLOON_SHANGRI_LA_SITE, ksl.KOWLOON_SHANGRI_LA_CANOPY_CLEARANCE_SITE]) assert.deepEqual(finalLamps.filter((lamp) => inside(site.ring, lamp.x, lamp.z)).map((lamp) => lamp.index), []);
  for (const index of [118698, 118699]) {
    const row = overrides.get(index); assert.ok(row, `missing authored lamp override ${index}`);
    const distance = Math.hypot(row[1] / 100, row[2] / 100); assert.ok(distance > 3 && distance < 4);
  }
});

test('Kowloon Shangri-La has a traceable DTM pad while roads and outside terrain keep their profiles', () => {
  const pad = terrain.kowloonShangriLaPadHeight(); assert.equal(pad, terrain.HONG_KONG_TERRAIN_META.kowloonShangriLaPadHeight); assert.ok(Number.isFinite(pad));
  const main = ksl.KOWLOON_SHANGRI_LA_MAIN_ENTRANCE;
  assert.equal(terrain.hongKongTerrainHeight(main.x, main.z), pad); assert.equal(ksl.kowloonShangriLaGroundHeightAt(main.x, main.z, 0, pad), pad);
  const roadPoint = { x: 1759.2, z: -1680.6 }; assert.ok(inside(ksl.KOWLOON_SHANGRI_LA_SITE.ring, roadPoint.x, roadPoint.z));
  assert.equal(terrain.hongKongTerrainHeight(roadPoint.x, roadPoint.z), terrain.rawHongKongTerrainHeight(roadPoint.x, roadPoint.z));
  const x = ksl.KOWLOON_SHANGRI_LA_SITE.x + 110, z = ksl.KOWLOON_SHANGRI_LA_SITE.z - 90;
  assert.equal(terrain.hongKongTerrainHeight(x, z), terrain.rawHongKongTerrainHeight(x, z));
});

test('world authors dark podium, gold identity, flags and real three-sided bay-window geometry', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/kowloon-shangri-la-world.js'), 'utf8');
  for (const pattern of [/Exact OSM two-level dark bronze/, /road-safe porte-cochere columns/, /projecting three-sided Kowloon Shangri-La bay windows/, /Angled dark-bronze bay-window jambs and transoms/, /Gold Shangri-La lettering/, /dark porte-cochere canopy/, /podium flagpoles/, /KOWLOON_SHANGRI_LA_GUESTROOM_ROWS/, /kowloonShangriLaTerrainHeightAt/]) assert.match(world, pattern);
  assert.doesNotMatch(world, /image-search|\.jpg|\.png|TextureLoader/);
});

test('Kowloon Shangri-La is integrated into world, ground, road profiles, lamps, map and runtime entry', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8'), road = fs.readFileSync(path.join(root, 'js/cities/hongkong/road-elevation.js'), 'utf8');
  const map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8'), index = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  const lampsBuilder = fs.readFileSync(path.join(root, 'tools/cities/hongkong/build-street-light-clearance.mjs'), 'utf8');
  assert.match(simple, /buildKowloonShangriLa/); assert.match(simple, /kowloonShangriLa\.groundHeightAt/); assert.match(simple, /\.\.\.kowloonShangriLa\.colliders/); assert.match(simple, /\.\.\.kowloonShangriLa\.landmarks/);
  assert.match(road, /KOWLOON_SHANGRI_LA_GROUND_RINGS/); assert.match(map, /KOWLOON_SHANGRI_LA_SITE\.ring/); assert.match(map, /kowloonShangriLaMapSite/); assert.match(index, /kowloonShangriLa: world\.kowloonShangriLa/);
  assert.match(lampsBuilder, /clearKowloonShangriLaFootprint/); assert.match(lampsBuilder, /Kowloon Shangri-La OSM way 29403978/);
});
