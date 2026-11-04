import * as THREE from 'three/webgpu';
import { pointInFlatRing } from './landmark-site.js';
import { STAR_FERRY_TERMINALS } from './star-ferry-data.js';
import {
  box, cylinder, pushTube, extrudeRing, ringEdge, addMergedMeshes,
  terminalSignTexture, clockTexture
} from './star-ferry-geometry.js';

const representatives = {};
let shared = null;
function terminalMaterials() {
  if (shared) return shared;
  shared = {
    concrete: new THREE.MeshStandardMaterial({ color: 0x9b9c91, roughness: 0.91, metalness: 0.03 }),
    fascia: new THREE.MeshStandardMaterial({ color: 0x243c34, roughness: 0.75, metalness: 0.15 }),
    pile: new THREE.MeshStandardMaterial({ color: 0x242b29, roughness: 0.82, metalness: 0.24 }),
    fender: new THREE.MeshStandardMaterial({ color: 0x151a18, roughness: 0.88, metalness: 0.06 }),
    white: new THREE.MeshStandardMaterial({ color: 0xe7e5d9, roughness: 0.61, metalness: 0.06 }),
    green: new THREE.MeshStandardMaterial({ color: 0x275d47, roughness: 0.48, metalness: 0.24 }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x31545a, emissive: 0x536148, emissiveIntensity: 0.14, roughness: 0.20, metalness: 0.48
    }),
    roof: new THREE.MeshStandardMaterial({ color: 0x4f8278, roughness: 0.58, metalness: 0.20 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x182725, roughness: 0.54, metalness: 0.26 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x68756f, roughness: 0.38, metalness: 0.78 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x866548, roughness: 0.82, metalness: 0.02 }),
    deck: new THREE.MeshStandardMaterial({ color: 0x75654f, roughness: 0.88, metalness: 0.02 }),
    foliage: new THREE.MeshStandardMaterial({ color: 0x365d38, roughness: 0.94, metalness: 0 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xffedbd, emissive: 0xffd182, emissiveIntensity: 1.15, roughness: 0.28 }),
    railingGlass: new THREE.MeshStandardMaterial({
      color: 0x8fb5b2, roughness: 0.20, metalness: 0.12, transparent: true, opacity: 0.30, depthWrite: false
    })
  };
  return shared;
}

function partsFor(materials) {
  return Object.fromEntries(Object.keys(materials).map((key) => [key, []]));
}

function addPierBase(site, parts) {
  const ring = site.localRing;
  parts.fascia.push(extrudeRing(ring, -0.38, 1.48));
  parts.concrete.push(extrudeRing(ring, 1.10, 0.25));
  const count = ring.length / 2;
  for (let index = 0; index < count; index++) {
    const edge = ringEdge(ring, index);
    if (edge.length < 0.35) continue;
    const px = edge.x - edge.nx * 0.55, pz = edge.z - edge.nz * 0.55;
    parts.pile.push(cylinder(0.28, 0.36, 5.0, 8, px, -1.48, pz));
    if (edge.length > 0.9) {
      parts.fender.push(box(Math.min(0.48, edge.length * 0.65), 2.15, 0.30,
        edge.x + edge.nx * 0.22, 0.02, edge.z + edge.nz * 0.22, edge.ry));
    }
    // A visible braced pile bent under every long straight section gives the terminals a genuine piled-pier structure.
    if (edge.length > 9) {
      const ax = edge.ax - edge.nx * 0.7, az = edge.az - edge.nz * 0.7;
      const bx = edge.bx - edge.nx * 0.7, bz = edge.bz - edge.nz * 0.7;
      pushTube(parts.pile, [ax, -2.8, az], [bx, 0.82, bz], 0.12, 7);
      pushTube(parts.pile, [bx, -2.8, bz], [ax, 0.82, az], 0.12, 7);
    }
  }
}

function addWindowBands(parts, ring, levels, frame = 'green') {
  const count = ring.length / 2;
  for (let index = 0; index < count; index++) {
    const edge = ringEdge(ring, index);
    if (edge.length < 0.65) continue;
    const windows = Math.max(1, Math.floor(edge.length / 2.35));
    for (const { y, h } of levels) {
      for (let pane = 0; pane < windows; pane++) {
        const t = (pane + 0.5) / windows;
        const width = Math.max(0.28, edge.length / windows * 0.76);
        parts.glass.push(box(width, h, 0.075,
          edge.ax + edge.dx * t + edge.nx * 0.065, y,
          edge.az + edge.dz * t + edge.nz * 0.065, edge.ry));
      }
      for (let mullion = 0; mullion <= windows; mullion++) {
        const t = mullion / windows;
        parts[frame].push(box(0.085, h + 0.18, 0.105,
          edge.ax + edge.dx * t + edge.nx * 0.09, y,
          edge.az + edge.dz * t + edge.nz * 0.09, edge.ry));
      }
    }
  }
}

