const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/terrain/manifest.json'), 'utf8'));
let terrain;
let elevation;
let fullMeta;
let fullRoads;

test.before(async () => {
  terrain = await import('../js/cities/hongkong/terrain.js');
  elevation = await import('../js/cities/hongkong/road-elevation.js');
  fullMeta = await import('../js/cities/hongkong/full-meta.js');
  fullRoads = await import('../js/hk-full-roads-data.js');
});

test('the local DTM retains its official provenance, accuracy limits and complete grid', () => {
  const { HK_TERRAIN, HONG_KONG_TERRAIN_META } = terrain;
  assert.match(HK_TERRAIN.source.officialDataset, /data\.gov\.hk/);
  assert.match(HK_TERRAIN.source.attribution, /Lands Department/);
  assert.match(HK_TERRAIN.source.accuracy, /non-ground elevated structures/);
  assert.equal(HK_TERRAIN.source.processedSnapshotSha256, manifest.processedSnapshotSha256);
  assert.equal(HONG_KONG_TERRAIN_META.grid.cell, 70);
  assert.equal(HONG_KONG_TERRAIN_META.grid.w, 961);
  assert.equal(HONG_KONG_TERRAIN_META.grid.h, 716);
  const bytes = Buffer.from(HK_TERRAIN.elevations, 'base64');
  assert.equal(bytes.length / 2, HK_TERRAIN.grid.w * HK_TERRAIN.grid.h);
  assert.ok(HK_TERRAIN.grid.maxElevation > 940);
  const bounds = fullRoads.HK_FULL_ROADS.bounds;
  assert.ok(HK_TERRAIN.grid.minX <= bounds.minX && HK_TERRAIN.grid.maxX >= bounds.maxX);
  assert.ok(HK_TERRAIN.grid.minZ <= bounds.minZ && HK_TERRAIN.grid.maxZ >= bounds.maxZ);
  assert.equal(terrain.rawHongKongTerrainHeight(0, -1500), 0, 'Victoria Harbour remains water, not an invented hill');
  assert.equal(fullMeta.isTerritoryLand(0, -1500), false);
});

test('Tai Mo Shan, Victoria Peak, Lantau Peak and Central align with the reprojected source checks', () => {
  const expectedRanges = new Map([
    ['大帽山 Tai Mo Shan', [900, 1000]],
    ['太平山 Victoria Peak', [500, 560]],
    ['鳳凰山 Lantau Peak', [850, 950]],
    ['中環 Central', [0, 100]]
  ]);
  for (const check of manifest.checks) {
    const actual = terrain.rawHongKongTerrainHeight(check.x, check.z);
    const [min, max] = expectedRanges.get(check.name);
    assert.ok(actual >= min && actual <= max, `${check.name} is ${actual.toFixed(2)} m`);
    assert.ok(Math.abs(actual - check.elevation) <= 0.26, `${check.name} survives 0.25 m quantisation`);
  }
});

test('runtime height queries reproduce the exact two triangles used by the terrain mesh', () => {
  const { HK_TERRAIN, rawHongKongTerrainHeight } = terrain;
  const grid = HK_TERRAIN.grid;
  const bytes = Buffer.from(HK_TERRAIN.elevations, 'base64');
  const at = (col, row) => bytes.readUInt16LE((row * grid.w + col) * 2) / grid.scale;
  const col = 431, row = 287;
  const a = at(col, row), b = at(col + 1, row), c = at(col, row + 1), d = at(col + 1, row + 1);
  for (const [tx, ty] of [[0.2, 0.3], [0.8, 0.7]]) {
    const x = grid.minX + (col + tx) * grid.cell;
    const z = grid.minZ + (row + ty) * grid.cell;
    const expected = tx + ty <= 1 ? a + tx * (b - a) + ty * (c - a)
      : d * (tx + ty - 1) + b * (1 - ty) + c * (1 - tx);
    assert.ok(Math.abs(rawHongKongTerrainHeight(x, z) - expected) < 1e-8);
  }
});

test('surface roads, road hits and mountain spawns share one elevation source', () => {
  assert.equal(elevation.surfaceRoadHeight(0, 0), terrain.hongKongTerrainHeight(0, 0) + 0.025);
  const spawn = fullMeta.spawnOnFullRoad(-3590.5, -14224.9, { minWidth: 0, radius: 300 });
  assert.ok(spawn, 'a drivable arrival exists on Tai Mo Shan');
  assert.ok(spawn.y > 900, `mountain arrival is ${spawn.y.toFixed(2)} m, not sea level`);
  const hit = fullMeta.fullRoadSurfaceAt(spawn.x, spawn.z, 0.35, spawn.y);
  assert.ok(hit);
  assert.ok(Math.abs(hit.height - spawn.y) < 0.001);
});

test('generated tunnel profiles retain vertex order and remain distinct from the DTM surface', () => {
  const { HK_FULL_ROADS } = fullRoads;
  let checked = 0, buried = 0;
  for (const [wayId, road] of HK_FULL_ROADS.roads.entries()) {
    if (!(road[4] & 4) || road[5].length < 4) continue;
    const flat = road[5];
    const start = elevation.roadHeightAtVertex(wayId, 0, flat[0], flat[1]);
    const end = elevation.roadHeightAtVertex(wayId, 1, flat[2], flat[3]);
    assert.equal(elevation.roadHeightAtSegment(wayId, 0, 0, flat[0], flat[1]), start);
    assert.equal(elevation.roadHeightAtSegment(wayId, 0, 1, flat[2], flat[3]), end);
    const x = (flat[0] + flat[2]) * 0.5, z = (flat[1] + flat[3]) * 0.5;
    const middle = elevation.roadHeightAtSegment(wayId, 0, 0.5, x, z);
    assert.ok(Number.isFinite(middle));
    if (Math.abs(middle - elevation.surfaceRoadHeight(x, z)) > 1) buried++;
    checked++;
    if (checked >= 80) break;
  }
  assert.ok(checked >= 80);
  assert.ok(buried > 0);
  assert.equal(elevation.TERRAIN_TUNNEL_OPENING_RECTS.length, terrain.HK_TERRAIN.stats.tunnelOpeningRects);
  assert.match(terrain.HK_TERRAIN.stats.tunnelProfile, /not surveyed engineering depth/);
});
