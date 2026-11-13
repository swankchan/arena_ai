// 交易廣場第三座 Three Exchange Square, 8 Connaught Place, Central (中環康樂廣場8號, 1988).
//
// The 144-metre 32-storey commercial highrise completes the Exchange Square civic plaza complex
// designed by Palmer & Turner. Features curved quadrant geometry, polished Spanish rose-beige granite
// cladding, dark bronze-tinted ribbon glazing, and elevated skybridge connections.
//
// OSM Way: 148554950 (height: 144m).
import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  THREE_EXCHANGE_SITE as S,
  threeExchangeLocalToWorld
} from './three-exchange-square-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';

export function buildThreeExchangeSquare(scene, options = {}) {
  const groundOffset = options.groundOffset ?? hongKongTerrainHeight(S.x, S.z);

  const root = new THREE.Group();
  root.name = 'Three Exchange Square — 交易廣場第三座';
  root.position.set(S.x, groundOffset, S.z);
  root.rotation.y = S.ry;
  scene.add(root);

  // Collections for merged geometries
  const bronzeGlass = [];
  const litGlass = [];
  const roseGranite = [];
  const bronzeMullions = [];
  const podiumGlass = [];
  const crownParts = [];
  const skybridgeParts = [];
  const beaconParts = [];

  const w = S.w; // ~39.26m
  const d = S.d; // ~38.81m
  const podiumH = S.podiumHeight; // 16.0m
  const totalH = S.height; // 144.0m
  const crownH = S.crownHeight; // 12.0m
  const shaftTop = totalH - crownH; // 132.0m
  const shaftH = shaftTop - podiumH; // 116.0m

  // --- 1. Commercial Podium & Skybridge Network (0 to 16m) ----------------------------------------------------
  {
    // Main granite podium block
    box(roseGranite, [0, podiumH * 0.5, 0], [w - 1.5, podiumH, d - 1.5]);

    // Elevated pedestrian walkway level (Level 2/3, y ~ 8.0m)
    for (let floor = 0; floor < 2; floor++) {
      const fy = 2.0 + floor * 5.5;
      box(podiumGlass, [0, fy + 2.2, -d * 0.5 + 0.6], [w - 4.0, 4.4, 0.1]);
      box(podiumGlass, [0, fy + 2.2, d * 0.5 - 0.6], [w - 4.0, 4.4, 0.1]);
      for (let x = -w * 0.5 + 4.0; x <= w * 0.5 - 4.0; x += 4.5) {
        box(roseGranite, [x, fy + 2.2, -d * 0.5 + 0.5], [1.1, 4.8, 0.4]);
        box(roseGranite, [x, fy + 2.2, d * 0.5 - 0.5], [1.1, 4.8, 0.4]);
      }
    }

    // Skybridge to One/Two Exchange Square Plaza (Northwest, Level 2, y ~ 7.5m)
    box(skybridgeParts, [-w * 0.5 - 5.0, 7.5, 2.0], [10.0, 4.5, 4.2]);
    box(podiumGlass, [-w * 0.5 - 5.0, 7.8, 4.15], [9.6, 2.2, 0.1]);
    box(podiumGlass, [-w * 0.5 - 5.0, 7.8, -0.15], [9.6, 2.2, 0.1]);

    // Skybridge to Connaught Place / Central elevated walkways (East, Level 2, y ~ 7.5m)
    box(skybridgeParts, [w * 0.5 + 5.0, 7.5, -2.0], [10.0, 4.5, 4.2]);
    box(podiumGlass, [w * 0.5 + 5.0, 7.8, 0.15], [9.6, 2.2, 0.1]);
    box(podiumGlass, [w * 0.5 + 5.0, 7.8, -4.15], [9.6, 2.2, 0.1]);
  }

  // --- 2. Curved Quadrant Tower Shaft (16m to 132m) -----------------------------------------------------------
  // 28 office storeys with polished Spanish rose-beige granite spandrels and bronze ribbon windows
  {
    const floors = 28;
    const floorH = shaftH / floors; // ~4.14m
    const glassH = floorH * 0.52; // ~2.15m
    const spandrelH = floorH - glassH; // ~1.99m

    // Concrete core
    box(roseGranite, [0, podiumH + shaftH * 0.5, 0], [w - 5.5, shaftH, d - 5.5]);

    for (let f = 0; f < floors; f++) {
      const baseY = podiumH + f * floorH;
      const spandrelY = baseY + spandrelH * 0.5;
      const visionY = baseY + spandrelH + glassH * 0.5;

      // Rose-beige granite spandrels
      box(roseGranite, [0, spandrelY, -d * 0.5 + 2.0], [w - 4.0, spandrelH, 0.3]);
      box(roseGranite, [0, spandrelY, d * 0.5 - 2.0], [w - 4.0, spandrelH, 0.3]);
      box(roseGranite, [-w * 0.5 + 2.0, spandrelY, 0], [0.3, spandrelH, d - 4.0]);
      box(roseGranite, [w * 0.5 - 2.0, spandrelY, 0], [0.3, spandrelH, d - 4.0]);

      // Bronze ribbon vision glass (with randomized night office lighting)
      const isLit0 = hash(f, 0, 32) > 0.65;
      const isLit1 = hash(f, 1, 32) > 0.65;
      const isLit2 = hash(f, 2, 32) > 0.65;
      const isLit3 = hash(f, 3, 32) > 0.65;

      box(isLit0 ? litGlass : bronzeGlass, [0, visionY, -d * 0.5 + 2.0], [w - 4.2, glassH, 0.14]);
      box(isLit1 ? litGlass : bronzeGlass, [0, visionY, d * 0.5 - 2.0], [w - 4.2, glassH, 0.14]);
      box(isLit2 ? litGlass : bronzeGlass, [-w * 0.5 + 2.0, visionY, 0], [0.14, glassH, d - 4.2]);
      box(isLit3 ? litGlass : bronzeGlass, [w * 0.5 - 2.0, visionY, 0], [0.14, glassH, d - 4.2]);
    }

    // Corner granite cylindrical accent columns (P&T signature style)
    const midShaftY = podiumH + shaftH * 0.5;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        cylinder(roseGranite, [sx * (w * 0.5 - 2.0), midShaftY, sz * (d * 0.5 - 2.0)], 1.8, shaftH, 16);
      }
    }

    // Vertical bronze mullion mullion fins
    for (let x = -w * 0.5 + 4.5; x <= w * 0.5 - 4.5; x += 3.2) {
      box(bronzeMullions, [x, midShaftY, -d * 0.5 + 1.85], [0.08, shaftH, 0.22]);
      box(bronzeMullions, [x, midShaftY, d * 0.5 - 1.85], [0.08, shaftH, 0.22]);
    }
    for (let z = -d * 0.5 + 4.5; z <= d * 0.5 - 4.5; z += 3.2) {
      box(bronzeMullions, [-w * 0.5 + 1.85, midShaftY, z], [0.22, shaftH, 0.08]);
      box(bronzeMullions, [w * 0.5 - 1.85, midShaftY, z], [0.22, shaftH, 0.08]);
    }
  }

  // --- 3. Crown & Mechanical Penthouse (132m to 144m) ---------------------------------------------------------
  // Stepped mechanical crown matching One & Two Exchange Square
  {
    const crownBaseY = shaftTop;
    const cw = w - 8.0;
    const cd = d - 8.0;

    // Penthouse granite core
    box(crownParts, [0, crownBaseY + crownH * 0.5, 0], [cw, crownH, cd]);

    // Acoustic louvres on crown
    for (let y = crownBaseY + 1.2; y <= crownBaseY + crownH - 1.2; y += 0.75) {
      box(bronzeMullions, [0, y, -cd * 0.5 - 0.1], [cw - 0.4, 0.22, 0.15]);
      box(bronzeMullions, [0, y, cd * 0.5 + 0.1], [cw - 0.4, 0.22, 0.15]);
      box(bronzeMullions, [-cw * 0.5 - 0.1, y, 0], [0.15, 0.22, cd - 0.4]);
      box(bronzeMullions, [cw * 0.5 + 0.1, y, 0], [0.15, 0.22, cd - 0.4]);
    }

    // Parapet trim
    box(roseGranite, [0, totalH - 0.3, 0], [cw + 0.4, 0.6, cd + 0.4]);

    // Aviation obstruction warning lights
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        cylinder(bronzeMullions, [sx * (cw * 0.5 - 0.3), totalH + 0.4, sz * (cd * 0.5 - 0.3)], 0.08, 0.8, 6);
        box(beaconParts, [sx * (cw * 0.5 - 0.3), totalH + 0.85, sz * (cd * 0.5 - 0.3)], [0.22, 0.22, 0.22]);
      }
    }
  }

  // --- Materials Definition -----------------------------------------------------------------------------------
  // 1) Dark Bronze Reflective Ribbon Window Glass
  const bronzeGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x483c32,
    roughness: 0.15,
    metalness: 0.65,
  });

  // 2) Lit Office Glass
  const litGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x6e5a48,
    roughness: 0.2,
    metalness: 0.45,
  });
  litGlassMat.emissiveNode = color(0xffe2a8).mul(nightAmount().mul(0.85).add(0.15));

  // 3) Polished Spanish Rose-Beige Granite (Exchange Square matching signature color)
  const roseGraniteMat = new THREE.MeshStandardMaterial({
    color: 0xc3ae99,
    roughness: 0.52,
    metalness: 0.22,
  });

  // 4) Dark Bronze Window Frames & Mullions
  const bronzeMullionMat = new THREE.MeshStandardMaterial({
    color: 0x645042,
    roughness: 0.32,
    metalness: 0.75,
  });

  // 5) Podium Storefront Glass
  const podiumGlassMat = new THREE.MeshStandardMaterial({
    color: 0x223038,
    roughness: 0.12,
    metalness: 0.35,
  });

  // 6) Penthouse Crown Casing
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0x8a7868,
    roughness: 0.58,
    metalness: 0.35,
  });

  // 7) Pedestrian Skybridges
  const skybridgeMat = new THREE.MeshStandardMaterial({
    color: 0x3a322c,
    roughness: 0.35,
    metalness: 0.55,
  });

  // 8) Aviation Warning Beacons
  const beaconMat = new THREE.MeshStandardNodeMaterial({
    color: 0xcc1122,
    roughness: 0.25,
    metalness: 0.5,
  });
  beaconMat.emissiveNode = color(0xee2233).mul(nightAmount().mul(0.9).add(0.3));

  // Assemble meshes into root group
  merged(root, bronzeGlass, bronzeGlassMat, 'Three Exchange Square bronze reflective ribbon glazing');
  merged(root, litGlass, litGlassMat, 'Three Exchange Square lit office glazing');
  merged(root, roseGranite, roseGraniteMat, 'Three Exchange Square rose-beige granite facade');
  merged(root, bronzeMullions, bronzeMullionMat, 'Three Exchange Square bronze mullion fins');
  merged(root, podiumGlass, podiumGlassMat, 'Three Exchange Square podium storefront glazing');
  merged(root, crownParts, crownMat, 'Three Exchange Square mechanical penthouse crown');
  merged(root, skybridgeParts, skybridgeMat, 'Three Exchange Square pedestrian skybridges');
  merged(root, beaconParts, beaconMat, 'Three Exchange Square aviation beacons');

  // --- Colliders ---------------------------------------------------------------------------------------------
  const colliders = [
    // Main tower shaft
    { name: 'Three Exchange Square Shaft', ...harbourCityLocalCollider(S, 0, 0, w - 4.0, d - 4.0, groundOffset + podiumH, groundOffset + totalH) },
    // Podium volume
    { name: 'Three Exchange Square Podium', ...harbourCityLocalCollider(S, 0, 0, w - 1.0, d - 1.0, groundOffset, groundOffset + podiumH) },
    // Northwest Skybridge to Exchange Square Plaza
    { name: 'Three Exchange Square NW Skybridge', ...harbourCityLocalCollider(S, -w * 0.5 - 5.0, 2.0, 10.0, 4.2, groundOffset + 5.5, groundOffset + 10.0) },
    // East Skybridge to Connaught Place
    { name: 'Three Exchange Square East Skybridge', ...harbourCityLocalCollider(S, w * 0.5 + 5.0, -2.0, 10.0, 4.2, groundOffset + 5.5, groundOffset + 10.0) },
  ];

  const landmark = {
    id: 'three-exchange-square',
    name: '交易廣場第三座 Three Exchange Square',
    englishName: 'Three Exchange Square',
    position: { x: S.x, y: groundOffset, z: S.z },
    radius: Math.max(w, d) * 0.65,
    height: totalH,
  };

  return {
    group: root,
    colliders,
    landmarks: [landmark],
    stats: {
      threeExchangeHeight: totalH,
      threeExchangeStoreys: S.storeys,
      threeExchangeCurtainPanes: bronzeGlass.length + litGlass.length,
      threeExchangeGraniteParts: roseGranite.length,
      threeExchangeMullions: bronzeMullions.length,
    },
    groundOffset,
  };
}
