// CCB Tower 中國建設銀行大廈, 3 Connaught Road Central, Central (2012).
//
// 135-metre, 31-storey Grade-A office tower developed by China Construction Bank &
// Lai Sun Development. Dark blue-grey Low-E reflective curtain wall with crisp
// silver-anodized vertical mullions, a 3-storey grand banking hall podium, and an
// angled geometric crown carrying illuminated CCB corporate signage and aviation beacons.
//
// OSM Way: 242113651 (135m, 31 levels).
import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  CCB_TOWER_SITE as S,
  ccbTowerLocalToWorld
} from './ccb-tower-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';

export function buildCcbTower(scene, options = {}) {
  const groundY = options.groundOffset ?? hongKongTerrainHeight(S.x, S.z);

  const root = new THREE.Group();
  root.name = 'CCB Tower — 中國建設銀行大廈';
  scene.add(root);

  const darkGlass = [];
  const litGlass = [];
  const silverSpandrels = [];
  const silverMullions = [];
  const podiumStone = [];
  const podiumGlass = [];
  const crownParts = [];
  const beaconParts = [];

  const w = S.w;
  const d = S.d;
  const podiumH = 14.0;
  const totalH = S.height;
  const crownH = 13.0;
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

  // Grand banking hall glazing (double-height)
  for (let f = 0; f < 2; f++) {
    const fy = 2.0 + f * 6.0;
    box(podiumGlass, toWorld(0, fy + 2.8, -d * 0.5 + 0.5), [w - 3.0, 5.5, 0.14], S.ry);
  }
  box(podiumGlass, toWorld(w * 0.5 - 0.5, 9.0, 0), [0.14, 10.0, d - 6.0], S.ry);
  box(podiumGlass, toWorld(-w * 0.5 + 0.5, 9.0, 0), [0.14, 10.0, d - 6.0], S.ry);
  box(podiumGlass, toWorld(0, 9.0, d * 0.5 - 0.5), [w - 7.0, 10.0, 0.14], S.ry);

  // Silver entrance canopy
  box(silverSpandrels, toWorld(0, 7.8, -d * 0.5 - 2.0), [w - 2.0, 0.3, 4.0], S.ry);
  for (const cx of [-w * 0.25, 0, w * 0.25]) {
    cylinder(silverMullions, toWorld(cx, 6.2, -d * 0.5 - 2.0), 0.2, 5.6, 10);
  }

  // Internal structural core
  box(podiumStone, toWorld(0, podiumH + shaftH * 0.5, 0), [w - 6.0, shaftH, d - 6.0], S.ry);

  // --- 2. Main Office Tower Shaft ----------------------------------------------------------
  const floorsCount = 27;
  const floorH = shaftH / floorsCount;
  const spandrelH = 1.05;
  const glassH = floorH - spandrelH;

  const seed = 128; // CCB Tower unique night-light seed

  for (let f = 0; f < floorsCount; f++) {
    const baseY = podiumH + f * floorH;
    const spandrelY = baseY + spandrelH * 0.5;
    const visionY = baseY + spandrelH + glassH * 0.5;

    box(silverSpandrels, toWorld(0, spandrelY, -d * 0.5 + 1.0), [w - 2.0, spandrelH, 0.20], S.ry);
    box(silverSpandrels, toWorld(0, spandrelY, d * 0.5 - 1.0), [w - 2.0, spandrelH, 0.20], S.ry);
    box(silverSpandrels, toWorld(-w * 0.5 + 1.0, spandrelY, 0), [0.20, spandrelH, d - 2.0], S.ry);
    box(silverSpandrels, toWorld(w * 0.5 - 1.0, spandrelY, 0), [0.20, spandrelH, d - 2.0], S.ry);

    box(silverMullions, toWorld(0, spandrelY + spandrelH * 0.45, -d * 0.5 + 0.8), [w - 1.6, 0.07, 0.40], S.ry);
    box(silverMullions, toWorld(0, spandrelY + spandrelH * 0.45, d * 0.5 - 0.8), [w - 1.6, 0.07, 0.40], S.ry);

    const spanX = w - 2.4;
    const numBaysX = Math.max(1, Math.round(spanX / 2.4));
    const actualBayX = spanX / numBaysX;
    for (let bx = 0; bx < numBaysX; bx++) {
      const lx = -spanX * 0.5 + (bx + 0.5) * actualBayX;
      const isLitN = hash(f, bx, 1, seed) < 0.28;
      const isLitS = hash(f, bx, 2, seed) < 0.28;
      box(isLitN ? litGlass : darkGlass, toWorld(lx, visionY, -d * 0.5 + 1.0), [actualBayX - 0.04, glassH, 0.14], S.ry);
      box(isLitS ? litGlass : darkGlass, toWorld(lx, visionY, d * 0.5 - 1.0), [actualBayX - 0.04, glassH, 0.14], S.ry);
    }

    const spanZ = d - 2.4;
    const numBaysZ = Math.max(1, Math.round(spanZ / 2.4));
    const actualBayZ = spanZ / numBaysZ;
    for (let bz = 0; bz < numBaysZ; bz++) {
      const lz = -spanZ * 0.5 + (bz + 0.5) * actualBayZ;
      const isLitW = hash(f, bz, 3, seed) < 0.28;
      const isLitE = hash(f, bz, 4, seed) < 0.28;
      box(isLitW ? litGlass : darkGlass, toWorld(-w * 0.5 + 1.0, visionY, lz), [0.14, glassH, actualBayZ - 0.04], S.ry);
      box(isLitE ? litGlass : darkGlass, toWorld(w * 0.5 - 1.0, visionY, lz), [0.14, glassH, actualBayZ - 0.04], S.ry);
    }
  }

  const midShaftY = podiumH + shaftH * 0.5;
  for (let x = -w * 0.5 + 2.4; x <= w * 0.5 - 2.4; x += 2.4) {
    box(silverMullions, toWorld(x, midShaftY, -d * 0.5 + 1.0), [0.07, shaftH, 0.22], S.ry);
    box(silverMullions, toWorld(x, midShaftY, d * 0.5 - 1.0), [0.07, shaftH, 0.22], S.ry);
  }
  for (let z = -d * 0.5 + 2.4; z <= d * 0.5 - 2.4; z += 2.4) {
    box(silverMullions, toWorld(-w * 0.5 + 1.0, midShaftY, z), [0.22, shaftH, 0.07], S.ry);
    box(silverMullions, toWorld(w * 0.5 - 1.0, midShaftY, z), [0.22, shaftH, 0.07], S.ry);
  }

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cylinder(silverSpandrels, toWorld(sx * (w * 0.5 - 1.0), midShaftY, sz * (d * 0.5 - 1.0)), 1.2, shaftH, 12);
    }
  }

  // --- 3. Angled Geometric Crown (122m to 135m) -------------------------------------------
  const crownBaseY = shaftTop;
  const cw = w - 4.0;
  const cd = d - 4.0;

  box(silverSpandrels, toWorld(0, crownBaseY + 3.0, 0), [cw, 5.5, cd], S.ry);
  box(silverSpandrels, toWorld(0, crownBaseY + 7.5, 0), [cw - 5.0, 2.5, cd - 4.0], S.ry);

  box(crownParts, toWorld(0, crownBaseY + 5.6, 0), [cw + 0.6, 0.3, cd + 0.6], S.ry);
  box(crownParts, toWorld(0, crownBaseY + 9.1, 0), [cw - 4.2, 0.3, cd - 3.2], S.ry);
  box(crownParts, toWorld(0, crownBaseY + 10.0, 0), [cw - 8.0, 1.0, 0.5], S.ry);

  for (const bx of [-cw * 0.30, cw * 0.30]) {
    cylinder(crownParts, toWorld(bx, crownBaseY + 9.4, 0), 0.1, 1.0, 8);
    cylinder(beaconParts, toWorld(bx, crownBaseY + 10.2, 0), 0.22, 0.32, 8);
  }

  // --- 4. Materials Palette ---------------------------------------------------------------
  const darkGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x2a3a4a, // Dark blue-grey Low-E reflective curtain wall
    roughness: 0.12,
    metalness: 0.88,
    side: THREE.DoubleSide
  });

  const litGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x3c3a30,
    roughness: 0.22,
    metalness: 0.35,
    side: THREE.DoubleSide
  });
  litGlassMat.emissiveNode = color(0xffe8ba).mul(nightAmount().mul(0.85).add(0.15));

  const silverSpandrelMat = new THREE.MeshStandardMaterial({
    color: 0xb8c2c8,
    roughness: 0.28,
    metalness: 0.72
  });

  const silverMullionMat = new THREE.MeshStandardMaterial({
    color: 0xd2d8dc,
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
    color: 0xc4cdd2,
    roughness: 0.3,
    metalness: 0.75
  });

  const beaconMat = new THREE.MeshStandardNodeMaterial({
    color: 0xff1122,
    roughness: 0.18,
    metalness: 0.1
  });
  beaconMat.emissiveNode = color(0xff2233).mul(nightAmount().mul(1.5).add(0.2));

  // --- 5. Merge Meshes --------------------------------------------------------------------
  merged(root, podiumStone, podiumStoneMat, 'CCB Tower stone podium and core');
  merged(root, podiumGlass, podiumGlassMat, 'CCB Tower banking hall storefront glazing');
  merged(root, silverSpandrels, silverSpandrelMat, 'CCB Tower silver spandrel ribbons');
  merged(root, silverMullions, silverMullionMat, 'CCB Tower vertical mullions and sunshade louvres');
  merged(root, darkGlass, darkGlassMat, 'CCB Tower dark blue-grey reflective curtain wall');
  merged(root, litGlass, litGlassMat, 'CCB Tower illuminated office glazing');
  merged(root, crownParts, crownMat, 'CCB Tower angled geometric crown');
  merged(root, beaconParts, beaconMat, 'CCB Tower rooftop aviation obstacle beacons', false);

  // --- 6. Colliders -----------------------------------------------------------------------
  const colliders = [];

  // --- 7. Landmark Metadata ---------------------------------------------------------------
  const landmark = {
    id: 'ccbTower',
    name: '中國建設銀行大廈',
    englishName: 'CCB Tower',
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
      ccbTowerOsm: S.osmId,
      ccbTowerHeight: S.height,
      ccbTowerLevels: S.levels,
      ccbTowerPanes: darkGlass.length + litGlass.length
    }
  };
}
