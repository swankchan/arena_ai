import * as THREE from 'three/webgpu';
import { color, dot, float, fract, mix, sin, smoothstep, step, texture, uv, vec2 } from 'three/tsl';
import { cityUniforms, facadeCell, filteredPulse, createFacadeBoxes } from '../../tsl-materials.js';
import { drawStandardCharteredDevice } from './standard-chartered-logo.js';
import {
  SCB_SITE, SCB_BUILDING_HEADING, SCB_MODEL_ORIGIN, SCB_HEIGHT,
  SCB_BASE_Y, SCB_ENTRANCE_BASE_Y, SCB_PODIUM_HEIGHT, SCB_FLOOR_HEIGHT,
  SCB_WIDTH, SCB_TIERS, SCB_FRONT_Z, SCB_FRONT_PIER_WIDTH,
  SCB_FRONT_GLASS_WIDTH, SCB_FRONT_PIER_X, SCB_FRONT_GLASS_X,
  SCB_OCTAGON_Y, SCB_ENTRANCE_HEIGHT, SCB_ENTRANCE_DOOR_WIDTH, SCB_SIGN_FIN,
  SCB_STAIR_COUNT, SCB_STAIR_RUN, SCB_STAIR_TREAD, SCB_STAIR_RISE,
  SCB_STAIR_RAIL_SIDES, SCB_STAIR_PARAPET_HEIGHT, SCB_STAIR_PARAPET_THICKNESS,
  SCB_STAIR_HANDRAIL_HEIGHT, SCB_STAIR_HANDRAIL_OFFSET, SCB_STAIR_TOP_LANDING_DEPTH,
  scbStairEdgesAt, scbStairRoadToLocal, scbLocalCollider
} from './standard-chartered-architecture.js';

// Clean-sheet Three.js reconstruction. The pure module retains the agreed OSM site, 35-degree frame and
// exact walking surface; the tower, facades, portals, roof terraces and stair meshes are rebuilt here.

function nightAmount() {
  return smoothstep(0.7, 1.45, cityUniforms.uInteriorGlow);
}

function randomPanel(id, seed = 0) {
  return fract(sin(dot(id, vec2(127.1, 311.7)).add(5.91 + seed)).mul(43758.5453));
}

function createScbStoneFacadeMaterial() {
  const material = new THREE.MeshStandardNodeMaterial({ roughness: 0.68, metalness: 0.07, envMapIntensity: 0.22 });
  const { cellId, cellUV, fw, isRoof, coping } = facadeCell(2.4, 2.85, true);
  const variation = randomPanel(cellId, 1.7);
  const stone = mix(color(0xaa9b93), color(0xc3b2a7), variation);
  const panel = filteredPulse(cellUV.x, 0.014, 0.986, fw.x)
    .mul(filteredPulse(cellUV.y, 0.016, 0.984, fw.y));
  const jointed = mix(color(0x7d736e), stone, panel);
  material.colorNode = mix(mix(jointed, color(0xcec0b4), coping.mul(0.26)), color(0x8c827b), isRoof);
  return material;
}

function createScbRibbonFacadeMaterial() {
  const material = new THREE.MeshStandardNodeMaterial({ roughness: 0.57, metalness: 0.17, envMapIntensity: 0.3 });
  const { cellId, cellUV, fw, isRoof, partial, coping } = facadeCell(4.6, SCB_FLOOR_HEIGHT, true);
  const a = randomPanel(cellId, 4.2), b = randomPanel(cellId, 8.9);
  const panel = filteredPulse(cellUV.x, 0.009, 0.991, fw.x)
    .mul(filteredPulse(cellUV.y, 0.014, 0.986, fw.y));
  const stone = mix(color(0x82766f), mix(color(0xab9c93), color(0xc3b1a5), a), panel);
  const ribbon = filteredPulse(cellUV.x, 0.055, 0.945, fw.x)
    .mul(filteredPulse(cellUV.y, 0.28, 0.66, fw.y));
  const mullion = filteredPulse(fract(cellUV.x.mul(5)), 0.025, 0.975, fw.x.mul(5));
  const windows = ribbon.mul(mullion).mul(float(1).sub(isRoof)).mul(float(1).sub(partial)).mul(float(1).sub(coping));
  const glass = mix(color(0x303b3d), color(0x92766a), b.mul(0.55)).mul(mix(float(0.86), float(1.12), a));
  material.colorNode = mix(mix(stone, color(0x8c8179), isRoof), glass, windows);
  material.roughnessNode = mix(float(0.67), float(0.26), windows);
  const office = mix(color(0xffd3a0), color(0xd8e1dc), step(0.57, b));
  material.emissiveNode = office.mul(step(0.89, a)).mul(windows).mul(nightAmount()).mul(0.65);
  return material;
}

