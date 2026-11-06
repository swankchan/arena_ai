const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let cgo, terrain, elevation, siteUtils, roads, lamps, clearance, worldUtils, geoUtils;
test.before(async () => {
  cgo = await import('../js/cities/hongkong/central-government-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  elevation = await import('../js/cities/hongkong/road-elevation.js');
  siteUtils = await import('../js/cities/hongkong/landmark-site.js');
  geoUtils = await import('../js/cities/hongkong/authored-landmark-site.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
  worldUtils = await import('../js/cities/hongkong/harbour-city-world-utils.js');
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
  for (let index = 0; index < lamps.length; index++) {
    if (suppressed.has(index)) continue;
    const lamp = lamps[index], override = overrides.get(index);
    result.push({ index, x: lamp[0] + (override?.[1] || 0) / 100, z: lamp[1] + (override?.[2] || 0) / 100 });
  }
  return result;
}

test('Tamar sources keep the CGO site, West relation void, East wing and civic buildings distinct', () => {
  assert.equal(cgo.CGO_SITE.osmId, 918333902); assert.equal(cgo.CGO_SITE.role, 'site');
  assert.equal(cgo.CGO_WEST_SITE.osmType, 'relation'); assert.equal(cgo.CGO_WEST_SITE.osmId, 8366346);
  assert.equal(cgo.CGO_WEST_SITE.source.geometry.length, 17); assert.equal(cgo.CGO_WEST_SITE.source.innerGeometry[0].length, 5);
  assert.equal(cgo.CGO_WEST_INNER_LOCAL_RING.length / 2 - 1, 4); assert.equal(cgo.CGO_OPEN_DOOR_SITE.role, 'source-void');
  assert.equal(cgo.CGO_EAST_SITE.osmId, 101959166); assert.equal(cgo.CGO_EAST_SITE.levels, 23);
  assert.equal(cgo.CGO_CONFERENCE_SITE.osmId, 142227308); assert.equal(cgo.CGO_CONFERENCE_SITE.levels, 4);
  assert.equal(cgo.CEO_SITE.osmId, 101959219); assert.equal(cgo.CEO_SITE.height, 37);
  assert.equal(cgo.LEGCO_SITE.osmId, 925188472); assert.equal(cgo.LEGCO_SITE.levels, 10);
  assert.notEqual(cgo.CGO_SITE.osmId, cgo.LEGCO_SITE.osmId);
  const first = cgo.CGO_WEST_OSM_SOURCE.geometry[0], projected = geoUtils.projectHongKongLonLat(first.lon, first.lat);
  assert.ok(Math.hypot(cgo.CGO_WEST_SITE.ring[0] - projected[0], cgo.CGO_WEST_SITE.ring[1] - projected[1]) < 1e-9);
});

test('contractor height conventions and the three-level Open Door link remain explicit', () => {
  assert.equal(cgo.CGO_OFFICE_HEIGHT, 120); assert.equal(cgo.CGO_LOW_BLOCK_HEIGHT, 25.1);
  assert.equal(cgo.LEGCO_HEIGHT, 52.3); assert.equal(cgo.CEO_HEIGHT, 37);
  assert.equal(cgo.CGO_OPEN_DOOR_SOFFIT, 88); assert.ok(cgo.CGO_OPEN_DOOR_SOFFIT > cgo.CGO_LOW_BLOCK_HEIGHT);
  assert.ok(cgo.CGO_OPEN_DOOR_SOFFIT < cgo.CGO_OFFICE_HEIGHT);
  assert.ok(cgo.CGO_RESEARCH_SOURCES.some((s) => /gammonconstruction/.test(s.url) && /27-storey 120 m CGC/.test(s.evidence)));
  assert.ok(cgo.CGO_RESEARCH_SOURCES.some((s) => /building\.com\.hk/.test(s.url) && /three-level link/.test(s.evidence)));
  assert.ok(cgo.CGO_RESEARCH_SOURCES.some((s) => /hok\.com/.test(s.url) && /Images are not redistributed/.test(s.evidence)));
});

test('all original Tamar access roads are recorded without moving the source buildings', () => {
  assert.deepEqual(roadScan(cgo.CGO_SITE), { centre: [38667, 39082, 40192], corridor: [38667, 39082, 40192] });
  assert.deepEqual(roadScan(cgo.CGO_PODIUM_SITE), { centre: [38667], corridor: [38667] });
  assert.deepEqual(roadScan(cgo.CGO_WEST_SITE), { centre: [], corridor: [38667] });
  assert.deepEqual(roadScan(cgo.CGO_EAST_SITE), { centre: [], corridor: [] });
  assert.deepEqual(roadScan(cgo.CGO_CONFERENCE_SITE), { centre: [38667], corridor: [38667] });
  assert.deepEqual(roadScan(cgo.CEO_SITE), { centre: [], corridor: [43101] });
  assert.deepEqual(roadScan(cgo.LEGCO_SITE), { centre: [], corridor: [38665] });
  assert.deepEqual(cgo.CGO_SITE.roadIds, [38667, 39082, 40192]);
  assert.deepEqual(cgo.CGO_PODIUM_SITE.roadIds, [38667]);
  assert.deepEqual(roads[38667], ['', 5.5, 0, 1, 0, [534.8, 85, 550.5, 89.2, 539.5, 130.2, 523.8, 126]]);
});

test('open podium bays preserve more than the vehicle envelope above each retained road', () => {
  const street = worldUtils.createStreetLevel(cgo.CGO_PODIUM_SITE, { soffit: cgo.CGO_GROUND_SOFFIT, customEdges: [cgo.CGO_PODIUM_OPEN_DOOR_EDGE], bayWidth: 3.8 });
  assert.equal(street.openRoadBays, 6); assert.ok(street.closedBays > 0);
  const base = terrain.HONG_KONG_TERRAIN_META.centralGovernmentPadHeight;
  let minimum = Infinity, samples = 0;
  for (const site of cgo.CGO_GROUND_SITES) {
    for (const id of site.roadIds) {
      const road = roads[id], f = road[5];
      for (let segment = 0; segment < f.length / 2 - 1; segment++) {
        const ax = f[segment * 2], az = f[segment * 2 + 1], bx = f[segment * 2 + 2], bz = f[segment * 2 + 3];
        const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz); if (length < .01) continue;
        const steps = Math.max(1, Math.ceil(length / .5));
        for (let step = 0; step <= steps; step++) {
          const t = step / steps, x = ax + dx * t, z = az + dz * t, roadHeight = elevation.roadRibbonHeightAtSegment(id, segment, t);
          for (const lateral of [-1, 0, 1]) {
            const px = x + dz / length * road[1] * .5 * lateral, pz = z - dx / length * road[1] * .5 * lateral;
            if (!inside(site.ring, px, pz)) continue;
            minimum = Math.min(minimum, base + cgo.CGO_GROUND_SOFFIT - .42 - roadHeight); samples++;
          }
        }
      }
    }
  }
  assert.ok(samples > 20); assert.ok(minimum > cgo.CGO_ROAD_VEHICLE_CLEARANCE, `minimum vehicle clearance ${minimum}`);
});

test('no cleared street lamp occupies any Tamar building or civic site', () => {
  const finalLamps = clearedLampPositions();
  for (const site of [cgo.CGO_SITE, cgo.CGO_WEST_SITE, cgo.CGO_EAST_SITE, cgo.CGO_CONFERENCE_SITE, cgo.CEO_SITE, cgo.LEGCO_SITE]) {
    assert.deepEqual(finalLamps.filter((lamp) => inside(site.ring, lamp.x, lamp.z)).map((lamp) => lamp.index), []);
  }
});

test('the shared DTM datum is reproducible and original roads remain road-priority', () => {
  const pad = terrain.centralGovernmentPadHeight(); assert.equal(pad, terrain.HONG_KONG_TERRAIN_META.centralGovernmentPadHeight); assert.ok(Number.isFinite(pad));
  assert.equal(cgo.centralGovernmentTerrainHeightAt(cgo.CGO_SITE.x, cgo.CGO_SITE.z, 0, pad), pad);
  const roadPoint = { x: 539.5, z: 130.2 }; assert.ok(inside(cgo.CGO_SITE.ring, roadPoint.x, roadPoint.z));
  assert.equal(cgo.centralGovernmentTerrainHeightAt(roadPoint.x, roadPoint.z, 0, pad), 0);
  assert.equal(terrain.hongKongTerrainHeight(roadPoint.x, roadPoint.z), terrain.rawHongKongTerrainHeight(roadPoint.x, roadPoint.z));
  const x = cgo.CGO_SITE.x + 260, z = cgo.CGO_SITE.z + 180;
  assert.equal(terrain.hongKongTerrainHeight(x, z), terrain.rawHongKongTerrainHeight(x, z));
});

test('photo-directed LegCo high block and chamber stay within the exact complex ring', () => {
  for (const [x, z, w, d] of [[10, 0, 40, 32], [-32, -2, 38, 30]]) {
    for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) assert.ok(inside(cgo.LEGCO_SITE.localRing, x + sx * w / 2, z + sz * d / 2));
  }
  assert.match(cgo.LEGCO_MAIN_ENTRANCE.evidence, /Photo-directed/);
});

test('world source authors the Open Door, double-skin fins, civic entrances and LegCo disc without photo assets', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/central-government-world.js'), 'utf8');
  for (const pattern of [/CGC Open Door — pale coffered soffit over a real void/, /CGC three-level elevated link/, /individual vision glass panels/, /double-skin fins/, /CGC West Wing source void below the link/, /Chief Executive’s Office — exact four-storey/, /LegCo — projecting oval disc roof/, /LegCo — curved glass council chamber drum/, /CGC Open Door — walkable stone paving/]) assert.match(world, pattern);
  assert.doesNotMatch(world, /image-search|\.jpg|\.png|TextureLoader|https?:\/\//);
});

test('Tamar is integrated into world, ground, roads, map, runtime entry and generated bundle', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  const road = fs.readFileSync(path.join(root, 'js/cities/hongkong/road-elevation.js'), 'utf8');
  const map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'js/app.runtime.manifest.json'), 'utf8'));
  assert.match(simple, /buildCentralGovernmentComplex/); assert.match(simple, /centralGovernment\.groundHeightAt/);
  assert.match(simple, /\.\.\.centralGovernment\.colliders/); assert.match(simple, /\.\.\.centralGovernment\.landmarks/);
  assert.match(road, /CGO_GROUND_RINGS/); assert.match(map, /centralGovernmentMapSite/); assert.match(map, /legislativeCouncilMapSite/);
  assert.match(index, /centralGovernment: world\.centralGovernment/);
  assert.ok(manifest.inputs.includes('js/cities/hongkong/central-government-world.js'));
  assert.ok(manifest.inputs.includes('js/cities/hongkong/central-government-architecture.js'));
});

