import * as THREE from 'three/webgpu';
import {
  VICTORIA_PARK, VICTORIA_MODEL_BOAT_POOL, VICTORIA_QUEEN_STATUE,
  majorParkFeature, majorParkGroundHeightAt, majorParkMinimumTerrain, majorParkPadHeight,
  majorParkArrivalPoints, createMajorParkTreeSites, majorParkLocalToWorld
} from './major-parks-architecture.js';
import {
  createMajorParkMaterials, buildMajorParkBase, buildMajorParkPaths, addMajorParkEntrances,
  addMajorParkFurniture, addMajorParkWater, addMajorParkCourt, addMajorParkPlayground,
  majorParkRingSurface, majorParkRingColliders, majorParkBoxCollider, majorParkLocalGroup,
  majorParkLandmark
} from './major-parks-world-utils.js';
import { merged, box, beam, cylinder, sphere } from './harbour-city-world-utils.js';
import { ringShellGeometry, meshFromGeometry } from './tst-hotel-world-utils.js';

function buildBandstand(feature, group, materials, colliders) {
  majorParkRingSurface(feature, materials.stone, 'Victoria Park Bandstand exact OSM stone terrace', group);
  const pad = majorParkPadHeight(feature), local = majorParkLocalGroup(feature, group, pad, 'Victoria Park Bandstand open octagonal music pavilion');
  const stone = [], columns = [], rails = [], roofs = [];
  cylinder(stone, [0, .22, 0], 8.1, .44, 16); cylinder(stone, [0, .53, 0], 7.5, .18, 16);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, b = (i + 1) / 12 * Math.PI * 2, x = Math.cos(a) * 6.5, z = Math.sin(a) * 6.5;
    cylinder(columns, [x, 2.8, z], .16, 4.6, 12);
    beam(rails, [x, 1.25, z], [Math.cos(b) * 6.5, 1.25, Math.sin(b) * 6.5], .075, .075);
    for (let k = 1; k < 5; k++) {
      const t = k / 5; beam(rails, [x * (1 - t) + Math.cos(b) * 6.5 * t, .65, z * (1 - t) + Math.sin(b) * 6.5 * t], [x * (1 - t) + Math.cos(b) * 6.5 * t, 1.25, z * (1 - t) + Math.sin(b) * 6.5 * t], .045, .045);
    }
    const world = majorParkLocalToWorld(feature.site, x, z); colliders.push(majorParkBoxCollider(world.x, world.z, .4, .4, pad, pad + 5.1));
  }
  const roof = new THREE.ConeGeometry(8.2, 2.6, 12); roof.translate(0, 5.7, 0); roofs.push(roof);
  const lantern = new THREE.ConeGeometry(2.2, 1.8, 12); lantern.translate(0, 7.7, 0); roofs.push(lantern);
  merged(local, stone, materials.stone, 'Victoria Park Bandstand circular stepped stone stage');
  merged(local, columns, materials.white, 'Victoria Park Bandstand twelve white columns');
  merged(local, rails, materials.white, 'Victoria Park Bandstand balustrades');
  merged(local, roofs, materials.darkStone, 'Victoria Park Bandstand dark pitched roof and roof lantern');
}
function buildQueen(feature, group, materials, colliders) {
  majorParkRingSurface(feature, materials.stone, 'Queen Victoria monument exact stone forecourt', group);
  const pad = majorParkPadHeight(feature), local = majorParkLocalGroup(feature, group, pad, 'Queen Victoria bronze monument and granite pedestal');
  const stone = [], bronzeParts = [];
  box(stone, [0, .20, 0], [5.0, .4, 5.0]); box(stone, [0, .65, 0], [4.3, .5, 4.3]); box(stone, [0, 1.65, 0], [2.5, 1.5, 2.5]); box(stone, [0, 2.48, 0], [2.9, .18, 2.9]);
  box(bronzeParts, [0, 3.05, 0], [1.35, 1.05, 1.15]);
  sphere(bronzeParts, [0, 4.05, -.05], .52, 16); sphere(bronzeParts, [0, 4.68, -.05], .25, 14);
  beam(bronzeParts, [-.52, 3.95, 0], [-.90, 3.10, .18], .20, .20); beam(bronzeParts, [.52, 3.95, 0], [.90, 3.10, .18], .20, .20);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2; cylinder(bronzeParts, [Math.cos(a) * .20, 4.98, -.05 + Math.sin(a) * .20], .035, .28, 8);
  }
  const bronze = new THREE.MeshStandardMaterial({ color: 0x41675b, roughness: .56, metalness: .62 });
  merged(local, stone, materials.stone, 'Queen Victoria monument granite pedestal');
  merged(local, bronzeParts, bronze, 'Queen Victoria seated bronze figure — recognisable scene interpretation, not a laser-scanned replica');
  colliders.push(majorParkBoxCollider(feature.site.x, feature.site.z, 5, 5, pad, pad + 5.2));
}
function buildModelBoatPool(group, materials, colliders) {
  const feature = VICTORIA_MODEL_BOAT_POOL, { pad } = addMajorParkWater(feature, group, materials, colliders, { depth: .5 });
  const boats = [], sails = [];
  for (let i = 0; i < 3; i++) {
    const x = feature.site.x + (i - 1) * 10, z = feature.site.z + (i % 2 ? 3 : -3);
    const hull = new THREE.SphereGeometry(1, 12, 8); hull.scale(1.7, .24, .58); hull.translate(x, pad + .16, z); boats.push(hull);
    beam(boats, [x, pad + .15, z], [x, pad + 1.8, z], .035, .035);
    const sail = new THREE.BufferGeometry(); sail.setAttribute('position', new THREE.Float32BufferAttribute([x,pad+.45,z, x,pad+1.75,z, x+1.05,pad+.55,z], 3)); sail.computeVertexNormals(); sails.push(sail);
  }
  merged(group, boats, materials.white, 'Victoria Park Model Boat Pool three small model sailing boats');
  merged(group, sails, materials.white, 'Victoria Park Model Boat Pool model sails', false);
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
  line(0, -d * .42, w * .88, .09); line(0, d * .42, w * .88, .09); line(-w * .44, 0, .09, d * .84); line(w * .44, 0, .09, d * .84);
  line(0, 0, w * .88, .08); line(0, -d * .20, w * .88, .07); line(0, d * .20, w * .88, .07); line(0, 0, .07, d * .40);
  beam(nets, [-w * .48, 1.0, 0], [w * .48, 1.0, 0], .06, .06);
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
function buildPoolBuilding(feature, group, materials, colliders) {
  const pad = majorParkPadHeight(feature), bottom = majorParkMinimumTerrain(feature), wall = 8.2;
  meshFromGeometry(group, ringShellGeometry(feature.ring, bottom, pad + wall), materials.white, 'Victoria Park Swimming Pool exact OSM building mass and DTM foundation');
  const local = majorParkLocalGroup(feature, group, pad, 'Victoria Park Swimming Pool modern glazing and shaded roof deck');
  const glass = [], frames = [], roof = [];
  for (const z of [-feature.site.d * .43, feature.site.d * .43]) {
    box(glass, [0, 4.2, z], [feature.site.w * .82, 4.8, .14]);
    for (let i = 0; i <= 24; i++) box(frames, [-feature.site.w * .41 + i / 24 * feature.site.w * .82, 4.2, z], [.11, 4.9, .18]);
  }
  box(roof, [0, wall + .25, 0], [feature.site.w * .91, .5, feature.site.d * .91]);
  for (let i = -3; i <= 3; i++) box(roof, [i * feature.site.w * .11, wall + .65, 0], [.25, .8, feature.site.d * .86]);
  merged(local, glass, materials.dark, 'Victoria Park Swimming Pool dark glazed facade bands');
  merged(local, frames, materials.white, 'Victoria Park Swimming Pool white facade mullions');
  merged(local, roof, materials.paleStone, 'Victoria Park Swimming Pool shaded flat roof and structural ribs');
  colliders.push(...majorParkRingColliders(feature.ring, pad, pad + wall, .9));
}

export function buildVictoriaPark(scene) {
  const park = VICTORIA_PARK, root = new THREE.Group(); root.name = 'Victoria Park — exact site, central lawn, tennis centre, model boat pool and connected sports grounds'; scene.add(root);
  const materials = createMajorParkMaterials(), colliders = [];
  const base = buildMajorParkBase(park, root, materials), paths = buildMajorParkPaths(park, root, materials);
  majorParkRingSurface(majorParkFeature(park, 'centralLawn'), materials.grass, 'Victoria Park Central Lawn exact OSM grass terrace', root);
  buildFountainPlaza(majorParkFeature(park, 'fountainPlaza'), root, materials, colliders);
  buildModelBoatPool(root, materials, colliders); buildQueen(VICTORIA_QUEEN_STATUE, root, materials, colliders);
  buildBandstand(majorParkFeature(park, 'bandstand'), root, materials, colliders);
  buildCentreCourt(majorParkFeature(park, 'centreCourt'), root, materials, colliders);
  buildPoolBuilding(majorParkFeature(park, 'poolBuilding'), root, materials, colliders);
  let courts = 0;
  for (const feature of park.features) {
    if (['soccer', 'basketball', 'tennis', 'bowls', 'roller', 'handball', 'tableTennis'].includes(feature.kind)) { addMajorParkCourt(feature, root, materials, colliders); courts++; }
    if (feature.kind === 'playground') addMajorParkPlayground(feature, root, materials, colliders);
  }
  const entrances = addMajorParkEntrances(park, root, materials, colliders), furniture = addMajorParkFurniture(park, root, materials, colliders);
  const treeSites = createMajorParkTreeSites(park, 175);
  return {
    root, colliders, treeSites, park, landmarks: [majorParkLandmark(park, 20)], arrivalPoints: majorParkArrivalPoints(park),
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
