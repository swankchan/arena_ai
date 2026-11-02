import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  TWO_PACIFIC_PLACE_SITE, TWO_PACIFIC_PLACE_TOWER_RING, TWO_PACIFIC_PLACE_PODIUM_RING,
  TWO_PACIFIC_PLACE_BLUE_END_EDGES, TWO_PACIFIC_PLACE_CROWN_SIGN_EDGES,
  TWO_PACIFIC_PLACE_OSM_HEIGHT, TWO_PACIFIC_PLACE_OSM_LEVELS, TWO_PACIFIC_PLACE_HEIGHT,
  TWO_PACIFIC_PLACE_TO_TIP_HEIGHT, TWO_PACIFIC_PLACE_OCCUPIED_HEIGHT, TWO_PACIFIC_PLACE_CTBUH_LEVELS,
  TWO_PACIFIC_PLACE_CONSTRUCTION_START, TWO_PACIFIC_PLACE_COMPLETION_YEAR,
  TWO_PACIFIC_PLACE_OFFICIAL_OFFICE_FLOORS, TWO_PACIFIC_PLACE_OFFICIAL_OFFICE_GFA_SQFT,
  TWO_PACIFIC_PLACE_WONG_TOWER_STOREYS_ABOVE_PODIUM, TWO_PACIFIC_PLACE_WONG_ORIGINAL_HOTEL_ROOMS,
  TWO_PACIFIC_PLACE_CURRENT_HOTEL_FLOORS, TWO_PACIFIC_PLACE_CURRENT_HOTEL_ROOMS,
  TWO_PACIFIC_PLACE_PLAZA_TOP, TWO_PACIFIC_PLACE_PODIUM_HEIGHT, TWO_PACIFIC_PLACE_PODIUM_BAND_BASE,
  TWO_PACIFIC_PLACE_VISUAL_COURSES, TWO_PACIFIC_PLACE_OFFICE_VISUAL_COURSES,
  TWO_PACIFIC_PLACE_HOTEL_VISUAL_COURSES, TWO_PACIFIC_PLACE_CROWN_BASE, TWO_PACIFIC_PLACE_PANEL_TARGET_WIDTH,
  TWO_PACIFIC_PLACE_HOTEL_ENTRANCE, TWO_PACIFIC_PLACE_OFFICE_ENTRANCE, TWO_PACIFIC_PLACE_DRIVEWAY_SOURCE,
  TWO_PACIFIC_PLACE_ROAD_VEHICLE_CLEARANCE, twoPacificPlaceFloorY, twoPacificPlaceEdgeOutward,
  twoPacificPlaceLocalToWorld, twoPacificPlaceFrameToWorld, twoPacificPlaceRingColliders,
  twoPacificPlaceGroundHeightAt
} from './two-pacific-place-architecture.js';

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
function cylinder(parts, center, radius, height, segments = 16) {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, segments); geometry.translate(...center); parts.push(geometry); return geometry;
}
function edgeBox(parts, ring, edge, t, y, offset, width, height, depth) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const { nx, nz, ry } = twoPacificPlaceEdgeOutward(ring, edge);
  box(parts, [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset], [width, height, depth], ry);
}
function worldCollider(cx, cz, w, d, ry, minY, maxY) {
  const cs = Math.cos(ry), sn = Math.sin(ry), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: cx, z: cz, w, d, ry, minY, maxY,
    minX: cx - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: cx + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: cz - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: cz + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx, cz, hx, hz, cs, sn } };
}
// Keep the AABB formula explicit and correct for rotated entrance frames.
function frameCollider(frame, x, z, w, d, minY, maxY, base = 0) {
  const point = twoPacificPlaceFrameToWorld(frame, x, z), ry = frame.ry;
  const cs = Math.cos(ry), sn = Math.sin(ry), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: point.x, z: point.z, w, d, ry, minY: minY + base, maxY: maxY + base,
    minX: point.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: point.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: point.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: point.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: point.x, cz: point.z, hx, hz, cs, sn } };
}

