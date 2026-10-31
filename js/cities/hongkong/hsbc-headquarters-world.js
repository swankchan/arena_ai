import * as THREE from 'three/webgpu';
import { color, dot, float, fract, mix, sin, smoothstep, step, texture, uv, vec2 } from 'three/tsl';
import { cityUniforms, facadeCell, filteredPulse, createFacadeBoxes, WALL_KINDS } from '../../tsl-materials.js';
import {
  HSBC_SITE,
  HSBC_HEIGHT,
  HSBC_PLAZA_TOP,
  HSBC_BANKING_HALL_BASE,
  HSBC_FLOOR_HEIGHT,
  HSBC_FRAME_WIDTH,
  HSBC_GLASS_WIDTH,
  HSBC_BAY_DEPTH,
  HSBC_BAYS,
  HSBC_MAIN_BAY,
  HSBC_MAIN_ROOF_Y,
  HSBC_MAST_X,
  hsbcSuspensionLevelsForRoof,
  hsbcWorldToLocal,
  hsbcLocalCollider
} from './hsbc-headquarters-architecture.js';

function nightAmount() {
  return smoothstep(0.7, 1.45, cityUniforms.uInteriorGlow);
}

function createHsbcCurtainWallMaterial() {
  // Office curtain wall rather than the generic residential shader: no apartment interiors or daytime lit rooms.
  const material = new THREE.MeshStandardNodeMaterial({ metalness: 0.32, roughness: 0.26, envMapIntensity: 0.35 });
  const { cellId, cellUV, fw, isRoof, partial, coping } = facadeCell(1.65, HSBC_FLOOR_HEIGHT, true);
  const paneMask = filteredPulse(cellUV.x, 0.035, 0.965, fw.x)
    .mul(filteredPulse(cellUV.y, 0.16, 0.965, fw.y))
    .mul(float(1).sub(isRoof)).mul(float(1).sub(partial)).mul(float(1).sub(coping));
  const random = fract(sin(dot(cellId, vec2(127.1, 311.7)).add(18.86)).mul(43758.5453));
  const randomB = fract(random.mul(17.17).add(0.37));
  const glass = color(0x3c4b4c).mul(mix(float(0.88), float(1.12), random));
  const frame = color(0x7f8e91);
  material.colorNode = mix(mix(frame, glass, paneMask), color(0x263237), isRoof);
  material.roughnessNode = mix(float(0.48), float(0.25), paneMask);
  const officeLight = mix(color(0xc4d6df), color(0xffd79b), step(0.48, randomB));
  material.emissiveNode = officeLight.mul(step(0.84, random)).mul(paneMask).mul(nightAmount()).mul(0.95);
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
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 6.4, bevelEnabled: false, curveSegments: 12 });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 172.4, HSBC_MAIN_BAY.z);
  return geometry;
}

function createStairWindowGeometry() {
  // Repeated rounded landing windows are a prominent vertical strip between each inner mast and the aluminium pier.
  const shape = new THREE.Shape();
  shape.moveTo(-0.43, -0.66);
  shape.lineTo(0.43, -0.66);
  shape.lineTo(0.43, 0.23);
  shape.absarc(0, 0.23, 0.43, 0, Math.PI, false);
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 8);
}

function createHsbcSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#202b31';
  ctx.font = '700 126px Arial, Helvetica, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('HSBC', 52, 101);
  // The red-and-white hexagonal device is drawn, not downloaded or traced into a bundled image.
  const ox = 772, oy = 22, s = 146;
  const points = [[0.25, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0.25, 1], [0, 0.5]];
  const centre = [0.5, 0.5];
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(ox + centre[0] * s, oy + centre[1] * s);
    ctx.lineTo(ox + points[i][0] * s, oy + points[i][1] * s);
    ctx.lineTo(ox + points[(i + 1) % 6][0] * s, oy + points[(i + 1) % 6][1] * s);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? '#db0011' : '#ffffff';
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
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

