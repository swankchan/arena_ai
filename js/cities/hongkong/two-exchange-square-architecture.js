// HK-B0030 Two Exchange Square: exact OSM tower ring and independent architectural / facade conventions.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';
const geometry = (rows) => Object.freeze(rows.map(([id, lon, lat]) => Object.freeze({ id, lon, lat })));
export const TWO_EXCHANGE_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-03',
  sourceTimestamp: '2025-12-27T08:33:19Z', sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/148554953/full.json',
  type: 'way', id: 148554953, version: 7,
  tags: Object.freeze({
    "building": "office",
    "building:colour": "#c3ae99",
    "building:levels": "52",
    "height": "188",
    "location": "podium",
    "name": "交易廣場第二座 Two Exchange Square",
    "name:en": "Two Exchange Square",
    "name:zh": "交易廣場第二座"
  }),
  geometry: geometry([
    [1616458861, 114.1581591, 22.2840363],
    [1616458847, 114.1581385, 22.2840311],
    [1616458835, 114.158038, 22.2838717],
    [1616458833, 114.1580399, 22.2838651],
    [1616458832, 114.1580273, 22.2838509],
    [1616458825, 114.1580174, 22.283835],
    [1616458817, 114.1580102, 22.2838178],
    [1616458811, 114.1580061, 22.2837998],
    [1616458801, 114.1580051, 22.2837815],
    [1616458802, 114.1580072, 22.2837632],
    [11803532593, 114.1580124, 22.2837455],
    [11803532581, 114.1580206, 22.2837287],
    [11803532588, 114.1580315, 22.2837134],
    [11803532584, 114.1580449, 22.2836998],
    [11803532614, 114.1580605, 22.2836884],
    [11803532606, 114.1580778, 22.2836794],
    [1616458794, 114.1580964, 22.283673],
    [1616458793, 114.1581001, 22.2836602],
    [1616458789, 114.158142, 22.2836389],
    [1616458795, 114.1582728, 22.283672],
    [1616458807, 114.1582969, 22.2837097],
    [1616458808, 114.1582903, 22.2837321],
    [1616458812, 114.1583124, 22.2837399],
    [1616458813, 114.1583327, 22.2837511],
    [1616458818, 114.1583508, 22.2837653],
    [1616458820, 114.158366, 22.2837822],
    [1616458826, 114.1583779, 22.2838011],
    [1616458836, 114.1583861, 22.2838216],
    [11399930699, 114.1583906, 22.2838432],
    [11803532594, 114.158391, 22.2838651],
    [1616458837, 114.1583874, 22.2838868],
    [1616458838, 114.1584362, 22.2838999],
    [1616458843, 114.1585178, 22.2840214],
    [1616458852, 114.1583884, 22.2840942],
    [1616458849, 114.1583755, 22.284091],
    [1616458846, 114.1583633, 22.2841052],
    [365825989, 114.1583487, 22.2841173],
    [1616458842, 114.1583321, 22.2841271],
    [1616458855, 114.158314, 22.2841342],
    [365825988, 114.1582948, 22.2841384],
    [1616458845, 114.1582752, 22.2841396],
    [1616458859, 114.1582557, 22.2841378],
    [1616458864, 114.1582367, 22.284133],
    [1616458869, 114.1582189, 22.2841253],
    [1616458870, 114.1582026, 22.2841151],
    [1616458853, 114.1581884, 22.2841025],
    [1616458851, 114.1581767, 22.2840879],
    [1616458860, 114.1581678, 22.2840717],
    [1616458857, 114.1581619, 22.2840543],
    [1616458861, 114.1581591, 22.2840363],
  ])
});
const KX = 103056.81753522092, KY = 110734.09626824585;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];
const worldRing = Object.freeze(TWO_EXCHANGE_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat)));
const footprint = minimumAreaObb(worldRing);
let signedArea = 0;
for (let i = 0; i + 3 < worldRing.length; i += 2) signedArea += worldRing[i] * worldRing[i + 3] - worldRing[i + 2] * worldRing[i + 1];
export const TWO_EXCHANGE_RING_AREA = Math.abs(signedArea * .5);
export const TWO_EXCHANGE_SITE = Object.freeze({
  name: '交易廣場第二座 Two Exchange Square', englishName: 'Two Exchange Square', address: '康樂廣場8號 8 Connaught Place',
  osmType: 'way', osmId: TWO_EXCHANGE_OSM_SOURCE.id, source: TWO_EXCHANGE_OSM_SOURCE,
  ring: worldRing, bounds: flatRingBounds(worldRing), ...footprint
});
export function twoExchangeLocalToWorld(x, z) { const s = TWO_EXCHANGE_SITE, cs = Math.cos(s.ry), sn = Math.sin(s.ry); return { x: s.x + cs * x + sn * z, z: s.z - sn * x + cs * z }; }
export function twoExchangeWorldToLocal(x, z) { const s = TWO_EXCHANGE_SITE, cs = Math.cos(s.ry), sn = Math.sin(s.ry), dx = x - s.x, dz = z - s.z; return { x: dx * cs - dz * sn, z: dx * sn + dz * cs }; }
export const TWO_EXCHANGE_LOCAL_RING = Object.freeze(worldRing.flatMap((value, index, array) => { if (index % 2) return []; const p = twoExchangeWorldToLocal(value, array[index + 1]); return [p.x, p.z]; }));
export const TWO_EXCHANGE_GROUND_SAMPLE = Object.freeze({ x: TWO_EXCHANGE_SITE.x, z: TWO_EXCHANGE_SITE.z });
export const TWO_EXCHANGE_OSM_HEIGHT = 188, TWO_EXCHANGE_CTBUH_HEIGHT = 188, TWO_EXCHANGE_EMPORIS_HEIGHT = 188.01, TWO_EXCHANGE_HEIGHT = TWO_EXCHANGE_OSM_HEIGHT;
export const TWO_EXCHANGE_EMPORIS_MAIN_ROOF = 182.03, TWO_EXCHANGE_MAIN_ROOF = TWO_EXCHANGE_EMPORIS_MAIN_ROOF, TWO_EXCHANGE_EMPORIS_FLOOR_TO_FLOOR = 3.33;
export const TWO_EXCHANGE_OSM_LEVELS = 52, TWO_EXCHANGE_CTBUH_LEVELS = 52, TWO_EXCHANGE_EMPORIS_LEVELS = 52, TWO_EXCHANGE_UNDERGROUND_LEVELS = 1;
export const TWO_EXCHANGE_CONSTRUCTION_START = 1982, TWO_EXCHANGE_COMPLETION_YEAR = 1985;
export const TWO_EXCHANGE_STRUCTURAL_MATERIAL = 'All-Concrete', TWO_EXCHANGE_ARCHITECT = 'P & T Group';
export const TWO_EXCHANGE_COMPLEX_GFA = 162400, TWO_EXCHANGE_TOTAL_AREA_SQFT = 580000, TWO_EXCHANGE_TYPICAL_FLOOR_MIN_SQFT = 12057, TWO_EXCHANGE_TYPICAL_FLOOR_MAX_SQFT = 14445;
export const TWO_EXCHANGE_SAVVI_OFFICE_FLOORS = Object.freeze({ first: 5, last: 49, count: 44 }), TWO_EXCHANGE_CBD_OFFICE_FLOORS = 42;
export const TWO_EXCHANGE_OFFICE_COURSES = 44, TWO_EXCHANGE_TARGET_PANEL_WIDTH = 1.55, TWO_EXCHANGE_LIFT_COUNT = 24, TWO_EXCHANGE_LIFT_ZONES = 6;
// Photo-directed visual controls, not surveyed podium or crown engineering elevations.
export const TWO_EXCHANGE_PODIUM_TOP = 12.03, TWO_EXCHANGE_PRISM_EDGES = Object.freeze([1, 18, 31, 32]);
// Generated road record indices are not OSM IDs. Twenty-two source edges remain open around the surface terminal/drop-off roads.
export const TWO_EXCHANGE_ROAD_RECORD_INDICES = Object.freeze([38087, 39176, 40776, 44601, 44602]);
export const TWO_EXCHANGE_ROAD_OPEN_EDGES = Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 31, 32, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48]);
export const TWO_EXCHANGE_COLUMN_VERTICES = Object.freeze([11, 14, 17, 20, 23, 26, 29, 30, 33, 35, 37, 39]);
export const TWO_EXCHANGE_GROUND_SOFFIT = 7.2, TWO_EXCHANGE_VEHICLE_ENVELOPE = 4.7;
export const TWO_EXCHANGE_PLAZA_TOP = .12, TWO_EXCHANGE_MAIN_ENTRANCE_HEIGHT = 6.8, TWO_EXCHANGE_MAIN_FORECOURT_WIDTH = 13.8, TWO_EXCHANGE_MAIN_FORECOURT_DEPTH = 4.4;
export function twoExchangeEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3], dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0; for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1; return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
export function twoExchangeFrameToWorld(frame, x, z) { const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry); return { x: frame.x + cs * x + sn * z, z: frame.z - sn * x + cs * z }; }
function photoDirectedFrame(sourceEdge, name, evidence) {
  const i = sourceEdge * 2, ax = TWO_EXCHANGE_LOCAL_RING[i], az = TWO_EXCHANGE_LOCAL_RING[i + 1], bx = TWO_EXCHANGE_LOCAL_RING[i + 2], bz = TWO_EXCHANGE_LOCAL_RING[i + 3];
  const localX = (ax + bx) * .5, localZ = (az + bz) * .5, world = twoExchangeLocalToWorld(localX, localZ), edge = twoExchangeEdgeOutward(TWO_EXCHANGE_LOCAL_RING, sourceEdge);
  const cs = Math.cos(TWO_EXCHANGE_SITE.ry), sn = Math.sin(TWO_EXCHANGE_SITE.ry), nx = cs * edge.nx + sn * edge.nz, nz = -sn * edge.nx + cs * edge.nz;
  return Object.freeze({ nodeId: null, sourceEdge, localX, localZ, x: world.x, z: world.z, nx, nz, ry: Math.atan2(nx, nz), name, evidence });
}
export const TWO_EXCHANGE_MAIN_ENTRANCE = photoDirectedFrame(18, 'Two Exchange Square between-towers arrival', 'Photo-directed source-edge midpoint: RIBA 2014 photograph identifies the main entrance between the two towers, with curved glass and Exchange Square lettering. No entrance-tagged OSM node exists in way 148554953 v7.');
export const TWO_EXCHANGE_MAIN_FORECOURT_RING = (() => {
  const frame = TWO_EXCHANGE_MAIN_ENTRANCE, ring = [];
  for (const [x, z] of [[-TWO_EXCHANGE_MAIN_FORECOURT_WIDTH * .5, -1], [TWO_EXCHANGE_MAIN_FORECOURT_WIDTH * .5, -1], [TWO_EXCHANGE_MAIN_FORECOURT_WIDTH * .5, TWO_EXCHANGE_MAIN_FORECOURT_DEPTH], [-TWO_EXCHANGE_MAIN_FORECOURT_WIDTH * .5, TWO_EXCHANGE_MAIN_FORECOURT_DEPTH], [-TWO_EXCHANGE_MAIN_FORECOURT_WIDTH * .5, -1]]) {
    const point = twoExchangeFrameToWorld(frame, x, z); ring.push(point.x, point.z);
  }
  return Object.freeze(ring);
})();
export const TWO_EXCHANGE_GROUND_RINGS = Object.freeze([TWO_EXCHANGE_SITE.ring, TWO_EXCHANGE_MAIN_FORECOURT_RING]);
function inMainForecourt(x, z) {
  const frame = TWO_EXCHANGE_MAIN_ENTRANCE, cs = Math.cos(frame.ry), sn = Math.sin(frame.ry), dx = x - frame.x, dz = z - frame.z;
  const lx = cs * dx - sn * dz, lz = sn * dx + cs * dz;
  return Math.abs(lx) <= TWO_EXCHANGE_MAIN_FORECOURT_WIDTH * .5 && lz >= -1 && lz <= TWO_EXCHANGE_MAIN_FORECOURT_DEPTH;
}
export function isTwoExchangeMainForecourtPoint(x, z) { return inMainForecourt(x, z); }
export function isTwoExchangePlazaPoint(x, z) { return pointInFlatRing(TWO_EXCHANGE_SITE.ring, x, z) || inMainForecourt(x, z); }
export function twoExchangeGroundHeightAt(x, z, ground, grounds) { return isTwoExchangePlazaPoint(x, z) ? grounds.plaza : ground; }
export function twoExchangeLocalCollider(x, z, w, d, minY, maxY, ry = TWO_EXCHANGE_SITE.ry) {
  const p = twoExchangeLocalToWorld(x, z), cs = Math.cos(ry), sn = Math.sin(ry), hx = w * .5, hz = d * .5;
  return { shape: 'box', x: p.x, z: p.z, w, d, ry, minY, maxY, minX: p.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: p.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: p.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: p.z + Math.abs(sn) * hx + Math.abs(cs) * hz, obb: { cx: p.x, cz: p.z, hx, hz, cs, sn } };
}
export function twoExchangeEdgeCollider(ring, edge, minY, maxY, depth = .42) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3], { ry, length } = twoExchangeEdgeOutward(ring, edge);
  return twoExchangeLocalCollider((ax + bx) * .5, (az + bz) * .5, length + .02, depth, minY, maxY, TWO_EXCHANGE_SITE.ry + ry);
}
export function twoExchangeRingColliders(ring, minY, maxY, depth = .42) { const out = []; for (let edge = 0; edge < ring.length / 2 - 1; edge++) out.push(twoExchangeEdgeCollider(ring, edge, minY, maxY, depth)); return out; }
export function twoExchangeFrameCollider(frame, x, z, w, d, minY, maxY, base = 0) {
  const p = twoExchangeFrameToWorld(frame, x, z), ry = frame.ry, cs = Math.cos(ry), sn = Math.sin(ry), hx = w * .5, hz = d * .5;
  return { shape: 'box', x: p.x, z: p.z, w, d, ry, minY: minY + base, maxY: maxY + base, minX: p.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: p.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: p.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: p.z + Math.abs(sn) * hx + Math.abs(cs) * hz, obb: { cx: p.x, cz: p.z, hx, hz, cs, sn } };
}