test('Node geometry is finite and the source void has no occupied collider below the high link', async () => {
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, fillText() {} }) }) };
  const THREE = await import('three/webgpu');
  const { buildCentralGovernmentComplex } = await import('../js/cities/hongkong/central-government-world.js');
  const scene = new THREE.Scene(), world = buildCentralGovernmentComplex(scene, { groundOffset: 5 });
  let meshes = 0, vertices = 0, nonFinite = 0;
  scene.traverse((object) => {
    if (!object.isMesh) return; meshes++;
    const positions = object.geometry.getAttribute('position'); vertices += positions?.count ?? 0;
    if (positions) for (const value of positions.array) if (!Number.isFinite(value)) nonFinite++;
  });
  assert.equal(nonFinite, 0); assert.ok(meshes >= 90); assert.ok(vertices > 150000);
  assert.ok(world.stats.centralGovernmentCurtainPanels > 10000); assert.equal(world.landmarks.length, 3);
  const ring = cgo.CGO_WEST_INNER_WORLD_RING;
  const centre = ring.slice(0, -2).reduce((p, value, index, array) => {
    if (index % 2) p.z += value / (array.length / 2); else p.x += value / (array.length / 2); return p;
  }, { x: 0, z: 0 });
  const occupiedAtDoorCentre = world.colliders.filter((c) => {
    if (c.minY >= 5 + cgo.CGO_OPEN_DOOR_SOFFIT || c.maxY <= 7) return false;
    const dx = centre.x - c.obb.cx, dz = centre.z - c.obb.cz;
    return Math.abs(dx * c.obb.cs - dz * c.obb.sn) <= c.obb.hx && Math.abs(dx * c.obb.sn + dz * c.obb.cs) <= c.obb.hz;
  });
  assert.deepEqual(occupiedAtDoorCentre, []);
  assert.ok(world.colliders.some((c) => c.minY >= 5 + cgo.CGO_OPEN_DOOR_SOFFIT));
});

