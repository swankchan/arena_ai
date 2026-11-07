// HISTORICAL RECONSTRUCTION — 荔園遊樂場 Lai Chi Kok Amusement Park (Lai Yuen), 1949-04-16 to 1997-03-31.
// Reconstructed from photographs and the documented ride list; it is NOT an OSM-derived building. See
// lai-yuen-architecture.js for the provenance and the honest scope note about the 160萬平方呎 total site.
import * as THREE from 'three/webgpu';
import { attribute, color } from 'three/tsl';
import {
  LAI_YUEN_SITE, LAI_YUEN_HISTORICAL, LAI_YUEN_ENTRANCE, LAI_YUEN_TICKET_BOOTHS, LAI_YUEN_FERRIS_WHEEL,
  LAI_YUEN_CAROUSEL, LAI_YUEN_COFFEE_CUPS, LAI_YUEN_DUMBO, LAI_YUEN_OCTOPUS, LAI_YUEN_BUMPER_CARS,
  LAI_YUEN_ROLLER_COASTER, LAI_YUEN_ICE_RINK, LAI_YUEN_LAKE, LAI_YUEN_BOAT_PAVILION, LAI_YUEN_POOLS,
  LAI_YUEN_TINO_CAGE, LAI_YUEN_TINO, LAI_YUEN_ZOO_ROWS, LAI_YUEN_SUNG_CITY, LAI_YUEN_RESEARCH_SOURCES,
  LAI_YUEN_TICKETS, laiYuenTerrainHeightAt,
} from './lai-yuen-architecture.js';
import {
  merged, box, cylinder, beam, store, quad, meshStore, harbourCityPalette, nightAmount, hash,
} from './harbour-city-world-utils.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { pointInFlatRing } from './landmark-site.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';
import { buildLaiYuenDetail, LAI_YUEN_DETAIL } from './lai-yuen-detail-world.js';

function ringShapeGeometry(ring, y) {
  const shape = new THREE.Shape();
  for (let i = 0; i < ring.length - 2; i += 2) { if (i === 0) shape.moveTo(ring[i], -ring[i + 1]); else shape.lineTo(ring[i], -ring[i + 1]); }
  shape.closePath(); const geometry = new THREE.ShapeGeometry(shape); geometry.rotateX(-Math.PI / 2); geometry.translate(0, y, 0); return geometry;
}
// Everything in this file is in the park's own local frame: site origin at the park centre, +x east, +z south.

function buildGround(group, materials, stats) {
  const ground = new THREE.Group(); ground.name = 'LaiYuenParkGround'; group.add(ground);
  const ring = LAI_YUEN_SITE.localRing;
  const paving = new THREE.Mesh(ringShapeGeometry(ring, 0.04), materials.paving);
  paving.name = 'LaiYuenParkPaving'; paving.receiveShadow = true; ground.add(paving);
  const paths = store(), lawns = store();
  // Central promenade from the entrance up to the lake, plus cross paths off it.
  quad(paths, [42, 0.06, 60], [54, 0.06, 60], [54, 0.06, -30], [42, 0.06, -30], [0.72, 0.68, 0.58]);
  quad(paths, [42, 0.06, -30], [-78, 0.06, -30], [-78, 0.06, -42], [42, 0.06, -42], [0.72, 0.68, 0.58]);
  quad(paths, [-16, 0.06, 60], [-4, 0.06, 60], [-4, 0.06, -66], [-16, 0.06, -66], [0.72, 0.68, 0.58]);
  quad(paths, [-78, 0.06, 10], [60, 0.06, 10], [60, 0.06, -2], [-78, 0.06, -2], [0.72, 0.68, 0.58]);
  meshStore(ground, paths, materials.path, 'LaiYuenPromenades');
  // Grass verges against the boundary bank, laid as 4 m tiles and clipped to the park ring so no lawn can ever
  // float outside the reconstructed wall.
  for (const [x0, z0, x1, z1] of [[-92, 44, -76, 64], [56, 12, 90, 64], [-92, -72, -76, -40], [24, -72, 90, -36]]) {
    for (let x = x0; x < x1; x += 4) {
      for (let z = z0; z < z1; z += 4) {
        const cx = x + 2, cz = z + 2;
        if (!pointInFlatRing(ring, cx, cz) || !pointInFlatRing(ring, x + 0.5, z + 0.5)
          || !pointInFlatRing(ring, x + 3.5, z + 3.5)) continue;
        quad(lawns, [x, 0.05, z], [x + 4, 0.05, z], [x + 4, 0.05, z + 4], [x, 0.05, z + 4], [0.33, 0.47, 0.26]);
      }
    }
  }
  meshStore(ground, lawns, materials.lawn, 'LaiYuenLawns');
  stats.parkArea = LAI_YUEN_SITE.ringArea;
  return ground;
}

