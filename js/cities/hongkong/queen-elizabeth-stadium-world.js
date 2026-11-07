// HK-B0103: 伊利沙伯體育館 Queen Elizabeth Stadium — the 1980 Urban Council indoor hall on Morrison Hill.
//
// The envelope follows the exact OSM ring (stepped west side, chamfered south-west corner and the real 4 m east
// service setback), so no invented rectangle replaces the surveyed outline. Onto that envelope go the features that
// identify the building in every photograph of it: the full-height green-tinted glass curtain wall and its slim
// stainless mullions, the thin projecting white entrance canopy with the black bilingual lettering, the dark
// clerestory strips, and the deep white horizontally-fluted facade wrapping the whole hall over cream-grey piers.
import * as THREE from 'three/webgpu';
import { attribute, color } from 'three/tsl';
import {
  QE_STADIUM_SITE, QE_STADIUM_OSM_SOURCE, QE_STADIUM_MASSING, QE_STADIUM_COLOURS, QE_STADIUM_CAPACITY,
  QE_STADIUM_ARENA_FLOOR_SQUARE_METRES, QE_STADIUM_OPENED, QE_STADIUM_FOUNDATION_STONE, QE_STADIUM_OPENED_BY,
  QE_STADIUM_BUILDER, QE_STADIUM_MANAGER, QE_STADIUM_RESEARCH_SOURCES, queenElizabethStadiumTerrainHeightAt,
} from './queen-elizabeth-stadium-architecture.js';
import {
  merged, box, cylinder, beam, store, quad, meshStore, harbourCityPalette,
} from './harbour-city-world-utils.js';
import { harbourCityLocalCollider, harbourCityRingColliders } from './harbour-city-architecture.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';

const M = QE_STADIUM_MASSING, C = QE_STADIUM_COLOURS;

// The ring, as local (lx, lz) pairs. Local +z is the Oi Kwan Road frontage; local +x is the east service side.
const RING = QE_STADIUM_SITE.localRing;
const EDGES = [];
for (let i = 0; i + 3 < RING.length; i += 2) {
  const x0 = RING[i], z0 = RING[i + 1], x1 = RING[i + 2], z1 = RING[i + 3];
  const dx = x1 - x0, dz = z1 - z0, length = Math.hypot(dx, dz);
  if (length < 0.05) continue;
  EDGES.push({
    x0, z0, x1, z1, length, mx: (x0 + x1) / 2, mz: (z0 + z1) / 2,
    angle: Math.atan2(-dz, dx), normal: { x: dz / length, z: -dx / length },
  });
}
const NORTH_Z = Math.max(...EDGES.map((e) => Math.max(e.z0, e.z1)));   // 28.8, Oi Kwan Road frontage
const SOUTH_Z = Math.min(...EDGES.map((e) => Math.min(e.z0, e.z1)));   // -28.8
const ringExtent = {
  minX: Math.min(...EDGES.flatMap((e) => [e.x0, e.x1])), maxX: Math.max(...EDGES.flatMap((e) => [e.x0, e.x1])),
  minZ: SOUTH_Z, maxZ: NORTH_Z,
};
// The long frontage edges run along Oi Kwan Road and are split by the ring into two collinear pieces.
const FRONTAGE = EDGES.filter((e) => Math.abs(e.z0 - NORTH_Z) < 0.2 && Math.abs(e.z1 - NORTH_Z) < 0.2);
// The real east setback between lz -15.6 and +16.0 is the service bay; its back wall is the recessed edge.
const RECESS = EDGES.filter((e) => Math.abs(e.z0 - e.z1) > 20 && e.mx > 20);
const ENTRANCE_LOCAL_X = (Math.min(...FRONTAGE.map((e) => Math.min(e.x0, e.x1))) + Math.max(...FRONTAGE.map((e) => Math.max(e.x0, e.x1)))) / 2;

