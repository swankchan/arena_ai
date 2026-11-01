// HK-B0014 Langham Place Office Tower: current OSM shaft, tagged entrance and separated published conventions.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';

function geometry(points) { return Object.freeze(points.map(([lon, lat]) => Object.freeze({ lon, lat }))); }
export const LANGHAM_PLACE_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-01',
  sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/65259283/full.json',
  type: 'way', id: 65259283, version: 10, timestamp: '2025-06-06T09:19:42Z', changeset: 167256890,
  user: 'Hingg', uid: 22961061,
  tags: Object.freeze({
    building: 'office', 'building:levels': '59', height: '255', layer: '1',
    name: '朗豪坊辦公大樓 Langham Place Office Tower', 'name:en': 'Langham Place Office Tower',
    'name:zh': '朗豪坊辦公大樓', wikidata: 'Q11092339', wikipedia: 'zh:朗豪坊辦公大樓'
  }),
  geometry: geometry([
    [114.1685738, 22.3186638], [114.1685620, 22.3186500], [114.1685467, 22.3186395],
    [114.1685289, 22.3186331], [114.1685099, 22.3186314], [114.1684912, 22.3186344],
    [114.1684739, 22.3186420], [114.1684651, 22.3186459], [114.1683711, 22.3187039],
    [114.1683154, 22.3187382], [114.1682988, 22.3187532], [114.1682884, 22.3187723],
    [114.1682852, 22.3187934], [114.1682896, 22.3188144], [114.1683011, 22.3188330],
    [114.1682860, 22.3188459], [114.1682696, 22.3188728], [114.1682631, 22.3189032],
    [114.1682669, 22.3189339], [114.1682809, 22.3189620], [114.1683036, 22.3189847],
    [114.1683316, 22.3189993], [114.1683327, 22.3189999], [114.1683655, 22.3190059],
    [114.1683987, 22.3190023], [114.1684171, 22.3189945], [114.1684312, 22.3190115],
    [114.1684504, 22.3190234], [114.1684728, 22.3190288], [114.1684958, 22.3190272],
    [114.1685171, 22.3190188], [114.1685767, 22.3189821], [114.1686346, 22.3189465],
    [114.1686669, 22.3189266], [114.1686750, 22.3189216], [114.1686913, 22.3189068],
    [114.1687018, 22.3188879], [114.1687051, 22.3188669], [114.1687010, 22.3188461],
    [114.1686900, 22.3188275], [114.1687040, 22.3188141], [114.1687205, 22.3187873],
    [114.1687273, 22.3187569], [114.1687235, 22.3187261], [114.1687095, 22.3186978],
    [114.1686864, 22.3186753], [114.1686574, 22.3186599], [114.1686245, 22.3186539],
    [114.1685913, 22.3186577], [114.1685738, 22.3186638]
  ])
});
export const LANGHAM_PLACE_ENTRANCE_SOURCE = Object.freeze({
  type: 'node', id: 10199055644, version: 1, timestamp: '2022-11-18T08:31:04Z', changeset: 129075034,
  user: 'Alan Shek', uid: 14725652, lon: 114.1685767, lat: 22.3189821,
  tags: Object.freeze({ entrance: 'yes' })
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
const ring = projectRing(LANGHAM_PLACE_OSM_SOURCE), footprint = minimumAreaObb(ring);
const baseSite = Object.freeze({
  name: '朗豪坊辦公大樓 Langham Place Office Tower', englishName: 'Langham Place Office Tower',
  address: '亞皆老街8號 8 Argyle Street', osmType: 'way', osmId: LANGHAM_PLACE_OSM_SOURCE.id,
  source: LANGHAM_PLACE_OSM_SOURCE, ring, bounds: flatRingBounds(ring), ...footprint
});
export const LANGHAM_PLACE_SITE = Object.freeze({ ...baseSite, localRing: localRing(baseSite) });
export const LANGHAM_PLACE_TOWER_RING = closeRing(LANGHAM_PLACE_SITE.localRing);

export const LANGHAM_PLACE_OSM_HEIGHT = 255;
export const LANGHAM_PLACE_HEIGHT = 255.1;
export const LANGHAM_PLACE_TO_TIP_HEIGHT = 255.1;
export const LANGHAM_PLACE_OSM_LEVELS = 59;
export const LANGHAM_PLACE_LEVELS = 59;
export const LANGHAM_PLACE_BELOW_GROUND_LEVELS = 5;
export const LANGHAM_PLACE_TOWER_GFA = 65868;
export const LANGHAM_PLACE_COMPLETED_YEAR = 2004;
export const LANGHAM_PLACE_CONSTRUCTION_START_YEAR = 1999;
export const LANGHAM_PLACE_WO_OFFICE_STOREYS = 57;
export const LANGHAM_PLACE_WO_OFFICE_GFA = 66000;
export const LANGHAM_PLACE_WO_GRAND_ATRIUM_STOREYS = 10;

export const LANGHAM_PLACE_PLAZA_TOP = 0.12;
export const LANGHAM_PLACE_MAIN_ROOF = 239;
export const LANGHAM_PLACE_DOME_BASE = LANGHAM_PLACE_MAIN_ROOF;
export const LANGHAM_PLACE_DOME_HEIGHT = Number((LANGHAM_PLACE_TO_TIP_HEIGHT - LANGHAM_PLACE_DOME_BASE).toFixed(6));
export const LANGHAM_PLACE_DOME_CENTER = Object.freeze({ x: 0, z: 12 });
export const LANGHAM_PLACE_DOME_RADIUS_X = 8.2;
export const LANGHAM_PLACE_DOME_RADIUS_Z = 7.2;
export const LANGHAM_PLACE_PANEL_TARGET_WIDTH = 1.55;
export const LANGHAM_PLACE_VISUAL_GREY_BAND_LEVELS = Object.freeze([18, 19, 38, 39]);
export const LANGHAM_PLACE_RECESS_EDGES = Object.freeze([7, 8, 13, 14, 24, 25, 38, 39]);
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
export const LANGHAM_PLACE_ROOF_ZONES = Object.freeze([
  Object.freeze({ name: 'north-dome', height: 239, edges: Object.freeze([...range(45, 48), ...range(0, 6)]) }),
  Object.freeze({ name: 'west-step', height: 230, edges: Object.freeze(range(7, 20)) }),
  Object.freeze({ name: 'south-step', height: 226, edges: Object.freeze(range(21, 33)) }),
  Object.freeze({ name: 'east-step', height: 233, edges: Object.freeze(range(34, 44)) })
]);
export function langhamPlaceRoofYForEdge(edge) {
  const zone = LANGHAM_PLACE_ROOF_ZONES.find((item) => item.edges.includes(edge));
  if (!zone) throw new RangeError(`Unknown Langham Place edge ${edge}`);
  return zone.height;
}
export function langhamPlaceFloorY(level) {
  return Math.max(0, Math.min(LANGHAM_PLACE_LEVELS, level)) * LANGHAM_PLACE_MAIN_ROOF / LANGHAM_PLACE_LEVELS;
}
export function langhamPlaceLocalToWorld(x, z) {
  const site = LANGHAM_PLACE_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return { x: site.x + cs * x + sn * z, z: site.z - sn * x + cs * z };
}
export function langhamPlaceEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0;
  for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1;
  return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
export function langhamPlaceFrameToWorld(frame, x, z) {
  const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry);
  return { x: frame.x + cs * x + sn * z, z: frame.z - sn * x + cs * z };
}
function entranceFrame() {
  const source = LANGHAM_PLACE_ENTRANCE_SOURCE, [x, z] = project(source.lon, source.lat);
  const before = langhamPlaceEdgeOutward(LANGHAM_PLACE_TOWER_RING, 30), after = langhamPlaceEdgeOutward(LANGHAM_PLACE_TOWER_RING, 31);
  const site = LANGHAM_PLACE_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const ax = cs * before.nx + sn * before.nz + cs * after.nx + sn * after.nz;
  const az = -sn * before.nx + cs * before.nz - sn * after.nx + cs * after.nz, length = Math.hypot(ax, az);
  const nx = ax / length, nz = az / length;
  return Object.freeze({ x, z, nx, nz, ry: Math.atan2(nx, nz),
    evidence: 'Exact OSM entrance=yes node 10199055644 at the shared vertex of source edges 30 and 31' });
}
export const LANGHAM_PLACE_ENTRANCE_EDGE_BEFORE = 30;
export const LANGHAM_PLACE_ENTRANCE_EDGE_AFTER = 31;
export const LANGHAM_PLACE_ENTRANCE = entranceFrame();
export const LANGHAM_PLACE_DOME_WORLD = Object.freeze(langhamPlaceLocalToWorld(LANGHAM_PLACE_DOME_CENTER.x, LANGHAM_PLACE_DOME_CENTER.z));
function frameRing(frame, halfWidth, back, front) {
  const result = [];
  for (const [x, z] of [[-halfWidth, back], [halfWidth, back], [halfWidth, front], [-halfWidth, front], [-halfWidth, back]]) {
    const p = langhamPlaceFrameToWorld(frame, x, z); result.push(p.x, p.z);
  }
  return Object.freeze(result);
}
export const LANGHAM_PLACE_ENTRANCE_FORECOURT_RING = frameRing(LANGHAM_PLACE_ENTRANCE, 7, -0.75, 3);
export const LANGHAM_PLACE_GROUND_RINGS = Object.freeze([LANGHAM_PLACE_SITE.ring, LANGHAM_PLACE_ENTRANCE_FORECOURT_RING]);
export function isLanghamPlacePlazaPoint(x, z) {
  return LANGHAM_PLACE_GROUND_RINGS.some((groundRing) => pointInFlatRing(groundRing, x, z));
}

export function langhamPlaceEdgeCollider(ring, edge, minY, maxY, depth = 0.8) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const world = langhamPlaceLocalToWorld((ax + bx) * 0.5, (az + bz) * 0.5);
  const { ry } = langhamPlaceEdgeOutward(ring, edge), worldRy = LANGHAM_PLACE_SITE.ry + ry;
  const w = Math.hypot(bx - ax, bz - az) + 0.06, d = depth;
  const cs = Math.cos(worldRy), sn = Math.sin(worldRy), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: world.x, z: world.z, w, d, ry: worldRy, minY, maxY,
    minX: world.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: world.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: world.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: world.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: world.x, cz: world.z, hx, hz, cs, sn } };
}
export function langhamPlaceRingColliders(ring, minY = 0, depth = 0.8) {
  const result = [];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    result.push(langhamPlaceEdgeCollider(ring, edge, minY, langhamPlaceRoofYForEdge(edge), depth));
  }
  return result;
}
