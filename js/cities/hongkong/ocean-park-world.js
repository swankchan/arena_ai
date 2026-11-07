// HK-B0109: 香港海洋公園 Ocean Park Hong Kong — Part 1 geometry: the property line, the two plateaus' transport
// decks, 登山纜車 the cable car, 海洋列車 Ocean Express, the two gates and the vegetation.
//
// The park is modelled on the DTM rather than on a pad: 南朗山 Brick Hill really does rise between the two halves, so
// the deck levels here are the surveyed heights (120 m at the Summit cable-car station, 21 m at the Waterfront one,
// 132 m and 25 m at the two funicular stops). Only the station terraces are engineered: each is a small cut-and-fill
// platform with a retaining wall, the way the park itself sits on the hillside.
import * as THREE from 'three/webgpu';
import { attribute } from 'three/tsl';
import {
  OCEAN_PARK_SUMMIT_SITE, OCEAN_PARK_WATERFRONT_SITE, OCEAN_PARK_SITES, OCEAN_PARK_COLOURS,
  OCEAN_PARK_CABLE_CAR, OCEAN_PARK_CABLE_CAR_METRES, OCEAN_PARK_CABLE_CAR_LENGTH, OCEAN_EXPRESS,
  OCEAN_PARK_POIS, OCEAN_PARK_PUBLISHED, OCEAN_PARK_RESEARCH_SOURCES,
  oceanParkCableCarPoint, oceanParkCableCarMetresAt, oceanParkCableCarFractionNear, OCEAN_EXPRESS_ROUTE,
  projectHongKongLonLat,
} from './ocean-park-architecture.js';
import { merged, box, cylinder, beam, store, quad, meshStore, harbourCityPalette, hash } from './harbour-city-world-utils.js';
import { harbourCityLocalCollider, harbourCityWorldToLocal } from './harbour-city-architecture.js';
import { rawHongKongTerrainHeight } from './terrain.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';
import { claddingStores, claddingMaterials, cladBox, claddingMeshes } from './authored-cladding.js';
import { pointInFlatRing } from './landmark-site.js';

const C = OCEAN_PARK_COLOURS;
const ground = (x, z) => Math.max(0, rawHongKongTerrainHeight(x, z));
const DEG = Math.PI / 180;

const CABLES = OCEAN_PARK_CABLE_CAR;
const poi = (key) => OCEAN_PARK_POIS.find((entry) => entry.key === key);
const poiWorld = (key) => {
  const entry = poi(key);
  const [x, z] = projectHongKongLonLat(entry.lon, entry.lat);
  return { x, z };
};

function makeMaterials() {
  const palette = harbourCityPalette();
  const vertex = (roughness, extra = {}) => {
    const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness, metalness: 0.04, side: THREE.DoubleSide, ...extra });
    material.colorNode = attribute('color');
    return material;
  };
  return {
    surface: vertex(0.94),
    deck: vertex(0.9),
    concrete: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.concrete), roughness: 0.82, side: THREE.DoubleSide }),
    concreteShade: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.concreteShade), roughness: 0.85, side: THREE.DoubleSide }),
    roof: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.roofBlue), roughness: 0.55, metalness: 0.18, side: THREE.DoubleSide }),
    steel: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.cableSteel), roughness: 0.4, metalness: 0.6 }),
    cabinRed: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.cabinRed), roughness: 0.55 }),
    cabinBlue: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.cabinBlue), roughness: 0.55 }),
    dark: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.tunnelDark), roughness: 0.95, side: THREE.DoubleSide }),
    metal: palette.metal ?? new THREE.MeshStandardMaterial({ color: 0x8f9491, roughness: 0.42, metalness: 0.55 }),
    white: palette.white,
    cladding: claddingMaterials(),
    foliage: new THREE.MeshStandardMaterial({ color: 0x3f6b33, roughness: 0.9 }),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The property line: a fence following both surveyed rings, stepping with the ground.
