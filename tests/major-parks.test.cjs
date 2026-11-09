const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let arch, siteUtils, terrain, THREE, worlds, lamps, clearance, treeField;
const inside = (ring, x, z) => siteUtils.pointInFlatRing(ring, x, z);
function pointInObb(c, x, z, y) {
  if (!c.obb || y < c.minY || y > c.maxY) return false;
  const dx = x - c.obb.cx, dz = z - c.obb.cz, lx = dx * c.obb.cs - dz * c.obb.sn, lz = dx * c.obb.sn + dz * c.obb.cs;
  return Math.abs(lx) < c.obb.hx && Math.abs(lz) < c.obb.hz;
}
function* routeSamples(route, step = 1) {
  for (let i = 2; i < route.points.length; i += 2) {
    const ax = route.points[i - 2], az = route.points[i - 1], bx = route.points[i], bz = route.points[i + 1];
    const count = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let n = 0; n <= count; n++) yield [ax + (bx - ax) * n / count, az + (bz - az) * n / count];
  }
}

test.before(async () => {
  arch = await import('../js/cities/hongkong/major-parks-architecture.js');
  siteUtils = await import('../js/cities/hongkong/landmark-site.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
  globalThis.document = { createElement: () => {
    const canvas = { width: 0, height: 0 };
    const context = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (target, key) => target[key] || (() => {}), set: (target, key, value) => { target[key] = value; return true; } });
    canvas.getContext = () => context; return canvas;
  } };
  THREE = await import('three/webgpu');
  const hk = await import('../js/cities/hongkong/hong-kong-park-world.js');
  const kp = await import('../js/cities/hongkong/kowloon-park-world.js');
  const vp = await import('../js/cities/hongkong/victoria-park-world.js');
  const parkUtils = await import('../js/cities/hongkong/major-parks-world-utils.js');
  worlds = new Map([
    [arch.HONG_KONG_PARK, hk.buildHongKongPark(new THREE.Group())],
    [arch.KOWLOON_PARK, kp.buildKowloonPark(new THREE.Group())],
    [arch.VICTORIA_PARK, vp.buildVictoriaPark(new THREE.Group())]
  ]);
  treeField = parkUtils.buildMajorParkTreeLayer(new THREE.Group(), [...worlds.values()], [...worlds.values()].flatMap((world) => world.colliders));
});

test('three major parks retain exact OSM identities and separate official areas from projected site areas', () => {
  assert.deepEqual(arch.MAJOR_PARKS.map((park) => park.id), [42255430, 4977404, 4182605]);
  assert.deepEqual(arch.MAJOR_PARKS.map((park) => park.officialArea), [81600, 133000, 190000]);
  for (const park of arch.MAJOR_PARKS) {
    assert.ok(park.area > 70000); assert.ok(park.source.sourceTimestamp); assert.match(park.source.attribution, /OpenStreetMap/);
    assert.notEqual(park.area, park.officialArea); assert.ok(arch.MAJOR_PARK_RESEARCH_SOURCES.length >= 6);
    assert.ok(park.paths.length >= 4); assert.ok(park.entrances.length >= 3);
  }
  assert.equal(arch.VICTORIA_PARK.source.version, 36);
});

test('all authored facility rings are inside their park except the explicitly larger OSM woodland polygon', () => {
  for (const park of arch.MAJOR_PARKS) for (const feature of park.features) {
    if (feature.kind === 'woods') continue;
    for (let i = 0; i < feature.ring.length; i += 2) assert.ok(inside(park.ring, feature.ring[i], feature.ring[i + 1]), `${feature.name} vertex outside ${park.name}`);
  }
  for (const feature of [arch.HONG_KONG_ARTIFICIAL_LAKE, arch.HONG_KONG_FOUNTAIN_PLAZA, arch.KOWLOON_FOUNTAIN, arch.KOWLOON_SCULPTURE_POOL, arch.KOWLOON_CHINESE_PAVILION, arch.VICTORIA_MODEL_BOAT_POOL, arch.VICTORIA_QUEEN_STATUE]) {
    assert.ok(feature.evidence); assert.match(feature.evidence, /Photo-directed|photo-directed|Scene|scene|OSM/);
  }
  assert.ok(Math.abs(arch.VICTORIA_MODEL_BOAT_POOL.area - 954) < 1e-6); assert.equal(arch.VICTORIA_MODEL_BOAT_POOL.officialDepth, .5);
});

