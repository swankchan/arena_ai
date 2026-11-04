import * as THREE from 'three/webgpu';
import { STAR_FERRY_VESSEL_REFERENCE } from './star-ferry-data.js';
import {
  box, cylinder, pushTube, extrudeRing, mergeParts, vesselNameTexture
} from './star-ferry-geometry.js';

export const STAR_FERRY_DIMENSIONS = Object.freeze({
  length: STAR_FERRY_VESSEL_REFERENCE.length,
  beam: STAR_FERRY_VESSEL_REFERENCE.beam,
  deckLevels: 2,
  doubleEnded: true
});

const L = STAR_FERRY_DIMENSIONS.length, B = STAR_FERRY_DIMENSIONS.beam;
const stations = [
  [-0.500, 0.08], [-0.480, 0.40], [-0.445, 0.69], [-0.380, 0.90],
  [-0.295, 0.985], [-0.170, 1], [0, 1], [0.170, 1], [0.295, 0.985],
  [0.380, 0.90], [0.445, 0.69], [0.480, 0.40], [0.500, 0.08]
].map(([z, width]) => [z * L, width * B * 0.5]);

function widthAt(y) {
  if (y <= 0.05) return 0.42 + (y + 1.45) / 1.5 * 0.56;
  return 0.98 + (y - 0.05) / 1.2 * 0.02;
}

function triangle(positions, a, b, c) { positions.push(...a, ...b, ...c); }
function quad(positions, a, b, c, d) { triangle(positions, a, b, c); triangle(positions, a, c, d); }