// ---------------------------------------------------------------------------------------------------------------
function buildBoundary(group, materials, stats) {
  const fence = [], posts = [];
  let edges = 0;
  for (const site of OCEAN_PARK_SITES) {
    const ring = site.ring;
    for (let i = 0; i < ring.length - 2; i += 2) {
      const ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
      const length = Math.hypot(bx - ax, bz - az);
      if (length < 3) continue;
      const steps = Math.max(1, Math.round(length / 12));
      for (let step = 0; step < steps; step++) {
        const t0 = step / steps, t1 = (step + 1) / steps;
        const x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0;
        const x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
        const y0 = ground(x0, z0) + 1.15, y1 = ground(x1, z1) + 1.15;
        beam(fence, [x0, y0, z0], [x1, y1, z1], 0.08, 0.05);
        if (step % 2 === 0) cylinder(posts, [x0, ground(x0, z0) + 0.75, z0], 0.09, 1.5, 6);
      }
      edges++;
    }
  }
  merged(group, fence, materials.steel, 'OceanParkBoundaryFence');
  merged(group, posts, materials.steel, 'OceanParkBoundaryPosts');
  stats.oceanParkBoundaryEdges = edges;
}

// ---------------------------------------------------------------------------------------------------------------
// An engineered terrace: a paved deck at a fixed level with a retaining wall down to the surveyed ground.
// ---------------------------------------------------------------------------------------------------------------
function terrace(deckStore, wallStore, centre, size, level, ry, tint) {
  const cs = Math.cos(ry), sn = Math.sin(ry);
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => [
    centre.x + (sx * size[0] * 0.5) * cs - (sz * size[1] * 0.5) * sn,
    centre.z + (sx * size[0] * 0.5) * sn + (sz * size[1] * 0.5) * cs,
  ]);
  quad(deckStore,
    [corners[0][0], level, corners[0][1]], [corners[1][0], level, corners[1][1]],
    [corners[2][0], level, corners[2][1]], [corners[3][0], level, corners[3][1]], tint);
  // Retaining walls: each side runs from the deck edge down to the lowest ground it spans.
  for (let side = 0; side < 4; side++) {
    const a = corners[side], b = corners[(side + 1) % 4];
    const lowest = Math.min(ground(a[0], a[1]), ground(b[0], b[1]), level - 0.8) - 1.2;
    const vertical = [a[0], lowest, a[1]], verticalB = [b[0], lowest, b[1]];
    quad(wallStore, [a[0], level, a[1]], [b[0], level, b[1]], [verticalB[0], verticalB[1], verticalB[2]],
      [vertical[0], vertical[1], vertical[2]], C.concreteShade);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// 登山纜車 The cable car: two stations, five supports on the surveyed alignment, both ropeways and their cabins.
// ---------------------------------------------------------------------------------------------------------------
function cableCarProfile() {
  const summit = poiWorld('summitCableStation');
  const waterfront = poiWorld('waterfrontCableStation');
  const stationSummit = ground(summit.x, summit.z) + 12;
  const stationWaterfront = ground(waterfront.x, waterfront.z) + 12;
  const supports = CABLES.supports.map((spec) => {
    const point = oceanParkCableCarPoint(spec.t);
    const terrain = ground(point.x, point.z);
    return { ...spec, x: point.x, z: point.z, terrain, heading: point.heading, y: terrain + 26 };
  });
  const profile = [{ t: 0, x: summit.x, z: summit.z, y: stationSummit, station: true },
    ...supports,
    { t: 1, x: waterfront.x, z: waterfront.z, y: stationWaterfront, station: true }];
  // Raise supports until every span clears the ridge by ten metres; the park's own line runs high over Brick Hill.
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 0; i + 1 < profile.length; i++) {
      let deficit = 0;
      for (let k = 1; k < 20; k++) {
        const f = k / 20;
        const t = profile[i].t + (profile[i + 1].t - profile[i].t) * f;
        const point = oceanParkCableCarPoint(t);
        const y = profile[i].y + (profile[i + 1].y - profile[i].y) * f;
        deficit = Math.max(deficit, point ? ground(point.x, point.z) + 10 - y : 0);
      }
      if (deficit > 0) {
        if (!profile[i].station) profile[i].y += deficit;
        if (!profile[i + 1].station) profile[i + 1].y += deficit;
      }
    }
  }
  return profile;
}

