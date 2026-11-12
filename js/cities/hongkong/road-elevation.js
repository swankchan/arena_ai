import { HK_FULL_ROADS } from './building-priority-roads.js';
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
import { ONE_EXCHANGE_GROUND_RINGS } from './one-exchange-square-architecture.js';
import { TWO_EXCHANGE_GROUND_RINGS } from './two-exchange-square-architecture.js';
import { CFA_GROUND_RINGS } from './court-of-final-appeal-architecture.js';
import { HKCEC_GROUND_RINGS } from './hkcec-architecture.js';
import { TIMES_SQUARE_GROUND_RINGS } from './times-square-architecture.js';
import { HARBOUR_CITY_GROUND_RINGS } from './harbour-city-architecture.js';
import { PENINSULA_GROUND_RINGS } from './peninsula-hotel-architecture.js';
import { SHERATON_GROUND_RINGS } from './sheraton-hotel-architecture.js';
import { SALISBURY_GROUND_RINGS } from './salisbury-ymca-architecture.js';
import { KOWLOON_SHANGRI_LA_GROUND_RINGS } from './kowloon-shangri-la-architecture.js';
import { CGO_GROUND_RINGS } from './central-government-architecture.js';
import { THE_ARCH_GROUND_RINGS } from './the-arch-architecture.js';
import { SORRENTO_GROUND_RINGS } from './sorrento-architecture.js';
import { smoothConstrainedProfileHeights } from './road-profile-smoothing.js';
import { HK_ROAD_DECKS } from '../../hk-road-deck-data.js';

export const ROAD_SURFACE_OFFSET = 0.025;
export const ROAD_PROFILE_STEP = 20;
const tunnelData = HK_TERRAIN.tunnel;
const tunnelBytes = new Uint8Array(atob(tunnelData.heights).split('').map((character) => character.charCodeAt(0)));
const tunnelHeights = new Int16Array(tunnelBytes.buffer);
const tunnelWays = new Map();
const verifiedBridgeWays = new Map(HK_VERIFIED_BRIDGES.ways.map((way) => [way.wayId, way]));
// Mapped flyovers whose OSM layer is known but whose height is not surveyed: a stated presentation lift over the road
// they cross, with a graded ramp at each end. See tools/cities/hongkong/build-road-decks.mjs.
const deckWays = new Map(HK_ROAD_DECKS.decks.map((deck) => [deck.wayId, deck]));
const profileCache = new Map();
const smoothedWayCache = new Map();
// Government House approach and the forecourt branch share a node but independent
// per-way smoothing used to put them 3.5 m apart. These are indices in the bundled
// road snapshot, NOT OSM IDs; fail closed if the source is regenerated.
const GH_FORECOURT = 38479, GH_APPROACH = 38480;
const GH_EXPECTED = new Map([
  [GH_FORECOURT, [-272.9,415.6,-257,401.3,-266.9,391.8,-267.2,380.8,-257.9,371.9,-245.4,373.4,-225.7,391.8,-226,403.7,-234,410.8,-246.6,410.3,-257,401.3]],
  [GH_APPROACH, [-225.7,391.8,-212.8,393.9,-200.4,408.5,-198.3,413.9,-197.8,419.5,-202.2,441.4,-201,444.8,-198.7,446.4,-190.6,448.5,-185.9,448,-180.1,444.3,-157.2,424.8,-153.9,424,-150.5,425.2]]
]);
for (const [id, expected] of GH_EXPECTED) {
  const r=HK_FULL_ROADS.roads[id];
  if (!r || r[0]!=='' || r[1]!==5.5 || r[4]!==0 || r[5].length!==expected.length || r[5].some((v,i)=>v!==expected[i]))
    throw new Error(`Government House road profile ${id} no longer matches source`);
}
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

// Ordinary surface ways are drawn from one shared node table. Two OSM ways that meet at the same mapped node used to
// sample opposite road shoulders, so their drawn surfaces met metres apart there and the carriageway visibly broke
// apart on a hillside (measured on the bundled data: 18,829 of 44,709 shared surface nodes disagreed by more than
// 5 cm, 7,176 by more than 30 cm, worst 7.8 m). A shared node now has exactly one height: the highest cross-section
// sample any adjoining way produced there. Nothing is lowered and no height is invented — the weld only reuses a
// sample one of the ways already had.
//
// Welding alone would move the crease one vertex inwards, so the neighbouring vertices are relaxed towards their
// chord as well (bounded, never lowering). The welded nodes and the two ends of each way stay fixed.
const WELD_RELAX_PASSES = 24;
const WELD_RELAX_MAX_RISE = 2;
const weldNodeHeights = new Map();
const weldFixedVertices = new Map();
let weldTableBuilt = false;

