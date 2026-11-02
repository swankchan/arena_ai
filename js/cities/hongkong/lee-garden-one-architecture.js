// HK-B0020 Lee Garden One: exact OSM building outline, floor-plan-directed tower and separate complex boundary.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';

function geometry(points) { return Object.freeze(points.map(([lon, lat]) => Object.freeze({ lon, lat }))); }
const sourceMeta = (id, version) => ({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-02',
  sourceUrl: `https://api.openstreetmap.org/api/0.6/way/${id}/full.json`,
  type: 'way', id, version
});
export const LEE_GARDEN_ONE_OSM_SOURCE = Object.freeze({
  ...sourceMeta(1424342883, 1),
  tags: Object.freeze({
    "abutters": "retail", "addr": "separate", "addr:housename": "利園一期 Lee Garden One",
    "addr:housename:en": "Lee Garden One", "addr:housename:zh": "利園一期", "addr:housenumber": "33",
    "addr:street": "希慎道 Hysan Avenue", "addr:street:en": "Hysan Avenue", "addr:street:zh": "希慎道",
    "building": "commercial", "building:levels": "52", "commerce": "part", "height": "211", "mall": "yes",
    "name": "利園一期 Lee Garden One", "name:en": "Lee Garden One", "name:zh": "利園一期", "parking": "separate",
    "wikidata": "Q2166585", "wikimedia_commons": "Category:Lee Garden One", "wikipedia": "zh:利園一期"
  }),
  geometry: geometry([
    [114.1849882,22.2783942], [114.1844279,22.2781979], [114.1843442,22.2781694],
    [114.1841901,22.2785400], [114.1842768,22.2785709], [114.1843058,22.2785824],
    [114.1843276,22.2785913], [114.1849488,22.2788242], [114.1850397,22.2787692],
    [114.1853825,22.2785406], [114.1849882,22.2783942]
  ])
});
// This is the separately mapped commercial-complex boundary, never substituted for the tower footprint.
export const LEE_GARDEN_ONE_COMPLEX_SOURCE = Object.freeze({
  ...sourceMeta(292229804, 8),
  tags: Object.freeze({
    "addr": "main", "address": "housename", "addr:housename": "利園一期 Lee Garden One",
    "addr:housename:en": "Lee Garden One", "addr:housename:zh": "利園一期", "addr:housenumber": "33",
    "addr:street": "希慎道 Hysan Avenue", "addr:street:en": "Hysan Avenue", "addr:street:zh": "希慎道",
    "commerce": "complex", "mall": "separate", "name": "利園一期 Lee Garden One", "name:en": "Lee Garden One",
    "name:zh": "利園一期", "source": "Kaart Ground Survey 2017", "wikidata": "Q2166585",
    "wikimedia_commons": "Category:Lee Garden One", "wikipedia": "zh:利園一期"
  }),
  geometry: geometry([
    [114.1843786,22.2780930], [114.1853909,22.2784793], [114.1854004,22.2785066],
    [114.1853825,22.2785406], [114.1850397,22.2787692], [114.1849488,22.2788242],
    [114.1843276,22.2785913], [114.1843058,22.2785824], [114.1842768,22.2785709],
    [114.1841901,22.2785400], [114.1843442,22.2781694], [114.1843786,22.2780930]
  ])
});

