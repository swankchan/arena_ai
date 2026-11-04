const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let cfa, terrain, roads, lamps, clearance;

test.before(async () => {
  cfa = await import('../js/cities/hongkong/court-of-final-appeal-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
});

function inside(ring, x, z) {
  let value = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) value = !value;
  }
  return value;
}
function pointSegmentDistance(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], lengthSq = dx * dx + dz * dz;
  const t = lengthSq ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / lengthSq)) : 0;
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function segmentsIntersect(a, b, c, d) {
  const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1];
  const denominator = cross(rx, rz, sx, sz); if (Math.abs(denominator) < 1e-9) return false;
  const qx = c[0] - a[0], qz = c[1] - a[1];
  const t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator;
  return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9;
}
function segmentDistance(a, b, c, d) {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(pointSegmentDistance(...a, c, d), pointSegmentDistance(...b, c, d), pointSegmentDistance(...c, a, b), pointSegmentDistance(...d, a, b));
}
function bounds(ring) {
  const xs = ring.filter((_, index) => index % 2 === 0), zs = ring.filter((_, index) => index % 2 === 1);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
}
function roadConflicts(ring) {
  const result = [], box = bounds(ring);
  for (const [recordIndex, road] of roads.entries()) {
    const [name, width, , , flags, flat] = road;
    for (let i = 2; i + 1 < flat.length; i += 2) {
      const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]], margin = width * .5 + 1;
      if (Math.max(a[0], b[0]) < box.minX - margin || Math.min(a[0], b[0]) > box.maxX + margin || Math.max(a[1], b[1]) < box.minZ - margin || Math.min(a[1], b[1]) > box.maxZ + margin) continue;
      let conflict = inside(ring, ...a) || inside(ring, ...b);
      for (let j = 0; j < ring.length - 2 && !conflict; j += 2) conflict = segmentDistance(a, b, [ring[j], ring[j + 1]], [ring[j + 2], ring[j + 3]]) < width * .5 - 1e-6;
      if (conflict) result.push({ recordIndex, name, width, flags, segment: i / 2 - 1 });
    }
  }
  return result;
}
function lampConflicts(ring) {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row])), suppressed = new Set(clearance.suppressed), result = [];
  for (let index = 0; index < lamps.length; index++) {
    if (suppressed.has(index)) continue;
    const lamp = lamps[index], override = overrides.get(index);
    const x = lamp[0] + (override?.[1] || 0) / 100, z = lamp[1] + (override?.[2] || 0) / 100;
    if (inside(ring, x, z)) result.push(index);
  }
  return result;
}

test('Court of Final Appeal preserves the exact Old Supreme Court OSM site and current way metadata', () => {
  const source = cfa.CFA_OSM_SOURCE;
  const raw = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/landmarks.json'), 'utf8'));
  const way = raw.elements.find((element) => element.type === 'way' && element.id === 42293414);
  assert.ok(way); assert.deepEqual(way.tags, source.tags);
  assert.deepEqual(way.geometry, source.geometry.map(({ lon, lat }) => ({ lon, lat })));
  assert.equal(raw.source.sha256, source.sourceSha256); assert.equal(raw.source.sourceTimestamp, source.sourceTimestamp);
  assert.equal(source.version, 16); assert.equal(source.wayTimestamp, '2025-01-22T03:29:37Z'); assert.equal(source.changeset, 161621742);
  assert.deepEqual(source.geometry.map((point) => point.id), [527732673, 527732674, 9634911144, 9634911145, 527732732, 527732733, 9634911147, 9634911146, 527732673]);
  assert.equal(source.geometry.length, 9); assert.equal(new Set(source.geometry.slice(0, -1).map((point) => point.id)).size, 8);
  assert.equal(source.tags['addr:housenumber'], '8'); assert.equal(source.tags['addr:street:en'], 'Jackson Road'); assert.equal(source.tags.amenity, 'courthouse');
  assert.equal(source.tags.building, 'civic'); assert.equal(source.tags.height, undefined); assert.equal(cfa.CFA_OSM_HEIGHT, null);
  assert.ok(Math.abs(cfa.CFA_RING_AREA - 2707.1590355240796) < 1e-8);
  assert.ok(Math.abs(cfa.CFA_SITE.w - 70.47303268388747) < 1e-9); assert.ok(Math.abs(cfa.CFA_SITE.d - 38.47818466673532) < 1e-9);
  assert.ok(Math.abs(cfa.CFA_SITE.ry - 1.2953121809507973) < 1e-12);
  for (const point of source.geometry) {
    const x = (point.lon - 114.1596) * 103056.81753522092, z = -(point.lat - 22.2819) * 110734.09626824585;
    const local = cfa.cfaWorldToLocal(x, z), roundTrip = cfa.cfaLocalToWorld(local.x, local.z);
    assert.ok(Math.hypot(roundTrip.x - x, roundTrip.z - z) < 1e-9);
  }
});