function buildEntrance(group, materials, stats) {
  const e = LAI_YUEN_ENTRANCE;
  const gate = new THREE.Group(); gate.name = 'LaiYuenEntranceGate'; group.add(gate);
  const x = LAI_YUEN_ENTRANCE.x - LAI_YUEN_SITE.x, z = LAI_YUEN_ENTRANCE.z - LAI_YUEN_SITE.z;
  gate.position.set(x, 0, z);
  const towers = [], ribs = [], emblems = [], beamParts = [], booths = [], turnstiles = [];
  // Twin ribbed festival towers, exactly as the 1960s photograph shows them: a solid core faced with closely
  // spaced vertical fins, capped by a small flag mast.
  for (const side of [-1, 1]) {
    const cx = side * (e.width / 2 - e.towerWidth / 2);
    box(towers, [cx, e.towerHeight / 2, 0], [e.towerWidth, e.towerHeight, e.depth]);
    for (let i = 0; i < 9; i++) {
      const fx = cx - e.towerWidth / 2 + 0.3 + i * (e.towerWidth - 0.6) / 8;
      box(ribs, [fx, e.towerHeight / 2, e.depth / 2 + 0.12], [0.22, e.towerHeight - 0.6, 0.26]);
      box(ribs, [fx, e.towerHeight / 2, -e.depth / 2 - 0.12], [0.22, e.towerHeight - 0.6, 0.26]);
    }
    // Round decorative emblems, two per tower face.
    for (const ey of [e.towerHeight * 0.36, e.towerHeight * 0.62]) {
      const disc = new THREE.CylinderGeometry(0.85, 0.85, 0.16, 20); disc.rotateX(Math.PI / 2);
      disc.translate(cx, ey, e.depth / 2 + 0.24); emblems.push(disc);
    }
    cylinder(towers, [cx, e.towerHeight + 1.4, 0], 0.09, 2.8, 6);
  }
  // Thin lintel only: in the photograph the sky and the coaster track stay visible between the two towers, so the
  // portal is a beam over a deep opening rather than a solid block of facade.
  box(beamParts, [0, e.portalClear + 0.55, 0], [e.width - 2 * e.towerWidth, 1.1, e.depth * 0.7]);
  for (const side of [-1, 1]) {
    box(beamParts, [side * (e.towerWidth + 0.15), e.portalClear + 0.55, 0], [0.3, 1.1, e.depth * 0.7]);
  }
  // Recessed dark portal walls beside the turnstiles, so the opening reads with depth.
  for (const side of [-1, 1]) {
    box(beamParts, [side * (e.towerWidth + 1.6), e.portalClear / 2, -e.depth * 0.42], [0.35, e.portalClear, 0.4]);
  }
  // Ticket booths and turnstile rails, on the photographed line of small kiosks beside the gate.
  for (const booth of LAI_YUEN_TICKET_BOOTHS) {
    const bx = booth.x - LAI_YUEN_ENTRANCE.x, bz = booth.z - LAI_YUEN_ENTRANCE.z;
    box(booths, [bx, 1.5, bz], [3.0, 3.0, 2.4]);
    box(booths, [bx, 3.15, bz], [3.4, 0.3, 2.8]);
  }
  for (let i = -3; i <= 3; i++) {
    box(turnstiles, [i * 1.6, 1.05, -1.2], [0.34, 1.1, 0.5]);
  }
  merged(gate, towers, materials.gateWhite, 'LaiYuenTwinRibbedEntranceTowers');
  merged(gate, ribs, materials.gateCream, 'LaiYuenEntranceTowerVerticalFins');
  merged(gate, emblems, materials.gateRed, 'LaiYuenEntranceRoundEmblems');
  merged(gate, beamParts, materials.gateWhite, 'LaiYuenEntrancePortalLintel');
  merged(gate, booths, materials.gateCream, 'LaiYuenTicketBooths');
  merged(gate, turnstiles, materials.metal, 'LaiYuenTurnstiles');
  const sign = makeCanvasSign(13.0, 2.1, (ctx, canvas) => {
    ctx.fillStyle = '#f4efe2'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#b3232a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 150px "Noto Sans HK", "PingFang HK", Arial, sans-serif';
    ctx.fillText('荔園遊樂場', canvas.width / 2, canvas.height * 0.40, canvas.width - 60);
    ctx.font = '600 74px Arial, sans-serif';
    ctx.fillStyle = '#2b3a52';
    ctx.fillText('LAI CHI KOK AMUSEMENT PARK', canvas.width / 2, canvas.height * 0.80, canvas.width - 80);
  }, { transparent: false, canvasWidth: 1536, canvasHeight: 240 });
  sign.position.set(0, e.portalClear + 2.7, e.depth * 0.36); sign.name = 'LaiYuenEntranceSign';
  gate.add(sign);
  stats.entranceTowers = 2;
  return {
    colliders: [
      harbourCityLocalCollider(LAI_YUEN_SITE, x - e.width / 2 + e.towerWidth / 2, z, e.towerWidth, e.depth, 0, e.towerHeight),
      harbourCityLocalCollider(LAI_YUEN_SITE, x + e.width / 2 - e.towerWidth / 2, z, e.towerWidth, e.depth, 0, e.towerHeight),
    ],
  };
}

function buildFerrisWheel(group, materials, stats) {
  const w = LAI_YUEN_FERRIS_WHEEL;
  const x = w.x - LAI_YUEN_SITE.x, z = w.z - LAI_YUEN_SITE.z;
  const wheel = new THREE.Group(); wheel.name = 'LaiYuenFerrisWheel'; group.add(wheel); wheel.position.set(x, 0, z);
  const rim = [], spokes = [], legs = [], gondolasRed = [], gondolasCream = [];
  const hubY = w.hubHeight, segments = 32;
  for (let i = 0; i < segments; i++) {
    const a0 = i / segments * Math.PI * 2, a1 = (i + 1) / segments * Math.PI * 2;
    for (const dz of [-1.1, 1.1]) {
      beam(rim, [Math.cos(a0) * w.radius, hubY + Math.sin(a0) * w.radius, dz],
        [Math.cos(a1) * w.radius, hubY + Math.sin(a1) * w.radius, dz], 0.28, 0.22);
    }
    if (i % 2 === 0) {
      beam(spokes, [0, hubY, -1.1], [Math.cos(a0) * w.radius, hubY + Math.sin(a0) * w.radius, -1.1], 0.14);
      beam(spokes, [0, hubY, 1.1], [Math.cos(a0) * w.radius, hubY + Math.sin(a0) * w.radius, 1.1], 0.14);
    }
  }
  for (let i = 0; i < w.gondolas; i++) {
    const a = i / w.gondolas * Math.PI * 2;
    const gx = Math.cos(a) * w.radius, gy = hubY + Math.sin(a) * w.radius;
    const target = i % 2 ? gondolasCream : gondolasRed;
    box(target, [gx, gy - 0.5, 0], [1.5, 1.5, 2.2]);
  }
  for (const dz of [-2.4, 2.4]) {
    beam(legs, [-5.4, 0, dz], [0, hubY, dz], 0.5, 0.5);
    beam(legs, [5.4, 0, dz], [0, hubY, dz], 0.5, 0.5);
    beam(legs, [-5.4, 0, dz], [5.4, 0, dz], 0.4, 0.4);
  }
  cylinder(legs, [0, hubY, 0], 0.6, 3.2, 12); legs[legs.length - 1].rotateX(Math.PI / 2);
  merged(wheel, rim, materials.metal, 'LaiYuenFerrisWheelRims');
  merged(wheel, spokes, materials.metal, 'LaiYuenFerrisWheelSpokes');
  merged(wheel, legs, materials.metal, 'LaiYuenFerrisWheelTowersAndHub');
  merged(wheel, gondolasRed, materials.gateRed, 'LaiYuenFerrisWheelRedGondolas');
  merged(wheel, gondolasCream, materials.gateCream, 'LaiYuenFerrisWheelCreamGondolas');
  stats.ferrisWheelGondolas = w.gondolas;
  return { colliders: [harbourCityLocalCollider(LAI_YUEN_SITE, x, z, 12, 6, 0, hubY)] };
}

