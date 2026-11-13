const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Central Carnival and Hong Kong Observation Wheel architecture configuration is authoritative', async () => {
  const {
    CENTRAL_CARNIVAL_SOURCE, CENTRAL_CARNIVAL_CONFIG
  } = await import('../js/cities/hongkong/central-carnival-architecture.js');

  assert.equal(CENTRAL_CARNIVAL_SOURCE.observationWheelYear, 2014);
  assert.equal(CENTRAL_CARNIVAL_SOURCE.observationWheelHeightMetres, 60.0);
  assert.equal(CENTRAL_CARNIVAL_SOURCE.observationWheelDiameterMetres, 54.0);
  assert.equal(CENTRAL_CARNIVAL_SOURCE.observationWheelGondolasCount, 42);
  assert.equal(CENTRAL_CARNIVAL_SOURCE.eventSpaceAreaSquareMetres, 5600);
  assert.match(CENTRAL_CARNIVAL_SOURCE.userInstruction, /雖然是節慶偶有.*長擺/);

  // Verification of carnival attractions
  assert.equal(CENTRAL_CARNIVAL_CONFIG.wheel.diameter, 54.0);
  assert.equal(CENTRAL_CARNIVAL_CONFIG.wheel.topHeight, 60.0);
  assert.equal(CENTRAL_CARNIVAL_CONFIG.wheel.gondolas, 42);
  assert.equal(CENTRAL_CARNIVAL_CONFIG.carousel.horses, 16);
  assert.equal(CENTRAL_CARNIVAL_CONFIG.waveSwinger.chairs, 16);
  assert.equal(CENTRAL_CARNIVAL_CONFIG.bumperCars.cars, 8);
  assert.equal(CENTRAL_CARNIVAL_CONFIG.gameBooths.length, 4);
  assert.equal(CENTRAL_CARNIVAL_CONFIG.foodStalls.length, 3);
  assert.equal(CENTRAL_CARNIVAL_CONFIG.entranceArches.length, 2);
  assert.equal(CENTRAL_CARNIVAL_CONFIG.picnicTables.length, 4);
});

test('Central Carnival and Observation Wheel world generates complete 3D fairground with night lighting', async () => {
  const THREE = await import('three/webgpu');
  const { buildCentralCarnival } = await import('../js/cities/hongkong/central-carnival-world.js');

  const scene = new THREE.Scene();
  const result = buildCentralCarnival(scene);

  assert.ok(result.root, 'Root group must be created');
  assert.match(result.root.name, /幸福摩天輪/);
  assert.equal(result.root.userData.source.observationWheelYear, 2014);

  // Check mesh components and finite vertices
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

  assert.equal(nonFiniteVertices, 0, 'All mesh vertices must be finite');
  assert.ok(totalVertices > 30000, `Expected > 30,000 vertices, got ${totalVertices}`);

  // Check core attraction meshes
  assert.ok(meshNames.some(n => n.includes('Observation Wheel white steel A-frame towers')));
  assert.ok(meshNames.some(n => n.includes('Observation Wheel dual concentric circular rims')));
  assert.ok(meshNames.some(n => n.includes('Observation Wheel passenger gondola capsules')));
  assert.ok(meshNames.some(n => n.includes('Observation Wheel VIP golden gondola')));
  assert.ok(meshNames.some(n => n.includes('Observation Wheel boarding station deck and ramps')));
  assert.ok(meshNames.some(n => n.includes('AIA Vitality Park Carousel stepped deck and finials')));
  assert.ok(meshNames.some(n => n.includes('AIA Vitality Park Carousel carved horses')));
  assert.ok(meshNames.some(n => n.includes('Wave Swinger flying chairs ornate central tower')));
  assert.ok(meshNames.some(n => n.includes('Bumper cars colourful cars on track')));
  assert.ok(meshNames.some(n => n.includes('Circus Big Top red striped marquee canvas')));
  assert.ok(meshNames.some(n => n.includes('Carnival game booths timber counters')));
  assert.ok(meshNames.some(n => n.includes('Food Village snack kiosks counters')));
  assert.ok(meshNames.some(n => n.includes('Carnival grand entrance archway pillars')));

  // Check WebGPU TSL Night Lighting
  const wheelLeds = result.root.children.find(c => c.name.includes('Observation Wheel dynamic night LED light rim'));
  assert.ok(wheelLeds && wheelLeds.material.emissiveNode, 'Observation Wheel must have TSL night LED lighting');

  const festoonBulbs = result.root.children.find(c => c.name.includes('Central Carnival warm festival bulb lights'));
  assert.ok(festoonBulbs && festoonBulbs.material.emissiveNode, 'Carnival bulbs must have TSL emissiveNode');

  const neonSign = result.root.children.find(c => c.name.includes('Central Carnival neon pavilion signs'));
  assert.ok(neonSign && neonSign.material.emissiveNode, 'Neon signs must have TSL emissiveNode');

  // Check stats and landmarks
  assert.equal(result.stats.observationWheelHeightM, 60.0);
  assert.equal(result.stats.observationWheelDiameterM, 54.0);
  assert.equal(result.stats.observationWheelGondolas, 42);
  assert.equal(result.stats.carouselHorses, 16);
  assert.equal(result.stats.waveSwingerChairs, 16);
  assert.equal(result.stats.bumperCarsCount, 8);
  assert.equal(result.stats.gameBoothsCount, 4);
  assert.equal(result.stats.foodStallsCount, 3);
  assert.equal(result.stats.entranceArchesCount, 2);
  assert.ok(result.stats.centralCarnivalColliders >= 50);
  assert.equal(result.stats.centralCarnivalPhotoTextures, 0);

  assert.equal(result.landmarks.length, 2);
  assert.ok(result.landmarks.some(l => l.id === 'hong-kong-observation-wheel'));
  assert.ok(result.landmarks.some(l => l.id === 'central-harbourfront-event-space'));
});

