import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  ONE_IFC_SITE, ONE_IFC_OSM_SOURCE, ONE_IFC_LOCAL_RING,
  ONE_IFC_OSM_HEIGHT, ONE_IFC_HEIGHT, ONE_IFC_TO_TIP_HEIGHT, ONE_IFC_OSM_LEVELS,
  ONE_IFC_CTBUH_LEVELS, ONE_IFC_CTBUH_UNDERGROUND_LEVELS, ONE_IFC_CTBUH_COMPLETION_YEAR,
  ONE_IFC_PUBLISHED_COMPLETION_YEAR, ONE_IFC_PUBLISHED_LEVELS, ONE_IFC_INTERASIA_LEVELS,
  ONE_IFC_CTBUH_TOWER_GFA, ONE_IFC_INTERASIA_GFA_SQFT, ONE_IFC_TYPICAL_LETTABLE_SQFT,
  ONE_IFC_PASSENGER_LIFTS, ONE_IFC_CARGO_LIFTS, ONE_IFC_TRADING_FLOORS, ONE_IFC_STRUCTURE,
  ONE_IFC_PLAZA_TOP, ONE_IFC_PODIUM_TOP, ONE_IFC_GROUND_SOFFIT, ONE_IFC_PANEL_WIDTH,
  ONE_IFC_OFFICE_PANEL_HEIGHT, ONE_IFC_TRADING_PANEL_HEIGHT, ONE_IFC_VISUAL_COURSES,
  ONE_IFC_GLAZED_CROWN_TOP, ONE_IFC_DRIVETHROUGH_EDGE, ONE_IFC_ENTRANCE_EDGE,
  ONE_IFC_BELT_LEVELS, ONE_IFC_BELT_HEIGHT, ONE_IFC_TIERS, ONE_IFC_CURTAIN_TIERS,
  ONE_IFC_OPEN_CROWN, ONE_IFC_SETBACK_COUNT, ONE_IFC_ENTRANCE,
  ONE_IFC_ENTRANCE_FORECOURT_WIDTH, ONE_IFC_ENTRANCE_FORECOURT_DEPTH,
  oneIfcScaleAt, oneIfcRingAtScale, oneIfcEdgeOutward, oneIfcRingColliders,
  oneIfcLocalCollider, oneIfcFrameCollider, oneIfcGroundHeightAt
} from './one-ifc-architecture.js';

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
function box(parts, center, size, ry = 0) {
  const geometry = new THREE.BoxGeometry(...size); if (ry) geometry.rotateY(ry); geometry.translate(...center); parts.push(geometry); return geometry;
}
function cylinder(parts, center, radius, height, segments = 20) {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, segments); geometry.translate(...center); parts.push(geometry); return geometry;
}
function beam(parts, a, b, width = 0.12, depth = width) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start), length = direction.length();
  if (length < 0.001) return null;
  const geometry = new THREE.BoxGeometry(width, length, depth);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  geometry.translate(...start.add(end).multiplyScalar(0.5).toArray()); parts.push(geometry); return geometry;
}
function edgePoint(ring, edge, t, y, offset = 0) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const { nx, nz } = oneIfcEdgeOutward(ring, edge);
  return [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
}
function edgeBox(parts, ring, edge, t, y, offset, width, height, depth) {
  const p = edgePoint(ring, edge, t, y, offset), { ry } = oneIfcEdgeOutward(ring, edge);
  return box(parts, p, [width, height, depth], ry);
}
function segmentCollider(ring, edge, t0, t1, minY, maxY, depth = 0.42) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const { ry, length } = oneIfcEdgeOutward(ring, edge), tm = (t0 + t1) * 0.5;
  return oneIfcLocalCollider(lerp(ax, bx, tm), lerp(az, bz, tm), length * (t1 - t0), depth, minY, maxY, ONE_IFC_SITE.ry + ry);
}
function roofGeometry(ring, y) {
  const shape = new THREE.Shape();
  for (let i = 0; i < ring.length - 2; i += 2) { const x = ring[i], z = -ring[i + 1]; if (i === 0) shape.moveTo(x, z); else shape.lineTo(x, z); }
  shape.closePath(); const geometry = new THREE.ShapeGeometry(shape); geometry.rotateX(-Math.PI / 2); geometry.translate(0, y, 0); return geometry;
}