const weldKey = (x, z) => `${x.toFixed(2)},${z.toFixed(2)}`;

function isOrdinarySurfaceWay(wayId) {
  const road = HK_FULL_ROADS.roads[wayId];
  return Boolean(road) && !(road[4] & 2) && !(road[4] & 4) &&
    !verifiedBridgeWays.has(wayId) && !tunnelWays.has(wayId);
}

function buildSurfaceWeldTable() {
  const waysPerNode = new Map();
  for (let wayId = 0; wayId < HK_FULL_ROADS.roads.length; wayId++) {
    if (!isOrdinarySurfaceWay(wayId)) continue;
    const flat = HK_FULL_ROADS.roads[wayId][5];
    for (let i = 0; i < flat.length; i += 2) {
      const key = weldKey(flat[i], flat[i + 1]);
      let entries = waysPerNode.get(key);
      if (!entries) waysPerNode.set(key, (entries = []));
      entries.push([wayId, i / 2]);
    }
  }
  for (const [key, entries] of waysPerNode) {
    let height = -Infinity;
    for (const [wayId, vertex] of entries) height = Math.max(height, rawRoadRibbonHeightAtVertex(wayId, vertex));
    weldNodeHeights.set(key, height);
    if (entries.length < 2) continue;
    for (const [wayId, vertex] of entries) {
      let fixed = weldFixedVertices.get(wayId);
      if (!fixed) weldFixedVertices.set(wayId, (fixed = new Set()));
      fixed.add(vertex);
    }
  }
  weldTableBuilt = true;
}

export function surfaceWeldStats() {
  if (!weldTableBuilt) buildSurfaceWeldTable();
  let weldedVertices = 0;
  for (const fixed of weldFixedVertices.values()) weldedVertices += fixed.size;
  return { nodes: weldNodeHeights.size, waysWithSharedNodes: weldFixedVertices.size, weldedVertices };
}

// Deck heights cannot follow the raw blend alone: the ground under a short deck link can climb steeply, so the lift is
// also limited between adjacent vertices. Everything is measured relative to the ground the deck stands on, and the
// ground itself is never lowered.
const MAX_DECK_GRADE = 0.12;
const deckVertexCache = new Map();
function deckVertexHeights(deck, wayId) {
  const flat = HK_FULL_ROADS.roads[wayId][5];
  const count = flat.length / 2;
  const ground = new Float64Array(count);
  const lift = new Float64Array(count);
  for (let vertex = 0; vertex < count; vertex++) {
    ground[vertex] = Math.max(rawRoadRibbonHeightAtVertex(wayId, vertex),
      surfaceRoadHeight(flat[vertex * 2], flat[vertex * 2 + 1]));
    lift[vertex] = Math.max(0, deck.lift * deck.vertexBlend[vertex]);
  }
  const run = (index) =>
    Math.hypot(flat[index * 2] - flat[index * 2 - 2], flat[index * 2 + 1] - flat[index * 2 - 1]);
  for (let index = 1; index < count; index++) lift[index] = Math.min(lift[index], lift[index - 1] + MAX_DECK_GRADE * run(index));
  for (let index = count - 2; index >= 0; index--) lift[index] = Math.min(lift[index], lift[index + 1] + MAX_DECK_GRADE * run(index + 1));
  const heights = new Float64Array(count);
  for (let index = 0; index < count; index++) heights[index] = ground[index] + lift[index];
  return heights;
}

function deckHeightAtVertex(deck, wayId, vertexIndex) {
  const count = HK_FULL_ROADS.roads[wayId][5].length / 2;
  let heights = deckVertexCache.get(wayId);
  if (!heights) deckVertexCache.set(wayId, (heights = deckVertexHeights(deck, wayId)));
  return heights[Math.max(0, Math.min(count - 1, vertexIndex))];
}

