import * as THREE from 'three/webgpu';
import { createRoadSurfaceMaterial } from '../../tsl-materials.js';
import { CROSSING_ROUTES } from './crossings.js';
import { isTerritoryLand } from './full-meta.js';
import { buildTsingMaArchitecture } from './tsing-ma-world.js';
import { TSING_MA_TOWER_FRACTIONS } from './tsing-ma-architecture.js';
import { segmentWall } from './colliders.js';

const WATER_LEVEL = -2.2;
const LAND_TOP = -0.08;

function addTopQuad(positions, a, b, width, lift = 0, extraWidth = 0) {
  let dx = b.x - a.x, dz = b.z - a.z;
  const length = Math.hypot(dx, dz);
  if (length < 0.01) return;
  dx /= length; dz /= length;
  const extension = 0.35, half = (width + extraWidth) * 0.5;
  const ax = a.x - dx * extension, az = a.z - dz * extension;
  const bx = b.x + dx * extension, bz = b.z + dz * extension;
  const nx = dz * half, nz = -dx * half;
  const a0 = [ax + nx, a.y + lift, az + nz], a1 = [ax - nx, a.y + lift, az - nz];
  const b0 = [bx + nx, b.y + lift, bz + nz], b1 = [bx - nx, b.y + lift, bz - nz];
  positions.push(...a0, ...b1, ...b0, ...a0, ...a1, ...b1);
}

function addSideQuad(positions, a, b, offset, bottom, top) {
  let dx = b.x - a.x, dz = b.z - a.z;
  const length = Math.hypot(dx, dz);
  if (length < 0.01) return;
  dx /= length; dz /= length;
  const nx = dz * offset, nz = -dx * offset;
  const a0 = [a.x + nx, a.y + bottom, a.z + nz], a1 = [a.x + nx, a.y + top, a.z + nz];
  const b0 = [b.x + nx, b.y + bottom, b.z + nz], b1 = [b.x + nx, b.y + top, b.z + nz];
  positions.push(...a0, ...b0, ...b1, ...a0, ...b1, ...a1);
}

function addMesh(group, positions, material, name) {
  if (!positions.length) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addSideCollider(colliders, a, b, offset, top) {
  let dx = b.x - a.x, dz = b.z - a.z;
  const length = Math.hypot(dx, dz);
  if (length < 0.01) return;
  dx /= length; dz /= length;
  const nx = dz * offset, nz = -dx * offset;
  const wall = segmentWall(a.x + nx, a.z + nz, b.x + nx, b.z + nz, {
    thickness: 0.22,
    base: Math.min(a.y, b.y) - 0.15,
    top: Math.max(a.y, b.y) + top
  });
  if (wall) colliders.push(wall);
}

function addRoofCollider(colliders, a, b, width) {
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
  if (length < 0.01) return;
  const ux = dx / length, uz = dz / length, hx = length * 0.5 + 0.35, hz = width * 0.5 + 0.85;
  const cx = (a.x + b.x) * 0.5, cz = (a.z + b.z) * 0.5;
  const ex = Math.abs(ux) * hx + Math.abs(uz) * hz;
  const ez = Math.abs(uz) * hx + Math.abs(ux) * hz;
  colliders.push({
    minX: cx - ex, maxX: cx + ex, minZ: cz - ez, maxZ: cz + ez,
    minY: Math.min(a.y, b.y) + 5.35, maxY: Math.max(a.y, b.y) + 5.9,
    obb: { cx, cz, hx, hz, cs: ux, sn: -uz }
  });
}

function addPortal(group, point, neighbour, material) {
  const portal = new THREE.Group();
  portal.position.set(point.x, point.y, point.z);
  portal.rotation.y = Math.atan2(neighbour.x - point.x, neighbour.z - point.z);
  const half = point.width * 0.5;
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 5.8, 0.8), material);
    pillar.position.set(side * (half + 0.65), 2.75, 0);
    portal.add(pillar);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(point.width + 2, 0.7, 0.8), material);
  lintel.position.y = 5.45;
  portal.add(lintel);
  group.add(portal);
}

