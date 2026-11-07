const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let ch, terrain, roads, lamps, clearance, siteUtils;
test.before(async () => {
  ch = await import('../js/cities/hongkong/city-hall-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  siteUtils = await import('../js/cities/hongkong/landmark-site.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
});
function inside(ring, x, z) { return siteUtils.pointInFlatRing(ring, x, z); }
function pointSegment(x, z, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz, t = l ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l)) : 0; return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); }
function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function intersects(a, b, c, d) { const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1], denominator = cross(rx, rz, sx, sz); if (Math.abs(denominator) < 1e-9) return false; const qx = c[0] - a[0], qz = c[1] - a[1], t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator; return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9; }
function segmentDistance(a, b, c, d) { return intersects(a, b, c, d) ? 0 : Math.min(pointSegment(...a, c, d), pointSegment(...b, c, d), pointSegment(...c, a, b), pointSegment(...d, a, b)); }
function roadScan(site) {
  const centre = new Set(), corridor = new Set(), b = site.bounds;
  for (const [id, road] of roads.entries()) {
    const flat = road[5], margin = road[1] * .5 + .35;
    for (let i = 2; i < flat.length; i += 2) {
      const a = [flat[i - 2], flat[i - 1]], c = [flat[i], flat[i + 1]];
      if (Math.max(a[0], c[0]) < b.minX - margin || Math.min(a[0], c[0]) > b.maxX + margin || Math.max(a[1], c[1]) < b.minZ - margin || Math.min(a[1], c[1]) > b.maxZ + margin) continue;
      let hit = inside(site.ring, ...a) || inside(site.ring, ...c), distance = hit ? 0 : Infinity;
      for (let j = 2; j < site.ring.length; j += 2) {
        const d = [site.ring[j - 2], site.ring[j - 1]], e = [site.ring[j], site.ring[j + 1]];
        if (intersects(a, c, d, e)) hit = true;
        distance = Math.min(distance, segmentDistance(a, c, d, e));
      }
      if (hit) centre.add(id);
      if (distance < margin) corridor.add(id);
    }
  }
  return { centre: [...centre], corridor: [...corridor] };
}
function clearedLampPositions() {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed), result = [];
  for (let index = 0; index < lamps.length; index++) {
    if (suppressed.has(index)) continue;
    const lamp = lamps[index], override = overrides.get(index);
    result.push({ index, x: lamp[0] + (override?.[1] || 0) / 100, z: lamp[1] + (override?.[2] || 0) / 100 });
  }
  return result;
}

test('City Hall preserves the five distinct current OSM source rings and tags', () => {
  assert.equal(ch.CITY_HALL_HIGH_SITE.osmId, 25608273);
  assert.equal(ch.CITY_HALL_LOW_SITE.osmId, 101959153);
  assert.equal(ch.CITY_HALL_SITE.osmId, 101959040);
  assert.equal(ch.CITY_HALL_MEMORIAL_GARDEN_SITE.osmId, 46870356);
  assert.equal(ch.CITY_HALL_ANNEX_SITE.osmId, 101959243);
  assert.equal(ch.CITY_HALL_HIGH_SITE.source.version, 16);
  assert.equal(ch.CITY_HALL_LOW_SITE.source.version, 8);
  assert.equal(ch.CITY_HALL_HIGH_SITE.source.tags.height, '57.7');
  assert.equal(ch.CITY_HALL_LOW_SITE.source.tags['building:levels'], '3');
  assert.equal(ch.CITY_HALL_HIGH_SITE.ring.length / 2 - 1, 12);
  assert.equal(ch.CITY_HALL_LOW_SITE.ring.length / 2 - 1, 19);
  assert.equal(ch.CITY_HALL_SITE.ring.length / 2 - 1, 31);
  assert.equal(ch.CITY_HALL_MEMORIAL_GARDEN_SITE.ring.length / 2 - 1, 13);
  assert.ok(Math.abs(ch.CITY_HALL_HIGH_SITE.ringArea - 712.2986100404) < .0001);
  assert.ok(Math.abs(ch.CITY_HALL_LOW_SITE.ringArea - 4291.5893226611) < .0001);
  assert.ok(Math.abs(ch.CITY_HALL_SITE.ringArea - 13672.176) < .001);
  assert.notEqual(ch.CITY_HALL_HIGH_SITE.ringArea, ch.CITY_HALL_SITE.ringArea);
});

