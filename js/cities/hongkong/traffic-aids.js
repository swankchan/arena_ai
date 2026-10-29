import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GEO } from '../../hk-geodata.js';
import { createRoadPaintMaterial } from '../../tsl-materials.js';
import { buildTrafficAidPaint, clusterSignalPoints } from './traffic-aid-geometry.js';

// Surveyed Transport Department traffic aids. The old OSM-width lane-dash generator is intentionally not used: where
// this slice has no surveyed marking, this module draws none. Signal positions are official; head dimensions, the
// coincident-point assemblies and road-relative facing are derived. Lenses stay unlit because TIS_16 has no phase plan.

function linkPoints(link) {
  const nodes = GEO.roadGraph.nodes;
  const points = [[nodes[link[0] * 2], nodes[link[0] * 2 + 1]]];
  for (let i = 0; i + 1 < link[6].length; i += 2) points.push([link[6][i], link[6][i + 1]]);
  points.push([nodes[link[1] * 2], nodes[link[1] * 2 + 1]]);
  return points;
}

function roadSegments() {
  const segments = [];
  for (const link of GEO.roadGraph.links) {
    const points = linkPoints(link);
    for (let i = 0; i + 1 < points.length; i++) {
      const a = points[i], b = points[i + 1];
      let dx = b[0] - a[0], dz = b[1] - a[1];
      const length = Math.hypot(dx, dz);
      if (length < 0.01) continue;
      if (link[5] === -1) { dx = -dx; dz = -dz; }
      segments.push({ a, b, dx: dx / length, dz: dz / length, length, oneWay: link[5] !== 0 });
    }
  }
  return segments;
}

function deriveFacing(x, z, segments) {
  let best = null, bestDistance = Infinity;
  for (const segment of segments) {
    const px = x - segment.a[0], pz = z - segment.a[1];
    const along = Math.max(0, Math.min(segment.length, px * segment.dx + pz * segment.dz));
    const cx = segment.a[0] + segment.dx * along, cz = segment.a[1] + segment.dz * along;
    const distance = Math.hypot(x - cx, z - cz);
    if (distance < bestDistance) { bestDistance = distance; best = { segment, cx, cz }; }
  }
  if (!best) return { heading: 0, distance: Infinity };
  const { segment, cx, cz } = best;
  // Positive on the nearside (left of travel in Hong Kong). One-way streets serve the same flow from both kerbs;
  // two-way streets use the side to choose which approach the head addresses. This is derived, not TD's ANGLE field.
  const side = (x - cx) * segment.dz + (z - cz) * -segment.dx;
  const facesBack = segment.oneWay || side > 0;
  const fx = facesBack ? -segment.dx : segment.dx;
  const fz = facesBack ? -segment.dz : segment.dz;
  return { heading: Math.atan2(fx, fz), distance: bestDistance };
}

function addInstanced(group, geometry, material, matrices, name, shadows = true) {
  if (!matrices.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
  matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = name;
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  mesh.frustumCulled = false;
  group.add(mesh);
  return mesh;
}

function createSignals(group, aids, getGroundHeight) {
  const { assemblies, stats } = clusterSignalPoints(aids.signals);
  if (!assemblies.length) return { stats, assemblies };
  const segments = roadSegments();
  const poleMatrices = [], headMatrices = [];
  const mountHeight = 2.40, headHeight = 1.10, headroom = 0.15;
  let facingFallbacks = 0;

  for (const assembly of assemblies) {
    const ground = getGroundHeight ? getGroundHeight(assembly.x, assembly.z) : 0;
    const { heading, distance } = deriveFacing(assembly.x, assembly.z, segments);
    if (!Number.isFinite(distance)) facingFallbacks++;
    const quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading);
    headMatrices.push(new THREE.Matrix4().compose(
      new THREE.Vector3(assembly.x, ground + mountHeight + headHeight * 0.5, assembly.z),
      quaternion,
      new THREE.Vector3(1, 1, 1)
    ));
    poleMatrices.push(new THREE.Matrix4().compose(
      new THREE.Vector3(assembly.x, ground + (mountHeight + headHeight + headroom) * 0.5, assembly.z),
      new THREE.Quaternion(),
      new THREE.Vector3(1, mountHeight + headHeight + headroom, 1)
    ));
    assembly.heading = heading;
    assembly.hostDistance = distance;
  }

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x252a2d, roughness: 0.48, metalness: 0.48 });
  const poleGeometry = new THREE.CylinderGeometry(0.055, 0.07, 1, 8);
  const lensY = [0.34, 0, -0.34];
  const housingParts = [new THREE.BoxGeometry(0.42, headHeight, 0.30)];
  for (const y of lensY) {
    const visor = new THREE.CylinderGeometry(0.16, 0.16, 0.20, 12, 1, true, Math.PI / 2, Math.PI);
    visor.rotateX(Math.PI / 2);
    visor.translate(0, y, 0.22);
    housingParts.push(visor);
  }
  const housingGeometry = mergeGeometries(housingParts, false);
  addInstanced(group, poleGeometry, bodyMaterial, poleMatrices, 'HongKongSignalPoles');
  addInstanced(group, housingGeometry, bodyMaterial, headMatrices, 'HongKongSignalHeads');

  const lensColours = [0x48171a, 0x4b3511, 0x123a26];
  const lensNames = ['Red', 'Amber', 'Green'];
  for (let i = 0; i < 3; i++) {
    const geometry = new THREE.CircleGeometry(0.125, 16);
    geometry.translate(0, lensY[i], 0.156);
    const material = new THREE.MeshStandardMaterial({ color: lensColours[i], roughness: 0.28, metalness: 0.12 });
    addInstanced(group, geometry, material, headMatrices, `HongKongSignalLens${lensNames[i]}`, false);
  }

  return {
    assemblies,
    stats: {
      ...stats,
      signalFacingDerived: assemblies.length - facingFallbacks,
      signalFacingFallbacks: facingFallbacks,
      signalState: 'inert-no-official-phase-data'
    }
  };
}

export function createHongKongTrafficAids(root, { getGroundHeight } = {}) {
  const aids = GEO.trafficAids;
  const group = new THREE.Group();
  group.name = 'HongKongSurveyedTrafficAids';
  root.add(group);
  if (!aids) return { group, stats: { sourceRoadMarkFeatures: 0, sourceSignalPoints: 0 } };

  const data = buildTrafficAidPaint(aids);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.position, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normal, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.color, 3));
  geometry.setAttribute('side', new THREE.Float32BufferAttribute(data.side, 2));
  geometry.setAttribute('paint', new THREE.Float32BufferAttribute(data.paint, 3));
  geometry.setIndex(data.index);
  geometry.computeBoundingSphere();
  const paintMesh = new THREE.Mesh(geometry, createRoadPaintMaterial());
  paintMesh.name = 'HongKongSurveyedRoadPaint';
  paintMesh.receiveShadow = true;
  paintMesh.renderOrder = -1; // under other see-through ground effects, matching the existing road-paint pass
  group.add(paintMesh);

  const signals = createSignals(group, aids, getGroundHeight);
  const stats = { ...data.stats, ...signals.stats };
  group.userData.trafficAids = {
    source: aids.source,
    bbox: aids.bbox,
    official: 'Feature positions and source line/ring extents',
    derived: 'TPDM paint cross-sections/modules, stripe triangulation, signal assemblies, head dimensions and facing',
    notDerived: 'No OSM-centreline markings, no filled crossing ladders, no invented signal phases',
    stats
  };
  console.info('[hongkong] surveyed traffic aids', stats);
  return { group, stats, paintMesh, signalAssemblies: signals.assemblies };
}
