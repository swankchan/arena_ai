const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
let architecture;
let scb;
let scbLogo;
let geo;

test.before(async () => {
  architecture = await import('../js/cities/hongkong/hsbc-headquarters-architecture.js');
  scb = await import('../js/cities/hongkong/standard-chartered-architecture.js');
  scbLogo = await import('../js/cities/hongkong/standard-chartered-logo.js');
  geo = (await import('../js/hk-geodata.js')).GEO;
});

test('HSBC uses its real OSM site, oriented footprint and 178.8 m landmark height', () => {
  const { HSBC_SITE, HSBC_HEIGHT, hsbcWorldToLocal } = architecture;
  assert.equal(HSBC_SITE.name, '滙豐總行大廈');
  assert.equal(HSBC_SITE.source, geo.landmarks['滙豐總行大廈']);
  assert.equal(HSBC_HEIGHT, 178.8);
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
  assert.match(source, /four outer triangles/);
  assert.match(source, /small recessed cavity/);
  assert.match(source, /new THREE\.ShapeGeometry\(mouthCavity\)/);
  assert.match(source, /connected bronze lips and jaw hinges/);
  assert.match(source, /cityUniforms\.uInteriorGlow/);
  assert.doesNotMatch(source, /TextureLoader|image-search|https?:\/\//);
});

test('unified simple mode adds only the authored landmarks and keeps generic buildings disabled', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/simple-world.js'), 'utf8');
  assert.match(source, /buildHsbcHeadquarters\(scene\)/);
  assert.match(source, /buildStandardCharteredBankBuilding\(scene\)/);
  assert.match(source, /isHsbcPlazaPoint\(x, z\)/);
  assert.match(source, /scbEntranceGroundHeight\(x, z, crossingGround\)/);
  assert.match(source, /\.\.\.hsbc\.stats/);
  assert.match(source, /\.\.\.standardChartered\.stats/);
  assert.match(source, /\.\.\.hsbc\.colliders/);
  assert.match(source, /\.\.\.standardChartered\.colliders/);
  assert.match(source, /landmarks: hsbc\.landmarks\.length \+ standardChartered\.landmarks\.length/);
  assert.match(source, /buildings: 0/);
  assert.match(source, /landmarks: \[\.\.\.hsbc\.landmarks, \.\.\.standardChartered\.landmarks\]/);
});

