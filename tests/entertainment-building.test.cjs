const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('Entertainment Building uses mapped podium, tower, stepped crown and open mapped entrances',async()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>{t[k]=v;return true}})})};
 const THREE=await import('three/webgpu');
 const a=await import('../js/cities/hongkong/entertainment-building-architecture.js');
 const {buildEntertainmentBuilding}=await import('../js/cities/hongkong/entertainment-building-world.js');
 const {harbourCityLocalToWorld}=await import('../js/cities/hongkong/harbour-city-architecture.js');
 const {fullRoadSurfaceAt}=await import('../js/cities/hongkong/full-meta.js');
 assert.equal(a.ENTERTAINMENT_PODIUM_SOURCE.id,233135905);assert.equal(a.ENTERTAINMENT_TOWER_SOURCE.id,233135920);assert.equal(a.ENTERTAINMENT_SETBACK_SOURCE.id,1284550012);assert.equal(a.ENTERTAINMENT_CAP_SOURCE.id,1284550018);
 const b=buildEntertainmentBuilding(new THREE.Group());assert.equal(b.stats.entertainmentHeight,186.5);assert.ok(b.stats.entertainmentWindowPanels>500);
 for(const name of ['Entertainment Building diamond window lattice','Entertainment Building monumental columns','Entertainment Building sloped metal pyramid roof','Entertainment Building lantern dome','Entertainment Building glazed shopfronts'])assert.ok(b.group.getObjectByName(name),name);
 for(const s of [a.ENTERTAINMENT_PODIUM,a.ENTERTAINMENT_TOWER])for(let edge=0;edge<s.localRing.length/2-1;edge++){let i=edge*2;for(let k=0;k<=20;k++){let t=k/20,p=harbourCityLocalToWorld(s,s.localRing[i]*(1-t)+s.localRing[i+2]*t,s.localRing[i+1]*(1-t)+s.localRing[i+3]*t);assert.equal(fullRoadSurfaceAt(p.x,p.z,.35),null,`road at ${s.osmId} edge ${edge}`);}}
 const s=a.ENTERTAINMENT_PODIUM,overlaps=(p,y)=>b.colliders.some(c=>{if(y<c.minY||y>c.maxY)return false;let x=p.x-c.obb.cx,z=p.z-c.obb.cz;return Math.abs(x*c.obb.cs-z*c.obb.sn)<c.obb.hx&&Math.abs(x*c.obb.sn+z*c.obb.cs)<c.obb.hz;});
 for(const [edge,vertex] of [[13,1],[14,0]]){const i=edge*2,dx=s.localRing[i+2]-s.localRing[i],dz=s.localRing[i+3]-s.localRing[i+1],length=Math.hypot(dx,dz);for(const d of [0,0.8,1.6]){const t=vertex?1-d/length:d/length,p=harbourCityLocalToWorld(s,s.localRing[i]+dx*t,s.localRing[i+1]+dz*t);assert.equal(overlaps(p,b.stats.entertainmentGround+2),false,`entrance ${edge}, ${d}`);assert.equal(overlaps(p,b.stats.entertainmentGround+5),true);}}
});
test('Entertainment Building is integrated with the world',()=>{const s=fs.readFileSync(path.join(__dirname,'../js/cities/hongkong/simple-world.js'),'utf8');for(const x of ['buildEntertainmentBuilding(scene)','...entertainmentBuilding.landmarks','...entertainmentBuilding.colliders','...entertainmentBuilding.stats'])assert.ok(s.includes(x),x);});
