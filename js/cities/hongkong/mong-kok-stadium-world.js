// HK-B0101: Mong Kok Stadium (旺角大球場) — single-tier 6,700-seat football bowl on the exact OSM block at
// 37 Flower Market Road, with seven white tensile sails over the main stand, orange / dark-blue seat rows,
// corner floodlight pylons, the southern LED screen and the real OSM entrance nodes used as gates.
import * as THREE from 'three/webgpu';
import { attribute, color } from 'three/tsl';
import {
  MONG_KOK_STADIUM_SITE, MONG_KOK_STADIUM_OSM_SOURCE, MONG_KOK_ENTRANCES, MONG_KOK_BOWL,
  MONG_KOK_PITCH_LENGTH, MONG_KOK_PITCH_WIDTH, MONG_KOK_APRON, MONG_KOK_BOWL_HALF_LENGTH, MONG_KOK_BOWL_HALF_WIDTH,
  MONG_KOK_MAIN_STAND_DEPTH, MONG_KOK_MAIN_STAND_TOP, MONG_KOK_SIDE_STAND_DEPTH, MONG_KOK_SIDE_STAND_TOP,
  MONG_KOK_SOUTH_STAND_DEPTH, MONG_KOK_SOUTH_STAND_TOP, MONG_KOK_SAIL_COUNT, MONG_KOK_SAIL_SPAN, MONG_KOK_SAIL_DEPTH,
  MONG_KOK_SAIL_PEAK, MONG_KOK_SAIL_RIM, MONG_KOK_FLOODLIGHT_HEIGHT, MONG_KOK_FLOODLIGHT_COUNT,
  MONG_KOK_SCREEN_WIDTH, MONG_KOK_SCREEN_HEIGHT, MONG_KOK_SCREEN_BASE, MONG_KOK_SEATS, MONG_KOK_RECONSTRUCTION_YEAR,
  MONG_KOK_ORIGINAL_YEAR, MONG_KOK_COLOURS, MONG_KOK_RESEARCH_SOURCES, mongKokStadiumTerrainHeightAt,
} from './mong-kok-stadium-architecture.js';
import {
  merged, box, cylinder, beam, store, quad, meshStore, harbourCityPalette, nightAmount,
} from './harbour-city-world-utils.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';

const H = MONG_KOK_BOWL_HALF_LENGTH, W = MONG_KOK_BOWL_HALF_WIDTH;
const SIDES = ['north', 'south', 'east', 'west'];

// Local-frame helper: the bowl is aligned with the OSM minimum-area box, so a side is just a rectangle in
// (along, across) coordinates measured from the pitch touchline.
function sideRect(side) {
  if (side === 'north') return { along: 'x', sign: -1, front: W, rows: MONG_KOK_BOWL.north, top: MONG_KOK_MAIN_STAND_TOP };
  if (side === 'south') return { along: 'x', sign: 1, front: W, rows: MONG_KOK_BOWL.south, top: MONG_KOK_SOUTH_STAND_TOP };
  if (side === 'east') return { along: 'z', sign: 1, front: H, rows: MONG_KOK_BOWL.east, top: MONG_KOK_SIDE_STAND_TOP };
  return { along: 'z', sign: -1, front: H, rows: MONG_KOK_BOWL.west, top: MONG_KOK_SIDE_STAND_TOP };
}
function seatColour(side, row, seat) {
  // Photographs show orange shells on the lower courses of the long stands and dark blue above / at the ends;
  // the pattern is deterministic so the same seam layout is reproduced on every build.
  const band = side === 'north' ? (row < 9 ? 'orange' : 'blue') : side === 'south' ? (row < 7 ? 'orange' : 'blue')
    : (row < 5 ? 'blue' : 'orange');
  const flip = (row + Math.floor(seat / 24)) % 2 === 1;
  return flip ? (band === 'orange' ? 'blue' : 'orange') : band;
}
// The bowl holds 6,700 seats, so each stand gets a fixed share of that capacity and the seat pitch is derived
// from it. That keeps the modelled seat shells and the published capacity the same number.
export const MONG_KOK_SEAT_SHARES = Object.freeze({ north: 0.40, south: 0.30, east: 0.15, west: 0.15 });
function seatRun(side) { const rect = sideRect(side); return rect.along === 'x' ? H : W; }
function seatsPerRow(side) {
  const target = Math.round(MONG_KOK_SEATS * MONG_KOK_SEAT_SHARES[side]);
  return Math.max(1, Math.round(target / MONG_KOK_BOWL[side].rows));
}

