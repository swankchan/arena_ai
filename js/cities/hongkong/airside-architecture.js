// HK-B0019 AIRSIDE: current OSM complex outline, source-tagged entrances and separated height conventions.
import { flatRingBounds, pointInFlatRing } from './landmark-site.js';

function geometry(points) { return Object.freeze(points.map(([lon, lat]) => Object.freeze({ lon, lat }))); }
export const AIRSIDE_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-02',
  sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/1212412229/full.json',
  type: 'way', id: 1212412229, version: 9, timestamp: '2026-05-02T23:04:16Z', changeset: 182138065,
  user: 'Kovoschiz', uid: 6250193,
  tags: Object.freeze({
    "addr": "main", "addr:housename": "AIRSIDE", "addr:housename:en": "AIRSIDE", "addr:housename:zh": "AIRSIDE",
    "addr:housenumber": "2", "addr:street": "協調道 Concorde Road", "addr:street:en": "Concorde Road", "addr:street:zh": "協調道",
    "air_conditioning": "district_cooling", "building": "commercial", "building:levels": "47", "building:levels:underground": "4",
    "building:material": "glass", "commercial": "complex", "height": "213", "name": "AIRSIDE", "name:en": "AIRSIDE", "name:zh": "AIRSIDE",
    "noname:zh": "en", "opening_hours": "10:00-22:00", "operator": "南豐集團 Nam Fung Group", "operator:en": "Nam Fung Group",
    "operator:wikidata": "Q4045039", "operator:zh": "南豐集團", "parking": "separate", "podium": "bulk", "retail": "mall",
    "roof:direction": "201.93", "roof:height": "13", "roof:shape": "skillion", "start_date": "2023-09-28",
    "website": "https://www.airside.com.hk/", "wikidata": "Q115959184", "wikimedia_commons": "Category:AIRSIDE Kai Tak", "wikipedia": "zh:AIRSIDE"
  }),
  geometry: geometry([
    [114.1980510,22.3301575], [114.1979832,22.3302216], [114.1981735,22.3303618], [114.1982161,22.3304047],
    [114.1982622,22.3304511], [114.1984639,22.3306542], [114.1984494,22.3306663], [114.1984348,22.3306784],
    [114.1983718,22.3306178], [114.1982235,22.3304757], [114.1981686,22.3305966], [114.1981349,22.3305840],
    [114.1981017,22.3305715], [114.1981137,22.3305472], [114.1978826,22.3303769], [114.1978092,22.3304630],
    [114.1977193,22.3305686], [114.1977710,22.3305982], [114.1977520,22.3306162], [114.1977325,22.3306346],
    [114.1976767,22.3305816], [114.1975289,22.3306819], [114.1973186,22.3308248], [114.1974210,22.3309036],
    [114.1974595,22.3309324], [114.1975128,22.3309724], [114.1975789,22.3309403], [114.1976006,22.3309688],
    [114.1975661,22.3309832], [114.1975858,22.3310089], [114.1977721,22.3312516], [114.1978744,22.3313848],
    [114.1979307,22.3312607], [114.1979977,22.3312868], [114.1979725,22.3313424], [114.1979497,22.3313926],
    [114.1979941,22.3314098], [114.1980353,22.3314258], [114.1980765,22.3314418], [114.1981069,22.3314536],
    [114.1982214,22.3314981], [114.1983547,22.3315499], [114.1984342,22.3315808], [114.1986008,22.3312096],
    [114.1986397,22.3311281], [114.1984734,22.3310635], [114.1984896,22.3310278], [114.1985057,22.3309924],
    [114.1986197,22.3310367], [114.1987080,22.3309389], [114.1986218,22.3308567], [114.1986356,22.3308448],
    [114.1986493,22.3308328], [114.1986750,22.3308523], [114.1987256,22.3308042], [114.1987379,22.3307902],
    [114.1987493,22.3307782], [114.1987002,22.3307317], [114.1983213,22.3303693], [114.1982906,22.3303400],
    [114.1982541,22.3303053], [114.1980752,22.3301342], [114.1980646,22.3301447], [114.1980510,22.3301575]
  ])
});

