const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

let smoothing, geometry, elevation, trafficPaths, geo, fullRoads;
test.before(async () => {
  smoothing = await import('../js/cities/hongkong/road-profile-smoothing.js');
  geometry = await import('../js/cities/hongkong/traffic-geometry.js');
  elevation = await import('../js/cities/hongkong/road-elevation.js');
  trafficPaths = await import('../js/cities/hongkong/traffic-paths.js');
  geo = (await import('../js/hk-geodata.js')).GEO;
  fullRoads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS;
});

test('ordinary road smoothing raises sharp approaches without lowering the conservative terrain ribbon', () => {
  const nodes = [0, 1, 2, 3, 4].map((x) => ({ x: x * 8, z: 0, height: x === 2 ? 6 : 0 }));
  const result = smoothing.smoothConstrainedProfileHeights(nodes);
  assert.equal(result[0], 0);
  assert.equal(result.at(-1), 0);
  assert.equal(result[2], 6);
  for (let i = 0; i < result.length; i++) assert.ok(result[i] >= nodes[i].height);
  const originalPeakChange = Math.abs((nodes[2].height - nodes[1].height) - (nodes[3].height - nodes[2].height));
  const smoothPeakChange = Math.abs((result[2] - result[1]) - (result[3] - result[2]));
  assert.ok(result[1] > 0 && result[3] > 0);
  assert.ok(smoothPeakChange < originalPeakChange * 0.55);
});

test('iterative smoothing never lowers the source or exceeds the bounded DTM correction', () => {
  const nodes = [10, 0, 8, 9].map((height, x) => ({ x: x * 10, z: 0, height }));
  const result = smoothing.smoothConstrainedProfileHeights(nodes);
  assert.ok(result[1] > 0);
  for (let i = 0; i < result.length; i++) {
    assert.ok(result[i] >= nodes[i].height);
    assert.ok(result[i] <= nodes[i].height + smoothing.MAX_ORDINARY_ROAD_LIFT + 1e-9);
  }
});

test('terrain smoothing does not lift a switchback towards its shortcut chord', () => {
  const nodes = [
    { x: 0, z: 0, height: 10 },
    { x: 50, z: 0, height: 0 },
    { x: 0, z: 10, height: 10 },
    { x: -20, z: 10, height: 10 }
  ];
  const result = smoothing.smoothConstrainedProfileHeights(nodes);
  assert.equal(result[1], 0);
  assert.deepEqual(result, nodes.map((node) => node.height));
});

test('verified bridge profiles bypass terrain smoothing', () => {
  const profile = elevation.roadRibbonProfileAtSegment(5990, 4);
  const bridge = elevation.verifiedBridgeProfileAtSegment(5990, 4);
  assert.ok(bridge);
  assert.deepEqual(profile.heights, bridge.heights);
});

function rightAngle(direction) {
  return geometry.buildCircularTurn({
    fromPoint: { x: 0, z: 0 }, fromDirection: { x: 0, z: 1 }, fromTotal: 100,
    toPoint: { x: 0, z: 0 }, toDirection: { x: direction, z: 0 }, toTotal: 100,
    radius: 10, minimumRadius: 3
  });
}

test('unverified elevated roads also retain their original non-terrain-smoothed profile', () => {
  const wayId = 32210, vertex = 1, road = fullRoads.roads[wayId], flat = road[5];
  assert.ok(road[4] & 2);
  const x = flat[vertex * 2], z = flat[vertex * 2 + 1];
  let expected = elevation.surfaceRoadHeight(x, z);
  for (const segment of [vertex - 1, vertex]) {
    const start = segment * 2;
    const dx = flat[start + 2] - flat[start], dz = flat[start + 3] - flat[start + 1];
    const length = Math.hypot(dx, dz);
    const ox = dz / length * road[1] * 0.5, oz = -dx / length * road[1] * 0.5;
    expected = Math.max(expected, elevation.surfaceRoadHeight(x + ox, z + oz),
      elevation.surfaceRoadHeight(x - ox, z - oz));
  }
  assert.equal(elevation.roadRibbonHeightAtVertex(wayId, vertex), expected);
});

