import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep, uniform } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  THE_CENTER_SITE, THE_CENTER_HEIGHT, THE_CENTER_ROOF_HEIGHT, THE_CENTER_OCCUPIED_HEIGHT,
  THE_CENTER_LEVELS, THE_CENTER_TOURISM_LEVELS, THE_CENTER_BELOW_GROUND_LEVELS,
  THE_CENTER_BODY_START, THE_CENTER_FLOOR_HEIGHT, THE_CENTER_BAY_WIDTH, THE_CENTER_PLAZA_TOP,
  THE_CENTER_MAST_SUPPORT_TOP, THE_CENTER_CROWN_SEGMENTS, THE_CENTER_LOCAL_RING,
  theCenterLocalCollider, theCenterBodyColliders, theCenterNeonZone, theCenterNeonRow
} from './the-center-architecture.js';

const lerp = (a, b, t) => a + (b - a) * t;
const hash = (a, b, c = 0) => { const v = Math.sin(a * 127.1 + b * 311.7 + c * 71.9) * 43758.5453; return v - Math.floor(v); };
function nightAmount() { return smoothstep(0.55, 1.4, cityUniforms.uInteriorGlow); }
function store() { return { positions: [], colors: [], lit: [], quads: 0, triangles: 0 }; }
function vertex(s, p, tint, lit = 0) { s.positions.push(...p); s.colors.push(...tint); s.lit.push(lit); }
function quad(s, a, b, c, d, tint, lit = 0) { for (const i of [0, 1, 2, 0, 2, 3]) vertex(s, [a, b, c, d][i], tint, lit); s.quads++; }
function triangle(s, a, b, c, tint) { for (const p of [a, b, c]) vertex(s, p, tint); s.triangles++; }
function geometry(s) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(s.positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(s.colors, 3)); g.setAttribute('aLit', new THREE.Float32BufferAttribute(s.lit, 1));
  g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}
function meshStore(group, s, material, name, shadows = true) {
  if (!s.positions.length) return null; const mesh = new THREE.Mesh(geometry(s), material); mesh.name = name;
  mesh.frustumCulled = false; mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function merged(group, parts, material, name, shadows = true) {
  if (!parts.length) return null; const g = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  if (parts.length > 1) for (const part of parts) part.dispose(); const mesh = new THREE.Mesh(g, material);
  mesh.name = name; mesh.frustumCulled = false; mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function beam(parts, a, b, width, depth = width) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
  const length = direction.length(); if (length < 0.02) return; const g = new THREE.BoxGeometry(width, length, depth);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(start.add(end).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1))); parts.push(g);
}
function instances(group, g, material, transforms, name, shadows = true) {
  if (!transforms.length) return null; const mesh = new THREE.InstancedMesh(g, material, transforms.length), dummy = new THREE.Object3D();
  transforms.forEach((t, i) => { dummy.position.set(t.x, t.y, t.z); dummy.scale.set(t.sx ?? 1, t.sy ?? 1, t.sz ?? 1);
    dummy.rotation.set(t.rx || 0, t.ry || 0, t.rz || 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
  mesh.instanceMatrix.needsUpdate = true; mesh.name = name; mesh.frustumCulled = false;
  mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function glassMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0.58, roughness: 0.21, envMapIntensity: 0.85, side: THREE.DoubleSide });
  m.colorNode = attribute('color', 'vec3'); m.emissiveNode = color(0xffd6a2).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.18); return m;
}
function vertexMaterial(options = {}) { const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.5, side: THREE.DoubleSide, ...options }); m.colorNode = attribute('color', 'vec3'); return m; }
function tintMix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function outward(ax, az, bx, bz) {
  const length = Math.hypot(bx - ax, bz - az) || 1; let nx = (bz - az) / length, nz = -(bx - ax) / length;
  if (nx * (ax + bx) + nz * (az + bz) < 0) { nx = -nx; nz = -nz; } return { nx, nz, length };
}
function scaledPlan(scale) { return THE_CENTER_LOCAL_RING.map((value) => value * scale); }

