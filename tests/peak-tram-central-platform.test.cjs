const {test}=require('node:test'),assert=require('node:assert/strict');
test('Central platform under Cotton Tree Drive clears sampled road and exposes track above local bed',async()=>{
 const T=await import('three/webgpu'),{buildPeakTramCentralPlatform:build}=await import('../js/cities/hongkong/peak-tram-central-platform.js'),{centralPlatformPoint:p,centralPlatformGroundHeight:ground,centralPlatformTerrainCut:cut,CENTRAL_PLATFORM_END:end}=await import('../js/cities/hongkong/peak-tram-central-platform-site.js'),{fullRoadSurfaceAt:road}=await import('../js/cities/hongkong/full-meta.js'),{hongKongTerrainHeight:g}=await import('../js/cities/hongkong/terrain.js');
 let root=new T.Group(),result=build(root),mesh=result.group.getObjectByName('Central platform track bed');assert.ok(end>32&&end<33);assert.ok(result.group.getObjectByName('Central platform linear night lights').material.emissiveNode);root.updateMatrixWorld(true);let ray=new T.Raycaster();let crossings=0;
 for(let s=.5;s<end;s+=.5){let q=p(s);assert.ok(Math.abs(ground(q.x,q.z,100,q.y)-(q.y-.28))<.05);ray.set(new T.Vector3(q.x,q.y+1,q.z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(mesh);assert.ok(hit.length,`bed hole ${s}`);assert.ok(Math.abs(hit[0].point.y-(q.y-.28))<.05);for(let off=-1.5;off<=1.5;off+=.25){let x=q.x+q.nx*off,z=q.z+q.nz*off,r=road(x,z,.25,g(x,z));if(r){crossings++;assert.ok(r.height-q.y>5.2,`road ${r.way.id} tram clearance at ${s}`);}}}
 assert.ok(crossings>10);let c=cut(),a=p(0);assert.ok(Math.abs((a.x-c.cx)*c.ux+(a.z-c.cz)*c.uz)<=c.hx+.01);
 const source=require('node:fs').readFileSync('js/cities/hongkong/full-world.js','utf8'),world=require('node:fs').readFileSync('js/cities/hongkong/simple-world.js','utf8');assert.match(source,/centralPlatformTerrainCut\(\)/);assert.match(world,/centralPlatformGroundHeight\(x, z, base, referenceY\)/);
});
test('Central approach connects platform to Kennedy bridge, with sampled road-safe supports',async()=>{
 const T=await import('three/webgpu'),{CENTRAL_APPROACH_POINTS:p}=await import('../js/cities/hongkong/peak-tram-central-approach-site.js'),{buildPeakTramCentralApproach:build}=await import('../js/cities/hongkong/peak-tram-central-approach.js'),{CENTRAL_PLATFORM_END:end}=await import('../js/cities/hongkong/peak-tram-central-platform-site.js'),{KENNEDY_BRIDGE_POINTS:k}=await import('../js/cities/hongkong/peak-tram-kennedy-bridge.js'),{fullRoadSurfaceAt:r}=await import('../js/cities/hongkong/full-meta.js'),{hongKongTerrainHeight:g}=await import('../js/cities/hongkong/terrain.js');assert.equal(p[0].s,end);assert.equal(p.at(-1).id,k[0].id);let result=build(new T.Group());assert.ok(result.stats.peakTramCentralApproachSections>20);for(const c of result.colliders)for(let x=c.minX-.2;x<=c.maxX+.2;x+=.2)for(let z=c.minZ-.2;z<=c.maxZ+.2;z+=.2){let v=r(x,z,.2,g(x,z));if(v)assert.ok(c.maxY<v.height-.2||c.minY>v.height+4.5,`support in road ${v.way.id}`);}
});
test('Central approach collision boxes are registered once',()=>{
 const source=require('node:fs').readFileSync('js/cities/hongkong/simple-world.js','utf8');
 assert.equal((source.match(/\.\.\.peakTramCentralApproach\.colliders/g)||[]).length,1);
});
test('person near Central station floor is not snapped to an overhead road; cars still use it',async()=>{
 const {centralPlatformPoint:p,centralPlatformGroundHeight:floor,centralPlatformUnderRoad:under,CENTRAL_PLATFORM_END:end}=await import('../js/cities/hongkong/peak-tram-central-platform-site.js');
 const {fullRoadSurfaceAt:road}=await import('../js/cities/hongkong/full-meta.js'),{hongKongTerrainHeight:terrain}=await import('../js/cities/hongkong/terrain.js');let checked=0;
 for(let s=.5;s<end;s+=.5){const q=p(s);for(let o of [-3,0,3]){let x=q.x+q.nx*o,z=q.z+q.nz*o,r=road(x,z,.35,terrain(x,z));if(!r)continue;let y=floor(x,z,null,q.y);assert.notEqual(y,null);assert.equal(under(x,z,'person',y,r.height),true);assert.equal(under(x,z,'person',r.height,r.height),false);assert.equal(under(x,z,'car',y,r.height),false);checked++;}}
 assert.ok(checked>10);const q=p(1);assert.equal(under(q.x+100,q.z,'person',q.y,q.y+10),false);assert.equal(under(q.x,q.z,'person',NaN,q.y+10),false);
 const source=require('node:fs').readFileSync('js/cities/hongkong/simple-world.js','utf8');assert.match(source,/!centralPlatformUnderRoad\(x, z, mode, referenceY, road.height\)/);
});
test('platform floor detailing remains within sampled station and road clearance',async()=>{
 const T=await import('three/webgpu'),{buildPeakTramCentralPlatform:build}=await import('../js/cities/hongkong/peak-tram-central-platform.js'),{centralPlatformPoint:p,CENTRAL_PLATFORM_END:end,CENTRAL_PLATFORM_HALF_WIDTH:width}=await import('../js/cities/hongkong/peak-tram-central-platform-site.js'),{fullRoadSurfaceAt:road}=await import('../js/cities/hongkong/full-meta.js'),{hongKongTerrainHeight:terrain}=await import('../js/cities/hongkong/terrain.js');
 const result=build(new T.Group()),a=p(0);for(const name of ['Central platform yellow edge','Central platform tactile guidance line','Central platform floor tile joints','Central platform tactile studs']){
  let mesh=result.group.getObjectByName(name);assert.ok(mesh,name);const pos=mesh.geometry.attributes.position;let sampled=0;
  for(let i=0;i<pos.count;i+=Math.max(1,Math.floor(pos.count/600))){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),dx=x-a.x,dz=z-a.z,s=dx*a.ux+dz*a.uz,o=dx*a.nx+dz*a.nz;assert.ok(s>=-.05&&s<=end+.05&&Math.abs(o)<=width+.05,`${name} outside station`);const r=road(x,z,.25,terrain(x,z));if(r){assert.ok(r.height-y>2.5,`${name} hits road ${r.way.id}`);sampled++;}}
 }
});
