const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
let architecture;
let scb;
let scbLogo;
let twoIfc;
let terrain;
let geo;

test.before(async () => {
  architecture = await import('../js/cities/hongkong/hsbc-headquarters-architecture.js');
  scb = await import('../js/cities/hongkong/standard-chartered-architecture.js');
  scbLogo = await import('../js/cities/hongkong/standard-chartered-logo.js');
  twoIfc = await import('../js/cities/hongkong/two-ifc-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  geo = (await import('../js/hk-geodata.js')).GEO;
});

test('HSBC uses its real OSM site, oriented footprint and 178.8 m landmark height', () => {
  const { HSBC_SITE, HSBC_HEIGHT, HSBC_ROOF_SIGN, hsbcWorldToLocal } = architecture;
  assert.equal(HSBC_SITE.name, '滙豐總行大廈');
  assert.equal(HSBC_SITE.source, geo.landmarks['滙豐總行大廈']);
  assert.equal(HSBC_HEIGHT, 178.8);
  assert.equal(HSBC_ROOF_SIGN.deviceWidth / HSBC_ROOF_SIGN.deviceHeight, 2);
  assert.equal(HSBC_ROOF_SIGN.planeWidth / HSBC_ROOF_SIGN.planeHeight, 2);
  const renderedDeviceRatio = (HSBC_ROOF_SIGN.deviceWidth / HSBC_ROOF_SIGN.textureWidth * HSBC_ROOF_SIGN.planeWidth)
    / (HSBC_ROOF_SIGN.deviceHeight / HSBC_ROOF_SIGN.textureHeight * HSBC_ROOF_SIGN.planeHeight);
  assert.equal(renderedDeviceRatio, 2);
  assert.ok(Math.abs(HSBC_SITE.x - HSBC_SITE.source.x) < 0.7);
  assert.ok(Math.abs(HSBC_SITE.z - HSBC_SITE.source.z) < 0.1);
  assert.ok(HSBC_SITE.ry < 0 && HSBC_SITE.ry > -0.4, 'the facade follows the real oblique street block');
  assert.ok(HSBC_SITE.area <= HSBC_SITE.source.w * HSBC_SITE.source.d);
  for (let i = 0; i + 1 < HSBC_SITE.ring.length; i += 2) {
    const local = hsbcWorldToLocal(HSBC_SITE.ring[i], HSBC_SITE.ring[i + 1]);
    assert.ok(Math.abs(local.x) <= HSBC_SITE.w * 0.5 + 1e-6);
    assert.ok(Math.abs(local.z) <= HSBC_SITE.d * 0.5 + 1e-6);
  }
});

test('three stepped bays and five suspension levels preserve the open public plaza', () => {
  const {
    HSBC_BAYS, HSBC_MAIN_BAY, HSBC_MAIN_ROOF_Y, HSBC_ENTRANCE, HSBC_LION_SITES, HSBC_ESCALATOR,
    HSBC_TRUSS_LEVELS, HSBC_HEIGHT, HSBC_BANKING_HALL_BASE,
    HSBC_FRAME_WIDTH, HSBC_GLASS_WIDTH, HSBC_MAST_X,
    HSBC_PLAZA_TOP, HSBC_SITE, hsbcSuspensionLevelsForRoof,
    hsbcLocalToWorld, isHsbcPlazaPoint, hsbcLocalCollider
  } = architecture;
  assert.deepEqual(HSBC_BAYS.map((bay) => bay.floors), [44, 36, 29]);
  assert.deepEqual([...HSBC_BAYS.map((bay) => bay.floors)].sort((a, b) => a - b), [29, 36, 44]);
  assert.equal(HSBC_TRUSS_LEVELS.length, 5);
  assert.deepEqual(HSBC_BAYS.map((bay) => hsbcSuspensionLevelsForRoof(bay.roofY).length), [5, 4, 3]);
  assert.equal(HSBC_MAIN_BAY.id, 'north');
  assert.equal(HSBC_MAIN_BAY.floors, 44, 'the supplied front elevation is not hidden by a lower front wing');
  assert.ok(Math.abs(HSBC_MAIN_ROOF_Y - 169.2) < 1e-9);
  assert.ok(HSBC_GLASS_WIDTH / HSBC_FRAME_WIDTH > 0.45 && HSBC_GLASS_WIDTH / HSBC_FRAME_WIDTH < 0.6);
  assert.ok(Math.abs(HSBC_MAST_X[1]) < HSBC_FRAME_WIDTH * 0.35, 'inner masts frame the narrower central glass');
  const stairLadderWidth = Math.abs(HSBC_MAST_X[1]) - HSBC_GLASS_WIDTH * 0.5;
  assert.ok(stairLadderWidth > 4 && stairLadderWidth < 5.5, 'the close elevation has broad ladder-like stair strips');
  assert.ok(HSBC_BANKING_HALL_BASE > 10, 'the banking hall is raised above people and vehicles');
  assert.equal(HSBC_ENTRANCE.height, HSBC_BANKING_HALL_BASE);
  assert.ok(HSBC_ENTRANCE.doorWidth >= 5 && HSBC_ENTRANCE.doorHeight > 2.3, 'the glazed entrance retains a real door opening');
  assert.equal(HSBC_LION_SITES.length, 2);
  assert.ok(HSBC_LION_SITES[1].x - HSBC_LION_SITES[0].x >= 22, 'lions occupy separated open side positions');
  assert.ok(Math.abs(HSBC_LION_SITES[1].heading - HSBC_LION_SITES[0].heading - Math.PI) < 1e-9, 'lions face one another');
  assert.ok(HSBC_ESCALATOR.startX < 0 && HSBC_ESCALATOR.endX > HSBC_ESCALATOR.startX, 'from the harbour, escalators climb from screen-right to rear screen-left');
  const escalatorLion = HSBC_LION_SITES.reduce((nearest, site) => Math.abs(site.x - HSBC_ESCALATOR.startX) < Math.abs(nearest.x - HSBC_ESCALATOR.startX) ? site : nearest);
  assert.ok(HSBC_ESCALATOR.startZ > escalatorLion.z + 1.5, 'escalator entrance recesses behind the lion plinth line');
  assert.ok(Math.hypot(HSBC_ESCALATOR.startX - escalatorLion.x, HSBC_ESCALATOR.startZ - escalatorLion.z) > 3.5, 'escalator entrance retains clearance from the lion');
  assert.ok(HSBC_PLAZA_TOP > 0);
  assert.ok(isHsbcPlazaPoint(HSBC_SITE.x, HSBC_SITE.z));
  const north = hsbcLocalToWorld(0, -10), south = hsbcLocalToWorld(0, 10);
  assert.ok(north.z < south.z, 'local -z is the harbour-facing entrance');
  const elevated = hsbcLocalCollider({
    x: 0, z: 0, w: 40, d: 15, minY: HSBC_BANKING_HALL_BASE, maxY: HSBC_HEIGHT
  });
  assert.ok(elevated.minY > 2.3, 'the elevated tower collider does not seal the ground-level plaza');
  assert.ok(elevated.obb && Number.isFinite(elevated.obb.cs) && Number.isFinite(elevated.obb.sn));
});

test('the hand-built HSBC model includes its photographic identifying features without bundled photo assets', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/hsbc-headquarters-world.js'), 'utf8');
  assert.match(source, /group\.position\.set\(HSBC_SITE\.x, groundOffset, HSBC_SITE\.z\)/);
  assert.match(source, /HSBCInvertedVSuspensionTrusses/);
  assert.match(source, /HSBCExposedSteelMasts/);
  assert.match(source, /HSBCOvalSunscoopCrown/);
  assert.match(source, /HSBCBronzeLions/);
  assert.match(source, /HSBCLeftBronzeLionOpenMouth/);
  assert.match(source, /HSBCRightBronzeLionReclining/);
  assert.match(source, /HSBCGroundEntranceGoldSign/);
  assert.match(source, /HSBCUnderbellyCofferPanels/);
  assert.match(source, /HSBCEscalatorSteps/);
  assert.match(source, /HSBCRoundedStairLandingWindows/);
  assert.match(source, /HSBCExternalStairLadderRails/);
  assert.match(source, /HSBCExternalStairLadderLandings/);
  assert.match(source, /HSBCStairLandingArches/);
  assert.match(source, /HSBCStairLandingCurvedSoffits/);
  assert.match(source, /HSBCStairLandingXAndFanBraces/);
  assert.match(source, /HSBCCurtainWallHorizontalSunshades/);
  assert.match(source, /HSBCCrownCurvedEndFins/);
  assert.match(source, /HSBCCrownRimPanels/);
  assert.match(source, /floor <= bay\.floors/);
  assert.match(source, /double-height reception band/);
  assert.match(source, /createHsbcCurtainWallMaterial/);
  assert.match(source, /createHsbcSignTexture/);
  assert.match(source, /function drawHsbcDevice/);
  assert.match(source, /height = width/);
  assert.match(source, /deviceWidth, '#db0011', '#ffffff', deviceHeight/);
  assert.match(source, /drawHsbcDevice\(ctx, 410, 38, 148, '#b9a262'\);/);
  assert.match(source, /four outer triangles/);
  assert.match(source, /small recessed cavity/);
  assert.match(source, /new THREE\.ShapeGeometry\(mouthCavity\)/);
  assert.match(source, /connected bronze lips and jaw hinges/);
  assert.match(source, /cityUniforms\.uInteriorGlow/);
  assert.doesNotMatch(source, /TextureLoader|image-search|https?:\/\//);
});

test('unified simple mode adds only the authored landmarks and keeps generic buildings disabled', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  assert.match(source, /buildHsbcHeadquarters\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.hsbcPadHeight \}\)/);
  assert.match(source, /buildStandardCharteredBankBuilding\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.scbPadHeight \}\)/);
  assert.match(source, /buildTwoInternationalFinanceCentre\(scene, \{ groundOffset: HONG_KONG_TERRAIN_META\.twoIfcPadHeight \}\)/);
  assert.match(source, /isHsbcPlazaPoint\(x, z\)/);
  assert.match(source, /isTwoIfcPlazaPoint\(x, z\)/);
  assert.match(source, /scbEntranceGroundHeight\(x, z, crossingGround, standardChartered\.groundOffset\)/);
  assert.match(source, /\.\.\.hsbc\.stats/);
  assert.match(source, /\.\.\.standardChartered\.stats/);
  assert.match(source, /\.\.\.twoIfc\.stats/);
  assert.match(source, /\.\.\.hsbc\.colliders/);
  assert.match(source, /\.\.\.standardChartered\.colliders/);
  assert.match(source, /\.\.\.twoIfc\.colliders/);
  assert.match(source, /landmarks: hsbc\.landmarks\.length \+ standardChartered\.landmarks\.length \+ twoIfc\.landmarks\.length/);
  assert.match(source, /buildings: 0/);
  assert.match(source, /landmarks: \[\.\.\.hsbc\.landmarks, \.\.\.standardChartered\.landmarks, \.\.\.twoIfc\.landmarks\]/);
  assert.match(source, /createHongKongTrafficAids\(scene, \{/);
  assert.match(source, /getGroundHeight, getSurfaceHeight: getRoadPaintHeight, surfaceY: FULL_WORLD_HEIGHT\.road/);
  assert.match(source, /\.\.\.trafficAids\.stats/);
  assert.doesNotMatch(source, /trafficAids: null/);
  const pack = fs.readFileSync(path.join(root, 'js/cities/hongkong/index.js'), 'utf8');
  assert.match(pack, /trafficAids: world\.trafficAids/);
});

