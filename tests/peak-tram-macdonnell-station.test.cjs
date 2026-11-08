const {test}=require('node:test'),assert=require('node:assert/strict');
test('MacDonnell platform is west of the trial track, with a terrain cut and no sampled road overlap',async()=>{
 const THREE=await import('three/webgpu');
 const {macDonnellTrackPoint:point,MACDONNELL_PLATFORM_END:end,buildMacDonnellStation:build}=await import('../js/cities/hongkong/peak-tram-macdonnell-station.js');
 const {MACDONNELL_PLATFORM_START:start,kennedyApproachCuts}=await import('../js/cities/hongkong/peak-tram-kennedy-approach-site.js');
 const {hongKongTerrainHeight:ground}=await import('../js/cities/hongkong/terrain.js');const {fullRoadSurfaceAt:road}=await import('../js/cities/hongkong/full-meta.js');
 const cuts=kennedyApproachCuts();const inside=(x,z,r)=>Math.abs((x-r.cx)*r.ux+(z-r.cz)*r.uz)<=r.hx+1e-7&&Math.abs(-(x-r.cx)*r.uz+(z-r.cz)*r.ux)<=r.hz+1e-7;
 assert.ok(end-start>19&&end-start<21);
 for(let s=start+.1;s<end-.1;s+=.3){const p=point(s);assert.ok(p.nx<0,'west side must face west');for(let off=1.7;off<=3.9;off+=.2){const x=p.x+p.nx*off,z=p.z+p.nz*off,g=ground(x,z);assert.equal(road(x,z,.1,g),null,`platform road overlap at ${s}`);if(g-.08>p.y+.5)assert.ok(cuts.some(r=>inside(x,z,r)),`buried platform at ${s}`);}}
 const result=build(new THREE.Group());assert.ok(result.stats.peakTramMacDonnellPlatformSteps>30);for(const name of ['MacDonnell stepped platform','MacDonnell step risers','MacDonnell yellow platform edge','MacDonnell shelter roof','MacDonnell guard rails','MacDonnell timber bench','MacDonnell shelter night lamps','MacDonnell station name board'])assert.ok(result.group.getObjectByName(name),name);
});
test('MacDonnell visual station is installed alongside existing approach',()=>{const fs=require('node:fs'),s=fs.readFileSync('js/cities/hongkong/simple-world.js','utf8');assert.match(s,/buildMacDonnellStation\(scene\)/);assert.match(s,/peakTramMacDonnell\.stats/);});
