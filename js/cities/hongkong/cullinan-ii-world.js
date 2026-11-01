import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  CULLINAN_II_SITE, CULLINAN_II_TOWER_RING, CULLINAN_II_HEIGHT, CULLINAN_II_TO_TIP_HEIGHT,
  CULLINAN_II_OSM_HEIGHT, CULLINAN_II_OFFICIAL_APPROX_HEIGHT, CULLINAN_II_OSM_LEVELS, CULLINAN_II_LEVELS,
  CULLINAN_II_BELOW_GROUND_LEVELS, CULLINAN_II_OSM_START_DATE, CULLINAN_II_COMPLETED_YEAR,
  CULLINAN_II_VISUAL_WALL_TOP, CULLINAN_II_PANEL_TARGET_WIDTH, CULLINAN_II_VISUAL_LOUVRE_LEVELS,
  CULLINAN_II_ACCENT_LEVELS, CULLINAN_II_PLAZA_TOP, CULLINAN_II_GLASS_BOX_HEIGHT,
  CULLINAN_II_GLASS_BOX_WIDTH, CULLINAN_II_GLASS_BOX_DEPTH, CULLINAN_II_GLASS_BOX_PROJECTION,
  CULLINAN_II_W_CANOPY_HEIGHT, CULLINAN_II_W_CANOPY_WIDTH, CULLINAN_II_W_CANOPY_FRONT,
  CULLINAN_II_CROWN_VERTEX_HEIGHTS, CULLINAN_II_SIGNATURE_BLADE_VERTICES,
  CULLINAN_II_W_ATRIUM, CULLINAN_II_OSM_DOOR, CULLINAN_II_OSM_DOOR_FRAME, CULLINAN_II_OSM_SOURCE
} from './cullinan-ii-architecture.js';
import { cullinanIIFloorY, cullinanIIEdgeOutward, cullinanIIEdgeCollider, cullinanIIRingColliders } from './cullinan-ii-architecture.js';

const lerp = (a, b, t) => a + (b - a) * t;
const nightAmount = () => smoothstep(0.55, 1.4, cityUniforms.uInteriorGlow);
function store() { return { positions: [], colors: [], lit: [] }; }
function tintMix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function hash(a, b, c, d = 0) { const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + d * 19.19) * 43758.5453; return value - Math.floor(value); }
function vertex(target, p, tint, lit = 0) {
  target.positions.push(p[0], p[1], p[2]); target.colors.push(tint[0], tint[1], tint[2]); target.lit.push(lit);
}
function quad(target, a, b, c, d, tint, lit = 0) {
  for (const p of [a, b, c, a, c, d]) vertex(target, p, tint, lit);
}
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
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  if (ry) geometry.rotateY(ry); geometry.translate(center[0], center[1], center[2]); parts.push(geometry); return geometry;
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
  const { nx, nz, ry } = cullinanIIEdgeOutward(ring, edge);
  box(parts, [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset], [width, height, depth], ry);
}
function bayCount(length) { return Math.max(1, Math.round(length / CULLINAN_II_PANEL_TARGET_WIDTH)); }
function triangulatedRoof(ring, heights, tint) {
  const result = store(), points = [];
  for (let i = 0; i + 1 < ring.length; i += 2) points.push(new THREE.Vector2(ring[i], ring[i + 1]));
  for (const face of THREE.ShapeUtils.triangulateShape(points, [])) {
    const [a, b, c] = face.map((index) => [points[index].x, heights[index], points[index].y]); triangle(result, a, b, c, tint);
  }
  return result;
}
function worldCollider(cx, cz, w, d, ry, minY, maxY) {
  const cs = Math.cos(ry), sn = Math.sin(ry), hx = w * 0.5, hz = d * 0.5;
  return { minX: cx - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: cx + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: cz - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: cz + Math.abs(sn) * hx + Math.abs(cs) * hz,
    minY, maxY, obb: { cx, cz, hx, hz, cs, sn } };
}

