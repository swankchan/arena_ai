import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { color, smoothstep, positionLocal, clamp } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  CFA_SITE, CFA_OSM_SOURCE, CFA_LOCAL_RING, CFA_RING_AREA, CFA_FACADES, CFA_MAIN_ENTRANCE,
  CFA_OFFICIAL_STOREYS, CFA_OSM_LEVELS, CFA_HEIGHT, CFA_PUBLISHED_APPROX_HEIGHT, CFA_PUBLISHED_THEMIS_HEIGHT,
  CFA_COMPLETION_YEAR, CFA_ARCHITECTS, CFA_PLAZA_TOP, CFA_BALCONY_Y, CFA_PARAPET_Y,
  CFA_PEDIMENT_WIDTH, CFA_PEDIMENT_APEX_Y, CFA_DRUM_BASE_Y, CFA_DRUM_TOP_Y, CFA_DOME_TOP_Y,
  CFA_ARCADE_BAYS, CFA_GIANT_COLUMNS, CFA_DRUM_COLUMNS, CFA_DOME_RIBS, CFA_CHINESE_TILE_ROOFS,
  CFA_GROUND_RINGS, cfaFacadePoint, cfaFacadeCollider, cfaLocalCollider, cfaGroundHeightAt
} from './court-of-final-appeal-architecture.js';

const nightAmount = () => smoothstep(.55, 1.4, cityUniforms.uInteriorGlow);
// A restrained baked floodlight gradient supplements the city lights: granite is warmer near the
// uplights at arcade level, not a uniformly emissive white box after dark.
const floodlightFalloff = () => clamp(positionLocal.y.negate().add(18).div(18), 0, 1);
const hash = (a, b = 0, c = 0) => { const n = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return n - Math.floor(n); };

function merged(group, parts, material, name, shadows = true) {
  if (!parts.length) return null;
  const normalized = parts.map((part) => {
    const g = part.index ? part.toNonIndexed() : part;
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
    return g;
  });
  const geo = mergeGeometries(normalized, false);
  for (let i = 0; i < parts.length; i++) { if (normalized[i] !== parts[i]) normalized[i].dispose(); parts[i].dispose(); }
  if (!geo) throw new Error(`Court of Final Appeal could not merge ${name}`);
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, material); mesh.name = name; mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function box(parts, center, size, ry = 0) { const g = new THREE.BoxGeometry(...size); if (ry) g.rotateY(ry); g.translate(...center); parts.push(g); return g; }
function cylinder(parts, center, radius, height, segments = 16, radiusTop = radius) { const g = new THREE.CylinderGeometry(radiusTop, radius, height, segments); g.translate(...center); parts.push(g); return g; }
function sphere(parts, center, scale, segments = 12) { const g = new THREE.SphereGeometry(1, segments, 8); g.scale(...scale); g.translate(...center); parts.push(g); return g; }
function beam(parts, a, b, width = .08, depth = width) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start), length = direction.length(); if (length < .001) return;
  const g = new THREE.BoxGeometry(width, length, depth); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  g.translate(...start.add(end).multiplyScalar(.5).toArray()); parts.push(g); return g;
}
function facadeBox(parts, facade, u, y, offset, w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d); g.rotateY(facade.ry); g.translate(...cfaFacadePoint(facade, u, y, offset)); parts.push(g); return g;
}
function placeFacade(parts, g, facade, u = 0, y = 0, offset = 0) { g.rotateY(facade.ry); g.translate(...cfaFacadePoint(facade, u, y, offset)); parts.push(g); return g; }
function placeRadial(parts, g, theta, radius, y = 0) { g.rotateY(theta); g.translate(Math.sin(theta) * radius, y, Math.cos(theta) * radius); parts.push(g); return g; }
function shapeFloor(ring, y) {
  const shape = new THREE.Shape(); for (let i = 0; i < ring.length - 2; i += 2) { if (i === 0) shape.moveTo(ring[i], -ring[i + 1]); else shape.lineTo(ring[i], -ring[i + 1]); }
  shape.closePath(); const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g;
}
function trianglesGeometry(triangles) {
  const positions = [], uv = []; for (const triangle of triangles) for (const p of triangle) { positions.push(...p); uv.push(p[0] * .1, p[2] * .1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
}
function extrudeShape(shape, depth) { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 }); g.translate(0, 0, -depth * .5); return g; }
function archWedge(innerR, outerR, springY, a0, a1, depth) {
  const points = []; for (let i = 0; i <= 2; i++) { const a = a0 + (a1 - a0) * i / 2; points.push(new THREE.Vector2(Math.cos(a) * outerR, springY + Math.sin(a) * outerR)); }
  for (let i = 2; i >= 0; i--) { const a = a0 + (a1 - a0) * i / 2; points.push(new THREE.Vector2(Math.cos(a) * innerR, springY + Math.sin(a) * innerR)); }
  return extrudeShape(new THREE.Shape(points), depth);
}
function archSpandrel(halfWidth, radius, springY, topY, depth) {
  const points = [new THREE.Vector2(-halfWidth, springY), new THREE.Vector2(-radius, springY)];
  for (let i = 0; i <= 16; i++) { const a = Math.PI - Math.PI * i / 16; points.push(new THREE.Vector2(Math.cos(a) * radius, springY + Math.sin(a) * radius)); }
  points.push(new THREE.Vector2(halfWidth, springY), new THREE.Vector2(halfWidth, topY), new THREE.Vector2(-halfWidth, topY));
  return extrudeShape(new THREE.Shape(points), depth);
}
function archedPanel(width, y0, y1, radius, springY, depth) {
  const half = width * .5, shape = new THREE.Shape(); shape.moveTo(-half, y0); shape.lineTo(half, y0); shape.lineTo(half, y1); shape.lineTo(-half, y1); shape.closePath();
  // ExtrudeGeometry expects the hole to wind opposite to the outer rectangle.  Keeping this
  // clockwise is what makes the recessed timber glazing genuinely visible through the stone.
  const hole = new THREE.Path(); hole.moveTo(-radius, y0 - .02); hole.lineTo(-radius, springY);
  for (let i = 1; i <= 16; i++) { const a = Math.PI - Math.PI * i / 16; hole.lineTo(Math.cos(a) * radius, springY + Math.sin(a) * radius); }
  hole.lineTo(radius, y0 - .02); hole.lineTo(-radius, y0 - .02); shape.holes.push(hole); return extrudeShape(shape, depth);
}
function archFill(radius, springY, bottomY) {
  const shape = new THREE.Shape(); shape.moveTo(-radius, bottomY); shape.lineTo(radius, bottomY); shape.lineTo(radius, springY);
  for (let i = 1; i <= 16; i++) { const a = Math.PI * i / 16; shape.lineTo(Math.cos(a) * radius, springY + Math.sin(a) * radius); }
  shape.closePath(); return new THREE.ShapeGeometry(shape);
}
function baluster(parts, x, bottomY, z, height = .86, radius = .12) {
  const profile = [[.72, 0], [1, .06], [1, .13], [.58, .2], [.52, .32], [.9, .48], [1, .61], [.72, .76], [.62, .9], [.95, .96], [.95, 1]];
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r * radius, y * height)), 8); g.translate(x, bottomY, z); parts.push(g);
}

