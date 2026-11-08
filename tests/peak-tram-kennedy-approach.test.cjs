const {test}=require('node:test'),assert=require('node:assert/strict');
test('Kennedy approach joins the built bridge and cuts only its local terrain corridor',async()=>{
 const THREE=await import('three/webgpu');
 const {KENNEDY_APPROACH_POINTS:points,kennedyApproachCuts}=await import('../js/cities/hongkong/peak-tram-kennedy-approach-site.js');
 const {KENNEDY_BRIDGE_POINTS:bridge}=await import('../js/cities/hongkong/peak-tram-kennedy-bridge.js');
 const {buildPeakTramKennedyApproach}=await import('../js/cities/hongkong/peak-tram-kennedy-approach.js');
 const {hongKongTerrainHeight}=await import('../js/cities/hongkong/terrain.js');
 const {fullRoadSurfaceAt}=await import('../js/cities/hongkong/full-meta.js');
 assert.equal(points[0].id,bridge.at(-1).id);assert.equal(points[0].y,bridge.at(-1).y);assert.equal(points.at(-1).id,'n26412146');
 const cuts=kennedyApproachCuts();assert.ok(cuts.length>0&&cuts.length<points.length);
 for(const rect of cuts)assert.ok(rect.hz<=2.8&&rect.hx<1.2);
 const inRect=(p,r)=>{let x=p.x-r.cx,z=p.z-r.cz;return Math.abs(x*r.ux+z*r.uz)<=r.hx&&Math.abs(-x*r.uz+z*r.ux)<=r.hz;};
 let roadSamples=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
  for(const side of [-1,1]){
   const x=a.x+side*nx*1.6,z=a.z+side*nz*1.6,X=b.x+side*nx*1.6,Z=b.z+side*nz*1.6;
   const ga=hongKongTerrainHeight(x,z),gb=hongKongTerrainHeight(X,Z),ra=fullRoadSurfaceAt(x,z,.35,ga),rb=fullRoadSurfaceAt(X,Z,.35,gb);
   const topA=Math.max(a.y-.27,Math.min(ga-.08,ra?ra.height-.5:Infinity)),topB=Math.max(b.y-.27,Math.min(gb-.08,rb?rb.height-.5:Infinity));
   for(let j=0;j<=20;j++){const t=j/20,xx=x+(X-x)*t,zz=z+(Z-z)*t,r=fullRoadSurfaceAt(xx,zz,0,hongKongTerrainHeight(xx,zz));if(r)assert.ok(topA+(topB-topA)*t<r.height-.1,'retaining wall enters road');}
  }
  for(let t=0;t<=1;t+=.25)for(let off=-3.5;off<=3.5;off+=.5){
   const x=a.x+dx*t+nx*off,z=a.z+dz*t+nz*off,y=a.y+(b.y-a.y)*t,ground=hongKongTerrainHeight(x,z);
   const road=fullRoadSurfaceAt(x,z,0,ground);
   if(road){roadSamples++;assert.ok([418,8998,49091,2062,5701,39703].includes(road.way.id),`unexpected road ${road.way.id}`);if(road.way.id===39703)assert.ok(Math.abs(off)>1.6,'Brewin Path enters track corridor');else assert.ok(road.height-y>5.4,`insufficient underpass clearance at ${a.s}`);}
   if(Math.abs(off)<=1.0&&ground-.08>y-.30)assert.ok(cuts.some(r=>inRect({x,z},r)),`uncut track at ${a.s}`);
  }
 }
 assert.ok(roadSamples>100,'expected MacDonnell Road overpass');
 const b=buildPeakTramKennedyApproach(new THREE.Group());assert.ok(b.stats.peakTramKennedyApproachSegments>60);assert.ok(b.colliders.length>0);
 for(const c of b.colliders)for(let x=c.minX-.5;x<=c.maxX+.5;x+=.2)for(let z=c.minZ-.5;z<=c.maxZ+.5;z+=.2)assert.equal(fullRoadSurfaceAt(x,z,0,hongKongTerrainHeight(x,z)),null,'pier intersects road');
 for(const name of ['Kennedy approach rails','Kennedy approach sleepers','Kennedy approach track bed','Kennedy approach retaining walls','Kennedy approach support piers'])assert.ok(b.group.getObjectByName(name),name);
});
test('the terrain corridor and approach are installed in the unified world',()=>{
 const fs=require('node:fs');assert.match(fs.readFileSync('js/cities/hongkong/full-world.js','utf8'),/\.\.\.kennedyApproachCuts\(\)/);
 const s=fs.readFileSync('js/cities/hongkong/simple-world.js','utf8');assert.match(s,/buildPeakTramKennedyApproach\(scene\)/);assert.match(s,/\.\.\.peakTramKennedyApproach\.stats/);assert.match(s,/\.\.\.peakTramKennedyApproach\.colliders/);
});
