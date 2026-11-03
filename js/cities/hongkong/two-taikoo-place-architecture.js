// HK-B0027 Two Taikoo Place: exact OSM rounded office ring, source entrances and separate height/floor conventions.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';
const geometry = (rows) => Object.freeze(rows.map(([id, lon, lat]) => Object.freeze({ id, lon, lat })));
export const TWO_TAIKOO_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-03',
  sourceTimestamp: '2024-12-10T08:17:17Z', sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/710522581/full.json',
  type: 'way', id: 710522581, version: 8,
  tags: Object.freeze({
    "addr:housenumber": "979",
    "addr:street": "英皇道 King's Road",
    "building": "office",
    "building:levels": "46",
    "building:material": "glass",
    "height": "195",
    "name": "太古坊二座 Two Taikoo Place",
    "name:en": "Two Taikoo Place",
    "name:zh": "太古坊二座",
    "name:zh-Hans": "太古坊二座",
    "name:zh-Hant": "太古坊二座",
    "start_date": "2022-09"
  }),
  geometry: geometry([
    [6680285867, 114.2118894, 22.2867189],
    [12065753346, 114.2118795, 22.2867121],
    [12079907569, 114.2118703, 22.2867041],
    [12065797671, 114.2118623, 22.286694],
    [12079907570, 114.2118563, 22.2866847],
    [12079907579, 114.2118523, 22.286676],
    [12079907578, 114.2118496, 22.2866656],
    [12079877165, 114.211848, 22.2866553],
    [12361796907, 114.2118463, 22.2865729],
    [12079877164, 114.2118441, 22.2864651],
    [12079907587, 114.2118453, 22.2864544],
    [12065753348, 114.2118477, 22.2864442],
    [12079907575, 114.2118523, 22.2864333],
    [12079907584, 114.2118603, 22.2864225],
    [12079907571, 114.2118702, 22.2864123],
    [12079877167, 114.2118802, 22.2864051],
    [6680285868, 114.2118939, 22.2863985],
    [12065753350, 114.2119079, 22.2863941],
    [12065753349, 114.2119248, 22.2863919],
    [12271043012, 114.2124533, 22.2863797],
    [6680285869, 114.2124591, 22.2863796],
    [12079907589, 114.2124746, 22.2863809],
    [12079877168, 114.2124889, 22.2863841],
    [12079907572, 114.2125012, 22.2863893],
    [12079907574, 114.2125124, 22.2863962],
    [12079907573, 114.2125221, 22.2864037],
    [12079907590, 114.212531, 22.2864132],
    [12065753344, 114.2125389, 22.2864244],
    [12065753342, 114.2125448, 22.286437],
    [12065753352, 114.2125479, 22.2864504],
    [12271042946, 114.21255, 22.2865249],
    [6680285871, 114.2125509, 22.2865563],
    [12271042957, 114.2125518, 22.286588],
    [12065753341, 114.212553, 22.2866306],
    [12065753345, 114.2125511, 22.2866495],
    [12065797672, 114.2125462, 22.2866658],
    [6680285870, 114.2125406, 22.2866759],
    [12079907580, 114.2125318, 22.2866869],
    [12079907588, 114.2125224, 22.286696],
    [12079907576, 114.2125127, 22.286703],
    [12079907581, 114.2125012, 22.286709],
    [12079907583, 114.2124878, 22.2867138],
    [12079877166, 114.2124724, 22.2867167],
    [12271043011, 114.2124648, 22.2867173],
    [12079907582, 114.2124552, 22.2867181],
    [12271043015, 114.2124356, 22.2867186],
    [12271043009, 114.2123623, 22.2867203],
    [6680285873, 114.2123149, 22.2867214],
    [12271043010, 114.2122675, 22.2867225],
    [12079907585, 114.211934, 22.2867303],
    [12079907586, 114.2119171, 22.2867286],
    [12065753347, 114.2119025, 22.2867252],
    [6680285867, 114.2118894, 22.2867189]
  ])
});
const KX = 103056.81753522092, KY = 110734.09626824585;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];
const worldRing = Object.freeze(TWO_TAIKOO_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat)));
const footprint = minimumAreaObb(worldRing);
let signedArea = 0;
for (let i = 0; i + 3 < worldRing.length; i += 2) signedArea += worldRing[i] * worldRing[i + 3] - worldRing[i + 2] * worldRing[i + 1];
export const TWO_TAIKOO_RING_AREA = Math.abs(signedArea * .5);
export const TWO_TAIKOO_SITE = Object.freeze({
  name: '太古坊二座 Two Taikoo Place', englishName: 'Two Taikoo Place', address: '英皇道979號 979 King\'s Road',
  osmType: 'way', osmId: TWO_TAIKOO_OSM_SOURCE.id, source: TWO_TAIKOO_OSM_SOURCE,
  ring: worldRing, bounds: flatRingBounds(worldRing), ...footprint
});
export function twoTaikooLocalToWorld(x, z) { const s = TWO_TAIKOO_SITE, cs = Math.cos(s.ry), sn = Math.sin(s.ry); return { x: s.x + cs * x + sn * z, z: s.z - sn * x + cs * z }; }
export function twoTaikooWorldToLocal(x, z) { const s = TWO_TAIKOO_SITE, cs = Math.cos(s.ry), sn = Math.sin(s.ry), dx = x - s.x, dz = z - s.z; return { x: dx * cs - dz * sn, z: dx * sn + dz * cs }; }
export const TWO_TAIKOO_LOCAL_RING = Object.freeze(worldRing.flatMap((value, index, array) => { if (index % 2) return []; const p = twoTaikooWorldToLocal(value, array[index + 1]); return [p.x, p.z]; }));
export const TWO_TAIKOO_GROUND_SAMPLE = Object.freeze({ x: TWO_TAIKOO_SITE.x, z: TWO_TAIKOO_SITE.z });
export const TWO_TAIKOO_OSM_HEIGHT = 195, TWO_TAIKOO_CTBUH_HEIGHT = 191, TWO_TAIKOO_HEIGHT = TWO_TAIKOO_CTBUH_HEIGHT;
export const TWO_TAIKOO_OSM_LEVELS = 46, TWO_TAIKOO_CTBUH_LEVELS = 46, TWO_TAIKOO_SWIRE_LEVELS = 42;
export const TWO_TAIKOO_START_DATE = '2022-09', TWO_TAIKOO_COMPLETION_YEAR = 2022;
export const TWO_TAIKOO_NBBJ_GFA = 92000, TWO_TAIKOO_PANEL_WIDTH = 3;
export const TWO_TAIKOO_ARCHITECT = 'Wong & Ouyang', TWO_TAIKOO_FACADE_DESIGNER = 'NBBJ';
export const TWO_TAIKOO_FACADE_ENGINEER = "Eckersley O'Callaghan", TWO_TAIKOO_DEVELOPER = 'Swire Properties Limited';
export const TWO_TAIKOO_PUBLIC_GROUND_TOP = 6.5, TWO_TAIKOO_GREAT_ROOM_HEIGHT = 15;
export const TWO_TAIKOO_GREAT_ROOM_BOTTOM = 0, TWO_TAIKOO_GREAT_ROOM_TOP = TWO_TAIKOO_GREAT_ROOM_HEIGHT;
export const TWO_TAIKOO_GARDEN_BOTTOM = TWO_TAIKOO_GREAT_ROOM_TOP, TWO_TAIKOO_GARDEN_TOP = 23;
export const TWO_TAIKOO_ROOF_DECK = 187.6, TWO_TAIKOO_MAIN_GLASS_TOP = TWO_TAIKOO_ROOF_DECK, TWO_TAIKOO_VISUAL_COURSES = 46;
export const TWO_TAIKOO_PLAZA_TOP = .12;
export function twoTaikooEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3], dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0; for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1; return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
export function twoTaikooFrameToWorld(frame, x, z) { const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry); return { x: frame.x + cs * x + sn * z, z: frame.z - sn * x + cs * z }; }
function sourceFrame(sourceEdge, name, evidence) {
  const node = TWO_TAIKOO_OSM_SOURCE.geometry[sourceEdge], [x, z] = project(node.lon, node.lat), local = twoTaikooWorldToLocal(x, z), edge = twoTaikooEdgeOutward(TWO_TAIKOO_LOCAL_RING, sourceEdge);
  const cs = Math.cos(TWO_TAIKOO_SITE.ry), sn = Math.sin(TWO_TAIKOO_SITE.ry), nx = cs * edge.nx + sn * edge.nz, nz = -sn * edge.nx + cs * edge.nz;
  return Object.freeze({ nodeId: node.id, sourceEdge, localX: local.x, localZ: local.z, x, z, nx, nz, ry: Math.atan2(nx, nz), name, evidence });
}
export const TWO_TAIKOO_MAIN_ENTRANCE = sourceFrame(8, 'Two Taikoo Place west public entrance', 'OSM node 12361796907 entrance=yes; west-side exterior photographs show the open public ground level below the elevated Great Room.');
export const TWO_TAIKOO_EAST_ENTRANCE = sourceFrame(31, 'Two Taikoo Place east entrance', 'OSM node 6680285871 entrance=yes, access=yes.');
export const TWO_TAIKOO_NORTH_ENTRANCE = sourceFrame(47, 'Two Taikoo Place north entrance', 'OSM node 6680285873 entrance=yes, access=yes.');
export const TWO_TAIKOO_MAIN_FORECOURT_WIDTH = 14, TWO_TAIKOO_MAIN_FORECOURT_DEPTH = 6;
export function twoTaikooLocalCollider(x, z, w, d, minY, maxY, ry = TWO_TAIKOO_SITE.ry) {
  const p = twoTaikooLocalToWorld(x, z), cs = Math.cos(ry), sn = Math.sin(ry), hx = w * .5, hz = d * .5;
  return { shape: 'box', x: p.x, z: p.z, w, d, ry, minY, maxY, minX: p.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: p.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: p.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: p.z + Math.abs(sn) * hx + Math.abs(cs) * hz, obb: { cx: p.x, cz: p.z, hx, hz, cs, sn } };
}
export function twoTaikooEdgeCollider(ring, edge, minY, maxY, depth = .55) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3], { ry, length } = twoTaikooEdgeOutward(ring, edge);
  return twoTaikooLocalCollider((ax + bx) * .5, (az + bz) * .5, length + .02, depth, minY, maxY, TWO_TAIKOO_SITE.ry + ry);
}
export function twoTaikooRingColliders(ring, minY, maxY, depth = .55) { const out = []; for (let edge = 0; edge < ring.length / 2 - 1; edge++) out.push(twoTaikooEdgeCollider(ring, edge, minY, maxY, depth)); return out; }
export function twoTaikooSegmentCollider(ring, edge, t0, t1, minY, maxY, depth = .4) {
  const i = edge * 2, tm = (t0 + t1) * .5, { ry, length } = twoTaikooEdgeOutward(ring, edge), x = ring[i] + (ring[i + 2] - ring[i]) * tm, z = ring[i + 1] + (ring[i + 3] - ring[i + 1]) * tm;
  return twoTaikooLocalCollider(x, z, length * (t1 - t0), depth, minY, maxY, TWO_TAIKOO_SITE.ry + ry);
}
export function twoTaikooFrameCollider(frame, x, z, w, d, minY, maxY, base = 0) {
  const p = twoTaikooFrameToWorld(frame, x, z), ry = frame.ry, cs = Math.cos(ry), sn = Math.sin(ry), hx = w * .5, hz = d * .5;
  return { shape: 'box', x: p.x, z: p.z, w, d, ry, minY: minY + base, maxY: maxY + base, minX: p.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: p.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: p.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: p.z + Math.abs(sn) * hx + Math.abs(cs) * hz, obb: { cx: p.x, cz: p.z, hx, hz, cs, sn } };
}
export const TWO_TAIKOO_ROAD_VEHICLE_CLEARANCE = 4.7, TWO_TAIKOO_PORTAL_LINTEL = .32;
export const TWO_TAIKOO_CROSSING_ROADS = Object.freeze([
  Object.freeze({ recordIndex: 35728, name: '', width: 5.5, flags: 0, points: Object.freeze([5450.4, -606.2, 5448.1, -533.4]) }),
  Object.freeze({ recordIndex: 50426, name: '', width: 5.5, flags: 0, points: Object.freeze([5446.9, -496.1, 5446.7, -489.8]) }),
  Object.freeze({ recordIndex: 50427, name: '', width: 5.5, flags: 4, points: Object.freeze([5448.1, -533.4, 5446.9, -496.1]) })
]);
function pointSegment(x, z, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz, t = l ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l)) : 0; return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); }
function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function intersects(a, b, c, d) {
  const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1], denominator = cross(rx, rz, sx, sz); if (Math.abs(denominator) < 1e-9) return false;
  const qx = c[0] - a[0], qz = c[1] - a[1], t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator;
  return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9;
}
function segmentDistance(a, b, c, d) { return intersects(a, b, c, d) ? 0 : Math.min(pointSegment(...a, c, d), pointSegment(...b, c, d), pointSegment(...c, a, b), pointSegment(...d, a, b)); }
export function twoTaikooPointInRoadCorridor(x, z, margin = .3, surfaceOnly = true) {
  for (const road of TWO_TAIKOO_CROSSING_ROADS) { if (surfaceOnly && road.flags & 4) continue; for (let i = 2; i < road.points.length; i += 2) if (pointSegment(x, z, [road.points[i - 2], road.points[i - 1]], [road.points[i], road.points[i + 1]]) < road.width * .5 + margin) return true; } return false;
}
export function twoTaikooRoadConflictAtLocal(x, z, margin = .6) {
  const p = twoTaikooLocalToWorld(x, z); for (const road of TWO_TAIKOO_CROSSING_ROADS) for (let i = 2; i < road.points.length; i += 2) if (pointSegment(p.x, p.z, [road.points[i - 2], road.points[i - 1]], [road.points[i], road.points[i + 1]]) < road.width * .5 + margin) return road; return null;
}
export function twoTaikooPodiumBayConflict(ring, edge, t0, t1, margin = .3) {
  const i = edge * 2, ax = ring[i] + (ring[i + 2] - ring[i]) * t0, az = ring[i + 1] + (ring[i + 3] - ring[i + 1]) * t0, bx = ring[i] + (ring[i + 2] - ring[i]) * t1, bz = ring[i + 1] + (ring[i + 3] - ring[i + 1]) * t1;
  const aw = twoTaikooLocalToWorld(ax, az), bw = twoTaikooLocalToWorld(bx, bz), a = [aw.x, aw.z], b = [bw.x, bw.z];
  for (const road of TWO_TAIKOO_CROSSING_ROADS) for (let j = 2; j < road.points.length; j += 2) { const c = [road.points[j - 2], road.points[j - 1]], d = [road.points[j], road.points[j + 1]]; if (segmentDistance(a, b, c, d) < road.width * .5 + margin) return road; } return null;
}
function inForecourt(frame, width, depth, x, z) { const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry), dx = x - frame.x, dz = z - frame.z, lx = cs * dx - sn * dz, lz = sn * dx + cs * dz; return Math.abs(lx) <= width * .5 && lz >= -1 && lz <= depth; }
export function isTwoTaikooEntranceForecourtPoint(x, z) { return inForecourt(TWO_TAIKOO_MAIN_ENTRANCE, TWO_TAIKOO_MAIN_FORECOURT_WIDTH, TWO_TAIKOO_MAIN_FORECOURT_DEPTH, x, z) && !twoTaikooPointInRoadCorridor(x, z, .3, true); }
export function isTwoTaikooPlazaPoint(x, z) { return !twoTaikooPointInRoadCorridor(x, z, .3, true) && (pointInFlatRing(TWO_TAIKOO_SITE.ring, x, z) || isTwoTaikooEntranceForecourtPoint(x, z)); }
export function twoTaikooGroundHeightAt(x, z, ground, grounds) { return isTwoTaikooPlazaPoint(x, z) ? grounds.plaza : ground; }
