// HK-B0018 Two Pacific Place / Island Shangri-La: current OSM tower and separated office, hotel and CTBUH conventions.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';

function geometry(points) { return Object.freeze(points.map(([lon, lat]) => Object.freeze({ lon, lat }))); }
export const TWO_PACIFIC_PLACE_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-02',
  sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/41498695/full.json',
  type: 'way', id: 41498695, version: 14, timestamp: '2026-08-05T09:22:14Z', changeset: 186966999,
  user: 'BR_pebble', uid: 15458791,
  tags: Object.freeze({
    "building": "office",
    "building:levels": "57",
    "height": "213",
    "layer": "3",
    "location": "roof",
    "name": "太古廣場二座 Two Pacific Place",
    "name:en": "Two Pacific Place",
    "name:zh": "太古廣場二座",
    "name:zh-Hans": "太古广场二座",
    "name:zh-Hant": "太古廣場二座",
    "office": "yes"
  }),
  geometry: geometry([
    [114.1645864,22.2768168], [114.1644962,22.2768506],
    [114.1643841,22.2769117], [114.1643036,22.2769887],
    [114.1642468,22.2770761], [114.1642163,22.2771485],
    [114.1642039,22.2772347], [114.1642137,22.2773441],
    [114.1642233,22.2773788], [114.1642329,22.2774133],
    [114.1642774,22.2774893], [114.1643476,22.2775889],
    [114.1644055,22.2775485], [114.1644585,22.2775027],
    [114.1645058,22.2774518], [114.1645469,22.2773965],
    [114.1645813,22.2773374], [114.1646086,22.2772753],
    [114.1646286,22.2772107], [114.1646409,22.2771446],
    [114.1646455,22.2770776], [114.1646423,22.2770106],
    [114.1646312,22.2769442], [114.1646125,22.2768794],
    [114.1645864,22.2768168]
  ])
});
const KX = 103056.81753522092, KY = 110734.09626824585;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];
function projectRing(source) { return Object.freeze(source.geometry.flatMap(({ lon, lat }) => project(lon, lat))); }
function localRing(site) {
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry), result = [];
  for (let i = 0; i + 3 < site.ring.length; i += 2) {
    const dx = site.ring[i] - site.x, dz = site.ring[i + 1] - site.z;
    result.push(dx * cs - dz * sn, dx * sn + dz * cs);
  }
  return Object.freeze(result);
}
function closeRing(points) { return Object.freeze([...points, points[0], points[1]]); }
const ring = projectRing(TWO_PACIFIC_PLACE_OSM_SOURCE), footprint = minimumAreaObb(ring);
const baseSite = Object.freeze({
  name: '太古廣場二座 Two Pacific Place', englishName: 'Two Pacific Place / Island Shangri-La', address: '金鐘道88號 88 Queensway',
  osmType: 'way', osmId: TWO_PACIFIC_PLACE_OSM_SOURCE.id, source: TWO_PACIFIC_PLACE_OSM_SOURCE,
  ring, bounds: flatRingBounds(ring), ...footprint
});
export const TWO_PACIFIC_PLACE_SITE = Object.freeze({ ...baseSite, localRing: localRing(baseSite) });
export const TWO_PACIFIC_PLACE_TOWER_RING = closeRing(TWO_PACIFIC_PLACE_SITE.localRing);
export const TWO_PACIFIC_PLACE_PODIUM_SCALE = 1.06;
export const TWO_PACIFIC_PLACE_PODIUM_RING = closeRing(TWO_PACIFIC_PLACE_SITE.localRing.map((value) => value * TWO_PACIFIC_PLACE_PODIUM_SCALE));

// Source conventions are not interchangeable: the office occupies the lower portion and Island Shangri-La the upper portion.
export const TWO_PACIFIC_PLACE_OSM_HEIGHT = 213;
export const TWO_PACIFIC_PLACE_OSM_LEVELS = 57;
export const TWO_PACIFIC_PLACE_HEIGHT = 213.1;
export const TWO_PACIFIC_PLACE_TO_TIP_HEIGHT = 213.1;
export const TWO_PACIFIC_PLACE_OCCUPIED_HEIGHT = 197.8;
export const TWO_PACIFIC_PLACE_CTBUH_LEVELS = 57;
export const TWO_PACIFIC_PLACE_CONSTRUCTION_START = 1986;
export const TWO_PACIFIC_PLACE_COMPLETION_YEAR = 1991;
export const TWO_PACIFIC_PLACE_OFFICIAL_OFFICE_FLOORS = 27;
export const TWO_PACIFIC_PLACE_OFFICIAL_OFFICE_GFA_SQFT = 695000;
export const TWO_PACIFIC_PLACE_WONG_TOWER_STOREYS_ABOVE_PODIUM = 50;
export const TWO_PACIFIC_PLACE_WONG_ORIGINAL_HOTEL_ROOMS = 574;
export const TWO_PACIFIC_PLACE_CURRENT_HOTEL_FLOORS = 56;
export const TWO_PACIFIC_PLACE_CURRENT_HOTEL_ROOMS = 544;

