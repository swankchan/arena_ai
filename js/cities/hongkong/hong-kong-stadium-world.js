// HK-B0102: Hong Kong Stadium (香港大球場) — continuous single-tier ~40,000-seat bowl inside the exact OSM way
// 230843881, with the 1994 twin white tensile membrane roofs, each carried by a pair of white lattice arches.
import * as THREE from 'three/webgpu';
import { attribute, color } from 'three/tsl';
import {
  HONG_KONG_STADIUM_SITE, HONG_KONG_STADIUM_OSM_SOURCE, HKS_PITCH_LENGTH, HKS_PITCH_WIDTH, HKS_APRON,
  HKS_BOWL_ROWS, HKS_ROW_TREAD, HKS_ROW_RISE, HKS_FRONT_WALL, HKS_SEAT_PITCH, HKS_INNER_HALF_LENGTH,
  HKS_INNER_HALF_WIDTH, HKS_STAND_DEPTH, HKS_TIER_TOP, HKS_OUTER_HALF_LENGTH, HKS_OUTER_HALF_WIDTH,
  HKS_ROOF_COUNT, HKS_ARCHES_PER_ROOF, HKS_ROOF_APEX, HKS_ROOF_SPRING, HKS_ROOF_CANTILEVER, HKS_ARCH_LEG_OFFSET,
  HKS_SEATS, HKS_REBUILD_YEAR, HKS_ORIGINAL_YEAR, HKS_PITCH_SURFACE, HKS_FLOODLIGHT_HEIGHT, HKS_COLOURS,
  HKS_RESEARCH_SOURCES, hongKongStadiumTerrainHeightAt,
} from './hong-kong-stadium-architecture.js';
import {
  merged, box, cylinder, beam, store, quad, meshStore, harbourCityPalette, nightAmount, lerp,
} from './harbour-city-world-utils.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';

const A0 = HKS_INNER_HALF_LENGTH, B0 = HKS_INNER_HALF_WIDTH;

// Rectangles are expressed as half-extents from the pitch centre: row `o` has half-extents (A0 + o, B0 + o).
function rectQuad(target, o0, o1, y0, y1, colour) {
  const a0 = A0 + o0, b0 = B0 + o0, a1 = A0 + o1, b1 = B0 + o1;
  // North and south treads.
  quad(target, [-a1, y1, -b1], [a1, y1, -b1], [a1, y1, -b0], [-a1, y1, -b0], colour);
  quad(target, [-a1, y1, b0], [a1, y1, b0], [a1, y1, b1], [-a1, y1, b1], colour);
  // East and west treads.
  quad(target, [a0, y1, -b1], [a1, y1, -b1], [a1, y1, b1], [a0, y1, b1], colour);
  quad(target, [-a1, y1, -b1], [-a0, y1, -b1], [-a0, y1, b1], [-a1, y1, b1], colour);
  // Risers facing the pitch on all four sides.
  if (y0 !== y1) {
    quad(target, [-a0, y0, -b0], [a0, y0, -b0], [a0, y1, -b0], [-a0, y1, -b0], colour);
    quad(target, [-a0, y0, b0], [a0, y0, b0], [a0, y1, b0], [-a0, y1, b0], colour);
    quad(target, [a0, y0, -b0], [a0, y0, b0], [a0, y1, b0], [a0, y1, -b0], colour);
    quad(target, [-a0, y0, -b0], [-a0, y0, b0], [-a0, y1, b0], [-a0, y1, -b0], colour);
  }
}

// One seat shell: a single quad back tilted 12 degrees, which is enough to read the row pattern at city scale.
function seatQuad(target, x, z, y, facing, colour) {
  const tilt = 0.24, height = 0.56, half = HKS_SEAT_PITCH * 0.44;
  if (facing === 'north' || facing === 'south') {
    const s = facing === 'south' ? 1 : -1;
    quad(target, [x - half, y, z], [x + half, y, z], [x + half, y + height, z + s * height * tilt], [x - half, y + height, z + s * height * tilt], colour);
  } else {
    const s = facing === 'east' ? 1 : -1;
    quad(target, [x, y, z - half], [x, y, z + half], [x + s * height * tilt, y + height, z + half], [x + s * height * tilt, y + height, z - half], colour);
  }
}

