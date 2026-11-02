// HK-B0021 One International Finance Centre: exact OSM tower plan and renderer-independent design datums.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';

const geometry = (rows) => Object.freeze(rows.map(([id, lon, lat]) => Object.freeze({ id, lon, lat })));
export const ONE_IFC_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-02',
  sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/148554945/full.json', type: 'way', id: 148554945, version: 14,
  tags: Object.freeze({
    'addr:housenumber': '8', 'addr:street': '金融街 Finance Street', building: 'yes', 'building:levels': '38',
    'building:material': 'glass', 'building:use': 'office', height: '210', layer: '3',
    name: '國際金融中心一期 One International Finance Centre', 'name:en': 'One International Finance Centre',
    'name:yue': '國際金融中心一期', 'name:zh': '國際金融中心一期', 'roof:material': 'concrete'
  }),
  // The 32 unique nodes form the stepped-square tower plan visible in the published typical floor plan.
  geometry: geometry([
    [12249411058,114.1572026,22.2850013], [12249411062,114.1570033,22.2848594],
    [12249411063,114.1569893,22.2848762], [12249411049,114.1569559,22.2848524],
    [12249411059,114.1569390,22.2848728], [12249411048,114.1568999,22.2848775],
    [12249411060,114.1568779,22.2848618], [12249411061,114.1568522,22.2848927],
    [12249411047,114.1568341,22.2848799], [12249411046,114.1566807,22.2850643],
    [12249411045,114.1566989,22.2850773], [12249411044,114.1566732,22.2851081],
    [12249411053,114.1566952,22.2851239], [12249411054,114.1567003,22.2851600],
    [12249411055,114.1566833,22.2851804], [12249411056,114.1567167,22.2852042],
    [12249411043,114.1567028,22.2852209], [12249411050,114.1569022,22.2853628],
    [12249411042,114.1569161,22.2853460], [12249411041,114.1569495,22.2853698],
    [12249411040,114.1569665,22.2853494], [12249411039,114.1570055,22.2853447],
    [12249411051,114.1570276,22.2853604], [12249411052,114.1570533,22.2853295],
    [12249411038,114.1570714,22.2853423], [12249411037,114.1572247,22.2851579],
    [12249411036,114.1572066,22.2851450], [12249411035,114.1572320,22.2851144],
    [12249411013,114.1572100,22.2850987], [12249411057,114.1572051,22.2850622],
    [12249411034,114.1572221,22.2850418], [12249411033,114.1571887,22.2850180],
    [12249411058,114.1572026,22.2850013]
  ])
});

const KX = 103056.81753522092, KY = 110734.09626824585;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];
const worldRing = Object.freeze(ONE_IFC_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat)));
const footprint = minimumAreaObb(worldRing);
export const ONE_IFC_SITE = Object.freeze({
  name: '國際金融中心一期 One International Finance Centre', englishName: 'One International Finance Centre',
  // SHKP and CTBUH give 1 Harbour View Street; the raw OSM addr tags say 8 Finance Street and are preserved, not silently mixed.
  address: '港景街1號 1 Harbour View Street', osmType: 'way', osmId: ONE_IFC_OSM_SOURCE.id,
  source: ONE_IFC_OSM_SOURCE, ring: worldRing, bounds: flatRingBounds(worldRing), ...footprint
});
export function oneIfcLocalToWorld(x, z) {
  const site = ONE_IFC_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return { x: site.x + cs * x + sn * z, z: site.z - sn * x + cs * z };
}
export function oneIfcWorldToLocal(x, z) {
  const site = ONE_IFC_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry), dx = x - site.x, dz = z - site.z;
  return { x: dx * cs - dz * sn, z: dx * sn + dz * cs };
}
export const ONE_IFC_LOCAL_RING = Object.freeze(worldRing.flatMap((value, index, array) => {
  if (index % 2) return []; const point = oneIfcWorldToLocal(value, array[index + 1]); return [point.x, point.z];
}));
export const ONE_IFC_GROUND_SAMPLE = Object.freeze({ x: ONE_IFC_SITE.x, z: ONE_IFC_SITE.z });