// César Pelli / Rocco's stepped-square, all-steel tower: unitized pilaster facade, fritted spandrels and real setbacks.
function createCurtainWall() {
  const vision = store(), spandrel = store(), backing = store(), louvres = store();
  const fins = [], transoms = [], ledges = [], colliders = [];
  let glassPanels = 0, spandrelPanels = 0, verticalFins = 0, horizontalTransoms = 0;
  for (const tier of ONE_IFC_CURTAIN_TIERS) {
    const bottom = oneIfcRingAtScale(tier.bottomScale), top = oneIfcRingAtScale(tier.topScale);
    const midpointRing = oneIfcRingAtScale((tier.bottomScale + tier.topScale) * 0.5);
    colliders.push(...oneIfcRingColliders(midpointRing, tier.y0, tier.y1));
    ledges.push(roofGeometry(top, tier.y1 + 0.015));
    for (let edge = 0; edge < ONE_IFC_LOCAL_RING.length / 2 - 1; edge++) {
      const i = edge * 2, baseLength = Math.hypot(ONE_IFC_LOCAL_RING[i + 2] - ONE_IFC_LOCAL_RING[i], ONE_IFC_LOCAL_RING[i + 3] - ONE_IFC_LOCAL_RING[i + 1]);
      const bays = Math.max(1, Math.round(baseLength / ONE_IFC_PANEL_WIDTH));
      const point = (t, y, offset = 0.035) => {
        const ratio = (y - tier.y0) / (tier.y1 - tier.y0);
        // Interpolate explicitly between the two rings so a tier never inherits the preceding tier's setback scale.
        const j = edge * 2, x = lerp(bottom[j], top[j], ratio), z = lerp(bottom[j + 1], top[j + 1], ratio);
        const bx = lerp(bottom[j + 2], top[j + 2], ratio), bz = lerp(bottom[j + 3], top[j + 3], ratio);
        const { nx, nz } = oneIfcEdgeOutward(ONE_IFC_LOCAL_RING, edge);
        return [lerp(x, bx, t) + nx * offset, y, lerp(z, bz, t) + nz * offset];
      };
      quad(backing, point(0, tier.y0, -0.16), point(1, tier.y0, -0.16), point(1, tier.y1, -0.16), point(0, tier.y1, -0.16), [0.035, 0.055, 0.065]);
      for (let course = 0; course < tier.courses; course++) {
        const y0 = lerp(tier.y0, tier.y1, course / tier.courses), y1 = lerp(tier.y0, tier.y1, (course + 1) / tier.courses);
        for (let bay = 0; bay < bays; bay++) {
          const t0 = bay / bays + 0.0007, t1 = (bay + 1) / bays - 0.0007, variation = hash(edge, bay, course, tier.y0);
          const lit = hash(edge, bay, course, 93) > 0.875 ? 0.15 + variation * 0.62 : 0;
          quad(vision, point(t0, y0 + 1.18), point(t1, y0 + 1.18), point(t1, y1 - 0.16), point(t0, y1 - 0.16),
            mix([0.075, 0.145, 0.175], [0.26, 0.38, 0.41], 0.20 + variation * 0.58), lit); glassPanels++;
          quad(spandrel, point(t0, y0 + 0.16, 0.045), point(t1, y0 + 0.16, 0.045), point(t1, y0 + 1.03, 0.045), point(t0, y0 + 1.03, 0.045),
            mix([0.25, 0.32, 0.34], [0.48, 0.55, 0.55], 0.22 + variation * 0.46)); spandrelPanels++;
        }
        beam(transoms, point(0, y0 + 0.10, 0.13), point(1, y0 + 0.10, 0.13), 0.10, 0.20); horizontalTransoms++;
        beam(transoms, point(0, y0 + 1.10, 0.12), point(1, y0 + 1.10, 0.12), 0.075, 0.16); horizontalTransoms++;
      }
      beam(transoms, point(0, tier.y1 - 0.06, 0.13), point(1, tier.y1 - 0.06, 0.13), 0.11, 0.20); horizontalTransoms++;
      for (let bay = 0; bay <= bays; bay++) {
        const t = bay / bays, main = bay % 4 === 0;
        beam(fins, point(t, tier.y0, 0.17), point(t, tier.y1, 0.17), main ? 0.13 : 0.055, main ? 0.40 : 0.22); verticalFins++;
      }
    }
  }
  // Dark mechanical / refuge belts and glass louvres are separate geometry, not a painted stripe on a box.
  for (const level of ONE_IFC_BELT_LEVELS) {
    const y0 = level - ONE_IFC_BELT_HEIGHT * 0.5, y1 = level + ONE_IFC_BELT_HEIGHT * 0.5;
    const lower = oneIfcRingAtScale(oneIfcScaleAt(y0)), upper = oneIfcRingAtScale(oneIfcScaleAt(y1));
    for (let edge = 0; edge < lower.length / 2 - 1; edge++) {
      const j = edge * 2, a = [lower[j], lower[j + 1], lower[j + 2], lower[j + 3], lower[j], lower[j + 1]];
      const b = [upper[j], upper[j + 1], upper[j + 2], upper[j + 3], upper[j], upper[j + 1]];
      const singlePoint = (ring, t, y, offset = 0.08) => edgePoint(ring, 0, t, y, offset);
      const fullPoint = (ring, t, y, offset = 0.08) => edgePoint(ring, edge, t, y, offset);
      quad(louvres, singlePoint(a, 0, y0), singlePoint(a, 1, y0), singlePoint(b, 1, y1), singlePoint(b, 0, y1), [0.025, 0.040, 0.047]);
      for (let y = y0 + 0.20; y < y1 - 0.08; y += 0.42) {
        const ring = oneIfcRingAtScale(oneIfcScaleAt(y));
        quad(louvres, fullPoint(ring, 0, y, 0.12), fullPoint(ring, 1, y, 0.12),
          fullPoint(ring, 1, y + 0.075, 0.12), fullPoint(ring, 0, y + 0.075, 0.12), [0.16, 0.21, 0.22]);
      }
    }
  }
  return { vision, spandrel, backing, louvres, fins, transoms, ledges, colliders,
    glassPanels, spandrelPanels, verticalFins, horizontalTransoms };
}