function buildPitch(group, materials, stats) {
  const pitch = new THREE.Group(); pitch.name = 'HongKongStadiumPitchAndApron'; group.add(pitch);
  const turf = store(), paint = store(), apron = store();
  const halfL = HKS_PITCH_LENGTH / 2, halfW = HKS_PITCH_WIDTH / 2, stripes = 16;
  for (let i = 0; i < stripes; i++) {
    const x0 = -halfL + (2 * halfL) * i / stripes, x1 = -halfL + (2 * halfL) * (i + 1) / stripes;
    quad(turf, [x0, 0.10, -halfW], [x1, 0.10, -halfW], [x1, 0.10, halfW], [x0, 0.10, halfW], i % 2 ? HKS_COLOURS.grassStripe : HKS_COLOURS.grass);
  }
  // Perimeter running apron between the pitch and the first row.
  const oL = A0 - 0.4, oW = B0 - 0.4;
  for (const [x0, z0, x1, z1] of [[-oL, -oW, oL, -halfW], [-oL, halfW, oL, oW], [-oL, -halfW, -halfL, halfW], [halfL, -halfW, oL, halfW]]) {
    quad(apron, [x0, 0.06, z0], [x1, 0.06, z0], [x1, 0.06, z1], [x0, 0.06, z1], HKS_COLOURS.kerb);
  }
  const line = (x0, z0, x1, z1, width = 0.13) => {
    const dx = x1 - x0, dz = z1 - z0, length = Math.hypot(dx, dz); if (length < 1e-4) return;
    const nx = -dz / length * width * 0.5, nz = dx / length * width * 0.5;
    quad(paint, [x0 + nx, 0.145, z0 + nz], [x1 + nx, 0.145, z1 + nz], [x1 - nx, 0.145, z1 - nz], [x0 - nx, 0.145, z0 - nz], [0.95, 0.96, 0.93]);
  };
  line(-halfL, -halfW, halfL, -halfW); line(-halfL, halfW, halfL, halfW);
  line(-halfL, -halfW, -halfL, halfW); line(halfL, -halfW, halfL, halfW); line(0, -halfW, 0, halfW);
  for (let i = 0; i < 44; i++) {
    const a0 = i / 44 * Math.PI * 2, a1 = (i + 1) / 44 * Math.PI * 2;
    line(Math.cos(a0) * 9.15, Math.sin(a0) * 9.15, Math.cos(a1) * 9.15, Math.sin(a1) * 9.15, 0.13);
  }
  for (const s of [-1, 1]) {
    const gx = s * halfL;
    line(gx, -20.16, gx - s * 16.5, -20.16); line(gx, 20.16, gx - s * 16.5, 20.16); line(gx - s * 16.5, -20.16, gx - s * 16.5, 20.16);
    line(gx, -9.16, gx - s * 5.5, -9.16); line(gx, 9.16, gx - s * 5.5, 9.16); line(gx - s * 5.5, -9.16, gx - s * 5.5, 9.16);
  }
  meshStore(pitch, turf, materials.turf, 'HongKongStadiumNaturalGrassPitch');
  meshStore(pitch, apron, materials.apron, 'HongKongStadiumRunningApron');
  meshStore(pitch, paint, materials.paint, 'HongKongStadiumWhitePitchMarkings');
  const frames = [], nets = [];
  for (const s of [-1, 1]) {
    const x = s * (halfL - 0.1);
    for (const z of [-3.66, 3.66]) cylinder(frames, [x, 1.22, z], 0.07, 2.44, 8);
    box(frames, [x, 2.44, 0], [0.13, 0.13, 7.4]);
    for (let i = 0; i <= 8; i++) beam(nets, [x, 2.4, -3.66 + 7.32 * i / 8], [x - s * 1.1, 0.05, -3.66 + 7.32 * i / 8], 0.03);
  }
  merged(pitch, frames, materials.mast, 'HongKongStadiumGoalFrames');
  merged(pitch, nets, materials.net, 'HongKongStadiumGoalNets', false);
  stats.goals = 2;
  return pitch;
}

