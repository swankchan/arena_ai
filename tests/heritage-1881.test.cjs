const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let heritage, terrain, elevation, siteUtils, authored, roads, lamps, clearance;
test.before(async () => {
  heritage = await import('../js/cities/hongkong/heritage-1881-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  elevation = await import('../js/cities/hongkong/road-elevation.js');
  siteUtils = await import('../js/cities/hongkong/landmark-site.js');
  authored = await import('../js/cities/hongkong/authored-landmark-site.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
});
const inside = (ring, x, z) => siteUtils.pointInFlatRing(ring, x, z);
function occupied(colliders, x, z, y) {
  return colliders.filter((c) => {
    if (y < c.minY || y > c.maxY) return false;
    const dx = x - c.obb.cx, dz = z - c.obb.cz;
    return Math.abs(dx * c.obb.cs - dz * c.obb.sn) <= c.obb.hx && Math.abs(dx * c.obb.sn + dz * c.obb.cs) <= c.obb.hz;
  });
}
function clearedLamps() {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed), result = [];
  for (let index = 0; index < lamps.length; index++) {
    if (suppressed.has(index)) continue;
    const lamp = lamps[index], override = overrides.get(index);
    result.push({ index, x: lamp[0] + (override?.[1] || 0) / 100, z: lamp[1] + (override?.[2] || 0) / 100 });
  }
  return result;
}

test('1881 sources preserve the compound, layered mall and Main Building multipolygon independently', () => {
  assert.equal(heritage.HERITAGE_1881_ID, 'HK-TST-1881');
  assert.equal(heritage.HERITAGE_1881_COMPOUND.osmId, 184553178);
  assert.equal(heritage.HERITAGE_1881_MALL.osmId, 184553177);
  assert.equal(heritage.FWD_HOUSE_1881.osmType, 'relation'); assert.equal(heritage.FWD_HOUSE_1881.osmId, 2460795);
  assert.equal(heritage.HERITAGE_1881_COMPOUND.source.geometry.length, 26);
  assert.equal(heritage.HERITAGE_1881_MALL.source.geometry.length, 54);
  assert.equal(heritage.FWD_HOUSE_1881.source.geometry.length, 26);
  assert.equal(heritage.FWD_HOUSE_1881.source.innerGeometry[0].length, 9);
  assert.ok(heritage.HERITAGE_1881_COMPOUND.ringArea > 11770);
  assert.ok(heritage.FWD_HOUSE_1881.ringArea > 2412);
});

test('AMO current three-storey evidence is distinct from the stale OSM two-level tag and height convention', () => {
  assert.equal(heritage.HERITAGE_1881_HEIGHTS.sourceHotelLevelsTag, 2);
  assert.equal(heritage.HERITAGE_1881_HEIGHTS.currentMainGalleries, 3);
  assert.equal(heritage.HERITAGE_1881_HEIGHTS.sourceMallHeight, 12);
  assert.equal(heritage.HERITAGE_1881_HEIGHTS.mainRoofDatum, 26);
  assert.match(heritage.HERITAGE_1881_RESEARCH.currentMainBuilding, /third storey/);
  assert.match(heritage.HERITAGE_1881_HEIGHTS.note, /not added to the 12 m podium/);
  assert.match(heritage.HERITAGE_1881_RESEARCH.monument, /amo\.gov\.hk/);
});

test('the photo-directed Round House and its complete curved stair remain inside the source compound', () => {
  const tower = heritage.ROUND_HOUSE_1881;
  assert.equal(tower.photoDirected, true); assert.equal(tower.role, 'signal-tower');
  for (let i = 0; i < tower.ring.length; i += 2) assert.ok(inside(heritage.HERITAGE_1881_COMPOUND.ring, tower.ring[i], tower.ring[i + 1]));
  assert.ok(!inside(heritage.FWD_HOUSE_1881.ring, tower.x, tower.z));
  const stair = heritage.ROUND_HOUSE_CURVED_STAIR;
  for (let i = 0; i <= 72; i++) for (const radius of [stair.innerRadius, stair.outerRadius]) {
    const angle = stair.startAngle + stair.sweep * i / 72;
    assert.ok(inside(heritage.HERITAGE_1881_COMPOUND.ring, stair.x + Math.cos(angle) * radius, stair.z + Math.sin(angle) * radius));
  }
  assert.equal(heritage.HERITAGE_1881_HEIGHTS.timeBallDiameter, 1.83);
});

test('1881 building rings have no retained road-centre intersections and no cleared lamp conflicts', () => {
  for (const site of [heritage.HERITAGE_1881_MALL, heritage.FWD_HOUSE_1881]) {
    const hits = [];
    for (const [id, road] of roads.entries()) for (let i = 0; i < road[5].length; i += 2) if (inside(site.ring, road[5][i], road[5][i + 1])) hits.push(id);
    assert.deepEqual(hits, []);
  }
  const finalLamps = clearedLamps();
  for (const site of [heritage.HERITAGE_1881_MALL, heritage.FWD_HOUSE_1881, heritage.ROUND_HOUSE_1881]) {
    assert.deepEqual(finalLamps.filter((lamp) => inside(site.ring, lamp.x, lamp.z)).map((lamp) => lamp.index), []);
  }
  // The only rendered compound lamp keeps its XY clearance, but its stored base must follow the authored DTM pad.
  // This regresses the stale 5.03 m base that buried the lamp 1.20 m below the 6.23 m surface after the 1881 pad landed.
  const override = clearance.overrides.find((row) => row[0] === 117133), source = lamps[117133];
  assert.ok(override); const x = source[0] + override[1] / 100, z = source[1] + override[2] / 100;
  assert.ok(inside(heritage.HERITAGE_1881_COMPOUND.ring, x, z));
  assert.ok(!inside(heritage.HERITAGE_1881_MALL.ring, x, z)); assert.ok(!inside(heritage.FWD_HOUSE_1881.ring, x, z));
  assert.equal(override[3], Math.round(elevation.surfaceRoadHeight(x, z) * 100));
});

test('the shared 1881 DTM pad is reproducible and does not claim an engineering elevation', () => {
  const pad = terrain.heritage1881PadHeight();
  assert.equal(pad, terrain.HONG_KONG_TERRAIN_META.heritage1881PadHeight);
  assert.equal(pad, authored.authoredHighestRawDatum(heritage.HERITAGE_1881_GROUND_SITES, terrain.rawHongKongTerrainHeight));
  assert.equal(terrain.hongKongTerrainHeight(heritage.HERITAGE_1881_COMPOUND.x, heritage.HERITAGE_1881_COMPOUND.z), pad);
  assert.match(heritage.HERITAGE_1881_TERRAIN_RULE.datum, /DTM-derived/);
  assert.match(heritage.HERITAGE_1881_TERRAIN_RULE.padMethod, /no engineering survey claim/);
});

test('ground follows the 36 main steps, retail terraces, inner courtyard and 72 curved Round House steps', () => {
  const pad = 6.133281901137451, stair = heritage.HERITAGE_1881_MAIN_STAIR;
  const atHotel = (x, z) => authored.authoredLocalToWorld(heritage.FWD_HOUSE_1881, x, z);
  const top = atHotel(0, stair.topZ), bottom = atHotel(0, stair.bottomZ);
  assert.equal(heritage.heritage1881GroundHeightAt(top.x, top.z, pad, pad), pad + 12);
  assert.ok(Math.abs(heritage.heritage1881GroundHeightAt(bottom.x, bottom.z, pad, pad) - (pad + 12 / 36)) < 1e-9);
  const terrace = atHotel(12, 30); assert.equal(heritage.heritage1881GroundHeightAt(terrace.x, terrace.z, pad, pad), pad + 12);
  const courtyard = atHotel(0, 0); assert.equal(heritage.heritage1881GroundHeightAt(courtyard.x, courtyard.z, pad, pad), pad + 12);
  const curved = heritage.ROUND_HOUSE_CURVED_STAIR;
  let previous = -Infinity;
  for (let i = 0; i <= 72; i++) {
    const angle = curved.startAngle + curved.sweep * i / 72, radius = 6.6;
    const height = heritage.heritage1881GroundHeightAt(curved.x + Math.cos(angle) * radius, curved.z + Math.sin(angle) * radius, pad, pad);
    assert.ok(height >= previous); previous = height;
  }
  assert.equal(previous, pad + 12);
});

test('world source authors arches, verandahs, slate roof, stairs, Round House fittings and fountain without photo assets', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/heritage-1881-world.js'), 'utf8');
  for (const pattern of [/twelve-piece curved arch voussoirs/, /individual verandah balusters/, /hipped slate roof/, /36-step central ceremonial staircase/, /72 individual curved stone stair treads/, /eight oculi/, /1\.83 m hollow-copper time ball/, /typhoon-mast standing rigging/, /sixteen perimeter jets/, /source courtyard/]) assert.match(world, pattern);
  assert.doesNotMatch(world, /\.(?:jpg|jpeg|png|webp)|TextureLoader/);
});

