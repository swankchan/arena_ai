import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  HOPEWELL_SITE, HOPEWELL_TOWER_RING, HOPEWELL_PODIUM_RING, HOPEWELL_CROWN_RING,
  HOPEWELL_OSM_HEIGHT, HOPEWELL_MAIN_ROOF, HOPEWELL_CTBUH_TO_TIP_HEIGHT,
  HOPEWELL_OSM_LEVELS, HOPEWELL_OSM_MIN_LEVEL, HOPEWELL_CTBUH_LEVELS, HOPEWELL_OFFICIAL_LEVELS,
  HOPEWELL_CTBUH_TOWER_GFA, HOPEWELL_OFFICIAL_GFA_SQFT, HOPEWELL_CONSTRUCTION_START_YEAR,
  HOPEWELL_COMPLETED_YEAR, HOPEWELL_PODIUM_HEIGHT, HOPEWELL_OFFICE_COURSES, HOPEWELL_OFFICE_TOP,
  HOPEWELL_ROOF_DECK, HOPEWELL_COLLISION_BASE, HOPEWELL_POOL_RADIUS,
  HOPEWELL_BRONZE_ROOF_RING_OUTER_RADIUS, HOPEWELL_QRE_ENTRANCE, HOPEWELL_KENNEDY_ENTRANCE,
  HOPEWELL_EXTERNAL_LIFT, HOPEWELL_QRE_SOURCE_VERTEX, HOPEWELL_KENNEDY_SOURCE_VERTEX,
  HOPEWELL_LIFT_SOURCE_VERTEX, HOPEWELL_QRE_ESCALATOR_RISE,
  hopewellFloorY, hopewellEdgeOutward, hopewellFrameToWorld, hopewellRingColliders,
  hopewellGroundHeightAt
} from './hopewell-architecture.js';

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
function edgeBox(parts, ring, edge, t, y, offset, width, height, depth, outwardHeading = false) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const { nx, nz, ry } = hopewellEdgeOutward(ring, edge);
  box(parts, [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset],
    [width, height, depth], outwardHeading ? Math.atan2(nx, nz) : ry);
}
function worldCollider(cx, cz, w, d, ry, minY, maxY) {
  const cs = Math.cos(ry), sn = Math.sin(ry), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: cx, z: cz, w, d, ry, minY, maxY,
    minX: cx - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: cx + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: cz - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: cz + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx, cz, hx, hz, cs, sn } };
}

function createOfficeShaft() {
  const ring = HOPEWELL_TOWER_RING, glass = store(), backing = store(), spandrels = [], fins = [];
  let glassPanels = 0, primaryFins = 0, secondaryFins = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = hopewellEdgeOutward(ring, edge);
    const point = (t, y, offset = 0.06) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    quad(backing, point(0, HOPEWELL_PODIUM_HEIGHT, -0.09), point(1, HOPEWELL_PODIUM_HEIGHT, -0.09),
      point(1, HOPEWELL_OFFICE_TOP, -0.09), point(0, HOPEWELL_OFFICE_TOP, -0.09), [0.035, 0.033, 0.031]);
    for (let course = 0; course < HOPEWELL_OFFICE_COURSES; course++) {
      const y0 = hopewellFloorY(course), y1 = hopewellFloorY(course + 1);
      for (let bay = 0; bay < 2; bay++) {
        const t0 = bay * 0.5 + 0.012, t1 = (bay + 1) * 0.5 - 0.012, variation = hash(edge, bay, course, 16);
        const lit = hash(edge, bay, course, 91) > 0.79 ? 0.16 + variation * 0.64 : 0;
        const tint = mix([0.055, 0.052, 0.049], [0.18, 0.165, 0.145], 0.15 + variation * 0.72);
        quad(glass, point(t0, y0 + 0.43), point(t1, y0 + 0.43), point(t1, y1 - 0.10), point(t0, y1 - 0.10), tint, lit);
        glassPanels++;
      }
      edgeBox(spandrels, ring, edge, 0.5, y0 + 0.20, 0.095, length + 0.025, 0.40, 0.20);
    }
    edgeBox(fins, ring, edge, 0.5, (HOPEWELL_PODIUM_HEIGHT + HOPEWELL_OFFICE_TOP) * 0.5,
      0.25, 0.22, HOPEWELL_OFFICE_TOP - HOPEWELL_PODIUM_HEIGHT, 0.62, true); secondaryFins++;
  }
  for (let vertexIndex = 0; vertexIndex < HOPEWELL_SITE.localRing.length / 2; vertexIndex++) {
    const count = HOPEWELL_SITE.localRing.length / 2;
    const before = hopewellEdgeOutward(ring, (vertexIndex + count - 1) % count), after = hopewellEdgeOutward(ring, vertexIndex);
    const nx = before.nx + after.nx, nz = before.nz + after.nz, length = Math.hypot(nx, nz);
    const x = ring[vertexIndex * 2] + nx / length * 0.29, z = ring[vertexIndex * 2 + 1] + nz / length * 0.29;
    box(fins, [x, (HOPEWELL_PODIUM_HEIGHT + HOPEWELL_OFFICE_TOP) * 0.5, z],
      [0.42, HOPEWELL_OFFICE_TOP - HOPEWELL_PODIUM_HEIGHT, 0.82], Math.atan2(nx / length, nz / length)); primaryFins++;
  }
  return { glass, backing, spandrels, fins, glassPanels, primaryFins, secondaryFins };
}

