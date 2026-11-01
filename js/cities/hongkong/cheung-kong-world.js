import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  CHEUNG_KONG_SITE, CHEUNG_KONG_OSM_HEIGHT, CHEUNG_KONG_HEIGHT, CHEUNG_KONG_TO_TIP_HEIGHT,
  CHEUNG_KONG_OSM_LEVELS, CHEUNG_KONG_LEVELS, CHEUNG_KONG_CONVENTIONAL_LEVELS,
  CHEUNG_KONG_TOP_LEVEL_LABEL, CHEUNG_KONG_BELOW_GROUND_LEVELS,
  CHEUNG_KONG_PANEL_WIDTH, CHEUNG_KONG_PANEL_HEIGHT, CHEUNG_KONG_STRUCTURAL_PLAN, CHEUNG_KONG_CHAMFER,
  CHEUNG_KONG_LOBBY_HEIGHT, CHEUNG_KONG_LOWER_LOUVRE_TOP, CHEUNG_KONG_VISUAL_OFFICE_TOP,
  CHEUNG_KONG_VISUAL_ROOF_DECK, CHEUNG_KONG_PLAZA_TOP,
  CHEUNG_KONG_VISUAL_RING, CHEUNG_KONG_LOBBY_RING, CHEUNG_KONG_ENTRANCE,
  cheungKongFloorY, cheungKongEdgeOutward, cheungKongRingColliders
} from './cheung-kong-architecture.js';

const lerp = (a, b, t) => a + (b - a) * t;
const hash = (a, b, c = 0, d = 0) => { const v = Math.sin(a * 127.1 + b * 311.7 + c * 73.7 + d * 19.19) * 43758.5453; return v - Math.floor(v); };
const nightAmount = () => smoothstep(0.55, 1.4, cityUniforms.uInteriorGlow);
function store() { return { positions: [], colors: [], lit: [], quads: 0 }; }
function vertex(s, p, tint, lit = 0) { s.positions.push(...p); s.colors.push(...tint); s.lit.push(lit); }
function quad(s, a, b, c, d, tint, lit = 0) { for (const i of [0, 1, 2, 0, 2, 3]) vertex(s, [a, b, c, d][i], tint, lit); s.quads++; }
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
  if (parts.length > 1) for (const part of parts) part.dispose(); const mesh = new THREE.Mesh(g, material);
  mesh.name = name; mesh.frustumCulled = false; mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function beam(parts, a, b, width, depth = width) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
  const length = direction.length(); if (length < 0.015) return; const g = new THREE.BoxGeometry(width, length, depth);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(start.add(end).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1))); parts.push(g);
}
function tube(parts, a, b, radius, segments = 8) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
  const length = direction.length(); if (length < 0.015) return; const g = new THREE.CylinderGeometry(radius, radius, length, segments, 1, false);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(start.add(end).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1))); parts.push(g);
}
function tintMix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function triangulatedRoof(ring, y, tint) {
  const result = store(), points = [];
  for (let i = 0; i + 1 < ring.length; i += 2) points.push(new THREE.Vector2(ring[i], ring[i + 1]));
  for (const face of THREE.ShapeUtils.triangulateShape(points, [])) {
    const [a, b, c] = face.map((index) => [points[index].x, y, points[index].y]); triangle(result, a, b, c, tint);
  }
  return result;
}
function worldCollider(cx, cz, w, d, ry, minY, maxY) {
  const cs = Math.cos(ry), sn = Math.sin(ry), hx = w * 0.5, hz = d * 0.5;
  return { minX: cx - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: cx + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: cz - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: cz + Math.abs(sn) * hx + Math.abs(cs) * hz,
    minY, maxY, obb: { cx, cz, hx, hz, cs, sn } };
}
function localBox(group, material, name, position, size) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.position.set(...position); mesh.name = name;
  mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function bayCount(length) { return Math.max(1, Math.round(length / CHEUNG_KONG_PANEL_WIDTH)); }

function addFibre(store, point, t, y, length, seed) {
  const size = 0.10 + seed * 0.07, dt = size / Math.max(length, 0.2) * 0.5;
  const tint = seed > 0.72 ? [0.63, 0.82, 1] : seed > 0.36 ? [1, 0.91, 0.68] : [0.90, 0.96, 1];
  quad(store, point(t - dt, y - size * 0.5, 0.30), point(t + dt, y - size * 0.5, 0.30),
    point(t + dt, y + size * 0.5, 0.30), point(t - dt, y + size * 0.5, 0.30), tint);
}

