const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const inventoryPath = path.join(root, 'js/cities/hongkong/building-inventory-data.js');
const dataUrl = require('node:url').pathToFileURL(inventoryPath).href;

function docRows() {
  const markdown = fs.readFileSync(path.join(root, 'docs/hongkong-building-inventory.md'), 'utf8');
  return markdown.split(/\r?\n/).filter((line) => line.startsWith('| `HK-B')).map((line) =>
    line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim())
  );
}

test('runtime Building Inventory mirrors all 100 authoritative construction rows', async () => {
  const { HONG_KONG_BUILDING_INVENTORY: entries } = await import(dataUrl);
  const rows = docRows();
  assert.equal(rows.length, 100);
  assert.equal(entries.length, 100);
  entries.forEach((entry, index) => {
    const row = rows[index];
    assert.equal(entry.id, row[0].replace(/`/g, ''));
    assert.equal(entry.name, row[1]);
    assert.equal(entry.district, row[2]);
    assert.equal(entry.status, row[3] === '已加入' ? 'integrated' : 'pending');
    assert.equal(entry.refined, row[4] === '**是**');
    assert.equal(entry.heightLabel, row[6].replace(/[`*_]/g, ''));
  });
});

test('inventory has 30 real preview targets and 70 explicitly model-free pending rows', async () => {
  const { HONG_KONG_BUILDING_INVENTORY: entries } = await import(dataUrl);
  const integrated = entries.filter((entry) => entry.status === 'integrated');
  const pending = entries.filter((entry) => entry.status === 'pending');
  assert.equal(integrated.length, 30);
  assert.equal(pending.length, 70);
  assert.equal(new Set(entries.map((entry) => entry.id)).size, 100);
  assert.equal(new Set(integrated.map((entry) => entry.worldKey)).size, 30);
  entries.forEach((entry, index) => {
    assert.equal(entry.id, `HK-B${String(index + 1).padStart(4, '0')}`);
    if (entry.status === 'pending') assert.equal(entry.worldKey, null);
    else assert.match(entry.worldKey, /^[A-Za-z][A-Za-z0-9]*$/);
  });
});

test('Hong Kong exposes the runtime catalogue and every integrated world key', async () => {
  const { HONG_KONG_BUILDING_INVENTORY: entries } = await import(dataUrl);
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  assert.match(source, /import \{ HONG_KONG_BUILDING_INVENTORY \} from '\.\/building-inventory-data\.js'/);
  assert.match(source, /buildingInventory: HONG_KONG_BUILDING_INVENTORY/);
  for (const entry of entries.filter((item) => item.status === 'integrated')) {
    assert.match(source, new RegExp(`${entry.worldKey}: world\\.${entry.worldKey}`), entry.id);
  }
});

test('single-building inspector clones real models and restores the existing renderer state', () => {
  const source = fs.readFileSync(path.join(root, 'js/building-inventory.js'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
  assert.match(source, /worldObject\.group\.clone\(true\)/);
  assert.match(source, /visibility: this\.scene\.children\.map/);
  assert.match(source, /inspectionLights = new Set\(\[this\.lightingSystem\.sunLight, this\.lightingSystem\.hemiLight\]\)/);
  assert.match(source, /child\.visible = inspectionLights\.has\(child\)/);
  assert.match(source, /for \(const \[child, visible\] of saved\.visibility\) child\.visible = visible/);
  assert.match(source, /lightingSystem\.applyPreset\(saved\.preset, true\)/);
  assert.match(source, /camera\.quaternion\.copy\(saved\.cameraQuaternion\)/);
  assert.match(source, /entry\?\.status === 'integrated'/);
  assert.doesNotMatch(source, /new THREE\.WebGPURenderer/);
  assert.match(app, /if \(inspectingBuilding\) \{\s*buildingInventory\.update/);
  assert.match(app, /updateCulling && !inspectingBuilding/);
});
