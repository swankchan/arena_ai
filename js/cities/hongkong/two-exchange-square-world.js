import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  TWO_EXCHANGE_SITE, TWO_EXCHANGE_OSM_SOURCE, TWO_EXCHANGE_LOCAL_RING, TWO_EXCHANGE_RING_AREA,
  TWO_EXCHANGE_OSM_HEIGHT, TWO_EXCHANGE_CTBUH_HEIGHT, TWO_EXCHANGE_EMPORIS_HEIGHT, TWO_EXCHANGE_HEIGHT,
  TWO_EXCHANGE_EMPORIS_MAIN_ROOF, TWO_EXCHANGE_MAIN_ROOF, TWO_EXCHANGE_EMPORIS_FLOOR_TO_FLOOR, TWO_EXCHANGE_OSM_LEVELS, TWO_EXCHANGE_CTBUH_LEVELS,
  TWO_EXCHANGE_EMPORIS_LEVELS, TWO_EXCHANGE_UNDERGROUND_LEVELS, TWO_EXCHANGE_CONSTRUCTION_START,
  TWO_EXCHANGE_COMPLETION_YEAR, TWO_EXCHANGE_STRUCTURAL_MATERIAL, TWO_EXCHANGE_ARCHITECT,
  TWO_EXCHANGE_COMPLEX_GFA, TWO_EXCHANGE_TOTAL_AREA_SQFT, TWO_EXCHANGE_TYPICAL_FLOOR_MIN_SQFT, TWO_EXCHANGE_TYPICAL_FLOOR_MAX_SQFT,
  TWO_EXCHANGE_SAVVI_OFFICE_FLOORS, TWO_EXCHANGE_CBD_OFFICE_FLOORS, TWO_EXCHANGE_OFFICE_COURSES, TWO_EXCHANGE_TARGET_PANEL_WIDTH, TWO_EXCHANGE_LIFT_COUNT, TWO_EXCHANGE_LIFT_ZONES,
  TWO_EXCHANGE_PODIUM_TOP, TWO_EXCHANGE_PRISM_EDGES, TWO_EXCHANGE_ROAD_RECORD_INDICES, TWO_EXCHANGE_ROAD_OPEN_EDGES,
  TWO_EXCHANGE_COLUMN_VERTICES, TWO_EXCHANGE_GROUND_SOFFIT, TWO_EXCHANGE_PLAZA_TOP, TWO_EXCHANGE_MAIN_ENTRANCE, TWO_EXCHANGE_MAIN_ENTRANCE_HEIGHT,
  TWO_EXCHANGE_MAIN_FORECOURT_WIDTH, TWO_EXCHANGE_MAIN_FORECOURT_DEPTH, TWO_EXCHANGE_GROUND_RINGS,
  twoExchangeEdgeOutward, twoExchangeEdgeCollider, twoExchangeRingColliders, twoExchangeLocalCollider, twoExchangeFrameCollider,
  twoExchangeGroundHeightAt
} from './two-exchange-square-architecture.js';

const lerp = (a, b, t) => a + (b - a) * t;
const nightAmount = () => smoothstep(.55, 1.4, cityUniforms.uInteriorGlow);
const store = () => ({ positions: [], colors: [], lit: [] });
function hash(a, b, c, d = 0) { const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + d * 19.19) * 43758.5453; return value - Math.floor(value); }
function tint(base, amount) { return base.map((value) => Math.max(0, Math.min(1, value + amount))); }
function quad(s, a, b, c, d, colour, lit = 0) { for (const p of [a, b, c, a, c, d]) { s.positions.push(...p); s.colors.push(...colour); s.lit.push(lit); } }
function geometry(s) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(s.positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(s.colors, 3)); g.setAttribute('aLit', new THREE.Float32BufferAttribute(s.lit, 1));
  g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere(); return g;
}
function meshStore(group, s, material, name, shadows = true) {
  if (!s.positions.length) return null; const mesh = new THREE.Mesh(geometry(s), material); mesh.name = name;
  mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function merged(group, parts, material, name, shadows = true) {
  if (!parts.length) return null; const normalized = parts.map((part) => part.index ? part.toNonIndexed() : part);
  const geo = mergeGeometries(normalized, false); for (let i = 0; i < parts.length; i++) { normalized[i].dispose(); if (normalized[i] !== parts[i]) parts[i].dispose(); }
  if (!geo) throw new Error(`Two Exchange Square could not merge ${name}`);
  const mesh = new THREE.Mesh(geo, material); mesh.name = name; mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function box(parts, center, size, ry = 0) { const g = new THREE.BoxGeometry(...size); if (ry) g.rotateY(ry); g.translate(...center); parts.push(g); return g; }
function cylinder(parts, center, radius, height, segments = 16, radiusTop = radius) { const g = new THREE.CylinderGeometry(radiusTop, radius, height, segments); g.translate(...center); parts.push(g); return g; }
function beam(parts, a, b, width = .1, depth = width) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start), length = direction.length(); if (length < .001) return;
  const g = new THREE.BoxGeometry(width, length, depth); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  g.translate(...start.add(end).multiplyScalar(.5).toArray()); parts.push(g); return g;
}
function shapeGeometry(ring, y) {
  const shape = new THREE.Shape(); for (let i = 0; i < ring.length - 2; i += 2) { if (i === 0) shape.moveTo(ring[i], -ring[i + 1]); else shape.lineTo(ring[i], -ring[i + 1]); }
  shape.closePath(); const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g;
}
function scaledRing(ring, scale) { const out = []; for (let i = 0; i < ring.length - 2; i += 2) out.push(ring[i] * scale, ring[i + 1] * scale); out.push(out[0], out[1]); return Object.freeze(out); }
function point(edge, t, y, offset = 0, ring = TWO_EXCHANGE_LOCAL_RING) {
  const i = edge * 2, { nx, nz } = twoExchangeEdgeOutward(ring, edge);
  return [lerp(ring[i], ring[i + 2], t) + nx * offset, y, lerp(ring[i + 1], ring[i + 3], t) + nz * offset];
}
function facadeQuadOnRing(s, ring, edge, t0, t1, y0, y1, offset, colour, lit = 0) { quad(s, point(edge, t0, y0, offset, ring), point(edge, t1, y0, offset, ring), point(edge, t1, y1, offset, ring), point(edge, t0, y1, offset, ring), colour, lit); }
function facadeQuad(s, edge, t0, t1, y0, y1, offset, colour, lit = 0) { facadeQuadOnRing(s, TWO_EXCHANGE_LOCAL_RING, edge, t0, t1, y0, y1, offset, colour, lit); }
function frameGroup(frame, lift = TWO_EXCHANGE_PLAZA_TOP) { const group = new THREE.Group(); group.position.set(frame.localX, lift, frame.localZ); group.rotation.y = frame.ry - TWO_EXCHANGE_SITE.ry; return group; }

