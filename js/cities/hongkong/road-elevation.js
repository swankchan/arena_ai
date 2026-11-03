import { HK_FULL_ROADS } from '../../hk-full-roads-data.js';
import { HK_VERIFIED_BRIDGES } from '../../hk-verified-bridge-data.js';
import { HK_TERRAIN, hongKongTerrainHeight } from './terrain.js';
import { HSBC_SITE } from './hsbc-headquarters-architecture.js';
import { SCB_SITE } from './standard-chartered-architecture.js';
import { ICC_SITE } from './icc-architecture.js';
import { AIRSIDE_SITE } from './airside-architecture.js';
import { LEE_GARDEN_ONE_SITE } from './lee-garden-one-architecture.js';
import { ONE_IFC_SITE } from './one-ifc-architecture.js';
import { CHAMPION_TOWER_SITE } from './champion-tower-architecture.js';
import { CKC2_SITE } from './ckc2-architecture.js';
import { QGO_SITE } from './qgo-architecture.js';
import { CONRAD_SITE } from './conrad-architecture.js';
import { HYSAN_SITE } from './hysan-place-architecture.js';
import { TWO_TAIKOO_SITE } from './two-taikoo-place-architecture.js';
import { HENDERSON_GROUND_RINGS } from './the-henderson-architecture.js';
import { smoothConstrainedProfileHeights } from './road-profile-smoothing.js';

export const ROAD_SURFACE_OFFSET = 0.025;
export const ROAD_PROFILE_STEP = 20;
const tunnelData = HK_TERRAIN.tunnel;
const tunnelBytes = new Uint8Array(atob(tunnelData.heights).split('').map((character) => character.charCodeAt(0)));
const tunnelHeights = new Int16Array(tunnelBytes.buffer);
const tunnelWays = new Map();
const verifiedBridgeWays = new Map(HK_VERIFIED_BRIDGES.ways.map((way) => [way.wayId, way]));
const profileCache = new Map();
const smoothedWayCache = new Map();
let tunnelVertexCount = 0;

for (const [wayId, road] of HK_FULL_ROADS.roads.entries()) {
  if (!(road[4] & 4)) continue;
  const count = road[5].length / 2;
  tunnelWays.set(wayId, { offset: tunnelVertexCount, count });
  tunnelVertexCount += count;
}
if (tunnelVertexCount !== tunnelHeights.length || tunnelWays.size !== tunnelData.wayCount) {
  throw new Error('Hong Kong tunnel elevation data does not match the OSM road ways');
}

export function surfaceRoadHeight(x, z) {
  return hongKongTerrainHeight(x, z) + ROAD_SURFACE_OFFSET;
}

// segmentIndex is the zero-based pair of original OSM vertices. Surface and elevated ways sample the DTM directly;
// tunnel ways use the generated portal-connected profile stored in the same original vertex order.
export function roadHeightAtSegment(wayId, segmentIndex, t, x, z) {
  if (verifiedBridgeWays.has(wayId)) return roadRibbonHeightAtSegment(wayId, segmentIndex, t);
  const tunnel = tunnelWays.get(wayId);
  if (!tunnel) return surfaceRoadHeight(x, z);
  const a = tunnelHeights[tunnel.offset + segmentIndex] / tunnelData.scale;
  const b = tunnelHeights[tunnel.offset + segmentIndex + 1] / tunnelData.scale;
  return a + (b - a) * t;
}

function rawRibbonHeight(wayId, segmentIndex, t) {
  const road = HK_FULL_ROADS.roads[wayId], flat = road?.[5];
  const start = segmentIndex * 2;
  if (!flat || start + 3 >= flat.length) return 0;
  const ax = flat[start], az = flat[start + 1];
  const dx = flat[start + 2] - ax, dz = flat[start + 3] - az;
  const length = Math.hypot(dx, dz);
  const x = ax + dx * t, z = az + dz * t;
  if (length < 0.001) return surfaceRoadHeight(x, z);
  const offsetX = dz / length * road[1] * 0.5, offsetZ = -dx / length * road[1] * 0.5;
  return Math.max(
    surfaceRoadHeight(x, z),
    surfaceRoadHeight(x + offsetX, z + offsetZ),
    surfaceRoadHeight(x - offsetX, z - offsetZ)
  );
}

