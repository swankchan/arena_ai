const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let ckc2, terrain, elevation, roads, lamps, clearance;
test.before(async () => {
  ckc2 = await import('../js/cities/hongkong/ckc2-architecture.js');
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
function forecourtRing(){const ring=[];for(const[x,z]of[[-7,-0.2],[7,-0.2],[7,3.2],[-7,3.2],[-7,-0.2]]){const point=ckc2.ckc2FrameToWorld(ckc2.CKC2_ENTRANCE,x,z);ring.push(point.x,point.z);}return ring;}

test('Cheung Kong Center II preserves the exact nine-node chamfered OSM footprint',()=>{
  const source=ckc2.CKC2_OSM_SOURCE;assert.equal(source.id,1272960455);assert.equal(source.version,2);assert.equal(source.geometry.length,10);
  assert.equal(new Set(source.geometry.slice(0,-1).map((p)=>p.id)).size,9);assert.equal(source.tags.building,'commercial');assert.equal(source.tags['construction:building'],'office');assert.equal(source.tags.height,'205');assert.equal(source.tags['building:levels'],'41');
  assert.equal(ckc2.CKC2_LOCAL_RING.length,20);assert.ok(Math.abs(Math.abs(area(ckc2.CKC2_LOCAL_RING))-1420.895655020291)<1e-8);
  assert.ok(Math.abs(ckc2.CKC2_SITE.area-1429.0213473871747)<1e-8);assert.ok(Math.abs(ckc2.CKC2_SITE.w-51.06506246799256)<1e-9);assert.ok(Math.abs(ckc2.CKC2_SITE.d-27.984325844756995)<1e-9);
  for(const g of source.geometry){const x=(g.lon-114.1596)*103056.81753522092,z=-(g.lat-22.2819)*110734.09626824585,p=ckc2.ckc2WorldToLocal(x,z),q=ckc2.ckc2LocalToWorld(p.x,p.z);assert.ok(Math.hypot(q.x-x,q.z-z)<1e-9);}
});
test('Cheung Kong Center II keeps OSM, CTBUH, architect and published conventions separate',()=>{
  assert.equal(ckc2.CKC2_OSM_HEIGHT,205);assert.equal(ckc2.CKC2_CTBUH_HEIGHT,205.5);assert.equal(ckc2.CKC2_DLN_HEIGHT,205.510);assert.equal(ckc2.CKC2_HEIGHT,205.510);assert.equal(ckc2.CKC2_OCCUPIED_HEIGHT,194);
  assert.equal(ckc2.CKC2_OSM_LEVELS,41);assert.equal(ckc2.CKC2_OFFICIAL_LEVELS,41);assert.equal(ckc2.CKC2_COMPLETION_YEAR,2024);assert.equal(ckc2.CKC2_STRUCTURE,'Concrete-Steel Composite');
  assert.equal(ckc2.CKC2_SITE_AREA,3056.509);assert.equal(ckc2.CKC2_GFA,45847);assert.equal(ckc2.CKC2_OFFICE_AREA,45534);assert.equal(ckc2.CKC2_COMMERCIAL_AREA,312);
  assert.equal(ckc2.CKC2_PODIUM_FLOORS,5);assert.equal(ckc2.CKC2_BASEMENT_FLOORS,3);assert.equal(ckc2.CKC2_PARKING_SPACES,178);
  assert.equal(ckc2.CKC2_PUBLISHED_GFA,51096.7);assert.equal(ckc2.CKC2_PUBLISHED_GFA_SQFT,550000);assert.match(ckc2.CKC2_SITE.address,/10 Harcourt Road/);
});
test('Cheung Kong Center II has five podium levels, 36 office courses and a precise crown',()=>{
  assert.equal(ckc2.CKC2_JUMBO_GLASS_TOP,18);assert.equal(ckc2.CKC2_PODIUM_TOP,30);assert.equal(ckc2.CKC2_OFFICE_TOP,194);assert.equal(ckc2.CKC2_OFFICE_COURSES,36);
  assert.equal(ckc2.CKC2_PANEL_WIDTH,1.55);assert.equal(ckc2.CKC2_PODIUM_PANEL_WIDTH,3.8);assert.deepEqual(ckc2.CKC2_BELT_LEVELS,[86,143]);assert.equal(ckc2.CKC2_BELT_HEIGHT,4.2);assert.equal(ckc2.CKC2_SIGN_BAND_BASE,199);
  const crown=ckc2.ckc2RingColliders(ckc2.CKC2_LOCAL_RING,194,ckc2.CKC2_HEIGHT);assert.equal(crown.length,9);assert.ok(crown.every((c)=>c.maxY===205.51));
});
test('Cheung Kong Center II Harcourt Road lobby frame is outward and its forecourt is level',()=>{
  const entrance=ckc2.CKC2_ENTRANCE;assert.equal(ckc2.CKC2_ENTRANCE_EDGE,4);assert.equal(entrance.edge,4);assert.match(entrance.evidence,/no entrance-tagged node/);
  const a=ckc2.CKC2_OSM_SOURCE.geometry[4],b=ckc2.CKC2_OSM_SOURCE.geometry[5],x=((a.lon+b.lon)*.5-114.1596)*103056.81753522092,z=-((a.lat+b.lat)*.5-22.2819)*110734.09626824585;
  assert.ok(Math.hypot(entrance.x-x,entrance.z-z)<1e-9);const outward=ckc2.ckc2FrameToWorld(entrance,0,1);assert.ok(Math.hypot(outward.x-entrance.x-entrance.nx,outward.z-entrance.z-entrance.nz)<1e-9);
  const point=ckc2.ckc2FrameToWorld(entrance,0,2.5);assert.ok(ckc2.isCkc2EntranceForecourtPoint(point.x,point.z));
});
test('Cheung Kong Center II shares one exact DTM pad across terrain, ground and road profiles',()=>{
  const meta=terrain.HONG_KONG_TERRAIN_META;assert.ok(Math.abs(meta.ckc2PadHeight-6.3990500627303675)<1e-9);
  assert.equal(terrain.hongKongTerrainHeight(ckc2.CKC2_SITE.x,ckc2.CKC2_SITE.z),meta.ckc2PadHeight);assert.equal(terrain.hongKongTerrainHeight(ckc2.CKC2_ENTRANCE.x,ckc2.CKC2_ENTRANCE.z),meta.ckc2PadHeight);
  const point=ckc2.ckc2FrameToWorld(ckc2.CKC2_ENTRANCE,0,2.5);assert.equal(terrain.hongKongTerrainHeight(point.x,point.z),meta.ckc2PadHeight);
  const grounds={plaza:meta.ckc2PadHeight+.12};assert.equal(ckc2.ckc2GroundHeightAt(point.x,point.z,999,grounds),grounds.plaza);assert.equal(ckc2.ckc2GroundHeightAt(0,0,999,grounds),999);
  const source=fs.readFileSync(path.join(root,'js/cities/hongkong/road-elevation.js'),'utf8');assert.match(source,/CHAMPION_TOWER_SITE\.ring, CKC2_SITE\.ring/);
});
test('Cheung Kong Center II footprint and arrival court preserve the adjacent carriageways',()=>{
  assert.deepEqual(roadConflicts(ckc2.CKC2_SITE.ring),[]);assert.deepEqual(roadConflicts(forecourtRing()),[]);const profile=elevation.roadRibbonProfileAtSegment(13642,1);assert.ok(profile.heights.every(Number.isFinite));
  const road=roads[13642],a=[road[5][2],road[5][3]],b=[road[5][4],road[5][5]];let minimum=Infinity;for(let edge=0;edge<9;edge++){const r=ckc2.CKC2_SITE.ring,j=edge*2;minimum=Math.min(minimum,segmentDistance(a,b,[r[j],r[j+1]],[r[j+2],r[j+3]]));}
  assert.ok(Math.abs(minimum-7.538663527938291)<1e-8);assert.ok(minimum>road[1]*.5);
});
test('Cheung Kong Center II and its forecourt contain no rendered street lamps',()=>{
  const overrides=new Map(clearance.overrides.map((row)=>[row[0],row])),suppressed=new Set(clearance.suppressed),conflicts=[];
  for(let index=0;index<lamps.length;index++){if(suppressed.has(index))continue;const lamp=lamps[index],override=overrides.get(index),x=lamp[0]+(override?.[1]||0)/100,z=lamp[1]+(override?.[2]||0)/100;if(inside(ckc2.CKC2_SITE.ring,x,z)||ckc2.isCkc2EntranceForecourtPoint(x,z))conflicts.push(index);}assert.deepEqual(conflicts,[]);
});
test('Cheung Kong Center II podium and crown colliders are finite and the entrance opens only at the doors',()=>{
  const podium=ckc2.ckc2RingColliders(ckc2.CKC2_LOCAL_RING,0,30),office=ckc2.ckc2RingColliders(ckc2.CKC2_LOCAL_RING,30,194);assert.equal(podium.length,9);assert.equal(office.length,9);
  assert.ok([...podium,...office].every((c)=>[c.minX,c.maxX,c.minZ,c.maxZ,c.minY,c.maxY].every(Number.isFinite)));const world=fs.readFileSync(path.join(root,'js/cities/hongkong/ckc2-world.js'),'utf8');assert.match(world,/gap=e===4&&Math\.hypot/);assert.match(world,/if\(gap\)continue/);
});
test('Cheung Kong Center II hand-built world includes jumbo glass, art, BMU and CKC II crown signage',()=>{
  const world=fs.readFileSync(path.join(root,'js/cities/hongkong/ckc2-world.js'),'utf8');for(const pattern of [/Ckc2BlueVisionGlass/,/Ckc2SilverFloorGrid/,/Ckc2JumboPodiumGlassWall/,/Ckc2FiveStoreyPodiumUpperGlass/,/Ckc2JumboGlassSpiderFittings/,/Ckc2BurgundySignBand/,/CKC II/,/Ckc2RoofPlantAndTelescopicBmu/,/Ckc2ReachingForTheStarsGlassSpiral/,/CHEUNG KONG CENTER II/,/10 HARCOURT ROAD/,/cityUniforms\.uInteriorGlow/,/ckc2GroundHeightAt/])assert.match(world,pattern);
});