function buildRoundRides(group, materials, stats) {
  const rides = new THREE.Group(); rides.name = 'LaiYuenRoundRides'; group.add(rides);
  const platforms = [], canopies = [], shells = [], animalsCream = [], animalsRed = [], poles = [];
  // 旋轉木馬 carousel: a striped canopy on a column with a ring of horses on brass poles.
  {
    const c = LAI_YUEN_CAROUSEL, x = c.x - LAI_YUEN_SITE.x, z = c.z - LAI_YUEN_SITE.z;
    cylinder(platforms, [x, 0.25, z], c.radius, 0.5, 24);
    cylinder(poles, [x, 2.6, z], 0.32, 5.2, 12);
    const canopy = new THREE.ConeGeometry(c.radius + 0.7, 2.3, 24, 1, true);
    canopy.translate(x, 5.1, z); canopies.push(canopy);
    for (let i = 0; i < c.horses; i++) {
      const a = i / c.horses * Math.PI * 2, hx = x + Math.cos(a) * (c.radius - 1.1), hz = z + Math.sin(a) * (c.radius - 1.1);
      cylinder(poles, [hx, 2.4, hz], 0.05, 4.2, 6);
      box(i % 2 ? animalsRed : animalsCream, [hx, 1.5, hz], [1.5, 0.85, 0.5], -a);
    }
    stats.carouselHorses = c.horses;
  }
  // 咖啡杯 coffee cups.
  {
    const c = LAI_YUEN_COFFEE_CUPS, x = c.x - LAI_YUEN_SITE.x, z = c.z - LAI_YUEN_SITE.z;
    cylinder(platforms, [x, 0.2, z], c.radius, 0.4, 24);
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2 + 0.4;
      cylinder(shells, [x + Math.cos(a) * 4.2, 0.85, z + Math.sin(a) * 4.2], 1.5, 1.3, 14, 1.9);
    }
    stats.coffeeCups = 4;
  }
  // 小飛象 Dumbo elephants circling a mast.
  {
    const d = LAI_YUEN_DUMBO, x = d.x - LAI_YUEN_SITE.x, z = d.z - LAI_YUEN_SITE.z;
    cylinder(poles, [x, 2.4, z], 0.3, 4.8, 10);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2, ex = x + Math.cos(a) * (d.radius - 1.6), ez = z + Math.sin(a) * (d.radius - 1.6);
      beam(poles, [x, 4.4, z], [ex, 3.2, ez], 0.1);
      box(animalsCream, [ex, 2.3, ez], [1.9, 1.2, 1.3], -a);
      box(animalsCream, [ex + Math.cos(a) * 0.9, 2.9, ez + Math.sin(a) * 0.9], [0.7, 0.8, 0.7], -a);
    }
    stats.dumboCars = 8;
  }
  // 八爪魚 octopus: eight arms with cars sweeping low.
  {
    const o = LAI_YUEN_OCTOPUS, x = o.x - LAI_YUEN_SITE.x, z = o.z - LAI_YUEN_SITE.z;
    cylinder(poles, [x, 3.0, z], 0.7, 6.0, 12);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      beam(poles, [x, 5.6, z], [x + Math.cos(a) * (o.radius - 1.0), 1.5, z + Math.sin(a) * (o.radius - 1.0)], 0.22);
      box(animalsRed, [x + Math.cos(a) * (o.radius - 1.0), 1.2, z + Math.sin(a) * (o.radius - 1.0)], [1.6, 0.9, 1.1], -a);
    }
    stats.octopusArms = 8;
  }
  merged(rides, platforms, materials.platform, 'LaiYuenRoundRidePlatforms');
  merged(rides, canopies, materials.gateRed, 'LaiYuenCarouselStripedCanopy');
  merged(rides, poles, materials.metal, 'LaiYuenCarouselAndRidePoles');
  merged(rides, shells, materials.gateRed, 'LaiYuenCoffeeCupShells');
  merged(rides, animalsCream, materials.gateCream, 'LaiYuenDumboAndCreamHorses');
  merged(rides, animalsRed, materials.gateRed, 'LaiYuenOctopusCarsAndRedHorses');
  return rides;
}

