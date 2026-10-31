import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { color, dot, float, fract, mix, sin, smoothstep, step, texture, uv, vec2 } from 'three/tsl';
import { cityUniforms, facadeCell, filteredPulse, createFacadeBoxes, WALL_KINDS } from '../../tsl-materials.js';
import {
  HSBC_SITE,
  HSBC_HEIGHT,
  HSBC_ROOF_SIGN,
  HSBC_PLAZA_TOP,
  HSBC_BANKING_HALL_BASE,
  HSBC_FLOOR_HEIGHT,
  HSBC_FRAME_WIDTH,
  HSBC_GLASS_WIDTH,
  HSBC_BAY_DEPTH,
  HSBC_BAYS,
  HSBC_MAIN_BAY,
  HSBC_MAIN_ROOF_Y,
  HSBC_ENTRANCE,
  HSBC_LION_SITES,
  HSBC_ESCALATOR,
  HSBC_MAST_X,
  hsbcSuspensionLevelsForRoof,
  hsbcWorldToLocal,
  hsbcLocalCollider
} from './hsbc-headquarters-architecture.js';

function nightAmount() {
  return smoothstep(0.7, 1.45, cityUniforms.uInteriorGlow);
}

function createHsbcCurtainWallMaterial({ entrance = false } = {}) {
  // Office curtain wall rather than the generic residential shader: no apartment interiors or daytime lit rooms.
  const material = new THREE.MeshStandardNodeMaterial({ metalness: 0.32, roughness: 0.26, envMapIntensity: 0.35 });
  const { cellId, cellUV, fw, isRoof, partial, coping } = facadeCell(1.65, HSBC_FLOOR_HEIGHT, true);
  const paneMask = filteredPulse(cellUV.x, 0.035, 0.965, fw.x)
    .mul(filteredPulse(cellUV.y, 0.16, 0.965, fw.y))
    .mul(float(1).sub(isRoof)).mul(float(1).sub(partial)).mul(float(1).sub(coping));
  const random = fract(sin(dot(cellId, vec2(127.1, 311.7)).add(18.86)).mul(43758.5453));
  const randomB = fract(random.mul(17.17).add(0.37));
  const glassBase = color(entrance ? 0x3c4b4c : 0x315f73);
  const reflectedGlass = mix(glassBase, color(0x9bb4c0), step(0.86, randomB).mul(entrance ? 0 : 0.68));
  const glass = reflectedGlass.mul(mix(float(0.88), float(1.12), random));
  const frame = color(0x7f8e91);
  material.colorNode = mix(mix(frame, glass, paneMask), color(0x263237), isRoof);
  material.roughnessNode = mix(float(0.48), float(0.25), paneMask);
  const officeLight = mix(color(0xc4d6df), color(0xffd79b), step(0.48, randomB));
  material.emissiveNode = entrance
    ? color(0xffdca2).mul(paneMask).mul(nightAmount()).mul(0.12)
    : officeLight.mul(step(0.84, random)).mul(paneMask).mul(nightAmount()).mul(0.95);
  return material;
}

function subtlyLitSteel() {
  const material = new THREE.MeshStandardNodeMaterial({ color: 0xa7b1b3, roughness: 0.38, metalness: 0.68 });
  material.emissiveNode = color(0xc5d6dc).mul(nightAmount().mul(0.055));
  return material;
}

function addInstances(group, geometry, material, transforms, name, { castShadow = true, receiveShadow = true } = {}) {
  if (!transforms.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < transforms.length; i++) {
    const t = transforms[i];
    dummy.position.set(t.x, t.y, t.z);
    dummy.scale.set(t.sx ?? 1, t.sy ?? 1, t.sz ?? 1);
    if (t.quaternion) dummy.quaternion.copy(t.quaternion);
    else dummy.rotation.set(0, t.heading || 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = name;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  // This is a single landmark; avoiding stale instanced bounds is cheaper than rebuilding them after every batch.
  mesh.frustumCulled = false;
  group.add(mesh);
  return mesh;
}

function roundedRectangle(path, width, height, radius) {
  const x = -width * 0.5, y = -height * 0.5, r = Math.min(radius, width * 0.5, height * 0.5);
  path.moveTo(x + r, y);
  path.lineTo(x + width - r, y);
  path.quadraticCurveTo(x + width, y, x + width, y + r);
  path.lineTo(x + width, y + height - r);
  path.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  path.lineTo(x + r, y + height);
  path.quadraticCurveTo(x, y + height, x, y + height - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
  return path;
}

function createCrownGeometry() {
  const shape = roundedRectangle(new THREE.Shape(), 36, 10, 5);
  shape.holes.push(roundedRectangle(new THREE.Path(), 31.6, 5.6, 2.8));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1.6, bevelEnabled: false, curveSegments: 16 });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 173.4, HSBC_MAIN_BAY.z);
  return geometry;
}

function createStairWindowGeometry() {
  // Straight jambs and shallow curved lintel / soffit, rather than a generic oval opening.
  const shape = new THREE.Shape();
  shape.moveTo(0.5, -0.2);
  shape.lineTo(0.5, 0.2);
  shape.bezierCurveTo(0.5, 0.48, -0.5, 0.48, -0.5, 0.2);
  shape.lineTo(-0.5, -0.2);
  shape.bezierCurveTo(-0.5, -0.48, 0.5, -0.48, 0.5, -0.2);
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 16);
}

function createStairArchGeometry(radius = 0.03) {
  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(0.5, 0.2, 0), new THREE.Vector3(0.5, 0.48, 0),
    new THREE.Vector3(-0.5, 0.48, 0), new THREE.Vector3(-0.5, 0.2, 0)
  );
  return new THREE.TubeGeometry(curve, 20, radius, 5, false);
}

function drawHsbcDevice(ctx, ox, oy, width, foreground, background = null, height = width) {
  // Correct HSBC device: four outer triangles around a negative-space cross, not a six-slice fan.
  // The roof elevation is 2:1; the entrance call keeps its original square device via the default height.
  const hexagon = [[0.25, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0.25, 1], [0, 0.5]];
  const point = ([x, y]) => [ox + x * width, oy + y * height];
  if (background) {
    ctx.beginPath();
    hexagon.forEach((vertex, index) => {
      const [x, y] = point(vertex);
      if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    });
    ctx.closePath(); ctx.fillStyle = background; ctx.fill();
  }
  const triangles = [
    [[0.75, 0], [0.25, 0], [0.5, 0.5]],
    [[1, 0.5], [0.75, 1], [0.75, 0]],
    [[0.25, 1], [0.75, 1], [0.5, 0.5]],
    [[0, 0.5], [0.25, 1], [0.25, 0]]
  ];
  ctx.fillStyle = foreground;
  for (const triangle of triangles) {
    ctx.beginPath();
    triangle.forEach((vertex, index) => {
      const [x, y] = point(vertex);
      if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    });
    ctx.closePath(); ctx.fill();
  }
}