test('1881 is integrated into world, ground, map, runtime entry and generated module manifest', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  const map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'js/app.runtime.manifest.json'), 'utf8'));
  assert.match(simple, /buildHeritage1881/); assert.match(simple, /heritage1881\.groundHeightAt/);
  assert.match(simple, /\.\.\.heritage1881\.colliders/); assert.match(simple, /\.\.\.heritage1881\.landmarks/);
  assert.match(map, /heritage1881MapSite/); assert.match(map, /roundHouse1881MapSite/);
  assert.match(index, /heritage1881: world\.heritage1881/);
  assert.ok(manifest.inputs.includes('js/cities/hongkong/heritage-1881-world.js'));
  assert.ok(manifest.inputs.includes('js/cities/hongkong/heritage-1881-architecture.js'));
});

test('Node geometry is finite and densely authored, with no occupied collider in the source courtyard', async () => {
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, fillText() {} }) }) };
  const THREE = await import('three/webgpu');
  const { buildHeritage1881 } = await import('../js/cities/hongkong/heritage-1881-world.js');
  const scene = new THREE.Scene(), world = buildHeritage1881(scene, { groundOffset: 6.133281901137451 });
  let meshes = 0, vertices = 0, nonFinite = 0;
  scene.traverse((object) => {
    if (!object.isMesh) return; meshes++;
    const positions = object.geometry.getAttribute('position'); vertices += positions?.count ?? 0;
    if (positions) for (const value of positions.array) if (!Number.isFinite(value)) nonFinite++;
  });
  assert.equal(nonFinite, 0); assert.ok(meshes >= 45); assert.ok(vertices > 350000);
  assert.ok(world.stats.heritage1881Arches > 600); assert.ok(world.stats.heritage1881Balusters > 900);
  assert.equal(world.landmarks.length, 3); assert.equal(world.stats.heritage1881RoundHouseCurvedSteps, 72);
  const centre = authored.authoredLocalToWorld(heritage.FWD_HOUSE_1881, 0, 0);
  assert.deepEqual(occupied(world.colliders, centre.x, centre.z, 6.133281901137451 + 14), []);
});

