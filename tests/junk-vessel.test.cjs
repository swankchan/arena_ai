const { test } = require('node:test');
const assert = require('node:assert/strict');
let junk, THREE, full, routes;
test.before(async () => {
  junk = await import('../js/cities/hongkong/junk-vessel.js');
  THREE = await import('three/webgpu');
  full = await import('../js/cities/hongkong/full-meta.js');
  routes = await import('../js/cities/hongkong/star-ferry-routes.js');
});

test('the new 28 m junk has three battened sails, timber hull, decks, rigging and node-controlled night lighting', () => {
  const boat = junk.createJunkVessel();
  assert.equal(junk.JUNK_DIMENSIONS.length, 28);
  for (const n of ['Junk curved wooden hull','Junk main timber deck','Aft covered saloon','Upper lounge deck','Aft upper deck canopy','Warm cabin windows','Warm deck light','Orange lifebuoy']) assert.ok(boat.getObjectByName(n), n);
  for (let i = 1; i <= 3; i++) {
    const sail = boat.getObjectByName(`Junk sail ${i} — curved crimson fabric`);
    assert.ok(sail && sail.material.isNodeMaterial && sail.material.emissiveNode);
    assert.equal(sail.material.side, THREE.DoubleSide);
    for (let b = 0; b <= 6; b++) assert.ok(boat.getObjectByName(`Junk sail ${i} batten ${b}`));
    assert.ok(boat.getObjectByName(`Junk mast ${i}`));
  }
  for (const name of ['Warm cabin windows', 'Warm deck light']) assert.ok(boat.getObjectByName(name).material.emissiveNode);
  boat.traverse(o => { if (!o.isMesh) return; const p = o.geometry.getAttribute('position'); if (p) for (const v of p.array) assert.ok(Number.isFinite(v), o.name); });
  const bounds = new THREE.Box3().setFromObject(boat); assert.ok(bounds.max.z - bounds.min.z >= 28);
});

test('sampled full vessel envelope stays over water, clear of mapped roads and ferry routes', () => {
  let mins = routes.STAR_FERRY_ROUTES.map(() => Infinity);
  for (let i = 0; i < 720; i++) {
    const p = junk.sampleJunkRoute(i * Math.PI / 360), c = Math.cos(p.heading), s = Math.sin(p.heading);
    for (const [lx, lz] of [[0,0],[-3.4,-14],[3.4,-14],[-3.4,14],[3.4,14]]) {
      const x = p.x + c*lx + s*lz, z = p.z - s*lx + c*lz;
      assert.equal(full.isTerritoryLand(x,z), false, `land at ${x},${z}`);
      assert.equal(full.isTerritoryRoad(x,z,.35), false, `road at ${x},${z}`);
    }
    routes.STAR_FERRY_ROUTES.forEach((route, r) => {
      for (let j=0;j<=100;j++) { const q=routes.sampleStarFerryRoute(route,route.length*j/100); mins[r]=Math.min(mins[r],Math.hypot(p.x-q.x,p.z-q.z)); }
    });
  }
  assert.ok(mins.every(d => d > 60), `${mins}`);
});
