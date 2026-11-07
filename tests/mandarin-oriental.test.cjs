const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('Mandarin Oriental Connaught Road, not Landmark hotel, has its own parcel and photo-directed facade',async()=>{
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>{t[k]=v;return true}})})};
  const THREE=await import('three/webgpu');
  const {MANDARIN_ORIENTAL_SITE:s,MANDARIN_ORIENTAL_SOURCE:source,MANDARIN_ORIENTAL_ENTRANCE_EDGE:e}=await import('../js/cities/hongkong/mandarin-oriental-architecture.js');
  const {buildMandarinOriental}=await import('../js/cities/hongkong/mandarin-oriental-world.js');
  const {harbourCityLocalToWorld}=await import('../js/cities/hongkong/harbour-city-architecture.js');
  const {fullRoadSurfaceAt}=await import('../js/cities/hongkong/full-meta.js');
  assert.equal(s.photoDirected,true);
  for(let edge=0;edge<s.localRing.length/2-1;edge++) {let i=edge*2;for(let step=0;step<=20;step++){const t=step/20,p=harbourCityLocalToWorld(s,s.localRing[i]*(1-t)+s.localRing[i+2]*t,s.localRing[i+1]*(1-t)+s.localRing[i+3]*t);assert.equal(fullRoadSurfaceAt(p.x,p.z,.35),null,`road at edge ${edge}`);}}
  assert.equal(source.id,42293822);assert.equal(source.tags.landuse,'commercial');assert.match(source.evidence,/not a surveyed building footprint/);
  const b=buildMandarinOriental(new THREE.Group());assert.equal(b.stats.mandarinOrientalEstimatedHeight,92);assert.ok(b.stats.mandarinOrientalWindows>1000);
  for(const n of ['Mandarin Oriental rooftop name and fan','Mandarin Oriental entrance gold lettering','Mandarin Oriental stone piers and horizontal floor bands','Mandarin Oriental post-renovation guestroom glazing','Mandarin Oriental black granite podium and roof plant'])assert.ok(b.group.getObjectByName(n),n);
  const overlaps=(p,y)=>b.colliders.some(c=>{if(y<c.minY||y>c.maxY)return false;let x=p.x-c.obb.cx,z=p.z-c.obb.cz;return Math.abs(x*c.obb.cs-z*c.obb.sn)<c.obb.hx&&Math.abs(x*c.obb.sn+z*c.obb.cs)<c.obb.hz;});
  const i=e*2,dx=s.localRing[i+2]-s.localRing[i],dz=s.localRing[i+3]-s.localRing[i+1],len=Math.hypot(dx,dz);
  for(const offset of [-1.55,0,1.55]) {const t=.5+offset/len,p=harbourCityLocalToWorld(s,s.localRing[i]+dx*t,s.localRing[i+1]+dz*t);assert.equal(overlaps(p,b.stats.mandarinOrientalGround+2),false);assert.equal(overlaps(p,b.stats.mandarinOrientalGround+5),true);}
});
test('Mandarin Oriental participates in the simple world',()=>{let s=fs.readFileSync(path.join(__dirname,'../js/cities/hongkong/simple-world.js'),'utf8');for(const x of ['buildMandarinOriental(scene)','...mandarinOriental.landmarks','...mandarinOriental.colliders','...mandarinOriental.stats'])assert.ok(s.includes(x),x);});
