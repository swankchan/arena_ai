const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const test = require('node:test');

test('experimental fit stays offline and exposes tunnel clearance risk', () => {
  const fit=JSON.parse(fs.readFileSync('tools/data/hongkong/happy-valley-experimental-fit.json','utf8'));
  assert.equal(fit.status,'experimental-not-used-in-runtime');
  assert.equal(fit.points.length,720);
  const runtime=fs.readFileSync('js/cities/hongkong/happy-valley-racecourse-architecture.js','utf8');
  assert.ok(!runtime.includes('happy-valley-experimental-fit'));
  const report=JSON.parse(execFileSync(process.execPath,['tools/cities/hongkong/check-happy-valley-fit.mjs'],{encoding:'utf8'}));
  assert.equal(report.outside,0); assert.equal(report.pitch,0); assert.equal(report.stand,0);
  assert.equal(report.mappedStandsChecked,6); assert.deepEqual(report.standIds,{});
  assert.equal(report.sameLevel,0);
  assert.ok(report.samplesWithRoadUnder5m>0, 'the remaining tunnel risk must not be lost');
  assert.ok(report.minSampledClearanceMetres<4.5);
  assert.ok(report.roadIds['43020']<4.5);
});
