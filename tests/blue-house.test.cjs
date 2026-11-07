const test=require('node:test');const assert=require('node:assert/strict');
let M,S,T,terrain,road,contains;
test.before(async()=>{global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)})})};
 [M,S,T,terrain,road,contains]=await Promise.all([import('../js/cities/hongkong/blue-house-world.js'),import('../js/cities/hongkong/blue-house-architecture.js'),import('three/webgpu'),import('../js/cities/hongkong/terrain.js'),import('../js/cities/hongkong/full-meta.js'),import('../js/cities/hongkong/colliders.js')]);});
test('mapped four-storey Blue House with photo-directed cantilevered balconies',()=>{
 const b=M.buildBlueHouse(new T.Group());assert.equal(S.BLUE_HOUSE.osmId,405793051);assert.equal(S.BLUE_HOUSE.levels,4);assert.equal(b.stats.blueHouseBalconyFloors,3);assert.equal(b.stats.blueHouseStorefronts,4);assert.ok(b.stats.blueHouseWindowBays>=40);
 for(const n of ['Blue House painted masonry','Blue House verandah floors and columns','Blue House patterned iron verandah railings','Blue House painted timber window frames','Blue House ground-floor signage','Blue House pale adjoining unit'])assert.ok(b.group.getObjectByName(n),n);
});
test('nearby sampled carriageway remains free of colliders up to 4.8 m',()=>{
 const b=M.buildBlueHouse(new T.Group()),s=S.BLUE_HOUSE;let count=0,hits=0;
 for(let x=s.bounds.minX-15;x<s.bounds.maxX+15;x+=.5)for(let z=s.bounds.minZ-15;z<s.bounds.maxZ+15;z+=.5){let r=road.fullRoadSurfaceAt(x,z,0,terrain.hongKongTerrainHeight(x,z));if(!r)continue;count++;for(const c of b.colliders){if(r.height+4.8<c.minY||r.height+.1>c.maxY)continue;if(contains.colliderContains(c,x,z))hits++;}}
 assert.ok(count>1000);assert.equal(hits,0);
});
test('connected to runtime collision and landmark lists',()=>{const src=require('node:fs').readFileSync('js/cities/hongkong/simple-world.js','utf8');assert.match(src,/buildBlueHouse\(scene\)/);assert.match(src,/\.\.\.blueHouse\.colliders/);assert.match(src,/\.\.\.blueHouse\.landmarks/);});