test('all ten authored entrances and arrival points are unique, on land and inside their exact sites', () => {
  const ids = new Set();
  for (const park of arch.MAJOR_PARKS) {
    const arrivals = arch.majorParkArrivalPoints(park); assert.equal(arrivals.length, park.entrances.length);
    for (const entry of arrivals) {
      assert.ok(inside(park.ring, entry.x, entry.z), `${entry.id} outside site`); assert.ok(!ids.has(entry.id)); ids.add(entry.id);
      assert.ok(Number.isFinite(entry.heading)); assert.match(entry.sub, /authored park entrance/);
    }
  }
  assert.equal(ids.size, 10);
});

test('fourteen continuous paths stay inside their sites at one-metre sampling', () => {
  assert.equal(arch.MAJOR_PARKS.reduce((sum, park) => sum + park.paths.length, 0), 14);
  for (const park of arch.MAJOR_PARKS) for (const route of park.paths) {
    assert.ok(route.intendedPoints.length >= 4); assert.ok(route.points.length >= 4);
    for (const [x, z] of routeSamples(route)) assert.ok(inside(park.ring, x, z), `${route.id} leaves ${park.name} at ${x},${z}`);
  }
});

test('walking routes cross no carriageway, including the Kowloon internal service road', () => {
  const crossings = [];
  for (const park of arch.MAJOR_PARKS) for (const route of park.paths) {
    const roadIds = new Set();
    for (const [x, z] of routeSamples(route)) {
      const hit = arch.majorParkRoadAt(park, x, z, 0); if (hit) roadIds.add(hit.road.id);
    }
    if (roadIds.size) crossings.push([route.id, [...roadIds]]);
  }
  assert.deepEqual(crossings, []);
  const kp = worlds.get(arch.KOWLOON_PARK); assert.equal(kp.stats.kowloonParkPathCrossings, 0); assert.equal(kp.stats.kowloonParkRouteCrossings, 0);
  assert.match(kp.stats.kowloonParkCrossingEvidence, /avoid unnamed internal service-road segment 40570/); assert.match(kp.stats.kowloonParkCrossingEvidence, /no unverified crossing/);
});

test('path centres avoid buildings, water and active sports surfaces', () => {
  const blocked = new Set(['heritage', 'conservatory', 'vantage', 'playground', 'soccer', 'tennis', 'basketball', 'bowls', 'roller', 'handball', 'tableTennis', 'centreCourt', 'poolBuilding', 'sportsCentre', 'poolComplex', 'olympic', 'bandstand', 'centralLawn', 'artificialLake', 'birdLake', 'modelBoatPool', 'fountain', 'sculpturePool', 'pavilion', 'monument', 'maze', 'garden']);
  for (const park of arch.MAJOR_PARKS) for (const route of park.paths) for (const [x, z] of routeSamples(route, 2)) {
    for (const feature of park.features) if (blocked.has(feature.kind)) assert.ok(!inside(feature.ring, x, z), `${route.id} enters ${feature.name}`);
  }
});