function buildPitch(group, materials, stats) {
  const bowl = new THREE.Group(); bowl.name = 'MongKokStadiumPitchAndApron'; group.add(bowl);
  const turf = store(), kerbs = store(), paint = store();
  const halfL = MONG_KOK_PITCH_LENGTH / 2, halfW = MONG_KOK_PITCH_WIDTH / 2;
  const stripes = 14;
  for (let i = 0; i < stripes; i++) {
    const x0 = -halfL + (2 * halfL) * i / stripes, x1 = -halfL + (2 * halfL) * (i + 1) / stripes;
    const tint = i % 2 ? MONG_KOK_COLOURS.turfStripe : MONG_KOK_COLOURS.turf;
    quad(turf, [x0, 0.10, -halfW], [x1, 0.10, -halfW], [x1, 0.10, halfW], [x0, 0.10, halfW], tint);
  }
  // Rubberised perimeter and the kerb between apron and stands.
  const outerL = H - 0.4, outerW = W - 0.4;
  const ring = [
    [-outerL, -outerW, outerL, -halfW], [-outerL, halfW, outerL, outerW],
    [-outerL, -halfW, -halfL, halfW], [halfL, -halfW, outerL, halfW],
  ];
  for (const [x0, z0, x1, z1] of ring) quad(kerbs, [x0, 0.06, z0], [x1, 0.06, z0], [x1, 0.06, z1], [x0, 0.06, z1], MONG_KOK_COLOURS.kerb);
  // White markings.
  const line = (x0, z0, x1, z1, width = 0.12) => {
    const dx = x1 - x0, dz = z1 - z0, length = Math.hypot(dx, dz); if (length < 1e-4) return;
    const nx = -dz / length * width * 0.5, nz = dx / length * width * 0.5;
    quad(paint, [x0 + nx, 0.145, z0 + nz], [x1 + nx, 0.145, z1 + nz], [x1 - nx, 0.145, z1 - nz], [x0 - nx, 0.145, z0 - nz], [0.94, 0.95, 0.92]);
  };
  line(-halfL, -halfW, halfL, -halfW); line(-halfL, halfW, halfL, halfW);
  line(-halfL, -halfW, -halfL, halfW); line(halfL, -halfW, halfL, halfW);
  line(0, -halfW, 0, halfW);
  const circle = (cx, cz, radius, segments = 40) => {
    for (let i = 0; i < segments; i++) {
      const a0 = i / segments * Math.PI * 2, a1 = (i + 1) / segments * Math.PI * 2;
      line(cx + Math.cos(a0) * radius, cz + Math.sin(a0) * radius, cx + Math.cos(a1) * radius, cz + Math.sin(a1) * radius, 0.12);
    }
  };
  circle(0, 0, 9.15);
  // Penalty and goal areas at both ends.
  for (const s of [-1, 1]) {
    const goalX = s * halfL;
    line(goalX, -20.16, goalX - s * 16.5, -20.16); line(goalX, 20.16, goalX - s * 16.5, 20.16);
    line(goalX - s * 16.5, -20.16, goalX - s * 16.5, 20.16);
    line(goalX, -9.16, goalX - s * 5.5, -9.16); line(goalX, 9.16, goalX - s * 5.5, 9.16);
    line(goalX - s * 5.5, -9.16, goalX - s * 5.5, 9.16);
    quad(paint, [goalX - s * 11, 0.145, -0.22], [goalX - s * 11.22, 0.145, -0.22], [goalX - s * 11.22, 0.145, 0.22], [goalX - s * 11, 0.145, 0.22], [0.94, 0.95, 0.92]);
  }
  meshStore(bowl, turf, materials.turf, 'MongKokStadiumStripedArtificialTurf');
  meshStore(bowl, kerbs, materials.apron, 'MongKokStadiumRubberisedPerimeterApron');
  meshStore(bowl, paint, materials.paint, 'MongKokStadiumWhitePitchMarkings');
  // Goals, nets and corner flags.
  const frame = [], net = [], flags = [];
  for (const s of [-1, 1]) {
    const x = s * (halfL - 0.1);
    for (const z of [-3.66, 3.66]) cylinder(frame, [x, 1.22, z], 0.06, 2.44, 8);
    box(frame, [x, 2.44, 0], [0.12, 0.12, 7.4]);
    for (let i = 0; i <= 6; i++) {
      const z = -3.66 + 7.32 * i / 6;
      beam(net, [x, 2.40, z], [x - s * 1.0, 0.05, z], 0.03);
    }
    for (const z of [-3.66, 3.66]) beam(net, [x, 2.40, z], [x - s * 1.0, 0.05, z], 0.03);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    cylinder(flags, [sx * halfL, 0.78, sz * halfW], 0.05, 1.55, 8);
    box(flags, [sx * (halfL - 0.35), 1.35, sz * halfW], [0.7, 0.45, 0.03]);
  }
  merged(bowl, frame, materials.mast, 'MongKokStadiumGoalFrames');
  merged(bowl, net, materials.net, 'MongKokStadiumGoalNets', false);
  merged(bowl, flags, materials.mast, 'MongKokStadiumCornerFlags');
  stats.goalFrames = 2;
  return bowl;
}