function makeMaterials() {
  const palette = harbourCityPalette();
  return {
    rib: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.rib), roughness: 0.62, metalness: 0.05 }),
    render: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.render), roughness: 0.88, metalness: 0.02 }),
    renderShadow: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.renderShadow), roughness: 0.9, metalness: 0.02 }),
    glass: new THREE.MeshStandardMaterial({
      color: new THREE.Color(...C.glass), roughness: 0.12, metalness: 0.28, transparent: true, opacity: 0.52,
      depthWrite: false, side: THREE.DoubleSide,
    }),
    glassDark: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.glassDark), roughness: 0.6, metalness: 0.2 }),
    mullion: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.mullion), roughness: 0.34, metalness: 0.72 }),
    canopy: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.canopy), roughness: 0.55, metalness: 0.08 }),
    windowBand: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.windowBand), roughness: 0.3, metalness: 0.35 }),
    plinth: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.plinth), roughness: 0.85 }),
    paving: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.paving), roughness: 0.92 }),
    shutter: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.shutter), roughness: 0.6, metalness: 0.3 }),
    leaf: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.leaf), roughness: 0.9 }),
    trunk: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.trunk), roughness: 0.95 }),
    paint: palette.paint ?? new THREE.MeshStandardMaterial({ color: 0x2b2f31, roughness: 0.7 }),
  };
}

// One wall slab per ring edge, pushed inwards so the fluted facade can sit proud of the rendered wall.
function buildEnvelope(group, materials, stats) {
  const walls = new THREE.Group(); walls.name = 'QueenElizabethStadiumWalls'; group.add(walls);
  const render = [], shadow = [], ribs = [], piers = [], bands = [];
  const wallInset = 0.45;

  EDGES.forEach((edge, index) => {
    const isFrontage = FRONTAGE.includes(edge);
    const height = M.hallHeight;
    const length = edge.length;
    // The ring is wound so (dz, -dx) is the outward normal; the wall slab is pushed inwards from it.
    const cx = edge.mx - edge.normal.x * wallInset, cz = edge.mz - edge.normal.z * wallInset;
    if (isFrontage) {
      // Glass below, rendered band with a dark clerestory strip above, then the fluted facade.
      const glassTop = M.glazingHeight;
      box(render, [cx, (glassTop + M.clerestoryTop) / 2, cz], [length, M.clerestoryTop - glassTop, 0.9], edge.angle);
      // Thin dark clerestory strip recessed into the band above the glazing.
      box(shadow, [edge.mx + edge.normal.x * 0.05, M.clerestoryTop - 0.34, edge.mz + edge.normal.z * 0.05],
        [length - 1.6, 0.62, 0.12], edge.angle);
      // Above the clerestory the rendered wall continues behind the ribs to the parapet.
      box(render, [cx, (M.clerestoryTop + height) / 2, cz],
        [length, height - M.clerestoryTop, 0.9], edge.angle);
    } else {
      box(render, [cx, height / 2, cz], [length, height, 0.9], edge.angle);
    }
    // White fluted bands over every long edge: 12 closely-spaced horizontal ribs, each proud of the wall. On the
    // north and east elevations the flutes run the full width; on the west and south elevations the photographs show
    // them as two independent ribbed pods standing proud of plain cream-grey panels, so they are split here too.
    if (length > 5.5) {
      const sideSplit = edge.mx < -18 || edge.mz < SOUTH_Z + 1.0;
      const runs = sideSplit
        ? [[0.06, 0.44], [0.56, 0.94]]
        : [[-0.55 / length, 1 + 0.55 / length]];   // slight overlap closes the seam where the ring splits a facade
      for (const [t0, t1] of runs) {
        const runLength = (t1 - t0) * length;
        const runCentre = ((t0 + t1) / 2 - 0.5) * length;
        const px = edge.mx + (edge.x1 - edge.x0) / length * runCentre;
        const pz = edge.mz + (edge.z1 - edge.z0) / length * runCentre;
        for (let rib = 0; rib < M.ribCount; rib++) {
          const y = M.ribBase + M.ribPitch * (rib + 0.5);
          const offset = M.ribProjection / 2 - 0.04;   // proud of the rendered wall, as the photographs show
          box(ribs, [px + edge.normal.x * offset, y, pz + edge.normal.z * offset],
            [runLength, M.ribPitch * 0.94, M.ribProjection], edge.angle);
        }
      }
    }
    // Cream pier at the far vertex of the edge, so each corner and step gets its plain vertical band.
    box(piers, [edge.x1 + edge.normal.x * 0.30, height / 2, edge.z1 + edge.normal.z * 0.30],
      [M.pierWidth, height, 0.66], edge.angle);
    stats.qeStadiumWallEdges = (stats.qeStadiumWallEdges ?? 0) + 1;
  });

  // Parapet cap around the ring and the flat roof.
  const caps = [];
  for (const edge of EDGES) {
    box(caps, [edge.mx - edge.normal.x * wallInset, M.hallHeight + M.parapet / 2, edge.mz - edge.normal.z * wallInset],
      [edge.length + 0.55, M.parapet, 1.25], edge.angle);
  }
  merged(walls, caps, materials.render, 'QueenElizabethStadiumParapetCap');

  // Dark granite plinth where the glazing meets the paving, as in the street-level photograph.
  const plinths = [];
  for (const edge of EDGES) {
    box(plinths, [edge.mx - edge.normal.x * wallInset, 0.22, edge.mz - edge.normal.z * wallInset],
      [edge.length + 0.2, 0.44, 1.0], edge.angle);
  }
  merged(walls, plinths, materials.plinth, 'QueenElizabethStadiumGranitePlinth');

  // Roof deck: the ring triangulated directly, so the stepped plan is preserved on the roof too.
  const shape = new THREE.Shape();
  shape.moveTo(RING[0], RING[1]);
  for (let i = 2; i + 1 < RING.length; i += 2) shape.lineTo(RING[i], RING[i + 1]);
  shape.closePath();
  const roofGeometry = new THREE.ShapeGeometry(shape);
  roofGeometry.rotateX(Math.PI / 2);
  roofGeometry.translate(0, M.hallHeight + 0.02, 0);
  const roofMesh = new THREE.Mesh(roofGeometry, materials.renderShadow);
  roofMesh.name = 'QueenElizabethStadiumRoofDeck'; roofMesh.receiveShadow = true; walls.add(roofMesh);

  merged(walls, render, materials.render, 'QueenElizabethStadiumRenderedPiers');
  merged(walls, shadow, materials.renderShadow, 'QueenElizabethStadiumClerestoryFrames');
  merged(walls, ribs, materials.rib, 'QueenElizabethStadiumWhiteFlutedRibs');
  merged(walls, piers, materials.render, 'QueenElizabethStadiumCornerPiers');
  return { walls, render };
}

