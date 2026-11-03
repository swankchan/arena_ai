import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { HK_TRAM_NETWORK } from '../../hk-tram-network-data.js';
import { advanceTramMotion, createTramMotion, createTramPath, sampleTramPath, sampleTramTrolleyContact } from './tram-motion.js';

// Hong Kong Tramways: 1,067 mm gauge, embedded running rails and a 550 V DC single-trolley-pole overhead.
// Track geometry is generated separately from real route-relation geometry; this module only renders and animates it.
const CHUNK_SIZE = 1000;
const DRAW_RANGE = 2800;
const VEHICLE_RANGE = 1200;
const RAIL_TOP = 0.026;
const WHEEL_RADIUS = 0.34;
const WHEELBASE = 5.3;
const TROLLEY_ROOF_Y = 4.34;
const TROLLEY_SETBACK = 2.8;
const representatives = {};

function chunkKey(x, z) { return `${Math.floor(x / CHUNK_SIZE)},${Math.floor(z / CHUNK_SIZE)}`; }
function getChunk(map, x, z) {
  const key = chunkKey(x, z);
  let chunk = map.get(key);
  if (!chunk) {
    chunk = map.set(key, {
      key, parts: { paving: [], rail: [], groove: [], contact: [], span: [] }, poles: [], insulators: [],
      minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity
    }).get(key);
  }
  chunk.minX = Math.min(chunk.minX, x); chunk.maxX = Math.max(chunk.maxX, x);
  chunk.minZ = Math.min(chunk.minZ, z); chunk.maxZ = Math.max(chunk.maxZ, z);
  return chunk;
}

function triangle(positions, a, b, c) { positions.push(...a, ...b, ...c); }
function quad(positions, a, b, c, d) { triangle(positions, a, b, c); triangle(positions, a, c, d); }

function ribbonSegment(positions, a, b, offsetA, offsetB, halfWidth, height) {
  const leftA = [a[0] + offsetA[0] * (offsetA[2] + halfWidth), a[1] + height, a[2] + offsetA[1] * (offsetA[2] + halfWidth)];
  const rightA = [a[0] + offsetA[0] * (offsetA[2] - halfWidth), a[1] + height, a[2] + offsetA[1] * (offsetA[2] - halfWidth)];
  const leftB = [b[0] + offsetB[0] * (offsetB[2] + halfWidth), b[1] + height, b[2] + offsetB[1] * (offsetB[2] + halfWidth)];
  const rightB = [b[0] + offsetB[0] * (offsetB[2] - halfWidth), b[1] + height, b[2] + offsetB[1] * (offsetB[2] - halfWidth)];
  quad(positions, leftA, leftB, rightB, rightA);
}

function tubeSegment(positions, a, b, radius, sides = 4) {
  const direction = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  if (direction.lengthSq() < 1e-10) return;
  direction.normalize();
  const reference = Math.abs(direction.y) > 0.92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const side = new THREE.Vector3().crossVectors(direction, reference).normalize();
  const up = new THREE.Vector3().crossVectors(side, direction).normalize();
  const ring = (point, angle) => {
    const c = Math.cos(angle) * radius, s = Math.sin(angle) * radius;
    return [point[0] + side.x * c + up.x * s, point[1] + side.y * c + up.y * s, point[2] + side.z * c + up.z * s];
  };
  for (let index = 0; index < sides; index++) {
    const a0 = index * Math.PI * 2 / sides, a1 = (index + 1) * Math.PI * 2 / sides;
    quad(positions, ring(a, a0), ring(b, a0), ring(b, a1), ring(a, a1));
  }
}

