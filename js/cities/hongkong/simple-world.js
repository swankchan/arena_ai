import {buildCentralApproachEarthworks} from './peak-tram-central-earthworks.js';
import {centralApproachGrade} from './peak-tram-central-earthworks-site.js';
import {buildPeakTramCentralRoof} from './peak-tram-central-roof.js';
import {buildPeakTramCentralConcourse} from './peak-tram-central-concourse.js';
import {centralConcourseGroundHeight,centralConcourseUnderRoad} from './peak-tram-central-concourse-site.js';
import {buildCentralLift} from './peak-tram-central-lift.js';
import {buildPeakTramCentralApproach} from './peak-tram-central-approach.js';
import {buildPeakTramCentralPlatform} from './peak-tram-central-platform.js';
import {centralPlatformGroundHeight, centralPlatformUnderRoad} from './peak-tram-central-platform-site.js';
import {buildPeakTramCentralEntrance} from './peak-tram-central-entrance.js';
import {buildStJohnsBuilding} from './st-johns-building-world.js';
import { buildHkapa } from './hkapa-world.js';
import { runLoadingSteps, runLoadingStepsAsync } from '../../loading-steps.js';
import { buildMurray } from './murray-world.js';
import { buildPeakTower } from './peak-tower-world.js';
import { buildPeakTramKennedyBridge } from './peak-tram-kennedy-bridge.js';
import { buildPeakTramKennedyApproach } from './peak-tram-kennedy-approach.js';
import { buildMacDonnellStation } from './peak-tram-macdonnell-station.js';
import { buildMacDonnellBridge } from './peak-tram-macdonnell-bridge.js';
import { buildMagazineGapBridge } from './peak-tram-magazine-gap-bridge.js';
import { buildMayRoadBridge } from './peak-tram-may-road-bridge.js';
import { buildMayRoadStation } from './peak-tram-may-road-station.js';
import { buildPeakTramPassingLoop } from './peak-tram-passing-loop.js';
import { buildPeakTramUpperLine } from './peak-tram-upper-line.js';
import { buildPeakTramBarkerApproach } from './peak-tram-barker-approach.js';
import { buildPeakTramSummitApproach } from './peak-tram-summit-approach.js';
import { buildPeakTramBarkerStationTrack } from './peak-tram-barker-station-track.js';
import { buildBarkerRoadStation } from './peak-tram-barker-station.js';
import { buildBarkerRoadEarthworks } from './peak-tram-barker-earthworks.js';
import { buildBarkerAbutments } from './peak-tram-barker-abutments.js';
import { buildPeakTramLoopGrading } from './peak-tram-loop-grading.js';
import { peakTramLoopGrade } from './peak-tram-loop-grading-site.js';
import { buildGovernmentHouse } from './government-house-world.js';
import { buildSogoCausewayBay } from './sogo-world.js';
import { buildJardineHouse } from './jardine-house-world.js';
import { buildBlueHouse } from './blue-house-world.js';
import { buildWindsorHouse } from './windsor-house-world.js';
import { buildWanchaiTower } from './wanchai-tower-world.js';
import { buildRevenueTower } from './revenue-tower-world.js';
import { buildImmigrationTower } from './immigration-tower-world.js';
import { buildObrienFootbridge } from './obrien-footbridge-world.js';
import { buildGeneralPostOffice } from './general-post-office-world.js';
import { buildIfcMall } from './ifc-mall-world.js';
import { buildWorldWideHouse } from './world-wide-house-world.js';
import { buildStatueSquare } from './statue-square-world.js';
import { buildShunTakCentre } from './shun-tak-world.js';
import { buildChaterGarden } from './chater-garden-world.js';
import { buildEntertainmentBuilding } from './entertainment-building-world.js';
import { buildMandarinOriental } from './mandarin-oriental-world.js';
import { buildPrincesBuilding } from './princes-building-world.js';
import { buildHongKongClub } from './hong-kong-club-world.js';
import { buildHangSengHeadquarters } from './hang-seng-world.js';
import { buildHongKongColiseum } from './coliseum-world.js';
import { buildFullHongKongWorldSteps, FULL_WORLD_HEIGHT } from './full-world.js';
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
import { buildOneInternationalFinanceCentre } from './one-ifc-world.js';
import { buildChampionTower } from './champion-tower-world.js';
import { buildCkc2 } from './ckc2-world.js';
import { buildQgo } from './qgo-world.js';
import { buildCentralGovernmentComplex } from './central-government-world.js';
import { buildHeritage1881 } from './heritage-1881-world.js';
import { buildTheArch } from './the-arch-world.js';
import { buildSorrento } from './sorrento-world.js';
import { buildConrad } from './conrad-world.js';
import { buildHysanPlace } from './hysan-place-world.js';
import { buildTwoTaikooPlace } from './two-taikoo-place-world.js';
import { buildTheHenderson } from './the-henderson-world.js';
import { buildOneExchangeSquare } from './one-exchange-square-world.js';
import { buildTwoExchangeSquare } from './two-exchange-square-world.js';
import { buildCourtOfFinalAppeal } from './court-of-final-appeal-world.js';
import { buildHkcec } from './hkcec-world.js';
import { buildMongKokStadium } from './mong-kok-stadium-world.js';
import { buildHongKongStadium } from './hong-kong-stadium-world.js';
import { buildLaiYuen } from './lai-yuen-world.js';
import { buildQueenElizabethStadium } from './queen-elizabeth-stadium-world.js';
import { buildKaiTakStadium } from './kai-tak-stadium-world.js';
import { buildKaiTakArena } from './kai-tak-arena-world.js';
import { buildKaiTakYouthSportsGround } from './kai-tak-youth-sports-ground-world.js';
import { buildHappyValleyRacecourse } from './happy-valley-racecourse-world.js';
import { buildShaTinRacecourse } from './sha-tin-racecourse-world.js';
import { buildOceanPark } from './ocean-park-world.js';
import { buildTimesSquare } from './times-square-world.js';
import { buildOceanTerminal } from './ocean-terminal-world.js';
import { buildStarHouse } from './star-house-world.js';
import { buildMarcoPoloHongkongHotel } from './marco-polo-hongkong-world.js';
import { buildOceanCentre } from './ocean-centre-world.js';
import { buildPrinceHotel } from './prince-hotel-world.js';
import { buildGatewayTowerOne } from './gateway-tower-one-world.js';
import { buildGatewayTowerTwo } from './gateway-tower-two-world.js';
import { buildGatewayTowerThree } from './gateway-tower-three-world.js';
import { buildGatewayTowerFive } from './gateway-tower-five-world.js';
import { buildGatewayTowerSix } from './gateway-tower-six-world.js';
import { buildPacificClub } from './pacific-club-world.js';
import { buildSpaceMuseum } from './space-museum-world.js';
import { buildCulturalCentre } from './cultural-centre-world.js';
import { buildCityHall } from './city-hall-world.js';
import { buildCentralLibrary } from './central-library-world.js';
import { buildClockTower } from './clock-tower-world.js';
import { buildPeninsulaHotel } from './peninsula-hotel-world.js';
import { buildSheratonHotel } from './sheraton-hotel-world.js';
import { buildSalisburyYMCA } from './salisbury-ymca-world.js';
import { buildKowloonShangriLa } from './kowloon-shangri-la-world.js';
import { buildHongKongPark } from './hong-kong-park-world.js';
import { buildKowloonPark } from './kowloon-park-world.js';
import { buildVictoriaPark } from './victoria-park-world.js';
import { buildMajorParkTreeLayer } from './major-parks-world-utils.js';
import { createHongKongTrafficAids } from './traffic-aids.js';
import { buildHongKongAirport } from './airport-world.js';
import { buildTstWaterfrontRailing } from './tst-waterfront-railing-world.js';

