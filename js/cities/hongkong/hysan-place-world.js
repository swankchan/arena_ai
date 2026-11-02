import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  HYSAN_SITE, HYSAN_OSM_SOURCE, HYSAN_LOCAL_RING, HYSAN_RING_AREA,
  HYSAN_OSM_HEIGHT, HYSAN_CTBUH_HEIGHT, HYSAN_HEIGHT, HYSAN_OCCUPIED_HEIGHT,
  HYSAN_OSM_LEVELS, HYSAN_CTBUH_LEVELS, HYSAN_BELOW_GROUND_LEVELS,
  HYSAN_COMPLETION_YEAR, HYSAN_CTBUH_GFA, HYSAN_KPF_GFA, HYSAN_ARCHITECT,
  HYSAN_ASSOCIATE_ARCHITECT, HYSAN_RETAIL_INTERIOR_ARCHITECT, HYSAN_CONTRACTOR,
  HYSAN_STREET_HEIGHT, HYSAN_PANEL_TARGET_WIDTH, HYSAN_PODIUM_BAY_WIDTH,
  HYSAN_GARDEN_OF_EDEN, HYSAN_RETAIL_SKY_GARDEN, HYSAN_OFFICE_SKY_GARDEN,
  HYSAN_LOWER_RETAIL, HYSAN_MIDDLE_RETAIL, HYSAN_UPPER_RETAIL,
  HYSAN_LOWER_OFFICE, HYSAN_UPPER_OFFICE, HYSAN_VOLUMES, HYSAN_VISUAL_COURSES,
  HYSAN_MAIN_ENTRANCE, HYSAN_WEST_ENTRANCE, HYSAN_SOUTH_ENTRANCE,
  HYSAN_PARKING_ENTRANCE, HYSAN_F2_SUBWAY_SOURCE, HYSAN_CROSSING_ROADS,
  HYSAN_ROAD_VEHICLE_CLEARANCE, HYSAN_MAIN_FORECOURT_WIDTH, HYSAN_MAIN_FORECOURT_DEPTH,
  hysanEdgeOutward, hysanRingColliders, hysanSegmentCollider, hysanLocalCollider,
  hysanFrameCollider, hysanPodiumBayConflict, hysanRoadConflictAtLocal, hysanGroundHeightAt
} from './hysan-place-architecture.js';

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
function cylinder(parts, center, radius, height, segments = 16, radiusTop = radius) {
  const g = new THREE.CylinderGeometry(radiusTop, radius, height, segments); g.translate(...center); parts.push(g); return g;
}
function beam(parts, a, b, width = .1, depth = width) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start), length = direction.length();
  if (length < .001) return;
  const g = new THREE.BoxGeometry(width, length, depth);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  g.translate(...start.add(end).multiplyScalar(.5).toArray()); parts.push(g); return g;
}
function point(ring, edge, t, y, offset = 0) {
  const i = edge * 2, { nx, nz } = hysanEdgeOutward(ring, edge);
  return [lerp(ring[i], ring[i + 2], t) + nx * offset, y, lerp(ring[i + 1], ring[i + 3], t) + nz * offset];
}
function edgeBox(parts, ring, edge, t, y, offset, width, height, depth) {
  const p = point(ring, edge, t, y, offset), { ry } = hysanEdgeOutward(ring, edge);
  return box(parts, p, [width, height, depth], ry);
}
function roofGeometry(ring, y) {
  const shape = new THREE.Shape();
  for (let i = 0; i < ring.length - 2; i += 2) { if (i === 0) shape.moveTo(ring[i], -ring[i + 1]); else shape.lineTo(ring[i], -ring[i + 1]); }
  shape.closePath(); const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g;
}
function insideFlat(ring, x, z) {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function createVolume(volume, family) {
  const glass = store(), spandrel = store(), backing = store(), panels = store(), mullions = store(), fins = [];
  const colliders = hysanRingColliders(volume.ring, volume.y0, volume.y1);
  let glassPanels = 0, metalPanels = 0, horizontalFins = 0;
  const office = family === 'office';
  for (let edge = 0; edge < volume.ring.length / 2 - 1; edge++) {
    const length = hysanEdgeOutward(volume.ring, edge).length;
    const bays = Math.max(1, Math.round(length / HYSAN_PANEL_TARGET_WIDTH));
    const p = (t, y, o = .04) => point(volume.ring, edge, t, y, o);
    quad(backing, p(0, volume.y0, -.16), p(1, volume.y0, -.16), p(1, volume.y1, -.16), p(0, volume.y1, -.16), [.028, .045, .052]);
    for (let course = 0; course < volume.courses; course++) {
      const y0 = lerp(volume.y0, volume.y1, course / volume.courses);
      const y1 = lerp(volume.y0, volume.y1, (course + 1) / volume.courses);
      const band = office ? .36 : .48;
      quad(spandrel, p(0, y0, .07), p(1, y0, .07), p(1, y0 + band, .07), p(0, y0 + band, .07),
        office ? [.61, .67, .69] : [.72, .74, .72]);
      edgeBox(fins, volume.ring, edge, .5, y0 + band * .55, .24, length, office ? .11 : .15, office ? .58 : .42);
      horizontalFins++;
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + .0008, t1 = (bay + 1) / bays - .0008;
        const variation = hash(edge, bay, course, volume.id.length);
        const podiumPanel = !office && ((edge * 3 + bay + course) % 7 === 0 || (edge === 25 && bay % 5 === 0));
        if (podiumPanel) {
          quad(panels, p(t0, y0 + band + .08, .055), p(t1, y0 + band + .08, .055),
            p(t1, y1 - .12, .055), p(t0, y1 - .12, .055), mix([.5, .54, .55], [.78, .8, .77], variation)); metalPanels++;
        } else {
          const lit = hash(edge, bay, course, 26) > (office ? .82 : .74) ? .1 + variation * .58 : 0;
          const tint = office ? mix([.055, .16, .21], [.19, .34, .39], .18 + variation * .62)
            : mix([.055, .14, .17], [.24, .36, .37], .15 + variation * .55);
          quad(glass, p(t0, y0 + band + .08), p(t1, y0 + band + .08), p(t1, y1 - .12), p(t0, y1 - .12), tint, lit);
          glassPanels++;
        }
        const mt = bay / bays, dt = Math.min(.001, .035 / length);
        quad(mullions, p(mt, y0 + band, .11), p(mt + dt, y0 + band, .11), p(mt + dt, y1 - .08, .11), p(mt, y1 - .08, .11), [.23, .29, .31]);
      }
    }
    if (length > 7) {
      const count = Math.max(1, Math.floor(length / 12));
      for (let i = 0; i <= count; i++) {
        edgeBox(fins, volume.ring, edge, i / count, (volume.y0 + volume.y1) * .5, .24,
          office ? .16 : .22, volume.y1 - volume.y0, office ? .52 : .38);
      }
    }
  }
  return { glass, spandrel, backing, panels, mullions, fins, colliders, glassPanels, metalPanels, horizontalFins };
}