const KX = 103056.81753522092, KY = 110734.09626824585;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];
const worldRing = Object.freeze(AIRSIDE_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat)));
const origin = project(AIRSIDE_OSM_SOURCE.geometry[36].lon, AIRSIDE_OSM_SOURCE.geometry[36].lat);
const northEast = project(AIRSIDE_OSM_SOURCE.geometry[42].lon, AIRSIDE_OSM_SOURCE.geometry[42].lat);
const southEast = project(AIRSIDE_OSM_SOURCE.geometry[43].lon, AIRSIDE_OSM_SOURCE.geometry[43].lat);
export const AIRSIDE_MAIN_WIDTH = Math.hypot(northEast[0] - origin[0], northEast[1] - origin[1]);
const axisU = Object.freeze({ x: (northEast[0] - origin[0]) / AIRSIDE_MAIN_WIDTH, z: (northEast[1] - origin[1]) / AIRSIDE_MAIN_WIDTH });
// Use an exactly orthogonal model frame so every source coordinate round-trips without approximation.
const axisV = Object.freeze({ x: -axisU.z, z: axisU.x });
export const AIRSIDE_MAIN_DEPTH = (southEast[0] - origin[0]) * axisV.x + (southEast[1] - origin[1]) * axisV.z;
export const AIRSIDE_FRAME_ROTATION = Math.atan2(-axisU.z, axisU.x);
export function airsideLocalToWorld(u, v) {
  return { x: origin[0] + axisU.x * u + axisV.x * v, z: origin[1] + axisU.z * u + axisV.z * v };
}
export function airsideWorldToLocal(x, z) {
  const dx = x - origin[0], dz = z - origin[1];
  return { u: dx * axisU.x + dz * axisU.z, v: dx * axisV.x + dz * axisV.z };
}
function closeRing(points) { return Object.freeze([...points, points[0], points[1]]); }
function ringFromPoints(points) { return closeRing(points.flatMap(([u, v]) => [u, v])); }
export const AIRSIDE_COMPLEX_RING = closeRing(AIRSIDE_OSM_SOURCE.geometry.slice(0, -1).flatMap(({ lon, lat }) => {
  const point = project(lon, lat), local = airsideWorldToLocal(point[0], point[1]); return [local.u, local.v];
}));
const mainChamfer = 2.4;
export const AIRSIDE_MAIN_TOWER_RING = ringFromPoints([
  [mainChamfer,0], [AIRSIDE_MAIN_WIDTH-mainChamfer,0], [AIRSIDE_MAIN_WIDTH,mainChamfer],
  [AIRSIDE_MAIN_WIDTH,AIRSIDE_MAIN_DEPTH-mainChamfer], [AIRSIDE_MAIN_WIDTH-mainChamfer,AIRSIDE_MAIN_DEPTH],
  [mainChamfer,AIRSIDE_MAIN_DEPTH], [0,AIRSIDE_MAIN_DEPTH-mainChamfer], [0,mainChamfer]
]);

