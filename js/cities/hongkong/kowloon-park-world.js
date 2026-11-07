import * as THREE from 'three/webgpu';
import {
  KOWLOON_PARK, KOWLOON_FOUNTAIN, KOWLOON_SCULPTURE_POOL, KOWLOON_CHINESE_PAVILION,
  majorParkFeature, majorParkGroundHeightAt, majorParkMinimumTerrain, majorParkPadHeight,
  majorParkArrivalPoints, createMajorParkTreeSites, majorParkLocalToWorld
} from './major-parks-architecture.js';
import {
  createMajorParkMaterials, buildMajorParkBase, buildMajorParkPaths, addMajorParkEntrances,
  addMajorParkFurniture, addMajorParkWater, addMajorParkFountainJets, addMajorParkCourt,
  addMajorParkPlayground, majorParkRingSurface, majorParkRingColliders, majorParkBoxCollider,
  majorParkLocalGroup, fitMajorParkLocalRect, majorParkLandmark
} from './major-parks-world-utils.js';
import { merged, box, beam, cylinder, sphere } from './harbour-city-world-utils.js';
import { ringShellGeometry, meshFromGeometry } from './tst-hotel-world-utils.js';
import { hongKongTerrainHeight } from './terrain.js';

function rectTerrain(feature, rect) {
  let min = Infinity, max = -Infinity;
  for (const x of [rect.x - rect.w * .5, rect.x, rect.x + rect.w * .5]) for (const z of [rect.z - rect.d * .5, rect.z, rect.z + rect.d * .5]) {
    const world = majorParkLocalToWorld(feature.site, x, z), y = hongKongTerrainHeight(world.x, world.z);
    min = Math.min(min, y); max = Math.max(max, y);
  }
  return { bottom: min - .16, pad: max + .105 };
}
function rectFeature(feature, rect, name, kind = 'photoPool') {
  const local = [
    [rect.x - rect.w * .5, rect.z - rect.d * .5], [rect.x + rect.w * .5, rect.z - rect.d * .5],
    [rect.x + rect.w * .5, rect.z + rect.d * .5], [rect.x - rect.w * .5, rect.z + rect.d * .5],
    [rect.x - rect.w * .5, rect.z - rect.d * .5]
  ];
  // A softly rounded photo-directed outdoor leisure-pool outline inside the exact OSM complex.
  const ring = [];
  for (let i = 0; i < 32; i++) {
    const a = i / 32 * Math.PI * 2, lx = rect.x + Math.cos(a) * rect.w * .5, lz = rect.z + Math.sin(a) * rect.d * .5;
    const world = majorParkLocalToWorld(feature.site, lx, lz); ring.push(world.x, world.z);
  }
  ring.push(ring[0], ring[1]);
  const world = majorParkLocalToWorld(feature.site, rect.x, rect.z);
  return { kind, name, ring, site: { x: world.x, z: world.z, w: rect.w, d: rect.d, ry: feature.site.ry }, evidence: 'photo-directed outdoor pool outline inside OSM way 184706095; not an OSM water polygon' };
}
function barrelRoof(rect, baseY, wall, rise, segments = 18) {
  const positions = [], frames = [];
  const point = (index, z) => {
    const a = index / segments * Math.PI;
    return [rect.x + Math.cos(a) * rect.w * .5, baseY + wall + Math.sin(a) * rise, z];
  };
  for (let i = 0; i < segments; i++) {
    const a = point(i, rect.z - rect.d * .5), b = point(i + 1, rect.z - rect.d * .5), c = point(i + 1, rect.z + rect.d * .5), d = point(i, rect.z + rect.d * .5);
    positions.push(...a, ...b, ...c, ...a, ...c, ...d);
    beam(frames, a, d, .12, .12);
  }
  for (const z of [rect.z - rect.d * .5, rect.z, rect.z + rect.d * .5]) for (let i = 0; i < segments; i++) beam(frames, point(i, z), point(i + 1, z), .12, .12);
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.computeVertexNormals();
  return { geometry, frames };
}
function buildSportsCentre(feature, group, materials, colliders) {
  const pad = majorParkPadHeight(feature), bottom = majorParkMinimumTerrain(feature), wall = 9.2;
  // Avoid burying all of the window treatment inside the OSM shell: place
  // modest glazing and vertical joints directly on its actual perimeter.
  meshFromGeometry(group, ringShellGeometry(feature.ring, bottom, pad + wall), materials.paleStone, 'Kowloon Park Sports Centre exact OSM hall walls and DTM foundation');
  const edgeGlass = [], edgeFrames = [], ring = feature.ring;
  let signedArea = 0;
  for (let i = 2; i < ring.length; i += 2) signedArea += ring[i-2] * ring[i+1] - ring[i] * ring[i-1];
  for (let i = 2; i < ring.length; i += 2) {
    const ax = ring[i-2], az = ring[i-1], dx = ring[i]-ax, dz = ring[i+1]-az, length = Math.hypot(dx,dz);
    if (length < 8) continue;
    const ux = dx/length, uz = dz/length, direction = signedArea >= 0 ? 1 : -1;
    const nx = uz*direction, nz = -ux*direction, yaw = Math.atan2(-uz,ux);
    const bays = Math.max(1, Math.floor(length / 5));
    for (let j = 0; j < bays; j++) {
      const t = (j + .5) / bays, px = ax + dx*t + nx*.08, pz = az + dz*t + nz*.08;
      box(edgeGlass, [px, pad + 4.8, pz], [length/bays-.3, 2.7, .12], yaw);
    }
    for (let j = 0; j <= bays; j++) {
      const t = j/bays, px = ax + dx*t + nx*.15, pz = az + dz*t + nz*.15;
      box(edgeFrames, [px, pad + 4.8, pz], [.11, 2.9, .18], yaw);
    }
  }
  merged(group, edgeGlass, materials.window, 'Kowloon Park Sports Centre visible perimeter glazing');
  merged(group, edgeFrames, materials.metal, 'Kowloon Park Sports Centre perimeter window joints');
  const local = majorParkLocalGroup(feature, group, pad, 'Kowloon Park Sports Centre curved roof and dark window bands');
  const glass = [], frames = [], rect = { x: 0, z: 0, w: feature.site.w * .92, d: feature.site.d * .92 };
  for (const z of [-rect.d * .5, rect.d * .5]) {
    box(glass, [0, 4.8, z], [rect.w * .94, 3.2, .12]);
    for (let i = 0; i <= 16; i++) box(frames, [-rect.w * .47 + i / 16 * rect.w * .94, 4.8, z], [.10, 3.3, .16]);
  }
  const roof = barrelRoof(rect, 0, wall, 4.4, 20); frames.push(...roof.frames);
  meshFromGeometry(local, roof.geometry, materials.silver, 'Kowloon Park Sports Centre shallow barrel-vault metal roof');
  merged(local, glass, materials.dark, 'Kowloon Park Sports Centre dark recessed window ribbons');
  merged(local, frames, materials.white, 'Kowloon Park Sports Centre facade mullions and curved roof ribs');
  colliders.push(...majorParkRingColliders(feature.ring, pad, pad + wall + 4.4, .8));
  return { pad };
}
function buildPoolComplex(feature, group, materials, colliders) {
  const local = majorParkLocalGroup(feature, group, 0, 'Kowloon Park Swimming Pool curved indoor hall and outdoor rock pool');
  const hall = fitMajorParkLocalRect(feature, -feature.site.w * .25, feature.site.d * .10, feature.site.w * .33, feature.site.d * .23);
  const { bottom, pad } = rectTerrain(feature, hall), wall = 6.8, rise = 4.8;
  const walls = [], glass = [], frames = [], roofRibs = [];
  box(walls, [hall.x, (bottom + pad + wall) * .5, hall.z], [hall.w, pad + wall - bottom, hall.d]);
  // Recessed dark window band beneath the white curved roof, as seen in the reviewed pool photographs.
  for (const z of [hall.z - hall.d * .5 - .03, hall.z + hall.d * .5 + .03]) {
    box(glass, [hall.x, pad + 3.7, z], [hall.w * .90, 3.4, .10]);
    for (let i = 0; i <= 18; i++) box(frames, [hall.x - hall.w * .45 + i / 18 * hall.w * .90, pad + 3.7, z], [.10, 3.5, .14]);
  }
  const roof = barrelRoof(hall, pad, wall, rise, 22); roofRibs.push(...roof.frames);
  meshFromGeometry(local, roof.geometry, materials.glass, 'Kowloon Park Swimming Pool curved glazed indoor-hall roof', false);
  merged(local, walls, materials.white, 'Kowloon Park Swimming Pool white hall and terraced foundation');
  merged(local, glass, materials.dark, 'Kowloon Park Swimming Pool dark indoor-hall window band');
  merged(local, frames, materials.white, 'Kowloon Park Swimming Pool window mullions');
  merged(local, roofRibs, materials.white, 'Kowloon Park Swimming Pool white curved roof ribs');
  const hallWorld = majorParkLocalToWorld(feature.site, hall.x, hall.z);
  colliders.push(majorParkBoxCollider(hallWorld.x, hallWorld.z, hall.w, hall.d, pad, pad + wall + rise, feature.site.ry));
  const outdoorRect = fitMajorParkLocalRect(feature, feature.site.w * .05, -feature.site.d * .24, feature.site.w * .50, feature.site.d * .23);
  const outdoor = rectFeature(feature, outdoorRect, 'Kowloon Park outdoor rock-edge leisure pool');
  const water = addMajorParkWater(outdoor, group, materials, colliders, { shallow: true });
  const rocks = [];
  for (let i = 0; i < 28; i++) {
    const a = i / 28 * Math.PI * 2, world = majorParkLocalToWorld(feature.site, outdoorRect.x + Math.cos(a) * outdoorRect.w * .51, outdoorRect.z + Math.sin(a) * outdoorRect.d * .53);
    sphere(rocks, [world.x, water.pad + .15, world.z], .55 + (i % 4) * .16, 9);
  }
  merged(group, rocks, materials.darkStone, 'Kowloon Park outdoor leisure-pool rock edge');
  return { pad, outdoorPad: water.pad };
}
function buildHeritage(feature, group, materials, colliders) {
  const pad = majorParkPadHeight(feature), bottom = majorParkMinimumTerrain(feature), height = 6.4;
  meshFromGeometry(group, ringShellGeometry(feature.ring, bottom, pad + height), materials.white, 'Health Education Centre exact historic barracks building and foundation');
  const local = majorParkLocalGroup(feature, group, pad, 'Health Education Centre verandas, shutters and pitched roof');
  const columns = [], dark = [], roof = [];
  for (const side of [-1, 1]) for (let i = 0; i <= 12; i++) {
    const x = -feature.site.w * .44 + i / 12 * feature.site.w * .88, z = side * feature.site.d * .46;
    cylinder(columns, [x, 1.55, z], .14, 3.1, 10); cylinder(columns, [x, 4.7, z], .14, 3.1, 10);
    box(dark, [x, 1.65, side * feature.site.d * .40], [.72, 1.55, .10]); box(dark, [x, 4.75, side * feature.site.d * .40], [.72, 1.55, .10]);
  }
  const roofMesh = new THREE.ConeGeometry(1, 1, 4); roofMesh.rotateY(Math.PI / 4); roofMesh.scale(feature.site.w * .73, 2.0, feature.site.d * .75); roofMesh.translate(0, height + 1, 0); roof.push(roofMesh);
  merged(local, columns, materials.white, 'Health Education Centre two-storey colonial veranda columns');
  merged(local, dark, materials.dark, 'Health Education Centre dark louvred windows');
  merged(local, roof, materials.darkStone, 'Health Education Centre dark hipped roof');
  colliders.push(...majorParkRingColliders(feature.ring, pad, pad + height, .45));
}
function buildPavilion(feature, group, materials, colliders) {
  majorParkRingSurface(feature, materials.stone, 'Chinese Garden pavilion exact stone terrace', group);
  const pad = majorParkPadHeight(feature), local = majorParkLocalGroup(feature, group, pad, 'Chinese Garden octagonal pavilion, open columns and double tiled eaves');
  const stone = [], timber = [], roofs = [], screens = [];
  cylinder(stone, [0, .20, 0], 6.0, .4, 8); cylinder(stone, [0, .48, 0], 5.5, .18, 8);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, x = Math.cos(a) * 4.5, z = Math.sin(a) * 4.5;
    cylinder(timber, [x, 2.65, z], .18, 4.5, 12);
    const next = (i + 1) / 8 * Math.PI * 2;
    if (i % 3 !== 0) for (let k = 1; k < 5; k++) beam(screens, [x, .65 + k * .55, z], [Math.cos(next) * 4.5, .65 + k * .55, Math.sin(next) * 4.5], .065, .065);
    const world = majorParkLocalToWorld(feature.site, x, z); colliders.push(majorParkBoxCollider(world.x, world.z, .45, .45, pad, pad + 4.9));
  }
  const lower = new THREE.ConeGeometry(6.5, 2.2, 8); lower.translate(0, 5.25, 0); roofs.push(lower);
  const upper = new THREE.ConeGeometry(3.8, 1.8, 8); upper.translate(0, 7.05, 0); roofs.push(upper);
  cylinder(timber, [0, 6.1, 0], .42, 2.2, 12); sphere(timber, [0, 8.15, 0], .28, 12);
  merged(local, stone, materials.stone, 'Chinese Garden pavilion octagonal stone terrace');
  merged(local, timber, materials.wood, 'Chinese Garden pavilion eight timber columns and finial');
  merged(local, roofs, materials.darkStone, 'Chinese Garden pavilion double-eaved dark tiled roofs');
  merged(local, screens, materials.wood, 'Chinese Garden pavilion open timber lattice screens');
}
function buildMaze(feature, group, materials, colliders) {
  const colliderStart = colliders.length;
  const local = majorParkLocalGroup(feature, group, 0, 'Kowloon Park Maze Garden clipped hedge rooms with real openings');
  const hedges = [];
  for (let ring = 0; ring < 4; ring++) {
    const w = feature.site.w * (.82 - ring * .16), d = feature.site.d * (.82 - ring * .16);
    for (const side of [-1, 1]) {
      const gap = (ring % 2 ? -.20 : .20) * w;
      for (const sign of [-1, 1]) {
        const length = w * .5 - Math.abs(gap) * .5 - 1.1;
        if (length <= 1) continue;
        const x = sign * (gap * .5 + w * .25 + .55), z = side * d * .5;
        const world = majorParkLocalToWorld(feature.site, x, z), y = hongKongTerrainHeight(world.x, world.z) + .055;
        box(hedges, [x, y + .8, z], [length, 1.6, .85]);
        colliders.push(majorParkBoxCollider(world.x, world.z, length, .85, y, y + 1.6, feature.site.ry));
      }
    }
  }
  // Longitudinal spur hedges make the nested rooms a maze rather than four closed rectangles.
  for (let i = 0; i < 8; i++) {
    const x = (i % 2 ? -.27 : .27) * feature.site.w, z = (-.34 + Math.floor(i / 2) * .20) * feature.site.d;
    const world = majorParkLocalToWorld(feature.site, x, z), y = hongKongTerrainHeight(world.x, world.z) + .055;
    box(hedges, [x, y + .8, z], [.85, 1.6, feature.site.d * .12]);
    colliders.push(majorParkBoxCollider(world.x, world.z, .85, feature.site.d * .12, y, y + 1.6, feature.site.ry));
  }
  merged(local, hedges, materials.hedge, 'Kowloon Park Maze Garden authored clipped-hedge walls');
  return { hedgeColliders: colliders.length - colliderStart };
}
function buildBirdLake(group, materials, colliders) {
  const feature = majorParkFeature(KOWLOON_PARK, 'birdLake'), { pad } = addMajorParkWater(feature, group, materials, colliders, { shallow: true });
  const pink = new THREE.MeshStandardMaterial({ color: 0xe9a6a0, roughness: .72 }), birds = [], legs = [];
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2, x = feature.site.x + Math.cos(a) * 25, z = feature.site.z + Math.sin(a) * 10;
    sphere(birds, [x, pad + .75, z], .32, 10); beam(birds, [x + .18, pad + .82, z], [x + .28, pad + 1.42, z], .075, .075); sphere(birds, [x + .28, pad + 1.48, z], .13, 8);
    for (const dx of [-.10, .10]) beam(legs, [x + dx, pad + .05, z], [x + dx, pad + .60, z], .025, .025);
  }
  merged(group, birds, pink, 'Kowloon Park Bird Lake pink flamingo group'); merged(group, legs, materials.dark, 'Kowloon Park Bird Lake flamingo legs');
}
function buildSculpturePool(group, materials, colliders) {
  const feature = KOWLOON_SCULPTURE_POOL, { pad } = addMajorParkWater(feature, group, materials, colliders, { shallow: true });
  const sculpture = [];
  box(sculpture, [feature.site.x, pad + .25, feature.site.z], [3.4, .5, 3.4]);
  for (let i = 0; i < 5; i++) box(sculpture, [feature.site.x + (i - 2) * .48, pad + 1.2 + i * .52, feature.site.z], [.42, 2.4 + i * .35, .65], .18 * i);
  merged(group, sculpture, materials.darkStone, 'Sculpture Walk reflecting-pool abstract stone composition — scene interpretation, not a measured sculpture replica');
}

