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
  // Captured from the original edge-by-edge calculation on the bundled dataset.
  assert.equal(count, 6154);
  assert.equal(hash.digest('hex'), '76839531cd73181a8777a4fc7d59a8baa2cc27745bdb3972acb37130ee453ffe');
});