function createOfficeFacade() {
  const glass = store(), granite = store(), frames = store(), prismEdges = new Set(TWO_EXCHANGE_PRISM_EDGES);
  let glassPanels = 0, graniteBands = 0, verticalMullions = 0, prismWindows = 0;
  const height = TWO_EXCHANGE_MAIN_ROOF - TWO_EXCHANGE_PODIUM_TOP;
  for (let edge = 0; edge < TWO_EXCHANGE_LOCAL_RING.length / 2 - 1; edge++) {
    const length = twoExchangeEdgeOutward(TWO_EXCHANGE_LOCAL_RING, edge).length, bays = Math.max(1, Math.ceil(length / TWO_EXCHANGE_TARGET_PANEL_WIDTH));
    for (let course = 0; course < TWO_EXCHANGE_OFFICE_COURSES; course++) {
      const y0 = TWO_EXCHANGE_PODIUM_TOP + height * course / TWO_EXCHANGE_OFFICE_COURSES;
      const y1 = TWO_EXCHANGE_PODIUM_TOP + height * (course + 1) / TWO_EXCHANGE_OFFICE_COURSES;
      const bandTop = y0 + .72, variation = (hash(edge, course, 1) - .5) * .055;
      const stone = tint([.65, .50, .435], variation + (course % 5 === 0 ? .025 : 0));
      facadeQuad(granite, edge, 0, 1, y0, bandTop, .055, stone); graniteBands++;
      if (prismEdges.has(edge)) {
        // The angular prism is not a solid stone blade: photographs show broad horizontal glazing between pink side ribs.
        facadeQuad(granite, edge, 0, 1, bandTop, y1, .045, stone);
        for (let bay = 0; bay < bays; bay++) {
          const t0 = (bay + .07) / bays, t1 = (bay + .93) / bays, lit = hash(edge, course, bay, 4) < .2 ? .35 + hash(edge, course, bay, 5) * .65 : 0;
          const colour = tint([.34, .48, .52], (hash(edge, course, bay, 6) - .5) * .045);
          facadeQuad(glass, edge, t0, t1, bandTop + .055, y1 - .055, .09, colour, lit); glassPanels++; prismWindows++;
          beamParts(frames, point(edge, t0, bandTop + .04, .11), point(edge, t0, y1, .11), .045); verticalMullions++;
          beamParts(frames, point(edge, t1, bandTop + .04, .11), point(edge, t1, y1, .11), .045); verticalMullions++;
        }
      } else {
        for (let bay = 0; bay < bays; bay++) {
          const t0 = (bay + .018) / bays, t1 = (bay + .982) / bays, lit = hash(edge, course, bay, 8) < .18 ? .3 + hash(edge, course, bay, 9) * .8 : 0;
          const colour = tint([.43, .56, .59], (hash(edge, course, bay, 10) - .5) * .065);
          facadeQuad(glass, edge, t0, t1, bandTop + .035, y1 - .035, .065, colour, lit); glassPanels++;
          beamParts(frames, point(edge, t0, bandTop, .09), point(edge, t0, y1, .09), .048); verticalMullions++;
        }
      }
      facadeQuad(frames, edge, 0, 1, bandTop - .025, bandTop + .025, .1, [.63, .67, .66]);
      facadeQuad(frames, edge, 0, 1, y1 - .025, y1 + .012, .09, [.55, .59, .59]);
    }
  }
  const colliders = twoExchangeRingColliders(TWO_EXCHANGE_LOCAL_RING, TWO_EXCHANGE_PODIUM_TOP, TWO_EXCHANGE_MAIN_ROOF);
  return { glass, granite, frames, colliders, glassPanels, graniteBands, verticalMullions, prismWindows };
}
function beamParts(s, a, b, width) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start), length = direction.length(); if (length < .001) return;
  const centre = start.clone().add(end).multiplyScalar(.5), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  // Vertical facade joints are kept as thin camera-facing rectangular strips in the same merged attribute store.
  const side = new THREE.Vector3(1, 0, 0).applyQuaternion(q).multiplyScalar(width * .5), depth = new THREE.Vector3(0, 0, 1).applyQuaternion(q).multiplyScalar(width * .5);
  const corners = [centre.clone().add(side).add(depth), centre.clone().add(side).sub(depth), centre.clone().sub(side).sub(depth), centre.clone().sub(side).add(depth)];
  const bottom = corners.map((p) => p.clone().add(new THREE.Vector3(0, -length * .5, 0)).toArray()), top = corners.map((p) => p.clone().add(new THREE.Vector3(0, length * .5, 0)).toArray());
  for (let i = 0; i < 4; i++) quad(s, bottom[i], bottom[(i + 1) % 4], top[(i + 1) % 4], top[i], [.56, .61, .61]);
}

