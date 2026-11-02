import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  AIRSIDE_SITE, AIRSIDE_OSM_SOURCE, AIRSIDE_COMPLEX_RING, AIRSIDE_MAIN_TOWER_RING, AIRSIDE_SECONDARY_RING, AIRSIDE_UPPER_VOLUME_RINGS,
  AIRSIDE_ATRIUM_RING, AIRSIDE_MIDDLE_RINGS, AIRSIDE_SOUTH_RING,
  AIRSIDE_OSM_HEIGHT, AIRSIDE_OSM_LEVELS, AIRSIDE_OSM_UNDERGROUND_LEVELS,
  AIRSIDE_OFFICIAL_HEIGHT, AIRSIDE_OFFICIAL_LEVELS, AIRSIDE_HEIGHT,
  AIRSIDE_CTBUH_HEIGHT, AIRSIDE_CTBUH_TO_TIP_HEIGHT, AIRSIDE_CTBUH_OCCUPIED_HEIGHT,
  AIRSIDE_CTBUH_LEVELS, AIRSIDE_CTBUH_UNDERGROUND_LEVELS, AIRSIDE_CTBUH_COMPLETION_YEAR,
  AIRSIDE_OPENING_DATE, AIRSIDE_ROOF_DIRECTION_DEGREES, AIRSIDE_ROOF_RISE,
  AIRSIDE_SECONDARY_LEVELS, AIRSIDE_RETAIL_LEVELS, AIRSIDE_TOTAL_GFA, AIRSIDE_OFFICE_GFA,
  AIRSIDE_RETAIL_GFA, AIRSIDE_PV_AREA, AIRSIDE_EDUCATIONAL_GARDEN_AREA, AIRSIDE_SOFT_LANDSCAPE_RATIO,
  AIRSIDE_PLAZA_TOP, AIRSIDE_BASE_SOFFIT, AIRSIDE_MAIN_PODIUM_HEIGHT, AIRSIDE_MAIN_VISUAL_COURSES,
  AIRSIDE_SECONDARY_HEIGHT, AIRSIDE_SECONDARY_OCCUPIED_HEIGHT, AIRSIDE_SECONDARY_VISUAL_COURSES,
  AIRSIDE_ATRIUM_HEIGHT, AIRSIDE_MIDDLE_HEIGHT, AIRSIDE_SOUTH_HEIGHT, AIRSIDE_PANEL_TARGET_WIDTH,
  AIRSIDE_FLUTE_DEPTHS, AIRSIDE_ROAD_VEHICLE_CLEARANCE, AIRSIDE_MAIN_WIDTH, AIRSIDE_MAIN_DEPTH,
  AIRSIDE_OFFICE_ENTRANCE, AIRSIDE_OFFICE_DOOR_NODES, AIRSIDE_MALL_ENTRANCE, AIRSIDE_MALL_FORECOURT_RING,
  AIRSIDE_SURFACE_ACCESS_WAYS, AIRSIDE_TUNNEL_WAYS,
  AIRSIDE_FRAME_ROTATION, airsideMainFloorY, airsideSecondaryFloorY, airsideMainCutY,
  airsideMainRoofY, airsideSecondaryRoofY, airsideEdgeOutward, airsideLocalToWorld,
  airsideGroundBayConflict, airsideGroundColumnSites, airsideRingColliders, airsideEdgeCollider,
  airsideFrameCollider, airsideGroundHeightAt
} from './airside-architecture.js';

const lerp = (a, b, t) => a + (b - a) * t;
const nightAmount = () => smoothstep(0.55, 1.4, cityUniforms.uInteriorGlow);
function store() { return { positions: [], colors: [], lit: [] }; }
function mix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function hash(a, b, c, d = 0) { const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + d * 19.19) * 43758.5453; return value - Math.floor(value); }
function vertex(target, p, tint, lit = 0) { target.positions.push(...p); target.colors.push(...tint); target.lit.push(lit); }
function quad(target, a, b, c, d, tint, lit = 0) { for (const p of [a, b, c, a, c, d]) vertex(target, p, tint, lit); }
function geometryFromStore(data) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3));
  geometry.setAttribute('aLit', new THREE.Float32BufferAttribute(data.lit, 1));
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere(); return geometry;
}
function meshStore(group, data, material, name, shadows = true) {
  if (!data.positions.length) return null;
  const mesh = new THREE.Mesh(geometryFromStore(data), material); mesh.name = name;
  mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function merged(group, parts, material, name, shadows = true) {
  if (!parts.length) return null;
  const geometry = mergeGeometries(parts, false); for (const part of parts) part.dispose();
  const mesh = new THREE.Mesh(geometry, material); mesh.name = name; mesh.castShadow = shadows; mesh.receiveShadow = true;
  group.add(mesh); return mesh;
}
function tintGeometry(geometry, tint) {
  const count = geometry.attributes.position.count, colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set(tint, i * 3);
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); return geometry;
}
function box(parts, center, size, ry = 0, tint = null) {
  const geometry = new THREE.BoxGeometry(...size); if (ry) geometry.rotateY(ry); geometry.translate(...center);
  if (tint) tintGeometry(geometry, tint); parts.push(geometry); return geometry;
}
function cylinder(parts, center, radius, height, segments = 14) {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, segments); geometry.translate(...center); parts.push(geometry); return geometry;
}
function edgeBox(parts, ring, edge, t, y, offset, width, height, depth, tint = null) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const { nx, nz, ry } = airsideEdgeOutward(ring, edge);
  return box(parts, [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset], [width, height, depth], ry, tint);
}
function ringArea(ring) {
  let area = 0; for (let i = 0; i + 3 < ring.length; i += 2) area += ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1]; return area * 0.5;
}
function inside(ring, u, v) {
  let value = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1];
    if ((zi > v) !== (zj > v) && u < (xj - xi) * (v - zi) / (zj - zi) + xi) value = !value;
  }
  return value;
}
function roofGeometry(ring, heightAt) {
  const shape = new THREE.Shape();
  for (let i = 0; i < ring.length - 2; i += 2) {
    const u = ring[i], v = -ring[i + 1]; if (i === 0) shape.moveTo(u, v); else shape.lineTo(u, v);
  }
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape); geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) position.setY(i, heightAt(position.getX(i), position.getZ(i)));
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere(); return geometry;
}

