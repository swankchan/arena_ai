import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  TWO_TAIKOO_SITE, TWO_TAIKOO_OSM_SOURCE, TWO_TAIKOO_LOCAL_RING, TWO_TAIKOO_RING_AREA,
  TWO_TAIKOO_OSM_HEIGHT, TWO_TAIKOO_CTBUH_HEIGHT, TWO_TAIKOO_HEIGHT,
  TWO_TAIKOO_OSM_LEVELS, TWO_TAIKOO_CTBUH_LEVELS, TWO_TAIKOO_SWIRE_LEVELS,
  TWO_TAIKOO_START_DATE, TWO_TAIKOO_COMPLETION_YEAR, TWO_TAIKOO_NBBJ_GFA,
  TWO_TAIKOO_ARCHITECT, TWO_TAIKOO_FACADE_DESIGNER, TWO_TAIKOO_FACADE_ENGINEER, TWO_TAIKOO_DEVELOPER,
  TWO_TAIKOO_PANEL_WIDTH, TWO_TAIKOO_PUBLIC_GROUND_TOP, TWO_TAIKOO_GREAT_ROOM_HEIGHT,
  TWO_TAIKOO_GREAT_ROOM_BOTTOM, TWO_TAIKOO_GREAT_ROOM_TOP, TWO_TAIKOO_GARDEN_BOTTOM, TWO_TAIKOO_GARDEN_TOP,
  TWO_TAIKOO_ROOF_DECK, TWO_TAIKOO_VISUAL_COURSES, TWO_TAIKOO_MAIN_ENTRANCE, TWO_TAIKOO_EAST_ENTRANCE,
  TWO_TAIKOO_NORTH_ENTRANCE, TWO_TAIKOO_MAIN_FORECOURT_WIDTH, TWO_TAIKOO_MAIN_FORECOURT_DEPTH,
  TWO_TAIKOO_CROSSING_ROADS, TWO_TAIKOO_ROAD_VEHICLE_CLEARANCE, TWO_TAIKOO_PORTAL_LINTEL,
  TWO_TAIKOO_PLAZA_TOP, twoTaikooEdgeOutward, twoTaikooRingColliders, twoTaikooSegmentCollider,
  twoTaikooLocalCollider, twoTaikooFrameCollider, twoTaikooPodiumBayConflict,
  twoTaikooRoadConflictAtLocal, twoTaikooGroundHeightAt
} from './two-taikoo-place-architecture.js';

const lerp = (a, b, t) => a + (b - a) * t;
const nightAmount = () => smoothstep(.55, 1.4, cityUniforms.uInteriorGlow);
const store = () => ({ positions: [], colors: [], lit: [] });
const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
function hash(a, b, c, d = 0) { const v = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + d * 19.19) * 43758.5453; return v - Math.floor(v); }
function quad(s, a, b, c, d, tint, lit = 0) { for (const p of [a, b, c, a, c, d]) { s.positions.push(...p); s.colors.push(...tint); s.lit.push(lit); } }
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
  if (!parts.length) return null; const geo = mergeGeometries(parts, false); for (const part of parts) part.dispose();
  const mesh = new THREE.Mesh(geo, material); mesh.name = name; mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function box(parts, center, size, ry = 0) { const g = new THREE.BoxGeometry(...size); if (ry) g.rotateY(ry); g.translate(...center); parts.push(g); return g; }
function cylinder(parts, center, radius, height, segments = 16, radiusTop = radius) { const g = new THREE.CylinderGeometry(radiusTop, radius, height, segments); g.translate(...center); parts.push(g); return g; }
function beam(parts, a, b, width = .1, depth = width) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start), length = direction.length(); if (length < .001) return;
  const g = new THREE.BoxGeometry(width, length, depth); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  g.translate(...start.add(end).multiplyScalar(.5).toArray()); parts.push(g); return g;
}
function point(ring, edge, t, y, offset = 0) {
  const i = edge * 2, { nx, nz } = twoTaikooEdgeOutward(ring, edge);
  return [lerp(ring[i], ring[i + 2], t) + nx * offset, y, lerp(ring[i + 1], ring[i + 3], t) + nz * offset];
}
function edgeBox(parts, ring, edge, t, y, offset, width, height, depth) { const p = point(ring, edge, t, y, offset), { ry } = twoTaikooEdgeOutward(ring, edge); return box(parts, p, [width, height, depth], ry); }
function edgeSegmentBox(parts, ring, edge, t0, t1, y, offset, height, depth) { const length = twoTaikooEdgeOutward(ring, edge).length; edgeBox(parts, ring, edge, (t0 + t1) * .5, y, offset, length * (t1 - t0), height, depth); }
function roofGeometry(ring, y) {
  const shape = new THREE.Shape(); for (let i = 0; i < ring.length - 2; i += 2) { if (i === 0) shape.moveTo(ring[i], -ring[i + 1]); else shape.lineTo(ring[i], -ring[i + 1]); }
  shape.closePath(); const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g;
}
function insideFlat(ring, x, z) {
  let inside = false; for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) { const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside; } return inside;
}
function insetRing(ring, amount) {
  const out = []; for (let i = 0; i < ring.length - 2; i += 2) { const x = ring[i], z = ring[i + 1], length = Math.hypot(x, z) || 1; out.push(x - x / length * amount, z - z / length * amount); }
  out.push(out[0], out[1]); return Object.freeze(out);
}

