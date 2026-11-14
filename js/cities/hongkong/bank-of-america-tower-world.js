// Bank of America Tower 美國銀行中心, 12 Harcourt Road, Admiralty (1977).
//
// 146-metre, 38-storey Grade-A office tower with a bronze-tinted reflective
// curtain wall, dark bronze spandrels, vertical mullions, a 4-storey commercial
// podium and a rooftop mechanical crown carrying the illuminated corporate logo.
//
// OSM Way: 107328020 (relation 17045256, 146m, 38 levels).
import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  BANK_OF_AMERICA_TOWER_SITE as S,
  bankOfAmericaTowerLocalToWorld
} from './bank-of-america-tower-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';

export function buildBankOfAmericaTower(scene, options = {}) {
  const groundY = options.groundOffset ?? hongKongTerrainHeight(S.x, S.z);

  const root = new THREE.Group();
  root.name = 'Bank of America Tower — 美國銀行中心';
  scene.add(root);

  const bronzeGlass = [];
  const litGlass = [];
  const bronzeSpandrels = [];
  const bronzeMullions = [];
  const podiumStone = [];
  const podiumGlass = [];
  const crownParts = [];
  const logoParts = [];

  const w = S.w;
  const d = S.d;
  const podiumH = 16.0;
  const totalH = S.height;
  const crownH = 12.0;
  const shaftH = totalH - podiumH - crownH;
  const shaftTop = podiumH + shaftH;

  const cs = Math.cos(S.ry), sn = Math.sin(S.ry);
  const toWorld = (lx, ly, lz) => [
    S.x + cs * lx + sn * lz,
    groundY + ly,
    S.z - sn * lx + cs * lz
  ];

  // --- 1. Podium Block & Entrance ---------------------------------------------------------
  box(podiumStone, toWorld(0, podiumH * 0.5, 0), [w, podiumH, d], S.ry);

  // Ground-floor banking hall glazing
  for (let f = 0; f < 2; f++) {
    const fy = 2.0 + f * 6.0;
    box(podiumGlass, toWorld(0, fy + 2.8, -d * 0.5 + 0.5), [w - 3.0, 5.5, 0.14], S.ry);
  }
  box(podiumGlass, toWorld(w * 0.5 - 0.5, 9.0, 0), [0.14, 10.0, d - 6.0], S.ry);
  box(podiumGlass, toWorld(-w * 0.5 + 0.5, 9.0, 0), [0.14, 10.0, d - 6.0], S.ry);
  box(podiumGlass, toWorld(0, 9.0, d * 0.5 - 0.5), [w - 7.0, 10.0, 0.14], S.ry);

  // Bronze entrance canopy
  box(bronzeSpandrels, toWorld(0, 7.8, -d * 0.5 - 2.0), [w - 2.0, 0.3, 4.0], S.ry);
  for (const cx of [-w * 0.25, 0, w * 0.25]) {
    cylinder(bronzeMullions, toWorld(cx, 6.2, -d * 0.5 - 2.0), 0.2, 5.6, 10);
  }

  // Internal structural core
  box(podiumStone, toWorld(0, podiumH + shaftH * 0.5, 0), [w - 6.0, shaftH, d - 6.0], S.ry);

  // --- 2. Main Office Tower Shaft ----------------------------------------------------------
  const floorsCount = 34;
  const floorH = shaftH / floorsCount;
  const spandrelH = 1.05;
  const glassH = floorH - spandrelH;

  const seed = 127; // Bank of America Tower unique night-light seed

  for (let f = 0; f < floorsCount; f++) {
    const baseY = podiumH + f * floorH;
    const spandrelY = baseY + spandrelH * 0.5;
    const visionY = baseY + spandrelH + glassH * 0.5;

    box(bronzeSpandrels, toWorld(0, spandrelY, -d * 0.5 + 1.0), [w - 2.0, spandrelH, 0.20], S.ry);
    box(bronzeSpandrels, toWorld(0, spandrelY, d * 0.5 - 1.0), [w - 2.0, spandrelH, 0.20], S.ry);
    box(bronzeSpandrels, toWorld(-w * 0.5 + 1.0, spandrelY, 0), [0.20, spandrelH, d - 2.0], S.ry);
    box(bronzeSpandrels, toWorld(w * 0.5 - 1.0, spandrelY, 0), [0.20, spandrelH, d - 2.0], S.ry);

    box(bronzeMullions, toWorld(0, spandrelY + spandrelH * 0.45, -d * 0.5 + 0.8), [w - 1.6, 0.07, 0.40], S.ry);
    box(bronzeMullions, toWorld(0, spandrelY + spandrelH * 0.45, d * 0.5 - 0.8), [w - 1.6, 0.07, 0.40], S.ry);

    const spanX = w - 2.4;
    const numBaysX = Math.max(1, Math.round(spanX / 2.4));
    const actualBayX = spanX / numBaysX;
    for (let bx = 0; bx < numBaysX; bx++) {
      const lx = -spanX * 0.5 + (bx + 0.5) * actualBayX;
      const isLitN = hash(f, bx, 1, seed) < 0.28;
      const isLitS = hash(f, bx, 2, seed) < 0.28;
      box(isLitN ? litGlass : bronzeGlass, toWorld(lx, visionY, -d * 0.5 + 1.0), [actualBayX - 0.04, glassH, 0.14], S.ry);
      box(isLitS ? litGlass : bronzeGlass, toWorld(lx, visionY, d * 0.5 - 1.0), [actualBayX - 0.04, glassH, 0.14], S.ry);
    }

    const spanZ = d - 2.4;
    const numBaysZ = Math.max(1, Math.round(spanZ / 2.4));
    const actualBayZ = spanZ / numBaysZ;
    for (let bz = 0; bz < numBaysZ; bz++) {
      const lz = -spanZ * 0.5 + (bz + 0.5) * actualBayZ;
      const isLitW = hash(f, bz, 3, seed) < 0.28;
      const isLitE = hash(f, bz, 4, seed) < 0.28;
      box(isLitW ? litGlass : bronzeGlass, toWorld(-w * 0.5 + 1.0, visionY, lz), [0.14, glassH, actualBayZ - 0.04], S.ry);
      box(isLitE ? litGlass : bronzeGlass, toWorld(w * 0.5 - 1.0, visionY, lz), [0.14, glassH, actualBayZ - 0.04], S.ry);
    }
  }

  const midShaftY = podiumH + shaftH * 0.5;
  for (let x = -w * 0.5 + 2.4; x <= w * 0.5 - 2.4; x += 2.4) {
    box(bronzeMullions, toWorld(x, midShaftY, -d * 0.5 + 1.0), [0.07, shaftH, 0.22], S.ry);
    box(bronzeMullions, toWorld(x, midShaftY, d * 0.5 - 1.0), [0.07, shaftH, 0.22], S.ry);
  }
  for (let z = -d * 0.5 + 2.4; z <= d * 0.5 - 2.4; z += 2.4) {
    box(bronzeMullions, toWorld(-w * 0.5 + 1.0, midShaftY, z), [0.22, shaftH, 0.07], S.ry);
    box(bronzeMullions, toWorld(w * 0.5 - 1.0, midShaftY, z), [0.22, shaftH, 0.07], S.ry);
  }

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cylinder(bronzeSpandrels, toWorld(sx * (w * 0.5 - 1.0), midShaftY, sz * (d * 0.5 - 1.0)), 1.2, shaftH, 12);
    }
  }

  // --- 3. Mechanical Crown (134m to 146m) --------------------------------------------------
  const crownBaseY = shaftTop;
  const cw = w - 4.0;
  const cd = d - 4.0;

  box(bronzeSpandrels, toWorld(0, crownBaseY + 3.0, 0), [cw, 5.5, cd], S.ry);
  box(bronzeSpandrels, toWorld(0, crownBaseY + 7.5, 0), [cw - 5.0, 2.5, cd - 4.0], S.ry);

  box(crownParts, toWorld(0, crownBaseY + 5.6, 0), [cw + 0.6, 0.3, cd + 0.6], S.ry);
  box(crownParts, toWorld(0, crownBaseY + 9.1, 0), [cw - 4.2, 0.3, cd - 3.2], S.ry);
  box(crownParts, toWorld(0, crownBaseY + 10.0, 0), [cw - 8.0, 1.0, 0.5], S.ry);

  // Illuminated corporate logo on the crown facing the harbour
  box(logoParts, toWorld(0, crownBaseY + 10.4, d * 0.5 - 0.4), [cw - 12.0, 1.6, 0.25], S.ry);

  // --- 4. Materials Palette ---------------------------------------------------------------
  const bronzeGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x3d2b1f, // Bronze-tinted reflective curtain wall
    roughness: 0.12,
    metalness: 0.88,
    side: THREE.DoubleSide
  });

  const litGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x4a3c30,
    roughness: 0.22,
    metalness: 0.35,
    side: THREE.DoubleSide
  });
  litGlassMat.emissiveNode = color(0xffe8ba).mul(nightAmount().mul(0.85).add(0.15));

  const bronzeSpandrelMat = new THREE.MeshStandardMaterial({
    color: 0x8b6b4f,
    roughness: 0.28,
    metalness: 0.72
  });

  const bronzeMullionMat = new THREE.MeshStandardMaterial({
    color: 0xa68a74,
    roughness: 0.22,
    metalness: 0.82
  });

  const podiumStoneMat = new THREE.MeshStandardMaterial({
    color: 0xd6cebe,
    roughness: 0.82,
    metalness: 0.05
  });

  const podiumGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x2a3a42,
    roughness: 0.15,
    metalness: 0.45,
    side: THREE.DoubleSide
  });
  podiumGlassMat.emissiveNode = color(0xffefd0).mul(nightAmount().mul(0.55).add(0.1));

  const crownMat = new THREE.MeshStandardMaterial({
    color: 0x9a8a7a,
    roughness: 0.3,
    metalness: 0.75
  });

  const logoMat = new THREE.MeshStandardNodeMaterial({
    color: 0xbfa055,
    roughness: 0.18,
    metalness: 0.6
  });
  logoMat.emissiveNode = color(0xd4b466).mul(nightAmount().mul(1.4).add(0.2));

  // --- 5. Merge Meshes --------------------------------------------------------------------
  merged(root, podiumStone, podiumStoneMat, 'Bank of America Tower stone podium and core');
  merged(root, podiumGlass, podiumGlassMat, 'Bank of America Tower banking hall storefront glazing');
  merged(root, bronzeSpandrels, bronzeSpandrelMat, 'Bank of America Tower bronze spandrel ribbons');
  merged(root, bronzeMullions, bronzeMullionMat, 'Bank of America Tower vertical mullions and sunshade louvres');
  merged(root, bronzeGlass, bronzeGlassMat, 'Bank of America Tower bronze-tinted reflective curtain wall');
  merged(root, litGlass, litGlassMat, 'Bank of America Tower illuminated office glazing');
  merged(root, crownParts, crownMat, 'Bank of America Tower mechanical parapet crown');
  merged(root, logoParts, logoMat, 'Bank of America Tower illuminated rooftop corporate logo', false);

  // --- 6. Colliders -----------------------------------------------------------------------
  const colliders = [];

  // --- 7. Landmark Metadata ---------------------------------------------------------------
  const landmark = {
    id: 'bankOfAmericaTower',
    name: '美國銀行中心',
    englishName: 'Bank of America Tower',
    x: S.x,
    z: S.z,
    w: S.w,
    d: S.d,
    h: S.height,
    ring: S.ring,
    bounds: S.bounds,
    osmId: S.osmId,
    kind: 'landmark',
    labelHeight: S.height + 4.0
  };

  return {
    group: root,
    colliders,
    landmarks: [landmark],
    base: groundY,
    stats: {
      bankOfAmericaTowerOsm: S.osmId,
      bankOfAmericaTowerHeight: S.height,
      bankOfAmericaTowerLevels: S.levels,
      bankOfAmericaTowerPanes: bronzeGlass.length + litGlass.length
    }
  };
}
