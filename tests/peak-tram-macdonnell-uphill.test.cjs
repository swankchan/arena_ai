const {test}=require('node:test'),assert=require('node:assert/strict');
test('track continues from MacDonnell to the mapped former Bowen stop without sampled road intrusion',async()=>{
 const {KENNEDY_APPROACH_POINTS:p}=await import('../js/cities/hongkong/peak-tram-kennedy-approach-site.js');
 const {hongKongTerrainHeight:ground}=await import('../js/cities/hongkong/terrain.js'),{fullRoadSurfaceAt:road}=await import('../js/cities/hongkong/full-meta.js');
 const start=p.findIndex(q=>q.id==='n988059698');assert.ok(start>0);const end=p.findIndex(q=>q.id==='n13329898979');assert.ok(end>start);assert.ok(p[end].s-p[start].s>52);
 for(let i=start+1;i<=end;i++){const a=p[i-1],b=p[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),nx=-dz/l,nz=dx/l;
  for(let t=0;t<=1;t+=.2)for(let off=-3.5;off<=3.5;off+=.5){const x=a.x+dx*t+nx*off,z=a.z+dz*t+nz*off;assert.equal(road(x,z,0,ground(x,z)),null,`unexpected road at ${a.s}`);}
 }
});
