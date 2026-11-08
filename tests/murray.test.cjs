const test=require('node:test'),assert=require('node:assert/strict');let M,A,T,terrain,road,collision,util,b;
test.before(async()=>{
 global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)})})};
 [M,A,T,terrain,road,collision,util]=await Promise.all([import('../js/cities/hongkong/murray-world.js'),import('../js/cities/hongkong/murray-architecture.js'),import('three/webgpu'),import('../js/cities/hongkong/terrain.js'),import('../js/cities/hongkong/full-meta.js'),import('../js/cities/hongkong/colliders.js'),import('../js/cities/hongkong/harbour-city-architecture.js')]);b=M.buildMurray(new T.Group());
});
test('Murray mapped site, deep windows and open arcades',()=>{
 const s=A.MURRAY_SITE;assert.equal(s.osmId,85320844);assert.equal(s.source.version,14);assert.equal(s.height,93.83);assert.equal(b.stats.murrayWindows,966);assert.equal(b.stats.murrayArches,22);
 for(const name of ['The Murray precast facade grid','The Murray deep skewed window reveals','The Murray recessed angled glazing','The Murray open arched arcade','The Murray curved arch intrados','The Murray arcade piers','The Murray recessed lobby glazing','The Murray bronze lobby mullions','The Murray terrain-following arcade paving','The Murray former car ramp walkable paving','The Murray rooftop terrace floor'])assert.ok(b.group.getObjectByName(name),name);
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
test('existing ramp centre is clear for a walking person end to end',async()=>{
 const R=await import('../js/cities/hongkong/murray-ramp.js'),r=R.MURRAY_RAMP;
 for(let z=r.z0;z<=r.z1;z+=.1){const x=(r.x0+r.x1)/2,p=util.harbourCityLocalToWorld(A.MURRAY_SITE,x,z),y=b.datum+R.murrayRampLocalHeight(z);for(const c of b.colliders)if(y+1.75>=c.minY&&y+.1<=c.maxY)assert.equal(collision.colliderContains(c,p.x,p.z,.48),false,`collision at ${x.toFixed(2)}, ${z.toFixed(2)}`);}
});
test('lift carries a passenger and can be recalled at either landing',async()=>{
 const E=await import('../js/cities/hongkong/murray-lift.js'),s=E.createMurrayLiftMotion(),L=E.MURRAY_LIFT;
 for(let i=0;i<21;i++)E.advanceMurrayLiftMotion(s,.1,false,L.roof);assert.equal(s.moving,true);
 for(let i=0;i<200;i++)E.advanceMurrayLiftMotion(s,.1,false,L.roof);assert.equal(s.y,L.roof);
 for(let i=0;i<21;i++)E.advanceMurrayLiftMotion(s,.1,false,L.lobby);for(let i=0;i<200;i++)E.advanceMurrayLiftMotion(s,.1,false,L.lobby);assert.equal(s.y,L.lobby);
 const pt=util.harbourCityLocalToWorld(A.MURRAY_SITE,0,(L.z0+L.z1)/2),person={position:new T.Vector3(pt.x,b.datum+L.lobby,pt.z),verticalVel:0,speed:0},manager={activeMode:'person',entities:{person}};
 for(let i=0;i<320;i++)b.lift.update(.1,manager);assert.equal(b.lift.state.y,L.roof);assert.equal(person.position.y,b.datum+L.roof);
 const cover=b.group.getObjectByName('The Murray lift roof safety cover');assert.equal(cover.visible,false);
 for(const gap of [.1,.5,2])assert.equal(E.murrayRoofHeight(pt.x,pt.z,0,b.datum+L.roof,b.datum,{y:L.roof-gap}),b.datum+L.roof);
});
test('lift carries a person through the actual controller gravity integration',async()=>{
 const E=await import('../js/cities/hongkong/murray-lift.js'),{ThirdPersonControllerManager}=await import('../js/controllers.js'),lift=b.lift,L=E.MURRAY_LIFT;Object.assign(lift.state,E.createMurrayLiftMotion());
 const pt=util.harbourCityLocalToWorld(A.MURRAY_SITE,0,(L.z0+L.z1)/2),p={position:new T.Vector3(pt.x,b.datum+L.lobby,pt.z),verticalVel:0,speed:0,heading:0};
 const ctx={activeMode:'person',entities:{person:p},keys:{},resolveHorizontalCollision(){},getGroundHeight:(x,z,mode,ref)=>b.groundHeightAt(x,z,terrain.hongKongTerrainHeight(x,z),ref)};
 for(let i=0;i<650;i++){ThirdPersonControllerManager.prototype.updatePerson.call(ctx,.05);lift.update(.05,ctx);}assert.equal(lift.state.y,L.roof);assert.equal(p.position.y,b.datum+L.roof);
});
test('lift connects to lobby and roof without blocking walking clearance',async()=>{
 const E=await import('../js/cities/hongkong/murray-lift.js'),L=E.MURRAY_LIFT;
 const check=(x,z,y)=>{const p=util.harbourCityLocalToWorld(A.MURRAY_SITE,x,z);for(const c of b.colliders)if(y+1.75>=c.minY&&y+.1<=c.maxY)assert.equal(collision.colliderContains(c,p.x,p.z,.48),false,`collision ${x},${z}`);};
 for(let z=-14.5;z<=(L.z0+L.z1)/2;z+=.1)check(0,z,b.interior.floor);
 for(let z=L.z0-.55;z>=L.z0-5;z-=.1){check(0,z,b.datum+L.roof);const p=util.harbourCityLocalToWorld(A.MURRAY_SITE,0,z);assert.equal(b.groundHeightAt(p.x,p.z,0,b.datum+L.roof),b.datum+L.roof);}
 const index=require('node:fs').readFileSync('js/cities/hongkong/index.js','utf8'),world=require('node:fs').readFileSync('js/cities/hongkong/simple-world.js','utf8');assert.match(index,/world\.murray\.lift\.group/);assert.match(index,/world\.update\(dt, elapsed, \{ cameraSystem, controllerManager \}\)/);assert.match(world,/murray\.lift\.update\(dt, context\.controllerManager\)/);
});
test('roof pavilion connects around lift shaft to both side terraces',async()=>{
 const E=await import('../js/cities/hongkong/murray-lift.js'),P=await import('../js/cities/hongkong/murray-rooftop.js'),y=b.datum+E.MURRAY_LIFT.roof;
 const check=(x,z)=>{const p=util.harbourCityLocalToWorld(A.MURRAY_SITE,x,z);assert.equal(b.groundHeightAt(p.x,p.z,0,y),y);for(const c of b.colliders)if(y+1.75>=c.minY&&y+.1<=c.maxY)assert.equal(collision.colliderContains(c,p.x,p.z,.48),false,`collision ${x},${z}`);};
 for(let x=0;x<=3;x+=.1)check(x,-12.1);for(let z=-12.1;z<=-6;z+=.1)check(3,z);for(let x=3;x>=0;x-=.1)check(x,-6);for(let z=-6;z<=7;z+=.1)check(0,z);for(let x=P.MURRAY_PAVILION.x0-2;x<=P.MURRAY_PAVILION.x1+2;x+=.1)check(x,6.6);
 for(const name of ['The Murray Popinjays transparent pavilion glazing','The Murray Popinjays bronze pavilion frames','The Murray Popinjays pavilion roof','The Murray Popinjays blue dining chairs'])assert.ok(b.group.getObjectByName(name),name);
});
test('lobby glazing and photo-directed finishes have their material layers',()=>{
 assert.ok(b.group.getObjectByName('The Murray lobby polished dark stone floor').material.map);assert.ok(b.group.getObjectByName('The Murray lobby stone reception and partition').material.map);
 const glass=b.group.getObjectByName('The Murray recessed lobby glazing');assert.equal(glass.material.transparent,true);assert.ok(glass.material.opacity<.5);
 for(const name of ['The Murray lobby marble panel joints','The Murray lobby vertical bronze window screens','The Murray lobby reception counter supports','The Murray lobby reception marble tops','The Murray lobby suspended charcoal inspired sculpture'])assert.ok(b.group.getObjectByName(name),name);
});
test('moving lift retains its rider against walking input and releases after teleport or mode switch',async()=>{
 const E=await import('../js/cities/hongkong/murray-lift.js'),L=E.MURRAY_LIFT;
 const run=()=>{const instance=M.buildMurray(new T.Group()),pt=util.harbourCityLocalToWorld(A.MURRAY_SITE,0,(L.z0+L.z1)/2),p={position:new T.Vector3(pt.x,instance.datum+L.lobby,pt.z),mesh:{position:new T.Vector3()},speed:0,verticalVel:0},m={activeMode:'person',entities:{person:p}};for(let i=0;i<21;i++)instance.lift.update(.1,m);return {instance,p,m};};
 const a=run();assert.equal(a.instance.lift.state.moving,true);
 for(let i=0;i<10;i++){const q=util.harbourCityLocalToWorld(A.MURRAY_SITE,0,L.z0-.25);a.p.position.x=q.x;a.p.position.z=q.z;a.instance.lift.update(.05,a.m);const local=util.harbourCityWorldToLocal(A.MURRAY_SITE,a.p.position.x,a.p.position.z);assert.ok(Math.abs(local.z-(L.z0+L.z1)/2)<1e-6);assert.deepEqual(a.p.mesh.position,a.p.position);}
 a.p.position.set(10000,10000,10000);a.instance.lift.update(.05,a.m);assert.equal(a.p.position.x,10000);
 const b=run(),y=b.p.position.y;b.m.activeMode='car';b.instance.lift.update(.05,b.m);assert.equal(b.p.position.y,y);
});
test('01 gallery is reached from lift and is continuous around the core',async()=>{
 const E=await import('../js/cities/hongkong/murray-lift.js'),G=await import('../js/cities/hongkong/murray-gallery.js'),y=b.datum+G.MURRAY_GALLERY.floor;
 const check=(x,z)=>{const p=util.harbourCityLocalToWorld(A.MURRAY_SITE,x,z);assert.ok(G.isMurrayGalleryLocal(x,z),`missing deck ${x},${z}`);assert.equal(b.groundHeightAt(p.x,p.z,0,y),y);for(const c of b.colliders)if(y+1.75>=c.minY&&y+.1<=c.maxY)assert.equal(collision.colliderContains(c,p.x,p.z,.48),false,`blocked ${x.toFixed(2)},${z.toFixed(2)} ${JSON.stringify(c)}`);};
 for(let x=0;x<=8;x+=.1)check(x,-12.4);for(let z=-12.4;z>=-19.5;z-=.1)check(8,z);for(let x=8;x>=-7.8;x-=.1)check(x,-19.5);for(let z=-19.5;z<=19;z+=.1)check(-7.8,z);for(let z=-12.4;z<=19;z+=.1)check(8,z);
 assert.ok(b.group.getObjectByName('The Murray 01 level circulation floor'));assert.ok(b.group.getObjectByName('The Murray lift gallery safety cover'));
 const p=util.harbourCityLocalToWorld(A.MURRAY_SITE,0,(E.MURRAY_LIFT.z0+E.MURRAY_LIFT.z1)/2);
 assert.equal(E.murrayRoofHeight(p.x,p.z,0,y,b.datum,{y:G.MURRAY_GALLERY.floor-1}),y);
 assert.equal(G.murrayGalleryGroundHeight(p.x,p.z,1,y+10,b.datum),1);
});
test('a gallery recall preserves the direction from either end and the intermediate cover follows the car',async()=>{
 const E=await import('../js/cities/hongkong/murray-lift.js'),L=E.MURRAY_LIFT,s=E.createMurrayLiftMotion();
 for(let i=0;i<21;i++)E.advanceMurrayLiftMotion(s,.1,false,L.roof);for(let i=0;i<200;i++)E.advanceMurrayLiftMotion(s,.1,false,L.roof);assert.equal(s.y,L.roof);
 for(let i=0;i<21;i++)E.advanceMurrayLiftMotion(s,.1,false,L.gallery);for(let i=0;i<200;i++)E.advanceMurrayLiftMotion(s,.1,false,L.gallery);assert.equal(s.y,L.gallery);assert.equal(s.direction,-1);
 for(let i=0;i<21;i++)E.advanceMurrayLiftMotion(s,.1,true);assert.equal(s.target,L.lobby);assert.equal(s.moving,true);
 const lift=b.lift;Object.assign(lift.state,E.createMurrayLiftMotion());const manager={activeMode:'car',entities:{}};lift.update(.1,manager);
 const cover=b.group.getObjectByName('The Murray lift gallery safety cover');assert.equal(cover.visible,true);
 lift.state.y=L.gallery;lift.update(.1,manager);assert.equal(cover.visible,false);
});
test('27 stair treads connect the lobby to the gallery at human-width clearance',async()=>{
 const S=await import('../js/cities/hongkong/murray-stairs.js'),G=await import('../js/cities/hongkong/murray-gallery.js'),s=S.MURRAY_STAIRS,x=(s.x0+s.x1)/2;
 assert.equal(s.steps,27);assert.ok(Math.abs(s.bottom+s.steps*s.rise-G.MURRAY_GALLERY.floor)<1e-8);assert.equal(b.stairs.steps,27);
 const check=(xx,z,y)=>{const p=util.harbourCityLocalToWorld(A.MURRAY_SITE,xx,z);for(const c of b.colliders)if(y+1.75>=c.minY&&y+.1<=c.maxY)assert.equal(collision.colliderContains(c,p.x,p.z,.48),false,`blocked stair ${xx.toFixed(2)}, ${z.toFixed(2)}, ${y.toFixed(2)}`);};
 for(let z=s.z0+.025;z<s.z1;z+=.05){const p=util.harbourCityLocalToWorld(A.MURRAY_SITE,x,z),y=b.datum+S.murrayStairLocalHeight(z);assert.equal(b.groundHeightAt(p.x,p.z,b.interior.floor,y),y);check(x,z,y);}
 for(let z=s.z1+.1;z<=-10;z+=.1)check(x,z,b.datum+G.MURRAY_GALLERY.floor);
 for(const name of ['The Murray garden stair marble treads','The Murray garden stair bronze nosings','The Murray garden stair handrails'])assert.ok(b.group.getObjectByName(name),name);
});