// Photograph-directed internal cuts intersect the exact OSM complex boundary. They are not surveyed tower-plan coordinates.
export const AIRSIDE_SECONDARY_RING = ringFromPoints([
  [-2,44.546192],[49.157113,44.546192],[49.379607,54.418851],[30.808273,54.417263],[30.825883,58.708514],
  [30.846782,62.965139],[43.578272,62.964575],[47.803387,76.464254],[36.098827,81.441448],[36.903549,83.205380],
  [37.694495,84.975561],[40.970511,84.003330],[43.730602,90.927513],[44.303082,92.846480],[44.875295,94.525341],
  [38.222031,97.327517],[36.647137,98],[7.778365,98],[12.443257,95.864835],[11.580496,94.052673],
  [10.708225,92.236540],[2.131518,95.927651],[-2,97.696257]
]);
export const AIRSIDE_ATRIUM_RING = ringFromPoints([
  [-89.198287,32.958667],[-76.098135,28.972115],[-71.208064,27.557767],[-64.432678,25.586558],[-59.515923,31.491179],
  [-56.236355,29.440457],[-58.903022,26.599183],[-55.933110,24.755173],[-27.861647,7.351505],[-15.997358,0],
  [-12.441372,0],[-12.390334,12.718698],[-4.905060,12.711823],[-4.929609,6.029731],[-4.956267,0],[-0.001,0],
  [-0.001,44.546192],[-2,44.546192],[-2,72],[-56.673305,72],[-56.880614,71.482485],[-57.950112,68.828029],
  [-65.450710,72],[-65.535083,72],[-75.294853,55.910852]
]);
export const AIRSIDE_MIDDLE_RINGS = Object.freeze([
  ringFromPoints([
    [-62.021142,75.048214],[-55.841603,74.076214],[-56.673305,72],[-2,72],[-2,97.696257],[-18.034295,104.560160],
    [-18.097529,90.026102],[-21.839989,89.975615],[-25.530632,89.934762],[-25.426101,92.894334],[-54.669380,101.120982],[-57.976629,89.408472]
  ]),
  ringFromPoints([[-7.515182,105],[7.778365,98],[36.647137,98],[20.253770,105]])
]);
export const AIRSIDE_SOUTH_RING = ringFromPoints([
  [-51.727583,120.984723],[-27.648568,114.213944],[-21.767047,111.521560],[-15.403354,108.610490],[-7.515182,105],
  [20.253770,105],[-13.272610,119.315830],[-17.442220,121.090963],[-22.393794,123.187616],[-46.706908,133.568573],
  [-47.267033,132.074754],[-48.014339,130.226795]
]);
export const AIRSIDE_UPPER_VOLUME_RINGS = Object.freeze([
  AIRSIDE_MAIN_TOWER_RING, AIRSIDE_SECONDARY_RING, AIRSIDE_ATRIUM_RING, ...AIRSIDE_MIDDLE_RINGS, AIRSIDE_SOUTH_RING
]);
const mainCenter = airsideLocalToWorld(AIRSIDE_MAIN_WIDTH * 0.5, AIRSIDE_MAIN_DEPTH * 0.5);
export const AIRSIDE_SITE = Object.freeze({
  name: 'AIRSIDE', englishName: 'AIRSIDE', address: '協調道2號 2 Concorde Road',
  osmType: 'way', osmId: AIRSIDE_OSM_SOURCE.id, source: AIRSIDE_OSM_SOURCE,
  x: mainCenter.x, z: mainCenter.z, ry: AIRSIDE_FRAME_ROTATION, ring: worldRing, bounds: flatRingBounds(worldRing)
});
export const AIRSIDE_GROUND_SAMPLE = Object.freeze({ x: AIRSIDE_SITE.x, z: AIRSIDE_SITE.z });

// Snøhetta / OSM, CTBUH and opening-date conventions remain separate; no averaging or forced reconciliation.
export const AIRSIDE_OSM_HEIGHT = 213;
export const AIRSIDE_OSM_LEVELS = 47;
export const AIRSIDE_OSM_UNDERGROUND_LEVELS = 4;
export const AIRSIDE_OFFICIAL_HEIGHT = 213;
export const AIRSIDE_OFFICIAL_LEVELS = 47;
export const AIRSIDE_HEIGHT = 213;
export const AIRSIDE_CTBUH_HEIGHT = 207.1;
export const AIRSIDE_CTBUH_TO_TIP_HEIGHT = 207.1;
export const AIRSIDE_CTBUH_OCCUPIED_HEIGHT = 189.5;
export const AIRSIDE_CTBUH_LEVELS = 43;
export const AIRSIDE_CTBUH_UNDERGROUND_LEVELS = 4;
export const AIRSIDE_CTBUH_COMPLETION_YEAR = 2022;
export const AIRSIDE_OPENING_DATE = '2023-09-28';
export const AIRSIDE_ROOF_DIRECTION_DEGREES = 201.93;
export const AIRSIDE_ROOF_RISE = 13;
export const AIRSIDE_SECONDARY_LEVELS = 18;
export const AIRSIDE_RETAIL_LEVELS = 9;
export const AIRSIDE_TOTAL_GFA = 177670;
export const AIRSIDE_OFFICE_GFA = 110000;
export const AIRSIDE_RETAIL_GFA = 60000;
export const AIRSIDE_PV_AREA = 1350;
export const AIRSIDE_EDUCATIONAL_GARDEN_AREA = 600;
export const AIRSIDE_SOFT_LANDSCAPE_RATIO = 0.30;