test('ground queries preserve roads, use traceable DTM outside pads and match water / path datums', () => {
  for (const park of arch.MAJOR_PARKS) {
    let plain = null;
    for (let x = park.bounds.minX + 3; x < park.bounds.maxX && !plain; x += 7) for (let z = park.bounds.minZ + 3; z < park.bounds.maxZ; z += 7) {
      if (!inside(park.ring, x, z) || arch.majorParkRoadAt(park, x, z) || arch.majorParkPathAt(park, x, z)) continue;
      if (park.features.some((feature) => inside(feature.ring, x, z))) continue;
      plain = [x, z]; break;
    }
    assert.ok(plain, `no plain DTM sample in ${park.name}`);
    assert.equal(arch.majorParkGroundHeightAt(park, ...plain, 0), terrain.hongKongTerrainHeight(...plain) + arch.MAJOR_PARK_BASE_OFFSET);
    const road = park.roads[0], segment = road.segments[0], x = (segment[0] + segment[2]) * .5, z = (segment[1] + segment[3]) * .5;
    if (inside(park.ring, x, z)) assert.equal(arch.majorParkGroundHeightAt(park, x, z, 123), 123);
  }
  const pool = arch.VICTORIA_MODEL_BOAT_POOL;
  const waterPoint = arch.majorParkLocalToWorld(pool.site, 8, -3);
  assert.ok(inside(pool.ring, waterPoint.x, waterPoint.z));
  assert.equal(arch.majorParkGroundHeightAt(arch.VICTORIA_PARK, waterPoint.x, waterPoint.z, 0), arch.majorParkPadHeight(pool) - .5);
  assert.equal(arch.MAJOR_PARK_BASE_OFFSET, .055); assert.equal(arch.MAJOR_PARK_PATH_OFFSET, .09);
});

test('tree candidates are deterministic and keep clear of roads and walking corridors', () => {
  for (const park of arch.MAJOR_PARKS) {
    const first = arch.createMajorParkTreeSites(park, 40), second = arch.createMajorParkTreeSites(park, 40);
    assert.deepEqual(first, second); assert.ok(first.length > 10);
    for (const tree of first) {
      assert.ok(inside(park.ring, tree.x, tree.z)); assert.ok(!arch.majorParkRoadAt(park, tree.x, tree.z, 1.4));
      assert.ok(!arch.majorParkPathAt(park, tree.x, tree.z, 2.2)); assert.ok(Number.isFinite(tree.y));
    }
  }
});

test('one shared instanced tree field accepts authored sites and updates camera LOD', () => {
  assert.ok(treeField.stats.trees > 150, `accepted ${treeField.stats.trees} trees`); assert.equal(treeField.sites.size, treeField.stats.trees);
  for (const park of arch.MAJOR_PARKS) assert.ok([...treeField.sites].filter((site) => inside(park.ring, site.x, site.z)).length > 20, `${park.name} has no authored tree field`);
  const changed = treeField.update(new THREE.Vector3(arch.HONG_KONG_PARK.site.x, 12, arch.HONG_KONG_PARK.site.z));
  assert.equal(typeof changed, 'boolean');
  assert.ok(treeField.meshes.some((mesh) => mesh.visible && mesh.count > 0));
  treeField.update(new THREE.Vector3(arch.VICTORIA_PARK.site.x, 12, arch.VICTORIA_PARK.site.z));
  assert.ok(treeField.meshes.every((mesh) => mesh.count <= mesh.instanceMatrix.count));
});

test('all three authored world geometries are finite and neither base nor path meshes cover carriageways', () => {
  for (const [park, world] of worlds) {
    let meshes = 0;
    world.root.traverse((object) => {
      if (!object.isMesh) return; meshes++;
      const position = object.geometry?.attributes?.position; assert.ok(position, object.name);
      for (const value of position.array) assert.ok(Number.isFinite(value), `${object.name} has non-finite geometry`);
      if (/walking ribbons|road-cleared DTM ground/.test(object.name)) for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), z = position.getZ(i);
        assert.ok(!arch.majorParkRoadAt(park, x, z, 0), `${object.name} covers a carriageway`);
        if (/walking ribbons/.test(object.name)) {
          assert.ok(inside(park.ring, x, z), `${object.name} ribbon edge leaves exact site`);
          const expected = arch.majorParkGroundHeightAt(park, x, z, terrain.hongKongTerrainHeight(x, z) + arch.MAJOR_PARK_BASE_OFFSET);
          assert.ok(Math.abs(position.getY(i) - expected) < 1e-4, `${object.name} visual / query datum mismatch`);
        }
      }
    });
    for (const collider of world.colliders) if (collider.obb) {
      assert.ok(!arch.majorParkRoadAt(park, collider.obb.cx, collider.obb.cz, 0), `${park.name} collider occupies a carriageway`);
    }
    assert.ok(meshes >= 50); assert.ok(world.colliders.length > 100); assert.ok(world.treeSites.length > 100);
  }
});

