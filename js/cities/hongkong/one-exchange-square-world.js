import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  ONE_EXCHANGE_SITE, ONE_EXCHANGE_OSM_SOURCE, ONE_EXCHANGE_LOCAL_RING, ONE_EXCHANGE_RING_AREA,
  ONE_EXCHANGE_OSM_HEIGHT, ONE_EXCHANGE_CTBUH_HEIGHT, ONE_EXCHANGE_EMPORIS_HEIGHT, ONE_EXCHANGE_HEIGHT,
  ONE_EXCHANGE_EMPORIS_MAIN_ROOF, ONE_EXCHANGE_MAIN_ROOF, ONE_EXCHANGE_OSM_LEVELS, ONE_EXCHANGE_CTBUH_LEVELS,
  ONE_EXCHANGE_EMPORIS_LEVELS, ONE_EXCHANGE_UNDERGROUND_LEVELS, ONE_EXCHANGE_CONSTRUCTION_START,
  ONE_EXCHANGE_COMPLETION_YEAR, ONE_EXCHANGE_STRUCTURAL_MATERIAL, ONE_EXCHANGE_ARCHITECT, ONE_EXCHANGE_LEAD_DESIGNER,
  ONE_EXCHANGE_COMPLEX_GFA, ONE_EXCHANGE_JLL_TOTAL_AREA_SQFT, ONE_EXCHANGE_JLL_TYPICAL_FLOOR_SQFT,
  ONE_EXCHANGE_SAVVI_OFFICE_FLOORS, ONE_EXCHANGE_OFFICE_COURSES, ONE_EXCHANGE_TARGET_PANEL_WIDTH,
  ONE_EXCHANGE_PODIUM_TOP, ONE_EXCHANGE_PRISM_EDGES, ONE_EXCHANGE_ROAD_RECORD_INDEX, ONE_EXCHANGE_ROAD_OPEN_EDGES,
  ONE_EXCHANGE_COLUMN_VERTICES, ONE_EXCHANGE_GROUND_SOFFIT, ONE_EXCHANGE_PLAZA_TOP, ONE_EXCHANGE_MAIN_ENTRANCE,
  ONE_EXCHANGE_MAIN_FORECOURT_WIDTH, ONE_EXCHANGE_MAIN_FORECOURT_DEPTH, ONE_EXCHANGE_GROUND_RINGS,
  oneExchangeEdgeOutward, oneExchangeEdgeCollider, oneExchangeRingColliders, oneExchangeLocalCollider, oneExchangeFrameCollider,
  oneExchangeGroundHeightAt
} from './one-exchange-square-architecture.js';

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
  if (!geo) throw new Error(`One Exchange Square could not merge ${name}`);
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
function point(edge, t, y, offset = 0, ring = ONE_EXCHANGE_LOCAL_RING) {
  const i = edge * 2, { nx, nz } = oneExchangeEdgeOutward(ring, edge);
  return [lerp(ring[i], ring[i + 2], t) + nx * offset, y, lerp(ring[i + 1], ring[i + 3], t) + nz * offset];
}
function facadeQuadOnRing(s, ring, edge, t0, t1, y0, y1, offset, colour, lit = 0) { quad(s, point(edge, t0, y0, offset, ring), point(edge, t1, y0, offset, ring), point(edge, t1, y1, offset, ring), point(edge, t0, y1, offset, ring), colour, lit); }
function facadeQuad(s, edge, t0, t1, y0, y1, offset, colour, lit = 0) { facadeQuadOnRing(s, ONE_EXCHANGE_LOCAL_RING, edge, t0, t1, y0, y1, offset, colour, lit); }
function frameGroup(frame, lift = ONE_EXCHANGE_PLAZA_TOP) { const group = new THREE.Group(); group.position.set(frame.localX, lift, frame.localZ); group.rotation.y = frame.ry - ONE_EXCHANGE_SITE.ry; return group; }

