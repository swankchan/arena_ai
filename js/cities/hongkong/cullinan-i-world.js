import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  CULLINAN_I_SITE, CULLINAN_I_TOWER_RING, CULLINAN_I_OSM_HEIGHT, CULLINAN_I_OFFICIAL_APPROX_HEIGHT,
  CULLINAN_I_HEIGHT, CULLINAN_I_TO_TIP_HEIGHT, CULLINAN_I_OSM_LEVELS, CULLINAN_I_LEVELS,
  CULLINAN_I_BELOW_GROUND_LEVELS, CULLINAN_I_OSM_START_DATE, CULLINAN_I_COMPLETED_YEAR,
  CULLINAN_I_VISUAL_WALL_TOP, CULLINAN_I_PANEL_TARGET_WIDTH, CULLINAN_I_VISUAL_LOUVRE_LEVELS,
  CULLINAN_I_ACCENT_LEVELS, CULLINAN_I_PLAZA_TOP, CULLINAN_I_GLASS_BOX_HEIGHT,
  CULLINAN_I_GLASS_BOX_WIDTH, CULLINAN_I_GLASS_BOX_DEPTH, CULLINAN_I_GLASS_BOX_PROJECTION,
  CULLINAN_I_DROP_OFF_HEIGHT, CULLINAN_I_CROWN_VERTEX_HEIGHTS, CULLINAN_I_SIGNATURE_BLADE_VERTICES,
  CULLINAN_I_ENTRANCE, CULLINAN_I_DROP_OFF, cullinanIFloorY, cullinanIEdgeOutward,
  cullinanIRingColliders, cullinanIEdgeCollider
} from './cullinan-i-architecture.js';

const lerp = (a, b, t) => a + (b - a) * t;
const hash = (a, b, c = 0, d = 0) => { const v = Math.sin(a * 127.1 + b * 311.7 + c * 73.7 + d * 19.19) * 43758.5453; return v - Math.floor(v); };
const nightAmount = () => smoothstep(0.55, 1.4, cityUniforms.uInteriorGlow);
const tintMix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
function store() { return { positions: [], colors: [], lit: [] }; }
function vertex(s, p, tint, lit = 0) { s.positions.push(...p); s.colors.push(...tint); s.lit.push(lit); }
function quad(s, a, b, c, d, tint, lit = 0) { for (const i of [0, 1, 2, 0, 2, 3]) vertex(s, [a, b, c, d][i], tint, lit); }
function triangle(s, a, b, c, tint) { for (const p of [a, b, c]) vertex(s, p, tint); }
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
  if (parts.length > 1) for (const part of parts) part.dispose(); g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, material); mesh.name = name; mesh.frustumCulled = false; mesh.castShadow = shadows;
  mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function box(parts, position, size) { const g = new THREE.BoxGeometry(...size); g.translate(...position); parts.push(g); return g; }
