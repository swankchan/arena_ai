// HK-B0090 Times Square, Causeway Bay: source footprints, shared georef and road-safe ground rules.
// The three building ways are preserved separately; the commercial landuse way is site / piazza evidence only.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';

const geometry = (rows) => Object.freeze(rows.map(([id, lon, lat]) => Object.freeze({ id, lon, lat })));
const source = ({ id, version, sourceTimestamp, tags, geometry: rows }) => Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-04',
  sourceUrl: `https://www.openstreetmap.org/api/0.6/way/${id}/full.json`,
  type: 'way', id, version, sourceTimestamp, tags: Object.freeze(tags), geometry: geometry(rows)
});

export const TIMES_SQUARE_MALL_OSM_SOURCE = source({
  id: 26469269, version: 8, sourceTimestamp: '2016-07-01T10:45:30Z',
  tags: {
    building: 'yes', 'building:levels': '10', layer: '1', name: '時代廣場 Times Square',
    'name:en': 'Times Square', 'name:ko': '타임스 스퀘어', 'name:zh': '時代廣場', shop: 'mall'
  },
  geometry: [
    [2090989464,114.1815986,22.2781156],[2090989541,114.1816174,22.2780719],
    [2090989561,114.1819761,22.2779428],[2090989477,114.1822744,22.2780583],
    [2090989465,114.1824045,22.2781086],[2090989475,114.1826894,22.2782190],
    [2090989453,114.1827785,22.2785112],[2090989502,114.1827207,22.2786428],
    [290074122,114.1826805,22.2786667],[2090989520,114.1825342,22.2786095],
    [2090989459,114.1825203,22.2785636],[290074126,114.1822666,22.2784649],
    [2090989547,114.1821994,22.2784977],[2090989488,114.1821791,22.2785212],
    [2979414993,114.1821534,22.2785381],[2090989469,114.1821235,22.2785474],
    [2090989575,114.1820941,22.2785489],[290074127,114.1820370,22.2785814],
    [2090989466,114.1819199,22.2785382],[2090989513,114.1818884,22.2785528],
    [290074109,114.1815768,22.2784306],[290074112,114.1815298,22.2782680],
    [2090989464,114.1815986,22.2781156]
  ]
});
export const TIMES_SQUARE_TOWER_TWO_OSM_SOURCE = source({
  id: 199045544, version: 5, sourceTimestamp: '2025-12-27T08:33:19Z',
  tags: {
    building: 'yes', 'building:function': 'tower', 'building:levels': '40', height: '169',
    location: 'podium', name: '二座 Tower Two', 'name:en': 'Tower Two', 'name:zh': '二座'
  },
  geometry: [
    [2090989559,114.1815315,22.2782694],[2090989464,114.1815986,22.2781156],
    [2090989541,114.1816174,22.2780719],[2090989561,114.1819761,22.2779428],
    [2090989477,114.1822744,22.2780583],[2090989485,114.1822957,22.2781018],
    [2090989458,114.1822368,22.2782292],[2090989497,114.1821929,22.2782398],
    [2090989472,114.1819796,22.2781586],[2090989529,114.1817928,22.2782298],
    [2090989462,114.1817435,22.2783458],[2090989531,114.1817021,22.2783674],
    [2090989533,114.1815474,22.2783078],[2090989559,114.1815315,22.2782694]
  ]
});
export const TIMES_SQUARE_TOWER_ONE_OSM_SOURCE = source({
  id: 199045545, version: 5, sourceTimestamp: '2025-12-27T08:33:19Z',
  tags: {
    building: 'yes', 'building:function': 'tower', 'building:levels': '47', height: '194',
    location: 'podium', name: '一座 Tower One', 'name:en': 'Tower One', 'name:zh': '一座'
  },
  geometry: [
    [2090989502,114.1827207,22.2786428],[290074122,114.1826805,22.2786667],
    [2090989520,114.1825342,22.2786095],[2090989459,114.1825203,22.2785636],
    [2090989557,114.1825564,22.2784767],[2090989579,114.1825232,22.2783658],
    [2979414971,114.1823427,22.2782962],[2090989474,114.1823228,22.2782894],
    [2090989571,114.1823042,22.2782519],[2090989585,114.1823637,22.2781228],
    [2090989465,114.1824045,22.2781086],[2090989475,114.1826894,22.2782190],
    [2090989453,114.1827785,22.2785112],[2090989502,114.1827207,22.2786428]
  ]
});
export const TIMES_SQUARE_LANDUSE_OSM_SOURCE = source({
  id: 294351176, version: 6, sourceTimestamp: '2026-06-12T03:08:18Z',
  tags: {
    'addr:housenumber': '1', 'addr:street': '勿地臣街 Matheson Street', 'addr:street:en': 'Matheson Street',
    'addr:street:wikidata': 'Q13162020', 'addr:street:zh': '勿地臣街', landuse: 'commercial',
    name: '時代廣場 Times Square', 'name:en': 'Times Square', 'name:zh': '時代廣場',
    website: 'https://timessquare.com.hk', wikidata: 'Q836051',
    wikimedia_commons: 'Category:Times Square (Hong Kong)', wikipedia: 'zh:時代廣場 (香港)'
  },
  geometry: [
    [2979415167,114.1828470,22.2787645],[2979415180,114.1828404,22.2787893],
    [2979415195,114.1828535,22.2788185],[2979415217,114.1828353,22.2788640],
    [2979415227,114.1827798,22.2788860],[2979415216,114.1827163,22.2788633],
    [2979415203,114.1827020,22.2788291],[2090989466,114.1819199,22.2785382],
    [2090989513,114.1818884,22.2785528],[290074109,114.1815768,22.2784306],
    [2979414984,114.1814809,22.2783951],[9710467106,114.1814807,22.2783222],
    [2979411619,114.1814795,22.2778801],[2979411618,114.1815558,22.2777819],
    [290074116,114.1816419,22.2778133],[9710467098,114.1817815,22.2778674],
    [2090989561,114.1819761,22.2779428],[2090989477,114.1822744,22.2780583],
    [2090989465,114.1824045,22.2781086],[2090989475,114.1826894,22.2782190],
    [2090989453,114.1827785,22.2785112],[2979415167,114.1828470,22.2787645]
  ]
});
export const TIMES_SQUARE_OSM_SOURCES = Object.freeze([
  TIMES_SQUARE_MALL_OSM_SOURCE, TIMES_SQUARE_TOWER_ONE_OSM_SOURCE,
  TIMES_SQUARE_TOWER_TWO_OSM_SOURCE, TIMES_SQUARE_LANDUSE_OSM_SOURCE
]);
export const TIMES_SQUARE_RESEARCH_SOURCES = Object.freeze([
  Object.freeze({
    url: 'https://www.wongouyang.com/projects/times-square/', publisher: 'Wong & Ouyang', retrieved: '2026-11-04',
    evidence: '1993 former tram-depot redevelopment; 33 / 26 office levels above a 14-level retail podium, four cinemas, six basement levels and the Russell / Matheson civic piazza.'
  }),
  Object.freeze({
    url: 'https://office.timessquare.com.hk/about/specifications', publisher: 'Times Square office', retrieved: '2026-11-04',
    evidence: 'Approximate total GFA 1,017,000 sq ft; Tower One / Two typical floors 17,186 / 19,510 sq ft; 3.525 m ordinary and 4.3 m feature floor-to-floor heights.'
  }),
  Object.freeze({
    url: 'https://en.wikipedia.org/wiki/Times_Square_(Hong_Kong)', publisher: 'Secondary cross-check', retrieved: '2026-11-04',
    evidence: '1994-04-13 opening; 193.9 / 168.8 m architectural-height references. These are not mixed with OSM rounded heights or floor-count conventions.'
  })
]);

