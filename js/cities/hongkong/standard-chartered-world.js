import * as THREE from 'three/webgpu';
import { color, dot, float, fract, mix, sin, smoothstep, step, texture, uv, vec2 } from 'three/tsl';
import { cityUniforms, facadeCell, filteredPulse, createFacadeBoxes } from '../../tsl-materials.js';
import { drawStandardCharteredDevice } from './standard-chartered-logo.js';
import {
  SCB_SITE,
  SCB_BUILDING_HEADING,
  SCB_MODEL_ORIGIN,
  SCB_HEIGHT,
  SCB_BASE_Y,
  SCB_ENTRANCE_BASE_Y,
  SCB_PODIUM_HEIGHT,
  SCB_FLOOR_HEIGHT,
  SCB_MAIN_ROOF_Y,
  SCB_WIDTH,
  SCB_TIERS,
  SCB_FRONT_Z,
  SCB_FRONT_PIER_WIDTH,
  SCB_FRONT_GLASS_WIDTH,
  SCB_FRONT_PIER_X,
  SCB_FRONT_GLASS_X,
  SCB_OCTAGON_Y,
  SCB_ENTRANCE_HEIGHT,
  SCB_ENTRANCE_DOOR_WIDTH,
  SCB_SIGN_FIN,
  SCB_STAIR_COUNT,
  SCB_STAIR_RUN,
  SCB_STAIR_TREAD,
  SCB_STAIR_RISE,
  SCB_STAIR_RAIL_SIDES,
  SCB_STAIR_PARAPET_HEIGHT,
  SCB_STAIR_PARAPET_THICKNESS,
  SCB_STAIR_TOP_LANDING_DEPTH,
  scbStairEdgesAt,
  scbStairRoadToLocal,
  scbLocalCollider
} from './standard-chartered-architecture.js';

function nightAmount() {
  return smoothstep(0.7, 1.45, cityUniforms.uInteriorGlow);
}

function panelRandom(cellId, seed = 0) {
  return fract(sin(dot(cellId, vec2(127.1, 311.7)).add(19.19 + seed)).mul(43758.5453));
}

// Polished pink-grey granite with real panel-scale joints. There are deliberately no apartment interiors or daytime
// emissive windows in this office-specific facade family.
function createScbStoneFacadeMaterial() {
  const material = new THREE.MeshStandardNodeMaterial({ metalness: 0.08, roughness: 0.69, envMapIntensity: 0.24 });
  const { cellId, cellUV, fw, isRoof, coping } = facadeCell(2.65, 2.9, true);
  const random = panelRandom(cellId, 2.1);
  const base = mix(color(0xafa097), color(0xc2b0a5), random);
  const panel = filteredPulse(cellUV.x, 0.012, 0.988, fw.x)
    .mul(filteredPulse(cellUV.y, 0.014, 0.986, fw.y));
  const jointed = mix(color(0x7f7470), base, panel);
  material.colorNode = mix(mix(jointed, color(0xd0c4b9), coping.mul(0.3)), color(0x8f857e), isRoof);
  return material;
}