test('Standard Chartered preserves its OSM site while the tower turns 35 degrees towards HSBC', () => {
  const {
    SCB_SITE, SCB_HEIGHT, SCB_FLOORS, SCB_BUILDING_HEADING, SCB_HSBC_FACING_ANGLE,
    SCB_MODEL_ORIGIN, SCB_MAP_SITE, SCB_FRONT_CENTER, SCB_FRONT_Z,
    SCB_STAIR_BOTTOM_WORLD, SCB_ROAD_SETBACK, scbSiteWorldToLocal, scbLocalToWorld
  } = scb;
  const { HSBC_SITE } = architecture;
  assert.equal(SCB_SITE.name, '渣打銀行大廈');
  assert.equal(SCB_SITE.osmId, 85320719);
  assert.equal(SCB_SITE.source.ring, SCB_SITE.ring);
  assert.equal(SCB_HEIGHT, 191);
  assert.equal(SCB_FLOORS, 42);
  assert.ok(SCB_SITE.x < HSBC_SITE.x - 35, 'Standard Chartered is on the west side of HSBC');
  assert.ok(Math.abs(SCB_SITE.z - HSBC_SITE.z) < 20, 'both buildings occupy the same Central block frontage');
  assert.ok(SCB_SITE.d > SCB_SITE.w * 2, 'the real site is a narrow frontage with a long lot');
  for (let i = 0; i < SCB_SITE.ring.length; i += 2) {
    const local = scbSiteWorldToLocal(SCB_SITE.ring[i], SCB_SITE.ring[i + 1]);
    assert.ok(Math.abs(local.x) <= SCB_SITE.w * 0.5 + 1e-6);
    assert.ok(Math.abs(local.z) <= SCB_SITE.d * 0.5 + 1e-6);
  }
  assert.ok(Math.abs(SCB_HSBC_FACING_ANGLE - 35 * Math.PI / 180) < 1e-12);
  assert.ok(Math.abs(SCB_SITE.ry - SCB_BUILDING_HEADING - SCB_HSBC_FACING_ANGLE) < 1e-12,
    'the architectural facade, rather than the source site OBB, turns exactly 35 degrees');
  const front = scbLocalToWorld(0, SCB_FRONT_Z);
  assert.ok(Math.hypot(front.x - SCB_FRONT_CENTER.x, front.z - SCB_FRONT_CENTER.z) < 1e-9,
    'the model origin and exported entrance centre use the same rotated architectural frame');
  assert.ok(SCB_MODEL_ORIGIN.x < SCB_SITE.x, 'the rotated massing swings west, away from HSBC');
  const oldBottomZ = SCB_FRONT_Z - 7.2;
  const oldBottomX = SCB_SITE.x + Math.sin(SCB_SITE.ry) * oldBottomZ;
  const oldBottomWorldZ = SCB_SITE.z + Math.cos(SCB_SITE.ry) * oldBottomZ;
  const roadLength = Math.hypot(18, 5.2);
  assert.ok(Math.abs(SCB_STAIR_BOTTOM_WORLD.x - oldBottomX + 5.2 / roadLength * SCB_ROAD_SETBACK) < 1e-9
    && Math.abs(SCB_STAIR_BOTTOM_WORLD.z - oldBottomWorldZ - 18 / roadLength * SCB_ROAD_SETBACK) < 1e-9,
  'the entire landmark and stair base move three metres away from the carriageway');
  assert.equal(SCB_ROAD_SETBACK, 3);
  assert.equal(SCB_MAP_SITE.x, SCB_MODEL_ORIGIN.x);
  assert.equal(SCB_MAP_SITE.z, SCB_MODEL_ORIGIN.z);
  assert.equal(SCB_MAP_SITE.ry, SCB_BUILDING_HEADING);
  assert.equal(SCB_MAP_SITE.source, SCB_SITE.source);
  const oldOutwardX = -Math.sin(SCB_SITE.ry);
  const outwardPoint = scbLocalToWorld(0, SCB_FRONT_Z - 1);
  const newOutwardX = outwardPoint.x - front.x;
  assert.ok(newOutwardX > oldOutwardX, 'the entrance normal turns east towards HSBC, not along the old road normal');
});

