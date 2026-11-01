import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  MASTERPIECE_SITE, MASTERPIECE_TOWER_RING, MASTERPIECE_OSM_HEIGHT, MASTERPIECE_HEIGHT,
  MASTERPIECE_TO_TIP_HEIGHT, MASTERPIECE_OCCUPIED_HEIGHT, MASTERPIECE_OSM_LEVELS, MASTERPIECE_LEVELS,
  MASTERPIECE_BELOW_GROUND_LEVELS, MASTERPIECE_APARTMENTS, MASTERPIECE_HOTEL_ROOMS,
  MASTERPIECE_CONSTRUCTION_START_YEAR, MASTERPIECE_COMPLETED_YEAR, MASTERPIECE_WIKIPEDIA_SPIRE_HEIGHT,
  MASTERPIECE_WIKIPEDIA_ROOF_HEIGHT, MASTERPIECE_WIKIPEDIA_HOTEL_ROOMS,
  MASTERPIECE_WIKIPEDIA_CONSTRUCTION_START_YEAR, MASTERPIECE_WIKIPEDIA_COMPLETED_YEAR,
  MASTERPIECE_PLAZA_TOP, MASTERPIECE_CROWN_LOUVRE_TOP, MASTERPIECE_PANEL_TARGET_WIDTH,
  MASTERPIECE_VISUAL_SKY_GARDEN_LEVELS, MASTERPIECE_CENTRAL_GLASS_EDGES, MASTERPIECE_PORTAL_EDGES,
  MASTERPIECE_ENTRANCE, MASTERPIECE_OSM_SOURCE
} from './masterpiece-architecture.js';
import { masterpieceFloorY, masterpieceEdgeOutward, masterpieceRingColliders } from './masterpiece-architecture.js';

const lerp = (a, b, t) => a + (b - a) * t;
const nightAmount = () => smoothstep(0.55, 1.4, cityUniforms.uInteriorGlow);
function store() { return { positions: [], colors: [], lit: [] }; }
function tintMix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function hash(a, b, c, d = 0) { const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + d * 19.19) * 43758.5453; return value - Math.floor(value); }
function vertex(target, p, tint, lit = 0) { target.positions.push(...p); target.colors.push(...tint); target.lit.push(lit); }
function quad(target, a, b, c, d, tint, lit = 0) { for (const p of [a, b, c, a, c, d]) vertex(target, p, tint, lit); }
function triangle(target, a, b, c, tint) { for (const p of [a, b, c]) vertex(target, p, tint, 0); }
function geometryFromStore(data) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3));
  geometry.setAttribute('aLit', new THREE.Float32BufferAttribute(data.lit, 1));
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere(); return geometry;
}
function meshStore(group, data, material, name, shadows = true) {
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
function localBox(group, material, name, center, size, shadows = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.position.set(...center); mesh.name = name;
  mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function beam(parts, a, b, thickness = 0.08, depth = thickness) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
  const length = direction.length(); if (length < 1e-6) return;
  const geometry = new THREE.BoxGeometry(thickness, length, depth);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  geometry.translate((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5); parts.push(geometry);
}
function edgeBox(parts, ring, edge, t, y, offset, width, height, depth) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const { nx, nz, ry } = masterpieceEdgeOutward(ring, edge);
  box(parts, [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset], [width, height, depth], ry);
}
function bayCount(length) { return Math.max(1, Math.round(length / MASTERPIECE_PANEL_TARGET_WIDTH)); }
function worldCollider(cx, cz, w, d, ry, minY, maxY) {
  const cs = Math.cos(ry), sn = Math.sin(ry), hx = w * 0.5, hz = d * 0.5;
  return { minX: cx - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: cx + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: cz - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: cz + Math.abs(sn) * hx + Math.abs(cs) * hz,
    minY, maxY, obb: { cx, cz, hx, hz, cs, sn } };
}
function elementCollider(ring, edge, t, y, offset, width, height, depth) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const { nx, nz, ry } = masterpieceEdgeOutward(ring, edge), site = MASTERPIECE_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const lx = lerp(ax, bx, t) + nx * offset, lz = lerp(az, bz, t) + nz * offset;
  const x = site.x + cs * lx + sn * lz, z = site.z - sn * lx + cs * lz, worldRy = site.ry + ry;
  return worldCollider(x, z, width, depth, worldRy, y - height * 0.5, y + height * 0.5);
}
function triangulatedRoof(ring, y, tint) {
  const result = store(), points = [];
  for (let i = 0; i + 1 < ring.length; i += 2) points.push(new THREE.Vector2(ring[i], ring[i + 1]));
  for (const face of THREE.ShapeUtils.triangulateShape(points, [])) {
    const [a, b, c] = face.map((index) => [points[index].x, y, points[index].y]); triangle(result, a, b, c, tint);
  }
  return result;
}

