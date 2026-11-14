// 太古廣場一座 One Pacific Place, 1 Pacific Place, Queen's Road East, Admiralty (2004).
//
// 161-metre, 41-storey Grade-A office tower developed by Swire Properties and designed by Wong & Ouyang.
// Features a sculpted parallelogram-plan tower aligned along Queen's Road East, deep-set vertical glass
// curtain wall with silver spandrel ribbons and projecting sunshade fins, four-storey stone-clad podium
// with double-height lobby, and a stepped parapet crown with red aviation beacons.
//
// OSM Way: 41498860 (161m, 41 levels).
import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  ONE_PACIFIC_PLACE_SITE as S,
  onePacificPlaceLocalToWorld
} from './one-pacific-place-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';

export function buildOnePacificPlace(scene, options = {}) {
  const groundY = options.groundOffset ?? hongKongTerrainHeight(S.x, S.z);

  const root = new THREE.Group();
  root.name = 'One Pacific Place — 太古廣場一座';
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
  const podiumH = 15.0;
  const totalH = S.height;
  const crownH = 9.0;
  const shaftH = totalH - podiumH - crownH;
  const shaftTop = podiumH + shaftH;

  const cs = Math.cos(S.ry), sn = Math.sin(S.ry);
  const toWorld = (lx, ly, lz) => [
    S.x + cs * lx + sn * lz,
    groundY + ly,
    S.z - sn * lx + cs * lz
  ];

  // --- 1. Podium Block & Covered Arcade ------------------------------------------------------
  box(podiumStone, toWorld(0, podiumH * 0.5, 0), [w, podiumH, d], S.ry);

  // Double-height lobby glazing along the Queen's Road East face
  for (let f = 0; f < 2; f++) {
    const fy = 2.0 + f * 6.0;
    box(podiumGlass, toWorld(0, fy + 3.0, -d * 0.5 + 0.5), [w - 3.0, 6.0, 0.14], S.ry);
  }
  box(podiumGlass, toWorld(w * 0.5 - 0.5, 9.5, 0), [0.14, 11.0, d - 7.0], S.ry);
  box(podiumGlass, toWorld(-w * 0.5 + 0.5, 9.5, 0), [0.14, 11.0, d - 7.0], S.ry);
  box(podiumGlass, toWorld(0, 9.5, d * 0.5 - 0.5), [w - 7.0, 11.0, 0.14], S.ry);

  // Cantilevered silver entrance canopy
  box(silverSpandrels, toWorld(0, 8.0, -d * 0.5 - 2.0), [w - 1.5, 0.32, 4.0], S.ry);
  for (const cx of [-w * 0.3, 0, w * 0.3]) {
    cylinder(silverMullions, toWorld(cx, 6.0, -d * 0.5 - 2.0), 0.22, 5.6, 10);
  }

  // Internal structural core
  box(podiumStone, toWorld(0, podiumH + shaftH * 0.5, 0), [w - 6.0, shaftH, d - 6.0], S.ry);

  // --- 2. Main Parallelogram Office Tower Shaft ----------------------------------------------
  const floorsCount = 37;
  const floorH = shaftH / floorsCount;
  const spandrelH = 1.25;
  const glassH = floorH - spandrelH;

  for (let f = 0; f < floorsCount; f++) {
    const baseY = podiumH + f * floorH;
    const spandrelY = baseY + spandrelH * 0.5;
    const visionY = baseY + spandrelH + glassH * 0.5;

    // Horizontal silver spandrel ribbons on all four faces
    box(silverSpandrels, toWorld(0, spandrelY, -d * 0.5 + 1.1), [w - 2.2, spandrelH, 0.22], S.ry);
    box(silverSpandrels, toWorld(0, spandrelY, d * 0.5 - 1.1), [w - 2.2, spandrelH, 0.22], S.ry);
    box(silverSpandrels, toWorld(-w * 0.5 + 1.1, spandrelY, 0), [0.22, spandrelH, d - 2.2], S.ry);
    box(silverSpandrels, toWorld(w * 0.5 - 1.1, spandrelY, 0), [0.22, spandrelH, d - 2.2], S.ry);

    // Projecting silver sunshade fins
    box(silverMullions, toWorld(0, spandrelY + spandrelH * 0.45, -d * 0.5 + 0.9), [w - 1.8, 0.08, 0.45], S.ry);
    box(silverMullions, toWorld(0, spandrelY + spandrelH * 0.45, d * 0.5 - 0.9), [w - 1.8, 0.08, 0.45], S.ry);

    // Vision glass — individual window bays (~2.5m) with scattered randomized night illumination
    const spanX = w - 2.6;
    const numBaysX = Math.max(1, Math.round(spanX / 2.5));
    const actualBayX = spanX / numBaysX;
    for (let bx = 0; bx < numBaysX; bx++) {
      const lx = -spanX * 0.5 + (bx + 0.5) * actualBayX;
      const isLitN = hash(f, bx, 1, 213) < 0.28;
      const isLitS = hash(f, bx, 2, 213) < 0.28;
      box(isLitN ? litGlass : silverGlass, toWorld(lx, visionY, -d * 0.5 + 1.1), [actualBayX - 0.04, glassH, 0.14], S.ry);
      box(isLitS ? litGlass : silverGlass, toWorld(lx, visionY, d * 0.5 - 1.1), [actualBayX - 0.04, glassH, 0.14], S.ry);
    }

    const spanZ = d - 2.6;
    const numBaysZ = Math.max(1, Math.round(spanZ / 2.5));
    const actualBayZ = spanZ / numBaysZ;
    for (let bz = 0; bz < numBaysZ; bz++) {
      const lz = -spanZ * 0.5 + (bz + 0.5) * actualBayZ;
      const isLitW = hash(f, bz, 3, 213) < 0.28;
      const isLitE = hash(f, bz, 4, 213) < 0.28;
      box(isLitW ? litGlass : silverGlass, toWorld(-w * 0.5 + 1.1, visionY, lz), [0.14, glassH, actualBayZ - 0.04], S.ry);
      box(isLitE ? litGlass : silverGlass, toWorld(w * 0.5 - 1.1, visionY, lz), [0.14, glassH, actualBayZ - 0.04], S.ry);
    }
  }

  // Full-height vertical silver mullions
  const midShaftY = podiumH + shaftH * 0.5;
  for (let x = -w * 0.5 + 2.5; x <= w * 0.5 - 2.5; x += 2.5) {
    box(silverMullions, toWorld(x, midShaftY, -d * 0.5 + 1.0), [0.08, shaftH, 0.24], S.ry);
    box(silverMullions, toWorld(x, midShaftY, d * 0.5 - 1.0), [0.08, shaftH, 0.24], S.ry);
  }
  for (let z = -d * 0.5 + 2.5; z <= d * 0.5 - 2.5; z += 2.5) {
    box(silverMullions, toWorld(-w * 0.5 + 1.0, midShaftY, z), [0.24, shaftH, 0.08], S.ry);
    box(silverMullions, toWorld(w * 0.5 - 1.0, midShaftY, z), [0.24, shaftH, 0.08], S.ry);
  }

  // Chamfered corner columns
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cylinder(silverSpandrels, toWorld(sx * (w * 0.5 - 1.0), midShaftY, sz * (d * 0.5 - 1.0)), 1.3, shaftH, 12);
    }
  }

  // --- 3. Stepped Parapet Crown (152m to 161m) ---------------------------------------------
  const crownBaseY = shaftTop;
  const cw = w - 5.0;
  const cd = d - 5.0;

  box(darkLouvres, toWorld(0, crownBaseY + 4.0, 0), [cw, 7.0, cd], S.ry);
  box(darkLouvres, toWorld(0, crownBaseY + 9.0, 0), [cw - 7.0, 3.0, cd - 6.0], S.ry);

  // Silver parapet coping and architectural fin
  box(crownParts, toWorld(0, crownBaseY + 7.1, 0), [cw + 0.6, 0.4, cd + 0.6], S.ry);
  box(crownParts, toWorld(0, crownBaseY + 12.1, 0), [cw - 6.2, 0.4, cd - 5.2], S.ry);
  box(crownParts, toWorld(0, crownBaseY + 13.0, 0), [cw - 12.0, 1.3, 0.55], S.ry);

  // Dual rooftop red aviation warning beacons
  for (const bx of [-cw * 0.32, cw * 0.32]) {
    cylinder(crownParts, toWorld(bx, crownBaseY + 11.2, 0), 0.11, 1.3, 8);
    cylinder(beaconParts, toWorld(bx, crownBaseY + 12.1, 0), 0.25, 0.38, 8);
  }

  // --- 4. Materials Palette -----------------------------------------------------------------
  const silverGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x243a45, // Deep silver-blue reflective office curtain wall
    roughness: 0.12,
    metalness: 0.88,
    side: THREE.DoubleSide
  });

  const litGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x484232,
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
    color: 0xd6cebe, // Portuguese beige limestone podium
    roughness: 0.82,
    metalness: 0.05
  });

  const podiumGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x2e3c42,
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
  merged(root, podiumStone, podiumStoneMat, 'One Pacific Place limestone podium and core');
  merged(root, podiumGlass, podiumGlassMat, 'One Pacific Place grand lobby storefront glazing');
  merged(root, silverSpandrels, silverSpandrelMat, 'One Pacific Place silver spandrel ribbons');
  merged(root, silverMullions, silverMullionMat, 'One Pacific Place vertical mullions and sunshade fins');
  merged(root, silverGlass, silverGlassMat, 'One Pacific Place silver reflective curtain wall');
  merged(root, litGlass, litGlassMat, 'One Pacific Place illuminated office glazing');
  merged(root, darkLouvres, darkLouvreMat, 'One Pacific Place mechanical plant louvres');
  merged(root, crownParts, crownMat, 'One Pacific Place architectural parapet crown and fin');
  merged(root, beaconParts, beaconMat, 'One Pacific Place rooftop aviation obstacle beacons', false);

  // --- 6. Colliders ------------------------------------------------------------------------
  const colliders = [
    harbourCityLocalCollider(S, 0, 0, w - 2.0, d - 2.0, groundY + podiumH, groundY + totalH)
  ];

  // --- 7. Landmark Metadata ---------------------------------------------------------------
  const landmark = {
    id: 'one-pacific-place',
    name: '太古廣場一座',
    englishName: 'One Pacific Place',
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
      onePacificPlaceOsm: S.osmId,
      onePacificPlaceHeight: S.height,
      onePacificPlaceLevels: S.levels,
      onePacificPlacePanes: silverGlass.length + litGlass.length
    }
  };
}
