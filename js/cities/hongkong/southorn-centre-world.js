// Southorn Centre 修頓中心, 130-150 Hennessy Road, Wan Chai (1978).
//
// 107-metre, 30-storey office tower on Hennessy Road, Wan Chai.
// Features a rectangular glass-and-concrete facade with a regular window grid,
// stone podium and entrance canopy, and a flat roof with parapet and rooftop plant.
//
// OSM Way: 148858987 (107m, 30 levels).
import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  SOUTHORN_CENTRE_SITE as S,
  southornCentreLocalToWorld
} from './southorn-centre-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';

export function buildSouthornCentre(scene, options = {}) {
  const groundY = options.groundOffset ?? hongKongTerrainHeight(S.x, S.z);

  const root = new THREE.Group();
  root.name = 'Southorn Centre — 修頓中心';
  scene.add(root);

  const silverGlass = [];
  const litGlass = [];
  const silverSpandrels = [];
  const silverMullions = [];
  const podiumStone = [];
  const podiumGlass = [];
  const crownParts = [];

  const w = S.w;
  const d = S.d;
  const podiumH = 12.0;
  const totalH = S.height;
  const crownH = 5.0;
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

  // Lobby glazing on Hennessy Road face
  for (let f = 0; f < 2; f++) {
    const fy = 2.0 + f * 5.0;
    box(podiumGlass, toWorld(0, fy + 2.4, -d * 0.5 + 0.5), [w - 3.0, 4.5, 0.14], S.ry);
  }
  box(podiumGlass, toWorld(w * 0.5 - 0.5, 7.5, 0), [0.14, 9.0, d - 6.0], S.ry);
  box(podiumGlass, toWorld(-w * 0.5 + 0.5, 7.5, 0), [0.14, 9.0, d - 6.0], S.ry);

  // Silver entrance canopy
  box(silverSpandrels, toWorld(0, 6.8, -d * 0.5 - 1.8), [w - 2.0, 0.3, 3.6], S.ry);
  for (const cx of [-w * 0.22, 0, w * 0.22]) {
    cylinder(silverMullions, toWorld(cx, 5.5, -d * 0.5 - 1.8), 0.18, 5.2, 8);
  }

  // Internal structural core
  box(podiumStone, toWorld(0, podiumH + shaftH * 0.5, 0), [w - 5.0, shaftH, d - 5.0], S.ry);

  // --- 2. Main Office Tower Shaft ----------------------------------------------------------
  const floorsCount = 28;
  const floorH = shaftH / floorsCount;
  const spandrelH = 0.95;
  const glassH = floorH - spandrelH;

  for (let f = 0; f < floorsCount; f++) {
    const baseY = podiumH + f * floorH;
    const spandrelY = baseY + spandrelH * 0.5;
    const visionY = baseY + spandrelH + glassH * 0.5;

    box(silverSpandrels, toWorld(0, spandrelY, -d * 0.5 + 0.9), [w - 1.8, spandrelH, 0.18], S.ry);
    box(silverSpandrels, toWorld(0, spandrelY, d * 0.5 - 0.9), [w - 1.8, spandrelH, 0.18], S.ry);
    box(silverSpandrels, toWorld(-w * 0.5 + 0.9, spandrelY, 0), [0.18, spandrelH, d - 1.8], S.ry);
    box(silverSpandrels, toWorld(w * 0.5 - 0.9, spandrelY, 0), [0.18, spandrelH, d - 1.8], S.ry);

    box(silverMullions, toWorld(0, spandrelY + spandrelH * 0.45, -d * 0.5 + 0.7), [w - 1.4, 0.06, 0.36], S.ry);
    box(silverMullions, toWorld(0, spandrelY + spandrelH * 0.45, d * 0.5 - 0.7), [w - 1.4, 0.06, 0.36], S.ry);

    const spanX = w - 2.2;
    const numBaysX = Math.max(1, Math.round(spanX / 2.4));
    const actualBayX = spanX / numBaysX;
    for (let bx = 0; bx < numBaysX; bx++) {
      const lx = -spanX * 0.5 + (bx + 0.5) * actualBayX;
      const isLitN = hash(f, bx, 1, 999) < 0.28;
      const isLitS = hash(f, bx, 2, 999) < 0.28;
      box(isLitN ? litGlass : silverGlass, toWorld(lx, visionY, -d * 0.5 + 0.9), [actualBayX - 0.04, glassH, 0.12], S.ry);
      box(isLitS ? litGlass : silverGlass, toWorld(lx, visionY, d * 0.5 - 0.9), [actualBayX - 0.04, glassH, 0.12], S.ry);
    }

    const spanZ = d - 2.2;
    const numBaysZ = Math.max(1, Math.round(spanZ / 2.4));
    const actualBayZ = spanZ / numBaysZ;
    for (let bz = 0; bz < numBaysZ; bz++) {
      const lz = -spanZ * 0.5 + (bz + 0.5) * actualBayZ;
      const isLitW = hash(f, bz, 3, 999) < 0.28;
      const isLitE = hash(f, bz, 4, 999) < 0.28;
      box(isLitW ? litGlass : silverGlass, toWorld(-w * 0.5 + 0.9, visionY, lz), [0.12, glassH, actualBayZ - 0.04], S.ry);
      box(isLitE ? litGlass : silverGlass, toWorld(w * 0.5 - 0.9, visionY, lz), [0.12, glassH, actualBayZ - 0.04], S.ry);
    }
  }

  const midShaftY = podiumH + shaftH * 0.5;
  for (let x = -w * 0.5 + 2.2; x <= w * 0.5 - 2.2; x += 2.4) {
    box(silverMullions, toWorld(x, midShaftY, -d * 0.5 + 0.9), [0.06, shaftH, 0.20], S.ry);
    box(silverMullions, toWorld(x, midShaftY, d * 0.5 - 0.9), [0.06, shaftH, 0.20], S.ry);
  }
  for (let z = -d * 0.5 + 2.2; z <= d * 0.5 - 2.2; z += 2.4) {
    box(silverMullions, toWorld(-w * 0.5 + 0.9, midShaftY, z), [0.20, shaftH, 0.06], S.ry);
    box(silverMullions, toWorld(w * 0.5 - 0.9, midShaftY, z), [0.20, shaftH, 0.06], S.ry);
  }

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cylinder(silverSpandrels, toWorld(sx * (w * 0.5 - 0.9), midShaftY, sz * (d * 0.5 - 0.9)), 1.0, shaftH, 10);
    }
  }

  // --- 3. Flat Roof Parapet & Plant (102m to 107m) ------------------------------------------
  const crownBaseY = shaftTop;
  const cw = w - 3.0;
  const cd = d - 3.0;

  box(crownParts, toWorld(0, crownBaseY + 2.0, 0), [cw, 1.2, cd], S.ry);
  box(crownParts, toWorld(0, crownBaseY + 3.6, 0), [cw - 2.0, 1.0, cd - 2.0], S.ry);

  // --- 4. Materials Palette ---------------------------------------------------------------
  const silverGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x3a4a52, // Reflective glass office curtain wall
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

  // --- 5. Merge Meshes --------------------------------------------------------------------
  merged(root, podiumStone, podiumStoneMat, 'Southorn Centre stone podium and core');
  merged(root, podiumGlass, podiumGlassMat, 'Southorn Centre lobby storefront glazing');
  merged(root, silverSpandrels, silverSpandrelMat, 'Southorn Centre silver spandrel ribbons');
  merged(root, silverMullions, silverMullionMat, 'Southorn Centre vertical mullions and sunshade louvres');
  merged(root, silverGlass, silverGlassMat, 'Southorn Centre reflective curtain wall');
  merged(root, litGlass, litGlassMat, 'Southorn Centre illuminated office glazing');
  merged(root, crownParts, crownMat, 'Southorn Centre roof parapet and plant');

  // --- 6. Colliders -----------------------------------------------------------------------
  const colliders = [
    harbourCityLocalCollider(S, 0, 0, w - 2.0, d - 2.0, groundY + podiumH, groundY + totalH)
  ];

  // --- 7. Landmark Metadata ---------------------------------------------------------------
  const landmark = {
    id: 'southorn-centre',
    name: '修頓中心',
    englishName: 'Southorn Centre',
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
      southornCentreOsm: S.osmId,
      southornCentreHeight: S.height,
      southornCentreLevels: S.levels,
      southornCentrePanes: silverGlass.length + litGlass.length
    }
  };
}
