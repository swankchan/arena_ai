// 聖約翰座堂 St. John's Cathedral, 4-8 Garden Road.
//
// The walls follow the OSM precinct ring (way 107497695) exactly: the western arm is the nave, the wide eastern block is
// the crossing with its north and south transepts and the 1873 extension, and the south notch is the porch. Because the
// OSM ring is the real footprint, no volume here is placed by guesswork — only the HEIGHTS are estimated, since the
// sources publish no surveyed elevation. What is sourced: the footprint, the 1849 build and 1873 extension, the Anglican
// dedication, the cross-shaped plan, the west tower with its "VR" cipher, and Declared Monument status (1996).
import * as THREE from 'three/webgpu';
import {
  ST_JOHNS_CATHEDRAL_SITE as S, ST_JOHNS_CATHEDRAL as C, ST_JOHNS_GARDEN as G, CHEUNG_KONG_PARK_SITE as PK,
} from './st-johns-cathedral-site.js';
import { hongKongTerrainHeight, stJohnsCathedralPadHeight } from './terrain.js';
import { harbourCityLocalCollider, harbourCityEdgeOutward } from './harbour-city-architecture.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';
import { color } from 'three/tsl';

// A pointed (lancet) window, drawn once as a shape and reused. Returns non-indexed geometry because mergeGeometries
// refuses to mix indexed and non-indexed inputs, and ExtrudeGeometry is always non-indexed.
const LANCET_CACHE = new Map();
function lancetGeometry(width, height, springHeight, depth = 0.12) {
  const key = `${width}|${height}|${springHeight}|${depth}`;
  const cached = LANCET_CACHE.get(key);
  if (cached) return cached.clone();
  const half = width * 0.5, spring = Math.min(springHeight, height - half * 1.05);
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(-half, spring);
  shape.quadraticCurveTo(-half, spring + (height - spring) * 0.72, 0, height);
  shape.quadraticCurveTo(half, spring + (height - spring) * 0.72, half, spring);
  shape.lineTo(half, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 3 });
  geometry.translate(0, 0, -depth * 0.5);
  LANCET_CACHE.set(key, geometry);
  return geometry.clone();
}

// Boxes and cylinders arrive indexed; the merges below need one form throughout.
function unindexed(parts) {
  return parts.map((part) => {
    if (!part.index) return part;
    const flat = part.toNonIndexed();
    part.dispose();
    return flat;
  });
}

