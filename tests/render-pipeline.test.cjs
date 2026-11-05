const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const root = join(__dirname, '..');
const app = readFileSync(join(root, 'js/app.js'), 'utf8');

test('temporal reconstruction replaces multisampled scene MRT rendering', () => {
  assert.match(app, /scenePass\.options\.samples = 0;/);
  assert.match(app, /import \{ traa \} from 'three\/addons\/tsl\/display\/TRAANode\.js';/);
  assert.match(app, /\bvelocity\b/);
  assert.match(app, /metalRough: vec2\([^\n]+\),\n\s+velocity\n/);
  assert.match(app, /traa\(scenePassColor, scenePassDepth, scenePass\.getTextureNode\('velocity'\), cameraSystem\.camera\)/);
});

test('TRAA stays scene-linear and restores facade contrast without the rejected FXAA path', () => {
  assert.match(app, /const aaSharpness = uniform\(0\.2\);/);
  assert.match(app, /const sharpenedScene = temporalScene\.mul\(aaSharpness\.mul\(4\)\.add\(1\)\)\.sub\(aaNeighbours\.mul\(aaSharpness\)\);/);
  assert.match(app, /createPostProcessing\(renderer, sharpenedScene, reflections\)/);
  assert.match(app, /new THREE\.RenderPipeline\(renderer, colorGrade\.outputNode\)/);
  assert.doesNotMatch(app, /outputColorTransform\s*=\s*false/);
  assert.doesNotMatch(app, /\bfxaa\b|\bsmaa\b|displayFXAA/i);
  const traaSource = readFileSync(join(root, 'vendor/three/examples/jsm/tsl/display/TRAANode.js'), 'utf8');
  const taaUtils = readFileSync(join(root, 'vendor/three/examples/jsm/tsl/utils/TAAUtils.js'), 'utf8');
  assert.match(traaSource, /MSAA must be disabled when TRAA is in use/);
  assert.match(traaSource, /from '\.\.\/utils\/TAAUtils\.js'/);
  for (const name of ['clipAABB', 'flickerReduction', 'sampleCurrentDepth', 'samplePreviousDepth']) {
    assert.match(taaUtils, new RegExp(`export const ${name} =`));
  }
  assert.match(taaUtils, /export function computeHaltonOffsets\(/);
});

test('static meshes receive exact culling bounds without freezing moving hierarchies', () => {
  assert.match(app, /const dynamicRootSet = new Set\(dynamicRoots\.filter\(Boolean\)\);/);
  assert.match(app, /if \(!object\.isMesh \|\| belongsToDynamicRoot\(object\)\) return;/);
  assert.match(app, /object\.computeBoundingBox\(\);\n\s+object\.computeBoundingSphere\(\);/);
  assert.match(app, /object\.geometry\.computeBoundingBox\(\);\n\s+object\.geometry\.computeBoundingSphere\(\);/);
  assert.match(app, /object\.frustumCulled = true;/);
});