test('official civic facts and photo-directed controls remain separate', () => {
  assert.equal(ch.CITY_HALL_OPENING_DATE, '1962-03-02');
  assert.equal(ch.CITY_HALL_DECLARED_MONUMENT_YEAR, 2022);
  assert.equal(ch.CITY_HALL_HIGH_HEIGHT, 57.7);
  assert.equal(ch.CITY_HALL_LOW_HEIGHT, 21.9);
  assert.equal(ch.CITY_HALL_MEMORIAL_SHRINE_SIDES, 12);
  assert.ok(ch.CITY_HALL_RESEARCH_SOURCES.some((s) => /amo\.gov\.hk/.test(s.url) && /covered walkways/.test(s.evidence)));
  assert.ok(ch.CITY_HALL_RESEARCH_SOURCES.some((s) => /legco\.gov\.hk/.test(s.url) && /diamond windows/.test(s.evidence)));
  assert.match(ch.CITY_HALL_SHRINE_SITE.evidence, /Photo-directed/);
  assert.match(ch.CITY_HALL_ANNEX_SITE.evidence, /visual estimates/);
});

test('building footprints keep clear of roads while the overall site retains its service-road audit', () => {
  for (const site of ch.CITY_HALL_BUILDING_SITES) assert.deepEqual(roadScan(site), { centre: [], corridor: [] });
  assert.deepEqual(roadScan(ch.CITY_HALL_MEMORIAL_GARDEN_SITE).centre, []);
  assert.deepEqual(roadScan(ch.CITY_HALL_SITE).centre, [38490, 39207, 43721, 43722, 43723, 43724, 43725, 43726, 43727, 43728, 43729, 43730, 43731, 43732, 43733, 43734, 50059]);
  assert.equal(ch.cityHallRoadRecords(ch.CITY_HALL_SITE).length, 18);
  assert.deepEqual(ch.CITY_HALL_SITE_ROAD_IDS.length, 18);
});

