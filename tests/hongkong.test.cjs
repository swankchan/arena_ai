const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const { loadModule } = require('./helpers/module.cjs');

const read = (path) => readFileSync(join(__dirname, '..', path), 'utf8');
const CJK = /[\u3400-\u9fff]/;
let geo;
let meta;
let registry;

test.before(async () => {
  geo = (await import('../js/hk-geodata.js')).GEO;
  meta = await import('../js/cities/hongkong/meta.js');
  registry = await import('../js/cities/registry.js');
});

test('Hong Kong is a full-detail city pack in the registry', () => {
  const city = registry.getCity('hongkong');
  assert.ok(city, 'registry exposes Hong Kong');
  assert.match(city.name, /香港/);
  assert.match(city.tagline, CJK);
  assert.match(city.description, CJK);
  assert.equal(city.badge, 'Full detail');
  assert.match(read('js/cities/hongkong/index.js'), /id:\s*'hongkong'/);
  assert.match(read('js/cities/hongkong/index.js'), /build\s*\(/);
  assert.match(read('js/cities/hongkong/index.js'), /createMap/);
  assert.match(read('js/cities/hongkong/index.js'), /createAudio/);
});

test('the emitted geodata covers both shores of Victoria Harbour at street level', () => {
  assert.equal(geo.city, 'hongkong');
  assert.ok(geo.land.length >= 2, 'island and Kowloon are separate land masses');
  assert.ok(geo.blocks.length >= 1500, `${geo.blocks.length} real blocks`);
  assert.ok(geo.roads.length >= 5000, `${geo.roads.length} street polylines`);
  assert.ok(Object.keys(geo.landmarks).length >= 100, 'named tall buildings');
  assert.ok(geo.parks.length >= 300, 'parks and gardens');

  const width = geo.bounds.maxX - geo.bounds.minX;
  const depth = geo.bounds.maxZ - geo.bounds.minZ;
  assert.ok(width >= 5000 && depth >= 5000, `detailed core is ${Math.round(width)} x ${Math.round(depth)} m`);

  // The drivable graph must reach Central, Tsim Sha Tsui and Mong Kok. Keeping only the largest connected component
  // used to leave the whole island without a graph.
  const nodes = geo.roadGraph.nodes;
  const nearest = (x, z) => {
    let best = Infinity;
    for (let i = 0; i + 1 < nodes.length; i += 2) best = Math.min(best, Math.hypot(nodes[i] - x, nodes[i + 1] - z));
    return best;
  };
  assert.ok(nearest(0, 0) < 120, 'a road node near Statue Square');
  assert.ok(nearest(1298, -1417) < 120, 'a road node at Tsim Sha Tsui');
  assert.ok(nearest(1010, -4141) < 120, 'a road node at Mong Kok');
  assert.ok(geo.roadGraph.links.length >= 9000, `${geo.roadGraph.links.length} drivable links`);
});

test('street, park and place names are Chinese', () => {
  const named = geo.roads.filter((road) => road[0]);
  assert.ok(named.length > geo.roads.length * 0.8, 'most streets are named');
  const names = new Set(named.map((road) => road[0]));
  for (const expected of ['彌敦道', '梳士巴利道', '干諾道中', '軒尼詩道', '皇后大道中']) {
    assert.ok(names.has(expected), `${expected} is on the map`);
  }
  assert.ok([...names].filter((name) => CJK.test(name)).length >= 500, 'hundreds of Chinese street names');
  assert.ok(meta.ROAD_NAMES.has('彌敦道'));
  assert.ok(meta.PLACE_NAMES.has('中環'));
  assert.ok(meta.PLACE_NAMES.has('尖沙咀'));
  assert.ok(meta.PLACE_NAMES.has('旺角'));
  assert.ok(meta.PLACE_NAMES.has('維多利亞港'));
});

test('the lot layout fills the real blocks without using real building footprints', () => {
  let lots = 0;
  let area = 0;
  for (const block of geo.blocks) {
    for (const frame of block[5] || [[0, 0, 0, block[1]]]) {
      for (const [u0, u1, v0, v1] of frame[3]) {
        lots++;
        area += (u1 - u0) * (v1 - v0);
      }
    }
  }
  assert.ok(lots >= 3500, `${lots} procedural lots`);
  assert.ok(area >= 4e6, `${(area / 1e6).toFixed(1)} km² of lots`);
});

test('location labels resolve Chinese street corners, landmarks and districts', () => {
  const nathan = geo.roads.find((road) => road[0] === '彌敦道');
  const [x, z] = [nathan[5][0], nathan[5][1]];
  assert.match(meta.locationLabel(x, z), /彌敦道/);

  const central = meta.locationLabel(0, 0);
  assert.match(central, CJK);
  assert.ok(meta.PLACE_NAMES.has(central) || central.includes(' & ') || meta.ROAD_NAMES.has(central), 'label is renderable by the HUD');

  const tst = meta.locationLabel(geo.points.tsimShaTsui[0], geo.points.tsimShaTsui[1]);
  assert.match(tst, CJK);
});

test('teleports cover both shores with Chinese names', () => {
  const names = meta.TELEPORTS.map((point) => point.name).join(' ');
  for (const place of ['中環', '尖沙咀', '旺角', '銅鑼灣']) assert.match(names, new RegExp(place));
  assert.ok(meta.TELEPORTS.length >= 5);
  for (const point of meta.TELEPORTS) {
    assert.match(point.name, CJK);
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.z));
    assert.ok(point.x >= geo.bounds.minX && point.x <= geo.bounds.maxX);
    assert.ok(point.z >= geo.bounds.minZ && point.z <= geo.bounds.maxZ);
    assert.ok(Number.isFinite(point.heading));
  }
});

