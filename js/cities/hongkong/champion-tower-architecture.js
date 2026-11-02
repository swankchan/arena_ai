// HK-B0022 Champion Tower: exact OSM tower plan and renderer-independent architectural datums.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';

const geometry = (rows) => Object.freeze(rows.map(([id, lon, lat]) => Object.freeze({ id, lon, lat })));
export const CHAMPION_TOWER_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-02',
  sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/85320726/full.json', type: 'way', id: 85320726, version: 9,
  tags: Object.freeze({
    building: 'yes', 'building:levels': '51', 'building:use': 'office', height: '205',
    name: '冠君大廈 Champion Tower', 'name:en': 'Champion Tower', 'name:zh': '冠君大廈',
    'name:zh-Hans': '冠君大厦', 'name:zh-Hant': '冠君大廈', old_name: '花旗銀行大廈 Citibank Tower',
    'old_name:en': 'Citibank Tower', 'old_name:zh': '花旗銀行大廈'
  }),
  // The 15 unique nodes describe Champion Tower only, not the whole Three Garden Road complex or ICBC Tower.
  geometry: geometry([
    [1235363357,114.1608125,22.2784524], [1235363465,114.1607894,22.2784938],
    [989119121,114.1607351,22.2785688], [989119865,114.1606188,22.2786636],
    [1234054084,114.1605447,22.2786907], [989119311,114.1605249,22.2786980],
    [1235363419,114.1604826,22.2786429], [989119713,114.1604509,22.2786827],
    [989119459,114.1603644,22.2783992], [2496629657,114.1604975,22.2782857],
    [989118928,114.1607350,22.2780832], [13232448048,114.1607411,22.2781127],
    [989119664,114.1607454,22.2781332], [1235363528,114.1607684,22.2782433],
    [989119680,114.1608057,22.2784200], [1235363357,114.1608125,22.2784524]
  ])
});

const KX = 103056.81753522092, KY = 110734.09626824585;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];
const worldRing = Object.freeze(CHAMPION_TOWER_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat)));
const footprint = minimumAreaObb(worldRing);
let signedArea = 0;
for (let i = 0; i + 3 < worldRing.length; i += 2) signedArea += worldRing[i] * worldRing[i + 3] - worldRing[i + 2] * worldRing[i + 1];
export const CHAMPION_TOWER_RING_AREA = Math.abs(signedArea * 0.5);
export const CHAMPION_TOWER_SITE = Object.freeze({
  name: '冠君大廈 Champion Tower', englishName: 'Champion Tower', address: '花園道3號 3 Garden Road',
  osmType: 'way', osmId: CHAMPION_TOWER_OSM_SOURCE.id, source: CHAMPION_TOWER_OSM_SOURCE,
  ring: worldRing, bounds: flatRingBounds(worldRing), ...footprint
});
export function championTowerLocalToWorld(x, z) {
  const site = CHAMPION_TOWER_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return { x: site.x + cs * x + sn * z, z: site.z - sn * x + cs * z };
}
export function championTowerWorldToLocal(x, z) {
  const site = CHAMPION_TOWER_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry), dx = x - site.x, dz = z - site.z;
  return { x: dx * cs - dz * sn, z: dx * sn + dz * cs };
}
export const CHAMPION_TOWER_LOCAL_RING = Object.freeze(worldRing.flatMap((value, index, array) => {
  if (index % 2) return []; const point = championTowerWorldToLocal(value, array[index + 1]); return [point.x, point.z];
}));
export const CHAMPION_TOWER_GROUND_SAMPLE = Object.freeze({ x: CHAMPION_TOWER_SITE.x, z: CHAMPION_TOWER_SITE.z });

// Published conventions remain separate: the official tower is 47 storeys; OSM currently says 51 and Centadata says 50.
export const CHAMPION_TOWER_OSM_HEIGHT = 205;
export const CHAMPION_TOWER_HEIGHT = 205;
export const CHAMPION_TOWER_ROOF_HEIGHT = 205;
export const CHAMPION_TOWER_OSM_LEVELS = 51;
export const CHAMPION_TOWER_OFFICIAL_LEVELS = 47;
export const CHAMPION_TOWER_CENTADATA_LEVELS = 50;
export const CHAMPION_TOWER_ICBC_LEVELS = 37;
export const CHAMPION_TOWER_COMPLETION_YEAR = 1992;
export const CHAMPION_TOWER_ARCHITECT = 'Rocco Yim / Rocco Design Architects';
export const CHAMPION_TOWER_GFA_SQFT = 770000;
export const CHAMPION_TOWER_TYPICAL_LETTABLE_SQFT = 17300;
export const CHAMPION_TOWER_COMPLEX_GFA_SQFT = 1559000;
export const CHAMPION_TOWER_COMPLEX_GFA_M2 = 144800;
export const CHAMPION_TOWER_COMBINED_LETTABLE_SQFT = 34000;
export const CHAMPION_TOWER_CONNECTABLE_FLOORS = 26;
export const CHAMPION_TOWER_COMPLEX_LIFT_ZONES = 9;
export const CHAMPION_TOWER_HIGH_SPEED_LIFTS_PER_ZONE = 4;
export const CHAMPION_TOWER_COMPLEX_SERVICE_LIFTS = 4;
export const CHAMPION_TOWER_PARKING_SPACES = 558;

