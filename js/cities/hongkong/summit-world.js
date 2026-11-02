import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  THE_SUMMIT_SITE, THE_SUMMIT_TOWER_RING, THE_SUMMIT_PODIUM_RING, THE_SUMMIT_OSM_HEIGHT,
  THE_SUMMIT_HEIGHT, THE_SUMMIT_TO_TIP_HEIGHT, THE_SUMMIT_OSM_LEVELS, THE_SUMMIT_LEVELS,
  THE_SUMMIT_BELOW_GROUND_LEVELS, THE_SUMMIT_TOWER_GFA, THE_SUMMIT_ELEVATORS, THE_SUMMIT_UNITS,
  THE_SUMMIT_COMPLETED_YEAR, THE_SUMMIT_CTBUH_CONSTRUCTION_START_YEAR, THE_SUMMIT_WIKIPEDIA_LEVELS,
  THE_SUMMIT_WIKIPEDIA_CONSTRUCTION_START_YEAR, THE_SUMMIT_WIKIPEDIA_COMPLETED_YEAR,
  THE_SUMMIT_PLAZA_TOP, THE_SUMMIT_PODIUM_HEIGHT, THE_SUMMIT_MAIN_ROOF,
  THE_SUMMIT_VISUAL_SHAFT_COURSES, THE_SUMMIT_PANEL_TARGET_WIDTH, THE_SUMMIT_METAL_CORE_EDGES,
  THE_SUMMIT_SADDLE_EDGES, THE_SUMMIT_ROOF_ZONES, THE_SUMMIT_ENTRANCE, THE_SUMMIT_ENTRANCE_SOURCE_NODE,
  summitFloorY, summitRoofYForEdge, summitEdgeOutward, summitLocalToWorld, summitRingColliders
} from './summit-architecture.js';

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
function edgeBox(parts, ring, edge, t, y, offset, width, height, depth) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const { nx, nz, ry } = summitEdgeOutward(ring, edge);
  box(parts, [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset], [width, height, depth], ry);
}
function worldCollider(cx, cz, w, d, ry, minY, maxY) {
  const cs = Math.cos(ry), sn = Math.sin(ry), hx = w * 0.5, hz = d * 0.5;
  return { minX: cx - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: cx + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: cz - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: cz + Math.abs(sn) * hx + Math.abs(cs) * hz,
    minY, maxY, obb: { cx, cz, hx, hz, cs, sn } };
}

