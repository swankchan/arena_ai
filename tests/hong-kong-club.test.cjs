const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Hong Kong Club uses the real OSM parcel and researched modernist elements', async () => {
  const THREE = await import('three/webgpu');
  const { HONG_KONG_CLUB_SITE:s, HONG_KONG_CLUB_SOURCE:source, HONG_KONG_CLUB_HEIGHT:h, HONG_KONG_CLUB_OFFICE_FLOORS:floors } = await import('../js/cities/hongkong/hong-kong-club-architecture.js');
  const {buildHongKongClub} = await import('../js/cities/hongkong/hong-kong-club-world.js');
  const {harbourCityLocalToWorld} = await import('../js/cities/hongkong/harbour-city-architecture.js');
  const {fullRoadSurfaceAt} = await import('../js/cities/hongkong/full-meta.js');
  assert.equal(source.id,107324765); assert.equal(source.tags.landuse,'commercial');
  assert.match(source.evidence,/not a building footprint/); assert.equal(h,87.4); assert.equal(floors,17);
  assert.ok(Math.abs(s.d-34)<.5,'34 m facade span');
  const result=buildHongKongClub(new THREE.Group());
  for(const name of ['Hong Kong Club flamed granite articulated podium and cores','Hong Kong Club recessed glazing and arched entrance','Hong Kong Club 17 sculpted horizontal sunshades','Hong Kong Club granite corner piers','Hong Kong Club podium terrace greenery']) assert.ok(result.group.getObjectByName(name),name);
  for(const x of [-22,0,22]) for(const z of [-15,0,15]) {const p=harbourCityLocalToWorld(s,x,z); assert.equal(fullRoadSurfaceAt(p.x,p.z,.1),null,'road crosses parcel');}
  const overlap=(p,y)=>result.colliders.some(c=>{
    if(y<c.minY||y>c.maxY)return false;
    const x=p.x-c.obb.cx,z=p.z-c.obb.cz;
    return Math.abs(x*c.obb.cs-z*c.obb.sn)<c.obb.hx && Math.abs(x*c.obb.sn+z*c.obb.cs)<c.obb.hz;
  });
  for(const z of [-1.55,0,1.55]) {
    const p=harbourCityLocalToWorld(s,-22,z);
    assert.equal(overlap(p,result.stats.hongKongClubGround+2),false,`entrance ${z}`);
    assert.equal(overlap(p,result.stats.hongKongClubGround+5),true,`lintel ${z}`);
  }
  assert.equal(result.landmarks[0].osmId,source.id);
});

test('Hong Kong Club is part of the simple world and collision/landmark lists',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../js/cities/hongkong/simple-world.js'),'utf8');
  for(const value of ['buildHongKongClub(scene)','...hongKongClub.stats','...hongKongClub.colliders','...hongKongClub.landmarks']) assert.ok(src.includes(value),value);
});