// Photo-directed visual courses and crown controls, not surveyed floor or roof-plant elevations.
export const TWO_PACIFIC_PLACE_PLAZA_TOP = 0.12;
export const TWO_PACIFIC_PLACE_PODIUM_HEIGHT = 24;
export const TWO_PACIFIC_PLACE_PODIUM_BAND_BASE = 12;
export const TWO_PACIFIC_PLACE_VISUAL_COURSES = 50;
export const TWO_PACIFIC_PLACE_OFFICE_VISUAL_COURSES = 27;
export const TWO_PACIFIC_PLACE_HOTEL_VISUAL_COURSES = 23;
export const TWO_PACIFIC_PLACE_CROWN_BASE = 203.1;
export const TWO_PACIFIC_PLACE_PANEL_TARGET_WIDTH = 1.35;
export const TWO_PACIFIC_PLACE_BLUE_END_EDGES = Object.freeze([0, 10, 11, 23]);
export const TWO_PACIFIC_PLACE_CROWN_SIGN_EDGES = Object.freeze([13, 14, 15, 16, 17, 18, 19]);
export const TWO_PACIFIC_PLACE_ROAD_VEHICLE_CLEARANCE = 4.5;
// The only carriageway intersecting the 1.06 overhang is an OSM service driveway tagged layer=1, not a verified bridge.
export const TWO_PACIFIC_PLACE_DRIVEWAY_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-02',
  sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/1206722419/full.json',
  type: 'way', id: 1206722419, version: 2, timestamp: '2024-08-20',
  tags: Object.freeze({ highway: 'service', service: 'driveway', layer: '1' })
});
export function twoPacificPlaceFloorY(course) {
  const t = Math.max(0, Math.min(TWO_PACIFIC_PLACE_VISUAL_COURSES, course)) / TWO_PACIFIC_PLACE_VISUAL_COURSES;
  return TWO_PACIFIC_PLACE_PODIUM_HEIGHT + t * (TWO_PACIFIC_PLACE_OCCUPIED_HEIGHT - TWO_PACIFIC_PLACE_PODIUM_HEIGHT);
}
export function twoPacificPlaceLocalToWorld(x, z) {
  const site = TWO_PACIFIC_PLACE_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return { x: site.x + cs * x + sn * z, z: site.z - sn * x + cs * z };
}
export const TWO_PACIFIC_PLACE_PODIUM_WORLD_RING = Object.freeze(TWO_PACIFIC_PLACE_PODIUM_RING.flatMap((value, index, array) => {
  if (index % 2) return []; const p = twoPacificPlaceLocalToWorld(value, array[index + 1]); return [p.x, p.z];
}));
export function twoPacificPlaceEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0;
  for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1;
  return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