function createShaft() {
  const ring = THE_SUMMIT_TOWER_RING, glass = store(), metal = store(), crown = store(), roofs = store(), roofSteps = store();
  const mullions = [], floorBands = [], saddleChannels = [], crownLouvres = [], coping = [];
  const metalEdges = new Set(THE_SUMMIT_METAL_CORE_EDGES), saddleEdges = new Set(THE_SUMMIT_SADDLE_EDGES);
  let glassPanels = 0, metalPanels = 0, roofTriangles = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = summitEdgeOutward(ring, edge), bays = Math.max(1, Math.round(length / THE_SUMMIT_PANEL_TARGET_WIDTH));
    const roofY = summitRoofYForEdge(edge), coreMetal = metalEdges.has(edge);
    const point = (t, y, offset = 0.05) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    for (let course = 0; course < THE_SUMMIT_VISUAL_SHAFT_COURSES; course++) {
      const y0 = summitFloorY(course), y1 = summitFloorY(course + 1);
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + 0.001, t1 = (bay + 1) / bays - 0.001;
        const variation = hash(edge, bay, course, 15), lit = hash(edge, bay, course, 82) > 0.79 ? 0.18 + variation * 0.62 : 0;
        const coreGlassStrip = coreMetal && edge % 6 === 2 && bay === 0;
        const target = coreMetal && !coreGlassStrip ? metal : glass;
        const tint = target === metal
          ? mix([0.24, 0.33, 0.31], [0.43, 0.50, 0.45], variation)
          : mix([0.09, 0.25, 0.24], [0.26, 0.47, 0.43], 0.18 + variation * 0.66);
        quad(target, point(t0, y0 + 0.15), point(t1, y0 + 0.15), point(t1, y1 - 0.13), point(t0, y1 - 0.13), tint, target === glass ? lit : 0);
        if (target === metal) metalPanels++; else glassPanels++;
      }
      edgeBox(floorBands, ring, edge, 0.5, y0 + 0.04, 0.13, length + 0.035, course % 8 === 0 ? 0.17 : 0.09, 0.17);
    }
    for (let bay = 0; bay <= bays; bay++) {
      edgeBox(mullions, ring, edge, bay / bays, (THE_SUMMIT_PODIUM_HEIGHT + THE_SUMMIT_MAIN_ROOF) * 0.5,
        0.13, bay % 4 === 0 ? 0.085 : 0.045, THE_SUMMIT_MAIN_ROOF - THE_SUMMIT_PODIUM_HEIGHT, 0.15);
    }
    if (saddleEdges.has(edge)) edgeBox(saddleChannels, ring, edge, 0.5, (THE_SUMMIT_PODIUM_HEIGHT + THE_SUMMIT_MAIN_ROOF) * 0.5,
      0.20, length + 0.025, THE_SUMMIT_MAIN_ROOF - THE_SUMMIT_PODIUM_HEIGHT, 0.17);
    if (roofY > THE_SUMMIT_MAIN_ROOF + 0.01) {
      quad(crown, point(0, THE_SUMMIT_MAIN_ROOF, -0.01), point(1, THE_SUMMIT_MAIN_ROOF, -0.01),
        point(1, roofY, -0.01), point(0, roofY, -0.01), mix([0.19, 0.28, 0.27], [0.35, 0.42, 0.39], hash(edge, 2, 7)));
      for (let y = THE_SUMMIT_MAIN_ROOF + 0.32; y < roofY - 0.15; y += 0.62) beam(crownLouvres, point(0, y, 0.12), point(1, y, 0.12), 0.075, 0.19);
    }
    edgeBox(coping, ring, edge, 0.5, roofY - 0.12, 0.11, length + 0.02, 0.18, 0.27);
    triangle(roofs, [0, roofY, 0], [ax, roofY, az], [bx, roofY, bz], [0.20, 0.26, 0.25]); roofTriangles++;
    const previous = (edge + ring.length / 2 - 2) % (ring.length / 2 - 1), previousY = summitRoofYForEdge(previous);
    if (previousY !== roofY) {
      const low = Math.min(previousY, roofY), high = Math.max(previousY, roofY);
      quad(roofSteps, [0, low, 0], [ax, low, az], [ax, high, az], [0, high, 0], [0.25, 0.31, 0.29]);
    }
  }
  return { glass, metal, crown, roofs, roofSteps, mullions, floorBands, saddleChannels, crownLouvres, coping, glassPanels, metalPanels, roofTriangles };
}

function createPodium() {
  const ring = THE_SUMMIT_PODIUM_RING, glass = store(), lawn = store(), balustrade = store();
  const bands = [], pilotis = [], railPosts = [];
  let panels = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = summitEdgeOutward(ring, edge), bays = Math.max(1, Math.round(length / 1.65));
    const point = (t, y, offset = 0.04) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    const entranceVoid = (t, y) => y < 6.8 && ((edge === 16 && t > 0.44) || (edge === 17 && t < 0.56));
    for (let level = 0; level < 4; level++) {
      const y0 = level * 4.5, y1 = (level + 1) * 4.5;
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + 0.001, t1 = (bay + 1) / bays - 0.001;
        if (entranceVoid((t0 + t1) * 0.5, (y0 + y1) * 0.5)) continue;
        const variation = hash(edge, bay, level, 44), lit = hash(edge, bay, level, 45) > 0.76 ? 0.30 + variation * 0.45 : 0;
        quad(glass, point(t0, y0 + 0.34), point(t1, y0 + 0.34), point(t1, y1 - 0.32), point(t0, y1 - 0.32),
          mix([0.055, 0.18, 0.17], [0.16, 0.35, 0.31], variation), lit); panels++;
      }
      if (!((edge === 16 || edge === 17) && level < 2)) edgeBox(bands, ring, edge, 0.5, y0 + 0.16, 0.15, length + 0.05, 0.30, 0.28);
    }
    edgeBox(bands, ring, edge, 0.5, THE_SUMMIT_PODIUM_HEIGHT - 0.10, 0.17, length + 0.06, 0.46, 0.32);
    const innerX = ax / 1.08, innerZ = az / 1.08, innerBX = bx / 1.08, innerBZ = bz / 1.08;
    quad(lawn, [innerX, 18.035, innerZ], [innerBX, 18.035, innerBZ], [bx, 18.035, bz], [ax, 18.035, az], [0.16, 0.29, 0.13]);
    quad(balustrade, point(0, 18.28, 0.02), point(1, 18.28, 0.02), point(1, 19.05, 0.02), point(0, 19.05, 0.02), [0.20, 0.38, 0.35]);
    beam(railPosts, point(0, 18.15, 0.08), point(0, 19.12, 0.08), 0.065, 0.065);
  }
  for (const vertex of [4, 11, 24, 31, 43, 55]) {
    const x = ring[vertex * 2] / 1.08, z = ring[vertex * 2 + 1] / 1.08;
    box(pilotis, [x, 20.6, z], [0.72, 9.2, 0.72]);
  }
  return { glass, lawn, balustrade, bands, pilotis, railPosts, panels };
}

