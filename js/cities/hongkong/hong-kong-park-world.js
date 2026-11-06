import * as THREE from 'three/webgpu';
import {
  HONG_KONG_PARK, HONG_KONG_ARTIFICIAL_LAKE, HONG_KONG_FOUNTAIN_PLAZA,
  majorParkFeature, majorParkGroundHeightAt, majorParkMinimumTerrain,
  majorParkPadHeight, majorParkArrivalPoints, createMajorParkTreeSites, majorParkLocalToWorld
} from './major-parks-architecture.js';
import {
  createMajorParkMaterials, buildMajorParkBase, buildMajorParkPaths, addMajorParkEntrances,
  addMajorParkFurniture, addMajorParkWater, addMajorParkFountainJets, addMajorParkPlayground,
  majorParkRingSurface, majorParkRingColliders, majorParkBoxCollider, majorParkLocalGroup,
  fitMajorParkLocalRect, majorParkLandmark
} from './major-parks-world-utils.js';
import { merged, box, beam, cylinder, sphere } from './harbour-city-world-utils.js';
import { ringShellGeometry, meshFromGeometry } from './tst-hotel-world-utils.js';
import { hongKongTerrainHeight } from './terrain.js';
import { buildFlagstaffHouse } from './flagstaff-house-world.js';

