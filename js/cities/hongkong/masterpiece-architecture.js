// HK-B0013 The Masterpiece: current OSM tower plan, separate published heights and authored Hanoi Road entrance frame.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';

function geometry(points) { return Object.freeze(points.map(([lon, lat]) => Object.freeze({ lon, lat }))); }
export const MASTERPIECE_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-01',
  sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/124697429/full.json',
  type: 'way', id: 124697429, version: 6, timestamp: '2024-04-18T09:17:53Z', changeset: 150164286,
  user: 'Wright One', uid: 261189,
  tags: Object.freeze({
    'addr:housename': 'K11', 'addr:housename:en': 'K11', building: 'apartments',
    'building:levels': '64', 'building:min_level': '8', height: '261', hotel: 'separate',
    layer: '2', location: 'podium', name: '名鑄 The Masterpiece', 'name:en': 'The Masterpiece',
    'name:zh': '名鑄', residence: 'urban', wikidata: 'Q1983016',
    wikimedia_commons: 'Category:The Masterpiece, Hong Kong', wikipedia: 'zh:名鑄'
  }),
  geometry: geometry([
    [114.1738010, 22.2974392], [114.1738282, 22.2974571], [114.1739918, 22.2973203],
    [114.1740065, 22.2973101], [114.1740181, 22.2973043], [114.1740306, 22.2972999],
    [114.1740477, 22.2972974], [114.1740636, 22.2972971], [114.1740804, 22.2972997],
    [114.1740954, 22.2973045], [114.1741105, 22.2973127], [114.1741225, 22.2973220],
    [114.1741343, 22.2973348], [114.1741432, 22.2973486], [114.1741486, 22.2973632],
    [114.1741514, 22.2973821], [114.1741501, 22.2974011], [114.1741455, 22.2974160],
    [114.1741386, 22.2974298], [114.1741304, 22.2974410], [114.1741195, 22.2974520],
    [114.1739558, 22.2975890], [114.1739691, 22.2976115], [114.1739273, 22.2976601],
    [114.1738706, 22.2976949], [114.1738474, 22.2976798], [114.1736865, 22.2978146],
    [114.1736706, 22.2978257], [114.1736502, 22.2978352], [114.1736252, 22.2978402],
    [114.1736053, 22.2978396], [114.1735852, 22.2978349], [114.1735694, 22.2978278],
    [114.1735554, 22.2978181], [114.1735430, 22.2978044], [114.1735322, 22.2977889],
    [114.1735257, 22.2977699], [114.1735240, 22.2977490], [114.1735269, 22.2977298],
    [114.1735346, 22.2977110], [114.1735444, 22.2976961], [114.1735581, 22.2976829],
    [114.1737193, 22.2975481], [114.1737034, 22.2975205], [114.1738010, 22.2974392]
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
const ring = projectRing(MASTERPIECE_OSM_SOURCE), footprint = minimumAreaObb(ring);
const baseSite = Object.freeze({
  name: '名鑄 The Masterpiece', englishName: 'The Masterpiece', address: '河內道18號 18 Hanoi Road',
  osmType: 'way', osmId: MASTERPIECE_OSM_SOURCE.id, source: MASTERPIECE_OSM_SOURCE,
  ring, bounds: flatRingBounds(ring), ...footprint
});
export const MASTERPIECE_SITE = Object.freeze({ ...baseSite, localRing: localRing(baseSite) });
export const MASTERPIECE_TOWER_RING = closeRing(MASTERPIECE_SITE.localRing);

// OSM and CTBUH conventions are deliberately not averaged or substituted for one another.
export const MASTERPIECE_OSM_HEIGHT = 261;
export const MASTERPIECE_HEIGHT = 257;
export const MASTERPIECE_TO_TIP_HEIGHT = 257;
export const MASTERPIECE_OCCUPIED_HEIGHT = 241.7;
export const MASTERPIECE_OSM_LEVELS = 64;
export const MASTERPIECE_LEVELS = 64;
export const MASTERPIECE_BELOW_GROUND_LEVELS = 4;
export const MASTERPIECE_APARTMENTS = 345;
export const MASTERPIECE_HOTEL_ROOMS = 384;
export const MASTERPIECE_CONSTRUCTION_START_YEAR = 2000;
export const MASTERPIECE_COMPLETED_YEAR = 2009;
// Secondary Wikipedia infobox conventions, preserved separately rather than used to resize the CTBUH-based model.
export const MASTERPIECE_WIKIPEDIA_SPIRE_HEIGHT = 261;
export const MASTERPIECE_WIKIPEDIA_ROOF_HEIGHT = 241.7;
export const MASTERPIECE_WIKIPEDIA_HOTEL_ROOMS = 381;
export const MASTERPIECE_WIKIPEDIA_CONSTRUCTION_START_YEAR = 2002;
export const MASTERPIECE_WIKIPEDIA_COMPLETED_YEAR = 2007;

// Photo- and layout-directed visual controls, not a surveyed hotel, refuge-floor or podium schedule.
export const MASTERPIECE_PLAZA_TOP = 0.12;
export const MASTERPIECE_VISUAL_PODIUM_TOP = 30;
export const MASTERPIECE_VISUAL_HOTEL_TOP = 96;
export const MASTERPIECE_CROWN_LOUVRE_TOP = 250.5;
export const MASTERPIECE_PANEL_TARGET_WIDTH = 1.85;
export const MASTERPIECE_VISUAL_SKY_GARDEN_LEVELS = Object.freeze([24, 25, 45, 46]);
export const MASTERPIECE_PUBLISHED_REFUGE_FLOOR_LABELS = Object.freeze([26, 47]);
export const MASTERPIECE_CENTRAL_GLASS_EDGES = Object.freeze([43, 0, 42, 22, 23]);
export const MASTERPIECE_PORTAL_EDGES = Object.freeze([1, 41, 20, 25]);

export function masterpieceFloorY(level) {
  const value = Math.max(0, Math.min(MASTERPIECE_LEVELS, level));
  if (value <= 6) return value * MASTERPIECE_VISUAL_PODIUM_TOP / 6;
  if (value <= 24) return MASTERPIECE_VISUAL_PODIUM_TOP
    + (value - 6) * (MASTERPIECE_VISUAL_HOTEL_TOP - MASTERPIECE_VISUAL_PODIUM_TOP) / 18;
  return MASTERPIECE_VISUAL_HOTEL_TOP + (value - 24)
    * (MASTERPIECE_OCCUPIED_HEIGHT - MASTERPIECE_VISUAL_HOTEL_TOP) / (MASTERPIECE_LEVELS - 24);
}
export function masterpieceLocalToWorld(x, z) {
  const site = MASTERPIECE_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return { x: site.x + cs * x + sn * z, z: site.z - sn * x + cs * z };
}
export function masterpieceEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0;
  for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1;
  return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
function frameAtEdge(edge, evidence, offset = 0) {
  const source = MASTERPIECE_TOWER_RING, i = edge * 2, normal = masterpieceEdgeOutward(source, edge);
  const x = (source[i] + source[i + 2]) * 0.5 + (source[i] - source[i + 2]) * offset / normal.length;
  const z = (source[i + 1] + source[i + 3]) * 0.5 + (source[i + 1] - source[i + 3]) * offset / normal.length;
  const world = masterpieceLocalToWorld(x, z), cs = Math.cos(MASTERPIECE_SITE.ry), sn = Math.sin(MASTERPIECE_SITE.ry);
  const nx = cs * normal.nx + sn * normal.nz, nz = -sn * normal.nx + cs * normal.nz;
  return Object.freeze({ edge, x: world.x, z: world.z, nx, nz, ry: Math.atan2(nx, nz), evidence });
}

// The published layout places the residential entrance on Hanoi Road. OSM has no entrance node on this way.
export const MASTERPIECE_ENTRANCE_EDGE = 25;
export const MASTERPIECE_ENTRANCE = frameAtEdge(MASTERPIECE_ENTRANCE_EDGE,
  'Published Hanoi Road residential-entrance layout; visual placement only, not an OSM door node or surveyed canopy');
export function masterpieceFrameToWorld(frame, x, z) {
  const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry);
  return { x: frame.x + cs * x + sn * z, z: frame.z - sn * x + cs * z };
}
function frameRing(frame, halfWidth, back, front) {
  const result = [];
  for (const [x, z] of [[-halfWidth, back], [halfWidth, back], [halfWidth, front], [-halfWidth, front], [-halfWidth, back]]) {
    const p = masterpieceFrameToWorld(frame, x, z); result.push(p.x, p.z);
  }
  return Object.freeze(result);
}
export const MASTERPIECE_ENTRANCE_FORECOURT_RING = frameRing(MASTERPIECE_ENTRANCE, 8, -1, 4);
export const MASTERPIECE_GROUND_RINGS = Object.freeze([MASTERPIECE_SITE.ring, MASTERPIECE_ENTRANCE_FORECOURT_RING]);
export function isMasterpiecePlazaPoint(x, z) {
  return MASTERPIECE_GROUND_RINGS.some((groundRing) => pointInFlatRing(groundRing, x, z));
}

export function masterpieceEdgeCollider(ring, edge, minY, maxY, depth = 0.8) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const world = masterpieceLocalToWorld((ax + bx) * 0.5, (az + bz) * 0.5);
  const { ry } = masterpieceEdgeOutward(ring, edge), worldRy = MASTERPIECE_SITE.ry + ry;
  const w = Math.hypot(bx - ax, bz - az) + 0.08, d = depth;
  const cs = Math.cos(worldRy), sn = Math.sin(worldRy), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: world.x, z: world.z, w, d, ry: worldRy, minY, maxY,
    minX: world.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: world.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: world.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: world.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: world.x, cz: world.z, hx, hz, cs, sn } };
}
export function masterpieceRingColliders(ring, minY, maxY, depth = 0.8) {
  const result = [];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) result.push(masterpieceEdgeCollider(ring, edge, minY, maxY, depth));
  return result;
}
