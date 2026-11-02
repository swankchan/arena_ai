import { buildFullHongKongWorld, FULL_WORLD_HEIGHT } from './full-world.js';
import { buildHongKongCrossings } from './crossings-world.js';
import { crossingSurfaceAt, selectCrossingGround } from './crossings.js';
import { fullRoadSurfaceAt, isTerritoryLand, isTerritoryRoad, territoryParkAt } from './full-meta.js';
import { HONG_KONG_TERRAIN_META, hongKongTerrainHeight } from './terrain.js';
import { surfaceRoadHeight } from './road-elevation.js';
import { SPAWN } from './meta.js';
import { createHongKongStreetLighting } from './street-lighting.js';
import { buildHsbcHeadquarters } from './hsbc-headquarters-world.js';
import { isHsbcPlazaPoint } from './hsbc-headquarters-architecture.js';
import { buildStandardCharteredBankBuilding } from './standard-chartered-world.js';
import { scbEntranceGroundHeight } from './standard-chartered-architecture.js';
import { buildTwoInternationalFinanceCentre } from './two-ifc-world.js';
import { isTwoIfcPlazaPoint } from './two-ifc-architecture.js';
import { buildInternationalCommerceCentre } from './icc-world.js';
import { isIccPlazaPoint } from './icc-architecture.js';
import { buildBankOfChinaTower } from './bank-of-china-world.js';
import { isBankOfChinaPlazaPoint } from './bank-of-china-architecture.js';
import { buildCentralPlaza } from './central-plaza-world.js';
import { isCentralPlazaPlazaPoint } from './central-plaza-architecture.js';
import { buildTheCenter } from './the-center-world.js';
import { isTheCenterPlazaPoint } from './the-center-architecture.js';
import { buildNinaTower } from './nina-tower-world.js';
import { isNinaTowerPlazaPoint } from './nina-tower-architecture.js';
import { buildCheungKongCenter } from './cheung-kong-world.js';
import { isCheungKongPlazaPoint } from './cheung-kong-architecture.js';
import { buildK11Atelier } from './k11-atelier-world.js';
import { isK11AtelierPlazaPoint } from './k11-atelier-architecture.js';
import { buildCullinanI } from './cullinan-i-world.js';
import { isCullinanIPlazaPoint } from './cullinan-i-architecture.js';
import { buildCullinanII } from './cullinan-ii-world.js';
import { isCullinanIIPlazaPoint } from './cullinan-ii-architecture.js';
import { buildMasterpiece } from './masterpiece-world.js';
import { isMasterpiecePlazaPoint } from './masterpiece-architecture.js';
import { buildLanghamPlace } from './langham-place-world.js';
import { isLanghamPlacePlazaPoint } from './langham-place-architecture.js';
import { buildSummit } from './summit-world.js';
import { isSummitPlazaPoint } from './summit-architecture.js';
import { buildHopewell } from './hopewell-world.js';
import { buildSunHungKai } from './sun-hung-kai-world.js';
import { isSunHungKaiPlazaPoint } from './sun-hung-kai-architecture.js';
import { buildTwoPacificPlace } from './two-pacific-place-world.js';
import { buildAirside } from './airside-world.js';
import { buildLeeGardenOne } from './lee-garden-one-world.js';
import { createHongKongTrafficAids } from './traffic-aids.js';

const WATER_LEVEL = -2.2;

