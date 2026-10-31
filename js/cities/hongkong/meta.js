import { GEO } from '../../hk-geodata.js';
import {
  FULL_BOUNDS,
  FULL_ROAD_NAMES,
  FULL_PLACE_NAMES,
  isDetailedCore,
  territoryParkAt,
  nearestFullRoad,
  nearestFullRoads,
  spawnOnFullRoad,
  nearestTerritoryPlace,
  territoryPlace
} from './full-meta.js';

// Hong Kong place names, teleports and the HUD locator. Everything here is plain ES module code with no three.js
// dependency, so the map, the HUD and the node tests all read the same geography.
//
// World frame: 1 unit = 1 m, x = east, z = south (north = -z). The frame origin is Statue Square in Central.

const BOUNDS = GEO.bounds;

export const ROAD_NAMES = new Set([
  ...GEO.roadGraph.names,
  ...GEO.roads.map((road) => road[0]),
  ...FULL_ROAD_NAMES
].filter(Boolean));

// Districts, water and the big parks, at their real places. rank 0 = district, 1 = water, 2 = neighbourhood.
export const AREA_LABELS = [
  ['中環', -113, 0, 0],
  ['金鐘', 330, 288, 0],
  ['灣仔', 1381, 443, 0],
  ['銅鑼灣', 2515, 210, 0],
  ['北角', 3442, -842, 0],
  ['鰂魚涌', 5139, -843, 0],
  ['天后', 3900, -650, 0],
  ['大坑', 3444, 400, 0],
  ['跑馬地', 2590, 1100, 0],
  ['上環', -989, -454, 0],
  ['西營盤', -1500, -565, 0],
  ['石塘咀', -1900, -630, 0],
  ['堅尼地城', -2760, -519, 0],
  ['尖沙咀', 1278, -1672, 0],
  ['佐敦', 1175, -2558, 0],
  ['油麻地', 1072, -3333, 0],
  ['旺角', 1010, -4141, 0],
  ['大角咀', 247, -4448, 0],
  ['深水埗', 451, -5103, 0],
  ['長沙灣', -346, -5676, 0],
  ['石硤尾', 595, -5574, 0],
  ['何文田', 1721, -3705, 0],
  ['紅磡', 2412, -2336, 0],
  ['土瓜灣', 3249, -3989, 0],
  ['九龍塘', 1843, -5670, 0],
  ['九龍城', 3133, -4880, 0],
  ['維多利亞港', 557, -1451, 1],
  ['香港公園', 144, 432, 2],
  ['九龍公園', 1072, -2004, 2],
  ['維多利亞公園', 2927, -11, 2],
  ['遮打花園', 20, 20, 2],
  ['皇后像廣場', 0, 0, 2],
  ['天星碼頭', 41, -100, 2],
  ['中環碼頭', -113, -388, 2],
  ['星光大道', 1450, -1280, 2],
  ['西九文化區', 40, -2200, 2],
  ['啟德', 3600, -4700, 2]
];

const LANDMARKS = Object.entries(GEO.landmarks).map(([name, landmark]) => ({ name, ...landmark }));

export const PLACE_NAMES = new Set([
  '香港',
  ...AREA_LABELS.map(([name]) => name),
  ...LANDMARKS.map((landmark) => landmark.name),
  ...GEO.parks.map((park) => park.name).filter(Boolean),
  ...Object.values(GEO.pointNames || {}),
  ...FULL_PLACE_NAMES
]);