function buildBumperCars(group, materials, stats) {
  const b = LAI_YUEN_BUMPER_CARS, x = b.x - LAI_YUEN_SITE.x, z = b.z - LAI_YUEN_SITE.z;
  const hall = new THREE.Group(); hall.name = 'LaiYuenBumperCarsHall'; group.add(hall); hall.position.set(x, 0, z);
  const walls = [], roof = [], cars = [], mesh = [];
  for (const [px, pz, w, d] of [[0, -b.depth / 2, b.width, 0.5], [-b.width / 2, 0, 0.5, b.depth], [b.width / 2, 0, 0.5, b.depth]]) {
    box(walls, [px, b.height / 2, pz], [w, b.height, d]);
  }
  // The open side faces the promenade, so only the three walls are modelled.
  box(roof, [0, b.height + 0.25, 0], [b.width + 1.2, 0.5, b.depth + 1.2]);
  for (let i = 0; i < 10; i++) {
    const cx = -b.width / 2 + 1.8 + (i % 5) * 3.4, cz = 1.0 + Math.floor(i / 5) * 5.0;
    box(cars, [cx, 0.55, cz], [1.9, 0.9, 1.4], (hash(i, 3) - 0.5) * 0.4);
  }
  for (let i = 0; i < 22; i++) {
    beam(mesh, [-b.width / 2 + 0.6 + i * (b.width - 1.2) / 21, b.height - 0.2, -b.depth / 2 + 0.4],
      [-b.width / 2 + 0.6 + i * (b.width - 1.2) / 21, b.height - 0.2, b.depth / 2 - 0.4], 0.05);
  }
  merged(hall, walls, materials.gateCream, 'LaiYuenBumperCarsWalls');
  merged(hall, roof, materials.metal, 'LaiYuenBumperCarsRoof');
  merged(hall, cars, materials.gateRed, 'LaiYuenBumperCarsVehicles');
  merged(hall, mesh, materials.metal, 'LaiYuenBumperCarsCeilingMesh', false);
  stats.bumperCars = 10;
  return { colliders: [
    harbourCityLocalCollider(LAI_YUEN_SITE, x, z - b.depth / 2, b.width, 0.8, 0, b.height),
    harbourCityLocalCollider(LAI_YUEN_SITE, x - b.width / 2, z, 0.8, b.depth, 0, b.height),
    harbourCityLocalCollider(LAI_YUEN_SITE, x + b.width / 2, z, 0.8, b.depth, 0, b.height),
  ] };
}

function buildRollerCoaster(group, materials, stats) {
  const c = LAI_YUEN_ROLLER_COASTER, x = c.x - LAI_YUEN_SITE.x, z = c.z - LAI_YUEN_SITE.z;
  const coaster = new THREE.Group(); coaster.name = 'LaiYuenRollerCoaster'; group.add(coaster); coaster.position.set(x, 0, z);
  const rails = [], ties = [], supports = [];
  // A closed dog-bone circuit with two lifts: the 過山飛龍 was a compact steel coaster, so the track stays low.
  const path = (t) => {
    const a = t * Math.PI * 2;
    const px = Math.cos(a) * (c.length / 2 - 4);
    const pz = Math.sin(a) * (c.width / 2 - 3) * (0.55 + 0.45 * Math.abs(Math.cos(a)));
    const hill = 4 + 11 * Math.pow(Math.max(0, Math.sin(a * 1.5)), 2);
    return [px, Math.min(c.peak, hill), pz];
  };
  const steps = 96;
  for (let i = 0; i < steps; i++) {
    const p0 = path(i / steps), p1 = path((i + 1) / steps);
    for (const off of [-0.75, 0.75]) beam(rails, [p0[0], p0[1], p0[2] + off], [p1[0], p1[1], p1[2] + off], 0.16, 0.16);
    beam(ties, [p0[0], p0[1] - 0.1, p0[2] - 0.9], [p0[0], p0[1] - 0.1, p0[2] + 0.9], 0.1);
    if (i % 4 === 0 && p0[1] > 1.4) {
      beam(supports, [p0[0], 0, p0[2]], [p0[0], p0[1], p0[2]], 0.24);
    }
  }
  merged(coaster, rails, materials.coasterTrack, 'LaiYuenRollerCoasterRails');
  merged(coaster, ties, materials.metal, 'LaiYuenRollerCoasterTies');
  merged(coaster, supports, materials.metal, 'LaiYuenRollerCoasterSupports');
  stats.coasterPeak = c.peak;
  return coaster;
}

function buildIceRink(group, materials, stats) {
  const r = LAI_YUEN_ICE_RINK, x = r.x - LAI_YUEN_SITE.x, z = r.z - LAI_YUEN_SITE.z;
  const hall = new THREE.Group(); hall.name = 'LaiYuenRealSnowIceRink'; group.add(hall); hall.position.set(x, 0, z);
  const walls = [], roof = [], ice = store();
  for (const [px, pz, w, d] of [[0, -r.depth / 2, r.width, 0.6], [0, r.depth / 2, r.width, 0.6], [-r.width / 2, 0, 0.6, r.depth], [r.width / 2, 0, 0.6, r.depth]]) {
    box(walls, [px, r.height / 2, pz], [w, r.height, d]);
  }
  // Barrel-vaulted roof, which is what the photographs show over the only real-snow rink in Hong Kong.
  const vault = new THREE.CylinderGeometry(r.depth / 2 + 1.0, r.depth / 2 + 1.0, r.width + 1.0, 20, 1, false, 0, Math.PI);
  vault.rotateZ(Math.PI / 2); vault.translate(0, r.height, 0); roof.push(vault);
  quad(ice, [-r.width / 2 + 3, 0.12, -r.depth / 2 + 3], [r.width / 2 - 3, 0.12, -r.depth / 2 + 3],
    [r.width / 2 - 3, 0.12, r.depth / 2 - 3], [-r.width / 2 + 3, 0.12, r.depth / 2 - 3], [0.86, 0.92, 0.95]);
  merged(hall, walls, materials.gateCream, 'LaiYuenIceRinkWalls');
  merged(hall, roof, materials.roofMetal, 'LaiYuenIceRinkBarrelVault');
  meshStore(hall, ice, materials.ice, 'LaiYuenRealSnowIceSurface');
  stats.iceRink = 'real-snow rink';
  return { colliders: [
    harbourCityLocalCollider(LAI_YUEN_SITE, x, z - r.depth / 2, r.width, 0.9, 0, r.height),
    harbourCityLocalCollider(LAI_YUEN_SITE, x, z + r.depth / 2, r.width, 0.9, 0, r.height),
  ] };
}

