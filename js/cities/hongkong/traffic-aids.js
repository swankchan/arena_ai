import * as THREE from 'three/webgpu';
import { GEO } from '../../hk-geodata.js';
import { createRoadPaintMaterial } from '../../tsl-materials.js';
import {
  buildTrafficAidPaint,
  buildCrossingLayouts,
  clusterSignalPoints,
  surveySignalHeading
} from './traffic-aid-geometry.js';
import {
  VEHICLE_HEAD,
  PEDESTRIAN_HEAD,
  createVehicleHeadGeometry,
  createPedestrianHeadGeometry,
  createBeaconPoleGeometry
} from './traffic-signal-models.js';

// Surveyed Transport Department traffic aids. Vehicle-head positions and ANGLEs come from TIS_16; pole clustering,
// brackets, hardware dimensions and crossing furniture are derived. Every lens remains unlit: the slice has no phase
// plan. No pedestrian-sign pole is misused as a pedestrian traffic signal.

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

function matrixAt(x, y, z, heading = 0, scale = [1, 1, 1]) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading),
    new THREE.Vector3(...scale)
  );
}

function createSignals(group, aids, getGroundHeight) {
  const { assemblies, stats } = clusterSignalPoints(aids.signals);
  if (!assemblies.length) return { stats, assemblies };
  const segments = roadSegments();
  const poleMatrices = [], bracketMatrices = [], headMatrices = [];
  const poleHeight = VEHICLE_HEAD.mount + VEHICLE_HEAD.height + VEHICLE_HEAD.headroom;
  let facingFallbacks = 0, officialAngleHeads = 0;

  for (const assembly of assemblies) {
    const ground = getGroundHeight ? getGroundHeight(assembly.x, assembly.z) : 0;
    poleMatrices.push(matrixAt(assembly.x, ground + poleHeight * 0.5, assembly.z, 0, [1, poleHeight, 1]));
    for (const head of assembly.heads) {
      const surveyedHeading = surveySignalHeading(head.angle);
      const fallback = surveyedHeading == null ? deriveFacing(head.x, head.z, segments).heading : 0;
      if (surveyedHeading == null) facingFallbacks++;
      else officialAngleHeads++;
      const heading = surveyedHeading ?? fallback;
      const fx = Math.sin(heading), fz = Math.cos(heading);
      // Back-to-back heads need a short bracket; without it, coincident source points occupy the same housing.
      const offset = 0.22;
      headMatrices.push(matrixAt(
        assembly.x + fx * offset, ground + VEHICLE_HEAD.mount + VEHICLE_HEAD.height * 0.5,
        assembly.z + fz * offset, heading
      ));
      bracketMatrices.push(matrixAt(
        assembly.x + fx * 0.10, ground + VEHICLE_HEAD.mount + 0.16, assembly.z + fz * 0.10,
        heading, [1, 1, 0.34]
      ));
    }
  }

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x171c1f, roughness: 0.50, metalness: 0.28 });
  const rimMaterial = new THREE.MeshStandardMaterial({ color: 0x080b0c, roughness: 0.40, metalness: 0.38 });
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x778184, roughness: 0.40, metalness: 0.66 });
  const parts = createVehicleHeadGeometry();
  addInstanced(group, new THREE.CylinderGeometry(0.052, 0.068, 1, 10), poleMaterial, poleMatrices, 'HongKongSignalPoles');
  addInstanced(group, new THREE.BoxGeometry(0.055, 0.065, 1), poleMaterial, bracketMatrices, 'HongKongSignalBrackets');
  addInstanced(group, parts.housing, bodyMaterial, headMatrices, 'HongKongSignalHeads');
  addInstanced(group, parts.rims, rimMaterial, headMatrices, 'HongKongSignalLensRims');

  const lensColours = [0x561c21, 0x574016, 0x17452e];
  const lensNames = ['Red', 'Amber', 'Green'];
  for (let i = 0; i < 3; i++) {
    const material = new THREE.MeshStandardMaterial({ color: lensColours[i], roughness: 0.24, metalness: 0.16 });
    addInstanced(group, parts.lenses[i], material, headMatrices, `HongKongSignalLens${lensNames[i]}`, false);
  }

  return {
    assemblies,
    stats: {
      ...stats,
      signalHeads: headMatrices.length,
      signalOfficialAngleHeads: officialAngleHeads,
      signalFacingFallbacks: facingFallbacks,
      signalState: 'inert-no-official-phase-data'
    }
  };
}

