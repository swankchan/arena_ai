const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const { loadModule } = require('./helpers/module.cjs');

const read = (path) => readFileSync(join(__dirname, '..', path), 'utf8');
const CJK = /[\u3400-\u9fff]/;
let geo;
let meta;
let fullMeta;
let registry;
let aidGeometry;
let hkFrame;

test.before(async () => {
  geo = (await import('../js/hk-geodata.js')).GEO;
  meta = await import('../js/cities/hongkong/meta.js');
  fullMeta = await import('../js/cities/hongkong/full-meta.js');
  registry = await import('../js/cities/registry.js');
  aidGeometry = await import('../js/cities/hongkong/traffic-aid-geometry.js');
  const { default: config } = await import('../tools/cities/hongkong/config.mjs');
  const { makeFrame } = await import('../tools/geo/frame.mjs');
  hkFrame = makeFrame(config.frame);
});

test('Hong Kong is a unified full-territory city pack in the registry', () => {
  const city = registry.getCity('hongkong');
  assert.ok(city, 'registry exposes Hong Kong');
  assert.match(city.name, /香港/);
  assert.match(city.tagline, CJK);
  assert.match(city.description, CJK);
  assert.equal(city.badge, 'Full Hong Kong');
  assert.match(read('js/cities/hongkong/index.js'), /id:\s*'hongkong'/);
  assert.match(read('js/cities/hongkong/index.js'), /build\s*\(/);
  assert.match(read('js/cities/hongkong/index.js'), /createMap/);
  assert.match(read('js/cities/hongkong/index.js'), /createAudio/);
});

test('the emitted geodata covers both shores of Victoria Harbour at street level', () => {
  assert.equal(geo.city, 'hongkong');
  assert.ok(geo.land.length >= 2, 'island and Kowloon are separate land masses');
  assert.ok(geo.blocks.length >= 2500, `${geo.blocks.length} real blocks in the expanded core`);
  assert.ok(geo.roads.length >= 10000, `${geo.roads.length} street polylines in the expanded core`);
  assert.ok(Object.keys(geo.landmarks).length >= 150, 'named tall buildings');
  assert.ok(geo.parks.length >= 700, 'parks and gardens');

  const width = geo.bounds.maxX - geo.bounds.minX;
  const depth = geo.bounds.maxZ - geo.bounds.minZ;
  assert.ok(width >= 8200 && depth >= 7900, `expanded detailed core is ${Math.round(width)} x ${Math.round(depth)} m`);

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
  assert.ok(nearest(-2760, -519) < 120, 'a road node at Kennedy Town');
  assert.ok(nearest(5139, -843) < 120, 'a road node at Quarry Bay');
  assert.ok(nearest(-346, -5676) < 120, 'a road node at Cheung Sha Wan');
  assert.ok(nearest(1843, -5670) < 120, 'a road node at Kowloon Tong');
  assert.ok(geo.roadGraph.links.length >= 18000, `${geo.roadGraph.links.length} drivable links in the expanded core`);
});

test('Geofabrik extraction preserves provenance and complete nonempty cache layers', () => {
  const manifest = JSON.parse(read('tools/data/hongkong/extraction-manifest.json'));
  const source = JSON.parse(read('tools/data/hongkong/source-manifest.json'));
  assert.equal(manifest.sha256, source.sha256);
  assert.match(manifest.sha256, /^[a-f0-9]{64}$/);
  assert.match(manifest.sourceTimestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.ok(source.bytes > 1000000, 'the provenance describes a real PBF, not an empty placeholder');
  assert.deepEqual(manifest.bounds, { south: 22.2655, west: 114.1315, north: 22.337, east: 114.212 });

  for (const [filename, count] of Object.entries(manifest.counts)) {
    const cache = JSON.parse(read(`tools/data/hongkong/${filename}`));
    assert.ok(count > 0, `${filename} is nonempty`);
    assert.equal(cache.elements.length, count, `${filename} count matches its manifest`);
    assert.equal(cache.source.sha256, manifest.sha256, `${filename} comes from the recorded PBF`);
    const ids = new Set();
    for (const element of cache.elements) {
      assert.ok(Number.isFinite(element.id), `${filename} has real OSM ids`);
      assert.ok(element.type === 'way' || element.type === 'relation');
      if (element.type === 'way') assert.ok(element.geometry.length >= 2, `${filename} retains way geometry`);
      else assert.ok(element.members.length > 0, `${filename} retains relation members`);
      ids.add(`${element.type}:${element.id}`);
    }
    assert.equal(ids.size, cache.elements.length, `${filename} has no duplicate elements`);
  }
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
  for (const place of ['石塘咀', '堅尼地城', '天后', '鰂魚涌', '大坑', '跑馬地', '大角咀', '何文田', '土瓜灣', '深水埗', '長沙灣', '石硤尾', '九龍塘']) {
    assert.ok(meta.PLACE_NAMES.has(place), `${place} is labelled in the expanded core`);
  }
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

test('teleports cover the detailed core and territory-wide roads with Chinese names', () => {
  const names = meta.TELEPORTS.map((point) => point.name).join(' ');
  for (const place of ['中環', '尖沙咀', '旺角', '銅鑼灣', '石塘咀', '堅尼地城', '跑馬地', '鰂魚涌', '深水埗', '九龍塘', '屯門', '元朗', '沙田', '西貢', '東涌', '大澳', '長洲', '榕樹灣', '沙頭角']) {
    assert.match(names, new RegExp(place));
  }
  assert.ok(meta.TELEPORTS.length >= 23);
  for (const point of meta.TELEPORTS) {
    assert.match(point.name, CJK);
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.z));
    if (fullMeta.isDetailedCore(point.x, point.z)) {
      assert.ok(point.x >= geo.bounds.minX && point.x <= geo.bounds.maxX);
      assert.ok(point.z >= geo.bounds.minZ && point.z <= geo.bounds.maxZ);
    } else {
      assert.ok(point.x >= fullMeta.FULL_BOUNDS.minX && point.x <= fullMeta.FULL_BOUNDS.maxX);
      assert.ok(point.z >= fullMeta.FULL_BOUNDS.minZ && point.z <= fullMeta.FULL_BOUNDS.maxZ);
      assert.ok(fullMeta.isTerritoryRoad(point.x, point.z, 1), `${point.name} arrives on a real OSM road`);
    }
    assert.ok(Number.isFinite(point.heading));
  }
  for (const id of ['kennedytown', 'shektongtsui', 'happyvalley', 'quarrybay', 'shamshuipo', 'kowloontong', 'tuenmun', 'yuenlong', 'shatin', 'saikung', 'tungchung', 'taio', 'muiwo', 'cheungchau', 'lamma', 'shataukok']) {
    const point = meta.TELEPORTS.find((candidate) => candidate.id === id);
    assert.ok(meta.nearestRoads(point.x, point.z, 45).length > 0, `${point.name} snaps to a real road`);
  }
});

test('the map draws Chinese labels with a CJK-capable font stack', () => {
  const source = read('js/cities/hongkong/map.js');
  assert.match(source, /Noto Sans TC|PingFang TC|Microsoft JhengHei|Noto Sans CJK/);
  assert.match(source, /AREA_LABELS|PLACE_NAMES/);
  assert.match(source, /landmark/i);
  assert.match(source, /全港總圖/);
  assert.match(source, /© OpenStreetMap contributors/);
  assert.doesNotMatch(source, /全香港 · 中環至旺角/);
});

// Colliders handed to the player: rotated lots and diagonal seawalls must use their true footprint. An axis-aligned
// box around either bulges into the street; js/controllers.js honours `obb`, so these tests pin that contract.
const colliders = loadModule(read('js/cities/hongkong/colliders.js'));

test('oriented colliders keep diagonal seawalls and rotated lots off the streets', () => {
  assert.match(read('js/cities/hongkong/world.js'), /segmentWall\(/);
  assert.match(read('js/cities/hongkong/world.js'), /obb:\s*lotObb\(/);

  const wall = colliders.segmentWall(0, 0, 80, 80);
  assert.ok(wall?.obb, 'a coastline segment produces an oriented wall');
  const bounds = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
  assert.equal(colliders.isDataBoundarySegment(-100, -100, 80, -100, bounds), true,
    'the artificial download frame is not a seawall');
  assert.equal(colliders.isDataBoundarySegment(-100, -90, 80, -90, bounds), false,
    'an inland coast segment remains protected');
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
      const x1 = ring[i], z1 = ring[i + 1], x2 = ring[i + 2], z2 = ring[i + 3];
      if (colliders.isDataBoundarySegment(x1, z1, x2, z2, geo.bounds)) continue;
      const wall = colliders.segmentWall(x1, z1, x2, z2);
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
  for (const id of ['kennedytown', 'shektongtsui', 'happyvalley', 'quarrybay', 'shamshuipo', 'kowloontong']) {
    const point = meta.TELEPORTS.find((candidate) => candidate.id === id);
    assert.equal(blockedAt(point.x, point.z), null, `${point.name} spawn is clear of solid geometry`);
  }
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
  assert.match(hk, /wheelZ: 1\.39/);
  assert.match(hk, /sill: \[\[2\.25, 0\.24\].*\[-2\.25, 0\.25\]\]/);
  assert.match(hk, /cowl: 1\.0/);
  assert.match(hk, /roofFront: 0\.48/);
  assert.match(hk, /roofY: \[\[0\.48, 1\.49\]/);
  assert.match(hk, /intake: \[0\.3, 0\.55, 0\.04\]/);
  assert.match(hk, /bumpers: \[\[0\.49, 0\.11\], \[0\.5, 0\.105\]\]/);
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
  assert.match(source, /frontPlate\.position\.set\(0, spec\.plates\[0\], spec\.zFront \+ 0\.04\)/);
});

test('the Hong Kong theme selects the Crown Comfort taxi style', () => {
  const source = read('js/cities/hongkong/index.js');
  assert.match(source, /const TAXI_STYLE = 'hk-urban'/);
  assert.match(source, /taxiStyle: TAXI_STYLE/);
  assert.doesNotMatch(source, /taxiLivery: false/);
});

test('Hong Kong livery paints a silver roof, black trim and chrome nose', () => {
  const source = read('js/actor-models.js');
  for (const token of ['hkRoof', 'hkLower', 'hkStrip', 'hkGrille', 'hkGrilleSurround', 'hkHeadlightBezel', 'hkCrown', 'hkFog', 'hkFogBezel', 'hkPlateFront', 'hkStripInsert', 'hkBumperInsert']) {
    assert.match(source, new RegExp(`const ${token} = livery === 'hk'`), `${token} is livery-gated`);
  }
  assert.match(source, /hkRoof/);
  assert.match(source, /max\(hkLower, hkStrip\)/);
  assert.match(source, /body = mix\(body, color\(0xf2f4f5\), plateFront\)/);
  assert.match(source, /one\.sub\(max\(glass, seal, chromeBelt\)\)/);
});

test('Hong Kong livery follows the two-line door lettering and LPG reference decals', () => {
  const source = read('js/actor-models.js');
  assert.match(source, /function hkTaxiSideTexture\(\)/);
  assert.match(source, /function hkTaxiFrontTexture\(\)/);
  assert.match(source, /function hkTaxiSignTexture\(\)/);
  assert.match(source, /c\.width = 2048/);
  assert.match(source, /TAXI 5 SEATS/);
  assert.doesNotMatch(source, /TAXI 4 SEATS/);
  assert.doesNotMatch(source, /seatSticker\(655\)/);
  assert.match(source, /的士/);
  assert.match(source, /drawHKTaxiGlyphs\(ctx, '的士', x, 135, 94, 44\)/);
  assert.match(source, /fillText\('TAXI', x, 255, 44\)/);
  assert.doesNotMatch(source, /fillText\('的', x, 100\)/);
  assert.doesNotMatch(source, /fillText\('士', x, 205\)/);
  assert.match(source, /石油氣的士/);
  assert.match(source, /LPG/);
  assert.match(source, /lpgAdvertisement\(434\)/);
  assert.match(source, /lpgFender\(232\)/);
  assert.match(source, /const turnFront = livery === 'hk'/);
  assert.match(source, /hkLugNuts/);
  assert.match(source, /hkPillars/);
  assert.match(source, /windowCol = mix\(windowCol, color\(0xc9c9c3\), hkPillars\)/);
  assert.match(source, /color\(0xc0c4c5\)/);
  assert.match(source, /lettering\(715\)/);
  assert.match(source, /lettering\(1333\)/);
  assert.match(source, /hkHandleOuter/);
  assert.match(source, /const hkDecal = /);
  assert.match(source, /const hkFrontDecal = /);
  assert.match(source, /hkTaxiSideTexture\(\)/);
  assert.match(source, /hkTaxiFrontTexture\(\)/);
  assert.match(source, /hkTaxiSignTexture\(\), vec2/);
  assert.match(source, /one\.sub\(signU\)/);
  assert.match(source, /signTex\.g/);
});

test('Hong Kong taxi follows the supplied roof-sign, rear-detail and plate references', () => {
  const source = read('js/actor-models.js');
  assert.match(source, /taillight: \[0\.57, 0\.69, 0\.29, 0\.115\]/);
  assert.match(source, /function hkTaxiRearTexture\(\)/);
  assert.match(source, /ctx\.translate\(512, 128\)/, 'Toyota emblem sits lower on the trunk');
  assert.match(source, /ctx\.translate\(190, 315\)/, 'five-seat sticker sits on the left of the rear bumper');
  assert.match(source, /spec\.name === 'hkTaxi' \? 0\.5 : 0\.45/, 'roof sign is centred on the Crown Comfort roof');
  assert.match(source, /TOYOTA LPG20/);
  assert.match(source, /CROWN COMFORT/);
  assert.match(source, /function buildHKTaxiHardware\(spec\)/);
  assert.match(source, /CAR_PARTS\.CHROME/);
  assert.match(source, /hkRearDecal/);
  assert.match(source, /hkCarPlateTexture/);
  assert.match(source, /\[\['FS', '615'\]/);
  assert.match(source, /ctx\.font = '900 26px Arial, sans-serif'/);
  assert.match(source, /ctx\.font = '900 30px Arial, sans-serif'/);
  assert.match(source, /hkCarPlateTexture\(false\)/);
  assert.match(source, /hkFrontPlateColor, hkPlateFront/);
  assert.match(source, /TAXI 5 SEATS/);
  assert.doesNotMatch(source, /TAXI 4 SEATS/);

  const signStart = source.indexOf('function hkTaxiSignTexture()');
  const signEnd = source.indexOf('function createLoftedCarMaterial', signStart);
  const sign = source.slice(signStart, signEnd);
  assert.match(sign, /ctx\.scale\(420 \/ labelWidth, 1\)/);
  assert.match(sign, /ctx\.fillText\('TAXI', 0, 0\)/);
  assert.doesNotMatch(sign, /的士/, 'the roof face uses the large English TAXI lettering from the front photograph');

  const controllers = read('js/controllers.js');
  assert.match(controllers, /ctx\.font = '900 68px Arial, sans-serif'/);
  assert.match(controllers, /fillText\('FS', 128, 48/);
  assert.match(controllers, /ctx\.font = '900 74px Arial, sans-serif'/);
  assert.match(controllers, /fillText\('615', 128, 116/);
  assert.match(controllers, /rearPlateFrame/);
  assert.match(controllers, /frontPlateFrame/);
});

test('Hong Kong taxi has clean front glass, a smaller crown and red idle tail lenses', () => {
  const source = read('js/actor-models.js');
  assert.doesNotMatch(source, /hkTaxiWindscreenTexture|hkWindscreenDecal|hkWipers|windStickerTex/);
  assert.match(source, /const crownUV = vec2\(p\.x, p\.y\.sub\(grY\)\)\.div\(0\.8\)/);

  const tailStart = source.indexOf('const tailBase');
  const tailEnd = source.indexOf('body = mix(body, tailColor', tailStart);
  assert.ok(tailStart >= 0 && tailEnd > tailStart);
  const tail = source.slice(tailStart, tailEnd);
  assert.match(tail, /\? mix\(tailBase, color\(0xbac4c9\), reverseRearSection\)/);
  assert.match(tail, /: mix\(mix\(tailBase, color\(0xc56b18\), turnRearSection\)/);
  assert.match(source, /const turn = color\(0xff9a14\)/, 'amber remains available while indicating');
});

test('Hong Kong taxi has left and right fender repeaters without turning them into hazard lights', () => {
  const source = read('js/actor-models.js');
  assert.match(source, /const turnSide = livery === 'hk'/);
  assert.match(source, /p\.z\.sub\(cab\.cowl - 0\.06\), p\.y\.sub\(0\.72\)/);
  assert.match(source, /body = mix\(body, color\(0x9b5a17\), turnSide\)/);
  assert.match(source, /max\(max\(turnFront, turnRear\), turnSide\)\.mul\(blink\)/);
  assert.match(source, /const blink = max\(state\.y\.mul\(step\(0\.0, p\.x\)\), state\.z\.mul\(step\(p\.x, 0\.0\)\)\)/);
});

test('Hong Kong buses use a detailed two-deck model with instanced wheels and destination signs', () => {
  const actor = read('js/actor-models.js');
  assert.match(actor, /const HK_BUS_SPEC = /);
  assert.match(actor, /lowerWindow: \[1\.18, 2\.18\]/);
  assert.match(actor, /upperWindow: \[2\.72, 3\.68\]/);
  assert.match(actor, /axleZ: \[3\.55, -2\.25, -3\.55\]/);
  assert.match(actor, /const yF = 2\.43/);
  assert.match(actor, /hkBusSideDecalTexture/);
  assert.match(actor, /hkBusFrontDecalTexture/);
  assert.match(actor, /const isCitybus/);
  assert.match(actor, /cityRed/);
  assert.match(actor, /cityBlue/);
  assert.match(actor, /function buildHongKongBusBodyGeometry\(\)/);
  assert.match(actor, /buildBodyLoft\(HK_BUS_SPEC, 1\)/);
  assert.match(actor, /function buildHongKongBusSignGeometry\(\)/);
  assert.match(actor, /function createHongKongBusMaterial\(\)/);
  assert.match(actor, /frontLowerGlass/);
  assert.match(actor, /frontUpperGlass/);
  assert.match(actor, /attribute\('busPaint', 'vec3'\)/);

  const traffic = read('js/cities/hongkong/traffic.js');
  assert.match(traffic, /buildHongKongBusBodyGeometry/);
  assert.match(traffic, /buildHongKongBusSignGeometry/);
  assert.match(traffic, /createHongKongBusMaterial/);
  assert.match(traffic, /buildBusWheelGeo\(-1\)/);
  assert.match(traffic, /buildBusWheelGeo\(1\)/);
  assert.match(traffic, /createBusWheelMaterial/);
  assert.match(traffic, /busPaint/);
  assert.match(traffic, /HongKongBusBody/);
  assert.match(traffic, /HongKongBusSigns/);
  assert.match(traffic, /BUS_COUNT \* HK_BUS_SPEC\.axleZ\.length/);
  assert.match(traffic, /HK_BUS_SPEC\.axleZ\.entries\(\)/);
  assert.match(traffic, /SHAU KEI WAN/);
  assert.match(traffic, /筲箕灣/);
  assert.doesNotMatch(traffic, /new THREE\.BoxGeometry\(2\.52, 4\.0, 11\.2\)/);
  assert.doesNotMatch(traffic, /busGlass|busRoof/);
});

test('Hong Kong bus doors and side destination sign face the left-hand-traffic kerb', () => {
  const actor = read('js/actor-models.js');
  const materialStart = actor.indexOf('function createHongKongBusMaterial()');
  const material = actor.slice(materialStart, actor.indexOf('const HELI_PARTS', materialStart));
  assert.ok(materialStart > 0);
  assert.match(material, /const curb = step\(0\.0, p\.x\)/, 'model front is +z, so the left kerb side is +x');
  assert.match(material, /const d0 = door\(s\.frontDoor\[0\], s\.frontDoor\[1\]\)/);
  assert.match(material, /const d1 = door\(s\.middleDoor\[0\], s\.middleDoor\[1\]\)/);
  assert.match(material, /driverWin[\s\S]*?one\.sub\(curb\)/, 'right-hand-drive cab stays opposite the doors');

  const signStart = actor.indexOf('function buildHongKongBusSignGeometry()');
  const signs = actor.slice(signStart, actor.indexOf('let _hkBusLoftedMat', signStart));
  assert.ok(signStart > 0);
  assert.match(signs, /rotateY\(Math\.PI \/ 2\)/);
  assert.match(signs, /side\.translate\(carBodyHalfWidthAt\(s, 3\.55, 1\.67\) \+ 0\.008, 1\.67, 3\.55\)/);
});

test('Hong Kong traffic renders taxis with the catalog body and livery', () => {
  const traffic = read('js/cities/hongkong/traffic.js');
  assert.match(traffic, /from '\.\.\/\.\.\/taxi-styles\.js'/);
  assert.match(traffic, /getTaxiStyle\(taxiStyle\)/);
  assert.match(traffic, /buildCarGeometry\(taxiSpec, false\)/);
  assert.match(traffic, /createLoftedCarMaterial\(taxiSpec, null, \{ livery: style\.livery \}\)/);
  assert.match(traffic, /'HongKongTaxis'/);
  assert.match(traffic, /buildSteerableWheelGeo\(taxiSpec, -1\)/);
  assert.match(traffic, /buildSteerableWheelGeo\(taxiSpec, 1\)/);
  assert.match(traffic, /HongKongTaxiWheelLeft/);
  assert.match(traffic, /taxiSlot/);
  assert.match(traffic, /privateSlot/);
  assert.match(traffic, /vehicle\.taxi/);
  assert.doesNotMatch(traffic, /TAXI_RED/);

  const index = read('js/cities/hongkong/index.js');
  assert.equal((index.match(/taxiStyle: TAXI_STYLE/g) || []).length, 2, 'theme and traffic call both use the style');
});

test('the TIS_16 slice preserves all six layer counts, provenance and WGS84-to-world coordinates', () => {
  const aids = geo.trafficAids;
  const manifest = JSON.parse(read('tools/data/hongkong/traffic-aids/source.json'));
  assert.equal(geo.version, 3);
  assert.equal(aids.marks.length, 121);
  assert.equal(aids.crossings.length, 10);
  assert.equal(aids.yellowBoxes.length, 4);
  assert.equal(aids.yellowBoxPolygons.length, 0);
  assert.equal(aids.signals.length, 82);
  assert.equal(aids.source.sourceUpdated, '2026-04-24');
  assert.equal(aids.source.publisher, 'Hong Kong SAR Government Transport Department');
  assert.deepEqual(aids.bbox, [114.1585, 22.2807, 114.1612, 22.2827]);
  for (const [name, entry] of Object.entries(manifest.layers)) {
    assert.match(entry.query, new RegExp(`/${entry.layerId}/query\\?`));
    assert.match(entry.query, /geometry=114\.1585%2C22\.2807%2C114\.1612%2C22\.2827/);
    assert.match(entry.sha256, /^[0-9a-f]{64}$/);
    assert.ok(name.startsWith('DTAD_'));
  }

  const stop = aids.marks.find((mark) => mark.id === 60378 && mark.layer === 'DTAD_RD_MARK_LINE');
  const [x, z] = hkFrame.toWorld(114.159348, 22.280776);
  assert.ok(stop, 'the original OBJECTID survives the build');
  assert.ok(Math.abs(stop.parts[0][0] - x) <= 0.00101);
  assert.ok(Math.abs(stop.parts[0][1] - z) <= 0.00101);
});

test('surveyed paint renders every core feature with upward triangles and no invented zebra', () => {
  const data = aidGeometry.buildTrafficAidPaint(geo.trafficAids);
  assert.equal(data.stats.sourceRoadMarkFeatures, 121);
  assert.equal(data.stats.renderedRoadMarkFeatures, 121);
  assert.equal(data.stats.skippedRoadMarkFeatures, 0);
  assert.equal(data.stats.renderedCrossingFeatures, 10);
  assert.equal(data.stats.crossingStripes, 72);
  assert.equal(data.stats.signalCrossings, 10);
  assert.equal(data.stats.zebraCrossings, 0, 'no ZIGZAGL/R evidence exists in the Statue Square core');
  assert.equal(data.stats.openCrossingParts, 0);
  assert.equal(data.stats.touchingCrossingFaces, 0);
  assert.equal(data.stats.yellowBoxFeatures, 4);
  assert.equal(data.stats.yellowBoxPolygons, 0);
  assert.equal(data.position.length / 3, data.paint.length / 3);
  assert.equal(data.position.length / 3, data.side.length / 2);
  assert.equal(data.position.length / 3, data.color.length / 3);
  assert.ok(data.position.every(Number.isFinite));
  for (let i = 0; i < data.index.length; i += 3) {
    const [a, b, c] = data.index.slice(i, i + 3).map((index) => data.position.slice(index * 3, index * 3 + 3));
    const ux = b[0] - a[0], uz = b[2] - a[2], vx = c[0] - a[0], vz = c[2] - a[2];
    assert.ok(uz * vx - ux * vz > 0, `paint triangle ${i / 3} must face +Y`);
  }
});

test('RM1002 and RM1003 break opposite sides of the digitised direction', () => {
  for (const [type, leftDuty, rightDuty] of [['RM1002', 1, 1 / 6], ['RM1003', 1 / 6, 1]]) {
    const data = aidGeometry.buildTrafficAidPaint({
      marks: [{ id: 1, layer: 'DTAD_RD_MARK_LINE_C', type, parts: [[0, 0, 12, 0]] }],
      crossings: [], yellowBoxes: [], yellowBoxPolygons: [], signals: []
    });
    for (let i = 0; i < data.paint.length; i += 3) {
      const z = data.position[(i / 3) * 3 + 2];
      assert.ok(Math.abs(data.paint[i + 2] - (z < 0 ? leftDuty : rightDuty)) < 1e-8,
        `${type} has the wrong continuous/broken side at z=${z}`);
    }
  }
});

test('crossing faces include only enclosed stripes, including four loose edges, and keep ladder gaps empty', () => {
  const rings = [
    [0, 0, 0.5, 0, 0.5, 2, 0, 2, 0, 0],
    [1.5, 0, 2, 0, 2, 2, 1.5, 2, 1.5, 0]
  ];
  const aids = {
    marks: [], crossings: [{ id: 1, type: 'SOLID', parts: rings }],
    yellowBoxes: [], yellowBoxPolygons: [], signals: []
  };
  const data = aidGeometry.buildTrafficAidPaint(aids);
  assert.equal(data.stats.crossingStripes, 2);
  assert.equal(data.stats.signalCrossings, 1);
  assert.equal(data.stats.touchingCrossingFaces, 0);
  let area = 0;
  for (let i = 0; i < data.index.length; i += 3) {
    const [a, b, c] = data.index.slice(i, i + 3).map((index) => data.position.slice(index * 3, index * 3 + 3));
    area += Math.abs((b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0])) * 0.5;
  }
  assert.ok(Math.abs(area - 2) < 1e-8, 'two 0.5 x 2 m stripes and not the 2 x 2 m crossing outline');

  const loose = aidGeometry.crossingFaces([
    [0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 0, 0]
  ]);
  assert.equal(loose.faces.length, 1, 'four surveyed loose edges close one stripe');
  assert.equal(loose.touching, 0);

  const zebra = aidGeometry.buildTrafficAidPaint({
    ...aids,
    marks: [{ id: 2, type: 'ZIGZAGL', parts: [[0, 0, 0, 2]] }]
  });
  assert.equal(zebra.stats.zebraCrossings, 1, 'nearby surveyed zigzags are the white-zebra evidence');
});

test('coincident signal poles keep all 82 independently angled source heads', () => {
  const { assemblies, stats } = aidGeometry.clusterSignalPoints(geo.trafficAids.signals);
  assert.equal(stats.sourceSignalPoints, 82);
  assert.equal(stats.admittedSignalPoints, 82);
  assert.equal(stats.refusedSignalPoints, 0);
  assert.equal(stats.signalAssemblies, 44);
  assert.equal(stats.collapsedSignalPoints, 38);
  assert.equal(assemblies.reduce((sum, assembly) => sum + assembly.sourceCount, 0), 82);
  assert.equal(new Set(assemblies.flatMap((assembly) => assembly.ids)).size, 82);
  assert.equal(assemblies.flatMap((assembly) => assembly.codes).length, 82);
  assert.equal(assemblies.flatMap((assembly) => assembly.angles).length, 82);
  const heads = assemblies.flatMap((assembly) => assembly.heads);
  assert.equal(heads.length, 82, 'every official point gets its own housing, not one per pole');
  const sources = new Map(geo.trafficAids.signals.map((signal) => [signal.id, signal]));
  for (const head of heads) {
    const source = sources.get(head.id);
    assert.ok(source);
    assert.equal(head.code, source.code);
    assert.equal(head.angle, source.angle);
    assert.equal(head.x, source.x);
    assert.equal(head.z, source.z);
    assert.ok(Number.isFinite(aidGeometry.surveySignalHeading(head.angle)));
  }
  for (const [angle, expected] of [[0, 90], [90, 0], [180, -90], [270, -180]]) {
    assert.ok(Math.abs(aidGeometry.surveySignalHeading(angle) * 180 / Math.PI - expected) < 1e-9);
  }
  assert.equal(aidGeometry.surveySignalHeading(null), null);
});

test('crossing furniture follows stripe axes, faces back across the road and requires zebra evidence', () => {
  const rings = [
    [0, 0, 0.5, 0, 0.5, 2, 0, 2, 0, 0],
    [1.5, 0, 2, 0, 2, 2, 1.5, 2, 1.5, 0]
  ];
  const aids = {
    marks: [], crossings: [{ id: 1, type: 'SOLID', parts: rings }],
    yellowBoxes: [], yellowBoxPolygons: [], signals: []
  };
  const [layout] = aidGeometry.buildCrossingLayouts(aids);
  assert.ok(layout);
  assert.equal(layout.zebra, false);
  assert.ok(Math.abs(layout.roadWidth - 2) < 1e-8);
  assert.ok(Math.abs(layout.traffic[0] * layout.walking[0] + layout.traffic[1] * layout.walking[1]) < 1e-8);
  assert.equal(layout.endpoints.length, 2);
  for (const end of layout.endpoints) {
    const dx = layout.x - end.x, dz = layout.z - end.z;
    const length = Math.hypot(dx, dz);
    const facingDot = Math.sin(end.heading) * dx / length + Math.cos(end.heading) * dz / length;
    assert.ok(facingDot > 0.9999, 'the pedestrian head looks across the crossing, not away from it');
  }
  const zebra = aidGeometry.buildCrossingLayouts({
    ...aids, marks: [{ id: 2, type: 'ZIGZAGR', parts: [[0, 0, 0, 2]] }]
  });
  assert.equal(zebra[0].zebra, true);

  const core = aidGeometry.buildCrossingLayouts(geo.trafficAids);
  assert.equal(core.length, 10);
  assert.equal(core.filter((entry) => entry.zebra).length, 0);
  assert.equal(core.reduce((sum, entry) => sum + entry.endpoints.length, 0), 20);
});

test('Victoria Harbour combines displaced long swell with FFT chop and keeps the mean water level', () => {
  const water = read('js/cities/hongkong/harbour-water.js');
  const world = read('js/cities/hongkong/world.js');
  const shared = read('js/tsl-materials.js');
  assert.match(shared, /export function getWaterWaveTexture\(\)/);
  assert.match(water, /material\.positionNode/);
  assert.match(water, /longSwell\(worldXZ\)/);
  assert.match(water, /const slope = windWaves\.xy\.add\(swell\.yz\)/);
  assert.match(water, /omega = Math\.sqrt\(9\.81 \* k\)/);
  assert.match(water, /maximumLongSwellDisplacement/);
  assert.match(water, /meanDisplacement: 0/);
  assert.match(water, /segments = 384/);
  assert.match(world, /createHongKongHarbourWaterGeometry\(\)/);
  assert.match(world, /water\.position\.set\(waterCentre\[0\], WATER_LEVEL, waterCentre\[1\]\)/);
  assert.match(world, /const WATER_LEVEL = -2\.2/);
  assert.doesNotMatch(world, /waterNormal\.offset|createHarbourWaterMaterial/);
});

test('Hong Kong signal hardware keeps rounded housings, visors, pedestrian aspects and compatible merges', () => {
  const models = read('js/cities/hongkong/traffic-signal-models.js');
  const aids = read('js/cities/hongkong/traffic-aids.js');
  assert.match(models, /RoundedBoxGeometry/);
  assert.match(models, /Deep open half-round hood/);
  assert.match(models, /Unlit red standing man/);
  assert.match(models, /Unlit green walking man/);
  assert.match(models, /part\.index \? part\.toNonIndexed\(\) : part/);
  assert.match(models, /createBeaconPoleGeometry/);
  assert.match(aids, /for \(const head of assembly\.heads\)/);
  assert.match(aids, /signalHeads: headMatrices\.length/);
  assert.match(aids, /if \(layout\.zebra\)/);
  assert.doesNotMatch(aids, /PDSPO1|PedestrianSignPole/);
});

test('Hong Kong replaces procedural lane dashes with surveyed aids and never invents signal phases', () => {
  const world = read('js/cities/hongkong/world.js');
  const aids = read('js/cities/hongkong/traffic-aids.js');
  assert.match(world, /createHongKongTrafficAids\(root, \{ getGroundHeight \}\)/);
  assert.doesNotMatch(world, /road\.width < 10/);
  assert.doesNotMatch(world, /BoxGeometry\(0\.22, 0\.018, 3\.1\)/);
  assert.match(aids, /HongKongSurveyedRoadPaint/);
  assert.match(aids, /inert-no-official-phase-data/);
  assert.doesNotMatch(aids, /SIGNAL_TIMING|avenueAmber|streetAmber/);
});