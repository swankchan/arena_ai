const test=require('node:test'),assert=require('node:assert/strict');
test('ordinary tram stops have bilingual sheltered platforms, with deduplication and rail/road clearance',async()=>{
 const {HK_TRAM_NETWORK:n}=await import('../js/hk-tram-network-data.js');const {getTramStopPlatforms,getTramTermini}=await import('../js/cities/hongkong/tram-termini.js');const {fullRoadSurfaceAt}=await import('../js/cities/hongkong/full-meta.js');const {createTramPath,sampleTramPath}=await import('../js/cities/hongkong/tram-motion.js');
 const stops=getTramStopPlatforms(),termini=getTramTermini(),all=[...stops,...termini.flatMap(t=>t.platforms)];assert.equal(stops.length,109);assert.equal(all.length,117);
 for(const track of n.tracks){const path=createTramPath(track);for(const stop of track.stops){const code=stop[0].replace(/^hk-official-tram-/,'').toUpperCase(),a=sampleTramPath(path,stop[3]);assert.ok(all.some(p=>p.code===code&&Math.hypot(p.anchorX-a.x,p.anchorZ-a.z)<5),code);}}
 for(const p of stops){assert.ok(p.roadSafe,p.code);assert.ok(p.clearance>=1.3,p.code);assert.ok(p.name&&p.nameEn);for(let along=-4;along<=4;along++)for(let across=-1;across<=1;across+=.5){let x=p.x+p.dx*along+p.dz*p.side*(p.offset+across),z=p.z+p.dz*along-p.dx*p.side*(p.offset+across),r=fullRoadSurfaceAt(x,z,.3,p.anchorY);assert.ok(!r||Math.abs(r.height-p.anchorY)>=4.7,`${p.code} roadway`);}}
});
test('tramway renders shelter geometry without altering the fleet or tracks',async()=>{
 const THREE=await import('three/webgpu');const {createHongKongTramway}=await import('../js/cities/hongkong/tram.js');let t=createHongKongTramway(new THREE.Scene());assert.equal(t.stats.tramStopShelters,109);assert.equal(t.stats.tramStopShelterRoadUnsafe,0);assert.equal(t.stats.trams,16);for(const name of ['HongKongTramStopPlatform','HongKongTramStopTactile','HongKongTramStopRoof','HongKongTramStopFrame','HongKongTramStopGlass','HongKongTramStopSign'])assert.ok(t.group.getObjectByName(name),name);
});