function createPodium() {
  const ring = HOPEWELL_PODIUM_RING, stone = store(), louvrePanels = store(), piers = [], bands = [], slats = [];
  let louvreSlats = 0;
  const louvreZones = [[4.8, 9.4], [12.6, 17.4], [20.7, 25.5], [28.5, 32.6]];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = hopewellEdgeOutward(ring, edge);
    const point = (t, y, offset = 0) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    quad(stone, point(0, HOPEWELL_COLLISION_BASE, -0.08), point(1, HOPEWELL_COLLISION_BASE, -0.08),
      point(1, HOPEWELL_PODIUM_HEIGHT, -0.08), point(0, HOPEWELL_PODIUM_HEIGHT, -0.08),
      mix([0.58, 0.54, 0.45], [0.73, 0.69, 0.59], hash(edge, 3, 8)));
    for (const [y0, y1] of louvreZones) {
      quad(louvrePanels, point(0.035, y0, 0.035), point(0.965, y0, 0.035), point(0.965, y1, 0.035), point(0.035, y1, 0.035),
        [0.15, 0.095, 0.065], hash(edge, y0, y1) > 0.8 ? 0.10 : 0);
      const count = Math.max(3, Math.round(length * 0.86 / 0.34));
      for (let slat = 0; slat <= count; slat++) {
        edgeBox(slats, ring, edge, 0.07 + slat / count * 0.86, (y0 + y1) * 0.5, 0.13, 0.075, y1 - y0, 0.16); louvreSlats++;
      }
    }
    for (const y of [0.2, 10.7, 18.8, 27.1, 33.8]) edgeBox(bands, ring, edge, 0.5, y, 0.13, length + 0.04, 0.34, 0.28);
  }
  for (let vertexIndex = 0; vertexIndex < HOPEWELL_SITE.localRing.length / 2; vertexIndex++) {
    const count = HOPEWELL_SITE.localRing.length / 2, before = hopewellEdgeOutward(ring, (vertexIndex + count - 1) % count), after = hopewellEdgeOutward(ring, vertexIndex);
    const nx = before.nx + after.nx, nz = before.nz + after.nz, length = Math.hypot(nx, nz);
    box(piers, [ring[vertexIndex * 2] + nx / length * 0.10, 13, ring[vertexIndex * 2 + 1] + nz / length * 0.10],
      [0.62, 42, 0.54], Math.atan2(nx / length, nz / length));
  }
  return { stone, louvrePanels, piers, bands, slats, louvreSlats };
}

