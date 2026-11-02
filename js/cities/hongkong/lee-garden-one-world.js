import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  LEE_GARDEN_ONE_SITE, LEE_GARDEN_ONE_OSM_SOURCE, LEE_GARDEN_ONE_COMPLEX_SOURCE,
  LEE_GARDEN_ONE_TOWER_RING, LEE_GARDEN_ONE_BUILDING_RING,
  LEE_GARDEN_ONE_OSM_HEIGHT, LEE_GARDEN_ONE_OSM_LEVELS, LEE_GARDEN_ONE_HEIGHT,
  LEE_GARDEN_ONE_TO_TIP_HEIGHT, LEE_GARDEN_ONE_OCCUPIED_HEIGHT, LEE_GARDEN_ONE_CTBUH_LEVELS,
  LEE_GARDEN_ONE_CTBUH_UNDERGROUND_LEVELS, LEE_GARDEN_ONE_CTBUH_COMPLETION_YEAR,
  LEE_GARDEN_ONE_CONSTRUCTION_START, LEE_GARDEN_ONE_PUBLISHED_HEIGHT, LEE_GARDEN_ONE_PUBLISHED_LEVELS,
  LEE_GARDEN_ONE_PUBLISHED_COMPLETION_YEAR, LEE_GARDEN_ONE_OFFICE_FLOORS,
  LEE_GARDEN_ONE_CTBUH_TOWER_GFA, LEE_GARDEN_ONE_CTBUH_PARKING_SPACES, LEE_GARDEN_ONE_CTBUH_ELEVATORS,
  LEE_GARDEN_ONE_HYSAN_LEVELS, LEE_GARDEN_ONE_HYSAN_GFA_SQFT,
  LEE_GARDEN_ONE_HYSAN_TYPICAL_LETTABLE_MIN_SQFT, LEE_GARDEN_ONE_HYSAN_TYPICAL_LETTABLE_MAX_SQFT,
  LEE_GARDEN_ONE_HYSAN_WHOLE_FLOOR_EFFICIENCY, LEE_GARDEN_ONE_HYSAN_CLEAR_HEADROOM,
  LEE_GARDEN_ONE_HYSAN_CORE_DEPTH_MIN, LEE_GARDEN_ONE_HYSAN_CORE_DEPTH_MAX,
  LEE_GARDEN_ONE_MAKE_PROJECT_AREA, LEE_GARDEN_ONE_MAKE_ROOFTOP_STOREYS,
  LEE_GARDEN_ONE_PLAZA_TOP, LEE_GARDEN_ONE_PODIUM_HEIGHT, LEE_GARDEN_ONE_LOBBY_TOP,
  LEE_GARDEN_ONE_ROOF_HEIGHT, LEE_GARDEN_ONE_OFFICE_VISUAL_COURSES, LEE_GARDEN_ONE_PANEL_TARGET_WIDTH,
  LEE_GARDEN_ONE_TOWER_PLAN_SCALE, LEE_GARDEN_ONE_TOWER_NORTH_SETBACK,
  LEE_GARDEN_ONE_LOBE_SOURCE_VERTICES, LEE_GARDEN_ONE_LOBE_BASE, LEE_GARDEN_ONE_LOBE_TOP,
  LEE_GARDEN_ONE_LOBE_RADIUS, LEE_GARDEN_ONE_SPIRE_LOCAL, LEE_GARDEN_ONE_SPIRE_SOURCE_VERTEX,
  LEE_GARDEN_ONE_ENTRANCE, LEE_GARDEN_ONE_PARKING_ENTRANCE, LEE_GARDEN_ONE_SERVICE_WAYS,
  LEE_GARDEN_ONE_ENTRANCE_FORECOURT_WIDTH, LEE_GARDEN_ONE_ENTRANCE_FORECOURT_OUTER_WIDTH, LEE_GARDEN_ONE_ENTRANCE_FORECOURT_DEPTH,
  LEE_GARDEN_ONE_ROOF_EXTENSION, LEE_GARDEN_ONE_ROAD_VEHICLE_CLEARANCE,
  leeGardenOneFloorY, leeGardenOneEdgeOutward,
  leeGardenOneGroundBayConflict, leeGardenOneRingColliders, leeGardenOneLocalCollider,
  leeGardenOneFrameCollider, leeGardenOneGroundHeightAt
} from './lee-garden-one-architecture.js';

const lerp = (a, b, t) => a + (b - a) * t;
const nightAmount = () => smoothstep(0.55, 1.4, cityUniforms.uInteriorGlow);
function store() { return { positions: [], colors: [], lit: [] }; }
function mix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function hash(a, b, c, d = 0) { const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + d * 19.19) * 43758.5453; return value - Math.floor(value); }
function vertex(target, p, tint, lit = 0) { target.positions.push(...p); target.colors.push(...tint); target.lit.push(lit); }
function quad(target, a, b, c, d, tint, lit = 0) { for (const p of [a, b, c, a, c, d]) vertex(target, p, tint, lit); }
function triangle(target, a, b, c, tint, lit = 0) { for (const p of [a, b, c]) vertex(target, p, tint, lit); }
function geometryFromStore(data) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3));
  geometry.setAttribute('aLit', new THREE.Float32BufferAttribute(data.lit, 1));
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere(); return geometry;
}
function meshStore(group, data, material, name, shadows = true) {
  if (!data.positions.length) return null;
  const mesh = new THREE.Mesh(geometryFromStore(data), material); mesh.name = name;
  mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function merged(group, parts, material, name, shadows = true) {
  if (!parts.length) return null;
  const geometry = mergeGeometries(parts, false); for (const part of parts) part.dispose();
  const mesh = new THREE.Mesh(geometry, material); mesh.name = name; mesh.castShadow = shadows; mesh.receiveShadow = true;
  group.add(mesh); return mesh;
}
function box(parts, center, size, ry = 0) {
  const geometry = new THREE.BoxGeometry(...size); if (ry) geometry.rotateY(ry); geometry.translate(...center); parts.push(geometry); return geometry;
}
function cylinder(parts, center, radius, height, segments = 16, topRadius = radius) {
  const geometry = new THREE.CylinderGeometry(topRadius, radius, height, segments); geometry.translate(...center); parts.push(geometry); return geometry;
}
function beam(parts, a, b, width = 0.28, depth = width) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start), length = direction.length();
  const geometry = new THREE.BoxGeometry(width, length, depth);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  geometry.translate(...start.add(end).multiplyScalar(0.5).toArray()); parts.push(geometry); return geometry;
}
function edgeBox(parts, ring, edge, t, y, offset, width, height, depth) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const { nx, nz, ry } = leeGardenOneEdgeOutward(ring, edge);
  return box(parts, [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset], [width, height, depth], ry);
}
function segmentCollider(ring, edge, t0, t1, minY, maxY, depth = 0.36) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const { ry, length } = leeGardenOneEdgeOutward(ring, edge), tm = (t0 + t1) * 0.5;
  return leeGardenOneLocalCollider(lerp(ax, bx, tm), lerp(az, bz, tm), length * (t1 - t0), depth, minY, maxY, LEE_GARDEN_ONE_SITE.ry + ry);
}
function roofGeometry(ring, y) {
  const shape = new THREE.Shape();
  for (let i = 0; i < ring.length - 2; i += 2) { const x = ring[i], z = -ring[i + 1]; if (i === 0) shape.moveTo(x, z); else shape.lineTo(x, z); }
  shape.closePath(); const geometry = new THREE.ShapeGeometry(shape); geometry.rotateX(-Math.PI / 2); geometry.translate(0, y, 0); return geometry;
}

