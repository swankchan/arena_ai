// HK-B0016 Hopewell Centre: current OSM cylinder, two surveyed entrance nodes and separated published conventions.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';

function geometry(points) { return Object.freeze(points.map(([lon, lat]) => Object.freeze({ lon, lat }))); }
export const HOPEWELL_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-02',
  sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/88391069/full.json',
  type: 'way', id: 88391069, version: 11, timestamp: '2026-07-25T09:53:12Z', changeset: 186337064,
  user: 'owennson', uid: 1799954,
  tags: Object.freeze({
    "building": "office",
    "building:levels": "63",
    "building:min_level": "13",
    "height": "216",
    "layer": "2",
    "name": "合和中心 Hopewell Centre",
    "name:en": "Hopewell Centre",
    "name:zh": "合和中心"
  }),
  geometry: geometry([
    [114.1715707,22.2744655], [114.1716069,22.2744656], [114.1716426,22.2744711],
    [114.1716768,22.2744819], [114.1717087,22.2744976], [114.1717373,22.2745179],
    [114.1717621,22.2745422], [114.1717822,22.2745699], [114.1717973,22.2746002],
    [114.1718068,22.2746324], [114.1718107,22.2746655], [114.1718086,22.2746988],
    [114.1718009,22.2747313], [114.1717875,22.2747622], [114.1717690,22.2747907],
    [114.1717457,22.2748161], [114.1717193,22.2748370], [114.1716897,22.2748539],
    [114.1716552,22.2748670], [114.1716189,22.2748746], [114.1715829,22.2748764],
    [114.1715470,22.2748729], [114.1715122,22.2748641], [114.1714795,22.2748502],
    [114.1714495,22.2748315], [114.1714232,22.2748086], [114.1714012,22.2747820],
    [114.1713842,22.2747525], [114.1713713,22.2747158], [114.1713660,22.2746775],
    [114.1713664,22.2746559], [114.1713693,22.2746344], [114.1713747,22.2746134],
    [114.1713823,22.2745930], [114.1713921,22.2745737], [114.1714045,22.2745547],
    [114.1714178,22.2745385], [114.1714334,22.2745229], [114.1714648,22.2744995],
    [114.1715002,22.2744817], [114.1715349,22.2744709], [114.1715707,22.2744655]
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
const ring = projectRing(HOPEWELL_OSM_SOURCE), footprint = minimumAreaObb(ring);
const baseSite = Object.freeze({
  name: '合和中心 Hopewell Centre', englishName: 'Hopewell Centre', address: '皇后大道東183號 183 Queen’s Road East',
  osmType: 'way', osmId: HOPEWELL_OSM_SOURCE.id, source: HOPEWELL_OSM_SOURCE,
  ring, bounds: flatRingBounds(ring), ...footprint
});
export const HOPEWELL_SITE = Object.freeze({ ...baseSite, localRing: localRing(baseSite) });
export const HOPEWELL_TOWER_RING = closeRing(HOPEWELL_SITE.localRing);
export const HOPEWELL_PODIUM_RING = HOPEWELL_TOWER_RING;
export const HOPEWELL_CROWN_SCALE = 1.015;
export const HOPEWELL_CROWN_RING = closeRing(HOPEWELL_SITE.localRing.map((value) => value * HOPEWELL_CROWN_SCALE));

// OSM's 216 m and CTBUH's 222 m remain separate. The photographic lift/sign projection carries the latter;
// the 34 m podium, 50 office courses and crown-zone allocations are visual modelling controls, not surveyed levels.
export const HOPEWELL_OSM_HEIGHT = 216;
export const HOPEWELL_MAIN_ROOF = 216;
export const HOPEWELL_CTBUH_TO_TIP_HEIGHT = 222;
export const HOPEWELL_OSM_LEVELS = 63;
export const HOPEWELL_OSM_MIN_LEVEL = 13;
export const HOPEWELL_CTBUH_LEVELS = 64;
export const HOPEWELL_OFFICIAL_LEVELS = 66;
export const HOPEWELL_CTBUH_TOWER_GFA = 111000;
export const HOPEWELL_OFFICIAL_GFA_SQFT = 840000;
export const HOPEWELL_CONSTRUCTION_START_YEAR = 1977;
export const HOPEWELL_COMPLETED_YEAR = 1981;
export const HOPEWELL_PODIUM_HEIGHT = 34;
export const HOPEWELL_OFFICE_COURSES = 50;
export const HOPEWELL_OFFICE_COURSE_HEIGHT = 3;
export const HOPEWELL_OFFICE_TOP = HOPEWELL_PODIUM_HEIGHT + HOPEWELL_OFFICE_COURSES * HOPEWELL_OFFICE_COURSE_HEIGHT;
export const HOPEWELL_ROOF_DECK = 215.58;
export const HOPEWELL_COLLISION_BASE = -20;
export const HOPEWELL_POOL_RADIUS = 4.35;
export const HOPEWELL_BRONZE_ROOF_RING_OUTER_RADIUS = 8.6;
export const HOPEWELL_QRE_ESCALATOR_RISE = 2.4;
export function hopewellFloorY(course) {
  return HOPEWELL_PODIUM_HEIGHT + Math.max(0, Math.min(HOPEWELL_OFFICE_COURSES, course)) * HOPEWELL_OFFICE_COURSE_HEIGHT;
}
export function hopewellLocalToWorld(x, z) {
  const site = HOPEWELL_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return { x: site.x + cs * x + sn * z, z: site.z - sn * x + cs * z };
}
export function hopewellWorldToLocal(x, z) {
  const site = HOPEWELL_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry), dx = x - site.x, dz = z - site.z;
  return { x: dx * cs - dz * sn, z: dx * sn + dz * cs };
}
export function hopewellEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0;
  for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1;
  return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
export function hopewellFrameToWorld(frame, x, z) {
  const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry);
  return { x: frame.x + cs * x + sn * z, z: frame.z - sn * x + cs * z };
}
export function hopewellWorldToFrame(frame, x, z) {
  const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry), dx = x - frame.x, dz = z - frame.z;
  return { x: dx * cs - dz * sn, z: dx * sn + dz * cs };
}
function sourceFrame(vertex, sourceNode, levelRef, evidence) {
  const count = HOPEWELL_SITE.localRing.length / 2, before = hopewellEdgeOutward(HOPEWELL_TOWER_RING, (vertex + count - 1) % count);
  const after = hopewellEdgeOutward(HOPEWELL_TOWER_RING, vertex), localX = HOPEWELL_TOWER_RING[vertex * 2], localZ = HOPEWELL_TOWER_RING[vertex * 2 + 1];
  const p = hopewellLocalToWorld(localX, localZ), site = HOPEWELL_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const ax = cs * (before.nx + after.nx) + sn * (before.nz + after.nz);
  const az = -sn * (before.nx + after.nx) + cs * (before.nz + after.nz), length = Math.hypot(ax, az);
  const nx = ax / length, nz = az / length;
  return Object.freeze({ x: p.x, z: p.z, nx, nz, ry: Math.atan2(nx, nz), localX, localZ,
    localNx: (before.nx + after.nx) / Math.hypot(before.nx + after.nx, before.nz + after.nz),
    localNz: (before.nz + after.nz) / Math.hypot(before.nx + after.nx, before.nz + after.nz),
    sourceVertex: vertex, sourceNode, levelRef, evidence });
}
export const HOPEWELL_QRE_SOURCE_VERTEX = 29;
export const HOPEWELL_KENNEDY_SOURCE_VERTEX = 34;
export const HOPEWELL_LIFT_SOURCE_VERTEX = 0;
export const HOPEWELL_QRE_ENTRANCE = sourceFrame(29, 1026827584, '3',
  'OSM entrance/exit node 1026827584: access=yes, level=2, level:ref=3; modelled Queen’s Road East escalator lobby');