export function roadRibbonHeightAtVertex(wayId, vertexIndex) {
  const road = HK_FULL_ROADS.roads[wayId];
  // Mapped flyovers first: they must stay above whatever they span, never welded to the surface beneath.
  const deck = deckWays.get(wayId);
  if (deck && !(road?.[4] & 4) && !verifiedBridgeWays.has(wayId)) return deckHeightAtVertex(deck, wayId, vertexIndex);
  // Elevated ways keep their original bridge profile as well: only verified examples have surveyed replacement
  // heights, but none of them should be lifted towards a terrain chord as if they were ordinary surface streets.
  if ((road?.[4] & 2) || verifiedBridgeWays.has(wayId) || tunnelWays.has(wayId)) {
    return rawRoadRibbonHeightAtVertex(wayId, vertexIndex);
  }
  let heights = smoothedWayCache.get(wayId);
  if (!heights) {
    if (!weldTableBuilt) buildSurfaceWeldTable();
    const flat = HK_FULL_ROADS.roads[wayId]?.[5] || [];
    const nodes = [];
    for (let i = 0; i < flat.length; i += 2) {
      const welded = weldNodeHeights.get(weldKey(flat[i], flat[i + 1]));
      nodes.push({ x: flat[i], z: flat[i + 1],
        height: Math.max(rawRoadRibbonHeightAtVertex(wayId, i / 2), welded ?? -Infinity) });
    }
    if (wayId === GH_APPROACH) {
      // Tie the shared forecourt junction exactly, then lift intermediate valley
      // vertices toward a continuous grade; endpoints otherwise remain unchanged.
      nodes[0].height = roadRibbonHeightAtVertex(GH_FORECOURT, 6);
    }
    const fixed = weldFixedVertices.get(wayId);
    heights = smoothConstrainedProfileHeights(nodes, 18, fixed);
    if (wayId !== GH_APPROACH) heights = weldAndRelax(nodes, heights, fixed);
    smoothedWayCache.set(wayId, heights);
  }
  return heights[Math.max(0, Math.min(heights.length - 1, vertexIndex))] ?? 0;
}

// The weld height of a shared node must survive the whole way's profile exactly, otherwise the two ways still meet at
// different levels. The smoothing above has no notion of a fixed vertex, so the welded nodes are restored afterwards
// and the neighbouring vertices carry the difference.
function weldAndRelax(nodes, heights, fixed) {
  const count = heights.length;
  if (!fixed || !fixed.size || count < 3) return heights;
  const welded = heights.slice();
  for (const vertex of fixed) welded[vertex] = Math.max(welded[vertex], nodes[vertex].height);
  return pinFixedVertices(relaxWeldedNeighbours(welded, fixed), welded, fixed);
}

// A fixed vertex is only ever raised here: lowering it would put the surface under the terrain.
function pinFixedVertices(heights, welded, fixed) {
  const out = heights.slice();
  for (const vertex of fixed) out[vertex] = Math.max(out[vertex], welded[vertex]);
  return out;
}