// Four curved-glass radii, flat lower glazing, diagonal textile cuts and variable-depth LED fins follow the architect's description.
function createCurtainVolume({ id, ring, baseY, occupiedY, topAt, courses, floorAt, cutAt = () => Infinity, fluted = true }) {
  const glass = store(), backing = store(), crown = store(), frames = store(), louvres = store();
  const fins = [[], [], [], []], roofParts = [];
  const colliders = [];
  let glassPanels = 0, flutedPanels = 0, flatPanels = 0, frameMembers = 0, finCount = 0, louvrePanels = 0, crownPanels = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = airsideEdgeOutward(ring, edge), bays = Math.max(1, Math.round(length / AIRSIDE_PANEL_TARGET_WIDTH));
    const point = (t, y, offset = 0.04) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays + 0.0007, t1 = (bay + 1) / bays - 0.0007, tm = (t0 + t1) * 0.5;
      const u0 = lerp(ax, bx, t0), v0 = lerp(az, bz, t0), u1 = lerp(ax, bx, t1), v1 = lerp(az, bz, t1);
      const cut0 = cutAt(u0, v0) - 1.10, cut1 = cutAt(u1, v1) - 1.10;
      const top0 = topAt(u0, v0), top1 = topAt(u1, v1);
      quad(backing, point(t0, baseY, -0.13), point(t1, baseY, -0.13), point(t1, occupiedY, -0.13), point(t0, occupiedY, -0.13), [0.035, 0.070, 0.090]);
      for (let course = 0; course < courses; course++) {
        const fy0 = floorAt(course), fy1 = floorAt(course + 1);
        const variation = hash(edge, bay, course, id.length * 7), lit = hash(edge, bay, course, 93) > (baseY < 20 ? 0.76 : 0.88) ? 0.15 + variation * 0.64 : 0;
        const low0 = Math.max(baseY, fy0), low1 = Math.min(fy1, (cut0 + cut1) * 0.5);
        if (low1 > low0 + 0.025) {
          const yA0 = low0, yA1 = low1, ventFamily = (bay + edge * 2) % 19;
          const isLouvre = (ventFamily === 0 || ventFamily === 1) && course % 4 !== 3;
          const tint = isLouvre ? [0.075, 0.105, 0.115] : mix([0.10, 0.18, 0.21], [0.24, 0.34, 0.36], 0.32 + variation * 0.30);
          quad(glass, point(t0, yA0), point(t1, yA0), point(t1, yA1), point(t0, yA1), tint, isLouvre ? 0 : lit);
          glassPanels++; flatPanels++; if (isLouvre) louvrePanels++;
          quad(frames, point(t0, yA0, 0.085), point(t1, yA0, 0.085), point(t1, yA0 + 0.055, 0.085), point(t0, yA0 + 0.055, 0.085), [0.28, 0.34, 0.35]); frameMembers++;
          if (isLouvre) for (let y = yA0 + 0.34; y < yA1 - 0.12; y += 0.48) {
            quad(louvres, point(t0, y, 0.13), point(t1, y, 0.13), point(t1, y + 0.085, 0.13), point(t0, y + 0.085, 0.13), [0.26, 0.31, 0.32]);
          }
        }
        const high0 = Math.max(baseY, fy0, (cut0 + cut1) * 0.5 + 2.20), high1 = Math.min(fy1, occupiedY);
        if (high1 > high0 + 0.025) {
          const strips = fluted ? 3 : 1, depth = AIRSIDE_FLUTE_DEPTHS[(bay + edge) % 4];
          for (let strip = 0; strip < strips; strip++) {
            const s0 = strip / strips, s1 = (strip + 1) / strips;
            const ta = lerp(t0, t1, s0), tb = lerp(t0, t1, s1);
            const curve = (s) => fluted ? 0.055 + depth * Math.sin(Math.PI * s) : 0.055;
            const oa = curve(s0), ob = curve(s1), ca = curve((s0 + s1) * 0.5);
            const tint = mix([0.15, 0.26, 0.30], [0.35, 0.46, 0.48], 0.28 + variation * 0.32);
            quad(glass, point(ta, high0, oa), point(tb, high0, ob), point(tb, high1, ob), point(ta, high1, oa), tint, lit);
            quad(frames, point(ta, high0, oa + 0.035), point(tb, high0, ob + 0.035), point(tb, high0 + 0.05, ob + 0.035), point(ta, high0 + 0.05, oa + 0.035), [0.31, 0.38, 0.39]); frameMembers++;
            if (strip === 1 && fluted) {
              // A narrow centre ridge makes the four panel radii legible at oblique angles.
              quad(frames, point(lerp(ta, tb, 0.48), high0, ca + 0.025), point(lerp(ta, tb, 0.52), high0, ca + 0.025),
                point(lerp(ta, tb, 0.52), high1, ca + 0.025), point(lerp(ta, tb, 0.48), high1, ca + 0.025), [0.37, 0.43, 0.43]);
            }
            glassPanels++; if (fluted) flutedPanels++; else flatPanels++;
          }
        }
      }
      if (Number.isFinite(cut0) && Number.isFinite(cut1)) {
        const a0 = cutAt(u0, v0), a1 = cutAt(u1, v1);
        quad(crown, point(t0, a0 - 1.10, 0.20), point(t1, a1 - 1.10, 0.20), point(t1, a1 + 1.10, 0.20), point(t0, a0 + 1.10, 0.20), [0.055, 0.075, 0.080]);
        for (const offset of [-1.18, 1.18]) {
          quad(frames, point(t0, a0 + offset - 0.07, 0.23), point(t1, a1 + offset - 0.07, 0.23),
            point(t1, a1 + offset + 0.07, 0.23), point(t0, a0 + offset + 0.07, 0.23), [0.46, 0.52, 0.51]); frameMembers++;
        }
      }
      if (top0 > occupiedY + 0.01 || top1 > occupiedY + 0.01) {
        quad(crown, point(t0, occupiedY, 0.045), point(t1, occupiedY, 0.045), point(t1, top1 - 0.12, 0.045), point(t0, top0 - 0.12, 0.045), [0.045, 0.070, 0.080]); crownPanels++;
        for (let y = occupiedY + 0.42; y < Math.min(top0, top1) - 0.20; y += 0.82) {
          quad(louvres, point(t0, y, 0.12), point(t1, y, 0.12), point(t1, y + 0.095, 0.12), point(t0, y + 0.095, 0.12), [0.24, 0.30, 0.31]);
        }
        quad(frames, point(t0, top0 - 0.20, 0.13), point(t1, top1 - 0.20, 0.13), point(t1, top1, 0.13), point(t0, top0, 0.13), [0.48, 0.54, 0.53]); frameMembers++;
      }
    }
    for (let bay = 0; bay <= bays; bay++) {
      const t = bay / bays, u = lerp(ax, bx, t), v = lerp(az, bz, t), cut = cutAt(u, v);
      const lowerTop = Math.min(occupiedY, cut - 1.18), halfT = Math.min(0.0015, 0.035 / Math.max(length, 0.1));
      if (lowerTop > baseY + 0.03) {
        quad(frames, point(t-halfT,baseY,0.105), point(t+halfT,baseY,0.105), point(t+halfT,lowerTop,0.105), point(t-halfT,lowerTop,0.105), [0.30,0.37,0.38]); frameMembers++;
      }
      const start = Math.max(baseY, cut + 1.18), top = topAt(u, v);
      if (top <= start + 0.05) continue;
      const family = (bay + edge) % 4, depth = AIRSIDE_FLUTE_DEPTHS[family] + 0.18;
      const tint = [[0.40,0.58,0.68],[0.47,0.64,0.72],[0.56,0.70,0.76],[0.64,0.75,0.79]][family];
      edgeBox(fins[family], ring, edge, t, (start + top) * 0.5, depth * 0.5 + 0.06, 0.065, top - start, depth, tint); finCount++;
    }
    colliders.push(airsideEdgeCollider(ring, edge, baseY, Math.max(topAt(ax, az), topAt(bx, bz))));
  }
  roofParts.push(roofGeometry(ring, (u, v) => topAt(u, v) - 0.45));
  return { id, ring, glass, backing, crown, frames, louvres, fins, roofParts, colliders,
    glassPanels, flutedPanels, flatPanels, frameMembers, finCount, louvrePanels, crownPanels };
}

