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
    if (road) {
      const layered = Boolean(road.flags & 6);
      if (!layered || Math.abs(road.height - referenceY) <= Math.abs(base - referenceY) + 0.5) base = road.height;
    }
    const crossingGround = selectCrossingGround(base, crossingSurfaceAt(x, z), referenceY, WATER_LEVEL);
    const ground = scbEntranceGroundHeight(x, z, crossingGround, standardChartered.groundOffset);
    const twoIfcGround = isTwoIfcPlazaPoint(x, z) ? Math.max(ground, twoIfc.plazaTop) : ground;
    const iccGround = isIccPlazaPoint(x, z) ? Math.max(twoIfcGround, icc.plazaTop) : twoIfcGround;
    const bocGround = isBankOfChinaPlazaPoint(x, z) ? Math.max(iccGround, bankOfChina.plazaTop) : iccGround;
    const centralPlazaGround = isCentralPlazaPlazaPoint(x, z) ? Math.max(bocGround, centralPlaza.plazaTop) : bocGround;
    const theCenterGround = isTheCenterPlazaPoint(x, z) ? Math.max(centralPlazaGround, theCenter.plazaTop) : centralPlazaGround;
    return isHsbcPlazaPoint(x, z) ? Math.max(theCenterGround, hsbc.plazaTop) : theCenterGround;
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
    presentation: 'unified-simple',
    landMeshes: full.stats.fullLandRings,
    blocks: 0,
    parks: full.stats.fullParks,
    landmarks: hsbc.landmarks.length + standardChartered.landmarks.length + twoIfc.landmarks.length + icc.landmarks.length + bankOfChina.landmarks.length + centralPlaza.landmarks.length + theCenter.landmarks.length,
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
    colliders: [...full.colliders, ...crossings.colliders, ...hsbc.colliders, ...standardChartered.colliders, ...twoIfc.colliders, ...icc.colliders, ...bankOfChina.colliders, ...centralPlaza.colliders, ...theCenter.colliders],
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
    treeField: null,
    landmarks: [...hsbc.landmarks, ...standardChartered.landmarks, ...twoIfc.landmarks, ...icc.landmarks, ...bankOfChina.landmarks, ...centralPlaza.landmarks, ...theCenter.landmarks],
    trafficAids
  };
}
