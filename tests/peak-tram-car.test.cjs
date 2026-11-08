const {test}=require('node:test');const assert=require('node:assert/strict');
test('sixth-generation static car has green body, glazing, eight doors and night lights',async()=>{
 const THREE=await import('three/webgpu');const {createPeakTramCar,PEAK_TRAM_CAR:C}=await import('../js/cities/hongkong/peak-tram-car.js');
 const car=createPeakTramCar();assert.equal(C.length,33);assert.equal(C.doorsPerSide*2,8);assert.equal(C.gauge,1.524);
 for(const name of ['Peak Tram green body panels','Peak Tram chassis and end bumper','Peak Tram central gangway','Peak Tram pale roof','Peak Tram roof glazing','Peak Tram panoramic glazing','Peak Tram window and door frames','Peak Tram seats','Peak Tram night interior lights','Peak Tram end lights'])assert.ok(car.getObjectByName(name),name);
 for(const name of ['Peak Tram night interior lights','Peak Tram end lights'])assert.ok(car.getObjectByName(name).material.emissiveNode);
 car.traverse(o=>{if(!o.isMesh)return;for(const value of o.geometry.attributes.position.array)assert.ok(Number.isFinite(value),o.name);});
 const bounds=new THREE.Box3().setFromObject(car);assert.ok(bounds.max.x-bounds.min.x>=33);assert.ok(bounds.max.z-bounds.min.z>=2.7);
});
test('car is not installed into the too-small provisional station',async()=>{
 const {PEAK_TRAM_CAR:C}=await import('../js/cities/hongkong/peak-tram-car.js');const {PEAK_UPPER_STATION:S}=await import('../js/cities/hongkong/peak-upper-station-site.js');
 assert.ok(C.width>2*1.28);assert.ok(C.length>S.x1-S.x0);
 const fs=require('node:fs');assert.doesNotMatch(fs.readFileSync('js/cities/hongkong/peak-tower-world.js','utf8'),/createPeakTramCar/);
});
