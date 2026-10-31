const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

let crossings;
let fullMeta;

test.before(async () => {
  crossings = await import('../js/cities/hongkong/crossings.js');
  fullMeta = await import('../js/cities/hongkong/full-meta.js');
});

test('six named sea crossings provide twelve directional OSM routes', () => {
  const { CROSSING_ROUTES, CROSSING_DEFINITIONS, CROSSING_WAY_IDS, CROSSING_FLAT_EXCLUSION_IDS } = crossings;
  assert.equal(CROSSING_DEFINITIONS.length, 6);
  assert.equal(CROSSING_ROUTES.length, 12);
  assert.equal(CROSSING_WAY_IDS.size, 23);
  assert.equal(CROSSING_FLAT_EXCLUSION_IDS.size, 27);
  for (const definition of CROSSING_DEFINITIONS) {
    const routes = CROSSING_ROUTES.filter((route) => route.crossingId === definition.id);
    assert.equal(routes.length, 2, `${definition.name} has both directions`);
    assert.deepEqual(routes.map((route) => route.direction), [0, 1]);
  }
  assert.deepEqual(
    CROSSING_ROUTES.find((route) => route.id === 'ting-kau:0').wayIds,
    [23987, 5996, 23979, 23981, 23980]
  );
  assert.deepEqual(
    CROSSING_ROUTES.find((route) => route.id === 'ting-kau:1').wayIds,
    [23976, 23982, 23978, 23977, 9534, 24022, 24027, 24026]
  );
});

test('every crossing profile is continuous, finely sampled and connected at both ends', () => {
  const { CROSSING_ROUTES, CROSSING_BASE_HEIGHT } = crossings;
  for (const route of CROSSING_ROUTES) {
    assert.ok(route.length > 700, `${route.id} is a complete crossing`);
    assert.ok(route.points.length >= 39, `${route.id} has an actual ramp profile`);
    assert.equal(route.points[0].y, CROSSING_BASE_HEIGHT);
    assert.equal(route.points.at(-1).y, CROSSING_BASE_HEIGHT);
    assert.ok(Math.abs(route.points[Math.floor(route.points.length / 2)].y - route.level) < 0.001);
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1], b = route.points[i];
      const horizontal = Math.hypot(b.x - a.x, b.z - a.z);
      const limit = route.crossingId === 'western-harbour' ? 21 : 20.001;
      assert.ok(horizontal > 0 && horizontal <= limit, `${route.id} segment ${i} is resampled to about 20 m`);
      assert.ok(Math.abs(b.y - a.y) <= 3, `${route.id} segment ${i} has no height discontinuity`);
      assert.ok(b.s > a.s, `${route.id} has monotonic route distance`);
    }
  }
});

test('crossing spatial queries return deck and tunnel elevations along the whole route', () => {
  const { CROSSING_ROUTES, crossingSurfaceAt } = crossings;
  for (const route of CROSSING_ROUTES) {
    for (let i = 0; i < route.points.length; i += 7) {
      const point = route.points[i];
      const hit = crossingSurfaceAt(point.x, point.z);
      assert.ok(hit, `${route.id} point ${i} has a queryable surface`);
      assert.equal(hit.kind, route.kind);
      assert.ok(Math.abs(hit.height - point.y) < 0.75, `${route.id} point ${i} keeps its profile height`);
    }
  }
});

