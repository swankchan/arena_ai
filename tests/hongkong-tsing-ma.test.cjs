const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

let architecture;
let crossings;

function close(actual, expected, tolerance = 1e-7) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);
}

test.before(async () => {
  architecture = await import('../js/cities/hongkong/tsing-ma-architecture.js');
  crossings = await import('../js/cities/hongkong/crossings.js');
});

test('Tsing Ma has one shared pair of H-tower stations around both directional decks', () => {
  const { TSING_MA_TOWERS, TSING_MA_TOWER_FRACTIONS, sampleTsingMa, sampleCrossingRoute } = architecture;
  assert.deepEqual(TSING_MA_TOWER_FRACTIONS, [0.22, 0.82]);
  assert.equal(TSING_MA_TOWERS.length, 2);
  const routes = crossings.CROSSING_ROUTES.filter((route) => route.crossingId === 'tsing-ma');
  assert.equal(routes.length, 2);
  for (const tower of TSING_MA_TOWERS) {
    const a = sampleCrossingRoute(routes[0], tower.fraction);
    const b = sampleCrossingRoute(routes[1], 1 - tower.fraction);
    close(tower.frame.x, (a.x + b.x) * 0.5);
    close(tower.frame.z, (a.z + b.z) * 0.5);
    close(tower.frame.y, (a.y + b.y) * 0.5);
    assert.ok(tower.frame.separation > 15 && tower.frame.separation < 25);
    assert.ok(tower.topY > tower.frame.y + 80);
  }
});

test('main cables meet both tower tops and sag without touching the driving deck', () => {
  const { TSING_MA_TOWERS, sampleTsingMa, tsingMaCableHeight } = architecture;
  for (const tower of TSING_MA_TOWERS) close(tsingMaCableHeight(tower.fraction), tower.topY);
  for (let i = 0; i <= 100; i++) {
    const f = i / 100, deck = sampleTsingMa(f);
    assert.ok(Number.isFinite(tsingMaCableHeight(f)));
    assert.ok(tsingMaCableHeight(f) >= deck.y + 4.9, `cable clears deck at ${f}`);
  }
  const left = TSING_MA_TOWERS[0], right = TSING_MA_TOWERS[1], middle = 0.52;
  const straight = (left.topY + right.topY) * 0.5;
  assert.ok(tsingMaCableHeight(middle) < straight - 50, 'the central span has a visible suspension sag');
  close(tsingMaCableHeight(middle), sampleTsingMa(middle).y + 14);
});

test('main cables and lamp bases follow the actual carriageway edges without floating', () => {
  const { tsingMaCablePoint, tsingMaDeckEdgePoint, tsingMaLampBasePoint, TSING_MA_LAMP_EDGE_INSET } = architecture;
  for (const f of [0, 0.1, 0.22, 0.5, 0.82, 1]) {
    for (const side of [-1, 1]) {
      const edge = tsingMaDeckEdgePoint(f, side), cable = tsingMaCablePoint(f, side);
      close(cable.x, edge.x);
      close(cable.z, edge.z);
      const edgeHit = crossings.crossingSurfaceAt(edge.x, edge.z, 0.02);
      assert.ok(edgeHit, `missing bridge deck at ${f}/${side}`);
      assert.equal(edgeHit.crossingId, 'tsing-ma');
      close(edgeHit.distance, edgeHit.width * 0.5, 0.03);
      close(edgeHit.height, edge.y, 0.001);

      const lamp = tsingMaLampBasePoint(f, side);
      close(lamp.y, edge.y);
      const lampHit = crossings.crossingSurfaceAt(lamp.x, lamp.z, 0.02);
      assert.ok(lampHit, `lamp base is off the bridge at ${f}/${side}`);
      close(lampHit.distance, lampHit.width * 0.5 - TSING_MA_LAMP_EDGE_INSET, 0.03);
      close(lampHit.height, lamp.y, 0.001);
    }
  }
});

test('neutral bridge materials stay unlit by day and coloured fittings turn on after dusk', () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/cities/hongkong/tsing-ma-world.js'), 'utf8');
  assert.match(source, /color: 0xa8aaa6/);
  assert.match(source, /color: 0x4b5154/);
  assert.match(source, /smoothstep\(0\.7, 1\.45, cityUniforms\.uInteriorGlow\)/);
  assert.match(source, /material\.emissiveNode = color\(lightColor\)\.mul\(night\.mul\(intensity\)\)/);
  assert.match(source, /const mainCableMaterial = luminous\(0xffc66d, 0\.55, 0x4b5154\)/);
  assert.match(source, /const suspenderLightMaterial = luminous\(0xffd88f, 0\.32, 0xabb0ad\)/);
  assert.match(source, /TubeGeometry\(curve, 480, 0\.28, 5, false\), mainCableMaterial/);
  assert.match(source, /suspenderLightMaterial, suspenders, 'TsingMaSuspenders'/);
  assert.match(source, /new THREE\.PointLight\([^\n]+, 0, 190, 1\.6\)/);
  assert.match(source, /light\.intensity = light\.userData\.nightIntensity \* night/);
  assert.match(source, /TsingMaCableSaddle/);
  assert.match(source, /TsingMaCableAnchorage/);
  assert.match(source, /TsingMaLampBases/);
  assert.match(source, /TsingMaLampArms/);
});

test('crossing world installs the shared Tsing Ma architecture exactly once', () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/cities/hongkong/crossings-world.js'), 'utf8');
  assert.equal(source.match(/buildTsingMaArchitecture\(root\)/g)?.length, 1);
  assert.match(source, /\.\.\.tsingMa\.stats/);
  assert.match(source, /tsingMa\.update\(\);/);
  assert.match(source, /tunnelLighting\.update\(cameraSystem\)/);
  assert.match(source, /import \{ buildTsingMaArchitecture \} from '\.\/tsing-ma-world\.js';/);
  const simple = fs.readFileSync(path.join(__dirname, '../js/cities/hongkong/simple-world.js'), 'utf8');
  assert.match(simple, /update\(dt, elapsed, context\) \{ crossings\.update\?\.\(context\); \}/);
});
