import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  NINA_TOWER_MAIN_SITE, NINA_TOWER_HOTEL_SITE, NINA_TOWER_PODIUM_SITE,
  NINA_TOWER_OSM_HEIGHT, NINA_TOWER_HEIGHT, NINA_TOWER_ROOF_HEIGHT, NINA_TOWER_OCCUPIED_HEIGHT,
  NINA_TOWER_OBSERVATORY_HEIGHT, NINA_TOWER_LEVELS, NINA_TOWER_TOP_LEVEL_LABEL,
  NINA_TOWER_BELOW_GROUND_LEVELS, NINA_TOWER_HOTEL_HEIGHT, NINA_TOWER_HOTEL_OCCUPIED_HEIGHT,
  NINA_TOWER_HOTEL_LEVELS, NINA_TOWER_HOTEL_LOCAL_REPORTED_HEIGHT,
  NINA_TOWER_PODIUM_SOFFIT, NINA_TOWER_PODIUM_ROOF, NINA_TOWER_PLAZA_TOP,
  NINA_TOWER_MAIN_PLANT_LEVELS, NINA_TOWER_HOTEL_LOUVRE_LEVELS,
  NINA_TOWER_PODIUM_VEHICLE_PORTAL_EDGES, NINA_TOWER_PODIUM_ENTRANCE_EDGE, NINA_TOWER_ENTRANCE,
  NINA_TOWER_SKYBRIDGE, NINA_TOWER_SKYBRIDGE_TRUSS_DEPTH,
  ninaTowerMainFloorY, ninaTowerHotelFloorY, ninaTowerMainRoofAt, ninaTowerHotelRoofAt,
  ninaTowerEdgeOutward, ninaTowerEdgeCollider, ninaTowerRingColliders, ninaTowerLocalCollider,
  ninaTowerSkybridgePoint
} from './nina-tower-architecture.js';

const lerp = (a, b, t) => a + (b - a) * t;
const hash = (a, b, c = 0) => { const v = Math.sin(a * 127.1 + b * 311.7 + c * 73.7) * 43758.5453; return v - Math.floor(v); };
const closed = (ring) => [...ring, ring[0], ring[1]];
const nightAmount = () => smoothstep(0.55, 1.4, cityUniforms.uInteriorGlow);
function store() { return { positions: [], colors: [], lit: [], quads: 0, triangles: 0 }; }
function vertex(s, p, tint, lit = 0) { s.positions.push(...p); s.colors.push(...tint); s.lit.push(lit); }
function quad(s, a, b, c, d, tint, lit = 0) { for (const i of [0, 1, 2, 0, 2, 3]) vertex(s, [a, b, c, d][i], tint, lit); s.quads++; }
function triangle(s, a, b, c, tint) { for (const p of [a, b, c]) vertex(s, p, tint); s.triangles++; }
function geometry(s) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(s.positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(s.colors, 3)); g.setAttribute('aLit', new THREE.Float32BufferAttribute(s.lit, 1));
  g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}
function meshStore(group, s, material, name, shadows = true) {
  if (!s.positions.length) return null; const mesh = new THREE.Mesh(geometry(s), material); mesh.name = name;
  mesh.frustumCulled = false; mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function merged(group, parts, material, name, shadows = true) {
  if (!parts.length) return null; const g = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  if (parts.length > 1) for (const part of parts) part.dispose(); const mesh = new THREE.Mesh(g, material);
  mesh.name = name; mesh.frustumCulled = false; mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function beam(parts, a, b, width, depth = width) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
  const length = direction.length(); if (length < 0.02) return; const g = new THREE.BoxGeometry(width, length, depth);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(start.add(end).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1))); parts.push(g);
}
function tintMix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function worldCollider(cx, cz, w, d, ry, minY, maxY) {
  const cs = Math.cos(ry), sn = Math.sin(ry), hx = w * 0.5, hz = d * 0.5;
  return { minX: cx - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: cx + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: cz - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: cz + Math.abs(sn) * hx + Math.abs(cs) * hz,
    minY, maxY, obb: { cx, cz, hx, hz, cs, sn } };
}
function localBox(group, material, name, position, size) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.position.set(...position); mesh.name = name;
  mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
}

