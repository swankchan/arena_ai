import {
  GATEWAY_TOWER_THREE_SITE, GATEWAY_TOWER_THREE_MAIN_ENTRANCE,
  harbourCityRoadRecords, HARBOUR_CITY_ROAD_LINTEL_DEPTH,
} from './harbour-city-architecture.js';
import { harbourCityPadHeight } from './terrain.js';
import { buildGatewayTower } from './gateway-tower-world-utils.js';

export const GATEWAY_TOWER_THREE_HEIGHT = 129;
export const GATEWAY_TOWER_THREE_PODIUM_LEVELS = 3;
export const GATEWAY_TOWER_THREE_PODIUM_TOP = 12;
// The architect's twin towers have 16 office plus 14 serviced-apartment floors; OSM/CTBUH separately say 35.
export const GATEWAY_TOWER_THREE_OFFICE_COURSES = 16;
export const GATEWAY_TOWER_THREE_APARTMENT_COURSES = 14;
export const GATEWAY_TOWER_THREE_VISUAL_COURSES = GATEWAY_TOWER_THREE_OFFICE_COURSES + GATEWAY_TOWER_THREE_APARTMENT_COURSES;
export const GATEWAY_TOWER_THREE_FLOOR_HEIGHT = (GATEWAY_TOWER_THREE_HEIGHT - GATEWAY_TOWER_THREE_PODIUM_TOP) / GATEWAY_TOWER_THREE_VISUAL_COURSES;
export const GATEWAY_TOWER_THREE_COMPLETION_YEAR = 1998;
export const GATEWAY_TOWER_THREE_ROAD_SOFFIT = 12;
export const GATEWAY_TOWER_THREE_SERVICE_EDGES = Object.freeze([14, 15, 16, 17]);

export function buildGatewayTowerThree(scene, { groundOffset } = {}) {
  const result = buildGatewayTower(scene, GATEWAY_TOWER_THREE_SITE, GATEWAY_TOWER_THREE_MAIN_ENTRANCE, {
    groundOffset: groundOffset ?? harbourCityPadHeight(GATEWAY_TOWER_THREE_SITE.key),
    towerNumber: 3, landmarkId: 'gateway-tower-three', radius: 72,
    officeCourses: GATEWAY_TOWER_THREE_OFFICE_COURSES, apartmentCourses: GATEWAY_TOWER_THREE_APARTMENT_COURSES,
    completionYear: GATEWAY_TOWER_THREE_COMPLETION_YEAR, serviceEdges: GATEWAY_TOWER_THREE_SERVICE_EDGES,
    entranceTitle: 'PRUDENTIAL TOWER', entranceSubtitle: 'THE GATEWAY TOWER 3  ·  HARBOUR CITY',
  });
  result.roads = harbourCityRoadRecords(GATEWAY_TOWER_THREE_SITE);
  result.stats.gatewayTowerThreePodiumLevels = GATEWAY_TOWER_THREE_PODIUM_LEVELS;
  result.stats.gatewayTowerThreeRoadLintelDepth = HARBOUR_CITY_ROAD_LINTEL_DEPTH;
  return result;
}
