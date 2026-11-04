import {
  GATEWAY_TOWER_ONE_SITE, GATEWAY_TOWER_TWO_SITE, GATEWAY_TOWER_TWO_MAIN_ENTRANCE,
  harbourCityRoadRecords, HARBOUR_CITY_ROAD_LINTEL_DEPTH,
} from './harbour-city-architecture.js';
import { harbourCityPadHeight } from './terrain.js';
import { buildGatewayTower, addGatewayInterconnection } from './gateway-tower-world-utils.js';

export const GATEWAY_TOWER_TWO_HEIGHT = 129;
export const GATEWAY_TOWER_TWO_PODIUM_LEVELS = 3;
export const GATEWAY_TOWER_TWO_PODIUM_TOP = 12;
export const GATEWAY_TOWER_TWO_OFFICE_COURSES = 32;
export const GATEWAY_TOWER_TWO_OFFICE_FLOOR_HEIGHT = (GATEWAY_TOWER_TWO_HEIGHT - GATEWAY_TOWER_TWO_PODIUM_TOP) / GATEWAY_TOWER_TWO_OFFICE_COURSES;
export const GATEWAY_TOWER_TWO_COMPLETION_YEAR = 1994;
export const GATEWAY_TOWER_TWO_ROAD_SOFFIT = 12;
export const GATEWAY_TOWER_TWO_SERVICE_EDGES = Object.freeze([23, 24, 25, 26]);
// Official sources confirm interconnecting floors but not their surveyed levels; these four visual link positions are not measured floors.
export const GATEWAY_ONE_TWO_INTERCONNECT_LEVELS = Object.freeze([42, 54, 66, 78]);
export const GATEWAY_ONE_TWO_INTERCONNECT_WIDTH = 5.4;

export function buildGatewayTowerTwo(scene, { groundOffset } = {}) {
  const base = groundOffset ?? harbourCityPadHeight(GATEWAY_TOWER_TWO_SITE.key);
  const result = buildGatewayTower(scene, GATEWAY_TOWER_TWO_SITE, GATEWAY_TOWER_TWO_MAIN_ENTRANCE, {
    groundOffset: base, towerNumber: 2, landmarkId: 'gateway-tower-two', radius: 66,
    officeCourses: GATEWAY_TOWER_TWO_OFFICE_COURSES, apartmentCourses: 0,
    completionYear: GATEWAY_TOWER_TWO_COMPLETION_YEAR, serviceEdges: GATEWAY_TOWER_TWO_SERVICE_EDGES,
    entranceTitle: 'THE GATEWAY', entranceSubtitle: 'TOWER 2  ·  HARBOUR CITY',
  });
  const a = GATEWAY_TOWER_ONE_SITE, b = GATEWAY_TOWER_TWO_SITE;
  const link = addGatewayInterconnection(result.root, a, harbourCityPadHeight(a.key), [a.localRing[37 * 2], a.localRing[37 * 2 + 1]],
    b, base, [b.localRing[40 * 2], b.localRing[40 * 2 + 1]], {
      name: 'Gateway I multi-level Tower 1 and Tower 2 interconnection',
      levels: GATEWAY_ONE_TWO_INTERCONNECT_LEVELS, width: GATEWAY_ONE_TWO_INTERCONNECT_WIDTH,
    });
  result.colliders.push(...link.colliders);
  result.roads = harbourCityRoadRecords(GATEWAY_TOWER_TWO_SITE);
  result.stats.gatewayTowerTwoPodiumLevels = GATEWAY_TOWER_TWO_PODIUM_LEVELS;
  result.stats.gatewayTowerTwoRoadLintelDepth = HARBOUR_CITY_ROAD_LINTEL_DEPTH;
  result.stats.gatewayOneTwoInterconnectLevels = link.stats.connectedLevels;
  result.stats.gatewayOneTwoInterconnectClearSpan = link.stats.clearSpan;
  result.stats.gatewayOneTwoInterconnectLowestSoffit = link.stats.lowestSoffit;
  return result;
}
