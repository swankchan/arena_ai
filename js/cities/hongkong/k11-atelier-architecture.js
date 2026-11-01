// HK-B0010 K11 Atelier / Victoria Dockside: source outline, separate height conventions and authored tier frames.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';

function geometry(points) { return Object.freeze(points.map(([lon, lat]) => Object.freeze({ lon, lat }))); }
export const K11_ATELIER_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-01',
  sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/668219664/full.json',
  type: 'way', id: 668219664, version: 14, timestamp: '2026-03-13T08:49:37Z', changeset: 179797122,
  tags: Object.freeze({ building: 'commercial', 'building:function': 'tower', 'building:levels': '66', height: '274', layer: '1',
    name: 'K11 Atelier', 'addr:housenumber': '18', 'addr:street': '梳士巴利道 Salisbury Road', wikidata: 'Q55615501' }),
  geometry: geometry([
    [114.1760019, 22.2947088], [114.1759904, 22.2948581], [114.1759709, 22.2951128],
    [114.1759692, 22.2951345], [114.1759042, 22.2951302], [114.1758999, 22.2951869],
    [114.1756731, 22.2951720], [114.1756084, 22.2951678], [114.1756104, 22.2951411],
    [114.1755427, 22.2951367], [114.1755452, 22.2951042], [114.1755081, 22.2951018],
    [114.1755106, 22.2950698], [114.1755122, 22.2950488], [114.1754946, 22.2950476],
    [114.1755033, 22.2949341], [114.1755108, 22.2948366], [114.1755230, 22.2946777],
    [114.1755775, 22.2946813], [114.1755823, 22.2946199], [114.1755902, 22.2946205],
    [114.1755925, 22.2945915], [114.1758946, 22.2946114], [114.1758924, 22.2946403],
    [114.1759415, 22.2946435], [114.1759368, 22.2947046], [114.1760019, 22.2947088]
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
const ring = projectRing(K11_ATELIER_OSM_SOURCE), footprint = minimumAreaObb(ring);
const baseSite = Object.freeze({ name: 'K11 Atelier', englishName: 'K11 Atelier at Victoria Dockside',
  address: '梳士巴利道18號 18 Salisbury Road', osmType: 'way', osmId: K11_ATELIER_OSM_SOURCE.id,
  source: K11_ATELIER_OSM_SOURCE, ring, bounds: flatRingBounds(ring), ...footprint });
export const K11_ATELIER_SITE = Object.freeze({ ...baseSite, localRing: localRing(baseSite) });

export const K11_ATELIER_OSM_HEIGHT = 274;
export const K11_ATELIER_OFFICIAL_APPROX_HEIGHT = 273;
export const K11_ATELIER_DESIGN_REPORT_HEIGHT = 280;
export const K11_ATELIER_WIKIPEDIA_HEIGHT = 284;
export const K11_ATELIER_HEIGHT = 272.5; // CVU architectural.
export const K11_ATELIER_TO_TIP_HEIGHT = 277.3;
export const K11_ATELIER_OCCUPIED_HEIGHT = 255.1;
export const K11_ATELIER_VISUAL_ROOF_DECK = 270.8; // Photo-derived roof control, not another source height convention.
export const K11_ATELIER_OSM_LEVELS = 66;
export const K11_ATELIER_LEVELS = 66; // CVU above-ground convention used for visual courses.
export const K11_ATELIER_OFFICIAL_LEVELS = 62; // Excludes two refuge and two M&E floors.
export const K11_ATELIER_REFUGE_LEVELS = 2;
export const K11_ATELIER_ME_LEVELS = 2;
export const K11_ATELIER_BELOW_GROUND_LEVELS = 5;
export const K11_ATELIER_LOBBY_HEIGHT = 9;
export const K11_ATELIER_PLAZA_TOP = 0.12;
export const K11_ATELIER_PANEL_TARGET_WIDTH = 3; // Photo-derived visual module, not a surveyed facade schedule.
export const K11_ATELIER_VISUAL_LOUVRE_LEVELS = Object.freeze([17, 33, 47, 57]);
// Short recessed corner channels in the close facade photographs expose dark diagonal framing.
// Edge indices refer to the source-derived ring; these are visual details, not a structural design schedule.
export const K11_ATELIER_CROSS_BRACED_EDGES = Object.freeze([4, 8, 18, 24]);

export function k11AtelierFloorY(level) {
  const value = Math.max(0, Math.min(K11_ATELIER_LEVELS, level));
  if (value <= 1) return value * K11_ATELIER_LOBBY_HEIGHT;
  return K11_ATELIER_LOBBY_HEIGHT + (value - 1) * (K11_ATELIER_OCCUPIED_HEIGHT - K11_ATELIER_LOBBY_HEIGHT)
    / (K11_ATELIER_LEVELS - 1);
}

// The source is a 26-vertex irregular tower outline, not the K11 MUSEA land parcel. Photographs show
// asymmetric vertical setbacks. These transforms retain the source's stepped plan while shrinking each
// successive authored tier inside it; they are visual modelling controls, not additional surveyed rings.
function closeRing(points) { return Object.freeze([...points, points[0], points[1]]); }
function tierRing(sx, sz, tx, tz) {
  const source = K11_ATELIER_SITE.localRing, result = [];
  for (let i = 0; i + 1 < source.length; i += 2) result.push(source[i] * sx + tx, source[i + 1] * sz + tz);
  return closeRing(result);
}
export const K11_ATELIER_LOBBY_RING = closeRing(K11_ATELIER_SITE.localRing);
export const K11_ATELIER_TIERS = Object.freeze([
  Object.freeze({ firstLevel: 2, lastLevel: 17, ring: tierRing(1, 1, 0, 0) }),
  Object.freeze({ firstLevel: 18, lastLevel: 33, ring: tierRing(0.94, 0.94, -1.0, 0.7) }),
  Object.freeze({ firstLevel: 34, lastLevel: 47, ring: tierRing(0.84, 0.86, -2.6, 1.6) }),
  Object.freeze({ firstLevel: 48, lastLevel: 57, ring: tierRing(0.74, 0.76, -4.5, 2.8) }),
  Object.freeze({ firstLevel: 58, lastLevel: 66, ring: tierRing(0.62, 0.66, -6.6, 4.0) })
]);
export const K11_ATELIER_CROWN_RING = K11_ATELIER_TIERS[K11_ATELIER_TIERS.length - 1].ring;

// Surface-road scan of the exact source ring. Tunnel ways remain below the occupied model and are not
// mislabeled as ground portals. These seven edges keep the two unnamed surface access-road interfaces open.
export const K11_ATELIER_GROUND_VEHICLE_PORTAL_EDGES = Object.freeze([0, 10, 11, 12, 13, 14, 25]);
export const K11_ATELIER_LOBBY_SOFFIT = K11_ATELIER_LOBBY_HEIGHT;

export function k11AtelierLocalToWorld(x, z) {
  const site = K11_ATELIER_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return { x: site.x + cs * x + sn * z, z: site.z - sn * x + cs * z };
}
export function k11AtelierEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0;
  for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1;
  return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
export function k11AtelierRingColliders(ring, minY, maxY, depth = 0.8, skippedEdges = []) {
  const skipped = new Set(skippedEdges), result = [];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    if (skipped.has(edge)) continue;
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const world = k11AtelierLocalToWorld((ax + bx) * 0.5, (az + bz) * 0.5);
    const { length, ry } = k11AtelierEdgeOutward(ring, edge);
    result.push({ shape: 'box', x: world.x, z: world.z, w: length + 0.08, d: depth,
      ry: K11_ATELIER_SITE.ry + ry, minY, maxY });
  }
  return result;
}
export function isK11AtelierPlazaPoint(x, z) { return pointInFlatRing(K11_ATELIER_SITE.ring, x, z); }

// Address and Salisbury Road photographs place the authored office lobby on the north frontage.
// No tagged OSM door was present on way 668219664; this is deliberately not called a surveyed entrance node.
export const K11_ATELIER_ENTRANCE_EDGE = 5;
export const K11_ATELIER_ENTRANCE = Object.freeze((() => {
  const source = K11_ATELIER_SITE.localRing, i = K11_ATELIER_ENTRANCE_EDGE * 2;
  const x = (source[i] + source[i + 2]) * 0.5, z = (source[i + 1] + source[i + 3]) * 0.5;
  const world = k11AtelierLocalToWorld(x, z), normal = k11AtelierEdgeOutward(source, K11_ATELIER_ENTRANCE_EDGE);
  const cs = Math.cos(K11_ATELIER_SITE.ry), sn = Math.sin(K11_ATELIER_SITE.ry);
  const nx = cs * normal.nx + sn * normal.nz, nz = -sn * normal.nx + cs * normal.nz;
  return { x: world.x, z: world.z, nx, nz, ry: Math.atan2(nx, nz), evidence: 'Salisbury Road address and exterior photographs; no OSM door tag' };
})());
