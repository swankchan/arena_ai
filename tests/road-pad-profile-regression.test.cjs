const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');

test('road pad intersection broad phase preserves pre-optimization local profiles', async () => {
  const {HK_FULL_ROADS} = await import('../js/cities/hongkong/building-priority-roads.js');
  const {roadRibbonProfileAtSegment} = await import('../js/cities/hongkong/road-elevation.js');
  const hash = createHash('sha256'); let count = 0;
  for (let id = 0; id < HK_FULL_ROADS.roads.length; id++) {
    const flat = HK_FULL_ROADS.roads[id][5];
    for (let j = 0; j < flat.length / 2 - 1; j++) {
      const x = flat[j * 2], z = flat[j * 2 + 1];
      if (x < -900 || x > 1500 || z < -1500 || z > 1500) continue;
      hash.update(JSON.stringify(roadRibbonProfileAtSegment(id, j))); count++;
    }
  }
  // Recaptured after the hillside-profile fix: shared OSM nodes are welded to one height and interior stations keep
  // only a genuine terrain hump. The count is unchanged, so every audited segment is still the same source geometry.
  assert.equal(count, 6154);
  assert.equal(hash.digest('hex'), '18088042adea82403161471800b40d339055e0b2601cb3f82b01aacb9270a550');
});