function addEscalatorGlass(group, material, x, start, end) {
  const positions = [];
  for (const side of [-1, 1]) {
    const px = x + side * 0.68;
    const a = [px, start.y + 0.25, start.z], b = [px, end.y + 0.25, end.z];
    const c = [px, end.y + 1.25, end.z], d = [px, start.y + 1.25, start.z];
    positions.push(...a, ...b, ...c, ...a, ...c, ...d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'HSBCEscalatorGlass';
  group.add(mesh);
}

export function buildHsbcHeadquarters(root) {
  const group = new THREE.Group();
  group.name = 'HongKongHSBCMainBuilding';
  group.userData.landmark = HSBC_SITE.name;
  group.position.set(HSBC_SITE.x, 0, HSBC_SITE.z);
  group.rotation.y = HSBC_SITE.ry;

  const steel = subtlyLitSteel();
  const cladding = new THREE.MeshStandardMaterial({ color: 0xb4bdbf, roughness: 0.5, metalness: 0.42 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14272e, roughness: 0.28, metalness: 0.44 });
  const stairGlass = new THREE.MeshStandardMaterial({
    color: 0x10252d, roughness: 0.3, metalness: 0.35, side: THREE.DoubleSide
  });
  const plazaMaterial = new THREE.MeshStandardMaterial({ color: 0x99988f, roughness: 0.94, metalness: 0.02 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x4c5140, roughness: 0.48, metalness: 0.72 });
  const bronzeMane = new THREE.MeshStandardMaterial({ color: 0x363d30, roughness: 0.58, metalness: 0.66 });
  const greenery = new THREE.MeshStandardMaterial({ color: 0x35563c, roughness: 0.96 });
  const escalatorGlass = new THREE.MeshStandardMaterial({
    color: 0x789aa2, transparent: true, opacity: 0.32, depthWrite: false,
    roughness: 0.18, metalness: 0.14, side: THREE.DoubleSide
  });
  const warmLight = new THREE.MeshStandardNodeMaterial({ color: 0x807b68, roughness: 0.6 });
  warmLight.emissiveNode = color(0xffdca2).mul(nightAmount().mul(1.4));
  const glass = createHsbcCurtainWallMaterial();

  const plaza = new THREE.Mesh(createPlazaGeometry(), plazaMaterial);
  plaza.name = 'HSBCPublicPlaza';
  plaza.receiveShadow = true;
  group.add(plaza);

  const claddingBoxes = [], steelBoxes = [], darkBoxes = [], lightBoxes = [], bronzeBoxes = [], greenBoxes = [];
  const beams = [], darkBeams = [], bronzeBeams = [], masts = [], stairWindows = [], stairArchWindows = [], escalatorSteps = [], lionBodies = [], lionManes = [];
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

  const serviceWidth = (HSBC_FRAME_WIDTH - HSBC_GLASS_WIDTH) * 0.5;
  const serviceX = HSBC_GLASS_WIDTH * 0.5 + serviceWidth * 0.5;
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
    for (let floor = 0; floor < bay.floors; floor++) {
      const y = HSBC_BANKING_HALL_BASE + (floor + 0.5) * HSBC_FLOOR_HEIGHT;
      for (const face of [-1, 1]) {
        for (const side of [-1, 1]) {
          stairArchWindows.push({
            x: side * (HSBC_GLASS_WIDTH * 0.5 + 1.15), y, z: bay.z + face * (bay.depth * 0.5 + 0.075)
          });
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
    for (const level of hsbcSuspensionLevelsForRoof(bay.roofY)) {
      for (const face of [-1, 1]) {
        const z = bay.z + face * bay.depth * 0.5;
        const innerLeft = HSBC_MAST_X[1], innerRight = HSBC_MAST_X[2];
        // A darker double-height reception band sits behind each coat-hanger truss, as in the supplied elevation.
        darkBoxes.push({ x: 0, y: level + 1.25, z: z + face * 0.04, sx: HSBC_GLASS_WIDTH, sy: 5.7, sz: 0.12 });
        beam(beams, [-HSBC_FRAME_WIDTH * 0.5, level + 4.5, z], [HSBC_FRAME_WIDTH * 0.5, level + 4.5, z], 0.62);
        beam(beams, [innerLeft, level + 4.5, z], [0, level, z], 0.82);
        beam(beams, [0, level, z], [innerRight, level + 4.5, z], 0.82);
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
      darkBoxes.push({ x: x + 0.54, y: HSBC_PLAZA_TOP + height * 0.5, z: boundary.z, sx: 0.13, sy: height, sz: 0.18 });
    }
  }

  // Paired escalators rise through the glazed underbelly from the north public plaza.
  for (const x of [-1.35, 1.35]) {
    const start = { y: 0.38, z: -HSBC_BAY_DEPTH * 1.37 };
    const end = { y: HSBC_BANKING_HALL_BASE - 0.25, z: -HSBC_BAY_DEPTH * 0.51 };
    beam(darkBeams, [x, start.y, start.z], [x, end.y, end.z], 1.12);
    for (const side of [-1, 1]) {
      beam(darkBeams, [x + side * 0.68, start.y + 1.18, start.z], [x + side * 0.68, end.y + 1.18, end.z], 0.1);
    }
    for (let step = 0; step <= 26; step++) {
      const t = step / 26;
      escalatorSteps.push({
        x, y: start.y + (end.y - start.y) * t + 0.25, z: start.z + (end.z - start.z) * t,
        sx: 1.08, sy: 0.13, sz: 0.52
      });
    }
    addEscalatorGlass(group, escalatorGlass, x, start, end);
  }
  for (const z of [-18, -12, -6, 0, 6, 12, 18]) {
    lightBoxes.push({ x: 0, y: HSBC_BANKING_HALL_BASE - 0.59, z, sx: 8.5, sy: 0.08, sz: 0.35 });
  }

  // Two small bronze lions face the harbour-side entrance, on separate plinths beside the escalators.
  for (const x of [-7.2, 7.2]) {
    const z = -HSBC_BAY_DEPTH * 1.35;
    bronzeBoxes.push({ x, y: 0.29, z, sx: 2.1, sy: 0.58, sz: 2.8 });
    lionBodies.push({ x, y: 1.08, z, sx: 0.67, sy: 0.55, sz: 1.02 });
    lionManes.push({ x, y: 1.5, z: z - 0.64, sx: 0.7, sy: 0.68, sz: 0.52 });
    lionBodies.push({ x, y: 1.48, z: z - 0.91, sx: 0.42, sy: 0.42, sz: 0.4 });
    lionBodies.push({ x, y: 1.4, z: z - 1.18, sx: 0.28, sy: 0.24, sz: 0.3 });
    for (const side of [-1, 1]) lionBodies.push({ x: x + side * 0.31, y: 1.85, z: z - 0.72, sx: 0.13, sy: 0.15, sz: 0.12 });
    for (const side of [-1, 1]) {
      for (const dz of [-0.48, 0.48]) bronzeBoxes.push({ x: x + side * 0.38, y: 0.67, z: z + dz, sx: 0.24, sy: 0.72, sz: 0.28 });
    }
    beam(bronzeBeams, [x, 1.16, z + 0.8], [x + 0.65, 1.45, z + 1.05], 0.12);
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

  const crown = new THREE.Mesh(createCrownGeometry(), cladding);
  crown.name = 'HSBCOvalSunscoopCrown';
  crown.castShadow = true;
  group.add(crown);
  const crownGlass = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 3.8, 32), dark);
  crownGlass.position.set(0, 174.4, HSBC_MAIN_BAY.z); crownGlass.scale.set(15.5, 1, 2.65);
  crownGlass.name = 'HSBCCrownGlass';
  group.add(crownGlass);
  const signTexture = createHsbcSignTexture();
  const signMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, toneMapped: false });
  const signTex = texture(signTexture, uv());
  const textRegion = float(1).sub(step(0.72, uv().x));
  signMaterial.colorNode = mix(signTex.rgb, color(0xe3eaed), nightAmount().mul(textRegion));
  signMaterial.opacityNode = signTex.a;
  for (const face of [-1, 1]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(31, 4.5), signMaterial);
    sign.position.set(0, 175.6, HSBC_MAIN_BAY.z + face * 5.04);
    if (face < 0) sign.rotation.y = Math.PI;
    sign.name = face < 0 ? 'HSBCNorthSign' : 'HSBCSouthSign';
    group.add(sign);
  }

  addInstances(group, new THREE.BoxGeometry(1, 1, 1), cladding, claddingBoxes, 'HSBCAluminiumServiceCores');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), steel, steelBoxes, 'HSBCUnderbellyTerracesAndCranes');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), dark, darkBoxes, 'HSBCServiceGlazingAndMastLadders');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), dark, stairWindows, 'HSBCEscapeStairWindows', { castShadow: false });
  addInstances(group, createStairWindowGeometry(), stairGlass, stairArchWindows, 'HSBCRoundedStairLandingWindows', { castShadow: false });
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), steel, beams, 'HSBCInvertedVSuspensionTrusses');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), dark, darkBeams, 'HSBCSuspendersEscalatorsAndCraneCables');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), steel, escalatorSteps, 'HSBCEscalatorSteps');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), warmLight, lightBoxes, 'HSBCPlazaLights', { castShadow: false });
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), bronze, bronzeBoxes, 'HSBCBronzeLionPlinthsAndLegs');
  addInstances(group, new THREE.SphereGeometry(1, 10, 7), bronze, lionBodies, 'HSBCBronzeLions');
  addInstances(group, new THREE.IcosahedronGeometry(1, 1), bronzeMane, lionManes, 'HSBCBronzeLionManes');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), bronze, bronzeBeams, 'HSBCBronzeLionTails');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), greenery, greenBoxes, 'HSBCGardenTerraces', { castShadow: false });
  addInstances(group, new THREE.CylinderGeometry(0.48, 0.58, 1, 8), steel, masts, 'HSBCExposedSteelMasts');

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
  for (const boundary of boundaries) {
    for (const x of HSBC_MAST_X) {
      colliders.push(hsbcLocalCollider({ x, z: boundary.z, w: 1.15, d: 1.15, minY: 0, maxY: boundary.roofY + 4.2 }));
    }
  }
  for (const x of [-7.2, 7.2]) {
    colliders.push(hsbcLocalCollider({ x, z: -HSBC_BAY_DEPTH * 1.35, w: 2.1, d: 2.8, minY: 0, maxY: 2.1 }));
  }

  root.add(group);
  const stats = {
    hsbcLandmarks: 1,
    hsbcSteppedBays: HSBC_BAYS.length,
    hsbcStoreys: HSBC_BAYS.reduce((sum, bay) => sum + bay.floors, 0),
    hsbcMasts: masts.length,
    hsbcSuspensionLevels: hsbcSuspensionLevelsForRoof(HSBC_MAIN_ROOF_Y).length,
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
  return { group, colliders, landmarks: [landmark], stats, plazaTop: HSBC_PLAZA_TOP };
}