test('Standard Chartered has seven sandwich slabs and right-trapezoid facade-attached stairs', () => {
  const {
    SCB_TIERS, SCB_MAIN_ROOF_Y, SCB_HEIGHT, SCB_WIDTH, SCB_FRONT_PIER_X, SCB_FRONT_GLASS_X,
    SCB_OCTAGON_Y, SCB_PODIUM_HEIGHT, SCB_ENTRANCE_HEIGHT, SCB_ENTRANCE_DOOR_WIDTH,
    SCB_LEFT_ENTRANCE_X, SCB_SIGN_FIN, SCB_STAIR_COUNT, SCB_STAIR_RUN, SCB_STAIR_WIDTH,
    SCB_STAIR_TOP_WIDTH, SCB_STAIR_TOP_CENTER_U, SCB_STAIR_BOTTOM_RIGHT_U, SCB_STAIR_BOTTOM_LEFT_U,
    SCB_STAIR_TOP_RIGHT_U, SCB_STAIR_TOP_LEFT_U, SCB_STAIR_TOP_LANDING_DEPTH,
    SCB_STAIR_TREAD, SCB_STAIR_RISE, SCB_STAIR_RAIL_SIDES,
    SCB_STAIR_PARAPET_HEIGHT, SCB_STAIR_PARAPET_THICKNESS,
    SCB_STAIR_HANDRAIL_HEIGHT, SCB_STAIR_HANDRAIL_OFFSET,
    SCB_FRONT_Z, SCB_BASE_Y, SCB_ENTRANCE_BASE_Y, SCB_FACADE_STAIR_ANGLE,
    scbStairEdgesAt, scbStairRoadToLocal, scbStairLocalToRoad, scbLocalToWorld,
    scbEntranceGroundHeight, scbLocalCollider
  } = scb;
  assert.equal(SCB_TIERS.length, 7);
  assert.deepEqual(SCB_TIERS.map((tier) => tier.id), [
    'north-outer', 'north-middle', 'north-inner', 'central', 'south-inner', 'south-middle', 'south-outer'
  ]);
  assert.deepEqual(SCB_TIERS.map((tier) => tier.rows), [25, 29, 33, 37, 33, 29, 25]);
  assert.deepEqual(SCB_TIERS.map((tier) => tier.roofY), [...SCB_TIERS].reverse().map((tier) => tier.roofY),
    'the seven front-to-back slabs form a symmetric convex silhouette');
  assert.equal(SCB_TIERS[3].roofY, SCB_MAIN_ROOF_Y);
  assert.equal(SCB_SIGN_FIN.z, SCB_TIERS[3].z, 'the crown sign belongs only to the central tallest slab');
  assert.equal(SCB_SIGN_FIN.topY, SCB_HEIGHT);
  assert.ok(SCB_SIGN_FIN.baseY < SCB_HEIGHT && SCB_SIGN_FIN.baseY >= SCB_MAIN_ROOF_Y);
  assert.equal(SCB_FRONT_PIER_X.length, 3);
  assert.equal(SCB_FRONT_GLASS_X.length, 2);
  assert.ok(SCB_OCTAGON_Y > SCB_ENTRANCE_BASE_Y + SCB_ENTRANCE_HEIGHT && SCB_OCTAGON_Y < SCB_PODIUM_HEIGHT,
    'the raised entrance glazing still clears the octagonal windows');
  assert.ok(SCB_ENTRANCE_HEIGHT > 12, 'the reference has unusually tall gold-framed entrance glazing');
  assert.equal(SCB_STAIR_COUNT, 24);
  assert.equal(SCB_STAIR_RUN, 12.5);
  assert.equal(SCB_STAIR_TREAD, 12.5 / 24);
  assert.equal(SCB_STAIR_RISE, 0.15);
  assert.deepEqual(SCB_STAIR_RAIL_SIDES, [1], 'only the straight left edge has the referenced stone wall and rail');
  assert.equal(SCB_STAIR_PARAPET_HEIGHT, 0.92);
  assert.equal(SCB_STAIR_PARAPET_THICKNESS, 0.34);
  assert.equal(SCB_STAIR_HANDRAIL_HEIGHT, 0.82);
  assert.equal(SCB_STAIR_HANDRAIL_OFFSET, 0.075);
  const projected = (width) => width * Math.cos(SCB_FACADE_STAIR_ANGLE);
  assert.ok(Math.abs(SCB_STAIR_WIDTH - (SCB_STAIR_BOTTOM_LEFT_U - SCB_STAIR_BOTTOM_RIGHT_U)) < 1e-9);
  assert.ok(Math.abs(SCB_STAIR_WIDTH - (SCB_STAIR_TOP_WIDTH + SCB_STAIR_RUN / Math.tan(SCB_FACADE_STAIR_ANGLE))) < 1e-9,
    'the 90-degree left edge and facade-attached right edge determine the wider bottom tread');
  assert.ok(Math.abs(SCB_STAIR_TOP_WIDTH - projected(SCB_ENTRANCE_DOOR_WIDTH)) < 1e-9,
    'the top tread matches the left-hand door projection');
  assert.ok(Math.abs(SCB_STAIR_TOP_CENTER_U - SCB_LEFT_ENTRANCE_X * Math.cos(SCB_FACADE_STAIR_ANGLE)) < 1e-9,
    'the top tread is centered on the left-hand door, not the central door');
  assert.deepEqual(scbStairEdgesAt(0), { right: SCB_STAIR_BOTTOM_RIGHT_U, left: SCB_STAIR_BOTTOM_LEFT_U });
  assert.deepEqual(scbStairEdgesAt(1), { right: SCB_STAIR_TOP_RIGHT_U, left: SCB_STAIR_TOP_LEFT_U });
  assert.ok(Math.abs(SCB_STAIR_RISE * SCB_STAIR_COUNT - SCB_ENTRANCE_BASE_Y) < 1e-9);
  const origin = scbStairRoadToLocal(0, 0);
  const alongRoad = scbStairRoadToLocal(1, 0), towardsLobby = scbStairRoadToLocal(0, 1);
  const ux = alongRoad.x - origin.x, uz = alongRoad.z - origin.z;
  const vx = towardsLobby.x - origin.x, vz = towardsLobby.z - origin.z;
  assert.ok(Math.abs(ux * vx + uz * vz) < 1e-9, 'road-parallel risers and the ascent form a right angle');
  assert.equal(SCB_STAIR_BOTTOM_LEFT_U, SCB_STAIR_TOP_LEFT_U, 'the left edge has no road-direction drift');
  const leftBottom = scbStairRoadToLocal(SCB_STAIR_BOTTOM_LEFT_U, 0);
  const leftTop = scbStairRoadToLocal(SCB_STAIR_TOP_LEFT_U, SCB_STAIR_RUN);
  const leftX = leftTop.x - leftBottom.x, leftZ = leftTop.z - leftBottom.z;
  assert.ok(Math.abs(ux * leftX + uz * leftZ) < 1e-9, 'the left edge meets the bottom tread at exactly 90 degrees');
  const worldOrigin = scbLocalToWorld(origin.x, origin.z);
  const worldAlongRoad = scbLocalToWorld(alongRoad.x, alongRoad.z);
  const roadLength = Math.hypot(18, 5.2);
  assert.ok(Math.abs(worldAlongRoad.x - worldOrigin.x - 18 / roadLength) < 1e-9
    && Math.abs(worldAlongRoad.z - worldOrigin.z - 5.2 / roadLength) < 1e-9,
  'the treads follow the measured Des Voeux Road way 7786 tangent, independently of the tower OBB');
  const farLocal = scbStairRoadToLocal(0, -0.05);
  const far = scbLocalToWorld(farLocal.x, farLocal.z);
  assert.equal(scbEntranceGroundHeight(far.x, far.z, 0.025), 0.025);
  for (let i = 0; i < SCB_STAIR_COUNT; i++) {
    const t = (i + 0.5) / SCB_STAIR_COUNT;
    const edges = scbStairEdgesAt(t);
    const expectedWidth = SCB_STAIR_WIDTH + (SCB_STAIR_TOP_WIDTH - SCB_STAIR_WIDTH) * t;
    assert.ok(Math.abs(edges.left - edges.right - expectedWidth) < 1e-9,
      `tread ${i + 1} is shorter than the preceding road-parallel tread`);
    const local = scbStairRoadToLocal((edges.left + edges.right) * 0.5, (i + 0.5) * SCB_STAIR_TREAD);
    const point = scbLocalToWorld(local.x, local.z);
    assert.ok(Math.abs(scbEntranceGroundHeight(point.x, point.z, 0.025) - (i + 1) * SCB_STAIR_RISE) < 1e-9,
      `road-parallel tread ${i + 1} has its own exact walking height`);
    for (const u of [edges.right - 0.02, edges.left + 0.02]) {
      const outsideLocal = scbStairRoadToLocal(u, (i + 0.5) * SCB_STAIR_TREAD);
      const outside = scbLocalToWorld(outsideLocal.x, outsideLocal.z);
      assert.equal(scbEntranceGroundHeight(outside.x, outside.z, 0.025), 0.025,
        `tread ${i + 1} has no invisible walking surface beyond either diagonal side`);
    }
  }
  for (let i = 0; i <= SCB_STAIR_COUNT; i++) {
    const edges = scbStairEdgesAt(i / SCB_STAIR_COUNT);
    const buildingSide = scbStairRoadToLocal(edges.right, i * SCB_STAIR_TREAD);
    assert.ok(Math.abs(buildingSide.z - SCB_FRONT_Z) < 1e-9,
      `building-side stair boundary ${i} is exactly attached to the facade`);
    assert.ok(Math.abs(buildingSide.x) <= SCB_WIDTH * 0.5 + 1e-9,
      `building-side stair boundary ${i} meets actual facade, not empty space beyond its corner`);
    const outerSide = scbStairRoadToLocal(edges.left, i * SCB_STAIR_TREAD);
    assert.ok(SCB_FRONT_Z - outerSide.z > 0.7, `outer stair boundary ${i} remains outside the facade`);
  }
  const outsideTopLocal = scbStairRoadToLocal(0, SCB_STAIR_RUN - 0.01);
  const outsideTop = scbLocalToWorld(outsideTopLocal.x, outsideTopLocal.z);
  assert.equal(scbEntranceGroundHeight(outsideTop.x, outsideTop.z, 0.025), 0.025,
    'the tapered triangle does not create an invisible rectangular walking surface');
  const landingV = SCB_STAIR_RUN + 0.5;
  const landingEdges = scbStairEdgesAt(landingV / SCB_STAIR_RUN);
  const landingLocal = scbStairRoadToLocal((landingEdges.left + landingEdges.right) * 0.5, landingV);
  const landing = scbLocalToWorld(landingLocal.x, landingLocal.z);
  assert.equal(scbEntranceGroundHeight(landing.x, landing.z, 0.025), SCB_ENTRANCE_BASE_Y,
    'only the small left-door landing is raised');
  for (const dx of [-SCB_ENTRANCE_DOOR_WIDTH * 0.5, 0, SCB_ENTRANCE_DOOR_WIDTH * 0.5]) {
    const door = scbStairLocalToRoad(SCB_LEFT_ENTRANCE_X + dx, SCB_FRONT_Z);
    const edges = scbStairEdgesAt(door.v / SCB_STAIR_RUN);
    assert.ok(door.u >= edges.right - 1e-9 && door.u <= edges.left + 1e-9,
      'the door meets the landing without crossing the attached facade edge');
    assert.ok(door.v >= SCB_STAIR_RUN && door.v <= SCB_STAIR_RUN + SCB_STAIR_TOP_LANDING_DEPTH,
      'the complete angled left-door width meets the top landing');
  }
  const centralDoor = scbStairLocalToRoad(0, SCB_FRONT_Z);
  const centralLandingLocal = scbStairRoadToLocal(centralDoor.u, SCB_STAIR_RUN + 0.5);
  const centralLanding = scbLocalToWorld(centralLandingLocal.x, centralLandingLocal.z);
  assert.equal(scbEntranceGroundHeight(centralLanding.x, centralLanding.z, 0.025), 0.025,
    'there is no full-facade or triangular filler platform');
  const collider = scbLocalCollider({ x: 0, z: 0, w: 20, d: 20, minY: SCB_BASE_Y, maxY: SCB_HEIGHT });
  assert.ok(collider.obb && collider.maxY === SCB_HEIGHT);
});

