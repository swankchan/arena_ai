const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let salisbury, terrain, roads, lamps, clearance, siteUtils;
test.before(async () => {
  salisbury = await import('../js/cities/hongkong/salisbury-ymca-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  siteUtils = await import('../js/cities/hongkong/landmark-site.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
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

test('The Salisbury preserves exact current OSM way 152073872 v5, names and 15 m podium convention', () => {
  const s = salisbury.SALISBURY_SITE;
  assert.equal(s.osmId, 152073872); assert.equal(s.source.version, 5); assert.equal(s.source.sourceTimestamp, '2026-07-29T06:24:03Z');
  assert.equal(s.source.geometry.length, 14); assert.equal(s.source.nodes.at(-1), s.source.nodes[0]);
  assert.equal(s.source.tags.height, '15'); assert.equal(s.source.tags['building:levels'], '4');
  assert.equal(s.source.tags['name:en'], 'The Salisbury'); assert.equal(s.source.tags['was:name:en'], 'YMCA of Hong Kong');
  assert.equal(s.source.tags['addr:housenumber'], '41'); assert.ok(Math.abs(s.ringArea - 2739.7279235477326) < 1e-8);
  assert.equal(salisbury.SALISBURY_PODIUM_HEIGHT, 15); assert.equal(salisbury.SALISBURY_OSM_LEVELS, 4);
});

test('official identity is YMCA of Hong Kong and auxiliary 16-storey history is not a surveyed tower height', () => {
  assert.match(salisbury.SALISBURY_SITE.name, /The Salisbury/);
  assert.deepEqual(salisbury.SALISBURY_TOWER_MODEL_HEIGHTS, [55, 53]); assert.deepEqual(salisbury.SALISBURY_TOWER_VISIBLE_ROWS, [12, 11]);
  assert.ok(salisbury.SALISBURY_RESEARCH_SOURCES.some((s) => /ymcahk\.org\.hk/.test(s.url) && /not confused with the separate Chinese YMCA/.test(s.evidence)));
  assert.ok(salisbury.SALISBURY_RESEARCH_SOURCES.some((s) => /wikipedia/.test(s.url) && /not treated as a surveyed height/.test(s.evidence)));
});

test('two unequal rounded towers and lower connector are photo-derived and contained by the exact podium', () => {
  assert.equal(salisbury.SALISBURY_TOWER_SITES.length, 2); assert.equal(salisbury.SALISBURY_CONNECTOR_HEIGHT, 44);
  for (const site of [...salisbury.SALISBURY_TOWER_SITES, salisbury.SALISBURY_CONNECTOR_SITE]) {
    assert.equal(site.photoDirected, true); assert.equal(site.osmId, null); assert.equal(site.source, null); assert.match(site.evidence, /no separate OSM tower\/part way/);
    for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) for (let sample = 0; sample <= 20; sample++) {
      const t = sample / 20, i = edge * 2, x = site.localRing[i] + (site.localRing[i + 2] - site.localRing[i]) * t, z = site.localRing[i + 1] + (site.localRing[i + 3] - site.localRing[i + 1]) * t;
      assert.ok(inside(salisbury.SALISBURY_SITE.localRing, x, z), `${site.key} outside podium`);
    }
  }
  assert.equal(salisbury.SALISBURY_TOWER_SITES[0].localRing.length / 2 - 1, 24);
});

test('main entrance uses the Salisbury Road frontage and no invented OSM door node', () => {
  const e = salisbury.SALISBURY_MAIN_ENTRANCE; assert.equal(e.sourceEdge, 9); assert.equal(e.t, .5); assert.equal(e.sourceNodeId, undefined);
  assert.match(e.evidence, /frontage nearest the named Salisbury Road/); assert.equal(salisbury.SALISBURY_CANOPY_DEPTH, 3);
  const s = salisbury.SALISBURY_SITE;
  function nearestNamedRoad(edge) {
    const i = edge * 2, p = salisbury.salisburyLocalToWorld(s, (s.localRing[i] + s.localRing[i + 2]) / 2, (s.localRing[i + 1] + s.localRing[i + 3]) / 2); let best = Infinity;
    for (const road of roads) { if (!/Salisbury|梳士巴利/.test(road[0])) continue; const f = road[5]; for (let j = 2; j < f.length; j += 2) best = Math.min(best, pointSegment(p.x, p.z, [f[j - 2], f[j - 1]], [f[j], f[j + 1]])); }
    return best;
  }
  const longEdges = [3, 6, 9, 12], distances = longEdges.map((edge) => nearestNamedRoad(edge));
  assert.equal(longEdges[distances.indexOf(Math.min(...distances))], 9);
});

test('exact podium and photo-directed canopy have no road-centre or carriageway-corridor conflict', () => {
  assert.deepEqual(roadScan(salisbury.SALISBURY_SITE), { centre: [], corridor: [] });
  assert.deepEqual(roadScan(salisbury.SALISBURY_CANOPY_CLEARANCE_SITE), { centre: [], corridor: [] });
  assert.deepEqual(salisbury.salisburyRoadRecords(), []);
});

test('no rendered street light occupies the building or entrance canopy', () => {
  const finalLamps = clearedLampPositions();
  for (const site of [salisbury.SALISBURY_SITE, salisbury.SALISBURY_CANOPY_CLEARANCE_SITE]) assert.deepEqual(finalLamps.filter((lamp) => inside(site.ring, lamp.x, lamp.z)).map((lamp) => lamp.index), []);
});

test('The Salisbury has a traceable DTM pad and unchanged outside terrain', () => {
  const pad = terrain.salisburyPadHeight(); assert.equal(pad, terrain.HONG_KONG_TERRAIN_META.salisburyPadHeight); assert.ok(Number.isFinite(pad));
  const s = salisbury.SALISBURY_SITE; assert.equal(terrain.hongKongTerrainHeight(s.x, s.z), pad);
  const e = salisbury.SALISBURY_MAIN_ENTRANCE; assert.equal(salisbury.salisburyGroundHeightAt(e.x, e.z, 0, pad), pad);
  const x = s.x - 100, z = s.z + 95; assert.equal(terrain.hongKongTerrainHeight(x, z), terrain.rawHongKongTerrainHeight(x, z));
});

test('world authors charcoal tiled podium, contrasting wings and terrace', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/salisbury-ymca-world.js'), 'utf8');
  for (const pattern of [/Charcoal tiled YMCA podium/, /Charcoal podium glazed bands/, /charcoal accent panels/, /rounded tiled floor bands/, /Terrace tensile sail canopy/, /Podium garden wooden pergola slats/, /Red YMCA emblem/, /Warm Salisbury entrance downlights/, /MeshStandardNodeMaterial/, /nightAmount/, /salisburyTerrainHeightAt/]) assert.match(world, pattern);
});

test('The Salisbury is integrated into world, ground, road profiles, map and runtime entry', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8'), road = fs.readFileSync(path.join(root, 'js/cities/hongkong/road-elevation.js'), 'utf8');
  const map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8'), index = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  assert.match(simple, /buildSalisburyYMCA/); assert.match(simple, /salisburyYMCA\.groundHeightAt/); assert.match(simple, /\.\.\.salisburyYMCA\.colliders/); assert.match(simple, /\.\.\.salisburyYMCA\.landmarks/);
  assert.match(road, /SALISBURY_GROUND_RINGS/); assert.match(map, /SALISBURY_SITE\.ring/); assert.match(map, /salisburyYMCAMapSite/); assert.match(index, /salisburyYMCA: world\.salisburyYMCA/);
});


