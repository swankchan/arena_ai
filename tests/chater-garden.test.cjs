const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('Chater Garden retains mapped site and photo-directed paths, water and trees without covering roads',async()=>{
 const THREE=await import('three/webgpu');const {CHATER_GARDEN:s,CHATER_GARDEN_SOURCE:source}=await import('../js/cities/hongkong/chater-garden-architecture.js');const {buildChaterGarden}=await import('../js/cities/hongkong/chater-garden-world.js');const {fullRoadSurfaceAt}=await import('../js/cities/hongkong/full-meta.js');const {pointInFlatRing}=await import('../js/cities/hongkong/landmark-site.js');
 assert.equal(source.id,148784038);assert.equal(source.version,8);assert.match(source.evidence,/approximations/);const b=buildChaterGarden(new THREE.Group());assert.ok(b.stats.chaterGardenGroundCells>2000);assert.ok(b.treeSites.length>15);assert.equal(b.stats.chaterGardenSpillPool,1);
 for(const name of ['Chater Garden terrain-following lawn and paved tree walk','Chater Garden blue spill pool','Chater Garden stone cascade and pool walls','Chater Garden cascading water','Chater Garden green garden railings and pool coping'])assert.ok(b.group.getObjectByName(name),name);
 const p=b.group.getObjectByName('Chater Garden terrain-following lawn and paved tree walk').geometry.attributes.position;
 for(let i=0;i<p.count;i++){assert.ok(pointInFlatRing(s.ring,p.getX(i),p.getZ(i)));assert.equal(fullRoadSurfaceAt(p.getX(i),p.getZ(i),.3),null);}
 for(const t of b.treeSites){assert.ok(pointInFlatRing(s.ring,t.x,t.z));assert.equal(fullRoadSurfaceAt(t.x,t.z,2.9),null);}
});
test('Chater Garden is integrated into park tree layer and world',()=>{const s=fs.readFileSync('js/cities/hongkong/simple-world.js','utf8');for(const str of ['buildChaterGarden(scene)','...chaterGarden.landmarks','...chaterGarden.colliders','...chaterGarden.stats','victoriaPark, chaterGarden'])assert.ok(s.includes(str));});