// Source conventions remain separate. OSM and CTBUH agree on 210 m / 38 above-ground levels, but not completion year.
export const ONE_IFC_OSM_HEIGHT = 210;
export const ONE_IFC_HEIGHT = 210;
export const ONE_IFC_TO_TIP_HEIGHT = 210;
export const ONE_IFC_OSM_LEVELS = 38;
export const ONE_IFC_CTBUH_LEVELS = 38;
export const ONE_IFC_CTBUH_UNDERGROUND_LEVELS = 4;
export const ONE_IFC_CTBUH_COMPLETION_YEAR = 1999;
export const ONE_IFC_PUBLISHED_COMPLETION_YEAR = 1998;
export const ONE_IFC_PUBLISHED_LEVELS = 39;
export const ONE_IFC_INTERASIA_LEVELS = 41;
export const ONE_IFC_CTBUH_TOWER_GFA = 72880;
export const ONE_IFC_INTERASIA_GFA_SQFT = 647868;
export const ONE_IFC_TYPICAL_LETTABLE_SQFT = 21000;
export const ONE_IFC_PASSENGER_LIFTS = 18;
export const ONE_IFC_CARGO_LIFTS = 2;
export const ONE_IFC_TRADING_FLOORS = 4;
export const ONE_IFC_STRUCTURE = 'All-Steel';

// Visual module and massing controls are photograph / contractor-description directed, not surveyed floor elevations.
export const ONE_IFC_PLAZA_TOP = 0.12;
export const ONE_IFC_PODIUM_TOP = 14;
export const ONE_IFC_GROUND_SOFFIT = 12;
export const ONE_IFC_PANEL_WIDTH = 1.61;
export const ONE_IFC_OFFICE_PANEL_HEIGHT = 4.17;
export const ONE_IFC_TRADING_PANEL_HEIGHT = 4.85;
export const ONE_IFC_VISUAL_COURSES = 38;
export const ONE_IFC_GLAZED_CROWN_TOP = 202;
export const ONE_IFC_DRIVETHROUGH_EDGE = 0;
export const ONE_IFC_ENTRANCE_EDGE = 24;
export const ONE_IFC_BELT_LEVELS = Object.freeze([82, 142, 176]);
export const ONE_IFC_BELT_HEIGHT = 2.7;
export const ONE_IFC_TIERS = Object.freeze([
  Object.freeze({ id: 'podium', kind: 'podium', y0: ONE_IFC_PLAZA_TOP, y1: 14, bottomScale: 1, topScale: 1, courses: 0 }),
  Object.freeze({ id: 'lower-shaft', kind: 'office', y0: 14, y1: 82, bottomScale: 0.992, topScale: 0.985, courses: 14 }),
  Object.freeze({ id: 'middle-shaft', kind: 'office', y0: 82, y1: 142, bottomScale: 0.968, topScale: 0.935, courses: 12 }),
  Object.freeze({ id: 'upper-shaft', kind: 'office', y0: 142, y1: 176, bottomScale: 0.918, topScale: 0.882, courses: 7 }),
  Object.freeze({ id: 'crown-shoulder', kind: 'office', y0: 176, y1: 192, bottomScale: 0.862, topScale: 0.812, courses: 3 }),
  Object.freeze({ id: 'glazed-crown', kind: 'crown', y0: 192, y1: 202, bottomScale: 0.792, topScale: 0.742, courses: 2 })
]);
export const ONE_IFC_CURTAIN_TIERS = Object.freeze(ONE_IFC_TIERS.filter((tier) => tier.kind !== 'podium'));
export const ONE_IFC_OPEN_CROWN = Object.freeze({ y0: 202, y1: 210, bottomScale: 0.742, topScale: 0.680 });
export const ONE_IFC_SETBACK_COUNT = 4;
if (ONE_IFC_CURTAIN_TIERS.reduce((sum, tier) => sum + tier.courses, 0) !== ONE_IFC_VISUAL_COURSES) {
  throw new Error('One IFC visual course allocation is inconsistent');
}
export function oneIfcScaleAt(y) {
  if (y >= ONE_IFC_OPEN_CROWN.y0) {
    const crown = ONE_IFC_OPEN_CROWN, t = Math.max(0, Math.min(1, (y - crown.y0) / (crown.y1 - crown.y0)));
    return crown.bottomScale + (crown.topScale - crown.bottomScale) * t;
  }
  const tier = ONE_IFC_TIERS.find((entry) => y >= entry.y0 && y < entry.y1) || ONE_IFC_TIERS[0];
  const t = Math.max(0, Math.min(1, (y - tier.y0) / (tier.y1 - tier.y0)));
  return tier.bottomScale + (tier.topScale - tier.bottomScale) * t;
}
export function oneIfcRingAtScale(scale) {
  return Object.freeze(ONE_IFC_LOCAL_RING.map((value) => value * scale));
}
export function oneIfcEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0;
  for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1;
  return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
