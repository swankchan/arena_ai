// 會展廣場辦公大樓 Convention Plaza Office Tower, 1 Harbour Road, Wan Chai (灣仔港灣道1號, 1989).
//
// The 181-metre 51-storey commercial skyscraper designed by Ng Chun Man & Associates
// rises above the HKCEC Phase 1 podium complex. Features a triangular/trapezoidal plan,
// champagne-gold/warm-bronze reflective curtain wall, integrated exhibition podium, and elevated skybridges.
//
// OSM Way: 107497689 (height: 181m).
import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  CONVENTION_PLAZA_OFFICE_SITE as S,
  conventionPlazaOfficeLocalToWorld
} from './convention-plaza-office-tower-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';

export function buildConventionPlazaOfficeTower(scene, options = {}) {
  const groundOffset = options.groundOffset ?? hongKongTerrainHeight(S.x, S.z);

  const root = new THREE.Group();
  root.name = 'Convention Plaza Office Tower — 會展廣場辦公大樓';
  root.position.set(S.x, groundOffset, S.z);
  root.rotation.y = S.ry;
  scene.add(root);

  // Collections for merged geometries
  const goldGlass = [];
  const litGlass = [];
  const champagneSpandrels = [];
  const bronzeMullions = [];
  const podiumGranite = [];
  const podiumGlass = [];
  const crownParts = [];
  const skybridgeParts = [];
  const beaconParts = [];

  const w = S.w; // ~50.99m
  const d = S.d; // ~41.18m
  const podiumH = S.podiumHeight; // 28.0m (HKCEC Phase 1 podium base)
  const totalH = S.height; // 181.0m
  const crownH = S.crownHeight; // 14.0m
  const shaftTop = totalH - crownH; // 167.0m
  const shaftH = shaftTop - podiumH; // 139.0m

  // --- 1. HKCEC Phase 1 Commercial Podium & Skybridges (0 to 28m) ---------------------------------------------
  {
    // Integrated HKCEC exhibition podium base
    box(podiumGranite, [0, podiumH * 0.5, 0], [w - 1.0, podiumH, d - 1.0]);

    // Storefront and atrium glazing tiers
    for (let f = 1; f < 5; f++) {
      const fy = 2.0 + f * 5.2;
      box(podiumGlass, [0, fy + 2.2, -d * 0.5 + 0.6], [w - 4.0, 4.0, 0.1]);
      box(podiumGlass, [0, fy + 2.2, d * 0.5 - 0.6], [w - 4.0, 4.0, 0.1]);
      for (let x = -w * 0.5 + 4.0; x <= w * 0.5 - 4.0; x += 4.5) {
        box(podiumGranite, [x, fy + 2.2, -d * 0.5 + 0.5], [0.9, 4.4, 0.4]);
        box(podiumGranite, [x, fy + 2.2, d * 0.5 - 0.5], [0.9, 4.4, 0.4]);
      }
    }

    // Skybridge South towards Central Plaza (Level 2, y ~ 8.0m)
    box(skybridgeParts, [0, 8.0, d * 0.5 + 6.0], [4.5, 4.2, 12.0]);
    box(podiumGlass, [2.15, 8.3, d * 0.5 + 6.0], [0.1, 2.2, 11.6]);
    box(podiumGlass, [-2.15, 8.3, d * 0.5 + 6.0], [0.1, 2.2, 11.6]);

    // Skybridge East towards Great Eagle Centre / Harbour Centre (Level 2, y ~ 8.0m)
    box(skybridgeParts, [w * 0.5 + 6.0, 8.0, 0], [12.0, 4.2, 4.5]);
    box(podiumGlass, [w * 0.5 + 6.0, 8.3, 2.15], [11.6, 2.2, 0.1]);
    box(podiumGlass, [w * 0.5 + 6.0, 8.3, -2.15], [11.6, 2.2, 0.1]);
  }

  // --- 2. Main Tower Shaft (28m to 167m) ----------------------------------------------------------------------
  // 35 office storeys with champagne-gold reflective curtain wall and anodized spandrels
  {
    const floors = 35;
    const floorH = shaftH / floors; // ~3.97m
    const glassH = floorH * 0.58; // ~2.30m
    const spandrelH = floorH - glassH; // ~1.67m

    // Inner core
    box(podiumGranite, [0, podiumH + shaftH * 0.5, 0], [w - 5.0, shaftH, d - 5.0]);

    for (let f = 0; f < floors; f++) {
      const baseY = podiumH + f * floorH;
      const spandrelY = baseY + spandrelH * 0.5;
      const visionY = baseY + spandrelH + glassH * 0.5;

      // Champagne anodized spandrels
      box(champagneSpandrels, [0, spandrelY, -d * 0.5 + 1.8], [w - 2.8, spandrelH, 0.2]);
      box(champagneSpandrels, [0, spandrelY, d * 0.5 - 1.8], [w - 2.8, spandrelH, 0.2]);
      box(champagneSpandrels, [-w * 0.5 + 1.8, spandrelY, 0], [0.2, spandrelH, d - 2.8]);
      box(champagneSpandrels, [w * 0.5 - 1.8, spandrelY, 0], [0.2, spandrelH, d - 2.8]);

      // Champagne-gold reflective vision glass
      const isLit0 = hash(f, 0, 51) > 0.65;
      const isLit1 = hash(f, 1, 51) > 0.65;
      const isLit2 = hash(f, 2, 51) > 0.65;
      const isLit3 = hash(f, 3, 51) > 0.65;

      box(isLit0 ? litGlass : goldGlass, [0, visionY, -d * 0.5 + 1.8], [w - 3.0, glassH, 0.14]);
      box(isLit1 ? litGlass : goldGlass, [0, visionY, d * 0.5 - 1.8], [w - 3.0, glassH, 0.14]);
      box(isLit2 ? litGlass : goldGlass, [-w * 0.5 + 1.8, visionY, 0], [0.14, glassH, d - 3.0]);
      box(isLit3 ? litGlass : goldGlass, [w * 0.5 - 1.8, visionY, 0], [0.14, glassH, d - 3.0]);
    }

    // Chamfered corner columns
    const midShaftY = podiumH + shaftH * 0.5;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        cylinder(champagneSpandrels, [sx * (w * 0.5 - 1.8), midShaftY, sz * (d * 0.5 - 1.8)], 1.6, shaftH, 12);
      }
    }

    // Vertical bronze mullions
    for (let x = -w * 0.5 + 3.2; x <= w * 0.5 - 3.2; x += 2.6) {
      box(bronzeMullions, [x, midShaftY, -d * 0.5 + 1.65], [0.08, shaftH, 0.22]);
      box(bronzeMullions, [x, midShaftY, d * 0.5 - 1.65], [0.08, shaftH, 0.22]);
    }
    for (let z = -d * 0.5 + 3.2; z <= d * 0.5 - 3.2; z += 2.6) {
      box(bronzeMullions, [-w * 0.5 + 1.65, midShaftY, z], [0.22, shaftH, 0.08]);
      box(bronzeMullions, [w * 0.5 - 1.65, midShaftY, z], [0.22, shaftH, 0.08]);
    }
  }

  // --- 3. Crown & Mechanical Penthouse (167m to 181m) ---------------------------------------------------------
  // Stepped mechanical crown with acoustic louvres and aviation warning beacons
  {
    const crownBaseY = shaftTop;
    const cw = w - 6.0;
    const cd = d - 6.0;

    // Penthouse core
    box(crownParts, [0, crownBaseY + crownH * 0.5, 0], [cw, crownH, cd]);

    // Acoustic louvres on crown
    for (let y = crownBaseY + 1.2; y <= crownBaseY + crownH - 1.2; y += 0.8) {
      box(bronzeMullions, [0, y, -cd * 0.5 - 0.1], [cw - 0.4, 0.22, 0.15]);
      box(bronzeMullions, [0, y, cd * 0.5 + 0.1], [cw - 0.4, 0.22, 0.15]);
      box(bronzeMullions, [-cw * 0.5 - 0.1, y, 0], [0.15, 0.22, cd - 0.4]);
      box(bronzeMullions, [cw * 0.5 + 0.1, y, 0], [0.15, 0.22, cd - 0.4]);
    }

    // Parapet trim
    box(champagneSpandrels, [0, totalH - 0.3, 0], [cw + 0.4, 0.6, cd + 0.4]);

    // Aviation obstruction warning lights
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        cylinder(bronzeMullions, [sx * (cw * 0.5 - 0.3), totalH + 0.4, sz * (cd * 0.5 - 0.3)], 0.08, 0.8, 6);
        box(beaconParts, [sx * (cw * 0.5 - 0.3), totalH + 0.85, sz * (cd * 0.5 - 0.3)], [0.22, 0.22, 0.22]);
      }
    }
  }

  // --- Materials Definition -----------------------------------------------------------------------------------
  // 1) Champagne-Gold / Warm-Bronze Reflective Curtain Wall Glass
  const goldGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x584838,
    roughness: 0.15,
    metalness: 0.65,
  });

  // 2) Lit Office Glass
  const litGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x725e4c,
    roughness: 0.2,
    metalness: 0.45,
  });
  litGlassMat.emissiveNode = color(0xffe5b4).mul(nightAmount().mul(0.85).add(0.15));

  // 3) Anodized Champagne-Bronze Spandrel Panels
  const champagneSpandrelMat = new THREE.MeshStandardMaterial({
    color: 0x726250,
    roughness: 0.35,
    metalness: 0.55,
  });

  // 4) Vertical Bronze Mullion Fins
  const bronzeMullionMat = new THREE.MeshStandardMaterial({
    color: 0x8a7862,
    roughness: 0.28,
    metalness: 0.82,
  });

  // 5) Polished Warm-Grey Granite (Podium)
  const graniteMat = new THREE.MeshStandardMaterial({
    color: 0x222426,
    roughness: 0.52,
    metalness: 0.2,
  });

  // 6) Storefront Glass
  const podiumGlassMat = new THREE.MeshStandardMaterial({
    color: 0x22353e,
    roughness: 0.12,
    metalness: 0.35,
  });

  // 7) Penthouse Crown Casing
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0x3a3228,
    roughness: 0.58,
    metalness: 0.55,
  });

  // 8) Pedestrian Skybridges
  const skybridgeMat = new THREE.MeshStandardMaterial({
    color: 0x282a2c,
    roughness: 0.35,
    metalness: 0.5,
  });

  // 9) Aviation Warning Beacons
  const beaconMat = new THREE.MeshStandardNodeMaterial({
    color: 0xcc1122,
    roughness: 0.25,
    metalness: 0.5,
  });
  beaconMat.emissiveNode = color(0xee2233).mul(nightAmount().mul(0.9).add(0.3));

  // Assemble meshes into root group
  merged(root, goldGlass, goldGlassMat, 'Convention Plaza Office Tower champagne-gold curtain wall');
  merged(root, litGlass, litGlassMat, 'Convention Plaza Office Tower lit office glazing');
  merged(root, champagneSpandrels, champagneSpandrelMat, 'Convention Plaza Office Tower champagne spandrels');
  merged(root, bronzeMullions, bronzeMullionMat, 'Convention Plaza Office Tower bronze mullions');
  merged(root, podiumGranite, graniteMat, 'Convention Plaza Office Tower granite podium');
  merged(root, podiumGlass, podiumGlassMat, 'Convention Plaza Office Tower storefront glazing');
  merged(root, crownParts, crownMat, 'Convention Plaza Office Tower mechanical penthouse crown');
  merged(root, skybridgeParts, skybridgeMat, 'Convention Plaza Office Tower pedestrian skybridges');
  merged(root, beaconParts, beaconMat, 'Convention Plaza Office Tower aviation beacons');

  // --- Colliders ---------------------------------------------------------------------------------------------
  const colliders = [
    // Main tower shaft
    { name: 'Convention Plaza Office Tower Shaft', ...harbourCityLocalCollider(S, 0, 0, w - 3.0, d - 3.0, groundOffset + podiumH, groundOffset + totalH) },
    // Podium volume
    { name: 'Convention Plaza Office Tower Podium', ...harbourCityLocalCollider(S, 0, 0, w - 1.0, d - 1.0, groundOffset, groundOffset + podiumH) },
    // South Skybridge to Central Plaza
    { name: 'Convention Plaza Office Tower South Skybridge', ...harbourCityLocalCollider(S, 0, d * 0.5 + 6.0, 4.5, 12.0, groundOffset + 6.0, groundOffset + 10.5) },
    // East Skybridge to Great Eagle Centre
    { name: 'Convention Plaza Office Tower East Skybridge', ...harbourCityLocalCollider(S, w * 0.5 + 6.0, 0, 12.0, 4.5, groundOffset + 6.0, groundOffset + 10.5) },
  ];

  const landmark = {
    id: 'convention-plaza-office-tower',
    name: '會展廣場辦公大樓 Convention Plaza Office Tower',
    englishName: 'Convention Plaza Office Tower',
    position: { x: S.x, y: groundOffset, z: S.z },
    radius: Math.max(w, d) * 0.65,
    height: totalH,
  };

  return {
    group: root,
    colliders,
    landmarks: [landmark],
    stats: {
      conventionPlazaOfficeHeight: totalH,
      conventionPlazaOfficeStoreys: S.storeys,
      conventionPlazaOfficePanes: goldGlass.length + litGlass.length,
      conventionPlazaOfficeSpandrels: champagneSpandrels.length,
      conventionPlazaOfficeMullions: bronzeMullions.length,
    },
    groundOffset,
  };
}
