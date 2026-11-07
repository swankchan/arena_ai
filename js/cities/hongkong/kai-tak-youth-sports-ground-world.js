// HK-B0106: 啟德青年運動場 Kai Tak Youth Sports Ground — the open 5,000-seat public ground of 啟德體育園.
//
// Modelled as the real open facility rather than a bowl: a 400 m eight-lane track around a 100 x 64 m turf pitch,
// one covered 5,000-seat main stand with a white cantilever canopy on the west side, low uncovered terracing opposite,
// four 32 m floodlight masts, a perimeter fence with two gates, and the paved concourse inside the OSM ring.
import * as THREE from 'three/webgpu';
import { attribute, color } from 'three/tsl';
import {
  KAI_TAK_YOUTH_SITE, KAI_TAK_YOUTH_OSM_SOURCE, KAI_TAK_YOUTH_COLOURS, KAI_TAK_YOUTH_SEATS, KAI_TAK_YOUTH_OPENED,
  KAI_TAK_YOUTH_TRACK, KAI_TAK_YOUTH_PITCH, KAI_TAK_YOUTH_MASTS, KAI_TAK_YOUTH_MAST_HEIGHT,
  KAI_TAK_YOUTH_MAIN_STAND_ROWS, KAI_TAK_YOUTH_MAIN_STAND_TOP, KAI_TAK_YOUTH_CANOPY_DEPTH,
  KAI_TAK_YOUTH_TUNNEL_NOTE, KAI_TAK_YOUTH_RESEARCH_SOURCES, kaiTakYouthTerrainHeightAt,
} from './kai-tak-youth-sports-ground-architecture.js';
import {
  merged, box, cylinder, beam, store, quad, meshStore, harbourCityPalette,
} from './harbour-city-world-utils.js';
import { harbourCityLocalCollider, harbourCityRingColliders } from './harbour-city-architecture.js';

const C = KAI_TAK_YOUTH_COLOURS;

function makeMaterials() {
  const palette = harbourCityPalette();
  const seat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: 0.06, roughness: 0.66, side: THREE.DoubleSide });
  seat.colorNode = attribute('color').rgb;
  return {
    seat,
    track: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.track), roughness: 0.92 }),
    line: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.trackLine), roughness: 0.8 }),
    pitch: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.pitch), roughness: 0.96 }),
    canopy: palette.white,
    mast: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.mast), roughness: 0.42, metalness: 0.5 }),
    concrete: palette.paleStone,
    paving: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.paving), roughness: 0.9 }),
    fence: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.fence), roughness: 0.4, metalness: 0.6 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x2b3a3d, roughness: 0.2, metalness: 0.4 }),
  };
}

function buildTrackAndPitch(group, materials, stats) {
  const field = new THREE.Group(); field.name = 'KaiTakYouthTrackAndPitch'; group.add(field);
  const turf = store(), trackStore = store(), lines = [];
  const pitchHalfX = KAI_TAK_YOUTH_PITCH.length / 2, pitchHalfZ = KAI_TAK_YOUTH_PITCH.width / 2;
  // Turf with mowing stripes.
  for (let i = 0; i < 12; i++) {
    const x0 = -pitchHalfX + (2 * pitchHalfX) * (i / 12), x1 = -pitchHalfX + (2 * pitchHalfX) * ((i + 1) / 12);
    quad(turf, [x0, 0.16, -pitchHalfZ], [x1, 0.16, -pitchHalfZ], [x1, 0.16, pitchHalfZ], [x0, 0.16, pitchHalfZ],
      i % 2 ? C.pitchStripe : C.pitch);
  }
  // 400 m track: an oval band built from a 96-segment discorectangle, 9.0 m wide (eight lanes plus kerbs).
  const straight = 84, radius = 38.0, width = 9.2;
  const segments = 96;
  const bandPoint = (t, offset) => {
    // t in [0,1) around the oval; offset shifts outwards from the centreline.
    const a = t * Math.PI * 2;
    const cos = Math.cos(a), sin = Math.sin(a);
    const sx = Math.sign(cos) * Math.min(Math.abs(cos) * 1e6, 1) * (straight / 2);
    const rx = Math.sign(cos) * straight / 2 + Math.cos(a) * (radius + offset);
    const rz = Math.sin(a) * (radius + offset);
    return { x: rx, z: rz, sx };
  };
  for (let i = 0; i < segments; i++) {
    const t0 = i / segments, t1 = (i + 1) / segments;
    const a = bandPoint(t0, -width / 2), b = bandPoint(t1, -width / 2);
    const c = bandPoint(t1, width / 2), d = bandPoint(t0, width / 2);
    quad(trackStore, [a.x, 0.12, a.z], [b.x, 0.12, b.z], [c.x, 0.12, c.z], [d.x, 0.12, d.z], C.track);
    beam(lines, [a.x, 0.15, a.z], [b.x, 0.15, b.z], 0.08, 0.08);
    for (let lane = 1; lane < 8; lane++) {
      const offset = -width / 2 + (width * lane) / 8;
      const l0 = bandPoint(t0, offset), l1 = bandPoint(t1, offset);
      beam(lines, [l0.x, 0.14, l0.z], [l1.x, 0.14, l1.z], 0.05, 0.05);
    }
  }
  meshStore(field, turf, materials.pitch, 'KaiTakYouthPitch', false);
  meshStore(field, trackStore, materials.track, 'KaiTakYouthRunningTrack', false);
  merged(field, lines, materials.line, 'KaiTakYouthTrackLaneLines');
  stats.kaiTakYouthLaneLines = lines.length;
  stats.kaiTakYouthTrack = KAI_TAK_YOUTH_TRACK;
  return field;
}

