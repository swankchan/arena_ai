const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('cooperative world construction reports each real step before work, preserving order and return value', async () => {
  const { runLoadingSteps, runLoadingStepsAsync } = await import('../js/loading-steps.js');
  const events = [];
  function* work() { yield 'terrain'; events.push('terrain built'); yield 'buildings'; events.push('buildings built'); return 42; }
  const result = await runLoadingStepsAsync(work(), (s) => events.push(s), async () => events.push('yield'));
  assert.equal(result, 42);
  assert.deepEqual(events, ['terrain', 'yield', 'terrain built', 'buildings', 'yield', 'buildings built']);
  const statuses = [];
  assert.equal(runLoadingSteps(work(), (s) => statuses.push(s)), 42);
  assert.deepEqual(statuses, ['terrain', 'buildings']);
  await assert.rejects(runLoadingStepsAsync((function* () { yield 'start'; throw new Error('bad'); })(), () => {}, async () => {}), /bad/);
});

test('only shader job completion is reported as a percentage, followed by indeterminate GPU warmup', () => {
  const app = read('js/app.js'), world = read('js/cities/hongkong/simple-world.js');
  assert.match(app, /Shader jobs processed: \$\{done\} \/ \$\{jobs.length\}/);
  assert.match(app, /setLoadingIndeterminate\(\);\s*setStatus\('Preparing first frame/);
  assert.match(app, /onSubmittedWorkDone/);
  assert.match(world, /function\* buildSimpleHongKongWorldSteps/);
  assert.match(world, /yield 'Building Hong Kong/);
  assert.match(read('js/cities/hongkong/index.js'), /await buildHongKongWorldAsync/);
  assert.match(read('js/main.js'), /Loading city runtime/);
});
