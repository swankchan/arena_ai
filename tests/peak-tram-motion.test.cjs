const {test}=require('node:test');const assert=require('node:assert/strict');
test('route distance, interpolation, and pose follow a sloping track without endpoint overrun',async()=>{
 const {measurePeakTramRoute:measure,samplePeakTramRoute:sample,peakTramCarPose:pose}=await import('../js/cities/hongkong/peak-tram-motion.js');
 const r=measure([{x:0,y:0,z:0},{x:30,y:40,z:0}]);assert.equal(r.total,50);assert.deepEqual(sample(r,25),{x:15,y:20,z:0});assert.equal(sample(r,-100).x,0);assert.equal(sample(r,100).x,30);
 const p=pose(r,0,10);assert.equal(p.distance,5);assert.ok(Math.abs(p.pitch-Math.atan2(40,30))<1e-12);assert.ok(Math.abs(p.yaw)<1e-12);assert.ok(Math.abs(p.position.x-3)<1e-12);
 assert.throws(()=>measure([{x:0,y:0,z:0},{x:0,y:0,z:0}]));assert.throws(()=>sample(r,NaN));assert.throws(()=>pose(r,1,51));
});
test('counter-moving cars dwell, reverse, and stay inside both experimental routes',async()=>{
 const {PEAK_TRAM_PROFILE:p}=await import('../js/cities/hongkong/peak-tram-profile-data.js');
 const {measurePeakTramRoute:measure,peakTramExperimentAtTime:motion}=await import('../js/cities/hongkong/peak-tram-motion.js');
 const a=measure(p.routes.A),b=measure(p.routes.B),m=motion(a,b,0),half=16.5;
 assert.equal(m.state,'lower-dwell');assert.equal(m.A.distance,half);assert.equal(m.B.distance,b.total-half);
 let up=motion(a,b,12+m.run/2);assert.equal(up.state,'ascending');assert.ok(Math.abs(up.progress-.5)<1e-12);
 let end=motion(a,b,12+m.run);assert.equal(end.state,'upper-dwell');assert.equal(end.A.distance,a.total-half);assert.equal(end.B.distance,half);
 let down=motion(a,b,24+m.run+m.run/2);assert.equal(down.state,'descending');assert.ok(Math.abs(down.progress-.5)<1e-12);
 assert.deepEqual(motion(a,b,m.period),m);assert.throws(()=>motion(a,b,-1));assert.throws(()=>motion(a,b,0,{speed:0}));
 for(let t=0;t<m.period;t+=.77){const s=motion(a,b,t);assert.ok(s.A.distance>=half-1e-9&&s.A.distance<=a.total-half+1e-9);assert.ok(s.B.distance>=half-1e-9&&s.B.distance<=b.total-half+1e-9);assert.ok(s.progress>=0&&s.progress<=1);}
});
test('motion experiment is isolated from the playable world',()=>{
 const fs=require('node:fs'),world=fs.readFileSync('js/cities/hongkong/simple-world.js','utf8');assert.doesNotMatch(world,/peak-tram-motion|peakTramExperimentAtTime/);
 const page=fs.readFileSync('tests/visual/peak-tram-track.html','utf8');assert.match(page,/peakTramExperimentAtTime/);assert.match(page,/不可乘搭/);
});