// The covered main stand: 16 rows rising from the west touchline, with a white cantilever canopy and blue seats.
function buildMainStand(group, materials, stats) {
  const stand = new THREE.Group(); stand.name = 'KaiTakYouthMainStand'; group.add(stand);
  const seats = store(), structure = [], canopy = [], columns = [];
  const baseZ = -KAI_TAK_YOUTH_PITCH.width / 2 - 22;
  const length = 78;
  const rows = KAI_TAK_YOUTH_MAIN_STAND_ROWS;
  const tread = 0.95, rise = 0.52, frontWall = 2.2;
  // Seat shells, colour-blocked blue and pale grey like the public ground.
  for (let row = 0; row < rows; row++) {
    const z = baseZ - row * tread;
    const y = frontWall + row * rise;
    const count = Math.round(length / 0.62);
    for (let seat = 0; seat < count; seat++) {
      const x = -length / 2 + (seat + 0.5) * (length / count);
      const tint = (Math.floor(seat / 26) + Math.floor(row / 5)) % 2 ? C.seat : C.seatAlt;
      quad(seats, [x - 0.24, y, z - 0.2], [x + 0.24, y, z - 0.2], [x + 0.24, y + 0.34, z - 0.28], [x - 0.24, y + 0.34, z - 0.28], tint);
    }
    box(structure, [0, (y + rise / 2) - 0.06, z - tread / 2], [length, rise + 0.12, tread + 0.04]);
  }
  // Back wall, side walls, vomitories and the white cantilever canopy over the top rows.
  box(structure, [0, (frontWall + rows * rise) / 2, baseZ - rows * tread - 0.4], [length, frontWall + rows * rise, 0.8]);
  for (const side of [-1, 1]) {
    box(structure, [side * (length / 2 + 0.4), (frontWall + rows * rise) / 2, baseZ - rows * tread / 2],
      [0.8, frontWall + rows * rise, rows * tread]);
  }
  const canopyY = KAI_TAK_YOUTH_MAIN_STAND_TOP + 3.6;
  box(canopy, [0, canopyY, baseZ - rows * tread / 2 + 1.5], [length + 3.0, 0.55, KAI_TAK_YOUTH_CANOPY_DEPTH + 8.5]);
  for (let i = 0; i <= 8; i++) {
    const x = -length / 2 + (i / 8) * length;
    cylinder(columns, [x, (frontWall + canopyY) / 2, baseZ - rows * tread - 0.2], 0.16, canopyY - frontWall, 6);
  }
  meshStore(stand, seats, materials.seat, 'KaiTakYouthMainStandSeats');
  merged(stand, structure, materials.concrete, 'KaiTakYouthMainStandStructure');
  merged(stand, canopy, materials.canopy, 'KaiTakYouthMainStandCanopy');
  merged(stand, columns, materials.mast, 'KaiTakYouthMainStandColumns');
  stats.kaiTakYouthMainStandSeats = Math.round(0);
  return stand;
}