function addWindow(facade, u, ground, parts, bayIndex) {
  const radius = ground ? 1.12 : 1.02, springY = ground ? 3.55 : 11.75, bottom = ground ? CFA_PLAZA_TOP + .12 : 6.35;
  const wallOffset = -3.0, glassOffset = wallOffset + .30;
  placeFacade(hash(bayIndex, ground ? 3 : 7, u) < .13 ? parts.glassLit : parts.glass, archFill(radius, springY, bottom), facade, u, 0, glassOffset);
  // Identical timber openings, deep reveals, mullions and a fanlight follow the AMO appraisal.
  for (const side of [-1, 1]) facadeBox(parts.wood, facade, u + side * radius, (bottom + springY) * .5, wallOffset + .37, .09, springY - bottom, .11);
  facadeBox(parts.wood, facade, u, bottom + .05, wallOffset + .37, radius * 2, .1, .11);
  facadeBox(parts.wood, facade, u, springY, wallOffset + .37, radius * 2, .09, .11);
  for (const dx of [-.36, .36]) facadeBox(parts.wood, facade, u + dx * radius * 2, (bottom + springY) * .5, wallOffset + .39, .055, springY - bottom, .075);
  for (let y = bottom + 1.15; y < springY; y += 1.15) facadeBox(parts.wood, facade, u, y, wallOffset + .39, radius * 2, .055, .075);
  for (const a of [Math.PI * .25, Math.PI * .5, Math.PI * .75]) {
    const p0 = cfaFacadePoint(facade, u, springY, wallOffset + .40), p1 = cfaFacadePoint(facade, u + Math.cos(a) * radius, springY + Math.sin(a) * radius, wallOffset + .40);
    beam(parts.wood, p0, p1, .045);
  }
  const arch = archWedge(radius, radius + .075, springY, 0, Math.PI, .09); placeFacade(parts.wood, arch, facade, u, 0, wallOffset + .38);
  if (ground && Math.abs(u) < .01) {
    facadeBox(parts.bronze, facade, u - .13, 1.55, wallOffset + .46, .045, .34, .06); facadeBox(parts.bronze, facade, u + .13, 1.55, wallOffset + .46, .045, .34, .06);
  }
}