function buildWater(group, materials, stats) {
  const water = new THREE.Group(); water.name = 'LaiYuenLakeAndSpringPools'; group.add(water);
  const lake = LAI_YUEN_LAKE, lx = lake.x - LAI_YUEN_SITE.x, lz = lake.z - LAI_YUEN_SITE.z;
  const waterStore = store(), kerbs = [], boats = [];
  const disc = new THREE.CircleGeometry(lake.radius, 40); disc.rotateX(-Math.PI / 2); disc.translate(lx, 0.10, lz);
  quad(waterStore, [lx - lake.radius, 0.08, lz - lake.radius], [lx + lake.radius, 0.08, lz - lake.radius],
    [lx + lake.radius, 0.08, lz + lake.radius], [lx - lake.radius, 0.08, lz + lake.radius], [0.16, 0.30, 0.30]);
  for (let i = 0; i < 28; i++) {
    const a = i / 28 * Math.PI * 2;
    beam(kerbs, [lx + Math.cos(a) * lake.radius, 0.32, lz + Math.sin(a) * lake.radius],
      [lx + Math.cos(a + 0.24) * lake.radius, 0.32, lz + Math.sin(a + 0.24) * lake.radius], 0.6, 0.7);
  }
  // The boat-shaped pavilion from the 1950s photograph: hull, two decks, a raked funnel and a flag mast.
  const bp = LAI_YUEN_BOAT_PAVILION, bx = bp.x - LAI_YUEN_SITE.x, bz = bp.z - LAI_YUEN_SITE.z;
  const hull = [], white = [], funnels = [];
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-bp.length / 2, -bp.width / 2); hullShape.lineTo(bp.length / 2 - 3, -bp.width / 2);
  hullShape.quadraticCurveTo(bp.length / 2 + 1.5, 0, bp.length / 2 - 3, bp.width / 2);
  hullShape.lineTo(-bp.length / 2, bp.width / 2); hullShape.closePath();
  const hullGeometry = new THREE.ExtrudeGeometry(hullShape, { depth: 2.6, bevelEnabled: false });
  hullGeometry.rotateX(-Math.PI / 2); hullGeometry.translate(bx, 0.4, bz); hull.push(hullGeometry);
  // Deckhouse: an open colonnaded veranda under a wide flat roof, as in the 1950s photograph, rather than a sealed box.
  box(white, [bx, 3.2, bz], [bp.length - 4.0, 0.35, bp.width - 1.6]);
  const deckTop = 3.4, colonnadeTop = 5.5;
  const colonnade = [];
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const cxp = bx - (bp.length - 5.2) / 2 + t * (bp.length - 5.2);
    for (const sideSign of [-1, 1]) cylinder(colonnade, [cxp, deckTop + 1.05, bz + sideSign * (bp.width - 2.4) / 2], 0.16, 2.1, 6);
  }
  for (let i = 0; i < 3; i++) {
    const czp = bz + (i - 1) * (bp.width - 4.6) / 2.8;
    for (const sideSign of [-1, 1]) cylinder(colonnade, [bx + sideSign * (bp.length - 5.2) / 2, deckTop + 1.05, czp], 0.16, 2.1, 6);
  }
  white.push(...colonnade);
  // Railing top rail with a slender balustrade, so the deck reads as an open promenade.
  for (const sideSign of [-1, 1]) {
    box(white, [bx, deckTop + 0.85, bz + sideSign * (bp.width - 1.9) / 2], [bp.length - 4.6, 0.14, 0.16]);
    box(white, [bx + sideSign * (bp.length - 4.2) / 2, deckTop + 0.85, bz], [0.16, 0.14, bp.width - 2.2]);
  }
  box(white, [bx, colonnadeTop + 0.16, bz], [bp.length - 2.0, 0.3, bp.width - 0.1]);
  box(white, [bx - 0.6, colonnadeTop + 1.55, bz], [bp.length - 7.5, 2.4, bp.width - 4.2]);
  box(white, [bx - 0.6, colonnadeTop + 2.9, bz], [bp.length - 6.3, 0.28, bp.width - 3.0]);
  const funnel = new THREE.CylinderGeometry(1.0, 1.2, 3.2, 12); funnel.translate(bx + 2.4, colonnadeTop + 4.4, bz); funnels.push(funnel);
  cylinder(funnels, [bx - 5.4, colonnadeTop + 5.0, bz], 0.08, 4.6, 6);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + 0.5;
    box(boats, [lx + Math.cos(a) * (lake.radius - 4.5), 0.34, lz + Math.sin(a) * (lake.radius - 4.5)], [3.4, 0.62, 1.3], -a);
  }
  merged(water, kerbs, materials.gateCream, 'LaiYuenLakeEdge');
  meshStore(water, waterStore, materials.water, 'LaiYuenLakeWater');
  merged(water, hull, materials.boatHull, 'LaiYuenBoatPavilionHull');
  merged(water, white, materials.gateWhite, 'LaiYuenBoatPavilionDecks');
  merged(water, funnels, materials.gateRed, 'LaiYuenBoatPavilionFunnelAndMast');
  merged(water, boats, materials.gateCream, 'LaiYuenRowingBoats');

  // The three spring-fed swimming pools, each with a tiled deck and a diving board.
  const p = LAI_YUEN_POOLS, px0 = p.x - LAI_YUEN_SITE.x, pz0 = p.z - LAI_YUEN_SITE.z;
  const poolWater = store(), decks = store(), tiles = [];
  p.widths.forEach((width, index) => {
    const x0 = px0 - (p.widths.length * (width + p.gap)) / 2 + index * (width + p.gap);
    quad(poolWater, [x0, 0.12, pz0 - p.depth / 2], [x0 + width, 0.12, pz0 - p.depth / 2],
      [x0 + width, 0.12, pz0 + p.depth / 2], [x0, 0.12, pz0 + p.depth / 2], [0.22, 0.52, 0.62]);
    quad(decks, [x0 - 1.6, 0.07, pz0 - p.depth / 2 - 1.6], [x0 + width + 1.6, 0.07, pz0 - p.depth / 2 - 1.6],
      [x0 + width + 1.6, 0.07, pz0 + p.depth / 2 + 1.6], [x0 - 1.6, 0.07, pz0 + p.depth / 2 + 1.6], [0.80, 0.78, 0.70]);
    box(tiles, [x0 + width - 1.0, 1.2, pz0 - p.depth / 2 + 2.2], [1.0, 0.22, 3.6]);
    for (const dz of [-1.0, 1.0]) cylinder(tiles, [x0 + width - 1.0, 0.9, pz0 - p.depth / 2 + 2.2 + dz * 1.6], 0.07, 1.8, 6);
  });
  meshStore(water, poolWater, materials.water, 'LaiYuenThreeSpringFedPools');
  meshStore(water, decks, materials.path, 'LaiYuenPoolDecks');
  merged(water, tiles, materials.gateWhite, 'LaiYuenDivingBoards');
  stats.pools = p.widths.length;
  stats.lakeRadius = lake.radius;
  return { colliders: [] };
}

