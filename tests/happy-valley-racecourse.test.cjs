const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.join(__dirname, '..');
let THREE, arch, built, terrain, fullMeta, ringUtils;

test.before(async () => {
  arch = await import('../js/cities/hongkong/happy-valley-racecourse-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  fullMeta = await import('../js/cities/hongkong/full-meta.js');
  ringUtils = await import('../js/cities/hongkong/landmark-site.js');
  THREE = await import('three/webgpu');
  const { buildHappyValleyRacecourse } = await import('../js/cities/hongkong/happy-valley-racecourse-world.js');
  built = buildHappyValleyRacecourse(new THREE.Group(), { groundOffset: terrain.HONG_KONG_TERRAIN_META.happyValleyPadHeight });
});

const site = () => arch.HAPPY_VALLEY_SITE;
const toWorld = (x, z) => {
  const s = site();
  return { x: s.x + Math.cos(s.ry) * x + Math.sin(s.ry) * z, z: s.z - Math.sin(s.ry) * x + Math.cos(s.ry) * z };
};

test('跑馬地馬場 is built on its surveyed OSM relation', () => {
  const source = arch.HAPPY_VALLEY_OSM_SOURCE;
  assert.equal(source.type, 'relation');
  assert.equal(source.id, 8049451);
  assert.equal(source.tags.leisure, 'stadium');
  assert.equal(source.tags.sport, 'horse_racing');
  assert.equal(source.geometry.length, 63);
  assert.equal(site().osmId, 8049451);
  assert.ok(Math.abs(site().ringArea - 198296) < 200, `ring area ${site().ringArea}`);
  assert.ok(Math.abs(site().w - 653.2) < 1, `width ${site().w}`);
  assert.ok(Math.abs(site().d - 378.1) < 1, `depth ${site().d}`);
  assert.equal(built.stats.happyValleyOsmRelation, 8049451);
  assert.equal(built.stats.happyValleyInventoryId, 'HK-B0107');
});

test('the course keeps its published record', () => {
  assert.equal(built.stats.happyValleyCapacity, 20000);
  assert.equal(built.stats.happyValleyOpened, '1846-12-17');
  assert.equal(built.stats.happyValleyTrackWidth, 30.5);
  assert.equal(built.stats.happyValleyPublishedLap, 1417);
  assert.equal(arch.HAPPY_VALLEY_TRACK_PUBLISHED.straightMetres, 312);
  assert.deepEqual([...arch.HAPPY_VALLEY_TRACK_PUBLISHED.races], [1000, 1200, 1650, 1800, 2200]);
  assert.equal(arch.HAPPY_VALLEY_NIGHT_RACING_SINCE, 1973);
  assert.ok(arch.HAPPY_VALLEY_RESEARCH_SOURCES.some((source) => source.url === 'https://racing.hkjc.com/en-us/local/page/racing-course'));
  assert.ok(arch.HAPPY_VALLEY_RESEARCH_SOURCES.some((source) => /1918/.test(source.evidence)), '1918 fire recorded');
  assert.equal(arch.HAPPY_VALLEY_MUSEUM_NODE.id, 12552529862);
});

test('the fitted circuit is honest about the surveyed boundary', () => {
  const track = arch.HAPPY_VALLEY_TRACK;
  // The published 1,417 m lap cannot be laid 1:1 inside the surveyed fence, so the fit is recorded, not hidden.
  assert.ok(track.apronToFenceMetres >= 8, `apron ${track.apronToFenceMetres}`);
  assert.ok(track.lapMetres < 1417);
  assert.ok(Math.abs(track.lapMetres - 1266) < 3, `fitted lap ${track.lapMetres}`);
  assert.ok(Math.abs(built.stats.happyValleyModelledLap - 1266) < 3);
  assert.ok(Math.abs(track.width - 30.5) < 1e-9);
  // The outer running rail really does stay clear of the fence all the way round.
  let minimum = Infinity;
  for (let i = 0; i < 720; i++) {
    const point = arch.happyValleyTrackPoint(i / 720, 0);
    assert.ok(ringUtils.pointInFlatRing(site().ring, ...Object.values(toWorld(point.x, point.z))));
    const world = toWorld(point.x, point.z);
    let best = Infinity;
    const ring = site().ring;
    for (let k = 0; k < ring.length; k += 2) {
      const ax = ring[k], az = ring[k + 1], bx = ring[(k + 2) % ring.length], bz = ring[(k + 3) % ring.length];
      const dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((world.x - ax) * dx + (world.z - az) * dz) / (dx * dx + dz * dz)));
      best = Math.min(best, Math.hypot(world.x - ax - t * dx, world.z - az - t * dz));
    }
    minimum = Math.min(minimum, best);
  }
  assert.ok(minimum >= 8, `minimum apron ${minimum.toFixed(1)} m`);
});

