const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const read = (path) => readFileSync(join(__dirname, '..', path), 'utf8');

test('home, weather and all-UI clean-view controls are wired into the shared app', () => {
  const html = read('index.html');
  const app = read('js/app.js');
  for (const id of ['btn-home', 'btn-weather', 'weather-popover', 'btn-toggle-hud']) {
    assert.match(html, new RegExp(`id="${id}"`), `${id} exists`);
  }
  for (const mode of ['clear', 'rain', 'storm', 'snow']) assert.match(html, new RegExp(`data-weather="${mode}"`));
  assert.match(app, /new WeatherSystem\(scene, lightingSystem\)/);
  assert.match(app, /weatherSystem\.update\(dt, cameraSystem\.camera\)/);
  assert.match(app, /homeUrl\.search = ''/);
  assert.match(app, /homeUrl\.hash = ''/);
  assert.match(app, /window\.location\.assign\(homeUrl\.href\)/);
  assert.match(app, /if \(mapSystem\?\.isFullMapOpen\) mapSystem\.toggleFullMap\(false\)/);
});

test('H hides every overlay including its own button and touch controls', () => {
  const css = read('css/style.css');
  assert.match(css, /body\.hud-minimized \.hud,\s*body\.hud-minimized #touch-controls,\s*body\.hud-minimized #fullmap-modal,\s*body\.hud-minimized \.popover\s*\{\s*display: none !important;/);
  assert.match(css, /body\.hud-minimized::before,\s*body\.hud-minimized::after\s*\{\s*display: none;/);
  const app = read('js/app.js');
  assert.match(app, /case 'KeyH':\s*if \(hudToggleBtn\) hudToggleBtn\.click\(\)/, 'H restores the hidden interface');
});

test('Hong Kong road blades alone use white enamel and black lettering', () => {
  const css = read('css/style.css');
  const app = read('js/app.js');
  assert.match(app, /document\.body\.dataset\.city = city\.id/);
  assert.match(css, /body\[data-city="hongkong"\] \.street-sign\s*\{[^}]*color: #111418;[^}]*background: #f7f7f2;/);
});

test('weather combines physical moving clouds, GPU precipitation and double-pulse lightning', () => {
  const lighting = read('js/lighting.js');
  const weather = read('js/weather.js');
  assert.match(lighting, /BASE_CLOUD_SPEED = 0\.000055/);
  assert.match(lighting, /this\.sky\.cloudSpeed\.value = BASE_CLOUD_SPEED \* w\.cloudSpeed/);
  assert.match(lighting, /cloudCoverage: 0\.93/);
  assert.match(lighting, /uLightningFlash/);
  assert.match(weather, /new THREE\.InstancedBufferGeometry/);
  assert.match(weather, /createPrecipitation\('rain', 3200\)/);
  assert.match(weather, /createPrecipitation\('snow', 2200\)/);
  assert.match(weather, /mode === 'rain' \|\| mode === 'storm'/);
  assert.match(weather, /triggerLightning\(camera\)/);
  assert.match(weather, /const second = age >= 0\.17/);
  assert.match(weather, /new THREE\.TubeGeometry/);
});

test('turning AI leaves the old route height sampler instead of hovering at its endpoint', () => {
  const traffic = read('js/cities/hongkong/traffic.js');
  assert.match(traffic, /if \(vehicle\.turnActive && vehicle\.turn\)/);
  assert.match(traffic, /const nextRoute = routes\[nextLink\]/);
  assert.match(traffic, /current\.distanceSq > currentHalfWidth \*\* 2/);
  assert.match(traffic, /return getGroundHeight\(x, z, 'car', referenceY\)/);
});
