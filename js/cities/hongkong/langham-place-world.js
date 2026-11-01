import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  LANGHAM_PLACE_SITE, LANGHAM_PLACE_TOWER_RING, LANGHAM_PLACE_OSM_HEIGHT, LANGHAM_PLACE_HEIGHT,
  LANGHAM_PLACE_TO_TIP_HEIGHT, LANGHAM_PLACE_OSM_LEVELS, LANGHAM_PLACE_LEVELS,
  LANGHAM_PLACE_BELOW_GROUND_LEVELS, LANGHAM_PLACE_TOWER_GFA, LANGHAM_PLACE_COMPLETED_YEAR,
  LANGHAM_PLACE_CONSTRUCTION_START_YEAR, LANGHAM_PLACE_WO_OFFICE_STOREYS, LANGHAM_PLACE_WO_OFFICE_GFA,
  LANGHAM_PLACE_WO_GRAND_ATRIUM_STOREYS, LANGHAM_PLACE_PLAZA_TOP, LANGHAM_PLACE_MAIN_ROOF,
  LANGHAM_PLACE_DOME_BASE, LANGHAM_PLACE_DOME_HEIGHT, LANGHAM_PLACE_DOME_CENTER,
  LANGHAM_PLACE_DOME_RADIUS_X, LANGHAM_PLACE_DOME_RADIUS_Z, LANGHAM_PLACE_PANEL_TARGET_WIDTH,
  LANGHAM_PLACE_VISUAL_GREY_BAND_LEVELS, LANGHAM_PLACE_RECESS_EDGES, LANGHAM_PLACE_ROOF_ZONES,
  LANGHAM_PLACE_ENTRANCE, LANGHAM_PLACE_OSM_SOURCE, LANGHAM_PLACE_ENTRANCE_SOURCE,
  LANGHAM_PLACE_DOME_WORLD, langhamPlaceFloorY, langhamPlaceRoofYForEdge,
  langhamPlaceEdgeOutward, langhamPlaceRingColliders
} from './langham-place-architecture.js';

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
function beam(parts, a, b, thickness = 0.08, depth = thickness) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
  const length = direction.length(); if (length < 1e-6) return;
  const geometry = new THREE.BoxGeometry(thickness, length, depth);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  geometry.translate((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5); parts.push(geometry);
}
function cylinder(parts, a, b, radius, segments = 12) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
  const length = direction.length(); if (length < 1e-6) return;
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  geometry.translate((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5); parts.push(geometry);
}
function edgeBox(parts, ring, edge, t, y, offset, width, height, depth) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const { nx, nz, ry } = langhamPlaceEdgeOutward(ring, edge);
  box(parts, [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset], [width, height, depth], ry);
}
function worldCollider(cx, cz, w, d, ry, minY, maxY) {
  const cs = Math.cos(ry), sn = Math.sin(ry), hx = w * 0.5, hz = d * 0.5;
  return { minX: cx - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: cx + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: cz - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: cz + Math.abs(sn) * hx + Math.abs(cs) * hz,
    minY, maxY, obb: { cx, cz, hx, hz, cs, sn } };
}
function localWorld(x, z) {
  const site = LANGHAM_PLACE_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return { x: site.x + cs * x + sn * z, z: site.z - sn * x + cs * z };
}