function createColonnades(materials) {
  const group = new THREE.Group(); group.name = 'CourtOfFinalAppealFourSideDoubleHeightColonnades';
  const parts = { stone: [], light: [], dark: [], joint: [], wood: [], glass: [], glassLit: [], bronze: [] };
  const colliders = [], columns = new Map(); let balusterCount = 0, dentilCount = 0, voussoirCount = 0;
  for (const facade of CFA_FACADES) {
    const bayWidth = facade.length / facade.bays;
    // Continuous giant-order entablature: architrave, frieze, dentil bed, cornice and parapet base.
    for (const [y, h, offset, depth, material] of [
      [14.62, .48, .16, 1.1, 'stone'], [15.18, .62, .22, 1.0, 'light'], [15.61, .18, .35, 1.25, 'stone'],
      [16.13, .34, .52, 1.55, 'light'], [16.46, .24, .66, 1.75, 'light'], [16.83, .48, .15, .85, 'stone']
    ]) facadeBox(parts[material], facade, 0, y, offset, facade.length + .35, h, depth);
    for (let d = -facade.length * .5 + .25; d < facade.length * .5; d += .52) { facadeBox(parts.light, facade, d, 15.86, .68, .25, .28, .42); dentilCount++; }
    for (let bay = 0; bay < facade.bays; bay++) {
      const u = -facade.length * .5 + bayWidth * (bay + .5), innerR = 1.9, outerR = 2.28, springY = 2.95;
      placeFacade(parts.stone, archSpandrel(bayWidth * .5 + .02, outerR, springY, CFA_BALCONY_Y, .58), facade, u);
      for (let stone = 0; stone < 13; stone++) {
        const a0 = stone * Math.PI / 13 + .004, a1 = (stone + 1) * Math.PI / 13 - .004;
        const key = stone === 6, wedge = archWedge(innerR, key ? outerR + .13 : outerR, springY, a0, a1, key ? .78 : .65);
        placeFacade(parts[key ? 'light' : 'stone'], wedge, facade, u, 0, .04); voussoirCount++;
      }
      // Two genuine recessed arched wall openings per bay; the outer arcade itself remains open.
      const innerRadius = 1.12;
      placeFacade(parts.stone, archedPanel(bayWidth + .025, CFA_PLAZA_TOP, CFA_BALCONY_Y, innerRadius, 3.55, .48), facade, u, 0, -3);
      placeFacade(parts.stone, archedPanel(bayWidth + .025, CFA_BALCONY_Y, 14.45, 1.02, 11.75, .48), facade, u, 0, -3);
      addWindow(facade, u, true, parts, bay); addWindow(facade, u, false, parts, bay);
      for (const y of [1.02, 1.92, 2.82, 6.95, 7.85, 8.75, 9.65, 10.55, 12.75, 13.65]) {
        const r = y < 5 ? 1.12 : 1.02, sideWidth = (bayWidth - r * 2) * .5;
        for (const side of [-1, 1]) facadeBox(parts.joint, facade, u + side * (r + sideWidth * .5), y, -2.752, sideWidth, .018, .018);
      }
      colliders.push(cfaFacadeCollider(facade, u, -3, bayWidth + .02, .52, CFA_PLAZA_TOP, 14.5));
      // First-floor vase balustrade between the giant columns.
      facadeBox(parts.light, facade, u, 5.91, .03, bayWidth - 1.2, .18, .62);
      facadeBox(parts.light, facade, u, 6.91, .03, bayWidth - 1.15, .18, .68);
      for (let b = 0; b < 7; b++) {
        const bu = u + (b - 3) * (bayWidth - 1.65) / 6, p = cfaFacadePoint(facade, bu, 0, .03);
        baluster(parts.light, p[0], 6.0, p[2], .82, .12); balusterCount++;
      }
      // The roof balustrade is continuous except where the west pediment replaces it.
      if (!(facade.id === 'west' && Math.abs(u) < CFA_PEDIMENT_WIDTH * .5)) {
        facadeBox(parts.stone, facade, u, 17.08, .02, bayWidth - 1.1, .16, .62);
        facadeBox(parts.light, facade, u, 17.98, .02, bayWidth - 1.05, .18, .68);
        for (let b = 0; b < 5; b++) {
          const bu = u + (b - 2) * (bayWidth - 1.55) / 4, p = cfaFacadePoint(facade, bu, 0, .02);
          baluster(parts.light, p[0], 17.16, p[2], .74, .115); balusterCount++;
        }
      }
    }
    for (let i = 0; i <= facade.bays; i++) {
      const u = -facade.length * .5 + facade.length * i / facade.bays, p = cfaFacadePoint(facade, u, 0, 0), key = `${p[0].toFixed(2)},${p[2].toFixed(2)}`;
      // Paired Ionic volutes are present on every face, including both faces of corner piers.
      for (const side of [-1, 1]) {
        const scroll = new THREE.TorusGeometry(.24, .065, 6, 18, Math.PI * 1.72); scroll.rotateZ(side < 0 ? .2 : Math.PI - .2);
        placeFacade(parts.light, scroll, facade, u + side * .39, 14.08, .69);
      }
      for (let egg = -2; egg <= 2; egg++) sphere(parts.light, cfaFacadePoint(facade, u + egg * .17, 13.78, .67), [.075, .11, .07], 8);
      if (columns.has(key)) continue;
      columns.set(key, true);
      const corner = Math.abs(Math.abs(p[0]) - CFA_SITE.w * .5) < .2 && Math.abs(Math.abs(p[2]) - CFA_SITE.d * .5) < .2;
      if (corner) {
        box(parts.stone, [p[0], 7.42, p[2]], [1.28, 13.45, 1.28]);
        for (let y = 1.25; y < 13.7; y += 1.18) box(parts.joint, [p[0], y, p[2]], [1.295, .02, 1.295]);
      } else {
        cylinder(parts.stone, [p[0], 7.35, p[2]], .68, 12.95, 24, .54);
        for (let y = 1.22; y < 13.55; y += 1.18) cylinder(parts.joint, [p[0], y, p[2]], .685 - y * .008, .018, 24);
      }
      box(parts.light, [p[0], CFA_PLAZA_TOP + .11, p[2]], [1.65, .22, 1.65]);
      cylinder(parts.light, [p[0], .53, p[2]], .88, .16, 24); cylinder(parts.light, [p[0], .68, p[2]], .78, .14, 24);
      cylinder(parts.light, [p[0], 13.68, p[2]], .65, .16, 24); box(parts.light, [p[0], 14.34, p[2]], [1.5, .22, 1.5]);
      facadeBox(parts.light, facade, u, 17.35, 0, 1.35, 1.25, 1.15);
      colliders.push(cfaLocalCollider(p[0], p[2], corner ? 1.4 : 1.35, corner ? 1.4 : 1.35, 0, 14.5));
    }
  }
  const floor = new THREE.Mesh(shapeFloor(CFA_LOCAL_RING, CFA_PLAZA_TOP), materials.paving); floor.name = 'CourtOfFinalAppealGraniteColonnadeFloor'; floor.receiveShadow = true; group.add(floor);
  const balcony = new THREE.Mesh(shapeFloor(CFA_LOCAL_RING, CFA_BALCONY_Y), materials.stone); balcony.name = 'CourtOfFinalAppealContinuousFirstFloorVerandah'; balcony.castShadow = true; balcony.receiveShadow = true; group.add(balcony);
  merged(group, parts.stone, materials.stone, 'CourtOfFinalAppealRusticatedArchesGiantShaftsAndGraniteWalls');
  merged(group, parts.light, materials.lightStone, 'CourtOfFinalAppealIonicVolutesBalustradesCornicesAndKeystones');
  merged(group, parts.dark, materials.darkStone, 'CourtOfFinalAppealRecessedGranite'); merged(group, parts.joint, materials.joint, 'CourtOfFinalAppealGraniteCourseJoints', false);
  merged(group, parts.wood, materials.wood, 'CourtOfFinalAppealIdenticalTimberWindowsDoorsAndFanlights');
  merged(group, parts.glass, materials.glass, 'CourtOfFinalAppealRecessedDarkWindowGlass', false); merged(group, parts.glassLit, materials.glassLit, 'CourtOfFinalAppealSparseWarmOccupiedWindows', false);
  merged(group, parts.bronze, materials.bronze, 'CourtOfFinalAppealBronzeDoorFurniture');
  return { group, colliders, balusterCount, dentilCount, voussoirCount };
}

