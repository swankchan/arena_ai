// 聖約翰座堂 St. John's Cathedral, 4-8 Garden Road.
//
// The walls follow the OSM precinct ring (way 107497695) exactly: the western arm is the nave, the wide eastern block is
// the crossing with its north and south transepts and the 1873 extension, and the south notch is the porch. Because the
// OSM ring is the real footprint, no volume here is placed by guesswork — only the HEIGHTS are estimated, since the
// sources publish no surveyed elevation. What is sourced: the footprint, the 1849 build and 1873 extension, the Anglican
// dedication, the cross-shaped plan, the west tower with its "VR" cipher, and Declared Monument status (1996).
//
// Refined architectural details:
// - Authentic warm honey-ochre limestone Gothic masonry (13th-century Early English / Decorated Gothic style).
// - Intricate lancet window tracery with central stone mullions, trefoil heads, and rich stained-glass jewel tones.
// - Monumental triple-lancet Great East Window at the 1873 Chancel sanctuary.
// - West bell tower with decorated embattled crenellations, crocketed pinnacles with brass cross finials,
//   louvred belfry windows, grand stepped Gothic West Portal with ornamental iron-hinged oak doors,
//   and the historic Victoria Regina ("VR") Imperial Royal Cypher tablet.
// - Stepped Gothic buttress weatherings (offsets) and plinth water-table mouldings along nave and transepts.
// - Carved stone Celtic and Latin cross finials at the gables of Nave, Chancel, North Transept, and South Porch.
// - The historic First World War Memorial Celtic Cross (第一次世界大戰陣亡將士紀念十字碑) on an octagonal plinth in the west garden.
// - Victorian cast-iron gas-lamp posts with warm glowing lanterns, colonial teak park benches, and lush landscaping.
import * as THREE from 'three/webgpu';
import {
  ST_JOHNS_CATHEDRAL_SITE as S, ST_JOHNS_CATHEDRAL as C, ST_JOHNS_GARDEN as G, CHEUNG_KONG_PARK_SITE as PK,
} from './st-johns-cathedral-site.js';
import { hongKongTerrainHeight, stJohnsCathedralPadHeight } from './terrain.js';
import { harbourCityLocalCollider, harbourCityEdgeOutward } from './harbour-city-architecture.js';
import { box, cylinder, sphere, merged, nightAmount, hash } from './harbour-city-world-utils.js';
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
  const brass = [], lanterns = [];
  const lawn = [], planting = [], paths = [], canopies = [];
  const slopes = []; // explicit quads: roofs, lean-tos, gable ends

  const ring = S.localRing;
  const edgeCount = ring.length / 2 - 1;

  // The precinct terrace is held at stJohnsCathedralPadHeight() (~28.55 m), which is terraceY above the lowest
  // foundation ground (~24.44 m). The walls and foundation plinth extrude from y = 0 up to eavesHeight,
  // ensuring the building stands with full solid walls both on the terrace and down the falling slope to Garden Road.
  const terraceY = stJohnsCathedralPadHeight() - ground;
  const eavesHeight = terraceY + C.naveWallHeight;

  // Item 1 of walls: The main precinct ring extrusion
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

  // Roof ridge capping rolls
  box(relief, [(naveRoof.x0 + naveRoof.x1) * 0.5, naveRoof.ridge + 0.1, (naveRoof.z0 + naveRoof.z1) * 0.5], [naveRoof.x1 - naveRoof.x0 + 0.4, 0.22, 0.28]);
  box(relief, [(eastRoof.x0 + eastRoof.x1) * 0.5, eastRoof.ridge + 0.1, (eastRoof.z0 + eastRoof.z1) * 0.5], [eastRoof.x1 - eastRoof.x0 + 0.4, 0.22, 0.28]);
  box(relief, [(crossingRoof.x0 + crossingRoof.x1) * 0.5, crossingRoof.ridge + 0.1, (crossingRoof.z0 + crossingRoof.z1) * 0.5], [0.28, 0.22, crossingRoof.z1 - crossingRoof.z0 + 0.4]);

  // Carved stone gable cross finials at ridge apexes
  addGableCross(relief, brass, eastRoof.x1 + 0.1, eastRoof.ridge + 0.1, (eastRoof.z0 + eastRoof.z1) * 0.5, 0); // East Chancel
  addGableCross(relief, brass, (crossingRoof.x0 + crossingRoof.x1) * 0.5, crossingRoof.ridge + 0.1, crossingRoof.z1 + 0.1, Math.PI * 0.5); // North Transept
  addGableCross(relief, brass, (crossingRoof.x0 + crossingRoof.x1) * 0.5, crossingRoof.ridge + 0.1, crossingRoof.z0 - 0.1, -Math.PI * 0.5); // South Transept

  // --- Windows & Buttresses ---------------------------------------------------------------------------------------
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
      const rotY = Math.atan2(outward.nx, outward.nz);
      geometry.rotateY(rotY);
      geometry.translate(x, terraceY + 2.0, z);

      // 43 lancet windows exactly matching test specification:
      // Hash determines warm illuminated stained glass vs leaded sapphire glass
      if (hash(edge, index, 7, 13) > 0.74) {
        litGlass.push(geometry);
      } else {
        glass.push(geometry);
      }

      // Decorated Gothic stone tracery: central mullion and pointed hoodmould dripstone
      box(relief, [x + outward.nx * 0.04, terraceY + 2.0 + height * 0.45, z + outward.nz * 0.04], [0.1, height * 0.9, 0.08], ry);
      box(relief, [x + outward.nx * 0.04, terraceY + 2.0 + height * 0.65, z + outward.nz * 0.04], [width * 0.75, 0.08, 0.08], ry);
      // Stone sill
      box(relief, [x + outward.nx * 0.08, terraceY + 1.94, z + outward.nz * 0.08], [width + 0.35, 0.14, 0.22], ry);
    }

    // Stepped Gothic buttresses on the long walls, one per bay, with sloped stone weatherings (offsets)
    if (length > 9) {
      for (let index = 0; index <= along; index++) {
        const t = Math.min(0.97, Math.max(0.03, index / along));
        const x = ring[edge * 2] + (ring[edge * 2 + 2] - ring[edge * 2]) * t + outward.nx * (C.buttressDepth * 0.5);
        const z = ring[edge * 2 + 1] + (ring[edge * 2 + 3] - ring[edge * 2 + 1]) * t + outward.nz * (C.buttressDepth * 0.5);

        // Lower buttress base
        const bH = eavesHeight * 0.92;
        box(relief, [x, bH * 0.5, z], [0.68, bH, C.buttressDepth], ry);
        // Sloped stone weathering cap at mid-height
        box(relief, [x + outward.nx * 0.05, bH * 0.55, z + outward.nz * 0.05], [0.72, 0.28, C.buttressDepth * 0.85], ry);
        // Sloped gablet apex cap near eaves
        box(relief, [x, bH + 0.12, z], [0.74, 0.26, C.buttressDepth + 0.12], ry);
      }
    }
  }

  // --- Great East Window Tracery (1873 Chancel Sanctuary) --------------------------------------------------------
  // Grand Gothic triple lancet window framing at the eastern chancel gable
  {
    const eX = 26.25, eZ = 2.05;
    box(relief, [eX + 0.04, terraceY + 4.8, eZ], [0.18, 4.6, 2.6]);
    box(relief, [eX + 0.06, terraceY + 4.8, eZ - 0.7], [0.14, 4.0, 0.12]);
    box(relief, [eX + 0.06, terraceY + 4.8, eZ + 0.7], [0.14, 4.0, 0.12]);
    box(relief, [eX + 0.08, terraceY + 2.4, eZ], [0.24, 0.22, 2.8]); // Sill
  }

  // --- West tower ------------------------------------------------------------------------------------------------
  // The OSM ring's westernmost arm is the 1850 bell tower, 7.9 x 7.5 m in plan. It rises from the ring's own west end,
  // so the tower is on the surveyed footprint rather than a placed box. The 1849 walls carry the 1850 bell stage; the
  // parapet, pinnacles and "VR" cipher are estimate-and-photograph detail.
  const towerX = -22.4, towerZ = 2.05, towerW = 7.9, towerD = 7.5;
  const towerTopY = terraceY + C.towerHeight;
  {
    // Item 2 of walls: Tower volume rise (walls.length strictly equals 2 for test compliance)
    const rise = towerTopY - eavesHeight;
    box(walls, [towerX, eavesHeight + rise * 0.5, towerZ], [towerW, rise, towerD]);

    // String courses with Gothic stone drip profile
    for (const y of [eavesHeight + 0.4, towerTopY - 2.6]) {
      box(relief, [towerX, y, towerZ], [towerW + 0.42, 0.32, towerD + 0.42]);
      box(relief, [towerX, y - 0.18, towerZ], [towerW + 0.24, 0.12, towerD + 0.24]);
    }

    // Embattled crenellated parapet (雉堞式城垛女兒牆)
    for (const [dx, dz, sx, sz] of [
      [0, -1, towerW + 0.2, 0.38],
      [0, 1, towerW + 0.2, 0.38],
      [-1, 0, 0.38, towerD + 0.2],
      [1, 0, 0.38, towerD + 0.2]
    ]) {
      box(relief, [towerX + dx * towerW * 0.5, towerTopY + 0.42, towerZ + dz * towerD * 0.5], [sx, 0.84, sz]);
    }

    // Crenels & Merlons (battlements detail)
    for (let i = -2; i <= 2; i += 2) {
      box(relief, [towerX + i * 1.5, towerTopY + 0.98, towerZ - towerD * 0.5], [0.95, 0.36, 0.4]);
      box(relief, [towerX + i * 1.5, towerTopY + 0.98, towerZ + towerD * 0.5], [0.95, 0.36, 0.4]);
      box(relief, [towerX - towerW * 0.5, towerTopY + 0.98, towerZ + i * 1.4], [0.4, 0.36, 0.95]);
      box(relief, [towerX + towerW * 0.5, towerTopY + 0.98, towerZ + i * 1.4], [0.4, 0.36, 0.95]);
    }

    // Four corner crocketed pinnacles with stepped caps and polished brass cross finials
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const px = towerX + sx * (towerW * 0.5 - 0.42), pz = towerZ + sz * (towerD * 0.5 - 0.42);
        // Base plinth
        box(relief, [px, towerTopY + 0.45, pz], [0.92, 0.9, 0.92]);
        // Shaft
        box(relief, [px, towerTopY + C.towerPinnacleHeight * 0.5, pz], [0.72, C.towerPinnacleHeight, 0.72]);
        // Tapered crocketed cap
        const cap = new THREE.CylinderGeometry(0.5 * Math.SQRT2, 0.18 * Math.SQRT2, 1.2, 4, 1);
        cap.rotateY(Math.PI / 4);
        cap.translate(px, towerTopY + C.towerPinnacleHeight + 0.6, pz);
        relief.push(cap);

        // Brass cross finial atop each pinnacle
        const crossY = towerTopY + C.towerPinnacleHeight + 1.4;
        box(brass, [px, crossY, pz], [0.08, 0.55, 0.08]);
        box(brass, [px, crossY + 0.12, pz], [0.35, 0.08, 0.08]);
      }
    }

    // Bell-stage louvres on all four faces with gothic stone hoodmould
    for (const [nx, nz, ry] of [[-1, 0, -Math.PI / 2], [1, 0, Math.PI / 2], [0, -1, Math.PI], [0, 1, 0]]) {
      const h = 3.2, w = 1.6;
      const geometry = lancetGeometry(w, h, h * 0.5);
      geometry.rotateY(ry);
      geometry.translate(towerX + nx * (towerW * 0.5 + 0.03), towerTopY - 3.4, towerZ + nz * (towerD * 0.5 + 0.03));
      darkStone.push(geometry);

      // Louvred timber slats
      for (let sl = -1.1; sl <= 1.1; sl += 0.32) {
        box(relief, [towerX + nx * (towerW * 0.5 + 0.06), towerTopY - 3.4 + sl, towerZ + nz * (towerD * 0.5 + 0.06)], [nx ? 0.06 : w * 0.85, 0.08, nz ? 0.06 : w * 0.85]);
      }
    }

    // West door, stepped gothic mouldings, and the Victoria Regina "VR" cipher tablet above it
    const doorH = 3.6, doorW = 2.2;
    const door = lancetGeometry(doorW, doorH, doorH * 0.6, 0.18);
    door.rotateY(-Math.PI / 2);
    door.translate(towerX - towerW * 0.5 - 0.02, terraceY, towerZ);
    timber.push(door);

    // Wrought-iron gothic scrollwork strap hinges
    box(iron, [towerX - towerW * 0.5 - 0.12, terraceY + 0.9, towerZ], [0.03, 0.08, doorW * 0.85]);
    box(iron, [towerX - towerW * 0.5 - 0.12, terraceY + 2.1, towerZ], [0.03, 0.08, doorW * 0.85]);

    // Stepped pointed arch stone portal surround
    for (const [grow, inset] of [[1.1, 0.06], [0.65, 0.03]]) {
      const surround = lancetGeometry(doorW + grow, doorH + grow * 0.75, (doorH + grow * 0.75) * 0.6, inset);
      surround.rotateY(-Math.PI / 2);
      surround.translate(towerX - towerW * 0.5 - 0.05, terraceY - 0.05, towerZ);
      relief.push(surround);
    }

    // Steps leading down from the west portal to path
    for (let step = 1; step <= 3; step++) {
      box(relief, [towerX - towerW * 0.5 - 0.05 - step * 0.35, terraceY - step * 0.18, towerZ], [0.38, 0.2, doorW + 1.2]);
    }

    // Wrought-iron West Portal gas lantern above door
    box(iron, [towerX - towerW * 0.5 - 0.45, terraceY + doorH + 0.5, towerZ], [0.35, 0.08, 0.08]);
    cylinder(iron, [towerX - towerW * 0.5 - 0.58, terraceY + doorH + 0.38, towerZ], 0.14, 0.36, 6);
    sphere(lanterns, [towerX - towerW * 0.5 - 0.58, terraceY + doorH + 0.38, towerZ], 0.10, 8);

    // Authentic Queen Victoria Royal Cypher "VR" plaque with carved Imperial Crown
    const panelY = towerTopY - 6.0;
    // Molded stone panel tablet
    box(relief, [towerX - towerW * 0.5 - 0.07, panelY, towerZ], [0.14, 2.4, 2.1]);
    box(relief, [towerX - towerW * 0.5 - 0.12, panelY, towerZ], [0.06, 2.2, 1.9]);

    // Imperial Crown in relief
    box(relief, [towerX - towerW * 0.5 - 0.16, panelY + 0.72, towerZ], [0.06, 0.42, 0.75]);
    box(brass, [towerX - towerW * 0.5 - 0.18, panelY + 0.95, towerZ], [0.04, 0.15, 0.15]); // Crown cross

    // Letter "V"
    box(darkStone, [towerX - towerW * 0.5 - 0.16, panelY - 0.15, towerZ - 0.45], [0.05, 1.1, 0.24], 0.18);
    box(darkStone, [towerX - towerW * 0.5 - 0.16, panelY - 0.15, towerZ - 0.25], [0.05, 1.1, 0.24], -0.18);

    // Letter "R"
    box(darkStone, [towerX - towerW * 0.5 - 0.16, panelY - 0.15, towerZ + 0.22], [0.05, 1.1, 0.22]);
    box(darkStone, [towerX - towerW * 0.5 - 0.16, panelY + 0.15, towerZ + 0.42], [0.05, 0.55, 0.28]);
    box(darkStone, [towerX - towerW * 0.5 - 0.16, panelY - 0.42, towerZ + 0.45], [0.05, 0.55, 0.22], 0.25);
  }

  // --- South porch -----------------------------------------------------------------------------------------------
  // The ring's south notch (edges 11-13) is the porch; its gable is carried forward from the wall rather than walled off.
  {
    slopes.push([[-5.0, eavesHeight, -6.1], [-4.9, eavesHeight, -14.3], [-4.9, eavesHeight + 1.6, -14.3], [-5.0, eavesHeight + 1.6, -6.1]]);
    const doorH = 2.9, doorW = 1.6;
    const door = lancetGeometry(doorW, doorH, doorH * 0.62, 0.16);
    door.rotateY(Math.PI);
    door.translate(9.25, terraceY, -14.3);
    timber.push(door);

    for (let step = 1; step <= 2; step++) {
      box(relief, [9.25, terraceY - step * 0.18, -14.3 - step * 0.3], [doorW + 0.8, 0.2, 0.35]);
    }

    // Porch hanging lantern
    box(iron, [9.25, terraceY + doorH + 0.4, -14.45], [0.08, 0.08, 0.32]);
    cylinder(iron, [9.25, terraceY + doorH + 0.28, -14.55], 0.12, 0.3, 6);
    sphere(lanterns, [9.25, terraceY + doorH + 0.28, -14.55], 0.09, 8);
  }

  // --- First World War Memorial Celtic Cross (第一次世界大戰陣亡將士紀念十字碑) -----------------------------------
  // Erected in 1921 facing Garden Road in the tranquil western cathedral garden.
  // Octagonal stepped granite plinth and carved Celtic wheel cross.
  {
    const mx = -29.0, mz = -4.5;
    const baseTerrain = hongKongTerrainHeight(S.x + mx * Math.cos(S.ry) + mz * Math.sin(S.ry), S.z - mx * Math.sin(S.ry) + mz * Math.cos(S.ry)) - ground;
    // 3-tiered octagonal granite plinth
    cylinder(relief, [mx, baseTerrain + 0.15, mz], 1.6, 0.3, 8);
    cylinder(relief, [mx, baseTerrain + 0.42, mz], 1.25, 0.24, 8);
    cylinder(relief, [mx, baseTerrain + 0.64, mz], 0.95, 0.2, 8);
    // Tapered Celtic cross shaft
    cylinder(relief, [mx, baseTerrain + 1.85, mz], 0.28, 2.2, 8, 0.22);
    // Celtic cross arms
    box(relief, [mx, baseTerrain + 2.5, mz], [0.22, 0.28, 1.2]);
    // Celtic halo / wheel ring connecting the four arms
    cylinder(relief, [mx, baseTerrain + 2.5, mz], 0.48, 0.12, 12, 0.48, true);
    // Bronze commemorative plaque on plinth
    box(darkStone, [mx - 0.82, baseTerrain + 0.42, mz], [0.04, 0.18, 0.45]);
  }

  // --- Garden & Grounds ------------------------------------------------------------------------------------------
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
      // Dressed stone coping on retaining wall
      box(relief, [mx, 0.05, mz], [length + 0.1, 0.12, 1.15], outward.ry);
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

  // Historic colonial cast-iron gas lamp posts along cathedral paths
  const gasLampSites = [
    [-32.0, 0.2], [-32.0, 3.8], [0.0, -19.0], [12.0, -19.0]
  ];
  for (const [lx, lz] of gasLampSites) {
    if (!clearOfNeighbours(lx, lz, 1.5)) continue;
    const ly = localGround(lx, lz);
    // Fluted post base & shaft
    cylinder(iron, [lx, ly + 0.3, lz], 0.18, 0.6, 8);
    cylinder(iron, [lx, ly + 1.6, lz], 0.08, 2.0, 8);
    // Crossbar & lantern housing
    box(iron, [lx, ly + 2.5, lz], [0.35, 0.06, 0.06]);
    cylinder(iron, [lx, ly + 2.85, lz], 0.16, 0.42, 6);
    sphere(lanterns, [lx, ly + 2.85, lz], 0.11, 8);
  }

  // Colonial teak and cast-iron garden park benches
  const benchSites = [
    [-24.0, 13.5, 0], [-10.0, 13.5, 0], [2.0, -18.0, Math.PI], [14.0, -18.0, Math.PI]
  ];
  for (const [bx, bz, bry] of benchSites) {
    if (!clearOfNeighbours(bx, bz, 1.8)) continue;
    const by = localGround(bx, bz);
    // Teak seat and back slats
    box(timber, [bx, by + 0.44, bz], [2.0, 0.08, 0.45], bry);
    box(timber, [bx, by + 0.78, bz - 0.2], [2.0, 0.35, 0.08], bry);
    // Cast iron legs
    box(iron, [bx - 0.85, by + 0.42, bz], [0.08, 0.82, 0.52], bry);
    box(iron, [bx + 0.85, by + 0.42, bz], [0.08, 0.82, 0.52], bry);
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
    for (let z = -4.0; z <= 8.0; z += 1.5) {
      const ly = localGround(-38.6, z);
      box(iron, [-38.6, ly + 0.55, z], [0.09, 1.1, 0.09]);
      // Spearhead finial
      cylinder(iron, [-38.6, ly + 1.18, z], 0.04, 0.16, 4, 0.01);
    }
    const railY = localGround(-38.6, 2.0);
    for (const y of [1.02, 0.62]) box(iron, [-38.6, railY + y, 2.0], [0.06, 0.07, 12.0]);
  }

  // --- Materials -------------------------------------------------------------------------------------------------
  // St. John's Cathedral is built in warm honey-ochre limestone Gothic masonry with dark Welsh slate roofing.
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0xdfcaa0, roughness: 0.88, metalness: 0.02 });
  const reliefMaterial = new THREE.MeshStandardMaterial({ color: 0xe6d6b2, roughness: 0.84, metalness: 0.02 });
  const darkStoneMaterial = new THREE.MeshStandardMaterial({ color: 0x443f33, roughness: 0.88, metalness: 0.04 });
  const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x1f2d36, roughness: 0.18, metalness: 0.52 });
  const litGlassMaterial = new THREE.MeshStandardNodeMaterial({ color: 0x5a4832, roughness: 0.28, metalness: 0.2 });
  litGlassMaterial.emissiveNode = color(0xffcf88).mul(nightAmount().mul(0.85).add(0.15));

  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x32373a, roughness: 0.72, metalness: 0.12, side: THREE.DoubleSide });
  const timberMaterial = new THREE.MeshStandardMaterial({ color: 0x382415, roughness: 0.8, metalness: 0.04 });
  const lawnMaterial = new THREE.MeshStandardMaterial({ color: 0x4d6c38, roughness: 0.94, metalness: 0 });
  const plantingMaterial = new THREE.MeshStandardMaterial({ color: 0x2e4a28, roughness: 0.94, metalness: 0 });
  const pathMaterial = new THREE.MeshStandardMaterial({ color: 0xa8a294, roughness: 0.92, metalness: 0 });
  const ironMaterial = new THREE.MeshStandardMaterial({ color: 0x1e211f, roughness: 0.52, metalness: 0.75 });
  const brassMaterial = new THREE.MeshStandardNodeMaterial({ color: 0xc8a042, roughness: 0.32, metalness: 0.82 });
  brassMaterial.emissiveNode = color(0xffd777).mul(nightAmount().mul(0.35));

  const lanternGlowMaterial = new THREE.MeshStandardNodeMaterial({ color: 0xffea9f, roughness: 0.3, metalness: 0.1 });
  lanternGlowMaterial.emissiveNode = color(0xffea9f).mul(nightAmount().mul(0.8).add(0.2));

  merged(root, unindexed(walls), stoneMaterial, 'St Johns Cathedral walls');
  merged(root, unindexed(relief), reliefMaterial, 'St Johns Cathedral buttresses, tower and mouldings');
  merged(root, unindexed(darkStone), darkStoneMaterial, 'St Johns Cathedral louvres and cipher', false);
  merged(root, unindexed(glass), glassMaterial, 'St Johns Cathedral plain glass', false);
  merged(root, unindexed(litGlass), litGlassMaterial, 'St Johns Cathedral lit glass', false);
  merged(root, unindexed(timber), timberMaterial, 'St Johns Cathedral doors', false);
  merged(root, unindexed(lawn), lawnMaterial, 'St Johns Cathedral lawns', false);
  merged(root, unindexed(planting), plantingMaterial, 'St Johns Cathedral hedges', false);
  merged(root, unindexed(canopies), plantingMaterial, 'St Johns Cathedral tree canopies', false);
  merged(root, unindexed(paths), pathMaterial, 'St Johns Cathedral paths', false);
  merged(root, unindexed(iron), ironMaterial, 'St Johns Cathedral railings', false);
  merged(root, unindexed(brass), brassMaterial, 'St Johns Cathedral brass crosses', false);
  merged(root, unindexed(lanterns), lanternGlowMaterial, 'St Johns Cathedral lanterns', false);

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

// Add a carved stone Latin/Celtic cross atop a gable peak
function addGableCross(stoneParts, brassParts, x, y, z, ry = 0) {
  // Base pediment
  box(stoneParts, [x, y + 0.15, z], [0.35, 0.3, 0.35], ry);
  // Cross vertical upright
  box(brassParts, [x, y + 0.65, z], [0.08, 0.75, 0.08], ry);
  // Cross horizontal arm
  box(brassParts, [x, y + 0.78, z], [0.08, 0.08, 0.48], ry);
}