function createFacade() {
  const ring = LANGHAM_PLACE_TOWER_RING, glass = store(), greyGlass = store(), crownBacking = store(), roofs = store(), roofSteps = store();
  const mullions = [], transoms = [], greyBands = [], braces = [], crownLouvres = [], coping = [], bandLights = [];
  const greyLevels = new Set(LANGHAM_PLACE_VISUAL_GREY_BAND_LEVELS), recessEdges = new Set(LANGHAM_PLACE_RECESS_EDGES);
  const bracedEdges = new Set([7, 30, 34, 45]);
  let visionPanels = 0, greyPanels = 0, roofTriangles = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = langhamPlaceEdgeOutward(ring, edge), bays = Math.max(1, Math.round(length / LANGHAM_PLACE_PANEL_TARGET_WIDTH));
    const roofY = langhamPlaceRoofYForEdge(edge), facadeTop = roofY - 2.4, recess = recessEdges.has(edge);
    const point = (t, y, offset = 0.06) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    const entranceVoid = (t, y) => y < 10.8 && ((edge === 30 && t > 0.48) || (edge === 31 && t < 0.52));
    for (let course = 0; course < LANGHAM_PLACE_LEVELS; course++) {
      const y0 = langhamPlaceFloorY(course); if (y0 >= facadeTop - 0.05) break;
      const y1 = Math.min(langhamPlaceFloorY(course + 1), facadeTop), grey = greyLevels.has(course), podium = course < 6;
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + 0.001, t1 = (bay + 1) / bays - 0.001, tm = (t0 + t1) * 0.5;
        if (entranceVoid(tm, (y0 + y1) * 0.5)) continue;
        const variation = hash(edge, bay, course, 14), lit = hash(edge, bay, course, 81) > 0.91 ? 0.20 + variation * 0.58 : 0;
        const offset = grey ? 0.24 : recess ? -0.16 : 0.06;
        let tint;
        if (grey) tint = mix([0.18, 0.20, 0.20], [0.36, 0.37, 0.34], variation);
        else if (podium) tint = mix([0.055, 0.11, 0.14], [0.15, 0.23, 0.26], variation);
        else if (recess) tint = mix([0.055, 0.14, 0.20], [0.16, 0.30, 0.38], variation);
        else tint = mix([0.10, 0.24, 0.32], [0.27, 0.47, 0.56], 0.20 + variation * 0.65);
        const target = grey ? greyGlass : glass;
        quad(target, point(t0, y0 + (podium ? 0.38 : 0.16), offset), point(t1, y0 + (podium ? 0.38 : 0.16), offset),
          point(t1, y1 - 0.14, offset), point(t0, y1 - 0.14, offset), tint, grey ? lit * 0.35 : lit);
        if (grey) greyPanels++; else visionPanels++;
      }
      for (let bay = 0; bay <= bays; bay++) {
        const t = bay / bays, y = (y0 + y1) * 0.5; if (entranceVoid(t, y)) continue;
        const major = bay % 4 === 0;
        edgeBox(mullions, ring, edge, t, y, grey ? 0.34 : recess ? -0.06 : 0.15,
          grey ? 0.13 : major ? 0.11 : 0.055, y1 - y0, grey ? 0.28 : major ? 0.26 : 0.15);
      }
      if (!(edge === 30 && course < 3) && !(edge === 31 && course < 3)) {
        beam(transoms, point(0, y0 + 0.04, grey ? 0.34 : 0.15), point(1, y0 + 0.04, grey ? 0.34 : 0.15), grey ? 0.14 : 0.055, grey ? 0.30 : 0.14);
      }
      if (grey) {
        edgeBox(greyBands, ring, edge, 0.5, y0 + 0.05, 0.30, length + 0.05, 0.22, 0.48);
        if (course === 18 || course === 38) {
          beam(bandLights, point(0, y0 + 0.28, 0.48), point(1, y0 + 0.28, 0.48), 0.075, 0.10);
          if (bracedEdges.has(edge)) {
            const top = Math.min(langhamPlaceFloorY(course + 2), facadeTop);
            beam(braces, point(0.06, y0 + 0.35, 0.48), point(0.94, top - 0.35, 0.48), 0.20, 0.22);
            beam(braces, point(0.94, y0 + 0.35, 0.48), point(0.06, top - 0.35, 0.48), 0.20, 0.22);
          }
        }
      }
    }
    for (let y = roofY - 2.15; y < roofY - 0.12; y += 0.43) {
      beam(crownLouvres, point(0, y, 0.18), point(1, y, 0.18), 0.10, 0.28);
    }
    quad(crownBacking, point(0, roofY - 2.4, -0.02), point(1, roofY - 2.4, -0.02),
      point(1, roofY, -0.02), point(0, roofY, -0.02), [0.12, 0.16, 0.18]);
    beam(coping, point(0, roofY, 0.16), point(1, roofY, 0.16), 0.20, 0.34);
    triangle(roofs, [0, roofY, 0], [ax, roofY, az], [bx, roofY, bz], [0.18, 0.22, 0.23]); roofTriangles++;
    const previous = (edge + ring.length / 2 - 2) % (ring.length / 2 - 1), previousY = langhamPlaceRoofYForEdge(previous);
    if (previousY !== roofY) {
      const low = Math.min(previousY, roofY), high = Math.max(previousY, roofY);
      quad(roofSteps, [0, low, 0], [ax, low, az], [ax, high, az], [0, high, 0], [0.25, 0.29, 0.29]);
    }
  }
  return { glass, greyGlass, crownBacking, roofs, roofSteps, mullions, transoms, greyBands, braces,
    crownLouvres, coping, bandLights, visionPanels, greyPanels, roofTriangles };
}

