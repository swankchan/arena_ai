// HK-B0025 Conrad Hong Kong: exact OSM tower geometry and separately sourced hotel conventions.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';

const geometry = (rows) => Object.freeze(rows.map(([id, lon, lat]) => Object.freeze({ id, lon, lat })));
export const CONRAD_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-02',
  sourceTimestamp: '2026-06-12T03:08:18Z',
  sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/41498759/full.json',
  type: 'way', id: 41498759, version: 29,
  tags: Object.freeze({
    building: 'hotel', 'building:levels': '62', height: '198', rooms: '513', layer: '3', location: 'roof',
    name: '香港港麗酒店 Conrad Hong Kong', 'name:en': 'Conrad Hong Kong', 'name:zh': '香港港麗酒店'
  }),
  geometry: geometry([
    [508021720, 114.1649080, 22.2767041], [508021721, 114.1649880, 22.2766683],
    [452816177, 114.1649870, 22.2766464], [508021723, 114.1649862, 22.2766285],
    [12477844154, 114.1650487, 22.2766263], [5209556437, 114.1651108, 22.2766279],
    [5209556450, 114.1651723, 22.2766378], [508021726, 114.1652316, 22.2766519],
    [5209556438, 114.1652961, 22.2766716], [990625740, 114.1653536, 22.2766931],
    [12477844145, 114.1654127, 22.2767195], [452816179, 114.1654715, 22.2767507],
    [5209556449, 114.1655298, 22.2767870], [508021920, 114.1655794, 22.2768233],
    [508021730, 114.1656267, 22.2768624], [508021732, 114.1655940, 22.2768959],
    [508021733, 114.1656078, 22.2769193], [1233911727, 114.1656180, 22.2769456],
    [5209556434, 114.1656244, 22.2769711], [12477844150, 114.1655606, 22.2769879],
    [12477844147, 114.1654961, 22.2769969], [12477844146, 114.1654313, 22.2769989],
    [12477844153, 114.1653609, 22.2769945], [12477844148, 114.1652875, 22.2769804],
    [12477844142, 114.1652239, 22.2769615], [508021735, 114.1651627, 22.2769360],
    [5209556435, 114.1651087, 22.2769066], [508021737, 114.1650559, 22.2768706],
    [990625841, 114.1650132, 22.2768343], [5209556436, 114.1649754, 22.2767967],
    [508021740, 114.1649393, 22.2767518], [508021720, 114.1649080, 22.2767041]
  ])
});
const KX = 103056.81753522092, KY = 110734.09626824585;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];
const worldRing = Object.freeze(CONRAD_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat)));
const footprint = minimumAreaObb(worldRing);
let signedArea = 0;
for (let i = 0; i + 3 < worldRing.length; i += 2) signedArea += worldRing[i] * worldRing[i + 3] - worldRing[i + 2] * worldRing[i + 1];
export const CONRAD_RING_AREA = Math.abs(signedArea * 0.5);
export const CONRAD_SITE = Object.freeze({
  name: '香港港麗酒店 Conrad Hong Kong', englishName: 'Conrad Hong Kong',
  address: '金鐘道88號太古廣場 Pacific Place, 88 Queensway', osmType: 'way', osmId: CONRAD_OSM_SOURCE.id,
  source: CONRAD_OSM_SOURCE, ring: worldRing, bounds: flatRingBounds(worldRing), ...footprint
});
export function conradLocalToWorld(x, z) {
  const s = CONRAD_SITE, cs = Math.cos(s.ry), sn = Math.sin(s.ry);
  return { x: s.x + cs * x + sn * z, z: s.z - sn * x + cs * z };
}
export function conradWorldToLocal(x, z) {
  const s = CONRAD_SITE, cs = Math.cos(s.ry), sn = Math.sin(s.ry), dx = x - s.x, dz = z - s.z;
  return { x: dx * cs - dz * sn, z: dx * sn + dz * cs };
}
export const CONRAD_LOCAL_RING = Object.freeze(worldRing.flatMap((value, index, array) => {
  if (index % 2) return [];
  const p = conradWorldToLocal(value, array[index + 1]);
  return [p.x, p.z];
}));
export const CONRAD_GROUND_SAMPLE = Object.freeze({ x: CONRAD_SITE.x, z: CONRAD_SITE.z });

