const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
let network, manifest, motion, builder, termini;
test.before(async () => {
  network = (await import('../js/hk-tram-network-data.js')).HK_TRAM_NETWORK;
  manifest = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/tram-network-manifest.json'), 'utf8'));
  motion = await import('../js/cities/hongkong/tram-motion.js');
  termini = (await import('../js/cities/hongkong/tram-termini.js')).getTramTermini();
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

test('all seven official termini have bilingual platforms, shelters and map anchors clear of running rails', () => {
  assert.deepEqual(termini.map((terminus) => terminus.code).sort(), ['CBT', 'HVT', 'KTT', 'NPT', 'SKT', 'WMT', 'WST']);
  const platforms = termini.flatMap((terminus) => terminus.platforms);
  assert.equal(platforms.length, 8, 'Western Market retains its two physically separate official stop positions');
  assert.equal(termini.find((terminus) => terminus.code === 'WMT').platforms.length, 2);
  for (const terminus of termini) {
    assert.match(terminus.name, /總站$/);
    assert.match(terminus.nameEn, /Terminus$/);
    for (const platform of terminus.platforms) {
      assert.ok([platform.anchorX, platform.anchorY, platform.anchorZ, platform.x, platform.y, platform.z, platform.heading, platform.grade].every(Number.isFinite));
      assert.ok(platform.length >= 8 && platform.width >= 1.8);
      assert.ok(platform.clearance >= 1.30, `${platform.id} platform envelope clears every tram body and running rail`);
    }
  }
  const runtime = fs.readFileSync(path.join(root, 'js/cities/hongkong/tram.js'), 'utf8');
  const map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8');
  assert.match(runtime, /HongKongTramTermini/);
  assert.match(runtime, /HongKongTramTerminusSign/);
  assert.match(runtime, /tramTerminusPlatforms/);
  assert.match(map, /drawTramTermini\(ctx, view/);
});

test('terminus platforms have continuous exact rail clearance, including curved junction corners', () => {
  const cross = (ux, uz, vx, vz) => ux * vz - uz * vx;
  const pointSegment = (px, pz, segment) => {
    const [ax, az, bx, bz] = segment, dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(px - ax - dx * t, pz - az - dz * t);
  };
  const segmentDistance = (a, b) => {
    const arx = a[2] - a[0], arz = a[3] - a[1], brx = b[2] - b[0], brz = b[3] - b[1];
    const denominator = cross(arx, arz, brx, brz);
    if (Math.abs(denominator) > 1e-12) {
      const qx = b[0] - a[0], qz = b[1] - a[1];
      const t = cross(qx, qz, brx, brz) / denominator, u = cross(qx, qz, arx, arz) / denominator;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return 0;
    }
    return Math.min(pointSegment(a[0], a[1], b), pointSegment(a[2], a[3], b),
      pointSegment(b[0], b[1], a), pointSegment(b[2], b[3], a));
  };
  const tracks = network.tracks.flatMap((track) => {
    const segments = [];
    for (let index = 3; index < track.points.length; index += 3) {
      const segment = [track.points[index - 3], track.points[index - 1], track.points[index], track.points[index + 2]];
      if (Math.hypot(segment[2] - segment[0], segment[3] - segment[1]) > 1e-4) segments.push(segment);
    }
    return segments;
  });
  for (const platform of termini.flatMap((terminus) => terminus.platforms)) {
    const nx = platform.dz, nz = -platform.dx;
    const cx = platform.x + nx * platform.side * platform.offset, cz = platform.z + nz * platform.side * platform.offset;
    const corners = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([along, across]) => [
      cx + platform.dx * along * platform.length + nx * across * platform.width,
      cz + platform.dz * along * platform.length + nz * across * platform.width
    ]);
    const edges = corners.map((corner, index) => [...corner, ...corners[(index + 1) % 4]]);
    let exact = Infinity;
    for (const track of tracks) {
      const rx = track[0] - cx, rz = track[1] - cz;
      const startInside = Math.abs(rx * platform.dx + rz * platform.dz) <= platform.length * 0.5 + 1e-8
        && Math.abs(rx * nx + rz * nz) <= platform.width * 0.5 + 1e-8;
      const ex = track[2] - cx, ez = track[3] - cz;
      const endInside = Math.abs(ex * platform.dx + ez * platform.dz) <= platform.length * 0.5 + 1e-8
        && Math.abs(ex * nx + ez * nz) <= platform.width * 0.5 + 1e-8;
      if (startInside || endInside) { exact = 0; break; }
      for (const edge of edges) exact = Math.min(exact, segmentDistance(track, edge));
      if (exact === 0) break;
    }
    assert.ok(exact >= 1.30, `${platform.id} has no rail crossing between footprint samples (exact ${exact.toFixed(3)} m)`);
    assert.ok(Math.abs(exact - platform.clearance) <= 0.0011, `${platform.id} reports its exact rounded clearance`);
  }
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
