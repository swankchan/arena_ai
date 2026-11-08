const {test}=require('node:test'),assert=require('node:assert/strict');
test('Brewin Path keeps centreline and graph links while its estimated narrower ribbon clears the rails',async()=>{
 const {HK_FULL_ROADS:original}=await import('../js/hk-full-roads-data.js'),{HK_FULL_ROADS:roads}=await import('../js/cities/hongkong/building-priority-roads.js');
 const before=original.roads[39703],after=roads.roads[39703];assert.equal(before[1],8.5);assert.equal(after[1],4.8);assert.equal(after[3],2);assert.deepEqual(after[5],before[5]);
 const {GEO}=await import('../js/hk-geodata.js');const {buildTrafficRouteGeometry,trafficLaneOffset,trafficRoadPermits}=await import('../js/cities/hongkong/traffic-paths.js');const {paths,routes}=buildTrafficRouteGeometry(GEO.roadGraph.links,GEO.roadGraph.nodes);
 for(const link of [9706,9707]){assert.equal(routes[link].wayId,39703);assert.equal(routes[link].laneWidth,4.8);assert.ok(paths[link].length>=2);assert.ok(trafficRoadPermits(routes[link],8.5,false));assert.equal(trafficRoadPermits(routes[link],8.5,true),false);assert.ok(trafficLaneOffset(4.8)+1<2.4);}
 const {PEAK_TRAM_PROFILE:p}=await import('../js/cities/hongkong/peak-tram-profile-data.js'),{hongKongTerrainHeight:g}=await import('../js/cities/hongkong/terrain.js'),{fullRoadSurfaceAt:road}=await import('../js/cities/hongkong/full-meta.js');let samples=0;
 for(let i=1;i<p.routes.A.length;i++){let a=p.routes.A[i-1],b=p.routes.A[i];if(a.s<363||b.s>390)continue;let dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
  for(let t=0;t<=1;t+=.1)for(let off=-1.65;off<=1.65;off+=.15){let x=a.x+dx*t+nx*off,z=a.z+dz*t+nz*off,r=road(x,z,0,g(x,z));assert.ok(!r||r.way.id!==39703,`road enters track corridor at ${a.s}`);samples++;}}
 assert.ok(samples>2000);
 // Check actual renderer's end extensions and bend-join triangles in plan,
 // not just the nearest-road query's nominal ribbon.
 const clip=(await import('polygon-clipping')).default,f=after[5],width=after[1],roadPolys=[];
 for(let i=2;i<f.length;i+=2){const x=f[i-2],z=f[i-1],dx=f[i]-x,dz=f[i+1]-z,l=Math.hypot(dx,dz),ux=dx/l,uz=dz/l,e=Math.min(1.2,width*.12),nx=uz*width/2,nz=-ux*width/2;const v=[[x-ux*e+nx,z-uz*e+nz],[x-ux*e-nx,z-uz*e-nz],[f[i]+ux*e-nx,f[i+1]+uz*e-nz],[f[i]+ux*e+nx,f[i+1]+uz*e+nz]];roadPolys.push([...v,v[0]]);}
 for(let i=2;i+3<f.length;i+=2){const x=f[i],z=f[i+1];let ax=x-f[i-2],az=z-f[i-1],bx=f[i+2]-x,bz=f[i+3]-z,al=Math.hypot(ax,az),bl=Math.hypot(bx,bz);ax/=al;az/=al;bx/=bl;bz/=bl;const turn=ax*bz-az*bx;if(Math.abs(turn)<.015)continue;const sign=turn>0?1:-1,e=Math.min(1.2,width*.12),h=width/2;roadPolys.push([[x,z],[x+ax*e+sign*az*h,z+az*e-sign*ax*h],[x-bx*e+sign*bz*h,z-bz*e-sign*bx*h],[x,z]]);}
 for(let i=1;i<p.routes.A.length;i++){const a=p.routes.A[i-1],b=p.routes.A[i];if(a.s<360||a.s>390)continue;const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),nx=-dz/l*1.6,nz=dx/l*1.6,v=[[a.x+nx,a.z+nz],[a.x-nx,a.z-nz],[b.x-nx,b.z-nz],[b.x+nx,b.z+nz]];for(const rp of roadPolys)assert.equal(clip.intersection([rp],[[...v,v[0]]]).length,0,'rendered road overlaps rail corridor');}
});
