const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

test('Peak Circle Walk uses reproducible OSM centerlines and omits the Harlech branch', async () => {
  execFileSync(process.execPath,['tools/cities/hongkong/build-peak-walk.mjs','--check']);
  const { PEAK_WALK_WAYS }=await import('../js/cities/hongkong/peak-walk-data.js');
  assert.equal(PEAK_WALK_WAYS.length,14);
  assert.ok(!PEAK_WALK_WAYS.some(w=>w.id===155738201));
  assert.ok(PEAK_WALK_WAYS.some(w=>w.bridge && w.name==='Lugard Road'));
  let length=0;
  for(const w of PEAK_WALK_WAYS) {
    assert.equal(w.points.length%2,0);
    for(let i=2;i<w.points.length;i+=2)length+=Math.hypot(w.points[i]-w.points[i-2],w.points[i+1]-w.points[i-1]);
  }
  assert.ok(length>3400 && length<3600);
  // Each open end must either join another OSM way or be one of the two ends near the Peak plaza.
  const ends=PEAK_WALK_WAYS.flatMap(w=>[{id:w.id,x:w.points[0],z:w.points[1]}, {id:w.id,x:w.points.at(-2),z:w.points.at(-1)}]);
  const open=ends.filter(a=>!ends.some(b=>a!==b && a.id!==b.id && Math.hypot(a.x-b.x,a.z-b.z)<.01));
  assert.equal(open.length,2);
  assert.ok(Math.hypot(open[0].x-open[1].x,open[0].z-open[1].z)<10);
});
