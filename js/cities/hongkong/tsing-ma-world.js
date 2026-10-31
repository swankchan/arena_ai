import * as THREE from 'three/webgpu';
import { color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import { isTerritoryLand } from './full-meta.js';
import {
  TSING_MA_TOWERS,
  tsingMaDeckEdgePoint,
  tsingMaLampBasePoint,
  tsingMaCablePoint
} from './tsing-ma-architecture.js';

const WATER_BOTTOM = -3.2;
const LAND_BOTTOM = -0.08;

function luminous(lightColor, intensity, dayColor) {
  const material = new THREE.MeshStandardNodeMaterial({ color: dayColor, roughness: 0.62, metalness: 0.04 });
  const night = smoothstep(0.7, 1.45, cityUniforms.uInteriorGlow);
  material.emissiveNode = color(lightColor).mul(night.mul(intensity));
  return material;
}

function nightAmount() {
  const t = Math.max(0, Math.min(1, (cityUniforms.uInteriorGlow.value - 0.7) / 0.75));
  return t * t * (3 - 2 * t);
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
  // Neutral concrete and steel match the daylight photographs; all colour/emissive terms remain night-gated.
  const concrete = new THREE.MeshStandardMaterial({ color: 0xa8aaa6, roughness: 0.82, metalness: 0.02 });
  const cableMaterial = new THREE.MeshStandardMaterial({ color: 0x4b5154, roughness: 0.56, metalness: 0.34 });
  const suspenderMaterial = new THREE.MeshStandardMaterial({ color: 0xabb0ad, roughness: 0.58, metalness: 0.24 });
  const mainCableMaterial = luminous(0xffc66d, 0.55, 0x4b5154);
  const suspenderLightMaterial = luminous(0xffd88f, 0.32, 0xabb0ad);
  const warmLight = luminous(0xffc66d, 2.4, 0x4b5154);
  const cyanLight = luminous(0x20c9ff, 2.2, 0xa8aaa6);
  const magentaLight = luminous(0xff4fbd, 2.2, 0xa8aaa6);

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

  const warmLights = [], deckLights = [], suspenders = [], lampPosts = [], lampArms = [], lampBases = [];
  const floodlights = [];
  for (const [towerIndex, tower] of TSING_MA_TOWERS.entries()) {
    const { frame, topY } = tower;
    const upperLegMaterial = towerIndex === 0 ? cyanLight : magentaLight;
    const legPoints = new Map();
    for (const side of [-1, 1]) {
      const edge = tsingMaDeckEdgePoint(tower.fraction, side);
      // A three-metre leg sits just outside its cable; the cable and saddle meet the leg's inner face.
      const x = edge.x + edge.outwardX * 1.5, z = edge.z + edge.outwardZ * 1.5;
      const bottom = isTerritoryLand(x, z) ? LAND_BOTTOM : WATER_BOTTOM;
      legPoints.set(side, { x, z });
      box(x, bottom + (topY - bottom) * 0.5, z, 3, topY - bottom, 4.2, frame.heading, concrete, 'TsingMaTowerLeg');
      const lowerTop = frame.y + 12, lowerBottom = bottom + 1;
      for (const face of [-1, 1]) {
        const stripX = x + frame.normalX * face * 1.54, stripZ = z + frame.normalZ * face * 1.54;
        box(stripX, (lowerBottom + lowerTop) * 0.5, stripZ, 0.18, lowerTop - lowerBottom, 0.3,
          frame.heading, cyanLight, 'TsingMaTowerLowerLight');
        box(stripX, (lowerTop + topY - 1) * 0.5, stripZ, 0.18, topY - 1 - lowerTop, 0.3,
          frame.heading, upperLegMaterial, 'TsingMaTowerUpperLight');
      }
      const cablePoint = tsingMaCablePoint(tower.fraction, side);
      box(cablePoint.x, topY - 0.05, cablePoint.z, 1.1, 0.5, 1.6,
        frame.heading, cableMaterial, 'TsingMaCableSaddle');
      warmLights.push({ x, y: topY + 0.8, z, sx: 1.15, sy: 1.15, sz: 1.15 });
    }
    for (const level of [frame.y + 8, frame.y + 37, frame.y + 65, topY - 2]) {
      const left = legPoints.get(-1), right = legPoints.get(1);
      const a = new THREE.Vector3(left.x, level, left.z), b = new THREE.Vector3(right.x, level, right.z);
      beam(a, b, 2.1, concrete, 'TsingMaTowerCrossbeam');
      beam(a.clone().add(new THREE.Vector3(0, 1.13, 0)), b.clone().add(new THREE.Vector3(0, 1.13, 0)),
        0.24, magentaLight, 'TsingMaTowerCrossbeamLight');
    }
    const glow = new THREE.PointLight(towerIndex === 0 ? 0x20c9ff : 0xff4fbd, 0, 190, 1.6);
    glow.name = 'TsingMaNightFloodlight';
    glow.userData.nightIntensity = 45;
    glow.position.set(frame.x, topY - 20, frame.z);
    floodlights.push(glow);
    group.add(glow);
  }

  const CABLE_SAMPLES = 360;
  for (const side of [-1, 1]) {
    const points = [];
    for (let i = 0; i <= CABLE_SAMPLES; i++) {
      const fraction = i / CABLE_SAMPLES, point = tsingMaCablePoint(fraction, side);
      points.push(new THREE.Vector3(point.x, point.y, point.z));
      if (i % 3 === 0) warmLights.push({ x: point.x, y: point.y, z: point.z, sx: 0.85, sy: 0.85, sz: 0.85 });
      const edge = tsingMaDeckEdgePoint(fraction, side);
      if (i % 5 === 0 && fraction >= TSING_MA_TOWERS[0].fraction && fraction <= TSING_MA_TOWERS[1].fraction) {
        const bottom = edge.y - 0.35, height = point.y - bottom;
        if (height > 1) suspenders.push({ x: point.x, y: bottom + height * 0.5, z: point.z, sy: height });
      }
      if (i === 0 || i === CABLE_SAMPLES) {
        const bottom = edge.y - 0.75, top = point.y + 0.25;
        box(point.x, (bottom + top) * 0.5, point.z, 1.6, top - bottom, 2.4,
          edge.heading, concrete, 'TsingMaCableAnchorage');
      }
    }
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 480, 0.28, 5, false), mainCableMaterial);
    cable.name = 'TsingMaMainCable';
    cable.castShadow = true;
    group.add(cable);
  }

  const DECK_LAMP_SAMPLES = 120;
  for (let i = 0; i <= DECK_LAMP_SAMPLES; i++) {
    const fraction = i / DECK_LAMP_SAMPLES;
    for (const side of [-1, 1]) {
      const base = tsingMaLampBasePoint(fraction, side), { x, z } = base;
      lampBases.push({ x, y: base.y + 0.09, z });
      lampPosts.push({ x, y: base.y + 2.5, z, sy: 5 });
      lampArms.push({
        x: x - base.outwardX * 0.7, y: base.y + 4.92, z: z - base.outwardZ * 0.7, heading: base.heading
      });
      deckLights.push({
        x: x - base.outwardX * 1.35, y: base.y + 4.78, z: z - base.outwardZ * 1.35, heading: base.heading
      });
    }
  }

  addInstances(group, new THREE.CylinderGeometry(0.09, 0.09, 1, 4), suspenderLightMaterial, suspenders, 'TsingMaSuspenders');
  addInstances(group, new THREE.CylinderGeometry(0.12, 0.16, 1, 6), suspenderMaterial, lampPosts, 'TsingMaLampPosts');
  addInstances(group, new THREE.CylinderGeometry(0.26, 0.26, 0.18, 8), cableMaterial, lampBases, 'TsingMaLampBases');
  addInstances(group, new THREE.BoxGeometry(1.4, 0.12, 0.12), suspenderMaterial, lampArms, 'TsingMaLampArms');
  addInstances(group, new THREE.SphereGeometry(0.7, 7, 5), warmLight, warmLights, 'TsingMaWarmLights');
  addInstances(group, new THREE.BoxGeometry(0.85, 0.18, 0.45), warmLight, deckLights, 'TsingMaDeckLights');
  root.add(group);
  const stats = {
    tsingMaTowers: TSING_MA_TOWERS.length,
    tsingMaMainCables: 2,
    tsingMaSuspenders: suspenders.length,
    tsingMaLampPosts: lampPosts.length,
    tsingMaCableSaddles: TSING_MA_TOWERS.length * 2,
    tsingMaCableAnchorages: 4,
    tsingMaLights: warmLights.length + deckLights.length
  };
  group.userData.stats = stats;
  function update() {
    const night = nightAmount();
    for (const light of floodlights) light.intensity = light.userData.nightIntensity * night;
  }
  update();
  return { group, stats, update };
}