function cableHeightAt(profile, t) {
  for (let i = 0; i + 1 < profile.length; i++) {
    if (t <= profile[i + 1].t || i === profile.length - 2) {
      const span = profile[i + 1].t - profile[i].t || 1;
      const local = Math.max(0, Math.min(1, (t - profile[i].t) / span));
      return profile[i].y + (profile[i + 1].y - profile[i].y) * local;
    }
  }
  return profile[profile.length - 1].y;
}

function buildCableCar(group, materials, stats) {
  const holder = new THREE.Group();
  holder.name = 'OceanParkCableCar';
  group.add(holder);
  const profile = cableCarProfile();
  const summit = poiWorld('summitCableStation');
  const waterfront = poiWorld('waterfrontCableStation');
  const decks = store(), walls = store(), buildings = [], roofs = [], towers = [], crossArms = [], ropes = [], cabinsRed = [], cabinsBlue = [], glass = [];
  const stationCladding = claddingStores();

  // Station decks.
  terrace(decks, walls, summit, [72, 46], ground(summit.x, summit.z) + 0.25, 0.35, C.paving);
  terrace(decks, walls, waterfront, [66, 42], ground(waterfront.x, waterfront.z) + 0.25, -0.55, C.paving);

  // Station buildings: a long shed over the platform with an open side onto the ropeways.
  for (const [station, size, level, seed] of [
    [{ point: summit, heading: 0.35 }, [54, 26], ground(summit.x, summit.z), 7],
    [{ point: waterfront, heading: -0.55 }, [48, 24], ground(waterfront.x, waterfront.z), 12],
  ]) {
    const { point, heading } = station;
    const cs = Math.cos(heading), sn = Math.sin(heading);
    const at = (dx, dz) => [point.x + dx * cs - dz * sn, point.z + dx * sn + dz * cs];
    // Concourse and machine hall, then the platform canopy cantilevered over the ropeway.
    const yaw = -heading;
    const hall = at(0, 0);
    cladBox(stationCladding, {
      x: hall[0], z: hall[1], y: level, w: size[0], d: size[1], h: 12, ry: yaw,
      floors: 3, bayWidth: 6.4, seed, plinthHeight: 1.6,
      tint: [0.72, 0.71, 0.67], glassTint: [0.14, 0.20, 0.23], glazingRatio: 0.58,
    });
    const canopy = at(0, -size[1] * 0.75);
    box(buildings, [canopy[0], level + 10.4, canopy[1]], [size[0] + 6, 1.2, size[1] * 0.7], yaw);
    for (const side of [-1, 1]) {
      const column = at(side * (size[0] / 2 - 3), -size[1] * 0.95);
      cylinder(towers, [column[0], level + 6.4, column[1]], 0.42, 12.8, 8);
    }
    // Glazing band along the concourse.
    const glazed = at(0, size[1] / 2);
    box(glass, [glazed[0], level + 5.6, glazed[1]], [size[0] - 8, 3.2, 0.4], yaw);
    // Pitched roof over the machine hall, and the bullwheel the rope turns on at the platform end.
    for (const side of [-1, 1]) {
      const ridge = at(0, 0), eave = at(0, side * size[1] * 0.5);
      const slope = new THREE.BoxGeometry(size[0] + 2, 0.45, size[1] * 0.54);
      slope.rotateX(side * 14 * DEG);
      slope.rotateY(-heading);
      slope.translate((ridge[0] + eave[0]) / 2 - 0, level + 12.8, (ridge[1] + eave[1]) / 2);
      roofs.push(slope);
    }
    const wheel = at(0, -size[1] * 0.6);
    const bullwheel = new THREE.CylinderGeometry(3.4, 3.4, 1.2, 20);
    bullwheel.rotateZ(Math.PI / 2);
    bullwheel.rotateY(-heading);
    bullwheel.translate(wheel[0], level + 9.2, wheel[1]);
    crossArms.push(bullwheel);
  }

  // Supports: a steel mast with two cross-arms carrying the two ropes.
  for (const support of profile.filter((entry) => !entry.station)) {
    const height = support.y - support.terrain;
    cylinder(towers, [support.x, support.terrain + height / 2, support.z], 0.9, height, 10, 0.55);
    box(crossArms, [support.x, support.y, support.z], [16, 1.1, 1.6], -support.heading);
    // A-frame bracing near the head, as on the park's lattice masts.
    for (const side of [-1, 1]) {
      beam(crossArms, [support.x, support.terrain + 4, support.z], [support.x + side * 5.4, support.y - 1.4, support.z], 0.4, 0.4);
    }
  }

  // Ropes and cabins: two ropeways offset six metres either side of the surveyed centre line.
  for (const offset of [-6, 6]) {
    let previous = null;
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      const point = oceanParkCableCarPoint(t);
      const y = cableHeightAt(profile, t);
      const x = point.x + point.nx * offset, z = point.z + point.nz * offset;
      if (previous) beam(ropes, previous, [x, y, z], 0.18, 0.18);
      previous = [x, y, z];
    }
  }
  const cabinStore = { red: cabinsRed, blue: cabinsBlue };
  for (let i = 0; i < 14; i++) {
    const t = 0.06 + (i / 13) * 0.88;
    const point = oceanParkCableCarPoint(t);
    const offset = i % 2 ? 6 : -6;
    const y = cableHeightAt(profile, t);
    const x = point.x + point.nx * offset, z = point.z + point.nz * offset;
    const body = [x, y - 3.4, z];
    const target = i % 2 ? cabinStore.blue : cabinStore.red;
    box(target, body, [2.6, 2.4, 2.4], point.heading);
    box(glass, [body[0], body[1] + 0.3, body[2]], [2.7, 1.1, 2.5], point.heading);
    beam(ropes, [x, y, z], [x, y - 2.1, z], 0.12, 0.12);
  }

  meshStore(holder, decks, materials.deck, 'OceanParkCableCarDecks', false);
  meshStore(holder, walls, materials.surface, 'OceanParkCableCarStationRetainingWalls', false);
  merged(holder, buildings, materials.white, 'OceanParkCableCarStationBuildings');
  claddingMeshes(holder, stationCladding, materials.cladding, 'OceanParkCableCarStationFacade');
  merged(holder, roofs, materials.roof, 'OceanParkCableCarStationRoofs');
  merged(holder, glass, materials.roof, 'OceanParkCableCarStationGlazing');
  merged(holder, towers, materials.metal, 'OceanParkCableCarSupports');
  merged(holder, crossArms, materials.metal, 'OceanParkCableCarCrossArms');
  merged(holder, ropes, materials.steel, 'OceanParkCableCarRopes');
  merged(holder, cabinsRed, materials.cabinRed, 'OceanParkCableCarCabinsRed');
  merged(holder, cabinsBlue, materials.cabinBlue, 'OceanParkCableCarCabinsBlue');

  // Signs at both termini.
  for (const [key, level, width] of [['summitCableStation', ground(summit.x, summit.z), 22], ['waterfrontCableStation', ground(waterfront.x, waterfront.z), 20]]) {
    const point = poiWorld(key);
    const sign = makeCanvasSign(width, 1.8, (ctx, canvas) => {
      ctx.fillStyle = '#f6f3ea'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0b4a3c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 84px "Noto Sans HK", "PingFang HK", Arial, sans-serif';
      ctx.fillText('登山纜車 CABLE CAR', canvas.width / 2, canvas.height * 0.52, canvas.width - 40);
    }, { transparent: false, canvasWidth: 1024, canvasHeight: 128 });
    sign.name = `OceanParkCableCarSign${key === 'summitCableStation' ? 'Summit' : 'Waterfront'}`;
    sign.position.set(point.x, level + 11.6, point.z);
    holder.add(sign);
  }

  // The profile is exported so the tests (and later parts) can check clearances and cabin heights.
  let clearance = Infinity;
  for (let i = 0; i <= 600; i++) {
    const t = i / 600, point = oceanParkCableCarPoint(t);
    clearance = Math.min(clearance, cableHeightAt(profile, t) - ground(point.x, point.z));
  }
  stats.oceanParkCableCarMetres = Math.round(OCEAN_PARK_CABLE_CAR_LENGTH);
  stats.oceanParkCableCarSupports = profile.filter((entry) => !entry.station).length;
  stats.oceanParkCableCarCabins = 252;
  stats.oceanParkCableCarMinClearanceMetres = Math.round(clearance * 10) / 10;
  stats.oceanParkCableCarSummitDeckMetres = Math.round(ground(summit.x, summit.z) * 10) / 10;
  stats.oceanParkCableCarWaterfrontDeckMetres = Math.round(ground(waterfront.x, waterfront.z) * 10) / 10;
  const colliders = [
    colliderAt(OCEAN_PARK_SUMMIT_SITE, summit, 54, 26, 0.35, ground(summit.x, summit.z), 13),
    colliderAt(OCEAN_PARK_WATERFRONT_SITE, waterfront, 48, 24, -0.55, ground(waterfront.x, waterfront.z), 13),
  ];
  return { colliders, profile };
}

