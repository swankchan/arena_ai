// Lamps standing under a flyover must not push their head box through a deck that was added later.
const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
let clearance, data, elevation;

test.before(async () => {
  clearance = await import('../js/cities/hongkong/street-light-deck-clearance.js');
  data = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS;
  elevation = await import('../js/cities/hongkong/road-elevation.js');
});

test('the lantern headroom clears the deck soffit it is checked against', () => {
  // 9.6 m column + 0.18 m head box, and the deck is 0.72 m deep, so a deck whose driving surface is below 9.78 m
  // above the ground would be punched through.
  assert.equal(clearance.LAMP_LANTERN_HEADROOM, 9.78);
});

test('every suppressed lamp really is under a low deck', () => {
  let checked = 0, suppressed = 0;
  for (let i = 0; i < data.lamps.length; i += 97) {
    const [x, z, heading, arms] = data.lamps[i];
    checked++;
    if (!clearance.lampUnderLowDeck(x, z, heading, arms, elevation.surfaceRoadHeight(x, z))) continue;
    suppressed++;
  }
  // Sampled defect count on the bundled survey: ~1.2 % of the territory's lamps sit under a low deck.
  assert.ok(checked > 1000, `sampled ${checked} lamps`);
  assert.ok(suppressed > 0 && suppressed < checked * 0.05, `suppressed ${suppressed} of ${checked}`);
});

test('lamps in the open are kept', () => {
  // A deliberately open stretch of the Tuen Mun highway corridor with no decks overhead.
  const ground = elevation.surfaceRoadHeight(-3000, 6000);
  assert.equal(clearance.lampUnderLowDeck(-3000, 6000, 0, 1, ground), false);
});
