const assert = require('node:assert/strict');
const test = require('node:test');

test('low-sun presets limit the solar disc and preserve it after environment baking', async () => {
  const THREE = await import('three/webgpu');
  const { LightingSystem } = await import('../js/lighting.js');
  const lighting = new LightingSystem(new THREE.Scene());
  for (const id of ['golden', 'twilight']) {
    lighting.applyPreset(id, true);
    const strength = lighting.sky.showSunDisc.value;
    assert.ok(strength > 0 && strength <= .002);
    lighting.pmremGenerator = { fromScene() {
      assert.equal(lighting.sky.showSunDisc.value, 0, 'environment bake excludes solar disc');
      return { texture: {} };
    } };
    lighting.bakeEnvironmentMap();
    assert.equal(lighting.sky.showSunDisc.value, strength, 'bake restores current preset');
    lighting.pmremGenerator = null;
    lighting.envRenderTarget = null;
  }
  lighting.applyPreset('midday', true);
  assert.equal(lighting.sky.showSunDisc.value, 1, 'other times remain unchanged');
  lighting.setWeather('rain');
  lighting.applyPreset('golden', true);
  assert.equal(lighting.sky.showSunDisc.value, .0015);
});

test('low-sun bloom is reduced without dimming midnight lighting', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '../js/post-processing.js'), 'utf8');
  assert.match(src, /golden:\s*\{[^\n]*bloom: 0\.12, threshold: 1\.65/);
  assert.match(src, /twilight:\s*\{[^\n]*bloom: 0\.14, threshold: 1\.50/);
  assert.match(src, /midnight:\s*\{[^\n]*bloom: 0\.30, threshold: 1\.00/);
});
