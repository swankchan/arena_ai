import {
  GATEWAY_TOWER_THREE_SITE, GATEWAY_TOWER_FIVE_SITE, GATEWAY_TOWER_FIVE_MAIN_ENTRANCE,
  harbourCityRoadRecords, HARBOUR_CITY_ROAD_LINTEL_DEPTH,
} from './harbour-city-architecture.js';
import { harbourCityPadHeight } from './terrain.js';
import { buildGatewayTower, addGatewayInterconnection } from './gateway-tower-world-utils.js';

export const GATEWAY_TOWER_FIVE_HEIGHT = 129;
export const GATEWAY_TOWER_FIVE_PODIUM_LEVELS = 3;
export const GATEWAY_TOWER_FIVE_PODIUM_TOP = 12;
export const GATEWAY_TOWER_FIVE_OFFICE_COURSES = 16;
export const GATEWAY_TOWER_FIVE_APARTMENT_COURSES = 14;
export const GATEWAY_TOWER_FIVE_VISUAL_COURSES = GATEWAY_TOWER_FIVE_OFFICE_COURSES + GATEWAY_TOWER_FIVE_APARTMENT_COURSES;
export const GATEWAY_TOWER_FIVE_FLOOR_HEIGHT = (GATEWAY_TOWER_FIVE_HEIGHT - GATEWAY_TOWER_FIVE_PODIUM_TOP) / GATEWAY_TOWER_FIVE_VISUAL_COURSES;
export const GATEWAY_TOWER_FIVE_COMPLETION_YEAR = 1998;
export const GATEWAY_TOWER_FIVE_ROAD_SOFFIT = 12;
export const GATEWAY_TOWER_FIVE_SERVICE_EDGES = Object.freeze([30, 31, 0, 1]);
// Four architect-described connected levels and the separate three-storey marketing arch are not collapsed into one floor count.
// These positions and the 10 m visual width are model proportions, not surveyed arch coordinates.
export const GATEWAY_THREE_FIVE_CONNECTED_LEVELS = Object.freeze([66, 78, 90, 102]);
export const GATEWAY_THREE_FIVE_MARKETING_ARCH_STOREYS = 3;
export const GATEWAY_THREE_FIVE_ARCH_WIDTH = 10;

export function buildGatewayTowerFive(scene, { groundOffset } = {}) {
  const base = groundOffset ?? harbourCityPadHeight(GATEWAY_TOWER_FIVE_SITE.key);
  const result = buildGatewayTower(scene, GATEWAY_TOWER_FIVE_SITE, GATEWAY_TOWER_FIVE_MAIN_ENTRANCE, {
    groundOffset: base, towerNumber: 5, landmarkId: 'gateway-tower-five', radius: 72,
    officeCourses: GATEWAY_TOWER_FIVE_OFFICE_COURSES, apartmentCourses: GATEWAY_TOWER_FIVE_APARTMENT_COURSES,
    completionYear: GATEWAY_TOWER_FIVE_COMPLETION_YEAR, serviceEdges: GATEWAY_TOWER_FIVE_SERVICE_EDGES,
    entranceTitle: 'THE GATEWAY', entranceSubtitle: 'TOWER 5  ·  HARBOUR CITY',
  });
  const link = addGatewayInterconnection(result.root, GATEWAY_TOWER_THREE_SITE, harbourCityPadHeight(GATEWAY_TOWER_THREE_SITE.key), [34, 0],
    GATEWAY_TOWER_FIVE_SITE, base, [-34, 0], {
      name: 'Prudential Tower and Tower 5 four-level sea-facing gateway arch',
      levels: GATEWAY_THREE_FIVE_CONNECTED_LEVELS, width: GATEWAY_THREE_FIVE_ARCH_WIDTH, archFrame: true,
    });
  result.colliders.push(...link.colliders);
  result.roads = harbourCityRoadRecords(GATEWAY_TOWER_FIVE_SITE);
  result.stats.gatewayTowerFivePodiumLevels = GATEWAY_TOWER_FIVE_PODIUM_LEVELS;
  result.stats.gatewayTowerFiveRoadLintelDepth = HARBOUR_CITY_ROAD_LINTEL_DEPTH;
  result.stats.gatewayThreeFiveConnectedLevels = link.stats.connectedLevels;
  result.stats.gatewayThreeFiveMarketingArchStoreys = GATEWAY_THREE_FIVE_MARKETING_ARCH_STOREYS;
  result.stats.gatewayThreeFiveArchClearSpan = link.stats.clearSpan;
  result.stats.gatewayThreeFiveArchLowestSoffit = link.stats.lowestSoffit;
  return result;
}
