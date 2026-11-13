const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');

test('Chater Garden retains mapped site and photo-directed paths, water and trees without covering roads', async () => {
  const THREE = await import('three/webgpu');
  const { CHATER_GARDEN: s, CHATER_GARDEN_SOURCE: source } = await import('../js/cities/hongkong/chater-garden-architecture.js');
  const { buildChaterGarden } = await import('../js/cities/hongkong/chater-garden-world.js');
  const { fullRoadSurfaceAt } = await import('../js/cities/hongkong/full-meta.js');
  const { pointInFlatRing } = await import('../js/cities/hongkong/landmark-site.js');

  assert.equal(source.id, 148784038);
  assert.equal(source.version, 8);
  assert.match(source.evidence, /approximations/);

  const b = buildChaterGarden(new THREE.Group());
  assert.ok(b.stats.chaterGardenGroundCells > 2000);
  assert.ok(b.treeSites.length > 15);
  assert.equal(b.stats.chaterGardenSpillPool, 1);

  for (const name of [
    'Chater Garden terrain-following lawn and paved tree walk',
    'Chater Garden blue spill pool',
    'Chater Garden stone cascade and pool walls',
    'Chater Garden cascading water',
    'Chater Garden green garden railings and pool coping'
  ]) {
    assert.ok(b.group.getObjectByName(name), name);
  }

  const p = b.group.getObjectByName('Chater Garden terrain-following lawn and paved tree walk').geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    assert.ok(pointInFlatRing(s.ring, p.getX(i), p.getZ(i)));
    assert.equal(fullRoadSurfaceAt(p.getX(i), p.getZ(i), .3), null);
  }

  for (const t of b.treeSites) {
    assert.ok(pointInFlatRing(s.ring, t.x, t.z));
    assert.equal(fullRoadSurfaceAt(t.x, t.z, 2.9), null);
  }
});

test('Chater Garden refined features include pergola pavilions, MTR Exit J2, memorials, night lights and colliders', async () => {
  const THREE = await import('three/webgpu');
  const {
    CHATER_GARDEN: s,
    CHATER_GARDEN_OPENED,
    CHATER_GARDEN_PREDECESSOR,
    CHATER_GARDEN_RESEARCH_SOURCES
  } = await import('../js/cities/hongkong/chater-garden-architecture.js');
  const { buildChaterGarden } = await import('../js/cities/hongkong/chater-garden-world.js');

  assert.equal(CHATER_GARDEN_OPENED, '1978-10-20');
  assert.match(CHATER_GARDEN_PREDECESSOR, /Cricket Club/);
  assert.ok(CHATER_GARDEN_RESEARCH_SOURCES.length >= 3);

  const b = buildChaterGarden(new THREE.Group());

  // Refined architectural elements
  const expectedMeshes = [
    'Chater Garden shaded pergola pavilions',
    'Chater Garden pavilion timber trellis',
    'Chater Garden pavilion seating',
    'Chater Garden MTR Exit J2 portal',
    'Chater Garden MTR Exit J2 totem and signage',
    'Chater Garden Cricket Club memorial stone',
    'Chater Garden Tree Walk educational display boards',
    'Chater Garden park luminaire posts',
    'Chater Garden park luminaire posts and night lanterns',
    'Chater Garden pool underwater and cascade night lights',
    'Chater Garden fountain jets',
    'Chater Garden seating',
    'Chater Garden clipped garden shrubs',
    'Chater Garden palm trunks',
    'Chater Garden palm fronds'
  ];

  for (const name of expectedMeshes) {
    const obj = b.group.getObjectByName(name);
    assert.ok(obj, `Missing mesh: ${name}`);
  }

  // Night emissive nodes verification
  const lanterns = b.group.getObjectByName('Chater Garden park luminaire posts and night lanterns');
  assert.ok(lanterns.material.emissiveNode, 'Lanterns must have night emissiveNode');

  const poolLights = b.group.getObjectByName('Chater Garden pool underwater and cascade night lights');
  assert.ok(poolLights.material.emissiveNode, 'Pool lights must have night emissiveNode');

  const mtrPortal = b.group.getObjectByName('Chater Garden MTR Exit J2 portal');
  assert.ok(mtrPortal.material.emissiveNode, 'MTR portal beacon must have night emissiveNode');

  // Stats
  assert.equal(b.stats.chaterGardenPavilions, 1);
  assert.equal(b.stats.chaterGardenMtrExit, 1);
  assert.ok(b.stats.chaterGardenLamps >= 10);
  assert.ok(b.stats.chaterGardenBenches >= 10);
  assert.equal(b.stats.chaterGardenTreeWalkSpecies, 27);

  // Colliders
  assert.ok(b.colliders.length >= 3, `Expected at least 3 colliders, got ${b.colliders.length}`);
  for (const c of b.colliders) {
    assert.ok(Number.isFinite(c.minX) && Number.isFinite(c.maxX));
    assert.ok(Number.isFinite(c.minZ) && Number.isFinite(c.maxZ));
    assert.ok(Number.isFinite(c.minY) && Number.isFinite(c.maxY));
    assert.ok(c.minX < c.maxX && c.minZ < c.maxZ && c.minY < c.maxY);
  }

  // Landmark
  assert.equal(b.landmarks.length, 1);
  const lm = b.landmarks[0];
  assert.equal(lm.name, '遮打花園');
  assert.equal(lm.englishName, 'Chater Garden');
  assert.equal(lm.kind, 'majorPark');
  assert.equal(lm.osmId, 148784038);
});

test('Chater Garden is integrated into park tree layer and world', () => {
  const s = fs.readFileSync('js/cities/hongkong/simple-world.js', 'utf8');
  for (const str of [
    'buildChaterGarden(scene)',
    '...chaterGarden.landmarks',
    '...chaterGarden.colliders',
    '...chaterGarden.stats',
    'victoriaPark, chaterGarden'
  ]) {
    assert.ok(s.includes(str), `simple-world.js should contain "${str}"`);
  }
});