// Ground-floor curtain wall: green glass in slim stainless frames, with the lobby behind it and the entrance
// canopy and its lettering over the doors.
function buildFrontage(group, materials, stats) {
  const front = new THREE.Group(); front.name = 'QueenElizabethStadiumFrontage'; group.add(front);
  const glass = store(), mullions = [], frames = [], canopy = [], soffitLights = [];
  const z = NORTH_Z - 1.55;                        // glass plane, set back behind the pier line
  const entranceHalf = M.canopySpan / 2;
  const leftX = Math.min(...FRONTAGE.map((e) => Math.min(e.x0, e.x1))) + 1.2;
  const rightX = Math.max(...FRONTAGE.map((e) => Math.max(e.x0, e.x1))) - 1.2;

  // Glass wall, split around the entrance so the door line reads as an opening rather than a painted stripe.
  const bays = [];
  let cursor = leftX;
  const bayWidth = 1.45;
  while (cursor + bayWidth < rightX) { bays.push([cursor, cursor + bayWidth]); cursor += bayWidth; }
  if (rightX - cursor > 0.4) bays.push([cursor, rightX]);
  for (const [x0, x1] of bays) {
    quad(glass, [x0, 0.28, z], [x1, 0.28, z], [x1, M.glazingHeight, z], [x0, M.glazingHeight, z], C.glass);
    for (const x of [x0, x1]) {
      cylinder(mullions, [x, M.glazingHeight / 2, z], 0.075, M.glazingHeight - 0.28, 6);
    }
    for (const y of [0.28, M.glazingHeight - 0.12, 4.6]) {
      box(frames, [(x0 + x1) / 2, y, z], [x1 - x0, 0.11, 0.16]);
    }
  }
  // Lobby behind the glass: dark volume, a lit ceiling plane and the escalator mass seen in the photographs.
  const lobby = [];
  box(lobby, [ENTRANCE_LOCAL_X, M.glazingHeight / 2, z - 3.2], [rightX - leftX, M.glazingHeight, 6.2]);
  merged(front, lobby, materials.glassDark, 'QueenElizabethStadiumLobbyBehindGlass');

  // Entrance canopy: a thin white slab cantilevered over the doors, with a deep fascia.
  // From just inside the pier line out to the photographed 3.6 m projection.
  const canopyDepth = M.canopyDepth + 1.2;
  box(canopy, [ENTRANCE_LOCAL_X, M.canopyBase + M.canopyThickness / 2, NORTH_Z - 1.2 + canopyDepth / 2],
    [M.canopySpan, M.canopyThickness, canopyDepth]);
  for (let i = 0; i <= 8; i++) {
    const x = ENTRANCE_LOCAL_X - entranceHalf + (i / 8) * M.canopySpan;
    cylinder(soffitLights, [x, M.canopyBase + 0.02, NORTH_Z + 0.6], 0.11, 0.04, 8);
  }
  merged(front, canopy, materials.canopy, 'QueenElizabethStadiumEntranceCanopy');
  merged(front, soffitLights, materials.mullion, 'QueenElizabethStadiumCanopySoffitLights');

  // Black bilingual lettering on the canopy fascia, exactly as in the 2011 frontage photograph.
  const sign = makeCanvasSign(24.0, 1.12, (ctx, canvas) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#26292b';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 104px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('QUEEN ELIZABETH STADIUM', canvas.width / 2, canvas.height * 0.42);
    ctx.font = '500 96px "Noto Sans CJK TC", "PingFang HK", "Microsoft JhengHei", sans-serif';
    ctx.fillText('伊 利 沙 伯 體 育 館', canvas.width / 2, canvas.height * 0.79);
  }, { canvasWidth: 2304, canvasHeight: 320 });
  sign.name = 'QueenElizabethStadiumCanopyLettering';
  sign.position.set(ENTRANCE_LOCAL_X, M.canopyBase + M.canopyThickness / 2, NORTH_Z + canopyDepth - 1.26);
  sign.rotation.y = 0;
  front.add(sign);

  // Glass entrance doors with stainless pulls, a step and a granite threshold.
  const doors = [], pulls = [];
  for (const offset of [-3.4, -1.15, 1.15, 3.4]) {
    box(doors, [ENTRANCE_LOCAL_X + offset, 1.75, z - 0.06], [2.1, 3.5, 0.1]);
    cylinder(pulls, [ENTRANCE_LOCAL_X + offset - 0.55, 1.6, z + 0.06], 0.04, 1.7, 6);
    cylinder(pulls, [ENTRANCE_LOCAL_X + offset + 0.55, 1.6, z + 0.06], 0.04, 1.7, 6);
  }
  merged(front, doors, materials.glass, 'QueenElizabethStadiumEntranceDoors');
  merged(front, pulls, materials.mullion, 'QueenElizabethStadiumDoorPulls');
  merged(front, mullions, materials.mullion, 'QueenElizabethStadiumCurtainWallMullions');
  merged(front, frames, materials.mullion, 'QueenElizabethStadiumCurtainWallTransoms');
  meshStore(front, glass, materials.glass, 'QueenElizabethStadiumCurtainWallGlass');

  stats.qeStadiumGlassBays = bays.length;
  stats.qeStadiumEntranceCanopySpan = M.canopySpan;
  return { front, z };
}

