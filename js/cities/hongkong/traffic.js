import * as THREE from 'three/webgpu';
import { GEO } from '../../hk-geodata.js';
import { updateFollowCaps, updateJunctionYieldCaps, collideTraffic, collidePlayer } from './collision.js';
import { isTrafficPathOnLand } from './meta.js';
import {
  BODY_SPECS,
  HK_BUS_SPEC,
  buildCarGeometry,
  buildSteerableWheelGeo,
  createLoftedCarMaterial,
  buildHongKongBusBodyGeometry,
  buildHongKongBusSignGeometry,
  createHongKongBusMaterial,
  buildBusWheelGeo,
  createBusWheelMaterial
} from '../../actor-models.js';
import { DEFAULT_TAXI_STYLE, getTaxiStyle } from '../../taxi-styles.js';
import { buildCircularTurn, buildCubicTurn, buildCubicBetween, buildSemicircularUturn, samplePlannedTurn, wrapTrafficAngle } from './traffic-geometry.js';
import { buildTrafficRouteGeometry, trafficLaneOffset, trafficRoadPermits } from './traffic-paths.js';
import { roadRibbonHeightAtSegment } from './road-elevation.js';

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
  // White LED destination text and a large right-aligned route number, as on the supplied modern KMB references.
  ctx.fillStyle = '#f4f1df';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '800 34px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
  ctx.fillText('筲箕灣', 22, 47);
  ctx.font = '700 21px Inter, Arial, sans-serif';
  ctx.fillText('SHAU KEI WAN', 22, 88);
  ctx.textAlign = 'right';
  ctx.font = '800 61px Inter, Arial, sans-serif';
  ctx.fillText('102', 492, 67);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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