// ---------------------------------------------------------------------------------------------------------------------
// Road index: every named road segment in a 120 m grid, so HUD/map hover lookups do not scan thousands of polylines.
// ---------------------------------------------------------------------------------------------------------------------
const CELL = 120;
const roadCells = new Map();
const roadSegments = [];
for (const [name, , , , , flat] of GEO.roads) {
  if (!name) continue;
  for (let i = 0; i + 3 < flat.length; i += 2) {
    const x1 = flat[i], z1 = flat[i + 1], x2 = flat[i + 2], z2 = flat[i + 3];
    const id = roadSegments.length;
    roadSegments.push({ x1, z1, x2, z2, name });
    const i0 = Math.floor(Math.min(x1, x2) / CELL), i1 = Math.floor(Math.max(x1, x2) / CELL);
    const j0 = Math.floor(Math.min(z1, z2) / CELL), j1 = Math.floor(Math.max(z1, z2) / CELL);
    for (let ix = i0; ix <= i1; ix++) {
      for (let iz = j0; iz <= j1; iz++) {
        const key = ix * 100003 + iz;
        let list = roadCells.get(key);
        if (!list) roadCells.set(key, (list = []));
        list.push(id);
      }
    }
  }
}

function pointSegmentDistance(x, z, segment) {
  const dx = segment.x2 - segment.x1, dz = segment.z2 - segment.z1;
  const lengthSq = dx * dx + dz * dz;
  const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((x - segment.x1) * dx + (z - segment.z1) * dz) / lengthSq)) : 0;
  const px = segment.x1 + dx * t, pz = segment.z1 + dz * t;
  return { distance: Math.hypot(x - px, z - pz), x: px, z: pz, t };
}

// Nearest named street segments, one entry per street name, with the closest point on that street.
export function nearestRoads(x, z, radius = 45) {
  if (!isDetailedCore(x, z)) return nearestFullRoads(x, z, radius);
  const best = new Map();
  let ring = Math.ceil(radius / CELL);
  for (let tries = 0; tries < 3; tries++) {
    const ix = Math.floor(x / CELL), iz = Math.floor(z / CELL);
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dz = -ring; dz <= ring; dz++) {
        const list = roadCells.get((ix + dx) * 100003 + (iz + dz));
        if (!list) continue;
        for (const id of list) {
          const segment = roadSegments[id];
          const hit = pointSegmentDistance(x, z, segment);
          if (hit.distance > radius) continue;
          const current = best.get(segment.name);
          if (!current || hit.distance < current.distance) best.set(segment.name, { ...hit, name: segment.name });
        }
      }
    }
    if (best.size) break;
    ring += 2;
  }
  return [...best.values()].sort((a, b) => a.distance - b.distance);
}

