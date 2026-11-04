const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
let data, routes, swell, fullMeta, siteGeometry, geo;
test.before(async () => {
  data = await import('../js/cities/hongkong/star-ferry-data.js');
  routes = await import('../js/cities/hongkong/star-ferry-routes.js');
  swell = await import('../js/cities/hongkong/harbour-swell.js');
  fullMeta = await import('../js/cities/hongkong/full-meta.js');
  siteGeometry = await import('../js/cities/hongkong/landmark-site.js');
  geo = (await import('../js/hk-geodata.js')).GEO;
});

test('all three current Star Ferry terminals retain their OSM identity, closed source and metre-grid footprint', () => {
  assert.deepEqual(data.STAR_FERRY_TERMINALS.map((site) => site.id), ['tsim-sha-tsui', 'central', 'wan-chai']);
  assert.deepEqual(data.STAR_FERRY_TERMINALS.map((site) => site.osmId), [14941145, 1483823682, 14953850]);
  for (const site of data.STAR_FERRY_TERMINALS) {
    assert.equal(site.source.attribution, '© OpenStreetMap contributors');
    assert.equal(site.source.license, 'ODbL 1.0');
    assert.match(site.source.sourceUrl, /openstreetmap\.org\/api\/0\.6\//);
    assert.deepEqual(site.source.geometry[0], site.source.geometry.at(-1));
    assert.equal(site.localRing.length, (site.source.geometry.length - 1) * 2);
    assert.ok(site.w > 25 && site.d > 20 && site.area > 700, `${site.id} has a real terminal-sized outline`);
    assert.ok(site.ring.every(Number.isFinite) && site.localRing.every(Number.isFinite));
  }
  const central = data.STAR_FERRY_TERMINAL_BY_ID.central;
  const raw = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/landmarks.json'), 'utf8'));
  const cached = raw.elements.find((element) => element.type === 'way' && element.id === 1483823682);
  // OSM may reverse way-node order between API responses; compare the actual source vertices rather than their winding.
  const vertices = (geometry) => geometry.map(({ lon, lat }) => `${lon},${lat}`).sort();
  assert.deepEqual(vertices(central.source.geometry), vertices(cached.geometry));
  assert.equal(central.source.tags.official_name, '中環7號碼頭 Central Pier Number 7');
  assert.equal(central.source.tags.height, '14');
});

test('ordinary ferry scale follows official Morning Star dimensions, not the longer harbour-tour vessel', () => {
  assert.equal(data.STAR_FERRY_VESSEL_REFERENCE.name, 'Morning Star');
  assert.equal(data.STAR_FERRY_VESSEL_REFERENCE.length, 35.61);
  assert.equal(data.STAR_FERRY_VESSEL_REFERENCE.beam, 8.57);
  assert.match(data.STAR_FERRY_VESSEL_REFERENCE.sourceUrl, /epd\.gov\.hk/);
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/star-ferry-vessel.js'), 'utf8');
  assert.match(source, /length: STAR_FERRY_VESSEL_REFERENCE\.length/);
  assert.match(source, /beam: STAR_FERRY_VESSEL_REFERENCE\.beam/);
  assert.match(source, /doubleEnded: true/);
  for (const token of ['hullBand', 'TorusGeometry', 'addBench', 'addStairs', 'twin masts']) {
    assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('only the two current franchised routes connect TST with Central Pier 7 and Wan Chai', () => {
  assert.deepEqual(routes.STAR_FERRY_ROUTES.map((route) => route.id), ['tst-central', 'tst-wan-chai']);
  assert.equal(routes.STAR_FERRY_SERVICE_SOURCE, 'https://www.starferry.com.hk/en/service');
  for (const route of routes.STAR_FERRY_ROUTES) {
    assert.equal(route.a.siteId, 'tsim-sha-tsui');
    assert.ok(route.length > 900 && route.length < 1600);
    assert.ok(!/hung hom/i.test(`${route.name} ${route.nameEn}`));
    for (let step = 0; step <= 400; step++) {
      const point = routes.sampleStarFerryRoute(route, route.length * step / 400);
      assert.equal(fullMeta.isTerritoryLand(point.x, point.z), false,
        `${route.id} centre path remains in harbour water at ${point.x.toFixed(1)},${point.z.toFixed(1)}`);
    }
  }
  assert.equal(routes.STAR_FERRY_ROUTES[0].b.siteId, 'central');
  assert.equal(routes.STAR_FERRY_ROUTES[1].b.siteId, 'wan-chai');
});

function orientation(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}
function segmentsCross(a, b, c, d) {
  return orientation(a, b, c) * orientation(a, b, d) < 0
    && orientation(c, d, a) * orientation(c, d, b) < 0;
}

test('each full-size double-ended ferry berth clears its terminal footprint', () => {
  const halfLength = data.STAR_FERRY_VESSEL_REFERENCE.length / 2;
  const halfBeam = data.STAR_FERRY_VESSEL_REFERENCE.beam / 2;
  for (const route of routes.STAR_FERRY_ROUTES) {
    for (const berth of [route.a, route.b]) {
      const site = data.STAR_FERRY_TERMINAL_BY_ID[berth.siteId];
      const alongX = site.id !== 'tsim-sha-tsui';
      const hx = alongX ? halfLength : halfBeam, hz = alongX ? halfBeam : halfLength;
      const corners = [
        [berth.localX - hx, berth.localZ - hz], [berth.localX + hx, berth.localZ - hz],
        [berth.localX + hx, berth.localZ + hz], [berth.localX - hx, berth.localZ + hz]
      ];
      for (const corner of corners) assert.equal(siteGeometry.pointInFlatRing(site.localRing, ...corner), false);
      for (let edge = 0; edge < site.localRing.length / 2; edge++) {
        const next = (edge + 1) % (site.localRing.length / 2);
        const a = [site.localRing[edge * 2], site.localRing[edge * 2 + 1]];
        const b = [site.localRing[next * 2], site.localRing[next * 2 + 1]];
        assert.equal(Math.abs(a[0] - berth.localX) <= hx && Math.abs(a[1] - berth.localZ) <= hz, false,
          `${route.id} has no terminal vertex inside the vessel envelope`);
        for (let side = 0; side < 4; side++) {
          assert.equal(segmentsCross(corners[side], corners[(side + 1) % 4], a, b), false,
            `${route.id} vessel envelope does not cross terminal edge ${edge}`);
        }
      }
      assert.equal(fullMeta.isTerritoryLand(berth.x, berth.z), false);
    }
  }
});

test('swept full-size hull corners stay off land and route centrelines never cross the detailed seawall', () => {
  const halfLength = data.STAR_FERRY_VESSEL_REFERENCE.length / 2;
  const halfBeam = data.STAR_FERRY_VESSEL_REFERENCE.beam / 2;
  for (const route of routes.STAR_FERRY_ROUTES) {
    const steps = Math.ceil(route.length / 2);
    for (let step = 0; step <= steps; step++) {
      const chainage = Math.min(route.length, step * 2);
      const point = routes.sampleStarFerryRoute(route, chainage);
      const c = Math.cos(point.heading), n = Math.sin(point.heading);
      for (const [lx, lz] of [[-halfBeam, -halfLength], [halfBeam, -halfLength], [halfBeam, halfLength], [-halfBeam, halfLength]]) {
        const x = point.x + c * lx + n * lz, z = point.z - n * lx + c * lz;
        assert.equal(fullMeta.isTerritoryLand(x, z), false,
          `${route.id} swept hull stays in water at chainage ${chainage.toFixed(1)} (${x.toFixed(1)},${z.toFixed(1)})`);
      }
    }
    for (const ring of geo.land) {
      for (let index = 0; index + 3 < ring.length; index += 2) {
        assert.equal(segmentsCross([route.a.x, route.a.z], [route.b.x, route.b.z],
          [ring[index], ring[index + 1]], [ring[index + 2], ring[index + 3]]), false,
        `${route.id} does not cross a detailed-coast collision segment`);
      }
    }
  }
});

test('double-ended route headings align with both berths and remain continuous without a direction flip', () => {
  for (const route of routes.STAR_FERRY_ROUTES) {
    const start = routes.sampleStarFerryRoute(route, 0), end = routes.sampleStarFerryRoute(route, route.length);
    assert.ok(routes.starFerryHeadingError(start.heading, route.a.heading) < 1e-9);
    assert.ok(routes.starFerryHeadingError(end.heading, route.b.heading) < 1e-9);
    let previous = routes.sampleStarFerryRoute(route, 0);
    for (let s = 2; s <= route.length; s += 2) {
      const point = routes.sampleStarFerryRoute(route, s);
      assert.ok(routes.starFerryHeadingError(point.heading, previous.heading) < 0.04,
        `${route.id} turns progressively near its berth`);
      previous = point;
    }
    const state = routes.createStarFerryMotion(route, route.length - 0.04, 1);
    state.speed = route.maxSpeed;
    const before = routes.sampleStarFerryRoute(route, state.s).heading;
    for (let step = 0; step < 100 && !state.reversals; step++) routes.advanceStarFerryMotion(state, route, 0.05);
    const after = routes.sampleStarFerryRoute(route, state.s).heading;
    assert.equal(state.reversals, 1);
    assert.equal(state.dir, -1);
    assert.equal(state.s, route.length);
    assert.equal(state.dwell, route.dwellTime);
    assert.ok(routes.starFerryHeadingError(before, after) < 0.01, 'reversing service does not spin the vessel 180°');
  }
});

test('ferry motion accelerates, dwells and shares the same zero-mean long swell as the water', () => {
  const route = routes.STAR_FERRY_ROUTES[0];
  const state = routes.createStarFerryMotion(route, route.length * 0.2, 1);
  const initial = state.s;
  for (let step = 0; step < 400; step++) routes.advanceStarFerryMotion(state, route, 0.05);
  assert.ok(state.s > initial && state.speed > 0);
  assert.ok(state.speed <= route.maxSpeed + 1e-9);
  for (const [x, z, elapsed] of [[0, 0, 0], [870, -1324, 12.5], [1692, -171, 83]]) {
    const sample = swell.sampleHongKongHarbourSwell(x, z, elapsed);
    assert.ok(Object.values(sample).every(Number.isFinite));
    assert.ok(Math.abs(sample.height) <= 0.420001);
  }
  const water = fs.readFileSync(path.join(root, 'js/cities/hongkong/harbour-water.js'), 'utf8');
  assert.match(water, /const SWELLS = HONG_KONG_HARBOUR_SWELLS/);
  assert.doesNotMatch(water, /const SWELLS = \[/);
});

test('terminal architecture, map markers and runtime stats are integrated', () => {
  const terminals = fs.readFileSync(path.join(root, 'js/cities/hongkong/star-ferry-terminals.js'), 'utf8');
  for (const token of ['buildTsimShaTsui', 'buildCentral', 'buildWanChai', 'addClockTower', 'addRoofGarden', 'addPierBase']) {
    assert.match(terminals, new RegExp(token));
  }
  const map = fs.readFileSync(path.join(root, 'js/cities/hongkong/map.js'), 'utf8');
  assert.match(map, /makeFerryLayer/);
  assert.match(map, /drawStarFerryTerminals\(ctx, view, true\)/);
  assert.match(map, /drawStarFerryTerminals\(ctx, view, false\)/);
  const index = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  assert.match(index, /starFerryRoutes: harbour\.routes\.length/);
  assert.match(index, /starFerryTerminals: harbour\.terminals\.length/);
  assert.match(index, /harbour,/);
  const harbour = fs.readFileSync(path.join(root, 'js/cities/hongkong/harbour.js'), 'utf8');
  assert.match(harbour, /sampleHongKongHarbourSwell/);
  assert.match(harbour, /Only the wake changes ends/);
  assert.doesNotMatch(harbour, /ferry\.mesh\.rotation\.y[\s\S]{0,120}Math\.PI/);
});