function positionsGeometry(positions) {
  if (!positions.length) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function mergedMesh(positions, material, name, kind, shadows = false) {
  const geometry = positionsGeometry(positions);
  if (!geometry) return null;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  if (representatives[kind]) mesh.userData.sharesPipelineWith = representatives[kind];
  else representatives[kind] = mesh;
  return mesh;
}

function trackPoint(track, index) {
  return [track.points[index * 3], track.points[index * 3 + 1], track.points[index * 3 + 2]];
}

function trackOffsets(track) {
  const offsets = [];
  const count = track.points.length / 3;
  for (let index = 0; index < count; index++) {
    const before = trackPoint(track, Math.max(0, index - 1)), after = trackPoint(track, Math.min(count - 1, index + 1));
    const dx = after[0] - before[0], dz = after[2] - before[2], length = Math.hypot(dx, dz) || 1;
    offsets.push([dz / length, -dx / length, (HK_TRAM_NETWORK.gauge + HK_TRAM_NETWORK.railHeadWidth) * 0.5]);
  }
  return offsets;
}

function createInfrastructure(root, paths) {
  const group = new THREE.Group();
  group.name = 'HongKongTramInfrastructure';
  root.add(group);
  const chunks = new Map();
  const railOffset = (HK_TRAM_NETWORK.gauge + HK_TRAM_NETWORK.railHeadWidth) * 0.5;
  for (const track of HK_TRAM_NETWORK.tracks) {
    const offsets = trackOffsets(track), count = track.points.length / 3, paving = new Set(track.paving || []);
    for (let index = 1; index < count; index++) {
      const a = trackPoint(track, index - 1), b = trackPoint(track, index);
      const chunk = getChunk(chunks, (a[0] + b[0]) * 0.5, (a[2] + b[2]) * 0.5);
      if (paving.has(index - 1) || paving.has(index)) {
        ribbonSegment(chunk.parts.paving, a, b,
          [offsets[index - 1][0], offsets[index - 1][1], 0], [offsets[index][0], offsets[index][1], 0], 1.65, -0.008);
      }
      for (const sign of [-1, 1]) {
        const oa = [offsets[index - 1][0] * sign, offsets[index - 1][1] * sign, railOffset];
        const ob = [offsets[index][0] * sign, offsets[index][1] * sign, railOffset];
        ribbonSegment(chunk.parts.groove, a, b, oa, ob, 0.082, 0.012);
        ribbonSegment(chunk.parts.rail, a, b, oa, ob, HK_TRAM_NETWORK.railHeadWidth * 0.5, RAIL_TOP);
      }
      tubeSegment(chunk.parts.contact, [a[0], a[1] + HK_TRAM_NETWORK.contactWireHeight, a[2]], [b[0], b[1] + HK_TRAM_NETWORK.contactWireHeight, b[2]], 0.024, 4);
    }
  }

  for (const span of HK_TRAM_NETWORK.spans) {
    const cx = (span.left[0] + span.right[0]) * 0.5, cz = (span.left[2] + span.right[2]) * 0.5;
    const chunk = getChunk(chunks, cx, cz);
    const drops = span.drops.map(([trackIndex, s]) => {
      const point = sampleTramPath(paths[trackIndex], s);
      return { x: point.x, y: point.y + HK_TRAM_NETWORK.contactWireHeight, z: point.z };
    });
    const requiredTop = Math.max(...drops.map((drop) => drop.y)) + 0.48;
    const topLeft = Math.max(span.left[1] + HK_TRAM_NETWORK.poleHeight, requiredTop);
    const topRight = Math.max(span.right[1] + HK_TRAM_NETWORK.poleHeight, requiredTop);
    chunk.poles.push([span.left[0], span.left[1], span.left[2], topLeft - span.left[1]]);
    chunk.poles.push([span.right[0], span.right[1], span.right[2], topRight - span.right[1]]);
    const dx = span.right[0] - span.left[0], dz = span.right[2] - span.left[2];
    const lengthSq = dx * dx + dz * dz || 1;
    const crossPoint = (t) => [
      span.left[0] + dx * t,
      topLeft + (topRight - topLeft) * t - 0.16 * 4 * t * (1 - t),
      span.left[2] + dz * t
    ];
    for (let index = 1; index <= 6; index++) tubeSegment(chunk.parts.span, crossPoint((index - 1) / 6), crossPoint(index / 6), 0.019, 4);
    for (const drop of drops) {
      const t = THREE.MathUtils.clamp(((drop.x - span.left[0]) * dx + (drop.z - span.left[2]) * dz) / lengthSq, 0, 1);
      const support = crossPoint(t);
      tubeSegment(chunk.parts.span, support, [drop.x, drop.y, drop.z], 0.016, 4);
      chunk.insulators.push([support[0], support[1] - 0.10, support[2]]);
      // The contact ear is a real metal fitting around the wire, not a floating decorative marker.
      tubeSegment(chunk.parts.span, [drop.x - 0.12, drop.y, drop.z], [drop.x + 0.12, drop.y, drop.z], 0.035, 4);
    }
  }

  const materials = {
    paving: new THREE.MeshStandardMaterial({ color: 0x292d2c, metalness: 0.02, roughness: 0.96 }),
    rail: new THREE.MeshStandardMaterial({ color: 0x8f9694, metalness: 0.88, roughness: 0.28 }),
    groove: new THREE.MeshStandardMaterial({ color: 0x111615, metalness: 0.25, roughness: 0.82 }),
    contact: new THREE.MeshStandardMaterial({ color: 0x50483c, metalness: 0.82, roughness: 0.4 }),
    span: new THREE.MeshStandardMaterial({ color: 0x3c4240, metalness: 0.78, roughness: 0.48 }),
    pole: new THREE.MeshStandardMaterial({ color: 0x59645e, metalness: 0.68, roughness: 0.52 }),
    insulator: new THREE.MeshStandardMaterial({ color: 0xb8b29b, metalness: 0.05, roughness: 0.54 })
  };
  const poleGeometry = new THREE.CylinderGeometry(0.075, 0.115, 1, 7).translate(0, 0.5, 0);
  const insulatorGeometry = new THREE.CylinderGeometry(0.075, 0.075, 0.20, 8);
  const dummy = new THREE.Object3D(), result = [];
  for (const chunk of chunks.values()) {
    const chunkGroup = new THREE.Group();
    chunkGroup.name = `HongKongTramChunk:${chunk.key}`;
    group.add(chunkGroup);
    for (const kind of ['paving', 'groove', 'rail', 'contact', 'span']) {
      const mesh = mergedMesh(chunk.parts[kind], materials[kind], `HongKongTram${kind[0].toUpperCase()}${kind.slice(1)}:${chunk.key}`, kind, kind === 'rail' || kind === 'paving');
      if (mesh) chunkGroup.add(mesh);
    }
    if (chunk.poles.length) {
      const poles = new THREE.InstancedMesh(poleGeometry, materials.pole, chunk.poles.length);
      poles.name = `HongKongTramSupportPoles:${chunk.key}`;
      poles.castShadow = true;
      if (representatives.pole) poles.userData.sharesPipelineWith = representatives.pole; else representatives.pole = poles;
      chunk.poles.forEach((pole, index) => {
        dummy.position.set(pole[0], pole[1], pole[2]); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, pole[3], 1); dummy.updateMatrix();
        poles.setMatrixAt(index, dummy.matrix);
      });
      poles.instanceMatrix.needsUpdate = true; poles.computeBoundingSphere(); chunkGroup.add(poles);
    }
    if (chunk.insulators.length) {
      const insulators = new THREE.InstancedMesh(insulatorGeometry, materials.insulator, chunk.insulators.length);
      insulators.name = `HongKongTramInsulators:${chunk.key}`;
      if (representatives.insulator) insulators.userData.sharesPipelineWith = representatives.insulator; else representatives.insulator = insulators;
      chunk.insulators.forEach((position, index) => {
        dummy.position.set(...position); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
        insulators.setMatrixAt(index, dummy.matrix);
      });
      insulators.instanceMatrix.needsUpdate = true; insulators.computeBoundingSphere(); chunkGroup.add(insulators);
    }
    result.push({ ...chunk, group: chunkGroup });
  }
  function updateAt(position) {
    for (const chunk of result) {
      const dx = Math.max(chunk.minX - position.x, 0, position.x - chunk.maxX);
      const dz = Math.max(chunk.minZ - position.z, 0, position.z - chunk.maxZ);
      chunk.group.visible = dx * dx + dz * dz <= DRAW_RANGE * DRAW_RANGE;
    }
  }
  updateAt({ x: 0, z: 0 });
  return { group, chunks: result, updateAt };
}

