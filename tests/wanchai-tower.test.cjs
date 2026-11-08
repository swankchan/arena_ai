const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');let W,A,T,terrain,road,coll,geo;
test.before(async()=>{global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)})})};[W,A,T,terrain,road,coll,geo]=await Promise.all([import('../js/cities/hongkong/wanchai-tower-world.js'),import('../js/cities/hongkong/wanchai-tower-architecture.js'),import('three/webgpu'),import('../js/cities/hongkong/terrain.js'),import('../js/cities/hongkong/full-meta.js'),import('../js/cities/hongkong/colliders.js'),import('../js/cities/hongkong/harbour-city-architecture.js')]);});
test('source mapped tower has distinct materials, windows, signage and night emission',()=>{
 const b=W.buildWanchaiTower(new T.Group()),s=A.WANCHAI_TOWER_SITE;assert.equal(s.osmId,27087041);assert.equal(b.stats.wanchaiTowerHeight,136.5);assert.equal(b.stats.wanchaiTowerLevels,32);assert.ok(b.stats.wanchaiTowerWindows>2000);assert.ok(b.stats.wanchaiTowerLitWindows>400);
 for(const n of ['Wanchai Tower weathered pale precast and piers','Wanchai Tower ribbon windows and upper curtain wall','Wanchai Tower transfer bands','Wanchai Tower mullions and window reveals','Wanchai Tower roof','Wanchai Tower glazed entrance pavilions','Wanchai Tower entrance night lights','Wanchai Tower tactile warning strips','Wanchai Tower entrance pavilion frames and portals','Wanchai Tower north and south granite steps','Wanchai Tower stair nosings','Wanchai Tower stainless stair handrails','Wanchai Tower bilingual facade lettering'])assert.ok(b.group.getObjectByName(n),n);
 assert.ok(b.group.getObjectByName('Wanchai Tower ribbon windows and upper curtain wall').material.emissiveNode);assert.ok(b.group.getObjectByName('Wanchai Tower entrance night lights').material.emissiveNode);
 b.group.updateMatrixWorld(true);for(let i=0;i<s.ring.length;i+=2){const p=new T.Vector3(s.localRing[i],0,s.localRing[i+1]).applyMatrix4(b.group.matrixWorld);assert.ok(Math.abs(p.x-s.ring[i])<1e-7&&Math.abs(p.z-s.ring[i+1])<1e-7);}
});
test('road ribbons and building and projecting step footprints remain separated in discrete samples',()=>{
 const b=W.buildWanchaiTower(new T.Group()),s=A.WANCHAI_TOWER_SITE;let roads=0,hits=0;
 for(let x=Math.floor(s.bounds.minX)-25;x<=s.bounds.maxX+25;x++)for(let z=Math.floor(s.bounds.minZ)-25;z<=s.bounds.maxZ+25;z++){
  const r=road.fullRoadSurfaceAt(x,z,.2,terrain.hongKongTerrainHeight(x,z));if(!r)continue;roads++;
  if(b.colliders.some(c=>r.height+4.8>=c.minY&&r.height+.1<=c.maxY&&coll.colliderContains(c,x,z,.15)))hits++;
  const p=geo.harbourCityWorldToLocal(s,x,z);if(Math.abs(p.x)<17.2&&Math.abs(p.z)>=16.4&&Math.abs(p.z)<=20.9)hits++;
 }
 assert.ok(roads>100);assert.equal(hits,0,`${hits} road overlaps`);
});
test('both stepped approaches follow local ground, with pedestrians choosing the step surface',()=>{
 const b=W.buildWanchaiTower(new T.Group()),s=A.WANCHAI_TOWER_SITE;for(const side of [-1,1]){
 let old=terrain.hongKongTerrainHeight(...Object.values(geo.harbourCityLocalToWorld(s,5,side*20.8)));
 for(let i=0;i<=80;i++){const z=side*(20.7-i*4.1/80),p=geo.harbourCityLocalToWorld(s,5,z),raw=terrain.hongKongTerrainHeight(p.x,p.z),y=b.groundHeightAt(p.x,p.z,raw,old);assert.ok(y>=old-.001&&y-old<=.151,`${side} ${z} ${old} ${y}`);old=y;}
 assert.ok(Math.abs(old-(b.base+1.05))<.001);
 const p=geo.harbourCityLocalToWorld(s,18,side*18.5);assert.equal(b.groundHeightAt(p.x,p.z,b.base,b.base),b.base);
 }
});
test('scene wiring includes the tower and only raises pedestrians off carriageways',()=>{const src=fs.readFileSync('js/cities/hongkong/simple-world.js','utf8');for(const re of [/buildWanchaiTower\(scene\)/,/\.\.\.wanchaiTower\.stats/,/\.\.\.wanchaiTower\.colliders/,/\.\.\.wanchaiTower\.landmarks/,/!groundUsesRoad \? wanchaiTower\.groundHeightAt/])assert.match(src,re);});
test('forecourt samples avoid neighbouring tower walls and surveyed lamp poles',async()=>{
 const [R,I,L]=await Promise.all([import('../js/cities/hongkong/revenue-tower-world.js'),import('../js/cities/hongkong/immigration-tower-world.js'),import('../js/hk-street-light-data.js')]);
 const neighbours=[...R.buildRevenueTower(new T.Group()).colliders,...I.buildImmigrationTower(new T.Group()).colliders],s=A.WANCHAI_TOWER_SITE;
 for(const side of [-1,1])for(let x=-17;x<=17;x+=.5)for(let z=16.6;z<=20.7;z+=.5){const p=geo.harbourCityLocalToWorld(s,x,side*z);assert.ok(!neighbours.some(c=>c.minY<7&&c.maxY>5&&coll.colliderContains(c,p.x,p.z)),`neighbour at ${x},${side*z}`);}
 for(const l of L.HK_STREET_LIGHTS.lamps){const p=geo.harbourCityWorldToLocal(s,l[0],l[1]);assert.ok(!(Math.abs(p.x)<17.2&&Math.abs(p.z)>16.4&&Math.abs(p.z)<20.9),'street lamp inside steps');}
});
