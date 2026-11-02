import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  SUN_HUNG_KAI_SITE, SUN_HUNG_KAI_TOWER_RING, SUN_HUNG_KAI_PODIUM_RING,
  SUN_HUNG_KAI_MAIN_EDGES, SUN_HUNG_KAI_LOGO_EDGES, SUN_HUNG_KAI_COVERED_DRIVEWAY_EDGES,
  SUN_HUNG_KAI_COVERED_DRIVEWAY_CLEARANCE, SUN_HUNG_KAI_COVERED_DRIVEWAY_COLUMN_INSET, SUN_HUNG_KAI_COVERED_SERVICE_WAY_ID,
  SUN_HUNG_KAI_OSM_HEIGHT, SUN_HUNG_KAI_OSM_LEVELS, SUN_HUNG_KAI_HEIGHT, SUN_HUNG_KAI_TO_TIP_HEIGHT,
  SUN_HUNG_KAI_CTBUH_LEVELS, SUN_HUNG_KAI_CTBUH_TOWER_GFA, SUN_HUNG_KAI_CTBUH_COMPLETION_YEAR,
  SUN_HUNG_KAI_OFFICIAL_LEVELS, SUN_HUNG_KAI_OFFICIAL_GFA_SQFT, SUN_HUNG_KAI_FIRST_COMPLETED_YEAR,
  SUN_HUNG_KAI_PREVIOUS_HEIGHT, SUN_HUNG_KAI_PREVIOUS_LEVELS, SUN_HUNG_KAI_ADDED_STOREYS,
  SUN_HUNG_KAI_PLAZA_TOP, SUN_HUNG_KAI_PODIUM_HEIGHT, SUN_HUNG_KAI_PREVIOUS_HEIGHT_CONTROL,
  SUN_HUNG_KAI_MAIN_GLASS_TOP, SUN_HUNG_KAI_PARAPET_TOP, SUN_HUNG_KAI_LOWER_VISUAL_COURSES,
  SUN_HUNG_KAI_ADDED_VISUAL_COURSES, SUN_HUNG_KAI_VISUAL_COURSES, SUN_HUNG_KAI_PANEL_TARGET_WIDTH,
  SUN_HUNG_KAI_ENTRANCE, SUN_HUNG_KAI_ENTRANCE_SOURCE_EDGE,
  sunHungKaiFloorY, sunHungKaiEdgeOutward, sunHungKaiLocalToWorld, sunHungKaiRingColliders
} from './sun-hung-kai-architecture.js';

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
  const { nx, nz, ry } = sunHungKaiEdgeOutward(ring, edge);
  box(parts, [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset], [width, height, depth], ry);
}
function worldCollider(cx, cz, w, d, ry, minY, maxY) {
  const cs = Math.cos(ry), sn = Math.sin(ry), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: cx, z: cz, w, d, ry, minY, maxY,
    minX: cx - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: cx + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: cz - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: cz + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx, cz, hx, hz, cs, sn } };
}
function segmentCollider(ring, edge, t0, t1, minY, maxY, depth = 0.85) {
  const i = edge * 2, ax = lerp(ring[i], ring[i + 2], t0), az = lerp(ring[i + 1], ring[i + 3], t0);
  const bx = lerp(ring[i], ring[i + 2], t1), bz = lerp(ring[i + 1], ring[i + 3], t1);
  const p = sunHungKaiLocalToWorld((ax + bx) * 0.5, (az + bz) * 0.5);
  const ry = SUN_HUNG_KAI_SITE.ry + sunHungKaiEdgeOutward(ring, edge).ry;
  return worldCollider(p.x, p.z, Math.hypot(bx - ax, bz - az) + 0.04, depth, ry, minY, maxY);
}

