import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  K11_ATELIER_SITE, K11_ATELIER_OSM_HEIGHT, K11_ATELIER_OFFICIAL_APPROX_HEIGHT,
  K11_ATELIER_DESIGN_REPORT_HEIGHT, K11_ATELIER_WIKIPEDIA_HEIGHT, K11_ATELIER_HEIGHT,
  K11_ATELIER_TO_TIP_HEIGHT, K11_ATELIER_OCCUPIED_HEIGHT, K11_ATELIER_VISUAL_ROOF_DECK,
  K11_ATELIER_OSM_LEVELS, K11_ATELIER_LEVELS, K11_ATELIER_OFFICIAL_LEVELS,
  K11_ATELIER_REFUGE_LEVELS, K11_ATELIER_ME_LEVELS, K11_ATELIER_BELOW_GROUND_LEVELS,
  K11_ATELIER_LOBBY_HEIGHT, K11_ATELIER_PLAZA_TOP, K11_ATELIER_PANEL_TARGET_WIDTH,
  K11_ATELIER_VISUAL_LOUVRE_LEVELS, K11_ATELIER_CROSS_BRACED_EDGES, K11_ATELIER_LOBBY_RING, K11_ATELIER_TIERS,
  K11_ATELIER_CROWN_RING, K11_ATELIER_GROUND_VEHICLE_PORTAL_EDGES, K11_ATELIER_ENTRANCE_EDGE, K11_ATELIER_ENTRANCE,
  k11AtelierFloorY, k11AtelierEdgeOutward, k11AtelierRingColliders
} from './k11-atelier-architecture.js';

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
function localBox(group, material, name, position, size) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.position.set(...position); mesh.name = name;
  mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function triangulatedRoof(ring, y, tint) {
  const result = store(), points = [];
  for (let i = 0; i + 1 < ring.length; i += 2) points.push(new THREE.Vector2(ring[i], ring[i + 1]));
  for (const face of THREE.ShapeUtils.triangulateShape(points, [])) {
    const [a, b, c] = face.map((index) => [points[index].x, y, points[index].y]); triangle(result, a, b, c, tint);
  }
  return result;
}
function edgeBox(parts, ring, edge, t, y, offset, width, height, depth, tint = null) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const { nx, nz, ry } = k11AtelierEdgeOutward(ring, edge);
  const g = new THREE.BoxGeometry(width, height, depth);
  g.rotateY(ry); g.translate(lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset);
  if (tint) {
    const colors = new Float32Array(g.attributes.position.count * 3);
    for (let j = 0; j < colors.length; j += 3) colors.set(tint, j);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }
  parts.push(g);
}
function beam(parts, a, b, thickness = 0.12) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
  const length = direction.length(); if (length < 1e-6) return;
  const g = new THREE.BoxGeometry(thickness, length, thickness);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  g.translate((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5); parts.push(g);
}
function bayCount(length) { return Math.max(1, Math.round(length / K11_ATELIER_PANEL_TARGET_WIDTH)); }
function worldCollider(cx, cz, w, d, ry, minY, maxY) {
  const cs = Math.cos(ry), sn = Math.sin(ry), hx = w * 0.5, hz = d * 0.5;
  return { minX: cx - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: cx + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: cz - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: cz + Math.abs(sn) * hx + Math.abs(cs) * hz,
    minY, maxY, obb: { cx, cz, hx, hz, cs, sn } };
}