// Authored visual levels, not claimed engineering floor elevations.
export const AIRSIDE_PLAZA_TOP = 0.12;
export const AIRSIDE_BASE_SOFFIT = 8;
export const AIRSIDE_MAIN_PODIUM_HEIGHT = 45;
export const AIRSIDE_MAIN_VISUAL_COURSES = 38;
export const AIRSIDE_SECONDARY_HEIGHT = 86;
export const AIRSIDE_SECONDARY_OCCUPIED_HEIGHT = 78;
export const AIRSIDE_SECONDARY_VISUAL_COURSES = 9;
export const AIRSIDE_ATRIUM_HEIGHT = 45;
export const AIRSIDE_MIDDLE_HEIGHT = 29;
export const AIRSIDE_SOUTH_HEIGHT = 17;
export const AIRSIDE_PANEL_TARGET_WIDTH = 1.55;
export const AIRSIDE_FLUTE_DEPTHS = Object.freeze([0.12, 0.20, 0.28, 0.36]);
export const AIRSIDE_ROAD_VEHICLE_CLEARANCE = 4.7;
export function airsideMainFloorY(course) {
  const t = Math.max(0, Math.min(AIRSIDE_MAIN_VISUAL_COURSES, course)) / AIRSIDE_MAIN_VISUAL_COURSES;
  return AIRSIDE_MAIN_PODIUM_HEIGHT + t * (AIRSIDE_CTBUH_OCCUPIED_HEIGHT - AIRSIDE_MAIN_PODIUM_HEIGHT);
}
export function airsideSecondaryFloorY(course) {
  const t = Math.max(0, Math.min(AIRSIDE_SECONDARY_VISUAL_COURSES, course)) / AIRSIDE_SECONDARY_VISUAL_COURSES;
  return AIRSIDE_MAIN_PODIUM_HEIGHT + t * (AIRSIDE_SECONDARY_OCCUPIED_HEIGHT - AIRSIDE_MAIN_PODIUM_HEIGHT);
}
export function airsideMainCutY(u, v) { return 82 - 0.28 * u + 0.06 * v; }
const roofTheta = AIRSIDE_ROOF_DIRECTION_DEGREES * Math.PI / 180;
const downhillWorld = { x: Math.sin(roofTheta), z: -Math.cos(roofTheta) };
const downhillLocal = { u: downhillWorld.x * axisU.x + downhillWorld.z * axisU.z, v: downhillWorld.x * axisV.x + downhillWorld.z * axisV.z };
const roofCorners = [];
for (let i = 0; i < AIRSIDE_MAIN_TOWER_RING.length - 2; i += 2) roofCorners.push([AIRSIDE_MAIN_TOWER_RING[i], AIRSIDE_MAIN_TOWER_RING[i + 1]]);
const roofProjections = roofCorners.map(([u, v]) => u * downhillLocal.u + v * downhillLocal.v);
const roofMin = Math.min(...roofProjections), roofMax = Math.max(...roofProjections);
export function airsideMainRoofY(u, v) {
  const projection = u * downhillLocal.u + v * downhillLocal.v;
  const t = Math.max(0, Math.min(1, (projection - roofMin) / (roofMax - roofMin)));
  return AIRSIDE_HEIGHT - AIRSIDE_ROOF_RISE * t;
}
export function airsideSecondaryRoofY(u, v) {
  const t = Math.max(0, Math.min(1, (v - AIRSIDE_MAIN_DEPTH) / (98 - AIRSIDE_MAIN_DEPTH)));
  return AIRSIDE_SECONDARY_HEIGHT - (AIRSIDE_SECONDARY_HEIGHT - AIRSIDE_SECONDARY_OCCUPIED_HEIGHT) * t;
}

export function airsideEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0;
  for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1;
  return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