function createHsbcSignTexture() {
  const canvas = document.createElement('canvas');
  const { textureWidth, textureHeight, deviceWidth, deviceHeight } = HSBC_ROOF_SIGN;
  canvas.width = textureWidth; canvas.height = textureHeight;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Front-elevation reference: a horizontally proportioned 2:1 device above the dark curved sunscoop.
  drawHsbcDevice(ctx, (textureWidth - deviceWidth) / 2, (textureHeight - deviceHeight) / 2,
    deviceWidth, '#db0011', '#ffffff', deviceHeight);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createEntranceSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 224;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#b9a262';
  ctx.textBaseline = 'middle';
  ctx.font = '600 116px Arial, Helvetica, sans-serif';
  ctx.fillText('HSBC', 54, 116);
  drawHsbcDevice(ctx, 410, 38, 148, '#b9a262');
  ctx.fillStyle = '#b9a262';
  ctx.font = '700 112px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.fillText('滙豐', 620, 116);
  const signTexture = new THREE.CanvasTexture(canvas);
  signTexture.colorSpace = THREE.SRGBColorSpace;
  signTexture.anisotropy = 4;
  return signTexture;
}

function createHsbcLionGeometry({ openMouth, reclining, tailSide }) {
  const bronzeParts = [], maneParts = [], detailParts = [];
  const unitSphere = new THREE.SphereGeometry(1, 12, 8);
  const up = new THREE.Vector3(0, 1, 0);
  function put(list, geometry, position, scale = [1, 1, 1], quaternion = new THREE.Quaternion()) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...position), quaternion, new THREE.Vector3(...scale)
    );
    g.applyMatrix4(matrix);
    list.push(g);
  }
  function ellipsoid(list, x, y, z, sx, sy, sz, rotation = [0, 0, 0]) {
    put(list, unitSphere, [x, y, z], [sx, sy, sz], new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)));
  }
  function limb(list, a, b, radius) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const direction = end.clone().sub(start), length = direction.length();
    const geometry = new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 3, 7);
    put(list, geometry, start.add(end).multiplyScalar(0.5).toArray(), [1, 1, 1],
      new THREE.Quaternion().setFromUnitVectors(up, direction.normalize()));
  }
  function lock(a, b, radius) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const direction = end.clone().sub(start), length = direction.length();
    const geometry = new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 3, 6);
    put(bronzeParts, geometry, start.add(end).multiplyScalar(0.5).toArray(), [1, 1, 0.48],
      new THREE.Quaternion().setFromUnitVectors(up, direction.normalize()));
  }
  function paw(x, y, z, long = false) {
    ellipsoid(bronzeParts, x, y, z, 0.27, 0.15, long ? 0.42 : 0.32);
    for (let toe = 0; toe < 4; toe++) {
      ellipsoid(bronzeParts, x + (toe - 1.5) * 0.12, y + 0.015, z - (long ? 0.34 : 0.26), 0.075, 0.085, 0.15);
    }
  }

  const headY = reclining ? 2.12 : 2.35;
  const headZ = reclining ? -0.92 : -0.82;
  ellipsoid(bronzeParts, 0, reclining ? 1.25 : 1.38, 0.12, 0.59, reclining ? 0.56 : 0.7, reclining ? 0.92 : 0.62);
  ellipsoid(bronzeParts, 0, 1.57, -0.4, 0.58, 0.67, 0.5);
  for (const side of [-1, 1]) {
    ellipsoid(bronzeParts, side * 0.4, 1.12, 0.58, 0.4, 0.48, 0.48);
    const frontA = [side * 0.34, reclining ? 1.32 : 1.5, -0.38];
    const frontB = [side * 0.42, 0.94, reclining ? -1.25 : -0.72];
    limb(bronzeParts, frontA, frontB, 0.16);
    paw(side * 0.42, 0.86, reclining ? -1.5 : -0.95, reclining);
    paw(side * 0.5, 0.86, reclining ? 0.84 : 0.68, false);
  }

  // Mane volume stays behind the facial features; individual sculpted locks form the silhouette and chest.
  ellipsoid(maneParts, 0, headY - 0.08, headZ + 0.2, 0.61, 0.68, 0.35);
  ellipsoid(bronzeParts, 0, headY, headZ, 0.44, 0.48, 0.4);
  for (const side of [-1, 1]) {
    ellipsoid(bronzeParts, side * 0.24, headY - 0.08, headZ - 0.27, 0.17, 0.2, 0.19);
    ellipsoid(bronzeParts, side * 0.14, headY - 0.15, headZ - 0.43, 0.18, 0.14, 0.2);
  }
  // Sculpted strands flow back over the crown and down the cheeks instead of radiating as spikes.
  for (let strand = -4; strand <= 4; strand++) {
    const x = strand * 0.1;
    const mid = [x * 1.08, headY + 0.52 - Math.abs(strand) * 0.012, headZ + 0.02];
    lock([x, headY + 0.34, headZ - 0.1], mid, 0.034);
    lock(mid, [x * 1.16, headY + 0.55 - Math.abs(strand) * 0.025, headZ + 0.25], 0.027);
  }
  for (const side of [-1, 1]) {
    for (let strand = 0; strand < 8; strand++) {
      const start = [side * (0.39 + strand * 0.012), headY + 0.3 - strand * 0.075, headZ - 0.02];
      const mid = [side * (0.5 + Math.sin(strand) * 0.018), headY + 0.1 - strand * 0.09, headZ - 0.04];
      const end = [side * (0.53 + strand * 0.012), headY - 0.08 - strand * 0.09, headZ + 0.04];
      lock(start, mid, 0.033);
      lock(mid, end, 0.026);
    }
  }
  for (let strand = -5; strand <= 5; strand++) {
    const mid = [strand * 0.105, (headY + (reclining ? 1.05 : 1.0)) * 0.5, reclining ? -0.54 : -0.5];
    lock([strand * 0.09, headY - 0.43, headZ - 0.04], mid, 0.034);
    lock(mid, [strand * 0.115, reclining ? 1.05 : 1.0, reclining ? -0.64 : -0.57], 0.026);
  }
  for (let strand = -2; strand <= 2; strand++) {
    lock(
      [strand * 0.09, headY - 0.37, headZ - 0.47],
      [strand * 0.1, headY - 0.66, headZ - 0.43], 0.026);
  }

  for (const side of [-1, 1]) {
    put(bronzeParts, new THREE.ConeGeometry(0.13, 0.24, 7),
      [side * 0.34, headY + 0.4, headZ + 0.02], [1, 1, 1],
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, side * -0.42)));
    ellipsoid(detailParts, side * 0.18, headY + 0.12, headZ - 0.39, 0.065, 0.035, 0.018);
    ellipsoid(bronzeParts, side * 0.18, headY + 0.12, headZ - 0.412, 0.03, 0.025, 0.015);
    limb(bronzeParts, [side * 0.09, headY + 0.21, headZ - 0.35],
      [side * 0.27, headY + 0.18, headZ - 0.35], 0.022);
  }
  ellipsoid(bronzeParts, 0, headY - 0.03, headZ - 0.65, 0.17, 0.08, 0.1);
  for (const side of [-1, 1]) ellipsoid(detailParts, side * 0.07, headY - 0.04, headZ - 0.755, 0.022, 0.016, 0.012);
  if (openMouth) {
    // A small recessed cavity is framed by connected bronze lips and jaw hinges, not an object held in the mouth.
    const mouthCavity = new THREE.Shape();
    mouthCavity.moveTo(-0.095, 0.055);
    mouthCavity.lineTo(0.095, 0.055);
    mouthCavity.lineTo(0.075, -0.055);
    mouthCavity.lineTo(-0.075, -0.055);
    mouthCavity.closePath();
    put(detailParts, new THREE.ShapeGeometry(mouthCavity), [0, headY - 0.265, headZ - 0.612], [1, 1, 1],
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)));
    ellipsoid(bronzeParts, 0, headY - 0.17, headZ - 0.54, 0.18, 0.05, 0.1);
    ellipsoid(bronzeParts, 0, headY - 0.36, headZ - 0.52, 0.18, 0.055, 0.14);
    for (const side of [-1, 1]) {
      // These substantial side hinges touch both lips, so the open mouth cannot read as a detached lower jaw.
      limb(bronzeParts, [side * 0.15, headY - 0.17, headZ - 0.5],
        [side * 0.15, headY - 0.36, headZ - 0.5], 0.05);
      put(bronzeParts, new THREE.ConeGeometry(0.018, 0.06, 5), [side * 0.075, headY - 0.205, headZ - 0.625], [1, 1, 1],
        new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)));
      put(bronzeParts, new THREE.ConeGeometry(0.016, 0.05, 5), [side * 0.07, headY - 0.325, headZ - 0.61]);
    }
  } else {
    limb(detailParts, [-0.16, headY - 0.28, headZ - 0.635], [0.16, headY - 0.28, headZ - 0.635], 0.012);
    ellipsoid(bronzeParts, 0, headY - 0.32, headZ - 0.46, 0.27, 0.12, 0.22);
  }

  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.28, 0.78),
    new THREE.Vector3(tailSide * 0.48, 1.02, 1.18),
    new THREE.Vector3(tailSide * 0.84, 0.9, 0.88),
    new THREE.Vector3(tailSide * 0.82, 0.85, 0.28),
    new THREE.Vector3(tailSide * 0.56, 0.92, 0.08)
  ]);
  put(bronzeParts, new THREE.TubeGeometry(tailCurve, 24, 0.065, 6, false), [0, 0, 0]);
  ellipsoid(bronzeParts, tailSide * 0.56, 0.92, 0.08, 0.12, 0.1, 0.16);
  const merge = (parts) => mergeGeometries(parts, false);
  return { bronze: merge(bronzeParts), mane: merge(maneParts), details: merge(detailParts) };
}