function createOfficeFacade() {
  const glass = store(), granite = store(), frames = store(), prismEdges = new Set(ONE_EXCHANGE_PRISM_EDGES);
  let glassPanels = 0, graniteBands = 0, verticalMullions = 0, prismWindows = 0;
  const height = ONE_EXCHANGE_MAIN_ROOF - ONE_EXCHANGE_PODIUM_TOP;
  for (let edge = 0; edge < ONE_EXCHANGE_LOCAL_RING.length / 2 - 1; edge++) {
    const length = oneExchangeEdgeOutward(ONE_EXCHANGE_LOCAL_RING, edge).length, bays = Math.max(1, Math.ceil(length / ONE_EXCHANGE_TARGET_PANEL_WIDTH));
    for (let course = 0; course < ONE_EXCHANGE_OFFICE_COURSES; course++) {
      const y0 = ONE_EXCHANGE_PODIUM_TOP + height * course / ONE_EXCHANGE_OFFICE_COURSES;
      const y1 = ONE_EXCHANGE_PODIUM_TOP + height * (course + 1) / ONE_EXCHANGE_OFFICE_COURSES;
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
  const colliders = oneExchangeRingColliders(ONE_EXCHANGE_LOCAL_RING, ONE_EXCHANGE_PODIUM_TOP, ONE_EXCHANGE_MAIN_ROOF);
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
  const group = new THREE.Group(); group.name = 'OneExchangeSquareBusTerminalPodiumAndOpenRoadBays';
  const clear = store(), upper = store(), granite = store(), frames = store(), columns = [], lights = [], colliders = [];
  const open = new Set(ONE_EXCHANGE_ROAD_OPEN_EDGES);
  for (let edge = 0; edge < ONE_EXCHANGE_LOCAL_RING.length / 2 - 1; edge++) {
    const length = oneExchangeEdgeOutward(ONE_EXCHANGE_LOCAL_RING, edge).length, bays = Math.max(1, Math.ceil(length / 2.2));
    if (!open.has(edge) && edge !== ONE_EXCHANGE_MAIN_ENTRANCE.sourceEdge) {
      for (let bay = 0; bay < bays; bay++) {
        const t0 = (bay + .015) / bays, t1 = (bay + .985) / bays;
        facadeQuad(clear, edge, t0, t1, ONE_EXCHANGE_PLAZA_TOP, ONE_EXCHANGE_GROUND_SOFFIT - .12, .03, [.46, .62, .65]);
        facadeQuad(frames, edge, t0, t0 + .006, ONE_EXCHANGE_PLAZA_TOP, ONE_EXCHANGE_GROUND_SOFFIT, .07, [.55, .59, .58]);
      }
      facadeQuad(granite, edge, 0, 1, ONE_EXCHANGE_PLAZA_TOP, .48, .06, [.58, .46, .39]);
      colliders.push(oneExchangeEdgeCollider(ONE_EXCHANGE_LOCAL_RING, edge, ONE_EXCHANGE_PLAZA_TOP, ONE_EXCHANGE_GROUND_SOFFIT));
    }
    for (let bay = 0; bay < bays; bay++) {
      const t0 = (bay + .014) / bays, t1 = (bay + .986) / bays, lit = hash(edge, bay, 33) < .32 ? .22 : 0;
      facadeQuad(upper, edge, t0, t1, ONE_EXCHANGE_GROUND_SOFFIT + .42, ONE_EXCHANGE_PODIUM_TOP - .12, .055, tint([.32, .46, .5], (hash(edge, bay, 34) - .5) * .04), lit);
      for (let y = ONE_EXCHANGE_GROUND_SOFFIT + .85; y < ONE_EXCHANGE_PODIUM_TOP - .25; y += .62) facadeQuad(frames, edge, t0, t1, y, y + .035, .09, [.48, .53, .53]);
    }
    facadeQuad(granite, edge, 0, 1, ONE_EXCHANGE_GROUND_SOFFIT, ONE_EXCHANGE_GROUND_SOFFIT + .42, .09, [.62, .49, .41]);
    facadeQuad(granite, edge, 0, 1, ONE_EXCHANGE_PODIUM_TOP - .18, ONE_EXCHANGE_PODIUM_TOP, .08, [.65, .52, .44]);
  }
  for (const vertex of ONE_EXCHANGE_COLUMN_VERTICES) {
    const i = vertex * 2, x = ONE_EXCHANGE_LOCAL_RING[i], z = ONE_EXCHANGE_LOCAL_RING[i + 1];
    cylinder(columns, [x, (ONE_EXCHANGE_GROUND_SOFFIT + ONE_EXCHANGE_PLAZA_TOP) * .5, z], .32, ONE_EXCHANGE_GROUND_SOFFIT - ONE_EXCHANGE_PLAZA_TOP, 16);
    cylinder(columns, [x, .22, z], .44, .2, 16); colliders.push(oneExchangeLocalCollider(x, z, .72, .72, ONE_EXCHANGE_PLAZA_TOP, ONE_EXCHANGE_GROUND_SOFFIT));
  }
  const slab = new THREE.Mesh(shapeGeometry(ONE_EXCHANGE_LOCAL_RING, ONE_EXCHANGE_GROUND_SOFFIT), materials.soffit); slab.name = 'OneExchangeSquareSevenPointTwoMetreBusTerminalSoffit'; slab.receiveShadow = true; group.add(slab);
  for (const edge of ONE_EXCHANGE_ROAD_OPEN_EDGES) {
    facadeQuad(frames, edge, 0, 1, ONE_EXCHANGE_GROUND_SOFFIT - .16, ONE_EXCHANGE_GROUND_SOFFIT, .02, [.52, .55, .54]);
  }
  for (let i = 0; i < 18; i++) {
    const theta = i * Math.PI * 2 / 18, x = Math.cos(theta) * 15, z = Math.sin(theta) * 8;
    cylinder(lights, [x, ONE_EXCHANGE_GROUND_SOFFIT - .08, z], .11, .055, 12);
  }
  meshStore(group, clear, materials.clearGlass, 'OneExchangeSquareGroundLobbyGlassOutsideRoadCorridor', false);
  meshStore(group, upper, materials.podiumGlass, 'OneExchangeSquareUpperPodiumSilverGlassAndBlinds');
  meshStore(group, granite, materials.granite, 'OneExchangeSquarePodiumPolishedPinkGraniteBands');
  meshStore(group, frames, materials.frames, 'OneExchangeSquarePodiumFramesAndOpenPortalLintels');
  merged(group, columns, materials.graniteSolid, 'OneExchangeSquareTwelveRoadClearBusTerminalColumns');
  merged(group, lights, materials.light, 'OneExchangeSquareBusTerminalWarmSoffitLights', false);
  colliders.push(...oneExchangeRingColliders(ONE_EXCHANGE_LOCAL_RING, ONE_EXCHANGE_GROUND_SOFFIT, ONE_EXCHANGE_PODIUM_TOP));
  return { group, colliders, roadOpenBays: ONE_EXCHANGE_ROAD_OPEN_EDGES.length, columns: ONE_EXCHANGE_COLUMN_VERTICES.length };
}

function createCrown(materials) {
  const group = new THREE.Group(); group.name = 'OneExchangeSquareSteppedMainRoofAndCrown';
  const granite = store(), metal = store(), plant = [], louvers = [], fans = [], dark = [];
  const roofRing = scaledRing(ONE_EXCHANGE_LOCAL_RING, .975), deck = new THREE.Mesh(shapeGeometry(roofRing, ONE_EXCHANGE_MAIN_ROOF), materials.roof); deck.name = 'OneExchangeSquare182Point03MetreMainRoofDeck'; deck.receiveShadow = true; group.add(deck);
  for (let edge = 0; edge < roofRing.length / 2 - 1; edge++) {
    facadeQuadOnRing(granite, roofRing, edge, 0, 1, ONE_EXCHANGE_MAIN_ROOF, ONE_EXCHANGE_MAIN_ROOF + 1.35, 0, [.61, .49, .42]);
    facadeQuadOnRing(metal, roofRing, edge, 0, 1, ONE_EXCHANGE_MAIN_ROOF + 1.35, ONE_EXCHANGE_MAIN_ROOF + 1.43, .025, [.65, .68, .66]);
  }
  // Emporis separates the 182.03 m main roof from its 188.01 m roof; the scene caps the stepped penthouse at the OSM/CVU 188 m datum.
  box(plant, [0, (ONE_EXCHANGE_MAIN_ROOF + 185.25) * .5, 0], [18, 185.25 - ONE_EXCHANGE_MAIN_ROOF, 13]);
  box(plant, [0, (185.25 + ONE_EXCHANGE_HEIGHT) * .5, 0], [12.5, ONE_EXCHANGE_HEIGHT - 185.25, 9.5]);
  box(louvers, [0, ONE_EXCHANGE_HEIGHT - .06, 0], [12.7, .12, 9.7]);
  for (let y = ONE_EXCHANGE_MAIN_ROOF + .45; y < 185.1; y += .48) {
    box(louvers, [0, y, 6.56], [17.4, .12, .12]); box(louvers, [0, y, -6.56], [17.4, .12, .12]);
  }
  for (let y = 185.55; y < ONE_EXCHANGE_HEIGHT - .25; y += .48) {
    box(louvers, [0, y, 4.81], [11.9, .11, .12]); box(louvers, [0, y, -4.81], [11.9, .11, .12]);
  }
  const units = [[-18, -5], [-14, 7], [16, -6], [19, 4], [-8, -10], [9, 10]];
  for (const [x, z] of units) {
    box(dark, [x, ONE_EXCHANGE_MAIN_ROOF + .58, z], [3.1, 1.16, 2.2]);
    for (const dx of [-.78, .78]) {
      cylinder(fans, [x + dx, ONE_EXCHANGE_MAIN_ROOF + 1.19, z], .62, .09, 24);
      for (let blade = 0; blade < 6; blade++) { const a = blade * Math.PI / 3; beam(fans, [x + dx, ONE_EXCHANGE_MAIN_ROOF + 1.25, z], [x + dx + Math.cos(a) * .5, ONE_EXCHANGE_MAIN_ROOF + 1.25, z + Math.sin(a) * .5], .055); }
    }
    for (let y = .2; y < 1; y += .2) box(louvers, [x, ONE_EXCHANGE_MAIN_ROOF + y, z + 1.13], [2.8, .06, .08]);
  }
  meshStore(group, granite, materials.granite, 'OneExchangeSquareCurvedPinkGraniteRoofParapet'); meshStore(group, metal, materials.frames, 'OneExchangeSquareParapetSilverCoping');
  merged(group, plant, materials.graniteSolid, 'OneExchangeSquareSteppedAngularRoofPenthouse'); merged(group, louvers, materials.silver, 'OneExchangeSquareCrownLouversAnd188mCap');
  merged(group, dark, materials.dark, 'OneExchangeSquareSixRoofPlantUnits'); merged(group, fans, materials.silver, 'OneExchangeSquareRoofCoolingFans');
  const colliders = [...oneExchangeRingColliders(roofRing, ONE_EXCHANGE_MAIN_ROOF, ONE_EXCHANGE_MAIN_ROOF + 1.43), oneExchangeLocalCollider(0, 0, 18, 13, ONE_EXCHANGE_MAIN_ROOF, 185.25), oneExchangeLocalCollider(0, 0, 12.5, 9.5, 185.25, ONE_EXCHANGE_HEIGHT)];
  return { group, colliders, roofPlantUnits: units.length };
}

function textPlane(text, width, height, fontSize = 64, tintColour = '#edf0eb', background = null) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 192; const context = canvas.getContext('2d');
  if (background) { context.fillStyle = background; context.fillRect(0, 0, 1024, 192); }
  context.fillStyle = tintColour; context.textAlign = 'center'; context.textBaseline = 'middle'; context.font = `600 ${fontSize}px Arial, sans-serif`; context.fillText(text, 512, 96);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: !background, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  mesh.renderOrder = 12; return mesh;
}
function muralPlane(side) {
  const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 512; const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 384, 512); gradient.addColorStop(0, side < 0 ? '#d89e42' : '#5a9e9b'); gradient.addColorStop(.45, '#d9c781'); gradient.addColorStop(1, side < 0 ? '#477c87' : '#a84d39');
  context.fillStyle = gradient; context.fillRect(0, 0, 384, 512);
  for (let i = 0; i < 52; i++) {
    const x = hash(i, side, 1) * 384, y = hash(i, side, 2) * 512, w = 8 + hash(i, side, 3) * 74, h = 14 + hash(i, side, 4) * 130;
    context.globalAlpha = .22 + hash(i, side, 5) * .45; context.fillStyle = ['#d24f36', '#e4bf4d', '#326b80', '#5f874c', '#e5ded0'][i % 5];
    context.save(); context.translate(x, y); context.rotate((hash(i, side, 6) - .5) * 1.4); context.fillRect(-w * .5, -h * .5, w, h); context.restore();
  }
  context.globalAlpha = .72; context.strokeStyle = '#263b3c'; context.lineWidth = 7;
  for (let i = 0; i < 9; i++) { context.beginPath(); context.moveTo(hash(i, side, 7) * 384, 512); context.bezierCurveTo(hash(i, side, 8) * 384, 340, hash(i, side, 9) * 384, 170, hash(i, side, 10) * 384, 0); context.stroke(); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.1), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: true })); mesh.name = side < 0 ? 'OneExchangeSquareSidneyNolanLandscapeColourMuralLeft' : 'OneExchangeSquareSidneyNolanLandscapeColourMuralRight'; return mesh;
}