// The stepped west side and the south wall: punched windows in a narrow vertical strip between ribbed pods, plain
// rendered panels, and the ventilation grilles that appear on the rear elevations.
function buildRearElevations(group, materials, stats) {
  const rear = new THREE.Group(); rear.name = 'QueenElizabethStadiumRearElevations'; group.add(rear);
  const windows = [], frames = [], grilles = [];
  const westEdges = EDGES.filter((e) => e.mx < -18 && Math.abs(e.z1 - e.z0) > 3);
  for (const edge of westEdges) {
    const columns = Math.max(1, Math.floor(edge.length / 5.2));
    for (let i = 0; i < columns; i++) {
      const t = (i + 0.5) / columns;
      const x = edge.x0 + (edge.x1 - edge.x0) * t - edge.normal.x * 0.9;
      const z = edge.z0 + (edge.z1 - edge.z0) * t - edge.normal.z * 0.9;
      for (let level = 0; level < 5; level++) {
        const y = 4.2 + level * 4.6;
        box(windows, [x, y, z], [1.15, 1.5, 0.12], edge.angle);
        box(frames, [x, y, z], [1.35, 1.7, 0.08], edge.angle);
      }
    }
  }
  // Rear service louvres low on the south wall.
  const southEdge = EDGES.filter((e) => Math.abs(e.z0 - SOUTH_Z) < 0.2).sort((a, b) => b.length - a.length)[0];
  if (southEdge) {
    for (let i = 0; i < 6; i++) {
      const t = (i + 0.5) / 6;
      const x = southEdge.x0 + (southEdge.x1 - southEdge.x0) * t - southEdge.normal.x * 0.55;
      const z = southEdge.z0 + (southEdge.z1 - southEdge.z0) * t - southEdge.normal.z * 0.55;
      for (let v = 0; v < 7; v++) box(grilles, [x, 2.2 + v * 0.34, z], [2.0, 0.2, 0.1], southEdge.angle);
    }
  }
  merged(rear, windows, materials.windowBand, 'QueenElizabethStadiumPunchedWindows');
  merged(rear, frames, materials.mullion, 'QueenElizabethStadiumWindowFrames');
  merged(rear, grilles, materials.shutter, 'QueenElizabethStadiumLouvreGrilles');
  stats.qeStadiumPunchedWindows = windows.length;
  return rear;
}

