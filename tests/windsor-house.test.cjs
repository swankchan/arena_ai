const test=require('node:test');const assert=require('node:assert/strict');
let M,S,T,terrain,road;
test.before(async()=>{global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)})})};
 [M,S,T,terrain,road]=await Promise.all([import('../js/cities/hongkong/windsor-house-world.js'),import('../js/cities/hongkong/windsor-house-architecture.js'),import('three/webgpu'),import('../js/cities/hongkong/terrain.js'),import('../js/cities/hongkong/full-meta.js')]);});
test('Windsor House has separate mapped retail and tower parts',()=>{
 const b=M.buildWindsorHouse(new T.Group());assert.equal(S.WINDSOR_MALL.osmId,171882809);assert.equal(S.WINDSOR_TOWER.osmId,149401356);assert.equal(b.stats.windsorTowerHeight,140);assert.ok(b.stats.windsorFacadePanels>4000);assert.ok(b.stats.windsorDrivewayPortals>0);assert.ok(b.stats.windsorEntranceBays>0);assert.ok(b.group.getObjectByName('Windsor House magenta crown panels'));assert.ok(b.group.getObjectByName('Chubb Tower stone floor bands'));assert.ok(b.group.getObjectByName('Windsor House retail display graphic'));
});
test('sampled nearby road surfaces retain 4.8m clearance from the colliders',()=>{
 const b=M.buildWindsorHouse(new T.Group()),sites=[S.WINDSOR_MALL,S.WINDSOR_TOWER];let count=0,hits=0;
 for(let x=Math.min(...sites.map(s=>s.bounds.minX))-15;x<Math.max(...sites.map(s=>s.bounds.maxX))+15;x++)for(let z=Math.min(...sites.map(s=>s.bounds.minZ))-15;z<Math.max(...sites.map(s=>s.bounds.maxZ))+15;z++){
  let r=road.fullRoadSurfaceAt(x,z,0,terrain.hongKongTerrainHeight(x,z));if(!r)continue;count++;
  for(let c of b.colliders){if(r.height+4.8<c.minY||r.height+.1>c.maxY)continue;let dx=x-c.obb.cx,dz=z-c.obb.cz;if(Math.abs(dx*c.obb.cs-dz*c.obb.sn)<c.obb.hx&&Math.abs(dx*c.obb.sn+dz*c.obb.cs)<c.obb.hz)hits++;}
 }assert.ok(count>2000);assert.equal(hits,0);
});
test('tower is wired to landmarks and collision arrays',()=>{const src=require('node:fs').readFileSync('js/cities/hongkong/simple-world.js','utf8');assert.match(src,/buildWindsorHouse\(scene\)/);assert.match(src,/\.\.\.windsorHouse\.colliders/);assert.match(src,/\.\.\.windsorHouse\.landmarks/);});
