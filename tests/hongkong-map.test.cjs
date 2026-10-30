const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

let GEO;
let hongKongFitZoom;
test.before(async () => {
  ({ GEO } = await import('../js/hk-geodata.js'));
  ({ hongKongFitZoom } = await import('../js/cities/hongkong/map.js'));
});

test('Hong Kong full-map fit uses the available wide and portrait viewports', () => {
  const depth = GEO.bounds.maxZ - GEO.bounds.minZ;
  const width = GEO.bounds.maxX - GEO.bounds.minX;
  const wideZoom = hongKongFitZoom(GEO.bounds, 1568, 756);
  assert.ok(wideZoom * depth / 756 > 0.96, 'the wide-screen fit uses over 96% of the canvas height');
  const portraitZoom = hongKongFitZoom(GEO.bounds, 390, 844);
  assert.ok(portraitZoom * width / 390 > 0.97, 'the portrait fit uses over 97% of the canvas width');
  assert.ok(wideZoom > Math.min(
    1568 / (width * 1.08),
    756 / (depth * 1.1)
  ), 'the tighter fit is larger than the previous padded fit');
});

test('Hong Kong opens on the fitted atlas and prevents tiny manual zoom-outs', () => {
  const source = readFileSync(join(__dirname, '../js/cities/hongkong/map.js'), 'utf8');
  assert.match(source, /this\.resizeFullCanvas\(\);\s*this\.fitAll\(\);\s*this\.renderFullMap\(\)/);
  assert.match(source, /minimumFullZoom\(\)/);
  assert.match(source, /this\.fitZoom\(\) \* 0\.85/);
  assert.match(source, /Math\.max\(this\.minimumFullZoom\(\), this\.viewZoom \/ 1\.45\)/);
  assert.match(source, /Math\.max\(this\.minimumFullZoom\(\), Math\.min\(MAX_FULL_ZOOM, this\.viewZoom \* factor\)\)/);
});