function createCurtainWall() {
  const facade = store(), frames = store(), prowFins = [], neonParts = Array.from({ length: 6 }, () => []);
  let visionPanels = 0, neonBars = 0;
  for (let row = 0, y = THE_CENTER_BODY_START; y < THE_CENTER_ROOF_HEIGHT - 0.01; row++) {
    const y0 = y, y1 = Math.min(y + THE_CENTER_FLOOR_HEIGHT, THE_CENTER_ROOF_HEIGHT); y = y1;
    const belt = [108, 232, 278].some((value) => y0 >= value && y0 < value + 8);
    for (let edge = 0; edge < 16; edge++) {
      const i = edge * 2, next = (edge + 1) % 16 * 2;
      const ax = THE_CENTER_LOCAL_RING[i], az = THE_CENTER_LOCAL_RING[i + 1], bx = THE_CENTER_LOCAL_RING[next], bz = THE_CENTER_LOCAL_RING[next + 1];
      const { nx, nz, length } = outward(ax, az, bx, bz), bays = Math.max(2, Math.round(length / THE_CENTER_BAY_WIDTH));
      const lightProw = edge % 4 === 0 || edge % 4 === 3;
      const point = (t, yy, offset = 0.04) => [lerp(ax, bx, t) + nx * offset, yy, lerp(az, bz, t) + nz * offset];
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + 0.0012, t1 = (bay + 1) / bays - 0.0012, variation = hash(row, edge, bay);
        const low = lightProw ? [0.18, 0.29, 0.34] : [0.045, 0.095, 0.13], high = lightProw ? [0.48, 0.59, 0.60] : [0.19, 0.28, 0.32];
        const tint = belt ? [0.25, 0.235, 0.19] : tintMix(low, high, 0.28 + variation * 0.44);
        const lit = !belt && hash(row + 9, bay, edge) > 0.92 ? 0.22 + variation * 0.32 : 0;
        quad(facade, point(t0, y0 + 0.04), point(t1, y0 + 0.04), point(t1, y1 - 0.04), point(t0, y1 - 0.04), tint, lit); visionPanels++;
        quad(facade, point(t0, y0 + 0.04, 0.055), point(t1, y0 + 0.04, 0.055), point(t1, y0 + 0.55, 0.055), point(t0, y0 + 0.55, 0.055),
          belt ? [0.19, 0.18, 0.15] : [0.13, 0.20, 0.23]);
        quad(frames, point(t0, y0, 0.075), point(t1, y0, 0.075), point(t1, y0 + 0.065, 0.075), point(t0, y0 + 0.065, 0.075), [0.48, 0.53, 0.52]);
        const half = 0.035 / length;
        quad(frames, point(t0 - half, y0, 0.08), point(t0 + half, y0, 0.08), point(t0 + half, y1, 0.08), point(t0 - half, y1, 0.08), [0.42, 0.48, 0.48]);
      }
      if (theCenterNeonRow(row, y0)) {
        const zone = theCenterNeonZone(y0); beam(neonParts[zone], point(0.025, y0 + 0.18, 0.16), point(0.975, y0 + 0.18, 0.16), 0.085, 0.11); neonBars++;
        if (zone === 4) { beam(neonParts[zone], point(0.025, y0 + 2.05, 0.16), point(0.975, y0 + 2.05, 0.16), 0.075, 0.10); neonBars++; }
      }
    }
  }
  for (let vertexIndex = 0; vertexIndex < 16; vertexIndex += 2) {
    const i = vertexIndex * 2, x = THE_CENTER_LOCAL_RING[i], z = THE_CENTER_LOCAL_RING[i + 1];
    const length = Math.hypot(x, z), ox = x / length * 0.13, oz = z / length * 0.13;
    beam(prowFins, [x + ox, THE_CENTER_BODY_START, z + oz], [x + ox, THE_CENTER_ROOF_HEIGHT, z + oz], 0.18, 0.20);
  }
  return { facade, frames, prowFins, neonParts, visionPanels, neonBars };
}

