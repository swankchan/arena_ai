const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'tools/data/hongkong');
let inventory;
let runtime;
let crossings;
let generator;

test.before(async () => {
  inventory = JSON.parse(fs.readFileSync(path.join(dataDir, 'viaduct-inventory.json'), 'utf8'));
  runtime = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS;
  crossings = await import('../js/cities/hongkong/crossings.js');
  generator = await import('../tools/cities/hongkong/build-viaduct-inventory.mjs');
});

test('viaduct inventory covers every elevated driving record exactly once with stable geometry IDs', () => {
  const expected = runtime.roads.map((road, index) => ({ road, index })).filter(({ road }) => road[4] & 2);
  assert.equal(inventory.ways.length, expected.length);
  assert.equal(inventory.ways.length, 5724);
  assert.equal(new Set(inventory.ways.map((way) => way.id)).size, inventory.ways.length);
  assert.equal(new Set(inventory.ways.map((way) => way.sourceRecordIndex)).size, inventory.ways.length);
  const groupIds = new Set(inventory.groups.map((group) => group.id));
  for (const way of inventory.ways) {
    assert.match(way.id, /^HKW-[0-9A-F]{12}$/);
    assert.match(way.groupId, /^HK[VX]-/);
    assert.ok(groupIds.has(way.groupId));
    assert.deepEqual(way.flat, runtime.roads[way.sourceRecordIndex][5]);
    assert.ok(way.flags & 2);
    assert.ok(way.lengthM >= 0);
    if (way.lengthM === 0 && way.classification !== 'existing-crossing' && way.classification !== 'excluded-tunnel') {
      assert.equal(way.classification, 'review-degenerate-geometry');
      assert.equal(way.disposition, 'manual-review-required');
    }
    assert.ok(Number.isFinite(way.center.lon) && Number.isFinite(way.center.lat));
  }
});

test('classification never guesses unresolved tags and keeps tunnels and special crossings separate', () => {
  for (const way of inventory.ways) {
    if (way.classification === 'confirmed-viaduct') {
      assert.equal(way.tagMatch, 'exact-road-signature');
      assert.equal(way.bridge, 'viaduct');
      assert.ok(way.osmWayId && way.highway);
      assert.equal(way.disposition, 'generic-geometry-candidate');
    } else if (way.classification === 'confirmed-bridge') {
      assert.equal(way.tagMatch, 'exact-road-signature');
      assert.ok(way.bridge === 'yes' || way.tags.man_made === 'bridge');
      assert.equal(way.disposition, 'generic-geometry-candidate');
    } else if (way.classification === 'review-layer-only') {
      assert.equal(way.tagMatch, 'exact-road-signature');
      assert.ok(way.layer > 0);
      assert.equal(way.disposition, 'manual-review-required');
    } else if (way.classification === 'review-special-bridge') {
      assert.ok(!['yes', 'viaduct', 'no', null].includes(way.bridge));
      assert.equal(way.disposition, 'manual-review-required');
    } else if (way.classification === 'review-tag-unavailable') {
      assert.equal(way.tagMatch, 'unavailable-in-checked-in-caches');
      assert.equal(way.osmWayId, null);
      assert.equal(way.tags, null);
      assert.equal(way.disposition, 'manual-review-required');
    } else if (way.classification === 'excluded-tunnel') {
      assert.ok((way.flags & 4) || way.tags?.tunnel);
      assert.equal(way.disposition, 'exclude-from-viaducts');
    } else if (way.classification === 'review-degenerate-geometry') {
      assert.equal(way.lengthM, 0);
      assert.equal(way.disposition, 'manual-review-required');
    }
    if (way.classification === 'existing-crossing') {
      assert.ok(way.crossingId);
      assert.equal(way.disposition, 'existing-special-model');
      assert.equal(way.heightStatus, 'procedural-not-surveyed');
    } else {
      assert.equal(way.heightStatus, 'unverified-no-elevation-data');
    }
  }
  const expectedExisting = new Set();
  const expectedCrossings = new Set();
  for (const route of crossings.CROSSING_ROUTES) {
    for (const index of route.wayIds) {
      if (!(runtime.roads[index][4] & 2)) continue;
      expectedExisting.add(index);
      expectedCrossings.add(route.crossingId);
    }
  }
  const existingWays = inventory.ways.filter((way) => way.classification === 'existing-crossing');
  assert.deepEqual(new Set(existingWays.map((way) => way.sourceRecordIndex)), expectedExisting);
  assert.deepEqual(new Set(inventory.groups.filter((group) => group.classification === 'existing-crossing').map((group) => group.crossingId)), expectedCrossings);
});