// Only rounded corner vertices drift with height; the long elevation datums remain on the exact OSM ring.
const TOWER_TOP_RING = Object.freeze((() => {
  const out = [];
  for (let i = 0; i < TWO_TAIKOO_LOCAL_RING.length - 2; i += 2) {
    const x = TWO_TAIKOO_LOCAL_RING[i], z = TWO_TAIKOO_LOCAL_RING[i + 1], sx = Math.max(0, Math.min(1, (Math.abs(x) - 26) / 6)), sz = Math.max(0, Math.min(1, (Math.abs(z) - 10) / 5));
    const influence = sx * sz, length = Math.hypot(x, z) || 1, drift = .55 * influence; out.push(x + x / length * drift, z + z / length * drift);
  }
  out.push(out[0], out[1]); return out;
})());
function towerPoint(edge, t, y, offset = 0) {
  const i = edge * 2, h = Math.max(0, Math.min(1, (y - TWO_TAIKOO_GARDEN_TOP) / (TWO_TAIKOO_ROOF_DECK - TWO_TAIKOO_GARDEN_TOP)));
  const ax = lerp(TWO_TAIKOO_LOCAL_RING[i], TOWER_TOP_RING[i], h), az = lerp(TWO_TAIKOO_LOCAL_RING[i + 1], TOWER_TOP_RING[i + 1], h);
  const bx = lerp(TWO_TAIKOO_LOCAL_RING[i + 2], TOWER_TOP_RING[i + 2], h), bz = lerp(TWO_TAIKOO_LOCAL_RING[i + 3], TOWER_TOP_RING[i + 3], h);
  const { nx, nz } = twoTaikooEdgeOutward(TWO_TAIKOO_LOCAL_RING, edge); return [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
}
function createTowerFacade() {
  const glass = store(), backing = store(), spandrel = store(), mullions = store(), fins = [];
  const courses = Math.round(TWO_TAIKOO_VISUAL_COURSES * (TWO_TAIKOO_ROOF_DECK - TWO_TAIKOO_GARDEN_TOP) / TWO_TAIKOO_HEIGHT);
  let glassPanels = 0, verticalFins = 0;
  for (let edge = 0; edge < TWO_TAIKOO_LOCAL_RING.length / 2 - 1; edge++) {
    const length = twoTaikooEdgeOutward(TWO_TAIKOO_LOCAL_RING, edge).length, bays = Math.max(1, Math.ceil(length / TWO_TAIKOO_PANEL_WIDTH)), p = (t, y, o = 0) => towerPoint(edge, t, y, o);
    for (let course = 0; course < courses; course++) {
      const y0 = lerp(TWO_TAIKOO_GARDEN_TOP, TWO_TAIKOO_ROOF_DECK, course / courses), y1 = lerp(TWO_TAIKOO_GARDEN_TOP, TWO_TAIKOO_ROOF_DECK, (course + 1) / courses), band = .32;
      quad(spandrel, p(0, y0, .055), p(1, y0, .055), p(1, y0 + band, .055), p(0, y0 + band, .055), [.36, .45, .47]);
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + .0007, t1 = (bay + 1) / bays - .0007, variation = hash(edge, bay, course, 27), lit = variation > .84 ? .08 + hash(course, bay, edge, 4) * .52 : 0;
        const tint = mix([.08, .18, .21], [.28, .4, .42], .18 + variation * .62);
        quad(backing, p(t0, y0 + band, -.2), p(t1, y0 + band, -.2), p(t1, y1 - .07, -.2), p(t0, y1 - .07, -.2), [.025, .045, .052], lit * .45);
        quad(glass, p(t0, y0 + band, .015), p(t1, y0 + band, .015), p(t1, y1 - .07, .015), p(t0, y1 - .07, .015), tint, lit); glassPanels++;
      }
    }
    for (let bay = 0; bay <= bays; bay++) {
      const t = bay / bays, bottom = p(t, TWO_TAIKOO_GARDEN_TOP, .26), top = p(t, TWO_TAIKOO_ROOF_DECK, .26), center = bottom.map((v, i) => (v + top[i]) * .5), ry = twoTaikooEdgeOutward(TWO_TAIKOO_LOCAL_RING, edge).ry;
      box(fins, center, [.11, TWO_TAIKOO_ROOF_DECK - TWO_TAIKOO_GARDEN_TOP, .62], ry); verticalFins++;
      const dt = Math.min(.0012, .028 / length);
      quad(mullions, p(Math.max(0, t - dt), TWO_TAIKOO_GARDEN_TOP, .09), p(Math.min(1, t + dt), TWO_TAIKOO_GARDEN_TOP, .09), p(Math.min(1, t + dt), TWO_TAIKOO_ROOF_DECK, .09), p(Math.max(0, t - dt), TWO_TAIKOO_ROOF_DECK, .09), [.22, .28, .3]);
    }
  }
  return { glass, backing, spandrel, mullions, fins, courses, glassPanels, verticalFins,
    colliders: [...twoTaikooRingColliders(TWO_TAIKOO_LOCAL_RING, TWO_TAIKOO_GARDEN_TOP, TWO_TAIKOO_ROOF_DECK), ...twoTaikooRingColliders(TOWER_TOP_RING, TWO_TAIKOO_GARDEN_TOP, TWO_TAIKOO_ROOF_DECK)] };
}