function localBox(group, material, name, position, size) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.position.set(...position); mesh.name = name;
  mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function beam(parts, a, b, thickness = 0.12, depth = thickness) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
  const length = direction.length(); if (length < 1e-6) return;
  const g = new THREE.BoxGeometry(thickness, length, depth);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  g.translate((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5); parts.push(g);
}
function edgeBox(parts, ring, edge, t, y, offset, width, height, depth) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const { nx, nz, ry } = cullinanIEdgeOutward(ring, edge), g = new THREE.BoxGeometry(width, height, depth);
  g.rotateY(ry); g.translate(lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset); parts.push(g);
}
function bayCount(length) { return Math.max(1, Math.round(length / CULLINAN_I_PANEL_TARGET_WIDTH)); }
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
  const ring = CULLINAN_I_TOWER_RING, glass = store(), spandrels = store();
  const mullions = [], transoms = [], louvres = [], accents = [];
  const louvreLevels = new Set(CULLINAN_I_VISUAL_LOUVRE_LEVELS), accentLevels = new Set(CULLINAN_I_ACCENT_LEVELS);
  let visionPanels = 0, spandrelPanels = 0, louvrePanels = 0, louvreSlats = 0, accentSegments = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = cullinanIEdgeOutward(ring, edge), bays = bayCount(length);
    const point = (t, y, offset = 0.055) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    const entryVoid = (t, y) => edge === CULLINAN_I_ENTRANCE.edge && y < CULLINAN_I_GLASS_BOX_HEIGHT
      && Math.abs((t - 0.5) * length) < CULLINAN_I_GLASS_BOX_WIDTH * 0.5;
    for (let bay = 0; bay <= bays; bay++) {
      const t = bay / bays, major = bay % 4 === 0 || length < 3;
      const bottom = entryVoid(t, 0) && Math.abs((t - 0.5) * length) < CULLINAN_I_GLASS_BOX_WIDTH * 0.5 - 0.2
        ? CULLINAN_I_GLASS_BOX_HEIGHT : 0;
      edgeBox(mullions, ring, edge, t, (bottom + CULLINAN_I_VISUAL_WALL_TOP) * 0.5, major ? 0.22 : 0.12,
        major ? 0.18 : 0.075, CULLINAN_I_VISUAL_WALL_TOP - bottom, major ? 0.48 : 0.24);
    }
    for (let level = 1; level <= CULLINAN_I_LEVELS; level++) {
      const y0 = cullinanIFloorY(level - 1), y1 = cullinanIFloorY(level), isLouvre = louvreLevels.has(level);
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + 0.00065, t1 = (bay + 1) / bays - 0.00065, middle = (t0 + t1) * 0.5;
        if (entryVoid(middle, y0)) continue;
        if (isLouvre) {
          quad(spandrels, point(t0, y0 + 0.05), point(t1, y0 + 0.05), point(t1, y1 - 0.05), point(t0, y1 - 0.05),
            tintMix([0.018, 0.025, 0.031], [0.055, 0.068, 0.076], hash(edge, level, bay))); louvrePanels++;
        } else {
          const spandrelTop = y0 + Math.min(0.76, (y1 - y0) * 0.24);
          quad(spandrels, point(t0, y0 + 0.04), point(t1, y0 + 0.04), point(t1, spandrelTop), point(t0, spandrelTop),
            tintMix([0.045, 0.071, 0.091], [0.16, 0.22, 0.26], hash(level, edge, bay, 3))); spandrelPanels++;
          const variation = hash(level + 17, edge + 29, bay + 43);
          const lit = variation > 0.855 ? 0.09 + hash(bay, level, edge, 71) * 0.30 : 0;
          quad(glass, point(t0, spandrelTop + 0.055), point(t1, spandrelTop + 0.055), point(t1, y1 - 0.09), point(t0, y1 - 0.09),
            tintMix([0.11, 0.18, 0.23], [0.23, 0.32, 0.38], 0.40 + variation * 0.30), lit); visionPanels++;
        }
      }
      const strips = isLouvre ? [y0 + 0.05, y1 - 0.05] : [y0 + 0.04, y0 + Math.min(0.76, (y1 - y0) * 0.24) + 0.03, y1 - 0.06];
      for (const y of strips) {
        if (edge === CULLINAN_I_ENTRANCE.edge && y < CULLINAN_I_GLASS_BOX_HEIGHT) {
          const half = CULLINAN_I_GLASS_BOX_WIDTH * 0.5 / length;
          for (const [t0, t1] of [[0, 0.5 - half], [0.5 + half, 1]]) {
            edgeBox(transoms, ring, edge, (t0 + t1) * 0.5, y, 0.13, (t1 - t0) * length, 0.07, 0.22);
          }
        } else edgeBox(transoms, ring, edge, 0.5, y, 0.13, length, 0.07, 0.22);
      }
      if (isLouvre) {
        for (let slat = 0; slat < 9; slat++) {
          const y = y0 + (slat + 0.5) * (y1 - y0) / 9;
          edgeBox(louvres, ring, edge, 0.5, y, 0.18, length, 0.105, 0.30); louvreSlats++;
        }
      }
      if (accentLevels.has(level)) {
        edgeBox(accents, ring, edge, 0.5, y1 - 0.04, 0.30, length, 0.09, 0.11); accentSegments++;
      }
    }
  }
  return { glass, spandrels, mullions, transoms, louvres, accents,
    visionPanels, spandrelPanels, louvrePanels, louvreSlats, accentSegments };
}