function pointInRing(flat, x, z) {
  let inside = false;
  for (let i = 0, j = flat.length - 2; i < flat.length; j = i, i += 2) {
    const xi = flat[i], zi = flat[i + 1], xj = flat[j], zj = flat[j + 1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

const landBounds = GEO.land.map((ring) => {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i + 1 < ring.length; i += 2) {
    minX = Math.min(minX, ring[i]); maxX = Math.max(maxX, ring[i]);
    minZ = Math.min(minZ, ring[i + 1]); maxZ = Math.max(maxZ, ring[i + 1]);
  }
  return { ring, minX, maxX, minZ, maxZ };
});

// Rendered land, rather than the larger OSM road extract. Actors must not follow a road beyond this surface.
export function isLand(x, z) {
  for (const entry of landBounds) {
    if (x < entry.minX || x > entry.maxX || z < entry.minZ || z > entry.maxZ) continue;
    if (pointInRing(entry.ring, x, z)) return true;
  }
  return false;
}

const parkBounds = GEO.parks.map((park) => {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const ring of park.rings) {
    for (let i = 0; i + 1 < ring.length; i += 2) {
      minX = Math.min(minX, ring[i]); maxX = Math.max(maxX, ring[i]);
      minZ = Math.min(minZ, ring[i + 1]); maxZ = Math.max(maxZ, ring[i + 1]);
    }
  }
  return { park, minX, maxX, minZ, maxZ };
});

export function parkAt(x, z) {
  if (!isDetailedCore(x, z)) return territoryParkAt(x, z);
  for (const { park, minX, maxX, minZ, maxZ } of parkBounds) {
    if (x < minX || x > maxX || z < minZ || z > maxZ) continue;
    if (park.rings.some((ring) => pointInRing(ring, x, z))) return park;
  }
  return null;
}

export function landmarkAt(x, z, radius = 85) {
  let best = null, bestDist = radius;
  for (const landmark of LANDMARKS) {
    const d = Math.hypot(landmark.x - x, landmark.z - z);
    if (d < bestDist) { best = landmark; bestDist = d; }
  }
  return best;
}

export function districtOf(x, z) {
  if (!isDetailedCore(x, z)) return nearestTerritoryPlace(x, z)?.name || '香港';
  let best = null, bestDist = Infinity;
  for (const [name, ax, az, rank] of AREA_LABELS) {
    if (rank === 1) continue; // water is not a building district
    const d = Math.hypot(ax - x, az - z);
    if (d < bestDist) { best = name; bestDist = d; }
  }
  return best;
}

// The HUD locator: a landmark (place), a park (place), the two streets at a corner, or the district name.
export function locationLabel(x, z) {
  const landmark = landmarkAt(x, z, 90);
  if (landmark) return landmark.name;
  const park = parkAt(x, z);
  if (park && park.name) return park.name;
  const roads = nearestRoads(x, z, 42).filter((road) => road.name);
  if (roads.length >= 2) return `${roads[0].name} & ${roads[1].name}`;
  if (roads.length === 1) return roads[0].name;
  if (!isDetailedCore(x, z)) return nearestTerritoryPlace(x, z, 9000)?.name || '香港';
  let best = '香港', bestDist = 650;
  for (const [name, ax, az] of AREA_LABELS) {
    const d = Math.hypot(ax - x, az - z);
    if (d < bestDist) { best = name; bestDist = d; }
  }
  return best;
}

// ---------------------------------------------------------------------------------------------------------------------
// Drivable spawn points and map clicks: the nearest graph link, sampled at a clear point along its centreline.
// ---------------------------------------------------------------------------------------------------------------------
const GRAPH = GEO.roadGraph;
const linkLines = GRAPH.links.map(([a, b, name, width, lanes, dir, inner]) => {
  const points = [[GRAPH.nodes[a * 2], GRAPH.nodes[a * 2 + 1]]];
  for (let i = 0; i + 1 < inner.length; i += 2) points.push([inner[i], inner[i + 1]]);
  points.push([GRAPH.nodes[b * 2], GRAPH.nodes[b * 2 + 1]]);
  return { a, b, name, width, lanes, dir, points, nameText: GRAPH.names[name] || '' };
});

export function nearestRoadNode(x, z, { landOnly = false, fullRoad = false } = {}) {
  if (fullRoad) {
    const hit = nearestFullRoad(x, z, { radius: 3000 });
    if (!hit) return null;
    return {
      x: hit.x, z: hit.z, distance: hit.distance, id: `full-${hit.way.id}`,
      width: hit.width, heading: hit.heading, name: hit.name, fullRoad: true
    };
  }
  let best = Infinity, id = -1;
  for (let i = 0; i + 1 < GRAPH.nodes.length; i += 2) {
    const nx = GRAPH.nodes[i], nz = GRAPH.nodes[i + 1];
    const d = Math.hypot(nx - x, nz - z);
    if (d >= best || (landOnly && !isLand(nx, nz))) continue;
    best = d; id = i / 2;
  }
  return id < 0 ? null : { x: GRAPH.nodes[id * 2], z: GRAPH.nodes[id * 2 + 1], distance: best, id };
}

// A point ~40% along the nearest wide enough link, offset into the left-hand lane (Hong Kong drives on the left).
export function spawnOnRoad(x, z, { minWidth = 8, laneOffset = 2.6 } = {}) {
  if (!isDetailedCore(x, z)) {
    return spawnOnFullRoad(x, z, { minWidth, laneOffset }) || { x, z, heading: Math.PI, width: 8 };
  }
  let best = null;
  let bestScore = Infinity;
  for (const link of linkLines) {
    if (link.width < minWidth || link.points.length < 2) continue;
    for (let i = 1; i < link.points.length; i++) {
      const [ax, az] = link.points[i - 1], [bx, bz] = link.points[i];
      const dx = bx - ax, dz = bz - az;
      const lengthSq = dx * dx + dz * dz;
      const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq)) : 0;
      const px = ax + dx * t, pz = az + dz * t;
      const distance = Math.hypot(x - px, z - pz);
      const length = Math.hypot(dx, dz) || 1;
      // A one-way link only runs b -> a; face that way so the spawn is in the legal left-hand lane.
      const dirX = link.dir === -1 ? -dx : dx;
      const dirZ = link.dir === -1 ? -dz : dz;
      // Hong Kong drives on the left: left of travel is (dz, -dx) in a frame where +x is east and +z is south.
      const leftX = dirZ / length, leftZ = -dirX / length;
      const offset = Math.min(laneOffset, Math.max(1.2, link.width * 0.22));
      const spawnX = ax + dx * t + leftX * offset;
      const spawnZ = az + dz * t + leftZ * offset;
      if (!isLand(spawnX, spawnZ)) continue;
      // Prefer close, wide roads; a very narrow street should not win over a major road 15 m away.
      const score = distance - Math.min(8, link.width) * 1.5;
      if (score < bestScore) {
        bestScore = score;
        best = { spawnX, spawnZ, heading: Math.atan2(dirX, dirZ), link };
      }
    }
  }
  if (!best) {
    if (isLand(x, z)) return { x, z, heading: Math.PI, width: 8 };
    const node = nearestRoadNode(x, z, { landOnly: true });
    if (node) return { x: node.x, z: node.z, heading: Math.PI, width: 8 };
    return { x, z, heading: Math.PI, width: 8 };
  }
  return { x: best.spawnX, z: best.spawnZ, heading: best.heading, width: best.link.width };
}