function edgeFrame(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const localX = (ax + bx) * 0.5, localZ = (az + bz) * 0.5, world = oneIfcLocalToWorld(localX, localZ);
  const data = oneIfcEdgeOutward(ring, edge), cs = Math.cos(ONE_IFC_SITE.ry), sn = Math.sin(ONE_IFC_SITE.ry);
  const nx = cs * data.nx + sn * data.nz, nz = -sn * data.nx + cs * data.nz;
  return Object.freeze({
    edge, localX, localZ, x: world.x, z: world.z, ry: Math.atan2(nx, nz), nx, nz,
    evidence: 'Photo-directed main entrance on the long Harbour View Street elevation; the OSM way has no entrance-tagged node'
  });
}
export const ONE_IFC_ENTRANCE = edgeFrame(ONE_IFC_LOCAL_RING, ONE_IFC_ENTRANCE_EDGE);
export const ONE_IFC_ENTRANCE_FORECOURT_WIDTH = 12.8;
export const ONE_IFC_ENTRANCE_FORECOURT_DEPTH = 3.0;
export function oneIfcFrameToWorld(frame, x, z) {
  const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry);
  return { x: frame.x + cs * x + sn * z, z: frame.z - sn * x + cs * z };
}

export function oneIfcLocalCollider(x, z, w, d, minY, maxY, ry = ONE_IFC_SITE.ry) {
  const point = oneIfcLocalToWorld(x, z), cs = Math.cos(ry), sn = Math.sin(ry), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: point.x, z: point.z, w, d, ry, minY, maxY,
    minX: point.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: point.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: point.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: point.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: point.x, cz: point.z, hx, hz, cs, sn } };
}
export function oneIfcEdgeCollider(ring, edge, minY, maxY, depth = 0.72) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const { ry, length } = oneIfcEdgeOutward(ring, edge);
  return oneIfcLocalCollider((ax + bx) * 0.5, (az + bz) * 0.5, length + 0.04, depth, minY, maxY, ONE_IFC_SITE.ry + ry);
}
export function oneIfcRingColliders(ring, minY, maxY, depth = 0.72) {
  const result = [];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) result.push(oneIfcEdgeCollider(ring, edge, minY, maxY, depth));
  return result;
}
export function oneIfcFrameCollider(frame, x, z, w, d, minY, maxY, base = 0) {
  const point = oneIfcFrameToWorld(frame, x, z), ry = frame.ry, cs = Math.cos(ry), sn = Math.sin(ry), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: point.x, z: point.z, w, d, ry, minY: minY + base, maxY: maxY + base,
    minX: point.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: point.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: point.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: point.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: point.x, cz: point.z, hx, hz, cs, sn } };
}
export function isOneIfcEntranceForecourtPoint(x, z) {
  const frame = ONE_IFC_ENTRANCE, cs = Math.cos(frame.ry), sn = Math.sin(frame.ry), dx = x - frame.x, dz = z - frame.z;
  const localX = cs * dx - sn * dz, localZ = sn * dx + cs * dz;
  return Math.abs(localX) <= ONE_IFC_ENTRANCE_FORECOURT_WIDTH * 0.5 + 1e-9 && localZ >= -0.20 && localZ <= ONE_IFC_ENTRANCE_FORECOURT_DEPTH;
}
export function isOneIfcPlazaPoint(x, z) {
  if (isOneIfcEntranceForecourtPoint(x, z)) return true;
  const ring = ONE_IFC_SITE.ring;
  if (pointInFlatRing(ring, x, z)) return true;
  for (let i = 0; i + 3 < ring.length; i += 2) {
    const ax = ring[i], az = ring[i + 1], dx = ring[i + 2] - ax, dz = ring[i + 3] - az;
    const lengthSq = dx * dx + dz * dz, t = lengthSq ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq)) : 0;
    if (Math.hypot(x - ax - dx * t, z - az - dz * t) < 1e-7) return true;
  }
  return false;
}
export function oneIfcGroundHeightAt(x, z, ground, grounds) {
  // The exterior arrival strip is deliberately level; a higher raw DTM sample must not recreate a doorstep.
  if (isOneIfcEntranceForecourtPoint(x, z)) return grounds.plaza;
  return isOneIfcPlazaPoint(x, z) ? Math.max(ground, grounds.plaza) : ground;
}
