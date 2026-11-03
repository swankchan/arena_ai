const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
let network, manifest, motion, builder;
test.before(async () => {
  network = (await import('../js/hk-tram-network-data.js')).HK_TRAM_NETWORK;
  manifest = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/tram-network-manifest.json'), 'utf8'));
  motion = await import('../js/cities/hongkong/tram-motion.js');
  builder = await import('../tools/cities/hongkong/build-tram-network.mjs');
});

test('tramway covers both northern-shore directions, Happy Valley and North Point with official stop sequences', () => {
  assert.deepEqual(network.tracks.map((track) => track.id), [
    'hk-tram-east', 'hk-tram-hv', 'hk-tram-np', 'hk-tram-west',
    'hk-tram-x-wst', 'hk-tram-x-wmt', 'hk-tram-x-cbt'
  ]);
  assert.equal(network.stats.stopAssignments, 123);
  assert.equal(network.stats.uniqueStops, 116);
  const east = network.tracks[0], west = network.tracks[3];
  assert.equal(east.stops[0][2], 'Kennedy Town Terminus');
  assert.equal(east.stops.at(-1)[2], 'Shau Kei Wan Terminus');
  assert.equal(west.stops[0][2], 'Shau Kei Wan Terminus');
  assert.equal(west.stops.at(-1)[2], 'Kennedy Town Terminus');
  assert.equal(network.tracks[1].stops[0][2], 'Canal Road West');
  assert.equal(network.tracks[2].stops.at(-1)[2], 'North Point Road');
  assert.ok(network.tracks.slice(4).every((track) => track.derived === 'official-terminus-crossover' && track.length >= 30));
  assert.ok(network.stats.trackLengthM > 30000 && network.stats.trackLengthM < 32000);
});

test('track source is traceable and keeps OSM / official-stop attribution', () => {
  assert.equal(network.source.commit, '611065e10415be9d8cef66add1580ec99f5ee527');
  assert.match(network.source.trackGeometry, /OpenStreetMap contributors, ODbL 1\.0/);
  assert.match(network.source.stops, /DATA\.GOV\.HK/);
  assert.equal(network.source.alignmentSha256, 'ff877b3d0b546423b6233cd269cdb7ca69b4af2ea92e7afab5158df89649706a');
  assert.equal(manifest.source.sha256, 'b19ae219bbb02e7b84733054557e0223496ef0bd38affc0e04b0166cdbb7f328');
});

test('embedded railway uses 1,067 mm gauge and the overhead is a 550 V DC system', () => {
  assert.equal(network.gauge, 1.067);
  assert.equal(network.railHeadWidth, 0.064);
  assert.equal(network.voltageDC, 550);
  assert.equal(network.contactWireHeight, 6);
  assert.equal(network.poleHeight, 6.65);
  const runtime = fs.readFileSync(path.join(root, 'js/cities/hongkong/tram.js'), 'utf8');
  assert.match(runtime, /gauge \+ HK_TRAM_NETWORK\.railHeadWidth/);
  assert.match(runtime, /RAIL_TOP = 0\.026/);
  assert.match(runtime, /chunk\.parts\.paving/);
  assert.ok(network.stats.asphaltInfillPoints > 0);
  assert.ok(network.tracks.every((track) => track.paving.every((index) => index >= 0 && index < track.points.length / 3)));
  assert.match(runtime, /HongKongTramTrolleyPole/);
  assert.match(runtime, /HongKongTramInsulators/);
});

test('every generated track and overhead record is finite, ordered and inside its source path', () => {
  for (const track of network.tracks) {
    assert.ok(track.points.length >= 6 && track.points.length % 3 === 0);
    assert.ok(track.points.every(Number.isFinite));
    assert.equal(new Set(track.points.filter((_, index) => index % 3 === 1)).size > 8, true, `${track.id} follows road grades`);
    let previous = -1;
    for (const stop of track.stops) {
      assert.ok(stop[3] >= previous && stop[3] >= 0 && stop[3] <= track.length + 0.02);
      previous = stop[3];
    }
  }
  for (const span of network.spans) {
    assert.ok([...span.left, ...span.right].every(Number.isFinite));
    assert.ok(Math.hypot(span.left[0] - span.right[0], span.left[2] - span.right[2]) <= 32.001);
    for (const [trackIndex, s] of span.drops) {
      assert.ok(network.tracks[trackIndex]);
      assert.ok(s >= 0 && s <= network.tracks[trackIndex].length + 0.02);
    }
  }
});

