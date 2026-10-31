const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('Hong Kong taxi decals use embedded Chinese outlines instead of web-font timing', async () => {
  const originalPath2D = globalThis.Path2D;
  globalThis.Path2D = class {
    constructor(data) { this.data = data; }
  };
  try {
    const { drawHKTaxiGlyphs } = await import('../js/cities/hongkong/taxi-glyphs.js');
    const fills = [], scales = [], translations = [];
    const ctx = {
      save() {}, restore() {},
      scale(x, y) { scales.push([x, y]); },
      translate(x, y) { translations.push([x, y]); },
      fill(path) { fills.push(path); }
    };
    drawHKTaxiGlyphs(ctx, '的士', 100, 50, 94, 185);
    assert.equal(fills.length, 2);
    assert.notEqual(fills[0].data, fills[1].data);
    assert.ok(fills.every((path) => path.data.length > 40));
    assert.ok(scales[0][0] < 0.094, 'maxWidth condenses the two glyphs slightly');
    assert.equal(scales[0][1], -0.094, 'font Y coordinates flip into canvas coordinates');
    assert.equal(translations[0][1], 85.72);

    const countBefore = fills.length;
    drawHKTaxiGlyphs(ctx, '石油氣的士', 0, 0, 40, 238);
    assert.equal(fills.length - countBefore, 5);
    assert.throws(() => drawHKTaxiGlyphs(ctx, '未收錄', 0, 0, 20), /Missing Hong Kong taxi glyph/);

    const license = fs.readFileSync(path.join(__dirname, '../js/cities/hongkong/taxi-glyphs.LICENSE.txt'), 'utf8');
    assert.match(license, /SIL OPEN FONT LICENSE/);
  } finally {
    if (originalPath2D === undefined) delete globalThis.Path2D;
    else globalThis.Path2D = originalPath2D;
  }
});