// Side and rear elevations: long, dark horizontal ribbon windows divided by narrow mullions between granite floors.
function createScbRibbonFacadeMaterial() {
  const material = new THREE.MeshStandardNodeMaterial({ metalness: 0.18, roughness: 0.58, envMapIntensity: 0.32 });
  const { cellId, cellUV, fw, isRoof, partial, coping } = facadeCell(4.8, SCB_FLOOR_HEIGHT, true);
  const random = panelRandom(cellId, 4.7);
  const randomB = fract(random.mul(13.73).add(0.19));
  const stone = mix(color(0xaa9b92), color(0xc6b5aa), random);
  const panel = filteredPulse(cellUV.x, 0.008, 0.992, fw.x)
    .mul(filteredPulse(cellUV.y, 0.012, 0.988, fw.y));
  const stoneWithJoints = mix(color(0x827770), stone, panel);
  const band = filteredPulse(cellUV.x, 0.07, 0.93, fw.x)
    .mul(filteredPulse(cellUV.y, 0.29, 0.65, fw.y));
  const mullions = filteredPulse(fract(cellUV.x.mul(4)), 0.035, 0.965, fw.x.mul(4));
  const windowMask = band.mul(mullions)
    .mul(float(1).sub(isRoof)).mul(float(1).sub(partial)).mul(float(1).sub(coping));
  const reflected = mix(color(0x3d4545), color(0x9d8072), step(0.54, randomB).mul(0.62));
  const glass = reflected.mul(mix(float(0.84), float(1.12), random));
  material.colorNode = mix(mix(stoneWithJoints, color(0x90857d), isRoof), glass, windowMask);
  material.roughnessNode = mix(float(0.68), float(0.27), windowMask);
  const officeLight = mix(color(0xffd19d), color(0xd5e0dc), step(0.56, randomB));
  material.emissiveNode = officeLight.mul(step(0.88, random)).mul(windowMask).mul(nightAmount()).mul(0.72);
  return material;
}

// The two tall north-facing glazed channels have the warm rose / champagne reflection visible in the supplied photo.
function createScbFrontGlassMaterial() {
  const material = new THREE.MeshStandardNodeMaterial({ metalness: 0.42, roughness: 0.25, envMapIntensity: 0.48 });
  const { cellId, cellUV, fw, isRoof, partial, coping } = facadeCell(2.7, SCB_FLOOR_HEIGHT, true);
  const random = panelRandom(cellId, 8.3);
  const randomB = fract(random.mul(17.17).add(0.31));
  const paneMask = filteredPulse(cellUV.x, 0.045, 0.955, fw.x)
    .mul(filteredPulse(cellUV.y, 0.09, 0.93, fw.y))
    .mul(float(1).sub(isRoof)).mul(float(1).sub(partial)).mul(float(1).sub(coping));
  const darkRose = color(0x9b7668), paleRose = color(0xc69a84);
  const glass = mix(darkRose, paleRose, step(0.52, randomB).mul(0.28)).mul(mix(float(0.97), float(1.03), random));
  material.colorNode = mix(color(0xb29e8c), glass, paneMask);
  material.roughnessNode = mix(float(0.44), float(0.22), paneMask);
  const officeLight = mix(color(0xffd6a5), color(0xe0e7dd), step(0.62, randomB));
  material.emissiveNode = officeLight.mul(step(0.88, random)).mul(paneMask).mul(nightAmount()).mul(0.85);
  return material;
}

function addFacadeBoxes(group, material, boxes, name) {
  const mesh = createFacadeBoxes(material, boxes);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  group.add(mesh);
  return mesh;
}

