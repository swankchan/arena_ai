const test=require('node:test'),assert=require('node:assert/strict');let M,A,T,terrain,road,collision,util;
test.before(async()=>{global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)})})};[M,A,T,terrain,road,collision,util]=await Promise.all([import('../js/cities/hongkong/government-house-world.js'),import('../js/cities/hongkong/government-house-architecture.js'),import('three/webgpu'),import('../js/cities/hongkong/terrain.js'),import('../js/cities/hongkong/full-meta.js'),import('../js/cities/hongkong/colliders.js'),import('../js/cities/hongkong/harbour-city-architecture.js')]);});
test('mapped building, entrance, tower, roofs and gate lodges',()=>{
 const b=M.buildGovernmentHouse(new T.Group()),s=A.GOVERNMENT_HOUSE_SITE;assert.equal(s.osmId,42258038);assert.equal(s.source.version,14);assert.equal(b.stats.governmentHouseRoofs,5);assert.equal(b.stats.governmentHouseGateLodges,2);assert.ok(b.stats.governmentHouseWindows>100);assert.equal(b.stats.governmentHouseApronCells,560);
 for(const name of ['Government House central landmark tower and balcony','Government House south entrance glazing','Government House granite carriage porch','Government House dark hipped tiled roofs','Government House sash frames and glazing bars','Government House terrain-following foundation','Government House paired gate lodge walls','Government House terrain-blended entrance apron'])assert.ok(b.group.getObjectByName(name),name);
 b.group.updateMatrixWorld(true);for(let i=0;i<s.localRing.length;i+=2){let v=new T.Vector3(s.localRing[i],0,s.localRing[i+1]).applyMatrix4(b.group.matrixWorld);assert.ok(Math.abs(v.x-s.ring[i])<1e-7);assert.ok(Math.abs(v.z-s.ring[i+1])<1e-7);}
 for(const c of b.colliders){assert.ok(c.minY<c.maxY);for(const key of ['minX','maxX','minZ','maxZ','minY','maxY'])assert.ok(Number.isFinite(c[key]));}
});
test('tower has arched insets and diamond grilles on every face',()=>{
 const b=M.buildGovernmentHouse(new T.Group());
 for(const name of ['Government House arched tower window insets','Government House arched tower window surrounds','Government House tower diamond grilles']){
  const mesh=b.group.getObjectByName(name);assert.ok(mesh,name);const pos=mesh.geometry.getAttribute('position');assert.ok(pos.count>100,name);for(const value of pos.array)assert.ok(Number.isFinite(value));
  mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox;assert.ok(box.min.x<14.4&&box.max.x>21.6,name);assert.ok(box.min.z<-12.6&&box.max.z> -5.4,name);
 }
});
test('tower balcony has rounded geometry and a separate coping',()=>{
 const b=M.buildGovernmentHouse(new T.Group()),rounded=b.group.getObjectByName('Government House rounded tower balcony'),lip=b.group.getObjectByName('Government House tower balcony coping');
 assert.ok(rounded);assert.ok(lip);assert.ok(rounded.geometry.getAttribute('position').count>200);
 rounded.geometry.computeBoundingBox();const bounds=rounded.geometry.boundingBox;
 assert.ok(bounds.min.x<13.7&&bounds.max.x>22.3&&bounds.min.z<-13.3&&bounds.max.z>-4.7);
 assert.ok(bounds.min.y>19.8&&bounds.max.y<21);
});
test('north verandah has separate arched insets, surrounds and parapet vents',()=>{
 const b=M.buildGovernmentHouse(new T.Group());for(const name of ['Government House north verandah arched insets','Government House north verandah arch surrounds','Government House north verandah parapet vents']){
  const mesh=b.group.getObjectByName(name);assert.ok(mesh,name);const p=mesh.geometry.getAttribute('position');assert.ok(p.count>100);for(const value of p.array)assert.ok(Number.isFinite(value));
 }
});
test('boundary wall and iron railings leave the gate drive open',()=>{
 const b=M.buildGovernmentHouse(new T.Group()),s=A.GOVERNMENT_HOUSE_SITE;assert.ok(b.stats.governmentHouseBoundarySegments>=40);
 for(const name of ['Government House garden boundary stone walls','Government House garden boundary wall coping','Government House garden boundary iron railings'])assert.ok(b.group.getObjectByName(name),name);
 for(let x=6;x<=13;x+=.25){const p=util.harbourCityLocalToWorld(s,x,58.5);for(const c of b.colliders)assert.ok(!collision.colliderContains(c,p.x,p.z),`blocked gate at ${x}`);}
});
test('nearby sampled road surfaces do not intersect colliders at vehicle height',()=>{
 const b=M.buildGovernmentHouse(new T.Group()),s=A.GOVERNMENT_HOUSE_SITE;let count=0,hits=0;
 for(let x=Math.floor(s.bounds.minX)-30;x<=s.bounds.maxX+30;x++)for(let z=Math.floor(s.bounds.minZ)-30;z<=s.bounds.maxZ+75;z++){
  const r=road.fullRoadSurfaceAt(x,z,0,terrain.hongKongTerrainHeight(x,z));if(!r)continue;count++;
  for(const c of b.colliders)if(r.height+4.8>=c.minY&&r.height+.1<=c.maxY&&collision.colliderContains(c,x,z))hits++;
 }assert.ok(count>2000,`road samples ${count}`);assert.equal(hits,0,`${hits} samples obstructed`);
});
test('apron is bounded and blends to terrain, and ground away from it is unchanged',()=>{
 const b=M.buildGovernmentHouse(new T.Group()),s=A.GOVERNMENT_HOUSE_SITE;let raised=0;
 for(let x=-6;x<=8;x+=.5)for(let z=6.4;z<=16.4;z+=.5){const p=util.harbourCityLocalToWorld(s,x,z),raw=terrain.hongKongTerrainHeight(p.x,p.z),h=b.groundHeightAt(p.x,p.z,raw);assert.ok(h>=raw);if(h>raw+.01)raised++;if(x===-6||x===8||Math.abs(z-16.4)<1e-6)assert.ok(Math.abs(h-raw)<1e-6);assert.equal(road.fullRoadSurfaceAt(p.x,p.z,.35,raw),null);}
 assert.ok(raised>10);assert.equal(b.groundHeightAt(0,0,7),7);
});
test('building and apron are wired into active scene',()=>{
 const src=require('node:fs').readFileSync('js/cities/hongkong/simple-world.js','utf8');for(const p of [/buildGovernmentHouse\(scene\)/,/\.\.\.governmentHouse\.colliders/,/\.\.\.governmentHouse\.landmarks/,/\.\.\.governmentHouse\.stats/,/!groundUsesRoad \? governmentHouse\.groundHeightAt/])assert.match(src,p);
});