function createOpenCrown() {
  const plates = store(), rails = [], plant = [], plantLouvres = [], colliders = [];
  let crownFins = 0, crownPlates = 0;
  for (let edge = 0; edge < ONE_IFC_LOCAL_RING.length / 2 - 1; edge++) {
    const i = edge * 2, length = Math.hypot(ONE_IFC_LOCAL_RING[i + 2] - ONE_IFC_LOCAL_RING[i], ONE_IFC_LOCAL_RING[i + 3] - ONE_IFC_LOCAL_RING[i + 1]);
    const bays = Math.max(1, Math.round(length / (ONE_IFC_PANEL_WIDTH * 2)));
    const point = (t, y, offset = 0.05) => edgePoint(oneIfcRingAtScale(oneIfcScaleAt(y)), edge, t, y, offset);
    for (let bay = 0; bay <= bays; bay++) {
      const t = bay / bays; beam(rails, point(t, 202, 0.12), point(t, 209.90, 0.12), 0.14, 0.38); crownFins++;
    }
    for (let bay = 0; bay < bays; bay++) {
      const tm = (bay + 0.5) / bays, dt = 0.29 / bays;
      triangle(plates, point(tm - dt, 202, 0.09), point(tm + dt, 202, 0.09), point(tm, 210, 0.09),
        mix([0.55, 0.62, 0.62], [0.82, 0.86, 0.82], hash(edge, bay, 71) * 0.45)); crownPlates++;
    }
    beam(rails, point(0, 202, 0.10), point(1, 202, 0.10), 0.22, 0.34);
    beam(rails, point(0, 206, 0.10), point(1, 206, 0.10), 0.14, 0.28);
  }
  box(plant, [0, 203.45, 0], [18, 3.1, 16]);
  box(plant, [0, 205.08, 0], [18.5, 0.22, 16.5]);
  for (let x = -8.5; x <= 8.5; x += 0.65) box(plantLouvres, [x, 203.5, 8.04], [0.22, 2.5, 0.10]);
  colliders.push(oneIfcLocalCollider(0, 0, 18, 16, 202, 205.2));
  return { plates, rails, plant, plantLouvres, colliders, crownFins, crownPlates };
}