test('the "Door Always Open" is a real carved breezeway through the West Wing, not a painted panel', () => {
  const door = cgo.CGO_DOOR_OPENING;
  // Both faces it passes through are exact source geometry: the outer relation ring and the mapped inner void.
  assert.equal(door.outerEdge, 11); assert.equal(door.innerEdge, 1);
  assert.equal(cgo.CGO_WEST_SITE.localRing.length / 2 - 1, 16);
  assert.equal(cgo.CGO_WEST_INNER_LOCAL_RING.length / 2 - 1, 4);
  assert.equal(door.y0, cgo.CGO_LOW_BLOCK_HEIGHT); assert.equal(door.y1, cgo.CGO_OPEN_DOOR_SOFFIT);
  assert.ok(door.y1 - door.y0 > 60, 'the opening must be full height, not one storey');
  // Width is measured on the real 42.9 m north facade rather than asserted as a round number.
  const ring = cgo.CGO_WEST_SITE.localRing, i = door.outerEdge * 2;
  const facade = Math.hypot(ring[i + 2] - ring[i], ring[i + 3] - ring[i + 1]);
  assert.ok(Math.abs(facade - 42.9) < 0.2); assert.ok(Math.abs(door.widthMetres - (door.t1Outer - door.t0Outer) * facade) < 0.01);
  assert.ok(door.widthMetres > 15 && door.widthMetres < 26);

  // The passage is open ground: no collider and no geometry may fill the slot between the two faces.
  const site = cgo.CGO_WEST_SITE;
  const midpoint = (edgeRing, edge, t) => {
    const k = edge * 2, ax = edgeRing[k], az = edgeRing[k + 1], bx = edgeRing[k + 2], bz = edgeRing[k + 3];
    const cs = Math.cos(site.ry), sn = Math.sin(site.ry), lx = ax + (bx - ax) * t, lz = az + (bz - az) * t;
    return { x: site.x + cs * lx + sn * lz, z: site.z - sn * lx + cs * lz };
  };
  const outer = midpoint(ring, door.outerEdge, (door.t0Outer + door.t1Outer) / 2);
  const inner = midpoint(cgo.CGO_WEST_INNER_LOCAL_RING, door.innerEdge, (door.t0Inner + door.t1Inner) / 2);
  const samples = [];
  for (let step = 1; step < 8; step++) {
    const t = step / 8;
    samples.push({ x: outer.x + (inner.x - outer.x) * t, z: outer.z + (inner.z - outer.z) * t });
  }
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/central-government-world.js'), 'utf8');
  assert.match(world, /doorSkipBay\(CGO_DOOR_OPENING\.outerEdge/);
  assert.match(world, /doorSkipBay\(CGO_DOOR_OPENING\.innerEdge/);
  assert.match(world, /doorTop: CGO_DOOR_OPENING\.y1/);
  assert.match(world, /doorAwareRingColliders/);
  assert.match(world, /Open Door — pale jamb piers on both facades/);
  assert.match(world, /Open Door — walkable stone passage floor/);
  // Every sample of the breezeway is inside the West Wing footprint, and the inner mouth reaches the mapped void so
  // the corridor is a real through-route rather than a recess.
  assert.ok(samples.every((p) => inside(cgo.CGO_WEST_SITE.ring, p.x, p.z)));
  assert.ok(inside(cgo.CGO_OPEN_DOOR_SITE.ring, inner.x, inner.z));
  assert.ok(!inside(cgo.CGO_OPEN_DOOR_SITE.ring, outer.x, outer.z));
  const depth = Math.hypot(inner.x - outer.x, inner.z - outer.z);
  assert.ok(Math.abs(depth - door.passageDepthMetres) < 0.1);
});
