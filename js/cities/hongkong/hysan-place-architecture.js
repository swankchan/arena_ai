// HK-B0026 Hysan Place: exact OSM commercial-building ring, source entrances and separate height conventions.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';

const geometry = (rows) => Object.freeze(rows.map(([id, lon, lat]) => Object.freeze({ id, lon, lat })));
export const HYSAN_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-03',
  sourceTimestamp: '2025-08-23T08:29:32Z',
  sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/755914808/full.json',
  type: 'way', id: 755914808, version: 4,
  tags: Object.freeze({
    addr: 'separate', 'addr:housename': '希慎廣場 Hysan Place', 'addr:housename:en': 'Hysan Place',
    'addr:housename:zh': '希慎廣場', 'addr:housenumber': '500',
    'addr:street': '軒尼詩道 Hennessy Road', 'addr:street:en': 'Hennessy Road',
    'addr:street:zh': '軒尼詩道', building: 'commercial', 'building:levels': '38',
    'building:levels:underground': '4', height: '197', mall: 'yes',
    name: '希慎廣場 Hysan Place', 'name:en': 'Hysan Place', 'name:zh': '希慎廣場',
    wikidata: 'Q5962277', wikipedia: 'en:Hysan Place'
  }),
  geometry: geometry([
    [7060156474, 114.1833552, 22.2799680], [7060156475, 114.1833443, 22.2799391],
    [7060156477, 114.1833841, 22.2798505], [7060156478, 114.1834114, 22.2798420],
    [7060156468, 114.1834510, 22.2797263], [1822893917, 114.1834632, 22.2796886],
    [1822893927, 114.1835425, 22.2796916], [1966250272, 114.1835416, 22.2796539],
    [1822893914, 114.1835408, 22.2796223], [1822893910, 114.1834902, 22.2796065],
    [1822893904, 114.1835724, 22.2794047], [1822893906, 114.1838566, 22.2795119],
    [1822893912, 114.1838834, 22.2796071], [1828515180, 114.1839318, 22.2795905],
    [1828515179, 114.1839618, 22.2795881], [7060156469, 114.1839760, 22.2795937],
    [1828515181, 114.1839926, 22.2796003], [1828515183, 114.1840164, 22.2796182],
    [1828515184, 114.1840296, 22.2796362], [1828515182, 114.1841107, 22.2796044],
    [1828515186, 114.1842956, 22.2796786], [7060182527, 114.1840897, 22.2799718],
    [1822893935, 114.1840821, 22.2799826], [1822893934, 114.1840311, 22.2799726],
    [1822893937, 114.1840299, 22.2799964], [7060156467, 114.1839740, 22.2799942],
    [1822893933, 114.1834440, 22.2799734], [7060156474, 114.1833552, 22.2799680]
  ])
});

const KX = 103056.81753522092, KY = 110734.09626824585;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];
const worldRing = Object.freeze(HYSAN_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat)));
const footprint = minimumAreaObb(worldRing);
let signedArea = 0;
for (let i = 0; i + 3 < worldRing.length; i += 2) signedArea += worldRing[i] * worldRing[i + 3] - worldRing[i + 2] * worldRing[i + 1];
export const HYSAN_RING_AREA = Math.abs(signedArea * 0.5);
export const HYSAN_SITE = Object.freeze({
  name: '希慎廣場 Hysan Place', englishName: 'Hysan Place',
  address: '軒尼詩道500號 500 Hennessy Road', osmType: 'way', osmId: HYSAN_OSM_SOURCE.id,
  source: HYSAN_OSM_SOURCE, ring: worldRing, bounds: flatRingBounds(worldRing), ...footprint
});
export function hysanLocalToWorld(x, z) {
  const s = HYSAN_SITE, cs = Math.cos(s.ry), sn = Math.sin(s.ry);
  return { x: s.x + cs * x + sn * z, z: s.z - sn * x + cs * z };
}
export function hysanWorldToLocal(x, z) {
  const s = HYSAN_SITE, cs = Math.cos(s.ry), sn = Math.sin(s.ry), dx = x - s.x, dz = z - s.z;
  return { x: dx * cs - dz * sn, z: dx * sn + dz * cs };
}
export const HYSAN_LOCAL_RING = Object.freeze(worldRing.flatMap((value, index, array) => {
  if (index % 2) return [];
  const p = hysanWorldToLocal(value, array[index + 1]);
  return [p.x, p.z];
}));
export const HYSAN_GROUND_SAMPLE = Object.freeze({ x: HYSAN_SITE.x, z: HYSAN_SITE.z });