// Adjacent ways segments must agree at their shared OSM vertex. Taking the higher of both cross-sections avoids a
// vertical crack at bends while keeping every point across the carriageway on one level transverse plane.
function rawRoadRibbonHeightAtVertex(wayId, vertexIndex) {
  const tunnel = tunnelWays.get(wayId);
  const bridge = verifiedBridgeWays.get(wayId);
  const road = HK_FULL_ROADS.roads[wayId], flat = road?.[5];
  if (!flat) return 0;
  const count = flat.length / 2;
  const vertex = Math.max(0, Math.min(count - 1, vertexIndex));
  if (bridge) return bridge.vertexHeights[vertex];
  if (tunnel) return tunnelHeights[tunnel.offset + vertex] / tunnelData.scale;
  const x = flat[vertex * 2], z = flat[vertex * 2 + 1];
  let height = surfaceRoadHeight(x, z);
  for (const segmentIndex of [vertex - 1, vertex]) {
    const start = segmentIndex * 2;
    if (start < 0 || start + 3 >= flat.length) continue;
    const dx = flat[start + 2] - flat[start], dz = flat[start + 3] - flat[start + 1];
    const length = Math.hypot(dx, dz);
    if (length < 0.001) continue;
    const offsetX = dz / length * road[1] * 0.5, offsetZ = -dx / length * road[1] * 0.5;
    height = Math.max(height,
      surfaceRoadHeight(x + offsetX, z + offsetZ),
      surfaceRoadHeight(x - offsetX, z - offsetZ));
  }
  return height;
}

export function roadRibbonHeightAtVertex(wayId, vertexIndex) {
  const road = HK_FULL_ROADS.roads[wayId];
  // Elevated ways keep their original bridge profile as well: only verified examples have surveyed replacement
  // heights, but none of them should be lifted towards a terrain chord as if they were ordinary surface streets.
  if ((road?.[4] & 2) || verifiedBridgeWays.has(wayId) || tunnelWays.has(wayId)) {
    return rawRoadRibbonHeightAtVertex(wayId, vertexIndex);
  }
  let heights = smoothedWayCache.get(wayId);
  if (!heights) {
    const flat = HK_FULL_ROADS.roads[wayId]?.[5] || [];
    const nodes = [];
    for (let i = 0; i < flat.length; i += 2) nodes.push({ x: flat[i], z: flat[i + 1],
      height: rawRoadRibbonHeightAtVertex(wayId, i / 2) });
    heights = smoothConstrainedProfileHeights(nodes);
    smoothedWayCache.set(wayId, heights);
  }
  return heights[Math.max(0, Math.min(heights.length - 1, vertexIndex))] ?? 0;
}

function addTerrainStations(stations, ax, az, dx, dz, offsetX, offsetZ) {
  const grid = HK_TERRAIN.grid, cell = grid.cell;
  const x = ax + offsetX, z = az + offsetZ;
  // Each centre/shoulder sample is linear inside a DTM triangle. Split at its grid and diagonal boundaries; between
  // these stations the chord of max(centre, left, right) is conservative and can be shared exactly by mesh and queries.
  const addIntersections = (origin, delta, minimum) => {
    if (Math.abs(delta) < 1e-9) return;
    const end = origin + delta;
    const first = Math.ceil((Math.min(origin, end) - minimum) / cell - 1e-9);
    const last = Math.floor((Math.max(origin, end) - minimum) / cell + 1e-9);
    for (let index = first; index <= last; index++) {
      const t = (minimum + index * cell - origin) / delta;
      if (t > 1e-7 && t < 1 - 1e-7) stations.push(t);
    }
  };
  addIntersections(x, dx, grid.minX);
  addIntersections(z, dz, grid.minZ);
  addIntersections(x + z, dx + dz, grid.minX + grid.minZ);
}

function addPadStations(stations, boundaries, ax, az, dx, dz, offsetX, offsetZ) {
  const x = ax + offsetX, z = az + offsetZ;
  for (const ring of [HSBC_SITE.ring, SCB_SITE.ring, ICC_SITE.ring, AIRSIDE_SITE.ring, LEE_GARDEN_ONE_SITE.ring, ONE_IFC_SITE.ring, CHAMPION_TOWER_SITE.ring, CKC2_SITE.ring, QGO_SITE.ring, CONRAD_SITE.ring, HYSAN_SITE.ring, TWO_TAIKOO_SITE.ring, ...HENDERSON_GROUND_RINGS]) {
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
      const px = ring[j], pz = ring[j + 1], ex = ring[i] - px, ez = ring[i + 1] - pz;
      const denominator = dx * ez - dz * ex;
      if (Math.abs(denominator) < 1e-9) continue;
      const rx = px - x, rz = pz - z;
      const t = (rx * ez - rz * ex) / denominator;
      const u = (rx * dz - rz * dx) / denominator;
      if (t > 1e-7 && t < 1 - 1e-7 && u >= -1e-8 && u <= 1 + 1e-8) {
        stations.push(t);
        boundaries.add(t);
      }
    }
  }
}