function createPlazaGeometry() {
  const shape = new THREE.Shape();
  for (let i = 0; i + 1 < HSBC_SITE.ring.length; i += 2) {
    const point = hsbcWorldToLocal(HSBC_SITE.ring[i], HSBC_SITE.ring[i + 1]);
    if (i === 0) shape.moveTo(point.x, -point.z);
    else shape.lineTo(point.x, -point.z);
  }
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, HSBC_PLAZA_TOP, 0);
  return geometry;
}

function addEscalatorGlass(group, material, start, end) {
  const positions = [];
  const dx = end.x - start.x, dz = end.z - start.z, length = Math.hypot(dx, dz);
  const nx = dz / length, nz = -dx / length;
  for (const side of [-1, 1]) {
    const ox = side * 0.68 * nx, oz = side * 0.68 * nz;
    const a = [start.x + ox, start.y + 0.25, start.z + oz];
    const b = [end.x + ox, end.y + 0.25, end.z + oz];
    const c = [end.x + ox, end.y + 1.25, end.z + oz];
    const d = [start.x + ox, start.y + 1.25, start.z + oz];
    positions.push(...a, ...b, ...c, ...a, ...c, ...d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'HSBCEscalatorGlass';
  group.add(mesh);
}

export function buildHsbcHeadquarters(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group();
  group.name = 'HongKongHSBCMainBuilding';
  group.userData.landmark = HSBC_SITE.name;
  group.position.set(HSBC_SITE.x, groundOffset, HSBC_SITE.z);
  group.rotation.y = HSBC_SITE.ry;

  const steel = subtlyLitSteel();
  const cladding = new THREE.MeshStandardMaterial({ color: 0xb4bdbf, roughness: 0.5, metalness: 0.42 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14272e, roughness: 0.28, metalness: 0.44 });
  const stairGlass = new THREE.MeshStandardMaterial({
    color: 0x10252d, roughness: 0.3, metalness: 0.35, side: THREE.DoubleSide
  });
  const stairBlueGlass = new THREE.MeshStandardNodeMaterial({ color: 0x235e78, roughness: 0.22, metalness: 0.42 });
  stairBlueGlass.emissiveNode = color(0x4f829b).mul(nightAmount().mul(0.08));
  const sunshadeSteel = new THREE.MeshStandardMaterial({ color: 0x71838a, roughness: 0.35, metalness: 0.65 });
  const claddingSeam = new THREE.MeshStandardMaterial({ color: 0x879499, roughness: 0.6, metalness: 0.3 });
  const crownSteel = new THREE.MeshStandardNodeMaterial({ color: 0x4c5d64, roughness: 0.32, metalness: 0.68 });
  crownSteel.emissiveNode = color(0x8298a4).mul(nightAmount().mul(0.04));
  const plazaMaterial = new THREE.MeshStandardMaterial({ color: 0x99988f, roughness: 0.94, metalness: 0.02 });
  const bronze = new THREE.MeshStandardNodeMaterial({ color: 0x624438, roughness: 0.57, metalness: 0.58 });
  bronze.emissiveNode = color(0x8b5a3c).mul(nightAmount().mul(0.12));
  const bronzeMane = new THREE.MeshStandardNodeMaterial({ color: 0x50362d, roughness: 0.62, metalness: 0.58 });
  bronzeMane.emissiveNode = color(0x71503a).mul(nightAmount().mul(0.08));
  const lionRecess = new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 0.65, metalness: 0.45 });
  const plinthStone = new THREE.MeshStandardMaterial({ color: 0x9a9d99, roughness: 0.9, metalness: 0.02 });
  const cofferMaterial = new THREE.MeshStandardMaterial({ color: 0xaeb5b3, roughness: 0.72, metalness: 0.2 });
  const greenery = new THREE.MeshStandardMaterial({ color: 0x35563c, roughness: 0.96 });
  const escalatorGlass = new THREE.MeshStandardMaterial({
    color: 0x789aa2, transparent: true, opacity: 0.32, depthWrite: false,
    roughness: 0.18, metalness: 0.14, side: THREE.DoubleSide
  });
  const warmLight = new THREE.MeshStandardNodeMaterial({ color: 0x807b68, roughness: 0.6 });
  warmLight.emissiveNode = color(0xffdca2).mul(nightAmount().mul(1.4));
  const glass = createHsbcCurtainWallMaterial();
  const entranceGlass = createHsbcCurtainWallMaterial({ entrance: true });

  const plaza = new THREE.Mesh(createPlazaGeometry(), plazaMaterial);
  plaza.name = 'HSBCPublicPlaza';
  plaza.receiveShadow = true;
  group.add(plaza);

  const claddingBoxes = [], steelBoxes = [], darkBoxes = [], lightBoxes = [], bronzeBoxes = [], stoneBoxes = [], cofferBoxes = [], greenBoxes = [];
  const beams = [], darkBeams = [], masts = [], mastCollars = [], stairWindows = [], stairArchWindows = [], escalatorSteps = [];
  const ladderFrames = [], ladderLandings = [], stairBlueWindows = [], stairWindowMullions = [], stairArchCurves = [], stairSillArches = [], ladderBraces = [];
  const facadeSunshades = [], facadeFins = [], serviceGlassStrips = [], claddingSeams = [], crownMullions = [], crownFins = [], crownRimPanels = [];
  const up = new THREE.Vector3(0, 1, 0);
  function beam(list, a, b, thickness) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const direction = end.clone().sub(start), length = direction.length();
    if (length < 0.001) return;
    const midpoint = start.clone().add(end).multiplyScalar(0.5);
    list.push({
      x: midpoint.x, y: midpoint.y, z: midpoint.z,
      sx: thickness, sy: length, sz: thickness,
      quaternion: new THREE.Quaternion().setFromUnitVectors(up, direction.normalize())
    });
  }

  const faces = [WALL_KINDS.shop, WALL_KINDS.shop, WALL_KINDS.shop, WALL_KINDS.shop];
  const facadeBoxes = HSBC_BAYS.map((bay) => ({
    x: 0, y: (HSBC_BANKING_HALL_BASE + bay.roofY) * 0.5, z: bay.z,
    w: HSBC_GLASS_WIDTH, h: bay.roofY - HSBC_BANKING_HALL_BASE, d: bay.depth, faces, tone: 0.42
  }));
  const facade = createFacadeBoxes(glass, facadeBoxes);
  facade.name = 'HSBCCurtainWallThreeSteppedBays';
  facade.castShadow = true; facade.receiveShadow = true;
  group.add(facade);
  const entranceFacadeBoxes = [];
  const entranceSideWidth = (HSBC_ENTRANCE.width - HSBC_ENTRANCE.doorWidth) * 0.5;
  const entranceSideX = HSBC_ENTRANCE.doorWidth * 0.5 + entranceSideWidth * 0.5;
  for (const side of [-1, 1]) {
    entranceFacadeBoxes.push({
      x: side * entranceSideX, y: HSBC_ENTRANCE.height * 0.5, z: HSBC_ENTRANCE.z,
      w: entranceSideWidth, h: HSBC_ENTRANCE.height, d: 0.32, faces, tone: 0.42
    });
  }
  entranceFacadeBoxes.push({
    x: 0, y: HSBC_ENTRANCE.doorHeight + (HSBC_ENTRANCE.height - HSBC_ENTRANCE.doorHeight) * 0.5,
    z: HSBC_ENTRANCE.z, w: HSBC_ENTRANCE.width, h: HSBC_ENTRANCE.height - HSBC_ENTRANCE.doorHeight,
    d: 0.32, faces, tone: 0.42
  });
  const entranceFacade = createFacadeBoxes(entranceGlass, entranceFacadeBoxes);
  entranceFacade.name = 'HSBCGroundFloorEntranceGlazing';
  entranceFacade.castShadow = true; entranceFacade.receiveShadow = true;
  group.add(entranceFacade);

  const serviceWidth = (HSBC_FRAME_WIDTH - HSBC_GLASS_WIDTH) * 0.5;
  const serviceX = HSBC_GLASS_WIDTH * 0.5 + serviceWidth * 0.5;
  // The exposed escape-stair strips flank the main glass like two ladders, between the glass edge and inner masts.
  const ladderInnerX = HSBC_GLASS_WIDTH * 0.5;
  const ladderOuterX = Math.abs(HSBC_MAST_X[1]);
  const ladderWidth = ladderOuterX - ladderInnerX;
  const ladderCenterX = (ladderInnerX + ladderOuterX) * 0.5;
  const ladderOpeningWidth = ladderWidth - 0.9;
  for (const bay of HSBC_BAYS) {
    const bodyHeight = bay.roofY - HSBC_BANKING_HALL_BASE;
    for (const side of [-1, 1]) {
      claddingBoxes.push({
        x: side * serviceX, y: HSBC_BANKING_HALL_BASE + bodyHeight * 0.5, z: bay.z,
        sx: serviceWidth, sy: bodyHeight, sz: bay.depth
      });
      // Four ground-level service blocks leave the central north-south public passage completely open.
      claddingBoxes.push({
        x: side * serviceX, y: HSBC_BANKING_HALL_BASE * 0.5, z: bay.z,
        sx: serviceWidth, sy: HSBC_BANKING_HALL_BASE, sz: 5.2
      });
    }
    // The raised banking hall has a continuous metallic / glass underbelly above the public plaza.
    steelBoxes.push({
      x: 0, y: HSBC_BANKING_HALL_BASE - 0.28, z: bay.z,
      sx: HSBC_FRAME_WIDTH, sy: 0.56, sz: bay.depth
    });
    for (let x = -27; x <= 27; x += 6) {
      for (const zOffset of [-6, -2, 2, 6]) {
        cofferBoxes.push({ x, y: HSBC_BANKING_HALL_BASE - 0.595, z: bay.z + zOffset, sx: 4.65, sy: 0.07, sz: 2.65 });
        lightBoxes.push({ x, y: HSBC_BANKING_HALL_BASE - 0.64, z: bay.z + zOffset, sx: 0.24, sy: 0.06, sz: 0.24 });
      }
    }
    const suspensionLevels = hsbcSuspensionLevelsForRoof(bay.roofY);
    // Deep vertical fins, a substantial centre mullion and four horizontal lines per floor reproduce the close glass elevation.
    for (const face of [-1, 1]) {
      const finZ = bay.z + face * (bay.depth * 0.5 + 0.16);
      for (let division = 0; division <= 20; division++) {
        facadeFins.push({
          x: -HSBC_GLASS_WIDTH * 0.5 + division * HSBC_GLASS_WIDTH / 20,
          y: HSBC_BANKING_HALL_BASE + bodyHeight * 0.5, z: finZ,
          sx: 0.065, sy: bodyHeight, sz: 0.3
        });
      }
      steelBoxes.push({
        x: 0, y: HSBC_BANKING_HALL_BASE + bodyHeight * 0.5,
        z: bay.z + face * (bay.depth * 0.5 + 0.34), sx: 0.32, sy: bodyHeight, sz: 0.42
      });
      for (let floor = 0; floor < bay.floors; floor++) {
        const floorBase = HSBC_BANKING_HALL_BASE + floor * HSBC_FLOOR_HEIGHT;
        const shadeZ = bay.z + face * (bay.depth * 0.5 + 0.25);
        facadeSunshades.push({ x: 0, y: floorBase + 0.12, z: shadeZ, sx: HSBC_GLASS_WIDTH, sy: 0.14, sz: 0.46 });
        for (const offset of [0.85, 1.63, 2.41]) {
          facadeSunshades.push({ x: 0, y: floorBase + offset, z: shadeZ, sx: HSBC_GLASS_WIDTH, sy: 0.075, sz: 0.4 });
        }
      }
    }
    for (const face of [-1, 1]) {
      const railZ = bay.z + face * (bay.depth * 0.5 + 0.18);
      for (const side of [-1, 1]) {
        for (const railX of [ladderInnerX, ladderOuterX]) {
          ladderFrames.push({
            x: side * railX, y: HSBC_BANKING_HALL_BASE + bodyHeight * 0.5, z: railZ,
            sx: 0.32, sy: bodyHeight, sz: 0.28
          });
        }
        // A narrow blue glazing strip separates each ladder from the outer aluminium service panels.
        serviceGlassStrips.push({
          x: side * (ladderOuterX + 0.62), y: HSBC_BANKING_HALL_BASE + bodyHeight * 0.5,
          z: bay.z + face * (bay.depth * 0.5 + 0.07), sx: 0.76, sy: bodyHeight, sz: 0.08
        });
        const panelInner = ladderOuterX + 1.15, panelOuter = HSBC_FRAME_WIDTH * 0.5;
        const panelCenter = (panelInner + panelOuter) * 0.5, panelWidth = panelOuter - panelInner;
        claddingSeams.push({
          x: side * panelCenter, y: HSBC_BANKING_HALL_BASE + bodyHeight * 0.5,
          z: bay.z + face * (bay.depth * 0.5 + 0.045), sx: 0.035, sy: bodyHeight, sz: 0.04
        });
        for (let y = HSBC_BANKING_HALL_BASE + 7.2; y < bay.roofY; y += 7.2) {
          claddingSeams.push({
            x: side * panelCenter, y, z: bay.z + face * (bay.depth * 0.5 + 0.045),
            sx: panelWidth, sy: 0.035, sz: 0.04
          });
        }
      }
    }
    // Projecting curved landing modules, not small decals on a flat service core.
    for (let floor = 0; floor <= bay.floors; floor++) {
      const y = Math.min(HSBC_BANKING_HALL_BASE + floor * HSBC_FLOOR_HEIGHT + 0.32, bay.roofY - 0.12);
      for (const face of [-1, 1]) {
        for (const side of [-1, 1]) {
          ladderLandings.push({
            x: side * ladderCenterX, y, z: bay.z + face * (bay.depth * 0.5 + 0.28),
            sx: ladderWidth + 0.14, sy: 0.22, sz: 0.72
          });
        }
      }
    }
    for (let floor = 0; floor < bay.floors; floor++) {
      const floorBase = HSBC_BANKING_HALL_BASE + floor * HSBC_FLOOR_HEIGHT;
      const y = floorBase + HSBC_FLOOR_HEIGHT * 0.5;
      const trussModule = suspensionLevels.some((level) => Math.abs(floorBase - (level + 4.5)) < 1.01);
      for (const face of [-1, 1]) {
        for (const side of [-1, 1]) {
          const x = side * ladderCenterX;
          const openingZ = bay.z + face * (bay.depth * 0.5 + 0.075);
          stairArchWindows.push({ x, y, z: openingZ, sx: ladderOpeningWidth, sy: 3.0 });
          stairArchCurves.push({
            x, y, z: bay.z + face * (bay.depth * 0.5 + 0.13),
            sx: ladderOpeningWidth, sy: 3.0
          });
          stairSillArches.push({
            x, y, z: bay.z + face * (bay.depth * 0.5 + 0.13),
            sx: ladderOpeningWidth, sy: 3.0,
            quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI))
          });
          stairBlueWindows.push({
            x, y: y - 0.12, z: bay.z + face * (bay.depth * 0.5 + 0.105),
            sx: 1.12, sy: 1.65, sz: 0.08
          });
          for (const offset of [-0.29, 0.29]) {
            stairWindowMullions.push({
              x: x + offset, y: y - 0.12, z: bay.z + face * (bay.depth * 0.5 + 0.16),
              sx: 0.055, sy: 1.65, sz: 0.1
            });
          }
          const braceZ = bay.z + face * (bay.depth * 0.5 + 0.28);
          if (trussModule) {
            const half = ladderOpeningWidth * 0.43;
            beam(ladderBraces, [x - half, y - 0.9, braceZ], [x + half, y + 0.9, braceZ], 0.2);
            beam(ladderBraces, [x + half, y - 0.9, braceZ], [x - half, y + 0.9, braceZ], 0.2);
          }
          if (floor === bay.floors - 1) {
            for (let spoke = 0; spoke <= 6; spoke++) {
              const angle = spoke * Math.PI / 6;
              beam(ladderBraces, [x, y - 0.9, braceZ],
                [x + Math.cos(angle) * ladderOpeningWidth * 0.43, y - 0.9 + Math.sin(angle) * 1.55, braceZ], 0.075);
            }
          }
        }
      }
      for (const side of [-1, 1]) {
        for (const offset of [-0.27, 0.27]) {
          stairWindows.push({
            x: side * (HSBC_FRAME_WIDTH * 0.5 + 0.065), y, z: bay.z + offset * bay.depth,
            sx: 0.13, sy: 1.12, sz: 1.02
          });
        }
      }
    }
    // Open-air garden terraces sit on the two lower wings, not on the tallest roof.
    if (bay.floors < 44) {
      steelBoxes.push({ x: 0, y: bay.roofY + 0.12, z: bay.z, sx: HSBC_FRAME_WIDTH, sy: 0.24, sz: bay.depth });
      for (const x of [-16, -5.3, 5.3, 16]) {
        claddingBoxes.push({ x, y: bay.roofY + 0.42, z: bay.z, sx: 6.2, sy: 0.6, sz: 1.3 });
        greenBoxes.push({ x, y: bay.roofY + 0.92, z: bay.z, sx: 5.8, sy: 0.55, sz: 1.05 });
      }
    }
    for (const level of suspensionLevels) {
      for (const face of [-1, 1]) {
        const z = bay.z + face * bay.depth * 0.5;
        const innerLeft = HSBC_MAST_X[1], innerRight = HSBC_MAST_X[2];
        // A darker double-height reception band sits behind each coat-hanger truss, as in the supplied elevation.
        darkBoxes.push({ x: 0, y: level + 1.25, z: z + face * 0.04, sx: HSBC_GLASS_WIDTH, sy: 5.7, sz: 0.12 });
        beam(beams, [-HSBC_FRAME_WIDTH * 0.5, level + 4.5, z], [HSBC_FRAME_WIDTH * 0.5, level + 4.5, z], 0.62);
        beam(beams, [innerLeft, level + 4.5, z], [0, level, z], 0.9);
        beam(beams, [0, level, z], [innerRight, level + 4.5, z], 0.9);
        const rearZ = z - face * 0.48;
        beam(beams, [innerLeft, level + 4.5, rearZ], [0, level, rearZ], 0.36);
        beam(beams, [0, level, rearZ], [innerRight, level + 4.5, rearZ], 0.36);
        for (const side of [-1, 1]) {
          const innerX = side * Math.abs(innerRight), outerX = side * HSBC_FRAME_WIDTH * 0.5;
          beam(beams, [outerX, level + 0.2, z], [innerX, level + 4.5, z], 0.52);
          steelBoxes.push({ x: innerX, y: level + 4.5, z: z + face * 0.08, sx: 1.15, sy: 0.85, sz: 0.45 });
        }
        steelBoxes.push({ x: 0, y: level, z: z + face * 0.08, sx: 1.1, sy: 0.72, sz: 0.45 });
        for (const x of [-8, 8]) beam(darkBeams, [x, level - 7.0, z], [x, level, z], 0.15);
      }
      for (const side of [-1, 1]) {
        const x = side * HSBC_FRAME_WIDTH * 0.5;
        beam(beams, [x, level + 4.5, bay.z - bay.depth * 0.5], [x, level + 4.5, bay.z + bay.depth * 0.5], 0.62);
        beam(beams, [x, level + 4.5, bay.z - bay.depth * 0.5], [x, level, bay.z], 0.82);
        beam(beams, [x, level, bay.z], [x, level + 4.5, bay.z + bay.depth * 0.5], 0.82);
      }
    }
  }

  const boundaries = Array.from({ length: HSBC_BAYS.length + 1 }, (_, index) => ({
    z: (index - HSBC_BAYS.length * 0.5) * HSBC_BAY_DEPTH,
    roofY: Math.max(HSBC_BAYS[index - 1]?.roofY ?? 0, HSBC_BAYS[index]?.roofY ?? 0)
  }));
  for (const boundary of boundaries) {
    const height = boundary.roofY + 4.2 - HSBC_PLAZA_TOP;
    for (const x of HSBC_MAST_X) {
      masts.push({ x, y: HSBC_PLAZA_TOP + height * 0.5, z: boundary.z, sy: height });
      darkBoxes.push({ x: x + 0.66, y: HSBC_PLAZA_TOP + height * 0.5, z: boundary.z, sx: 0.13, sy: height, sz: 0.18 });
      for (let y = 14.4; y < boundary.roofY + 4.2; y += 14.4) {
        mastCollars.push({ x, y, z: boundary.z, sy: 0.12 });
      }
    }
  }

  // From the entrance, the paired escalators begin just behind the right lion's plinth and climb diagonally back towards the left.
  const escalatorDx = HSBC_ESCALATOR.endX - HSBC_ESCALATOR.startX;
  const escalatorDz = HSBC_ESCALATOR.endZ - HSBC_ESCALATOR.startZ;
  const escalatorPlanLength = Math.hypot(escalatorDx, escalatorDz);
  const escalatorNx = escalatorDz / escalatorPlanLength, escalatorNz = -escalatorDx / escalatorPlanLength;
  const escalatorHeading = Math.atan2(escalatorDx, escalatorDz);
  for (const lane of [-1, 1]) {
    const offset = lane * HSBC_ESCALATOR.laneOffset;
    const start = {
      x: HSBC_ESCALATOR.startX + escalatorNx * offset, y: HSBC_ESCALATOR.startY,
      z: HSBC_ESCALATOR.startZ + escalatorNz * offset
    };
    const end = {
      x: HSBC_ESCALATOR.endX + escalatorNx * offset, y: HSBC_ESCALATOR.endY,
      z: HSBC_ESCALATOR.endZ + escalatorNz * offset
    };
    beam(darkBeams, [start.x, start.y, start.z], [end.x, end.y, end.z], 1.12);
    for (const side of [-1, 1]) {
      const ox = side * 0.68 * escalatorNx, oz = side * 0.68 * escalatorNz;
      beam(darkBeams, [start.x + ox, start.y + 1.18, start.z + oz], [end.x + ox, end.y + 1.18, end.z + oz], 0.1);
    }
    for (let step = 0; step <= 26; step++) {
      const t = step / 26;
      escalatorSteps.push({
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t + 0.25,
        z: start.z + (end.z - start.z) * t,
        sx: 1.08, sy: 0.13, sz: 0.52, heading: escalatorHeading
      });
    }
    addEscalatorGlass(group, escalatorGlass, start, end);
  }
  // The lions sit farther apart on transverse plinths and face one another across the open entrance.
  const lionsGroup = new THREE.Group();
  lionsGroup.name = 'HSBCBronzeLions';
  group.add(lionsGroup);
  for (const site of HSBC_LION_SITES) {
    const lion = {
      ...site,
      openMouth: site.id === 'left', reclining: site.id === 'right', tailSide: site.id === 'left' ? -1 : 1,
      name: site.id === 'left' ? 'HSBCLeftBronzeLionOpenMouth' : 'HSBCRightBronzeLionReclining'
    };
    stoneBoxes.push({ x: site.x, y: 0.275, z: site.z, sx: 3.6, sy: 0.55, sz: 2.8 });
    bronzeBoxes.push({ x: site.x, y: 0.64, z: site.z, sx: 3.25, sy: 0.18, sz: 2.45 });
    const geometry = createHsbcLionGeometry(lion);
    const lionGroup = new THREE.Group();
    lionGroup.position.set(site.x, 0, site.z);
    lionGroup.rotation.y = site.heading;
    lionGroup.name = lion.name;
    for (const [part, material] of [['bronze', bronze], ['mane', bronzeMane], ['details', lionRecess]]) {
      const mesh = new THREE.Mesh(geometry[part], material);
      mesh.name = `${lion.name}${part[0].toUpperCase()}${part.slice(1)}`;
      mesh.castShadow = true; mesh.receiveShadow = true;
      lionGroup.add(mesh);
    }
    lionsGroup.add(lionGroup);
  }

  // Roof maintenance cranes are part of the original high-tech silhouette, not decorative antennae.
  for (const crane of [
    { x: -27, z: HSBC_MAIN_BAY.z - 4.5, y: 174.2, direction: -1 },
    { x: 27, z: HSBC_MAIN_BAY.z + 4.5, y: 171.2, direction: 1 }
  ]) {
    steelBoxes.push({ x: crane.x, y: crane.y - 2.0, z: crane.z, sx: 1.3, sy: 4.0, sz: 1.5 });
    beam(beams, [crane.x, crane.y, crane.z], [crane.x + crane.direction * 13, crane.y, crane.z], 0.72);
    beam(beams, [crane.x, crane.y + 2.2, crane.z], [crane.x + crane.direction * 10, crane.y, crane.z], 0.22);
    beam(darkBeams, [crane.x + crane.direction * 11.5, crane.y, crane.z], [crane.x + crane.direction * 11.5, crane.y - 6.2, crane.z], 0.08);
  }

  for (let index = 0; index < 48; index++) {
    const angle = index * Math.PI * 2 / 48;
    const x = Math.cos(angle) * 15.5, z = HSBC_MAIN_BAY.z + Math.sin(angle) * 2.65;
    crownMullions.push({ x, y: 171.8, z, sx: 0.075, sy: 5.2, sz: 0.075 });
    if (Math.abs(Math.cos(angle)) > 0.55) {
      crownFins.push({ x, y: 176.9, z, sx: 0.055, sy: 3.8, sz: 0.055 });
    }
  }
  for (const face of [-1, 1]) {
    for (let index = -11; index <= 11; index++) {
      crownRimPanels.push({
        x: index * 1.15, y: 174.2, z: HSBC_MAIN_BAY.z + face * 5.03,
        sx: 0.42, sy: 0.24, sz: 0.07
      });
    }
  }
  const crown = new THREE.Mesh(createCrownGeometry(), crownSteel);
  crown.name = 'HSBCOvalSunscoopCrown';
  crown.castShadow = true;
  group.add(crown);
  const crownGlass = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 5.2, 48), stairBlueGlass);
  crownGlass.position.set(0, 171.8, HSBC_MAIN_BAY.z); crownGlass.scale.set(15.5, 1, 2.65);
  crownGlass.name = 'HSBCCrownGlass';
  group.add(crownGlass);
  const signTexture = createHsbcSignTexture();
  const signMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, toneMapped: false });
  const signTex = texture(signTexture, uv());
  signMaterial.colorNode = signTex.rgb;
  signMaterial.opacityNode = signTex.a;
  for (const face of [-1, 1]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(HSBC_ROOF_SIGN.planeWidth, HSBC_ROOF_SIGN.planeHeight), signMaterial);
    sign.position.set(0, 177, HSBC_MAIN_BAY.z + face * 5.04);
    if (face < 0) sign.rotation.y = Math.PI;
    sign.name = face < 0 ? 'HSBCNorthSign' : 'HSBCSouthSign';
    group.add(sign);
  }
  const entranceSignMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, toneMapped: false });
  const entranceSignTex = texture(createEntranceSignTexture(), uv());
  entranceSignMaterial.colorNode = mix(entranceSignTex.rgb, color(0xffd88a), nightAmount().mul(0.4));
  entranceSignMaterial.opacityNode = entranceSignTex.a;
  const entranceSign = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 2.35), entranceSignMaterial);
  entranceSign.position.set(-10.5, 6.15, HSBC_ENTRANCE.z - 0.18);
  entranceSign.rotation.y = Math.PI;
  entranceSign.name = 'HSBCGroundEntranceGoldSign';
  group.add(entranceSign);

  addInstances(group, new THREE.BoxGeometry(1, 1, 1), cladding, claddingBoxes, 'HSBCAluminiumServiceCores');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), steel, steelBoxes, 'HSBCUnderbellyTerracesAndCranes');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), cofferMaterial, cofferBoxes, 'HSBCUnderbellyCofferPanels');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), dark, darkBoxes, 'HSBCServiceGlazingAndMastLadders');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), steel, ladderFrames, 'HSBCExternalStairLadderRails');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), steel, ladderLandings, 'HSBCExternalStairLadderLandings');
  addInstances(group, createStairArchGeometry(0.03), steel, stairArchCurves, 'HSBCStairLandingArches');
  addInstances(group, createStairArchGeometry(0.04), steel, stairSillArches, 'HSBCStairLandingCurvedSoffits');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), stairBlueGlass, stairBlueWindows, 'HSBCStairLandingBlueWindows', { castShadow: false });
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), steel, stairWindowMullions, 'HSBCStairLandingWindowMullions');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), steel, ladderBraces, 'HSBCStairLandingXAndFanBraces');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), sunshadeSteel, facadeSunshades, 'HSBCCurtainWallHorizontalSunshades');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), sunshadeSteel, facadeFins, 'HSBCCurtainWallVerticalFins');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), stairBlueGlass, serviceGlassStrips, 'HSBCServiceCoreBlueGlazingStrips', { castShadow: false });
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), claddingSeam, claddingSeams, 'HSBCAluminiumPanelSeams');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), steel, crownMullions, 'HSBCCrownVerticalMullions');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), steel, crownFins, 'HSBCCrownCurvedEndFins');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), dark, crownRimPanels, 'HSBCCrownRimPanels');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), dark, stairWindows, 'HSBCEscapeStairWindows', { castShadow: false });
  addInstances(group, createStairWindowGeometry(), stairGlass, stairArchWindows, 'HSBCRoundedStairLandingWindows', { castShadow: false });
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), steel, beams, 'HSBCInvertedVSuspensionTrusses');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), dark, darkBeams, 'HSBCSuspendersEscalatorsAndCraneCables');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), steel, escalatorSteps, 'HSBCEscalatorSteps');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), warmLight, lightBoxes, 'HSBCPlazaLights', { castShadow: false });
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), plinthStone, stoneBoxes, 'HSBCLionStonePlinths');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), bronze, bronzeBoxes, 'HSBCBronzeLionBasePlates');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), greenery, greenBoxes, 'HSBCGardenTerraces', { castShadow: false });
  addInstances(group, new THREE.CylinderGeometry(0.68, 0.68, 1, 16), steel, masts, 'HSBCExposedSteelMasts');
  addInstances(group, new THREE.CylinderGeometry(0.72, 0.72, 1, 16), steel, mastCollars, 'HSBCMastCollarJoints');

  const colliders = [];
  for (const bay of HSBC_BAYS) {
    colliders.push(hsbcLocalCollider({
      x: 0, z: bay.z, w: HSBC_FRAME_WIDTH, d: bay.depth,
      minY: HSBC_BANKING_HALL_BASE, maxY: bay.roofY + (bay.floors === 44 ? HSBC_HEIGHT - HSBC_MAIN_ROOF_Y : 0.4)
    }));
    for (const side of [-1, 1]) {
      colliders.push(hsbcLocalCollider({
        x: side * serviceX, z: bay.z, w: serviceWidth, d: 5.2, minY: 0, maxY: HSBC_BANKING_HALL_BASE
      }));
    }
  }
  for (const side of [-1, 1]) {
    colliders.push(hsbcLocalCollider({
      x: side * entranceSideX, z: HSBC_ENTRANCE.z, w: entranceSideWidth, d: 0.32,
      minY: 0, maxY: HSBC_ENTRANCE.height
    }));
  }
  colliders.push(hsbcLocalCollider({
    x: 0, z: HSBC_ENTRANCE.z, w: HSBC_ENTRANCE.width, d: 0.32,
    minY: HSBC_ENTRANCE.doorHeight, maxY: HSBC_ENTRANCE.height
  }));
  for (const boundary of boundaries) {
    for (const x of HSBC_MAST_X) {
      colliders.push(hsbcLocalCollider({ x, z: boundary.z, w: 1.48, d: 1.48, minY: 0, maxY: boundary.roofY + 4.2 }));
    }
  }
  for (const site of HSBC_LION_SITES) {
    colliders.push(hsbcLocalCollider({ x: site.x, z: site.z, w: 3.6, d: 2.8, minY: 0, maxY: 3.1 }));
  }

  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }
  root.add(group);
  const stats = {
    hsbcGroundOffset: groundOffset,
    hsbcLandmarks: 1,
    hsbcSteppedBays: HSBC_BAYS.length,
    hsbcStoreys: HSBC_BAYS.reduce((sum, bay) => sum + bay.floors, 0),
    hsbcMasts: masts.length,
    hsbcSuspensionLevels: hsbcSuspensionLevelsForRoof(HSBC_MAIN_ROOF_Y).length,
    hsbcStairLadders: HSBC_BAYS.length * 4,
    hsbcStairLadderLandings: ladderLandings.length,
    hsbcStairLandingModules: stairArchWindows.length,
    hsbcStairLadderBraces: ladderBraces.length,
    hsbcFacadeSunshades: facadeSunshades.length,
    hsbcLions: 2,
    hsbcEscalators: 2,
    hsbcColliders: colliders.length
  };
  group.userData.stats = stats;
  const siteBounds = hsbcLocalCollider({ x: 0, z: 0, w: HSBC_SITE.w, d: HSBC_SITE.d, minY: 0, maxY: HSBC_HEIGHT });
  const landmark = {
    name: HSBC_SITE.name,
    englishName: HSBC_SITE.englishName,
    x: HSBC_SITE.x, z: HSBC_SITE.z, w: HSBC_SITE.w, d: HSBC_SITE.d, h: HSBC_HEIGHT,
    ry: HSBC_SITE.ry,
    bounds: {
      minX: siteBounds.minX, maxX: siteBounds.maxX,
      minZ: siteBounds.minZ, maxZ: siteBounds.maxZ
    }
  };
  return { group, colliders, landmarks: [landmark], stats, groundOffset, plazaTop: HSBC_PLAZA_TOP + groundOffset };
}
