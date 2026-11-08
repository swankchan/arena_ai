const {test}=require('node:test'),assert=require('node:assert/strict');
test('May Road arch and track remain below sampled road surfaces',async()=>{
 const THREE=await import('three/webgpu');const {MAY_ROAD_BRIDGE_POINTS:p,buildMayRoadBridge:build}=await import('../js/cities/hongkong/peak-tram-may-road-bridge.js');
 const {macDonnellArchSection:section,macDonnellArchHeight:arch}=await import('../js/cities/hongkong/peak-tram-macdonnell-bridge.js');
 const {fullRoadSurfaceAt:road}=await import('../js/cities/hongkong/full-meta.js'),{hongKongTerrainHeight:ground}=await import('../js/cities/hongkong/terrain.js');assert.ok(p.length>=4);
 for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);for(let t=0;t<=1;t+=.1){const q={x:a.x+dx*t,y:a.y+(b.y-a.y)*t,z:a.z+dz*t},s=section(q,dx/l,dz/l,[36167,42840]);
  for(let off=-1.8;off<=1.8;off+=.15){const x=q.x+s.nx*off,z=q.z+s.nz*off,r=road(x,z,0,ground(x,z));assert.ok(r);assert.ok(arch(s,off)+.28<r.height);if(Math.abs(off)<1.36)assert.ok(arch(s,off)-q.y>4.1);}
 }}
 const r=build(new THREE.Group());assert.ok(r.stats.peakTramMayRoadArchSegments>=3);for(const n of ['May Road masonry barrel vault','May Road stone bridge jambs','May Road arch voussoirs'])assert.ok(r.group.getObjectByName(n));
});
