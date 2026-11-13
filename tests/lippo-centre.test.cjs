const assert = require('node:assert/strict');
const test = require('node:test');

let site, world, meta, THREE, colliders, simple, cityModule;

test.before(async () => {
  [THREE, site, world, meta, colliders, simple, cityModule] = await Promise.all([
    import('three/webgpu'),
    import('../js/cities/hongkong/lippo-centre-site.js'),
    import('../js/cities/hongkong/lippo-centre-world.js'),
    import('../js/cities/hongkong/full-meta.js'),
    import('../js/cities/hongkong/colliders.js'),
    import('../js/cities/hongkong/simple-world.js'),
    import('../js/cities/hongkong/index.js')
  ]);
});

test('Lippo Centre: site & architectural metadata', () => {
  assert.equal(site.LIPPO_CENTRE_SITE.key, 'lippo-centre');
  assert.equal(site.LIPPO_TOWER_ONE_SITE.key, 'lippo-centre-tower-one');
  assert.equal(site.LIPPO_TOWER_TWO_SITE.key, 'lippo-centre-tower-two');

  // Tower 1 specifications
  assert.equal(site.LIPPO_TOWER_ONE_DATA.height, 172.0);
  assert.equal(site.LIPPO_TOWER_ONE_DATA.crownTop, 178.5);
  assert.equal(site.LIPPO_TOWER_ONE_DATA.levels, 45);
  assert.equal(site.LIPPO_TOWER_ONE_SITE.levels, 45);

  // Tower 2 specifications
  assert.equal(site.LIPPO_TOWER_TWO_DATA.height, 186.0);
  assert.equal(site.LIPPO_TOWER_TWO_DATA.crownTop, 192.5);
  assert.equal(site.LIPPO_TOWER_TWO_DATA.levels, 48);
  assert.equal(site.LIPPO_TOWER_TWO_SITE.levels, 48);

  // Paul Rudolph architectural & historical provenance
  const H = site.LIPPO_CENTRE_HERITAGE;
  assert.match(H.architects, /Paul Rudolph/);
  assert.match(H.architects, /Wong & Ouyang/);
  assert.equal(H.completionYear, 1988);
  assert.equal(H.originalName, 'Bond Centre (奔達中心)');
  assert.equal(H.currentName, 'Lippo Centre (力寶中心)');
  assert.match(H.nickname, /Koala Tree/);
  assert.match(H.nickname, /樹熊大廈/);
  assert.match(H.style, /Late Modernist/);
  assert.match(H.address, /89 Queensway/);
  assert.equal(H.wikidata, 'Q1544778');
  assert.equal(H.wikidataTower1, 'Q27847068');
  assert.equal(H.wikidataTower2, 'Q27847063');
  assert.equal(H.osmWayTower1, 107336260);
  assert.equal(H.osmWayTower2, 107336263);

  // Podium
  assert.equal(site.LIPPO_PODIUM_DATA.baseY, 6.5);
  assert.equal(site.LIPPO_PODIUM_DATA.foundationY, 4.0);
  assert.equal(site.LIPPO_PODIUM_DATA.height, 18.0);
  assert.equal(site.LIPPO_PODIUM_DATA.topY, 24.5);
});

test('Lippo Centre: site geometry, coordinates & ground heights', () => {
  const t1 = site.LIPPO_TOWER_ONE_DATA;
  const t2 = site.LIPPO_TOWER_TWO_DATA;

  // Tower centers are inside site
  assert.ok(site.isLippoCentrePoint(t1.center.x, t1.center.z));
  assert.ok(site.isLippoCentrePoint(t2.center.x, t2.center.z));

  // Points outside site return false
  assert.ok(!site.isLippoCentrePoint(300.0, 200.0));
  assert.ok(!site.isLippoCentrePoint(500.0, 350.0));

  // Ground height inside site returns baseY (6.5m)
  const ghInside = site.lippoCentreGroundHeightAt(t1.center.x, t1.center.z, 5.0);
  assert.equal(ghInside, site.LIPPO_PODIUM_DATA.baseY);

  // Ground height outside site returns natural ground
  const ghOutside = site.lippoCentreGroundHeightAt(300.0, 200.0, 4.2);
  assert.equal(ghOutside, 4.2);
});