function buildBowl(group, materials, stats) {
  const bowl = new THREE.Group(); bowl.name = 'HongKongStadiumContinuousBowl'; group.add(bowl);
  const decks = store(), risers = store(), face = store();
  const green = store(), red = store();
  let seats = 0;
  for (let row = 0; row < HKS_BOWL_ROWS; row++) {
    const o0 = row * HKS_ROW_TREAD, o1 = o0 + HKS_ROW_TREAD;
    const yLow = HKS_FRONT_WALL + row * HKS_ROW_RISE, yHigh = yLow + HKS_ROW_RISE;
    rectQuad(decks, o0, o1, 0, yHigh, HKS_COLOURS.deck);
    rectQuad(risers, o0, o0, yLow, yHigh, [0.58, 0.58, 0.56]);
    // Seats march around the whole row, so the corners seat too (the real bowl is continuous).
    const a = A0 + o0 + 0.34, b = B0 + o0 + 0.34;
    const longCount = Math.floor((2 * a) / HKS_SEAT_PITCH), shortCount = Math.floor((2 * b) / HKS_SEAT_PITCH);
    for (const side of ['north', 'south']) {
      for (let i = 0; i < longCount; i++) {
        const x = -a + HKS_SEAT_PITCH * (i + 0.5);
        const colour = (row + Math.floor(i / 30)) % 2 ? (side === 'north' ? HKS_COLOURS.seatGreen : HKS_COLOURS.seatRed)
          : (side === 'north' ? HKS_COLOURS.seatRed : HKS_COLOURS.seatGreen);
        const target = colour === HKS_COLOURS.seatGreen ? green : red;
        seatQuad(target, x, side === 'north' ? -b : b, yHigh, side, colour); seats++;
      }
    }
    for (const side of ['east', 'west']) {
      for (let i = 0; i < shortCount; i++) {
        const z = -b + HKS_SEAT_PITCH * (i + 0.5);
        const colour = (row + Math.floor(i / 30)) % 2 ? HKS_COLOURS.seatGreen : HKS_COLOURS.seatRed;
        const target = colour === HKS_COLOURS.seatGreen ? green : red;
        seatQuad(target, side === 'east' ? a : -a, z, yHigh, side, colour); seats++;
      }
    }
  }
  // Pitch-side plinth, outer concrete wall, plinth band and horizontal reveals.
  const aO = HKS_OUTER_HALF_LENGTH, bO = HKS_OUTER_HALF_WIDTH, top = HKS_TIER_TOP + 1.2;
  quad(face, [-A0, 0, -B0], [A0, 0, -B0], [A0, HKS_FRONT_WALL, -B0], [-A0, HKS_FRONT_WALL, -B0], HKS_COLOURS.plinth);
  quad(face, [-A0, 0, B0], [A0, 0, B0], [A0, HKS_FRONT_WALL, B0], [-A0, HKS_FRONT_WALL, B0], HKS_COLOURS.plinth);
  quad(face, [-A0, 0, -B0], [-A0, 0, B0], [-A0, HKS_FRONT_WALL, B0], [-A0, HKS_FRONT_WALL, -B0], HKS_COLOURS.plinth);
  quad(face, [A0, 0, -B0], [A0, 0, B0], [A0, HKS_FRONT_WALL, B0], [A0, HKS_FRONT_WALL, -B0], HKS_COLOURS.plinth);
  quad(face, [-aO, 0, -bO], [aO, 0, -bO], [aO, top, -bO], [-aO, top, -bO], HKS_COLOURS.concrete);
  quad(face, [-aO, 0, bO], [aO, 0, bO], [aO, top, bO], [-aO, top, bO], HKS_COLOURS.concrete);
  quad(face, [aO, 0, -bO], [aO, 0, bO], [aO, top, bO], [aO, top, -bO], HKS_COLOURS.concrete);
  quad(face, [-aO, 0, -bO], [-aO, 0, bO], [-aO, top, bO], [-aO, top, -bO], HKS_COLOURS.concrete);
  const reveals = [];
  for (let i = 0; i < 6; i++) {
    const y = 3.2 + i * 3.1;
    if (y > top - 1) break;
    for (const [cx, cz, w, d] of [[0, -bO - 0.06, 2 * aO, 0.18], [0, bO + 0.06, 2 * aO, 0.18], [aO + 0.06, 0, 0.18, 2 * bO], [-aO - 0.06, 0, 0.18, 2 * bO]]) {
      box(reveals, [cx, y, cz], [w, 0.12, d]);
    }
  }
  { const [cx, cz, w, d] = [0, -bO - 0.05, 2 * aO, 0.2]; box(reveals, [cx, 1.6, cz], [w, 3.2, d]); box(reveals, [cx, 1.6, bO + 0.05], [w, 3.2, 0.2]); }
  { const [cx, cz, w, d] = [aO + 0.05, 0, 0.2, 2 * bO]; box(reveals, [cx, 1.6, cz], [w, 3.2, d]); box(reveals, [-aO - 0.05, 1.6, 0], [0.2, 3.2, 2 * bO]); }
  meshStore(bowl, decks, materials.deck, 'HongKongStadiumBowlTreads');
  meshStore(bowl, risers, materials.deck, 'HongKongStadiumBowlRisers');
  meshStore(bowl, face, materials.concrete, 'HongKongStadiumBowlPlinthAndOuterWalls');
  merged(bowl, reveals, materials.concrete, 'HongKongStadiumOuterWallRevealsAndPlinthBand');
  meshStore(bowl, green, materials.seatGreen, 'HongKongStadiumGreenSeatShells');
  meshStore(bowl, red, materials.seatRed, 'HongKongStadiumRedSeatShells');
  stats.seats = seats;
  return { seats, top };
}