function createTower() {
  const ring = TWO_PACIFIC_PLACE_TOWER_RING, blueEnds = new Set(TWO_PACIFIC_PLACE_BLUE_END_EDGES);
  const glass = store(), backing = store(), crownStone = store(), mechanical = store(), roof = store();
  const ribbons = [], mullions = [], transitionPiers = [], crownSeams = [], louvres = [], coping = [];
  let glassPanels = 0, ribbonBands = 0, verticalMullions = 0, crownPanels = 0, mechanicalLouvres = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = twoPacificPlaceEdgeOutward(ring, edge), blueEnd = blueEnds.has(edge);
    const point = (t, y, offset = 0.04) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    const bays = Math.max(1, Math.round(length / TWO_PACIFIC_PLACE_PANEL_TARGET_WIDTH));
    triangle(roof, [0, TWO_PACIFIC_PLACE_CROWN_BASE, 0], [ax, TWO_PACIFIC_PLACE_CROWN_BASE, az], [bx, TWO_PACIFIC_PLACE_CROWN_BASE, bz], [0.31, 0.33, 0.34]);
    quad(backing, point(0, TWO_PACIFIC_PLACE_PODIUM_HEIGHT, -0.10), point(1, TWO_PACIFIC_PLACE_PODIUM_HEIGHT, -0.10),
      point(1, TWO_PACIFIC_PLACE_OCCUPIED_HEIGHT, -0.10), point(0, TWO_PACIFIC_PLACE_OCCUPIED_HEIGHT, -0.10), [0.055, 0.085, 0.105]);
    for (let course = 0; course < TWO_PACIFIC_PLACE_VISUAL_COURSES; course++) {
      const y0 = twoPacificPlaceFloorY(course), y1 = twoPacificPlaceFloorY(course + 1);
      const bandHeight = blueEnd ? 0.18 : 0.82;
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + 0.0009, t1 = (bay + 1) / bays - 0.0009;
        const variation = hash(edge, bay, course, 18);
        const litThreshold = course < TWO_PACIFIC_PLACE_OFFICE_VISUAL_COURSES ? 0.91 : 0.79;
        const lit = hash(edge, bay, course, 93) > litThreshold ? 0.18 + variation * 0.62 : 0;
        const low = blueEnd ? [0.045, 0.125, 0.205] : [0.105, 0.205, 0.285];
        const high = blueEnd ? [0.15, 0.29, 0.39] : [0.27, 0.405, 0.47];
        quad(glass, point(t0, y0 + bandHeight * 0.62), point(t1, y0 + bandHeight * 0.62),
          point(t1, y1 - 0.09), point(t0, y1 - 0.09), mix(low, high, 0.16 + variation * 0.72), lit);
        glassPanels++;
      }
      edgeBox(ribbons, ring, edge, 0.5, y0 + 0.015, 0.11, length + 0.035, bandHeight, 0.29); ribbonBands++;
    }
    edgeBox(ribbons, ring, edge, 0.5, TWO_PACIFIC_PLACE_OCCUPIED_HEIGHT, 0.11, length + 0.035, blueEnd ? 0.18 : 0.82, 0.29); ribbonBands++;
    for (let bay = 0; bay <= bays; bay++) {
      edgeBox(mullions, ring, edge, bay / bays, (TWO_PACIFIC_PLACE_PODIUM_HEIGHT + TWO_PACIFIC_PLACE_OCCUPIED_HEIGHT) * 0.5,
        0.145, bay % 4 === 0 ? 0.072 : 0.042, TWO_PACIFIC_PLACE_OCCUPIED_HEIGHT - TWO_PACIFIC_PLACE_PODIUM_HEIGHT, 0.18);
      verticalMullions++;
    }
    quad(mechanical, point(0, TWO_PACIFIC_PLACE_OCCUPIED_HEIGHT, 0.01), point(1, TWO_PACIFIC_PLACE_OCCUPIED_HEIGHT, 0.01),
      point(1, TWO_PACIFIC_PLACE_CROWN_BASE, 0.01), point(0, TWO_PACIFIC_PLACE_CROWN_BASE, 0.01), [0.075, 0.105, 0.125]);
    for (let y = TWO_PACIFIC_PLACE_OCCUPIED_HEIGHT + 0.28; y < TWO_PACIFIC_PLACE_CROWN_BASE; y += 0.52) {
      edgeBox(louvres, ring, edge, 0.5, y, 0.12, length + 0.02, 0.10, 0.18); mechanicalLouvres++;
    }
    const crownBays = Math.max(1, Math.ceil(length / 3.2));
    for (let bay = 0; bay < crownBays; bay++) {
      const t0 = bay / crownBays + 0.0008, t1 = (bay + 1) / crownBays - 0.0008;
      quad(crownStone, point(t0, TWO_PACIFIC_PLACE_CROWN_BASE, 0.055), point(t1, TWO_PACIFIC_PLACE_CROWN_BASE, 0.055),
        point(t1, TWO_PACIFIC_PLACE_HEIGHT - 0.16, 0.055), point(t0, TWO_PACIFIC_PLACE_HEIGHT - 0.16, 0.055),
        mix([0.67, 0.68, 0.65], [0.86, 0.85, 0.79], hash(edge, bay, 4, 11) * 0.55)); crownPanels++;
    }
    for (let bay = 1; bay < crownBays; bay++) edgeBox(crownSeams, ring, edge, bay / crownBays,
      (TWO_PACIFIC_PLACE_CROWN_BASE + TWO_PACIFIC_PLACE_HEIGHT) * 0.5, 0.12, 0.035, TWO_PACIFIC_PLACE_HEIGHT - TWO_PACIFIC_PLACE_CROWN_BASE, 0.11);
    edgeBox(coping, ring, edge, 0.5, TWO_PACIFIC_PLACE_HEIGHT - 0.10, 0.11, length + 0.04, 0.20, 0.28);
  }
  // Broad white vertical joints separate the ribbon facades from the blue glazed end curves.
  for (let vertexIndex = 0; vertexIndex < ring.length / 2 - 1; vertexIndex++) {
    const previous = (vertexIndex + ring.length / 2 - 2) % (ring.length / 2 - 1);
    if (blueEnds.has(previous) === blueEnds.has(vertexIndex)) continue;
    const x = ring[vertexIndex * 2], z = ring[vertexIndex * 2 + 1];
    box(transitionPiers, [x, (TWO_PACIFIC_PLACE_PODIUM_HEIGHT + TWO_PACIFIC_PLACE_OCCUPIED_HEIGHT) * 0.5, z],
      [0.82, TWO_PACIFIC_PLACE_OCCUPIED_HEIGHT - TWO_PACIFIC_PLACE_PODIUM_HEIGHT, 0.82]);
  }
  return { glass, backing, crownStone, mechanical, roof, ribbons, mullions, transitionPiers, crownSeams, louvres, coping,
    glassPanels, ribbonBands, verticalMullions, crownPanels, mechanicalLouvres };
}