function createGreatRoom() {
  const glass = store(), frames = [], columns = [], cores = [], lights = [], gold = [], colliders = [];
  let openRoadBays = 0, entranceBays = 0, closedBays = 0, columnCount = 0;
  const entranceEdges = new Set([TWO_TAIKOO_MAIN_ENTRANCE.sourceEdge, TWO_TAIKOO_EAST_ENTRANCE.sourceEdge, TWO_TAIKOO_NORTH_ENTRANCE.sourceEdge]);
  for (let edge = 0; edge < TWO_TAIKOO_LOCAL_RING.length / 2 - 1; edge++) {
    const length = twoTaikooEdgeOutward(TWO_TAIKOO_LOCAL_RING, edge).length, bays = Math.max(1, Math.ceil(length / TWO_TAIKOO_PANEL_WIDTH)), p = (t, y, o = .02) => point(TWO_TAIKOO_LOCAL_RING, edge, t, y, o);
    for (let bay = 0; bay < bays; bay++) {
      const a = bay / bays, b = (bay + 1) / bays, t0 = a + .0007, t1 = b - .0007, road = twoTaikooPodiumBayConflict(TWO_TAIKOO_LOCAL_RING, edge, a, b);
      const entrance = entranceEdges.has(edge) && (edge === TWO_TAIKOO_MAIN_ENTRANCE.sourceEdge ? bay < 2 : bay === 0);
      if (road) {
        openRoadBays++; edgeSegmentBox(frames, TWO_TAIKOO_LOCAL_RING, edge, a, b, TWO_TAIKOO_PUBLIC_GROUND_TOP - TWO_TAIKOO_PORTAL_LINTEL * .5, .08, TWO_TAIKOO_PORTAL_LINTEL, .42);
        quad(glass, p(t0, TWO_TAIKOO_PUBLIC_GROUND_TOP), p(t1, TWO_TAIKOO_PUBLIC_GROUND_TOP), p(t1, TWO_TAIKOO_GREAT_ROOM_TOP), p(t0, TWO_TAIKOO_GREAT_ROOM_TOP), [.12, .25, .28], .08);
        colliders.push(twoTaikooSegmentCollider(TWO_TAIKOO_LOCAL_RING, edge, a, b, TWO_TAIKOO_PUBLIC_GROUND_TOP, TWO_TAIKOO_GREAT_ROOM_TOP, .3)); continue;
      }
      const lower = entrance ? 4.8 : TWO_TAIKOO_GREAT_ROOM_BOTTOM; if (entrance) entranceBays++; else closedBays++;
      quad(glass, p(t0, lower + .06), p(t1, lower + .06), p(t1, TWO_TAIKOO_GREAT_ROOM_TOP - .06), p(t0, TWO_TAIKOO_GREAT_ROOM_TOP - .06), mix([.1, .22, .25], [.24, .36, .37], hash(edge, bay, 27)), .06 + hash(bay, edge, 2) * .12);
      colliders.push(twoTaikooSegmentCollider(TWO_TAIKOO_LOCAL_RING, edge, a, b, lower, TWO_TAIKOO_GREAT_ROOM_TOP, .26));
      const mt = a, dt = Math.min(.001, .025 / length); quad(glass, p(mt, lower, .04), p(mt + dt, lower, .04), p(mt + dt, TWO_TAIKOO_GREAT_ROOM_TOP, .04), p(mt, TWO_TAIKOO_GREAT_ROOM_TOP, .04), [.38, .48, .49]);
    }
    if (length > 7) {
      const count = Math.max(1, Math.floor(length / 11));
      for (let i = 0; i <= count; i++) {
        const t = (i + .5) / (count + 1), q = point(TWO_TAIKOO_LOCAL_RING, edge, t, TWO_TAIKOO_GREAT_ROOM_TOP * .5, -1.05); if (twoTaikooRoadConflictAtLocal(q[0], q[2], 1)) continue;
        box(columns, q, [.48, TWO_TAIKOO_GREAT_ROOM_TOP, .48]); colliders.push(twoTaikooLocalCollider(q[0], q[2], .58, .58, 0, TWO_TAIKOO_GREAT_ROOM_TOP)); columnCount++;
      }
    }
  }
  for (const [edge, reverse] of [[18, false], [48, true]]) {
    const a = point(TWO_TAIKOO_LOCAL_RING, edge, reverse ? .94 : .06, 3.2, .22), b = point(TWO_TAIKOO_LOCAL_RING, edge, reverse ? .06 : .9, 14.2, .22); beam(frames, a, b, .34, .2);
  }
  // Keep the recessed core completely clear of the service-road envelope.
  box(cores, [14, 7.5, 0], [7, 15, 9]); colliders.push(twoTaikooLocalCollider(14, 0, 7, 9, 0, 15));
  for (let cluster = 0; cluster < 5; cluster++) {
    const cx = -20 + cluster * 6.2, cz = cluster % 2 ? 7 : -6;
    for (let cube = 0; cube < 9; cube++) {
      const x = cx + (cube % 3 - 1) * .65, z = cz + (Math.floor(cube / 3) - 1) * .65, y = 10.2 + hash(cluster, cube, 8) * 2.8;
      box(gold, [x, y, z], [.34, .34, .34]); beam(frames, [x, y + .18, z], [x, 14.7, z], .025);
    }
    cylinder(lights, [cx, 12.9, cz], .13, .08, 12);
  }
  return { glass, frames, columns, cores, lights, gold, colliders, openRoadBays, entranceBays, closedBays, columnCount };
}