function createPodium(materials) {
  const group = new THREE.Group(); group.name = 'TwoExchangeSquareBusTerminalPodiumAndOpenRoadBays';
  const clear = store(), upper = store(), granite = store(), frames = store(), columns = [], lights = [], colliders = [];
  const open = new Set(TWO_EXCHANGE_ROAD_OPEN_EDGES);
  for (let edge = 0; edge < TWO_EXCHANGE_LOCAL_RING.length / 2 - 1; edge++) {
    const length = twoExchangeEdgeOutward(TWO_EXCHANGE_LOCAL_RING, edge).length, bays = Math.max(1, Math.ceil(length / 2.2));
    if (!open.has(edge) && edge !== TWO_EXCHANGE_MAIN_ENTRANCE.sourceEdge) {
      for (let bay = 0; bay < bays; bay++) {
        const t0 = (bay + .015) / bays, t1 = (bay + .985) / bays;
        facadeQuad(clear, edge, t0, t1, TWO_EXCHANGE_PLAZA_TOP, TWO_EXCHANGE_GROUND_SOFFIT - .12, .03, [.46, .62, .65]);
        facadeQuad(frames, edge, t0, t0 + .006, TWO_EXCHANGE_PLAZA_TOP, TWO_EXCHANGE_GROUND_SOFFIT, .07, [.55, .59, .58]);
      }
      facadeQuad(granite, edge, 0, 1, TWO_EXCHANGE_PLAZA_TOP, .48, .06, [.58, .46, .39]);
      colliders.push(twoExchangeEdgeCollider(TWO_EXCHANGE_LOCAL_RING, edge, TWO_EXCHANGE_PLAZA_TOP, TWO_EXCHANGE_GROUND_SOFFIT));
    }
    for (let bay = 0; bay < bays; bay++) {
      const t0 = (bay + .014) / bays, t1 = (bay + .986) / bays, lit = hash(edge, bay, 33) < .32 ? .22 : 0;
      facadeQuad(upper, edge, t0, t1, TWO_EXCHANGE_GROUND_SOFFIT + .42, TWO_EXCHANGE_PODIUM_TOP - .12, .055, tint([.32, .46, .5], (hash(edge, bay, 34) - .5) * .04), lit);
      for (let y = TWO_EXCHANGE_GROUND_SOFFIT + .85; y < TWO_EXCHANGE_PODIUM_TOP - .25; y += .62) facadeQuad(frames, edge, t0, t1, y, y + .035, .09, [.48, .53, .53]);
    }
    facadeQuad(granite, edge, 0, 1, TWO_EXCHANGE_GROUND_SOFFIT, TWO_EXCHANGE_GROUND_SOFFIT + .42, .09, [.62, .49, .41]);
    facadeQuad(granite, edge, 0, 1, TWO_EXCHANGE_PODIUM_TOP - .18, TWO_EXCHANGE_PODIUM_TOP, .08, [.65, .52, .44]);
  }
  for (const vertex of TWO_EXCHANGE_COLUMN_VERTICES) {
    const i = vertex * 2, x = TWO_EXCHANGE_LOCAL_RING[i], z = TWO_EXCHANGE_LOCAL_RING[i + 1];
    cylinder(columns, [x, (TWO_EXCHANGE_GROUND_SOFFIT + TWO_EXCHANGE_PLAZA_TOP) * .5, z], .32, TWO_EXCHANGE_GROUND_SOFFIT - TWO_EXCHANGE_PLAZA_TOP, 16);
    cylinder(columns, [x, .22, z], .44, .2, 16); colliders.push(twoExchangeLocalCollider(x, z, .72, .72, TWO_EXCHANGE_PLAZA_TOP, TWO_EXCHANGE_GROUND_SOFFIT));
  }
  const slab = new THREE.Mesh(shapeGeometry(TWO_EXCHANGE_LOCAL_RING, TWO_EXCHANGE_GROUND_SOFFIT), materials.soffit); slab.name = 'TwoExchangeSquareSevenPointTwoMetreBusTerminalSoffit'; slab.receiveShadow = true; group.add(slab);
  for (const edge of TWO_EXCHANGE_ROAD_OPEN_EDGES) {
    facadeQuad(frames, edge, 0, 1, TWO_EXCHANGE_GROUND_SOFFIT - .16, TWO_EXCHANGE_GROUND_SOFFIT, .02, [.52, .55, .54]);
  }
  for (let i = 0; i < 18; i++) {
    const theta = i * Math.PI * 2 / 18, x = Math.cos(theta) * 15, z = Math.sin(theta) * 8;
    cylinder(lights, [x, TWO_EXCHANGE_GROUND_SOFFIT - .08, z], .11, .055, 12);
  }
  meshStore(group, clear, materials.clearGlass, 'TwoExchangeSquareGroundLobbyGlassOutsideRoadCorridor', false);
  meshStore(group, upper, materials.podiumGlass, 'TwoExchangeSquareUpperPodiumSilverGlassAndBlinds');
  meshStore(group, granite, materials.granite, 'TwoExchangeSquarePodiumPolishedPinkGraniteBands');
  meshStore(group, frames, materials.frames, 'TwoExchangeSquarePodiumFramesAndOpenPortalLintels');
  merged(group, columns, materials.graniteSolid, 'TwoExchangeSquareTwelveRoadClearBusTerminalColumns');
  merged(group, lights, materials.light, 'TwoExchangeSquareBusTerminalWarmSoffitLights', false);
  colliders.push(...twoExchangeRingColliders(TWO_EXCHANGE_LOCAL_RING, TWO_EXCHANGE_GROUND_SOFFIT, TWO_EXCHANGE_PODIUM_TOP));
  return { group, colliders, roadOpenBays: TWO_EXCHANGE_ROAD_OPEN_EDGES.length, columns: TWO_EXCHANGE_COLUMN_VERTICES.length };
}