function createCrown() {
  const ring = HOPEWELL_CROWN_RING, glass = store(), roof = store(), belts = [], fins = [];
  const zones = [[184, 190.2], [190.6, 196.8], [197.3, 203.4], [204.0, 210.6], [211.0, HOPEWELL_ROOF_DECK]];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { length } = hopewellEdgeOutward(ring, edge);
    const point = (t, y, offset = 0.04) => {
      const { nx, nz } = hopewellEdgeOutward(ring, edge);
      return [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    };
    for (let zone = 0; zone < zones.length; zone++) {
      const [y0, y1] = zones[zone], variation = hash(edge, zone, 62);
      quad(glass, point(0, y0), point(1, y0), point(1, y1), point(0, y1),
        mix([0.045, 0.042, 0.039], [0.13, 0.12, 0.105], variation), zone < 2 && variation > 0.58 ? 0.20 : 0);
      const beltY = zone === zones.length - 1 ? HOPEWELL_MAIN_ROOF - 0.17 : y1 + 0.13;
      edgeBox(belts, ring, edge, 0.5, beltY, 0.15, length + 0.04, zone === zones.length - 1 ? 0.34 : 0.48, 0.34);
      if (zone < 4) edgeBox(fins, ring, edge, 0.5, (y0 + y1) * 0.5, 0.19, 0.20, y1 - y0, 0.52, true);
    }
    triangle(roof, [0, HOPEWELL_ROOF_DECK, 0], [ax, HOPEWELL_ROOF_DECK, az], [bx, HOPEWELL_ROOF_DECK, bz], [0.64, 0.62, 0.55]);
  }
  return { glass, roof, belts, fins };
}

function createRoofPool(group, materials) {
  const bronze = new THREE.Mesh(new THREE.RingGeometry(HOPEWELL_POOL_RADIUS + 0.48, HOPEWELL_BRONZE_ROOF_RING_OUTER_RADIUS, 72), materials.roofBronze);
  bronze.rotation.x = -Math.PI / 2; bronze.position.y = HOPEWELL_ROOF_DECK + 0.035; bronze.name = 'HopewellBronzeCircularRoofDeck'; group.add(bronze);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(HOPEWELL_POOL_RADIUS + 0.42, HOPEWELL_POOL_RADIUS + 0.42, 0.22, 72), materials.poolRim);
  basin.position.y = HOPEWELL_ROOF_DECK + 0.12; basin.name = 'HopewellCircularRooftopPoolDarkRim'; group.add(basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(HOPEWELL_POOL_RADIUS, HOPEWELL_POOL_RADIUS, 0.08, 72), materials.poolWater);
  water.position.y = HOPEWELL_ROOF_DECK + 0.25; water.name = 'HopewellCircularRooftopSwimmingPool'; group.add(water);
}

