import * as THREE from 'three/webgpu';
import { buildStarFerryTerminals } from './star-ferry-terminals.js';
import { createStarFerryVessel, STAR_FERRY_DIMENSIONS } from './star-ferry-vessel.js';
import {
  STAR_FERRY_ROUTES, createStarFerryMotion, advanceStarFerryMotion, sampleStarFerryRoute
} from './star-ferry-routes.js';
import { sampleHongKongHarbourSwell } from './harbour-swell.js';
import { createJunkVessel, sampleJunkRoute, JUNK_ROUTE } from './junk-vessel.js';

// Victoria Harbour life: three source-footprint Star Ferry terminals, both current franchised routes and a red-sailed
// junk. The ordinary green/white double-ended ferries use the official Morning Star length/beam as their scale datum.
const MEAN_WATER_LEVEL = -2.26; // buildFullHongKongWorld presents its mean surface at WATER_LEVEL - 0.06.

function createWake() {
  const length = STAR_FERRY_DIMENSIONS.length;
  const positions = [];
  for (const side of [-1, 1]) {
    positions.push(
      side * 2.6, 0, -length * 0.42,
      side * 3.4, 0, -length * 0.55,
      side * 8.8, 0, -length * 0.5 - 25,
      side * 2.6, 0, -length * 0.42,
      side * 8.8, 0, -length * 0.5 - 25,
      side * 5.6, 0, -length * 0.5 - 22
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const wake = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    color: 0xc1ddd5, transparent: true, opacity: 0.10, depthWrite: false, side: THREE.DoubleSide
  }));
  wake.name = 'HongKongStarFerryWake';
  wake.renderOrder = 2;
  return wake;
}

export function createHongKongHarbour(scene) {
  const group = new THREE.Group();
  group.name = 'HongKongHarbour';
  scene.add(group);

  const terminalModel = buildStarFerryTerminals(group);
  const ferries = STAR_FERRY_ROUTES.map((route, index) => {
    const mesh = createStarFerryVessel(route.vesselName);
    const wake = createWake();
    group.add(mesh, wake);
    const motion = createStarFerryMotion(route, route.length * (index === 0 ? 0.16 : 0.62), index === 0 ? 1 : -1);
    return { mesh, wake, route, motion, t: motion.s / route.length, dir: motion.dir, speed: 0 };
  });

  const junk = createJunkVessel();
  group.add(junk);

  function update(dt, elapsed) {
    for (const ferry of ferries) {
      const { route, motion, mesh, wake } = ferry;
      advanceStarFerryMotion(motion, route, dt);
      const point = sampleStarFerryRoute(route, motion.s);
      const swell = sampleHongKongHarbourSwell(point.x, point.z, elapsed);
      const forwardX = Math.sin(point.heading), forwardZ = Math.cos(point.heading);
      const slopeForward = swell.slopeX * forwardX + swell.slopeZ * forwardZ;
      const slopeSide = swell.slopeX * forwardZ - swell.slopeZ * forwardX;
      mesh.position.set(point.x, MEAN_WATER_LEVEL + swell.height, point.z);
      mesh.rotation.set(-Math.atan(slopeForward) * 0.55, point.heading,
        Math.atan(slopeSide) * 0.45 + Math.sin(elapsed * 0.63 + motion.s * 0.01) * 0.005, 'YXZ');

      const speedRatio = Math.min(1, motion.speed / route.maxSpeed);
      wake.visible = speedRatio > 0.055;
      wake.position.set(point.x, MEAN_WATER_LEVEL + swell.height + 0.035, point.z);
      // Only the wake changes ends. The symmetric vessel keeps its body heading when the service reverses.
      wake.rotation.y = route.heading + (motion.dir < 0 ? Math.PI : 0);
      wake.scale.set(0.65 + speedRatio * 0.55, 1, 0.45 + speedRatio * 0.65);
      wake.material.opacity = 0.025 + speedRatio * 0.075;
      ferry.t = motion.s / route.length;
      ferry.dir = motion.dir;
      ferry.speed = motion.speed;
    }

    // Keep the junk in open western-harbour water, clear of both franchised ferry paths and all three new berths.
    const point = sampleJunkRoute(elapsed * JUNK_ROUTE.angularSpeed);
    const swell = sampleHongKongHarbourSwell(point.x, point.z, elapsed);
    const forwardX = Math.sin(point.heading), forwardZ = Math.cos(point.heading);
    const slopeForward = swell.slopeX * forwardX + swell.slopeZ * forwardZ;
    const slopeSide = swell.slopeX * forwardZ - swell.slopeZ * forwardX;
    junk.position.set(point.x, MEAN_WATER_LEVEL + swell.height, point.z);
    junk.rotation.set(-Math.atan(slopeForward) * 0.55, point.heading,
      Math.atan(slopeSide) * 0.45 + Math.sin(elapsed * 0.5) * 0.006, 'YXZ');
  }

  update(0, 0);
  return {
    group, ferries, junk, update,
    routes: STAR_FERRY_ROUTES,
    terminals: terminalModel.terminals
  };
}