const KX = 103056.81753522092, KY = 110734.09626824585;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];
const worldRing = (source) => Object.freeze(source.geometry.flatMap(({ lon, lat }) => project(lon, lat)));
export function flatRingArea(ring) {
  let area = 0;
  for (let i = 0; i + 3 < ring.length; i += 2) area += ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1];
  return area * .5;
}
function makeSite(name, englishName, source) {
  const ring = worldRing(source);
  return Object.freeze({ name, englishName, source, osmType: 'way', osmId: source.id,
    ring, bounds: flatRingBounds(ring), ringArea: Math.abs(flatRingArea(ring)), ...minimumAreaObb(ring) });
}
export const TIMES_SQUARE_SITE = makeSite('時代廣場 Times Square', 'Times Square', TIMES_SQUARE_MALL_OSM_SOURCE);
export const TIMES_SQUARE_TOWER_ONE_SITE = makeSite('時代廣場一座 Times Square Tower One', 'Times Square Tower One', TIMES_SQUARE_TOWER_ONE_OSM_SOURCE);
export const TIMES_SQUARE_TOWER_TWO_SITE = makeSite('時代廣場二座 Times Square Tower Two', 'Times Square Tower Two', TIMES_SQUARE_TOWER_TWO_OSM_SOURCE);
export const TIMES_SQUARE_LANDUSE_SITE = makeSite('時代廣場 Times Square commercial site', 'Times Square commercial site', TIMES_SQUARE_LANDUSE_OSM_SOURCE);