function createTower() {
  const ring = SUN_HUNG_KAI_TOWER_RING, mainEdges = new Set(SUN_HUNG_KAI_MAIN_EDGES);
  const glass = store(), backing = store(), cornerStone = store(), roof = store();
  const mullions = [], floorBands = [], coping = [];
  let glassPanels = 0, stonePanels = 0, verticalMullions = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = sunHungKaiEdgeOutward(ring, edge), main = mainEdges.has(edge);
    const point = (t, y, offset = 0.04) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    triangle(roof, [0, SUN_HUNG_KAI_MAIN_GLASS_TOP, 0], [ax, SUN_HUNG_KAI_MAIN_GLASS_TOP, az], [bx, SUN_HUNG_KAI_MAIN_GLASS_TOP, bz], [0.29, 0.29, 0.27]);
    if (main) {
      const bays = Math.max(4, Math.round(length / SUN_HUNG_KAI_PANEL_TARGET_WIDTH));
      quad(backing, point(0, SUN_HUNG_KAI_PODIUM_HEIGHT, -0.08), point(1, SUN_HUNG_KAI_PODIUM_HEIGHT, -0.08),
        point(1, SUN_HUNG_KAI_MAIN_GLASS_TOP, -0.08), point(0, SUN_HUNG_KAI_MAIN_GLASS_TOP, -0.08), [0.025, 0.024, 0.022]);
      for (let course = 0; course < SUN_HUNG_KAI_VISUAL_COURSES; course++) {
        const y0 = sunHungKaiFloorY(course), y1 = sunHungKaiFloorY(course + 1), added = course >= SUN_HUNG_KAI_LOWER_VISUAL_COURSES;
        for (let bay = 0; bay < bays; bay++) {
          const t0 = bay / bays + 0.0012, t1 = (bay + 1) / bays - 0.0012;
          const variation = hash(edge, bay, course, 17), lit = hash(edge, bay, course, 81) > 0.82 ? 0.15 + variation * 0.63 : 0;
          const lowerTint = mix([0.035, 0.031, 0.027], [0.155, 0.127, 0.094], 0.12 + variation * 0.75);
          const tint = added ? mix(lowerTint, [0.11, 0.125, 0.13], 0.18) : lowerTint;
          quad(glass, point(t0, y0 + 0.13), point(t1, y0 + 0.13), point(t1, y1 - 0.12), point(t0, y1 - 0.12), tint, lit); glassPanels++;
        }
        edgeBox(floorBands, ring, edge, 0.5, y0 + 0.025, 0.105, length + 0.025,
          course === SUN_HUNG_KAI_LOWER_VISUAL_COURSES ? 0.17 : 0.085, 0.14);
      }
      for (let bay = 0; bay <= bays; bay++) {
        edgeBox(mullions, ring, edge, bay / bays, (SUN_HUNG_KAI_PODIUM_HEIGHT + SUN_HUNG_KAI_MAIN_GLASS_TOP) * 0.5,
          0.115, bay % 4 === 0 ? 0.068 : 0.045, SUN_HUNG_KAI_MAIN_GLASS_TOP - SUN_HUNG_KAI_PODIUM_HEIGHT, 0.15); verticalMullions++;
      }
      quad(cornerStone, point(0, SUN_HUNG_KAI_MAIN_GLASS_TOP, 0.01), point(1, SUN_HUNG_KAI_MAIN_GLASS_TOP, 0.01),
        point(1, SUN_HUNG_KAI_PARAPET_TOP, 0.01), point(0, SUN_HUNG_KAI_PARAPET_TOP, 0.01), [0.61, 0.60, 0.56]); stonePanels++;
    } else {
      const bays = Math.max(1, Math.ceil(length / 1.15));
      quad(backing, point(0, SUN_HUNG_KAI_PODIUM_HEIGHT, -0.035), point(1, SUN_HUNG_KAI_PODIUM_HEIGHT, -0.035),
        point(1, SUN_HUNG_KAI_PARAPET_TOP, -0.035), point(0, SUN_HUNG_KAI_PARAPET_TOP, -0.035), [0.28, 0.28, 0.26]);
      for (let course = 0; course < SUN_HUNG_KAI_VISUAL_COURSES; course++) {
        const y0 = sunHungKaiFloorY(course), y1 = course === SUN_HUNG_KAI_VISUAL_COURSES - 1 ? SUN_HUNG_KAI_PARAPET_TOP : sunHungKaiFloorY(course + 1);
        for (let bay = 0; bay < bays; bay++) {
          const t0 = bay / bays + 0.004, t1 = (bay + 1) / bays - 0.004, variation = hash(edge, bay, course, 37);
          quad(cornerStone, point(t0, y0 + 0.025, 0.035), point(t1, y0 + 0.025, 0.035),
            point(t1, y1 - 0.025, 0.035), point(t0, y1 - 0.025, 0.035),
            mix([0.50, 0.50, 0.47], [0.72, 0.71, 0.66], 0.20 + variation * 0.65)); stonePanels++;
        }
      }
    }
    edgeBox(coping, ring, edge, 0.5, SUN_HUNG_KAI_PARAPET_TOP - 0.10, 0.10, length + 0.035, 0.20, 0.25);
  }
  return { glass, backing, cornerStone, roof, mullions, floorBands, coping, glassPanels, stonePanels, verticalMullions };
}