test('every entrance is free of solid authored colliders at person height', () => {
  for (const [park, world] of worlds) for (const entry of park.entrances) {
    const y = arch.majorParkGroundHeightAt(park, entry.x, entry.z, 0) + 1.7;
    assert.equal(world.colliders.filter((collider) => pointInObb(collider, entry.x, entry.z, y)).length, 0, entry.id);
  }
});

test('recognisable facilities, courts and official dimensions are present in each authored world', () => {
  const hk = worlds.get(arch.HONG_KONG_PARK).stats, kp = worlds.get(arch.KOWLOON_PARK).stats, vp = worlds.get(arch.VICTORIA_PARK).stats;
  assert.equal(hk.hongKongParkAviaryArches, 4); assert.equal(hk.hongKongParkVantageSteps, 105); assert.equal(hk.hongKongParkVantageHeight, 30);
  assert.equal(hk.hongKongParkConservatoryHouses, 3); assert.equal(hk.hongKongParkOlympicOfficialCapacity, 880); assert.ok(Math.abs(hk.hongKongParkArtificialLakeArea - 2200) < 1e-6);
  assert.equal(kp.kowloonParkPavilionColumns, 8); assert.ok(kp.kowloonParkMazeHedgeColliders >= 20); assert.ok(kp.kowloonParkBirdLakeArea > 1500);
  assert.equal(vp.victoriaParkSportsCourts, 30); assert.equal(vp.victoriaParkTennisCourts, 13); assert.ok(Math.abs(vp.victoriaParkModelBoatPoolArea - 954) < 1e-6); assert.equal(vp.victoriaParkModelBoatPoolDepth, .5);
  for (const id of [1583, 1586, 1589, 20408, 8033, 2136, 7757, 13119]) assert.ok(arch.VICTORIA_PARK.roads.some((road) => road.id === id), `missing preserved road ${id}`);
});

test('final street-light table has no authored park feature or path conflicts', () => {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed), conflicts = [];
  for (let index = 0; index < lamps.length; index++) {
    if (suppressed.has(index)) continue;
    const row = overrides.get(index), x = lamps[index][0] + (row?.[1] || 0) / 100, z = lamps[index][1] + (row?.[2] || 0) / 100;
    if (arch.majorParkLampConflictAt(x, z)) conflicts.push(index);
  }
  assert.deepEqual(conflicts, []);
});

test('world, ground, colliders, teleports, map data and per-frame tree LOD are integrated', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  const meta = fs.readFileSync(path.join(root, 'js/cities/hongkong/meta.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  const map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8');
  for (const name of ['buildHongKongPark', 'buildKowloonPark', 'buildVictoriaPark']) assert.match(simple, new RegExp(name));
  for (const name of ['hongKongPark', 'kowloonPark', 'victoriaPark']) {
    assert.match(simple, new RegExp(`${name}\\.groundHeightAt`)); assert.match(simple, new RegExp(`\\.\\.\\.${name}\\.colliders`)); assert.match(index, new RegExp(`${name}: world\\.${name}`));
  }
  assert.match(simple, /majorParkTrees\.update\(context\.cameraSystem\.currentPos\)/);
  assert.match(map, /landmark\.labelHeight !== false/);
  for (const name of ['HONG_KONG_PARK', 'KOWLOON_PARK', 'VICTORIA_PARK']) assert.match(meta, new RegExp(`majorParkArrivalPoints\\(${name}\\)`));
});