test('the map draws Chinese labels with a CJK-capable font stack', () => {
  const source = read('js/cities/hongkong/map.js');
  assert.match(source, /Noto Sans TC|PingFang TC|Microsoft JhengHei|Noto Sans CJK/);
  assert.match(source, /AREA_LABELS|PLACE_NAMES/);
  assert.match(source, /landmark/i);
});

// Colliders handed to the player: rotated lots and diagonal seawalls must use their true footprint. An axis-aligned
// box around either bulges into the street; js/controllers.js honours `obb`, so these tests pin that contract.
const colliders = loadModule(read('js/cities/hongkong/colliders.js'));

test('oriented colliders keep diagonal seawalls and rotated lots off the streets', () => {
  assert.match(read('js/cities/hongkong/world.js'), /segmentWall\(/);
  assert.match(read('js/cities/hongkong/world.js'), /obb:\s*lotObb\(/);

  const wall = colliders.segmentWall(0, 0, 80, 80);
  assert.ok(wall?.obb, 'a coastline segment produces an oriented wall');
  assert.equal(colliders.colliderContains(wall, 40, 40, 0), true, 'the seawall itself is solid');
  assert.equal(colliders.colliderContains(wall, 10, 70, 0), false, 'inland point stays outside the wall');
  assert.equal(colliders.colliderContains({ ...wall, obb: undefined }, 10, 70, 0), true,
    'the axis-aligned wall would have blocked roads behind it');

  const lot = { x: 0, z: 0, w: 20, d: 10, ry: Math.PI / 4 };
  const box = { minX: -10.61, maxX: 10.61, minZ: -10.61, maxZ: 10.61, obb: colliders.lotObb(lot) };
  assert.equal(colliders.colliderContains(box, 9.19, -3.54, 0), true, 'the rotated footprint is solid');
  assert.equal(colliders.colliderContains(box, 10.5, 10.5, 0), false, 'the AABB corner is street, not building');
  assert.equal(colliders.colliderContains({ ...box, obb: undefined }, 10.5, 10.5, 0), true,
    'without the OBB the same corner becomes an invisible wall');
});

// Rebuild the world's colliders exactly as world.js hands them to the player, then sweep the drivable graph.
function hongKongColliders() {
  const list = [];
  for (const ring of geo.land) {
    for (let i = 0; i + 3 < ring.length; i += 2) {
      const wall = colliders.segmentWall(ring[i], ring[i + 1], ring[i + 2], ring[i + 3]);
      if (wall) list.push({ ...wall, kind: 'coast' });
    }
  }
  for (const landmark of Object.values(geo.landmarks)) {
    if (!Number.isFinite(landmark.h) || landmark.h < 4) continue;
    const w = Math.max(4, landmark.w || 0, Math.sqrt(landmark.area || 0));
    const d = Math.max(4, landmark.d || 0, Math.sqrt(landmark.area || 0));
    list.push({
      minX: landmark.x - w / 2, maxX: landmark.x + w / 2,
      minZ: landmark.z - d / 2, maxZ: landmark.z + d / 2,
      kind: 'landmark'
    });
  }
  const framePoint = (th, px, pz, u, v) => {
    const cs = Math.cos(th), sn = Math.sin(th);
    return [px + (u - px) * cs + (v - pz) * sn, pz - (u - px) * sn + (v - pz) * cs];
  };
  for (const block of geo.blocks) {
    for (const [th, px, pz, rects] of block[5] || [[0, 0, 0, block[1]]]) {
      for (const [u0, u1, v0, v1] of rects) {
        const corners = [
          framePoint(th, px, pz, u0, v0), framePoint(th, px, pz, u1, v0),
          framePoint(th, px, pz, u1, v1), framePoint(th, px, pz, u0, v1)
        ];
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (const [x, z] of corners) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
        }
        const [x, z] = framePoint(th, px, pz, (u0 + u1) / 2, (v0 + v1) / 2);
        list.push({
          minX, maxX, minZ, maxZ, kind: 'building',
          obb: colliders.lotObb({ x, z, w: u1 - u0, d: v1 - v0, ry: th })
        });
      }
    }
  }
  return list;
}

function indexColliders(list) {
  const CELL = 64;
  const cells = new Map();
  const key = (ix, iz) => ix * 100003 + iz;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    for (let ix = Math.floor(c.minX / CELL); ix <= Math.floor(c.maxX / CELL); ix++) {
      for (let iz = Math.floor(c.minZ / CELL); iz <= Math.floor(c.maxZ / CELL); iz++) {
        const k = key(ix, iz);
        let cell = cells.get(k);
        if (!cell) cells.set(k, (cell = []));
        cell.push(i);
      }
    }
  }
  return (x, z) => {
    const cell = cells.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (!cell) return null;
    for (const i of cell) if (colliders.colliderContains(list[i], x, z, 0.4)) return list[i];
    return null;
  };
}