export function buildHongKongCrossings(root) {
  const colliders = [];
  const roadMaterial = createRoadSurfaceMaterial();
  const deckMaterial = new THREE.MeshStandardMaterial({ color: 0x60666a, roughness: 0.9, side: THREE.DoubleSide });
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x9aa1a4, roughness: 0.72, metalness: 0.15, side: THREE.DoubleSide });
  const tunnelMaterial = new THREE.MeshStandardMaterial({ color: 0x303438, roughness: 0.96, side: THREE.DoubleSide });
  const pierMaterial = new THREE.MeshStandardMaterial({ color: 0x707578, roughness: 0.94 });
  let segments = 0, bridgePiers = 0, tunnelSegments = 0, portals = 0;

  for (const route of CROSSING_ROUTES) {
    const group = new THREE.Group();
    group.name = `HongKongCrossing:${route.id}`;
    group.userData.crossingRoute = route.id;
    const road = [], deck = [], rails = [], tunnel = [];
    let firstTube = null, lastTube = null, nextPier = 120;

    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1], b = route.points[i], width = Math.max(a.width, b.width);
      addTopQuad(road, a, b, width);
      segments++;
      if (route.kind === 'bridge') {
        addTopQuad(deck, a, b, width, -0.75);
        for (const side of [-1, 1]) {
          addSideQuad(deck, a, b, side * width * 0.5, -0.75, 0);
          addSideQuad(rails, a, b, side * (width * 0.5 - 0.08), 0.12, 1.05);
          addSideCollider(colliders, a, b, side * (width * 0.5 + 0.04), 1.15);
        }
      } else {
        const tube = Math.min(a.y, b.y) < -1;
        if (tube) {
          if (!firstTube) firstTube = { a, b };
          lastTube = { a, b };
          tunnelSegments++;
          addTopQuad(tunnel, a, b, width, 5.5, 1.3);
          addRoofCollider(colliders, a, b, width);
        }
        for (const side of [-1, 1]) {
          addSideQuad(tunnel, a, b, side * (width * 0.5 + 0.45), -0.1, tube ? 5.5 : 1.05);
          addSideCollider(colliders, a, b, side * (width * 0.5 + 0.45), tube ? 5.6 : 1.15);
        }
      }
    }

    addMesh(group, road, roadMaterial, `${group.name}:road`);
    addMesh(group, deck, deckMaterial, `${group.name}:deck`);
    addMesh(group, rails, railMaterial, `${group.name}:rails`);
    addMesh(group, tunnel, tunnelMaterial, `${group.name}:tunnel`);

    if (route.kind === 'bridge') {
      for (let i = 1; i < route.points.length; i++) {
        const point = route.points[i];
        if (point.s < nextPier || point.y < 8) continue;
        const routeFraction = point.s / route.length;
        // The shared suspension towers carry Tsing Ma's central span; generic approach piers must not fill that opening.
        if (route.crossingId === 'tsing-ma' && routeFraction >= TSING_MA_TOWER_FRACTIONS[0]
          && routeFraction <= TSING_MA_TOWER_FRACTIONS[1]) continue;
        const previous = route.points[i - 1];
        const bottom = isTerritoryLand(point.x, point.z) ? LAND_TOP : WATER_LEVEL - 1;
        const top = point.y - 0.75, height = top - bottom;
        if (height < 4) continue;
        const pier = new THREE.Mesh(new THREE.BoxGeometry(2.4, height, 4.8), pierMaterial);
        pier.position.set(point.x, bottom + height * 0.5, point.z);
        pier.rotation.y = Math.atan2(point.x - previous.x, point.z - previous.z);
        group.add(pier);
        bridgePiers++;
        nextPier = point.s + 160;
      }
    } else if (firstTube && lastTube) {
      addPortal(group, firstTube.a, firstTube.b, deckMaterial);
      addPortal(group, lastTube.b, lastTube.a, deckMaterial);
      portals += 2;
    }
    root.add(group);
  }

  const tsingMa = buildTsingMaArchitecture(root);
  return {
    colliders,
    update: tsingMa.update,
    stats: {
      crossingRoutes: CROSSING_ROUTES.length,
      crossingSegments: segments,
      crossingBridgePiers: bridgePiers,
      crossingTunnelSegments: tunnelSegments,
      crossingPortals: portals,
      crossingColliders: colliders.length,
      ...tsingMa.stats
    }
  };
}