function createFacade() {
  const ring = MASTERPIECE_TOWER_RING, glass = store(), centralGlass = store(), spandrels = store(), terraceGlass = store();
  const mullions = [], balconies = [], rails = [], louvres = [], skyPlants = [], skyLights = [];
  const centralEdges = new Set(MASTERPIECE_CENTRAL_GLASS_EDGES), skyCourses = new Set(MASTERPIECE_VISUAL_SKY_GARDEN_LEVELS);
  let visionPanels = 0, centralPanels = 0, balconySlabs = 0, skyGardenPlanters = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length, ry } = masterpieceEdgeOutward(ring, edge), bays = bayCount(length), central = centralEdges.has(edge);
    const point = (t, y, offset = 0.055) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    const entranceVoid = (t, y) => edge === 25 && y < 5.8 && Math.abs((t - 0.5) * length) < 3.2;
    for (let course = 0; course < MASTERPIECE_LEVELS; course++) {
      const y0 = masterpieceFloorY(course), y1 = masterpieceFloorY(course + 1), sky = skyCourses.has(course);
      const skySecond = course === 25 || course === 46;
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + 0.001, t1 = (bay + 1) / bays - 0.001, tm = (t0 + t1) * 0.5;
        if (entranceVoid(tm, (y0 + y1) * 0.5)) continue;
        const variation = hash(edge, bay, course, 13), lit = hash(edge, bay, course, 71) > 0.88 ? 0.28 + variation * 0.60 : 0;
        const target = central ? centralGlass : glass;
        if (sky && !central) {
          quad(target, point(t0, y0 + 0.12, -1.05), point(t1, y0 + 0.12, -1.05),
            point(t1, y1 - 0.12, -1.05), point(t0, y1 - 0.12, -1.05),
            tintMix([0.075, 0.13, 0.15], [0.17, 0.24, 0.25], variation), lit * 0.5); visionPanels++;
          if (!skySecond) {
            quad(terraceGlass, point(t0, y0 + 0.18, 0.18), point(t1, y0 + 0.18, 0.18),
              point(t1, y0 + 1.02, 0.18), point(t0, y0 + 1.02, 0.18), [0.20, 0.29, 0.30]);
          }
          continue;
        }
        if (central) {
          quad(target, point(t0, y0 + 0.10), point(t1, y0 + 0.10), point(t1, y1 - 0.10), point(t0, y1 - 0.10),
            tintMix([0.055, 0.13, 0.20], [0.15, 0.29, 0.39], 0.35 + variation * 0.45), lit); centralPanels++;
        } else if (course < 6) {
          quad(spandrels, point(t0, y0 + 0.02), point(t1, y0 + 0.02), point(t1, y0 + 0.62), point(t0, y0 + 0.62),
            tintMix([0.17, 0.14, 0.11], [0.30, 0.26, 0.20], variation));
          quad(target, point(t0, y0 + 0.68), point(t1, y0 + 0.68), point(t1, y1 - 0.16), point(t0, y1 - 0.16),
            tintMix([0.11, 0.15, 0.16], [0.24, 0.28, 0.27], variation), lit); visionPanels++;
        } else if (course < 24) {
          quad(spandrels, point(t0, y0 + 0.02), point(t1, y0 + 0.02), point(t1, y0 + 0.58), point(t0, y0 + 0.58),
            tintMix([0.20, 0.17, 0.13], [0.35, 0.30, 0.23], variation));
          quad(target, point(t0, y0 + 0.64), point(t1, y0 + 0.64), point(t1, y1 - 0.12), point(t0, y1 - 0.12),
            tintMix([0.13, 0.14, 0.13], [0.29, 0.27, 0.22], 0.30 + variation * 0.55), lit); visionPanels++;
        } else {
          quad(terraceGlass, point(t0, y0 + 0.18, 0.16), point(t1, y0 + 0.18, 0.16),
            point(t1, y0 + 0.84, 0.16), point(t0, y0 + 0.84, 0.16),
            tintMix([0.15, 0.22, 0.24], [0.27, 0.34, 0.34], variation));
          quad(target, point(t0, y0 + 0.90, -0.18), point(t1, y0 + 0.90, -0.18),
            point(t1, y1 - 0.12, -0.18), point(t0, y1 - 0.12, -0.18),
            tintMix([0.12, 0.16, 0.17], [0.29, 0.32, 0.30], 0.28 + variation * 0.52), lit); visionPanels++;
        }
      }
      for (let bay = 0; bay <= bays; bay++) {
        const t = bay / bays, mid = (y0 + y1) * 0.5;
        if (entranceVoid(t, mid)) continue;
        const offset = sky && !central ? -0.93 : central ? 0.15 : course >= 24 ? -0.10 : 0.12;
        const edgeCount = ring.length / 2 - 1;
        const spineBoundary = bay === 0 && central !== centralEdges.has((edge + edgeCount - 1) % edgeCount);
        const major = spineBoundary || bay % 3 === 0;
        edgeBox(mullions, ring, edge, t, mid, offset, spineBoundary ? 0.24 : central ? 0.10 : major ? 0.16 : 0.07,
          y1 - y0, spineBoundary ? 0.40 : central ? 0.28 : major ? 0.34 : 0.16);
      }
      if (!skySecond && !(course >= 24 && central)) {
        beam(rails, point(0, y0 + (course >= 24 ? 0.90 : 0.06), course >= 24 ? 0.23 : 0.12),
          point(1, y0 + (course >= 24 ? 0.90 : 0.06), course >= 24 ? 0.23 : 0.12), course >= 24 ? 0.075 : 0.055, 0.10);
      }
      if (course >= 24 && !central && !skySecond) {
        edgeBox(balconies, ring, edge, 0.5, y0, 0.14, length + 0.06, sky ? 0.24 : 0.18, sky ? 1.30 : 0.68); balconySlabs++;
      }
      if (sky && !skySecond && !central) {
        beam(skyLights, point(0, y0 + 0.26, 0.27), point(1, y0 + 0.26, 0.27), 0.07, 0.12);
      }
      if (sky && !skySecond) {
        for (let d = 1.2; d < length - 0.8; d += 3.6) {
          const t = d / length, shrub = new THREE.SphereGeometry(0.46, 7, 5);
          shrub.scale(1.25, 0.72, 0.80); shrub.translate(lerp(ax, bx, t) - nx * 0.44, y0 + 0.52, lerp(az, bz, t) - nz * 0.44);
          skyPlants.push(shrub); skyGardenPlanters++;
        }
      }
      if (course < 24 && course % 2 === 0 && !central) {
        beam(louvres, point(0, y0 + 0.45, 0.19), point(1, y0 + 0.45, 0.19), 0.055, 0.20);
      }
    }
  }
  return { glass, centralGlass, spandrels, terraceGlass, mullions, balconies, rails, louvres, skyPlants, skyLights,
    visionPanels, centralPanels, balconySlabs, skyGardenPlanters };
}

