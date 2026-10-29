const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const { loadModule } = require('./helpers/module.cjs');

// Run the production Hong Kong collision module against the production vehicle solver.
const physics = loadModule(readFileSync(join(__dirname, '../js/vehicle-physics.js'), 'utf8'));
const { collideTraffic, collidePlayer, updateFollowCaps } = loadModule(
  readFileSync(join(__dirname, '../js/cities/hongkong/collision.js'), 'utf8'),
  { imports: { '../../vehicle-physics.js': physics } }
);

function vehicle(options = {}) {
  return {
    x: 0, z: 0, prevX: 0, prevZ: 0, heading: 0, prevHeading: 0,
    speed: 0, halfW: 0.86, halfL: 2.18, mass: 1600,
    pushX: 0, pushZ: 0, followCap: Infinity,
    link: 0, s: 0, dir: 1, ...options
  };
}

function playerCar(x, z, speed = 0) {
  return {
    type: 'car',
    position: { x, y: 0, z },
    prevX: x, prevZ: z,
    heading: 0, speed, vx: 0, vz: 0, angularVel: 0,
    pitchVel: 0, rollVel: 0, heaveY: 0, heaveVel: 0,
    mesh: { position: { x, z, copy(p) { this.x = p.x; this.z = p.z; } } }
  };
}

test('overlapping traffic cars are separated and pushed apart', () => {
  // Both face +z; three metres between centres overlaps their 4.36 m combined length.
  const a = vehicle({ z: 0, speed: 6 });
  const b = vehicle({ z: 3, speed: 6 });
  collideTraffic([a, b], 1 / 60);

  assert.ok(Math.abs(a.z - b.z) > 4.2, `centres ${Math.abs(a.z - b.z).toFixed(2)} m apart`);
  assert.ok(a.z < 0, 'car behind is pushed backwards');
  assert.ok(b.z > 3, 'car ahead is pushed forwards');
  assert.ok(Math.hypot(a.pushX, a.pushZ) > 0.5, 'the shove is visible');
  assert.ok(Math.hypot(b.pushX, b.pushZ) > 0.5);
});

test('a bus transfers more momentum to a car than the car transfers to it', () => {
  // Shallow rear-end overlap keeps the contact normal along the road rather than across the bodies.
  const car = vehicle({ z: 0, speed: 8 });
  const bus = vehicle({ z: 7, speed: 0, halfW: 1.26, halfL: 5.6, mass: 12000 });
  collideTraffic([car, bus], 1 / 60);

  const carShift = Math.hypot(car.pushX, car.pushZ);
  const busShift = Math.hypot(bus.pushX, bus.pushZ);
  assert.ok(carShift > busShift * 4, 'the light car takes most of the separation');
  assert.ok(car.speed < 8, 'the car loses speed in the impact');
});

test('a traffic car shoves the player and transfers the impact into the controller', () => {
  const car = vehicle({ x: 0, z: 0, speed: 10 });
  const player = playerCar(0, 3.2);
  const manager = { activeMode: 'car', getActiveEntity: () => player };
  collidePlayer([car], 1 / 60, manager);

  assert.ok(player.position.z > 3.5, `player pushed to z=${player.position.z.toFixed(2)}`);
  assert.ok(player.mesh.position.z > 3.5, 'the player mesh follows');
  assert.ok(player.speed > 0, 'the hit pushes the player car forwards');
  assert.ok(car.z < -0.3, 'traffic takes its share of the separation');
  assert.ok(car.speed < 10, 'traffic loses speed in the impact');
});

test('the player cannot pass through a stationary traffic car', () => {
  // Driving into the back of stopped traffic: the player is stopped and pushed out, not driven through.
  const car = vehicle({ x: 0, z: 0, speed: 0 });
  const player = playerCar(0, -3.2, 14);
  const manager = { activeMode: 'car', getActiveEntity: () => player };
  collidePlayer([car], 1 / 60, manager);

  assert.ok(player.position.z < -3.5, 'player is separated from the traffic car');
  assert.ok(player.speed < 14, 'the impact removes player speed');
});

test('helicopter and distant players ignore traffic', () => {
  const car = vehicle({ x: 0, z: 0, speed: 10 });
  const player = playerCar(0, 2.2);
  const helicopter = { activeMode: 'helicopter', getActiveEntity: () => player };
  collidePlayer([car], 1 / 60, helicopter);
  assert.equal(player.position.z, 2.2);
  assert.equal(car.pushZ, 0);

  const far = playerCar(5000, 5000);
  collidePlayer([car], 1 / 60, { activeMode: 'car', getActiveEntity: () => far });
  assert.equal(far.position.x, 5000);
  assert.equal(car.pushZ, 0);
});

test('car following caps the speed of a car behind its leader', () => {
  const leader = vehicle({ s: 30, speed: 12 });
  const follower = vehicle({ s: 10, speed: 12 });
  updateFollowCaps([follower, leader]);

  assert.equal(leader.followCap, Infinity, 'a car with nobody ahead keeps its cruise speed');
  assert.ok(follower.followCap < follower.speed, `cap ${follower.followCap.toFixed(1)} below cruise`);
  assert.ok(follower.followCap > 0);
});

test('car following ignores opposite directions, other links and distant leaders', () => {
  const opposite = [vehicle({ s: 10, speed: 12, dir: 1 }), vehicle({ s: 30, speed: 12, dir: -1 })];
  updateFollowCaps(opposite);
  assert.equal(opposite[0].followCap, Infinity);
  assert.equal(opposite[1].followCap, Infinity);

  const otherLinks = [vehicle({ s: 10, speed: 12, link: 1 }), vehicle({ s: 30, speed: 12, link: 2 })];
  updateFollowCaps(otherLinks);
  assert.equal(otherLinks[0].followCap, Infinity);

  const distant = [vehicle({ s: 10, speed: 12 }), vehicle({ s: 200, speed: 12 })];
  updateFollowCaps(distant);
  assert.equal(distant[0].followCap, Infinity);
});