function archGeometry(target, x, z0, z1, baseY, apexY, width) {
  // A shallow circular arc in the z-y plane, doubled into a lattice rib.
  const segments = 22, points = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, z = lerp(z0, z1, t);
    const y = baseY + (apexY - baseY) * Math.sin(Math.PI * t) ** 0.85;
    points.push([x, y, z]);
  }
  for (let i = 0; i < segments; i++) {
    beam(target.outline, points[i], points[i + 1], width);
    if (i % 2 === 0) beam(target.lattice, points[i], [x + width * 0.9, points[i][1] + 0.9, points[i][2]], width * 0.45);
    if (i > 0) beam(target.lattice, points[i - 1], points[i + 1], width * 0.4);
  }
  return points;
}

function buildRoofs(group, materials, stats) {
  const roofs = new THREE.Group(); roofs.name = 'HongKongStadiumTwinTensileMembraneRoofs'; group.add(roofs);
  const membrane = store();
  const archOutline = [], archLattice = [], fascia = [];
  const aO = HKS_OUTER_HALF_LENGTH;
  const yBack = HKS_ROOF_APEX, yFront = HKS_ROOF_SPRING + 7.0;
  for (const side of [-1, 1]) {
    // Ruled membrane: high along the back edge above the arch, sweeping down and outboard to a cantilevered
    // front eave that oversails the top row by HKS_ROOF_CANTILEVER metres.
    const zBack = side * (B0 + HKS_STAND_DEPTH + 0.6), zFront = side * (B0 - HKS_ROOF_CANTILEVER);
    const rows = 12, cols = 34;
    const point = (u, v) => {
      const x = lerp(-aO + 1.8, aO - 1.8, u);
      const z = lerp(zBack, zFront, v);
      // Transverse camber makes the free edges lift, which is what gives the roof its wing-like curl.
      const camber = 2.4 * Math.sin(Math.PI * u);
      const y = yBack - (yBack - yFront) * Math.pow(v, 1.75) + camber;
      return [x, y, z];
    };
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const u0 = c / cols, u1 = (c + 1) / cols, v0 = r / rows, v1 = (r + 1) / rows;
      quad(membrane, point(u0, v0), point(u1, v0), point(u1, v1), point(u0, v1),
        tintMembrane(u0, v0));
    }
    // Pale edge fascia along the cantilevered front eave and both free ends, so the membrane reads as a roof
    // rather than a floating sheet.
    for (let c = 0; c < cols; c++) {
      const u0 = c / cols, u1 = (c + 1) / cols;
      const p0 = point(u0, 1), p1 = point(u1, 1);
      beam(fascia, [p0[0], p0[1] - 0.28, p0[2]], [p1[0], p1[1] - 0.28, p1[2]], 0.42, 0.5);
    }
    for (const u of [0, 1]) {
      for (let r = 0; r < rows; r++) {
        const p0 = point(u, r / rows), p1 = point(u, (r + 1) / rows);
        beam(fascia, [p0[0], p0[1] - 0.26, p0[2]], [p1[0], p1[1] - 0.26, p1[2]], 0.36, 0.44);
      }
    }
    for (let i = 0; i < HKS_ARCHES_PER_ROOF; i++) {
      const x = (i === 0 ? -1 : 1) * aO * 0.50;
      archGeometry({ outline: archOutline, lattice: archLattice }, x,
        side * (B0 - HKS_ROOF_CANTILEVER + 1.0), side * (B0 + HKS_STAND_DEPTH + HKS_ARCH_LEG_OFFSET),
        5.0, HKS_ROOF_APEX + 3.6, 0.62);
    }
  }
  meshStore(roofs, membrane, materials.membrane, 'HongKongStadiumWhiteMembraneRoofs');
  merged(roofs, fascia, materials.arch, 'HongKongStadiumRoofEdgeFascia');
  merged(roofs, archOutline, materials.arch, 'HongKongStadiumWhiteTubularArches');
  merged(roofs, archLattice, materials.arch, 'HongKongStadiumArchLatticeBracing');
  stats.roofs = HKS_ROOF_COUNT;
  stats.arches = HKS_ROOF_COUNT * HKS_ARCHES_PER_ROOF;
  return { group: roofs, apex: HKS_ROOF_APEX };
}