function createCurtainWall() {
  const ring = CULLINAN_II_TOWER_RING, glass = store(), spandrels = store();
  const mullions = [], transoms = [], louvres = [], accents = [];
  const louvreLevels = new Set(CULLINAN_II_VISUAL_LOUVRE_LEVELS), accentLevels = new Set(CULLINAN_II_ACCENT_LEVELS);
  let visionPanels = 0, spandrelPanels = 0, louvrePanels = 0, louvreSlats = 0, accentSegments = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = cullinanIIEdgeOutward(ring, edge), bays = bayCount(length);
    const point = (t, y, offset = 0.055) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    const entryVoid = (t, y) => edge === CULLINAN_II_W_ATRIUM.edge && y < CULLINAN_II_GLASS_BOX_HEIGHT
      && Math.abs((t - 0.5) * length) < CULLINAN_II_GLASS_BOX_WIDTH * 0.5;
    for (let bay = 0; bay <= bays; bay++) {
      const t = bay / bays;
      for (let course = 0; course < CULLINAN_II_LEVELS; course++) {
        const y0 = cullinanIIFloorY(course), y1 = cullinanIIFloorY(course + 1), mid = (y0 + y1) * 0.5;
        if (entryVoid(t, mid)) continue;
        edgeBox(mullions, ring, edge, t, mid, 0.13, bay % 4 === 0 ? 0.12 : 0.065, y1 - y0, bay % 4 === 0 ? 0.32 : 0.18);
      }
    }
    for (let course = 0; course < CULLINAN_II_LEVELS; course++) {
      const y0 = cullinanIIFloorY(course), y1 = cullinanIIFloorY(course + 1), louvre = louvreLevels.has(course);
      const spandrelTop = y0 + Math.min(0.84, (y1 - y0) * 0.25);
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + 0.001, t1 = (bay + 1) / bays - 0.001, tm = (t0 + t1) * 0.5;
        if (entryVoid(tm, (y0 + y1) * 0.5)) continue;
        const variation = hash(edge, bay, course, 12), lit = hash(edge, bay, course, 71) > 0.86 ? 0.35 + variation * 0.65 : 0;
        quad(spandrels, point(t0, y0 + 0.025), point(t1, y0 + 0.025), point(t1, spandrelTop), point(t0, spandrelTop),
          tintMix([0.055, 0.075, 0.09], [0.15, 0.20, 0.23], variation * 0.55)); spandrelPanels++;
        if (louvre) {
          quad(spandrels, point(t0, spandrelTop), point(t1, spandrelTop), point(t1, y1 - 0.06), point(t0, y1 - 0.06),
            [0.035, 0.045, 0.052]);
          for (let s = 0; s < 5; s++) {
            const y = lerp(spandrelTop + 0.15, y1 - 0.18, s / 4);
            beam(louvres, point(t0, y, 0.17), point(t1, y, 0.17), 0.065, 0.22); louvreSlats++;
          }
          louvrePanels++;
        } else {
          quad(glass, point(t0, spandrelTop + 0.055), point(t1, spandrelTop + 0.055), point(t1, y1 - 0.09), point(t0, y1 - 0.09),
            tintMix([0.10, 0.17, 0.23], [0.24, 0.33, 0.39], 0.38 + variation * 0.34), lit); visionPanels++;
        }
      }
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays, t1 = (bay + 1) / bays;
        if (entryVoid((t0 + t1) * 0.5, (y0 + y1) * 0.5)) continue;
        beam(transoms, point(t0, y0, 0.12), point(t1, y0, 0.12), 0.065, 0.17);
        if (accentLevels.has(course)) {
          beam(accents, point(t0, y0 + 0.12, 0.22), point(t1, y0 + 0.12, 0.22), 0.11, 0.15); accentSegments++;
        }
      }
    }
  }
  for (const vertexIndex of CULLINAN_II_SIGNATURE_BLADE_VERTICES) {
    for (const [edge, t] of [[(vertexIndex + ring.length / 2 - 2) % (ring.length / 2 - 1), 1], [vertexIndex, 0]]) {
      for (let course = 0; course < CULLINAN_II_LEVELS; course++) {
        const y0 = cullinanIIFloorY(course), y1 = cullinanIIFloorY(course + 1);
        edgeBox(mullions, ring, edge, t, (y0 + y1) * 0.5, 0.24, 0.24, y1 - y0, 0.58);
        edgeBox(accents, ring, edge, t, (y0 + y1) * 0.5, 0.50, 0.065, y1 - y0, 0.075); accentSegments++;
      }
    }
  }
  return { glass, spandrels, mullions, transoms, louvres, accents, visionPanels, spandrelPanels, louvrePanels, louvreSlats, accentSegments };
}