function createDome() {
  const glass = store(), base = store(), ribs = [], heavyRibs = [];
  const { x: cx, z: cz } = LANGHAM_PLACE_DOME_CENTER, rx = LANGHAM_PLACE_DOME_RADIUS_X, rz = LANGHAM_PLACE_DOME_RADIUS_Z;
  const segments = 40, rings = 14;
  const point = (segment, theta) => {
    const phi = segment / segments * Math.PI * 2, radius = Math.cos(theta);
    return [cx + rx * radius * Math.cos(phi), LANGHAM_PLACE_DOME_BASE + LANGHAM_PLACE_DOME_HEIGHT * Math.sin(theta), cz + rz * radius * Math.sin(phi)];
  };
  for (let ring = 0; ring < rings; ring++) {
    const t0 = ring / rings * Math.PI * 0.5, t1 = (ring + 1) / rings * Math.PI * 0.5;
    for (let segment = 0; segment < segments; segment++) {
      const a = point(segment, t0), b = point(segment + 1, t0), c = point(segment + 1, t1), d = point(segment, t1);
      const tint = mix([0.08, 0.20, 0.27], [0.24, 0.40, 0.46], hash(ring, segment, 4));
      if (ring === rings - 1) triangle(glass, a, b, point(segment, Math.PI * 0.5), tint);
      else quad(glass, a, b, c, d, tint);
      beam(ribs, a, b, ring === 0 ? 0.16 : 0.075, ring === 0 ? 0.20 : 0.09);
      if (segment % 2 === 0) beam(ribs, a, d, 0.075, 0.09);
    }
  }
  for (let segment = 0; segment < segments; segment++) {
    const phi = segment / segments * Math.PI * 2, next = (segment + 1) / segments * Math.PI * 2;
    triangle(base, [cx, LANGHAM_PLACE_DOME_BASE - 0.03, cz],
      [cx + rx * Math.cos(phi), LANGHAM_PLACE_DOME_BASE - 0.03, cz + rz * Math.sin(phi)],
      [cx + rx * Math.cos(next), LANGHAM_PLACE_DOME_BASE - 0.03, cz + rz * Math.sin(next)], [0.12, 0.16, 0.18]);
    beam(heavyRibs, point(segment, 0), point(segment + 1, 0), 0.22, 0.28);
  }
  // Rib box corners must not protrude above the published to-tip elevation at the apex.
  for (const geometry of ribs) {
    const positions = geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) positions.setY(i, Math.min(positions.getY(i), LANGHAM_PLACE_TO_TIP_HEIGHT));
    positions.needsUpdate = true;
  }
  const collider = worldCollider(LANGHAM_PLACE_DOME_WORLD.x, LANGHAM_PLACE_DOME_WORLD.z,
    rx * 2, rz * 2, LANGHAM_PLACE_SITE.ry, LANGHAM_PLACE_DOME_BASE, LANGHAM_PLACE_TO_TIP_HEIGHT);
  return { glass, base, ribs, heavyRibs, collider };
}