const KX = 103056.81753522092, KY = 110734.09626824585;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];
const projectRing = (source) => Object.freeze(source.geometry.flatMap(({ lon, lat }) => project(lon, lat)));
const buildingWorldRing = projectRing(LEE_GARDEN_ONE_OSM_SOURCE), footprint = minimumAreaObb(buildingWorldRing);
export const LEE_GARDEN_ONE_SITE = Object.freeze({
  name: '利園一期 Lee Garden One', englishName: 'Lee Garden One', address: '希慎道33號 33 Hysan Avenue',
  osmType: 'way', osmId: LEE_GARDEN_ONE_OSM_SOURCE.id, source: LEE_GARDEN_ONE_OSM_SOURCE,
  ring: buildingWorldRing, bounds: flatRingBounds(buildingWorldRing), ...footprint
});
export function leeGardenOneLocalToWorld(x, z) {
  const site = LEE_GARDEN_ONE_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return { x: site.x + cs * x + sn * z, z: site.z - sn * x + cs * z };
}
export function leeGardenOneWorldToLocal(x, z) {
  const site = LEE_GARDEN_ONE_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry), dx = x - site.x, dz = z - site.z;
  return { x: dx * cs - dz * sn, z: dx * sn + dz * cs };
}
const localRing = (worldRing) => Object.freeze(worldRing.flatMap((value, index, array) => {
  if (index % 2) return []; const point = leeGardenOneWorldToLocal(value, array[index + 1]); return [point.x, point.z];
}));
export const LEE_GARDEN_ONE_BUILDING_RING = localRing(buildingWorldRing);
export const LEE_GARDEN_ONE_COMPLEX_WORLD_RING = projectRing(LEE_GARDEN_ONE_COMPLEX_SOURCE);
export const LEE_GARDEN_ONE_COMPLEX_RING = localRing(LEE_GARDEN_ONE_COMPLEX_WORLD_RING);
// OSM way 1424342883 includes the mall / building base (about 4,497 m²), not the much smaller office floor plate.
// The published typical plan is a six-sided chamfered triangle with a triangular core and paired lift lobbies.
// Its traced proportions are uniformly scaled to an authored 1,555 m² gross plate: about 14,728 sq ft at Hysan's
// stated 88% efficiency, within the official 14,661–16,793 sq ft lettable range. A 4 m north shift keeps every
// tower vertex inside the OSM base and leaves the southern podium / rooftop-addition strip. This is photo /
// plan-directed geometry, not surveyed OSM tower CAD.
export const LEE_GARDEN_ONE_TOWER_PLAN_SCALE = 0.0575;
export const LEE_GARDEN_ONE_TOWER_NORTH_SETBACK = 4;
const typicalPlanPixels = [[327,20],[683,20],[1005,475],[872,664],[143,664],[10,475],[327,20]];
export const LEE_GARDEN_ONE_TOWER_RING = Object.freeze(typicalPlanPixels.flatMap(([x, y]) => [
  (x - 507.5) * LEE_GARDEN_ONE_TOWER_PLAN_SCALE,
  (y - 342) * LEE_GARDEN_ONE_TOWER_PLAN_SCALE - LEE_GARDEN_ONE_TOWER_NORTH_SETBACK
]));
export const LEE_GARDEN_ONE_GROUND_SAMPLE = Object.freeze({ x: LEE_GARDEN_ONE_SITE.x, z: LEE_GARDEN_ONE_SITE.z });

// OSM, CTBUH / CVU, Hysan and other published conventions remain separate; 240.4 is not rounded back to 240 or 211.
export const LEE_GARDEN_ONE_OSM_HEIGHT = 211;
export const LEE_GARDEN_ONE_OSM_LEVELS = 52;
export const LEE_GARDEN_ONE_HEIGHT = 240.4;
export const LEE_GARDEN_ONE_TO_TIP_HEIGHT = 240.4;
export const LEE_GARDEN_ONE_OCCUPIED_HEIGHT = 198;
export const LEE_GARDEN_ONE_CTBUH_LEVELS = 50;
export const LEE_GARDEN_ONE_CTBUH_UNDERGROUND_LEVELS = 4;
export const LEE_GARDEN_ONE_CTBUH_COMPLETION_YEAR = 1998;
export const LEE_GARDEN_ONE_CONSTRUCTION_START = 1996;
export const LEE_GARDEN_ONE_PUBLISHED_HEIGHT = 240.35;
export const LEE_GARDEN_ONE_PUBLISHED_LEVELS = 52;
export const LEE_GARDEN_ONE_PUBLISHED_COMPLETION_YEAR = 1997;
export const LEE_GARDEN_ONE_OFFICE_FLOORS = 39;
export const LEE_GARDEN_ONE_CTBUH_OFFICE_FLOORS = 39;
export const LEE_GARDEN_ONE_CTBUH_TOWER_GFA = 84665;
export const LEE_GARDEN_ONE_CTBUH_PARKING_SPACES = 199;
export const LEE_GARDEN_ONE_CTBUH_ELEVATORS = 24;
export const LEE_GARDEN_ONE_HYSAN_LEVELS = 53;
export const LEE_GARDEN_ONE_HYSAN_GFA_SQFT = 903000;
export const LEE_GARDEN_ONE_HYSAN_TYPICAL_LETTABLE_MIN_SQFT = 14661;
export const LEE_GARDEN_ONE_HYSAN_TYPICAL_LETTABLE_MAX_SQFT = 16793;
export const LEE_GARDEN_ONE_HYSAN_WHOLE_FLOOR_EFFICIENCY = 0.88;
export const LEE_GARDEN_ONE_HYSAN_CLEAR_HEADROOM = 2.50;
export const LEE_GARDEN_ONE_HYSAN_CORE_DEPTH_MIN = 10;
export const LEE_GARDEN_ONE_HYSAN_CORE_DEPTH_MAX = 18;
export const LEE_GARDEN_ONE_MAKE_PROJECT_AREA = 83900;
export const LEE_GARDEN_ONE_MAKE_ROOFTOP_STOREYS = 2;