test('Central Carnival attractions are situated on territory land with zero road conflicts', async () => {
  const { isTerritoryLand, fullRoadSurfaceAt } = await import('../js/cities/hongkong/full-meta.js');
  const { CENTRAL_CARNIVAL_CONFIG } = await import('../js/cities/hongkong/central-carnival-architecture.js');

  const keySites = [
    { name: 'Wheel', x: CENTRAL_CARNIVAL_CONFIG.wheel.x, z: CENTRAL_CARNIVAL_CONFIG.wheel.z },
    { name: 'Carousel', x: CENTRAL_CARNIVAL_CONFIG.carousel.x, z: CENTRAL_CARNIVAL_CONFIG.carousel.z },
    { name: 'WaveSwinger', x: CENTRAL_CARNIVAL_CONFIG.waveSwinger.x, z: CENTRAL_CARNIVAL_CONFIG.waveSwinger.z },
    { name: 'BumperCars', x: CENTRAL_CARNIVAL_CONFIG.bumperCars.x, z: CENTRAL_CARNIVAL_CONFIG.bumperCars.z },
    { name: 'CircusBigTop', x: CENTRAL_CARNIVAL_CONFIG.circusBigTop.x, z: CENTRAL_CARNIVAL_CONFIG.circusBigTop.z },
    ...CENTRAL_CARNIVAL_CONFIG.gameBooths.map(b => ({ name: b.name, x: b.x, z: b.z })),
    ...CENTRAL_CARNIVAL_CONFIG.foodStalls.map(s => ({ name: s.name, x: s.x, z: s.z })),
    ...CENTRAL_CARNIVAL_CONFIG.entranceArches.map(a => ({ name: a.name, x: a.x, z: a.z }))
  ];

  for (const site of keySites) {
    assert.equal(isTerritoryLand(site.x, site.z), true, `${site.name} at (${site.x}, ${site.z}) must be on land`);
    const road = fullRoadSurfaceAt(site.x, site.z, 1.0, 5.0);
    assert.equal(road, null, `${site.name} at (${site.x}, ${site.z}) must not intersect road (hit ${road?.name})`);
  }
});

test('Central Carnival is integrated into simple-world, index and runtime manifest', () => {
  const root = path.resolve(__dirname, '..');
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');

  assert.match(simple, /buildCentralCarnival/);
  assert.match(simple, /\.\.\.centralCarnival\.stats/);
  assert.match(simple, /\.\.\.centralCarnival\.colliders/);
  assert.match(simple, /\.\.\.centralCarnival\.landmarks/);
  assert.match(index, /centralCarnival: world\.centralCarnival/);

  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'js/app.runtime.manifest.json'), 'utf8'));
  assert.ok(manifest.inputs.includes('js/cities/hongkong/central-carnival-world.js'));
  assert.ok(manifest.inputs.includes('js/cities/hongkong/central-carnival-architecture.js'));
});