function buildStand(side, group, materials, standStats) {
  const rect = sideRect(side), { rows, tread, rise, frontWall } = rect.rows;
  const label = `${side[0].toUpperCase()}${side.slice(1)}`;
  const stand = new THREE.Group(); stand.name = `MongKokStadium${label}Stand`;
  group.add(stand);
  const decks = store(), risers = store(), face = store(), orange = [], blue = [], rails = [], reveals = [];
  const along = seatRun(side), perRow = seatsPerRow(side), pitch = (2 * along) / perRow;
  let seats = 0;
  const toLocal = (a, across, y) => (rect.along === 'x' ? [a, y, rect.sign * across] : [rect.sign * across, y, a]);
  for (let row = 0; row < rows; row++) {
    const a0 = rect.front + row * tread, a1 = a0 + tread;
    const yLow = frontWall + row * rise, yHigh = yLow + rise;
    quad(decks, toLocal(-along, a0, yHigh), toLocal(along, a0, yHigh), toLocal(along, a1, yHigh), toLocal(-along, a1, yHigh), MONG_KOK_COLOURS.deck);
    quad(risers, toLocal(-along, a0, yLow), toLocal(along, a0, yLow), toLocal(along, a0, yHigh), toLocal(-along, a0, yHigh), [0.58, 0.59, 0.57]);
    for (let seat = 0; seat < perRow; seat++) {
      const a = -along + pitch * (seat + 0.5);
      const target = seatColour(side, row, seat) === 'orange' ? orange : blue;
      const [cx, , cz] = toLocal(a, a1 - 0.24, yHigh + 0.21);
      box(target, [cx, yHigh + 0.21, cz], [0.42, 0.40, 0.42]);
      seats++;
    }
  }
  const backAcross = rect.front + rows * tread;
  // Pitch-side plinth and the outer concourse face of the stand.
  quad(face, toLocal(-along, rect.front, 0), toLocal(along, rect.front, 0), toLocal(along, rect.front, frontWall), toLocal(-along, rect.front, frontWall), MONG_KOK_COLOURS.plinth);
  quad(face, toLocal(-along, backAcross, 0), toLocal(along, backAcross, 0), toLocal(along, backAcross, rect.top + 1.1), toLocal(-along, backAcross, rect.top + 1.1), MONG_KOK_COLOURS.concourse);
  for (let i = 0; i < 4; i++) {
    const y = 2.4 + i * 1.7, [cx, , cz] = toLocal(0, backAcross + 0.06, y);
    box(reveals, [cx, y, cz], [2 * along, 0.10, 0.16]);
  }
  { const [cx, , cz] = toLocal(0, backAcross + 0.05, 1.15); box(reveals, [cx, 1.15, cz], [2 * along, 2.3, 0.2]); }
  { const [cx, , cz] = toLocal(0, backAcross - 0.12, rect.top + 1.0); box(rails, [cx, rect.top + 1.0, cz], [2 * along, 0.06, 0.06]); }
  for (let a = -along; a <= along; a += 2.2) {
    const [px, , pz] = toLocal(a, backAcross - 0.12, rect.top + 0.5);
    box(rails, [px, rect.top + 0.5, pz], [0.05, 1.0, 0.05]);
  }
  // Solid end walls close the tier, so the seat rows never read as a floating ribbon in elevation.
  for (const end of [-along, along]) {
    quad(face, toLocal(end, rect.front, 0), toLocal(end, backAcross, 0),
      toLocal(end, backAcross, rect.top + 1.1), toLocal(end, rect.front, frontWall), MONG_KOK_COLOURS.concourse);
  }
  // Concourse landing behind the last row, used by the entrance gates.
  { const [cx, , cz] = toLocal(0, backAcross + 1.4, 0); box(reveals, [cx, 0.05, cz], [2 * along, 0.14, 2.8]); }
  meshStore(stand, decks, materials.deck, `MongKokStadium${label}StandTreads`);
  meshStore(stand, risers, materials.deck, `MongKokStadium${label}StandRisers`);
  meshStore(stand, face, materials.concrete, `MongKokStadium${label}StandPlinthAndOuterFace`);
  merged(stand, reveals, materials.concrete, `MongKokStadium${label}StandRevealsAndConcourse`);
  merged(stand, rails, materials.mast, `MongKokStadium${label}StandBackRail`);
  merged(stand, orange, materials.seatOrange, `MongKokStadium${label}StandOrangeSeats`);
  merged(stand, blue, materials.seatBlue, `MongKokStadium${label}StandBlueSeats`);
  standStats[side] = { seats, rows, top: rect.top, depth: rows * tread, seatsPerRow: perRow };
  return { seats, top: rect.top, backAcross, along };
}

