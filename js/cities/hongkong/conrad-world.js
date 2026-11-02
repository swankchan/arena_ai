import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  CONRAD_SITE, CONRAD_OSM_SOURCE, CONRAD_LOCAL_RING, CONRAD_RING_AREA, CONRAD_OSM_HEIGHT,
  CONRAD_CTBUH_HEIGHT, CONRAD_HEIGHT, CONRAD_OCCUPIED_HEIGHT, CONRAD_OSM_LEVELS,
  CONRAD_CTBUH_LEVELS, CONRAD_COMPLETION_YEAR, CONRAD_ROOMS, CONRAD_ARCHITECT,
  CONRAD_PODIUM_HEIGHT, CONRAD_PODIUM_LEVELS, CONRAD_SHAFT_COURSES, CONRAD_PANEL_TARGET_WIDTH,
  CONRAD_MECHANICAL_COURSES, CONRAD_MAJOR_FIN_VERTICES, CONRAD_CROWN_SIGN_EDGES,
  CONRAD_LOBBY_CORE_RING, CONRAD_ENTRANCE, CONRAD_CROSSING_ROADS, CONRAD_ROAD_VEHICLE_CLEARANCE,
  conradFloorY, conradEdgeOutward, conradRingColliders, conradLocalCollider,
  conradFrameCollider, conradRoadConflictAtLocal, conradGroundHeightAt
} from './conrad-architecture.js';

const lerp = (a, b, t) => a + (b - a) * t;
const nightAmount = () => smoothstep(.55, 1.4, cityUniforms.uInteriorGlow);
const store = () => ({ positions: [], colors: [], lit: [] });
const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
function hash(a, b, c, d = 0) { const v = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + d * 19.19) * 43758.5453; return v - Math.floor(v); }
function quad(s, a, b, c, d, tint, lit = 0) {
  for (const p of [a, b, c, a, c, d]) { s.positions.push(...p); s.colors.push(...tint); s.lit.push(lit); }
}
function geometry(s) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(s.positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(s.colors, 3));
  g.setAttribute('aLit', new THREE.Float32BufferAttribute(s.lit, 1));
  g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere(); return g;
}
function meshStore(group, s, material, name, shadows = true) {
  if (!s.positions.length) return null;
  const mesh = new THREE.Mesh(geometry(s), material); mesh.name = name;
  mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function merged(group, parts, material, name, shadows = true) {
  if (!parts.length) return null;
  const geo = mergeGeometries(parts, false); for (const part of parts) part.dispose();
  const mesh = new THREE.Mesh(geo, material); mesh.name = name; mesh.castShadow = shadows; mesh.receiveShadow = true;
  group.add(mesh); return mesh;
}
function box(parts, center, size, ry = 0) {
  const g = new THREE.BoxGeometry(...size); if (ry) g.rotateY(ry); g.translate(...center); parts.push(g); return g;
}
function cylinder(parts, center, radius, height, segments = 20) {
  const g = new THREE.CylinderGeometry(radius, radius, height, segments); g.translate(...center); parts.push(g); return g;
}
function beam(parts, a, b, width = .1, depth = width) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start), length = direction.length();
  if (length < .001) return;
  const g = new THREE.BoxGeometry(width, length, depth);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  g.translate(...start.add(end).multiplyScalar(.5).toArray()); parts.push(g); return g;
}
function point(ring, edge, t, y, offset = 0) {
  const i = edge * 2, { nx, nz } = conradEdgeOutward(ring, edge);
  return [lerp(ring[i], ring[i + 2], t) + nx * offset, y, lerp(ring[i + 1], ring[i + 3], t) + nz * offset];
}
function edgeBox(parts, ring, edge, t, y, offset, width, height, depth) {
  const p = point(ring, edge, t, y, offset), { ry } = conradEdgeOutward(ring, edge);
  return box(parts, p, [width, height, depth], ry);
}
function roofGeometry(ring, y) {
  const shape = new THREE.Shape();
  for (let i = 0; i < ring.length - 2; i += 2) { if (i === 0) shape.moveTo(ring[i], -ring[i + 1]); else shape.lineTo(ring[i], -ring[i + 1]); }
  shape.closePath(); const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g;
}