function createOfficeFacade() {
  const ring = CHEUNG_KONG_VISUAL_RING, glass = store(), metal = store(), shades = store(), fibres = store();
  const louvres = [], shadeLips = [], brackets = [];
  let visionPanels = 0, fibrePoints = 0, sunshades = 0, louvreSlats = 0;
  for (let level = 2; level <= CHEUNG_KONG_LEVELS; level++) {
    const y0 = cheungKongFloorY(level - 1), y1 = cheungKongFloorY(level), middle = (y0 + y1) * 0.5, lowerLouvre = level <= 5;
    for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
      const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
      const { nx, nz, length } = cheungKongEdgeOutward(ring, edge), bays = bayCount(length);
      const point = (t, y, offset = 0.04) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + 0.0008, t1 = (bay + 1) / bays - 0.0008;
        if (lowerLouvre) {
          quad(metal, point(t0, y0, 0), point(t1, y0, 0), point(t1, y1, 0), point(t0, y1, 0), [0.055, 0.062, 0.061]);
        } else {
          for (let half = 0; half < 2; half++) {
            const py0 = lerp(y0, middle, half) + 0.035, py1 = lerp(middle, y1, half) - 0.035;
            const variation = hash(level, edge, bay, half), tint = tintMix([0.025, 0.065, 0.080], [0.19, 0.30, 0.32], 0.22 + variation * 0.62);
            const lit = variation > 0.82 ? 0.16 + hash(bay, half, level, edge) * 0.32 : 0;
            quad(glass, point(t0, py0), point(t1, py0), point(t1, py1), point(t0, py1), tint, lit); visionPanels++;
            const fibreSeed = hash(edge + 17, bay + 31, level + 47, half + 59);
            if (fibreSeed > 0.78) {
              const t = lerp(t0, t1, 0.18 + hash(level, bay, half, edge) * 0.64);
              const y = lerp(py0, py1, 0.18 + hash(bay, level, edge, half) * 0.64);
              addFibre(fibres, point, t, y, length, fibreSeed); fibrePoints++;
              if (fibreSeed > 0.95) {
                addFibre(fibres, point, lerp(t0, t1, 0.72), lerp(py0, py1, 0.72), length, 1 - fibreSeed); fibrePoints++;
              }
            }
          }
          quad(metal, point(t0, middle - 0.035, 0.085), point(t1, middle - 0.035, 0.085),
            point(t1, middle + 0.035, 0.085), point(t0, middle + 0.035, 0.085), [0.32, 0.36, 0.36]);
        }
        quad(metal, point(t0, y0, 0.08), point(t1, y0, 0.08), point(t1, y0 + 0.18, 0.08), point(t0, y0 + 0.18, 0.08),
          lowerLouvre ? [0.26, 0.27, 0.25] : [0.34, 0.38, 0.38]);
        // Photo-derived aerofoil sunshade: sloped upper surface, fine outer lip and alternating support brackets.
        quad(shades, point(t0, y0 + 0.29, 0.13), point(t1, y0 + 0.29, 0.13),
          point(t1, y0 + 0.08, 0.91), point(t0, y0 + 0.08, 0.91), [0.38, 0.41, 0.40]);
        beam(shadeLips, point(t0, y0 + 0.07, 0.91), point(t1, y0 + 0.07, 0.91), 0.085, 0.11);
        if (bay % 2 === 0) beam(brackets, point(t0, y0 - 0.31, 0.16), point(t0, y0 + 0.07, 0.73), 0.065, 0.085);
        sunshades++;
      }
      if (lowerLouvre) {
        for (let slat = 0; slat < 15; slat++) {
          const y = y0 + (slat + 0.5) * (y1 - y0) / 15;
          beam(louvres, point(0.002, y, 0.18), point(0.998, y, 0.18), 0.11, 0.23); louvreSlats++;
        }
      }
    }
  }
  return { glass, metal, shades, fibres, louvres, shadeLips, brackets, visionPanels, fibrePoints, sunshades, louvreSlats };
}

