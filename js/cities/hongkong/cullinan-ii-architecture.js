// HK-B0012 The Cullinan II / South Tower: current OSM plan, tagged level-1 door and authored W Hotel arrival frame.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';

function geometry(points) { return Object.freeze(points.map(([lon, lat]) => Object.freeze({ lon, lat }))); }
export const CULLINAN_II_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-01',
  sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/25608721/full.json',
  type: 'way', id: 25608721, version: 21, timestamp: '2025-07-23T13:40:40Z', changeset: 169345401,
  user: 'Kovoschiz', uid: 6250193,
  tags: Object.freeze({
    addr: 'shared', 'addr:housename': '天璽 The Cullinan', 'addr:housename:en': 'The Cullinan',
    'addr:housename:zh': '天璽', 'addr:housenumber': '1', 'addr:street': '柯士甸道西 Austin Road West',
    'addr:street:en': 'Austin Road West', 'addr:street:zh': '柯士甸道西', building: 'apartments',
    'building:function': 'tower', 'building:levels': '68', 'building:min_level': '1', height: '270',
    hotel: 'separate', location: 'podium', name: '天璽II The Cullinan II', 'name:en': 'The Cullinan II',
    'name:zh': '天璽II', 'name:zh-Hans': '天玺II', 'name:zh-Hant': '天璽II', podium: 'bulk', ref: 'II', start_date: '2007'
  }),
  geometry: geometry([
    [114.1603311, 22.3046175], [114.1605363, 22.3050788], [114.1605935, 22.3051010],
    [114.1606174, 22.3050479], [114.1605917, 22.3049900], [114.1606314, 22.3049749],
    [114.1607474, 22.3050181], [114.1608833, 22.3050720], [114.1609078, 22.3050174],
    [114.1608033, 22.3049771], [114.1609166, 22.3049340], [114.1608909, 22.3048761],
    [114.1607948, 22.3046602], [114.1607114, 22.3044727], [114.1604519, 22.3045715],
    [114.1603311, 22.3046175]
  ])
});
export const CULLINAN_II_OSM_DOOR = Object.freeze({
  id: 10703681997, version: 2, timestamp: '2025-06-06T12:23:47Z', changeset: 167264368,
  lon: 114.1607948, lat: 22.3046602,
  tags: Object.freeze({ door: 'yes', entrance: 'yes', exit: 'yes', indoor: 'yes', level: '1', 'level:ref': '1' })
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
const ring = projectRing(CULLINAN_II_OSM_SOURCE), footprint = minimumAreaObb(ring);
const baseSite = Object.freeze({
  name: '天璽II The Cullinan II', englishName: 'The Cullinan II (South Tower)',
  address: '柯士甸道西1號 1 Austin Road West', osmType: 'way', osmId: CULLINAN_II_OSM_SOURCE.id,
  source: CULLINAN_II_OSM_SOURCE, ring, bounds: flatRingBounds(ring), ...footprint
});
export const CULLINAN_II_SITE = Object.freeze({ ...baseSite, localRing: localRing(baseSite) });
export const CULLINAN_II_TOWER_RING = closeRing(CULLINAN_II_SITE.localRing);
const doorWorld = project(CULLINAN_II_OSM_DOOR.lon, CULLINAN_II_OSM_DOOR.lat);
export const CULLINAN_II_DOOR_WORLD = Object.freeze({ x: doorWorld[0], z: doorWorld[1] });

// Source conventions remain separate; CTBUH's single-building 2008 date is not replaced by OSM start_date or secondary 2009 reports.
export const CULLINAN_II_OSM_HEIGHT = 270;
export const CULLINAN_II_OFFICIAL_APPROX_HEIGHT = 270;
export const CULLINAN_II_HEIGHT = 269.9;
export const CULLINAN_II_TO_TIP_HEIGHT = 269.9;
export const CULLINAN_II_OSM_LEVELS = 68;
export const CULLINAN_II_LEVELS = 68;
export const CULLINAN_II_BELOW_GROUND_LEVELS = 1;
export const CULLINAN_II_OSM_START_DATE = 2007;
export const CULLINAN_II_COMPLETED_YEAR = 2008;

// Photo-derived visual controls only; none is a surveyed roof, hotel-floor or podium engineering schedule.
export const CULLINAN_II_VISUAL_WALL_TOP = 253.6;
export const CULLINAN_II_PANEL_TARGET_WIDTH = 2.2;
export const CULLINAN_II_VISUAL_LOUVRE_LEVELS = Object.freeze([11, 35, 55]);
export const CULLINAN_II_ACCENT_LEVELS = Object.freeze([19, 37, 53]);
export const CULLINAN_II_PLAZA_TOP = 0.12;
export const CULLINAN_II_GLASS_BOX_HEIGHT = 40;
export const CULLINAN_II_GLASS_BOX_WIDTH = 22;
export const CULLINAN_II_GLASS_BOX_DEPTH = 8;
export const CULLINAN_II_GLASS_BOX_PROJECTION = 2;
export const CULLINAN_II_W_CANOPY_HEIGHT = 4.8;
export const CULLINAN_II_W_CANOPY_WIDTH = 26;
export const CULLINAN_II_W_CANOPY_FRONT = 3.4;
export const CULLINAN_II_CROWN_VERTEX_HEIGHTS = Object.freeze([
  262.4, 258.8, 255.2, 253.6, 254.8, 260.2, 263.4, 269.9,
  267.2, 258.2, 254.4, 255.2, 258.8, 269.9, 267.2
]);
export const CULLINAN_II_SIGNATURE_BLADE_VERTICES = Object.freeze([7, 13]);

export function cullinanIIFloorY(level) {
  const value = Math.max(0, Math.min(CULLINAN_II_LEVELS, level)), atriumCourses = 11;
  if (value <= atriumCourses) return value * CULLINAN_II_GLASS_BOX_HEIGHT / atriumCourses;
  return CULLINAN_II_GLASS_BOX_HEIGHT + (value - atriumCourses) * (CULLINAN_II_VISUAL_WALL_TOP - CULLINAN_II_GLASS_BOX_HEIGHT)
    / (CULLINAN_II_LEVELS - atriumCourses);
}
export function cullinanIILocalToWorld(x, z) {
  const site = CULLINAN_II_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return { x: site.x + cs * x + sn * z, z: site.z - sn * x + cs * z };
}
export function cullinanIIEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0;
  for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1;
  return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
function frameAtEdge(edge, evidence, offset = 0) {
  const source = CULLINAN_II_TOWER_RING, i = edge * 2;
  const x = (source[i] + source[i + 2]) * 0.5 + (source[i] - source[i + 2]) * offset / cullinanIIEdgeOutward(source, edge).length;
  const z = (source[i + 1] + source[i + 3]) * 0.5 + (source[i + 1] - source[i + 3]) * offset / cullinanIIEdgeOutward(source, edge).length;
  const world = cullinanIILocalToWorld(x, z), normal = cullinanIIEdgeOutward(source, edge);
  const cs = Math.cos(CULLINAN_II_SITE.ry), sn = Math.sin(CULLINAN_II_SITE.ry);
  const nx = cs * normal.nx + sn * normal.nz, nz = -sn * normal.nx + cs * normal.nz;
  return Object.freeze({ edge, x: world.x, z: world.z, nx, nz, ry: Math.atan2(nx, nz), evidence });
}

// W&O places both 40 m entrance boxes beside the west elevated-road forecourts; the south tower box belongs to W Hotel.
// The tagged OSM level-1 indoor door is on edge 12 and is preserved separately, not misrepresented as the W atrium centre.
export const CULLINAN_II_W_ATRIUM_EDGE = 0;
export const CULLINAN_II_W_ATRIUM = frameAtEdge(CULLINAN_II_W_ATRIUM_EDGE,
  'Wong & Ouyang west elevated-road forecourt and south-tower W Hotel 40 m glass atrium with landscaped guest drop-off');
export const CULLINAN_II_OSM_DOOR_FRAME = Object.freeze({ ...frameAtEdge(12, 'OSM tagged level-1 indoor entrance node 10703681997'),
  x: CULLINAN_II_DOOR_WORLD.x, z: CULLINAN_II_DOOR_WORLD.z });
export function cullinanIIFrameToWorld(frame, x, z) {
  const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry);
  return { x: frame.x + cs * x + sn * z, z: frame.z - sn * x + cs * z };
}
function frameRing(frame, halfWidth, back, front) {
  const result = [];
  for (const [x, z] of [[-halfWidth, back], [halfWidth, back], [halfWidth, front], [-halfWidth, front], [-halfWidth, back]]) {
    const p = cullinanIIFrameToWorld(frame, x, z); result.push(p.x, p.z);
  }
  return Object.freeze(result);
}
export const CULLINAN_II_W_FORECOURT_RING = frameRing(CULLINAN_II_W_ATRIUM, 13, -3.2, 3.6);
export const CULLINAN_II_GROUND_RINGS = Object.freeze([CULLINAN_II_SITE.ring, CULLINAN_II_W_FORECOURT_RING]);
export function isCullinanIIPlazaPoint(x, z) { return CULLINAN_II_GROUND_RINGS.some((groundRing) => pointInFlatRing(groundRing, x, z)); }

export function cullinanIIEdgeCollider(ring, edge, t0, t1, minY, maxY, depth = 0.8) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0;
  const x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
  const world = cullinanIILocalToWorld((x0 + x1) * 0.5, (z0 + z1) * 0.5);
  const { ry } = cullinanIIEdgeOutward(ring, edge), worldRy = CULLINAN_II_SITE.ry + ry;
  const w = Math.hypot(x1 - x0, z1 - z0) + 0.08, d = depth;
  const cs = Math.cos(worldRy), sn = Math.sin(worldRy), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: world.x, z: world.z, w, d, ry: worldRy, minY, maxY,
    minX: world.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: world.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: world.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: world.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: world.x, cz: world.z, hx, hz, cs, sn } };
}
export function cullinanIIRingColliders(ring, minY, maxY, depth = 0.8, skippedEdges = []) {
  const skipped = new Set(skippedEdges), result = [];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) if (!skipped.has(edge)) result.push(cullinanIIEdgeCollider(ring, edge, 0, 1, minY, maxY, depth));
  return result;
}