export const HOPEWELL_KENNEDY_ENTRANCE = sourceFrame(34, 12419988600, '17',
  'OSM entrance/exit node 12419988600: address 17 Kennedy Road, door=yes, level:ref=17; modelled hillside lobby');
export const HOPEWELL_EXTERNAL_LIFT = sourceFrame(0, null, null,
  'Photo-directed southern external observation-lift shaft; its exact shaft coordinate is not separately surveyed');
function frameRing(frame, halfWidth, back, front) {
  const result = [];
  for (const [x, z] of [[-halfWidth, back], [halfWidth, back], [halfWidth, front], [-halfWidth, front], [-halfWidth, back]]) {
    const p = hopewellFrameToWorld(frame, x, z); result.push(p.x, p.z);
  }
  return Object.freeze(result);
}
export const HOPEWELL_QRE_UPPER_FORECOURT_RING = frameRing(HOPEWELL_QRE_ENTRANCE, 6, -0.8, 1.3);
export const HOPEWELL_QRE_LOWER_FORECOURT_RING = frameRing(HOPEWELL_QRE_ENTRANCE, 6, 4.0, 6.0);
export const HOPEWELL_KENNEDY_FORECOURT_RING = frameRing(HOPEWELL_KENNEDY_ENTRANCE, 4, -0.6, 2.4);
export const HOPEWELL_LIFT_WORLD_RING = frameRing(HOPEWELL_EXTERNAL_LIFT, 2.1, -0.8, 3.0);
export const HOPEWELL_GROUND_SAMPLE = Object.freeze({ x: HOPEWELL_QRE_ENTRANCE.x, z: HOPEWELL_QRE_ENTRANCE.z });
export const HOPEWELL_KENNEDY_GROUND_SAMPLE = Object.freeze({ x: HOPEWELL_KENNEDY_ENTRANCE.x, z: HOPEWELL_KENNEDY_ENTRANCE.z });
export const HOPEWELL_GROUND_RINGS = Object.freeze([
  HOPEWELL_QRE_UPPER_FORECOURT_RING, HOPEWELL_QRE_LOWER_FORECOURT_RING, HOPEWELL_KENNEDY_FORECOURT_RING
]);
export function isHopewellPlazaPoint(x, z) { return HOPEWELL_GROUND_RINGS.some((groundRing) => pointInFlatRing(groundRing, x, z)); }
export function hopewellGroundHeightAt(x, z, ground, grounds) {
  let height = ground;
  if (pointInFlatRing(HOPEWELL_QRE_UPPER_FORECOURT_RING, x, z)) height = Math.max(height, grounds.qreUpper);
  if (pointInFlatRing(HOPEWELL_QRE_LOWER_FORECOURT_RING, x, z)) height = Math.max(height, grounds.qreLower);
  if (pointInFlatRing(HOPEWELL_KENNEDY_FORECOURT_RING, x, z)) height = Math.max(height, grounds.kennedy);
  const local = hopewellWorldToFrame(HOPEWELL_QRE_ENTRANCE, x, z);
  if (Math.abs(local.x) <= 2.15 && local.z >= 0.9 && local.z <= 4.8) {
    const t = (4.8 - local.z) / 3.9;
    // This narrow authored channel replaces the coarse DTM rather than letting a higher raster triangle bury the escalator.
    height = grounds.qreLower + t * (grounds.qreUpper - grounds.qreLower);
  }
  return height;
}
export function hopewellEdgeCollider(ring, edge, minY, maxY, depth = 0.8) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const world = hopewellLocalToWorld((ax + bx) * 0.5, (az + bz) * 0.5);
  const { ry } = hopewellEdgeOutward(ring, edge), worldRy = HOPEWELL_SITE.ry + ry;
  const w = Math.hypot(bx - ax, bz - az) + 0.06, d = depth;
  const cs = Math.cos(worldRy), sn = Math.sin(worldRy), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: world.x, z: world.z, w, d, ry: worldRy, minY, maxY,
    minX: world.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: world.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: world.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: world.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: world.x, cz: world.z, hx, hz, cs, sn } };
}
export function hopewellRingColliders(ring, minY = HOPEWELL_PODIUM_HEIGHT, maxY = HOPEWELL_MAIN_ROOF, depth = 0.8) {
  const result = [];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) result.push(hopewellEdgeCollider(ring, edge, minY, maxY, depth));
  return result;
}