// DLN's chamfered triangular shaft: dense blue-green glazing, silver horizontal sunshades and a visually flat crown.
function createTower() {
  const ring = LEE_GARDEN_ONE_TOWER_RING, glass = store(), backing = store(), crown = store(), roof = store();
  const bands = [], mullions = [], crownLouvres = [], coping = [];
  const mechanicalCourses = new Set([12, 13, 26]); // photograph-directed visual bands, not asserted plant-floor numbers
  let glassPanels = 0, horizontalBands = 0, verticalMullions = 0, crownPanels = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = leeGardenOneEdgeOutward(ring, edge), bays = Math.max(1, Math.round(length / LEE_GARDEN_ONE_PANEL_TARGET_WIDTH));
    const point = (t, y, offset = 0.04) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    quad(backing, point(0, LEE_GARDEN_ONE_PODIUM_HEIGHT, -0.12), point(1, LEE_GARDEN_ONE_PODIUM_HEIGHT, -0.12),
      point(1, LEE_GARDEN_ONE_OCCUPIED_HEIGHT, -0.12), point(0, LEE_GARDEN_ONE_OCCUPIED_HEIGHT, -0.12), [0.035, 0.065, 0.080]);
    for (let course = 0; course < LEE_GARDEN_ONE_OFFICE_VISUAL_COURSES; course++) {
      const y0 = leeGardenOneFloorY(course), y1 = leeGardenOneFloorY(course + 1), mechanical = mechanicalCourses.has(course);
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + 0.00065, t1 = (bay + 1) / bays - 0.00065, variation = hash(edge, bay, course, 20);
        const lit = !mechanical && hash(edge, bay, course, 93) > 0.885 ? 0.16 + variation * 0.62 : 0;
        const low = mechanical ? [0.035, 0.060, 0.068] : [0.065, 0.155, 0.205];
        const high = mechanical ? [0.10, 0.13, 0.14] : [0.20, 0.36, 0.41];
        quad(glass, point(t0, y0 + 0.40), point(t1, y0 + 0.40), point(t1, y1 - 0.08), point(t0, y1 - 0.08),
          mix(low, high, 0.20 + variation * 0.62), lit); glassPanels++;
        if (mechanical) for (let y = y0 + 0.62; y < y1 - 0.12; y += 0.43) {
          quad(crown, point(t0, y, 0.09), point(t1, y, 0.09), point(t1, y + 0.075, 0.09), point(t0, y + 0.075, 0.09), [0.19, 0.24, 0.25]);
        }
      }
      edgeBox(bands, ring, edge, 0.5, y0 + 0.12, 0.16, length + 0.025, mechanical ? 0.48 : 0.34, 0.38); horizontalBands++;
    }
    edgeBox(bands, ring, edge, 0.5, LEE_GARDEN_ONE_OCCUPIED_HEIGHT, 0.16, length + 0.025, 0.36, 0.38); horizontalBands++;
    for (let bay = 0; bay <= bays; bay++) {
      edgeBox(mullions, ring, edge, bay / bays, (LEE_GARDEN_ONE_PODIUM_HEIGHT + LEE_GARDEN_ONE_OCCUPIED_HEIGHT) * 0.5,
        0.13, bay % 4 === 0 ? 0.075 : 0.045, LEE_GARDEN_ONE_OCCUPIED_HEIGHT - LEE_GARDEN_ONE_PODIUM_HEIGHT, 0.20); verticalMullions++;
    }
    const crownBays = Math.max(1, Math.ceil(length / 2.8));
    for (let bay = 0; bay < crownBays; bay++) {
      const t0 = bay / crownBays + 0.0007, t1 = (bay + 1) / crownBays - 0.0007;
      quad(crown, point(t0, LEE_GARDEN_ONE_OCCUPIED_HEIGHT, 0.02), point(t1, LEE_GARDEN_ONE_OCCUPIED_HEIGHT, 0.02),
        point(t1, LEE_GARDEN_ONE_ROOF_HEIGHT - 0.18, 0.02), point(t0, LEE_GARDEN_ONE_ROOF_HEIGHT - 0.18, 0.02),
        mix([0.055, 0.105, 0.13], [0.14, 0.22, 0.25], hash(edge, bay, 77) * 0.65)); crownPanels++;
    }
    for (let y = LEE_GARDEN_ONE_OCCUPIED_HEIGHT + 0.42; y < LEE_GARDEN_ONE_ROOF_HEIGHT - 0.25; y += 0.92) {
      edgeBox(crownLouvres, ring, edge, 0.5, y, 0.13, length + 0.02, 0.12, 0.22);
    }
    edgeBox(coping, ring, edge, 0.5, LEE_GARDEN_ONE_ROOF_HEIGHT - 0.10, 0.13, length + 0.04, 0.20, 0.30);
    triangle(roof, [0, LEE_GARDEN_ONE_ROOF_HEIGHT - 0.28, 0], [ax, LEE_GARDEN_ONE_ROOF_HEIGHT - 0.28, az], [bx, LEE_GARDEN_ONE_ROOF_HEIGHT - 0.28, bz], [0.18, 0.22, 0.23]);
  }
  return { glass, backing, crown, roof, bands, mullions, crownLouvres, coping, glassPanels, horizontalBands, verticalMullions, crownPanels };
}

