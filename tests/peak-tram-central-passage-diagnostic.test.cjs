const {test}=require('node:test'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
test('straight trial passage does not claim road headroom or an accessible connection',()=>{
 const d=JSON.parse(execFileSync(process.execPath,['tools/cities/hongkong/check-peak-tram-central-passage.mjs'],{encoding:'utf8'}));
 assert.ok(d.length>95&&d.length<100);assert.ok(d.straight.roadSamples>100);assert.ok(d.straight.minRoadAboveFloor<1.5);assert.equal(d.straight.worst.road,35962);
 assert.ok(d.withHypotheticalLift.minRoadAboveFloor<3.4);assert.ok(d.withHypotheticalLift.samplesBelow3_4m>0);assert.ok(d.limitations.includes('not verified'));
});