function createRoofTanks() {
  const tanks = [], frames = [], colliders = [];
  for (const [x, z] of [[-3.1, -4.4], [0, -5.0], [3.1, -4.4], [0, -1.9]]) {
    box(tanks, [x, 211.64, z], [2.25, 1.08, 2.65]);
    for (const dx of [-1.14, 0, 1.14]) box(frames, [x + dx, 211.69, z], [0.075, 1.18, 2.75]);
    const world = summitLocalToWorld(x, z); colliders.push(worldCollider(world.x, world.z, 2.35, 2.75, THE_SUMMIT_SITE.ry, 211.1, 212.28));
  }
  return { tanks, frames, colliders };
}

function signTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#18302d'; ctx.fillRect(0, 0, 1024, 256);
  ctx.textAlign = 'center'; ctx.fillStyle = '#e1e8df'; ctx.font = '500 70px sans-serif'; ctx.fillText('THE SUMMIT', 512, 116);
  ctx.fillStyle = '#a9c0b5'; ctx.font = '400 32px sans-serif'; ctx.fillText('41C STUBBS ROAD', 512, 180);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function createEntrance(group, materials) {
  const entrance = new THREE.Group(); entrance.position.set(THE_SUMMIT_ENTRANCE.x, 0, THE_SUMMIT_ENTRANCE.z);
  entrance.rotation.y = THE_SUMMIT_ENTRANCE.ry; entrance.name = 'SummitHappyValleyFacingMainLobbyTerrace'; group.add(entrance);
  const stone = [], glass = [], doors = [], frames = [], canopy = [], posts = [], lights = [];
  box(stone, [0, 0.06, 1.35], [12, 0.12, 4.2]);
  box(stone, [0, 3.25, -0.36], [9.8, 6.5, 0.18]);
  for (const x of [-4.7, 4.7]) box(frames, [x, 3.25, 0], [0.24, 6.5, 0.28]);
  for (const x of [-3.6, 3.6]) box(glass, [x, 3.15, 0.04], [1.85, 6.3, 0.08]);
  for (const x of [-1.65, -0.55, 0.55, 1.65]) box(doors, [x, 2.15, 0.10], [1.03, 4.3, 0.08]);
  for (const x of [-1.65, -0.55, 0.55, 1.65]) box(glass, [x, 5.35, 0.06], [1.03, 2.1, 0.08]);
  for (const x of [-4.55, -2.55, -2.2, -1.1, 0, 1.1, 2.2, 2.55, 4.55]) box(frames, [x, 3.15, 0.14], [0.07, 6.3, 0.11]);
  for (const y of [4.35, 6.35]) box(frames, [0, y, 0.14], [9.5, 0.085, 0.11]);
  for (const x of [-0.14, 0.14]) box(frames, [x, 1.50, 0.24], [0.04, 0.72, 0.06]);
  for (let bay = 0; bay < 5; bay++) box(canopy, [-4 + bay * 2, 4.85, 1.15], [1.91, 0.06, 2.3]);
  for (const z of [0, 1.15, 2.3]) box(frames, [0, 4.85, z], [10, 0.16, 0.11]);
  for (const x of [-3.9, 3.9]) {
    box(posts, [x, 2.4, 1.85], [0.14, 4.8, 0.14]); box(lights, [x, 4.70, 1.05], [1.2, 0.06, 0.10]);
  }
  for (const x of [-4.25, 4.25]) box(lights, [x, 3.1, -0.22], [0.10, 5.7, 0.08]);
  merged(entrance, stone, materials.stone, 'SummitHappyValleyLobbyStoneTerrace');
  merged(entrance, glass, materials.entranceGlass, 'SummitHappyValleyLobbyGlass', false);
  merged(entrance, doors, materials.entranceGlass, 'SummitHappyValleyLobbyDoors', false);
  merged(entrance, frames, materials.silver, 'SummitHappyValleyLobbyFrames');
  merged(entrance, canopy, materials.canopyGlass, 'SummitThinGlassLobbyCanopy', false);
  merged(entrance, posts, materials.silver, 'SummitLobbyCanopyPosts');
  merged(entrance, lights, materials.warmLight, 'SummitLobbyWarmLights', false);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 1.58), new THREE.MeshBasicMaterial({ map: signTexture(), toneMapped: false, side: THREE.DoubleSide }));
  sign.position.set(0, 4.88, 2.37); sign.name = 'SummitIdentification'; entrance.add(sign);
  const colliders = [], cs = Math.cos(THE_SUMMIT_ENTRANCE.ry), sn = Math.sin(THE_SUMMIT_ENTRANCE.ry);
  const add = (x, z, w, d, minY, maxY) => {
    const wx = THE_SUMMIT_ENTRANCE.x + cs * x + sn * z, wz = THE_SUMMIT_ENTRANCE.z - sn * x + cs * z;
    colliders.push(worldCollider(wx, wz, w, d, THE_SUMMIT_ENTRANCE.ry, minY, maxY));
  };
  add(0, 1.15, 10, 2.4, 4.68, 5.04);
  for (const x of [-3.9, 3.9]) add(x, 1.85, 0.26, 0.26, 0, 4.85);
  add(0, 0, 9.8, 0.32, 0, 6.5);
  return { colliders };
}