function box(w, h, d, x, y, z, radius = 0) {
  const geometry = radius > 0 ? new RoundedBoxGeometry(w, h, d, 2, radius) : new THREE.BoxGeometry(w, h, d);
  return geometry.translate(x, y, z);
}
function cylinder(rt, rb, h, segments, x, y, z, rx = 0, rz = 0) {
  const geometry = new THREE.CylinderGeometry(rt, rb, h, segments);
  if (rx) geometry.rotateX(rx); if (rz) geometry.rotateZ(rz);
  return geometry.translate(x, y, z);
}
function mergeParts(parts) {
  const normalized = parts.map((part) => part.index ? part.toNonIndexed() : part);
  const geometry = mergeGeometries(normalized, false);
  for (const part of parts) part.dispose();
  for (const part of normalized) if (!parts.includes(part)) part.dispose();
  return geometry;
}

function destinationTexture(title, subtitle) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = '#171b16'; context.fillRect(0, 0, 512, 128);
  context.strokeStyle = '#b7a86c'; context.lineWidth = 5; context.strokeRect(3, 3, 506, 122);
  context.fillStyle = '#fff4c8'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.font = '700 54px "Noto Sans TC", sans-serif'; context.fillText(title, 256, 44);
  context.font = '600 27px sans-serif'; context.fillText(subtitle, 256, 94);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const tramTemplates = new Map();
