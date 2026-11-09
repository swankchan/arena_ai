import { vehicleContact, resolveVehicleContact, sweptVehicleContact } from '../../vehicle-physics.js';

// Planar rigid-body collisions for Hong Kong traffic, using the same solver as New York (js/vehicle-physics.js).
//
// A traffic car keeps following its generated link: `speed` drives it along the path, while `pushX/pushZ` is a
// decaying positional offset from contacts. Struck cars therefore move visibly, then settle back into their lane.
// `followCap` is the speed from which a car could still stop behind the car ahead on its link.

const FOLLOW_MARGIN = 2;
const FOLLOW_DECEL = 5;
const SHOVE_LIMIT = 0.75;

const contactA = { x: 0, z: 0, prevX: 0, prevZ: 0, sin: 0, cos: 1, halfW: 0, halfL: 0,
  mass: 0, vx: 0, vz: 0, angularVel: 0 };
const contactB = { x: 0, z: 0, prevX: 0, prevZ: 0, sin: 0, cos: 1, halfW: 0, halfL: 0,
  mass: 0, vx: 0, vz: 0, angularVel: 0 };
const playerBody = { x: 0, z: 0, prevX: 0, prevZ: 0, sin: 0, cos: 1, halfW: 0, halfL: 0,
  mass: 0, vx: 0, vz: 0, angularVel: 0 };
const hit = {};

function wrapAngle(a) {
  return a - Math.round(a / (Math.PI * 2)) * Math.PI * 2;
}

// Driving speed is the authoritative velocity; the positional `push` offset is not part of the impact momentum.
function readBody(vehicle, body, dt) {
  const fx = Math.sin(vehicle.heading), fz = Math.cos(vehicle.heading);
  body.x = vehicle.x;
  body.z = vehicle.z;
  body.prevX = vehicle.prevX;
  body.prevZ = vehicle.prevZ;
  body.sin = fx;
  body.cos = fz;
  body.halfW = vehicle.halfW;
  body.halfL = vehicle.halfL;
  body.mass = vehicle.mass;
  body.vx = fx * vehicle.speed;
  body.vz = fz * vehicle.speed;
  body.angularVel = dt > 0 ? wrapAngle(vehicle.heading - vehicle.prevHeading) / dt : 0;
}

function writeBodySpeed(vehicle, body) {
  const fx = Math.sin(vehicle.heading), fz = Math.cos(vehicle.heading);
  vehicle.speed = Math.max(0, body.vx * fx + body.vz * fz);
}

// Shift a car by a contact correction. The offset decays in traffic.advance(), so the car settles back into its lane.
export function shoveVehicle(vehicle, dx, dz) {
  vehicle.x += dx;
  vehicle.z += dz;
  vehicle.pushX += dx;
  vehicle.pushZ += dz;
  const magnitude = Math.hypot(vehicle.pushX, vehicle.pushZ);
  if (magnitude > SHOVE_LIMIT) {
    const excess = 1 - SHOVE_LIMIT / magnitude;
    const ex = vehicle.pushX * excess, ez = vehicle.pushZ * excess;
    vehicle.pushX -= ex;
    vehicle.pushZ -= ez;
    vehicle.x -= ex;
    vehicle.z -= ez;
  }
}

// Only vehicles sharing a link and direction compete for the same lane.
export function updateFollowCaps(vehicles) {
  for (let i = 0; i < vehicles.length; i++) {
    const a = vehicles[i];
    for (let j = i + 1; j < vehicles.length; j++) {
      const b = vehicles[j];
      if (a.link !== b.link || a.dir !== b.dir) continue;
      const aAhead = (a.s - b.s) * a.dir > 0;
      const ahead = aAhead ? a : b;
      const behind = aAhead ? b : a;
      const gap = Math.abs(a.s - b.s) - ahead.halfL - behind.halfL - FOLLOW_MARGIN;
      if (gap > 60) continue;
      const cap = gap <= 0 ? 0 : Math.sqrt(2 * FOLLOW_DECEL * gap);
      if (cap < behind.followCap) behind.followCap = cap;
    }
  }
}

