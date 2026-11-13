// 遠東金融中心 Far East Finance Centre, 16 Harcourt Road, Admiralty (金鐘夏慤道16號, 1982).
//
// Renowned as "The Gold Bar Building" (金條大廈), the 176-metre 41-storey tower is universally
// celebrated for its dazzling 24-karat gold reflective mirrored glass curtain wall, chamfered
// octagonal prism geometry, black granite podium, and elevated pedestrian skybridge connections.
//
// Architect: Wong & Ouyang (HK) Ltd. (王歐陽建築師事務所).
// OSM Way: 107336261 (version 8, height: 176m).
import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  FAR_EAST_FINANCE_CENTRE_SITE as S,
  FAR_EAST_FINANCE_CENTRE_LOCAL_RING as LOCAL_RING,
  farEastFinanceCentreLocalToWorld
} from './far-east-finance-centre-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';

export function buildFarEastFinanceCentre(scene, options = {}) {
  const groundOffset = options.groundOffset ?? hongKongTerrainHeight(S.x, S.z);

  const root = new THREE.Group();
  root.name = 'Far East Finance Centre — 遠東金融中心';
  root.position.set(S.x, groundOffset, S.z);
  root.rotation.y = S.ry;
  scene.add(root);

  // Collections for merged geometries
  const goldGlass = [];
  const litGoldGlass = [];
  const goldSpandrels = [];
  const goldMullions = [];
  const granitePodium = [];
  const podiumGlass = [];
  const penthouseParts = [];
  const signageParts = [];
  const skybridgeParts = [];

  const w = S.w; // ~37.74m
  const d = S.d; // ~23.55m
  const podiumH = S.podiumHeight; // 18.0m
  const totalH = S.height; // 176.0m
  const shaftTop = totalH - S.crownHeight; // 162.0m
  const shaftH = shaftTop - podiumH; // 144.0m
  const chamfer = 2.4; // 45-degree corner chamfer

  // --- 1. Commercial Podium (0 to 18m, 4 storeys) -------------------------------------------------------------
  // Black polished granite colonnade, high-ceiling banking hall, and shopfronts
  {
    // Main podium block
    box(granitePodium, [0, podiumH * 0.5, 0], [w + 0.4, podiumH, d + 0.4]);

    // Recessed storefronts / banking hall glazing bands (Levels 1 - 4)
    for (let floor = 0; floor < 4; floor++) {
      const fy = 1.0 + floor * 4.2;
      const gh = 3.4;
      // North & South storefront glass
      for (const sz of [-1, 1]) {
        box(podiumGlass, [0, fy + gh * 0.5, sz * (d * 0.5 + 0.22)], [w - 2.0, gh, 0.1]);
        // Gold window frame mullions
        for (let bx = -w * 0.5 + 2.5; bx <= w * 0.5 - 2.5; bx += 3.2) {
          box(goldMullions, [bx, fy + gh * 0.5, sz * (d * 0.5 + 0.24)], [0.12, gh, 0.14]);
        }
      }
      // East & West storefront glass
      for (const sx of [-1, 1]) {
        box(podiumGlass, [sx * (w * 0.5 + 0.22), fy + gh * 0.5, 0], [0.1, gh, d - 2.0]);
        for (let bz = -d * 0.5 + 2.5; bz <= d * 0.5 - 2.5; bz += 3.2) {
          box(goldMullions, [sx * (w * 0.5 + 0.24), fy + gh * 0.5, bz], [0.14, gh, 0.12]);
        }
      }
    }

    // Monumental black granite corner piers and entrance portals
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        box(granitePodium, [sx * (w * 0.5 - 0.6), podiumH * 0.5, sz * (d * 0.5 - 0.6)], [1.8, podiumH + 0.2, 1.8]);
      }
    }

    // Harcourt Road Ground Floor Grand Entrance Canopy
    box(granitePodium, [0, 4.8, -d * 0.5 - 1.8], [12.0, 0.5, 3.8]);
    box(goldMullions, [0, 4.8, -d * 0.5 - 3.7], [12.2, 0.2, 0.2]); // Gold fascia trim
    // Golden entrance revolving doors
    box(goldMullions, [0, 2.3, -d * 0.5 - 0.2], [4.6, 3.8, 0.4]);
    box(podiumGlass, [0, 2.3, -d * 0.5 - 0.2], [4.4, 3.6, 0.2]);

    // Elevated Pedestrian Skybridge Connections (connecting towards Lippo Centre and Admiralty MTR)
    // 1) West Skybridge towards Lippo Centre / Cotton Tree Drive (Level 2, y ~ 7.0m)
    box(skybridgeParts, [-w * 0.5 - 5.5, 7.2, 0], [11.0, 4.5, 4.2]);
    box(podiumGlass, [-w * 0.5 - 5.5, 7.4, 1.95], [10.6, 2.2, 0.1]);
    box(podiumGlass, [-w * 0.5 - 5.5, 7.4, -1.95], [10.6, 2.2, 0.1]);
    box(goldSpandrels, [-w * 0.5 - 5.5, 5.4, 0], [11.0, 0.8, 4.2]);
    box(goldSpandrels, [-w * 0.5 - 5.5, 9.2, 0], [11.0, 0.6, 4.2]);

    // 2) East Skybridge towards Admiralty Centre / MTR (Level 2, y ~ 7.2m)
    box(skybridgeParts, [w * 0.5 + 4.5, 7.2, -2.0], [9.0, 4.5, 4.0]);
    box(podiumGlass, [w * 0.5 + 4.5, 7.4, -0.15], [8.6, 2.2, 0.1]);
    box(podiumGlass, [w * 0.5 + 4.5, 7.4, -3.85], [8.6, 2.2, 0.1]);
    box(goldSpandrels, [w * 0.5 + 4.5, 5.4, -2.0], [9.0, 0.8, 4.0]);
    box(goldSpandrels, [w * 0.5 + 4.5, 9.2, -2.0], [9.0, 0.6, 4.0]);

    // Podium roof terrace parapet
    for (const [bx, bz, bw, bd] of [
      [0, -d * 0.5, w + 0.2, 0.4],
      [0, d * 0.5, w + 0.2, 0.4],
      [-w * 0.5, 0, 0.4, d + 0.2],
      [w * 0.5, 0, 0.4, d + 0.2]
    ]) {
      box(granitePodium, [bx, podiumH + 0.5, bz], [bw, 1.0, bd]);
      box(goldSpandrels, [bx, podiumH + 1.05, bz], [bw + 0.05, 0.12, bd + 0.05]);
    }
  }

  // --- 2. Main Tower Shaft (18m to 162m, 37 office storeys) ----------------------------------------------------
  // Iconic 24-karat gold mirror reflective curtain wall with chamfered octagonal prism shape
  {
    const floors = 37;
    const floorH = shaftH / floors; // ~3.89m per storey
    const glassH = floorH * 0.58; // ~2.26m vision glass
    const spandrelH = floorH - glassH; // ~1.63m spandrel band

    // Chamfered octagonal footprint dimensions
    const halfW = w * 0.5;
    const halfD = d * 0.5;
    const mainFaceW = w - chamfer * 2.0; // ~32.94m
    const mainFaceD = d - chamfer * 2.0; // ~18.75m
    const chamferHypot = chamfer * Math.SQRT2; // ~3.39m

    // Core structural volume inside the curtain wall
    box(granitePodium, [0, podiumH + shaftH * 0.5, 0], [w - 0.8, shaftH, d - 0.8]);

    for (let f = 0; f < floors; f++) {
      const baseY = podiumH + f * floorH;
      const spandrelY = baseY + spandrelH * 0.5;
      const visionY = baseY + spandrelH + glassH * 0.5;

      // 1) Spandrel bands around the octagonal perimeter
      // North & South faces
      box(goldSpandrels, [0, spandrelY, halfD], [mainFaceW, spandrelH, 0.16]);
      box(goldSpandrels, [0, spandrelY, -halfD], [mainFaceW, spandrelH, 0.16]);
      // East & West faces
      box(goldSpandrels, [halfW, spandrelY, 0], [0.16, spandrelH, mainFaceD]);
      box(goldSpandrels, [-halfW, spandrelY, 0], [0.16, spandrelH, mainFaceD]);

      // 4 Corner Chamfer spandrels
      for (const [sx, sz, ry] of [
        [1, 1, Math.PI * 0.25],
        [1, -1, -Math.PI * 0.25],
        [-1, 1, Math.PI * 0.75],
        [-1, -1, -Math.PI * 0.75]
      ]) {
        box(
          goldSpandrels,
          [sx * (halfW - chamfer * 0.5), spandrelY, sz * (halfD - chamfer * 0.5)],
          [chamferHypot, spandrelH, 0.16],
          ry
        );
      }

      // 2) Vision glass bands — subdivided into realistic window bays with scattered randomized night illumination
      const numBaysX = Math.max(1, Math.round(mainFaceW / 1.85));
      const actualBayX = mainFaceW / numBaysX;
      for (let bx = 0; bx < numBaysX; bx++) {
        const lx = -mainFaceW * 0.5 + (bx + 0.5) * actualBayX;
        const isLitS = hash(f, bx, 1, 41) < 0.28;
        const isLitN = hash(f, bx, 2, 41) < 0.28;
        box(isLitS ? litGoldGlass : goldGlass, [lx, visionY, halfD + 0.02], [actualBayX - 0.04, glassH, 0.14]);
        box(isLitN ? litGoldGlass : goldGlass, [lx, visionY, -halfD - 0.02], [actualBayX - 0.04, glassH, 0.14]);
      }

      const numBaysZ = Math.max(1, Math.round(mainFaceD / 1.85));
      const actualBayZ = mainFaceD / numBaysZ;
      for (let bz = 0; bz < numBaysZ; bz++) {
        const lz = -mainFaceD * 0.5 + (bz + 0.5) * actualBayZ;
        const isLitE = hash(f, bz, 3, 41) < 0.28;
        const isLitW = hash(f, bz, 4, 41) < 0.28;
        box(isLitE ? litGoldGlass : goldGlass, [halfW + 0.02, visionY, lz], [0.14, glassH, actualBayZ - 0.04]);
        box(isLitW ? litGoldGlass : goldGlass, [-halfW - 0.02, visionY, lz], [0.14, glassH, actualBayZ - 0.04]);
      }

      // 4 Corner Chamfer vision glass
      for (const [sx, sz, ry, litIdx] of [
        [1, 1, Math.PI * 0.25, 5],
        [1, -1, -Math.PI * 0.25, 6],
        [-1, 1, Math.PI * 0.75, 7],
        [-1, -1, -Math.PI * 0.75, 8]
      ]) {
        const isLitCorner = hash(f, litIdx, 41) < 0.25;
        box(
          isLitCorner ? litGoldGlass : goldGlass,
          [sx * (halfW - chamfer * 0.5), visionY, sz * (halfD - chamfer * 0.5)],
          [chamferHypot, glassH, 0.14],
          ry
        );
      }
    }

    // 3) Continuous vertical extruded gold mullion fins running the full tower height
    const mullionStep = 1.85; // spacing between vertical fins
    const midShaftY = podiumH + shaftH * 0.5;

    // North & South vertical mullions
    for (let x = -mainFaceW * 0.5 + 0.9; x <= mainFaceW * 0.5 - 0.9; x += mullionStep) {
      box(goldMullions, [x, midShaftY, halfD + 0.12], [0.08, shaftH, 0.22]);
      box(goldMullions, [x, midShaftY, -halfD - 0.12], [0.08, shaftH, 0.22]);
    }

    // East & West vertical mullions
    for (let z = -mainFaceD * 0.5 + 0.9; z <= mainFaceD * 0.5 - 0.9; z += mullionStep) {
      box(goldMullions, [halfW + 0.12, midShaftY, z], [0.22, shaftH, 0.08]);
      box(goldMullions, [-halfW - 0.12, midShaftY, z], [0.22, shaftH, 0.08]);
    }

    // Prominent Corner Chamfer Edge Mullions
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      box(goldMullions, [sx * halfW, midShaftY, sz * (halfD - chamfer)], [0.18, shaftH, 0.18]);
      box(goldMullions, [sx * (halfW - chamfer), midShaftY, sz * halfD], [0.18, shaftH, 0.18]);
    }
  }

  // --- 3. Tower Crown & Mechanical Penthouse (162m to 176m) ---------------------------------------------------
  // Stepped crown with acoustic gold louvres, illuminated signage, BMU crane and beacons
  {
    const crownBaseY = shaftTop;
    const crownH = S.crownHeight; // 14.0m
    const pw = w - 4.5; // ~33.2m
    const pd = d - 4.0; // ~19.5m

    // Stepped mechanical penthouse mass
    box(penthouseParts, [0, crownBaseY + crownH * 0.5, 0], [pw, crownH, pd]);

    // Golden horizontal acoustic louvres on penthouse faces
    for (let y = crownBaseY + 1.2; y <= crownBaseY + crownH - 1.2; y += 0.65) {
      // North & South louvre blades
      box(goldSpandrels, [0, y, pd * 0.5 + 0.08], [pw - 0.4, 0.18, 0.16]);
      box(goldSpandrels, [0, y, -pd * 0.5 - 0.08], [pw - 0.4, 0.18, 0.16]);
      // East & West louvre blades
      box(goldSpandrels, [pw * 0.5 + 0.08, y, 0], [0.16, 0.18, pd - 0.4]);
      box(goldSpandrels, [-pw * 0.5 - 0.08, y, 0], [0.16, 0.18, pd - 0.4]);
    }

    // Penthouse roof parapet and deck
    box(penthouseParts, [0, crownBaseY + crownH + 0.4, 0], [pw + 0.4, 0.8, pd + 0.4]);
    box(goldSpandrels, [0, crownBaseY + crownH + 0.85, 0], [pw + 0.6, 0.14, pd + 0.6]);

    // BMU (Building Maintenance Unit) rooftop crane
    const bmuY = crownBaseY + crownH + 0.8;
    box(penthouseParts, [0, bmuY + 0.6, 0], [4.5, 1.2, 3.2]); // base
    cylinder(goldMullions, [0, bmuY + 2.2, 0], 0.35, 2.0, 8); // turret
    box(goldMullions, [0, bmuY + 3.2, -4.5], [0.45, 0.45, 10.0]); // boom

    // Rooftop illuminated building signs:
    // 1) North sign (facing Harcourt Road / Victoria Harbour):
    // "FAR EAST FINANCE CENTRE" and "遠東金融中心"
    const signY = crownBaseY + crownH * 0.55;
    // Sign backplate
    box(penthouseParts, [0, signY, -pd * 0.5 - 0.18], [22.0, 3.2, 0.12]);
    // English sign lettering (golden illuminated bars)
    for (let i = -10.0; i <= 10.0; i += 1.65) {
      box(signageParts, [i, signY + 0.65, -pd * 0.5 - 0.28], [1.1, 0.9, 0.08]);
    }
    // Chinese characters "遠東金融中心" (golden illuminated glyph blocks)
    for (let i = -6.5; i <= 6.5; i += 2.6) {
      box(signageParts, [i, signY - 0.7, -pd * 0.5 - 0.28], [1.8, 1.3, 0.08]);
    }

    // 2) South sign (facing Queensway / Admiralty):
    box(penthouseParts, [0, signY, pd * 0.5 + 0.18], [18.0, 2.6, 0.12]);
    for (let i = -8.0; i <= 8.0; i += 1.6) {
      box(signageParts, [i, signY, pd * 0.5 + 0.28], [1.1, 1.1, 0.08]);
    }

    // Red aviation obstruction warning lights at 4 top corners
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        cylinder(goldMullions, [sx * (pw * 0.5 - 0.2), bmuY + 0.6, sz * (pd * 0.5 - 0.2)], 0.08, 1.2, 6);
        box(signageParts, [sx * (pw * 0.5 - 0.2), bmuY + 1.25, sz * (pd * 0.5 - 0.2)], [0.22, 0.22, 0.22]);
      }
    }
  }

  // --- Materials Definition -----------------------------------------------------------------------------------
  // 1) 24-Karat Gold Mirror Reflective Glass Curtain Wall
  const goldGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0xdfb43a,
    roughness: 0.10,
    metalness: 0.92,
  });

  // 2) Lit Gold Glass (warm scattered interior office lighting at night)
  const litGoldGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0xe5c255,
    roughness: 0.18,
    metalness: 0.75,
  });
  litGoldGlassMat.emissiveNode = color(0xffdf88).mul(nightAmount().mul(0.85).add(0.15));

  // 3) Gold Anodized Metallic Spandrel Panels
  const goldSpandrelMat = new THREE.MeshStandardMaterial({
    color: 0xb98e28,
    roughness: 0.28,
    metalness: 0.85,
  });

  // 4) Gold Anodized Extruded Vertical Mullion Fins
  const goldMullionMat = new THREE.MeshStandardMaterial({
    color: 0xf0cb5d,
    roughness: 0.22,
    metalness: 0.88,
  });

  // 5) Polished Black Absolute Granite (Podium Colonnade & Core)
  const graniteMat = new THREE.MeshStandardMaterial({
    color: 0x161819,
    roughness: 0.42,
    metalness: 0.18,
  });

  // 6) High-Transparency Podium Storefront Glass
  const podiumGlassMat = new THREE.MeshStandardMaterial({
    color: 0x273b44,
    roughness: 0.12,
    metalness: 0.42,
  });

  // 7) Mechanical Penthouse Dark Gold & Bronze Casing
  const penthouseMat = new THREE.MeshStandardMaterial({
    color: 0x3d3522,
    roughness: 0.62,
    metalness: 0.58,
  });

  // 8) Illuminated Golden Signage & Beacons
  const signageMat = new THREE.MeshStandardNodeMaterial({
    color: 0xffe688,
    roughness: 0.2,
    metalness: 0.8,
  });
  signageMat.emissiveNode = color(0xffdc70).mul(nightAmount().mul(0.9).add(0.3));

  // 9) Skybridge Enclosure Material
  const skybridgeMat = new THREE.MeshStandardMaterial({
    color: 0x222628,
    roughness: 0.35,
    metalness: 0.5,
  });

  // Assemble meshes into the root group
  merged(root, goldGlass, goldGlassMat, 'Far East Finance Centre 24K gold mirror curtain wall');
  merged(root, litGoldGlass, litGoldGlassMat, 'Far East Finance Centre lit gold office glazing');
  merged(root, goldSpandrels, goldSpandrelMat, 'Far East Finance Centre gold spandrel panels');
  merged(root, goldMullions, goldMullionMat, 'Far East Finance Centre vertical gold mullion fins');
  merged(root, granitePodium, graniteMat, 'Far East Finance Centre black granite podium');
  merged(root, podiumGlass, podiumGlassMat, 'Far East Finance Centre storefront glazing');
  merged(root, penthouseParts, penthouseMat, 'Far East Finance Centre mechanical penthouse crown');
  merged(root, signageParts, signageMat, 'Far East Finance Centre illuminated rooftop signs');
  merged(root, skybridgeParts, skybridgeMat, 'Far East Finance Centre pedestrian skybridges');

  // --- Colliders ---------------------------------------------------------------------------------------------
  const colliders = [
    // Main tower shaft
    { name: 'Far East Finance Centre Tower', ...harbourCityLocalCollider(S, 0, 0, w, d, groundOffset + podiumH, groundOffset + totalH) },
    // Podium volume
    { name: 'Far East Finance Centre Podium', ...harbourCityLocalCollider(S, 0, 0, w + 0.4, d + 0.4, groundOffset, groundOffset + podiumH) },
    // West Skybridge
    { name: 'Far East Finance Centre West Skybridge', ...harbourCityLocalCollider(S, -w * 0.5 - 5.5, 0, 11.0, 4.2, groundOffset + 5.0, groundOffset + 9.5) },
    // East Skybridge
    { name: 'Far East Finance Centre East Skybridge', ...harbourCityLocalCollider(S, w * 0.5 + 4.5, -2.0, 9.0, 4.0, groundOffset + 5.0, groundOffset + 9.5) },
  ];

  const landmark = {
    id: 'far-east-finance-centre',
    name: '遠東金融中心 Far East Finance Centre',
    englishName: 'Far East Finance Centre',
    position: { x: S.x, y: groundOffset, z: S.z },
    radius: Math.max(w, d) * 0.65,
    height: totalH,
  };

  return {
    group: root,
    colliders,
    landmarks: [landmark],
    stats: {
      farEastHeight: totalH,
      farEastStoreys: S.storeys,
      farEastLevels: S.levels,
      farEastGoldPanes: goldGlass.length + litGoldGlass.length,
      farEastSpandrels: goldSpandrels.length,
      farEastMullions: goldMullions.length,
    },
    groundOffset,
  };
}