function addPerimeterRail(parts, ring, base, height, glass = false) {
  const count = ring.length / 2;
  for (let index = 0; index < count; index++) {
    const edge = ringEdge(ring, index);
    if (edge.length < 0.3) continue;
    if (glass) {
      parts.railingGlass.push(box(Math.max(0.2, edge.length - 0.08), height * 0.78, 0.045,
        edge.x, base + height * 0.48, edge.z, edge.ry));
    }
    pushTube(parts.white, [edge.ax, base + height, edge.az], [edge.bx, base + height, edge.bz], 0.038, 7);
    const posts = Math.max(1, Math.ceil(edge.length / 3));
    for (let post = 0; post <= posts; post++) {
      const t = post / posts, x = edge.ax + edge.dx * t, z = edge.az + edge.dz * t;
      pushTube(parts.white, [x, base, z], [x, base + height, z], 0.032, 6);
    }
  }
}

function bestEdge(ring, predicate) {
  let best = null;
  for (let index = 0; index < ring.length / 2; index++) {
    const edge = ringEdge(ring, index);
    if (predicate(edge) && (!best || edge.length > best.length)) best = edge;
  }
  return best;
}

function addEdgeSign(group, ring, material, predicate, y, maxWidth = 20, height = 1.65, name = 'HongKongFerryTerminalSign') {
  const edge = bestEdge(ring, predicate);
  if (!edge) return null;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(maxWidth, edge.length * 0.88), height), material);
  mesh.name = name;
  const normalDot = Math.sin(edge.ry) * edge.nx + Math.cos(edge.ry) * edge.nz;
  mesh.rotation.y = edge.ry + (normalDot < 0 ? Math.PI : 0);
  mesh.position.set(edge.x + edge.nx * 0.16, y, edge.z + edge.nz * 0.16);
  group.add(mesh);
  return mesh;
}

function signMaterial(title, subtitle, detail, palette) {
  const map = terminalSignTexture(title, subtitle, detail, palette);
  return new THREE.MeshStandardMaterial({
    color: 0xffffff, map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0.28,
    roughness: 0.48, side: THREE.DoubleSide
  });
}

function addRoofVent(parts, site, x, z, w = 3.2, d = 2.1, base = 8.35) {
  if (!pointInFlatRing(site.localRing, x, z)) return;
  parts.white.push(box(w, 0.95, d, x, base + 0.48, z));
  for (let stripe = -1; stripe <= 1; stripe++) {
    parts.dark.push(box(w * 0.72, 0.09, 0.06, x, base + 0.35 + stripe * 0.20, z + d * 0.51));
  }
  parts.green.push(box(w + 0.18, 0.12, d + 0.18, x, base + 1.01, z));
}

function buildTsimShaTsui(site, group, parts, materials) {
  const ring = site.localRing;
  parts.white.push(extrudeRing(ring, 1.35, 3.18));
  parts.green.push(extrudeRing(ring, 4.53, 0.24));
  parts.white.push(extrudeRing(ring, 4.77, 3.22));
  parts.green.push(extrudeRing(ring, 7.99, 0.18));
  parts.white.push(extrudeRing(ring, 8.17, 0.20));
  addWindowBands(parts, ring, [{ y: 2.91, h: 1.22 }, { y: 6.30, h: 1.40 }], 'white');
  addPerimeterRail(parts, ring, 8.38, 0.72);
  for (const [x, z] of [[-24, 35], [2, 35], [28, 35], [-36, -9], [45, -9]]) addRoofVent(parts, site, x, z);
  // Long Streamline Moderne canopies and rounded terminal ends come from the source outline itself.
  addEdgeSign(group, ring, signMaterial('尖沙咀天星碼頭', 'Tsim Sha Tsui Star Ferry Pier'),
    (edge) => edge.z > 30 && Math.abs(edge.x) < 28, 6.45, 20, 1.75);
  addEdgeSign(group, ring, signMaterial('往中環', 'TO CENTRAL', '上層入口 UPPER DECK'),
    (edge) => edge.x < -35 && Math.abs(edge.z) < 15, 4.95, 6.4, 1.45, 'HongKongTsimShaTsuiCentralRouteSign');
  addEdgeSign(group, ring, signMaterial('往灣仔', 'TO WAN CHAI', '下層入口 LOWER DECK'),
    (edge) => edge.x > 40 && Math.abs(edge.z) < 15, 4.95, 6.4, 1.45, 'HongKongTsimShaTsuiWanChaiRouteSign');
  for (const x of [-30, -10, 10, 30]) parts.lamp.push(box(2.4, 0.08, 0.18, x, 4.42, 35));
  group.userData.architecture = '1957 Streamline Moderne twin finger piers; white/green horizontal bands and flat roofs';
}

