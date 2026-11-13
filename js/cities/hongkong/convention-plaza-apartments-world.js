// 會景閣 Convention Plaza Apartments, 1 Harbour Road, Wan Chai (灣仔港灣道1號, 1989).
//
// 164-metre 47-storey luxury serviced residential skyscraper designed by Ng Chun Man & Associates
// atop the HKCEC Phase 1 podium complex.
//
// OSM Way: 107497692 (height: 164m, building:levels: 47, building:min_level: 10).
import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  CONVENTION_PLAZA_APARTMENTS_SITE as S,
  conventionPlazaApartmentsLocalToWorld
} from './convention-plaza-apartments-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';

export function buildConventionPlazaApartments(scene, options = {}) {
  const groundOffset = options.groundOffset ?? hongKongTerrainHeight(S.x, S.z);

  const root = new THREE.Group();
  root.name = 'Convention Plaza Apartments — 會景閣';
  root.position.set(S.x, groundOffset, S.z);
  root.rotation.y = S.ry;
  scene.add(root);

  // Collections for merged geometries
  const bronzeGlass = [];
  const litGlass = [];
  const champagneSpandrels = [];
  const bronzeMullions = [];
  const podiumGranite = [];
  const podiumGlass = [];
  const leisureDeck = [];
  const poolWater = [];
  const crownParts = [];
  const skybridgeParts = [];
  const beaconParts = [];

  const w = S.w; // 83.3m
  const d = S.d; // 48.28m
  const podiumH = S.podiumHeight; // 28.0m
  const totalH = S.height; // 164.0m
  const crownH = S.crownHeight; // 12.0m
  const shaftTop = totalH - crownH; // 152.0m
  const shaftH = shaftTop - podiumH; // 124.0m

  // --- 1. Commercial / HKCEC Phase 1 Podium Base (0 to 28m) --------------------------------------------------
  {
    // Integrated podium base
    box(podiumGranite, [0, podiumH * 0.5, 0], [w - 2.0, podiumH, d - 2.0]);

    // Ground floor porte-cochere drop-off and lobby glazing
    box(podiumGlass, [0, 4.0, -d * 0.5 + 0.8], [w - 8.0, 6.0, 0.2]);
    box(podiumGlass, [0, 4.0, d * 0.5 - 0.8], [w - 8.0, 6.0, 0.2]);

    // Entrance canopy over drop-off driveway
    box(champagneSpandrels, [0, 5.0, -d * 0.5 - 3.5], [26.0, 0.8, 8.0]);
    cylinder(bronzeMullions, [-11.0, 2.5, -d * 0.5 - 7.0], 0.35, 5.0, 8);
    cylinder(bronzeMullions, [11.0, 2.5, -d * 0.5 - 7.0], 0.35, 5.0, 8);

    // Podium mid-tier storefronts and architectural reveals
    for (let f = 1; f < 4; f++) {
      const fy = 8.0 + f * 5.5;
      box(podiumGlass, [15, fy, d * 0.5 - 0.8], [35.0, 3.8, 0.1]);
      box(podiumGlass, [-15, fy, d * 0.5 - 0.8], [35.0, 3.8, 0.1]);
    }

    // Skybridge connecting to Harbour Road pedestrian network (Level 2, y ~ 8.0m)
    box(skybridgeParts, [0, 8.0, -d * 0.5 - 6.0], [4.5, 4.2, 12.0]);
    box(podiumGlass, [2.15, 8.3, -d * 0.5 - 6.0], [0.1, 2.2, 11.6]);
    box(podiumGlass, [-2.15, 8.3, -d * 0.5 - 6.0], [0.1, 2.2, 11.6]);
  }

  // --- 2. Podium Recreation Deck & Swimming Pool (28m to 32m) -------------------------------------------------
  {
    // Sun deck paving
    box(leisureDeck, [0, podiumH + 0.3, 0], [w - 4.0, 0.6, d - 4.0]);

    // Swimming pool (25m x 10m outdoor pool on podium roof)
    box(poolWater, [18.0, podiumH + 0.55, -8.0], [25.0, 0.2, 10.0]);
    box(podiumGranite, [18.0, podiumH + 0.4, -8.0], [27.0, 0.4, 12.0]); // pool curb

    // Landscaped perimeter planters & pergolas
    box(podiumGranite, [-20.0, podiumH + 0.8, -12.0], [18.0, 1.0, 6.0]);
    box(champagneSpandrels, [-20.0, podiumH + 2.8, -12.0], [18.4, 0.3, 6.4]);
  }

  // --- 3. Faceted Residential Tower Shaft (32m to 152m) -------------------------------------------------------
  // The tower body consists of two offset angled residential wings:
  // - East Wing: approx [x: 15, z: 8], size [44, 26]
  // - West Wing: approx [x: -20, z: -5], size [36, 26]
  // - Central link & lift core: approx [x: -2, z: 2], size [20, 24]
  {
    const floors = 36;
    const floorH = (shaftH - 4.0) / floors; // ~3.33m per residential floor
    const startY = podiumH + 4.0; // 32.0m

    // Inner structural concrete cores
    box(podiumGranite, [16.0, startY + (shaftH - 4.0) * 0.5, 9.0], [40.0, shaftH - 4.0, 22.0]);
    box(podiumGranite, [-21.0, startY + (shaftH - 4.0) * 0.5, -4.0], [32.0, shaftH - 4.0, 22.0]);
    box(podiumGranite, [-2.0, startY + (shaftH - 4.0) * 0.5, 2.5], [18.0, shaftH - 4.0, 20.0]);

    const glassH = floorH * 0.62; // ~2.06m
    const spandrelH = floorH - glassH; // ~1.27m

    for (let f = 0; f < floors; f++) {
      const baseY = startY + f * floorH;
      const spandrelY = baseY + spandrelH * 0.5;
      const visionY = baseY + spandrelH + glassH * 0.5;

      // --- East Wing Facades (facing Victoria Harbour and Harbour Road) ---
      // Spandrels
      box(champagneSpandrels, [16.0, spandrelY, 20.2], [40.4, spandrelH, 0.2]);
      box(champagneSpandrels, [16.0, spandrelY, -2.2], [40.4, spandrelH, 0.2]);
      box(champagneSpandrels, [36.2, spandrelY, 9.0], [0.2, spandrelH, 22.4]);

      // Vision glass & residential lit windows — subdivided into realistic window bays with scattered randomized night illumination
      // East Wing North & South (40m span, centered at x=16)
      const numBaysE40 = 16;
      const bayE40 = 40.0 / numBaysE40;
      for (let b = 0; b < numBaysE40; b++) {
        const lx = -4.0 + (b + 0.5) * bayE40;
        const eLitN = hash(f, b, 0, 47) < 0.28;
        const eLitS = hash(f, b, 1, 47) < 0.28;
        box(eLitN ? litGlass : bronzeGlass, [lx, visionY, 20.2], [bayE40 - 0.04, glassH, 0.14]);
        box(eLitS ? litGlass : bronzeGlass, [lx, visionY, -2.2], [bayE40 - 0.04, glassH, 0.14]);
      }
      // East Wing East (22m span, centered at z=9)
      const numBaysE22 = 9;
      const bayE22 = 22.0 / numBaysE22;
      for (let b = 0; b < numBaysE22; b++) {
        const lz = -2.0 + (b + 0.5) * bayE22;
        const eLitE = hash(f, b, 2, 47) < 0.28;
        box(eLitE ? litGlass : bronzeGlass, [36.2, visionY, lz], [0.14, glassH, bayE22 - 0.04]);
      }

      // Balconies / loggias along East Wing Harbour view (North face)
      for (let bx = 0; bx <= 30; bx += 7.5) {
        box(champagneSpandrels, [bx, visionY - glassH * 0.25, 20.6], [3.2, 0.9, 0.6]);
      }

      // --- West Wing Facades ---
      // Spandrels
      box(champagneSpandrels, [-21.0, spandrelY, 7.2], [32.4, spandrelH, 0.2]);
      box(champagneSpandrels, [-21.0, spandrelY, -15.2], [32.4, spandrelH, 0.2]);
      box(champagneSpandrels, [-37.2, spandrelY, -4.0], [0.2, spandrelH, 22.4]);

      // Vision glass & residential lit windows (West Wing)
      const numBaysW32 = 13;
      const bayW32 = 32.0 / numBaysW32;
      for (let b = 0; b < numBaysW32; b++) {
        const lx = -37.0 + (b + 0.5) * bayW32;
        const wLitN = hash(f, b, 3, 47) < 0.28;
        const wLitS = hash(f, b, 4, 47) < 0.28;
        box(wLitN ? litGlass : bronzeGlass, [lx, visionY, 7.2], [bayW32 - 0.04, glassH, 0.14]);
        box(wLitS ? litGlass : bronzeGlass, [lx, visionY, -15.2], [bayW32 - 0.04, glassH, 0.14]);
      }
      for (let b = 0; b < numBaysE22; b++) {
        const lz = -15.0 + (b + 0.5) * bayE22;
        const wLitW = hash(f, b, 5, 47) < 0.28;
        box(wLitW ? litGlass : bronzeGlass, [-37.2, visionY, lz], [0.14, glassH, bayE22 - 0.04]);
      }

      // Balconies along West Wing
      for (let bx = -34; bx <= -10; bx += 7.5) {
        box(champagneSpandrels, [bx, visionY - glassH * 0.25, 7.6], [3.2, 0.9, 0.6]);
      }
    }

    // Vertical bronze mullions on both wings
    const midY = startY + (shaftH - 4.0) * 0.5;
    for (let x = -3.0; x <= 35.0; x += 3.2) {
      box(bronzeMullions, [x, midY, 20.3], [0.08, shaftH - 4.0, 0.2]);
      box(bronzeMullions, [x, midY, -2.3], [0.08, shaftH - 4.0, 0.2]);
    }
    for (let x = -36.0; x <= -6.0; x += 3.2) {
      box(bronzeMullions, [x, midY, 7.3], [0.08, shaftH - 4.0, 0.2]);
      box(bronzeMullions, [x, midY, -15.3], [0.08, shaftH - 4.0, 0.2]);
    }
  }

  // --- 4. Stepped Crown & Mechanical Penthouse (152m to 164m) -------------------------------------------------
  {
    const crownBaseY = shaftTop;

    // East Wing stepped crown
    box(crownParts, [16.0, crownBaseY + crownH * 0.5, 9.0], [36.0, crownH, 18.0]);
    // West Wing stepped crown
    box(crownParts, [-21.0, crownBaseY + crownH * 0.45, -4.0], [28.0, crownH * 0.9, 18.0]);

    // Acoustic louvres on mechanical penthouse
    for (let y = crownBaseY + 1.2; y <= crownBaseY + crownH - 1.2; y += 0.9) {
      box(bronzeMullions, [16.0, y, 18.1], [35.6, 0.22, 0.12]);
      box(bronzeMullions, [16.0, y, -0.1], [35.6, 0.22, 0.12]);
      box(bronzeMullions, [34.1, y, 9.0], [0.12, 0.22, 17.6]);

      box(bronzeMullions, [-21.0, y, 5.1], [27.6, 0.22, 0.12]);
      box(bronzeMullions, [-21.0, y, -13.1], [27.6, 0.22, 0.12]);
      box(bronzeMullions, [-35.1, y, -4.0], [0.12, 0.22, 17.6]);
    }

    // Parapet copings
    box(champagneSpandrels, [16.0, totalH - 0.3, 9.0], [36.4, 0.6, 18.4]);
    box(champagneSpandrels, [-21.0, totalH - 1.5, -4.0], [28.4, 0.6, 18.4]);

    // Aviation obstruction warning beacons
    const beaconPoints = [
      [33.5, totalH, 17.5],
      [33.5, totalH, 0.5],
      [-1.5, totalH, 17.5],
      [-34.5, totalH - 1.2, 4.5],
      [-34.5, totalH - 1.2, -12.5],
    ];
    for (const [bx, by, bz] of beaconPoints) {
      cylinder(bronzeMullions, [bx, by + 0.4, bz], 0.08, 0.8, 6);
      box(beaconParts, [bx, by + 0.85, bz], [0.22, 0.22, 0.22]);
    }
  }

  // --- Materials Definition -----------------------------------------------------------------------------------
  // 1) Bronze-Tinted Reflective Residential Curtain Wall Glass
  const bronzeGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x554438,
    roughness: 0.18,
    metalness: 0.6,
  });

  // 2) Lit Residential Window Suites
  const litGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x6e5644,
    roughness: 0.25,
    metalness: 0.4,
  });
  litGlassMat.emissiveNode = color(0xffe0a0).mul(nightAmount().mul(0.85).add(0.15));

  // 3) Anodized Champagne Bronze Spandrel Panels
  const champagneSpandrelMat = new THREE.MeshStandardMaterial({
    color: 0x766552,
    roughness: 0.38,
    metalness: 0.52,
  });

  // 4) Vertical Bronze Mullions & Louvres
  const bronzeMullionMat = new THREE.MeshStandardMaterial({
    color: 0x8c7964,
    roughness: 0.3,
    metalness: 0.8,
  });

  // 5) Polished Warm-Grey Granite (Podium)
  const graniteMat = new THREE.MeshStandardMaterial({
    color: 0x242629,
    roughness: 0.54,
    metalness: 0.2,
  });

  // 6) Storefront Glass
  const podiumGlassMat = new THREE.MeshStandardMaterial({
    color: 0x22353e,
    roughness: 0.12,
    metalness: 0.35,
  });

  // 7) Leisure Deck Pavers
  const leisureDeckMat = new THREE.MeshStandardMaterial({
    color: 0x5a554c,
    roughness: 0.75,
    metalness: 0.1,
  });

  // 8) Outdoor Swimming Pool Water
  const poolWaterMat = new THREE.MeshStandardMaterial({
    color: 0x1a88aa,
    roughness: 0.08,
    metalness: 0.85,
  });

  // 9) Penthouse Crown Casing
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0x383028,
    roughness: 0.58,
    metalness: 0.55,
  });

  // 10) Pedestrian Skybridges
  const skybridgeMat = new THREE.MeshStandardMaterial({
    color: 0x282a2c,
    roughness: 0.35,
    metalness: 0.5,
  });

  // 11) Aviation Warning Beacons
  const beaconMat = new THREE.MeshStandardNodeMaterial({
    color: 0xcc1122,
    roughness: 0.25,
    metalness: 0.5,
  });
  beaconMat.emissiveNode = color(0xee2233).mul(nightAmount().mul(0.9).add(0.3));

  // Assemble meshes into root group
  merged(root, bronzeGlass, bronzeGlassMat, 'Convention Plaza Apartments bronze curtain wall');
  merged(root, litGlass, litGlassMat, 'Convention Plaza Apartments lit residential glazing');
  merged(root, champagneSpandrels, champagneSpandrelMat, 'Convention Plaza Apartments champagne spandrels');
  merged(root, bronzeMullions, bronzeMullionMat, 'Convention Plaza Apartments bronze mullions');
  merged(root, podiumGranite, graniteMat, 'Convention Plaza Apartments granite podium');
  merged(root, podiumGlass, podiumGlassMat, 'Convention Plaza Apartments storefront glazing');
  merged(root, leisureDeck, leisureDeckMat, 'Convention Plaza Apartments podium leisure deck');
  merged(root, poolWater, poolWaterMat, 'Convention Plaza Apartments swimming pool');
  merged(root, crownParts, crownMat, 'Convention Plaza Apartments mechanical penthouse crown');
  merged(root, skybridgeParts, skybridgeMat, 'Convention Plaza Apartments pedestrian skybridges');
  merged(root, beaconParts, beaconMat, 'Convention Plaza Apartments aviation beacons');

  // --- Colliders ---------------------------------------------------------------------------------------------
  const colliders = [
    // East tower wing
    { name: 'Convention Plaza Apartments East Wing', ...harbourCityLocalCollider(S, 16.0, 9.0, 40.0, 22.0, groundOffset + podiumH, groundOffset + totalH) },
    // West tower wing
    { name: 'Convention Plaza Apartments West Wing', ...harbourCityLocalCollider(S, -21.0, -4.0, 32.0, 22.0, groundOffset + podiumH, groundOffset + totalH - 1.2) },
    // Podium volume
    { name: 'Convention Plaza Apartments Podium', ...harbourCityLocalCollider(S, 0, 0, w - 2.0, d - 2.0, groundOffset, groundOffset + podiumH) },
    // Skybridge to Harbour Road
    { name: 'Convention Plaza Apartments South Skybridge', ...harbourCityLocalCollider(S, 0, -d * 0.5 - 6.0, 4.5, 12.0, groundOffset + 6.0, groundOffset + 10.5) },
  ];

  const landmark = {
    id: 'convention-plaza-apartments',
    name: '會景閣 Convention Plaza Apartments',
    englishName: 'Convention Plaza Apartments',
    position: { x: S.x, y: groundOffset, z: S.z },
    radius: Math.max(w, d) * 0.65,
    height: totalH,
  };

  return {
    group: root,
    colliders,
    landmarks: [landmark],
    stats: {
      conventionPlazaApartmentsHeight: totalH,
      conventionPlazaApartmentsStoreys: S.storeys,
      conventionPlazaApartmentsPanes: bronzeGlass.length + litGlass.length,
      conventionPlazaApartmentsSpandrels: champagneSpandrels.length,
      conventionPlazaApartmentsMullions: bronzeMullions.length,
    },
    groundOffset,
  };
}