function createShaft() {
  const glass = store(), white = store(), backing = store(), mechanical = store(), mullions = store(), slabs = [];
  const colliders = conradRingColliders(CONRAD_LOCAL_RING, CONRAD_PODIUM_HEIGHT, CONRAD_OCCUPIED_HEIGHT);
  const major = new Set(CONRAD_MAJOR_FIN_VERTICES), mechanicalCourses = new Set(CONRAD_MECHANICAL_COURSES);
  let glassPanels = 0, floorRibbons = 0, louvres = 0, majorFins = 0;
  const edgeCount = CONRAD_LOCAL_RING.length / 2 - 1;
  for (let edge = 0; edge < edgeCount; edge++) {
    const length = conradEdgeOutward(CONRAD_LOCAL_RING, edge).length;
    const panels = Math.max(1, Math.round(length / CONRAD_PANEL_TARGET_WIDTH));
    const p = (t, y, o = .04) => point(CONRAD_LOCAL_RING, edge, t, y, o);
    quad(backing, p(0, 14, -.16), p(1, 14, -.16), p(1, 183.9, -.16), p(0, 183.9, -.16), [.035, .06, .068]);
    for (let course = 0; course < CONRAD_SHAFT_COURSES; course++) {
      const y0 = conradFloorY(course), y1 = conradFloorY(course + 1), variation = hash(edge, course, 25);
      if (mechanicalCourses.has(course)) {
        quad(mechanical, p(0, y0 + .03, .07), p(1, y0 + .03, .07), p(1, y1 - .03, .07), p(0, y1 - .03, .07), [.025, .037, .043]);
        for (let y = y0 + .18; y < y1 - .08; y += .31) {
          quad(mullions, p(0, y, .13), p(1, y, .13), p(1, y + .065, .13), p(0, y + .065, .13), [.19, .23, .24]); louvres++;
        }
        continue;
      }
      quad(white, p(0, y0, .06), p(1, y0, .06), p(1, y0 + .34, .06), p(0, y0 + .34, .06), mix([.69, .72, .71], [.84, .85, .81], variation * .35));
      edgeBox(slabs, CONRAD_LOCAL_RING, edge, .5, y0 + .25, .2, length, .16, .5); floorRibbons++;
      for (let panel = 0; panel < panels; panel++) {
        const t0 = panel / panels + .0012, t1 = (panel + 1) / panels - .0012;
        const lit = hash(edge, panel, course, 91) > .79 ? .18 + variation * .62 : 0;
        const tint = mix([.065, .155, .19], [.21, .35, .38], .2 + variation * .55);
        quad(glass, p(t0, y0 + .43), p(t1, y0 + .43), p(t1, y1 - .15), p(t0, y1 - .15), tint, lit); glassPanels++;
        const mt = panel / panels, dt = Math.min(.0009, .026 / length);
        quad(mullions, p(mt, y0 + .39, .095), p(mt + dt, y0 + .39, .095), p(mt + dt, y1 - .11, .095), p(mt, y1 - .11, .095), [.19, .24, .25]);
      }
    }
  }
  for (let vertex = 0; vertex < edgeCount; vertex++) {
    if (!major.has(vertex)) continue;
    const y = (CONRAD_PODIUM_HEIGHT + CONRAD_OCCUPIED_HEIGHT) * .5;
    edgeBox(slabs, CONRAD_LOCAL_RING, vertex, 0, y, .31, .78,
      CONRAD_OCCUPIED_HEIGHT - CONRAD_PODIUM_HEIGHT, 1.02);
    majorFins++;
  }
  return { glass, white, backing, mechanical, mullions, slabs, colliders, glassPanels, floorRibbons, louvres, majorFins };
}