export function twoPacificPlaceFrameToWorld(frame, x, z) {
  const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry);
  return { x: frame.x + cs * x + sn * z, z: frame.z - sn * x + cs * z };
}
export function twoPacificPlaceEntranceFrame(sourceEdge, projection) {
  const ring = TWO_PACIFIC_PLACE_TOWER_RING, i = sourceEdge * 2;
  const { nx, nz } = twoPacificPlaceEdgeOutward(ring, sourceEdge);
  const localX = (ring[i] + ring[i + 2]) * 0.5 + nx * projection;
  const localZ = (ring[i + 1] + ring[i + 3]) * 0.5 + nz * projection;
  const point = twoPacificPlaceLocalToWorld(localX, localZ), site = TWO_PACIFIC_PLACE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry), worldNx = cs * nx + sn * nz, worldNz = -sn * nx + cs * nz;
  return Object.freeze({ x: point.x, z: point.z, nx: worldNx, nz: worldNz, ry: Math.atan2(worldNx, worldNz), sourceEdge, projection });
}
function entranceForecourt(frame, halfWidth, back, front) {
  const points = [[-halfWidth, back], [halfWidth, back], [halfWidth, front], [-halfWidth, front], [-halfWidth, back]];
  return Object.freeze(points.flatMap(([x, z]) => {
    const point = twoPacificPlaceFrameToWorld(frame, x, z); return [point.x, point.z];
  }));
}
// These are photo/site-plan directed entrance frames, not fabricated OSM entrance nodes.
export const TWO_PACIFIC_PLACE_HOTEL_ENTRANCE = Object.freeze({
  ...twoPacificPlaceEntranceFrame(4, 4), name: 'Island Shangri-La Supreme Court Road porte-cochere',
  evidence: 'Wong & Ouyang separate porte-cochere; hotel arrival photographs and sixth-floor driveway description'
});
export const TWO_PACIFIC_PLACE_OFFICE_ENTRANCE = Object.freeze({
  ...twoPacificPlaceEntranceFrame(16, 4), name: 'Two Pacific Place Queensway office lobby',
  evidence: 'Swire 88 Queensway address and podium office-lobby photographs'
});
export const TWO_PACIFIC_PLACE_GROUND_SAMPLE = Object.freeze({ x: TWO_PACIFIC_PLACE_SITE.x, z: TWO_PACIFIC_PLACE_SITE.z });
export const TWO_PACIFIC_PLACE_HOTEL_GROUND_SAMPLE = Object.freeze({ x: TWO_PACIFIC_PLACE_HOTEL_ENTRANCE.x, z: TWO_PACIFIC_PLACE_HOTEL_ENTRANCE.z });
export const TWO_PACIFIC_PLACE_OFFICE_GROUND_SAMPLE = Object.freeze({ x: TWO_PACIFIC_PLACE_OFFICE_ENTRANCE.x, z: TWO_PACIFIC_PLACE_OFFICE_ENTRANCE.z });
export const TWO_PACIFIC_PLACE_HOTEL_FORECOURT_RING = entranceForecourt(TWO_PACIFIC_PLACE_HOTEL_ENTRANCE, 13, -5, 7);
export const TWO_PACIFIC_PLACE_OFFICE_FORECOURT_RING = entranceForecourt(TWO_PACIFIC_PLACE_OFFICE_ENTRANCE, 10, -3.5, 4.5);
export function isTwoPacificPlacePlazaPoint(x, z) {
  return pointInFlatRing(TWO_PACIFIC_PLACE_SITE.ring, x, z)
    || pointInFlatRing(TWO_PACIFIC_PLACE_HOTEL_FORECOURT_RING, x, z)
    || pointInFlatRing(TWO_PACIFIC_PLACE_OFFICE_FORECOURT_RING, x, z);
}
export function isTwoPacificPlaceSitePoint(x, z) {
  return isTwoPacificPlacePlazaPoint(x, z) || pointInFlatRing(TWO_PACIFIC_PLACE_PODIUM_WORLD_RING, x, z);
}
export function twoPacificPlaceGroundHeightAt(x, z, ground, grounds) {
  if (pointInFlatRing(TWO_PACIFIC_PLACE_HOTEL_FORECOURT_RING, x, z)) return grounds.hotel;
  if (pointInFlatRing(TWO_PACIFIC_PLACE_OFFICE_FORECOURT_RING, x, z)) return grounds.office;
  if (pointInFlatRing(TWO_PACIFIC_PLACE_SITE.ring, x, z)) return grounds.tower;
  return ground;
}
export function twoPacificPlaceEdgeCollider(ring, edge, minY, maxY, depth = 0.85) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const world = twoPacificPlaceLocalToWorld((ax + bx) * 0.5, (az + bz) * 0.5);
  const { ry } = twoPacificPlaceEdgeOutward(ring, edge), worldRy = TWO_PACIFIC_PLACE_SITE.ry + ry;
  const w = Math.hypot(bx - ax, bz - az) + 0.06, d = depth;
  const cs = Math.cos(worldRy), sn = Math.sin(worldRy), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: world.x, z: world.z, w, d, ry: worldRy, minY, maxY,
    minX: world.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: world.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: world.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: world.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: world.x, cz: world.z, hx, hz, cs, sn } };
}
export function twoPacificPlaceRingColliders(ring, minY, maxY, depth = 0.85) {
  const result = [];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) result.push(twoPacificPlaceEdgeCollider(ring, edge, minY, maxY, depth));
  return result;
}