function createStreetLevel() {
  const glass = store(), stone = store(), backing = store(), frames = [], columns = [], colliders = [];
  let openRoadBays = 0, entranceBays = 0, closedBays = 0, columnCount = 0;
  for (let edge = 0; edge < HYSAN_LOCAL_RING.length / 2 - 1; edge++) {
    const length = hysanEdgeOutward(HYSAN_LOCAL_RING, edge).length;
    const bays = Math.max(1, Math.ceil(length / HYSAN_PODIUM_BAY_WIDTH));
    const p = (t, y, o = .05) => point(HYSAN_LOCAL_RING, edge, t, y, o);
    edgeBox(frames, HYSAN_LOCAL_RING, edge, .5, HYSAN_STREET_HEIGHT - .18, .12, length, .36, .42);
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays + .0008, t1 = (bay + 1) / bays - .0008;
      if (hysanPodiumBayConflict(HYSAN_LOCAL_RING, edge, bay / bays, (bay + 1) / bays)) { openRoadBays++; continue; }
      const entrance = (edge === HYSAN_MAIN_ENTRANCE.sourceEdge && bay < 3)
        || edge === HYSAN_WEST_ENTRANCE.sourceEdge || edge === HYSAN_SOUTH_ENTRANCE.sourceEdge;
      if (entrance) { entranceBays++; continue; }
      const v = hash(edge, bay, 26);
      quad(backing, p(t0, .2, -.22), p(t1, .2, -.22), p(t1, 7.45, -.22), p(t0, 7.45, -.22), [.12, .105, .085], .12 + v * .2);
      quad(glass, p(t0, .28), p(t1, .28), p(t1, 7.35), p(t0, 7.35), mix([.04, .1, .12], [.13, .23, .24], v), .08 + v * .16);
      quad(stone, p(t0, 7.42, .07), p(t1, 7.42, .07), p(t1, 8, .07), p(t0, 8, .07), [.69, .71, .69]);
      colliders.push(hysanSegmentCollider(HYSAN_LOCAL_RING, edge, bay / bays, (bay + 1) / bays, 0, HYSAN_STREET_HEIGHT));
      closedBays++;
    }
    for (let bay = 0; bay <= bays; bay++) {
      const t = bay / bays, i = edge * 2;
      const x = lerp(HYSAN_LOCAL_RING[i], HYSAN_LOCAL_RING[i + 2], t), z = lerp(HYSAN_LOCAL_RING[i + 1], HYSAN_LOCAL_RING[i + 3], t);
      if (hysanRoadConflictAtLocal(x, z)) continue;
      if ((edge === HYSAN_MAIN_ENTRANCE.sourceEdge && bay <= 3) || edge === HYSAN_WEST_ENTRANCE.sourceEdge) continue;
      const q = point(HYSAN_LOCAL_RING, edge, t, HYSAN_STREET_HEIGHT * .5, -.16);
      box(columns, q, [.36, HYSAN_STREET_HEIGHT, .36], hysanEdgeOutward(HYSAN_LOCAL_RING, edge).ry);
      colliders.push(hysanLocalCollider(q[0], q[2], .46, .46, 0, HYSAN_STREET_HEIGHT)); columnCount++;
    }
  }
  return { glass, stone, backing, frames, columns, colliders, openRoadBays, entranceBays, closedBays, columnCount };
}

