const test=require('node:test'),assert=require('node:assert/strict');let M,A,T,terrain,road,collision,util,b;
test.before(async()=>{
 global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)})})};
 [M,A,T,terrain,road,collision,util]=await Promise.all([import('../js/cities/hongkong/murray-world.js'),import('../js/cities/hongkong/murray-architecture.js'),import('three/webgpu'),import('../js/cities/hongkong/terrain.js'),import('../js/cities/hongkong/full-meta.js'),import('../js/cities/hongkong/colliders.js'),import('../js/cities/hongkong/harbour-city-architecture.js')]);b=M.buildMurray(new T.Group());
});
test('Murray mapped site, deep windows and open arcades',()=>{
 const s=A.MURRAY_SITE;assert.equal(s.osmId,85320844);assert.equal(s.source.version,14);assert.equal(s.height,93.83);assert.equal(b.stats.murrayWindows,966);assert.equal(b.stats.murrayArches,22);
 for(const name of ['The Murray precast facade grid','The Murray deep skewed window reveals','The Murray recessed angled glazing','The Murray open arched arcade','The Murray curved arch intrados','The Murray arcade piers','The Murray recessed lobby glazing','The Murray bronze lobby mullions','The Murray terrain-following arcade paving','The Murray former car ramp walkable paving','The Murray roof terrace and parapet'])assert.ok(b.group.getObjectByName(name),name);
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
test('mapped Cassia tree and terrain-following courtyard',async()=>{
 const C=await import('../js/cities/hongkong/murray-courtyard.js');
 assert.equal(A.MURRAY_CASSIA.osmId,12718892293);assert.equal(A.MURRAY_CASSIA.height,17);
 assert.ok(Math.abs(C.MURRAY_TREE_WORLD[0]-83.1565460692)<1e-6);assert.ok(Math.abs(C.MURRAY_TREE_WORLD[1]-431.9404893134)<1e-6);
 assert.ok(b.courtyard.cells>100);assert.equal(b.stats.murrayCassiaTree,12718892293);
 for(const name of ['The Murray Cassia forecourt paving','The Murray Cassia circular planter','The Murray Cassia planter soil','The Murray mapped Cassia tree trunk and branches','The Murray Cassia green canopy','The Murray Cassia illustrative blossoms'])assert.ok(b.group.getObjectByName(name),name);
 const pos=b.group.getObjectByName('The Murray Cassia forecourt paving').geometry.getAttribute('position');
 for(let i=0;i<pos.count;i+=6){
  let x=0,z=0;for(const j of [0,2]){x+=pos.getX(i+j)/2;z+=pos.getZ(i+j)/2;}
  const p=util.harbourCityLocalToWorld(A.MURRAY_SITE,x,z);assert.equal(road.fullRoadSurfaceAt(p.x,p.z,1.05,terrain.hongKongTerrainHeight(p.x,p.z)),null);
  for(let j=0;j<6;j++){const p2=util.harbourCityLocalToWorld(A.MURRAY_SITE,pos.getX(i+j),pos.getZ(i+j));assert.ok(Math.abs(pos.getY(i+j)+b.datum-terrain.hongKongTerrainHeight(p2.x,p2.z)-.035)<.001);}
 }
});

test('ramp surface and height query agree and remain road-clear',async()=>{
 const R=await import('../js/cities/hongkong/murray-ramp.js');const {x0,x1,z0,z1}=R.MURRAY_RAMP;
 assert.equal(b.rampSection.segments,46);
 for(let z=z0;z<=z1;z+=.25){const x=(x0+x1)/2,p=util.harbourCityLocalToWorld(A.MURRAY_SITE,x,z),y=b.datum+R.murrayRampLocalHeight(z),g=terrain.hongKongTerrainHeight(p.x,p.z);
  assert.ok(y-g>.1 && y-g<.8);assert.ok(Math.abs(R.murrayRampGroundHeight(p.x,p.z,g,y,b.datum)-y)<1e-8);assert.equal(road.fullRoadSurfaceAt(p.x,p.z,.5,y),null);
  for(const c of b.colliders)if(y>=c.minY&&y<=c.maxY)assert.equal(collision.colliderContains(c,p.x,p.z),false);
 }
 const p=util.harbourCityLocalToWorld(A.MURRAY_SITE,(x0+x1)/2,0);assert.equal(R.murrayRampGroundHeight(p.x,p.z,1,100,b.datum),1);
 const src=require('node:fs').readFileSync('js/cities/hongkong/simple-world.js','utf8');assert.match(src,/mode === 'person' && !groundUsesRoad \? murray\.groundHeightAt/);
});
test('tree-facing doorway has a continuous human-width approach and lobby floor',async()=>{
 const S=await import('../js/cities/hongkong/murray-lobby-site.js');
 const z=(S.MURRAY_LOBBY.doorMin+S.MURRAY_LOBBY.doorMax)/2;
 for(let x=1;x<=16;x+=.1){
  const p=util.harbourCityLocalToWorld(A.MURRAY_SITE,x,z),base=terrain.hongKongTerrainHeight(p.x,p.z),floor=b.groundHeightAt(p.x,p.z,base,b.interior.floor);
  for(const c of b.colliders)if(floor+1.75>=c.minY&&floor+.1<=c.maxY)
   assert.equal(collision.colliderContains(c,p.x,p.z,.48),false,`blocked at ${x.toFixed(1)} by ${JSON.stringify(c)}`);
 }
 for(const name of ['The Murray lobby polished dark stone floor','The Murray lobby marble joints and bronze inlay','The Murray lobby bronze slatted ceiling','The Murray lobby stone reception and partition','The Murray lobby lounge furniture'])assert.ok(b.group.getObjectByName(name),name);
 const p=util.harbourCityLocalToWorld(A.MURRAY_SITE,0,-15);assert.equal(b.groundHeightAt(p.x,p.z,30,b.interior.floor),b.interior.floor);
 assert.equal(S.murrayLobbyGroundHeight(p.x,p.z,30,b.interior.floor+10,b.datum),30);
});
test('lobby terrain cut stays within the building and off sampled roads',async()=>{
 const S=await import('../js/cities/hongkong/murray-lobby-site.js'),cut=S.murrayLobbyTerrainCut();
 const {subtractTunnelOpenings,polygonArea}=await import('../js/cities/hongkong/tunnel-openings.js');
 const corners=[[-11,-22], [11,-22], [11,-8],[-11,-8]].map(([x,z])=>{const p=util.harbourCityLocalToWorld(A.MURRAY_SITE,x,z);return [p.x,p.z]});
 assert.equal(subtractTunnelOpenings([corners[0],corners[1],corners[2]],[cut]).reduce((v,p)=>v+polygonArea(p),0),0);
 for(let x=-11.5;x<=11.5;x+=.5)for(let z=-22.4;z<=-7.6;z+=.5){const p=util.harbourCityLocalToWorld(A.MURRAY_SITE,x,z);assert.equal(road.fullRoadSurfaceAt(p.x,p.z,0,b.interior.floor),null);}
 const full=require('node:fs').readFileSync('js/cities/hongkong/full-world.js','utf8');assert.match(full,/includeCore \? \[\.\.\.TUNNEL_OPENING_RECTS, murrayLobbyTerrainCut\(\)/);
});