// Continuity alone is not proof that the estimated loop follows the real racing surface.
test('the outer rail is a continuous closed loop', () => {
  const count = 720;
  let maxStep = 0;
  for (let i = 0; i < count; i++) {
    const a = arch.happyValleyTrackPoint(i / count, 0);
    const b = arch.happyValleyTrackPoint((i + 1) / count, 0);
    maxStep = Math.max(maxStep, Math.hypot(b.x - a.x, b.z - a.z));
  }
  assert.ok(maxStep < 5, `adjacent 1/720-lap rail points are ${maxStep.toFixed(2)} m apart`);
});

test('both rails are continuous at every straight-to-curve join and periodic', () => {
  const fit = arch.HAPPY_VALLEY_TRACK;
  const outerRadius = (126.815 + 15.25) * fit.scale;
  const perimeter = 2 * fit.straight + 2 * Math.PI * outerRadius;
  const quarter = Math.PI * outerRadius / 2;
  for (const offset of [0, -8, -16, -24, -fit.width]) {
    for (const t of [0, quarter / perimeter, (quarter + fit.straight) / perimeter,
      (3 * quarter + fit.straight) / perimeter, (3 * quarter + 2 * fit.straight) / perimeter, 1]) {
      const a = arch.happyValleyTrackPoint(t - 1e-8, offset);
      const b = arch.happyValleyTrackPoint(t + 1e-8, offset);
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 0.001, `jump at ${t}, offset ${offset}`);
    }
    const a = arch.happyValleyTrackPoint(-0.1, offset), b = arch.happyValleyTrackPoint(0.9, offset);
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 1e-8);
  }
});

test('floodlight collider centres remain within the venue and off sampled roads', () => {
  // The first six colliders belong to the floodlight masts.
  for (const collider of built.colliders.slice(0, 6)) {
    assert.ok(ringUtils.pointInFlatRing(site().ring, collider.x, collider.z));
    const road = fullMeta.fullRoadSurfaceAt(collider.x, collider.z, 2, terrain.HONG_KONG_TERRAIN_META.happyValleyPadHeight);
    assert.ok(!road || Math.abs(road.height - terrain.HONG_KONG_TERRAIN_META.happyValleyPadHeight) >= 2.5);
  }
});

test('the racing surface never runs over a carriageway', { todo: 'Existing racecourse must be realigned and conflicts resolved' }, () => {
  let inside = 0, conflicts = 0;
  for (let i = 0; i < 720; i += 1) {
    for (const offset of [0, -8, -16, -24, -30]) {
      const point = arch.happyValleyTrackPoint(i / 720, offset);
      const world = toWorld(point.x, point.z);
      inside++;
      const courseHeight = terrain.HONG_KONG_TERRAIN_META.happyValleyPadHeight;
      const hit = fullMeta.fullRoadSurfaceAt(world.x, world.z, 1.0, courseHeight);
      // Only a street at the course's own level is a conflict: 黃泥涌峽天橋 crosses this corner on its own viaduct.
      if (hit && Math.abs(hit.height - courseHeight) < 2.5) conflicts++;
    }
  }
  assert.ok(inside > 3000, `samples ${inside}`);
  assert.equal(conflicts, 0, `${conflicts} points of the track sit on a street at grade`);
});

