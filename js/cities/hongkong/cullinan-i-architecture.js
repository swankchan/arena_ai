// HK-B0011 The Cullinan I / North Tower: source outline, separate height conventions and authored arrival frames.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';

function geometry(points) { return Object.freeze(points.map(([lon, lat]) => Object.freeze({ lon, lat }))); }
export const CULLINAN_I_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-01',
  sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/200726114/full.json',
  type: 'way', id: 200726114, version: 14, timestamp: '2025-07-14T11:07:46Z', changeset: 168911077,
  tags: Object.freeze({
    addr: 'shared', 'addr:housename': '天璽 The Cullinan', 'addr:housename:en': 'The Cullinan',
    'addr:housename:zh': '天璽', 'addr:housenumber': '1', 'addr:street': '柯士甸道西 Austin Road West',
    'addr:street:en': 'Austin Road West', 'addr:street:zh': '柯士甸道西', building: 'apartments',
    'building:function': 'tower', 'building:levels': '68', 'building:min_level': '1', height: '270',
    location: 'podium', name: '天璽I The Cullinan I', 'name:en': 'The Cullinan I', 'name:yue': '天璽I',
    'name:zh': '天璽I', 'name:zh-Hans': '天玺I', 'name:zh-Hant': '天璽I', podium: 'bulk', ref: 'I', start_date: '2007'
  }),
  geometry: geometry([
    [114.1609306, 22.3059650], [114.1607256, 22.3055041], [114.1607503, 22.3054507],
    [114.1608077, 22.3054729], [114.1608335, 22.3055308], [114.1608731, 22.3055156],
    [114.1609781, 22.3052826], [114.1610371, 22.3053054], [114.1609935, 22.3054021],
    [114.1611059, 22.3053593], [114.1611316, 22.3054172], [114.1613109, 22.3058202],
    [114.1612557, 22.3058412], [114.1610524, 22.3059186], [114.1609306, 22.3059650]
  ])
});

const KX = 103056.81753522092, KY = 110734.09626824585;
function projectRing(source) {
  return Object.freeze(source.geometry.flatMap(({ lon, lat }) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY]));
}
function localRing(site) {
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry), result = [];
  for (let i = 0; i + 3 < site.ring.length; i += 2) {
    const dx = site.ring[i] - site.x, dz = site.ring[i + 1] - site.z;
    result.push(dx * cs - dz * sn, dx * sn + dz * cs);
  }
  return Object.freeze(result);
}
function closeRing(points) { return Object.freeze([...points, points[0], points[1]]); }
const ring = projectRing(CULLINAN_I_OSM_SOURCE), footprint = minimumAreaObb(ring);
const baseSite = Object.freeze({
  name: '天璽I The Cullinan I', englishName: 'The Cullinan I (North Tower)',
  address: '柯士甸道西1號 1 Austin Road West', osmType: 'way', osmId: CULLINAN_I_OSM_SOURCE.id,
  source: CULLINAN_I_OSM_SOURCE, ring, bounds: flatRingBounds(ring), ...footprint
});
export const CULLINAN_I_SITE = Object.freeze({ ...baseSite, localRing: localRing(baseSite) });
export const CULLINAN_I_TOWER_RING = closeRing(CULLINAN_I_SITE.localRing);

// These are deliberately separate source conventions, not averaged or rounded into one specification.
export const CULLINAN_I_OSM_HEIGHT = 270;
export const CULLINAN_I_OFFICIAL_APPROX_HEIGHT = 270; // Wong & Ouyang describes the twin towers as 270 m.
export const CULLINAN_I_HEIGHT = 269.9; // CTBUH architectural.
export const CULLINAN_I_TO_TIP_HEIGHT = 269.9; // CTBUH to-tip; no extra invented mast.
export const CULLINAN_I_OSM_LEVELS = 68;
export const CULLINAN_I_LEVELS = 68; // CTBUH above-ground convention used for visual courses.
export const CULLINAN_I_BELOW_GROUND_LEVELS = 1;
export const CULLINAN_I_OSM_START_DATE = 2007;
export const CULLINAN_I_COMPLETED_YEAR = 2008; // CTBUH single-building convention, not OSM start_date.

// Photo-derived visual controls. None is represented as a surveyed roof, podium or MEP schedule.
export const CULLINAN_I_VISUAL_WALL_TOP = 253.6;
export const CULLINAN_I_PANEL_TARGET_WIDTH = 2.2;
export const CULLINAN_I_VISUAL_LOUVRE_LEVELS = Object.freeze([12, 35, 55]);
export const CULLINAN_I_ACCENT_LEVELS = Object.freeze([17, 34, 51]);
export const CULLINAN_I_PLAZA_TOP = 0.12;
export const CULLINAN_I_GLASS_BOX_HEIGHT = 40; // Wong & Ouyang's published entrance-box height.
export const CULLINAN_I_GLASS_BOX_WIDTH = 20;
export const CULLINAN_I_GLASS_BOX_DEPTH = 7.2;
export const CULLINAN_I_GLASS_BOX_PROJECTION = 3.2;
export const CULLINAN_I_DROP_OFF_HEIGHT = 9;
export const CULLINAN_I_CROWN_VERTEX_HEIGHTS = Object.freeze([
  269.9, 258.4, 255.2, 253.6, 254.8, 260.2, 263.4,
  258.8, 254.4, 258.2, 262.4, 269.9, 267.2, 269.9
]);
export const CULLINAN_I_SIGNATURE_BLADE_VERTICES = Object.freeze([0, 11]);