export function buildStJohnsCathedral(scene) {
  // The precinct terrace raises the interior to the pad height, but the mapped road corridors keep their own profile, so
  // the ground under the ring still steps down to 24.44 m at the Garden Road edge. The building is therefore founded at
  // the LOWEST ground under its own ring: the walls run down behind the terrace instead of floating over the road.
  let ground = Infinity;
  for (let i = 0; i < S.ring.length; i += 2) ground = Math.min(ground, hongKongTerrainHeight(S.ring[i], S.ring[i + 1]));

  // Neighbouring plots must stay clear: 長江公園 to the east and south-east, and 聖約翰座堂辦事處 (OSM way 107497702)
  // to the north-east. Both are separate OSM ways, so a garden drawn into either would be an invented encroachment.
  const localToWorld = (lx, lz) => {
    const cs = Math.cos(S.ry), sn = Math.sin(S.ry);
    return [S.x + lx * cs + lz * sn, S.z - lx * sn + lz * cs];
  };
  // The office ring, projected from the checked-in OSM way 107497702. Held in WORLD space, because the neighbouring
  // building does not share the cathedral's rotation.
  const OFFICE_RING = [
    34.35, 327.2, 28.5, 333.65, 39.49, 343.51, 32.71, 350.99, 34.85, 352.91, 33.03, 354.92,
    40.71, 361.81, 56.15, 344.78, 46.31, 335.98, 45.34, 337.05,
  ];
  const clearanceFromNeighbours = (lx, lz) => {
    const [x, z] = localToWorld(lx, lz);
    if (pointInRing(OFFICE_RING, x, z)) return 0;
    if (pointInRing(PK.ring, x, z)) return 0;
    return Math.min(distanceToRing(OFFICE_RING, x, z), distanceToRing(PK.ring, x, z));
  };
  const clearOfNeighbours = (lx, lz, margin = 1.5) => clearanceFromNeighbours(lx, lz) > margin;
  const root = new THREE.Group();
  root.name = "St John's Cathedral";
  root.position.set(S.x, ground, S.z);
  root.rotation.y = S.ry;
  scene.add(root);

  const walls = [], relief = [], darkStone = [], glass = [], litGlass = [], timber = [], iron = [];
  const lawn = [], planting = [], paths = [], canopies = [];
  const slopes = []; // explicit quads: roofs, lean-tos, gable ends

  const ring = S.localRing;
  const edgeCount = ring.length / 2 - 1;

  // The precinct terrace is held at stJohnsCathedralPadHeight() (~28.55 m), which is terraceY above the lowest
  // foundation ground (~24.44 m). The walls and foundation plinth extrude from y = 0 up to eavesHeight,
  // ensuring the building stands with full solid walls both on the terrace and down the falling slope to Garden Road.
  const terraceY = stJohnsCathedralPadHeight() - ground;
  const eavesHeight = terraceY + C.naveWallHeight;
  {
    const shape = new THREE.Shape();
    for (let i = 0; i < ring.length - 2; i += 2) {
      if (i === 0) shape.moveTo(ring[i], -ring[i + 1]);
      else shape.lineTo(ring[i], -ring[i + 1]);
    }
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: eavesHeight, bevelEnabled: false, curveSegments: 1 });
    geometry.rotateX(-Math.PI / 2);
    walls.push(geometry);
  }

  // --- Roofs -----------------------------------------------------------------------------------------------------
  // Pitched roofs resting exactly on the wall eaves at eavesHeight, sloping up to their ridge heights.
  const naveRoof = { x0: -26.3, x1: -6.0, z0: 1.0, z1: 10.1, ridge: terraceY + C.naveRidgeHeight };
  const eastRoof = { x0: 2.0, x1: 26.3, z0: -10.2, z1: 14.3, ridge: terraceY + C.chancelHeight + 4.2 };
  const crossingRoof = { x0: -6.0, x1: 2.0, z0: -14.3, z1: 14.3, ridge: terraceY + C.naveRidgeHeight + 0.6, along: 'z' };

  addPitchedRoof(slopes, naveRoof, eavesHeight, 'x');
  addPitchedRoof(slopes, eastRoof, eavesHeight, 'x');
  addPitchedRoof(slopes, crossingRoof, eavesHeight, 'z');

  // --- Windows ---------------------------------------------------------------------------------------------------
  // Lancet windows are placed on outward-facing mapped walls, positioned at sill level above the terrace floor.
  for (let edge = 0; edge < edgeCount; edge++) {
    const length = Math.hypot(ring[edge * 2 + 2] - ring[edge * 2], ring[edge * 2 + 3] - ring[edge * 2 + 1]);
    if (length < 4.0) continue; // short jogs are the plan's internal steps, not glazed walls
    const outward = harbourCityEdgeOutward(ring, edge);
    const ry = outward.ry;
    const along = Math.floor(length / C.bayWidth);
    for (let index = 0; index < along; index++) {
      const t = (index + 0.5) / along;
      const x = ring[edge * 2] + (ring[edge * 2 + 2] - ring[edge * 2]) * t + outward.nx * 0.03;
      const z = ring[edge * 2 + 1] + (ring[edge * 2 + 3] - ring[edge * 2 + 1]) * t + outward.nz * 0.03;
      const height = 2.5, width = 1.15;
      const geometry = lancetGeometry(width, height, height * 0.55);
      geometry.rotateY(Math.atan2(outward.nx, outward.nz));
      geometry.translate(x, terraceY + 2.0, z);
      (hash(edge, index, 7, 13) > 0.74 ? litGlass : glass).push(geometry);
    }
    // Buttresses on the long walls only, one per bay, stepping up from ground to near the eaves.
    if (length > 9) {
      for (let index = 0; index <= along; index++) {
        const t = Math.min(0.97, Math.max(0.03, index / along));
        const x = ring[edge * 2] + (ring[edge * 2 + 2] - ring[edge * 2]) * t + outward.nx * (C.buttressDepth * 0.5);
        const z = ring[edge * 2 + 1] + (ring[edge * 2 + 3] - ring[edge * 2 + 1]) * t + outward.nz * (C.buttressDepth * 0.5);
        box(relief, [x, eavesHeight * 0.45, z], [0.62, eavesHeight * 0.9, C.buttressDepth], ry);
      }
    }
  }

  // --- West tower ------------------------------------------------------------------------------------------------
  // The OSM ring's westernmost arm is the 1850 bell tower, 7.9 x 7.5 m in plan. It rises from the ring's own west end,
  // so the tower is on the surveyed footprint rather than a placed box. The 1849 walls carry the 1850 bell stage; the
  // parapet, pinnacles and "VR" cipher are estimate-and-photograph detail.
  const towerX = -22.4, towerZ = 2.05, towerW = 7.9, towerD = 7.5;
  const towerTopY = terraceY + C.towerHeight;
  {
    const rise = towerTopY - eavesHeight;
    box(walls, [towerX, eavesHeight + rise * 0.5, towerZ], [towerW, rise, towerD]);
    // String courses.
    for (const y of [eavesHeight + 0.4, towerTopY - 2.6]) box(relief, [towerX, y, towerZ], [towerW + 0.3, 0.28, towerD + 0.3]);
    // Parapet.
    for (const [dx, dz, sx, sz] of [[0, -1, towerW + 0.2, 0.34], [0, 1, towerW + 0.2, 0.34], [-1, 0, 0.34, towerD + 0.2], [1, 0, 0.34, towerD + 0.2]]) {
      box(relief, [towerX + dx * towerW * 0.5, towerTopY + 0.42, towerZ + dz * towerD * 0.5], [sx, 0.84, sz]);
    }
    // Four corner pinnacles: a square shaft and a tapered cap.
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const px = towerX + sx * (towerW * 0.5 - 0.42), pz = towerZ + sz * (towerD * 0.5 - 0.42);
        box(relief, [px, towerTopY + C.towerPinnacleHeight * 0.5, pz], [0.72, C.towerPinnacleHeight, 0.72]);
        const cap = new THREE.CylinderGeometry(0.5 * Math.SQRT2, 0.18 * Math.SQRT2, 1.0, 4, 1);
        cap.rotateY(Math.PI / 4);
        cap.translate(px, towerTopY + C.towerPinnacleHeight + 0.5, pz);
        relief.push(cap);
      }
    }
    // Bell-stage louvres on all four faces.
    for (const [nx, nz, ry] of [[-1, 0, -Math.PI / 2], [1, 0, Math.PI / 2], [0, -1, Math.PI], [0, 1, 0]]) {
      const h = 3.0, w = 1.5;
      const geometry = lancetGeometry(w, h, h * 0.5);
      geometry.rotateY(ry);
      geometry.translate(towerX + nx * (towerW * 0.5 + 0.03), towerTopY - 3.4, towerZ + nz * (towerD * 0.5 + 0.03));
      darkStone.push(geometry);
    }
    // West door, deeper moulding, and the "VR" tablet above it.
    const doorH = 3.5, doorW = 2.1;
    const door = lancetGeometry(doorW, doorH, doorH * 0.6, 0.18);
    door.rotateY(-Math.PI / 2);
    door.translate(towerX - towerW * 0.5 - 0.02, terraceY, towerZ);
    timber.push(door);
    for (const [grow, inset] of [[0.95, 0.04], [0.55, 0.02]]) {
      const surround = lancetGeometry(doorW + grow, doorH + grow * 0.75, (doorH + grow * 0.75) * 0.6, inset);
      surround.rotateY(-Math.PI / 2);
      surround.translate(towerX - towerW * 0.5 - 0.05, terraceY - 0.05, towerZ);
      relief.push(surround);
    }
    // Steps leading down from the west portal to path
    for (let step = 1; step <= 3; step++) {
      box(relief, [towerX - towerW * 0.5 - 0.05 - step * 0.35, terraceY - step * 0.18, towerZ], [0.38, 0.2, doorW + 1.2]);
    }
    const panelY = towerTopY - 6.0;
    box(relief, [towerX - towerW * 0.5 - 0.07, panelY, towerZ], [0.12, 2.1, 1.8]);
    box(darkStone, [towerX - towerW * 0.5 - 0.15, panelY, towerZ - 0.44], [0.05, 1.25, 0.34]);
    box(darkStone, [towerX - towerW * 0.5 - 0.15, panelY, towerZ + 0.44], [0.05, 1.25, 0.34]);
    box(darkStone, [towerX - towerW * 0.5 - 0.15, panelY, towerZ], [0.05, 0.95, 0.44]);
  }

  // --- South porch -----------------------------------------------------------------------------------------------
  // The ring's south notch (edges 11-13) is the porch; its gable is carried forward from the wall rather than walled off.
  {
    const porchX = -5.0, porchZ = -6.1;
    slopes.push([[-5.0, eavesHeight, -6.1], [-4.9, eavesHeight, -14.3], [-4.9, eavesHeight + 1.6, -14.3], [-5.0, eavesHeight + 1.6, -6.1]]);
    const doorH = 2.9, doorW = 1.6;
    void porchX; void porchZ;
    const door = lancetGeometry(doorW, doorH, doorH * 0.62, 0.16);
    door.rotateY(Math.PI);
    door.translate(9.25, terraceY, -14.3);
    timber.push(door);
    for (let step = 1; step <= 2; step++) {
      box(relief, [9.25, terraceY - step * 0.18, -14.3 - step * 0.3], [doorW + 0.8, 0.2, 0.35]);
    }
  }

  // --- Garden ----------------------------------------------------------------------------------------------------
  // "A small, rather dusty garden": a levelled precinct terrace cut into the slope, a low boundary wall, clipped hedges,
  // trees and the path from the west door out to Garden Road. Layout follows the published geography; it is not surveyed.
  const probes = [[-30, -16], [30, -16], [30, 16], [-30, 16], [0, -20], [0, 20]];
  let lowest = Infinity, highest = -Infinity;
  for (const [lx, lz] of probes) {
    const cs = Math.cos(S.ry), sn = Math.sin(S.ry);
    const h = hongKongTerrainHeight(S.x + lx * cs + lz * sn, S.z - lx * sn + lz * cs) - ground;
    if (h < lowest) lowest = h;
    if (h > highest) highest = h;
  }
  // Retaining wall on the downhill side, following the precinct edges that face the fall.
  const localGround = (lx, lz) => {
    const cs = Math.cos(S.ry), sn = Math.sin(S.ry);
    return hongKongTerrainHeight(S.x + lx * cs + lz * sn, S.z - lx * sn + lz * cs) - ground;
  };

  {
    const inset = 3.0;
    for (let edge = 0; edge < edgeCount; edge++) {
      const outward = harbourCityEdgeOutward(ring, edge);
      const length = outward.length;
      if (length < 6) continue;
      const mx = (ring[edge * 2] + ring[edge * 2 + 2]) * 0.5 + outward.nx * inset;
      const mz = (ring[edge * 2 + 1] + ring[edge * 2 + 3]) * 0.5 + outward.nz * inset;
      const cs = Math.cos(S.ry), sn = Math.sin(S.ry);
      const drop = hongKongTerrainHeight(S.x + mx * cs + mz * sn, S.z - mx * sn + mz * cs) - ground;
      if (drop > -1.2) continue; // only where the ground actually falls away
      box(walls, [mx, drop * 0.5 - 0.15, mz], [length, -drop + 0.3, 1.0], outward.ry);
    }
  }
  // Lawns, laid as individual panels so every one is clipped against the neighbouring plots rather than drawn over them.
  const lawnPanels = [
    [-20.0, 16.2], [-14.0, 16.2], [-8.0, 16.2], [-2.0, 16.2], [4.0, 16.2], [10.0, 16.2],
    [-20.0, -18.4], [-14.0, -18.4], [-8.0, -18.4], [-2.0, -18.4], [4.0, -18.4], [10.0, -18.4], [16.0, -18.4],
    [-31.0, -4.0], [-31.0, 2.0], [-31.0, 8.0],
  ];
  for (const [lx, lz] of lawnPanels) {
    if (!clearOfNeighbours(lx, lz, 2.0)) continue;
    const ly = localGround(lx, lz);
    box(lawn, [lx, ly + 0.04, lz], [6.0, 0.08, 6.6]);
  }
  // Path from the west door down to Garden Road, and a carriage sweep at the gate. The eastern path is clipped at the
  // office plot so it stops where the neighbouring building starts.
  box(paths, [-33.0, localGround(-33.0, 2.0) + 0.06, 2.0], [10.0, 0.10, G.pathWidth]);
  box(paths, [-38.2, localGround(-38.2, 2.0) + 0.06, 2.0], [4.2, 0.10, 12.0]);
  for (let lx = -2.0; lx <= 20.0; lx += 1.0) {
    if (!clearOfNeighbours(lx, -20.5, 1.4)) break;
    box(paths, [lx, localGround(lx, -20.5) + 0.06, -20.5], [1.05, 0.10, G.pathWidth]);
  }
  // Clipped hedges along the precinct edges, leaving a gate gap at the west front and stopping at the office plot.
  for (const [z, x0, x1] of [[17.6, -30, 22], [-17.8, -30, -12], [-17.8, 6, 22]]) {
    for (let x = x0; x <= x1; x += 2.0) {
      if (!clearOfNeighbours(x, z, 1.2)) continue;
      const ly = localGround(x, z);
      box(planting, [x, ly + G.hedgeHeight * 0.5, z], [1.9, G.hedgeHeight, 0.9]);
    }
  }
  // Trees, kept clear of the building, the lawns and the paths.
  for (const [lx, lz, scale] of [[-31, 11.5, 1.0], [-16, 15.2, 0.85], [-30, -13.5, 0.95], [18, 12.4, 0.9], [16, -12.6, 0.8], [-12, 15.4, 0.75], [-24, 15.0, 0.8]]) {
    if (!clearOfNeighbours(lx, lz, 2.6)) continue;
    const base = localGround(lx, lz);
    const trunk = 3.0 * scale;
    cylinder(canopies, [lx, base + trunk * 0.5, lz], 0.22 * scale, trunk, 8);
    for (const [ox, oy, oz, r] of [[0, trunk + 1.4 * scale, 0, 2.2 * scale], [0.9 * scale, trunk + 2.1 * scale, 0.4 * scale, 1.5 * scale], [-0.8 * scale, trunk + 1.9 * scale, -0.5 * scale, 1.4 * scale]]) {
      cylinder(canopies, [lx + ox, base + oy, lz + oz], r, r * 1.5, 9, r * 0.55);
    }
  }
  // Iron railing along the Garden Road frontage, open at the west door.
  {
    for (const [x, z, w, d] of [[-38.6, 2.0, 0.08, 0.08]]) void x, z, w, d;
    for (let z = -4.0; z <= 8.0; z += 1.5) {
      const ly = localGround(-38.6, z);
      box(iron, [-38.6, ly + 0.55, z], [0.09, 1.1, 0.09]);
    }
    const railY = localGround(-38.6, 2.0);
    for (const y of [1.02, 0.62]) box(iron, [-38.6, railY + y, 2.0], [0.06, 0.07, 12.0]);
  }

  // --- Materials -------------------------------------------------------------------------------------------------
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0xd8d0b8, roughness: 0.9, metalness: 0.02 });
  const darkStoneMaterial = new THREE.MeshStandardMaterial({ color: 0x555044, roughness: 0.92, metalness: 0.02 });
  const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x24333d, roughness: 0.2, metalness: 0.45 });
  const litGlassMaterial = new THREE.MeshStandardNodeMaterial({ color: 0x53606a, roughness: 0.3, metalness: 0.2 });
  litGlassMaterial.emissiveNode = color(0xffcf94).mul(nightAmount()).mul(0.6);
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x4b5150, roughness: 0.8, metalness: 0.14, side: THREE.DoubleSide });
  const timberMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3527, roughness: 0.84, metalness: 0.04 });
  const lawnMaterial = new THREE.MeshStandardMaterial({ color: 0x55713f, roughness: 0.95, metalness: 0 });
  const plantingMaterial = new THREE.MeshStandardMaterial({ color: 0x36512f, roughness: 0.94, metalness: 0 });
  const pathMaterial = new THREE.MeshStandardMaterial({ color: 0xa9a396, roughness: 0.93, metalness: 0 });
  const ironMaterial = new THREE.MeshStandardMaterial({ color: 0x2b2f2c, roughness: 0.55, metalness: 0.6 });

  merged(root, unindexed(walls), stoneMaterial, 'St Johns Cathedral walls');
  merged(root, unindexed(relief), stoneMaterial, 'St Johns Cathedral buttresses, tower and mouldings');
  merged(root, unindexed(darkStone), darkStoneMaterial, 'St Johns Cathedral louvres and cipher', false);
  merged(root, unindexed(glass), glassMaterial, 'St Johns Cathedral plain glass', false);
  merged(root, unindexed(litGlass), litGlassMaterial, 'St Johns Cathedral lit glass', false);
  merged(root, unindexed(timber), timberMaterial, 'St Johns Cathedral doors', false);
  merged(root, unindexed(lawn), lawnMaterial, 'St Johns Cathedral lawns', false);
  merged(root, unindexed(planting), plantingMaterial, 'St Johns Cathedral hedges', false);
  merged(root, unindexed(canopies), plantingMaterial, 'St Johns Cathedral tree canopies', false);
  merged(root, unindexed(paths), pathMaterial, 'St Johns Cathedral paths', false);
  merged(root, unindexed(iron), ironMaterial, 'St Johns Cathedral railings', false);

  if (slopes.length) {
    const positions = [], indices = [];
    for (const corners of slopes) {
      const base = positions.length / 3;
      for (const corner of corners) positions.push(corner[0], corner[1], corner[2]);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, roofMaterial);
    mesh.name = 'St Johns Cathedral roof slopes';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  // --- Colliders -------------------------------------------------------------------------------------------------
  // Box colliders approximate the cruciform mass so the player cannot walk through the walls; the outline lives in the
  // mesh. Heights are estimated with the roofs.
  const roofTop = Math.max(towerTopY + C.towerPinnacleHeight + 1.0, eastRoof.ridge);
  const colliders = [
    harbourCityLocalCollider(S, towerX, towerZ, towerW + 0.4, towerD + 0.4, ground, ground + roofTop),
    harbourCityLocalCollider(S, -16.0, 5.5, 20.6, 9.2, ground, ground + naveRoof.ridge),
    harbourCityLocalCollider(S, -3.0, 0.0, 8.0, 28.6, ground, ground + crossingRoof.ridge),
    harbourCityLocalCollider(S, 12.5, 2.0, 28.6, 24.5, ground, ground + eastRoof.ridge),
    harbourCityLocalCollider(S, 2.2, -10.2, 14.0, 8.2, ground, ground + naveRoof.ridge * 0.85),
  ];

  return {
    group: root,
    colliders,
    landmarks: [{
      id: 'st-johns-cathedral', name: "聖約翰座堂 St. John's Cathedral",
      position: { x: S.x, y: ground, z: S.z }, radius: 30, height: roofTop,
    }],
    stats: {
      stJohnsCathedralWindows: glass.length + litGlass.length,
      stJohnsCathedralWalls: walls.length,
      stJohnsCathedralTowerHeight: C.towerHeight + C.towerPinnacleHeight,
      stJohnsCathedralEavesHeight: eavesHeight,
      stJohnsCathedralTerraceFallM: Math.round((highest - lowest) * 100) / 100,
    },
    groundOffset: ground,
  };
}

