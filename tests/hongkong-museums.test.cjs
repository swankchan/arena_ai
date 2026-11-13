const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const THREE = require('three/webgpu');

const root = path.resolve(__dirname, '..');

const {
  ART_MUSEUM_SITE, ART_MUSEUM_MAIN_ROOF_HEIGHT, ART_MUSEUM_TOP_BOX_HEIGHT,
  artMuseumTerrainHeightAt,
} = require(path.join(root, 'js/cities/hongkong/art-museum-site.js'));
const { buildArtMuseum } = require(path.join(root, 'js/cities/hongkong/art-museum-world.js'));

const {
  SCIENCE_MUSEUM_SITE, SCIENCE_MUSEUM_ROOF_HEIGHT, SCIENCE_MUSEUM_ATRIUM_TOWER_HEIGHT,
  SCIENCE_MUSEUM_ENERGY_MACHINE_HEIGHT, scienceMuseumTerrainHeightAt,
} = require(path.join(root, 'js/cities/hongkong/science-museum-site.js'));
const { buildScienceMuseum } = require(path.join(root, 'js/cities/hongkong/science-museum-world.js'));

const {
  HISTORY_MUSEUM_SITE, HISTORY_MUSEUM_ROOF_HEIGHT, HISTORY_MUSEUM_VAULT_HEIGHT,
  historyMuseumTerrainHeightAt,
} = require(path.join(root, 'js/cities/hongkong/history-museum-site.js'));
const { buildHistoryMuseum } = require(path.join(root, 'js/cities/hongkong/history-museum-world.js'));

const {
  CULTURAL_CENTRE_SITE, CULTURAL_CENTRE_EAST_PEAK_HEIGHT,
} = require(path.join(root, 'js/cities/hongkong/cultural-centre-architecture.js'));
const { buildCulturalCentre } = require(path.join(root, 'js/cities/hongkong/cultural-centre-world.js'));

const terrain = require(path.join(root, 'js/cities/hongkong/terrain.js'));
const { HK_FULL_ROADS } = require(path.join(root, 'js/hk-full-roads-data.js'));

function checkFiniteGeometry(object) {
  let meshes = 0;
  object.traverse((child) => {
    if (!child.isMesh) return;
    meshes++;
    const pos = child.geometry.getAttribute('position');
    assert.ok(pos, `Mesh ${child.name || 'unnamed'} must have position attribute`);
    assert.ok(pos.count > 0, `Mesh ${child.name || 'unnamed'} must have vertices`);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z),
        `Mesh ${child.name || 'unnamed'} has non-finite vertex at index ${i}: [${x}, ${y}, ${z}]`);
    }
  });
  return meshes;
}

function inside(ring, x, z) {
  let value = false;
  for (let i = 0, j = ring.length - 2; i + 1 < ring.length; j = i, i += 2) {
    const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) value = !value;
  }
  return value;
}

function cross(ax, az, bx, bz) { return ax * bz - az * bx; }

function intersects(a, b, c, d) {
  const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1];
  const denominator = cross(rx, rz, sx, sz);
  if (Math.abs(denominator) < 1e-9) return false;
  const qx = c[0] - a[0], qz = c[1] - a[1];
  const t = cross(qx, qz, sx, sz) / denominator;
  const u = cross(qx, qz, rx, rz) / denominator;
  return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9;
}

function conflicts(site) {
  const result = new Set();
  const roads = HK_FULL_ROADS.roads;
  for (const [id, road] of roads.entries()) {
    const flat = road[5];
    for (let i = 2; i < flat.length; i += 2) {
      const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]];
      if (Math.max(a[0], b[0]) < site.bounds.minX || Math.min(a[0], b[0]) > site.bounds.maxX ||
          Math.max(a[1], b[1]) < site.bounds.minZ || Math.min(a[1], b[1]) > site.bounds.maxZ) continue;
      let hit = inside(site.ring, ...a) || inside(site.ring, ...b);
      for (let j = 0; j < site.ring.length - 2 && !hit; j += 2) {
        hit = intersects(a, b, [site.ring[j], site.ring[j + 1]], [site.ring[j + 2], site.ring[j + 3]]);
      }
      if (hit) result.add(id);
    }
  }
  return [...result];
}

