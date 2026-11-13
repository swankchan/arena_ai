// 中國建設銀行大廈 CCB Tower, 3 Connaught Road Central, Central (中環干諾道中3號, 2012).
//
// The 135-metre 31-storey contemporary landmark designed by Aedas features a faceted
// dark blue-grey Low-E reflective curtain wall, silver-anodized mullion fins, grand banking hall
// podium, and an illuminated rooftop China Construction Bank corporate logo crown.
//
// OSM Way: 242113651 (height: 135m).
import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  CCB_TOWER_SITE as S,
  ccbTowerLocalToWorld
} from './ccb-tower-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';

export function buildCcbTower(scene, options = {}) {
  const groundOffset = options.groundOffset ?? hongKongTerrainHeight(S.x, S.z);

  const root = new THREE.Group();
  root.name = 'CCB Tower — 中國建設銀行大廈';
  root.position.set(S.x, groundOffset, S.z);
  root.rotation.y = S.ry;
  scene.add(root);

  // Collections for merged geometries
  const blueGreyGlass = [];
  const litGlass = [];
  const darkSpandrels = [];
  const silverMullions = [];
  const granitePodium = [];
  const podiumGlass = [];
  const crownParts = [];
  const signageParts = [];

  const w = S.w; // ~44.91m
  const d = S.d; // ~25.69m
  const podiumH = S.podiumHeight; // 14.0m
  const totalH = S.height; // 135.0m
  const crownH = S.crownHeight; // 13.0m
  const shaftTop = totalH - crownH; // 122.0m
  const shaftH = shaftTop - podiumH; // 108.0m

  // --- 1. Grand Banking Hall Podium (0 to 14m) -----------------------------------------------------------------
  {
    // Granite podium perimeter pillars and core
    box(granitePodium, [0, podiumH * 0.5, 0], [w - 1.5, podiumH, d - 1.5]);

    // Storefront double-height banking hall glazing
    box(podiumGlass, [0, 6.0, -d * 0.5 + 0.6], [w - 3.2, 10.5, 0.1]);
    box(podiumGlass, [0, 6.0, d * 0.5 - 0.6], [w - 3.2, 10.5, 0.1]);

    // Expressive granite framing portals
    for (let x = -w * 0.5 + 3.5; x <= w * 0.5 - 3.5; x += 5.2) {
      box(granitePodium, [x, 6.0, -d * 0.5 + 0.5], [0.9, 12.0, 0.4]);
      box(granitePodium, [x, 6.0, d * 0.5 - 0.5], [0.9, 12.0, 0.4]);
    }

    // Connaught Road Central Main Entrance Canopy
    box(silverMullions, [0, 4.2, -d * 0.5 - 1.4], [12.0, 0.35, 3.2]);
    cylinder(silverMullions, [-5.0, 2.1, -d * 0.5 - 2.6], 0.15, 4.2, 8);
    cylinder(silverMullions, [5.0, 2.1, -d * 0.5 - 2.6], 0.15, 4.2, 8);
  }

  // --- 2. Main Tower Shaft (14m to 122m) ----------------------------------------------------------------------
  // 27 office storeys, 4.0m floor-to-floor
  {
    const floors = 27;
    const floorH = shaftH / floors; // 4.0m
    const glassH = 2.6;
    const spandrelH = floorH - glassH; // 1.4m

    // Inner concrete core
    box(granitePodium, [0, podiumH + shaftH * 0.5, 0], [w - 6.0, shaftH, d - 6.0]);

    for (let f = 0; f < floors; f++) {
      const baseY = podiumH + f * floorH;
      const spandrelY = baseY + spandrelH * 0.5;
      const visionY = baseY + spandrelH + glassH * 0.5;

      // Dark horizontal spandrel bands
      box(darkSpandrels, [0, spandrelY, -d * 0.5 + 1.2], [w - 2.2, spandrelH, 0.2]);
      box(darkSpandrels, [0, spandrelY, d * 0.5 - 1.2], [w - 2.2, spandrelH, 0.2]);
      box(darkSpandrels, [-w * 0.5 + 1.2, spandrelY, 0], [0.2, spandrelH, d - 2.2]);
      box(darkSpandrels, [w * 0.5 - 1.2, spandrelY, 0], [0.2, spandrelH, d - 2.2]);

      // Vision glazing
      const isLitNorth = hash(f, 1, 31) > 0.65;
      const isLitSouth = hash(f, 2, 31) > 0.65;
      const isLitEast = hash(f, 3, 31) > 0.65;
      const isLitWest = hash(f, 4, 31) > 0.65;

      box(isLitNorth ? litGlass : blueGreyGlass, [0, visionY, -d * 0.5 + 1.2], [w - 2.4, glassH, 0.14]);
      box(isLitSouth ? litGlass : blueGreyGlass, [0, visionY, d * 0.5 - 1.2], [w - 2.4, glassH, 0.14]);
      box(isLitEast ? litGlass : blueGreyGlass, [w * 0.5 - 1.2, visionY, 0], [0.14, glassH, d - 2.4]);
      box(isLitWest ? litGlass : blueGreyGlass, [-w * 0.5 + 1.2, visionY, 0], [0.14, glassH, d - 2.4]);
    }

    // Vertical extruded mullion fins
    const midShaftY = podiumH + shaftH * 0.5;
    for (let x = -w * 0.5 + 2.5; x <= w * 0.5 - 2.5; x += 2.4) {
      box(silverMullions, [x, midShaftY, -d * 0.5 + 1.05], [0.08, shaftH, 0.25]);
      box(silverMullions, [x, midShaftY, d * 0.5 - 1.05], [0.08, shaftH, 0.25]);
    }
    for (let z = -d * 0.5 + 2.5; z <= d * 0.5 - 2.5; z += 2.4) {
      box(silverMullions, [-w * 0.5 + 1.05, midShaftY, z], [0.25, shaftH, 0.08]);
      box(silverMullions, [w * 0.5 - 1.05, midShaftY, z], [0.25, shaftH, 0.08]);
    }
  }

  // --- 3. Crown & Mechanical Penthouse (122m to 135m) ---------------------------------------------------------
  // Symmetrical stepped crown with acoustic louvres, CCB corporate logo signage, and beacons
  {
    const crownBaseY = shaftTop;
    const cw = w - 6.0;
    const cd = d - 5.0;

    // Penthouse block
    box(crownParts, [0, crownBaseY + crownH * 0.5, 0], [cw, crownH, cd]);

    // Acoustic louvre slats
    for (let y = crownBaseY + 1.2; y <= crownBaseY + crownH - 1.2; y += 0.75) {
      box(silverMullions, [0, y, -cd * 0.5 - 0.1], [cw - 0.4, 0.22, 0.15]);
      box(silverMullions, [0, y, cd * 0.5 + 0.1], [cw - 0.4, 0.22, 0.15]);
      box(silverMullions, [-cw * 0.5 - 0.1, y, 0], [0.15, 0.22, cd - 0.4]);
      box(silverMullions, [cw * 0.5 + 0.1, y, 0], [0.15, 0.22, cd - 0.4]);
    }

    // Parapet trim
    box(silverMullions, [0, totalH - 0.25, 0], [cw + 0.4, 0.5, cd + 0.4]);

    // Rooftop Signage: Illuminated "CCB" Corporate Sign
    const signY = crownBaseY + crownH * 0.55;
    // North Sign (facing Victoria Harbour)
    box(crownParts, [0, signY, -cd * 0.5 - 0.25], [18.0, 3.4, 0.15]); // Backplate
    cylinder(signageParts, [-6.0, signY, -cd * 0.5 - 0.35], 1.2, 0.2, 24, { rx: Math.PI / 2, ry: 0, rz: 0 }); // CCB roundel emblem
    // "CCB" lettering blocks
    for (let i = -2.5; i <= 6.5; i += 2.2) {
      box(silverMullions, [i, signY, -cd * 0.5 - 0.35], [1.5, 1.8, 0.1]);
    }

    // South Sign (facing Chater Garden / Central)
    box(crownParts, [0, signY, cd * 0.5 + 0.25], [18.0, 3.4, 0.15]);
    cylinder(signageParts, [6.0, signY, cd * 0.5 + 0.35], 1.2, 0.2, 24, { rx: Math.PI / 2, ry: 0, rz: 0 });
    for (let i = -6.5; i <= 2.5; i += 2.2) {
      box(silverMullions, [i, signY, cd * 0.5 + 0.35], [1.5, 1.8, 0.1]);
    }

    // 4 Aviation obstruction warning lights at crown corners
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        cylinder(silverMullions, [sx * (cw * 0.5 - 0.3), totalH + 0.4, sz * (cd * 0.5 - 0.3)], 0.08, 0.8, 6);
        box(signageParts, [sx * (cw * 0.5 - 0.3), totalH + 0.85, sz * (cd * 0.5 - 0.3)], [0.22, 0.22, 0.22]);
      }
    }
  }

  // --- Materials Definition -----------------------------------------------------------------------------------
  // 1) Dark Blue-Grey Low-E Reflective Curtain Wall Glass
  const blueGreyGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x22323a,
    roughness: 0.12,
    metalness: 0.70,
  });

  // 2) Lit Office Glass
  const litGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x425862,
    roughness: 0.2,
    metalness: 0.45,
  });
  litGlassMat.emissiveNode = color(0xffe8ba).mul(nightAmount().mul(0.85).add(0.15));

  // 3) Dark Spandrel Panels
  const darkSpandrelMat = new THREE.MeshStandardMaterial({
    color: 0x181e22,
    roughness: 0.42,
    metalness: 0.5,
  });

  // 4) Silver Anodized Vertical Mullion Fins
  const silverMullionMat = new THREE.MeshStandardMaterial({
    color: 0xc8d2d6,
    roughness: 0.28,
    metalness: 0.85,
  });

  // 5) Polished Charcoal Granite (Podium)
  const graniteMat = new THREE.MeshStandardMaterial({
    color: 0x1f2326,
    roughness: 0.52,
    metalness: 0.2,
  });

  // 6) Storefront Glass
  const podiumGlassMat = new THREE.MeshStandardMaterial({
    color: 0x1c2a32,
    roughness: 0.12,
    metalness: 0.35,
  });

  // 7) Penthouse Crown Casing
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0x242a2e,
    roughness: 0.55,
    metalness: 0.55,
  });

  // 8) CCB Corporate Blue/Red Signage & Aviation Beacons
  const signageMat = new THREE.MeshStandardNodeMaterial({
    color: 0x0055a5, // CCB Blue
    roughness: 0.25,
    metalness: 0.5,
  });
  signageMat.emissiveNode = color(0x1177ee).mul(nightAmount().mul(0.9).add(0.28));

  // Assemble meshes into root group
  merged(root, blueGreyGlass, blueGreyGlassMat, 'CCB Tower dark blue-grey Low-E curtain wall');
  merged(root, litGlass, litGlassMat, 'CCB Tower lit office glazing');
  merged(root, darkSpandrels, darkSpandrelMat, 'CCB Tower dark spandrel panels');
  merged(root, silverMullions, silverMullionMat, 'CCB Tower vertical mullion fins');
  merged(root, granitePodium, graniteMat, 'CCB Tower granite podium');
  merged(root, podiumGlass, podiumGlassMat, 'CCB Tower storefront glazing');
  merged(root, crownParts, crownMat, 'CCB Tower mechanical penthouse crown');
  merged(root, signageParts, signageMat, 'CCB Tower corporate signage and beacons');

  // --- Colliders ---------------------------------------------------------------------------------------------
  const colliders = [
    // Main tower shaft
    { name: 'CCB Tower Shaft', ...harbourCityLocalCollider(S, 0, 0, w - 2.0, d - 2.0, groundOffset + podiumH, groundOffset + totalH) },
    // Podium volume
    { name: 'CCB Tower Podium', ...harbourCityLocalCollider(S, 0, 0, w - 1.0, d - 1.0, groundOffset, groundOffset + podiumH) },
  ];

  const landmark = {
    id: 'ccb-tower',
    name: '中國建設銀行大廈 CCB Tower',
    englishName: 'CCB Tower',
    position: { x: S.x, y: groundOffset, z: S.z },
    radius: Math.max(w, d) * 0.65,
    height: totalH,
  };

  return {
    group: root,
    colliders,
    landmarks: [landmark],
    stats: {
      ccbHeight: totalH,
      ccbStoreys: S.storeys,
      ccbCurtainPanes: blueGreyGlass.length + litGlass.length,
      ccbSpandrels: darkSpandrels.length,
      ccbMullions: silverMullions.length,
    },
    groundOffset,
  };
}