export function createHongKongTraffic(scene, { getFocus, taxiStyle, getGroundHeight = null }) {
  const group = new THREE.Group();
  group.name = 'HongKongTraffic';
  scene.add(group);

  const style = getTaxiStyle(taxiStyle) ?? getTaxiStyle(DEFAULT_TAXI_STYLE);
  const taxiSpec = BODY_SPECS[style?.body] ?? BODY_SPECS.taxi;
  const taxiPaint = new THREE.Color(style?.paint ?? 0xc6202b);

  const nodes = GEO.roadGraph.nodes;
  const graph = GEO.roadGraph.links;
  const { paths, routes } = buildTrafficRouteGeometry(graph, nodes);
  const lengths = paths.map(cumulative);
  const total = paths.map((points, i) => lengths[i][lengths[i].length - 1]);
  const onLand = paths.map((points, i) => isTrafficPathOnLand(points, graph[i][3]));

  // Outgoing links: dir 1 is a->b, dir -1 is b->a, dir 0 is two-way. One-way is 74% of Hong Kong's graph.
  // Exclude routes beyond the rendered land at every transition, not only when a vehicle is first placed.
  const outgoing = Array.from({ length: nodes.length / 2 }, () => []);
  for (let i = 0; i < graph.length; i++) {
    if (!onLand[i]) continue;
    const link = graph[i];
    if (link[5] !== -1) outgoing[link[0]].push({ link: i, from: link[0], to: link[1], dir: 1 });
    if (link[5] !== 1) outgoing[link[1]].push({ link: i, from: link[1], to: link[0], dir: -1 });
  }

  const drivable = [];
  for (let i = 0; i < graph.length; i++) {
    if (onLand[i] && trafficRoadPermits(routes[i],graph[i][3],true) && total[i] >= 100) drivable.push(i);
  }

  function laneSample(link, travelS, dir, isBus = false) {
    const pathS = dir > 0 ? travelS : total[link] - travelS;
    const p = samplePath(paths[link], lengths[link], pathS);
    const laneOffset = trafficLaneOffset(routes[link]?.laneWidth ?? graph[link][3],isBus);
    const dx = p.dx * dir, dz = p.dz * dir;
    return { x: p.x + p.dz * dir * laneOffset, z: p.z - p.dx * dir * laneOffset,
      dx, dz, heading: Math.atan2(dx, dz) };
  }
  const getTravelS = (vehicle) => vehicle.dir > 0 ? vehicle.s : total[vehicle.link] - vehicle.s;
  const setTravelS = (vehicle, travelS) => { vehicle.s = vehicle.dir > 0 ? travelS : total[vehicle.link] - travelS; };
  const initialChainage = (link, salt) => {
    const margin = Math.min(28, total[link] * 0.2);
    return margin + hash(salt) * Math.max(0, total[link] - margin * 2);
  };

  function refineTurnOnCurvedLinks(turn, fromLink, fromDir, option, isBus) {
    if (!turn || turn.radius < (isBus ? 6 : 3)) return null;
    const start = laneSample(fromLink, turn.startTravelS, fromDir, isBus);
    const end = laneSample(option.link, turn.endTravelS, option.dir, isBus);
    const positionError = Math.max(Math.hypot(turn.startX - start.x, turn.startZ - start.z),
      Math.hypot(turn.endX - end.x, turn.endZ - end.z));
    const tangentError = Math.max(Math.abs(wrapTrafficAngle(start.heading - turn.fromHeading)),
      Math.abs(wrapTrafficAngle(end.heading - turn.toHeading)));
    if (positionError <= 0.005 && tangentError <= 0.005) return turn;
    const refined = buildCubicBetween({
      startPoint: start, startDirection: { x: start.dx, z: start.dz }, startTravelS: turn.startTravelS,
      endPoint: end, endDirection: { x: end.dx, z: end.dz }, endTravelS: turn.endTravelS,
      radius: turn.radius
    });
    return refined;
  }

  function planNext(vehicle, isBus) {
    const link = vehicle.link, dir = vehicle.dir;
    const node = dir > 0 ? graph[link][1] : graph[link][0];
    const available = (outgoing[node] || []).filter((option) => onLand[option.link] && trafficRoadPermits(routes[option.link],graph[option.link][3],isBus) && total[option.link] > 4);
    const options = available.length ? available : [{ link, dir: -dir }];
    const currentTravelS = getTravelS(vehicle);
    const fromPoint = laneSample(link, total[link], dir, isBus);
    if (options.length === 1 && options[0].link === link && options[0].dir === -dir) {
      const option = options[0], toPoint = laneSample(option.link, 0, option.dir, isBus);
      const turn = buildSemicircularUturn({ fromPoint, fromDirection: { x: fromPoint.dx, z: fromPoint.dz },
        toPoint, startTravelS: total[link] });
      if (turn) {
        vehicle.next = option;
        vehicle.turn = turn;
        vehicle.turnActive = false;
        vehicle.turnDistance = 0;
        vehicle.signalDirection = turn.blink;
        vehicle.waitingForTurn = false;
        return;
      }
    }
    let best = null, bestScore = -Infinity, fallback = null, fallbackScore = -Infinity;
    for (const option of options) {
      if (option.link === link && options.length > 1) continue;
      const toPoint = laneSample(option.link, 0, option.dir, isBus);
      const angle = wrapTrafficAngle(toPoint.heading - fromPoint.heading);
      const score = graph[option.link][3] + hash(vehicle.index + option.link * 0.13) * 4 - Math.abs(angle) * 5;
      const turn = refineTurnOnCurvedLinks(buildCircularTurn({
        fromPoint, fromDirection: { x: fromPoint.dx, z: fromPoint.dz }, fromTotal: total[link],
        toPoint, toDirection: { x: toPoint.dx, z: toPoint.dz }, toTotal: total[option.link],
        radius: Math.max(isBus ? 17 : 10, vehicle.halfL * 3.1),
        minimumRadius: isBus ? 7 : 3.5, earliestStart: currentTravelS
      }), link, dir, option, isBus);
      if (score > fallbackScore) { fallbackScore = score; fallback = { option, turn: null }; }
      if (Math.abs(angle) >= 0.055 && (!turn || turn.startTravelS < currentTravelS - 0.05)) continue;
      if (score > bestScore) { bestScore = score; best = { option, turn }; }
    }
    if (!best) {
      let constrainedScore = -Infinity;
      for (const option of options) {
        if (option.link === link && options.length > 1) continue;
        const toPoint = laneSample(option.link, 0, option.dir, isBus);
        const parameters = {
          fromPoint, fromDirection: { x: fromPoint.dx, z: fromPoint.dz }, fromTotal: total[link],
          toPoint, toDirection: { x: toPoint.dx, z: toPoint.dz }, toTotal: total[option.link],
          radius: Math.max(isBus ? 17 : 10, vehicle.halfL * 3.1), earliestStart: currentTravelS
        };
        const turn = refineTurnOnCurvedLinks(buildCircularTurn({ ...parameters, minimumRadius: isBus ? 7 : 3.5 }) || buildCubicTurn(parameters), link, dir, option, isBus);
        if (!turn || turn.startTravelS < currentTravelS - 0.05) continue;
        const angle = Math.abs(wrapTrafficAngle(toPoint.heading - fromPoint.heading));
        const score = graph[option.link][3] + hash(vehicle.index + option.link * 0.13) * 4 - angle * 5;
        if (score > constrainedScore) { constrainedScore = score; best = { option, turn }; }
      }
    }
    if (!best) {
      let emergencyScore = -Infinity;
      for (const option of options) {
        if (option.link === link && options.length > 1) continue;
        const toPoint = laneSample(option.link, 0, option.dir, isBus);
        const angle = Math.abs(wrapTrafficAngle(toPoint.heading - fromPoint.heading));
        if (angle < 0.055) continue;
        let emergency = null;
        for (const distance of [24, 18, 12, 8, 5, 3, 1.5]) {
          const endTravelS = Math.min(distance, total[option.link] * 0.45);
          if (endTravelS < 0.35) continue;
          const end = laneSample(option.link, endTravelS, option.dir, isBus);
          const turn = buildCubicBetween({
            startPoint: fromPoint, startDirection: { x: fromPoint.dx, z: fromPoint.dz }, startTravelS: total[link],
            endPoint: end, endDirection: { x: end.dx, z: end.dz }, endTravelS,
            radius: Math.max(isBus ? 17 : 10, vehicle.halfL * 3.1)
          });
          if (turn && turn.radius >= (angle < 0.25 ? 2 : (isBus ? 6 : 3)) && (!emergency || turn.radius > emergency.radius)) emergency = turn;
        }
        const minimumRadius = angle < 0.25 ? 2 : (isBus ? 6 : 3);
        if (emergency && emergency.radius < minimumRadius) emergency = null;
        const score = graph[option.link][3] + hash(vehicle.index + option.link * 0.13) * 4 - angle * 5;
        if (emergency && score > emergencyScore) { emergencyScore = score; best = { option, turn: emergency }; }
      }
    }
    let selected = best;
    if (!selected && fallback?.option) {
      const toPoint = laneSample(fallback.option.link, 0, fallback.option.dir, isBus);
      if (Math.abs(wrapTrafficAngle(toPoint.heading - fromPoint.heading)) < 0.055) selected = fallback;
    }
    vehicle.next = selected?.option || null;
    vehicle.turn = selected?.turn || null;
    vehicle.turnActive = false;
    vehicle.turnDistance = 0;
    vehicle.signalDirection = vehicle.turn ? vehicle.turn.blink : 0;
    vehicle.waitingForTurn = !selected;
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
    const s = initialChainage(startLink, index * 3.7);
    const point = samplePath(paths[startLink], lengths[startLink], s);
    return {
      kind, index, link: startLink,
      point,
      x: point.x, y: 0, z: point.z, heading: point.heading, speed: 0,
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
      turn: null, next: null, turnActive: false, turnDistance: 0,
      blink: 0, signalDirection: 0, signalTimer: 0, brake: 0,
      roadHeading: point.heading, pitch: 0, steering: 0,
      restage: 0
    };
  };

  for (let i = 0; i < CAR_COUNT; i++) {
    const taxi = i % 7 < 2;
    const car = createVehicle(i, 'car', taxi);
    car.dir = graph[car.link][5] === -1 ? -1 : 1;
    if (graph[car.link][5] === 0 && hash(i + 17) < 0.5) car.dir = -1;
    if (car.dir < 0) car.s = total[car.link] - car.s;
    cars.push(car);
  }
  for (let i = 0; i < BUS_COUNT; i++) {
    const bus = createVehicle(i, 'bus');
    bus.dir = graph[bus.link][5] === -1 ? -1 : 1;
    if (graph[bus.link][5] === 0 && hash(i + 29) < 0.5) bus.dir = -1;
    if (bus.dir < 0) bus.s = total[bus.link] - bus.s;
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
    cars[i].s = initialChainage(link, i * 5.7);
    cars[i].dir = graph[link][5] === -1 ? -1 : (graph[link][5] === 0 && hash(i) < 0.5 ? -1 : 1);
    if (cars[i].dir < 0) cars[i].s = total[link] - cars[i].s;
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
    Math.max(1, privateCount * 4)
  );
  wheelMesh.count = privateCount * 4;
  wheelMesh.castShadow = true;
  wheelMesh.frustumCulled = false;
  wheelMesh.name = 'HongKongWheels';

  // Taxis use the same five-opening silver wheels as the player, but only two instanced draws for the whole fleet.
  const taxiWheelMat = createLoftedCarMaterial(taxiSpec, style.paint, { livery: style.livery });
  const taxiWheelLeft = new THREE.InstancedMesh(buildSteerableWheelGeo(taxiSpec, -1), taxiWheelMat, Math.max(1, taxiCount * 2));
  const taxiWheelRight = new THREE.InstancedMesh(buildSteerableWheelGeo(taxiSpec, 1), taxiWheelMat, Math.max(1, taxiCount * 2));
  taxiWheelLeft.count = taxiWheelRight.count = taxiCount * 2;
  taxiWheelLeft.name = 'HongKongTaxiWheelLeft';
  taxiWheelRight.name = 'HongKongTaxiWheelRight';
  for (const mesh of [taxiWheelLeft, taxiWheelRight]) {
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);
  }

  const busBodyGeo = buildHongKongBusBodyGeometry();
  const busPaint = new THREE.InstancedBufferAttribute(new Float32Array(BUS_COUNT * 3), 3);
  busBodyGeo.setAttribute('busPaint', busPaint);
  const busState = new THREE.InstancedBufferAttribute(new Float32Array(BUS_COUNT * 4), 4);
  busBodyGeo.setAttribute('busState', busState);
  const busBody = new THREE.InstancedMesh(busBodyGeo, createHongKongBusMaterial(), BUS_COUNT);
  const busSign = new THREE.InstancedMesh(
    buildHongKongBusSignGeometry(),
    new THREE.MeshBasicNodeMaterial({ map: createHongKongBusDestinationTexture() }),
    BUS_COUNT
  );
  const busWheelMat = createBusWheelMaterial();
  const busWheelLeft = new THREE.InstancedMesh(buildBusWheelGeo(-1), busWheelMat, BUS_COUNT * HK_BUS_SPEC.axleZ.length);
  const busWheelRight = new THREE.InstancedMesh(buildBusWheelGeo(1), busWheelMat, BUS_COUNT * HK_BUS_SPEC.axleZ.length);
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

  const busColors = [new THREE.Color(0xd3262e), new THREE.Color(0xe9e5da), new THREE.Color(0xd46a23), new THREE.Color(0xd8b42e)];
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
  const pitchQuat = new THREE.Quaternion();
  const rollQuat = new THREE.Quaternion();
  const steerQuat = new THREE.Quaternion();
  const xAxis = new THREE.Vector3(1, 0, 0);
  const zAxis = new THREE.Vector3(0, 0, 1);
  const wheelMatrix = new THREE.Matrix4();
  const pos = new THREE.Vector3();

  const currentGroundSample = { height: null, distanceSq: Infinity };
  const nextGroundSample = { height: null, distanceSq: Infinity };

  function routeGroundSample(route, x, z, out) {
    const flat = route.flat;
    let bestDistanceSq = Infinity, height = null;
    for (let i = 2; i < flat.length; i += 2) {
      const ax = flat[i - 2], az = flat[i - 1], dx = flat[i] - ax, dz = flat[i + 1] - az;
      const lengthSq = dx * dx + dz * dz;
      const t = lengthSq > 1e-8 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq)) : 0;
      const px = ax + dx * t, pz = az + dz * t, distanceSq = (x - px) ** 2 + (z - pz) ** 2;
      if (distanceSq < bestDistanceSq) {
        bestDistanceSq = distanceSq;
        height = roadRibbonHeightAtSegment(route.wayId, i / 2 - 1, t);
      }
    }
    out.height = height;
    out.distanceSq = bestDistanceSq;
    return out;
  }

  function vehicleGroundHeight(vehicle, x, z, referenceY) {
    const route = routes[vehicle.link];
    if (!route || (route.flags & 6)) return getGroundHeight(x, z, 'car', referenceY);
    const current = routeGroundSample(route, x, z, currentGroundSample);
    if (vehicle.turnActive && vehicle.turn) {
      // A turning vehicle is no longer on vehicle.link's centreline. Sampling only that old
      // route clamps every wheel to its last endpoint and makes the car hover (or sink) at
      // a sloping junction. Prefer the precise outgoing ribbon once it is closer, and use
      // the real junction/terrain query while between the two rendered carriageways.
      const nextLink = vehicle.next?.link;
      const nextRoute = routes[nextLink];
      if (nextRoute && !(nextRoute.flags & 6)) {
        const next = routeGroundSample(nextRoute, x, z, nextGroundSample);
        const nextHalfWidth = Math.max(0.35, (graph[nextLink]?.[3] || 6) * 0.5 + 0.35);
        if (next.height !== null && next.distanceSq < currentGroundSample.distanceSq && next.distanceSq <= nextHalfWidth ** 2) {
          return next.height;
        }
      }
      const currentHalfWidth = Math.max(0.35, (graph[vehicle.link]?.[3] || 6) * 0.5 + 0.35);
      if (current.height === null || current.distanceSq > currentHalfWidth ** 2) {
        return getGroundHeight(x, z, 'car', referenceY);
      }
    }
    return current.height ?? getGroundHeight(x, z, 'car', referenceY);
  }

  function advance(vehicle, dt, isBus) {
    const link = vehicle.link, length = total[link];
    if (!length) return;
    vehicle.prevX = vehicle.x;
    vehicle.prevZ = vehicle.z;
    vehicle.prevHeading = vehicle.heading;
    vehicle.signalTimer = Math.max(0, vehicle.signalTimer - dt);

    let travelS = getTravelS(vehicle);
    if (!vehicle.next && length - travelS < 55) planNext(vehicle, isBus);
    vehicle.blink = vehicle.turn ? vehicle.signalDirection : (vehicle.signalTimer > 0 ? vehicle.signalDirection : 0);

    const cruise = vehicle.targetSpeed * (isBus ? 0.72 : 1);
    let turnCap = Infinity;
    if (vehicle.turn) {
      turnCap = vehicle.turnActive ? vehicle.turn.speed : Math.sqrt(vehicle.turn.speed ** 2
        + 6 * Math.max(0, vehicle.turn.startTravelS - travelS));
    }
    let want = Math.min(cruise, vehicle.followCap, turnCap);
    if (!vehicle.next && length - travelS < 8) want = 0;
    vehicle.brake = want < vehicle.speed - 0.2 ? 1 : 0;
    const response = want < vehicle.speed ? 4.5 : 1.5;
    vehicle.speed += (want - vehicle.speed) * (1 - Math.exp(-dt * response));
    let step = vehicle.speed * dt;
    if (Number.isFinite(vehicle.yieldDistance) && step > vehicle.yieldDistance) {
      step = vehicle.yieldDistance; vehicle.speed = 0; vehicle.brake = 1;
    }
    let p = null;

    if (vehicle.turnActive && vehicle.turn) {
      vehicle.turnDistance += step;
    } else {
      travelS += step;
      if (!vehicle.next) travelS = Math.min(travelS, length);
      setTravelS(vehicle, travelS);
      if (vehicle.turn && travelS >= vehicle.turn.startTravelS) {
        vehicle.turnActive = true;
        vehicle.turnDistance = Math.max(0, travelS - vehicle.turn.startTravelS);
        setTravelS(vehicle, vehicle.turn.startTravelS);
      } else if (!vehicle.turn && travelS >= length) {
        const overflow = travelS - length;
        if (vehicle.next) {
          const candidate = laneSample(vehicle.next.link, overflow, vehicle.next.dir, isBus);
          const current = laneSample(link, length, vehicle.dir, isBus);
          if (Math.abs(wrapTrafficAngle(candidate.heading - current.heading)) > 0.35) {
            vehicle.next = null;
            vehicle.waitingForTurn = true;
            vehicle.speed = 0;
            setTravelS(vehicle, length);
          } else {
            vehicle.link = vehicle.next.link;
            vehicle.dir = vehicle.next.dir;
            vehicle.next = null;
            setTravelS(vehicle, overflow);
          }
        } else {
          setTravelS(vehicle, length);
        }
      }
    }

    if (vehicle.turnActive && vehicle.turn) {
      if (vehicle.turnDistance >= vehicle.turn.length) {
        const overflow = vehicle.turnDistance - vehicle.turn.length;
        const finished = vehicle.turn;
        vehicle.link = vehicle.next.link;
        vehicle.dir = vehicle.next.dir;
        vehicle.next = null;
        setTravelS(vehicle, finished.endTravelS + overflow);
        vehicle.turn = null;
        vehicle.turnActive = false;
        vehicle.turnDistance = 0;
        vehicle.signalDirection = finished.blink;
        vehicle.signalTimer = 1.1;
        vehicle.blink = finished.blink;
        p = laneSample(vehicle.link, getTravelS(vehicle), vehicle.dir, isBus);
      } else {
        p = samplePlannedTurn(vehicle.turn, vehicle.turnDistance);
      }
    }
    if (!p) p = laneSample(vehicle.link, getTravelS(vehicle), vehicle.dir, isBus);

    const shoveDecay = Math.exp(-dt * 3.5);
    vehicle.pushX *= shoveDecay;
    vehicle.pushZ *= shoveDecay;
    vehicle.x = p.x + vehicle.pushX;
    vehicle.z = p.z + vehicle.pushZ;
    if (Math.hypot(vehicle.x - vehicle.prevX, vehicle.z - vehicle.prevZ) > 50) {
      vehicle.prevX = vehicle.x;
      vehicle.prevZ = vehicle.z;
    }
    vehicle.roadHeading = p.heading;
    vehicle.heading = p.heading;
    const wheelbase = isBus ? 7.1 : (vehicle.taxi ? taxiSpec.wheelZ * 2 : 2.76);
    vehicle.steeringTarget = vehicle.turnActive && vehicle.turn
      ? vehicle.turn.sign * Math.min(0.65, Math.atan(wheelbase / vehicle.turn.radius)) : 0;
    vehicle.wheelSpin = (vehicle.wheelSpin + step / (isBus ? HK_BUS_SPEC.wheelRadius : 0.34)) % (Math.PI * 2);

    const f = focus();
    if (Math.hypot(vehicle.x - f.x, vehicle.z - f.z) > restageRadius) {
      vehicle.restage += dt;
      if (vehicle.restage > 1.2 + hash(vehicle.index) * 2.5) {
        vehicle.restage = 0;
        const near = linksNear(f.x, f.z);
        const candidate = near[Math.floor(hash(vehicle.index + performance.now() * 0.0001) * near.length)];
        if (candidate !== undefined) {
          vehicle.link = candidate;
          vehicle.s = initialChainage(candidate, vehicle.index + vehicle.s);
          vehicle.dir = graph[candidate][5] === -1 ? -1 : (graph[candidate][5] === 0 && hash(vehicle.index) < 0.5 ? -1 : 1);
          if (vehicle.dir < 0) vehicle.s = total[candidate] - vehicle.s;
          vehicle.turn = null;
          vehicle.next = null;
          vehicle.turnActive = false;
          vehicle.turnDistance = 0;
          vehicle.blink = 0;
          vehicle.signalTimer = 0;
          vehicle.waitingForTurn = false;
        }
      }
    } else {
      vehicle.restage = 0;
    }
  }

  function writeVehicleState(geometry, slot, vehicle) {
    const state = geometry.attributes.carState || geometry.attributes.busState;
    if (!state) return;
    const on = ((clock + hash(vehicle.index + 2.7) * 0.8) % 0.8) < 0.4;
    const offset = slot * 4;
    state.array[offset] = vehicle.brake;
    state.array[offset + 1] = on && vehicle.blink < 0 ? 1 : 0;
    state.array[offset + 2] = on && vehicle.blink > 0 ? 1 : 0;
    state.array[offset + 3] = 0;
  }

  function renderVehicle(vehicle, slot, isBus, dt) {
    const poseHeading = vehicle.heading;
    const groundSin = Math.sin(poseHeading), groundCos = Math.cos(poseHeading);
    const wheelbase = isBus ? 7.1 : (vehicle.taxi ? taxiSpec.wheelZ * 2 : 2.76);
    let targetPitch = 0, targetRoll = 0;
    if (getGroundHeight) {
      const centreY = vehicleGroundHeight(vehicle, vehicle.x, vehicle.z, vehicle.y);
      const track = isBus ? HK_BUS_SPEC.wheelX : (vehicle.taxi ? taxiSpec.wheelX : 0.79);
      const axleHeight = (longitudinal) => {
        const x = vehicle.x + groundSin * longitudinal, z = vehicle.z + groundCos * longitudinal;
        const left = vehicleGroundHeight(vehicle, x + groundCos * track, z - groundSin * track, centreY);
        const right = vehicleGroundHeight(vehicle, x - groundCos * track, z + groundSin * track, centreY);
        return { left, right, mean: (left + right) * 0.5 };
      };
      const front = axleHeight(wheelbase * 0.5);
      const rear = axleHeight(-wheelbase * 0.5);
      vehicle.y = (front.mean + rear.mean) * 0.5;
      targetPitch = Math.atan2(front.mean - rear.mean, wheelbase);
      targetRoll = Math.atan2((front.left + rear.left) - (front.right + rear.right), 4 * track);
    } else {
      vehicle.y = 0;
    }
    vehicle.pitch = targetPitch;
    vehicle.roll = targetRoll;
    vehicle.steering += ((vehicle.steeringTarget || 0) - vehicle.steering) * (1 - Math.exp(-dt * 10));
    quat.setFromAxisAngle(up, vehicle.heading);
    pitchQuat.setFromAxisAngle(xAxis, -vehicle.pitch);
    rollQuat.setFromAxisAngle(zAxis, vehicle.roll);
    quat.multiply(pitchQuat).multiply(rollQuat);
    matrix.compose(pos.set(vehicle.x, vehicle.y, vehicle.z), quat, scaleOne);
    if (isBus) {
      busBody.setMatrixAt(slot, matrix);
      busSign.setMatrixAt(slot, matrix);
      writeVehicleState(busBodyGeo, slot, vehicle);
      for (const side of [-1, 1]) {
        const wheels = side < 0 ? busWheelLeft : busWheelRight;
        for (const [axleIndex, lz] of HK_BUS_SPEC.axleZ.entries()) {
          const lx = side * HK_BUS_SPEC.wheelX;
          steerQuat.setFromAxisAngle(up, lz > 0 ? vehicle.steering : 0);
          spinQuat.setFromAxisAngle(xAxis, vehicle.wheelSpin);
          wheelQuat.copy(steerQuat).multiply(spinQuat);
          wheelMatrix.compose(pos.set(lx, HK_BUS_SPEC.wheelRadius, lz), wheelQuat, scaleOne).premultiply(matrix);
          wheels.setMatrixAt(slot * HK_BUS_SPEC.axleZ.length + axleIndex, wheelMatrix);
        }
      }
    } else {
      if (vehicle.taxi) {
        taxiMesh.setMatrixAt(vehicle.taxiSlot, matrix);
        writeVehicleState(taxiGeo, vehicle.taxiSlot, vehicle);
      } else {
        carMesh.setMatrixAt(vehicle.privateSlot, matrix);
        writeVehicleState(carGeo, vehicle.privateSlot, vehicle);
        const paint = carMesh.geometry.attributes.paintColor.array;
        paint[vehicle.privateSlot * 3] = vehicle.paint.r;
        paint[vehicle.privateSlot * 3 + 1] = vehicle.paint.g;
        paint[vehicle.privateSlot * 3 + 2] = vehicle.paint.b;
      }
      if (vehicle.taxi) {
        for (const side of [-1, 1]) {
          const wheels = side < 0 ? taxiWheelLeft : taxiWheelRight;
          for (let axleIndex = 0; axleIndex < 2; axleIndex++) {
            const lx = side * taxiSpec.wheelX;
            const lz = axleIndex === 0 ? taxiSpec.wheelZ : -taxiSpec.wheelZ;
            steerQuat.setFromAxisAngle(up, lz > 0 ? vehicle.steering : 0);
            spinQuat.setFromAxisAngle(xAxis, vehicle.wheelSpin);
            wheelQuat.copy(steerQuat).multiply(spinQuat);
            wheelMatrix.compose(pos.set(lx, taxiSpec.wheelRadius, lz), wheelQuat, scaleOne).premultiply(matrix);
            wheels.setMatrixAt(vehicle.taxiSlot * 2 + axleIndex, wheelMatrix);
          }
        }
      } else {
        for (let k = 0; k < 4; k++) {
          const side = k < 2 ? 1 : -1;
          const lx = side * 0.79, lz = k % 2 === 0 ? 1.38 : -1.38;
          steerQuat.setFromAxisAngle(up, lz > 0 ? vehicle.steering : 0);
          spinQuat.setFromAxisAngle(xAxis, vehicle.wheelSpin);
          wheelQuat.copy(steerQuat).multiply(spinQuat);
          wheelMatrix.compose(pos.set(lx, 0.34, lz), wheelQuat, scaleOne).premultiply(matrix);
          wheelMesh.setMatrixAt(vehicle.privateSlot * 4 + k, wheelMatrix);
        }
      }
    }
  }

  const all = [...cars, ...buses];
  const near = [];
  let clock = 0;

  function update(dt, controllerManager) {
    clock += dt;
    const f = focus();
    near.length = 0;
    for (const v of all) {
      if (Math.abs(v.x - f.x) <= restageRadius && Math.abs(v.z - f.z) <= restageRadius) near.push(v);
      v.followCap = Infinity;
      v.yieldDistance = Infinity;
    }
    updateFollowCaps(near);
    updateJunctionYieldCaps(near);
    for (let i = 0; i < cars.length; i++) advance(cars[i], dt, false);
    for (let i = 0; i < buses.length; i++) advance(buses[i], dt, true);
    collideTraffic(near, dt);
    collidePlayer(near, dt, controllerManager);
    for (let i = 0; i < cars.length; i++) renderVehicle(cars[i], i, false, dt);
    for (let i = 0; i < buses.length; i++) renderVehicle(buses[i], i, true, dt);
    carMesh.instanceMatrix.needsUpdate = true;
    taxiMesh.instanceMatrix.needsUpdate = true;
    wheelMesh.instanceMatrix.needsUpdate = true;
    taxiWheelLeft.instanceMatrix.needsUpdate = true;
    taxiWheelRight.instanceMatrix.needsUpdate = true;
    busBody.instanceMatrix.needsUpdate = true;
    busSign.instanceMatrix.needsUpdate = true;
    busWheelLeft.instanceMatrix.needsUpdate = true;
    busWheelRight.instanceMatrix.needsUpdate = true;
    carMesh.geometry.attributes.paintColor.needsUpdate = true;
    carMesh.geometry.attributes.carState.needsUpdate = true;
    taxiMesh.geometry.attributes.carState.needsUpdate = true;
    busState.needsUpdate = true;
  }

  return { group, cars, buses, update, sampleGround: vehicleGroundHeight };
}
