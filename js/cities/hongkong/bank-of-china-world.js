import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, mix, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  BANK_OF_CHINA_SITE,
  BANK_OF_CHINA_HEIGHT,
  BANK_OF_CHINA_ROOF_HEIGHT,
  BANK_OF_CHINA_MAST_HEIGHT,
  BANK_OF_CHINA_OFFICIAL_LEVELS,
  BANK_OF_CHINA_OTHER_REPORTED_LEVELS,
  BANK_OF_CHINA_PLAZA_TOP,
  BANK_OF_CHINA_PODIUM_HEIGHT,
  BANK_OF_CHINA_FLOOR_HEIGHT,
  BANK_OF_CHINA_BAY_WIDTH,
  BANK_OF_CHINA_PRISMS,
  BANK_OF_CHINA_LOCAL_RING,
  bankOfChinaPrismPoints,
  bankOfChinaMastPositions,
  bankOfChinaLocalCollider
} from './bank-of-china-architecture.js';

const lerp = (a, b, t) => a + (b - a) * t;
const hash = (a, b, c = 0) => {
  const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.79) * 43758.5453;
  return value - Math.floor(value);
};
function nightAmount() { return smoothstep(0.7, 1.45, cityUniforms.uInteriorGlow); }

function panelStore() { return { positions: [], colors: [], lit: [], cool: [], quads: 0, triangles: 0 }; }
function pushVertex(store, point, tint, lit, cool) {
  store.positions.push(point[0], point[1], point[2]);
  store.colors.push(tint[0], tint[1], tint[2]);
  store.lit.push(lit); store.cool.push(cool);
}
function pushQuad(store, a, b, c, d, tint, lit = 0, cool = 0) {
  for (const index of [0, 1, 2, 0, 2, 3]) {
    const point = [a, b, c, d][index]; pushVertex(store, point, tint, lit, cool);
  }
  store.quads++;
}
function pushTriangle(store, a, b, c, tint) {
  for (const point of [a, b, c]) pushVertex(store, point, tint, 0, 0);
  store.triangles++;
}
function storeGeometry(store) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(store.positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(store.colors, 3));
  geometry.setAttribute('aLit', new THREE.Float32BufferAttribute(store.lit, 1));
  geometry.setAttribute('aCool', new THREE.Float32BufferAttribute(store.cool, 1));
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}
function meshFromStore(group, store, material, name, options = {}) {
  if (!store.positions.length) return null;
  const mesh = new THREE.Mesh(storeGeometry(store), material);
  mesh.name = name; mesh.castShadow = options.castShadow ?? true; mesh.receiveShadow = true;
  mesh.frustumCulled = false; group.add(mesh); return mesh;
}
function mergedMesh(group, geometries, material, name) {
  if (!geometries.length) return null;
  const geometry = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
  if (geometries.length > 1) for (const part of geometries) part.dispose();
  const mesh = new THREE.Mesh(geometry, material); mesh.name = name;
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; group.add(mesh); return mesh;
}
function addInstances(group, geometry, material, transforms, name, options = {}) {
  if (!transforms.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const dummy = new THREE.Object3D();
  transforms.forEach((transform, index) => {
    dummy.position.set(transform.x, transform.y, transform.z);
    dummy.scale.set(transform.sx ?? 1, transform.sy ?? 1, transform.sz ?? 1);
    dummy.rotation.set(transform.rx || 0, transform.ry || 0, transform.rz || 0);
    dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true; mesh.name = name;
  mesh.castShadow = options.castShadow ?? true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  group.add(mesh); return mesh;
}

function createGlassMaterial() {
  const material = new THREE.MeshStandardNodeMaterial({
    metalness: 0.52, roughness: 0.21, envMapIntensity: 0.78, side: THREE.DoubleSide
  });
  const lit = attribute('aLit', 'float'), cool = attribute('aCool', 'float');
  material.colorNode = attribute('color', 'vec3');
  material.roughnessNode = mix(0.29, 0.18, cool);
  material.emissiveNode = mix(color(0xffd09a), color(0xc6dfea), cool).mul(lit).mul(nightAmount()).mul(0.22);
  return material;
}
function createVertexStoneMaterial() {
  const material = new THREE.MeshStandardNodeMaterial({ roughness: 0.82, metalness: 0.04, side: THREE.DoubleSide });
  material.colorNode = attribute('color', 'vec3'); return material;
}
function tint(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

function beamGeometry(a, b, width, depth = width) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const direction = end.clone().sub(start), length = direction.length();
  if (length < 0.03) return null;
  const geometry = new THREE.BoxGeometry(width, length, depth);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  const matrix = new THREE.Matrix4().compose(start.add(end).multiplyScalar(0.5), quaternion, new THREE.Vector3(1, 1, 1));
  geometry.applyMatrix4(matrix); return geometry;
}
function addBeam(geometries, a, b, width, depth = width) {
  const geometry = beamGeometry(a, b, width, depth);
  if (geometry) geometries.push(geometry);
}

// Fine curtain-wall cells are clipped individually against each inclined triangular roof. Large aluminium diagonal
// members are independent rectangular beams, not lines painted into a texture or a generic all-over dia-grid.
function createPrismaticCurtainWall() {
  const facade = panelStore(), frames = panelStore(), structural = [], roof = panelStore(), roofRafters = [];
  let visionPanels = 0;
  const glassDark = [0.075, 0.16, 0.19], glassSilver = [0.26, 0.39, 0.42];
  const frameTint = [0.43, 0.50, 0.51], roofTint = [0.15, 0.27, 0.31];

  for (let prismIndex = 0; prismIndex < BANK_OF_CHINA_PRISMS.length; prismIndex++) {
    const prism = BANK_OF_CHINA_PRISMS[prismIndex], points = bankOfChinaPrismPoints(prism);
    const centre = points.reduce((sum, point) => [sum[0] + point[0] / 3, sum[1] + point[1] / 3], [0, 0]);
    const maxRoof = Math.max(...prism.roof);
    for (let edge = 0; edge < 3; edge++) {
      const next = (edge + 1) % 3, a = points[edge], b = points[next];
      const roofA = prism.roof[edge], roofB = prism.roof[next];
      let bottomA = BANK_OF_CHINA_PODIUM_HEIGHT, bottomB = BANK_OF_CHINA_PODIUM_HEIGHT;
      if (edge > 0) {
        // Diagonal faces are internal below the neighbouring quadrant's inclined roof. Draw only the exposed
        // portion on the taller prism; rendering both complete faces would put two coplanar glass skins inside.
        const vertexA = prism.vertices[edge], vertexB = prism.vertices[next];
        const neighbour = BANK_OF_CHINA_PRISMS.find((other) => other !== prism
          && other.vertices.includes(vertexA) && other.vertices.includes(vertexB));
        if (!neighbour) throw new Error(`Missing Bank of China neighbour for ${prism.id} face ${edge}`);
        const neighbourRoofA = neighbour.roof[neighbour.vertices.indexOf(vertexA)];
        const neighbourRoofB = neighbour.roof[neighbour.vertices.indexOf(vertexB)];
        if (roofA <= neighbourRoofA && roofB <= neighbourRoofB) continue;
        bottomA = neighbourRoofA; bottomB = neighbourRoofB;
      }
      const dx = b[0] - a[0], dz = b[1] - a[1], edgeLength = Math.hypot(dx, dz);
      const bays = Math.max(2, Math.round(edgeLength / BANK_OF_CHINA_BAY_WIDTH));
      let nx = (a[0] + b[0]) * 0.5 - centre[0], nz = (a[1] + b[1]) * 0.5 - centre[1];
      const normalLength = Math.hypot(nx, nz) || 1; nx /= normalLength; nz /= normalLength;
      const point = (t, y, offset = 0) => [lerp(a[0], b[0], t) + nx * offset, y, lerp(a[1], b[1], t) + nz * offset];
      for (let row = 0, y = BANK_OF_CHINA_PODIUM_HEIGHT; y < maxRoof; row++, y += BANK_OF_CHINA_FLOOR_HEIGHT) {
        const y0 = y + 0.025, y1 = Math.min(y + BANK_OF_CHINA_FLOOR_HEIGHT - 0.025, maxRoof);
        for (let bay = 0; bay < bays; bay++) {
          const gap = Math.min(0.018 / edgeLength, 0.04 / bays);
          const t0 = bay / bays + gap, t1 = (bay + 1) / bays - gap;
          const topA0 = lerp(roofA, roofB, t0), topB0 = lerp(roofA, roofB, t1);
          const baseA0 = lerp(bottomA, bottomB, t0), baseB0 = lerp(bottomA, bottomB, t1);
          const lowA = Math.min(Math.max(y0, baseA0), topA0), lowB = Math.min(Math.max(y0, baseB0), topB0);
          const highA = Math.min(Math.max(y1, baseA0), topA0), highB = Math.min(Math.max(y1, baseB0), topB0);
          if (highA <= lowA + 0.005 && highB <= lowB + 0.005) continue;
          const variation = hash(prismIndex * 7 + edge, row, bay);
          const panelTint = tint(glassDark, glassSilver, 0.34 + variation * 0.40);
          const lit = hash(row + 31, bay, edge + prismIndex * 11) > 0.90 ? 0.32 + variation * 0.40 : 0;
          const cool = hash(row, edge + 5, bay) > 0.58 ? 1 : 0;
          pushQuad(facade, point(t0, lowA), point(t1, lowB), point(t1, highB), point(t0, highA), panelTint, lit, cool);
          visionPanels++;

          const mt = Math.max(0, t0 - 0.042 / edgeLength), nt = Math.min(1, t0 + 0.042 / edgeLength);
          const mRoofA = lerp(roofA, roofB, mt), mRoofB = lerp(roofA, roofB, nt);
          const mBaseA = lerp(bottomA, bottomB, mt), mBaseB = lerp(bottomA, bottomB, nt);
          const mLowA = Math.min(Math.max(y0, mBaseA), mRoofA), mLowB = Math.min(Math.max(y0, mBaseB), mRoofB);
          const mHighA = Math.min(Math.max(y1, mBaseA), mRoofA), mHighB = Math.min(Math.max(y1, mBaseB), mRoofB);
          if (mHighA > mLowA + 0.01 || mHighB > mLowB + 0.01) {
            pushQuad(frames, point(mt, mLowA, 0.035), point(nt, mLowB, 0.035),
              point(nt, mHighB, 0.035), point(mt, mHighA, 0.035), frameTint);
          }
          const hLowA = Math.min(Math.max(y0, baseA0), topA0), hLowB = Math.min(Math.max(y0, baseB0), topB0);
          const hHighA = Math.min(Math.max(y0 + 0.045, baseA0), topA0), hHighB = Math.min(Math.max(y0 + 0.045, baseB0), topB0);
          if (hHighA > hLowA + 0.005 || hHighB > hLowB + 0.005) {
            pushQuad(frames, point(t0, hLowA, 0.03), point(t1, hLowB, 0.03),
              point(t1, hHighB, 0.03), point(t0, hHighA, 0.03), frameTint);
          }
        }
      }

      for (let band = BANK_OF_CHINA_PODIUM_HEIGHT; band < maxRoof - 0.5; band += 54) {
        const top = Math.min(band + 54, maxRoof);
        const lowA = Math.min(Math.max(band, bottomA), roofA), lowB = Math.min(Math.max(band, bottomB), roofB);
        const highA = Math.min(Math.max(top, bottomA), roofA), highB = Math.min(Math.max(top, bottomB), roofB);
        addBeam(structural, point(0, lowA, 0.19), point(1, highB, 0.19), 0.58, 0.34);
        addBeam(structural, point(1, lowB, 0.19), point(0, highA, 0.19), 0.58, 0.34);
        addBeam(structural, point(0, lowA, 0.16), point(1, lowB, 0.16), 0.24, 0.26);
      }
    }

    const roofPoints = points.map((point, index) => [point[0], prism.roof[index] + 0.07, point[1]]);
    pushTriangle(roof, roofPoints[0], roofPoints[1], roofPoints[2], roofTint);
    for (let edge = 0; edge < 3; edge++) {
      const next = (edge + 1) % 3;
      addBeam(roofRafters, roofPoints[edge], roofPoints[next], 0.38, 0.30);
      for (const t of [0.2, 0.4, 0.6, 0.8]) {
        const onEdge = [lerp(roofPoints[edge][0], roofPoints[next][0], t),
          lerp(roofPoints[edge][1], roofPoints[next][1], t), lerp(roofPoints[edge][2], roofPoints[next][2], t)];
        addBeam(roofRafters, onEdge, roofPoints[(edge + 2) % 3], 0.13, 0.16);
      }
    }
  }

  // Four massive corner columns and the central arris remain visually legible through the crystalline composition.
  for (let corner = 0; corner < 4; corner++) {
    let height = BANK_OF_CHINA_PODIUM_HEIGHT, point = null;
    for (const prism of BANK_OF_CHINA_PRISMS) {
      const points = bankOfChinaPrismPoints(prism);
      const index = prism.vertices.indexOf(corner);
      if (index >= 0 && prism.roof[index] > height) { height = prism.roof[index]; point = points[index]; }
    }
    addBeam(structural, [point[0], 0, point[1]], [point[0], height, point[1]], 1.08, 1.08);
  }
  addBeam(structural, [0, BANK_OF_CHINA_PODIUM_HEIGHT, 0], [0, BANK_OF_CHINA_ROOF_HEIGHT, 0], 0.72, 0.72);
  return { facade, frames, structural, roof, roofRafters, visionPanels };
}

function createPodium(group, materials) {
  const { stone, granite, metal, darkGlass } = materials;
  const w = BANK_OF_CHINA_SITE.w, d = BANK_OF_CHINA_SITE.d, hx = w * 0.5, hz = d * 0.5;
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, BANK_OF_CHINA_PODIUM_HEIGHT, d), stone);
  base.position.y = BANK_OF_CHINA_PODIUM_HEIGHT * 0.5; base.name = 'BocTwoStoreyGranitePodium';
  base.castShadow = true; base.receiveShadow = true; group.add(base);

  const panels = panelStore(), windows = panelStore(), windowFrames = [];
  const faces = [
    { a: [-hx, -hz], b: [hx, -hz], n: [0, -1], id: 'north' },
    { a: [hx, -hz], b: [hx, hz], n: [1, 0], id: 'east' },
    { a: [hx, hz], b: [-hx, hz], n: [0, 1], id: 'south' },
    { a: [-hx, hz], b: [-hx, -hz], n: [-1, 0], id: 'west' }
  ];
  for (let faceIndex = 0; faceIndex < faces.length; faceIndex++) {
    const face = faces[faceIndex], length = Math.hypot(face.b[0] - face.a[0], face.b[1] - face.a[1]);
    const bays = Math.round(length / 4.35), point = (t, y, offset = 0.045) => [
      lerp(face.a[0], face.b[0], t) + face.n[0] * offset, y,
      lerp(face.a[1], face.b[1], t) + face.n[1] * offset
    ];
    for (let row = 0; row < 6; row++) {
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + 0.0015, t1 = (bay + 1) / bays - 0.0015;
        const y0 = row * 3 + 0.035, y1 = Math.min((row + 1) * 3 - 0.035, BANK_OF_CHINA_PODIUM_HEIGHT);
        const shade = 0.27 + hash(faceIndex, row, bay) * 0.13;
        pushQuad(panels, point(t0, y0), point(t1, y0), point(t1, y1), point(t0, y1), [shade, shade * 1.01, shade * 0.98]);
      }
    }
    for (let bay = 0; bay < 9; bay++) {
      if ((face.id === 'north' || face.id === 'south') && bay >= 3 && bay <= 5) continue;
      const centre = (bay + 0.5) / 9, half = 1.05 / length;
      pushQuad(windows, point(centre - half, 3.2, 0.085), point(centre + half, 3.2, 0.085),
        point(centre + half, 12.4, 0.085), point(centre - half, 12.4, 0.085), [0.045, 0.085, 0.095]);
      const p = point(centre, 7.8, 0.12);
      windowFrames.push({ x: p[0], y: 7.8, z: p[2], sx: face.n[0] ? 0.14 : 0.10, sy: 9.5, sz: face.n[0] ? 0.10 : 0.14 });
    }
  }
  meshFromStore(group, panels, granite, 'BocIndividualGraniteCladdingPanels');
  meshFromStore(group, windows, darkGlass, 'BocPodiumLargeInsetGlassPanels');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), metal, windowFrames, 'BocPodiumWindowMullions');

  const plaza = panelStore(), centre = [0, BANK_OF_CHINA_PLAZA_TOP, 0];
  for (let i = 0; i + 3 < BANK_OF_CHINA_LOCAL_RING.length; i += 2) {
    pushTriangle(plaza, centre,
      [BANK_OF_CHINA_LOCAL_RING[i], BANK_OF_CHINA_PLAZA_TOP, BANK_OF_CHINA_LOCAL_RING[i + 1]],
      [BANK_OF_CHINA_LOCAL_RING[i + 2], BANK_OF_CHINA_PLAZA_TOP, BANK_OF_CHINA_LOCAL_RING[i + 3]], [0.42, 0.41, 0.38]);
  }
  meshFromStore(group, plaza, granite, 'BocOsmFootprintStonePromenade', { castShadow: false });

  // North double-arched passage and a restrained glazed canopy; the stone base remains substantial behind it.
  const archMaterial = new THREE.MeshStandardNodeMaterial({ color: 0x8f8b80, roughness: 0.78 });
  for (const x of [-2.45, 2.45]) {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(2.18, 0.27, 8, 36, Math.PI), archMaterial);
    arch.position.set(x, 5.1, -hz - 0.16); arch.rotation.y = Math.PI; arch.name = 'BocNorthDoubleArchedPassage'; group.add(arch);
    for (const jambX of [x - 2.18, x + 2.18]) {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.54, 5.2, 0.48), archMaterial);
      jamb.position.set(jambX, 2.6, -hz - 0.13); group.add(jamb);
    }
    const doors = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 7.8), darkGlass);
    doors.position.set(x, 4.05, -hz - 0.19); doors.rotation.y = Math.PI; group.add(doors);
  }
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.20, 3.2), metal);
  canopy.position.set(0, 9.1, -hz - 1.45); canopy.name = 'BocNorthEntranceThinCanopy'; group.add(canopy);

  const southDoors = new THREE.Mesh(new THREE.PlaneGeometry(10, 8.4), darkGlass);
  southDoors.position.set(0, 4.4, hz + 0.10); southDoors.name = 'BocSouthMainEntrance'; group.add(southDoors);

  return { canopy };
}