// OSM and CTBUH use different height and floor conventions. The rendered architectural top uses CTBUH 204.1 m.
export const HYSAN_OSM_HEIGHT = 197, HYSAN_CTBUH_HEIGHT = 204.1, HYSAN_HEIGHT = 204.1;
export const HYSAN_TO_TIP_HEIGHT = 204.1, HYSAN_OCCUPIED_HEIGHT = 190.1;
export const HYSAN_OSM_LEVELS = 38, HYSAN_CTBUH_LEVELS = 36, HYSAN_BELOW_GROUND_LEVELS = 4;
export const HYSAN_COMPLETION_YEAR = 2012, HYSAN_CTBUH_GFA = 66511, HYSAN_KPF_GFA = 66600;
export const HYSAN_ARCHITECT = 'Kohn Pedersen Fox Associates';
export const HYSAN_ASSOCIATE_ARCHITECT = 'Dennis Lau & Ng Chun Man Architects and Engineers';
export const HYSAN_RETAIL_INTERIOR_ARCHITECT = 'Benoy';
export const HYSAN_CONTRACTOR = 'Gammon Construction Limited';

export const HYSAN_PLAZA_TOP = 0.12, HYSAN_STREET_HEIGHT = 8;
export const HYSAN_PANEL_TARGET_WIDTH = 1.55, HYSAN_PODIUM_BAY_WIDTH = 3.1;
export const HYSAN_GARDEN_OF_EDEN = Object.freeze({ bottom: 19.2, top: 24, sourceLevel: '4/F' });
export const HYSAN_RETAIL_SKY_GARDEN = Object.freeze({ bottom: 42, top: 54 });
export const HYSAN_OFFICE_SKY_GARDEN = Object.freeze({ bottom: 136, top: 148 });
export const HYSAN_ROAD_VEHICLE_CLEARANCE = 4.7;

function transformedRing(scale, dx, dz) {
  return Object.freeze(HYSAN_LOCAL_RING.map((value, index) => value * scale + (index % 2 ? dz : dx)));
}
function volume(id, scale, dx, dz, y0, y1, courses) {
  return Object.freeze({ id, scale, dx, dz, y0, y1, courses, ring: transformedRing(scale, dx, dz) });
}
// Upper-floor outlines are photo-directed visual reconstructions, not claimed as surveyed OSM floor plans.
// The 36 visual courses include the street course; the three open garden intervals are not extra occupied floors.
export const HYSAN_LOWER_RETAIL = volume('lower-retail', 1, 0, 0, 8, 19.2, 3);
export const HYSAN_MIDDLE_RETAIL = volume('middle-retail', 0.88, 1, 1, 24, 42, 4);
export const HYSAN_UPPER_RETAIL = volume('upper-retail', 0.82, 3.2, -1.5, 54, 88, 8);
export const HYSAN_LOWER_OFFICE = volume('lower-office', 0.68, 7, 3, 88, 136, 10);
export const HYSAN_UPPER_OFFICE = volume('upper-office', 0.61, 9, 4, 148, HYSAN_OCCUPIED_HEIGHT, 10);
export const HYSAN_VOLUMES = Object.freeze([
  HYSAN_LOWER_RETAIL, HYSAN_MIDDLE_RETAIL, HYSAN_UPPER_RETAIL, HYSAN_LOWER_OFFICE, HYSAN_UPPER_OFFICE
]);
export const HYSAN_VISUAL_COURSES = 1 + HYSAN_VOLUMES.reduce((sum, item) => sum + item.courses, 0);

export function hysanEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0;
  for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1;
  return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
