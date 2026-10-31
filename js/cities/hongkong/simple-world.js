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
  setStatus('Building drivable harbour bridges and tunnels...');
  const crossings = buildHongKongCrossings(scene);
  setStatus('Placing 144,995 lamp posts across Hong Kong...');
  const streetLighting = createHongKongStreetLighting(scene);
  setStatus('Restoring surveyed Hong Kong road markings and crossings...');
  const trafficAids = createHongKongTrafficAids(scene, {
    getGroundHeight, getSurfaceHeight: surfaceRoadHeight, surfaceY: FULL_WORLD_HEIGHT.road
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
    return isHsbcPlazaPoint(x, z) ? Math.max(ground, hsbc.plazaTop) : ground;
  }

  const stats = {
    ...full.stats,
    ...crossings.stats,
    ...streetLighting.stats,
    ...trafficAids.stats,
    ...hsbc.stats,
    ...standardChartered.stats,
    presentation: 'unified-simple',
    landMeshes: full.stats.fullLandRings,
    blocks: 0,
    parks: full.stats.fullParks,
    landmarks: hsbc.landmarks.length + standardChartered.landmarks.length,
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
    colliders: [...full.colliders, ...crossings.colliders, ...hsbc.colliders, ...standardChartered.colliders],
    bounds: full.bounds,
    stats,
    personSpawn: { ...SPAWN.person },
    isPointOnLand,
    isPointOnSidewalk,
    getGroundHeight,
    update(dt, elapsed, context) {
      crossings.update?.(context);
      streetLighting.update(context);
    },
    streetLighting,
    hsbc,
    standardChartered,
    treeField: null,
    landmarks: [...hsbc.landmarks, ...standardChartered.landmarks],
    trafficAids
  };
}
