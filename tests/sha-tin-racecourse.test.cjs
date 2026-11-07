// 沙田馬場 Sha Tin Racecourse — the course, its provenance, and the wiring into the Hong Kong terrain.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.join(__dirname, '..');
const worldUrl = `file://${path.join(root, 'js/cities/hongkong/sha-tin-racecourse-world.js')}`;
const archUrl = `file://${path.join(root, 'js/cities/hongkong/sha-tin-racecourse-architecture.js')}`;
const siteUrl = `file://${path.join(root, 'js/cities/hongkong/landmark-site.js')}`;
const harbourUrl = `file://${path.join(root, 'js/cities/hongkong/harbour-city-architecture.js')}`;
const terrainUrl = `file://${path.join(root, 'js/cities/hongkong/terrain.js')}`;

let world, architecture, siteUtils, terrain, harbour;
test.before(async () => {
  globalThis.document = globalThis.document ?? {
    createElement() {
      const canvas = { width: 0, height: 0 };
      const context = new Proxy({
        getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      }, { get: (target, key) => target[key] ?? (() => {}), set: (target, key, value) => { target[key] = value; return true; } });
      canvas.getContext = () => context;
      return canvas;
    },
  };
  world = await import(worldUrl);
  architecture = await import(archUrl);
  siteUtils = await import(siteUrl);
  harbour = await import(harbourUrl);
  terrain = await import(terrainUrl);
});

test('provenance: OSM relation 3726256 and the surveyed infield are preserved', () => {
  const a = architecture;
  assert.equal(a.SHA_TIN_SITE.osmId, 3726256);
  assert.equal(a.SHA_TIN_SITE.osmType, 'relation');
  assert.equal(a.SHA_TIN_OSM_SOURCE.tags.leisure, 'stadium');
  assert.equal(a.SHA_TIN_OSM_SOURCE.tags.sport, 'horse_racing');
  assert.equal(a.SHA_TIN_OSM_SOURCE.attribution, '© OpenStreetMap contributors');
  assert.equal(a.SHA_TIN_OSM_SOURCE.license, 'ODbL 1.0');
  // OSM outer way 1068023550 is closed: its 40 node references repeat the first node at the end.
  assert.equal(a.SHA_TIN_RING_GEOMETRY.length, 39);
  assert.equal(a.SHA_TIN_INFIELD_GEOMETRY.length, 54);
  // 71.7 hectares of surveyed property, and a 96,541 m² infield park.
  assert.ok(Math.abs(a.SHA_TIN_SITE.ringArea - 717000) < 3000, `area ${a.SHA_TIN_SITE.ringArea}`);
  assert.ok(Math.abs(a.SHA_TIN_INFIELD_AREA - 96541) < 400, `infield ${a.SHA_TIN_INFIELD_AREA}`);
  assert.equal(a.SHA_TIN_INFIELD_PARK.name, '彭福公園');
});

test('the published course falls out of the survey rather than being invented', () => {
  const laps = architecture.SHA_TIN_LAPS;
  const published = architecture.SHA_TIN_COURSE_PUBLISHED;
  // The inner rail is the surveyed infield edge; the outer turf rail then lands on the published 1,900 m lap.
  assert.ok(Math.abs(laps.turfOuterMetres - published.turf.lapMetres) <= 6, `turf ${laps.turfOuterMetres}`);
  // The all-weather track is 24 m wide and its centre line is within 2% of the published 1,650 m lap.
  assert.ok(Math.abs(laps.allWeatherCentreMetres - published.allWeather.lapMetres) < 40, `awt ${laps.allWeatherCentreMetres}`);
  assert.equal(published.turf.widthMetres, 30.5);
  assert.equal(published.allWeather.widthMetres, 24);
  assert.equal(architecture.SHA_TIN_TRACK_BAND.totalMetres, architecture.SHA_TIN_TRACK.turfOuterRadius
    - architecture.SHA_TIN_TRACK.innerRadius);
  assert.equal(published.opened, '1978-10-07');
  assert.equal(published.capacity, 85000);
  assert.equal(published.direction, 'clockwise');
});

test('the course sits inside the surveyed fence and never on a retained road', () => {
  const a = architecture;
  const ring = a.SHA_TIN_SITE.localRing;
  let outside = 0;
  for (let i = 0; i < 360; i++) {
    for (const offset of [0, a.SHA_TIN_TRACK.apronMetres, a.SHA_TIN_TRACK.allWeatherOuterRadius - a.SHA_TIN_TRACK.innerRadius,
      a.SHA_TIN_TRACK.turfOuterRadius - a.SHA_TIN_TRACK.innerRadius]) {
      const point = a.shaTinTrackPoint(i / 360, offset);
      if (!siteUtils.pointInFlatRing(ring, point.x, point.z)) outside++;
    }
  }
  assert.equal(outside, 0, `track outside the fence at ${outside} samples`);
  // The stands are on their surveyed centres and clear of the running rails.
  for (const stand of a.SHA_TIN_GRANDSTANDS) {
    const dx = stand.x - a.SHA_TIN_TRACK.centreX, dz = stand.z - a.SHA_TIN_TRACK.centreZ;
    const inner = Math.abs(dx) - a.SHA_TIN_TRACK.straight / 2;
    const distance = inner <= 0 ? Math.abs(dz) : Math.hypot(inner, dz);
    assert.ok(distance > a.SHA_TIN_TRACK.turfOuterRadius + 20, `${stand.key} distance ${distance}`);
    assert.ok(siteUtils.pointInFlatRing(ring, stand.x, stand.z), stand.key);
  }
});