export function hysanFrameToWorld(frame, x, z) {
  const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry);
  return { x: frame.x + cs * x + sn * z, z: frame.z - sn * x + cs * z };
}
function sourceFrame(sourceEdge, name, evidence) {
  const node = HYSAN_OSM_SOURCE.geometry[sourceEdge], [x, z] = project(node.lon, node.lat);
  const local = hysanWorldToLocal(x, z), edge = hysanEdgeOutward(HYSAN_LOCAL_RING, sourceEdge);
  const cs = Math.cos(HYSAN_SITE.ry), sn = Math.sin(HYSAN_SITE.ry);
  const nx = cs * edge.nx + sn * edge.nz, nz = -sn * edge.nx + cs * edge.nz;
  return Object.freeze({
    nodeId: node.id, sourceEdge, localX: local.x, localZ: local.z, x, z, nx, nz,
    ry: Math.atan2(nx, nz), name, evidence
  });
}
export const HYSAN_MAIN_ENTRANCE = sourceFrame(25, 'Hysan Place Hennessy Road main mall entrance',
  'OSM node 7060156467 entrance=main, door=yes; exterior photographs show the Hysan Place sign, recessed glazing and express escalators.');
export const HYSAN_WEST_ENTRANCE = sourceFrame(4, 'Hysan Place secondary west entrance / office lobby',
  'OSM node 7060156468 entrance=yes, door=yes; office-lobby photographs show limestone walls, a revolving glass door and bilingual Hysan Place lettering. The office use is photo-directed, not an OSM tag.');
export const HYSAN_SOUTH_ENTRANCE = sourceFrame(15, 'Hysan Place secondary south mall entrance',
  'OSM node 7060156469 entrance=yes, door=yes.');
export const HYSAN_PARKING_ENTRANCE = sourceFrame(7, 'Hysan Place underground parking entrance',
  'OSM node 1966250272 amenity=parking_entrance, entrance=yes, parking=underground; the generated service road remains drivable.');
export const HYSAN_F2_SUBWAY_SOURCE = Object.freeze({
  type: 'node', id: 7060182527, version: 2, timestamp: '2025-02-19T02:30:15Z',
  tags: Object.freeze({ door: 'no', entrance: 'yes', level: '-1', name: "渣甸坊 Jardine's Crescent",
    railway: 'subway_entrance', ref: 'F2', wheelchair: 'no' })
});
export const HYSAN_MAIN_ENTRANCE_GROUND_SAMPLE = Object.freeze({ x: HYSAN_MAIN_ENTRANCE.x, z: HYSAN_MAIN_ENTRANCE.z });
export const HYSAN_MAIN_FORECOURT_WIDTH = 15, HYSAN_MAIN_FORECOURT_DEPTH = 5.5;
export const HYSAN_WEST_FORECOURT_WIDTH = 10, HYSAN_WEST_FORECOURT_DEPTH = 4.2;

export function hysanLocalCollider(x, z, w, d, minY, maxY, ry = HYSAN_SITE.ry) {
  const p = hysanLocalToWorld(x, z), cs = Math.cos(ry), sn = Math.sin(ry), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: p.x, z: p.z, w, d, ry, minY, maxY,
    minX: p.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: p.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: p.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: p.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: p.x, cz: p.z, hx, hz, cs, sn } };
}
export function hysanEdgeCollider(ring, edge, minY, maxY, depth = 0.68) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const { ry, length } = hysanEdgeOutward(ring, edge);
  return hysanLocalCollider((ax + bx) * 0.5, (az + bz) * 0.5, length + 0.03, depth, minY, maxY, HYSAN_SITE.ry + ry);
}
export function hysanRingColliders(ring, minY, maxY, depth = 0.68) {
  const out = [];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) out.push(hysanEdgeCollider(ring, edge, minY, maxY, depth));
  return out;
}
export function hysanSegmentCollider(ring, edge, t0, t1, minY, maxY, depth = 0.42) {
  const i = edge * 2, tm = (t0 + t1) * 0.5, { ry, length } = hysanEdgeOutward(ring, edge);
  const x = ring[i] + (ring[i + 2] - ring[i]) * tm, z = ring[i + 1] + (ring[i + 3] - ring[i + 1]) * tm;
  return hysanLocalCollider(x, z, length * (t1 - t0), depth, minY, maxY, HYSAN_SITE.ry + ry);
}
export function hysanFrameCollider(frame, x, z, w, d, minY, maxY, base = 0) {
  const p = hysanFrameToWorld(frame, x, z), ry = frame.ry, cs = Math.cos(ry), sn = Math.sin(ry), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: p.x, z: p.z, w, d, ry, minY: minY + base, maxY: maxY + base,
    minX: p.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: p.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: p.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: p.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: p.x, cz: p.z, hx, hz, cs, sn } };
}