function createPodium() {
  const glass = store(), backing = store(), stone = store();
  const frames = [], columns = [], colliders = [];
  let glassPanels = 0, portalBays = 0, columnCount = 0;
  for (let edge = 0; edge < ONE_IFC_LOCAL_RING.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ONE_IFC_LOCAL_RING[i], az = ONE_IFC_LOCAL_RING[i + 1], bx = ONE_IFC_LOCAL_RING[i + 2], bz = ONE_IFC_LOCAL_RING[i + 3];
    const { length } = oneIfcEdgeOutward(ONE_IFC_LOCAL_RING, edge), bays = Math.max(1, Math.ceil(length / 3.22));
    const point = (t, y, offset = 0.035) => edgePoint(ONE_IFC_LOCAL_RING, edge, t, y, offset);
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays, t1 = (bay + 1) / bays, tm = (t0 + t1) * 0.5;
      const lx = lerp(ax, bx, tm), lz = lerp(az, bz, tm);
      const entranceGap = edge === ONE_IFC_ENTRANCE_EDGE && Math.hypot(lx - ONE_IFC_ENTRANCE.localX, lz - ONE_IFC_ENTRANCE.localZ) < 6.5;
      if (edge === ONE_IFC_DRIVETHROUGH_EDGE || entranceGap) { portalBays++; continue; }
      const variation = hash(edge, bay, 14);
      quad(backing, point(t0, 0.12, -0.28), point(t1, 0.12, -0.28), point(t1, 12, -0.28), point(t0, 12, -0.28), [0.11, 0.095, 0.075], 0.22);
      quad(glass, point(t0 + 0.001, 0.16), point(t1 - 0.001, 0.16), point(t1 - 0.001, 11.88), point(t0 + 0.001, 11.88),
        mix([0.14, 0.24, 0.27], [0.32, 0.43, 0.44], variation * 0.62), 0.08 + variation * 0.18); glassPanels++;
      colliders.push(segmentCollider(ONE_IFC_LOCAL_RING, edge, t0, t1, 0, 12));
      for (const y of [4, 8, 11.9]) beam(frames, point(t0, y, 0.10), point(t1, y, 0.10), 0.10, 0.18);
      beam(frames, point(t0, 0.12, 0.10), point(t0, 12, 0.10), 0.11, 0.22);
    }
    // The upper soffit remains continuous over the drive-through; only ground-level glazing and colliders open.
    quad(stone, point(0, 12, 0.02), point(1, 12, 0.02), point(1, 14, 0.02), point(0, 14, 0.02), [0.48, 0.53, 0.52]);
    edgeBox(frames, ONE_IFC_LOCAL_RING, edge, 0.5, 12.05, 0.13, length + 0.03, 0.18, 0.28);
    edgeBox(frames, ONE_IFC_LOCAL_RING, edge, 0.5, 13.95, 0.13, length + 0.03, 0.18, 0.28);
    colliders.push(...oneIfcRingColliders([ax, az, bx, bz, ax, az], 12, 14));
  }
  for (const [edge, t] of [[4,0.5],[8,0.5],[12,0.5],[16,0.5],[20,0.5],[28,0.5],[24,0.15],[24,0.85]]) {
    const p = edgePoint(ONE_IFC_LOCAL_RING, edge, t, 6, -0.85);
    cylinder(columns, p, 0.48, 12, 20); columnCount++;
    colliders.push(oneIfcLocalCollider(p[0], p[2], 1.12, 1.12, 0, 12));
  }
  return { glass, backing, stone, frames, columns, colliders, glassPanels, portalBays, columnCount };
}