function createTowerFacade(site, { main = false } = {}) {
  const ring = closed(site.localRing), levels = main ? NINA_TOWER_LEVELS : NINA_TOWER_HOTEL_LEVELS;
  const occupied = main ? NINA_TOWER_OCCUPIED_HEIGHT : NINA_TOWER_HOTEL_OCCUPIED_HEIGHT;
  const base = main ? 0 : NINA_TOWER_PODIUM_ROOF;
  const floorY = main ? ninaTowerMainFloorY : ninaTowerHotelFloorY;
  const plantLevels = new Set(main ? NINA_TOWER_MAIN_PLANT_LEVELS : NINA_TOWER_HOTEL_LOUVRE_LEVELS);
  const accentLevels = new Set(main ? [25, 32, 54, 73] : [21, 42]);
  const glass = store(), frames = store(), recess = store(), louvres = [], fins = [], accents = [];
  let visionPanels = 0, louvreSlats = 0, finCount = 0, accentBars = 0;
  for (let level = 1; level <= levels; level++) {
    const y0 = Math.max(base, floorY(level - 1)), y1 = floorY(level), plant = plantLevels.has(level);
    if (y1 <= base) continue;
    for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
      const i = edge * 2, next = i + 2, ax = ring[i], az = ring[i + 1], bx = ring[next], bz = ring[next + 1];
      const { nx, nz, length } = ninaTowerEdgeOutward(ring, edge), bays = Math.max(2, Math.round(length / (main ? 1.45 : 1.35)));
      const point = (t, y, offset = 0.04) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + 0.0009, t1 = (bay + 1) / bays - 0.0009, variation = hash(level, edge, bay);
        if (plant) {
          quad(recess, point(t0, y0, 0), point(t1, y0, 0), point(t1, y1, 0), point(t0, y1, 0), [0.035, 0.050, 0.058]);
        } else {
          const low = main ? [0.075, 0.14, 0.18] : [0.055, 0.13, 0.16];
          const high = main ? [0.38, 0.49, 0.53] : [0.34, 0.48, 0.50];
          const tint = tintMix(low, high, 0.25 + variation * 0.55), lit = variation > 0.77 ? 0.18 + hash(bay, level, edge) * 0.42 : 0;
          quad(glass, point(t0, y0 + 0.03), point(t1, y0 + 0.03), point(t1, y1 - 0.03), point(t0, y1 - 0.03), tint, lit);
          quad(glass, point(t0, y0 + 0.03, 0.055), point(t1, y0 + 0.03, 0.055), point(t1, y0 + 0.43, 0.055), point(t0, y0 + 0.43, 0.055),
            main ? [0.11, 0.19, 0.23] : [0.10, 0.18, 0.20]);
          visionPanels++;
        }
        quad(frames, point(t0, y0, 0.09), point(t1, y0, 0.09), point(t1, y0 + 0.065, 0.09), point(t0, y0 + 0.065, 0.09),
          main ? [0.52, 0.57, 0.58] : [0.43, 0.49, 0.49]);
      }
      if (plant) {
        const slats = main ? 5 : 4;
        for (let slat = 0; slat < slats; slat++) {
          const y = y0 + (slat + 0.5) * (y1 - y0) / slats;
          beam(louvres, point(0.005, y, 0.15), point(0.995, y, 0.15), 0.12, 0.19); louvreSlats++;
        }
      }
      if (accentLevels.has(level)) {
        beam(accents, point(0.01, y0 + 0.14, 0.21), point(0.99, y0 + 0.14, 0.21), 0.085, 0.10); accentBars++;
      }
    }
  }
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 2 + 1];
    const { nx, nz, length } = ninaTowerEdgeOutward(ring, edge), bays = Math.max(2, Math.round(length / (main ? 1.45 : 1.35)));
    for (let bay = 0; bay < bays; bay++) {
      const t = bay / bays, x = lerp(ax, bx, t) + nx * 0.16, z = lerp(az, bz, t) + nz * 0.16;
      const major = bay % (main ? 4 : 5) === 0;
      beam(fins, [x, base, z], [x, occupied, z], major ? 0.14 : 0.055, major ? 0.20 : 0.075); finCount++;
    }
  }
  return { glass, frames, recess, louvres, fins, accents, visionPanels, louvreSlats, finCount, accentBars };
}

function triangulatedRoof(ring, y, tint) {
  const result = store(), points = [];
  for (let i = 0; i + 1 < ring.length; i += 2) points.push(new THREE.Vector2(ring[i], ring[i + 1]));
  for (const face of THREE.ShapeUtils.triangulateShape(points, [])) {
    const [a, b, c] = face.map((index) => {
      const point = points[index], height = typeof y === 'function' ? y(point.x, point.y) : y;
      return [point.x, height, point.y];
    }); triangle(result, a, b, c, tint);
  }
  return result;
}

