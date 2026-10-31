import * as THREE from 'three/webgpu';
import { color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import { buildCrossBayPlan, CROSS_BAY_ARCH } from './cross-bay-architecture.js';

const UP = new THREE.Vector3(0, 1, 0);

function luminous(lightColor, intensity, dayColor, metalness = 0.25) {
  const material = new THREE.MeshStandardNodeMaterial({ color: dayColor, roughness: 0.58, metalness });
  const night = smoothstep(0.7, 1.45, cityUniforms.uInteriorGlow);
  material.emissiveNode = color(lightColor).mul(night.mul(intensity));
  return material;
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

function addBeamInstances(group, beams, material, thickness, name, square = false) {
  if (!beams.length) return null;
  const geometry = square ? new THREE.BoxGeometry(thickness, 1, thickness) : new THREE.CylinderGeometry(thickness, thickness, 1, 6);
  const mesh = new THREE.InstancedMesh(geometry, material, beams.length);
  const dummy = new THREE.Object3D(), direction = new THREE.Vector3();
  for (let i = 0; i < beams.length; i++) {
    const { a, b } = beams[i];
    direction.set(b.x - a.x, b.y - a.y, b.z - a.z);
    const length = direction.length();
    dummy.position.set((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, (a.z + b.z) * 0.5);
    dummy.quaternion.setFromUnitVectors(UP, direction.multiplyScalar(1 / Math.max(length, 1e-9)));
    dummy.scale.set(1, length, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = name;
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

function addBottomDeck(group, panels, material) {
  const positions = [];
  for (let i = 1; i < panels.length; i++) {
    const previous = panels[i - 1], current = panels[i];
    const a = [previous.left.x, previous.left.lowerY, previous.left.z];
    const b = [previous.right.x, previous.right.lowerY, previous.right.z];
    const c = [current.left.x, current.left.lowerY, current.left.z];
    const d = [current.right.x, current.right.lowerY, current.right.z];
    positions.push(...a, ...c, ...d, ...a, ...d, ...b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'CrossBayMainSpanBoxGirderBottom';
  mesh.receiveShadow = true;
  group.add(mesh);
}

function buildLamps(group, lamps, materials) {
  const bases = [], posts = [], arms = [], lights = [];
  for (const lamp of lamps) {
    bases.push({ x: lamp.base.x, y: lamp.base.y + 0.09, z: lamp.base.z });
    posts.push({ x: lamp.base.x, y: lamp.base.y + 2.5, z: lamp.base.z, sy: 5 });
    arms.push(lamp.arm);
    lights.push(lamp.light);
  }
  addInstances(group, new THREE.CylinderGeometry(0.26, 0.26, 0.18, 8), materials.darkSteel, bases, 'CrossBayLampBases');
  addInstances(group, new THREE.CylinderGeometry(0.12, 0.16, 1, 6), materials.steel, posts, 'CrossBayLampPosts');
  addInstances(group, new THREE.BoxGeometry(1.4, 0.12, 0.12), materials.steel, arms, 'CrossBayLampArms');
  addInstances(group, new THREE.BoxGeometry(0.85, 0.18, 0.45), materials.warmLight, lights, 'CrossBayDeckLights');
}

export function buildCrossBayArchitecture(root) {
  const group = new THREE.Group();
  group.name = 'HongKongCrossBayArchitecture';
  group.userData.crossBayArchitecture = true;
  const materials = {
    concrete: new THREE.MeshStandardMaterial({ color: 0x999d99, roughness: 0.86, metalness: 0.02 }),
    arch: luminous(0xd8ecff, 0.4, 0x647178, 0.42),
    hanger: luminous(0xe5f2ff, 0.22, 0xb4c0c4, 0.34),
    girder: new THREE.MeshStandardMaterial({ color: 0x535e63, roughness: 0.68, metalness: 0.32 }),
    bottom: new THREE.MeshStandardMaterial({ color: 0x465156, roughness: 0.8, metalness: 0.2, side: THREE.DoubleSide }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8d9698, roughness: 0.62, metalness: 0.3 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x4f585c, roughness: 0.6, metalness: 0.34 }),
    warmLight: luminous(0xffd38a, 2.8, 0x5b605d, 0.08)
  };
  const plan = buildCrossBayPlan();
  for (const arch of plan.arches) addBeamInstances(group, arch.segments, materials.arch, CROSS_BAY_ARCH.ribThickness, `CrossBaySteelArch:${arch.side}`, true);
  addBeamInstances(group, plan.hangers, materials.hanger, 0.055, 'CrossBayVerticalHangers');
  addBeamInstances(group, plan.edgeGirders, materials.girder, CROSS_BAY_ARCH.girderDepth, 'CrossBayMainSpanBoxGirderEdges', true);
  addBeamInstances(group, plan.crossFrames, materials.girder, 0.65, 'CrossBayMainSpanCrossFrames', true);
  addBottomDeck(group, plan.bottomPanels, materials.bottom);
  addBeamInstances(group, plan.piers.flatMap((pier) => pier.legs), materials.concrete, 3.4, 'CrossBayVShapedPiers', true);
  addBeamInstances(group, plan.piers.map((pier) => pier.crossbeam), materials.concrete, 2, 'CrossBayPierCrossbeams', true);
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), materials.concrete, plan.piers.map((pier) => pier.footing), 'CrossBayPierFootings');
  buildLamps(group, plan.lamps, materials);
  root.add(group);
  group.userData.stats = plan.stats;
  return { group, stats: plan.stats };
}
