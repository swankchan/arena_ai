import * as THREE from 'three/webgpu';
import { color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import { buildCableStayedPlan } from './cable-stayed-architecture.js';

const UP = new THREE.Vector3(0, 1, 0);

function luminous(lightColor, intensity, dayColor) {
  const material = new THREE.MeshStandardNodeMaterial({ color: dayColor, roughness: 0.58, metalness: 0.08 });
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

function addBeamInstances(group, beams, material, thickness, name, square = false) {
  if (!beams.length) return null;
  const geometry = square
    ? new THREE.BoxGeometry(thickness, 1, thickness)
    : new THREE.CylinderGeometry(thickness, thickness, 1, 5);
  const mesh = new THREE.InstancedMesh(geometry, material, beams.length);
  const dummy = new THREE.Object3D(), direction = new THREE.Vector3();
  for (let i = 0; i < beams.length; i++) {
    const { a, b } = beams[i];
    direction.set(b.x - a.x, b.y - a.y, b.z - a.z);
    const length = direction.length();
    if (length < 0.001) continue;
    dummy.position.set((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, (a.z + b.z) * 0.5);
    dummy.quaternion.setFromUnitVectors(UP, direction.multiplyScalar(1 / length));
    dummy.scale.set(1, length, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = name;
  mesh.frustumCulled = false;
  group.add(mesh);
  return mesh;
}

function addBox(group, position, size, heading, material, name) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.position.set(position.x, position.y, position.z);
  mesh.rotation.y = heading || 0;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  group.add(mesh);
  return mesh;
}

function addBeam(group, a, b, thickness, material, name) {
  const direction = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z), length = direction.length();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, length, thickness), material);
  mesh.position.set((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, (a.z + b.z) * 0.5);
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
  mesh.castShadow = true;
  mesh.name = name;
  group.add(mesh);
  return mesh;
}

function addLowerDeck(group, frames, material) {
  const positions = [];
  for (let i = 1; i < frames.length; i++) {
    const previous = frames[i - 1], current = frames[i];
    const a = [previous.left.x, previous.lowerY, previous.left.z];
    const b = [previous.right.x, previous.lowerY, previous.right.z];
    const c = [current.left.x, current.lowerY, current.left.z];
    const d = [current.right.x, current.lowerY, current.right.z];
    positions.push(...a, ...d, ...c, ...a, ...b, ...d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'KapShuiMunLowerDeck';
  mesh.receiveShadow = true;
  group.add(mesh);
}

function buildLampInstances(group, lamps, materials) {
  const bases = [], posts = [], arms = [], lights = [];
  for (const lamp of lamps) {
    bases.push({ x: lamp.base.x, y: lamp.base.y + 0.09, z: lamp.base.z });
    posts.push({ x: lamp.base.x, y: lamp.base.y + 2.5, z: lamp.base.z, sy: 5 });
    arms.push(lamp.arm);
    lights.push(lamp.light);
  }
  addInstances(group, new THREE.CylinderGeometry(0.26, 0.26, 0.18, 8), materials.darkSteel, bases, 'CableStayedLampBases');
  addInstances(group, new THREE.CylinderGeometry(0.12, 0.16, 1, 6), materials.steel, posts, 'CableStayedLampPosts');
  addInstances(group, new THREE.BoxGeometry(1.4, 0.12, 0.12), materials.steel, arms, 'CableStayedLampArms');
  addInstances(group, new THREE.BoxGeometry(0.85, 0.18, 0.45), materials.warmLight, lights, 'CableStayedDeckLights');
}

export function buildCableStayedArchitecture(root) {
  const group = new THREE.Group();
  group.name = 'HongKongCableStayedArchitecture';
  group.userData.cableStayedArchitecture = true;
  const materials = {
    concrete: new THREE.MeshStandardMaterial({ color: 0xa8aaa6, roughness: 0.84, metalness: 0.02 }),
    cable: new THREE.MeshStandardMaterial({ color: 0xc2c7c5, roughness: 0.5, metalness: 0.32 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8d9698, roughness: 0.62, metalness: 0.3 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x4f585c, roughness: 0.6, metalness: 0.34 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xd6aa32, roughness: 0.66, metalness: 0.22 }),
    lowerDeck: new THREE.MeshStandardMaterial({ color: 0x50575a, roughness: 0.9, side: THREE.DoubleSide }),
    warmLight: luminous(0xffd38a, 2.8, 0x5b605d),
    redLight: luminous(0xff3428, 2.4, 0x6b3935)
  };
  const plan = buildCableStayedPlan(), floodlights = [];

  for (const bridge of plan.bridges) {
    const bridgeGroup = new THREE.Group();
    bridgeGroup.name = `HongKongCableStayed:${bridge.id}`;
    bridgeGroup.userData.cableStayedBridge = bridge.id;
    const isTingKau = bridge.id === 'ting-kau';
    // Daylight keeps the photographed concrete/steel finishes; only the night term adds the bridges' actual warm/red lighting.
    const towerMaterial = luminous(isTingKau ? 0xff7657 : 0xffd4a0, 0.42, 0xa8aaa6);
    const cableMaterial = luminous(isTingKau ? 0xff6b50 : 0xffd7a0, 0.68, 0xc2c7c5);
    const edgeMaterial = luminous(isTingKau ? 0xff5540 : 0xffc987, 0.45, isTingKau ? 0xd6aa32 : 0x4f585c);
    const headMaterial = isTingKau ? luminous(0xff6548, 0.72, 0xd6aa32) : materials.steel;

    for (const tower of bridge.towers) {
      if (isTingKau) {
        const height = tower.topY - tower.bottom;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 2.25, height, 4), towerMaterial);
        leg.position.set(tower.frame.x, tower.bottom + height * 0.5, tower.frame.z);
        leg.rotation.y = tower.frame.heading + Math.PI * 0.25;
        leg.castShadow = true;
        leg.name = 'TingKauSingleColumnTower';
        bridgeGroup.add(leg);
        addBox(bridgeGroup, { x: tower.frame.x, y: tower.bottom + 1, z: tower.frame.z }, [7, 2, 9],
          tower.frame.heading, materials.concrete, 'TingKauTowerFooting');
        addBox(bridgeGroup, { x: tower.frame.x, y: tower.topY - 4, z: tower.frame.z }, [3.4, 8, 4.2],
          tower.frame.heading, headMaterial, 'TingKauYellowTowerHead');
      } else {
        for (const leg of tower.legs) {
          addBeam(bridgeGroup, leg.base, leg.mid, 3, towerMaterial, 'KapShuiMunInclinedTowerLeg');
          addBeam(bridgeGroup, leg.mid, leg.top, 2.6, towerMaterial, 'KapShuiMunVerticalTowerLeg');
          addBox(bridgeGroup, { x: leg.base.x, y: leg.base.y + 1, z: leg.base.z }, [6, 2, 7],
            tower.frame.heading, materials.concrete, 'KapShuiMunTowerFooting');
          addBox(bridgeGroup, { x: leg.top.x, y: leg.top.y - 2.5, z: leg.top.z }, [3.1, 5, 3.6],
            tower.frame.heading, headMaterial, 'KapShuiMunCableAnchorHead');
        }
        addBeamInstances(bridgeGroup, tower.crossbeams, towerMaterial, 2, 'KapShuiMunTowerCrossbeams', true);
      }
      const aviationLights = isTingKau
        ? [{ x: tower.frame.x, y: tower.topY + 0.8, z: tower.frame.z }]
        : tower.legs.map((leg) => ({ x: leg.top.x, y: leg.top.y + 0.8, z: leg.top.z }));
      addInstances(bridgeGroup, new THREE.SphereGeometry(0.65, 7, 5), materials.redLight,
        aviationLights, 'CableStayedAviationLights');
      const glow = new THREE.PointLight(0xffd6a0, 0, 145, 1.55);
      glow.position.set(tower.frame.x, tower.topY - 16, tower.frame.z);
      glow.userData.nightIntensity = isTingKau ? 70 : 60;
      glow.name = 'CableStayedNightFloodlight';
      floodlights.push(glow);
      bridgeGroup.add(glow);
    }

    addBeamInstances(bridgeGroup, bridge.stays, cableMaterial, isTingKau ? 0.07 : 0.075,
      isTingKau ? 'TingKauFanStayCables' : 'KapShuiMunSemiFanStayCables');
    addInstances(bridgeGroup, new THREE.BoxGeometry(0.34, 0.24, 0.46),
      isTingKau ? materials.yellow : materials.darkSteel,
      bridge.stays.map((stay) => stay.b), 'CableStayedDeckAnchorages');
    addBeamInstances(bridgeGroup, bridge.edgeGirders, edgeMaterial, 0.34,
      isTingKau ? 'TingKauYellowEdgeGirders' : 'KapShuiMunEdgeGirders', true);

    if (isTingKau) {
      addBeamInstances(bridgeGroup, bridge.longitudinalStabilizers, materials.darkSteel, 0.15, 'TingKauLongitudinalStabilizers');
      addBeamInstances(bridgeGroup, bridge.transverseStabilizers, materials.darkSteel, 0.09, 'TingKauTransverseStabilizers');
      addBeamInstances(bridgeGroup, bridge.crossGirders, materials.yellow, 0.42, 'TingKauDeckCrossGirders', true);
    } else {
      addLowerDeck(bridgeGroup, bridge.lowerDeckFrames, materials.lowerDeck);
      const posts = [], crossFrames = [], lowerEdges = [];
      for (let i = 0; i < bridge.lowerDeckFrames.length; i++) {
        const frame = bridge.lowerDeckFrames[i];
        for (const edge of [frame.left, frame.right]) {
          posts.push({ a: { x: edge.x, y: frame.lowerY, z: edge.z }, b: { x: edge.x, y: frame.upperY, z: edge.z } });
        }
        crossFrames.push(
          { a: { x: frame.left.x, y: frame.lowerY, z: frame.left.z }, b: { x: frame.right.x, y: frame.lowerY, z: frame.right.z } },
          { a: { x: frame.left.x, y: frame.upperY, z: frame.left.z }, b: { x: frame.right.x, y: frame.upperY, z: frame.right.z } }
        );
        if (i > 0) {
          const previous = bridge.lowerDeckFrames[i - 1];
          for (const side of ['left', 'right']) {
            lowerEdges.push({
              a: { x: previous[side].x, y: previous.lowerY, z: previous[side].z },
              b: { x: frame[side].x, y: frame.lowerY, z: frame[side].z }
            });
          }
        }
      }
      addBeamInstances(bridgeGroup, posts, materials.steel, 0.52, 'KapShuiMunVierendeelVerticals', true);
      addBeamInstances(bridgeGroup, crossFrames, materials.steel, 0.44, 'KapShuiMunVierendeelCrossFrames', true);
      addBeamInstances(bridgeGroup, lowerEdges, materials.darkSteel, 0.5, 'KapShuiMunLowerEdgeGirders', true);
    }
    buildLampInstances(bridgeGroup, bridge.lamps, materials);
    group.add(bridgeGroup);
  }

  root.add(group);
  const stats = { ...plan.stats, cableStayedFloodlights: floodlights.length };
  group.userData.stats = stats;
  function update() {
    const night = nightAmount();
    for (const light of floodlights) light.intensity = light.userData.nightIntensity * night;
  }
  update();
  return { group, stats, update };
}