function triangle(positions, a, b, c) { positions.push(...a, ...b, ...c); }
function quad(positions, a, b, c, d) { triangle(positions, a, b, c); triangle(positions, a, c, d); }
function geometryFrom(positions) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function addCentralRoof(parts, site) {
  const x = site.w * 0.5 + 0.65, z = site.d * 0.5 + 0.65, eave = 9.25, ridge = 13.22;
  const roof = [];
  quad(roof, [-x, eave, -z], [-x, ridge, 0], [x, ridge, 0], [x, eave, -z]);
  quad(roof, [-x, ridge, 0], [-x, eave, z], [x, eave, z], [x, ridge, 0]);
  parts.roof.push(geometryFrom(roof));
  const ends = [];
  triangle(ends, [-x, eave, -z], [-x, eave, z], [-x, ridge, 0]);
  triangle(ends, [x, eave, -z], [x, ridge, 0], [x, eave, z]);
  parts.white.push(geometryFrom(ends));
  for (const side of [-1, 1]) pushTube(parts.green, [-x, eave, side * z], [x, eave, side * z], 0.11, 8);
  pushTube(parts.green, [-x, ridge, 0], [x, ridge, 0], 0.10, 8);
}

function addClockTower(group, parts, x, z) {
  // Current Pier 7's Edwardian-style landward clock tower: pale pilasters, four clock faces and a small cupola.
  // This is deliberately not the demolished Edinburgh Place pier's much heavier black clock chamber.
  parts.white.push(box(5.6, 0.70, 4.8, x, 9.45, z));
  parts.white.push(box(5.0, 5.5, 4.2, x, 12.55, z));
  parts.green.push(box(5.35, 0.22, 4.55, x, 15.25, z));
  parts.white.push(box(5.5, 3.4, 4.7, x, 17.05, z));
  parts.green.push(box(6.0, 0.25, 5.15, x, 18.85, z));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) parts.white.push(box(0.28, 9.0, 0.28, x + sx * 2.55, 13.70, z + sz * 2.15));
    parts.dark.push(box(3.1, 2.5, 0.07, x, 17.10, z + sx * 2.38));
    parts.dark.push(box(0.07, 2.5, 3.1, x + sx * 2.78, 17.10, z));
  }
  parts.green.push(cylinder(2.15, 2.15, 0.22, 12, x, 19.0, z));
  const dome = new THREE.SphereGeometry(2.35, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, 0.62, 0.82); dome.translate(x, 19.05, z); parts.roof.push(dome);
  pushTube(parts.metal, [x, 20.30, z], [x, 22.0, z], 0.065, 8);
  parts.lamp.push(cylinder(0.10, 0.10, 0.18, 8, x, 21.94, z));

  const map = clockTexture();
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff, map, emissiveMap: map, transparent: true, depthWrite: false,
    emissive: 0xffffff, emissiveIntensity: 0.40, roughness: 0.48, side: THREE.DoubleSide
  });
  for (const side of [-1, 1]) {
    const front = new THREE.Mesh(new THREE.CircleGeometry(1.25, 40), material);
    front.name = 'HongKongCentralPierClock'; front.position.set(x, 17.10, z + side * 2.43);
    if (side < 0) front.rotation.y = Math.PI;
    group.add(front);
    const sideFace = new THREE.Mesh(new THREE.CircleGeometry(1.25, 40), material);
    sideFace.name = 'HongKongCentralPierClock'; sideFace.position.set(x + side * 2.83, 17.10, z);
    sideFace.rotation.y = side * Math.PI / 2; group.add(sideFace);
  }
}