test('the provisional course and mapped Pavilion are present without the misplaced stands', () => {
  const names = [];
  built.group.traverse((object) => { if (object.name) names.push(object.name); });
  for (const name of [
    'HappyValleyCourse', 'HappyValleyTrackSurface', 'HappyValleyInfieldTurf',
    'HappyValleyRunningRails', 'HappyValleyRunningRailPosts', 'HappyValleyDistancePoles',
    'HappyValleyPavilionStand',
    'HappyValleyInfieldBranding', 'HappyValleyBigScreen', 'HappyValleyBigScreenBase',
    'HappyValleyParadeRingSurface', 'HappyValleyParadeRingCentre', 'HappyValleyParadeRingRail', 'HappyValleyScreenFrame',
    'HappyValleyFloodlightMasts', 'HappyValleyFloodlightHeads', 'HappyValleyPerimeterFence',
  ]) assert.ok(names.includes(name), name);
  for (const name of ['HappyValleyGrandstand', 'HappyValleyClubhouse', 'HappyValleyClubTower', 'HappyValleyClubAndMuseum'])
    assert.ok(!names.includes(name), `${name} was an unmapped placeholder on the wrong side`);
  assert.equal(built.stats.happyValleyFloodlightMasts, 6);
  assert.equal(built.stats.happyValleyBrandingBoards, 3);
  assert.ok(!names.includes('HappyValleyInfieldSandRing'), 'do not obscure mapped sports grounds with a speculative sand oval');
});

test('parade ring follows the mapped paddock, not the old speculative circle', () => {
  assert.equal(arch.HAPPY_VALLEY_PARADE_SOURCE.id, 1056788255);
  assert.equal(built.stats.happyValleyParadeOsmId, 1056788255);
  const source = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/parks.json')))
    .elements.find((element) => element.type === 'way' && element.id === 1056788255);
  assert.deepEqual(arch.HAPPY_VALLEY_PARADE_SOURCE.geometry, source.geometry);
  let surface;
  built.group.traverse((node) => { if (node.name === 'HappyValleyParadeRingSurface') surface = node; });
  assert.ok(surface);
  const pos = surface.geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const localX = pos.getX(i), localZ = pos.getZ(i);
    const nearest = arch.HAPPY_VALLEY_PARADE_LOCAL_RING.reduce((best, x, j, r) =>
      j % 2 ? best : Math.min(best, Math.hypot(x - localX, r[j + 1] - localZ)), Infinity);
    assert.ok(nearest < 0.001, `surface vertex ${i} does not follow OSM`);
  }
  const ring = arch.HAPPY_VALLEY_PARADE_RING;
  for (let i = 0; i < ring.length - 2; i += 2) {
    const ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const steps = Math.ceil(Math.hypot(bx - ax, bz - az));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      const road = fullMeta.fullRoadSurfaceAt(x, z, 1, terrain.HONG_KONG_TERRAIN_META.happyValleyPadHeight);
      assert.ok(!road || Math.abs(road.height - terrain.HONG_KONG_TERRAIN_META.happyValleyPadHeight) >= 2.5,
        `paddock boundary intersects road ${road?.way.id}`);
    }
  }
  assert.ok(!built.group.getObjectByName('HappyValleyParadeViewingStand'), 'invented stand was removed');
});

test('the built geometry is finite and stands inside the fence', () => {
  let nonFinite = 0, meshes = 0, maxY = -Infinity, minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  built.group.traverse((object) => {
    if (!object.isMesh) return;
    meshes++;
    const position = object.geometry?.getAttribute('position');
    if (!position) return;
    const array = position.array;
    for (let i = 0; i < array.length; i += 3) {
      if (!Number.isFinite(array[i]) || !Number.isFinite(array[i + 1]) || !Number.isFinite(array[i + 2])) nonFinite++;
      maxY = Math.max(maxY, array[i + 1]);
      minX = Math.min(minX, array[i]); maxX = Math.max(maxX, array[i]);
      minZ = Math.min(minZ, array[i + 2]); maxZ = Math.max(maxZ, array[i + 2]);
    }
  });
  assert.equal(nonFinite, 0);
  assert.ok(meshes > 15, `meshes ${meshes}`);
  assert.ok(maxY < 80, `apex ${maxY}`);
  assert.ok(maxX - minX < 700 && maxZ - minZ < 430, `extent ${maxX - minX} x ${maxZ - minZ}`);
  for (const collider of built.colliders) {
    for (const key of ['x', 'z', 'w', 'd', 'minY', 'maxY', 'minX', 'maxX', 'minZ', 'maxZ']) {
      assert.ok(Number.isFinite(collider[key]), `${key} finite`);
    }
    assert.ok(collider.maxY > collider.minY);
  }
});

