import * as THREE from 'three/webgpu';
import { materialColor, positionWorld } from 'three/tsl';
import {cityUniforms} from '../../tsl-materials.js';
import {
  VICTORIA_PARK, VICTORIA_MODEL_BOAT_POOL, VICTORIA_QUEEN_STATUE, VICTORIA_BOAT_RAMP, victoriaBoatRampPoint, victoriaBoatRampHeight,
  majorParkFeature, majorParkGroundHeightAt, majorParkMinimumTerrain, majorParkPadHeight,
  majorParkArrivalPoints, createMajorParkTreeSites, majorParkLocalToWorld
} from './major-parks-architecture.js';
import {
  createMajorParkMaterials, buildMajorParkBase, buildMajorParkPaths, addMajorParkEntrances,
  addMajorParkFurniture, addMajorParkWater, addMajorParkCourt, addMajorParkPlayground,
  majorParkRingSurface, majorParkRingColliders, majorParkBoxCollider, majorParkLocalGroup,
  majorParkLandmark, majorParkTennisLineRects
} from './major-parks-world-utils.js';
import { merged, box, beam, cylinder, sphere } from './harbour-city-world-utils.js';
import { ringShellGeometry, meshFromGeometry } from './tst-hotel-world-utils.js';

// Photo-directed interpretation of the tensile-roof pavilion photographed in 2009.
// Exact canopy form, orientation and elevations are estimated within the OSM roof ring.
function buildBandstand(feature, group, materials, colliders) {
  const {pad}=majorParkRingSurface(feature, materials.plaza, 'Victoria Park Bandstand OSM terrace', group);
  const local=majorParkLocalGroup(feature,group,pad,'Victoria Park Bandstand tensile canopy and open stage');
  const ring=feature.site.localRing, n=ring.length/2-1, radii=12, roofVertices=[], seams=[], posts=[], cables=[], masonry=[], joints=[], stage=[], fixtures=[], lenses=[];
  const ringPoint=(i,t)=>{const x=ring[2*(i%n)]*.92*t,z=ring[2*(i%n)+1]*.92*t;return [x,z];};
  const roofY=(x,z)=>4.05+3.65*Math.max(Math.exp(-((x-3.2)**2+z*z)/10),Math.exp(-((x+3.2)**2+z*z)/10));
  const vertex=(i,t)=>{const [x,z]=ringPoint(i,t);return [x,roofY(x,z),z];};
  for(let i=0;i<n;i++){
    for(let j=0;j<radii;j++){
      const a=vertex(i,j/radii),b=vertex(i+1,j/radii),c=vertex(i+1,(j+1)/radii),d=vertex(i,(j+1)/radii);
      for(const p of [a,c,b,a,d,c])roofVertices.push(...p);
    }
    // Slim stitched seams follow the curved membrane rather than spanning the interior.
    for(let j=1;j<radii;j++){const a=vertex(i,j/radii),b=vertex(i,(j+1)/radii);a[1]+=.012;b[1]+=.012;beam(seams,a,b,.018,.018);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(roofVertices,3));const roofNormals=[];for(let i=0;i<roofVertices.length;i+=3){const x=roofVertices[i],z=roofVertices[i+2],e=.025,nx=roofY(x-e,z)-roofY(x+e,z),nz=roofY(x,z-e)-roofY(x,z+e),len=Math.hypot(nx,2*e,nz);roofNormals.push(nx/len,2*e/len,nz/len);}geo.setAttribute('normal',new THREE.Float32BufferAttribute(roofNormals,3));geo.computeBoundingBox();geo.computeBoundingSphere();
  const membrane=new THREE.MeshStandardMaterial({color:0xd5d8d3,roughness:.82,side:THREE.DoubleSide});
  const roof=new THREE.Mesh(geo,membrane);roof.name='Victoria Park Bandstand twin-peak tensile fabric roof';roof.castShadow=true;roof.receiveShadow=true;local.add(roof);
  // Offset stone backdrop, a low stage and two shallow entrance steps.
  box(stage,[0,.17,2.55],[10.2,.34,4.2]);box(stage,[0,.08,.24],[10,.16,.55]);
  box(masonry,[0,2.0,4.48],[10.2,3.7,.40]);
  for(let row=0;row<8;row++){const y=.38+row*.43;beam(joints,[-5.1,y,4.26],[5.1,y,4.26],.022,.022);for(let x=-5.1+(row%2)*.35;x<5.1;x+=.70)beam(joints,[x,y,4.25],[x,y+.40,4.25],.018,.018);}
  const wallCentre=majorParkLocalToWorld(feature.site,0,4.48);colliders.push(majorParkBoxCollider(wallCentre.x,wallCentre.z,10.2,.4,pad,pad+3.85,feature.site.ry));
  for(const i of [1,4,7,10]){const [x,z]=ringPoint(i,.80),y=roofY(x,z);beam(posts,[x,.10,z],[x,y,z],.16,.16);const w=majorParkLocalToWorld(feature.site,x,z);colliders.push(majorParkBoxCollider(w.x,w.z,.28,.28,pad,pad+y));}
  for(const x of [-3.2,3.2]){const y=roofY(x,0);beam(posts,[x,y-.1,0],[x,y+.55,0],.10,.10);for(const side of [-1,1])beam(cables,[x,y+.5,0],[x+side*2.4,4.2,side*4.6],.025,.025);}
  for(const x of [-3.2,3.2]){box(fixtures,[x,3.8,.3],[.9,.18,.5]);box(lenses,[x,3.69,.3],[.64,.04,.30]);}
  const stone=new THREE.MeshStandardMaterial({color:0x777e78,roughness:.96});
  merged(local,stage,materials.darkStone,'Victoria Park Bandstand raised dark stage and steps');
  merged(local,masonry,stone,'Victoria Park Bandstand stone backdrop');
  merged(local,joints,materials.darkStone,'Victoria Park Bandstand masonry joints',false);
  merged(local,posts,materials.silver,'Victoria Park Bandstand support masts');
  merged(local,cables,materials.silver,'Victoria Park Bandstand tension cables',false);
  merged(local,seams,materials.stone,'Victoria Park Bandstand membrane seams',false);
  merged(local,fixtures,materials.dark,'Victoria Park Bandstand lighting housings');
  merged(local,lenses,materials.warmLight,'Victoria Park Bandstand night lamp lenses',false);
  const lights=[];for(const x of [-3.2,3.2]){const light=new THREE.PointLight(0xffd29a,0,13,2);light.position.set(x,3.6,1.2);local.add(light);lights.push(light);}
  return {update(){const glow=THREE.MathUtils.smoothstep(cityUniforms.uInteriorGlow.value,.55,1.4);for(const light of lights)light.intensity=18*glow;}};
}
function buildQueen(feature, group, materials, colliders) {
  majorParkRingSurface(feature, materials.stone, 'Queen Victoria monument provisional stone forecourt', group);
  const pad = majorParkPadHeight(feature), local = majorParkLocalGroup(feature, group, pad, 'Queen Victoria bronze monument and granite pedestal');
  const stone = [], joints = [], bronzeParts = [];
  // The present park monument stands on a tall rectangular stone pedestal, not
  // a stack of broad ground-level steps. Seven feet is a published approximate
  // height; width, individual courses and orientation remain photo estimates.
  box(stone, [0, .81, 0], [3.05, 1.62, 2.80]);
  box(stone, [0, 1.68, 0], [3.13, .12, 2.88]);
  box(stone, [0, 1.80, 0], [3.02, .12, 2.77]);
  box(stone, [0, 1.91, 0], [2.92, .10, 2.68]);
  box(stone, [0, 2.02, 0], [2.82, .12, 2.58]);
  box(stone, [0, 2.10, 0], [2.76, .04, 2.52]);
  // Fine stone joints visible in the photograph, intentionally subdued rather
  // than black outlines or a guessed inscription.
  for (const x of [-.52, .52]) for (const z of [-1.401, 1.401])
    box(joints, [x,.81,z], [.012,1.58,.006]);
  for (const z of [-.48, .48]) for (const x of [-1.526,1.526])
    box(joints, [x,.81,z], [.006,1.58,.012]);
  box(bronzeParts, [0, 3.05, 0], [1.35, 1.05, 1.15]);
  sphere(bronzeParts, [0, 4.05, -.05], .52, 16); sphere(bronzeParts, [0, 4.68, -.05], .25, 14);
  beam(bronzeParts, [-.52, 3.95, 0], [-.90, 3.10, .18], .20, .20); beam(bronzeParts, [.52, 3.95, 0], [.90, 3.10, .18], .20, .20);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2; cylinder(bronzeParts, [Math.cos(a) * .20, 4.98, -.05 + Math.sin(a) * .20], .035, .28, 8);
  }
  // Figure is still the old crude placeholder and must not be mistaken for a
  // completed sculpt. Shift it down to sit on the revised pedestal.
  for (const part of bronzeParts) part.translate(0, -.40, 0);
  const bronze = new THREE.MeshStandardMaterial({ color: 0x302d29, roughness: .68, metalness: .48 });
  const granite = new THREE.MeshStandardMaterial({ color: 0x96968d, roughness: .92 });
  const jointMaterial = new THREE.MeshStandardMaterial({ color: 0x777970, roughness: 1 });
  merged(local, stone, granite, 'Queen Victoria monument provisional granite pedestal');
  merged(local, joints, jointMaterial, 'Queen Victoria pedestal fine stone joints', false);
  merged(local, bronzeParts, bronze, 'Queen Victoria crude placeholder figure — sculpture not yet reconstructed');
  colliders.push(majorParkBoxCollider(feature.site.x, feature.site.z, 3.13, 2.88, pad, pad + 4.75, feature.site.ry));
}
function buildModelBoatPool(group, materials, colliders) {
  const feature = VICTORIA_MODEL_BOAT_POOL, { pad } = addMajorParkWater(feature, group, materials, colliders, { shallow: true });
  // A subtle tiled colour impression under broken reflections, based on contemporary
  // photographs; this is not a measured mosaic or simulation of moving water.
  // Paved promontory projects between the two water areas. Its shape and
  // orientation are an explicit estimate rather than an engineering plan.
  const finger = ringShellGeometry(feature.fingerRing, majorParkMinimumTerrain(feature), pad + .14);
  meshFromGeometry(group, finger, materials.plaza, 'Victoria Model Boat Pool provisional paved dividing finger');
  const rampVertices = [], ramp = VICTORIA_BOAT_RAMP, width = ramp.halfFinger + ramp.sideBlend;
  const vertex = (u, v) => { const p = victoriaBoatRampPoint(u, v); return [p.x, victoriaBoatRampHeight(p.x, p.z) + .008, p.z]; };
  const columns = 24, rows = 12;
  for (let i = 0; i < columns; i++) for (let j = 0; j < rows; j++) {
    const u0 = -width + 2 * width * i / columns, u1 = -width + 2 * width * (i + 1) / columns;
    const v0 = ramp.length * j / rows, v1 = ramp.length * (j + 1) / rows;
    for (const p of [vertex(u0,v0),vertex(u0,v1),vertex(u1,v0),vertex(u1,v0),vertex(u0,v1),vertex(u1,v1)]) rampVertices.push(...p);
  }
  const rampGeometry = new THREE.BufferGeometry();
  rampGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rampVertices, 3));
  rampGeometry.computeVertexNormals(); rampGeometry.computeBoundingBox(); rampGeometry.computeBoundingSphere();
  meshFromGeometry(group, rampGeometry, materials.path, 'Victoria Model Boat Pool DTM transition to finger');
  const water = group.getObjectByName(`${feature.name} water surface`);
  const poolWater = new THREE.MeshStandardNodeMaterial();
  poolWater.copy(materials.shallowWater);
  poolWater.color.set(0x73aaa4);
  const mosaic = positionWorld.x.mul(5.4).sin().mul(positionWorld.z.mul(5.4).sin()).mul(.045);
  const ripples = positionWorld.x.mul(1.9).add(positionWorld.z.mul(.8)).sin().mul(.055);
  poolWater.colorNode = materialColor.rgb.mul(mosaic.add(ripples).add(.95));
  water.material = poolWater;
  const local = majorParkLocalGroup(feature, group, pad, 'Victoria Park small model boats');
  const hulls = [], cabin = [], details = [], sail = [];
  // Small electrically propelled model launch and a sailing model, rather than
  // three identical oversized white spheres. Their presence is illustrative.
  const hull = (x, z, length, width) => {
    const g = new THREE.SphereGeometry(1, 16, 10);
    g.scale(length * .5, .13, width * .5); g.translate(x, .08, z); hulls.push(g);
  };
  hull(-8, -3, 1.4, .42);
  box(cabin, [-8.1, .27, -3], [.45, .25, .29]);
  box(details, [-8.1, .42, -3], [.49, .04, .32]);
  beam(details, [-7.95,.39,-3], [-7.95,.73,-3], .025, .025);
  hull(8, 3, 1.25, .34);
  beam(details, [8,.16,3], [8,1.15,3], .025, .025);
  const cloth = new THREE.BufferGeometry();
  cloth.setAttribute('position', new THREE.Float32BufferAttribute([8,.23,3, 8,1.10,3, 8.68,.25,3], 3));
  cloth.computeVertexNormals(); sail.push(cloth);
  const sailMaterial = new THREE.MeshStandardMaterial({ color: 0xe3e0cf, roughness: .85, side: THREE.DoubleSide });
  merged(local, hulls, materials.white, 'Victoria Park Model Boat Pool small model hulls');
  merged(local, cabin, materials.white, 'Victoria Park Model Boat Pool model launch cabin');
  merged(local, details, materials.dark, 'Victoria Park Model Boat Pool mast and launch fittings');
  merged(local, sail, sailMaterial, 'Victoria Park Model Boat Pool model sail', false);
}
function buildFountainPlaza(feature, group, materials, colliders) {
  const { pad } = majorParkRingSurface(feature, materials.plaza, 'Victoria Park Water Fountain Plaza exact OSM pedestrian terrace', group);
  const local = majorParkLocalGroup(feature, group, pad, 'Victoria Park main-entrance fountain basin and jets');
  const basin = [], water = [], jets = [];
  cylinder(basin, [0, .20, 0], 13.5, .4, 48); cylinder(basin, [0, .42, 0], 12.8, .18, 48);
  const surface = new THREE.CircleGeometry(12.2, 48); surface.rotateX(-Math.PI / 2); surface.translate(0, .54, 0); water.push(surface);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, r = i % 2 ? 7.5 : 4.2;
    beam(jets, [Math.cos(a) * r, .58, Math.sin(a) * r], [Math.cos(a) * r * .8, 2.2 + (i % 3) * .4, Math.sin(a) * r * .8], .055, .055);
  }
  merged(local, basin, materials.stone, 'Victoria Park Fountain Plaza circular stone basin');
  merged(local, water, materials.water, 'Victoria Park Fountain Plaza raised water surface', false);
  merged(local, jets, materials.ripple, 'Victoria Park Fountain Plaza twelve vertical jets', false);
  colliders.push(majorParkBoxCollider(feature.site.x, feature.site.z, 25, 25, pad, pad + .8));
}
function buildCentreCourt(feature, group, materials, colliders) {
  const { pad } = majorParkRingSurface(feature, materials.plaza, 'Victoria Park Centre Court exact OSM arena terrace', group);
  const local = majorParkLocalGroup(feature, group, pad + .025, 'Victoria Park Centre Court playing surface, stepped stands and floodlights');
  const court = [], lines = [], nets = [], stands = [], lights = [];
  const w = 23.8, d = 42;
  box(court, [0, 0, 0], [w, .05, d]);
  const line = (x, z, lw, ld) => box(lines, [x, .04, z], [lw, .025, ld]);
  // The arena playing floor is larger than the marked tennis court.
  for (const rect of majorParkTennisLineRects(10.97, 23.77)) line(...rect);
  beam(nets, [-6.4, .95, 0], [6.4, .95, 0], .06, .06);
  for (const side of [-1, 1]) for (let row = 0; row < 6; row++) {
    const x = side * (w * .62 + row * 1.15); box(stands, [x, row * .38 + .18, 0], [1.1, .36 + row * .04, d * 1.18]);
  }
  for (const side of [-1, 1]) for (let row = 0; row < 4; row++) {
    const z = side * (d * .57 + row * 1.15); box(stands, [0, row * .38 + .18, z], [w * 1.12, .36 + row * .04, 1.1]);
  }
  for (const x of [-feature.site.w * .40, feature.site.w * .40]) for (const z of [-feature.site.d * .35, 0, feature.site.d * .35]) {
    cylinder(lights, [x, 8.5, z], .13, 17, 12); box(lights, [x, 17, z], [2.4, .28, .8]);
    const world = majorParkLocalToWorld(feature.site, x, z); colliders.push(majorParkBoxCollider(world.x, world.z, .35, .35, pad, pad + 17));
  }
  merged(local, court, materials.tennis, 'Victoria Park Centre Court blue-green playing rectangle');
  merged(local, lines, materials.line, 'Victoria Park Centre Court painted tennis lines', false);
  merged(local, nets, materials.dark, 'Victoria Park Centre Court net');
  merged(local, stands, materials.stone, 'Victoria Park Centre Court stepped spectator stands');
  merged(local, lights, materials.metal, 'Victoria Park Centre Court six floodlight masts');
  // The playing rectangle remains walkable; the stepped side/end stands are solid.
  for (const side of [-1, 1]) {
    const world = majorParkLocalToWorld(feature.site, side * (w * .62 + 3), 0);
    colliders.push(majorParkBoxCollider(world.x, world.z, 7, d * 1.18, pad, pad + 2.4, feature.site.ry));
  }
}
// Procedural, restrained colour variation: no external texture assets needed.
function texturedVictoriaMaterial(hex, roughness = .9) {
  const material = new THREE.MeshStandardNodeMaterial({ color: hex, roughness, metalness: .02 });
  const grain = positionWorld.x.mul(1.73).sin().mul(positionWorld.z.mul(1.31).sin()).mul(.025).add(.96);
  // Bind the tint to the current material, not a shared constant-node uniform.
  material.colorNode = materialColor.rgb.mul(grain);
  return material;
}
function buildPoolBuilding(feature, group, materials, colliders) {
  const pad = majorParkPadHeight(feature), bottom = majorParkMinimumTerrain(feature), wall = 8.2;
  const concrete = texturedVictoriaMaterial(0xa7a79f);
  const roofMaterial = texturedVictoriaMaterial(0x939c9c, .84);
  meshFromGeometry(group, ringShellGeometry(feature.ring, bottom, pad + wall), concrete, 'Victoria Park Swimming Pool exact OSM building mass and DTM foundation');
  // Panel joints follow the actual outline rather than an oversized bounding box.
  const joints = [];
  for (let i = 2; i < feature.ring.length; i += 2) {
    const ax = feature.ring[i - 2], az = feature.ring[i - 1], bx = feature.ring[i], bz = feature.ring[i + 1];
    const length = Math.hypot(bx - ax, bz - az), count = Math.max(1, Math.floor(length / 6));
    for (let n = 1; n < count; n++) {
      const t = n / count, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      beam(joints, [x, pad + .35, z], [x, pad + wall - .2, z], .06, .06);
    }
  }
  merged(group, joints, materials.darkStone, 'Victoria Park Swimming Pool facade panel joints', false);
  const local = majorParkLocalGroup(feature, group, pad, 'Victoria Park Swimming Pool modern glazing and shaded roof deck');
  const glass = [], frames = [];
  for (const z of [-feature.site.d * .43, feature.site.d * .43]) {
    box(glass, [0, 4.2, z], [feature.site.w * .82, 4.8, .14]);
    for (let i = 0; i <= 24; i++) box(frames, [-feature.site.w * .41 + i / 24 * feature.site.w * .82, 4.2, z], [.11, 4.9, .18]);
  }
  merged(local, glass, materials.dark, 'Victoria Park Swimming Pool dark glazed facade bands');
  merged(local, frames, materials.white, 'Victoria Park Swimming Pool white facade mullions');
  // The OSM pool outline is irregular: its bounding rectangle covers nearby courts.
  meshFromGeometry(group, ringShellGeometry(feature.ring, pad + wall, pad + wall + .5), roofMaterial, 'Victoria Park Swimming Pool shaded flat roof');
  colliders.push(...majorParkRingColliders(feature.ring, pad, pad + wall, .9));
}