test('Hong Kong Museum of Art (HKMoA) preserves exact OSM ring and 2019 expansion features', () => {
  assert.equal(ART_MUSEUM_SITE.osmId, 37664699);
  assert.equal(ART_MUSEUM_SITE.ring.length, 34); // 16 vertices + closing = 17 pairs (34 numbers)
  assert.ok(ART_MUSEUM_SITE.ringArea > 5000 && ART_MUSEUM_SITE.ringArea < 6000);
  assert.equal(ART_MUSEUM_SITE.levels, 5);
  assert.equal(ART_MUSEUM_TOP_BOX_HEIGHT, 31.8);

  const scene = new THREE.Scene();
  const result = buildArtMuseum(scene);
  assert.ok(result.root);
  assert.ok(result.colliders.length > 0);
  assert.equal(result.landmarks.length, 1);
  assert.equal(result.landmarks[0].id, 'hong-kong-museum-of-art');
  assert.equal(result.stats.artMuseumVertices, 16);
  assert.equal(result.stats.artMuseumLevels, 5);

  const meshCount = checkFiniteGeometry(result.root);
  assert.ok(meshCount >= 8, `HKMoA should generate at least 8 distinct mesh components, got ${meshCount}`);
});

test('Hong Kong Science Museum (HKScM) preserves exact OSM ring and iconic Energy Machine', () => {
  assert.equal(SCIENCE_MUSEUM_SITE.osmId, 56752303);
  assert.equal(SCIENCE_MUSEUM_SITE.ring.length, 16); // 7 vertices + closing = 8 pairs (16 numbers)
  assert.ok(SCIENCE_MUSEUM_SITE.ringArea > 3000 && SCIENCE_MUSEUM_SITE.ringArea < 4200);
  assert.equal(SCIENCE_MUSEUM_ROOF_HEIGHT, 20.5);
  assert.equal(SCIENCE_MUSEUM_ENERGY_MACHINE_HEIGHT, 22.0);

  const scene = new THREE.Scene();
  const result = buildScienceMuseum(scene);
  assert.ok(result.root);
  assert.ok(result.colliders.length > 0);
  assert.equal(result.landmarks.length, 1);
  assert.equal(result.landmarks[0].id, 'hong-kong-science-museum');
  assert.equal(result.stats.scienceMuseumVertices, 7);
  assert.equal(result.stats.scienceMuseumPyramids, 4);

  const meshCount = checkFiniteGeometry(result.root);
  assert.ok(meshCount >= 8, `HKScM should generate at least 8 distinct mesh components, got ${meshCount}`);
});

test('Hong Kong Museum of History (HKMH) preserves 67-vertex stepped ring and curved barrel vaults', () => {
  assert.equal(HISTORY_MUSEUM_SITE.osmId, 99148524);
  assert.equal(HISTORY_MUSEUM_SITE.ring.length, 136); // 67 vertices + closing = 68 pairs (136 numbers)
  assert.ok(HISTORY_MUSEUM_SITE.ringArea > 8000 && HISTORY_MUSEUM_SITE.ringArea < 9500);
  assert.equal(HISTORY_MUSEUM_VAULT_HEIGHT, 22.8);

  const scene = new THREE.Scene();
  const result = buildHistoryMuseum(scene);
  assert.ok(result.root);
  assert.ok(result.colliders.length > 0);
  assert.equal(result.landmarks.length, 1);
  assert.equal(result.landmarks[0].id, 'hong-kong-museum-of-history');
  assert.equal(result.stats.historyMuseumVertices, 67);
  assert.equal(result.stats.historyMuseumBarrelVaults, 2);

  const meshCount = checkFiniteGeometry(result.root);
  assert.ok(meshCount >= 6, `HKMH should generate at least 6 distinct mesh components, got ${meshCount}`);
});

test('Hong Kong Cultural Centre (HKCC) has SSR/Node safe lettering and refined waterfront colonnade', () => {
  const scene = new THREE.Scene();
  // Must build cleanly in headless Node without ReferenceError: document is not defined
  const result = buildCulturalCentre(scene);
  assert.ok(result.root);
  assert.ok(result.colliders.length >= 40);
  assert.equal(result.landmarks.length, 1);
  assert.equal(result.landmarks[0].id, 'hong-kong-cultural-centre');

  const meshCount = checkFiniteGeometry(result.root);
  assert.ok(meshCount >= 30, `HKCC should generate at least 30 mesh components, got ${meshCount}`);

  // Confirm waterfront colonnade components exist in the scene tree
  let foundColonnade = false, foundViewingDeck = false;
  result.root.traverse((child) => {
    if (child.name && child.name.includes('waterfront slanted colonnade piers')) foundColonnade = true;
    if (child.name && child.name.includes('elevated harbour viewing promenade deck')) foundViewingDeck = true;
  });
  assert.ok(foundColonnade, 'Cultural Centre must feature the waterfront colonnade piers');
  assert.ok(foundViewingDeck, 'Cultural Centre must feature the elevated harbour viewing deck');
});