// Membrane shading: slightly darker towards the back where the fabric is in the arch's shadow.
function tintMembrane(u, v) {
  const shade = 0.90 + 0.06 * (1 - v) - 0.04 * Math.abs(u - 0.5);
  return [shade, shade, shade * 0.98];
}

function buildFloodlights(group, materials, stats) {
  const lights = new THREE.Group(); lights.name = 'HongKongStadiumArchCrownFloodlights'; group.add(lights);
  const steel = [], lamps = [];
  const aO = HKS_OUTER_HALF_LENGTH, bO = HKS_OUTER_HALF_WIDTH;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * aO * 0.87, z = sz * bO * 0.55;
    cylinder(steel, [x, HKS_FLOODLIGHT_HEIGHT / 2, z], 0.42, HKS_FLOODLIGHT_HEIGHT, 10, 0.24);
    const bank = new THREE.BoxGeometry(7.4, 1.5, 0.6); bank.rotateX(sz > 0 ? -0.5 : 0.5); bank.translate(x, HKS_FLOODLIGHT_HEIGHT + 0.3, z);
    lamps.push(bank);
    box(steel, [x, 0.4, z], [2.2, 0.8, 2.2]);
  }
  merged(lights, steel, materials.mast, 'HongKongStadiumFloodlightMasts');
  merged(lights, lamps, materials.floodlight, 'HongKongStadiumFloodlightLampBanks', false);
  stats.floodlights = 4;
  return lights;
}

function ringShapeGeometry(ring, y) {
  const shape = new THREE.Shape();
  for (let i = 0; i < ring.length - 2; i += 2) { if (i === 0) shape.moveTo(ring[i], -ring[i + 1]); else shape.lineTo(ring[i], -ring[i + 1]); }
  shape.closePath(); const geometry = new THREE.ShapeGeometry(shape); geometry.rotateX(-Math.PI / 2); geometry.translate(0, y, 0); return geometry;
}

function buildSiteWorks(group, materials, stats) {
  const site = new THREE.Group(); site.name = 'HongKongStadiumSoKonPoSiteWorks'; group.add(site);
  const ring = HONG_KONG_STADIUM_SITE.localRing;
  const surface = new THREE.Mesh(ringShapeGeometry(ring, 0.04), materials.site);
  surface.name = 'HongKongStadiumExactOsmSiteSurface'; surface.receiveShadow = true; site.add(surface);
  const fence = [], planters = [], leaves = [];
  let posts = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const ax = ring[edge * 2], az = ring[edge * 2 + 1], bx = ring[edge * 2 + 2], bz = ring[edge * 2 + 3];
    const length = Math.hypot(bx - ax, bz - az); if (length < 4) continue;
    const steps = Math.max(1, Math.round(length / 3.2));
    for (let step = 0; step < steps; step++) {
      box(fence, [ax + (bx - ax) * (step + 0.5) / steps, 1.1, az + (bz - az) * (step + 0.5) / steps], [0.09, 2.2, 0.09]);
      posts++;
    }
    beam(fence, [ax, 2.15, az], [bx, 2.15, bz], 0.07);
  }
  let trees = 0;
  for (const sz of [-1, 1]) for (let i = 0; i < 5; i++) {
    const x = -HKS_OUTER_HALF_LENGTH - 8 + i * 16, z = sz * (HKS_OUTER_HALF_WIDTH + 8 + (i % 2) * 7);
    box(planters, [x, 0.35, z], [4.6, 0.7, 4.6]);
    cylinder(leaves, [x, 3.6, z], 0.24, 5.8, 8);
    for (let k = 0; k < 3; k++) {
      const canopy = new THREE.SphereGeometry(2.9 - k * 0.6, 10, 7);
      canopy.translate(x, 5.7 + k * 1.6, z); leaves.push(canopy);
    }
    trees++;
  }
  merged(site, fence, materials.fence, 'HongKongStadiumPerimeterRailing');
  merged(site, planters, materials.concrete, 'HongKongStadiumSitePlanters');
  merged(site, leaves, materials.leaves, 'HongKongStadiumSiteTrees');
  stats.fencePosts = posts; stats.siteTrees = trees;
  return site;
}

