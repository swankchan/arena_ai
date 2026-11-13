const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Statue Square & The Cenotaph architectural specifications, road clearance and WebGPU TSL features', async () => {
  const THREE = await import('three/webgpu');
  const {
    STATUE_SQUARE_SOUTH: s,
    STATUE_SQUARE_NORTH: n,
    SQUARE_WATER,
    SQUARE_SHELTERS,
    JACKSON_POSITION,
    CENOTAPH_RING,
    CENOTAPH_SOURCE
  } = await import('../js/cities/hongkong/statue-square-architecture.js');
  const { buildStatueSquare } = await import('../js/cities/hongkong/statue-square-world.js');
  const { pointInFlatRing } = await import('../js/cities/hongkong/landmark-site.js');
  const { fullRoadSurfaceAt } = await import('../js/cities/hongkong/full-meta.js');

  // Verify Cenotaph authoritative metadata
  assert.equal(CENOTAPH_SOURCE.id, 'HK-CENTRAL-CENOTAPH');
  assert.equal(CENOTAPH_SOURCE.osmWayId, 737551130);
  assert.equal(CENOTAPH_SOURCE.heightMetres, 10.66);
  assert.equal(CENOTAPH_SOURCE.flagstaffsCount, 6);
  assert.equal(CENOTAPH_SOURCE.wreathsCount, 4);
  assert.ok(CENOTAPH_SOURCE.architect.includes('Lutyens'));
  assert.ok(CENOTAPH_SOURCE.inscriptions.includes('THE GLORIOUS DEAD'));
  assert.ok(CENOTAPH_SOURCE.inscriptions.includes('英靈不滅 浩氣長存'));

  // Verify OSM IDs and basic park relations
  assert.equal(s.osmId, 42293434);
  assert.equal(n.osmId, 25607730);
  assert.equal(SQUARE_WATER.length, 5);
  assert.equal(SQUARE_SHELTERS.length, 4);
  assert.ok(pointInFlatRing(s.ring, ...JACKSON_POSITION));
  assert.ok(!pointInFlatRing(n.ring, CENOTAPH_RING[0], CENOTAPH_RING[1]));

  // Build Statue Square & Cenotaph
  const built = buildStatueSquare(new THREE.Group());
  assert.equal(built.stats.statueSquareCanopies, 4);
  assert.equal(built.stats.statueSquarePools, 5);
  assert.equal(built.stats.statueSquareCenotaph, 1);
  assert.equal(built.stats.statueSquareCenotaphWreaths, 4);
  assert.equal(built.stats.statueSquareCenotaphFlagstaffs, 6);
  assert.equal(built.stats.statueSquareJackson, 1);
  assert.ok(built.stats.statueSquareLamps >= 6);
  assert.ok(built.stats.statueSquareColliders >= 50);
  assert.ok(built.stats.statueSquareGroundCells > 1500);
  assert.ok(built.treeSites.length > 10);

  // Paving road clearance
  const paving = built.group.getObjectByName('Statue Square road-cleared terrain paving').geometry.attributes.position;
  for (let i = 0; i < paving.count; i++) {
    const x = paving.getX(i), z = paving.getZ(i);
    assert.ok(pointInFlatRing(s.ring, x, z) || pointInFlatRing(n.ring, x, z));
    assert.equal(fullRoadSurfaceAt(x, z, 0.3), null);
  }

  // TreeSites road clearance
  for (const t of built.treeSites) {
    assert.ok(pointInFlatRing(s.ring, t.x, t.z) || pointInFlatRing(n.ring, t.x, t.z));
    assert.equal(fullRoadSurfaceAt(t.x, t.z, 2.9), null);
  }

  // Pools & Cenotaph road clearance
  for (const feature of [...SQUARE_WATER, { id: 'cenotaph', world: CENOTAPH_RING }]) {
    const r = feature.world;
    const minX = Math.min(...r.filter((_, i) => i % 2 === 0));
    const maxX = Math.max(...r.filter((_, i) => i % 2 === 0));
    const minZ = Math.min(...r.filter((_, i) => i % 2 === 1));
    const maxZ = Math.max(...r.filter((_, i) => i % 2 === 1));
    for (let x = minX; x <= maxX; x += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        if (pointInFlatRing(r, x, z)) {
          assert.equal(fullRoadSurfaceAt(x, z, 0.2), null, `${feature.id} at ${x},${z}`);
        }
      }
    }
  }

  // Sir Thomas Jackson statue verification
  const statue = built.group.getObjectByName('Sir Thomas Jackson statue');
  assert.ok(statue, 'Sir Thomas Jackson statue exists');
  const facing = new THREE.Vector3(0, 0, 1).applyEuler(statue.rotation);
  assert.ok(facing.x > 0.99, 'statue faces east, towards Court of Final Appeal');

  // Cenotaph structure verification
  const cenotaph = built.group.getObjectByName('和平紀念碑 The Cenotaph');
  assert.ok(cenotaph, 'The Cenotaph group exists');
  assert.ok(cenotaph.getObjectByName('Cenotaph limestone stepped monument'));
  assert.ok(cenotaph.getObjectByName('Cenotaph stone courses'));
  assert.ok(cenotaph.getObjectByName('Cenotaph ceremonial flagpoles'));
  assert.ok(cenotaph.getObjectByName('Cenotaph ceremonial standard flags'));
  assert.ok(cenotaph.getObjectByName('Cenotaph remembrance poppy tribute wreaths'));
  assert.ok(cenotaph.getObjectByName('Cenotaph stone laurel wreath East'));
  assert.ok(cenotaph.getObjectByName('Cenotaph stone laurel wreath West'));
  assert.ok(cenotaph.getObjectByName('Cenotaph stone laurel wreath South'));
  assert.ok(cenotaph.getObjectByName('Cenotaph stone laurel wreath North'));

  // Folded canopies verification
  for (const f of SQUARE_SHELTERS) {
    assert.ok(built.group.getObjectByName(`Statue Square folded canopy ${f.id}`));
  }

  // WebGPU TSL Night Illumination verification
  const nightLights = built.group.getObjectByName('Statue Square and Cenotaph warm night illumination');
  assert.ok(nightLights, 'warm night illumination mesh exists');
  assert.ok(nightLights.material.emissiveNode, 'warm night lights have TSL emissiveNode');

  const poolLights = built.group.getObjectByName('Statue Square underwater fountain night lights');
  assert.ok(poolLights, 'underwater pool night lights exist');
  assert.ok(poolLights.material.emissiveNode, 'underwater lights have TSL emissiveNode');

  const mtrLights = built.group.getObjectByName('Statue Square MTR entrance portal totems');
  assert.ok(mtrLights, 'MTR entrance portal totems exist');
  assert.ok(mtrLights.material.emissiveNode, 'MTR signs have TSL emissiveNode');
});

test('Statue Square is integrated into the park trees, colliders, metadata and runtime', () => {
  const s = fs.readFileSync('js/cities/hongkong/simple-world.js', 'utf8');
  for (const str of [
    'buildStatueSquare(scene)',
    '...statueSquare.landmarks',
    '...statueSquare.colliders',
    '...statueSquare.stats',
    'chaterGarden, statueSquare'
  ]) {
    assert.ok(s.includes(str), str);
  }
});