function createPodium() {
  const ring = SUN_HUNG_KAI_PODIUM_RING;
  const glass = store(), bands = [], piers = [], groundPiers = [], drivewayPiers = [];
  let panels = 0;
  // The ground floor is an open porte-cochere; retail glazing is authored at the Harbour Road entrance.
  // This keeps the source-tagged covered service way physically clear instead of hiding a road inside glass.
  const levels = [[7.45, 13.55], [13.85, 18]];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = sunHungKaiEdgeOutward(ring, edge), bays = Math.max(1, Math.round(length / 1.65));
    const point = (t, y, offset = 0.04) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    for (let level = 0; level < levels.length; level++) {
      const [y0, y1] = levels[level];
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + 0.002, t1 = (bay + 1) / bays - 0.002, middle = (t0 + t1) * 0.5;
        if (edge === SUN_HUNG_KAI_ENTRANCE_SOURCE_EDGE && middle > 0.14 && middle < 0.86) continue;
        const variation = hash(edge, bay, level, 53), lit = level === 0 ? 0.48 : 0.18 + variation * 0.20;
        quad(glass, point(t0, y0 + 0.22), point(t1, y0 + 0.22), point(t1, y1 - 0.20), point(t0, y1 - 0.20),
          mix([0.045, 0.040, 0.034], [0.14, 0.115, 0.083], variation), lit); panels++;
      }
    }
    for (const y of [7.2, 13.75, 17.90]) edgeBox(bands, ring, edge, 0.5, y, 0.13, length + 0.035, y === 17.90 ? 0.40 : 0.30, 0.30);
    edgeBox(piers, ring, edge, 0, (SUN_HUNG_KAI_COVERED_DRIVEWAY_CLEARANCE + 18) * 0.5, -0.10, 0.72, 18 - SUN_HUNG_KAI_COVERED_DRIVEWAY_CLEARANCE, 0.72);
    if (edge >= 2 && edge <= 8) edgeBox(groundPiers, ring, edge, 0, 3.66, -0.10, 0.72, 7.08, 0.72);
  }
  // The covered service way remains drivable: ground-level posts are inset behind its eastern carriageway edge.
  for (const t of [0.18, 0.50, 0.82]) edgeBox(drivewayPiers, SUN_HUNG_KAI_PODIUM_RING, 13, t, 3.66, -SUN_HUNG_KAI_COVERED_DRIVEWAY_COLUMN_INSET, 0.82, 7.08, 0.82);
  return { glass, bands, piers, groundPiers, drivewayPiers, panels };
}