test('park rendering stays asset-free and labels photo direction / unverified facades honestly', () => {
  for (const file of ['major-parks-world-utils.js', 'hong-kong-park-world.js', 'kowloon-park-world.js', 'victoria-park-world.js']) {
    const source = fs.readFileSync(path.join(root, 'js/cities/hongkong', file), 'utf8');
    assert.doesNotMatch(source, /TextureLoader|image-search|\.jpg|\.png/);
  }
  const vp = fs.readFileSync(path.join(root, 'js/cities/hongkong/victoria-park-world.js'), 'utf8');
  assert.match(vp, /detailed current exterior not verified/); assert.match(vp, /photo-directed scene outline/);
  const kp = fs.readFileSync(path.join(root, 'js/cities/hongkong/kowloon-park-world.js'), 'utf8');
  assert.match(kp, /not a measured sculpture replica/); assert.match(kp, /no unverified crossing/);
});

test('Victoria football goals and tennis nets align with the short ends and short axis of each court', () => {
  const world = worlds.get(arch.VICTORIA_PARK);
  for (const feature of arch.VICTORIA_PARK.features.filter((f) => f.kind === 'soccer' || f.kind === 'tennis')) {
    const court = world.root.getObjectByName(`${feature.name} aligned court markings and equipment`);
    assert.ok(court, feature.name);
    const alongZ = feature.site.d >= feature.site.w;
    assert.equal(court.rotation.y, alongZ ? 0 : Math.PI / 2, feature.name);
    const lines = court.getObjectByName(`${feature.name} painted lines`);
    assert.ok(lines, feature.name); lines.geometry.computeBoundingBox();
    const b = lines.geometry.boundingBox;
    assert.ok(b.max.z - b.min.z > b.max.x - b.min.x, `${feature.name}: long axis must be z before rotation`);
    if (feature.kind === 'soccer') {
      const goals = court.getObjectByName(`${feature.name} goals and sports equipment`);
      assert.ok(goals); goals.geometry.computeBoundingBox();
      const gb = goals.geometry.boundingBox;
      assert.ok(gb.max.z > (b.max.z - b.min.z) * .45 && gb.min.z < -(b.max.z - b.min.z) * .45);
    } else {
      const net = court.getObjectByName(`${feature.name} net`);
      assert.ok(net); net.geometry.computeBoundingBox();
      assert.ok(net.geometry.boundingBox.max.x - net.geometry.boundingBox.min.x > net.geometry.boundingBox.max.z - net.geometry.boundingBox.min.z);
    }
  }
});

test('Victoria pool and playing surfaces use dedicated non-white textured materials', () => {
  const root = worlds.get(arch.VICTORIA_PARK).root;
  const pool = root.getObjectByName('Victoria Park Swimming Pool exact OSM building mass and DTM foundation');
  const roof = root.getObjectByName('Victoria Park Swimming Pool shaded flat roof');
  assert.ok(pool.material.colorNode); assert.ok(roof.material.colorNode);
  assert.notEqual(pool.material.color.getHex(), 0xffffff);
  assert.ok(root.getObjectByName('Victoria Park Swimming Pool facade panel joints'));
  for (const feature of arch.VICTORIA_PARK.features.filter(f => f.kind === 'soccer' || f.kind === 'tennis')) {
    const surface = root.getObjectByName(`${feature.name} exact OSM ${feature.kind} surface`);
    assert.ok(surface && surface.material.colorNode, feature.name);
  }
});

test('Victoria pool roof does not cover court sample points', () => {
  const root = worlds.get(arch.VICTORIA_PARK).root;
  root.updateMatrixWorld(true);
  const roof = root.getObjectByName('Victoria Park Swimming Pool shaded flat roof');
  for (const f of arch.VICTORIA_PARK.features.filter(f => f.kind === 'soccer' || f.kind === 'tennis' || f.kind === 'centreCourt')) {
    for (const [x, z] of [[-2, 3], [2, 3], [-2, -3], [2, -3]]) {
      const p = arch.majorParkLocalToWorld(f.site, x, z);
      const ray = new THREE.Raycaster(new THREE.Vector3(p.x, 500, p.z), new THREE.Vector3(0, -1, 0));
      assert.equal(ray.intersectObject(roof).length, 0, f.name);
    }
  }
});