test('Western Harbour Crossing has real smooth S-bends while both portals stay fixed', () => {
  const { CROSSING_ROUTES, CROSSING_DEFINITIONS } = crossings;
  const definition = CROSSING_DEFINITIONS.find((item) => item.id === 'western-harbour');
  assert.equal(definition.curveAmplitude, 42);
  const expectedEnds = {
    'western-harbour:0': [[-297.2, -2130.7], [-1379.1, -874.3]],
    'western-harbour:1': [[-1387.9, -885.7], [-385.5, -2045.6]]
  };
  for (const route of CROSSING_ROUTES.filter((item) => item.crossingId === 'western-harbour')) {
    const [first, last] = expectedEnds[route.id];
    assert.deepEqual([route.points[0].x, route.points[0].z], first);
    assert.deepEqual([route.points.at(-1).x, route.points.at(-1).z], last);
    let totalTurn = 0, previousHeading = null;
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1], b = route.points[i];
      const heading = Math.atan2(b.x - a.x, b.z - a.z);
      if (previousHeading !== null) {
        const turn = Math.atan2(Math.sin(heading - previousHeading), Math.cos(heading - previousHeading));
        totalTurn += Math.abs(turn);
      }
      previousHeading = heading;
    }
    assert.ok(totalTurn > 0.9 && totalTurn < 1.5, `${route.id} has a readable but driveable S-bend`);
    assert.ok(route.length > 1530 && route.length < 1700);
  }
  const western = CROSSING_ROUTES.filter((item) => item.crossingId === 'western-harbour');
  let minimumSeparation = Infinity;
  for (const a of western[0].points) {
    for (const b of western[1].points) minimumSeparation = Math.min(minimumSeparation, Math.hypot(a.x - b.x, a.z - b.z));
  }
  assert.ok(minimumSeparation > 11.5, `paired tubes keep their OSM separation (${minimumSeparation.toFixed(2)} m)`);
});

test('tunnel lighting combines continuous fixtures with a camera-following light pool', () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/cities/hongkong/tunnel-lighting.js'), 'utf8');
  assert.match(source, /const LIGHT_SPACING = 18/);
  assert.match(source, /const LIGHT_POOL_SIZE = 16/);
  assert.match(source, /emissiveNode = color\(0xffe7bd\)/);
  assert.match(source, /HongKongTunnelCeilingLights/);
  assert.match(source, /HongKongTunnelReflectors/);
  assert.match(source, /const position = cameraSystem\?\.camera\?\.position/);
  assert.match(source, /nearest\.splice/);
  const world = fs.readFileSync(path.join(__dirname, '../js/cities/hongkong/crossings-world.js'), 'utf8');
  assert.match(world, /buildHongKongTunnelLighting\(root, CROSSING_ROUTES\)/);
  assert.match(world, /tunnelLighting\.update\(cameraSystem\)/);
});

test('current height selects stacked surfaces without capturing traffic from another level', () => {
  const { selectCrossingGround } = crossings;
  const bridge = { kind: 'bridge', height: 28 };
  const tunnel = { kind: 'tunnel', height: -22 };
  assert.equal(selectCrossingGround(0.025, bridge, 0.025), 0.025);
  assert.equal(selectCrossingGround(0.025, bridge, 28), 28);
  assert.equal(selectCrossingGround(-2.2, bridge, 0.025), 28);
  assert.equal(selectCrossingGround(0.025, tunnel, 0.025), 0.025);
  assert.equal(selectCrossingGround(0.025, tunnel, -22), -22);
  assert.equal(selectCrossingGround(-2.2, tunnel, 0.025), -22);
  assert.equal(selectCrossingGround(0.025, null, 28), 0.025);
});

test('flat road queries exclude only the replaced crossing ways', () => {
  const { CROSSING_ROUTES, CROSSING_WAY_IDS } = crossings;
  for (const route of CROSSING_ROUTES) {
    const point = route.points[Math.floor(route.points.length / 2)];
    const original = fullMeta.nearestFullRoad(point.x, point.z, { radius: 80 });
    assert.ok(original && CROSSING_WAY_IDS.has(original.way.id), `${route.id} midpoint belongs to its OSM way`);
    assert.equal(fullMeta.isFlatTerritoryRoad(point.x, point.z), false, `${route.id} is not duplicated as a flat road`);
    assert.equal(fullMeta.isTerritoryRoad(point.x, point.z), true, `${route.id} remains part of the road network`);
  }
});