function createCrown() {
  const ring = CULLINAN_I_TOWER_RING, glass = store(), fins = [], transoms = [], caps = [], accents = [];
  let panels = 0, finCount = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = cullinanIEdgeOutward(ring, edge), bays = bayCount(length);
    const ha = CULLINAN_I_CROWN_VERTEX_HEIGHTS[edge],
      hb = CULLINAN_I_CROWN_VERTEX_HEIGHTS[(edge + 1) % CULLINAN_I_CROWN_VERTEX_HEIGHTS.length];
    const point = (t, y, offset = 0.06) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays + 0.00065, t1 = (bay + 1) / bays - 0.00065;
      const top0 = lerp(ha, hb, t0), top1 = lerp(ha, hb, t1);
      for (let row = 0; row < 4; row++) {
        const a0 = lerp(CULLINAN_I_VISUAL_WALL_TOP, top0, row / 4), a1 = lerp(CULLINAN_I_VISUAL_WALL_TOP, top0, (row + 1) / 4);
        const b0 = lerp(CULLINAN_I_VISUAL_WALL_TOP, top1, row / 4), b1 = lerp(CULLINAN_I_VISUAL_WALL_TOP, top1, (row + 1) / 4);
        quad(glass, point(t0, a0 + 0.04), point(t1, b0 + 0.04), point(t1, b1 - 0.04), point(t0, a1 - 0.04),
          tintMix([0.08, 0.13, 0.17], [0.20, 0.28, 0.33], 0.35 + hash(edge, bay, row, 91) * 0.35), row === 1 && bay % 5 === 0 ? 0.055 : 0); panels++;
      }
    }
    for (let bay = 0; bay <= bays; bay++) {
      const t = bay / bays, top = lerp(ha, hb, t), height = Math.max(0.08, top - CULLINAN_I_VISUAL_WALL_TOP);
      const major = bay % 4 === 0;
      edgeBox(fins, ring, edge, t, CULLINAN_I_VISUAL_WALL_TOP + height * 0.5, major ? 0.22 : 0.10,
        major ? 0.18 : 0.055, height, major ? 0.46 : 0.16); finCount++;
    }
    for (let row = 0; row <= 4; row++) {
      const inset = row === 4 ? 0.18 : 0;
      const ya = lerp(CULLINAN_I_VISUAL_WALL_TOP, ha, row / 4) - inset,
        yb = lerp(CULLINAN_I_VISUAL_WALL_TOP, hb, row / 4) - inset;
      beam(transoms, point(0, ya, 0.12), point(1, yb, 0.12), row === 4 ? 0.085 : 0.055, row === 4 ? 0.20 : 0.14);
    }
    beam(caps, point(0, ha - 0.38, 0.15), point(1, hb - 0.38, 0.15), 0.42, 0.55);
    beam(accents, point(0, ha - 0.12, 0.39), point(1, hb - 0.12, 0.39), 0.10, 0.10);
  }
  for (const vertex of CULLINAN_I_SIGNATURE_BLADE_VERTICES) {
    const edge = vertex, top = CULLINAN_I_CROWN_VERTEX_HEIGHTS[vertex], i = edge * 2;
    const { nx, nz } = cullinanIEdgeOutward(ring, edge);
    edgeBox(fins, ring, edge, 0, top * 0.5, 0.30, 0.34, top, 0.72); finCount++;
    beam(accents, [ring[i] + nx * 0.68, 0.15, ring[i + 1] + nz * 0.68],
      [ring[i] + nx * 0.68, top - 0.15, ring[i + 1] + nz * 0.68], 0.105, 0.105);
  }
  return { glass, fins, transoms, caps, accents, panels, finCount,
    roof: triangulatedRoof(ring.slice(0, -2), CULLINAN_I_CROWN_VERTEX_HEIGHTS, [0.12, 0.16, 0.19]) };
}

function cullinanEmblem() {
  const outer = 5.8, inner = 4.45, start = Math.PI * 0.25, end = Math.PI * 1.75, shape = new THREE.Shape();
  shape.absarc(0, 0, outer, start, end, false); shape.lineTo(Math.cos(end) * inner, Math.sin(end) * inner);
  shape.absarc(0, 0, inner, end, start, true); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.34, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.06, bevelSegments: 2, curveSegments: 40 });
  g.translate(0, 22, CULLINAN_I_GLASS_BOX_PROJECTION - 0.72); return g;
}