// OSM and CTBUH do not share one height/floor convention. The rendered crown uses CTBUH architectural height.
export const CONRAD_OSM_HEIGHT = 198, CONRAD_CTBUH_HEIGHT = 198.9, CONRAD_HEIGHT = 198.9;
export const CONRAD_TO_TIP_HEIGHT = 198.9, CONRAD_OCCUPIED_HEIGHT = 183.9;
export const CONRAD_OSM_LEVELS = 62, CONRAD_CTBUH_LEVELS = 61;
export const CONRAD_COMPLETION_YEAR = 1990, CONRAD_ROOMS = 513;
export const CONRAD_HOTEL_FLOORS = Object.freeze([40, 61]);
export const CONRAD_ARCHITECT = 'Wong & Ouyang', CONRAD_DEVELOPER = 'Swire Properties';
export const CONRAD_STRUCTURAL_ENGINEER = 'Leslie E. Robertson Associates';

// Photo-directed visual courses: four open arrival/podium levels plus 57 shaft courses = CTBUH's 61 levels.
export const CONRAD_PLAZA_TOP = 0.12, CONRAD_PODIUM_HEIGHT = 14, CONRAD_PODIUM_LEVELS = 4;
export const CONRAD_SHAFT_COURSES = 57, CONRAD_PANEL_TARGET_WIDTH = 1.65;
export const CONRAD_MECHANICAL_COURSES = Object.freeze([32, 33]);
export const CONRAD_MAJOR_FIN_VERTICES = Object.freeze([0, 3, 5, 8, 10, 12, 14, 18, 20, 22, 24, 26, 28]);
export const CONRAD_CROWN_SIGN_EDGES = Object.freeze([20, 21, 22, 23, 24]);
export const CONRAD_LOBBY_CORE_SCALE = 0.48, CONRAD_ROAD_VEHICLE_CLEARANCE = 4.7;
export function conradFloorY(course) {
  const t = Math.max(0, Math.min(CONRAD_SHAFT_COURSES, course)) / CONRAD_SHAFT_COURSES;
  return CONRAD_PODIUM_HEIGHT + t * (CONRAD_OCCUPIED_HEIGHT - CONRAD_PODIUM_HEIGHT);
}
export const CONRAD_MECHANICAL_BAND = Object.freeze([conradFloorY(32), conradFloorY(34)]);
export const CONRAD_LOBBY_CORE_RING = Object.freeze(CONRAD_LOCAL_RING.map((value) => value * CONRAD_LOBBY_CORE_SCALE));

export function conradEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0;
  for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1;
  return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
export function conradFrameToWorld(frame, x, z) {
  const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry);
  return { x: frame.x + cs * x + sn * z, z: frame.z - sn * x + cs * z };
}
function entranceFrame(sourceEdge, projection) {
  const ring = CONRAD_LOCAL_RING, i = sourceEdge * 2;
  const { nx, nz } = conradEdgeOutward(ring, sourceEdge);
  const localX = (ring[i] + ring[i + 2]) * 0.5 + nx * projection;
  const localZ = (ring[i + 1] + ring[i + 3]) * 0.5 + nz * projection;
  const point = conradLocalToWorld(localX, localZ), site = CONRAD_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const worldNx = cs * nx + sn * nz, worldNz = -sn * nx + cs * nz;
  return Object.freeze({
    sourceEdge, projection, localX, localZ, x: point.x, z: point.z, nx: worldNx, nz: worldNz,
    ry: Math.atan2(worldNx, worldNz), name: 'Conrad Hong Kong Supreme Court Road porte-cochere',
    evidence: 'Official Conrad Dining directions identify the Supreme Court Road hotel entrance; entrance photographs establish the covered driveway, stone sign wall, glass doors and red carpet.'
  });
}
// This is a source-directed entrance frame, not a fabricated OSM entrance node.
export const CONRAD_ENTRANCE = entranceFrame(5, -2.5);
export const CONRAD_ENTRANCE_GROUND_SAMPLE = Object.freeze({ x: CONRAD_ENTRANCE.x, z: CONRAD_ENTRANCE.z });
export const CONRAD_ENTRANCE_FORECOURT_WIDTH = 15, CONRAD_ENTRANCE_FORECOURT_DEPTH = 8.5;
// Photo-directed arrival steps rise above the selected driveway. This local landing offset is not a surveyed DTM or road elevation.
export const CONRAD_ENTRANCE_LANDING_RISE = 1.85;

