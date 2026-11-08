const {test}=require('node:test'),assert=require('node:assert/strict');
test('existing lamps and arms clear the built Kennedy bridge and approach without going into roads',async()=>{
 const {HK_STREET_LIGHTS:L}=await import('../js/hk-street-light-data.js');
 const {HK_STREET_LIGHT_CLEARANCE:C}=await import('../js/hk-street-light-clearance-data.js');
 const {peakTramAdjustedStreetLight:adjust}=await import('../js/cities/hongkong/peak-tram-lamp-adjustments.js');
 const {KENNEDY_BRIDGE_POINTS:bridge}=await import('../js/cities/hongkong/peak-tram-kennedy-bridge.js');
 const {KENNEDY_APPROACH_POINTS:approach}=await import('../js/cities/hongkong/peak-tram-kennedy-approach-site.js');
 const {hongKongTerrainHeight:ground}=await import('../js/cities/hongkong/terrain.js');
 const {fullRoadSurfaceAt}=await import('../js/cities/hongkong/full-meta.js');
 const overrides=new Map(C.overrides.map(x=>[x[0],x])),suppressed=new Set(C.suppressed),points=[...bridge,...approach.slice(1)];let moved=0;
 function closest(x,z){let result=null;for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
  const d=Math.hypot(x-a.x-dx*t,z-a.z-dz*t);if(!result||d<result.d)result={d,y:a.y+(b.y-a.y)*t};
 }return result;}
 for(let i=0;i<L.lamps.length;i++){
  if(suppressed.has(i))continue;const l=L.lamps[i];if(l[0]<-320||l[0]>-130||l[1]<580||l[1]>830)continue;
  const ov=overrides.get(i),adj=adjust(i,l,ov),x=adj?.x??l[0]+(ov?.[1]||0)/100,z=adj?.z??l[1]+(ov?.[2]||0)/100,base=ov?ov[3]/100:ground(x,z)+.025;
  if(adj){moved++;assert.equal(fullRoadSurfaceAt(x,z,.5,base),null,`moved lamp ${i} is on a road`);}
  let q=closest(x,z);if(base+9.6>=q.y-.5&&base<=q.y+4)assert.ok(q.d>2.4,`pole ${i} track distance ${q.d}`);
  for(let j=0;j<l[3];j++){const angle=l[2]+Math.PI*j;for(let d=0;d<=2.15;d+=.25){q=closest(x+Math.sin(angle)*d,z+Math.cos(angle)*d);if(base+9.6>=q.y-.5&&base+9.24<=q.y+4)assert.ok(q.d>2.4,`arm ${i} track distance ${q.d}`);}}
 }
 assert.equal(moved,2);
});
test('adjustments fail closed if source data changes',async()=>{
 const {peakTramAdjustedStreetLight:a}=await import('../js/cities/hongkong/peak-tram-lamp-adjustments.js');assert.throws(()=>a(4642,[0,0,0,1],null));assert.equal(a(123,[0,0,0,1],null),null);
});
