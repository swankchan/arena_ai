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

test('shader job progress is counted and followed by indeterminate GPU warmup', () => {
  const app = read('js/app.js'), world = read('js/cities/hongkong/simple-world.js');
  assert.match(app, /setStatus\(\{ label: 'Shader jobs processed', done, total: jobs.length \}\)/);
  assert.match(app, /setLoadingIndeterminate\(\);\s*setStatus\('Preparing first frame/);
  assert.match(app, /onSubmittedWorkDone/);
  assert.match(world, /function\* buildSimpleHongKongWorldSteps/);
  assert.match(world, /yield 'Building Hong Kong/);
  assert.match(read('js/cities/hongkong/index.js'), /await buildHongKongWorldAsync/);
  assert.match(read('js/main.js'), /無法取得下載百分比/);
});


test('terrain and roads report actual processed rows and records as separate phase percentages', () => {
  const full = read('js/cities/hongkong/full-world.js');
  const app = read('js/app.js');
  assert.match(full, /done: row, total: grid\.h - 1/);
  assert.match(full, /done: wayId, total: HK_FULL_ROADS\.roads\.length/);
  assert.match(full, /done: roadChunksDone, total: chunks\.size \+ bridgeChunks\.size/);
  assert.match(app, /Math\.floor\(done \/ status\.total \* 100\)/);
  assert.match(app, /setLoadingProgress\(done \/ status\.total\)/);
  assert.match(full, /runLoadingSteps\(buildFullHongKongWorldSteps\(root, options\)\)/);
});