// Tiny authored stroke glyphs keep the bilingual signs readable even in minimal Chromium images with no CJK fonts.
// They are sign lettering, not a system-font dependency or an external asset request.
const HOPEWELL_SIGN_GLYPHS = {
  '合': [[[50,8],[20,40]],[[50,8],[80,40]],[[36,35],[64,35]],[[30,52],[70,52]],[[32,64],[68,64],[68,92],[32,92],[32,64]]],
  '和': [[[28,10],[12,24]],[[8,32],[42,32]],[[26,18],[26,92]],[[25,43],[8,70]],[[27,44],[42,65]],[[55,38],[88,38],[88,85],[55,85],[55,38]]],
  '中': [[[20,28],[80,28],[80,75],[20,75],[20,28]],[[50,10],[50,95]]],
  '心': [[[50,35],[43,62],[48,80],[63,85],[76,72]],[[22,45],[14,62]],[[68,25],[75,38]],[[86,48],[92,61]]],
  '堅': [[[8,15],[38,15],[38,63],[8,63],[8,15]],[[23,15],[23,63]],[[8,30],[38,30]],[[8,47],[38,47]],[[55,18],[85,18],[65,48],[88,68]],[[82,18],[52,68]],[[48,68],[48,96]],[[25,78],[72,78]],[[18,94],[80,94]]],
  '尼': [[[20,12],[82,12],[82,38],[25,38],[25,12]],[[25,38],[18,90]],[[42,52],[72,52],[72,78],[87,78]],[[65,45],[52,80],[40,80]]],
  '地': [[[20,25],[20,85]],[[5,45],[35,45]],[[5,82],[38,82]],[[8,70],[30,60]],[[48,50],[90,50],[82,28]],[[62,15],[62,80]],[[48,40],[48,80],[82,80],[90,72]]],
  '道': [[[38,8],[30,22]],[[62,8],[70,22]],[[25,28],[75,28]],[[35,38],[65,38],[65,72],[35,72],[35,38]],[[35,50],[65,50]],[[35,61],[65,61]],[[12,20],[18,30]],[[10,45],[22,45],[14,65]],[[8,78],[22,86],[50,92],[88,90]]]
};
function drawHopewellSignText(ctx, text, centreX, baseline, size, fill) {
  if (![...text].some((char) => HOPEWELL_SIGN_GLYPHS[char])) { ctx.fillText(text, centreX, baseline); return; }
  const oldAlign = ctx.textAlign, chars = [...text], widths = chars.map((char) => HOPEWELL_SIGN_GLYPHS[char] ? size * 1.04 : ctx.measureText(char).width);
  let x = centreX - widths.reduce((sum, width) => sum + width, 0) * 0.5;
  ctx.textAlign = 'left'; ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.lineWidth = Math.max(1.4, size * 0.052);
  ctx.lineCap = 'square'; ctx.lineJoin = 'miter';
  chars.forEach((char, index) => {
    const glyph = HOPEWELL_SIGN_GLYPHS[char];
    if (glyph) {
      const top = baseline - size * 0.86, scale = size * 0.90 / 100;
      for (const path of glyph) {
        ctx.beginPath(); path.forEach(([px, py], point) => { const xx = x + px * scale, yy = top + py * scale; if (point) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }); ctx.stroke();
      }
    } else ctx.fillText(char, x, baseline);
    x += widths[index];
  });
  ctx.textAlign = oldAlign;
}
function signTexture(kind) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (kind === 'lift') {
    ctx.fillStyle = '#dddcd3'; ctx.fillRect(0, 0, 1024, 256); ctx.textAlign = 'center'; ctx.fillStyle = '#a31d32';
    ctx.font = '700 105px sans-serif'; ctx.fillText('HOPEWELL', 512, 145); ctx.font = '500 38px sans-serif'; drawHopewellSignText(ctx, '合和中心', 512, 211, 38, '#a31d32');
  } else if (kind === 'kennedy') {
    ctx.fillStyle = '#292724'; ctx.fillRect(0, 0, 1024, 256); ctx.textAlign = 'center'; ctx.fillStyle = '#eee9dc';
    ctx.font = '600 57px sans-serif'; drawHopewellSignText(ctx, '合和中心  HOPEWELL CENTRE', 512, 100, 57, '#eee9dc');
    ctx.font = '400 42px sans-serif'; drawHopewellSignText(ctx, '17  堅尼地道  KENNEDY ROAD', 512, 183, 42, '#eee9dc');
  } else {
    ctx.fillStyle = '#282624'; ctx.fillRect(0, 0, 1024, 256); ctx.textAlign = 'center'; ctx.fillStyle = '#e8e2d5';
    ctx.font = '500 55px sans-serif'; drawHopewellSignText(ctx, '183  合和中心', 512, 91, 55, '#e8e2d5'); ctx.font = '500 59px sans-serif'; ctx.fillText('HOPEWELL CENTRE', 512, 181);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function sign(group, kind, width, height, position, name) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: signTexture(kind), toneMapped: false, side: THREE.DoubleSide }));
  mesh.position.set(...position); mesh.name = name; group.add(mesh); return mesh;
}

function createExternalLift(root, materials) {
  const frame = HOPEWELL_EXTERNAL_LIFT, group = new THREE.Group(); group.position.set(frame.x, 0, frame.z); group.rotation.y = frame.ry;
  group.name = 'HopewellExternalObservationLiftAndRooftopSign'; root.add(group);
  const glass = [], rails = [], crossBars = [], capsule = [], capsuleGlass = [];
  const height = HOPEWELL_CTBUH_TO_TIP_HEIGHT - HOPEWELL_COLLISION_BASE;
  box(glass, [0, HOPEWELL_COLLISION_BASE + height * 0.5, 0.9], [3.35, height, 2.15]);
  for (const x of [-1.78, 1.78]) box(rails, [x, HOPEWELL_COLLISION_BASE + height * 0.5, 0.9], [0.34, height, 2.50]);
  for (let y = HOPEWELL_PODIUM_HEIGHT; y < 216; y += 6) box(crossBars, [0, y, 2.02], [3.45, 0.12, 0.15]);
  const pod = new THREE.CapsuleGeometry(2.55, 6.2, 7, 24); pod.scale(1, 1, 0.64); pod.translate(0, 72, 2.10); capsule.push(pod);
  for (const y of [69.7, 72.0, 74.3]) box(capsuleGlass, [0, y, 3.74], [3.55, 1.45, 0.10]);
  box(rails, [0, 218.85, 2.03], [12.4, 3.15, 0.24]);
  merged(group, glass, materials.liftGlass, 'HopewellExternalLiftDarkGlazedShaft', false);
  merged(group, rails, materials.fin, 'HopewellExternalLiftWhiteRailsAndSignBacking');
  merged(group, crossBars, materials.fin, 'HopewellExternalLiftCrossBars');
  merged(group, capsule, materials.fin, 'HopewellCurvedWhiteObservationLiftCapsule');
  merged(group, capsuleGlass, materials.liftGlass, 'HopewellObservationLiftCapsuleWindows', false);
  sign(group, 'lift', 11.9, 2.98, [0, 218.85, 2.17], 'HopewellRedRooftopIdentification');
  const center = hopewellFrameToWorld(frame, 0, 0.9);
  return { colliders: [worldCollider(center.x, center.z, 4.25, 3.25, frame.ry, HOPEWELL_COLLISION_BASE, HOPEWELL_CTBUH_TO_TIP_HEIGHT)] };
}