test('the hand-built Standard Chartered model includes the photographed identifiers without bundled photo assets', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/standard-chartered-world.js'), 'utf8');
  assert.match(source, /group\.position\.set\(SCB_MODEL_ORIGIN\.x, groundOffset, SCB_MODEL_ORIGIN\.z\)/);
  assert.match(source, /SCBSteppedTowerTiers/);
  assert.match(source, /SCBSandwichStepStonePiers/);
  assert.match(source, /SCBSandwichStepRoseGlassChannels/);
  assert.match(source, /SCBFrontStonePiers/);
  assert.match(source, /SCBFrontRoseGlassChannels/);
  assert.match(source, /const frontRoofY = SCB_TIERS\[0\]\.roofY/);
  assert.match(source, /h: frontRoofY - SCB_BASE_Y/);
  assert.match(source, /h: frontRoofY - SCB_PODIUM_HEIGHT/);
  assert.match(source, /SCBOctagonalWindowFrames/);
  assert.match(source, /SCBOctagonalWindowLouvres/);
  assert.match(source, /SCBGoldEntranceSurrounds/);
  assert.match(source, /SCBTallEntranceGlazing/);
  assert.match(source, /SCBDesVoeuxRoadEntranceSteps/);
  assert.match(source, /SCBEntranceRaisedLandings/);
  assert.doesNotMatch(source, /SCBEntranceTriangularConnector/);
  assert.match(source, /SCB_BUILDING_HEADING/);
  assert.match(source, /SCBEntranceStairHandrail/);
  assert.match(source, /SCBEntranceStairWallRailBracket/);
  assert.doesNotMatch(source, /SCBEntranceStairRailPosts/);
  assert.match(source, /SCBEntranceStairStoneParapet/);
  assert.match(source, /createScbParapetMaterial/);
  assert.match(source, /for \(const side of SCB_STAIR_RAIL_SIDES\)/);
  assert.match(source, /SCBCrownLogo/);
  assert.match(source, /SCBCrownLogoWest/);
  assert.match(source, /drawStandardCharteredDevice/);
  assert.match(source, /createScbRibbonFacadeMaterial/);
  assert.match(source, /createScbFrontGlassMaterial/);
  assert.match(source, /cityUniforms\.uInteriorGlow/);
  assert.doesNotMatch(source, /bezierCurveTo|TextureLoader|image-search|https?:\/\//);
  assert.equal(scbLogo.SCB_DEVICE_PATHS.length, 4, 'two interlocking main ribbons plus two detached caps');
  assert.deepEqual(scbLogo.SCB_DEVICE_PATHS.map((part) => part.tone), ['green', 'blue', 'green', 'blue']);
  assert.equal(new Set(scbLogo.SCB_DEVICE_PATHS.map((part) => part.d)).size, 4);
  for (const part of scbLogo.SCB_DEVICE_PATHS) {
    assert.ok(part.d.length > 150 && /[ac]/.test(part.d), 'each ribbon is curved vector geometry, not an S glyph');
  }
});