function createRoofPlant() {
  const plant = [], louvres = [], dishes = [], colliders = [];
  const blocks = [
    { x: -15.2, z: -7.8, w: 7.6, d: 5.4, h: 2.1 },
    { x: -12.3, z: -4.6, w: 4.0, d: 3.8, h: 3.0 },
    { x: -18.5, z: -4.3, w: 2.8, d: 3.0, h: 1.3 }
  ];
  for (const item of blocks) {
    const y = SUN_HUNG_KAI_MAIN_GLASS_TOP + item.h * 0.5;
    box(plant, [item.x, y, item.z], [item.w, item.h, item.d]);
    for (let slot = -2; slot <= 2; slot++) box(louvres, [item.x + slot * item.w / 6, y, item.z + item.d * 0.5 + 0.035], [0.08, item.h * 0.72, 0.09]);
    const p = sunHungKaiLocalToWorld(item.x, item.z);
    colliders.push(worldCollider(p.x, p.z, item.w, item.d, SUN_HUNG_KAI_SITE.ry, SUN_HUNG_KAI_MAIN_GLASS_TOP, SUN_HUNG_KAI_MAIN_GLASS_TOP + item.h));
  }
  for (const [x, z] of [[-6.5, -8.0], [-3.7, -7.2]]) {
    box(plant, [x, SUN_HUNG_KAI_MAIN_GLASS_TOP + 0.28, z], [0.16, 0.56, 0.16]);
    const dish = new THREE.SphereGeometry(0.72, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    dish.translate(x, SUN_HUNG_KAI_MAIN_GLASS_TOP + 0.56, z); dishes.push(dish);
  }
  return { plant, louvres, dishes, colliders };
}

// Authored vector sign lettering; no image asset or system CJK font is required.
const SHK_SIGN_GLYPHS = {
  '新': [[[8,18],[36,18]],[[22,6],[22,34]],[[8,34],[38,34]],[[14,42],[32,42]],[[23,35],[23,96]],[[20,58],[7,82]],[[26,58],[39,80]],[[52,14],[84,14]],[[68,14],[54,46]],[[55,32],[88,32]],[[72,32],[72,96]],[[52,52],[68,52]],[[52,72],[68,72]]],
  '鴻': [[[12,14],[5,30]],[[18,22],[10,40]],[[24,32],[16,52]],[[8,60],[28,60]],[[18,52],[18,94]],[[7,94],[30,94]],[[38,18],[50,18],[50,48],[38,48],[38,18]],[[38,33],[50,33]],[[60,15],[88,15]],[[74,8],[74,32]],[[58,34],[90,34]],[[62,46],[86,46],[86,78],[62,78],[62,46]],[[62,60],[86,60]],[[74,78],[74,96]],[[60,96],[90,96]]],
  '基': [[[12,14],[82,14]],[[24,6],[24,58]],[[70,6],[70,58]],[[12,30],[82,30]],[[12,44],[82,44]],[[8,58],[88,58]],[[34,58],[18,78]],[[60,58],[78,78]],[[46,55],[46,96]],[[22,76],[72,76]],[[12,94],[84,94]]],
  '中': [[[20,28],[80,28],[80,75],[20,75],[20,28]],[[50,10],[50,95]]],
  '心': [[[50,35],[43,62],[48,80],[63,85],[76,72]],[[22,45],[14,62]],[[68,25],[75,38]],[[86,48],[92,61]]]
};
function drawChinese(ctx, text, centreX, baseline, size, fill) {
  const chars = [...text], widths = chars.map((char) => SHK_SIGN_GLYPHS[char] ? size * 1.04 : ctx.measureText(char).width);
  let x = centreX - widths.reduce((sum, width) => sum + width, 0) * 0.5;
  ctx.textAlign = 'left'; ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.lineWidth = Math.max(1.4, size * 0.052); ctx.lineJoin = 'miter';
  chars.forEach((char, index) => {
    const glyph = SHK_SIGN_GLYPHS[char];
    if (glyph) {
      const top = baseline - size * 0.86, scale = size * 0.90 / 100;
      for (const path of glyph) { ctx.beginPath(); path.forEach(([px, py], point) => { const xx = x + px * scale, yy = top + py * scale; if (point) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }); ctx.stroke(); }
    } else ctx.fillText(char, x, baseline);
    x += widths[index];
  });
}
function drawShkLogo(ctx, cx, cy, size, fill) {
  ctx.save(); ctx.strokeStyle = fill; ctx.fillStyle = fill; ctx.lineWidth = size * 0.026;
  ctx.strokeRect(cx - size * 0.48, cy - size * 0.48, size * 0.96, size * 0.96);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 ${size * 0.70}px sans-serif`; ctx.fillText('S', cx - size * 0.025, cy + size * 0.015);
  // Keep the small H and K legible at the building's actual sign scale instead of collapsing to an "S" at distance.
  ctx.font = `700 ${size * 0.25}px sans-serif`; ctx.fillText('H', cx - size * 0.29, cy + size * 0.30); ctx.fillText('K', cx + size * 0.30, cy - size * 0.29);
  ctx.restore();
}
function signTexture(kind) {
  const roof = kind === 'roof', canvas = document.createElement('canvas'); canvas.width = roof ? 512 : 2048; canvas.height = roof ? 512 : 256;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (roof) drawShkLogo(ctx, 256, 256, 420, '#eee5c9');
  else {
    drawShkLogo(ctx, 142, 128, 210, '#c7a96a'); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center'; ctx.fillStyle = '#c7a96a';
    ctx.font = '600 78px sans-serif'; ctx.fillText('SUN HUNG KAI CENTRE', 1180, 108);
    ctx.font = '500 80px sans-serif'; drawChinese(ctx, '新鴻基中心', 1110, 204, 80, '#c7a96a');
    ctx.font = '500 30px sans-serif'; ctx.fillText('30', 1900, 207);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function sign(group, kind, width, height, position, ry, name) {
  const material = new THREE.MeshBasicMaterial({ map: signTexture(kind), transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material); mesh.position.set(...position); mesh.rotation.y = ry; mesh.renderOrder = 2; mesh.name = name; group.add(mesh); return mesh;
}
function createRoofSigns(group) {
  const ring = SUN_HUNG_KAI_TOWER_RING;
  for (const edge of SUN_HUNG_KAI_LOGO_EDGES) {
    const i = edge * 2, { nx, nz } = sunHungKaiEdgeOutward(ring, edge);
    sign(group, 'roof', 5.4, 5.4, [(ring[i] + ring[i + 2]) * 0.5 + nx * 0.19, 205.4, (ring[i + 1] + ring[i + 3]) * 0.5 + nz * 0.19], Math.atan2(nx, nz), `SunHungKaiRoofMonogramEdge${edge}`);
  }
}

function createEntrance(root, materials) {
  const frame = SUN_HUNG_KAI_ENTRANCE, group = new THREE.Group(); group.position.set(frame.x, 0, frame.z); group.rotation.y = frame.ry;
  group.name = 'SunHungKaiHarbourRoadSlopingAtriumAndIlluminatedPodium'; root.add(group);
  const stone = [], glass = [], doors = [], frames = [], lights = [], planters = [], greenery = [], interior = [], slopeFrames = [];
  const slopeGlass = store();
  box(stone, [0, 0.06, -0.70], [36, 0.12, 9.8]);
  box(glass, [0, 3.45, -4.34], [32, 6.65, 0.10]);
  box(glass, [0, 10.45, -4.34], [32, 5.75, 0.10]);
  box(interior, [0, 3.25, -4.53], [31.6, 6.1, 0.12]); box(interior, [0, 10.35, -4.53], [31.6, 5.35, 0.12]);
  for (const x of [-2.1, -0.70, 0.70, 2.1]) box(doors, [x, 2.25, -4.20], [1.32, 4.5, 0.10]);
  for (const x of [-15.8, -12.4, -8.2, -4.1, 0, 4.1, 8.2, 12.4, 15.8]) box(frames, [x, 6.85, -4.15], [0.10, 13.45, 0.14]);
  for (const y of [0.28, 4.55, 6.85, 13.55]) box(frames, [0, y, -4.14], [32, 0.10, 0.14]);
  for (const x of [-0.16, 0.16]) box(frames, [x, 1.65, -4.02], [0.045, 0.85, 0.07]);
  for (const x of [-16, -6, 6, 16]) box(stone, [x, 7.06, -0.40], [1.12, 13.88, 1.30]);
  box(stone, [0, 7.30, -2.20], [34, 0.72, 4.60]);
  box(planters, [0, 7.90, -0.68], [28, 0.65, 0.82]); box(greenery, [0, 8.29, -0.68], [27.6, 0.34, 0.68]);
  box(stone, [0, 16.0, -2.35], [36, 4.0, 5.0]);
  for (const z of [-0.55, -2.25, -3.95]) box(lights, [0, 13.93, z], [25, 0.065, 0.12]);
  for (const x of [-16, 16]) box(lights, [x, 10.6, -0.05], [0.08, 5.2, 0.08]);
  const slopedPoint = (x, t) => [x, 18 + t * 26, -t * 4.7];
  const xBays = 14, yBays = 6;
  for (let y = 0; y < yBays; y++) for (let x = 0; x < xBays; x++) {
    const x0 = -13 + x * 26 / xBays + 0.035, x1 = -13 + (x + 1) * 26 / xBays - 0.035;
    const t0 = y / yBays + 0.004, t1 = (y + 1) / yBays - 0.004, variation = hash(x, y, 71);
    quad(slopeGlass, slopedPoint(x0, t0), slopedPoint(x1, t0), slopedPoint(x1, t1), slopedPoint(x0, t1),
      mix([0.045, 0.050, 0.052], [0.17, 0.16, 0.135], variation), 0.10 + variation * 0.12);
  }
  for (let x = 0; x <= xBays; x++) beam(slopeFrames, slopedPoint(-13 + x * 26 / xBays, 0), slopedPoint(-13 + x * 26 / xBays, 1), 0.075, 0.09);
  for (let y = 0; y <= yBays; y++) beam(slopeFrames, slopedPoint(-13, y / yBays), slopedPoint(13, y / yBays), 0.085, 0.10);
  for (const x of [-13.35, 13.35]) beam(slopeFrames, slopedPoint(x, 0), slopedPoint(x, 1), 0.48, 0.48);
  merged(group, stone, materials.solidStone, 'SunHungKaiPodiumStoneFasciaColumnsAndForecourt');
  merged(group, glass, materials.entryGlass, 'SunHungKaiTwoLevelWarmRetailGlazing', false);
  merged(group, doors, materials.entryGlass, 'SunHungKaiHarbourRoadGlazedDoors', false);
  merged(group, frames, materials.mullion, 'SunHungKaiEntranceDoorAndWindowFrames');
  merged(group, interior, materials.interior, 'SunHungKaiWarmPodiumInteriors', false);
  merged(group, lights, materials.warmLight, 'SunHungKaiPodiumUnderscoreAndColumnLights', false);
  merged(group, planters, materials.solidStone, 'SunHungKaiPodiumTerracePlanter');
  merged(group, greenery, materials.greenery, 'SunHungKaiPodiumTerracePlanting', false);
  meshStore(group, slopeGlass, materials.slopedGlass, 'SunHungKaiSlopingHarbourRoadAtriumGlass');
  merged(group, slopeFrames, materials.mullion, 'SunHungKaiSlopingAtriumGridAndStoneCheeks');
  sign(group, 'podium', 26, 3.25, [0, 16.05, 0.171], 0, 'SunHungKaiHarbourRoadBilingualIdentification');
  const colliders = [], add = (x, z, w, d, minY, maxY) => {
    const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry), wx = frame.x + cs * x + sn * z, wz = frame.z - sn * x + cs * z;
    colliders.push(worldCollider(wx, wz, w, d, frame.ry, minY, maxY));
  };
  add(0, -4.34, 32, 0.34, 0, 13.8); add(0, -2.35, 36, 5.0, 14, 18);
  for (const x of [-16, -6, 6, 16]) add(x, -0.40, 1.12, 1.30, 0, 14);
  for (let segment = 0; segment < 6; segment++) add(0, -4.7 * (segment + 0.5) / 6, 26, 0.30, 18 + 26 * segment / 6, 18 + 26 * (segment + 1) / 6);
  return { colliders };
}

function createPodiumColliders() {
  const result = [], ring = SUN_HUNG_KAI_PODIUM_RING;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) result.push(segmentCollider(ring, edge, 0, 1, SUN_HUNG_KAI_COVERED_DRIVEWAY_CLEARANCE, 18));
  const groundColumn = (edge, t, offset) => {
    const i = edge * 2, { nx, nz, ry } = sunHungKaiEdgeOutward(ring, edge);
    const x = lerp(ring[i], ring[i + 2], t) + nx * offset, z = lerp(ring[i + 1], ring[i + 3], t) + nz * offset;
    const p = sunHungKaiLocalToWorld(x, z); result.push(worldCollider(p.x, p.z, 0.82, 0.82, SUN_HUNG_KAI_SITE.ry + ry, 0.12, 7.2));
  };
  for (let edge = 2; edge <= 8; edge++) groundColumn(edge, 0, -0.10);
  for (const t of [0.18, 0.50, 0.82]) groundColumn(13, t, -SUN_HUNG_KAI_COVERED_DRIVEWAY_COLUMN_INSET);
  return result;
}

export function buildSunHungKai(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'SunHungKaiAuthoredBronzeCurtainWallChamferedStoneCornersAndPodium'; group.userData.internalId = 'HK-B0017';
  group.position.y = groundOffset; root.add(group);
  const materials = {
    glass: new THREE.MeshStandardNodeMaterial({ metalness: 0.52, roughness: 0.24, envMapIntensity: 1.05, side: THREE.DoubleSide }),
    cornerStone: new THREE.MeshStandardNodeMaterial({ metalness: 0.08, roughness: 0.64, side: THREE.DoubleSide }),
    backing: new THREE.MeshStandardNodeMaterial({ roughness: 0.82, side: THREE.DoubleSide }),
    roof: new THREE.MeshStandardNodeMaterial({ metalness: 0.18, roughness: 0.72, side: THREE.DoubleSide }),
    podiumGlass: new THREE.MeshStandardNodeMaterial({ metalness: 0.42, roughness: 0.25, side: THREE.DoubleSide }),
    slopedGlass: new THREE.MeshStandardNodeMaterial({ metalness: 0.48, roughness: 0.22, side: THREE.DoubleSide }),
    mullion: new THREE.MeshStandardNodeMaterial({ color: 0x756e60, metalness: 0.72, roughness: 0.34 }),
    solidStone: new THREE.MeshStandardNodeMaterial({ color: 0xa7a49a, metalness: 0.04, roughness: 0.68 }),
    dark: new THREE.MeshStandardNodeMaterial({ color: 0x282622, metalness: 0.38, roughness: 0.48 }),
    entryGlass: new THREE.MeshStandardNodeMaterial({ color: 0x72634e, metalness: 0.20, roughness: 0.18, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide }),
    interior: new THREE.MeshStandardNodeMaterial({ color: 0x6d4e2e, roughness: 0.74 }),
    warmLight: new THREE.MeshStandardNodeMaterial({ color: 0xe0c28e, roughness: 0.42 }),
    greenery: new THREE.MeshStandardNodeMaterial({ color: 0x284d2d, roughness: 0.94 })
  };
  for (const key of ['glass', 'cornerStone', 'backing', 'roof', 'podiumGlass', 'slopedGlass']) materials[key].colorNode = attribute('color', 'vec3');
  materials.glass.emissiveNode = color(0x241c14).mul(nightAmount()).mul(0.06)
    .add(color(0xffd49b).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.58));
  materials.cornerStone.emissiveNode = color(0xe4ebff).mul(nightAmount()).mul(0.48);
  materials.podiumGlass.emissiveNode = color(0xffcf92).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.50);
  materials.slopedGlass.emissiveNode = color(0x80664a).mul(nightAmount()).mul(0.055)
    .add(color(0xffd5a0).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.32));
  materials.solidStone.emissiveNode = color(0xffd5a4).mul(nightAmount().mul(0.15).add(0.003));
  materials.entryGlass.emissiveNode = color(0xffc783).mul(nightAmount()).mul(0.09);
  materials.interior.emissiveNode = color(0xffbf72).mul(nightAmount().mul(0.50).add(0.035));
  materials.warmLight.emissiveNode = color(0xffcc83).mul(nightAmount().mul(1.6).add(0.01));

  const tower = new THREE.Group(); tower.position.set(SUN_HUNG_KAI_SITE.x, 0, SUN_HUNG_KAI_SITE.z); tower.rotation.y = SUN_HUNG_KAI_SITE.ry;
  tower.name = 'SunHungKaiExactSixteenVertexTowerAndFiveStoreyAddition'; group.add(tower);
  const shaft = createTower();
  meshStore(tower, shaft.backing, materials.backing, 'SunHungKaiOpaqueCurtainWallAndCornerJointBacking');
  meshStore(tower, shaft.glass, materials.glass, 'SunHungKaiDarkBronzeOfficeCurtainWall');
  meshStore(tower, shaft.cornerStone, materials.cornerStone, 'SunHungKaiIlluminatedChamferedStoneCornerPiers');
  meshStore(tower, shaft.roof, materials.roof, 'SunHungKaiFlatRoofDeck');
  merged(tower, shaft.mullions, materials.mullion, 'SunHungKaiDenseVerticalAluminiumMullions');
  merged(tower, shaft.floorBands, materials.mullion, 'SunHungKaiFineHorizontalTransomsAndAdditionSeam');
  merged(tower, shaft.coping, materials.solidStone, 'SunHungKaiRoofParapetCoping');
  createRoofSigns(tower);
  const podium = createPodium();
  meshStore(tower, podium.glass, materials.podiumGlass, 'SunHungKaiOpenRetailPodiumAndCoveredDrivewayGlazing');
  merged(tower, podium.bands, materials.solidStone, 'SunHungKaiPodiumHorizontalStoneBands');
  merged(tower, podium.piers, materials.solidStone, 'SunHungKaiPodiumPiersAboveCoveredDriveway');
  merged(tower, podium.groundPiers, materials.solidStone, 'SunHungKaiEastPodiumGroundColumns');
  merged(tower, podium.drivewayPiers, materials.solidStone, 'SunHungKaiInsetCoveredDrivewayGroundColumns');
  const roofPlant = createRoofPlant();
  merged(tower, roofPlant.plant, materials.solidStone, 'SunHungKaiRoofPlantAndSatellitePedestals');
  merged(tower, roofPlant.louvres, materials.dark, 'SunHungKaiRoofPlantLouvres');
  merged(tower, roofPlant.dishes, materials.solidStone, 'SunHungKaiTwoRoofSatelliteDishes');
  const entrance = createEntrance(group, materials);

  const colliders = [
    ...sunHungKaiRingColliders(SUN_HUNG_KAI_TOWER_RING, SUN_HUNG_KAI_PODIUM_HEIGHT, SUN_HUNG_KAI_PARAPET_TOP),
    ...createPodiumColliders(), ...roofPlant.colliders, ...entrance.colliders
  ];
  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }
  const landmark = { name: SUN_HUNG_KAI_SITE.name, englishName: SUN_HUNG_KAI_SITE.englishName,
    position: { x: SUN_HUNG_KAI_SITE.x, y: groundOffset, z: SUN_HUNG_KAI_SITE.z }, radius: 68, height: SUN_HUNG_KAI_TO_TIP_HEIGHT };
  const stats = {
    sunHungKaiGroundOffset: groundOffset, sunHungKaiLandmarks: 1,
    sunHungKaiOsmHeight: SUN_HUNG_KAI_OSM_HEIGHT, sunHungKaiOsmLevels: SUN_HUNG_KAI_OSM_LEVELS,
    sunHungKaiHeight: SUN_HUNG_KAI_HEIGHT, sunHungKaiToTipHeight: SUN_HUNG_KAI_TO_TIP_HEIGHT,
    sunHungKaiCtbuhLevels: SUN_HUNG_KAI_CTBUH_LEVELS, sunHungKaiCtbuhTowerGfa: SUN_HUNG_KAI_CTBUH_TOWER_GFA,
    sunHungKaiCtbuhCompletionYear: SUN_HUNG_KAI_CTBUH_COMPLETION_YEAR,
    sunHungKaiOfficialLevels: SUN_HUNG_KAI_OFFICIAL_LEVELS, sunHungKaiOfficialGfaSqft: SUN_HUNG_KAI_OFFICIAL_GFA_SQFT,
    sunHungKaiFirstCompletedYear: SUN_HUNG_KAI_FIRST_COMPLETED_YEAR,
    sunHungKaiPreviousHeight: SUN_HUNG_KAI_PREVIOUS_HEIGHT, sunHungKaiPreviousLevels: SUN_HUNG_KAI_PREVIOUS_LEVELS,
    sunHungKaiAddedStoreys: SUN_HUNG_KAI_ADDED_STOREYS,
    sunHungKaiSourceVertices: SUN_HUNG_KAI_SITE.localRing.length / 2, sunHungKaiOsmWayVersion: SUN_HUNG_KAI_SITE.source.version,
    sunHungKaiVisualCourses: SUN_HUNG_KAI_VISUAL_COURSES, sunHungKaiLowerVisualCourses: SUN_HUNG_KAI_LOWER_VISUAL_COURSES,
    sunHungKaiAddedVisualCourses: SUN_HUNG_KAI_ADDED_VISUAL_COURSES, sunHungKaiPreviousHeightControl: SUN_HUNG_KAI_PREVIOUS_HEIGHT_CONTROL,
    sunHungKaiGlassPanels: shaft.glassPanels, sunHungKaiStonePanels: shaft.stonePanels, sunHungKaiVerticalMullions: shaft.verticalMullions,
    sunHungKaiPodiumPanels: podium.panels, sunHungKaiRoofPlantBlocks: roofPlant.colliders.length,
    sunHungKaiRoofSatelliteDishes: 2, sunHungKaiRoofSigns: SUN_HUNG_KAI_LOGO_EDGES.length,
    sunHungKaiCoveredServiceWayId: SUN_HUNG_KAI_COVERED_SERVICE_WAY_ID,
    sunHungKaiCoveredDrivewayEdges: SUN_HUNG_KAI_COVERED_DRIVEWAY_EDGES.length,
    sunHungKaiCoveredDrivewayClearance: SUN_HUNG_KAI_COVERED_DRIVEWAY_CLEARANCE,
    sunHungKaiCoveredDrivewayColumnInset: SUN_HUNG_KAI_COVERED_DRIVEWAY_COLUMN_INSET,
    sunHungKaiColliders: colliders.length
  };
  group.userData.stats = stats;
  return { group, colliders, landmarks: [landmark], stats, groundOffset, plazaTop: groundOffset + SUN_HUNG_KAI_PLAZA_TOP };
}