export function timesSquareLocalToWorld(x, z) {
  const s = TIMES_SQUARE_SITE, cs = Math.cos(s.ry), sn = Math.sin(s.ry);
  return { x: s.x + cs * x + sn * z, z: s.z - sn * x + cs * z };
}
export function timesSquareWorldToLocal(x, z) {
  const s = TIMES_SQUARE_SITE, cs = Math.cos(s.ry), sn = Math.sin(s.ry), dx = x - s.x, dz = z - s.z;
  return { x: dx * cs - dz * sn, z: dx * sn + dz * cs };
}
const toLocalRing = (ring) => Object.freeze(ring.flatMap((value, index, array) => {
  if (index % 2) return [];
  const p = timesSquareWorldToLocal(value, array[index + 1]); return [p.x, p.z];
}));
export const TIMES_SQUARE_LOCAL_RING = toLocalRing(TIMES_SQUARE_SITE.ring);
export const TIMES_SQUARE_TOWER_ONE_LOCAL_RING = toLocalRing(TIMES_SQUARE_TOWER_ONE_SITE.ring);
export const TIMES_SQUARE_TOWER_TWO_LOCAL_RING = toLocalRing(TIMES_SQUARE_TOWER_TWO_SITE.ring);
export const TIMES_SQUARE_LANDUSE_LOCAL_RING = toLocalRing(TIMES_SQUARE_LANDUSE_SITE.ring);
export const TIMES_SQUARE_GROUND_RINGS = Object.freeze([TIMES_SQUARE_LANDUSE_SITE.ring]);

export const TIMES_SQUARE_HEIGHT = 193.9;
export const TIMES_SQUARE_TOWER_ONE_HEIGHT = 193.9, TIMES_SQUARE_TOWER_ONE_OSM_HEIGHT = 194;
export const TIMES_SQUARE_TOWER_TWO_HEIGHT = 168.8, TIMES_SQUARE_TOWER_TWO_OSM_HEIGHT = 169;
export const TIMES_SQUARE_TOWER_ONE_OSM_LEVELS = 47, TIMES_SQUARE_TOWER_TWO_OSM_LEVELS = 40;
export const TIMES_SQUARE_TOWER_ONE_OFFICE_LEVELS = 33, TIMES_SQUARE_TOWER_TWO_OFFICE_LEVELS = 26;
export const TIMES_SQUARE_RETAIL_LEVELS = 14, TIMES_SQUARE_OSM_MALL_LEVELS = 10;
export const TIMES_SQUARE_BELOW_GROUND_LEVELS = 6, TIMES_SQUARE_CINEMAS = 4;
export const TIMES_SQUARE_COMPLETION_YEAR = 1993, TIMES_SQUARE_OPENING_DATE = '1994-04-13';
export const TIMES_SQUARE_ARCHITECT = 'Wong & Ouyang';
export const TIMES_SQUARE_GFA_SQFT = 1017000;
export const TIMES_SQUARE_TOWER_ONE_TYPICAL_FLOOR_SQFT = 17186;
export const TIMES_SQUARE_TOWER_TWO_TYPICAL_FLOOR_SQFT = 19510;
export const TIMES_SQUARE_OFFICE_FLOOR_TO_FLOOR = 3.525, TIMES_SQUARE_FEATURE_FLOOR_TO_FLOOR = 4.3;
// Visual construction parameters, not surveyed road / structural engineering elevations.
export const TIMES_SQUARE_PODIUM_HEIGHT = 60;
export const TIMES_SQUARE_STREET_HEIGHT = 6;
export const TIMES_SQUARE_ROAD_SOFFIT = TIMES_SQUARE_STREET_HEIGHT;
export const TIMES_SQUARE_ROAD_LINTEL_DEPTH = .42;
export const TIMES_SQUARE_ROAD_VEHICLE_CLEARANCE = 4.7;
export const TIMES_SQUARE_PODIUM_BAY_WIDTH = 3.2;
export const TIMES_SQUARE_TOWER_ONE_OFFICE_TOP = TIMES_SQUARE_PODIUM_HEIGHT
  + TIMES_SQUARE_TOWER_ONE_OFFICE_LEVELS * TIMES_SQUARE_OFFICE_FLOOR_TO_FLOOR;
export const TIMES_SQUARE_TOWER_TWO_OFFICE_TOP = TIMES_SQUARE_PODIUM_HEIGHT
  + TIMES_SQUARE_TOWER_TWO_OFFICE_LEVELS * TIMES_SQUARE_OFFICE_FLOOR_TO_FLOOR;