// Embedded stroke lettering keeps the bilingual entrance signs legible without a system CJK font.
const HYSAN_SIGN_GLYPHS = {
  '希': [[[18,8],[46,30]],[[48,8],[16,32]],[[8,40],[90,40]],[[42,31],[28,58],[12,76]],[[28,54],[28,94]],[[28,54],[78,54],[78,94],[72,98]],[[54,48],[54,96]]],
  '慎': [[[12,24],[5,41]],[[25,18],[31,33]],[[20,32],[20,94]],[[42,12],[88,12]],[[64,4],[64,30]],[[44,30],[44,76]],[[44,30],[84,30],[84,76],[44,76]],[[44,45],[84,45]],[[44,60],[84,60]],[[38,84],[90,84]],[[54,84],[42,98]],[[74,84],[88,98]]],
  '廣': [[[50,4],[50,14]],[[12,18],[90,18]],[[18,18],[18,94]],[[26,32],[80,32]],[[38,22],[38,50]],[[66,22],[66,50]],[[26,44],[80,44]],[[30,56],[76,56],[76,80],[30,80],[30,56]],[[52,56],[52,92]],[[52,82],[34,96]],[[56,82],[76,96]]],
  '場': [[[8,30],[34,30]],[[20,12],[20,78]],[[6,78],[36,78]],[[46,12],[82,12],[82,40],[46,40],[46,12]],[[46,26],[82,26]],[[42,50],[90,50]],[[54,50],[42,94]],[[54,62],[84,62],[78,94]],[[56,72],[44,88]],[[70,72],[58,90]]]
};
function drawHysanChinese(context, text, centreX, centreY, size, fill) {
  const chars = [...text], advance = size * 1.08;
  let x = centreX - (chars.length - 1) * advance * .5 - size * .5;
  context.strokeStyle = fill; context.lineWidth = Math.max(1.4, size * .052); context.lineJoin = 'miter'; context.lineCap = 'square';
  for (const char of chars) {
    const glyph = HYSAN_SIGN_GLYPHS[char]; if (!glyph) continue;
    const top = centreY - size * .5, scale = size / 100;
    for (const path of glyph) {
      context.beginPath();
      path.forEach(([px, py], index) => { const xx = x + px * scale, yy = top + py * scale; if (index) context.lineTo(xx, yy); else context.moveTo(xx, yy); });
      context.stroke();
    }
    x += advance;
  }
}
function textPlane(text, width, height, fontSize = 64, tint = '#eef0ed', background = null) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 192;
  const context = canvas.getContext('2d'); if (background) { context.fillStyle = background; context.fillRect(0, 0, 1024, 192); }
  context.fillStyle = tint; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.shadowColor = 'rgba(0,0,0,.48)'; context.shadowBlur = 4; context.shadowOffsetY = 2;
  if ([...text].every((char) => HYSAN_SIGN_GLYPHS[char])) drawHysanChinese(context, text, 512, 96, Math.min(122, fontSize), tint);
  else { context.font = `500 ${fontSize}px Arial, sans-serif`; context.fillText(text, 512, 96); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false
  })); mesh.renderOrder = 12; return mesh;
}
function hysanSign(width = 8, height = 2.1) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 1024, 256);
  // Three separated folded strokes follow the actual Hysan device rather than substituting a generic H letter.
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(62 + i * 42, 42 + i * 18); ctx.lineTo(143 + i * 42, 42 + i * 18);
    ctx.lineTo(108 + i * 42, 91 + i * 18); ctx.lineTo(151 + i * 42, 91 + i * 18);
    ctx.lineTo(103 + i * 42, 157 + i * 10); ctx.lineTo(54 + i * 42, 157 + i * 10); ctx.closePath();
    ctx.fillStyle = i === 2 ? '#b62d3b' : '#d7d9d6'; ctx.fill();
  }
  ctx.fillStyle = '#e5e7e3'; ctx.font = '300 122px Arial, sans-serif'; ctx.fillText('Hysan', 260, 142);
  ctx.font = '500 66px Arial, sans-serif'; ctx.fillText('P L A C E', 420, 213);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false
  })); mesh.renderOrder = 12; return mesh;
}
function frameGroup(frame, lift = .12) {
  const group = new THREE.Group(); group.position.set(frame.localX, lift, frame.localZ);
  group.rotation.y = frame.ry - HYSAN_SITE.ry; return group;
}
function addFrameMeshes(group, materials, parts, prefix) {
  merged(group, parts.stone, materials.limestone, `${prefix}Limestone`);
  merged(group, parts.frames, materials.silver, `${prefix}MetalFrames`);
  merged(group, parts.glass, materials.clearGlass, `${prefix}Glazing`);
  merged(group, parts.dark, materials.dark, `${prefix}InteriorAndDoors`);
  merged(group, parts.lights, materials.light, `${prefix}WarmLights`, false);
}
function createMainEntrance(materials) {
  const group = frameGroup(HYSAN_MAIN_ENTRANCE); group.name = 'HysanHennessyRoadMainMallEntrance';
  const parts = { stone: [], frames: [], glass: [], dark: [], lights: [] }, colliders = [];
  const cx = 2.8;
  for (let panel = 0; panel < 4; panel++) box(parts.glass, [cx - 2.55 + panel * 1.7, 2.4, -.32], [1.64, 4.8, .08]);
  for (const x of [cx - 3.4, cx - 1.7, cx, cx + 1.7, cx + 3.4]) box(parts.frames, [x, 2.42, -.26], [.07, 4.84, .13]);
  for (const x of [cx - 4.1, cx + 4.1]) {
    box(parts.stone, [x, 3.1, -.45], [1.05, 6.2, .9]); colliders.push(hysanFrameCollider(HYSAN_MAIN_ENTRANCE, x, -.45, 1.1, .95, 0, 6.2, .12));
  }
  box(parts.stone, [cx, 5.65, -.45], [9.25, 1.1, .9]);
  box(parts.frames, [cx, 5.18, .8], [9.4, .18, 2.5]);
  colliders.push(hysanFrameCollider(HYSAN_MAIN_ENTRANCE, cx, -.32, 6.9, .28, 0, 4.9, .12));
  for (const x of [cx - 2.4, cx, cx + 2.4]) cylinder(parts.lights, [x, 5.05, .7], .1, .05, 12);
  // Stand the lettering just proud of the 8 m retail fascia/fins; at the source plane it was visibly sliced by both bands.
  const sign = hysanSign(8.7, 2.18); sign.position.set(cx, 8.15, .62); sign.name = 'HysanPlaceMainDeviceAndLettering'; group.add(sign);
  const chinese = textPlane('希慎廣場', 3.6, .65, 102); chinese.position.set(cx, 6.35, .07); group.add(chinese);
  // Paired exterior escalators rise from the Hennessy Road forecourt to the first retail landing.
  for (const side of [-1, 1]) {
    const x = cx + side * 2.15;
    beam(parts.dark, [x, .28, 3.9], [x, 5.75, -.75], 1.25, .32);
    for (const rail of [-.77, .77]) {
      beam(parts.frames, [x + rail, .85, 3.9], [x + rail, 6.3, -.75], .075);
      beam(parts.glass, [x + rail, .65, 3.9], [x + rail, 6.1, -.75], .055, .12);
    }
    for (let step = 0; step < 26; step++) {
      const t = step / 25; box(parts.dark, [x, .35 + t * 5.35, 3.75 - t * 4.45], [1.25, .12, .32]);
    }
  }
  addFrameMeshes(group, materials, parts, 'HysanMainEntrance');
  return { group, colliders };
}
function createWestOfficeEntrance(materials) {
  const group = frameGroup(HYSAN_WEST_ENTRANCE); group.name = 'HysanWestOfficeLobbyRevolvingDoor';
  const parts = { stone: [], frames: [], glass: [], dark: [], lights: [] }, colliders = [];
  for (const side of [-1, 1]) {
    box(parts.stone, [side * 3.05, 2.8, -.45], [2.25, 5.6, 1.05]);
    for (let y = .45; y < 5.5; y += .55) box(parts.frames, [side * 3.05, y, .085], [2.2, .018, .025]);
    colliders.push(hysanFrameCollider(HYSAN_WEST_ENTRANCE, side * 3.05, -.45, 2.3, 1.1, 0, 5.6, .12));
    const sign = textPlane('Hysan PLACE', 1.85, .52, 96, '#e3e4df'); sign.position.set(side * 3.05, 3.2, .115); group.add(sign);
    const chinese = textPlane('希慎廣場', 1.55, .42, 104, '#e3e4df'); chinese.position.set(side * 3.05, 2.45, .12); group.add(chinese);
  }
  box(parts.stone, [0, 4.95, -.45], [4.1, 1.3, 1.05]);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 3.65, 32, 1, true), materials.clearGlass);
  drum.position.set(0, 1.95, -.15); drum.name = 'HysanOfficeRevolvingGlassDrum'; group.add(drum);
  cylinder(parts.frames, [0, 1.95, -.15], .055, 3.7, 16);
  for (let wing = 0; wing < 4; wing++) {
    const angle = wing * Math.PI / 2; box(parts.glass, [0, 1.95, -.15], [2.75, 3.55, .045], angle);
    box(parts.frames, [0, 1.95, -.15], [2.82, .045, .07], angle);
  }
  box(parts.dark, [0, 3.82, -.15], [3.15, .16, 3.15]);
  for (let groove = 0; groove < 3; groove++) box(parts.stone, [0, .025 + groove * .012, .9 + groove * .34], [4.2 + groove * .2, .05, .38]);
  colliders.push(hysanFrameCollider(HYSAN_WEST_ENTRANCE, 0, -.15, 3.15, .45, 0, 3.85, .12));
  for (const x of [-1.1, 1.1]) cylinder(parts.lights, [x, 4.35, .25], .095, .05, 12);
  addFrameMeshes(group, materials, parts, 'HysanOfficeEntrance');
  return { group, colliders };
}
function createSouthEntrance(materials) {
  const group = frameGroup(HYSAN_SOUTH_ENTRANCE); group.name = 'HysanSouthMallEntrance';
  const parts = { stone: [], frames: [], glass: [], dark: [], lights: [] }, colliders = [];
  for (const x of [-.4, .4]) box(parts.glass, [x, 2.15, -.2], [.76, 4.3, .07]);
  for (const x of [-.85, 0, .85]) box(parts.frames, [x, 2.18, -.14], [.055, 4.36, .12]);
  box(parts.frames, [0, 4.5, .55], [2.15, .16, 1.5]);
  colliders.push(hysanFrameCollider(HYSAN_SOUTH_ENTRANCE, 0, -.2, 1.8, .25, 0, 4.4, .12));
  addFrameMeshes(group, materials, parts, 'HysanSouthEntrance'); return { group, colliders };
}