export function buildSummit(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'SummitAuthoredButterflyGreenMetalAndGlassLandmark'; group.userData.internalId = 'HK-B0015';
  group.position.y = groundOffset; root.add(group);
  const materials = {
    glass: new THREE.MeshStandardNodeMaterial({ metalness: 0.42, roughness: 0.25, envMapIntensity: 1.0, side: THREE.DoubleSide }),
    metal: new THREE.MeshStandardNodeMaterial({ metalness: 0.58, roughness: 0.42, side: THREE.DoubleSide }),
    crown: new THREE.MeshStandardNodeMaterial({ metalness: 0.62, roughness: 0.39, side: THREE.DoubleSide }),
    roof: new THREE.MeshStandardNodeMaterial({ metalness: 0.34, roughness: 0.65, side: THREE.DoubleSide }),
    podiumGlass: new THREE.MeshStandardNodeMaterial({ metalness: 0.38, roughness: 0.25, side: THREE.DoubleSide }),
    lawn: new THREE.MeshStandardNodeMaterial({ roughness: 0.92, side: THREE.DoubleSide }),
    balustrade: new THREE.MeshStandardNodeMaterial({ metalness: 0.12, roughness: 0.18, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide }),
    silver: new THREE.MeshStandardNodeMaterial({ color: 0xb5c2ba, metalness: 0.64, roughness: 0.35 }),
    dark: new THREE.MeshStandardNodeMaterial({ color: 0x203630, metalness: 0.50, roughness: 0.43 }),
    stone: new THREE.MeshStandardNodeMaterial({ color: 0x85928a, roughness: 0.72 }),
    entranceGlass: new THREE.MeshStandardNodeMaterial({ color: 0x648f83, metalness: 0.16, roughness: 0.17, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }),
    canopyGlass: new THREE.MeshStandardNodeMaterial({ color: 0x8caea4, metalness: 0.14, roughness: 0.16, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide }),
    warmLight: new THREE.MeshStandardNodeMaterial({ color: 0xd3bd93, roughness: 0.42 })
  };
  for (const key of ['glass', 'metal', 'crown', 'roof', 'podiumGlass', 'lawn', 'balustrade']) materials[key].colorNode = attribute('color', 'vec3');
  materials.glass.emissiveNode = color(0x244b45).mul(nightAmount()).mul(0.08)
    .add(color(0xffd6a4).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.55));
  materials.podiumGlass.emissiveNode = color(0xffd3a0).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.38);
  materials.stone.emissiveNode = color(0xffd2a0).mul(nightAmount().mul(0.12).add(0.003));
  materials.entranceGlass.emissiveNode = color(0x82b4a0).mul(nightAmount()).mul(0.06);
  materials.warmLight.emissiveNode = color(0xffd39b).mul(nightAmount().mul(1.5).add(0.01));

  const tower = new THREE.Group(); tower.position.set(THE_SUMMIT_SITE.x, 0, THE_SUMMIT_SITE.z); tower.rotation.y = THE_SUMMIT_SITE.ry;
  tower.name = 'SummitExactButterflyWingsSaddleAndServiceTail'; group.add(tower);
  const shaft = createShaft();
  meshStore(tower, shaft.glass, materials.glass, 'SummitCurvedButterflyGreenCurtainWall');
  meshStore(tower, shaft.metal, materials.metal, 'SummitScrewOnGreenMetalPanelCladding');
  meshStore(tower, shaft.crown, materials.crown, 'SummitUnequalCurvedWingCrowns');
  meshStore(tower, shaft.roofs, materials.roof, 'SummitRoofDecksAndCentralSaddle');
  meshStore(tower, shaft.roofSteps, materials.roof, 'SummitVerticalCrownStepClosures');
  merged(tower, shaft.mullions, materials.silver, 'SummitFineVerticalFacadeMullions');
  merged(tower, shaft.floorBands, materials.silver, 'SummitContinuousSilverFloorBands');
  merged(tower, shaft.saddleChannels, materials.dark, 'SummitDeepButterflySaddleChannels');
  merged(tower, shaft.crownLouvres, materials.dark, 'SummitCrownHorizontalLouvres');
  merged(tower, shaft.coping, materials.silver, 'SummitCurvedRoofCoping');
  const podium = createPodium();
  meshStore(tower, podium.glass, materials.podiumGlass, 'SummitFourCurvedPodiumLevels');
  meshStore(tower, podium.lawn, materials.lawn, 'SummitPodiumRoofLawn');
  meshStore(tower, podium.balustrade, materials.balustrade, 'SummitPodiumGlassBalustrade', false);
  merged(tower, podium.bands, materials.silver, 'SummitPodiumSilverFloorBands');
  merged(tower, podium.pilotis, materials.silver, 'SummitPodiumPilotis');
  merged(tower, podium.railPosts, materials.silver, 'SummitPodiumBalustradePosts');
  const tanks = createRoofTanks();
  merged(tower, tanks.tanks, materials.dark, 'SummitCompartmentalisedRoofWaterTanks');
  merged(tower, tanks.frames, materials.silver, 'SummitRoofTankDivisionFrames');
  const entrance = createEntrance(group, materials);

  const colliders = [
    ...summitRingColliders(THE_SUMMIT_TOWER_RING, THE_SUMMIT_PODIUM_HEIGHT, 0.85),
    ...summitRingColliders(THE_SUMMIT_PODIUM_RING, 0, 0.85, () => 19.2),
    ...tanks.colliders, ...entrance.colliders
  ];
  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }
  const landmark = { name: THE_SUMMIT_SITE.name, englishName: THE_SUMMIT_SITE.englishName,
    position: { x: THE_SUMMIT_SITE.x, y: groundOffset, z: THE_SUMMIT_SITE.z }, radius: 65, height: THE_SUMMIT_TO_TIP_HEIGHT };
  const stats = {
    summitGroundOffset: groundOffset, summitLandmarks: 1, summitOsmHeight: THE_SUMMIT_OSM_HEIGHT,
    summitHeight: THE_SUMMIT_HEIGHT, summitToTipHeight: THE_SUMMIT_TO_TIP_HEIGHT,
    summitOsmLevels: THE_SUMMIT_OSM_LEVELS, summitLevels: THE_SUMMIT_LEVELS,
    summitBelowGroundLevels: THE_SUMMIT_BELOW_GROUND_LEVELS, summitTowerGfa: THE_SUMMIT_TOWER_GFA,
    summitElevators: THE_SUMMIT_ELEVATORS, summitUnits: THE_SUMMIT_UNITS,
    summitCompletedYear: THE_SUMMIT_COMPLETED_YEAR, summitCtbuhConstructionStartYear: THE_SUMMIT_CTBUH_CONSTRUCTION_START_YEAR,
    summitWikipediaLevels: THE_SUMMIT_WIKIPEDIA_LEVELS, summitWikipediaConstructionStartYear: THE_SUMMIT_WIKIPEDIA_CONSTRUCTION_START_YEAR,
    summitWikipediaCompletedYear: THE_SUMMIT_WIKIPEDIA_COMPLETED_YEAR,
    summitSourceVertices: THE_SUMMIT_SITE.localRing.length / 2, summitOsmWayVersion: THE_SUMMIT_SITE.source.version,
    summitEntranceSourceNode: THE_SUMMIT_ENTRANCE_SOURCE_NODE,
    summitMainRoof: THE_SUMMIT_MAIN_ROOF, summitRoofZones: THE_SUMMIT_ROOF_ZONES.length,
    summitGlassPanels: shaft.glassPanels, summitMetalPanels: shaft.metalPanels,
    summitPodiumPanels: podium.panels, summitRoofTriangles: shaft.roofTriangles,
    summitRoofTankCompartments: tanks.colliders.length, summitColliders: colliders.length
  };
  group.userData.stats = stats;
  return { group, colliders, landmarks: [landmark], stats, groundOffset, plazaTop: groundOffset + THE_SUMMIT_PLAZA_TOP };
}