function textPlane(text, width, height, fontSize = 54) {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 160;
  const context = canvas.getContext('2d'); context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#eef3ef'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.font = `600 ${fontSize}px Arial, sans-serif`; context.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material); return mesh;
}
function ifcRibbons() {
  const group = new THREE.Group(); group.name = 'OneIfcThreeVectorRibbonLogo';
  const colors = [0x762c91, 0xc62f45, 0xe1b82e];
  for (let i = 0; i < 3; i++) {
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.bezierCurveTo(0.55, 0.35, 1.10, 0.35, 1.65, 0);
    shape.lineTo(1.65, 0.16); shape.bezierCurveTo(1.10, 0.51, 0.55, 0.51, 0, 0.16); shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.38, metalness: 0.38, side: THREE.DoubleSide }));
    mesh.position.set(-0.82, i * 0.15, i * 0.012); mesh.rotation.z = [-0.25, 0.36, 1.02][i]; group.add(mesh);
  }
  return group;
}
function createEntrance(materials) {
  const group = new THREE.Group(); group.name = 'OneIfcHarbourViewStreetEntrance';
  group.position.set(ONE_IFC_ENTRANCE.localX, ONE_IFC_PLAZA_TOP, ONE_IFC_ENTRANCE.localZ);
  group.rotation.y = ONE_IFC_ENTRANCE.ry - ONE_IFC_SITE.ry;
  const stone = [], frames = [], glass = [], interior = [], lights = [], forecourt = [], colliders = [];
  box(forecourt, [0, -0.06, ONE_IFC_ENTRANCE_FORECOURT_DEPTH * 0.5], [ONE_IFC_ENTRANCE_FORECOURT_WIDTH, 0.12, ONE_IFC_ENTRANCE_FORECOURT_DEPTH]);
  box(interior, [0, 4.2, -0.36], [12.4, 8.4, 0.18]);
  box(glass, [0, 4.2, -0.10], [12.2, 8.2, 0.08]);
  for (const x of [-6.25, 6.25]) { box(stone, [x, 4.6, 0], [0.50, 9.2, 0.65]); colliders.push(oneIfcFrameCollider(ONE_IFC_ENTRANCE, x, 0, 0.60, 0.80, 0, 9.2)); }
  box(stone, [0, 8.85, 0], [13, 0.70, 0.65]);
  for (const x of [-4.5, -1.5, 1.5, 4.5]) {
    box(frames, [x, 2.1, 0.04], [0.09, 4.2, 0.14]);
    for (const dx of [-0.18, 0.18]) box(frames, [x + dx, 1.25, 0.16], [0.045, 0.70, 0.08]);
  }
  box(glass, [0, 4.65, 1.75], [14, 0.16, 4.1]);
  box(frames, [0, 4.60, 3.78], [14.2, 0.22, 0.16]);
  for (const x of [-5.4, 5.4]) beam(frames, [x, 4.75, 3.4], [x, 8.4, 0.1], 0.065);
  for (const x of [-4.5, 0, 4.5]) box(lights, [x, 4.52, 1.8], [1.2, 0.05, 0.16]);
  colliders.push(oneIfcFrameCollider(ONE_IFC_ENTRANCE, 0, -0.10, 12.4, 0.40, 0, 8.4));
  merged(group, forecourt, materials.plaza, 'OneIfcHarbourViewLevelForecourt');
  merged(group, frames, materials.silver, 'OneIfcEntranceFramesAndSuspension');
  merged(group, stone, materials.stone, 'OneIfcEntranceStoneColumns');
  merged(group, glass, materials.entranceGlass, 'OneIfcEntranceGlassAndSuspendedCanopy');
  merged(group, interior, materials.interior, 'OneIfcWarmLobbyInterior', false);
  merged(group, lights, materials.light, 'OneIfcEntranceCanopyLights', false);
  const sign = textPlane('ONE ifc', 5.4, 1.1, 62); sign.position.set(1.4, 7.25, 0.36); group.add(sign);
  const address = textPlane('1 HARBOUR VIEW STREET', 6.2, 0.65, 35); address.position.set(1.4, 6.45, 0.36); group.add(address);
  const ribbons = ifcRibbons(); ribbons.position.set(-4.25, 6.75, 0.38); ribbons.scale.setScalar(0.85); group.add(ribbons);
  return { group, colliders };
}

