const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

let GEO;
let HK_FULL_MAP;
let HK_FULL_ROADS;
let meta;
let fullMeta;
let cfg;
let makeFrame;
let pointInRing;
let hongKongFitZoom;
let isHongKongCorePoint;
let HKGMapSystem;
let buildTerritoryCoastColliders;
let colliderContains;
test.before(async () => {
  ({ GEO } = await import('../js/hk-geodata.js'));
  ({ HK_FULL_MAP } = await import('../js/hk-full-map-data.js'));
  ({ HK_FULL_ROADS } = await import('../js/hk-full-roads-data.js'));
  meta = await import('../js/cities/hongkong/meta.js');
  fullMeta = await import('../js/cities/hongkong/full-meta.js');
  ({ default: cfg } = await import('../tools/cities/hongkong/config.mjs'));
  ({ makeFrame } = await import('../tools/geo/frame.mjs'));
  ({ pointInRing } = await import('../tools/geo/geom.mjs'));
  ({ hongKongFitZoom, isHongKongCorePoint, HKGMapSystem } = await import('../js/cities/hongkong/map.js'));
  ({ buildTerritoryCoastColliders } = await import('../js/cities/hongkong/coast-colliders.js'));
  ({ colliderContains } = await import('../js/cities/hongkong/colliders.js'));
});

test('Hong Kong full-map fit uses the available wide and portrait viewports', () => {
  const depth = HK_FULL_MAP.bounds.maxZ - HK_FULL_MAP.bounds.minZ;
  const width = HK_FULL_MAP.bounds.maxX - HK_FULL_MAP.bounds.minX;
  const wideZoom = hongKongFitZoom(HK_FULL_MAP.bounds, 1568, 756);
  assert.ok(wideZoom * depth / 756 > 0.96, 'the wide-screen fit uses over 96% of the canvas height');
  const portraitZoom = hongKongFitZoom(HK_FULL_MAP.bounds, 390, 844);
  assert.ok(portraitZoom * width / 390 > 0.97, 'the portrait fit uses over 97% of the canvas width');
  assert.ok(wideZoom > Math.min(
    1568 / (width * 1.08),
    756 / (depth * 1.1)
  ), 'the tighter fit is larger than the previous padded fit');
});

test('Hong Kong opens on the fitted atlas and prevents tiny manual zoom-outs', () => {
  const source = readFileSync(join(__dirname, '../js/cities/hongkong/map.js'), 'utf8');
  assert.match(source, /this\.resizeFullCanvas\(\);\s*this\.fitAll\(\);\s*this\.renderFullMap\(\)/);
  assert.match(source, /minimumFullZoom\(\)/);
  assert.match(source, /return Math\.max\(MIN_FULL_ZOOM, this\.fitZoom\(\)\);/);
  assert.match(source, /hongKongFitZoom\(HK_FULL_MAP\.bounds, w, h\)/);
  assert.match(source, /Math\.max\(this\.minimumFullZoom\(\), this\.viewZoom \/ 1\.45\)/);
  assert.match(source, /Math\.max\(this\.minimumFullZoom\(\), Math\.min\(MAX_FULL_ZOOM, this\.viewZoom \* factor\)\)/);
});

test('Hong Kong OSM atlas contains territory-wide land, roads, parks and place labels', () => {
  assert.ok(HK_FULL_MAP.land.length >= 200);
  assert.ok(HK_FULL_MAP.roads.length >= 45000);
  assert.ok(HK_FULL_MAP.parks.length >= 1300);
  assert.ok(HK_FULL_MAP.places.length >= 1900);
  for (const name of ['大嶼山', '香港島', '青衣', '屯門', '元朗', '沙田', '西貢', '東涌', '大澳', '長洲', '南丫島']) {
    assert.ok(HK_FULL_MAP.places.some((place) => place[0] === name), `${name} has an OSM place label`);
  }
  const frame = makeFrame(cfg.frame);
  const rings = HK_FULL_MAP.land.map((flat) => {
    const points = [];
    for (let i = 0; i + 1 < flat.length; i += 2) points.push([flat[i], flat[i + 1]]);
    return points;
  });
  for (const check of cfg.fullMapLandChecks) {
    const [x, z] = frame.toWorld(check.lon, check.lat);
    assert.ok(rings.some((ring) => pointInRing(ring, x, z)), `${check.name} is on baked atlas land`);
  }
  for (const check of cfg.fullMapWaterChecks) {
    const [x, z] = frame.toWorld(check.lon, check.lat);
    assert.equal(rings.some((ring) => pointInRing(ring, x, z)), false, `${check.name} remains water`);
  }
});