function frameFromPoint(u, v, nx, nz, extra = {}) {
  const point = airsideLocalToWorld(u, v), worldNx = axisU.x * nx + axisV.x * nz, worldNz = axisU.z * nx + axisV.z * nz;
  return Object.freeze({ u, v, x: point.x, z: point.z, nx, nz, worldNx, worldNz, ry: Math.atan2(nx, nz), ...extra });
}
export const AIRSIDE_OFFICE_DOOR_NODES = Object.freeze([40, 41].map((sourceNodeIndex) => {
  const g = AIRSIDE_OSM_SOURCE.geometry[sourceNodeIndex], point = project(g.lon, g.lat), local = airsideWorldToLocal(point[0], point[1]);
  return Object.freeze({ sourceNodeIndex, osmNode: sourceNodeIndex === 40 ? 13788270483 : 11228949741, ...local });
}));
const officeU = (AIRSIDE_OFFICE_DOOR_NODES[0].u + AIRSIDE_OFFICE_DOOR_NODES[1].u) * 0.5;
export const AIRSIDE_OFFICE_ENTRANCE = frameFromPoint(officeU, 0, 0, -1, {
  name: 'AIRSIDE Concorde Road office lobby', osmNodes: Object.freeze([13788270483, 11228949741]),
  evidence: 'Two OSM entrance=main / entrance:use=office nodes on the source north facade; shared canopy is photograph-directed'
});
const mallPoint = airsideWorldToLocal(...project(AIRSIDE_OSM_SOURCE.geometry[6].lon, AIRSIDE_OSM_SOURCE.geometry[6].lat));
const mallNormal = airsideEdgeOutward(AIRSIDE_COMPLEX_RING, 6);
export const AIRSIDE_MALL_ENTRANCE = frameFromPoint(mallPoint.u, mallPoint.v, mallNormal.nx, mallNormal.nz, {
  name: 'AIRSIDE retail atrium entrance', osmNode: 11232828740, sourceNodeIndex: 6, sourceEdge: 6,
  evidence: 'OSM entrance=yes / abutters=retail / level=0 node; tall atrium glazing and lettering follow entrance photographs'
});
export const AIRSIDE_MALL_FORECOURT_RING = ringFromPoints([[-8,0],[8,0],[8,4.5],[-8,4.5]].map(([x,z]) => {
  const point = airsideFrameToLocal(AIRSIDE_MALL_ENTRANCE, x, z); return [point.u, point.v];
}));
export function airsideFrameToLocal(frame, x, z) {
  const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry);
  return { u: frame.u + cs * x + sn * z, v: frame.v - sn * x + cs * z };
}
export function airsideFrameToWorld(frame, x, z) {
  const point = airsideFrameToLocal(frame, x, z); return airsideLocalToWorld(point.u, point.v);
}
export function isAirsidePlazaPoint(x, z) {
  if (pointInFlatRing(AIRSIDE_SITE.ring, x, z)) return true;
  const local = airsideWorldToLocal(x, z);
  if (pointInFlatRing(AIRSIDE_MALL_FORECOURT_RING, local.u, local.v)) return true;
  const ring = AIRSIDE_SITE.ring;
  for (let i = 0; i < ring.length - 2; i += 2) {
    // Source entrance nodes can sit a few centimetres off the simplified way edge; include that surveyed-node tolerance.
    if (pointSegmentDistance(x, z, [ring[i], ring[i + 1]], [ring[i + 2], ring[i + 3]]) <= 0.08) return true;
  }
  return false;
}
export function airsideGroundHeightAt(x, z, fallback, grounds) {
  return isAirsidePlazaPoint(x, z) ? grounds.plaza : fallback;
}

