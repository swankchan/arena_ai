const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
test('terrain ring bounds preserve previous height values across territory road vertices', async () => {
  const {hongKongTerrainHeight} = await import('../js/cities/hongkong/terrain.js');
  const {HK_FULL_ROADS} = await import('../js/cities/hongkong/building-priority-roads.js');
  const hash = createHash('sha256'); let count = 0;
  for (let id = 0; id < HK_FULL_ROADS.roads.length; id += 2) {
    const flat = HK_FULL_ROADS.roads[id][5];
    for (let j = 0; j < flat.length; j += 2) {
      hash.update(`${hongKongTerrainHeight(flat[j], flat[j + 1])},`); count++;
    }
  }
  // Recorded with the unfiltered polygon tests on this bundled road snapshot.
  assert.equal(count, 165420);
  assert.equal(hash.digest('hex'), 'ca005ad149588b768829cba6699a0fd5bca98c24d61e45576d8249d45ab75846');
});
