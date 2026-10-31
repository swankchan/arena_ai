import * as THREE from 'three/webgpu';
import { GEO } from '../../hk-geodata.js';
import { PersonCrowd, PersonRig } from '../../pedestrians.js';

// Street crowds on the real Hong Kong road network. Walkers follow the sidewalk side of a named street; only the
// rigs within the near radius are animated and drawn, so the crowd can cover both shores without a per-frame cost
// proportional to the whole city.

const SIDEWALK_TOP = 0.14;
const DRAW_RADIUS = 155;
const MAX_DRAWN = 190;

const hash = (n) => {
  const v = Math.sin(n * 12.9898 + 3.71) * 43758.5453;
  return v - Math.floor(v);
};

function buildRoutes() {
  const routes = [];
  for (const [name, width, , , , flat] of GEO.roads) {
    if (!name || width < 8 || !flat || flat.length < 6) continue;
    const points = [];
    for (let i = 0; i + 1 < flat.length; i += 2) points.push([flat[i], flat[i + 1]]);
    const distances = [0];
    for (let i = 1; i < points.length; i++) {
      distances.push(distances[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    }
    const length = distances[distances.length - 1];
    if (length < 8) continue;
    routes.push({ name, width, points, distances, length });
  }
  return routes;
}

function sample(route, s) {
  const { points, distances } = route;
  s = Math.max(0, Math.min(distances[distances.length - 1], s));
  let i = 1;
  while (i < distances.length - 1 && distances[i] < s) i++;
  const t = (s - distances[i - 1]) / Math.max(1e-6, distances[i] - distances[i - 1]);
  const ax = points[i - 1][0], az = points[i - 1][1];
  const bx = points[i][0], bz = points[i][1];
  const dx = bx - ax, dz = bz - az;
  const length = Math.max(1e-6, Math.hypot(dx, dz));
  return {
    x: ax + dx * t, z: az + dz * t,
    nx: dz / length, nz: -dx / length,
    heading: Math.atan2(dx, dz)
  };
}

export function createHongKongCrowd(scene, { getGroundHeight = null } = {}) {
  const group = new THREE.Group();
  group.name = 'HongKongCrowd';
  scene.add(group);

  const routes = buildRoutes();
  const crowd = new PersonCrowd(MAX_DRAWN, { farDistance: 40, castShadow: true });
  group.add(...crowd.meshes);
  const ground = (owner, x, z) => getGroundHeight ? getGroundHeight(x, z, 'person', owner?.pelvisY ?? 0) : SIDEWALK_TOP;
  const walkers = [];

  const seeds = [
    [20, -29], [343, 283], [1243, 155], [2446, 193], [1316, -1517], [1187, -2580], [1013, -4143]
  ];
  // A spatial index of routes by the midpoint of each polyline, so walkers seed around the districts, not uniformly
  // across the mountains and the harbour.
  const routeMid = routes.map((route) => route.points[Math.floor(route.points.length / 2)]);
  const routesNear = (x, z, radius = 700) => {
    const list = [];
    for (let i = 0; i < routes.length; i++) {
      const mid = routeMid[i];
      if (mid && Math.hypot(mid[0] - x, mid[1] - z) < radius) list.push(i);
    }
    return list.length ? list : [0];
  };

  for (let i = 0; i < 260; i++) {
    const [sx, sz] = seeds[i % seeds.length];
    const near = routesNear(sx + (hash(i * 3.1) - 0.5) * 500, sz + (hash(i * 5.7 + 2) - 0.5) * 500);
    const routeIndex = near[Math.floor(hash(i * 7.3 + 4) * near.length)] ?? 0;
    const route = routes[routeIndex];
    if (!route) continue;
    const side = hash(i * 11.1 + 5) < 0.5 ? 1 : -1;
    const walker = {
      route,
      side,
      offset: route.width * 0.5 + 1.35 + hash(i * 13.7 + 6) * 1.1,
      s: route.length * hash(i * 17.1 + 7),
      dir: hash(i * 19.3 + 8) < 0.5 ? 1 : -1,
      speed: 1.05 + hash(i * 23.9 + 9) * 0.7,
      pause: 0,
      rig: new PersonRig({
        seed: hash(i * 31.1 + 3.4),
        scale: 0.86 + hash(i * 37.7 + 4.2) * 0.23,
        female: hash(i * 41.3 + 5.8) < 0.5,
        girth: 0.92 + hash(i * 43.9 + 6.6) * 0.2,
        hair: hash(i * 47.1 + 8.2),
        armSwing: 0.8 + hash(i * 53.3 + 9.4) * 0.4,
        stride: 0.85 + hash(i * 59.7 + 1.6) * 0.35
      })
    };
    walkers.push(walker);
  }

  function update(dt, elapsed, cameraPosition) {
    crowd.begin();
    let drawn = 0;
    for (const walker of walkers) {
      if (walker.pause > 0) {
        walker.pause -= dt;
      } else {
        walker.s += walker.speed * walker.dir * dt;
        if (walker.s > walker.route.length) { walker.s = walker.route.length; walker.dir = -1; }
        if (walker.s < 0) { walker.s = 0; walker.dir = 1; }
      }
      const p = sample(walker.route, walker.s);
      const x = p.x + p.nx * walker.offset * walker.side;
      const z = p.z + p.nz * walker.offset * walker.side;
      const distance = Math.hypot(x - cameraPosition.x, z - cameraPosition.z);
      if (distance > DRAW_RADIUS || drawn >= MAX_DRAWN) continue;
      const heading = p.heading + (walker.dir < 0 ? Math.PI : 0);
      walker.rig.update(dt, x, z, heading, ground, walker.rig, 0, true, -1);
      crowd.add(walker.rig, distance);
      drawn++;
    }
    crowd.end();
  }

  return { group, walkers, update };
}