function createLobby() {
  const ring = K11_ATELIER_LOBBY_RING, glass = store(), bronze = [], stone = [], lintels = [];
  const portals = new Set(K11_ATELIER_GROUND_VEHICLE_PORTAL_EDGES), edgeCount = ring.length / 2 - 1;
  let panels = 0, piers = 0;
  for (let edge = 0; edge < edgeCount; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = k11AtelierEdgeOutward(ring, edge), bays = bayCount(length);
    const point = (t, y, offset = 0.05) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    if (portals.has(edge)) {
      edgeBox(lintels, ring, edge, 0.5, K11_ATELIER_LOBBY_HEIGHT - 0.28, 0.16, length + 0.08, 0.56, 0.48,
        [0.61, 0.58, 0.49]);
      continue;
    }
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays + 0.001, t1 = (bay + 1) / bays - 0.001, middle = (t0 + t1) * 0.5;
      const entranceOpening = edge === K11_ATELIER_ENTRANCE_EDGE && Math.abs((middle - 0.5) * length) < 3.65;
      if (!entranceOpening) {
        quad(glass, point(t0, 0.20), point(t1, 0.20), point(t1, K11_ATELIER_LOBBY_HEIGHT - 0.16), point(t0, K11_ATELIER_LOBBY_HEIGHT - 0.16),
          tintMix([0.07, 0.12, 0.13], [0.23, 0.29, 0.28], hash(edge, bay)), 0.012); panels++;
        for (const y of [3.05, 6.05, K11_ATELIER_LOBBY_HEIGHT - 0.18]) {
          edgeBox(bronze, ring, edge, middle, y, 0.14, (t1 - t0) * length, 0.075, 0.14);
        }
      }
      const entrancePierVoid = edge === K11_ATELIER_ENTRANCE_EDGE && Math.abs((bay / bays - 0.5) * length) < 3.55;
      if (!entrancePierVoid && (bay > 0 || !portals.has((edge + edgeCount - 1) % edgeCount))) {
        const major = bay % 3 === 0 || length < 2;
        edgeBox(stone, ring, edge, bay / bays, K11_ATELIER_LOBBY_HEIGHT * 0.5, 0.24,
          major ? 0.48 : 0.26, K11_ATELIER_LOBBY_HEIGHT - 0.06, major ? 0.58 : 0.36,
          tintMix([0.57, 0.54, 0.46], [0.79, 0.75, 0.64], hash(edge, bay, 5))); piers++;
      }
    }
  }
  return { glass, bronze, stone, lintels, panels, piers, portals: portals.size };
}

function createOfficeFacade() {
  const glass = store(), spandrels = store(), bronze = [], stone = [], louvres = [], braces = [];
  const louvreLevels = new Set(K11_ATELIER_VISUAL_LOUVRE_LEVELS), bracedEdges = new Set(K11_ATELIER_CROSS_BRACED_EDGES);
  let visionPanels = 0, spandrelPanels = 0, stoneCourses = 0, louvreSlats = 0, diagonalBraces = 0;
  for (const [tierIndex, tier] of K11_ATELIER_TIERS.entries()) {
    const ring = tier.ring;
    for (let level = tier.firstLevel; level <= tier.lastLevel; level++) {
      const y0 = k11AtelierFloorY(level - 1), y1 = k11AtelierFloorY(level), isLouvre = louvreLevels.has(level);
      for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
        const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
        const { nx, nz, length } = k11AtelierEdgeOutward(ring, edge), bays = bayCount(length);
        const point = (t, y, offset = 0.05) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
        for (let bay = 0; bay < bays; bay++) {
          const t0 = bay / bays + 0.0008, t1 = (bay + 1) / bays - 0.0008, middle = (t0 + t1) * 0.5;
          if (isLouvre) {
            quad(spandrels, point(t0, y0 + 0.04), point(t1, y0 + 0.04), point(t1, y1 - 0.04), point(t0, y1 - 0.04), [0.025, 0.032, 0.033]);
            for (let slat = 0; slat < 10; slat++) {
              const y = y0 + (slat + 0.5) * (y1 - y0) / 10;
              edgeBox(louvres, ring, edge, middle, y, 0.16, (t1 - t0) * length, 0.095, 0.24); louvreSlats++;
            }
          } else {
            const spandrelTop = y0 + 0.82;
            quad(spandrels, point(t0, y0 + 0.04), point(t1, y0 + 0.04), point(t1, spandrelTop), point(t0, spandrelTop),
              tintMix([0.018, 0.027, 0.033], [0.08, 0.12, 0.14], hash(tierIndex, level, edge, bay))); spandrelPanels++;
            const variation = hash(level + 11, edge + 23, bay + 37, tierIndex + 49);
            const lit = variation > 0.865 ? 0.12 + hash(bay, level, edge, tierIndex) * 0.28 : 0;
            quad(glass, point(t0, spandrelTop + 0.04), point(t1, spandrelTop + 0.04), point(t1, y1 - 0.07), point(t0, y1 - 0.07),
              tintMix([0.055, 0.085, 0.095], [0.27, 0.32, 0.32], 0.20 + variation * 0.62), lit); visionPanels++;
            for (const y of [spandrelTop, Math.min(y1 - 0.16, y0 + 2.92)]) {
              edgeBox(bronze, ring, edge, middle, y, 0.14, (t1 - t0) * length, 0.065, 0.14);
            }
          }
          const major = length < 2 || bay % 4 === 0;
          edgeBox(stone, ring, edge, bay / bays, (y0 + y1) * 0.5, major ? 0.28 : 0.22,
            major ? 0.42 : 0.20, y1 - y0 - 0.055, major ? 0.56 : 0.34,
            tintMix([0.54, 0.52, 0.45], [0.82, 0.78, 0.67], hash(edge, bay, level, 17))); stoneCourses++;
        }
        if (bracedEdges.has(edge) && !isLouvre) {
          beam(braces, point(0.07, y0 + 0.16, 0.31), point(0.93, y1 - 0.16, 0.31));
          beam(braces, point(0.93, y0 + 0.16, 0.31), point(0.07, y1 - 0.16, 0.31)); diagonalBraces += 2;
        }
      }
    }
  }
  return { glass, spandrels, bronze, stone, louvres, braces, visionPanels, spandrelPanels, stoneCourses, louvreSlats, diagonalBraces };
}