function hipRoofGeometry(w, d, rise) {
  const hx = w * .5, hz = d * .5, ridge = Math.max(0, hx - hz * .8);
  const positions = [
    -hx,0,-hz, hx,0,-hz, ridge,rise,0, -hx,0,-hz, ridge,rise,0, -ridge,rise,0,
    hx,0,hz, -hx,0,hz, -ridge,rise,0, hx,0,hz, -ridge,rise,0, ridge,rise,0,
    -hx,0,hz, -hx,0,-hz, -ridge,rise,0,
    hx,0,-hz, hx,0,hz, ridge,rise,0
  ];
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.computeVertexNormals(); return geometry;
}
function buildHeritage(feature, group, materials, colliders) {
  const levels = feature.site.levels || 2, wallHeight = levels * 3.15, pad = majorParkPadHeight(feature), bottom = majorParkMinimumTerrain(feature);
  meshFromGeometry(group, ringShellGeometry(feature.ring, bottom, pad + wallHeight), materials.white,
    `${feature.name} exact OSM heritage walls and DTM retaining foundation`);
  const local = majorParkLocalGroup(feature, group, pad, `${feature.name} colonial verandas and hipped roof`);
  const columns = [], rails = [], shutters = [], roofs = [];
  const w = feature.site.w * .84, d = feature.site.d * .80;
  for (const side of [-1, 1]) {
    const z = side * d * .48, count = Math.max(4, Math.round(w / 3.4));
    for (let i = 0; i <= count; i++) {
      const x = -w * .48 + i / count * w * .96;
      for (const y of [1.55, 4.65]) { cylinder(columns, [x, y, z], .17, 3.1, 12); box(columns, [x, y - 1.43, z], [.48, .24, .48]); }
    }
    for (const y of [3.15, 6.25]) box(columns, [0, y, z], [w, .22, .30]);
    for (let i = 0; i < count * 2; i++) {
      const x = -w * .46 + (i + .5) / (count * 2) * w * .92;
      box(rails, [x, 3.75, z], [.07, .85, .07]);
      for (const floor of [1.55, 4.7]) {
        box(shutters, [x, floor, side * (d * .41)], [.82, 1.65, .10]);
        for (const sy of [-.55, -.25, .05, .35, .65]) box(rails, [x, floor + sy, side * (d * .415 + .06)], [.82, .035, .055]);
      }
    }
    box(rails, [0, 4.15, z], [w, .09, .09]);
  }
  const roof = hipRoofGeometry(w * 1.07, d * 1.08, 2.15); roof.translate(0, wallHeight, 0); roofs.push(roof);
  merged(local, columns, materials.white, `${feature.name} two-storey circular veranda columns and entablature`);
  merged(local, rails, materials.paleStone, `${feature.name} balcony balustrades and louvre rails`);
  merged(local, shutters, materials.dark, `${feature.name} dark timber louvred windows and shutters`);
  merged(local, roofs, materials.darkStone, `${feature.name} dark hipped roof`);
  colliders.push(...majorParkRingColliders(feature.ring, pad, pad + wallHeight, .48));
  return { pad, wallHeight };
}
function rectTerrain(feature, rect) {
  let min = Infinity, max = -Infinity;
  for (const x of [rect.x - rect.w * .5, rect.x, rect.x + rect.w * .5]) for (const z of [rect.z - rect.d * .5, rect.z, rect.z + rect.d * .5]) {
    const world = majorParkLocalToWorld(feature.site, x, z), y = hongKongTerrainHeight(world.x, world.z);
    min = Math.min(min, y); max = Math.max(max, y);
  }
  return { bottom: min - .16, pad: max + .105 };
}
function greenhouseRoof(rect, y, rise) {
  const x0 = rect.x - rect.w * .5, x1 = rect.x + rect.w * .5, z0 = rect.z - rect.d * .5, z1 = rect.z + rect.d * .5;
  const positions = [x0,y,z0, x1,y,z0, x1,y+rise,rect.z, x0,y,z0, x1,y+rise,rect.z, x0,y+rise,rect.z,
    x1,y,z1, x0,y,z1, x0,y+rise,rect.z, x1,y,z1, x0,y+rise,rect.z, x1,y+rise,rect.z,
    x0,y,z1, x0,y,z0, x0,y+rise,rect.z, x1,y,z0, x1,y,z1, x1,y+rise,rect.z];
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.computeVertexNormals(); return geometry;
}
function buildConservatory(feature, group, materials, colliders) {
  const local = majorParkLocalGroup(feature, group, 0, 'Forsgate Conservatory three climate-controlled plant houses');
  const names = ['Display Plant House', 'Dry Plant House', 'Humid Plant House'];
  let cacti = 0;
  for (let index = 0; index < 3; index++) {
    const desiredX = (index - 1) * feature.site.w * .27;
    const rect = fitMajorParkLocalRect(feature, desiredX, 0, feature.site.w * .25, feature.site.d * .64);
    const { bottom, pad } = rectTerrain(feature, rect), wall = 4.8 + index * .35, rise = 1.9;
    const foundation = [], glass = [], frames = [], plants = [], rocks = [];
    box(foundation, [rect.x, (bottom + pad) * .5, rect.z], [rect.w, pad - bottom, rect.d]);
    box(glass, [rect.x, pad + wall * .5, rect.z], [rect.w * .97, wall, rect.d * .97]);
    for (const x of [rect.x - rect.w * .5, rect.x + rect.w * .5]) for (const z of [rect.z - rect.d * .5, rect.z + rect.d * .5]) box(frames, [x, pad + wall * .5, z], [.13, wall, .13]);
    const bays = Math.max(3, Math.round(rect.w / 2.5));
    for (let bay = 0; bay <= bays; bay++) {
      const x = rect.x - rect.w * .5 + bay / bays * rect.w;
      for (const z of [rect.z - rect.d * .5, rect.z + rect.d * .5]) box(frames, [x, pad + wall * .5, z], [.09, wall, .09]);
      beam(frames, [x, pad + wall, rect.z - rect.d * .5], [x, pad + wall + rise, rect.z], .09, .09);
      beam(frames, [x, pad + wall + rise, rect.z], [x, pad + wall, rect.z + rect.d * .5], .09, .09);
    }
    for (const y of [pad + .25, pad + wall * .55, pad + wall]) {
      for (const z of [rect.z - rect.d * .5, rect.z + rect.d * .5]) box(frames, [rect.x, y, z], [rect.w, .10, .10]);
    }
    beam(frames, [rect.x - rect.w * .5, pad + wall + rise, rect.z], [rect.x + rect.w * .5, pad + wall + rise, rect.z], .14, .14);
    meshFromGeometry(local, greenhouseRoof(rect, pad + wall, rise), materials.glass, `Forsgate ${names[index]} pitched glazed roof`, false);
    if (index === 1) for (let plant = 0; plant < 13; plant++) {
      const x = rect.x + (Math.sin(plant * 4.1) * .36) * rect.w, z = rect.z + (Math.cos(plant * 2.7) * .34) * rect.d;
      const h = .55 + (plant % 4) * .28;
      if (plant % 3) cylinder(plants, [x, pad + h * .5, z], .16 + (plant % 2) * .08, h, 10);
      else sphere(plants, [x, pad + .34, z], .34, 10);
      sphere(rocks, [x + .42, pad + .18, z - .25], .28, 8); cacti++;
    } else for (let plant = 0; plant < 9; plant++) {
      const x = rect.x + Math.sin(plant * 3.7) * rect.w * .34, z = rect.z + Math.cos(plant * 2.9) * rect.d * .32;
      cylinder(frames, [x, pad + .55, z], .055, 1.1, 8); sphere(plants, [x, pad + 1.25, z], .52, 10);
    }
    merged(local, foundation, materials.stone, `Forsgate ${names[index]} terraced DTM foundation`);
    merged(local, glass, materials.glass, `Forsgate ${names[index]} transparent glazing`, false);
    merged(local, frames, materials.white, `Forsgate ${names[index]} white structural mullions and ridge`);
    merged(local, plants, materials.hedge, `Forsgate ${names[index]} living plant display`);
    merged(local, rocks, materials.darkStone, `Forsgate ${names[index]} arid rockery`);
    const world = majorParkLocalToWorld(feature.site, rect.x, rect.z);
    colliders.push(majorParkBoxCollider(world.x, world.z, rect.w, rect.d, pad, pad + wall + rise, feature.site.ry));
  }
  return { houses: 3, cacti };
}
function buildVantage(feature, group, materials, colliders) {
  majorParkRingSurface(feature, materials.stone, 'Vantage Point exact OSM tower terrace', group);
  const pad = majorParkPadHeight(feature), local = majorParkLocalGroup(feature, group, pad, 'Vantage Point 30 m lookout with 105 real stair treads');
  const core = [], steps = [], rails = [], deck = [];
  cylinder(core, [0, 14.5, 0], 1.05, 29, 20);
  for (let i = 0; i < 105; i++) {
    const a = i / 105 * Math.PI * 2 * 4.25, y = .22 + i / 105 * 26.2;
    box(steps, [Math.cos(a) * 2.25, y, Math.sin(a) * 2.25], [1.75, .16, .72], -a);
    if (i % 3 === 0) beam(rails, [Math.cos(a) * 3.05, y, Math.sin(a) * 3.05], [Math.cos(a) * 3.05, y + 1.05, Math.sin(a) * 3.05], .055, .055);
  }
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    cylinder(core, [Math.cos(a) * 3.55, 13.5, Math.sin(a) * 3.55], .14, 27, 10);
    beam(rails, [Math.cos(a) * 3.8, 27.1, Math.sin(a) * 3.8], [Math.cos(a + Math.PI * 2 / 12) * 3.8, 27.1, Math.sin(a + Math.PI * 2 / 12) * 3.8], .08, .08);
  }
  cylinder(deck, [0, 26.65, 0], 4.1, .38, 32); cylinder(deck, [0, 29.85, 0], 4.25, .30, 32);
  merged(local, core, materials.white, 'Vantage Point white structural core and open columns');
  merged(local, steps, materials.stone, 'Vantage Point exactly 105 spiral stair treads');
  merged(local, rails, materials.metal, 'Vantage Point stair and observation-deck railings');
  merged(local, deck, materials.paleStone, 'Vantage Point observation deck and 30 m canopy');
  colliders.push(majorParkBoxCollider(feature.site.x, feature.site.z, 2.3, 2.3, pad, pad + 30));
  return { height: 30, steps: 105 };
}
function buildAviary(feature, group, materials, colliders) {
  const local = majorParkLocalGroup(feature, group, 0, 'Edward Youde Aviary four great arches, suspended mesh and canopy walkway');
  const valley = majorParkMinimumTerrain(feature) + .16, arches = [], cables = [], walkway = [], supports = [], water = [];
  const archX = [-.36, -.12, .12, .36].map((value) => value * feature.site.w), span = feature.site.d * .76;
  const archPoint = (x, t) => {
    const zL = -span * .5, zR = span * .5, left = majorParkLocalToWorld(feature.site, x, zL), right = majorParkLocalToWorld(feature.site, x, zR);
    const yL = hongKongTerrainHeight(left.x, left.z) + .2, yR = hongKongTerrainHeight(right.x, right.z) + .2;
    const apex = valley + 30, lift = apex - (yL + yR) * .5;
    return [x, yL * (1 - t) + yR * t + 4 * lift * t * (1 - t), zL + span * t];
  };
  for (const x of archX) {
    let previous = archPoint(x, 0);
    for (let step = 1; step <= 24; step++) { const next = archPoint(x, step / 24); beam(arches, previous, next, .42, .42); previous = next; }
    for (const t of [0, 1]) {
      const p = archPoint(x, t), world = majorParkLocalToWorld(feature.site, p[0], p[2]), ground = hongKongTerrainHeight(world.x, world.z);
      cylinder(supports, [p[0], (ground + p[1]) * .5, p[2]], .32, Math.max(.2, p[1] - ground), 12);
      colliders.push(majorParkBoxCollider(world.x, world.z, .7, .7, ground, p[1]));
    }
  }
  for (const t of [.12, .26, .5, .74, .88]) for (let i = 0; i < archX.length - 1; i++) {
    const a = archPoint(archX[i], t), b = archPoint(archX[i + 1], t); beam(cables, a, b, .075, .075);
  }
  for (const x of archX) for (let step = 1; step < 12; step++) {
    const a = archPoint(x, (step - 1) / 12), b = archPoint(x, step / 12); beam(cables, a, b, .045, .045);
  }
  const deckY = valley + 8.2;
  box(walkway, [0, deckY, 0], [feature.site.w * .82, .28, 2.35]);
  for (const side of [-1, 1]) {
    beam(walkway, [-feature.site.w * .41, deckY + 1.1, side * 1.15], [feature.site.w * .41, deckY + 1.1, side * 1.15], .075, .075);
    for (let i = 0; i <= 18; i++) {
      const x = -feature.site.w * .41 + i / 18 * feature.site.w * .82;
      beam(walkway, [x, deckY, side * 1.15], [x, deckY + 1.1, side * 1.15], .055, .055);
      if (i % 4 === 0) {
        const world = majorParkLocalToWorld(feature.site, x, 0), ground = hongKongTerrainHeight(world.x, world.z);
        beam(supports, [x, ground, 0], [x, deckY, 0], .18, .18);
      }
    }
  }
  const pond = new THREE.CircleGeometry(5.2, 32); pond.rotateX(-Math.PI / 2); pond.scale(1.6, 1, .7); pond.translate(0, valley + .35, 4); water.push(pond);
  for (let i = 0; i < 5; i++) beam(water, [-feature.site.w * .32 + i * .32, valley + 4.4 - i * .45, 5], [-feature.site.w * .32 + i * .32 + .4, valley + .45, 4], .12, .12);
  merged(local, arches, materials.silver, 'Edward Youde Aviary exactly four 30 m valley-spanning great arches');
  merged(local, cables, materials.metal, 'Edward Youde Aviary suspended stainless-steel mesh grid');
  merged(local, walkway, materials.paleStone, 'Edward Youde Aviary elevated canopy walkway and railings');
  merged(local, supports, materials.stone, 'Edward Youde Aviary arch and walkway supports');
  merged(local, water, materials.ripple, 'Edward Youde Aviary stream bed, shallow pool and small waterfall', false);
  return { arches: 4, apex: valley + 30 };
}
function buildOlympic(feature, group, materials, colliders) {
  const { pad } = majorParkRingSurface(feature, materials.plaza, 'Olympic Square exact OSM amphitheatre terrace', group);
  const local = majorParkLocalGroup(feature, group, pad, 'Olympic Square stepped seating, stage and double colonnade');
  const tiers = [], seats = [], columns = [];
  for (let row = 0; row < 7; row++) {
    const inner = 12 + row * 1.75, outer = inner + 1.55, y = row * .43;
    const tier = new THREE.RingGeometry(inner, outer, 64, 1, 0, Math.PI); tier.rotateX(-Math.PI / 2); tier.translate(0, y, 0); tiers.push(tier);
    const count = 18 + row * 4;
    for (let seat = 0; seat < count; seat++) {
      const a = (seat + .5) / count * Math.PI, r = (inner + outer) * .5;
      box(seats, [Math.cos(a) * r, y + .26, Math.sin(a) * r], [.48, .32, .48], -a);
    }
  }
  for (const z of [23.5, 26]) for (let i = 0; i <= 12; i++) {
    const a = i / 12 * Math.PI, x = Math.cos(a) * 25, zz = Math.sin(a) * z * .65;
    cylinder(columns, [x, 3.2, zz], .22, 6.4, 12);
  }
  box(columns, [0, 6.35, 15.5], [42, .32, .42]);
  merged(local, tiers, materials.stone, 'Olympic Square seven amphitheatre seating tiers');
  merged(local, seats, materials.paleStone, 'Olympic Square individual amphitheatre seat blocks');
  merged(local, columns, materials.white, 'Olympic Square Greco-Roman inspired double colonnade');
  const world = majorParkLocalToWorld(feature.site, 0, 16);
  colliders.push(majorParkBoxCollider(world.x, world.z, 38, 10, pad, pad + 3.2, feature.site.ry));
  return { officialCapacity: 880, visibleSeatBlocks: 7 * 18 + 4 * (0 + 1 + 2 + 3 + 4 + 5 + 6) };
}
function buildLake(group, materials, colliders) {
  const { pad } = addMajorParkWater(HONG_KONG_ARTIFICIAL_LAKE, group, materials, colliders, { shallow: true });
  const rocks = [], falls = [];
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2, x = HONG_KONG_ARTIFICIAL_LAKE.site.x + Math.cos(a) * 25, z = HONG_KONG_ARTIFICIAL_LAKE.site.z + Math.sin(a) * 27;
    sphere(rocks, [x, pad + .1, z], .65 + (i % 3) * .24, 9);
  }
  for (let i = 0; i < 7; i++) beam(falls, [211 + i * .55, pad + 3.8, 431], [212 + i * .55, pad + .15, 435], .16, .16);
  merged(group, rocks, materials.darkStone, 'Hong Kong Park Artificial Lake rock-lined shore');
  merged(group, falls, materials.ripple, 'Hong Kong Park Artificial Lake cascading waterfall', false);
}
function buildFountainPlaza(group, materials, colliders) {
  const feature = HONG_KONG_FOUNTAIN_PLAZA;
  const { pad } = majorParkRingSurface(feature, materials.plaza, 'Hong Kong Park Fountain Plaza tree-lined promenade', group);
  addMajorParkFountainJets(feature, group, materials, 7);
  const columns = [], pavilion = [];
  for (const side of [-1, 1]) for (let i = -2; i <= 2; i++) {
    const x = feature.site.x + i * 3.1, z = feature.site.z + side * 20;
    for (const dx of [-.32, .32]) for (const dz of [-.32, .32]) cylinder(columns, [x + dx, pad + 2.6, z + dz], .15, 5.2, 10);
    colliders.push(majorParkBoxCollider(x, z, 1, 1, pad, pad + 5.2));
  }
  cylinder(pavilion, [feature.site.x, pad + .25, feature.site.z], 4.3, .5, 32);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    cylinder(pavilion, [feature.site.x + Math.cos(a) * 3.6, pad + 2.2, feature.site.z + Math.sin(a) * 3.6], .14, 4.4, 10);
  }
  cylinder(pavilion, [feature.site.x, pad + 4.5, feature.site.z], 4.4, .28, 32);
  merged(group, columns, materials.white, 'Hong Kong Park grand column clusters at the Central Garden gateway');
  merged(group, pavilion, materials.paleStone, 'Hong Kong Park fountain pavilion surrounded by water');
}