test('Lippo Centre: road clearance & boundary safety', () => {
  const { pointInFlatRing } = require('../js/cities/hongkong/landmark-site.js');
  const ring1 = site.LIPPO_TOWER_ONE_RING;
  const ring2 = site.LIPPO_TOWER_TWO_RING;

  // Test that both OSM tower footprints have zero collisions with drivable road surfaces
  for (let x = 395; x <= 445; x += 1.0) {
    for (let z = 275; z <= 322; z += 1.0) {
      if (pointInFlatRing(ring1, x, z)) {
        const road = meta.fullRoadSurfaceAt(x, z, 0.2);
        assert.equal(road, null, `Tower 1 road collision at (${x}, ${z})`);
      }
    }
  }

  for (let x = 358; x <= 407; x += 1.0) {
    for (let z = 244; z <= 290; z += 1.0) {
      if (pointInFlatRing(ring2, x, z)) {
        const road = meta.fullRoadSurfaceAt(x, z, 0.2);
        assert.equal(road, null, `Tower 2 road collision at (${x}, ${z})`);
      }
    }
  }
});

test('Lippo Centre: 3D model generation & architectural elements', () => {
  const scene = new THREE.Scene();
  const lc = world.buildLippoCentre(scene);

  assert.ok(lc.group, 'Must create a Three.js root group');
  assert.match(lc.group.name, /Lippo Centre/);
  assert.equal(lc.group.children.length, 10, 'Must generate exactly 10 merged architectural meshes');

  const meshNames = lc.group.children.map((c) => c.name);
  assert.ok(meshNames.some((n) => n.includes('Reflective Glass')), 'Must include reflective cyan-blue glass');
  assert.ok(meshNames.some((n) => n.includes('Spandrel Bands')), 'Must include dark spandrel bands');
  assert.ok(meshNames.some((n) => n.includes('Vertical Mullions')), 'Must include vertical mullions');
  assert.ok(meshNames.some((n) => n.includes('Koala Pod Brackets')), 'Must include Paul Rudolph Koala pod brackets');
  assert.ok(meshNames.some((n) => n.includes('Pilotis & Corner Shafts')), 'Must include brutalist pilotis & vertical corner columns');
  assert.ok(meshNames.some((n) => n.includes('Podium & Skybridges')), 'Must include 4-storey commercial podium and skybridges');
  assert.ok(meshNames.some((n) => n.includes('Sky Lobby Louvers')), 'Must include acoustic mechanical louvers at sky lobbies');
  assert.ok(meshNames.some((n) => n.includes('Antenna Spires')), 'Must include steel antenna communication masts');
  assert.ok(meshNames.some((n) => n.includes('Aviation Beacons')), 'Must include red aviation warning beacons');
  assert.ok(meshNames.some((n) => n.includes('Gold Signage')), 'Must include golden bilingual entrance signage');

  // Bounding box checks
  lc.group.updateMatrixWorld(true);
  const bBox = new THREE.Box3().setFromObject(lc.group);
  assert.ok(bBox.min.y <= site.LIPPO_PODIUM_DATA.foundationY + 0.1, 'Foundation must extend to 4.0m to seal terrain');
  assert.ok(bBox.max.y >= site.LIPPO_TOWER_TWO_DATA.crownTop - 0.5, 'Tower 2 crown must reach top height ~192.5m');

  // Colliders
  assert.equal(lc.colliders.length, 9);
  for (const c of lc.colliders) {
    assert.ok(c.name, 'Collider must have name');
    assert.ok(c.minX < c.maxX);
    assert.ok(c.minZ < c.maxZ);
    assert.ok(c.minY < c.maxY);
    assert.ok(c.obb, 'Collider must have oriented bounding box');
  }

  // Verify zero collisions between ground-level tower colliders and the road network
  for (const c of lc.colliders) {
    if (c.minY > 7.0) continue; // Elevated podium and skybridges clear ground road
    for (let x = c.minX; x <= c.maxX; x += 1.0) {
      for (let z = c.minZ; z <= c.maxZ; z += 1.0) {
        if (colliders.colliderContains(c, x, z)) {
          const road = meta.fullRoadSurfaceAt(x, z, 0.2);
          assert.equal(road, null, `Ground collider "${c.name}" collides with road at (${x}, ${z})`);
        }
      }
    }
  }

  // Landmarks
  assert.equal(lc.landmarks.length, 2, 'Must register both Tower 1 and Tower 2 landmarks');
  assert.equal(lc.landmarks[0].id, 'lippo-centre-tower-one');
  assert.equal(lc.landmarks[0].name, '力寶中心第一座');
  assert.equal(lc.landmarks[1].id, 'lippo-centre-tower-two');
  assert.equal(lc.landmarks[1].name, '力寶中心第二座');
});

test('Lippo Centre: world & city integration', () => {
  assert.ok(typeof simple.buildSimpleHongKongWorld === 'function');
  assert.ok(typeof cityModule.city.build === 'function');
});