export function buildHongKongStadium(root, { groundOffset = 0 } = {}) {
  const complex = new THREE.Group();
  complex.name = 'HongKongStadium';
  complex.userData.landmark = 'hong-kong-stadium';
  complex.userData.osm = { type: 'way', id: HONG_KONG_STADIUM_OSM_SOURCE.id };
  complex.position.set(HONG_KONG_STADIUM_SITE.x, groundOffset, HONG_KONG_STADIUM_SITE.z);
  complex.rotation.y = HONG_KONG_STADIUM_SITE.ry;
  root.add(complex);

  const palette = harbourCityPalette({ stone: [0.7, 0.7, 0.67], paleStone: [0.8, 0.8, 0.77], roughness: 0.74 });
  const vertexFlat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.02, side: THREE.DoubleSide });
  vertexFlat.colorNode = attribute('color');
  const turf = vertexFlat.clone(); turf.roughness = 0.96; turf.colorNode = attribute('color');
  const paint = vertexFlat.clone(); paint.roughness = 0.62; paint.colorNode = attribute('color');
  const apron = vertexFlat.clone(); apron.roughness = 0.82; apron.colorNode = attribute('color');
  const deck = vertexFlat.clone(); deck.roughness = 0.86; deck.colorNode = attribute('color');
  const seatGreen = vertexFlat.clone(); seatGreen.roughness = 0.6; seatGreen.colorNode = attribute('color');
  const seatRed = vertexFlat.clone(); seatRed.roughness = 0.6; seatRed.colorNode = attribute('color');
  const membrane = new THREE.MeshStandardMaterial({ color: 0xf0f0e9, roughness: 0.8, metalness: 0.02, side: THREE.DoubleSide });
  membrane.emissiveNode = color(1, 0.94, 0.8).mul(nightAmount()).mul(0.18);
  const arch = new THREE.MeshStandardMaterial({ color: 0xe6e8e3, roughness: 0.4, metalness: 0.45, side: THREE.DoubleSide });
  const concrete = new THREE.MeshStandardMaterial({ color: 0xccccc6, roughness: 0.85, metalness: 0.03, side: THREE.DoubleSide });
  const mast = new THREE.MeshStandardMaterial({ color: 0xdfe1dc, roughness: 0.45, metalness: 0.4 });
  const net = new THREE.MeshStandardMaterial({ color: 0xdadedb, roughness: 0.9, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
  const floodlight = new THREE.MeshStandardNodeMaterial({ color: 0xf7f3e4 });
  floodlight.emissiveNode = color(1, 0.96, 0.85).mul(nightAmount()).mul(1.8);
  const fence = new THREE.MeshStandardMaterial({ color: 0x98a09d, roughness: 0.5, metalness: 0.5 });
  const leaves = new THREE.MeshStandardMaterial({ color: 0x3d6039, roughness: 0.94 });
  const site = new THREE.MeshStandardMaterial({ color: 0x8b8e86, roughness: 0.9, side: THREE.DoubleSide });
  const materials = {
    turf, paint, apron, deck, seatGreen, seatRed, membrane, arch, concrete, mast, net, floodlight, fence, leaves, site,
    white: palette.white,
  };

  const stats = {
    hongKongStadiumOsmWay: HONG_KONG_STADIUM_OSM_SOURCE.id,
    hongKongStadiumOsmVersion: HONG_KONG_STADIUM_OSM_SOURCE.version,
  };
  buildSiteWorks(complex, materials, stats);
  buildPitch(complex, materials, stats);
  const bowl = buildBowl(complex, materials, stats);
  buildRoofs(complex, materials, stats);
  buildFloodlights(complex, materials, stats);

  const colliders = [];
  const aO = HKS_OUTER_HALF_LENGTH, bO = HKS_OUTER_HALF_WIDTH, top = HKS_TIER_TOP + 1.2;
  colliders.push(harbourCityLocalCollider(HONG_KONG_STADIUM_SITE, 0, -(bO - HKS_STAND_DEPTH / 2), 2 * aO, HKS_STAND_DEPTH, groundOffset, groundOffset + top));
  colliders.push(harbourCityLocalCollider(HONG_KONG_STADIUM_SITE, 0, bO - HKS_STAND_DEPTH / 2, 2 * aO, HKS_STAND_DEPTH, groundOffset, groundOffset + top));
  colliders.push(harbourCityLocalCollider(HONG_KONG_STADIUM_SITE, aO - HKS_STAND_DEPTH / 2, 0, HKS_STAND_DEPTH, 2 * (bO - HKS_STAND_DEPTH), groundOffset, groundOffset + top));
  colliders.push(harbourCityLocalCollider(HONG_KONG_STADIUM_SITE, -(aO - HKS_STAND_DEPTH / 2), 0, HKS_STAND_DEPTH, 2 * (bO - HKS_STAND_DEPTH), groundOffset, groundOffset + top));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    colliders.push(harbourCityLocalCollider(HONG_KONG_STADIUM_SITE, sx * aO * 0.87, sz * bO * 0.55, 2.2, 2.2, groundOffset, groundOffset + HKS_FLOODLIGHT_HEIGHT));
  }

  Object.assign(stats, {
    hongKongStadiumGroundOffset: groundOffset,
    hongKongStadiumLandmarks: 1,
    hongKongStadiumInventoryId: 'HK-B0102',
    hongKongStadiumRingArea: HONG_KONG_STADIUM_SITE.ringArea,
    hongKongStadiumPitchLength: HKS_PITCH_LENGTH,
    hongKongStadiumPitchWidth: HKS_PITCH_WIDTH,
    hongKongStadiumPitchSurface: HKS_PITCH_SURFACE,
    hongKongStadiumApron: HKS_APRON,
    hongKongStadiumSeatShells: bowl.seats,
    hongKongStadiumSeatCapacity: HKS_SEATS,
    hongKongStadiumSeatPitch: HKS_SEAT_PITCH,
    hongKongStadiumRows: HKS_BOWL_ROWS,
    hongKongStadiumTierTop: HKS_TIER_TOP,
    hongKongStadiumStandDepth: HKS_STAND_DEPTH,
    hongKongStadiumRoofCount: HKS_ROOF_COUNT,
    hongKongStadiumArches: HKS_ROOF_COUNT * HKS_ARCHES_PER_ROOF,
    hongKongStadiumRoofApex: HKS_ROOF_APEX,
    hongKongStadiumRoofSpring: HKS_ROOF_SPRING,
    hongKongStadiumRoofCantilever: HKS_ROOF_CANTILEVER,
    hongKongStadiumArchLegOffset: HKS_ARCH_LEG_OFFSET,
    hongKongStadiumFloodlightHeight: HKS_FLOODLIGHT_HEIGHT,
    hongKongStadiumRebuildYear: HKS_REBUILD_YEAR,
    hongKongStadiumOriginalYear: HKS_ORIGINAL_YEAR,
    hongKongStadiumResearchSources: HKS_RESEARCH_SOURCES.length,
    hongKongStadiumColliders: colliders.length,
    hongKongStadiumComponents: 4,
  });

  const landmarks = [{
    id: 'hong-kong-stadium', name: '香港大球場 · Hong Kong Stadium',
    position: { x: HONG_KONG_STADIUM_SITE.x, y: groundOffset, z: HONG_KONG_STADIUM_SITE.z },
    radius: 190, height: HKS_ROOF_APEX + 3.4, components: 1,
  }];

  return {
    group: complex,
    colliders,
    landmarks,
    stats,
    groundOffset,
    roofApex: HKS_ROOF_APEX,
    groundHeightAt(x, z, fallback) {
      const dx = x - HONG_KONG_STADIUM_SITE.x, dz = z - HONG_KONG_STADIUM_SITE.z;
      const cs = Math.cos(HONG_KONG_STADIUM_SITE.ry), sn = Math.sin(HONG_KONG_STADIUM_SITE.ry);
      const lx = cs * dx - sn * dz, lz = sn * dx + cs * dz;
      if (Math.abs(lx) <= aO + 2 && Math.abs(lz) <= bO + 2) return Math.max(fallback, groundOffset);
      return hongKongStadiumTerrainHeightAt(x, z, fallback, groundOffset);
    },
  };
}
