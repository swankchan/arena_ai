const {test}=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');

test('profile solver respects bounds and grade, including future constraints',async()=>{
 const {solveProfile}=await import('../tools/cities/hongkong/peak-tram-profile.mjs');
 const points=[{s:0,target:10},{s:10,target:10,max:3},{s:20,target:0,min:5,max:5}];
 const r=solveProfile(points,.5);
 assert.equal(r.feasible,true);
 r.heights.forEach((y,i)=>{assert.ok(y>=(points[i].min??-Infinity)-1e-9);assert.ok(y<=(points[i].max??Infinity)+1e-9);if(i){const d=y-r.heights[i-1];assert.ok(d>=-1e-9&&d<=5+1e-9);}});
 assert.equal(solveProfile([{s:0,target:0,max:0},{s:1,target:10,min:10}],.5).feasible,false);
 assert.throws(()=>solveProfile([{s:1,target:0},{s:1,target:0}],.5),RangeError);
});
test('experimental scene report flags unknown crossings and rough profile',()=>{
 const report=JSON.parse(execFileSync(process.execPath,['tools/cities/hongkong/check-peak-tram-profile.mjs'],{encoding:'utf8'}));
 assert.equal(report.results.length,2);
 for(const r of report.results){assert.equal(r.feasible,true);assert.ok(r.unknownRoadSamples>0);assert.ok(r.constrainedSamples>0);assert.ok(r.maxGradeObserved<=report.maxGrade+1e-9);assert.equal(r.upperRail,395.45);assert.ok(r.maxAdjacentGradeChange>.1);}
 assert.ok(report.limitations.some(s=>s.includes('not actual meshes')));
});