export function buildOneInternationalFinanceCentre(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'OneInternationalFinanceCentre';
  group.userData.landmark = 'one-international-finance-centre'; group.userData.osm = { type: 'way', id: ONE_IFC_OSM_SOURCE.id };
  group.position.set(ONE_IFC_SITE.x, groundOffset, ONE_IFC_SITE.z); group.rotation.y = ONE_IFC_SITE.ry; root.add(group);
  const facade = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: 0.43, roughness: 0.27, side: THREE.DoubleSide });
  facade.colorNode = attribute('color'); facade.emissiveNode = color(0xffd7a0).mul(attribute('aLit')).mul(nightAmount());
  const dark = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: 0.38, roughness: 0.40, side: THREE.DoubleSide });
  dark.colorNode = attribute('color'); dark.emissiveNode = color(0x8ca2a4).mul(attribute('aLit')).mul(nightAmount()).mul(0.25);
  const silver = new THREE.MeshStandardNodeMaterial({ color: 0xbec8c6, metalness: 0.72, roughness: 0.31 });
  silver.emissiveNode = color(0xc4d2ce).mul(nightAmount()).mul(0.075);
  const crown = new THREE.MeshStandardNodeMaterial({ color: 0xccd5d0, metalness: 0.70, roughness: 0.30 });
  crown.emissiveNode = color(0xe4eee4).mul(nightAmount()).mul(0.65);
  const crownPlate = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: 0.67, roughness: 0.32, side: THREE.DoubleSide });
  crownPlate.colorNode = attribute('color'); crownPlate.emissiveNode = color(0xdce8e2).mul(nightAmount()).mul(0.52);
  const stone = new THREE.MeshStandardMaterial({ color: 0xa7afab, roughness: 0.60, metalness: 0.24 });
  const plazaMaterial = new THREE.MeshStandardMaterial({ color: 0xa8aca5, roughness: 0.90, metalness: 0.03 });
  const entranceGlass = new THREE.MeshStandardNodeMaterial({ color: 0x36545d, roughness: 0.23, metalness: 0.38, side: THREE.DoubleSide });
  entranceGlass.emissiveNode = color(0xffd7a0).mul(nightAmount()).mul(0.16);
  const interior = new THREE.MeshStandardNodeMaterial({ color: 0x5d4c38, roughness: 0.78 });
  interior.emissiveNode = color(0xffc986).mul(nightAmount()).mul(0.44);
  const light = new THREE.MeshStandardNodeMaterial({ color: 0xffe0a8 }); light.emissiveNode = color(0xffd59a).mul(nightAmount()).mul(2.2);
  const materials = { silver, stone, entranceGlass, interior, light, plaza: plazaMaterial };

  // Inset paving leaves the generated drive-through carriageway and its formal markings visible.
  const plaza = new THREE.Mesh(roofGeometry(oneIfcRingAtScale(0.92), ONE_IFC_PLAZA_TOP), plazaMaterial);
  plaza.name = 'OneIfcInsetSteppedSquarePlaza'; plaza.receiveShadow = true; group.add(plaza);
  const podium = createPodium();
  meshStore(group, podium.backing, dark, 'OneIfcGroundLobbyBacking');
  meshStore(group, podium.glass, facade, 'OneIfcGroundLobbyGlass');
  meshStore(group, podium.stone, silver, 'OneIfcContinuousUpperPodiumSoffit');
  merged(group, podium.frames, silver, 'OneIfcGroundLobbyFrames');
  merged(group, podium.columns, stone, 'OneIfcGroundRoundStructuralColumns');
  const curtain = createCurtainWall();
  meshStore(group, curtain.backing, dark, 'OneIfcTaperedTowerBacking');
  meshStore(group, curtain.vision, facade, 'OneIfcDoubleGlazedVisionPanels');
  meshStore(group, curtain.spandrel, facade, 'OneIfcFrittedSpandrelPanels');
  meshStore(group, curtain.louvres, dark, 'OneIfcMechanicalBeltsAndGlassLouvres');
  merged(group, curtain.fins, silver, 'OneIfcUnitizedPilasterFins');
  merged(group, curtain.transoms, silver, 'OneIfcCurtainWallTransoms');
  merged(group, curtain.ledges, silver, 'OneIfcSetbackAndCrownLedges');
  const openCrown = createOpenCrown();
  meshStore(group, openCrown.plates, crownPlate, 'OneIfcOpenCrownTriangularFinials');
  merged(group, openCrown.rails, crown, 'OneIfcOpenCrownRibsAndRails');
  merged(group, openCrown.plant, stone, 'OneIfcRoofPlantEnclosure');
  merged(group, openCrown.plantLouvres, silver, 'OneIfcRoofPlantLouvres');
  const entrance = createEntrance(materials); group.add(entrance.group);
  const colliders = [...podium.colliders, ...curtain.colliders, ...openCrown.colliders, ...entrance.colliders];
  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }
  const grounds = { plaza: groundOffset + ONE_IFC_PLAZA_TOP };
  const landmark = { id: 'one-international-finance-centre', name: ONE_IFC_SITE.name,
    position: { x: ONE_IFC_SITE.x, y: groundOffset, z: ONE_IFC_SITE.z }, radius: 72, height: ONE_IFC_TO_TIP_HEIGHT };
  const stats = {
    oneIfcGroundOffset: groundOffset, oneIfcLandmarks: 1, oneIfcOsmHeight: ONE_IFC_OSM_HEIGHT, oneIfcOsmLevels: ONE_IFC_OSM_LEVELS,
    oneIfcHeight: ONE_IFC_HEIGHT, oneIfcToTipHeight: ONE_IFC_TO_TIP_HEIGHT, oneIfcCtbuhLevels: ONE_IFC_CTBUH_LEVELS,
    oneIfcCtbuhUndergroundLevels: ONE_IFC_CTBUH_UNDERGROUND_LEVELS, oneIfcCtbuhCompletionYear: ONE_IFC_CTBUH_COMPLETION_YEAR,
    oneIfcPublishedCompletionYear: ONE_IFC_PUBLISHED_COMPLETION_YEAR, oneIfcPublishedLevels: ONE_IFC_PUBLISHED_LEVELS,
    oneIfcInterasiaLevels: ONE_IFC_INTERASIA_LEVELS, oneIfcCtbuhTowerGfa: ONE_IFC_CTBUH_TOWER_GFA,
    oneIfcInterasiaGfaSqft: ONE_IFC_INTERASIA_GFA_SQFT, oneIfcTypicalLettableSqft: ONE_IFC_TYPICAL_LETTABLE_SQFT,
    oneIfcPassengerLifts: ONE_IFC_PASSENGER_LIFTS, oneIfcCargoLifts: ONE_IFC_CARGO_LIFTS, oneIfcTradingFloors: ONE_IFC_TRADING_FLOORS,
    oneIfcSourceVertices: 32, oneIfcOsmWayVersion: ONE_IFC_OSM_SOURCE.version, oneIfcVisualCourses: ONE_IFC_VISUAL_COURSES,
    oneIfcOfficePanelHeight: ONE_IFC_OFFICE_PANEL_HEIGHT, oneIfcTradingPanelHeight: ONE_IFC_TRADING_PANEL_HEIGHT,
    oneIfcCurtainTiers: ONE_IFC_CURTAIN_TIERS.length, oneIfcSetbacks: ONE_IFC_SETBACK_COUNT,
    oneIfcGlassPanels: curtain.glassPanels, oneIfcSpandrelPanels: curtain.spandrelPanels,
    oneIfcVerticalFins: curtain.verticalFins, oneIfcHorizontalTransoms: curtain.horizontalTransoms,
    oneIfcMechanicalBelts: ONE_IFC_BELT_LEVELS.length, oneIfcCrownFins: openCrown.crownFins, oneIfcCrownPlates: openCrown.crownPlates,
    oneIfcGroundGlassPanels: podium.glassPanels, oneIfcGroundPortalBays: podium.portalBays, oneIfcGroundColumns: podium.columnCount,
    oneIfcDriveThroughEdge: ONE_IFC_DRIVETHROUGH_EDGE, oneIfcEntranceEdge: ONE_IFC_ENTRANCE_EDGE,
    oneIfcEntranceForecourtDepth: ONE_IFC_ENTRANCE_FORECOURT_DEPTH, oneIfcPlazaGround: grounds.plaza, oneIfcColliders: colliders.length
  };
  return { group, colliders, landmarks: [landmark], stats, groundOffset, grounds, plazaTop: grounds.plaza,
    groundHeightAt: (x, z, ground) => oneIfcGroundHeightAt(x, z, ground, grounds) };
}
