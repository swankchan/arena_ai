const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const read = (p) => readFileSync(join(__dirname, '..', p), 'utf8');

test('cover, loading screen and browser title have no old product name', () => {
  const html = read('index.html');
  const app = read('js/app.js');
  assert.doesNotMatch(html, /slop\s+cities/i);
  assert.doesNotMatch(app, /slop\s+cities/i);
  assert.match(html, /<title>香港 Hong Kong<\/title>/);
  assert.match(html, /class="cover-brand"[^]*?HONG KONG/);
  assert.match(html, /id="loader-title"[^>]*>香港 Hong Kong/);
  assert.match(app, /document\.title = city\.name;/);
  assert.match(app, /storageKey/, 'existing player saves are not renamed');
});
