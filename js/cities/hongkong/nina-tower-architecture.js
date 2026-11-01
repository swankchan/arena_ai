import { flatRingBounds, minimumAreaObb, pointInFlatRing } from './landmark-site.js';

// Nina Tower, 8 Yeung Uk Road. The current OSM ways are absent from the older local landmark cache, so preserve
// the retrieved WGS84 geometry and provenance rather than substituting the surrounding commercial land-use polygon.
const geometry = (points) => Object.freeze(points.map(([lon, lat]) => Object.freeze({ lon, lat })));
const tags = (value) => Object.freeze(value);
export const NINA_TOWER_MAIN_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-01',
  sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/112284860/full.json',
  type: 'way', id: 112284860, version: 13, timestamp: '2023-10-11T13:09:56Z',
  tags: tags({ building: 'commercial', buildingLevels: 80, buildingMaterial: 'glass', height: 318, layer: 1 }),
  geometry: geometry([
    [114.1127890, 22.3686115], [114.1127947, 22.3685937], [114.1128061, 22.3685783],
    [114.1128220, 22.3685669], [114.1128410, 22.3685605], [114.1128611, 22.3685598],
    [114.1128666, 22.3685401], [114.1131648, 22.3686112], [114.1131594, 22.3686308],
    [114.1131766, 22.3686404], [114.1131899, 22.3686545], [114.1131978, 22.3686716],
    [114.1131996, 22.3686901], [114.1131952, 22.3687082], [114.1131844, 22.3687469],
    [114.1131489, 22.3688752], [114.1131368, 22.3689190], [114.1131331, 22.3689317],
    [114.1131172, 22.3689883], [114.1130633, 22.3689754], [114.1129142, 22.3689399],
    [114.1127651, 22.3689044], [114.1127110, 22.3688915], [114.1127303, 22.3688221],
    [114.1127413, 22.3687827], [114.1127890, 22.3686115]
  ])
});
export const NINA_TOWER_HOTEL_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-01',
  sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/112284790/full.json',
  type: 'way', id: 112284790, version: 22, timestamp: '2026-08-05T07:36:12Z',
  tags: tags({ building: 'commercial', buildingLevels: 42, buildingMaterial: 'glass', layer: 1, tourism: 'hotel' }),
  geometry: geometry([
    [114.1133789, 22.3686318], [114.1134263, 22.3685768], [114.1134598, 22.3685136],
    [114.1134781, 22.3684453], [114.1134803, 22.3683750], [114.1134662, 22.3683059],
    [114.1134365, 22.3682411], [114.1134687, 22.3682280], [114.1136058, 22.3681727],
    [114.1136347, 22.3682339], [114.1136544, 22.3682980], [114.1136647, 22.3683640],
    [114.1136651, 22.3683974], [114.1136654, 22.3684307], [114.1136564, 22.3684969],
    [114.1136472, 22.3685291], [114.1136380, 22.3685613], [114.1136104, 22.3686230],
    [114.1135741, 22.3686806], [114.1135591, 22.3686985], [114.1135298, 22.3687333],
    [114.1134783, 22.3687800], [114.1134439, 22.3688037], [114.1133200, 22.3686763],
    [114.1133789, 22.3686318]
  ])
});
export const NINA_TOWER_PODIUM_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-01',
  sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/492365420/full.json',
  type: 'way', id: 492365420, version: 22, timestamp: '2023-10-11T13:09:56Z',
  tags: tags({ building: 'retail', shop: 'mall', name: '如心廣場一期 Nina Mall I' }),
  geometry: geometry([
    [114.1124245, 22.3677466], [114.1118962, 22.3680417], [114.1119145, 22.3680698],
    [114.1119313, 22.3680955], [114.1119645, 22.3681463], [114.1123495, 22.3687357],
    [114.1123749, 22.3687746], [114.1123891, 22.3687964], [114.1124034, 22.3688182],
    [114.1125189, 22.3688457], [114.1127110, 22.3688915], [114.1127651, 22.3689044],
    [114.1129142, 22.3689399], [114.1130633, 22.3689754], [114.1131172, 22.3689883],
    [114.1131331, 22.3689317], [114.1131368, 22.3689190], [114.1131489, 22.3688752],
    [114.1131844, 22.3687469], [114.1132333, 22.3687379], [114.1132802, 22.3687221],
    [114.1133242, 22.3686999], [114.1133234, 22.3687393], [114.1133289, 22.3687784],
    [114.1133403, 22.3688163], [114.1133575, 22.3688523], [114.1134206, 22.3688199],
    [114.1134439, 22.3688037], [114.1134783, 22.3687800], [114.1135298, 22.3687333],
    [114.1135591, 22.3686985], [114.1135741, 22.3686806], [114.1136104, 22.3686230],
    [114.1136380, 22.3685613], [114.1136472, 22.3685291], [114.1136564, 22.3684969],
    [114.1136654, 22.3684307], [114.1136651, 22.3683974], [114.1136647, 22.3683640],
    [114.1136544, 22.3682980], [114.1136347, 22.3682339], [114.1136058, 22.3681727],
    [114.1134687, 22.3682280], [114.1134395, 22.3681842], [114.1134031, 22.3681451],
    [114.1133606, 22.3681118], [114.1133129, 22.3680851], [114.1132612, 22.3680656],
    [114.1132069, 22.3680540], [114.1131513, 22.3680503], [114.1130958, 22.3680548],
    [114.1130417, 22.3680674], [114.1129904, 22.3680876], [114.1129721, 22.3680506],
    [114.1129476, 22.3680168], [114.1129174, 22.3679871], [114.1128824, 22.3679624],
    [114.1128436, 22.3679432], [114.1128019, 22.3679301], [114.1128227, 22.3678747],
    [114.1124245, 22.3677466]
  ])
});