function createCrossingFurniture(group, aids, getGroundHeight) {
  const layouts = buildCrossingLayouts(aids);
  const poleMatrices = [], headMatrices = [], unitMatrices = [];
  const beaconPoleMatrices = [], beaconGlobeMatrices = [], beaconCapMatrices = [];
  const poleHeight = 2.55;

  for (const layout of layouts) {
    for (const end of layout.endpoints) {
      const ground = getGroundHeight ? getGroundHeight(end.x, end.z) : 0;
      if (layout.zebra) {
        beaconPoleMatrices.push(matrixAt(end.x, ground + 1.125, end.z));
        beaconCapMatrices.push(matrixAt(end.x, ground + 2.28, end.z));
        beaconGlobeMatrices.push(matrixAt(end.x, ground + 2.48, end.z));
      } else {
        poleMatrices.push(matrixAt(end.x, ground + poleHeight * 0.5, end.z, 0, [1, poleHeight, 1]));
        headMatrices.push(matrixAt(end.x, ground + PEDESTRIAN_HEAD.centre, end.z, end.heading));
        unitMatrices.push(matrixAt(end.x, ground + 1.05, end.z, end.heading));
      }
    }
  }

  const silver = new THREE.MeshStandardMaterial({ color: 0x7a8384, roughness: 0.43, metalness: 0.62 });
  const black = new THREE.MeshStandardMaterial({ color: 0x151a1c, roughness: 0.52, metalness: 0.24 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xd4a928, roughness: 0.48, metalness: 0.12 });
  const parts = createPedestrianHeadGeometry();
  addInstanced(group, new THREE.CylinderGeometry(0.045, 0.058, 1, 10), silver, poleMatrices, 'HongKongPedestrianSignalPoles');
  addInstanced(group, parts.housing, black, headMatrices, 'HongKongPedestrianSignalHeads');
  addInstanced(group, parts.face, parts.faceMaterial, headMatrices, 'HongKongPedestrianRedGreenMan', false);
  // The exact push-button/tactile variant is not in TIS_16; this is a generic yellow eATS-style control unit.
  addInstanced(group, parts.unit, yellow, unitMatrices, 'HongKongPedestrianControlUnits');
  addInstanced(group, parts.unitDetails, black, unitMatrices, 'HongKongPedestrianControlUnitDetails', false);

  const beaconPoleMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.48, metalness: 0.32 });
  const globeMaterial = new THREE.MeshStandardMaterial({
    color: 0xdca72c, roughness: 0.30, metalness: 0.05, emissive: 0x4d2b05, emissiveIntensity: 0.18
  });
  addInstanced(group, createBeaconPoleGeometry(), beaconPoleMaterial, beaconPoleMatrices, 'HongKongBelishaStripedPoles');
  addInstanced(group, new THREE.CylinderGeometry(0.07, 0.07, 0.08, 12), black, beaconCapMatrices, 'HongKongBelishaCaps');
  addInstanced(group, new THREE.SphereGeometry(0.19, 18, 12), globeMaterial, beaconGlobeMatrices, 'HongKongBelishaAmberGlobes', false);

  return {
    layouts,
    stats: {
      pedestrianSignalHeads: headMatrices.length,
      pedestrianControlUnits: unitMatrices.length,
      belishaBeacons: beaconGlobeMatrices.length,
      crossingFurniture: 'derived-from-surveyed-stripe-extents'
    }
  };
}

export function createHongKongTrafficAids(root, { getGroundHeight, surfaceY = 0 } = {}) {
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
  paintMesh.position.y = surfaceY;
  paintMesh.receiveShadow = true;
  paintMesh.renderOrder = -1;
  group.add(paintMesh);

  const signals = createSignals(group, aids, getGroundHeight);
  const crossing = createCrossingFurniture(group, aids, getGroundHeight);
  const stats = { ...data.stats, ...signals.stats, ...crossing.stats, paintBaseY: surfaceY };
  group.userData.trafficAids = {
    source: aids.source,
    bbox: aids.bbox,
    official: 'Feature positions, line/ring extents, vehicle-head IDs/codes/ANGLEs',
    derived: 'Paint sections/modules, stripe triangulation, pole assemblies/brackets, hardware and crossing furniture',
    notDerived: 'No OSM-centreline markings, pedestrian-sign poles reused as signals, filled ladders or invented phases',
    stats
  };
  console.info('[hongkong] surveyed traffic aids', stats);
  return {
    group, stats, paintMesh,
    signalAssemblies: signals.assemblies,
    crossingLayouts: crossing.layouts
  };
}
