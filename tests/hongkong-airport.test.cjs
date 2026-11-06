const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let THREE, architecture, terrain, airport, scene, roads, lamps, clearance, lampRule, meta, fullMeta, authored;

function occupied(colliders, x, z, y) {
  return colliders.some((c) => {
    if (y < c.minY || y > c.maxY) return false;
    const dx = x - c.obb.cx, dz = z - c.obb.cz;
    return Math.abs(dx * c.obb.cs - dz * c.obb.sn) <= c.obb.hx && Math.abs(dx * c.obb.sn + dz * c.obb.cs) <= c.obb.hz;
  });
}

test.before(async () => {
  THREE = await import('three/webgpu');
  architecture = await import('../js/cities/hongkong/airport-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  fullMeta = await import('../js/cities/hongkong/full-meta.js');
  authored = await import('../js/cities/hongkong/authored-landmark-site.js');
  meta = await import('../js/cities/hongkong/meta.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
  lampRule = await import('../tools/cities/hongkong/build-street-light-clearance.mjs');
  const { buildHongKongAirport } = await import('../js/cities/hongkong/airport-world.js');
  scene = new THREE.Scene(); airport = buildHongKongAirport(scene);
});

test('Chek Lap Kok sources are distinct from Kai Tak AIRSIDE and preserve the real terminal/tower identities', () => {
  assert.equal(architecture.AIRPORT_ID, 'HK-ISL-CHEK-LAP-KOK');
  assert.equal(architecture.AIRPORT_TERMINAL_ONE_SITE.osmId, 772085062);
  assert.equal(architecture.AIRPORT_TERMINAL_TWO_SITE.osmId, 1204348925);
  assert.equal(architecture.AIRPORT_MIDFIELD_SITE.osmId, 393009711);
  assert.equal(architecture.AIRPORT_SATELLITE_SITE.osmId, 155502514);
  assert.equal(architecture.AIRPORT_SOUTH_TOWER_SITE.osmId, 393439479);
  assert.equal(architecture.AIRPORT_TERMINAL_ONE_SITE.source.geometry.length, 26);
  assert.equal(architecture.AIRPORT_MIDFIELD_SITE.source.geometry.length, 19);
  for (const site of architecture.AIRPORT_BUILDING_SITES) assert.match(site.evidence, /OSM|CAD|photo/i);
});

test('all three runways use official 3,800 x 60 m dimensions without inventing engineering elevations', () => {
  assert.equal(architecture.AIRPORT_RUNWAYS.length, 3);
  for (const runway of architecture.AIRPORT_RUNWAYS) {
    assert.equal(runway.width, 60); assert.equal(runway.officialLength, 3800);
    assert.ok(Math.abs(Math.hypot(runway.b.x - runway.a.x, runway.b.z - runway.a.z) - 3800) < 1e-7);
    assert.ok(Number.isFinite(runway.sourceLength));
    assert.match(runway.sourceUrl, /airportguide\.com/);
  }
  assert.match(airport.stats.airportSurfaceSource, /existing-DTM/);
  assert.match(architecture.AIRPORT_TERMINAL_ONE_SITE.evidence, /not an engineering roof elevation/i);
});

test('129 T1 vaults, T2 feather slots, Midfield rooflights, 102 m NAT and 200 m Sky Bridge are authored', () => {
  assert.equal(airport.stats.airportT1Vaults, 129);
  assert.deepEqual(airport.terminalOne.vaults.reduce((counts, vault) => ({ ...counts, [vault.zone]: (counts[vault.zone] || 0) + 1 }), {}),
    { processor: 72, central: 21, northwestArm: 18, southwestArm: 18 });
  assert.equal(airport.stats.airportT2FeatherStrips, 9); assert.equal(airport.stats.airportT2SkylightSlots, 8);
  assert.equal(airport.stats.airportMidfieldRooflights, 4); assert.equal(airport.stats.airportNATHeight, 102);
  assert.ok(Math.abs(airport.stats.airportSkyBridgeLength - 200) < 1.1);
  assert.equal(airport.stats.airportSkyBridgeDeckRise, 28);
  assert.equal(airport.stats.airportAircraft, 23); assert.equal(airport.stats.airportJetBridges, 23);
});

test('airport DTM pads are reproducible and runway/apron ground follows the same continuous terrain query', () => {
  for (const site of architecture.AIRPORT_TERRAIN_SITES) {
    const expected = authored.authoredHighestRawDatum([site], terrain.rawHongKongTerrainHeight);
    const pad = terrain.HONG_KONG_TERRAIN_META.airportPadHeights[site.key];
    assert.ok(Number.isFinite(pad)); assert.equal(pad, expected);
  }
  for (const runway of architecture.AIRPORT_RUNWAYS) {
    for (const t of [0, .25, .5, .75, 1]) {
      const local = { x: runway.a.x + (runway.b.x - runway.a.x) * t, z: runway.a.z + (runway.b.z - runway.a.z) * t };
      const world = architecture.airportLocalToWorld(local.x, local.z), ground = terrain.hongKongTerrainHeight(world.x, world.z);
      assert.ok(Math.abs(airport.airfield.groundHeightAt(world.x, world.z, ground) - ground - architecture.AIRPORT_SURFACE_OFFSETS.runway) < 1e-7);
    }
  }
});

test('terminal facade colliders preserve every recorded drivable road corridor at vehicle height', () => {
  const buildings = { airportT1: airport.terminalOne, airportT2: airport.terminalTwo, airportMidfield: airport.midfield,
    airportSatellite: airport.satellite, airportSouthTower: airport.southTower, airportNAT: airport.newTower };
  let samples = 0;
  for (const site of architecture.AIRPORT_BUILDING_SITES) {
    const building = buildings[site.key];
    for (const roadId of site.roadIds || []) {
      const road = roads[roadId]; assert.ok(road, `missing road record ${roadId}`);
      for (let index = 0; index < road[5].length; index += 2) {
        const x = road[5][index], z = road[5][index + 1], y = fullMeta.fullRoadSurfaceAt(x, z, 0)?.height ?? terrain.hongKongTerrainHeight(x, z);
        assert.equal(occupied(building.colliders, x, z, y + 1.2), false, `${site.key} collider occupies ${road[0]} record ${roadId}`);
        samples++;
      }
    }
  }
  assert.ok(samples > 150);
});

test('cleared source streetlights do not occupy terminal, runway, taxiway or aircraft-stand envelopes', () => {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed);
  let islandLamps = 0;
  for (let index = 0; index < lamps.length; index++) {
    if (suppressed.has(index)) continue;
    const source = lamps[index], row = overrides.get(index), x = source[0] + (row?.[1] || 0) / 100, z = source[1] + (row?.[2] || 0) / 100;
    if (x < -26000 || x > -21000 || z < -6500 || z > 2500) continue;
    islandLamps++; assert.equal(lampRule.airportLampConflictAt(x, z), false, `airport lamp ${index}`);
  }
  assert.ok(islandLamps > 2000);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/street-light-clearance-manifest.json'), 'utf8'));
  assert.equal(manifest.counts.remainingAirportFeatureConflicts, 0);
});

test('airport teleport remains on a real full-territory drivable road', () => {
  const point = meta.TELEPORTS.find((entry) => entry.id === 'airport'); assert.ok(point);
  const hit = fullMeta.nearestFullRoad(point.x, point.z, { radius: 20 });
  assert.ok(hit); assert.ok(hit.width >= 6); assert.ok(hit.distance < 5);
  assert.match(point.name, /香港國際機場/); assert.match(point.sub, /赤鱲角/);
  const runway = architecture.AIRPORT_RUNWAYS[0], centre = architecture.airportLocalToWorld((runway.a.x + runway.b.x) * .5, (runway.a.z + runway.b.z) * .5);
  assert.equal(meta.getLocationLabel(centre.x, centre.z), '香港國際機場');
});

test('Node airport geometry is finite, densely authored and entirely free of photo texture assets', () => {
  let meshes = 0, vertices = 0, nonFinite = 0;
  const materials = new Set();
  scene.traverse((object) => {
    if (!object.isMesh) return; meshes++;
    const positions = object.geometry.getAttribute('position'); vertices += positions?.count || 0;
    if (positions) for (const value of positions.array) if (!Number.isFinite(value)) nonFinite++;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  assert.equal(nonFinite, 0); assert.ok(meshes >= 60); assert.ok(vertices > 300000);
  for (const material of materials) for (const key of ['map', 'alphaMap', 'aoMap', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap']) {
    assert.equal(material[key] ?? null, null, `unexpected image texture ${key}`);
  }
  assert.equal(airport.landmarks.length, 6); assert.ok(airport.colliders.length > 1000);
});

test('airport is integrated into unified world, ground, colliders, landmarks and debug access', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  const map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8');
  assert.match(map, /airportRunways/); assert.match(map, /airportBuildings/); assert.match(map, /香港國際機場/);
  assert.match(simple, /buildHongKongAirport/); assert.match(simple, /airport\.groundHeightAt/);
  assert.match(simple, /\.\.\.airport\.colliders/); assert.match(simple, /\.\.\.airport\.landmarks/);
  assert.match(index, /airport: world\.airport/);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'js/app.runtime.manifest.json'), 'utf8'));
  for (const input of ['airport-world.js', 'airport-architecture.js', 'airport-terminal-one-world.js', 'airport-terminal-two-world.js',
    'airport-midfield-world.js', 'airport-satellite-world.js', 'airport-south-tower-world.js', 'airport-new-tower-world.js', 'airport-aircraft-world.js']) {
    assert.ok(manifest.inputs.includes(`js/cities/hongkong/${input}`), `runtime manifest missing ${input}`);
  }
});