function createLobby() {
  const ring = CHEUNG_KONG_LOBBY_RING, glass = store(), frames = store(), fins = []; let panels = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = cheungKongEdgeOutward(ring, edge), bays = bayCount(length);
    const point = (t, y, offset = 0.04) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays + 0.001, t1 = (bay + 1) / bays - 0.001;
      quad(glass, point(t0, 0.18), point(t1, 0.18), point(t1, CHEUNG_KONG_LOBBY_HEIGHT - 0.12), point(t0, CHEUNG_KONG_LOBBY_HEIGHT - 0.12),
        tintMix([0.07, 0.18, 0.19], [0.24, 0.40, 0.39], hash(edge, bay)), 0.015); panels++;
    }
    for (const y of [0.15, 3, 6, CHEUNG_KONG_LOBBY_HEIGHT - 0.10]) {
      quad(frames, point(0, y - 0.04, 0.10), point(1, y - 0.04, 0.10), point(1, y + 0.04, 0.10), point(0, y + 0.04, 0.10), [0.42, 0.47, 0.45]);
    }
    for (let bay = 0; bay < bays; bay++) {
      const t = bay / bays, x = lerp(ax, bx, t) + nx * 0.23, z = lerp(az, bz, t) + nz * 0.23;
      tube(fins, [x, 0.10, z], [x, CHEUNG_KONG_LOBBY_HEIGHT, z], length < 2.5 ? 0.15 : 0.09, 10);
    }
  }
  return { glass, frames, fins, panels };
}

function createContinuousFins() {
  const ring = CHEUNG_KONG_VISUAL_RING, fins = []; let count = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = cheungKongEdgeOutward(ring, edge), bays = bayCount(length);
    for (let bay = 0; bay < bays; bay++) {
      const t = bay / bays, x = lerp(ax, bx, t) + nx * 0.27, z = lerp(az, bz, t) + nz * 0.27;
      const major = length < 2 || bay % 4 === 0;
      tube(fins, [x, CHEUNG_KONG_LOBBY_HEIGHT, z], [x, CHEUNG_KONG_HEIGHT, z], major ? 0.14 : 0.075, major ? 10 : 8); count++;
    }
  }
  return { fins, count };
}

function createRoof() {
  const ring = CHEUNG_KONG_VISUAL_RING, walls = store(), louvres = [], caps = [], accents = [];
  let crownSlats = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz } = cheungKongEdgeOutward(ring, edge);
    const point = (t, y, offset = 0.02) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    quad(walls, point(0, CHEUNG_KONG_VISUAL_OFFICE_TOP), point(1, CHEUNG_KONG_VISUAL_OFFICE_TOP),
      point(1, CHEUNG_KONG_VISUAL_ROOF_DECK), point(0, CHEUNG_KONG_VISUAL_ROOF_DECK), [0.035, 0.045, 0.047]);
    for (let slat = 0; slat < 5; slat++) {
      const y = lerp(CHEUNG_KONG_VISUAL_OFFICE_TOP, CHEUNG_KONG_VISUAL_ROOF_DECK, (slat + 0.5) / 5);
      beam(louvres, point(0, y, 0.15), point(1, y, 0.15), 0.12, 0.22); crownSlats++;
    }
    quad(walls, point(0, CHEUNG_KONG_VISUAL_ROOF_DECK), point(1, CHEUNG_KONG_VISUAL_ROOF_DECK),
      point(1, CHEUNG_KONG_HEIGHT), point(0, CHEUNG_KONG_HEIGHT), [0.20, 0.25, 0.25]);
    beam(caps, point(0, CHEUNG_KONG_HEIGHT - 0.08, 0.09), point(1, CHEUNG_KONG_HEIGHT - 0.08, 0.09), 0.16, 0.22);
    beam(accents, point(0, CHEUNG_KONG_HEIGHT - 0.20, 0.18), point(1, CHEUNG_KONG_HEIGHT - 0.20, 0.18), 0.07, 0.08);
  }
  return { walls, louvres, caps, accents, deck: triangulatedRoof(ring.slice(0, -2), CHEUNG_KONG_VISUAL_ROOF_DECK, [0.08, 0.10, 0.105]), crownSlats };
}

function signTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 192;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#152526'; ctx.fillRect(0, 0, 1024, 192);
  ctx.textAlign = 'center'; ctx.fillStyle = '#e3e7df'; ctx.font = '500 55px sans-serif'; ctx.fillText('CHEUNG KONG CENTER', 512, 110);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function createEntrance(group, materials) {
  const entrance = new THREE.Group(); entrance.position.set(CHEUNG_KONG_ENTRANCE.x, 0, CHEUNG_KONG_ENTRANCE.z);
  entrance.rotation.y = CHEUNG_KONG_ENTRANCE.ry; entrance.name = 'CheungKongActualOsmEntranceBarrelCanopy'; group.add(entrance);
  localBox(entrance, materials.entranceGlass, 'CheungKongDoubleHeightGlazedEntrance', [0, 2.65, 0.10], [6.4, 5.3, 0.14]);
  const frames = [];
  for (const x of [-3.2, -1.6, 0, 1.6, 3.2]) beam(frames, [x, 0.12, 0.20], [x, 5.3, 0.20], 0.10, 0.13);
  for (const y of [0.15, 3.1, 5.3]) beam(frames, [-3.2, y, 0.20], [3.2, y, 0.20], 0.10, 0.13);
  merged(entrance, frames, materials.steel, 'CheungKongEntranceDoorMullions');
  const roof = store(), ribs = [], columns = [], lights = [], half = 4.2, spring = 5.55, rise = 0.78;
  const y = (x) => spring + rise * (1 - (x / half) ** 2);
  for (let ix = 0; ix < 12; ix++) for (let iz = 0; iz < 3; iz++) {
    const x0 = -half + ix * half * 2 / 12, x1 = -half + (ix + 1) * half * 2 / 12;
    const z0 = 0.12 + iz * 3.6 / 3, z1 = 0.12 + (iz + 1) * 3.6 / 3;
    quad(roof, [x0, y(x0), z0], [x1, y(x1), z0], [x1, y(x1), z1], [x0, y(x0), z1], [0.32, 0.36, 0.35]);
  }
  for (const z of [0.12, 1.92, 3.72]) for (let ix = 0; ix < 12; ix++) {
    const x0 = -half + ix * half * 2 / 12, x1 = -half + (ix + 1) * half * 2 / 12;
    beam(ribs, [x0, y(x0) - 0.05, z], [x1, y(x1) - 0.05, z], 0.12, 0.16);
  }
  // A real folded-metal fascia gives the barrel vault a visible edge instead of a paper-thin silhouette.
  for (let ix = 0; ix < 12; ix++) {
    const x0 = -half + ix * half * 2 / 12, x1 = -half + (ix + 1) * half * 2 / 12;
    quad(roof, [x0, y(x0), 3.72], [x1, y(x1), 3.72], [x1, y(x1) - 0.22, 3.72], [x0, y(x0) - 0.22, 3.72], [0.40, 0.44, 0.43]);
  }
  for (const x of [-half, half]) beam(ribs, [x, spring - 0.10, 0.12], [x, spring - 0.10, 3.72], 0.16, 0.18);
  for (const x of [-3.65, 3.65]) {
    tube(columns, [x, 0.12, 2.95], [x, y(x), 2.95], 0.16, 12);
    localBox(entrance, materials.stone, 'CheungKongCanopyColumnStoneShoe', [x, 0.35, 2.95], [0.55, 0.70, 0.55]);
  }
  for (const x of [-2.8, -1.4, 0, 1.4, 2.8]) for (const z of [0.8, 2.6]) beam(lights, [x, y(x) - 0.14, z], [x + 0.16, y(x) - 0.14, z], 0.08, 0.09);
  meshStore(entrance, roof, materials.metal, 'CheungKongSegmentedBarrelVaultCanopy');
  merged(entrance, ribs, materials.steel, 'CheungKongCanopyCurvedRibs'); merged(entrance, columns, materials.steel, 'CheungKongCanopySteelColumns');
  merged(entrance, lights, materials.warmLight, 'CheungKongEntranceWarmDownlights', false);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.2), new THREE.MeshBasicMaterial({ map: signTexture(), toneMapped: false }));
  sign.position.set(0, 4.70, 0.23); sign.name = 'CheungKongEntranceIdentification'; entrance.add(sign);
  const colliders = [], cs = Math.cos(CHEUNG_KONG_ENTRANCE.ry), sn = Math.sin(CHEUNG_KONG_ENTRANCE.ry);
  const convert = (x, z) => ({ x: CHEUNG_KONG_ENTRANCE.x + cs * x + sn * z, z: CHEUNG_KONG_ENTRANCE.z - sn * x + cs * z });
  const add = (x, z, w, d, minY, maxY) => { const p = convert(x, z); colliders.push(worldCollider(p.x, p.z, w, d, CHEUNG_KONG_ENTRANCE.ry, minY, maxY)); };
  add(0, 0.1, 6.5, 0.35, 0, 5.4); add(0, 1.92, 8.5, 3.8, 5.45, 6.45);
  for (const x of [-3.65, 3.65]) add(x, 2.95, 0.55, 0.55, 0, 5.8);
  return colliders;
}

