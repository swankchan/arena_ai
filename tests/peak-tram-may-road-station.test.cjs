const {test}=require('node:test'),assert=require('node:assert/strict');
test('May Road western platform has a local cut and no sampled road overlap',async()=>{
 const THREE=await import('three/webgpu'),{buildMayRoadStation:build}=await import('../js/cities/hongkong/peak-tram-may-road-station.js'),{intermediateTrackPoint:point}=await import('../js/cities/hongkong/peak-tram-macdonnell-station.js');
 const {MAY_PLATFORM_START:start,MAY_PLATFORM_END:end,kennedyApproachCuts}=await import('../js/cities/hongkong/peak-tram-kennedy-approach-site.js'),{hongKongTerrainHeight:g}=await import('../js/cities/hongkong/terrain.js'),{fullRoadSurfaceAt:road}=await import('../js/cities/hongkong/full-meta.js');
 const cuts=kennedyApproachCuts(),inside=(x,z,r)=>Math.abs((x-r.cx)*r.ux+(z-r.cz)*r.uz)<=r.hx+1e-7&&Math.abs(-(x-r.cx)*r.uz+(z-r.cz)*r.ux)<=r.hz+1e-7;assert.ok(end-start>18&&end-start<21);
 for(let s=start+.1;s<end-.1;s+=.3){const p=point(s,start,end);assert.ok(p.nx<0);for(let off=1.7;off<=3.9;off+=.2){const x=p.x+p.nx*off,z=p.z+p.nz*off,h=g(x,z);assert.equal(road(x,z,.1,h),null);if(h-.08>p.y+.5)assert.ok(cuts.some(r=>inside(x,z,r)),'missing platform cut');}}
 const r=build(new THREE.Group());assert.ok(r.stats.peakTramMayRoadPlatformSteps>30);for(const n of ['May Road stepped platform','May Road yellow platform edge','May Road shelter roof','May Road shelter night lamps','May Road station name board'])assert.ok(r.group.getObjectByName(n));
});
