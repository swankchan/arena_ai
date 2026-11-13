import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  TST_WATERFRONT_PROMENADE_SOURCE, TST_WATERFRONT_PROMENADE_CONFIG
} from './tst-waterfront-promenade-architecture.js';
import { tstWaterfrontRailingPath } from './tst-waterfront-railing-architecture.js';
import { hongKongTerrainHeight } from './terrain.js';
import { FULL_WORLD_HEIGHT } from './full-world.js';
import { fullRoadSurfaceAt } from './full-meta.js';
import { segmentWall } from './colliders.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { box, beam, cylinder, sphere, merged, nightAmount } from './harbour-city-world-utils.js';

const boxCollider = (minX, maxX, minZ, maxZ, minY, maxY) =>
  harbourCityLocalCollider({ x: 0, z: 0, ry: 0 }, (minX + maxX) * 0.5, (minZ + maxZ) * 0.5, maxX - minX, maxZ - minZ, minY, maxY);

// 尖沙咀天星碼頭海旁建築、有蓋行人道、文化中心兩層觀景台、星光大道及 3D 海堤工程
// Tsim Sha Tsui Waterfront Promenade, Covered Colonnade Walkways, Avenue of Stars & 3D Seawall
export function buildTstWaterfrontPromenade(scene, {
  groundHeightAt = (x, z) => hongKongTerrainHeight(x, z) + FULL_WORLD_HEIGHT.land,
} = {}) {
  const root = new THREE.Group();
  root.name = '尖沙咀海旁建築與星光大道海濱長廊 Tsim Sha Tsui Waterfront Promenade & Avenue of Stars';
  root.userData.source = TST_WATERFRONT_PROMENADE_SOURCE;
  scene.add(root);

  // Materials
  const graniteCoping = new THREE.MeshStandardMaterial({ color: 0x9b9a91, roughness: 0.82 });
  const seawallFace = new THREE.MeshStandardMaterial({ color: 0x585e5a, roughness: 0.88, metalness: 0.08 });
  const mooringBollard = new THREE.MeshStandardMaterial({ color: 0x222625, metalness: 0.85, roughness: 0.35 });
  const lifebuoyRed = new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.52 });
  const lifebuoyWhite = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.45 });
  const fenderWood = new THREE.MeshStandardMaterial({ color: 0x3e2f24, roughness: 0.92 });
  const fenderRubber = new THREE.MeshStandardMaterial({ color: 0x181a1a, roughness: 0.90 });

  const walkwayCanopy = new THREE.MeshStandardMaterial({ color: 0xe8e6dc, roughness: 0.75 });
  const walkwayFascia = new THREE.MeshStandardMaterial({ color: 0x223c32, roughness: 0.65, metalness: 0.25 });
  const walkwayColumn = new THREE.MeshStandardMaterial({ color: 0xd8d6cc, roughness: 0.80 });

  const culturalTile = new THREE.MeshStandardMaterial({ color: 0xcca890, roughness: 0.72 });
  const culturalDeck = new THREE.MeshStandardMaterial({ color: 0x8a6d54, roughness: 0.78 });
  const glassBalustrade = new THREE.MeshStandardMaterial({
    color: 0x8cb4b2, roughness: 0.18, metalness: 0.25, transparent: true, opacity: 0.45, depthWrite: false
  });

  const pavilionBronze = new THREE.MeshStandardMaterial({ color: 0x4a3b2c, metalness: 0.72, roughness: 0.38 });
  const pavilionTrellis = new THREE.MeshStandardMaterial({ color: 0x72543e, roughness: 0.82 });
  const woodSeating = new THREE.MeshStandardMaterial({ color: 0xa8845e, roughness: 0.75 });
  const bronzeStatue = new THREE.MeshStandardMaterial({ color: 0x3d352c, metalness: 0.75, roughness: 0.42 });

  // WebGPU TSL Night-illuminated materials
  const walkwayLightMat = new THREE.MeshStandardNodeMaterial({ color: 0xffe2b2, roughness: 0.48 });
  walkwayLightMat.emissiveNode = color(0xffd598).mul(nightAmount()).mul(1.85);

  const nauticalLightMat = new THREE.MeshStandardNodeMaterial({ color: 0x5dcbb4, roughness: 0.35 });
  nauticalLightMat.emissiveNode = color(0x3ea8be).mul(nightAmount()).mul(2.2);

  // Component geometry arrays
  const copings = [], seawall = [], bollards = [], buoys = [];
  const pierSteps = [], pierFenders = [], pierRails = [], pierCanopies = [];
  const sfWalkwayRoof = [], sfWalkwayColumns = [], sfWalkwaySoffit = [];
  const cultColumns = [], cultDeck = [], cultStairs = [], cultRails = [];
  const avenuePavilionPillars = [], avenuePavilionRoofs = [], avenuePavilionTrellis = [];
  const bleachers = [], handprintPlaques = [], statues = [];
  const warmLamps = [], nauticalBeacons = [];
  const colliders = [];

  // --- 1. Continuous 3D Seawall Revetment & Granite Coping (岸邊 3D 海堤) ---
  const samples = tstWaterfrontRailingPath().map((point) => {
    const y = groundHeightAt(point.x, point.z);
    const road = fullRoadSurfaceAt(point.x, point.z, 0.65, y);
    return { ...point, y, roadOpen: Boolean(road && Math.abs(road.height - y) < 2) };
  });

  let seawallSegmentsCount = 0, bollardsCount = 0, lifebuoysCount = 0;
  const bottomY = TST_WATERFRONT_PROMENADE_CONFIG.seawall.faceBottomY;

  for (let i = 0; i < samples.length - 1; i++) {
    const p = samples[i], next = samples[i + 1];
    if (p.roadOpen || next.roadOpen) continue;

    // Seaward coping points: offset outward from the railing towards the harbour edge
    const seawardDist = 0.95;
    const ax = p.x - p.nx * seawardDist, az = p.z - p.nz * seawardDist, ay = p.y;
    const bx = next.x - next.nx * seawardDist, bz = next.z - next.nz * seawardDist, by = next.y;

    // A. 3D Granite Seawall Coping Stone
    beam(copings, [ax, ay + 0.12, az], [bx, by + 0.12, bz], 0.55, 0.28);

    // B. Vertical Granite Seawall Face dropping down into Victoria Harbour
    const midY = (ay + by) * 0.5;
    const wallHeight = midY - bottomY;
    if (wallHeight > 0.5) {
      beam(seawall, [ax, midY - wallHeight * 0.5, az], [bx, midY - wallHeight * 0.5, bz], 0.48, wallHeight);
    }
    seawallSegmentsCount++;

    // C. Heavy Cast-Iron Mooring Bollards (spaced every ~24 m, roughly every 36 samples)
    if (i % 36 === 0) {
      const bxPos = ax + p.nx * 0.18, bzPos = az + p.nz * 0.18;
      cylinder(bollards, [bxPos, ay + 0.28, bzPos], 0.16, 0.55, 8, 0.19);
      cylinder(bollards, [bxPos, ay + 0.58, bzPos], 0.22, 0.08, 8);
      bollardsCount++;
    }

    // D. High-Visibility Lifebuoy Stations (spaced every ~48 m, roughly every 72 samples)
    if (i % 72 === 18) {
      const sx = ax + p.nx * 0.32, sz = az + p.nz * 0.32;
      // Stanchion post
      cylinder(pierRails, [sx, ay + 0.7, sz], 0.032, 1.4, 6);
      // Circular ring buoy
      cylinder(buoys, [sx, ay + 1.15, sz], 0.32, 0.12, 12, 0.32);
      cylinder(buoys, [sx, ay + 1.15, sz], 0.18, 0.14, 12, 0.18);
      box(buoys, [sx, ay + 0.55, sz], [0.22, 0.35, 0.14]); // rope cabinet
      lifebuoysCount++;
    }
  }

  // Seawall edge colliders (blocking vehicles and pedestrians from driving/plunging into harbour)
  let runStart = -1;
  for (let i = 0; i < samples.length - 1; i++) {
    const closed = !samples[i].roadOpen && !samples[i + 1].roadOpen;
    if (closed && runStart < 0) runStart = i;
    if (runStart >= 0 && (!closed || i - runStart >= 12 || i === samples.length - 2)) {
      const a = samples[runStart], b = samples[i + 1];
      const seawardDist = 0.95;
      const ax = a.x - a.nx * seawardDist, az = a.z - a.nz * seawardDist;
      const bx = b.x - b.nx * seawardDist, bz = b.z - b.nz * seawardDist;
      const wall = segmentWall(ax, az, bx, bz, { thickness: 0.35, base: Math.min(a.y, b.y) - 0.2, top: Math.max(a.y, b.y) + 1.2 });
      if (wall) colliders.push(wall);
      runStart = -1;
    }
  }

  // --- 2. Kowloon Public Pier No. 1–4 Landing Steps (九龍公眾碼頭公眾登岸梯級) ---
  for (const pier of TST_WATERFRONT_PROMENADE_CONFIG.publicPierSteps) {
    const py = groundHeightAt(pier.x, pier.z);
    // Landing cutouts & stone steps descending into Victoria Harbour
    const stepCount = pier.steps;
    for (let s = 0; s < stepCount; s++) {
      const stepTread = 0.42, stepRise = 0.22;
      const sy = py - s * stepRise;
      box(pierSteps, [pier.x, sy, pier.z + s * stepTread], [pier.width, stepRise, stepTread]);
    }
    // Timber rubbing fenders & rubber buffers
    for (const sx of [-pier.width * 0.5 - 0.2, pier.width * 0.5 + 0.2]) {
      cylinder(pierFenders, [pier.x + sx, py - 0.8, pier.z + 4.2], 0.18, 3.2, 8);
      cylinder(pierFenders, [pier.x + sx, py - 0.8, pier.z + 2.2], 0.16, 3.2, 8);
    }
    // Stainless safety handrails along the landing stairs
    for (const sx of [-pier.width * 0.5 + 0.15, pier.width * 0.5 - 0.15]) {
      beam(pierRails, [pier.x + sx, py + 0.85, pier.z], [pier.x + sx, py - stepCount * 0.22 + 0.85, pier.z + stepCount * 0.42], 0.05, 0.05);
    }
    // Overhead landing shelter canopy & nautical navigation night lantern
    box(pierCanopies, [pier.x, py + 3.2, pier.z - 0.8], [pier.width + 1.2, 0.24, 3.2]);
    cylinder(pierRails, [pier.x - pier.width * 0.5, py + 1.6, pier.z - 0.8], 0.08, 3.2, 8);
    cylinder(pierRails, [pier.x + pier.width * 0.5, py + 1.6, pier.z - 0.8], 0.08, 3.2, 8);
    box(nauticalBeacons, [pier.x, py + 3.45, pier.z + 0.5], [0.35, 0.35, 0.35]);

    colliders.push(boxCollider(pier.x - pier.width * 0.5 - 0.15, pier.x + pier.width * 0.5 + 0.15,
      pier.z - 1.2, pier.z + 4.5, py - 2.5, py + 3.8));
  }

  // --- 3. Star Ferry Pier Forecourt & Bus Terminus Covered Passenger Walkway (天星碼頭海旁有蓋通道) ---
  const sf = TST_WATERFRONT_PROMENADE_CONFIG.starFerryWalkway;
  const sfPoints = [
    [sf.startX, sf.startZ],
    [sf.midX, sf.midZ],
    [sf.endX, sf.endZ]
  ];

  for (let seg = 0; seg < sfPoints.length - 1; seg++) {
    const [ax, az] = sfPoints[seg], [bx, bz] = sfPoints[seg + 1];
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
    const nx = -dz / len, nz = dx / len;
    const bays = Math.max(1, Math.ceil(len / sf.columnSpacing));

    for (let b = 0; b <= bays; b++) {
      const t = b / bays;
      const cx = ax + dx * t, cz = az + dz * t;
      const cy = groundHeightAt(cx, cz);

      // Double row of structural columns supporting the canopy
      for (const side of [-1, 1]) {
        const colX = cx + nx * side * (sf.width * 0.5 - 0.25);
        const colZ = cz + nz * side * (sf.width * 0.5 - 0.25);
        box(sfWalkwayColumns, [colX, cy + sf.clearHeight * 0.5, colZ], [0.35, sf.clearHeight, 0.35]);
        colliders.push(boxCollider(colX - 0.25, colX + 0.25, colZ - 0.25, colZ + 0.25, cy, cy + sf.clearHeight + 0.4));
      }

      // Warm recessed downlights on the underside of the canopy
      if (b < bays) {
        const nextT = (b + 0.5) / bays;
        const lx = ax + dx * nextT, lz = az + dz * nextT;
        const ly = groundHeightAt(lx, lz);
        box(warmLamps, [lx, ly + sf.clearHeight - 0.04, lz], [0.45, 0.08, 0.45]);
      }
    }

    // Continuous flat cantilevered roof slab and dark green fascia
    const midX = (ax + bx) * 0.5, midZ = (az + bz) * 0.5;
    const midY = groundHeightAt(midX, midZ);
    beam(sfWalkwayRoof, [ax, midY + sf.clearHeight + 0.16, az], [bx, midY + sf.clearHeight + 0.16, bz], sf.width, sf.roofThickness);
    for (const side of [-1, 1]) {
      beam(sfWalkwaySoffit,
        [ax + nx * side * sf.width * 0.5, midY + sf.clearHeight + 0.16, az + nz * side * sf.width * 0.5],
        [bx + nx * side * sf.width * 0.5, midY + sf.clearHeight + 0.16, bz + nz * side * sf.width * 0.5],
        0.18, sf.roofThickness + 0.12);
    }
  }

  // --- 4. Cultural Centre Monumental Colonnade & 2-Level Viewing Promenade (文化中心兩層海旁觀景長廊) ---
  const cc = TST_WATERFRONT_PROMENADE_CONFIG.culturalColonnade;
  const ccDx = cc.endX - cc.startX, ccDz = cc.endZ - cc.startZ, ccLen = Math.hypot(ccDx, ccDz);
  const ccNx = -ccDz / ccLen, ccNz = ccDx / ccLen;
  const ccBays = Math.max(1, Math.ceil(ccLen / cc.columnSpacing));

  for (let b = 0; b <= ccBays; b++) {
    const t = b / ccBays;
    const cx = cc.startX + ccDx * t, cz = cc.startZ + ccDz * t;
    const cy = groundHeightAt(cx, cz);

    // Monumental angled ceramic-tiled columns along the harbour colonnade
    const colX = cx - ccNx * (cc.width * 0.5 - 0.4);
    const colZ = cz - ccNz * (cc.width * 0.5 - 0.4);
    box(cultColumns, [colX, cy + cc.deckHeight * 0.5, colZ], [cc.columnWidth, cc.deckHeight, cc.columnDepth]);
    colliders.push(boxCollider(colX - 0.5, colX + 0.5, colZ - 0.7, colZ + 0.7, cy, cy + cc.deckHeight + 1.2));

    // Rear colonnade piers
    const rearX = cx + ccNx * (cc.width * 0.5 - 0.4);
    const rearZ = cz + ccNz * (cc.width * 0.5 - 0.4);
    box(cultColumns, [rearX, cy + cc.deckHeight * 0.5, rearZ], [0.65, cc.deckHeight, 0.65]);

    // Recessed warm downlights illuminating the covered colonnade walkway
    if (b < ccBays) {
      const nextT = (b + 0.5) / ccBays;
      const lx = cc.startX + ccDx * nextT, lz = cc.startZ + ccDz * nextT;
      const ly = groundHeightAt(lx, lz);
      box(warmLamps, [lx, ly + cc.deckHeight - 0.05, lz], [0.65, 0.1, 0.65]);
    }
  }

  // Upper level public harbour viewing deck (兩層觀景平台)
  const ccMidX = (cc.startX + cc.endX) * 0.5, ccMidZ = (cc.startZ + cc.endZ) * 0.5;
  const ccMidY = groundHeightAt(ccMidX, ccMidZ);
  beam(cultDeck,
    [cc.startX, ccMidY + cc.deckHeight, cc.startZ],
    [cc.endX, ccMidY + cc.deckHeight, cc.endZ],
    cc.width, 0.45);

  // Upper deck glass & stainless steel safety balustrade
  for (const side of [-1, 1]) {
    beam(cultRails,
      [cc.startX + ccNx * side * cc.width * 0.5, ccMidY + cc.deckHeight + 0.65, cc.startZ + ccNz * side * cc.width * 0.5],
      [cc.endX + ccNx * side * cc.width * 0.5, ccMidY + cc.deckHeight + 0.65, cc.endZ + ccNz * side * cc.width * 0.5],
      0.12, 1.15);
  }

  // Monumental public staircases connecting ground to upper viewing deck at both ends
  for (const endPoint of [[cc.startX - 4.5, cc.startZ], [cc.endX + 4.5, cc.endZ]]) {
    const [sx, sz] = endPoint, sy = groundHeightAt(sx, sz);
    for (let s = 0; s < 18; s++) {
      const stY = sy + s * (cc.deckHeight / 18);
      box(cultStairs, [sx, stY, sz + s * 0.38], [cc.staircaseWidth, cc.deckHeight / 18, 0.45]);
    }
  }

  // --- 5. Avenue of Stars Wave Shade Canopies & Viewing Pavilions (星光大道波浪型遮蔭涼亭) ---
  for (const pav of TST_WATERFRONT_PROMENADE_CONFIG.avenuePavilions) {
    const sample = samples.find((p) => p.s >= pav.s) || samples[samples.length - 1];
    const px = sample.x + sample.nx * 2.8, pz = sample.z + sample.nz * 2.8;
    const py = groundHeightAt(px, pz);

    // Bronze architectural columns
    for (const dx of [-pav.length * 0.4, pav.length * 0.4]) {
      for (const dz of [-pav.width * 0.35, pav.width * 0.35]) {
        cylinder(avenuePavilionPillars, [px + dx, py + pav.height * 0.5, pz + dz], 0.16, pav.height, 8);
        colliders.push(boxCollider(px + dx - 0.25, px + dx + 0.25, pz + dz - 0.25, pz + dz + 0.25, py, py + pav.height));
      }
    }

    // Curved wave roof canopy
    box(avenuePavilionRoofs, [px, py + pav.height + 0.15, pz], [pav.length, 0.28, pav.width]);

    // Slat pergola louvers / timber trellis
    for (let l = -pav.length * 0.45; l <= pav.length * 0.45; l += 0.85) {
      box(avenuePavilionTrellis, [px + l, py + pav.height + 0.32, pz], [0.12, 0.18, pav.width + 0.4]);
    }

    // Built-in shaded teak wood seating platform
    box(bleachers, [px, py + 0.45, pz], [pav.length * 0.72, 0.45, pav.width * 0.55]);

    // Warm ceiling downlights
    box(warmLamps, [px, py + pav.height - 0.05, pz], [0.55, 0.08, 0.55]);
  }

  // --- 6. Avenue of Stars Tiered Wooden Bleachers & Statues (階梯看台與雕像廣場) ---
  for (const stat of TST_WATERFRONT_PROMENADE_CONFIG.statues) {
    const sample = samples.find((p) => p.s >= stat.s) || samples[samples.length - 1];
    const sx = sample.x + sample.nx * stat.offsetInland, sz = sample.z + sample.nz * stat.offsetInland;
    const sy = groundHeightAt(sx, sz);

    // Granite statue plinth
    box(cultStairs, [sx, sy + 0.45, sz], [2.4, 0.9, 2.4]);
    // Bronze commemorative statue likeness
    box(statues, [sx, sy + 1.8, sz], [0.85, 1.8, 0.65]);
    sphere(statues, [sx, sy + 2.85, sz], 0.28, 8);

    colliders.push(boxCollider(sx - 1.3, sx + 1.3, sz - 1.3, sz + 1.3, sy, sy + 3.2));
  }

  // Movie star handprint plaques along the Avenue of Stars balustrade
  for (let s = 480; s <= 1040; s += 16) {
    const sample = samples.find((p) => p.s >= s);
    if (!sample) continue;
    const hx = sample.x - sample.nx * 0.12, hz = sample.z - sample.nz * 0.12, hy = sample.y + 1.14;
    box(handprintPlaques, [hx, hy, hz], [0.38, 0.04, 0.28]);
  }

  // --- Merge All Geometries into Root Group ---
  merged(root, copings, graniteCoping, 'TST waterfront 3D granite seawall coping');
  merged(root, seawall, seawallFace, 'TST waterfront 3D vertical granite seawall face');
  merged(root, bollards, mooringBollard, 'TST waterfront cast iron mooring bollards');
  merged(root, buoys, lifebuoyRed, 'TST waterfront lifebuoy stations');

  merged(root, pierSteps, graniteCoping, 'TST Kowloon Public Pier landing steps');
  merged(root, pierFenders, fenderWood, 'TST Kowloon Public Pier timber fenders');
  merged(root, pierRails, walkwayColumn, 'TST Kowloon Public Pier marine safety handrails');
  merged(root, pierCanopies, walkwayCanopy, 'TST Kowloon Public Pier landing canopies');

  merged(root, sfWalkwayRoof, walkwayCanopy, 'TST Star Ferry covered passenger walkway roof');
  merged(root, sfWalkwayColumns, walkwayColumn, 'TST Star Ferry covered passenger walkway columns');
  merged(root, sfWalkwaySoffit, walkwayFascia, 'TST Star Ferry covered passenger walkway fascia trim');

  merged(root, cultColumns, culturalTile, 'Cultural Centre grand harbour colonnade tiled columns');
  merged(root, cultDeck, culturalDeck, 'Cultural Centre upper level harbour viewing deck');
  merged(root, cultStairs, graniteCoping, 'Cultural Centre waterfront public monumental stairs');
  merged(root, cultRails, glassBalustrade, 'Cultural Centre upper deck glass and steel balustrade');

  merged(root, avenuePavilionPillars, pavilionBronze, 'Avenue of Stars wave shade canopy bronze columns');
  merged(root, avenuePavilionRoofs, walkwayCanopy, 'Avenue of Stars wave shade canopy roofs');
  merged(root, avenuePavilionTrellis, pavilionTrellis, 'Avenue of Stars wave shade canopy timber trellis');

  merged(root, bleachers, woodSeating, 'Avenue of Stars tiered wooden seating bleachers');
  merged(root, handprintPlaques, pavilionBronze, 'Avenue of Stars movie star commemorative handprint plaques');
  merged(root, statues, bronzeStatue, 'Avenue of Stars commemorative bronze statues');

  merged(root, warmLamps, walkwayLightMat, 'TST waterfront covered walkway and pavilion night downlights', false);
  merged(root, nauticalBeacons, nauticalLightMat, 'TST Kowloon Public Pier nautical night navigation beacons', false);

  return {
    root,
    colliders,
    stats: {
      tstWaterfrontPromenadeLength: TST_WATERFRONT_PROMENADE_SOURCE.lengthMetres,
      tstWaterfrontSeawallSegments: seawallSegmentsCount,
      tstWaterfrontMooringBollards: bollardsCount,
      tstWaterfrontLifebuoyStations: lifebuoysCount,
      tstWaterfrontPublicPierSteps: TST_WATERFRONT_PROMENADE_CONFIG.publicPierSteps.length,
      tstWaterfrontStarFerryWalkwayBays: sfPoints.length - 1,
      tstWaterfrontCulturalColonnadeBays: ccBays,
      tstWaterfrontAvenuePavilions: TST_WATERFRONT_PROMENADE_CONFIG.avenuePavilions.length,
      tstWaterfrontAvenueStatues: TST_WATERFRONT_PROMENADE_CONFIG.statues.length,
      tstWaterfrontColliders: colliders.length,
      tstWaterfrontPhotoTextures: 0
    }
  };
}