function buildSails(group, materials, stats) {
  const sails = new THREE.Group(); sails.name = 'MongKokStadiumTensileSailCanopies'; group.add(sails);
  const membrane = [], masts = [], cables = [];
  const backAcross = W + MONG_KOK_MAIN_STAND_DEPTH;
  const span = MONG_KOK_SAIL_SPAN, gap = (2 * MONG_KOK_BOWL_HALF_LENGTH - MONG_KOK_SAIL_COUNT * span) / (MONG_KOK_SAIL_COUNT + 1);
  for (let i = 0; i < MONG_KOK_SAIL_COUNT; i++) {
    const cx = -MONG_KOK_BOWL_HALF_LENGTH + gap * (i + 1) + span * (i + 0.5);
    const cz = -(W + MONG_KOK_MAIN_STAND_DEPTH * 0.55);
    const rise = MONG_KOK_SAIL_PEAK - MONG_KOK_SAIL_RIM;
    // Inverted cone: apex on the mast, eaves springing down to the stand edges.
    const geometry = new THREE.ConeGeometry(1, 1, 12, 1, true);
    geometry.scale(span * 0.52, rise, MONG_KOK_SAIL_DEPTH * 0.5);
    geometry.translate(cx, MONG_KOK_SAIL_RIM + rise * 0.5, cz);
    membrane.push(geometry);
    // Mast through the apex plus four tie-down cables to the eaves.
    cylinder(masts, [cx, (MONG_KOK_SAIL_PEAK + MONG_KOK_SAIL_RIM * 0.4) / 2, cz], 0.16, MONG_KOK_SAIL_PEAK - MONG_KOK_SAIL_RIM * 0.4, 10);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      beam(cables, [cx, MONG_KOK_SAIL_PEAK - 0.1, cz],
        [cx + dx * span * 0.5, MONG_KOK_SAIL_RIM, cz + dz * MONG_KOK_SAIL_DEPTH * 0.48], 0.045);
    }
  }
  // Eave purlins along the stand tie the seven sails together.
  for (const z of [-(W + 0.4), -(W + MONG_KOK_MAIN_STAND_DEPTH)]) {
    beam(cables, [-MONG_KOK_BOWL_HALF_LENGTH + 1, MONG_KOK_SAIL_RIM, z], [MONG_KOK_BOWL_HALF_LENGTH - 1, MONG_KOK_SAIL_RIM, z], 0.16);
  }
  merged(sails, membrane, materials.sail, 'MongKokStadiumSevenWhiteTensileSails');
  merged(sails, masts, materials.mast, 'MongKokStadiumWhiteSailMasts');
  merged(sails, cables, materials.mast, 'MongKokStadiumSailTieDownCablesAndPurlins');
  stats.sails = MONG_KOK_SAIL_COUNT;
  return { group: sails, span, gap, peak: MONG_KOK_SAIL_PEAK };
}

function buildFloodlights(group, materials, stats) {
  const pylons = new THREE.Group(); pylons.name = 'MongKokStadiumCornerFloodlightPylons'; group.add(pylons);
  const steel = [], lamps = [];
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (const [sx, sz] of corners) {
    const x = sx * (H + 6), z = sz * (W + MONG_KOK_MAIN_STAND_DEPTH + 3);
    cylinder(steel, [x, MONG_KOK_FLOODLIGHT_HEIGHT / 2, z], 0.34, MONG_KOK_FLOODLIGHT_HEIGHT, 10, 0.20);
    box(steel, [x, MONG_KOK_FLOODLIGHT_HEIGHT - 0.4, z], [3.6, 0.22, 0.22], Math.atan2(sx * sz, 1) * 0.4);
    for (const dx of [-1.2, 1.2]) {
      const bank = new THREE.BoxGeometry(2.2, 1.1, 0.35);
      bank.rotateX(-0.42); bank.translate(x + dx, MONG_KOK_FLOODLIGHT_HEIGHT + 0.35, z + (sz > 0 ? -0.5 : 0.5));
      lamps.push(bank);
    }
    // Tripod base is a small collidable footprint, so cars cannot clip through a pylon.
    box(steel, [x, 0.35, z], [1.8, 0.7, 1.8]);
  }
  merged(pylons, steel, materials.mast, 'MongKokStadiumFloodlightMastsAndCrossArms');
  merged(pylons, lamps, materials.floodlight, 'MongKokStadiumFloodlightLampBanks', false);
  stats.floodlights = MONG_KOK_FLOODLIGHT_COUNT;
  return corners.map(([sx, sz]) => ({ x: sx * (H + 6), z: sz * (W + MONG_KOK_MAIN_STAND_DEPTH + 3) }));
}

