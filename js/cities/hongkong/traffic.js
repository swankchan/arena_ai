import * as THREE from 'three/webgpu';
import { GEO } from '../../hk-geodata.js';
import { updateFollowCaps, collideTraffic, collidePlayer } from './collision.js';
import {
  BODY_SPECS,
  HK_BUS_SPEC,
  buildCarGeometry,
  createLoftedCarMaterial,
  buildHongKongBusBodyGeometry,
  buildHongKongBusSignGeometry,
  createHongKongBusMaterial,
  buildBusWheelGeo,
  createBusWheelMaterial
} from '../../actor-models.js';
import { DEFAULT_TAXI_STYLE, getTaxiStyle } from '../../taxi-styles.js';

// Hong Kong road traffic. Cars follow the generated drivable graph, keep left, and are restaged around the player when
// they drift beyond the visible halo. Private cars and taxis each have an instanced body mesh with shared wheels;
// the double-decker buses add a lofted body, destination signs and two instanced wheel meshes.

const LANE_CLEARANCE = 0.42;

const hash = (n) => {
  const v = Math.sin(n * 12.9898 + 4.1414) * 43758.5453;
  return v - Math.floor(v);
};

function createHongKongBusDestinationTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#101518';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f2a31a';
  ctx.fillRect(10, 12, 104, 104);
  ctx.fillStyle = '#111518';
  ctx.font = '900 54px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('1A', 62, 65);
  ctx.fillStyle = '#ffb629';
  ctx.textAlign = 'center';
  ctx.font = '800 31px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
  ctx.fillText('尖沙咀', 322, 45);
  ctx.font = '800 25px Inter, Arial, sans-serif';
  ctx.fillText('STAR FERRY', 322, 88);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function wrapAngle(a) {
  return a - Math.round(a / (Math.PI * 2)) * Math.PI * 2;
}

function linkPoints(link) {
  const nodes = GEO.roadGraph.nodes;
  const points = [[nodes[link[0] * 2], nodes[link[0] * 2 + 1]]];
  for (let i = 0; i + 1 < link[6].length; i += 2) points.push([link[6][i], link[6][i + 1]]);
  points.push([nodes[link[1] * 2], nodes[link[1] * 2 + 1]]);
  return points;
}

