const assert = require('node:assert/strict');
const test = require('node:test');

let site, world, meta, THREE, colliders, simple, cityModule;

test.before(async () => {
  [THREE, site, world, meta, colliders, simple, cityModule] = await Promise.all([
    import('three/webgpu'),
    import('../js/cities/hongkong/icbc-tower-site.js'),
    import('../js/cities/hongkong/icbc-tower-world.js'),
    import('../js/cities/hongkong/full-meta.js'),
    import('../js/cities/hongkong/colliders.js'),
    import('../js/cities/hongkong/simple-world.js'),
    import('../js/cities/hongkong/index.js')
  ]);
});

test('ICBC Tower: site & architectural metadata', () => {
  const S = site.ICBC_TOWER_SITE;
  assert.equal(S.name, '中國工商銀行大廈 ICBC Tower');
  assert.equal(S.englishName, 'ICBC Tower');
  assert.equal(S.height, 167.0);
  assert.equal(S.storeys, 37);
  assert.equal(S.levels, 40);
  assert.equal(S.podiumHeight, 18.0);
  assert.equal(S.shaftHeight, 133.0);
  assert.equal(S.crownHeight, 16.0);

  // Historical & architectural provenance
  const H = site.ICBC_TOWER_HERITAGE;
  assert.match(H.architects, /Rocco Design Architects/);
  assert.match(H.architects, /嚴迅奇/);
  assert.equal(H.completionYear, 1992);
  assert.match(H.complex, /Three Garden Road/);
  assert.match(H.award, /HKIA Silver Medal/);
  assert.match(H.address, /3 Garden Road/);
  assert.equal(H.osmWay, 107497693);

  // Ring & bounds geometry
  assert.equal(site.ICBC_TOWER_RING.length, 22);
  assert.ok(site.ICBC_TOWER_RING_AREA > 1700 && site.ICBC_TOWER_RING_AREA < 1850);
  assert.ok(S.w > 65 && S.w < 75);
  assert.ok(S.d > 30 && S.d < 40);
});

test('ICBC Tower: road clearance & boundary safety', () => {
  const { pointInFlatRing } = require('../js/cities/hongkong/landmark-site.js');
  const ring = site.ICBC_TOWER_RING;

  // Test that the OSM tower footprint has zero collisions with surface drivable road surfaces
  for (let x = 115; x <= 168; x += 1.0) {
    for (let z = 350; z <= 425; z += 1.0) {
      if (pointInFlatRing(ring, x, z)) {
        const road = meta.fullRoadSurfaceAt(x, z, 0.2);
        if (road && !(road.way.flags & 4)) {
          assert.equal(road, null, `ICBC Tower surface road collision at (${x}, ${z})`);
        }
      }
    }
  }
});

test('ICBC Tower: 3D model generation & architectural elements', () => {
  const scene = new THREE.Scene();
  const icbc = world.buildIcbcTower(scene);

  assert.ok(icbc.group, 'Must create a Three.js root group');
  assert.match(icbc.group.name, /ICBC Tower/);
  assert.equal(icbc.group.children.length, 8, 'Must generate exactly 8 merged architectural meshes');

  const meshNames = icbc.group.children.map((c) => c.name);
  assert.ok(meshNames.some((n) => n.includes('silver-blue reflective curtain wall')), 'Must include silver-blue reflective curtain wall');
  assert.ok(meshNames.some((n) => n.includes('lit office glazing')), 'Must include lit office glazing');
  assert.ok(meshNames.some((n) => n.includes('dark spandrel bands')), 'Must include dark spandrel bands');
  assert.ok(meshNames.some((n) => n.includes('silver mullion fins')), 'Must include silver mullion fins');
  assert.ok(meshNames.some((n) => n.includes('granite podium and escalators')), 'Must include granite podium and escalators');
  assert.ok(meshNames.some((n) => n.includes('storefront and atrium glazing')), 'Must include storefront and atrium glazing');
  assert.ok(meshNames.some((n) => n.includes('mechanical penthouse crown')), 'Must include mechanical penthouse crown');
  assert.ok(meshNames.some((n) => n.includes('corporate signage and beacons')), 'Must include corporate signage and beacons');

  // Stats validation
  assert.equal(icbc.stats.icbcHeight, 167.0);
  assert.equal(icbc.stats.icbcStoreys, 37);
  assert.equal(icbc.stats.icbcLevels, 40);
  assert.ok(icbc.stats.icbcCurtainPanes >= 100);
  assert.ok(icbc.stats.icbcSpandrels >= 150);
  assert.ok(icbc.stats.icbcMullions >= 70);

  // Colliders
  assert.equal(icbc.colliders.length, 2);
  for (const c of icbc.colliders) {
    assert.ok(c.name);
    assert.ok(c.minX < c.maxX);
    assert.ok(c.minZ < c.maxZ);
    assert.ok(c.minY < c.maxY);
    assert.ok(c.obb);
  }

  // Landmark
  assert.equal(icbc.landmarks.length, 1);
  assert.equal(icbc.landmarks[0].id, 'icbc-tower');
  assert.match(icbc.landmarks[0].name, /中國工商銀行大廈/);
  assert.equal(icbc.landmarks[0].height, 167.0);
});