function slopedGallery(group, materials, start, end, width, depth, name) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end), direction = b.clone().sub(a).normalize();
  const across = new THREE.Vector3(-direction.y, direction.x, 0).normalize().multiplyScalar(width * .5);
  const z = new THREE.Vector3(0, 0, depth * .5), glass = [], frames = [], dark = [], lights = [];
  const corners = (center) => [center.clone().sub(across).sub(z), center.clone().add(across).sub(z),
    center.clone().add(across).add(z), center.clone().sub(across).add(z)];
  const ac = corners(a), bc = corners(b);
  for (let side = 0; side < 4; side++) {
    const next = (side + 1) % 4;
    const g = new THREE.BufferGeometry().setFromPoints([ac[side], bc[side], bc[next], ac[side], bc[next], ac[next]]);
    g.computeVertexNormals(); glass.push(g); beam(frames, ac[side].toArray(), bc[side].toArray(), .11);
  }
  const length = a.distanceTo(b), ribs = Math.ceil(length / 2.2);
  for (let rib = 0; rib <= ribs; rib++) {
    const t = rib / ribs, center = a.clone().lerp(b, t), c = corners(center);
    for (let side = 0; side < 4; side++) beam(frames, c[side].toArray(), c[(side + 1) % 4].toArray(), .075);
  }
  beam(dark, a.clone().add(new THREE.Vector3(0, -.45, 0)).toArray(), b.clone().add(new THREE.Vector3(0, -.45, 0)).toArray(), 1.35, .28);
  for (const side of [-1, 1]) {
    const offset = z.clone().multiplyScalar(side * 1.35);
    beam(lights, a.clone().add(offset).toArray(), b.clone().add(offset).toArray(), .045);
  }
  merged(group, glass, materials.clearGlass, `${name}Glass`, false);
  merged(group, frames, materials.silver, `${name}Ribs`);
  merged(group, dark, materials.dark, `${name}Escalator`);
  merged(group, lights, materials.light, `${name}LightStrips`, false);
}
function createHennessyEscalators(materials) {
  const group = frameGroup(HYSAN_MAIN_ENTRANCE, 0); group.name = 'HysanHennessyDiagonalExpressEscalators';
  slopedGallery(group, materials, [3, 20, -2.5], [28, 39, -2.5], 4.2, 2.4, 'HysanLowerDiagonalGallery');
  slopedGallery(group, materials, [30, 46, -5], [8, 65, -5], 4.2, 2.4, 'HysanMiddleDiagonalGallery');
  slopedGallery(group, materials, [8, 67, -5], [27, 83, -5], 4.2, 2.4, 'HysanUpperDiagonalGallery');
  return group;
}

