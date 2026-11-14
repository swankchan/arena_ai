// 瑞安中心 Shui On Centre, 6-8 Harbour Road, 灣仔.
// 118-metre office tower.
// OSM Way: 241998997 (118m, 36 levels).
import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  SHUI_ON_CENTRE_SITE as S,
  shuiOnCentreLocalToWorld
} from './shui-on-centre-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';

export function buildShuiOnCentre(scene, options = {}) {
  const groundY = options.groundOffset ?? hongKongTerrainHeight(S.x, S.z);

  const root = new THREE.Group();
  root.name = 'Shui On Centre — 瑞安中心';
  scene.add(root);

  const silverGlass = [];
  const litGlass = [];
  const silverSpandrels = [];
  const silverMullions = [];
  const podiumStone = [];
  const podiumGlass = [];
  const crownParts = [];
  const beaconParts = [];

  const w = S.w;
  const d = S.d;
  const podiumH = 10.0;
  const totalH = S.height;
  const crownH = 7.0;
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

  // Ground-floor retail glazing
  for (let f = 0; f < 2; f++) {
    const fy = 2.0 + f * 5.0;
    box(podiumGlass, toWorld(0, fy + 2.4, -d * 0.5 + 0.5), [w - 3.0, 4.8, 0.14], S.ry);
  }
  box(podiumGlass, toWorld(w * 0.5 - 0.5, 7.5, 0), [0.14, 9.0, d - 5.0], S.ry);
  box(podiumGlass, toWorld(-w * 0.5 + 0.5, 7.5, 0), [0.14, 9.0, d - 5.0], S.ry);
  box(podiumGlass, toWorld(0, 7.5, d * 0.5 - 0.5), [w - 6.0, 9.0, 0.14], S.ry);

  // Silver entrance canopy
  box(silverSpandrels, toWorld(0, 6.8, -d * 0.5 - 1.5), [w - 2.0, 0.3, 3.0], S.ry);
  for (const cx of [-w * 0.25, 0, w * 0.25]) {
    cylinder(silverMullions, toWorld(cx, 5.2, -d * 0.5 - 1.5), 0.18, 4.8, 10);
  }

  // Internal structural core
  box(podiumStone, toWorld(0, podiumH + shaftH * 0.5, 0), [w - 5.0, shaftH, d - 5.0], S.ry);

  // --- 2. Main Office Tower Shaft ----------------------------------------------------------
  const floorsCount = 31;
  const floorH = shaftH / floorsCount;
  const spandrelH = 0.95;
  const glassH = floorH - spandrelH;

  const seed = 135; // Shui On Centre unique night-light seed

  for (let f = 0; f < floorsCount; f++) {
    const baseY = podiumH + f * floorH;
    const spandrelY = baseY + spandrelH * 0.5;
    const visionY = baseY + spandrelH + glassH * 0.5;

    box(silverSpandrels, toWorld(0, spandrelY, -d * 0.5 + 0.8), [w - 1.6, spandrelH, 0.18], S.ry);
    box(silverSpandrels, toWorld(0, spandrelY, d * 0.5 - 0.8), [w - 1.6, spandrelH, 0.18], S.ry);
    box(silverSpandrels, toWorld(-w * 0.5 + 0.8, spandrelY, 0), [0.18, spandrelH, d - 1.6], S.ry);
    box(silverSpandrels, toWorld(w * 0.5 - 0.8, spandrelY, 0), [0.18, spandrelH, d - 1.6], S.ry);

    box(silverMullions, toWorld(0, spandrelY + spandrelH * 0.45, -d * 0.5 + 0.65), [w - 1.2, 0.06, 0.35], S.ry);
    box(silverMullions, toWorld(0, spandrelY + spandrelH * 0.45, d * 0.5 - 0.65), [w - 1.2, 0.06, 0.35], S.ry);

    const spanX = w - 1.6;
    const numBaysX = Math.max(1, Math.round(spanX / 2.2));
    const actualBayX = spanX / numBaysX;
    for (let bx = 0; bx < numBaysX; bx++) {
      const lx = -spanX * 0.5 + (bx + 0.5) * actualBayX;
      const isLitN = hash(f, bx, 1, seed) < 0.28;
      const isLitS = hash(f, bx, 2, seed) < 0.28;
      box(isLitN ? litGlass : silverGlass, toWorld(lx, visionY, -d * 0.5 + 0.8), [actualBayX - 0.04, glassH, 0.12], S.ry);
      box(isLitS ? litGlass : silverGlass, toWorld(lx, visionY, d * 0.5 - 0.8), [actualBayX - 0.04, glassH, 0.12], S.ry);
    }

    const spanZ = d - 1.6;
    const numBaysZ = Math.max(1, Math.round(spanZ / 2.2));
    const actualBayZ = spanZ / numBaysZ;
    for (let bz = 0; bz < numBaysZ; bz++) {
      const lz = -spanZ * 0.5 + (bz + 0.5) * actualBayZ;
      const isLitW = hash(f, bz, 3, seed) < 0.28;
      const isLitE = hash(f, bz, 4, seed) < 0.28;
      box(isLitW ? litGlass : silverGlass, toWorld(-w * 0.5 + 0.8, visionY, lz), [0.12, glassH, actualBayZ - 0.04], S.ry);
      box(isLitE ? litGlass : silverGlass, toWorld(w * 0.5 - 0.8, visionY, lz), [0.12, glassH, actualBayZ - 0.04], S.ry);
    }
  }

  const midShaftY = podiumH + shaftH * 0.5;
  for (let x = -w * 0.5 + 2.2; x <= w * 0.5 - 2.2; x += 2.2) {
    box(silverMullions, toWorld(x, midShaftY, -d * 0.5 + 0.8), [0.06, shaftH, 0.20], S.ry);
    box(silverMullions, toWorld(x, midShaftY, d * 0.5 - 0.8), [0.06, shaftH, 0.20], S.ry);
  }
  for (let z = -d * 0.5 + 2.2; z <= d * 0.5 - 2.2; z += 2.2) {
    box(silverMullions, toWorld(-w * 0.5 + 0.8, midShaftY, z), [0.20, shaftH, 0.06], S.ry);
    box(silverMullions, toWorld(w * 0.5 - 0.8, midShaftY, z), [0.20, shaftH, 0.06], S.ry);
  }

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cylinder(silverSpandrels, toWorld(sx * (w * 0.5 - 0.8), midShaftY, sz * (d * 0.5 - 0.8)), 1.0, shaftH, 12);
    }
  }

  // --- 3. Rooftop Mechanical Crown --------------------------------------------------------
  const crownBaseY = shaftTop;
  const cw = w - 3.0;
  const cd = d - 3.0;

  box(silverSpandrels, toWorld(0, crownBaseY + 2.5, 0), [cw, 4.5, cd], S.ry);
  box(silverSpandrels, toWorld(0, crownBaseY + 6.0, 0), [cw - 4.0, 2.0, cd - 3.0], S.ry);

  box(crownParts, toWorld(0, crownBaseY + 4.6, 0), [cw + 0.5, 0.3, cd + 0.5], S.ry);
  box(crownParts, toWorld(0, crownBaseY + 7.1, 0), [cw - 3.2, 0.3, cd - 2.2], S.ry);
  box(crownParts, toWorld(0, crownBaseY + 8.0, 0), [cw - 7.0, 0.9, 0.5], S.ry);

  for (const bx of [-cw * 0.30, cw * 0.30]) {
    cylinder(crownParts, toWorld(bx, crownBaseY + 7.4, 0), 0.1, 0.9, 8);
    cylinder(beaconParts, toWorld(bx, crownBaseY + 8.2, 0), 0.2, 0.28, 8);
  }

  // --- 4. Materials Palette ---------------------------------------------------------------
  const silverGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x334a5a, // Blue-gray reflective curtain wall
    roughness: 0.12,
    metalness: 0.88,
    side: THREE.DoubleSide
  });

  const litGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x4a4434,
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
  merged(root, podiumStone, podiumStoneMat, 'Shui On Centre stone podium and core');
  merged(root, podiumGlass, podiumGlassMat, 'Shui On Centre podium storefront glazing');
  merged(root, silverSpandrels, silverSpandrelMat, 'Shui On Centre silver spandrel ribbons');
  merged(root, silverMullions, silverMullionMat, 'Shui On Centre vertical mullions and sunshade louvres');
  merged(root, silverGlass, silverGlassMat, 'Shui On Centre blue-gray reflective curtain wall');
  merged(root, litGlass, litGlassMat, 'Shui On Centre illuminated office glazing');
  merged(root, crownParts, crownMat, 'Shui On Centre mechanical parapet crown');
  merged(root, beaconParts, beaconMat, 'Shui On Centre rooftop aviation obstacle beacons', false);

  // --- 6. Colliders -----------------------------------------------------------------------
  const colliders = [];

  // --- 7. Landmark Metadata ---------------------------------------------------------------
  const landmark = {
    id: 'shuiOnCentre',
    name: '瑞安中心',
    englishName: 'Shui On Centre',
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
      shuiOnCentreOsm: S.osmId,
      shuiOnCentreHeight: S.height,
      shuiOnCentreLevels: S.levels,
      shuiOnCentrePanes: silverGlass.length + litGlass.length
    }
  };
}
