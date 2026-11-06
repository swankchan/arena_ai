import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  color, dot, float, fract, fwidth, mix, positionLocal,
  sin, smoothstep, step, texture, uv, vec2
} from 'three/tsl';
import { cityUniforms, facadeCell, filteredPulse, createFacadeBoxes, WALL_KINDS } from '../../tsl-materials.js';
import {
  HSBC_SITE, HSBC_HEIGHT, HSBC_ROOF_SIGN, HSBC_PLAZA_TOP,
  HSBC_BANKING_HALL_BASE, HSBC_FLOOR_HEIGHT, HSBC_FRAME_WIDTH,
  HSBC_GLASS_WIDTH, HSBC_BAYS, HSBC_MAIN_BAY, HSBC_MAIN_ROOF_Y,
  HSBC_ENTRANCE, HSBC_LION_SITES, HSBC_ESCALATOR, HSBC_MAST_X,
  hsbcSuspensionLevelsForRoof, hsbcWorldToLocal, hsbcLocalCollider
} from './hsbc-headquarters-architecture.js';

// This renderer is a clean reconstruction of the building, not an edit of the former mesh hierarchy.
// Geography and the agreed visual storey proportions live in the pure architecture module; every piece
// of Three.js geometry below is authored from those dimensions and the photographic references.

function nightAmount() {
  return smoothstep(0.7, 1.45, cityUniforms.uInteriorGlow);
}

function facadeRandom(id, seed = 0) {
  return fract(sin(dot(id, vec2(127.1, 311.7)).add(11.73 + seed)).mul(43758.5453));
}

function createHsbcCurtainWallMaterial({ entrance = false } = {}) {
  const material = new THREE.MeshStandardNodeMaterial({ metalness: 0.38, roughness: 0.24, envMapIntensity: 0.42 });
  const { cellId, cellUV, fw, isRoof, partial, coping } = facadeCell(1.6, HSBC_FLOOR_HEIGHT, true);
  const pane = filteredPulse(cellUV.x, 0.025, 0.975, fw.x)
    .mul(filteredPulse(cellUV.y, 0.12, 0.97, fw.y))
    .mul(float(1).sub(isRoof)).mul(float(1).sub(partial)).mul(float(1).sub(coping));
  const a = facadeRandom(cellId), b = facadeRandom(cellId, 7.4);
  const reflected = mix(color(entrance ? 0x35494c : 0x244957), color(0x89a8b2), b.mul(0.48));
  const glass = reflected.mul(mix(float(0.86), float(1.12), a));
  material.colorNode = mix(mix(color(0x73848a), glass, pane), color(0x26343a), isRoof);
  material.roughnessNode = mix(float(0.46), float(0.22), pane);
  const lamps = mix(color(0xd6e2e3), color(0xffd59a), step(0.55, b));
  material.emissiveNode = entrance
    ? color(0xffd9a0).mul(pane).mul(nightAmount()).mul(0.16)
    : lamps.mul(step(0.87, a)).mul(pane).mul(nightAmount()).mul(0.78);
  return material;
}

function createHsbcPlazaMaterial() {
  const material = new THREE.MeshStandardNodeMaterial({ roughness: 0.91, metalness: 0.025, envMapIntensity: 0.18 });
  const x = positionLocal.x.div(2.4), z = positionLocal.z.div(2.4);
  const pavers = filteredPulse(fract(x), 0.012, 0.988, fwidth(x))
    .mul(filteredPulse(fract(z), 0.012, 0.988, fwidth(z)));
  const variation = fract(sin(dot(positionLocal.xz, vec2(12.7, 31.9))).mul(27.31));
  const stone = mix(color(0x99988f), color(0xaaa89e), variation.mul(0.24));
  material.colorNode = mix(color(0x6e6d68), stone, pavers);
  material.roughnessNode = mix(float(0.96), float(0.86), pavers);
  return material;
}

function litMaterial(hex, emissiveHex, strength) {
  const material = new THREE.MeshStandardNodeMaterial({ color: hex, roughness: 0.42, metalness: 0.62 });
  material.emissiveNode = color(emissiveHex).mul(nightAmount().mul(strength));
  return material;
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
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = name;
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  mesh.frustumCulled = false;
  group.add(mesh);
  return mesh;
}

function beamTransform(a, b, width, depth = width) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const direction = end.clone().sub(start), length = direction.length();
  if (length < 1e-5) return null;
  const midpoint = start.add(end).multiplyScalar(0.5);
  return {
    x: midpoint.x, y: midpoint.y, z: midpoint.z,
    sx: width, sy: length, sz: depth,
    quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
  };
}

function queueBeam(list, a, b, width, depth = width) {
  const transform = beamTransform(a, b, width, depth);
  if (transform) list.push(transform);
}

function createIBeamGeometry() {
  return mergeGeometries([
    new THREE.BoxGeometry(0.2, 1, 0.78),
    new THREE.BoxGeometry(1, 1, 0.16).translate(0, 0, -0.39),
    new THREE.BoxGeometry(1, 1, 0.16).translate(0, 0, 0.39)
  ], false);
}

function createHsbcMastGeometry() {
  const chords = [];
  for (const x of [-0.36, 0.36]) {
    for (const z of [-0.36, 0.36]) chords.push(new THREE.BoxGeometry(0.28, 1, 0.28).translate(x, 0, z));
  }
  return mergeGeometries(chords, false);
}

function createMastCollarGeometry() {
  return mergeGeometries([
    new THREE.BoxGeometry(1.12, 1, 0.16).translate(0, 0, -0.48),
    new THREE.BoxGeometry(1.12, 1, 0.16).translate(0, 0, 0.48),
    new THREE.BoxGeometry(0.16, 1, 0.8).translate(-0.48, 0, 0),
    new THREE.BoxGeometry(0.16, 1, 0.8).translate(0.48, 0, 0)
  ], false);
}