test('real OSM entrance vertices drive the door locations and collider openings', () => {
  assert.equal(ch.CITY_HALL_HIGH_MAIN_ENTRANCE.sourceEdge, 11);
  assert.equal(ch.CITY_HALL_HIGH_SECOND_ENTRANCE.sourceEdge, 3);
  assert.equal(ch.CITY_HALL_LOW_MAIN_ENTRANCE.sourceEdge, 4);
  assert.equal(ch.CITY_HALL_LOW_SECOND_ENTRANCE.sourceEdge, 2);
  assert.equal(ch.CITY_HALL_HIGH_GARDEN_LINK.sourceEdge, 6);
  assert.equal(ch.CITY_HALL_LOW_GARDEN_LINK.sourceEdge, 17);
  assert.match(ch.CITY_HALL_HIGH_GARDEN_LINK.evidence, /no OSM entrance node is claimed/);
  for (const [site, entrance, node] of [
    [ch.CITY_HALL_HIGH_SITE, ch.CITY_HALL_HIGH_MAIN_ENTRANCE, 11774406410],
    [ch.CITY_HALL_HIGH_SITE, ch.CITY_HALL_HIGH_SECOND_ENTRANCE, 11774406411],
    [ch.CITY_HALL_LOW_SITE, ch.CITY_HALL_LOW_MAIN_ENTRANCE, 11774418675],
    [ch.CITY_HALL_LOW_SITE, ch.CITY_HALL_LOW_SECOND_ENTRANCE, 11774406423]
  ]) {
    const index = site.source.geometry.findIndex((p) => p.id === node);
    assert.ok(index >= 0);
    assert.ok(Math.hypot(entrance.localX - site.localRing[index * 2], entrance.localZ - site.localRing[index * 2 + 1]) < 1e-9);
  }
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/city-hall-world.js'), 'utf8');
  assert.match(world, /chainUFromLocal\(frame, CITY_HALL_HIGH_MAIN_ENTRANCE\.localX/);
  assert.match(world, /CITY_HALL_HIGH_SECOND_ENTRANCE\.localX/);
  assert.match(world, /chainUFromLocal\(frame, CITY_HALL_LOW_MAIN_ENTRANCE\.localX/);
  assert.match(world, /CITY_HALL_LOW_SECOND_ENTRANCE\.localX/);
  assert.doesNotMatch(world, /u \+ 1\.8|u \+ 2\.2/);
});

test('City Hall ground is DTM-derived, road-priority and local', () => {
  const pad = terrain.cityHallPadHeight();
  assert.ok(Number.isFinite(pad));
  assert.equal(terrain.HONG_KONG_TERRAIN_META.cityHallPadHeight, pad);
  assert.equal(terrain.hongKongTerrainHeight(ch.CITY_HALL_HIGH_SITE.x, ch.CITY_HALL_HIGH_SITE.z), pad);
  const road = roads[38490][5];
  const x = road[0], z = road[1];
  if (inside(ch.CITY_HALL_SITE.ring, x, z)) assert.equal(ch.cityHallTerrainHeightAt(x, z, 0, pad), 0);
  const outsideX = ch.CITY_HALL_SITE.x + 260, outsideZ = ch.CITY_HALL_SITE.z + 180;
  assert.equal(terrain.hongKongTerrainHeight(outsideX, outsideZ), terrain.rawHongKongTerrainHeight(outsideX, outsideZ));
});

test('Memorial Garden shrine, source-site reservation and cleared lamps do not collide', () => {
  assert.equal(ch.CITY_HALL_SHRINE_SITE.localRing.length / 2 - 1, 12);
  assert.ok(inside(ch.CITY_HALL_MEMORIAL_GARDEN_SITE.ring, ch.CITY_HALL_SHRINE_WORLD.x, ch.CITY_HALL_SHRINE_WORLD.z));
  assert.ok(ch.cityHallGenericLotConflict({ x: ch.CITY_HALL_HIGH_SITE.x, z: ch.CITY_HALL_HIGH_SITE.z, w: 8, d: 8, ry: 0 }));
  assert.ok(!ch.cityHallGenericLotConflict({ x: ch.CITY_HALL_SITE.x + 500, z: ch.CITY_HALL_SITE.z, w: 8, d: 8, ry: 0 }));
  for (const lamp of clearedLampPositions()) assert.equal(ch.cityHallLampConflictAt(lamp.x, lamp.z), false, `lamp ${lamp.index}`);
});

test('City Hall world authors the civic elevations, garden, links and source entrances without photo textures', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/city-hall-world.js'), 'utf8');
  for (const pattern of [/exact L-shaped OSM way 101959153/, /white concrete window-grid fins/, /west-facing diamond window/, /HK-B0082/, /HK-B0100/, /granite diamond-window surround/, /deep horizontal sunshades/, /twelve-sided/, /covered high–low-block walkway roofs/, /second OSM entrance-node/, /granite/, /external stair/]) assert.match(world, pattern);
  assert.doesNotMatch(world, /image-search|\.jpg|\.png|TextureLoader|https?:\/\//i);
});

test('City Hall is integrated into simple world, legacy generic suppression, map, debug reference and clearance generator', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  const legacy = fs.readFileSync(path.join(root, 'js/cities/hongkong/world.js'), 'utf8');
  const map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  const clearanceBuilder = fs.readFileSync(path.join(root, 'tools/cities/hongkong/build-street-light-clearance.mjs'), 'utf8');
  const inventory = fs.readFileSync(path.join(root, 'docs/hongkong-building-inventory.md'), 'utf8');
  const landmarks = fs.readFileSync(path.join(root, 'docs/hongkong-landmarks.md'), 'utf8');
  assert.match(simple, /buildCityHall\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.cityHallPadHeight \}\)/);
  assert.match(simple, /cityHall\.groundHeightAt/); assert.match(simple, /\.\.\.cityHall\.stats/); assert.match(simple, /\.\.\.cityHall\.colliders/);
  assert.match(legacy, /cityHallGenericLotConflict/); assert.match(map, /cityHallMapSite/); assert.match(map, /CITY_HALL_SITE\.ring/);
  assert.match(index, /cityHall: world\.cityHall/); assert.match(clearanceBuilder, /cityHallLampConflictAt/);
  assert.match(inventory, /`HK-CENTRAL-CH`/); assert.match(landmarks, /香港大會堂 Hong Kong City Hall `HK-CENTRAL-CH`/);
});