test('Hong Kong uses one unified simple world and full-road teleport rule', () => {
  const world = readFileSync(join(__dirname, '../js/cities/hongkong/world.js'), 'utf8');
  const simple = readFileSync(join(__dirname, '../js/cities/hongkong/simple-world.js'), 'utf8');
  const map = readFileSync(join(__dirname, '../js/cities/hongkong/map.js'), 'utf8');
  assert.match(world, /buildHongKongWorld\(scene, options = \{\}\)[\s\S]*?return buildSimpleHongKongWorld\(scene, options\)/);
  assert.match(simple, /includeCore: true/);
  assert.match(simple, /presentation: 'unified-simple'/);
  assert.match(simple, /buildHongKongCrossings\(scene\)/);
  assert.match(simple, /selectCrossingGround\(base, crossingSurfaceAt\(x, z\), referenceY, WATER_LEVEL\)/);
  assert.match(simple, /buildings: 0/);
  assert.match(map, /const spawn = spawnOnFullRoad\(x, z/);
  assert.doesNotMatch(map, /this\.drawGround\(ctx, view, false\)/);
  assert.doesNotMatch(map, /詳細建築區/);
});

test('Ting Kau Bridge centre and left lane have no coastal collision wall', () => {
  const { colliders, openings } = buildTerritoryCoastColliders(true);
  assert.ok(openings > 0);
  const cells = new Map(), CELL = 128;
  const key = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  for (const collider of colliders) {
    for (let x = Math.floor(collider.minX / CELL); x <= Math.floor(collider.maxX / CELL); x++) {
      for (let z = Math.floor(collider.minZ / CELL); z <= Math.floor(collider.maxZ / CELL); z++) {
        const cell = `${x},${z}`;
        if (!cells.has(cell)) cells.set(cell, []);
        cells.get(cell).push(collider);
      }
    }
  }
  const blocked = (x, z) => (cells.get(key(x, z)) || []).find((collider) => colliderContains(collider, x, z, 0.2));
  let ways = 0, samples = 0;
  for (const road of HK_FULL_ROADS.roads) {
    if (!road[0]?.includes('汀九橋')) continue;
    ways++;
    const flat = road[5], width = road[1];
    for (let i = 2; i < flat.length; i += 2) {
      const ax = flat[i - 2], az = flat[i - 1], bx = flat[i], bz = flat[i + 1];
      const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz);
      const steps = Math.max(1, Math.ceil(length / 8));
      const sign = road[2] === -1 ? -1 : 1, ux = dx / length * sign, uz = dz / length * sign;
      const offset = Math.min(2.4, Math.max(1.2, width * 0.22));
      for (let step = 0; step <= steps; step++) {
        const t = step / steps, x = ax + dx * t, z = az + dz * t;
        for (const [label, px, pz] of [['centre', x, z], ['left', x + uz * offset, z - ux * offset]]) {
          samples++;
          assert.equal(blocked(px, pz), undefined, `${road[0]} ${label} is blocked at ${px},${pz}`);
        }
      }
    }
  }
  assert.ok(ways >= 10 && samples >= 500, `${ways} Ting Kau ways / ${samples} samples`);
});

test('visible seawalls omit the Western tunnel opening just like their colliders', () => {
  const { segments, wallSegments, openings } = buildTerritoryCoastColliders(true);
  assert.equal(wallSegments.length, segments.length - openings);
  const x = -1349.6764093897661, z = -928.5733495916046;
  const distance = ([x1, z1, x2, z2]) => {
    const dx = x2 - x1, dz = z2 - z1, lengthSq = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / lengthSq));
    return Math.hypot(x - x1 - dx * t, z - z1 - dz * t);
  };
  assert.ok(Math.min(...segments.map(distance)) < 0.001, 'fixture is the formerly visible Western entrance seawall');
  assert.ok(Math.min(...wallSegments.map(distance)) > 8, 'the visible wall no longer crosses the carriageway');
  const world = readFileSync(join(__dirname, '../js/cities/hongkong/full-world.js'), 'utf8');
  assert.match(world, /const \{ wallSegments, colliders, openings \}/);
  assert.match(world, /for \(const \[x1, z1, x2, z2\] of wallSegments\)/);
});

