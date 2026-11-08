const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');

test('isolated export bundles only model dependencies and round-trips through ObjectLoader', async () => {
  execFileSync(process.execPath, ['tools/exports/build-wanchai.mjs']);
  class Canvas { getContext() { return { fillText() {} }; } toDataURL() { return 'data:image/png;base64,iVBORw0KGgo='; } }
  global.HTMLCanvasElement = Canvas;
  global.document = {
    createElement: () => new Canvas(),
    createElementNS: () => ({ addEventListener() {}, removeEventListener() {}, set src(value) { this.url = value; } }),
  };
  const THREE = await import('three/webgpu');
  const { createWanchaiExport } = await import('../js/exports/wanchai-export.runtime.js');
  const data = createWanchaiExport();
  assert.equal(data.object.name, 'Wanchai Tower — 灣仔政府大樓');
  assert.ok(data.object.children.length >= 10);
  assert.ok(data.images[0].url.startsWith('data:image/png'));
  assert.ok(data.materials.every(m => m.type === 'MeshStandardMaterial'));
  assert.ok(data.materials.some(m => m.vertexColors));
  assert.ok(data.geometries.some(g => g.data?.attributes?.aLit));
  const restored = new THREE.ObjectLoader().parse(JSON.parse(JSON.stringify(data)));
  assert.equal(restored.children.length, data.object.children.length);
  assert.ok(restored.children.every(child => child.geometry && child.material));
  assert.ok(restored.children.some(child => child.material.map));
  assert.deepEqual(restored.position.toArray(), [0, 0, 0]);
  const src = readFileSync('js/main.js', 'utf8');
  assert.match(src, /import\('\.\/exports\/building-export\.js'\)/);
});

test('isolated model geometry and transforms match the game tower', async () => {
  const THREE = await import('three/webgpu');
  const { buildWanchaiTower } = await import('../js/cities/hongkong/wanchai-tower-world.js');
  const { createWanchaiExport } = await import('../js/exports/wanchai-export.runtime.js');
  const original = buildWanchaiTower(new THREE.Scene()).group;
  const exported = new THREE.ObjectLoader().parse(createWanchaiExport());
  assert.equal(exported.children.length, original.children.length);
  assert.ok(Math.abs(exported.quaternion.dot(original.quaternion)) > 1 - 1e-12);
  for (let i = 0; i < original.children.length; i++) {
    const a = original.children[i], b = exported.children[i];
    assert.equal(b.name, a.name);
    assert.deepEqual(b.position.toArray(), a.position.toArray());
    for (const name of Object.keys(a.geometry.attributes)) {
      assert.deepEqual(b.geometry.getAttribute(name).array, a.geometry.getAttribute(name).array, `${a.name}: ${name}`);
    }
    assert.deepEqual(b.geometry.index?.array, a.geometry.index?.array, `${a.name}: index`);
  }
});

test('experimental TSL JSON contains the node graph and a fixed night uniform', async () => {
  const THREE = await import('three/webgpu');
  const TSL = await import('three/tsl');
  const { createWanchaiTslExport, createWanchaiExport } = await import('../js/exports/wanchai-export.runtime.js');
  const json = JSON.parse(JSON.stringify(createWanchaiTslExport()));
  assert.ok(json.materials.some(m => m.type === 'MeshStandardNodeMaterial' && m.inputNodes?.emissiveNode));
  assert.ok(json.nodes.some(n => n.type === 'AttributeNode' && n._attributeName === 'aLit'));
  assert.ok(json.nodes.some(n => n.type === 'UniformNode' && n.value === 1.4));
  assert.ok(json.images[0].url.startsWith('data:image/png'));
  // 187dev NodeObjectLoader assigns to the read-only Node.uuid. Wrap node types solely
  // for this structural round-trip; this is not a test of the unmodified Editor.
  const types = { ...THREE, ...TSL }, patchedNodes = {};
  for (const { type } of json.nodes) {
    assert.equal(typeof types[type], 'function', `missing node class ${type}`);
    const Base = types[type];
    patchedNodes[type] = class extends Base {
      constructor() {
        super();
        Object.defineProperty(this, 'uuid', { value: this.uuid, writable: true, configurable: true });
      }
    };
  }
  const restored = new THREE.NodeObjectLoader().setNodes(patchedNodes).setNodeMaterials(THREE).parse(json);
  const windows = restored.getObjectByName('Wanchai Tower ribbon windows and upper curtain wall');
  const lamps = restored.getObjectByName('Wanchai Tower entrance night lights');
  assert.equal(windows.material.type, 'MeshStandardNodeMaterial');
  assert.equal(windows.material.colorNode.type, 'AttributeNode');
  assert.equal(windows.material.emissiveNode.type, 'OperatorNode');
  assert.equal(lamps.material.emissiveNode.type, 'OperatorNode');
  assert.ok(restored.children.some(child => child.material.map));
  assert.equal(restored.children.length, createWanchaiExport().object.children.length);
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /id="export-building-tsl"/);
  assert.match(html, /Editor r187 普通匯入器/);
});