export function timesSquareEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  const sign = flatRingArea(ring) >= 0 ? 1 : -1;
  return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
function edgeFrame(edge, name, evidence, t = .5) {
  const ring = TIMES_SQUARE_LOCAL_RING, i = edge * 2;
  const localX = ring[i] + (ring[i + 2] - ring[i]) * t, localZ = ring[i + 1] + (ring[i + 3] - ring[i + 1]) * t;
  const p = timesSquareLocalToWorld(localX, localZ), orientation = timesSquareEdgeOutward(ring, edge);
  const cs = Math.cos(TIMES_SQUARE_SITE.ry), sn = Math.sin(TIMES_SQUARE_SITE.ry);
  const nx = cs * orientation.nx + sn * orientation.nz, nz = -sn * orientation.nx + cs * orientation.nz;
  return Object.freeze({ sourceEdge: edge, t, localX, localZ, x: p.x, z: p.z, nx, nz,
    ry: Math.atan2(nx, nz), length: orientation.length, name, evidence });
}
export const TIMES_SQUARE_MAIN_ENTRANCE = edgeFrame(6, 'Times Square Russell Street arched entrance',
  'Photo-directed on mall edge 6; the tall glazed arch, stone piers and circular device are identifying facade features, not an OSM door tag.');
export const TIMES_SQUARE_CURVED_ATRIUM = edgeFrame(10, 'Times Square piazza curved glass atrium',
  'Photo-directed on mall edge 10 facing the set-back civic piazza; curved glazing, horizontal bands and the Times Square sign.');
export const TIMES_SQUARE_LED_FRONTAGE = edgeFrame(8, 'Times Square corner LED frontage',
  'Photo-directed corner media screen on mall edge 8; no temporary advertising image is bundled.');
export const TIMES_SQUARE_CLOCK_LOCAL = Object.freeze({ x: 72, z: -22 });
export const TIMES_SQUARE_CLOCK = Object.freeze({
  ...TIMES_SQUARE_CLOCK_LOCAL, ...timesSquareLocalToWorld(TIMES_SQUARE_CLOCK_LOCAL.x, TIMES_SQUARE_CLOCK_LOCAL.z),
  localX: TIMES_SQUARE_CLOCK_LOCAL.x, localZ: TIMES_SQUARE_CLOCK_LOCAL.z,
  evidence: 'Freestanding four-faced piazza clock with open domed metal canopy; separate from the circular wall logo.'
});
export const TIMES_SQUARE_GROUND_SAMPLE = Object.freeze(timesSquareLocalToWorld(72, -16));
export const TIMES_SQUARE_MAIN_PIAZZA_LOCAL = Object.freeze({ x: 72, z: -16 });