test('museum footprints do not intersect HK_FULL_ROADS or each other', () => {
  const museumSites = [
    { name: 'HKMoA', site: ART_MUSEUM_SITE },
    { name: 'HKScM', site: SCIENCE_MUSEUM_SITE },
    { name: 'HKMH', site: HISTORY_MUSEUM_SITE },
    { name: 'HKCC', site: CULTURAL_CENTRE_SITE },
  ];

  // Check no museum crosses any road segment in HK_FULL_ROADS
  for (const { name, site } of museumSites) {
    const hits = conflicts(site);
    assert.deepEqual(hits, [], `${name} ring must have zero road conflicts, found ${hits.length}`);
  }

  // Check Science Museum and History Museum do not overlap each other
  for (let i = 0; i < SCIENCE_MUSEUM_SITE.ring.length - 2; i += 2) {
    const sx = SCIENCE_MUSEUM_SITE.ring[i], sz = SCIENCE_MUSEUM_SITE.ring[i + 1];
    assert.ok(!inside(HISTORY_MUSEUM_SITE.ring, sx, sz),
      `Science Museum vertex (${sx}, ${sz}) must not be inside History Museum`);
  }
  for (let i = 0; i < HISTORY_MUSEUM_SITE.ring.length - 2; i += 2) {
    const hx = HISTORY_MUSEUM_SITE.ring[i], hz = HISTORY_MUSEUM_SITE.ring[i + 1];
    assert.ok(!inside(SCIENCE_MUSEUM_SITE.ring, hx, hz),
      `History Museum vertex (${hx}, ${hz}) must not be inside Science Museum`);
  }
});

test('terrain pad heights are reproducible and do not displace outside terrain', () => {
  const artPad = terrain.artMuseumPadHeight();
  const sciPad = terrain.scienceMuseumPadHeight();
  const histPad = terrain.historyMuseumPadHeight();

  assert.ok(artPad > 3.0 && artPad < 6.0, `HKMoA pad height sensible: ${artPad}`);
  assert.ok(sciPad > 5.0 && sciPad < 9.0, `HKScM pad height sensible: ${sciPad}`);
  assert.ok(histPad > 5.0 && histPad < 8.0, `HKMH pad height sensible: ${histPad}`);

  // Querying within building ring gives pad height
  assert.equal(terrain.hongKongTerrainHeight(ART_MUSEUM_SITE.x, ART_MUSEUM_SITE.z), artPad);
  assert.equal(terrain.hongKongTerrainHeight(SCIENCE_MUSEUM_SITE.x, SCIENCE_MUSEUM_SITE.z), sciPad);
  assert.equal(terrain.hongKongTerrainHeight(HISTORY_MUSEUM_SITE.x, HISTORY_MUSEUM_SITE.z), histPad);

  // Far away outside points remain unchanged raw terrain
  const farX = 0, farZ = 0;
  assert.equal(terrain.hongKongTerrainHeight(farX, farZ), terrain.rawHongKongTerrainHeight(farX, farZ));
});

test('all 3 museums and Cultural Centre are integrated in simple-world, map and docs', () => {
  const simpleWorldCode = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  assert.match(simpleWorldCode, /buildArtMuseum/);
  assert.match(simpleWorldCode, /buildScienceMuseum/);
  assert.match(simpleWorldCode, /buildHistoryMuseum/);
  assert.match(simpleWorldCode, /buildCulturalCentre/);
  assert.match(simpleWorldCode, /artMuseum\.stats/);
  assert.match(simpleWorldCode, /scienceMuseum\.stats/);
  assert.match(simpleWorldCode, /historyMuseum\.stats/);
  assert.match(simpleWorldCode, /culturalCentre\.stats/);

  const mapCode = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8');
  assert.match(mapCode, /ART_MUSEUM_SITE/);
  assert.match(mapCode, /SCIENCE_MUSEUM_SITE/);
  assert.match(mapCode, /HISTORY_MUSEUM_SITE/);
  assert.match(mapCode, /CULTURAL_CENTRE_SITE/);

  const inventoryDoc = fs.readFileSync(path.join(root, 'docs/hongkong-building-inventory.md'), 'utf8');
  assert.match(inventoryDoc, /HK-TST-MOA/);
  assert.match(inventoryDoc, /HK-TST-SCM/);
  assert.match(inventoryDoc, /HK-TST-KMH/);
  assert.match(inventoryDoc, /HK-TST-CC/);

  const landmarksDoc = fs.readFileSync(path.join(root, 'docs/hongkong-landmarks.md'), 'utf8');
  assert.match(landmarksDoc, /香港藝術館/);
  assert.match(landmarksDoc, /香港科學館/);
  assert.match(landmarksDoc, /香港歷史博物館/);
  assert.match(landmarksDoc, /香港文化中心/);
});
