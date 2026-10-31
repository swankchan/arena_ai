const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

let architecture;
let crossings;
let plan;

test.before(async () => {
  architecture = await import('../js/cities/hongkong/cable-stayed-architecture.js');
  crossings = await import('../js/cities/hongkong/crossings.js');
  plan = architecture.buildCableStayedPlan();
});

test('Ting Kau has three single-column towers and its full fan and stabilizer system', () => {
  const bridge = plan.bridges.find((item) => item.id === 'ting-kau');
  assert.equal(bridge.towers.length, 3);
  assert.deepEqual(bridge.towers.map((tower) => tower.height), [170, 194, 158]);
  assert.ok(bridge.towers.every((tower) => tower.kind === 'single'));
  assert.equal(bridge.stays.length, 384);
  assert.equal(bridge.longitudinalStabilizers.length, 8);
  assert.equal(bridge.transverseStabilizers.length, 12);
  assert.ok(bridge.crossGirders.length >= 80);
  assert.equal(plan.stats.tingKauStayCables, 384);
});

test('Kap Shui Mun has two H-towers, 176 semi-fan stays and a double-deck Vierendeel frame', () => {
  const bridge = plan.bridges.find((item) => item.id === 'kap-shui-mun');
  assert.equal(bridge.towers.length, 2);
  assert.equal(bridge.stays.length, 176);
  assert.equal(bridge.lowerDeckFrames.length, 87);
  for (const tower of bridge.towers) {
    assert.equal(tower.kind, 'h');
    assert.equal(tower.legs.length, 2);
    assert.equal(tower.crossbeams.length, 3);
    assert.equal(tower.height, 150);
    assert.ok(Math.abs(tower.topY - tower.bottom - 150) < 1e-7);
    assert.ok(tower.legs[0].base.x !== tower.legs[0].mid.x || tower.legs[0].base.z !== tower.legs[0].mid.z,
      'lower legs incline outwards below the upper strut');
  }
  for (const frame of bridge.lowerDeckFrames) assert.ok(Math.abs(frame.upperY - frame.lowerY - 6.65) < 1e-7);
});

test('every cable-stayed deck anchorage and lamp base is attached to the real carriageway', () => {
  for (const bridge of plan.bridges) {
    for (const stay of bridge.stays) {
      const hit = crossings.crossingSurfaceAt(stay.b.x, stay.b.z, 0.03);
      assert.ok(hit, `${bridge.id} has a floating stay anchor`);
      assert.equal(hit.crossingId, bridge.id);
      assert.ok(Math.abs(hit.distance - hit.width * 0.5) < 0.03);
      const lift = bridge.id === 'ting-kau' ? 0.42 : 0.45;
      assert.ok(Math.abs(hit.height - (stay.b.y - lift)) < 0.002);
    }
    for (const lamp of bridge.lamps) {
      const hit = crossings.crossingSurfaceAt(lamp.base.x, lamp.base.z, 0.03);
      assert.ok(hit, `${bridge.id} has a floating lamp base`);
      assert.ok(Math.abs(hit.distance - (hit.width * 0.5 - 0.22)) < 0.03);
      assert.ok(Math.abs(hit.height - lamp.base.y) < 0.002);
    }
  }
});

test('cable-stayed main spans reject generic approach piers and share the day/night update', () => {
  assert.equal(architecture.isCableStayedMainSpan('ting-kau', 0.5), true);
  assert.equal(architecture.isCableStayedMainSpan('ting-kau', 0.05), false);
  assert.equal(architecture.isCableStayedMainSpan('kap-shui-mun', 0.5), true);
  assert.equal(architecture.isCableStayedMainSpan('kap-shui-mun', 0.1), false);
  assert.equal(architecture.isCableStayedMainSpan('tsing-ma', 0.5), false);
  const source = fs.readFileSync(path.join(__dirname, '../js/cities/hongkong/crossings-world.js'), 'utf8');
  assert.equal(source.match(/buildCableStayedArchitecture\(root\)/g)?.length, 1);
  assert.match(source, /isCableStayedMainSpan\(route\.crossingId, routeFraction\)/);
  assert.match(source, /cableStayed\.update\(\)/);
  assert.match(source, /\.\.\.cableStayed\.stats/);
  assert.match(source, /tingKauRailMaterial/);
});
