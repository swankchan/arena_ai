// 中信大廈 CITIC Tower, 1 Tim Mei Avenue, Tamar, Admiralty (金鐘添美道1號, 1997).
//
// The 126-metre 33-storey skyscraper designed by P&T Architects features a rounded equilateral
// triangular plan, sea-green/emerald reflective curtain wall, crisp white ceramic spandrels,
// circular entrance atrium, and illuminated red CITIC corporate logo signs on all 3 facades.
//
// OSM Way: 107353963 (height: 126m).
import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  CITIC_TOWER_SITE as S,
  citicTowerLocalToWorld
} from './citic-tower-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';

export function buildCiticTower(scene, options = {}) {
  const groundOffset = options.groundOffset ?? hongKongTerrainHeight(S.x, S.z);

  const root = new THREE.Group();
  root.name = 'CITIC Tower — 中信大廈';
  root.position.set(S.x, groundOffset, S.z);
  root.rotation.y = S.ry;
  scene.add(root);

  // Collections for merged geometries
  const emeraldGlass = [];
  const litGlass = [];
  const whiteSpandrels = [];
  const silverMullions = [];
  const podiumStone = [];
  const podiumGlass = [];
  const crownParts = [];
  const signageParts = [];

  const podiumH = S.podiumHeight; // 18.0m
  const totalH = S.height; // 126.0m
  const crownH = S.crownHeight; // 12.0m
  const shaftTop = totalH - crownH; // 114.0m
  const shaftH = shaftTop - podiumH; // 96.0m

  // The tower footprint in local coordinates is an equilateral triangle:
  // Base: z = -14.8m, running from x = -26.0 to x = +26.0
  // Apex: x = 0, z = +24.5m
  // The three faces are at angles:
  // Face 0: North face (z = -14.8m, facing harbour / Tamar park) -> normal = (0, -1)
  // Face 1: Southeast face (running from (0, 24.5) to (26.0, -14.8)) -> angle ~ +30 deg
  // Face 2: Southwest face (running from (-26.0, -14.8) to (0, 24.5)) -> angle ~ -30 deg

  // --- 1. Commercial Podium & Circular Atrium (0 to 18m) -------------------------------------------------------
  {
    // Triangular podium mass with rounded corners
    box(podiumStone, [0, podiumH * 0.5, -14.8 + 11.5], [48.0, podiumH, 22.0]);
    box(podiumStone, [0, podiumH * 0.5, 6.0], [32.0, podiumH, 18.0]);

    // Circular central entrance atrium (facing Tim Mei Avenue / South)
    cylinder(podiumStone, [0, podiumH * 0.5, 12.0], 12.5, podiumH, 24);
    cylinder(podiumGlass, [0, 8.0, 12.0], 12.6, 12.0, 24);

    // Entrance Porte-Cochère canopy
    box(whiteSpandrels, [0, 4.6, 23.5], [16.0, 0.4, 6.5]);
    cylinder(silverMullions, [-6.0, 2.3, 25.0], 0.35, 4.6, 12);
    cylinder(silverMullions, [6.0, 2.3, 25.0], 0.35, 4.6, 12);

    // Podium perimeter glazed ribbon
    for (let f = 0; f < 3; f++) {
      const fy = 2.0 + f * 5.0;
      box(podiumGlass, [0, fy + 2.0, -25.2], [46.0, 3.2, 0.1]);
      box(podiumGlass, [14.0, fy + 2.0, -2.0], [0.1, 3.2, 42.0], { rx: 0, ry: 0.58, rz: 0 });
      box(podiumGlass, [-14.0, fy + 2.0, -2.0], [0.1, 3.2, 42.0], { rx: 0, ry: -0.58, rz: 0 });
    }
  }

  // --- 2. Triangular Tower Shaft (18m to 114m) ----------------------------------------------------------------
  // 24 office storeys, 4.0m floor-to-floor
  {
    const floors = 24;
    const floorH = shaftH / floors; // 4.0m
    const glassH = 2.4;
    const spandrelH = floorH - glassH; // 1.6m

    // Inner core column
    cylinder(podiumStone, [0, podiumH + shaftH * 0.5, 0], 14.0, shaftH, 16);

    for (let f = 0; f < floors; f++) {
      const baseY = podiumH + f * floorH;
      const spandrelY = baseY + spandrelH * 0.5;
      const visionY = baseY + spandrelH + glassH * 0.5;

      // Face 0: North Face (parallel to x-axis at z ~ -24.8m, width ~ 46m)
      const isLit0 = hash(f, 0, 33) > 0.62;
      box(whiteSpandrels, [0, spandrelY, -24.8], [46.0, spandrelH, 0.2]);
      box(isLit0 ? litGlass : emeraldGlass, [0, visionY, -24.8], [45.8, glassH, 0.15]);

      // Face 1: Southeast Face (rotated ~ +33.4 deg, center at x ~ 13.0, z ~ 0.5, length ~ 46m)
      const isLit1 = hash(f, 1, 33) > 0.62;
      box(whiteSpandrels, [12.8, spandrelY, -0.2], [0.2, spandrelH, 46.0], { rx: 0, ry: 0.583, rz: 0 });
      box(isLit1 ? litGlass : emeraldGlass, [12.8, visionY, -0.2], [0.15, glassH, 45.8], { rx: 0, ry: 0.583, rz: 0 });

      // Face 2: Southwest Face (rotated ~ -33.4 deg, center at x ~ -13.0, z ~ 0.5, length ~ 46m)
      const isLit2 = hash(f, 2, 33) > 0.62;
      box(whiteSpandrels, [-12.8, spandrelY, -0.2], [0.2, spandrelH, 46.0], { rx: 0, ry: -0.583, rz: 0 });
      box(isLit2 ? litGlass : emeraldGlass, [-12.8, visionY, -0.2], [0.15, glassH, 45.8], { rx: 0, ry: -0.583, rz: 0 });
    }

    // Three Rounded Corner Column Shafts
    // Corner 0: Apex (x ~ 0, z ~ 23.5)
    // Corner 1: East (x ~ 24.5, z ~ -22.5)
    // Corner 2: West (x ~ -24.5, z ~ -22.5)
    const midY = podiumH + shaftH * 0.5;
    cylinder(whiteSpandrels, [0, midY, 23.5], 2.8, shaftH, 16);
    cylinder(whiteSpandrels, [24.5, midY, -22.5], 2.8, shaftH, 16);
    cylinder(whiteSpandrels, [-24.5, midY, -22.5], 2.8, shaftH, 16);

    // Vertical structural mullions along the facades
    for (let x = -20.0; x <= 20.0; x += 3.2) {
      box(silverMullions, [x, midY, -24.9], [0.08, shaftH, 0.2]);
    }
  }

  // --- 3. Crown & Penthouse (114m to 126m) ---------------------------------------------------------------------
  // Stepped triangular mechanical penthouse with illuminated red CITIC (中信) corporate logos
  {
    const crownBase = shaftTop;
    const ch = crownH;

    // Stepped penthouse
    cylinder(crownParts, [0, crownBase + ch * 0.5, -1.0], 18.0, ch, 3);
    cylinder(crownParts, [0, crownBase + ch * 0.75, -1.0], 12.0, ch * 0.5, 3);

    // Mechanical louvres bands
    for (let y = crownBase + 1.2; y <= crownBase + ch - 1.2; y += 0.8) {
      box(silverMullions, [0, y, -18.2], [32.0, 0.22, 0.15]);
      box(silverMullions, [9.0, y, 1.2], [0.15, 0.22, 32.0], { rx: 0, ry: 0.583, rz: 0 });
      box(silverMullions, [-9.0, y, 1.2], [0.15, 0.22, 32.0], { rx: 0, ry: -0.583, rz: 0 });
    }

    // Three illuminated Red CITIC Corporate Logo Roundels (facing N, SE, SW)
    const logoY = crownBase + ch * 0.55;
    // North Logo (facing Victoria Harbour)
    cylinder(signageParts, [0, logoY, -18.4], 2.6, 0.25, 24, { rx: Math.PI / 2, ry: 0, rz: 0 });
    box(silverMullions, [0, logoY, -18.55], [3.2, 0.45, 0.1]); // CITIC cross bar
    box(silverMullions, [0, logoY, -18.55], [0.45, 3.2, 0.1]);

    // Southeast Logo (facing Wan Chai)
    cylinder(signageParts, [10.2, logoY, 1.5], 2.6, 0.25, 24, { rx: Math.PI / 2, ry: 0, rz: -0.583 });
    box(silverMullions, [10.3, logoY, 1.6], [2.8, 0.45, 0.1], { rx: 0, ry: 0.583, rz: 0 });

    // Southwest Logo (facing Central)
    cylinder(signageParts, [-10.2, logoY, 1.5], 2.6, 0.25, 24, { rx: Math.PI / 2, ry: 0, rz: 0.583 });
    box(silverMullions, [-10.3, logoY, 1.6], [2.8, 0.45, 0.1], { rx: 0, ry: -0.583, rz: 0 });

    // 3 Aviation obstruction warning lights at triangle corners
    const corners = [
      [0, 23.5],
      [24.5, -22.5],
      [-24.5, -22.5]
    ];
    for (const [cx, cz] of corners) {
      cylinder(silverMullions, [cx, totalH + 0.5, cz], 0.08, 1.0, 6);
      box(signageParts, [cx, totalH + 1.05, cz], [0.22, 0.22, 0.22]);
    }
  }

  // --- Materials Definition -----------------------------------------------------------------------------------
  // 1) Sea-Green / Emerald Reflective Curtain Wall Glass
  const emeraldGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x1e4c44,
    roughness: 0.15,
    metalness: 0.65,
  });

  // 2) Lit Office Glass
  const litGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x42685e,
    roughness: 0.2,
    metalness: 0.45,
  });
  litGlassMat.emissiveNode = color(0xfff0cc).mul(nightAmount().mul(0.85).add(0.15));

  // 3) Pure White / Silver Ceramic Spandrel Bands
  const whiteSpandrelMat = new THREE.MeshStandardMaterial({
    color: 0xe0e8e6,
    roughness: 0.32,
    metalness: 0.35,
  });

  // 4) Silver Anodized Vertical Mullions
  const silverMullionMat = new THREE.MeshStandardMaterial({
    color: 0xcfd8d6,
    roughness: 0.25,
    metalness: 0.85,
  });

  // 5) Polished Granite Podium & Cores
  const podiumStoneMat = new THREE.MeshStandardMaterial({
    color: 0x242e2c,
    roughness: 0.52,
    metalness: 0.25,
  });

  // 6) Storefront Glass
  const podiumGlassMat = new THREE.MeshStandardMaterial({
    color: 0x223832,
    roughness: 0.12,
    metalness: 0.35,
  });

  // 7) Penthouse Crown Casing
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0x283432,
    roughness: 0.55,
    metalness: 0.55,
  });

  // 8) CITIC Red Corporate Roundel Logos & Beacons
  const signageMat = new THREE.MeshStandardNodeMaterial({
    color: 0xcc1122, // CITIC Red
    roughness: 0.25,
    metalness: 0.5,
  });
  signageMat.emissiveNode = color(0xee2233).mul(nightAmount().mul(0.92).add(0.28));

  // Assemble meshes into root group
  merged(root, emeraldGlass, emeraldGlassMat, 'CITIC Tower emerald reflective curtain wall');
  merged(root, litGlass, litGlassMat, 'CITIC Tower lit office glazing');
  merged(root, whiteSpandrels, whiteSpandrelMat, 'CITIC Tower white ceramic spandrels');
  merged(root, silverMullions, silverMullionMat, 'CITIC Tower silver mullion fins');
  merged(root, podiumStone, podiumStoneMat, 'CITIC Tower granite podium');
  merged(root, podiumGlass, podiumGlassMat, 'CITIC Tower podium storefront glazing');
  merged(root, crownParts, crownMat, 'CITIC Tower mechanical penthouse crown');
  merged(root, signageParts, signageMat, 'CITIC Tower corporate roundel signage and beacons');

  // --- Colliders ---------------------------------------------------------------------------------------------
  const colliders = [
    // Main triangular shaft volume
    { name: 'CITIC Tower Shaft', ...harbourCityLocalCollider(S, 0, 0, S.w - 4.0, S.d - 4.0, groundOffset + podiumH, groundOffset + totalH) },
    // Podium volume
    { name: 'CITIC Tower Podium', ...harbourCityLocalCollider(S, 0, 0, S.w - 1.0, S.d - 1.0, groundOffset, groundOffset + podiumH) },
  ];

  const landmark = {
    id: 'citic-tower',
    name: '中信大廈 CITIC Tower',
    englishName: 'CITIC Tower',
    position: { x: S.x, y: groundOffset, z: S.z },
    radius: Math.max(S.w, S.d) * 0.65,
    height: totalH,
  };

  return {
    group: root,
    colliders,
    landmarks: [landmark],
    stats: {
      citicHeight: totalH,
      citicStoreys: S.storeys,
      citicCurtainPanes: emeraldGlass.length + litGlass.length,
      citicSpandrels: whiteSpandrels.length,
      citicMullions: silverMullions.length,
    },
    groundOffset,
  };
}
