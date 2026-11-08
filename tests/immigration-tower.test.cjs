const test=require('node:test'),assert=require('node:assert/strict');let M,A,T,terrain,road,collision,util;
test.before(async()=>{global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)})})};[M,A,T,terrain,road,collision,util]=await Promise.all([import('../js/cities/hongkong/immigration-tower-world.js'),import('../js/cities/hongkong/immigration-tower-architecture.js'),import('three/webgpu'),import('../js/cities/hongkong/terrain.js'),import('../js/cities/hongkong/full-meta.js'),import('../js/cities/hongkong/colliders.js'),import('../js/cities/hongkong/harbour-city-architecture.js')]);});
test('mapped tower, curtain wall, frames and night-lit pane attributes',()=>{
 const b=M.buildImmigrationTower(new T.Group());assert.equal(A.IMMIGRATION_TOWER_SOURCE.id,510722228);assert.equal(b.stats.immigrationTowerHeight,180.8);assert.equal(b.stats.immigrationTowerLevels,49);assert.ok(b.stats.immigrationTowerGlassPanels>5000);assert.ok(b.stats.immigrationTowerLitPanels>500);assert.ok(b.stats.immigrationTowerEntranceBays>=2);
 const glass=b.group.getObjectByName('Immigration Tower grey-blue glazed facade');assert.ok(glass.material.emissiveNode);assert.ok(glass.geometry.getAttribute('aLit').array.some(v=>v>0));
 for(const name of ['Immigration Tower dark podium and parapet','Immigration Tower major black frames','Immigration Tower fine curtain wall grid','Immigration Tower roof','Immigration Tower entrance lettering','Immigration Tower garden entrance canopy','Immigration Tower canopy columns'])assert.ok(b.group.getObjectByName(name),name);
 b.group.updateMatrixWorld(true);for(let i=0;i<A.IMMIGRATION_TOWER_SITE.localRing.length;i+=2){const v=new T.Vector3(A.IMMIGRATION_TOWER_SITE.localRing[i],0,A.IMMIGRATION_TOWER_SITE.localRing[i+1]).applyMatrix4(b.group.matrixWorld);assert.ok(Math.abs(v.x-A.IMMIGRATION_TOWER_SITE.ring[i])<1e-7);assert.ok(Math.abs(v.z-A.IMMIGRATION_TOWER_SITE.ring[i+1])<1e-7);}
});
test('road samples clear walls at vehicle height and mapped entrance is open',()=>{
 const b=M.buildImmigrationTower(new T.Group()),s=A.IMMIGRATION_TOWER_SITE;let count=0,hits=0;
 for(let x=Math.floor(s.bounds.minX)-50;x<=s.bounds.maxX+50;x++)for(let z=Math.floor(s.bounds.minZ)-50;z<=s.bounds.maxZ+50;z++){
  const r=road.fullRoadSurfaceAt(x,z,0,terrain.hongKongTerrainHeight(x,z));if(!r)continue;count++;
  for(const c of b.colliders)if(r.height+4.8>=c.minY&&r.height+.1<=c.maxY&&collision.colliderContains(c,x,z))hits++;
 }assert.ok(count>500);assert.equal(hits,0,`${hits} road collisions`);
 const p=util.harbourCityLocalToWorld(s,s.localRing[2],s.localRing[3]);for(const c of b.colliders)if(collision.colliderContains(c,p.x,p.z))assert.ok(c.minY>=b.base+4.99);
});
test('scene integrates tower stats, colliders and landmark',()=>{
 const src=require('node:fs').readFileSync('js/cities/hongkong/simple-world.js','utf8');for(const p of [/buildImmigrationTower\(scene\)/,/\.\.\.immigrationTower\.stats/,/\.\.\.immigrationTower\.colliders/,/\.\.\.immigrationTower\.landmarks/])assert.match(src,p);
});
