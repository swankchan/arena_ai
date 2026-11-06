import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, mix as tslMix, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  harbourCityEdgeOutward, harbourCityPodiumBayConflict, harbourCityRoadConflictAtLocal,
  harbourCitySegmentCollider, harbourCityLocalCollider, harbourCityLocalToWorld,
  HARBOUR_CITY_ROAD_LINTEL_DEPTH, HARBOUR_CITY_PODIUM_BAY_WIDTH
} from './harbour-city-architecture.js';

export const lerp = (a, b, t) => a + (b - a) * t;
export const mix = (a, b, t) => a.map((value, index) => lerp(value, b[index], t));
export const nightAmount = () => smoothstep(.55, 1.4, cityUniforms.uInteriorGlow);
export const store = () => ({ positions: [], colors: [], lit: [] });
export function hash(a, b, c, d = 0) { const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + d * 19.19) * 43758.5453; return value - Math.floor(value); }
export function quad(s, a, b, c, d, tint, lit = 0) { for (const p of [a, b, c, a, c, d]) { s.positions.push(...p); s.colors.push(...tint); s.lit.push(lit); } }
export function geometry(s) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(s.positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(s.colors, 3)); g.setAttribute('aLit', new THREE.Float32BufferAttribute(s.lit, 1));
  g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere(); return g;
}
export function meshStore(group, s, material, name, shadows = true) {
  if (!s.positions.length) return null; const mesh = new THREE.Mesh(geometry(s), material); mesh.name = name;
  mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
export function merged(group, parts, material, name, shadows = true) {
  if (!parts.length) return null; const geo = mergeGeometries(parts, false); for (const part of parts) part.dispose();
  const mesh = new THREE.Mesh(geo, material); mesh.name = name; mesh.castShadow = shadows; mesh.receiveShadow = true;
  group.add(mesh); return mesh;
}
export function box(parts, center, size, ry = 0) { const g = new THREE.BoxGeometry(...size); if (ry) g.rotateY(ry); g.translate(...center); parts.push(g); return g; }
export function cylinder(parts, center, radius, height, segments = 16, radiusTop = radius) { const g = new THREE.CylinderGeometry(radiusTop, radius, height, segments); g.translate(...center); parts.push(g); return g; }
export function sphere(parts, center, radius, segments = 12) { const g = new THREE.SphereGeometry(radius, segments, Math.max(6, segments >> 1)); g.translate(...center); parts.push(g); return g; }
export function beam(parts, a, b, width = .1, depth = width) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start), length = direction.length();
  if (length < .001) return; const g = new THREE.BoxGeometry(width, length, depth);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  g.translate(...start.add(end).multiplyScalar(.5).toArray()); parts.push(g); return g;
}
export function point(site, edge, t, y, offset = 0) {
  const ring = site.localRing, i = edge * 2, { nx, nz } = harbourCityEdgeOutward(ring, edge);
  return [lerp(ring[i], ring[i + 2], t) + nx * offset, y, lerp(ring[i + 1], ring[i + 3], t) + nz * offset];
}
export function edgeBox(parts, site, edge, t, y, offset, width, height, depth) {
  const p = point(site, edge, t, y, offset), { ry } = harbourCityEdgeOutward(site.localRing, edge);
  return box(parts, p, [width, height, depth], ry);
}
export function roofGeometry(ring, y) {
  const shape = new THREE.Shape();
  for (let i = 0; i < ring.length - 2; i += 2) { if (i === 0) shape.moveTo(ring[i], -ring[i + 1]); else shape.lineTo(ring[i], -ring[i + 1]); }
  shape.closePath(); const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g;
}
export function ringFrame(site, edge, t = .5) { const ring = site.localRing, i = edge * 2; return { x: lerp(ring[i], ring[i + 2], t), z: lerp(ring[i + 1], ring[i + 3], t), ...harbourCityEdgeOutward(ring, edge) }; }
export function featureGroup(site, edge, name, t = .5) { const frame = ringFrame(site, edge, t), group = new THREE.Group(); group.name = name; group.position.set(frame.x, 0, frame.z); group.rotation.y = frame.ry; return group; }
export function polygonCentre(ring) {
  let area = 0, x = 0, z = 0;
  for (let i = 0; i < ring.length - 2; i += 2) { const cross = ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1]; area += cross; x += (ring[i] + ring[i + 2]) * cross; z += (ring[i + 1] + ring[i + 3]) * cross; }
  return { x: x / (3 * area), z: z / (3 * area) };
}
export function scaledRing(ring, scale) { const centre = polygonCentre(ring); return Object.freeze(ring.map((value, index) => centre[index % 2 ? 'z' : 'x'] + (value - centre[index % 2 ? 'z' : 'x']) * scale)); }
export function translatedRing(ring, dx, dz) { return Object.freeze(ring.map((value, index) => value + (index % 2 ? dz : dx))); }
export function segmentColliderWorld(site, a, b, minY, maxY, depth = .5) {
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz), mid = harbourCityLocalToWorld(site, 0, 0), cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const x = (a.x + b.x) * .5 - mid.x, z = (a.z + b.z) * .5 - mid.z;
  return harbourCityLocalCollider(site, x * cs - z * sn, x * sn + z * cs, length, depth, minY, maxY, Math.atan2(-dz, dx));
}