function createGarden(name, ring, nextRing, bottom, top, materials, seed) {
  const group = new THREE.Group(); group.name = name;
  const paving = [], planters = [], trunks = [], leaves = [], rails = [], glass = store(), columns = [], colliders = [];
  const floor = new THREE.Mesh(roofGeometry(ring, bottom + .025), materials.paving); floor.name = `${name}TerraceDeck`; floor.receiveShadow = true; group.add(floor);
  const soffit = new THREE.Mesh(roofGeometry(nextRing, top), materials.silver); soffit.name = `${name}ShiftedVolumeSoffit`; soffit.receiveShadow = true; group.add(soffit);
  let treeCount = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const length = hysanEdgeOutward(ring, edge).length; if (length < 2.2) continue;
    const p = (t, y, o = .08) => point(ring, edge, t, y, o);
    quad(glass, p(0, bottom + .18), p(1, bottom + .18), p(1, bottom + 1.28), p(0, bottom + 1.28), [.26, .43, .43]);
    edgeBox(rails, ring, edge, .5, bottom + 1.33, .1, length, .075, .1);
    const plantersOnEdge = Math.max(0, Math.floor(length / 12));
    for (let i = 0; i < plantersOnEdge; i++) {
      const t = (i + 1) / (plantersOnEdge + 1), q = point(ring, edge, t, bottom + .42, -1.05);
      const ry = hysanEdgeOutward(ring, edge).ry;
      box(planters, q, [2.8, .8, 1.25], ry);
      const trunk = [q[0], bottom + 1.65, q[2]]; cylinder(trunks, trunk, .12, 2.5, 10);
      for (let cluster = 0; cluster < 3; cluster++) {
        const g = new THREE.IcosahedronGeometry(.8 + hash(seed, edge, i, cluster) * .35, 1);
        g.translate(q[0] + (cluster - 1) * .65, bottom + 2.85 + hash(edge, i, cluster) * .55, q[2] + (cluster % 2 ? .35 : -.2)); leaves.push(g);
      }
      treeCount++;
    }
    if (length > 8) for (const t of [.08, .92]) {
      const q = point(ring, edge, t, (bottom + top) * .5, -.25);
      box(columns, q, [.34, top - bottom, .34], hysanEdgeOutward(ring, edge).ry);
      colliders.push(hysanLocalCollider(q[0], q[2], .44, .44, bottom, top));
    }
  }
  // Two separated service/core blades keep the garden and prevailing-wind opening genuinely open.
  const coreX = seed === 2 ? 12 : 15, coreZ = seed === 2 ? 7 : 8;
  box(columns, [coreX, (bottom + top) * .5, coreZ], [5.2, top - bottom, 6.2]);
  colliders.push(hysanLocalCollider(coreX, coreZ, 5.2, 6.2, bottom, top));
  box(columns, [coreX - 24, (bottom + top) * .5, coreZ - 3], [1.4, top - bottom, 7]);
  colliders.push(hysanLocalCollider(coreX - 24, coreZ - 3, 1.4, 7, bottom, top));
  merged(group, paving, materials.paving, `${name}Paving`); merged(group, planters, materials.planter, `${name}Planters`);
  merged(group, trunks, materials.trunk, `${name}TreeTrunks`); merged(group, leaves, materials.leaves, `${name}Planting`);
  merged(group, rails, materials.silver, `${name}Handrails`); merged(group, columns, materials.silver, `${name}OpenCoreBladesAndColumns`);
  meshStore(group, glass, materials.balustrade, `${name}GlassBalustrades`, false);
  return { group, colliders, treeCount };
}