function createGroundBase() {
  const glass = store(), backing = store();
  const frames = [], lintels = [], columns = [], colliders = [], portalWays = new Set();
  let groundPanels = 0, groundPortals = 0, groundEntranceBays = 0, groundFrameMembers = 0;
  for (let edge = 0; edge < AIRSIDE_COMPLEX_RING.length / 2 - 1; edge++) {
    const ring = AIRSIDE_COMPLEX_RING, i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = airsideEdgeOutward(ring, edge), bays = Math.max(1, Math.ceil(length / 2.8));
    const point = (t, y, offset = 0.04) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    let previousOpen = true;
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays, t1 = (bay + 1) / bays, conflict = airsideGroundBayConflict(ring, edge, t0, t1);
      const midU = lerp(ax, bx, (t0 + t1) * 0.5), midV = lerp(az, bz, (t0 + t1) * 0.5);
      const officeOpening = edge >= 36 && edge < 42 && Math.abs(midV - AIRSIDE_OFFICE_ENTRANCE.v) < 0.25
        && Math.abs(midU - AIRSIDE_OFFICE_ENTRANCE.u) < 12;
      const mallOpening = edge >= 5 && edge <= 7 && Math.hypot(midU - AIRSIDE_MALL_ENTRANCE.u, midV - AIRSIDE_MALL_ENTRANCE.v) < 7.5;
      if (conflict || officeOpening || mallOpening) {
        if (conflict) { groundPortals++; portalWays.add(conflict.osmWay); }
        else groundEntranceBays++;
      } else {
        const a = t0 + 0.0008, b = t1 - 0.0008, variation = hash(edge, bay, 4, 19);
        quad(backing, point(a, AIRSIDE_PLAZA_TOP, -0.15), point(b, AIRSIDE_PLAZA_TOP, -0.15), point(b, 6.2, -0.15), point(a, 6.2, -0.15), [0.11, 0.10, 0.075]);
        quad(glass, point(a, AIRSIDE_PLAZA_TOP + 0.04), point(b, AIRSIDE_PLAZA_TOP + 0.04), point(b, 6.12), point(a, 6.12),
          mix([0.08,0.12,0.13], [0.26,0.25,0.18], variation), 0.16 + variation * 0.26); groundPanels++;
        if (previousOpen) { edgeBox(frames, ring, edge, t0, 3.16, 0.12, 0.075, 6.08, 0.16, [0.22,0.27,0.27]); groundFrameMembers++; }
        edgeBox(frames, ring, edge, t1, 3.16, 0.12, 0.075, 6.08, 0.16, [0.22,0.27,0.27]); groundFrameMembers++;
        for (const y of [3.15, 6.18]) { edgeBox(frames, ring, edge, (t0 + t1) * 0.5, y, 0.12, length / bays, 0.085, 0.16, [0.22,0.27,0.27]); groundFrameMembers++; }
        colliders.push(airsideEdgeCollider([ax,az,bx,bz,ax,az], 0, AIRSIDE_PLAZA_TOP, 6.2, 0.26));
      }
      if (!mallOpening) {
        edgeBox(lintels, ring, edge, (t0 + t1) * 0.5, 7.10, 0.04, length / bays + 0.025, 1.80, 0.36);
        colliders.push(airsideEdgeCollider([ax,az,bx,bz,ax,az], 0, 6.2, AIRSIDE_BASE_SOFFIT, 0.36));
      }
      previousOpen = Boolean(conflict || officeOpening || mallOpening);
    }
  }
  const columnSites = airsideGroundColumnSites();
  for (const site of columnSites) {
    cylinder(columns, [site.u, AIRSIDE_PLAZA_TOP * 0.5, site.v], 0.62, AIRSIDE_PLAZA_TOP, 18);
    cylinder(columns, [site.u, (AIRSIDE_PLAZA_TOP + AIRSIDE_BASE_SOFFIT) * 0.5, site.v], 0.52, AIRSIDE_BASE_SOFFIT - AIRSIDE_PLAZA_TOP, 18);
    colliders.push(...airsideRingColliders([site.u-0.52,site.v-0.52,site.u+0.52,site.v-0.52,site.u+0.52,site.v+0.52,site.u-0.52,site.v+0.52], AIRSIDE_PLAZA_TOP, AIRSIDE_BASE_SOFFIT, 0.20));
  }
  return { glass, backing, frames, lintels, columns, colliders, groundPanels, groundPortals, groundEntranceBays, groundFrameMembers, portalWays: [...portalWays], columnSites };
}