function createBankLogo(group, x, y, z, material) {
  const logo = new THREE.Group(); logo.position.set(x, y, z); logo.name = 'BocRedAncientCoinBankLogo';
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.13, 8, 36), material); logo.add(ring);
  for (const [px, py, sx, sy] of [[0, 0.42, 0.88, 0.13], [0, -0.42, 0.88, 0.13],
    [-0.38, 0, 0.13, 0.88], [0.38, 0, 0.13, 0.88], [0, 0, 0.13, 3.0]]) {
    const part = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 0.13), material); part.position.set(px, py, 0); logo.add(part);
  }
  group.add(logo);
}

function createSignTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const context = canvas.getContext('2d'); context.clearRect(0, 0, 1024, 256);
  context.textAlign = 'center'; context.fillStyle = '#eee9dc';
  context.font = '600 60px sans-serif'; context.fillText('BANK OF CHINA', 512, 100);
  context.font = '52px sans-serif'; context.fillText('中 國 銀 行', 512, 190);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4; return texture;
}

function addEntranceIdentity(group, materials) {
  const hz = BANK_OF_CHINA_SITE.d * 0.5, hx = BANK_OF_CHINA_SITE.w * 0.5;
  const red = new THREE.MeshStandardNodeMaterial({ color: 0xa20d18, roughness: 0.46, metalness: 0.12 });
  createBankLogo(group, -8.0, 7.0, hz + 0.18, red);
  createBankLogo(group, 8.0, 7.0, hz + 0.18, red);

  const signMaterial = new THREE.MeshBasicMaterial({ map: createSignTexture(), transparent: true, side: THREE.DoubleSide, toneMapped: false });
  const north = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 2.7), signMaterial);
  north.position.set(0, 14.9, -hz - 0.13); north.rotation.y = Math.PI; north.name = 'BocGardenRoadBankOfChinaName'; group.add(north);
  const south = north.clone(); south.position.set(0, 14.9, hz + 0.13); south.rotation.y = 0; group.add(south);
  const east = north.clone(); east.position.set(hx + 0.13, 14.9, 0); east.rotation.y = Math.PI / 2; group.add(east);

  // Published entrance descriptions identify two northern huabiao used as lamp posts. Their small wings, octagonal
  // bases and lanterns are actual geometry rather than generic street-light substitutes.
  const stone = new THREE.MeshStandardNodeMaterial({ color: 0xa49d8c, roughness: 0.76 });
  const lantern = new THREE.MeshStandardNodeMaterial({ color: 0xd8c69b, roughness: 0.35 });
  lantern.emissiveNode = color(0xffd18a).mul(nightAmount().mul(1.3).add(0.08));
  const shafts = [], bases = [], capitals = [], lamps = [], wings = [];
  for (const x of [-9.2, 9.2]) {
    const z = -hz - 2.0;
    shafts.push({ x, y: 4.2, z });
    bases.push({ x, y: 0.35, z }); capitals.push({ x, y: 8.1, z }); lamps.push({ x, y: 8.85, z });
    wings.push({ x: x - 0.48, y: 7.65, z, rz: -0.55 }, { x: x + 0.48, y: 7.65, z, rz: 0.55 });
  }
  addInstances(group, new THREE.CylinderGeometry(0.27, 0.36, 7.7, 12), stone, shafts, 'BocNorthHuabiaoOrnamentalLampShafts');
  addInstances(group, new THREE.CylinderGeometry(0.72, 0.82, 0.7, 8), stone, bases, 'BocHuabiaoOctagonalBases');
  addInstances(group, new THREE.CylinderGeometry(0.68, 0.44, 0.42, 8), stone, capitals, 'BocHuabiaoCapitals');
  addInstances(group, new THREE.SphereGeometry(0.34, 12, 8), lantern, lamps, 'BocHuabiaoWarmLanterns', { castShadow: false });
  addInstances(group, new THREE.BoxGeometry(0.85, 0.16, 0.35), stone, wings, 'BocHuabiaoCloudWings');
}