export function buildKowloonPark(scene) {
  const park = KOWLOON_PARK, root = new THREE.Group(); root.name = 'Kowloon Park — exact site, Chinese Garden, Bird Lake, pool complex and sports grounds'; scene.add(root);
  const materials = createMajorParkMaterials(), colliders = [];
  const base = buildMajorParkBase(park, root, materials), paths = buildMajorParkPaths(park, root, materials);
  buildBirdLake(root, materials, colliders);
  addMajorParkWater(KOWLOON_FOUNTAIN, root, materials, colliders); addMajorParkFountainJets(KOWLOON_FOUNTAIN, root, materials, 7);
  buildSculpturePool(root, materials, colliders); buildPavilion(KOWLOON_CHINESE_PAVILION, root, materials, colliders);
  const maze = buildMaze(majorParkFeature(park, 'maze'), root, materials, colliders);
  buildHeritage(majorParkFeature(park, 'heritage'), root, materials, colliders);
  const sports = buildSportsCentre(majorParkFeature(park, 'sportsCentre'), root, materials, colliders);
  const pool = buildPoolComplex(majorParkFeature(park, 'poolComplex'), root, materials, colliders);
  for (const feature of park.features) if (feature.kind === 'soccer') addMajorParkCourt(feature, root, materials, colliders, 'soccer');
  addMajorParkPlayground(majorParkFeature(park, 'playground'), root, materials, colliders);
  const entrances = addMajorParkEntrances(park, root, materials, colliders), furniture = addMajorParkFurniture(park, root, materials, colliders);
  const treeSites = createMajorParkTreeSites(park, 145);
  return {
    root, colliders, treeSites, park, landmarks: [majorParkLandmark(park, 24)], arrivalPoints: majorParkArrivalPoints(park),
    groundHeightAt: (x, z, ground) => majorParkGroundHeightAt(park, x, z, ground),
    stats: {
      kowloonParkSourceWay: park.id, kowloonParkSiteArea: park.area, kowloonParkOfficialArea: park.officialArea,
      kowloonParkBaseTriangles: base.triangles, kowloonParkRoadClearedArea: base.area,
      kowloonParkPaths: park.paths.length, kowloonParkPathCrossings: paths.crossings, kowloonParkRouteCrossings: paths.routeCrossings,
      kowloonParkCrossingEvidence: 'All authored routes avoid unnamed internal service-road segment 40570; no unverified crossing is introduced.',
      kowloonParkBirdLakeArea: majorParkFeature(park, 'birdLake').area,
      kowloonParkSportsCentrePad: sports.pad, kowloonParkPoolHallPad: pool.pad, kowloonParkOutdoorPoolPad: pool.outdoorPad,
      kowloonParkPoolEvidence: 'exact OSM complex ring; reviewed-photo hall/roof and photo-directed outdoor pool, not surveyed interiors',
      kowloonParkPavilionColumns: 8, kowloonParkMazeHedgeColliders: maze.hedgeColliders,
      kowloonParkEntranceSigns: entrances, kowloonParkLanterns: furniture.lamps, kowloonParkBenches: furniture.benches,
      kowloonParkTreeCandidates: treeSites.length, kowloonParkColliders: colliders.length,
      kowloonParkHeightEvidence: 'traceable DTM; terraced scene pads are not engineering elevations'
    }
  };
}