function inscriptionPlane(text, width, height, fontSize = 116) {
  const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 256; const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 2048, 256); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `600 ${fontSize}px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = 'rgba(224,218,204,.75)'; ctx.fillText(text, 1026, 130); ctx.fillStyle = '#69645b'; ctx.fillText(text, 1024, 126);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, transparent: true, depthWrite: false, roughness: .95, side: THREE.DoubleSide }));
  mesh.renderOrder = 8; return mesh;
}
function royalShieldDetailPlane(z) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512; const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 512); ctx.strokeStyle = '#625c52'; ctx.fillStyle = '#625c52'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(256, 28); ctx.lineTo(256, 424); ctx.moveTo(42, 226); ctx.lineTo(470, 226); ctx.stroke();
  function lion(x, y, scale, rampant = false) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.beginPath(); ctx.ellipse(0, 0, 34, 14, rampant ? -.65 : 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(rampant ? 22 : 30, rampant ? -24 : -10, 10, 0, Math.PI * 2); ctx.stroke();
    for (const dx of [-20, 14]) { ctx.beginPath(); ctx.moveTo(dx, 8); ctx.lineTo(dx - 8, 30); ctx.moveTo(dx + 8, 7); ctx.lineTo(dx + 15, 27); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-30, -4); ctx.bezierCurveTo(-62, -30, -55, 28, -30, 16); ctx.stroke(); ctx.restore();
  }
  for (const [x, y] of [[132, 92], [132, 158], [375, 282], [375, 348], [375, 410]]) lion(x, y, .62);
  lion(374, 126, 1.05, true);
  // Irish harp in the fourth quarter, with individually drawn strings.
  ctx.beginPath(); ctx.moveTo(94, 278); ctx.quadraticCurveTo(72, 382, 126, 432); ctx.quadraticCurveTo(188, 386, 168, 300); ctx.moveTo(94, 278); ctx.lineTo(168, 300); ctx.moveTo(126, 432); ctx.lineTo(176, 432); ctx.stroke();
  ctx.lineWidth = 3; for (let x = 108; x <= 158; x += 10) { ctx.beginPath(); ctx.moveTo(x, 296); ctx.lineTo(126 + (x - 108) * .55, 418); ctx.stroke(); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.78, 1.82), new THREE.MeshStandardMaterial({ map: texture, transparent: true, depthWrite: false, roughness: .95, side: THREE.DoubleSide }));
  mesh.name = 'CourtOfFinalAppealRoyalShieldLionsScottishLionAndIrishHarp'; mesh.rotateY(Math.PI); mesh.position.set(0, 21.45, z - .14); mesh.renderOrder = 9; return mesh;
}
function transformFigure(parts, target, center, scale = 1) { for (const g of parts) { g.scale(scale, scale, scale); g.translate(...center); target.push(g); } }
function classicalFigure(scale = 1, justice = false) {
  const parts = [], profile = [[.38, 0], [.4, .08], [.31, .35], [.23, .9], [.18, 1.35], [.27, 1.65], [.24, 1.78], [.12, 1.86]];
  const robe = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 12); parts.push(robe);
  sphere(parts, [0, 2.08, 0], [.2, .25, .19]); sphere(parts, [0, 2.19, .035], [.21, .15, .19]);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI * 2 / 8; beam(parts, [Math.cos(a) * .32, .08, Math.sin(a) * .32], [Math.cos(a) * .14, 1.5, Math.sin(a) * .14], .035); }
  beam(parts, [-.2, 1.7, 0], [-.48, 1.15, -.06], .13); beam(parts, [.2, 1.7, 0], [.55, 1.78, -.04], .13);
  if (justice) {
    box(parts, [0, 2.1, -.185], [.43, .085, .045]); // blindfold
    beam(parts, [-.48, 1.25, -.06], [-.48, .2, -.06], .055); box(parts, [-.48, 1.28, -.06], [.38, .055, .07]);
    beam(parts, [.55, 1.82, -.04], [.55, 2.35, -.04], .035); beam(parts, [.08, 2.29, -.04], [1.02, 2.29, -.04], .035);
    for (const x of [.14, .96]) {
      beam(parts, [x, 2.29, -.04], [x - .13, 1.75, -.04], .018); beam(parts, [x, 2.29, -.04], [x + .13, 1.75, -.04], .018);
      cylinder(parts, [x, 1.72, -.04], .2, .045, 16);
    }
  }
  for (const g of parts) g.scale(scale, scale, scale); return parts;
}
function addRoyalArms(parts, darkParts, z) {
  // Monochrome carved Royal Arms.  The complete assembly is compressed into the tympanum above
  // the lunette; the crown never pierces the pediment rake.
  const coat = [], incised = [], shield = new THREE.Shape();
  shield.moveTo(-1.05, 1.0); shield.lineTo(1.05, 1.0); shield.lineTo(.92, -.35); shield.quadraticCurveTo(.55, -1.1, 0, -1.35); shield.quadraticCurveTo(-.55, -1.1, -.92, -.35); shield.closePath();
  const sg = extrudeShape(shield, .18); sg.translate(0, 20.55, z); coat.push(sg);
  box(coat, [0, 21.83, z], [1.45, .24, .28]); for (const x of [-.58, -.29, 0, .29, .58]) beam(coat, [x, 21.93, z], [x * .55, 22.48, z], .09);
  sphere(coat, [0, 22.52, z], [.13, .13, .13]); box(coat, [0, 22.77, z], [.07, .42, .08]); box(coat, [0, 22.83, z], [.34, .07, .08]);
  beam(incised, [0, 19.3, z - .11], [0, 21.55, z - .11], .026); beam(incised, [-1, 20.55, z - .11], [1, 20.55, z - .11], .026);
  for (const side of [-1, 1]) {
    const x = side * 2.05;
    sphere(coat, [x, 20.48, z], [.34, .73, .24]); sphere(coat, [x - side * .12, 21.25, z - .02], [.29, .3, .25]);
    sphere(coat, [x - side * .28, 21.18, z - .21], [.24, .13, .16]);
    for (const dx of [-.23, .23]) {
      beam(coat, [x + dx, 20.25, z], [x + dx * 1.65, 19.35, z - .05], .12);
      beam(coat, [x + dx, 20.75, z], [x - side * .55, 20.15 + dx, z - .12], .11);
    }
    beam(coat, [x + side * .28, 20.1, z + .08], [x + side * .85, 20.75, z + .1], .075);
    if (side < 0) { const mane = new THREE.TorusGeometry(.35, .1, 6, 16); mane.translate(x, 21.24, z + .03); coat.push(mane); }
    else { const horn = new THREE.ConeGeometry(.075, .62, 8); horn.rotateZ(-.35); horn.translate(x - .18, 21.78, z); coat.push(horn); }
  }
  for (const g of coat) { g.scale(.85, .75, 1); g.translate(0, 6.0375, 0); parts.push(g); }
  for (const g of incised) { g.scale(.85, .75, 1); g.translate(0, 6.0375, 0); darkParts.push(g); }
  // Truth and Mercy remain seated at either side of the arms rather than floating on the lunette.
  for (const side of [-1, 1]) transformFigure(classicalFigure(.72, false), parts, [side * 4.25, 18.25, z + .06]);
  box(parts, [0, 20.08, z - .03], [2.7, .18, .2]); box(parts, [0, 19.91, z - .03], [2.25, .12, .17]);
}
function createPediment(materials) {
  const group = new THREE.Group(); group.name = 'CourtOfFinalAppealWestPedimentRoyalArmsAndThemis';
  const facade = CFA_FACADES[0], parts = [], light = [], dark = [], glass = [], wood = [], frontOffset = .92;
  const triangle = new THREE.Shape(); triangle.moveTo(-CFA_PEDIMENT_WIDTH * .5, 16.85); triangle.lineTo(CFA_PEDIMENT_WIDTH * .5, 16.85); triangle.lineTo(0, CFA_PEDIMENT_APEX_Y); triangle.closePath();
  placeFacade(parts, extrudeShape(triangle, 1.05), facade, 0, 0, .48);
  const inset = new THREE.Shape(); inset.moveTo(-10.7, 17.45); inset.lineTo(10.7, 17.45); inset.lineTo(0, 22.85); inset.closePath();
  placeFacade(dark, new THREE.ShapeGeometry(inset), facade, 0, 0, 1.02);
  for (const side of [-1, 1]) beam(light, cfaFacadePoint(facade, 0, CFA_PEDIMENT_APEX_Y + .08, frontOffset), cfaFacadePoint(facade, side * 12.35, 16.83, frontOffset), .38, .52);
  facadeBox(light, facade, 0, 16.88, frontOffset, 24.8, .34, .72); facadeBox(light, facade, 0, 17.16, frontOffset, 24.1, .18, .58);
  // Lunette below the Royal Arms, with a stone arch and timber fanlight.
  placeFacade(glass, archFill(1.65, 18.15, 17.2), facade, 0, 0, 1.08);
  placeFacade(light, archWedge(1.65, 1.88, 18.15, 0, Math.PI, .2), facade, 0, 0, 1.14);
  for (const x of [-1.65, 0, 1.65]) facadeBox(wood, facade, x, 17.68, 1.16, .07, .96, .08);
  for (const a of [Math.PI * .25, Math.PI * .5, Math.PI * .75]) beam(wood, cfaFacadePoint(facade, 0, 18.15, 1.17), cfaFacadePoint(facade, Math.cos(a) * 1.65, 18.15 + Math.sin(a) * 1.65, 1.17), .055);
  const armsZ = -CFA_SITE.d * .5 - 1.18; addRoyalArms(light, dark, armsZ); group.add(royalShieldDetailPlane(armsZ));
  const motto = inscriptionPlane('DIEU ET MON DROIT', 2.4, .26, 82); motto.name = 'CourtOfFinalAppealRoyalMottoDieuEtMonDroit'; motto.rotateY(facade.ry); motto.position.set(0, 20.03, armsZ - .16); group.add(motto);
  const inscription = inscriptionPlane('ERECTED · A · D · MDCCCCX', 20.8, .65, 112); inscription.name = 'CourtOfFinalAppealErectedAdMdccccxCarvedInscription';
  inscription.rotateY(facade.ry); inscription.position.set(...cfaFacadePoint(facade, 0, 15.18, .76)); group.add(inscription);
  for (const [u, letter] of [[-8.3, 'E'], [8.3, 'R']]) { const mesh = inscriptionPlane(letter, 8.0, 1.0, 190); mesh.name = `CourtOfFinalAppealRoyalCypher${letter}`; mesh.rotateY(facade.ry); mesh.position.set(...cfaFacadePoint(facade, u, 18.35, 1.17)); group.add(mesh); }
  // The blindfolded 2.7 m Themis stands on a separate pedestal, holding scales and a lowered sword.
  const statueZ = -CFA_SITE.d * .5 - .62;
  box(light, [0, 23.68, statueZ], [1.65, .36, 1.4]); box(light, [0, 24.02, statueZ], [1.25, .32, 1.1]);
  const themisScale = CFA_PUBLISHED_THEMIS_HEIGHT / 2.35;
  transformFigure(classicalFigure(themisScale, true), light, [0, 24.18, statueZ]);
  box(dark, [0, 24.18 + 2.1 * themisScale, statueZ - .215 * themisScale], [.43 * themisScale, .085 * themisScale, .045 * themisScale]);
  merged(group, parts, materials.stone, 'CourtOfFinalAppealSolidGranitePediment'); merged(group, light, materials.lightStone, 'CourtOfFinalAppealRoyalCoatOfArmsTruthMercyAndBlindfoldedThemis');
  merged(group, dark, materials.darkStone, 'CourtOfFinalAppealRecessedTympanumAndShieldQuarters'); merged(group, glass, materials.glass, 'CourtOfFinalAppealPedimentSemicircularLunette', false);
  merged(group, wood, materials.wood, 'CourtOfFinalAppealLunetteTimberFanlight');
  return { group, royalArms: 1, themis: 1, inscription: 'ERECTED AD MDCCCCX' };
}

function hipRoof(parts, rolls, cx) {
  const hx = 11.25, hz = 15.25, rh = 6.0, y = 18.05, top = 22.85;
  const A = [cx - hx, y, -hz], B = [cx + hx, y, -hz], C = [cx + hx, y, hz], D = [cx - hx, y, hz], R1 = [cx, top, -rh], R2 = [cx, top, rh];
  parts.push(trianglesGeometry([[A, R1, B], [B, R1, R2], [B, R2, C], [C, R2, D], [D, R2, R1], [D, R1, A]]));
  for (const side of [-1, 1]) {
    for (let z = -rh; z <= rh + .01; z += .55) beam(rolls, [cx, top + .025, z], [cx + side * hx, y + .035, z], .065);
    for (let x = -hx; x <= hx + .01; x += .58) beam(rolls, [cx, top + .025, side * rh], [cx + x, y + .035, side * hz], .06);
    for (const t of [.2, .4, .6, .8]) {
      beam(rolls, [cx + side * hx * t, top + (y - top) * t + .04, -rh], [cx + side * hx * t, top + (y - top) * t + .04, rh], .035);
      beam(rolls, [cx - hx * t, top + (y - top) * t + .04, side * (rh + (hz - rh) * t)], [cx + hx * t, top + (y - top) * t + .04, side * (rh + (hz - rh) * t)], .035);
    }
  }
}
function createRoofs(materials) {
  const group = new THREE.Group(); group.name = 'CourtOfFinalAppealChinesePanAndRollTileHipRoofs'; const roofs = [], rolls = [], gable = [], gableRolls = [], stone = [], wood = [];
  hipRoof(roofs, rolls, -23.45); hipRoof(roofs, rolls, 23.45);
  for (const cx of [-23.45, 23.45]) {
    box(stone, [cx, 23.35, 3.8], [1.0, 1.65, 1.0]); box(stone, [cx, 24.22, 3.8], [1.35, .18, 1.35]);
    for (const side of [-1, 1]) for (let x = -9; x <= 9; x += 2.1) box(wood, [cx + x, 17.78, side * 14.6], [.28, .55, .85]);
  }
  // The granolithic gabled roof immediately behind the west pediment is distinct from the two dark tile wings.
  const y = 18.0, top = 22.8, z0 = -18.4, z1 = -7.0;
  gable.push(trianglesGeometry([[[-11.8, y, z0], [0, top, z0], [0, top, z1]], [[-11.8, y, z0], [0, top, z1], [-11.8, y, z1]],
    [[0, top, z0], [11.8, y, z0], [11.8, y, z1]], [[0, top, z0], [11.8, y, z1], [0, top, z1]]]));
  for (let z = z0; z <= z1; z += .55) for (const side of [-1, 1]) beam(gableRolls, [0, top + .03, z], [side * 11.8, y + .03, z], .055);
  merged(group, roofs, materials.roof, 'CourtOfFinalAppealTwoChinesePanAndRollTileHipRoofs'); merged(group, rolls, materials.roofRoll, 'CourtOfFinalAppealRaisedChineseTileCourses');
  merged(group, gable, materials.granolithicRoof, 'CourtOfFinalAppealGranolithicGableBehindPediment'); merged(group, gableRolls, materials.granolithicRoofRoll, 'CourtOfFinalAppealGranolithicGableRollSlabs');
  merged(group, stone, materials.stone, 'CourtOfFinalAppealTwoGraniteRoofChimneys'); merged(group, wood, materials.wood, 'CourtOfFinalAppealCarvedTeakEaveBrackets');
  return { group, roofs: CFA_CHINESE_TILE_ROOFS, chimneys: 2 };
}

function createDome(materials) {
  const group = new THREE.Group(); group.name = 'CourtOfFinalAppealSquareBaseOpenDrumRibbedDomeLanternAndTudorCrown';
  const stone = [], light = [], dark = [], wood = [], glass = [], shell = [], ribs = [], bronze = [];
  const base = new THREE.CylinderGeometry(20 / Math.SQRT2, 22 / Math.SQRT2, 4, 4, 1, false); base.rotateY(Math.PI / 4); base.translate(0, 20, 0); dark.push(base);
  box(light, [0, 18.12, 0], [22.2, .3, 22.2]); box(light, [0, 22.02, 0], [20.6, .28, 20.6]);
  for (const x of [-10.15, 10.15]) for (const z of [-10.15, 10.15]) {
    box(stone, [x, 22.45, z], [1.65, .85, 1.65]); box(light, [x, 22.94, z], [1.9, .18, 1.9]);
    for (const dx of [-.52, .52]) for (const dz of [-.52, .52]) cylinder(light, [x + dx, 24.05, z + dz], .13, 2.0, 10);
    box(dark, [x, 24.0, z], [.75, 1.5, .75]); box(light, [x, 25.12, z], [1.75, .22, 1.75]);
    const cap = new THREE.SphereGeometry(.9, 16, 8, 0, Math.PI * 2, 0, Math.PI * .5); cap.scale(1, .65, 1); cap.translate(x, 25.23, z); light.push(cap);
    cylinder(light, [x, 26.08, z], .09, .55, 10); sphere(light, [x, 26.39, z], [.16, .16, .16], 8);
  }
  const radius = 8.15, bays = CFA_DRUM_COLUMNS, panelWidth = 2 * radius * Math.tan(Math.PI / bays) + .08;
  for (let i = 0; i < bays; i++) {
    const theta = i * Math.PI * 2 / bays;
    placeRadial(stone, archedPanel(panelWidth, 22.25, 28.25, .63, 26.15, .38), theta, radius);
    placeRadial(i % 5 === 0 ? glass : wood, archFill(.63, 26.15, 22.7), theta, radius + .22);
    const x = Math.sin(theta) * 8.72, z = Math.cos(theta) * 8.72;
    cylinder(light, [x, 25.15, z], .21, 5.35, 12); cylinder(light, [x, 22.45, z], .31, .18, 12); box(light, [x, 27.93, z], [.62, .22, .62], theta);
    for (const dx of [-.22, .22]) {
      const u = Math.cos(theta) * dx, v = -Math.sin(theta) * dx;
      beam(wood, [Math.sin(theta) * (radius + .30) + u, 22.8, Math.cos(theta) * (radius + .30) + v], [Math.sin(theta) * (radius + .30) + u, 26.1, Math.cos(theta) * (radius + .30) + v], .045);
    }
  }
  for (const [y, r, h] of [[22.25, 8.8, .28], [28.35, 9.15, .3], [28.7, 9.35, .24], [29.0, 9.42, .22]]) cylinder(light, [0, y, 0], r, h, 64);
  const domeRadius = 9.25, rise = CFA_DOME_TOP_Y - CFA_DRUM_TOP_Y;
  const dome = new THREE.SphereGeometry(domeRadius, 64, 24, 0, Math.PI * 2, 0, Math.PI * .5); dome.scale(1, rise / domeRadius, 1); dome.translate(0, CFA_DRUM_TOP_Y, 0); shell.push(dome);
  for (let i = 0; i < CFA_DOME_RIBS; i++) {
    const phi = i * Math.PI * 2 / CFA_DOME_RIBS, points = [];
    for (let j = 0; j <= 24; j++) { const theta = .08 + (Math.PI * .5 - .08) * j / 24, r = domeRadius + .045; points.push(new THREE.Vector3(Math.cos(phi) * r * Math.sin(theta), CFA_DRUM_TOP_Y + (rise + .03) * Math.cos(theta), Math.sin(phi) * r * Math.sin(theta))); }
    ribs.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, .052, 5, false));
  }
  for (let j = 1; j <= 11; j++) {
    const theta = Math.PI * .5 * j / 12, ring = new THREE.TorusGeometry(domeRadius * Math.sin(theta), .038, 4, 64);
    ring.rotateX(Math.PI / 2); ring.translate(0, CFA_DRUM_TOP_Y + rise * Math.cos(theta), 0); ribs.push(ring);
  }
  // Open granite lantern with dark louvres, a small dome and the bronze Edwardian Tudor Crown.
  cylinder(light, [0, 36.22, 0], 1.4, .22, 16); cylinder(dark, [0, 37.18, 0], .78, 1.65, 16);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, x = Math.sin(a) * 1.0, z = Math.cos(a) * 1.0;
    cylinder(light, [x, 37.18, z], .12, 1.7, 10);
    for (let y = 36.65; y < 37.85; y += .24) box(wood, [Math.sin(a + Math.PI / 8) * .93, y, Math.cos(a + Math.PI / 8) * .93], [.45, .055, .08], a + Math.PI / 8);
  }
  cylinder(light, [0, 38.12, 0], 1.28, .22, 16);
  const cap = new THREE.SphereGeometry(1.22, 24, 10, 0, Math.PI * 2, 0, Math.PI * .5); cap.scale(1, .65, 1); cap.translate(0, 38.22, 0); light.push(cap);
  cylinder(bronze, [0, 39.04, 0], .48, .22, 16);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2, points = []; for (let j = 0; j <= 10; j++) { const t = j / 10, r = .48 * (1 - t); points.push(new THREE.Vector3(Math.cos(a) * r, 39.12 + .58 * t, Math.sin(a) * r)); }
    bronze.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 10, .045, 5, false));
  }
  sphere(bronze, [0, 39.72, 0], [.12, .12, .12], 8); box(bronze, [0, 39.86, 0], [.07, .28, .07]); box(bronze, [0, 39.84, 0], [.42, .065, .07]);
  merged(group, stone, materials.stone, 'CourtOfFinalAppealGraniteSquareDomeBaseAndArchedDrumWalls'); merged(group, light, materials.lightStone, 'CourtOfFinalAppealFourPinnaclesDoricDrumColonnadeAndLantern');
  merged(group, dark, materials.darkStone, 'CourtOfFinalAppealLanternRecesses'); merged(group, glass, materials.glassLit, 'CourtOfFinalAppealDrumOccasionalWarmWindows', false);
  merged(group, wood, materials.wood, 'CourtOfFinalAppealDrumTimberWindowsAndLanternLouvres'); merged(group, shell, materials.dome, 'CourtOfFinalAppealGranolithicDoubleShellDome');
  merged(group, ribs, materials.domeRib, 'CourtOfFinalAppealTwentyFourRadialDomeRibsAndHorizontalCourses'); merged(group, bronze, materials.bronze, 'CourtOfFinalAppealBronzeTudorCrownAt Forty Metres');
  const colliders = [cfaLocalCollider(0, 0, 22, 22, 18, 22), cfaLocalCollider(0, 0, 18.5, 18.5, 22, CFA_DOME_TOP_Y)];
  return { group, colliders, drumColumns: CFA_DRUM_COLUMNS, ribs: CFA_DOME_RIBS, pinnacles: 4, crownTop: CFA_HEIGHT };
}

function createEntrance(materials) {
  const group = new THREE.Group(); group.name = 'CourtOfFinalAppealStatueSquareEntranceAndGraniteSteps'; const facade = CFA_FACADES[0], stone = [], bronze = [], light = [];
  for (let step = 0; step < 3; step++) {
    const top = .18 + step * .08, bottom = step === 0 ? -.32 : .06;
    // The lowest tread continues below the sloping exterior DTM so the stair never floats;
    // the visible three tops and their plan dimensions remain unchanged.
    facadeBox(stone, facade, 0, (top + bottom) * .5, 1.55 - step * .42, 11.2 - step * .3, top - bottom, 1.65 - step * .25);
  }
  const plaque = inscriptionPlane('8  JACKSON ROAD', 4.3, .42, 105); plaque.name = 'CourtOfFinalAppealJacksonRoadEntrancePlaque'; plaque.rotateY(facade.ry); plaque.position.set(...cfaFacadePoint(facade, 0, 3.0, -2.68)); group.add(plaque);
  for (const u of [-4.5, 4.5]) {
    facadeBox(bronze, facade, u, 1.05, -2.35, .08, 1.5, .08); facadeBox(light, facade, u, 1.84, -2.35, .32, .42, .28);
  }
  merged(group, stone, materials.stone, 'CourtOfFinalAppealShallowWestEntranceSteps'); merged(group, bronze, materials.bronze, 'CourtOfFinalAppealEntranceLampBrackets'); merged(group, light, materials.warmLight, 'CourtOfFinalAppealWarmEntranceLanterns', false);
  return { group, mainEntrance: CFA_MAIN_ENTRANCE };
}

export function buildCourtOfFinalAppeal(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'CourtOfFinalAppeal'; group.userData.landmark = 'court-of-final-appeal'; group.userData.osm = { type: 'way', id: CFA_OSM_SOURCE.id };
  group.position.set(CFA_SITE.x, groundOffset, CFA_SITE.z); group.rotation.y = CFA_SITE.ry; root.add(group);
  const stone = new THREE.MeshStandardNodeMaterial({ color: 0xb5ad9e, roughness: .84, metalness: .015 }); stone.emissiveNode = color(0xffd4a3).mul(nightAmount()).mul(floodlightFalloff().mul(.13).add(.075));
  const lightStone = new THREE.MeshStandardNodeMaterial({ color: 0xc8c0b0, roughness: .8, metalness: .01 }); lightStone.emissiveNode = color(0xffd7a8).mul(nightAmount()).mul(floodlightFalloff().mul(.15).add(.09));
  const darkStone = new THREE.MeshStandardNodeMaterial({ color: 0x8f887c, roughness: .9 }); darkStone.emissiveNode = color(0xffcc96).mul(nightAmount()).mul(floodlightFalloff().mul(.07).add(.045));
  const joint = new THREE.MeshStandardMaterial({ color: 0x756f65, roughness: .96 });
  const paving = new THREE.MeshStandardMaterial({ color: 0x99958c, roughness: .9, side: THREE.DoubleSide });
  const wood = new THREE.MeshStandardMaterial({ color: 0x3d251c, roughness: .72 });
  const glass = new THREE.MeshStandardNodeMaterial({ color: 0x172120, roughness: .26, metalness: .18, side: THREE.DoubleSide }); glass.emissiveNode = color(0xffc684).mul(nightAmount()).mul(.012);
  const glassLit = new THREE.MeshStandardNodeMaterial({ color: 0x4c4234, roughness: .32, metalness: .08, side: THREE.DoubleSide }); glassLit.emissiveNode = color(0xffc47e).mul(nightAmount()).mul(.38);
  const bronze = new THREE.MeshStandardNodeMaterial({ color: 0x6b573a, roughness: .38, metalness: .72 }); bronze.emissiveNode = color(0xffcf8a).mul(nightAmount()).mul(.04);
  const roof = new THREE.MeshStandardMaterial({ color: 0x292a2b, roughness: .9, side: THREE.DoubleSide });
  const roofRoll = new THREE.MeshStandardMaterial({ color: 0x403b38, roughness: .88 });
  const granolithicRoof = new THREE.MeshStandardNodeMaterial({ color: 0x494944, roughness: .92, side: THREE.DoubleSide }); granolithicRoof.emissiveNode = color(0xffd0a0).mul(nightAmount()).mul(.025);
  const granolithicRoofRoll = new THREE.MeshStandardMaterial({ color: 0x666159, roughness: .9 });
  const dome = new THREE.MeshStandardNodeMaterial({ color: 0xa39c90, roughness: .83, side: THREE.DoubleSide }); dome.emissiveNode = color(0xffd7aa).mul(nightAmount()).mul(.09);
  const domeRib = new THREE.MeshStandardMaterial({ color: 0x827b71, roughness: .82 });
  const warmLight = new THREE.MeshStandardNodeMaterial({ color: 0xffd7a0 }); warmLight.emissiveNode = color(0xffbd72).mul(nightAmount()).mul(1.6);
  const materials = { stone, lightStone, darkStone, joint, paving, wood, glass, glassLit, bronze, roof, roofRoll, granolithicRoof, granolithicRoofRoll, dome, domeRib, warmLight };
  const colonnades = createColonnades(materials); group.add(colonnades.group);
  const pediment = createPediment(materials); group.add(pediment.group);
  const roofs = createRoofs(materials); group.add(roofs.group);
  const domeAssembly = createDome(materials); group.add(domeAssembly.group);
  const entrance = createEntrance(materials); group.add(entrance.group);
  const colliders = [...colonnades.colliders, ...domeAssembly.colliders]; for (const c of colliders) { c.minY += groundOffset; c.maxY += groundOffset; }
  const grounds = { plaza: groundOffset + CFA_PLAZA_TOP };
  const landmark = { id: 'court-of-final-appeal', name: CFA_SITE.name, position: { x: CFA_SITE.x, y: groundOffset, z: CFA_SITE.z }, radius: 55, height: CFA_HEIGHT };
  const stats = {
    cfaGroundOffset: groundOffset, cfaLandmarks: 1, cfaOsmWay: CFA_OSM_SOURCE.id, cfaRingArea: CFA_RING_AREA,
    cfaPublishedApproxHeight: CFA_PUBLISHED_APPROX_HEIGHT, cfaHeight: CFA_HEIGHT, cfaOfficialStoreys: CFA_OFFICIAL_STOREYS, cfaOsmLevels: CFA_OSM_LEVELS,
    cfaCompletionYear: CFA_COMPLETION_YEAR, cfaArchitects: CFA_ARCHITECTS, cfaThemisHeight: CFA_PUBLISHED_THEMIS_HEIGHT,
    cfaArcadeBays: CFA_ARCADE_BAYS, cfaGiantColumns: CFA_GIANT_COLUMNS, cfaVoussoirs: colonnades.voussoirCount,
    cfaBalusters: colonnades.balusterCount, cfaDentils: colonnades.dentilCount, cfaDrumColumns: domeAssembly.drumColumns,
    cfaDomeRibs: domeAssembly.ribs, cfaDomeBasePinnacles: domeAssembly.pinnacles, cfaChineseTileRoofs: roofs.roofs, cfaRoofChimneys: roofs.chimneys,
    cfaRoyalArms: pediment.royalArms, cfaThemisStatues: pediment.themis, cfaTudorCrownTop: domeAssembly.crownTop,
    cfaGroundRings: CFA_GROUND_RINGS.length, cfaPlazaGround: grounds.plaza, cfaColliders: colliders.length
  };
  group.userData.stats = stats;
  return { group, colliders, landmarks: [landmark], stats, groundOffset, grounds, plazaTop: grounds.plaza, groundHeightAt: (x, z, ground) => cfaGroundHeightAt(x, z, ground, grounds) };
}