// Full original runtime point lists, checked against HK_FULL_ROADS.roads[id][5]. All three are tunnel ways.
const road = (recordIndex, width, points) => Object.freeze({ recordIndex, name: '', width, flags: 4, points: Object.freeze(points) });
export const TIMES_SQUARE_CROSSING_ROADS = Object.freeze([
  road(47462, 8.4, [2286,446.5,2276.2,422.1,2272.9,421.3]),
  road(47464, 8.4, [2272.9,421.3,2266.9,423.4]),
  road(47465, 5.5, [2272.9,421.3,2274.4,419.6,2274.7,417.3,2266,397.8,2263.8,395.5,2260.8,394.6,2255,396.2])
]);
function pointSegment(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], lengthSq = dx * dx + dz * dz;
  const t = lengthSq ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / lengthSq)) : 0;
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
const cross = (ax, az, bx, bz) => ax * bz - az * bx;
function intersects(a, b, c, d) {
  const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1];
  const denominator = cross(rx, rz, sx, sz); if (Math.abs(denominator) < 1e-9) return false;
  const qx = c[0] - a[0], qz = c[1] - a[1];
  const t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator;
  return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9;
}
function segmentDistance(a, b, c, d) {
  return intersects(a, b, c, d) ? 0 : Math.min(pointSegment(...a, c, d), pointSegment(...b, c, d),
    pointSegment(...c, a, b), pointSegment(...d, a, b));
}
export function timesSquarePointInRoadCorridor(x, z, margin = .35) {
  for (const road of TIMES_SQUARE_CROSSING_ROADS) for (let i = 2; i < road.points.length; i += 2) {
    const a = [road.points[i - 2], road.points[i - 1]], b = [road.points[i], road.points[i + 1]];
    if (pointSegment(x, z, a, b) < road.width * .5 + margin) return true;
  }
  return false;
}
export function timesSquareRoadConflictAtLocal(x, z, margin = .65) {
  const p = timesSquareLocalToWorld(x, z);
  for (const road of TIMES_SQUARE_CROSSING_ROADS) for (let i = 2; i < road.points.length; i += 2) {
    const a = [road.points[i - 2], road.points[i - 1]], b = [road.points[i], road.points[i + 1]];
    if (pointSegment(p.x, p.z, a, b) < road.width * .5 + margin) return road;
  }
  return null;
}
export function timesSquarePodiumBayConflict(ring, edge, t0, t1, margin = .35) {
  const i = edge * 2, ax = ring[i] + (ring[i + 2] - ring[i]) * t0, az = ring[i + 1] + (ring[i + 3] - ring[i + 1]) * t0;
  const bx = ring[i] + (ring[i + 2] - ring[i]) * t1, bz = ring[i + 1] + (ring[i + 3] - ring[i + 1]) * t1;
  const aw = timesSquareLocalToWorld(ax, az), bw = timesSquareLocalToWorld(bx, bz), a = [aw.x, aw.z], b = [bw.x, bw.z];
  for (const road of TIMES_SQUARE_CROSSING_ROADS) for (let j = 2; j < road.points.length; j += 2) {
    const c = [road.points[j - 2], road.points[j - 1]], d = [road.points[j], road.points[j + 1]];
    if (segmentDistance(a, b, c, d) < road.width * .5 + margin) return road;
  }
  return null;
}
export function isTimesSquarePlazaPoint(x, z) {
  return pointInFlatRing(TIMES_SQUARE_LANDUSE_SITE.ring, x, z) && !timesSquarePointInRoadCorridor(x, z);
}
export function isTimesSquareOpenPiazzaPoint(x, z) {
  return isTimesSquarePlazaPoint(x, z) && !pointInFlatRing(TIMES_SQUARE_SITE.ring, x, z);
}
export function timesSquareTerrainHeightAt(x, z, rawHeight, padHeight) {
  return isTimesSquarePlazaPoint(x, z) ? Math.max(rawHeight, padHeight) : rawHeight;
}
export function timesSquareGroundHeightAt(x, z, ground, grounds) {
  return isTimesSquarePlazaPoint(x, z) ? Math.max(ground, grounds.plaza) : ground;
}

export function timesSquareLocalCollider(x, z, w, d, minY, maxY, ry = TIMES_SQUARE_SITE.ry) {
  const p = timesSquareLocalToWorld(x, z), cs = Math.cos(ry), sn = Math.sin(ry), hx = w * .5, hz = d * .5;
  return { shape: 'box', x: p.x, z: p.z, w, d, ry, minY, maxY,
    minX: p.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: p.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: p.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: p.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: p.x, cz: p.z, hx, hz, cs, sn } };
}
export function timesSquareEdgeCollider(ring, edge, minY, maxY, depth = .68, t0 = 0, t1 = 1) {
  const i = edge * 2, ax = ring[i] + (ring[i + 2] - ring[i]) * t0, az = ring[i + 1] + (ring[i + 3] - ring[i + 1]) * t0;
  const bx = ring[i] + (ring[i + 2] - ring[i]) * t1, bz = ring[i + 1] + (ring[i + 3] - ring[i + 1]) * t1;
  const { ry } = timesSquareEdgeOutward(ring, edge), length = Math.hypot(bx - ax, bz - az);
  return timesSquareLocalCollider((ax + bx) * .5, (az + bz) * .5, length + .03, depth, minY, maxY, TIMES_SQUARE_SITE.ry + ry);
}
export const timesSquareSegmentCollider = (ring, edge, t0, t1, minY, maxY, depth = .68) =>
  timesSquareEdgeCollider(ring, edge, minY, maxY, depth, t0, t1);
export function timesSquareRingColliders(ring, minY, maxY, depth = .68) {
  const out = [];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) out.push(timesSquareEdgeCollider(ring, edge, minY, maxY, depth));
  return out;
}
export function timesSquareFrameToWorld(frame, x, z) {
  const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry);
  return { x: frame.x + cs * x + sn * z, z: frame.z - sn * x + cs * z };
}
export function timesSquareFrameCollider(frame, x, z, w, d, minY, maxY, groundOffset = 0) {
  const p = timesSquareFrameToWorld(frame, x, z), local = timesSquareWorldToLocal(p.x, p.z);
  return timesSquareLocalCollider(local.x, local.z, w, d, minY + groundOffset, maxY + groundOffset, frame.ry);
}