function buildRibbonProfile(wayId, segmentIndex) {
  const road = HK_FULL_ROADS.roads[wayId], flat = road?.[5];
  const start = segmentIndex * 2;
  if (!flat || start + 3 >= flat.length) return { ts: [0, 1], heights: [0, 0] };
  const bridge = verifiedBridgeWays.get(wayId);
  if (bridge) return bridge.segments[segmentIndex] || { ts: [0, 1], heights: [0, 0] };
  if (tunnelWays.has(wayId)) {
    return { ts: [0, 1], heights: [roadRibbonHeightAtVertex(wayId, segmentIndex), roadRibbonHeightAtVertex(wayId, segmentIndex + 1)] };
  }
  const ax = flat[start], az = flat[start + 1];
  const dx = flat[start + 2] - ax, dz = flat[start + 3] - az;
  const length = Math.hypot(dx, dz);
  if (length < 0.001) {
    const height = roadRibbonHeightAtVertex(wayId, segmentIndex);
    return { ts: [0, 1], heights: [height, height] };
  }
  const stations = [0, 1], boundaries = new Set();
  for (let distance = ROAD_PROFILE_STEP; distance < length; distance += ROAD_PROFILE_STEP) stations.push(distance / length);
  const offsetX = dz / length * road[1] * 0.5, offsetZ = -dx / length * road[1] * 0.5;
  addTerrainStations(stations, ax, az, dx, dz, 0, 0);
  addTerrainStations(stations, ax, az, dx, dz, offsetX, offsetZ);
  addTerrainStations(stations, ax, az, dx, dz, -offsetX, -offsetZ);
  addPadStations(stations, boundaries, ax, az, dx, dz, 0, 0);
  addPadStations(stations, boundaries, ax, az, dx, dz, offsetX, offsetZ);
  addPadStations(stations, boundaries, ax, az, dx, dz, -offsetX, -offsetZ);
  stations.sort((a, b) => a - b);
  const ts = [], heights = [];
  const sampleHeight = (t) => {
    if (!boundaries.has(t)) return rawRibbonHeight(wayId, segmentIndex, t);
    // A construction pad is a step in the terrain field. Use the higher side at its boundary so both adjoining chords
    // remain above the actual ground instead of interpolating through the lower pad or the higher original hillside.
    return Math.max(rawRibbonHeight(wayId, segmentIndex, t),
      rawRibbonHeight(wayId, segmentIndex, Math.max(0, t - 1e-6)),
      rawRibbonHeight(wayId, segmentIndex, Math.min(1, t + 1e-6)));
  };
  for (const t of stations) {
    if (ts.length && t - ts.at(-1) < 1e-7) continue;
    ts.push(t);
    heights.push(t === 0 ? roadRibbonHeightAtVertex(wayId, segmentIndex)
      : t === 1 ? roadRibbonHeightAtVertex(wayId, segmentIndex + 1) : sampleHeight(t));
  }
  if (ts.at(-1) !== 1) { ts.push(1); heights.push(roadRibbonHeightAtVertex(wayId, segmentIndex + 1)); }
  return { ts, heights };
}

// The same deterministic stations drive road triangles, derived paint and entity ground queries. Consequently a
// query between two rendered vertices returns the rendered chord height rather than a different fresh DTM sample.
export function roadRibbonProfileAtSegment(wayId, segmentIndex) {
  const key = wayId * 100000 + segmentIndex;
  let profile = profileCache.get(key);
  if (!profile) {
    profile = buildRibbonProfile(wayId, segmentIndex);
    profileCache.set(key, profile);
  }
  return profile;
}

export function roadRibbonHeightAtSegment(wayId, segmentIndex, t) {
  const profile = roadRibbonProfileAtSegment(wayId, segmentIndex);
  const clamped = Math.max(0, Math.min(1, t));
  let low = 0, high = profile.ts.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (profile.ts[middle] <= clamped) low = middle;
    else high = middle;
  }
  const span = profile.ts[high] - profile.ts[low];
  const local = span > 0 ? (clamped - profile.ts[low]) / span : 0;
  return profile.heights[low] + (profile.heights[high] - profile.heights[low]) * local;
}

export function roadHeightAtVertex(wayId, vertexIndex, x, z) {
  const bridge = verifiedBridgeWays.get(wayId);
  if (bridge) return bridge.vertexHeights[vertexIndex];
  const tunnel = tunnelWays.get(wayId);
  return tunnel ? tunnelHeights[tunnel.offset + vertexIndex] / tunnelData.scale : surfaceRoadHeight(x, z);
}

export function verifiedBridgeProfileAtSegment(wayId, segmentIndex) {
  return verifiedBridgeWays.get(wayId)?.segments[segmentIndex] || null;
}

export function isVerifiedBridgeRoad(wayOrId) {
  const wayId = typeof wayOrId === 'number' ? wayOrId : wayOrId?.id;
  return verifiedBridgeWays.has(wayId);
}

export function isTunnelRoad(wayOrId) {
  const wayId = typeof wayOrId === 'number' ? wayOrId : wayOrId?.id;
  return tunnelWays.has(wayId);
}

export const TERRAIN_TUNNEL_OPENING_RECTS = HK_TERRAIN.tunnel.openingRects;
