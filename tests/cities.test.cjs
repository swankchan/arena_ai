const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const read = (path) => readFileSync(join(__dirname, '..', path), 'utf8');
let registry;
test.before(async () => { registry = await import('../js/cities/registry.js'); });

test('the registry offers at least New York and a second city, with unique ids', () => {
  const { CITIES } = registry;
  assert.ok(CITIES.length >= 2);
  const ids = CITIES.map((city) => city.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('newyork'));
  assert.ok(ids.some((id) => id !== 'newyork'), 'there is a selectable city other than New York');
  for (const city of CITIES) {
    assert.ok(city.name, `${city.id} has a name`);
    assert.ok(city.tagline, `${city.id} has a tagline`);
    assert.ok(city.description, `${city.id} has a description`);
    assert.equal(typeof city.load, 'function', `${city.id} loads its pack lazily`);
  }
});

test('getCity resolves known ids and rejects unknown ones', () => {
  const { CITIES, getCity, defaultCityId } = registry;
  for (const city of CITIES) assert.equal(getCity(city.id), city);
  assert.equal(getCity('atlantis'), null);
  assert.equal(defaultCityId(), CITIES[0].id);
});

test('every registry entry has a pack module exporting the same id and a build function', () => {
  for (const city of registry.CITIES) {
    const source = read(`js/cities/${city.id}/index.js`);
    assert.match(source, new RegExp(`id:\\s*'${city.id}'`), `${city.id} declares its id`);
    assert.match(source, /build\s*\(/, `${city.id} exposes build()`);
  }
});

test('the city packs are dynamically imported: app.js only imports the registry', () => {
  const app = read('js/app.js');
  const packImports = [...app.matchAll(/from\s+['"](\.\/cities\/[^'"]+)['"]/g)].map((match) => match[1]);
  assert.deepEqual(packImports, ['./cities/registry.js']);
  const source = read('js/cities/registry.js');
  const dynamic = [...source.matchAll(/load:\s*\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((match) => match[1]);
  assert.equal(dynamic.length, registry.CITIES.length);
  for (const city of registry.CITIES) assert.ok(dynamic.includes(`./${city.id}/index.js`));
});

test('the home screen exposes the city picker before the simulation starts', () => {
  const html = read('index.html');
  assert.match(html, /id="start-overlay"/);
  assert.match(html, /id="city-cards"/);
  assert.match(html, /id="city-picker-status"[^>]*aria-live="polite"[^>]*hidden/);
  assert.match(html, /id="loading-overlay" class="hidden"/);
  const main = read('js/main.js');
  assert.match(main, /renderCityCards\(\);/);
  const staticImports = [...main.matchAll(/^import .* from ['"]([^'"]+)['"];/gm)].map((match) => match[1]);
  assert.deepEqual(staticImports, ['./cities/registry.js', './taxi-styles.js']);
  assert.match(main, /import\('\.\/app\.js'\)/, 'the 3D application loads only after the lightweight entry');
});