test('official history and visual conventions remain separate from the Former French Mission Building', () => {
  assert.equal(cfa.CFA_COMPLETION_YEAR, 1912); assert.equal(cfa.CFA_OFFICIAL_STOREYS, 3); assert.equal(cfa.CFA_OSM_LEVELS, 4);
  assert.equal(cfa.CFA_OFFICIAL_APPROX_SITE_LENGTH, 70); assert.equal(cfa.CFA_OFFICIAL_APPROX_SITE_WIDTH, 38);
  assert.equal(cfa.CFA_PUBLISHED_APPROX_HEIGHT, 40); assert.equal(cfa.CFA_HEIGHT, 40); assert.equal(cfa.CFA_PUBLISHED_THEMIS_HEIGHT, 2.7);
  assert.equal(cfa.CFA_ARCHITECTS, 'Aston Webb & E. Ingress Bell');
  assert.match(cfa.CFA_MAIN_ENTRANCE.evidence, /AMO HIA/); assert.match(cfa.CFA_MAIN_ENTRANCE.evidence, /no entrance-tagged node/);
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/court-of-final-appeal-architecture.js'), 'utf8');
  assert.match(source, /Former French Mission Building \(way 85320697\)/); assert.match(source, /1997 to 2015/);
  assert.notEqual(cfa.CFA_SITE.osmId, 85320697);
});

test('four facade frames, forty bays and the photo-directed west entrance are geometrically consistent', () => {
  assert.deepEqual(cfa.CFA_FACADES.map((facade) => [facade.id, facade.bays]), [['west', 13], ['east', 13], ['south', 7], ['north', 7]]);
  assert.equal(cfa.CFA_ARCADE_BAYS, 40); assert.equal(cfa.CFA_GIANT_COLUMNS, 40); assert.equal(cfa.CFA_DRUM_COLUMNS, 24); assert.equal(cfa.CFA_DOME_RIBS, 24);
  const frame = cfa.CFA_MAIN_ENTRANCE; assert.equal(frame.sourceEdge, 6); assert.equal(frame.nodeId, null); assert.match(frame.name, /west entrance facing Statue Square/);
  const i = frame.sourceEdge * 2;
  const midpoint = { x: (cfa.CFA_LOCAL_RING[i] + cfa.CFA_LOCAL_RING[i + 2]) * .5, z: (cfa.CFA_LOCAL_RING[i + 1] + cfa.CFA_LOCAL_RING[i + 3]) * .5 };
  assert.ok(Math.hypot(midpoint.x - frame.localX, midpoint.z - frame.localZ) < 1e-9);
  const outward = cfa.cfaFrameToWorld(frame, 0, 1); assert.ok(Math.hypot(outward.x - frame.x - frame.nx, outward.z - frame.z - frame.nz) < 1e-9);
  assert.ok(frame.nx < 0, 'principal front faces west towards Statue Square');
  for (const facade of cfa.CFA_FACADES) {
    const point = cfa.cfaFacadePoint(facade, 0, 12, 1); assert.ok(point.every(Number.isFinite));
    const collider = cfa.cfaFacadeCollider(facade, 0, -3, facade.length / facade.bays, .52, .24, 14.5);
    assert.ok([collider.minX, collider.maxX, collider.minZ, collider.maxZ, collider.minY, collider.maxY].every(Number.isFinite));
    assert.ok(collider.obb.hx > 0 && collider.obb.hz > 0);
  }
});

test('CFA has its own DTM pad, plaza offset and road-priority ground chain', () => {
  const meta = terrain.HONG_KONG_TERRAIN_META;
  assert.ok(Math.abs(meta.cfaPadHeight - 5.450927277384849) < 1e-9);
  assert.equal(meta.cfaPadHeight, terrain.rawHongKongTerrainHeight(cfa.CFA_SITE.x, cfa.CFA_SITE.z));
  assert.equal(terrain.hongKongTerrainHeight(cfa.CFA_SITE.x, cfa.CFA_SITE.z), meta.cfaPadHeight);
  assert.equal(cfa.CFA_PLAZA_TOP, .24); assert.equal(cfa.CFA_GROUND_RINGS.length, 1); assert.equal(cfa.CFA_GROUND_RINGS[0], cfa.CFA_SITE.ring);
  const grounds = { plaza: meta.cfaPadHeight + cfa.CFA_PLAZA_TOP };
  assert.ok(Math.abs(cfa.cfaGroundHeightAt(cfa.CFA_MAIN_ENTRANCE.x, cfa.CFA_MAIN_ENTRANCE.z, 999, grounds) - 5.69092727738485) < 1e-9);
  assert.equal(cfa.cfaGroundHeightAt(0, 0, 999, grounds), 999);
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  const elevation = fs.readFileSync(path.join(root, 'js/cities/hongkong/road-elevation.js'), 'utf8');
  assert.match(simple, /!groundUsesRoad \? courtOfFinalAppeal\.groundHeightAt\(x, z, twoExchangeGround\) : twoExchangeGround/);
  assert.match(elevation, /\.\.\.CFA_GROUND_RINGS/);
});