function createCrown(materials) {
  const group = new THREE.Group(); group.name = 'TwoExchangeSquareLongCentralCoreAndSteppedRoof';
  const granite = store(), metal = store(), plant = [], louvers = [], fans = [], dark = [];
  const roofRing = scaledRing(TWO_EXCHANGE_LOCAL_RING, .978), deck = new THREE.Mesh(shapeGeometry(roofRing, TWO_EXCHANGE_MAIN_ROOF), materials.roof);
  deck.name = 'TwoExchangeSquare182Point03MetreMainRoofDeck'; deck.receiveShadow = true; group.add(deck);
  for (let edge = 0; edge < roofRing.length / 2 - 1; edge++) {
    facadeQuadOnRing(granite, roofRing, edge, 0, 1, TWO_EXCHANGE_MAIN_ROOF, TWO_EXCHANGE_MAIN_ROOF + 1.25, 0, [.63, .49, .425]);
    facadeQuadOnRing(metal, roofRing, edge, 0, 1, TWO_EXCHANGE_MAIN_ROOF + 1.25, TWO_EXCHANGE_MAIN_ROOF + 1.34, .025, [.65, .68, .66]);
  }
  // The published typical plan has a long central core; the roof follows that axis instead of copying One's compact penthouse.
  box(plant, [0, (TWO_EXCHANGE_MAIN_ROOF + 185.55) * .5, 0], [28, 185.55 - TWO_EXCHANGE_MAIN_ROOF, 11]);
  box(plant, [0, (185.55 + TWO_EXCHANGE_HEIGHT) * .5, 0], [19, TWO_EXCHANGE_HEIGHT - 185.55, 8]);
  box(louvers, [0, TWO_EXCHANGE_HEIGHT - .06, 0], [19.2, .12, 8.2]);
  for (let y = TWO_EXCHANGE_MAIN_ROOF + .4; y < 185.4; y += .42) {
    box(louvers, [0, y, 5.56], [27.4, .1, .12]); box(louvers, [0, y, -5.56], [27.4, .1, .12]);
  }
  for (let y = 185.85; y < TWO_EXCHANGE_HEIGHT - .22; y += .42) {
    box(louvers, [0, y, 4.06], [18.4, .1, .12]); box(louvers, [0, y, -4.06], [18.4, .1, .12]);
  }
  const units = [[-20, -7], [-20, 7], [20, -7], [20, 7]];
  for (const [x, z] of units) {
    box(dark, [x, TWO_EXCHANGE_MAIN_ROOF + .55, z], [4.2, 1.1, 2.6]);
    for (const dx of [-1.02, 1.02]) {
      cylinder(fans, [x + dx, TWO_EXCHANGE_MAIN_ROOF + 1.14, z], .78, .09, 24);
      for (let blade = 0; blade < 8; blade++) { const a = blade * Math.PI / 4; beam(fans, [x + dx, TWO_EXCHANGE_MAIN_ROOF + 1.2, z], [x + dx + Math.cos(a) * .65, TWO_EXCHANGE_MAIN_ROOF + 1.2, z + Math.sin(a) * .65], .05); }
    }
    for (let y = .2; y < 1; y += .2) box(louvers, [x, TWO_EXCHANGE_MAIN_ROOF + y, z + 1.33], [3.9, .055, .08]);
  }
  meshStore(group, granite, materials.granite, 'TwoExchangeSquareCurvedPinkGraniteRoofParapet'); meshStore(group, metal, materials.frames, 'TwoExchangeSquareParapetSilverCoping');
  merged(group, plant, materials.graniteSolid, 'TwoExchangeSquareElongatedSteppedRoofCore'); merged(group, louvers, materials.silver, 'TwoExchangeSquareLongCrownLouversAnd188mCap');
  merged(group, dark, materials.dark, 'TwoExchangeSquareFourRoofPlantBanks'); merged(group, fans, materials.silver, 'TwoExchangeSquareEightRoofCoolingFans');
  const colliders = [...twoExchangeRingColliders(roofRing, TWO_EXCHANGE_MAIN_ROOF, TWO_EXCHANGE_MAIN_ROOF + 1.34), twoExchangeLocalCollider(0, 0, 28, 11, TWO_EXCHANGE_MAIN_ROOF, 185.55), twoExchangeLocalCollider(0, 0, 19, 8, 185.55, TWO_EXCHANGE_HEIGHT)];
  return { group, colliders, roofPlantUnits: units.length, roofFans: units.length * 2 };
}