function archedPanel(parts, x, z, base, width, straightHeight) {
  const radius = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-radius, 0); shape.lineTo(-radius, straightHeight);
  shape.absarc(0, straightHeight, radius, Math.PI, 0, true);
  shape.lineTo(radius, 0); shape.closePath();
  const panel = new THREE.ShapeGeometry(shape, 24);
  panel.rotateY(Math.PI); panel.translate(x, base, z); parts.glass.push(panel);
  const arch = new THREE.TorusGeometry(radius + 0.08, 0.12, 7, 32, Math.PI);
  arch.translate(x, base + straightHeight, z - 0.06); parts.green.push(arch);
  for (const side of [-1, 1]) {
    pushTube(parts.green, [x + side * (radius + 0.08), base, z - 0.06],
      [x + side * (radius + 0.08), base + straightHeight, z - 0.06], 0.12, 8);
  }
  for (let offset = -radius * 0.66; offset <= radius * 0.67; offset += radius * 0.33) {
    const top = straightHeight + Math.sqrt(Math.max(0, radius * radius - offset * offset));
    pushTube(parts.green, [x + offset, base + 0.08, z - 0.09], [x + offset, base + top, z - 0.09], 0.055, 7);
  }
  for (const y of [base + straightHeight * 0.52, base + straightHeight]) {
    pushTube(parts.green, [x - radius, y, z - 0.09], [x + radius, y, z - 0.09], 0.055, 7);
  }
}

function addCentralLandwardFacade(group, parts, site) {
  const z = -site.d / 2 - 0.10;
  archedPanel(parts, 0, z, 1.38, 7.2, 3.7);
  for (const x of [-10.5, 10.5]) archedPanel(parts, x, z, 4.0, 2.0, 2.7);
  for (const x of [-13.0, -4.5, 4.5, 13.0]) parts.white.push(box(0.38, 7.75, 0.30, x, 5.225, z + 0.05));
  parts.white.push(box(29, 0.28, 0.40, 0, 9.0, z + 0.04));
  const material = signMaterial('中環碼頭', 'CENTRAL PIER', 'STAR FERRY 天星小輪', {
    background: '#e8e4cf', foreground: '#9d3429', border: '#d4c6a5', detail: '#7b4b3c'
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(15, 1.20), material);
  sign.name = 'HongKongCentralPier7Sign'; sign.position.set(0, 9.55, z - 0.24); sign.rotation.y = Math.PI; group.add(sign);
}

function buildCentral(site, group, parts) {
  const ring = site.localRing;
  parts.white.push(extrudeRing(ring, 1.35, 3.43));
  parts.green.push(extrudeRing(ring, 4.78, 0.20));
  parts.white.push(extrudeRing(ring, 4.98, 4.12));
  parts.green.push(extrudeRing(ring, 9.10, 0.17));
  addWindowBands(parts, ring, [{ y: 3.05, h: 1.65 }, { y: 7.02, h: 1.78 }], 'green');
  addCentralRoof(parts, site);
  addClockTower(group, parts, 0, -site.d / 2 + 2.5);
  addCentralLandwardFacade(group, parts, site);
  for (const x of [-29, -20, 2, 13, 25, 33]) {
    for (const z of [-8.5, 8.5]) {
      const roofY = 13.22 - Math.abs(z) / (site.d * 0.5 + 0.65) * (13.22 - 9.25);
      parts.white.push(box(2.4, 0.85, 1.65, x, roofY + 0.43, z));
      parts.dark.push(box(1.75, 0.12, 0.06, x, roofY + 0.43, z + Math.sign(z) * 0.86));
    }
  }
  for (const x of [-28, -8, 12, 30]) parts.lamp.push(box(3.0, 0.08, 0.18, x, 4.66, 12.9));
  group.userData.architecture = 'Current Central Pier 7; white concourse, green window frames, pitched teal roof, arched landward entrance and Edwardian-style four-face cupola clock tower';
}

function addWanChaiBracing(parts, ring) {
  for (let index = 0; index < ring.length / 2; index++) {
    const edge = ringEdge(ring, index);
    if (edge.length < 0.6) continue;
    const columns = Math.max(1, Math.ceil(edge.length / 6));
    for (let column = 0; column <= columns; column++) {
      const t = column / columns;
      parts.white.push(box(0.18, 7.60, 0.18,
        edge.ax + edge.dx * t + edge.nx * 0.11, 5.08,
        edge.az + edge.dz * t + edge.nz * 0.11, edge.ry));
    }
    for (const y of [1.62, 4.86, 8.83]) {
      pushTube(parts.white, [edge.ax + edge.nx * 0.12, y, edge.az + edge.nz * 0.12],
        [edge.bx + edge.nx * 0.12, y, edge.bz + edge.nz * 0.12], 0.075, 7);
    }
    if (edge.length < 18) continue;
    const bays = Math.ceil(edge.length / 7);
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays, t1 = (bay + 1) / bays;
      const ax = edge.ax + edge.dx * t0 + edge.nx * 0.18, az = edge.az + edge.dz * t0 + edge.nz * 0.18;
      const bx = edge.ax + edge.dx * t1 + edge.nx * 0.18, bz = edge.az + edge.dz * t1 + edge.nz * 0.18;
      pushTube(parts.white, [ax, 1.75, az], [bx, 4.68, bz], 0.072, 7);
      pushTube(parts.white, [bx, 1.75, bz], [ax, 4.68, az], 0.072, 7);
      if (bay % 2 === 0) {
        pushTube(parts.white, [ax, 5.03, az], [bx, 8.68, bz], 0.065, 7);
        pushTube(parts.white, [bx, 5.03, bz], [ax, 8.68, az], 0.065, 7);
      }
    }
  }
}

