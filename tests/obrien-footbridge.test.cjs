const test=require('node:test'),assert=require('node:assert/strict');let A,W,T,terrain,road,coll,building,site,geo;
test.before(async()=>{
 global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)})})};
 [A,W,T,terrain,road,coll,building,site,geo]=await Promise.all([import('../js/cities/hongkong/obrien-footbridge-architecture.js'),import('../js/cities/hongkong/obrien-footbridge-world.js'),import('three/webgpu'),import('../js/cities/hongkong/terrain.js'),import('../js/cities/hongkong/full-meta.js'),import('../js/cities/hongkong/colliders.js'),import('../js/cities/hongkong/immigration-tower-world.js'),import('../js/cities/hongkong/immigration-tower-architecture.js'),import('../js/cities/hongkong/harbour-city-architecture.js')]);
});
test('source-mapped covered bridge and stair have distinct textured structural layers and night lighting',()=>{
 const b=W.buildObrienFootbridge(new T.Group());assert.equal(A.OBRIEN_SOURCE.way,148784104);assert.equal(A.OBRIEN_ROUTE.length,14);assert.ok(b.stats.obrienFootbridgeStairSteps>35);
 for(const name of ['HF95 concrete deck','HF95 covered canopy','HF95 paving joints','HF95 balustrades','HF95 canopy supports','HF95 night ceiling luminaires','HF95 tactile guidance strips','HF95 road-safe piers','HF95 OSM access stairs','HF95 stair canopy','HF95 stair nosings','HF95 stair night lights'])assert.ok(b.group.getObjectByName(name),name);
 assert.ok(b.group.getObjectByName('HF95 night ceiling luminaires').material.emissiveNode);assert.ok(b.group.getObjectByName('HF95 stair night lights').material.emissiveNode);
});
test('deck is selectable for pedestrians at height and never pulls up road users below',()=>{
 const b=W.buildObrienFootbridge(new T.Group());
 for(let i=0;i<A.OBRIEN_ROUTE.length-1;i++)for(let j=0;j<=10;j++){
  let a=A.OBRIEN_ROUTE[i],c=A.OBRIEN_ROUTE[i+1],t=j/10,x=a.x+(c.x-a.x)*t,z=a.z+(c.z-a.z)*t;
  assert.equal(b.groundHeightAt(x,z,5,A.OBRIEN_DECK_HEIGHT),A.OBRIEN_DECK_HEIGHT);
  assert.equal(b.groundHeightAt(x,z,5,5),5);
 }
 const a=A.OBRIEN_STAIR.bottom,c=A.OBRIEN_STAIR.top,g=terrain.hongKongTerrainHeight(a.x,a.z);let previous=g;
 for(let i=0;i<=100;i++){let t=i/100,x=a.x+(c.x-a.x)*t,z=a.z+(c.z-a.z)*t,y=b.groundHeightAt(x,z,g,previous);assert.ok(y>=previous-1e-8 && y-previous<.1);previous=y;}
 assert.ok(Math.abs(previous-A.OBRIEN_DECK_HEIGHT)<1e-8);
});
test('stairs, deck and piers clear mapped roads by 4.8m with 0.2m lateral margin',()=>{
 const b=W.buildObrienFootbridge(new T.Group()),a=A.OBRIEN_STAIR.bottom,c=A.OBRIEN_STAIR.top,dx=c.x-a.x,dz=c.z-a.z,L=Math.hypot(dx,dz),g=terrain.hongKongTerrainHeight(a.x,a.z);let hits=0,stairsRoadSamples=0,deckRoadSamples=0;
 for(let i=0;i<=400;i++)for(let o=-A.OBRIEN_STAIR_WIDTH/2;o<=A.OBRIEN_STAIR_WIDTH/2+.001;o+=.2){let t=i/400,x=a.x+dx*t-dz/L*o,z=a.z+dz*t+dx/L*o,r=road.fullRoadSurfaceAt(x,z,.2,g);if(!r)continue;stairsRoadSamples++;assert.ok(g+(A.OBRIEN_DECK_HEIGHT-g)*t-.35-r.height>=4.8);}
 for(let i=0;i<=400;i++)for(let o=-1.35;o<=1.351;o+=.15){let t=i/400,x=a.x+dx*t-dz/L*o,z=a.z+dz*t+dx/L*o,r=road.fullRoadSurfaceAt(x,z,.2,g);if(r)assert.ok(g+(A.OBRIEN_DECK_HEIGHT-g)*t+3.2-r.height>=4.8);}
 for(let i=0;i<A.OBRIEN_ROUTE.length-1;i++){let a=A.OBRIEN_ROUTE[i],c=A.OBRIEN_ROUTE[i+1],dx=c.x-a.x,dz=c.z-a.z,L=Math.hypot(dx,dz);for(let j=0;j<=Math.ceil(L);j++)for(let o=-A.OBRIEN_WIDTH/2;o<=A.OBRIEN_WIDTH/2;o+=1.2){let t=j/Math.ceil(L),x=a.x+dx*t-dz/L*o,z=a.z+dz*t+dx/L*o,r=road.fullRoadSurfaceAt(x,z,.2,5);if(r){deckRoadSamples++;assert.ok(A.OBRIEN_DECK_HEIGHT-A.OBRIEN_SLAB-r.height>=4.8);}}}
 for(let x=1355;x<1430;x++)for(let z=245;z<510;z++){const r=road.fullRoadSurfaceAt(x,z,0,5);if(!r)continue;for(const c of b.colliders)if(c.minY<=r.height+4.8&&c.maxY>=r.height+.1&&coll.colliderContains(c,x,z))hits++;}
 assert.ok(stairsRoadSamples>100);assert.ok(deckRoadSamples>100);assert.equal(hits,0);
});
test('two first-floor tower entry openings match bridge height',()=>{
 const tower=building.buildImmigrationTower(new T.Group()),s=site.IMMIGRATION_TOWER_SITE;
 for(const x of [2.5,7.5]){const p=geo.harbourCityLocalToWorld(s,x,21.17);assert.ok(!tower.colliders.some(c=>c.minY<13.4&&c.maxY>12.6&&coll.colliderContains(c,p.x,p.z)),`blocked at ${x}`);}
 const pier=geo.harbourCityLocalToWorld(s,5.2,21.17);assert.ok(tower.colliders.some(c=>c.minY<13.4&&c.maxY>12.6&&coll.colliderContains(c,pier.x,pier.z)));
});
test('world wires bridge collision and pedestrian ground separately from cars',()=>{
 const src=require('node:fs').readFileSync('js/cities/hongkong/simple-world.js','utf8');assert.match(src,/buildObrienFootbridge\(scene\)/);assert.match(src,/\.\.\.obrienFootbridge\.colliders/);assert.match(src,/if \(mode !== 'person'\) return finalSurface/);assert.match(src,/obrienFootbridge\.groundHeightAt/);assert.match(src,/immigrationTower\.groundHeightAt/);
});