function createCrown(site, { main = false } = {}) {
  const ring = closed(site.localRing), occupied = main ? NINA_TOWER_OCCUPIED_HEIGHT : NINA_TOWER_HOTEL_OCCUPIED_HEIGHT;
  const roofAt = main ? ninaTowerMainRoofAt : ninaTowerHotelRoofAt;
  const innerScale = main ? 0.74 : 0.90;
  const wall = store(), louvres = [], frame = [], accents = [];
  let crownLouvres = 0, roofRafters = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const aTop = roofAt(ax) - 4, bTop = roofAt(bx) - 4, aFrame = roofAt(ax) + 0.6, bFrame = roofAt(bx) + 0.6;
    const { nx, nz, length } = ninaTowerEdgeOutward(ring, edge), bays = Math.max(2, Math.round(length / 2));
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays + 0.001, t1 = (bay + 1) / bays - 0.001;
      const point = (t, top, offset = 0.03) => {
        const x = lerp(ax, bx, t), z = lerp(az, bz, t), y = lerp(occupied, top, 1);
        return [x + nx * offset, y, z + nz * offset];
      };
      const tint = tintMix([0.045, 0.075, 0.09], [0.18, 0.25, 0.27], hash(edge, bay));
      quad(wall, point(t0, occupied), point(t1, occupied), point(t1, lerp(aTop, bTop, t1)), point(t0, lerp(aTop, bTop, t0)), tint);
    }
    const slats = 6;
    for (let slat = 1; slat < slats; slat++) {
      const t = slat / slats;
      beam(louvres, [ax + nx * 0.12, lerp(occupied, aTop, t), az + nz * 0.12],
        [bx + nx * 0.12, lerp(occupied, bTop, t), bz + nz * 0.12], 0.13, 0.18); crownLouvres++;
    }
    beam(frame, [ax, occupied, az], [ax, aFrame, az], 0.22, 0.26);
    beam(frame, [ax, aFrame, az], [bx, bFrame, bz], 0.24, 0.28);
    beam(accents, [ax + nx * 0.14, aFrame - 0.10, az + nz * 0.14], [bx + nx * 0.14, bFrame - 0.10, bz + nz * 0.14], 0.075, 0.09);
    beam(frame, [ax, aTop, az], [ax * innerScale, roofAt(ax * innerScale), az * innerScale], 0.18, 0.22); roofRafters++;
    if (length > 20) beam(frame, [(ax + bx) * 0.5, (aTop + bTop) * 0.5, (az + bz) * 0.5],
      [(ax + bx) * 0.5 * innerScale, roofAt((ax + bx) * 0.5 * innerScale), (az + bz) * 0.5 * innerScale], 0.15, 0.18);
  }
  const inner = site.localRing.map((value) => value * innerScale), canopy = triangulatedRoof(inner, (x) => roofAt(x), [0.29, 0.34, 0.35]);
  return { wall, louvres, frame, accents, canopy, crownLouvres, roofRafters };
}

function createSkybridge(group, materials) {
  const deck = store(), sides = store(), roof = store(), trusses = [], frames = [], rails = [], accents = [], colliders = [];
  const segments = 16, width = NINA_TOWER_SKYBRIDGE.width, floor = NINA_TOWER_SKYBRIDGE.floorY;
  const clearHeight = NINA_TOWER_SKYBRIDGE.clearHeight, roofRise = NINA_TOWER_SKYBRIDGE.roofRise;
  const roofY = (side) => floor + clearHeight + roofRise * (1 - side * side);
  let trussMembers = 0, enclosureRibs = 0;
  const point = (t, side, y) => {
    const p = ninaTowerSkybridgePoint(t), before = ninaTowerSkybridgePoint(Math.max(0, t - 0.002)), after = ninaTowerSkybridgePoint(Math.min(1, t + 0.002));
    const dx = after.x - before.x, dz = after.z - before.z, length = Math.hypot(dx, dz) || 1;
    return [p.x + dz / length * side * width * 0.5, y, p.z - dx / length * side * width * 0.5];
  };
  for (let segment = 0; segment < segments; segment++) {
    const t0 = segment / segments, t1 = (segment + 1) / segments;
    quad(deck, point(t0, -1, floor), point(t1, -1, floor), point(t1, 1, floor), point(t0, 1, floor), [0.30, 0.47, 0.50]);
    for (let strip = 0; strip < 4; strip++) {
      const s0 = -1 + strip * 0.5, s1 = s0 + 0.5;
      quad(roof, point(t0, s0, roofY(s0)), point(t1, s0, roofY(s0)), point(t1, s1, roofY(s1)), point(t0, s1, roofY(s1)), [0.38, 0.53, 0.56]);
    }
    for (const side of [-1, 1]) {
      const a = point(t0, side, floor), b = point(t1, side, floor);
      const lowerA = [a[0], floor - NINA_TOWER_SKYBRIDGE_TRUSS_DEPTH, a[2]], lowerB = [b[0], floor - NINA_TOWER_SKYBRIDGE_TRUSS_DEPTH, b[2]];
      quad(sides, [a[0], floor + 0.08, a[2]], [b[0], floor + 0.08, b[2]],
        [b[0], floor + clearHeight - 0.05, b[2]], [a[0], floor + clearHeight - 0.05, a[2]], [0.40, 0.57, 0.59]);
      beam(trusses, lowerA, lowerB, 0.16, 0.19); beam(trusses, a, b, 0.15, 0.18);
      beam(trusses, segment % 2 ? a : lowerA, segment % 2 ? lowerB : b, 0.13, 0.16); trussMembers += 3;
      beam(rails, [a[0], floor + 1.25, a[2]], [b[0], floor + 1.25, b[2]], 0.10, 0.12);
      beam(accents, [a[0], floor - 0.12, a[2]], [b[0], floor - 0.12, b[2]], 0.07, 0.08);
    }
    const left = point(t0, -1, floor - NINA_TOWER_SKYBRIDGE_TRUSS_DEPTH), right = point(t0, 1, floor - NINA_TOWER_SKYBRIDGE_TRUSS_DEPTH);
    beam(trusses, left, right, 0.14, 0.17); trussMembers++;
    const p0 = ninaTowerSkybridgePoint(t0), p1 = ninaTowerSkybridgePoint(t1), dx = p1.x - p0.x, dz = p1.z - p0.z;
    colliders.push(worldCollider((p0.x + p1.x) * 0.5, (p0.z + p1.z) * 0.5, Math.hypot(dx, dz) + 0.25, width + 0.3,
      Math.atan2(-dz, dx), floor - NINA_TOWER_SKYBRIDGE_TRUSS_DEPTH, floor + clearHeight + roofRise + 0.1));
  }
  for (let rib = 0; rib <= segments; rib++) {
    const t = rib / segments;
    for (const side of [-1, 1]) {
      const bottom = point(t, side, floor), top = point(t, side, roofY(side));
      beam(frames, bottom, top, 0.11, 0.14);
    }
    for (let strip = 0; strip < 4; strip++) {
      const s0 = -1 + strip * 0.5, s1 = s0 + 0.5;
      beam(frames, point(t, s0, roofY(s0)), point(t, s1, roofY(s1)), 0.10, 0.13);
    }
    enclosureRibs++;
  }
  meshStore(group, deck, materials.bridgeGlass, 'NinaTowerGlassBottomCurvedSkybridgeDeck', false);
  meshStore(group, sides, materials.bridgeGlass, 'NinaTowerFullHeightCurvedSkybridgeGlazing', false);
  meshStore(group, roof, materials.bridgeGlass, 'NinaTowerEnclosedCurvedGlassSkybridgeRoof', false);
  merged(group, frames, materials.whiteSteel, 'NinaTowerSkybridgeStructuralArchRibs');
  merged(group, trusses, materials.whiteSteel, 'NinaTowerTwinThreeMetreTriangularSpaceTrusses');
  merged(group, rails, materials.metal, 'NinaTowerSkybridgeHandrails');
  merged(group, accents, materials.warmAccent, 'NinaTowerSkybridgeWarm underside lighting', false);
  return { colliders, trussMembers, segments, enclosureRibs, clearHeight, roofRise };
}

