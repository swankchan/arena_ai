const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
let THREE, architecture, parks, world;

function pointInObb(c, x, z, y) {
  if (!c.obb || y < c.minY || y > c.maxY) return false;
  const dx = x - c.obb.cx, dz = z - c.obb.cz;
  const lx = dx * c.obb.cs - dz * c.obb.sn, lz = dx * c.obb.sn + dz * c.obb.cs;
  return Math.abs(lx) < c.obb.hx && Math.abs(lz) < c.obb.hz;
}

test.before(async () => {
  architecture = await import('../js/cities/hongkong/flagstaff-house-architecture.js');
  parks = await import('../js/cities/hongkong/major-parks-architecture.js');
  globalThis.document = { createElement: () => {
    const canvas = { width: 0, height: 0 };
    const context = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, {
      get: (target, key) => target[key] || (() => {}), set: (target, key, value) => { target[key] = value; return true; },
    });
    canvas.getContext = () => context; return canvas;
  } };
  THREE = await import('three/webgpu');
  const { buildHongKongPark } = await import('../js/cities/hongkong/hong-kong-park-world.js');
  world = buildHongKongPark(new THREE.Group());
});

test('HK-B0093 uses the direct Flagstaff House OSM source and both real entrance nodes', () => {
  const a = architecture;
  assert.equal(a.FLAGSTAFF_HOUSE_OSM_SOURCE.id, 42255475);
  assert.equal(a.FLAGSTAFF_HOUSE_OSM_SOURCE.version, 15);
  assert.equal(a.FLAGSTAFF_HOUSE_OSM_SOURCE.tags['building:levels'], '2');
  assert.ok(a.flagstaffHouseSourceRingError() < .001, 'cached park ring differs from direct source beyond projection tolerance');
  assert.deepEqual(a.FLAGSTAFF_HOUSE_ENTRANCES.map((entry) => entry.nodeId), [13389904935, 13389904936]);
  for (const entry of a.FLAGSTAFF_HOUSE_ENTRANCES) {
    assert.equal(entry.sourceEdge, 1);
    assert.ok(Math.abs(entry.localX - a.FLAGSTAFF_HOUSE_SITE.localRing[entry.sourceEdge * 2 + (entry.t ? 2 : 0)]) < .001);
    assert.ok(Math.abs(entry.localZ - a.FLAGSTAFF_HOUSE_SITE.localRing[entry.sourceEdge * 2 + (entry.t ? 3 : 1)]) < .001);
    assert.match(entry.evidence, /OSM entrance node/);
  }
  assert.ok(a.FLAGSTAFF_HOUSE_RESEARCH.some((source) => /Greek Revival/.test(source.evidence)));
});

test('HK-B0093 is a dedicated detailed building, not the generic park heritage box', () => {
  const stats = world.stats;
  assert.equal(stats.flagstaffHouseRefined, true);
  assert.equal(stats.flagstaffHouseInventoryId, 'HK-B0093');
  assert.equal(stats.flagstaffHouseGenericHeritage, false);
  assert.ok(stats.flagstaffHouseWindowPanels >= 100);
  assert.ok(stats.flagstaffHouseShutterPanels >= 100);
  assert.ok(stats.flagstaffHouseVerandaColumns >= 12);
  assert.equal(stats.flagstaffHouseRoofSections, 2);
  assert.equal(stats.flagstaffHouseChimneys, 3);
  const names = [];
  world.root.traverse((object) => { if (object.name) names.push(object.name); });
  assert.ok(names.some((name) => /Flagstaff House dedicated Greek Revival/.test(name)));
  assert.ok(names.some((name) => /central upper arch/.test(name)));
  assert.ok(names.some((name) => /red-brown hipped tile roofs/.test(name)));
  assert.ok(!names.some((name) => /Flagstaff House Museum of Tea Ware colonial verandas and hipped roof/.test(name)));
  let nonFinite = 0;
  world.root.traverse((object) => {
    if (!object.isMesh) return;
    const position = object.geometry?.getAttribute('position');
    if (position) for (const value of position.array) if (!Number.isFinite(value)) nonFinite++;
  });
  assert.equal(nonFinite, 0);
});

test('both Flagstaff House source doors are open at person height and retain solid wall above', () => {
  for (const entry of architecture.FLAGSTAFF_HOUSE_ENTRANCES) {
    const ground = parks.majorParkGroundHeightAt(parks.HONG_KONG_PARK, entry.x, entry.z, 0);
    assert.ok(Math.abs(ground - world.stats.hongKongParkFlagstaffPad) < 1e-6);
    assert.equal(world.colliders.filter((c) => pointInObb(c, entry.x, entry.z, ground + 1.7)).length, 0, `blocked entrance ${entry.nodeId}`);
    assert.ok(world.colliders.some((c) => pointInObb(c, entry.x, entry.z, ground + 4.0)), `missing wall above entrance ${entry.nodeId}`);
  }
  for (const collider of world.colliders) if (collider.obb) {
    assert.ok(!parks.majorParkRoadAt(parks.HONG_KONG_PARK, collider.obb.cx, collider.obb.cz, 0), 'Flagstaff collider occupies a carriageway');
  }
});

test('Flagstaff refinement is wired into Hong Kong Park without restoring the old generic call', () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/cities/hongkong/hong-kong-park-world.js'), 'utf8');
  assert.match(source, /buildFlagstaffHouse\(root, materials, colliders\)/);
  assert.doesNotMatch(source, /buildHeritage\([^\n]*42255475/);
  assert.match(source, /\.\.\.flagstaff\.stats/);
});