// Three genuinely curved cantilevered corner bays, rather than painted curves on the tower planes.
function createLobes() {
  const ring = LEE_GARDEN_ONE_TOWER_RING, glass = store(), caps = [], bands = [], mullions = [], colliders = [];
  const floors = 27, segments = 14, floorHeight = (LEE_GARDEN_ONE_LOBE_TOP - LEE_GARDEN_ONE_LOBE_BASE) / floors;
  let glassPanels = 0;
  for (const sourceVertex of LEE_GARDEN_ONE_LOBE_SOURCE_VERTICES) {
    const count = ring.length / 2 - 1, previous = (sourceVertex + count - 1) % count;
    const a = leeGardenOneEdgeOutward(ring, previous), b = leeGardenOneEdgeOutward(ring, sourceVertex);
    let nx = a.nx + b.nx, nz = a.nz + b.nz; const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
    const cx = ring[sourceVertex * 2] + nx * 1.50, cz = ring[sourceVertex * 2 + 1] + nz * 1.50;
    for (let floor = 0; floor < floors; floor++) {
      const y0 = LEE_GARDEN_ONE_LOBE_BASE + floor * floorHeight, y1 = y0 + floorHeight;
      for (let segment = 0; segment < segments; segment++) {
        const a0 = segment / segments * Math.PI * 2, a1 = (segment + 1) / segments * Math.PI * 2;
        const p = (angle, y, radius = LEE_GARDEN_ONE_LOBE_RADIUS) => [cx + Math.cos(angle) * radius, y, cz + Math.sin(angle) * radius];
        const variation = hash(sourceVertex, floor, segment, 31), lit = hash(sourceVertex, floor, segment, 93) > 0.87 ? 0.18 + variation * 0.58 : 0;
        quad(glass, p(a0, y0 + 0.36), p(a1, y0 + 0.36), p(a1, y1 - 0.08), p(a0, y1 - 0.08),
          mix([0.065, 0.17, 0.22], [0.23, 0.39, 0.43], 0.20 + variation * 0.62), lit); glassPanels++;
      }
      const torus = new THREE.TorusGeometry(LEE_GARDEN_ONE_LOBE_RADIUS + 0.045, 0.15, 6, 28);
      torus.rotateX(Math.PI / 2); torus.translate(cx, y0 + 0.12, cz); bands.push(torus);
    }
    for (let segment = 0; segment < segments; segment++) {
      const angle = segment / segments * Math.PI * 2;
      box(mullions, [cx + Math.cos(angle) * 3.13, (LEE_GARDEN_ONE_LOBE_BASE + LEE_GARDEN_ONE_LOBE_TOP) * 0.5,
        cz + Math.sin(angle) * 3.13], [0.065, LEE_GARDEN_ONE_LOBE_TOP - LEE_GARDEN_ONE_LOBE_BASE, 0.12], -angle);
    }
    cylinder(caps, [cx, LEE_GARDEN_ONE_LOBE_BASE - 0.12, cz], 3.18, 0.48, 28);
    cylinder(caps, [cx, LEE_GARDEN_ONE_LOBE_TOP + 0.08, cz], 3.18, 0.32, 28);
    colliders.push(leeGardenOneLocalCollider(cx, cz, 7.0, 7.0, LEE_GARDEN_ONE_LOBE_BASE - 0.36, LEE_GARDEN_ONE_LOBE_TOP + 0.24));
  }
  return { glass, caps, bands, mullions, colliders, glassPanels, bandCount: floors * LEE_GARDEN_ONE_LOBE_SOURCE_VERTICES.length };
}

function createPodium() {
  const ring = LEE_GARDEN_ONE_BUILDING_RING, glass = store(), backing = store(), stone = store(), lattice = store();
  const frames = [], stoneBands = [], braces = [], colliders = [];
  const lanFongEdges = new Set([6, 7, 8, 9]);
  let glassPanels = 0, stonePanels = 0, latticePanels = 0, portalBays = 0, braceCount = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = leeGardenOneEdgeOutward(ring, edge), bays = Math.max(1, Math.ceil(length / 3.0));
    const point = (t, y, offset = 0.04) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays, t1 = (bay + 1) / bays, tm = (t0 + t1) * 0.5;
      const lx = lerp(ax, bx, tm), lz = lerp(az, bz, tm);
      const entranceGap = Math.hypot(lx - LEE_GARDEN_ONE_ENTRANCE.localX, lz - LEE_GARDEN_ONE_ENTRANCE.localZ) < 7.0;
      const parkingGap = Math.hypot(lx - LEE_GARDEN_ONE_PARKING_ENTRANCE.localX, lz - LEE_GARDEN_ONE_PARKING_ENTRANCE.localZ) < 5.0;
      const conflict = leeGardenOneGroundBayConflict(ring, edge, t0, t1) || entranceGap || parkingGap;
      if (conflict) { portalBays++; continue; }
      const ta = t0 + 0.0012, tb = t1 - 0.0012, variation = hash(edge, bay, 14);
      quad(backing, point(ta, 0.12, -0.32), point(tb, 0.12, -0.32), point(tb, LEE_GARDEN_ONE_LOBBY_TOP, -0.32), point(ta, LEE_GARDEN_ONE_LOBBY_TOP, -0.32), [0.12, 0.095, 0.065], 0.24);
      quad(glass, point(ta, 0.16), point(tb, 0.16), point(tb, LEE_GARDEN_ONE_LOBBY_TOP - 0.12), point(ta, LEE_GARDEN_ONE_LOBBY_TOP - 0.12),
        mix([0.17, 0.27, 0.30], [0.35, 0.45, 0.46], variation * 0.65), 0.10 + variation * 0.20); glassPanels++;
      colliders.push(segmentCollider(ring, edge, t0, t1, 0, LEE_GARDEN_ONE_LOBBY_TOP));
      for (const y of [5.9, 11.9, LEE_GARDEN_ONE_LOBBY_TOP - 0.10]) edgeBox(frames, ring, edge, tm, y, 0.10, length / bays, 0.10, 0.16);
      if (lanFongEdges.has(edge)) {
        // Make's 2026 Lan Fong Road stone / copper decorative mesh veil, kept off actual driveway openings.
        for (const offset of [-0.36, 0.36]) {
          const ta2 = Math.max(t0, tm + offset / length), tb2 = Math.min(t1, tm + (offset + 0.55) / length);
          if (tb2 <= ta2) continue;
          quad(lattice, point(ta2, 0.5, 0.20), point(tb2, 4.8, 0.20), point(tb2, 5.15, 0.20), point(ta2, 0.85, 0.20), [0.48, 0.30, 0.16]);
          quad(lattice, point(ta2, 4.8, 0.20), point(tb2, 0.5, 0.20), point(tb2, 0.85, 0.20), point(ta2, 5.15, 0.20), [0.48, 0.30, 0.16]);
          latticePanels += 2;
        }
      }
    }
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays + 0.0008, t1 = (bay + 1) / bays - 0.0008;
      quad(stone, point(t0, LEE_GARDEN_ONE_LOBBY_TOP, 0.015), point(t1, LEE_GARDEN_ONE_LOBBY_TOP, 0.015),
        point(t1, LEE_GARDEN_ONE_PODIUM_HEIGHT - 0.12, 0.015), point(t0, LEE_GARDEN_ONE_PODIUM_HEIGHT - 0.12, 0.015),
        mix([0.55, 0.49, 0.39], [0.78, 0.72, 0.61], 0.25 + hash(edge, bay, 52) * 0.50)); stonePanels++;
    }
    for (const y of [LEE_GARDEN_ONE_LOBBY_TOP, 23.0, LEE_GARDEN_ONE_PODIUM_HEIGHT - 0.10]) edgeBox(stoneBands, ring, edge, 0.5, y, 0.14, length + 0.03, 0.22, 0.30);
    colliders.push(...leeGardenOneRingColliders([ax, az, bx, bz, ax, az], LEE_GARDEN_ONE_LOBBY_TOP, LEE_GARDEN_ONE_PODIUM_HEIGHT));
  }
  // Large diagonal transition braces visible below the shaft, not a generic podium texture.
  const tower = LEE_GARDEN_ONE_TOWER_RING;
  for (let edge = 0; edge < tower.length / 2 - 1; edge++) {
    const i = edge * 2, ax = tower[i], az = tower[i + 1], bx = tower[i + 2], bz = tower[i + 3];
    const { nx, nz, length } = leeGardenOneEdgeOutward(tower, edge), bays = Math.max(1, Math.round(length / 15));
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays + 0.06 / bays, t1 = (bay + 1) / bays - 0.06 / bays;
      const p = (t, y) => [lerp(ax, bx, t) + nx * 0.42, y, lerp(az, bz, t) + nz * 0.42];
      beam(braces, p(t0, 18.25), p(t1, 27.75), 0.34, 0.40); beam(braces, p(t1, 18.25), p(t0, 27.75), 0.34, 0.40); braceCount += 2;
    }
  }
  return { glass, backing, stone, lattice, frames, stoneBands, braces, colliders, glassPanels, stonePanels, latticePanels, portalBays, braceCount };
}

