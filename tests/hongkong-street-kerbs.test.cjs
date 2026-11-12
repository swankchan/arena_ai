const { test } = require('node:test');
const assert = require('node:assert/strict');

test('OSM sidewalk tags reduce to kerb sides without inventing untagged footways', async () => {
  const { kerbSidesForTags, KERB_LEFT, KERB_RIGHT } = await import('../tools/cities/hongkong/build-kerb-sides.mjs');
  // A way-wide shorthand names both sides.
  assert.equal(kerbSidesForTags({ highway: 'primary', sidewalk: 'both' }), KERB_LEFT | KERB_RIGHT);
  assert.equal(kerbSidesForTags({ highway: 'tertiary', sidewalk: 'left' }), KERB_LEFT);
  // Side-specific tagging wins over the shorthand, and `no` on one side leaves only the other.
  assert.equal(kerbSidesForTags({ highway: 'secondary', sidewalk: 'both', 'sidewalk:right': 'no' }), KERB_LEFT);
  assert.equal(kerbSidesForTags({ highway: 'secondary', 'sidewalk:left': 'separate', 'sidewalk:right': 'no' }), KERB_LEFT);
  // The older footway spelling still counts.
  assert.equal(kerbSidesForTags({ highway: 'tertiary', 'footway:right': 'yes' }), KERB_RIGHT);
  // An explicit no on both sides is no kerb.
  assert.equal(kerbSidesForTags({ highway: 'trunk', sidewalk: 'no' }), 0);
  // An untagged way says nothing, so it gets nothing. This is the majority of Hong Kong's ways.
  assert.equal(kerbSidesForTags({ highway: 'residential' }), 0);
  assert.equal(kerbSidesForTags({ highway: 'service', lanes: '1' }), 0);
});

test('every kerbed road record is a real road and the table stays honest about coverage', async () => {
  const { HK_ROAD_KERB_SIDES } = await import('../js/hk-road-kerb-sides.js');
  const { HK_FULL_ROADS } = await import('../js/cities/hongkong/building-priority-roads.js');
  const { kerbSidesForRoadRecord, streetKerbStats } = await import('../js/cities/hongkong/street-kerb.js');
  for (const [record, sides] of HK_ROAD_KERB_SIDES.kerbed) {
    assert.ok(record >= 0 && record < HK_FULL_ROADS.roads.length, `kerb record ${record} out of range`);
    assert.ok(sides >= 1 && sides <= 3, `kerb sides ${sides} must be 1..3`);
    assert.equal(kerbSidesForRoadRecord(record), sides);
  }
  const stats = streetKerbStats();
  assert.equal(stats.streetKerbRecords, HK_ROAD_KERB_SIDES.kerbed.length);
  // The overwhelming majority of ways have no sidewalk tag at all; claiming a kerb for them would be an invention.
  assert.ok(stats.streetKerbRecords > 0);
  assert.ok(stats.streetKerbRecords < stats.streetKerbRoadRecords * 0.1,
    `${stats.streetKerbRecords} of ${stats.streetKerbRoadRecords} records have a tagged footway`);
  assert.equal(kerbSidesForRoadRecord(-1), 0);
});

test('a kerb segment produces geometry on the tagged side only', async () => {
  const { addStreetKerb, KERB_LEFT, KERB_RIGHT } = await import('../js/cities/hongkong/street-kerb.js');
  const build = (sides) => {
    const positions = [], indices = [];
    const drawn = addStreetKerb(positions, indices, { ax: 0, az: 0, ay: 5, bx: 20, bz: 0, by: 5, width: 10, sides });
    return { drawn, positions, indices, vertices: positions.length / 3 };
  };
  assert.equal(build(0).drawn, 0);
  const left = build(KERB_LEFT), right = build(KERB_RIGHT), both = build(KERB_LEFT | KERB_RIGHT);
  assert.equal(left.drawn, 1);
  assert.equal(right.drawn, 1);
  assert.equal(both.drawn, 2);
  assert.equal(both.vertices, left.vertices * 2);
  // Both sides sit outside the painted edge, so a kerb never covers the carriageway itself. Vertices along the run vary
  // in x too, so measure the lateral offset from the centreline rather than the raw x.
  const offsets = (positions) => [...new Set(
    Array.from({ length: positions.length / 3 }, (_, v) => Math.abs(positions[v * 3 + 2]))
  )].sort((a, b) => a - b);
  assert.ok(offsets(left.positions).every((z) => z > 5), 'a kerb vertex sits inside the 10 m carriageway');
  // The two sides are mirror images across the centreline.
  assert.deepEqual(offsets(both.positions), offsets(left.positions));
});