// Same WGS84 -> app-grid transform as tools/geo/frame.mjs and every Hong Kong builder: x east, z south.
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
function makeSite(name, englishName, source) {
  const ring = projectRing(source), footprint = minimumAreaObb(ring);
  const site = Object.freeze({ name, englishName, address: '楊屋道八號 8 Yeung Uk Road', osmType: 'way', osmId: source.id,
    source, ring, bounds: flatRingBounds(ring), ...footprint });
  return Object.freeze({ ...site, localRing: localRing(site) });
}
export const NINA_TOWER_MAIN_SITE = makeSite('如心廣場高座', 'Nina Tower / Teddy Tower', NINA_TOWER_MAIN_OSM_SOURCE);
export const NINA_TOWER_HOTEL_SITE = makeSite('如心廣場低座', 'Nina Tower II / Nina Hotel', NINA_TOWER_HOTEL_OSM_SOURCE);
export const NINA_TOWER_PODIUM_SITE = makeSite('如心廣場一期', 'Nina Mall I', NINA_TOWER_PODIUM_OSM_SOURCE);

// Source conventions stay separate: OSM 318 m is not silently substituted for the external architectural survey.
export const NINA_TOWER_OSM_HEIGHT = 318;
export const NINA_TOWER_HEIGHT = 320.4;
export const NINA_TOWER_ROOF_HEIGHT = 319.8;
export const NINA_TOWER_OCCUPIED_HEIGHT = 301.1;
export const NINA_TOWER_OBSERVATORY_HEIGHT = 151.7;
export const NINA_TOWER_LEVELS = 80;
export const NINA_TOWER_TOP_LEVEL_LABEL = 89;
export const NINA_TOWER_BELOW_GROUND_LEVELS = 2;
export const NINA_TOWER_HOTEL_HEIGHT = 170.4;
export const NINA_TOWER_HOTEL_OCCUPIED_HEIGHT = 148.1;
export const NINA_TOWER_HOTEL_LEVELS = 42;
export const NINA_TOWER_HOTEL_LOCAL_REPORTED_HEIGHT = 163.7;
export const NINA_TOWER_PODIUM_SOFFIT = 8;
export const NINA_TOWER_PODIUM_ROOF = 24;
export const NINA_TOWER_PLAZA_TOP = 0.12;
export const NINA_TOWER_SKYBRIDGE_FLOOR = NINA_TOWER_HOTEL_OCCUPIED_HEIGHT;
export const NINA_TOWER_SKYBRIDGE_TRUSS_DEPTH = 3;
export const NINA_TOWER_MAIN_PLANT_LEVELS = Object.freeze([24, 25, 32, 52, 53, 54, 73, 76]);
// Hotel louvre bands are visual photograph controls, not a claimed measured services-floor schedule.
export const NINA_TOWER_HOTEL_LOUVRE_LEVELS = Object.freeze([9, 20, 21, 41, 42]);
export function ninaTowerMainFloorY(level) { return NINA_TOWER_OCCUPIED_HEIGHT * level / NINA_TOWER_LEVELS; }
export function ninaTowerHotelFloorY(level) { return NINA_TOWER_HOTEL_OCCUPIED_HEIGHT * level / NINA_TOWER_HOTEL_LEVELS; }
export function ninaTowerMainRoofAt(x) {
  return NINA_TOWER_ROOF_HEIGHT - 7.2 * Math.min(1, (x / (NINA_TOWER_MAIN_SITE.w * 0.5)) ** 2);
}
export function ninaTowerHotelRoofAt(x) {
  const t = Math.min(1, Math.abs(x) / (NINA_TOWER_HOTEL_SITE.w * 0.5));
  return NINA_TOWER_HOTEL_HEIGHT - 0.6 - 8.5 * (1 - t * t);
}
export function ninaTowerLocalToWorld(site, x, z) {
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return { x: site.x + cs * x + sn * z, z: site.z - sn * x + cs * z };
}
export function ninaTowerLocalCollider(site, { x = 0, z = 0, w, d, minY, maxY, ry = 0 }) {
  const centre = ninaTowerLocalToWorld(site, x, z), heading = site.ry + ry;
  const cs = Math.cos(heading), sn = Math.sin(heading), hx = w * 0.5, hz = d * 0.5;
  return { minX: centre.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: centre.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: centre.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: centre.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    minY, maxY, obb: { cx: centre.x, cz: centre.z, hx, hz, cs, sn } };
}
export function ninaTowerEdgeCollider(ring, edge, minY, maxY, thickness = 0.8) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx);
  const cs = Math.cos(ry), sn = Math.sin(ry), cx = (ax + bx) * 0.5, cz = (az + bz) * 0.5;
  const hx = (length + thickness) * 0.5, hz = thickness * 0.5;
  return { minX: cx - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: cx + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: cz - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: cz + Math.abs(sn) * hx + Math.abs(cs) * hz,
    minY, maxY, obb: { cx, cz, hx, hz, cs, sn } };
}
export function ninaTowerRingColliders(site, minY, maxY, thickness = 0.8) {
  return Array.from({ length: site.localRing.length / 2 }, (_, edge) =>
    ninaTowerEdgeCollider(site.ring, edge, minY, maxY, thickness));
}
export function isNinaTowerPlazaPoint(x, z) { return pointInFlatRing(NINA_TOWER_PODIUM_SITE.ring, x, z); }

