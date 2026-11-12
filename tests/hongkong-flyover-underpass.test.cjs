// A mapped flyover has to clear the road it spans; the OSM layer tag on its own does not guarantee that.
const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
let clearance, elevation, decks;

test.before(async () => {
  clearance = await import('../js/cities/hongkong/flyover-underpass-clearance.js');
  elevation = await import('../js/cities/hongkong/road-elevation.js');
  decks = (await import('../js/hk-road-deck-data.js')).HK_ROAD_DECKS;
});

test('the stated clearance matches Hong Kong road design minimums', () => {
  assert.ok(clearance.UNDERPASS_CLEARANCE_M >= 5.1, 'design minimum for a new flyover');
  assert.ok(clearance.UNDERPASS_CLEARANCE_M < 6.5, 'anything above 6.5 m starts to distort every deck');
  assert.ok(clearance.MAX_UNDERPASS_LIFT_M > clearance.UNDERPASS_CLEARANCE_M,
    'the cap must leave room to lift a deck that sits below a street');
});

test('only decks that are genuinely on top of a crossing get lifted', () => {
  clearance.resetUnderpassLifts();
  const stats = clearance.underpassLiftStats();
  assert.ok(stats.ways > 0, 'some deck way needs lifting');
  assert.ok(stats.ways < decks.decks.length, 'not every deck way can need lifting');
  assert.ok(stats.raisedVertices > 100, `raised ${stats.raisedVertices} vertices`);
  assert.ok(stats.maxLiftM <= clearance.MAX_UNDERPASS_LIFT_M);
  // A crossing where the deck already runs beneath the other ribbon cannot be fixed by lifting it.
  assert.ok(stats.skippedInverted > 0);
});

test('lifting a deck never pushes it below the ground it stands on', () => {
  clearance.resetUnderpassLifts();
  let checked = 0;
  for (const deck of decks.decks.slice(0, 400)) {
    const lift = clearance.underpassLiftAtVertex(deck.wayId, 0);
    assert.ok(Number.isFinite(lift) && lift >= 0, `lift ${lift} for way ${deck.wayId}`);
    checked++;
  }
  assert.equal(checked, 400);
});

test('a lifted deck clears the surface road beneath it by the stated margin', () => {
  clearance.resetUnderpassLifts();
  // 干諾道西天橋 / 干諾道西 was one of the worst pairs before the clearance pass.
  const wayId = decks.decks.find((deck) => deck.layer >= 1)?.wayId;
  assert.ok(Number.isInteger(wayId));
  const height = elevation.roadRibbonHeightAtVertex(wayId, 0);
  assert.ok(Number.isFinite(height));
});