// One coherent territory-wide DTM map. Roads follow the same terrain height queries used by players and furniture;
// the six explicit sea crossings retain their own main-span / submerged profiles. No generated building blocks.
export function buildSimpleHongKongWorld(scene, { setStatus = () => {} } = {}) {
  setStatus('Building Hong Kong’s unified territory-wide road map...');
  const full = buildFullHongKongWorld(scene, { waterLevel: WATER_LEVEL, includeCore: true });
  setStatus('Building the HSBC Main Building landmark...');
  const hsbc = buildHsbcHeadquarters(scene, { groundOffset: HONG_KONG_TERRAIN_META.hsbcPadHeight });
  setStatus('Building the Standard Chartered Bank Building landmark...');
  const standardChartered = buildStandardCharteredBankBuilding(scene, { groundOffset: HONG_KONG_TERRAIN_META.scbPadHeight });
  setStatus('Building Two International Finance Centre...');
  const twoIfc = buildTwoInternationalFinanceCentre(scene, { groundOffset: HONG_KONG_TERRAIN_META.twoIfcPadHeight });
  setStatus('Building the International Commerce Centre...');
  const icc = buildInternationalCommerceCentre(scene, { groundOffset: HONG_KONG_TERRAIN_META.iccPadHeight });
  setStatus('Building the Bank of China Tower...');
  const bankOfChina = buildBankOfChinaTower(scene, { groundOffset: HONG_KONG_TERRAIN_META.bankOfChinaPadHeight });
  setStatus('Building Central Plaza and its Lightime clock...');
  const centralPlaza = buildCentralPlaza(scene, { groundOffset: HONG_KONG_TERRAIN_META.centralPlazaPadHeight });
  setStatus('Building The Center and its rainbow neon facade...');
  const theCenter = buildTheCenter(scene, { groundOffset: HONG_KONG_TERRAIN_META.theCenterPadHeight });
  setStatus('Building Nina Tower, its crescent hotel and glass skybridge...');
  const ninaTower = buildNinaTower(scene, { groundOffset: HONG_KONG_TERRAIN_META.ninaTowerPadHeight });
  setStatus('Building Cheung Kong Center, its sunshades and fibre-optic facade...');
  const cheungKong = buildCheungKongCenter(scene, { groundOffset: HONG_KONG_TERRAIN_META.cheungKongPadHeight });
  setStatus('Building K11 Atelier, its limestone piers and stepped crown...');
  const k11Atelier = buildK11Atelier(scene, { groundOffset: HONG_KONG_TERRAIN_META.k11AtelierPadHeight });
  setStatus('Building The Cullinan I, its 40 m glass entrance and angular crown...');
  const cullinanI = buildCullinanI(scene, { groundOffset: HONG_KONG_TERRAIN_META.cullinanIPadHeight });
  setStatus('Building The Cullinan II and its crystalline W Hotel atrium...');
  const cullinanII = buildCullinanII(scene, { groundOffset: HONG_KONG_TERRAIN_META.cullinanIIPadHeight });
  setStatus('Building The Masterpiece, its curved balconies and open crown...');
  const masterpiece = buildMasterpiece(scene, { groundOffset: HONG_KONG_TERRAIN_META.masterpiecePadHeight });
  setStatus('Building Langham Place Office Tower and its ribbed dome...');
  const langhamPlace = buildLanghamPlace(scene, { groundOffset: HONG_KONG_TERRAIN_META.langhamPlacePadHeight });
  setStatus('Building The Summit butterfly wings, curved podium and crown...');
  const summit = buildSummit(scene, { groundOffset: HONG_KONG_TERRAIN_META.summitPadHeight });
  setStatus('Building Hopewell Centre, its cylindrical fins, revolving restaurant and observation lift...');
  const hopewell = buildHopewell(scene, {
    groundOffset: HONG_KONG_TERRAIN_META.hopewellDatumHeight,
    queensRoadUpperGround: HONG_KONG_TERRAIN_META.hopewellQreUpperPadHeight,
    queensRoadLowerGround: HONG_KONG_TERRAIN_META.hopewellQreLowerPadHeight,
    kennedyRoadGround: HONG_KONG_TERRAIN_META.hopewellKennedyPadHeight
  });
  setStatus('Building Sun Hung Kai Centre bronze grid, illuminated stone corners and sloping atrium...');
  const sunHungKai = buildSunHungKai(scene, { groundOffset: HONG_KONG_TERRAIN_META.sunHungKaiPadHeight });
  setStatus('Building Two Pacific Place ribbons, Island Shangri-La crown and its two arrival levels...');
  const twoPacificPlace = buildTwoPacificPlace(scene, {
    groundOffset: HONG_KONG_TERRAIN_META.twoPacificPlacePadHeight,
    hotelGround: HONG_KONG_TERRAIN_META.twoPacificPlaceHotelPadHeight,
    officeGround: HONG_KONG_TERRAIN_META.twoPacificPlaceOfficePadHeight
  });
  setStatus('Building AIRSIDE’s five textile-inspired volumes, fluted glass and rooftop landscape...');
  const airside = buildAirside(scene, { groundOffset: HONG_KONG_TERRAIN_META.airsidePadHeight });
  setStatus('Building Lee Garden One’s triangular tower, three corner lobes and southwest spire...');
  const leeGardenOne = buildLeeGardenOne(scene, { groundOffset: HONG_KONG_TERRAIN_META.leeGardenOnePadHeight });
  setStatus('Building drivable harbour bridges and tunnels...');
  const crossings = buildHongKongCrossings(scene);
  setStatus('Placing 144,995 lamp posts across Hong Kong...');
  const streetLighting = createHongKongStreetLighting(scene);
  setStatus('Restoring surveyed Hong Kong road markings and crossings...');
  const getRoadPaintHeight = (x, z) => {
    const fallback = surfaceRoadHeight(x, z);
    return fullRoadSurfaceAt(x, z, 8, fallback)?.height ?? fallback;
  };
  const trafficAids = createHongKongTrafficAids(scene, {
    getGroundHeight, getSurfaceHeight: getRoadPaintHeight, surfaceY: FULL_WORLD_HEIGHT.road
  });

  const isPointOnLand = (x, z) => isTerritoryLand(x, z) || isTerritoryRoad(x, z, 0.35);
  const isPointOnSidewalk = () => false;
  function getGroundHeight(x, z, mode, referenceY = 0) {
    if (mode === 'helicopter') return 0;
    let base = WATER_LEVEL;
    if (isTerritoryLand(x, z)) base = hongKongTerrainHeight(x, z) + FULL_WORLD_HEIGHT.land;
    if (territoryParkAt(x, z)) base = hongKongTerrainHeight(x, z) + FULL_WORLD_HEIGHT.park;
    const road = fullRoadSurfaceAt(x, z, 0.35, referenceY);
    let groundUsesRoad = false;
    if (road) {
      const layered = Boolean(road.flags & 6);
      if (!layered || Math.abs(road.height - referenceY) <= Math.abs(base - referenceY) + 0.5) { base = road.height; groundUsesRoad = true; }
    }
    const crossingGround = selectCrossingGround(base, crossingSurfaceAt(x, z), referenceY, WATER_LEVEL);
    const ground = scbEntranceGroundHeight(x, z, crossingGround, standardChartered.groundOffset);
    const twoIfcGround = isTwoIfcPlazaPoint(x, z) ? Math.max(ground, twoIfc.plazaTop) : ground;
    const iccGround = isIccPlazaPoint(x, z) ? Math.max(twoIfcGround, icc.plazaTop) : twoIfcGround;
    const bocGround = isBankOfChinaPlazaPoint(x, z) ? Math.max(iccGround, bankOfChina.plazaTop) : iccGround;
    const centralPlazaGround = isCentralPlazaPlazaPoint(x, z) ? Math.max(bocGround, centralPlaza.plazaTop) : bocGround;
    const theCenterGround = isTheCenterPlazaPoint(x, z) ? Math.max(centralPlazaGround, theCenter.plazaTop) : centralPlazaGround;
    // Nina Tower's ground-level service roads and tunnels remain roads; only the non-road mall floor is raised.
    const ninaGround = !road && isNinaTowerPlazaPoint(x, z) ? Math.max(theCenterGround, ninaTower.plazaTop) : theCenterGround;
    const cheungKongGround = !road && isCheungKongPlazaPoint(x, z) ? Math.max(ninaGround, cheungKong.plazaTop) : ninaGround;
    // K11's surface access roads stay drivable through authored portals; an unselected tunnel below does not suppress the lobby floor.
    const k11AtelierGround = !groundUsesRoad && isK11AtelierPlazaPoint(x, z) ? Math.max(cheungKongGround, k11Atelier.plazaTop) : cheungKongGround;
    // Cullinan I's forecourts share the same local construction datum; selected roads always remain roads.
    const cullinanIGround = !groundUsesRoad && isCullinanIPlazaPoint(x, z) ? Math.max(k11AtelierGround, cullinanI.plazaTop) : k11AtelierGround;
    // The W forecourt uses its own DTM datum; selected roads remain roads at every level.
    const cullinanIIGround = !groundUsesRoad && isCullinanIIPlazaPoint(x, z) ? Math.max(cullinanIGround, cullinanII.plazaTop) : cullinanIGround;
    // The Hanoi Road residential forecourt has its own DTM datum; selected roads always remain roads.
    const masterpieceGround = !groundUsesRoad && isMasterpiecePlazaPoint(x, z) ? Math.max(cullinanIIGround, masterpiece.plazaTop) : cullinanIIGround;
    // Langham Place's exact OSM entrance forecourt stays subordinate to any selected carriageway.
    const langhamPlaceGround = !groundUsesRoad && isLanghamPlacePlazaPoint(x, z) ? Math.max(masterpieceGround, langhamPlace.plazaTop) : masterpieceGround;
    // The Happy Valley-facing lobby terrace uses its own DTM sample; any selected carriageway remains a road.
    const summitGround = !groundUsesRoad && isSummitPlazaPoint(x, z) ? Math.max(langhamPlaceGround, summit.plazaTop) : langhamPlaceGround;
    // Hopewell preserves the sloping tower site; only its two source-tagged lobbies and QRE escalator landings are authored.
    const hopewellGround = !groundUsesRoad ? hopewell.groundHeightAt(x, z, summitGround) : summitGround;
    // Sun Hung Kai's podium is flat, but its source-tagged covered service way always remains a road surface.
    const sunHungKaiGround = !groundUsesRoad && isSunHungKaiPlazaPoint(x, z) ? Math.max(hopewellGround, sunHungKai.plazaTop) : hopewellGround;
    // Two Pacific Place has separate hotel and office DTM pads. The selected layer=1 driveway remains road-priority under the overhang.
    const twoPacificPlaceGround = !groundUsesRoad ? twoPacificPlace.groundHeightAt(x, z, sunHungKaiGround) : sunHungKaiGround;
    // AIRSIDE's covered surface access ways remain road-priority; an unselected B1 tunnel does not suppress the lobby floor.
    const airsideGround = !groundUsesRoad ? airside.groundHeightAt(x, z, twoPacificPlaceGround) : twoPacificPlaceGround;
    // Lee Garden One's driveway and underground-parking access stay on the selected road profile.
    const leeGardenOneGround = !groundUsesRoad ? leeGardenOne.groundHeightAt(x, z, airsideGround) : airsideGround;
    return isHsbcPlazaPoint(x, z) ? Math.max(leeGardenOneGround, hsbc.plazaTop) : leeGardenOneGround;
  }

  const stats = {
    ...full.stats,
    ...crossings.stats,
    ...streetLighting.stats,
    ...trafficAids.stats,
    ...hsbc.stats,
    ...standardChartered.stats,
    ...twoIfc.stats,
    ...icc.stats,
    ...bankOfChina.stats,
    ...centralPlaza.stats,
    ...theCenter.stats,
    ...ninaTower.stats,
    ...cheungKong.stats,
    ...k11Atelier.stats,
    ...cullinanI.stats,
    ...cullinanII.stats,
    ...masterpiece.stats,
    ...langhamPlace.stats,
    ...summit.stats,
    ...hopewell.stats,
    ...sunHungKai.stats,
    ...twoPacificPlace.stats,
    ...airside.stats,
    ...leeGardenOne.stats,
    presentation: 'unified-simple',
    landMeshes: full.stats.fullLandRings,
    blocks: 0,
    parks: full.stats.fullParks,
    landmarks: hsbc.landmarks.length + standardChartered.landmarks.length + twoIfc.landmarks.length + icc.landmarks.length + bankOfChina.landmarks.length + centralPlaza.landmarks.length + theCenter.landmarks.length + ninaTower.landmarks.length + cheungKong.landmarks.length + k11Atelier.landmarks.length + cullinanI.landmarks.length + cullinanII.landmarks.length + masterpiece.landmarks.length + langhamPlace.landmarks.length + summit.landmarks.length + hopewell.landmarks.length + sunHungKai.landmarks.length + twoPacificPlace.landmarks.length + airside.landmarks.length + leeGardenOne.landmarks.length,
    lots: 0,
    buildings: 0,
    skippedLots: 0,
    lamps: streetLighting.stats.streetLightSourceLamps,
    trees: 0,
    signs: 0
  };
  console.info('[hongkong] unified simple world with crossings', stats);

  return {
    root: scene,
    colliders: [...full.colliders, ...crossings.colliders, ...hsbc.colliders, ...standardChartered.colliders, ...twoIfc.colliders, ...icc.colliders, ...bankOfChina.colliders, ...centralPlaza.colliders, ...theCenter.colliders, ...ninaTower.colliders, ...cheungKong.colliders, ...k11Atelier.colliders, ...cullinanI.colliders, ...cullinanII.colliders, ...masterpiece.colliders, ...langhamPlace.colliders, ...summit.colliders, ...hopewell.colliders, ...sunHungKai.colliders, ...twoPacificPlace.colliders, ...airside.colliders, ...leeGardenOne.colliders],
    bounds: full.bounds,
    stats,
    personSpawn: { ...SPAWN.person },
    isPointOnLand,
    isPointOnSidewalk,
    getGroundHeight,
    update(dt, elapsed, context) {
      crossings.update?.(context);
      centralPlaza.update?.(dt, elapsed, context);
      theCenter.update?.(dt, elapsed, context);
      streetLighting.update(context);
    },
    streetLighting,
    hsbc,
    standardChartered,
    twoIfc,
    icc,
    bankOfChina,
    centralPlaza,
    theCenter,
    ninaTower,
    cheungKong,
    k11Atelier,
    cullinanI,
    cullinanII,
    masterpiece,
    langhamPlace,
    summit,
    hopewell,
    sunHungKai,
    twoPacificPlace,
    airside,
    leeGardenOne,
    treeField: null,
    landmarks: [...hsbc.landmarks, ...standardChartered.landmarks, ...twoIfc.landmarks, ...icc.landmarks, ...bankOfChina.landmarks, ...centralPlaza.landmarks, ...theCenter.landmarks, ...ninaTower.landmarks, ...cheungKong.landmarks, ...k11Atelier.landmarks, ...cullinanI.landmarks, ...cullinanII.landmarks, ...masterpiece.landmarks, ...langhamPlace.landmarks, ...summit.landmarks, ...hopewell.landmarks, ...sunHungKai.landmarks, ...twoPacificPlace.landmarks, ...airside.landmarks, ...leeGardenOne.landmarks],
    trafficAids
  };
}
