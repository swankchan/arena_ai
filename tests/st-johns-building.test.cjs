const {test}=require('node:test'),assert=require('node:assert/strict');
test('St Johns tower follows its OSM site and leaves sampled roads and lobby open',async()=>{
 const T=await import('three/webgpu'),{buildStJohnsBuilding:build}=await import('../js/cities/hongkong/st-johns-building-world.js'),{ST_JOHNS_SITE:s}=await import('../js/cities/hongkong/st-johns-building-site.js'),{fullRoadSurfaceAt:r}=await import('../js/cities/hongkong/full-meta.js'),{hongKongTerrainHeight:g}=await import('../js/cities/hongkong/terrain.js');
 const result=build(new T.Group());assert.equal(result.stats.stJohnsOfficeFloors,21);assert.equal(result.stats.stJohnsWindows,714);assert.equal(s.osmId,179091496);assert.ok(result.group.getObjectByName('St Johns night office windows').material.emissiveNode);
 for(const c of result.colliders){for(let x=c.minX;x<=c.maxX;x+=.5)for(let z=c.minZ;z<=c.maxZ;z+=.5){const o=c.obb;if(o){let dx=x-o.cx,dz=z-o.cz;if(Math.abs(dx*o.cs-dz*o.sn)>o.hx+.25||Math.abs(dx*o.sn+dz*o.cs)>o.hz+.25)continue;}const road=r(x,z,.25,g(x,z));if(road)assert.ok(c.maxY<road.height-.1||c.minY>road.height+4.5,`overlap road ${road.way.id}`);}}
 assert.ok(result.colliders.every(c=>!(c.minY<result.groundOffset+4 && c.maxY>result.groundOffset+4 && Math.abs(c.x-s.x)<1 && Math.abs(c.z-s.z)<1)),'central lobby must not have a full-height collider');
});