function createGlassBoxEntrance(group, materials) {
  const entrance = new THREE.Group(); entrance.position.set(CULLINAN_I_ENTRANCE.x, 0, CULLINAN_I_ENTRANCE.z);
  entrance.rotation.y = CULLINAN_I_ENTRANCE.ry; entrance.name = 'CullinanINorthTower40mServicedApartmentsGlassBox'; group.add(entrance);
  const panes = [], frames = [], columns = [], lights = [], paving = [], joints = [];
  const w = CULLINAN_I_GLASS_BOX_WIDTH, d = CULLINAN_I_GLASS_BOX_DEPTH, front = CULLINAN_I_GLASS_BOX_PROJECTION, back = front - d;
  const h = CULLINAN_I_GLASS_BOX_HEIGHT, rows = 5, columnsAcross = 5, sideBays = 2;
  let paneCount = 0;
  for (let row = 0; row < rows; row++) {
    const y = (row + 0.5) * h / rows;
    for (let bay = 0; bay < columnsAcross; bay++) {
      const x = -w * 0.5 + (bay + 0.5) * w / columnsAcross;
      box(panes, [x, y, front], [w / columnsAcross - 0.10, h / rows - 0.10, 0.055]); paneCount++;
      box(panes, [x, y, back], [w / columnsAcross - 0.10, h / rows - 0.10, 0.055]); paneCount++;
    }
    for (const x of [-w * 0.5, w * 0.5]) for (let bay = 0; bay < sideBays; bay++) {
      const z = back + (bay + 0.5) * d / sideBays;
      box(panes, [x, y, z], [0.055, h / rows - 0.10, d / sideBays - 0.10]); paneCount++;
    }
  }
  box(panes, [0, h, (front + back) * 0.5], [w - 0.10, 0.055, d - 0.10]); paneCount++;
  for (let bay = 0; bay <= columnsAcross; bay++) {
    const x = -w * 0.5 + bay * w / columnsAcross;
    for (const z of [front + 0.045, back - 0.045]) box(frames, [x, h * 0.5, z], [0.12, h, 0.14]);
  }
  for (const x of [-w * 0.5, w * 0.5]) for (let bay = 0; bay <= sideBays; bay++) {
    const z = back + bay * d / sideBays; box(frames, [x, h * 0.5, z], [0.14, h, 0.12]);
  }
  for (let row = 0; row <= rows; row++) {
    const y = row === 0 ? 0.06 : row * h / rows;
    for (const z of [front + 0.05, back - 0.05]) box(frames, [0, y, z], [w, 0.12, 0.14]);
    for (const x of [-w * 0.5, w * 0.5]) box(frames, [x, y, (front + back) * 0.5], [0.14, 0.12, d]);
    if (row > 0 && row < rows) box(lights, [0, y - 0.16, back + 0.22], [w - 1.0, 0.08, 0.12]);
  }
  for (const x of [-8.7, 8.7]) for (const z of [back + 0.75, front - 0.75]) {
    const g = new THREE.CylinderGeometry(0.30, 0.34, h - 0.25, 12); g.translate(x, h * 0.5, z); columns.push(g);
  }
  for (const x of [-2, 0, 2]) box(frames, [x, 2.4, front + 0.11], [0.10, 4.8, 0.12]);
  box(frames, [0, 4.8, front + 0.11], [4.1, 0.10, 0.12]);
  for (const x of [-0.24, 0.24]) box(frames, [x, 2.25, front + 0.22], [0.055, 1.25, 0.08]);
  box(paving, [0, CULLINAN_I_PLAZA_TOP * 0.5, (front + back) * 0.5], [28, CULLINAN_I_PLAZA_TOP, 7.4]);
  for (let x = -14; x <= 14; x += 2) box(joints, [x, CULLINAN_I_PLAZA_TOP + 0.006, (front + back) * 0.5], [0.022, 0.008, 7.4]);
  for (let z = back; z <= front; z += 1.8) box(joints, [0, CULLINAN_I_PLAZA_TOP + 0.006, z], [28, 0.008, 0.022]);
  merged(entrance, panes, materials.clearGlass, 'CullinanI40mGlassBoxIndividualTransparentPanes', false);
  merged(entrance, frames, materials.silver, 'CullinanIGlassBoxUnitizedFramesAndDoorHandles');
  merged(entrance, columns, materials.stone, 'CullinanIGlassBoxInteriorColumns');
  merged(entrance, lights, materials.warmLight, 'CullinanIGlassBoxWarmInteriorLightShelves', false);
  merged(entrance, paving, materials.paving, 'CullinanIWestForecourtStonePaving');
  merged(entrance, joints, materials.pavingJoint, 'CullinanIWestForecourtPavingJoints', false);
  const emblem = new THREE.Mesh(cullinanEmblem(), materials.gold); emblem.name = 'CullinanIGoldCAtriumEmblem';
  emblem.castShadow = true; entrance.add(emblem);

  const colliders = [], cs = Math.cos(CULLINAN_I_ENTRANCE.ry), sn = Math.sin(CULLINAN_I_ENTRANCE.ry);
  const add = (x, z, w0, d0, minY, maxY) => {
    const p = { x: CULLINAN_I_ENTRANCE.x + cs * x + sn * z, z: CULLINAN_I_ENTRANCE.z - sn * x + cs * z };
    colliders.push(worldCollider(p.x, p.z, w0, d0, CULLINAN_I_ENTRANCE.ry, minY, maxY));
  };
  add(0, front, w, 0.30, 0, h); add(0, back, w, 0.30, 0, h);
  for (const x of [-w * 0.5, w * 0.5]) add(x, (front + back) * 0.5, 0.30, d, 0, h);
  add(0, (front + back) * 0.5, w, d, h - 0.20, h + 0.20);
  for (const x of [-8.7, 8.7]) for (const z of [back + 0.75, front - 0.75]) add(x, z, 0.68, 0.68, 0, h);
  return { colliders, paneCount };
}