// Point-in-polygon and point-to-edge distance over a flat world-space ring, used to keep the garden inside its own plot.
function pointInRing(ring, x, z) {
  const n = ring.length / 2 - 1;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i * 2], zi = ring[i * 2 + 1], xj = ring[j * 2], zj = ring[j * 2 + 1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function distanceToRing(ring, x, z) {
  const n = ring.length / 2 - 1;
  let best = Infinity;
  for (let i = 0; i < n; i++) {
    const ax = ring[i * 2], az = ring[i * 2 + 1], bx = ring[(i + 1) * 2], bz = ring[(i + 1) * 2 + 1];
    const dx = bx - ax, dz = bz - az, lengthSq = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}

// Two sloped planes meeting at a ridge line, closed at the gable ends. `along` selects the ridge direction.
function addPitchedRoof(out, { x0, x1, z0, z1, ridge }, eaveY, along) {
  if (along === 'x') {
    const zc = (z0 + z1) * 0.5;
    out.push([[x0, eaveY, z0], [x1, eaveY, z0], [x1, ridge, zc], [x0, ridge, zc]]);
    out.push([[x0, ridge, zc], [x1, ridge, zc], [x1, eaveY, z1], [x0, eaveY, z1]]);
    out.push([[x0, eaveY, z0], [x0, ridge, zc], [x0, ridge, zc], [x0, eaveY, z1]]);
    out.push([[x1, eaveY, z0], [x1, eaveY, z1], [x1, ridge, zc], [x1, ridge, zc]]);
  } else {
    const xc = (x0 + x1) * 0.5;
    out.push([[x0, eaveY, z0], [x0, eaveY, z1], [xc, ridge, z1], [xc, ridge, z0]]);
    out.push([[xc, ridge, z0], [xc, ridge, z1], [x1, eaveY, z1], [x1, eaveY, z0]]);
  }
}
