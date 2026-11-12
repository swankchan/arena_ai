const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let sorrento, terrain, elevation, siteUtils, authored, roads, lamps, clearance;
test.before(async () => {
  sorrento = await import('../js/cities/hongkong/sorrento-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  elevation = await import('../js/cities/hongkong/road-elevation.js');
  siteUtils = await import('../js/cities/hongkong/landmark-site.js');
  authored = await import('../js/cities/hongkong/authored-landmark-site.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
});
const inside = (ring, x, z) => siteUtils.pointInFlatRing(ring, x, z);
function occupied(colliders, x, z, y) {
  return colliders.filter((c) => {
    if (y < c.minY || y > c.maxY) return false;
    const dx = x - c.obb.cx, dz = z - c.obb.cz;
    return Math.abs(dx * c.obb.cs - dz * c.obb.sn) <= c.obb.hx && Math.abs(dx * c.obb.sn + dz * c.obb.cs) <= c.obb.hz;
  });
}
let worldPromise;
function getWorld() {
  if (!worldPromise) worldPromise = (async () => {
    globalThis.document = { createElement: () => ({ width:0,height:0,getContext:()=>({fillRect(){},fillText(){}}) }) };
    const THREE = await import('three/webgpu');
    const { buildSorrento } = await import('../js/cities/hongkong/sorrento-world.js');
    const scene = new THREE.Scene();
    return { scene, world: buildSorrento(scene,{groundOffset:terrain.HONG_KONG_TERRAIN_META.sorrentoPadHeight}) };
  })();
  return worldPromise;
}

test('Sorrento preserves the exact podium and all five different OSM tower rings', () => {
  assert.equal(sorrento.SORRENTO_ID,'HK-KLN-SORRENTO'); assert.equal(sorrento.SORRENTO_SITE.osmId,25608839);
  assert.deepEqual(sorrento.SORRENTO_TOWER_SITES.map((site)=>site.osmId),[200726103,200720178,200720170,200720177,200720176]);
  assert.equal(sorrento.SORRENTO_SITE.source.geometry.length,38);
  assert.deepEqual(sorrento.SORRENTO_TOWER_SITES.map((site)=>site.source.geometry.length),[45,60,59,60,59]);
  assert.equal(sorrento.SORRENTO_TOWER_SITES.length,5); assert.ok(sorrento.SORRENTO_SITE.ringArea>14952);
  assert.ok(new Set(sorrento.SORRENTO_TOWER_SITES.map((site)=>site.ring.join(','))).size===5);
});

test('source heights, levels and visual courses stay distinct and no T4 is invented', () => {
  assert.deepEqual(sorrento.SORRENTO_TOWER_SITES.map((site)=>site.height),[256.3,236,218,212,206]);
  assert.deepEqual(sorrento.SORRENTO_TOWER_SITES.map((site)=>site.levels),[75,66,64,62,60]);
  for(const site of [sorrento.SORRENTO_SITE,...sorrento.SORRENTO_TOWER_SITES])assert.equal(site.minHeight,20);
  assert.equal(sorrento.SORRENTO_TOWER_SITES.reduce((n,s)=>n+s.levels-6,0),297);
  assert.equal(sorrento.SORRENTO_SITE.height,25);assert.equal(sorrento.SORRENTO_SITE.levels,6);
  assert.match(sorrento.SORRENTO_RESEARCH.sourceConvention,/Crown geometry is photo-directed/);
});

test('the podium road union and tower corridors are explicit and no cleared lamps occupy the buildings', () => {
  assert.deepEqual(sorrento.SORRENTO_ROAD_IDS,[40405,40408,40409,40414,41228,41229,41306,44531,44532,44533,45851,45891,47300,50731,50968,50969,50970,50971,51032,51053,51121,51129,51131,51132,51133,51152,51153,51154]);
  assert.deepEqual(sorrento.SORRENTO_T1_SITE.roadIds,[40405,40414,41306,51121]);
  const overrides=new Map(clearance.overrides.map((row)=>[row[0],row])),suppressed=new Set(clearance.suppressed),final=[];
  for(let index=0;index<lamps.length;index++){
    if(suppressed.has(index))continue;const lamp=lamps[index],override=overrides.get(index);
    final.push({x:lamp[0]+(override?.[1]||0)/100,z:lamp[1]+(override?.[2]||0)/100});
  }
  for(const site of [sorrento.SORRENTO_SITE,...sorrento.SORRENTO_TOWER_SITES])assert.deepEqual(final.filter((lamp)=>inside(site.ring,lamp.x,lamp.z)),[]);
});

test('the open six-level podium exceeds the vehicle envelope at every retained road shoulder sample', () => {
  const site=sorrento.SORRENTO_SITE,base=terrain.HONG_KONG_TERRAIN_META.sorrentoPadHeight;
  let minimum=Infinity,samples=0;
  for(const id of site.roadIds){
    const road=roads[id],flat=road[5];
    for(let segment=0;segment<flat.length/2-1;segment++){
      const ax=flat[segment*2],az=flat[segment*2+1],bx=flat[segment*2+2],bz=flat[segment*2+3],dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz);if(length<.01)continue;
      const steps=Math.max(1,Math.ceil(length/.5));
      for(let step=0;step<=steps;step++){
        const t=step/steps,x=ax+dx*t,z=az+dz*t,roadHeight=elevation.roadRibbonHeightAtSegment(id,segment,t);
        for(const lateral of [-1,0,1]){
          const px=x+dz/length*road[1]*.5*lateral,pz=z-dx/length*road[1]*.5*lateral;if(!inside(site.ring,px,pz))continue;
          minimum=Math.min(minimum,base+sorrento.SORRENTO_GROUND_SOFFIT-.42-roadHeight);samples++;
        }
      }
    }
  }
  assert.equal(samples,4661);assert.ok(minimum>sorrento.SORRENTO_VEHICLE_CLEARANCE,`minimum clearance ${minimum}`);
  // Recaptured after the podium slab started bounding the underpass lift: way 40414 used to be lifted 9.7 m by its OSM
  // layer, which drove the ramp 2 m into this podium. The slab now caps that lift at the headroom it actually leaves, so
  // the minimum is the 4.7 m vehicle requirement plus the 1 mm guard that keeps the strict comparison true.
  assert.ok(Math.abs(minimum-4.700999999999999)<1e-9);
});

test('the Sorrento DTM pad is reproducible and retained road corridors remain road-priority', () => {
  const pad=terrain.sorrentoPadHeight();assert.equal(pad,terrain.HONG_KONG_TERRAIN_META.sorrentoPadHeight);
  assert.equal(pad,authored.authoredHighestRawDatum(sorrento.SORRENTO_GROUND_SITES,terrain.rawHongKongTerrainHeight));
  const roadPoint={x:173.42347064421512,z:-2750.0735439932146};assert.ok(inside(sorrento.SORRENTO_SITE.ring,roadPoint.x,roadPoint.z));
  assert.equal(sorrento.sorrentoTerrainHeightAt(roadPoint.x,roadPoint.z,0,pad),0);
  assert.equal(sorrento.sorrentoTerrainHeightAt(sorrento.SORRENTO_T2_SITE.x,sorrento.SORRENTO_T2_SITE.z,0,pad),pad);
});

test('world source authors winged teal facades, white fins, curved beige crowns and a cantilevered canopy without photos', () => {
  const world=fs.readFileSync(path.join(root,'js/cities/hongkong/sorrento-world.js'),'utf8');
  for(const pattern of [/Winged source rings/,/individual blue-green residential panes/,/continuous white vertical wing fins/,/source-ring beige crown walls/,/curved beige sail roof/,/cantilevered curved canopy/,/curved white shell canopy/])assert.match(world,pattern);
  assert.doesNotMatch(world,/\.(?:jpg|jpeg|png|webp)|TextureLoader/);
});

test('Sorrento is integrated into world, ground, roads, map, runtime entry and generated manifest', () => {
  const simple=fs.readFileSync(path.join(root,'js/cities/hongkong/simple-world.js'),'utf8'),road=fs.readFileSync(path.join(root,'js/cities/hongkong/road-elevation.js'),'utf8');
  const map=fs.readFileSync(path.join(root,'js/cities/hongkong/map.js'),'utf8'),index=fs.readFileSync(path.join(root,'js/cities/hongkong/index.js'),'utf8');
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'js/app.runtime.manifest.json'),'utf8'));
  assert.match(simple,/buildSorrento/);assert.match(simple,/sorrento\.groundHeightAt/);assert.match(simple,/\.\.\.sorrento\.colliders/);assert.match(simple,/\.\.\.sorrento\.landmarks/);
  assert.match(road,/SORRENTO_GROUND_RINGS/);assert.match(map,/sorrentoMapSite/);assert.match(map,/sorrentoTowerMapSites/);assert.match(index,/sorrento: world\.sorrento/);
  assert.ok(manifest.inputs.includes('js/cities/hongkong/sorrento-world.js'));assert.ok(manifest.inputs.includes('js/cities/hongkong/sorrento-architecture.js'));
});