test('the racecourse is wired into the terrain chain and the unified world', () => {
  const meta = terrain.HONG_KONG_TERRAIN_META;
  const pad = meta.happyValleyPadHeight;
  assert.ok(Number.isFinite(pad));
  assert.ok(Math.abs(terrain.hongKongTerrainHeight(site().x, site().z) - pad) < 1e-9);
  assert.equal(built.groundHeightAt(site().x, site().z, 0), pad);
  assert.equal(built.groundHeightAt(site().x + 4000, site().z, 900), 900);

  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  assert.match(source, /import \{ buildHappyValleyRacecourse \} from '\.\/happy-valley-racecourse-world\.js';/);
  assert.match(source, /\.\.\.happyValley\.stats,/);
  assert.match(source, /\.\.\.happyValley\.colliders,/);
  assert.match(source, /\.\.\.happyValley\.landmarks,/);
  assert.match(source, /\+ kaiTakYouth\.landmarks\.length \+ happyValley\.landmarks\.length/);
  assert.match(source, /!groundUsesRoad \? happyValley\.groundHeightAt\(x, z, kaiTakYouthGround\) : kaiTakYouthGround/);
  assert.equal(built.landmarks[0].id, 'happy-valley-racecourse');
});

test('former speculative tower no longer blocks sampled road through its old footprint', () => {
  const old = { x: 2371.239880716379, z: 1268.8037214225317,
    minX: 2353.703385979262, maxX: 2388.7763754534963,
    minZ: 1251.2672266854145, maxZ: 1286.340216159649,
    obb: { hx: 13, hz: 13, cs: -0.886791576872191, sn: -0.46216955675220855 } };
  const inside = (c, x, z) => {
    const dx=x-c.x, dz=z-c.z;
    return Math.abs(dx*c.obb.cs-dz*c.obb.sn)<=c.obb.hx && Math.abs(dx*c.obb.sn+dz*c.obb.cs)<=c.obb.hz;
  };
  let roadPoints = 0;
  for (let x=old.minX; x<=old.maxX; x++) for (let z=old.minZ; z<=old.maxZ; z++) {
    if (!inside(old,x,z)) continue;
    const hit=fullMeta.fullRoadSurfaceAt(x,z,0,terrain.HONG_KONG_TERRAIN_META.happyValleyPadHeight);
    if (!hit || Math.abs(hit.height-terrain.HONG_KONG_TERRAIN_META.happyValleyPadHeight)>=2.5) continue;
    roadPoints++;
    assert.ok(!built.colliders.some(c => inside(c,x,z) && c.minY < hit.height+2 && c.maxY > hit.height),
      `collider still blocks road ${hit.way.id} at ${x}, ${z}`);
  }
  assert.ok(roadPoints>0, 'old footprint must actually overlap sampled road');
  assert.ok(!built.group.getObjectByName('HappyValleyClubTower'));
});

test('temporary rail and fence gaps avoid sampled same-level road vertices', () => {
  built.group.updateMatrixWorld(true);
  assert.ok(built.stats.happyValleyRoadRailGaps > 0);
  assert.ok(built.stats.happyValleyRoadFenceGaps > 0);
  assert.ok(built.stats.happyValleyRoadSurfaceGaps > 0);
  for (const name of ['HappyValleyTrackSurface', 'HappyValleyRunningRails', 'HappyValleyRunningRailPosts', 'HappyValleyPerimeterFence', 'HappyValleyPerimeterWallBase', 'HappyValleyPerimeterPickets']) {
    const mesh = built.group.getObjectByName(name);
    const pos = mesh.geometry.getAttribute('position'), v = new THREE.Vector3();
    let hits = 0;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      const road = fullMeta.fullRoadSurfaceAt(v.x, v.z, 0, terrain.HONG_KONG_TERRAIN_META.happyValleyPadHeight);
      if (road && Math.abs(road.height - terrain.HONG_KONG_TERRAIN_META.happyValleyPadHeight) < 2.5) hits++;
    }
    assert.equal(hits, 0, `${name}: ${hits} vertices on same-level road`);
  }
});

