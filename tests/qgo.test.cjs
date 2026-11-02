const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let qgo, terrain, elevation, roads, lamps, clearance;
test.before(async () => {
  qgo = await import('../js/cities/hongkong/qgo-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  elevation = await import('../js/cities/hongkong/road-elevation.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
});
function inside(ring,x,z){let value=false;for(let i=0,j=ring.length-2;i<ring.length;j=i,i+=2){const xi=ring[i],zi=ring[i+1],xj=ring[j],zj=ring[j+1];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)value=!value;}return value;}
function area(ring){let value=0;for(let i=0;i+3<ring.length;i+=2)value+=ring[i]*ring[i+3]-ring[i+2]*ring[i+1];return value*0.5;}
function pointSegmentDistance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],lengthSq=dx*dx+dz*dz,t=lengthSq?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/lengthSq)):0;return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}
function cross(ax,az,bx,bz){return ax*bz-az*bx;}
function segmentsIntersect(a,b,c,d){const rx=b[0]-a[0],rz=b[1]-a[1],sx=d[0]-c[0],sz=d[1]-c[1],denominator=cross(rx,rz,sx,sz),qx=c[0]-a[0],qz=c[1]-a[1];if(Math.abs(denominator)<1e-9)return false;const t=cross(qx,qz,sx,sz)/denominator,u=cross(qx,qz,rx,rz)/denominator;return t>=-1e-9&&t<=1+1e-9&&u>=-1e-9&&u<=1+1e-9;}
function segmentDistance(a,b,c,d){if(segmentsIntersect(a,b,c,d))return 0;return Math.min(pointSegmentDistance(...a,c,d),pointSegmentDistance(...b,c,d),pointSegmentDistance(...c,a,b),pointSegmentDistance(...d,a,b));}
function bounds(ring){const xs=ring.filter((_,index)=>index%2===0),zs=ring.filter((_,index)=>index%2===1);return{minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)};}
function roadConflicts(ring){const result=[],box=bounds(ring);for(const[recordIndex,road]of roads.entries()){const[name,width,,,flags,flat]=road;for(let i=2;i+1<flat.length;i+=2){const a=[flat[i-2],flat[i-1]],b=[flat[i],flat[i+1]],margin=width*0.5+1;if(Math.max(a[0],b[0])<box.minX-margin||Math.min(a[0],b[0])>box.maxX+margin||Math.max(a[1],b[1])<box.minZ-margin||Math.min(a[1],b[1])>box.maxZ+margin)continue;let conflict=inside(ring,...a)||inside(ring,...b);for(let j=0;j<ring.length-2&&!conflict;j+=2)conflict=segmentDistance(a,b,[ring[j],ring[j+1]],[ring[j+2],ring[j+3]])<width*0.5-1e-6;if(conflict)result.push({recordIndex,name,width,flags,segment:i/2-1,a,b});}}return result;}

