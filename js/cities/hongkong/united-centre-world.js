// 統一中心 United Centre, 95 Queensway, Admiralty (金鐘金鐘道95號, 1981).
//
// The 140-metre 37-storey International Modernist commercial landmark designed by Wong & Ouyang
// features massive typical office floorplates (~20,400 sq ft), crisp pale ivory ceramic mosaic spandrels,
// continuous dark bronze ribbon glazing, 6-storey commercial podium integrating the Admiralty East bus
// terminus and MTR Admiralty Station Exit D, and elevated skybridges.
//
// OSM Way: 107336258 (height: 140m).
import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  UNITED_CENTRE_SITE as S,
  unitedCentreLocalToWorld
} from './united-centre-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';

export function buildUnitedCentre(scene, options = {}) {
  const groundOffset = options.groundOffset ?? hongKongTerrainHeight(S.x, S.z);

  const root = new THREE.Group();
  root.name = 'United Centre — 統一中心';
  root.position.set(S.x, groundOffset, S.z);
  root.rotation.y = S.ry;
  scene.add(root);

  // Collections for merged geometries
  const bronzeGlass = [];
  const litGlass = [];
  const ivorySpandrels = [];
  const bronzeFrames = [];
  const podiumStone = [];
  const podiumGlass = [];
  const crownParts = [];
  const skybridgeParts = [];
  const beaconParts = [];

  const w = S.w; // ~42.66m
  const d = S.d; // ~43.77m
  const podiumH = S.podiumHeight; // 22.0m (6 commercial storeys)
  const totalH = S.height; // 140.0m
  const crownH = S.crownHeight; // 12.0m
  const shaftTop = totalH - crownH; // 128.0m
  const shaftH = shaftTop - podiumH; // 106.0m

  // --- 1. Commercial Podium & Skybridges (0 to 22m) ------------------------------------------------------------
  {
    // Main podium block (6 storeys of retail and bus terminus)
    box(podiumStone, [0, podiumH * 0.5, 0], [w - 1.0, podiumH, d - 1.0]);

    // Ground floor bus terminus portal openings (North & South)
    box(bronzeFrames, [0, 4.5, -d * 0.5 + 0.4], [w - 6.0, 7.5, 0.4]);
    box(bronzeFrames, [0, 4.5, d * 0.5 - 0.4], [w - 6.0, 7.5, 0.4]);

    // Retail Storefronts & MTR Station Entrance
    for (let f = 1; f < 4; f++) {
      const fy = 2.0 + f * 4.8;
      box(podiumGlass, [0, fy + 2.0, -d * 0.5 + 0.8], [w - 4.0, 3.6, 0.1]);
      box(podiumGlass, [0, fy + 2.0, d * 0.5 - 0.8], [w - 4.0, 3.6, 0.1]);
      for (let x = -w * 0.5 + 4.0; x <= w * 0.5 - 4.0; x += 4.2) {
        box(podiumStone, [x, fy + 2.0, -d * 0.5 + 0.7], [0.8, 4.0, 0.3]);
        box(podiumStone, [x, fy + 2.0, d * 0.5 - 0.7], [0.8, 4.0, 0.3]);
      }
    }

    // Skybridge West towards Admiralty Centre / Queensway Walkway (Level 2, y ~ 8.0m)
    box(skybridgeParts, [-w * 0.5 - 5.0, 8.0, 2.0], [10.0, 4.5, 4.2]);
    box(podiumGlass, [-w * 0.5 - 5.0, 8.3, 4.15], [9.6, 2.2, 0.1]);
    box(podiumGlass, [-w * 0.5 - 5.0, 8.3, -0.15], [9.6, 2.2, 0.1]);

    // Skybridge South towards Queensway Government Offices / Pacific Place (Level 2, y ~ 8.0m)
    box(skybridgeParts, [2.0, 8.0, d * 0.5 + 5.0], [4.2, 4.5, 10.0]);
    box(podiumGlass, [4.15, 8.3, d * 0.5 + 5.0], [0.1, 2.2, 9.6]);
    box(podiumGlass, [-0.15, 8.3, d * 0.5 + 5.0], [0.1, 2.2, 9.6]);
  }

  // --- 2. Main Tower Shaft: Continuous Ribbon Windows (22m to 128m) -------------------------------------------
  // 26 office storeys with pale ivory ceramic spandrels and dark bronze ribbon glazing
  {
    const floors = 26;
    const floorH = shaftH / floors; // ~4.08m
    const glassH = floorH * 0.52; // ~2.12m
    const spandrelH = floorH - glassH; // ~1.96m

    // Concrete core
    box(podiumStone, [0, podiumH + shaftH * 0.5, 0], [w - 5.0, shaftH, d - 5.0]);

    for (let f = 0; f < floors; f++) {
      const baseY = podiumH + f * floorH;
      const spandrelY = baseY + spandrelH * 0.5;
      const visionY = baseY + spandrelH + glassH * 0.5;

      // Pale ivory ceramic mosaic spandrels
      box(ivorySpandrels, [0, spandrelY, -d * 0.5 + 1.8], [w - 2.5, spandrelH, 0.3]);
      box(ivorySpandrels, [0, spandrelY, d * 0.5 - 1.8], [w - 2.5, spandrelH, 0.3]);
      box(ivorySpandrels, [-w * 0.5 + 1.8, spandrelY, 0], [0.3, spandrelH, d - 2.5]);
      box(ivorySpandrels, [w * 0.5 - 1.8, spandrelY, 0], [0.3, spandrelH, d - 2.5]);

      // Dark bronze ribbon vision glass (with randomized night office lighting)
      const isLit0 = hash(f, 0, 37) > 0.65;
      const isLit1 = hash(f, 1, 37) > 0.65;
      const isLit2 = hash(f, 2, 37) > 0.65;
      const isLit3 = hash(f, 3, 37) > 0.65;

      box(isLit0 ? litGlass : bronzeGlass, [0, visionY, -d * 0.5 + 1.8], [w - 2.8, glassH, 0.14]);
      box(isLit1 ? litGlass : bronzeGlass, [0, visionY, d * 0.5 - 1.8], [w - 2.8, glassH, 0.14]);
      box(isLit2 ? litGlass : bronzeGlass, [-w * 0.5 + 1.8, visionY, 0], [0.14, glassH, d - 2.8]);
      box(isLit3 ? litGlass : bronzeGlass, [w * 0.5 - 1.8, visionY, 0], [0.14, glassH, d - 2.8]);
    }

    // Corner pillar columns
    const midShaftY = podiumH + shaftH * 0.5;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        box(ivorySpandrels, [sx * (w * 0.5 - 1.8), midShaftY, sz * (d * 0.5 - 1.8)], [1.6, shaftH, 1.6]);
      }
    }

    // Vertical bronze mullions
    for (let x = -w * 0.5 + 3.2; x <= w * 0.5 - 3.2; x += 2.6) {
      box(bronzeFrames, [x, midShaftY, -d * 0.5 + 1.65], [0.08, shaftH, 0.22]);
      box(bronzeFrames, [x, midShaftY, d * 0.5 - 1.65], [0.08, shaftH, 0.22]);
    }
    for (let z = -d * 0.5 + 3.2; z <= d * 0.5 - 3.2; z += 2.6) {
      box(bronzeFrames, [-w * 0.5 + 1.65, midShaftY, z], [0.22, shaftH, 0.08]);
      box(bronzeFrames, [w * 0.5 - 1.65, midShaftY, z], [0.22, shaftH, 0.08]);
    }
  }

  // --- 3. Crown & Mechanical Penthouse (128m to 140m) ---------------------------------------------------------
  // Stepped mechanical crown with acoustic louvres and aviation warning beacons
  {
    const crownBaseY = shaftTop;
    const cw = w - 6.0;
    const cd = d - 6.0;

    // Penthouse core
    box(crownParts, [0, crownBaseY + crownH * 0.5, 0], [cw, crownH, cd]);

    // Acoustic louvres on crown
    for (let y = crownBaseY + 1.2; y <= crownBaseY + crownH - 1.2; y += 0.75) {
      box(bronzeFrames, [0, y, -cd * 0.5 - 0.1], [cw - 0.4, 0.22, 0.15]);
      box(bronzeFrames, [0, y, cd * 0.5 + 0.1], [cw - 0.4, 0.22, 0.15]);
      box(bronzeFrames, [-cw * 0.5 - 0.1, y, 0], [0.15, 0.22, cd - 0.4]);
      box(bronzeFrames, [cw * 0.5 + 0.1, y, 0], [0.15, 0.22, cd - 0.4]);
    }

    // Parapet trim
    box(ivorySpandrels, [0, totalH - 0.3, 0], [cw + 0.4, 0.6, cd + 0.4]);

    // Aviation obstruction warning lights
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        cylinder(bronzeFrames, [sx * (cw * 0.5 - 0.3), totalH + 0.4, sz * (cd * 0.5 - 0.3)], 0.08, 0.8, 6);
        box(beaconParts, [sx * (cw * 0.5 - 0.3), totalH + 0.85, sz * (cd * 0.5 - 0.3)], [0.22, 0.22, 0.22]);
      }
    }
  }

  // --- Materials Definition -----------------------------------------------------------------------------------
  // 1) Dark Bronze Reflective Ribbon Window Glass
  const bronzeGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x382e24,
    roughness: 0.15,
    metalness: 0.65,
  });

  // 2) Lit Office Glass
  const litGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x625242,
    roughness: 0.2,
    metalness: 0.45,
  });
  litGlassMat.emissiveNode = color(0xffe8ba).mul(nightAmount().mul(0.85).add(0.15));

  // 3) Pale Ivory / Off-White Ceramic Mosaic Spandrels
  const ivorySpandrelMat = new THREE.MeshStandardMaterial({
    color: 0xf2eee8,
    roughness: 0.42,
    metalness: 0.20,
  });

  // 4) Dark Bronze Window Frames & Mullions
  const bronzeFrameMat = new THREE.MeshStandardMaterial({
    color: 0x504236,
    roughness: 0.32,
    metalness: 0.75,
  });

  // 5) Polished Granite Podium
  const podiumStoneMat = new THREE.MeshStandardMaterial({
    color: 0x222628,
    roughness: 0.52,
    metalness: 0.2,
  });

  // 6) Storefront Glass
  const podiumGlassMat = new THREE.MeshStandardMaterial({
    color: 0x22323a,
    roughness: 0.12,
    metalness: 0.35,
  });

  // 7) Penthouse Crown Casing
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0x362c24,
    roughness: 0.58,
    metalness: 0.55,
  });

  // 8) Pedestrian Skybridges
  const skybridgeMat = new THREE.MeshStandardMaterial({
    color: 0x24282a,
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
  merged(root, bronzeGlass, bronzeGlassMat, 'United Centre bronze reflective ribbon glazing');
  merged(root, litGlass, litGlassMat, 'United Centre lit office glazing');
  merged(root, ivorySpandrels, ivorySpandrelMat, 'United Centre ivory ceramic spandrels');
  merged(root, bronzeFrames, bronzeFrameMat, 'United Centre bronze window frames');
  merged(root, podiumStone, podiumStoneMat, 'United Centre granite podium');
  merged(root, podiumGlass, podiumGlassMat, 'United Centre storefront glazing');
  merged(root, crownParts, crownMat, 'United Centre mechanical penthouse crown');
  merged(root, skybridgeParts, skybridgeMat, 'United Centre pedestrian skybridges');
  merged(root, beaconParts, beaconMat, 'United Centre aviation beacons');

  // --- Colliders ---------------------------------------------------------------------------------------------
  const colliders = [
    // Main tower shaft
    { name: 'United Centre Shaft', ...harbourCityLocalCollider(S, 0, 0, w - 3.0, d - 3.0, groundOffset + podiumH, groundOffset + totalH) },
    // Podium volume
    { name: 'United Centre Podium', ...harbourCityLocalCollider(S, 0, 0, w - 1.0, d - 1.0, groundOffset, groundOffset + podiumH) },
    // West Skybridge
    { name: 'United Centre West Skybridge', ...harbourCityLocalCollider(S, -w * 0.5 - 5.0, 2.0, 10.0, 4.2, groundOffset + 6.0, groundOffset + 10.5) },
    // South Skybridge
    { name: 'United Centre South Skybridge', ...harbourCityLocalCollider(S, 2.0, d * 0.5 + 5.0, 4.2, 10.0, groundOffset + 6.0, groundOffset + 10.5) },
  ];

  const landmark = {
    id: 'united-centre',
    name: '統一中心 United Centre',
    englishName: 'United Centre',
    position: { x: S.x, y: groundOffset, z: S.z },
    radius: Math.max(w, d) * 0.65,
    height: totalH,
  };

  return {
    group: root,
    colliders,
    landmarks: [landmark],
    stats: {
      unitedCentreHeight: totalH,
      unitedCentreStoreys: S.storeys,
      unitedCentreCurtainPanes: bronzeGlass.length + litGlass.length,
      unitedCentreSpandrels: ivorySpandrels.length,
      unitedCentreFrames: bronzeFrames.length,
    },
    groundOffset,
  };
}