function createPodiumColumns() {
  const ring = LANGHAM_PLACE_TOWER_RING, columns = [], collars = [], colliders = [];
  for (const vertexIndex of [7, 15, 23, 28, 35, 42, 48]) {
    const edgeCount = ring.length / 2 - 1, before = langhamPlaceEdgeOutward(ring, (vertexIndex + edgeCount - 1) % edgeCount);
    const after = langhamPlaceEdgeOutward(ring, vertexIndex), nx = before.nx + after.nx, nz = before.nz + after.nz, length = Math.hypot(nx, nz) || 1;
    const x = ring[vertexIndex * 2], z = ring[vertexIndex * 2 + 1], ux = nx / length, uz = nz / length;
    const bottom = [x + ux * 1.05, 0.15, z + uz * 1.05], top = [x + ux * 0.24, 29.5, z + uz * 0.24];
    cylinder(columns, bottom, top, 0.50, 14);
    cylinder(collars, [top[0], 28.9, top[2]], [top[0], 29.5, top[2]], 0.59, 14);
    const world = localWorld((bottom[0] + top[0]) * 0.5, (bottom[2] + top[2]) * 0.5);
    colliders.push(worldCollider(world.x, world.z, 1.15, 1.15, LANGHAM_PLACE_SITE.ry, 0, 29.5));
  }
  return { columns, collars, colliders };
}

function signTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#1a252a'; ctx.fillRect(0, 0, 1024, 256);
  ctx.textAlign = 'center'; ctx.fillStyle = '#e4e6df'; ctx.font = '500 62px sans-serif'; ctx.fillText('LANGHAM PLACE', 512, 105);
  ctx.fillStyle = '#b7c4c7'; ctx.font = '400 34px sans-serif'; ctx.fillText('OFFICE TOWER', 512, 176);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function createEntrance(group, materials) {
  const entrance = new THREE.Group(); entrance.position.set(LANGHAM_PLACE_ENTRANCE.x, 0, LANGHAM_PLACE_ENTRANCE.z);
  entrance.rotation.y = LANGHAM_PLACE_ENTRANCE.ry; entrance.name = 'LanghamPlaceExactOSMOfficeEntrance'; group.add(entrance);
  const lobby = [], glass = [], doors = [], frames = [], canopy = [], posts = [], lights = [];
  const width = 12, canopyHeight = 5.4, front = 2.4;
  box(lobby, [0, 5.4, -0.48], [10.8, 10.8, 0.20]);
  box(lobby, [0, 0.06, 1.125], [14, 0.12, 3.75]);
  for (const x of [-5.05, 5.05]) box(frames, [x, 5.4, 0], [0.30, 10.8, 0.34]);
  for (const x of [-3.9, 3.9]) box(glass, [x, 5.25, 0.04], [1.85, 10.5, 0.08]);
  for (const x of [-1.8, -0.6, 0.6, 1.8]) box(doors, [x, 2.15, 0.10], [1.12, 4.3, 0.08]);
  for (const x of [-1.8, -0.6, 0.6, 1.8]) box(glass, [x, 7.45, 0.06], [1.12, 5.9, 0.08]);
  for (const x of [-4.85, -2.95, -2.4, -1.2, 0, 1.2, 2.4, 2.95, 4.85]) box(frames, [x, 5.25, 0.15], [0.075, 10.5, 0.12]);
  for (const y of [4.4, 7.3, 10.5]) box(frames, [0, y, 0.15], [10.2, 0.09, 0.12]);
  for (const x of [-0.15, 0.15]) box(frames, [x, 1.55, 0.25], [0.045, 0.75, 0.07]);
  for (const x of [-4.75, 4.75]) box(lights, [x, 5.2, -0.32], [0.12, 9.8, 0.10]);
  for (let bay = 0; bay < 6; bay++) {
    box(canopy, [-width * 0.5 + (bay + 0.5) * width / 6, canopyHeight, 1.2], [width / 6 - 0.09, 0.06, 2.35]);
  }
  for (let bay = 0; bay <= 6; bay++) box(frames, [-width * 0.5 + bay * width / 6, canopyHeight, 1.2], [0.09, 0.16, 2.4]);
  for (const z of [0, 1.2, front]) box(frames, [0, canopyHeight, z], [width, 0.18, 0.12]);
  for (const x of [-4.5, 4.5]) {
    cylinder(posts, [x, 0, 1.95], [x, canopyHeight, 1.95], 0.10, 12);
    box(lights, [x, canopyHeight - 0.14, 1.1], [1.3, 0.07, 0.12]);
  }
  merged(entrance, lobby, materials.lobbyStone, 'LanghamPlaceOfficeLobbyStoneAndPaving');
  merged(entrance, glass, materials.entranceGlass, 'LanghamPlaceTallOfficeLobbyGlazing', false);
  merged(entrance, doors, materials.entranceGlass, 'LanghamPlaceOfficeGlazedDoors', false);
  merged(entrance, frames, materials.silver, 'LanghamPlaceOfficeEntranceFrames');
  merged(entrance, canopy, materials.canopyGlass, 'LanghamPlaceOfficeGlassCanopy', false);
  merged(entrance, posts, materials.silver, 'LanghamPlaceOfficeCanopyPosts');
  merged(entrance, lights, materials.warmLight, 'LanghamPlaceOfficeLobbyWarmLights', false);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.6), new THREE.MeshBasicMaterial({ map: signTexture(), toneMapped: false }));
  sign.position.set(0, 4.95, 0.28); sign.name = 'LanghamPlaceOfficeTowerIdentification'; entrance.add(sign);
  const colliders = [], cs = Math.cos(LANGHAM_PLACE_ENTRANCE.ry), sn = Math.sin(LANGHAM_PLACE_ENTRANCE.ry);
  const add = (x, z, w, d, minY, maxY) => {
    const wx = LANGHAM_PLACE_ENTRANCE.x + cs * x + sn * z, wz = LANGHAM_PLACE_ENTRANCE.z - sn * x + cs * z;
    colliders.push(worldCollider(wx, wz, w, d, LANGHAM_PLACE_ENTRANCE.ry, minY, maxY));
  };
  add(0, 1.2, width, 2.5, canopyHeight - 0.15, canopyHeight + 0.18);
  for (const x of [-4.5, 4.5]) add(x, 1.95, 0.26, 0.26, 0, canopyHeight);
  for (const x of [-5.05, 5.05]) add(x, 0, 0.36, 0.40, 0, 10.8);
  return { colliders };
}