function textPlane(text, width, height, fontSize = 64, tintColour = '#edf0eb', background = null) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 192; const context = canvas.getContext('2d');
  if (background) { context.fillStyle = background; context.fillRect(0, 0, 1024, 192); }
  context.fillStyle = tintColour; context.textAlign = 'center'; context.textBaseline = 'middle'; context.font = '600 ' + fontSize + 'px Arial, sans-serif'; context.fillText(text, 512, 96);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: !background, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  mesh.renderOrder = 12; return mesh;
}
function exchangeScriptPlane() {
  const canvas = document.createElement('canvas'); canvas.width = 1536; canvas.height = 256; const context = canvas.getContext('2d');
  context.fillStyle = '#e8ece8'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.font = 'italic 700 126px "Brush Script MT", "Segoe Script", "URW Chancery L", cursive'; context.fillText('Exchange Square', 768, 128);
  context.strokeStyle = '#e8ece8'; context.lineWidth = 5; context.lineCap = 'round';
  context.beginPath(); context.moveTo(240, 188); context.bezierCurveTo(490, 222, 1030, 190, 1310, 142); context.stroke();
  context.beginPath(); context.moveTo(206, 62); context.bezierCurveTo(138, 102, 160, 186, 278, 191); context.stroke();
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(12.8, 2.05), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  mesh.name = 'TwoExchangeSquareSilverExchangeSquareScriptSign'; mesh.renderOrder = 14; return mesh;
}
function directoryPlane() {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 1024; const context = canvas.getContext('2d');
  context.fillStyle = '#26353a'; context.fillRect(0, 0, 768, 1024); context.fillStyle = '#b4917d'; context.fillRect(0, 0, 20, 1024);
  context.fillStyle = '#f0eee6'; context.textAlign = 'left'; context.font = '600 43px Arial, sans-serif'; context.fillText('TWO EXCHANGE', 62, 92); context.fillText('SQUARE', 62, 145);
  context.fillStyle = '#9fc5ca'; context.font = '500 25px Arial, sans-serif'; context.fillText('24 LIFTS  /  6 ZONES', 62, 205);
  const rows = [['01', '5/F–13/F', '4'], ['02', '14/F–20/F', '4'], ['03', '21/F–33/F', '6'], ['04', '34/F–41/F', '4'], ['05', '42/F–47/F', '4'], ['06', '47/F–49/F', '2']];
  rows.forEach(([zone, floors, lifts], index) => { const y = 292 + index * 112; context.fillStyle = '#b4917d'; context.font = '600 30px Arial, sans-serif'; context.fillText(zone, 62, y); context.fillStyle = '#e9ece8'; context.font = '500 33px Arial, sans-serif'; context.fillText(floors, 158, y); context.fillStyle = '#9fb6b8'; context.font = '500 25px Arial, sans-serif'; context.fillText(lifts + ' LIFTS', 530, y); context.fillStyle = '#52656a'; context.fillRect(62, y + 32, 640, 2); });
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 5.8), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: true })); mesh.name = 'TwoExchangeSquareSixZoneTwentyFourLiftLobbyDirectory'; return mesh;
}
function marketPlane() {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 512; const context = canvas.getContext('2d');
  context.fillStyle = '#071b24'; context.fillRect(0, 0, 768, 512); context.fillStyle = '#5ed2dc'; context.font = '600 64px Arial, sans-serif'; context.fillText('HKEX', 44, 88);
  context.fillStyle = '#d8e7e7'; context.font = '500 29px Arial, sans-serif'; context.fillText('EXCHANGE SQUARE', 44, 140);
  for (let i = 0; i < 12; i++) { const x = 44 + i * 56, h = 35 + hash(i, 7, 2) * 190; context.fillStyle = i % 3 === 0 ? '#d67468' : '#62b99a'; context.fillRect(x, 420 - h, 25, h); }
  context.fillStyle = '#8ca8ac'; context.font = '500 22px Arial, sans-serif'; context.fillText('STATIC LOBBY DISPLAY', 44, 474);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.3), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false })); mesh.name = 'TwoExchangeSquareStaticHKEXLobbyMarketDisplay'; return mesh;
}

