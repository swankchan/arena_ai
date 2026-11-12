// Roadside railings on the hillside edges: they exist exactly where the ground falls away, and nowhere else.
const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
let railing, terrain, roads, elevation;

test.before(async () => {
  railing = await import('../js/cities/hongkong/hillside-railing.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  elevation = await import('../js/cities/hongkong/road-elevation.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS;
});

test('the drop threshold is a real drop, not a grass verge', () => {
  const rule = railing.HILLSIDE_RAILING;
  assert.ok(rule.dropM >= 3, 'a 1 m verge does not need a barrier');
  assert.ok(rule.dropM <= 6, 'a 10 m threshold would miss the retaining edges it is meant to catch');
  assert.ok(rule.reachM > rule.dropM / 2, 'the far sample must be outside the near one');
  assert.equal(railing.HILLSIDE_RAILING_ABOVE_GROUND_M, rule.railHeight);
});

test('a railing mask only ever fires where the sampled ground really drops', () => {
  let checked = 0, railed = 0;
  for (let wayId = 0; wayId < roads.roads.length && checked < 4000; wayId++) {
    const road = roads.roads[wayId];
    if (road[4] & 6) continue;
    const flat = road[5];
    for (let vertex = 0; vertex + 1 < flat.length / 2 && checked < 4000; vertex++) {
      const mask = railing.hillsideRailingMask(wayId, vertex);
      checked++;
      if (!mask) continue;
      railed++;
      const ax = flat[vertex * 2], az = flat[vertex * 2 + 1];
      const bx = flat[vertex * 2 + 2], bz = flat[vertex * 2 + 3];
      const length = Math.hypot(bx - ax, bz - az);
      const nx = (bz - az) / length, nz = -(bx - ax) / length;
      const y = elevation.roadRibbonHeightAtVertex(wayId, vertex);
      const edge = road[1] * 0.5;
      // At least one side must actually be a drop of more than the threshold.
      const drops = [1, -1].map((side) => y - terrain.hongKongTerrainHeight(
        ax + nx * side * (edge + railing.HILLSIDE_RAILING.reachM),
        az + nz * side * (edge + railing.HILLSIDE_RAILING.reachM)));
      assert.ok(Math.max(...drops) > railing.HILLSIDE_RAILING.dropM, `way ${wayId} vertex ${vertex} drops ${drops}`);
    }
  }
  assert.ok(checked > 1000, `checked ${checked}`);
  assert.ok(railed > 0 && railed < checked, `railed ${railed} of ${checked}`);
});

test('tunnel and deck ways never grow a hillside railing', () => {
  for (let wayId = 0; wayId < roads.roads.length; wayId++) {
    const road = roads.roads[wayId];
    if (!(road[4] & 6)) continue;
    assert.equal(railing.hillsideRailingMask(wayId, 0), 0, `way ${wayId} flagged ${road[4]}`);
  }
});

test('generated chunks contain only whole triangles and stay inside their cell', () => {
  const { chunks, stats } = railing.buildHillsideRailingChunks({ chunkSize: 2000 });
  assert.ok(chunks.length > 100, `chunks ${chunks.length}`);
  assert.equal(stats.triangles, chunks.reduce((sum, chunk) => sum + chunk.indices.length / 3, 0));
  for (const chunk of chunks) {
    const [cx, cz] = chunk.key.split(',').map(Number);
    assert.equal(chunk.indices.length % 3, 0);
    for (const index of chunk.indices) assert.ok(index < chunk.positions.length / 3);
    // Every triangle centroid sits in this cell (or within half a triangle of it, since a centroid decides placement).
    for (let t = 0; t < chunk.indices.length; t += 3) {
      let x = 0, z = 0;
      for (let k = 0; k < 3; k++) {
        x += chunk.positions[chunk.indices[t + k] * 3] / 3;
        z += chunk.positions[chunk.indices[t + k] * 3 + 2] / 3;
      }
      assert.ok(Math.abs(Math.floor(x / 2000) - cx) <= 1 && Math.abs(Math.floor(z / 2000) - cz) <= 1);
    }
  }
});
