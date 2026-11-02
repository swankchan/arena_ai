// HK-B0017 Sun Hung Kai Centre: current OSM chamfered tower, photo-directed podium and separated published conventions.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';

function geometry(points) { return Object.freeze(points.map(([lon, lat]) => Object.freeze({ lon, lat }))); }
export const SUN_HUNG_KAI_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-02',
  sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/107497703/full.json',
  type: 'way', id: 107497703, version: 7, timestamp: '2024-10-20T10:46:47Z', changeset: 158122574,
  user: 'GasaiYuno', uid: 10054182,
  tags: Object.freeze({
    "addr:housenumber": "30",
    "addr:street": "港灣道 Harbour Road",
    "building": "yes",
    "building:levels": "57",
    "height": "215",
    "layer": "3",
    "name": "新鴻基中心 Sun Hung Kai Centre",
    "name:en": "Sun Hung Kai Centre",
    "name:zh": "新鴻基中心",
    "wikidata": "Q849373",
    "wikimedia_commons": "Category:Sun Hung Kai Centre",
    "wikipedia": "en:Sun Hung Kai Centre"
  }),
  geometry: geometry([
    [114.1767099,22.2804572], [114.1767199,22.2804581],
    [114.1771261,22.2804932], [114.1771361,22.2804941],
    [114.1771572,22.2804779], [114.1771582,22.2804686],
    [114.1771823,22.2802304], [114.1771832,22.2802212],
    [114.1771657,22.2802016], [114.1771557,22.2802007],
    [114.1767495,22.2801656], [114.1767395,22.2801647],
    [114.1767183,22.2801809], [114.1767174,22.2801902],
    [114.1766933,22.2804284], [114.1766924,22.2804377],
    [114.1767099,22.2804572]
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
const ring = projectRing(SUN_HUNG_KAI_OSM_SOURCE), footprint = minimumAreaObb(ring);
const baseSite = Object.freeze({
  name: '新鴻基中心 Sun Hung Kai Centre', englishName: 'Sun Hung Kai Centre', address: '港灣道30號 30 Harbour Road',
  osmType: 'way', osmId: SUN_HUNG_KAI_OSM_SOURCE.id, source: SUN_HUNG_KAI_OSM_SOURCE,
  ring, bounds: flatRingBounds(ring), ...footprint
});
export const SUN_HUNG_KAI_SITE = Object.freeze({ ...baseSite, localRing: localRing(baseSite) });
export const SUN_HUNG_KAI_TOWER_RING = closeRing(SUN_HUNG_KAI_SITE.localRing);
export const SUN_HUNG_KAI_PODIUM_SCALE = 1.06;
export const SUN_HUNG_KAI_PODIUM_RING = closeRing(SUN_HUNG_KAI_SITE.localRing.map((value) => value * SUN_HUNG_KAI_PODIUM_SCALE));
export const SUN_HUNG_KAI_MAIN_EDGES = Object.freeze([1, 5, 9, 13]);
export const SUN_HUNG_KAI_LOGO_EDGES = Object.freeze([5, 9]);
// OSM service way 1184418781 is explicitly covered=yes. Keep its full route and open the west ground-level
// podium along these edges instead of falsely moving either the surveyed tower or the covered carriageway.
export const SUN_HUNG_KAI_COVERED_SERVICE_WAY_ID = 1184418781;
export const SUN_HUNG_KAI_COVERED_DRIVEWAY_EDGES = Object.freeze([11, 12, 13, 14, 15]);
export const SUN_HUNG_KAI_COVERED_DRIVEWAY_CLEARANCE = 7.2;
// Keep the complete 8.4 m carriageway clear, including both lane centres and the columns' square footprint.
export const SUN_HUNG_KAI_COVERED_DRIVEWAY_COLUMN_INSET = 4.8;

// OSM, current CTBUH/CVU, the owner and the pre-renovation CTBUH record deliberately remain separate.
export const SUN_HUNG_KAI_OSM_HEIGHT = 215;
export const SUN_HUNG_KAI_OSM_LEVELS = 57;
export const SUN_HUNG_KAI_HEIGHT = 214.5;
export const SUN_HUNG_KAI_TO_TIP_HEIGHT = 214.5;
export const SUN_HUNG_KAI_CTBUH_LEVELS = 56;
export const SUN_HUNG_KAI_CTBUH_TOWER_GFA = 83984;
export const SUN_HUNG_KAI_CTBUH_COMPLETION_YEAR = 1991;
export const SUN_HUNG_KAI_OFFICIAL_LEVELS = 53;
export const SUN_HUNG_KAI_OFFICIAL_GFA_SQFT = 800000;
export const SUN_HUNG_KAI_FIRST_COMPLETED_YEAR = 1981;
export const SUN_HUNG_KAI_PREVIOUS_HEIGHT = 193;
export const SUN_HUNG_KAI_PREVIOUS_LEVELS = 51;
export const SUN_HUNG_KAI_ADDED_STOREYS = 5;

// Photo-directed visual courses and roof controls, not surveyed floor or plant-room elevations.
export const SUN_HUNG_KAI_PLAZA_TOP = 0.12;
export const SUN_HUNG_KAI_PODIUM_HEIGHT = 18;
export const SUN_HUNG_KAI_PREVIOUS_HEIGHT_CONTROL = 193;
export const SUN_HUNG_KAI_MAIN_GLASS_TOP = 211.5;
export const SUN_HUNG_KAI_PARAPET_TOP = 212.4;
export const SUN_HUNG_KAI_LOWER_VISUAL_COURSES = 46;
export const SUN_HUNG_KAI_ADDED_VISUAL_COURSES = 5;
export const SUN_HUNG_KAI_VISUAL_COURSES = SUN_HUNG_KAI_LOWER_VISUAL_COURSES + SUN_HUNG_KAI_ADDED_VISUAL_COURSES;
export const SUN_HUNG_KAI_PANEL_TARGET_WIDTH = 1.18;
export function sunHungKaiFloorY(course) {
  if (course <= SUN_HUNG_KAI_LOWER_VISUAL_COURSES) {
    const t = Math.max(0, course) / SUN_HUNG_KAI_LOWER_VISUAL_COURSES;
    return SUN_HUNG_KAI_PODIUM_HEIGHT + t * (SUN_HUNG_KAI_PREVIOUS_HEIGHT_CONTROL - SUN_HUNG_KAI_PODIUM_HEIGHT);
  }
  const t = Math.min(SUN_HUNG_KAI_ADDED_VISUAL_COURSES, course - SUN_HUNG_KAI_LOWER_VISUAL_COURSES) / SUN_HUNG_KAI_ADDED_VISUAL_COURSES;
  return SUN_HUNG_KAI_PREVIOUS_HEIGHT_CONTROL + t * (SUN_HUNG_KAI_MAIN_GLASS_TOP - SUN_HUNG_KAI_PREVIOUS_HEIGHT_CONTROL);
}
export function sunHungKaiLocalToWorld(x, z) {
  const site = SUN_HUNG_KAI_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return { x: site.x + cs * x + sn * z, z: site.z - sn * x + cs * z };
}
export const SUN_HUNG_KAI_PODIUM_WORLD_RING = Object.freeze(SUN_HUNG_KAI_PODIUM_RING.flatMap((value, index, array) => {
  if (index % 2) return []; const p = sunHungKaiLocalToWorld(value, array[index + 1]); return [p.x, p.z];
}));
export function sunHungKaiEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0;
  for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1;
  return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
export function sunHungKaiFrameToWorld(frame, x, z) {
  const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry);
  return { x: frame.x + cs * x + sn * z, z: frame.z - sn * x + cs * z };
}
export const SUN_HUNG_KAI_ENTRANCE_SOURCE_EDGE = 9;
export const SUN_HUNG_KAI_ATRIUM_PROJECTION = 4.8;
function entranceFrame() {
  const edge = SUN_HUNG_KAI_ENTRANCE_SOURCE_EDGE, ring = SUN_HUNG_KAI_TOWER_RING, i = edge * 2;
  const { nx, nz } = sunHungKaiEdgeOutward(ring, edge);
  const localX = (ring[i] + ring[i + 2]) * 0.5 + nx * SUN_HUNG_KAI_ATRIUM_PROJECTION;
  const localZ = (ring[i + 1] + ring[i + 3]) * 0.5 + nz * SUN_HUNG_KAI_ATRIUM_PROJECTION;
  const p = sunHungKaiLocalToWorld(localX, localZ), site = SUN_HUNG_KAI_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const worldNx = cs * nx + sn * nz, worldNz = -sn * nx + cs * nz;
  return Object.freeze({ x: p.x, z: p.z, nx: worldNx, nz: worldNz, ry: Math.atan2(worldNx, worldNz),
    evidence: 'Photo-directed Harbour Road podium entrance on the midpoint of source edge 9, projected 4.8 m for the sloping atrium; the current OSM way has no entrance-tagged node' });
}
export const SUN_HUNG_KAI_ENTRANCE = entranceFrame();
export const SUN_HUNG_KAI_GROUND_SAMPLE = Object.freeze({ x: SUN_HUNG_KAI_ENTRANCE.x, z: SUN_HUNG_KAI_ENTRANCE.z });
function frameRing(frame, halfWidth, back, front) {
  const result = [];
  for (const [x, z] of [[-halfWidth, back], [halfWidth, back], [halfWidth, front], [-halfWidth, front], [-halfWidth, back]]) {
    const p = sunHungKaiFrameToWorld(frame, x, z); result.push(p.x, p.z);
  }
  return Object.freeze(result);
}
export const SUN_HUNG_KAI_ENTRANCE_FORECOURT_RING = frameRing(SUN_HUNG_KAI_ENTRANCE, 18, -5.6, 4.2);
export const SUN_HUNG_KAI_GROUND_RINGS = Object.freeze([
  SUN_HUNG_KAI_SITE.ring, SUN_HUNG_KAI_PODIUM_WORLD_RING, SUN_HUNG_KAI_ENTRANCE_FORECOURT_RING
]);
export function isSunHungKaiPlazaPoint(x, z) { return SUN_HUNG_KAI_GROUND_RINGS.some((groundRing) => pointInFlatRing(groundRing, x, z)); }
export function sunHungKaiEdgeCollider(ring, edge, minY, maxY, depth = 0.85) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const world = sunHungKaiLocalToWorld((ax + bx) * 0.5, (az + bz) * 0.5);
  const { ry } = sunHungKaiEdgeOutward(ring, edge), worldRy = SUN_HUNG_KAI_SITE.ry + ry;
  const w = Math.hypot(bx - ax, bz - az) + 0.06, d = depth;
  const cs = Math.cos(worldRy), sn = Math.sin(worldRy), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: world.x, z: world.z, w, d, ry: worldRy, minY, maxY,
    minX: world.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: world.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: world.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: world.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: world.x, cz: world.z, hx, hz, cs, sn } };
}
export function sunHungKaiRingColliders(ring, minY, maxY, depth = 0.85) {
  const result = [];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) result.push(sunHungKaiEdgeCollider(ring, edge, minY, maxY, depth));
  return result;
}