export function harbourCityPalette(options = {}) {
  const glazing = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: options.roughness ?? .27, metalness: options.metalness ?? .25 });
  glazing.colorNode = attribute('color').rgb.mul(tslMix(.78, 1.5, nightAmount()));
  glazing.emissiveNode = attribute('color').rgb.mul(attribute('aLit')).mul(nightAmount()).mul(.9);
  const interior = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .68, metalness: .03 });
  interior.colorNode = attribute('color').rgb; interior.emissiveNode = attribute('color').rgb.mul(attribute('aLit')).mul(nightAmount()).mul(.65);
  return {
    glazing, interior,
    // Material.color is a CPU-side THREE.Color, not a TSL ColorNode. Passing color(...) here
    // silently left every stone/metal/roof material white in WebGPU; keep shader nodes in colorNode.
    stone: new THREE.MeshStandardMaterial({ color: new THREE.Color(...(options.stone ?? [.66, .64, .58])), roughness: .79, metalness: .03 }),
    paleStone: new THREE.MeshStandardMaterial({ color: new THREE.Color(...(options.paleStone ?? [.82, .81, .75])), roughness: .72, metalness: .04 }),
    metal: new THREE.MeshStandardMaterial({ color: new THREE.Color(...(options.metal ?? [.34, .39, .40])), roughness: .35, metalness: .68 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x172326, roughness: .48, metalness: .3 }),
    roof: new THREE.MeshStandardMaterial({ color: new THREE.Color(...(options.roof ?? [.37, .39, .38])), roughness: .9, metalness: .04 }),
    white: new THREE.MeshStandardMaterial({ color: 0xe8e8e2, roughness: .56, metalness: .12 }),
    lawn: new THREE.MeshStandardMaterial({ color: 0x496c42, roughness: .96, metalness: 0 }),
    warmLight: new THREE.MeshStandardMaterial({ color: 0xffe4ad, emissive: 0xffc66d, emissiveIntensity: .45, roughness: .5 })
  };
}
export function warmWindowEmission(material, tint = [1, .72, .36], strength = .9) {
  material.emissiveNode = color(...tint).mul(attribute('aLit')).mul(nightAmount()).mul(strength);
}

export function createStreetLevel(site, options = {}) {
  const glass = store(), stone = store(), backing = store(), frames = [], columns = [], colliders = [];
  const soffit = options.soffit ?? 6, customEdges = new Set(options.customEdges ?? []), bayWidth = options.bayWidth ?? HARBOUR_CITY_PODIUM_BAY_WIDTH;
  let openRoadBays = 0, entranceBays = 0, closedBays = 0, columnCount = 0;
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = harbourCityEdgeOutward(site.localRing, edge).length, bays = Math.max(1, Math.ceil(length / bayWidth)), custom = customEdges.has(edge);
    const p = (t, y, o = .05) => point(site, edge, t, y, o);
    if (!custom) edgeBox(frames, site, edge, .5, soffit - HARBOUR_CITY_ROAD_LINTEL_DEPTH * .5, .06, length, HARBOUR_CITY_ROAD_LINTEL_DEPTH, .5);
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays + .0008, t1 = (bay + 1) / bays - .0008;
      if (harbourCityPodiumBayConflict(site, edge, bay / bays, (bay + 1) / bays)) { openRoadBays++; continue; }
      if (custom) { entranceBays++; continue; }
      const variation = hash(edge, bay, site.osmId);
      quad(backing, p(t0, .18, -.24), p(t1, .18, -.24), p(t1, soffit - .7, -.24), p(t0, soffit - .7, -.24), options.backingTint ?? [.12, .13, .12], .08 + variation * .25);
      quad(glass, p(t0, .25), p(t1, .25), p(t1, soffit - .75), p(t0, soffit - .75), mix(options.glassA ?? [.035, .09, .105], options.glassB ?? [.15, .25, .26], variation), .05 + variation * .12);
      quad(stone, p(t0, soffit - .7, .08), p(t1, soffit - .7, .08), p(t1, soffit, .08), p(t0, soffit, .08), options.stoneTint ?? [.61, .58, .51]);
      colliders.push(harbourCitySegmentCollider(site, edge, bay / bays, (bay + 1) / bays, 0, soffit)); closedBays++;
    }
    if (custom) continue;
    for (let bay = 0; bay <= bays; bay++) {
      const t = bay / bays, i = edge * 2, x = lerp(site.localRing[i], site.localRing[i + 2], t), z = lerp(site.localRing[i + 1], site.localRing[i + 3], t);
      if (harbourCityRoadConflictAtLocal(site, x, z)) continue;
      const q = point(site, edge, t, soffit * .5, -.17); box(columns, q, [.46, soffit, .46], harbourCityEdgeOutward(site.localRing, edge).ry);
      colliders.push(harbourCityLocalCollider(site, q[0], q[2], .52, .52, 0, soffit)); columnCount++;
    }
  }
  return { glass, stone, backing, frames, columns, colliders, openRoadBays, entranceBays, closedBays, columnCount };
}

