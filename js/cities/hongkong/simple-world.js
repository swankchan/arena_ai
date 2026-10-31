import { buildFullHongKongWorld, FULL_WORLD_HEIGHT } from './full-world.js';
import { buildHongKongCrossings } from './crossings-world.js';
import { crossingSurfaceAt, selectCrossingGround } from './crossings.js';
import { isFlatTerritoryRoad, isTerritoryLand, isTerritoryRoad, territoryParkAt } from './full-meta.js';
import { SPAWN } from './meta.js';
import { createHongKongStreetLighting } from './street-lighting.js';
import { buildHsbcHeadquarters } from './hsbc-headquarters-world.js';
import { isHsbcPlazaPoint } from './hsbc-headquarters-architecture.js';
import { buildStandardCharteredBankBuilding } from './standard-chartered-world.js';
import { scbEntranceGroundHeight } from './standard-chartered-architecture.js';

const WATER_LEVEL = -2.2;

// The user-selected presentation for Hong Kong: one coherent, territory-wide simple map that can be built upon over
// time. Roads remain flat except the six explicitly modelled sea crossings; no generated building blocks are added.
export function buildSimpleHongKongWorld(scene, { setStatus = () => {} } = {}) {
  setStatus('Building Hong Kong’s unified territory-wide road map...');
  const full = buildFullHongKongWorld(scene, { waterLevel: WATER_LEVEL, includeCore: true });
  setStatus('Building the HSBC Main Building landmark...');
  const hsbc = buildHsbcHeadquarters(scene);
  setStatus('Building the Standard Chartered Bank Building landmark...');
  const standardChartered = buildStandardCharteredBankBuilding(scene);
  setStatus('Building drivable harbour bridges and tunnels...');
  const crossings = buildHongKongCrossings(scene);
  setStatus('Placing 144,995 lamp posts across Hong Kong...');
  const streetLighting = createHongKongStreetLighting(scene);

  const isPointOnLand = (x, z) => isTerritoryLand(x, z) || isTerritoryRoad(x, z, 0.35);
  const isPointOnSidewalk = () => false;
  function getGroundHeight(x, z, mode, referenceY = 0) {
    if (mode === 'helicopter') return 0;
    let base = WATER_LEVEL;
    if (isTerritoryLand(x, z)) base = FULL_WORLD_HEIGHT.land;
    if (territoryParkAt(x, z)) base = FULL_WORLD_HEIGHT.park;
    if (isFlatTerritoryRoad(x, z, 0.35)) base = FULL_WORLD_HEIGHT.road;
    const crossingGround = selectCrossingGround(base, crossingSurfaceAt(x, z), referenceY, WATER_LEVEL);
    const ground = scbEntranceGroundHeight(x, z, crossingGround);
    return isHsbcPlazaPoint(x, z) ? Math.max(ground, hsbc.plazaTop) : ground;
  }

  const stats = {
    ...full.stats,
    ...crossings.stats,
    ...streetLighting.stats,
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
    trafficAids: null
  };
}