function createSetbacks() {
  const decks = [], parapets = [];
  for (const tier of K11_ATELIER_TIERS.slice(0, -1)) {
    const y = k11AtelierFloorY(tier.lastLevel), ring = tier.ring;
    decks.push(triangulatedRoof(ring.slice(0, -2), y + 0.025, [0.12, 0.13, 0.12]));
    for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
      const { length } = k11AtelierEdgeOutward(ring, edge);
      edgeBox(parapets, ring, edge, 0.5, y + 0.43, 0.06, length, 0.82, 0.20, [0.60, 0.58, 0.50]);
    }
  }
  return { decks, parapets };
}

function createCrown() {
  const ring = K11_ATELIER_CROWN_RING, glass = store(), spandrels = store(), stone = [], bronze = [], louvres = [];
  let panels = 0, fins = 0;
  const rows = 4, rowHeight = (K11_ATELIER_VISUAL_ROOF_DECK - K11_ATELIER_OCCUPIED_HEIGHT) / rows;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = k11AtelierEdgeOutward(ring, edge), bays = bayCount(length);
    const point = (t, y, offset = 0.05) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays + 0.0008, t1 = (bay + 1) / bays - 0.0008;
      for (let row = 0; row < rows; row++) {
        const y0 = K11_ATELIER_OCCUPIED_HEIGHT + row * rowHeight, y1 = y0 + rowHeight;
        quad(glass, point(t0, y0 + 0.10), point(t1, y0 + 0.10), point(t1, y1 - 0.10), point(t0, y1 - 0.10),
          tintMix([0.035, 0.055, 0.065], [0.18, 0.23, 0.24], hash(edge, bay, row)), row === 1 && bay % 3 === 0 ? 0.06 : 0); panels++;
        edgeBox(bronze, ring, edge, (t0 + t1) * 0.5, y0 + 0.06, 0.14, (t1 - t0) * length, 0.075, 0.15);
      }
      const major = length < 2 || bay % 3 === 0;
      edgeBox(stone, ring, edge, bay / bays, (K11_ATELIER_OCCUPIED_HEIGHT + K11_ATELIER_TO_TIP_HEIGHT) * 0.5,
        0.28, major ? 0.44 : 0.23, K11_ATELIER_TO_TIP_HEIGHT - K11_ATELIER_OCCUPIED_HEIGHT, major ? 0.58 : 0.36,
        [0.72, 0.69, 0.59]); fins++;
    }
    for (let slat = 0; slat < 6; slat++) {
      const y = lerp(K11_ATELIER_VISUAL_ROOF_DECK - 2.1, K11_ATELIER_VISUAL_ROOF_DECK - 0.25, (slat + 0.5) / 6);
      edgeBox(louvres, ring, edge, 0.5, y, 0.17, length, 0.10, 0.23);
    }
    edgeBox(stone, ring, edge, 0.5, (K11_ATELIER_VISUAL_ROOF_DECK + K11_ATELIER_HEIGHT) * 0.5, 0.05,
      length, K11_ATELIER_HEIGHT - K11_ATELIER_VISUAL_ROOF_DECK, 0.24, [0.62, 0.60, 0.52]);
  }
  return { glass, spandrels, stone, bronze, louvres, panels, fins,
    deck: triangulatedRoof(ring.slice(0, -2), K11_ATELIER_VISUAL_ROOF_DECK, [0.11, 0.12, 0.115]) };
}

function signTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 192;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#202524'; ctx.fillRect(0, 0, 1024, 192);
  ctx.textAlign = 'center'; ctx.fillStyle = '#d8c8a6'; ctx.font = '500 62px sans-serif'; ctx.fillText('K11 ATELIER', 512, 115);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function lobbyArtTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 1152; canvas.height = 512;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#e9e5da'; ctx.fillRect(0, 0, 1152, 512);
  for (let panel = 0; panel < 3; panel++) {
    const x = panel * 384; ctx.fillStyle = panel === 1 ? '#ded9ca' : '#eeeae0'; ctx.fillRect(x + 8, 8, 368, 496);
    ctx.strokeStyle = '#252824'; ctx.lineCap = 'round';
    for (let stroke = 0; stroke < 9; stroke++) {
      ctx.lineWidth = 7 + ((stroke * 13 + panel * 7) % 24); ctx.beginPath();
      ctx.moveTo(x + 45 + stroke * 9, 390 - stroke * 19);
      ctx.bezierCurveTo(x + 80 + panel * 25, 90 + stroke * 13, x + 265 - stroke * 6, 430 - stroke * 21,
        x + 318 - stroke * 8, 108 + stroke * 22); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(80,75,62,.35)'; ctx.lineWidth = 2; ctx.strokeRect(x + 8, 8, 368, 496);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function createEntrance(group, materials) {
  const entrance = new THREE.Group(); entrance.position.set(K11_ATELIER_ENTRANCE.x, 0, K11_ATELIER_ENTRANCE.z);
  entrance.rotation.y = K11_ATELIER_ENTRANCE.ry; entrance.name = 'K11AtelierSalisburyRoadLobbyEntrance'; group.add(entrance);
  localBox(entrance, materials.entranceGlass, 'K11AtelierLobbyGlazedDoors', [0, 2.35, 0.10], [7.2, 4.7, 0.16]);
  for (const x of [-3.6, -1.8, 0, 1.8, 3.6]) localBox(entrance, materials.bronze, 'K11AtelierEntranceDoorStile', [x, 2.35, 0.20], [0.09, 4.7, 0.12]);
  for (const y of [0.12, 2.5, 4.7]) localBox(entrance, materials.bronze, 'K11AtelierEntranceDoorTransom', [0, y, 0.20], [7.3, 0.09, 0.12]);
  localBox(entrance, materials.bronze, 'K11AtelierFlatBronzeEntranceCanopy', [0, 5.25, 1.75], [10.2, 0.24, 3.7]);
  localBox(entrance, materials.bronze, 'K11AtelierCanopyFrontFascia', [0, 5.12, 3.56], [10.2, 0.42, 0.16]);
  for (const x of [-4.55, 4.55]) {
    localBox(entrance, materials.stoneSolid, 'K11AtelierEntranceLimestoneColumn', [x, 2.55, 2.85], [0.52, 5.1, 0.62]);
    localBox(entrance, materials.stoneSolid, 'K11AtelierEntranceColumnBase', [x, 0.24, 2.85], [0.78, 0.48, 0.86]);
  }
  for (const x of [-3.2, -1.6, 0, 1.6, 3.2]) localBox(entrance, materials.warmLight, 'K11AtelierCanopyDownlight', [x, 5.10, 1.9], [0.28, 0.06, 0.28]);
  localBox(entrance, materials.stoneSolid, 'K11AtelierEntranceThreshold', [0, 0.06, 1.15], [8.2, 0.12, 2.5]);
  localBox(entrance, materials.darkSteel, 'K11AtelierEntranceSignBacking', [0, 4.08, 0.28], [6.8, 1.34, 0.08]);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 1.22), new THREE.MeshBasicMaterial({ map: signTexture(), toneMapped: false }));
  sign.position.set(0, 4.08, 0.34); sign.name = 'K11AtelierEntranceIdentification'; entrance.add(sign);

  // ArchDaily's lobby photographs show a pale floor, timber wall, triptych ink art and slim security gates.
  // These are visible through the glazed entrance; no photograph is used as a texture.
  localBox(entrance, materials.lobbyWhite, 'K11AtelierLobbyPaleStoneFloor', [0, 0.06, -4.5], [10, 0.12, 9]);
  localBox(entrance, materials.lobbyWhite, 'K11AtelierLobbyArtWall', [0, 2.9, -8.9], [10, 5.8, 0.22]);
  localBox(entrance, materials.timber, 'K11AtelierLobbyTimberWall', [4.88, 2.9, -4.5], [0.24, 5.8, 9]);
  localBox(entrance, materials.lobbyWhite, 'K11AtelierLobbySuspendedCeiling', [0, 5.75, -4.5], [10, 0.18, 9]);
  localBox(entrance, materials.warmLight, 'K11AtelierLobbyRearCoveLight', [0, 5.56, -8.65], [9.4, 0.10, 0.14]);
  localBox(entrance, materials.warmLight, 'K11AtelierLobbySideCoveLight', [4.65, 5.56, -4.5], [0.14, 0.10, 8.4]);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 2.65), new THREE.MeshStandardNodeMaterial({ map: lobbyArtTexture(), roughness: 0.92 }));
  art.position.set(0, 3.25, -8.77); art.name = 'K11AtelierLobbyProceduralTriptychInkArt'; entrance.add(art);
  localBox(entrance, materials.darkSteel, 'K11AtelierLobbyReceptionDesk', [3.55, 0.68, -6.7], [2.1, 1.36, 1.15]);
  const cabinets = [], wings = [];
  for (const x of [-3.75, -2.25, -0.75, 0.75, 2.25, 3.75]) {
    const g = new THREE.BoxGeometry(0.26, 1.16, 1.45); g.translate(x, 0.70, -3.9); cabinets.push(g);
  }
  for (const x of [-3, -1.5, 0, 1.5, 3]) {
    const g = new THREE.BoxGeometry(0.06, 0.82, 0.75); g.translate(x, 0.79, -3.72); wings.push(g);
  }
  merged(entrance, cabinets, materials.darkSteel, 'K11AtelierLobbySecurityGateCabinets');
  merged(entrance, wings, materials.entranceGlass, 'K11AtelierLobbySecurityGateGlassWings', false);

  const colliders = [], cs = Math.cos(K11_ATELIER_ENTRANCE.ry), sn = Math.sin(K11_ATELIER_ENTRANCE.ry);
  const convert = (x, z) => ({ x: K11_ATELIER_ENTRANCE.x + cs * x + sn * z, z: K11_ATELIER_ENTRANCE.z - sn * x + cs * z });
  const add = (x, z, w, d, minY, maxY) => { const p = convert(x, z); colliders.push(worldCollider(p.x, p.z, w, d, K11_ATELIER_ENTRANCE.ry, minY, maxY)); };
  add(0, 0.10, 7.3, 0.36, 0, 4.8); add(0, 1.75, 10.3, 3.8, 5.0, 5.55);
  for (const x of [-4.55, 4.55]) add(x, 2.85, 0.78, 0.86, 0, 5.2);
  add(0, -8.9, 10, 0.30, 0, 5.9); add(4.88, -4.5, 0.30, 9, 0, 5.9); add(0, -4.5, 10, 9, 5.6, 5.9);
  add(3.55, -6.7, 2.1, 1.15, 0, 1.4);
  for (const x of [-3.75, -2.25, -0.75, 0.75, 2.25, 3.75]) add(x, -3.9, 0.30, 1.45, 0, 1.2);
  for (const x of [-3, -1.5, 0, 1.5, 3]) add(x, -3.72, 0.12, 0.75, 0, 1.2);
  return colliders;
}

