const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const app = readFileSync(join(__dirname, '../js/app.js'), 'utf8');
const post = readFileSync(join(__dirname, '../js/post-processing.js'), 'utf8');

test('scene MRT does not inherit default-framebuffer MSAA', () => {
  assert.match(app, /const scenePass = pass\(scene, cameraSystem\.camera\);[\s\S]*?scenePass\.options\.samples = 0;/);
});

test('FXAA runs after one display transform and disables the duplicate final transform', () => {
  assert.match(post, /rtt\(renderOutput\(outputNode\), null, null, \{ type: THREE\.UnsignedByteType \}\)/);
  assert.match(post, /outputNode: displayFXAA\(outputNode\)/);
  assert.match(post, /outputColorTransform: false/);
  assert.match(app, /renderPipeline\.outputColorTransform = colorGrade\.outputColorTransform;/);
});
