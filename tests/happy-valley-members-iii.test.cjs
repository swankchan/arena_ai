const assert=require('node:assert/strict'),fs=require('node:fs'),test=require('node:test');
let THREE,site,source,entry,venue,built,road,ground,inside,frame,buildHappyValleyMembersIII;
test.before(async()=>{
  THREE=await import('three/webgpu');
  ({HAPPY_VALLEY_MEMBERS_III:site,HAPPY_VALLEY_MEMBERS_III_SOURCE:source,HAPPY_VALLEY_MEMBERS_III_ENTRANCE:entry}=await import('../js/cities/hongkong/happy-valley-members-iii-site.js'));
  ({HAPPY_VALLEY_SITE:venue}=await import('../js/cities/hongkong/happy-valley-racecourse-architecture.js'));
  ({fullRoadSurfaceAt:road}=await import('../js/cities/hongkong/full-meta.js'));
  ({pointInFlatRing:inside}=await import('../js/cities/hongkong/landmark-site.js'));
  ({harbourCityEdgeFrame:frame}=await import('../js/cities/hongkong/harbour-city-architecture.js'));
  ground=(await import('../js/cities/hongkong/terrain.js')).HONG_KONG_TERRAIN_META.happyValleyPadHeight;
  built=(await import('../js/cities/hongkong/happy-valley-racecourse-world.js')).buildHappyValleyRacecourse(new THREE.Group(),{groundOffset:ground});built.group.updateMatrixWorld(true);
  ({buildHappyValleyMembersIII}=await import('../js/cities/hongkong/happy-valley-members-iii-world.js'));
});
test('stand footprint and levels match OSM; tiers, seats, and night material exist',()=>{
  const mapped=JSON.parse(fs.readFileSync('tools/data/hongkong/landmarks.json')).elements.find(e=>e.id===1356276116&&e.type==='way');
  assert.deepEqual(source.geometry,mapped.geometry);assert.equal(source.tags['building:levels'],mapped.tags['building:levels']);
  const group=built.group.getObjectByName('HappyValleyMembersStandIII'),pos=group.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.hypot(pos.x-site.x,pos.z-site.z)<1e-5);
  for(const name of ['HappyValleyMembersIIIGlazing','HappyValleyMembersIIITerraces','HappyValleyMembersIIISeats','HappyValleyMembersIIIRails','HappyValleyMembersIIIFascias','HappyValleyMembersIIITerraceLights','HappyValleyMembersIIIRoof']) assert.ok(group.getObjectByName(name),name);
  assert.ok(group.getObjectByName('HappyValleyMembersIIIGlazing').material.emissiveNode);
  assert.ok(group.getObjectByName('HappyValleyMembersIIITerraceLights').material.emissiveNode);
});
test('building mesh vertices and wall collider samples avoid same-level roads',()=>{
  const group=built.group.getObjectByName('HappyValleyMembersStandIII'),v=new THREE.Vector3();let count=0;
  group.traverse(mesh=>{if(!mesh.isMesh)return;let p=mesh.geometry.getAttribute('position');for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);let hit=road(v.x,v.z,0,ground);count++;
    assert.ok(!hit||Math.abs(hit.height-ground)>=2.5,`${mesh.name} on road ${hit?.way.id}`);
  }});assert.ok(count>10000);
  // Locate this stand's wall colliders by footprint; the order changed when the remaining
  // three stands were added and two wall segments were dropped off 黃泥涌道.
  // Build this stand on its own so the assertion is about its own walls, not the venue's
  // merged list (three more stands now share that list).
  const standalone=buildHappyValleyMembersIII(new THREE.Group(),ground);
  assert.equal(standalone.colliders.length,5);
  assert.equal(standalone.droppedColliders,2);
  const walls=standalone.colliders;
  for(const c of walls) for(let x=c.minX;x<=c.maxX;x+=.5)for(let z=c.minZ;z<=c.maxZ;z+=.5){
    const dx=x-c.x,dz=z-c.z;if(Math.abs(dx*c.obb.cs-dz*c.obb.sn)>c.obb.hx||Math.abs(dx*c.obb.sn+dz*c.obb.cs)>c.obb.hz)continue;
    let hit=road(x,z,0,ground);assert.ok(!hit||Math.abs(hit.height-ground)>=2.5,`wall crosses road ${hit?.way.id}`);
  }
});
test('estimated rear portal is not blocked by authored walls or fence at walking height',()=>{
  const f=frame(site,entry.edge,'','',entry.centre),meshes=['HappyValleyPerimeterFence','HappyValleyMembersIIIGlazing','HappyValleyMembersIIIFascias','HappyValleyMembersIIIMullions','HappyValleyMembersIIIEntranceFrame'].map(name=>built.group.getObjectByName(name));
  for(let lateral=-1.5;lateral<=1.5;lateral+=.5)for(const height of [.3,1,2,3]){
    let origin=new THREE.Vector3(f.x+f.nz*lateral+f.nx*2,ground+height,f.z-f.nx*lateral+f.nz*2);
    const ray=new THREE.Raycaster(origin,new THREE.Vector3(-f.nx,0,-f.nz),0,4);
    assert.equal(ray.intersectObjects(meshes).length,0,`blocked portal at ${lateral} ${height}`);
  }
  for(let l=-1.6;l<=1.6;l+=.2)for(let n=-2;n<=2;n+=.2){
    const x=f.x+f.nz*l+f.nx*n,z=f.z-f.nx*l+f.nz*n;
    for(const c of built.colliders){if(c.minY>ground+1.5||c.maxY<ground+1.5)continue;const dx=x-c.x,dz=z-c.z;
      assert.ok(Math.abs(dx*c.obb.cs-dz*c.obb.sn)>c.obb.hx||Math.abs(dx*c.obb.sn+dz*c.obb.cs)>c.obb.hz,'collider blocks portal');}
  }
});
test('current track samples do not enter stand footprint',async()=>{
  const {happyValleyTrackPoint:p}=await import('../js/cities/hongkong/happy-valley-racecourse-architecture.js');
  for(let i=0;i<1440;i++)for(const offset of [0,-6,-12,-18,-24,-30.5]){const q=p(i/1440,offset),c=Math.cos(venue.ry),s=Math.sin(venue.ry);assert.ok(!inside(site.ring,venue.x+c*q.x+s*q.z,venue.z-s*q.x+c*q.z));}
});
