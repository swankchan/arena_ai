// HK-B0009 Cheung Kong Center: source geometry, height conventions and authored local frames.
// The OSM way is preserved separately from the photo/structural-paper-derived chamfered curtain-wall ring.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';

function geometry(points) {
  return Object.freeze(points.map(([lon, lat]) => Object.freeze({ lon, lat })));
}
function tags(values) {
  const result = { ...values };
  if (values.buildingLevels !== undefined) { result['building:levels'] = String(values.buildingLevels); delete result.buildingLevels; }
  if (values.buildingMaterial !== undefined) { result['building:material'] = values.buildingMaterial; delete result.buildingMaterial; }
  return Object.freeze(result);
}

export const CHEUNG_KONG_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-01',
  sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/64897826/full.json',
  type: 'way', id: 64897826, version: 12, timestamp: '2026-08-05T09:06:33Z', changeset: 186966169,
  tags: tags({ building: 'office', buildingLevels: 63, buildingMaterial: 'glass', height: 283,
    wikidata: 'Q700058', wikipedia: 'en:Cheung Kong Center' }),
  geometry: geometry([
    [114.1608840, 22.2795227], [114.1605593, 22.2798250], [114.1604327, 22.2797086],
    [114.1602315, 22.2795236], [114.1604123, 22.2793552], [114.1605562, 22.2792212],
    [114.1608840, 22.2795227]
  ])
});

// Identical WGS84 -> application-grid transform to tools/geo/frame.mjs and the other Hong Kong landmarks.
const KX = 103056.81753522092, KY = 110734.09626824585;
function projectRing(source) {
  return Object.freeze(source.geometry.flatMap(({ lon, lat }) => [
    (lon - 114.1596) * KX, -(lat - 22.2819) * KY
  ]));
}
function localRing(site) {
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry), result = [];
  for (let i = 0; i + 3 < site.ring.length; i += 2) {
    const dx = site.ring[i] - site.x, dz = site.ring[i + 1] - site.z;
    result.push(dx * cs - dz * sn, dx * sn + dz * cs);
  }
  return Object.freeze(result);
}
const ring = projectRing(CHEUNG_KONG_OSM_SOURCE), footprint = minimumAreaObb(ring);
const baseSite = Object.freeze({
  name: '長江集團中心', englishName: 'Cheung Kong Center', address: '皇后大道中二號 2 Queen’s Road Central',
  osmType: 'way', osmId: CHEUNG_KONG_OSM_SOURCE.id, source: CHEUNG_KONG_OSM_SOURCE,
  ring, bounds: flatRingBounds(ring), ...footprint
});
export const CHEUNG_KONG_SITE = Object.freeze({ ...baseSite, localRing: localRing(baseSite) });

// Source conventions are deliberately not rounded into one another.
export const CHEUNG_KONG_OSM_HEIGHT = 283;
export const CHEUNG_KONG_HEIGHT = 282.8; // CVU architectural and to-tip.
export const CHEUNG_KONG_TO_TIP_HEIGHT = 282.8;
export const CHEUNG_KONG_OSM_LEVELS = 63;
export const CHEUNG_KONG_LEVELS = 63; // CVU above-ground convention used for the visual courses.
export const CHEUNG_KONG_CONVENTIONAL_LEVELS = 62; // Commonly published Hong Kong floor count.
export const CHEUNG_KONG_TOP_LEVEL_LABEL = 70; // Lift/highest label, not seventy physical floors.
export const CHEUNG_KONG_BELOW_GROUND_LEVELS = 5;
export const CHEUNG_KONG_PANEL_WIDTH = 2.4;
export const CHEUNG_KONG_PANEL_HEIGHT = 2.1;
export const CHEUNG_KONG_STRUCTURAL_PLAN = 47.4;
export const CHEUNG_KONG_CHAMFER = 1;
export const CHEUNG_KONG_PLAZA_TOP = 0.12;
// Photo-derived modelling controls, not surveyed floor or roof elevations.
export const CHEUNG_KONG_LOBBY_HEIGHT = 9;
export const CHEUNG_KONG_LOWER_LOUVRE_TOP = 27;
export const CHEUNG_KONG_VISUAL_OFFICE_TOP = 276.3;
export const CHEUNG_KONG_VISUAL_ROOF_DECK = 281.4;

