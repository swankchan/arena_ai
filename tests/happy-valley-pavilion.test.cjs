const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
let THREE, site, source, venue, built, road, terrain, pointInFlatRing;
test.before(async () => {
  THREE = await import('three/webgpu');
  ({HAPPY_VALLEY_PAVILION:site,HAPPY_VALLEY_PAVILION_SOURCE:source} = await import('../js/cities/hongkong/happy-valley-pavilion-site.js'));
  ({HAPPY_VALLEY_SITE:venue} = await import('../js/cities/hongkong/happy-valley-racecourse-architecture.js'));
  ({fullRoadSurfaceAt:road} = await import('../js/cities/hongkong/full-meta.js'));
  ({pointInFlatRing} = await import('../js/cities/hongkong/landmark-site.js'));
  terrain = (await import('../js/cities/hongkong/terrain.js')).HONG_KONG_TERRAIN_META;
  const world = await import('../js/cities/hongkong/happy-valley-racecourse-world.js');
  built = world.buildHappyValleyRacecourse(new THREE.Group(),{groundOffset:terrain.happyValleyPadHeight});
  built.group.updateMatrixWorld(true);
});

test('Pavilion Stand uses mapped footprint and the transformed world position', () => {
  const mapped = JSON.parse(fs.readFileSync('tools/data/hongkong/landmarks.json')).elements.find(e => e.id===1356276117 && e.type==='way');
  assert.deepEqual(source.geometry,mapped.geometry);
  assert.equal(source.tags['building:levels'],mapped.tags['building:levels']);
  const group = built.group.getObjectByName('HappyValleyPavilionStand');
  const pos=group.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.hypot(pos.x-site.x,pos.z-site.z)<1e-5);
  assert.ok(Math.abs(built.group.rotation.y+group.rotation.y-site.ry)<1e-10);
  for (const name of ['HappyValleyPavilionGlazing','HappyValleyPavilionTerraces','HappyValleyPavilionTerraceSeats','HappyValleyPavilionFloorBands','HappyValleyPavilionMullions','HappyValleyPavilionDeckLights','HappyValleyPavilionRoof'])
    assert.ok(group.getObjectByName(name),name);
  const glass=group.getObjectByName('HappyValleyPavilionGlazing').material;
  assert.ok(glass.isMeshStandardNodeMaterial && glass.emissiveNode);
});

test('wall collider footprints avoid sampled same-level roads', () => {
  // Select this stand's own colliders by footprint, not by a fixed index range: three more
  // stands now exist next to it, and roads remove a few wall segments.
  const colliders=built.colliders.filter(c=>{
    if(c.x===undefined)return false;
    const dx=c.x-site.x,dz=c.z-site.z;
    return Math.hypot(dx,dz)<site.height*2 && pointInFlatRing(site.ring,c.x,c.z);
  });
  // Two wall segments end on 黃泥涌道 and are correctly dropped rather than sealing the street.
  assert.equal(colliders.length,5);
  for (const c of colliders) {
    assert.ok(c.minY >= terrain.happyValleyPadHeight);
    for(let x=c.minX;x<=c.maxX;x+=.5) for(let z=c.minZ;z<=c.maxZ;z+=.5) {
      const dx=x-c.x,dz=z-c.z,lx=dx*c.obb.cs-dz*c.obb.sn,lz=dx*c.obb.sn+dz*c.obb.cs;
      if(Math.abs(lx)>c.obb.hx||Math.abs(lz)>c.obb.hz)continue;
      const hit=road(x,z,0,terrain.happyValleyPadHeight);
      assert.ok(!hit||Math.abs(hit.height-terrain.happyValleyPadHeight)>=2.5,`collider crosses road ${hit?.way.id}`);
    }
  }
});

test('the provisional racing band does not sample through the Pavilion footprint', async () => {
  const {happyValleyTrackPoint:p}=await import('../js/cities/hongkong/happy-valley-racecourse-architecture.js');
  for(let i=0;i<1440;i++)for(let offset of [0,-6,-12,-18,-24,-30.5]) {
    const q=p(i/1440,offset),x=venue.x+Math.cos(venue.ry)*q.x+Math.sin(venue.ry)*q.z,z=venue.z-Math.sin(venue.ry)*q.x+Math.cos(venue.ry)*q.z;
    assert.ok(!pointInFlatRing(site.ring,x,z));
  }
});


test('estimated street-side entrance is actually open in geometry, fence and colliders', async () => {
  const {HAPPY_VALLEY_PAVILION_ENTRANCE:entry}=await import('../js/cities/hongkong/happy-valley-pavilion-site.js');
  const {harbourCityEdgeFrame}=await import('../js/cities/hongkong/harbour-city-architecture.js');
  const f=harbourCityEdgeFrame(site,entry.edge,'','',entry.centre), ground=terrain.happyValleyPadHeight;
  assert.ok(built.stats.happyValleyEntranceFenceGaps>0);
  assert.ok(built.group.getObjectByName('HappyValleyPavilionEntranceFrame'));
  assert.ok(built.group.getObjectByName('HappyValleyPavilionEntranceFloor'));
  // Sample a 3.2 m wide walking corridor through the doorway, on both sides
  // of the wall, at pedestrian height. This is not a full continuous sweep.
  for(let lateral=-1.6;lateral<=1.6;lateral+=.2) for(let normal=-2;normal<=2;normal+=.2) {
    const x=f.x+f.nz*lateral+f.nx*normal,z=f.z-f.nx*lateral+f.nz*normal;
    for(const c of built.colliders) {
      if(c.minY>ground+1.5 || c.maxY<ground+1.5) continue;
      const dx=x-c.x,dz=z-c.z;
      assert.ok(Math.abs(dx*c.obb.cs-dz*c.obb.sn)>c.obb.hx || Math.abs(dx*c.obb.sn+dz*c.obb.cs)>c.obb.hz,
        'doorway corridor is blocked by a collider');
    }
  }
  const obstructionNames=['HappyValleyPerimeterFence','HappyValleyPavilionGlazing','HappyValleyPavilionFloorBands',
    'HappyValleyPavilionMullions','HappyValleyPavilionEntranceFrame'];
  const obstructionMeshes=obstructionNames.map(name=>built.group.getObjectByName(name));
  for(const lateral of [-1.5,-1,0,1,1.5]) for(const height of [.3,1,2,3]) {
    const origin=new THREE.Vector3(f.x+f.nz*lateral+f.nx*2,ground+height,f.z-f.nx*lateral+f.nz*2);
    const ray=new THREE.Raycaster(origin,new THREE.Vector3(-f.nx,0,-f.nz),0,4);
    assert.equal(ray.intersectObjects(obstructionMeshes).length,0, 'rendered entrance is obstructed');
  }
  for(const name of obstructionNames.slice(0,4)) {
    const mesh=built.group.getObjectByName(name), p=mesh.geometry.getAttribute('position'), v=new THREE.Vector3();
    for(let i=0;i<p.count;i++) {
      v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
      if(v.y<ground || v.y>ground+3) continue;
      const dx=v.x-f.x,dz=v.z-f.z, lateral=dx*f.nz-dz*f.nx, normal=dx*f.nx+dz*f.nz;
      assert.ok(Math.abs(lateral)>1.6 || Math.abs(normal)>1, `${name} vertex blocks entrance`);
    }
  }
});