function createPodium() {
  const white = store(), glass = store(), columns = [], frames = [], colliders = [];
  const edgeCount = CONRAD_LOCAL_RING.length / 2 - 1;
  let columnCount = 0;
  for (let edge = 0; edge < edgeCount; edge++) {
    const length = conradEdgeOutward(CONRAD_LOCAL_RING, edge).length;
    const p = (t, y, o = .08) => point(CONRAD_LOCAL_RING, edge, t, y, o);
    quad(white, p(0, 12), p(1, 12), p(1, 14), p(0, 14), [.76, .78, .75]);
    edgeBox(frames, CONRAD_LOCAL_RING, edge, .5, 12.15, .18, length, .22, .42);
    const i = edge * 2, x = CONRAD_LOCAL_RING[i], z = CONRAD_LOCAL_RING[i + 1];
    if (!conradRoadConflictAtLocal(x, z)) {
      const q = point(CONRAD_LOCAL_RING, edge, 0, 6, -.22), { ry } = conradEdgeOutward(CONRAD_LOCAL_RING, edge);
      box(columns, q, [.72, 12, .72], ry); colliders.push(conradLocalCollider(q[0], q[2], .78, .78, 0, 12, CONRAD_SITE.ry + ry)); columnCount++;
    }
  }
  for (let edge = 0; edge < CONRAD_LOBBY_CORE_RING.length / 2 - 1; edge++) {
    const p = (t, y, o = 0) => point(CONRAD_LOBBY_CORE_RING, edge, t, y, o);
    const v = hash(edge, 7, 25);
    quad(glass, p(0, .35), p(1, .35), p(1, 11.65), p(0, 11.65), mix([.035, .085, .09], [.11, .19, .18], v), .08 + v * .12);
    edgeBox(frames, CONRAD_LOBBY_CORE_RING, edge, 0, 6, .04, .22, 12, .28);
  }
  colliders.push(...conradRingColliders(CONRAD_LOBBY_CORE_RING, 0, 12, .55));
  return { white, glass, columns, frames, colliders, columnCount };
}

