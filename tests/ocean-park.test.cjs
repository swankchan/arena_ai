// 香港海洋公園 Ocean Park — Part 1: the surveyed property, the cable car and the Ocean Express.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.join(__dirname, '..');
const archUrl = `file://${path.join(root, 'js/cities/hongkong/ocean-park-architecture.js')}`;
const worldUrl = `file://${path.join(root, 'js/cities/hongkong/ocean-park-world.js')}`;
const terrainUrl = `file://${path.join(root, 'js/cities/hongkong/terrain.js')}`;

let architecture, world, terrain, scene;

test.before(async () => {
  globalThis.document = globalThis.document ?? {
    createElement() {
      const canvas = { width: 0, height: 0 };
      const context = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) },
        { get: (target, key) => target[key] ?? (() => {}), set: (target, key, value) => { target[key] = value; return true; } });
      canvas.getContext = () => context;
      return canvas;
    },
  };
  architecture = await import(archUrl);
  world = await import(worldUrl);
  terrain = await import(terrainUrl);
  const THREE = await import('three/webgpu');
  scene = new THREE.Scene();
});

const meshes = () => {
  const found = [];
  scene.traverse((object) => { if (object.isMesh) found.push(object); });
  return found;
};

let park;
const build = () => { park = park ?? world.buildOceanPark(scene); return park; };

test('provenance: OSM relation 3676813 is the park, in its two surveyed halves', () => {
  const a = architecture;
  assert.equal(a.OCEAN_PARK_SUMMIT_SITE.osmId, 3676813);
  assert.equal(a.OCEAN_PARK_SUMMIT_SITE.osmType, 'relation');
  assert.equal(a.OCEAN_PARK_OSM_SOURCE.version, 19);
  assert.equal(a.OCEAN_PARK_OSM_SOURCE.tags.leisure, 'resort');
  assert.equal(a.OCEAN_PARK_OSM_SOURCE.attribution, '© OpenStreetMap contributors');
  assert.equal(a.OCEAN_PARK_OSM_SOURCE.license, 'ODbL 1.0');
  // The two outer ways are preserved separately: the southern headland and the northern lowland.
  assert.equal(a.OCEAN_PARK_SUMMIT_GEOMETRY.length, 57);
  assert.equal(a.OCEAN_PARK_WATERFRONT_GEOMETRY.length, 25);
  assert.equal(a.OCEAN_PARK_WATERFRONT_OSM_SOURCE.id, 949680440);
  assert.match(a.OCEAN_PARK_OSM_SOURCE.evidence, /949680439/);
  // 67.7 ha of headland plus 15.7 ha of lowland; Water World's 5.7 ha makes up the published 91.5 ha.
  const hectares = (a.OCEAN_PARK_SUMMIT_SITE.ringArea + a.OCEAN_PARK_WATERFRONT_SITE.ringArea) / 10000;
  assert.ok(Math.abs(hectares - 83.4) < 2, `modelled hectares ${hectares}`);
  assert.equal(a.OCEAN_PARK_PUBLISHED.hectares, 91.5);
  assert.equal(a.OCEAN_PARK_PUBLISHED.waterWorldHectares, 5.7);
  assert.equal(a.OCEAN_PARK_PUBLISHED.opened, '1977-01-10');
});

test('the cable car route is the survey, not a straight line', () => {
  const a = architecture;
  assert.equal(a.OCEAN_PARK_CABLE_CAR.osmWayId, 949698609);
  // 1,485 m along the surveyed alignment against the published 1.5 km.
  assert.ok(Math.abs(a.OCEAN_PARK_CABLE_CAR_METRES - 1500) <= 30, `cable ${a.OCEAN_PARK_CABLE_CAR_METRES}`);
  assert.equal(a.OCEAN_PARK_CABLE_CAR.supports.length, 5);
  assert.equal(a.OCEAN_PARK_CABLE_CAR.cabins, 252);
  assert.equal(a.OCEAN_PARK_CABLE_CAR.carCapacity, 6);
  // The two stations are where OSM puts them: 22.23365 N on the headland and 22.24653 N in the lowland.
  assert.ok(Math.abs(a.OCEAN_PARK_CABLE_CAR.stations.summit.lat - 22.2336547) < 1e-6);
  assert.ok(Math.abs(a.OCEAN_PARK_CABLE_CAR.stations.waterfront.lat - 22.2465343) < 1e-6);
  // Sampling the alignment must land on the stations and stay inside the property.
  const start = a.oceanParkCableCarPoint(0), end = a.oceanParkCableCarPoint(1);
  assert.ok(Math.hypot(start.x - a.OCEAN_PARK_CABLE_CAR_ROUTE[0].x, start.z - a.OCEAN_PARK_CABLE_CAR_ROUTE[0].z) < 1);
  assert.ok(Math.hypot(end.x - a.OCEAN_PARK_CABLE_CAR_ROUTE.at(-1).x, end.z - a.OCEAN_PARK_CABLE_CAR_ROUTE.at(-1).z) < 1);
});