function signTexture(kind = 'name') {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 384;
  const ctx = canvas.getContext('2d');
  if (kind === 'name') {
    ctx.fillStyle = '#18262b'; ctx.fillRect(0, 0, 768, 384); ctx.textAlign = 'center';
    ctx.fillStyle = '#e6e9e4'; ctx.font = '500 63px sans-serif'; ctx.fillText('NINA TOWER', 384, 150);
    ctx.font = '54px sans-serif'; ctx.fillText('如 心 廣 場', 384, 245);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 768, 384); gradient.addColorStop(0, '#182b46'); gradient.addColorStop(0.5, '#743c51'); gradient.addColorStop(1, '#b68755');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 768, 384); ctx.strokeStyle = '#e8c7a1'; ctx.lineWidth = 5;
    for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.arc(390, 200, 30 + i * 15, i * 0.3, Math.PI + i * 0.3); ctx.stroke(); }
    ctx.fillStyle = '#f1e9da'; ctx.font = '500 48px sans-serif'; ctx.fillText('NINA MALL', 55, 70);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function edgeSign(group, ring, edge, y, width, height, texture, name) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3], { nx, nz } = ninaTowerEdgeOutward(ring, edge);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  mesh.position.set((ax + bx) * 0.5 + nx * 0.20, y, (az + bz) * 0.5 + nz * 0.20); mesh.rotation.y = Math.atan2(nx, nz); mesh.name = name; group.add(mesh); return mesh;
}