function createQueensRoadEntrance(root, materials, grounds, groundOffset) {
  const frame = HOPEWELL_QRE_ENTRANCE, group = new THREE.Group(); group.position.set(frame.x, 0, frame.z); group.rotation.y = frame.ry;
  group.name = 'HopewellQueensRoadEastEscalatorLobby'; root.add(group);
  const upper = grounds.qreUpper - groundOffset, lower = grounds.qreLower - groundOffset;
  const stone = [], dark = [], glass = [], frames = [], louvres = [], steps = [], rails = [], lights = [];
  box(stone, [0, upper + 18, 1.48], [18.4, 20, 3.0]);
  for (const y of [upper + 10.2, upper + 15.1, upper + 20.0, upper + 24.9]) {
    box(dark, [0, y, 3.02], [15.6, 2.7, 0.10]);
    for (let x = -7.6; x <= 7.6; x += 0.34) box(louvres, [x, y, 3.10], [0.075, 2.7, 0.13]);
  }
  box(stone, [0, upper + 2.1, -0.24], [10.6, 4.2, 0.34]);
  for (const x of [-3.45, -1.15, 1.15, 3.45]) box(glass, [x, upper + 1.6, 0.02], [2.12, 3.2, 0.10]);
  for (const x of [-4.65, -2.3, 0, 2.3, 4.65]) box(frames, [x, upper + 1.7, 0.13], [0.13, 3.4, 0.16]);
  for (const y of [upper + 0.12, upper + 3.25]) box(frames, [0, y, 0.14], [10.2, 0.16, 0.18]);
  // Physical landings and a sloped escalator bed keep the treads above the coarse 70 m terrain triangles.
  box(stone, [0, upper - 0.06, 0.25], [12, 0.12, 2.1]);
  box(stone, [0, lower - 0.06, 5.0], [12, 0.12, 2.0]);
  const escalatorBed = new THREE.BoxGeometry(4.4, 0.14, Math.hypot(3.9, upper - lower));
  escalatorBed.rotateX(Math.atan2(upper - lower, 3.9)); escalatorBed.translate(0, (upper + lower) * 0.5 - 0.06, 2.85); stone.push(escalatorBed);
  for (const x of [-4.9, 4.9]) box(frames, [x, upper + 2.7, 3.75], [0.24, 5.4, 0.24]);
  box(dark, [0, upper + 5.25, 2.35], [11.4, 0.18, 4.8]);
  for (const x of [-5.65, 5.65]) beam(frames, [x, upper + 6.15, 0], [x, upper + 4.95, 4.8], 0.30, 0.30);
  for (let x = -4.5; x <= 4.5; x += 1.5) beam(frames, [x, upper + 6.0, 0], [x, upper + 5.0, 4.8], 0.11, 0.11);
  for (const lane of [-1.18, 1.18]) {
    for (let step = 0; step < 16; step++) {
      const t = (step + 0.5) / 16, z = 4.8 - 3.9 * t, y = lower + (upper - lower) * t;
      box(steps, [lane, y, z], [0.98, 0.11, 3.9 / 16 * 1.04]);
    }
    for (const side of [-0.58, 0.58]) {
      beam(rails, [lane + side, lower + 0.72, 4.8], [lane + side, upper + 0.72, 0.9], 0.095, 0.095);
      beam(rails, [lane + side, lower + 0.08, 4.8], [lane + side, upper + 0.08, 0.9], 0.12, 0.16);
    }
  }
  for (const x of [-4.2, 4.2]) box(lights, [x, upper + 4.92, 2.4], [1.15, 0.07, 0.12]);
  merged(group, stone, materials.solidStone, 'HopewellQueensRoadBeigePodiumAndLobbyStone');
  merged(group, dark, materials.dark, 'HopewellQueensRoadBrownLouvreBackingAndCanopy');
  merged(group, glass, materials.entranceGlass, 'HopewellQueensRoadGlazedDoors', false);
  merged(group, frames, materials.fin, 'HopewellQueensRoadAngledCanopyAndDoorFrames');
  merged(group, louvres, materials.louvre, 'HopewellQueensRoadVerticalBronzeLouvres');
  merged(group, steps, materials.dark, 'HopewellQueensRoadTwinEscalatorTreads');
  merged(group, rails, materials.dark, 'HopewellQueensRoadEscalatorHandrails');
  merged(group, lights, materials.warmLight, 'HopewellQueensRoadWarmEntranceLights', false);
  sign(group, 'qre', 10.5, 2.62, [0, upper + 4.63, 4.84], 'HopewellQueensRoad183Identification');
  const colliders = [], add = (x, z, w, d, minY, maxY) => {
    const p = hopewellFrameToWorld(frame, x, z); colliders.push(worldCollider(p.x, p.z, w, d, frame.ry, minY, maxY));
  };
  add(0, 1.48, 18.4, 3.0, upper + 8, upper + 28); add(0, 0, 10.6, 0.40, upper, upper + 4.2);
  add(0, 2.35, 11.4, 4.8, upper + 4.85, upper + 5.55);
  for (const x of [-4.9, 4.9]) add(x, 3.75, 0.30, 0.30, upper, upper + 5.4);
  return { colliders };
}

