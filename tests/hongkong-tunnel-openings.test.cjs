const assert = require('node:assert/strict');
const test = require('node:test');

let openings;
let crossings;

test.before(async () => {
  openings = await import('../js/cities/hongkong/tunnel-openings.js');
  crossings = await import('../js/cities/hongkong/crossings.js');
});

test('shallow tunnel portals have ground openings while deep tubes and bridges do not', () => {
  const rects = openings.buildTunnelOpeningRects();
  assert.ok(rects.length > 0);
  const waterRects = openings.buildTunnelOpeningRects(undefined, -2.26);
  assert.ok(waterRects.length > 0, 'water openings continue below the fixed waterline');
  const tunnelRoutes = new Set([
    'cross-harbour:0', 'cross-harbour:1', 'eastern-harbour:0',
    'eastern-harbour:1', 'western-harbour:0', 'western-harbour:1'
  ]);
  assert.deepEqual(new Set(rects.map((rect) => rect.routeId)), tunnelRoutes);
  assert.deepEqual(new Set(waterRects.map((rect) => rect.routeId)), tunnelRoutes);
  const deep = {
    id: 'deep', kind: 'tunnel', points: [
      { x: 0, z: 0, y: -22, width: 8 },
      { x: 0, z: 20, y: -22, width: 8 }
    ]
  };
  const bridge = { ...deep, id: 'bridge', kind: 'bridge' };
  assert.deepEqual(openings.buildTunnelOpeningRects([deep, bridge]), []);
});

test('land portals are detected relative to the DTM rather than the old zero datum', async () => {
  const { hongKongTerrainHeight } = await import('../js/cities/hongkong/terrain.js');
  const surface = hongKongTerrainHeight(0, 0) - 0.08;
  const route = {
    id: 'dtm-portal', kind: 'tunnel', points: [
      { x: 0, z: 0, y: surface + 0.025, width: 8 },
      { x: 0, z: 20, y: surface - 4, width: 8 }
    ]
  };
  assert.equal(openings.buildTunnelOpeningRects([route]).length, 1);
});

test('subtracting a portal rectangle preserves exact triangle area outside the opening', () => {
  const triangle = [[-10, -10], [10, -10], [0, 10]];
  const rect = { cx: 0, cz: 0, ux: 1, uz: 0, hx: 2, hz: 2, minX: -2, maxX: 2, minZ: -2, maxZ: 2 };
  const pieces = openings.subtractTunnelOpenings(triangle, [rect]);
  const remaining = pieces.reduce((sum, piece) => sum + openings.polygonArea(piece), 0);
  assert.ok(Math.abs(remaining - 184) < 1e-8);
  assert.ok(pieces.length >= 3);
});

test('multiple openings neither overlap nor remove unrelated ground', () => {
  const triangle = [[-20, -20], [20, -20], [0, 20]];
  const makeRect = (cx) => ({ cx, cz: 0, ux: 1, uz: 0, hx: 2, hz: 2, minX: cx - 2, maxX: cx + 2, minZ: -2, maxZ: 2 });
  const original = openings.polygonArea(triangle);
  const pieces = openings.subtractTunnelOpenings(triangle, [makeRect(-4), makeRect(4)]);
  const remaining = pieces.reduce((sum, piece) => sum + openings.polygonArea(piece), 0);
  assert.ok(Math.abs(remaining - (original - 32)) < 1e-8);
  const untouched = openings.subtractTunnelOpenings(triangle, [{ ...makeRect(100), minX: 98, maxX: 102 }]);
  assert.equal(untouched.length, 1);
  assert.equal(openings.polygonArea(untouched[0]), original);
});