function createAtriumVault(group, materials) {
  const dx = NINA_TOWER_HOTEL_SITE.x - NINA_TOWER_MAIN_SITE.x, dz = NINA_TOWER_HOTEL_SITE.z - NINA_TOWER_MAIN_SITE.z;
  const cx = (NINA_TOWER_MAIN_SITE.x + NINA_TOWER_HOTEL_SITE.x) * 0.5, cz = (NINA_TOWER_MAIN_SITE.z + NINA_TOWER_HOTEL_SITE.z) * 0.5;
  const ry = Math.atan2(-dz, dx), vault = new THREE.Group(); vault.position.set(cx, 0, cz); vault.rotation.y = ry; vault.name = 'NinaTowerCurvedPodiumAtriumVault'; group.add(vault);
  const glazing = store(), roof = store(), ribs = [], length = 44, width = 20, base = NINA_TOWER_PODIUM_ROOF;
  const y = (z) => base + 6 * (1 - (z / (width * 0.5)) ** 2);
  for (let ix = 0; ix < 8; ix++) for (let iz = 0; iz < 12; iz++) {
    const x0 = -length * 0.5 + ix * length / 8, x1 = -length * 0.5 + (ix + 1) * length / 8;
    const z0 = -width * 0.5 + iz * width / 12, z1 = -width * 0.5 + (iz + 1) * width / 12;
    const target = iz >= 3 && iz <= 8 ? glazing : roof;
    quad(target, [x0, y(z0), z0], [x1, y(z0), z0], [x1, y(z1), z1], [x0, y(z1), z1],
      target === glazing ? [0.28, 0.45, 0.47] : [0.52, 0.56, 0.55]);
  }
  for (let ix = 0; ix <= 8; ix++) {
    const x = -length * 0.5 + ix * length / 8;
    for (let iz = 0; iz < 12; iz++) {
      const z0 = -width * 0.5 + iz * width / 12, z1 = -width * 0.5 + (iz + 1) * width / 12;
      beam(ribs, [x, y(z0), z0], [x, y(z1), z1], 0.16, 0.20);
    }
  }
  for (let iz = 0; iz <= 12; iz++) {
    const z = -width * 0.5 + iz * width / 12;
    beam(ribs, [-length * 0.5, y(z), z], [length * 0.5, y(z), z], 0.13, 0.17);
  }
  meshStore(vault, glazing, materials.bridgeGlass, 'NinaTowerPodiumAtriumGlazedBarrelPanels', false);
  meshStore(vault, roof, materials.silver, 'NinaTowerPodiumAtriumSilverRoofPanels');
  merged(vault, ribs, materials.whiteSteel, 'NinaTowerPodiumAtriumCurvedSteelRibs');
  return worldCollider(cx, cz, length, width, ry, base, base + 6.2);
}

function createPodium(group, materials) {
  const ring = NINA_TOWER_PODIUM_SITE.ring, portals = new Set(NINA_TOWER_PODIUM_VEHICLE_PORTAL_EDGES);
  const glass = store(), silver = store(), frames = store(), bands = [];
  let groundPanels = 0, upperPanels = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const { nx, nz, length } = ninaTowerEdgeOutward(ring, edge), bays = Math.max(1, Math.round(length / 3.1));
    const point = (t, y, offset = 0.04) => [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
    if (!portals.has(edge) && edge !== NINA_TOWER_PODIUM_ENTRANCE_EDGE) {
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + 0.002, t1 = (bay + 1) / bays - 0.002;
        quad(glass, point(t0, 0.15), point(t1, 0.15), point(t1, 7.8), point(t0, 7.8), [0.17, 0.30, 0.32], 0.08); groundPanels++;
        quad(frames, point(t0, 0.15, 0.08), point(t0 + 0.002, 0.15, 0.08), point(t0 + 0.002, 7.8, 0.08), point(t0, 7.8, 0.08), [0.48, 0.52, 0.50]);
      }
    } else if (portals.has(edge)) {
      beam(bands, point(0, NINA_TOWER_PODIUM_SOFFIT - 0.15, 0), point(1, NINA_TOWER_PODIUM_SOFFIT - 0.15, 0), 0.30, 0.36);
    }
    for (let row = 0; row < 4; row++) {
      const y0 = NINA_TOWER_PODIUM_SOFFIT + row * 4, y1 = y0 + 4;
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + 0.0015, t1 = (bay + 1) / bays - 0.0015;
        const atrium = (edge >= 42 && edge <= 55) || (edge <= 10 && row === 0) || row === 2;
        const target = atrium ? glass : silver, variation = hash(edge, row, bay);
        const tint = atrium ? tintMix([0.12, 0.25, 0.28], [0.32, 0.43, 0.44], variation)
          : tintMix([0.37, 0.41, 0.41], [0.63, 0.65, 0.62], variation);
        quad(target, point(t0, y0 + 0.04), point(t1, y0 + 0.04), point(t1, y1 - 0.04), point(t0, y1 - 0.04), tint, atrium && variation > 0.7 ? 0.11 : 0); upperPanels++;
        quad(frames, point(t0, y0, 0.08), point(t0 + 0.0015, y0, 0.08), point(t0 + 0.0015, y1, 0.08), point(t0, y1, 0.08), [0.55, 0.58, 0.56]);
      }
    }
    for (const y of [8, 16, 24]) beam(bands, point(0, y, 0.12), point(1, y, 0.12), y === 24 ? 0.38 : 0.20, 0.25);
  }
  meshStore(group, glass, materials.glass, 'NinaTowerPodiumGroundGlazingAndCurvedAtrium');
  meshStore(group, silver, materials.silver, 'NinaTowerPodiumBrushedAluminiumRainscreen');
  meshStore(group, frames, materials.metal, 'NinaTowerPodiumPanelJointsAndMullions');
  merged(group, bands, materials.whiteSteel, 'NinaTowerPodiumHorizontalBandsAndVehiclePortalLintels');
  meshStore(group, triangulatedRoof(NINA_TOWER_PODIUM_SITE.ring.slice(0, -2), NINA_TOWER_PODIUM_ROOF, [0.40, 0.44, 0.43]), materials.silver, 'NinaTowerExactOsmPodiumRoof');
  const adTexture = signTexture('ad');
  edgeSign(group, ring, 44, 14.1, 10.5, 5.4, adTexture, 'NinaTowerPodiumLargeLedDisplayEast');
  edgeSign(group, ring, 52, 14.1, 9.5, 5.4, adTexture, 'NinaTowerPodiumLargeLedDisplayAtrium');
  return { groundPanels, upperPanels, vaultCollider: createAtriumVault(group, materials) };
}