function createRoofFarm(materials) {
  const group = new THREE.Group(); group.name = 'HysanRooftopUrbanFarmAndOpenCrown';
  const ring = HYSAN_UPPER_OFFICE.ring, parapet = store(), coping = [], beds = [], crops = [], paths = [], core = [], green = [], canopy = [];
  const colliders = hysanRingColliders(ring, HYSAN_OCCUPIED_HEIGHT, 193.4);
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const length = hysanEdgeOutward(ring, edge).length, p = (t, y, o = 0) => point(ring, edge, t, y, o);
    quad(parapet, p(0, 190.1), p(1, 190.1), p(1, 193.4), p(0, 193.4), [.57, .63, .64]);
    edgeBox(coping, ring, edge, .5, 193.42, .06, length, .16, .3);
  }
  for (let ix = -2; ix <= 2; ix++) for (let iz = -1; iz <= 2; iz++) {
    const x = 9 + ix * 4.5, z = 2 + iz * 4;
    if (!insideFlat(ring, x, z)) continue;
    box(beds, [x, 190.42, z], [3.4, .55, 2.6]);
    for (let row = -1; row <= 1; row++) for (let plant = -2; plant <= 2; plant++) {
      const g = new THREE.IcosahedronGeometry(.22 + hash(ix, iz, row, plant) * .12, 0);
      g.translate(x + plant * .55, 190.9 + hash(ix, iz, plant) * .15, z + row * .68); crops.push(g);
    }
  }
  for (const z of [-4, 4, 12]) if (insideFlat(ring, 9, z)) box(paths, [9, 190.16, z], [25, .12, 1.05]);
  box(core, [13, 195.35, 7], [10, 10.5, 8]);
  colliders.push(hysanLocalCollider(13, 7, 10, 8, 190.1, 200.6));
  for (let y = 191; y < 200.3; y += .42) box(core, [13, y, 11.04], [9.7, .12, .12]);
  for (const x of [9.5, 12.5, 15.5]) box(green, [x, 195.1, 2.94], [2.35, 7.8, .18]);
  // Open perimeter canopy: the uppermost metal beam, not an invented antenna, fixes the 204.1 m architectural top.
  for (const x of [3, 23]) for (const z of [-3, 17]) {
    if (!insideFlat(ring, x, z)) continue;
    box(canopy, [x, 197.1, z], [.28, 14, .28]); colliders.push(hysanLocalCollider(x, z, .38, .38, 190.1, 204.1));
  }
  for (const z of [-3, 17]) beam(canopy, [3, 204, z], [23, 204, z], .18);
  for (const x of [3, 13, 23]) beam(canopy, [x, 204, -3], [x, 204, 17], .16);
  for (let x = 4; x <= 22; x += 3) box(canopy, [x, 203.94, 7], [2.65, .08, 18.5]);
  const deck = new THREE.Mesh(roofGeometry(ring, 190.12), materials.paving); deck.name = 'HysanRoofFarmDeck'; deck.receiveShadow = true; group.add(deck);
  meshStore(group, parapet, materials.spandrel, 'HysanRoofFarmPerimeterParapet');
  merged(group, coping, materials.silver, 'HysanRoofParapetCoping'); merged(group, beds, materials.planter, 'HysanUrbanFarmPlanterBeds');
  merged(group, crops, materials.leaves, 'HysanUrbanFarmCropRows'); merged(group, paths, materials.paving, 'HysanRoofFarmWhitePaths');
  merged(group, core, materials.dark, 'HysanRoofPlantAndLouvres'); merged(group, green, materials.leaves, 'HysanRoofGreenWall');
  merged(group, canopy, materials.silver, 'HysanOpenRoofCanopy204Point1m');
  return { group, colliders };
}