function hullBand(y0, y1) {
  const positions = [];
  const section = ([z, halfWidth]) => {
    const w0 = halfWidth * widthAt(y0), w1 = halfWidth * widthAt(y1);
    return [[-w0, y0, z], [-w1, y1, z], [w1, y1, z], [w0, y0, z]];
  };
  for (let index = 1; index < stations.length; index++) {
    const a = section(stations[index - 1]), b = section(stations[index]);
    for (let edge = 0; edge < 4; edge++) {
      const next = (edge + 1) % 4;
      quad(positions, a[edge], b[edge], b[next], a[next]);
    }
  }
  for (const index of [0, stations.length - 1]) {
    const s = section(stations[index]);
    quad(positions, s[0], s[1], s[2], s[3]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function deckRing(scaleX = 1, scaleZ = 1) {
  const ring = [];
  for (const [z, width] of stations) ring.push(-width * scaleX, z * scaleZ);
  for (let index = stations.length - 1; index >= 0; index--) {
    const [z, width] = stations[index]; ring.push(width * scaleX, z * scaleZ);
  }
  return ring;
}

function starGeometry(radius = 0.34) {
  const shape = new THREE.Shape();
  for (let index = 0; index < 10; index++) {
    const r = index % 2 ? radius * 0.43 : radius;
    const angle = Math.PI / 2 + index * Math.PI / 5;
    const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
    if (index === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function addBench(parts, x, deckY, z) {
  for (let slat = -1; slat <= 1; slat++) parts.wood.push(box(1.85, 0.075, 0.15, x, deckY + 0.46, z + slat * 0.18));
  // The central backrest and its pivot are the familiar reversible Star Ferry bench construction.
  for (const y of [0.72, 0.91]) parts.wood.push(box(1.85, 0.13, 0.075, x, deckY + y, z + 0.19));
  pushTube(parts.metal, [x - 0.78, deckY + 0.35, z], [x + 0.78, deckY + 0.35, z], 0.035, 7);
  for (const side of [-1, 1]) {
    parts.metal.push(box(0.055, 0.46, 0.055, x + side * 0.72, deckY + 0.23, z));
    parts.metal.push(box(0.055, 0.83, 0.055, x + side * 0.72, deckY + 0.63, z + 0.19));
  }
}

function addStairs(parts, side, end) {
  const x = side * 2.72, startZ = end * 12.1;
  for (let step = 0; step < 10; step++) {
    const t = step / 9;
    parts.white.push(box(1.02, 0.105, 0.48, x, 1.38 + t * 2.10, startZ - end * t * 3.65));
  }
  for (const railSide of [-1, 1]) {
    const rx = x + railSide * 0.55;
    pushTube(parts.white, [rx, 2.25, startZ], [rx, 4.35, startZ - end * 3.65], 0.035, 7);
    for (const t of [0, 0.5, 1]) {
      pushTube(parts.white, [rx, 1.35 + t * 2.1, startZ - end * t * 3.65],
        [rx, 2.25 + t * 2.1, startZ - end * t * 3.65], 0.028, 6);
    }
  }
}

function addEndRails(parts, deckY, scaleZ, minimumZ, railHeight) {
  const ring = deckRing(0.95, scaleZ);
  const count = ring.length / 2;
  for (let index = 0; index < count; index++) {
    const next = (index + 1) % count;
    const ax = ring[index * 2], az = ring[index * 2 + 1];
    const bx = ring[next * 2], bz = ring[next * 2 + 1];
    if (Math.max(Math.abs(az), Math.abs(bz)) < minimumZ) continue;
    pushTube(parts.white, [ax, deckY + railHeight, az], [bx, deckY + railHeight, bz], 0.035, 7);
    pushTube(parts.white, [ax, deckY + 0.12, az], [ax, deckY + railHeight, az], 0.032, 7);
  }
}

let template = null;
const representatives = {};
function vesselTemplate() {
  if (template) return template;
  const materials = {
    green: new THREE.MeshStandardMaterial({ color: 0x17563d, roughness: 0.42, metalness: 0.16, side: THREE.DoubleSide }),
    darkGreen: new THREE.MeshStandardMaterial({ color: 0x102d27, roughness: 0.58, metalness: 0.12, side: THREE.DoubleSide }),
    white: new THREE.MeshStandardMaterial({ color: 0xe9e6d9, roughness: 0.53, metalness: 0.07 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xd8ceb0, roughness: 0.62, metalness: 0.05 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x10252b, roughness: 0.19, metalness: 0.40 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x111b1b, roughness: 0.61, metalness: 0.25 }),
    deck: new THREE.MeshStandardMaterial({ color: 0x70523a, roughness: 0.84, metalness: 0.02 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x8b5c35, roughness: 0.72, metalness: 0.03 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x79817c, roughness: 0.34, metalness: 0.82 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xd7bd72, roughness: 0.48, metalness: 0.15 }),
    black: new THREE.MeshStandardMaterial({ color: 0x171b19, roughness: 0.50, metalness: 0.28 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xd86132, roughness: 0.58, metalness: 0.02 }),
    tape: new THREE.MeshStandardMaterial({ color: 0xeee9d8, roughness: 0.66 }),
    rigging: new THREE.MeshStandardMaterial({ color: 0x424b47, roughness: 0.55, metalness: 0.65 }),
    starGreen: new THREE.MeshStandardMaterial({ color: 0x15513a, roughness: 0.46, side: THREE.DoubleSide }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffd486, emissiveIntensity: 1.35, roughness: 0.25 }),
    redLamp: new THREE.MeshStandardMaterial({ color: 0xa62b20, emissive: 0xff3c24, emissiveIntensity: 0.75 })
  };
  const parts = Object.fromEntries(Object.keys(materials).map((key) => [key, []]));
  parts.darkGreen.push(hullBand(-1.45, 0.05));
  parts.green.push(hullBand(0.05, 1.25));
  parts.deck.push(extrudeRing(deckRing(0.94, 0.84), 3.46, 0.15));
  parts.white.push(extrudeRing(deckRing(0.96, 0.81), 5.91, 0.23));

  // Long open window bands, separate columns and solid parapets: no stacked-box window texture masquerading as a ferry.
  parts.dark.push(box(6.65, 1.55, 22.8, 0, 2.39, 0));
  parts.dark.push(box(6.72, 1.46, 23.6, 0, 4.83, 0));
  for (const side of [-1, 1]) {
    parts.green.push(box(0.13, 0.76, 24.2, side * 3.99, 1.67, 0));
    parts.glass.push(box(0.07, 1.10, 23.0, side * 3.91, 2.62, 0));
    parts.white.push(box(0.15, 0.63, 25.2, side * 3.99, 3.91, 0));
    parts.glass.push(box(0.07, 1.24, 23.9, side * 3.91, 4.88, 0));
    parts.green.push(box(0.12, 0.16, 25.7, side * 4.01, 3.56, 0));
    parts.cream.push(box(0.11, 0.10, 25.8, side * 4.03, 5.82, 0));
    for (let z = -11.5; z <= 11.51; z += 2.3) {
      parts.white.push(box(0.16, 1.90, 0.13, side * 4.01, 2.43, z));
      parts.white.push(box(0.16, 1.70, 0.13, side * 4.01, 4.91, z));
    }
    for (let z = -11; z <= 11.01; z += 2.75) {
      const ring = new THREE.TorusGeometry(0.34, 0.085, 7, 20);
      ring.rotateY(Math.PI / 2); ring.translate(side * 4.14, 4.02, z);
      parts.orange.push(ring);
      for (let band = 0; band < 4; band++) {
        const angle = band * Math.PI / 2;
        parts.tape.push(box(0.13, 0.14, 0.14, side * 4.15,
          4.02 + Math.sin(angle) * 0.34, z + Math.cos(angle) * 0.34));
      }
    }
    for (const z of [-9, -5, 5, 9]) {
      const tyre = new THREE.TorusGeometry(0.36, 0.12, 8, 18);
      tyre.rotateY(Math.PI / 2); tyre.translate(side * 4.18, 0.92, z); parts.black.push(tyre);
      pushTube(parts.rigging, [side * 4.0, 1.55, z], [side * 4.18, 1.25, z], 0.025, 6);
    }
    // Roof-mounted inflatable liferaft canisters, with the red retaining bands seen on the ordinary fleet.
    for (const z of [-6.1, -3.2, 3.2, 6.1]) {
      parts.tape.push(cylinder(0.25, 0.25, 1.25, 12, side * 3.10, 6.40, z, Math.PI / 2));
      parts.orange.push(cylinder(0.258, 0.258, 0.18, 12, side * 3.10, 6.40, z, Math.PI / 2));
    }
    // Cream rubbing strakes follow the actual double-ended hull rather than a rectangular waterline box.
    for (let index = 1; index < stations.length; index++) {
      const [az, aw] = stations[index - 1], [bz, bw] = stations[index];
      pushTube(parts.cream, [side * aw * 1.005, 1.13, az], [side * bw * 1.005, 1.13, bz], 0.075, 7);
      pushTube(parts.yellow, [side * aw * 0.99, 0.52, az], [side * bw * 0.99, 0.52, bz], 0.035, 6);
    }
  }
  for (const end of [-1, 1]) {
    parts.green.push(box(6.6, 0.82, 0.15, 0, 1.68, end * 12.35));
    parts.white.push(box(6.9, 0.60, 0.14, 0, 3.91, end * 12.70));
    for (const x of [-2.8, -1.4, 0, 1.4, 2.8]) {
      parts.white.push(box(0.13, 1.85, 0.14, x, 2.42, end * 12.42));
      parts.white.push(box(0.13, 1.65, 0.14, x, 4.90, end * 12.75));
    }
    addStairs(parts, end, end);
  }
  addEndRails(parts, 1.28, 0.96, 12.2, 0.83);
  addEndRails(parts, 3.61, 0.83, 11.4, 0.90);

  for (const deckY of [1.30, 3.61]) {
    for (const z of [-7.4, -3.0, 3.0, 7.4]) addBench(parts, 0, deckY, z);
  }

  // Both ends have their own compact wheelhouse; the body never needs a 180-degree turnaround at a terminus.
  for (const end of [-1, 1]) {
    const z = end * 8.75;
    parts.white.push(box(4.35, 1.18, 3.05, 0, 6.69, z));
    parts.green.push(box(4.55, 0.15, 3.25, 0, 7.35, z));
    for (const side of [-1, 1]) {
      parts.glass.push(box(0.055, 0.66, 2.48, side * 2.19, 6.78, z));
      parts.white.push(box(0.07, 0.74, 0.09, side * 2.23, 6.78, z));
    }
    parts.glass.push(box(3.78, 0.66, 0.055, 0, 6.78, z + end * 1.55));
    parts.white.push(box(0.09, 0.74, 0.07, 0, 6.78, z + end * 1.59));
    parts.lamp.push(box(0.32, 0.18, 0.18, 0, 7.58, z + end * 1.25));
  }

  // Pale funnel, black cap and the green Star emblem.
  parts.yellow.push(cylinder(0.56, 0.66, 1.82, 14, 0, 7.04, 0));
  parts.black.push(cylinder(0.58, 0.58, 0.36, 14, 0, 7.91, 0));
  for (const side of [-1, 1]) {
    const sideStar = starGeometry(); sideStar.rotateY(side * Math.PI / 2); sideStar.translate(side * 0.585, 7.08, 0);
    parts.starGreen.push(sideStar);
    const endStar = starGeometry(); if (side < 0) endStar.rotateY(Math.PI);
    endStar.translate(0, 7.08, side * 0.585); parts.starGreen.push(endStar);
  }

  // Twin masts, cross trees, navigation lamps and standing/running rigging.
  for (const end of [-1, 1]) {
    const z = end * 11.75;
    parts.white.push(cylinder(0.065, 0.105, 4.75, 9, 0, 8.35, z));
    pushTube(parts.white, [-1.05, 9.52, z], [1.05, 9.52, z], 0.045, 7);
    parts.lamp.push(cylinder(0.11, 0.11, 0.22, 9, 0, 10.78, z));
    parts.redLamp.push(box(0.18, 0.16, 0.20, end * 0.68, 9.52, z));
    for (const side of [-1, 1]) {
      pushTube(parts.rigging, [0, 10.60, z], [side * 3.30, 6.08, end * 5.1], 0.018, 5);
      pushTube(parts.rigging, [0, 10.55, z], [side * 2.45, 6.08, end * 14.0], 0.018, 5);
    }
  }
  pushTube(parts.rigging, [0, 10.55, -11.75], [0, 10.55, 11.75], 0.016, 5);

  template = { parts, materials };
  return template;
}

export function createStarFerryVessel(name = 'MORNING STAR') {
  const { parts, materials } = vesselTemplate();
  const group = new THREE.Group();
  group.name = `HongKongStarFerry:${name}`;
  group.userData = {
    vehicleType: 'double-ended-double-deck-ferry', ...STAR_FERRY_DIMENSIONS,
    reference: STAR_FERRY_VESSEL_REFERENCE,
    features: ['open window bands', 'reversible wooden benches', 'two wheelhouses', 'life rings and roof liferafts', 'tyre fenders', 'twin masts and rigging']
  };
  // Geometries are cached after the first assembled vessel; subsequent vessels only allocate their scene meshes.
  if (!template.cachedParts) {
    template.cachedParts = Object.fromEntries(
      Object.entries(parts).filter(([, list]) => list.length).map(([kind, list]) => [kind, mergeParts(list)])
    );
  }
  const cachedParts = template.cachedParts;
  for (const [kind, geometry] of Object.entries(cachedParts)) {
    const mesh = new THREE.Mesh(geometry, materials[kind]);
    mesh.name = `HongKongStarFerry${kind[0].toUpperCase()}${kind.slice(1)}`;
    mesh.castShadow = kind !== 'glass' && kind !== 'lamp'; mesh.receiveShadow = kind !== 'lamp';
    if (representatives[kind]) mesh.userData.sharesPipelineWith = representatives[kind];
    else representatives[kind] = mesh;
    group.add(mesh);
  }
  const nameMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: vesselNameTexture(name), transparent: true, depthWrite: false,
    roughness: 0.52, metalness: 0.08, side: THREE.DoubleSide
  });
  for (const side of [-1, 1]) {
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 0.88), nameMaterial);
    plate.name = 'HongKongStarFerryHullName';
    plate.rotation.y = side * Math.PI / 2;
    plate.position.set(side * 4.31, 0.77, 0);
    group.add(plate);
  }
  return group;
}

