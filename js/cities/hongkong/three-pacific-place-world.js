// 太古廣場三座 Three Pacific Place, 1 Queen's Road East, Admiralty (金鐘皇后大道東1號, 2004).
//
// 182-metre, 40-storey Grade-A office tower developed by Swire Properties and designed by Wong & Ouyang.
// Features a sleek modern chamfered parallelogram prismatic plan aligned along Queen's Road East,
// pale blue-green / silver double-glazed Low-E curtain wall with horizontal aerodynamic sunshades,
// 4-storey podium with double-height lobby, ground-floor vehicular building passage (Wing Fung Street West),
// and stepped mechanical penthouse crown with red aviation beacons.
//
// OSM Way: 88391081 (182m, 40 levels).
import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  THREE_PACIFIC_PLACE_SITE as S,
  threePacificPlaceLocalToWorld,
  threePacificPlaceWorldToLocal
} from './three-pacific-place-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';

export function buildThreePacificPlace(scene, options = {}) {
  const groundY = options.groundOffset ?? hongKongTerrainHeight(S.x, S.z);

  const root = new THREE.Group();
  root.name = 'Three Pacific Place — 太古廣場三座';
  scene.add(root);

  // Collections for merged geometries
  const silverCyanGlass = [];
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
  const podiumH = S.podiumHeight;
  const totalH = S.height;
  const crownH = S.crownHeight;
  const shaftH = S.shaftHeight;
  const shaftTop = podiumH + shaftH;

  const cs = Math.cos(S.ry), sn = Math.sin(S.ry);
  const toWorld = (lx, ly, lz) => [
    S.x + cs * lx + sn * lz,
    groundY + ly,
    S.z - sn * lx + cs * lz
  ];

  // --- 1. Podium Block & Vehicular Underpass (Wing Fung Street West) ---------------------------
  // Podium flanks the vehicular building passage (drop-off underpass has >5.1m clearance)
  // East podium wing
  box(podiumStone, toWorld(w * 0.28, podiumH * 0.5, 0), [w * 0.44, podiumH, d - 1.5], S.ry);
  // West podium wing
  box(podiumStone, toWorld(-w * 0.28, podiumH * 0.5, 0), [w * 0.44, podiumH, d - 1.5], S.ry);
  // Underpass ceiling slab spanning above the driveway (at Y = 6.2m)
  box(podiumStone, toWorld(0, (podiumH + 6.2) * 0.5, 0), [w * 0.16, podiumH - 6.2, d - 1.5], S.ry);

  // Grand Entrance Lobby Glass Facade (Double-height at North & South faces)
  for (let f = 0; f < 3; f++) {
    const fy = 1.2 + f * 5.2;
    box(podiumGlass, toWorld(0, fy + 2.2, -d * 0.5 + 0.6), [w - 3.2, 4.4, 0.12], S.ry);
    box(podiumGlass, toWorld(0, fy + 2.2, d * 0.5 - 0.6), [w - 3.2, 4.4, 0.12], S.ry);
  }

  // Entrance Lobby Pilasters & Stainless Steel Canopy
  box(silverSpandrels, toWorld(0, 7.8, -d * 0.5 - 1.6), [18.0, 0.4, 3.8], S.ry);
  for (const cx of [-7.5, 0, 7.5]) {
    cylinder(silverMullions, toWorld(cx, 3.9, -d * 0.5 - 1.6), 0.28, 7.8, 12);
  }

  // Internal structural core
  box(podiumStone, toWorld(0, podiumH + shaftH * 0.5, 0), [w - 6.0, shaftH, d - 6.0], S.ry);

  // --- 2. Main Prismatic Office Tower Shaft ----------------------------------------------------
  const floorsCount = 37;
  const floorH = shaftH / floorsCount;
  const spandrelH = 1.15;
  const glassH = floorH - spandrelH;

  for (let f = 0; f < floorsCount; f++) {
    const baseY = podiumH + f * floorH;
    const spandrelY = baseY + spandrelH * 0.5;
    const visionY = baseY + spandrelH + glassH * 0.5;

    // Horizontal aerodynamic silver spandrel louvre ribbons
    box(silverSpandrels, toWorld(0, spandrelY, -d * 0.5 + 1.2), [w - 2.4, spandrelH, 0.22], S.ry);
    box(silverSpandrels, toWorld(0, spandrelY, d * 0.5 - 1.2), [w - 2.4, spandrelH, 0.22], S.ry);
    box(silverSpandrels, toWorld(-w * 0.5 + 1.2, spandrelY, 0), [0.22, spandrelH, d - 2.4], S.ry);
    box(silverSpandrels, toWorld(w * 0.5 - 1.2, spandrelY, 0), [0.22, spandrelH, d - 2.4], S.ry);

    // Continuous projecting silver sunshade louvres
    box(silverMullions, toWorld(0, spandrelY + spandrelH * 0.4, -d * 0.5 + 1.0), [w - 2.0, 0.08, 0.45], S.ry);
    box(silverMullions, toWorld(0, spandrelY + spandrelH * 0.4, d * 0.5 - 1.0), [w - 2.0, 0.08, 0.45], S.ry);

    // Vision Glass — subdivided into realistic window bays (~2.4m) with scattered randomized night illumination
    const spanX = w - 2.6;
    const numBaysX = Math.max(1, Math.round(spanX / 2.4));
    const actualBayX = spanX / numBaysX;
    for (let bx = 0; bx < numBaysX; bx++) {
      const lx = -spanX * 0.5 + (bx + 0.5) * actualBayX;
      const isLitN = hash(f, bx, 1, 88) < 0.28;
      const isLitS = hash(f, bx, 2, 88) < 0.28;
      box(isLitN ? litGlass : silverCyanGlass, toWorld(lx, visionY, -d * 0.5 + 1.2), [actualBayX - 0.04, glassH, 0.14], S.ry);
      box(isLitS ? litGlass : silverCyanGlass, toWorld(lx, visionY, d * 0.5 - 1.2), [actualBayX - 0.04, glassH, 0.14], S.ry);
    }

    const spanZ = d - 2.6;
    const numBaysZ = Math.max(1, Math.round(spanZ / 2.4));
    const actualBayZ = spanZ / numBaysZ;
    for (let bz = 0; bz < numBaysZ; bz++) {
      const lz = -spanZ * 0.5 + (bz + 0.5) * actualBayZ;
      const isLitW = hash(f, bz, 3, 88) < 0.28;
      const isLitE = hash(f, bz, 4, 88) < 0.28;
      box(isLitW ? litGlass : silverCyanGlass, toWorld(-w * 0.5 + 1.2, visionY, lz), [0.14, glassH, actualBayZ - 0.04], S.ry);
      box(isLitE ? litGlass : silverCyanGlass, toWorld(w * 0.5 - 1.2, visionY, lz), [0.14, glassH, actualBayZ - 0.04], S.ry);
    }
  }

  // Vertical extruded silver mullions running full shaft height
  const midShaftY = podiumH + shaftH * 0.5;
  for (let x = -w * 0.5 + 2.5; x <= w * 0.5 - 2.5; x += 2.4) {
    box(silverMullions, toWorld(x, midShaftY, -d * 0.5 + 1.05), [0.08, shaftH, 0.25], S.ry);
    box(silverMullions, toWorld(x, midShaftY, d * 0.5 - 1.05), [0.08, shaftH, 0.25], S.ry);
  }
  for (let z = -d * 0.5 + 2.5; z <= d * 0.5 - 2.5; z += 2.4) {
    box(silverMullions, toWorld(-w * 0.5 + 1.05, midShaftY, z), [0.25, shaftH, 0.08], S.ry);
    box(silverMullions, toWorld(w * 0.5 - 1.05, midShaftY, z), [0.25, shaftH, 0.08], S.ry);
  }

  // Chamfered corner columns
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cylinder(silverSpandrels, toWorld(sx * (w * 0.5 - 1.2), midShaftY, sz * (d * 0.5 - 1.2)), 1.4, shaftH, 12);
    }
  }

  // --- 3. Stepped Mechanical Penthouse Crown (168m to 182m) -----------------------------------
  const crownBaseY = shaftTop;
  const cw = w - 4.5;
  const cd = d - 4.5;

  // Tier 1 Plant room with acoustic louvres
  box(darkLouvres, toWorld(0, crownBaseY + 4.0, 0), [cw, 8.0, cd], S.ry);
  // Tier 2 Recessed upper plant deck
  box(darkLouvres, toWorld(0, crownBaseY + 10.0, 0), [cw - 8.0, 4.0, cd - 6.0], S.ry);

  // Architectural silver crown parapet coping and cantilevered top fin
  box(crownParts, toWorld(0, crownBaseY + 8.1, 0), [cw + 0.6, 0.4, cd + 0.6], S.ry);
  box(crownParts, toWorld(0, crownBaseY + 12.1, 0), [cw - 7.2, 0.4, cd - 5.2], S.ry);

  // Signature cantilevered roof trellis screen fin
  box(crownParts, toWorld(0, crownBaseY + 13.5, 0), [cw - 12.0, 1.4, 0.6], S.ry);
  box(crownParts, toWorld(0, crownBaseY + 14.0, 0), [cw - 14.0, 0.3, cd - 12.0], S.ry);

  // Dual Rooftop Red Aviation Warning Obstacle Beacons
  for (const bx of [-cw * 0.35, cw * 0.35]) {
    cylinder(crownParts, toWorld(bx, crownBaseY + 12.5, 0), 0.12, 1.4, 8);
    cylinder(beaconParts, toWorld(bx, crownBaseY + 13.3, 0), 0.26, 0.4, 8);
  }

  // --- 4. Materials Palette (NodeMaterials for WebGPU) ----------------------------------------
  const silverCyanGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x22444c, // High-performance silver/cyan reflective Low-E double glazing
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
    color: 0xb8c2c8, // Fluorocarbon coated metallic silver spandrels
    roughness: 0.28,
    metalness: 0.72
  });

  const silverMullionMat = new THREE.MeshStandardMaterial({
    color: 0xd2d8dc, // Anodized natural silver aluminium mullions & sunshades
    roughness: 0.22,
    metalness: 0.82
  });

  const podiumStoneMat = new THREE.MeshStandardMaterial({
    color: 0xd6cebe, // Portuguese beige limestone & light grey granite
    roughness: 0.82,
    metalness: 0.05
  });

  const podiumGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x334448,
    roughness: 0.15,
    metalness: 0.45,
    side: THREE.DoubleSide
  });
  podiumGlassMat.emissiveNode = color(0xffefd0).mul(nightAmount().mul(0.55).add(0.1));

  const darkLouvreMat = new THREE.MeshStandardMaterial({
    color: 0x181a1c, // Dark charcoal acoustic plant louvres
    roughness: 0.55,
    metalness: 0.65
  });

  const crownMat = new THREE.MeshStandardMaterial({
    color: 0xc4cdd2, // Architectural silver roof crown structure
    roughness: 0.3,
    metalness: 0.75
  });

  const beaconMat = new THREE.MeshStandardNodeMaterial({
    color: 0xff1122,
    roughness: 0.18,
    metalness: 0.1
  });
  beaconMat.emissiveNode = color(0xff2233).mul(nightAmount().mul(1.5).add(0.2));

  // --- 5. Merge Meshes ------------------------------------------------------------------------
  merged(root, podiumStone, podiumStoneMat, 'Three Pacific Place limestone podium and core');
  merged(root, podiumGlass, podiumGlassMat, 'Three Pacific Place grand lobby storefront glazing');
  merged(root, silverSpandrels, silverSpandrelMat, 'Three Pacific Place silver spandrel ribbons');
  merged(root, silverMullions, silverMullionMat, 'Three Pacific Place vertical mullions and sunshade louvres');
  merged(root, silverCyanGlass, silverCyanGlassMat, 'Three Pacific Place silver-cyan reflective curtain wall');
  merged(root, litGlass, litGlassMat, 'Three Pacific Place illuminated office glazing');
  merged(root, darkLouvres, darkLouvreMat, 'Three Pacific Place acoustic plant louvres');
  merged(root, crownParts, crownMat, 'Three Pacific Place architectural crown trellis and fins');
  merged(root, beaconParts, beaconMat, 'Three Pacific Place rooftop aviation obstacle beacons', false);

  // --- 6. Colliders ---------------------------------------------------------------------------
  // Podiums on either side of Wing Fung Street West underpass
  const colliders = [
    // Main tower shaft collider
    harbourCityLocalCollider(S, 0, 0, w - 2.0, d - 2.0, groundY + podiumH, groundY + totalH),
    // East podium flank collider
    harbourCityLocalCollider(S, w * 0.28, 0, w * 0.42, d - 1.8, groundY + 0.1, groundY + podiumH),
    // West podium flank collider
    harbourCityLocalCollider(S, -w * 0.28, 0, w * 0.42, d - 1.8, groundY + 0.1, groundY + podiumH)
  ];

  // --- 7. Landmark Metadata & Ground Query ----------------------------------------------------
  const landmark = {
    id: 'three-pacific-place',
    name: '太古廣場三座',
    englishName: 'Three Pacific Place',
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

  function groundHeightAt(x, z, current, ref) {
    const p = threePacificPlaceWorldToLocal(x, z);
    if (Math.abs(p.x) < S.w * 0.48 && Math.abs(p.z) < S.d * 0.48) {
      const top = groundY + S.podiumHeight;
      if (ref >= top - 1.5 && ref <= top + 3.0) return top;
    }
    return current;
  }

  return {
    group: root,
    colliders,
    landmarks: [landmark],
    groundHeightAt,
    base: groundY,
    stats: {
      threePacificPlaceOsm: S.osmId,
      threePacificPlaceHeight: S.height,
      threePacificPlaceLevels: S.storeys,
      threePacificPlacePanes: silverCyanGlass.length + litGlass.length
    }
  };
}
