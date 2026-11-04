const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('Building Inventory and isolated single-building previews are completely removed', () => {
  for (const file of ['js/building-inventory.js', 'js/cities/hongkong/building-inventory-data.js', 'tests/building-inventory.test.cjs']) {
    assert.equal(fs.existsSync(path.join(root, file)), false, `${file} stays removed`);
  }
  const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
  const hongKong = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
  for (const source of [app, hongKong, css]) {
    assert.doesNotMatch(source, /BuildingInventory|buildingInventory|building-inventory|building-preview-open/);
  }
  assert.doesNotMatch(app, /case 'KeyI'|btn-building-inventory|inspectingBuilding/);
  const runtime = fs.readFileSync(path.join(root, 'js/app.runtime.js'), 'utf8');
  assert.doesNotMatch(runtime, /BuildingInventory|buildingInventory|building-inventory|building-preview-open|btn-building-inventory|inspectingBuilding/);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'js/app.runtime.manifest.json'), 'utf8'));
  assert.equal(manifest.inputs.some((file) => file.includes('building-inventory')), false);
  const inventory = fs.readFileSync(path.join(root, 'docs/hongkong-building-inventory.md'), 'utf8');
  assert.match(inventory, /本文件只是施工進度表/);
  assert.match(inventory, /不再提供 \*\*I\*\* 鍵、toolbar 入口或單幢預覽按鈕/);
  const summary = inventory.match(/目前已實際加入 \*\*(\d+) 幢\*\*；其餘 \*\*(\d+) 幢\*\*/);
  assert.ok(summary); assert.equal(Number(summary[1]) + Number(summary[2]), 100);
  assert.match(inventory, new RegExp(`\\| 已加入場景的建築物 \\| ${summary[1]} \\|`));
});

test('vehicle, player, camera and city updates run unconditionally every animation frame', () => {
  const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
  assert.doesNotMatch(app, /isPreviewOpen|inspectingBuilding|buildingInventory/);
  assert.match(app, /gamepadControls\.update\(dt\);\s*controllerManager\.update\(dt, elapsed\);\s*cameraSystem\.update\(dt, elapsed\);\s*world\.update\?\.\(dt, elapsed, \{ cameraSystem, controllerManager \}\);/);
  assert.match(app, /lightingSystem\.update\(cameraSystem\.currentPos\)/);
  assert.match(app, /if \(warmedUp && updateCulling\) updateCulling\(cameraSystem\.camera\.position\)/);
});
