const assert = require('node:assert/strict');
const test = require('node:test');

let site, world, meta, THREE, colliders, simple, cityModule;

test.before(async () => {
  [THREE, site, world, meta, colliders, simple, cityModule] = await Promise.all([
    import('three/webgpu'),
    import('../js/cities/hongkong/far-east-finance-centre-site.js'),
    import('../js/cities/hongkong/far-east-finance-centre-world.js'),
    import('../js/cities/hongkong/full-meta.js'),
    import('../js/cities/hongkong/colliders.js'),
    import('../js/cities/hongkong/simple-world.js'),
    import('../js/cities/hongkong/index.js')
  ]);
});

test('Far East Finance Centre: site & architectural metadata', () => {
  const S = site.FAR_EAST_FINANCE_CENTRE_SITE;
  assert.equal(S.name, '遠東金融中心 Far East Finance Centre');
  assert.equal(S.englishName, 'Far East Finance Centre');
  assert.equal(S.height, 176.0);
  assert.equal(S.storeys, 41);
  assert.equal(S.levels, 49);
  assert.equal(S.podiumHeight, 18.0);
  assert.equal(S.shaftHeight, 144.0);
  assert.equal(S.crownHeight, 14.0);

  // Historical & heritage provenance
  const H = site.FAR_EAST_FINANCE_CENTRE_HERITAGE;
  assert.match(H.architects, /Wong & Ouyang/);
  assert.equal(H.completionYear, 1982);
  assert.match(H.nickname, /Gold Bar Building/);
  assert.match(H.nickname, /金條大廈/);
  assert.match(H.address, /16 Harcourt Road/);
  assert.equal(H.osmWay, 107336261);
  assert.equal(H.wikidata, 'Q11642127');

  // Ring & bounds geometry
  assert.equal(site.FAR_EAST_FINANCE_CENTRE_RING.length, 14);
  assert.ok(site.FAR_EAST_FINANCE_CENTRE_RING_AREA > 850 && site.FAR_EAST_FINANCE_CENTRE_RING_AREA < 920);
  assert.ok(S.w > 35 && S.w < 40);
  assert.ok(S.d > 20 && S.d < 26);
  assert.ok(S.ry < -0.5 && S.ry > -0.8);
});

test('Far East Finance Centre: road clearance & boundary safety', () => {
  const { pointInFlatRing } = require('../js/cities/hongkong/landmark-site.js');
  const ring = site.FAR_EAST_FINANCE_CENTRE_RING;

  // Test that the OSM tower footprint has zero collisions with drivable road surfaces
  for (let x = 425; x <= 475; x += 1.0) {
    for (let z = 180; z <= 230; z += 1.0) {
      if (pointInFlatRing(ring, x, z)) {
        const road = meta.fullRoadSurfaceAt(x, z, 0.2);
        assert.equal(road, null, `Far East Finance Centre road collision at (${x}, ${z})`);
      }
    }
  }
});

test('Far East Finance Centre: 3D model generation & architectural elements', () => {
  const scene = new THREE.Scene();
  const fe = world.buildFarEastFinanceCentre(scene);

  assert.ok(fe.group, 'Must create a Three.js root group');
  assert.match(fe.group.name, /Far East Finance Centre/);
  assert.equal(fe.group.children.length, 9, 'Must generate exactly 9 merged architectural meshes');

  const meshNames = fe.group.children.map((c) => c.name);
  assert.ok(meshNames.some((n) => n.includes('24K gold mirror curtain wall')), 'Must include 24K gold mirror curtain wall');
  assert.ok(meshNames.some((n) => n.includes('lit gold office glazing')), 'Must include lit gold office glazing');
  assert.ok(meshNames.some((n) => n.includes('gold spandrel panels')), 'Must include gold spandrel panels');
  assert.ok(meshNames.some((n) => n.includes('vertical gold mullion fins')), 'Must include vertical gold mullion fins');
  assert.ok(meshNames.some((n) => n.includes('black granite podium')), 'Must include black granite podium');
  assert.ok(meshNames.some((n) => n.includes('storefront glazing')), 'Must include storefront glazing');
  assert.ok(meshNames.some((n) => n.includes('mechanical penthouse crown')), 'Must include mechanical penthouse crown');
  assert.ok(meshNames.some((n) => n.includes('illuminated rooftop signs')), 'Must include illuminated rooftop signs');
  assert.ok(meshNames.some((n) => n.includes('pedestrian skybridges')), 'Must include pedestrian skybridges');

  // Stats validation
  assert.equal(fe.stats.farEastHeight, 176.0);
  assert.equal(fe.stats.farEastStoreys, 41);
  assert.equal(fe.stats.farEastLevels, 49);
  assert.ok(fe.stats.farEastGoldPanes >= 250);
  assert.ok(fe.stats.farEastSpandrels >= 300);
  assert.ok(fe.stats.farEastMullions >= 150);

  // Colliders
  assert.equal(fe.colliders.length, 4);
  for (const c of fe.colliders) {
    assert.ok(c.name);
    assert.ok(c.minX < c.maxX);
    assert.ok(c.minZ < c.maxZ);
    assert.ok(c.minY < c.maxY);
    assert.ok(c.obb);
  }

  // Landmark
  assert.equal(fe.landmarks.length, 1);
  assert.equal(fe.landmarks[0].id, 'far-east-finance-centre');
  assert.match(fe.landmarks[0].name, /遠東金融中心/);
  assert.equal(fe.landmarks[0].height, 176.0);
});