// Only authored perimeter pavers are added: no full-footprint slab is allowed to cover the source service road.
// The DTM remains visible between these strips; the logical ground query still gives the lobby a continuous datum.
function createGroundPavers() {
  const ring = LEE_GARDEN_ONE_BUILDING_RING, pavers = store(); let bays = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = leeGardenOneEdgeOutward(ring, edge), count = Math.max(1, Math.ceil(length / 2.4));
    for (let bay = 0; bay < count; bay++) {
      const t0 = bay / count + 0.0008, t1 = (bay + 1) / count - 0.0008;
      if (leeGardenOneGroundBayConflict(ring, edge, bay / count, (bay + 1) / count, 0.12)) continue;
      const p = (t, inset) => [lerp(ax, bx, t) - nx * inset, LEE_GARDEN_ONE_PLAZA_TOP, lerp(az, bz, t) - nz * inset];
      quad(pavers, p(t0, 0), p(t0, 4.2), p(t1, 4.2), p(t1, 0), [0.62, 0.57, 0.48]); bays++;
    }
  }
  return { pavers, bays };
}

function signTexture(title, subtitle = '') {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 1024, 256); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ead9b8'; ctx.font = '500 66px sans-serif'; ctx.fillText(title, 512, subtitle ? 92 : 132, 930);
  if (subtitle) { ctx.fillStyle = '#c7b18c'; ctx.font = '400 31px sans-serif'; ctx.fillText(subtitle, 512, 181, 900); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function sign(group, title, subtitle, width, height, position, name) {
  const material = new THREE.MeshBasicMaterial({ map: signTexture(title, subtitle), transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material); mesh.position.set(...position); mesh.name = name; mesh.renderOrder = 4; group.add(mesh); return mesh;
}
function createEntrance(root, materials) {
  const frame = LEE_GARDEN_ONE_ENTRANCE, group = new THREE.Group(); group.position.set(frame.x, LEE_GARDEN_ONE_PLAZA_TOP, frame.z); group.rotation.y = frame.ry;
  group.name = 'LeeGardenOneSourceEntranceTallGlassLobby'; root.add(group);
  const stone = [], glass = [], frames = [], interior = [], lights = [], diamond = [], colliders = [];
  const inner = LEE_GARDEN_ONE_ENTRANCE_FORECOURT_WIDTH * 0.5, outer = LEE_GARDEN_ONE_ENTRANCE_FORECOURT_OUTER_WIDTH * 0.5;
  const fa = [-inner, 0, -0.20], fb = [-outer, 0, LEE_GARDEN_ONE_ENTRANCE_FORECOURT_DEPTH];
  const fc = [outer, 0, LEE_GARDEN_ONE_ENTRANCE_FORECOURT_DEPTH], fd = [inner, 0, -0.20];
  const forecourtGeometry = new THREE.BufferGeometry();
  forecourtGeometry.setAttribute('position', new THREE.Float32BufferAttribute([...fa, ...fb, ...fc, ...fa, ...fc, ...fd], 3));
  forecourtGeometry.computeVertexNormals();
  const forecourt = new THREE.Mesh(forecourtGeometry, materials.limestone); forecourt.name = 'LeeGardenOneSourceEntranceLevelForecourt';
  forecourt.receiveShadow = true; group.add(forecourt);
  box(interior, [0, 8.1, -0.58], [13.2, 16.2, 0.20]);
  box(glass, [0, 8.1, 0], [13.2, 16.2, 0.10]);
  for (const x of [-6.9, 6.9]) {
    box(stone, [x, 8.25, 0], [0.90, 16.5, 0.82]);
    // Shallow diamond relief on the Gascogne Beige limestone entrance columns.
    for (let y = 1.0; y < 7.0; y += 1.25) for (const sx of [-1, 1]) beam(diamond, [x, y, 0.44], [x + sx * 0.31, y + 0.58, 0.44], 0.045, 0.055);
  }
  for (const x of [-4.8, -2.4, 0, 2.4, 4.8]) box(frames, [x, 8.1, 0.10], [0.075, 16.2, 0.12]);
  for (const y of [5.0, 10.6, 16.1]) box(frames, [0, y, 0.10], [13.2, 0.10, 0.12]);
  for (const x of [-1.65, -0.55, 0.55, 1.65]) {
    box(frames, [x - 0.52, 2.15, 0.15], [0.055, 4.30, 0.10]); box(frames, [x + 0.20, 2.10, 0.18], [0.04, 0.78, 0.08]);
  }
  box(glass, [0, 5.15, 2.15], [15.2, 0.12, 4.3]);
  for (const x of [-7.55, 0, 7.55]) box(frames, [x, 5.15, 2.15], [0.11, 0.16, 4.4]);
  for (const z of [0, 4.3]) box(frames, [0, 5.15, z], [15.2, 0.16, 0.11]);
  box(interior, [0, 4.62, 0.36], [10.8, 0.68, 0.20]);
  for (const x of [-4.5, 0, 4.5]) box(lights, [x, 5.02, 2.1], [0.12, 0.07, 3.5]);
  sign(group, 'LEE GARDEN ONE', '33 HYSAN AVENUE', 10.2, 2.55, [0, 6.20, 0.20], 'LeeGardenOneCurrentLobbySign');
  merged(group, stone, materials.limestone, 'LeeGardenOneGascogneBeigeEntranceColumns');
  merged(group, diamond, materials.copper, 'LeeGardenOneDiamondCarvedEntranceMotif');
  merged(group, glass, materials.entryGlass, 'LeeGardenOneFourStoreyGlassLobbyAndCanopy', false);
  merged(group, frames, materials.copper, 'LeeGardenOneLobbyBronzeFramesDoorPullsAndCanopy');
  merged(group, interior, materials.interior, 'LeeGardenOneWarmLobbyInteriorAndSignBacking');
  merged(group, lights, materials.warmLight, 'LeeGardenOneLobbyLinearSoffitLights', false);
  colliders.push(leeGardenOneFrameCollider(frame, 0, 0, 13.2, 0.36, 0, 16.5, LEE_GARDEN_ONE_PLAZA_TOP));
  for (const x of [-6.9, 6.9]) colliders.push(leeGardenOneFrameCollider(frame, x, 0, 0.90, 0.82, 0, 16.5, LEE_GARDEN_ONE_PLAZA_TOP));
  colliders.push(leeGardenOneFrameCollider(frame, 0, 2.15, 15.2, 4.3, 5.02, 5.28, LEE_GARDEN_ONE_PLAZA_TOP));
  return { group, colliders };
}
function createParking(root, materials) {
  const frame = LEE_GARDEN_ONE_PARKING_ENTRANCE, group = new THREE.Group(); group.position.set(frame.x, LEE_GARDEN_ONE_PLAZA_TOP, frame.z); group.rotation.y = frame.ry;
  group.name = 'LeeGardenOneSourceUndergroundParkingPortal'; root.add(group);
  const stone = [], dark = [], frames = [], lights = [], colliders = [];
  for (const x of [-4.65, 4.65]) {
    box(stone, [x, 2.75, 0], [0.85, 5.5, 1.0]); colliders.push(leeGardenOneFrameCollider(frame, x, 0, 0.85, 1.0, 0, 5.5, LEE_GARDEN_ONE_PLAZA_TOP));
  }
  box(stone, [0, 5.25, 0], [10.1, 0.55, 1.0]); box(dark, [0, 2.5, -5.2], [8.5, 5.0, 0.25]);
  for (let y = 4.35; y < 5.0; y += 0.18) box(frames, [0, y, -0.10], [8.5, 0.07, 0.12]);
  for (const x of [-3.5, 3.5]) box(lights, [x, 4.85, -1.6], [0.12, 0.08, 3.2]);
  sign(group, 'PARKING', 'LEE GARDEN ONE', 5.4, 1.35, [0, 5.28, 0.53], 'LeeGardenOneParkingSourceSign');
  merged(group, stone, materials.limestone, 'LeeGardenOneParkingStonePortal'); merged(group, dark, materials.dark, 'LeeGardenOneParkingRecessBeyondDriveway');
  merged(group, frames, materials.copper, 'LeeGardenOneParkingOverheadShutter'); merged(group, lights, materials.warmLight, 'LeeGardenOneParkingGuideLights', false);
  colliders.push(leeGardenOneFrameCollider(frame, 0, -5.2, 8.5, 0.34, 0, 5.0, LEE_GARDEN_ONE_PLAZA_TOP));
  colliders.push(leeGardenOneFrameCollider(frame, 0, 0, 10.1, 1.0, 4.98, 5.55, LEE_GARDEN_ONE_PLAZA_TOP));
  return { group, colliders };
}

function createRoofExtension() {
  const e = LEE_GARDEN_ONE_ROOF_EXTENSION, group = new THREE.Group(); group.position.set(e.x, 0, e.z); group.rotation.y = e.ry;
  group.name = 'LeeGardenOneMake2026TwoStoreyRoofGlassBox';
  const glass = store(), frames = [], roof = [], interior = [], green = [], lights = [];
  const panels = 18;
  for (const side of [-1, 1]) for (let bay = 0; bay < panels; bay++) {
    const x0 = -e.w / 2 + bay * e.w / panels + 0.035, x1 = -e.w / 2 + (bay + 1) * e.w / panels - 0.035, z = side * e.d / 2;
    quad(glass, [x0, e.base + 0.15, z], [x1, e.base + 0.15, z], [x1, e.base + e.height - 0.15, z], [x0, e.base + e.height - 0.15, z],
      [0.20, 0.32, 0.34], 0.24 + hash(side, bay, 82) * 0.38);
  }
  for (const side of [-1, 1]) for (let bay = 0; bay <= panels; bay++) box(frames, [-e.w / 2 + bay * e.w / panels, e.base + e.height / 2, side * (e.d / 2 + 0.035)], [0.075, e.height, 0.11]);
  for (const y of [e.base + 0.10, e.base + 3.6, e.base + e.height - 0.08]) for (const side of [-1, 1]) box(frames, [0, y, side * (e.d / 2 + 0.04)], [e.w, 0.11, 0.12]);
  for (const x of [-e.w / 2, e.w / 2]) {
    quad(glass, [x, e.base + 0.15, -e.d / 2], [x, e.base + 0.15, e.d / 2], [x, e.base + e.height - 0.15, e.d / 2], [x, e.base + e.height - 0.15, -e.d / 2], [0.18, 0.29, 0.31], 0.30);
  }
  box(roof, [0, e.base + e.height, 0], [e.w + 0.25, 0.20, e.d + 0.25]); box(interior, [0, e.base + 3.55, 0], [e.w - 0.25, 0.16, e.d - 0.25]);
  for (let x = -e.w / 2 + 1.0; x < -e.w / 2 + 7.0; x += 0.72) for (let y = e.base + 0.6; y < e.base + 6.5; y += 0.72) {
    const shrub = new THREE.SphereGeometry(0.46, 8, 6); shrub.scale(1, 1, 0.48); shrub.translate(x, y, -e.d / 2 + 0.22); green.push(shrub);
  }
  for (const x of [-15, -5, 5, 15]) box(lights, [x, e.base + e.height - 0.22, 0], [0.10, 0.08, e.d - 0.35]);
  const collider = leeGardenOneLocalCollider(e.x, e.z, e.w, e.d, e.base, e.base + e.height + 0.20, LEE_GARDEN_ONE_SITE.ry + e.ry);
  return { group, glass, frames, roof, interior, green, lights, collider };
}

function createRoofDetails() {
  const plant = [], louvres = [], garden = [], greenery = [], balustrades = [], colliders = [];
  const spire = LEE_GARDEN_ONE_SPIRE_LOCAL;
  // Offset southwest spire, with its tip exactly at the CTBUH 240.4 m convention.
  const heights = [8.0, 12.0, 9.4], radii = [0.48, 0.27, 0.12]; let base = LEE_GARDEN_ONE_ROOF_HEIGHT;
  heights.forEach((height, index) => { cylinder(plant, [spire.x, base + height / 2, spire.z], radii[index], height, 12, radii[index] * 0.78); base += height; });
  for (const angle of [0, Math.PI * 2 / 3, Math.PI * 4 / 3]) beam(plant,
    [spire.x + Math.cos(angle) * 1.25, LEE_GARDEN_ONE_ROOF_HEIGHT, spire.z + Math.sin(angle) * 1.25], [spire.x, LEE_GARDEN_ONE_ROOF_HEIGHT + 4.2, spire.z], 0.12);
  colliders.push(leeGardenOneLocalCollider(spire.x, spire.z, 1.1, 1.1, LEE_GARDEN_ONE_ROOF_HEIGHT, LEE_GARDEN_ONE_HEIGHT));
  for (const [x, z, w, d, h] of [[-18,-7,12,6,2.4],[4,-9,10,5,2.0],[23,3,8,5,2.8]]) {
    box(plant, [x, LEE_GARDEN_ONE_ROOF_HEIGHT + h / 2 - 0.20, z], [w, h, d]);
    for (let y = LEE_GARDEN_ONE_ROOF_HEIGHT + 0.2; y < LEE_GARDEN_ONE_ROOF_HEIGHT + h - 0.25; y += 0.38) box(louvres, [x, y, z + d / 2 + 0.03], [w - 0.4, 0.08, 0.10]);
    colliders.push(leeGardenOneLocalCollider(x, z, w, d, LEE_GARDEN_ONE_ROOF_HEIGHT - 0.20, LEE_GARDEN_ONE_ROOF_HEIGHT + h - 0.20));
  }
  // Small landscaped podium strips and glass balustrades; the two-storey glass box remains the dominant new roof feature.
  for (const x of [-52, -45, 10, 20, 30, 40]) {
    box(garden, [x, 28.42, 19.5], [4.2, 0.84, 2.3]);
    const shrub = new THREE.SphereGeometry(1.35, 12, 8); shrub.scale(1.45, 0.72, 0.80); shrub.translate(x, 29.35, 19.5); greenery.push(shrub);
  }
  const ring = LEE_GARDEN_ONE_BUILDING_RING;
  for (const edge of [9, 0, 1]) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3], { length } = leeGardenOneEdgeOutward(ring, edge);
    edgeBox(balustrades, ring, edge, 0.5, 28.65, 0.05, length, 1.15, 0.075);
  }
  return { plant, louvres, garden, greenery, balustrades, colliders };
}

