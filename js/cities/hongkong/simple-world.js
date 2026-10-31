import { buildFullHongKongWorld, FULL_WORLD_HEIGHT } from './full-world.js';
import { isTerritoryLand, isTerritoryRoad, territoryParkAt } from './full-meta.js';
import { SPAWN } from './meta.js';

const WATER_LEVEL = -2.2;

// The user-selected presentation for Hong Kong: one coherent, territory-wide flat map that can be built upon over
// time. The legacy detailed builder remains in world.js, but no raised blocks or generated buildings are added here.
export function buildSimpleHongKongWorld(scene, { setStatus = () => {} } = {}) {
  setStatus('Building Hong Kong’s unified territory-wide road map...');
  const full = buildFullHongKongWorld(scene, { waterLevel: WATER_LEVEL, includeCore: true });

  const isPointOnLand = (x, z) => isTerritoryLand(x, z) || isTerritoryRoad(x, z, 0.35);
  const isPointOnSidewalk = () => false;
  function getGroundHeight(x, z, mode) {
    if (mode === 'helicopter') return 0;
    if (isTerritoryRoad(x, z, 0.35)) return FULL_WORLD_HEIGHT.road;
    if (territoryParkAt(x, z)) return FULL_WORLD_HEIGHT.park;
    if (isTerritoryLand(x, z)) return FULL_WORLD_HEIGHT.land;
    return WATER_LEVEL;
  }

  const stats = {
    ...full.stats,
    presentation: 'unified-flat',
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
  console.info('[hongkong] unified flat world', stats);

  return {
    root: scene,
    colliders: full.colliders,
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