test('Kowloon Park Sports Centre has visible perimeter glazing rather than only an unbroken white shell', () => {
  const root = worlds.get(arch.KOWLOON_PARK).root;
  const wall = root.getObjectByName('Kowloon Park Sports Centre exact OSM hall walls and DTM foundation');
  const glass = root.getObjectByName('Kowloon Park Sports Centre visible perimeter glazing');
  const joints = root.getObjectByName('Kowloon Park Sports Centre perimeter window joints');
  assert.ok(wall && glass && joints);
  assert.notEqual(wall.material.color.getHex(), 0xffffff);
  assert.ok(glass.geometry.getAttribute('position').count > 0);
});

test('Victoria Park central lawn has an explicit green material, not the default white mesh', () => {
  const lawn = worlds.get(arch.VICTORIA_PARK).root.getObjectByName('Victoria Park Central Lawn exact OSM grass terrace');
  assert.ok(lawn?.material);
  const color = lawn.material.color;
  assert.ok(color.g > color.r && color.g > color.b, `lawn colour ${color.getHexString()}`);
  assert.notEqual(color.getHex(), 0xffffff);
});

test('park ring surfaces reject missing materials instead of silently rendering white', async () => {
  const { majorParkRingSurface } = await import('../js/cities/hongkong/major-parks-world-utils.js');
  assert.throws(() => majorParkRingSurface(arch.VICTORIA_PARK.features[0], undefined, 'test surface', new THREE.Group()), /Missing material for test surface/);
});

test('Victoria Park contains no uncoloured default-white solid surfaces', () => {
  const found = [];
  worlds.get(arch.VICTORIA_PARK).root.traverse((object) => {
    if (!object.isMesh) return;
    for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
      if (material?.color?.getHex() === 0xffffff && !material.vertexColors && !material.map && !material.colorNode) found.push(object.name);
    }
  });
  assert.deepEqual(found, []);
});

test('tennis markings include singles alleys and correctly bounded service boxes, without a false net line', async () => {
  const { majorParkTennisLineRects } = await import('../js/cities/hongkong/major-parks-world-utils.js');
  const lines = majorParkTennisLineRects(10.97, 23.77);
  const close = (a, b) => Math.abs(a-b) < 1e-8;
  assert.equal(lines.length, 11);
  for (const side of [-1, 1]) {
    assert.ok(lines.some(([x,z,w,d]) => close(x,side*8.23/2) && close(z,0) && close(d,23.77)));
    assert.ok(lines.some(([x,z,w,d]) => close(x,0) && close(z,side*6.4) && close(w,8.23)));
  }
  assert.ok(lines.some(([x,z,w,d]) => x === 0 && z === 0 && close(w,.05) && close(d,12.8)));
  assert.ok(!lines.some(([x,z,w,d]) => z === 0 && w > 8 && d < .2), 'net is not a painted transverse line');
  const centre = worlds.get(arch.VICTORIA_PARK).root.getObjectByName('Victoria Park Centre Court painted tennis lines');
  centre.geometry.computeBoundingBox();
  const b = centre.geometry.boundingBox;
  assert.ok(Math.abs((b.max.x-b.min.x)-11.02) < .01);
  assert.ok(Math.abs((b.max.z-b.min.z)-23.82) < .01);
});