export function ninaTowerEdgeOutward(ring, edge) {
  let area = 0;
  for (let i = 0; i + 3 < ring.length; i += 2) area += ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1];
  const i = edge * 2, dx = ring[i + 2] - ring[i], dz = ring[i + 3] - ring[i + 1];
  const length = Math.hypot(dx, dz) || 1, sign = area >= 0 ? 1 : -1;
  return { nx: dz / length * sign, nz: -dx / length * sign, length };
}

// Surface service-road corridors cross these podium edges. Keep the ground storey open here; the occupied mall
// starts at the eight-metre soffit. Underground tunnel ways retain their independent vertical profiles.
export const NINA_TOWER_PODIUM_VEHICLE_PORTAL_EDGES = Object.freeze([3, 4, 5, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 45, 46, 47]);
export const NINA_TOWER_PODIUM_ENTRANCE_EDGE = 2;
// Geometry vertex 2 is OSM node 6298459729, tagged entrance=yes. It is a real pedestrian entrance away from the
// service-road portals; node 4843898173 is another entrance at vertex 47, where this model preserves the vehicle opening.
export const NINA_TOWER_ENTRANCE = Object.freeze((() => {
  const ring = NINA_TOWER_PODIUM_SITE.ring, edge = NINA_TOWER_PODIUM_ENTRANCE_EDGE, i = edge * 2;
  const { nx, nz } = ninaTowerEdgeOutward(ring, edge);
  return { nodeId: 6298459729, sourceUrl: 'https://api.openstreetmap.org/api/0.6/node/6298459729.json',
    x: ring[i], z: ring[i + 1], nx, nz, ry: Math.atan2(nx, nz) };
})());

function boundaryToward(site, target) {
  const dx = target.x - site.x, dz = target.z - site.z, length = Math.hypot(dx, dz), ux = dx / length, uz = dz / length;
  const hits = [];
  for (let i = 0; i + 3 < site.ring.length; i += 2) {
    const ax = site.ring[i], az = site.ring[i + 1], sx = site.ring[i + 2] - ax, sz = site.ring[i + 3] - az;
    const denominator = ux * sz - uz * sx;
    if (Math.abs(denominator) < 1e-9) continue;
    const qx = ax - site.x, qz = az - site.z, t = (qx * sz - qz * sx) / denominator, u = (qx * uz - qz * ux) / denominator;
    if (t >= 0 && u >= 0 && u <= 1) hits.push({ t, x: site.x + ux * t, z: site.z + uz * t });
  }
  hits.sort((a, b) => a.t - b.t);
  if (!hits.length) throw new Error(`No skybridge boundary intersection for ${site.englishName}`);
  return hits[0];
}
export const NINA_TOWER_SKYBRIDGE = Object.freeze((() => {
  const start = boundaryToward(NINA_TOWER_MAIN_SITE, NINA_TOWER_HOTEL_SITE);
  const end = boundaryToward(NINA_TOWER_HOTEL_SITE, NINA_TOWER_MAIN_SITE);
  const dx = end.x - start.x, dz = end.z - start.z, length = Math.hypot(dx, dz);
  const bow = 2.2;
  return { start, end, control: { x: (start.x + end.x) * 0.5 - dz / length * bow, z: (start.z + end.z) * 0.5 + dx / length * bow },
    floorY: NINA_TOWER_SKYBRIDGE_FLOOR, trussDepth: NINA_TOWER_SKYBRIDGE_TRUSS_DEPTH,
    // Enclosure dimensions and bow are visual controls, not surveyed OSM measurements.
    width: 4.4, bow, clearHeight: 3, roofRise: 0.45 };
})());
export function ninaTowerSkybridgePoint(t) {
  const bridge = NINA_TOWER_SKYBRIDGE, u = 1 - t;
  return { x: u * u * bridge.start.x + 2 * u * t * bridge.control.x + t * t * bridge.end.x,
    z: u * u * bridge.start.z + 2 * u * t * bridge.control.z + t * t * bridge.end.z };
}