// The real 4 m east setback is used as the service bay: roller shutters, a ramp with a balustrade and a small
// loading platform, matching the ramp passage recorded in the 2025 photographs.
function buildServiceBay(group, materials, stats) {
  const bay = new THREE.Group(); bay.name = 'QueenElizabethStadiumServiceBay'; group.add(bay);
  const shutters = [], frames = [], railing = [], ramp = [];
  const recess = RECESS.sort((a, b) => b.length - a.length)[0];
  if (!recess) return bay;
  const count = 3;
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const x = recess.x0 + (recess.x1 - recess.x0) * t - recess.normal.x * 0.55;
    const z = recess.z0 + (recess.z1 - recess.z0) * t - recess.normal.z * 0.55;
    box(shutters, [x, 2.1, z], [4.4, 4.2, 0.12], recess.angle);
    box(frames, [x, 4.35, z], [4.8, 0.4, 0.22], recess.angle);
  }
  // Ramp running up the recess with a tubular balustrade on its inside edge.
  const rampLength = recess.length - 6.0;
  const rampX = recess.mx - recess.normal.x * 1.9, rampZ = recess.mz - recess.normal.z * 1.9;
  box(ramp, [rampX, 0.35, rampZ], [rampLength, 0.7, 3.2], recess.angle);
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const px = recess.x0 + (recess.x1 - recess.x0) * t - recess.normal.x * 3.6;
    const pz = recess.z0 + (recess.z1 - recess.z0) * t - recess.normal.z * 3.6;
    cylinder(railing, [px, 1.15, pz], 0.05, 1.0, 6);
    if (i < 10) {
      const tx = recess.x0 + (recess.x1 - recess.x0) * ((i + 1) / 10) - recess.normal.x * 3.6;
      const tz = recess.z0 + (recess.z1 - recess.z0) * ((i + 1) / 10) - recess.normal.z * 3.6;
      beam(railing, [px, 1.62, pz], [tx, 1.62, tz], 0.07, 0.07);
      beam(railing, [px, 1.02, pz], [tx, 1.02, tz], 0.05, 0.05);
    }
  }
  merged(bay, shutters, materials.shutter, 'QueenElizabethStadiumRollerShutters');
  merged(bay, frames, materials.renderShadow, 'QueenElizabethStadiumShutterLintels');
  merged(bay, ramp, materials.plinth, 'QueenElizabethStadiumServiceRamp');
  merged(bay, railing, materials.mullion, 'QueenElizabethStadiumRampBalustrade');
  stats.qeStadiumServiceShutters = count;
  return bay;
}