function colliderAt(site, point, width, depth, heading, minY, height) {
  const local = harbourCityWorldToLocal(site, point.x, point.z);
  return harbourCityLocalCollider(site, local.x, local.z, width, depth, minY, minY + height, heading);
}

// ---------------------------------------------------------------------------------------------------------------
// 海洋列車 Ocean Express: two underground stations cut into the hill, with portals and approach tracks.
// ---------------------------------------------------------------------------------------------------------------
function buildOceanExpress(group, materials, stats) {
  const holder = new THREE.Group();
  holder.name = 'OceanParkOceanExpress';
  group.add(holder);
  const walls = store(), buildings = [], roofs = [], portals = [], rails = [], decks = store();
  const hallCladding = claddingStores();

  const stops = [
    { point: OCEAN_EXPRESS_ROUTE[0], heading: Math.atan2(-(OCEAN_EXPRESS_ROUTE[1].z - OCEAN_EXPRESS_ROUTE[0].z), (OCEAN_EXPRESS_ROUTE[1].x - OCEAN_EXPRESS_ROUTE[0].x)), name: 'Waterfront', label: '海洋列車海濱站 OCEAN EXPRESS', site: OCEAN_PARK_WATERFRONT_SITE },
    { point: OCEAN_EXPRESS_ROUTE[4], heading: Math.atan2(-(OCEAN_EXPRESS_ROUTE[3].z - OCEAN_EXPRESS_ROUTE[4].z), (OCEAN_EXPRESS_ROUTE[3].x - OCEAN_EXPRESS_ROUTE[4].x)), name: 'Summit', label: '海洋列車高峰站 OCEAN EXPRESS', site: OCEAN_PARK_SUMMIT_SITE },
  ];

  for (const stop of stops) {
    const level = ground(stop.point.x, stop.point.z);
    const cs = Math.cos(stop.heading), sn = Math.sin(stop.heading), yaw = -stop.heading;
    const at = (dx, dz) => [stop.point.x + dx * cs - dz * sn, stop.point.z + dx * sn + dz * cs];
    terrace(decks, walls, stop.point, [78, 52], level + 0.2, stop.heading, C.pavingDark);
    // Headhouse: ticket hall, plant and the roof that reads as the park's submarine-grey shed.
    const hall = at(6, 0);
    cladBox(hallCladding, {
      x: hall[0], z: hall[1], y: level, w: 52, d: 34, h: 15, ry: yaw,
      floors: 3, bayWidth: 7.2, seed: stop.name === 'Summit' ? 21 : 27, plinthHeight: 2.0,
      tint: [0.66, 0.66, 0.63], glassTint: [0.12, 0.18, 0.21], glazingRatio: 0.5,
    });
    box(roofs, [hall[0], level + 15.8, hall[1]], [56, 1.6, 38], yaw);
    // The tunnel mouth on the alignment side: a 9 m portal with a hood.
    const mouth = at(-34, 0);
    box(buildings, [mouth[0], level + 4.6, mouth[1]], [16, 9.2, 15], yaw);
    const opening = at(-34, 0);
    box(portals, [opening[0], level + 4.2, opening[1]], [9.4, 8.4, 4], yaw);
    // Approach track pair running from the portal to the hall.
    for (const side of [-1, 1]) {
      let previous = null;
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        const dx = -33 + t * 26;
        const point = at(dx, side * 2.4);
        const y = level + 0.5;
        if (previous) beam(rails, previous, [point[0], y, point[1]], 0.16, 0.16);
        previous = [point[0], y, point[1]];
      }
    }
    const sign = makeCanvasSign(24, 1.9, (ctx, canvas) => {
      ctx.fillStyle = '#0d2f3c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f2f6f6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 76px "Noto Sans HK", "PingFang HK", Arial, sans-serif';
      ctx.fillText(stop.label, canvas.width / 2, canvas.height * 0.52, canvas.width - 36);
    }, { transparent: false, canvasWidth: 1024, canvasHeight: 128 });
    sign.name = `OceanExpressSign${stop.name}`;
    const signAt = at(6, 17.4);
    sign.position.set(signAt[0], level + 12.4, signAt[1]);
    sign.rotation.y = -stop.heading;
    holder.add(sign);
    stats[`oceanExpress${stop.name}LevelMetres`] = Math.round(level * 10) / 10;
  }

  meshStore(holder, decks, materials.deck, 'OceanExpressStationDecks', false);
  meshStore(holder, walls, materials.surface, 'OceanExpressStationRetainingWalls', false);
  merged(holder, buildings, materials.concrete, 'OceanExpressStationWalls');
  claddingMeshes(holder, hallCladding, materials.cladding, 'OceanExpressStationFacade');
  merged(holder, roofs, materials.roof, 'OceanExpressStationRoofs');
  merged(holder, portals, materials.dark, 'OceanExpressPortalHoods');
  merged(holder, rails, materials.steel, 'OceanExpressApproachRails');

  const colliders = stops.map((stop) => colliderAt(stop.site, stop.point, 52, 34, stop.heading, ground(stop.point.x, stop.point.z), 16));
  stats.oceanExpressAlignmentMetres = Math.round(OCEAN_EXPRESS.alignmentMetres);
  return { colliders };
}

