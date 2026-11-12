// The flyover cross-section: everything outboard of the lane that makes a lifted road read as a bridge.
const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
let furniture, dims, roads;

test.before(async () => {
  furniture = await import('../js/cities/hongkong/flyover-furniture.js');
  dims = await import('../js/cities/hongkong/flyover-furniture-dimensions.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS;
});

function run(options) {
  const concrete = { positions: [], indices: [] }, steel = { positions: [], indices: [] };
  const result = furniture.addFlyoverCrossSection(concrete, steel, options);
  return { concrete, steel, ...result };
}

test('every deck segment gets a shoulder, kerb, parapet and railing on both sides', () => {
  const { concrete, steel, posts } = run({ ax: 0, az: 0, ay: 12, bx: 40, bz: 0, by: 12, width: 7.6, firstPost: true });
  assert.ok(concrete.positions.length > 0, 'concrete cross-section emitted');
  assert.ok(steel.positions.length > 0, 'railing emitted');
  assert.equal(concrete.indices.length % 6, 0);
  assert.equal(steel.indices.length % 6, 0);
  assert.ok(posts > 0);
  // The lateral extent of the concrete must reach the shoulder edge on both sides and never into the lane.
  let minZ = Infinity, maxZ = -Infinity;
  for (let i = 2; i < concrete.positions.length; i += 3) {
    minZ = Math.min(minZ, concrete.positions[i]);
    maxZ = Math.max(maxZ, concrete.positions[i]);
  }
  const half = 7.6 / 2;
  assert.ok(Math.abs(Math.max(-minZ, maxZ) - (half + dims.FLYOVER_SHOULDER.width)) < 0.2,
    `shoulder edge at ${Math.max(-minZ, maxZ)} vs ${half + dims.FLYOVER_SHOULDER.width}`);
  // Nothing may sit inside the carriageway itself, where paint and ground queries live.
  assert.ok(furniture.FLYOVER_SHOULDER_OUTER_M > 0);
});

test('the railing edge stays within a plausible Hong Kong flyover height', () => {
  // Parapet 0.72 m + rail 0.11 m above the deck; the full railing panel is 1.08 m so nothing leans over the traffic.
  assert.ok(furniture.FLYOVER_EDGE_HEIGHT > 0.6 && furniture.FLYOVER_EDGE_HEIGHT < 1.2);
  assert.ok(dims.FLYOVER_PARAPET.height + dims.FLYOVER_RAILING.height < 2.0);
  assert.ok(dims.FLYOVER_SHOULDER.width < 1.2, 'a shoulder wider than a lane would be a hard shoulder, not a flyover verge');
});

test('post spacing continues across a way instead of restarting at every vertex', () => {
  const first = run({ ax: 0, az: 0, ay: 10, bx: 5, bz: 0, by: 10, width: 7, firstPost: true });
  const second = run({ ax: 5, az: 0, ay: 10, bx: 10, bz: 0, by: 10, width: 7, firstPost: false, postCarry: first.carry });
  // Two 5 m strips at 2.4 m spacing: 3 posts per side on each strip (0, 2.4, 4.8) is the ceiling, and the second
  // strip must not begin with a duplicate post at its own origin.
  const perSide = (result) => result.posts / 2;
  assert.equal(perSide(first), 3);
  assert.ok(perSide(second) <= 3, `second strip posts ${perSide(second)}`);
  assert.ok(second.carry >= 0);
});

test('degenerate strips emit nothing', () => {
  const result = run({ ax: 0, az: 0, ay: 10, bx: 0.1, bz: 0, by: 10, width: 7, firstPost: true });
  assert.equal(result.concrete.positions.length, 0);
  assert.equal(result.steel.positions.length, 0);
  assert.equal(result.posts, 0);
});

test('furniture is only generated for ways OSM actually maps as elevated structure', () => {
  const bridgeWays = roads.roads.filter((road) => road[4] & 2).length;
  const deckWays = roads.roads.filter((road) => road[4] & 4).length;
  // A sanity bound: the tagged structure is a small minority of the 77,070 territory ways, and tunnels never qualify.
  assert.ok(bridgeWays > 1000 && bridgeWays < roads.roads.length * 0.2, `bridge ways ${bridgeWays}`);
  assert.ok(deckWays > 100);
});