function createScbFrontGlassMaterial() {
  const material = new THREE.MeshStandardNodeMaterial({ roughness: 0.24, metalness: 0.43, envMapIntensity: 0.46 });
  const { cellId, cellUV, fw, isRoof, partial, coping } = facadeCell(2.75, SCB_FLOOR_HEIGHT, true);
  const a = randomPanel(cellId, 2.8), b = randomPanel(cellId, 9.1);
  const pane = filteredPulse(cellUV.x, 0.035, 0.965, fw.x)
    .mul(filteredPulse(cellUV.y, 0.08, 0.94, fw.y))
    .mul(float(1).sub(isRoof)).mul(float(1).sub(partial)).mul(float(1).sub(coping));
  const glass = mix(color(0x967264), color(0xc69a84), b.mul(0.32)).mul(mix(float(0.96), float(1.04), a));
  material.colorNode = mix(color(0xb3a08e), glass, pane);
  material.roughnessNode = mix(float(0.43), float(0.22), pane);
  const office = mix(color(0xffd6a5), color(0xe0e7dd), step(0.62, b));
  material.emissiveNode = office.mul(step(0.89, a)).mul(pane).mul(nightAmount()).mul(0.76);
  return material;
}

function addFacadeBoxes(group, material, boxes, name) {
  if (!boxes.length) return null;
  const mesh = createFacadeBoxes(material, boxes);
  mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
  group.add(mesh); return mesh;
}

function addInstances(group, geometry, material, transforms, name, options = {}) {
  if (!transforms.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const dummy = new THREE.Object3D();
  transforms.forEach((item, index) => {
    dummy.position.set(item.x, item.y, item.z);
    dummy.scale.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1);
    if (item.quaternion) dummy.quaternion.copy(item.quaternion);
    else dummy.rotation.set(0, item.heading || 0, 0);
    dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true; mesh.name = name;
  mesh.castShadow = options.castShadow ?? true; mesh.receiveShadow = options.receiveShadow ?? true;
  mesh.frustumCulled = false; group.add(mesh); return mesh;
}

function box(list, x, y, z, sx, sy, sz, heading = 0) {
  list.push({ x, y, z, sx, sy, sz, heading });
}

function cylinderBetween(group, a, b, radius, material, name) {
  const direction = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 10), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh;
}

function octagon(path, radius, reverse = false) {
  for (let n = 0; n < 8; n++) {
    const index = reverse ? 7 - n : n, angle = Math.PI / 8 + index * Math.PI / 4;
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
    if (!n) path.moveTo(x, y); else path.lineTo(x, y);
  }
  path.closePath(); return path;
}

function createOctagonGlazingGeometry() {
  return new THREE.ShapeGeometry(octagon(new THREE.Shape(), 1.47));
}

function createOctagonFrameGeometry() {
  const shape = octagon(new THREE.Shape(), 1.68);
  shape.holes.push(octagon(new THREE.Path(), 1.47, true));
  return new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false, curveSegments: 1 });
}

function createScbLogoTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 552;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 384, 552);
  drawStandardCharteredDevice(ctx, 24, 20, 336, 512);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  return map;
}

function createScbEntranceSignTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  // champagne plaque with dark blue lettering and the original blue / green ribbon device.
  ctx.fillStyle = '#c9c1aa'; ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = '#918363'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, 1014, 246);
  drawStandardCharteredDevice(ctx, 22, 22, 130, 212);
  ctx.fillStyle = '#15568b'; ctx.textBaseline = 'middle';
  ctx.font = '600 65px Arial, Helvetica, sans-serif'; ctx.fillText('Standard Chartered', 176, 100);
  ctx.font = '600 54px "Noto Sans TC", "Microsoft JhengHei", sans-serif'; ctx.fillText('渣打銀行', 178, 181);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  return map;
}

function texturedSignMaterial(map, glow = 0.25) {
  const material = new THREE.MeshStandardNodeMaterial({
    map, transparent: true, alphaTest: 0.025, depthWrite: false,
    side: THREE.DoubleSide, roughness: 0.45, metalness: 0.08
  });
  material.emissiveNode = texture(map, uv()).mul(nightAmount().mul(glow));
  return material;
}