function textPlane(text, width, height, fontSize = 64, tint = '#f2f0e8') {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 192;
  const context = canvas.getContext('2d'); context.fillStyle = tint; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.font = `600 ${fontSize}px Arial, sans-serif`; context.fillText(text, 512, 96);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false
  }));
  mesh.renderOrder = 12; return mesh;
}
function marbleTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d'), gradient = context.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, '#676d6b'); gradient.addColorStop(.5, '#858884'); gradient.addColorStop(1, '#5c6462');
  context.fillStyle = gradient; context.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 34; i++) {
    const y = hash(i, 2, 8) * 600 - 40; context.strokeStyle = i % 3 ? 'rgba(222,220,205,.16)' : 'rgba(45,54,53,.24)';
    context.lineWidth = .6 + hash(i, 4, 9) * 2.2; context.beginPath(); context.moveTo(-30, y);
    context.bezierCurveTo(120, y - 90 + hash(i, 5, 2) * 160, 330, y - 80 + hash(i, 6, 3) * 180, 550, y + 30); context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(1.4, 1.4); return texture;
}
function canopyGeometry() {
  const shape = new THREE.Shape(); shape.moveTo(-8, -1); shape.lineTo(8, -1); shape.lineTo(8, 6.7);
  shape.quadraticCurveTo(8, 8.2, 6.3, 8.2); shape.lineTo(-6.3, 8.2); shape.quadraticCurveTo(-8, 8.2, -8, 6.7); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: .32, bevelEnabled: false, curveSegments: 16 });
  g.rotateX(Math.PI / 2); g.translate(0, 6.15, 0); return g;
}
function createEntrance(materials, lift) {
  const group = new THREE.Group(); group.name = 'ConradSupremeCourtRoadPorteCochere';
  group.position.set(CONRAD_ENTRANCE.localX, lift + .12, CONRAD_ENTRANCE.localZ);
  group.rotation.y = CONRAD_ENTRANCE.ry - CONRAD_SITE.ry;
  const marble = [], stone = [], frames = [], glass = [], brass = [], carpet = [], lights = [], planters = [], leaves = [], colliders = [];
  for (let panel = 0; panel < 4; panel++) box(glass, [-2.55 + panel * 1.7, 2.35, 0], [1.64, 4.7, .08]);
  for (const x of [-3.4, -1.7, 0, 1.7, 3.4]) box(frames, [x, 2.4, .055], [.075, 4.8, .12]);
  box(frames, [0, 4.78, .055], [6.9, .1, .12]);
  for (const x of [-1.05, 1.05]) { beam(brass, [x - .18, 1.55, .17], [x - .18, 2.55, .17], .035); beam(brass, [x + .18, 1.55, .17], [x + .18, 2.55, .17], .035); }
  colliders.push(conradFrameCollider(CONRAD_ENTRANCE, 0, 0, 7, .34, 0, 4.9));
  box(marble, [5.25, 2.85, -.28], [3.65, 5.7, .64]); box(marble, [6.8, 2.85, -1.25], [.55, 5.7, 2.3]);
  colliders.push(conradFrameCollider(CONRAD_ENTRANCE, 5.25, -.28, 3.7, .72, 0, 5.7));
  const sign = textPlane('CONRAD', 3.15, .66, 102); sign.position.set(5.25, 3.65, .052); group.add(sign);
  const chinese = textPlane('香港港麗酒店', 2.65, .43, 82); chinese.position.set(5.25, 3.03, .055); group.add(chinese);
  box(carpet, [0, .035, .25], [5.5, .07, .52]);
  for (let step = 0; step < 3; step++) {
    const drop = (step + 1) * .14;
    box(stone, [0, -drop - .09, .75 + step * .42], [6.1 + step * .18, .18, .48]);
    box(carpet, [0, -drop + .015, .75 + step * .42], [5.55, .025, .48]);
  }
  const canopy = new THREE.Mesh(canopyGeometry(), materials.white); canopy.name = 'ConradRoundedArrivalCanopy'; canopy.castShadow = true; canopy.receiveShadow = true; group.add(canopy);
  for (const x of [-6.75, 6.75]) for (const z of [1.25, 6.25]) {
    cylinder(stone, [x, .16, z], .57, .32); cylinder(frames, [x, 3.02, z], .36, 5.75, 24);
    colliders.push(conradFrameCollider(CONRAD_ENTRANCE, x, z, .82, .82, 0, 5.9));
  }
  for (const x of [-5.4, -2.7, 0, 2.7, 5.4]) for (const z of [.4, 2.5, 4.6, 6.7]) cylinder(lights, [x, 5.8, z], .105, .055, 12);
  for (const side of [-1, 1]) {
    box(planters, [side * 7.25, .42, 3.6], [1.15, .84, 2.8]);
    for (let i = 0; i < 4; i++) { const g = new THREE.IcosahedronGeometry(.62 + hash(side, i, 4) * .15, 1); g.translate(side * 7.25, 1.12, 2.65 + i * .64); leaves.push(g); }
  }
  merged(group, marble, materials.marble, 'ConradGreyMarbleSignWall'); merged(group, stone, materials.stone, 'ConradArrivalStepsAndColumnBases');
  merged(group, frames, materials.white, 'ConradDoorFramesAndRoundCanopyColumns'); merged(group, glass, materials.entranceGlass, 'ConradFourPanelGlassEntrance');
  merged(group, brass, materials.brass, 'ConradBrassDoorPulls'); merged(group, carpet, materials.carpet, 'ConradRedArrivalCarpet', false);
  merged(group, lights, materials.light, 'ConradCanopyDownlights', false); merged(group, planters, materials.stone, 'ConradEntrancePlanters');
  merged(group, leaves, materials.leaves, 'ConradEntrancePlanting');
  for (const c of colliders) { c.minY += lift; c.maxY += lift; }
  return { group, colliders };
}

