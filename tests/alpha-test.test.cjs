const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const dir = join(__dirname, '../js');

// The sun's shadow cascades draw every caster with one shared override material and copy each caster's `alphaTest`
// onto it. The Material.alphaTest setter bumps `version` whenever the value crosses 0, so one alpha-tested caster
// invalidates every shadow caster's render object and three.js rebuilds their shader cache keys (a walk of each
// caster's node graph) every frame: ~10 ms of CPU per frame. `alphaTestNode` discards the same fragments in the colour
// pass without touching the shadow material; `maskShadowNode` keeps cut-out shadows (see createTreeMaterial).
test('materials alpha-test with alphaTestNode, never the alphaTest property', () => {
  const offenders = [];
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.js'))) {
    readFileSync(join(dir, file), 'utf8').split('\n').forEach((line, i) => {
      if (/\balphaTest\s*:/.test(line) || /\.alphaTest\s*=(?!=)/.test(line)) offenders.push(`js/${file}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, [], `use alphaTestNode (+ maskShadowNode) instead of alphaTest:\n${offenders.join('\n')}`);
});