export function buildCheungKongCenter(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'CheungKongCenterAuthoredLandmark'; group.userData.internalId = 'HK-B0009';
  group.position.y = groundOffset; root.add(group);
  const materials = {
    glass: new THREE.MeshStandardNodeMaterial({ metalness: 0.68, roughness: 0.18, envMapIntensity: 1.05, side: THREE.DoubleSide }),
    metal: new THREE.MeshStandardNodeMaterial({ metalness: 0.78, roughness: 0.31, side: THREE.DoubleSide }),
    steel: new THREE.MeshStandardNodeMaterial({ color: 0xaeb8b5, metalness: 0.88, roughness: 0.23 }),
    darkSteel: new THREE.MeshStandardNodeMaterial({ color: 0x353c3c, metalness: 0.72, roughness: 0.36 }),
    plant: new THREE.MeshStandardNodeMaterial({ color: 0x66716f, metalness: 0.55, roughness: 0.48 }),
    stone: new THREE.MeshStandardNodeMaterial({ color: 0x9b9a90, roughness: 0.76 }),
    paving: new THREE.MeshStandardNodeMaterial({ roughness: 0.78, side: THREE.DoubleSide }),
    fibre: new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide, toneMapped: false }),
    accent: new THREE.MeshStandardNodeMaterial({ color: 0x6d8383, metalness: 0.55, roughness: 0.30 }),
    warmLight: new THREE.MeshStandardNodeMaterial({ color: 0x9c8256, roughness: 0.35 }),
    entranceGlass: new THREE.MeshStandardNodeMaterial({ color: 0x789e9b, transparent: true, opacity: 0.42, depthWrite: false,
      metalness: 0.22, roughness: 0.15, side: THREE.DoubleSide })
  };
  for (const key of ['glass', 'metal', 'paving']) materials[key].colorNode = attribute('color', 'vec3');
  materials.glass.emissiveNode = color(0xffd5a0).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.65);
  materials.fibre.colorNode = attribute('color', 'vec3').mul(nightAmount().mul(1.65));
  materials.steel.emissiveNode = color(0xd7eeff).mul(nightAmount()).mul(0.045);
  materials.accent.emissiveNode = color(0xb9e5e7).mul(nightAmount()).mul(0.48);
  materials.warmLight.emissiveNode = color(0xffd293).mul(nightAmount().mul(0.9).add(0.02));

  const tower = new THREE.Group(); tower.position.set(CHEUNG_KONG_SITE.x, 0, CHEUNG_KONG_SITE.z); tower.rotation.y = CHEUNG_KONG_SITE.ry;
  tower.name = 'CheungKongChamferedSquareTower'; group.add(tower);
  const lobby = createLobby(); meshStore(tower, lobby.glass, materials.glass, 'CheungKongRoundedDoubleHeightGlassLobby');
  meshStore(tower, lobby.frames, materials.metal, 'CheungKongLobbyTransoms'); merged(tower, lobby.fins, materials.steel, 'CheungKongLobbyRoundedCornerMullions');
  const facade = createOfficeFacade(); meshStore(tower, facade.glass, materials.glass, 'CheungKongUniformBlueGreenGlassPanels');
  meshStore(tower, facade.metal, materials.metal, 'CheungKongSpandrelsAndPanelTransoms');
  meshStore(tower, facade.shades, materials.metal, 'CheungKongProjectingAerofoilSunshades');
  meshStore(tower, facade.fibres, materials.fibre, 'CheungKongNightOpticalFibreSparkles', false);
  merged(tower, facade.louvres, materials.darkSteel, 'CheungKongLowerMechanicalFloorLouvres');
  merged(tower, facade.shadeLips, materials.steel, 'CheungKongSunshadeOuterLips'); merged(tower, facade.brackets, materials.steel, 'CheungKongSunshadeBrackets');
  const fins = createContinuousFins(); merged(tower, fins.fins, materials.steel, 'CheungKongContinuousStainlessSteelVerticalFins');
  const roof = createRoof(); meshStore(tower, roof.walls, materials.metal, 'CheungKongRecessedRoofPlantAndParapet');
  meshStore(tower, roof.deck, materials.metal, 'CheungKongFlatRoofDeck'); merged(tower, roof.louvres, materials.darkSteel, 'CheungKongCrownVentilationSlats');
  merged(tower, roof.caps, materials.steel, 'CheungKongThinRoofCoping'); merged(tower, roof.accents, materials.accent, 'CheungKongRoofFibreOutline', false);
  for (const [index, position] of [[-8, -5], [7, 4], [0, 10]].entries()) {
    localBox(tower, materials.plant, `CheungKongRoofPlantEnclosure${index + 1}`, [position[0], 281.90, position[1]], [7.5, 1.0, 5.0]);
  }
  meshStore(group, triangulatedRoof(CHEUNG_KONG_SITE.ring.slice(0, -2), 0.04, [0.42, 0.43, 0.39]), materials.paving, 'CheungKongExactOsmLobbyFloor');
  const entranceColliders = createEntrance(group, materials);
  const colliders = [
    ...cheungKongRingColliders(CHEUNG_KONG_LOBBY_RING, 0, CHEUNG_KONG_LOBBY_HEIGHT, 0.75),
    ...cheungKongRingColliders(CHEUNG_KONG_VISUAL_RING, CHEUNG_KONG_LOBBY_HEIGHT, CHEUNG_KONG_HEIGHT, 0.85),
    ...entranceColliders
  ];
  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }
  const landmark = { name: CHEUNG_KONG_SITE.name, englishName: CHEUNG_KONG_SITE.englishName,
    position: { x: CHEUNG_KONG_SITE.x, y: groundOffset, z: CHEUNG_KONG_SITE.z }, radius: 62, height: CHEUNG_KONG_HEIGHT };
  const stats = {
    cheungKongGroundOffset: groundOffset, cheungKongLandmarks: 1,
    cheungKongOsmHeight: CHEUNG_KONG_OSM_HEIGHT, cheungKongHeight: CHEUNG_KONG_HEIGHT, cheungKongToTipHeight: CHEUNG_KONG_TO_TIP_HEIGHT,
    cheungKongOsmLevels: CHEUNG_KONG_OSM_LEVELS, cheungKongLevels: CHEUNG_KONG_LEVELS,
    cheungKongConventionalLevels: CHEUNG_KONG_CONVENTIONAL_LEVELS, cheungKongTopLevelLabel: CHEUNG_KONG_TOP_LEVEL_LABEL,
    cheungKongBelowGroundLevels: CHEUNG_KONG_BELOW_GROUND_LEVELS,
    cheungKongPanelWidth: CHEUNG_KONG_PANEL_WIDTH, cheungKongPanelHeight: CHEUNG_KONG_PANEL_HEIGHT,
    cheungKongStructuralPlan: CHEUNG_KONG_STRUCTURAL_PLAN, cheungKongChamfer: CHEUNG_KONG_CHAMFER,
    cheungKongVisionPanels: facade.visionPanels, cheungKongLobbyPanels: lobby.panels,
    cheungKongFibrePoints: facade.fibrePoints, cheungKongSunshades: facade.sunshades,
    cheungKongVerticalFins: fins.count, cheungKongLouvreSlats: facade.louvreSlats + roof.crownSlats,
    cheungKongRoofPlantEnclosures: 3, cheungKongColliders: colliders.length
  };
  group.userData.stats = stats;
  return { group, colliders, landmarks: [landmark], stats, groundOffset, plazaTop: groundOffset + CHEUNG_KONG_PLAZA_TOP };
}
