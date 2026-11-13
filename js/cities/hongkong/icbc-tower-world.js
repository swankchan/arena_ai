// 中國工商銀行大廈 ICBC Tower, Three Garden Road, 3 Garden Road, Central (1992).
//
// Designed by Rocco Design Architects (嚴迅奇 / 許李嚴建築師事務所), the 167-metre 37-storey tower
// forms an award-winning architectural gateway on Garden Road with Champion Tower (冠君大廈).
// Features crisp silver-blue reflective curtain glazing, sharp faceted geometric massing, a multi-level
// public landscaped podium, and an illuminated ICBC crown emblem.
//
// OSM Way: 107497693 (version 8, height: 167m).
import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  ICBC_TOWER_SITE as S,
  icbcTowerLocalToWorld
} from './icbc-tower-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';

export function buildIcbcTower(scene, options = {}) {
  const groundOffset = options.groundOffset ?? hongKongTerrainHeight(S.x, S.z);

  const root = new THREE.Group();
  root.name = 'ICBC Tower — 中國工商銀行大廈';
  root.position.set(S.x, groundOffset, S.z);
  root.rotation.y = S.ry;
  scene.add(root);

  // Collections for merged geometries
  const curtainGlass = [];
  const litGlass = [];
  const spandrels = [];
  const mullions = [];
  const granitePodium = [];
  const podiumGlass = [];
  const crownParts = [];
  const signageParts = [];

  const w = S.w; // ~70.83m
  const d = S.d; // ~36.28m
  const podiumH = S.podiumHeight; // 18.0m
  const totalH = S.height; // 167.0m
  const crownH = S.crownHeight; // 16.0m
  const shaftTop = totalH - crownH; // 151.0m
  const shaftH = shaftTop - podiumH; // 133.0m

  // --- 1. Podium & Public Circulation (0 to 18m) --------------------------------------------------------------
  {
    // Shared Three Garden Road landscaped podium base
    box(granitePodium, [0, podiumH * 0.5, 0], [w - 1.0, podiumH, d - 1.0]);

    // Colonnade & retail banking hall glazing
    for (let floor = 0; floor < 3; floor++) {
      const fy = 1.0 + floor * 5.2;
      box(podiumGlass, [0, fy + 2.0, -d * 0.5 + 0.3], [w - 4.0, 3.8, 0.1]);
      box(podiumGlass, [0, fy + 2.0, d * 0.5 - 0.3], [w - 4.0, 3.8, 0.1]);
      for (let x = -w * 0.5 + 4.0; x <= w * 0.5 - 4.0; x += 4.5) {
        box(granitePodium, [x, fy + 2.0, -d * 0.5 + 0.1], [0.8, 4.2, 0.6]);
        box(granitePodium, [x, fy + 2.0, d * 0.5 - 0.1], [0.8, 4.2, 0.6]);
      }
    }

    // Public cascading escalator atrium and canopies linking Garden Road
    box(granitePodium, [-w * 0.5 + 6.0, 5.0, 0], [12.0, 10.0, d + 2.0]);
    box(mullions, [-w * 0.5 + 6.0, 10.2, 0], [12.4, 0.4, d + 2.4]); // Canopy trim
    box(podiumGlass, [-w * 0.5 + 6.0, 5.5, -d * 0.5 - 0.8], [11.0, 8.0, 0.15]);
  }

  // --- 2. Main Tower Shaft: Angled Gateway Volume (18m to 151m) -----------------------------------------------
  // 33 office storeys with silver-blue reflective curtain wall and horizontal spandrels
  {
    const floors = 33;
    const floorH = shaftH / floors; // ~4.03m
    const glassH = floorH * 0.62; // ~2.50m
    const spandrelH = floorH - glassH; // ~1.53m

    // Main tower volume (triangular/faceted profile)
    box(spandrels, [0, podiumH + shaftH * 0.5, 0], [w - 4.0, shaftH, d - 4.0]);

    for (let f = 0; f < floors; f++) {
      const baseY = podiumH + f * floorH;
      const spandrelY = baseY + spandrelH * 0.5;
      const visionY = baseY + spandrelH + glassH * 0.5;

      // Spandrels
      box(spandrels, [0, spandrelY, -d * 0.5 + 1.8], [w - 4.0, spandrelH, 0.2]);
      box(spandrels, [0, spandrelY, d * 0.5 - 1.8], [w - 4.0, spandrelH, 0.2]);
      box(spandrels, [-w * 0.5 + 1.8, spandrelY, 0], [0.2, spandrelH, d - 4.0]);
      box(spandrels, [w * 0.5 - 1.8, spandrelY, 0], [0.2, spandrelH, d - 4.0]);

      // Vision glass — subdivided into realistic window bays with scattered randomized night illumination
      const spanX = w - 4.2;
      const numBaysX = Math.max(1, Math.round(spanX / 2.8));
      const actualBayX = spanX / numBaysX;
      for (let bx = 0; bx < numBaysX; bx++) {
        const lx = -spanX * 0.5 + (bx + 0.5) * actualBayX;
        const isLitN = hash(f, bx, 1, 33) < 0.28;
        const isLitS = hash(f, bx, 2, 33) < 0.28;
        box(isLitN ? litGlass : curtainGlass, [lx, visionY, -d * 0.5 + 1.8], [actualBayX - 0.04, glassH, 0.14]);
        box(isLitS ? litGlass : curtainGlass, [lx, visionY, d * 0.5 - 1.8], [actualBayX - 0.04, glassH, 0.14]);
      }

      const spanZ = d - 4.2;
      const numBaysZ = Math.max(1, Math.round(spanZ / 2.8));
      const actualBayZ = spanZ / numBaysZ;
      for (let bz = 0; bz < numBaysZ; bz++) {
        const lz = -spanZ * 0.5 + (bz + 0.5) * actualBayZ;
        const isLitE = hash(f, bz, 3, 33) < 0.28;
        const isLitW = hash(f, bz, 4, 33) < 0.28;
        box(isLitE ? litGlass : curtainGlass, [w * 0.5 - 1.8, visionY, lz], [0.14, glassH, actualBayZ - 0.04]);
        box(isLitW ? litGlass : curtainGlass, [-w * 0.5 + 1.8, visionY, lz], [0.14, glassH, actualBayZ - 0.04]);
      }
    }

    // Vertical extruded mullion fins
    const midShaftY = podiumH + shaftH * 0.5;
    for (let x = -w * 0.5 + 3.0; x <= w * 0.5 - 3.0; x += 2.8) {
      box(mullions, [x, midShaftY, -d * 0.5 + 1.65], [0.08, shaftH, 0.25]);
      box(mullions, [x, midShaftY, d * 0.5 - 1.65], [0.08, shaftH, 0.25]);
    }
    for (let z = -d * 0.5 + 3.0; z <= d * 0.5 - 3.0; z += 2.8) {
      box(mullions, [-w * 0.5 + 1.65, midShaftY, z], [0.25, shaftH, 0.08]);
      box(mullions, [w * 0.5 - 1.65, midShaftY, z], [0.25, shaftH, 0.08]);
    }
  }

  // --- 3. Tower Crown & Mechanical Penthouse (151m to 167m) ----------------------------------------------------
  // Stepped penthouse with acoustic louvres and illuminated ICBC corporate logo
  {
    const crownBaseY = shaftTop;
    const cw = w - 8.0;
    const cd = d - 6.0;

    // Stepped mechanical crown
    box(crownParts, [0, crownBaseY + crownH * 0.5, 0], [cw, crownH, cd]);

    // Acoustic louvres on crown faces
    for (let y = crownBaseY + 1.5; y <= crownBaseY + crownH - 1.5; y += 0.8) {
      box(spandrels, [0, y, cd * 0.5 + 0.1], [cw - 0.4, 0.25, 0.15]);
      box(spandrels, [0, y, -cd * 0.5 - 0.1], [cw - 0.4, 0.25, 0.15]);
      box(spandrels, [cw * 0.5 + 0.1, y, 0], [0.15, 0.25, cd - 0.4]);
      box(spandrels, [-cw * 0.5 - 0.1, y, 0], [0.15, 0.25, cd - 0.4]);
    }

    // Parapet trim
    box(mullions, [0, totalH - 0.2, 0], [cw + 0.4, 0.4, cd + 0.4]);

    // Illuminated ICBC Corporate Emblem & Lettering
    const signY = crownBaseY + crownH * 0.55;
    // North sign (facing Victoria Harbour & Central)
    box(crownParts, [0, signY, -cd * 0.5 - 0.2], [18.0, 3.8, 0.15]); // Backing plate
    // Red ICBC coin emblem
    cylinder(signageParts, [-6.0, signY, -cd * 0.5 - 0.3], 1.4, 0.15, 16);
    // Gold letters "ICBC"
    for (let i = -2.5; i <= 6.5; i += 2.2) {
      box(mullions, [i, signY, -cd * 0.5 - 0.3], [1.5, 1.8, 0.1]);
    }

    // South sign (facing The Peak)
    box(crownParts, [0, signY, cd * 0.5 + 0.2], [18.0, 3.8, 0.15]);
    cylinder(signageParts, [6.0, signY, cd * 0.5 + 0.3], 1.4, 0.15, 16);
    for (let i = -6.5; i <= 2.5; i += 2.2) {
      box(mullions, [i, signY, cd * 0.5 + 0.3], [1.5, 1.8, 0.1]);
    }

    // Red aviation warning obstruction lights
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        cylinder(mullions, [sx * (cw * 0.5 - 0.3), totalH + 0.4, sz * (cd * 0.5 - 0.3)], 0.08, 0.8, 6);
        box(signageParts, [sx * (cw * 0.5 - 0.3), totalH + 0.85, sz * (cd * 0.5 - 0.3)], [0.22, 0.22, 0.22]);
      }
    }
  }

  // --- Materials Definition -----------------------------------------------------------------------------------
  // 1) Silver-Blue Reflective Curtain Glass
  const curtainGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x324e60,
    roughness: 0.12,
    metalness: 0.55,
  });

  // 2) Lit Office Glass (warm scattered interior lights at night)
  const litGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x566d7e,
    roughness: 0.18,
    metalness: 0.45,
  });
  litGlassMat.emissiveNode = color(0xffe5a8).mul(nightAmount().mul(0.85).add(0.15));

  // 3) Dark Metallic Spandrels
  const spandrelMat = new THREE.MeshStandardMaterial({
    color: 0x222a30,
    roughness: 0.35,
    metalness: 0.45,
  });

  // 4) Silver-Grey Anodized Mullion Fins
  const mullionMat = new THREE.MeshStandardMaterial({
    color: 0xa4b0b8,
    roughness: 0.25,
    metalness: 0.85,
  });

  // 5) Polished Charcoal Granite Podium
  const graniteMat = new THREE.MeshStandardMaterial({
    color: 0x1e2326,
    roughness: 0.55,
    metalness: 0.2,
  });

  // 6) Podium Glass
  const podiumGlassMat = new THREE.MeshStandardMaterial({
    color: 0x243945,
    roughness: 0.12,
    metalness: 0.38,
  });

  // 7) Crown Mechanical Casing
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0x353d44,
    roughness: 0.55,
    metalness: 0.6,
  });

  // 8) ICBC Red Corporate Signage & Beacons
  const signageMat = new THREE.MeshStandardNodeMaterial({
    color: 0xcc1122,
    roughness: 0.2,
    metalness: 0.6,
  });
  signageMat.emissiveNode = color(0xee2233).mul(nightAmount().mul(0.9).add(0.3));

  // Assemble meshes into root group
  merged(root, curtainGlass, curtainGlassMat, 'ICBC Tower silver-blue reflective curtain wall');
  merged(root, litGlass, litGlassMat, 'ICBC Tower lit office glazing');
  merged(root, spandrels, spandrelMat, 'ICBC Tower dark spandrel bands');
  merged(root, mullions, mullionMat, 'ICBC Tower silver mullion fins');
  merged(root, granitePodium, graniteMat, 'ICBC Tower granite podium and escalators');
  merged(root, podiumGlass, podiumGlassMat, 'ICBC Tower storefront and atrium glazing');
  merged(root, crownParts, crownMat, 'ICBC Tower mechanical penthouse crown');
  merged(root, signageParts, signageMat, 'ICBC Tower corporate signage and beacons');

  // --- Colliders ---------------------------------------------------------------------------------------------
  const colliders = [
    // Main tower volume
    { name: 'ICBC Tower Main Shaft', ...harbourCityLocalCollider(S, 0, 0, w - 4.0, d - 4.0, groundOffset + podiumH, groundOffset + totalH) },
    // Landscaped podium base
    { name: 'ICBC Tower Podium', ...harbourCityLocalCollider(S, 0, 0, w, d, groundOffset, groundOffset + podiumH) },
  ];

  const landmark = {
    id: 'icbc-tower',
    name: '中國工商銀行大廈 ICBC Tower',
    englishName: 'ICBC Tower',
    position: { x: S.x, y: groundOffset, z: S.z },
    radius: Math.max(w, d) * 0.65,
    height: totalH,
  };

  return {
    group: root,
    colliders,
    landmarks: [landmark],
    stats: {
      icbcHeight: totalH,
      icbcStoreys: S.storeys,
      icbcLevels: S.levels,
      icbcCurtainPanes: curtainGlass.length + litGlass.length,
      icbcSpandrels: spandrels.length,
      icbcMullions: mullions.length,
    },
    groundOffset,
  };
}
