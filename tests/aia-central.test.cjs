const assert = require('node:assert/strict');
const test = require('node:test');

let site, world, meta, THREE, colliders, simple, cityModule;

test.before(async () => {
  [THREE, site, world, meta, colliders, simple, cityModule] = await Promise.all([
    import('three/webgpu'),
    import('../js/cities/hongkong/aia-central-site.js'),
    import('../js/cities/hongkong/aia-central-world.js'),
    import('../js/cities/hongkong/full-meta.js'),
    import('../js/cities/hongkong/colliders.js'),
    import('../js/cities/hongkong/simple-world.js'),
    import('../js/cities/hongkong/index.js')
  ]);
});

test('AIA Central: site & architectural metadata', () => {
  const S = site.AIA_CENTRAL_SITE;
  assert.equal(S.name, '友邦金融中心 AIA Central');
  assert.equal(S.englishName, 'AIA Central');
  assert.equal(S.height, 185.0);
  assert.equal(S.storeys, 35);
  assert.equal(S.levels, 40);
  assert.equal(S.lobbyHeight, 14.0);
  assert.equal(S.crownHeight, 25.0);

  // Historical & architectural provenance
  const H = site.AIA_CENTRAL_HERITAGE;
  assert.match(H.architects, /Skidmore, Owings & Merrill/);
  assert.match(H.architects, /Aedas/);
  assert.equal(H.completionYear, 2005);
  assert.equal(H.originalName, 'AIG Tower (友邦保險大廈)');
  assert.match(H.concept, /Chinese Junk Sail/);
  assert.match(H.concept, /風帆/);
  assert.match(H.address, /1 Connaught Road Central/);
  assert.equal(H.osmWay, 107324767);
  assert.equal(H.wikidata, 'Q841968');

  // Ring & bounds geometry
  assert.equal(site.AIA_CENTRAL_RING.length, 22);
  assert.ok(site.AIA_CENTRAL_RING_AREA > 1600 && site.AIA_CENTRAL_RING_AREA < 1750);
  assert.ok(S.w > 39 && S.w < 44);
  assert.ok(S.d > 39 && S.d < 44);
  assert.ok(S.ry < -0.15 && S.ry > -0.4);
});

test('AIA Central: 3D model generation & architectural elements', () => {
  const scene = new THREE.Scene();
  const aia = world.buildAiaCentral(scene);

  assert.ok(aia.group, 'Must create a Three.js root group');
  assert.match(aia.group.name, /AIA Central/);
  assert.equal(aia.group.children.length, 8, 'Must generate exactly 8 merged architectural meshes');

  const meshNames = aia.group.children.map((c) => c.name);
  assert.ok(meshNames.some((n) => n.includes('silver-blue reflective curtain wall')), 'Must include silver-blue reflective curtain wall');
  assert.ok(meshNames.some((n) => n.includes('lit office glazing')), 'Must include lit office glazing');
  assert.ok(meshNames.some((n) => n.includes('stainless steel fins and sunshades')), 'Must include stainless steel fins and sunshades');
  assert.ok(meshNames.some((n) => n.includes('dark spandrel bands')), 'Must include dark spandrel bands');
  assert.ok(meshNames.some((n) => n.includes('14m high transparent lobby glazing')), 'Must include 14m high transparent lobby glazing');
  assert.ok(meshNames.some((n) => n.includes('granite plaza and driveway')), 'Must include granite plaza and driveway');
  assert.ok(meshNames.some((n) => n.includes('glowing crown sail prow fins')), 'Must include glowing crown sail prow fins');
  assert.ok(meshNames.some((n) => n.includes('corporate signage and beacons')), 'Must include corporate signage and beacons');

  // Stats validation
  assert.equal(aia.stats.aiaHeight, 185.0);
  assert.equal(aia.stats.aiaStoreys, 35);
  assert.equal(aia.stats.aiaLevels, 40);
  assert.ok(aia.stats.aiaCurtainPanes >= 100);
  assert.ok(aia.stats.aiaStainlessElements >= 150);
  assert.ok(aia.stats.aiaProwElements >= 20);

  // Colliders
  assert.equal(aia.colliders.length, 3);
  for (const c of aia.colliders) {
    assert.ok(c.name);
    assert.ok(c.minX < c.maxX);
    assert.ok(c.minZ < c.maxZ);
    assert.ok(c.minY < c.maxY);
    assert.ok(c.obb);
  }

  // Landmark
  assert.equal(aia.landmarks.length, 1);
  assert.equal(aia.landmarks[0].id, 'aia-central');
  assert.match(aia.landmarks[0].name, /友邦金融中心/);
  assert.equal(aia.landmarks[0].height, 185.0);
});
