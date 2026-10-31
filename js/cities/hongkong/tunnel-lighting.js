import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';

const LIGHT_SPACING = 18;
const LIGHT_POOL_SIZE = 16;
const LIGHT_RANGE = 260;

function addInstances(group, geometry, material, transforms, name) {
  if (!transforms.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < transforms.length; i++) {
    const t = transforms[i];
    dummy.position.set(t.x, t.y, t.z);
    dummy.rotation.set(0, t.heading, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = name;
  mesh.frustumCulled = false;
  group.add(mesh);
  return mesh;
}

// Racing-game-style visual rhythm without hundreds of live lights: emissive fixtures mark the whole alignment while
// a small pool of real lights follows the camera through the nearest part of the tube.
export function buildHongKongTunnelLighting(root, routes) {
  const group = new THREE.Group();
  group.name = 'HongKongTunnelLighting';
  group.userData.tunnelLighting = true;
  const ceilingMaterial = new THREE.MeshStandardNodeMaterial({ color: 0xc4c8c2, roughness: 0.42, metalness: 0.08 });
  ceilingMaterial.emissiveNode = color(0xffe7bd).mul(3.2);
  const reflectorMaterial = new THREE.MeshStandardNodeMaterial({ color: 0x7a4b16, roughness: 0.5 });
  reflectorMaterial.emissiveNode = color(0xffb14a).mul(0.9);
  const fixtures = [], reflectors = [], sites = [];

  for (const route of routes) {
    if (route.kind !== 'tunnel') continue;
    let nextLight = 0;
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1], b = route.points[i];
      if (Math.min(a.y, b.y) >= -1) continue;
      const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      if (length < 0.01) continue;
      const heading = Math.atan2(dx, dz), nx = dz / length, nz = -dx / length;
      const width = Math.max(a.width, b.width);
      nextLight = Math.max(nextLight, a.s);
      while (nextLight <= b.s + 1e-6) {
        const t = Math.max(0, Math.min(1, (nextLight - a.s) / Math.max(1e-9, b.s - a.s)));
        const x = a.x + dx * t, z = a.z + dz * t, y = a.y + (b.y - a.y) * t;
        sites.push({ x, y: y + 4.55, z, routeId: route.id });
        for (const side of [-1, 1]) {
          const fixtureOffset = side * width * 0.27;
          fixtures.push({ x: x + nx * fixtureOffset, y: y + 5.34, z: z + nz * fixtureOffset, heading });
          const reflectorOffset = side * (width * 0.5 + 0.3);
          reflectors.push({ x: x + nx * reflectorOffset, y: y + 1.1, z: z + nz * reflectorOffset, heading });
        }
        nextLight += LIGHT_SPACING;
      }
    }
  }

  addInstances(group, new THREE.BoxGeometry(0.2, 0.09, 3), ceilingMaterial, fixtures, 'HongKongTunnelCeilingLights');
  addInstances(group, new THREE.BoxGeometry(0.14, 0.22, 0.55), reflectorMaterial, reflectors, 'HongKongTunnelReflectors');
  const pool = [];
  for (let i = 0; i < LIGHT_POOL_SIZE; i++) {
    const light = new THREE.PointLight(0xffe2b0, 0, 36, 1.45);
    light.name = 'HongKongTunnelPooledLight';
    pool.push(light);
    group.add(light);
  }
  root.add(group);

  function update(cameraSystem) {
    const position = cameraSystem?.camera?.position;
    if (!position) return;
    const nearest = [], maxDistanceSq = LIGHT_RANGE * LIGHT_RANGE;
    for (const site of sites) {
      const dx = site.x - position.x, dy = site.y - position.y, dz = site.z - position.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > maxDistanceSq || (nearest.length === pool.length && d2 >= nearest[nearest.length - 1].d2)) continue;
      let index = nearest.length;
      while (index > 0 && nearest[index - 1].d2 > d2) index--;
      nearest.splice(index, 0, { site, d2 });
      if (nearest.length > pool.length) nearest.pop();
    }
    for (let i = 0; i < pool.length; i++) {
      const selected = nearest[i]?.site;
      pool[i].intensity = selected ? 36 : 0;
      if (selected) pool[i].position.set(selected.x, selected.y, selected.z);
    }
  }

  const stats = {
    crossingTunnelLightSites: sites.length,
    crossingTunnelCeilingLights: fixtures.length,
    crossingTunnelReflectors: reflectors.length,
    crossingTunnelLightPool: pool.length
  };
  group.userData.stats = stats;
  return { group, update, stats };
}
