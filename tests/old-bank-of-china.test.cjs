const assert = require('node:assert/strict');
const test = require('node:test');

let site, world, meta, THREE;

test.before(async () => {
  THREE = await import('three/webgpu');
  site = await import('../js/cities/hongkong/old-bank-of-china-site.js');
  world = await import('../js/cities/hongkong/old-bank-of-china-world.js');
  meta = await import('../js/cities/hongkong/full-meta.js');
});

test('Old Bank of China Building: site & architectural metadata', () => {
  assert.equal(site.OLD_BANK_OF_CHINA_SITE.key, 'old-bank-of-china');
  assert.equal(site.OLD_BANK_OF_CHINA_SITE.name, '舊中國銀行大廈');
  assert.equal(site.OLD_BANK_OF_CHINA_SITE.englishName, 'Bank of China Building');
  assert.equal(site.OLD_BANK_OF_CHINA_SITE.levels, 17);
  assert.equal(site.OLD_BOC_STOREYS, 17);
  assert.equal(site.OLD_BOC_HEIGHT, 70.0);
  assert.equal(site.OLD_BOC_ROOF_TOP, 77.2);
  assert.equal(site.OLD_BOC_BASE_Y, 8.4);
  assert.equal(site.OLD_BOC_FOUNDATION_Y, 5.0);

  // Heritage & historical provenance
  assert.equal(site.OLD_BOC_HERITAGE.completionYear, 1951);
  assert.equal(site.OLD_BOC_HERITAGE.openingYear, 1952);
  assert.match(site.OLD_BOC_HERITAGE.grade, /一級歷史建築/);
  assert.match(site.OLD_BOC_HERITAGE.architects, /Palmer & Turner/);
  assert.match(site.OLD_BOC_HERITAGE.architects, /Luke Him Sau/);
  assert.match(site.OLD_BOC_HERITAGE.address, /2A Des Voeux Road Central/);

  // Guardian lions specification
  assert.equal(site.OLD_BOC_LIONS.count, 2);
  assert.equal(site.OLD_BOC_LIONS.east.gender, 'male');
  assert.match(site.OLD_BOC_LIONS.east.symbolism, /踏球/);
  assert.equal(site.OLD_BOC_LIONS.west.gender, 'female');
  assert.match(site.OLD_BOC_LIONS.west.symbolism, /撫幼/);

  // China Club metadata
  assert.equal(site.OLD_BOC_CHINA_CLUB.foundedYear, 1991);
  assert.match(site.OLD_BOC_CHINA_CLUB.founder, /David Tang/);
});

test('Old Bank of China Building: site geometry & ground heights', () => {
  // Center is inside site
  assert.ok(site.isOldBankOfChinaPoint(51.0, 188.0));
  // Points outside site are false
  assert.ok(!site.isOldBankOfChinaPoint(10.0, 188.0));
  assert.ok(!site.isOldBankOfChinaPoint(51.0, 100.0));
  assert.ok(!site.isOldBankOfChinaPoint(80.0, 188.0));

  // Ground height inside podium returns baseY (8.4m)
  const ghInside = site.oldBankOfChinaGroundHeightAt(51.0, 188.0, 7.5);
  assert.equal(ghInside, site.OLD_BOC_BASE_Y);

  // Ground height outside site returns natural ground
  const ghOutside = site.oldBankOfChinaGroundHeightAt(20.0, 150.0, 6.2);
  assert.equal(ghOutside, 6.2);

  // Coordinate transforms
  const local = site.oldBocWorldToLocal(51.0, 188.0);
  assert.equal(local.x, 0);
  assert.equal(local.z, 0);
  const worldPt = site.oldBocLocalToWorld(0, 0);
  assert.equal(worldPt.x, 51.0);
  assert.equal(worldPt.z, 188.0);
});

