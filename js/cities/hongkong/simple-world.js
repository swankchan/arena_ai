import { buildFullHongKongWorld, FULL_WORLD_HEIGHT } from './full-world.js';
import { buildHongKongCrossings } from './crossings-world.js';
import { crossingSurfaceAt, selectCrossingGround } from './crossings.js';
import { isFlatTerritoryRoad, isTerritoryLand, isTerritoryRoad, territoryParkAt } from './full-meta.js';
import { SPAWN } from './meta.js';

const WATER_LEVEL = -2.2;

// The user-selected presentation for Hong Kong: one coherent, territory-wide simple map that can be built upon over
// time. Roads remain flat except the six explicitly modelled sea crossings; no generated building blocks are added.
export function buildSimpleHongKongWorld(scene, { setStatus = () => {} } = {}) {
  setStatus('Building Hong Kong’s unified territory-wide road map...');
  const full = buildFullHongKongWorld(scene, { waterLevel: WATER_LEVEL, includeCore: true });
  setStatus('Building drivable harbour bridges and tunnels...');
  const crossings = buildHongKongCrossings(scene);

  const isPointOnLand = (x, z) => isTerritoryLand(x, z) || isTerritoryRoad(x, z, 0.35);
  const isPointOnSidewalk = () => false;
  function getGroundHeight(x, z, mode, referenceY = 0) {
    if (mode === 'helicopter') return 0;
    let base = WATER_LEVEL;
    if (isTerritoryLand(x, z)) base = FULL_WORLD_HEIGHT.land;
    if (territoryParkAt(x, z)) base = FULL_WORLD_HEIGHT.park;
    if (isFlatTerritoryRoad(x, z, 0.35)) base = FULL_WORLD_HEIGHT.road;
    return selectCrossingGround(base, crossingSurfaceAt(x, z), referenceY, WATER_LEVEL);
  }

  const stats = {
    ...full.stats,
    ...crossings.stats,
    presentation: 'unified-simple',
    landMeshes: full.stats.fullLandRings,
    blocks: 0,
    parks: full.stats.fullParks,
    landmarks: 0,
    lots: 0,
    buildings: 0,
    skippedLots: 0,
    lamps: 0,
    trees: 0,
    signs: 0
  };
  console.info('[hongkong] unified simple world with crossings', stats);

  return {
    root: scene,
    colliders: [...full.colliders, ...crossings.colliders],
    bounds: full.bounds,
    stats,
    personSpawn: { ...SPAWN.person },
    isPointOnLand,
    isPointOnSidewalk,
    getGroundHeight,
    update() {},
    treeField: null,
    landmarks: [],
    trafficAids: null
  };
}