test('Node City Hall geometry is finite and has authored massing, entrances and colliders', async () => {
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, fillText() {}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }) }) };
  const THREE = await import('three/webgpu');
  const { buildCityHall } = await import('../js/cities/hongkong/city-hall-world.js');
  const { colliderContains } = await import('../js/cities/hongkong/colliders.js');
  const scene = new THREE.Scene(), world = buildCityHall(scene, { groundOffset: 5 });
  let meshes = 0, nonFinite = 0;
  scene.traverse((object) => {
    if (!object.isMesh) return;
    meshes++;
    const positions = object.geometry.getAttribute('position');
    if (positions) for (const value of positions.array) if (!Number.isFinite(value)) nonFinite++;
  });
  assert.equal(nonFinite, 0); assert.ok(meshes >= 50); assert.equal(world.stats.cityHallNonFinite, 0);
  assert.equal(world.stats.cityHallHighRefined, true); assert.equal(world.stats.cityHallHighInventoryId, 'HK-B0082');
  assert.ok(world.stats.cityHallHighFacadeFins >= 20); assert.ok(world.stats.cityHallHighShadowJoints >= 20);
  assert.equal(world.stats.cityHallHighRoofCopingEdges, 12);
  assert.equal(world.stats.cityHallLowRefined, true); assert.equal(world.stats.cityHallLowInventoryId, 'HK-B0100');
  assert.ok(world.stats.cityHallLowDiamondSurrounds > 0); assert.equal(world.stats.cityHallLowSunshades, 9);
  assert.ok(world.stats.cityHallLowSkylightCurbs > 0);
  assert.equal(world.stats.cityHallBuildingRoadCrossings, 0); assert.equal(world.stats.cityHallCoveredWalkwayOpenSegments, 2);
  assert.equal(world.landmarks.length, 2); assert.ok(world.colliders.length >= 45);
  assert.ok(world.colliders.some((c) => c.minY >= 5 + 4.4));
  const occupied = (x, z) => world.colliders.some((c) => c.minY <= 6.5 && c.maxY >= 6.5 && colliderContains(c, x, z));
  const sampleDoor = (site, index, direction, distance) => {
    const ring = site.ring, count = ring.length / 2 - 1, i = index * 2;
    const j = (direction === 'previous' ? (index - 1 + count) % count : (index + 1) % count) * 2;
    const dx = ring[j] - ring[i], dz = ring[j + 1] - ring[i + 1], length = Math.hypot(dx, dz);
    return [ring[i] + dx / length * distance, ring[i + 1] + dz / length * distance];
  };
  // Both 3.2 m High Block doors and the 3.2 m Low Block second door are centred on source vertices:
  // both 1.55 m sides must be physically open, not merely painted over a wall collider.
  for (const direction of ['previous', 'next']) {
    assert.equal(occupied(...sampleDoor(ch.CITY_HALL_HIGH_SITE, 11, direction, 1.55)), false);
    assert.equal(occupied(...sampleDoor(ch.CITY_HALL_HIGH_SITE, 3, direction, 1.55)), false);
    assert.equal(occupied(...sampleDoor(ch.CITY_HALL_LOW_SITE, 4, direction, 1.55)), false);
    assert.equal(occupied(...sampleDoor(ch.CITY_HALL_LOW_SITE, 2, direction, 1.55)), false);
  }
  for (const link of [ch.CITY_HALL_HIGH_GARDEN_LINK, ch.CITY_HALL_LOW_GARDEN_LINK]) assert.equal(occupied(link.x, link.z), false);
  assert.ok(Math.hypot(ch.CITY_HALL_HIGH_GARDEN_LINK.x - ch.CITY_HALL_LOW_GARDEN_LINK.x, ch.CITY_HALL_HIGH_GARDEN_LINK.z - ch.CITY_HALL_LOW_GARDEN_LINK.z) > 40);
});

test('City Hall facade normals face outwards and visible windows are not buried in the shell', async () => {
  const { cityHallFacadeFrame, buildCityHall } = await import('../js/cities/hongkong/city-hall-world.js');
  const { civicFramePoint } = await import('../js/cities/hongkong/civic-world-utils.js');
  const THREE = await import('three/webgpu');
  for (const [site, chains] of [[ch.CITY_HALL_HIGH_SITE, [[1,2,3,4,5,6],[10,11],[0]]], [ch.CITY_HALL_LOW_SITE, [[3,4],[6],[16],[17]]]]) {
    for (const edges of chains) {
      const frame = cityHallFacadeFrame(site, edges);
      assert.ok(Math.sin(frame.ry)*frame.nx + Math.cos(frame.ry)*frame.nz > .99, `${site.key} ${edges}`);
    }
  }
  globalThis.document = { createElement: () => ({ width:0,height:0,getContext: () => ({fillRect(){},fillText(){},getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)})}) }) };
  const scene = new THREE.Scene(), city = buildCityHall(scene, {groundOffset: 5}); scene.updateMatrixWorld(true);
  for (const [site, object, edges, y] of [[ch.CITY_HALL_HIGH_SITE,city.highBlock.root,[10,11],8],[ch.CITY_HALL_LOW_SITE,city.lowBlock.root,[3,4],5.15]]) {
    const frame = cityHallFacadeFrame(site, edges); const bays = Math.round(frame.length / (site === ch.CITY_HALL_HIGH_SITE ? 3.6 : 4));
    const u = -frame.length/2 + frame.length/bays*.5;
    const pt = civicFramePoint(frame,u,y,2), look = civicFramePoint(frame,u,y,-1);
    const from = object.localToWorld(new THREE.Vector3(...pt)), target = object.localToWorld(new THREE.Vector3(...look));
    const hit = new THREE.Raycaster(from,target.sub(from).normalize()).intersectObject(object,true)[0];
    assert.ok(hit && /glass|panes/i.test(hit.object.name), `${site.key} first hit: ${hit?.object.name}`);
  }
  const ring=ch.CITY_HALL_SHRINE_SITE.ring; for(let i=0;i<ring.length;i+=2) assert.ok(Math.abs(Math.hypot(ring[i]-ch.CITY_HALL_SHRINE_WORLD.x,ring[i+1]-ch.CITY_HALL_SHRINE_WORLD.z)-3.048)<1e-6);
  assert.ok(scene.getObjectByName('City Hall Memorial Shrine square reflecting pool'));
});