// Photo- and architect-directed visual datums, not claimed surveyed floor or plant elevations.
export const LEE_GARDEN_ONE_PLAZA_TOP = 0.12;
export const LEE_GARDEN_ONE_PODIUM_HEIGHT = 28;
export const LEE_GARDEN_ONE_LOBBY_TOP = 18;
export const LEE_GARDEN_ONE_ROOF_HEIGHT = 211;
export const LEE_GARDEN_ONE_OFFICE_VISUAL_COURSES = 39;
export const LEE_GARDEN_ONE_PANEL_TARGET_WIDTH = 1.45;
export const LEE_GARDEN_ONE_LOBE_SOURCE_VERTICES = Object.freeze([0, 2, 4]);
export const LEE_GARDEN_ONE_LOBE_BASE = 58;
export const LEE_GARDEN_ONE_LOBE_TOP = 176;
export const LEE_GARDEN_ONE_LOBE_RADIUS = 3.1;
export const LEE_GARDEN_ONE_SPIRE_SOURCE_VERTEX = 2;
export const LEE_GARDEN_ONE_ROAD_VEHICLE_CLEARANCE = 13.275;
export function leeGardenOneFloorY(course) {
  const t = Math.max(0, Math.min(LEE_GARDEN_ONE_OFFICE_VISUAL_COURSES, course)) / LEE_GARDEN_ONE_OFFICE_VISUAL_COURSES;
  return LEE_GARDEN_ONE_PODIUM_HEIGHT + t * (LEE_GARDEN_ONE_OCCUPIED_HEIGHT - LEE_GARDEN_ONE_PODIUM_HEIGHT);
}

export function leeGardenOneEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0;
  for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1;
  return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
function vertexFrame(ring, vertex, projection = 0) {
  const count = ring.length / 2 - 1, previous = (vertex + count - 1) % count;
  const a = leeGardenOneEdgeOutward(ring, previous), b = leeGardenOneEdgeOutward(ring, vertex);
  let nx = a.nx + b.nx, nz = a.nz + b.nz; const length = Math.hypot(nx, nz) || 1; nx /= length; nz /= length;
  const x = ring[vertex * 2] + nx * projection, z = ring[vertex * 2 + 1] + nz * projection;
  const point = leeGardenOneLocalToWorld(x, z), site = LEE_GARDEN_ONE_SITE, cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const worldNx = cs * nx + sn * nz, worldNz = -sn * nx + cs * nz;
  return Object.freeze({ x: point.x, z: point.z, nx: worldNx, nz: worldNz, ry: Math.atan2(worldNx, worldNz), localX: x, localZ: z });
}
// Source node 2957737898 is entrance=yes / exit=yes. The lobby frame is anchored at that exact node.
export const LEE_GARDEN_ONE_ENTRANCE = Object.freeze({
  ...vertexFrame(LEE_GARDEN_ONE_BUILDING_RING, 8), osmNode: 2957737898, sourceVertex: 8, complexVertex: 4,
  evidence: 'OSM entrance=yes / exit=yes; CTBUH tall transparent four-storey lobby; current lobby photographs'
});
// Source node 2093159628 is explicitly an underground parking entrance, not a second pedestrian lobby.
export const LEE_GARDEN_ONE_PARKING_ENTRANCE = Object.freeze({
  ...vertexFrame(LEE_GARDEN_ONE_BUILDING_RING, 5), osmNode: 2093159628, sourceVertex: 5, complexVertex: 7,
  evidence: 'OSM amenity=parking_entrance, parking=underground, entrance=main, exit=main'
});
// A 3 m level arrival strip covers the actual person / car stopping positions. It tapers to 4 m at the outer end,
// preserving the full door-width threshold without intruding into the angled Yan Ping Road carriageway.
export const LEE_GARDEN_ONE_ENTRANCE_FORECOURT_WIDTH = 15.2;
export const LEE_GARDEN_ONE_ENTRANCE_FORECOURT_OUTER_WIDTH = 4.0;
export const LEE_GARDEN_ONE_ENTRANCE_FORECOURT_DEPTH = 3.0;
export const LEE_GARDEN_ONE_SPIRE_LOCAL = Object.freeze({
  x: LEE_GARDEN_ONE_TOWER_RING[LEE_GARDEN_ONE_SPIRE_SOURCE_VERTEX * 2],
  z: LEE_GARDEN_ONE_TOWER_RING[LEE_GARDEN_ONE_SPIRE_SOURCE_VERTEX * 2 + 1]
});
export function leeGardenOneFrameToWorld(frame, x, z) {
  const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry);
  return { x: frame.x + cs * x + sn * z, z: frame.z - sn * x + cs * z };
}

