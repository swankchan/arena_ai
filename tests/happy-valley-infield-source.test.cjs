const test = require('node:test'); const assert = require('node:assert/strict'); const fs = require('node:fs');
test('mapped infield boundary is closed and within the racecourse property', async () => {
  const source = JSON.parse(fs.readFileSync('tools/data/hongkong/happy-valley-infield-boundary.json'));
  const { projectHongKongLonLat, flatRingArea } = await import('../js/cities/hongkong/authored-landmark-site.js');
  const { HAPPY_VALLEY_SITE } = await import('../js/cities/hongkong/happy-valley-racecourse-architecture.js');
  const { pointInFlatRing } = await import('../js/cities/hongkong/landmark-site.js');
  assert.match(source.note, /not a measured horse-racing rail/); assert.deepEqual(source.coordinates[0], source.coordinates.at(-1));
  const ring = source.coordinates.flatMap(([lon, lat]) => projectHongKongLonLat(lon, lat));
  let length = 0;
  for (let i = 0; i < ring.length - 2; i += 2) {
    assert.ok(pointInFlatRing(HAPPY_VALLEY_SITE.ring, ring[i], ring[i+1]));
    length += Math.hypot(ring[i+2] - ring[i], ring[i+3] - ring[i+1]);
  }
  assert.ok(length > 1380 && length < 1393); assert.ok(Math.abs(flatRingArea(ring)) > 104000 && Math.abs(flatRingArea(ring)) < 106000);
});
