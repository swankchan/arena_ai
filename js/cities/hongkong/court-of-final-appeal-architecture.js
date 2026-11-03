import { minimumAreaObb, pointInFlatRing, flatRingBounds } from './landmark-site.js';

// The Court of Final Appeal is the 1912 Old Supreme Court at 8 Jackson Road.  It is deliberately
// kept separate from the Former French Mission Building (way 85320697), which housed the Court
// from 1997 to 2015.  These are the saved geometry and tags already present in landmarks.json;
// they are not a substituted rectangle or a newly fetched claim of survey accuracy.
const KX = 103056.81753522092, KY = 110734.09626824585;
export const CFA_OSM_SOURCE = Object.freeze({
  type: 'way', id: 42293414, version: 16, wayTimestamp: '2025-01-22T03:29:37Z', changeset: 161621742,
  sourceTimestamp: '2026-10-29T21:21:26Z', attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0',
  sourceDataset: 'Geofabrik Hong Kong OSM extract; current way metadata checked against OSM API',
  sourceSha256: 'c6fd49e15358616f46e3f00efb041ef2dfe6df470274b6074bc6492f3e406224',
  tags: Object.freeze({
    'addr:housenumber': '8', 'addr:street': '昃臣道 Jackson Road', 'addr:street:en': 'Jackson Road', 'addr:street:zh': '昃臣道',
    alt_name: '最高法院大樓 Old Supreme Court Building', 'alt_name:en': 'Supreme Court Building', 'alt_name:zh': '最高法院大樓',
    'alt_name:zh-Hans': '最高法院大楼', 'alt_name:zh-Hant': '最高法院大樓', amenity: 'courthouse', building: 'civic',
    'building:levels': '4', heritage: '2', name: '終審法院 The Court of Final Appeal', 'name:en': 'The Court of Final Appeal',
    'name:zh': '終審法院', 'name:zh-Hans': '终审法院', 'name:zh-Hant': '終審法院', old_name: '立法會大樓 Legislative Council Building',
    'old_name:en': 'Legislative Council Building', 'old_name:zh': '立法會大樓', 'was:government': 'legislative',
    'was:name': '立法會大樓 Legislative Council Building', 'was:name:en': 'Legislative Council Building',
    'was:name:zh': '立法會大樓', 'was:office': 'government', wikidata: 'Q6518233'
  }),
  geometry: Object.freeze([
    Object.freeze({ id: 527732673, lon: 114.1600848, lat: 22.2806531 }), Object.freeze({ id: 527732674, lon: 114.1604444, lat: 22.2805596 }),
    Object.freeze({ id: 9634911144, lon: 114.1605063, lat: 22.2807634 }), Object.freeze({ id: 9634911145, lon: 114.1605682, lat: 22.2809672 }),
    Object.freeze({ id: 527732732, lon: 114.1606301, lat: 22.2811710 }), Object.freeze({ id: 527732733, lon: 114.1602705, lat: 22.2812645 }),
    Object.freeze({ id: 9634911147, lon: 114.1602086, lat: 22.2810607 }), Object.freeze({ id: 9634911146, lon: 114.1601467, lat: 22.2808569 }),
    Object.freeze({ id: 527732673, lon: 114.1600848, lat: 22.2806531 })
  ])
});

const worldRing = Object.freeze(CFA_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => [
  (lon - 114.1596) * KX, -(lat - 22.2819) * KY
]));
const footprint = minimumAreaObb(worldRing);
export const CFA_SITE = Object.freeze({
  name: CFA_OSM_SOURCE.tags.name, osmType: 'way', osmId: CFA_OSM_SOURCE.id, source: CFA_OSM_SOURCE,
  ring: worldRing, bounds: flatRingBounds(worldRing), ...footprint
});
export function cfaLocalToWorld(x, z) {
  const s = CFA_SITE, cs = Math.cos(s.ry), sn = Math.sin(s.ry);
  return { x: s.x + cs * x + sn * z, z: s.z - sn * x + cs * z };
}
export function cfaWorldToLocal(x, z) {
  const s = CFA_SITE, cs = Math.cos(s.ry), sn = Math.sin(s.ry), dx = x - s.x, dz = z - s.z;
  return { x: dx * cs - dz * sn, z: dx * sn + dz * cs };
}
export const CFA_LOCAL_RING = Object.freeze(worldRing.flatMap((value, index, array) => {
  if (index % 2) return [];
  const p = cfaWorldToLocal(value, array[index + 1]); return [p.x, p.z];
}));
export const CFA_RING_AREA = (() => {
  let area = 0; for (let i = 0; i + 3 < CFA_LOCAL_RING.length; i += 2) area += CFA_LOCAL_RING[i] * CFA_LOCAL_RING[i + 3] - CFA_LOCAL_RING[i + 2] * CFA_LOCAL_RING[i + 1];
  return Math.abs(area * .5);
})();
export const CFA_GROUND_SAMPLE = Object.freeze({ x: CFA_SITE.x, z: CFA_SITE.z });

