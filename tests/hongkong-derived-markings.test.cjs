const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

let markings;
let roads;

test.before(async () => {
  markings = await import('../js/cities/hongkong/derived-road-markings.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS;
});

const road = (width, flat) => ['', width, 0, 2, 0, flat];
const oneWayRoad = (width, flat) => ['', width, 1, 2, 0, flat];

test('junction clearance uses incident degree, including a T-junction made from only two ways', () => {
  const synthetic = [
    road(8, [0, 0, 20, 0, 40, 0]),
    road(5, [20, 0, 20, 20]),
    road(8, [40, 0, 60, 0])
  ];
  const policy = markings.buildDerivedRoadPaintPolicy(synthetic, null);
  assert.equal(policy.stats.junctionNodes, 1, 'only the T node is a junction; the ordinary continuation is not');
  assert.deepEqual(policy.ways.get(0).gaps, [[13, 27]]);
  assert.deepEqual(policy.ways.get(1).gaps, [[0, 7]]);
  assert.equal(policy.ways.has(2), false);

  const throughStart = [0, 1];
  markings.addDerivedPaintPolicyStations(throughStart, policy, 0, 0, 20);
  throughStart.sort((a, b) => a - b);
  assert.deepEqual(throughStart, [0, 0.65, 1]);
  assert.equal(markings.derivedPaintAllowed(policy, 0, 0, 6), true);
  assert.equal(markings.derivedPaintAllowed(policy, 0, 0, 17), false);
  assert.equal(markings.derivedPaintAllowed(policy, 1, 0, 3), false);
  assert.equal(markings.derivedPaintAllowed(policy, 1, 0, 12), true);
  assert.equal(markings.derivedPaintAllowed(policy, 2, 0, 10), true);
});

test('the reported Pedder Street junction has exact seven-metre paint stops on every approach', () => {
  const policy = markings.DERIVED_ROAD_PAINT_POLICY;
  assert.equal(markings.DERIVED_JUNCTION_CLEARANCE, 7);
  const wayId = 5068, length = 60.22242107388244;
  assert.ok(policy.ways.has(wayId));
  const stations = [0, 1];
  markings.addDerivedPaintPolicyStations(stations, policy, wayId, 0, length);
  stations.sort((a, b) => a - b);
  assert.ok(Math.abs(stations[1] - (length - 7) / length) < 1e-10);
  assert.equal(markings.derivedPaintAllowed(policy, wayId, 0, 20), true);
  assert.equal(markings.derivedPaintAllowed(policy, wayId, 0, length - 3), false);
  for (const connected of [2674, 46013, 46016]) {
    assert.ok(policy.ways.has(connected), `${roads.roads[connected][0]} shares the junction policy`);
  }
});

test('surveyed paint protection follows real nearby geometry instead of suppressing the whole Central bbox', () => {
  const policy = markings.DERIVED_ROAD_PAINT_POLICY;
  assert.ok(policy.stats.surveyedSegments > 100);
  assert.ok(policy.stats.surveyedSegments < 300, 'the guard remains local to the 121 official road-mark features');
  assert.ok(policy.surveyed.has(10 * 100000), 'Connaught Road beside official marks is protected');
  assert.equal(policy.surveyed.has(5068 * 100000), false, 'the reported derived-only approach is not falsely guarded');
  assert.equal(markings.DERIVED_ROAD_MARKINGS.guard, undefined);
});

test('collinear but disjoint surveyed lines do not suppress a distant road segment', () => {
  const synthetic = [road(4, [0, 0, 10, 0])];
  const aidsAt = (x) => ({
    marks: [{ type: 'RM1006', parts: [[x, 0, x + 10, 0]] }],
    crossings: [], yellowBoxes: [], yellowBoxPolygons: []
  });
  assert.equal(markings.buildDerivedRoadPaintPolicy(synthetic, aidsAt(15)).surveyed.size, 0,
    'five metres away exceeds the four-metre road half-width plus clearance');
  assert.equal(markings.buildDerivedRoadPaintPolicy(synthetic, aidsAt(12)).surveyed.size, 1,
    'the same collinear geometry is guarded when it is genuinely nearby');
});

test('opposite one-way carriageways suppress only the duplicated inner edge', () => {
  const touching = [
    oneWayRoad(8, [0, 0, 40, 0]),
    oneWayRoad(8, [40, 8, 0, 8])
  ];
  const policy = markings.buildDerivedRoadPaintPolicy(touching, null);
  assert.equal(markings.derivedPaintEdgeMask(policy, 0, 20), 3, 'the equal-width lower id owns the boundary');
  assert.equal(markings.derivedPaintEdgeMask(policy, 1, 20), 2, 'only the negative inner edge is removed');
  assert.equal(markings.signedRoadLaneCount(touching[0]), 2, 'lane dashes retain their recorded count');
  assert.equal(markings.signedRoadLaneCount(touching[1]), 2);

  const sameDirection = [touching[0], oneWayRoad(8, [0, 8, 40, 8])];
  assert.equal(markings.buildDerivedRoadPaintPolicy(sameDirection, null).sharedEdges.size, 0,
    'same-direction lanes are not relabelled as an opposing carriageway boundary');
  const separated = [touching[0], oneWayRoad(8, [40, 20, 0, 20])];
  assert.equal(markings.buildDerivedRoadPaintPolicy(separated, null).sharedEdges.size, 0,
    'roads with a real wide separator keep both edge lines');
  const stacked = markings.buildDerivedRoadPaintPolicy(touching, null, (wayId) => wayId === 0 ? 0 : 20);
  assert.equal(stacked.sharedEdges.size, 0, 'parallel decks at different heights keep independent edge paint');
});

test('the Gloucester Tower approach keeps one boundary for ways 46013 and 14999', () => {
  const policy = markings.DERIVED_ROAD_PAINT_POLICY;
  assert.equal(roads.roads[46013][3], 3);
  assert.equal(roads.roads[14999][3], 2);
  assert.equal(markings.derivedPaintEdgeMask(policy, 46013, 23), 3,
    'the three-lane carriageway owns the single shared boundary');
  assert.equal(markings.derivedPaintEdgeMask(policy, 14999, 23), 2,
    'the opposite two-lane carriageway drops its duplicate negative inner edge');
  assert.equal(markings.derivedPaintEdgeMask(policy, 5068, 23), 3,
    'the perpendicular Pedder Street approach is not treated as a parallel carriageway');
});

test('auxiliary paint stays in the asphalt shader and uses continuous extended chainage', () => {
  const root = path.resolve(__dirname, '..');
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/full-world.js'), 'utf8');
  const materials = fs.readFileSync(path.join(root, 'js/tsl-materials.js'), 'utf8');
  assert.match(world, /s0 = chainage - startExtension, s1 = chainage \+ length \+ endExtension/);
  assert.match(world, /extendStart: t0 <= 1e-7, extendEnd: t1 >= 1 - 1e-7/);
  assert.match(world, /fullRoadDerivedPaintExtraTriangles: 0/);
  assert.match(world, /setAttribute\('roadPaintEdges'/);
  assert.match(materials, /edgeSides\.x/);
  assert.match(materials, /Box-filter the dash module over this pixel/);
  assert.doesNotMatch(materials, /derivedMarkings\.guard/);
});
