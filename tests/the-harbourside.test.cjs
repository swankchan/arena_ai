const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let harbourside, terrain, siteUtils, authored;

test.before(async () => {
  harbourside = await import('../js/cities/hongkong/the-harbourside-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  siteUtils = await import('../js/cities/hongkong/landmark-site.js');
  authored = await import('../js/cities/hongkong/authored-landmark-site.js');
});

const inside = (ring, x, z) => siteUtils.pointInFlatRing(ring, x, z);

function occupied(colliders, x, z, y) {
  return colliders.filter((c) => {
    if (y < c.minY || y > c.maxY) return false;
    const dx = x - c.obb.cx, dz = z - c.obb.cz;
    return Math.abs(dx * c.obb.cs - dz * c.obb.sn) <= c.obb.hx && Math.abs(dx * c.obb.sn + dz * c.obb.cs) <= c.obb.hz;
  });
}

test('The Harbourside preserves the estate and all three exact OSM tower rings', () => {
  assert.equal(harbourside.HARBOURSIDE_ID, 'HK-KLN-HARBOURSIDE');
  assert.deepEqual(harbourside.HARBOURSIDE_TOWER_SITES.map((site) => site.osmId), [1047822854, 1047822853, 1047822852]);
  assert.deepEqual(harbourside.HARBOURSIDE_TOWER_SITES.map((site) => site.source.geometry.length), [18, 18, 20]);
  assert.equal(harbourside.HARBOURSIDE_TOWER_SITES.length, 3);
  assert.ok(harbourside.HARBOURSIDE_SITE.ringArea > 3500);
});

test('source tower heights, levels and visual courses stay distinct and explicit', () => {
  for (const site of harbourside.HARBOURSIDE_TOWER_SITES) {
    assert.equal(site.height, 255);
    assert.equal(site.levels, 74);
    assert.equal(site.minHeight, 20);
    assert.equal(site.source.tags['building:min_level'], '4');
    assert.equal(site.source.tags.height, '255');
  }
  assert.equal(harbourside.HARBOURSIDE_VISUAL_COURSES, 70);
  assert.equal(harbourside.HARBOURSIDE_CROWN_HEIGHT, 12);
  assert.match(harbourside.HARBOURSIDE_RESEARCH.photographicEvidence, /sky corridors/);
});

test('high-level sky corridors connect Towers 1-2 and Towers 2-3 above 148 m', () => {
  assert.equal(harbourside.HARBOURSIDE_SKY_LINKS.length, 2);
  for (const link of harbourside.HARBOURSIDE_SKY_LINKS) {
    assert.equal(link.soffit, 148);
    assert.equal(link.top, 218);
    assert.ok(link.width >= 12);
    assert.ok(link.courses >= 15);
  }
});

test('the Harbourside DTM pad is reproducible and all three towers sit within the podium', () => {
  const pad = terrain.theHarboursidePadHeight();
  assert.equal(pad, terrain.HONG_KONG_TERRAIN_META.theHarboursidePadHeight);
  assert.equal(pad, authored.authoredHighestRawDatum(harbourside.HARBOURSIDE_GROUND_SITES, terrain.rawHongKongTerrainHeight));
  for (const site of harbourside.HARBOURSIDE_TOWER_SITES) {
    for (let i = 0; i < site.ring.length; i += 2) {
      assert.ok(inside(harbourside.HARBOURSIDE_SITE.ring, site.ring[i], site.ring[i + 1]));
    }
  }
});

test('world source authors champagne-bronze facades, aquamarine glazing, sky corridors and aerodynamic crown fins without external textures', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/the-harbourside-world.js'), 'utf8');
  for (const pattern of [
    /champagne-bronze spandrel panels/,
    /individual aquamarine sliding-door panes/,
    /sky corridor illuminated viewing glazing/,
    /aerodynamic sweeping crown fins up to 255 m/,
    /Austin Road West entrance canopy/,
  ]) {
    assert.match(world, pattern);
  }
  assert.doesNotMatch(world, /\.(?:jpg|jpeg|png|webp)|TextureLoader/);
});

test('The Harbourside is integrated into world, ground, roads, map and runtime entry', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  const road = fs.readFileSync(path.join(root, 'js/cities/hongkong/road-elevation.js'), 'utf8');
  const map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  assert.match(simple, /buildTheHarbourside/);
  assert.match(simple, /theHarbourside\.groundHeightAt/);
  assert.match(simple, /\.\.\.theHarbourside\.colliders/);
  assert.match(simple, /\.\.\.theHarbourside\.landmarks/);
  assert.match(road, /HARBOURSIDE_GROUND_RINGS/);
  assert.match(map, /harboursideMapSite/);
  assert.match(map, /harboursideTowerMapSites/);
  assert.match(index, /theHarbourside: world\.theHarbourside/);
});

test('Node geometry is finite, all three towers are detailed and sky corridors are modeled', async () => {
  const THREE = await import('three/webgpu');
  const { buildTheHarbourside } = await import('../js/cities/hongkong/the-harbourside-world.js');
  const scene = new THREE.Scene(), world = buildTheHarbourside(scene, { groundOffset: 7.004 });
  let meshes = 0, vertices = 0, nonFinite = 0;
  scene.traverse((object) => {
    if (!object.isMesh) return;
    meshes++;
    const positions = object.geometry.getAttribute('position');
    vertices += positions?.count ?? 0;
    if (positions) for (const value of positions.array) if (!Number.isFinite(value)) nonFinite++;
  });
  assert.equal(nonFinite, 0);
  assert.ok(meshes >= 25);
  assert.ok(vertices > 800000);
  assert.equal(world.stats.theHarboursideSourceTowers, 3);
  assert.equal(world.stats.theHarboursideHeight, 255);
  assert.equal(world.stats.theHarboursideSkyLinks, 2);
  assert.equal(world.landmarks.length, 4);
});

test('no occupied collider seals the grand ground sky voids between towers below 148 m', async () => {
  const THREE = await import('three/webgpu');
  const { buildTheHarbourside } = await import('../js/cities/hongkong/the-harbourside-world.js');
  const base = 7.004, world = buildTheHarbourside(new THREE.Scene(), { groundOffset: base });
  // Midpoint of link 1-2 below soffit should have no collider
  const link1 = harbourside.HARBOURSIDE_SKY_LINKS[0];
  assert.deepEqual(occupied(world.colliders, link1.x, link1.z, base + 80), []);
  // At link height, collider exists
  assert.ok(world.colliders.some((c) => c.minY >= base + link1.soffit));
});

test('residential glazing is double-sided, node-lit and includes illuminated sky corridors', async () => {
  const THREE = await import('three/webgpu');
  const { buildTheHarbourside } = await import('../js/cities/hongkong/the-harbourside-world.js');
  const scene = new THREE.Scene();
  buildTheHarbourside(scene, { groundOffset: 7.004 });
  const skyGlazing = scene.getObjectByName('The Harbourside — sky corridor illuminated viewing glazing');
  assert.ok(skyGlazing);
  assert.equal(skyGlazing.material.side, THREE.DoubleSide);
  assert.ok(skyGlazing.material.isNodeMaterial && skyGlazing.material.emissiveNode);
  let residential = 0;
  scene.traverse((o) => {
    if (!o.name.includes('individual aquamarine sliding-door panes')) return;
    residential++;
    assert.equal(o.material.side, THREE.DoubleSide);
    assert.ok(o.material.isNodeMaterial && o.material.emissiveNode);
  });
  assert.equal(residential, 4); // 3 towers + podium upper courses
});