function createEntrance(materials) {
  const frame = TWO_EXCHANGE_MAIN_ENTRANCE, group = frameGroup(frame); group.name = 'TwoExchangeSquareBetweenTowersCurvedGlassArrival';
  const glassSkin = store(), canopySkin = store(), glass = [], stone = [], metal = [], lights = [], paving = [], escalator = [], colliders = [];
  const width = 13.8, half = width * .5, height = TWO_EXCHANGE_MAIN_ENTRANCE_HEIGHT, panels = 12, bow = (x) => .12 + .52 * (1 - (x / half) ** 2);
  box(paving, [0, .035, 1.65], [TWO_EXCHANGE_MAIN_FORECOURT_WIDTH, .07, TWO_EXCHANGE_MAIN_FORECOURT_DEPTH]);
  box(paving, [0, .04, -3.15], [13.7, .08, 6.5]);
  for (let panel = 0; panel < panels; panel++) {
    const x0 = -half + width * panel / panels, x1 = -half + width * (panel + 1) / panels, z0 = bow(x0), z1 = bow(x1);
    quad(glassSkin, [x0, 0, z0], [x1, 0, z1], [x1, height, z1], [x0, height, z0], tint([.45, .62, .65], (hash(panel, 4, 1) - .5) * .04));
    quad(canopySkin, [x0, height, z0], [x1, height, z1], [x1, height, z1 + 1.05], [x0, height, z0 + 1.05], [.57, .62, .62]);
    beam(metal, [x0, 0, z0 + .025], [x0, height, z0 + .025], .055);
    beam(metal, [x0, height, z0], [x1, height, z1], .09);
  }
  beam(metal, [half, 0, bow(half) + .025], [half, height, bow(half) + .025], .055);
  for (const x of [-6.72, 6.72]) box(stone, [x, height * .5, .05], [.26, height, .48]);
  for (const x of [-1.5, 0, 1.5]) { box(metal, [x, 1.7, .78], [.05, 3.4, .1]); box(metal, [x + .42, 1.5, .86], [.035, .72, .06]); }
  box(stone, [0, 3.4, -5.85], [13.2, 6.8, .3]); box(stone, [0, .52, -2.8], [3.6, 1.04, 1.15]); box(metal, [0, 1.08, -2.8], [3.8, .08, 1.28]);
  const directory = directoryPlane(); directory.position.set(-2.8, 3.45, -5.67); group.add(directory);
  const market = marketPlane(); market.position.set(3.6, 3.65, -5.67); group.add(market);
  for (const x of [-4.65, 4.65]) {
    for (let step = 0; step < 20; step++) { const t = step / 19; box(escalator, [x, .17 + t * 3.35, -1.2 - t * 4.15], [1.05, .15, .3]); }
    for (const side of [-1, 1]) { beam(metal, [x + side * .61, .78, -1.05], [x + side * .61, 4.22, -5.45], .07); beam(glass, [x + side * .58, .4, -1.1], [x + side * .58, 3.82, -5.4], .055); }
    box(escalator, [x, 3.62, -5.55], [1.25, .18, 1.05]);
  }
  for (const x of [-4.8, -2.4, 0, 2.4, 4.8]) cylinder(lights, [x, height - .17, 1.12], .11, .05, 12);
  const script = exchangeScriptPlane(); script.position.set(0, height - 1.25, 1.48); group.add(script);
  const sign = textPlane('TWO EXCHANGE SQUARE', 6.4, .48, 64, '#eef1eb'); sign.position.set(0, height - 2.75, 1.15); group.add(sign);
  const address = textPlane('8 CONNAUGHT PLACE', 5.2, .36, 62, '#dce5e3'); address.position.set(0, height - 3.15, 1.14); group.add(address);
  meshStore(group, glassSkin, materials.clearGlass, 'TwoExchangeSquareBowCurvedArrivalGlass', false); meshStore(group, canopySkin, materials.frames, 'TwoExchangeSquareCurvedSilverArrivalCanopy');
  merged(group, glass, materials.clearGlass, 'TwoExchangeSquareEscalatorGlassBalustrades', false); merged(group, stone, materials.graniteSolid, 'TwoExchangeSquareArrivalPinkGraniteAndLobbyStone');
  merged(group, metal, materials.silver, 'TwoExchangeSquareArrivalFramesDoorsAndEscalatorHandrails'); merged(group, lights, materials.light, 'TwoExchangeSquareArrivalWarmDownlights', false);
  merged(group, paving, materials.paving, 'TwoExchangeSquareBetweenTowersArrivalPaving'); merged(group, escalator, materials.escalator, 'TwoExchangeSquareWidelyPairedLobbyEscalators');
  colliders.push(twoExchangeFrameCollider(frame, 0, .5, width, .85, 0, height + .15, TWO_EXCHANGE_PLAZA_TOP));
  return { group, colliders, escalatorSteps: 40, directoryZones: TWO_EXCHANGE_LIFT_ZONES, scriptSigns: 1, entranceHeight: height };
}

