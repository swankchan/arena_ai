const assert = require('node:assert/strict');
const test = require('node:test');

test('Harbour City palette keeps CPU material colours instead of turning TSL nodes white', async () => {
  const { harbourCityPalette } = await import('../js/cities/hongkong/harbour-city-world-utils.js');
  const options = {
    stone: [.58, .55, .47], paleStone: [.78, .75, .66],
    metal: [.30, .27, .20], roof: [.30, .32, .30], roughness: .31,
  };
  const materials = harbourCityPalette(options);
  for (const key of ['stone', 'paleStone', 'metal', 'roof']) {
    const actual = materials[key].color;
    assert.equal(actual.isColor, true, `${key} must use THREE.Color`);
    for (let channel = 0; channel < 3; channel++) {
      assert.ok(Math.abs(actual.toArray()[channel] - options[key][channel]) < 1e-9, `${key} channel ${channel}`);
    }
    assert.notEqual(actual.getHex(), 0xffffff, `${key} must not fall back to white`);
  }
  // Vertex-coloured glazing intentionally uses a TSL attribute in colorNode instead.
  assert.ok(materials.glazing.colorNode);
});
