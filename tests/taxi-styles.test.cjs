const assert = require('node:assert/strict');
const test = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

let DEFAULT_TAXI_STYLE;
let TAXI_STYLES;
let getTaxiStyle;
let CITIES;
let getCity;

test.before(async () => {
  ({ DEFAULT_TAXI_STYLE, TAXI_STYLES, getTaxiStyle } = await import('../js/taxi-styles.js'));
  ({ CITIES, getCity } = await import('../js/cities/registry.js'));
});

test('the catalog exposes distinct New York and Hong Kong taxis', () => {
  assert.equal(DEFAULT_TAXI_STYLE, 'nyc-medallion');
  assert.deepEqual(Object.keys(TAXI_STYLES).sort(), ['hk-urban', 'nyc-medallion']);
  assert.equal(getTaxiStyle('nyc-medallion').body, 'taxi');
  assert.equal(getTaxiStyle('nyc-medallion').paint, 0xffbe14);
  assert.equal(getTaxiStyle('nyc-medallion').livery, 'nyc');
  assert.equal(getTaxiStyle('nyc-medallion').plate, 'nyc');
  assert.equal(getTaxiStyle('nyc-medallion').doorDecal, 'nyc');
  assert.equal(getTaxiStyle('hk-urban').body, 'hkTaxi');
  assert.equal(getTaxiStyle('hk-urban').paint, 0xc6202b);
  assert.equal(getTaxiStyle('hk-urban').livery, 'hk');
  assert.equal(getTaxiStyle('hk-urban').plate, 'hk');
  assert.equal(getTaxiStyle('hk-urban').doorDecal, null);
  assert.equal(getTaxiStyle('missing'), null);
  assert.equal(getTaxiStyle(), null);
});

test('city registry entries resolve valid taxi styles', () => {
  for (const city of CITIES) {
    assert.ok(city.taxiStyle, `${city.id} declares a taxi style`);
    assert.equal(getTaxiStyle(city.taxiStyle), TAXI_STYLES[city.taxiStyle]);
  }
  assert.equal(getCity('newyork').taxiStyle, 'nyc-medallion');
  assert.equal(getCity('hongkong').taxiStyle, 'hk-urban');
  assert.equal(getCity('grid').taxiStyle, 'nyc-medallion');
});

test('the home-screen city cards show the city taxi style', () => {
  const main = readFileSync(join(__dirname, '../js/main.js'), 'utf8');
  const css = readFileSync(join(__dirname, '../css/style.css'), 'utf8');
  assert.match(main, /import \{ getTaxiStyle \} from '\.\/taxi-styles\.js';/);
  assert.match(main, /const taxiStyle = getTaxiStyle\(city\.taxiStyle\)/);
  assert.match(main, /city-card-taxi/);
  assert.match(css, /\.city-card-taxi\s*\{/);
  assert.match(css, /\.city-card-taxi-dot\s*\{/);
});

test('README documents the taxi style catalog', () => {
  const readme = readFileSync(join(__dirname, '../README.md'), 'utf8');
  assert.match(readme, /## Taxi styles/);
  assert.match(readme, /taxiStyle/);
  assert.match(readme, /hk-urban/);
});