function createCrownSign() {
  const positions = [], uvs = [];
  const lengths = CONRAD_CROWN_SIGN_EDGES.map((edge) => conradEdgeOutward(CONRAD_LOCAL_RING, edge).length);
  const total = lengths.reduce((a, b) => a + b, 0); let passed = 0;
  for (let k = 0; k < CONRAD_CROWN_SIGN_EDGES.length; k++) {
    const edge = CONRAD_CROWN_SIGN_EDGES[k], u0 = passed / total, u1 = (passed + lengths[k]) / total; passed += lengths[k];
    const a = point(CONRAD_LOCAL_RING, edge, 0, 190.1, .16), b = point(CONRAD_LOCAL_RING, edge, 1, 190.1, .16);
    const c = point(CONRAD_LOCAL_RING, edge, 1, 194.5, .16), d = point(CONRAD_LOCAL_RING, edge, 0, 194.5, .16);
    for (const [p, u, v] of [[a, u0, 0], [b, u1, 0], [c, u1, 1], [a, u0, 0], [c, u1, 1], [d, u0, 1]]) { positions.push(...p); uvs.push(u, v); }
  }
  const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 256;
  const context = canvas.getContext('2d'); context.fillStyle = '#ec3650'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.font = '600 178px Arial, sans-serif'; const measured = context.measureText('CONRAD').width;
  context.save(); context.translate(1024, 132); context.scale(1510 / measured, 1); context.fillText('CONRAD', 0, 0); context.restore();
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.computeVertexNormals();
  const sign = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  sign.name = 'ConradCurvedRedCrownLettering'; sign.renderOrder = 12; return sign;
}
function createCrown() {
  const white = store(), coping = [], colliders = conradRingColliders(CONRAD_LOCAL_RING, 183.9, CONRAD_HEIGHT);
  for (let edge = 0; edge < CONRAD_LOCAL_RING.length / 2 - 1; edge++) {
    const length = conradEdgeOutward(CONRAD_LOCAL_RING, edge).length, p = (t, y, o = .02) => point(CONRAD_LOCAL_RING, edge, t, y, o);
    quad(white, p(0, 183.9), p(1, 183.9), p(1, CONRAD_HEIGHT), p(0, CONRAD_HEIGHT), [.8, .82, .8]);
    edgeBox(coping, CONRAD_LOCAL_RING, edge, .5, CONRAD_HEIGHT - .08, .08, length, .16, .28);
  }
  return { white, coping, colliders, sign: createCrownSign() };
}