function createScbParapetMaterial() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#b7afa5'; ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 32) {
      const tone = 166 + ((x * 5 + y * 3) % 25);
      ctx.fillStyle = `rgba(${tone},${tone - 6},${tone - 11},0.13)`; ctx.fillRect(x, y, 32, 32);
    }
  }
  ctx.strokeStyle = 'rgba(105,96,90,0.76)'; ctx.lineWidth = 3;
  for (const p of [0, 128, 256]) { ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 256); ctx.stroke(); }
  for (const p of [0, 256]) { ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(256, p); ctx.stroke(); }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.82, metalness: 0.02 });
}

const PRISM_TRIANGLES = [
  4, 6, 5, 5, 6, 7, 0, 1, 2, 1, 3, 2,
  0, 4, 1, 1, 4, 5, 2, 3, 6, 3, 7, 6,
  0, 2, 4, 2, 6, 4, 1, 5, 3, 3, 5, 7
];

function appendPrism(positions, corners, texcoords = null, uvForPoint = null) {
  for (const index of PRISM_TRIANGLES) {
    const point = corners[index]; positions.push(point.x, point.y, point.z);
    if (texcoords) { const coord = uvForPoint(point); texcoords.push(coord[0], coord[1]); }
  }
}

function finishPrism(positions, texcoords = null) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (texcoords) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(texcoords, 2));
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

