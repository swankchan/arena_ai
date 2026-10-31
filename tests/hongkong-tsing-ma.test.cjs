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

test('paired main cables stay symmetric and outside the combined carriageway edges', () => {
  const { sampleTsingMa, tsingMaCablePoint } = architecture;
  for (const f of [0, 0.1, 0.22, 0.5, 0.82, 1]) {
    const frame = sampleTsingMa(f), a = tsingMaCablePoint(f, -1), b = tsingMaCablePoint(f, 1);
    close((a.x + b.x) * 0.5, frame.x);
    close((a.z + b.z) * 0.5, frame.z);
    close(a.y, b.y);
    close(Math.hypot(a.x - b.x, a.z - b.z) * 0.5, frame.halfDeck + 0.9);
    assert.ok(frame.halfDeck > frame.separation * 0.5);
  }
});

test('crossing world installs the shared Tsing Ma architecture exactly once', () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/cities/hongkong/crossings-world.js'), 'utf8');
  assert.equal(source.match(/buildTsingMaArchitecture\(root\)/g)?.length, 1);
  assert.match(source, /\.\.\.tsingMa\.stats/);
  assert.match(source, /import \{ buildTsingMaArchitecture \} from '\.\/tsing-ma-world\.js';/);
});