const WATER_LEVEL = -2.2;

// One coherent territory-wide DTM map. Roads follow the same terrain height queries used by players and furniture;
// the six explicit sea crossings retain their own main-span / submerged profiles. No generated building blocks.
function* buildSimpleHongKongWorldSteps(scene) {
  yield 'Building Hong Kong’s unified territory-wide road map...';
  const full = yield* buildFullHongKongWorldSteps(scene, { waterLevel: WATER_LEVEL, includeCore: true });
  yield 'Building Hong Kong International Airport: three runways, terminals and control towers...';
  const airport = buildHongKongAirport(scene);
  yield 'Building the HSBC Main Building landmark...';
  const hsbc = buildHsbcHeadquarters(scene, { groundOffset: HONG_KONG_TERRAIN_META.hsbcPadHeight });
  yield 'Building 信德中心及港澳碼頭 Shun Tak Centre...';
  const shunTak = buildShunTakCentre(scene);
  yield 'Building 遮打花園 Chater Garden...';
  const chaterGarden = buildChaterGarden(scene);
  yield 'Building 皇后像廣場 Statue Square...';
  const statueSquare = buildStatueSquare(scene);
  yield 'Building 環球大廈 World-Wide House...';
  const worldWideHouse = buildWorldWideHouse(scene);
  yield 'Building 娛樂行 Entertainment Building...';
  const entertainmentBuilding = buildEntertainmentBuilding(scene);
  yield 'Building 香港文華東方酒店 Mandarin Oriental...';
  const mandarinOriental = buildMandarinOriental(scene);
  yield 'Building 太子大廈 Prince’s Building...';
  const princesBuilding = buildPrincesBuilding(scene);
  yield 'Building 香港會所大廈 The Hong Kong Club Building...';
  const hongKongClub = buildHongKongClub(scene);
  yield 'Building 恒生銀行總行 Hang Seng Bank Headquarters...';
  const hangSeng = buildHangSengHeadquarters(scene);
  yield 'Building the Standard Chartered Bank Building landmark...';
  const standardChartered = buildStandardCharteredBankBuilding(scene, { groundOffset: HONG_KONG_TERRAIN_META.scbPadHeight });
  yield 'Building Two International Finance Centre...';
  const twoIfc = buildTwoInternationalFinanceCentre(scene, { groundOffset: HONG_KONG_TERRAIN_META.twoIfcPadHeight });
  yield 'Building 國際金融中心商場 IFC Mall...';
  const ifcMall = buildIfcMall(scene);
  const generalPostOffice = buildGeneralPostOffice(scene);
  const revenueTower = buildRevenueTower(scene);
  const wanchaiTower = buildWanchaiTower(scene);
  const immigrationTower = buildImmigrationTower(scene);
  const obrienFootbridge = buildObrienFootbridge(scene);
  const windsorHouse = buildWindsorHouse(scene);
  yield 'Building 銅鑼灣崇光百貨 SOGO...';
  const sogo = buildSogoCausewayBay(scene);
  yield 'Building 香港禮賓府 Government House...';
  const governmentHouse = buildGovernmentHouse(scene);
  yield 'Building 凌霄閣 Peak Tower...';
  const peakTower = buildPeakTower(scene);
  const stJohns = buildStJohnsBuilding(scene);
  const peakTramCentralEntrance = buildPeakTramCentralEntrance(scene);
  const peakTramCentralPlatform = buildPeakTramCentralPlatform(scene);
  const centralPlatformRoof = buildPeakTramCentralRoof(scene);
  const centralConcourse = buildPeakTramCentralConcourse(scene);
  const centralLift = buildCentralLift(scene);
  const peakTramCentralApproach = buildPeakTramCentralApproach(scene);
  const centralEarthworks = buildCentralApproachEarthworks(scene);
  const peakTramKennedyBridge = buildPeakTramKennedyBridge(scene);
  const peakTramKennedyApproach = buildPeakTramKennedyApproach(scene);
  const peakTramMacDonnell = buildMacDonnellStation(scene);
  const peakTramMacDonnellBridge = buildMacDonnellBridge(scene);
  const peakTramMagazineGapBridge = buildMagazineGapBridge(scene);
  const peakTramMayRoadBridge = buildMayRoadBridge(scene);
  const peakTramMayRoadStation = buildMayRoadStation(scene);
  const peakTramPassingLoop = buildPeakTramPassingLoop(scene);
  const peakTramUpperLine = buildPeakTramUpperLine(scene);
  const peakTramBarkerApproach = buildPeakTramBarkerApproach(scene);
  const peakTramSummitApproach = buildPeakTramSummitApproach(scene);
  const peakTramBarkerStationTrack = buildPeakTramBarkerStationTrack(scene);
  const peakTramBarkerStation = buildBarkerRoadStation(scene);
  const peakTramBarkerEarthworks = buildBarkerRoadEarthworks(scene);
  const peakTramBarkerAbutments = buildBarkerAbutments(scene);
  const peakTramLoopGrading = buildPeakTramLoopGrading(scene);
  const murray = buildMurray(scene);
  const blueHouse = buildBlueHouse(scene);
  yield 'Building 香港演藝學院 Hong Kong Academy for Performing Arts...';
  const hkapa = buildHkapa(scene);
  const jardineHouse = buildJardineHouse(scene);
  yield 'Building the International Commerce Centre...';
  const icc = buildInternationalCommerceCentre(scene, { groundOffset: HONG_KONG_TERRAIN_META.iccPadHeight });
  yield 'Building the Bank of China Tower...';
  const bankOfChina = buildBankOfChinaTower(scene, { groundOffset: HONG_KONG_TERRAIN_META.bankOfChinaPadHeight });
  yield 'Building Central Plaza and its Lightime clock...';
  const centralPlaza = buildCentralPlaza(scene, { groundOffset: HONG_KONG_TERRAIN_META.centralPlazaPadHeight });
  yield 'Building The Center and its rainbow neon facade...';
  const theCenter = buildTheCenter(scene, { groundOffset: HONG_KONG_TERRAIN_META.theCenterPadHeight });
  yield 'Building Nina Tower, its crescent hotel and glass skybridge...';
  const ninaTower = buildNinaTower(scene, { groundOffset: HONG_KONG_TERRAIN_META.ninaTowerPadHeight });
  yield 'Building Cheung Kong Center, its sunshades and fibre-optic facade...';
  const cheungKong = buildCheungKongCenter(scene, { groundOffset: HONG_KONG_TERRAIN_META.cheungKongPadHeight });
  yield 'Building K11 Atelier, its limestone piers and stepped crown...';
  const k11Atelier = buildK11Atelier(scene, { groundOffset: HONG_KONG_TERRAIN_META.k11AtelierPadHeight });
  yield 'Building The Cullinan I, its 40 m glass entrance and angular crown...';
  const cullinanI = buildCullinanI(scene, { groundOffset: HONG_KONG_TERRAIN_META.cullinanIPadHeight });
  yield 'Building The Cullinan II and its crystalline W Hotel atrium...';
  const cullinanII = buildCullinanII(scene, { groundOffset: HONG_KONG_TERRAIN_META.cullinanIIPadHeight });
  yield 'Building The Masterpiece, its curved balconies and open crown...';
  const masterpiece = buildMasterpiece(scene, { groundOffset: HONG_KONG_TERRAIN_META.masterpiecePadHeight });
  yield 'Building Langham Place Office Tower and its ribbed dome...';
  const langhamPlace = buildLanghamPlace(scene, { groundOffset: HONG_KONG_TERRAIN_META.langhamPlacePadHeight });
  yield 'Building The Summit butterfly wings, curved podium and crown...';
  const summit = buildSummit(scene, { groundOffset: HONG_KONG_TERRAIN_META.summitPadHeight });
  yield 'Building Hopewell Centre, its cylindrical fins, revolving restaurant and observation lift...';
  const hopewell = buildHopewell(scene, {
    groundOffset: HONG_KONG_TERRAIN_META.hopewellDatumHeight,
    queensRoadUpperGround: HONG_KONG_TERRAIN_META.hopewellQreUpperPadHeight,
    queensRoadLowerGround: HONG_KONG_TERRAIN_META.hopewellQreLowerPadHeight,
    kennedyRoadGround: HONG_KONG_TERRAIN_META.hopewellKennedyPadHeight
  });
  yield 'Building Sun Hung Kai Centre bronze grid, illuminated stone corners and sloping atrium...';
  const sunHungKai = buildSunHungKai(scene, { groundOffset: HONG_KONG_TERRAIN_META.sunHungKaiPadHeight });
  yield 'Building Two Pacific Place ribbons, Island Shangri-La crown and its two arrival levels...';
  const twoPacificPlace = buildTwoPacificPlace(scene, {
    groundOffset: HONG_KONG_TERRAIN_META.twoPacificPlacePadHeight,
    hotelGround: HONG_KONG_TERRAIN_META.twoPacificPlaceHotelPadHeight,
    officeGround: HONG_KONG_TERRAIN_META.twoPacificPlaceOfficePadHeight
  });
  yield 'Building AIRSIDE’s five textile-inspired volumes, fluted glass and rooftop landscape...';
  const airside = buildAirside(scene, { groundOffset: HONG_KONG_TERRAIN_META.airsidePadHeight });
  yield 'Building Lee Garden One’s triangular tower, three corner lobes and southwest spire...';
  const leeGardenOne = buildLeeGardenOne(scene, { groundOffset: HONG_KONG_TERRAIN_META.leeGardenOnePadHeight });
  yield 'Building One IFC’s stepped-square shaft, pilaster fins and open crown...';
  const oneIfc = buildOneInternationalFinanceCentre(scene, { groundOffset: HONG_KONG_TERRAIN_META.oneIfcPadHeight });
  yield 'Building Champion Tower’s curved reflective facade and ten-storey lobby...';
  const championTower = buildChampionTower(scene, { groundOffset: HONG_KONG_TERRAIN_META.championTowerPadHeight });
  yield 'Building Cheung Kong Center II’s jumbo glass podium and CKC II crown...';
  const ckc2 = buildCkc2(scene, { groundOffset: HONG_KONG_TERRAIN_META.ckc2PadHeight });
  yield 'Building Queensway Government Offices’ ribbon windows and rooftop dragon...';
  const qgo = buildQgo(scene, { groundOffset: HONG_KONG_TERRAIN_META.qgoPadHeight, entranceGroundOffset: HONG_KONG_TERRAIN_META.qgoEntrancePadHeight });
  yield 'Building Tamar’s Open Door, Chief Executive’s Office and Legislative Council Complex...';
  const centralGovernment = buildCentralGovernmentComplex(scene, { groundOffset: HONG_KONG_TERRAIN_META.centralGovernmentPadHeight });
  yield 'Building 1881 Heritage’s verandahs, grand staircase, Round House and time ball...';
  const heritage1881 = buildHeritage1881(scene, { groundOffset: HONG_KONG_TERRAIN_META.heritage1881PadHeight });
  yield 'Building The Arch’s four towers, elevated clubhouse and circular crown opening...';
  const theArch = buildTheArch(scene, { groundOffset: HONG_KONG_TERRAIN_META.theArchPadHeight });
  yield 'Building Sorrento’s five winged towers, white fins and curved beige sail crowns...';
  const sorrento = buildSorrento(scene, { groundOffset: HONG_KONG_TERRAIN_META.sorrentoPadHeight });
  yield 'Building Conrad Hong Kong’s curved ribbons, white fins and Supreme Court Road porte-cochere...';
  const conrad = buildConrad(scene, { groundOffset: HONG_KONG_TERRAIN_META.conradPadHeight, entranceGroundOffset: HONG_KONG_TERRAIN_META.conradEntrancePadHeight });
  yield 'Building Hysan Place’s shifting volumes, sky gardens and diagonal express escalators...';
  const hysan = buildHysanPlace(scene, { groundOffset: HONG_KONG_TERRAIN_META.hysanPadHeight });
  yield 'Building Two Taikoo Place’s conical glass corners, sky gardens and renewable-energy roof...';
  const twoTaikoo = buildTwoTaikooPlace(scene, { groundOffset: HONG_KONG_TERRAIN_META.twoTaikooPadHeight });
  yield 'Building The Henderson’s curved silver petals, elevated lobby, Sky Garden and Cloud 39...';
  const theHenderson = buildTheHenderson(scene, { groundOffset: HONG_KONG_TERRAIN_META.hendersonPadHeight });
  yield 'Building One Exchange Square’s silver cylinders, pink granite and bus-terminal podium...';
  const oneExchange = buildOneExchangeSquare(scene, { groundOffset: HONG_KONG_TERRAIN_META.oneExchangePadHeight });
  yield 'Building Two Exchange Square’s curved arrival, lift directory and long-core roof...';
  const twoExchange = buildTwoExchangeSquare(scene, { groundOffset: HONG_KONG_TERRAIN_META.twoExchangePadHeight });
  yield 'Building the Court of Final Appeal’s granite colonnades, Themis and ribbed dome...';
  const courtOfFinalAppeal = buildCourtOfFinalAppeal(scene, { groundOffset: HONG_KONG_TERRAIN_META.cfaPadHeight });
  yield 'Building HKCEC’s flying-bird roofs, atrium garden and Convention Plaza Apartments...';
  const hkcec = buildHkcec(scene, { groundOffset: HONG_KONG_TERRAIN_META.hkcecPadHeight });
  yield 'Building Mong Kok Stadium’s 6,700-seat bowl, seven tensile sails and LED screen...';
  const mongKokStadium = buildMongKokStadium(scene, { groundOffset: HONG_KONG_TERRAIN_META.mongKokStadiumPadHeight });
  yield 'Building Hong Kong Coliseum’s inverted-pyramid arena...';
  const coliseum = buildHongKongColiseum(scene);
  yield 'Building Hong Kong Stadium’s twin membrane roofs and white lattice arches...';
  const hongKongStadium = buildHongKongStadium(scene, { groundOffset: HONG_KONG_TERRAIN_META.hongKongStadiumPadHeight });
  yield 'Reconstructing 荔園 Lai Yuen’s entrance towers, rides and 宋城 (historical)...';
  const laiYuen = buildLaiYuen(scene, { groundOffset: HONG_KONG_TERRAIN_META.laiYuenPadHeight });
  yield 'Building 沙田馬場 Sha Tin Racecourse’s twin grandstands and 1,900 m turf course...';
  const shaTin = buildShaTinRacecourse(scene, { groundOffset: HONG_KONG_TERRAIN_META.shaTinPadHeight });
  yield 'Building 香港海洋公園 Ocean Park’s two halves, cable car and Ocean Express...';
  const oceanPark = buildOceanPark(scene);
  yield 'Rebuilding 伊利沙伯體育館 Queen Elizabeth Stadium...';
  const queenElizabethStadium = buildQueenElizabethStadium(scene, { groundOffset: HONG_KONG_TERRAIN_META.queenElizabethStadiumPadHeight });
  yield 'Building 啟德主場館 Kai Tak Stadium...';
  const kaiTakStadium = buildKaiTakStadium(scene, { groundOffset: HONG_KONG_TERRAIN_META.kaiTakStadiumPadHeight });
  yield 'Building 啟德體藝館 Kai Tak Arena and 啟德青年運動場...';
  const kaiTakArena = buildKaiTakArena(scene, { groundOffset: HONG_KONG_TERRAIN_META.kaiTakArenaPadHeight });
  const kaiTakYouth = buildKaiTakYouthSportsGround(scene, { groundOffset: HONG_KONG_TERRAIN_META.kaiTakYouthPadHeight });
  yield 'Building 跑馬地馬場 Happy Valley Racecourse...';
  const happyValley = buildHappyValleyRacecourse(scene, { groundOffset: HONG_KONG_TERRAIN_META.happyValleyPadHeight });
  yield 'Building Times Square’s twin towers, arched atria and civic piazza clock...';
  const timesSquare = buildTimesSquare(scene, { groundOffset: HONG_KONG_TERRAIN_META.timesSquarePadHeight });
  yield 'Building Ocean Terminal, LCX and the cascading 2017 harbour extension...';
  const oceanTerminal = buildOceanTerminal(scene, { groundOffset: HONG_KONG_TERRAIN_META.harbourCityPadHeights.oceanTerminal });
  yield 'Building Star House’s pale concrete lattice and Star Annex entrance...';
  const starHouse = buildStarHouse(scene, { groundOffset: HONG_KONG_TERRAIN_META.harbourCityPadHeights.starHouse });
  yield 'Building Marco Polo Hongkong Hotel’s recessed room grid and gold-horse entrance...';
  const marcoPolo = buildMarcoPoloHongkongHotel(scene, { groundOffset: HONG_KONG_TERRAIN_META.harbourCityPadHeights.marcoPoloHongkong });
  yield 'Building Ocean Centre’s thirteen white office ribbons and Canton Road atrium...';
  const oceanCentre = buildOceanCentre(scene, { groundOffset: HONG_KONG_TERRAIN_META.harbourCityPadHeights.oceanCentre });
  yield 'Building Prince Hotel’s dark window strips and deep porte-cochere...';
  const princeHotel = buildPrinceHotel(scene, { groundOffset: HONG_KONG_TERRAIN_META.harbourCityPadHeights.princeHotel });
  yield 'Building The Gateway Tower 1 curved curtain wall and pink-granite podium...';
  const gatewayTowerOne = buildGatewayTowerOne(scene, { groundOffset: HONG_KONG_TERRAIN_META.harbourCityPadHeights.gatewayTowerOne });
  yield 'Building The Gateway Tower 2 and the Gateway I interconnecting floors...';
  const gatewayTowerTwo = buildGatewayTowerTwo(scene, { groundOffset: HONG_KONG_TERRAIN_META.harbourCityPadHeights.gatewayTowerTwo });
  yield 'Building Prudential Tower and its office / serviced-apartment facade...';
  const gatewayTowerThree = buildGatewayTowerThree(scene, { groundOffset: HONG_KONG_TERRAIN_META.harbourCityPadHeights.gatewayTowerThree });
  yield 'Building The Gateway Tower 5 and the Prudential twin gateway arch...';
  const gatewayTowerFive = buildGatewayTowerFive(scene, { groundOffset: HONG_KONG_TERRAIN_META.harbourCityPadHeights.gatewayTowerFive });
  yield 'Building The Gateway Tower 6 office crown and pink-granite podium...';
  const gatewayTowerSix = buildGatewayTowerSix(scene, { groundOffset: HONG_KONG_TERRAIN_META.harbourCityPadHeights.gatewayTowerSix });
  yield 'Building Pacific Club’s arched windows, barrel vault and piled pier...';
  const pacificClub = buildPacificClub(scene, { groundOffset: HONG_KONG_TERRAIN_META.harbourCityPadHeights.pacificClub });
  yield 'Building the Space Museum’s panelled egg dome and sweeping tiled west wing...';
  const spaceMuseum = buildSpaceMuseum(scene, { groundOffset: HONG_KONG_TERRAIN_META.spaceMuseumPadHeight });
  yield 'Building the Cultural Centre’s twin tiled sails and covered foyer...';
  const culturalCentre = buildCulturalCentre(scene, { groundOffset: HONG_KONG_TERRAIN_META.culturalCentrePadHeight });
  yield 'Building Hong Kong City Hall’s High Block, Low Block and Memorial Garden...';
  const cityHall = buildCityHall(scene, { groundOffset: HONG_KONG_TERRAIN_META.cityHallPadHeight });
  yield 'Building Hong Kong Central Library’s Gate to Knowledge and Causeway Road forecourt...';
  const centralLibrary = buildCentralLibrary(scene, { groundOffset: HONG_KONG_TERRAIN_META.centralLibraryPadHeight });
  yield 'Building the Clock Tower’s granite, brick belfry and reflecting-pool palms...';
  const clockTower = buildClockTower(scene, { groundOffset: HONG_KONG_TERRAIN_META.clockTowerPadHeight });
  yield 'Building The Peninsula’s heritage arches, tower, helipad and fountain forecourt...';
  const peninsulaHotel = buildPeninsulaHotel(scene, { groundOffset: HONG_KONG_TERRAIN_META.peninsulaPadHeight });
  yield 'Building Sheraton’s guestroom grid, sign blade, Nathan Road entrance and rooftop pool...';
  const sheratonHotel = buildSheratonHotel(scene, { groundOffset: HONG_KONG_TERRAIN_META.sheratonPadHeight });
  yield 'Building The Salisbury–YMCA’s dark podium and unequal rounded twin towers...';
  const salisburyYMCA = buildSalisburyYMCA(scene, { groundOffset: HONG_KONG_TERRAIN_META.salisburyPadHeight });
  yield 'Building Kowloon Shangri-La’s dark podium, porte-cochere and projecting bay-window grid...';
  const kowloonShangriLa = buildKowloonShangriLa(scene, { groundOffset: HONG_KONG_TERRAIN_META.kowloonShangriLaPadHeight });
  yield 'Building the Star Ferry to Tsim Sha Tsui East wave balustrade...';
  const tstWaterfrontRailing = buildTstWaterfrontRailing(scene);
  yield 'Building Hong Kong Park’s aviary, conservatory, heritage terraces and walking network...';
  const hongKongPark = buildHongKongPark(scene);
  yield 'Building Kowloon Park’s Chinese Garden, Bird Lake, pool complex and sports grounds...';
  const kowloonPark = buildKowloonPark(scene);
  yield 'Building Victoria Park’s central lawn, tennis centre, model boat pool and sports grounds...';
  const victoriaPark = buildVictoriaPark(scene);
  const majorParkTrees = buildMajorParkTreeLayer(scene, [hongKongPark, kowloonPark, victoriaPark, chaterGarden, statueSquare], [...hongKongPark.colliders, ...kowloonPark.colliders, ...victoriaPark.colliders, ...chaterGarden.colliders, ...statueSquare.colliders, ...courtOfFinalAppeal.colliders, ...hsbc.colliders, ...standardChartered.colliders]);
  yield 'Building drivable harbour bridges and tunnels...';
  const crossings = buildHongKongCrossings(scene);
  yield 'Placing 144,995 lamp posts across Hong Kong...';
  const streetLighting = createHongKongStreetLighting(scene);
  yield 'Restoring surveyed Hong Kong road markings and crossings...';
  const getRoadPaintHeight = (x, z) => {
    const fallback = surfaceRoadHeight(x, z);
    return fullRoadSurfaceAt(x, z, 8, fallback)?.height ?? fallback;
  };
  const trafficAids = createHongKongTrafficAids(scene, {
    getGroundHeight, getSurfaceHeight: getRoadPaintHeight, surfaceY: FULL_WORLD_HEIGHT.road
  });

  yield 'Finalising Hong Kong world geometry and collision data...';
  const isPointOnLand = (x, z) => isTerritoryLand(x, z) || isTerritoryRoad(x, z, 0.35);
  const isPointOnSidewalk = () => false;
  function getGroundHeight(x, z, mode, referenceY = 0) {
    if (mode === 'helicopter') return 0;
    let base = WATER_LEVEL;
    if (isTerritoryLand(x, z)) base = centralApproachGrade(x, z, peakTramLoopGrade(x, z, hongKongTerrainHeight(x, z))) + FULL_WORLD_HEIGHT.land;
    if (territoryParkAt(x, z)) base = centralApproachGrade(x, z, peakTramLoopGrade(x, z, hongKongTerrainHeight(x, z))) + FULL_WORLD_HEIGHT.park;
    if (mode === 'person') { base = centralPlatformGroundHeight(x, z, base, referenceY); base = centralConcourseGroundHeight(x, z, base, referenceY); }
    const road = fullRoadSurfaceAt(x, z, 0.35, referenceY);
    let groundUsesRoad = false;
    if (road) {
      const layered = Boolean(road.flags & 6);
      if (!centralPlatformUnderRoad(x, z, mode, referenceY, road.height) && !centralConcourseUnderRoad(x, z, mode, referenceY, road.height) && (!layered || Math.abs(road.height - referenceY) <= Math.abs(base - referenceY) + 0.5)) { base = road.height; groundUsesRoad = true; }
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
    // One IFC's drive-through and source-adjacent carriageway remain road-priority.
    const oneIfcGround = !groundUsesRoad ? oneIfc.groundHeightAt(x, z, leeGardenOneGround) : leeGardenOneGround;
    // Champion Tower's level lobby and arrival court remain subordinate to a selected carriageway.
    const championTowerGround = !groundUsesRoad ? championTower.groundHeightAt(x, z, oneIfcGround) : oneIfcGround;
    const ckc2Ground = !groundUsesRoad ? ckc2.groundHeightAt(x, z, championTowerGround) : championTowerGround;
    const qgoGround = !groundUsesRoad ? qgo.groundHeightAt(x, z, ckc2Ground) : ckc2Ground;
    // Tamar keeps every original access road on its own profile below the civic buildings and Open Door.
    const centralGovernmentGround = !groundUsesRoad ? centralGovernment.groundHeightAt(x, z, qgoGround) : qgoGround;
    // 1881's ceremonial steps, upper terraces and tree-planter curved stair remain walkable; roads keep priority.
    const heritage1881Ground = !groundUsesRoad ? heritage1881.groundHeightAt(x, z, centralGovernmentGround) : centralGovernmentGround;
    // The Arch's retained station roads keep their own profiles below the podium and 20 m tower bases.
    const theArchGround = !groundUsesRoad ? theArch.groundHeightAt(x, z, heritage1881Ground) : heritage1881Ground;
    // Sorrento's retained podium roads keep their profiles below the upper levels and five 20 m tower bases.
    const sorrentoGround = !groundUsesRoad ? sorrento.groundHeightAt(x, z, theArchGround) : theArchGround;
    // Conrad's open arrival level keeps every selected road; the fixed tower is never moved to fit a carriageway.
    const conradGround = !groundUsesRoad ? conrad.groundHeightAt(x, z, sorrentoGround) : sorrentoGround;
    // Hysan's parking-access record remains a road through the open ground-level portal.
    const hysanGround = !groundUsesRoad ? hysan.groundHeightAt(x, z, conradGround) : conradGround;
    // Two Taikoo Place keeps both surface mouths and the selected service tunnel on their own road profiles.
    const twoTaikooGround = !groundUsesRoad ? twoTaikoo.groundHeightAt(x, z, hysanGround) : hysanGround;
    // The Henderson is fixed to its OSM site; the reduced forecourt is road-safe and selected carriageways remain roads.
    const hendersonGround = !groundUsesRoad ? theHenderson.groundHeightAt(x, z, twoTaikooGround) : twoTaikooGround;
    // One Exchange Square keeps the surface bus-terminal road on its rendered profile below the open podium.
    const oneExchangeGround = !groundUsesRoad ? oneExchange.groundHeightAt(x, z, hendersonGround) : hendersonGround;
    const twoExchangeGround = !groundUsesRoad ? twoExchange.groundHeightAt(x, z, oneExchangeGround) : oneExchangeGround;
    // The court's open outer arcade is walkable; its closed inner walls and every selected road keep their own collision / height rules.
    const cfaGround = !groundUsesRoad ? courtOfFinalAppeal.groundHeightAt(x, z, twoExchangeGround) : twoExchangeGround;
    // HKCEC's retained service carriageways pass below the authored upper podium; only non-road floors use the DTM pad.
    const hkcecGround = !groundUsesRoad ? hkcec.groundHeightAt(x, z, cfaGround) : cfaGround;
    // Times Square's piazza uses max(raw DTM, the main-piazza datum); selected tunnel roads retain their profiles.
    const timesSquareGround = !groundUsesRoad ? timesSquare.groundHeightAt(x, z, hkcecGround) : hkcecGround;
    // Ocean Terminal's marine deck remains subordinate to selected through-roads; the water side stays walkable.
    const oceanTerminalGround = !groundUsesRoad ? oceanTerminal.groundHeightAt(x, z, timesSquareGround) : timesSquareGround;
    const starHouseGround = !groundUsesRoad ? starHouse.groundHeightAt(x, z, oceanTerminalGround) : oceanTerminalGround;
    const marcoPoloGround = !groundUsesRoad ? marcoPolo.groundHeightAt(x, z, starHouseGround) : starHouseGround;
    const oceanCentreGround = !groundUsesRoad ? oceanCentre.groundHeightAt(x, z, marcoPoloGround) : marcoPoloGround;
    const princeHotelGround = !groundUsesRoad ? princeHotel.groundHeightAt(x, z, oceanCentreGround) : oceanCentreGround;
    const gatewayTowerOneGround = !groundUsesRoad ? gatewayTowerOne.groundHeightAt(x, z, princeHotelGround) : princeHotelGround;
    const gatewayTowerTwoGround = !groundUsesRoad ? gatewayTowerTwo.groundHeightAt(x, z, gatewayTowerOneGround) : gatewayTowerOneGround;
    const gatewayTowerThreeGround = !groundUsesRoad ? gatewayTowerThree.groundHeightAt(x, z, gatewayTowerTwoGround) : gatewayTowerTwoGround;
    const gatewayTowerFiveGround = !groundUsesRoad ? gatewayTowerFive.groundHeightAt(x, z, gatewayTowerThreeGround) : gatewayTowerThreeGround;
    const gatewayTowerSixGround = !groundUsesRoad ? gatewayTowerSix.groundHeightAt(x, z, gatewayTowerFiveGround) : gatewayTowerFiveGround;
    const pacificClubGround = !groundUsesRoad ? pacificClub.groundHeightAt(x, z, gatewayTowerSixGround) : gatewayTowerSixGround;
    const spaceMuseumGround = !groundUsesRoad ? spaceMuseum.groundHeightAt(x, z, pacificClubGround) : pacificClubGround;
    const culturalCentreGround = !groundUsesRoad ? culturalCentre.groundHeightAt(x, z, spaceMuseumGround) : spaceMuseumGround;
    const cityHallGround = !groundUsesRoad ? cityHall.groundHeightAt(x, z, culturalCentreGround) : culturalCentreGround;
    const centralLibraryGround = !groundUsesRoad ? centralLibrary.groundHeightAt(x, z, cityHallGround) : cityHallGround;
    const hkapaGround = !groundUsesRoad ? hkapa.groundHeightAt(x, z, centralLibraryGround) : centralLibraryGround;
    const clockTowerGround = !groundUsesRoad ? clockTower.groundHeightAt(x, z, hkapaGround) : hkapaGround;
    const peninsulaGround = !groundUsesRoad ? peninsulaHotel.groundHeightAt(x, z, clockTowerGround) : clockTowerGround;
    const sheratonGround = !groundUsesRoad ? sheratonHotel.groundHeightAt(x, z, peninsulaGround) : peninsulaGround;
    const salisburyGround = !groundUsesRoad ? salisburyYMCA.groundHeightAt(x, z, sheratonGround) : sheratonGround;
    // Kowloon Shangri-La's two original arrival roads stay on their own profiles below the open podium.
    const kowloonShangriLaGround = !groundUsesRoad ? kowloonShangriLa.groundHeightAt(x, z, salisburyGround) : salisburyGround;
    // Authored park terrain and terraces never replace a selected carriageway; road corridors keep their own profiles.
    const hongKongParkGround = !groundUsesRoad ? hongKongPark.groundHeightAt(x, z, kowloonShangriLaGround) : kowloonShangriLaGround;
    const kowloonParkGround = !groundUsesRoad ? kowloonPark.groundHeightAt(x, z, hongKongParkGround) : hongKongParkGround;
    const victoriaParkGround = !groundUsesRoad ? victoriaPark.groundHeightAt(x, z, kowloonParkGround) : kowloonParkGround;
    // Mong Kok Stadium's pitch, bowl and source block share one DTM datum; a selected carriageway stays a road.
    const stadiumGround = !groundUsesRoad ? mongKokStadium.groundHeightAt(x, z, victoriaParkGround) : victoriaParkGround;
    // Hong Kong Stadium's bowl and its So Kon Po block share one datum; selected carriageways stay roads.
    const bigStadiumGround = !groundUsesRoad ? hongKongStadium.groundHeightAt(x, z, stadiumGround) : stadiumGround;
    // 荔園 is a historical reconstruction on today's Lai Chi Kok ground; roads always keep their own profiles.
    const laiYuenGround = !groundUsesRoad ? laiYuen.groundHeightAt(x, z, bigStadiumGround) : bigStadiumGround;
    const qeStadiumGround = !groundUsesRoad ? queenElizabethStadium.groundHeightAt(x, z, laiYuenGround) : laiYuenGround;
    const kaiTakStadiumGround = !groundUsesRoad ? kaiTakStadium.groundHeightAt(x, z, qeStadiumGround) : qeStadiumGround;
    const kaiTakArenaGround = !groundUsesRoad ? kaiTakArena.groundHeightAt(x, z, kaiTakStadiumGround) : kaiTakStadiumGround;
    const kaiTakYouthGround = !groundUsesRoad ? kaiTakYouth.groundHeightAt(x, z, kaiTakArenaGround) : kaiTakArenaGround;
    const happyValleyGround = !groundUsesRoad ? happyValley.groundHeightAt(x, z, kaiTakYouthGround) : kaiTakYouthGround;
    const shaTinGround = !groundUsesRoad ? shaTin.groundHeightAt(x, z, happyValleyGround) : happyValleyGround;
    const airportGround = !groundUsesRoad ? airport.groundHeightAt(x, z, shaTinGround) : shaTinGround;
    // Ocean Park is a hill park: it keeps the surveyed DTM and only its station terraces are engineered.
    const oceanParkGround = !groundUsesRoad ? oceanPark.groundHeightAt(x, z, airportGround) : airportGround;
    const governmentHouseGround = !groundUsesRoad ? governmentHouse.groundHeightAt(x, z, oceanParkGround) : oceanParkGround;
    const finalGround = isHsbcPlazaPoint(x, z) ? Math.max(governmentHouseGround, hsbc.plazaTop) : governmentHouseGround;
    const murrayGround = mode === 'person' && !groundUsesRoad ? murray.groundHeightAt(x, z, finalGround, referenceY) : finalGround;
    const peakStationGround = mode === 'person' && !groundUsesRoad ? peakTower.groundHeightAt(x, z, murrayGround, referenceY) : murrayGround;
    const finalSurface = ifcMall.groundHeightAt(x, z, peakStationGround, referenceY);
    if (mode !== 'person') return finalSurface;
    const bridgeSurface = obrienFootbridge.groundHeightAt(x,z,finalSurface,referenceY);
    const immigrationSurface = immigrationTower.groundHeightAt(x,z,bridgeSurface,referenceY);
    const otherGround = !groundUsesRoad ? wanchaiTower.groundHeightAt(x,z,immigrationSurface,referenceY) : immigrationSurface;
    return centralLift.groundHeightAt(x,z,otherGround,referenceY);
  }

  const stats = {
    ...full.stats,
    ...crossings.stats,
    ...streetLighting.stats,
    ...trafficAids.stats,
    ...hsbc.stats,
    ...standardChartered.stats,
    ...twoIfc.stats,
    ...ifcMall.stats,
    ...generalPostOffice.stats,
    ...revenueTower.stats,
    ...wanchaiTower.stats,
    ...immigrationTower.stats,
    ...obrienFootbridge.stats,
    ...windsorHouse.stats,
    ...sogo.stats,
    ...governmentHouse.stats, ...peakTower.stats, ...stJohns.stats, ...peakTramCentralEntrance.stats, ...peakTramCentralPlatform.stats, peakTramCentralRoofPanels: centralPlatformRoof.panels, ...centralConcourse.stats, ...peakTramCentralApproach.stats, ...centralEarthworks.stats, ...peakTramKennedyBridge.stats, ...peakTramKennedyApproach.stats, ...peakTramMacDonnell.stats, ...peakTramMacDonnellBridge.stats, ...peakTramMagazineGapBridge.stats, ...peakTramMayRoadBridge.stats, ...peakTramMayRoadStation.stats, ...peakTramPassingLoop.stats, ...peakTramUpperLine.stats, ...peakTramBarkerApproach.stats, ...peakTramSummitApproach.stats, ...peakTramBarkerStationTrack.stats, ...peakTramBarkerStation.stats, ...peakTramBarkerEarthworks.stats, ...peakTramBarkerAbutments.stats, ...peakTramLoopGrading.stats, ...murray.stats,
    ...blueHouse.stats,
    ...hkapa.stats,
    ...jardineHouse.stats,
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
    ...oneIfc.stats,
    ...championTower.stats,
    ...ckc2.stats,
    ...qgo.stats,
    ...centralGovernment.stats,
    ...heritage1881.stats,
    ...theArch.stats,
    ...sorrento.stats,
    ...conrad.stats,
    ...hysan.stats,
    ...twoTaikoo.stats,
    ...theHenderson.stats,
    ...oneExchange.stats,
    ...twoExchange.stats,
    ...courtOfFinalAppeal.stats,
    ...hkcec.stats,
    ...mongKokStadium.stats,
    ...shunTak.stats,
    ...chaterGarden.stats,
    ...statueSquare.stats,
    ...worldWideHouse.stats,
    ...entertainmentBuilding.stats,
    ...mandarinOriental.stats,
    ...princesBuilding.stats,
    ...hongKongClub.stats,
    ...hangSeng.stats,
    ...hongKongStadium.stats, ...coliseum.stats,
    ...laiYuen.stats,
    ...queenElizabethStadium.stats,
    ...kaiTakStadium.stats,
    ...kaiTakArena.stats,
    ...kaiTakYouth.stats,
    ...happyValley.stats, ...shaTin.stats, ...oceanPark.stats,
    ...timesSquare.stats,
    ...oceanTerminal.stats,
    ...starHouse.stats,
    ...marcoPolo.stats,
    ...oceanCentre.stats,
    ...princeHotel.stats,
    ...gatewayTowerOne.stats,
    ...gatewayTowerTwo.stats,
    ...gatewayTowerThree.stats,
    ...gatewayTowerFive.stats,
    ...gatewayTowerSix.stats,
    ...pacificClub.stats,
    ...spaceMuseum.stats,
    ...culturalCentre.stats,
    ...cityHall.stats,
    ...centralLibrary.stats,
    ...clockTower.stats,
    ...peninsulaHotel.stats,
    ...sheratonHotel.stats,
    ...salisburyYMCA.stats,
    ...kowloonShangriLa.stats,
    ...tstWaterfrontRailing.stats,
    ...hongKongPark.stats,
    ...kowloonPark.stats,
    ...victoriaPark.stats,
    ...airport.stats,
    presentation: 'unified-simple',
    landMeshes: full.stats.fullLandRings,
    blocks: 0,
    parks: full.stats.fullParks,
    landmarks: stJohns.landmarks.length + hsbc.landmarks.length + standardChartered.landmarks.length + twoIfc.landmarks.length + ifcMall.landmarks.length + generalPostOffice.landmarks.length + revenueTower.landmarks.length + wanchaiTower.landmarks.length + immigrationTower.landmarks.length + windsorHouse.landmarks.length + sogo.landmarks.length + governmentHouse.landmarks.length + peakTower.landmarks.length + murray.landmarks.length + blueHouse.landmarks.length + hkapa.landmarks.length + jardineHouse.landmarks.length + icc.landmarks.length + bankOfChina.landmarks.length + centralPlaza.landmarks.length + theCenter.landmarks.length + ninaTower.landmarks.length + cheungKong.landmarks.length + k11Atelier.landmarks.length + cullinanI.landmarks.length + cullinanII.landmarks.length + masterpiece.landmarks.length + langhamPlace.landmarks.length + summit.landmarks.length + hopewell.landmarks.length + sunHungKai.landmarks.length + twoPacificPlace.landmarks.length + airside.landmarks.length + leeGardenOne.landmarks.length + oneIfc.landmarks.length + championTower.landmarks.length + ckc2.landmarks.length + qgo.landmarks.length + centralGovernment.landmarks.length + heritage1881.landmarks.length + theArch.landmarks.length + sorrento.landmarks.length + conrad.landmarks.length + hysan.landmarks.length + twoTaikoo.landmarks.length + theHenderson.landmarks.length + oneExchange.landmarks.length + twoExchange.landmarks.length + courtOfFinalAppeal.landmarks.length + hkcec.landmarks.length + mongKokStadium.landmarks.length + hongKongStadium.landmarks.length + coliseum.landmarks.length + laiYuen.landmarks.length + queenElizabethStadium.landmarks.length + kaiTakStadium.landmarks.length + kaiTakArena.landmarks.length + kaiTakYouth.landmarks.length + happyValley.landmarks.length + timesSquare.landmarks.length + oceanTerminal.landmarks.length + starHouse.landmarks.length + marcoPolo.landmarks.length + oceanCentre.landmarks.length + princeHotel.landmarks.length + gatewayTowerOne.landmarks.length + gatewayTowerTwo.landmarks.length + gatewayTowerThree.landmarks.length + gatewayTowerFive.landmarks.length + gatewayTowerSix.landmarks.length + pacificClub.landmarks.length + spaceMuseum.landmarks.length + culturalCentre.landmarks.length + cityHall.landmarks.length + centralLibrary.landmarks.length + clockTower.landmarks.length + peninsulaHotel.landmarks.length + sheratonHotel.landmarks.length + salisburyYMCA.landmarks.length + kowloonShangriLa.landmarks.length + hongKongPark.landmarks.length + kowloonPark.landmarks.length + victoriaPark.landmarks.length + airport.landmarks.length + shunTak.landmarks.length + chaterGarden.landmarks.length + statueSquare.landmarks.length + worldWideHouse.landmarks.length + entertainmentBuilding.landmarks.length + mandarinOriental.landmarks.length + princesBuilding.landmarks.length + hongKongClub.landmarks.length + hangSeng.landmarks.length,
    lots: 0,
    buildings: 0,
    skippedLots: 0,
    lamps: streetLighting.stats.streetLightSourceLamps,
    trees: majorParkTrees.stats.trees,
    signs: 0
  };
  console.info('[hongkong] unified simple world with crossings', stats);

  return {
    root: scene,
    colliders: [...full.colliders, ...crossings.colliders, ...hsbc.colliders, ...shunTak.colliders, ...chaterGarden.colliders, ...statueSquare.colliders, ...worldWideHouse.colliders, ...entertainmentBuilding.colliders, ...mandarinOriental.colliders, ...princesBuilding.colliders, ...hongKongClub.colliders, ...hangSeng.colliders, ...standardChartered.colliders, ...twoIfc.colliders, ...ifcMall.colliders, ...generalPostOffice.colliders, ...revenueTower.colliders, ...wanchaiTower.colliders, ...immigrationTower.colliders, ...obrienFootbridge.colliders, ...windsorHouse.colliders, ...sogo.colliders, ...governmentHouse.colliders, ...peakTower.colliders, ...stJohns.colliders, ...peakTramCentralEntrance.colliders, ...peakTramCentralPlatform.colliders, ...centralConcourse.colliders, ...centralLift.colliders, ...peakTramCentralApproach.colliders, ...peakTramKennedyBridge.colliders, ...peakTramKennedyApproach.colliders, ...peakTramUpperLine.colliders, ...peakTramBarkerApproach.colliders, ...peakTramSummitApproach.colliders, ...peakTramBarkerStationTrack.colliders, ...peakTramBarkerStation.colliders, ...peakTramBarkerAbutments.colliders, ...murray.colliders, ...blueHouse.colliders, ...hkapa.colliders, ...jardineHouse.colliders, ...icc.colliders, ...bankOfChina.colliders, ...centralPlaza.colliders, ...theCenter.colliders, ...ninaTower.colliders, ...cheungKong.colliders, ...k11Atelier.colliders, ...cullinanI.colliders, ...cullinanII.colliders, ...masterpiece.colliders, ...langhamPlace.colliders, ...summit.colliders, ...hopewell.colliders, ...sunHungKai.colliders, ...twoPacificPlace.colliders, ...airside.colliders, ...leeGardenOne.colliders, ...oneIfc.colliders, ...championTower.colliders, ...ckc2.colliders, ...qgo.colliders, ...centralGovernment.colliders, ...heritage1881.colliders, ...theArch.colliders, ...sorrento.colliders, ...conrad.colliders, ...hysan.colliders, ...twoTaikoo.colliders, ...theHenderson.colliders, ...oneExchange.colliders, ...twoExchange.colliders, ...courtOfFinalAppeal.colliders, ...hkcec.colliders, ...mongKokStadium.colliders, ...hongKongStadium.colliders, ...coliseum.colliders, ...laiYuen.colliders, ...queenElizabethStadium.colliders, ...kaiTakStadium.colliders, ...kaiTakArena.colliders, ...kaiTakYouth.colliders, ...happyValley.colliders, ...shaTin.colliders, ...oceanPark.colliders, ...timesSquare.colliders, ...oceanTerminal.colliders, ...starHouse.colliders, ...marcoPolo.colliders, ...oceanCentre.colliders, ...princeHotel.colliders, ...gatewayTowerOne.colliders, ...gatewayTowerTwo.colliders, ...gatewayTowerThree.colliders, ...gatewayTowerFive.colliders, ...gatewayTowerSix.colliders, ...pacificClub.colliders, ...spaceMuseum.colliders, ...culturalCentre.colliders, ...cityHall.colliders, ...centralLibrary.colliders, ...clockTower.colliders, ...peninsulaHotel.colliders, ...sheratonHotel.colliders, ...salisburyYMCA.colliders, ...kowloonShangriLa.colliders, ...tstWaterfrontRailing.colliders, ...hongKongPark.colliders, ...kowloonPark.colliders, ...victoriaPark.colliders, ...airport.colliders],
    bounds: full.bounds,
    stats,
    personSpawn: { ...SPAWN.person },
    isPointOnLand,
    isPointOnSidewalk,
    getGroundHeight,
    update(dt, elapsed, context) {
      murray.lift.update(dt, context.controllerManager);
      centralLift.update(dt, context.controllerManager);
      centralConcourse.update(dt, context.controllerManager);
      centralPlatformRoof.update();
      victoriaPark.update();
      crossings.update?.(context);
      centralPlaza.update?.(dt, elapsed, context);
      theCenter.update?.(dt, elapsed, context);
      clockTower.update?.(dt, elapsed, context);
      if (context.cameraSystem?.currentPos) majorParkTrees.update(context.cameraSystem.currentPos);
      streetLighting.update(context);
    },
    streetLighting,
    hsbc,
    standardChartered,
    twoIfc,
    ifcMall,
    generalPostOffice,
    revenueTower,
    wanchaiTower,
    immigrationTower,
    obrienFootbridge,
    windsorHouse,
    sogo,
    governmentHouse,
    peakTower,
    murray,
    blueHouse,
    hkapa,
    jardineHouse,
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
    oneIfc,
    championTower,
    ckc2,
    qgo,
    centralGovernment,
    heritage1881,
    theArch,
    sorrento,
    conrad,
    hysan,
    twoTaikoo,
    theHenderson,
    oneExchange,
    twoExchange,
    courtOfFinalAppeal,
    hkcec,
    mongKokStadium,
    shunTak,
    chaterGarden,
    statueSquare,
    worldWideHouse,
    entertainmentBuilding,
    mandarinOriental,
    princesBuilding,
    hongKongClub,
    hangSeng,
    hongKongStadium,
    coliseum,
    laiYuen,
    queenElizabethStadium,
    kaiTakStadium,
    kaiTakArena,
    kaiTakYouth,
    happyValley,
    shaTin,
    oceanPark,
    timesSquare,
    oceanTerminal,
    starHouse,
    marcoPolo,
    oceanCentre,
    princeHotel,
    gatewayTowerOne,
    gatewayTowerTwo,
    gatewayTowerThree,
    gatewayTowerFive,
    gatewayTowerSix,
    pacificClub,
    spaceMuseum,
    culturalCentre,
    cityHall,
    centralLibrary,
    clockTower,
    peninsulaHotel,
    sheratonHotel,
    salisburyYMCA,
    kowloonShangriLa,
    tstWaterfrontRailing,
    hongKongPark,
    kowloonPark,
    victoriaPark,
    airport,
    treeField: majorParkTrees,
    landmarks: [...stJohns.landmarks, ...hsbc.landmarks, ...shunTak.landmarks, ...chaterGarden.landmarks, ...statueSquare.landmarks, ...worldWideHouse.landmarks, ...entertainmentBuilding.landmarks, ...mandarinOriental.landmarks, ...princesBuilding.landmarks, ...hongKongClub.landmarks, ...hangSeng.landmarks, ...standardChartered.landmarks, ...twoIfc.landmarks, ...ifcMall.landmarks, ...generalPostOffice.landmarks, ...revenueTower.landmarks, ...wanchaiTower.landmarks, ...immigrationTower.landmarks, ...windsorHouse.landmarks, ...sogo.landmarks, ...governmentHouse.landmarks, ...peakTower.landmarks, ...murray.landmarks, ...blueHouse.landmarks, ...hkapa.landmarks, ...jardineHouse.landmarks, ...icc.landmarks, ...bankOfChina.landmarks, ...centralPlaza.landmarks, ...theCenter.landmarks, ...ninaTower.landmarks, ...cheungKong.landmarks, ...k11Atelier.landmarks, ...cullinanI.landmarks, ...cullinanII.landmarks, ...masterpiece.landmarks, ...langhamPlace.landmarks, ...summit.landmarks, ...hopewell.landmarks, ...sunHungKai.landmarks, ...twoPacificPlace.landmarks, ...airside.landmarks, ...leeGardenOne.landmarks, ...oneIfc.landmarks, ...championTower.landmarks, ...ckc2.landmarks, ...qgo.landmarks, ...centralGovernment.landmarks, ...heritage1881.landmarks, ...theArch.landmarks, ...sorrento.landmarks, ...conrad.landmarks, ...hysan.landmarks, ...twoTaikoo.landmarks, ...theHenderson.landmarks, ...oneExchange.landmarks, ...twoExchange.landmarks, ...courtOfFinalAppeal.landmarks, ...hkcec.landmarks, ...mongKokStadium.landmarks, ...hongKongStadium.landmarks, ...coliseum.landmarks, ...laiYuen.landmarks, ...queenElizabethStadium.landmarks, ...kaiTakStadium.landmarks, ...kaiTakArena.landmarks, ...kaiTakYouth.landmarks, ...happyValley.landmarks, ...shaTin.landmarks, ...oceanPark.landmarks, ...timesSquare.landmarks, ...oceanTerminal.landmarks, ...starHouse.landmarks, ...marcoPolo.landmarks, ...oceanCentre.landmarks, ...princeHotel.landmarks, ...gatewayTowerOne.landmarks, ...gatewayTowerTwo.landmarks, ...gatewayTowerThree.landmarks, ...gatewayTowerFive.landmarks, ...gatewayTowerSix.landmarks, ...pacificClub.landmarks, ...spaceMuseum.landmarks, ...culturalCentre.landmarks, ...cityHall.landmarks, ...centralLibrary.landmarks, ...clockTower.landmarks, ...peninsulaHotel.landmarks, ...sheratonHotel.landmarks, ...salisburyYMCA.landmarks, ...kowloonShangriLa.landmarks, ...hongKongPark.landmarks, ...kowloonPark.landmarks, ...victoriaPark.landmarks, ...airport.landmarks],
    trafficAids
  };
}

// Preserve the synchronous builder for existing callers; the game uses the yielding variant.
export function buildSimpleHongKongWorld(scene, { setStatus = () => {} } = {}) {
  return runLoadingSteps(buildSimpleHongKongWorldSteps(scene), setStatus);
}

export function buildSimpleHongKongWorldAsync(scene, { setStatus = () => {}, yieldToBrowser } = {}) {
  return runLoadingStepsAsync(buildSimpleHongKongWorldSteps(scene), setStatus, yieldToBrowser);
}