test('Old Bank of China Building: road clearance & boundary separation', () => {
  const P = site.OLD_BOC_PODIUM_BOUNDS;

  // Separation with HSBC (HSBC maxX = 32.4m)
  assert.ok(P.minX > 32.4 + 5.0, 'Must have at least 5m clearance from HSBC across Bank Street');

  // Separation with Cheung Kong Center (CKC minX = 65.08m)
  assert.ok(P.maxX < 65.08 - 4.0, 'Must have at least 4m clearance from Cheung Kong Center');

  // North boundary separation with Des Voeux Road Central (road edge z <= 164.5m)
  assert.ok(P.minZ >= 170.0, 'Podium north face must leave at least 5m sidewalk along Des Voeux Rd');

  // South boundary separation with Queen\'s Road Central (road edge z >= 210.6m)
  assert.ok(P.maxZ <= 206.0, 'Podium south face must leave at least 4m sidewalk along Queen\'s Rd');

  // Comprehensive road collision test across the entire site footprint
  for (let x = 41.5; x <= 60.5; x += 0.5) {
    for (let z = 167.5; z <= 207.5; z += 0.5) {
      const road = meta.fullRoadSurfaceAt(x, z, 0.2);
      assert.equal(road, null, `Road collision detected at (${x}, ${z})`);
    }
  }
});

test('Old Bank of China Building: 3D model generation & meshes', () => {
  const scene = new THREE.Scene();
  const boc = world.buildOldBankOfChinaBuilding(scene);

  assert.ok(boc.group, 'Must create a Three.js root group');
  assert.match(boc.group.name, /Bank of China Building/);
  assert.equal(boc.group.children.length, 16, 'Must generate exactly 16 merged architectural meshes');

  const meshNames = boc.group.children.map((c) => c.name);
  assert.ok(meshNames.some((n) => n.includes('Granite Podium')), 'Must include podium stone');
  assert.ok(meshNames.some((n) => n.includes('Granite Shaft')), 'Must include tower shaft');
  assert.ok(meshNames.some((n) => n.includes('Guardian Stone Lions')), 'Must include guardian lions');
  assert.ok(meshNames.some((n) => n.includes('Glazed Emerald Roof')), 'Must include Chinese glazed green roof');
  assert.ok(meshNames.some((n) => n.includes('Pagoda Finial')), 'Must include gold finial spire');
  assert.ok(meshNames.some((n) => n.includes('China Club')), 'Must include China Club windows');
  assert.ok(meshNames.some((n) => n.includes('Bronze Doors')), 'Must include bronze doors');
  assert.ok(meshNames.some((n) => n.includes('Gold Inscription')), 'Must include gold lettering');

  // Bounding box checks
  const bBox = new THREE.Box3().setFromObject(boc.group);
  assert.ok(bBox.min.y <= site.OLD_BOC_FOUNDATION_Y + 0.1, 'Foundation must extend to 5.0m to seal terrain');
  assert.ok(bBox.max.y >= site.OLD_BOC_ROOF_TOP, 'Crown finial must reach top height ~77.2m');
  assert.ok(bBox.max.x - bBox.min.x >= 18.0 && bBox.max.x - bBox.min.x <= 24.0, 'Width between 18m and 24m');
  assert.ok(bBox.max.z - bBox.min.z >= 35.0 && bBox.max.z - bBox.min.z <= 42.0, 'Depth between 35m and 42m');

  // Colliders
  assert.equal(boc.colliders.length, 7);
  for (const c of boc.colliders) {
    assert.ok(c.name, 'Collider must have name');
    assert.ok(c.minX < c.maxX);
    assert.ok(c.minZ < c.maxZ);
    assert.ok(c.minY < c.maxY);
  }

  // Landmark
  assert.equal(boc.landmarks.length, 1);
  assert.equal(boc.landmarks[0].id, 'old-bank-of-china');
  assert.equal(boc.landmarks[0].name, '舊中國銀行大廈');
  assert.equal(boc.landmarks[0].position.x, 51.0);
  assert.equal(boc.landmarks[0].position.z, 188.0);
});

test('Old Bank of China Building: world & city integration', async () => {
  const simple = await import('../js/cities/hongkong/simple-world.js');
  const cityModule = await import('../js/cities/hongkong/index.js');

  assert.ok(typeof simple.buildSimpleHongKongWorld === 'function');
  assert.ok(typeof cityModule.city.build === 'function');
});