const TAIKOO_SIGN_GLYPHS = {
  '太': [[[10,28],[90,28]],[[48,8],[38,48],[12,92]],[[46,42],[62,68],[90,92]],[[62,58],[76,70]]],
  '古': [[[12,22],[88,22]],[[50,4],[50,54]],[[22,48],[80,48],[80,94],[22,94],[22,48]]],
  '坊': [[[8,28],[36,28]],[[22,10],[22,82]],[[6,82],[38,82]],[[50,12],[90,12]],[[68,4],[58,46],[48,92]],[[48,46],[88,46],[82,88],[68,94]]],
  '二': [[[18,24],[82,24]],[[8,80],[92,80]]],
  '座': [[[50,4],[50,14]],[[14,22],[88,22]],[[20,22],[20,92]],[[32,36],[32,76]],[[68,36],[68,76]],[[26,48],[42,48]],[[58,48],[76,48]],[[50,42],[50,92]],[[30,66],[72,66]],[[24,92],[80,92]]]
};
function drawChinese(context, text, centreX, centreY, size, fill) {
  const chars = [...text], advance = size * 1.08; let x = centreX - (chars.length - 1) * advance * .5 - size * .5;
  context.strokeStyle = fill; context.lineWidth = Math.max(1.4, size * .052); context.lineJoin = 'miter'; context.lineCap = 'square';
  for (const char of chars) { const glyph = TAIKOO_SIGN_GLYPHS[char]; if (!glyph) continue; const top = centreY - size * .5, scale = size / 100;
    for (const path of glyph) { context.beginPath(); path.forEach(([px, py], index) => { const xx = x + px * scale, yy = top + py * scale; if (index) context.lineTo(xx, yy); else context.moveTo(xx, yy); }); context.stroke(); } x += advance; }
}
function textPlane(text, width, height, fontSize = 64, tint = '#edf1ee', chinese = false) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 192; const context = canvas.getContext('2d'); context.fillStyle = tint; context.textAlign = 'center'; context.textBaseline = 'middle';
  if (chinese) drawChinese(context, text, 512, 96, Math.min(122, fontSize), tint); else { context.font = `500 ${fontSize}px Arial, sans-serif`; context.fillText(text, 512, 96); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); mesh.renderOrder = 12; return mesh;
}
function frameGroup(frame, lift = TWO_TAIKOO_PLAZA_TOP) { const group = new THREE.Group(); group.position.set(frame.localX, lift, frame.localZ); group.rotation.y = frame.ry - TWO_TAIKOO_SITE.ry; return group; }
function createEntrance(frame, materials, kind) {
  const group = frameGroup(frame); group.name = kind === 'WestPublic' ? 'TwoTaikooPlaceWestPublicEntrance' : kind === 'North' ? 'TwoTaikooPlaceNorthEntrance' : 'TwoTaikooPlaceEastEntrance';
  const parts = { stone: [], frames: [], glass: [], dark: [], lights: [] }, colliders = [], main = kind === 'WestPublic', north = kind === 'North', width = main ? 4.8 : north ? 3.4 : 1.55, cx = main ? 2.75 : north ? 2.15 : .9;
  const panels = main ? 4 : 2, panelWidth = width / panels;
  for (let panel = 0; panel < panels; panel++) box(parts.glass, [cx - width * .5 + panelWidth * (panel + .5), 2.4, -.18], [panelWidth - .055, 4.8, .075]);
  for (let panel = 0; panel <= panels; panel++) box(parts.frames, [cx - width * .5 + panelWidth * panel, 2.42, -.11], [.055, 4.84, .11]);
  for (const side of [-1, 1]) { const x = cx + side * (width * .5 + .34); box(parts.stone, [x, 2.75, -.32], [.55, 5.5, .72]); colliders.push(twoTaikooFrameCollider(frame, x, -.32, .58, .75, 0, 5.5, TWO_TAIKOO_PLAZA_TOP)); }
  box(parts.frames, [cx, 5.12, .75], [width + 1.4, .18, 2.1]); box(parts.dark, [cx, 4.93, -.3], [width + .7, .22, .65]);
  colliders.push(twoTaikooFrameCollider(frame, cx, -.18, width, .22, 0, 4.85, TWO_TAIKOO_PLAZA_TOP));
  const sign = textPlane('TWO TAIKOO PLACE', main ? 5.8 : 3.5, main ? .72 : .55, main ? 76 : 88); sign.position.set(cx, 6.22, .22); group.add(sign);
  const chinese = textPlane('太古坊二座', main ? 3.4 : 2.5, .48, 100, '#e9efeb', true); chinese.position.set(cx, 5.52, 1.86); group.add(chinese);
  for (const x of [cx - width * .3, cx + width * .3]) cylinder(parts.lights, [x, 5.01, .65], .09, .045, 12);
  merged(group, parts.stone, materials.limestone, `${group.name}StoneBlades`); merged(group, parts.frames, materials.silver, `${group.name}FramesAndCanopy`);
  merged(group, parts.glass, materials.clearGlass, `${group.name}FramelessDoors`, false); merged(group, parts.dark, materials.dark, `${group.name}DoorHeader`); merged(group, parts.lights, materials.light, `${group.name}WarmDownlights`, false);
  return { group, colliders };
}
function createForecourtAndArch(materials) {
  const group = frameGroup(TWO_TAIKOO_MAIN_ENTRANCE, 0); group.name = 'TwoTaikooPlaceLandscapedForecourtAndArchedBridge';
  const paving = [], planters = [], trunks = [], leaves = [], rails = [], colliders = [];
  box(paving, [0, TWO_TAIKOO_PLAZA_TOP * .5, TWO_TAIKOO_MAIN_FORECOURT_DEPTH * .5], [TWO_TAIKOO_MAIN_FORECOURT_WIDTH, TWO_TAIKOO_PLAZA_TOP, TWO_TAIKOO_MAIN_FORECOURT_DEPTH]);
  for (const side of [-1, 1]) {
    const x = side * 5.7; box(planters, [x, .42, 3.2], [1.25, .72, 3.8]); colliders.push(twoTaikooFrameCollider(TWO_TAIKOO_MAIN_ENTRANCE, x, 3.2, 1.3, 3.85, 0, .78));
    cylinder(trunks, [x, 1.75, 3.1], .13, 2.7, 10); for (let cluster = 0; cluster < 3; cluster++) { const g = new THREE.IcosahedronGeometry(.85, 1); g.translate(x + (cluster - 1) * .5, 3.25 + cluster * .15, 3.1 + (cluster % 2 ? .35 : -.2)); leaves.push(g); }
  }
  box(paving, [2.75, .14, 3.2], [4.4, .16, 5.4]);
  for (const side of [-1, 1]) {
    const x = 2.75 + side * 2.15;
    for (let segment = 0; segment < 12; segment++) { const z0 = .5 + segment * .45, z1 = z0 + .45, arch = (z) => .68 + Math.sin((z - .5) / 5.4 * Math.PI) * .9; beam(rails, [x, arch(z0), z0], [x, arch(z1), z1], .09); beam(rails, [x, .22, z0], [x, arch(z0), z0], .055); }
    colliders.push(twoTaikooFrameCollider(TWO_TAIKOO_MAIN_ENTRANCE, x, 3.2, .16, 5.5, .15, 1.65));
  }
  merged(group, paving, materials.paving, 'TwoTaikooPlaceFlushForecourtAndBridgeDeck'); merged(group, planters, materials.planter, 'TwoTaikooPlaceEntrancePlanters');
  merged(group, trunks, materials.trunk, 'TwoTaikooPlaceEntranceTreeTrunks'); merged(group, leaves, materials.leaves, 'TwoTaikooPlaceEntranceTrees'); merged(group, rails, materials.silver, 'TwoTaikooPlaceTwinArchedBridgeBalustrades');
  return { group, colliders };
}