function addInstances(group, geometry, material, transforms, name, { castShadow = true, receiveShadow = true } = {}) {
  if (!transforms.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const dummy = new THREE.Object3D();
  transforms.forEach((t, index) => {
    dummy.position.set(t.x, t.y, t.z);
    dummy.scale.set(t.sx ?? 1, t.sy ?? 1, t.sz ?? 1);
    dummy.rotation.set(0, t.heading || 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = name;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  mesh.frustumCulled = false;
  group.add(mesh);
  return mesh;
}

function addBeamBetween(group, a, b, radius, material, name) {
  const direction = new THREE.Vector3().subVectors(b, a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 8), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function octagonPath(path, radius, reverse = false) {
  for (let n = 0; n < 8; n++) {
    const i = reverse ? 7 - n : n;
    const angle = Math.PI / 8 + i * Math.PI / 4;
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
    if (n === 0) path.moveTo(x, y); else path.lineTo(x, y);
  }
  path.closePath();
  return path;
}

function createOctagonGlazingGeometry() {
  return new THREE.ShapeGeometry(octagonPath(new THREE.Shape(), 1.47));
}

function createOctagonFrameGeometry() {
  const shape = octagonPath(new THREE.Shape(), 1.68);
  shape.holes.push(octagonPath(new THREE.Path(), 1.47, true));
  return new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false, curveSegments: 1 });
}

// The crown uses the same four-path interlocking ribbon device as the entrance sign, with no raster logo asset.
function createScbLogoTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 384; canvas.height = 552;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStandardCharteredDevice(ctx, 24, 20, 336, 512);
  const logo = new THREE.CanvasTexture(canvas);
  logo.colorSpace = THREE.SRGBColorSpace;
  logo.anisotropy = 4;
  return logo;
}

function createScbEntranceSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStandardCharteredDevice(ctx, 22, 22, 130, 212);
  ctx.fillStyle = '#f0eee5';
  ctx.textBaseline = 'middle';
  ctx.font = '600 65px Arial, Helvetica, sans-serif';
  ctx.fillText('Standard Chartered', 176, 100);
  ctx.font = '600 54px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.fillText('渣打銀行', 178, 181);
  const sign = new THREE.CanvasTexture(canvas);
  sign.colorSpace = THREE.SRGBColorSpace;
  sign.anisotropy = 4;
  return sign;
}

function texturedSignMaterial(map, glow = 0.25) {
  const material = new THREE.MeshStandardNodeMaterial({
    map, transparent: true, alphaTest: 0.025, depthWrite: false,
    side: THREE.DoubleSide, roughness: 0.45, metalness: 0.08
  });
  material.emissiveNode = texture(map, uv()).mul(nightAmount().mul(glow));
  return material;
}

// The supplied close Street View shows a stone parapet, not freestanding rail posts. One repeating procedural tile
// gives the swept wall real panel joints without bundling the photograph or any external texture asset.
function createScbParapetMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#b7afa5';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) {
    for (let x = 0; x < 256; x += 16) {
      const tone = 172 + ((x * 13 + y * 7) % 19);
      ctx.fillStyle = `rgba(${tone},${tone - 7},${tone - 12},0.12)`;
      ctx.fillRect(x, y, 16, 16);
    }
  }
  ctx.strokeStyle = 'rgba(108,98,91,0.72)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, 253, 253);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.82, metalness: 0.02 });
}