function buildZoo(group, materials, stats) {
  const zoo = new THREE.Group(); zoo.name = 'LaiYuenZoo'; group.add(zoo);
  const bars = [], rocks = [], huts = [];
  const r = LAI_YUEN_ZOO_ROWS, rx = r.x - LAI_YUEN_SITE.x;
  // Cage rows: a barred front, a low wall and a hutch behind, exactly the flat-roofed zoo sheds in the photographs.
  for (let i = 0; i < r.cages; i++) {
    const cz = r.z0 - LAI_YUEN_SITE.z - i * (r.cageDepth + 1.2);
    box(huts, [rx - r.cageWidth / 2 + 0.2, 1.1, cz], [0.4, 2.2, r.cageDepth]);
    box(huts, [rx - r.cageWidth / 2 + 0.2, 2.3, cz], [r.cageWidth, 0.25, r.cageDepth]);
    for (let b = 0; b <= 8; b++) {
      const bx = rx - r.cageWidth / 2 + 0.2 + b * (r.cageWidth - 0.4) / 8;
      box(bars, [bx, 1.1, cz + r.cageDepth / 2], [0.07, 2.2, 0.07]);
    }
  }
  // Rockwork grotto behind the zoo, part of the photographed hillside backdrop.
  for (let i = 0; i < 9; i++) {
    const gx = rx - 6 - i * 1.8, gz = -LAI_YUEN_SITE.z * 0 + (r.z0 - LAI_YUEN_SITE.z) - 6 - (i % 3) * 3.4;
    const rock = new THREE.SphereGeometry(2.2 + (i % 4) * 0.5, 8, 6);
    rock.scale(1.4, 0.8, 1.1); rock.translate(gx, 1.0, gz); rocks.push(rock);
  }
  merged(zoo, bars, materials.metal, 'LaiYuenZooCageBars');
  merged(zoo, huts, materials.gateCream, 'LaiYuenZooShedsAndTinoCageRoof');
  merged(zoo, rocks, materials.rock, 'LaiYuenZooRockGrotto');
  stats.zooCages = r.cages + 1;
  stats.tinoCageSquareFeet = Math.round(LAI_YUEN_TINO_CAGE.width * LAI_YUEN_TINO_CAGE.depth * 10.7639);
  stats.tinoCageSquareMetres = LAI_YUEN_TINO_CAGE.width * LAI_YUEN_TINO_CAGE.depth;
  return { colliders: [] };
}