test('Node geometry is finite and all five towers, crowns, podium and curved canopy are detailed', async () => {
  const {scene,world}=await getWorld();let meshes=0,vertices=0,nonFinite=0,curvedRoofs=0,canopies=0;
  scene.traverse((object)=>{
    if(!object.isMesh)return;meshes++;const positions=object.geometry.getAttribute('position');vertices+=positions?.count??0;
    if(positions)for(const value of positions.array)if(!Number.isFinite(value))nonFinite++;
    if(object.name.includes('curved beige sail roof'))curvedRoofs++;if(object.name.includes('curved white shell canopy'))canopies++;
  });
  assert.equal(nonFinite,0);assert.ok(meshes>=70);assert.ok(vertices>1600000);assert.equal(curvedRoofs,5);assert.equal(canopies,1);
  assert.ok(world.stats.sorrentoResidentialPanels>47000);assert.equal(world.stats.sorrentoSourceTowers,5);assert.equal(world.stats.sorrentoBeigeCurvedCrowns,5);
  assert.equal(world.stats.sorrentoOpenRoadBays,76);assert.equal(world.stats.sorrentoEntranceBays,7);assert.equal(world.landmarks.length,6);
});

test('no Sorrento collider occupies the retained carriageway vehicle envelope', async () => {
  const {world}=await getWorld(),site=sorrento.SORRENTO_SITE;let samples=0;
  for(const id of site.roadIds){
    const road=roads[id],flat=road[5];
    for(let segment=0;segment<flat.length/2-1;segment++){
      const ax=flat[segment*2],az=flat[segment*2+1],bx=flat[segment*2+2],bz=flat[segment*2+3],dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz);if(length<.01)continue;
      const steps=Math.max(1,Math.ceil(length));
      for(let step=0;step<=steps;step++){
        const t=step/steps,x=ax+dx*t,z=az+dz*t,y=elevation.roadRibbonHeightAtSegment(id,segment,t)+2;
        for(const lateral of [-1,0,1]){
          const px=x+dz/length*road[1]*.5*lateral,pz=z-dx/length*road[1]*.5*lateral;if(!inside(site.ring,px,pz))continue;
          samples++;assert.deepEqual(occupied(world.colliders,px,pz,y),[],`occupied road ${id}/${segment}/${step}/${lateral}`);
        }
      }
    }
  }
  assert.equal(samples,2376);
  const base=terrain.HONG_KONG_TERRAIN_META.sorrentoPadHeight;
  for(const tower of sorrento.SORRENTO_TOWER_SITES)assert.ok(world.colliders.some((c)=>Math.abs(c.minY-(base+20))<1e-8&&Math.abs(c.maxY-(base+tower.height))<1e-8));
});

test('each curved crown follows its own source ring and stays below the source height', async () => {
  const {world}=await getWorld();
  for(const site of sorrento.SORRENTO_TOWER_SITES){
    const crown=world.crowns[site.key],positions=crown.roof.getAttribute('position');assert.ok(positions.count>=site.source.geometry.length-1);
    let minimum=Infinity,maximum=-Infinity;
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
      let nearest=Infinity;for(let j=0;j<site.localRing.length;j+=2)nearest=Math.min(nearest,Math.hypot(x-site.localRing[j],z-site.localRing[j+1]));
      assert.ok(nearest<1e-4,`${site.key} crown vertex is not on its source ring`);minimum=Math.min(minimum,y);maximum=Math.max(maximum,y);
    }
    assert.ok(minimum>=site.height-4.001);assert.ok(maximum<=site.height-.99);assert.ok(maximum>minimum+1);
  }
});
