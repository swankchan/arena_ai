const test=require('node:test'),assert=require('node:assert/strict');
let THREE,venue,arch,terrain,roads,rings,source;
test.before(async()=>{
 THREE=await import('three/webgpu');arch=await import('../js/cities/hongkong/happy-valley-racecourse-architecture.js');
 terrain=(await import('../js/cities/hongkong/terrain.js')).HONG_KONG_TERRAIN_META;
 roads=await import('../js/cities/hongkong/full-meta.js');rings=await import('../js/cities/hongkong/landmark-site.js');
 source=await import('../js/cities/hongkong/happy-valley-winning-post.js');
 venue=(await import('../js/cities/hongkong/happy-valley-racecourse-world.js')).buildHappyValleyRacecourse(new THREE.Group(),{groundOffset:terrain.happyValleyPadHeight});venue.group.updateMatrixWorld(true);
});
test('winning post has a yellow open horseshoe, central post and planting',()=>{
 const group=venue.group.getObjectByName('HappyValleyWinningPost');assert.ok(group);
 for(const name of ['HappyValleyWinningPostArch','HappyValleyWinningPostBase','HappyValleyWinningPostUpright','HappyValleyWinningPostPanel','HappyValleyWinningPostPlanting','HappyValleyWinningPostFlowersRed','HappyValleyWinningPostFlowersYellow'])assert.ok(group.getObjectByName(name),name);
 const geom=group.getObjectByName('HappyValleyWinningPostArch').geometry;geom.computeBoundingBox();
 assert.ok(Math.abs(geom.boundingBox.min.y)<.001);assert.ok(geom.boundingBox.max.y>6);
 const bounds=new THREE.Box3().setFromObject(group);assert.ok(bounds.max.y-bounds.min.y>6 && bounds.max.y-bounds.min.y<8);
 // Centre is open above the column, rather than a solid arch-shaped billboard.
 const ray=new THREE.Raycaster(), p=group.localToWorld(new THREE.Vector3(2,5.5,3)), d=new THREE.Vector3(0,0,-1).transformDirection(group.matrixWorld);
 ray.set(p,d);assert.equal(ray.intersectObject(group.getObjectByName('HappyValleyWinningPostArch')).length,0);
});
test('all winning-post mesh vertices avoid sampled mapped pitches, stands and road layers',async()=>{
 const {worldRingFromGeometry}=await import('../js/cities/hongkong/authored-landmark-site.js');
 const pitches=(await import('../js/cities/hongkong/happy-valley-pitches-world.js')).HAPPY_VALLEY_PITCHES.map(p=>p.ring);
 const remaining=(await import('../js/cities/hongkong/happy-valley-remaining-pitch-footprints.js')).HAPPY_VALLEY_REMAINING_PITCH_FOOTPRINTS.map(p=>worldRingFromGeometry(p.geometry));
 const stands=(await import('../js/cities/hongkong/happy-valley-stand-footprints.js')).HAPPY_VALLEY_STAND_FOOTPRINTS.map(p=>worldRingFromGeometry(p.geometry));
 const {roadRibbonHeightAtSegment}=await import('../js/cities/hongkong/road-elevation.js');
 const all=[...pitches,...remaining,...stands,arch.HAPPY_VALLEY_PARADE_RING],p=new THREE.Vector3();let count=0;
 venue.group.getObjectByName('HappyValleyWinningPost').traverse(mesh=>{
  if(!mesh.isMesh)return;const pos=mesh.geometry.getAttribute('position');
  for(let i=0;i<pos.count;i++) {
   p.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);count++;
   assert.ok(rings.pointInFlatRing(arch.HAPPY_VALLEY_SITE.ring,p.x,p.z));
   assert.ok(!all.some(r=>rings.pointInFlatRing(r,p.x,p.z)),`post vertex ${i} overlaps mapped footprint`);
   for(const way of roads.fullRoadWaysNear(p.x,p.z,10))for(let j=2;j<way.flat.length;j+=2) {
    const ax=way.flat[j-2],az=way.flat[j-1],dx=way.flat[j]-ax,dz=way.flat[j+1]-az,l=dx*dx+dz*dz;if(l<.0025)continue;
    const t=Math.max(0,Math.min(1,((p.x-ax)*dx+(p.z-az)*dz)/l)),x=ax+t*dx,z=az+t*dz;
    if(Math.hypot(p.x-x,p.z-z)>way.width/2+.5)continue;
    assert.ok(Math.abs(roadRibbonHeightAtSegment(way.id,j/2-1,t,x,z)-terrain.happyValleyPadHeight)>=2.5,`post on road ${way.id}`);
   }
  }
 });assert.ok(count>2000);
});
test('winning post stands inside provisional inner rail with three small physical supports',()=>{
 assert.ok(source.HAPPY_VALLEY_WINNING_POST.offset < -arch.HAPPY_VALLEY_TRACK.width);
 // Original 6, pavilion 9 and Members III 7 precede the marker supports.
 const feet=venue.colliders.slice(22,25);assert.equal(feet.length,3);
 const group=venue.group.getObjectByName('HappyValleyWinningPost');
 for(let i=0;i<3;i++) {
  const local=new THREE.Vector3([-3.85,0,3.85][i],0,0).applyMatrix4(group.matrixWorld),c=feet[i];
  assert.ok(Math.hypot(local.x-c.x,local.z-c.z)<.001);
  assert.ok(c.maxY-c.minY<=4.7+.001);
 }
});
test('Chinese label outlines are bundled rather than depending on system fonts',async()=>{
 const {WINNING_POST_GLYPHS}=await import('../js/cities/hongkong/happy-valley-winning-post-glyphs.js');
 for(const char of '跑馬地馬場香港賽馬會')assert.ok(WINNING_POST_GLYPHS[char]?.path.length>100,char);
});