function createCrown() {
  const ring = MASTERPIECE_TOWER_RING, backing = store(), roof = triangulatedRoof(ring.slice(0, -2), MASTERPIECE_CROWN_LOUVRE_TOP, [0.075, 0.09, 0.10]);
  const louvres = [], fins = [], coping = [], portals = [], plant = [], boom = [];
  let louvreCount = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { length } = masterpieceEdgeOutward(ring, edge), bays = bayCount(length);
    const point = (t, y, offset = 0.04) => {
      const { nx, nz } = masterpieceEdgeOutward(ring, edge);
      return [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    };
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays + 0.001, t1 = (bay + 1) / bays - 0.001;
      quad(backing, point(t0, MASTERPIECE_OCCUPIED_HEIGHT), point(t1, MASTERPIECE_OCCUPIED_HEIGHT),
        point(t1, MASTERPIECE_CROWN_LOUVRE_TOP), point(t0, MASTERPIECE_CROWN_LOUVRE_TOP), [0.055, 0.075, 0.085]);
    }
    for (let y = MASTERPIECE_OCCUPIED_HEIGHT + 0.28; y < MASTERPIECE_CROWN_LOUVRE_TOP; y += 0.55) {
      beam(louvres, point(0, y, 0.20), point(1, y, 0.20), 0.12, 0.32); louvreCount++;
    }
    for (let bay = 0; bay <= bays; bay++) edgeBox(fins, ring, edge, bay / bays,
      (MASTERPIECE_OCCUPIED_HEIGHT + MASTERPIECE_CROWN_LOUVRE_TOP) * 0.5, 0.14, 0.10,
      MASTERPIECE_CROWN_LOUVRE_TOP - MASTERPIECE_OCCUPIED_HEIGHT, 0.28);
    beam(coping, point(0, MASTERPIECE_CROWN_LOUVRE_TOP, 0.14), point(1, MASTERPIECE_CROWN_LOUVRE_TOP, 0.14), 0.20, 0.32);
  }
  const colliders = [];
  for (const edge of MASTERPIECE_PORTAL_EDGES) {
    const { length } = masterpieceEdgeOutward(ring, edge), base = MASTERPIECE_OCCUPIED_HEIGHT;
    const top = MASTERPIECE_TO_TIP_HEIGHT, frame = 0.75, depth = 0.85;
    for (const t of [0, 1]) {
      edgeBox(portals, ring, edge, t, (base + top) * 0.5, 0.40, frame, top - base, depth);
      colliders.push(elementCollider(ring, edge, t, (base + top) * 0.5, 0.40, frame, top - base, depth));
    }
    edgeBox(portals, ring, edge, 0.5, top - frame * 0.5, 0.40, length + frame, frame, depth);
    edgeBox(portals, ring, edge, 0.5, base + frame * 0.5, 0.40, length + frame, frame, depth);
    colliders.push(elementCollider(ring, edge, 0.5, top - frame * 0.5, 0.40, length + frame, frame, depth));
    colliders.push(elementCollider(ring, edge, 0.5, base + frame * 0.5, 0.40, length + frame, frame, depth));
  }
  for (const [x, z, w, d, h] of [[-15, 1, 8, 5, 2.4], [3, -2, 10, 5, 2.8], [20, 1, 7, 4, 2.1]]) {
    box(plant, [x, MASTERPIECE_CROWN_LOUVRE_TOP + h * 0.5, z], [w, h, d]);
    for (let s = -w * 0.5 + 0.5; s < w * 0.5; s += 0.55) box(louvres, [x + s, MASTERPIECE_CROWN_LOUVRE_TOP + h * 0.5, z + d * 0.5 + 0.04], [0.10, h - 0.3, 0.12]);
  }
  box(boom, [4, 253.2, 0], [1.2, 5.4, 1.2]);
  beam(boom, [-9, 255.7, 0], [18, 255.7, 0], 0.32, 0.32);
  box(boom, [-8.4, 255.35, 0], [2.2, 1.0, 1.1]);
  beam(boom, [4, 253.4, 0], [12, 255.7, 0], 0.20, 0.20);
  beam(boom, [15, 250.6, 0], [15, 255.7, 0], 0.075, 0.075);
  beam(boom, [-3, 250.6, 0], [-3, 255.7, 0], 0.075, 0.075);
  return { backing, roof, louvres, fins, coping, portals, plant, boom, louvreCount, colliders };
}

function signTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 192;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#211f1b'; ctx.fillRect(0, 0, 1024, 192);
  ctx.textAlign = 'center'; ctx.fillStyle = '#e1cf9f'; ctx.font = '500 64px sans-serif'; ctx.fillText('THE MASTERPIECE', 512, 118);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function createEntrance(group, materials) {
  const entrance = new THREE.Group(); entrance.position.set(MASTERPIECE_ENTRANCE.x, 0, MASTERPIECE_ENTRANCE.z);
  entrance.rotation.y = MASTERPIECE_ENTRANCE.ry; entrance.name = 'MasterpieceHanoiRoadResidentialEntrance'; group.add(entrance);
  const glass = [], frames = [], posts = [], lights = [], lobby = [], doors = [], doorFrames = [], screens = [], planters = [], foliage = [];
  const width = 12, height = 4.8, front = 3.2;
  box(lobby, [0, 2.6, -0.55], [11.2, 5.2, 0.20]);
  box(lobby, [0, 0.06, 1.5], [16, 0.12, 5]);
  for (const x of [-5.55, 5.55]) {
    box(lobby, [x, 2.6, -0.02], [0.70, 5.2, 0.42]);
    box(lights, [x, 2.55, 0.23], [0.16, 4.45, 0.08]);
  }
  for (const x of [-4.7, -3.9, 3.9, 4.7]) box(lights, [x, 2.55, -0.40], [0.11, 4.5, 0.10]);
  for (const x of [-2.8, -1.4, 0, 1.4, 2.8]) box(doors, [x, 2.1, 0.08], [1.32, 4.2, 0.08]);
  for (const x of [-4.35, 4.35]) box(doors, [x, 2.1, 0.06], [1.60, 4.2, 0.08]);
  for (const x of [-5.15, -3.5, -2.1, -0.7, 0.7, 2.1, 3.5, 5.15]) box(doorFrames, [x, 2.1, 0.16], [0.075, 4.2, 0.12]);
  for (const x of [-0.18, 0.18]) box(doorFrames, [x, 1.55, 0.25], [0.045, 0.72, 0.07]);
  for (const cx of [-4.35, 4.35]) {
    const left = cx - 0.68, right = cx + 0.68, bottom = 0.42, top = 4.12, z = 0.24;
    for (const x of [left, cx, right]) beam(screens, [x, bottom, z], [x, top, z], 0.055, 0.07);
    for (const y of [bottom, 1.35, 2.28, 3.20, top]) beam(screens, [left, y, z], [right, y, z], 0.055, 0.07);
    for (const y of [0.65, 2.45]) {
      beam(screens, [left, y, z], [cx, y + 0.72, z], 0.045, 0.06);
      beam(screens, [cx, y + 0.72, z], [right, y, z], 0.045, 0.06);
      beam(screens, [right, y, z], [cx, y - 0.45, z], 0.045, 0.06);
      beam(screens, [cx, y - 0.45, z], [left, y, z], 0.045, 0.06);
    }
  }
  for (let bay = 0; bay < 6; bay++) for (const z of [0.8, 2.35]) {
    box(glass, [-width * 0.5 + (bay + 0.5) * width / 6, height, z], [width / 6 - 0.10, 0.055, 1.45]);
  }
  for (let bay = 0; bay <= 6; bay++) box(frames, [-width * 0.5 + bay * width / 6, height, 1.6], [0.11, 0.18, 3.2]);
  for (const z of [0, 1.6, front]) box(frames, [0, height, z], [width, 0.20, 0.14]);
  for (const z of [0.45, 2.75]) box(lights, [0, height - 0.15, z], [10.5, 0.055, 0.09]);
  const postXs = [-5.2, -3.2, 3.2, 5.2];
  for (const x of postXs) {
    const post = new THREE.CylinderGeometry(0.085, 0.085, height, 10); post.translate(x, height * 0.5, 2.55); posts.push(post);
    box(lights, [x, height - 0.14, 1.55], [0.95, 0.07, 0.15]);
  }
  for (const x of [-6.5, 6.5]) {
    box(planters, [x, 0.36, 2.5], [2.2, 0.72, 0.95]);
    for (let i = 0; i < 4; i++) {
      const shrub = new THREE.SphereGeometry(0.43, 7, 5); shrub.scale(1, 0.80, 0.78); shrub.translate(x - 0.75 + i * 0.5, 0.91, 2.5); foliage.push(shrub);
    }
  }
  merged(entrance, lobby, materials.lobbyStone, 'MasterpieceWarmResidentialLobbyAndPaving');
  merged(entrance, doors, materials.entranceGlass, 'MasterpieceResidentialGlazedDoors', false);
  merged(entrance, doorFrames, materials.bronze, 'MasterpieceResidentialDoorFramesAndHandles');
  merged(entrance, screens, materials.bronze, 'MasterpieceDecorativeBronzeLobbyScreens');
  merged(entrance, glass, materials.clearGlass, 'MasterpieceFlatGlassEntranceCanopy', false);
  merged(entrance, frames, materials.bronze, 'MasterpieceCanopyBronzeGrid');
  merged(entrance, posts, materials.bronze, 'MasterpieceSlenderCanopyPosts');
  merged(entrance, lights, materials.warmLight, 'MasterpieceLobbyAndCanopyWarmLights', false);
  merged(entrance, planters, materials.planter, 'MasterpieceEntranceStonePlanters');
  merged(entrance, foliage, materials.foliage, 'MasterpieceEntranceClippedShrubs');
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 1.28), new THREE.MeshBasicMaterial({ map: signTexture(), toneMapped: false }));
  sign.position.set(0, 4.12, 0.27); sign.name = 'MasterpieceEntranceIdentification'; entrance.add(sign);
  const colliders = [], cs = Math.cos(MASTERPIECE_ENTRANCE.ry), sn = Math.sin(MASTERPIECE_ENTRANCE.ry);
  const add = (x, z, w, d, minY, maxY) => {
    const wx = MASTERPIECE_ENTRANCE.x + cs * x + sn * z, wz = MASTERPIECE_ENTRANCE.z - sn * x + cs * z;
    colliders.push(worldCollider(wx, wz, w, d, MASTERPIECE_ENTRANCE.ry, minY, maxY));
  };
  add(0, 1.6, width, 3.3, height - 0.15, height + 0.18);
  for (const x of postXs) add(x, 2.55, 0.24, 0.24, 0, height);
  for (const x of [-5.55, 5.55]) add(x, -0.02, 0.70, 0.42, 0, 5.2);
  for (const x of [-6.5, 6.5]) add(x, 2.5, 2.2, 0.95, 0, 1.2);
  return { colliders };
}