// Conservative local intersection courtesy: on different links, detect projected
// crossing paths and let one vehicle clear first. This is not a traffic-signal
// or full route reservation system; separated vertical levels are ignored.
export function updateJunctionYieldCaps(vehicles) {
  const cross = (ax, az, bx, bz) => ax * bz - az * bx;
  const stableId = v => (v.kind === 'bus' ? 100000 : 0) + (v.index ?? 0);
  for (let i = 0; i < vehicles.length; i++) for (let j = i + 1; j < vehicles.length; j++) {
    const a = vehicles[i], b = vehicles[j];
    if (a.link === b.link || Math.abs((a.y ?? 0) - (b.y ?? 0)) > 3) continue;
    const dx = b.x - a.x, dz = b.z - a.z;
    if (Math.abs(dx) > 48 || Math.abs(dz) > 48) continue;
    const ax = Math.sin(a.heading), az = Math.cos(a.heading), bx = Math.sin(b.heading), bz = Math.cos(b.heading);
    const denom = cross(ax, az, bx, bz);
    if (Math.abs(denom) < .3) continue; // parallel or gently merging: same-link following handles the common case
    const da = cross(dx, dz, bx, bz) / denom, db = cross(dx, dz, ax, az) / denom;
    if (da < -a.halfL || db < -b.halfL || da > 35 || db > 35) continue;
    const ta = Math.max(0, da - a.halfL) / Math.max(4, a.speed);
    const tb = Math.max(0, db - b.halfL) / Math.max(4, b.speed);
    if (Math.abs(ta - tb) > 2.5 || Math.min(ta, tb) > 4) continue;
    const aIn = da <= a.halfL + 1, bIn = db <= b.halfL + 1;
    let winner;
    if (aIn !== bIn) winner = aIn ? a : b;
    else if (Math.abs(ta - tb) > .8) winner = ta < tb ? a : b;
    else winner = stableId(a) <= stableId(b) ? a : b;
    const loser = winner === a ? b : a, distance = winner === a ? db : da;
    // One metre buffer to the conflict point plus the vehicle's front half.
    const stopDistance = Math.max(0, distance - loser.halfL - 1.5);
    loser.yieldDistance = Math.min(loser.yieldDistance ?? Infinity, stopDistance);
    loser.followCap = Math.min(loser.followCap, Math.sqrt(2 * FOLLOW_DECEL * stopDistance));
  }
}

export function collideTraffic(vehicles, dt) {
  for (let i = 0; i < vehicles.length; i++) {
    const a = vehicles[i];
    for (let j = i + 1; j < vehicles.length; j++) {
      const b = vehicles[j];
      if (Math.abs((a.y ?? 0) - (b.y ?? 0)) > 3) continue;
      const reach = Math.max(a.halfL, a.halfW) + Math.max(b.halfL, b.halfW) + 1;
      const sweepX = Math.abs((a.x - a.prevX) - (b.x - b.prevX));
      const sweepZ = Math.abs((a.z - a.prevZ) - (b.z - b.prevZ));
      if (Math.abs(a.x - b.x) > reach + sweepX || Math.abs(a.z - b.z) > reach + sweepZ) continue;
      readBody(a, contactA, dt);
      readBody(b, contactB, dt);
      if (!sweptVehicleContact(contactA, contactB, hit) && !vehicleContact(contactA, contactB, hit)) continue;
      resolveVehicleContact(contactA, contactB, hit);
      const shareB = contactB.mass / (contactA.mass + contactB.mass);
      // Contact normals point from b to a: each body takes its inverse-mass share of the separation.
      shoveVehicle(a, hit.nx * hit.depth * shareB, hit.nz * hit.depth * shareB);
      shoveVehicle(b, -hit.nx * hit.depth * (1 - shareB), -hit.nz * hit.depth * (1 - shareB));
      writeBodySpeed(a, contactA);
      writeBodySpeed(b, contactB);
    }
  }
}