export function buildStandardCharteredBankBuilding(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group();
  group.name = 'StandardCharteredBankBuilding';
  group.position.set(SCB_MODEL_ORIGIN.x, groundOffset, SCB_MODEL_ORIGIN.z);
  group.rotation.y = SCB_BUILDING_HEADING;
  group.userData.landmark = 'standard-chartered-bank-building';
  group.userData.osm = { type: SCB_SITE.osmType, id: SCB_SITE.osmId };

  const stone = createScbStoneFacadeMaterial(), ribbon = createScbRibbonFacadeMaterial(), roseGlass = createScbFrontGlassMaterial();
  const cutStone = new THREE.MeshStandardMaterial({ color: 0xb8a89e, roughness: 0.65, metalness: 0.06 });
  const paleStone = new THREE.MeshStandardMaterial({ color: 0xc0b0a4, roughness: 0.69, metalness: 0.05 });
  const reveal = new THREE.MeshStandardMaterial({ color: 0x625c58, roughness: 0.4, metalness: 0.34 });
  const champagne = new THREE.MeshStandardMaterial({ color: 0xbcaa78, roughness: 0.34, metalness: 0.58 });
  const darkGlass = new THREE.MeshStandardNodeMaterial({ color: 0x273234, roughness: 0.26, metalness: 0.39, side: THREE.DoubleSide });
  darkGlass.emissiveNode = color(0xffd6a0).mul(nightAmount().mul(0.05));
  const entranceGlass = new THREE.MeshStandardNodeMaterial({ color: 0x293231, roughness: 0.24, metalness: 0.4 });
  entranceGlass.emissiveNode = color(0xffd5a0).mul(nightAmount().mul(0.11));
  const octagonMetal = new THREE.MeshStandardMaterial({ color: 0x807b72, roughness: 0.4, metalness: 0.46 });
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const batches = {
    floorNosings: [], terraceParapets: [], reveals: [], transoms: [], mullions: [], sideRibs: [],
    goldFrames: [], entranceGlass: [], entranceMullions: [], entrancePulls: [], thresholds: [], signSupports: []
  };

  const tiers = SCB_TIERS.map((tier) => ({
    x: 0, y: (SCB_BASE_Y + tier.roofY) / 2, z: tier.z,
    w: SCB_WIDTH, h: tier.roofY - SCB_BASE_Y, d: tier.depth, tone: 0.56
  }));
  addFacadeBoxes(group, ribbon, tiers, 'SCBSteppedTowerTiers');

  for (const tier of SCB_TIERS) {
    const height = tier.roofY - SCB_BASE_Y, centreY = SCB_BASE_Y + height / 2;
    for (let y = SCB_BASE_Y + SCB_FLOOR_HEIGHT; y < tier.roofY - 0.25; y += SCB_FLOOR_HEIGHT) {
      for (const side of [-1, 1]) box(batches.floorNosings, side * (SCB_WIDTH / 2 + 0.07), y, tier.z, 0.18, 0.13, tier.depth + 0.12);
    }
    for (const side of [-1, 1]) {
      for (const z of [tier.z - tier.depth / 2 + 0.16, tier.z, tier.z + tier.depth / 2 - 0.16]) {
        box(batches.sideRibs, side * (SCB_WIDTH / 2 + 0.075), centreY, z, 0.15, height, 0.16);
      }
      // Open terrace walls start on the roof surface and remain hollow inside each stepped slab.
      box(batches.terraceParapets, side * (SCB_WIDTH / 2 - 0.11), tier.roofY + 0.675, tier.z, 0.22, 1.35, tier.depth);
      box(batches.terraceParapets, 0, tier.roofY + 0.675, tier.z + side * (tier.depth / 2 - 0.11), SCB_WIDTH, 1.35, 0.22);
    }
  }

  const frontRoofY = SCB_TIERS[0].roofY;
  const frontPiers = SCB_FRONT_PIER_X.map((x) => ({
    x, y: (SCB_BASE_Y + frontRoofY) / 2, z: SCB_FRONT_Z - 0.18,
    w: SCB_FRONT_PIER_WIDTH, h: frontRoofY - SCB_BASE_Y, d: 0.36, tone: 0.62
  }));
  addFacadeBoxes(group, stone, frontPiers, 'SCBFrontStonePiers');
  const podiumInfills = SCB_FRONT_GLASS_X.map((x) => ({
    x, y: (SCB_BASE_Y + SCB_PODIUM_HEIGHT) / 2, z: SCB_FRONT_Z - 0.09,
    w: SCB_FRONT_GLASS_WIDTH, h: SCB_PODIUM_HEIGHT - SCB_BASE_Y, d: 0.18, tone: 0.54
  }));
  addFacadeBoxes(group, stone, podiumInfills, 'SCBPodiumStoneInfills');
  const frontChannels = SCB_FRONT_GLASS_X.map((x) => ({
    x, y: (SCB_PODIUM_HEIGHT + frontRoofY) / 2, z: SCB_FRONT_Z - 0.07,
    w: SCB_FRONT_GLASS_WIDTH, h: frontRoofY - SCB_PODIUM_HEIGHT, d: 0.14, tone: 0.72
  }));
  addFacadeBoxes(group, roseGlass, frontChannels, 'SCBFrontRoseGlassChannels');

  function dressGlassChannel(x, lowerY, upperY, boundaryZ, side) {
    const height = upperY - lowerY;
    if (height <= 0) return;
    for (const edge of [-1, 1]) {
      box(batches.reveals, x + edge * (SCB_FRONT_GLASS_WIDTH / 2 + 0.055), (lowerY + upperY) / 2,
        boundaryZ + side * 0.25, 0.11, height, 0.36);
    }
    box(batches.mullions, x, (lowerY + upperY) / 2, boundaryZ + side * 0.16, 0.1, height, 0.11);
    for (let y = lowerY + SCB_FLOOR_HEIGHT; y < upperY - 0.2; y += SCB_FLOOR_HEIGHT) {
      box(batches.transoms, x, y, boundaryZ + side * 0.16, SCB_FRONT_GLASS_WIDTH, 0.1, 0.11);
    }
  }
  for (const x of SCB_FRONT_GLASS_X) dressGlassChannel(x, SCB_PODIUM_HEIGHT, frontRoofY, SCB_FRONT_Z, -1);

  const stepPiers = [], stepGlass = [];
  function addSandwichStepFace(tier, neighbor, side) {
    const lowerY = neighbor.roofY, boundaryZ = tier.z + side * tier.depth / 2;
    for (const x of SCB_FRONT_PIER_X) stepPiers.push({
      x, y: (lowerY + tier.roofY) / 2, z: boundaryZ + side * 0.18,
      w: SCB_FRONT_PIER_WIDTH, h: tier.roofY - lowerY, d: 0.36, tone: 0.62
    });
    for (const x of SCB_FRONT_GLASS_X) {
      stepGlass.push({
        x, y: (lowerY + tier.roofY) / 2, z: boundaryZ + side * 0.07,
        w: SCB_FRONT_GLASS_WIDTH, h: tier.roofY - lowerY, d: 0.14, tone: 0.72
      });
      dressGlassChannel(x, lowerY, tier.roofY, boundaryZ, side);
    }
    for (let y = lowerY + SCB_FLOOR_HEIGHT; y < tier.roofY - 0.2; y += SCB_FLOOR_HEIGHT) {
      box(batches.floorNosings, 0, y, boundaryZ + side * 0.21, SCB_WIDTH, 0.11, 0.14);
    }
  }
  for (let i = 1; i <= 3; i++) addSandwichStepFace(SCB_TIERS[i], SCB_TIERS[i - 1], -1);
  for (let i = 3; i <= 5; i++) addSandwichStepFace(SCB_TIERS[i], SCB_TIERS[i + 1], 1);
  addFacadeBoxes(group, stone, stepPiers, 'SCBSandwichStepStonePiers');
  addFacadeBoxes(group, roseGlass, stepGlass, 'SCBSandwichStepRoseGlassChannels');

  const copings = SCB_TIERS.map((tier) => ({
    x: 0, y: tier.roofY + 0.18, z: tier.z,
    w: SCB_WIDTH + 0.34, h: 0.36, d: tier.depth + 0.34, tone: 0.6
  }));
  copings.push({
    x: SCB_SIGN_FIN.x, y: SCB_HEIGHT - 0.2, z: SCB_SIGN_FIN.z,
    w: SCB_SIGN_FIN.w + 0.25, h: 0.4, d: SCB_SIGN_FIN.d + 0.25, tone: 0.6
  });
  addFacadeBoxes(group, stone, copings, 'SCBSteppedRoofCopings');
  addFacadeBoxes(group, stone, [{
    x: SCB_SIGN_FIN.x, y: (SCB_SIGN_FIN.baseY + SCB_HEIGHT - 0.4) / 2, z: SCB_SIGN_FIN.z,
    w: SCB_SIGN_FIN.w, h: SCB_HEIGHT - 0.4 - SCB_SIGN_FIN.baseY, d: SCB_SIGN_FIN.d, tone: 0.57
  }], 'SCBCrownSignFin');
  for (const x of [-SCB_SIGN_FIN.w / 2 + 0.6, SCB_SIGN_FIN.w / 2 - 0.6]) {
    box(batches.signSupports, x, SCB_SIGN_FIN.baseY + 1.2, SCB_SIGN_FIN.z, 0.3, 2.4, SCB_SIGN_FIN.d + 0.5);
  }

  const crownY = (SCB_SIGN_FIN.baseY + SCB_HEIGHT) / 2;
  const crownLogo = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 11), texturedSignMaterial(createScbLogoTexture(), 0.36));
  crownLogo.name = 'SCBCrownLogo'; crownLogo.position.set(0, crownY, SCB_SIGN_FIN.z - SCB_SIGN_FIN.d / 2 - 0.035);
  crownLogo.rotation.y = Math.PI; group.add(crownLogo);
  const westCrownLogo = new THREE.Mesh(new THREE.PlaneGeometry(4.55, 6.58), texturedSignMaterial(createScbLogoTexture(), 0.36));
  westCrownLogo.name = 'SCBCrownLogoWest'; westCrownLogo.position.set(-SCB_SIGN_FIN.w / 2 - 0.035, crownY, SCB_SIGN_FIN.z);
  westCrownLogo.rotation.y = -Math.PI / 2; group.add(westCrownLogo);

  const octagonSites = SCB_FRONT_PIER_X.map((x) => ({ x, y: SCB_OCTAGON_Y, z: SCB_FRONT_Z - 0.6, sx: 1.08, sy: 0.78 }));
  addInstances(group, createOctagonGlazingGeometry(), darkGlass, octagonSites, 'SCBOctagonalWindowGlazing', { castShadow: false });
  addInstances(group, createOctagonFrameGeometry(), octagonMetal,
    SCB_FRONT_PIER_X.map((x) => ({ x, y: SCB_OCTAGON_Y, z: SCB_FRONT_Z - 0.74, sx: 1.08, sy: 0.78 })),
    'SCBOctagonalWindowFrames');
  const louvres = [], louvreWidths = [2.08, 2.55, 2.78, 2.88, 2.78, 2.55, 2.08];
  for (const x of SCB_FRONT_PIER_X) {
    for (let i = 0; i < 7; i++) box(louvres, x, SCB_OCTAGON_Y + (i - 3) * 0.275, SCB_FRONT_Z - 0.77, louvreWidths[i] * 1.08, 0.055, 0.075);
    for (const dx of [-0.48, 0.48]) box(louvres, x + dx, SCB_OCTAGON_Y, SCB_FRONT_Z - 0.775, 0.055, 1.88, 0.07);
  }
  addInstances(group, unitBox, octagonMetal, louvres, 'SCBOctagonalWindowLouvres');

  // Three portals are built as actual jamb / head / threshold frames around glass, not gold slabs with a decal.
  for (const x of SCB_FRONT_PIER_X) {
    const centreY = SCB_ENTRANCE_BASE_Y + SCB_ENTRANCE_HEIGHT / 2;
    for (const side of [-1, 1]) box(batches.goldFrames, x + side * SCB_ENTRANCE_DOOR_WIDTH / 2,
      centreY, SCB_FRONT_Z - 0.39, 0.18, SCB_ENTRANCE_HEIGHT, 0.18);
    for (const y of [SCB_ENTRANCE_BASE_Y, SCB_ENTRANCE_BASE_Y + SCB_ENTRANCE_HEIGHT]) {
      box(batches.goldFrames, x, y, SCB_FRONT_Z - 0.39, SCB_ENTRANCE_DOOR_WIDTH, 0.18, 0.18);
    }
    box(batches.entranceGlass, x, centreY, SCB_FRONT_Z - 0.46, 3.82, SCB_ENTRANCE_HEIGHT - 0.7, 0.07);
    box(batches.entranceMullions, x, centreY, SCB_FRONT_Z - 0.51, 0.095, SCB_ENTRANCE_HEIGHT - 0.65, 0.055);
    for (const offset of [3.38, 7.38, 10.58]) box(batches.entranceMullions, x, SCB_ENTRANCE_BASE_Y + offset,
      SCB_FRONT_Z - 0.51, 3.84, 0.095, 0.055);
    for (const dx of [-0.3, 0.3]) batches.entrancePulls.push({ x: x + dx, y: SCB_ENTRANCE_BASE_Y + 1.35, z: SCB_FRONT_Z - 0.59, sx: 0.12, sy: 0.12 });
    box(batches.thresholds, x, SCB_ENTRANCE_BASE_Y + 0.04, SCB_FRONT_Z - 0.65, SCB_ENTRANCE_DOOR_WIDTH + 0.3, 0.08, 1.1);
  }
  addInstances(group, unitBox, champagne, batches.goldFrames, 'SCBGoldEntranceSurrounds');
  addInstances(group, unitBox, entranceGlass, batches.entranceGlass, 'SCBTallEntranceGlazing');
  addInstances(group, unitBox, champagne, batches.entranceMullions, 'SCBGoldEntranceMullions');
  addInstances(group, createOctagonFrameGeometry(), champagne, batches.entrancePulls, 'SCBOctagonalEntrancePulls');
  addInstances(group, unitBox, paleStone, batches.thresholds, 'SCBEntranceStoneThresholds');
  addInstances(group, unitBox, cutStone, batches.floorNosings, 'SCBGraniteFloorNosings');
  addInstances(group, unitBox, cutStone, batches.terraceParapets, 'SCBOpenSteppedTerraceParapets');
  addInstances(group, unitBox, reveal, batches.reveals, 'SCBRecessedRoseGlassChannelReveals');
  addInstances(group, unitBox, champagne, batches.transoms, 'SCBRoseGlassFloorTransoms');
  addInstances(group, unitBox, champagne, batches.mullions, 'SCBRoseGlassVerticalMullions');
  addInstances(group, unitBox, paleStone, batches.sideRibs, 'SCBSideElevationStoneRibs');
  addInstances(group, unitBox, cutStone, batches.signSupports, 'SCBCrownSignSupports');

  const entranceSign = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 0.825), texturedSignMaterial(createScbEntranceSignTexture(), 0.3));
  entranceSign.name = 'SCBEntranceSign'; entranceSign.position.set(0, SCB_ENTRANCE_BASE_Y + 4.43, SCB_FRONT_Z - 0.55);
  entranceSign.rotation.y = Math.PI; group.add(entranceSign);

  const stairPoint = (u, v, y = 0) => ({ ...scbStairRoadToLocal(u, v), y });
  const stairVector = (u, v, y) => {
    const point = stairPoint(u, v, y); return new THREE.Vector3(point.x, point.y, point.z);
  };
  const edgeU = (side, t) => {
    const edges = scbStairEdgesAt(t); return side === 1 ? edges.left : edges.right;
  };
  function treadCorners(nearV, farV, near, far, top) {
    return [
      stairPoint(near.right, nearV, 0), stairPoint(near.left, nearV, 0),
      stairPoint(far.right, farV, 0), stairPoint(far.left, farV, 0),
      stairPoint(near.right, nearV, top), stairPoint(near.left, nearV, top),
      stairPoint(far.right, farV, top), stairPoint(far.left, farV, top)
    ];
  }
  const stairPositions = [];
  for (let i = 0; i < SCB_STAIR_COUNT; i++) appendPrism(stairPositions, treadCorners(
    i * SCB_STAIR_TREAD, (i + 1) * SCB_STAIR_TREAD,
    scbStairEdgesAt(i / SCB_STAIR_COUNT), scbStairEdgesAt((i + 1) / SCB_STAIR_COUNT), (i + 1) * SCB_STAIR_RISE
  ));
  const stairMaterial = new THREE.MeshStandardMaterial({ color: 0xb7afa5, roughness: 0.82, metalness: 0.02 });
  const stairs = new THREE.Mesh(finishPrism(stairPositions), stairMaterial);
  stairs.name = 'SCBDesVoeuxRoadEntranceSteps'; stairs.castShadow = stairs.receiveShadow = true;
  stairs.userData.stepCount = SCB_STAIR_COUNT; group.add(stairs);

  const landingPositions = [], landingFarV = SCB_STAIR_RUN + SCB_STAIR_TOP_LANDING_DEPTH;
  appendPrism(landingPositions, treadCorners(
    SCB_STAIR_RUN, landingFarV, scbStairEdgesAt(1), scbStairEdgesAt(landingFarV / SCB_STAIR_RUN), SCB_ENTRANCE_BASE_Y
  ));
  const landing = new THREE.Mesh(finishPrism(landingPositions), stairMaterial);
  landing.name = 'SCBEntranceRaisedLandings'; landing.castShadow = landing.receiveShadow = true;
  landing.userData.landingCount = 1; group.add(landing);

  const parapets = [], parapetMaterial = createScbParapetMaterial();
  for (const side of SCB_STAIR_RAIL_SIDES) {
    const nearInner = edgeU(side, 0) + side * 0.012, farInner = edgeU(side, 1) + side * 0.012;
    const nearOuter = nearInner + side * SCB_STAIR_PARAPET_THICKNESS, farOuter = farInner + side * SCB_STAIR_PARAPET_THICKNESS;
    const near = [Math.min(nearInner, nearOuter), Math.max(nearInner, nearOuter)];
    const far = [Math.min(farInner, farOuter), Math.max(farInner, farOuter)];
    const roadCorners = [
      { u: near[0], v: 0, y: 0 }, { u: near[1], v: 0, y: 0 },
      { u: far[0], v: SCB_STAIR_RUN, y: SCB_ENTRANCE_BASE_Y }, { u: far[1], v: SCB_STAIR_RUN, y: SCB_ENTRANCE_BASE_Y },
      { u: near[0], v: 0, y: SCB_STAIR_PARAPET_HEIGHT }, { u: near[1], v: 0, y: SCB_STAIR_PARAPET_HEIGHT },
      { u: far[0], v: SCB_STAIR_RUN, y: SCB_ENTRANCE_BASE_Y + SCB_STAIR_PARAPET_HEIGHT },
      { u: far[1], v: SCB_STAIR_RUN, y: SCB_ENTRANCE_BASE_Y + SCB_STAIR_PARAPET_HEIGHT }
    ];
    const positions = [], texcoords = [];
    appendPrism(positions, roadCorners.map((point) => ({ ...stairPoint(point.u, point.v, point.y), road: point })), texcoords,
      (point) => [point.road.v / 1.8, (point.road.y + point.road.u * 0.08) / 0.9]);
    const parapet = new THREE.Mesh(finishPrism(positions, texcoords), parapetMaterial);
    parapet.name = 'SCBEntranceStairStoneParapet'; parapet.castShadow = parapet.receiveShadow = true;
    group.add(parapet); parapets.push(parapet);
  }

  for (const side of SCB_STAIR_RAIL_SIDES) {
    const railU = (t) => edgeU(side, t) - side * SCB_STAIR_HANDRAIL_OFFSET;
    cylinderBetween(group,
      stairVector(railU(0), 0, SCB_STAIR_HANDRAIL_HEIGHT),
      stairVector(railU(1), SCB_STAIR_RUN, SCB_ENTRANCE_BASE_Y + SCB_STAIR_HANDRAIL_HEIGHT),
      0.045, octagonMetal, 'SCBEntranceStairHandrail');
    for (let i = 0; i <= SCB_STAIR_COUNT; i += 4) {
      const t = i / SCB_STAIR_COUNT, v = i * SCB_STAIR_TREAD, y = i * SCB_STAIR_RISE + SCB_STAIR_HANDRAIL_HEIGHT;
      cylinderBetween(group,
        stairVector(edgeU(side, t) + side * 0.012, v, y), stairVector(railU(t), v, y),
        0.025, octagonMetal, 'SCBEntranceStairWallRailBracket');
    }
  }

  const colliders = SCB_TIERS.map((tier) => scbLocalCollider({
    x: 0, z: tier.z, w: SCB_WIDTH, d: tier.depth, minY: SCB_BASE_Y, maxY: tier.roofY + 1.35
  }));
  colliders.push(scbLocalCollider({
    x: SCB_SIGN_FIN.x, z: SCB_SIGN_FIN.z, w: SCB_SIGN_FIN.w, d: SCB_SIGN_FIN.d,
    minY: SCB_SIGN_FIN.baseY, maxY: SCB_HEIGHT
  }));
  for (let first = 0; first < SCB_STAIR_COUNT; first += 5) {
    const last = Math.min(SCB_STAIR_COUNT, first + 5);
    for (const side of SCB_STAIR_RAIL_SIDES) {
      const offset = side * (0.012 + SCB_STAIR_PARAPET_THICKNESS / 2);
      const a = stairPoint(edgeU(side, first / SCB_STAIR_COUNT) + offset, first * SCB_STAIR_TREAD);
      const b = stairPoint(edgeU(side, last / SCB_STAIR_COUNT) + offset, last * SCB_STAIR_TREAD);
      const dx = b.x - a.x, dz = b.z - a.z;
      colliders.push(scbLocalCollider({
        x: (a.x + b.x) / 2, z: (a.z + b.z) / 2,
        w: SCB_STAIR_PARAPET_THICKNESS, d: Math.hypot(dx, dz) + 0.02,
        minY: 0, maxY: last * SCB_STAIR_RISE + SCB_STAIR_PARAPET_HEIGHT, heading: Math.atan2(dx, dz)
      }));
    }
  }
  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }

  root.add(group);
  const landmark = {
    name: SCB_SITE.name, englishName: SCB_SITE.englishName,
    x: SCB_MODEL_ORIGIN.x, z: SCB_MODEL_ORIGIN.z, w: SCB_WIDTH, d: SCB_SITE.d, h: SCB_HEIGHT,
    bounds: { ...SCB_SITE.bounds }, ring: SCB_SITE.ring, osmId: SCB_SITE.osmId
  };
  const stats = {
    scbGroundOffset: groundOffset, scbHeight: SCB_HEIGHT, scbModelGeneration: 2,
    scbSteppedTiers: SCB_TIERS.length, scbSandwichStepFaces: stepGlass.length / SCB_FRONT_GLASS_X.length,
    scbFrontStonePiers: SCB_FRONT_PIER_X.length, scbFrontGlassChannels: SCB_FRONT_GLASS_X.length,
    scbFacadeFloorNosings: batches.floorNosings.length, scbOpenTerraceParapets: batches.terraceParapets.length,
    scbGlassTransoms: batches.transoms.length, scbGlassMullions: batches.mullions.length,
    scbSideStoneRibs: batches.sideRibs.length, scbPortalFrameParts: batches.goldFrames.length,
    scbOctagonalWindows: SCB_FRONT_PIER_X.length, scbOctagonalEntrancePulls: batches.entrancePulls.length,
    scbGoldEntrances: SCB_FRONT_PIER_X.length, scbEntranceSteps: SCB_STAIR_COUNT,
    scbEntranceStairRun: SCB_STAIR_RUN, scbEntranceStoneParapets: parapets.length,
    scbEntranceBaseY: SCB_ENTRANCE_BASE_Y, scbColliders: colliders.length
  };
  group.userData.stats = stats;
  return {
    group, colliders, landmarks: [landmark], stats, groundOffset,
    baseY: SCB_BASE_Y + groundOffset, entranceBaseY: SCB_ENTRANCE_BASE_Y + groundOffset
  };
}