function createEntrance(group, materials) {
  const entrance = new THREE.Group(); entrance.position.set(NINA_TOWER_ENTRANCE.x, 0, NINA_TOWER_ENTRANCE.z);
  entrance.rotation.y = NINA_TOWER_ENTRANCE.ry; entrance.name = 'NinaTowerActualOsmEntranceCanopy'; group.add(entrance);
  localBox(entrance, materials.bridgeGlass, 'NinaTowerEntranceGlazedDoors', [0, 2.5, 0], [5.8, 5, 0.16]);
  const frame = [];
  for (const x of [-2.9, -0.95, 0.95, 2.9]) beam(frame, [x, 0.12, 0.12], [x, 5.1, 0.12], 0.11, 0.14);
  for (const y of [0.15, 3.1, 5.1]) beam(frame, [-2.9, y, 0.12], [2.9, y, 0.12], 0.11, 0.14);
  merged(entrance, frame, materials.metal, 'NinaTowerEntranceDoorFramesAndTransoms');
  for (const x of [-3.6, 3.6]) {
    localBox(entrance, materials.stone, 'NinaTowerEntranceStoneColumnBase', [x, 1.0, -0.45], [1.15, 2, 1.1]);
    const slats = [];
    for (let y = 2.05; y < 5.9; y += 0.24) beam(slats, [x - 0.61, y, -0.45], [x + 0.61, y, -0.45], 0.11, 1.15);
    merged(entrance, slats, materials.metal, 'NinaTowerEntranceHorizontalLouverColumn');
  }
  localBox(entrance, materials.whiteSteel, 'NinaTowerEntranceDeepFlatCanopy', [0, 6.15, 1.15], [9.2, 0.30, 4.0]);
  const lights = [];
  for (const x of [-3, -1, 1, 3]) for (const z of [0.2, 1.8]) beam(lights, [x, 5.97, z], [x + 0.18, 5.97, z], 0.09, 0.09);
  merged(entrance, lights, materials.warmAccent, 'NinaTowerEntranceWarmCanopyDownlights', false);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.35), new THREE.MeshBasicMaterial({ map: signTexture(), toneMapped: false }));
  sign.position.set(0, 5.35, 0.16); sign.name = 'NinaTowerEntranceIdentification'; entrance.add(sign);
  const colliders = [], cs = Math.cos(NINA_TOWER_ENTRANCE.ry), sn = Math.sin(NINA_TOWER_ENTRANCE.ry);
  const convert = (x, z) => ({ x: NINA_TOWER_ENTRANCE.x + cs * x + sn * z, z: NINA_TOWER_ENTRANCE.z - sn * x + cs * z });
  const add = (x, z, w, d, minY, maxY) => { const p = convert(x, z); colliders.push(worldCollider(p.x, p.z, w, d, NINA_TOWER_ENTRANCE.ry, minY, maxY)); };
  add(0, 0, 5.9, 0.35, 0, 5.2); add(0, 1.15, 9.2, 4, 5.95, 6.35);
  for (const x of [-3.6, 3.6]) add(x, -0.45, 1.2, 1.2, 0, 6.1);
  return colliders;
}