test('group membership, summaries and the exact cache-signature audit are internally consistent', () => {
  const audit = inventory.summary.sourceAudit;
  assert.equal(audit.runtimeRoadRecords, runtime.roads.length);
  assert.equal(audit.cacheDrivableWays, 17732);
  assert.equal(audit.matchedRuntimeRecords, 17732);
  assert.equal(audit.ambiguousRuntimeRecords, 0);
  assert.equal(audit.unmatchedCacheWays, 0);
  assert.equal(audit.elevatedTaggedRecords + audit.elevatedTagUnavailableRecords, inventory.ways.length);
  const wayById = new Map(inventory.ways.map((way) => [way.id, way]));
  const assigned = new Set();
  for (const group of inventory.groups) {
    assert.equal(group.wayIds.length, group.wayCount);
    assert.equal(group.tagCoverage.totalWayCount, group.wayCount);
    let length = 0;
    for (const id of group.wayIds) {
      const way = wayById.get(id);
      assert.ok(way, `${id} belongs to an existing group`);
      assert.equal(way.groupId, group.id);
      assert.equal(way.classification, group.classification);
      assert.ok(!assigned.has(id), `${id} is assigned only once`);
      assigned.add(id);
      length += way.lengthM;
    }
    assert.ok(Math.abs(length - group.carriagewayLengthM) < 0.01);
  }
  assert.equal(assigned.size, inventory.ways.length);
  assert.equal(Object.values(inventory.summary.byClass).reduce((sum, item) => sum + item.wayCount, 0), inventory.ways.length);
  assert.equal(Object.values(inventory.summary.byClass).reduce((sum, item) => sum + item.groupCount, 0), inventory.groups.length);
});

test('CSV, documentation and the standalone map preserve the complete review dataset and warnings', () => {
  const groupCsv = fs.readFileSync(path.join(dataDir, 'viaduct-groups.csv'), 'utf8');
  const wayCsv = fs.readFileSync(path.join(dataDir, 'viaduct-ways.csv'), 'utf8');
  assert.equal(groupCsv.charCodeAt(0), 0xfeff);
  assert.equal(wayCsv.charCodeAt(0), 0xfeff);
  assert.equal(groupCsv.trim().split('\n').length, inventory.groups.length + 1);
  assert.equal(wayCsv.trim().split('\n').length, inventory.ways.length + 1);
  const doc = fs.readFileSync(path.join(root, 'docs/hongkong-viaduct-inventory.md'), 'utf8');
  assert.match(doc, /OSM `layer` 只表示上下次序，不是米/);
  assert.match(doc, /不得因為等待橋樑分類而開放給建築物覆蓋/);
  assert.match(doc, /待來源補全/);
  const map = fs.readFileSync(path.join(dataDir, 'viaduct-inventory-map.html'), 'utf8');
  assert.doesNotMatch(map, /__VIADUCT_MAP_DATA__/);
  assert.doesNotMatch(map, /<script\s+src=/);
  assert.doesNotMatch(map, /<link\s+[^>]*href=/);
  const embedded = map.match(/const DATA = (.*);\n    const inventory =/);
  assert.ok(embedded, 'map embeds its data without network requests');
  const data = JSON.parse(embedded[1]);
  assert.equal(data.inventory.ways.length, inventory.ways.length);
  assert.ok(data.land.length > 100 && data.places.length > 5);
});

test('inventory generation is deterministic and byte-for-byte reproducible', async () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'hk-viaduct-inventory-'));
  try {
    const docFile = path.join(temporary, 'inventory.md');
    await generator.buildHongKongViaductInventory({ dataDir, outDir: temporary, docFile });
    for (const filename of ['viaduct-inventory.json', 'viaduct-groups.csv', 'viaduct-ways.csv', 'viaduct-inventory-map.html']) {
      assert.ok(fs.readFileSync(path.join(temporary, filename)).equals(fs.readFileSync(path.join(dataDir, filename))), filename);
    }
    assert.ok(fs.readFileSync(docFile).equals(fs.readFileSync(path.join(root, 'docs/hongkong-viaduct-inventory.md'))));
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
