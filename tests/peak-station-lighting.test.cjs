const {test}=require('node:test'),assert=require('node:assert/strict');
test('upper station concourse has night-driven light fittings without adding colliders',async()=>{
 const THREE=await import('three/webgpu');
 const {buildPeakStationAccess,PEAK_STATION_ACCESS:A}=await import('../js/cities/hongkong/peak-station-access.js');
 const group=new THREE.Group(),colliders=[];buildPeakStationAccess(group,colliders);
 const light=group.getObjectByName('Peak Tram upper concourse night light diffusers');
 assert.ok(light);assert.ok(light.material.isNodeMaterial);assert.ok(light.material.emissiveNode);
 assert.ok(group.getObjectByName('Peak Tram upper concourse ceiling light housings'));
 assert.ok(group.getObjectByName('Peak Tram upper concourse stone floor joints'));
 light.geometry.computeBoundingBox();const bounds=light.geometry.boundingBox;
 assert.ok(bounds.min.x>A.roomX0 && bounds.max.x<A.roomX1);
 assert.ok(bounds.min.z>A.roomZ0 && bounds.max.z<A.roomZ1);
 assert.ok(bounds.max.y<4 && bounds.min.y>3.8);
 assert.ok(colliders.every(c=>c.minY<400));
});