test('parade-ring inset has walking width and the detailed edge stays off sampled roads', async () => {
  const {happyValleyParadeInset}=await import('../js/cities/hongkong/happy-valley-racecourse-world.js');
  const ring=arch.HAPPY_VALLEY_PARADE_LOCAL_RING, inner=happyValleyParadeInset(ring,3.2);
  assert.ok(inner.length>=8); assert.deepEqual(inner.slice(0,2),inner.slice(-2));
  for(let i=0;i<inner.length-2;i+=2) for(let j=0;j<ring.length-2;j+=2) {
    const dx=ring[j+2]-ring[j], dz=ring[j+3]-ring[j+1];
    const distance=Math.abs(dx*(inner[i+1]-ring[j+1])-dz*(inner[i]-ring[j]))/Math.hypot(dx,dz);
    assert.ok(distance>=3.1999,`inset ${distance}`);
  }
  built.group.updateMatrixWorld(true);
  for(const name of ['HappyValleyParadeRingWall','HappyValleyParadeRingPlanters','HappyValleyParadeRingRedFlowers','HappyValleyParadeRingOrangeFlowers']) {
    const mesh=built.group.getObjectByName(name); assert.ok(mesh,name);
    const vertices=mesh.geometry.getAttribute('position'), v=new THREE.Vector3();
    for(let i=0;i<vertices.count;i++) {
      v.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);
      const hit=fullMeta.fullRoadSurfaceAt(v.x,v.z,0,terrain.HONG_KONG_TERRAIN_META.happyValleyPadHeight);
      assert.ok(!hit || Math.abs(hit.height-terrain.HONG_KONG_TERRAIN_META.happyValleyPadHeight)>=2.5,`${name} road ${hit?.way.id}`);
    }
  }
});

test('racecourse floodlights have discrete night-emissive lamp faces', () => {
  const faces=built.group.getObjectByName('HappyValleyFloodlightLampFaces');
  const frames=built.group.getObjectByName('HappyValleyFloodlightLampFrames');
  assert.ok(faces?.material.isNodeMaterial && faces.material.emissiveNode);
  assert.ok(frames?.isMesh);
  // Six provisional poles, two rows of eight lamps; BoxGeometry has 24 vertices.
  assert.equal(faces.geometry.getAttribute('position').count,6*2*8*24);
  assert.equal(frames.geometry.getAttribute('position').count,6*2*8*24);
  assert.equal(built.stats.happyValleyFloodlightMasts,6);
});

test('racecourse overlays do not cover generated shallow road-tunnel openings', async () => {
  const {TERRAIN_TUNNEL_OPENING_RECTS}=await import('../js/cities/hongkong/road-elevation.js');
  const openings=TERRAIN_TUNNEL_OPENING_RECTS.filter(r=>['osm-tunnel:41116','osm-tunnel:43020'].includes(r.routeId));
  assert.ok(openings.length>=10);
  const meshes=['HappyValleyGroundApron','HappyValleyInfieldTurf','HappyValleyTrackSurface'].map(name=>built.group.getObjectByName(name));
  let inside=0;
  for(const r of openings) for(const a of [-.8,-.4,0,.4,.8]) for(const b of [-.8,0,.8]) {
    const x=r.cx+r.ux*r.hx*a-r.uz*r.hz*b,z=r.cz+r.uz*r.hx*a+r.ux*r.hz*b;
    if(!ringUtils.pointInFlatRing(site().ring,x,z))continue;
    inside++;
    const ray=new THREE.Raycaster(new THREE.Vector3(x,terrain.HONG_KONG_TERRAIN_META.happyValleyPadHeight+1,z),new THREE.Vector3(0,-1,0),0,2);
    assert.equal(ray.intersectObjects(meshes).length,0,`racecourse surface covers ${r.routeId}`);
  }
  assert.ok(inside>50);
});