function createGussetGeometry() {
  const shape = new THREE.Shape();
  const points = [[-0.82, -0.36], [-0.52, -0.68], [0.52, -0.68], [0.82, -0.36],
    [0.82, 0.36], [0.52, 0.68], [-0.52, 0.68], [-0.82, 0.36]];
  points.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y));
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false }).translate(0, 0, -0.07);
}

function createStairWindowGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.5);
  shape.lineTo(0.5, -0.5);
  shape.lineTo(0.5, 0.08);
  shape.absarc(0, 0.08, 0.5, 0, Math.PI, false);
  shape.lineTo(-0.5, -0.5);
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 20);
}

function createStairArchGeometry(radius = 0.035) {
  const points = [new THREE.Vector3(-0.5, -0.5, 0), new THREE.Vector3(-0.5, 0.08, 0)];
  for (let i = 0; i <= 20; i++) {
    const angle = Math.PI - i * Math.PI / 20;
    points.push(new THREE.Vector3(Math.cos(angle) * 0.5, 0.08 + Math.sin(angle) * 0.5, 0));
  }
  points.push(new THREE.Vector3(0.5, -0.5, 0));
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'centripetal'), 42, radius, 6, false);
}

function createCrownGeometry() {
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, 18, 5.1, 0, Math.PI * 2, false, 0);
  const hole = new THREE.Path();
  hole.absellipse(0, 0, 15.7, 2.85, 0, Math.PI * 2, true, 0);
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1.45, bevelEnabled: false, curveSegments: 64 });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 173.25, HSBC_MAIN_BAY.z);
  return geometry;
}

function drawHsbcDevice(ctx, ox, oy, width, foreground, background = null, height = width) {
  const point = ([x, y]) => [ox + x * width, oy + y * height];
  const polygon = (vertices, fill) => {
    ctx.beginPath();
    vertices.forEach((vertex, index) => {
      const [x, y] = point(vertex);
      if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    });
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  };
  if (background) polygon([[0.25, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0.25, 1], [0, 0.5]], background);
  // four outer triangles around a negative-space cross form the HSBC device.
  for (const triangle of [
    [[0.25, 0], [0.75, 0], [0.5, 0.5]], [[0.75, 0], [1, 0.5], [0.75, 1]],
    [[0.75, 1], [0.25, 1], [0.5, 0.5]], [[0.25, 1], [0, 0.5], [0.25, 0]]
  ]) polygon(triangle, foreground);
}

function createHsbcSignTexture() {
  const canvas = document.createElement('canvas');
  const { textureWidth, textureHeight, deviceWidth, deviceHeight } = HSBC_ROOF_SIGN;
  canvas.width = textureWidth; canvas.height = textureHeight;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, textureWidth, textureHeight);
  drawHsbcDevice(ctx, (textureWidth - deviceWidth) / 2, (textureHeight - deviceHeight) / 2,
    deviceWidth, '#db0011', '#ffffff', deviceHeight);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  return map;
}

function createEntranceSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 224;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 1024, 224);
  ctx.fillStyle = '#b9a262'; ctx.textBaseline = 'middle';
  ctx.font = '600 116px Arial, Helvetica, sans-serif'; ctx.fillText('HSBC', 54, 116);
  drawHsbcDevice(ctx, 410, 38, 148, '#b9a262');
  ctx.font = '700 112px "Noto Sans TC", "Microsoft JhengHei", sans-serif'; ctx.fillText('滙豐', 620, 116);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  return map;
}

function signMaterial(map, entrance = false) {
  const material = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, toneMapped: false });
  const texel = texture(map, uv());
  material.colorNode = entrance ? mix(texel.rgb, color(0xffd88a), nightAmount().mul(0.35)) : texel.rgb;
  material.opacityNode = texel.a;
  return material;
}

function createPlazaGeometry() {
  const shape = new THREE.Shape();
  for (let i = 0; i + 1 < HSBC_SITE.ring.length; i += 2) {
    const point = hsbcWorldToLocal(HSBC_SITE.ring[i], HSBC_SITE.ring[i + 1]);
    if (!i) shape.moveTo(point.x, -point.z); else shape.lineTo(point.x, -point.z);
  }
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, HSBC_PLAZA_TOP, 0);
  return geometry;
}