// ---------------------------------------------------------------------------------------------------------------
// The two gates: 正門 the main entrance by the MTR and 大樹灣 Tai Shue Wan.
// ---------------------------------------------------------------------------------------------------------------
function ringGatePoint(site, x, z) {
  const ring = site.ring;
  let best = { x: ring[0], z: ring[1], distance: Infinity, ry: 0 };
  for (let i = 0; i < ring.length - 2; i += 2) {
    const ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const length = Math.hypot(bx - ax, bz - az) || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (length * length)));
    const px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
    const distance = Math.hypot(px - x, pz - z);
    if (distance < best.distance) best = { x: px, z: pz, distance, ry: Math.atan2(-(bz - az), bx - ax) };
  }
  return best;
}

function buildGates(group, materials, stats) {
  const holder = new THREE.Group();
  holder.name = 'OceanParkGates';
  group.add(holder);
  const structures = [], roofs = [], decks = store(), walls = store();
  const gates = [
    { key: 'mainEntrance', site: OCEAN_PARK_WATERFRONT_SITE, label: '香港海洋公園 OCEAN PARK', width: 34 },
    { key: 'taiShueWanEntrance', site: OCEAN_PARK_WATERFRONT_SITE, label: '大樹灣入口 TAI SHUE WAN', width: 26 },
  ];
  for (const gate of gates) {
    const target = poiWorld(gate.key);
    const edge = ringGatePoint(gate.site, target.x, target.z);
    const level = ground(edge.x, edge.z);
    terrace(decks, walls, { x: edge.x, z: edge.z }, [gate.width + 16, 34], level + 0.2, edge.ry, C.paving);
    // Two pylons and a lintel, with the park's name across it.
    const along = (side, distance) => [edge.x + side * distance * Math.cos(edge.ry), edge.z + side * distance * Math.sin(edge.ry)];
    for (const side of [-1, 1]) {
      const [px, pz] = along(side, gate.width / 2);
      box(structures, [px, level + 5, pz], [2.4, 10, 2.4], -edge.ry);
      roofs.push(new THREE.ConeGeometry(2.2, 2.6, 4).translate(px, level + 11.3, pz));
    }
    const lintelX = edge.x, lintelZ = edge.z;
    box(structures, [lintelX, level + 9.4, lintelZ], [gate.width + 2, 2.2, 2.0], -edge.ry);
    const sign = makeCanvasSign(Math.min(30, gate.width), 2.2, (ctx, canvas) => {
      ctx.fillStyle = '#0b4a3c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f7f3e6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 78px "Noto Sans HK", "PingFang HK", Arial, sans-serif';
      ctx.fillText(gate.label, canvas.width / 2, canvas.height * 0.52, canvas.width - 40);
    }, { transparent: false, canvasWidth: 1024, canvasHeight: 128 });
    sign.name = `OceanParkGateSign${gate.key === 'mainEntrance' ? 'Main' : 'TaiShueWan'}`;
    sign.position.set(edge.x, level + 9.4, edge.z);
    sign.rotation.y = -edge.ry;
    holder.add(sign);
    // Ticket booths inside the gate.
    for (const side of [-1, 1]) {
      const bx = edge.x + side * (gate.width / 2 - 5) * Math.cos(edge.ry) + 9 * Math.sin(edge.ry);
      const bz = edge.z + side * (gate.width / 2 - 5) * Math.sin(edge.ry) - 9 * Math.cos(edge.ry);
      box(structures, [bx, level + 1.6, bz], [5, 3.2, 4], -edge.ry);
      roofs.push(new THREE.BoxGeometry(6, 0.5, 5).translate(bx, level + 3.4, bz));
    }
    stats[`oceanParkGate${gate.key === 'mainEntrance' ? 'MainLevelMetres' : 'TaiShueWanLevelMetres'}`] = Math.round(level * 10) / 10;
  }
  meshStore(holder, decks, materials.deck, 'OceanParkGateDecks', false);
  meshStore(holder, walls, materials.surface, 'OceanParkGateRetainingWalls', false);
  merged(holder, structures, materials.white, 'OceanParkGateStructures');
  merged(holder, roofs, materials.roof, 'OceanParkGateRoofs');
  return { colliders: [] };
}

