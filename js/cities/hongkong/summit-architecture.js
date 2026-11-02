// HK-B0015 The Summit: current OSM butterfly shaft, Happy Valley lobby model and separated published conventions.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';

function geometry(points) { return Object.freeze(points.map(([lon, lat]) => Object.freeze({ lon, lat }))); }
export const THE_SUMMIT_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-01',
  sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/65257281/full.json',
  type: 'way', id: 65257281, version: 9, timestamp: '2023-10-21T07:19:47Z', changeset: 142910648,
  user: 'tg4567', uid: 12500589,
  tags: Object.freeze({
  "building": "tower",
  "building:levels": "69",
  "building:use": "residential",
  "height": "220",
  "name": "御峰 The Summit",
  "name:en": "The Summit",
  "name:zh": "御峰",
  "wikidata": "Q3756285",
  "wikimedia_commons": "Category:The Summit (Hong Kong)",
  "wikipedia": "en:The Summit (Hong Kong)"
}),
  geometry: geometry([
    [114.1835569,22.2656268], [114.1835275,22.2656298], [114.1835197,22.2656329],
    [114.1835121,22.265639], [114.1835069,22.2656455], [114.1835034,22.2656552],
    [114.1835011,22.2656748], [114.1835036,22.2656916], [114.1835061,22.2656976],
    [114.1835101,22.2657007], [114.1835163,22.265702], [114.1835401,22.2657033],
    [114.1835579,22.2657018], [114.1835873,22.2656923], [114.1835973,22.2656913],
    [114.183606,22.2656922], [114.1836519,22.2657038], [114.1836667,22.2657046],
    [114.1836802,22.2657039], [114.1837347,22.2656898], [114.1837446,22.2656892],
    [114.1837529,22.2656903], [114.1837687,22.2656957], [114.1837803,22.2656975],
    [114.1837944,22.2656979], [114.1838142,22.2656968], [114.1838285,22.2656917],
    [114.1838315,22.2656873], [114.1838327,22.2656796], [114.1838335,22.2656662],
    [114.1838301,22.2656498], [114.1838261,22.2656404], [114.1838204,22.2656331],
    [114.1838134,22.2656276], [114.1838051,22.2656245], [114.1837961,22.2656231],
    [114.1837646,22.2656232], [114.1837628,22.2656177], [114.18376,22.2656139],
    [114.1837556,22.2656113], [114.1837507,22.2656107], [114.183746,22.2656117],
    [114.1837426,22.2656134], [114.1837296,22.2656041], [114.1837202,22.2655949],
    [114.1837104,22.2655819], [114.1837042,22.2655709], [114.1836997,22.2655569],
    [114.1836969,22.2655408], [114.183694,22.2655365], [114.1836336,22.2655376],
    [114.1836311,22.2655453], [114.1836298,22.2655564], [114.183626,22.2655704],
    [114.1836197,22.2655842], [114.1836115,22.2655963], [114.1836015,22.265607],
    [114.1835897,22.265616], [114.1835805,22.2656148], [114.1835758,22.2656152],
    [114.1835731,22.2656164], [114.1835712,22.2656179], [114.1835701,22.2656212],
    [114.1835695,22.2656271], [114.1835569,22.2656268]
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
const ring = projectRing(THE_SUMMIT_OSM_SOURCE), footprint = minimumAreaObb(ring);
const baseSite = Object.freeze({
  name: '御峰 The Summit', englishName: 'The Summit', address: '司徒拔道41C號 41C Stubbs Road',
  osmType: 'way', osmId: THE_SUMMIT_OSM_SOURCE.id, source: THE_SUMMIT_OSM_SOURCE,
  ring, bounds: flatRingBounds(ring), ...footprint
});
export const THE_SUMMIT_SITE = Object.freeze({ ...baseSite, localRing: localRing(baseSite) });
export const THE_SUMMIT_TOWER_RING = closeRing(THE_SUMMIT_SITE.localRing);
export const THE_SUMMIT_PODIUM_SCALE = 1.08;
export const THE_SUMMIT_PODIUM_RING = closeRing(THE_SUMMIT_SITE.localRing.map((value) => value * THE_SUMMIT_PODIUM_SCALE));
export const THE_SUMMIT_PODIUM_WORLD_RING = Object.freeze(THE_SUMMIT_PODIUM_RING.flatMap((value, index, array) => {
  if (index % 2) return []; const p = summitLocalToWorld(value, array[index + 1]); return [p.x, p.z];
}));

export const THE_SUMMIT_OSM_HEIGHT = 220;
export const THE_SUMMIT_HEIGHT = 219.8;
export const THE_SUMMIT_TO_TIP_HEIGHT = 219.8;
export const THE_SUMMIT_OSM_LEVELS = 69;
export const THE_SUMMIT_LEVELS = 69;
export const THE_SUMMIT_BELOW_GROUND_LEVELS = 2;
export const THE_SUMMIT_TOWER_GFA = 15225;
export const THE_SUMMIT_ELEVATORS = 3;
export const THE_SUMMIT_UNITS = 54;
export const THE_SUMMIT_COMPLETED_YEAR = 2002;
export const THE_SUMMIT_CTBUH_CONSTRUCTION_START_YEAR = 1996;
export const THE_SUMMIT_WIKIPEDIA_LEVELS = 65;
export const THE_SUMMIT_WIKIPEDIA_CONSTRUCTION_START_YEAR = 1999;
export const THE_SUMMIT_WIKIPEDIA_COMPLETED_YEAR = 2001;
export const THE_SUMMIT_PLAZA_TOP = 0.12;
export const THE_SUMMIT_PODIUM_HEIGHT = 18;
export const THE_SUMMIT_MAIN_ROOF = 211;
export const THE_SUMMIT_VISUAL_SHAFT_COURSES = 65;
export const THE_SUMMIT_PANEL_TARGET_WIDTH = 1.15;
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
// Photo-directed crown controls only; these are not separately surveyed roof elevations.
export const THE_SUMMIT_ROOF_ZONES = Object.freeze([
  Object.freeze({ name: 'west-curved-wing', height: 216.8, edges: Object.freeze(range(0, 14)) }),
  Object.freeze({ name: 'central-saddle', height: 211, edges: Object.freeze(range(15, 21)) }),
  Object.freeze({ name: 'east-curved-wing', height: 219.8, edges: Object.freeze(range(22, 35)) }),
  Object.freeze({ name: 'south-service-butterfly-tail', height: 212.6, edges: Object.freeze(range(36, 63)) })
]);
export const THE_SUMMIT_METAL_CORE_EDGES = Object.freeze(range(36, 63));
export const THE_SUMMIT_SADDLE_EDGES = Object.freeze([13, 14, 20, 21]);
export function summitRoofYForEdge(edge) {
  const zone = THE_SUMMIT_ROOF_ZONES.find((item) => item.edges.includes(edge));
  if (!zone) throw new RangeError(`Unknown The Summit edge ${edge}`);
  return zone.height;
}
export function summitFloorY(level) {
  const t = Math.max(0, Math.min(THE_SUMMIT_VISUAL_SHAFT_COURSES, level)) / THE_SUMMIT_VISUAL_SHAFT_COURSES;
  return THE_SUMMIT_PODIUM_HEIGHT + t * (THE_SUMMIT_MAIN_ROOF - THE_SUMMIT_PODIUM_HEIGHT);
}
export function summitLocalToWorld(x, z) {
  const site = THE_SUMMIT_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return { x: site.x + cs * x + sn * z, z: site.z - sn * x + cs * z };
}
export function summitEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0;
  for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1;
  return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
export function summitFrameToWorld(frame, x, z) {
  const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry);
  return { x: frame.x + cs * x + sn * z, z: frame.z - sn * x + cs * z };
}
export const THE_SUMMIT_ENTRANCE_SOURCE_VERTEX = 17;
export const THE_SUMMIT_ENTRANCE_SOURCE_NODE = 797836721;
function entranceFrame() {
  const ring = THE_SUMMIT_PODIUM_RING, vertex = THE_SUMMIT_ENTRANCE_SOURCE_VERTEX;
  const before = summitEdgeOutward(ring, 16), after = summitEdgeOutward(ring, 17);
  const p = summitLocalToWorld(ring[vertex * 2], ring[vertex * 2 + 1]);
  const site = THE_SUMMIT_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const ax = cs * (before.nx + after.nx) + sn * (before.nz + after.nz);
  const az = -sn * (before.nx + after.nx) + cs * (before.nz + after.nz), length = Math.hypot(ax, az);
  const nx = ax / length, nz = az / length;
  return Object.freeze({ x: p.x, z: p.z, nx, nz, ry: Math.atan2(nx, nz),
    evidence: 'Modelled Happy Valley-facing main lobby terrace on podium-scaled source vertex 17 (node 797836721); the OSM node has no entrance tag' });
}
export const THE_SUMMIT_ENTRANCE = entranceFrame();
export const THE_SUMMIT_GROUND_SAMPLE = Object.freeze({ x: THE_SUMMIT_ENTRANCE.x, z: THE_SUMMIT_ENTRANCE.z });
function frameRing(frame, halfWidth, back, front) {
  const result = [];
  for (const [x, z] of [[-halfWidth, back], [halfWidth, back], [halfWidth, front], [-halfWidth, front], [-halfWidth, back]]) {
    const p = summitFrameToWorld(frame, x, z); result.push(p.x, p.z);
  }
  return Object.freeze(result);
}
export const THE_SUMMIT_ENTRANCE_FORECOURT_RING = frameRing(THE_SUMMIT_ENTRANCE, 5.5, -0.75, 3.5);
export const THE_SUMMIT_GROUND_RINGS = Object.freeze([THE_SUMMIT_SITE.ring, THE_SUMMIT_PODIUM_WORLD_RING, THE_SUMMIT_ENTRANCE_FORECOURT_RING]);
export function isSummitPlazaPoint(x, z) { return THE_SUMMIT_GROUND_RINGS.some((groundRing) => pointInFlatRing(groundRing, x, z)); }
export function summitEdgeCollider(ring, edge, minY, maxY, depth = 0.8) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const world = summitLocalToWorld((ax + bx) * 0.5, (az + bz) * 0.5);
  const { ry } = summitEdgeOutward(ring, edge), worldRy = THE_SUMMIT_SITE.ry + ry;
  const w = Math.hypot(bx - ax, bz - az) + 0.06, d = depth;
  const cs = Math.cos(worldRy), sn = Math.sin(worldRy), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: world.x, z: world.z, w, d, ry: worldRy, minY, maxY,
    minX: world.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: world.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: world.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: world.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: world.x, cz: world.z, hx, hz, cs, sn } };
}
export function summitRingColliders(ring, minY = THE_SUMMIT_PODIUM_HEIGHT, depth = 0.8, heightForEdge = summitRoofYForEdge) {
  const result = [];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) result.push(summitEdgeCollider(ring, edge, minY, heightForEdge(edge), depth));
  return result;
}
