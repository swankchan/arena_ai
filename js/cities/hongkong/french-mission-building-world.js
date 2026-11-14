// 法國外方傳道會大樓 French Mission Building, 1 Battery Path, 中環 (中西區).
// Declared Monument, 4 levels.
// OSM Way: 85320697.
import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  FRENCH_MISSION_BUILDING_SITE as S,
  frenchMissionBuildingLocalToWorld
} from './french-mission-building-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { box, cylinder, merged, nightAmount, hash } from './harbour-city-world-utils.js';

export function buildFrenchMissionBuilding(scene, options = {}) {
  const groundY = options.groundOffset ?? hongKongTerrainHeight(S.x, S.z);

  const root = new THREE.Group();
  root.name = 'French Mission Building — 法國外方傳道會大樓';
  scene.add(root);

  const heritageStone = [];
  const heritageGlassGround = [];
  const heritageGlassUpper = [];
  const litGlassUpper = [];
  const stoneMullions = [];
  const roofParts = [];
  const chimneyParts = [];
  const beaconParts = [];

  const w = S.w;
  const d = S.d;
  const podiumH = 4.0;
  const totalH = S.height ?? 22.0;
  const shaftH = totalH - podiumH;
  const shaftTop = podiumH + shaftH;

  const cs = Math.cos(S.ry), sn = Math.sin(S.ry);
  const toWorld = (lx, ly, lz) => [
    S.x + cs * lx + sn * lz,
    groundY + ly,
    S.z - sn * lx + cs * lz
  ];

  // --- 1. Ground floor & Entrance ---------------------------------------------------------
  box(heritageStone, toWorld(0, podiumH * 0.5, 0), [w, podiumH, d], S.ry);

  // Ground-floor arched glazing (heritage entrance)
  box(heritageGlassGround, toWorld(0, podiumH * 0.5 + 1.5, -d * 0.5 + 0.5), [w - 2.0, 3.0, 0.14], S.ry);
  box(heritageGlassGround, toWorld(w * 0.5 - 0.5, podiumH * 0.5 + 1.5, 0), [0.14, 3.0, d - 4.0], S.ry);
  box(heritageGlassGround, toWorld(-w * 0.5 + 0.5, podiumH * 0.5 + 1.5, 0), [0.14, 3.0, d - 4.0], S.ry);

  // Stone entrance portico columns
  for (const cx of [-w * 0.25, w * 0.25]) {
    cylinder(stoneMullions, toWorld(cx, podiumH * 0.5 + 2.0, -d * 0.5 - 1.0), 0.4, 4.0, 12);
  }

  // Internal structural core
  box(heritageStone, toWorld(0, podiumH + shaftH * 0.5, 0), [w - 4.0, shaftH, d - 4.0], S.ry);

  // --- 2. Upper floors (heritage facade) -------------------------------------------------
  const floorsCount = S.levels - 1;
  const floorH = shaftH / Math.max(floorsCount, 1);
  const spandrelH = 0.9;
  const glassH = floorH - spandrelH;

  const seed = 142; // French Mission Building unique night-light seed

  for (let f = 0; f < floorsCount; f++) {
    const baseY = podiumH + f * floorH;
    const spandrelY = baseY + spandrelH * 0.5;
    const visionY = baseY + spandrelH + glassH * 0.5;

    box(heritageStone, toWorld(0, spandrelY, -d * 0.5 + 0.6), [w - 1.2, spandrelH, 0.18], S.ry);
    box(heritageStone, toWorld(0, spandrelY, d * 0.5 - 0.6), [w - 1.2, spandrelH, 0.18], S.ry);
    box(heritageStone, toWorld(-w * 0.5 + 0.6, spandrelY, 0), [0.18, spandrelH, d - 1.2], S.ry);
    box(heritageStone, toWorld(w * 0.5 - 0.6, spandrelY, 0), [0.18, spandrelH, d - 1.2], S.ry);

    box(stoneMullions, toWorld(0, spandrelY + spandrelH * 0.45, -d * 0.5 + 0.45), [w - 0.8, 0.05, 0.3], S.ry);
    box(stoneMullions, toWorld(0, spandrelY + spandrelH * 0.45, d * 0.5 - 0.45), [w - 0.8, 0.05, 0.3], S.ry);

    const spanX = w - 1.2;
    const numBaysX = Math.max(1, Math.round(spanX / 2.2));
    const actualBayX = spanX / numBaysX;
    for (let bx = 0; bx < numBaysX; bx++) {
      const lx = -spanX * 0.5 + (bx + 0.5) * actualBayX;
      const isLitN = hash(f, bx, 1, seed) < 0.28;
      const isLitS = hash(f, bx, 2, seed) < 0.28;
      box(isLitN ? litGlassUpper : heritageGlassUpper, toWorld(lx, visionY, -d * 0.5 + 0.6), [actualBayX - 0.04, glassH, 0.12], S.ry);
      box(isLitS ? litGlassUpper : heritageGlassUpper, toWorld(lx, visionY, d * 0.5 - 0.6), [actualBayX - 0.04, glassH, 0.12], S.ry);
    }

    const spanZ = d - 1.2;
    const numBaysZ = Math.max(1, Math.round(spanZ / 2.2));
    const actualBayZ = spanZ / numBaysZ;
    for (let bz = 0; bz < numBaysZ; bz++) {
      const lz = -spanZ * 0.5 + (bz + 0.5) * actualBayZ;
      const isLitW = hash(f, bz, 3, seed) < 0.28;
      const isLitE = hash(f, bz, 4, seed) < 0.28;
      box(isLitW ? litGlassUpper : heritageGlassUpper, toWorld(-w * 0.5 + 0.6, visionY, lz), [0.12, glassH, actualBayZ - 0.04], S.ry);
      box(isLitE ? litGlassUpper : heritageGlassUpper, toWorld(w * 0.5 - 0.6, visionY, lz), [0.12, glassH, actualBayZ - 0.04], S.ry);
    }
  }

  // --- 3. Roof & Chimneys ------------------------------------------------------------
  const roofY = shaftTop;
  const rw = w - 2.0;
  const rd = d - 2.0;

  box(heritageStone, toWorld(0, roofY + 1.5, 0), [rw, 3.0, rd], S.ry);
  box(roofParts, toWorld(0, roofY + 3.0, 0), [rw + 1.0, 0.5, rd + 1.0], S.ry);

  // Corner chimneys (heritage detail)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cylinder(chimneyParts, toWorld(sx * (rw * 0.5 - 0.8), roofY + 4.5, sz * (rd * 0.5 - 0.8)), 0.5, 1.5, 12);
    }
  }

  // Rooftop aviation obstacle beacons (heritage detail)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      box(beaconParts, toWorld(sx * (rw * 0.5 - 0.6), roofY + 5.2, sz * (rd * 0.5 - 0.6)), [0.35, 0.35, 0.35], S.ry);
    }
  }

  // --- 4. Materials Palette (heritage stone) -----------------------------------------
  const heritageStoneMat = new THREE.MeshStandardMaterial({
    color: 0xd4cbbd, // Warm heritage stone
    roughness: 0.85,
    metalness: 0.05
  });

  const heritageGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x2a2f34,
    roughness: 0.18,
    metalness: 0.45,
    side: THREE.DoubleSide
  });

  const litGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x2a2f34,
    roughness: 0.25,
    metalness: 0.35,
    side: THREE.DoubleSide
  });
  litGlassMat.emissiveNode = color(0xfff0d9).mul(nightAmount().mul(0.85).add(0.15));

  const stoneMullionMat = new THREE.MeshStandardMaterial({
    color: 0xc7b9ab,
    roughness: 0.78,
    metalness: 0.10
  });

  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x5a554e, // Terracotta roof tiles
    roughness: 0.90,
    metalness: 0.05
  });

  const chimneyMat = new THREE.MeshStandardMaterial({
    color: 0xc7b9ab,
    roughness: 0.80,
    metalness: 0.10
  });

  const beaconMat = new THREE.MeshStandardNodeMaterial({
    color: 0xff1122,
    roughness: 0.18,
    metalness: 0.1
  });
  beaconMat.emissiveNode = color(0xff2233).mul(nightAmount().mul(1.5).add(0.2));

  // --- 5. Merge Meshes --------------------------------------------------------------------
  merged(root, heritageStone, heritageStoneMat, 'French Mission Building heritage stone structure');
  merged(root, heritageGlassGround, heritageGlassMat, 'French Mission Building ground-floor heritage glazing');
  merged(root, heritageGlassUpper, heritageGlassMat, 'French Mission Building upper-floor heritage glazing');
  merged(root, litGlassUpper, litGlassMat, 'French Mission Building illuminated heritage glazing');
  merged(root, stoneMullions, stoneMullionMat, 'French Mission Building stone mullions');
  merged(root, roofParts, roofMat, 'French Mission Building terracotta roof');
  merged(root, chimneyParts, chimneyMat, 'French Mission Building corner chimneys', false);
  merged(root, beaconParts, beaconMat, 'French Mission Building rooftop aviation obstacle beacons', false);

  // --- 6. Colliders -----------------------------------------------------------------------
  const colliders = [];

  // --- 7. Landmark Metadata ---------------------------------------------------------------
  const landmark = {
    id: 'frenchMissionBuilding',
    name: '法國外方傳道會大樓',
    englishName: 'French Mission Building',
    x: S.x,
    z: S.z,
    w: S.w,
    d: S.d,
    h: S.height ?? 22.0,
    ring: S.ring,
    bounds: S.bounds,
    osmId: S.osmId,
    kind: 'landmark',
    labelHeight: (S.height ?? 22.0) + 4.0
  };

  return {
    group: root,
    colliders,
    landmarks: [landmark],
    base: groundY,
    stats: {
      frenchMissionBuildingOsm: S.osmId,
      frenchMissionBuildingHeight: S.height ?? 22.0,
      frenchMissionBuildingLevels: S.levels,
      frenchMissionBuildingPanes: heritageGlassGround.length + heritageGlassUpper.length + litGlassUpper.length
    }
  };
}