function signTexture(kind) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 1024, 256); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f4f7f5'; ctx.font = '700 142px Arial, sans-serif'; ctx.fillText('AIRSIDE', 512, kind === 'mall' ? 132 : 102, 940);
  if (kind === 'office') { ctx.font = '500 31px Arial, sans-serif'; ctx.fillText('OFFICE  ·  2 CONCORDE ROAD', 512, 213, 900); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function sign(group, kind, width, height, position, name) {
  const material = new THREE.MeshBasicMaterial({ map: signTexture(kind), transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material); mesh.position.set(...position); mesh.renderOrder = 3; mesh.name = name; group.add(mesh); return mesh;
}
function createOfficeEntrance(model, materials) {
  const frame = AIRSIDE_OFFICE_ENTRANCE, group = new THREE.Group(); group.name = 'AirsideConcordeRoadTwinSourceNodeOfficeLobby';
  group.position.set(frame.u, AIRSIDE_PLAZA_TOP, frame.v); group.rotation.y = frame.ry; model.add(group);
  const stone = [], glass = [], interior = [], frames = [], lights = [], colliders = [];
  box(interior, [0,3.6,-5.52], [34,7.0,0.18]); box(glass, [0,3.6,-5.30], [34,7.0,0.10]);
  const doorCentres = AIRSIDE_OFFICE_DOOR_NODES.map((node) => node.u - frame.u);
  for (const centre of doorCentres) for (const dx of [-1.65,-0.55,0.55,1.65]) {
    box(glass, [centre+dx,2.35,-5.16], [1.02,4.70,0.10]);
    box(frames, [centre+dx-0.51,2.35,-5.09], [0.055,4.70,0.08]); box(frames, [centre+dx+0.18,2.25,-5.04], [0.045,0.82,0.08]);
  }
  for (const x of [-17,-11,0,11,17]) box(frames, [x,3.55,-5.10], [0.12,7.10,0.16]);
  box(stone, [0,6.40,-2.15], [36,0.46,7.30]); box(stone, [0,6.12,1.48], [36,1.12,0.24]);
  for (const x of [-16,16]) {
    cylinder(stone, [x,3.05,-4.85], 0.52,6.10,20); colliders.push(airsideFrameCollider(frame,x,-4.85,1.04,1.04,0,6.10,AIRSIDE_PLAZA_TOP));
  }
  for (const x of [-12,-4,4,12]) box(lights, [x,6.14,-2.2], [0.14,0.08,5.6]);
  box(frames, [0,6.12,1.92], [14.6,3.55,0.12]);
  sign(group,'office',14,3.5,[0,6.12,2.05],'AirsideOfficeLobbyWhiteLettering');
  merged(group,stone,materials.ivory,'AirsideOfficeCantileverCanopyAndRoundColumns');
  merged(group,interior,materials.interior,'AirsideOfficeWarmStoneLobbyBacking');
  merged(group,glass,materials.entryGlass,'AirsideOfficeTwinSourceNodeGlazingAndEightDoors',false);
  merged(group,frames,materials.darkMetal,'AirsideOfficeDoorFramesAndPulls');
  merged(group,lights,materials.warmLight,'AirsideOfficeLinearCanopySoffitLights',false);
  colliders.push(airsideFrameCollider(frame,0,-5.30,34,0.34,0,7.2,AIRSIDE_PLAZA_TOP));
  colliders.push(airsideFrameCollider(frame,0,-2.15,36,7.30,6.17,6.63,AIRSIDE_PLAZA_TOP));
  colliders.push(airsideFrameCollider(frame,0,1.48,36,0.24,5.56,6.68,AIRSIDE_PLAZA_TOP));
  return { group, colliders, doorCentres };
}
function createMallEntrance(model, materials) {
  const frame = AIRSIDE_MALL_ENTRANCE, group = new THREE.Group(); group.name = 'AirsideSourceNodeRetailAtriumEntrance';
  group.position.set(frame.u,AIRSIDE_PLAZA_TOP,frame.v); group.rotation.y = frame.ry; model.add(group);
  const glass = [], interior = [], frames = [], stone = [], lights = [], colliders = [];
  box(interior,[0,6.6,-0.72],[13,13.0,0.18]); box(glass,[0,6.6,-0.50],[13,13.0,0.10]);
  for (const x of [-2.1,-0.7,0.7,2.1]) {
    box(glass,[x,2.35,-0.34],[1.32,4.70,0.10]); box(frames,[x-0.66,2.35,-0.27],[0.065,4.70,0.08]);
    box(frames,[x+0.23,2.25,-0.22],[0.045,0.82,0.08]);
  }
  for (const x of [-6.5,-3.25,0,3.25,6.5]) box(frames,[x,6.55,-0.28],[0.10,13.1,0.14]);
  for (const y of [4.8,9.4,13.05]) box(frames,[0,y,-0.27],[13,0.10,0.14]);
  box(stone,[0,5.45,1.25],[14,0.38,3.5]); box(stone,[0,5.20,2.94],[14,0.92,0.20]);
  for (const x of [-4,0,4]) box(lights,[x,5.21,1.25],[0.14,0.07,2.7]);
  box(frames,[0,8.1,0.20],[10.4,2.55,0.12]);
  sign(group,'mall',10,2.5,[0,8.1,0.35],'AirsideRetailAtriumWhiteLettering');
  merged(group,interior,materials.interior,'AirsideRetailWarmAtriumInterior');
  merged(group,glass,materials.entryGlass,'AirsideRetailThirteenMetreAtriumGlazingAndFourDoors',false);
  merged(group,frames,materials.darkMetal,'AirsideRetailAtriumTransomsAndDoorPulls');
  merged(group,stone,materials.ivory,'AirsideRetailEntranceCanopy');
  merged(group,lights,materials.warmLight,'AirsideRetailCanopySoffitLights',false);
  colliders.push(airsideFrameCollider(frame,0,-0.50,13,0.34,0,5.0,AIRSIDE_PLAZA_TOP));
  colliders.push(airsideFrameCollider(frame,0,1.25,14,3.5,5.26,5.64,AIRSIDE_PLAZA_TOP));
  colliders.push(airsideFrameCollider(frame,0,2.94,14,0.20,4.74,5.66,AIRSIDE_PLAZA_TOP));
  return { group, colliders };
}

function panelCornersInside(ring,u,v,hw=1.0,hd=0.55) {
  return [[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]].every(([du,dv]) => inside(ring,u+du,v+dv));
}
function createPhotovoltaic(roofDefinitions) {
  const panels = [], frames = [], cellLines = [];
  let count = 0;
  for (const definition of roofDefinitions) {
    const { ring, heightAt, target, id } = definition;
    const us = ring.filter((_,i) => i % 2 === 0), vs = ring.filter((_,i) => i % 2 === 1);
    const minU = Math.min(...us), maxU = Math.max(...us), minV = Math.min(...vs), maxV = Math.max(...vs);
    let made = 0;
    for (let v = minV + 2; v < maxV - 1 && made < target; v += 1.65) for (let u = minU + 2; u < maxU - 1 && made < target; u += 2.55) {
      if (!panelCornersInside(ring,u,v)) continue;
      const y = heightAt(u,v) - 0.27, geometry = new THREE.BoxGeometry(2.02,0.10,1.10);
      geometry.rotateX(0.18); geometry.translate(u,y,v); panels.push(geometry);
      box(frames,[u,y-0.075,v],[2.12,0.08,1.20]);
      for (const du of [-0.50,0,0.50]) box(cellLines,[u+du,y+0.065,v],[0.025,0.025,1.02]);
      made++; count++;
    }
    definition.made = made;
  }
  return { panels, frames, cellLines, count, definitions: roofDefinitions };
}
function createGardens() {
  const planters = [], greenery = [], trunks = [], water = [], benches = [], rails = [], railGlass = store();
  let shrubs = 0, trees = 0, waterFeatures = 0;
  const definitions = [
    { ring: AIRSIDE_ATRIUM_RING, y: AIRSIDE_ATRIUM_HEIGHT - 0.45, spacing: 8.5, cap: 32 },
    { ring: AIRSIDE_MIDDLE_RINGS[0], y: AIRSIDE_MIDDLE_HEIGHT - 0.45, spacing: 7.5, cap: 22 },
    { ring: AIRSIDE_SOUTH_RING, y: AIRSIDE_SOUTH_HEIGHT - 0.45, spacing: 7.0, cap: 14 }
  ];
  for (const [zone,definition] of definitions.entries()) {
    const { ring,y,spacing,cap } = definition, us = ring.filter((_,i) => i % 2 === 0), vs = ring.filter((_,i) => i % 2 === 1);
    const minU = Math.min(...us), maxU = Math.max(...us), minV = Math.min(...vs), maxV = Math.max(...vs);
    let made = 0;
    for (let v = minV + 4; v < maxV - 3 && made < cap; v += spacing) for (let u = minU + 4; u < maxU - 3 && made < cap; u += spacing) {
      if (!inside(ring,u,v) || !inside(ring,u+1.4,v) || !inside(ring,u-1.4,v) || !inside(ring,u,v+1.4) || !inside(ring,u,v-1.4)) continue;
      const jitter = hash(zone,made,3,71), tree = made % 4 === 0;
      box(planters,[u,y+0.28,v],[2.8,0.56,2.8]);
      if (tree) {
        cylinder(trunks,[u,y+1.65,v],0.16,2.8,10);
        const crown = new THREE.SphereGeometry(1.65,12,8); crown.scale(1.0,1.15,1.0); crown.translate(u,y+3.75+jitter*0.35,v); greenery.push(crown); trees++;
      } else {
        const shrub = new THREE.SphereGeometry(1.25,10,7); shrub.scale(1.0,0.65+jitter*0.25,1.0); shrub.translate(u,y+1.10,v); greenery.push(shrub); shrubs++;
      }
      if (made % 7 === 2) { box(benches,[u+2.0,y+0.48,v],[0.55,0.16,2.2]); box(benches,[u+2.0,y+0.25,v],[0.38,0.50,1.8]); }
      if (zone === 0 && made % 9 === 4) { box(water,[u+3.3,y+0.07,v],[2.4,0.10,4.2]); waterFeatures++; }
      made++;
    }
  }
  // Only source-boundary edges receive balcony rails; internal interconnected volume joints remain open.
  for (const { ring,y } of definitions) for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, a = [ring[i],ring[i+1]], b = [ring[i+2],ring[i+3]], mid = [(a[0]+b[0])*0.5,(a[1]+b[1])*0.5];
    let outer = false;
    for (let j = 0; j < AIRSIDE_COMPLEX_RING.length - 2 && !outer; j += 2) {
      const c = [AIRSIDE_COMPLEX_RING[j],AIRSIDE_COMPLEX_RING[j+1]], d = [AIRSIDE_COMPLEX_RING[j+2],AIRSIDE_COMPLEX_RING[j+3]];
      const dx = d[0]-c[0], dz = d[1]-c[1], lengthSq = dx*dx+dz*dz || 1, t = Math.max(0,Math.min(1,((mid[0]-c[0])*dx+(mid[1]-c[1])*dz)/lengthSq));
      outer = Math.hypot(mid[0]-c[0]-dx*t,mid[1]-c[1]-dz*t) < 0.08;
    }
    if (!outer) continue;
    const { nx,nz,length,ry } = airsideEdgeOutward(ring,edge), cx = mid[0]+nx*0.08, cz = mid[1]+nz*0.08;
    quad(railGlass,[a[0]+nx*0.08,y+0.18,a[1]+nz*0.08],[b[0]+nx*0.08,y+0.18,b[1]+nz*0.08],
      [b[0]+nx*0.08,y+1.12,b[1]+nz*0.08],[a[0]+nx*0.08,y+1.12,a[1]+nz*0.08],[0.40,0.57,0.59]);
    box(rails,[cx,y+1.15,cz],[length+0.03,0.075,0.10],ry);
  }
  return { planters, greenery, trunks, water, benches, rails, railGlass, shrubs, trees, waterFeatures };
}
function paverTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512; const ctx = canvas.getContext('2d');
  const greys = ['#8d8e89','#999993','#a3a39c','#858883','#92958f','#a9a8a0','#7f827e','#9b9d96','#90918b'];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    ctx.fillStyle = greys[(x*3+y*5)%greys.length]; ctx.fillRect(x*64+1,y*64+1,62,62);
    ctx.fillStyle = 'rgba(255,255,255,0.055)'; ctx.fillRect(x*64+3,y*64+3,58,2);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(0.14,0.14); return texture;
}