function addTwinMasts(group, structuralMaterial) {
  const positions = bankOfChinaMastPositions(), mastMaterial = new THREE.MeshStandardNodeMaterial({
    color: 0xb8c2c1, metalness: 0.83, roughness: 0.27
  });
  const braces = [], beacons = [];
  positions.forEach((position, index) => {
    const height = position.topY - position.baseY;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.30, height, 10), mastMaterial);
    mast.position.set(position.x, position.baseY + height * 0.5, position.z);
    mast.name = `BocTwinMast${index + 1}`; mast.castShadow = true; group.add(mast);
    beacons.push({ x: position.x, y: position.topY, z: position.z });
  });
  const [a, b] = positions;
  for (const y of [316, 323, 330]) {
    addBeam(braces, [a.x, y, a.z], [b.x, y + 5.5, b.z], 0.20, 0.20);
    addBeam(braces, [b.x, y, b.z], [a.x, y + 5.5, a.z], 0.20, 0.20);
  }
  mergedMesh(group, braces, structuralMaterial, 'BocTwinMastDiagonalSpaceFrame');
  const beaconMaterial = new THREE.MeshStandardNodeMaterial({ color: 0x8b1712, roughness: 0.35 });
  beaconMaterial.emissiveNode = color(0xff3425).mul(nightAmount().mul(2.0).add(0.35));
  addInstances(group, new THREE.SphereGeometry(0.19, 8, 6), beaconMaterial, beacons, 'BocMastObstructionLights', { castShadow: false });
  return positions;
}