function buildScreen(group, materials, stats) {
  const screen = new THREE.Group(); screen.name = 'MongKokStadiumSouthernLedScreen'; group.add(screen);
  const steel = [];
  const z = W + MONG_KOK_SOUTH_STAND_DEPTH + 1.2;
  for (const dx of [-4.6, 4.6]) cylinder(steel, [dx, MONG_KOK_SCREEN_BASE / 2, z], 0.22, MONG_KOK_SCREEN_BASE, 8);
  box(steel, [0, MONG_KOK_SCREEN_BASE + 0.15, z], [MONG_KOK_SCREEN_WIDTH + 0.6, 0.3, 0.5]);
  box(steel, [0, MONG_KOK_SCREEN_BASE + MONG_KOK_SCREEN_HEIGHT + 0.1, z], [MONG_KOK_SCREEN_WIDTH + 0.6, 0.3, 0.5]);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(MONG_KOK_SCREEN_WIDTH, MONG_KOK_SCREEN_HEIGHT), materials.screen);
  panel.position.set(0, MONG_KOK_SCREEN_BASE + MONG_KOK_SCREEN_HEIGHT / 2, z + 0.3); panel.rotation.y = Math.PI;
  panel.name = 'MongKokStadiumLedScreenPanel'; screen.add(panel);
  merged(screen, steel, materials.darkMetal, 'MongKokStadiumLedScreenSupportFrame');
  stats.screenWidth = MONG_KOK_SCREEN_WIDTH; stats.screenHeight = MONG_KOK_SCREEN_HEIGHT;
  return { z, width: MONG_KOK_SCREEN_WIDTH };
}

function buildEntranceGates(group, materials, base, stats) {
  const gates = new THREE.Group(); gates.name = 'MongKokStadiumOsmEntranceGates'; group.add(gates);
  const canopy = [], frames = [], turnstiles = [], signs = [];
  const colliders = [];
  // Only the two OSM entrance nodes on the Flower Market Road frontage are built as gates; the other three nodes
  // are pitch-level doorway nodes and stay as recorded provenance.
  const frontage = MONG_KOK_ENTRANCES
    .map((entrance) => {
      const dx = entrance.x - MONG_KOK_STADIUM_SITE.x, dz = entrance.z - MONG_KOK_STADIUM_SITE.z;
      const cs = Math.cos(MONG_KOK_STADIUM_SITE.ry), sn = Math.sin(MONG_KOK_STADIUM_SITE.ry);
      return { ...entrance, localX: cs * dx - sn * dz, localZ: sn * dx + cs * dz };
    })
    .filter((entrance) => entrance.localZ < 0)
    .sort((a, b) => b.localZ - a.localZ)
    .slice(0, 2);
  const z = -(W + 0.15);
  for (const entrance of frontage) {
    const x = Math.max(-MONG_KOK_BOWL_HALF_LENGTH + 8, Math.min(MONG_KOK_BOWL_HALF_LENGTH - 8, entrance.localX));
    box(canopy, [x, 4.15, z - 1.5], [7.2, 0.35, 3.4]);
    box(canopy, [x, 3.95, z + 0.15], [7.2, 0.5, 0.18]);
    for (const dx of [-3.3, 3.3]) {
      box(frames, [x + dx, 2.1, z - 2.9], [0.24, 4.2, 0.24]);
      box(frames, [x + dx, 0.4, z - 1.4], [0.16, 0.8, 1.9]);
    }
    for (let i = 0; i < 5; i++) {
      const tx = x + (i - 2) * 1.15;
      box(turnstiles, [tx, 0.55, z - 0.5], [0.30, 1.1, 0.85]);
      box(turnstiles, [tx, 1.15, z - 0.5], [0.42, 0.12, 1.0]);
    }
    signs.push({ x, z });
    colliders.push(harbourCityLocalCollider(MONG_KOK_STADIUM_SITE, x, z - 2.9, 0.4, 0.4, base, base + 4.2));
  }
  for (const sign of signs) {
    const plate = makeCanvasSign(9.2, 1.15, (ctx, canvas) => {
      ctx.fillStyle = '#12324a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f2f5f2'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 120px "Noto Sans HK", "PingFang HK", Arial, sans-serif';
      ctx.fillText('旺角大球場  MONG KOK STADIUM', canvas.width / 2, canvas.height * 0.5, canvas.width - 60);
    }, { transparent: false, canvasWidth: 1536, canvasHeight: 192 });
    plate.position.set(sign.x, 4.55, sign.z + 0.2);
    plate.name = 'MongKokStadiumGateNameplate';
    gates.add(plate);
  }
  merged(gates, canopy, materials.mast, 'MongKokStadiumEntranceCanopies');
  merged(gates, frames, materials.mast, 'MongKokStadiumEntranceColumns');
  merged(gates, turnstiles, materials.darkMetal, 'MongKokStadiumTurnstileBlocks');
  stats.gates = signs.length;
  stats.gateSourceNodes = frontage.map((entrance) => entrance.id);
  return { colliders, signs };
}

