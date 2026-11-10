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
  const colliders=built.colliders.slice(-7);assert.equal(colliders.length,site.localRing.length/2-1);
  for (const c of colliders) {
    assert.ok(Math.abs(c.minY-terrain.happyValleyPadHeight)<1e-9);
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