export function buildK11Atelier(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'K11AtelierAuthoredSteppedLandmark'; group.userData.internalId = 'HK-B0010';
  group.position.y = groundOffset; root.add(group);
  const materials = {
    glass: new THREE.MeshStandardNodeMaterial({ metalness: 0.62, roughness: 0.20, envMapIntensity: 1.05, side: THREE.DoubleSide }),
    spandrel: new THREE.MeshStandardNodeMaterial({ metalness: 0.58, roughness: 0.32, side: THREE.DoubleSide }),
    stone: new THREE.MeshStandardNodeMaterial({ roughness: 0.82, metalness: 0.02 }),
    stoneSolid: new THREE.MeshStandardNodeMaterial({ color: 0xbcb39d, roughness: 0.82, metalness: 0.02 }),
    bronze: new THREE.MeshStandardNodeMaterial({ color: 0x76644a, metalness: 0.78, roughness: 0.30 }),
    darkSteel: new THREE.MeshStandardNodeMaterial({ color: 0x2b3030, metalness: 0.66, roughness: 0.40 }),
    roof: new THREE.MeshStandardNodeMaterial({ roughness: 0.76, side: THREE.DoubleSide }),
    warmLight: new THREE.MeshStandardNodeMaterial({ color: 0x9c8054, roughness: 0.38 }),
    lobbyWhite: new THREE.MeshStandardNodeMaterial({ color: 0xd8d4c8, roughness: 0.76 }),
    timber: new THREE.MeshStandardNodeMaterial({ color: 0x756048, roughness: 0.82 }),
    entranceGlass: new THREE.MeshStandardNodeMaterial({ color: 0x718b87, transparent: true, opacity: 0.44, depthWrite: false,
      metalness: 0.20, roughness: 0.17, side: THREE.DoubleSide })
  };
  for (const key of ['glass', 'spandrel', 'stone', 'roof']) materials[key].colorNode = attribute('color', 'vec3');
  materials.glass.emissiveNode = color(0xffd7a5).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.58);
  materials.warmLight.emissiveNode = color(0xffd292).mul(nightAmount().mul(1.2).add(0.02));
  materials.entranceGlass.emissiveNode = color(0xffd7a5).mul(nightAmount()).mul(0.025);
  materials.lobbyWhite.emissiveNode = color(0xffe2b8).mul(nightAmount()).mul(0.035);

  const tower = new THREE.Group(); tower.position.set(K11_ATELIER_SITE.x, 0, K11_ATELIER_SITE.z); tower.rotation.y = K11_ATELIER_SITE.ry;
  tower.name = 'K11AtelierExactSourceAndFiveSetbackTiers'; group.add(tower);
  const lobby = createLobby(); meshStore(tower, lobby.glass, materials.glass, 'K11AtelierDoubleHeightLobbyGlass');
  merged(tower, lobby.bronze, materials.bronze, 'K11AtelierLobbyBronzeTransoms'); merged(tower, lobby.stone, materials.stone, 'K11AtelierLobbyLimestonePiers');
  merged(tower, lobby.lintels, materials.stone, 'K11AtelierSurfaceRoadPortalLintels');
  meshStore(tower, triangulatedRoof(K11_ATELIER_LOBBY_RING.slice(0, -2), K11_ATELIER_LOBBY_HEIGHT, [0.08, 0.09, 0.085]), materials.roof, 'K11AtelierNineMetreLobbySoffit');
  const facade = createOfficeFacade(); meshStore(tower, facade.glass, materials.glass, 'K11AtelierPanoramicGlassInsets');
  meshStore(tower, facade.spandrels, materials.spandrel, 'K11AtelierDarkIntegratedSpandrels');
  merged(tower, facade.bronze, materials.bronze, 'K11AtelierBronzeWindowTrims'); merged(tower, facade.stone, materials.stone, 'K11AtelierContinuousPortugueseLimestonePiers');
  merged(tower, facade.louvres, materials.darkSteel, 'K11AtelierRefugeAndPlantVisualLouvreBands');
  merged(tower, facade.braces, materials.darkSteel, 'K11AtelierRecessedCornerDiagonalBraces');
  const setbacks = createSetbacks(); for (const [index, deck] of setbacks.decks.entries()) meshStore(tower, deck, materials.roof, `K11AtelierSetbackRoofDeck${index + 1}`);
  merged(tower, setbacks.parapets, materials.stone, 'K11AtelierFourSteppedRoofParapets');
  const crown = createCrown(); meshStore(tower, crown.glass, materials.glass, 'K11AtelierRecessedCrownGlazing');
  merged(tower, crown.bronze, materials.bronze, 'K11AtelierCrownBronzeTransoms'); merged(tower, crown.stone, materials.stone, 'K11AtelierProjectingCrownLimestoneFins');
  merged(tower, crown.louvres, materials.darkSteel, 'K11AtelierCrownVentilationSlats'); meshStore(tower, crown.deck, materials.roof, 'K11AtelierArchitecturalRoofDeck');
  for (const [index, position] of [[-5, 0], [4, 3], [0, -6]].entries()) {
    localBox(tower, materials.darkSteel, `K11AtelierRoofPlantEnclosure${index + 1}`, [position[0], 271.55, position[1]], [5.2, 1.5, 4.0]);
  }
  const entranceColliders = createEntrance(group, materials);
  const colliders = [
    ...k11AtelierRingColliders(K11_ATELIER_LOBBY_RING, 0, K11_ATELIER_LOBBY_HEIGHT, 0.85, K11_ATELIER_GROUND_VEHICLE_PORTAL_EDGES),
    ...K11_ATELIER_TIERS.flatMap((tier) => k11AtelierRingColliders(tier.ring, k11AtelierFloorY(tier.firstLevel - 1), k11AtelierFloorY(tier.lastLevel), 0.85)),
    ...k11AtelierRingColliders(K11_ATELIER_CROWN_RING, K11_ATELIER_OCCUPIED_HEIGHT, K11_ATELIER_TO_TIP_HEIGHT, 0.85),
    ...entranceColliders
  ];
  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }
  const landmark = { name: K11_ATELIER_SITE.name, englishName: K11_ATELIER_SITE.englishName,
    position: { x: K11_ATELIER_SITE.x, y: groundOffset, z: K11_ATELIER_SITE.z }, radius: 78, height: K11_ATELIER_TO_TIP_HEIGHT };
  const stats = {
    k11AtelierGroundOffset: groundOffset, k11AtelierLandmarks: 1,
    k11AtelierOsmHeight: K11_ATELIER_OSM_HEIGHT, k11AtelierOfficialApproxHeight: K11_ATELIER_OFFICIAL_APPROX_HEIGHT,
    k11AtelierDesignReportHeight: K11_ATELIER_DESIGN_REPORT_HEIGHT, k11AtelierWikipediaHeight: K11_ATELIER_WIKIPEDIA_HEIGHT,
    k11AtelierHeight: K11_ATELIER_HEIGHT, k11AtelierToTipHeight: K11_ATELIER_TO_TIP_HEIGHT, k11AtelierOccupiedHeight: K11_ATELIER_OCCUPIED_HEIGHT,
    k11AtelierOsmLevels: K11_ATELIER_OSM_LEVELS, k11AtelierLevels: K11_ATELIER_LEVELS, k11AtelierOfficialLevels: K11_ATELIER_OFFICIAL_LEVELS,
    k11AtelierRefugeLevels: K11_ATELIER_REFUGE_LEVELS, k11AtelierMeLevels: K11_ATELIER_ME_LEVELS, k11AtelierBelowGroundLevels: K11_ATELIER_BELOW_GROUND_LEVELS,
    k11AtelierSourceVertices: K11_ATELIER_SITE.localRing.length / 2, k11AtelierSetbackTiers: K11_ATELIER_TIERS.length,
    k11AtelierLobbyPanels: lobby.panels, k11AtelierVisionPanels: facade.visionPanels, k11AtelierCrownPanels: crown.panels,
    k11AtelierSpandrelPanels: facade.spandrelPanels, k11AtelierLimestoneCourses: facade.stoneCourses + lobby.piers,
    k11AtelierCrownFins: crown.fins, k11AtelierLouvreSlats: facade.louvreSlats + crown.louvres.length,
    k11AtelierDiagonalBraces: facade.diagonalBraces,
    k11AtelierGroundVehiclePortals: lobby.portals, k11AtelierLobbySoffit: K11_ATELIER_LOBBY_HEIGHT,
    k11AtelierRoofPlantEnclosures: 3, k11AtelierLobbySecurityGates: 5, k11AtelierLobbyTriptychPanels: 3,
    k11AtelierColliders: colliders.length
  };
  group.userData.stats = stats;
  return { group, colliders, landmarks: [landmark], stats, groundOffset, plazaTop: groundOffset + K11_ATELIER_PLAZA_TOP };
}