function buildSungCity(group, materials, stats) {
  const s = LAI_YUEN_SUNG_CITY, x = s.x - LAI_YUEN_SITE.x, z = s.z - LAI_YUEN_SITE.z;
  const city = new THREE.Group(); city.name = 'LaiYuenSungCity'; group.add(city); city.position.set(x, 0, z);
  const walls = [], crenels = [], roofs = [], timber = [], paper = [], stone = [];
  // Crenellated perimeter wall with a gate tower on the park side.
  const hw = s.width / 2, hd = s.depth / 2, t = s.wallThickness;
  for (const [px, pz, w, d] of [[0, -hd, s.width, t], [0, hd, s.width, t], [-hw, 0, t, s.depth], [hw, 0, t, s.depth]]) {
    box(walls, [px, s.wallHeight / 2, pz], [w, s.wallHeight, d]);
  }
  for (let i = 0; i < 16; i++) {
    const cx = -hw + 1.5 + i * (s.width - 3) / 15;
    box(crenels, [cx, s.wallHeight + 0.5, -hd], [1.5, 1.0, t + 0.2]);
    box(crenels, [cx, s.wallHeight + 0.5, hd], [1.5, 1.0, t + 0.2]);
  }
  for (let i = 0; i < 14; i++) {
    const cz = -hd + 1.8 + i * (s.depth - 3.6) / 13;
    box(crenels, [-hw, s.wallHeight + 0.5, cz], [t + 0.2, 1.0, 1.5]);
    box(crenels, [hw, s.wallHeight + 0.5, cz], [t + 0.2, 1.0, 1.5]);
  }
  // Gate tower: two storeys of red timber on stone, under a double eaves roof.
  box(stone, [0, s.gateHeight * 0.22, hd], [11, s.gateHeight * 0.44, 4.6]);
  box(timber, [0, s.gateHeight * 0.62, hd], [8.6, s.gateHeight * 0.36, 3.8]);
  for (const [ry, w, d] of [[s.gateHeight * 0.80, 12.6, 6.4], [s.gateHeight * 0.99, 9.6, 5.0]]) {
    const roofGeometry = new THREE.ConeGeometry(1, 1, 4, 1, false);
    roofGeometry.scale(w * 0.62, 1.9, d * 0.62); roofGeometry.rotateY(Math.PI / 4); roofGeometry.translate(0, ry, hd);
    roofs.push(roofGeometry);
  }
  // 五層 pagoda 塔 marking 宋城 on the skyline.
  const pz = -hd + 12, pedestal = 7.5;
  cylinder(stone, [hw - 12, pedestal / 2, pz], 3.4, pedestal, 8);
  for (let tier = 0; tier < s.pagodaTiers; tier++) {
    const y = pedestal + tier * 3.6;
    const radius = 3.0 - tier * 0.42;
    cylinder(timber, [hw - 12, y + 1.5, pz], radius, 2.8, 8);
    for (let side = 0; side < 8; side += 2) {
      const a = side / 8 * Math.PI * 2;
      box(paper, [hw - 12 + Math.cos(a) * radius * 0.92, y + 1.5, pz + Math.sin(a) * radius * 0.92], [0.7, 1.4, 0.12], -a);
    }
    const eave = new THREE.ConeGeometry(1, 1, 8, 1, false);
    eave.scale(radius + 1.5, 1.1, radius + 1.5); eave.translate(hw - 12, y + 3.4, pz);
    roofs.push(eave);
  }
  cylinder(timber, [hw - 12, pedestal + s.pagodaTiers * 3.6 + 2.0, pz], 0.18, 4.0, 6);
  // Three timber halls around a paved courtyard, plus the wax museum block.
  for (let i = 0; i < s.hallCount; i++) {
    const hx = -hw + 10 + i * 13, hz = -hd + 20;
    box(stone, [hx, 0.8, hz], [10, 1.6, 7]);
    box(timber, [hx, 3.2, hz], [9, 3.2, 6]);
    const roofGeometry = new THREE.ConeGeometry(1, 1, 4, 1, false);
    roofGeometry.scale(6.4, 2.0, 4.6); roofGeometry.rotateY(Math.PI / 4); roofGeometry.translate(hx, 5.6, hz);
    roofs.push(roofGeometry);
  }
  box(stone, [-hw + 9, 1.5, -hd + 8], [16, 3.0, 9]);
  box(timber, [-hw + 9, 3.6, -hd + 8], [15, 1.6, 8]);
  const museumRoof = new THREE.ConeGeometry(1, 1, 4, 1, false);
  museumRoof.scale(9.6, 1.8, 6.0); museumRoof.rotateY(Math.PI / 4); museumRoof.translate(-hw + 9, 5.2, -hd + 8);
  roofs.push(museumRoof);
  const courtyard = store();
  quad(courtyard, [-hw + 2, 0.09, -hd + 2], [hw - 2, 0.09, -hd + 2], [hw - 2, 0.09, hd - 2], [-hw + 2, 0.09, hd - 2], [0.62, 0.58, 0.50]);
  merged(city, walls, materials.cityWall, 'LaiYuenSungCityWalls');
  merged(city, crenels, materials.cityWall, 'LaiYuenSungCityCrenellations');
  merged(city, roofs, materials.cityRoof, 'LaiYuenSungCityTiledRoofsPagodaAndGateEaves');
  merged(city, timber, materials.cityTimber, 'LaiYuenSungCityRedTimberGateHallsAndPagodaStoreys');
  merged(city, stone, materials.cityStone, 'LaiYuenSungCityStonePlinthsAndMuseumBlock');
  meshStore(city, courtyard, materials.path, 'LaiYuenSungCityCourtyard');
  const museumSign = makeCanvasSign(9.0, 1.1, (ctx, canvas) => {
    ctx.fillStyle = '#7d1f1f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f5e6c8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 96px "Noto Sans HK", "PingFang HK", Arial, sans-serif';
    ctx.fillText('宋城  SUNG CITY', canvas.width / 2, canvas.height / 2, canvas.width - 50);
  }, { transparent: false, canvasWidth: 1400, canvasHeight: 176 });
  museumSign.position.set(-hw + 9, 4.9, -hd + 12.7); museumSign.name = 'LaiYuenSungCitySign';
  city.add(museumSign);
  stats.sungCityHalls = s.hallCount;
  stats.sungCityPagodaTiers = s.pagodaTiers;
  stats.sungCityWallHeight = s.wallHeight;
  return { colliders: [
    harbourCityLocalCollider(LAI_YUEN_SITE, x, z - hd, s.width, 1.0, 0, s.wallHeight),
    harbourCityLocalCollider(LAI_YUEN_SITE, x, z + hd, s.width, 1.0, 0, s.wallHeight),
    harbourCityLocalCollider(LAI_YUEN_SITE, x - hw, z, 1.0, s.depth, 0, s.wallHeight),
    harbourCityLocalCollider(LAI_YUEN_SITE, x + hw, z, 1.0, s.depth, 0, s.wallHeight),
  ] };
}

function buildStalls(group, materials, stats) {
  const stalls = new THREE.Group(); stalls.name = 'LaiYuenGameStalls'; group.add(stalls);
  const booths = [], awnings = [], bulbs = [];
  // The arcade row photographed inside the gate: open-fronted booths with striped awnings and a bulb line.
  for (let i = 0; i < 9; i++) {
    const x = -40 + i * 6.4, z = 46;
    box(booths, [x, 1.4, z], [5.6, 2.8, 4.2]);
    box(i % 2 ? awnings : booths, [x, 2.95, z + 2.2], [6.0, 0.22, 1.6]);
    for (let b = 0; b < 5; b++) box(bulbs, [x - 2.4 + b * 1.2, 3.22, z + 2.9], [0.16, 0.16, 0.16]);
  }
  merged(stalls, booths, materials.gateCream, 'LaiYuenGameStallBooths');
  merged(stalls, awnings, materials.gateRed, 'LaiYuenGameStallStripedAwnings');
  merged(stalls, bulbs, materials.lamp, 'LaiYuenGameStallBulbs', false);
  stats.gameStalls = 9;
  return { colliders: [harbourCityLocalCollider(LAI_YUEN_SITE, -14, 46, 58, 4.6, 0, 3.0)] };
}

