const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('only drive and fly are selectable, including when restoring older saves', async () => {
  const { PLAYABLE_MODES, availableMode } = await import('../js/playable-modes.js');
  assert.deepEqual(PLAYABLE_MODES, ['car', 'helicopter']);
  assert.equal(availableMode('person'), 'car');
  assert.equal(availableMode('cyclist'), 'car');
  assert.equal(availableMode('helicopter'), 'helicopter');
  const app = read('js/app.js');
  assert.match(app, /availableMode\(saved\.activeMode\)/);
  assert.match(app, /const modes = PLAYABLE_MODES/);
  assert.match(app, /if \(!PLAYABLE_MODES\.includes\(mode\)\) return/);
  assert.doesNotMatch(app, /case 'Digit[13]':/);
  const html = read('index.html');
  assert.match(html, /id="mode-person" hidden/);
  assert.match(html, /id="mode-cyclist" hidden/);
  assert.match(html, /id="mode-car" class=/);
  assert.match(html, /id="mode-helicopter" class=/);
});
