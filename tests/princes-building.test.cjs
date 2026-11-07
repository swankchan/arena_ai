const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
test('Prince’s Building uses separate OSM tower and retail podium with detailed windows and open entrance',async()=>{
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>{t[k]=v;return true;}})})};
  const THREE=await import('three/webgpu');
  const {PRINCES_TOWER:t,PRINCES_PODIUM:p,PRINCES_HEIGHT_ESTIMATE:h}=await import('../js/cities/hongkong/princes-building-architecture.js');
  const {buildPrincesBuilding}=await import('../js/cities/hongkong/princes-building-world.js');
  const {harbourCityLocalToWorld}=await import('../js/cities/hongkong/harbour-city-architecture.js');
  const {fullRoadSurfaceAt}=await import('../js/cities/hongkong/full-meta.js');
  const b=buildPrincesBuilding(new THREE.Group());assert.equal(t.osmId,107324768);assert.equal(p.osmId,42293788);assert.equal(h,110);
  assert.ok(b.stats.princesBuildingOfficeWindows>1000);assert.ok(b.stats.princesBuildingRetailBays>40);
  for(const n of ['Prince’s Building concrete window grid and corner panel joints','Prince’s Building recessed dark office windows','LANDMARK PRINCE’S glazed shopfronts and entrances','LANDMARK PRINCE’S dressed stone retail panels','LANDMARK PRINCE’S bronze retail panels','Prince’s Building bilingual entrance sign']) assert.ok(b.group.getObjectByName(n),n);
  const overlap=(point,y)=>b.colliders.some(c=>{if(y<c.minY||y>c.maxY)return false;const x=point.x-c.obb.cx,z=point.z-c.obb.cz;return Math.abs(x*c.obb.cs-z*c.obb.sn)<c.obb.hx && Math.abs(x*c.obb.sn+z*c.obb.cs)<c.obb.hz;});
  const i=3*2,dx=p.localRing[i+2]-p.localRing[i],dz=p.localRing[i+3]-p.localRing[i+1],len=Math.hypot(dx,dz);
  for(const offset of [-1.55,0,1.55]) {
    const t=.5+offset/len, q=harbourCityLocalToWorld(p,p.localRing[i]+t*dx,p.localRing[i+1]+t*dz);
    assert.equal(fullRoadSurfaceAt(q.x,q.z,.1),null);assert.equal(overlap(q,b.stats.princesBuildingGround+2),false);
    assert.equal(overlap(q,b.stats.princesBuildingGround+5),true);
  }
});
test('Prince’s Building is integrated with world landmarks and collisions',()=>{
  const s=fs.readFileSync(path.join(__dirname,'../js/cities/hongkong/simple-world.js'),'utf8');
  for(const text of ['buildPrincesBuilding(scene)','...princesBuilding.landmarks','...princesBuilding.colliders','...princesBuilding.stats'])assert.ok(s.includes(text),text);
});