function createCrown() {
  const ring = CULLINAN_II_TOWER_RING, glass = store(), roof = triangulatedRoof(ring.slice(0, -2), CULLINAN_II_CROWN_VERTEX_HEIGHTS, [0.12, 0.18, 0.22]);
  const fins = [], transoms = [], caps = [], accents = []; let panels = 0, finCount = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const ha = CULLINAN_II_CROWN_VERTEX_HEIGHTS[edge], hb = CULLINAN_II_CROWN_VERTEX_HEIGHTS[(edge + 1) % CULLINAN_II_CROWN_VERTEX_HEIGHTS.length];
    const { nx, nz, length } = cullinanIIEdgeOutward(ring, edge), bays = bayCount(length);
    const point = (t, y, offset = 0.06) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    for (let bay = 0; bay < bays; bay++) for (let row = 0; row < 4; row++) {
      const t0 = bay / bays + 0.001, t1 = (bay + 1) / bays - 0.001, r0 = row / 4, r1 = (row + 1) / 4;
      const ya0 = lerp(CULLINAN_II_VISUAL_WALL_TOP, ha, r0) + 0.04, yb0 = lerp(CULLINAN_II_VISUAL_WALL_TOP, hb, r0) + 0.04;
      const ya1 = lerp(CULLINAN_II_VISUAL_WALL_TOP, ha, r1) - 0.06, yb1 = lerp(CULLINAN_II_VISUAL_WALL_TOP, hb, r1) - 0.06;
      quad(glass, point(t0, ya0), point(t1, yb0), point(t1, yb1), point(t0, ya1),
        tintMix([0.075, 0.125, 0.17], [0.19, 0.27, 0.33], 0.35 + hash(edge, bay, row, 33) * 0.35), row === 1 && bay % 5 === 0 ? 0.05 : 0); panels++;
    }
    for (let bay = 0; bay <= bays; bay++) {
      const t = bay / bays, top = lerp(ha, hb, t), height = Math.max(0.04, top - CULLINAN_II_VISUAL_WALL_TOP);
      const major = bay % 4 === 0;
      edgeBox(fins, ring, edge, t, CULLINAN_II_VISUAL_WALL_TOP + height * 0.5, major ? 0.22 : 0.10,
        major ? 0.18 : 0.055, height, major ? 0.46 : 0.16); finCount++;
    }
    for (let row = 1; row <= 4; row++) {
      const ya = lerp(CULLINAN_II_VISUAL_WALL_TOP, ha, row / 4) - 0.08, yb = lerp(CULLINAN_II_VISUAL_WALL_TOP, hb, row / 4) - 0.08;
      beam(transoms, point(0, ya, 0.12), point(1, yb, 0.12), row === 4 ? 0.085 : 0.055, row === 4 ? 0.20 : 0.14);
    }
    beam(caps, point(0, ha - 0.38, 0.15), point(1, hb - 0.38, 0.15), 0.42, 0.55);
    beam(accents, point(0, ha - 0.12, 0.43), point(1, hb - 0.12, 0.43), 0.10, 0.10);
  }
  for (const vertexIndex of CULLINAN_II_SIGNATURE_BLADE_VERTICES) {
    const height = CULLINAN_II_CROWN_VERTEX_HEIGHTS[vertexIndex], edge = vertexIndex;
    for (let course = 0; course < 4; course++) {
      const y0 = lerp(CULLINAN_II_VISUAL_WALL_TOP, height, course / 4), y1 = lerp(CULLINAN_II_VISUAL_WALL_TOP, height, (course + 1) / 4);
      edgeBox(fins, ring, edge, 0, (y0 + y1) * 0.5, 0.28, 0.30, y1 - y0, 0.70); finCount++;
      edgeBox(accents, ring, edge, 0, (y0 + y1) * 0.5, 0.66, 0.075, y1 - y0, 0.08);
    }
  }
  return { glass, roof, fins, transoms, caps, accents, panels, finCount };
}

