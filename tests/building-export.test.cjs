const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
class Canvas {
  getContext() { const gradient = { addColorStop() {} }; return new Proxy({measureText: () => ({width: 100}), createLinearGradient: () => gradient, createRadialGradient: () => gradient}, {get: (o,k) => o[k] || (() => {}), set: (o,k,v) => (o[k] = v, true)}); }
  toDataURL() { return 'data:image/png;base64,iVBORw0KGgo='; }
}
global.HTMLCanvasElement = Canvas;
global.Path2D = class {};
global.document = {createElement: () => new Canvas(), createElementNS: () => ({addEventListener(){},removeEventListener(){},set src(v){}})};

test('catalogue is searchable, unique, and selects only registered models', async () => {
  const {EXPORT_BUILDINGS, getExportBuilding} = await import('../js/exports/building-catalog.js');
  assert.ok(EXPORT_BUILDINGS.length > 50);
  assert.equal(new Set(EXPORT_BUILDINGS.map(x => x.id)).size, EXPORT_BUILDINGS.length);
  for (const item of EXPORT_BUILDINGS) {
    assert.ok(item.name && /^[a-z0-9-]+$/.test(item.id));
    assert.equal(getExportBuilding(item.id), item);
    if (!item.isolated) assert.equal(typeof item.load, 'function');
  }
  assert.equal(getExportBuilding('../../app'), null);
  const html = fs.readFileSync('index.html', 'utf8'), main = fs.readFileSync('js/main.js','utf8');
  for (const id of ['model-search','model-select','export-building','export-building-tsl','model-export-status']) assert.ok(html.includes(`id="${id}"`));
  assert.match(main, /EXPORT_BUILDINGS\.filter/);
  assert.match(main, /await createBuildingExport\(selected.id, \{ tsl \}\)/);
  assert.match(main, /URL\.revokeObjectURL/);
});

test('selected authored buildings round trip without starting the city and keep distinct model geometry', async () => {
  const THREE = await import('three/webgpu');
  const { createBuildingExport } = await import('../js/exports/building-export.js');
  for (const id of ['wanchai-tower', 'revenue-tower', 'immigration-tower', 'standard-chartered', 'times-square', 'salisbury-ymca']) {
    const data = await createBuildingExport(id);
    assert.ok(data.geometries.length > 0, id);
    assert.ok(data.materials.every(m => !m.type.includes('NodeMaterial')), id);
    const loaded = new THREE.ObjectLoader().parse(data);
    let meshCount = 0;
    loaded.traverse(object => { if (object.isMesh) { meshCount++; assert.ok(object.material && object.geometry, id); } });
    assert.ok(meshCount > 1, id);
  }
  await assert.rejects(createBuildingExport('unknown'), /未支援/);
});

test('TSL export preserves nodes and restores the shared night uniform', async () => {
  const { createBuildingExport } = await import('../js/exports/building-export.js');
  const { cityUniforms } = await import('../js/tsl-materials.js');
  const previous = cityUniforms.uInteriorGlow.value;
  const json = await createBuildingExport('immigration-tower', {tsl: true});
  assert.ok(json.nodes.some(node => node.type === 'UniformNode' && node.value === 1.4));
  assert.ok(json.materials.some(material => material.type === 'MeshStandardNodeMaterial' && material.inputNodes?.emissiveNode));
  assert.equal(cityUniforms.uInteriorGlow.value, previous);
});

test('exported Revenue Tower preserves game geometry and only moves the enclosing group', async () => {
  const THREE = await import('three/webgpu');
  const { buildRevenueTower } = await import('../js/cities/hongkong/revenue-tower-world.js');
  const { createBuildingExport } = await import('../js/exports/building-export.js');
  const source = buildRevenueTower(new THREE.Scene()).group;
  const result = new THREE.ObjectLoader().parse(await createBuildingExport('revenue-tower'));
  assert.equal(result.children.length, 1);
  const copy = result.children[0];
  assert.equal(copy.name, source.name);
  assert.deepEqual(copy.position.toArray(), source.position.toArray());
  assert.equal(copy.children.length, source.children.length);
  for (let i = 0; i < copy.children.length; i++) {
    assert.equal(copy.children[i].name, source.children[i].name);
    assert.deepEqual(copy.children[i].geometry.attributes.position.array, source.children[i].geometry.attributes.position.array);
  }
});

test('Sheraton TSL export includes actual facade, room and lamp nodes', async () => {
  const { createBuildingExport } = await import('../js/exports/building-export.js');
  const json = await createBuildingExport('sheraton-hotel', {tsl: true});
  const materials = new Map(json.materials.map(m => [m.uuid, m]));
  const objects = [];
  const visit = obj => { objects.push(obj); for (const c of obj.children || []) visit(c); };
  visit(json.object);
  for (const name of ['Sheraton individual dark guestroom glazing panels', 'Warm Sheraton canopy downlights', 'Sheraton warm vertical podium lights', 'Rear wing individual guestroom glazing', 'Level 18 outdoor temperature-controlled pool', 'Sheraton circular S emblem']) {
    const object = objects.find(o => o.name === name);
    assert.ok(object, name);
    const material = materials.get(object.material);
    assert.equal(material.type, 'MeshStandardNodeMaterial', name);
    assert.ok(material.inputNodes?.emissiveNode, name);
  }
  const windows = objects.find(o => o.name === 'Sheraton individual dark guestroom glazing panels');
  assert.ok(materials.get(windows.material).inputNodes.colorNode);
  assert.ok(json.nodes.some(n => n.type === 'AttributeNode' && n._attributeName === 'aLit'));
  assert.ok(json.nodes.some(n => n.type === 'UniformNode' && n.value === 1.4));
});


test('Salisbury export serializes real node materials for illuminated windows and signage', async () => {
  const { createBuildingExport } = await import('../js/exports/building-export.js');
  const json = await createBuildingExport('salisbury-ymca', {tsl: true});
  const materials = new Map(json.materials.map(m => [m.uuid, m]));
  const objects = []; const visit = o => {objects.push(o); for (const child of o.children || []) visit(child);}; visit(json.object);
  for (const name of ['Tower 1 individual square and curved-corner windows', 'Warm Salisbury entrance downlights', 'Red YMCA emblem and The Salisbury identity on the dark podium']) {
    const object = objects.find(o => o.name === name); assert.ok(object, name);
    const mat = materials.get(object.material); assert.equal(mat.type, 'MeshStandardNodeMaterial', name);
    assert.ok(mat.inputNodes?.emissiveNode, name);
  }
  assert.ok(json.nodes.some(n => n.type === 'UniformNode' && n.value === 1.4));
  assert.ok(json.geometries.some(g => g.data?.attributes?.aLit?.array?.some(v => v > 0)));
});

test('Peninsula night fountain and facade lighting serialize as node materials', async () => {
  const { createBuildingExport } = await import('../js/exports/building-export.js');
  const json = await createBuildingExport('peninsula-hotel', {tsl: true});
  const mats = new Map(json.materials.map(m => [m.uuid, m]));
  const objects = []; const visit = o => { objects.push(o); for (const c of o.children || []) visit(c); }; visit(json.object);
  for (const name of ['Rounded ground-floor arcade and portico openings', 'Warm illuminated courtyard cornice trim', 'Twelve arcing fountain jets and central water column', 'Restrained warm facade uplight fixtures']) {
    const object = objects.find(o => o.name === name); assert.ok(object, name);
    const material = mats.get(object.material); assert.equal(material.type, 'MeshStandardNodeMaterial', name);
    assert.ok(material.inputNodes?.emissiveNode, name);
  }
});