function createEntrance(materials) {
  const frame = ONE_EXCHANGE_MAIN_ENTRANCE, group = frameGroup(frame); group.name = 'OneExchangeSquareConnaughtPlaceGlazedArrival';
  const glass = [], stone = [], metal = [], dark = [], lights = [], paving = [], escalator = [], colliders = [];
  const width = 18, height = 6.25;
  box(paving, [0, .035, 1.7], [ONE_EXCHANGE_MAIN_FORECOURT_WIDTH, .07, ONE_EXCHANGE_MAIN_FORECOURT_DEPTH]);
  box(paving, [0, .04, -3.2], [17.8, .08, 6.4]);
  for (let panel = 0; panel < 10; panel++) {
    const pw = width / 10, x = -width * .5 + pw * (panel + .5);
    box(glass, [x, height * .5, .02], [pw - .055, height, .075]); box(metal, [-width * .5 + pw * panel, height * .5, .09], [.055, height, .11]);
  }
  box(metal, [width * .5, height * .5, .09], [.055, height, .11]); box(metal, [0, height, .09], [width, .08, .12]);
  for (const x of [-8.85, 8.85]) box(stone, [x, 3.6, -.05], [.3, 7.2, .5]);
  box(stone, [0, 6.65, -.05], [18, .8, .5]);
  for (let door = 0; door < 4; door++) {
    const x = -2.25 + door * 1.5; box(metal, [x, 1.65, .16], [.045, 3.3, .1]); box(metal, [x + .52, 1.45, .23], [.035, .7, .06]);
  }
  box(metal, [0, 6.32, 1.15], [18.4, .18, 2.5]);
  for (const x of [-6, -3, 0, 3, 6]) cylinder(lights, [x, 6.19, 1.2], .11, .05, 12);
  // Paired escalators and their actual arrival relationship are visible through the clear lobby glazing.
  for (const x of [-1.05, 1.05]) {
    for (let step = 0; step < 24; step++) {
      const t = step / 23, y = .18 + t * 3.75, z = -1.25 - t * 4.6;
      box(escalator, [x, y, z], [.88, .16, .28]);
    }
    for (const side of [-1, 1]) {
      beam(metal, [x + side * .52, .85, -1.15], [x + side * .52, 4.65, -5.95], .075);
      beam(glass, [x + side * .49, .45, -1.2], [x + side * .49, 4.25, -5.9], .055);
    }
    box(escalator, [x, 4.02, -6.15], [1.05, .18, 1.1]);
  }
  for (const x of [-5.6, 5.6]) {
    box(stone, [x, 2.35, -2.65], [3.9, 4.7, .25]); const mural = muralPlane(x < 0 ? -1 : 1); mural.position.set(x, 2.45, -2.49); group.add(mural);
  }
  const ticker = textPlane('HKEX   •   EXCHANGE SQUARE', 15.8, 1.05, 66, '#e8f6ff', '#007ca8'); ticker.name = 'OneExchangeSquareCyanHKEXArrivalDisplay'; ticker.position.set(0, 7.75, .24); group.add(ticker);
  const sign = textPlane('ONE EXCHANGE SQUARE', 14.8, 1.05, 70, '#f0eee8'); sign.name = 'OneExchangeSquareBuildingNameSign'; sign.position.set(0, 9.25, .26); group.add(sign);
  const address = textPlane('8 CONNAUGHT PLACE', 7.4, .48, 68, '#dce5e3'); address.position.set(0, 8.55, .26); group.add(address);
  merged(group, glass, materials.clearGlass, 'OneExchangeSquareArrivalClearGlassAndEscalatorBalustrades', false); merged(group, stone, materials.graniteSolid, 'OneExchangeSquareArrivalPinkGraniteAndMuralWalls');
  merged(group, metal, materials.silver, 'OneExchangeSquareArrivalFramesCanopyAndEscalatorHandrails'); merged(group, dark, materials.dark, 'OneExchangeSquareArrivalDoorDetails');
  merged(group, lights, materials.light, 'OneExchangeSquareArrivalWarmDownlights', false); merged(group, paving, materials.paving, 'OneExchangeSquareRoadSafeArrivalForecourt'); merged(group, escalator, materials.escalator, 'OneExchangeSquarePairedLobbyEscalators');
  colliders.push(oneExchangeFrameCollider(frame, 0, .02, width, .24, 0, ONE_EXCHANGE_GROUND_SOFFIT, ONE_EXCHANGE_PLAZA_TOP));
  return { group, colliders, escalatorSteps: 48, murals: 2 };
}