test('all Salisbury mesh geometry contains finite positions and bounding boxes', async () => {
  class Canvas { getContext() { return new Proxy({}, {get: () => () => {}, set: () => true}); } }
  const previous = global.document;
  global.document = {createElement: () => new Canvas()};
  try {
    const THREE = await import('three/webgpu');
    const {buildSalisburyYMCA} = await import('../js/cities/hongkong/salisbury-ymca-world.js');
    const {root, colliders} = buildSalisburyYMCA(new THREE.Scene(), {groundOffset: 5});
    root.traverse(o => {
      if (!o.isMesh) return;
      const pos = o.geometry.getAttribute('position');
      for (const v of pos.array) assert.ok(Number.isFinite(v), o.name);
      o.geometry.computeBoundingBox();
      for (const v of [...o.geometry.boundingBox.min.toArray(), ...o.geometry.boundingBox.max.toArray()]) assert.ok(Number.isFinite(v), o.name);
    });
    // Probe the centre 3.2 m of each entrance at pedestrian height against
    // the actual oriented collision boxes (a sampling test, not a walk-through).
    for (const edge of [3, 9]) {
      const ring = salisbury.SALISBURY_SITE.localRing, i = edge * 2;
      const dx = ring[i + 2] - ring[i], dz = ring[i + 3] - ring[i + 1], len = Math.hypot(dx, dz);
      for (let along = -1.6; along <= 1.6; along += .4) {
        const p = salisbury.salisburyLocalToWorld(salisbury.SALISBURY_SITE,
          (ring[i] + ring[i + 2]) / 2 + dx / len * along,
          (ring[i + 1] + ring[i + 3]) / 2 + dz / len * along);
        const hits = colliders.filter(c => {
          if (c.minY > 6.5 || c.maxY < 6.5) return false;
          const x = p.x - c.obb.cx, z = p.z - c.obb.cz;
          return Math.abs(x * c.obb.cs - z * c.obb.sn) < c.obb.hx && Math.abs(x * c.obb.sn + z * c.obb.cs) < c.obb.hz;
        });
        assert.equal(hits.length, 0, `entrance edge ${edge}, offset ${along}`);
      }
    }
  } finally { global.document = previous; }
});
