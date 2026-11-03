// HK-B0028 The Henderson: exact OSM curved office ring and independent architectural / facade conventions.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';
const geometry = (rows) => Object.freeze(rows.map(([id, lon, lat]) => Object.freeze({ id, lon, lat })));
export const HENDERSON_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-03',
  sourceTimestamp: "2026-05-09T06:51:25Z", sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/26434768/full.json',
  type: 'way', id: 26434768, version: 17,
  tags: Object.freeze({
    "addr:housenumber": "2",
    "addr:street": "美利道 Murray Road",
    "addr:street:en": "Murray Road",
    "addr:street:zh": "美利道",
    "building": "office",
    "building:levels": "36",
    "building:levels:underground": "5",
    "building:material": "glass",
    "height": "190",
    "name": "The Henderson",
    "name:en": "The Henderson",
    "wikidata": "Q124209168",
    "wikipedia": "zh:The Henderson"
  }),
  geometry: geometry([
    [11640628987, 114.1620701, 22.2799684],
    [13810188076, 114.16212, 22.2799442],
    [13810188077, 114.1621379, 22.2799375],
    [11640628982, 114.1621557, 22.2799324],
    [11640628983, 114.1621717, 22.2799296],
    [11640628986, 114.1621895, 22.279929],
    [11640628981, 114.1622089, 22.2799318],
    [11640628985, 114.1622302, 22.2799391],
    [11640628988, 114.1622469, 22.2799498],
    [11640628984, 114.1622621, 22.2799638],
    [11640628989, 114.1622768, 22.2799833],
    [11640628990, 114.162286, 22.2800055],
    [11640538846, 114.1623104, 22.2801157],
    [11640538848, 114.1623448, 22.280199],
    [11640538847, 114.1623531, 22.2802277],
    [11640538849, 114.1623552, 22.2802504],
    [289664836, 114.1623523, 22.2802697],
    [289664825, 114.1623459, 22.2802878],
    [11640538845, 114.1623364, 22.2803047],
    [11640538844, 114.1623243, 22.2803189],
    [11640538850, 114.1623103, 22.2803286],
    [13810188079, 114.1622979, 22.2803349],
    [13810188080, 114.1622846, 22.2803396],
    [13810188075, 114.1622676, 22.2803441],
    [11640538851, 114.1622423, 22.2803485],
    [11640538852, 114.1621873, 22.2803522],
    [11640538853, 114.1621475, 22.2803724],
    [11640628980, 114.1621237, 22.2803819],
    [11640538854, 114.1621015, 22.2803886],
    [11640628979, 114.1620829, 22.280392],
    [11640628978, 114.162065, 22.2803917],
    [11640628977, 114.1620487, 22.2803888],
    [11640628976, 114.1620325, 22.2803826],
    [11640628975, 114.1620163, 22.2803727],
    [11640628974, 114.1620047, 22.280361],
    [12740842351, 114.1619968, 22.2803498],
    [13810188071, 114.1619902, 22.280336],
    [13810188074, 114.1619867, 22.2803216],
    [12084789007, 114.1619858, 22.2803085],
    [11640628973, 114.1619874, 22.2802769],
    [11640628972, 114.1619742, 22.2802573],
    [289664835, 114.1619625, 22.2802364],
    [11640628971, 114.1619538, 22.2802161],
    [289664827, 114.1619475, 22.2801932],
    [11640628970, 114.1619433, 22.2801653],
    [11640628969, 114.1619428, 22.2801316],
    [13810188072, 114.161925, 22.2801069],
    [13810188078, 114.1619162, 22.2800917],
    [11640538863, 114.1619114, 22.2800763],
    [13810188073, 114.1619094, 22.2800634],
    [11640538868, 114.1619103, 22.280049],
    [11640538864, 114.1619141, 22.2800336],
    [11640538867, 114.1619222, 22.2800177],
    [11640538865, 114.1619358, 22.2800017],
    [11640538866, 114.1619509, 22.2799905],
    [11640538862, 114.1619689, 22.2799824],
    [11640538861, 114.1619899, 22.2799765],
    [11640538860, 114.1620114, 22.279973],
    [11640628987, 114.1620701, 22.2799684],
  ])
});
const KX = 103056.81753522092, KY = 110734.09626824585;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];
const worldRing = Object.freeze(HENDERSON_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat)));
const footprint = minimumAreaObb(worldRing);
let signedArea = 0;
for (let i = 0; i + 3 < worldRing.length; i += 2) signedArea += worldRing[i] * worldRing[i + 3] - worldRing[i + 2] * worldRing[i + 1];
export const HENDERSON_RING_AREA = Math.abs(signedArea * .5);
export const HENDERSON_SITE = Object.freeze({
  name: 'The Henderson', englishName: 'The Henderson', address: '美利道2號 2 Murray Road',
  osmType: 'way', osmId: HENDERSON_OSM_SOURCE.id, source: HENDERSON_OSM_SOURCE,
  ring: worldRing, bounds: flatRingBounds(worldRing), ...footprint
});
export function hendersonLocalToWorld(x, z) { const s = HENDERSON_SITE, cs = Math.cos(s.ry), sn = Math.sin(s.ry); return { x: s.x + cs * x + sn * z, z: s.z - sn * x + cs * z }; }
export function hendersonWorldToLocal(x, z) { const s = HENDERSON_SITE, cs = Math.cos(s.ry), sn = Math.sin(s.ry), dx = x - s.x, dz = z - s.z; return { x: dx * cs - dz * sn, z: dx * sn + dz * cs }; }
export const HENDERSON_LOCAL_RING = Object.freeze(worldRing.flatMap((value, index, array) => { if (index % 2) return []; const p = hendersonWorldToLocal(value, array[index + 1]); return [p.x, p.z]; }));
export const HENDERSON_GROUND_SAMPLE = Object.freeze({ x: HENDERSON_SITE.x, z: HENDERSON_SITE.z });
export const HENDERSON_OSM_HEIGHT = 190, HENDERSON_WSP_HEIGHT = 190, HENDERSON_DISCOVER_HK_HEIGHT = 190;
export const HENDERSON_SEELE_HEIGHT = 200, HENDERSON_LIGHTING_DESIGN_HEIGHT = 200, HENDERSON_HEIGHT = HENDERSON_OSM_HEIGHT;
export const HENDERSON_OSM_LEVELS = 36, HENDERSON_ZHA_LEVELS = 36, HENDERSON_UNDERGROUND_LEVELS = 5;
export const HENDERSON_HIP_HING_TYPICAL_FLOORS = Object.freeze({ first: 6, last: 38 });
export const HENDERSON_WORKPLACE_TYPICAL_FLOORS = Object.freeze({ first: 6, last: 37 });
export const HENDERSON_OFFICE_FLOORS = 24, HENDERSON_SKY_GARDEN_FLOOR = 22, HENDERSON_CLOUD_39_FLOOR = 39;
export const HENDERSON_SEELE_BANQUET_FLOORS = Object.freeze([37, 38]);
export const HENDERSON_ZHA_PROJECT_PERIOD = Object.freeze({ start: 2018, end: 2025 });
export const HENDERSON_HIP_HING_COMPLETION_YEAR = 2024, HENDERSON_WSP_STATUS = 'Completed';
export const HENDERSON_WSP_GFA = 43200, HENDERSON_COLUMN_FREE_SPAN = 26, HENDERSON_FLOOR_TO_FLOOR = 5, HENDERSON_CLEAR_HEADROOM = 3.5;
export const HENDERSON_MEGA_COLUMNS = 6, HENDERSON_CORE_SIDE = 'east';
export const HENDERSON_FACADE_PANELS_OVER = 4000, HENDERSON_FACADE_PLIES = 4, HENDERSON_FACADE_LAMINATIONS = 2;
export const HENDERSON_SEELE_PODIUM_FACADE_AREA = 1210, HENDERSON_SEELE_ENTRANCE_GLASS_HEIGHT = 11;
export const HENDERSON_CLOUD_39_FACADE_AREA = 375, HENDERSON_CLOUD_39_ROOF_PANELS = 132, HENDERSON_CLOUD_39_GLASS_FINS = 119;
export const HENDERSON_CLOUD_39_MAX_WIND_SUCTION = 6.9, HENDERSON_CLOUD_39_CEILING_HEIGHT = 8;
export const HENDERSON_CLOUD_39_BALLROOM_SQFT = 6800, HENDERSON_CLOUD_39_FOYER_SQFT = 2000, HENDERSON_CLOUD_39_TERRACE_SQFT = 980;
// Photo-directed visual controls, not surveyed floor or engineering elevations. Three silver-petal clusters pinch at
// the elevated base, hidden mid plant and just above the 22/F Sky Garden, as described by CIBSE and seen in completed photos.
export const HENDERSON_BASE_TOP = 34, HENDERSON_MID_PLANT_BOTTOM = 101, HENDERSON_SKY_GARDEN_BOTTOM = 105;
export const HENDERSON_SKY_GARDEN_TOP = 113, HENDERSON_UPPER_GLASS_TOP = 181.8, HENDERSON_CLOUD_39_BOTTOM = 174;
export const HENDERSON_CLOUD_39_ROOF_BASE = 181.8, HENDERSON_ROOF_TOP = HENDERSON_HEIGHT;
export const HENDERSON_OFFICE_COURSES = 31, HENDERSON_TARGET_PANEL_WIDTH = 1.65;
export const HENDERSON_PLAZA_TOP = .12, HENDERSON_MAIN_FORECOURT_WIDTH = 18, HENDERSON_MAIN_FORECOURT_DEPTH = 3.2;
export function hendersonEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3], dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0; for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1; return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
export function hendersonFrameToWorld(frame, x, z) { const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry); return { x: frame.x + cs * x + sn * z, z: frame.z - sn * x + cs * z }; }
function photoDirectedFrame(sourceEdge, name, evidence) {
  const i = sourceEdge * 2, ax = HENDERSON_LOCAL_RING[i], az = HENDERSON_LOCAL_RING[i + 1], bx = HENDERSON_LOCAL_RING[i + 2], bz = HENDERSON_LOCAL_RING[i + 3];
  const localX = (ax + bx) * .5, localZ = (az + bz) * .5, world = hendersonLocalToWorld(localX, localZ), edge = hendersonEdgeOutward(HENDERSON_LOCAL_RING, sourceEdge);
  const cs = Math.cos(HENDERSON_SITE.ry), sn = Math.sin(HENDERSON_SITE.ry), nx = cs * edge.nx + sn * edge.nz, nz = -sn * edge.nx + cs * edge.nz;
  return Object.freeze({ nodeId: null, sourceEdge, localX, localZ, x: world.x, z: world.z, nx, nz, ry: Math.atan2(nx, nz), name, evidence });
}
export const HENDERSON_MAIN_ENTRANCE = photoDirectedFrame(42, 'The Henderson ground-level Murray Road arrival', 'Photo-directed source-edge midpoint: completed arrival photographs show the 11 m curved glass foyer, sliding doors and mirrored soffit. No entrance-tagged OSM node exists in way 26434768 v17.');
export const HENDERSON_UPPER_ENTRANCE = photoDirectedFrame(12, 'The Henderson elevated walkway lobby', 'Photo-directed source-edge midpoint: ZHA describes a second-floor public lobby connected to the elevated walkway network; completed photographs show the curved bridge-facing lobby. Not an OSM entrance node.');
export const HENDERSON_UPPER_LOBBY_GROUND = 6.2;
export function hendersonLocalCollider(x, z, w, d, minY, maxY, ry = HENDERSON_SITE.ry) {
  const p = hendersonLocalToWorld(x, z), cs = Math.cos(ry), sn = Math.sin(ry), hx = w * .5, hz = d * .5;
  return { shape: 'box', x: p.x, z: p.z, w, d, ry, minY, maxY, minX: p.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: p.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: p.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: p.z + Math.abs(sn) * hx + Math.abs(cs) * hz, obb: { cx: p.x, cz: p.z, hx, hz, cs, sn } };
}
export function hendersonEdgeCollider(ring, edge, minY, maxY, depth = .42) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3], { ry, length } = hendersonEdgeOutward(ring, edge);
  return hendersonLocalCollider((ax + bx) * .5, (az + bz) * .5, length + .02, depth, minY, maxY, HENDERSON_SITE.ry + ry);
}
export function hendersonRingColliders(ring, minY, maxY, depth = .42) { const out = []; for (let edge = 0; edge < ring.length / 2 - 1; edge++) out.push(hendersonEdgeCollider(ring, edge, minY, maxY, depth)); return out; }
export function hendersonSegmentCollider(ring, edge, t0, t1, minY, maxY, depth = .3) {
  const i = edge * 2, tm = (t0 + t1) * .5, { ry, length } = hendersonEdgeOutward(ring, edge), x = ring[i] + (ring[i + 2] - ring[i]) * tm, z = ring[i + 1] + (ring[i + 3] - ring[i + 1]) * tm;
  return hendersonLocalCollider(x, z, length * (t1 - t0), depth, minY, maxY, HENDERSON_SITE.ry + ry);
}
export function hendersonFrameCollider(frame, x, z, w, d, minY, maxY, base = 0) {
  const p = hendersonFrameToWorld(frame, x, z), ry = frame.ry, cs = Math.cos(ry), sn = Math.sin(ry), hx = w * .5, hz = d * .5;
  return { shape: 'box', x: p.x, z: p.z, w, d, ry, minY: minY + base, maxY: maxY + base, minX: p.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: p.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: p.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: p.z + Math.abs(sn) * hx + Math.abs(cs) * hz, obb: { cx: p.x, cz: p.z, hx, hz, cs, sn } };
}
function forecourtRing(frame, width, depth) {
  const ring = [];
  for (const [x, z] of [[-width * .5, -1], [width * .5, -1], [width * .5, depth], [-width * .5, depth], [-width * .5, -1]]) {
    const point = hendersonFrameToWorld(frame, x, z); ring.push(point.x, point.z);
  }
  return Object.freeze(ring);
}
export const HENDERSON_MAIN_FORECOURT_RING = forecourtRing(HENDERSON_MAIN_ENTRANCE, HENDERSON_MAIN_FORECOURT_WIDTH, HENDERSON_MAIN_FORECOURT_DEPTH);
export const HENDERSON_GROUND_RINGS = Object.freeze([HENDERSON_SITE.ring, HENDERSON_MAIN_FORECOURT_RING]);
function inForecourt(frame, width, depth, x, z) { const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry), dx = x - frame.x, dz = z - frame.z, lx = cs * dx - sn * dz, lz = sn * dx + cs * dz; return Math.abs(lx) <= width * .5 && lz >= -1 && lz <= depth; }
export function isHendersonMainForecourtPoint(x, z) { return inForecourt(HENDERSON_MAIN_ENTRANCE, HENDERSON_MAIN_FORECOURT_WIDTH, HENDERSON_MAIN_FORECOURT_DEPTH, x, z); }
export function isHendersonPlazaPoint(x, z) { return pointInFlatRing(HENDERSON_SITE.ring, x, z) || isHendersonMainForecourtPoint(x, z); }
export function hendersonGroundHeightAt(x, z, ground, grounds) {
  if (isHendersonMainForecourtPoint(x, z) || pointInFlatRing(HENDERSON_SITE.ring, x, z)) return grounds.plaza;
  return ground;
}