// ---------------------------------------------------------------------------------------------------------------
// Vegetation: the park's planting, kept off the decks and off the sea cliffs.
// ---------------------------------------------------------------------------------------------------------------
function buildPlanting(group, materials, stats) {
  const holder = new THREE.Group();
  holder.name = 'OceanParkPlanting';
  group.add(holder);
  const trunks = [], canopies = [];
  let count = 0;
  for (const site of OCEAN_PARK_SITES) {
    const bounds = site.bounds;
    for (let i = 0; i < 4200; i++) {
      const x = bounds.minX + hash(i, 3, 17) * (bounds.maxX - bounds.minX);
      const z = bounds.minZ + hash(i, 11, 5) * (bounds.maxZ - bounds.minZ);
      if (!pointInFlatRing(site.ring, x, z)) continue;
      const height = ground(x, z);
      if (height < 3) continue;
      // Slope: steep ground is cliff and stays bare.
      const slope = Math.abs(ground(x + 6, z) - height) + Math.abs(ground(x, z + 6) - height);
      if (slope > 6) continue;
      if (hash(i, 19, 7) > 0.16) continue;
      const scale = 0.8 + hash(i, 23, 3) * 0.8;
      cylinder(trunks, [x, height + 1.1 * scale, z], 0.16 * scale, 2.2 * scale, 6);
      const canopy = new THREE.SphereGeometry(1.8 * scale, 6, 4);
      canopy.scale(1, 0.8, 1);
      canopy.translate(x, height + 3.0 * scale, z);
      canopies.push(canopy);
      count++;
    }
  }
  merged(holder, trunks, materials.concreteShade, 'OceanParkTreeTrunks');
  merged(holder, canopies, materials.foliage, 'OceanParkTreeCanopies');
  stats.oceanParkTrees = count;
}