export function signMesh(title, subtitle, width, height, options = {}) {
  const canvas = document.createElement('canvas'); canvas.width = 1536; canvas.height = 384;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = options.background ?? '#e7e4da'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (options.accent !== false) { ctx.fillStyle = options.accent ?? '#9b7a42'; ctx.fillRect(0, 0, 18, canvas.height); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = options.foreground ?? '#252a2a';
  ctx.font = `600 ${subtitle ? 88 : 112}px "Noto Sans CJK TC", "PingFang HK", sans-serif`; ctx.fillText(title, canvas.width / 2, subtitle ? 142 : 194, 1400);
  if (subtitle) { ctx.font = '42px "Noto Sans CJK TC", "PingFang HK", sans-serif'; ctx.fillStyle = options.subForeground ?? '#505654'; ctx.fillText(subtitle, canvas.width / 2, 275, 1390); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: .62, metalness: .05, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material); mesh.name = `Sign: ${title}`; mesh.castShadow = false; return mesh;
}
export function addEdgeSign(group, site, edge, title, subtitle, y, width, height, offset = .65, options = {}) {
  const sign = signMesh(title, subtitle, width, height, options), frame = ringFrame(site, edge);
  sign.position.set(frame.x + frame.nx * offset, y, frame.z + frame.nz * offset);
  sign.rotation.y = Math.atan2(frame.nx, frame.nz); group.add(sign); return sign;
}
export function ringBand(parts, site, y, height, projection = .22, depth = .24, predicate = null) {
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    if (predicate && !predicate(edge)) continue; const length = harbourCityEdgeOutward(site.localRing, edge).length;
    edgeBox(parts, site, edge, .5, y, projection, length + .04, height, depth);
  }
}
export function addEntranceCanopy(group, site, edge, materials, options = {}) {
  const frame = ringFrame(site, edge), canopy = new THREE.Group(); canopy.name = options.name ?? 'Authored entrance canopy';
  canopy.position.set(frame.x, 0, frame.z); canopy.rotation.y = frame.ry;
  const parts = [], glass = [], width = options.width ?? 18, projection = options.projection ?? 4.2, y = options.y ?? 4.4;
  box(parts, [0, y, projection * .45], [width, .28, projection]); box(parts, [0, y - .35, projection * .87], [width, .7, .25]);
  for (const x of [-width * .43, width * .43]) { box(parts, [x, y * .5, projection * .78], [.28, y, .28]); box(glass, [x, 2.1, .12], [.12, 4.2, .16]); }
  merged(canopy, parts, materials.paleStone, 'Entrance stone canopy and columns');
  merged(canopy, glass, materials.metal, 'Entrance door frames');
  const doors = new THREE.Mesh(new THREE.BoxGeometry(width * .74, 3.6, .12), new THREE.MeshStandardMaterial({ color: 0x284247, roughness: .18, metalness: .4 }));
  doors.position.set(0, 1.9, .04); canopy.add(doors); group.add(canopy);
  return { group: canopy, width, projection, frame };
}
export function addRoofEquipment(group, site, materials, options = {}) {
  const parts = [], dark = [], count = options.count ?? 8, baseY = options.y ?? site.height;
  for (let i = 0; i < count; i++) {
    const x = lerp(-site.width * .22, site.width * .22, hash(i, 4, site.osmId)), z = lerp(-site.depth * .22, site.depth * .22, hash(i, 9, site.osmId));
    const w = 1.6 + hash(i, 2, 7) * 2.4, d = 1.4 + hash(i, 5, 8) * 2.2;
    box(parts, [x, baseY + .55, z], [w, 1.1, d]); box(dark, [x, baseY + 1.13, z], [w * .72, .08, d * .72]);
    if (i % 3 === 0) cylinder(dark, [x + w * .3, baseY + 1.55, z], .18, .85, 10);
  }
  merged(group, parts, materials.roof, 'Roof plant and lift overrun'); merged(group, dark, materials.dark, 'Roof vents and fan grilles');
}
export function roadClearanceTest(site, grounds, base, soffit, roadRibbonHeightAtSegment) {
  let minimum = Infinity, checked = 0;
  for (const road of (site.roadRecords ?? [])) for (let seg = 0; seg + 3 < road.points.length; seg += 2) {
    const ax = road.points[seg], az = road.points[seg + 1], bx = road.points[seg + 2], bz = road.points[seg + 3], length = Math.hypot(bx - ax, bz - az), steps = Math.max(1, Math.ceil(length));
    for (let step = 0; step <= steps; step++) { const t = step / steps, x = lerp(ax, bx, t), z = lerp(az, bz, t); if (x < site.bounds.minX || x > site.bounds.maxX || z < site.bounds.minZ || z > site.bounds.maxZ) continue; minimum = Math.min(minimum, base + soffit - HARBOUR_CITY_ROAD_LINTEL_DEPTH - roadRibbonHeightAtSegment(road.recordIndex, seg >> 1, t)); checked++; }
  }
  return { minimum, checked };
}