function tramTemplate(color, title, subtitle) {
  const key = `${color}:${title}`;
  if (tramTemplates.has(key)) return tramTemplates.get(key);
  const body = new THREE.MeshStandardMaterial({ color, roughness: 0.43, metalness: 0.18 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xe3d8b9, roughness: 0.58, metalness: 0.06 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x142a31, roughness: 0.16, metalness: 0.48 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x171c1c, roughness: 0.62, metalness: 0.32 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x8a918c, roughness: 0.32, metalness: 0.85 });
  const lamp = new THREE.MeshStandardMaterial({ color: 0xfff1c3, emissive: 0xffd57a, emissiveIntensity: 1.5, roughness: 0.28 });
  const redLamp = new THREE.MeshStandardMaterial({ color: 0x9e1f16, emissive: 0xff2b12, emissiveIntensity: 0.7 });
  const destination = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: destinationTexture(title, subtitle), emissive: 0xffe3a0, emissiveIntensity: 0.24, roughness: 0.4
  });
  const parts = { body: [], cream: [], glass: [], dark: [], metal: [], lamp: [], redLamp: [], destination: [] };
  parts.body.push(box(2.02, 1.64, 8.58, 0, 1.35, 0, 0.12));
  parts.body.push(box(1.98, 1.72, 8.38, 0, 3.10, 0, 0.12));
  parts.cream.push(box(2.08, 0.28, 8.64, 0, 4.10, 0, 0.13));
  parts.dark.push(box(1.84, 0.24, 8.30, 0, 0.53, 0, 0.04));
  parts.metal.push(box(1.90, 0.10, 8.48, 0, 0.69, 0));
  parts.cream.push(box(2.06, 0.11, 8.56, 0, 2.19, 0));
  parts.dark.push(box(1.30, 0.16, 2.05, 0, 4.31, -0.5, 0.04));
  parts.metal.push(cylinder(0.12, 0.15, 0.13, 10, 0, TROLLEY_ROOF_Y, 0.4));

  for (const side of [-1, 1]) {
    for (const z of [-3.30, -2.18, -1.06, 0.06, 1.18, 2.30, 3.34]) {
      parts.glass.push(box(0.035, 0.91, 0.91, side * 0.998, 3.17, z, 0.025));
      parts.cream.push(box(0.045, 1.02, 0.045, side * 1.014, 3.17, z + 0.49));
    }
    for (const z of [-3.25, -2.02, -0.79, 0.44, 1.67, 2.90]) {
      if (side === 1 && (z < -2.5 || z > 2.5)) continue;
      parts.glass.push(box(0.035, 0.79, 1.00, side * 1.021, 1.48, z, 0.02));
    }
    parts.cream.push(box(0.055, 0.08, 7.85, side * 1.025, 1.98, 0));
    parts.cream.push(box(0.055, 0.08, 7.90, side * 1.012, 3.75, 0));
  }
  // Left-hand-traffic passenger doors, at the front and rear of the kerb side.
  for (const z of [-3.20, 3.12]) {
    parts.dark.push(box(0.045, 1.58, 1.02, 1.033, 1.35, z));
    parts.glass.push(box(0.052, 1.15, 0.78, 1.059, 1.53, z));
    parts.cream.push(box(0.058, 1.58, 0.045, 1.065, 1.35, z));
  }
  for (const end of [-1, 1]) {
    const z = end * 4.205;
    parts.glass.push(box(1.64, 0.80, 0.04, 0, 1.48, end * 4.293, 0.04));
    parts.glass.push(box(1.60, 0.93, 0.04, 0, 3.14, end * 4.195, 0.04));
    parts.cream.push(box(1.76, 0.075, 0.07, 0, 2.18, end * 4.24));
    parts.cream.push(box(0.075, 1.03, 0.07, 0, 3.13, end * 4.22));
    const board = new THREE.PlaneGeometry(1.30, 0.33);
    if (end < 0) board.rotateY(Math.PI);
    board.translate(0, 3.82, end * 4.245);
    parts.destination.push(board);
    parts.dark.push(box(1.48, 0.45, 0.08, 0, 3.82, end * 4.20, 0.04));
    for (const x of [-0.63, 0.63]) {
      const light = cylinder(0.12, 0.12, 0.06, 12, x, 0.96, end * 4.325, Math.PI / 2);
      parts[end > 0 ? 'lamp' : 'redLamp'].push(light);
    }
    parts.metal.push(box(1.82, 0.11, 0.16, 0, 0.61, end * 4.30, 0.035));
  }
  for (const z of [-WHEELBASE * 0.5, WHEELBASE * 0.5]) {
    parts.dark.push(box(1.42, 0.22, 1.12, 0, 0.43, z, 0.04));
    for (const side of [-1, 1]) {
      parts.dark.push(cylinder(WHEEL_RADIUS, WHEEL_RADIUS, 0.15, 14, side * 0.64, WHEEL_RADIUS, z, 0, Math.PI / 2));
      parts.metal.push(cylinder(0.19, 0.19, 0.158, 12, side * 0.64, WHEEL_RADIUS, z, 0, Math.PI / 2));
    }
  }
  const template = Object.entries(parts).filter(([, list]) => list.length).map(([kind, list]) => ({
    geometry: mergeParts(list), material: { body, cream, glass, dark, metal, lamp, redLamp, destination }[kind], kind
  }));
  tramTemplates.set(key, template);
  return template;
}

