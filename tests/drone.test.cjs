const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('the player aircraft is rebuilt as a four-rotor camera drone, not a relabelled helicopter', () => {
  const actor = read('js/actor-models.js');
  const controller = read('js/controllers.js');
  assert.match(actor, /const DRONE_ROTOR_RADIUS = 0\.1195/);
  assert.match(actor, /const DRONE_COLLISION_RADIUS = 0\.32/);
  assert.match(actor, /DroneHull|CAMERA|LENS|buildDroneRotorGeometry/);
  assert.match(controller, /PlayerCameraDrone/);
  assert.match(controller, /DroneHullFourArmsAndCameraGimbal/);
  assert.match(controller, /for \(const rotor of heli\.rotorPivots\)/);
  assert.doesNotMatch(actor, /buildHelicopter|HelicopterMainRotor|HelicopterTailRotor|Fuselage/);
  assert.doesNotMatch(controller, /mainRotorPivot|tailRotorPivot|buildHelicopter/);
});

test('flight speed, collision envelope and audible voice match the faster drone', () => {
  const controller = read('js/controllers.js');
  const app = read('js/app.js');
  const audioSources = read('js/audio-sources.js');
  const audioSynth = read('js/audio-synthesis.js');
  assert.match(controller, /const maxHorizSpeed = 80\.0/);
  assert.match(controller, /collisionRadius: DRONE_COLLISION_RADIUS/);
  assert.match(controller, /h\.collisionRadius \?\? DRONE_COLLISION_RADIUS/);
  assert.match(app, /Math\.abs\(activeEnt\.speed\) \* 3\.6/, '80 m/s is displayed as 288 km/h');
  assert.match(audioSources, /player && entity\.type === 'helicopter' \? 'drone'/);
  assert.match(audioSynth, /'helicopter', 'drone', 'cyclist'/);
  assert.match(audioSynth, /const drone = kind === 'drone'/);
});

test('all player-facing city labels and the mode icon say drone', () => {
  const html = read('index.html');
  const grid = read('js/cities/grid/index.js');
  const hongkong = read('js/cities/hongkong/index.js');
  assert.match(html, /id="i-drone"/);
  assert.match(html, /title="Camera Drone \[4\]"/);
  assert.doesNotMatch(html, /id="i-heli"|title="Helicopter/);
  assert.match(grid, /helicopter: 'Camera Drone'/);
  assert.match(hongkong, /helicopter: '航拍無人機'/);
});


test('drone geometry respects the researched propeller and airframe dimensions', async () => {
  const { DRONE_ROTOR_SITES, DRONE_ROTOR_RADIUS, DRONE_COLLISION_RADIUS, DRONE_PARTS, buildDroneBodyGeometry, buildDroneRotorGeometry } = await import('../js/actor-models.js');
  assert.equal(DRONE_ROTOR_SITES.length, 4);
  assert.ok(Math.abs(Math.hypot(DRONE_ROTOR_SITES[0][0] * 2, DRONE_ROTOR_SITES[0][2] * 2) - 0.3801) < .005);
  assert.equal(DRONE_ROTOR_RADIUS * 2, .239);
  assert.ok(Math.hypot(DRONE_ROTOR_SITES[0][0], DRONE_ROTOR_SITES[0][2]) + DRONE_ROTOR_RADIUS < DRONE_COLLISION_RADIUS);
  const body = buildDroneBodyGeometry(), rotor = buildDroneRotorGeometry();
  body.computeBoundingBox(); rotor.computeBoundingBox();
  assert.ok(body.boundingBox.max.x - body.boundingBox.min.x < .30);
  assert.ok(body.boundingBox.max.z - body.boundingBox.min.z < .35);
  assert.ok(body.boundingBox.max.y - body.boundingBox.min.y < .11);
  assert.ok(Math.abs(rotor.boundingBox.max.x - rotor.boundingBox.min.x - .239) < .001);
  const ids = new Set(body.getAttribute('partId').array);
  for (const id of [DRONE_PARTS.BODY, DRONE_PARTS.ARM, DRONE_PARTS.MOTOR, DRONE_PARTS.CAMERA, DRONE_PARTS.LENS]) assert.ok(ids.has(id));
  assert.ok(new Set(rotor.getAttribute('partId').array).has(DRONE_PARTS.TIP));
});

test('created player drone has four animated rotors and a matching close follow camera', async () => {
  const THREE = await import('three/webgpu');
  const { ThirdPersonControllerManager } = await import('../js/controllers.js');
  const entity = ThirdPersonControllerManager.prototype.createDroneEntity.call({ scene: new THREE.Scene() });
  assert.equal(entity.rotorPivots.length, 4);
  assert.equal(entity.collisionRadius, .32);
  assert.equal(entity.chaseDistance, 1.7);
  const box = new THREE.Box3().setFromObject(entity.mesh);
  const size = box.getSize(new THREE.Vector3());
  assert.ok(size.x < .54 && size.z < .56 && size.y < .14);
  for (const rotor of entity.rotorPivots) {
    assert.ok(Math.abs(rotor.userData.spinDirection) === 1);
    assert.ok(rotor.getObjectByName('DroneRotorBlurDisc'));
  }
});