function createPodium() {
  const outer = TWO_PACIFIC_PLACE_PODIUM_RING, inner = TWO_PACIFIC_PLACE_TOWER_RING;
  const groundGlass = store(), groundBacking = store(), stone = store(), stoneBacking = store();
  const trims = [], groundFrames = [], columns = [], columnColliders = [];
  let groundPanels = 0, podiumPanels = 0, groundFrameMembers = 0;
  for (let edge = 0; edge < outer.length / 2 - 1; edge++) {
    const i = edge * 2, ax = outer[i], az = outer[i + 1], bx = outer[i + 2], bz = outer[i + 3];
    const { nx, nz, length } = twoPacificPlaceEdgeOutward(outer, edge), bays = Math.max(1, Math.ceil(length / 3.1));
    const point = (t, y, offset = 0.04) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    quad(stoneBacking, point(0, TWO_PACIFIC_PLACE_PODIUM_BAND_BASE, -0.08), point(1, TWO_PACIFIC_PLACE_PODIUM_BAND_BASE, -0.08),
      point(1, TWO_PACIFIC_PLACE_PODIUM_HEIGHT, -0.08), point(0, TWO_PACIFIC_PLACE_PODIUM_HEIGHT, -0.08), [0.42, 0.43, 0.41]);
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays + 0.0008, t1 = (bay + 1) / bays - 0.0008;
      quad(stone, point(t0, TWO_PACIFIC_PLACE_PODIUM_BAND_BASE + 0.04), point(t1, TWO_PACIFIC_PLACE_PODIUM_BAND_BASE + 0.04),
        point(t1, TWO_PACIFIC_PLACE_PODIUM_HEIGHT - 0.04), point(t0, TWO_PACIFIC_PLACE_PODIUM_HEIGHT - 0.04),
        mix([0.58, 0.59, 0.56], [0.79, 0.78, 0.72], 0.22 + hash(edge, bay, 7, 5) * 0.52)); podiumPanels++;
    }
    for (const y of [TWO_PACIFIC_PLACE_PODIUM_BAND_BASE, 18, TWO_PACIFIC_PLACE_PODIUM_HEIGHT - 0.10]) {
      edgeBox(trims, outer, edge, 0.5, y, 0.13, length + 0.035, y === 18 ? 0.16 : 0.28, 0.27);
    }
  }
  // The glazed ground floor follows the non-conflicting tower ring. The larger white band is an open overhang,
  // so the layer=1 service driveway remains a road beneath it rather than being enclosed or deleted.
  for (let edge = 0; edge < inner.length / 2 - 1; edge++) {
    const i = edge * 2, ax = inner[i], az = inner[i + 1], bx = inner[i + 2], bz = inner[i + 3];
    const { nx, nz, length } = twoPacificPlaceEdgeOutward(inner, edge), bays = Math.max(1, Math.round(length / 2.15));
    const point = (t, y, offset = 0.04) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    quad(groundBacking, point(0, -8, -0.15), point(1, -8, -0.15), point(1, TWO_PACIFIC_PLACE_PODIUM_BAND_BASE, -0.15),
      point(0, TWO_PACIFIC_PLACE_PODIUM_BAND_BASE, -0.15), [0.18, 0.13, 0.085]);
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays + 0.001, t1 = (bay + 1) / bays - 0.001, variation = hash(edge, bay, 2, 61);
      quad(groundGlass, point(t0, -7.9), point(t1, -7.9), point(t1, TWO_PACIFIC_PLACE_PODIUM_BAND_BASE - 0.12),
        point(t0, TWO_PACIFIC_PLACE_PODIUM_BAND_BASE - 0.12), mix([0.08, 0.095, 0.10], [0.24, 0.20, 0.135], variation), 0.20 + variation * 0.28);
      groundPanels++;
    }
    for (let bay = 0; bay <= bays; bay++) {
      edgeBox(groundFrames, inner, edge, bay / bays, 2, 0.13, 0.065, 20, 0.16); groundFrameMembers++;
    }
    for (const y of [-4, 0, 4, 8, 11.90]) {
      edgeBox(groundFrames, inner, edge, 0.5, y, 0.13, length + 0.025, 0.14, 0.16); groundFrameMembers++;
    }
  }
  for (let vertexIndex = 0; vertexIndex < inner.length / 2 - 1; vertexIndex++) {
    const x = inner[vertexIndex * 2], z = inner[vertexIndex * 2 + 1];
    cylinder(columns, [x, (TWO_PACIFIC_PLACE_PODIUM_BAND_BASE - 8) * 0.5, z], 0.54, TWO_PACIFIC_PLACE_PODIUM_BAND_BASE + 8, 16);
    const world = twoPacificPlaceLocalToWorld(x, z);
    columnColliders.push(worldCollider(world.x, world.z, 1.08, 1.08, 0, -8, TWO_PACIFIC_PLACE_PODIUM_BAND_BASE));
  }
  return { groundGlass, groundBacking, stone, stoneBacking, trims, groundFrames, columns, columnColliders, groundPanels, podiumPanels, groundFrameMembers };
}

