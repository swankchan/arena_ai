const test = require('node:test');
const assert = require('node:assert/strict');

test('TST waterfront promenade architecture configuration and historical sources are authoritative', async () => {
  const {
    TST_WATERFRONT_PROMENADE_SOURCE, TST_WATERFRONT_PROMENADE_CONFIG
  } = await import('../js/cities/hongkong/tst-waterfront-promenade-architecture.js');

  assert.equal(TST_WATERFRONT_PROMENADE_SOURCE.lengthMetres, 1089);
  assert.equal(TST_WATERFRONT_PROMENADE_SOURCE.starFerryPierYear, 1957);
  assert.equal(TST_WATERFRONT_PROMENADE_SOURCE.culturalCentreYear, 1989);
  assert.equal(TST_WATERFRONT_PROMENADE_SOURCE.avenueOfStarsRevitalisationYear, 2019);
  assert.match(TST_WATERFRONT_PROMENADE_SOURCE.avenueOfStarsLandscapeArchitect, /James Corner/);
  assert.match(TST_WATERFRONT_PROMENADE_SOURCE.culturalCentreArchitect, /José Lei/);

  assert.equal(TST_WATERFRONT_PROMENADE_CONFIG.publicPierSteps.length, 4);
  assert.equal(TST_WATERFRONT_PROMENADE_CONFIG.avenuePavilions.length, 4);
  assert.equal(TST_WATERFRONT_PROMENADE_CONFIG.statues.length, 3);

  // Check statue identities
  const statueNames = TST_WATERFRONT_PROMENADE_CONFIG.statues.map(s => s.name);
  assert.ok(statueNames.some(n => n.includes('Bruce Lee')));
  assert.ok(statueNames.some(n => n.includes('Anita Mui')));
  assert.ok(statueNames.some(n => n.includes('McDull')));
});

test('TST waterfront promenade world builds complete 3D seawall, covered walkways and Avenue of Stars', async () => {
  const THREE = await import('three/webgpu');
  const { buildTstWaterfrontPromenade } = await import('../js/cities/hongkong/tst-waterfront-promenade-world.js');

  const scene = new THREE.Scene();
  const result = buildTstWaterfrontPromenade(scene);

  assert.ok(result.root, 'Root group must be defined');
  assert.match(result.root.name, /尖沙咀海旁建築與星光大道海濱長廊/);
  assert.equal(result.root.userData.source.lengthMetres, 1089);

  // Check mesh components
  const meshNames = [];
  let totalVertices = 0;
  let nonFiniteVertices = 0;

  result.root.traverse((obj) => {
    if (obj.isMesh) {
      meshNames.push(obj.name);
      const pos = obj.geometry.getAttribute('position');
      assert.ok(pos, `Mesh ${obj.name} must have position attribute`);
      totalVertices += pos.count;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
          nonFiniteVertices++;
        }
      }
    }
  });

  assert.equal(nonFiniteVertices, 0, 'All mesh vertices must be finite numbers');
  assert.ok(totalVertices > 80000, `Expected at least 80,000 vertices, got ${totalVertices}`);

  // Check key required components
  assert.ok(meshNames.some(n => n.includes('3D granite seawall coping')), 'Must have seawall coping mesh');
  assert.ok(meshNames.some(n => n.includes('3D vertical granite seawall face')), 'Must have vertical seawall face mesh');
  assert.ok(meshNames.some(n => n.includes('cast iron mooring bollards')), 'Must have mooring bollards mesh');
  assert.ok(meshNames.some(n => n.includes('lifebuoy stations')), 'Must have lifebuoy stations mesh');
  assert.ok(meshNames.some(n => n.includes('Kowloon Public Pier landing steps')), 'Must have landing steps mesh');
  assert.ok(meshNames.some(n => n.includes('Star Ferry covered passenger walkway')), 'Must have Star Ferry covered walkway');
  assert.ok(meshNames.some(n => n.includes('Cultural Centre grand harbour colonnade')), 'Must have Cultural Centre colonnade');
  assert.ok(meshNames.some(n => n.includes('Cultural Centre upper level harbour viewing deck')), 'Must have Cultural Centre viewing deck');
  assert.ok(meshNames.some(n => n.includes('Avenue of Stars wave shade canopy')), 'Must have Avenue of Stars pavilions');
  assert.ok(meshNames.some(n => n.includes('commemorative bronze statues')), 'Must have bronze statues mesh');
  assert.ok(meshNames.some(n => n.includes('night downlights')), 'Must have night downlights mesh');
  assert.ok(meshNames.some(n => n.includes('nautical night navigation beacons')), 'Must have nautical beacons mesh');

  // Verify night lighting materials use WebGPU TSL emissiveNode
  const lightMesh = result.root.children.find(c => c.name.includes('night downlights'));
  assert.ok(lightMesh && lightMesh.material.emissiveNode, 'Night downlights must have TSL emissiveNode');

  const beaconMesh = result.root.children.find(c => c.name.includes('nautical night navigation beacons'));
  assert.ok(beaconMesh && beaconMesh.material.emissiveNode, 'Nautical beacons must have TSL emissiveNode');

  // Verify colliders
  assert.ok(Array.isArray(result.colliders));
  assert.ok(result.colliders.length > 150, `Expected > 150 colliders, got ${result.colliders.length}`);

  // Verify stats
  assert.equal(result.stats.tstWaterfrontPromenadeLength, 1089);
  assert.ok(result.stats.tstWaterfrontSeawallSegments > 1500);
  assert.ok(result.stats.tstWaterfrontMooringBollards >= 40);
  assert.ok(result.stats.tstWaterfrontLifebuoyStations >= 20);
  assert.equal(result.stats.tstWaterfrontPublicPierSteps, 4);
  assert.equal(result.stats.tstWaterfrontAvenuePavilions, 4);
  assert.equal(result.stats.tstWaterfrontAvenueStatues, 3);
  assert.equal(result.stats.tstWaterfrontPhotoTextures, 0);
});

test('TST waterfront promenade is integrated into simple-world, index and architecture exports', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.resolve(__dirname, '..');

  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');

  assert.match(simple, /buildTstWaterfrontPromenade/);
  assert.match(simple, /\.\.\.tstWaterfrontPromenade\.stats/);
  assert.match(simple, /\.\.\.tstWaterfrontPromenade\.colliders/);
  assert.match(index, /tstWaterfrontPromenade: world\.tstWaterfrontPromenade/);

  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'js/app.runtime.manifest.json'), 'utf8'));
  assert.ok(manifest.inputs.includes('js/cities/hongkong/tst-waterfront-promenade-world.js'));
  assert.ok(manifest.inputs.includes('js/cities/hongkong/tst-waterfront-promenade-architecture.js'));
});

