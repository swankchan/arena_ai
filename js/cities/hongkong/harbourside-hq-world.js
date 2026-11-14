// 啟匯 Harbourside HQ, 8 Lam Chak Street, 啟德 (九龍城區).
// 85-metre commercial tower.
// OSM Way: 198558927 (85m).
import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  HARBOURSIDE_HQ_SITE as S,
  harboursideHqLocalToWorld
} from './harbourside-hq-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';

export function buildHarboursideHq(scene, options = {}) {
  const groundY = options.groundOffset ?? hongKongTerrainHeight(S.x, S.z);

  const root = new THREE.Group();
  root.name = 'Harbourside HQ — 啟匯';
  scene.add(root);

  const concreteGlass = [];
  const litGlass = [];
  const concreteSpandrels = [];
  const concreteMullions = [];
  const podiumStone = [];
  const podiumGlass = [];
  const crownParts = [];
  const beaconParts = [];

  const w = S.w;
  const d = S.d;
  const podiumH = 10.0;
  const totalH = S.height;
  const crownH = 5.5;
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

  // Ground-floor glazing (public entrance)
  for (let f = 0; f < 2; f++) {
    const fy = 2.0 + f * 5.0;
    box(podiumGlass, toWorld(0, fy + 2.4, -d * 0.5 + 0.5), [w - 3.0, 4.8, 0.14], S.ry);
  }
  box(podiumGlass, toWorld(w * 0.5 - 0.5, 7.5, 0), [0.14, 9.0, d - 5.0], S.ry);
  box(podiumGlass, toWorld(-w * 0.5 + 0.5, 7.5, 0), [0.14, 9.0, d - 5.0], S.ry);
  box(podiumGlass, toWorld(0, 7.5, d * 0.5 - 0.5), [w - 6.0, 9.0, 0.14], S.ry);

  // Concrete entrance canopy
  box(concreteSpandrels, toWorld(0, 6.8, -d * 0.5 - 1.5), [w - 2.0, 0.3, 3.0], S.ry);
  for (const cx of [-w * 0.25, 0, w * 0.25]) {
    cylinder(concreteMullions, toWorld(cx, 5.2, -d * 0.5 - 1.5), 0.18, 4.8, 10);
  }

  // Internal structural core
  box(podiumStone, toWorld(0, podiumH + shaftH * 0.5, 0), [w - 5.0, shaftH, d - 5.0], S.ry);

  // --- 2. Main Tower Shaft ----------------------------------------------------------
  const floorsCount = S.levels - 2;
  const floorH = shaftH / floorsCount;
  const spandrelH = 0.95;
  const glassH = floorH - spandrelH;

  const seed = 139; // Harbourside HQ unique night-light seed

  for (let f = 0; f < floorsCount; f++) {
    const baseY = podiumH + f * floorH;
    const spandrelY = baseY + spandrelH * 0.5;
    const visionY = baseY + spandrelH + glassH * 0.5;

    box(concreteSpandrels, toWorld(0, spandrelY, -d * 0.5 + 0.8), [w - 1.6, spandrelH, 0.18], S.ry);
    box(concreteSpandrels, toWorld(0, spandrelY, d * 0.5 - 0.8), [w - 1.6, spandrelH, 0.18], S.ry);
    box(concreteSpandrels, toWorld(-w * 0.5 + 0.8, spandrelY, 0), [0.18, spandrelH, d - 1.6], S.ry);
    box(concreteSpandrels, toWorld(w * 0.5 - 0.8, spandrelY, 0), [0.18, spandrelH, d - 1.6], S.ry);

    box(concreteMullions, toWorld(0, spandrelY + spandrelH * 0.45, -d * 0.5 + 0.65), [w - 1.2, 0.06, 0.35], S.ry);
    box(concreteMullions, toWorld(0, spandrelY + spandrelH * 0.45, d * 0.5 - 0.65), [w - 1.2, 0.06, 0.35], S.ry);

    const spanX = w - 1.6;
    const numBaysX = Math.max(1, Math.round(spanX / 2.2));
    const actualBayX = spanX / numBaysX;
    for (let bx = 0; bx < numBaysX; bx++) {
      const lx = -spanX * 0.5 + (bx + 0.5) * actualBayX;
      const isLitN = hash(f, bx, 1, seed) < 0.28;
      const isLitS = hash(f, bx, 2, seed) < 0.28;
      box(isLitN ? litGlass : concreteGlass, toWorld(lx, visionY, -d * 0.5 + 0.8), [actualBayX - 0.04, glassH, 0.12], S.ry);
      box(isLitS ? litGlass : concreteGlass, toWorld(lx, visionY, d * 0.5 - 0.8), [actualBayX - 0.04, glassH, 0.12], S.ry);
    }

    const spanZ = d - 1.6;
    const numBaysZ = Math.max(1, Math.round(spanZ / 2.2));
    const actualBayZ = spanZ / numBaysZ;
    for (let bz = 0; bz < numBaysZ; bz++) {
      const lz = -spanZ * 0.5 + (bz + 0.5) * actualBayZ;
      const isLitW = hash(f, bz, 3, seed) < 0.28;
      const isLitE = hash(f, bz, 4, seed) < 0.28;
      box(isLitW ? litGlass : concreteGlass, toWorld(-w * 0.5 + 0.8, visionY, lz), [0.12, glassH, actualBayZ - 0.04], S.ry);
      box(isLitE ? litGlass : concreteGlass, toWorld(w * 0.5 - 0.8, visionY, lz), [0.12, glassH, actualBayZ - 0.04], S.ry);
    }
  }

  const midShaftY = podiumH + shaftH * 0.5;
  for (let x = -w * 0.5 + 2.2; x <= w * 0.5 - 2.2; x += 2.2) {
    box(concreteMullions, toWorld(x, midShaftY, -d * 0.5 + 0.8), [0.06, shaftH, 0.20], S.ry);
    box(concreteMullions, toWorld(x, midShaftY, d * 0.5 - 0.8), [0.06, shaftH, 0.20], S.ry);
  }
  for (let z = -d * 0.5 + 2.2; z <= d * 0.5 - 2.2; z += 2.2) {
    box(concreteMullions, toWorld(-w * 0.5 + 0.8, midShaftY, z), [0.20, shaftH, 0.06], S.ry);
    box(concreteMullions, toWorld(w * 0.5 - 0.8, midShaftY, z), [0.20, shaftH, 0.06], S.ry);
  }

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cylinder(concreteSpandrels, toWorld(sx * (w * 0.5 - 0.8), midShaftY, sz * (d * 0.5 - 0.8)), 1.0, shaftH, 12);
    }
  }

  // --- 3. Rooftop Mechanical Crown --------------------------------------------------------
  const crownBaseY = shaftTop;
  const cw = w - 3.0;
  const cd = d - 3.0;

  box(concreteSpandrels, toWorld(0, crownBaseY + 2.5, 0), [cw, 4.0, cd], S.ry);
  box(concreteSpandrels, toWorld(0, crownBaseY + 5.5, 0), [cw - 4.0, 1.8, cd - 3.0], S.ry);

  box(crownParts, toWorld(0, crownBaseY + 4.1, 0), [cw + 0.5, 0.3, cd + 0.5], S.ry);
  box(crownParts, toWorld(0, crownBaseY + 6.4, 0), [cw - 3.2, 0.3, cd - 2.2], S.ry);
  box(crownParts, toWorld(0, crownBaseY + 7.3, 0), [cw - 7.0, 0.9, 0.5], S.ry);

  for (const bx of [-cw * 0.30, cw * 0.30]) {
    cylinder(crownParts, toWorld(bx, crownBaseY + 6.7, 0), 0.1, 0.9, 8);
    cylinder(beaconParts, toWorld(bx, crownBaseY + 7.5, 0), 0.2, 0.28, 8);
  }

  // --- 4. Materials Palette (glass commercial) -----------------------------------------
  const concreteGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x333a42, // Cool reflective glass
    roughness: 0.14,
    metalness: 0.84,
    side: THREE.DoubleSide
  });

  const litGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x333a42,
    roughness: 0.22,
    metalness: 0.35,
    side: THREE.DoubleSide
  });
  litGlassMat.emissiveNode = color(0xffe8ba).mul(nightAmount().mul(0.85).add(0.15));

  const concreteSpandrelMat = new THREE.MeshStandardMaterial({
    color: 0x8d949c,
    roughness: 0.62,
    metalness: 0.30
  });

  const concreteMullionMat = new THREE.MeshStandardMaterial({
    color: 0xa8adb2,
    roughness: 0.52,
    metalness: 0.40
  });

  const podiumStoneMat = new THREE.MeshStandardMaterial({
    color: 0x9aa0a6,
    roughness: 0.88,
    metalness: 0.08
  });

  const podiumGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x2a3036,
    roughness: 0.15,
    metalness: 0.48,
    side: THREE.DoubleSide
  });
  podiumGlassMat.emissiveNode = color(0xffefd0).mul(nightAmount().mul(0.55).add(0.1));

  const crownMat = new THREE.MeshStandardMaterial({
    color: 0x8d949c,
    roughness: 0.55,
    metalness: 0.50
  });

  const beaconMat = new THREE.MeshStandardNodeMaterial({
    color: 0xff1122,
    roughness: 0.18,
    metalness: 0.1
  });
  beaconMat.emissiveNode = color(0xff2233).mul(nightAmount().mul(1.5).add(0.2));

  // --- 5. Merge Meshes --------------------------------------------------------------------
  merged(root, podiumStone, podiumStoneMat, 'Harbourside HQ concrete podium and core');
  merged(root, podiumGlass, podiumGlassMat, 'Harbourside HQ podium storefront glazing');
  merged(root, concreteSpandrels, concreteSpandrelMat, 'Harbourside HQ concrete spandrel ribbons');
  merged(root, concreteMullions, concreteMullionMat, 'Harbourside HQ vertical mullions');
  merged(root, concreteGlass, concreteGlassMat, 'Harbourside HQ cool reflective curtain wall');
  merged(root, litGlass, litGlassMat, 'Harbourside HQ illuminated office glazing');
  merged(root, crownParts, crownMat, 'Harbourside HQ mechanical parapet crown');
  merged(root, beaconParts, beaconMat, 'Harbourside HQ rooftop aviation obstacle beacons', false);

  // --- 6. Colliders -----------------------------------------------------------------------
  const colliders = [];

  // --- 7. Landmark Metadata ---------------------------------------------------------------
  const landmark = {
    id: 'harboursideHq',
    name: '啟匯',
    englishName: 'Harbourside HQ',
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
      harboursideHqOsm: S.osmId,
      harboursideHqHeight: S.height,
      harboursideHqLevels: S.levels,
      harboursideHqPanes: concreteGlass.length + litGlass.length
    }
  };
}
