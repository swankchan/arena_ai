const test = require('node:test');
const assert = require('node:assert/strict');

// Regression: these venue callbacks are chained for every non-road ground query in simple-world.
// A venue must never raise an unrelated point to its own construction datum.
test('venue ground callbacks preserve fallback outside their own sites', async () => {
  globalThis.document = { createElement: () => {
    const context = new Proxy({ getImageData: (x,y,w,h) => ({data:new Uint8ClampedArray(w*h*4)}) }, {
      get: (target, key) => target[key] || (() => {}), set: (target, key, value) => { target[key]=value; return true; }
    });
    return { width: 0, height: 0, getContext: () => context };
  }};
  const THREE = await import('three/webgpu');
  const specs = [
    ['queen-elizabeth-stadium', 'buildQueenElizabethStadium', 'QE_STADIUM_SITE', 'queenElizabethStadiumTerrainHeightAt'],
    ['kai-tak-stadium', 'buildKaiTakStadium', 'KAI_TAK_STADIUM_SITE', 'kaiTakStadiumTerrainHeightAt'],
    ['kai-tak-arena', 'buildKaiTakArena', 'KAI_TAK_ARENA_SITE', 'kaiTakArenaTerrainHeightAt'],
    ['kai-tak-youth-sports-ground', 'buildKaiTakYouthSportsGround', 'KAI_TAK_YOUTH_SITE', 'kaiTakYouthTerrainHeightAt'],
    ['happy-valley-racecourse', 'buildHappyValleyRacecourse', 'HAPPY_VALLEY_SITE', 'happyValleyTerrainHeightAt'],
    ['sha-tin-racecourse', 'buildShaTinRacecourse', 'SHA_TIN_SITE', 'shaTinTerrainHeightAt'],
  ];
  for (const [module, build, siteName, heightName] of specs) {
    const m = await import(`../js/cities/hongkong/${module}-world.js`);
    const venue = m[build](new THREE.Group(), {groundOffset: 50});
    assert.equal(venue.groundHeightAt(-100000, -100000, 2), 2, `${module} raised distant ground`);
    assert.equal(venue.groundHeightAt(-100000, -100000, 70), 70, `${module} changed a higher distant ground`);
    const arch = await import(`../js/cities/hongkong/${module}-architecture.js`);
    const { bounds } = arch[siteName];
    let point;
    for (let x = bounds.minX; x <= bounds.maxX && !point; x += 5) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z += 5) {
        if (arch[heightName](x, z, 2, 50) === 50) { point = {x, z}; break; }
      }
    }
    assert.ok(point, `${module} has a usable site point`);
    assert.equal(venue.groundHeightAt(point.x, point.z, 2), 50, `${module} lost its site datum`);
    assert.equal(venue.groundHeightAt(point.x, point.z, 70), 70, `${module} lowered a higher surface`);
  }
});


test('Ocean Park does not undo a lower authored terrain surface elsewhere', async () => {
  const THREE = await import('three/webgpu');
  const { buildOceanPark } = await import('../js/cities/hongkong/ocean-park-world.js');
  const { LAI_YUEN_SITE } = await import('../js/cities/hongkong/lai-yuen-architecture.js');
  const { rawHongKongTerrainHeight } = await import('../js/cities/hongkong/terrain.js');
  const park = buildOceanPark(new THREE.Group());
  const x = LAI_YUEN_SITE.x, z = LAI_YUEN_SITE.z;
  const low = rawHongKongTerrainHeight(x,z)-10;
  assert.equal(park.groundHeightAt(x,z,low), low);
});