export function buildLaiYuen(root, { groundOffset = 0 } = {}) {
  const complex = new THREE.Group();
  complex.name = 'LaiYuenAmusementPark';
  complex.userData.landmark = 'lai-yuen-amusement-park';
  complex.userData.historical = { ...LAI_YUEN_HISTORICAL, reconstructed: true };
  complex.position.set(LAI_YUEN_SITE.x, groundOffset, LAI_YUEN_SITE.z);
  complex.rotation.y = LAI_YUEN_SITE.ry;
  root.add(complex);

  const palette = harbourCityPalette({ stone: [0.72, 0.70, 0.64], paleStone: [0.85, 0.84, 0.78], roughness: 0.74 });
  const vertexFlat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.86, metalness: 0.03, side: THREE.DoubleSide });
  vertexFlat.colorNode = attribute('color');
  const paving = new THREE.MeshStandardMaterial({ color: 0xa8a49a, roughness: 0.92, metalness: 0.02, side: THREE.DoubleSide });
  const path = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.02, side: THREE.DoubleSide });
  path.colorNode = attribute('color');
  const lawn = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.94, metalness: 0, side: THREE.DoubleSide });
  lawn.colorNode = attribute('color');
  const water = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.18, metalness: 0.15, side: THREE.DoubleSide });
  water.colorNode = attribute('color');
  const ice = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.14, metalness: 0.1, side: THREE.DoubleSide });
  ice.colorNode = attribute('color');
  const gateWhite = new THREE.MeshStandardMaterial({ color: 0xeceae1, roughness: 0.66, metalness: 0.06, side: THREE.DoubleSide });
  const gateCream = new THREE.MeshStandardMaterial({ color: 0xd9cfae, roughness: 0.7, metalness: 0.05, side: THREE.DoubleSide });
  const gateRed = new THREE.MeshStandardMaterial({ color: 0xb32b26, roughness: 0.62, metalness: 0.05, side: THREE.DoubleSide });
  const metal = new THREE.MeshStandardMaterial({ color: 0x7d8580, roughness: 0.44, metalness: 0.55 });
  const platform = new THREE.MeshStandardMaterial({ color: 0x8a8b85, roughness: 0.8, metalness: 0.1, side: THREE.DoubleSide });
  const coasterTrack = new THREE.MeshStandardMaterial({ color: 0xc9c6b8, roughness: 0.42, metalness: 0.5 });
  const roofMetal = new THREE.MeshStandardMaterial({ color: 0x9aa1a0, roughness: 0.5, metalness: 0.45, side: THREE.DoubleSide });
  const boatHull = new THREE.MeshStandardMaterial({ color: 0xb8bcbd, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide });
  const rock = new THREE.MeshStandardMaterial({ color: 0x8b8477, roughness: 0.95 });
  const elephant = new THREE.MeshStandardMaterial({ color: 0x8d8b85, roughness: 0.9 });
  const cityWall = new THREE.MeshStandardMaterial({ color: 0x9c9a90, roughness: 0.9, side: THREE.DoubleSide });
  const cityRoof = new THREE.MeshStandardMaterial({ color: 0x3f4a4a, roughness: 0.66, metalness: 0.16, side: THREE.DoubleSide });
  const cityTimber = new THREE.MeshStandardMaterial({ color: 0x8c3a2a, roughness: 0.76, side: THREE.DoubleSide });
  const cityStone = new THREE.MeshStandardMaterial({ color: 0xb0aca0, roughness: 0.88, side: THREE.DoubleSide });
  const lamp = new THREE.MeshStandardNodeMaterial({ color: 0xfff0c8 });
  lamp.emissiveNode = color(1, 0.85, 0.5).mul(nightAmount()).mul(1.5);
  const materials = {
    paving, path, lawn, water, ice, gateWhite, gateCream, gateRed, metal, platform, coasterTrack, roofMetal,
    boatHull, rock, elephant, cityWall, cityRoof, cityTimber, cityStone, lamp, white: palette.white,
  };

  const stats = { laiYuenHistoricalReconstruction: true };
  buildGround(complex, materials, stats);
  const entrance = buildEntrance(complex, materials, stats);
  const ferris = buildFerrisWheel(complex, materials, stats);
  buildRoundRides(complex, materials, stats);
  const bumper = buildBumperCars(complex, materials, stats);
  buildRollerCoaster(complex, materials, stats);
  const rink = buildIceRink(complex, materials, stats);
  buildWater(complex, materials, stats);
  const zoo = buildZoo(complex, materials, stats);
  const detail = buildLaiYuenDetail(complex, materials, stats, { groundOffset });
  const city = buildSungCity(complex, materials, stats);
  const stalls = buildStalls(complex, materials, stats);

  const colliders = [
    ...entrance.colliders, ...ferris.colliders, ...bumper.colliders, ...rink.colliders,
    ...zoo.colliders, ...city.colliders, ...stalls.colliders, ...detail.colliders,
  ].map((collider) => ({ ...collider, minY: collider.minY + groundOffset, maxY: collider.maxY + groundOffset }));

  Object.assign(stats, {
    laiYuenGroundOffset: groundOffset,
    laiYuenLandmarks: 1,
    laiYuenInventoryId: 'HK-H001',
    laiYuenOpened: LAI_YUEN_HISTORICAL.opened,
    laiYuenClosed: LAI_YUEN_HISTORICAL.closed,
    laiYuenPresentOsmWays: LAI_YUEN_HISTORICAL.presentOsmWays,
    laiYuenDocumentedAreaSquareMetres: LAI_YUEN_HISTORICAL.documentedAreaSquareMetres,
    laiYuenModelledArea: LAI_YUEN_SITE.ringArea,
    laiYuenRides: 9,
    laiYuenResearchSources: LAI_YUEN_RESEARCH_SOURCES.length,
    laiYuenColliders: colliders.length,
    laiYuenAdultTicket: LAI_YUEN_TICKETS.adult,
    laiYuenTino: LAI_YUEN_TINO.name,
    laiYuenTinoDied: LAI_YUEN_TINO.died,
    laiYuenZooClosed: '1993-07-31',
  });

  const landmarks = [{
    id: 'lai-yuen-amusement-park',
    name: '荔園遊樂場（歷史重建）· Lai Chi Kok Amusement Park (historical reconstruction)',
    position: { x: LAI_YUEN_SITE.x, y: groundOffset, z: LAI_YUEN_SITE.z },
    radius: 120, height: 32, components: 1, historical: true,
  }];

  return {
    group: complex,
    colliders,
    landmarks,
    stats,
    groundOffset,
    plazaTop: groundOffset,
    groundHeightAt(x, z, fallback) {
      return laiYuenTerrainHeightAt(x, z, fallback, groundOffset);
    },
  };
}
