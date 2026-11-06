const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('the player aircraft is rebuilt as a four-rotor camera drone, not a relabelled helicopter', () => {
  const actor = read('js/actor-models.js');
  const controller = read('js/controllers.js');
  for (const site of ['[-1.95, 1.55, -1.95]', '[1.95, 1.55, -1.95]', '[-1.95, 1.55, 1.95]', '[1.95, 1.55, 1.95]']) {
    assert.ok(actor.includes(`Object.freeze(${site})`), `quadcopter motor site ${site}`);
  }
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
  assert.match(controller, /collisionRadius: 4\.3/);
  assert.match(controller, /h\.collisionRadius \?\? 4\.3/);
  assert.match(app, /helicopter: 288 \}/, '80 m/s is displayed as 288 km/h');
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