// Low uncovered terracing on the east side, opposite the main stand.
function buildEastTerrace(group, materials, stats) {
  const terrace = new THREE.Group(); terrace.name = 'KaiTakYouthEastTerrace'; group.add(terrace);
  const seats = store(), structure = [];
  const baseZ = KAI_TAK_YOUTH_PITCH.width / 2 + 22;
  const length = 76, rows = 8, tread = 0.9, rise = 0.46;
  for (let row = 0; row < rows; row++) {
    const z = baseZ + row * tread, y = 1.2 + row * rise;
    const count = Math.round(length / 0.62);
    for (let seat = 0; seat < count; seat++) {
      const x = -length / 2 + (seat + 0.5) * (length / count);
      const tint = (Math.floor(seat / 30) + row) % 2 ? C.seatAlt : C.seat;
      quad(seats, [x - 0.24, y, z + 0.2], [x + 0.24, y, z + 0.2], [x + 0.24, y + 0.3, z + 0.28], [x - 0.24, y + 0.3, z + 0.28], tint);
    }
    box(structure, [0, y + rise / 2 - 0.05, z + tread / 2], [length, rise + 0.1, tread + 0.04]);
  }
  meshStore(terrace, seats, materials.seat, 'KaiTakYouthEastTerraceSeats');
  merged(terrace, structure, materials.concrete, 'KaiTakYouthEastTerraceStructure');
  return terrace;
}

// Four floodlight masts, the perimeter fence with its gates, and the paved concourse inside the surveyed ring.
function buildGrounds(group, materials, stats) {
  const grounds = new THREE.Group(); grounds.name = 'KaiTakYouthGrounds'; group.add(grounds);
  const masts = [], heads = [], fence = [], gatesBuildings = [], pavement = store(), gates = [];
  const site = KAI_TAK_YOUTH_SITE;
  const ring = site.localRing;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i + 1 < ring.length; i += 2) {
    minX = Math.min(minX, ring[i]); maxX = Math.max(maxX, ring[i]);
    minZ = Math.min(minZ, ring[i + 1]); maxZ = Math.max(maxZ, ring[i + 1]);
  }
  quad(pavement, [minX + 1, 0.05, minZ + 1], [maxX - 1, 0.05, minZ + 1], [maxX - 1, 0.05, maxZ - 1], [minX + 1, 0.05, maxZ - 1], C.paving);
  // Masts at the four corners of the track, 32 m high with a six-lamp head.
  const mastX = 66, mastZ = 62;
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const x = sx * mastX, z = sz * mastZ;
    cylinder(masts, [x, KAI_TAK_YOUTH_MAST_HEIGHT / 2, z], 0.34, KAI_TAK_YOUTH_MAST_HEIGHT, 8);
    box(heads, [x, KAI_TAK_YOUTH_MAST_HEIGHT + 0.9, z], [4.2, 1.8, 0.7], 0);
    for (let i = 0; i < 6; i++) {
      box(heads, [x - 1.7 + i * 0.68, KAI_TAK_YOUTH_MAST_HEIGHT + 2.4, z], [0.5, 0.7, 0.35], 0);
    }
  }
  // Perimeter fence: posts and rails on a 4 m offset inside the ring.
  const segments = 72;
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2, a1 = ((i + 1) / segments) * Math.PI * 2;
    const rx = (maxX - minX) / 2 - 5, rz = (maxZ - minZ) / 2 - 5;
    const p0 = { x: Math.cos(a0) * rx, z: Math.sin(a0) * rz };
    const p1 = { x: Math.cos(a1) * rx, z: Math.sin(a1) * rz };
    beam(fence, [p0.x, 1.2, p0.z], [p1.x, 1.2, p1.z], 0.06, 0.06);
    if (i % 3 === 0) cylinder(fence, [p0.x, 1.2, p0.z], 0.09, 2.4, 6);
  }
  // Two entrance buildings on the north side, on the axis of the main stand.
  for (const side of [-1, 1]) {
    const x = side * 34, z = mastZ - 2;
    box(gatesBuildings, [x, 2.2, z], [16, 4.4, 8]);
    box(gatesBuildings, [x, 4.7, z], [17, 0.6, 9]);
    gates.push({ x, z });
  }
  merged(grounds, masts, materials.mast, 'KaiTakYouthFloodlightMasts');
  merged(grounds, heads, materials.mast, 'KaiTakYouthFloodlightHeads');
  merged(grounds, fence, materials.fence, 'KaiTakYouthPerimeterFence');
  merged(grounds, gatesBuildings, materials.concrete, 'KaiTakYouthEntranceBuildings');
  meshStore(grounds, pavement, materials.paving, 'KaiTakYouthConcoursePaving', false);
  stats.kaiTakYouthFloodlightMasts = KAI_TAK_YOUTH_MASTS;
  stats.kaiTakYouthMastHeight = KAI_TAK_YOUTH_MAST_HEIGHT;
  stats.kaiTakYouthGates = gates.length;
  return { grounds, gates, minX, maxX, minZ, maxZ };
}