export function buildVictoriaPark(scene) {
  const park = VICTORIA_PARK, root = new THREE.Group(); root.name = 'Victoria Park — exact site, central lawn, tennis centre, model boat pool and connected sports grounds'; scene.add(root);
  const materials = createMajorParkMaterials(), colliders = [];
  // Differentiate granular synthetic turf from the smoother painted tennis surface.
  materials.soccer = texturedVictoriaMaterial(0x3e7352, .96);
  materials.tennis = texturedVictoriaMaterial(0x336fa0, .9);
  const base = buildMajorParkBase(park, root, materials), paths = buildMajorParkPaths(park, root, materials);
  majorParkRingSurface(majorParkFeature(park, 'centralLawn'), materials.centralLawn, 'Victoria Park Central Lawn exact OSM grass terrace', root);
  buildFountainPlaza(majorParkFeature(park, 'fountainPlaza'), root, materials, colliders);
  buildModelBoatPool(root, materials, colliders); buildQueen(VICTORIA_QUEEN_STATUE, root, materials, colliders);
  const bandstand=buildBandstand(majorParkFeature(park, 'bandstand'), root, materials, colliders);
  buildCentreCourt(majorParkFeature(park, 'centreCourt'), root, materials, colliders);
  buildPoolBuilding(majorParkFeature(park, 'poolBuilding'), root, materials, colliders);
  let courts = 0;
  for (const feature of park.features) {
    if (['soccer', 'basketball', 'tennis', 'bowls', 'roller', 'handball', 'tableTennis'].includes(feature.kind)) { addMajorParkCourt(feature, root, materials, colliders); courts++; }
    if (feature.kind === 'playground') addMajorParkPlayground(feature, root, materials, colliders);
  }
  const entrances = addMajorParkEntrances(park, root, materials, colliders), furniture = addMajorParkFurniture(park, root, materials, colliders);
  // Illuminate from the actual generated path lantern positions, without adding
  // posts in the water, walking routes or carriageways. Only the nearest two
  // contribute local light to keep the cost bounded.
  const poolLights = furniture.lampPositions
    .map(p => ({...p, distance: Math.hypot(p.x - VICTORIA_MODEL_BOAT_POOL.site.x, p.z - VICTORIA_MODEL_BOAT_POOL.site.z)}))
    .filter(p => p.distance < 30).sort((a, b) => a.distance - b.distance).slice(0, 2)
    .map(p => { const light = new THREE.PointLight(0xffd9a5, 0, 22, 2); light.name = 'Victoria model boat pool nearby path lantern light'; light.position.set(p.x, p.y, p.z); root.add(light); return light; });
  const treeSites = createMajorParkTreeSites(park, 175);
  return {
    root, colliders, treeSites, park, update() { bandstand.update(); const glow = THREE.MathUtils.smoothstep(cityUniforms.uInteriorGlow.value, .55, 1.4); for (const light of poolLights) light.intensity = 24 * glow; }, landmarks: [majorParkLandmark(park, 20)], arrivalPoints: majorParkArrivalPoints(park),
    groundHeightAt: (x, z, ground) => majorParkGroundHeightAt(park, x, z, ground),
    stats: {
      victoriaParkSourceWay: park.id, victoriaParkSourceVersion: park.source.version, victoriaParkSiteArea: park.area, victoriaParkOfficialArea: park.officialArea,
      victoriaParkBaseTriangles: base.triangles, victoriaParkRoadClearedArea: base.area,
      victoriaParkPaths: park.paths.length, victoriaParkPathCrossings: paths.crossings,
      victoriaParkSportsCourts: courts + 1, victoriaParkTennisCourts: park.features.filter((feature) => feature.kind === 'tennis').length,
      victoriaParkModelBoatPoolArea: VICTORIA_MODEL_BOAT_POOL.area, victoriaParkModelBoatPoolDepth: .5,
      victoriaParkModelBoatPoolEvidence: 'LCSD official 954 m² and 0.5 m depth; photo-directed scene outline, not an OSM water polygon',
      victoriaParkPoolFacadeEvidence: 'exact OSM building ring; conservative massing and glazing, detailed current exterior not verified',
      victoriaParkProtectedFlyoverRoadIds: [1583, 1586, 1589, 20408, 8033, 2136, 7757, 13119],
      victoriaParkEntranceSigns: entrances, victoriaParkLanterns: furniture.lamps, victoriaParkBenches: furniture.benches,
      victoriaParkTreeCandidates: treeSites.length, victoriaParkColliders: colliders.length,
      victoriaParkHeightEvidence: 'traceable DTM; terraced scene pads are not engineering elevations'
    }
  };
}