function createCoveredDropOff(group, materials) {
  const arrival = new THREE.Group(); arrival.position.set(CULLINAN_I_DROP_OFF.x, 0, CULLINAN_I_DROP_OFF.z);
  arrival.rotation.y = CULLINAN_I_DROP_OFF.ry; arrival.name = 'CullinanIBetweenTowersDoubleHeightCoveredDropOff'; group.add(arrival);
  const columns = [], upperRibs = [], lowerFrames = [], lowerGlass = [], doors = [], doorFrames = [], lights = [], waveLines = [];
  for (const x of [-9, -3, 3, 9]) {
    const g = new THREE.CylinderGeometry(0.48, 0.54, CULLINAN_I_DROP_OFF_HEIGHT, 16);
    g.translate(x, CULLINAN_I_DROP_OFF_HEIGHT * 0.5, 3.8); columns.push(g);
    const base = new THREE.CylinderGeometry(0.68, 0.68, 0.30, 16); base.translate(x, 0.15, 3.8); columns.push(base);
  }
  const canopy = store(), segments = 16;
  const canopyPoint = (x, t) => {
    const bow = 1 - (x / 12) ** 2, outer = 5.3 + bow * 1.4;
    return [x, lerp(8.85, 9.75 + bow * 0.50, t), lerp(0.35, outer, t)];
  };
  for (let segment = 0; segment < segments; segment++) {
    const x0 = -12 + segment * 24 / segments, x1 = -12 + (segment + 1) * 24 / segments;
    quad(canopy, canopyPoint(x0, 0), canopyPoint(x1, 0), canopyPoint(x1, 1), canopyPoint(x0, 1),
      tintMix([0.32, 0.35, 0.36], [0.65, 0.67, 0.65], segment / segments));
    beam(upperRibs, canopyPoint(x0, 0), canopyPoint(x0, 1), 0.15, 0.20);
    beam(upperRibs, canopyPoint(x0, 1), canopyPoint(x1, 1), 0.32, 0.38);
  }
  beam(upperRibs, canopyPoint(12, 0), canopyPoint(12, 1), 0.15, 0.20);
  for (let x = -12; x <= 12; x += 4) {
    box(lowerFrames, [x, 5.05, 3.8], [0.10, 0.12, 6.4]);
    beam(lowerFrames, [x, 5.15, 6.7], [x, 8.9, 3.8], 0.075, 0.075);
  }
  for (const z of [0.6, 3.8, 7.0]) box(lowerFrames, [0, 5.05, z], [24, 0.12, 0.10]);
  for (let x = -10; x <= 10; x += 4) for (const z of [2.2, 5.4]) {
    box(lowerGlass, [x, 5.08, z], [3.88, 0.055, 3.08]);
  }
  box(doors, [0, 2.35, 0.16], [8.2, 4.7, 0.10]);
  for (const x of [-4.1, -2.05, 0, 2.05, 4.1]) box(doorFrames, [x, 2.35, 0.24], [0.10, 4.7, 0.12]);
  for (const y of [0.08, 4.7]) box(doorFrames, [0, y, 0.24], [8.3, 0.10, 0.12]);
  for (const x of [-9, -3, 3, 9]) {
    box(lights, [x, 8.72, 2.4], [1.3, 0.08, 0.18]);
    box(lights, [x, 4.88, 5.8], [1.3, 0.08, 0.18]);
  }
  merged(arrival, columns, materials.stone, 'CullinanIDropOffPaleCylindricalColumns');
  meshStore(arrival, canopy, materials.canopy, 'CullinanIDropOffSweptMetalUpperCanopy');
  merged(arrival, upperRibs, materials.silver, 'CullinanIDropOffCurvedCanopyRibs');
  merged(arrival, lowerFrames, materials.silver, 'CullinanIDropOffGlassCanopyGridAndSuspension');
  merged(arrival, lowerGlass, materials.clearGlass, 'CullinanIDropOffFlatGlassCanopyPanes', false);
  merged(arrival, doors, materials.entranceGlass, 'CullinanIDropOffGlazedDoors');
  merged(arrival, doorFrames, materials.silver, 'CullinanIDropOffDoorStiles');
  merged(arrival, lights, materials.warmLight, 'CullinanIDropOffWarmSoffitLights', false);
  localBox(arrival, materials.dropOffPaving, 'CullinanIDropOffProceduralWaveStonePaving', [0, 0.06, 3.35], [26, 0.12, 7.7]);
  for (let row = 0; row < 13; row++) for (let segment = 0; segment < 18; segment++) {
    const x0 = -13 + segment * 26 / 18, x1 = -13 + (segment + 1) * 26 / 18;
    const waveZ = (x) => -0.20 + row * 0.58 + Math.sin((x + 13) / 26 * Math.PI * 4 + row * 0.8) * 0.16;
    beam(waveLines, [x0, 0.135, waveZ(x0)], [x1, 0.135, waveZ(x1)], 0.026, 0.026);
  }
  merged(arrival, waveLines, materials.pavingJoint, 'CullinanIDropOffWavePavingJoints', false);

  const colliders = [], cs = Math.cos(CULLINAN_I_DROP_OFF.ry), sn = Math.sin(CULLINAN_I_DROP_OFF.ry);
  const add = (x, z, w, d, minY, maxY) => {
    const p = { x: CULLINAN_I_DROP_OFF.x + cs * x + sn * z, z: CULLINAN_I_DROP_OFF.z - sn * x + cs * z };
    colliders.push(worldCollider(p.x, p.z, w, d, CULLINAN_I_DROP_OFF.ry, minY, maxY));
  };
  for (const x of [-9, -3, 3, 9]) add(x, 3.8, 1.10, 1.10, 0, CULLINAN_I_DROP_OFF_HEIGHT);
  add(0, 3.5, 24.5, 7.0, 8.65, 10.45); add(0, 3.8, 24.2, 6.6, 4.90, 5.25); add(0, 0.16, 8.3, 0.30, 0, 4.8);
  return colliders;
}