export function buildOceanPark(scene) {
  const root = new THREE.Group();
  root.name = 'OceanPark';
  scene.add(root);
  const materials = makeMaterials();
  const stats = { oceanPark: true, oceanParkOsmRelation: OCEAN_PARK_SUMMIT_SITE.osmId };

  buildBoundary(root, materials, stats);
  const cable = buildCableCar(root, materials, stats);
  const express = buildOceanExpress(root, materials, stats);
  const gates = buildGates(root, materials, stats);
  buildPlanting(root, materials, stats);

  const colliders = [...cable.colliders, ...express.colliders, ...gates.colliders];
  const hectares = (OCEAN_PARK_SUMMIT_SITE.ringArea + OCEAN_PARK_WATERFRONT_SITE.ringArea) / 10000;
  Object.assign(stats, {
    oceanParkSummitHectares: Math.round(OCEAN_PARK_SUMMIT_SITE.ringArea / 1000) / 10,
    oceanParkWaterfrontHectares: Math.round(OCEAN_PARK_WATERFRONT_SITE.ringArea / 1000) / 10,
    oceanParkModelledHectares: Math.round(hectares * 10) / 10,
    oceanParkPublishedHectares: OCEAN_PARK_PUBLISHED.hectares,
    oceanParkWaterWorldHectares: OCEAN_PARK_PUBLISHED.waterWorldHectares,
    oceanParkOpened: OCEAN_PARK_PUBLISHED.opened,
    oceanParkCableCarPublishedMetres: CABLES.publishedMetres,
    oceanParkOceanExpressPublishedMetres: OCEAN_EXPRESS.publishedMetres,
    oceanParkResearchSources: OCEAN_PARK_RESEARCH_SOURCES.length,
    oceanParkColliders: colliders.length,
    oceanParkPart: 1,
  });

  const landmarks = [
    { id: 'ocean-park-summit', name: '高峰樂園 · Ocean Park Summit', position: { x: OCEAN_PARK_SUMMIT_SITE.x, y: 120, z: OCEAN_PARK_SUMMIT_SITE.z }, radius: 600, height: 260, components: 4 },
    { id: 'ocean-park-waterfront', name: '海濱樂園 · Ocean Park Waterfront', position: { x: OCEAN_PARK_WATERFRONT_SITE.x, y: 24, z: OCEAN_PARK_WATERFRONT_SITE.z }, radius: 320, height: 60, components: 3 },
  ];
  stats.oceanParkLandmarks = landmarks.length;
  stats.oceanParkInventoryId = 'HK-B0109';

  return {
    group: root, colliders, landmarks, stats,
    // The park keeps the surveyed DTM: nothing is flattened, so the terrain chain simply passes through.
    groundHeightAt(x, z, fallback) { return Math.max(fallback ?? 0, ground(x, z)); },
    cableCarProfile: cable.profile,
  };
}
