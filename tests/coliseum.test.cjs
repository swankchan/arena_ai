const assert = require('node:assert/strict');
const test = require('node:test');

test('Hong Kong Coliseum has a tapered panelled arena and a dark, ribbed roof', async () => {
  const THREE = await import('three/webgpu');
  const { COLISEUM_SITE, buildHongKongColiseum } = await import('../js/cities/hongkong/coliseum-world.js');
  const { fullRoadSurfaceAt } = await import('../js/cities/hongkong/full-meta.js');
  const scene = new THREE.Group(), result = buildHongKongColiseum(scene);
  assert.equal(result.stats.coliseumOsmWay, 102256410);
  assert.equal(result.stats.coliseumPhotoDirected, true);
  const facade = result.root.getObjectByName('Coliseum sloping precast facade panels');
  assert.ok(facade && facade.material.colorNode && facade.geometry.getAttribute('color'));
  const pos = facade.geometry.getAttribute('position');
  let low = 0, high = 0;
  for (let i=0;i<pos.count;i++) {
    const r = Math.max(Math.abs(pos.getX(i)), Math.abs(pos.getZ(i)));
    if (pos.getY(i) < 11) low = Math.max(low, r);
    if (pos.getY(i) > 27) high = Math.max(high, r);
  }
  assert.ok(high > low + 15, 'upper shell must flare outward');
  assert.ok(result.root.getObjectByName('Coliseum dark sloping roof perimeter'));
  assert.ok(result.root.getObjectByName('Coliseum roof panel seams'));
  assert.equal(result.landmarks.length, 1);
  // Street-level pillars must not occupy the road surface.
  for (const collider of result.colliders.slice(2)) assert.equal(!!fullRoadSurfaceAt(collider.x, collider.z), false);
  assert.ok(Math.abs(COLISEUM_SITE.x - 2304) < 2 && Math.abs(COLISEUM_SITE.z + 2146) < 2);
});

test('the unified world includes the Coliseum and its collision and landmark records', () => {
  const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '../js/cities/hongkong/simple-world.js'), 'utf8');
  for (const part of ['buildHongKongColiseum(scene)', '...coliseum.colliders', '...coliseum.landmarks', '...coliseum.stats']) assert.ok(source.includes(part), part);
});
