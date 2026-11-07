const test=require('node:test');const assert=require('node:assert/strict');
let M,S,T,terrain,road,arch;
test.before(async()=>{
 global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)})})};
 [M,S,T,terrain,road,arch]=await Promise.all([import('../js/cities/hongkong/revenue-tower-world.js'),import('../js/cities/hongkong/revenue-tower-architecture.js'),import('three/webgpu'),import('../js/cities/hongkong/terrain.js'),import('../js/cities/hongkong/full-meta.js'),import('../js/cities/hongkong/harbour-city-architecture.js')]);
});
test('Revenue Tower has mapped footprint, 181 m roof and detailed glazing',()=>{
 const b=M.buildRevenueTower(new T.Group());assert.equal(S.REVENUE_TOWER_SOURCE.id,27087037);assert.equal(b.stats.revenueTowerHeight,181);
 assert.equal(b.stats.revenueTowerLevels,49);assert.ok(b.stats.revenueTowerGlassPanels>5000);assert.ok(b.stats.revenueTowerEntranceBays>=2);
 assert.ok(b.group.getObjectByName('Revenue Tower black frame and window mullions'));
});
test('nearby road samples and entrance have collision clearance',()=>{
 const b=M.buildRevenueTower(new T.Group()),s=S.REVENUE_TOWER_SITE;let count=0,hits=0;
 for(let x=s.bounds.minX-40;x<s.bounds.maxX+40;x++)for(let z=s.bounds.minZ-40;z<s.bounds.maxZ+40;z++){
  const r=road.fullRoadSurfaceAt(x,z,0,terrain.hongKongTerrainHeight(x,z));if(!r)continue;count++;
  for(const c of b.colliders){if(r.height+4.8<c.minY||r.height+.1>c.maxY)continue;const dx=x-c.obb.cx,dz=z-c.obb.cz;
   if(Math.abs(dx*c.obb.cs-dz*c.obb.sn)<c.obb.hx&&Math.abs(dx*c.obb.sn+dz*c.obb.cs)<c.obb.hz)hits++;}
 }
 assert.ok(count>3000);assert.equal(hits,0);
 const ring=s.localRing, x=ring[2],z=ring[3],world=arch.harbourCityLocalToWorld(s,x,z),ground=terrain.hongKongTerrainHeight(s.x,s.z);
 for(const c of b.colliders){const dx=world.x-c.obb.cx,dz=world.z-c.obb.cz;if(Math.abs(dx*c.obb.cs-dz*c.obb.sn)<c.obb.hx&&Math.abs(dx*c.obb.sn+dz*c.obb.cs)<c.obb.hz)assert.ok(c.minY>=ground+4.9);}
});
test('runtime includes the tower and collision/landmark integration',()=>{
 const fs=require('node:fs');const world=fs.readFileSync('js/cities/hongkong/simple-world.js','utf8');
 assert.match(world,/buildRevenueTower\(scene\)/);assert.match(world,/\.\.\.revenueTower\.colliders/);assert.match(world,/\.\.\.revenueTower\.landmarks/);
 const manifest=JSON.parse(fs.readFileSync('js/app.runtime.manifest.json','utf8'));assert.match(JSON.stringify(manifest),/revenue-tower-world\.js/);
});