function createRoofPlant() {
  const plant = [], louvres = [], fans = [], colliders = [];
  const blocks = [
    { x: -13, z: -2, w: 8.2, d: 5.2, h: 2.5 },
    { x: 4, z: 3.5, w: 7.2, d: 4.6, h: 3.1 },
    { x: 20, z: -3, w: 5.4, d: 4.2, h: 2.2 }
  ];
  for (const item of blocks) {
    box(plant, [item.x, TWO_PACIFIC_PLACE_CROWN_BASE + item.h * 0.5, item.z], [item.w, item.h, item.d]);
    for (let slot = -2; slot <= 2; slot++) box(louvres, [item.x + slot * item.w / 6, TWO_PACIFIC_PLACE_CROWN_BASE + item.h * 0.52, item.z + item.d * 0.5 + 0.035], [0.09, item.h * 0.68, 0.09]);
    for (const dx of [-item.w * 0.22, item.w * 0.22]) cylinder(fans, [item.x + dx, TWO_PACIFIC_PLACE_CROWN_BASE + item.h + 0.10, item.z], 0.82, 0.20, 20);
    const world = twoPacificPlaceLocalToWorld(item.x, item.z);
    colliders.push(worldCollider(world.x, world.z, item.w, item.d, TWO_PACIFIC_PLACE_SITE.ry,
      TWO_PACIFIC_PLACE_CROWN_BASE, TWO_PACIFIC_PLACE_CROWN_BASE + item.h + 0.20));
  }
  return { plant, louvres, fans, colliders };
}