// Complete generated-record signature, not an OSM way ID. The parking-access carriageway stays in place.
export const HYSAN_CROSSING_ROADS = Object.freeze([
  Object.freeze({ recordIndex: 44763, name: '', width: 8.4, flags: 0,
    points: Object.freeze([2458.8, 253, 2467.3, 248.7]) })
]);
function pointSegment(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz;
  const t = l ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l)) : 0;
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function intersects(a, b, c, d) {
  const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1];
  const denominator = cross(rx, rz, sx, sz); if (Math.abs(denominator) < 1e-9) return false;
  const qx = c[0] - a[0], qz = c[1] - a[1];
  const t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator;
  return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9;
}
function segmentDistance(a, b, c, d) {
  return intersects(a, b, c, d) ? 0 : Math.min(pointSegment(...a, c, d), pointSegment(...b, c, d),
    pointSegment(...c, a, b), pointSegment(...d, a, b));
}
export function hysanPointInRoadCorridor(x, z, margin = 0.35) {
  for (const road of HYSAN_CROSSING_ROADS) for (let i = 2; i < road.points.length; i += 2) {
    const a = [road.points[i - 2], road.points[i - 1]], b = [road.points[i], road.points[i + 1]];
    if (pointSegment(x, z, a, b) < road.width * 0.5 + margin) return true;
  }
  return false;
}
export function hysanRoadConflictAtLocal(x, z, margin = 0.65) {
  const p = hysanLocalToWorld(x, z);
  for (const road of HYSAN_CROSSING_ROADS) for (let i = 2; i < road.points.length; i += 2) {
    const a = [road.points[i - 2], road.points[i - 1]], b = [road.points[i], road.points[i + 1]];
    if (pointSegment(p.x, p.z, a, b) < road.width * 0.5 + margin) return road;
  }
  return null;
}
export function hysanPodiumBayConflict(ring, edge, t0, t1, margin = 0.35) {
  const i = edge * 2, ax = ring[i] + (ring[i + 2] - ring[i]) * t0, az = ring[i + 1] + (ring[i + 3] - ring[i + 1]) * t0;
  const bx = ring[i] + (ring[i + 2] - ring[i]) * t1, bz = ring[i + 1] + (ring[i + 3] - ring[i + 1]) * t1;
  const aw = hysanLocalToWorld(ax, az), bw = hysanLocalToWorld(bx, bz), a = [aw.x, aw.z], b = [bw.x, bw.z];
  for (const road of HYSAN_CROSSING_ROADS) for (let j = 2; j < road.points.length; j += 2) {
    const c = [road.points[j - 2], road.points[j - 1]], d = [road.points[j], road.points[j + 1]];
    if (segmentDistance(a, b, c, d) < road.width * 0.5 + margin) return road;
  }
  return null;
}
function inForecourt(frame, width, depth, x, z) {
  const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry), dx = x - frame.x, dz = z - frame.z;
  const lx = cs * dx - sn * dz, lz = sn * dx + cs * dz;
  return Math.abs(lx) <= width * 0.5 && lz >= -1 && lz <= depth;
}
export function isHysanEntranceForecourtPoint(x, z) {
  if (hysanPointInRoadCorridor(x, z)) return false;
  return inForecourt(HYSAN_MAIN_ENTRANCE, HYSAN_MAIN_FORECOURT_WIDTH, HYSAN_MAIN_FORECOURT_DEPTH, x, z)
    || inForecourt(HYSAN_WEST_ENTRANCE, HYSAN_WEST_FORECOURT_WIDTH, HYSAN_WEST_FORECOURT_DEPTH, x, z);
}
export function isHysanPlazaPoint(x, z) {
  if (hysanPointInRoadCorridor(x, z)) return false;
  return pointInFlatRing(HYSAN_SITE.ring, x, z) || isHysanEntranceForecourtPoint(x, z);
}
export function hysanGroundHeightAt(x, z, ground, grounds) {
  return isHysanPlazaPoint(x, z) ? grounds.plaza : ground;
}
