import {
  GATEWAY_TOWER_ONE_SITE, GATEWAY_TOWER_ONE_MAIN_ENTRANCE, harbourCityRoadRecords,
  HARBOUR_CITY_ROAD_LINTEL_DEPTH,
} from './harbour-city-architecture.js';
import { harbourCityPadHeight } from './terrain.js';
import { buildGatewayTower } from './gateway-tower-world-utils.js';

export const GATEWAY_TOWER_ONE_HEIGHT = 129;
export const GATEWAY_TOWER_ONE_PODIUM_LEVELS = 3;
export const GATEWAY_TOWER_ONE_PODIUM_TOP = 12;
// Wong & Ouyang's 32 occupied office storeys are a visual convention, not a replacement for OSM's 36 or CTBUH's 36.
export const GATEWAY_TOWER_ONE_OFFICE_COURSES = 32;
export const GATEWAY_TOWER_ONE_OFFICE_FLOOR_HEIGHT = (GATEWAY_TOWER_ONE_HEIGHT - GATEWAY_TOWER_ONE_PODIUM_TOP) / GATEWAY_TOWER_ONE_OFFICE_COURSES;
export const GATEWAY_TOWER_ONE_COMPLETION_YEAR = 1994;
export const GATEWAY_TOWER_ONE_ROAD_SOFFIT = 12;
export const GATEWAY_TOWER_ONE_SERVICE_EDGES = Object.freeze([16, 17, 18, 19, 20]);

export function buildGatewayTowerOne(scene, { groundOffset } = {}) {
  const result = buildGatewayTower(scene, GATEWAY_TOWER_ONE_SITE, GATEWAY_TOWER_ONE_MAIN_ENTRANCE, {
    groundOffset: groundOffset ?? harbourCityPadHeight(GATEWAY_TOWER_ONE_SITE.key),
    towerNumber: 1, landmarkId: 'gateway-tower-one', radius: 66,
    officeCourses: GATEWAY_TOWER_ONE_OFFICE_COURSES, apartmentCourses: 0,
    completionYear: GATEWAY_TOWER_ONE_COMPLETION_YEAR, serviceEdges: GATEWAY_TOWER_ONE_SERVICE_EDGES,
    entranceTitle: 'THE GATEWAY', entranceSubtitle: 'TOWER 1  ·  HARBOUR CITY',
  });
  result.roads = harbourCityRoadRecords(GATEWAY_TOWER_ONE_SITE);
  result.stats.gatewayTowerOnePodiumLevels = GATEWAY_TOWER_ONE_PODIUM_LEVELS;
  result.stats.gatewayTowerOneRoadLintelDepth = HARBOUR_CITY_ROAD_LINTEL_DEPTH;
  return result;
}