test('infield tunnel retaining edges stay outside sampled roadway corridors', async () => {
  const {fullRoadWaysNear}=await import('../js/cities/hongkong/full-meta.js');
  const {roadRibbonHeightAtSegment}=await import('../js/cities/hongkong/road-elevation.js');
  const wall=built.group.getObjectByName('HappyValleyTunnelRetainingWalls');
  assert.ok(wall);assert.ok(built.stats.happyValleyTunnelWallSegments>200);
  built.group.updateMatrixWorld(true);let rays=0;
  for(const road of fullRoadWaysNear(2150,835,130)) {
    for(let i=2;i<road.flat.length;i+=2){
      let [ax,az,bx,bz]=road.flat.slice(i-2,i+2),dx=bx-ax,dz=bz-az,L=Math.hypot(dx,dz);
      if(L<.05)continue;
      const nx=dz/L,nz=-dx/L,N=Math.ceil(L);
      for(let j=0;j<=N;j++){
        const t=j/N,x=ax+dx*t,z=az+dz*t,y=roadRibbonHeightAtSegment(road.id,i/2-1,t,x,z),half=road.width/2-.15;
        for(const height of [.3,1.4,2.8,4.2]) {
          const ray=new THREE.Raycaster(new THREE.Vector3(x-nx*half,y+height,z-nz*half),new THREE.Vector3(nx,0,nz),0,2*half);
          assert.equal(ray.intersectObject(wall).length,0,`wall across road ${road.id}, station ${i/2-1}:${t}, height ${height}`);rays++;
        }
      }
    }
  }
  assert.ok(rays>500);
});


test('retaining-wall edge clipping uses exact opening intersections', async () => {
  const {happyValleyOutsideOpeningIntervals:outside}=await import('../js/cities/hongkong/happy-valley-tunnel-walls.js');
  const rect={cx:5,cz:0,ux:1,uz:0,hx:2,hz:1};
  assert.deepEqual(outside({x:0,z:0},{x:10,z:0},[rect]),[[0,.3],[.7,1]]);
  assert.deepEqual(outside({x:0,z:2},{x:10,z:2},[rect]),[[0,1]]);
  assert.deepEqual(outside({x:4,z:0},{x:6,z:0},[rect]),[]);
});

test('floodlight spots illuminate only at night and when the camera is nearby', async () => {
  const {cityUniforms}=await import('../js/tsl-materials.js');
  const previous=cityUniforms.uInteriorGlow.value,lights=[];
  try {
    built.group.traverse(o=>{if(o.name==='HappyValleyFloodlightSpot')lights.push(o)});
    assert.equal(lights.length,12); assert.ok(lights.every(l=>l.isSpotLight&&!l.castShadow));
    const near={cameraSystem:{currentPos:{x:site().x,z:site().z}}},far={cameraSystem:{currentPos:{x:site().x+1200,z:site().z}}};
    cityUniforms.uInteriorGlow.value=0;built.update(near);assert.ok(lights.every(l=>l.intensity===0));
    cityUniforms.uInteriorGlow.value=1.4;built.update(near);assert.ok(lights.every(l=>l.intensity>0));
    built.update(far);assert.ok(lights.every(l=>l.intensity===0));
  } finally {cityUniforms.uInteriorGlow.value=previous;built.update();}
  const source=fs.readFileSync(path.join(root,'js/cities/hongkong/simple-world.js'),'utf8');
  assert.match(source,/happyValley\.update\(context\)/);
});

test('track turf renders vertex-colour mowing bands and distance poles clear sampled roads', () => {
  const turf=built.group.getObjectByName('HappyValleyTrackSurface');
  assert.equal(turf.material.vertexColors,true);
  const colors=turf.geometry.getAttribute('color');
  const shades=new Set();for(let i=0;i<colors.count;i++) shades.add(colors.getY(i).toFixed(3));
  assert.ok(shades.size>=2,'mowing colours must survive clipping');
  built.group.updateMatrixWorld(true);
  const poles=built.group.getObjectByName('HappyValleyDistancePoles');
  assert.ok(poles);
  const v=new THREE.Vector3(), positions=poles.geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++) {
    v.fromBufferAttribute(positions,i).applyMatrix4(poles.matrixWorld);
    const road=fullMeta.fullRoadSurfaceAt(v.x,v.z,0,terrain.HONG_KONG_TERRAIN_META.happyValleyPadHeight);
    assert.ok(!road || Math.abs(road.height-terrain.HONG_KONG_TERRAIN_META.happyValleyPadHeight)>=2.5);
  }
});