// Raise the vertices next to a welded node towards their neighbours' chord so the join does not become one sharp grade
// change. The correction never lowers a vertex and is capped per vertex.
function relaxWeldedNeighbours(heights, fixed) {
  const count = heights.length;
  if (count < 3) return heights;
  const start = heights.slice();
  const result = heights.slice();
  for (let pass = 0; pass < WELD_RELAX_PASSES; pass++) {
    const previous = result.slice();
    for (let vertex = 1; vertex < count - 1; vertex++) {
      if (fixed?.has(vertex)) continue;
      const target = (previous[vertex - 1] + previous[vertex + 1]) / 2;
      if (target <= previous[vertex]) continue;
      result[vertex] = Math.min(start[vertex] + WELD_RELAX_MAX_RISE,
        previous[vertex] + (target - previous[vertex]) * 0.5);
    }
  }
  return result;
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

// Most of the 77,000 ways are nowhere near an authored construction pad.
// Cache conservative AABBs once and reject disjoint segments before testing the
// original ring edges. This does not change the actual intersection maths.
const roadPadRings = [HSBC_SITE.ring, SCB_SITE.ring, ICC_SITE.ring, AIRSIDE_SITE.ring, LEE_GARDEN_ONE_SITE.ring, ONE_IFC_SITE.ring, CHAMPION_TOWER_SITE.ring, CKC2_SITE.ring, QGO_SITE.ring, CONRAD_SITE.ring, HYSAN_SITE.ring, TWO_TAIKOO_SITE.ring, ...HENDERSON_GROUND_RINGS, ...ONE_EXCHANGE_GROUND_RINGS, ...TWO_EXCHANGE_GROUND_RINGS, ...CFA_GROUND_RINGS, ...HKCEC_GROUND_RINGS, ...TIMES_SQUARE_GROUND_RINGS, ...HARBOUR_CITY_GROUND_RINGS, ...PENINSULA_GROUND_RINGS, ...SHERATON_GROUND_RINGS, ...SALISBURY_GROUND_RINGS, ...KOWLOON_SHANGRI_LA_GROUND_RINGS, ...CGO_GROUND_RINGS, ...THE_ARCH_GROUND_RINGS, ...SORRENTO_GROUND_RINGS].map((ring) => {
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < ring.length; i += 2) {
    minX = Math.min(minX, ring[i]); maxX = Math.max(maxX, ring[i]);
    minZ = Math.min(minZ, ring[i + 1]); maxZ = Math.max(maxZ, ring[i + 1]);
  }
  return {ring, minX, minZ, maxX, maxZ};
});
function addPadStations(stations, boundaries, ax, az, dx, dz, offsetX, offsetZ) {
  const x = ax + offsetX, z = az + offsetZ;
  const minX = Math.min(x, x + dx), maxX = Math.max(x, x + dx);
  const minZ = Math.min(z, z + dz), maxZ = Math.max(z, z + dz);
  // The edge test accepts u within 1e-8 of an endpoint. Expand each
  // box by a conservative coordinate-scaled tolerance to preserve it.
  for (const pad of roadPadRings) {
    const tolerance = 1e-8 * Math.max(1, pad.maxX - pad.minX, pad.maxZ - pad.minZ);
    if (maxX < pad.minX - tolerance || minX > pad.maxX + tolerance ||
        maxZ < pad.minZ - tolerance || minZ > pad.maxZ + tolerance) continue;
    const ring = pad.ring;
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
  const deck = deckWays.get(wayId);
  const ax = flat[start], az = flat[start + 1];
  const dx = flat[start + 2] - ax, dz = flat[start + 3] - az;
  const length = Math.hypot(dx, dz);
  // A mapped flyover is a structure, not terrain: its profile is the deck between the two vertex heights, so the
  // carriageway beneath stays on the ground instead of the envelope dragging the deck back down mid-span.
  if (deck) {
    return { ts: [0, 1], heights: [roadRibbonHeightAtVertex(wayId, segmentIndex), roadRibbonHeightAtVertex(wayId, segmentIndex + 1)] };
  }
  if (length < 0.001) {
    const height = roadRibbonHeightAtVertex(wayId, segmentIndex);
    return { ts: [0, 1], heights: [height, height] };
  }
  // This local driveway is a visually obvious staircase when smoothed vertices
  // alternate with unsmoothed DTM interior stations. Use the same continuous
  // vertex-to-vertex profile for drawing, paint and movement. The forecourt
  // approach segment immediately before the shared node gets the same treatment.
  if (wayId === GH_APPROACH || (wayId === GH_FORECOURT && segmentIndex === 5)) {
    return { ts: [0, 1], heights: [roadRibbonHeightAtVertex(wayId, segmentIndex), roadRibbonHeightAtVertex(wayId, segmentIndex + 1)] };
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
  return { ts, heights: flattenInteriorProfile(ts, heights) };
}

// Between two drawn vertices the envelope is sampled every ROAD_PROFILE_STEP metres on the centreline and both
// shoulders, so on a hillside the max-of-three reading lifts separate stations by centimetres and the carriageway
// becomes a sawtooth even though its vertices are smoothed. A real road between two levels rises at most once. The
// tallest rise above the straight chord is kept (usually a genuine crest or a bridge-pier shelf) and the remaining
// stations sit on the chord. The end heights are untouched, so adjoining segments, the rendered triangles and the
// entity ground query still meet exactly.
const SINGLE_HUMP_FLOOR = 0.1;
function flattenInteriorProfile(ts, heights) {
  if (ts.length < 3) return heights;
  const startHeight = heights[0], endHeight = heights.at(-1);
  const chord = (index) => startHeight + (endHeight - startHeight) * ts[index];
  let peak = -1, peakRise = SINGLE_HUMP_FLOOR;
  for (let index = 1; index + 1 < ts.length; index++) {
    const rise = heights[index] - chord(index);
    if (rise > peakRise) { peak = index; peakRise = rise; }
  }
  const out = heights.slice();
  for (let index = 1; index + 1 < ts.length; index++) {
    out[index] = index === peak ? Math.max(heights[index], chord(index)) : chord(index);
  }
  return out;
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