// Generated road records are integration references, not OSM IDs. The source way IDs and relevant cover/height tags are explicit.
export const AIRSIDE_SURFACE_ACCESS_WAYS = Object.freeze([
  { recordIndex: 43446, osmWay: 659030634, width: 5.2, cover: null, maxHeight: null, points: [3901.7,-5429.6,3888.5,-5452.7,3872.8,-5468.7] },
  { recordIndex: 46138, osmWay: 903684312, width: 8.4, cover: null, maxHeight: 4.7, points: [3945.1,-5475.2,3947.6,-5486.5] },
  { recordIndex: 46139, osmWay: 903684313, width: 5.2, cover: null, maxHeight: null, points: [3911.2,-5436.7,3898.9,-5434.6] },
  { recordIndex: 46422, osmWay: 931435255, width: 5.5, cover: null, maxHeight: null, points: [3930.3,-5465.4,3941.5,-5463.6] },
  { recordIndex: 46423, osmWay: 931435256, width: 5.5, cover: 'yes', maxHeight: null, points: [3948.5,-5458.6,3908,-5420] },
  { recordIndex: 46424, osmWay: 931435257, width: 5.5, cover: 'yes', maxHeight: null, points: [3956.1,-5450.4,3927.4,-5422.1] },
  { recordIndex: 48002, osmWay: 1110275787, width: 5.5, cover: 'yes', maxHeight: null, points: [3935.8,-5413.8,3932,-5410,3925.4,-5407.1,3922.1,-5407.6,3916.6,-5412.2] },
  { recordIndex: 49862, osmWay: 1254541549, width: 5.5, cover: 'yes', maxHeight: null, points: [3927.4,-5422.1,3916.6,-5412.2] },
  { recordIndex: 49863, osmWay: 1254541551, width: 5.5, cover: 'yes', maxHeight: null, points: [3908,-5420,3901.7,-5429.6] },
  { recordIndex: 49864, osmWay: 1254541553, width: 5.5, cover: 'yes', maxHeight: null, points: [3916.6,-5412.2,3908,-5420] },
  { recordIndex: 49940, osmWay: 1266504085, width: 8.4, cover: null, maxHeight: null, points: [3945.1,-5475.2,3954.5,-5475,3957.8,-5476.2,3960.2,-5478.5,3963.3,-5487.2,3967.7,-5493.7] },
  { recordIndex: 49941, osmWay: 1266504086, width: 5.2, cover: null, maxHeight: null, points: [3945.1,-5475.2,3941.5,-5463.6] },
  { recordIndex: 49942, osmWay: 1266504087, width: 8.4, cover: null, maxHeight: null, points: [3930.3,-5465.4,3934.7,-5472.3,3945.1,-5475.2] },
  { recordIndex: 49943, osmWay: 1266504088, width: 5.5, cover: 'yes', maxHeight: null, points: [3956.1,-5450.4,3959.7,-5444.4,3960,-5442.2,3958.5,-5438.1,3935.8,-5413.8] },
  { recordIndex: 49944, osmWay: 1266504089, width: 5.5, cover: 'yes', maxHeight: null, points: [3948.5,-5458.6,3956.1,-5450.4] },
  { recordIndex: 49945, osmWay: 1266504090, width: 5.5, cover: null, maxHeight: null, points: [3941.5,-5463.6,3948.5,-5458.6] },
  { recordIndex: 52029, osmWay: 1502803422, width: 5.2, cover: 'partial', maxHeight: null, points: [3919.8,-5441.1,3911.2,-5436.7] },
  { recordIndex: 52030, osmWay: 1502803423, width: 5.2, cover: 'yes', maxHeight: null, points: [3941.5,-5463.6,3919.8,-5441.1] }
].map((way) => Object.freeze({ ...way, points: Object.freeze(way.points) })));
export const AIRSIDE_TUNNEL_WAYS = Object.freeze([
  { recordIndex: 49946, osmWay: 1266504091, maxHeight: 4.7 }, { recordIndex: 52022, osmWay: 1502508474, maxHeight: 2.4 },
  { recordIndex: 52023, osmWay: 1502508475, maxHeight: 2.4 }, { recordIndex: 52024, osmWay: 1502508477, maxHeight: 2.4 },
  { recordIndex: 52025, osmWay: 1502508478, maxHeight: 4.7 }, { recordIndex: 52026, osmWay: 1502508479, maxHeight: 2.4 },
  { recordIndex: 52027, osmWay: 1502508480, maxHeight: 2.4 }, { recordIndex: 52028, osmWay: 1502508481, maxHeight: 4.7 }
].map(Object.freeze));
const localAccessWays = AIRSIDE_SURFACE_ACCESS_WAYS.map((way) => ({
  ...way, localPoints: way.points.flatMap((value, index, array) => {
    if (index % 2) return []; const point = airsideWorldToLocal(value, array[index + 1]); return [point.u, point.v];
  })
}));
function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function segmentsIntersect(a, b, c, d) {
  const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1];
  const denominator = cross(rx, rz, sx, sz), qx = c[0] - a[0], qz = c[1] - a[1];
  if (Math.abs(denominator) < 1e-9) return false;
  const t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator;
  return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9;
}
function pointSegmentDistance(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], lengthSq = dx * dx + dz * dz;
  const t = lengthSq ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / lengthSq)) : 0;
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
export function airsideSegmentDistance(a, b, c, d) {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(pointSegmentDistance(...a, c, d), pointSegmentDistance(...b, c, d), pointSegmentDistance(...c, a, b), pointSegmentDistance(...d, a, b));
}
export function airsideGroundBayConflict(ring, edge, t0, t1, extra = 0.25) {
  const i = edge * 2, a = [ring[i] + (ring[i + 2] - ring[i]) * t0, ring[i + 1] + (ring[i + 3] - ring[i + 1]) * t0];
  const b = [ring[i] + (ring[i + 2] - ring[i]) * t1, ring[i + 1] + (ring[i + 3] - ring[i + 1]) * t1];
  for (const way of localAccessWays) {
    for (let j = 2; j < way.localPoints.length; j += 2) {
      const c = [way.localPoints[j - 2], way.localPoints[j - 1]], d = [way.localPoints[j], way.localPoints[j + 1]];
      if (airsideSegmentDistance(a, b, c, d) < way.width * 0.5 + extra) return way;
    }
  }
  return null;
}
export function airsidePointRoadClearance(u, v) {
  let clearance = Infinity;
  for (const way of localAccessWays) for (let j = 2; j < way.localPoints.length; j += 2) {
    const distance = pointSegmentDistance(u, v, [way.localPoints[j - 2], way.localPoints[j - 1]], [way.localPoints[j], way.localPoints[j + 1]]);
    clearance = Math.min(clearance, distance - way.width * 0.5);
  }
  return clearance;
}
const columnVertices = [0,2,4,9,14,22,30,36,42,43,45,49,54,57,58,61];
export function airsideGroundColumnSites(radius = 0.52) {
  const result = [];
  for (const sourceVertex of columnVertices) {
    const u = AIRSIDE_COMPLEX_RING[sourceVertex * 2], v = AIRSIDE_COMPLEX_RING[sourceVertex * 2 + 1];
    const clearance = airsidePointRoadClearance(u, v);
    if (clearance > radius + 0.25) result.push({ sourceVertex, u, v, clearance });
  }
  return result;
}

export function airsideLocalCollider(cx, cz, w, d, ry, minY, maxY) {
  const point = airsideLocalToWorld(cx, cz), worldRy = AIRSIDE_FRAME_ROTATION + ry;
  const cs = Math.cos(worldRy), sn = Math.sin(worldRy), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: point.x, z: point.z, w, d, ry: worldRy, minY, maxY,
    minX: point.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: point.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: point.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: point.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: point.x, cz: point.z, hx, hz, cs, sn } };
}
export function airsideEdgeCollider(ring, edge, minY, maxY, depth = 0.85) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const { length, ry } = airsideEdgeOutward(ring, edge);
  return airsideLocalCollider((ax + bx) * 0.5, (az + bz) * 0.5, length + 0.06, depth, ry, minY, maxY);
}
export function airsideRingColliders(ring, minY, maxY, depth = 0.85) {
  const result = [];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) result.push(airsideEdgeCollider(ring, edge, minY, maxY, depth));
  return result;
}
export function airsideFrameCollider(frame, x, z, w, d, minY, maxY, base = 0) {
  const point = airsideFrameToLocal(frame, x, z);
  return airsideLocalCollider(point.u, point.v, w, d, frame.ry, minY + base, maxY + base);
}
