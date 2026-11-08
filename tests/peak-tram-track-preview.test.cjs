const {test}=require('node:test');const assert=require('node:assert/strict');
test('full experimental profile connects shared branches and limits grades and curvature',async()=>{
 const {PEAK_TRAM_PROFILE:p}=await import('../js/cities/hongkong/peak-tram-profile-data.js');
 const A=p.routes.A,B=p.routes.B;assert.ok(A.length>600&&B.length>600);
 const byId=new Map(A.map(x=>[x.id,x]));let shared=0;
 for(const x of B){const a=byId.get(x.id);if(a){shared++;assert.ok(Math.abs(a.y-x.y)<1e-7);}}
 assert.ok(shared>150);assert.ok(p.unknown.length>0);
 for(const r of [A,B])for(let i=1;i<r.length;i++){
  const a=r[i-1],b=r[i],d=b.s-a.s,grade=(b.y-a.y)/d;assert.ok(d>0&&d<=2.000001);assert.ok(grade>=-1e-5&&grade<=p.maxGrade+1e-5);
  if(i>1){const c=r[i-2],prev=(a.y-c.y)/(a.s-c.s);assert.ok(Math.abs(grade-prev)<=p.curvaturePerMetre*(d+a.s-c.s)/2+1e-4);}
 }
});
test('sampled road audit reports known clearances and keeps unknown crossings visible',()=>{
 const {execFileSync}=require('node:child_process');
 const result=JSON.parse(execFileSync(process.execPath,['tools/cities/hongkong/check-peak-tram-joint-profile.mjs'],{encoding:'utf8'}));
 for(const r of result.report){assert.ok(r.knownSamples>0);assert.equal(r.violations,0);assert.ok(r.unknownSamples>0);assert.ok(r.maxBurial>5);}
});
test('preview builds both rails and sleepers without enabling the unfinished line in the game',async()=>{
 const {buildPeakTramTrackPreview}=await import('../js/cities/hongkong/peak-tram-track-preview.js');const b=buildPeakTramTrackPreview();
 assert.ok(b.segments>800);for(const n of ['Peak Tram preview paired rails','Peak Tram preview sleepers','Peak Tram preview track bed'])assert.ok(b.group.getObjectByName(n));
 const fs=require('node:fs');assert.doesNotMatch(fs.readFileSync('js/cities/hongkong/simple-world.js','utf8'),/buildPeakTramTrackPreview/);
});