export function buildHongKongPark(scene) {
  const park = HONG_KONG_PARK, root = new THREE.Group(); root.name = 'Hong Kong Park — exact site, terraced DTM, heritage, aviary, conservatory and connected walks'; scene.add(root);
  const materials = createMajorParkMaterials(), colliders = [];
  const base = buildMajorParkBase(park, root, materials), paths = buildMajorParkPaths(park, root, materials);
  buildLake(root, materials, colliders); buildFountainPlaza(root, materials, colliders);
  const flagstaff = buildFlagstaffHouse(root, materials, colliders);
  buildHeritage(majorParkFeature(park, 'heritage', 114282497), root, materials, colliders);
  const conservatory = buildConservatory(majorParkFeature(park, 'conservatory'), root, materials, colliders);
  const vantage = buildVantage(majorParkFeature(park, 'vantage'), root, materials, colliders);
  const aviary = buildAviary(majorParkFeature(park, 'aviary'), root, materials, colliders);
  const olympic = buildOlympic(majorParkFeature(park, 'olympic'), root, materials, colliders);
  addMajorParkPlayground(majorParkFeature(park, 'playground'), root, materials, colliders);
  const entrances = addMajorParkEntrances(park, root, materials, colliders), furniture = addMajorParkFurniture(park, root, materials, colliders);
  const treeSites = createMajorParkTreeSites(park, 115);
  return {
    root, colliders, treeSites, park, landmarks: [majorParkLandmark(park, 30)], arrivalPoints: majorParkArrivalPoints(park),
    groundHeightAt: (x, z, ground) => majorParkGroundHeightAt(park, x, z, ground),
    stats: {
      hongKongParkSourceWay: park.id, hongKongParkSiteArea: park.area, hongKongParkOfficialArea: park.officialArea,
      hongKongParkBaseTriangles: base.triangles, hongKongParkRoadClearedArea: base.area,
      hongKongParkPaths: park.paths.length, hongKongParkPathCrossings: paths.crossings,
      hongKongParkAviaryArches: aviary.arches, hongKongParkAviaryApexAboveValley: 30,
      hongKongParkConservatoryHouses: conservatory.houses, hongKongParkConservatoryCacti: conservatory.cacti,
      hongKongParkVantageHeight: vantage.height, hongKongParkVantageSteps: vantage.steps,
      hongKongParkOlympicOfficialCapacity: olympic.officialCapacity, hongKongParkOlympicVisibleSeatBlocks: olympic.visibleSeatBlocks,
      hongKongParkArtificialLakeArea: HONG_KONG_ARTIFICIAL_LAKE.area, hongKongParkArtificialLakeEvidence: 'photo-directed outline; LCSD official 2,200 m²',
      hongKongParkFlagstaffPad: flagstaff.pad, ...flagstaff.stats, hongKongParkEntranceSigns: entrances,
      hongKongParkLanterns: furniture.lamps, hongKongParkBenches: furniture.benches,
      hongKongParkTreeCandidates: treeSites.length, hongKongParkColliders: colliders.length,
      hongKongParkHeightEvidence: 'traceable DTM; terraced scene pads are not engineering elevations'
    }
  };
}