test('Victoria model boat pool approximate location stays within park, away from roads and other hard facilities', () => {
  const park = arch.VICTORIA_PARK, pool = arch.VICTORIA_MODEL_BOAT_POOL;
  // The published POI positions are not surveys of the outline or centre.
  assert.ok(Math.hypot(pool.site.x - 2833.856, pool.site.z + 46.398) < .01);
  assert.ok(!inside(pool.ring, 2890, -135), 'obsolete approximate position must not remain water');
  const hard = new Set(['bandstand', 'soccer', 'tennis', 'basketball', 'bowls', 'roller', 'handball', 'tableTennis', 'centreCourt', 'poolBuilding', 'sportsCentre', 'playground', 'centralLawn', 'monument']);
  for (let x = pool.bounds.minX; x <= pool.bounds.maxX; x += 1) for (let z = pool.bounds.minZ; z <= pool.bounds.maxZ; z += 1) {
    if (!inside(pool.ring, x, z)) continue;
    assert.ok(inside(park.ring, x, z));
    assert.ok(!arch.majorParkRoadAt(park, x, z, .5), `road near pool ${x},${z}`);
    for (const other of park.features) if (hard.has(other.kind)) assert.ok(!inside(other.ring, x, z), `${other.name} overlaps pool`);
  }
});

test('model boat pool has dedicated water and bounded day/night path lighting', async () => {
  const world = worlds.get(arch.VICTORIA_PARK);
  const water = world.root.getObjectByName(`${arch.VICTORIA_MODEL_BOAT_POOL.name} water surface`);
  assert.ok(water?.material.colorNode, 'water should have a dedicated procedural tint');
  assert.ok(world.root.getObjectByName('Victoria Park Model Boat Pool model launch cabin'));
  assert.ok(world.root.getObjectByName('Victoria Park Model Boat Pool model sail'));
  const lights = [];
  world.root.traverse(o => { if (o.name === 'Victoria model boat pool nearby path lantern light') lights.push(o); });
  assert.equal(lights.length, 2);
  const {cityUniforms} = await import('../js/tsl-materials.js');
  const old = cityUniforms.uInteriorGlow.value;
  try {
    cityUniforms.uInteriorGlow.value = 0; world.update();
    for (const light of lights) assert.equal(light.intensity, 0);
    cityUniforms.uInteriorGlow.value = 1.4; world.update();
    for (const light of lights) { assert.equal(light.intensity, 24); assert.ok(!arch.majorParkRoadAt(arch.VICTORIA_PARK, light.position.x, light.position.z, .35)); }
  } finally { cityUniforms.uInteriorGlow.value = old; world.update(); }
});


test('boat pool provisional finger is dry, paved, connected and avoids roads', () => {
  const park = arch.VICTORIA_PARK, pool = arch.VICTORIA_MODEL_BOAT_POOL, ring = pool.fingerRing;
  const world = worlds.get(park); assert.ok(world.root.getObjectByName('Victoria Model Boat Pool provisional paved dividing finger'));
  let samples = 0;
  for (let x = pool.bounds.minX; x <= pool.bounds.maxX; x += .75) for (let z = pool.bounds.minZ; z <= pool.bounds.maxZ; z += .75) {
    if (!inside(ring, x, z)) continue;
    samples++;
    assert.ok(!inside(pool.ring, x, z), 'finger intersects water');
    assert.ok(inside(park.ring, x, z));
    assert.ok(!arch.majorParkRoadAt(park, x, z, .5));
    assert.equal(arch.majorParkGroundHeightAt(park, x, z, 0), arch.majorParkPadHeight(pool, .03) + .14);
    assert.ok(arch.majorParkFurnitureConflictAt(park, x, z));
  }
  assert.ok(samples > 40);
  assert.ok(Math.abs(pool.area - 954) < 1e-6);
});