function ringShapeGeometry(ring, y) {
  const shape = new THREE.Shape();
  for (let i = 0; i < ring.length - 2; i += 2) { if (i === 0) shape.moveTo(ring[i], -ring[i + 1]); else shape.lineTo(ring[i], -ring[i + 1]); }
  shape.closePath(); const geometry = new THREE.ShapeGeometry(shape); geometry.rotateX(-Math.PI / 2); geometry.translate(0, y, 0); return geometry;
}

function buildPlazaAndFence(group, materials, stats) {
  const plaza = new THREE.Group(); plaza.name = 'MongKokStadiumPlazaFenceAndLandscape'; group.add(plaza);
  const fence = [], planters = [], leaves = [];
  const ring = MONG_KOK_STADIUM_SITE.localRing;
  // The exact OSM block is paved; the bowl sits inside it.
  const shell = new THREE.Mesh(ringShapeGeometry(ring, 0.04), materials.plaza);
  shell.name = 'MongKokStadiumExactOsmBlockSurface'; shell.receiveShadow = true; plaza.add(shell);
  // A darker asphalt apron ring hugs the bowl so the pale block paving does not read as one white sheet.
  const apronRing = new THREE.Mesh(ringShapeGeometry(ring, 0.06), materials.blockPaving);
  apronRing.name = 'MongKokStadiumBlockPavingTop'; apronRing.receiveShadow = true; plaza.add(apronRing);
  // Perimeter railing with two gate bays on the Flower Market Road side.
  let segments = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const ax = ring[edge * 2], az = ring[edge * 2 + 1], bx = ring[edge * 2 + 2], bz = ring[edge * 2 + 3];
    const length = Math.hypot(bx - ax, bz - az); if (length < 3) continue;
    const steps = Math.max(1, Math.round(length / 3));
    for (let step = 0; step < steps; step++) {
      const x = ax + (bx - ax) * (step + 0.5) / steps, zz = az + (bz - az) * (step + 0.5) / steps;
      // Leave the two frontage gates open.
      if (zz < -W - 3 && Math.abs(x) < H - 4) continue;
      box(fence, [x, 1.15, zz], [0.09, 2.3, 0.09]); segments++;
    }
    beam(fence, [ax, 2.25, az], [bx, 2.25, bz], 0.07); beam(fence, [ax, 1.15, az], [bx, 1.15, bz], 0.06);
  }
  // Planters and trees in the two end plazas.
  let trees = 0;
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const x = sx * (H + 14 + i * 9), z = -W + 12 + (i % 2) * 26;
      box(planters, [x, 0.35, z], [4.2, 0.7, 4.2]);
      cylinder(leaves, [x, 3.4, z], 0.22, 5.4, 8);
      for (let k = 0; k < 3; k++) {
        const r = 2.6 - k * 0.55;
        const canopyGeometry = new THREE.SphereGeometry(r, 10, 7);
        canopyGeometry.translate(x, 5.4 + k * 1.5, z);
        leaves.push(canopyGeometry);
      }
      trees++;
    }
  }
  merged(plaza, fence, materials.fence, 'MongKokStadiumPerimeterRailing');
  merged(plaza, planters, materials.concrete, 'MongKokStadiumPlazaPlanters');
  merged(plaza, leaves, materials.leaves, 'MongKokStadiumPlazaTrees');
  stats.fencePosts = segments; stats.plazaTrees = trees;
  return plaza;
}

