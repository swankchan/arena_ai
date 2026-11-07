const test=require('node:test');const assert=require('node:assert/strict');
let M,S,T,terrain,road,arch;
test.before(async()=>{
 global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)})})};
 [M,S,T,terrain,road,arch]=await Promise.all([import('../js/cities/hongkong/general-post-office-world.js'),import('../js/cities/hongkong/general-post-office-architecture.js'),import('three/webgpu'),import('../js/cities/hongkong/terrain.js'),import('../js/cities/hongkong/full-meta.js'),import('../js/cities/hongkong/harbour-city-architecture.js')]);
});
test('mapped postal headquarters parts, architectural features and passage',()=>{
 const result=M.buildGeneralPostOffice(new T.Group());
 assert.equal(S.GPO_SITE.osmId,16281866);assert.equal(S.GPO_WING.osmId,184767036);
 assert.equal(result.stats.generalPostOfficeCanopies,5);assert.ok(result.stats.generalPostOfficeBays>300);
 assert.ok(result.stats.generalPostOfficeEntranceBays>=2);assert.ok(result.stats.generalPostOfficeRoadPortals>0&&result.stats.generalPostOfficeRoadPortals<25);
 assert.ok(result.group.getObjectByName('General Post Office main building projecting window fins'));
 assert.ok(result.group.getObjectByName('General Post Office lower wing'));
});
test('sampled road surfaces retain 4.8m clearance from postal headquarters colliders',()=>{
 const result=M.buildGeneralPostOffice(new T.Group());const sites=[S.GPO_SITE,S.GPO_WING];let count=0,hits=0;
 for(let x=Math.min(...sites.map(s=>s.bounds.minX))-10;x<Math.max(...sites.map(s=>s.bounds.maxX))+10;x+=1)
  for(let z=Math.min(...sites.map(s=>s.bounds.minZ))-10;z<Math.max(...sites.map(s=>s.bounds.maxZ))+10;z+=1){
   const r=road.fullRoadSurfaceAt(x,z,0,terrain.hongKongTerrainHeight(x,z));if(!r)continue;count++;
   for(const c of result.colliders){if(r.height+4.8<c.minY||r.height+.1>c.maxY)continue;const dx=x-c.obb.cx,dz=z-c.obb.cz;
    if(Math.abs(dx*c.obb.cs-dz*c.obb.sn)<c.obb.hx&&Math.abs(dx*c.obb.sn+dz*c.obb.cs)<c.obb.hz)hits++;}
  }
 assert.ok(count>2500);assert.equal(hits,0);
});
test('wing longitudinal walls remain present alongside mapped building passage',()=>{
 const result=M.buildGeneralPostOffice(new T.Group()), y=terrain.hongKongTerrainHeight(S.GPO_SITE.x,S.GPO_SITE.z)+2;
 for(const z of [-5.2855,5.12]) {const p=arch.harbourCityLocalToWorld(S.GPO_WING,0,z);assert.ok(result.colliders.some(c=>{const dx=p.x-c.obb.cx,dz=p.z-c.obb.cz;return y>=c.minY&&y<=c.maxY&&Math.abs(dx*c.obb.cs-dz*c.obb.sn)<c.obb.hx+.25&&Math.abs(dx*c.obb.sn+dz*c.obb.cs)<c.obb.hz+.25;}));}
});