test('the grand stair uses the Main Building world transform and cannot reappear on Hong Kong Island', async () => {
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, fillText() {} }) }) };
  const THREE = await import('three/webgpu');
  const { buildHeritage1881 } = await import('../js/cities/hongkong/heritage-1881-world.js');
  const base = 6.133281901137451, scene = new THREE.Scene(), world = buildHeritage1881(scene, { groundOffset: base });
  scene.updateMatrixWorld(true);
  const stair = heritage.HERITAGE_1881_MAIN_STAIR, site = stair.site, edge = stair.sourceEdge * 2;
  const localX = (site.localRing[edge] + site.localRing[edge + 2]) * .5;
  const localZ = (site.localRing[edge + 1] + site.localRing[edge + 3]) * .5;
  const expected = authored.authoredLocalToWorld(site, localX, localZ);
  const actual = world.groups.stair.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.hypot(actual.x - expected.x, actual.z - expected.z) < 1e-9);
  assert.ok(Math.abs(actual.y - base) < 1e-9);
  assert.ok(inside(heritage.HERITAGE_1881_COMPOUND.ring, actual.x, actual.z));
  assert.equal(world.groups.stair.parent.name, '1881 Heritage — Main Building world frame for grand stair');
});

test('the grand-stair axis has an actual open retail portal and no occupied collider', async () => {
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, fillText() {} }) }) };
  const THREE = await import('three/webgpu');
  const { buildHeritage1881 } = await import('../js/cities/hongkong/heritage-1881-world.js');
  const world = buildHeritage1881(new THREE.Scene(), { groundOffset: 6.133281901137451 });
  const point = authored.authoredLocalToWorld(heritage.FWD_HOUSE_1881, 0, 35);
  const ground = heritage.heritage1881GroundHeightAt(point.x, point.z, 6.133281901137451, 6.133281901137451);
  assert.deepEqual(occupied(world.colliders, point.x, point.z, ground + 0.8), []);
});
