// 友邦金融中心 AIA Central, 1 Connaught Road Central (中環干諾道中1號, 2005).
//
// Designed by Skidmore, Owings & Merrill (SOM) and Aedas, the 185-metre 35-storey landmark
// evokes the billowing sails of traditional Chinese junk boats gliding across Victoria Harbour.
// Features a sweeping aerodynamic curved curtain wall, vertical stainless steel pinstripes,
// horizontal sunshades, a 14-metre transparent glass lobby, and a dramatic sloping prow crown.
//
// OSM Way: 107324767 (version 8, height: 185m).
import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  AIA_CENTRAL_SITE as S,
  aiaCentralLocalToWorld
} from './aia-central-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';

export function buildAiaCentral(scene, options = {}) {
  const groundOffset = options.groundOffset ?? hongKongTerrainHeight(S.x, S.z);

  const root = new THREE.Group();
  root.name = 'AIA Central — 友邦金融中心';
  root.position.set(S.x, groundOffset, S.z);
  root.rotation.y = S.ry;
  scene.add(root);

  // Collections for merged geometries
  const curtainGlass = [];
  const litGlass = [];
  const stainlessSteel = [];
  const darkSpandrels = [];
  const lobbyGlass = [];
  const granitePaving = [];
  const crownProw = [];
  const signageParts = [];

  const w = S.w; // ~41.67m
  const d = S.d; // ~41.30m
  const lobbyH = S.lobbyHeight; // 14.0m
  const totalH = S.height; // 185.0m
  const crownH = S.crownHeight; // 25.0m
  const shaftTop = totalH - crownH; // 160.0m
  const shaftH = shaftTop - lobbyH; // 146.0m

  // --- 1. Ground Plaza, Grand Lobby & Covered Driveway (0 to 14m) --------------------------------------------
  {
    // Plaza granite paving
    box(granitePaving, [0, 0.1, 0], [w + 2.0, 0.2, d + 2.0]);

    // 3-Storey High-Transparency Glass Lobby (Facing Chater Garden / Connaught Road)
    // Recessed lobby glazing enclosure
    box(lobbyGlass, [-2.0, lobbyH * 0.5, 0], [w - 10.0, lobbyH, d - 8.0]);

    // Stainless steel structural lobby columns
    for (const x of [-w * 0.5 + 4.0, -2.0, w * 0.5 - 6.0]) {
      for (const z of [-d * 0.5 + 4.0, 0, d * 0.5 - 4.0]) {
        cylinder(stainlessSteel, [x, lobbyH * 0.5, z], 0.75, lobbyH, 16);
      }
    }

    // Lobby mullions and transoms
    for (let x = -w * 0.5 + 5.0; x <= w * 0.5 - 7.0; x += 3.5) {
      box(stainlessSteel, [x, lobbyH * 0.5, -d * 0.5 + 4.0], [0.12, lobbyH, 0.22]);
      box(stainlessSteel, [x, lobbyH * 0.5, d * 0.5 - 4.0], [0.12, lobbyH, 0.22]);
    }
    for (let y = 3.5; y <= lobbyH - 1.0; y += 3.5) {
      box(stainlessSteel, [-2.0, y, -d * 0.5 + 4.0], [w - 10.0, 0.14, 0.22]);
      box(stainlessSteel, [-2.0, y, d * 0.5 - 4.0], [w - 10.0, 0.14, 0.22]);
    }

    // North Entrance Canopy (facing Connaught Road Central)
    box(stainlessSteel, [-2.0, 4.6, -d * 0.5 - 2.5], [16.0, 0.35, 6.0]);
    box(lobbyGlass, [-2.0, 4.7, -d * 0.5 - 2.5], [15.6, 0.1, 5.6]);

    // Covered vehicle drop-off loop (Porte-Cochère, eastern side, clearance 5.5m)
    // Ceiling soffit over the driveway
    box(darkSpandrels, [w * 0.5 - 5.0, 6.5, 0], [10.0, 0.4, d - 4.0]);
    // Driveway road surface slab
    box(granitePaving, [w * 0.5 - 5.0, 0.05, 0], [10.0, 0.1, d - 2.0]);
  }

  // --- 2. Main Tower Shaft: The Billowing Chinese Junk Sail (14m to 160m) -------------------------------------
  // 32 office storeys with sweeping curved sail profile and stainless steel pinstripes
  {
    const floors = 32;
    const floorH = shaftH / floors; // ~4.56m per storey
    const glassH = floorH * 0.65; // ~2.96m
    const spandrelH = floorH - glassH; // ~1.60m

    // Core structural volume inside the curtain wall
    box(darkSpandrels, [0, lobbyH + shaftH * 0.5, 0], [w - 2.5, shaftH, d - 2.5]);

    for (let f = 0; f < floors; f++) {
      const baseY = lobbyH + f * floorH;
      const spandrelY = baseY + spandrelH * 0.5;
      const visionY = baseY + spandrelH + glassH * 0.5;

      // Sail curvature factor: west facade subtly bows outward in the lower-mid body and tapers upward
      const normHeight = f / floors; // 0 to 1
      const sailBulge = Math.sin(normHeight * Math.PI) * 1.6; // gentle outward sail billow
      const curW = w + sailBulge;

      // Spandrels
      box(darkSpandrels, [0, spandrelY, -d * 0.5], [curW, spandrelH, 0.2]); // North
      box(darkSpandrels, [0, spandrelY, d * 0.5], [curW, spandrelH, 0.2]); // South
      box(darkSpandrels, [-curW * 0.5, spandrelY, 0], [0.2, spandrelH, d]); // West (billowing sail face)
      box(darkSpandrels, [curW * 0.5, spandrelY, 0], [0.2, spandrelH, d]); // East

      // Horizontal louvered sunshades (SOM signature feature)
      box(stainlessSteel, [0, spandrelY + spandrelH * 0.5, -d * 0.5 - 0.25], [curW + 0.4, 0.08, 0.5]);
      box(stainlessSteel, [0, spandrelY + spandrelH * 0.5, d * 0.5 + 0.25], [curW + 0.4, 0.08, 0.5]);
      box(stainlessSteel, [-curW * 0.5 - 0.25, spandrelY + spandrelH * 0.5, 0], [0.5, 0.08, d + 0.4]);

      // Vision glass (alternating lit and silver-blue reflective glass)
      const isLitNorth = hash(f, 1, 32) > 0.65;
      const isLitSouth = hash(f, 2, 32) > 0.65;
      const isLitWest = hash(f, 3, 32) > 0.65;
      const isLitEast = hash(f, 4, 32) > 0.65;

      box(isLitNorth ? litGlass : curtainGlass, [0, visionY, -d * 0.5 - 0.02], [curW - 0.2, glassH, 0.16]);
      box(isLitSouth ? litGlass : curtainGlass, [0, visionY, d * 0.5 + 0.02], [curW - 0.2, glassH, 0.16]);
      box(isLitWest ? litGlass : curtainGlass, [-curW * 0.5 - 0.02, visionY, 0], [0.16, glassH, d - 0.2]);
      box(isLitEast ? litGlass : curtainGlass, [curW * 0.5 + 0.02, visionY, 0], [0.16, glassH, d - 0.2]);
    }

    // Continuous vertical stainless steel pinstripe fins running up the facades
    const midShaftY = lobbyH + shaftH * 0.5;
    for (let x = -w * 0.5 + 2.0; x <= w * 0.5 - 2.0; x += 2.4) {
      box(stainlessSteel, [x, midShaftY, -d * 0.5 - 0.14], [0.08, shaftH, 0.28]);
      box(stainlessSteel, [x, midShaftY, d * 0.5 + 0.14], [0.08, shaftH, 0.28]);
    }
    for (let z = -d * 0.5 + 2.0; z <= d * 0.5 - 2.0; z += 2.4) {
      box(stainlessSteel, [-w * 0.5 - 0.14, midShaftY, z], [0.28, shaftH, 0.08]);
      box(stainlessSteel, [w * 0.5 + 0.14, midShaftY, z], [0.28, shaftH, 0.08]);
    }
  }

  // --- 3. Aerodynamic Sloping Prow Crown (160m to 185m) -------------------------------------------------------
  // Signature SOM sloping sail prow with illuminated translucent glass fins and rooftop plant
  {
    const crownBaseY = shaftTop;
    const prowSteps = 10;

    // Sloping prow volume: rising from 160m on the east side up to 185m on the west prow peak!
    for (let step = 0; step < prowSteps; step++) {
      const t = step / prowSteps;
      const stepH = crownH / prowSteps; // 2.5m per step
      const stepY = crownBaseY + step * stepH + stepH * 0.5;
      const stepW = w * (1.0 - t * 0.45); // tapers inward toward peak
      const stepD = d * (1.0 - t * 0.35);
      const shiftX = -t * 6.5; // leans towards west prow

      // Stepped crown structural enclosure
      box(darkSpandrels, [shiftX, stepY, 0], [stepW, stepH, stepD]);

      // Crown translucent glass louvres / fin blades (glowing at night)
      box(crownProw, [shiftX - stepW * 0.5 - 0.15, stepY, 0], [0.2, stepH * 0.9, stepD + 0.3]);
      box(crownProw, [shiftX, stepY, -stepD * 0.5 - 0.15], [stepW + 0.3, stepH * 0.9, 0.2]);
      box(crownProw, [shiftX, stepY, stepD * 0.5 + 0.15], [stepW + 0.3, stepH * 0.9, 0.2]);

      // Stainless steel crown ribs
      box(stainlessSteel, [shiftX - stepW * 0.5 - 0.25, stepY, -stepD * 0.5 - 0.25], [0.35, stepH, 0.35]);
      box(stainlessSteel, [shiftX - stepW * 0.5 - 0.25, stepY, stepD * 0.5 + 0.25], [0.35, stepH, 0.35]);
    }

    // Summit peak at 185m: sharp aerodynamic prow tip
    box(stainlessSteel, [-7.2, totalH - 0.6, 0], [1.2, 1.2, d * 0.5]);
    box(crownProw, [-7.5, totalH - 0.4, 0], [0.4, 1.8, d * 0.45]);

    // Corporate Rooftop Signage ("AIA" logo emblem on North and South faces)
    const signY = crownBaseY + 6.5;
    // North sign (facing Victoria Harbour)
    box(signageParts, [-3.0, signY, -d * 0.5 - 0.35], [7.5, 3.8, 0.15]); // Red AIA shield
    box(stainlessSteel, [-3.0, signY, -d * 0.5 - 0.45], [5.5, 2.6, 0.1]); // White AIA letters
    // South sign (facing Central / The Peak)
    box(signageParts, [-3.0, signY, d * 0.5 + 0.35], [7.5, 3.8, 0.15]);
    box(stainlessSteel, [-3.0, signY, d * 0.5 + 0.45], [5.5, 2.6, 0.1]);

    // Red aviation obstruction warning lights at summit peak
    for (const sz of [-1, 1]) {
      cylinder(stainlessSteel, [-7.0, totalH + 0.4, sz * (d * 0.2)], 0.08, 0.8, 6);
      box(signageParts, [-7.0, totalH + 0.85, sz * (d * 0.2)], [0.22, 0.22, 0.22]);
    }
  }

  // --- Materials Definition -----------------------------------------------------------------------------------
  // 1) Silver-Blue Reflective Low-E Curtain Wall Glass
  const curtainGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x355263,
    roughness: 0.12,
    metalness: 0.58,
  });

  // 2) Lit Office Glass (warm scattered interior office glow at night)
  const litGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x5a7585,
    roughness: 0.18,
    metalness: 0.45,
  });
  litGlassMat.emissiveNode = color(0xffe2a0).mul(nightAmount().mul(0.85).add(0.15));

  // 3) Polished Stainless Steel (Mullion Fins, Canopy, and Ribs)
  const stainlessSteelMat = new THREE.MeshStandardMaterial({
    color: 0xd4dee4,
    roughness: 0.22,
    metalness: 0.90,
  });

  // 4) Dark Graphite Spandrels & Core
  const darkSpandrelMat = new THREE.MeshStandardMaterial({
    color: 0x20262b,
    roughness: 0.40,
    metalness: 0.35,
  });

  // 5) High-Transparency Ground Lobby Glass
  const lobbyGlassMat = new THREE.MeshStandardMaterial({
    color: 0x243945,
    roughness: 0.08,
    metalness: 0.32,
    transparent: true,
    opacity: 0.88,
  });

  // 6) Granite Paving (Plaza & Colonnade)
  const graniteMat = new THREE.MeshStandardMaterial({
    color: 0x25292c,
    roughness: 0.65,
    metalness: 0.15,
  });

  // 7) Translucent Glowing Crown Prow Fins
  const crownProwMat = new THREE.MeshStandardNodeMaterial({
    color: 0xb8d8ec,
    roughness: 0.25,
    metalness: 0.45,
  });
  crownProwMat.emissiveNode = color(0x70b5e8).mul(nightAmount().mul(0.85).add(0.15));

  // 8) Corporate AIA Red Signage & Beacons
  const signageMat = new THREE.MeshStandardNodeMaterial({
    color: 0xd31145, // AIA Red
    roughness: 0.25,
    metalness: 0.5,
  });
  signageMat.emissiveNode = color(0xd31145).mul(nightAmount().mul(0.9).add(0.3));

  // Assemble meshes into root group
  merged(root, curtainGlass, curtainGlassMat, 'AIA Central silver-blue reflective curtain wall');
  merged(root, litGlass, litGlassMat, 'AIA Central lit office glazing');
  merged(root, stainlessSteel, stainlessSteelMat, 'AIA Central stainless steel fins and sunshades');
  merged(root, darkSpandrels, darkSpandrelMat, 'AIA Central dark spandrel bands');
  merged(root, lobbyGlass, lobbyGlassMat, 'AIA Central 14m high transparent lobby glazing');
  merged(root, granitePaving, graniteMat, 'AIA Central granite plaza and driveway');
  merged(root, crownProw, crownProwMat, 'AIA Central glowing crown sail prow fins');
  merged(root, signageParts, signageMat, 'AIA Central corporate signage and beacons');

  // --- Colliders ---------------------------------------------------------------------------------------------
  const colliders = [
    // Main tower volume
    { name: 'AIA Central Tower', ...harbourCityLocalCollider(S, 0, 0, w, d, groundOffset + lobbyH, groundOffset + totalH) },
    // Grand lobby & base
    { name: 'AIA Central Lobby', ...harbourCityLocalCollider(S, -2.0, 0, w - 8.0, d - 6.0, groundOffset, groundOffset + lobbyH) },
    // Covered driveway canopy
    { name: 'AIA Central Porte-Cochere', ...harbourCityLocalCollider(S, w * 0.5 - 5.0, 0, 10.0, d - 4.0, groundOffset + 5.5, groundOffset + lobbyH) },
  ];

  const landmark = {
    id: 'aia-central',
    name: '友邦金融中心 AIA Central',
    englishName: 'AIA Central',
    position: { x: S.x, y: groundOffset, z: S.z },
    radius: Math.max(w, d) * 0.65,
    height: totalH,
  };

  return {
    group: root,
    colliders,
    landmarks: [landmark],
    stats: {
      aiaHeight: totalH,
      aiaStoreys: S.storeys,
      aiaLevels: S.levels,
      aiaCurtainPanes: curtainGlass.length + litGlass.length,
      aiaStainlessElements: stainlessSteel.length,
      aiaProwElements: crownProw.length,
    },
    groundOffset,
  };
}
