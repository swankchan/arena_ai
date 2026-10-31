const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
let architecture;
let scb;
let geo;

test.before(async () => {
  architecture = await import('../js/cities/hongkong/hsbc-headquarters-architecture.js');
  scb = await import('../js/cities/hongkong/standard-chartered-architecture.js');
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

test('Standard Chartered uses OSM way 85320719 immediately west of HSBC with a north-facing OBB', () => {
  const { SCB_SITE, SCB_HEIGHT, SCB_FLOORS, scbWorldToLocal, scbLocalToWorld } = scb;
  const { HSBC_SITE } = architecture;
  assert.equal(SCB_SITE.name, '渣打銀行大廈');
  assert.equal(SCB_SITE.osmId, 85320719);
  assert.equal(SCB_SITE.source.ring, SCB_SITE.ring);
  assert.equal(SCB_HEIGHT, 191);
  assert.equal(SCB_FLOORS, 42);
  assert.ok(SCB_SITE.x < HSBC_SITE.x - 35, 'Standard Chartered is on the west side of HSBC');
  assert.ok(Math.abs(SCB_SITE.z - HSBC_SITE.z) < 20, 'both buildings occupy the same Central block frontage');
  assert.ok(SCB_SITE.ry < 0 && SCB_SITE.ry > -0.4, 'the facade follows Des Voeux Road Central');
  assert.ok(SCB_SITE.d > SCB_SITE.w * 2, 'the real site is a narrow frontage with a long lot');
  for (let i = 0; i < SCB_SITE.ring.length; i += 2) {
    const local = scbWorldToLocal(SCB_SITE.ring[i], SCB_SITE.ring[i + 1]);
    assert.ok(Math.abs(local.x) <= SCB_SITE.w * 0.5 + 1e-6);
    assert.ok(Math.abs(local.z) <= SCB_SITE.d * 0.5 + 1e-6);
  }
  const north = scbLocalToWorld(0, -10), south = scbLocalToWorld(0, 10);
  assert.ok(north.z < south.z, 'local -z faces north / Des Voeux Road Central');
});

test('Standard Chartered keeps three stepped tiers, three octagon bays and a walkable entrance stair', () => {
  const {
    SCB_TIERS, SCB_MAIN_ROOF_Y, SCB_HEIGHT, SCB_FRONT_PIER_X, SCB_FRONT_GLASS_X,
    SCB_OCTAGON_Y, SCB_PODIUM_HEIGHT, SCB_ENTRANCE_HEIGHT, SCB_SIGN_FIN,
    SCB_STAIR_COUNT, SCB_STAIR_FRONT_Z, SCB_FRONT_Z, SCB_BASE_Y,
    scbLocalToWorld, scbEntranceGroundHeight, scbLocalCollider
  } = scb;
  assert.equal(SCB_TIERS.length, 3);
  assert.deepEqual(SCB_TIERS.map((tier) => tier.id), ['north', 'central', 'south']);
  assert.ok(SCB_TIERS[0].roofY > SCB_TIERS[1].roofY && SCB_TIERS[1].roofY > SCB_TIERS[2].roofY);
  assert.equal(SCB_TIERS[0].roofY, SCB_MAIN_ROOF_Y);
  assert.equal(SCB_SIGN_FIN.topY, SCB_HEIGHT);
  assert.ok(SCB_SIGN_FIN.baseY < SCB_HEIGHT && SCB_SIGN_FIN.baseY >= SCB_MAIN_ROOF_Y);
  assert.equal(SCB_FRONT_PIER_X.length, 3);
  assert.equal(SCB_FRONT_GLASS_X.length, 2);
  assert.ok(SCB_OCTAGON_Y > SCB_ENTRANCE_HEIGHT && SCB_OCTAGON_Y < SCB_PODIUM_HEIGHT);
  assert.ok(SCB_ENTRANCE_HEIGHT > 12, 'the reference has unusually tall gold-framed entrance glazing');
  assert.equal(SCB_STAIR_COUNT, 5);
  const far = scbLocalToWorld(0, SCB_STAIR_FRONT_Z - 0.01);
  const landing = scbLocalToWorld(0, SCB_FRONT_Z - 0.2);
  assert.equal(scbEntranceGroundHeight(far.x, far.z, 0.025), 0.025);
  assert.ok(Math.abs(scbEntranceGroundHeight(landing.x, landing.z, 0.025) - SCB_BASE_Y) < 1e-9);
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
  assert.match(source, /SCBCrownLogo/);
  assert.match(source, /SCBCrownLogoWest/);
  assert.match(source, /createScbRibbonFacadeMaterial/);
  assert.match(source, /createScbFrontGlassMaterial/);
  assert.match(source, /cityUniforms\.uInteriorGlow/);
  assert.doesNotMatch(source, /TextureLoader|image-search|https?:\/\//);
});