export function cullinanIFloorY(level) {
  const value = Math.max(0, Math.min(CULLINAN_I_LEVELS, level)), atriumCourses = 11;
  if (value <= atriumCourses) return value * CULLINAN_I_GLASS_BOX_HEIGHT / atriumCourses;
  return CULLINAN_I_GLASS_BOX_HEIGHT + (value - atriumCourses) * (CULLINAN_I_VISUAL_WALL_TOP - CULLINAN_I_GLASS_BOX_HEIGHT)
    / (CULLINAN_I_LEVELS - atriumCourses);
}
export function cullinanILocalToWorld(x, z) {
  const site = CULLINAN_I_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return { x: site.x + cs * x + sn * z, z: site.z - sn * x + cs * z };
}
export function cullinanIEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0;
  for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1;
  return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
function frameAtEdge(edge, evidence) {
  const source = CULLINAN_I_TOWER_RING, i = edge * 2;
  const x = (source[i] + source[i + 2]) * 0.5, z = (source[i + 1] + source[i + 3]) * 0.5;
  const world = cullinanILocalToWorld(x, z), normal = cullinanIEdgeOutward(source, edge);
  const cs = Math.cos(CULLINAN_I_SITE.ry), sn = Math.sin(CULLINAN_I_SITE.ry);
  const nx = cs * normal.nx + sn * normal.nz, nz = -sn * normal.nx + cs * normal.nz;
  return Object.freeze({ edge, x: world.x, z: world.z, nx, nz, ry: Math.atan2(nx, nz), evidence });
}

// W&O places the north-tower Serviced Apartments' 40 m glass box beside the west elevated-road forecourt.
// Source edge 0 faces that Nga Cheung Road interface. The way has no tagged door, so this is not a surveyed node.
export const CULLINAN_I_ENTRANCE_EDGE = 0;
export const CULLINAN_I_ENTRANCE = frameAtEdge(CULLINAN_I_ENTRANCE_EDGE,
  'Wong & Ouyang west elevated-road forecourt and north-tower Serviced Apartments entrance; no OSM door tag');
// The separate covered arrival is on the south/front-between-towers side, not mislabeled as the W Hotel entrance.
export const CULLINAN_I_DROP_OFF_EDGE = 5;
export const CULLINAN_I_DROP_OFF = frameAtEdge(CULLINAN_I_DROP_OFF_EDGE,
  'Wong & Ouyang landscaped-podium double-height covered drop-off between the towers; visual ground-datum placement');

export function cullinanIFrameToWorld(frame, x, z) {
  const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry);
  return { x: frame.x + cs * x + sn * z, z: frame.z - sn * x + cs * z };
}
function frameRing(frame, halfWidth, back, front) {
  const result = [];
  for (const [x, z] of [[-halfWidth, back], [halfWidth, back], [halfWidth, front], [-halfWidth, front], [-halfWidth, back]]) {
    const p = cullinanIFrameToWorld(frame, x, z); result.push(p.x, p.z);
  }
  return Object.freeze(result);
}
export const CULLINAN_I_ENTRY_FORECOURT_RING = frameRing(CULLINAN_I_ENTRANCE, 14, -4.2, CULLINAN_I_GLASS_BOX_PROJECTION);
export const CULLINAN_I_DROP_OFF_FORECOURT_RING = frameRing(CULLINAN_I_DROP_OFF, 13, -0.5, 7.2);
export const CULLINAN_I_GROUND_RINGS = Object.freeze([
  CULLINAN_I_SITE.ring, CULLINAN_I_ENTRY_FORECOURT_RING, CULLINAN_I_DROP_OFF_FORECOURT_RING
]);
export function isCullinanIPlazaPoint(x, z) {
  return CULLINAN_I_GROUND_RINGS.some((groundRing) => pointInFlatRing(groundRing, x, z));
}

export function cullinanIEdgeCollider(ring, edge, t0, t1, minY, maxY, depth = 0.8) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0;
  const x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
  const world = cullinanILocalToWorld((x0 + x1) * 0.5, (z0 + z1) * 0.5);
  const { ry } = cullinanIEdgeOutward(ring, edge), worldRy = CULLINAN_I_SITE.ry + ry;
  const w = Math.hypot(x1 - x0, z1 - z0) + 0.08, d = depth;
  const cs = Math.cos(worldRy), sn = Math.sin(worldRy), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: world.x, z: world.z, w, d, ry: worldRy, minY, maxY,
    minX: world.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: world.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: world.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: world.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: world.x, cz: world.z, hx, hz, cs, sn } };
}
export function cullinanIRingColliders(ring, minY, maxY, depth = 0.8, skippedEdges = []) {
  const skipped = new Set(skippedEdges), result = [];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    if (!skipped.has(edge)) result.push(cullinanIEdgeCollider(ring, edge, 0, 1, minY, maxY, depth));
  }
  return result;
}