export function cheungKongFloorY(level) {
  const value = Math.max(0, Math.min(CHEUNG_KONG_LEVELS, level));
  if (value <= 1) return value * CHEUNG_KONG_LOBBY_HEIGHT;
  if (value <= 5) return CHEUNG_KONG_LOBBY_HEIGHT + (value - 1) * (CHEUNG_KONG_LOWER_LOUVRE_TOP - CHEUNG_KONG_LOBBY_HEIGHT) / 4;
  return CHEUNG_KONG_LOWER_LOUVRE_TOP + (value - 5) * (CHEUNG_KONG_VISUAL_OFFICE_TOP - CHEUNG_KONG_LOWER_LOUVRE_TOP)
    / (CHEUNG_KONG_LEVELS - 5);
}

// OSM vertices 1 and 3 are collinear intermediate/entrance nodes. The four actual corners are retained and
// chamfered inside that source outline instead of substituting an ideal OBB or moving the building.
const source = CHEUNG_KONG_SITE.localRing;
const corners = [[source[0], source[1]], [source[2], source[3]], [source[6], source[7]], [source[10], source[11]]];
function authoredCornerRing(radius, segments) {
  const result = [];
  for (let index = 0; index < corners.length; index++) {
    const corner = corners[index], previous = corners[(index + corners.length - 1) % corners.length], next = corners[(index + 1) % corners.length];
    const previousLength = Math.hypot(previous[0] - corner[0], previous[1] - corner[1]);
    const nextLength = Math.hypot(next[0] - corner[0], next[1] - corner[1]);
    const incoming = [corner[0] + (previous[0] - corner[0]) * radius / previousLength,
      corner[1] + (previous[1] - corner[1]) * radius / previousLength];
    const outgoing = [corner[0] + (next[0] - corner[0]) * radius / nextLength,
      corner[1] + (next[1] - corner[1]) * radius / nextLength];
    if (segments === 1) { result.push(...incoming, ...outgoing); continue; }
    for (let step = 0; step < segments; step++) {
      const t = step / segments, u = 1 - t;
      result.push(u * u * incoming[0] + 2 * u * t * corner[0] + t * t * outgoing[0],
        u * u * incoming[1] + 2 * u * t * corner[1] + t * t * outgoing[1]);
    }
  }
  result.push(result[0], result[1]);
  return Object.freeze(result);
}
export const CHEUNG_KONG_VISUAL_RING = authoredCornerRing(CHEUNG_KONG_CHAMFER, 1);
export const CHEUNG_KONG_LOBBY_RING = authoredCornerRing(2.2, 3); // Rounded glass-atrium corners seen in photographs.

export function cheungKongLocalToWorld(x, z) {
  const site = CHEUNG_KONG_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return { x: site.x + cs * x + sn * z, z: site.z - sn * x + cs * z };
}
export function cheungKongEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0;
  for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1;
  return { nx: dz / length * sign, nz: -dx / length * sign, length };
}
export function cheungKongRingColliders(ring, minY, maxY, depth = 0.8) {
  const result = [];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const x = (ax + bx) * 0.5, z = (az + bz) * 0.5, world = cheungKongLocalToWorld(x, z);
    const { length } = cheungKongEdgeOutward(ring, edge);
    result.push({ shape: 'box', x: world.x, z: world.z, w: length + 0.08, d: depth,
      ry: CHEUNG_KONG_SITE.ry + Math.atan2(-(bz - az), bx - ax), minY, maxY });
  }
  return result;
}
export function isCheungKongPlazaPoint(x, z) { return pointInFlatRing(CHEUNG_KONG_SITE.ring, x, z); }

// OSM node 8039390420: entrance=yes, exit=yes and door=yes at source geometry vertex 4.
export const CHEUNG_KONG_ENTRANCE_EDGE = 4;
export const CHEUNG_KONG_ENTRANCE = Object.freeze((() => {
  const sourceRing = CHEUNG_KONG_SITE.ring, i = CHEUNG_KONG_ENTRANCE_EDGE * 2;
  const { nx, nz } = cheungKongEdgeOutward(sourceRing, CHEUNG_KONG_ENTRANCE_EDGE);
  return { nodeId: 8039390420, sourceUrl: 'https://api.openstreetmap.org/api/0.6/node/8039390420.json',
    x: sourceRing[i], z: sourceRing[i + 1], nx, nz, ry: Math.atan2(nx, nz) };
})());