export function buildConrad(root, { groundOffset = 0, entranceGroundOffset = groundOffset } = {}) {
  const group = new THREE.Group(); group.name = 'ConradHongKong'; group.userData.landmark = 'conrad-hong-kong';
  group.userData.osm = { type: 'way', id: CONRAD_OSM_SOURCE.id }; group.position.set(CONRAD_SITE.x, groundOffset, CONRAD_SITE.z);
  group.rotation.y = CONRAD_SITE.ry; root.add(group);
  const glass = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .34, roughness: .24, side: THREE.DoubleSide });
  glass.colorNode = attribute('color'); glass.emissiveNode = color(0xffd39b).mul(attribute('aLit')).mul(nightAmount());
  const white = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .08, roughness: .57, side: THREE.DoubleSide });
  white.colorNode = attribute('color'); white.emissiveNode = color(0xdfe8e4).mul(nightAmount()).mul(.055);
  const backing = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .2, roughness: .48, side: THREE.DoubleSide }); backing.colorNode = attribute('color');
  const dark = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .3, roughness: .4, side: THREE.DoubleSide }); dark.colorNode = attribute('color');
  const frame = new THREE.MeshStandardNodeMaterial({ color: 0xd9ded9, metalness: .16, roughness: .48 }); frame.emissiveNode = color(0xe6ede7).mul(nightAmount()).mul(.06);
  const stone = new THREE.MeshStandardMaterial({ color: 0x8a8b83, roughness: .72, metalness: .04 });
  const marble = new THREE.MeshStandardMaterial({ map: marbleTexture(), roughness: .38, metalness: .12 });
  const entranceGlass = new THREE.MeshStandardNodeMaterial({ color: 0x668d88, metalness: .16, roughness: .13, transparent: true, opacity: .42, side: THREE.DoubleSide });
  entranceGlass.emissiveNode = color(0xffd29a).mul(nightAmount()).mul(.16);
  const brass = new THREE.MeshStandardMaterial({ color: 0xb7a16d, metalness: .82, roughness: .25 });
  const carpet = new THREE.MeshStandardMaterial({ color: 0x9e1825, roughness: .92 });
  const light = new THREE.MeshStandardNodeMaterial({ color: 0xffe4b6 }); light.emissiveNode = color(0xffd18a).mul(nightAmount()).mul(2.2);
  const leaves = new THREE.MeshStandardMaterial({ color: 0x365a3c, roughness: .9 });
  const materials = { white: frame, stone, marble, entranceGlass, brass, carpet, light, leaves };

  const podium = createPodium(); meshStore(group, podium.white, white, 'ConradOpenArrivalWhiteBand');
  meshStore(group, podium.glass, glass, 'ConradRecessedLobbyCore'); merged(group, podium.columns, frame, 'ConradRoadSafePilotis');
  merged(group, podium.frames, frame, 'ConradPodiumFasciaAndLobbyFrames');
  const soffit = new THREE.Mesh(roofGeometry(CONRAD_LOCAL_RING, 14), frame); soffit.name = 'ConradOpenArrivalSoffit'; soffit.receiveShadow = true; group.add(soffit);
  const shaft = createShaft(); meshStore(group, shaft.backing, backing, 'ConradCurvedTowerBacking');
  meshStore(group, shaft.white, white, 'ConradWhiteFloorSpandrels'); meshStore(group, shaft.glass, glass, 'ConradBlueGreenHotelAndApartmentGlass');
  meshStore(group, shaft.mechanical, dark, 'ConradSingleDarkMechanicalBand'); meshStore(group, shaft.mullions, dark, 'ConradFineMullionsAndMechanicalLouvres');
  merged(group, shaft.slabs, frame, 'ConradWhiteHorizontalRibbonsAndThirteenVerticalFins');
  const entrance = createEntrance(materials, entranceGroundOffset - groundOffset); group.add(entrance.group);
  const crown = createCrown(); meshStore(group, crown.white, white, 'ConradCurvedWhiteCrownFascia');
  merged(group, crown.coping, frame, 'ConradCrownCoping198Point9m'); group.add(crown.sign);
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x263033, metalness: .22, roughness: .62, side: THREE.DoubleSide });
  const roof = new THREE.Mesh(roofGeometry(CONRAD_LOCAL_RING.map((v) => v * .985), CONRAD_HEIGHT - .18), roofMaterial);
  roof.name = 'ConradInsetRoof'; roof.receiveShadow = true; group.add(roof);

  const colliders = [...podium.colliders, ...shaft.colliders, ...crown.colliders, ...entrance.colliders];
  for (const c of colliders) { c.minY += groundOffset; c.maxY += groundOffset; }
  const grounds = { plaza: groundOffset + .12, entrance: entranceGroundOffset + .12 };
  const landmark = { id: 'conrad-hong-kong', name: CONRAD_SITE.name, position: { x: CONRAD_SITE.x, y: groundOffset, z: CONRAD_SITE.z }, radius: 58, height: CONRAD_HEIGHT };
  const stats = {
    conradGroundOffset: groundOffset, conradLandmarks: 1, conradOsmHeight: CONRAD_OSM_HEIGHT,
    conradCtbuhHeight: CONRAD_CTBUH_HEIGHT, conradHeight: CONRAD_HEIGHT, conradOccupiedHeight: CONRAD_OCCUPIED_HEIGHT,
    conradOsmLevels: CONRAD_OSM_LEVELS, conradCtbuhLevels: CONRAD_CTBUH_LEVELS,
    conradCompletionYear: CONRAD_COMPLETION_YEAR, conradRooms: CONRAD_ROOMS, conradArchitect: CONRAD_ARCHITECT,
    conradSourceVertices: 31, conradOsmWayVersion: 29, conradRingArea: CONRAD_RING_AREA,
    conradPodiumLevels: CONRAD_PODIUM_LEVELS, conradShaftCourses: CONRAD_SHAFT_COURSES,
    conradGlassPanels: shaft.glassPanels, conradFloorRibbons: shaft.floorRibbons, conradMechanicalLouvres: shaft.louvres,
    conradMajorFins: shaft.majorFins, conradPilotis: podium.columnCount, conradCrossingRoadRecords: CONRAD_CROSSING_ROADS.length,
    conradRoadVehicleClearance: CONRAD_ROAD_VEHICLE_CLEARANCE, conradPlazaGround: grounds.plaza,
    conradEntranceGround: grounds.entrance, conradColliders: colliders.length
  };
  return { group, colliders, landmarks: [landmark], stats, groundOffset, grounds, plazaTop: grounds.plaza,
    groundHeightAt: (x, z, ground) => conradGroundHeightAt(x, z, ground, grounds) };
}