test('City Hall source wall geometry has real door gaps matching collider openings', async () => {
  const THREE = await import('three/webgpu');
  const { buildCityHall } = await import('../js/cities/hongkong/city-hall-world.js');
  const { harbourCityEdgeOutward } = await import('../js/cities/hongkong/harbour-city-architecture.js');
  globalThis.document = { createElement: () => ({ width:0,height:0,getContext: () => ({fillRect(){},fillText(){},getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)})}) }) };
  const scene = new THREE.Scene(), city = buildCityHall(scene,{groundOffset:5}); scene.updateMatrixWorld(true);
  for (const [site, block, entrance, edge, wall] of [
    [ch.CITY_HALL_LOW_SITE,city.lowBlock.root,ch.CITY_HALL_LOW_MAIN_ENTRANCE,3,'City Hall Low Block exact source-ring walls'],
    [ch.CITY_HALL_HIGH_SITE,city.highBlock.root,ch.CITY_HALL_HIGH_MAIN_ENTRANCE,10,'City Hall High Block exact source-ring walls'],
  ]) {
    const normal = harbourCityEdgeOutward(site.localRing,edge), mesh=block.getObjectByName(wall);
    const from=block.localToWorld(new THREE.Vector3(entrance.localX+normal.nx*.6,1.5,entrance.localZ+normal.nz*.6));
    const to=block.localToWorld(new THREE.Vector3(entrance.localX-normal.nx*.6,1.5,entrance.localZ-normal.nz*.6));
    const ray = new THREE.Raycaster(from,to.clone().sub(from).normalize(),0,1.2);
    assert.equal(ray.intersectObject(mesh).length,0,`${site.key} visible shell blocks entrance`);
  }
});

test('photo-directed City Hall spiral stair and sheltered route are present without blocking roadway', async () => {
  const THREE = await import('three/webgpu');
  const {buildCityHall, cityHallFacadeFrame} = await import('../js/cities/hongkong/city-hall-world.js');
  globalThis.document = { createElement: () => ({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)})})}) };
  const scene = new THREE.Scene(), city = buildCityHall(scene,{groundOffset:5});
  const stair = scene.getObjectByName('City Hall Low Block photo-directed spiral concrete steps');
  assert.ok(stair); assert.ok(scene.getObjectByName('City Hall Low Block spiral staircase dark treads'));
  assert.ok(scene.getObjectByName('City Hall Low Block spiral staircase metal handrails'));
  assert.ok(scene.getObjectByName('City Hall Memorial Garden mature foliage'));
  assert.equal(city.stats.cityHallCoveredWalkwayOpenSegments,2);
  assert.equal(city.stats.cityHallCoveredPerimeterSegments,3);
  const frame = cityHallFacadeFrame(ch.CITY_HALL_LOW_SITE,[3,4]), entry=ch.CITY_HALL_LOW_MAIN_ENTRANCE;
  const u=(entry.localX-frame.x)*Math.cos(frame.ry)-(entry.localZ-frame.z)*Math.sin(frame.ry)+7.2;
  const cx=frame.x+Math.cos(frame.ry)*u+Math.sin(frame.ry)*4, cz=frame.z-Math.sin(frame.ry)*u+Math.cos(frame.ry)*4;
  for(let i=0;i<32;i++){const a=i*Math.PI/16,p=ch.cityHallLocalToWorld(ch.CITY_HALL_LOW_SITE,cx+2.1*Math.cos(a),cz+2.1*Math.sin(a));assert.equal(ch.cityHallPointInRoadCorridor(ch.CITY_HALL_SITE,p.x,p.z,.15),false);assert.equal(inside(ch.CITY_HALL_LOW_SITE.ring,p.x,p.z),false);}
});