test('Hong Kong atlas clicks outside the core use real roads and reject roadless points', () => {
  const core = { x: (GEO.bounds.minX + GEO.bounds.maxX) / 2, z: (GEO.bounds.minZ + GEO.bounds.maxZ) / 2 };
  assert.equal(isHongKongCorePoint(core.x, core.z), true);
  const tuenMun = HK_FULL_MAP.places.find((place) => place[0] === '屯門');
  assert.equal(isHongKongCorePoint(tuenMun[1], tuenMun[2]), false);
  let destination = null;
  const fake = {
    elHoverInfo: null,
    onTeleport: (x, z, heading) => { destination = { x, z, heading }; },
    renderFullMap() {}
  };
  assert.equal(HKGMapSystem.prototype.teleportAt.call(fake, tuenMun[1], tuenMun[2]), true);
  assert.ok(destination && fullMeta.isTerritoryRoad(destination.x, destination.z, 1), 'arrival is on a full-HK OSM road');
  assert.ok(Number.isFinite(destination.heading));
  assert.equal(HKGMapSystem.prototype.teleportAt.call(fake, 100000, 100000), false, 'roadless clicks are rejected');
});

test('territory-wide arrivals avoid tiny stubs and remain on roads after initial acceleration', () => {
  for (const name of ['屯門', '元朗', '沙田', '西貢', '東涌', '大澳', '梅窩', '長洲', '榕樹灣', '沙頭角']) {
    const place = fullMeta.territoryPlace(name);
    const spawn = meta.spawnOnRoad(place.x, place.z, { minWidth: 5, laneOffset: 2.4 });
    assert.ok(Number.isFinite(spawn.roadId), `${name} uses a real full-road way`);
    assert.ok(fullMeta.isTerritoryRoad(spawn.x, spawn.z, 1), `${name} arrival is on the road`);
    const x = spawn.x + Math.sin(spawn.heading) * 8.65;
    const z = spawn.z + Math.cos(spawn.heading) * 8.65;
    assert.ok(fullMeta.isTerritoryRoad(x, z, 1), `${name} remains on a road after initial acceleration`);
    if (name === '大澳') assert.ok(spawn.segmentLength >= 20, 'Tai O no longer arrives at the end of a five-metre stub');
  }
});

test('Hong Kong road teleports reject water nodes and keep generated spawns on land', () => {
  const click = { x: -3042.4, z: -4389.4 }; // Container Port Road South node at the clipped coast.
  const unfiltered = meta.nearestRoadNode(click.x, click.z);
  assert.equal(unfiltered.id, 7025);
  assert.equal(meta.isLand(unfiltered.x, unfiltered.z), false, 'the regression fixture is really off land');
  const safe = meta.nearestRoadNode(click.x, click.z, { landOnly: true });
  assert.ok(safe && meta.isLand(safe.x, safe.z), 'land-only lookup selects a rendered road node');
  assert.notEqual(safe.id, unfiltered.id);

  const mountParker = meta.spawnOnRoad(5285, 27, { minWidth: 8 });
  assert.ok(meta.isLand(mountParker.x, mountParker.z), 'lane offset cannot move a spawn beyond the coast');
  for (const point of meta.TELEPORTS) {
    if (isHongKongCorePoint(point.x, point.z)) assert.ok(meta.isLand(point.x, point.z), `${point.id} is on detailed-core land`);
    else assert.ok(fullMeta.isTerritoryRoad(point.x, point.z, 1), `${point.id} is on a territory-wide road`);
  }
  for (const [mode, point] of Object.entries(meta.SPAWN)) {
    if (mode !== 'helicopter') assert.ok(meta.isLand(point.x, point.z), `${mode} spawn is on land`);
  }
});

function graphPoints(index) {
  const graph = GEO.roadGraph;
  const link = graph.links[index];
  const points = [[graph.nodes[link[0] * 2], graph.nodes[link[0] * 2 + 1]]];
  for (let i = 0; i + 1 < link[6].length; i += 2) points.push([link[6][i], link[6][i + 1]]);
  points.push([graph.nodes[link[1] * 2], graph.nodes[link[1] * 2 + 1]]);
  return { link, points };
}

test('Hong Kong traffic rejects coastal runoff without removing ordinary major roads', () => {
  const container = graphPoints(2296);
  assert.equal(GEO.roadGraph.names[container.link[2]], '貨櫃碼頭南路');
  assert.equal(meta.isTrafficPathOnLand(container.points, container.link[3]), false);
  const nathan = graphPoints(1268);
  assert.equal(GEO.roadGraph.names[nathan.link[2]], '彌敦道');
  assert.equal(meta.isTrafficPathOnLand(nathan.points, nathan.link[3]), true);

  const trafficSource = readFileSync(join(__dirname, '../js/cities/hongkong/traffic.js'), 'utf8');
  assert.match(trafficSource, /if \(!onLand\[i\]\) continue;/, 'route transitions use the same land filter');
  assert.match(trafficSource, /if \(onLand\[i\] && graph\[i\]\[3\] >= 7\.4 && total\[i\] >= 100\)/, 'initial placement and restaging use the land filter');
});