test('Queensway Government Offices preserves its exact 36-node high-block footprint',()=>{
  const source=qgo.QGO_OSM_SOURCE;assert.equal(source.id,41499029);assert.equal(source.version,13);assert.equal(source.geometry.length,37);assert.equal(new Set(source.geometry.slice(0,-1).map((p)=>p.id)).size,36);
  assert.equal(source.tags.building,'yes');assert.equal(source.tags['building:levels'],'57');assert.equal(source.tags.height,'199');assert.equal(source.tags.layer,'1');assert.equal(qgo.QGO_LOCAL_RING.length,74);
  assert.ok(Math.abs(Math.abs(area(qgo.QGO_LOCAL_RING))-1917.4881758893898)<1e-8);assert.ok(Math.abs(qgo.QGO_SITE.area-1984.6625611110226)<1e-8);
  assert.ok(Math.abs(qgo.QGO_SITE.w-49.92739012946208)<1e-9);assert.ok(Math.abs(qgo.QGO_SITE.d-39.75097748880481)<1e-9);
  for(const g of source.geometry){const x=(g.lon-114.1596)*103056.81753522092,z=-(g.lat-22.2819)*110734.09626824585,p=qgo.qgoWorldToLocal(x,z),q=qgo.qgoLocalToWorld(p.x,p.z);assert.ok(Math.hypot(q.x-x,q.z-z)<1e-9);}
});
test('Queensway Government Offices keeps OSM, CTBUH and published conventions separate',()=>{
  assert.equal(qgo.QGO_OSM_HEIGHT,199);assert.equal(qgo.QGO_CTBUH_HEIGHT,198.7);assert.equal(qgo.QGO_HEIGHT,199);assert.equal(qgo.QGO_OSM_LEVELS,57);assert.equal(qgo.QGO_PUBLISHED_LEVELS,56);assert.equal(qgo.QGO_CTBUH_LEVELS,47);
  assert.equal(qgo.QGO_COMPLETION_YEAR,1985);assert.equal(qgo.QGO_OPENING_YEAR,1986);assert.equal(qgo.QGO_GFA,62077);assert.equal(qgo.QGO_ELEVATORS,28);assert.match(qgo.QGO_ARCHITECT,/K\.M\. Tseng/);assert.equal(qgo.QGO_CONTRACTOR,'Gammon');assert.match(qgo.QGO_SITE.address,/66 Queensway/);
});
test('Queensway Government Offices has 47 visual office courses above open road portals',()=>{
  assert.equal(qgo.QGO_OFFICE_BASE,46);assert.equal(qgo.QGO_OFFICE_TOP,190);assert.equal(qgo.QGO_OFFICE_COURSES,47);assert.equal(qgo.QGO_PANEL_WIDTH,1.45);assert.equal(qgo.QGO_PODIUM_BAY_WIDTH,3.1);
  assert.deepEqual(qgo.QGO_MECHANICAL_FLOORS,[16,32]);assert.deepEqual(qgo.QGO_VISUAL_BELTS,[82,126]);assert.equal(qgo.QGO_ROAD_VEHICLE_CLEARANCE,4.7);
  const office=qgo.qgoRingColliders(qgo.QGO_LOCAL_RING,46,190),crown=qgo.qgoRingColliders(qgo.QGO_LOCAL_RING,190,193);assert.equal(office.length,36);assert.equal(crown.length,36);assert.ok(office.every((c)=>c.maxY===190));
});
test('Queensway Government Offices uses the exact source-tagged Court Road entrance node',()=>{
  const entrance=qgo.QGO_ENTRANCE,g=qgo.QGO_OSM_SOURCE.geometry[25];assert.equal(entrance.nodeId,11779198293);assert.equal(g.id,11779198293);assert.equal(qgo.QGO_ENTRANCE_SOURCE.tags.entrance,'yes');assert.equal(qgo.QGO_ENTRANCE_SOURCE.id,g.id);
  const x=(g.lon-114.1596)*103056.81753522092,z=-(g.lat-22.2819)*110734.09626824585;assert.ok(Math.hypot(entrance.x-x,entrance.z-z)<1e-9);assert.equal(entrance.edge,25);assert.match(entrance.evidence,/entrance=yes/);
  const outward=qgo.qgoFrameToWorld(entrance,0,1);assert.ok(Math.hypot(outward.x-entrance.x-entrance.nx,outward.z-entrance.z-entrance.nz)<1e-9);assert.ok(!qgo.qgoPointInRoadCorridor(entrance.x,entrance.z));
});
test('Queensway Government Offices shares a DTM pad but keeps raw terrain in road corridors',()=>{
  const meta=terrain.HONG_KONG_TERRAIN_META;assert.ok(Math.abs(meta.qgoPadHeight-29.182327886771162)<1e-9);assert.equal(terrain.hongKongTerrainHeight(qgo.QGO_SITE.x,qgo.QGO_SITE.z),meta.qgoPadHeight);
  assert.ok(Math.abs(meta.qgoEntrancePadHeight-33.923207867367836)<1e-9);assert.equal(terrain.hongKongTerrainHeight(qgo.QGO_ENTRANCE.x,qgo.QGO_ENTRANCE.z),meta.qgoEntrancePadHeight);const grounds={plaza:meta.qgoPadHeight+.12,entrance:meta.qgoEntrancePadHeight+.12};assert.equal(qgo.qgoGroundHeightAt(qgo.QGO_ENTRANCE.x,qgo.QGO_ENTRANCE.z,999,grounds),grounds.entrance);const forecourt=qgo.qgoFrameToWorld(qgo.QGO_ENTRANCE,0,2);assert.equal(qgo.qgoGroundHeightAt(forecourt.x,forecourt.z,999,grounds),grounds.entrance);assert.equal(qgo.qgoGroundHeightAt(0,0,999,grounds),999);
  const x=449.65,z=480.6;assert.ok(qgo.qgoPointInRoadCorridor(x,z));assert.equal(terrain.hongKongTerrainHeight(x,z),terrain.rawHongKongTerrainHeight(x,z));
  const source=fs.readFileSync(path.join(root,'js/cities/hongkong/road-elevation.js'),'utf8');assert.match(source,/CKC2_SITE\.ring, QGO_SITE\.ring/);
});
test('Queensway Government Offices preserves both crossing road systems with vehicle clearance',()=>{
  const conflicts=roadConflicts(qgo.QGO_SITE.ring);assert.deepEqual([...new Set(conflicts.map((c)=>`${c.recordIndex}:${c.segment}`))].sort(),['36487:2','36487:3','49953:0','49953:1','49953:2']);
  for(const expected of qgo.QGO_CROSSING_ROADS){const road=roads[expected.recordIndex];assert.equal(road[0],expected.name);assert.equal(road[1],expected.width);assert.equal(road[4],expected.flags);assert.deepEqual(road[5],expected.points);}
  let highest=-Infinity;for(const c of conflicts){const profile=elevation.roadRibbonProfileAtSegment(c.recordIndex,c.segment);assert.ok(profile.heights.every(Number.isFinite));highest=Math.max(highest,...profile.heights);}
  const soffit=terrain.HONG_KONG_TERRAIN_META.qgoPadHeight+qgo.QGO_OFFICE_BASE;assert.ok(soffit-highest>qgo.QGO_ROAD_VEHICLE_CLEARANCE,`insufficient clearance ${soffit-highest}`);
});
test('Queensway Government Offices contains no rendered street lamps',()=>{
  const overrides=new Map(clearance.overrides.map((row)=>[row[0],row])),suppressed=new Set(clearance.suppressed),conflicts=[];for(let index=0;index<lamps.length;index++){if(suppressed.has(index))continue;const lamp=lamps[index],override=overrides.get(index),x=lamp[0]+(override?.[1]||0)/100,z=lamp[1]+(override?.[2]||0)/100;if(inside(qgo.QGO_SITE.ring,x,z))conflicts.push(index);}assert.deepEqual(conflicts,[]);
});
test('Queensway Government Offices opens exactly the road-conflicting podium bays and emits finite colliders',()=>{
  let open=0,closed=0;for(let e=0;e<36;e++){const bays=Math.max(1,Math.ceil(qgo.qgoEdgeOutward(qgo.QGO_LOCAL_RING,e).length/qgo.QGO_PODIUM_BAY_WIDTH));for(let b=0;b<bays;b++){const conflict=qgo.qgoPodiumBayConflict(qgo.QGO_LOCAL_RING,e,b/bays,(b+1)/bays);if(conflict){open++;assert.ok([49953,36487].includes(conflict.recordIndex));}else closed++;}}
  assert.equal(open,37);assert.equal(closed,41);const colliders=qgo.qgoRingColliders(qgo.QGO_LOCAL_RING,46,190);assert.ok(colliders.every((c)=>[c.minX,c.maxX,c.minZ,c.maxZ,c.minY,c.maxY].every(Number.isFinite)));
});
test('Queensway Government Offices hand-built world includes the researched facade, source entrance and LED dragon',()=>{
  const world=fs.readFileSync(path.join(root,'js/cities/hongkong/qgo-world.js'),'utf8');for(const pattern of [/QgoGreenRibbonWindowsAndSlits/,/QgoWhiteConcreteTowerPiers/,/QgoHorizontalSunshadesAndMullions/,/QgoTwoMechanicalLouvreBands/,/QgoOpenParkingRibbons/,/QgoPortalSafeColonnade/,/QgoSourceCourtRoadEntrance/,/QgoPairedCourtRoadEscalators/,/QgoBrandHongKongLedDragonCrown/,/QgoDragonSupportTruss199m/,/QUEENSWAY GOVERNMENT OFFICES/,/金鐘道政府合署/,/cityUniforms\.uInteriorGlow/,/qgoGroundHeightAt/])assert.match(world,pattern);
});
