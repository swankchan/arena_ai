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
  // Recaptured after 聖約翰座堂 gained its precinct terrace. The new terrain pad raises the ground inside the cathedral's
  // OSM ring only, so exactly TWO audited segments move — both stations of one unnamed 5.5 m way that clips the terrace
  // edge — and both move UP by 0.49 m, which can only reduce burial. That was verified by dumping every profile with the
  // pad in place and with it removed and diffing them; the count is unchanged at 6154.
  //
  // Earlier recapture, kept for the audit trail: the crest rule stopped cutting the drawn chord through the hillside,
  // because 柏寧路 was 0.28 m under its own shoulders. Only interior stations moved then too.
  assert.equal(count, 6154);
  assert.equal(hash.digest('hex'), '3c271123465b113133defc82db92f0cc923ab161dcec6f591743987b444ef4ef');
});