test('AI left and right turns are constant-radius tangent arcs with the correct independent indicators', () => {
  for (const direction of [1, -1]) {
    const turn = rightAngle(direction);
    assert.ok(turn);
    assert.equal(turn.radius, 10);
    assert.equal(turn.blink, direction > 0 ? -1 : 1);
    assert.ok(Math.abs(turn.startTravelS - 90) < 1e-8);
    assert.ok(Math.abs(turn.endTravelS - 10) < 1e-8);
    assert.ok(Math.abs(turn.length - Math.PI * 5) < 1e-8);
    const start = geometry.sampleCircularTurn(turn, 0), end = geometry.sampleCircularTurn(turn, turn.length);
    assert.ok(Math.hypot(start.x, start.z + 10) < 1e-8);
    assert.ok(Math.hypot(end.x - direction * 10, end.z) < 1e-8);
    let previousHeading = turn.fromHeading;
    for (let sample = 1; sample <= 64; sample++) {
      const p = geometry.sampleCircularTurn(turn, turn.length * sample / 64);
      const delta = geometry.wrapTrafficAngle(p.heading - previousHeading);
      assert.ok(Math.sign(delta) === turn.sign);
      assert.ok(Math.abs(Math.hypot(p.x - turn.centreX, p.z - turn.centreZ) - turn.radius) < 1e-8);
      previousHeading = p.heading;
    }
  }
});

test('dead-end U-turns use a continuous slow cubic instead of reversing and jumping lanes in one frame', () => {
  const turn = geometry.buildCubicTurn({
    fromPoint: { x: 2, z: 0 }, fromDirection: { x: 0, z: 1 }, fromTotal: 100,
    toPoint: { x: -2, z: 0 }, toDirection: { x: 0, z: -1 }, toTotal: 100, radius: 10
  });
  assert.ok(turn);
  assert.equal(turn.kind, 'cubic');
  assert.equal(turn.blink, 1);
  assert.ok(turn.speed < 2);
  const start = geometry.samplePlannedTurn(turn, 0), end = geometry.samplePlannedTurn(turn, turn.length);
  const tangentDistance = 100 - turn.startTravelS;
  assert.ok(Math.hypot(start.x - 2, start.z + tangentDistance) < 1e-8);
  assert.ok(Math.hypot(end.x + 2, end.z + tangentDistance) < 1e-8);
  let previous = start;
  for (let i = 1; i <= 96; i++) {
    const p = geometry.samplePlannedTurn(turn, turn.length * i / 96);
    assert.ok(Math.abs(geometry.wrapTrafficAngle(p.heading - previous.heading)) < 0.2);
    previous = p;
  }
});

test('dead-end semicircular U-turns use the space beyond the junction without a cusp', () => {
  const turn = geometry.buildSemicircularUturn({
    fromPoint: { x: 2, z: 0 }, fromDirection: { x: 0, z: 1 },
    toPoint: { x: -2, z: 0 }, startTravelS: 100
  });
  assert.ok(turn);
  assert.equal(turn.radius, 2);
  assert.equal(turn.blink, 1);
  const start = geometry.samplePlannedTurn(turn, 0);
  const middle = geometry.samplePlannedTurn(turn, turn.length * 0.5);
  const end = geometry.samplePlannedTurn(turn, turn.length);
  assert.ok(Math.hypot(start.x - 2, start.z) < 1e-8);
  assert.ok(Math.hypot(middle.x, middle.z - 2) < 1e-8);
  assert.ok(Math.hypot(end.x + 2, end.z) < 1e-8);
  assert.ok(Math.hypot(end.dx, end.dz + 1) < 1e-8);
  assert.equal(turn.endTravelS, 0);
});

