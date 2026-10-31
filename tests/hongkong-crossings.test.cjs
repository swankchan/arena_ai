const assert = require('node:assert/strict');
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
      assert.ok(horizontal > 0 && horizontal <= 20.001, `${route.id} segment ${i} is resampled to 20 m`);
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