function createArrivalGarden(materials) {
  const frame = TWO_EXCHANGE_MAIN_ENTRANCE, group = frameGroup(frame); group.name = 'TwoExchangeSquareLinearRillAndClippedArrivalGarden';
  const stone = [], water = [], plants = [], lights = [], colliders = [];
  box(stone, [4.95, .12, 2.35], [2.55, .24, 3.25]); box(water, [4.95, .255, 2.35], [2.28, .035, 2.98]);
  for (let i = 0; i < 6; i++) { const z = 1.2 + i * .45; cylinder(water, [4.95, .47, z], .045, .42 + (i % 2) * .16, 10); cylinder(lights, [4.95, .28, z], .07, .03, 10); }
  for (const [x, z] of [[-5.35, 1.15], [-5.35, 2.55], [-5.35, 3.75]]) {
    cylinder(stone, [x, .28, z], .52, .56, 20);
    for (let i = 0; i < 4; i++) { const g = new THREE.IcosahedronGeometry(.43 + i * .025, 1); g.translate(x + (i % 2 ? .12 : -.12), .68 + i * .15, z); plants.push(g); }
    colliders.push(twoExchangeFrameCollider(frame, x, z, 1.1, 1.1, 0, 1.5, TWO_EXCHANGE_PLAZA_TOP));
  }
  for (const z of [1.6, 3.25]) { box(stone, [-3.85, .32, z], [1.65, .22, .52]); box(stone, [-3.85, .14, z], [1.35, .28, .36]); colliders.push(twoExchangeFrameCollider(frame, -3.85, z, 1.7, .58, 0, .48, TWO_EXCHANGE_PLAZA_TOP)); }
  merged(group, stone, materials.graniteSolid, 'TwoExchangeSquareLinearRillBasinPlantersAndBenches'); merged(group, water, materials.water, 'TwoExchangeSquareSixJetLinearReflectingRill', false);
  merged(group, plants, materials.leaves, 'TwoExchangeSquareThreeClippedArrivalPlanters'); merged(group, lights, materials.light, 'TwoExchangeSquareRillLowWarmLights', false);
  colliders.push(twoExchangeFrameCollider(frame, 4.95, 2.35, 2.6, 3.3, 0, .35, TWO_EXCHANGE_PLAZA_TOP));
  return { group, colliders, rillJets: 6, planters: 3 };
}

