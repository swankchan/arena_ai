// HK-B0029 One Exchange Square: exact OSM tower ring and independent architectural / facade conventions.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';
const geometry = (rows) => Object.freeze(rows.map(([id, lon, lat]) => Object.freeze({ id, lon, lat })));
export const ONE_EXCHANGE_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-03',
  sourceTimestamp: '2025-12-27T08:33:19Z', sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/32530560/full.json',
  type: 'way', id: 32530560, version: 11,
  tags: Object.freeze({
    "building": "office",
    "building:colour": "#c3ae99",
    "building:levels": "52",
    "height": "188",
    "location": "podium",
    "name": "交易廣場第一座 One Exchange Square",
    "name:en": "One Exchange Square",
    "name:zh": "交易廣場第一座"
  }),
  geometry: geometry([
    [1616458734, 114.1585627, 22.2833337],
    [1616458735, 114.158583, 22.2833381],
    [1233568733, 114.1586271, 22.2834044],
    [365825679, 114.1586573, 22.2834497],
    [1616458759, 114.1585364, 22.2835185],
    [365825682, 114.1584969, 22.2835092],
    [1616458768, 114.1584909, 22.2835264],
    [1616458776, 114.1584818, 22.2835426],
    [1616458783, 114.1584678, 22.28356],
    [11803532589, 114.1584451, 22.2835806],
    [11803532597, 114.1584159, 22.2835957],
    [11803532591, 114.1583849, 22.2836034],
    [1616458782, 114.1583553, 22.2836044],
    [365825683, 114.158329, 22.2836003],
    [1616458790, 114.1583225, 22.2836226],
    [1616458796, 114.1582812, 22.2836442],
    [365825685, 114.1581489, 22.2836103],
    [1616458775, 114.1581257, 22.283573],
    [1616458767, 114.1581287, 22.2835628],
    [1616458763, 114.1581142, 22.2835456],
    [1616458764, 114.1581034, 22.2835262],
    [1616458756, 114.1580967, 22.2835052],
    [1616458750, 114.1580943, 22.2834835],
    [1616458744, 114.1580962, 22.2834618],
    [11803532587, 114.1581025, 22.2834407],
    [1616458737, 114.158113, 22.2834212],
    [1616458741, 114.1581271, 22.2834037],
    [365825686, 114.1581446, 22.283389],
    [11803532609, 114.1581646, 22.2833775],
    [11803532616, 114.1581866, 22.2833697],
    [11803532595, 114.1581866, 22.283366],
    [11803532601, 114.1583381, 22.2832808],
    [11803532615, 114.1583531, 22.2832842],
    [11803532586, 114.1583692, 22.283265],
    [11803532598, 114.1583895, 22.2832498],
    [11803532610, 114.1584131, 22.2832393],
    [11803532585, 114.1584387, 22.2832342],
    [11803532592, 114.1584649, 22.2832346],
    [1616458726, 114.1584903, 22.2832406],
    [289664664, 114.1585135, 22.2832518],
    [1616458722, 114.1585333, 22.2832677],
    [365825689, 114.1585486, 22.2832874],
    [1616458727, 114.1585585, 22.2833098],
    [1616458734, 114.1585627, 22.2833337],
  ])
});
const KX = 103056.81753522092, KY = 110734.09626824585;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];
const worldRing = Object.freeze(ONE_EXCHANGE_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat)));
const footprint = minimumAreaObb(worldRing);
let signedArea = 0;
for (let i = 0; i + 3 < worldRing.length; i += 2) signedArea += worldRing[i] * worldRing[i + 3] - worldRing[i + 2] * worldRing[i + 1];
export const ONE_EXCHANGE_RING_AREA = Math.abs(signedArea * .5);
export const ONE_EXCHANGE_SITE = Object.freeze({
  name: '交易廣場第一座 One Exchange Square', englishName: 'One Exchange Square', address: '康樂廣場8號 8 Connaught Place',
  osmType: 'way', osmId: ONE_EXCHANGE_OSM_SOURCE.id, source: ONE_EXCHANGE_OSM_SOURCE,
  ring: worldRing, bounds: flatRingBounds(worldRing), ...footprint
});
export function oneExchangeLocalToWorld(x, z) { const s = ONE_EXCHANGE_SITE, cs = Math.cos(s.ry), sn = Math.sin(s.ry); return { x: s.x + cs * x + sn * z, z: s.z - sn * x + cs * z }; }
export function oneExchangeWorldToLocal(x, z) { const s = ONE_EXCHANGE_SITE, cs = Math.cos(s.ry), sn = Math.sin(s.ry), dx = x - s.x, dz = z - s.z; return { x: dx * cs - dz * sn, z: dx * sn + dz * cs }; }
export const ONE_EXCHANGE_LOCAL_RING = Object.freeze(worldRing.flatMap((value, index, array) => { if (index % 2) return []; const p = oneExchangeWorldToLocal(value, array[index + 1]); return [p.x, p.z]; }));
export const ONE_EXCHANGE_GROUND_SAMPLE = Object.freeze({ x: ONE_EXCHANGE_SITE.x, z: ONE_EXCHANGE_SITE.z });
export const ONE_EXCHANGE_OSM_HEIGHT = 188, ONE_EXCHANGE_CTBUH_HEIGHT = 188, ONE_EXCHANGE_EMPORIS_HEIGHT = 188.01, ONE_EXCHANGE_HEIGHT = ONE_EXCHANGE_OSM_HEIGHT;
export const ONE_EXCHANGE_EMPORIS_MAIN_ROOF = 182.03, ONE_EXCHANGE_MAIN_ROOF = ONE_EXCHANGE_EMPORIS_MAIN_ROOF;
export const ONE_EXCHANGE_OSM_LEVELS = 52, ONE_EXCHANGE_CTBUH_LEVELS = 52, ONE_EXCHANGE_EMPORIS_LEVELS = 52, ONE_EXCHANGE_UNDERGROUND_LEVELS = 1;
export const ONE_EXCHANGE_CONSTRUCTION_START = 1982, ONE_EXCHANGE_COMPLETION_YEAR = 1985;
export const ONE_EXCHANGE_STRUCTURAL_MATERIAL = 'All-Concrete', ONE_EXCHANGE_ARCHITECT = 'P & T Group', ONE_EXCHANGE_LEAD_DESIGNER = 'Remo Riva';
export const ONE_EXCHANGE_COMPLEX_GFA = 162400, ONE_EXCHANGE_JLL_TOTAL_AREA_SQFT = 600000, ONE_EXCHANGE_JLL_TYPICAL_FLOOR_SQFT = 13000;
export const ONE_EXCHANGE_SAVVI_OFFICE_FLOORS = Object.freeze({ first: 5, last: 50, count: 45 });
export const ONE_EXCHANGE_OFFICE_COURSES = 45, ONE_EXCHANGE_TARGET_PANEL_WIDTH = 1.55;
// Photo-directed visual controls, not surveyed podium or crown engineering elevations.
export const ONE_EXCHANGE_PODIUM_TOP = 12.03, ONE_EXCHANGE_PRISM_EDGES = Object.freeze([3, 15, 30]);
// Generated road record 45686 is a surface service/bus-terminal road, not an OSM ID. These edge bays stay open below the podium.
export const ONE_EXCHANGE_ROAD_RECORD_INDEX = 45686, ONE_EXCHANGE_ROAD_OPEN_EDGES = Object.freeze([3, 4, 5, 11, 12, 13, 14]);
export const ONE_EXCHANGE_COLUMN_VERTICES = Object.freeze([0, 2, 4, 8, 10, 16, 20, 24, 28, 32, 36, 40]);
export const ONE_EXCHANGE_GROUND_SOFFIT = 7.2, ONE_EXCHANGE_VEHICLE_ENVELOPE = 4.7;
export const ONE_EXCHANGE_PLAZA_TOP = .12, ONE_EXCHANGE_MAIN_FORECOURT_WIDTH = 18, ONE_EXCHANGE_MAIN_FORECOURT_DEPTH = 4.6;
export function oneExchangeEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3], dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0; for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1; return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
export function oneExchangeFrameToWorld(frame, x, z) { const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry); return { x: frame.x + cs * x + sn * z, z: frame.z - sn * x + cs * z }; }
function photoDirectedFrame(sourceEdge, name, evidence) {
  const i = sourceEdge * 2, ax = ONE_EXCHANGE_LOCAL_RING[i], az = ONE_EXCHANGE_LOCAL_RING[i + 1], bx = ONE_EXCHANGE_LOCAL_RING[i + 2], bz = ONE_EXCHANGE_LOCAL_RING[i + 3];
  const localX = (ax + bx) * .5, localZ = (az + bz) * .5, world = oneExchangeLocalToWorld(localX, localZ), edge = oneExchangeEdgeOutward(ONE_EXCHANGE_LOCAL_RING, sourceEdge);
  const cs = Math.cos(ONE_EXCHANGE_SITE.ry), sn = Math.sin(ONE_EXCHANGE_SITE.ry), nx = cs * edge.nx + sn * edge.nz, nz = -sn * edge.nx + cs * edge.nz;
  return Object.freeze({ nodeId: null, sourceEdge, localX, localZ, x: world.x, z: world.z, nx, nz, ry: Math.atan2(nx, nz), name, evidence });
}
export const ONE_EXCHANGE_MAIN_ENTRANCE = photoDirectedFrame(30, 'One Exchange Square Connaught Place arrival', 'Photo-directed source-edge midpoint: completed photographs show the glazed arrival, HKEX ticker, paired escalators and Sidney Nolan murals. No entrance-tagged OSM node exists in way 32530560 v11.');
export const ONE_EXCHANGE_MAIN_FORECOURT_RING = (() => {
  const frame = ONE_EXCHANGE_MAIN_ENTRANCE, ring = [];
  for (const [x, z] of [[-ONE_EXCHANGE_MAIN_FORECOURT_WIDTH * .5, -1], [ONE_EXCHANGE_MAIN_FORECOURT_WIDTH * .5, -1], [ONE_EXCHANGE_MAIN_FORECOURT_WIDTH * .5, ONE_EXCHANGE_MAIN_FORECOURT_DEPTH], [-ONE_EXCHANGE_MAIN_FORECOURT_WIDTH * .5, ONE_EXCHANGE_MAIN_FORECOURT_DEPTH], [-ONE_EXCHANGE_MAIN_FORECOURT_WIDTH * .5, -1]]) {
    const point = oneExchangeFrameToWorld(frame, x, z); ring.push(point.x, point.z);
  }
  return Object.freeze(ring);
})();
export const ONE_EXCHANGE_GROUND_RINGS = Object.freeze([ONE_EXCHANGE_SITE.ring, ONE_EXCHANGE_MAIN_FORECOURT_RING]);
function inMainForecourt(x, z) {
  const frame = ONE_EXCHANGE_MAIN_ENTRANCE, cs = Math.cos(frame.ry), sn = Math.sin(frame.ry), dx = x - frame.x, dz = z - frame.z;
  const lx = cs * dx - sn * dz, lz = sn * dx + cs * dz;
  return Math.abs(lx) <= ONE_EXCHANGE_MAIN_FORECOURT_WIDTH * .5 && lz >= -1 && lz <= ONE_EXCHANGE_MAIN_FORECOURT_DEPTH;
}
export function isOneExchangeMainForecourtPoint(x, z) { return inMainForecourt(x, z); }
export function isOneExchangePlazaPoint(x, z) { return pointInFlatRing(ONE_EXCHANGE_SITE.ring, x, z) || inMainForecourt(x, z); }
export function oneExchangeGroundHeightAt(x, z, ground, grounds) { return isOneExchangePlazaPoint(x, z) ? grounds.plaza : ground; }
export function oneExchangeLocalCollider(x, z, w, d, minY, maxY, ry = ONE_EXCHANGE_SITE.ry) {
  const p = oneExchangeLocalToWorld(x, z), cs = Math.cos(ry), sn = Math.sin(ry), hx = w * .5, hz = d * .5;
  return { shape: 'box', x: p.x, z: p.z, w, d, ry, minY, maxY, minX: p.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: p.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: p.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: p.z + Math.abs(sn) * hx + Math.abs(cs) * hz, obb: { cx: p.x, cz: p.z, hx, hz, cs, sn } };
}
export function oneExchangeEdgeCollider(ring, edge, minY, maxY, depth = .42) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3], { ry, length } = oneExchangeEdgeOutward(ring, edge);
  return oneExchangeLocalCollider((ax + bx) * .5, (az + bz) * .5, length + .02, depth, minY, maxY, ONE_EXCHANGE_SITE.ry + ry);
}
export function oneExchangeRingColliders(ring, minY, maxY, depth = .42) { const out = []; for (let edge = 0; edge < ring.length / 2 - 1; edge++) out.push(oneExchangeEdgeCollider(ring, edge, minY, maxY, depth)); return out; }
export function oneExchangeSegmentCollider(ring, edge, t0, t1, minY, maxY, depth = .3) {
  const i = edge * 2, tm = (t0 + t1) * .5, { ry, length } = oneExchangeEdgeOutward(ring, edge), x = ring[i] + (ring[i + 2] - ring[i]) * tm, z = ring[i + 1] + (ring[i + 3] - ring[i + 1]) * tm;
  return oneExchangeLocalCollider(x, z, length * (t1 - t0), depth, minY, maxY, ONE_EXCHANGE_SITE.ry + ry);
}
export function oneExchangeFrameCollider(frame, x, z, w, d, minY, maxY, base = 0) {
  const p = oneExchangeFrameToWorld(frame, x, z), ry = frame.ry, cs = Math.cos(ry), sn = Math.sin(ry), hx = w * .5, hz = d * .5;
  return { shape: 'box', x: p.x, z: p.z, w, d, ry, minY: minY + base, maxY: maxY + base, minX: p.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: p.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: p.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: p.z + Math.abs(sn) * hx + Math.abs(cs) * hz, obb: { cx: p.x, cz: p.z, hx, hz, cs, sn } };
}