export function conradLocalCollider(x, z, w, d, minY, maxY, ry = CONRAD_SITE.ry) {
  const p = conradLocalToWorld(x, z), cs = Math.cos(ry), sn = Math.sin(ry), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: p.x, z: p.z, w, d, ry, minY, maxY,
    minX: p.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: p.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: p.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: p.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: p.x, cz: p.z, hx, hz, cs, sn } };
}
export function conradEdgeCollider(ring, edge, minY, maxY, depth = 0.68) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const { ry, length } = conradEdgeOutward(ring, edge);
  return conradLocalCollider((ax + bx) * 0.5, (az + bz) * 0.5, length + 0.03, depth, minY, maxY, CONRAD_SITE.ry + ry);
}
export function conradRingColliders(ring, minY, maxY, depth = 0.68) {
  const out = [];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) out.push(conradEdgeCollider(ring, edge, minY, maxY, depth));
  return out;
}
export function conradFrameCollider(frame, x, z, w, d, minY, maxY, base = 0) {
  const p = conradFrameToWorld(frame, x, z), ry = frame.ry, cs = Math.cos(ry), sn = Math.sin(ry), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: p.x, z: p.z, w, d, ry, minY: minY + base, maxY: maxY + base,
    minX: p.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: p.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: p.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: p.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: p.x, cz: p.z, hx, hz, cs, sn } };
}

// Complete generated-record signatures, not array-index-only road identity. All three remain drivable below the fixed tower.
export const CONRAD_CROSSING_ROADS = Object.freeze([
  Object.freeze({ recordIndex: 44556, name: '', width: 8.4, flags: 6, points: Object.freeze([619, 523.3, 577, 535, 559.5, 554.1]) }),
  Object.freeze({ recordIndex: 49177, name: '', width: 5.2, flags: 0, points: Object.freeze([551.1, 587, 561.1, 586.3]) }),
  Object.freeze({ recordIndex: 49181, name: '', width: 5.5, flags: 0, points: Object.freeze([561.1, 586.3, 577.7, 585, 599.6, 579.9, 605.9, 581.7, 619.8, 589.7]) })
]);
function pointSegment(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz;
  const t = l ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l)) : 0;
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
export function conradPointInRoadCorridor(x, z, margin = 0.35) {
  for (const road of CONRAD_CROSSING_ROADS) for (let i = 2; i < road.points.length; i += 2) {
    const a = [road.points[i - 2], road.points[i - 1]], b = [road.points[i], road.points[i + 1]];
    if (pointSegment(x, z, a, b) < road.width * 0.5 + margin) return true;
  }
  return false;
}
export function conradRoadConflictAtLocal(x, z, margin = 0.65) {
  const p = conradLocalToWorld(x, z);
  for (const road of CONRAD_CROSSING_ROADS) for (let i = 2; i < road.points.length; i += 2) {
    const a = [road.points[i - 2], road.points[i - 1]], b = [road.points[i], road.points[i + 1]];
    if (pointSegment(p.x, p.z, a, b) < road.width * 0.5 + margin) return road;
  }
  return null;
}
export function isConradEntranceForecourtPoint(x, z) {
  if (conradPointInRoadCorridor(x, z)) return false;
  const f = CONRAD_ENTRANCE, cs = Math.cos(f.ry), sn = Math.sin(f.ry), dx = x - f.x, dz = z - f.z;
  const lx = cs * dx - sn * dz, lz = sn * dx + cs * dz;
  return Math.abs(lx) <= CONRAD_ENTRANCE_FORECOURT_WIDTH * 0.5 && lz >= -2.5 && lz <= CONRAD_ENTRANCE_FORECOURT_DEPTH;
}
export function isConradPlazaPoint(x, z) {
  return !conradPointInRoadCorridor(x, z) && pointInFlatRing(CONRAD_SITE.ring, x, z);
}
export function conradEntranceStepDrop(x, z) {
  const f = CONRAD_ENTRANCE, cs = Math.cos(f.ry), sn = Math.sin(f.ry), dx = x - f.x, dz = z - f.z;
  const lx = cs * dx - sn * dz, lz = sn * dx + cs * dz;
  if (Math.abs(lx) > 3.25 || lz <= .51) return 0;
  const step = Math.min(2, Math.max(0, Math.floor((lz - .51) / .42)));
  return (step + 1) * .14;
}
export function conradGroundHeightAt(x, z, ground, grounds) {
  if (isConradEntranceForecourtPoint(x, z)) return grounds.entrance - conradEntranceStepDrop(x, z);
  return isConradPlazaPoint(x, z) ? grounds.plaza : ground;
}
