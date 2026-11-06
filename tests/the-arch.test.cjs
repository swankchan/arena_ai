const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let arch, terrain, elevation, siteUtils, authored, roads, lamps, clearance;
test.before(async () => {
  arch = await import('../js/cities/hongkong/the-arch-architecture.js');
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

test('The Arch preserves the estate and all four exact OSM tower rings', () => {
  assert.equal(arch.THE_ARCH_ID, 'HK-KLN-ARCH'); assert.equal(arch.THE_ARCH_SITE.osmId, 25608819);
  assert.deepEqual(arch.THE_ARCH_TOWER_SITES.map((site) => site.osmId), [1047822851,294457120,294457121,1047822850]);
  assert.equal(arch.THE_ARCH_SITE.source.geometry.length, 24);
  assert.deepEqual(arch.THE_ARCH_TOWER_SITES.map((site) => site.source.geometry.length), [11,29,27,12]);
  assert.equal(arch.THE_ARCH_TOWER_SITES.length, 4); assert.ok(arch.THE_ARCH_SITE.ringArea > 10954);
});

test('source tower heights and visual courses stay separate from the disputed joining-floor descriptions', () => {
  for (const site of arch.THE_ARCH_TOWER_SITES) {
    assert.equal(site.height, 231); assert.equal(site.levels, 64); assert.equal(site.minHeight, 20);
    assert.equal(site.source.tags['building:min_level'], '4');
  }
  assert.equal(arch.THE_ARCH_VISUAL_COURSES, 60); assert.match(arch.THE_ARCH_RESEARCH.floorEvidence, /62nd versus 69th/);
  assert.match(arch.THE_ARCH_LINK.evidence, /Photo-directed/);
});

test('the Sun–Moon link is contained by the estate and its void sample is genuinely outside both tower rings', () => {
  for (const site of arch.THE_ARCH_TOWER_SITES) for (let i = 0; i < site.ring.length; i += 2) assert.ok(inside(arch.THE_ARCH_SITE.ring, site.ring[i], site.ring[i + 1]));
  for (let i = 0; i < arch.THE_ARCH_LINK_SITE.ring.length; i += 2) assert.ok(inside(arch.THE_ARCH_SITE.ring, arch.THE_ARCH_LINK_SITE.ring[i], arch.THE_ARCH_LINK_SITE.ring[i + 1]));
  assert.ok(Math.abs(arch.THE_ARCH_LINK_SITE.w - 62) < 1e-9); assert.equal(arch.THE_ARCH_LINK_SITE.d, 22);
  assert.ok(!inside(arch.THE_ARCH_SUN_SITE.ring, arch.THE_ARCH_VOID_SAMPLE.x, arch.THE_ARCH_VOID_SAMPLE.z));
  assert.ok(!inside(arch.THE_ARCH_MOON_SITE.ring, arch.THE_ARCH_VOID_SAMPLE.x, arch.THE_ARCH_VOID_SAMPLE.z));
});

test('all retained station-road records and tower corridors are explicit and no cleared lamps occupy the buildings', () => {
  assert.deepEqual(arch.THE_ARCH_ESTATE_ROAD_IDS, [41226,42618,47295,50428,50726,50727,50730,50731,51124,51125,51126,51127]);
  assert.deepEqual(arch.THE_ARCH_SUN_SITE.roadIds, [47295,51124,51125,51126]);
  assert.deepEqual(arch.THE_ARCH_STAR_SITE.roadIds, [47295,50428,50727]);
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed), final = [];
  for (let index = 0; index < lamps.length; index++) {
    if (suppressed.has(index)) continue; const lamp = lamps[index], override = overrides.get(index);
    final.push({ index, x: lamp[0] + (override?.[1] || 0) / 100, z: lamp[1] + (override?.[2] || 0) / 100 });
  }
  for (const site of [arch.THE_ARCH_SITE, ...arch.THE_ARCH_TOWER_SITES]) assert.deepEqual(final.filter((lamp) => inside(site.ring, lamp.x, lamp.z)), []);
});

test('the open podium exceeds the vehicle envelope at every retained road shoulder sample', () => {
  const site = arch.THE_ARCH_SITE, base = terrain.HONG_KONG_TERRAIN_META.theArchPadHeight;
  let minimum = Infinity, samples = 0;
  for (const id of site.roadIds) {
    const road = roads[id], flat = road[5];
    for (let segment = 0; segment < flat.length / 2 - 1; segment++) {
      const ax = flat[segment*2], az = flat[segment*2+1], bx = flat[segment*2+2], bz = flat[segment*2+3];
      const dx = bx-ax, dz = bz-az, length = Math.hypot(dx,dz); if (length < .01) continue;
      const steps = Math.max(1, Math.ceil(length/.5));
      for (let step = 0; step <= steps; step++) {
        const t = step/steps, x = ax+dx*t, z = az+dz*t, roadHeight = elevation.roadRibbonHeightAtSegment(id,segment,t);
        for (const lateral of [-1,0,1]) {
          const px = x+dz/length*road[1]*.5*lateral, pz = z-dx/length*road[1]*.5*lateral;
          if (!inside(site.ring,px,pz)) continue;
          minimum = Math.min(minimum,base+arch.THE_ARCH_GROUND_SOFFIT-.42-roadHeight); samples++;
        }
      }
    }
  }
  assert.ok(samples > 2000); assert.ok(minimum > arch.THE_ARCH_VEHICLE_CLEARANCE, `minimum clearance ${minimum}`);
  assert.ok(Math.abs(minimum - 6.755651367304475) < 1e-9);
});

test('the Arch DTM pad is reproducible and retained road corridors remain road-priority', () => {
  const pad = terrain.theArchPadHeight(); assert.equal(pad,terrain.HONG_KONG_TERRAIN_META.theArchPadHeight);
  assert.equal(pad,authored.authoredHighestRawDatum(arch.THE_ARCH_GROUND_SITES,terrain.rawHongKongTerrainHeight));
  const roadPoint = { x: 343, z: -2332.2 }; assert.ok(inside(arch.THE_ARCH_SITE.ring,roadPoint.x,roadPoint.z));
  assert.equal(arch.theArchTerrainHeightAt(roadPoint.x,roadPoint.z,0,pad),0);
  assert.equal(arch.theArchTerrainHeightAt(arch.THE_ARCH_SKY_SITE.x,arch.THE_ARCH_SKY_SITE.z,0,pad),pad);
});

test('world source authors bronze balconies, green glazing, the open arch, clubhouse and actual crown oculus without photos', () => {
  const world = fs.readFileSync(path.join(root,'js/cities/hongkong/the-arch-world.js'),'utf8');
  for (const pattern of [/projecting balcony slabs and open railings/, /individual green-blue sliding-door panes/, /genuine tall void/, /deep bronze soffit over the real rectangular void/, /actual circular hole/, /coffer.*arch soffit ribs/, /Austin Road West entrance canopy/]) assert.match(world,pattern);
  assert.doesNotMatch(world,/\.(?:jpg|jpeg|png|webp)|TextureLoader/);
});

test('The Arch is integrated into world, ground, roads, map, runtime entry and generated manifest', () => {
  const simple = fs.readFileSync(path.join(root,'js/cities/hongkong/simple-world.js'),'utf8');
  const road = fs.readFileSync(path.join(root,'js/cities/hongkong/road-elevation.js'),'utf8');
  const map = fs.readFileSync(path.join(root,'js/cities/hongkong/map.js'),'utf8');
  const index = fs.readFileSync(path.join(root,'js/cities/hongkong/index.js'),'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(root,'js/app.runtime.manifest.json'),'utf8'));
  assert.match(simple,/buildTheArch/); assert.match(simple,/theArch\.groundHeightAt/); assert.match(simple,/\.\.\.theArch\.colliders/); assert.match(simple,/\.\.\.theArch\.landmarks/);
  assert.match(road,/THE_ARCH_GROUND_RINGS/); assert.match(map,/theArchMapSite/); assert.match(map,/theArchTowerMapSites/); assert.match(index,/theArch: world\.theArch/);
  assert.ok(manifest.inputs.includes('js/cities/hongkong/the-arch-world.js')); assert.ok(manifest.inputs.includes('js/cities/hongkong/the-arch-architecture.js'));
});

test('Node geometry is finite, all four towers are detailed and the crown panel has a real shape hole', async () => {
  globalThis.document = { createElement: () => ({ width:0,height:0,getContext:()=>({fillRect(){},fillText(){}}) }) };
  const THREE = await import('three/webgpu'); const { buildTheArch } = await import('../js/cities/hongkong/the-arch-world.js');
  const scene = new THREE.Scene(), world = buildTheArch(scene,{groundOffset:6.196010572952247});
  let meshes=0,vertices=0,nonFinite=0,crownHoleMeshes=0;
  scene.traverse((object)=>{
    if(!object.isMesh)return; meshes++; const positions=object.geometry.getAttribute('position'); vertices+=positions?.count??0;
    if(positions)for(const value of positions.array)if(!Number.isFinite(value))nonFinite++;
    if(object.name.includes('actual circular hole')) { crownHoleMeshes++; assert.ok(object.geometry.parameters.shapes.holes.length>0); }
  });
  assert.equal(nonFinite,0); assert.ok(meshes>=70); assert.ok(vertices>1700000); assert.equal(crownHoleMeshes,2);
  assert.ok(world.stats.theArchResidentialPanels>24000); assert.equal(world.stats.theArchSourceTowers,4); assert.equal(world.landmarks.length,5);
});

test('no occupied collider seals the tall arch void or the near-top circular opening', async () => {
  globalThis.document = { createElement: () => ({ width:0,height:0,getContext:()=>({fillRect(){},fillText(){}}) }) };
  const THREE = await import('three/webgpu'); const { buildTheArch } = await import('../js/cities/hongkong/the-arch-world.js');
  const base=6.196010572952247,world=buildTheArch(new THREE.Scene(),{groundOffset:base});
  assert.deepEqual(occupied(world.colliders,arch.THE_ARCH_VOID_SAMPLE.x,arch.THE_ARCH_VOID_SAMPLE.z,base+100),[]);
  assert.deepEqual(occupied(world.colliders,arch.THE_ARCH_LINK_SITE.x,arch.THE_ARCH_LINK_SITE.z,base+arch.THE_ARCH_LINK.crownOculusY),[]);
  assert.ok(world.colliders.some((c)=>c.minY>=base+arch.THE_ARCH_LINK.soffit));
});
