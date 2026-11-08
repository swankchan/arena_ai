const {test}=require('node:test'),assert=require('node:assert/strict');
test('Kennedy steel bridge crosses the sampled road without lowering its surface',async()=>{
 const THREE=await import('three/webgpu');const {buildPeakTramKennedyBridge,KENNEDY_BRIDGE_POINTS,kennedyBridgeFrame}=await import('../js/cities/hongkong/peak-tram-kennedy-bridge.js');
 const {fullRoadSurfaceAt}=await import('../js/cities/hongkong/full-meta.js');const {hongKongTerrainHeight}=await import('../js/cities/hongkong/terrain.js');
 const b=buildPeakTramKennedyBridge(new THREE.Group());let samples=0,min=Infinity;
 for(const n of ['Kennedy bridge steel side trusses','Kennedy bridge end supports','Kennedy bridge support pads','Kennedy bridge paired rails','Kennedy bridge sleepers','Kennedy bridge dark track decking','Kennedy bridge side walkways'])assert.ok(b.group.getObjectByName(n),n);
 for(let i=1;i<KENNEDY_BRIDGE_POINTS.length;i++){
  const a=KENNEDY_BRIDGE_POINTS[i-1],c=KENNEDY_BRIDGE_POINTS[i],{nx,nz}=kennedyBridgeFrame(a,c),length=Math.hypot(c.x-a.x,c.z-a.z),n=Math.ceil(length/.5);
  for(let j=0;j<=n;j++)for(let o=-2.4;o<=2.4;o+=.4){let t=j/n,x=a.x+(c.x-a.x)*t+nx*o,z=a.z+(c.z-a.z)*t+nz*o,y=a.y+(c.y-a.y)*t,r=fullRoadSurfaceAt(x,z,0,hongKongTerrainHeight(x,z));if(r?.way.id===13131){samples++;min=Math.min(min,y-.41-r.height);}}
 }
 assert.ok(samples>100);assert.ok(min>5.2,`road headroom ${min}`);
 assert.equal(b.colliders.length,4);
 for(const c of b.colliders)for(let x=c.minX-.5;x<=c.maxX+.5;x+=.2)for(let z=c.minZ-.5;z<=c.maxZ+.5;z+=.2)assert.equal(fullRoadSurfaceAt(x,z,0,hongKongTerrainHeight(x,z)),null,'support overlaps a road');
});