// Roof plant: the louvre screeded plantroom and the four storey-height ventilation screens that give the hall its
// 33 m silhouette from Oi Kwan Road.
function buildRoofPlant(group, materials, stats) {
  const roof = new THREE.Group(); roof.name = 'QueenElizabethStadiumRoofPlant'; group.add(roof);
  const plant = [], screens = [], caps = [];
  const cx = (ringExtent.minX + ringExtent.maxX) / 2, cz = (ringExtent.minZ + ringExtent.maxZ) / 2;
  box(plant, [cx - 2, M.hallHeight + (M.plantHeight - M.hallHeight) / 2, cz + 2],
    [22, M.plantHeight - M.hallHeight, 14]);
  box(caps, [cx - 2, M.plantHeight + 0.15, cz + 2], [22.6, 0.3, 14.6]);
  for (let i = 0; i < 4; i++) {
    const y = M.hallHeight + 0.65 + i * 0.72;
    box(screens, [cx - 2, y, cz + 9.1], [21.4, 0.55, 0.35]);
    box(screens, [cx + 9.1, y, cz + 2], [0.35, 0.55, 13.4]);
  }
  merged(roof, plant, materials.render, 'QueenElizabethStadiumRoofPlantRoom');
  merged(roof, caps, materials.rib, 'QueenElizabethStadiumPlantRoomCoping');
  merged(roof, screens, materials.shutter, 'QueenElizabethStadiumRoofLouvreScreens');
  stats.qeStadiumRoofPlantHeight = M.plantHeight;
  return roof;
}

// Forecourt: paved apron inside the OSM ring, the Oi Kwan Road footway, kerbs, planters, flagpoles and street trees.
function buildForecourt(group, materials, stats) {
  const court = new THREE.Group(); court.name = 'QueenElizabethStadiumForecourt'; group.add(court);
  const paving = store(), kerbs = [], planters = [], poles = [], trunks = [], crowns = [];
  const shape = new THREE.Shape();
  shape.moveTo(RING[0], RING[1]);
  for (let i = 2; i + 1 < RING.length; i += 2) shape.lineTo(RING[i], RING[i + 1]);
  shape.closePath();
  quad(paving, [ringExtent.minX, 0.04, ringExtent.maxZ], [ringExtent.maxX, 0.04, ringExtent.maxZ],
    [ringExtent.maxX, 0.04, ringExtent.minZ], [ringExtent.minX, 0.04, ringExtent.minZ], C.paving);
  // Kerb along the Oi Kwan Road frontage, with the footway strip outside it.
  box(kerbs, [ENTRANCE_LOCAL_X, 0.12, NORTH_Z + 0.55], [ringExtent.maxX - ringExtent.minX, 0.26, 0.45]);
  box(kerbs, [ENTRANCE_LOCAL_X, 0.09, NORTH_Z + 1.35], [ringExtent.maxX - ringExtent.minX, 0.16, 1.4]);
  // Three flagpoles at the entrance, as in the frontage photographs.
  for (let i = 0; i < 3; i++) {
    const x = ENTRANCE_LOCAL_X + (i - 1) * 3.2;
    cylinder(poles, [x, 4.3, NORTH_Z + 0.95], 0.06, 8.6, 8);
  }
  // Street trees and planters along the frontage, kept clear of the entrance doors.
  const treeXs = [ringExtent.minX + 4.5, ringExtent.minX + 10.5, ringExtent.maxX - 6.0, ringExtent.maxX - 12.0];
  for (const x of treeXs) {
    box(planters, [x, 0.32, NORTH_Z + 1.2], [2.2, 0.64, 1.3]);
    cylinder(trunks, [x, 2.1, NORTH_Z + 1.2], 0.22, 3.2, 8);
    const crown = new THREE.SphereGeometry(1.85, 10, 7);
    crown.translate(x, 4.6, NORTH_Z + 1.2);
    crowns.push(crown);
  }
  merged(court, kerbs, materials.plinth, 'QueenElizabethStadiumKerbAndFootway');
  merged(court, planters, materials.renderShadow, 'QueenElizabethStadiumPlanters');
  merged(court, poles, materials.mullion, 'QueenElizabethStadiumFlagpoles');
  merged(court, trunks, materials.trunk, 'QueenElizabethStadiumTreeTrunks');
  merged(court, crowns, materials.leaf, 'QueenElizabethStadiumTreeCrowns');
  meshStore(court, paving, materials.paving, 'QueenElizabethStadiumForecourtPaving', false);
  stats.qeStadiumStreetTrees = treeXs.length;
  stats.qeStadiumFlagpoles = 3;
  return court;
}