export function buildLanghamPlace(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'LanghamPlaceAuthoredCurvedOfficeTowerLandmark'; group.userData.internalId = 'HK-B0014';
  group.position.y = groundOffset; root.add(group);
  const materials = {
    glass: new THREE.MeshStandardNodeMaterial({ metalness: 0.56, roughness: 0.22, envMapIntensity: 1.15, side: THREE.DoubleSide }),
    greyGlass: new THREE.MeshStandardNodeMaterial({ metalness: 0.46, roughness: 0.30, side: THREE.DoubleSide }),
    crown: new THREE.MeshStandardNodeMaterial({ metalness: 0.48, roughness: 0.40, side: THREE.DoubleSide }),
    roof: new THREE.MeshStandardNodeMaterial({ metalness: 0.32, roughness: 0.62, side: THREE.DoubleSide }),
    silver: new THREE.MeshStandardNodeMaterial({ color: 0xbec8c8, metalness: 0.62, roughness: 0.32 }),
    band: new THREE.MeshStandardNodeMaterial({ color: 0x8e9999, metalness: 0.58, roughness: 0.38 }),
    dark: new THREE.MeshStandardNodeMaterial({ color: 0x27343a, metalness: 0.48, roughness: 0.42 }),
    domeGlass: new THREE.MeshStandardNodeMaterial({ metalness: 0.52, roughness: 0.22, side: THREE.DoubleSide }),
    domeRib: new THREE.MeshStandardNodeMaterial({ color: 0xb8c6c9, metalness: 0.68, roughness: 0.30 }),
    entranceGlass: new THREE.MeshStandardNodeMaterial({ color: 0x789ba6, metalness: 0.18, roughness: 0.16, transparent: true, opacity: 0.34, depthWrite: false, side: THREE.DoubleSide }),
    canopyGlass: new THREE.MeshStandardNodeMaterial({ color: 0xa9c2c6, transparent: true, opacity: 0.20, depthWrite: false, roughness: 0.10, side: THREE.DoubleSide }),
    lobbyStone: new THREE.MeshStandardNodeMaterial({ color: 0x817c70, roughness: 0.72 }),
    warmLight: new THREE.MeshStandardNodeMaterial({ color: 0xd3bd93, roughness: 0.42 })
  };
  for (const key of ['glass', 'greyGlass', 'crown', 'roof', 'domeGlass']) materials[key].colorNode = attribute('color', 'vec3');
  materials.glass.emissiveNode = color(0x214b67).mul(nightAmount()).mul(0.16)
    .add(color(0xffd6a4).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.48));
  materials.greyGlass.emissiveNode = color(0xffd3a0).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.20);
  materials.domeGlass.emissiveNode = color(0x396b88).mul(nightAmount()).mul(0.24);
  materials.domeRib.emissiveNode = color(0x8fc8dd).mul(nightAmount()).mul(0.52);
  materials.warmLight.emissiveNode = color(0xffd39b).mul(nightAmount().mul(1.6).add(0.01));
  materials.lobbyStone.emissiveNode = color(0xffd2a0).mul(nightAmount().mul(0.16).add(0.004));
  materials.entranceGlass.emissiveNode = color(0x82b4c4).mul(nightAmount()).mul(0.06);

  const tower = new THREE.Group(); tower.position.set(LANGHAM_PLACE_SITE.x, 0, LANGHAM_PLACE_SITE.z); tower.rotation.y = LANGHAM_PLACE_SITE.ry;
  tower.name = 'LanghamPlaceExactCurvedShaftSteppedRoofsAndRibbedDome'; group.add(tower);
  const facade = createFacade();
  meshStore(tower, facade.glass, materials.glass, 'LanghamPlaceBlueCurvedVisionGlass');
  meshStore(tower, facade.greyGlass, materials.greyGlass, 'LanghamPlaceTwoGreyGlassIntervals');
  meshStore(tower, facade.crownBacking, materials.crown, 'LanghamPlaceSteppedCrownBacking');
  meshStore(tower, facade.roofs, materials.roof, 'LanghamPlaceFourSteppedRoofZones');
  meshStore(tower, facade.roofSteps, materials.roof, 'LanghamPlaceVerticalRoofStepClosures');
  merged(tower, facade.mullions, materials.silver, 'LanghamPlaceFineCurvedFacadeMullions');
  merged(tower, facade.transoms, materials.silver, 'LanghamPlaceHorizontalFacadeTransoms');
  merged(tower, facade.greyBands, materials.band, 'LanghamPlaceGreyIntervalCornices');
  merged(tower, facade.braces, materials.band, 'LanghamPlaceGreyBandDiagonalBraces');
  merged(tower, facade.crownLouvres, materials.dark, 'LanghamPlaceSteppedCrownLouvres');
  merged(tower, facade.coping, materials.silver, 'LanghamPlaceCurvedRoofCoping');
  merged(tower, facade.bandLights, materials.warmLight, 'LanghamPlaceGreyBandWarmAccents', false);
  const dome = createDome();
  meshStore(tower, dome.glass, materials.domeGlass, 'LanghamPlaceEllipticalGlazedDome');
  meshStore(tower, dome.base, materials.roof, 'LanghamPlaceDomeBaseDeck');
  merged(tower, dome.ribs, materials.domeRib, 'LanghamPlaceDomeHorizontalAndVerticalRibs');
  merged(tower, dome.heavyRibs, materials.domeRib, 'LanghamPlaceDomeBaseRing');
  const podium = createPodiumColumns();
  merged(tower, podium.columns, materials.silver, 'LanghamPlaceTallSlopingSilverPodiumColumns');
  merged(tower, podium.collars, materials.band, 'LanghamPlacePodiumColumnCollars');
  const entrance = createEntrance(group, materials);

  const colliders = [...langhamPlaceRingColliders(LANGHAM_PLACE_TOWER_RING, 0, 0.85),
    dome.collider, ...podium.colliders, ...entrance.colliders];
  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }
  const landmark = { name: LANGHAM_PLACE_SITE.name, englishName: LANGHAM_PLACE_SITE.englishName,
    position: { x: LANGHAM_PLACE_SITE.x, y: groundOffset, z: LANGHAM_PLACE_SITE.z }, radius: 70, height: LANGHAM_PLACE_TO_TIP_HEIGHT };
  const stats = {
    langhamPlaceGroundOffset: groundOffset, langhamPlaceLandmarks: 1,
    langhamPlaceOsmHeight: LANGHAM_PLACE_OSM_HEIGHT, langhamPlaceHeight: LANGHAM_PLACE_HEIGHT,
    langhamPlaceToTipHeight: LANGHAM_PLACE_TO_TIP_HEIGHT, langhamPlaceOsmLevels: LANGHAM_PLACE_OSM_LEVELS,
    langhamPlaceLevels: LANGHAM_PLACE_LEVELS, langhamPlaceBelowGroundLevels: LANGHAM_PLACE_BELOW_GROUND_LEVELS,
    langhamPlaceTowerGfa: LANGHAM_PLACE_TOWER_GFA, langhamPlaceCompletedYear: LANGHAM_PLACE_COMPLETED_YEAR,
    langhamPlaceConstructionStartYear: LANGHAM_PLACE_CONSTRUCTION_START_YEAR,
    langhamPlaceWoOfficeStoreys: LANGHAM_PLACE_WO_OFFICE_STOREYS, langhamPlaceWoOfficeGfa: LANGHAM_PLACE_WO_OFFICE_GFA,
    langhamPlaceWoGrandAtriumStoreys: LANGHAM_PLACE_WO_GRAND_ATRIUM_STOREYS,
    langhamPlaceSourceVertices: LANGHAM_PLACE_SITE.localRing.length / 2, langhamPlaceOsmWayVersion: LANGHAM_PLACE_OSM_SOURCE.version,
    langhamPlaceEntranceNode: LANGHAM_PLACE_ENTRANCE_SOURCE.id, langhamPlaceMainRoof: LANGHAM_PLACE_MAIN_ROOF,
    langhamPlaceDomeHeight: LANGHAM_PLACE_DOME_HEIGHT, langhamPlaceRoofZones: LANGHAM_PLACE_ROOF_ZONES.length,
    langhamPlaceVisionPanels: facade.visionPanels, langhamPlaceGreyPanels: facade.greyPanels,
    langhamPlaceRoofTriangles: facade.roofTriangles, langhamPlaceDomeSegments: 40,
    langhamPlacePodiumColumns: podium.colliders.length, langhamPlaceColliders: colliders.length
  };
  group.userData.stats = stats;
  return { group, colliders, landmarks: [landmark], stats, groundOffset, plazaTop: groundOffset + LANGHAM_PLACE_PLAZA_TOP };
}