export function buildNinaTower(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'NinaTowerAuthoredLandmark'; group.userData.internalId = 'HK-B0008'; group.position.y = groundOffset; root.add(group);
  const materials = {
    glass: new THREE.MeshStandardNodeMaterial({ metalness: 0.52, roughness: 0.24, envMapIntensity: 0.82, side: THREE.DoubleSide }),
    silver: new THREE.MeshStandardNodeMaterial({ metalness: 0.62, roughness: 0.36, side: THREE.DoubleSide }),
    metal: new THREE.MeshStandardNodeMaterial({ color: 0xa9b3b2, metalness: 0.78, roughness: 0.28 }),
    whiteSteel: new THREE.MeshStandardNodeMaterial({ color: 0xd2d9d5, metalness: 0.62, roughness: 0.31 }),
    stone: new THREE.MeshStandardNodeMaterial({ color: 0xb5b0a4, roughness: 0.72 }),
    warmAccent: new THREE.MeshStandardNodeMaterial({ color: 0x8a7045, roughness: 0.38 }),
    coolAccent: new THREE.MeshStandardNodeMaterial({ color: 0x6c858e, roughness: 0.34 }),
    bridgeGlass: new THREE.MeshStandardNodeMaterial({ color: 0x91b5ba, transparent: true, opacity: 0.34, depthWrite: false,
      metalness: 0.15, roughness: 0.16, side: THREE.DoubleSide })
  };
  for (const key of ['glass', 'silver']) { materials[key].colorNode = attribute('color', 'vec3'); materials[key].emissiveNode = color(0xffd3a0).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.28); }
  materials.whiteSteel.emissiveNode = color(0xd9edff).mul(nightAmount()).mul(0.11);
  materials.warmAccent.emissiveNode = color(0xffc875).mul(nightAmount().mul(0.85).add(0.02));
  materials.coolAccent.emissiveNode = color(0xa9ddff).mul(nightAmount().mul(0.65));
  materials.bridgeGlass.emissiveNode = color(0xffd7a3).mul(nightAmount()).mul(0.025);

  const main = new THREE.Group(); main.position.set(NINA_TOWER_MAIN_SITE.x, 0, NINA_TOWER_MAIN_SITE.z); main.rotation.y = NINA_TOWER_MAIN_SITE.ry; main.name = 'NinaTowerTeddyTower'; group.add(main);
  const mainFacade = createTowerFacade(NINA_TOWER_MAIN_SITE, { main: true });
  meshStore(main, mainFacade.glass, materials.glass, 'NinaTowerMainSilverBlueVisionPanels');
  meshStore(main, mainFacade.frames, materials.silver, 'NinaTowerMainDenseHorizontalTransoms');
  meshStore(main, mainFacade.recess, materials.silver, 'NinaTowerMainRecessedPlantAndRefugeFloors');
  merged(main, mainFacade.louvres, materials.metal, 'NinaTowerMainHorizontalMechanicalLouvres');
  merged(main, mainFacade.fins, materials.whiteSteel, 'NinaTowerMainContinuousVerticalAluminiumFins');
  merged(main, mainFacade.accents, materials.warmAccent, 'NinaTowerMainWarmOutriggerBandAccents', false);
  const mainCrown = createCrown(NINA_TOWER_MAIN_SITE, { main: true });
  meshStore(main, mainCrown.wall, materials.silver, 'NinaTowerMainArchedCrownServicesWalls');
  merged(main, mainCrown.louvres, materials.metal, 'NinaTowerMainCrownLouvres');
  merged(main, mainCrown.frame, materials.whiteSteel, 'NinaTowerMainOpenArchedRoofFrameAndRafters');
  merged(main, mainCrown.accents, materials.coolAccent, 'NinaTowerMainCoolRoofRimLighting', false);
  meshStore(main, mainCrown.canopy, materials.silver, 'NinaTowerMainRaisedCentralRoofCanopy');

  const hotel = new THREE.Group(); hotel.position.set(NINA_TOWER_HOTEL_SITE.x, 0, NINA_TOWER_HOTEL_SITE.z); hotel.rotation.y = NINA_TOWER_HOTEL_SITE.ry; hotel.name = 'NinaTowerCrescentHotel'; group.add(hotel);
  const hotelFacade = createTowerFacade(NINA_TOWER_HOTEL_SITE);
  meshStore(hotel, hotelFacade.glass, materials.glass, 'NinaTowerHotelCrescentVisionPanels');
  meshStore(hotel, hotelFacade.frames, materials.silver, 'NinaTowerHotelHorizontalTransoms');
  meshStore(hotel, hotelFacade.recess, materials.silver, 'NinaTowerHotelRecessedLouvreBands');
  merged(hotel, hotelFacade.louvres, materials.metal, 'NinaTowerHotelHorizontalLouvres');
  merged(hotel, hotelFacade.fins, materials.whiteSteel, 'NinaTowerHotelFineVerticalFins');
  merged(hotel, hotelFacade.accents, materials.warmAccent, 'NinaTowerHotelWarmBandAccents', false);
  const hotelCrown = createCrown(NINA_TOWER_HOTEL_SITE);
  meshStore(hotel, hotelCrown.wall, materials.silver, 'NinaTowerHotelBoatShapedCrownWalls');
  merged(hotel, hotelCrown.louvres, materials.metal, 'NinaTowerHotelCrownLouvres');
  merged(hotel, hotelCrown.frame, materials.whiteSteel, 'NinaTowerHotelUpsweptOpenRoofFrame');
  merged(hotel, hotelCrown.accents, materials.coolAccent, 'NinaTowerHotelRoofRimLighting', false);
  meshStore(hotel, hotelCrown.canopy, materials.silver, 'NinaTowerHotelRaisedCentralRoofCanopy');

  const podium = new THREE.Group(); podium.name = 'NinaTowerExactPodiumAndVehiclePortals'; group.add(podium);
  const podiumDetails = createPodium(podium, materials);
  const bridge = new THREE.Group(); bridge.name = 'NinaTowerCurvedGlassSkybridge'; group.add(bridge);
  const skybridge = createSkybridge(bridge, materials);
  const entranceColliders = createEntrance(podium, materials);

  const portals = new Set(NINA_TOWER_PODIUM_VEHICLE_PORTAL_EDGES);
  const colliders = [
    ninaTowerLocalCollider(NINA_TOWER_PODIUM_SITE, { w: NINA_TOWER_PODIUM_SITE.w, d: NINA_TOWER_PODIUM_SITE.d, minY: NINA_TOWER_PODIUM_SOFFIT, maxY: NINA_TOWER_PODIUM_ROOF }),
    ...ninaTowerRingColliders(NINA_TOWER_MAIN_SITE, 0, NINA_TOWER_HEIGHT, 0.9),
    ...ninaTowerRingColliders(NINA_TOWER_HOTEL_SITE, NINA_TOWER_PODIUM_ROOF, NINA_TOWER_HOTEL_HEIGHT, 0.9),
    ...NINA_TOWER_PODIUM_SITE.localRing.map((_, index) => index).filter((edge) => !portals.has(edge) && edge !== NINA_TOWER_PODIUM_ENTRANCE_EDGE)
      .map((edge) => ninaTowerEdgeCollider(NINA_TOWER_PODIUM_SITE.ring, edge, 0, NINA_TOWER_PODIUM_SOFFIT, 0.55)),
    podiumDetails.vaultCollider, ...skybridge.colliders, ...entranceColliders
  ];
  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }
  const landmark = { name: '如心廣場', englishName: 'Nina Tower', x: NINA_TOWER_MAIN_SITE.x, z: NINA_TOWER_MAIN_SITE.z,
    w: NINA_TOWER_PODIUM_SITE.w, d: NINA_TOWER_PODIUM_SITE.d, h: NINA_TOWER_HEIGHT, ry: NINA_TOWER_MAIN_SITE.ry,
    bounds: { ...NINA_TOWER_PODIUM_SITE.bounds }, ring: NINA_TOWER_MAIN_SITE.ring, osmId: NINA_TOWER_MAIN_SITE.osmId };
  const stats = {
    ninaTowerGroundOffset: groundOffset, ninaTowerLandmarks: 1, ninaTowerTowers: 2,
    ninaTowerOsmHeight: NINA_TOWER_OSM_HEIGHT, ninaTowerHeight: NINA_TOWER_HEIGHT, ninaTowerRoofHeight: NINA_TOWER_ROOF_HEIGHT,
    ninaTowerOccupiedHeight: NINA_TOWER_OCCUPIED_HEIGHT, ninaTowerObservatoryHeight: NINA_TOWER_OBSERVATORY_HEIGHT,
    ninaTowerLevels: NINA_TOWER_LEVELS, ninaTowerTopLevelLabel: NINA_TOWER_TOP_LEVEL_LABEL,
    ninaTowerBelowGroundLevels: NINA_TOWER_BELOW_GROUND_LEVELS, ninaTowerHotelHeight: NINA_TOWER_HOTEL_HEIGHT,
    ninaTowerHotelOccupiedHeight: NINA_TOWER_HOTEL_OCCUPIED_HEIGHT, ninaTowerHotelLevels: NINA_TOWER_HOTEL_LEVELS,
    ninaTowerHotelLocalReportedHeight: NINA_TOWER_HOTEL_LOCAL_REPORTED_HEIGHT,
    ninaTowerMainVisionPanels: mainFacade.visionPanels, ninaTowerHotelVisionPanels: hotelFacade.visionPanels,
    ninaTowerVerticalFins: mainFacade.finCount + hotelFacade.finCount,
    ninaTowerLouvreSlats: mainFacade.louvreSlats + hotelFacade.louvreSlats + mainCrown.crownLouvres + hotelCrown.crownLouvres,
    ninaTowerPodiumGroundPanels: podiumDetails.groundPanels, ninaTowerPodiumUpperPanels: podiumDetails.upperPanels,
    ninaTowerGroundVehiclePortals: NINA_TOWER_PODIUM_VEHICLE_PORTAL_EDGES.length,
    ninaTowerPodiumSoffit: NINA_TOWER_PODIUM_SOFFIT,
    ninaTowerSkybridgeSegments: skybridge.segments, ninaTowerSkybridgeTrussMembers: skybridge.trussMembers,
    ninaTowerSkybridgeEnclosureRibs: skybridge.enclosureRibs, ninaTowerSkybridgeClearHeight: skybridge.clearHeight,
    ninaTowerSkybridgeRoofRise: skybridge.roofRise,
    ninaTowerSkybridgeTrussDepth: NINA_TOWER_SKYBRIDGE_TRUSS_DEPTH, ninaTowerSkybridgeBow: NINA_TOWER_SKYBRIDGE.bow,
    ninaTowerColliders: colliders.length
  };
  group.userData.stats = stats;
  return { group, colliders, landmarks: [landmark], stats, groundOffset, plazaTop: NINA_TOWER_PLAZA_TOP + groundOffset };
}
