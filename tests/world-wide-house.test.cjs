const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), pc=require('polygon-clipping');
const ringOf = ring => ring.reduce((a,v,i,arr) => (i%2 ? a : [...a,[v,arr[i+1]]]),[]);
test('World-Wide House uses a mapped podium and a traced, not surveyed, stepped floorplate',async()=>{
  const a=await import('../js/cities/hongkong/world-wide-house-architecture.js');
  assert.equal(a.WORLD_WIDE_PODIUM_SOURCE.id,295407372);assert.equal(a.WORLD_WIDE_PODIUM_SOURCE.version,9);
  const outer=[ringOf(a.WORLD_WIDE_PODIUM.localRing)], lower=[ringOf(a.WORLD_WIDE_TOWER_RING)], upper=[ringOf(a.WORLD_WIDE_HIGH_RING)];
  assert.deepEqual(pc.difference([lower],[outer]),[], 'office outline must fit inside podium');
  assert.deepEqual(pc.difference([upper],[lower]),[], 'upper portion must fit on lower tower');
  assert.ok(a.WORLD_WIDE_TOWER_RING.length>20);assert.ok(a.WORLD_WIDE_LOWER_HEIGHT<a.WORLD_WIDE_HEIGHT);
});
test('World-Wide House renders detailed tower, screen and mapped entrance gaps',async()=>{
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)})})};
  const THREE=await import('three/webgpu'); const a=await import('../js/cities/hongkong/world-wide-house-architecture.js');
  const {buildWorldWideHouse}=await import('../js/cities/hongkong/world-wide-house-world.js');
  const {harbourCityLocalToWorld}=await import('../js/cities/hongkong/harbour-city-architecture.js');
  const b=buildWorldWideHouse(new THREE.Group()); assert.ok(b.stats.worldWideHouseWindowPanels>1000);
  for(const name of ['World-Wide House lower stepped tower blue reflective glazing','World-Wide House taller tower blue reflective glazing','World-Wide House lower stepped tower dark horizontal service band','World-Wide House blue streetfront screen','World-Wide House retail glazing'])assert.ok(b.group.getObjectByName(name),name);
  const overlapping=(p,y)=>b.colliders.some(c=>{if(y<c.minY||y>c.maxY)return false;const x=p.x-c.obb.cx,z=p.z-c.obb.cz;return Math.abs(x*c.obb.cs-z*c.obb.sn)<c.obb.hx&&Math.abs(x*c.obb.sn+z*c.obb.cs)<c.obb.hz;});
  const s=a.WORLD_WIDE_PODIUM;
  for(const [edge,vertex] of [[2,1],[3,0],[3,1],[4,0]]) {
    const i=edge*2,dx=s.localRing[i+2]-s.localRing[i],dz=s.localRing[i+3]-s.localRing[i+1],length=Math.hypot(dx,dz);
    for(const d of [.3,1]){const t=vertex?1-d/length:d/length,p=harbourCityLocalToWorld(s,s.localRing[i]+dx*t,s.localRing[i+1]+dz*t);assert.equal(overlapping(p,b.stats.worldWideHouseGround+2),false,`entrance edge ${edge} at ${d}m`);assert.equal(overlapping(p,b.stats.worldWideHouseGround+6),true);}
  }
});
test('World-Wide House is wired into world landmarks, collision and stats',()=>{
 const s=fs.readFileSync('js/cities/hongkong/simple-world.js','utf8');
 for(const v of ['buildWorldWideHouse(scene)','...worldWideHouse.colliders','...worldWideHouse.landmarks','...worldWideHouse.stats','worldWideHouse.landmarks.length'])assert.ok(s.includes(v),v);
});