test('continuous constrained rail profiles have no staircase jumps and connected termini meet', () => {
  assert.ok(network.stats.maxHeightStepM <= 0.37);
  assert.ok(network.stats.maxGrade <= 0.125);
  assert.equal(network.stats.junctionMaxHeightMismatchM, 0);
  const east = network.tracks[0], west = network.tracks[3];
  assert.deepEqual(east.points.slice(0, 3), west.points.slice(-3));
  assert.deepEqual(east.points.slice(-3), west.points.slice(0, 3));
  assert.ok(network.stats.roadFallbacks / network.stats.trackPointCount < 0.01);
});

test('chainage sampling interpolates road height and direction instead of using a fixed ground plane', () => {
  const path = motion.createTramPath(network.tracks[0]);
  const start = motion.sampleTramPath(path, 0), end = motion.sampleTramPath(path, path.length);
  assert.deepEqual([start.x, start.y, start.z], network.tracks[0].points.slice(0, 3));
  assert.deepEqual([end.x, end.y, end.z], network.tracks[0].points.slice(-3));
  const middle = motion.sampleTramPath(path, path.length * 0.37);
  assert.ok(Number.isFinite(middle.heading) && Number.isFinite(middle.grade));
  assert.ok(Math.abs(Math.hypot(middle.dx, middle.dz) - 1) < 1e-9);
});

test('trolley contact shoe stays exactly on the six-metre contact wire, including when reversing', () => {
  const path = motion.createTramPath(network.tracks[0]);
  for (const direction of [-1, 1]) {
    const s = path.length * 0.44;
    const contact = motion.sampleTramTrolleyContact(path, s, direction, network.contactWireHeight, 2.8);
    const rail = motion.sampleTramPath(path, s - direction * 2.8);
    assert.equal(contact.x, rail.x);
    assert.equal(contact.z, rail.z);
    assert.equal(contact.y, rail.y + 6);
    assert.equal(contact.y - contact.railY, 6);
  }
});

test('tram motion accelerates, dwells at ordered stops and reverses without a body spin', () => {
  const path = motion.createTramPath(network.tracks[0]);
  const state = motion.createTramMotion(path, 20, 1);
  const initial = state.s;
  for (let index = 0; index < 400; index++) motion.advanceTramMotion(state, path, 0.05);
  assert.ok(state.s > initial, 'tram actually moves along chainage');
  assert.ok(state.dwell > 0 || state.speed > 0);
  const short = { ...path, stops: [] };
  const shuttle = motion.createTramMotion(short, short.length - 0.1, 1);
  for (let index = 0; index < 200 && !shuttle.reversals; index++) motion.advanceTramMotion(shuttle, short, 0.05);
  assert.equal(shuttle.reversals, 1);
  assert.equal(shuttle.dir, -1);
  assert.equal(shuttle.s, short.length);
});

test('street lamps are revalidated against tram body, pole and span envelopes', () => {
  const clearanceManifest = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/street-light-clearance-manifest.json'), 'utf8'));
  assert.equal(clearanceManifest.counts.remainingCarriagewayConflicts, 0);
  assert.equal(clearanceManifest.counts.remainingTramConflicts, 0);
  assert.equal(clearanceManifest.derivation.tramTrackClearance, 1.45);
  assert.ok(clearanceManifest.counts.tramAdjusted >= 0);
});

test('tram generation is deterministic and byte-for-byte reproducible', { timeout: 60000 }, async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hk-tram-network-'));
  const outFile = path.join(directory, 'network.js'), manifestFile = path.join(directory, 'manifest.json');
  const generated = await builder.buildHongKongTramNetwork({ outFile, manifestFile });
  assert.deepEqual(generated.stats, manifest.stats);
  assert.deepEqual(generated.derivation, manifest.derivation);
  assert.ok(fs.readFileSync(outFile).equals(fs.readFileSync(path.join(root, 'js/hk-tram-network-data.js'))));
});