// AMO's HIA gives an approximately 70 x 38 m site and describes three principal storeys.  OSM's
// four-level tag and the secondary published approximately-40 m overall height remain separate.
// Intermediate elevations below are photo-directed modelling controls, not surveyed levels.
export const CFA_OFFICIAL_APPROX_SITE_LENGTH = 70, CFA_OFFICIAL_APPROX_SITE_WIDTH = 38;
export const CFA_OFFICIAL_STOREYS = 3, CFA_OSM_LEVELS = Number(CFA_OSM_SOURCE.tags['building:levels']);
export const CFA_OSM_HEIGHT = null, CFA_PUBLISHED_APPROX_HEIGHT = 40, CFA_HEIGHT = 40;
export const CFA_PUBLISHED_THEMIS_HEIGHT = 2.7, CFA_COMPLETION_YEAR = 1912;
export const CFA_ARCHITECTS = 'Aston Webb & E. Ingress Bell';
export const CFA_PLAZA_TOP = .24, CFA_BALCONY_Y = 5.75, CFA_ENTABLATURE_Y = 16.65;
export const CFA_PARAPET_Y = 18.0, CFA_PEDIMENT_WIDTH = 24, CFA_PEDIMENT_APEX_Y = 23.5;
export const CFA_DRUM_BASE_Y = 22, CFA_DRUM_TOP_Y = 29, CFA_DOME_TOP_Y = 36.15;
export const CFA_LONG_BAYS = 13, CFA_SHORT_BAYS = 7, CFA_ARCADE_BAYS = 2 * (CFA_LONG_BAYS + CFA_SHORT_BAYS);
export const CFA_GIANT_COLUMNS = 2 * (CFA_LONG_BAYS + 1) + 2 * (CFA_SHORT_BAYS + 1) - 4;
export const CFA_DRUM_COLUMNS = 24, CFA_DOME_RIBS = 24, CFA_CHINESE_TILE_ROOFS = 2;

export function cfaEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3], dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0; for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1;
  return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
export function cfaFrameToWorld(frame, x, z) {
  const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry);
  return { x: frame.x + cs * x + sn * z, z: frame.z - sn * x + cs * z };
}
function photoDirectedFrame(sourceEdge, name, evidence) {
  const i = sourceEdge * 2, ax = CFA_LOCAL_RING[i], az = CFA_LOCAL_RING[i + 1], bx = CFA_LOCAL_RING[i + 2], bz = CFA_LOCAL_RING[i + 3];
  const localX = (ax + bx) * .5, localZ = (az + bz) * .5, world = cfaLocalToWorld(localX, localZ), edge = cfaEdgeOutward(CFA_LOCAL_RING, sourceEdge);
  const cs = Math.cos(CFA_SITE.ry), sn = Math.sin(CFA_SITE.ry), nx = cs * edge.nx + sn * edge.nz, nz = -sn * edge.nx + cs * edge.nz;
  return Object.freeze({ nodeId: null, sourceEdge, localX, localZ, x: world.x, z: world.z, nx, nz, ry: Math.atan2(nx, nz), name, evidence });
}
export const CFA_MAIN_ENTRANCE = photoDirectedFrame(6, 'Court of Final Appeal west entrance facing Statue Square',
  'AMO HIA identifies the west elevation facing Statue Square as the principal front. The central door is photo-directed on the middle source edge; way 42293414 has no entrance-tagged node.');

// Facade-local x follows the elevation, y is up and +z points out of the building.
export const CFA_FACADES = Object.freeze([
  Object.freeze({ id: 'west', bays: CFA_LONG_BAYS, length: CFA_SITE.w, ry: Math.PI, cx: 0, cz: -CFA_SITE.d * .5, nx: 0, nz: -1 }),
  Object.freeze({ id: 'east', bays: CFA_LONG_BAYS, length: CFA_SITE.w, ry: 0, cx: 0, cz: CFA_SITE.d * .5, nx: 0, nz: 1 }),
  Object.freeze({ id: 'south', bays: CFA_SHORT_BAYS, length: CFA_SITE.d, ry: -Math.PI * .5, cx: -CFA_SITE.w * .5, cz: 0, nx: -1, nz: 0 }),
  Object.freeze({ id: 'north', bays: CFA_SHORT_BAYS, length: CFA_SITE.d, ry: Math.PI * .5, cx: CFA_SITE.w * .5, cz: 0, nx: 1, nz: 0 })
]);
export function cfaFacadePoint(facade, u, y, offset = 0) {
  const cs = Math.cos(facade.ry), sn = Math.sin(facade.ry);
  return [facade.cx + cs * u + sn * offset, y, facade.cz - sn * u + cs * offset];
}
export function cfaLocalCollider(x, z, w, d, minY, maxY, ry = CFA_SITE.ry) {
  const p = cfaLocalToWorld(x, z), cs = Math.cos(ry), sn = Math.sin(ry), hx = w * .5, hz = d * .5;
  return { shape: 'box', x: p.x, z: p.z, w, d, ry, minY, maxY,
    minX: p.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: p.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: p.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: p.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: p.x, cz: p.z, hx, hz, cs, sn } };
}
export function cfaFacadeCollider(facade, u, offset, w, d, minY, maxY) {
  const p = cfaFacadePoint(facade, u, 0, offset);
  return cfaLocalCollider(p[0], p[2], w, d, minY, maxY, CFA_SITE.ry + facade.ry);
}
export function cfaEdgeCollider(ring, edge, minY, maxY, depth = .42) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3], { ry, length } = cfaEdgeOutward(ring, edge);
  return cfaLocalCollider((ax + bx) * .5, (az + bz) * .5, length + .02, depth, minY, maxY, CFA_SITE.ry + ry);
}
export function cfaRingColliders(ring, minY, maxY, depth = .42) {
  const out = []; for (let edge = 0; edge < ring.length / 2 - 1; edge++) out.push(cfaEdgeCollider(ring, edge, minY, maxY, depth)); return out;
}
export const CFA_GROUND_RINGS = Object.freeze([CFA_SITE.ring]);
export function isCourtOfFinalAppealPoint(x, z) { return pointInFlatRing(CFA_SITE.ring, x, z); }
export function cfaGroundHeightAt(x, z, ground, grounds) { return isCourtOfFinalAppealPoint(x, z) ? grounds.plaza : ground; }