function createCrown(neonParts) {
  const roof = store(), drum = store(), seams = [], ledges = store(); let crownPanels = 0, neonBars = 0;
  for (const segment of THE_CENTER_CROWN_SEGMENTS) {
    const a = scaledPlan(segment.s0), b = scaledPlan(segment.s1);
    for (let edge = 0; edge < 16; edge++) {
      const i = edge * 2, next = (edge + 1) % 16 * 2;
      const bays = 8;
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + 0.001, t1 = (bay + 1) / bays - 0.001;
        const p = (plan, index, t, y) => [lerp(plan[index], plan[next], t), y, lerp(plan[index + 1], plan[next + 1], t)];
        const tint = segment.kind === 'drum' ? tintMix([0.12, 0.23, 0.28], [0.38, 0.50, 0.53], hash(edge, bay)) : [0.20, 0.25, 0.26];
        quad(segment.kind === 'drum' ? drum : roof, p(a, i, t0, segment.y0), p(a, i, t1, segment.y0), p(b, i, t1, segment.y1), p(b, i, t0, segment.y1), tint);
        crownPanels++;
      }
      beam(seams, [a[i], segment.y0, a[i + 1]], [b[i], segment.y1, b[i + 1]], 0.14, 0.18);
      beam(neonParts[5], [a[i], segment.y0 + 0.12, a[i + 1]], [a[next], segment.y0 + 0.12, a[next + 1]], 0.09, 0.11); neonBars++;
    }
  }
  for (let index = 0; index < THE_CENTER_CROWN_SEGMENTS.length - 1; index++) {
    const current = THE_CENTER_CROWN_SEGMENTS[index], nextSegment = THE_CENTER_CROWN_SEGMENTS[index + 1];
    const outer = scaledPlan(current.s1), inner = scaledPlan(nextSegment.s0), y = current.y1;
    for (let edge = 0; edge < 16; edge++) {
      const i = edge * 2, next = (edge + 1) % 16 * 2;
      quad(ledges, [outer[i], y, outer[i + 1]], [outer[next], y, outer[next + 1]], [inner[next], y, inner[next + 1]], [inner[i], y, inner[i + 1]], [0.25, 0.29, 0.29]);
    }
  }
  const top = scaledPlan(0.32);
  for (let edge = 0; edge < 16; edge++) {
    const i = edge * 2, next = (edge + 1) % 16 * 2;
    triangle(ledges, [top[i], 318, top[i + 1]], [top[next], 318, top[next + 1]], [0, 318, 0], [0.23, 0.27, 0.27]);
  }
  return { roof, drum, seams, ledges, crownPanels, neonBars };
}

function createMast(group, materials) {
  const support = [], lattice = [];
  for (let index = 0; index < 4; index++) {
    const angle = index * Math.PI * 0.5, cs = Math.cos(angle), sn = Math.sin(angle);
    beam(support, [cs * 7, 318, sn * 7], [cs * 1.5, THE_CENTER_MAST_SUPPORT_TOP, sn * 1.5], 0.42, 0.48);
  }
  merged(group, support, materials.whiteSteel, 'TheCenterFourInclinedMastSupportLegs');
  const levels = 6;
  const radiusAt = (y) => lerp(1.25, 0.55, (y - 328) / 13);
  for (let level = 0; level < levels; level++) {
    const y0 = 328 + level * 13 / levels, y1 = 328 + (level + 1) * 13 / levels, r0 = radiusAt(y0), r1 = radiusAt(y1);
    const corners0 = [[-r0, -r0], [r0, -r0], [r0, r0], [-r0, r0]], corners1 = [[-r1, -r1], [r1, -r1], [r1, r1], [-r1, r1]];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4, a = corners0[i], b = corners0[j], c = corners1[i], d = corners1[j];
      beam(lattice, [a[0], y0, a[1]], [c[0], y1, c[1]], 0.15, 0.17);
      beam(lattice, [a[0], y0, a[1]], [b[0], y0, b[1]], 0.12, 0.14);
      beam(lattice, [a[0], y0, a[1]], [d[0], y1, d[1]], 0.10, 0.12);
      beam(lattice, [b[0], y0, b[1]], [c[0], y1, c[1]], 0.10, 0.12);
    }
  }
  merged(group, lattice, materials.whiteSteel, 'TheCenterTaperedWhiteLatticeSpire');
  for (const y of [336.2, 339.2]) {
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.25, 0.28, 16), materials.whiteSteel);
    platform.position.y = y; platform.name = 'TheCenterCircularAntennaPlatform'; group.add(platform);
  }
  const panels = [];
  for (let index = 0; index < 4; index++) {
    const angle = index * Math.PI * 0.5, x = Math.cos(angle) * 1.9, z = Math.sin(angle) * 1.9;
    panels.push({ x, y: 337.7, z, ry: -angle + Math.PI * 0.5 });
  }
  instances(group, new THREE.BoxGeometry(0.8, 2.3, 0.24), materials.antennaPanel, panels, 'TheCenterFourWhiteAntennaPanels');
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.14, THE_CENTER_HEIGHT - 341, 10), materials.whiteSteel);
  needle.position.y = (341 + THE_CENTER_HEIGHT) * 0.5; needle.name = 'TheCenterNeedleTo346Metres'; group.add(needle);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), materials.beacon); beacon.position.y = THE_CENTER_HEIGHT; group.add(beacon);
}

function signTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 192; const ctx = canvas.getContext('2d');
  ctx.textAlign = 'center'; ctx.fillStyle = '#edf1eb'; ctx.font = '600 50px sans-serif'; ctx.fillText('THE CENTER', 384, 72);
  ctx.font = '42px sans-serif'; ctx.fillText('中 環 中 心', 384, 142); const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function createPublicLobby(group, materials) {
  const floor = new THREE.Mesh(new THREE.CircleGeometry(18, 40), materials.marble); floor.rotation.x = -Math.PI * 0.5; floor.position.y = 0.12;
  floor.name = 'TheCenterDarkGreenMarblePublicLobbyFloor'; floor.receiveShadow = true; group.add(floor);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 12, 32), materials.brushedSteel);
  core.position.y = 6; core.name = 'TheCenterCylindricalStainlessSteelCore'; core.castShadow = true; group.add(core);
  const coreSeams = [];
  for (let index = 0; index < 24; index++) {
    const angle = index * Math.PI * 2 / 24, x = Math.cos(angle) * 5.53, z = Math.sin(angle) * 5.53;
    beam(coreSeams, [x, 0.15, z], [x, 11.85, z], 0.045, 0.055);
  }
  merged(group, coreSeams, materials.metal, 'TheCenterCylindricalCorePanelSeams');
  const gallery = new THREE.Mesh(new THREE.BoxGeometry(22, 0.35, 22), materials.brushedSteel);
  gallery.position.y = 5.5; gallery.name = 'TheCenterElevatedGalleryAbovePublicSpace'; group.add(gallery);

  const escalatorSteps = [], handrails = [], balustrades = store();
  for (const x of [-1.25, 1.25]) {
    for (let step = 0; step < 24; step++) {
      const t = step / 23, y = lerp(0.24, 5.42, t), z = lerp(15, 6, t);
      const g = new THREE.BoxGeometry(1.65, 0.16, 0.48); g.translate(x, y, z); escalatorSteps.push(g);
    }
    for (const side of [-0.96, 0.96]) {
      beam(handrails, [x + side, 1.05, 15], [x + side, 6.30, 6], 0.11, 0.14);
      quad(balustrades, [x + side, 0.30, 15], [x + side, 5.48, 6], [x + side, 6.15, 6], [x + side, 1.05, 15], [0.4, 0.55, 0.57]);
    }
  }
  merged(group, escalatorSteps, materials.escalator, 'TheCenterPairedPublicLobbyEscalatorSteps');
  merged(group, handrails, materials.escalator, 'TheCenterPairedEscalatorHandrails');
  meshStore(group, balustrades, materials.canopyGlass, 'TheCenterEscalatorGlassBalustrades', false);

  const canopy = store(), frame = [];
  for (let side = 0; side < 4; side++) {
    const rotate = (x, z) => side === 0 ? [x, z] : side === 1 ? [-z, x] : side === 2 ? [-x, -z] : [z, -x];
    for (let panel = 0; panel < 4; panel++) {
      const x0 = -13 + panel * 6.5 + 0.04, x1 = -13 + (panel + 1) * 6.5 - 0.04;
      const points = [[x0, 7.3, 13], [x1, 7.3, 13], [x1 * 9 / 13, 8.5, 9], [x0 * 9 / 13, 8.5, 9]].map(([x, y, z]) => { const r = rotate(x, z); return [r[0], y, r[1]]; });
      quad(canopy, ...points, [0.42, 0.60, 0.62]);
    }
    const a = rotate(-13, 13), b = rotate(13, 13), c = rotate(-9, 9), d = rotate(9, 9);
    beam(frame, [a[0], 7.3, a[1]], [b[0], 7.3, b[1]], 0.20, 0.24); beam(frame, [c[0], 8.5, c[1]], [d[0], 8.5, d[1]], 0.18, 0.22);
    for (let panel = 0; panel <= 4; panel++) {
      const x = -13 + panel * 6.5, p0 = rotate(x, 13), p1 = rotate(x * 9 / 13, 9);
      beam(frame, [p0[0], 7.3, p0[1]], [p1[0], 8.5, p1[1]], 0.14, 0.18);
    }
  }
  meshStore(group, canopy, materials.canopyGlass, 'TheCenterGlazedPublicLobbyCanopy', false);
  merged(group, frame, materials.brushedSteel, 'TheCenterPolishedSteelCanopySpaceFrame');
  const lobbyLights = [];
  for (const z of [-7, 0, 7]) beam(lobbyLights, [-7, 7.08, z], [7, 7.08, z], 0.075, 0.09);
  merged(group, lobbyLights, materials.lobbyGlow, 'TheCenterWarmLobbyCeilingLights', false);
  const supports = [];
  for (const x of [-11, 11]) for (const z of [-11, 11]) {
    beam(supports, [x, 0.12, z], [x, 7.3, z], 0.28, 0.32);
  }
  merged(group, supports, materials.brushedSteel, 'TheCenterSlenderLobbyCanopyColumns');
  const towerColumns = [];
  for (let vertexIndex = 1; vertexIndex < 16; vertexIndex += 2) {
    const i = vertexIndex * 2, x = THE_CENTER_LOCAL_RING[i] * 0.94, z = THE_CENTER_LOCAL_RING[i + 1] * 0.94;
    towerColumns.push({ x, y: 6, z });
  }
  instances(group, new THREE.CylinderGeometry(0.55, 0.55, 12, 12), materials.brushedSteel, towerColumns, 'TheCenterEightElevatedTowerSteelColumns');
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.35), new THREE.MeshBasicMaterial({ map: signTexture(), transparent: true, toneMapped: false }));
  sign.position.set(0, 3.1, 5.56); sign.name = 'TheCenterLobbyIdentification'; group.add(sign);

  const planterTransforms = [], bambooTransforms = [], leafTransforms = [], planterColliders = [];
  const selectedVertices = [0, 2, 4, 8, 10, 12];
  for (const vertexIndex of selectedVertices) {
    const i = vertexIndex * 2, x = THE_CENTER_LOCAL_RING[i] * 0.77, z = THE_CENTER_LOCAL_RING[i + 1] * 0.77;
    const angle = Math.atan2(z, x), ry = -angle;
    planterTransforms.push({ x, y: 0.52, z, ry });
    planterColliders.push(theCenterLocalCollider({ x, z, w: 3, d: 1.4, ry, minY: 0.12, maxY: 0.92 }));
    for (let stalk = 0; stalk < 5; stalk++) {
      const offset = (stalk - 2) * 0.42, sx = x + Math.cos(angle) * offset, sz = z + Math.sin(angle) * offset;
      const height = 6.3 + hash(vertexIndex, stalk) * 2.3;
      bambooTransforms.push({ x: sx, y: 0.9 + height * 0.5, z: sz, sy: height });
      for (let level = 0; level < 3; level++) for (let cross = 0; cross < 2; cross++) {
        leafTransforms.push({ x: sx, y: 0.9 + height * (0.66 + level * 0.14), z: sz,
          rx: -Math.PI * 0.5 + (hash(stalk, level) - 0.5) * 0.35,
          ry: hash(stalk, vertexIndex) * Math.PI + cross * Math.PI * 0.5, rz: (hash(level, stalk) - 0.5) * 0.3 });
      }
    }
  }
  instances(group, new THREE.BoxGeometry(3, 0.8, 1.4), materials.planter, planterTransforms, 'TheCenterElevatedPublicSpacePlanters');
  instances(group, new THREE.CylinderGeometry(0.055, 0.075, 1, 6), materials.bamboo, bambooTransforms, 'TheCenterBambooStalks');
  instances(group, new THREE.PlaneGeometry(1.55, 0.58), materials.leaves, leafTransforms, 'TheCenterBambooCanopies', false);
  return { planterColliders, towerColumns: towerColumns.map((entry) => ({ x: entry.x, z: entry.z })) };
}