export function buildTwoExchangeSquare(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'TwoExchangeSquare'; group.userData.landmark = 'two-exchange-square'; group.userData.osm = { type: 'way', id: TWO_EXCHANGE_OSM_SOURCE.id };
  group.position.set(TWO_EXCHANGE_SITE.x, groundOffset, TWO_EXCHANGE_SITE.z); group.rotation.y = TWO_EXCHANGE_SITE.ry; root.add(group);
  const glass = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .4, roughness: .2, side: THREE.DoubleSide }); glass.colorNode = attribute('color'); glass.emissiveNode = color(0xffd7a4).mul(attribute('aLit')).mul(nightAmount());
  const granite = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .16, roughness: .38, side: THREE.DoubleSide }); granite.colorNode = attribute('color');
  const frames = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .72, roughness: .27, side: THREE.DoubleSide }); frames.colorNode = attribute('color');
  const podiumGlass = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .42, roughness: .2, side: THREE.DoubleSide }); podiumGlass.colorNode = attribute('color'); podiumGlass.emissiveNode = color(0xffd6a0).mul(attribute('aLit')).mul(nightAmount()).mul(.6);
  const clearGlass = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .08, roughness: .1, transparent: true, opacity: .25, side: THREE.DoubleSide, depthWrite: false }); clearGlass.colorNode = attribute('color'); clearGlass.emissiveNode = color(0xffd7a4).mul(nightAmount()).mul(.08);
  const graniteSolid = new THREE.MeshStandardMaterial({ color: 0xa88b78, metalness: .12, roughness: .4 });
  const silver = new THREE.MeshStandardMaterial({ color: 0xaeb8b7, metalness: .78, roughness: .25 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x273034, metalness: .38, roughness: .42 });
  const soffit = new THREE.MeshStandardMaterial({ color: 0x817b72, roughness: .76, side: THREE.DoubleSide });
  const roof = new THREE.MeshStandardMaterial({ color: 0x6f7270, roughness: .82, side: THREE.DoubleSide });
  const paving = new THREE.MeshStandardMaterial({ color: 0x8b867e, roughness: .84 });
  const escalator = new THREE.MeshStandardMaterial({ color: 0x4c5557, metalness: .68, roughness: .34 });
  const water = new THREE.MeshStandardMaterial({ color: 0x315f68, metalness: .3, roughness: .16, transparent: true, opacity: .82, depthWrite: false });
  const leaves = new THREE.MeshStandardMaterial({ color: 0x365e3c, roughness: .92 });
  const light = new THREE.MeshStandardNodeMaterial({ color: 0xffe1ae }); light.emissiveNode = color(0xffc779).mul(nightAmount()).mul(1.8);
  const materials = { glass, granite, frames, podiumGlass, clearGlass, graniteSolid, silver, dark, soffit, roof, paving, escalator, water, leaves, light };

  const office = createOfficeFacade(); meshStore(group, office.glass, glass, 'TwoExchangeSquareSilverGlassCylindersAndAngularPrismWindows');
  meshStore(group, office.granite, granite, 'TwoExchangeSquarePolishedPinkGraniteHorizontalBandsAndSpines'); meshStore(group, office.frames, frames, 'TwoExchangeSquareFineVerticalMullionsAndTransoms');
  const podium = createPodium(materials); group.add(podium.group);
  const crown = createCrown(materials); group.add(crown.group);
  const entrance = createEntrance(materials); group.add(entrance.group);
  const garden = createArrivalGarden(materials); group.add(garden.group);
  const colliders = [...office.colliders, ...podium.colliders, ...crown.colliders, ...entrance.colliders, ...garden.colliders];
  for (const c of colliders) { c.minY += groundOffset; c.maxY += groundOffset; }
  const grounds = { plaza: groundOffset + TWO_EXCHANGE_PLAZA_TOP };
  const landmark = { id: 'two-exchange-square', name: TWO_EXCHANGE_SITE.name, position: { x: TWO_EXCHANGE_SITE.x, y: groundOffset, z: TWO_EXCHANGE_SITE.z }, radius: 66, height: TWO_EXCHANGE_HEIGHT };
  const stats = {
    twoExchangeGroundOffset: groundOffset, twoExchangeLandmarks: 1, twoExchangeOsmHeight: TWO_EXCHANGE_OSM_HEIGHT, twoExchangeCtbuhHeight: TWO_EXCHANGE_CTBUH_HEIGHT,
    twoExchangeEmporisHeight: TWO_EXCHANGE_EMPORIS_HEIGHT, twoExchangeHeight: TWO_EXCHANGE_HEIGHT, twoExchangeEmporisMainRoof: TWO_EXCHANGE_EMPORIS_MAIN_ROOF, twoExchangeEmporisFloorToFloor: TWO_EXCHANGE_EMPORIS_FLOOR_TO_FLOOR,
    twoExchangeOsmLevels: TWO_EXCHANGE_OSM_LEVELS, twoExchangeCtbuhLevels: TWO_EXCHANGE_CTBUH_LEVELS, twoExchangeEmporisLevels: TWO_EXCHANGE_EMPORIS_LEVELS, twoExchangeUndergroundLevels: TWO_EXCHANGE_UNDERGROUND_LEVELS,
    twoExchangeConstructionStart: TWO_EXCHANGE_CONSTRUCTION_START, twoExchangeCompletionYear: TWO_EXCHANGE_COMPLETION_YEAR, twoExchangeStructuralMaterial: TWO_EXCHANGE_STRUCTURAL_MATERIAL,
    twoExchangeArchitect: TWO_EXCHANGE_ARCHITECT, twoExchangeComplexGfa: TWO_EXCHANGE_COMPLEX_GFA,
    twoExchangeTotalAreaSqft: TWO_EXCHANGE_TOTAL_AREA_SQFT, twoExchangeTypicalFloorMinSqft: TWO_EXCHANGE_TYPICAL_FLOOR_MIN_SQFT, twoExchangeTypicalFloorMaxSqft: TWO_EXCHANGE_TYPICAL_FLOOR_MAX_SQFT,
    twoExchangeSavviOfficeFloors: `${TWO_EXCHANGE_SAVVI_OFFICE_FLOORS.first}/F–${TWO_EXCHANGE_SAVVI_OFFICE_FLOORS.last}/F`, twoExchangeSavviOfficeFloorCount: TWO_EXCHANGE_SAVVI_OFFICE_FLOORS.count,
    twoExchangeCbdOfficeFloors: TWO_EXCHANGE_CBD_OFFICE_FLOORS, twoExchangeVisualOfficeCourses: TWO_EXCHANGE_OFFICE_COURSES, twoExchangeLiftCount: TWO_EXCHANGE_LIFT_COUNT, twoExchangeLiftZones: TWO_EXCHANGE_LIFT_ZONES,
    twoExchangeSourceVertices: TWO_EXCHANGE_OSM_SOURCE.geometry.length - 1, twoExchangeOsmWayVersion: TWO_EXCHANGE_OSM_SOURCE.version, twoExchangeRingArea: TWO_EXCHANGE_RING_AREA,
    twoExchangeOfficeGlassPanels: office.glassPanels, twoExchangeGraniteBands: office.graniteBands, twoExchangeVerticalMullions: office.verticalMullions, twoExchangePrismWindows: office.prismWindows,
    twoExchangeRoadRecordIndices: [...TWO_EXCHANGE_ROAD_RECORD_INDICES], twoExchangeRoadOpenBays: podium.roadOpenBays, twoExchangeGroundSoffit: TWO_EXCHANGE_GROUND_SOFFIT, twoExchangeBusTerminalColumns: podium.columns,
    twoExchangeRoofPlantUnits: crown.roofPlantUnits, twoExchangeRoofFans: crown.roofFans, twoExchangeEscalatorSteps: entrance.escalatorSteps,
    twoExchangeLiftDirectoryZones: entrance.directoryZones, twoExchangeExchangeScriptSigns: entrance.scriptSigns, twoExchangeRillJets: garden.rillJets, twoExchangeGardenPlanters: garden.planters,
    twoExchangeMainEntranceNode: TWO_EXCHANGE_MAIN_ENTRANCE.nodeId, twoExchangeMainEntranceEdge: TWO_EXCHANGE_MAIN_ENTRANCE.sourceEdge, twoExchangeMainEntranceHeight: entrance.entranceHeight,
    twoExchangeMainForecourtWidth: TWO_EXCHANGE_MAIN_FORECOURT_WIDTH, twoExchangeMainForecourtDepth: TWO_EXCHANGE_MAIN_FORECOURT_DEPTH,
    twoExchangeGroundRings: TWO_EXCHANGE_GROUND_RINGS.length, twoExchangePlazaGround: grounds.plaza, twoExchangeColliders: colliders.length
  };
  return { group, colliders, landmarks: [landmark], stats, groundOffset, grounds, plazaTop: grounds.plaza, groundHeightAt: (x, z, ground) => twoExchangeGroundHeightAt(x, z, ground, grounds) };
}