test('boat-pool finger grade joins DTM and avoids roads and other facilities at sampled points', () => {
  const park = arch.VICTORIA_PARK, pool = arch.VICTORIA_MODEL_BOAT_POOL, r = arch.VICTORIA_BOAT_RAMP;
  const fingerY = arch.majorParkPadHeight(pool, .03) + .14;
  const width = r.halfFinger + r.sideBlend;
  for (let u = -width; u <= width + 1e-6; u += .25) for (let v = 0; v <= r.length + 1e-6; v += .25) {
    const p = arch.victoriaBoatRampPoint(u, v), height = arch.victoriaBoatRampHeight(p.x, p.z);
    assert.ok(height !== null && Number.isFinite(height));
    assert.ok(inside(park.ring, p.x, p.z));
    assert.ok(!arch.majorParkRoadAt(park, p.x, p.z, .5));
    for (const f of park.features) if (f !== pool && f.kind !== 'woods') assert.ok(!inside(f.ring, p.x, p.z), `${f.name} intersects grade`);
    assert.ok(Math.abs(arch.majorParkGroundHeightAt(park, p.x, p.z, 0) - height) < 1e-5);
    if (v === r.length) assert.ok(Math.abs(height - terrain.hongKongTerrainHeight(p.x, p.z) - arch.MAJOR_PARK_BASE_OFFSET) < 1e-6);
    if (v === 0 && Math.abs(u) < r.halfFinger) assert.ok(Math.abs(height - fingerY) < 1e-6);
  }
  const mesh = worlds.get(park).root.getObjectByName('Victoria Model Boat Pool DTM transition to finger');
  const positions = mesh.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const h = arch.victoriaBoatRampHeight(positions.getX(i), positions.getZ(i));
    assert.ok(h !== null && Math.abs(positions.getY(i) - h - .008) < .001);
  }
});

test('Victoria monument approximate Wikipedia location remains on park land and clear of roads', () => {
  const park = arch.VICTORIA_PARK, f = arch.VICTORIA_QUEEN_STATUE;
  assert.ok(Math.hypot(f.site.x - 3065.734, f.site.z - 86.926) < .02);
  for (let x=f.bounds.minX; x<=f.bounds.maxX; x+=.5) for (let z=f.bounds.minZ; z<=f.bounds.maxZ; z+=.5) {
    if (!inside(f.ring,x,z)) continue;
    assert.ok(inside(park.ring,x,z)); assert.ok(!arch.majorParkRoadAt(park,x,z,.5));
    for (const other of park.features) if (other!==f && other.kind!=='woods') assert.ok(!inside(other.ring,x,z), other.name);
  }
});

test('Victoria custom shader materials use node-material types instead of leaking lamp emission', () => {
  const root = worlds.get(arch.VICTORIA_PARK).root;
  const lamps = root.getObjectByName('Victoria Park warm path lantern globes');
  assert.ok(lamps?.material.isNodeMaterial && lamps.material.emissiveNode);
  const water = root.getObjectByName(`${arch.VICTORIA_MODEL_BOAT_POOL.name} water surface`);
  assert.ok(water?.material.isNodeMaterial && water.material.colorNode);
  for (const f of arch.VICTORIA_PARK.features.filter(f => ['soccer','tennis'].includes(f.kind))) {
    const court = root.getObjectByName(`${f.name} exact OSM ${f.kind} surface`);
    assert.ok(court?.material.isNodeMaterial && court.material.colorNode, f.name);
  }
});


test('Victoria monument pedestal follows the provisional tall granite block and does not claim the figure is finished', () => {
  const root = worlds.get(arch.VICTORIA_PARK).root;
  const pedestal = root.getObjectByName('Queen Victoria monument provisional granite pedestal');
  const joints = root.getObjectByName('Queen Victoria pedestal fine stone joints');
  const figure = root.getObjectByName('Queen Victoria crude placeholder figure — sculpture not yet reconstructed');
  assert.ok(pedestal && joints && figure);
  pedestal.geometry.computeBoundingBox(); figure.geometry.computeBoundingBox();
  const bounds=pedestal.geometry.boundingBox;
  assert.ok(Math.abs(bounds.max.y-2.12)<.001 && Math.abs(bounds.min.y)<.001);
  assert.ok(bounds.max.x-bounds.min.x<3.2 && bounds.max.z-bounds.min.z<3);
  assert.ok(figure.geometry.boundingBox.min.y>=bounds.max.y-.001);
  assert.ok(pedestal.material.color.getHex()!==0xffffff && figure.material.color.getHex()!==0x41675b);
});