// Push the player out of traffic and transfer the impact into its controller state, as New York does.
export function collidePlayer(vehicles, dt, controllerManager) {
  if (!controllerManager) return;
  const pe = controllerManager.getActiveEntity();
  if (!pe || controllerManager.activeMode === 'helicopter') return;
  const mode = controllerManager.activeMode;
  const halfW = mode === 'cyclist' ? 0.35 : mode === 'person' ? 0.32 : 0.86;
  const halfL = mode === 'cyclist' ? 0.85 : mode === 'person' ? 0.32 : 2.18;
  const mass = mode === 'car' ? 1700 : mode === 'cyclist' ? 95 : 80;
  const prevPX = pe.prevX ?? pe.position.x, prevPZ = pe.prevZ ?? pe.position.z;
  const playerX = pe.position.x, playerZ = pe.position.z;
  for (const v of vehicles) {
    if (Math.abs(pe.position.y - (v.y ?? 0)) > 2.6) continue;
    const reach = Math.max(v.halfL, v.halfW) + Math.max(halfL, halfW) + 1;
    const sweepX = Math.abs(playerX - prevPX - (v.x - v.prevX));
    const sweepZ = Math.abs(playerZ - prevPZ - (v.z - v.prevZ));
    if (Math.abs(playerX - v.x) > reach + sweepX || Math.abs(playerZ - v.z) > reach + sweepZ) continue;
    const a = playerBody, b = contactB;
    const heading = pe.heading || 0;
    a.x = playerX; a.z = playerZ;
    a.prevX = prevPX; a.prevZ = prevPZ;
    a.sin = Math.sin(heading); a.cos = Math.cos(heading);
    a.halfW = halfW; a.halfL = halfL; a.mass = mass;
    a.vx = a.sin * (pe.speed || 0) + (pe.vx || 0);
    a.vz = a.cos * (pe.speed || 0) + (pe.vz || 0);
    a.angularVel = mode === 'car' ? pe.angularVel || 0 : 0;
    readBody(v, b, dt);
    if (!sweptVehicleContact(a, b, hit) && !vehicleContact(a, b, hit)) continue;
    const speed = resolveVehicleContact(a, b, hit);
    const pShare = b.mass / (a.mass + b.mass);
    pe.position.x = hit.ax + hit.nx * hit.depth * pShare;
    pe.position.z = hit.az + hit.nz * hit.depth * pShare;
    // Traffic takes its share of the correction; the player keeps any remainder the road clamp would give back.
    shoveVehicle(v, hit.bx - v.x - hit.nx * hit.depth * (1 - pShare),
      hit.bz - v.z - hit.nz * hit.depth * (1 - pShare));
    const remainder = Math.max(0, hit.depth * (1 - pShare) + (v.x - hit.bx) * hit.nx + (v.z - hit.bz) * hit.nz);
    pe.position.x += hit.nx * remainder;
    pe.position.z += hit.nz * remainder;
    if (pe.mesh) pe.mesh.position.copy(pe.position);
    if (speed <= 0) continue;
    writeBodySpeed(v, b);
    pe.speed = a.vx * a.sin + a.vz * a.cos;
    if (mode === 'car') {
      pe.vx = a.vx - a.sin * pe.speed;
      pe.vz = a.vz - a.cos * pe.speed;
      pe.angularVel = a.angularVel;
      const kick = Math.min(12, hit.impulse / a.mass);
      pe.pitchVel += (hit.nx * a.sin + hit.nz * a.cos) * kick * 0.16;
      pe.rollVel -= (hit.nx * a.cos - hit.nz * a.sin) * kick * 0.2;
      pe.heaveVel += Math.min(0.7, kick * 0.06);
    }
  }
}