test('Two IFC keeps its OSM site and source conventions separate from its sculpted visual tiers', () => {
  const {
    TWO_IFC_SITE, TWO_IFC_HEIGHT, TWO_IFC_OSM_HEIGHT, TWO_IFC_OSM_LEVELS,
    TWO_IFC_DESIGN_HEIGHT, TWO_IFC_DESIGN_LEVELS, TWO_IFC_TIERS, TWO_IFC_CURTAIN_TIERS,
    TWO_IFC_OPEN_CROWN, TWO_IFC_SETBACK_COUNT, TWO_IFC_LOCAL_RING,
    TWO_IFC_BAY_WIDTH, TWO_IFC_CONVEX_PROJECTION, TWO_IFC_PLAZA_TOP,
    twoIfcWorldToLocal, isTwoIfcPlazaPoint, twoIfcLocalCollider
  } = twoIfc;
  assert.equal(TWO_IFC_SITE.name, '國際金融中心二期');
  assert.equal(TWO_IFC_SITE.osmId, 25589595);
  assert.equal(TWO_IFC_SITE.source, geo.landmarks['國際金融中心二期']);
  assert.equal(TWO_IFC_SITE.ring, TWO_IFC_SITE.source.ring);
  assert.equal(TWO_IFC_HEIGHT, 415.8);
  assert.equal(TWO_IFC_OSM_HEIGHT, 415.8);
  assert.equal(TWO_IFC_OSM_LEVELS, 90);
  assert.equal(TWO_IFC_DESIGN_HEIGHT, 412);
  assert.equal(TWO_IFC_DESIGN_LEVELS, 88);
  assert.notEqual(TWO_IFC_OSM_HEIGHT, TWO_IFC_DESIGN_HEIGHT, 'source conventions must not be silently blended');
  assert.equal(TWO_IFC_LOCAL_RING.length, 48);
  assert.deepEqual(twoIfcWorldToLocal(TWO_IFC_SITE.x, TWO_IFC_SITE.z), { x: 0, z: 0 });
  for (let i = 0; i < TWO_IFC_SITE.ring.length; i += 2) {
    const local = twoIfcWorldToLocal(TWO_IFC_SITE.ring[i], TWO_IFC_SITE.ring[i + 1]);
    assert.ok(Math.abs(local.x) <= TWO_IFC_SITE.w * 0.5 + 1e-6);
    assert.ok(Math.abs(local.z) <= TWO_IFC_SITE.d * 0.5 + 1e-6);
  }
  assert.equal(TWO_IFC_TIERS.length, 6);
  assert.equal(TWO_IFC_CURTAIN_TIERS.length, 5);
  assert.ok(TWO_IFC_SETBACK_COUNT >= 4);
  for (let i = 0; i < TWO_IFC_TIERS.length; i++) {
    const tier = TWO_IFC_TIERS[i];
    assert.ok(tier.y1 > tier.y0 && tier.bottomScale > 0 && tier.topScale > 0);
    if (i) assert.equal(tier.y0, TWO_IFC_TIERS[i - 1].y1);
  }
  assert.ok(TWO_IFC_TIERS[0].topScale > TWO_IFC_TIERS.at(-1).topScale);
  assert.equal(TWO_IFC_OPEN_CROWN.y0, TWO_IFC_TIERS.at(-1).y1);
  assert.equal(TWO_IFC_OPEN_CROWN.y1, TWO_IFC_HEIGHT);
  assert.ok(TWO_IFC_OPEN_CROWN.topScale < TWO_IFC_OPEN_CROWN.bottomScale);
  assert.ok(TWO_IFC_BAY_WIDTH < TWO_IFC_SITE.w && TWO_IFC_CONVEX_PROJECTION > 0.5);
  assert.ok(isTwoIfcPlazaPoint(TWO_IFC_SITE.x, TWO_IFC_SITE.z));
  assert.equal(terrain.HONG_KONG_TERRAIN_META.twoIfcPadHeight,
    terrain.rawHongKongTerrainHeight(TWO_IFC_SITE.x, TWO_IFC_SITE.z));
  assert.equal(terrain.hongKongTerrainHeight(TWO_IFC_SITE.x, TWO_IFC_SITE.z),
    terrain.HONG_KONG_TERRAIN_META.twoIfcPadHeight);
  assert.ok(TWO_IFC_PLAZA_TOP > 0);
  const collider = twoIfcLocalCollider({ w: 20, d: 20, minY: 0, maxY: TWO_IFC_HEIGHT });
  assert.ok(collider.obb && collider.maxY === TWO_IFC_HEIGHT);
});