test('Hong Kong traffic routes collisions through the shared solver', () => {
  const traffic = read('js/cities/hongkong/traffic.js');
  assert.match(traffic, /from '\.\/collision\.js'/);
  assert.match(traffic, /updateFollowCaps\(near\)/);
  assert.match(traffic, /collideTraffic\(near, dt\)/);
  assert.match(traffic, /collidePlayer\(near, dt, controllerManager\)/);
  assert.match(read('js/cities/hongkong/index.js'), /traffic\.update\(dt, controllerManager\)/);
});

test('Hong Kong colliders leave the drivable graph clear', () => {
  const list = hongKongColliders();
  const blockedAt = indexColliders(list);
  const nodes = geo.roadGraph.nodes;
  const links = geo.roadGraph.links;
  let total = 0, blocked = 0;
  const byKind = {};

  for (const link of links) {
    if (link[3] < 7.4) continue;
    const points = [[nodes[link[0] * 2], nodes[link[0] * 2 + 1]]];
    for (let i = 0; i + 1 < link[6].length; i += 2) points.push([link[6][i], link[6][i + 1]]);
    points.push([nodes[link[1] * 2], nodes[link[1] * 2 + 1]]);
    let length = 0;
    for (let i = 1; i < points.length; i++) length += Math.hypot(
      points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    if (length < 100) continue; // traffic.js only drives links at least 100 m long

    for (let i = 1; i < points.length; i++) {
      const ax = points[i - 1][0], az = points[i - 1][1];
      const bx = points[i][0], bz = points[i][1];
      const segment = Math.hypot(bx - ax, bz - az);
      const steps = Math.max(1, Math.ceil(segment / 5));
      for (let s = 0; s < steps; s++) {
        const t = (s + 0.5) / steps;
        const metres = segment / steps;
        total += metres;
        const c = blockedAt(ax + (bx - ax) * t, az + (bz - az) * t);
        if (c) {
          blocked += metres;
          byKind[c.kind] = (byKind[c.kind] || 0) + metres;
        }
      }
    }
  }

  assert.ok(total > 100000, `${Math.round(total)} drivable metres sampled`);
  assert.ok((byKind.building || 0) < 1500,
    `buildings block ${Math.round(byKind.building || 0)} m of road; OBBs should keep this near zero`);
  assert.ok((byKind.coast || 0) < 100,
    `seawalls block ${Math.round(byKind.coast || 0)} m of road; they should be thin oriented walls`);
  assert.ok(blocked < total * 0.04,
    `${(100 * blocked / total).toFixed(2)}% of the drivable graph is inside a collider`);
});


test('the Hong Kong taxi has a dedicated Crown Comfort body spec', () => {
  const source = read('js/actor-models.js');
  const start = source.indexOf('BODY_SPECS.hkTaxi');
  const end = source.indexOf('\nfor (const spec of Object.values(BODY_SPECS))', start);
  assert.ok(start > 0 && end > start, 'hkTaxi is declared before the spec loop');
  const hk = source.slice(start, end);
  assert.match(hk, /name: 'hkTaxi'/);
  assert.match(hk, /sign: true/);
  assert.match(hk, /zFront: 2\.25/);
  assert.match(hk, /zRear: -2\.25/);
  assert.match(hk, /\[0, 0\.86\]/);
  assert.match(hk, /roofY: \[\[0\.20, 1\.49\]/);
  assert.match(hk, /bumpers: \[\[0\.45, 0\.085\], \[0\.48, 0\.09\]\]/);
  assert.match(source, /BODY_SPECS\.taxi = Object\.assign\(\{\}, BODY_SPECS\.sedan/);
});

test('the taxi material takes a livery mode and keeps the New York badge gated', () => {
  const source = read('js/actor-models.js');
  assert.match(source, /const livery = options\.livery \?\? \(options\.taxiLivery === false \? 'none' : 'nyc'\)/);
  assert.match(source, /`\$\{spec\.name\}_\$\{fixedColorHex \?\? 'instanced'\}_\$\{livery\}`/);
  assert.match(source, /spec\.sign && livery === 'nyc'/);
});

test('the player car resolves body, paint and livery from the taxi catalog', () => {
  const source = read('js/controllers.js');
  assert.match(source, /from '\.\/taxi-styles\.js'/);
  assert.match(source, /getTaxiStyle\(carTheme\.taxiStyle\)/);
  assert.match(source, /BODY_SPECS\[style\?\.body\]/);
  assert.match(source, /createLoftedCarMaterial\(spec, paint, \{ livery \}\)/);
  assert.match(source, /style\?\.plate/);
  assert.match(source, /style\?\.doorDecal === 'nyc'/);
});

test('the Hong Kong theme selects the Crown Comfort taxi style', () => {
  const source = read('js/cities/hongkong/index.js');
  assert.match(source, /const TAXI_STYLE = 'hk-urban'/);
  assert.match(source, /taxiStyle: TAXI_STYLE/);
  assert.doesNotMatch(source, /taxiLivery: false/);
});

test('Hong Kong livery paints a silver roof, black trim and chrome nose', () => {
  const source = read('js/actor-models.js');
  for (const token of ['hkRoof', 'hkLower', 'hkStrip', 'hkGrille', 'hkGrilleSurround', 'hkHeadlightBezel']) {
    assert.match(source, new RegExp(`const ${token} = livery === 'hk'`), `${token} is livery-gated`);
  }
  assert.match(source, /hkRoof/);
  assert.match(source, /max\(hkLower, hkStrip\)/);
  assert.match(source, /body = mix\(body, color\(0xf2f4f5\), plateFront\)/);
  assert.match(source, /one\.sub\(max\(glass, seal, chromeBelt\)\)/);
});

test('Hong Kong livery adds door lettering, a seat sticker and a roof sign texture', () => {
  const source = read('js/actor-models.js');
  assert.match(source, /function hkTaxiSideTexture\(\)/);
  assert.match(source, /function hkTaxiSignTexture\(\)/);
  assert.match(source, /c\.width = 2048/);
  assert.match(source, /TAXI 4 SEATS/);
  assert.match(source, /的士/);
  assert.match(source, /const hkDecal = /);
  assert.match(source, /hkTaxiSideTexture\(\)/);
  assert.match(source, /hkTaxiSignTexture\(\), vec2/);
  assert.match(source, /one\.sub\(signU\)/);
});

test('Hong Kong traffic renders taxis with the catalog body and livery', () => {
  const traffic = read('js/cities/hongkong/traffic.js');
  assert.match(traffic, /from '\.\.\/\.\.\/taxi-styles\.js'/);
  assert.match(traffic, /getTaxiStyle\(taxiStyle\)/);
  assert.match(traffic, /buildCarGeometry\(taxiSpec, false\)/);
  assert.match(traffic, /createLoftedCarMaterial\(taxiSpec, null, \{ livery: style\.livery \}\)/);
  assert.match(traffic, /'HongKongTaxis'/);
  assert.match(traffic, /taxiSlot/);
  assert.match(traffic, /privateSlot/);
  assert.match(traffic, /vehicle\.taxi/);
  assert.doesNotMatch(traffic, /TAXI_RED/);

  const index = read('js/cities/hongkong/index.js');
  assert.equal((index.match(/taxiStyle: TAXI_STYLE/g) || []).length, 2, 'theme and traffic call both use the style');
});