export function buildLeeGardenOne(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'LeeGardenOneAuthoredTriangularTowerLobesSpireAndMakePodium'; group.userData.internalId = 'HK-B0020';
  group.position.y = groundOffset; root.add(group);
  const materials = {
    glass: new THREE.MeshStandardNodeMaterial({ metalness: 0.54, roughness: 0.22, envMapIntensity: 1.15, side: THREE.DoubleSide }),
    backing: new THREE.MeshStandardNodeMaterial({ roughness: 0.80, side: THREE.DoubleSide }),
    crown: new THREE.MeshStandardNodeMaterial({ metalness: 0.48, roughness: 0.38, side: THREE.DoubleSide }),
    roof: new THREE.MeshStandardNodeMaterial({ roughness: 0.76, side: THREE.DoubleSide }),
    podiumGlass: new THREE.MeshStandardNodeMaterial({ metalness: 0.30, roughness: 0.23, side: THREE.DoubleSide }),
    stone: new THREE.MeshStandardNodeMaterial({ roughness: 0.66, side: THREE.DoubleSide }),
    lattice: new THREE.MeshStandardNodeMaterial({ metalness: 0.62, roughness: 0.36, side: THREE.DoubleSide }),
    silver: new THREE.MeshStandardNodeMaterial({ color: 0x9da9aa, metalness: 0.76, roughness: 0.30 }),
    dark: new THREE.MeshStandardNodeMaterial({ color: 0x263238, metalness: 0.38, roughness: 0.49 }),
    limestone: new THREE.MeshStandardNodeMaterial({ color: 0xc4b69d, metalness: 0.04, roughness: 0.66 }),
    copper: new THREE.MeshStandardNodeMaterial({ color: 0x9a7050, metalness: 0.68, roughness: 0.32 }),
    entryGlass: new THREE.MeshStandardNodeMaterial({ color: 0x799397, metalness: 0.24, roughness: 0.16, transparent: true, opacity: 0.40, depthWrite: false, side: THREE.DoubleSide }),
    interior: new THREE.MeshStandardNodeMaterial({ color: 0x6a5138, roughness: 0.73 }),
    warmLight: new THREE.MeshStandardNodeMaterial({ color: 0xe5cc9c, roughness: 0.40 }),
    greenery: new THREE.MeshStandardNodeMaterial({ color: 0x35583a, roughness: 0.94 }),
    balustrade: new THREE.MeshStandardNodeMaterial({ color: 0x8da8aa, metalness: 0.15, roughness: 0.20, transparent: true, opacity: 0.42, depthWrite: false })
  };
  for (const key of ['glass', 'backing', 'crown', 'roof', 'podiumGlass', 'stone', 'lattice']) materials[key].colorNode = attribute('color', 'vec3');
  materials.glass.emissiveNode = color(0x1c3440).mul(nightAmount()).mul(0.045)
    .add(color(0xffd6a2).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.50));
  materials.podiumGlass.emissiveNode = color(0xffca8f).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.38);
  materials.stone.emissiveNode = color(0xffd5a5).mul(nightAmount()).mul(0.055);
  materials.limestone.emissiveNode = color(0xffd2a0).mul(nightAmount()).mul(0.075);
  materials.copper.emissiveNode = color(0xffc384).mul(nightAmount()).mul(0.12);
  materials.entryGlass.emissiveNode = color(0xffcb91).mul(nightAmount()).mul(0.075);
  materials.interior.emissiveNode = color(0xffbd75).mul(nightAmount().mul(0.48).add(0.025));
  materials.warmLight.emissiveNode = color(0xffca86).mul(nightAmount().mul(1.5).add(0.01));

  const tower = new THREE.Group(); tower.position.set(LEE_GARDEN_ONE_SITE.x, 0, LEE_GARDEN_ONE_SITE.z); tower.rotation.y = LEE_GARDEN_ONE_SITE.ry;
  tower.name = 'LeeGardenOneFloorPlanDirectedChamferedTriangularTower'; group.add(tower);
  const shaft = createTower();
  meshStore(tower, shaft.backing, materials.backing, 'LeeGardenOneOpaqueTowerBacking');
  meshStore(tower, shaft.glass, materials.glass, 'LeeGardenOneBlueGreenOfficeGlassAndMechanicalBands');
  meshStore(tower, shaft.crown, materials.crown, 'LeeGardenOneFlatScreenedCrown');
  meshStore(tower, shaft.roof, materials.roof, 'LeeGardenOneMainRoofDeck');
  merged(tower, shaft.bands, materials.silver, 'LeeGardenOneContinuousSilverHorizontalSunshades');
  merged(tower, shaft.mullions, materials.dark, 'LeeGardenOneDenseVerticalCurtainWallMullions');
  merged(tower, shaft.crownLouvres, materials.silver, 'LeeGardenOneCrownHorizontalLouvres');
  merged(tower, shaft.coping, materials.silver, 'LeeGardenOneFlatCrownCoping');
  const lobes = createLobes();
  meshStore(tower, lobes.glass, materials.glass, 'LeeGardenOneThreeCurvedCantileveredCornerLobes');
  merged(tower, lobes.caps, materials.silver, 'LeeGardenOneRoundedLobeCantileverCaps');
  merged(tower, lobes.bands, materials.silver, 'LeeGardenOneCurvedLobeHorizontalBands');
  merged(tower, lobes.mullions, materials.dark, 'LeeGardenOneCurvedLobeVerticalMullions');
  const podium = createPodium();
  meshStore(tower, podium.backing, materials.backing, 'LeeGardenOneWarmGroundLobbyBacking');
  meshStore(tower, podium.glass, materials.podiumGlass, 'LeeGardenOneGroundGlassWithDrivewayPortals');
  meshStore(tower, podium.stone, materials.stone, 'LeeGardenOneNeutralStonePodiumPanels');
  meshStore(tower, podium.lattice, materials.lattice, 'LeeGardenOneLanFongRoadCopperLatticeVeils');
  merged(tower, podium.frames, materials.copper, 'LeeGardenOneGroundLobbyTransoms');
  merged(tower, podium.stoneBands, materials.limestone, 'LeeGardenOnePodiumStoneBands');
  merged(tower, podium.braces, materials.silver, 'LeeGardenOneDiagonalPodiumTransitionBraces');
  const podiumDeck = new THREE.Mesh(roofGeometry(LEE_GARDEN_ONE_BUILDING_RING, LEE_GARDEN_ONE_PODIUM_HEIGHT - 0.16), materials.limestone);
  podiumDeck.name = 'LeeGardenOneExactOsmBuildingPodiumRoofNotComplexBoundary'; tower.add(podiumDeck);
  const groundPavers = createGroundPavers();
  meshStore(tower, groundPavers.pavers, materials.limestone, 'LeeGardenOneGroundPaversClearOfSourceServiceRoad');
  const extension = createRoofExtension(); tower.add(extension.group);
  meshStore(extension.group, extension.glass, materials.podiumGlass, 'LeeGardenOneMakeRooftopGlassBoxGlazing', false);
  merged(extension.group, extension.frames, materials.copper, 'LeeGardenOneMakeRooftopCopperFrames');
  merged(extension.group, extension.roof, materials.limestone, 'LeeGardenOneMakeRooftopGlassBoxRoof');
  merged(extension.group, extension.interior, materials.interior, 'LeeGardenOneMakeRooftopTwoStoreyInterior');
  merged(extension.group, extension.green, materials.greenery, 'LeeGardenOneMakeRooftopGreenWall');
  merged(extension.group, extension.lights, materials.warmLight, 'LeeGardenOneMakeRooftopIntegratedLighting', false);
  const roofDetails = createRoofDetails();
  merged(tower, roofDetails.plant, materials.silver, 'LeeGardenOneOffsetSouthwestSpireAndRoofPlant');
  merged(tower, roofDetails.louvres, materials.dark, 'LeeGardenOneRoofPlantLouvres');
  merged(tower, roofDetails.garden, materials.limestone, 'LeeGardenOnePodiumLandscapePlanters');
  merged(tower, roofDetails.greenery, materials.greenery, 'LeeGardenOnePodiumLandscapePlanting');
  merged(tower, roofDetails.balustrades, materials.balustrade, 'LeeGardenOnePodiumGlassBalustrades', false);
  const beaconMaterial = new THREE.MeshStandardNodeMaterial({ color: 0xff6b45 }); beaconMaterial.emissiveNode = color(0xff3418).mul(nightAmount().mul(2.0).add(0.03));
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), beaconMaterial); beacon.position.set(LEE_GARDEN_ONE_SPIRE_LOCAL.x, LEE_GARDEN_ONE_HEIGHT - 0.18, LEE_GARDEN_ONE_SPIRE_LOCAL.z); beacon.name = 'LeeGardenOneSpireTipBeacon'; tower.add(beacon);
  const entrance = createEntrance(group, materials), parking = createParking(group, materials);

  const colliders = [
    ...leeGardenOneRingColliders(LEE_GARDEN_ONE_TOWER_RING, LEE_GARDEN_ONE_PODIUM_HEIGHT, LEE_GARDEN_ONE_ROOF_HEIGHT),
    ...lobes.colliders, ...podium.colliders, extension.collider, ...roofDetails.colliders, ...entrance.colliders, ...parking.colliders
  ];
  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }
  const grounds = { plaza: groundOffset + LEE_GARDEN_ONE_PLAZA_TOP };
  const landmark = { name: LEE_GARDEN_ONE_SITE.name, englishName: LEE_GARDEN_ONE_SITE.englishName,
    position: { x: LEE_GARDEN_ONE_SITE.x, y: groundOffset, z: LEE_GARDEN_ONE_SITE.z }, radius: 92, height: LEE_GARDEN_ONE_TO_TIP_HEIGHT };
  const stats = {
    leeGardenOneGroundOffset: groundOffset, leeGardenOneLandmarks: 1,
    leeGardenOneOsmHeight: LEE_GARDEN_ONE_OSM_HEIGHT, leeGardenOneOsmLevels: LEE_GARDEN_ONE_OSM_LEVELS,
    leeGardenOneHeight: LEE_GARDEN_ONE_HEIGHT, leeGardenOneToTipHeight: LEE_GARDEN_ONE_TO_TIP_HEIGHT,
    leeGardenOneOccupiedHeight: LEE_GARDEN_ONE_OCCUPIED_HEIGHT, leeGardenOneCtbuhLevels: LEE_GARDEN_ONE_CTBUH_LEVELS,
    leeGardenOneCtbuhUndergroundLevels: LEE_GARDEN_ONE_CTBUH_UNDERGROUND_LEVELS,
    leeGardenOneCtbuhCompletionYear: LEE_GARDEN_ONE_CTBUH_COMPLETION_YEAR, leeGardenOneConstructionStart: LEE_GARDEN_ONE_CONSTRUCTION_START,
    leeGardenOnePublishedHeight: LEE_GARDEN_ONE_PUBLISHED_HEIGHT, leeGardenOnePublishedLevels: LEE_GARDEN_ONE_PUBLISHED_LEVELS,
    leeGardenOnePublishedCompletionYear: LEE_GARDEN_ONE_PUBLISHED_COMPLETION_YEAR, leeGardenOneOfficeFloors: LEE_GARDEN_ONE_OFFICE_FLOORS,
    leeGardenOneCtbuhTowerGfa: LEE_GARDEN_ONE_CTBUH_TOWER_GFA, leeGardenOneCtbuhParkingSpaces: LEE_GARDEN_ONE_CTBUH_PARKING_SPACES,
    leeGardenOneCtbuhElevators: LEE_GARDEN_ONE_CTBUH_ELEVATORS,
    leeGardenOneHysanLevels: LEE_GARDEN_ONE_HYSAN_LEVELS, leeGardenOneHysanGfaSqft: LEE_GARDEN_ONE_HYSAN_GFA_SQFT,
    leeGardenOneHysanTypicalLettableMinSqft: LEE_GARDEN_ONE_HYSAN_TYPICAL_LETTABLE_MIN_SQFT,
    leeGardenOneHysanTypicalLettableMaxSqft: LEE_GARDEN_ONE_HYSAN_TYPICAL_LETTABLE_MAX_SQFT,
    leeGardenOneHysanWholeFloorEfficiency: LEE_GARDEN_ONE_HYSAN_WHOLE_FLOOR_EFFICIENCY,
    leeGardenOneHysanClearHeadroom: LEE_GARDEN_ONE_HYSAN_CLEAR_HEADROOM,
    leeGardenOneHysanCoreDepthMin: LEE_GARDEN_ONE_HYSAN_CORE_DEPTH_MIN, leeGardenOneHysanCoreDepthMax: LEE_GARDEN_ONE_HYSAN_CORE_DEPTH_MAX,
    leeGardenOneMakeProjectArea: LEE_GARDEN_ONE_MAKE_PROJECT_AREA, leeGardenOneMakeRooftopStoreys: LEE_GARDEN_ONE_MAKE_ROOFTOP_STOREYS,
    leeGardenOneSourceVertices: LEE_GARDEN_ONE_OSM_SOURCE.geometry.length - 1,
    leeGardenOneComplexSourceVertices: LEE_GARDEN_ONE_COMPLEX_SOURCE.geometry.length - 1,
    leeGardenOneOsmWayVersion: LEE_GARDEN_ONE_OSM_SOURCE.version, leeGardenOneComplexOsmWayVersion: LEE_GARDEN_ONE_COMPLEX_SOURCE.version,
    leeGardenOneVisualCourses: LEE_GARDEN_ONE_OFFICE_VISUAL_COURSES,
    leeGardenOneTowerPlanScale: LEE_GARDEN_ONE_TOWER_PLAN_SCALE, leeGardenOneTowerNorthSetback: LEE_GARDEN_ONE_TOWER_NORTH_SETBACK,
    leeGardenOneGlassPanels: shaft.glassPanels,
    leeGardenOneHorizontalBands: shaft.horizontalBands, leeGardenOneVerticalMullions: shaft.verticalMullions,
    leeGardenOneCrownPanels: shaft.crownPanels, leeGardenOneCornerLobes: LEE_GARDEN_ONE_LOBE_SOURCE_VERTICES.length,
    leeGardenOneLobeGlassPanels: lobes.glassPanels, leeGardenOneLobeBands: lobes.bandCount,
    leeGardenOneGroundGlassPanels: podium.glassPanels, leeGardenOnePodiumStonePanels: podium.stonePanels,
    leeGardenOneLatticePanels: podium.latticePanels, leeGardenOneGroundPortalBays: podium.portalBays,
    leeGardenOneGroundPaverBays: groundPavers.bays,
    leeGardenOneTransitionBraces: podium.braceCount, leeGardenOneRoofGlassBoxes: 1,
    leeGardenOneSpireSourceVertex: LEE_GARDEN_ONE_SPIRE_SOURCE_VERTEX, leeGardenOneEntranceNode: LEE_GARDEN_ONE_ENTRANCE.osmNode,
    leeGardenOneEntranceForecourtDepth: LEE_GARDEN_ONE_ENTRANCE_FORECOURT_DEPTH,
    leeGardenOneEntranceForecourtOuterWidth: LEE_GARDEN_ONE_ENTRANCE_FORECOURT_OUTER_WIDTH,
    leeGardenOneParkingEntranceNode: LEE_GARDEN_ONE_PARKING_ENTRANCE.osmNode,
    leeGardenOneServiceWays: LEE_GARDEN_ONE_SERVICE_WAYS.length, leeGardenOneRoadVehicleClearance: LEE_GARDEN_ONE_ROAD_VEHICLE_CLEARANCE,
    leeGardenOnePlazaGround: grounds.plaza, leeGardenOneColliders: colliders.length
  };
  group.userData.stats = stats;
  return { group, colliders, landmarks: [landmark], stats, groundOffset, grounds, plazaTop: grounds.plaza,
    groundHeightAt: (x, z, fallback) => leeGardenOneGroundHeightAt(x, z, fallback, grounds) };
}