test('curved-link cubic transitions finish at the real sampled position and tangent', () => {
  const turn = geometry.buildCubicBetween({
    startPoint: { x: 3, z: -8 }, startDirection: { x: 0, z: 1 }, startTravelS: 42,
    endPoint: { x: 14, z: 5 }, endDirection: { x: 1, z: 0 }, endTravelS: 9, radius: 12
  });
  assert.ok(turn);
  const start = geometry.samplePlannedTurn(turn, 0), end = geometry.samplePlannedTurn(turn, turn.length);
  assert.ok(Math.hypot(start.x - 3, start.z + 8) < 1e-8);
  assert.ok(Math.hypot(end.x - 14, end.z - 5) < 1e-8);
  assert.ok(Math.hypot(start.dx, start.dz - 1) < 1e-8);
  assert.ok(Math.hypot(end.dx - 1, end.dz) < 1e-8);
  assert.equal(turn.startTravelS, 42);
  assert.equal(turn.endTravelS, 9);
});

test('turn planning rejects a fillet that cannot fit the finite incoming road', () => {
  const turn = geometry.buildCircularTurn({
    fromPoint: { x: 0, z: 0 }, fromDirection: { x: 0, z: 1 }, fromTotal: 4,
    toPoint: { x: 0, z: 0 }, toDirection: { x: 1, z: 0 }, toTotal: 100,
    radius: 20, minimumRadius: 8
  });
  assert.equal(turn, null);
});

test('AI paths retain rendered way vertices for whole and junction-split road ways', () => {
  let link = geo.roadGraph.links[7839];
  let route = trafficPaths.buildTrafficRouteGeometry([link], geo.roadGraph.nodes);
  assert.equal(link[6].length, 0);
  assert.equal(route.paths[0].length, 4);
  assert.deepEqual(route.paths[0][1], [-380.4, 159.2]);
  assert.deepEqual(route.paths[0][2], [-365.5, 144.9]);
  assert.equal(route.routes[0].wayId, 25077);
  link = geo.roadGraph.links[5053];
  route = trafficPaths.buildTrafficRouteGeometry([link], geo.roadGraph.nodes);
  assert.equal(route.routes[0].wayId, 14991);
  assert.ok(route.paths[0].length > 2, 'the split link keeps the original curved section');
});

test('Hong Kong traffic renders slope pose, wheel steering and per-vehicle car/bus light states', () => {
  const root = path.resolve(__dirname, '..');
  const traffic = fs.readFileSync(path.join(root, 'js/cities/hongkong/traffic.js'), 'utf8');
  const actor = fs.readFileSync(path.join(root, 'js/actor-models.js'), 'utf8');
  assert.match(traffic, /Math\.atan2\(front\.mean - rear\.mean, wheelbase\)/);
  assert.match(traffic, /targetRoll = Math\.atan2\(\(front\.left \+ rear\.left\) - \(front\.right \+ rear\.right\), 4 \* track\)/);
  assert.match(traffic, /pitchQuat\.setFromAxisAngle\(xAxis, -vehicle\.pitch\)/);
  assert.match(traffic, /quat\.multiply\(pitchQuat\)\.multiply\(rollQuat\)/);
  assert.match(traffic, /\.premultiply\(matrix\)/);
  assert.match(traffic, /samplePlannedTurn/);
  assert.match(traffic, /buildCubicBetween/);
  assert.match(traffic, /turn\.radius < \(isBus \? 6 : 3\)/);
  assert.doesNotMatch(traffic, /vehicle\.dir \*= -1/);
  assert.match(traffic, /geometry\.attributes\.carState\.needsUpdate/);
  assert.match(traffic, /busState\.needsUpdate/);
  assert.match(actor, /attribute\('busState', 'vec4'\)/);
  assert.match(actor, /max\(turnFront, turnRear\)\.mul\(blink\)/);
});