function addEscalatorGlass(group, material, start, end) {
  const dx = end.x - start.x, dz = end.z - start.z, length = Math.hypot(dx, dz);
  const nx = dz / length, nz = -dx / length, positions = [];
  for (const side of [-1, 1]) {
    const ox = side * 0.7 * nx, oz = side * 0.7 * nz;
    const a = [start.x + ox, start.y + 0.3, start.z + oz];
    const b = [end.x + ox, end.y + 0.3, end.z + oz];
    const c = [end.x + ox, end.y + 1.3, end.z + oz];
    const d = [start.x + ox, start.y + 1.3, start.z + oz];
    positions.push(...a, ...b, ...c, ...a, ...c, ...d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'HSBCEscalatorGlass'; group.add(mesh);
}

function sculptLion({ openMouth, reclining, tailSide }) {
  const body = [], mane = [], recess = [];
  const sphere = new THREE.SphereGeometry(1, 14, 10);
  function place(list, geometry, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
    const clone = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(...scale)
    );
    clone.applyMatrix4(matrix); list.push(clone);
  }
  function ellipsoid(list, position, scale, rotation) { place(list, sphere, position, scale, rotation); }
  function limb(a, b, radius, list = body) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const direction = end.clone().sub(start), length = direction.length();
    const geometry = new THREE.CapsuleGeometry(radius, Math.max(0.02, length - radius * 2), 4, 8);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    const clone = geometry.toNonIndexed();
    clone.applyMatrix4(new THREE.Matrix4().compose(start.add(end).multiplyScalar(0.5), quaternion, new THREE.Vector3(1, 1, 1)));
    list.push(clone);
  }
  function paw(x, z, stretched = false) {
    ellipsoid(body, [x, 0.82, z], [0.3, 0.16, stretched ? 0.48 : 0.34]);
    for (let toe = 0; toe < 4; toe++) ellipsoid(body, [x + (toe - 1.5) * 0.13, 0.8, z - (stretched ? 0.4 : 0.27)], [0.08, 0.09, 0.16]);
  }

  const headY = reclining ? 2.04 : 2.28, headZ = reclining ? -0.88 : -0.72;
  ellipsoid(body, [0, 1.28, 0.18], [0.62, reclining ? 0.5 : 0.68, reclining ? 0.95 : 0.66]);
  ellipsoid(body, [0, 1.55, -0.36], [0.56, 0.66, 0.54]);
  for (const side of [-1, 1]) {
    ellipsoid(body, [side * 0.4, 1.06, 0.64], [0.4, 0.45, 0.48]);
    limb([side * 0.34, 1.47, -0.38], [side * 0.42, 0.94, reclining ? -1.26 : -0.8], 0.17);
    paw(side * 0.42, reclining ? -1.5 : -1.0, reclining);
    paw(side * 0.5, 0.78);
  }
  ellipsoid(mane, [0, headY - 0.04, headZ + 0.14], [0.67, 0.7, 0.42]);
  // Overlapping sculpted mane locks form a rounded silhouette rather than radial spikes.
  for (let ring = 0; ring < 3; ring++) {
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI * 2 / 12 + ring * 0.13;
      ellipsoid(mane,
        [Math.cos(angle) * (0.47 + ring * 0.035), headY + Math.sin(angle) * (0.5 - ring * 0.04), headZ + 0.02 + ring * 0.1],
        [0.13, 0.22, 0.12], [0, 0, -angle + Math.PI / 2]);
    }
  }
  ellipsoid(body, [0, headY, headZ - 0.14], [0.43, 0.45, 0.39]);
  for (const side of [-1, 1]) {
    ellipsoid(body, [side * 0.2, headY - 0.13, headZ - 0.45], [0.2, 0.17, 0.21]);
    ellipsoid(recess, [side * 0.17, headY + 0.12, headZ - 0.47], [0.06, 0.035, 0.018]);
    ellipsoid(body, [side * 0.32, headY + 0.38, headZ + 0.02], [0.14, 0.19, 0.09], [0, 0, side * -0.4]);
    limb([side * 0.09, headY + 0.22, headZ - 0.42], [side * 0.28, headY + 0.18, headZ - 0.4], 0.024);
  }
  ellipsoid(body, [0, headY - 0.04, headZ - 0.66], [0.18, 0.09, 0.11]);
  for (const side of [-1, 1]) ellipsoid(recess, [side * 0.065, headY - 0.04, headZ - 0.755], [0.022, 0.016, 0.012]);
  if (openMouth) {
    // A small recessed cavity is enclosed by connected bronze lips and jaw hinges.
    const mouthCavity = new THREE.Shape();
    mouthCavity.moveTo(-0.1, 0.055); mouthCavity.lineTo(0.1, 0.055);
    mouthCavity.lineTo(0.075, -0.06); mouthCavity.lineTo(-0.075, -0.06); mouthCavity.closePath();
    place(recess, new THREE.ShapeGeometry(mouthCavity), [0, headY - 0.28, headZ - 0.62], [1, 1, 1], [0, Math.PI, 0]);
    ellipsoid(body, [0, headY - 0.18, headZ - 0.54], [0.18, 0.05, 0.11]);
    ellipsoid(body, [0, headY - 0.37, headZ - 0.52], [0.19, 0.06, 0.14]);
    for (const side of [-1, 1]) limb([side * 0.15, headY - 0.18, headZ - 0.51], [side * 0.15, headY - 0.37, headZ - 0.51], 0.05);
  } else {
    limb([-0.16, headY - 0.28, headZ - 0.63], [0.16, headY - 0.28, headZ - 0.63], 0.013, recess);
    ellipsoid(body, [0, headY - 0.32, headZ - 0.46], [0.27, 0.12, 0.22]);
  }
  const tail = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.3, 0.78), new THREE.Vector3(tailSide * 0.52, 1.02, 1.18),
    new THREE.Vector3(tailSide * 0.86, 0.88, 0.82), new THREE.Vector3(tailSide * 0.76, 0.86, 0.25),
    new THREE.Vector3(tailSide * 0.55, 0.93, 0.08)
  ]);
  place(body, new THREE.TubeGeometry(tail, 28, 0.065, 7, false), [0, 0, 0]);
  ellipsoid(body, [tailSide * 0.55, 0.93, 0.08], [0.12, 0.1, 0.16]);
  return { bronze: mergeGeometries(body, false), mane: mergeGeometries(mane, false), details: mergeGeometries(recess, false) };
}