function createTramMesh(color, title, subtitle, number) {
  const group = new THREE.Group();
  group.name = `HongKongTram:${number}`;
  group.userData.vehicleType = 'double-deck-tram';
  group.userData.gauge = HK_TRAM_NETWORK.gauge;
  for (const part of tramTemplate(color, title, subtitle)) {
    const mesh = new THREE.Mesh(part.geometry, part.material);
    mesh.name = `HongKongTram${part.kind[0].toUpperCase()}${part.kind.slice(1)}`;
    mesh.castShadow = true; mesh.receiveShadow = true;
    if (representatives[`vehicle-${part.kind}`]) mesh.userData.sharesPipelineWith = representatives[`vehicle-${part.kind}`];
    else representatives[`vehicle-${part.kind}`] = mesh;
    group.add(mesh);
  }
  return group;
}

function createTrolley(root) {
  const material = new THREE.MeshStandardMaterial({ color: 0x343a37, metalness: 0.82, roughness: 0.38 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.040, 1, 7), material);
  pole.name = 'HongKongTramTrolleyPole'; pole.castShadow = true;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.055, 0.13), material);
  head.name = 'HongKongTramTrolleyContactShoe';
  root.add(pole, head);
  return { pole, head };
}

const up = new THREE.Vector3(0, 1, 0);
function placePole(vehicle, pivot, contact) {
  const direction = new THREE.Vector3().subVectors(contact, pivot);
  const length = direction.length();
  vehicle.pole.position.copy(pivot).add(contact).multiplyScalar(0.5);
  vehicle.pole.quaternion.setFromUnitVectors(up, direction.normalize());
  vehicle.pole.scale.set(1, length, 1);
  vehicle.head.position.copy(contact);
  vehicle.head.rotation.set(0, vehicle.mesh.rotation.y, 0);
}

