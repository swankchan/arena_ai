// 美國銀行中心 Bank of America Tower, 12 Harcourt Road, Admiralty (金鐘夏慤道12號, 1977).
//
// The 146-metre 38-storey commercial landmark features a parallelogram geometry,
// bronze-tinted reflective glass curtain wall, bronze-anodized spandrels, 4-storey commercial
// podium with pedestrian skybridges, and an iconic illuminated rooftop corporate sign.
//
// OSM Relation: 17045256 / Way 107328020 (height: 146m).
import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  BANK_OF_AMERICA_TOWER_SITE as S,
  bankOfAmericaTowerLocalToWorld
} from './bank-of-america-tower-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';

export function buildBankOfAmericaTower(scene, options = {}) {
  const groundOffset = options.groundOffset ?? hongKongTerrainHeight(S.x, S.z);

  const root = new THREE.Group();
  root.name = 'Bank of America Tower — 美國銀行中心';
  root.position.set(S.x, groundOffset, S.z);
  root.rotation.y = S.ry;
  scene.add(root);

  // Collections for merged geometries
  const bronzeGlass = [];
  const litGlass = [];
  const bronzeSpandrels = [];
  const bronzeMullions = [];
  const granitePodium = [];
  const podiumGlass = [];
  const crownParts = [];
  const signageParts = [];
  const skybridgeParts = [];

  const w = S.w; // ~52.84m
  const d = S.d; // ~66.65m
  const podiumH = S.podiumHeight; // 16.0m
  const totalH = S.height; // 146.0m
  const crownH = S.crownHeight; // 12.0m
  const shaftTop = totalH - crownH; // 134.0m
  const shaftH = shaftTop - podiumH; // 118.0m

  // --- 1. Commercial Podium & Skybridges (0 to 16m) ------------------------------------------------------------
  {
    // Main podium mass
    box(granitePodium, [0, podiumH * 0.5, 0], [w - 2.0, podiumH, d - 2.0]);

    // Ground floor storefronts & bank lobby
    for (let floor = 0; floor < 3; floor++) {
      const fy = 1.0 + floor * 4.8;
      box(podiumGlass, [0, fy + 2.0, -d * 0.5 + 1.2], [w - 4.0, 3.6, 0.1]);
      box(podiumGlass, [0, fy + 2.0, d * 0.5 - 1.2], [w - 4.0, 3.6, 0.1]);
      for (let x = -w * 0.5 + 4.0; x <= w * 0.5 - 4.0; x += 4.2) {
        box(granitePodium, [x, fy + 2.0, -d * 0.5 + 1.1], [0.8, 4.0, 0.4]);
        box(granitePodium, [x, fy + 2.0, d * 0.5 - 1.1], [0.8, 4.0, 0.4]);
      }
    }

    // Harcourt Road Main Entrance Canopy
    box(bronzeSpandrels, [0, 4.8, -d * 0.5 - 1.2], [14.0, 0.4, 3.2]);
    box(podiumGlass, [0, 2.3, -d * 0.5 + 0.8], [6.0, 3.8, 0.2]);

    // Elevated Skybridge Connections:
    // 1) West Skybridge towards Cheung Kong Center II / Central (Level 2, y ~ 7.0m)
    box(skybridgeParts, [-w * 0.5 - 4.5, 7.0, 0], [9.0, 4.2, 4.0]);
    box(podiumGlass, [-w * 0.5 - 4.5, 7.2, 1.85], [8.6, 2.0, 0.1]);
    box(podiumGlass, [-w * 0.5 - 4.5, 7.2, -1.85], [8.6, 2.0, 0.1]);

    // 2) East Skybridge towards Far East Finance Centre (Level 2, y ~ 7.0m)
    box(skybridgeParts, [w * 0.5 + 4.5, 7.0, 0], [9.0, 4.2, 4.0]);
    box(podiumGlass, [w * 0.5 + 4.5, 7.2, 1.85], [8.6, 2.0, 0.1]);
    box(podiumGlass, [w * 0.5 + 4.5, 7.2, -1.85], [8.6, 2.0, 0.1]);
  }

  // --- 2. Main Tower Shaft: Parallelogram Bronze Curtain Wall (16m to 134m) -----------------------------------
  // 30 office storeys with bronze reflective glass and champagne anodized spandrels
  {
    const floors = 30;
    const floorH = shaftH / floors; // ~3.93m per storey
    const glassH = floorH * 0.60; // ~2.36m
    const spandrelH = floorH - glassH; // ~1.57m

    // Core structural mass inside the tower
    box(granitePodium, [0, podiumH + shaftH * 0.5, 0], [w - 6.0, shaftH, d - 6.0]);

    for (let f = 0; f < floors; f++) {
      const baseY = podiumH + f * floorH;
      const spandrelY = baseY + spandrelH * 0.5;
      const visionY = baseY + spandrelH + glassH * 0.5;

      // Spandrels
      box(bronzeSpandrels, [0, spandrelY, -d * 0.5 + 2.5], [w - 5.0, spandrelH, 0.2]);
      box(bronzeSpandrels, [0, spandrelY, d * 0.5 - 2.5], [w - 5.0, spandrelH, 0.2]);
      box(bronzeSpandrels, [-w * 0.5 + 2.5, spandrelY, 0], [0.2, spandrelH, d - 5.0]);
      box(bronzeSpandrels, [w * 0.5 - 2.5, spandrelY, 0], [0.2, spandrelH, d - 5.0]);

      // Vision glass (alternating lit and bronze reflective glass)
      const isLitNorth = hash(f, 1, 38) > 0.65;
      const isLitSouth = hash(f, 2, 38) > 0.65;
      const isLitEast = hash(f, 3, 38) > 0.65;
      const isLitWest = hash(f, 4, 38) > 0.65;

      box(isLitNorth ? litGlass : bronzeGlass, [0, visionY, -d * 0.5 + 2.5], [w - 5.2, glassH, 0.14]);
      box(isLitSouth ? litGlass : bronzeGlass, [0, visionY, d * 0.5 - 2.5], [w - 5.2, glassH, 0.14]);
      box(isLitEast ? litGlass : bronzeGlass, [w * 0.5 - 2.5, visionY, 0], [0.14, glassH, d - 5.2]);
      box(isLitWest ? litGlass : bronzeGlass, [-w * 0.5 + 2.5, visionY, 0], [0.14, glassH, d - 5.2]);
    }

    // Vertical extruded mullion fins
    const midShaftY = podiumH + shaftH * 0.5;
    for (let x = -w * 0.5 + 4.0; x <= w * 0.5 - 4.0; x += 2.6) {
      box(bronzeMullions, [x, midShaftY, -d * 0.5 + 2.35], [0.08, shaftH, 0.22]);
      box(bronzeMullions, [x, midShaftY, d * 0.5 - 2.35], [0.08, shaftH, 0.22]);
    }
    for (let z = -d * 0.5 + 4.0; z <= d * 0.5 - 4.0; z += 2.6) {
      box(bronzeMullions, [-w * 0.5 + 2.35, midShaftY, z], [0.22, shaftH, 0.08]);
      box(bronzeMullions, [w * 0.5 - 2.35, midShaftY, z], [0.22, shaftH, 0.08]);
    }
  }

  // --- 3. Crown & Mechanical Penthouse (134m to 146m) ---------------------------------------------------------
  // Stepped crown with louvres and iconic Bank of America rooftop illuminated sign
  {
    const crownBaseY = shaftTop;
    const cw = w - 10.0;
    const cd = d - 10.0;

    // Penthouse block
    box(crownParts, [0, crownBaseY + crownH * 0.5, 0], [cw, crownH, cd]);

    // Acoustic louvres on crown
    for (let y = crownBaseY + 1.2; y <= crownBaseY + crownH - 1.2; y += 0.7) {
      box(bronzeSpandrels, [0, y, cd * 0.5 + 0.1], [cw - 0.4, 0.22, 0.15]);
      box(bronzeSpandrels, [0, y, -cd * 0.5 - 0.1], [cw - 0.4, 0.22, 0.15]);
      box(bronzeSpandrels, [cw * 0.5 + 0.1, y, 0], [0.15, 0.22, cd - 0.4]);
      box(bronzeSpandrels, [-cw * 0.5 - 0.1, y, 0], [0.15, 0.22, cd - 0.4]);
    }

    // Parapet
    box(bronzeSpandrels, [0, totalH - 0.2, 0], [cw + 0.4, 0.4, cd + 0.4]);

    // Rooftop Signage: "Bank of America" Corporate Logo Sign
    const signY = crownBaseY + crownH * 0.55;
    // North sign (facing Victoria Harbour)
    box(crownParts, [0, signY, -cd * 0.5 - 0.2], [20.0, 3.6, 0.15]); // Backing plate
    // Bank of America red and blue logo bars
    box(signageParts, [-7.5, signY, -cd * 0.5 - 0.3], [2.8, 2.4, 0.12]);
    // English lettering bars
    for (let i = -4.5; i <= 8.5; i += 1.8) {
      box(bronzeMullions, [i, signY, -cd * 0.5 - 0.3], [1.3, 1.8, 0.1]);
    }

    // South sign (facing Central)
    box(crownParts, [0, signY, cd * 0.5 + 0.2], [20.0, 3.6, 0.15]);
    box(signageParts, [7.5, signY, cd * 0.5 + 0.3], [2.8, 2.4, 0.12]);
    for (let i = -8.5; i <= 4.5; i += 1.8) {
      box(bronzeMullions, [i, signY, cd * 0.5 + 0.3], [1.3, 1.8, 0.1]);
    }

    // Aviation obstruction lights at crown corners
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        cylinder(bronzeMullions, [sx * (cw * 0.5 - 0.3), totalH + 0.4, sz * (cd * 0.5 - 0.3)], 0.08, 0.8, 6);
        box(signageParts, [sx * (cw * 0.5 - 0.3), totalH + 0.85, sz * (cd * 0.5 - 0.3)], [0.22, 0.22, 0.22]);
      }
    }
  }

  // --- Materials Definition -----------------------------------------------------------------------------------
  // 1) Bronze Reflective Curtain Wall Glass
  const bronzeGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x4a3c2e,
    roughness: 0.15,
    metalness: 0.65,
  });

  // 2) Lit Office Glass
  const litGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x6e5842,
    roughness: 0.2,
    metalness: 0.45,
  });
  litGlassMat.emissiveNode = color(0xffe5aa).mul(nightAmount().mul(0.85).add(0.15));

  // 3) Bronze / Champagne Anodized Spandrels
  const bronzeSpandrelMat = new THREE.MeshStandardMaterial({
    color: 0x5c4a38,
    roughness: 0.35,
    metalness: 0.55,
  });

  // 4) Dark Bronze Vertical Mullions
  const bronzeMullionMat = new THREE.MeshStandardMaterial({
    color: 0x786450,
    roughness: 0.28,
    metalness: 0.82,
  });

  // 5) Polished Dark Granite (Podium)
  const graniteMat = new THREE.MeshStandardMaterial({
    color: 0x1c1e20,
    roughness: 0.52,
    metalness: 0.2,
  });

  // 6) Storefront Glass
  const podiumGlassMat = new THREE.MeshStandardMaterial({
    color: 0x253540,
    roughness: 0.12,
    metalness: 0.35,
  });

  // 7) Penthouse Crown Casing
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0x363028,
    roughness: 0.58,
    metalness: 0.55,
  });

  // 8) Bank of America Red/Blue Corporate Signage & Beacons
  const signageMat = new THREE.MeshStandardNodeMaterial({
    color: 0xd61b2c, // BofA Red
    roughness: 0.25,
    metalness: 0.5,
  });
  signageMat.emissiveNode = color(0xee2233).mul(nightAmount().mul(0.9).add(0.3));

  // 9) Skybridge Enclosure
  const skybridgeMat = new THREE.MeshStandardMaterial({
    color: 0x222628,
    roughness: 0.35,
    metalness: 0.5,
  });

  // Assemble meshes into root group
  merged(root, bronzeGlass, bronzeGlassMat, 'Bank of America Tower bronze reflective curtain wall');
  merged(root, litGlass, litGlassMat, 'Bank of America Tower lit office glazing');
  merged(root, bronzeSpandrels, bronzeSpandrelMat, 'Bank of America Tower bronze spandrel panels');
  merged(root, bronzeMullions, bronzeMullionMat, 'Bank of America Tower vertical mullion fins');
  merged(root, granitePodium, graniteMat, 'Bank of America Tower granite podium');
  merged(root, podiumGlass, podiumGlassMat, 'Bank of America Tower storefront glazing');
  merged(root, crownParts, crownMat, 'Bank of America Tower mechanical penthouse crown');
  merged(root, signageParts, signageMat, 'Bank of America Tower corporate signage and beacons');
  merged(root, skybridgeParts, skybridgeMat, 'Bank of America Tower pedestrian skybridges');

  // --- Colliders ---------------------------------------------------------------------------------------------
  const colliders = [
    // Main tower volume
    { name: 'Bank of America Tower Shaft', ...harbourCityLocalCollider(S, 0, 0, w - 5.0, d - 5.0, groundOffset + podiumH, groundOffset + totalH) },
    // Podium volume
    { name: 'Bank of America Tower Podium', ...harbourCityLocalCollider(S, 0, 0, w - 2.0, d - 2.0, groundOffset, groundOffset + podiumH) },
    // West Skybridge
    { name: 'Bank of America Tower West Skybridge', ...harbourCityLocalCollider(S, -w * 0.5 - 4.5, 0, 9.0, 4.0, groundOffset + 5.0, groundOffset + 9.5) },
    // East Skybridge
    { name: 'Bank of America Tower East Skybridge', ...harbourCityLocalCollider(S, w * 0.5 + 4.5, 0, 9.0, 4.0, groundOffset + 5.0, groundOffset + 9.5) },
  ];

  const landmark = {
    id: 'bank-of-america-tower',
    name: '美國銀行中心 Bank of America Tower',
    englishName: 'Bank of America Tower',
    position: { x: S.x, y: groundOffset, z: S.z },
    radius: Math.max(w, d) * 0.65,
    height: totalH,
  };

  return {
    group: root,
    colliders,
    landmarks: [landmark],
    stats: {
      boaHeight: totalH,
      boaStoreys: S.storeys,
      boaCurtainPanes: bronzeGlass.length + litGlass.length,
      boaSpandrels: bronzeSpandrels.length,
      bronzeMullions: bronzeMullions.length,
    },
    groundOffset,
  };
}