export function buildMasterpiece(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'MasterpieceAuthoredMixedUseTowerLandmark'; group.userData.internalId = 'HK-B0013';
  group.position.y = groundOffset; root.add(group);
  const materials = {
    glass: new THREE.MeshStandardNodeMaterial({ metalness: 0.48, roughness: 0.24, envMapIntensity: 1.05, side: THREE.DoubleSide }),
    centralGlass: new THREE.MeshStandardNodeMaterial({ metalness: 0.62, roughness: 0.18, envMapIntensity: 1.15, side: THREE.DoubleSide }),
    spandrel: new THREE.MeshStandardNodeMaterial({ metalness: 0.42, roughness: 0.40, side: THREE.DoubleSide }),
    terraceGlass: new THREE.MeshStandardNodeMaterial({ metalness: 0.38, roughness: 0.25, transparent: true, opacity: 0.82, side: THREE.DoubleSide }),
    silver: new THREE.MeshStandardNodeMaterial({ color: 0xc7cbc7, metalness: 0.48, roughness: 0.38 }),
    balcony: new THREE.MeshStandardNodeMaterial({ color: 0xd4d5cf, metalness: 0.24, roughness: 0.48 }),
    bronze: new THREE.MeshStandardNodeMaterial({ color: 0x8d8069, metalness: 0.64, roughness: 0.34 }),
    dark: new THREE.MeshStandardNodeMaterial({ color: 0x20292d, metalness: 0.56, roughness: 0.40 }),
    roof: new THREE.MeshStandardNodeMaterial({ metalness: 0.35, roughness: 0.58, side: THREE.DoubleSide }),
    clearGlass: new THREE.MeshStandardNodeMaterial({ color: 0xa8bfc0, transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.10, side: THREE.DoubleSide }),
    entranceGlass: new THREE.MeshStandardNodeMaterial({ color: 0x9b8b70, metalness: 0.16, roughness: 0.14, transparent: true, opacity: 0.34, depthWrite: false, side: THREE.DoubleSide }),
    lobbyStone: new THREE.MeshStandardNodeMaterial({ color: 0x8c806b, roughness: 0.72 }),
    warmLight: new THREE.MeshStandardNodeMaterial({ color: 0xd3b984, roughness: 0.42 }),
    skyLight: new THREE.MeshStandardNodeMaterial({ color: 0xbfb298, roughness: 0.42 }),
    planter: new THREE.MeshStandardNodeMaterial({ color: 0x3d403c, roughness: 0.78 }),
    foliage: new THREE.MeshStandardNodeMaterial({ color: 0x35533a, roughness: 0.92 })
  };
  for (const key of ['glass', 'centralGlass', 'spandrel', 'terraceGlass', 'roof']) materials[key].colorNode = attribute('color', 'vec3');
  for (const key of ['glass', 'centralGlass']) materials[key].emissiveNode = color(0x24486a).mul(nightAmount()).mul(0.16)
    .add(color(0xffd5a0).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.50));
  materials.terraceGlass.emissiveNode = color(0x25404a).mul(nightAmount()).mul(0.08);
  materials.warmLight.emissiveNode = color(0xffd49a).mul(nightAmount().mul(2.1).add(0.02));
  materials.skyLight.emissiveNode = color(0xffd6a0).mul(nightAmount().mul(1.15).add(0.005));
  materials.lobbyStone.emissiveNode = color(0xffd2a0).mul(nightAmount().mul(0.22).add(0.006));
  materials.entranceGlass.emissiveNode = color(0xffc78d).mul(nightAmount().mul(0.08).add(0.002));

  const tower = new THREE.Group(); tower.position.set(MASTERPIECE_SITE.x, 0, MASTERPIECE_SITE.z); tower.rotation.y = MASTERPIECE_SITE.ry;
  tower.name = 'MasterpieceExactOSMPlanHotelResidentialAndOpenCrown'; group.add(tower);
  const facade = createFacade();
  meshStore(tower, facade.glass, materials.glass, 'MasterpieceHotelAndResidentialVisionGlass');
  meshStore(tower, facade.centralGlass, materials.centralGlass, 'MasterpieceContinuousBlueGlassSpines');
  meshStore(tower, facade.spandrels, materials.spandrel, 'MasterpieceBronzeHotelSpandrels');
  meshStore(tower, facade.terraceGlass, materials.terraceGlass, 'MasterpieceBalconyAndSkyGardenGlassRails', false);
  merged(tower, facade.mullions, materials.silver, 'MasterpieceVerticalFacadeMullions');
  merged(tower, facade.balconies, materials.balcony, 'MasterpieceCurvedResidentialBalconyBands');
  merged(tower, facade.rails, materials.silver, 'MasterpieceBalconyTopRailsAndHotelTransoms');
  merged(tower, facade.louvres, materials.bronze, 'MasterpieceLowerFacadeBronzeLouvres');
  merged(tower, facade.skyPlants, materials.foliage, 'MasterpieceDoubleHeightSkyGardenPlanting');
  merged(tower, facade.skyLights, materials.skyLight, 'MasterpieceSkyGardenWarmLinearAccents', false);
  const crown = createCrown();
  meshStore(tower, crown.backing, materials.dark, 'MasterpieceDarkCrownBacking');
  meshStore(tower, crown.roof, materials.roof, 'MasterpieceRoofDeck');
  merged(tower, crown.louvres, materials.dark, 'MasterpieceHorizontalCrownAndPlantLouvres');
  merged(tower, crown.fins, materials.silver, 'MasterpieceCrownVerticalFins');
  merged(tower, crown.coping, materials.silver, 'MasterpieceCrownCoping');
  merged(tower, crown.portals, materials.balcony, 'MasterpieceFourOpenRectangularCrownPortals');
  merged(tower, crown.plant, materials.dark, 'MasterpieceRoofPlantEnclosures');
  merged(tower, crown.boom, materials.silver, 'MasterpieceRoofMaintenanceBoom');
  const entrance = createEntrance(group, materials);

  const colliders = [
    ...masterpieceRingColliders(MASTERPIECE_TOWER_RING, 0, MASTERPIECE_OCCUPIED_HEIGHT, 0.85),
    ...masterpieceRingColliders(MASTERPIECE_TOWER_RING, MASTERPIECE_OCCUPIED_HEIGHT, MASTERPIECE_CROWN_LOUVRE_TOP, 0.85),
    ...crown.colliders, ...entrance.colliders
  ];
  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }
  const landmark = { name: MASTERPIECE_SITE.name, englishName: MASTERPIECE_SITE.englishName,
    position: { x: MASTERPIECE_SITE.x, y: groundOffset, z: MASTERPIECE_SITE.z }, radius: 92, height: MASTERPIECE_TO_TIP_HEIGHT };
  const stats = {
    masterpieceGroundOffset: groundOffset, masterpieceLandmarks: 1,
    masterpieceOsmHeight: MASTERPIECE_OSM_HEIGHT, masterpieceHeight: MASTERPIECE_HEIGHT,
    masterpieceToTipHeight: MASTERPIECE_TO_TIP_HEIGHT, masterpieceOccupiedHeight: MASTERPIECE_OCCUPIED_HEIGHT,
    masterpieceOsmLevels: MASTERPIECE_OSM_LEVELS, masterpieceLevels: MASTERPIECE_LEVELS,
    masterpieceBelowGroundLevels: MASTERPIECE_BELOW_GROUND_LEVELS, masterpieceApartments: MASTERPIECE_APARTMENTS,
    masterpieceHotelRooms: MASTERPIECE_HOTEL_ROOMS, masterpieceConstructionStartYear: MASTERPIECE_CONSTRUCTION_START_YEAR,
    masterpieceCompletedYear: MASTERPIECE_COMPLETED_YEAR, masterpieceWikipediaSpireHeight: MASTERPIECE_WIKIPEDIA_SPIRE_HEIGHT,
    masterpieceWikipediaRoofHeight: MASTERPIECE_WIKIPEDIA_ROOF_HEIGHT, masterpieceWikipediaHotelRooms: MASTERPIECE_WIKIPEDIA_HOTEL_ROOMS,
    masterpieceWikipediaConstructionStartYear: MASTERPIECE_WIKIPEDIA_CONSTRUCTION_START_YEAR,
    masterpieceWikipediaCompletedYear: MASTERPIECE_WIKIPEDIA_COMPLETED_YEAR,
    masterpieceSourceVertices: MASTERPIECE_SITE.localRing.length / 2, masterpieceOsmWayVersion: MASTERPIECE_OSM_SOURCE.version,
    masterpieceVisionPanels: facade.visionPanels, masterpieceCentralGlassPanels: facade.centralPanels,
    masterpieceBalconySlabs: facade.balconySlabs, masterpieceSkyGardenPlanters: facade.skyGardenPlanters,
    masterpieceCrownLouvres: crown.louvreCount, masterpieceOpenCrownPortals: MASTERPIECE_PORTAL_EDGES.length,
    masterpieceColliders: colliders.length
  };
  group.userData.stats = stats;
  return { group, colliders, landmarks: [landmark], stats, groundOffset, plazaTop: groundOffset + MASTERPIECE_PLAZA_TOP };
}