export function buildQueenElizabethStadium(root, { groundOffset = 0 } = {}) {
  const stadium = new THREE.Group();
  stadium.name = 'QueenElizabethStadium';
  // The hall is authored in local metres; one placement puts it on the site inside the OSM ring.
  stadium.position.set(QE_STADIUM_SITE.x, groundOffset, QE_STADIUM_SITE.z);
  stadium.rotation.y = QE_STADIUM_SITE.ry;
  root.add(stadium);
  const materials = makeMaterials();
  const stats = {};
  buildForecourt(stadium, materials, stats);
  buildEnvelope(stadium, materials, stats);
  const frontage = buildFrontage(stadium, materials, stats);
  buildRearElevations(stadium, materials, stats);
  buildServiceBay(stadium, materials, stats);
  buildRoofPlant(stadium, materials, stats);

  // Colliders: the real stepped outline, so the recess and the chamfer stay walkable, plus the canopy columns.
  const colliders = harbourCityRingColliders(QE_STADIUM_SITE, groundOffset, groundOffset + M.hallHeight + M.parapet, 1.0);
  colliders.push(harbourCityLocalCollider(QE_STADIUM_SITE, ENTRANCE_LOCAL_X, NORTH_Z + 1.2, M.canopySpan, 4.8,
    groundOffset + M.canopyBase, groundOffset + M.canopyBase + M.canopyThickness));
  colliders.push(harbourCityLocalCollider(QE_STADIUM_SITE, (ringExtent.minX + ringExtent.maxX) / 2 - 2, 2,
    22, 14, groundOffset + M.hallHeight, groundOffset + M.plantHeight));

  const landmarks = [{
    id: 'queen-elizabeth-stadium', name: '伊利沙伯體育館 · Queen Elizabeth Stadium',
    position: { x: QE_STADIUM_SITE.x, y: groundOffset, z: QE_STADIUM_SITE.z },
    radius: 120, height: M.plantHeight, components: 1,
  }];

  Object.assign(stats, {
    qeStadiumGroundOffset: groundOffset,
    qeStadiumLandmarks: 1,
    qeStadiumInventoryId: 'HK-B0103',
    qeStadiumOsmWay: QE_STADIUM_OSM_SOURCE.id,
    qeStadiumOsmVersion: QE_STADIUM_OSM_SOURCE.version,
    qeStadiumRingArea: QE_STADIUM_SITE.ringArea,
    qeStadiumCapacity: QE_STADIUM_CAPACITY,
    qeStadiumArenaFloorSquareMetres: QE_STADIUM_ARENA_FLOOR_SQUARE_METRES,
    qeStadiumOpened: QE_STADIUM_OPENED,
    qeStadiumFoundationStone: QE_STADIUM_FOUNDATION_STONE,
    qeStadiumOpenedBy: QE_STADIUM_OPENED_BY,
    qeStadiumBuilder: QE_STADIUM_BUILDER,
    qeStadiumManager: QE_STADIUM_MANAGER,
    qeStadiumHallHeight: M.hallHeight,
    qeStadiumPlantHeight: M.plantHeight,
    qeStadiumGlazingHeight: M.glazingHeight,
    qeStadiumRibCount: M.ribCount,
    qeStadiumRibPitch: M.ribPitch,
    qeStadiumRibProjection: M.ribProjection,
    qeStadiumServiceBaySetback: M.eastRecessDepth,
    qeStadiumResearchSources: QE_STADIUM_RESEARCH_SOURCES.length,
    qeStadiumColliders: colliders.length,
    qeStadiumWallEdges: stats.qeStadiumWallEdges ?? 0,
  });

  const ground = groundOffset;
  return {
    group: stadium,
    colliders,
    landmarks,
    stats,
    groundOffset,
    hallHeight: M.hallHeight,
    plantHeight: M.plantHeight,
    entranceZ: NORTH_Z,
    frontageGlassZ: frontage.z,
    groundHeightAt(x, z, fallback) {
      // The whole OSM block and its footway are flat at the hall's own construction datum; outside it the DTM wins.
      return queenElizabethStadiumTerrainHeightAt(x, z, fallback, ground);
    },
  };
}