test('the hand-built Two IFC model has convex curtain walls, wing mullions and an open crown without photo assets', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/two-ifc-world.js'), 'utf8');
  assert.match(source, /group\.position\.set\(TWO_IFC_SITE\.x, groundOffset, TWO_IFC_SITE\.z\)/);
  assert.match(source, /TwoIfcTaperedSetbackTowerSegments/);
  assert.match(source, /TwoIfcFourConvexSteppedCurtainWallFields/);
  assert.match(source, /TwoIfcWingLikeVerticalMullions/);
  assert.match(source, /TwoIfcOpenSculpturalCrownRibs/);
  assert.match(source, /TwoIfcOpenCrownHorizontalRails/);
  assert.match(source, /TwoIfcRecessedCrownLanternCore/);
  assert.match(source, /TwoIfcMechanicalAndRefugeFacadeBelts/);
  assert.match(source, /createConvexBeltGeometry/);
  assert.match(source, /TwoIfcHarbourEntranceGlassDoors/);
  assert.match(source, /fritted/);
  assert.match(source, /vision/);
  assert.match(source, /pearl/i);
  assert.match(source, /cityUniforms\.uInteriorGlow/);
  assert.doesNotMatch(source, /ConeGeometry|TextureLoader|image-search|https?:\/\//);
});