function addVerticalStrand(strands, beads, x, top, z, length, radius = 0.022, beadRadius = 0.075, spacing = 0.8) {
  const strand = new THREE.CylinderGeometry(radius, radius, length, 5); strand.translate(x, top - length * 0.5, z); strands.push(strand);
  for (let y = top - 0.15; y > top - length; y -= spacing) {
    const bead = new THREE.OctahedronGeometry(beadRadius, 0); bead.translate(x, y, z); beads.push(bead);
  }
}
function createWHotelAtrium(group, materials) {
  const atrium = new THREE.Group(); atrium.position.set(CULLINAN_II_W_ATRIUM.x, 0, CULLINAN_II_W_ATRIUM.z);
  atrium.rotation.y = CULLINAN_II_W_ATRIUM.ry; atrium.name = 'CullinanIIWestForecourt40mWHotelGlassAtrium'; group.add(atrium);
  const w = CULLINAN_II_GLASS_BOX_WIDTH, d = CULLINAN_II_GLASS_BOX_DEPTH, h = CULLINAN_II_GLASS_BOX_HEIGHT;
  const front = CULLINAN_II_GLASS_BOX_PROJECTION, back = front - d;
  const panes = store(), frames = [], columns = [], shelves = [], curtains = [], curtainBeads = [], wStrands = [], wBeads = [], wCore = [], lobby = [];
  let paneCount = 0;
  const pane = (a, b, c, d0) => { quad(panes, a, b, c, d0, [0.60, 0.76, 0.82]); paneCount++; };
  for (const z of [back, front]) for (let bay = 0; bay < 6; bay++) for (let row = 0; row < 10; row++) {
    const x0 = -w * 0.5 + bay * w / 6 + 0.045, x1 = -w * 0.5 + (bay + 1) * w / 6 - 0.045;
    const y0 = row * 4 + 0.06, y1 = (row + 1) * 4 - 0.06;
    pane([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]);
  }
  for (const x of [-w * 0.5, w * 0.5]) for (let bay = 0; bay < 2; bay++) for (let row = 0; row < 10; row++) {
    const z0 = back + bay * d / 2 + 0.045, z1 = back + (bay + 1) * d / 2 - 0.045;
    const y0 = row * 4 + 0.06, y1 = (row + 1) * 4 - 0.06;
    pane([x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]);
  }
  for (let bay = 0; bay <= 6; bay++) for (const z of [back, front]) box(frames, [-w * 0.5 + bay * w / 6, h * 0.5, z], [0.10, h, 0.14]);
  for (const x of [-w * 0.5, w * 0.5]) for (let bay = 0; bay <= 2; bay++) box(frames, [x, h * 0.5, back + bay * d / 2], [0.14, h, 0.10]);
  for (let row = 0; row <= 10; row++) {
    const y = Math.max(0.06, row * 4);
    for (const z of [back, front]) box(frames, [0, y, z], [w + 0.18, row === 10 ? 0.22 : 0.10, 0.14]);
    for (const x of [-w * 0.5, w * 0.5]) box(frames, [x, y, (front + back) * 0.5], [0.14, row === 10 ? 0.22 : 0.10, d]);
  }
  for (const x of [-9.4, 9.4]) for (const z of [back + 0.8, front - 0.8]) box(columns, [x, h * 0.5, z], [0.34, h, 0.34]);
  for (const y of [8, 16, 24, 32, 38]) {
    box(shelves, [0, y, front - 0.15], [w - 0.4, 0.10, 0.15]);
    for (const x of [-w * 0.5 + 0.15, w * 0.5 - 0.15]) box(shelves, [x, y, (front + back) * 0.5], [0.15, 0.10, d - 0.3]);
  }
  // The official W atrium has a dense, full-height sparkling field, not the North Tower's gold C.
  // Continue the strands below the W into the lobby instead of leaving an unlit black ground-floor void.
  for (let index = 0; index < 73; index++) {
    const x = -10.2 + index * 20.4 / 72, top = 38.0 - (index % 3) * 0.18;
    addVerticalStrand(curtains, curtainBeads, x, top, front - 2.2, 36.4 - (index % 4) * 0.35, 0.018, 0.065, 0.95);
  }
  for (const side of [-1, 1]) for (let index = 0; index < 10; index++) {
    addVerticalStrand(curtains, curtainBeads, side * 10.15, 37.2, back + 1.0 + index * 0.65, 35.6, 0.018, 0.065, 1.0);
  }
  const wPoints = [[-6.0, 29.0, front - 0.65], [-3.0, 16.0, front - 0.65], [0, 24.0, front - 0.65], [3.0, 16.0, front - 0.65], [6.0, 29.0, front - 0.65]];
  for (let segment = 0; segment < 4; segment++) {
    const a = wPoints[segment], b = wPoints[segment + 1]; beam(wCore, a, b, 0.11, 0.11);
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy), px = -dy / length, py = dx / length;
    for (let sample = 0; sample <= 28; sample++) for (const offset of [-0.24, 0, 0.24]) {
      const t = sample / 28, x = lerp(a[0], b[0], t) + px * offset, y = lerp(a[1], b[1], t) + py * offset;
      addVerticalStrand(wStrands, wBeads, x, y, front - 0.60 + offset * 0.15, 2.0 + 2.4 * hash(segment, sample, offset * 100, 8), 0.024, 0.09, 0.62);
    }
  }
  // A real enclosed lobby sits behind the crystal veil; the low stone rear wall and floor remain warm at night.
  box(lobby, [0, 0.08, (front + back) * 0.5], [w - 0.5, 0.16, d - 0.4]);
  box(lobby, [0, 2.6, back + 0.28], [w - 0.8, 5.2, 0.16]);
  meshStore(atrium, panes, materials.clearGlass, 'CullinanIIWAtriumIndividualTransparentPanes', false);
  merged(atrium, lobby, materials.lobbyStone, 'CullinanIIWHotelWarmLobbyStoneAndFloor');
  merged(atrium, frames, materials.silver, 'CullinanIIWAtriumUnitizedFrames');
  merged(atrium, columns, materials.silver, 'CullinanIIWAtriumInteriorColumns');
  merged(atrium, shelves, materials.warmLight, 'CullinanIIWAtriumWarmHorizontalLightShelves', false);
  merged(atrium, curtains, materials.crystal, 'CullinanIIWAtriumHangingCrystalStrands', false);
  merged(atrium, curtainBeads, materials.crystal, 'CullinanIIWAtriumCrystalBeadCurtain', false);
  merged(atrium, wStrands, materials.wCrystal, 'CullinanIIGiantWCrystalStrands', false);
  merged(atrium, wBeads, materials.wCrystal, 'CullinanIIGiantWCrystalPendants', false);
  merged(atrium, wCore, materials.wCrystal, 'CullinanIIGiantWVectorCore', false);

  const canopyGlass = [], canopyFrames = [], canopyPosts = [], lights = [], doors = [], doorFrames = [];
  const canopyPostXs = [-11, -6, 6, 11]; // Keep the glazed entrance and its approach clear of a centre post.
  for (let bay = 0; bay < 6; bay++) for (const z of [0.85, 2.55]) {
    box(canopyGlass, [-CULLINAN_II_W_CANOPY_WIDTH * 0.5 + (bay + 0.5) * CULLINAN_II_W_CANOPY_WIDTH / 6, CULLINAN_II_W_CANOPY_HEIGHT, z],
      [CULLINAN_II_W_CANOPY_WIDTH / 6 - 0.12, 0.055, 1.58]);
  }
  for (let bay = 0; bay <= 6; bay++) box(canopyFrames, [-CULLINAN_II_W_CANOPY_WIDTH * 0.5 + bay * CULLINAN_II_W_CANOPY_WIDTH / 6,
    CULLINAN_II_W_CANOPY_HEIGHT, 1.7], [0.10, 0.16, 3.4]);
  for (const z of [0, 1.7, CULLINAN_II_W_CANOPY_FRONT]) box(canopyFrames, [0, CULLINAN_II_W_CANOPY_HEIGHT, z], [CULLINAN_II_W_CANOPY_WIDTH, 0.18, 0.12]);
  for (const x of canopyPostXs) {
    const post = new THREE.CylinderGeometry(0.09, 0.09, CULLINAN_II_W_CANOPY_HEIGHT, 10); post.translate(x, CULLINAN_II_W_CANOPY_HEIGHT * 0.5, 2.8); canopyPosts.push(post);
    box(lights, [x, CULLINAN_II_W_CANOPY_HEIGHT - 0.15, 1.55], [1.15, 0.07, 0.16]);
  }
  box(lights, [0, CULLINAN_II_W_CANOPY_HEIGHT - 0.14, CULLINAN_II_W_CANOPY_FRONT - 0.08],
    [CULLINAN_II_W_CANOPY_WIDTH - 0.3, 0.07, 0.08]);
  for (const x of [-CULLINAN_II_W_CANOPY_WIDTH * 0.5 + 0.1, CULLINAN_II_W_CANOPY_WIDTH * 0.5 - 0.1]) {
    box(lights, [x, CULLINAN_II_W_CANOPY_HEIGHT - 0.14, 1.7], [0.08, 0.07, 3.2]);
  }
  box(doors, [0, 1.85, front + 0.04], [6.4, 3.7, 0.10]);
  for (const x of [-3.2, -1.6, 0, 1.6, 3.2]) box(doorFrames, [x, 1.85, front + 0.12], [0.09, 3.7, 0.12]);
  for (const y of [0.08, 3.7]) box(doorFrames, [0, y, front + 0.12], [6.5, 0.09, 0.12]);
  for (const x of [-0.18, 0.18]) box(doorFrames, [x, 1.55, front + 0.23], [0.045, 0.65, 0.07]);
  merged(atrium, canopyGlass, materials.clearGlass, 'CullinanIIWHotelFlatGlassDropOffCanopy', false);
  merged(atrium, canopyFrames, materials.silver, 'CullinanIIWHotelCanopyGridAndFascia');
  merged(atrium, canopyPosts, materials.silver, 'CullinanIIWHotelSlenderCanopyPosts');
  merged(atrium, lights, materials.warmLight, 'CullinanIIWHotelCanopyDownlights', false);
  merged(atrium, doors, materials.hotelEntrance, 'CullinanIIWHotelGlazedEntranceDoors');
  merged(atrium, doorFrames, materials.silver, 'CullinanIIWHotelDoorStilesAndHandles');

  const planters = [], foliage = [], totem = [], totemW = [];
  for (const x of [-9.4, 8.4]) {
    box(planters, [x, 0.34, 2.75], [3.4, 0.68, 0.95]);
    for (let index = 0; index < 5; index++) {
      const shrub = new THREE.SphereGeometry(0.48, 8, 6); shrub.scale(1, 0.82, 0.78); shrub.translate(x - 1.35 + index * 0.67, 0.92, 2.75); foliage.push(shrub);
    }
  }
  box(totem, [11.65, 1.45, 3.05], [1.15, 2.9, 0.46]);
  const smallW = [[-0.40, 2.25, 3.30], [-0.20, 1.55, 3.30], [0, 1.95, 3.30], [0.20, 1.55, 3.30], [0.40, 2.25, 3.30]]
    .map((point) => [point[0] + 11.65, point[1], point[2]]);
  for (let i = 0; i < 4; i++) beam(totemW, smallW[i], smallW[i + 1], 0.065, 0.065);
  merged(atrium, planters, materials.planter, 'CullinanIIWHotelStonePlanters');
  merged(atrium, foliage, materials.foliage, 'CullinanIIWHotelClippedGuestDropOffHedges');
  merged(atrium, totem, materials.planter, 'CullinanIIWHotelArrivalTotem');
  merged(atrium, totemW, materials.wCrystal, 'CullinanIIWHotelTotemWMark', false);
  localBox(atrium, materials.paving, 'CullinanIIWHotelForecourtStonePaving', [0, 0.06, 0.20], [26, 0.12, 6.4]);
  const joints = [];
  for (let x = -13; x <= 13; x += 2) box(joints, [x, 0.127, 0.20], [0.025, 0.018, 6.4]);
  for (let z = -3; z <= 3.4; z += 1.6) box(joints, [0, 0.127, z], [26, 0.018, 0.025]);
  merged(atrium, joints, materials.pavingJoint, 'CullinanIIWHotelPavingJoints', false);

  const colliders = [], cs = Math.cos(CULLINAN_II_W_ATRIUM.ry), sn = Math.sin(CULLINAN_II_W_ATRIUM.ry);
  const add = (x, z, w0, d0, minY, maxY, ry = CULLINAN_II_W_ATRIUM.ry) => {
    const p = { x: CULLINAN_II_W_ATRIUM.x + cs * x + sn * z, z: CULLINAN_II_W_ATRIUM.z - sn * x + cs * z };
    colliders.push(worldCollider(p.x, p.z, w0, d0, ry, minY, maxY));
  };
  add(0, front, w, 0.30, 0, h); add(0, back, w, 0.30, 0, h);
  for (const x of [-w * 0.5, w * 0.5]) add(x, (front + back) * 0.5, 0.30, d, 0, h);
  add(0, (front + back) * 0.5, w, d, h - 0.20, h + 0.20);
  for (const x of [-9.4, 9.4]) for (const z of [back + 0.8, front - 0.8]) add(x, z, 0.68, 0.68, 0, h);
  add(0, 1.7, CULLINAN_II_W_CANOPY_WIDTH, 3.5, CULLINAN_II_W_CANOPY_HEIGHT - 0.15, CULLINAN_II_W_CANOPY_HEIGHT + 0.18);
  for (const x of canopyPostXs) add(x, 2.8, 0.24, 0.24, 0, CULLINAN_II_W_CANOPY_HEIGHT);
  for (const x of [-9.4, 8.4]) add(x, 2.75, 3.4, 0.95, 0, 1.25);
  add(11.65, 3.05, 1.15, 0.46, 0, 2.9);
  return { colliders, paneCount, curtainStrands: curtains.length, curtainBeads: curtainBeads.length, wStrands: wStrands.length, wBeads: wBeads.length };
}