function createKennedyEntrance(root, materials, grounds, groundOffset) {
  const frame = HOPEWELL_KENNEDY_ENTRANCE, group = new THREE.Group(); group.position.set(frame.x, 0, frame.z); group.rotation.y = frame.ry;
  group.name = 'HopewellKennedyRoadLevel17HillsideLobby'; root.add(group);
  const ground = grounds.kennedy - groundOffset, stone = [], glass = [], frames = [], lights = [];
  box(stone, [0, ground + 2.8, -0.22], [8.2, 5.6, 0.40]);
  for (const x of [-2.5, 0, 2.5]) box(glass, [x, ground + 2.15, 0.03], [2.25, 4.3, 0.10]);
  for (const x of [-3.85, -1.25, 1.25, 3.85]) box(frames, [x, ground + 2.4, 0.14], [0.18, 4.8, 0.22]);
  box(stone, [0, ground + 5.15, 1.05], [8.8, 0.32, 2.5]);
  for (const x of [-3.7, 3.7]) box(frames, [x, ground + 2.45, 1.85], [0.18, 4.9, 0.18]);
  for (const x of [-2.8, 2.8]) box(lights, [x, ground + 4.93, 1.25], [1.0, 0.07, 0.12]);
  merged(group, stone, materials.solidStone, 'HopewellKennedyRoadStonePortalAndCanopy');
  merged(group, glass, materials.entranceGlass, 'HopewellKennedyRoadGlazedDoors', false);
  merged(group, frames, materials.fin, 'HopewellKennedyRoadWhitePortalFrames');
  merged(group, lights, materials.warmLight, 'HopewellKennedyRoadWarmLights', false);
  sign(group, 'kennedy', 7.9, 1.98, [0, ground + 5.12, 2.33], 'HopewellKennedyRoad17Identification');
  const colliders = [], add = (x, z, w, d, minY, maxY) => {
    const p = hopewellFrameToWorld(frame, x, z); colliders.push(worldCollider(p.x, p.z, w, d, frame.ry, minY, maxY));
  };
  add(0, 0, 8.2, 0.44, ground, ground + 5.6); add(0, 1.05, 8.8, 2.5, ground + 4.9, ground + 5.35);
  for (const x of [-3.7, 3.7]) add(x, 1.85, 0.24, 0.24, ground, ground + 4.9);
  return { colliders };
}

