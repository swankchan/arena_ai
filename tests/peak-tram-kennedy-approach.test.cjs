const {test}=require('node:test'),assert=require('node:assert/strict');
test('Kennedy approach joins the built bridge and cuts only its local terrain corridor',async()=>{
 const THREE=await import('three/webgpu');
 const {KENNEDY_APPROACH_POINTS:points,kennedyApproachCuts}=await import('../js/cities/hongkong/peak-tram-kennedy-approach-site.js');
 const {KENNEDY_BRIDGE_POINTS:bridge}=await import('../js/cities/hongkong/peak-tram-kennedy-bridge.js');
 const {buildPeakTramKennedyApproach}=await import('../js/cities/hongkong/peak-tram-kennedy-approach.js');
 const {hongKongTerrainHeight}=await import('../js/cities/hongkong/terrain.js');
 const {fullRoadSurfaceAt}=await import('../js/cities/hongkong/full-meta.js');
 assert.equal(points[0].id,bridge.at(-1).id);assert.equal(points[0].y,bridge.at(-1).y);assert.equal(points.at(-1).id,'n6534947838');
 const cuts=kennedyApproachCuts();assert.ok(cuts.length>0&&cuts.length<points.length);
 for(const rect of cuts)assert.ok(rect.hz<=1.6&&rect.hx<1.2);
 const inRect=(p,r)=>{let x=p.x-r.cx,z=p.z-r.cz;return Math.abs(x*r.ux+z*r.uz)<=r.hx&&Math.abs(-x*r.uz+z*r.ux)<=r.hz;};
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
  for(let t=0;t<=1;t+=.25)for(let off=-3.5;off<=3.5;off+=.5){
   const x=a.x+dx*t+nx*off,z=a.z+dz*t+nz*off,y=a.y+(b.y-a.y)*t,ground=hongKongTerrainHeight(x,z);
   assert.equal(fullRoadSurfaceAt(x,z,0,ground),null,'road overlaps approach');
   if(Math.abs(off)<=1.0&&ground-.08>y-.30)assert.ok(cuts.some(r=>inRect({x,z},r)),`uncut track at ${a.s}`);
  }
 }
 const b=buildPeakTramKennedyApproach(new THREE.Group());assert.ok(b.stats.peakTramKennedyApproachSegments>30);assert.ok(b.colliders.length>0);
 for(const c of b.colliders)for(let x=c.minX-.5;x<=c.maxX+.5;x+=.2)for(let z=c.minZ-.5;z<=c.maxZ+.5;z+=.2)assert.equal(fullRoadSurfaceAt(x,z,0,hongKongTerrainHeight(x,z)),null,'pier intersects road');
 for(const name of ['Kennedy approach rails','Kennedy approach sleepers','Kennedy approach track bed','Kennedy approach retaining walls','Kennedy approach support piers'])assert.ok(b.group.getObjectByName(name),name);
});
test('the terrain corridor and approach are installed in the unified world',()=>{
 const fs=require('node:fs');assert.match(fs.readFileSync('js/cities/hongkong/full-world.js','utf8'),/\.\.\.kennedyApproachCuts\(\)/);
 const s=fs.readFileSync('js/cities/hongkong/simple-world.js','utf8');assert.match(s,/buildPeakTramKennedyApproach\(scene\)/);assert.match(s,/\.\.\.peakTramKennedyApproach\.stats/);assert.match(s,/\.\.\.peakTramKennedyApproach\.colliders/);
});