function createOsmLevelOneDoor(group, materials) {
  const door = new THREE.Group(); door.position.set(CULLINAN_II_OSM_DOOR_FRAME.x, 0, CULLINAN_II_OSM_DOOR_FRAME.z);
  door.rotation.y = CULLINAN_II_OSM_DOOR_FRAME.ry; door.name = 'CullinanIIOsmLevelOneIndoorDoor10703681997'; group.add(door);
  localBox(door, materials.entranceGlass, 'CullinanIIOsmDoorGlass', [0, 1.6, 0.13], [2.4, 3.2, 0.10]);
  const frames = [];
  for (const x of [-1.2, 0, 1.2]) box(frames, [x, 1.6, 0.20], [0.08, 3.2, 0.10]);
  for (const y of [0.06, 3.2]) box(frames, [0, y, 0.20], [2.5, 0.08, 0.10]);
  for (const x of [-0.15, 0.15]) box(frames, [x, 1.35, 0.28], [0.04, 0.55, 0.06]);
  merged(door, frames, materials.silver, 'CullinanIIOsmDoorStilesAndHandles');
}

export function buildCullinanII(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'CullinanIIAuthoredSouthTowerLandmark'; group.userData.internalId = 'HK-B0012';
  group.position.y = groundOffset; root.add(group);
  const materials = {
    glass: new THREE.MeshStandardNodeMaterial({ metalness: 0.66, roughness: 0.17, envMapIntensity: 1.15, side: THREE.DoubleSide }),
    spandrel: new THREE.MeshStandardNodeMaterial({ metalness: 0.58, roughness: 0.30, side: THREE.DoubleSide }),
    silver: new THREE.MeshStandardNodeMaterial({ color: 0xa7b1b6, metalness: 0.82, roughness: 0.26 }),
    darkSteel: new THREE.MeshStandardNodeMaterial({ color: 0x20282e, metalness: 0.64, roughness: 0.42 }),
    roof: new THREE.MeshStandardNodeMaterial({ metalness: 0.60, roughness: 0.32, side: THREE.DoubleSide }),
    accent: new THREE.MeshStandardNodeMaterial({ color: 0xa5b9c7, metalness: 0.70, roughness: 0.25 }),
    clearGlass: new THREE.MeshStandardNodeMaterial({ color: 0xa6bdc5, transparent: true, opacity: 0.10, depthWrite: false,
      metalness: 0.05, roughness: 0.08, side: THREE.DoubleSide }),
    entranceGlass: new THREE.MeshStandardNodeMaterial({ color: 0x6e8b96, metalness: 0.32, roughness: 0.18, side: THREE.DoubleSide }),
    hotelEntrance: new THREE.MeshStandardNodeMaterial({ color: 0x8c6b4a, metalness: 0.25, roughness: 0.22, side: THREE.DoubleSide }),
    crystal: new THREE.MeshStandardNodeMaterial({ color: 0xc6b895, metalness: 0.42, roughness: 0.22 }),
    wCrystal: new THREE.MeshStandardNodeMaterial({ color: 0xe6d9b8, metalness: 0.25, roughness: 0.18 }),
    warmLight: new THREE.MeshStandardNodeMaterial({ color: 0xc7b28a, roughness: 0.40 }),
    lobbyStone: new THREE.MeshStandardNodeMaterial({ color: 0x8c8270, roughness: 0.72, metalness: 0.04 }),
    stone: new THREE.MeshStandardNodeMaterial({ color: 0xd5d1c5, roughness: 0.78, metalness: 0.02 }),
    paving: new THREE.MeshStandardNodeMaterial({ color: 0x9b9d98, roughness: 0.92 }),
    pavingJoint: new THREE.MeshStandardNodeMaterial({ color: 0x555b5c, roughness: 0.92 }),
    planter: new THREE.MeshStandardNodeMaterial({ color: 0x353b3b, roughness: 0.72, metalness: 0.12 }),
    foliage: new THREE.MeshStandardNodeMaterial({ color: 0x284b35, roughness: 0.92 })
  };
  for (const key of ['glass', 'spandrel', 'roof']) materials[key].colorNode = attribute('color', 'vec3');
  materials.glass.emissiveNode = color(0x244b78).mul(nightAmount()).mul(0.20)
    .add(color(0xffd5a0).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.58));
  materials.accent.emissiveNode = color(0xa9d7ff).mul(nightAmount()).mul(2.0);
  materials.crystal.emissiveNode = color(0xffd8a3).mul(nightAmount().mul(0.55).add(0.015));
  materials.wCrystal.emissiveNode = color(0xffe0a8).mul(nightAmount().mul(1.25).add(0.055));
  materials.warmLight.emissiveNode = color(0xffd49a).mul(nightAmount().mul(2.40).add(0.02));
  materials.lobbyStone.emissiveNode = color(0xffd2a0).mul(nightAmount().mul(0.16).add(0.005));
  materials.hotelEntrance.emissiveNode = color(0xffc78d).mul(nightAmount().mul(0.48).add(0.01));
  materials.clearGlass.emissiveNode = color(0xffd9aa).mul(nightAmount()).mul(0.022);

  const tower = new THREE.Group(); tower.position.set(CULLINAN_II_SITE.x, 0, CULLINAN_II_SITE.z); tower.rotation.y = CULLINAN_II_SITE.ry;
  tower.name = 'CullinanIIExactSourcePlanAndSteppedAngularCrown'; group.add(tower);
  const facade = createCurtainWall();
  meshStore(tower, facade.glass, materials.glass, 'CullinanIIBlueSilverUnitizedVisionGlass');
  meshStore(tower, facade.spandrels, materials.spandrel, 'CullinanIIReflectiveSpandrelsAndGraphiteBelts');
  merged(tower, facade.mullions, materials.silver, 'CullinanIIContinuousVerticalAluminiumFinsAndSignatureBlades');
  merged(tower, facade.transoms, materials.silver, 'CullinanIIUnitizedHorizontalTransoms');
  merged(tower, facade.louvres, materials.darkSteel, 'CullinanIIThreeVisualGraphiteLouvreBelts');
  merged(tower, facade.accents, materials.accent, 'CullinanIIHorizontalCoolWhiteAccentLines', false);
  const crown = createCrown();
  meshStore(tower, crown.glass, materials.glass, 'CullinanIIFoldedAngularCrownGlazing');
  merged(tower, crown.fins, materials.silver, 'CullinanIICrownFinsAndSignatureVerticalBlades');
  merged(tower, crown.transoms, materials.silver, 'CullinanIICrownSlopingTransoms');
  merged(tower, crown.caps, materials.silver, 'CullinanIIAngularCrownMetalCopings');
  merged(tower, crown.accents, materials.accent, 'CullinanIICrownAndVerticalBladeNightOutlines', false);
  meshStore(tower, crown.roof, materials.roof, 'CullinanIIFoldedCrownRoofPlanes');
  const atrium = createWHotelAtrium(group, materials);
  createOsmLevelOneDoor(group, materials);

  const entryHalfVoid = CULLINAN_II_GLASS_BOX_WIDTH * 0.5 / cullinanIIEdgeOutward(CULLINAN_II_TOWER_RING, CULLINAN_II_W_ATRIUM.edge).length;
  const colliders = [
    ...cullinanIIRingColliders(CULLINAN_II_TOWER_RING, 0, CULLINAN_II_GLASS_BOX_HEIGHT, 0.85, [CULLINAN_II_W_ATRIUM.edge]),
    cullinanIIEdgeCollider(CULLINAN_II_TOWER_RING, CULLINAN_II_W_ATRIUM.edge, 0, 0.5 - entryHalfVoid, 0, CULLINAN_II_GLASS_BOX_HEIGHT),
    cullinanIIEdgeCollider(CULLINAN_II_TOWER_RING, CULLINAN_II_W_ATRIUM.edge, 0.5 + entryHalfVoid, 1, 0, CULLINAN_II_GLASS_BOX_HEIGHT),
    ...cullinanIIRingColliders(CULLINAN_II_TOWER_RING, CULLINAN_II_GLASS_BOX_HEIGHT, CULLINAN_II_VISUAL_WALL_TOP),
    ...Array.from({ length: CULLINAN_II_TOWER_RING.length / 2 - 1 }, (_, edge) => cullinanIIEdgeCollider(CULLINAN_II_TOWER_RING, edge, 0, 1,
      CULLINAN_II_VISUAL_WALL_TOP, Math.max(CULLINAN_II_CROWN_VERTEX_HEIGHTS[edge],
        CULLINAN_II_CROWN_VERTEX_HEIGHTS[(edge + 1) % CULLINAN_II_CROWN_VERTEX_HEIGHTS.length]), 0.85)),
    ...atrium.colliders
  ];
  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }
  const landmark = { name: CULLINAN_II_SITE.name, englishName: CULLINAN_II_SITE.englishName,
    position: { x: CULLINAN_II_SITE.x, y: groundOffset, z: CULLINAN_II_SITE.z }, radius: 82, height: CULLINAN_II_TO_TIP_HEIGHT };
  const stats = {
    cullinanIIGroundOffset: groundOffset, cullinanIILandmarks: 1,
    cullinanIIOsmHeight: CULLINAN_II_OSM_HEIGHT, cullinanIIOfficialApproxHeight: CULLINAN_II_OFFICIAL_APPROX_HEIGHT,
    cullinanIIHeight: CULLINAN_II_HEIGHT, cullinanIIToTipHeight: CULLINAN_II_TO_TIP_HEIGHT,
    cullinanIIOsmLevels: CULLINAN_II_OSM_LEVELS, cullinanIILevels: CULLINAN_II_LEVELS,
    cullinanIIBelowGroundLevels: CULLINAN_II_BELOW_GROUND_LEVELS, cullinanIIOsmStartDate: CULLINAN_II_OSM_START_DATE,
    cullinanIICompletedYear: CULLINAN_II_COMPLETED_YEAR, cullinanIISourceVertices: CULLINAN_II_SITE.localRing.length / 2,
    cullinanIIOsmWayVersion: CULLINAN_II_OSM_SOURCE.version, cullinanIIOsmDoorNode: CULLINAN_II_OSM_DOOR.id,
    cullinanIIVisionPanels: facade.visionPanels, cullinanIISpandrelPanels: facade.spandrelPanels,
    cullinanIILouvrePanels: facade.louvrePanels, cullinanIILouvreSlats: facade.louvreSlats,
    cullinanIIVerticalFins: facade.mullions.length + crown.finCount, cullinanIIAccentSegments: facade.accentSegments + crown.accents.length,
    cullinanIICrownPanels: crown.panels, cullinanIIGlassBoxHeight: CULLINAN_II_GLASS_BOX_HEIGHT,
    cullinanIIGlassBoxPanes: atrium.paneCount, cullinanIIAtriumCrystalStrands: atrium.curtainStrands,
    cullinanIIAtriumCrystalBeads: atrium.curtainBeads, cullinanIIGiantWStrands: atrium.wStrands,
    cullinanIIGiantWBeads: atrium.wBeads, cullinanIIWHotelCanopies: 1, cullinanIIColliders: colliders.length
  };
  group.userData.stats = stats;
  return { group, colliders, landmarks: [landmark], stats, groundOffset, plazaTop: groundOffset + CULLINAN_II_PLAZA_TOP };
}