// Photograph-directed visual datums, not surveyed floor levels. The 42 m lobby expresses the published ten-storey glass wall.
export const CHAMPION_TOWER_PLAZA_TOP = 0.12;
export const CHAMPION_TOWER_LOBBY_TOP = 42;
export const CHAMPION_TOWER_OFFICE_TOP = 192;
export const CHAMPION_TOWER_OFFICE_COURSES = 37;
export const CHAMPION_TOWER_PANEL_WIDTH = 1.55;
export const CHAMPION_TOWER_LOBBY_PANEL_WIDTH = 3.6;
export const CHAMPION_TOWER_BELT_LEVELS = Object.freeze([94, 144]);
export const CHAMPION_TOWER_BELT_HEIGHT = 3.6;
export const CHAMPION_TOWER_ENTRANCE_EDGE = 12;
export const CHAMPION_TOWER_CURVED_LOBBY_EDGES = Object.freeze([0, 1, 2, 3, 4, 5, 6, 10, 11, 12, 13, 14]);
export function championTowerEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0;
  for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1;
  return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
function edgeFrame(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const localX = (ax + bx) * 0.5, localZ = (az + bz) * 0.5, world = championTowerLocalToWorld(localX, localZ);
  const data = championTowerEdgeOutward(ring, edge), cs = Math.cos(CHAMPION_TOWER_SITE.ry), sn = Math.sin(CHAMPION_TOWER_SITE.ry);
  const nx = cs * data.nx + sn * data.nz, nz = -sn * data.nx + cs * data.nz;
  return Object.freeze({
    edge, localX, localZ, x: world.x, z: world.z, ry: Math.atan2(nx, nz), nx, nz,
    evidence: 'Photo- and address-directed Garden Road lobby entrance; the OSM way has no entrance-tagged node'
  });
}
export const CHAMPION_TOWER_ENTRANCE = edgeFrame(CHAMPION_TOWER_LOCAL_RING, CHAMPION_TOWER_ENTRANCE_EDGE);
export const CHAMPION_TOWER_ENTRANCE_FORECOURT_WIDTH = 10.8;
export const CHAMPION_TOWER_ENTRANCE_FORECOURT_DEPTH = 3.2;
export function championTowerFrameToWorld(frame, x, z) {
  const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry);
  return { x: frame.x + cs * x + sn * z, z: frame.z - sn * x + cs * z };
}
export function championTowerLocalCollider(x, z, w, d, minY, maxY, ry = CHAMPION_TOWER_SITE.ry) {
  const point = championTowerLocalToWorld(x, z), cs = Math.cos(ry), sn = Math.sin(ry), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: point.x, z: point.z, w, d, ry, minY, maxY,
    minX: point.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: point.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: point.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: point.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: point.x, cz: point.z, hx, hz, cs, sn } };
}
export function championTowerEdgeCollider(ring, edge, minY, maxY, depth = 0.62) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const { ry, length } = championTowerEdgeOutward(ring, edge);
  return championTowerLocalCollider((ax + bx) * 0.5, (az + bz) * 0.5, length + 0.03, depth, minY, maxY, CHAMPION_TOWER_SITE.ry + ry);
}
export function championTowerRingColliders(ring, minY, maxY, depth = 0.62) {
  const result = [];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) result.push(championTowerEdgeCollider(ring, edge, minY, maxY, depth));
  return result;
}
export function championTowerFrameCollider(frame, x, z, w, d, minY, maxY, base = 0) {
  const point = championTowerFrameToWorld(frame, x, z), ry = frame.ry, cs = Math.cos(ry), sn = Math.sin(ry), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: point.x, z: point.z, w, d, ry, minY: minY + base, maxY: maxY + base,
    minX: point.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: point.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: point.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: point.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: point.x, cz: point.z, hx, hz, cs, sn } };
}
export function isChampionTowerEntranceForecourtPoint(x, z) {
  const frame = CHAMPION_TOWER_ENTRANCE, cs = Math.cos(frame.ry), sn = Math.sin(frame.ry), dx = x - frame.x, dz = z - frame.z;
  const localX = cs * dx - sn * dz, localZ = sn * dx + cs * dz;
  return Math.abs(localX) <= CHAMPION_TOWER_ENTRANCE_FORECOURT_WIDTH * 0.5 + 1e-9 && localZ >= -0.20 && localZ <= CHAMPION_TOWER_ENTRANCE_FORECOURT_DEPTH;
}
export function isChampionTowerPlazaPoint(x, z) {
  if (isChampionTowerEntranceForecourtPoint(x, z)) return true;
  const ring = CHAMPION_TOWER_SITE.ring;
  if (pointInFlatRing(ring, x, z)) return true;
  for (let i = 0; i + 3 < ring.length; i += 2) {
    const ax = ring[i], az = ring[i + 1], dx = ring[i + 2] - ax, dz = ring[i + 3] - az;
    const lengthSq = dx * dx + dz * dz, t = lengthSq ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq)) : 0;
    if (Math.hypot(x - ax - dx * t, z - az - dz * t) < 1e-7) return true;
  }
  return false;
}
export function championTowerGroundHeightAt(x, z, ground, grounds) {
  // The terrain renderer and ground query share this exact DTM-derived level pad; the arrival strip cannot become a doorstep.
  return isChampionTowerPlazaPoint(x, z) ? grounds.plaza : ground;
}