export function buildKaiTakYouthSportsGround(root, { groundOffset = 0 } = {}) {
  const ground = new THREE.Group();
  ground.name = 'KaiTakYouthSportsGround';
  ground.position.set(KAI_TAK_YOUTH_SITE.x, groundOffset, KAI_TAK_YOUTH_SITE.z);
  root.add(ground);
  const materials = makeMaterials();
  const stats = {
    kaiTakYouthTunnelBeneath: true,
    kaiTakYouthTunnelNote: KAI_TAK_YOUTH_TUNNEL_NOTE,
  };
  buildGrounds(ground, materials, stats);
  buildTrackAndPitch(ground, materials, stats);
  buildMainStand(ground, materials, stats);
  buildEastTerrace(ground, materials, stats);

  const colliders = [];
  // The main stand and the two entrance buildings are the only solid structures; the ground itself stays open.
  colliders.push(harbourCityLocalCollider(KAI_TAK_YOUTH_SITE, 0, -KAI_TAK_YOUTH_PITCH.width / 2 - 24, 82, 17,
    groundOffset, groundOffset + KAI_TAK_YOUTH_MAIN_STAND_TOP + 4.2));
  for (const side of [-1, 1]) {
    colliders.push(harbourCityLocalCollider(KAI_TAK_YOUTH_SITE, side * 34, 60, 17, 9, groundOffset, groundOffset + 5.0));
  }
  // The perimeter fence is solid, so the ground is entered through the north side gates only.
  for (let i = 0; i < 72; i++) {
    const a0 = (i / 72) * Math.PI * 2, a1 = ((i + 1) / 72) * Math.PI * 2;
    const mx = Math.cos((a0 + a1) / 2) * 104, mz = Math.sin((a0 + a1) / 2) * 86;
    if (mz > 40 && Math.abs(mx) > 22) continue;   // leave the two gate openings clear
    colliders.push(harbourCityLocalCollider(KAI_TAK_YOUTH_SITE, mx, mz, 10, 0.4, groundOffset, groundOffset + 2.4,
      KAI_TAK_YOUTH_SITE.ry + Math.atan2(-0.4 * Math.cos((a0 + a1) / 2), -0.4 * Math.sin((a0 + a1) / 2)) + Math.PI / 2));
  }

  const landmarks = [{
    id: 'kai-tak-youth-sports-ground', name: '啟德青年運動場 · Kai Tak Youth Sports Ground',
    position: { x: KAI_TAK_YOUTH_SITE.x, y: groundOffset, z: KAI_TAK_YOUTH_SITE.z },
    radius: 190, height: KAI_TAK_YOUTH_MAST_HEIGHT, components: 2,
  }];

  Object.assign(stats, {
    kaiTakYouthGroundOffset: groundOffset,
    kaiTakYouthLandmarks: 1,
    kaiTakYouthInventoryId: 'HK-B0106',
    kaiTakYouthOsmWay: KAI_TAK_YOUTH_OSM_SOURCE.id,
    kaiTakYouthRingArea: KAI_TAK_YOUTH_SITE.ringArea,
    kaiTakYouthSeats: KAI_TAK_YOUTH_SEATS,
    kaiTakYouthOpened: KAI_TAK_YOUTH_OPENED,
    kaiTakYouthPitchLength: KAI_TAK_YOUTH_PITCH.length,
    kaiTakYouthPitchWidth: KAI_TAK_YOUTH_PITCH.width,
    kaiTakYouthMainStandRows: KAI_TAK_YOUTH_MAIN_STAND_ROWS,
    kaiTakYouthMainStandTop: KAI_TAK_YOUTH_MAIN_STAND_TOP,
    kaiTakYouthResearchSources: KAI_TAK_YOUTH_RESEARCH_SOURCES.length,
    kaiTakYouthColliders: colliders.length,
  });

  return {
    group: ground, colliders, landmarks, stats, groundOffset,
    groundHeightAt(x, z, fallback) {
      return kaiTakYouthTerrainHeightAt(x, z, Math.max(fallback, groundOffset), groundOffset);
    },
  };
}