test('building inventory independently tracks scene status, refinement and landmark integration', () => {
  const inventory = fs.readFileSync(path.join(root, 'docs/hongkong-building-inventory.md'), 'utf8');
  for (const heading of ['場景狀態', '精修', 'Landmark', '道路衝突紀錄']) {
    assert.ok(inventory.includes(heading), `inventory defines ${heading}`);
  }
  assert.match(inventory, /建築物優先、道路配合/);
  assert.match(inventory, /不代表已經加入場景/);
  const rows = inventory.split('\n').filter((line) => /^\| `HK-B\d{4}` /.test(line));
  assert.equal(rows.length, 100, 'the curated construction list contains exactly 100 buildings');
  const parsed = rows.map((row) => {
    const cells = row.split('|').map((cell) => cell.trim());
    return { id: cells[1], status: cells[4], refined: cells[5], landmark: cells[6], source: cells[8], implementation: cells[9] };
  });
  assert.deepEqual(parsed.map((row) => row.id), Array.from({ length: 100 }, (_, index) =>
    `\`HK-B${String(index + 1).padStart(4, '0')}\``));
  assert.equal(new Set(parsed.map((row) => row.id)).size, 100);
  assert.deepEqual(parsed.slice(0, 3).map(({ id, status, refined, landmark }) => ({ id, status, refined, landmark })), [
    { id: '`HK-B0001`', status: '已加入', refined: '**是**', landmark: '**是**' },
    { id: '`HK-B0002`', status: '已加入', refined: '**是**', landmark: '**是**' },
    { id: '`HK-B0003`', status: '已加入', refined: '**是**', landmark: '**是**' }
  ]);
  assert.ok(parsed.slice(3).every((row) => row.status === '待製作' && row.refined === '否'
    && row.landmark === '否' && row.implementation === '—'), 'OSM candidates are not presented as integrated or refined');
  assert.ok(parsed.every((row) => row.source && row.source !== '—'));
  assert.match(rows[0], /滙豐總行大廈 HSBC Main Building/);
  assert.match(rows[1], /渣打銀行大廈 Standard Chartered Bank Building/);
  assert.match(rows[2], /國際金融中心二期 Two International Finance Centre/);
  assert.match(rows[2], /two-ifc-world\.js/);
  assert.match(inventory, /\| 施工清單總數 \| 100 \|/);
  assert.match(inventory, /\| 已加入場景的建築物 \| 3 \|/);
  assert.match(inventory, /\| 待製作 \| 97 \|/);
  assert.match(inventory, /367\.4 m†/);
  assert.match(inventory, /沒有 `height` tag/);
  assert.match(inventory, /OSM way \*\*112284860\*\*（目前 API building/);
  assert.match(inventory, /OSM way \*\*64897826\*\*（目前 API building/);
  assert.doesNotMatch(inventory, /塔身 footprint 待核/);
});
