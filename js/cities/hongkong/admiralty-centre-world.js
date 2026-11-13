// 海富中心 Admiralty Centre (Tower 1 & Tower 2), 18 Harcourt Road, Admiralty (金鐘夏慤道18號, 1980).
//
// The twin-tower commercial complex developed by Cheung Kong and MTR Corporation comprises:
// - Tower 1 (West High Block): 126 metres, 32 storeys
// - Tower 2 (East Low Block): 104 metres, 28 storeys
// Features chamfered octagonal geometry, amber-bronze reflective curtain wall, 3-storey Hoi Fu
// Shopping Centre podium integrated with MTR Admiralty Station entrances and skybridges.
//
// OSM Ways: 107336262 (Tower 1, 126m) and 107336259 (Tower 2, 104m).
import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  ADMIRALTY_CENTRE_SITE as S
} from './admiralty-centre-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';

export function buildAdmiraltyCentre(scene, options = {}) {
  const t1Ground = options.groundOffsetT1 ?? hongKongTerrainHeight(S.t1.x, S.t1.z);
  const t2Ground = options.groundOffsetT2 ?? hongKongTerrainHeight(S.t2.x, S.t2.z);

  const root = new THREE.Group();
  root.name = 'Admiralty Centre — 海富中心';
  scene.add(root);

  // Collections for merged geometries
  const amberGlass = [];
  const litGlass = [];
  const bronzeSpandrels = [];
  const bronzeMullions = [];
  const granitePodium = [];
  const podiumGlass = [];
  const crownParts = [];
  const skybridgeParts = [];
  const beaconParts = [];

  // Helper to build an octagonal chamfered tower
  function buildTower(site, groundY, towerId, floorsCount) {
    const w = site.w;
    const d = site.d;
    const podiumH = site.podiumHeight;
    const totalH = site.height;
    const crownH = site.crownHeight;
    const shaftTop = totalH - crownH;
    const shaftH = shaftTop - podiumH;
    const floorH = shaftH / floorsCount;
    const glassH = floorH * 0.58;
    const spandrelH = floorH - glassH;

    const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
    const toWorld = (lx, ly, lz) => [
      site.x + cs * lx + sn * lz,
      groundY + ly,
      site.z - sn * lx + cs * lz
    ];

    // Podium Block
    box(granitePodium, toWorld(0, podiumH * 0.5, 0), [w - 1.5, podiumH, d - 1.5], { rx: 0, ry: site.ry, rz: 0 });

    // Storefront glazing on podium
    for (let f = 0; f < 2; f++) {
      const fy = 1.5 + f * 5.0;
      box(podiumGlass, toWorld(0, fy + 2.0, -d * 0.5 + 0.6), [w - 4.0, 3.8, 0.1], { rx: 0, ry: site.ry, rz: 0 });
      box(podiumGlass, toWorld(0, fy + 2.0, d * 0.5 - 0.6), [w - 4.0, 3.8, 0.1], { rx: 0, ry: site.ry, rz: 0 });
    }

    // Concrete core
    box(granitePodium, toWorld(0, podiumH + shaftH * 0.5, 0), [w - 5.0, shaftH, d - 5.0], { rx: 0, ry: site.ry, rz: 0 });

    // Tower Office Shaft
    for (let f = 0; f < floorsCount; f++) {
      const baseY = podiumH + f * floorH;
      const spandrelY = baseY + spandrelH * 0.5;
      const visionY = baseY + spandrelH + glassH * 0.5;

      // Bronze Spandrels
      box(bronzeSpandrels, toWorld(0, spandrelY, -d * 0.5 + 1.8), [w - 3.0, spandrelH, 0.2], { rx: 0, ry: site.ry, rz: 0 });
      box(bronzeSpandrels, toWorld(0, spandrelY, d * 0.5 - 1.8), [w - 3.0, spandrelH, 0.2], { rx: 0, ry: site.ry, rz: 0 });
      box(bronzeSpandrels, toWorld(-w * 0.5 + 1.8, spandrelY, 0), [0.2, spandrelH, d - 3.0], { rx: 0, ry: site.ry, rz: 0 });
      box(bronzeSpandrels, toWorld(w * 0.5 - 1.8, spandrelY, 0), [0.2, spandrelH, d - 3.0], { rx: 0, ry: site.ry, rz: 0 });

      // Amber-bronze Vision Glass
      const isLit0 = hash(f, 0, towerId) > 0.65;
      const isLit1 = hash(f, 1, towerId) > 0.65;
      const isLit2 = hash(f, 2, towerId) > 0.65;
      const isLit3 = hash(f, 3, towerId) > 0.65;

      box(isLit0 ? litGlass : amberGlass, toWorld(0, visionY, -d * 0.5 + 1.8), [w - 3.2, glassH, 0.14], { rx: 0, ry: site.ry, rz: 0 });
      box(isLit1 ? litGlass : amberGlass, toWorld(0, visionY, d * 0.5 - 1.8), [w - 3.2, glassH, 0.14], { rx: 0, ry: site.ry, rz: 0 });
      box(isLit2 ? litGlass : amberGlass, toWorld(-w * 0.5 + 1.8, visionY, 0), [0.14, glassH, d - 3.2], { rx: 0, ry: site.ry, rz: 0 });
      box(isLit3 ? litGlass : amberGlass, toWorld(w * 0.5 - 1.8, visionY, 0), [0.14, glassH, d - 3.2], { rx: 0, ry: site.ry, rz: 0 });
    }

    // Chamfered corner columns
    const midShaftY = podiumH + shaftH * 0.5;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        cylinder(bronzeSpandrels, toWorld(sx * (w * 0.5 - 1.8), midShaftY, sz * (d * 0.5 - 1.8)), 1.5, shaftH, 12);
      }
    }

    // Vertical bronze mullions
    for (let x = -w * 0.5 + 3.2; x <= w * 0.5 - 3.2; x += 2.6) {
      box(bronzeMullions, toWorld(x, midShaftY, -d * 0.5 + 1.65), [0.08, shaftH, 0.22], { rx: 0, ry: site.ry, rz: 0 });
      box(bronzeMullions, toWorld(x, midShaftY, d * 0.5 - 1.65), [0.08, shaftH, 0.22], { rx: 0, ry: site.ry, rz: 0 });
    }
    for (let z = -d * 0.5 + 3.2; z <= d * 0.5 - 3.2; z += 2.6) {
      box(bronzeMullions, toWorld(-w * 0.5 + 1.65, midShaftY, z), [0.22, shaftH, 0.08], { rx: 0, ry: site.ry, rz: 0 });
      box(bronzeMullions, toWorld(w * 0.5 - 1.65, midShaftY, z), [0.22, shaftH, 0.08], { rx: 0, ry: site.ry, rz: 0 });
    }

    // Stepped Crown & Mechanical Louvres
    const crownBaseY = shaftTop;
    const cw = w - 6.0;
    const cd = d - 6.0;
    box(crownParts, toWorld(0, crownBaseY + crownH * 0.5, 0), [cw, crownH, cd], { rx: 0, ry: site.ry, rz: 0 });

    for (let y = crownBaseY + 1.2; y <= crownBaseY + crownH - 1.2; y += 0.8) {
      box(bronzeMullions, toWorld(0, y, -cd * 0.5 - 0.1), [cw - 0.4, 0.22, 0.15], { rx: 0, ry: site.ry, rz: 0 });
      box(bronzeMullions, toWorld(0, y, cd * 0.5 + 0.1), [cw - 0.4, 0.22, 0.15], { rx: 0, ry: site.ry, rz: 0 });
      box(bronzeMullions, toWorld(-cw * 0.5 - 0.1, y, 0), [0.15, 0.22, cd - 0.4], { rx: 0, ry: site.ry, rz: 0 });
      box(bronzeMullions, toWorld(cw * 0.5 + 0.1, y, 0), [0.15, 0.22, cd - 0.4], { rx: 0, ry: site.ry, rz: 0 });
    }

    // Aviation beacons
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        cylinder(bronzeMullions, toWorld(sx * (cw * 0.5 - 0.3), totalH + 0.4, sz * (cd * 0.5 - 0.3)), 0.08, 0.8, 6);
        box(beaconParts, toWorld(sx * (cw * 0.5 - 0.3), totalH + 0.85, sz * (cd * 0.5 - 0.3)), [0.22, 0.22, 0.22]);
      }
    }
  }

  // Build Tower 1 (West High Block: 126m, 26 office floors)
  buildTower(S.t1, t1Ground, 1, 26);

  // Build Tower 2 (East Low Block: 104m, 21 office floors)
  buildTower(S.t2, t2Ground, 2, 21);

  // Connecting Podium Galleria between Tower 1 and Tower 2 (Level 1-3)
  {
    const midX = (S.t1.x + S.t2.x) * 0.5;
    const midZ = (S.t1.z + S.t2.z) * 0.5;
    const midY = (t1Ground + t2Ground) * 0.5;
    box(granitePodium, [midX, midY + 6.0, midZ], [32.0, 12.0, 22.0], { rx: 0, ry: S.t1.ry, rz: 0 });
    box(podiumGlass, [midX, midY + 6.0, midZ - 11.1], [28.0, 8.0, 0.1], { rx: 0, ry: S.t1.ry, rz: 0 });
    box(podiumGlass, [midX, midY + 6.0, midZ + 11.1], [28.0, 8.0, 0.1], { rx: 0, ry: S.t1.ry, rz: 0 });

    // Skybridge North across Harcourt Road towards Tamar Central Government Complex (y ~ 7.5m)
    box(skybridgeParts, [S.t1.x + 8.0, t1Ground + 7.5, S.t1.z - 26.0], [4.5, 4.2, 16.0]);
    box(podiumGlass, [S.t1.x + 10.3, t1Ground + 7.8, S.t1.z - 26.0], [0.1, 2.2, 15.6]);
    box(podiumGlass, [S.t1.x + 5.7, t1Ground + 7.8, S.t1.z - 26.0], [0.1, 2.2, 15.6]);

    // Skybridge West towards Far East Finance Centre (y ~ 7.5m)
    box(skybridgeParts, [S.t1.x - 26.0, t1Ground + 7.5, S.t1.z - 4.0], [14.0, 4.2, 4.5]);
    box(podiumGlass, [S.t1.x - 26.0, t1Ground + 7.8, S.t1.z - 1.7], [13.6, 2.2, 0.1]);
    box(podiumGlass, [S.t1.x - 26.0, t1Ground + 7.8, S.t1.z - 6.3], [13.6, 2.2, 0.1]);

    // Skybridge East towards United Centre (y ~ 7.5m)
    box(skybridgeParts, [S.t2.x + 18.0, t2Ground + 7.5, S.t2.z + 8.0], [12.0, 4.2, 4.5]);
    box(podiumGlass, [S.t2.x + 18.0, t2Ground + 7.8, S.t2.z + 10.3], [11.6, 2.2, 0.1]);
    box(podiumGlass, [S.t2.x + 18.0, t2Ground + 7.8, S.t2.z + 5.7], [11.6, 2.2, 0.1]);
  }

  // --- Materials Definition -----------------------------------------------------------------------------------
  // 1) Amber-Bronze Reflective Curtain Wall Glass
  const amberGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x463528,
    roughness: 0.15,
    metalness: 0.65,
  });

  // 2) Lit Office Glass
  const litGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x6a5440,
    roughness: 0.2,
    metalness: 0.45,
  });
  litGlassMat.emissiveNode = color(0xffe0a2).mul(nightAmount().mul(0.85).add(0.15));

  // 3) Bronze Anodized Spandrels
  const bronzeSpandrelMat = new THREE.MeshStandardMaterial({
    color: 0x584434,
    roughness: 0.35,
    metalness: 0.55,
  });

  // 4) Vertical Bronze Mullion Fins
  const bronzeMullionMat = new THREE.MeshStandardMaterial({
    color: 0x725a46,
    roughness: 0.28,
    metalness: 0.82,
  });

  // 5) Polished Granite Podium
  const graniteMat = new THREE.MeshStandardMaterial({
    color: 0x222426,
    roughness: 0.52,
    metalness: 0.2,
  });

  // 6) Storefront Glass
  const podiumGlassMat = new THREE.MeshStandardMaterial({
    color: 0x25353c,
    roughness: 0.12,
    metalness: 0.35,
  });

  // 7) Penthouse Crown Casing
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0x322822,
    roughness: 0.58,
    metalness: 0.55,
  });

  // 8) Skybridge Enclosures
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
  merged(root, amberGlass, amberGlassMat, 'Admiralty Centre amber-bronze reflective curtain wall');
  merged(root, litGlass, litGlassMat, 'Admiralty Centre lit office glazing');
  merged(root, bronzeSpandrels, bronzeSpandrelMat, 'Admiralty Centre bronze spandrels');
  merged(root, bronzeMullions, bronzeMullionMat, 'Admiralty Centre bronze mullions');
  merged(root, granitePodium, graniteMat, 'Admiralty Centre granite podium');
  merged(root, podiumGlass, podiumGlassMat, 'Admiralty Centre storefront glazing');
  merged(root, crownParts, crownMat, 'Admiralty Centre mechanical penthouse crowns');
  merged(root, skybridgeParts, skybridgeMat, 'Admiralty Centre pedestrian skybridges');
  merged(root, beaconParts, beaconMat, 'Admiralty Centre aviation beacons');

  // --- Colliders ---------------------------------------------------------------------------------------------
  const colliders = [
    // Tower 1 Shaft
    { name: 'Admiralty Centre Tower 1 Shaft', ...harbourCityLocalCollider(S.t1, 0, 0, S.t1.w - 3.0, S.t1.d - 3.0, t1Ground + S.t1.podiumHeight, t1Ground + S.t1.height) },
    // Tower 1 Podium
    { name: 'Admiralty Centre Tower 1 Podium', ...harbourCityLocalCollider(S.t1, 0, 0, S.t1.w - 1.0, S.t1.d - 1.0, t1Ground, t1Ground + S.t1.podiumHeight) },
    // Tower 2 Shaft
    { name: 'Admiralty Centre Tower 2 Shaft', ...harbourCityLocalCollider(S.t2, 0, 0, S.t2.w - 3.0, S.t2.d - 3.0, t2Ground + S.t2.podiumHeight, t2Ground + S.t2.height) },
    // Tower 2 Podium
    { name: 'Admiralty Centre Tower 2 Podium', ...harbourCityLocalCollider(S.t2, 0, 0, S.t2.w - 1.0, S.t2.d - 1.0, t2Ground, t2Ground + S.t2.podiumHeight) },
  ];

  const landmark = {
    id: 'admiralty-centre',
    name: '海富中心 Admiralty Centre',
    englishName: 'Admiralty Centre',
    position: { x: S.x, y: (t1Ground + t2Ground) * 0.5, z: S.z },
    radius: 65.0,
    height: S.height,
  };

  return {
    group: root,
    colliders,
    landmarks: [landmark],
    stats: {
      admiraltyCentreHeightT1: S.t1.height,
      admiraltyCentreHeightT2: S.t2.height,
      admiraltyCentrePanes: amberGlass.length + litGlass.length,
      admiraltyCentreSpandrels: bronzeSpandrels.length,
      admiraltyCentreMullions: bronzeMullions.length,
    },
    t1Ground,
    t2Ground,
  };
}
