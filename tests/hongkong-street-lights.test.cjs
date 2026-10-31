const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createHash } = require('node:crypto');

const root = path.join(__dirname, '..');
const sourceFile = path.join(root, 'tools/data/hongkong/lamppost_en.csv');
const dataFile = path.join(root, 'js/hk-street-light-data.js');
const manifestFile = path.join(root, 'tools/data/hongkong/street-lights-manifest.json');
let data, manifest, rows, frame, builder, crossings;

test.before(async () => {
  data = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS;
  manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  builder = await import('../tools/cities/hongkong/build-street-lights.mjs');
  crossings = await import('../js/cities/hongkong/crossings.js');
  const { default: config } = await import('../tools/cities/hongkong/config.mjs');
  const { makeFrame } = await import('../tools/geo/frame.mjs');
  frame = makeFrame(config.frame);
  rows = builder.parseCsv(fs.readFileSync(sourceFile, 'utf8').replace(/^\uFEFF/, ''));
});

test('lamp-post runtime preserves every numbered CSV position in source order', () => {
  const header = rows[0], sourceRows = rows.slice(1);
  assert.equal(sourceRows.length, 144995);
  assert.equal(data.lamps.length, sourceRows.length);
  assert.equal(data.source.records, sourceRows.length);
  assert.equal(manifest.source.uniqueLampPostNumbers, sourceRows.length);
  const ids = new Set(), coordinates = new Set();
  let duplicateCoordinates = 0, singleArm = 0, doubleArm = 0;
  const latColumn = header.indexOf('Latitude'), lonColumn = header.indexOf('Longitude');
  for (let i = 0; i < sourceRows.length; i++) {
    const row = sourceRows[i], lamp = data.lamps[i];
    const id = row[0];
    assert.ok(id && !ids.has(id), `unique source lamp number at row ${i}`);
    ids.add(id);
    const coordinateKey = `${row[latColumn]},${row[lonColumn]}`;
    if (coordinates.has(coordinateKey)) duplicateCoordinates++;
    coordinates.add(coordinateKey);
    const [expectedX, expectedZ] = frame.toWorld(Number(row[lonColumn]), Number(row[latColumn]));
    assert.ok(Math.abs(lamp[0] - expectedX) <= 0.00101, `${id} x stays at the supplied coordinate`);
    assert.ok(Math.abs(lamp[1] - expectedZ) <= 0.00101, `${id} z stays at the supplied coordinate`);
    assert.ok(Number.isFinite(lamp[2]) && Math.abs(lamp[2]) <= Math.PI + 0.0001, `${id} has a finite heading`);
    assert.ok(lamp[3] === 1 || lamp[3] === 2, `${id} is explicitly single- or double-arm`);
    if (lamp[3] === 2) doubleArm++; else singleArm++;
  }
  assert.equal(duplicateCoordinates, 19);
  assert.equal(singleArm, 125863);
  assert.equal(doubleArm, 19132);
  assert.equal(singleArm + doubleArm * 2, 164127);
  assert.equal(manifest.counts.lamps, data.lamps.length);
  assert.deepEqual(manifest.counts.singleArm, singleArm);
  assert.deepEqual(manifest.counts.doubleArm, doubleArm);
});

test('provenance and style limitations are explicit rather than invented source fields', () => {
  const sha = createHash('sha256').update(fs.readFileSync(sourceFile)).digest('hex');
  assert.equal(sha, 'c82d05cb082e7f9cda514983da90f01f1ad095be77127cfe04d472f7d6e65c0d');
  assert.equal(data.source.sha256, sha);
  assert.equal(manifest.source.sha256, sha);
  assert.equal(manifest.source.bytes, fs.statSync(sourceFile).size);
  assert.equal(manifest.source.upstreamMetadataSupplied, false);
  assert.equal(manifest.derivation.armStyleFieldInSource, false);
  assert.equal(manifest.derivation.orientationFallbacks, 12467);
  assert.equal(manifest.derivation.doubleReasons['opposite-parallel-carriageway'], 19061);
  assert.equal(manifest.derivation.doubleReasons['central-pole-wide-two-way-road'], 71);
  assert.equal(manifest.source.duplicateCoordinatePolicy, 'preserve every uniquely numbered source record');
  assert.ok(!rows[0].some((name) => /arm|style|height/i.test(name)), 'the CSV really has no arm-style or height column');
  const docs = fs.readFileSync(path.join(root, 'docs/hongkong-street-lighting.md'), 'utf8');
  assert.match(docs, /沒有燈臂款式或燈柱高度欄位/);
  assert.match(docs, /幾何推斷，不是逐支實地款式紀錄/);
  assert.match(docs, /9\.6 m/);
});

test('all sixty-six supplied positions on the modelled bridge decks retain a deck-height rule', () => {
  let bridgeMatched = 0;
  for (const [x, z] of data.lamps) {
    if (crossings.crossingSurfaceAt(x, z, 1)?.kind === 'bridge') bridgeMatched++;
  }
  assert.equal(bridgeMatched, 66);
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/street-lighting.js'), 'utf8');
  assert.match(source, /crossing\?\.kind === 'bridge' \? crossing\.height : surfaceRoadHeight\(x, z\)/);
});

test('street-light rendering mixes curved single and double arms with chunked night LOD', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/street-lighting.js'), 'utf8');
  assert.match(source, /new THREE\.CatmullRomCurve3/);
  assert.match(source, /for \(let arm = 0; arm < armCount; arm\+\+\)/);
  assert.match(source, /heading \+ arm \* Math\.PI/);
  assert.match(source, /const CHUNK_SIZE = 1000/);
  assert.match(source, /const GEOMETRY_RANGE = 800/);
  assert.match(source, /const NIGHT_GLOW_RANGE = 1800/);
  assert.match(source, /emissiveNode = color\(0xffb84f\)/);
  assert.match(source, /new THREE\.PlaneGeometry\(18, 18\)/);
  assert.match(source, /const scattered = pow\(radial, 1\.35\)\.mul\(0\.16\)/);
  assert.match(source, /const softCore = pow\(radial, 3\.2\)\.mul\(0\.08\)/);
  assert.match(source, /new THREE\.InstancedMesh/);
  assert.doesNotMatch(source, /new THREE\.PointLight/);
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  assert.match(simple, /createHongKongStreetLighting\(scene\)/);
  assert.match(simple, /streetLighting\.update\(context\)/);
  assert.match(simple, /lamps: streetLighting\.stats\.streetLightSourceLamps/);
  const city = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  assert.match(city, /streetLighting: world\.streetLighting/);
});

test('street-light generation is deterministic and byte-for-byte reproducible', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hk-street-lights-'));
  const outFile = path.join(directory, 'hk-street-light-data.js');
  const generatedManifestFile = path.join(directory, 'manifest.json');
  await builder.buildHongKongStreetLights({ outFile, manifestFile: generatedManifestFile });
  assert.ok(fs.readFileSync(outFile).equals(fs.readFileSync(dataFile)));
  const generatedManifest = JSON.parse(fs.readFileSync(generatedManifestFile, 'utf8'));
  assert.deepEqual({ ...generatedManifest, output: manifest.output }, manifest);
});