export function buildMongKokStadium(root, { groundOffset = 0 } = {}) {
  const complex = new THREE.Group();
  complex.name = 'MongKokStadium';
  complex.userData.landmark = 'mong-kok-stadium';
  complex.userData.osm = { type: 'way', id: MONG_KOK_STADIUM_OSM_SOURCE.id };
  complex.position.set(MONG_KOK_STADIUM_SITE.x, groundOffset, MONG_KOK_STADIUM_SITE.z);
  complex.rotation.y = MONG_KOK_STADIUM_SITE.ry;
  root.add(complex);

  const palette = harbourCityPalette({ stone: [0.66, 0.66, 0.63], paleStone: [0.86, 0.86, 0.83], roughness: 0.72 });
  const vertexFlat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.02, side: THREE.DoubleSide });
  vertexFlat.colorNode = attribute('color');
  const turf = vertexFlat.clone(); turf.roughness = 0.95; turf.colorNode = attribute('color');
  const paint = vertexFlat.clone(); paint.roughness = 0.6; paint.colorNode = attribute('color');
  const apron = vertexFlat.clone(); apron.roughness = 0.8; apron.colorNode = attribute('color');
  const deck = vertexFlat.clone(); deck.roughness = 0.86; deck.colorNode = attribute('color');
  const sail = new THREE.MeshStandardMaterial({ color: 0xf1f1e9, roughness: 0.82, metalness: 0.02, side: THREE.DoubleSide });
  sail.emissiveNode = color(1, 0.93, 0.78).mul(nightAmount()).mul(0.16);
  const mast = new THREE.MeshStandardMaterial({ color: 0xe4e6e1, roughness: 0.45, metalness: 0.42 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0xd6d7d1, roughness: 0.82, metalness: 0.03, side: THREE.DoubleSide });
  const seatOrange = new THREE.MeshStandardMaterial({ color: 0xc85a17, roughness: 0.62, metalness: 0.05 });
  const seatBlue = new THREE.MeshStandardMaterial({ color: 0x1b3050, roughness: 0.62, metalness: 0.05 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x39413f, roughness: 0.55, metalness: 0.42 });
  const net = new THREE.MeshStandardMaterial({ color: 0xd9dcd8, roughness: 0.9, transparent: true, opacity: 0.62, side: THREE.DoubleSide });
  const floodlight = new THREE.MeshStandardNodeMaterial({ color: 0xf6f2e2 });
  floodlight.emissiveNode = color(1, 0.96, 0.84).mul(nightAmount()).mul(1.7);
  const screen = new THREE.MeshStandardNodeMaterial({ color: 0x0d1b24 });
  screen.emissiveNode = color(0.35, 0.72, 0.95).mul(nightAmount()).mul(1.4);
  const fence = new THREE.MeshStandardMaterial({ color: 0x9aa3a0, roughness: 0.5, metalness: 0.5 });
  const plaza = new THREE.MeshStandardMaterial({ color: 0x74776f, roughness: 0.9, metalness: 0.02, side: THREE.DoubleSide });
  const blockPaving = new THREE.MeshStandardMaterial({ color: 0x8d8f88, roughness: 0.92, metalness: 0.02, side: THREE.DoubleSide });
  const leaves = new THREE.MeshStandardMaterial({ color: 0x40633c, roughness: 0.94 });
  const materials = {
    turf, paint, apron, deck, sail, mast, concrete, seatOrange, seatBlue, darkMetal, net, floodlight, screen, fence, leaves,
    plaza, blockPaving,
    white: palette.white,
  };

  const stats = { mongKokStadiumOsmWay: MONG_KOK_STADIUM_OSM_SOURCE.id, mongKokStadiumOsmVersion: MONG_KOK_STADIUM_OSM_SOURCE.version };
  buildPlazaAndFence(complex, materials, stats);
  buildPitch(complex, materials, stats);
  const stands = {}, standStats = {};
  for (const side of SIDES) stands[side] = buildStand(side, complex, materials, standStats);
  const sails = buildSails(complex, materials, stats);
  const pylons = buildFloodlights(complex, materials, stats);
  const screenInfo = buildScreen(complex, materials, stats);
  const gates = buildEntranceGates(complex, materials, groundOffset, stats);

  const colliders = [];
  // The four stands are solid volumes; the pitch and the plaza stay open so the block remains walkable.
  colliders.push(harbourCityLocalCollider(MONG_KOK_STADIUM_SITE, 0, -(W + MONG_KOK_MAIN_STAND_DEPTH / 2), 2 * H, MONG_KOK_MAIN_STAND_DEPTH, groundOffset, groundOffset + MONG_KOK_MAIN_STAND_TOP + 1.1));
  colliders.push(harbourCityLocalCollider(MONG_KOK_STADIUM_SITE, 0, W + MONG_KOK_SOUTH_STAND_DEPTH / 2, 2 * H, MONG_KOK_SOUTH_STAND_DEPTH, groundOffset, groundOffset + MONG_KOK_SOUTH_STAND_TOP + 1.1));
  colliders.push(harbourCityLocalCollider(MONG_KOK_STADIUM_SITE, H + MONG_KOK_SIDE_STAND_DEPTH / 2, 0, MONG_KOK_SIDE_STAND_DEPTH, 2 * W, groundOffset, groundOffset + MONG_KOK_SIDE_STAND_TOP + 1.1));
  colliders.push(harbourCityLocalCollider(MONG_KOK_STADIUM_SITE, -(H + MONG_KOK_SIDE_STAND_DEPTH / 2), 0, MONG_KOK_SIDE_STAND_DEPTH, 2 * W, groundOffset, groundOffset + MONG_KOK_SIDE_STAND_TOP + 1.1));
  for (const pylon of pylons) colliders.push(harbourCityLocalCollider(MONG_KOK_STADIUM_SITE, pylon.x, pylon.z, 1.8, 1.8, groundOffset, groundOffset + MONG_KOK_FLOODLIGHT_HEIGHT));
  for (const collider of gates.colliders) colliders.push(collider);

  const totalSeats = SIDES.reduce((sum, side) => sum + stands[side].seats, 0);
  const landmarks = [{
    id: 'mong-kok-stadium', name: '旺角大球場 · Mong Kok Stadium',
    position: { x: MONG_KOK_STADIUM_SITE.x, y: groundOffset, z: MONG_KOK_STADIUM_SITE.z },
    radius: 170, height: MONG_KOK_SAIL_PEAK, components: 1,
  }];
  Object.assign(stats, {
    mongKokStadiumGroundOffset: groundOffset,
    mongKokStadiumLandmarks: 1,
    mongKokStadiumInventoryId: 'HK-B0101',
    mongKokStadiumRingArea: MONG_KOK_STADIUM_SITE.ringArea,
    mongKokStadiumPitchLength: MONG_KOK_PITCH_LENGTH,
    mongKokStadiumPitchWidth: MONG_KOK_PITCH_WIDTH,
    mongKokStadiumPitchSurface: 'artificial turf',
    mongKokStadiumApron: MONG_KOK_APRON,
    mongKokStadiumSeatCount: totalSeats,
    mongKokStadiumSeatCapacity: MONG_KOK_SEATS,
    mongKokStadiumSeatRows: SIDES.reduce((sum, side) => sum + MONG_KOK_BOWL[side].rows, 0),
    mongKokStadiumMainStandRows: MONG_KOK_BOWL.north.rows,
    mongKokStadiumMainStandTop: MONG_KOK_MAIN_STAND_TOP,
    mongKokStadiumSailCount: MONG_KOK_SAIL_COUNT,
    mongKokStadiumSailSpan: MONG_KOK_SAIL_SPAN,
    mongKokStadiumSailDepth: MONG_KOK_SAIL_DEPTH,
    mongKokStadiumSailPeak: MONG_KOK_SAIL_PEAK,
    mongKokStadiumSailRim: MONG_KOK_SAIL_RIM,
    mongKokStadiumFloodlightHeight: MONG_KOK_FLOODLIGHT_HEIGHT,
    mongKokStadiumFloodlightCount: MONG_KOK_FLOODLIGHT_COUNT,
    mongKokStadiumScreen: `${MONG_KOK_SCREEN_WIDTH} x ${MONG_KOK_SCREEN_HEIGHT} m LED screen at the southern end`,
    mongKokStadiumScreenZ: screenInfo.z,
    mongKokStadiumEntranceNodes: MONG_KOK_ENTRANCES.map((entrance) => entrance.id),
    mongKokStadiumReconstructionYear: MONG_KOK_RECONSTRUCTION_YEAR,
    mongKokStadiumOriginalYear: MONG_KOK_ORIGINAL_YEAR,
    mongKokStadiumResearchSources: MONG_KOK_RESEARCH_SOURCES.length,
    mongKokStadiumColliders: colliders.length,
    mongKokStadiumComponents: SIDES.length + 4,
  });

  const ground = groundOffset;
  return {
    group: complex,
    colliders,
    landmarks,
    stats,
    groundOffset,
    sailPeak: MONG_KOK_SAIL_PEAK,
    plazaTop: ground,
    groundHeightAt(x, z, fallback) {
      // The pitch, apron and the whole OSM block are flat at the stadium's own construction datum.
      const dx = x - MONG_KOK_STADIUM_SITE.x, dz = z - MONG_KOK_STADIUM_SITE.z;
      const cs = Math.cos(MONG_KOK_STADIUM_SITE.ry), sn = Math.sin(MONG_KOK_STADIUM_SITE.ry);
      const lx = cs * dx - sn * dz, lz = sn * dx + cs * dz;
      if (Math.abs(lx) <= H + 2 && Math.abs(lz) <= W + 2) return Math.max(fallback, ground);
      return mongKokStadiumTerrainHeightAt(x, z, fallback, ground);
    },
  };
}
