const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('Statue Square mapped features are separate, located and road cleared',async()=>{
 const THREE=await import('three/webgpu');const {STATUE_SQUARE_SOUTH:s,STATUE_SQUARE_NORTH:n,SQUARE_WATER,SQUARE_SHELTERS,JACKSON_POSITION,CENOTAPH_RING}=await import('../js/cities/hongkong/statue-square-architecture.js');
 const {buildStatueSquare}=await import('../js/cities/hongkong/statue-square-world.js');const {pointInFlatRing}=await import('../js/cities/hongkong/landmark-site.js');const {fullRoadSurfaceAt}=await import('../js/cities/hongkong/full-meta.js');
 assert.equal(s.osmId,42293434);assert.equal(n.osmId,25607730);assert.equal(SQUARE_WATER.length,5);assert.equal(SQUARE_SHELTERS.length,4);assert.ok(pointInFlatRing(s.ring,...JACKSON_POSITION));assert.ok(!pointInFlatRing(n.ring,CENOTAPH_RING[0],CENOTAPH_RING[1]));
 let built=buildStatueSquare(new THREE.Group());assert.equal(built.stats.statueSquareCanopies,4);assert.equal(built.stats.statueSquarePools,5);assert.ok(built.stats.statueSquareGroundCells>1500);assert.ok(built.treeSites.length>10);
 const paving=built.group.getObjectByName('Statue Square road-cleared terrain paving').geometry.attributes.position;
 for(let i=0;i<paving.count;i++){const x=paving.getX(i),z=paving.getZ(i);assert.ok(pointInFlatRing(s.ring,x,z)||pointInFlatRing(n.ring,x,z));assert.equal(fullRoadSurfaceAt(x,z,.3),null);}
 for(const t of built.treeSites){assert.ok(pointInFlatRing(s.ring,t.x,t.z)||pointInFlatRing(n.ring,t.x,t.z));assert.equal(fullRoadSurfaceAt(t.x,t.z,2.9),null);}
 for(const feature of [...SQUARE_WATER,{id:'cenotaph',world:CENOTAPH_RING}]){let r=feature.world,minX=Math.min(...r.filter((_,i)=>i%2===0)),maxX=Math.max(...r.filter((_,i)=>i%2===0)),minZ=Math.min(...r.filter((_,i)=>i%2===1)),maxZ=Math.max(...r.filter((_,i)=>i%2===1));for(let x=minX;x<=maxX;x+=1)for(let z=minZ;z<=maxZ;z+=1)if(pointInFlatRing(r,x,z))assert.equal(fullRoadSurfaceAt(x,z,.2),null,`${feature.id} at ${x},${z}`);}
 const statue=built.group.getObjectByName('Sir Thomas Jackson statue');const facing=new THREE.Vector3(0,0,1).applyEuler(statue.rotation);assert.ok(facing.x>.99,'statue faces east, towards court');assert.ok(built.group.getObjectByName('Cenotaph limestone stepped monument'));
 for(const f of SQUARE_SHELTERS)assert.ok(built.group.getObjectByName(`Statue Square folded canopy ${f.id}`));
});
test('Statue Square is integrated into the park trees, colliders, metadata and runtime',()=>{let s=fs.readFileSync('js/cities/hongkong/simple-world.js','utf8');for(const str of ['buildStatueSquare(scene)','...statueSquare.landmarks','...statueSquare.colliders','...statueSquare.stats','chaterGarden, statueSquare'])assert.ok(s.includes(str),str);});