export function buildStandardCharteredBankBuilding(root) {
  const group = new THREE.Group();
  group.name = 'StandardCharteredBankBuilding';
  group.position.set(SCB_MODEL_ORIGIN.x, 0, SCB_MODEL_ORIGIN.z);
  group.rotation.y = SCB_BUILDING_HEADING;
  group.userData.landmark = 'standard-chartered-bank-building';
  group.userData.osm = { type: SCB_SITE.osmType, id: SCB_SITE.osmId };
  root.add(group);

  const stone = createScbStoneFacadeMaterial();
  const ribbon = createScbRibbonFacadeMaterial();
  const frontGlass = createScbFrontGlassMaterial();
  const unitBox = new THREE.BoxGeometry(1, 1, 1);

  const tierBoxes = SCB_TIERS.map((tier) => ({
    x: 0, y: (SCB_BASE_Y + tier.roofY) * 0.5, z: tier.z,
    w: SCB_WIDTH, h: tier.roofY - SCB_BASE_Y, d: tier.depth, tone: 0.56
  }));
  addFacadeBoxes(group, ribbon, tierBoxes, 'SCBSteppedTowerTiers');

  // North elevation: three stone blades, two recessed rose-glass channels, and solid podium infills between the blades.
  const frontRoofY = SCB_TIERS[0].roofY;
  const pierBoxes = SCB_FRONT_PIER_X.map((x) => ({
    x, y: (SCB_BASE_Y + frontRoofY) * 0.5, z: SCB_FRONT_Z - 0.16,
    w: SCB_FRONT_PIER_WIDTH, h: frontRoofY - SCB_BASE_Y, d: 0.32, tone: 0.62
  }));
  addFacadeBoxes(group, stone, pierBoxes, 'SCBFrontStonePiers');
  const podiumInfills = SCB_FRONT_GLASS_X.map((x) => ({
    x, y: (SCB_BASE_Y + SCB_PODIUM_HEIGHT) * 0.5, z: SCB_FRONT_Z - 0.08,
    w: SCB_FRONT_GLASS_WIDTH, h: SCB_PODIUM_HEIGHT - SCB_BASE_Y, d: 0.16, tone: 0.52
  }));
  addFacadeBoxes(group, stone, podiumInfills, 'SCBPodiumStoneInfills');
  const glassChannels = SCB_FRONT_GLASS_X.map((x) => ({
    x, y: (SCB_PODIUM_HEIGHT + frontRoofY) * 0.5, z: SCB_FRONT_Z - 0.075,
    w: SCB_FRONT_GLASS_WIDTH, h: frontRoofY - SCB_PODIUM_HEIGHT, d: 0.15, tone: 0.72
  }));
  addFacadeBoxes(group, frontGlass, glassChannels, 'SCBFrontRoseGlassChannels');

  // Every exposed step face repeats the same stone / rose-glass / stone sandwich language. Front-facing bands climb
  // towards slab 4; rear-facing bands descend away from it, making seven actual volumes rather than a facade decal.
  const sandwichStepPiers = [], sandwichStepGlass = [];
  const addSandwichStepFace = (tier, neighbor, side) => {
    const lowerY = neighbor.roofY;
    const boundaryZ = tier.z + side * tier.depth * 0.5;
    for (const x of SCB_FRONT_PIER_X) {
      sandwichStepPiers.push({
        x, y: (lowerY + tier.roofY) * 0.5, z: boundaryZ + side * 0.16,
        w: SCB_FRONT_PIER_WIDTH, h: tier.roofY - lowerY, d: 0.32, tone: 0.62
      });
    }
    for (const x of SCB_FRONT_GLASS_X) {
      sandwichStepGlass.push({
        x, y: (lowerY + tier.roofY) * 0.5, z: boundaryZ + side * 0.075,
        w: SCB_FRONT_GLASS_WIDTH, h: tier.roofY - lowerY, d: 0.15, tone: 0.72
      });
    }
  };
  for (let i = 1; i <= 3; i++) addSandwichStepFace(SCB_TIERS[i], SCB_TIERS[i - 1], -1);
  for (let i = 3; i <= 5; i++) addSandwichStepFace(SCB_TIERS[i], SCB_TIERS[i + 1], 1);
  addFacadeBoxes(group, stone, sandwichStepPiers, 'SCBSandwichStepStonePiers');
  addFacadeBoxes(group, frontGlass, sandwichStepGlass, 'SCBSandwichStepRoseGlassChannels');

  const copingBoxes = SCB_TIERS.map((tier) => ({
    x: 0, y: tier.roofY + 0.22, z: tier.z,
    w: SCB_WIDTH + 0.34, h: 0.44, d: tier.depth + 0.34, tone: 0.6
  }));
  copingBoxes.push({
    x: SCB_SIGN_FIN.x, y: SCB_HEIGHT - 0.2, z: SCB_SIGN_FIN.z,
    w: SCB_SIGN_FIN.w + 0.25, h: 0.4, d: SCB_SIGN_FIN.d + 0.25, tone: 0.6
  });
  addFacadeBoxes(group, stone, copingBoxes, 'SCBSteppedRoofCopings');
  addFacadeBoxes(group, stone, [{
    x: SCB_SIGN_FIN.x, y: (SCB_SIGN_FIN.baseY + SCB_HEIGHT - 0.4) * 0.5, z: SCB_SIGN_FIN.z,
    w: SCB_SIGN_FIN.w, h: SCB_HEIGHT - 0.4 - SCB_SIGN_FIN.baseY, d: SCB_SIGN_FIN.d, tone: 0.57
  }], 'SCBCrownSignFin');

  const crownLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(7.6, 11),
    texturedSignMaterial(createScbLogoTexture(), 0.38)
  );
  crownLogo.name = 'SCBCrownLogo';
  crownLogo.position.set(0, (SCB_SIGN_FIN.baseY + SCB_HEIGHT) * 0.5, SCB_SIGN_FIN.z - SCB_SIGN_FIN.d * 0.5 - 0.035);
  crownLogo.rotation.y = Math.PI;
  group.add(crownLogo);
  const westCrownLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(4.55, 6.58),
    texturedSignMaterial(createScbLogoTexture(), 0.38)
  );
  westCrownLogo.name = 'SCBCrownLogoWest';
  westCrownLogo.position.set(-SCB_SIGN_FIN.w * 0.5 - 0.035, crownLogo.position.y, SCB_SIGN_FIN.z);
  westCrownLogo.rotation.y = -Math.PI / 2;
  group.add(westCrownLogo);

  // Three octagonal, horizontally louvred windows directly above the tall gold-framed entrance glazing.
  const octagonSites = SCB_FRONT_PIER_X.map((x) => ({ x, y: SCB_OCTAGON_Y, z: SCB_FRONT_Z - 0.58 }));
  const darkGlass = new THREE.MeshStandardNodeMaterial({
    color: 0x263033, roughness: 0.28, metalness: 0.38, side: THREE.DoubleSide
  });
  darkGlass.emissiveNode = color(0xffd6a0).mul(nightAmount().mul(0.055));
  addInstances(group, createOctagonGlazingGeometry(), darkGlass, octagonSites, 'SCBOctagonalWindowGlazing', { castShadow: false });
  const octagonMetal = new THREE.MeshStandardMaterial({ color: 0x807b72, roughness: 0.4, metalness: 0.46 });
  addInstances(
    group, createOctagonFrameGeometry(), octagonMetal,
    SCB_FRONT_PIER_X.map((x) => ({ x, y: SCB_OCTAGON_Y, z: SCB_FRONT_Z - 0.72 })),
    'SCBOctagonalWindowFrames'
  );
  const louvres = [];
  const louvreWidths = [2.08, 2.55, 2.78, 2.88, 2.78, 2.55, 2.08];
  for (const x of SCB_FRONT_PIER_X) {
    for (let i = 0; i < 7; i++) {
      louvres.push({ x, y: SCB_OCTAGON_Y + (i - 3) * 0.35, z: SCB_FRONT_Z - 0.75, sx: louvreWidths[i], sy: 0.065, sz: 0.075 });
    }
    for (const dx of [-0.48, 0.48]) {
      louvres.push({ x: x + dx, y: SCB_OCTAGON_Y, z: SCB_FRONT_Z - 0.755, sx: 0.065, sy: 2.4, sz: 0.07 });
    }
  }
  addInstances(group, unitBox, octagonMetal, louvres, 'SCBOctagonalWindowLouvres');

  const gold = new THREE.MeshStandardMaterial({ color: 0xbba66e, roughness: 0.34, metalness: 0.58 });
  const entranceGlass = new THREE.MeshStandardNodeMaterial({ color: 0x293231, roughness: 0.24, metalness: 0.4 });
  entranceGlass.emissiveNode = color(0xffd5a0).mul(nightAmount().mul(0.12));
  addInstances(group, unitBox, gold, SCB_FRONT_PIER_X.map((x) => ({
    x, y: SCB_ENTRANCE_BASE_Y + SCB_ENTRANCE_HEIGHT * 0.5, z: SCB_FRONT_Z - 0.37,
    sx: SCB_ENTRANCE_DOOR_WIDTH, sy: SCB_ENTRANCE_HEIGHT, sz: 0.1
  })), 'SCBGoldEntranceSurrounds');
  addInstances(group, unitBox, entranceGlass, SCB_FRONT_PIER_X.map((x) => ({
    x, y: SCB_ENTRANCE_BASE_Y + SCB_ENTRANCE_HEIGHT * 0.5, z: SCB_FRONT_Z - 0.445,
    sx: 3.82, sy: SCB_ENTRANCE_HEIGHT - 0.7, sz: 0.07
  })), 'SCBTallEntranceGlazing');
  const entranceMullions = [];
  for (const x of SCB_FRONT_PIER_X) {
    entranceMullions.push({ x, y: SCB_ENTRANCE_BASE_Y + SCB_ENTRANCE_HEIGHT * 0.5, z: SCB_FRONT_Z - 0.495, sx: 0.095, sy: SCB_ENTRANCE_HEIGHT - 0.65, sz: 0.055 });
    for (const offset of [3.38, 7.38, 10.58]) {
      entranceMullions.push({ x, y: SCB_ENTRANCE_BASE_Y + offset, z: SCB_FRONT_Z - 0.5, sx: 3.84, sy: 0.095, sz: 0.055 });
    }
  }
  addInstances(group, unitBox, gold, entranceMullions, 'SCBGoldEntranceMullions');

  const entranceSign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.3, 0.825),
    texturedSignMaterial(createScbEntranceSignTexture(), 0.32)
  );
  entranceSign.name = 'SCBEntranceSign';
  entranceSign.position.set(0, SCB_ENTRANCE_BASE_Y + 4.43, SCB_FRONT_Z - 0.535);
  entranceSign.rotation.y = Math.PI;
  group.add(entranceSign);

  // Every riser stays parallel to Des Voeux Road while the two independently converging sides retain the triangular
  // flight plan. The road frame remains independent of the 35-degree architectural frame.
  const stairMaterial = new THREE.MeshStandardMaterial({ color: 0xb7afa5, roughness: 0.82, metalness: 0.02 });
  const stairPoint = (u, v, y = 0) => ({ ...scbStairRoadToLocal(u, v), y });
  const stairVector = (u, v, y) => {
    const point = stairPoint(u, v, y);
    return new THREE.Vector3(point.x, point.y, point.z);
  };
  const stairEdgeU = (side, t) => {
    const edges = scbStairEdgesAt(t);
    return side === 1 ? edges.left : edges.right;
  };
  // Each tread is a trapezoidal prism. The building-side boundary lies on the facade itself; the outer boundary
  // carries the only rail. Tread 1 is half the facade projection and tread 30 ends at the left-door width.
  const stairPositions = [];
  const stairTriangles = [
    4, 6, 5, 5, 6, 7, // top
    0, 1, 2, 1, 3, 2, // bottom
    0, 4, 1, 1, 4, 5, // near riser
    2, 3, 6, 3, 7, 6, // far riser
    0, 2, 4, 2, 6, 4, // right diagonal side
    1, 5, 3, 3, 5, 7  // left diagonal side
  ];
  const appendTrapezoidPrism = (positions, nearV, farV, near, far, top) => {
    const corners = [
      stairPoint(near.right, nearV, 0), stairPoint(near.left, nearV, 0),
      stairPoint(far.right, farV, 0), stairPoint(far.left, farV, 0),
      stairPoint(near.right, nearV, top), stairPoint(near.left, nearV, top),
      stairPoint(far.right, farV, top), stairPoint(far.left, farV, top)
    ];
    for (const corner of stairTriangles) {
      const point = corners[corner];
      positions.push(point.x, point.y, point.z);
    }
  };
  for (let i = 0; i < SCB_STAIR_COUNT; i++) {
    appendTrapezoidPrism(
      stairPositions, i * SCB_STAIR_TREAD, (i + 1) * SCB_STAIR_TREAD,
      scbStairEdgesAt(i / SCB_STAIR_COUNT), scbStairEdgesAt((i + 1) / SCB_STAIR_COUNT),
      (i + 1) * SCB_STAIR_RISE
    );
  }
  const stairGeometry = new THREE.BufferGeometry();
  stairGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stairPositions, 3));
  stairGeometry.computeVertexNormals();
  stairGeometry.computeBoundingBox();
  stairGeometry.computeBoundingSphere();
  const stairMesh = new THREE.Mesh(stairGeometry, stairMaterial);
  stairMesh.name = 'SCBDesVoeuxRoadEntranceSteps';
  stairMesh.castShadow = stairMesh.receiveShadow = true;
  stairMesh.userData.stepCount = SCB_STAIR_COUNT;
  group.add(stairMesh);
  // The small left-door landing continues the same two boundaries, so its building edge also stays flush with the
  // angled facade. There is no full-facade platform or rectangular filler crossing that edge.
  const landingPositions = [];
  const landingFarV = SCB_STAIR_RUN + SCB_STAIR_TOP_LANDING_DEPTH;
  appendTrapezoidPrism(
    landingPositions, SCB_STAIR_RUN, landingFarV,
    scbStairEdgesAt(1), scbStairEdgesAt(landingFarV / SCB_STAIR_RUN), SCB_ENTRANCE_BASE_Y
  );
  const landingGeometry = new THREE.BufferGeometry();
  landingGeometry.setAttribute('position', new THREE.Float32BufferAttribute(landingPositions, 3));
  landingGeometry.computeVertexNormals();
  landingGeometry.computeBoundingBox();
  landingGeometry.computeBoundingSphere();
  const landingMesh = new THREE.Mesh(landingGeometry, stairMaterial);
  landingMesh.name = 'SCBEntranceRaisedLandings';
  landingMesh.castShadow = landingMesh.receiveShadow = true;
  landingMesh.userData.landingCount = 1;
  group.add(landingMesh);

  // A continuous stone parapet follows the outer diagonal from the Dec 2025 reference. Its bottom follows the stair
  // ramp and its top rises 0.92 m above it, so there are no floating step-by-step wall fragments or saw-tooth coping.
  const parapetMaterial = createScbParapetMaterial();
  const parapets = [];
  for (const side of SCB_STAIR_RAIL_SIDES) {
    const nearInner = stairEdgeU(side, 0) + side * 0.012;
    const farInner = stairEdgeU(side, 1) + side * 0.012;
    const nearOuter = nearInner + side * SCB_STAIR_PARAPET_THICKNESS;
    const farOuter = farInner + side * SCB_STAIR_PARAPET_THICKNESS;
    const nearLimits = [Math.min(nearInner, nearOuter), Math.max(nearInner, nearOuter)];
    const farLimits = [Math.min(farInner, farOuter), Math.max(farInner, farOuter)];
    const corners = [
      { u: nearLimits[0], v: 0, y: 0 }, { u: nearLimits[1], v: 0, y: 0 },
      { u: farLimits[0], v: SCB_STAIR_RUN, y: SCB_ENTRANCE_BASE_Y },
      { u: farLimits[1], v: SCB_STAIR_RUN, y: SCB_ENTRANCE_BASE_Y },
      { u: nearLimits[0], v: 0, y: SCB_STAIR_PARAPET_HEIGHT },
      { u: nearLimits[1], v: 0, y: SCB_STAIR_PARAPET_HEIGHT },
      { u: farLimits[0], v: SCB_STAIR_RUN, y: SCB_ENTRANCE_BASE_Y + SCB_STAIR_PARAPET_HEIGHT },
      { u: farLimits[1], v: SCB_STAIR_RUN, y: SCB_ENTRANCE_BASE_Y + SCB_STAIR_PARAPET_HEIGHT }
    ];
    const positions = [], texcoords = [];
    stairTriangles.forEach((corner, index) => {
      const point = corners[corner];
      const local = stairPoint(point.u, point.v, point.y);
      positions.push(local.x, local.y, local.z);
      const face = Math.floor(index / 6);
      if (face < 2) texcoords.push(point.v / 1.8, point.u / 1.8);
      else if (face < 4) texcoords.push(point.u / 1.8, point.y / 0.9);
      else texcoords.push(point.v / 1.8, point.y / 0.9);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(texcoords, 2));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const parapet = new THREE.Mesh(geometry, parapetMaterial);
    parapet.name = 'SCBEntranceStairStoneParapet';
    parapet.castShadow = parapet.receiveShadow = true;
    group.add(parapet);
    parapets.push(parapet);
  }

  const railPosts = [];
  for (const side of SCB_STAIR_RAIL_SIDES) {
    addBeamBetween(
      group,
      stairVector(stairEdgeU(side, 0), 0, SCB_STAIR_RISE + 1.06),
      stairVector(stairEdgeU(side, 1), SCB_STAIR_RUN, SCB_ENTRANCE_BASE_Y + 1.06),
      0.045, octagonMetal, 'SCBEntranceStairHandrail'
    );
    for (let i = 0; i < SCB_STAIR_COUNT; i += 5) {
      const t = (i + 0.5) / SCB_STAIR_COUNT;
      const top = (i + 1) * SCB_STAIR_RISE;
      railPosts.push({
        ...stairPoint(stairEdgeU(side, t), (i + 0.5) * SCB_STAIR_TREAD, top + 0.53),
        sx: 0.055, sy: 1.06, sz: 0.055
      });
    }
    railPosts.push({
      ...stairPoint(stairEdgeU(side, 1), SCB_STAIR_RUN, SCB_ENTRANCE_BASE_Y + 0.53),
      sx: 0.055, sy: 1.06, sz: 0.055
    });
  }
  addInstances(group, unitBox, octagonMetal, railPosts, 'SCBEntranceStairRailPosts');

  const colliders = SCB_TIERS.map((tier) => scbLocalCollider({
    x: 0, z: tier.z, w: SCB_WIDTH, d: tier.depth, minY: SCB_BASE_Y, maxY: tier.roofY + 0.45
  }));
  colliders.push(scbLocalCollider({
    x: SCB_SIGN_FIN.x, z: SCB_SIGN_FIN.z, w: SCB_SIGN_FIN.w, d: SCB_SIGN_FIN.d,
    minY: SCB_SIGN_FIN.baseY, maxY: SCB_HEIGHT
  }));
  // Only the outer edge needs stair colliders; the other edge is already closed by the facade / tower colliders.
  for (let first = 0; first < SCB_STAIR_COUNT; first += 5) {
    const last = Math.min(SCB_STAIR_COUNT, first + 5);
    for (const side of SCB_STAIR_RAIL_SIDES) {
      const offset = side * (0.012 + SCB_STAIR_PARAPET_THICKNESS * 0.5);
      const a = stairPoint(stairEdgeU(side, first / SCB_STAIR_COUNT) + offset, first * SCB_STAIR_TREAD);
      const b = stairPoint(stairEdgeU(side, last / SCB_STAIR_COUNT) + offset, last * SCB_STAIR_TREAD);
      const dx = b.x - a.x, dz = b.z - a.z;
      colliders.push(scbLocalCollider({
        x: (a.x + b.x) * 0.5, z: (a.z + b.z) * 0.5,
        w: SCB_STAIR_PARAPET_THICKNESS, d: Math.hypot(dx, dz) + 0.02,
        minY: 0, maxY: last * SCB_STAIR_RISE + 1.06, heading: Math.atan2(dx, dz)
      }));
    }
  }

  const landmark = {
    name: SCB_SITE.name,
    englishName: SCB_SITE.englishName,
    x: SCB_MODEL_ORIGIN.x, z: SCB_MODEL_ORIGIN.z, w: SCB_WIDTH, d: SCB_SITE.d, h: SCB_HEIGHT,
    bounds: { ...SCB_SITE.bounds }, ring: SCB_SITE.ring, osmId: SCB_SITE.osmId
  };
  const stats = {
    scbHeight: SCB_HEIGHT,
    scbSteppedTiers: SCB_TIERS.length,
    scbSandwichStepFaces: sandwichStepGlass.length / SCB_FRONT_GLASS_X.length,
    scbFrontStonePiers: SCB_FRONT_PIER_X.length,
    scbFrontGlassChannels: SCB_FRONT_GLASS_X.length,
    scbOctagonalWindows: SCB_FRONT_PIER_X.length,
    scbGoldEntrances: SCB_FRONT_PIER_X.length,
    scbEntranceSteps: SCB_STAIR_COUNT,
    scbEntranceStairRun: SCB_STAIR_RUN,
    scbEntranceStoneParapets: parapets.length,
    scbEntranceBaseY: SCB_ENTRANCE_BASE_Y,
    scbColliders: colliders.length
  };
  return { group, colliders, landmarks: [landmark], stats, baseY: SCB_BASE_Y, entranceBaseY: SCB_ENTRANCE_BASE_Y };
}
