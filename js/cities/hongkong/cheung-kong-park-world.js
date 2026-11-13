// 長江公園 Cheung Kong Park.
//
// A private garden laid out with Cheung Kong Center (1999, Cesar Pelli) over the terraced ground between Garden Road and
// Cotton Tree Drive, immediately east of St John's Cathedral. The park boundary is the OSM way 295407287 ring; the
// planting, ponds, waterfall and paths inside it are an interpretation of the published descriptions (ponds and
// cascades, a rock waterfall and rockery, winding shaded paths, benches, dense canopy, retained colonial stone steps),
// not a survey. The OSM `level=3` tag records that the garden sits on terraced podium levels — it is NOT a single flat
// deck, so the ground here follows the DTM and the terraces are drawn onto it rather than flattening it.
import * as THREE from 'three/webgpu';
import { CHEUNG_KONG_PARK_SITE as P, CHEUNG_KONG_PARK as K } from './st-johns-cathedral-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalCollider, harbourCityEdgeOutward } from './harbour-city-architecture.js';
import { box, cylinder, merged, hash } from './harbour-city-world-utils.js';

export function buildCheungKongPark(scene) {
  const ground = hongKongTerrainHeight(P.x, P.z);
  const root = new THREE.Group();
  root.name = 'Cheung Kong Park';
  root.position.set(P.x, ground, P.z);
  root.rotation.y = P.ry;
  scene.add(root);

  const ring = P.localRing;
  const edgeCount = ring.length / 2 - 1;
  const paving = [], lawn = [], stone = [], water = [], rock = [], iron = [], timber = [], canopy = [], benches = [];

  const toWorld = (lx, lz) => {
    const cs = Math.cos(P.ry), sn = Math.sin(P.ry);
    return [P.x + lx * cs + lz * sn, P.z - lx * sn + lz * cs];
  };
  // Ground under a local point, expressed as an offset from the park's centre datum.
  const groundAt = (lx, lz) => {
    const [x, z] = toWorld(lx, lz);
    return hongKongTerrainHeight(x, z) - ground;
  };

  // --- Surface ---------------------------------------------------------------------------------------------------
  // The garden floor follows the DTM: a triangulated fan over the ring, one central point and the mapped boundary. The
  // fall across the park is several metres, which is exactly what the terraced description and the `level=3` tag imply.
  {
    const positions = [], indices = [], colours = [];
    const centreY = 0.06;
    positions.push(0, centreY, 0);
    const centreTint = [0.30, 0.42, 0.22];
    colours.push(...centreTint);
    for (let i = 0; i < edgeCount; i++) {
      positions.push(ring[i * 2], groundAt(ring[i * 2], ring[i * 2 + 1]) + 0.06, ring[i * 2 + 1]);
      const tint = hash(i, 3, 11, 5);
      colours.push(0.26 + tint * 0.08, 0.38 + tint * 0.10, 0.20 + tint * 0.06);
    }
    for (let i = 0; i < edgeCount; i++) {
      indices.push(0, 1 + i, 1 + ((i + 1) % edgeCount));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
    mesh.name = 'Cheung Kong Park terraced garden floor';
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  // --- Ponds and cascade -----------------------------------------------------------------------------------------
  // Sources describe "ponds and cascades" and an artificial waterfall over rock. Two ponds on the lower terrace joined
  // by a cascade, plus the rock waterfall and grotto at the head. Positions and sizes are estimates within the ring.
  const ponds = [[-1.6, -12.0, K.pondRadius], [4.4, -2.0, K.pondRadius * 0.78]];
  for (const [lx, lz, radius] of ponds) {
    const base = groundAt(lx, lz);
    const rim = new THREE.CylinderGeometry(radius, radius, 0.5, 24);
    rim.translate(lx, base + 0.16, lz);
    stone.push(rim);
    const surface = new THREE.CylinderGeometry(radius * 0.92, radius * 0.92, 0.12, 24);
    surface.translate(lx, base + 0.40, lz);
    water.push(surface);
  }
  {
    // Cascade between the two ponds, following the fall of the ground.
    const [x0, z0, r0] = ponds[0], [x1, z1, r1] = ponds[1];
    const dx = x1 - x0, dz = z1 - z0, length = Math.hypot(dx, dz);
    const y0 = groundAt(x0, z0) + 0.38, y1 = groundAt(x1, z1) + 0.38;
    const steps = Math.max(3, Math.round(length / 1.6));
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const lx = x0 + dx * t, lz = z0 + dz * t;
      const y = y0 + (y1 - y0) * t;
      box(water, [lx, y, lz], [radiusTaper(r0, r1, t) * 1.1, 0.10, length / steps * 1.06], Math.atan2(-dz, dx) + Math.PI / 2);
    }
    // Rockery around the upper pond, and the waterfall face at its uphill end.
    const rk = hash(1, 2, 3, 4);
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + rk;
      const rr = r0 * (1.05 + hash(i, 7, 2, 1) * 0.35);
      const lx = x0 + Math.cos(angle) * rr, lz = z0 + Math.sin(angle) * rr;
      const h = 0.7 + hash(i, 5, 9, 3) * 1.5;
      const geometry = new THREE.DodecahedronGeometry(h * 0.55, 0);
      geometry.scale(1.2, 0.9, 1.1);
      geometry.translate(lx, groundAt(lx, lz) + h * 0.35, lz);
      rock.push(geometry);
    }
  }

  // --- Paths -----------------------------------------------------------------------------------------------------
  // Winding shaded paths between the ponds, plus the stair from Garden Road up into the garden. The park is entered from
  // the cathedral side (west) and from Cotton Tree Drive (east); those are the mapped approaches, not invented gates.
  {
    const waypoints = [
      [-14.0, 16.0], [-9.0, 9.0], [-6.5, 1.0], [-1.6, -6.0], [2.5, -9.5], [9.5, -8.0], [13.5, -2.0], [14.5, 8.0],
      [9.0, 16.0], [-2.0, 19.0], [-12.0, 20.0],
    ];
    for (let i = 0; i < waypoints.length; i++) {
      const [ax, az] = waypoints[i], [bx, bz] = waypoints[(i + 1) % waypoints.length];
      const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz);
      const steps = Math.max(1, Math.round(length / 2.0));
      for (let s = 0; s < steps; s++) {
        const t = (s + 0.5) / steps;
        const lx = ax + dx * t, lz = az + dz * t;
        box(paving, [lx, groundAt(lx, lz) + 0.09, lz], [K.pathWidth, 0.10, length / steps + 0.10], Math.atan2(-dz, dx) + Math.PI / 2);
      }
    }
  }
  // Retained colonial stone steps: a short flight climbing the terrace just inside the mapped west edge.
  {
    const stairX = -14.2, stairZ = 6.5, runX = 0.34, runZ = -0.26;
    const rise = Math.abs(groundAt(stairX, stairZ) - groundAt(-3.6, 4.5));
    const steps = Math.max(4, Math.min(24, Math.round(rise / 0.20)));
    const y0 = Math.min(groundAt(stairX, stairZ), groundAt(-3.6, 4.5));
    const perStep = (groundAt(stairX, stairZ) > groundAt(-3.6, 4.5) ? -1 : 1) * (rise / steps);
    for (let i = 0; i < steps; i++) {
      const lx = stairX + i * runX, lz = stairZ + i * runZ;
      box(stone, [lx, y0 + Math.abs(perStep) * (i + 0.5) + 0.05, lz], [K.stairWidth, Math.abs(perStep) + 0.10, 0.34], 0.9);
      for (const side of [-1, 1]) {
        box(iron, [lx, y0 + Math.abs(perStep) * (i + 0.5) + 0.55, lz + side * (K.stairWidth * 0.5)], [0.07, 1.05, 0.07]);
      }
    }
  }

  // --- Benches ---------------------------------------------------------------------------------------------------
  // "Benches for quiet reflection" on the terraces, facing the ponds. Count and positions are estimates.
  for (let i = 0; i < K.benchCount; i++) {
    const angle = (i / K.benchCount) * Math.PI * 2;
    const lx = Math.cos(angle) * (K.pondRadius + 3.4), lz = Math.sin(angle) * (K.pondRadius + 3.2) - 5.0;
    const y = groundAt(lx, lz);
    const ry = Math.atan2(-lx, -lz);
    box(benches, [lx, y + 0.44, lz], [1.75, 0.10, 0.46], ry);
    box(benches, [lx, y + 0.72, lz], [1.75, 0.34, 0.08], ry);
    for (const side of [-1, 1]) box(iron, [lx + Math.cos(ry) * side * 0.72, y + 0.22, lz - Math.sin(ry) * side * 0.72], [0.09, 0.44, 0.40], ry);
  }

  // --- Canopy ----------------------------------------------------------------------------------------------------
  // The park is famous for dense canopy — it runs 2-3 °C cooler than the streets. Trees are placed on a jittered grid
  // inside the ring, skipped where a pond, path or the rockery already occupies the ground.
  {
    const occupied = [...ponds.map(([lx, lz, r]) => [lx, lz, r + 2.4])];
    for (let gx = -14; gx <= 14; gx += 3.6) {
      for (let gz = -21; gz <= 22; gz += 3.6) {
        const lx = gx + (hash(gx, gz, 1, 7) - 0.5) * 2.0;
        const lz = gz + (hash(gx, gz, 2, 9) - 0.5) * 2.0;
        if (!insideRing(ring, lx, lz, 2.0)) continue;
        if (occupied.some(([ox, oz, r]) => Math.hypot(lx - ox, lz - oz) < r)) continue;
        // Keep the stair flight and the two main approach paths clear.
        if (lx < -13.0 && lz > 17.0) continue;
        if (Math.hypot(lx + 6.5, lz - 1.0) < 3.2) continue;
        const scale = 0.75 + hash(lx, lz, 5, 3) * 0.55;
        const y = groundAt(lx, lz);
        const trunk = 2.6 * scale;
        cylinder(canopy, [lx, y + trunk * 0.5, lz], 0.18 * scale, trunk, 7);
        for (const [ox, oy, oz, r] of [[0, trunk + 1.5 * scale, 0, 1.9 * scale], [0.7 * scale, trunk + 2.2 * scale, 0.3 * scale, 1.25 * scale], [-0.6 * scale, trunk + 2.0 * scale, -0.4 * scale, 1.15 * scale]]) {
          cylinder(canopy, [lx + ox, y + oy, lz + oz], r, r * 1.45, 8, r * 0.55);
        }
      }
    }
  }

  // Low boundary treatment: the mapped ring is a garden edge, so only a slim kerb and the retained railing are drawn.
  for (let edge = 0; edge < edgeCount; edge += 1) {
    const outward = harbourCityEdgeOutward(ring, edge);
    if (outward.length < 5) continue;
    const mx = (ring[edge * 2] + ring[edge * 2 + 2]) * 0.5;
    const mz = (ring[edge * 2 + 1] + ring[edge * 2 + 3]) * 0.5;
    box(stone, [mx, groundAt(mx, mz) + 0.12, mz], [outward.length, 0.24, 0.35], outward.ry);
  }

  // --- Materials -------------------------------------------------------------------------------------------------
  const pavingMaterial = new THREE.MeshStandardMaterial({ color: 0x9c9a90, roughness: 0.95 });
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x8b8578, roughness: 0.94, metalness: 0.02 });
  const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x2f4a4c, roughness: 0.12, metalness: 0.5, transparent: true, opacity: 0.86 });
  const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x6d6a62, roughness: 0.97, metalness: 0.02 });
  const ironMaterial = new THREE.MeshStandardMaterial({ color: 0x24282a, roughness: 0.5, metalness: 0.65 });
  const timberMaterial = new THREE.MeshStandardMaterial({ color: 0x5b4632, roughness: 0.85, metalness: 0.03 });
  const canopyMaterial = new THREE.MeshStandardMaterial({ color: 0x2f4a2a, roughness: 0.95, metalness: 0 });

  merged(root, unindexed(paving), pavingMaterial, 'Cheung Kong Park paths', false);
  merged(root, unindexed(lawn), new THREE.MeshStandardMaterial({ color: 0x3f5a2c, roughness: 0.96 }), 'Cheung Kong Park lawn', false);
  merged(root, unindexed(stone), stoneMaterial, 'Cheung Kong Park retaining and stone steps', false);
  merged(root, unindexed(water), waterMaterial, 'Cheung Kong Park ponds and cascade', false);
  merged(root, unindexed(rock), rockMaterial, 'Cheung Kong Park rockery', false);
  merged(root, unindexed(iron), ironMaterial, 'Cheung Kong Park railings and bench frames', false);
  merged(root, unindexed(benches), timberMaterial, 'Cheung Kong Park benches', false);
  merged(root, unindexed(canopy), canopyMaterial, 'Cheung Kong Park canopy', false);

  // The park is a garden, so only the rockery and the stair railings are solid enough to stop the player. Everything
  // else is walkable ground, and no collider is drawn over a mapped path.
  const colliders = [];
  for (const [lx, lz, r] of ponds) {
    const [x, z] = toWorld(lx, lz);
    colliders.push(harbourCityLocalCollider(P, lx, lz, r * 1.7, r * 1.7, ground - 1, ground + 1.2));
    void x; void z;
  }

  return {
    group: root,
    colliders,
    landmarks: [{
      id: 'cheung-kong-park', name: '長江公園 Cheung Kong Park',
      position: { x: P.x, y: ground, z: P.z }, radius: 26, height: 14,
    }],
    stats: {
      cheungKongParkAreaM2: Math.round(P.ringArea),
      cheungKongParkPonds: ponds.length,
      cheungKongParkCanopyInstances: canopy.length,
      cheungKongParkTerraceFallM: Math.round((Math.abs(groundAt(ring[0], ring[1]) - groundAt(ring[4], ring[5])) + Math.abs(groundAt(ring[4], ring[5]) - groundAt(ring[2], ring[3]))) * 100) / 100,
    },
    groundOffset: ground,
  };
}

function radiusTaper(a, b, t) { return a + (b - a) * t; }

function unindexed(parts) {
  return parts.map((part) => {
    if (!part.index) return part;
    const flat = part.toNonIndexed();
    part.dispose();
    return flat;
  });
}

function insideRing(ring, x, z, margin = 0) {
  const n = ring.length / 2 - 1;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i * 2], zi = ring[i * 2 + 1], xj = ring[j * 2], zj = ring[j * 2 + 1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  if (!inside) return false;
  if (margin === 0) return true;
  return distanceToRing(ring, x, z) > margin;
}

function distanceToRing(ring, x, z) {
  const n = ring.length / 2 - 1;
  let best = Infinity;
  for (let i = 0; i < n; i++) {
    const ax = ring[i * 2], az = ring[i * 2 + 1], bx = ring[(i + 1) * 2], bz = ring[(i + 1) * 2 + 1];
    const dx = bx - ax, dz = bz - az, lengthSq = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
