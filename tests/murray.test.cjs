const test=require('node:test'),assert=require('node:assert/strict');let M,A,T,terrain,road,collision,util,b;
test.before(async()=>{
 global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)})})};
 [M,A,T,terrain,road,collision,util]=await Promise.all([import('../js/cities/hongkong/murray-world.js'),import('../js/cities/hongkong/murray-architecture.js'),import('three/webgpu'),import('../js/cities/hongkong/terrain.js'),import('../js/cities/hongkong/full-meta.js'),import('../js/cities/hongkong/colliders.js'),import('../js/cities/hongkong/harbour-city-architecture.js')]);b=M.buildMurray(new T.Group());
});
test('Murray mapped site, deep windows and open arcades',()=>{
 const s=A.MURRAY_SITE;assert.equal(s.osmId,85320844);assert.equal(s.source.version,14);assert.equal(s.height,93.83);assert.equal(b.stats.murrayWindows,966);assert.equal(b.stats.murrayArches,22);
 for(const name of ['The Murray precast facade grid','The Murray deep skewed window reveals','The Murray recessed angled glazing','The Murray open arched arcade','The Murray curved arch intrados','The Murray arcade piers','The Murray recessed lobby glazing','The Murray bronze lobby mullions','The Murray terrain-following arcade paving','The Murray indicative bronze arrival ramp','The Murray roof terrace and parapet'])assert.ok(b.group.getObjectByName(name),name);
 b.group.updateMatrixWorld(true);for(let i=0;i<s.localRing.length;i+=2){const p=new T.Vector3(s.localRing[i],0,s.localRing[i+1]).applyMatrix4(b.group.matrixWorld);assert.ok(Math.abs(p.x-s.ring[i])<1e-7);assert.ok(Math.abs(p.z-s.ring[i+1])<1e-7);}
 for(const c of b.colliders){assert.ok(c.minY<c.maxY);for(const k of ['minX','maxX','minZ','maxZ','minY','maxY'])assert.ok(Number.isFinite(c[k]));}
});
test('nearby road surfaces have vehicle-height collider clearance',()=>{
 const s=A.MURRAY_SITE;let count=0,hits=0;
 for(let x=Math.floor(s.bounds.minX)-40;x<=s.bounds.maxX+40;x+=.5)for(let z=Math.floor(s.bounds.minZ)-40;z<=s.bounds.maxZ+40;z+=.5){
  const r=road.fullRoadSurfaceAt(x,z,0,terrain.hongKongTerrainHeight(x,z));if(!r)continue;count++;
  for(const c of b.colliders)if(r.height+4.8>=c.minY&&r.height+.1<=c.maxY&&collision.colliderContains(c,x,z))hits++;
 }console.log(`Murray road samples ${count}; collisions ${hits}`);assert.ok(count>1000);assert.equal(hits,0);
});
test('arcade openings are not filled by facade colliders',()=>{
 const s=A.MURRAY_SITE;
 // East/west long sides: between piers and outside the inset lobby.
 for(const x of [-14.1,14.1])for(const z of [-21.857142857,-14.571428571,-7.285714286,0,7.285714286,14.571428571,21.857142857]){const p=util.harbourCityLocalToWorld(s,x,z);for(const c of b.colliders)assert.equal(collision.colliderContains(c,p.x,p.z),false,`${x},${z}`);}
});
test('active scene includes model, colliders, stats and landmark',()=>{
 const src=require('node:fs').readFileSync('js/cities/hongkong/simple-world.js','utf8');
 for(const re of [/buildMurray\(scene\)/,/\.\.\.murray\.stats/,/\.\.\.murray\.colliders/,/\.\.\.murray\.landmarks/,/murray\.landmarks\.length/])assert.match(src,re);
});