function createSculptureGarden(materials) {
  const frame = ONE_EXCHANGE_MAIN_ENTRANCE, group = frameGroup(frame); group.name = 'OneExchangeSquareHenryMooreOvalWithPointsGarden';
  const stone = [], bronze = [], water = [], plants = [], lights = [], colliders = [], x = -5.75, z = 2.45;
  cylinder(stone, [x, .13, z], 1.78, .26, 48); cylinder(water, [x, .275, z], 1.57, .035, 48);
  const rim = new THREE.TorusGeometry(1.67, .11, 10, 48); rim.rotateX(Math.PI / 2); rim.translate(x, .29, z); stone.push(rim);
  const oval = new THREE.TorusGeometry(1.03, .29, 14, 56); oval.scale(.86, 1.17, .68); oval.translate(x, 1.82, z); bronze.push(oval);
  const upper = new THREE.ConeGeometry(.24, 1, 14); upper.rotateZ(Math.PI); upper.translate(x, 2.45, z); bronze.push(upper);
  const lower = new THREE.ConeGeometry(.25, 1, 14); lower.translate(x, 1.35, z); bronze.push(lower);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; cylinder(lights, [x + Math.cos(a) * 1.45, .32, z + Math.sin(a) * 1.45], .055, .035, 8); }
  for (const px of [5.8, 7.25]) {
    cylinder(stone, [px, .3, 2.65], .65, .6, 20);
    for (let i = 0; i < 5; i++) { const g = new THREE.IcosahedronGeometry(.48 + i * .035, 1); g.translate(px + (i % 2 ? .18 : -.18), .82 + i * .18, 2.65); plants.push(g); }
  }
  merged(group, stone, materials.graniteSolid, 'OneExchangeSquareCircularFountainAndGardenPlanters'); merged(group, water, materials.water, 'OneExchangeSquareOvalWithPointsReflectingPool', false);
  merged(group, bronze, materials.bronze, 'OneExchangeSquareHenryMooreOvalWithPointsBronze'); merged(group, plants, materials.leaves, 'OneExchangeSquareArrivalClippedPlanting'); merged(group, lights, materials.light, 'OneExchangeSquareFountainLowWarmLights', false);
  colliders.push(oneExchangeFrameCollider(frame, x, z, 3.65, 3.65, 0, 3.45, ONE_EXCHANGE_PLAZA_TOP));
  return { group, colliders };
}