export function buildTheCenter(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'TheCenterAuthoredLandmark'; group.userData.internalId = 'HK-B0007';
  group.position.set(THE_CENTER_SITE.x, groundOffset, THE_CENTER_SITE.z); group.rotation.y = THE_CENTER_SITE.ry; root.add(group);
  const materials = {
    glass: glassMaterial(), roof: vertexMaterial({ metalness: 0.68, roughness: 0.32 }), drum: glassMaterial(), ledge: vertexMaterial({ metalness: 0.60, roughness: 0.36 }),
    metal: new THREE.MeshStandardNodeMaterial({ color: 0xa8b4b3, metalness: 0.78, roughness: 0.27 }),
    brushedSteel: new THREE.MeshStandardNodeMaterial({ color: 0xaebbb9, metalness: 0.82, roughness: 0.25 }),
    whiteSteel: new THREE.MeshStandardNodeMaterial({ color: 0xd9dfd8, metalness: 0.55, roughness: 0.32 }),
    antennaPanel: new THREE.MeshStandardNodeMaterial({ color: 0xeee9dc, roughness: 0.42 }),
    marble: new THREE.MeshStandardNodeMaterial({ color: 0x183c36, metalness: 0.18, roughness: 0.26 }),
    escalator: new THREE.MeshStandardNodeMaterial({ color: 0x394443, metalness: 0.72, roughness: 0.30 }),
    canopyGlass: new THREE.MeshStandardNodeMaterial({ color: 0x90b4b8, transparent: true, opacity: 0.18, depthWrite: false, metalness: 0.12, roughness: 0.12, side: THREE.DoubleSide }),
    planter: new THREE.MeshStandardNodeMaterial({ color: 0x59635d, roughness: 0.78 }),
    bamboo: new THREE.MeshStandardNodeMaterial({ color: 0x61724b, roughness: 0.82 }),
    leaves: new THREE.MeshStandardNodeMaterial({ color: 0x355c3d, roughness: 0.88, side: THREE.DoubleSide }),
    lobbyGlow: new THREE.MeshStandardNodeMaterial({ color: 0x8d7b54, roughness: 0.42 }),
    beacon: new THREE.MeshStandardNodeMaterial({ color: 0x8d1914, roughness: 0.32 })
  };
  materials.whiteSteel.emissiveNode = color(0xe7f2ff).mul(nightAmount()).mul(0.15);
  materials.brushedSteel.emissiveNode = color(0xffd7a0).mul(nightAmount()).mul(0.035);
  materials.escalator.emissiveNode = color(0xffd7a0).mul(nightAmount()).mul(0.04);
  materials.canopyGlass.emissiveNode = color(0xffd9a6).mul(nightAmount()).mul(0.04);
  materials.lobbyGlow.emissiveNode = color(0xffd6a0).mul(nightAmount().mul(1.4).add(0.03));
  materials.beacon.emissiveNode = color(0xff3525).mul(nightAmount().mul(2).add(0.3));
  const lobby = createPublicLobby(group, materials);
  const curtain = createCurtainWall();
  meshStore(group, curtain.facade, materials.glass, 'TheCenterSixteenFaceSilverReflectiveStarCurtainWall');
  meshStore(group, curtain.frames, materials.metal, 'TheCenterFineSilverMullionsAndTransoms');
  merged(group, curtain.prowFins, materials.brushedSteel, 'TheCenterEightTriangularProwVerticalFins');
  const crown = createCrown(curtain.neonParts);
  meshStore(group, crown.roof, materials.roof, 'TheCenterSteppedHippedMetalCrownRoofs');
  meshStore(group, crown.drum, materials.drum, 'TheCenterGlazedCrownDrumPanels');
  meshStore(group, crown.ledges, materials.ledge, 'TheCenterCrownSetbackRoofLedges');
  merged(group, crown.seams, materials.metal, 'TheCenterCrownStandingSeamsAndRafters');
  createMast(group, materials);

  const neonMaterials = [];
  curtain.neonParts.forEach((parts, zone) => {
    const neonColor = uniform(new THREE.Color().setHSL(zone * 0.085, 0.95, 0.50));
    const material = new THREE.MeshStandardNodeMaterial({ roughness: 0.34, metalness: 0.15 });
    material.colorNode = color(0x4f6062); material.emissiveNode = neonColor.mul(nightAmount().mul(1.15));
    merged(group, parts, material, `TheCenterIncreasingFrequencyRainbowNeonZone${zone}`); neonMaterials.push(neonColor);
  });

  const colliders = [
    theCenterLocalCollider({ w: 11, d: 11, minY: 0, maxY: 12 }),
    theCenterLocalCollider({ w: 22, d: 22, minY: 5.3, maxY: 5.8 }),
    theCenterLocalCollider({ w: 26, d: 26, minY: 7.2, maxY: 8.6 }),
    ...theCenterBodyColliders(),
    theCenterLocalCollider({ w: 60, d: 60, minY: 292, maxY: 304 }),
    theCenterLocalCollider({ w: 34, d: 34, minY: 304, maxY: 318 }),
    theCenterLocalCollider({ w: 8, d: 8, minY: 318, maxY: 328 }),
    theCenterLocalCollider({ w: 4, d: 4, minY: 328, maxY: THE_CENTER_HEIGHT }),
    theCenterLocalCollider({ x: -1.25, z: 10.5, w: 1.9, d: 9, minY: 0.12, maxY: 5.5 }),
    theCenterLocalCollider({ x: 1.25, z: 10.5, w: 1.9, d: 9, minY: 0.12, maxY: 5.5 }),
    ...lobby.planterColliders,
    ...lobby.towerColumns.map(({ x, z }) => theCenterLocalCollider({ x, z, w: 1.1, d: 1.1, minY: 0, maxY: 12 }))
  ];
  for (const x of [-11, 11]) for (const z of [-11, 11]) colliders.push(theCenterLocalCollider({ x, z, w: 0.5, d: 0.5, minY: 0, maxY: 7.3 }));
  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }
  const landmark = { name: THE_CENTER_SITE.name, englishName: THE_CENTER_SITE.englishName,
    x: THE_CENTER_SITE.x, z: THE_CENTER_SITE.z, w: THE_CENTER_SITE.w, d: THE_CENTER_SITE.d, h: THE_CENTER_HEIGHT,
    ry: THE_CENTER_SITE.ry, bounds: { ...THE_CENTER_SITE.bounds }, ring: THE_CENTER_SITE.ring, osmId: THE_CENTER_SITE.osmId };
  const stats = {
    theCenterGroundOffset: groundOffset, theCenterLandmarks: 1, theCenterHeight: THE_CENTER_HEIGHT,
    theCenterRoofHeight: THE_CENTER_ROOF_HEIGHT, theCenterOccupiedHeight: THE_CENTER_OCCUPIED_HEIGHT,
    theCenterLevels: THE_CENTER_LEVELS, theCenterTourismLevels: THE_CENTER_TOURISM_LEVELS,
    theCenterBelowGroundLevels: THE_CENTER_BELOW_GROUND_LEVELS, theCenterBodyStart: THE_CENTER_BODY_START,
    theCenterStarFaces: 16, theCenterVisionPanels: curtain.visionPanels, theCenterFacadeQuads: curtain.facade.quads,
    theCenterFrameQuads: curtain.frames.quads, theCenterNeonBars: curtain.neonBars + crown.neonBars,
    theCenterCrownPanels: crown.crownPanels, theCenterPublicPlanters: lobby.planterColliders.length,
    theCenterColliders: colliders.length
  };
  group.userData.stats = stats;
  return {
    group, colliders, landmarks: [landmark], stats, groundOffset, plazaTop: THE_CENTER_PLAZA_TOP + groundOffset,
    update(dt, elapsed) { neonMaterials.forEach((entry, zone) => entry.value.setHSL((elapsed * 0.018 + zone * 0.085) % 1, 0.95, 0.50)); }
  };
}