test('bridge-side lobby floor is continuous and bounded, with night fittings',()=>{
 const tower=building.buildImmigrationTower(new T.Group()),bridge=W.buildObrienFootbridge(new T.Group()),s=site.IMMIGRATION_TOWER_SITE;
 for(const name of ['Immigration Tower 1F vestibule floor','Immigration Tower 1F vestibule ceiling','Immigration Tower 1F floor joints','Immigration Tower 1F tactile strips','Immigration Tower 1F night lights','Immigration Tower HF95 entrance sign'])assert.ok(tower.group.getObjectByName(name),name);
 assert.ok(tower.group.getObjectByName('Immigration Tower 1F night lights').material.emissiveNode);
 for(const x of [2.5,7.5])for(let z=18;z<=23;z+=.1){
  const p=geo.harbourCityLocalToWorld(s,x,z),surface=tower.groundHeightAt(p.x,p.z,bridge.groundHeightAt(p.x,p.z,5,A.OBRIEN_DECK_HEIGHT),A.OBRIEN_DECK_HEIGHT);
  assert.equal(surface,A.OBRIEN_DECK_HEIGHT,`gap at ${x}, ${z}`);
  assert.ok(![...tower.colliders,...bridge.colliders].some(c=>c.minY<A.OBRIEN_DECK_HEIGHT+1.6&&c.maxY>A.OBRIEN_DECK_HEIGHT+.2&&coll.colliderContains(c,p.x,p.z)),`blocked at ${x}, ${z}`);
 }
 const inside=geo.harbourCityLocalToWorld(s,3,18);assert.equal(tower.groundHeightAt(inside.x,inside.z,5,5),5);
 const outside=geo.harbourCityLocalToWorld(s,3,11);assert.equal(tower.groundHeightAt(outside.x,outside.z,5,A.OBRIEN_DECK_HEIGHT),5);
});
test('city lamp poles and arms overlapping HF95 are identified without affecting distant lamps',async()=>{
 const {HK_STREET_LIGHTS:l}=await import('../js/hk-street-light-data.js');const {HK_STREET_LIGHT_CLEARANCE:c}=await import('../js/hk-street-light-clearance-data.js');
 const overrides=new Map(c.overrides.map(a=>[a[0],a])),suppressed=new Set(c.suppressed),ids=[];
 for(let i=0;i<l.lamps.length;i++){if(suppressed.has(i))continue;const [x,z,h,n]=l.lamps[i],o=overrides.get(i);if(A.obrienLampConflicts(x+(o?.[1]||0)/100,z+(o?.[2]||0)/100,h,n))ids.push(i);}
 assert.deepEqual(ids,[109662,109663,109746,109934,109935,111026,111031]);
 assert.equal(A.obrienLampConflicts(0,0,0,1),false);
 const src=require('node:fs').readFileSync('js/cities/hongkong/street-lighting.js','utf8');assert.match(src,/applyClearance && obrienLampConflicts/);assert.match(src,/streetLightFootbridgeSuppressed/);
});
test('OSM Central Plaza link remains walkable from tower lobby through plaza entry',async()=>{
 const {buildCentralPlaza}=await import('../js/cities/hongkong/central-plaza-world.js');const {HONG_KONG_TERRAIN_META:m}=await import('../js/cities/hongkong/terrain.js');
 const tower=building.buildImmigrationTower(new T.Group()),bridge=W.buildObrienFootbridge(new T.Group()),plaza=buildCentralPlaza(new T.Group(),{groundOffset:m.centralPlazaPadHeight}),h=A.OBRIEN_DECK_HEIGHT;
 assert.equal(A.CENTRAL_PLAZA_LINK.way,40491215);assert.ok(plaza.group.getObjectByName('CentralPlaza bridge entrance vestibule floor'));
 let samples=0;
 for(const [name,a,b] of [['lobby',A.IMMIGRATION_LOBBY_LINK.start,A.IMMIGRATION_LOBBY_LINK.end],['bridge',A.CENTRAL_PLAZA_LINK.start,A.CENTRAL_PLAZA_LINK.end],['plaza',A.CENTRAL_PLAZA_LINK.end,A.CENTRAL_PLAZA_LINK.inside]]){
  const dx=b.x-a.x,dz=b.z-a.z,L=Math.hypot(dx,dz);
  for(let i=0;i<=200;i++)for(const offset of [-.6,0,.6]){
   const t=i/200,x=a.x+dx*t-dz/L*offset,z=a.z+dz*t+dx/L*offset;
   assert.equal(bridge.groundHeightAt(x,z,5,h),h);assert.equal(bridge.groundHeightAt(x,z,5,5),5);
   for(const [label,items] of [['tower',tower.colliders],['bridge',bridge.colliders],['plaza',plaza.colliders]])for(const c of items)assert.ok(!(c.minY<h+1.6&&c.maxY>h+.2&&coll.colliderContains(c,x,z,.2)),`${name} blocked by ${label} at ${t} offset ${offset}`);
   const r=road.fullRoadSurfaceAt(x,z,.2,5);if(r)assert.ok(h-A.OBRIEN_SLAB-r.height>=4.8);samples++;
  }
 }
 assert.ok(samples>1500);
});
test('A5 upper approach stays continuous and guarded before the unbuilt station',()=>{
 const b=W.buildObrienFootbridge(new T.Group()),a=A.WANCHAI_A5_APPROACH.start,end=A.WANCHAI_A5_APPROACH.end,h=A.OBRIEN_DECK_HEIGHT,dx=end.x-a.x,dz=end.z-a.z,L=Math.hypot(dx,dz);
 assert.equal(A.WANCHAI_A5_APPROACH.way,242379504);assert.ok(b.group.getObjectByName('Wan Chai A5 upper landing sign'));assert.ok(b.group.getObjectByName('Wan Chai A5 provisional end barrier'));
 for(let i=0;i<90;i++)for(const o of [-.6,0,.6]){
  const t=i/100,x=a.x+dx*t-dz/L*o,z=a.z+dz*t+dx/L*o;assert.equal(b.groundHeightAt(x,z,5,h),h);assert.equal(b.groundHeightAt(x,z,5,5),5);
  assert.ok(!b.colliders.some(c=>c.minY<h+1.6&&c.maxY>h+.2&&coll.colliderContains(c,x,z,.2)),`blocked at ${t}`);
 }
 assert.ok(b.colliders.some(c=>c.minY<h+1.6&&c.maxY>h+.2&&coll.colliderContains(c,end.x,end.z)));
 for(let i=0;i<=100;i++)for(let o=-3.6;o<=3.61;o+=.6){const t=i/100,x=a.x+dx*t-dz/L*o,z=a.z+dz*t+dx/L*o,r=road.fullRoadSurfaceAt(x,z,.2,5);if(r)assert.ok(h-A.OBRIEN_SLAB-r.height>=4.8);}
});
test('A5 street stair connects local terrain to bridge without mapped traffic collisions',()=>{
 const b=W.buildObrienFootbridge(new T.Group()),s=A.WANCHAI_A5_STAIR,top=s.top,bottom=s.bottom,h=A.OBRIEN_DECK_HEIGHT,g=terrain.hongKongTerrainHeight(bottom.x,bottom.z),dx=top.x-bottom.x,dz=top.z-bottom.z,L=Math.hypot(dx,dz);let previous=g, roadSamples=0;
 for(const n of ['Wan Chai A5 street stairs','Wan Chai A5 stair canopy','Wan Chai A5 stair rails','Wan Chai A5 stair night lights'])assert.ok(b.group.getObjectByName(n),n);
 assert.equal(s.way,963983633);assert.ok(b.group.getObjectByName('Wan Chai A5 stair night lights').material.emissiveNode);
 for(let i=0;i<=200;i++){
  let t=i/200,x=bottom.x+dx*t,z=bottom.z+dz*t,y=b.groundHeightAt(x,z,g,previous);
  assert.ok(y>=previous-1e-7&&y-previous<.06);previous=y;
  assert.ok(!b.colliders.some(c=>c.minY<y+1.6&&c.maxY>y+.2&&coll.colliderContains(c,x,z,.25)),`blocked on step ${i}`);
  for(let o=-1.35;o<=1.36;o+=.15){let px=x-dz/L*o,pz=z+dx/L*o,r=road.fullRoadSurfaceAt(px,pz,.2,g);if(r){roadSamples++;assert.ok(g+(h-g)*t-.35-r.height>=4.8,`road conflict ${t} ${o}`);}}
 }
 assert.equal(previous,h);
 for(let i=0;i<=100;i++){let t=i/100,x=top.x+(A.WANCHAI_A5_APPROACH.start.x-top.x)*t,z=top.z+(A.WANCHAI_A5_APPROACH.start.z-top.z)*t;assert.equal(b.groundHeightAt(x,z,g,h),h);assert.ok(!b.colliders.some(c=>c.minY<h+1.6&&c.maxY>h+.2&&coll.colliderContains(c,x,z,.25)),`bridge junction blocked ${t}`);}
 // No road ribbon intersects the stair footprint in this source dataset.
 assert.equal(roadSamples,0);
});