function createTwoLevelGardens(materials) {
  const group = new THREE.Group(); group.name = 'TwoTaikooPlaceTwoLevelsOfSkyGardens';
  const ring = insetRing(TWO_TAIKOO_LOCAL_RING, .3), planters = [], trunks = [], leaves = [], shrubs = [], lawns = [], columns = [], rails = [], glass = store(), colliders = [];
  let treeCount = 0;
  for (const level of [TWO_TAIKOO_GARDEN_BOTTOM, TWO_TAIKOO_GARDEN_BOTTOM + 4]) {
    const deck = new THREE.Mesh(roofGeometry(ring, level + .02), materials.gardenPaving); deck.name = `TwoTaikooPlaceGardenDeck${level}`; deck.receiveShadow = true; group.add(deck);
    for (const x of [-18, -6, 6, 18]) for (const z of [-8, 8]) if (insideFlat(ring, x, z)) box(lawns, [x, level + .075, z], [7.4, .11, 4.4]);
    for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
      const length = twoTaikooEdgeOutward(ring, edge).length; if (length < 2) continue; const p = (t, y, o = .04) => point(ring, edge, t, y, o);
      quad(glass, p(0, level + .15), p(1, level + .15), p(1, level + 1.15), p(0, level + 1.15), [.25, .42, .42]); edgeBox(rails, ring, edge, .5, level + 1.2, .08, length, .065, .09);
      const shrubCount = Math.max(1, Math.floor(length / 3.5));
      for (let shrub = 0; shrub < shrubCount; shrub++) { const q = point(ring, edge, (shrub + .5) / shrubCount, level + .58, -.72), g = new THREE.IcosahedronGeometry(.38 + hash(level, edge, shrub) * .16, 0); g.translate(q[0], q[1], q[2]); shrubs.push(g); }
      const count = length > 5 ? Math.max(1, Math.floor(length / 8)) : 0;
      for (let i = 0; i < count; i++) {
        const t = (i + 1) / (count + 1), q = point(ring, edge, t, level + .36, -1.05), ry = twoTaikooEdgeOutward(ring, edge).ry;
        box(planters, q, [2.7, .68, 1.15], ry); cylinder(trunks, [q[0], level + 1.55, q[2]], .11, 2.25, 10);
        for (let cluster = 0; cluster < 3; cluster++) { const g = new THREE.IcosahedronGeometry(.7 + hash(level, edge, i, cluster) * .25, 1); g.translate(q[0] + (cluster - 1) * .55, level + 2.75 + cluster * .15, q[2] + (cluster % 2 ? .3 : -.2)); leaves.push(g); }
        colliders.push(twoTaikooLocalCollider(q[0], q[2], 2.75, 1.2, level, level + .72, TWO_TAIKOO_SITE.ry + ry)); treeCount++;
      }
    }
  }
  for (const [x, z] of [[-24, 0], [22, 8], [20, -8], [0, 15], [0, -15]]) { box(columns, [x, 19, z], [.42, 8, .42]); colliders.push(twoTaikooLocalCollider(x, z, .52, .52, 15, 23)); }
  merged(group, lawns, materials.leaves, 'TwoTaikooPlaceGardenLawns'); merged(group, shrubs, materials.leaves, 'TwoTaikooPlaceGardenShrubs');
  merged(group, planters, materials.planter, 'TwoTaikooPlaceGardenPlanters'); merged(group, trunks, materials.trunk, 'TwoTaikooPlaceGardenTreeTrunks');
  merged(group, leaves, materials.leaves, 'TwoTaikooPlaceGardenPlanting'); merged(group, columns, materials.limestone, 'TwoTaikooPlaceGardenColumns');
  merged(group, rails, materials.silver, 'TwoTaikooPlaceGardenHandrails'); meshStore(group, glass, materials.balustrade, 'TwoTaikooPlaceGardenBalustrades', false);
  return { group, colliders, treeCount };
}