// Check the centreline and both possible left-hand travel lanes, including the outside of a bus body. Sampling long
// segments prevents a road from crossing a clipped coast or dock basin between two otherwise valid vertices.
export function isTrafficPathOnLand(points, width) {
  if (!points || points.length < 2) return false;
  const laneOffset = Math.min(4.2, Math.max(1.7, width * 0.23)) * 1.12 + 1.35;
  let hasSegment = false;
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1], [bx, bz] = points[i];
    const dx = bx - ax, dz = bz - az;
    const length = Math.hypot(dx, dz);
    if (length < 1e-6) continue;
    hasSegment = true;
    const leftX = dz / length, leftZ = -dx / length;
    const steps = Math.max(1, Math.ceil(length / 25));
    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      const x = ax + dx * t, z = az + dz * t;
      if (!isLand(x, z)
        || !isLand(x + leftX * laneOffset, z + leftZ * laneOffset)
        || !isLand(x - leftX * laneOffset, z - leftZ * laneOffset)) return false;
    }
  }
  return hasSegment;
}

export function roadPointForTeleport(x, z) {
  if (!isDetailedCore(x, z)) {
    const hit = nearestFullRoad(x, z, { radius: 3500 });
    if (hit) return { x: hit.x, z: hit.z };
    return {
      x: Math.max(FULL_BOUNDS.minX, Math.min(FULL_BOUNDS.maxX, x)),
      z: Math.max(FULL_BOUNDS.minZ + 20, Math.min(FULL_BOUNDS.maxZ - 20, z))
    };
  }
  const node = nearestRoadNode(x, z, { landOnly: true });
  if (!node) return { x: Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, x)), z: Math.max(BOUNDS.minZ + 20, Math.min(BOUNDS.maxZ - 20, z)) };
  return { x: node.x, z: node.z };
}