export function buildBankOfChinaTower(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'BankOfChinaTowerAuthoredLandmark';
  group.userData.internalId = 'HK-B0005';
  group.position.set(BANK_OF_CHINA_SITE.x, groundOffset, BANK_OF_CHINA_SITE.z);
  group.rotation.y = BANK_OF_CHINA_SITE.ry; root.add(group);

  const materials = {
    glass: createGlassMaterial(),
    granite: createVertexStoneMaterial(),
    stone: new THREE.MeshStandardNodeMaterial({ color: 0x615f58, roughness: 0.84 }),
    metal: new THREE.MeshStandardNodeMaterial({ color: 0xaeb8b7, metalness: 0.74, roughness: 0.31 }),
    structural: new THREE.MeshStandardNodeMaterial({ color: 0xc4ceca, metalness: 0.68, roughness: 0.29 }),
    darkGlass: new THREE.MeshStandardNodeMaterial({ color: 0x142a30, metalness: 0.48, roughness: 0.25, side: THREE.DoubleSide })
  };
  materials.darkGlass.emissiveNode = color(0xe6c18c).mul(nightAmount()).mul(0.055);
  materials.structural.emissiveNode = color(0xa9c7d2).mul(nightAmount()).mul(0.38);

  createPodium(group, materials);
  const curtain = createPrismaticCurtainWall();
  meshFromStore(group, curtain.facade, materials.glass, 'BocFourTriangularPrismsSilverBlueCurtainWall');
  meshFromStore(group, curtain.frames, materials.metal, 'BocFineAluminiumCurtainWallMullions');
  mergedMesh(group, curtain.structural, materials.structural, 'BocExternalDiagonalSpaceFrameAndFourCornerColumns');
  meshFromStore(group, curtain.roof, materials.glass, 'BocFourInclinedTriangularGlassRoofs');
  mergedMesh(group, curtain.roofRafters, materials.metal, 'BocSlopingRoofRaftersAndPerimeterFlashings');
  addEntranceIdentity(group, materials);
  const masts = addTwinMasts(group, materials.structural);

  const colliders = [bankOfChinaLocalCollider({
    w: BANK_OF_CHINA_SITE.w, d: BANK_OF_CHINA_SITE.d, minY: 0, maxY: BANK_OF_CHINA_PODIUM_HEIGHT
  })];
  for (const prism of BANK_OF_CHINA_PRISMS) {
    const points = bankOfChinaPrismPoints(prism);
    const xs = points.map((point) => point[0]), zs = points.map((point) => point[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
    colliders.push(bankOfChinaLocalCollider({
      x: (minX + maxX) * 0.5, z: (minZ + maxZ) * 0.5, w: maxX - minX, d: maxZ - minZ,
      minY: BANK_OF_CHINA_PODIUM_HEIGHT, maxY: Math.max(...prism.roof)
    }));
  }
  for (const mast of masts) {
    colliders.push(bankOfChinaLocalCollider({ x: mast.x, z: mast.z, w: 0.8, d: 0.8, minY: mast.baseY, maxY: mast.topY }));
  }
  const hz = BANK_OF_CHINA_SITE.d * 0.5;
  for (const x of [-9.2, 9.2]) {
    colliders.push(bankOfChinaLocalCollider({ x, z: -hz - 2, w: 1.5, d: 1.5, minY: 0, maxY: 9.2 }));
  }
  colliders.push(bankOfChinaLocalCollider({ x: 0, z: -hz - 1.45, w: 12.4, d: 3.2, minY: 8.95, maxY: 9.25 }));
  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }

  const landmark = {
    name: BANK_OF_CHINA_SITE.name, englishName: BANK_OF_CHINA_SITE.englishName,
    x: BANK_OF_CHINA_SITE.x, z: BANK_OF_CHINA_SITE.z, w: BANK_OF_CHINA_SITE.w, d: BANK_OF_CHINA_SITE.d,
    h: BANK_OF_CHINA_HEIGHT, ry: BANK_OF_CHINA_SITE.ry,
    bounds: { ...BANK_OF_CHINA_SITE.bounds }, ring: BANK_OF_CHINA_SITE.ring, osmId: BANK_OF_CHINA_SITE.osmId
  };
  const stats = {
    bocGroundOffset: groundOffset,
    bocLandmarks: 1,
    bocHeight: BANK_OF_CHINA_HEIGHT,
    bocRoofHeight: BANK_OF_CHINA_ROOF_HEIGHT,
    bocMastHeight: BANK_OF_CHINA_MAST_HEIGHT,
    bocOfficialLevels: BANK_OF_CHINA_OFFICIAL_LEVELS,
    bocOtherReportedLevels: BANK_OF_CHINA_OTHER_REPORTED_LEVELS,
    bocTriangularPrisms: BANK_OF_CHINA_PRISMS.length,
    bocVisionPanels: curtain.visionPanels,
    bocFacadeQuads: curtain.facade.quads,
    bocFrameQuads: curtain.frames.quads,
    bocStructuralBeams: curtain.structural.length,
    bocRoofRafters: curtain.roofRafters.length,
    bocMasts: masts.length,
    bocColliders: colliders.length
  };
  group.userData.stats = stats;
  return {
    group, colliders, landmarks: [landmark], stats, groundOffset,
    plazaTop: BANK_OF_CHINA_PLAZA_TOP + groundOffset
  };
}