test('the exact site has no road-centreline, carriageway or clearance-adjusted street-lamp conflict', () => {
  assert.deepEqual(roadConflicts(cfa.CFA_SITE.ring), []);
  assert.deepEqual(lampConflicts(cfa.CFA_SITE.ring), []);
});

test('hand-built world includes the photographed classical, sculptural, dome and Chinese-roof identifiers', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/court-of-final-appeal-world.js'), 'utf8');
  for (const pattern of [
    /CourtOfFinalAppealFourSideDoubleHeightColonnades/, /CourtOfFinalAppealIonicVolutesBalustradesCornicesAndKeystones/,
    /CourtOfFinalAppealIdenticalTimberWindowsDoorsAndFanlights/, /CourtOfFinalAppealWestPedimentRoyalArmsAndThemis/,
    /CourtOfFinalAppealRoyalShieldLionsScottishLionAndIrishHarp/, /CourtOfFinalAppealRoyalMottoDieuEtMonDroit/,
    /CourtOfFinalAppealRoyalCypher\$\{letter\}/, /CourtOfFinalAppealErectedAdMdccccxCarvedInscription/,
    /CourtOfFinalAppealRoyalCoatOfArmsTruthMercyAndBlindfoldedThemis/, /CourtOfFinalAppealSquareBaseOpenDrumRibbedDomeLanternAndTudorCrown/,
    /CourtOfFinalAppealFourPinnaclesDoricDrumColonnadeAndLantern/, /CourtOfFinalAppealGranolithicDoubleShellDome/,
    /CourtOfFinalAppealTwoChinesePanAndRollTileHipRoofs/, /CourtOfFinalAppealRaisedChineseTileCourses/,
    /CourtOfFinalAppealGranolithicGableBehindPediment/, /CourtOfFinalAppealJacksonRoadEntrancePlaque/,
    /DIEU ET MON DROIT/, /ERECTED · A · D · MDCCCCX/, /cityUniforms\.uInteriorGlow/, /floodlightFalloff/
  ]) assert.match(world, pattern);
  assert.doesNotMatch(world, /TextureLoader|image-search|https?:\/\//);
});

test('recessed arches are real holes and night materials retain granite, glass, tile and granolithic distinctions', () => {
  const world = fs.readFileSync(path.join(root, 'js/cities/hongkong/court-of-final-appeal-world.js'), 'utf8');
  assert.match(world, /shape\.holes\.push\(hole\)/); assert.match(world, /const wallOffset = -3\.0, glassOffset = wallOffset \+ \.30/);
  assert.match(world, /new THREE\.MeshStandardNodeMaterial\(\{ color: 0xb5ad9e/); // granite
  assert.match(world, /new THREE\.MeshStandardMaterial\(\{ color: 0x292a2b/); // Chinese tile
  assert.match(world, /new THREE\.MeshStandardNodeMaterial\(\{ color: 0x494944/); // weathered granolithic gable
  assert.match(world, /new THREE\.MeshStandardNodeMaterial\(\{ color: 0xa39c90/); // dome shell
  assert.match(world, /granolithicRoof, granolithicRoofRoll, dome, domeRib/);
  assert.match(world, /classicalFigure\(themisScale, true\)/); assert.match(world, /blindfold/); assert.match(world, /cfaGroundHeightAt/);
});

test('CFA keeps its authored landmark integration and authoritative progress-table row', () => {
  const simple = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  const debug = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  assert.match(simple, /buildCourtOfFinalAppeal\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.cfaPadHeight \}\)/);
  assert.match(simple, /\.\.\.courtOfFinalAppeal\.stats/); assert.match(simple, /\.\.\.courtOfFinalAppeal\.colliders/);
  assert.match(simple, /twoExchange\.landmarks\.length \+ courtOfFinalAppeal\.landmarks\.length/); assert.match(simple, /buildings: 0/);
  assert.match(debug, /courtOfFinalAppeal: world\.courtOfFinalAppeal/);
  const inventory = fs.readFileSync(path.join(root, 'docs/hongkong-building-inventory.md'), 'utf8');
  const rows = inventory.split(/\r?\n/).filter((line) => /^\| `HK-B\d{4}` /.test(line));
  const entry = rows.find((row) => row.startsWith('| `HK-B0092`'));
  assert.match(entry, /終審法院 The Court of Final Appeal/); assert.match(entry, /已加入/); assert.match(entry, /court-of-final-appeal-world\.js/);
  assert.equal(rows.filter((row) => row.includes('| 已加入 |')).length, 33);
  assert.match(rows.find((row) => row.startsWith('| `HK-B0031`')), /待製作/);
  assert.match(rows.find((row) => row.startsWith('| `HK-B0094`')), /待製作/);
});