function addRoofGarden(parts, site) {
  const ring = site.localRing;
  addPerimeterRail(parts, ring, 9.18, 1.03, true);
  parts.wood.push(box(50, 0.07, 3.0, -1, 9.24, 0));
  for (const x of [-25, -15, -5, 5, 15, 25]) {
    for (const z of [-8.5, 8.5]) {
      parts.concrete.push(box(6.2, 0.65, 1.45, x, 9.55, z));
      parts.foliage.push(box(5.85, 0.22, 1.18, x, 9.94, z));
      if (Math.abs(x) > 22) continue;
      parts.wood.push(cylinder(0.10, 0.14, 1.45, 7, x, 10.57, z));
      const crown = new THREE.IcosahedronGeometry(1.03, 1);
      crown.scale(1.15, 0.90, 1.0); crown.translate(x, 11.62, z);
      parts.foliage.push(crown);
    }
  }
  // Open white-steel pergola on the landward half; the harbour-facing observation garden remains open to the sky.
  for (const x of [14, 24]) {
    for (const z of [-6.5, 6.5]) parts.white.push(box(0.20, 3.05, 0.20, x, 10.72, z));
    pushTube(parts.white, [x, 12.28, -7.2], [x, 12.28, 7.2], 0.10, 8);
  }
  for (const z of [-6.5, 0, 6.5]) pushTube(parts.white, [13.2, 12.28, z], [24.8, 12.28, z], 0.09, 8);
  for (const x of [-24, -8, 8]) parts.lamp.push(box(2.4, 0.07, 0.16, x, 4.62, 12.8));
  if (!pointInFlatRing(ring, 0, 0)) throw new Error('Wan Chai terminal roof origin left its source footprint');
}

function buildWanChai(site, group, parts) {
  const ring = site.localRing;
  parts.glass.push(extrudeRing(ring, 1.35, 7.52));
  parts.white.push(extrudeRing(ring, 1.35, 0.24));
  parts.white.push(extrudeRing(ring, 4.75, 0.22));
  parts.white.push(extrudeRing(ring, 8.87, 0.28));
  addWanChaiBracing(parts, ring);
  addRoofGarden(parts, site);
  addEdgeSign(group, ring, signMaterial('灣仔渡輪碼頭', 'Wan Chai Ferry Pier'),
    (edge) => edge.z > 10, 6.70, 20, 1.75, 'HongKongWanChaiFerryPierSign');
  group.userData.architecture = '2014 Wan Chai Ferry Pier; two glass/white-steel concourse levels, cross bracing, black piles and roof garden';
}

export function buildStarFerryTerminals(root) {
  const group = new THREE.Group(); group.name = 'HongKongStarFerryTerminals'; root.add(group);
  const materials = terminalMaterials(), terminals = [];
  for (const site of STAR_FERRY_TERMINALS) {
    const terminal = new THREE.Group(); terminal.name = `HongKongStarFerryTerminal:${site.id}`;
    terminal.position.set(site.x, 0, site.z); terminal.rotation.y = site.ry;
    terminal.userData = {
      id: site.id, name: site.name, nameEn: site.nameEn, osmType: site.osmType, osmId: site.osmId,
      source: site.source.sourceUrl, footprint: 'OSM outer ring', levels: Number(site.source.tags['building:levels'])
    };
    group.add(terminal);
    const parts = partsFor(materials);
    addPierBase(site, parts);
    if (site.id === 'tsim-sha-tsui') buildTsimShaTsui(site, terminal, parts, materials);
    else if (site.id === 'central') buildCentral(site, terminal, parts);
    else buildWanChai(site, terminal, parts);
    addMergedMeshes(terminal, parts, materials, `HongKongFerryTerminal:${site.id}`, representatives);
    terminals.push({ site, group: terminal });
  }
  return { group, terminals };
}
