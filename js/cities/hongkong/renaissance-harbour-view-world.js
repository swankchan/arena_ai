// 萬麗海景酒店 Renaissance Hong Kong Harbour View Hotel, 101-109 Harbour Road, Wan Chai (1989).
//
// 150-metre, 42-storey five-star hotel tower developed by Cheung Kong (Holdings).
// Features a long rectangular hotel tower above a broad stone-and-glass podium overlooking
// Victoria Harbour, silver-blue reflective curtain wall with horizontal sunshade louvres,
// grand double-height lobby with cantilevered glass canopy,
// and a stepped mechanical crown with red aviation obstacle beacons.
//
// OSM Way: 107497707 (150m, 42 levels).
import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  RENAISSANCE_HARBOUR_VIEW_SITE as S,
  renaissanceHarbourViewLocalToWorld
} from './renaissance-harbour-view-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';

export function buildRenaissanceHarbourView(scene, options = {}) {
  const groundY = options.groundOffset ?? hongKongTerrainHeight(S.x, S.z);

  const root = new THREE.Group();
  root.name = 'Renaissance Hong Kong Harbour View Hotel — 萬麗海景酒店';
  scene.add(root);

  const silverGlass = [];
  const litGlass = [];
  const silverSpandrels = [];
  const silverMullions = [];
  const podiumStone = [];
  const podiumGlass = [];
  const darkLouvres = [];
  const crownParts = [];
  const beaconParts = [];

  const w = S.w;
  const d = S.d;
  const podiumH = 16.0;
  const totalH = S.height;
  const crownH = 8.0;
  const shaftH = totalH - podiumH - crownH;
  const shaftTop = podiumH + shaftH;

  const cs = Math.cos(S.ry), sn = Math.sin(S.ry);
  const toWorld = (lx, ly, lz) => [
    S.x + cs * lx + sn * lz,
    groundY + ly,
    S.z - sn * lx + cs * lz
  ];

  // --- 1. Podium Block & Grand Lobby ------------------------------------------------------
  box(podiumStone, toWorld(0, podiumH * 0.5, 0), [w, podiumH, d], S.ry);

  // Double-height lobby glazing on the Harbour Road face
  for (let f = 0; f < 2; f++) {
    const fy = 2.0 + f * 6.5;
    box(podiumGlass, toWorld(0, fy + 3.0, -d * 0.5 + 0.5), [w - 3.0, 6.0, 0.14], S.ry);
  }
  box(podiumGlass, toWorld(w * 0.5 - 0.5, 10.0, 0), [0.14, 12.0, d - 7.0], S.ry);
  box(podiumGlass, toWorld(-w * 0.5 + 0.5, 10.0, 0), [0.14, 12.0, d - 7.0], S.ry);
  box(podiumGlass, toWorld(0, 10.0, d * 0.5 - 0.5), [w - 7.0, 12.0, 0.14], S.ry);

  // Cantilevered silver entrance canopy
  box(silverSpandrels, toWorld(0, 8.4, -d * 0.5 - 2.2), [w - 2.0, 0.35, 4.4], S.ry);
  for (const cx of [-w * 0.28, 0, w * 0.28]) {
    cylinder(silverMullions, toWorld(cx, 6.4, -d * 0.5 - 2.2), 0.22, 6.0, 10);
  }

  // Internal structural core
  box(podiumStone, toWorld(0, podiumH + shaftH * 0.5, 0), [w - 6.0, shaftH, d - 6.0], S.ry);

  // --- 2. Main Long Hotel Tower Shaft -------------------------------------------------------
  const floorsCount = 38;
  const floorH = shaftH / floorsCount;
  const spandrelH = 1.05;
  const glassH = floorH - spandrelH;

  for (let f = 0; f < floorsCount; f++) {
    const baseY = podiumH + f * floorH;
    const spandrelY = baseY + spandrelH * 0.5;
    const visionY = baseY + spandrelH + glassH * 0.5;

    // Horizontal silver spandrel ribbons on all four faces
    box(silverSpandrels, toWorld(0, spandrelY, -d * 0.5 + 1.1), [w - 2.2, spandrelH, 0.20], S.ry);
    box(silverSpandrels, toWorld(0, spandrelY, d * 0.5 - 1.1), [w - 2.2, spandrelH, 0.20], S.ry);
    box(silverSpandrels, toWorld(-w * 0.5 + 1.1, spandrelY, 0), [0.20, spandrelH, d - 2.2], S.ry);
    box(silverSpandrels, toWorld(w * 0.5 - 1.1, spandrelY, 0), [0.20, spandrelH, d - 2.2], S.ry);

    // Projecting silver sunshade louvres
    box(silverMullions, toWorld(0, spandrelY + spandrelH * 0.45, -d * 0.5 + 0.9), [w - 1.8, 0.07, 0.42], S.ry);
    box(silverMullions, toWorld(0, spandrelY + spandrelH * 0.45, d * 0.5 - 0.9), [w - 1.8, 0.07, 0.42], S.ry);

    // Vision glass — individual window bays (~2.4m) with scattered randomized night illumination
    const spanX = w - 2.4;
    const numBaysX = Math.max(1, Math.round(spanX / 2.4));
    const actualBayX = spanX / numBaysX;
    for (let bx = 0; bx < numBaysX; bx++) {
      const lx = -spanX * 0.5 + (bx + 0.5) * actualBayX;
      const isLitN = hash(f, bx, 1, 555) < 0.28;
      const isLitS = hash(f, bx, 2, 555) < 0.28;
      box(isLitN ? litGlass : silverGlass, toWorld(lx, visionY, -d * 0.5 + 1.1), [actualBayX - 0.04, glassH, 0.14], S.ry);
      box(isLitS ? litGlass : silverGlass, toWorld(lx, visionY, d * 0.5 - 1.1), [actualBayX - 0.04, glassH, 0.14], S.ry);
    }

    const spanZ = d - 2.4;
    const numBaysZ = Math.max(1, Math.round(spanZ / 2.4));
    const actualBayZ = spanZ / numBaysZ;
    for (let bz = 0; bz < numBaysZ; bz++) {
      const lz = -spanZ * 0.5 + (bz + 0.5) * actualBayZ;
      const isLitW = hash(f, bz, 3, 555) < 0.28;
      const isLitE = hash(f, bz, 4, 555) < 0.28;
      box(isLitW ? litGlass : silverGlass, toWorld(-w * 0.5 + 1.1, visionY, lz), [0.14, glassH, actualBayZ - 0.04], S.ry);
      box(isLitE ? litGlass : silverGlass, toWorld(w * 0.5 - 1.1, visionY, lz), [0.14, glassH, actualBayZ - 0.04], S.ry);
    }
  }

  // Full-height vertical silver mullions
  const midShaftY = podiumH + shaftH * 0.5;
  for (let x = -w * 0.5 + 2.4; x <= w * 0.5 - 2.4; x += 2.4) {
    box(silverMullions, toWorld(x, midShaftY, -d * 0.5 + 1.0), [0.07, shaftH, 0.22], S.ry);
    box(silverMullions, toWorld(x, midShaftY, d * 0.5 - 1.0), [0.07, shaftH, 0.22], S.ry);
  }
  for (let z = -d * 0.5 + 2.4; z <= d * 0.5 - 2.4; z += 2.4) {
    box(silverMullions, toWorld(-w * 0.5 + 1.0, midShaftY, z), [0.22, shaftH, 0.07], S.ry);
    box(silverMullions, toWorld(w * 0.5 - 1.0, midShaftY, z), [0.22, shaftH, 0.07], S.ry);
  }

  // Chamfered corner columns
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cylinder(silverSpandrels, toWorld(sx * (w * 0.5 - 1.0), midShaftY, sz * (d * 0.5 - 1.0)), 1.2, shaftH, 12);
    }
  }

  // --- 3. Stepped Mechanical Crown (142m to 150m) -------------------------------------------
  const crownBaseY = shaftTop;
  const cw = w - 4.0;
  const cd = d - 4.0;

  box(darkLouvres, toWorld(0, crownBaseY + 3.5, 0), [cw, 6.0, cd], S.ry);
  box(darkLouvres, toWorld(0, crownBaseY + 8.5, 0), [cw - 6.0, 3.0, cd - 5.0], S.ry);

  // Silver parapet coping and top fin
  box(crownParts, toWorld(0, crownBaseY + 6.1, 0), [cw + 0.6, 0.35, cd + 0.6], S.ry);
  box(crownParts, toWorld(0, crownBaseY + 10.1, 0), [cw - 5.2, 0.35, cd - 4.2], S.ry);
  box(crownParts, toWorld(0, crownBaseY + 11.2, 0), [cw - 10.0, 1.2, 0.5], S.ry);

  // Dual rooftop red aviation warning beacons
  for (const bx of [-cw * 0.32, cw * 0.32]) {
    cylinder(crownParts, toWorld(bx, crownBaseY + 10.2, 0), 0.1, 1.2, 8);
    cylinder(beaconParts, toWorld(bx, crownBaseY + 11.0, 0), 0.24, 0.35, 8);
  }

  // --- 4. Materials Palette -----------------------------------------------------------------
  const silverGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x1f3b4d, // Silver-blue reflective hotel curtain wall
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
    color: 0xd8d0c0, // Warm beige limestone podium
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

  const darkLouvreMat = new THREE.MeshStandardMaterial({
    color: 0x181a1c,
    roughness: 0.55,
    metalness: 0.65
  });

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

  // --- 5. Merge Meshes ---------------------------------------------------------------------
  merged(root, podiumStone, podiumStoneMat, 'Renaissance Harbour View limestone podium and core');
  merged(root, podiumGlass, podiumGlassMat, 'Renaissance Harbour View grand lobby storefront glazing');
  merged(root, silverSpandrels, silverSpandrelMat, 'Renaissance Harbour View silver spandrel ribbons');
  merged(root, silverMullions, silverMullionMat, 'Renaissance Harbour View vertical mullions and sunshade louvres');
  merged(root, silverGlass, silverGlassMat, 'Renaissance Harbour View silver reflective curtain wall');
  merged(root, litGlass, litGlassMat, 'Renaissance Harbour View illuminated hotel glazing');
  merged(root, darkLouvres, darkLouvreMat, 'Renaissance Harbour View mechanical plant louvres');
  merged(root, crownParts, crownMat, 'Renaissance Harbour View architectural parapet crown and fin');
  merged(root, beaconParts, beaconMat, 'Renaissance Harbour View rooftop aviation obstacle beacons', false);

  // --- 6. Colliders ------------------------------------------------------------------------
  const colliders = [
    harbourCityLocalCollider(S, 0, 0, w - 2.0, d - 2.0, groundY + podiumH, groundY + totalH)
  ];

  // --- 7. Landmark Metadata ---------------------------------------------------------------
  const landmark = {
    id: 'renaissance-harbour-view',
    name: '萬麗海景酒店',
    englishName: 'Renaissance Hong Kong Harbour View Hotel',
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
      renaissanceHarbourViewOsm: S.osmId,
      renaissanceHarbourViewHeight: S.height,
      renaissanceHarbourViewLevels: S.levels,
      renaissanceHarbourViewPanes: silverGlass.length + litGlass.length
    }
  };
}