// Embedded stroke lettering avoids depending on a CJK web font in the minimal browser runtime.
const PP_SIGN_GLYPHS = {
  '太': [[[48,12],[52,38],[42,62],[18,94]],[[12,40],[88,40]],[[52,52],[72,72],[88,94]],[[26,72],[18,82]]],
  '古': [[[50,8],[50,48]],[[14,28],[86,28]],[[24,52],[78,52],[78,94],[24,94],[24,52]]],
  '廣': [[[50,4],[50,14]],[[12,18],[90,18]],[[18,18],[18,94]],[[26,32],[80,32]],[[38,22],[38,50]],[[66,22],[66,50]],[[26,44],[80,44]],[[30,56],[76,56],[76,80],[30,80],[30,56]],[[52,56],[52,92]],[[52,82],[34,96]],[[56,82],[76,96]]],
  '場': [[[8,30],[34,30]],[[20,12],[20,78]],[[6,78],[36,78]],[[46,12],[82,12],[82,40],[46,40],[46,12]],[[46,26],[82,26]],[[42,50],[90,50]],[[54,50],[42,94]],[[54,62],[84,62],[78,94]],[[56,72],[44,88]],[[70,72],[58,90]]],
  '二': [[[24,30],[80,30]],[[12,78],[90,78]]],
  '座': [[[50,4],[50,14]],[[12,18],[90,18]],[[18,18],[18,94]],[[30,32],[30,70]],[[26,48],[40,48]],[[72,32],[72,70]],[[62,48],[80,48]],[[52,30],[52,90]],[[30,64],[76,64]],[[24,90],[82,90]]]
};
function drawChinese(ctx, text, centreX, baseline, size, fill) {
  const chars = [...text], widths = chars.map((char) => PP_SIGN_GLYPHS[char] ? size * 1.04 : ctx.measureText(char).width);
  let x = centreX - widths.reduce((sum, width) => sum + width, 0) * 0.5;
  ctx.textAlign = 'left'; ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.lineWidth = Math.max(1.3, size * 0.052); ctx.lineJoin = 'miter';
  chars.forEach((char, index) => {
    const glyph = PP_SIGN_GLYPHS[char];
    if (glyph) {
      const top = baseline - size * 0.86, scale = size * 0.90 / 100;
      for (const path of glyph) { ctx.beginPath(); path.forEach(([px, py], point) => { const xx = x + px * scale, yy = top + py * scale; if (point) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }); ctx.stroke(); }
    } else ctx.fillText(char, x, baseline);
    x += widths[index];
  });
}
function signTexture(kind) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = kind === 'hotel' ? 128 : 256;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (kind === 'roof') {
    ctx.fillStyle = '#d8bd78'; ctx.font = 'italic 148px Georgia, serif'; ctx.fillText('Shangri-La', 512, 132, 940);
  } else if (kind === 'hotel') {
    ctx.fillStyle = '#d6ba75'; ctx.font = '600 55px Georgia, serif'; ctx.fillText('ISLAND SHANGRI-LA', 512, 66, 950);
  } else {
    ctx.fillStyle = '#d8c58f'; ctx.font = '600 58px sans-serif'; ctx.fillText('TWO PACIFIC PLACE', 512, 61, 920);
    drawChinese(ctx, '太古廣場二座', 512, 151, 61, '#d8c58f');
    ctx.fillStyle = '#d8c58f'; ctx.font = '500 28px sans-serif'; ctx.fillText('88 QUEENSWAY', 512, 220);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function sign(group, kind, width, height, position, name) {
  const material = new THREE.MeshBasicMaterial({ map: signTexture(kind), transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material); mesh.position.set(...position); mesh.renderOrder = 3; mesh.name = name; group.add(mesh); return mesh;
}
function createCurvedRoofSign(group) {
  const ring = TWO_PACIFIC_PLACE_TOWER_RING, edges = TWO_PACIFIC_PLACE_CROWN_SIGN_EDGES;
  const lengths = edges.map((edge) => twoPacificPlaceEdgeOutward(ring, edge).length), total = lengths.reduce((sum, length) => sum + length, 0);
  const positions = [], uvs = []; let travelled = 0;
  for (let index = 0; index < edges.length; index++) {
    const edge = edges[index], i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = twoPacificPlaceEdgeOutward(ring, edge), segments = Math.max(2, Math.ceil(length / 1.8));
    const point = (t, y) => [lerp(ax, bx, t) + nx * 0.24, y, lerp(az, bz, t) + nz * 0.24];
    for (let segment = 0; segment < segments; segment++) {
      const t0 = segment / segments, t1 = (segment + 1) / segments;
      let u0 = (travelled + length * t0) / total, u1 = (travelled + length * t1) / total;
      if (nz < 0) { u0 = 1 - u0; u1 = 1 - u1; }
      const a = point(t0, 204.65), b = point(t1, 204.65), c = point(t1, 211.45), d = point(t0, 211.45);
      positions.push(...a, ...b, ...c, ...a, ...c, ...d); uvs.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1);
    }
    travelled += length;
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  const material = new THREE.MeshBasicMaterial({ map: signTexture('roof'), transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material); mesh.name = 'IslandShangriLaCurvedGoldRoofLettering'; mesh.renderOrder = 3; group.add(mesh); return mesh;
}

function createHotelEntrance(root, materials, base) {
  const frame = TWO_PACIFIC_PLACE_HOTEL_ENTRANCE, group = new THREE.Group(); group.position.set(frame.x, base, frame.z); group.rotation.y = frame.ry;
  group.name = 'IslandShangriLaSeparateSupremeCourtRoadPorteCochere'; root.add(group);
  const stone = [], glass = [], interior = [], frames = [], lights = [], planters = [], greenery = [], colliders = [];
  box(stone, [0, -0.06, 1], [26, 0.12, 12]);
  box(interior, [0, 3.35, -3.72], [20, 6.5, 0.16]); box(glass, [0, 3.35, -3.50], [20, 6.5, 0.10]);
  for (const x of [-2.25, -0.75, 0.75, 2.25]) {
    box(glass, [x, 2.30, -3.34], [1.42, 4.60, 0.10]);
    box(frames, [x - 0.71, 2.30, -3.26], [0.065, 4.60, 0.08]); box(frames, [x + 0.25, 2.25, -3.20], [0.045, 0.80, 0.08]);
  }
  for (const x of [-10, -6, 6, 10]) box(stone, [x, 3.50, -3.48], [0.72, 7.0, 0.74]);
  box(stone, [0, 5.95, 1], [24, 0.50, 10]); box(stone, [0, 5.35, 5.93], [24, 1.20, 0.26]);
  box(frames, [0, 5.91, 6.09], [24, 0.10, 0.10]);
  for (const x of [-7, 0, 7]) box(lights, [x, 5.66, 1], [0.14, 0.08, 8.4]);
  for (const x of [-9, 9]) for (const z of [-0.8, 4.2]) {
    cylinder(stone, [x, 2.85, z], 0.42, 5.70, 18); colliders.push(frameCollider(frame, x, z, 0.84, 0.84, 0, 5.70, base));
  }
  for (const x of [-11.3, 11.3]) {
    box(planters, [x, 0.55, 2.1], [1.7, 1.10, 4.6]);
    const shrub = new THREE.SphereGeometry(1.25, 14, 9); shrub.scale(0.72, 0.86, 1.65); shrub.translate(x, 1.42, 2.1); greenery.push(shrub);
    colliders.push(frameCollider(frame, x, 2.1, 1.7, 4.6, 0, 1.10, base));
  }
  sign(group, 'hotel', 12, 1.5, [0, 5.35, 6.075], 'IslandShangriLaPorteCochereGoldLettering');
  merged(group, stone, materials.podiumTrim, 'IslandShangriLaPorteCochereStoneCanopyAndColumns');
  merged(group, interior, materials.interior, 'IslandShangriLaWarmHotelLobbyInterior');
  merged(group, glass, materials.entryGlass, 'IslandShangriLaHotelLobbyGlazingAndFourDoors', false);
  merged(group, frames, materials.gold, 'IslandShangriLaDoorPullsAndCanopyTrim');
  merged(group, lights, materials.warmLight, 'IslandShangriLaWarmCanopySoffitLights', false);
  merged(group, planters, materials.dark, 'IslandShangriLaPorteCochereStonePlanters');
  merged(group, greenery, materials.greenery, 'IslandShangriLaPorteCocherePlanting');
  colliders.push(frameCollider(frame, 0, -3.50, 20, 0.34, 0, 7.0, base));
  colliders.push(frameCollider(frame, 0, 1, 24, 10, 5.70, 6.20, base));
  colliders.push(frameCollider(frame, 0, 5.93, 24, 0.26, 4.75, 5.95, base));
  return { group, colliders };
}

function createOfficeEntrance(root, materials, base) {
  const frame = TWO_PACIFIC_PLACE_OFFICE_ENTRANCE, group = new THREE.Group(); group.position.set(frame.x, base, frame.z); group.rotation.y = frame.ry;
  group.name = 'TwoPacificPlaceQueenswayOfficeLobby'; root.add(group);
  const stone = [], glass = [], interior = [], frames = [], lights = [], colliders = [];
  // The Queensway forecourt is a solid DTM-founded plinth, not a thin floating plane on the hillside.
  box(stone, [0, -1.10, 0.5], [20, 2.20, 8]);
  box(interior, [0, 2.9, -3.18], [16, 5.6, 0.16]); box(glass, [0, 2.9, -3.00], [16, 5.6, 0.10]);
  for (const x of [-2.1, -0.7, 0.7, 2.1]) {
    box(glass, [x, 1.70, -2.84], [1.32, 3.40, 0.10]); box(frames, [x - 0.66, 1.70, -2.77], [0.055, 3.40, 0.07]);
    box(frames, [x + 0.23, 1.65, -2.72], [0.04, 0.65, 0.07]);
  }
  for (const x of [-8, -5, 5, 8]) box(stone, [x, 3.0, -3.0], [0.62, 6.0, 0.66]);
  box(stone, [0, 4.90, 0], [18, 0.40, 6]); box(stone, [0, 4.45, 2.94], [18, 1.70, 0.24]);
  for (const x of [-5, 0, 5]) box(lights, [x, 4.66, 0], [0.12, 0.07, 4.8]);
  sign(group, 'office', 8, 2, [0, 4.45, 3.07], 'TwoPacificPlaceBilingualOfficeLobbySign');
  merged(group, stone, materials.podiumTrim, 'TwoPacificPlaceOfficeCanopyAndStonePiers');
  merged(group, interior, materials.interior, 'TwoPacificPlaceWarmOfficeLobby');
  merged(group, glass, materials.entryGlass, 'TwoPacificPlaceOfficeLobbyGlazingAndFourDoors', false);
  merged(group, frames, materials.gold, 'TwoPacificPlaceOfficeDoorFramesAndPulls');
  merged(group, lights, materials.warmLight, 'TwoPacificPlaceOfficeCanopySoffitLights', false);
  colliders.push(frameCollider(frame, 0, -3.0, 16, 0.34, 0, 6.0, base));
  colliders.push(frameCollider(frame, 0, 0, 18, 6, 4.70, 5.10, base));
  colliders.push(frameCollider(frame, 0, 2.94, 18, 0.24, 3.60, 5.30, base));
  return { group, colliders };
}

export function buildTwoPacificPlace(root, {
  groundOffset = 0, hotelGround = groundOffset + TWO_PACIFIC_PLACE_PLAZA_TOP, officeGround = groundOffset + TWO_PACIFIC_PLACE_PLAZA_TOP
} = {}) {
  const group = new THREE.Group(); group.name = 'TwoPacificPlaceAuthoredEllipticalRibbonsBlueEndsAndShangriLaCrown'; group.userData.internalId = 'HK-B0018';
  group.position.y = groundOffset; root.add(group);
  const materials = {
    glass: new THREE.MeshStandardNodeMaterial({ metalness: 0.56, roughness: 0.22, envMapIntensity: 1.12, side: THREE.DoubleSide }),
    groundGlass: new THREE.MeshStandardNodeMaterial({ metalness: 0.38, roughness: 0.25, side: THREE.DoubleSide }),
    backing: new THREE.MeshStandardNodeMaterial({ roughness: 0.80, side: THREE.DoubleSide }),
    stone: new THREE.MeshStandardNodeMaterial({ metalness: 0.05, roughness: 0.62, side: THREE.DoubleSide }),
    mechanical: new THREE.MeshStandardNodeMaterial({ metalness: 0.44, roughness: 0.42, side: THREE.DoubleSide }),
    roof: new THREE.MeshStandardNodeMaterial({ metalness: 0.18, roughness: 0.74, side: THREE.DoubleSide }),
    ivory: new THREE.MeshStandardNodeMaterial({ color: 0xd7d6cd, metalness: 0.08, roughness: 0.55 }),
    podiumTrim: new THREE.MeshStandardNodeMaterial({ color: 0xc8c6bc, metalness: 0.06, roughness: 0.63 }),
    mullion: new THREE.MeshStandardNodeMaterial({ color: 0x8c9ca2, metalness: 0.76, roughness: 0.31 }),
    dark: new THREE.MeshStandardNodeMaterial({ color: 0x354046, metalness: 0.40, roughness: 0.46 }),
    entryGlass: new THREE.MeshStandardNodeMaterial({ color: 0x69818b, metalness: 0.24, roughness: 0.17, transparent: true, opacity: 0.40, depthWrite: false, side: THREE.DoubleSide }),
    interior: new THREE.MeshStandardNodeMaterial({ color: 0x6b5033, roughness: 0.73 }),
    gold: new THREE.MeshStandardNodeMaterial({ color: 0xbfa369, metalness: 0.68, roughness: 0.31 }),
    warmLight: new THREE.MeshStandardNodeMaterial({ color: 0xe2c99b, roughness: 0.40 }),
    greenery: new THREE.MeshStandardNodeMaterial({ color: 0x2d5133, roughness: 0.94 })
  };
  for (const key of ['glass', 'groundGlass', 'backing', 'stone', 'mechanical', 'roof']) materials[key].colorNode = attribute('color', 'vec3');
  materials.glass.emissiveNode = color(0x21374b).mul(nightAmount()).mul(0.055)
    .add(color(0xffd8a6).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.54));
  materials.groundGlass.emissiveNode = color(0xffcc91).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.45);
  materials.stone.emissiveNode = color(0xe7edff).mul(nightAmount()).mul(0.075);
  materials.ivory.emissiveNode = color(0xe3ecff).mul(nightAmount()).mul(0.24);
  materials.podiumTrim.emissiveNode = color(0xffd7a7).mul(nightAmount().mul(0.08).add(0.002));
  materials.entryGlass.emissiveNode = color(0xffc98d).mul(nightAmount()).mul(0.085);
  materials.interior.emissiveNode = color(0xffbf78).mul(nightAmount().mul(0.52).add(0.035));
  materials.gold.emissiveNode = color(0xffd68e).mul(nightAmount()).mul(0.26);
  materials.warmLight.emissiveNode = color(0xffcc88).mul(nightAmount().mul(1.6).add(0.01));

  const tower = new THREE.Group(); tower.position.set(TWO_PACIFIC_PLACE_SITE.x, 0, TWO_PACIFIC_PLACE_SITE.z); tower.rotation.y = TWO_PACIFIC_PLACE_SITE.ry;
  tower.name = 'TwoPacificPlaceExactTwentyFourVertexEllipticalTower'; group.add(tower);
  const shaft = createTower();
  meshStore(tower, shaft.backing, materials.backing, 'TwoPacificPlaceOpaqueCurtainWallBacking');
  meshStore(tower, shaft.glass, materials.glass, 'TwoPacificPlaceBlueGlassWithIndividualHotelAndOfficeWindows');
  meshStore(tower, shaft.crownStone, materials.stone, 'IslandShangriLaBroadWhiteCurvedCrownFascia');
  meshStore(tower, shaft.mechanical, materials.mechanical, 'TwoPacificPlaceSeparatedOccupiedHeightAndCrownLouvres');
  meshStore(tower, shaft.roof, materials.roof, 'TwoPacificPlaceRoofDeckBehindParapet');
  merged(tower, shaft.ribbons, materials.ivory, 'TwoPacificPlaceContinuousWhiteHorizontalRibbonBands');
  merged(tower, shaft.mullions, materials.mullion, 'TwoPacificPlaceDenseCurtainWallVerticalMullions');
  merged(tower, shaft.transitionPiers, materials.ivory, 'TwoPacificPlaceBroadWhiteFacadeTransitionPiers');
  merged(tower, shaft.crownSeams, materials.podiumTrim, 'IslandShangriLaCrownPanelJoints');
  merged(tower, shaft.louvres, materials.mullion, 'TwoPacificPlaceCrownHorizontalLouvreBlades');
  merged(tower, shaft.coping, materials.ivory, 'IslandShangriLaRoofParapetCoping');
  createCurvedRoofSign(tower);
  const podium = createPodium();
  meshStore(tower, podium.groundBacking, materials.backing, 'TwoPacificPlaceRecessedGroundLobbyBacking');
  meshStore(tower, podium.groundGlass, materials.groundGlass, 'TwoPacificPlaceGroundGlazingOnNonConflictingTowerRing');
  meshStore(tower, podium.stoneBacking, materials.backing, 'TwoPacificPlacePodiumOverhangBacking');
  meshStore(tower, podium.stone, materials.stone, 'TwoPacificPlaceBroadWhitePodiumOverhangPanels');
  merged(tower, podium.trims, materials.podiumTrim, 'TwoPacificPlacePodiumHorizontalPanelTrims');
  merged(tower, podium.groundFrames, materials.mullion, 'TwoPacificPlaceGroundLobbyVerticalAndHorizontalTransoms');
  merged(tower, podium.columns, materials.podiumTrim, 'TwoPacificPlaceGroundColonnadeClearOfDriveway');
  const roofPlant = createRoofPlant();
  merged(tower, roofPlant.plant, materials.podiumTrim, 'TwoPacificPlaceLowRoofPlantHousings');
  merged(tower, roofPlant.louvres, materials.dark, 'TwoPacificPlaceRoofPlantLouvres');
  merged(tower, roofPlant.fans, materials.dark, 'TwoPacificPlaceSixRoofFans');
  const hotelBase = hotelGround - groundOffset, officeBase = officeGround - groundOffset;
  const hotel = createHotelEntrance(group, materials, hotelBase), office = createOfficeEntrance(group, materials, officeBase);

  const colliders = [
    ...twoPacificPlaceRingColliders(TWO_PACIFIC_PLACE_TOWER_RING, TWO_PACIFIC_PLACE_PODIUM_HEIGHT, TWO_PACIFIC_PLACE_HEIGHT),
    ...twoPacificPlaceRingColliders(TWO_PACIFIC_PLACE_PODIUM_RING, TWO_PACIFIC_PLACE_PODIUM_BAND_BASE, TWO_PACIFIC_PLACE_PODIUM_HEIGHT),
    ...twoPacificPlaceRingColliders(TWO_PACIFIC_PLACE_TOWER_RING, -8, TWO_PACIFIC_PLACE_PODIUM_BAND_BASE),
    ...podium.columnColliders, ...roofPlant.colliders, ...hotel.colliders, ...office.colliders
  ];
  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }
  const grounds = { tower: groundOffset + TWO_PACIFIC_PLACE_PLAZA_TOP, hotel: hotelGround, office: officeGround };
  const landmark = { name: TWO_PACIFIC_PLACE_SITE.name, englishName: TWO_PACIFIC_PLACE_SITE.englishName,
    position: { x: TWO_PACIFIC_PLACE_SITE.x, y: groundOffset, z: TWO_PACIFIC_PLACE_SITE.z }, radius: 72, height: TWO_PACIFIC_PLACE_TO_TIP_HEIGHT };
  const stats = {
    twoPacificPlaceGroundOffset: groundOffset, twoPacificPlaceLandmarks: 1,
    twoPacificPlaceOsmHeight: TWO_PACIFIC_PLACE_OSM_HEIGHT, twoPacificPlaceOsmLevels: TWO_PACIFIC_PLACE_OSM_LEVELS,
    twoPacificPlaceHeight: TWO_PACIFIC_PLACE_HEIGHT, twoPacificPlaceToTipHeight: TWO_PACIFIC_PLACE_TO_TIP_HEIGHT,
    twoPacificPlaceOccupiedHeight: TWO_PACIFIC_PLACE_OCCUPIED_HEIGHT, twoPacificPlaceCtbuhLevels: TWO_PACIFIC_PLACE_CTBUH_LEVELS,
    twoPacificPlaceConstructionStart: TWO_PACIFIC_PLACE_CONSTRUCTION_START, twoPacificPlaceCompletionYear: TWO_PACIFIC_PLACE_COMPLETION_YEAR,
    twoPacificPlaceOfficialOfficeFloors: TWO_PACIFIC_PLACE_OFFICIAL_OFFICE_FLOORS,
    twoPacificPlaceOfficialOfficeGfaSqft: TWO_PACIFIC_PLACE_OFFICIAL_OFFICE_GFA_SQFT,
    twoPacificPlaceWongTowerStoreysAbovePodium: TWO_PACIFIC_PLACE_WONG_TOWER_STOREYS_ABOVE_PODIUM,
    twoPacificPlaceWongOriginalHotelRooms: TWO_PACIFIC_PLACE_WONG_ORIGINAL_HOTEL_ROOMS,
    twoPacificPlaceCurrentHotelFloors: TWO_PACIFIC_PLACE_CURRENT_HOTEL_FLOORS,
    twoPacificPlaceCurrentHotelRooms: TWO_PACIFIC_PLACE_CURRENT_HOTEL_ROOMS,
    twoPacificPlaceSourceVertices: TWO_PACIFIC_PLACE_SITE.localRing.length / 2,
    twoPacificPlaceOsmWayVersion: TWO_PACIFIC_PLACE_SITE.source.version,
    twoPacificPlaceVisualCourses: TWO_PACIFIC_PLACE_VISUAL_COURSES,
    twoPacificPlaceOfficeVisualCourses: TWO_PACIFIC_PLACE_OFFICE_VISUAL_COURSES,
    twoPacificPlaceHotelVisualCourses: TWO_PACIFIC_PLACE_HOTEL_VISUAL_COURSES,
    twoPacificPlaceGlassPanels: shaft.glassPanels, twoPacificPlaceRibbonBands: shaft.ribbonBands,
    twoPacificPlaceVerticalMullions: shaft.verticalMullions, twoPacificPlaceCrownPanels: shaft.crownPanels,
    twoPacificPlaceMechanicalLouvres: shaft.mechanicalLouvres,
    twoPacificPlaceGroundPanels: podium.groundPanels, twoPacificPlacePodiumPanels: podium.podiumPanels,
    twoPacificPlaceGroundFrameMembers: podium.groundFrameMembers,
    twoPacificPlaceGroundColumns: podium.columnColliders.length, twoPacificPlaceRoofPlantBlocks: roofPlant.colliders.length,
    twoPacificPlaceRoofFans: 6, twoPacificPlaceCurvedRoofSigns: 1, twoPacificPlaceEntrances: 2,
    twoPacificPlaceDrivewayOsmWay: TWO_PACIFIC_PLACE_DRIVEWAY_SOURCE.id,
    twoPacificPlaceDrivewayVehicleClearance: TWO_PACIFIC_PLACE_ROAD_VEHICLE_CLEARANCE,
    twoPacificPlaceHotelGround: hotelGround, twoPacificPlaceOfficeGround: officeGround,
    twoPacificPlaceColliders: colliders.length
  };
  group.userData.stats = stats;
  return { group, colliders, landmarks: [landmark], stats, groundOffset, grounds, plazaTop: grounds.tower,
    groundHeightAt: (x, z, fallback) => twoPacificPlaceGroundHeightAt(x, z, fallback, grounds) };
}