export function buildCullinanI(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'CullinanIAuthoredNorthTowerLandmark'; group.userData.internalId = 'HK-B0011';
  group.position.y = groundOffset; root.add(group);
  const materials = {
    glass: new THREE.MeshStandardNodeMaterial({ metalness: 0.68, roughness: 0.18, envMapIntensity: 1.15, side: THREE.DoubleSide }),
    spandrel: new THREE.MeshStandardNodeMaterial({ metalness: 0.58, roughness: 0.30, side: THREE.DoubleSide }),
    silver: new THREE.MeshStandardNodeMaterial({ color: 0xa7b1b6, metalness: 0.82, roughness: 0.26 }),
    darkSteel: new THREE.MeshStandardNodeMaterial({ color: 0x20282e, metalness: 0.64, roughness: 0.42 }),
    roof: new THREE.MeshStandardNodeMaterial({ metalness: 0.60, roughness: 0.32, side: THREE.DoubleSide }),
    canopy: new THREE.MeshStandardNodeMaterial({ metalness: 0.72, roughness: 0.34, side: THREE.DoubleSide }),
    accent: new THREE.MeshStandardNodeMaterial({ color: 0xa5b9c7, metalness: 0.70, roughness: 0.25 }),
    clearGlass: new THREE.MeshStandardNodeMaterial({ color: 0x9db9c4, transparent: true, opacity: 0.12, depthWrite: false,
      metalness: 0.05, roughness: 0.08, side: THREE.DoubleSide }),
    entranceGlass: new THREE.MeshStandardNodeMaterial({ color: 0x6e8b96, metalness: 0.32, roughness: 0.18, side: THREE.DoubleSide }),
    gold: new THREE.MeshStandardNodeMaterial({ color: 0xa8873d, metalness: 0.62, roughness: 0.32 }),
    stone: new THREE.MeshStandardNodeMaterial({ color: 0xd5d1c5, roughness: 0.78, metalness: 0.02 }),
    paving: new THREE.MeshStandardNodeMaterial({ color: 0x9b9d98, roughness: 0.88 }),
    pavingJoint: new THREE.MeshStandardNodeMaterial({ color: 0x555b5c, roughness: 0.92 }),
    dropOffPaving: new THREE.MeshStandardNodeMaterial({ color: 0x94958f, roughness: 0.95, envMapIntensity: 0.15 }),
    warmLight: new THREE.MeshStandardNodeMaterial({ color: 0xc7b28a, roughness: 0.40 })
  };
  for (const key of ['glass', 'spandrel', 'roof', 'canopy']) materials[key].colorNode = attribute('color', 'vec3');
  materials.glass.emissiveNode = color(0x244b78).mul(nightAmount()).mul(0.22)
    .add(color(0xffd5a0).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.60));
  materials.accent.emissiveNode = color(0xa9d7ff).mul(nightAmount()).mul(2.0);
  materials.gold.emissiveNode = color(0xffd28a).mul(nightAmount()).mul(0.12);
  materials.stone.emissiveNode = color(0xffd7aa).mul(nightAmount()).mul(0.025);
  materials.warmLight.emissiveNode = color(0xffd49a).mul(nightAmount().mul(1.60).add(0.02));
  materials.clearGlass.emissiveNode = color(0xffd9aa).mul(nightAmount()).mul(0.012);

  const tower = new THREE.Group(); tower.position.set(CULLINAN_I_SITE.x, 0, CULLINAN_I_SITE.z); tower.rotation.y = CULLINAN_I_SITE.ry;
  tower.name = 'CullinanIExactSourcePlanAndAngularCrown'; group.add(tower);
  const facade = createCurtainWall();
  meshStore(tower, facade.glass, materials.glass, 'CullinanIBlueSilverUnitizedVisionGlass');
  meshStore(tower, facade.spandrels, materials.spandrel, 'CullinanIReflectiveSpandrelsAndGraphiteBelts');
  merged(tower, facade.mullions, materials.silver, 'CullinanIContinuousVerticalAluminiumFins');
  merged(tower, facade.transoms, materials.silver, 'CullinanIUnitizedHorizontalTransoms');
  merged(tower, facade.louvres, materials.darkSteel, 'CullinanIThreeVisualGraphiteLouvreBelts');
  merged(tower, facade.accents, materials.accent, 'CullinanIHorizontalCoolWhiteAccentLines', false);
  const crown = createCrown(); meshStore(tower, crown.glass, materials.glass, 'CullinanIFoldedAngularCrownGlazing');
  merged(tower, crown.fins, materials.silver, 'CullinanICrownFinsAndSignatureVerticalBlades');
  merged(tower, crown.transoms, materials.silver, 'CullinanICrownSlopingTransoms');
  merged(tower, crown.caps, materials.silver, 'CullinanIAngularCrownMetalCopings');
  merged(tower, crown.accents, materials.accent, 'CullinanICrownAndVerticalBladeNightOutlines', false);
  meshStore(tower, crown.roof, materials.roof, 'CullinanIFoldedCrownRoofPlanes');
  const entrance = createGlassBoxEntrance(group, materials), dropOffColliders = createCoveredDropOff(group, materials);

  const entryHalfVoid = CULLINAN_I_GLASS_BOX_WIDTH * 0.5 / cullinanIEdgeOutward(CULLINAN_I_TOWER_RING, CULLINAN_I_ENTRANCE.edge).length;
  const colliders = [
    ...cullinanIRingColliders(CULLINAN_I_TOWER_RING, 0, CULLINAN_I_GLASS_BOX_HEIGHT, 0.85, [CULLINAN_I_ENTRANCE.edge]),
    cullinanIEdgeCollider(CULLINAN_I_TOWER_RING, CULLINAN_I_ENTRANCE.edge, 0, 0.5 - entryHalfVoid, 0, CULLINAN_I_GLASS_BOX_HEIGHT),
    cullinanIEdgeCollider(CULLINAN_I_TOWER_RING, CULLINAN_I_ENTRANCE.edge, 0.5 + entryHalfVoid, 1, 0, CULLINAN_I_GLASS_BOX_HEIGHT),
    ...cullinanIRingColliders(CULLINAN_I_TOWER_RING, CULLINAN_I_GLASS_BOX_HEIGHT, CULLINAN_I_VISUAL_WALL_TOP),
    ...Array.from({ length: CULLINAN_I_TOWER_RING.length / 2 - 1 }, (_, edge) => cullinanIEdgeCollider(CULLINAN_I_TOWER_RING, edge, 0, 1,
      CULLINAN_I_VISUAL_WALL_TOP, Math.max(CULLINAN_I_CROWN_VERTEX_HEIGHTS[edge],
        CULLINAN_I_CROWN_VERTEX_HEIGHTS[(edge + 1) % CULLINAN_I_CROWN_VERTEX_HEIGHTS.length]), 0.85)),
    ...entrance.colliders, ...dropOffColliders
  ];
  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }
  const landmark = { name: CULLINAN_I_SITE.name, englishName: CULLINAN_I_SITE.englishName,
    position: { x: CULLINAN_I_SITE.x, y: groundOffset, z: CULLINAN_I_SITE.z }, radius: 82, height: CULLINAN_I_TO_TIP_HEIGHT };
  const stats = {
    cullinanIGroundOffset: groundOffset, cullinanILandmarks: 1,
    cullinanIOsmHeight: CULLINAN_I_OSM_HEIGHT, cullinanIOfficialApproxHeight: CULLINAN_I_OFFICIAL_APPROX_HEIGHT,
    cullinanIHeight: CULLINAN_I_HEIGHT, cullinanIToTipHeight: CULLINAN_I_TO_TIP_HEIGHT,
    cullinanIOsmLevels: CULLINAN_I_OSM_LEVELS, cullinanILevels: CULLINAN_I_LEVELS,
    cullinanIBelowGroundLevels: CULLINAN_I_BELOW_GROUND_LEVELS, cullinanIOsmStartDate: CULLINAN_I_OSM_START_DATE,
    cullinanICompletedYear: CULLINAN_I_COMPLETED_YEAR, cullinanISourceVertices: CULLINAN_I_SITE.localRing.length / 2,
    cullinanIVisionPanels: facade.visionPanels, cullinanISpandrelPanels: facade.spandrelPanels,
    cullinanILouvrePanels: facade.louvrePanels, cullinanILouvreSlats: facade.louvreSlats,
    cullinanIVerticalFins: facade.mullions.length + crown.finCount, cullinanIAccentSegments: facade.accentSegments + crown.accents.length,
    cullinanICrownPanels: crown.panels, cullinanIGlassBoxHeight: CULLINAN_I_GLASS_BOX_HEIGHT,
    cullinanIGlassBoxPanes: entrance.paneCount, cullinanIGoldAtriumEmblems: 1,
    cullinanIDropOffColumns: 4, cullinanIDropOffCanopies: 2, cullinanIColliders: colliders.length
  };
  group.userData.stats = stats;
  return { group, colliders, landmarks: [landmark], stats, groundOffset, plazaTop: groundOffset + CULLINAN_I_PLAZA_TOP };
}