test('Ocean Express is the surveyed funicular alignment between the two tagged stops', () => {
  const a = architecture;
  assert.deepEqual([...a.OCEAN_EXPRESS.osmWayIds], [92167201, 250700766]);
  assert.equal(a.OCEAN_EXPRESS.stops.waterfront.nodeRef, 1070003266);
  assert.equal(a.OCEAN_EXPRESS.stops.summit.nodeRef, 1070003294);
  // 1,246 m station to station against the published 1.3 km.
  assert.ok(Math.abs(a.OCEAN_EXPRESS_ALIGNMENT_METRES - 1300) <= 60, `express ${a.OCEAN_EXPRESS_ALIGNMENT_METRES}`);
  assert.equal(a.OCEAN_EXPRESS.gaugeMillimetres, 1435);
  assert.equal(a.OCEAN_EXPRESS.avgGradeDegrees, 5.3);
  assert.equal(a.OCEAN_EXPRESS.opened, '2009-09-09');
  assert.ok(a.OCEAN_EXPRESS.stops.summit.publishedLevelMetres > a.OCEAN_EXPRESS.stops.waterfront.publishedLevelMetres);
});

test('the built park stands on the survey: deck levels, cable clearance and mesh names', () => {
  const park = build();
  assert.equal(park.stats.oceanParkCableCarMetres, 1485);
  // The cable-car decks come off the DTM, within a few metres of the surveyed ground.
  assert.ok(Math.abs(park.stats.oceanParkCableCarSummitDeckMetres - 119) < 6, `summit deck ${park.stats.oceanParkCableCarSummitDeckMetres}`);
  assert.ok(Math.abs(park.stats.oceanParkCableCarWaterfrontDeckMetres - 21) < 6, `waterfront deck ${park.stats.oceanParkCableCarWaterfrontDeckMetres}`);
  // The funicular stops land near the park's published platform levels of +28 m and +134 m.
  assert.ok(Math.abs(park.stats.oceanExpressWaterfrontLevelMetres - 28) < 6, `wf ${park.stats.oceanExpressWaterfrontLevelMetres}`);
  assert.ok(Math.abs(park.stats.oceanExpressSummitLevelMetres - 134) < 6, `summit ${park.stats.oceanExpressSummitLevelMetres}`);
  // Every span of the rope clears the ridge by at least ten metres.
  assert.ok(park.stats.oceanParkCableCarMinClearanceMetres >= 10, `clearance ${park.stats.oceanParkCableCarMinClearanceMetres}`);
  assert.equal(park.stats.oceanParkCableCarSupports, 5);
  assert.equal(park.stats.oceanParkPart, 1);
});

test('the assembled park has finite geometry and the named meshes', () => {
  const park = build();
  const names = new Set(meshes().map((mesh) => mesh.name));
  for (const name of [
    'OceanParkBoundaryFence', 'OceanParkCableCarRopes', 'OceanParkCableCarSupports',
    'OceanParkCableCarStationBuildings', 'OceanParkCableCarCabinsRed', 'OceanParkCableCarCabinsBlue',
    'OceanExpressStationWalls', 'OceanExpressApproachRails', 'OceanParkGateStructures', 'OceanParkTreeCanopies',
  ]) assert.ok(names.has(name), `missing mesh ${name}`);
  let vertices = 0;
  for (const mesh of meshes()) {
    const position = mesh.geometry?.getAttribute?.('position');
    if (!position) continue;
    vertices += position.count;
    for (let i = 0; i < position.count * 3; i++) {
      assert.ok(Number.isFinite(position.array[i]), `${mesh.name} has a non-finite coordinate`);
    }
  }
  assert.ok(vertices > 20000, `vertices ${vertices}`);
  assert.equal(park.stats.oceanParkColliders, park.colliders.length);
  assert.equal(park.landmarks.length, 2);
});

test('Ocean Park preserves the input DTM and respects higher surfaces', () => {
  const park = build();
  for (const [x, z] of [[1280, 5300], [1560, 4600], [1720, 3900], [1500, 4200]]) {
    const raw = terrain.rawHongKongTerrainHeight(x, z);
    assert.ok(Math.abs(park.groundHeightAt(x, z, raw) - raw) < 1e-6, `flattened at ${x},${z}`);
    assert.equal(park.groundHeightAt(x, z, raw + 10), raw + 10);
  }
  // No pad is registered for the park, because it is a hill park rather than a platform.
  assert.equal(terrain.HONG_KONG_TERRAIN_META.oceanParkPadHeight, undefined);
});
