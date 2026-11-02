const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let champion, terrain, elevation, roads, lamps, clearance;
test.before(async () => {
  champion = await import('../js/cities/hongkong/champion-tower-architecture.js');
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
function forecourtRing(){const ring=[];for(const[x,z]of[[-5.4,-0.2],[5.4,-0.2],[5.4,3.2],[-5.4,3.2],[-5.4,-0.2]]){const point=champion.championTowerFrameToWorld(champion.CHAMPION_TOWER_ENTRANCE,x,z);ring.push(point.x,point.z);}return ring;}

test('Champion Tower preserves its exact 15-node OSM wing rather than the whole complex',()=>{
  const source=champion.CHAMPION_TOWER_OSM_SOURCE;
  assert.equal(source.id,85320726);assert.equal(source.version,9);assert.equal(source.geometry.length,16);
  assert.equal(new Set(source.geometry.slice(0,-1).map((point)=>point.id)).size,15);
  assert.equal(source.tags.building,'yes');assert.equal(source.tags['building:use'],'office');assert.equal(source.tags.height,'205');assert.equal(source.tags['building:levels'],'51');
  assert.equal(champion.CHAMPION_TOWER_LOCAL_RING.length,32);
  assert.ok(Math.abs(Math.abs(area(champion.CHAMPION_TOWER_LOCAL_RING))-1841.3171431796509)<1e-8);
  assert.ok(Math.abs(champion.CHAMPION_TOWER_SITE.area-2634.4356106589394)<1e-8,'OBB area is not the actual wing area');
  assert.ok(Math.abs(champion.CHAMPION_TOWER_SITE.w-66.43255828662996)<1e-9);assert.ok(Math.abs(champion.CHAMPION_TOWER_SITE.d-39.65579045281385)<1e-9);
  for(const g of source.geometry){const x=(g.lon-114.1596)*103056.81753522092,z=-(g.lat-22.2819)*110734.09626824585,point=champion.championTowerWorldToLocal(x,z),roundTrip=champion.championTowerLocalToWorld(point.x,point.z);assert.ok(Math.hypot(roundTrip.x-x,roundTrip.z-z)<1e-9);}
});

test('Champion Tower keeps official, OSM, agency and complex conventions separate',()=>{
  assert.equal(champion.CHAMPION_TOWER_OSM_HEIGHT,205);assert.equal(champion.CHAMPION_TOWER_HEIGHT,205);
  assert.equal(champion.CHAMPION_TOWER_OSM_LEVELS,51);assert.equal(champion.CHAMPION_TOWER_OFFICIAL_LEVELS,47);assert.equal(champion.CHAMPION_TOWER_CENTADATA_LEVELS,50);
  assert.equal(champion.CHAMPION_TOWER_ICBC_LEVELS,37);assert.equal(champion.CHAMPION_TOWER_COMPLETION_YEAR,1992);
  assert.equal(champion.CHAMPION_TOWER_GFA_SQFT,770000);assert.equal(champion.CHAMPION_TOWER_TYPICAL_LETTABLE_SQFT,17300);
  assert.equal(champion.CHAMPION_TOWER_COMPLEX_GFA_SQFT,1559000);assert.equal(champion.CHAMPION_TOWER_COMPLEX_GFA_M2,144800);
  assert.equal(champion.CHAMPION_TOWER_COMBINED_LETTABLE_SQFT,34000);assert.equal(champion.CHAMPION_TOWER_CONNECTABLE_FLOORS,26);
  assert.equal(champion.CHAMPION_TOWER_COMPLEX_LIFT_ZONES,9);assert.equal(champion.CHAMPION_TOWER_HIGH_SPEED_LIFTS_PER_ZONE,4);assert.equal(champion.CHAMPION_TOWER_COMPLEX_SERVICE_LIFTS,4);
  assert.equal(champion.CHAMPION_TOWER_PARKING_SPACES,558);assert.match(champion.CHAMPION_TOWER_SITE.address,/3 Garden Road/);
});

test('Champion Tower uses a curved reflective shaft, two visual belts and a 205 m metal crown',()=>{
  assert.equal(champion.CHAMPION_TOWER_LOBBY_TOP,42);assert.equal(champion.CHAMPION_TOWER_OFFICE_TOP,192);assert.equal(champion.CHAMPION_TOWER_OFFICE_COURSES,37);
  assert.equal(champion.CHAMPION_TOWER_PANEL_WIDTH,1.55);assert.equal(champion.CHAMPION_TOWER_LOBBY_PANEL_WIDTH,3.6);
  assert.deepEqual(champion.CHAMPION_TOWER_BELT_LEVELS,[94,144]);assert.equal(champion.CHAMPION_TOWER_BELT_HEIGHT,3.6);
  assert.equal(champion.CHAMPION_TOWER_CURVED_LOBBY_EDGES.length,12);
  const crown=champion.championTowerRingColliders(champion.CHAMPION_TOWER_LOCAL_RING,192,205);assert.equal(crown.length,15);assert.ok(crown.every((c)=>c.maxY===205));
});

test('Champion Tower Garden Road lobby frame is outward and the forecourt is level',()=>{
  const entrance=champion.CHAMPION_TOWER_ENTRANCE;
  assert.equal(champion.CHAMPION_TOWER_ENTRANCE_EDGE,12);assert.equal(entrance.edge,12);assert.match(entrance.evidence,/no entrance-tagged node/);
  const a=champion.CHAMPION_TOWER_OSM_SOURCE.geometry[12],b=champion.CHAMPION_TOWER_OSM_SOURCE.geometry[13];
  const x=((a.lon+b.lon)*0.5-114.1596)*103056.81753522092,z=-((a.lat+b.lat)*0.5-22.2819)*110734.09626824585;
  assert.ok(Math.hypot(entrance.x-x,entrance.z-z)<1e-9);assert.ok(Math.abs(Math.hypot(entrance.nx,entrance.nz)-1)<1e-12);
  const outward=champion.championTowerFrameToWorld(entrance,0,1);assert.ok(Math.hypot(outward.x-entrance.x-entrance.nx,outward.z-entrance.z-entrance.nz)<1e-9);
  const point=champion.championTowerFrameToWorld(entrance,0,2.5);assert.ok(champion.isChampionTowerEntranceForecourtPoint(point.x,point.z));
});

test('Champion Tower has one exact DTM pad shared by terrain, ground queries and road profiles',()=>{
  const meta=terrain.HONG_KONG_TERRAIN_META;assert.ok(Math.abs(meta.championTowerPadHeight-19.652700909351722)<1e-9);
  assert.equal(terrain.hongKongTerrainHeight(champion.CHAMPION_TOWER_SITE.x,champion.CHAMPION_TOWER_SITE.z),meta.championTowerPadHeight);
  assert.equal(terrain.hongKongTerrainHeight(champion.CHAMPION_TOWER_ENTRANCE.x,champion.CHAMPION_TOWER_ENTRANCE.z),meta.championTowerPadHeight);
  const point=champion.championTowerFrameToWorld(champion.CHAMPION_TOWER_ENTRANCE,0,2.5);assert.equal(terrain.hongKongTerrainHeight(point.x,point.z),meta.championTowerPadHeight);
  const grounds={plaza:meta.championTowerPadHeight+0.12};assert.equal(champion.championTowerGroundHeightAt(point.x,point.z,999,grounds),grounds.plaza);
  assert.equal(champion.championTowerGroundHeightAt(0,0,999,grounds),999);
  const source=fs.readFileSync(path.join(root,'js/cities/hongkong/road-elevation.js'),'utf8');assert.match(source,/ONE_IFC_SITE\.ring, CHAMPION_TOWER_SITE\.ring/);
});

test('Champion Tower footprint and arrival court do not cover the adjacent carriageways',()=>{
  assert.deepEqual(roadConflicts(champion.CHAMPION_TOWER_SITE.ring),[]);assert.deepEqual(roadConflicts(forecourtRing()),[]);
  const profile=elevation.roadRibbonProfileAtSegment(35963,0);assert.ok(profile.heights.every(Number.isFinite));
  const road=roads[35963],a=[road[5][0],road[5][1]],b=[road[5][2],road[5][3]];let minimum=Infinity;
  for(let edge=0;edge<15;edge++){const ring=champion.CHAMPION_TOWER_SITE.ring,j=edge*2;minimum=Math.min(minimum,segmentDistance(a,b,[ring[j],ring[j+1]],[ring[j+2],ring[j+3]]));}
  assert.ok(Math.abs(minimum-6.730280338640443)<1e-8);assert.ok(minimum>road[1]*0.5);
});

test('Champion Tower and its entrance forecourt contain no rendered street lamps',()=>{
  const overrides=new Map(clearance.overrides.map((row)=>[row[0],row])),suppressed=new Set(clearance.suppressed),conflicts=[];
  for(let index=0;index<lamps.length;index++){if(suppressed.has(index))continue;const lamp=lamps[index],override=overrides.get(index),x=lamp[0]+(override?.[1]||0)/100,z=lamp[1]+(override?.[2]||0)/100;if(inside(champion.CHAMPION_TOWER_SITE.ring,x,z)||champion.isChampionTowerEntranceForecourtPoint(x,z))conflicts.push(index);}
  assert.deepEqual(conflicts,[]);
});

test('Champion Tower lobby and crown colliders are finite and entrance glazing opens only at the doors',()=>{
  const lobby=champion.championTowerRingColliders(champion.CHAMPION_TOWER_LOCAL_RING,0,42),office=champion.championTowerRingColliders(champion.CHAMPION_TOWER_LOCAL_RING,42,192);
  assert.equal(lobby.length,15);assert.equal(office.length,15);
  assert.ok([...lobby,...office].every((c)=>[c.minX,c.maxX,c.minZ,c.maxZ,c.minY,c.maxY].every(Number.isFinite)));
  const world=fs.readFileSync(path.join(root,'js/cities/hongkong/champion-tower-world.js'),'utf8');assert.match(world,/edge === CHAMPION_TOWER_ENTRANCE_EDGE && Math\.hypot/);assert.match(world,/entranceGap\) continue/);
});

test('Champion Tower hand-built world includes the researched facade, lobby, crown and current signage',()=>{
  const world=fs.readFileSync(path.join(root,'js/cities/hongkong/champion-tower-world.js'),'utf8');
  for(const pattern of [/ChampionTowerReflectiveVisionGlass/,/ChampionTowerSilverSpandrelPanels/,/ChampionTowerDenseHorizontalFloorLines/,/ChampionTowerTwoFramelessCurvedLobbyWalls/,/ChampionTowerLobbySpiderFittings/,/ChampionTowerFullHeightLobbyColumns/,/ChampionTowerCurvedMetalCrownCladding/,/ChampionTowerCrownRibsAnd205mRim/,/ChampionTowerGardenRoadLobbyEntrance/,/ChampionTowerReceptionAndLiftLobby/,/CHAMPION TOWER/,/3 GARDEN ROAD/,/cityUniforms\.uInteriorGlow/,/championTowerGroundHeightAt/])assert.match(world,pattern);
  assert.doesNotMatch(world,/Citi bank|CitibankTowerEntrance|citiLogo/i,'obsolete Citibank branding returned');
});
