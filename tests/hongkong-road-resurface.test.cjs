const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

let roads;
let elevation;
let fullMeta;
let markings;
let geo;

test.before(async () => {
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS;
  elevation = await import('../js/cities/hongkong/road-elevation.js');
  fullMeta = await import('../js/cities/hongkong/full-meta.js');
  markings = await import('../js/cities/hongkong/derived-road-markings.js');
  geo = (await import('../js/hk-geodata.js')).GEO;
});

function pointAt(road, segmentIndex, t) {
  const flat = road[5], i = segmentIndex * 2;
  const ax = flat[i], az = flat[i + 1], dx = flat[i + 2] - ax, dz = flat[i + 3] - az;
  const length = Math.hypot(dx, dz);
  return { x: ax + dx * t, z: az + dz * t, dx, dz, length, nx: dz / length, nz: -dx / length };
}

test('target roads and the Central construction-pad edge do not pierce their level road cross-sections', () => {
  const { roadRibbonHeightAtSegment, roadRibbonProfileAtSegment, surfaceRoadHeight } = elevation;
  for (const wayId of [42868, 12263, 25190, 48646]) {
    const road = roads.roads[wayId];
    for (let segmentIndex = 0; segmentIndex + 1 < road[5].length / 2; segmentIndex++) {
      const profile = roadRibbonProfileAtSegment(wayId, segmentIndex);
      assert.equal(profile.ts[0], 0);
      assert.equal(profile.ts.at(-1), 1);
      for (let i = 0; i + 1 < profile.ts.length; i++) {
        const ta = profile.ts[i], tb = profile.ts[i + 1];
        assert.ok(tb > ta, `${wayId}/${segmentIndex} stations are strictly ordered`);
        for (let sample = 0; sample <= 12; sample++) {
          const local = sample / 12, t = ta + (tb - ta) * local;
          const p = pointAt(road, segmentIndex, t);
          const height = roadRibbonHeightAtSegment(wayId, segmentIndex, t);
          const chord = profile.heights[i] + (profile.heights[i + 1] - profile.heights[i]) * local;
          assert.ok(Math.abs(height - chord) < 1e-8, 'entity query returns the exact rendered chord');
          for (const lateral of [-road[1] * 0.5, 0, road[1] * 0.5]) {
            const terrain = surfaceRoadHeight(p.x + p.nx * lateral, p.z + p.nz * lateral);
            assert.ok(height + 1e-7 >= terrain,
              `${road[0]} ${wayId}/${segmentIndex} terrain ${terrain} stays below ribbon ${height}`);
          }
        }
      }
    }
  }
});

test('Park Road ground queries share the same transverse height as its rendered ribbon', () => {
  const wayId = 42868, segmentIndex = 0, t = 0.5;
  const road = roads.roads[wayId], p = pointAt(road, segmentIndex, t);
  const expected = elevation.roadRibbonHeightAtSegment(wayId, segmentIndex, t);
  for (const lateral of [-road[1] * 0.45, 0, road[1] * 0.45]) {
    const hit = fullMeta.fullRoadSurfaceAt(p.x + p.nx * lateral, p.z + p.nz * lateral, 0.35, expected);
    assert.ok(hit, `ground query at lateral ${lateral}`);
    assert.equal(hit.way.id, wayId);
    assert.ok(Math.abs(hit.height - expected) < 1e-8, 'shoulder and centre use one level cross-section');
  }
});

test('tunnel ribbons retain the generated engineering longitudinal profile', () => {
  const wayId = roads.roads.findIndex((road) => road[4] & 4);
  assert.ok(wayId >= 0);
  const road = roads.roads[wayId], p = pointAt(road, 0, 0.37);
  const expected = elevation.roadHeightAtSegment(wayId, 0, 0.37, p.x, p.z);
  assert.ok(Math.abs(elevation.roadRibbonHeightAtSegment(wayId, 0, 0.37) - expected) < 1e-8);
});

test('derived paint packs OSM lanes and direction and protects only the surveyed paint area', () => {
  assert.equal(markings.signedRoadLaneCount(roads.roads[42868]), -2); // Park Road: two-way, two lanes
  assert.equal(markings.signedRoadLaneCount(roads.roads[25190]), 2); // MacDonnell Road: one-way, two lanes
  const guard = markings.SURVEYED_PAINT_GUARD;
  assert.ok(guard);
  const surveyed = geo.trafficAids.marks[0].parts[0];
  assert.ok(surveyed[0] >= guard.minX && surveyed[0] <= guard.maxX);
  assert.ok(surveyed[1] >= guard.minZ && surveyed[1] <= guard.maxZ);
  const park = roads.roads[42868][5];
  assert.ok(park[0] < guard.minX || park[0] > guard.maxX || park[1] < guard.minZ || park[1] > guard.maxZ,
    'the reported Park Road location still receives derived white lines');
});

test('territory asphalt is dry and carries white-line attributes without separate paint triangles', () => {
  const root = path.resolve(__dirname, '..');
  const materials = fs.readFileSync(path.join(root, 'js/tsl-materials.js'), 'utf8');
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/full-world.js'), 'utf8');
  assert.match(world, /createHongKongRoadSurfaceMaterial\(\{ dry: true, derivedMarkings: DERIVED_ROAD_MARKINGS \}\)/);
  assert.match(world, /setAttribute\('roadPaint', new THREE\.Float32BufferAttribute\(chunk\.paint, 4\)\)/);
  assert.match(world, /fullRoadDerivedPaintExtraTriangles: 0/);
  assert.match(materials, /const wet = dry \? vec3\(0\.0\) : roadWetMasks\(puddleField\)/);
  assert.match(materials, /const oilyStain = dry \? float\(0\.0\)/);
  assert.match(materials, /const tarSeam = dry \? float\(0\.0\)/);
  assert.match(materials, /attribute\('roadPaint', 'vec4'\)/);
  assert.match(materials, /color\(0xf1f0e9\)/);
});
