const assert = require('node:assert/strict');
const test = require('node:test');

let site, world, meta, THREE, colliders, simple, cityModule;

test.before(async () => {
  [THREE, site, world, meta, colliders, simple, cityModule] = await Promise.all([
    import('three/webgpu'),
    import('../js/cities/hongkong/central-market-site.js'),
    import('../js/cities/hongkong/central-market-world.js'),
    import('../js/cities/hongkong/full-meta.js'),
    import('../js/cities/hongkong/colliders.js'),
    import('../js/cities/hongkong/simple-world.js'),
    import('../js/cities/hongkong/index.js')
  ]);
});

test('Central Market: site & architectural metadata', () => {
  assert.equal(site.CENTRAL_MARKET_SITE.key, 'central-market');
  assert.equal(site.CENTRAL_MARKET_SITE.name, '中環街市');
  assert.equal(site.CENTRAL_MARKET_SITE.englishName, 'Central Market');
  assert.equal(site.CENTRAL_MARKET_SITE.levels, 4);
  assert.equal(site.CENTRAL_MARKET_HEIGHTS.buildingHeight, 18.0);
  assert.equal(site.CENTRAL_MARKET_HEIGHTS.monitorRoofTop, 23.5);
  assert.equal(site.CENTRAL_MARKET_HEIGHTS.baseY, 5.5);
  assert.equal(site.CENTRAL_MARKET_HEIGHTS.foundationY, 3.5);

  // Heritage & historical provenance
  assert.equal(site.CENTRAL_MARKET_HERITAGE.completionYear, 1939);
  assert.equal(site.CENTRAL_MARKET_HERITAGE.reopeningYear, 2021);
  assert.match(site.CENTRAL_MARKET_HERITAGE.grade, /三級歷史建築/);
  assert.match(site.CENTRAL_MARKET_HERITAGE.architecturalStyle, /Streamline Moderne/);
  assert.match(site.CENTRAL_MARKET_HERITAGE.architecturalStyle, /包浩斯/);
  assert.match(site.CENTRAL_MARKET_HERITAGE.address, /80 Des Voeux Road Central/);
  assert.match(site.CENTRAL_MARKET_HERITAGE.address, /93 Queen's Road Central/);
  assert.equal(site.CENTRAL_MARKET_HERITAGE.wikidata, 'Q5061400');
  assert.equal(site.CENTRAL_MARKET_HERITAGE.osmRelation, 1528216);

  // Bounds & atrium
  assert.equal(site.CENTRAL_MARKET_BOUNDS.width, 39.0);
  assert.equal(site.CENTRAL_MARKET_BOUNDS.depth, 72.0);
  assert.equal(site.CENTRAL_MARKET_BOUNDS.cornerRadius, 2.8);
  assert.equal(site.CENTRAL_MARKET_ATRIUM.width, 18.0);
  assert.equal(site.CENTRAL_MARKET_ATRIUM.depth, 28.0);

  // Fan Ho Terrazzo Staircase & market stalls
  assert.equal(site.CENTRAL_MARKET_STAIRCASE.steps, 24);
  assert.equal(site.CENTRAL_MARKET_STALLS.stallCount, 16);
});

test('Central Market: site geometry, coordinates & ground heights', () => {
  // Center is inside site
  const cx = site.CENTRAL_MARKET_CENTER.x;
  const cz = site.CENTRAL_MARKET_CENTER.z;
  assert.ok(site.isCentralMarketPoint(cx, cz));

  // Points outside site return false
  assert.ok(!site.isCentralMarketPoint(-500.0, -200.0));
  assert.ok(!site.isCentralMarketPoint(-350.0, -250.0));
  assert.ok(!site.isCentralMarketPoint(cx, -100.0));

  // Ground height inside building north portion returns baseY (5.5m)
  const ghInsideNorth = site.centralMarketGroundHeightAt(cx, cz, 6.2);
  assert.equal(ghInsideNorth, site.CENTRAL_MARKET_HEIGHTS.baseY);

  // Ground height outside site returns natural ground
  const ghOutside = site.centralMarketGroundHeightAt(-350.0, -250.0, 4.8);
  assert.equal(ghOutside, 4.8);

  // Coordinate transforms invertibility
  const local = site.centralMarketWorldToLocal(cx, cz);
  assert.ok(Math.abs(local.x) < 1e-4);
  assert.ok(Math.abs(local.z) < 1e-4);
  const worldPt = site.centralMarketLocalToWorld(12.0, -20.0);
  const back = site.centralMarketWorldToLocal(worldPt.x, worldPt.z);
  assert.ok(Math.abs(back.x - 12.0) < 1e-4);
  assert.ok(Math.abs(back.z - (-20.0)) < 1e-4);
});

test('Central Market: road clearance & boundary safety', () => {
  // Comprehensive road collision test across the entire site perimeter and footprint
  const ring = site.CENTRAL_MARKET_RING;
  const { pointInFlatRing } = require('../js/cities/hongkong/landmark-site.js');

  for (let x = -470.0; x <= -385.0; x += 1.0) {
    for (let z = -280.0; z <= -195.0; z += 1.0) {
      if (pointInFlatRing(ring, x, z)) {
        const road = meta.fullRoadSurfaceAt(x, z, 0.2);
        assert.equal(road, null, `Road collision detected at (${x}, ${z})`);
      }
    }
  }
});

test('Central Market: 3D model generation & architectural elements', () => {
  const scene = new THREE.Scene();
  const cm = world.buildCentralMarket(scene);

  assert.ok(cm.group, 'Must create a Three.js root group');
  assert.match(cm.group.name, /Central Market/);

  const localGroup = cm.group.children[0];
  assert.ok(localGroup, 'Must have local transformed group');
  assert.equal(localGroup.children.length, 17, 'Must generate exactly 17 merged architectural meshes');

  const meshNames = localGroup.children.map((c) => c.name);
  assert.ok(meshNames.some((n) => n.includes('Foundation')), 'Must include granite foundation plinth');
  assert.ok(meshNames.some((n) => n.includes('Bauhaus Stucco')), 'Must include Bauhaus stucco facade');
  assert.ok(meshNames.some((n) => n.includes('Cantilever Fins')), 'Must include horizontal streamline cantilever fins');
  assert.ok(meshNames.some((n) => n.includes('Ribbon Windows')), 'Must include continuous ribbon band windows');
  assert.ok(meshNames.some((n) => n.includes('Steel Mullions')), 'Must include steel window mullions');
  assert.ok(meshNames.some((n) => n.includes('Atrium & Galleries')), 'Must include lightwell atrium and galleries');
  assert.ok(meshNames.some((n) => n.includes('Community Lawn')), 'Must include central community lawn');
  assert.ok(meshNames.some((n) => n.includes('Timber Benches')), 'Must include teak benches and tables');
  assert.ok(meshNames.some((n) => n.includes('Green Terrazzo')), 'Must include Fan Ho green terrazzo grand staircase');
  assert.ok(meshNames.some((n) => n.includes('Red Terrazzo')), 'Must include red terrazzo landings');
  assert.ok(meshNames.some((n) => n.includes('Brass Trim')), 'Must include brass nosing strips and plaque');
  assert.ok(meshNames.some((n) => n.includes('Subway Tile Stalls')), 'Must include preserved subway tile market stalls');
  assert.ok(meshNames.some((n) => n.includes('Red Pork Lamps')), 'Must include iconic wet-market red lampshade pendants');
  assert.ok(meshNames.some((n) => n.includes('Mid-Levels Footbridge')), 'Must include Mid-Levels escalator footbridge link');
  assert.ok(meshNames.some((n) => n.includes('Roof & Monitor')), 'Must include clerestory monitor roof and skylights');
  assert.ok(meshNames.some((n) => n.includes('Vintage Clocks')), 'Must include vintage mechanical clock faces');
  assert.ok(meshNames.some((n) => n.includes('Gold Signage')), 'Must include bilingual golden entrance signage');

  // Bounding box checks
  cm.group.updateMatrixWorld(true);
  const bBox = new THREE.Box3().setFromObject(cm.group);
  assert.ok(bBox.min.y <= site.CENTRAL_MARKET_HEIGHTS.foundationY + 0.1, 'Foundation must extend to 3.5m to seal sloped terrain');
  assert.ok(bBox.max.y >= site.CENTRAL_MARKET_HEIGHTS.monitorRoofTop - 0.2, 'Monitor roof must reach height ~23.5m');

  // Colliders
  assert.equal(cm.colliders.length, 14);
  for (const c of cm.colliders) {
    assert.ok(c.name, 'Collider must have name');
    assert.ok(c.minX < c.maxX);
    assert.ok(c.minZ < c.maxZ);
    assert.ok(c.minY < c.maxY);
    assert.ok(c.obb, 'Collider must have oriented bounding box');
  }

  // Verify zero collisions between any collider and the road network
  for (const c of cm.colliders) {
    for (let x = c.minX; x <= c.maxX; x += 1.0) {
      for (let z = c.minZ; z <= c.maxZ; z += 1.0) {
        if (colliders.colliderContains(c, x, z)) {
          const road = meta.fullRoadSurfaceAt(x, z, 0.2);
          assert.equal(road, null, `Collider "${c.name}" collides with road at (${x}, ${z})`);
        }
      }
    }
  }

  // Landmark
  assert.equal(cm.landmarks.length, 1);
  assert.equal(cm.landmarks[0].id, 'central-market');
  assert.equal(cm.landmarks[0].name, '中環街市');
  assert.equal(cm.landmarks[0].position.x, site.CENTRAL_MARKET_CENTER.x);
  assert.equal(cm.landmarks[0].position.z, site.CENTRAL_MARKET_CENTER.z);
});

test('Central Market: world & city integration', () => {
  assert.ok(typeof simple.buildSimpleHongKongWorld === 'function');
  assert.ok(typeof cityModule.city.build === 'function');
});
