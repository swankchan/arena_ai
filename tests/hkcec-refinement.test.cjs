const assert = require('node:assert/strict');
const test = require('node:test');
let THREE, world, h;

test.before(async () => {
  h = await import('../js/cities/hongkong/hkcec-architecture.js');
  globalThis.document = { createElement: () => {
    const canvas = { width: 0, height: 0 };
    const context = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, {
      get: (target, key) => target[key] || (() => {}), set: (target, key, value) => { target[key] = value; return true; },
    });
    canvas.getContext = () => context; return canvas;
  } };
  THREE = await import('three/webgpu');
  const { buildHkcec } = await import('../js/cities/hongkong/hkcec-world.js');
  world = buildHkcec(new THREE.Group(), { groundOffset: 5 });
});

test('HK-B0088 New Wing refinement keeps the curved glass wall and bird-roof structure finite', () => {
  assert.equal(world.stats.hkcecNewWingRefined, true);
  assert.equal(world.stats.hkcecNewWingInventoryId, 'HK-B0088');
  assert.equal(world.stats.hkcecNewWingRoofShells, 3);
  assert.ok(world.stats.hkcecNewWingFineFacadeFins >= 400);
  assert.equal(world.stats.hkcecNewWingRoofRibs, 180);
  const names = [];
  world.group.traverse((object) => { if (object.name) names.push(object.name); });
  assert.ok(names.some((name) => /NewWingHK-B0088DenseCurvedGlassWallFins/.test(name)));
  assert.ok(names.some((name) => /NewWingHK-B0088TransverseWhiteBirdRoofRibs/.test(name)));
  let nonFinite = 0;
  world.group.traverse((object) => {
    if (!object.isMesh) return;
    const position = object.geometry?.getAttribute('position');
    if (position) for (const value of position.array) if (!Number.isFinite(value)) nonFinite++;
  });
  assert.equal(nonFinite, 0);
  assert.equal(h.HKCEC_NEW_WING_SITE.osmId, 26490011);
});