export function buildAirside(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'AirsideFiveInterconnectedTextileVolumes'; group.userData.internalId = 'HK-B0019'; group.position.y = groundOffset; root.add(group);
  const origin = airsideLocalToWorld(0,0), model = new THREE.Group(); model.name = 'AirsideExactOsmFrameAndAuthoredInternalCuts';
  model.position.set(origin.x,0,origin.z); model.rotation.y = AIRSIDE_FRAME_ROTATION; group.add(model);
  const materials = {
    glass: new THREE.MeshStandardNodeMaterial({ metalness: 0.52, roughness: 0.19, envMapIntensity: 1.18, side: THREE.DoubleSide }),
    groundGlass: new THREE.MeshStandardNodeMaterial({ metalness: 0.34, roughness: 0.24, side: THREE.DoubleSide }),
    backing: new THREE.MeshStandardNodeMaterial({ roughness: 0.78, side: THREE.DoubleSide }),
    frame: new THREE.MeshStandardNodeMaterial({ metalness: 0.72, roughness: 0.31, side: THREE.DoubleSide }),
    fin: new THREE.MeshStandardNodeMaterial({ metalness: 0.70, roughness: 0.28 }),
    crown: new THREE.MeshStandardNodeMaterial({ metalness: 0.50, roughness: 0.39, side: THREE.DoubleSide }),
    roof: new THREE.MeshStandardNodeMaterial({ color: 0x384347, metalness: 0.16, roughness: 0.78, side: THREE.DoubleSide }),
    ivory: new THREE.MeshStandardNodeMaterial({ color: 0xd3d5cf, metalness: 0.08, roughness: 0.56 }),
    darkMetal: new THREE.MeshStandardNodeMaterial({ color: 0x354247, metalness: 0.66, roughness: 0.34 }),
    entryGlass: new THREE.MeshStandardNodeMaterial({ color: 0x789098, metalness: 0.22, roughness: 0.16, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide }),
    interior: new THREE.MeshStandardNodeMaterial({ color: 0x71644e, roughness: 0.72 }),
    warmLight: new THREE.MeshStandardNodeMaterial({ color: 0xe5d4ae, roughness: 0.38 }),
    planters: new THREE.MeshStandardNodeMaterial({ color: 0x686e69, roughness: 0.84 }),
    greenery: new THREE.MeshStandardNodeMaterial({ color: 0x315d3c, roughness: 0.94 }),
    trunks: new THREE.MeshStandardNodeMaterial({ color: 0x594c37, roughness: 0.95 }),
    water: new THREE.MeshStandardNodeMaterial({ color: 0x3f777e, metalness: 0.38, roughness: 0.19 }),
    pv: new THREE.MeshStandardNodeMaterial({ color: 0x173c50, metalness: 0.62, roughness: 0.24 }),
    pvLines: new THREE.MeshStandardNodeMaterial({ color: 0xa2b4b6, metalness: 0.72, roughness: 0.32 }),
    floor: new THREE.MeshStandardNodeMaterial({ map: paverTexture(), roughness: 0.88, metalness: 0.02, side: THREE.DoubleSide })
  };
  for (const key of ['glass','groundGlass','backing','frame','crown']) materials[key].colorNode = attribute('color','vec3');
  materials.fin.colorNode = attribute('color','vec3');
  materials.glass.emissiveNode = color(0x203b4b).mul(nightAmount()).mul(0.05)
    .add(color(0xffd6a2).mul(attribute('aLit','float')).mul(nightAmount()).mul(0.48));
  materials.groundGlass.emissiveNode = color(0xffce96).mul(attribute('aLit','float')).mul(nightAmount()).mul(0.44);
  materials.fin.emissiveNode = attribute('color','vec3').mul(nightAmount()).mul(0.25);
  materials.crown.emissiveNode = color(0x8fb7c4).mul(nightAmount()).mul(0.045);
  materials.frame.emissiveNode = color(0x9fc7d2).mul(nightAmount()).mul(0.06);
  materials.ivory.emissiveNode = color(0xffdbab).mul(nightAmount()).mul(0.10);
  materials.entryGlass.emissiveNode = color(0xffce99).mul(nightAmount()).mul(0.08);
  materials.interior.emissiveNode = color(0xffc47f).mul(nightAmount().mul(0.48).add(0.025));
  materials.warmLight.emissiveNode = color(0xffd096).mul(nightAmount().mul(1.5).add(0.01));
  materials.water.emissiveNode = color(0x80b7ba).mul(nightAmount()).mul(0.09);

  const floor = new THREE.Mesh(roofGeometry(AIRSIDE_COMPLEX_RING,() => -0.02),materials.floor); floor.name = 'AirsideNineGraniteGroundPaversBelowRoadSurface'; floor.receiveShadow = true; model.add(floor);
  const mallForecourt = new THREE.Mesh(roofGeometry(AIRSIDE_MALL_FORECOURT_RING,() => -0.02),materials.floor);
  mallForecourt.name = 'AirsideRetailSourceEntranceLevelGraniteForecourt'; mallForecourt.receiveShadow = true; model.add(mallForecourt);
  const volumes = [
    createCurtainVolume({ id:'main-podium',ring:AIRSIDE_MAIN_TOWER_RING,baseY:AIRSIDE_BASE_SOFFIT,occupiedY:AIRSIDE_MAIN_PODIUM_HEIGHT,topAt:() => AIRSIDE_MAIN_PODIUM_HEIGHT,courses:9,floorAt:(c) => lerp(AIRSIDE_BASE_SOFFIT,AIRSIDE_MAIN_PODIUM_HEIGHT,c/9),fluted:false }),
    createCurtainVolume({ id:'main-tower',ring:AIRSIDE_MAIN_TOWER_RING,baseY:AIRSIDE_MAIN_PODIUM_HEIGHT,occupiedY:AIRSIDE_CTBUH_OCCUPIED_HEIGHT,topAt:airsideMainRoofY,courses:AIRSIDE_MAIN_VISUAL_COURSES,floorAt:airsideMainFloorY,cutAt:airsideMainCutY }),
    createCurtainVolume({ id:'secondary-podium',ring:AIRSIDE_SECONDARY_RING,baseY:AIRSIDE_BASE_SOFFIT,occupiedY:AIRSIDE_MAIN_PODIUM_HEIGHT,topAt:() => AIRSIDE_MAIN_PODIUM_HEIGHT,courses:9,floorAt:(c) => lerp(AIRSIDE_BASE_SOFFIT,AIRSIDE_MAIN_PODIUM_HEIGHT,c/9),fluted:false }),
    createCurtainVolume({ id:'secondary-tower',ring:AIRSIDE_SECONDARY_RING,baseY:AIRSIDE_MAIN_PODIUM_HEIGHT,occupiedY:AIRSIDE_SECONDARY_OCCUPIED_HEIGHT,topAt:airsideSecondaryRoofY,courses:AIRSIDE_SECONDARY_VISUAL_COURSES,floorAt:airsideSecondaryFloorY,cutAt:(u,v) => 61-0.13*u+0.035*v }),
    createCurtainVolume({ id:'retail-atrium',ring:AIRSIDE_ATRIUM_RING,baseY:AIRSIDE_BASE_SOFFIT,occupiedY:AIRSIDE_ATRIUM_HEIGHT,topAt:() => AIRSIDE_ATRIUM_HEIGHT,courses:9,floorAt:(c) => lerp(AIRSIDE_BASE_SOFFIT,AIRSIDE_ATRIUM_HEIGHT,c/9),cutAt:(u,v) => 27-0.055*u+0.02*v }),
    ...AIRSIDE_MIDDLE_RINGS.map((ring,index) => createCurtainVolume({ id:`middle-${index}`,ring,baseY:AIRSIDE_BASE_SOFFIT,occupiedY:AIRSIDE_MIDDLE_HEIGHT,topAt:() => AIRSIDE_MIDDLE_HEIGHT,courses:5,floorAt:(c) => lerp(AIRSIDE_BASE_SOFFIT,AIRSIDE_MIDDLE_HEIGHT,c/5),cutAt:(u,v) => 20-0.035*u+0.015*v })),
    createCurtainVolume({ id:'south-riverfront',ring:AIRSIDE_SOUTH_RING,baseY:AIRSIDE_BASE_SOFFIT,occupiedY:AIRSIDE_SOUTH_HEIGHT,topAt:() => AIRSIDE_SOUTH_HEIGHT,courses:3,floorAt:(c) => lerp(AIRSIDE_BASE_SOFFIT,AIRSIDE_SOUTH_HEIGHT,c/3),cutAt:(u,v) => 13-0.02*u+0.01*v })
  ];
  for (const volume of volumes) {
    const vgroup = new THREE.Group(); vgroup.name = `AirsideVolume-${volume.id}`; model.add(vgroup);
    meshStore(vgroup,volume.backing,materials.backing,`Airside-${volume.id}-OpaqueCurtainWallBacking`);
    meshStore(vgroup,volume.glass,materials.glass,`Airside-${volume.id}-FourRadiusFlutedAndFlatGlass`);
    meshStore(vgroup,volume.crown,materials.crown,`Airside-${volume.id}-DiagonalCutsAndSlopingCrown`);
    meshStore(vgroup,volume.frames,materials.frame,`Airside-${volume.id}-CurvedTransomsAndCoping`);
    meshStore(vgroup,volume.louvres,materials.frame,`Airside-${volume.id}-MetalLouvrePanelsAndCrownBlades`);
    for (let family = 0; family < 4; family++) merged(vgroup,volume.fins[family],materials.fin,`Airside-${volume.id}-VariableDepthLedFins-${family+1}`);
    merged(vgroup,volume.roofParts,materials.roof,`Airside-${volume.id}-RoofDeck`);
  }
  const ground = createGroundBase();
  meshStore(model,ground.backing,materials.backing,'AirsidePorousGroundLobbyBacking');
  meshStore(model,ground.glass,materials.groundGlass,'AirsideGroundGlazingOutsideCarriageways');
  merged(model,ground.frames,materials.frame,'AirsideGroundTransomsOutsideCarriageways');
  merged(model,ground.lintels,materials.darkMetal,'AirsideServiceRoadPortalLintels');
  merged(model,ground.columns,materials.ivory,'AirsideRoundGroundColumnsClearOfCarriageways');
  const office = createOfficeEntrance(model,materials), mall = createMallEntrance(model,materials);

  const pv = createPhotovoltaic([
    { id:'main',ring:AIRSIDE_MAIN_TOWER_RING,heightAt:airsideMainRoofY,target:110 },
    { id:'secondary',ring:AIRSIDE_SECONDARY_RING,heightAt:airsideSecondaryRoofY,target:90 },
    { id:'middle',ring:AIRSIDE_MIDDLE_RINGS[0],heightAt:() => AIRSIDE_MIDDLE_HEIGHT,target:220 },
    { id:'south',ring:AIRSIDE_SOUTH_RING,heightAt:() => AIRSIDE_SOUTH_HEIGHT,target:120 }
  ]);
  merged(model,pv.frames,materials.darkMetal,'AirsidePhotovoltaicPanelSupportFrames');
  merged(model,pv.panels,materials.pv,'AirsideRoofAndPodiumPhotovoltaicFarm');
  merged(model,pv.cellLines,materials.pvLines,'AirsidePhotovoltaicCellBusBars',false);
  const gardens = createGardens();
  merged(model,gardens.planters,materials.planters,'AirsideNativeRoofGardenPlanters');
  merged(model,gardens.trunks,materials.trunks,'AirsideNativeCamphorAndHawthornTrunks');
  merged(model,gardens.greenery,materials.greenery,'AirsideNativeTreesAndShrubs');
  merged(model,gardens.water,materials.water,'AirsideRoofGardenWaterFeatures',false);
  merged(model,gardens.benches,materials.ivory,'AirsideRoofGardenBenches');
  meshStore(model,gardens.railGlass,materials.entryGlass,'AirsideOuterTerraceGlassBalustrades',false);
  merged(model,gardens.rails,materials.darkMetal,'AirsideOuterTerraceHandrails');

  const colliders = [
    ...ground.colliders, ...volumes.flatMap((volume) => volume.colliders), ...office.colliders, ...mall.colliders
  ];
  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }
  const grounds = { plaza: groundOffset + AIRSIDE_PLAZA_TOP };
  const landmark = { name: AIRSIDE_SITE.name, englishName: AIRSIDE_SITE.englishName,
    position: { x: AIRSIDE_SITE.x, y: groundOffset, z: AIRSIDE_SITE.z }, radius: 178, height: AIRSIDE_HEIGHT };
  const sum = (key) => volumes.reduce((total,volume) => total + volume[key],0);
  const stats = {
    airsideGroundOffset: groundOffset, airsideLandmarks: 1,
    airsideOsmHeight: AIRSIDE_OSM_HEIGHT, airsideOsmLevels: AIRSIDE_OSM_LEVELS, airsideOsmUndergroundLevels: AIRSIDE_OSM_UNDERGROUND_LEVELS,
    airsideOfficialHeight: AIRSIDE_OFFICIAL_HEIGHT, airsideOfficialLevels: AIRSIDE_OFFICIAL_LEVELS, airsideHeight: AIRSIDE_HEIGHT,
    airsideCtbuhHeight: AIRSIDE_CTBUH_HEIGHT, airsideCtbuhToTipHeight: AIRSIDE_CTBUH_TO_TIP_HEIGHT,
    airsideCtbuhOccupiedHeight: AIRSIDE_CTBUH_OCCUPIED_HEIGHT, airsideCtbuhLevels: AIRSIDE_CTBUH_LEVELS,
    airsideCtbuhUndergroundLevels: AIRSIDE_CTBUH_UNDERGROUND_LEVELS, airsideCtbuhCompletionYear: AIRSIDE_CTBUH_COMPLETION_YEAR,
    airsideOpeningDate: AIRSIDE_OPENING_DATE, airsideRoofDirectionDegrees: AIRSIDE_ROOF_DIRECTION_DEGREES, airsideRoofRise: AIRSIDE_ROOF_RISE,
    airsideSecondaryLevels: AIRSIDE_SECONDARY_LEVELS, airsideRetailLevels: AIRSIDE_RETAIL_LEVELS,
    airsideTotalGfa: AIRSIDE_TOTAL_GFA, airsideOfficeGfa: AIRSIDE_OFFICE_GFA, airsideRetailGfa: AIRSIDE_RETAIL_GFA,
    airsidePvSourceArea: AIRSIDE_PV_AREA, airsideEducationalGardenArea: AIRSIDE_EDUCATIONAL_GARDEN_AREA,
    airsideSoftLandscapeRatio: AIRSIDE_SOFT_LANDSCAPE_RATIO,
    airsideSourceVertices: AIRSIDE_OSM_SOURCE.geometry.length - 1,
    airsideOsmWayVersion: AIRSIDE_SITE.source.version, airsideMassingZones: 5,
    airsideUpperVolumeSolids: AIRSIDE_UPPER_VOLUME_RINGS.length, airsideCurtainWallSections: volumes.length,
    airsideMainVisualCourses: AIRSIDE_MAIN_VISUAL_COURSES, airsideSecondaryVisualCourses: AIRSIDE_SECONDARY_VISUAL_COURSES,
    airsideGlassPanels: sum('glassPanels'), airsideFlutedPanels: sum('flutedPanels'), airsideFlatPanels: sum('flatPanels'),
    airsideMetalLouvrePanels: sum('louvrePanels'), airsideCurtainWallFrames: sum('frameMembers'), airsideFacadeFins: sum('finCount'),
    airsideCrownPanels: sum('crownPanels'), airsideGroundPanels: ground.groundPanels, airsideGroundPortals: ground.groundPortals,
    airsideGroundEntranceBays: ground.groundEntranceBays, airsideGroundPortalWays: ground.portalWays.length, airsideGroundColumns: ground.columnSites.length,
    airsidePhotovoltaicPanels: pv.count, airsideRoofTrees: gardens.trees, airsideRoofShrubs: gardens.shrubs,
    airsideRoofWaterFeatures: gardens.waterFeatures, airsideEntrances: 2, airsideOfficeDoorNodes: AIRSIDE_OFFICE_DOOR_NODES.length,
    airsideSurfaceAccessWays: AIRSIDE_SURFACE_ACCESS_WAYS.length, airsideTunnelWays: AIRSIDE_TUNNEL_WAYS.length,
    airsideRoadVehicleClearance: AIRSIDE_ROAD_VEHICLE_CLEARANCE, airsideColliders: colliders.length
  };
  group.userData.stats = stats;
  return { group, model, colliders, landmarks: [landmark], stats, groundOffset, grounds, plazaTop: grounds.plaza,
    groundHeightAt: (x,z,fallback) => airsideGroundHeightAt(x,z,fallback,grounds) };
}
