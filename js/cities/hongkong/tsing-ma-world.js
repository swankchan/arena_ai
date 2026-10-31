import * as THREE from 'three/webgpu';
import { isTerritoryLand } from './full-meta.js';
import {
  TSING_MA_TOWERS,
  sampleTsingMa,
  tsingMaCablePoint,
  tsingMaCableHeight
} from './tsing-ma-architecture.js';

const WATER_BOTTOM = -3.2;
const LAND_BOTTOM = -0.08;

function luminous(color, intensity) {
  return new THREE.MeshStandardMaterial({ color: 0x101010, emissive: color, emissiveIntensity: intensity, roughness: 0.38 });
}

function addInstances(group, geometry, material, transforms, name) {
  if (!transforms.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < transforms.length; i++) {
    const t = transforms[i];
    dummy.position.set(t.x, t.y, t.z);
    dummy.rotation.set(0, t.heading || 0, 0);
    dummy.scale.set(t.sx ?? 1, t.sy ?? 1, t.sz ?? 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = name;
  mesh.frustumCulled = false;
  group.add(mesh);
  return mesh;
}

export function buildTsingMaArchitecture(root) {
  const group = new THREE.Group();
  group.name = 'HongKongTsingMaArchitecture';
  group.userData.tsingMaArchitecture = true;
  const concrete = new THREE.MeshStandardMaterial({ color: 0x9aa4aa, roughness: 0.68, metalness: 0.08 });
  const cableMaterial = new THREE.MeshStandardMaterial({ color: 0x8d969c, roughness: 0.42, metalness: 0.55 });
  const suspenderMaterial = new THREE.MeshStandardMaterial({ color: 0x818b91, roughness: 0.48, metalness: 0.42 });
  const warmLight = luminous(0xffb84d, 3.4);
  const cyanLight = luminous(0x20c9ff, 3.2);
  const magentaLight = luminous(0xff4fbd, 3.2);

  function box(x, y, z, sx, sy, sz, heading, material, name) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
    mesh.position.set(x, y, z);
    mesh.rotation.y = heading;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = name;
    group.add(mesh);
    return mesh;
  }

  function beam(a, b, thickness, material, name) {
    const direction = new THREE.Vector3().subVectors(b, a), length = direction.length();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, length, thickness), material);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    mesh.castShadow = true;
    mesh.name = name;
    group.add(mesh);
    return mesh;
  }

  const warmLights = [], deckLights = [], suspenders = [], lampPosts = [];
  for (const [towerIndex, tower] of TSING_MA_TOWERS.entries()) {
    const { frame, topY } = tower;
    const bottom = isTerritoryLand(frame.x, frame.z) ? LAND_BOTTOM : WATER_BOTTOM;
    const legOffset = frame.halfDeck + 2.3;
    const upperLegMaterial = towerIndex === 0 ? cyanLight : magentaLight;
    for (const side of [-1, 1]) {
      const x = frame.x + frame.normalX * legOffset * side;
      const z = frame.z + frame.normalZ * legOffset * side;
      box(x, bottom + (topY - bottom) * 0.5, z, 3, topY - bottom, 4.2, frame.heading, concrete, 'TsingMaTowerLeg');
      const lowerTop = frame.y + 12, lowerBottom = bottom + 1;
      for (const face of [-1, 1]) {
        const stripX = x + frame.normalX * face * 1.56, stripZ = z + frame.normalZ * face * 1.56;
        box(stripX, (lowerBottom + lowerTop) * 0.5, stripZ, 0.38, lowerTop - lowerBottom, 4.35,
          frame.heading, cyanLight, 'TsingMaTowerLowerLight');
        box(stripX, (lowerTop + topY - 1) * 0.5, stripZ, 0.38, topY - 1 - lowerTop, 4.35,
          frame.heading, upperLegMaterial, 'TsingMaTowerUpperLight');
      }
      warmLights.push({ x, y: topY + 0.8, z, sx: 1.15, sy: 1.15, sz: 1.15 });
    }
    for (const level of [frame.y + 8, frame.y + 37, frame.y + 65, topY - 2]) {
      const a = new THREE.Vector3(frame.x - frame.normalX * legOffset, level, frame.z - frame.normalZ * legOffset);
      const b = new THREE.Vector3(frame.x + frame.normalX * legOffset, level, frame.z + frame.normalZ * legOffset);
      beam(a, b, 2.1, concrete, 'TsingMaTowerCrossbeam');
      beam(a.clone().add(new THREE.Vector3(0, 1.25, 0)), b.clone().add(new THREE.Vector3(0, 1.25, 0)),
        0.68, magentaLight, 'TsingMaTowerCrossbeamLight');
    }
    const glow = new THREE.PointLight(towerIndex === 0 ? 0xff4fbd : 0x20c9ff, 55, 190, 1.6);
    glow.position.set(frame.x, topY - 20, frame.z);
    group.add(glow);
  }

  const CABLE_SAMPLES = 360;
  for (const side of [-1, 1]) {
    const points = [];
    for (let i = 0; i <= CABLE_SAMPLES; i++) {
      const fraction = i / CABLE_SAMPLES, point = tsingMaCablePoint(fraction, side);
      points.push(new THREE.Vector3(point.x, point.y, point.z));
      if (i % 3 === 0) warmLights.push({ x: point.x, y: point.y, z: point.z, sx: 0.85, sy: 0.85, sz: 0.85 });
      if (i % 5 === 0) {
        const bottom = sampleTsingMa(fraction).y + 0.7, height = point.y - bottom;
        if (height > 1) suspenders.push({ x: point.x, y: bottom + height * 0.5, z: point.z, sy: height });
      }
    }
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 480, 0.28, 5, false), cableMaterial);
    cable.name = 'TsingMaMainCable';
    cable.castShadow = true;
    group.add(cable);
  }

  const DECK_LAMP_SAMPLES = 120;
  for (let i = 0; i <= DECK_LAMP_SAMPLES; i++) {
    const frame = sampleTsingMa(i / DECK_LAMP_SAMPLES);
    for (const side of [-1, 1]) {
      const offset = (frame.halfDeck + 0.35) * side;
      const x = frame.x + frame.normalX * offset, z = frame.z + frame.normalZ * offset;
      lampPosts.push({ x, y: frame.y + 2.85, z, sy: 4.3 });
      deckLights.push({ x, y: frame.y + 5.1, z, heading: frame.heading });
    }
  }

  addInstances(group, new THREE.CylinderGeometry(0.09, 0.09, 1, 4), suspenderMaterial, suspenders, 'TsingMaSuspenders');
  addInstances(group, new THREE.CylinderGeometry(0.12, 0.16, 1, 5), cableMaterial, lampPosts, 'TsingMaLampPosts');
  addInstances(group, new THREE.SphereGeometry(0.7, 7, 5), warmLight, warmLights, 'TsingMaWarmLights');
  addInstances(group, new THREE.BoxGeometry(0.85, 0.18, 0.45), warmLight, deckLights, 'TsingMaDeckLights');
  root.add(group);
  const stats = {
    tsingMaTowers: TSING_MA_TOWERS.length,
    tsingMaMainCables: 2,
    tsingMaSuspenders: suspenders.length,
    tsingMaLampPosts: lampPosts.length,
    tsingMaLights: warmLights.length + deckLights.length
  };
  group.userData.stats = stats;
  return { group, stats };
}