export function buildHysanPlace(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'HysanPlace'; group.userData.landmark = 'hysan-place';
  group.userData.osm = { type: 'way', id: HYSAN_OSM_SOURCE.id }; group.position.set(HYSAN_SITE.x, groundOffset, HYSAN_SITE.z);
  group.rotation.y = HYSAN_SITE.ry; root.add(group);
  const glass = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .34, roughness: .22, side: THREE.DoubleSide });
  glass.colorNode = attribute('color'); glass.emissiveNode = color(0xffd29a).mul(attribute('aLit')).mul(nightAmount());
  const spandrel = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .32, roughness: .42, side: THREE.DoubleSide });
  spandrel.colorNode = attribute('color'); spandrel.emissiveNode = color(0xdce7e5).mul(nightAmount()).mul(.045);
  const panel = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .42, roughness: .38, side: THREE.DoubleSide }); panel.colorNode = attribute('color');
  const backing = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .15, roughness: .5, side: THREE.DoubleSide });
  backing.colorNode = attribute('color'); backing.emissiveNode = color(0xffd29a).mul(attribute('aLit')).mul(nightAmount());
  const mullion = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .5, roughness: .36, side: THREE.DoubleSide }); mullion.colorNode = attribute('color');
  const silver = new THREE.MeshStandardNodeMaterial({ color: 0xbec9c9, metalness: .58, roughness: .35 });
  silver.emissiveNode = color(0xd8e4e2).mul(nightAmount()).mul(.04);
  const limestone = new THREE.MeshStandardMaterial({ color: 0xa9a79c, metalness: .04, roughness: .68 });
  const clearGlass = new THREE.MeshStandardNodeMaterial({ color: 0x87aeb1, metalness: .12, roughness: .12, transparent: true, opacity: .3, side: THREE.DoubleSide, depthWrite: false });
  clearGlass.emissiveNode = color(0xffd5a0).mul(nightAmount()).mul(.08);
  const balustrade = new THREE.MeshStandardNodeMaterial({ vertexColors: true, transparent: true, opacity: .28, roughness: .15, metalness: .08, side: THREE.DoubleSide, depthWrite: false }); balustrade.colorNode = attribute('color');
  const dark = new THREE.MeshStandardMaterial({ color: 0x202a2d, metalness: .32, roughness: .42 });
  const light = new THREE.MeshStandardNodeMaterial({ color: 0xffe4b5 }); light.emissiveNode = color(0xffd18a).mul(nightAmount()).mul(2.1);
  const paving = new THREE.MeshStandardMaterial({ color: 0xa7aaa2, roughness: .78, metalness: .03, side: THREE.DoubleSide });
  const planter = new THREE.MeshStandardMaterial({ color: 0x737a75, roughness: .76 });
  const leaves = new THREE.MeshStandardMaterial({ color: 0x3f6742, roughness: .9 });
  const trunk = new THREE.MeshStandardMaterial({ color: 0x51483b, roughness: .95 });
  const materials = { glass, spandrel, panel, backing, mullion, silver, limestone, clearGlass, balustrade, dark, light, paving, planter, leaves, trunk };

  const street = createStreetLevel();
  meshStore(group, street.backing, backing, 'HysanWarmRetailInteriors'); meshStore(group, street.glass, glass, 'HysanStreetShopfrontGlazing');
  meshStore(group, street.stone, spandrel, 'HysanStreetStoneFascia'); merged(group, street.frames, silver, 'HysanStreetLintelsAndParkingPortal');
  merged(group, street.columns, silver, 'HysanRoadSafeStreetColumns');
  const volumeResults = [];
  for (const [volume, family] of [[HYSAN_LOWER_RETAIL, 'retail'], [HYSAN_MIDDLE_RETAIL, 'retail'], [HYSAN_UPPER_RETAIL, 'retail'],
    [HYSAN_LOWER_OFFICE, 'office'], [HYSAN_UPPER_OFFICE, 'office']]) {
    const result = createVolume(volume, family); volumeResults.push(result);
    const prefix = `Hysan${volume.id.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join('')}`;
    meshStore(group, result.backing, backing, `${prefix}RecessedBacking`); meshStore(group, result.glass, glass, `${prefix}LowEGlass`);
    meshStore(group, result.spandrel, spandrel, `${prefix}SilverSpandrels`); meshStore(group, result.panels, panel, `${prefix}BrushedAluminiumPanels`);
    meshStore(group, result.mullions, mullion, `${prefix}FineMullions`); merged(group, result.fins, silver, `${prefix}HorizontalSunshadesAndVerticalFins`);
  }
  const gardenOfEden = createGarden('HysanGardenOfEden4F', HYSAN_LOWER_RETAIL.ring, HYSAN_MIDDLE_RETAIL.ring,
    HYSAN_GARDEN_OF_EDEN.bottom, HYSAN_GARDEN_OF_EDEN.top, materials, 1); group.add(gardenOfEden.group);
  const retailGarden = createGarden('HysanRetailSkyGardenAndWindOpening', HYSAN_MIDDLE_RETAIL.ring, HYSAN_UPPER_RETAIL.ring,
    HYSAN_RETAIL_SKY_GARDEN.bottom, HYSAN_RETAIL_SKY_GARDEN.top, materials, 2); group.add(retailGarden.group);
  const officeGarden = createGarden('HysanOfficeSkyGardenAndWindOpening', HYSAN_LOWER_OFFICE.ring, HYSAN_UPPER_OFFICE.ring,
    HYSAN_OFFICE_SKY_GARDEN.bottom, HYSAN_OFFICE_SKY_GARDEN.top, materials, 3); group.add(officeGarden.group);
  const mainEntrance = createMainEntrance(materials); group.add(mainEntrance.group);
  const westEntrance = createWestOfficeEntrance(materials); group.add(westEntrance.group);
  const southEntrance = createSouthEntrance(materials); group.add(southEntrance.group);
  group.add(createHennessyEscalators(materials));
  const roofFarm = createRoofFarm(materials); group.add(roofFarm.group);

  const colliders = [...street.colliders, ...volumeResults.flatMap((result) => result.colliders),
    ...gardenOfEden.colliders, ...retailGarden.colliders, ...officeGarden.colliders,
    ...mainEntrance.colliders, ...westEntrance.colliders, ...southEntrance.colliders, ...roofFarm.colliders];
  for (const c of colliders) { c.minY += groundOffset; c.maxY += groundOffset; }
  const grounds = { plaza: groundOffset + .12 };
  const landmark = { id: 'hysan-place', name: HYSAN_SITE.name, position: { x: HYSAN_SITE.x, y: groundOffset, z: HYSAN_SITE.z }, radius: 70, height: HYSAN_HEIGHT };
  const stats = {
    hysanGroundOffset: groundOffset, hysanLandmarks: 1, hysanOsmHeight: HYSAN_OSM_HEIGHT,
    hysanCtbuhHeight: HYSAN_CTBUH_HEIGHT, hysanHeight: HYSAN_HEIGHT, hysanOccupiedHeight: HYSAN_OCCUPIED_HEIGHT,
    hysanOsmLevels: HYSAN_OSM_LEVELS, hysanCtbuhLevels: HYSAN_CTBUH_LEVELS, hysanBelowGroundLevels: HYSAN_BELOW_GROUND_LEVELS,
    hysanCompletionYear: HYSAN_COMPLETION_YEAR, hysanCtbuhGfa: HYSAN_CTBUH_GFA, hysanKpfGfa: HYSAN_KPF_GFA,
    hysanArchitect: HYSAN_ARCHITECT, hysanAssociateArchitect: HYSAN_ASSOCIATE_ARCHITECT,
    hysanRetailInteriorArchitect: HYSAN_RETAIL_INTERIOR_ARCHITECT, hysanContractor: HYSAN_CONTRACTOR,
    hysanSourceVertices: 27, hysanOsmWayVersion: HYSAN_OSM_SOURCE.version, hysanRingArea: HYSAN_RING_AREA,
    hysanVisualCourses: HYSAN_VISUAL_COURSES, hysanGlassPanels: volumeResults.reduce((sum, result) => sum + result.glassPanels, 0),
    hysanMetalPanels: volumeResults.reduce((sum, result) => sum + result.metalPanels, 0),
    hysanHorizontalFins: volumeResults.reduce((sum, result) => sum + result.horizontalFins, 0),
    hysanOpenRoadBays: street.openRoadBays, hysanEntranceBays: street.entranceBays,
    hysanClosedStreetBays: street.closedBays, hysanStreetColumns: street.columnCount,
    hysanGardenTrees: gardenOfEden.treeCount + retailGarden.treeCount + officeGarden.treeCount,
    hysanMainEntranceNode: HYSAN_MAIN_ENTRANCE.nodeId, hysanWestEntranceNode: HYSAN_WEST_ENTRANCE.nodeId,
    hysanSouthEntranceNode: HYSAN_SOUTH_ENTRANCE.nodeId, hysanParkingEntranceNode: HYSAN_PARKING_ENTRANCE.nodeId,
    hysanF2SubwayNode: HYSAN_F2_SUBWAY_SOURCE.id, hysanCrossingRoadRecords: HYSAN_CROSSING_ROADS.length,
    hysanRoadVehicleClearance: HYSAN_ROAD_VEHICLE_CLEARANCE, hysanPlazaGround: grounds.plaza,
    hysanMainForecourtWidth: HYSAN_MAIN_FORECOURT_WIDTH, hysanMainForecourtDepth: HYSAN_MAIN_FORECOURT_DEPTH,
    hysanColliders: colliders.length
  };
  return { group, colliders, landmarks: [landmark], stats, groundOffset, grounds, plazaTop: grounds.plaza,
    groundHeightAt: (x, z, ground) => hysanGroundHeightAt(x, z, ground, grounds) };
}