test('Standard Chartered preserves its OSM site while the tower turns 35 degrees towards HSBC', () => {
  const {
    SCB_SITE, SCB_HEIGHT, SCB_FLOORS, SCB_BUILDING_HEADING, SCB_HSBC_FACING_ANGLE,
    SCB_MODEL_ORIGIN, SCB_MAP_SITE, SCB_FRONT_CENTER, SCB_FRONT_Z, scbSiteWorldToLocal, scbLocalToWorld
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
  assert.equal(SCB_MAP_SITE.x, SCB_MODEL_ORIGIN.x);
  assert.equal(SCB_MAP_SITE.z, SCB_MODEL_ORIGIN.z);
  assert.equal(SCB_MAP_SITE.ry, SCB_BUILDING_HEADING);
  assert.equal(SCB_MAP_SITE.source, SCB_SITE.source);
  const oldOutwardX = -Math.sin(SCB_SITE.ry);
  const outwardPoint = scbLocalToWorld(0, SCB_FRONT_Z - 1);
  const newOutwardX = outwardPoint.x - front.x;
  assert.ok(newOutwardX > oldOutwardX, 'the entrance normal turns east towards HSBC, not along the old road normal');
});

test('Standard Chartered keeps three stepped tiers and road-parallel tapering entrance treads', () => {
  const {
    SCB_TIERS, SCB_MAIN_ROOF_Y, SCB_HEIGHT, SCB_FRONT_PIER_X, SCB_FRONT_GLASS_X,
    SCB_OCTAGON_Y, SCB_PODIUM_HEIGHT, SCB_ENTRANCE_HEIGHT, SCB_SIGN_FIN,
    SCB_STAIR_COUNT, SCB_STAIR_RUN, SCB_STAIR_WIDTH, SCB_STAIR_TOP_WIDTH,
    SCB_STAIR_TREAD, SCB_STAIR_RISE, SCB_STAIR_RIGHT_U, SCB_STAIR_LEFT_BOTTOM_U,
    SCB_STAIR_LEFT_TOP_U, SCB_FRONT_Z, SCB_BASE_Y, SCB_ENTRANCE_BASE_Y,
    SCB_STAIR_TOP_Z, SCB_STAIR_CONNECTOR_BASE_V, SCB_STAIR_CONNECTOR_RISE, SCB_FACADE_STAIR_ANGLE,
    scbStairEdgesAt, scbStairRoadToLocal, scbLocalToWorld, scbEntranceGroundHeight, scbLocalCollider
  } = scb;
  assert.equal(SCB_TIERS.length, 3);
  assert.deepEqual(SCB_TIERS.map((tier) => tier.id), ['north', 'central', 'south']);
  assert.ok(SCB_TIERS[0].roofY > SCB_TIERS[1].roofY && SCB_TIERS[1].roofY > SCB_TIERS[2].roofY);
  assert.equal(SCB_TIERS[0].roofY, SCB_MAIN_ROOF_Y);
  assert.equal(SCB_SIGN_FIN.topY, SCB_HEIGHT);
  assert.ok(SCB_SIGN_FIN.baseY < SCB_HEIGHT && SCB_SIGN_FIN.baseY >= SCB_MAIN_ROOF_Y);
  assert.equal(SCB_FRONT_PIER_X.length, 3);
  assert.equal(SCB_FRONT_GLASS_X.length, 2);
  assert.ok(SCB_OCTAGON_Y > SCB_ENTRANCE_BASE_Y + SCB_ENTRANCE_HEIGHT && SCB_OCTAGON_Y < SCB_PODIUM_HEIGHT,
    'the raised entrance glazing still clears the octagonal windows');
  assert.ok(SCB_ENTRANCE_HEIGHT > 12, 'the reference has unusually tall gold-framed entrance glazing');
  assert.equal(SCB_STAIR_COUNT, 30);
  assert.equal(SCB_STAIR_RUN, 6);
  assert.equal(SCB_STAIR_WIDTH, 18);
  assert.equal(SCB_STAIR_TOP_WIDTH, 12);
  assert.ok(SCB_STAIR_LEFT_BOTTOM_U > SCB_STAIR_LEFT_TOP_U && SCB_STAIR_LEFT_TOP_U > SCB_STAIR_RIGHT_U,
    'the HSBC-side edge tapers while the opposite edge stays square to the road');
  assert.deepEqual(scbStairEdgesAt(0), { right: SCB_STAIR_RIGHT_U, left: SCB_STAIR_LEFT_BOTTOM_U });
  assert.deepEqual(scbStairEdgesAt(1), { right: SCB_STAIR_RIGHT_U, left: SCB_STAIR_LEFT_TOP_U });
  assert.ok(Math.abs(SCB_STAIR_RISE * SCB_STAIR_COUNT - SCB_ENTRANCE_BASE_Y) < 1e-9);
  const origin = scbStairRoadToLocal(0, 0);
  const alongRoad = scbStairRoadToLocal(1, 0), towardsLobby = scbStairRoadToLocal(0, 1);
  const ux = alongRoad.x - origin.x, uz = alongRoad.z - origin.z;
  const vx = towardsLobby.x - origin.x, vz = towardsLobby.z - origin.z;
  assert.ok(Math.abs(ux * vx + uz * vz) < 1e-9, 'road-parallel risers and the ascent form a right angle');
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
    const edges = scbStairEdgesAt((i + 0.5) / SCB_STAIR_COUNT);
    const local = scbStairRoadToLocal((edges.left + edges.right) * 0.5, (i + 0.5) * SCB_STAIR_TREAD);
    const point = scbLocalToWorld(local.x, local.z);
    assert.ok(Math.abs(scbEntranceGroundHeight(point.x, point.z, 0.025) - (i + 1) * SCB_STAIR_RISE) < 1e-9,
      `road-parallel tread ${i + 1} has its own exact walking height`);
  }
  const outsideTopLocal = scbStairRoadToLocal(8, SCB_STAIR_RUN * 0.5);
  const outsideTop = scbLocalToWorld(outsideTopLocal.x, outsideTopLocal.z);
  assert.equal(scbEntranceGroundHeight(outsideTop.x, outsideTop.z, 0.025), 0.025,
    'the tapered triangle does not create an invisible rectangular walking surface');
  const landing = scbLocalToWorld(0, SCB_FRONT_Z - 0.2);
  assert.ok(Math.abs(scbEntranceGroundHeight(landing.x, landing.z, 0.025) - SCB_ENTRANCE_BASE_Y) < 1e-9);
  const connectorRight = scbStairRoadToLocal(SCB_STAIR_RIGHT_U, SCB_STAIR_CONNECTOR_BASE_V);
  const connectorLeft = scbStairRoadToLocal(
    SCB_STAIR_LEFT_TOP_U, SCB_STAIR_CONNECTOR_BASE_V + SCB_STAIR_CONNECTOR_RISE
  );
  assert.ok(Math.abs(connectorRight.z - SCB_STAIR_TOP_Z) < 1e-9
    && Math.abs(connectorLeft.z - SCB_STAIR_TOP_Z) < 1e-9,
  'the triangular connector diagonal is exactly the rotated facade landing outer edge');
  assert.ok(Math.abs(SCB_STAIR_CONNECTOR_RISE
    - Math.tan(SCB_FACADE_STAIR_ANGLE) * (SCB_STAIR_LEFT_TOP_U - SCB_STAIR_RIGHT_U)) < 1e-9);
  const connectorLocal = scbStairRoadToLocal(-3, SCB_STAIR_CONNECTOR_BASE_V + 2);
  const connectorPoint = scbLocalToWorld(connectorLocal.x, connectorLocal.z);
  assert.equal(scbEntranceGroundHeight(connectorPoint.x, connectorPoint.z, 0.025), SCB_ENTRANCE_BASE_Y,
    'the rendered triangular platform has the same raised walking surface');
  const besideConnectorLocal = scbStairRoadToLocal(4, SCB_STAIR_CONNECTOR_BASE_V + 1);
  const besideConnector = scbLocalToWorld(besideConnectorLocal.x, besideConnectorLocal.z);
  assert.equal(scbEntranceGroundHeight(besideConnector.x, besideConnector.z, 0.025), 0.025,
    'the triangle does not create an invisible rectangular platform beside its diagonal');
  const collider = scbLocalCollider({ x: 0, z: 0, w: 20, d: 20, minY: SCB_BASE_Y, maxY: SCB_HEIGHT });
  assert.ok(collider.obb && collider.maxY === SCB_HEIGHT);
});

test('the hand-built Standard Chartered model includes the photographed identifiers without bundled photo assets', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/standard-chartered-world.js'), 'utf8');
  assert.match(source, /SCBSteppedTowerTiers/);
  assert.match(source, /SCBFrontStonePiers/);
  assert.match(source, /SCBFrontRoseGlassChannels/);
  assert.match(source, /SCBOctagonalWindowFrames/);
  assert.match(source, /SCBOctagonalWindowLouvres/);
  assert.match(source, /SCBGoldEntranceSurrounds/);
  assert.match(source, /SCBTallEntranceGlazing/);
  assert.match(source, /SCBDesVoeuxRoadEntranceSteps/);
  assert.match(source, /SCBEntranceRaisedLandings/);
  assert.match(source, /SCBEntranceTriangularConnector/);
  assert.match(source, /SCB_BUILDING_HEADING/);
  assert.match(source, /SCBEntranceStairHandrail/);
  assert.match(source, /SCBEntranceStairRailPosts/);
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