export function buildHopewell(root, {
  groundOffset = 0, queensRoadUpperGround = groundOffset + 0.12,
  queensRoadLowerGround = queensRoadUpperGround - HOPEWELL_QRE_ESCALATOR_RISE,
  kennedyRoadGround = groundOffset + 0.12
} = {}) {
  const group = new THREE.Group(); group.name = 'HopewellAuthoredCylindricalOfficeRestaurantAndHillsidePodium'; group.userData.internalId = 'HK-B0016';
  group.position.y = groundOffset; root.add(group);
  const materials = {
    glass: new THREE.MeshStandardNodeMaterial({ metalness: 0.46, roughness: 0.24, envMapIntensity: 1.05, side: THREE.DoubleSide }),
    backing: new THREE.MeshStandardNodeMaterial({ roughness: 0.70, side: THREE.DoubleSide }),
    stone: new THREE.MeshStandardNodeMaterial({ roughness: 0.78, side: THREE.DoubleSide }),
    solidStone: new THREE.MeshStandardNodeMaterial({ color: 0xb8ad96, roughness: 0.78 }),
    podiumGlass: new THREE.MeshStandardNodeMaterial({ metalness: 0.24, roughness: 0.40, side: THREE.DoubleSide }),
    crownGlass: new THREE.MeshStandardNodeMaterial({ metalness: 0.40, roughness: 0.28, side: THREE.DoubleSide }),
    roof: new THREE.MeshStandardNodeMaterial({ roughness: 0.76, side: THREE.DoubleSide }),
    fin: new THREE.MeshStandardNodeMaterial({ color: 0xd8d7ce, metalness: 0.08, roughness: 0.56 }),
    dark: new THREE.MeshStandardNodeMaterial({ color: 0x282421, metalness: 0.26, roughness: 0.48 }),
    louvre: new THREE.MeshStandardNodeMaterial({ color: 0x4c3024, metalness: 0.38, roughness: 0.48 }),
    liftGlass: new THREE.MeshStandardNodeMaterial({ color: 0x393b3a, metalness: 0.38, roughness: 0.25 }),
    entranceGlass: new THREE.MeshStandardNodeMaterial({ color: 0x504b43, metalness: 0.18, roughness: 0.18, transparent: true, opacity: 0.48, depthWrite: false, side: THREE.DoubleSide }),
    warmLight: new THREE.MeshStandardNodeMaterial({ color: 0xd8c09a, roughness: 0.42 }),
    roofBronze: new THREE.MeshStandardNodeMaterial({ color: 0x9a6545, metalness: 0.34, roughness: 0.72, side: THREE.DoubleSide }),
    poolRim: new THREE.MeshStandardNodeMaterial({ color: 0x263c3c, roughness: 0.48 }),
    poolWater: new THREE.MeshStandardNodeMaterial({ color: 0x15959b, metalness: 0.12, roughness: 0.20 })
  };
  for (const key of ['glass', 'backing', 'stone', 'podiumGlass', 'crownGlass', 'roof']) materials[key].colorNode = attribute('color', 'vec3');
  materials.glass.emissiveNode = color(0x332d26).mul(nightAmount()).mul(0.06)
    .add(color(0xffd2a0).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.54));
  materials.podiumGlass.emissiveNode = color(0xffc58f).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.24);
  materials.crownGlass.emissiveNode = color(0xffcf98).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.32);
  materials.warmLight.emissiveNode = color(0xffcf94).mul(nightAmount().mul(1.35).add(0.01));
  materials.entranceGlass.emissiveNode = color(0x9a7957).mul(nightAmount()).mul(0.07);

  const tower = new THREE.Group(); tower.position.set(HOPEWELL_SITE.x, 0, HOPEWELL_SITE.z); tower.rotation.y = HOPEWELL_SITE.ry;
  tower.name = 'HopewellExactOsmCylinderAndSeparatedRoofConventions'; group.add(tower);
  const shaft = createOfficeShaft();
  meshStore(tower, shaft.backing, materials.backing, 'HopewellOpaqueCylinderBacking');
  meshStore(tower, shaft.glass, materials.glass, 'HopewellDarkHorizontalOfficeWindowBands');
  merged(tower, shaft.spandrels, materials.dark, 'HopewellContinuousDarkBronzeSpandrels');
  merged(tower, shaft.fins, materials.fin, 'HopewellEightyTwoStrongWhiteVerticalFacadeFins');
  const podium = createPodium();
  meshStore(tower, podium.stone, materials.stone, 'HopewellHillsideBeigePodiumStone');
  meshStore(tower, podium.louvrePanels, materials.podiumGlass, 'HopewellPodiumBrownRecessedLouvreBands');
  merged(tower, podium.piers, materials.fin, 'HopewellPodiumOffWhitePiers');
  merged(tower, podium.bands, materials.solidStone, 'HopewellPodiumBeigeHorizontalBands');
  merged(tower, podium.slats, materials.louvre, 'HopewellPodiumIndividualVerticalLouvreSlats');
  const crown = createCrown();
  meshStore(tower, crown.glass, materials.crownGlass, 'HopewellRevolvingRestaurantAndStackedCrownGlazing');
  meshStore(tower, crown.roof, materials.roof, 'HopewellCircularRoofDeck');
  merged(tower, crown.belts, materials.fin, 'HopewellBroadWhiteRevolvingRestaurantBelts');
  merged(tower, crown.fins, materials.fin, 'HopewellCrownShortVerticalFins');
  createRoofPool(tower, materials);
  const lift = createExternalLift(group, materials);
  const grounds = { qreUpper: queensRoadUpperGround, qreLower: queensRoadLowerGround, kennedy: kennedyRoadGround };
  const qre = createQueensRoadEntrance(group, materials, grounds, groundOffset);
  const kennedy = createKennedyEntrance(group, materials, grounds, groundOffset);

  const colliders = [
    ...hopewellRingColliders(HOPEWELL_TOWER_RING, HOPEWELL_PODIUM_HEIGHT, HOPEWELL_MAIN_ROOF, 0.92),
    ...hopewellRingColliders(HOPEWELL_PODIUM_RING, HOPEWELL_COLLISION_BASE, HOPEWELL_PODIUM_HEIGHT, 0.92),
    ...lift.colliders, ...qre.colliders, ...kennedy.colliders
  ];
  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }
  const landmark = { name: HOPEWELL_SITE.name, englishName: HOPEWELL_SITE.englishName,
    position: { x: HOPEWELL_SITE.x, y: groundOffset, z: HOPEWELL_SITE.z }, radius: 70, height: HOPEWELL_CTBUH_TO_TIP_HEIGHT };
  const stats = {
    hopewellGroundOffset: groundOffset, hopewellLandmarks: 1, hopewellOsmHeight: HOPEWELL_OSM_HEIGHT,
    hopewellMainRoof: HOPEWELL_MAIN_ROOF, hopewellCtbuhToTipHeight: HOPEWELL_CTBUH_TO_TIP_HEIGHT,
    hopewellOsmLevels: HOPEWELL_OSM_LEVELS, hopewellOsmMinLevel: HOPEWELL_OSM_MIN_LEVEL,
    hopewellCtbuhLevels: HOPEWELL_CTBUH_LEVELS, hopewellOfficialLevels: HOPEWELL_OFFICIAL_LEVELS,
    hopewellCtbuhTowerGfa: HOPEWELL_CTBUH_TOWER_GFA, hopewellOfficialGfaSqft: HOPEWELL_OFFICIAL_GFA_SQFT,
    hopewellConstructionStartYear: HOPEWELL_CONSTRUCTION_START_YEAR, hopewellCompletedYear: HOPEWELL_COMPLETED_YEAR,
    hopewellSourceVertices: HOPEWELL_SITE.localRing.length / 2, hopewellOsmWayVersion: HOPEWELL_SITE.source.version,
    hopewellQreSourceVertex: HOPEWELL_QRE_SOURCE_VERTEX, hopewellKennedySourceVertex: HOPEWELL_KENNEDY_SOURCE_VERTEX,
    hopewellLiftSourceVertex: HOPEWELL_LIFT_SOURCE_VERTEX,
    hopewellQreEntranceSourceNode: HOPEWELL_QRE_ENTRANCE.sourceNode,
    hopewellKennedyEntranceSourceNode: HOPEWELL_KENNEDY_ENTRANCE.sourceNode,
    hopewellOfficeCourses: HOPEWELL_OFFICE_COURSES, hopewellGlassPanels: shaft.glassPanels,
    hopewellPrimaryFins: shaft.primaryFins, hopewellSecondaryFins: shaft.secondaryFins,
    hopewellPodiumLouvreSlats: podium.louvreSlats, hopewellColliders: colliders.length
  };
  group.userData.stats = stats;
  return { group, colliders, landmarks: [landmark], stats, groundOffset, grounds,
    queensRoadUpperTop: grounds.qreUpper, queensRoadLowerTop: grounds.qreLower, kennedyRoadTop: grounds.kennedy,
    groundHeightAt: (x, z, fallback) => hopewellGroundHeightAt(x, z, fallback, grounds) };
}