// Original source ways are embedded for ground-wall openings. Generated record indices are locators, not OSM IDs.
const road = (id, width, records, points) => Object.freeze({ id, width, generatedRecordIndices: Object.freeze(records),
  geometry: geometry(points), local: Object.freeze(points.flatMap(([lon, lat]) => {
    const world = project(lon, lat), local = leeGardenOneWorldToLocal(world[0], world[1]); return [local.x, local.z];
  })) });
export const LEE_GARDEN_ONE_SERVICE_WAYS = Object.freeze([
  road(26469166, 5.2, [35549], [[114.1844958,22.2780704],[114.1844987,22.2781085],[114.1845000,22.2781252],[114.1844996,22.2781667],[114.1845343,22.2781788]]),
  road(909982838, 5.2, [46219], [[114.1845343,22.2781788],[114.1847760,22.2782634],[114.1848700,22.2782963]]),
  road(909982839, 5.2, [46220], [[114.1848700,22.2782963],[114.1849219,22.2783144],[114.1849808,22.2783009],[114.1850091,22.2782943],[114.1850745,22.2782791]]),
  road(909982840, 8.4, [46221], [[114.1842875,22.2786374],[114.1842948,22.2786104],[114.1843000,22.2785940],[114.1843058,22.2785824]])
]);
function pointSegmentDistance(x, z, flat, index) {
  const ax = flat[index], az = flat[index + 1], bx = flat[index + 2], bz = flat[index + 3];
  const dx = bx - ax, dz = bz - az, lengthSq = dx * dx + dz * dz;
  const t = lengthSq ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq)) : 0;
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
}
export function leeGardenOneGroundBayConflict(ring, edge, t0, t1, padding = 0.42) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  for (const way of LEE_GARDEN_ONE_SERVICE_WAYS) {
    for (let segment = 0; segment < way.local.length - 2; segment += 2) {
      for (let sample = 0; sample <= 6; sample++) {
        const t = t0 + (t1 - t0) * sample / 6, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        if (pointSegmentDistance(x, z, way.local, segment) < way.width * 0.5 + padding) return true;
      }
    }
  }
  return false;
}