export function buildOneExchangeSquare(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'OneExchangeSquare'; group.userData.landmark = 'one-exchange-square'; group.userData.osm = { type: 'way', id: ONE_EXCHANGE_OSM_SOURCE.id };
  group.position.set(ONE_EXCHANGE_SITE.x, groundOffset, ONE_EXCHANGE_SITE.z); group.rotation.y = ONE_EXCHANGE_SITE.ry; root.add(group);
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
  const bronze = new THREE.MeshStandardMaterial({ color: 0x3f392f, metalness: .72, roughness: .34 });
  const water = new THREE.MeshStandardMaterial({ color: 0x315f68, metalness: .3, roughness: .16, transparent: true, opacity: .82, depthWrite: false });
  const leaves = new THREE.MeshStandardMaterial({ color: 0x365e3c, roughness: .92 });
  const light = new THREE.MeshStandardNodeMaterial({ color: 0xffe1ae }); light.emissiveNode = color(0xffc779).mul(nightAmount()).mul(1.8);
  const materials = { glass, granite, frames, podiumGlass, clearGlass, graniteSolid, silver, dark, soffit, roof, paving, escalator, bronze, water, leaves, light };

  const office = createOfficeFacade(); meshStore(group, office.glass, glass, 'OneExchangeSquareSilverGlassCylindersAndAngularPrismWindows');
  meshStore(group, office.granite, granite, 'OneExchangeSquarePolishedPinkGraniteHorizontalBandsAndSpines'); meshStore(group, office.frames, frames, 'OneExchangeSquareFineVerticalMullionsAndTransoms');
  const podium = createPodium(materials); group.add(podium.group);
  const crown = createCrown(materials); group.add(crown.group);
  const entrance = createEntrance(materials); group.add(entrance.group);
  const garden = createSculptureGarden(materials); group.add(garden.group);
  const colliders = [...office.colliders, ...podium.colliders, ...crown.colliders, ...entrance.colliders, ...garden.colliders];
  for (const c of colliders) { c.minY += groundOffset; c.maxY += groundOffset; }
  const grounds = { plaza: groundOffset + ONE_EXCHANGE_PLAZA_TOP };
  const landmark = { id: 'one-exchange-square', name: ONE_EXCHANGE_SITE.name, position: { x: ONE_EXCHANGE_SITE.x, y: groundOffset, z: ONE_EXCHANGE_SITE.z }, radius: 64, height: ONE_EXCHANGE_HEIGHT };
  const stats = {
    oneExchangeGroundOffset: groundOffset, oneExchangeLandmarks: 1, oneExchangeOsmHeight: ONE_EXCHANGE_OSM_HEIGHT, oneExchangeCtbuhHeight: ONE_EXCHANGE_CTBUH_HEIGHT,
    oneExchangeEmporisHeight: ONE_EXCHANGE_EMPORIS_HEIGHT, oneExchangeHeight: ONE_EXCHANGE_HEIGHT, oneExchangeEmporisMainRoof: ONE_EXCHANGE_EMPORIS_MAIN_ROOF,
    oneExchangeOsmLevels: ONE_EXCHANGE_OSM_LEVELS, oneExchangeCtbuhLevels: ONE_EXCHANGE_CTBUH_LEVELS, oneExchangeEmporisLevels: ONE_EXCHANGE_EMPORIS_LEVELS, oneExchangeUndergroundLevels: ONE_EXCHANGE_UNDERGROUND_LEVELS,
    oneExchangeConstructionStart: ONE_EXCHANGE_CONSTRUCTION_START, oneExchangeCompletionYear: ONE_EXCHANGE_COMPLETION_YEAR, oneExchangeStructuralMaterial: ONE_EXCHANGE_STRUCTURAL_MATERIAL,
    oneExchangeArchitect: ONE_EXCHANGE_ARCHITECT, oneExchangeLeadDesigner: ONE_EXCHANGE_LEAD_DESIGNER, oneExchangeComplexGfa: ONE_EXCHANGE_COMPLEX_GFA,
    oneExchangeJllTotalAreaSqft: ONE_EXCHANGE_JLL_TOTAL_AREA_SQFT, oneExchangeJllTypicalFloorSqft: ONE_EXCHANGE_JLL_TYPICAL_FLOOR_SQFT,
    oneExchangeSavviOfficeFloors: `${ONE_EXCHANGE_SAVVI_OFFICE_FLOORS.first}/F–${ONE_EXCHANGE_SAVVI_OFFICE_FLOORS.last}/F`, oneExchangeVisualOfficeCourses: ONE_EXCHANGE_OFFICE_COURSES,
    oneExchangeSourceVertices: ONE_EXCHANGE_OSM_SOURCE.geometry.length - 1, oneExchangeOsmWayVersion: ONE_EXCHANGE_OSM_SOURCE.version, oneExchangeRingArea: ONE_EXCHANGE_RING_AREA,
    oneExchangeOfficeGlassPanels: office.glassPanels, oneExchangeGraniteBands: office.graniteBands, oneExchangeVerticalMullions: office.verticalMullions, oneExchangePrismWindows: office.prismWindows,
    oneExchangeRoadRecordIndex: ONE_EXCHANGE_ROAD_RECORD_INDEX, oneExchangeRoadOpenBays: podium.roadOpenBays, oneExchangeGroundSoffit: ONE_EXCHANGE_GROUND_SOFFIT, oneExchangeBusTerminalColumns: podium.columns,
    oneExchangeRoofPlantUnits: crown.roofPlantUnits, oneExchangeEscalatorSteps: entrance.escalatorSteps, oneExchangeSidneyNolanMurals: entrance.murals,
    oneExchangeMainEntranceNode: ONE_EXCHANGE_MAIN_ENTRANCE.nodeId, oneExchangeMainEntranceEdge: ONE_EXCHANGE_MAIN_ENTRANCE.sourceEdge,
    oneExchangeMainForecourtWidth: ONE_EXCHANGE_MAIN_FORECOURT_WIDTH, oneExchangeMainForecourtDepth: ONE_EXCHANGE_MAIN_FORECOURT_DEPTH,
    oneExchangeGroundRings: ONE_EXCHANGE_GROUND_RINGS.length, oneExchangePlazaGround: grounds.plaza, oneExchangeColliders: colliders.length
  };
  return { group, colliders, landmarks: [landmark], stats, groundOffset, grounds, plazaTop: grounds.plaza, groundHeightAt: (x, z, ground) => oneExchangeGroundHeightAt(x, z, ground, grounds) };
}
