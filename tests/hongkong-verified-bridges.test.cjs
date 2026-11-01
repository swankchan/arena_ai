const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/verified-osm-bridges.json'), 'utf8'));
let data;
let roads;
let elevation;
let terrain;
let fullMeta;

test.before(async () => {
  data = (await import('../js/hk-verified-bridge-data.js')).HK_VERIFIED_BRIDGES;
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS;
  elevation = await import('../js/cities/hongkong/road-elevation.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  fullMeta = await import('../js/cities/hongkong/full-meta.js');
});

test('only exactly matched OSM bridge/viaduct ways enter the procedural deck generator', () => {
  assert.equal(source.ways.length, 14);
  assert.equal(data.ways.length, source.ways.length);
  assert.match(data.source.heightStatus, /not surveyed engineering elevations/);
  assert.equal(data.source.layerStepMetres, 6);
  for (const entry of source.ways) {
    const road = roads.roads[entry.sourceRecordIndex];
    assert.ok(road, `source record ${entry.sourceRecordIndex} exists`);
    assert.ok(road[4] & 2);
    assert.equal(road[4] & 4, 0, 'no tunnel enters the bridge generator');
    assert.ok(['yes', 'viaduct'].includes(entry.bridge));
    assert.ok(entry.layer > 0);
    assert.ok(entry.osmUrl.endsWith(`/way/${entry.osmWayId}.json`));
    const generated = data.ways.find((way) => way.wayId === entry.sourceRecordIndex);
    assert.equal(generated.osmWayId, entry.osmWayId);
    assert.ok(generated.matchDelta <= 0.000001, `${entry.osmWayId} retains its exact geometry match`);
  }
  const covered = source.reviewedExclusions.find((entry) => entry.sourceRecordIndex === 1889);
  assert.equal(covered.bridge, 'covered');
  assert.equal(elevation.isVerifiedBridgeRoad(1889), false, 'special covered tag is not guessed into an open viaduct');
});

test('verified deck stations and original OSM vertices share one continuous height source', () => {
  for (const way of data.ways) {
    assert.equal(way.segments.length + 1, way.vertexHeights.length);
    for (const [segmentIndex, profile] of way.segments.entries()) {
      assert.equal(profile.ts[0], 0);
      assert.equal(profile.ts.at(-1), 1);
      assert.ok(Math.abs(profile.heights[0] - elevation.roadRibbonHeightAtVertex(way.wayId, segmentIndex)) < 0.0001);
      assert.ok(Math.abs(profile.heights.at(-1) - elevation.roadRibbonHeightAtVertex(way.wayId, segmentIndex + 1)) < 0.0001);
      for (let i = 0; i < profile.ts.length; i++) {
        assert.ok(Number.isFinite(profile.heights[i]));
        if (i) assert.ok(profile.ts[i] > profile.ts[i - 1]);
        assert.ok(Math.abs(elevation.roadRibbonHeightAtSegment(way.wayId, segmentIndex, profile.ts[i]) - profile.heights[i]) < 0.0001);
      }
    }
  }
});

test('shared verified OSM nodes have no vertical cracks between carriageways or ramps', () => {
  const nodes = new Map();
  for (const way of data.ways) {
    const flat = roads.roads[way.wayId][5];
    for (let vertex = 0; vertex < way.vertexHeights.length; vertex++) {
      const key = `${flat[vertex * 2].toFixed(1)},${flat[vertex * 2 + 1].toFixed(1)}`;
      if (!nodes.has(key)) nodes.set(key, []);
      nodes.get(key).push(way.vertexHeights[vertex]);
    }
  }
  let shared = 0;
  for (const heights of nodes.values()) {
    if (heights.length < 2) continue;
    shared++;
    for (const height of heights) assert.ok(Math.abs(height - heights[0]) < 0.00011);
  }
  assert.ok(shared >= 4, 'the test covers real shared interchange nodes');
  const first = data.ways.find((way) => way.wayId === 5990);
  const continuation = data.ways.find((way) => way.wayId === 9524);
  assert.ok(Math.abs(first.vertexHeights.at(-1) - continuation.vertexHeights[0]) < 0.0001);
});

test('deck profiles stay above the DTM without adding a new extreme road grade', () => {
  assert.ok(data.stats.maxLift <= 18.01, 'quantised profiles remain within the six-metre layer presentation step');
  // Way 9529 already has a 25.49% DTM cross-section. The verified deck must not introduce another 37% kink.
  assert.ok(data.stats.maxGrade < 0.255);
  for (const way of data.ways) {
    const flat = roads.roads[way.wayId][5];
    for (const [segmentIndex, profile] of way.segments.entries()) {
      const ax = flat[segmentIndex * 2], az = flat[segmentIndex * 2 + 1];
      const dx = flat[segmentIndex * 2 + 2] - ax, dz = flat[segmentIndex * 2 + 3] - az;
      for (let i = 0; i < profile.ts.length; i++) {
        const x = ax + dx * profile.ts[i], z = az + dz * profile.ts[i];
        assert.ok(profile.heights[i] + 0.0001 >= terrain.hongKongTerrainHeight(x, z) + 0.025);
      }
    }
  }
});

test('entity ground queries use the verified deck while arrivals avoid generic tunnels', () => {
  const flat = roads.roads[5990][5];
  const x = (flat[8] + flat[10]) * 0.5, z = (flat[9] + flat[11]) * 0.5;
  const expected = elevation.roadRibbonHeightAtSegment(5990, 4, 0.5);
  const hit = fullMeta.fullRoadSurfaceAt(x, z, 0.35, expected);
  assert.equal(hit.way.id, 5990);
  assert.ok(Math.abs(hit.height - expected) < 0.0001);

  const spawn = fullMeta.spawnOnFullRoad(1800, -200, { minWidth: 5, radius: 200 });
  assert.ok(spawn);
  assert.equal(roads.roads[spawn.roadId][4] & 4, 0, 'the default arrival is not inside a generic tunnel');
  assert.equal(fullMeta.isTerritoryRoad(2267.45, -160.95, 0.35), false, 'a submerged tube is not surface land');
  const tunnelHeight = elevation.roadRibbonHeightAtSegment(13110, 1, 0.5);
  const tunnel = fullMeta.fullRoadSurfaceAt(2267.45, -160.95, 0.35, tunnelHeight);
  assert.equal(tunnel.way.id, 13110, 'an entity already at tube level retains its layered ground query');
});

test('deep tunnel sections remain covered and only portal cuttings open the terrain', () => {
  const stats = terrain.HK_TERRAIN.stats;
  assert.equal(stats.tunnelPortalCuttingLength, 180);
  assert.equal(stats.tunnelOpeningRects, terrain.HK_TERRAIN.tunnel.openingRects.length);
  assert.ok(stats.tunnelOpeningRects < 10000);
  assert.match(stats.tunnelProfile, /not surveyed engineering depth/);
  for (const wayId of [13110, 8943, 8721]) {
    assert.equal(elevation.TERRAIN_TUNNEL_OPENING_RECTS.filter((rect) => rect.routeId === `osm-tunnel:${wayId}`).length, 0,
      `deep Central-Wan Chai Bypass way ${wayId} is not rendered as an open water trench`);
  }
});