export function leeGardenOneEdgeCollider(ring, edge, minY, maxY, depth = 0.72) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const world = leeGardenOneLocalToWorld((ax + bx) * 0.5, (az + bz) * 0.5);
  const { ry } = leeGardenOneEdgeOutward(ring, edge), worldRy = LEE_GARDEN_ONE_SITE.ry + ry;
  const w = Math.hypot(bx - ax, bz - az) + 0.04, d = depth;
  const cs = Math.cos(worldRy), sn = Math.sin(worldRy), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: world.x, z: world.z, w, d, ry: worldRy, minY, maxY,
    minX: world.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: world.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: world.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: world.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: world.x, cz: world.z, hx, hz, cs, sn } };
}
export function leeGardenOneRingColliders(ring, minY, maxY, depth = 0.72) {
  const result = [];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) result.push(leeGardenOneEdgeCollider(ring, edge, minY, maxY, depth));
  return result;
}
export function leeGardenOneFrameCollider(frame, x, z, w, d, minY, maxY, base = 0) {
  const point = leeGardenOneFrameToWorld(frame, x, z), ry = frame.ry;
  const cs = Math.cos(ry), sn = Math.sin(ry), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: point.x, z: point.z, w, d, ry, minY: minY + base, maxY: maxY + base,
    minX: point.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: point.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: point.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: point.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: point.x, cz: point.z, hx, hz, cs, sn } };
}
export function leeGardenOneLocalCollider(x, z, w, d, minY, maxY, ry = LEE_GARDEN_ONE_SITE.ry) {
  const point = leeGardenOneLocalToWorld(x, z), cs = Math.cos(ry), sn = Math.sin(ry), hx = w * 0.5, hz = d * 0.5;
  return { shape: 'box', x: point.x, z: point.z, w, d, ry, minY, maxY,
    minX: point.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: point.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: point.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: point.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: point.x, cz: point.z, hx, hz, cs, sn } };
}

// Make's two-storey glass-box addition occupies only the non-tower southern strip of the OSM building / podium ring.
const extensionEdge = leeGardenOneEdgeOutward(LEE_GARDEN_ONE_BUILDING_RING, 0);
const ei = 0, eax = LEE_GARDEN_ONE_BUILDING_RING[ei], eaz = LEE_GARDEN_ONE_BUILDING_RING[ei + 1];
const ebx = LEE_GARDEN_ONE_BUILDING_RING[ei + 2], ebz = LEE_GARDEN_ONE_BUILDING_RING[ei + 3];
export const LEE_GARDEN_ONE_ROOF_EXTENSION = Object.freeze({
  x: eax + (ebx - eax) * 0.51 - extensionEdge.nx * 4.15,
  z: eaz + (ebz - eaz) * 0.51 - extensionEdge.nz * 4.15,
  ry: extensionEdge.ry, w: 42, d: 6.4, base: LEE_GARDEN_ONE_PODIUM_HEIGHT, height: 7.2,
  evidence: 'Make Architects 2026 two-storey rooftop glass box, green wall and integrated lighting; placement is site-directed'
});
export function isLeeGardenOneEntranceForecourtPoint(x, z) {
  const frame = LEE_GARDEN_ONE_ENTRANCE, cs = Math.cos(frame.ry), sn = Math.sin(frame.ry), dx = x - frame.x, dz = z - frame.z;
  const localX = cs * dx - sn * dz, localZ = sn * dx + cs * dz;
  if (localZ < -0.20 || localZ > LEE_GARDEN_ONE_ENTRANCE_FORECOURT_DEPTH) return false;
  const t = (localZ + 0.20) / (LEE_GARDEN_ONE_ENTRANCE_FORECOURT_DEPTH + 0.20);
  const halfWidth = (LEE_GARDEN_ONE_ENTRANCE_FORECOURT_WIDTH * (1 - t) + LEE_GARDEN_ONE_ENTRANCE_FORECOURT_OUTER_WIDTH * t) * 0.5;
  return Math.abs(localX) <= halfWidth + 1e-9;
}
export function isLeeGardenOnePlazaPoint(x, z) {
  if (isLeeGardenOneEntranceForecourtPoint(x, z)) return true;
  const ring = LEE_GARDEN_ONE_SITE.ring;
  if (pointInFlatRing(ring, x, z)) return true;
  // Source entrance nodes lie exactly on the outer ring and must share the same construction datum.
  for (let i = 0; i + 3 < ring.length; i += 2) {
    const ax = ring[i], az = ring[i + 1], dx = ring[i + 2] - ax, dz = ring[i + 3] - az;
    const lengthSq = dx * dx + dz * dz, t = lengthSq ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq)) : 0;
    if (Math.hypot(x - ax - dx * t, z - az - dz * t) < 1e-7) return true;
  }
  return false;
}
export function leeGardenOneGroundHeightAt(x, z, ground, grounds) {
  return isLeeGardenOnePlazaPoint(x, z) ? Math.max(ground, grounds.plaza) : ground;
}