test('the built venue has the course, both stands, the screen, the stables and the station', () => {
  const built = world.buildShaTinRacecourse({ add() {} }, { groundOffset: 8.01 });
  const names = [];
  built.group.traverse((object) => { if (object.name) names.push(object.name); });
  const expected = [
    'ShaTinCourse', 'ShaTinTurfCourse', 'ShaTinAllWeatherTrack', 'ShaTinSandApron', 'ShaTinInfieldLawn',
    'ShaTinRunningRails', 'ShaTinWinningPostAndBoards', 'ShaTinPerimeterFence', 'ShaTinSiteGround',
    'ShaTinGrandstandOne', 'ShaTinGrandstandOneSeatsBlue', 'ShaTinGrandstandOneCantileveredRoof',
    'ShaTinGrandstandTwo', 'ShaTinClubhouse', 'ShaTinParadeRing', 'ShaTinSaddlingEnclosure',
    'ShaTinBigScreen', 'ShaTinBigScreenFace', 'ShaTinInfieldBrandingBoards',
    'ShaTinStables', 'ShaTinStableBlocks', 'ShaTinRacecourseStation', 'ShaTinRacecourseStationCanopy',
    'ShaTinApron',
  ];
  for (const name of expected) assert.ok(names.includes(name), name);
  let nonFinite = 0, meshes = 0;
  built.group.traverse((object) => {
    if (!object.isMesh) return;
    meshes++;
    const position = object.geometry?.getAttribute('position');
    if (position) for (const value of position.array) if (!Number.isFinite(value)) nonFinite++;
  });
  assert.equal(nonFinite, 0);
  assert.ok(meshes > 20, `meshes ${meshes}`);
  assert.equal(built.stats.shaTinTurfLapMetres, architecture.SHA_TIN_LAPS.turfOuterMetres);
  assert.equal(built.stats.shaTinStands, 2);
  assert.equal(built.stats.shaTinScreenWidth, 42);
  assert.ok(built.stats.shaTinStableBlocks >= 8, `stables ${built.stats.shaTinStableBlocks}`);
  assert.equal(built.stats.shaTinStationPlatformMetres, 180);
  assert.ok(built.colliders.length >= 5, `colliders ${built.colliders.length}`);
  assert.equal(built.landmarks[0].id, 'sha-tin-racecourse');
});

test('the venue is wired into the Hong Kong terrain and the simple world', () => {
  const meta = terrain.HONG_KONG_TERRAIN_META;
  assert.ok(Number.isFinite(meta.shaTinPadHeight));
  // The Shing Mun River plain: the median of the ground inside the fence, not the highest sample.
  assert.ok(meta.shaTinPadHeight > 0 && meta.shaTinPadHeight < 40, `pad ${meta.shaTinPadHeight}`);
  const a = architecture;
  // The property is a wedge, so its OBB centre is outside the fence; sample a point on the course instead.
  const onCourse = a.shaTinTrackPoint(0.1, 0);
  const world = harbour.harbourCityLocalToWorld(a.SHA_TIN_SITE, onCourse.x, onCourse.z);
  const inside = a.shaTinTerrainHeightAt(world.x, world.z, 1, meta.shaTinPadHeight);
  assert.equal(inside, meta.shaTinPadHeight);
  const outside = a.shaTinTerrainHeightAt(a.SHA_TIN_SITE.x + 4000, a.SHA_TIN_SITE.z + 4000, 12.5, meta.shaTinPadHeight);
  assert.equal(outside, 12.5);

  const fs = require('node:fs');
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  assert.ok(simple.includes("buildShaTinRacecourse(scene, { groundOffset: HONG_KONG_TERRAIN_META.shaTinPadHeight })"));
  assert.ok(simple.includes('shaTin.groundHeightAt'));
  const terrainSource = fs.readFileSync(path.join(root, 'js/cities/hongkong/terrain.js'), 'utf8');
  assert.ok(terrainSource.includes('shaTinTerrainHeightAt(x, z, happyValleyHeight, SHA_TIN_PAD_HEIGHT)'));
});

test('the research record is carried with the model', () => {
  const sources = architecture.SHA_TIN_RESEARCH_SOURCES;
  assert.ok(sources.length >= 3);
  const text = sources.map((entry) => entry.evidence).join(' ');
  assert.match(text, /1978/);
  assert.match(text, /1985/);
  assert.match(text, /1,900|1900/);
  assert.match(text, /clockwise/);
  assert.equal(architecture.SHA_TIN_COURSE_PUBLISHED.paradeRingRetractableRoof, 'the first in the world');
  assert.equal(architecture.SHA_TIN_INFIELD_PARK.olympicCrossCountry2008, true);
});