function cumulative(points) {
  const out = [0];
  for (let i = 1; i < points.length; i++) {
    out.push(out[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  return out;
}

function samplePath(points, distances, s) {
  s = Math.max(0, Math.min(distances[distances.length - 1], s));
  let i = 1;
  while (i < distances.length - 1 && distances[i] < s) i++;
  const t = (s - distances[i - 1]) / Math.max(1e-6, distances[i] - distances[i - 1]);
  const ax = points[i - 1][0], az = points[i - 1][1];
  const bx = points[i][0], bz = points[i][1];
  const dx = bx - ax, dz = bz - az;
  const length = Math.max(1e-6, Math.hypot(dx, dz));
  return {
    x: ax + dx * t,
    z: az + dz * t,
    dx: dx / length,
    dz: dz / length,
    heading: Math.atan2(dx, dz)
  };
}

export function createHongKongTraffic(scene, { getFocus, taxiStyle }) {
  const group = new THREE.Group();
  group.name = 'HongKongTraffic';
  scene.add(group);

  const style = getTaxiStyle(taxiStyle) ?? getTaxiStyle(DEFAULT_TAXI_STYLE);
  const taxiSpec = BODY_SPECS[style?.body] ?? BODY_SPECS.taxi;
  const taxiPaint = new THREE.Color(style?.paint ?? 0xc6202b);

  const nodes = GEO.roadGraph.nodes;
  const graph = GEO.roadGraph.links;
  const paths = graph.map(linkPoints);
  const lengths = paths.map(cumulative);
  const total = paths.map((points, i) => lengths[i][lengths[i].length - 1]);

  // Outgoing links: dir 1 is a->b, dir -1 is b->a, dir 0 is two-way. One-way is 74% of Hong Kong's graph.
  const outgoing = Array.from({ length: nodes.length / 2 }, () => []);
  for (let i = 0; i < graph.length; i++) {
    const link = graph[i];
    if (link[5] !== -1) outgoing[link[0]].push({ link: i, from: link[0], to: link[1], dir: 1 });
    if (link[5] !== 1) outgoing[link[1]].push({ link: i, from: link[1], to: link[0], dir: -1 });
  }

  const drivable = [];
  for (let i = 0; i < graph.length; i++) {
    if (graph[i][3] >= 7.4 && total[i] >= 100) drivable.push(i);
  }

  // Spatial index over link midpoints so a restaged car can appear on a street near the player.
  const CELL = 350;
  const linkCells = new Map();
  const linkMid = new Map();
  for (const i of drivable) {
    const points = paths[i];
    const mid = points[Math.floor(points.length / 2)];
    if (!mid) continue;
    linkMid.set(i, mid);
    const key = Math.floor(mid[0] / CELL) * 100003 + Math.floor(mid[1] / CELL);
    let list = linkCells.get(key);
    if (!list) linkCells.set(key, (list = []));
    list.push(i);
  }
  const linksNear = (x, z) => {
    const ix = Math.floor(x / CELL), iz = Math.floor(z / CELL);
    const list = [];
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const cell = linkCells.get((ix + dx) * 100003 + (iz + dz));
        if (cell) list.push(...cell);
      }
    }
    return list.length ? list : drivable;
  };

  const PRIVATE_PALETTE = [
    new THREE.Color(0xe5e7e3),
    new THREE.Color(0x171a1e),
    new THREE.Color(0x8f969c),
    new THREE.Color(0x26394f),
    new THREE.Color(0xd6b13c)
  ];

  const CAR_COUNT = 190;
  const BUS_COUNT = 22;
  const cars = [];
  const buses = [];
  const focus = getFocus;
  const restageRadius = 620;
  const createVehicle = (index, kind, taxi = false) => {
    const nearLinks = linksNear(focus().x, focus().z);
    const link = drivable[Math.floor(hash(index + (kind === 'bus' ? 501 : 0)) * drivable.length)] ?? 0;
    const startLink = nearLinks[Math.floor(hash(index + (kind === 'bus' ? 733 : 91)) * nearLinks.length)] ?? link;
    const s = total[startLink] * hash(index * 3.7);
    const point = samplePath(paths[startLink], lengths[startLink], s);
    return {
      kind, index, link: startLink,
      point,
      x: point.x, z: point.z, heading: point.heading, speed: 0,
      prevX: point.x, prevZ: point.z, prevHeading: point.heading,
      // Collision shove keeps a struck car visibly displaced from its lane until the offset decays.
      pushX: 0, pushZ: 0,
      halfW: kind === 'bus' ? 1.26 : 0.86,
      halfL: kind === 'bus' ? 5.6 : 2.18,
      mass: kind === 'bus' ? 12000 : 1600,
      s, dir: 1,
      targetSpeed: kind === 'bus' ? 9.5 : 11 + hash(index) * 4.5,
      followCap: Infinity,
      taxi,
      taxiSlot: -1,
      privateSlot: -1,
      paint: taxi ? taxiPaint : PRIVATE_PALETTE[index % PRIVATE_PALETTE.length],
      wheelSpin: 0,
      restage: 0
    };
  };

  for (let i = 0; i < CAR_COUNT; i++) {
    const taxi = i % 7 < 2;
    const car = createVehicle(i, 'car', taxi);
    car.dir = graph[car.link][5] === -1 ? -1 : 1;
    if (graph[car.link][5] === 0 && hash(i + 17) < 0.5) car.dir = -1;
    cars.push(car);
  }
  for (let i = 0; i < BUS_COUNT; i++) {
    const bus = createVehicle(i, 'bus');
    bus.dir = graph[bus.link][5] === -1 ? -1 : 1;
    if (graph[bus.link][5] === 0 && hash(i + 29) < 0.5) bus.dir = -1;
    buses.push(bus);
  }

  // A deterministic handful of cars start in each district so the harbour view and the main streets are alive at once.
  const seeds = [
    [20, -29], [343, 283], [1419, 467], [2446, 193], [1316, -1517], [1187, -2580], [1013, -4143]
  ];
  for (let i = 0; i < cars.length; i++) {
    if (i >= 84) break;
    const [sx, sz] = seeds[i % seeds.length];
    const near = linksNear(sx, sz);
    const link = near[Math.floor(hash(i * 3.1 + 7) * near.length)];
    if (link === undefined) continue;
    cars[i].link = link;
    cars[i].s = total[link] * hash(i * 5.7);
    cars[i].dir = graph[link][5] === -1 ? -1 : (graph[link][5] === 0 && hash(i) < 0.5 ? -1 : 1);
  }

  // Compact, stable instance slots keep class changes out of the render loop: a car's taxi/private role is fixed.
  let privateCount = 0;
  let taxiCount = 0;
  for (const car of cars) {
    if (car.taxi) car.taxiSlot = taxiCount++;
    else car.privateSlot = privateCount++;
  }

  const carGeo = buildCarGeometry(BODY_SPECS.sedan, false);
  carGeo.setAttribute('paintColor', new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, privateCount) * 3), 3));
  carGeo.setAttribute('carState', new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, privateCount) * 4), 4));
  const carMesh = new THREE.InstancedMesh(carGeo, createLoftedCarMaterial(BODY_SPECS.sedan), Math.max(1, privateCount));
  carMesh.count = privateCount;
  carMesh.castShadow = true;
  carMesh.receiveShadow = true;
  carMesh.frustumCulled = false;
  carMesh.name = 'HongKongCars';

  const taxiGeo = buildCarGeometry(taxiSpec, false);
  taxiGeo.setAttribute('paintColor', new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, taxiCount) * 3), 3));
  taxiGeo.setAttribute('carState', new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, taxiCount) * 4), 4));
  const taxiMesh = new THREE.InstancedMesh(taxiGeo, createLoftedCarMaterial(taxiSpec, null, { livery: style.livery }), Math.max(1, taxiCount));
  taxiMesh.count = taxiCount;
  taxiMesh.castShadow = true;
  taxiMesh.receiveShadow = true;
  taxiMesh.frustumCulled = false;
  taxiMesh.name = 'HongKongTaxis';

  const taxiPaintArray = taxiGeo.attributes.paintColor.array;
  for (let i = 0; i < taxiCount; i++) {
    taxiPaintArray[i * 3] = taxiPaint.r;
    taxiPaintArray[i * 3 + 1] = taxiPaint.g;
    taxiPaintArray[i * 3 + 2] = taxiPaint.b;
  }
  taxiGeo.attributes.paintColor.needsUpdate = true;

  // Wheels: a single instanced cylinder, four per car, aligned with the body.
  const wheelMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.24, 8).rotateZ(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x111316, roughness: 0.86, metalness: 0.04 }),
    CAR_COUNT * 4
  );
  wheelMesh.castShadow = true;
  wheelMesh.frustumCulled = false;
  wheelMesh.name = 'HongKongWheels';

  const busBodyGeo = buildHongKongBusBodyGeometry();
  const busPaint = new THREE.InstancedBufferAttribute(new Float32Array(BUS_COUNT * 3), 3);
  busBodyGeo.setAttribute('busPaint', busPaint);
  const busBody = new THREE.InstancedMesh(busBodyGeo, createHongKongBusMaterial(), BUS_COUNT);
  const busSign = new THREE.InstancedMesh(
    buildHongKongBusSignGeometry(),
    new THREE.MeshBasicNodeMaterial({ map: createHongKongBusDestinationTexture() }),
    BUS_COUNT
  );
  const busWheelMat = createBusWheelMaterial();
  const busWheelLeft = new THREE.InstancedMesh(buildBusWheelGeo(-1), busWheelMat, BUS_COUNT * 2);
  const busWheelRight = new THREE.InstancedMesh(buildBusWheelGeo(1), busWheelMat, BUS_COUNT * 2);
  busBody.name = 'HongKongBusBody';
  busSign.name = 'HongKongBusSigns';
  busWheelLeft.name = 'HongKongBusWheelLeft';
  busWheelRight.name = 'HongKongBusWheelRight';
  for (const mesh of [busBody, busSign, busWheelLeft, busWheelRight]) {
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  busBody.castShadow = busBody.receiveShadow = true;
  busWheelLeft.castShadow = busWheelLeft.receiveShadow = true;
  busWheelRight.castShadow = busWheelRight.receiveShadow = true;

  const busColors = [new THREE.Color(0xc22d2d), new THREE.Color(0xe9e5da), new THREE.Color(0xd46a23), new THREE.Color(0xd8b42e)];
  for (let i = 0; i < BUS_COUNT; i++) {
    const color = busColors[i % busColors.length];
    busPaint.array[i * 3] = color.r;
    busPaint.array[i * 3 + 1] = color.g;
    busPaint.array[i * 3 + 2] = color.b;
  }
  busPaint.needsUpdate = true;

  group.add(carMesh, taxiMesh, wheelMesh);

  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const scaleOne = new THREE.Vector3(1, 1, 1);
  const wheelQuat = new THREE.Quaternion();
  const spinQuat = new THREE.Quaternion();
  const xAxis = new THREE.Vector3(1, 0, 0);
  const wheelMatrix = new THREE.Matrix4();
  const pos = new THREE.Vector3();

  function advance(vehicle, dt, isBus) {
    const link = vehicle.link;
    const length = total[link];
    if (!length) return;
    vehicle.prevX = vehicle.x;
    vehicle.prevZ = vehicle.z;
    vehicle.prevHeading = vehicle.heading;
    const cruise = vehicle.targetSpeed * (isBus ? 0.72 : 1);
    const want = Math.min(cruise, vehicle.followCap);
    // Braking behind a leader is firmer than the lazy throttle response.
    const response = want < vehicle.speed ? 4.5 : 1.5;
    vehicle.speed += (want - vehicle.speed) * (1 - Math.exp(-dt * response));
    let step = vehicle.speed * dt;
    vehicle.s += step * vehicle.dir;
    if (vehicle.s > length || vehicle.s < 0) {
      const node = vehicle.dir > 0 ? graph[link][1] : graph[link][0];
      const options = outgoing[node] || [];
      let next = null;
      if (options.length) {
        // Prefer wide roads and avoid a U-turn unless there is no other way out.
        let bestScore = -Infinity;
        for (const option of options) {
          if (option.link === link && options.length > 1) continue;
          const width = graph[option.link][3];
          const score = width + hash(vehicle.index + option.link * 0.13) * 8;
          if (score > bestScore) { bestScore = score; next = option; }
        }
        if (!next) next = options[Math.floor(hash(vehicle.index + vehicle.s) * options.length)];
      }
      if (next) {
        vehicle.link = next.link;
        vehicle.dir = next.dir;
        vehicle.s = next.dir > 0 ? 0.2 : total[next.link] - 0.2;
      } else {
        vehicle.dir *= -1;
        vehicle.s = Math.max(0.2, Math.min(length - 0.2, vehicle.s));
      }
    }

    const p = samplePath(paths[vehicle.link], lengths[vehicle.link], vehicle.s);
    const laneOffset = Math.min(4.2, Math.max(1.7, graph[vehicle.link][3] * 0.23)) * (isBus ? 1.12 : 1);
    // Travelling on the left: for direction vector (dx, dz), left is (dz, -dx).
    const leftX = p.dz * vehicle.dir, leftZ = -p.dx * vehicle.dir;
    const shoveDecay = Math.exp(-dt * 3.5);
    vehicle.pushX *= shoveDecay;
    vehicle.pushZ *= shoveDecay;
    vehicle.x = p.x + leftX * laneOffset + vehicle.pushX;
    vehicle.z = p.z + leftZ * laneOffset + vehicle.pushZ;
    // A restaged car jumps across the city; forgetting the old footprint avoids a bogus swept contact.
    if (Math.hypot(vehicle.x - vehicle.prevX, vehicle.z - vehicle.prevZ) > 50) {
      vehicle.prevX = vehicle.x;
      vehicle.prevZ = vehicle.z;
    }
    const targetHeading = Math.atan2(p.dx * vehicle.dir, p.dz * vehicle.dir);
    vehicle.heading += wrapAngle(targetHeading - vehicle.heading) * (1 - Math.exp(-dt * 7));
    vehicle.wheelSpin = (vehicle.wheelSpin + step / (isBus ? HK_BUS_SPEC.wheelRadius : 0.34)) % (Math.PI * 2);

    // Restage vehicles that are far behind the player onto a nearby street. Off-screen here means "beyond the halo";
    // the game camera rarely sees a full 600 m radius in street canyons anyway.
    const f = focus();
    if (Math.hypot(vehicle.x - f.x, vehicle.z - f.z) > restageRadius) {
      vehicle.restage += dt;
      if (vehicle.restage > 1.2 + hash(vehicle.index) * 2.5) {
        vehicle.restage = 0;
        const near = linksNear(f.x, f.z);
        const candidate = near[Math.floor(hash(vehicle.index + performance.now() * 0.0001) * near.length)];
        if (candidate !== undefined) {
          vehicle.link = candidate;
          vehicle.s = total[candidate] * (0.15 + hash(vehicle.index + vehicle.s) * 0.7);
          vehicle.dir = graph[candidate][5] === -1 ? -1 : (graph[candidate][5] === 0 && hash(vehicle.index) < 0.5 ? -1 : 1);
        }
      }
    } else {
      vehicle.restage = 0;
    }
  }

  function renderVehicle(vehicle, slot, isBus) {
    const s = Math.sin(vehicle.heading), c = Math.cos(vehicle.heading);
    quat.setFromAxisAngle(up, vehicle.heading);
    matrix.compose(pos.set(vehicle.x, 0, vehicle.z), quat, scaleOne);
    if (isBus) {
      busBody.setMatrixAt(slot, matrix);
      busSign.setMatrixAt(slot, matrix);
      spinQuat.setFromAxisAngle(xAxis, vehicle.wheelSpin);
      wheelQuat.copy(quat).multiply(spinQuat);
      for (const side of [-1, 1]) {
        const wheels = side < 0 ? busWheelLeft : busWheelRight;
        for (let axleIndex = 0; axleIndex < 2; axleIndex++) {
          const lx = side * HK_BUS_SPEC.wheelX;
          const lz = axleIndex === 0 ? HK_BUS_SPEC.wheelZ : -HK_BUS_SPEC.wheelZ;
          const wx = vehicle.x + c * lx + s * lz;
          const wz = vehicle.z - s * lx + c * lz;
          wheelMatrix.compose(pos.set(wx, HK_BUS_SPEC.wheelRadius, wz), wheelQuat, scaleOne);
          wheels.setMatrixAt(slot * 2 + axleIndex, wheelMatrix);
        }
      }
    } else {
      if (vehicle.taxi) {
        taxiMesh.setMatrixAt(vehicle.taxiSlot, matrix);
      } else {
        carMesh.setMatrixAt(vehicle.privateSlot, matrix);
        const paint = carMesh.geometry.attributes.paintColor.array;
        paint[vehicle.privateSlot * 3] = vehicle.paint.r;
        paint[vehicle.privateSlot * 3 + 1] = vehicle.paint.g;
        paint[vehicle.privateSlot * 3 + 2] = vehicle.paint.b;
      }
      // Wheels are children of the body in spirit: local left/right ±0.79 m, axles ±1.38 m, centre 0.34 m up.
      wheelQuat.setFromAxisAngle(up, vehicle.heading);
      for (let k = 0; k < 4; k++) {
        const side = k < 2 ? 1 : -1;
        const axle = k % 2 === 0 ? 1.38 : -1.38;
        const lx = side * 0.79, lz = axle;
        const wx = vehicle.x + c * lx + s * lz;
        const wz = vehicle.z - s * lx + c * lz;
        wheelMatrix.compose(pos.set(wx, 0.34, wz), wheelQuat, scaleOne);
        wheelMesh.setMatrixAt(slot * 4 + k, wheelMatrix);
      }
    }
  }

  const all = [...cars, ...buses];
  const near = [];

  function update(dt, controllerManager) {
    const f = focus();
    near.length = 0;
    for (const v of all) {
      if (Math.abs(v.x - f.x) <= restageRadius && Math.abs(v.z - f.z) <= restageRadius) near.push(v);
      v.followCap = Infinity;
    }
    updateFollowCaps(near);
    for (let i = 0; i < cars.length; i++) advance(cars[i], dt, false);
    for (let i = 0; i < buses.length; i++) advance(buses[i], dt, true);
    collideTraffic(near, dt);
    collidePlayer(near, dt, controllerManager);
    for (let i = 0; i < cars.length; i++) renderVehicle(cars[i], i, false);
    for (let i = 0; i < buses.length; i++) renderVehicle(buses[i], i, true);
    carMesh.instanceMatrix.needsUpdate = true;
    taxiMesh.instanceMatrix.needsUpdate = true;
    wheelMesh.instanceMatrix.needsUpdate = true;
    busBody.instanceMatrix.needsUpdate = true;
    busSign.instanceMatrix.needsUpdate = true;
    busWheelLeft.instanceMatrix.needsUpdate = true;
    busWheelRight.instanceMatrix.needsUpdate = true;
    carMesh.geometry.attributes.paintColor.needsUpdate = true;
  }

  return { group, cars, buses, update };
}