export function buildHsbcHeadquarters(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group();
  group.name = 'HongKongHSBCMainBuilding';
  group.userData.landmark = HSBC_SITE.name;
  group.position.set(HSBC_SITE.x, groundOffset, HSBC_SITE.z);
  group.rotation.y = HSBC_SITE.ry;

  const steel = litMaterial(0xa9b4b7, 0xc5d6dc, 0.045);
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x26343a, roughness: 0.35, metalness: 0.68 });
  const cladding = new THREE.MeshStandardMaterial({ color: 0xb7c0c1, roughness: 0.5, metalness: 0.4 });
  const seams = new THREE.MeshStandardMaterial({ color: 0x7c898d, roughness: 0.57, metalness: 0.38 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x13272f, roughness: 0.3, metalness: 0.42, side: THREE.DoubleSide });
  const blueGlass = litMaterial(0x28566a, 0x6b95a8, 0.055);
  const coffer = new THREE.MeshStandardMaterial({ color: 0xadb5b4, roughness: 0.72, metalness: 0.22 });
  const bronze = litMaterial(0x654638, 0x8b5a3c, 0.1);
  const mane = litMaterial(0x4f372d, 0x71503a, 0.07);
  const recess = new THREE.MeshStandardMaterial({ color: 0x191512, roughness: 0.67, metalness: 0.4 });
  const plinth = new THREE.MeshStandardMaterial({ color: 0x999c98, roughness: 0.9, metalness: 0.02 });
  const planting = new THREE.MeshStandardMaterial({ color: 0x35543b, roughness: 0.96 });
  const warmLight = new THREE.MeshStandardNodeMaterial({ color: 0x8b826c, roughness: 0.6 });
  warmLight.emissiveNode = color(0xffdca2).mul(nightAmount().mul(1.25));
  const glass = createHsbcCurtainWallMaterial(), entranceGlass = createHsbcCurtainWallMaterial({ entrance: true });
  const escalatorGlass = new THREE.MeshStandardMaterial({
    color: 0x789aa2, transparent: true, opacity: 0.3, depthWrite: false,
    roughness: 0.18, metalness: 0.14, side: THREE.DoubleSide
  });

  const batches = {
    cladding: [], steel: [], darkSteel: [], dark: [], seams: [], blueGlass: [], coffer: [], bronze: [], plinth: [], planting: [], light: [],
    trusses: [], suspenders: [], masts: [], collars: [], mastBraces: [], mastRungs: [], gussets: [], bolts: [], crossTies: [],
    floorPlates: [], fins: [], sunshades: [], stairFrames: [], stairLandings: [], stairWindows: [], stairArches: [], stairSoffits: [], stairMullions: [], stairBraces: [],
    escalatorSteps: [], crownMullions: [], crownFins: [], crownRimPanels: [], crownSignBackplates: [], crownSignSupports: []
  };
  const box = (list, x, y, z, sx, sy, sz, heading = 0) => list.push({ x, y, z, sx, sy, sz, heading });

  const plaza = new THREE.Mesh(createPlazaGeometry(), createHsbcPlazaMaterial());
  plaza.name = 'HSBCPublicPlaza'; plaza.receiveShadow = true; group.add(plaza);

  const faces = [WALL_KINDS.shop, WALL_KINDS.shop, WALL_KINDS.shop, WALL_KINDS.shop];
  const serviceWidth = (HSBC_FRAME_WIDTH - HSBC_GLASS_WIDTH) / 2;
  const serviceX = HSBC_GLASS_WIDTH / 2 + serviceWidth / 2;
  const ladderInnerX = HSBC_GLASS_WIDTH / 2;
  const ladderOuterX = Math.abs(HSBC_MAST_X[1]);
  const ladderWidth = ladderOuterX - ladderInnerX;
  const ladderCenterX = (ladderInnerX + ladderOuterX) / 2;
  const entranceSideWidth = (HSBC_ENTRANCE.width - HSBC_ENTRANCE.doorWidth) / 2;
  const entranceSideX = HSBC_ENTRANCE.doorWidth / 2 + entranceSideWidth / 2;

  for (const bay of HSBC_BAYS) {
    const height = bay.roofY - HSBC_BANKING_HALL_BASE;
    const centreY = HSBC_BANKING_HALL_BASE + height / 2;
    const facade = createFacadeBoxes(glass, [{
      x: 0, y: centreY, z: bay.z, w: HSBC_GLASS_WIDTH, h: height, d: bay.depth, faces, tone: 0.44
    }]);
    facade.name = `HSBCCurtainWallThreeSteppedBays_${bay.id}`;
    facade.castShadow = facade.receiveShadow = true; group.add(facade);

    for (const side of [-1, 1]) {
      box(batches.cladding, side * serviceX, centreY, bay.z, serviceWidth, height, bay.depth);
      box(batches.cladding, side * serviceX, HSBC_BANKING_HALL_BASE / 2, bay.z, serviceWidth, HSBC_BANKING_HALL_BASE, 5.2);
    }
    box(batches.steel, 0, HSBC_BANKING_HALL_BASE - 0.3, bay.z, HSBC_FRAME_WIDTH, 0.6, bay.depth);

    // Separate floor plates, deep facade fins and four sunshade blades per office floor make the wall a
    // three-dimensional curtain-wall assembly rather than a textured box.
    for (let floor = 0; floor <= bay.floors; floor++) {
      const y = Math.min(HSBC_BANKING_HALL_BASE + floor * HSBC_FLOOR_HEIGHT, bay.roofY);
      box(batches.floorPlates, 0, y, bay.z, HSBC_GLASS_WIDTH + 0.3, 0.12, bay.depth + 0.16);
      if (floor <= bay.floors) {
        for (const face of [-1, 1]) {
          for (const side of [-1, 1]) {
            box(batches.stairLandings, side * ladderCenterX, y + 0.18, bay.z + face * (bay.depth / 2 + 0.35), ladderWidth + 0.2, 0.24, 0.86);
          }
        }
      }
    }
    for (const face of [-1, 1]) {
      const surfaceZ = bay.z + face * (bay.depth / 2 + 0.18);
      for (let division = 0; division <= 20; division++) {
        box(batches.fins, -HSBC_GLASS_WIDTH / 2 + division * HSBC_GLASS_WIDTH / 20,
          centreY, surfaceZ, 0.07, height, 0.34);
      }
      box(batches.steel, 0, centreY, surfaceZ + face * 0.18, 0.34, height, 0.44);
      for (let floor = 0; floor < bay.floors; floor++) {
        const base = HSBC_BANKING_HALL_BASE + floor * HSBC_FLOOR_HEIGHT;
        for (const offset of [0.14, 0.92, 1.7, 2.48]) {
          box(batches.sunshades, 0, base + offset, surfaceZ + face * 0.08, HSBC_GLASS_WIDTH, offset === 0.14 ? 0.14 : 0.07, 0.48);
        }
      }
      for (const side of [-1, 1]) {
        for (const x of [ladderInnerX, ladderOuterX]) {
          box(batches.stairFrames, side * x, centreY, surfaceZ, 0.34, height, 0.34);
        }
        box(batches.blueGlass, side * (ladderOuterX + 0.64), centreY,
          bay.z + face * (bay.depth / 2 + 0.07), 0.78, height, 0.09);
        const panelInner = ladderOuterX + 1.18, panelOuter = HSBC_FRAME_WIDTH / 2;
        const panelX = side * (panelInner + panelOuter) / 2, panelWidth = panelOuter - panelInner;
        box(batches.seams, panelX, centreY, bay.z + face * (bay.depth / 2 + 0.045), 0.04, height, 0.05);
        for (let y = HSBC_BANKING_HALL_BASE + 7.2; y < bay.roofY; y += 7.2) {
          box(batches.seams, panelX, y, bay.z + face * (bay.depth / 2 + 0.045), panelWidth, 0.04, 0.05);
        }
      }
    }

    for (let floor = 0; floor < bay.floors; floor++) {
      const base = HSBC_BANKING_HALL_BASE + floor * HSBC_FLOOR_HEIGHT;
      const y = base + HSBC_FLOOR_HEIGHT / 2;
      const trussModule = hsbcSuspensionLevelsForRoof(bay.roofY).some((level) => Math.abs(base - level - 4.5) < 1.01);
      for (const face of [-1, 1]) {
        for (const side of [-1, 1]) {
          const x = side * ladderCenterX;
          const windowZ = bay.z + face * (bay.depth / 2 + 0.09);
          batches.stairWindows.push({ x, y, z: windowZ, sx: ladderWidth - 0.85, sy: 3.05 });
          batches.stairArches.push({ x, y, z: windowZ + face * 0.055, sx: ladderWidth - 0.85, sy: 3.05 });
          batches.stairSoffits.push({
            x, y, z: windowZ + face * 0.055, sx: ladderWidth - 0.85, sy: 3.05,
            quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI))
          });
          box(batches.blueGlass, x, y - 0.1, windowZ + face * 0.025, 1.18, 1.65, 0.08);
          for (const offset of [-0.3, 0.3]) box(batches.stairMullions, x + offset, y - 0.1, windowZ + face * 0.08, 0.055, 1.65, 0.1);
          const braceZ = bay.z + face * (bay.depth / 2 + 0.32);
          if (trussModule) {
            const half = (ladderWidth - 0.85) * 0.42;
            queueBeam(batches.stairBraces, [x - half, y - 0.92, braceZ], [x + half, y + 0.92, braceZ], 0.2);
            queueBeam(batches.stairBraces, [x + half, y - 0.92, braceZ], [x - half, y + 0.92, braceZ], 0.2);
          }
          if (floor === bay.floors - 1) {
            for (let spoke = 0; spoke <= 6; spoke++) {
              const angle = spoke * Math.PI / 6;
              queueBeam(batches.stairBraces, [x, y - 0.9, braceZ],
                [x + Math.cos(angle) * (ladderWidth - 0.85) * 0.42, y - 0.9 + Math.sin(angle) * 1.55, braceZ], 0.075);
            }
          }
        }
      }
      for (const side of [-1, 1]) {
        for (const zFactor of [-0.27, 0.27]) {
          box(batches.dark, side * (HSBC_FRAME_WIDTH / 2 + 0.07), y, bay.z + zFactor * bay.depth, 0.14, 1.12, 1.02);
        }
      }
    }

    for (let x = -27; x <= 27; x += 6) {
      for (const zOffset of [-6, -2, 2, 6]) {
        box(batches.coffer, x, HSBC_BANKING_HALL_BASE - 0.63, bay.z + zOffset, 4.65, 0.08, 2.65);
        box(batches.light, x, HSBC_BANKING_HALL_BASE - 0.68, bay.z + zOffset, 0.24, 0.06, 0.24);
      }
    }

    if (bay.floors < 44) {
      box(batches.steel, 0, bay.roofY + 0.12, bay.z, HSBC_FRAME_WIDTH, 0.24, bay.depth);
      for (const x of [-16, -5.3, 5.3, 16]) {
        box(batches.cladding, x, bay.roofY + 0.43, bay.z, 6.2, 0.62, 1.3);
        box(batches.planting, x, bay.roofY + 0.94, bay.z, 5.8, 0.55, 1.05);
      }
    }

    for (const level of hsbcSuspensionLevelsForRoof(bay.roofY)) {
      for (const face of [-1, 1]) {
        const z = bay.z + face * (bay.depth / 2 + 0.05);
        // The double-height reception band sits behind an I-section coat-hanger, not on its surface.
        box(batches.dark, 0, level + 1.25, z, HSBC_GLASS_WIDTH, 5.7, 0.12);
        queueBeam(batches.trusses, [-HSBC_FRAME_WIDTH / 2, level + 4.5, z], [HSBC_FRAME_WIDTH / 2, level + 4.5, z], 0.68, 0.78);
        queueBeam(batches.trusses, [HSBC_MAST_X[1], level + 4.5, z], [0, level, z], 0.96, 0.82);
        queueBeam(batches.trusses, [0, level, z], [HSBC_MAST_X[2], level + 4.5, z], 0.96, 0.82);
        for (const side of [-1, 1]) {
          const inner = side * Math.abs(HSBC_MAST_X[2]), outer = side * HSBC_FRAME_WIDTH / 2;
          queueBeam(batches.trusses, [outer, level + 0.2, z], [inner, level + 4.5, z], 0.58, 0.68);
        }
        const nodes = [HSBC_MAST_X[1], 0, HSBC_MAST_X[2], -HSBC_FRAME_WIDTH / 2, HSBC_FRAME_WIDTH / 2];
        for (const x of nodes) {
          const y = Math.abs(x) === HSBC_FRAME_WIDTH / 2 ? level + 0.2 : x === 0 ? level : level + 4.5;
          batches.gussets.push({ x, y, z: z + face * 0.48 });
          for (const [dx, dy] of [[-0.48, -0.25], [0, -0.42], [0.48, -0.25], [-0.48, 0.25], [0, 0.42], [0.48, 0.25]]) {
            batches.bolts.push({ x: x + dx, y: y + dy, z: z + face * 0.59 });
          }
          queueBeam(batches.crossTies, [x, y, bay.z - bay.depth / 2], [x, y, bay.z + bay.depth / 2], 0.26);
        }
        for (const x of [-8, 8]) queueBeam(batches.suspenders, [x, level - 7, z], [x, level, z], 0.15);
      }
      for (const side of [-1, 1]) {
        const x = side * HSBC_FRAME_WIDTH / 2;
        queueBeam(batches.trusses, [x, level + 4.5, bay.z - bay.depth / 2], [x, level + 4.5, bay.z + bay.depth / 2], 0.66);
        queueBeam(batches.trusses, [x, level + 4.5, bay.z - bay.depth / 2], [x, level, bay.z], 0.82);
        queueBeam(batches.trusses, [x, level, bay.z], [x, level + 4.5, bay.z + bay.depth / 2], 0.82);
      }
    }
  }

  const boundaries = Array.from({ length: HSBC_BAYS.length + 1 }, (_, index) => ({
    z: (index - HSBC_BAYS.length / 2) * ((HSBC_BAYS[0].depth + 0.35)),
    roofY: Math.max(HSBC_BAYS[index - 1]?.roofY ?? 0, HSBC_BAYS[index]?.roofY ?? 0)
  }));
  for (const boundary of boundaries) {
    const height = boundary.roofY + 4.2 - HSBC_PLAZA_TOP;
    for (const x of HSBC_MAST_X) {
      batches.masts.push({ x, y: HSBC_PLAZA_TOP + height / 2, z: boundary.z, sy: height });
      for (let y = 3.6; y < boundary.roofY + 4.2; y += 3.6) {
        batches.collars.push({ x, y, z: boundary.z, sy: 0.12 });
        for (const face of [-1, 1]) {
          const z = boundary.z + face * 0.36;
          queueBeam(batches.mastBraces, [x - 0.36, y - 1.65, z], [x + 0.36, y + 1.65, z], 0.09);
          queueBeam(batches.mastBraces, [x + 0.36, y - 1.65, z], [x - 0.36, y + 1.65, z], 0.09);
        }
      }
      for (const offset of [-0.28, 0.28]) box(batches.dark, x + 0.69, HSBC_PLAZA_TOP + height / 2, boundary.z + offset, 0.12, height, 0.09);
      for (let y = 1.2; y < boundary.roofY + 4.2; y += 1.8) box(batches.mastRungs, x + 0.69, y, boundary.z, 0.12, 0.055, 0.68);
    }
  }

  const entranceBoxes = [];
  for (const side of [-1, 1]) entranceBoxes.push({
    x: side * entranceSideX, y: HSBC_ENTRANCE.height / 2, z: HSBC_ENTRANCE.z,
    w: entranceSideWidth, h: HSBC_ENTRANCE.height, d: 0.32, faces, tone: 0.44
  });
  entranceBoxes.push({
    x: 0, y: HSBC_ENTRANCE.doorHeight + (HSBC_ENTRANCE.height - HSBC_ENTRANCE.doorHeight) / 2,
    z: HSBC_ENTRANCE.z, w: HSBC_ENTRANCE.width, h: HSBC_ENTRANCE.height - HSBC_ENTRANCE.doorHeight,
    d: 0.32, faces, tone: 0.44
  });
  const entranceFacade = createFacadeBoxes(entranceGlass, entranceBoxes);
  entranceFacade.name = 'HSBCGroundFloorEntranceGlazing'; group.add(entranceFacade);

  const dx = HSBC_ESCALATOR.endX - HSBC_ESCALATOR.startX, dz = HSBC_ESCALATOR.endZ - HSBC_ESCALATOR.startZ;
  const planLength = Math.hypot(dx, dz), nx = dz / planLength, nz = -dx / planLength;
  const heading = Math.atan2(dx, dz);
  for (const lane of [-1, 1]) {
    const offset = lane * HSBC_ESCALATOR.laneOffset;
    const start = { x: HSBC_ESCALATOR.startX + nx * offset, y: HSBC_ESCALATOR.startY, z: HSBC_ESCALATOR.startZ + nz * offset };
    const end = { x: HSBC_ESCALATOR.endX + nx * offset, y: HSBC_ESCALATOR.endY, z: HSBC_ESCALATOR.endZ + nz * offset };
    queueBeam(batches.suspenders, [start.x, start.y, start.z], [end.x, end.y, end.z], 1.12, 0.3);
    for (let stepIndex = 0; stepIndex <= 30; stepIndex++) {
      const t = stepIndex / 30;
      batches.escalatorSteps.push({
        x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t + 0.25,
        z: start.z + (end.z - start.z) * t, sx: 1.08, sy: 0.13, sz: 0.46, heading
      });
    }
    addEscalatorGlass(group, escalatorGlass, start, end);
  }

  const lionsGroup = new THREE.Group(); lionsGroup.name = 'HSBCBronzeLions'; group.add(lionsGroup);
  for (const site of HSBC_LION_SITES) {
    box(batches.plinth, site.x, 0.275, site.z, 3.6, 0.55, 2.8);
    box(batches.bronze, site.x, 0.64, site.z, 3.25, 0.18, 2.45);
    const openMouth = site.id === 'left';
    const geometry = sculptLion({ openMouth, reclining: !openMouth, tailSide: openMouth ? -1 : 1 });
    const lion = new THREE.Group();
    lion.position.set(site.x, 0, site.z); lion.rotation.y = site.heading;
    lion.name = openMouth ? 'HSBCLeftBronzeLionOpenMouth' : 'HSBCRightBronzeLionReclining';
    for (const [part, material] of [['bronze', bronze], ['mane', mane], ['details', recess]]) {
      const mesh = new THREE.Mesh(geometry[part], material);
      mesh.name = `${lion.name}${part[0].toUpperCase()}${part.slice(1)}`;
      mesh.castShadow = mesh.receiveShadow = true; lion.add(mesh);
    }
    lionsGroup.add(lion);
  }

  const crown = new THREE.Mesh(createCrownGeometry(), darkSteel);
  crown.name = 'HSBCOvalSunscoopCrown'; crown.castShadow = true; group.add(crown);
  const crownGlass = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 5.2, 64, 1, true), blueGlass);
  crownGlass.position.set(0, 171.8, HSBC_MAIN_BAY.z); crownGlass.scale.set(15.5, 1, 2.65);
  crownGlass.name = 'HSBCCrownGlass'; group.add(crownGlass);
  for (let i = 0; i < 56; i++) {
    const angle = i * Math.PI * 2 / 56, x = Math.cos(angle) * 15.5, z = HSBC_MAIN_BAY.z + Math.sin(angle) * 2.65;
    box(batches.crownMullions, x, 171.8, z, 0.075, 5.2, 0.075);
    if (Math.abs(Math.cos(angle)) > 0.55) box(batches.crownFins, x, 176.5, z, 0.06, 3.4, 0.06);
  }
  for (const face of [-1, 1]) {
    for (let i = -11; i <= 11; i++) box(batches.crownRimPanels, i * 1.15, 174.15, HSBC_MAIN_BAY.z + face * 5.03, 0.42, 0.24, 0.07);
    const z = HSBC_MAIN_BAY.z + face * 4.91;
    box(batches.crownSignBackplates, 0, 177, z, 5.5, 2.8, 0.12);
    for (const x of [-2.45, 2.45]) queueBeam(batches.crownSignSupports, [x, 174.65, HSBC_MAIN_BAY.z + face * 4.25], [x, 178.15, z], 0.13);
  }
  const roofSign = createHsbcSignTexture(), roofSignMaterial = signMaterial(roofSign);
  for (const face of [-1, 1]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(HSBC_ROOF_SIGN.planeWidth, HSBC_ROOF_SIGN.planeHeight), roofSignMaterial);
    sign.position.set(0, 177, HSBC_MAIN_BAY.z + face * 5.04);
    if (face < 0) sign.rotation.y = Math.PI;
    sign.name = face < 0 ? 'HSBCNorthSign' : 'HSBCSouthSign'; group.add(sign);
  }
  const entranceSign = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 2.35), signMaterial(createEntranceSignTexture(), true));
  entranceSign.position.set(-10.5, 6.15, HSBC_ENTRANCE.z - 0.18); entranceSign.rotation.y = Math.PI;
  entranceSign.name = 'HSBCGroundEntranceGoldSign'; group.add(entranceSign);

  for (const crane of [
    { x: -27, z: HSBC_MAIN_BAY.z - 4.5, y: 174.2, direction: -1 },
    { x: 27, z: HSBC_MAIN_BAY.z + 4.5, y: 171.2, direction: 1 }
  ]) {
    box(batches.steel, crane.x, crane.y - 2, crane.z, 1.3, 4, 1.5);
    queueBeam(batches.trusses, [crane.x, crane.y, crane.z], [crane.x + crane.direction * 13, crane.y, crane.z], 0.72);
    queueBeam(batches.trusses, [crane.x, crane.y + 2.2, crane.z], [crane.x + crane.direction * 10, crane.y, crane.z], 0.22);
    queueBeam(batches.suspenders, [crane.x + crane.direction * 11.5, crane.y, crane.z], [crane.x + crane.direction * 11.5, crane.y - 6.2, crane.z], 0.08);
  }

  const unitBox = new THREE.BoxGeometry(1, 1, 1), iBeam = createIBeamGeometry();
  addInstances(group, unitBox, cladding, batches.cladding, 'HSBCAluminiumServiceCores');
  addInstances(group, unitBox, steel, batches.steel, 'HSBCUnderbellyTerracesAndCranes');
  addInstances(group, unitBox, steel, batches.floorPlates, 'HSBCIndependentOfficeFloorPlates');
  addInstances(group, unitBox, coffer, batches.coffer, 'HSBCUnderbellyCofferPanels');
  addInstances(group, unitBox, dark, batches.dark, 'HSBCServiceGlazingAndMastLadders');
  addInstances(group, unitBox, darkSteel, batches.darkSteel, 'HSBCDarkStructuralSteel');
  addInstances(group, unitBox, seams, batches.seams, 'HSBCAluminiumPanelSeams');
  addInstances(group, unitBox, steel, batches.fins, 'HSBCCurtainWallVerticalFins');
  addInstances(group, unitBox, steel, batches.sunshades, 'HSBCCurtainWallHorizontalSunshades');
  addInstances(group, unitBox, steel, batches.stairFrames, 'HSBCExternalStairLadderRails');
  addInstances(group, unitBox, steel, batches.stairLandings, 'HSBCExternalStairLadderLandings');
  addInstances(group, createStairWindowGeometry(), dark, batches.stairWindows, 'HSBCRoundedStairLandingWindows', { castShadow: false });
  addInstances(group, createStairArchGeometry(0.035), steel, batches.stairArches, 'HSBCStairLandingArches');
  addInstances(group, createStairArchGeometry(0.045), steel, batches.stairSoffits, 'HSBCStairLandingCurvedSoffits');
  addInstances(group, unitBox, blueGlass, batches.blueGlass, 'HSBCServiceCoreBlueGlazingStrips', { castShadow: false });
  addInstances(group, unitBox, steel, batches.stairMullions, 'HSBCStairLandingWindowMullions');
  addInstances(group, unitBox, steel, batches.stairBraces, 'HSBCStairLandingXAndFanBraces');
  addInstances(group, iBeam, steel, batches.trusses, 'HSBCInvertedVSuspensionTrusses');
  addInstances(group, unitBox, darkSteel, batches.suspenders, 'HSBCSuspendersEscalatorsAndCraneCables');
  addInstances(group, createGussetGeometry(), steel, batches.gussets, 'HSBCTrussOctagonalGussetPlates');
  addInstances(group, new THREE.CylinderGeometry(0.07, 0.07, 0.1, 8).rotateX(Math.PI / 2), darkSteel, batches.bolts, 'HSBCTrussGussetBolts');
  addInstances(group, unitBox, steel, batches.crossTies, 'HSBCTrussTransverseTies');
  addInstances(group, createHsbcMastGeometry(), steel, batches.masts, 'HSBCExposedSteelMasts');
  addInstances(group, createMastCollarGeometry(), steel, batches.collars, 'HSBCMastCollarJoints');
  addInstances(group, unitBox, darkSteel, batches.mastBraces, 'HSBCStructuralMastLacing');
  addInstances(group, unitBox, darkSteel, batches.mastRungs, 'HSBCMastAccessLadderRungs');
  addInstances(group, unitBox, darkSteel, batches.escalatorSteps, 'HSBCEscalatorSteps');
  addInstances(group, unitBox, warmLight, batches.light, 'HSBCPlazaLights', { castShadow: false });
  addInstances(group, unitBox, plinth, batches.plinth, 'HSBCLionStonePlinths');
  addInstances(group, unitBox, bronze, batches.bronze, 'HSBCBronzeLionBasePlates');
  addInstances(group, unitBox, planting, batches.planting, 'HSBCGardenTerraces', { castShadow: false });
  addInstances(group, unitBox, steel, batches.crownMullions, 'HSBCCrownVerticalMullions');
  addInstances(group, unitBox, steel, batches.crownFins, 'HSBCCrownCurvedEndFins');
  addInstances(group, unitBox, darkSteel, batches.crownRimPanels, 'HSBCCrownRimPanels');
  addInstances(group, unitBox, darkSteel, batches.crownSignBackplates, 'HSBCCrownSignBackplates');
  addInstances(group, unitBox, steel, batches.crownSignSupports, 'HSBCCrownSignSupports');

  const colliders = [];
  for (const bay of HSBC_BAYS) {
    colliders.push(hsbcLocalCollider({
      x: 0, z: bay.z, w: HSBC_FRAME_WIDTH, d: bay.depth,
      minY: HSBC_BANKING_HALL_BASE, maxY: bay.roofY + (bay.floors === 44 ? HSBC_HEIGHT - HSBC_MAIN_ROOF_Y : 0.4)
    }));
    for (const side of [-1, 1]) colliders.push(hsbcLocalCollider({
      x: side * serviceX, z: bay.z, w: serviceWidth, d: 5.2, minY: 0, maxY: HSBC_BANKING_HALL_BASE
    }));
  }
  for (const side of [-1, 1]) colliders.push(hsbcLocalCollider({
    x: side * entranceSideX, z: HSBC_ENTRANCE.z, w: entranceSideWidth, d: 0.32, minY: 0, maxY: HSBC_ENTRANCE.height
  }));
  colliders.push(hsbcLocalCollider({
    x: 0, z: HSBC_ENTRANCE.z, w: HSBC_ENTRANCE.width, d: 0.32,
    minY: HSBC_ENTRANCE.doorHeight, maxY: HSBC_ENTRANCE.height
  }));
  for (const boundary of boundaries) {
    for (const x of HSBC_MAST_X) colliders.push(hsbcLocalCollider({ x, z: boundary.z, w: 1.48, d: 1.48, minY: 0, maxY: boundary.roofY + 4.2 }));
  }
  for (const site of HSBC_LION_SITES) colliders.push(hsbcLocalCollider({ x: site.x, z: site.z, w: 3.6, d: 2.8, minY: 0, maxY: 3.1 }));
  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }

  root.add(group);
  const stats = {
    hsbcGroundOffset: groundOffset, hsbcLandmarks: 1, hsbcModelGeneration: 2,
    hsbcSteppedBays: HSBC_BAYS.length, hsbcStoreys: HSBC_BAYS.reduce((sum, bay) => sum + bay.floors, 0),
    hsbcMasts: batches.masts.length, hsbcMastLacing: batches.mastBraces.length,
    hsbcMastAccessRungs: batches.mastRungs.length, hsbcTrussGussetPlates: batches.gussets.length,
    hsbcTrussGussetBolts: batches.bolts.length, hsbcTrussTransverseTies: batches.crossTies.length,
    hsbcSuspensionLevels: hsbcSuspensionLevelsForRoof(HSBC_MAIN_ROOF_Y).length,
    hsbcStairLadders: HSBC_BAYS.length * 4, hsbcStairLadderLandings: batches.stairLandings.length,
    hsbcStairLandingModules: batches.stairWindows.length, hsbcStairLadderBraces: batches.stairBraces.length,
    hsbcFacadeSunshades: batches.sunshades.length, hsbcIndependentFloorPlates: batches.floorPlates.length,
    hsbcLions: 2, hsbcEscalators: 2, hsbcColliders: colliders.length
  };
  group.userData.stats = stats;
  const siteBounds = hsbcLocalCollider({ x: 0, z: 0, w: HSBC_SITE.w, d: HSBC_SITE.d, minY: 0, maxY: HSBC_HEIGHT });
  const landmark = {
    name: HSBC_SITE.name, englishName: HSBC_SITE.englishName,
    x: HSBC_SITE.x, z: HSBC_SITE.z, w: HSBC_SITE.w, d: HSBC_SITE.d, h: HSBC_HEIGHT, ry: HSBC_SITE.ry,
    bounds: { minX: siteBounds.minX, maxX: siteBounds.maxX, minZ: siteBounds.minZ, maxZ: siteBounds.maxZ }
  };
  return { group, colliders, landmarks: [landmark], stats, groundOffset, plazaTop: HSBC_PLAZA_TOP + groundOffset };
}