export const TELEPORTS = [
  { id: 'central', name: '中環 皇后像廣場', sub: '干諾道中 · 天星碼頭', x: 20, z: -29, heading: 2.4 },
  { id: 'kennedytown', name: '堅尼地城 卑路乍街', sub: '皇后大道西 · 堅彌地城海旁', ...spawnOnRoad(-2700, -500, { minWidth: 10 }) },
  { id: 'shektongtsui', name: '石塘咀 德輔道西', sub: '西邊街 · 山道', ...spawnOnRoad(-1900, -650, { minWidth: 10 }) },
  { id: 'admiralty', name: '金鐘 添馬公園', sub: '金鐘道 · 政府總部', x: 343, z: 283, heading: 2.6 },
  { id: 'wanchai', name: '灣仔 軒尼詩道', sub: '修頓球場 · 灣仔站', x: 1419, z: 467, heading: -1.57 },
  { id: 'causeway', name: '銅鑼灣 軒尼詩道', sub: '時代廣場 · 崇光百貨', x: 2446, z: 193, heading: -1.57 },
  { id: 'happyvalley', name: '跑馬地 黃泥涌道', sub: '雲地利道 · 跑馬地馬場', ...spawnOnRoad(2590, 1100, { minWidth: 8 }) },
  { id: 'quarrybay', name: '鰂魚涌 英皇道', sub: '柏架山道 · 糖廠街', ...spawnOnRoad(5000, -800, { minWidth: 10 }) },
  { id: 'tst', name: '尖沙咀 鐘樓', sub: '梳士巴利道 · 天星碼頭', x: 1316, z: -1517, heading: -2.4 },
  { id: 'jordan', name: '佐敦 佐敦道', sub: '廟街 · 玉器市場', x: 1187, z: -2580, heading: Math.PI },
  { id: 'mongkok', name: '旺角 彌敦道', sub: '亞皆老街 · 女人街', x: 1013, z: -4143, heading: Math.PI },
  { id: 'shamshuipo', name: '深水埗 汝州街', sub: '石硤尾街 · 鴨寮街', ...spawnOnRoad(451, -5103, { minWidth: 10 }) },
  { id: 'kowloontong', name: '九龍塘 律倫街', sub: '金巴倫道 · 達之路', ...spawnOnRoad(1800, -5670, { minWidth: 10 }) }
];

// Territory-wide destinations are projected onto real OSM drivable ways and offset into the left-hand traffic lane.
for (const [id, placeName, label] of [
  ['tuenmun', '屯門', '屯門'], ['yuenlong', '元朗', '元朗'], ['shatin', '沙田', '沙田'],
  ['saikung', '西貢', '西貢'], ['tungchung', '東涌', '東涌'], ['taio', '大澳', '大澳'],
  ['muiwo', '梅窩', '梅窩'], ['cheungchau', '長洲', '長洲'], ['lamma', '榕樹灣', '南丫島 榕樹灣'],
  ['shataukok', '沙頭角', '沙頭角']
]) {
  const place = territoryPlace(placeName);
  const spawn = place && spawnOnFullRoad(place.x, place.z, { minWidth: 6 });
  if (!spawn) throw new Error(`No full-Hong-Kong road spawn for ${placeName}`);
  TELEPORTS.push({
    id, name: `${label} 道路`, sub: `${spawn.name || 'OSM 道路'} · 靠左行駛`,
    x: spawn.x, z: spawn.z, heading: spawn.heading
  });
}

// Spawns away from the busiest junction, each in its own lane/sidewalk.
export const SPAWN = {
  person: { x: -4, z: 2, heading: 2.4 },
  car: spawnOnRoad(-40, -250, { minWidth: 10, laneOffset: 3.0 }),
  cyclist: spawnOnRoad(20, -29, { minWidth: 8, laneOffset: 2.2 }),
  helicopter: { x: 80, z: -620, y: 190, heading: 2.4 }
};

export function getLocationLabel(x, z) {
  return locationLabel(x, z);
}