function createRoof(materials) {
  const group = new THREE.Group(); group.name = 'TwoTaikooPlacePlantedRenewableEnergyRoof';
  const ring = TOWER_TOP_RING, parapet = store(), coping = [], planters = [], leaves = [], cooling = [], louvres = [], fans = [], pv = [], racks = [], wind = [], colliders = [];
  const deck = new THREE.Mesh(roofGeometry(ring, TWO_TAIKOO_ROOF_DECK + .02), materials.roofPaving); deck.name = 'TwoTaikooPlaceRoofDeck187Point6m'; deck.receiveShadow = true; group.add(deck);
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const length = twoTaikooEdgeOutward(ring, edge).length, p = (t, y, o = 0) => point(ring, edge, t, y, o);
    quad(parapet, p(0, TWO_TAIKOO_ROOF_DECK), p(1, TWO_TAIKOO_ROOF_DECK), p(1, TWO_TAIKOO_HEIGHT), p(0, TWO_TAIKOO_HEIGHT), [.55, .61, .62]);
    edgeBox(coping, ring, edge, .5, TWO_TAIKOO_HEIGHT - .08, .04, length, .16, .3);
    if (length > 2) {
      const count = Math.max(1, Math.floor(length / 8));
      for (let i = 0; i < count; i++) {
        const q = point(ring, edge, (i + 1) / (count + 1), TWO_TAIKOO_ROOF_DECK + .32, -1.15), ry = twoTaikooEdgeOutward(ring, edge).ry; box(planters, q, [2.8, .6, 1.2], ry);
        for (let cluster = 0; cluster < 4; cluster++) { const g = new THREE.IcosahedronGeometry(.38 + hash(edge, i, cluster) * .15, 0); g.translate(q[0] + (cluster - 1.5) * .55, TWO_TAIKOO_ROOF_DECK + .82, q[2]); leaves.push(g); }
      }
    }
  }
  colliders.push(...twoTaikooRingColliders(ring, TWO_TAIKOO_ROOF_DECK, TWO_TAIKOO_HEIGHT));
  for (let i = 0; i < 6; i++) {
    const x = -12.5 + (i % 3) * 8, z = -2 + Math.floor(i / 3) * 6; box(cooling, [x, TWO_TAIKOO_ROOF_DECK + 1.25, z], [5.4, 2.5, 4.1]);
    for (let y = .35; y < 2.3; y += .28) box(louvres, [x, TWO_TAIKOO_ROOF_DECK + y, z + 2.07], [5.1, .09, .08]);
    for (const side of [-1, 1]) cylinder(fans, [x + side * 1.35, TWO_TAIKOO_ROOF_DECK + 2.58, z], 1.05, .16, 24);
    colliders.push(twoTaikooLocalCollider(x, z, 5.5, 4.2, TWO_TAIKOO_ROOF_DECK, TWO_TAIKOO_ROOF_DECK + 2.7));
  }
  for (const [cx, cz] of [[-23, 5], [19, -7]]) {
    for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
      const x = cx + (col - 1.5) * 1.65, z = cz + (row - 1) * 1.75, y = TWO_TAIKOO_ROOF_DECK + .85 + row * .06, g = new THREE.BoxGeometry(1.5, .075, 1.35); g.rotateX(-.28); g.translate(x, y, z); pv.push(g);
      beam(racks, [x - .55, TWO_TAIKOO_ROOF_DECK + .08, z + .45], [x - .55, y, z], .055); beam(racks, [x + .55, TWO_TAIKOO_ROOF_DECK + .08, z + .45], [x + .55, y, z], .055);
    }
    colliders.push(twoTaikooLocalCollider(cx, cz, 7, 5.4, TWO_TAIKOO_ROOF_DECK, TWO_TAIKOO_ROOF_DECK + 1.25));
  }
  const wx = 0, wz = 12, base = TWO_TAIKOO_ROOF_DECK; cylinder(wind, [wx, base + 1.15, wz], .09, 2.3, 12);
  for (let blade = 0; blade < 3; blade++) { const angle = blade * Math.PI * 2 / 3;
    for (let segment = 0; segment < 8; segment++) { const y0 = base + 1.25 + segment * .2, y1 = y0 + .2, a0 = angle + segment * .12, a1 = angle + (segment + 1) * .12; beam(wind, [wx + Math.cos(a0) * .65, y0, wz + Math.sin(a0) * .65], [wx + Math.cos(a1) * .65, y1, wz + Math.sin(a1) * .65], .12, .055); } }
  colliders.push(twoTaikooLocalCollider(wx, wz, 1.5, 1.5, base, base + 3));
  meshStore(group, parapet, materials.spandrel, 'TwoTaikooPlaceRoundedRoofParapetTo191m'); merged(group, coping, materials.silver, 'TwoTaikooPlaceRoundedMetalCoping');
  merged(group, planters, materials.planter, 'TwoTaikooPlaceRoofPerimeterPlanters'); merged(group, leaves, materials.leaves, 'TwoTaikooPlaceRoofPlanting');
  merged(group, cooling, materials.limestone, 'TwoTaikooPlaceSixCoolingTowers'); merged(group, louvres, materials.dark, 'TwoTaikooPlaceCoolingTowerLouvres');
  merged(group, fans, materials.dark, 'TwoTaikooPlaceCoolingTowerFans'); merged(group, pv, materials.pv, 'TwoTaikooPlaceTwoInclinedPhotovoltaicRacks');
  merged(group, racks, materials.silver, 'TwoTaikooPlacePhotovoltaicSupports'); merged(group, wind, materials.silver, 'TwoTaikooPlaceVerticalAxisWindDevice');
  return { group, colliders, coolingTowers: 6, pvModules: 24, windDevices: 1 };
}

