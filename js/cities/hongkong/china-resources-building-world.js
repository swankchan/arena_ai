// 華潤大廈 China Resources Building, 26 Harbour Road, Wan Chai (灣仔港灣道26號, 1983/2012).
//
// The 178-metre 49-storey skyscraper features a state-of-the-art sustainable double-glazed
// silver-blue Low-E curtain wall with external sun-shading fins designed by Foster + Partners / Lead8,
// 4-storey transparent lobby podium with elevated skybridges, and an illuminated rooftop China Resources crown.
//
// OSM Way: 107497701 (height: 178m).
import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  CHINA_RESOURCES_SITE as S,
  chinaResourcesLocalToWorld
} from './china-resources-building-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';

export function buildChinaResourcesBuilding(scene, options = {}) {
  const groundOffset = options.groundOffset ?? hongKongTerrainHeight(S.x, S.z);

  const root = new THREE.Group();
  root.name = 'China Resources Building — 華潤大廈';
  root.position.set(S.x, groundOffset, S.z);
  root.rotation.y = S.ry;
  scene.add(root);

  // Collections for merged geometries
  const silverBlueGlass = [];
  const litGlass = [];
  const frittedSpandrels = [];
  const sunshadingFins = [];
  const granitePodium = [];
  const podiumGlass = [];
  const crownParts = [];
  const signageParts = [];
  const skybridgeParts = [];

  const w = S.w; // ~57.27m
  const d = S.d; // ~36.71m
  const podiumH = S.podiumHeight; // 18.0m
  const totalH = S.height; // 178.0m
  const crownH = S.crownHeight; // 16.0m
  const shaftTop = totalH - crownH; // 162.0m
  const shaftH = shaftTop - podiumH; // 144.0m

  // --- 1. Commercial Podium & Skybridges (0 to 18m) ------------------------------------------------------------
  {
    // Main podium mass
    box(granitePodium, [0, podiumH * 0.5, 0], [w - 1.5, podiumH, d - 1.5]);

    // Storefront double-height transparent glazing
    box(podiumGlass, [0, 8.0, -d * 0.5 + 0.6], [w - 3.5, 14.0, 0.1]);
    box(podiumGlass, [0, 8.0, d * 0.5 - 0.6], [w - 3.5, 14.0, 0.1]);

    // Expressive granite perimeter colonnade
    for (let x = -w * 0.5 + 4.0; x <= w * 0.5 - 4.0; x += 5.5) {
      box(granitePodium, [x, 8.0, -d * 0.5 + 0.5], [1.0, 15.0, 0.4]);
      box(granitePodium, [x, 8.0, d * 0.5 - 0.5], [1.0, 15.0, 0.4]);
    }

    // Harbour Road Main Entrance Canopy
    box(sunshadingFins, [0, 5.0, -d * 0.5 - 1.5], [16.0, 0.4, 3.8]);
    cylinder(sunshadingFins, [-6.5, 2.5, -d * 0.5 - 3.0], 0.2, 5.0, 12);
    cylinder(sunshadingFins, [6.5, 2.5, -d * 0.5 - 3.0], 0.2, 5.0, 12);

    // Elevated Skybridge East towards Sun Hung Kai Centre (Level 2, y ~ 8.0m)
    box(skybridgeParts, [w * 0.5 + 5.0, 8.0, 0], [10.0, 4.5, 4.2]);
    box(podiumGlass, [w * 0.5 + 5.0, 8.3, 1.95], [9.6, 2.2, 0.1]);
    box(podiumGlass, [w * 0.5 + 5.0, 8.3, -1.95], [9.6, 2.2, 0.1]);

    // Elevated Skybridge West towards Central Plaza / Great Eagle Centre (Level 2, y ~ 8.0m)
    box(skybridgeParts, [-w * 0.5 - 5.0, 8.0, 0], [10.0, 4.5, 4.2]);
    box(podiumGlass, [-w * 0.5 - 5.0, 8.3, 1.95], [9.6, 2.2, 0.1]);
    box(podiumGlass, [-w * 0.5 - 5.0, 8.3, -1.95], [9.6, 2.2, 0.1]);
  }

  // --- 2. Main Tower Shaft (18m to 162m) ----------------------------------------------------------------------
  // 36 office storeys, 4.0m floor-to-floor
  {
    const floors = 36;
    const floorH = shaftH / floors; // 4.0m
    const glassH = 2.6;
    const spandrelH = floorH - glassH; // 1.4m

    // Inner structural concrete core
    box(granitePodium, [0, podiumH + shaftH * 0.5, 0], [w - 6.0, shaftH, d - 6.0]);

    for (let f = 0; f < floors; f++) {
      const baseY = podiumH + f * floorH;
      const spandrelY = baseY + spandrelH * 0.5;
      const visionY = baseY + spandrelH + glassH * 0.5;

      // White fritted glass spandrel panels
      box(frittedSpandrels, [0, spandrelY, -d * 0.5 + 1.2], [w - 2.2, spandrelH, 0.2]);
      box(frittedSpandrels, [0, spandrelY, d * 0.5 - 1.2], [w - 2.2, spandrelH, 0.2]);
      box(frittedSpandrels, [-w * 0.5 + 1.2, spandrelY, 0], [0.2, spandrelH, d - 2.2]);
      box(frittedSpandrels, [w * 0.5 - 1.2, spandrelY, 0], [0.2, spandrelH, d - 2.2]);

      // Silver-blue Low-E vision glass
      const isLit0 = hash(f, 0, 49) > 0.64;
      const isLit1 = hash(f, 1, 49) > 0.64;
      const isLit2 = hash(f, 2, 49) > 0.64;
      const isLit3 = hash(f, 3, 49) > 0.64;

      box(isLit0 ? litGlass : silverBlueGlass, [0, visionY, -d * 0.5 + 1.2], [w - 2.4, glassH, 0.14]);
      box(isLit1 ? litGlass : silverBlueGlass, [0, visionY, d * 0.5 - 1.2], [w - 2.4, glassH, 0.14]);
      box(isLit2 ? litGlass : silverBlueGlass, [-w * 0.5 + 1.2, visionY, 0], [0.14, glassH, d - 2.4]);
      box(isLit3 ? litGlass : silverBlueGlass, [w * 0.5 - 1.2, visionY, 0], [0.14, glassH, d - 2.4]);
    }

    // Aerodynamic rounded corner columns (Foster + Partners redesign)
    const midShaftY = podiumH + shaftH * 0.5;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        cylinder(frittedSpandrels, [sx * (w * 0.5 - 1.4), midShaftY, sz * (d * 0.5 - 1.4)], 1.8, shaftH, 16);
      }
    }

    // External vertical sun-shading louvre fins
    for (let x = -w * 0.5 + 3.0; x <= w * 0.5 - 3.0; x += 2.4) {
      box(sunshadingFins, [x, midShaftY, -d * 0.5 + 1.05], [0.08, shaftH, 0.35]);
      box(sunshadingFins, [x, midShaftY, d * 0.5 - 1.05], [0.08, shaftH, 0.35]);
    }
    for (let z = -d * 0.5 + 3.0; z <= d * 0.5 - 3.0; z += 2.4) {
      box(sunshadingFins, [-w * 0.5 + 1.05, midShaftY, z], [0.35, shaftH, 0.08]);
      box(sunshadingFins, [w * 0.5 - 1.05, midShaftY, z], [0.35, shaftH, 0.08]);
    }
  }

  // --- 3. Crown & Mechanical Penthouse (162m to 178m) ---------------------------------------------------------
  // Symmetrical stepped crown with acoustic louvres, illuminated China Resources corporate logo, and beacons
  {
    const crownBaseY = shaftTop;
    const cw = w - 6.0;
    const cd = d - 5.0;

    // Penthouse block
    box(crownParts, [0, crownBaseY + crownH * 0.5, 0], [cw, crownH, cd]);

    // Acoustic louvres slats
    for (let y = crownBaseY + 1.5; y <= crownBaseY + crownH - 1.5; y += 0.8) {
      box(sunshadingFins, [0, y, -cd * 0.5 - 0.1], [cw - 0.4, 0.22, 0.15]);
      box(sunshadingFins, [0, y, cd * 0.5 + 0.1], [cw - 0.4, 0.22, 0.15]);
      box(sunshadingFins, [-cw * 0.5 - 0.1, y, 0], [0.15, 0.22, cd - 0.4]);
      box(sunshadingFins, [cw * 0.5 + 0.1, y, 0], [0.15, 0.22, cd - 0.4]);
    }

    // Parapet trim
    box(sunshadingFins, [0, totalH - 0.3, 0], [cw + 0.4, 0.6, cd + 0.4]);

    // Rooftop Signage: Illuminated "China Resources / 華潤" Corporate Sign
    const signY = crownBaseY + crownH * 0.55;
    // North Sign (facing Victoria Harbour)
    box(crownParts, [0, signY, -cd * 0.5 - 0.25], [22.0, 4.2, 0.15]); // Backing plate
    cylinder(signageParts, [-8.0, signY, -cd * 0.5 - 0.35], 1.6, 0.25, 24, { rx: Math.PI / 2, ry: 0, rz: 0 }); // Red CR emblem
    for (let i = -4.5; i <= 9.5; i += 2.4) {
      box(sunshadingFins, [i, signY, -cd * 0.5 - 0.35], [1.8, 2.2, 0.1]); // English / Chinese lettering blocks
    }

    // South Sign (facing Wan Chai)
    box(crownParts, [0, signY, cd * 0.5 + 0.25], [22.0, 4.2, 0.15]);
    cylinder(signageParts, [8.0, signY, cd * 0.5 + 0.35], 1.6, 0.25, 24, { rx: Math.PI / 2, ry: 0, rz: 0 });
    for (let i = -9.5; i <= 4.5; i += 2.4) {
      box(sunshadingFins, [i, signY, cd * 0.5 + 0.35], [1.8, 2.2, 0.1]);
    }

    // 4 Aviation obstruction warning lights at crown corners
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        cylinder(sunshadingFins, [sx * (cw * 0.5 - 0.3), totalH + 0.4, sz * (cd * 0.5 - 0.3)], 0.08, 0.8, 6);
        box(signageParts, [sx * (cw * 0.5 - 0.3), totalH + 0.85, sz * (cd * 0.5 - 0.3)], [0.22, 0.22, 0.22]);
      }
    }
  }

  // --- Materials Definition -----------------------------------------------------------------------------------
  // 1) Silver-Blue Low-E Reflective Curtain Wall Glass
  const silverBlueGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x2c4856,
    roughness: 0.12,
    metalness: 0.72,
  });

  // 2) Lit Office Glass
  const litGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x486472,
    roughness: 0.2,
    metalness: 0.45,
  });
  litGlassMat.emissiveNode = color(0xfff0d0).mul(nightAmount().mul(0.85).add(0.15));

  // 3) White Fritted Glass Spandrel Panels
  const frittedSpandrelMat = new THREE.MeshStandardMaterial({
    color: 0xd4e0e6,
    roughness: 0.28,
    metalness: 0.45,
  });

  // 4) Silver Sun-shading Louvre Fins & Trims
  const sunshadingFinMat = new THREE.MeshStandardMaterial({
    color: 0xc4d2d8,
    roughness: 0.22,
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
    color: 0x22353e,
    roughness: 0.12,
    metalness: 0.35,
  });

  // 7) Penthouse Crown Casing
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0x263238,
    roughness: 0.55,
    metalness: 0.55,
  });

  // 8) China Resources Red Corporate Signage & Aviation Beacons
  const signageMat = new THREE.MeshStandardNodeMaterial({
    color: 0xcc1122, // CR Red
    roughness: 0.25,
    metalness: 0.5,
  });
  signageMat.emissiveNode = color(0xee2233).mul(nightAmount().mul(0.92).add(0.28));

  // 9) Skybridges
  const skybridgeMat = new THREE.MeshStandardMaterial({
    color: 0x22262a,
    roughness: 0.35,
    metalness: 0.5,
  });

  // Assemble meshes into root group
  merged(root, silverBlueGlass, silverBlueGlassMat, 'China Resources Building silver-blue Low-E curtain wall');
  merged(root, litGlass, litGlassMat, 'China Resources Building lit office glazing');
  merged(root, frittedSpandrels, frittedSpandrelMat, 'China Resources Building fritted spandrels');
  merged(root, sunshadingFins, sunshadingFinMat, 'China Resources Building vertical sun-shading fins');
  merged(root, granitePodium, graniteMat, 'China Resources Building granite podium');
  merged(root, podiumGlass, podiumGlassMat, 'China Resources Building storefront glazing');
  merged(root, crownParts, crownMat, 'China Resources Building mechanical penthouse crown');
  merged(root, signageParts, signageMat, 'China Resources Building corporate signage and beacons');
  merged(root, skybridgeParts, skybridgeMat, 'China Resources Building pedestrian skybridges');

  // --- Colliders ---------------------------------------------------------------------------------------------
  const colliders = [
    // Main tower shaft
    { name: 'China Resources Building Shaft', ...harbourCityLocalCollider(S, 0, 0, w - 2.0, d - 2.0, groundOffset + podiumH, groundOffset + totalH) },
    // Podium volume
    { name: 'China Resources Building Podium', ...harbourCityLocalCollider(S, 0, 0, w - 1.0, d - 1.0, groundOffset, groundOffset + podiumH) },
    // East Skybridge
    { name: 'China Resources Building East Skybridge', ...harbourCityLocalCollider(S, w * 0.5 + 5.0, 0, 10.0, 4.2, groundOffset + 6.0, groundOffset + 10.5) },
    // West Skybridge
    { name: 'China Resources Building West Skybridge', ...harbourCityLocalCollider(S, -w * 0.5 - 5.0, 0, 10.0, 4.2, groundOffset + 6.0, groundOffset + 10.5) },
  ];

  const landmark = {
    id: 'china-resources-building',
    name: '華潤大廈 China Resources Building',
    englishName: 'China Resources Building',
    position: { x: S.x, y: groundOffset, z: S.z },
    radius: Math.max(w, d) * 0.65,
    height: totalH,
  };

  return {
    group: root,
    colliders,
    landmarks: [landmark],
    stats: {
      crbHeight: totalH,
      crbStoreys: S.storeys,
      crbCurtainPanes: silverBlueGlass.length + litGlass.length,
      crbSpandrels: frittedSpandrels.length,
      crbSunshadingFins: sunshadingFins.length,
    },
    groundOffset,
  };
}
