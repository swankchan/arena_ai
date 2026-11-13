const assert = require('node:assert/strict');
const test = require('node:test');

let roads, elevation, decks, smoothing;

test.before(async () => {
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS;
  elevation = await import('../js/cities/hongkong/road-elevation.js');
  decks = (await import('../js/hk-road-deck-data.js')).HK_ROAD_DECKS;
  smoothing = await import('../js/cities/hongkong/road-profile-smoothing.js');
});

// 第一項：山勢造成的「段裂」——同一 OSM 節點在兩條 way 上必須同高。
test('every shared surface node has one drawn height across the ways that meet there', () => {
  const heights = new Map();
  let shared = 0;
  for (let wayId = 0; wayId < roads.roads.length; wayId++) {
    const road = roads.roads[wayId];
    if (!road || (road[4] & 6)) continue;
    const flat = road[5];
    for (let vertex = 0; vertex < flat.length / 2; vertex++) {
      const key = `${flat[vertex * 2].toFixed(2)},${flat[vertex * 2 + 1].toFixed(2)}`;
      const height = elevation.roadRibbonHeightAtVertex(wayId, vertex);
      const previous = heights.get(key);
      if (previous === undefined) { heights.set(key, height); continue; }
      shared++;
      assert.ok(Math.abs(height - previous) < 1e-6,
        `node ${key} drawn at ${height} and ${previous} by different ways`);
    }
  }
  assert.ok(shared > 20000, `the audit covers real junctions (${shared} shared nodes)`);
});

// 第一項（第二部分）：段內不得再出現每 20 m 一次的鋸齒，最多一個地形駝峰。
test('interior profile stations form one continuous grade with at most a single terrain hump', () => {
  let segments = 0, stations = 0;
  for (const wayId of [42868, 25190, 48646, 12263, 67599, 6954]) {
    const road = roads.roads[wayId];
    if (!road || (road[4] & 6)) continue;
    const flat = road[5];
    for (let segment = 0; segment + 1 < flat.length / 2; segment++) {
      const profile = elevation.roadRibbonProfileAtSegment(wayId, segment);
      segments++;
      stations += profile.ts.length;
      const start = profile.heights[0], end = profile.heights.at(-1);
      let humps = 0, rising = false;
      for (let i = 1; i + 1 < profile.ts.length; i++) {
        const excess = profile.heights[i] - (start + (end - start) * profile.ts[i]);
        if (excess > 1e-6 && !rising) { humps++; rising = true; }
        else if (excess <= 1e-6) rising = false;
        // A station may leave the chord for exactly two reasons: it crosses a genuine crest (higher than both ends),
        // or the whole chord was raised so the carriageway stops passing through the hillside it is cut into. The
        // second case lifts every station by the same amount, so the segment is still one continuous grade.
        if (excess > 1e-6 && profile.heights[i] <= Math.max(start, end) - 1e-6) {
          const floorLift = Math.min(...profile.heights.slice(1, -1).map((height, index) =>
            height - (start + (end - start) * profile.ts[index + 1])));
          assert.ok(Math.abs(excess - floorLift) < 1e-6,
            `${road[0]} ${wayId}/${segment} leaves its chord at station ${i} without a crest or a uniform floor raise`);
        }
      }
      assert.ok(humps <= 1, `${road[0]} ${wayId}/${segment} has ${humps} separate rises above its chord`);
    }
  }
  assert.ok(segments > 100, `audited ${segments} segments / ${stations} stations`);
});

// 第一項（第三部分）：平滑不得改動共享節點，也不得把路面降到地形以下。
test('smoothing respects fixed shared nodes and never lowers a road', () => {
  const nodes = [0, 1, 2, 3, 4].map((x) => ({ x: x * 8, z: 0, height: x === 2 ? 6 : 0 }));
  const fixed = new Set([2]);
  const result = smoothing.smoothConstrainedProfileHeights(nodes, 18, fixed);
  assert.equal(result[2], 6, 'a shared node keeps its welded height');
  for (let i = 0; i < nodes.length; i++) assert.ok(result[i] >= nodes[i].height - 1e-9);
  // Without the fixed set the same node is free to rise, which is the behaviour being suppressed.
  assert.ok(smoothing.smoothConstrainedProfileHeights(nodes)[2] >= 6);
});

// 第二項：OSM tags 提供的路面天橋——有 layer 的高架路段必須真的離開地面。
test('mapped flyovers with an OSM layer get a real deck instead of lying on the road below', () => {
  assert.match(decks.source.heightStatus, /presentation convention, not surveyed/);
  assert.match(decks.source.layerStatus, /not a height in metres/);
  assert.ok(decks.counts.decks > 1000, `${decks.counts.decks} decks`);
  let above = 0;
  for (const deck of decks.decks) {
    const road = roads.roads[deck.wayId];
    assert.ok(road, `deck ${deck.wayId} exists in the road table`);
    assert.ok(road[4] & 2, 'only elevated records receive a deck');
    assert.equal(road[4] & 4, 0, 'tunnels never receive a deck');
    assert.ok(deck.layer >= 1 && deck.layer <= 3, `layer ${deck.layer} is converted`);
    assert.equal(deck.vertexBlend.length, road[5].length / 2);
    assert.equal(deck.vertexBlend[0], 0, 'the deck starts on the surface');
    assert.equal(deck.vertexBlend.at(-1), 0, 'the deck returns to the surface');
    assert.ok(deck.lift <= decks.source.maxDeckLiftMetres + 1e-9);
    let maxClearance = 0;
    for (let vertex = 0; vertex < road[5].length / 2; vertex++) {
      const drawn = elevation.roadRibbonHeightAtVertex(deck.wayId, vertex);
      const ground = elevation.surfaceRoadHeight(road[5][vertex * 2], road[5][vertex * 2 + 1]);
      assert.ok(drawn + 1e-6 >= ground, 'a deck is never below the ground it stands on');
      maxClearance = Math.max(maxClearance, drawn - ground);
    }
    if (maxClearance > 3) above++;
  }
  assert.ok(above > 200, `${above} decks clear the ground by more than 3 m`);
  assert.ok(decks.counts.skipped.unresolvedTags > 0, 'unresolved OSM tags stay flat rather than guessed');
  assert.ok(decks.counts.skipped.layerOutOfRange > 0, 'survey-relative layer numbers are reported, not converted');
});

test('the lift a deck adds stays within the stated ramp grade', () => {
  let checked = 0, worstRampGrade = 0;
  for (const deck of decks.decks) {
    const flat = roads.roads[deck.wayId][5];
    for (let vertex = 1; vertex < deck.vertexBlend.length; vertex++) {
      const length = Math.hypot(flat[vertex * 2] - flat[vertex * 2 - 2], flat[vertex * 2 + 1] - flat[vertex * 2 - 1]);
      if (length < 1) continue;
      // The generator's promise: the presentation lift (layer clearance times blend), not the terrain profile the road
      // already follows, never climbs faster than the stated ramp grade between adjacent vertices.
      const rise = deck.lift * (deck.vertexBlend[vertex] - deck.vertexBlend[vertex - 1]);
      worstRampGrade = Math.max(worstRampGrade, Math.abs(rise) / length);
      checked++;
    }
  }
  assert.ok(checked > 1000);
  assert.ok(worstRampGrade <= decks.source.maxRampGrade + 0.0005,
    `worst deck ramp grade ${(worstRampGrade * 100).toFixed(1)}% exceeds ${decks.source.maxRampGrade * 100}%`);
});