export function buildTwoTaikooPlace(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'TwoTaikooPlace'; group.userData.landmark = 'two-taikoo-place'; group.userData.osm = { type: 'way', id: TWO_TAIKOO_OSM_SOURCE.id };
  group.position.set(TWO_TAIKOO_SITE.x, groundOffset, TWO_TAIKOO_SITE.z); group.rotation.y = TWO_TAIKOO_SITE.ry; root.add(group);
  const glass = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .34, roughness: .2, side: THREE.DoubleSide }); glass.colorNode = attribute('color'); glass.emissiveNode = color(0xffd3a0).mul(attribute('aLit')).mul(nightAmount());
  const lobbyGlass = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .08, roughness: .12, transparent: true, opacity: .38, side: THREE.DoubleSide, depthWrite: false }); lobbyGlass.colorNode = attribute('color'); lobbyGlass.emissiveNode = color(0xffd5a0).mul(attribute('aLit')).mul(nightAmount()).mul(.45);
  const backing = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .15, roughness: .5, side: THREE.DoubleSide }); backing.colorNode = attribute('color'); backing.emissiveNode = color(0xffd3a0).mul(attribute('aLit')).mul(nightAmount());
  const spandrel = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .38, roughness: .4, side: THREE.DoubleSide }); spandrel.colorNode = attribute('color'); spandrel.emissiveNode = color(0xdce8e6).mul(nightAmount()).mul(.04);
  const mullion = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .52, roughness: .35, side: THREE.DoubleSide }); mullion.colorNode = attribute('color');
  const silver = new THREE.MeshStandardNodeMaterial({ color: 0xc3cdcd, metalness: .62, roughness: .32 }); silver.emissiveNode = color(0xdde9e6).mul(nightAmount()).mul(.04);
  const limestone = new THREE.MeshStandardMaterial({ color: 0xb6b5aa, metalness: .04, roughness: .68 });
  const clearGlass = new THREE.MeshStandardNodeMaterial({ color: 0x9bb9ba, metalness: .1, roughness: .1, transparent: true, opacity: .3, side: THREE.DoubleSide, depthWrite: false }); clearGlass.emissiveNode = color(0xffd5a0).mul(nightAmount()).mul(.07);
  const balustrade = new THREE.MeshStandardNodeMaterial({ vertexColors: true, transparent: true, opacity: .27, roughness: .14, metalness: .08, side: THREE.DoubleSide, depthWrite: false }); balustrade.colorNode = attribute('color');
  const dark = new THREE.MeshStandardMaterial({ color: 0x20292b, metalness: .34, roughness: .42 });
  const light = new THREE.MeshStandardNodeMaterial({ color: 0xffe3b0 }); light.emissiveNode = color(0xffce83).mul(nightAmount()).mul(2.2);
  const gold = new THREE.MeshStandardNodeMaterial({ color: 0xcaa25b, metalness: .65, roughness: .28 }); gold.emissiveNode = color(0xffbd61).mul(nightAmount()).mul(1.25);
  const paving = new THREE.MeshStandardMaterial({ color: 0xa9aca4, roughness: .8, metalness: .03, side: THREE.DoubleSide });
  const gardenPaving = new THREE.MeshStandardMaterial({ color: 0x79847c, roughness: .86, metalness: .02, side: THREE.DoubleSide });
  const roofPaving = new THREE.MeshStandardMaterial({ color: 0x626c69, roughness: .88, metalness: .02, side: THREE.DoubleSide });
  const planter = new THREE.MeshStandardMaterial({ color: 0x777d77, roughness: .76 }), leaves = new THREE.MeshStandardMaterial({ color: 0x416a45, roughness: .9 }), trunk = new THREE.MeshStandardMaterial({ color: 0x51483b, roughness: .95 });
  const pv = new THREE.MeshStandardMaterial({ color: 0x183b50, metalness: .62, roughness: .24 });
  const materials = { glass, lobbyGlass, backing, spandrel, mullion, silver, limestone, clearGlass, balustrade, dark, light, gold, paving, gardenPaving, roofPaving, planter, leaves, trunk, pv };

  const greatRoom = createGreatRoom();
  meshStore(group, greatRoom.glass, lobbyGlass, 'TwoTaikooPlace15mFramelessGreatRoomGlazing'); merged(group, greatRoom.frames, silver, 'TwoTaikooPlaceDiagonalSilverBandsAndPortalLintels');
  merged(group, greatRoom.columns, limestone, 'TwoTaikooPlaceRoadSafeGreatRoomColumns'); merged(group, greatRoom.cores, dark, 'TwoTaikooPlaceRecessedGreatRoomCore');
  merged(group, greatRoom.lights, light, 'TwoTaikooPlaceGreatRoomWarmLights', false); merged(group, greatRoom.gold, gold, 'TwoTaikooPlaceGoldCubeChandeliers');
  const tower = createTowerFacade();
  meshStore(group, tower.backing, backing, 'TwoTaikooPlaceRecessedCurtainWallBacking'); meshStore(group, tower.glass, glass, 'TwoTaikooPlaceConicalCornerUnitizedGlass');
  meshStore(group, tower.spandrel, spandrel, 'TwoTaikooPlaceSilverSpandrelCourses'); meshStore(group, tower.mullions, mullion, 'TwoTaikooPlaceThreeMetrePanelJoints'); merged(group, tower.fins, silver, 'TwoTaikooPlaceExternalVerticalSolarShadingFins');
  const gardens = createTwoLevelGardens(materials); group.add(gardens.group);
  const west = createEntrance(TWO_TAIKOO_MAIN_ENTRANCE, materials, 'WestPublic'); group.add(west.group);
  const east = createEntrance(TWO_TAIKOO_EAST_ENTRANCE, materials, 'East'); group.add(east.group);
  const north = createEntrance(TWO_TAIKOO_NORTH_ENTRANCE, materials, 'North'); group.add(north.group);
  const forecourt = createForecourtAndArch(materials); group.add(forecourt.group); const roof = createRoof(materials); group.add(roof.group);
  const colliders = [...greatRoom.colliders, ...tower.colliders, ...gardens.colliders, ...west.colliders, ...east.colliders, ...north.colliders, ...forecourt.colliders, ...roof.colliders];
  for (const c of colliders) { c.minY += groundOffset; c.maxY += groundOffset; }
  const grounds = { plaza: groundOffset + TWO_TAIKOO_PLAZA_TOP }, landmark = { id: 'two-taikoo-place', name: TWO_TAIKOO_SITE.name, position: { x: TWO_TAIKOO_SITE.x, y: groundOffset, z: TWO_TAIKOO_SITE.z }, radius: 75, height: TWO_TAIKOO_HEIGHT };
  const stats = {
    twoTaikooGroundOffset: groundOffset, twoTaikooLandmarks: 1, twoTaikooOsmHeight: TWO_TAIKOO_OSM_HEIGHT, twoTaikooCtbuhHeight: TWO_TAIKOO_CTBUH_HEIGHT, twoTaikooHeight: TWO_TAIKOO_HEIGHT, twoTaikooRoofDeck: TWO_TAIKOO_ROOF_DECK,
    twoTaikooOsmLevels: TWO_TAIKOO_OSM_LEVELS, twoTaikooCtbuhLevels: TWO_TAIKOO_CTBUH_LEVELS, twoTaikooSwireLevels: TWO_TAIKOO_SWIRE_LEVELS, twoTaikooStartDate: TWO_TAIKOO_START_DATE, twoTaikooCompletionYear: TWO_TAIKOO_COMPLETION_YEAR, twoTaikooNbbjGfa: TWO_TAIKOO_NBBJ_GFA,
    twoTaikooArchitect: TWO_TAIKOO_ARCHITECT, twoTaikooFacadeDesigner: TWO_TAIKOO_FACADE_DESIGNER, twoTaikooFacadeEngineer: TWO_TAIKOO_FACADE_ENGINEER, twoTaikooDeveloper: TWO_TAIKOO_DEVELOPER,
    twoTaikooSourceVertices: TWO_TAIKOO_OSM_SOURCE.geometry.length - 1, twoTaikooOsmWayVersion: TWO_TAIKOO_OSM_SOURCE.version, twoTaikooRingArea: TWO_TAIKOO_RING_AREA,
    twoTaikooVisualCourses: TWO_TAIKOO_VISUAL_COURSES, twoTaikooOfficeCourses: tower.courses, twoTaikooPanelWidth: TWO_TAIKOO_PANEL_WIDTH, twoTaikooGlassPanels: tower.glassPanels, twoTaikooVerticalFins: tower.verticalFins,
    twoTaikooGreatRoomHeight: TWO_TAIKOO_GREAT_ROOM_HEIGHT, twoTaikooOpenRoadBays: greatRoom.openRoadBays, twoTaikooEntranceBays: greatRoom.entranceBays, twoTaikooClosedGreatRoomBays: greatRoom.closedBays, twoTaikooGreatRoomColumns: greatRoom.columnCount,
    twoTaikooGardenLevels: 2, twoTaikooGardenTrees: gardens.treeCount, twoTaikooCoolingTowers: roof.coolingTowers, twoTaikooPvModules: roof.pvModules, twoTaikooWindDevices: roof.windDevices,
    twoTaikooMainEntranceNode: TWO_TAIKOO_MAIN_ENTRANCE.nodeId, twoTaikooEastEntranceNode: TWO_TAIKOO_EAST_ENTRANCE.nodeId, twoTaikooNorthEntranceNode: TWO_TAIKOO_NORTH_ENTRANCE.nodeId,
    twoTaikooCrossingRoadRecords: TWO_TAIKOO_CROSSING_ROADS.length, twoTaikooTunnelRoadRecords: TWO_TAIKOO_CROSSING_ROADS.filter((road) => road.flags & 4).length,
    twoTaikooRoadVehicleClearance: TWO_TAIKOO_ROAD_VEHICLE_CLEARANCE, twoTaikooPortalSoffit: TWO_TAIKOO_PUBLIC_GROUND_TOP, twoTaikooPlazaGround: grounds.plaza,
    twoTaikooMainForecourtWidth: TWO_TAIKOO_MAIN_FORECOURT_WIDTH, twoTaikooMainForecourtDepth: TWO_TAIKOO_MAIN_FORECOURT_DEPTH, twoTaikooColliders: colliders.length
  };
  return { group, colliders, landmarks: [landmark], stats, groundOffset, grounds, plazaTop: grounds.plaza, groundHeightAt: (x, z, ground) => twoTaikooGroundHeightAt(x, z, ground, grounds) };
}