export function createHongKongTramway(scene) {
  const root = new THREE.Group(); root.name = 'HongKongTramway'; scene.add(root);
  const paths = HK_TRAM_NETWORK.tracks.map(createTramPath);
  const infrastructure = createInfrastructure(root, paths);
  const fleet = new THREE.Group(); fleet.name = 'HongKongTramFleet'; root.add(fleet);
  const trams = [];
  const styles = [
    [0x176344, '筲箕灣', 'SHAU KEI WAN'], [0x8d2d27, '堅尼地城', 'KENNEDY TOWN'],
    [0x216b70, '跑馬地', 'HAPPY VALLEY'], [0x365c38, '北角', 'NORTH POINT']
  ];
  const counts = [6, 2, 2, 6];
  let number = 120;
  HK_TRAM_NETWORK.tracks.forEach((track, trackIndex) => {
    const path = paths[trackIndex], count = counts[trackIndex] || 0;
    for (let index = 0; index < count; index++) {
      const style = styles[(trackIndex + index) % styles.length];
      const mesh = createTramMesh(style[0], style[1], style[2], number);
      fleet.add(mesh);
      const trolley = createTrolley(fleet);
      const direction = track.id === 'hk-tram-west' || (trackIndex > 0 && index % 2) ? -1 : 1;
      const motion = createTramMotion(path, path.length * (0.07 + 0.86 * (index + 0.35) / count), direction);
      trams.push({ mesh, ...trolley, path, trackIndex, motion, number: number++ });
    }
  });

  function update(dt, elapsed, cameraSystem) {
    const camera = cameraSystem?.currentPos;
    for (const tram of trams) {
      advanceTramMotion(tram.motion, tram.path, dt);
      const center = sampleTramPath(tram.path, tram.motion.s);
      const front = sampleTramPath(tram.path, tram.motion.s + WHEELBASE * 0.5);
      const rear = sampleTramPath(tram.path, tram.motion.s - WHEELBASE * 0.5);
      const dx = front.x - rear.x, dz = front.z - rear.z, dy = front.y - rear.y;
      const horizontal = Math.hypot(dx, dz) || 1;
      tram.mesh.position.set(center.x, center.y + RAIL_TOP, center.z);
      tram.mesh.rotation.set(-Math.atan2(dy, horizontal), Math.atan2(dx, dz), 0, 'YXZ');
      tram.mesh.updateMatrixWorld();
      const tip = sampleTramTrolleyContact(tram.path, tram.motion.s, tram.motion.dir, HK_TRAM_NETWORK.contactWireHeight, TROLLEY_SETBACK);
      const contact = new THREE.Vector3(tip.x, tip.y, tip.z);
      const pivot = tram.mesh.localToWorld(new THREE.Vector3(0, TROLLEY_ROOF_Y, 0.4));
      placePole(tram, pivot, contact);
      tram.contact = contact;
      tram.visiblePosition = center;
      if (camera) {
        const distanceSq = (center.x - camera.x) ** 2 + (center.z - camera.z) ** 2;
        const visible = distanceSq <= VEHICLE_RANGE * VEHICLE_RANGE;
        tram.mesh.visible = visible; tram.pole.visible = visible; tram.head.visible = visible;
      }
    }
    if (camera) infrastructure.updateAt(camera);
  }

  update(0, 0);
  const stats = {
    trams: trams.length, tramTracks: paths.length, tramStops: HK_TRAM_NETWORK.stats.stopAssignments,
    tramTrackLengthM: HK_TRAM_NETWORK.stats.trackLengthM, tramGaugeM: HK_TRAM_NETWORK.gauge,
    tramVoltageDC: HK_TRAM_NETWORK.voltageDC, tramSupportSpans: HK_TRAM_NETWORK.stats.supportSpans,
    tramSupportPoles: HK_TRAM_NETWORK.stats.supportPoles, tramContactWireHeightM: HK_TRAM_NETWORK.contactWireHeight,
    tramAsphaltInfillPoints: HK_TRAM_NETWORK.stats.asphaltInfillPoints
  };
  root.userData.stats = stats;
  return { group: root, infrastructure, trams, paths, stats, update, updateAt: infrastructure.updateAt };
}
