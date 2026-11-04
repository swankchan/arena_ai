import {
  GATEWAY_TOWER_SIX_SITE, GATEWAY_TOWER_SIX_MAIN_ENTRANCE,
  harbourCityRoadRecords, HARBOUR_CITY_ROAD_LINTEL_DEPTH,
} from './harbour-city-architecture.js';
import { harbourCityPadHeight } from './terrain.js';
import { buildGatewayTower } from './gateway-tower-world-utils.js';

export const GATEWAY_TOWER_SIX_HEIGHT = 129;
export const GATEWAY_TOWER_SIX_PODIUM_LEVELS = 3;
export const GATEWAY_TOWER_SIX_PODIUM_TOP = 12;
// Gateway II's separate 32-storey office tower is a different convention from OSM/CTBUH's 35 floors.
export const GATEWAY_TOWER_SIX_OFFICE_COURSES = 32;
export const GATEWAY_TOWER_SIX_OFFICE_FLOOR_HEIGHT = (GATEWAY_TOWER_SIX_HEIGHT - GATEWAY_TOWER_SIX_PODIUM_TOP) / GATEWAY_TOWER_SIX_OFFICE_COURSES;
export const GATEWAY_TOWER_SIX_COMPLETION_YEAR = 1998;
export const GATEWAY_TOWER_SIX_ROAD_SOFFIT = 12;
export const GATEWAY_TOWER_SIX_SERVICE_EDGES = Object.freeze([30, 31, 0, 1]);

export function buildGatewayTowerSix(scene, { groundOffset } = {}) {
  const result = buildGatewayTower(scene, GATEWAY_TOWER_SIX_SITE, GATEWAY_TOWER_SIX_MAIN_ENTRANCE, {
    groundOffset: groundOffset ?? harbourCityPadHeight(GATEWAY_TOWER_SIX_SITE.key),
    towerNumber: 6, landmarkId: 'gateway-tower-six', radius: 72,
    officeCourses: GATEWAY_TOWER_SIX_OFFICE_COURSES, apartmentCourses: 0,
    completionYear: GATEWAY_TOWER_SIX_COMPLETION_YEAR, serviceEdges: GATEWAY_TOWER_SIX_SERVICE_EDGES,
    entranceTitle: 'THE GATEWAY', entranceSubtitle: 'TOWER 6  ·  HARBOUR CITY',
  });
  result.roads = harbourCityRoadRecords(GATEWAY_TOWER_SIX_SITE);
  result.stats.gatewayTowerSixPodiumLevels = GATEWAY_TOWER_SIX_PODIUM_LEVELS;
  result.stats.gatewayTowerSixRoadLintelDepth = HARBOUR_CITY_ROAD_LINTEL_DEPTH;
  return result;
}
