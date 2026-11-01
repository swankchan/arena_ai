// Build shared, deterministic deck profiles only for OSM ways whose original bridge tags have been verified.
// OSM layer separates the decks; the six-metre layer step is a presentation parameter, not surveyed engineering height.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeFrame } from '../../geo/frame.mjs';
import cfg from './config.mjs';
import { HK_FULL_ROADS } from '../../../js/hk-full-roads-data.js';
import { HK_TERRAIN, hongKongTerrainHeight } from '../../../js/cities/hongkong/terrain.js';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const INPUT = path.resolve(HERE, '../../data/hongkong/verified-osm-bridges.json');
const OUTPUT = path.resolve(HERE, '../../../js/hk-verified-bridge-data.js');
const ROAD_TOP = 0.025;
const LAYER_STEP = 6;
const GRADE_RUN = 12;
const PROFILE_STEP = 20;
const keyFor = (x, z) => `${x.toFixed(1)},${z.toFixed(1)}`;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothstep = (value) => value * value * (3 - 2 * value);
const surface = (x, z) => hongKongTerrainHeight(x, z) + ROAD_TOP;

const frame = makeFrame(cfg.frame);
const shift = frame.gridUV(frame.origin.lon, frame.origin.lat);
const cs = Math.cos(frame.theta), sn = Math.sin(frame.theta);
function worldToLonLat(x, z) {
  const u = x + shift[0], v = z + shift[1];
  const east = u * cs - v * sn, north = -u * sn - v * cs;
  return [frame.lon0 + east / frame.KX, frame.lat0 + north / frame.KY];
}

function verifyBoundingBox(road, entry) {
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  const flat = road[5];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const [lon, lat] = worldToLonLat(flat[i], flat[i + 1]);
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
  }
  const actual = [minLat, maxLat, minLon, maxLon];
  const delta = Math.max(...actual.map((value, index) => Math.abs(value - entry.boundingBox[index])));
  if (delta > 0.000001) {
    throw new Error(`OSM way ${entry.osmWayId} does not match source record ${entry.sourceRecordIndex}: bbox delta ${delta}`);
  }
  return delta;
}

function segmentSurfaceHeight(road, segmentIndex, t) {
  const flat = road[5], start = segmentIndex * 2;
  const ax = flat[start], az = flat[start + 1];
  const dx = flat[start + 2] - ax, dz = flat[start + 3] - az;
  const length = Math.hypot(dx, dz);
  const x = ax + dx * t, z = az + dz * t;
  if (length < 0.001) return surface(x, z);
  const offsetX = dz / length * road[1] * 0.5, offsetZ = -dx / length * road[1] * 0.5;
  return Math.max(
    surface(x, z),
    surface(x + offsetX, z + offsetZ),
    surface(x - offsetX, z - offsetZ)
  );
}

function vertexSurfaceHeight(road, vertexIndex) {
  const flat = road[5], count = flat.length / 2;
  const vertex = clamp(vertexIndex, 0, count - 1);
  let height = surface(flat[vertex * 2], flat[vertex * 2 + 1]);
  for (const segmentIndex of [vertex - 1, vertex]) {
    if (segmentIndex < 0 || segmentIndex + 1 >= count) continue;
    const start = segmentIndex * 2;
    const dx = flat[start + 2] - flat[start], dz = flat[start + 3] - flat[start + 1];
    const length = Math.hypot(dx, dz);
    if (length < 0.001) continue;
    const x = flat[vertex * 2], z = flat[vertex * 2 + 1];
    const offsetX = dz / length * road[1] * 0.5, offsetZ = -dx / length * road[1] * 0.5;
    height = Math.max(height,
      surface(x + offsetX, z + offsetZ),
      surface(x - offsetX, z - offsetZ));
  }
  return height;
}

function addTerrainStations(stations, road, segmentIndex, offsetSign) {
  const flat = road[5], start = segmentIndex * 2;
  const ax = flat[start], az = flat[start + 1];
  const dx = flat[start + 2] - ax, dz = flat[start + 3] - az;
  const length = Math.hypot(dx, dz);
  if (length < 0.001) return;
  const offsetX = dz / length * road[1] * 0.5 * offsetSign;
  const offsetZ = -dx / length * road[1] * 0.5 * offsetSign;
  const x = ax + offsetX, z = az + offsetZ;
  const { grid } = HK_TERRAIN;
  const addIntersections = (origin, delta, minimum) => {
    if (Math.abs(delta) < 1e-9) return;
    const end = origin + delta;
    const first = Math.ceil((Math.min(origin, end) - minimum) / grid.cell - 1e-9);
    const last = Math.floor((Math.max(origin, end) - minimum) / grid.cell + 1e-9);
    for (let index = first; index <= last; index++) {
      const t = (minimum + index * grid.cell - origin) / delta;
      if (t > 1e-7 && t < 1 - 1e-7) stations.push(t);
    }
  };
  addIntersections(x, dx, grid.minX);
  addIntersections(z, dz, grid.minZ);
  addIntersections(x + z, dx + dz, grid.minX + grid.minZ);
}

export function buildVerifiedBridgeProfiles(source) {
  const ways = source.ways.map((entry) => {
    const road = HK_FULL_ROADS.roads[entry.sourceRecordIndex];
    if (!road) throw new Error(`Missing source road ${entry.sourceRecordIndex}`);
    if (!(road[4] & 2) || (road[4] & 4)) throw new Error(`Source road ${entry.sourceRecordIndex} is not a non-tunnel elevated record`);
    if (!['yes', 'viaduct'].includes(entry.bridge) || !(entry.layer > 0)) {
      throw new Error(`OSM way ${entry.osmWayId} is not eligible for a generic deck`);
    }
    const matchDelta = verifyBoundingBox(road, entry);
    entry.matchDelta = matchDelta;
    const flat = road[5], count = flat.length / 2;
    const chainages = [0];
    for (let i = 1; i < count; i++) {
      chainages.push(chainages.at(-1) + Math.hypot(flat[i * 2] - flat[i * 2 - 2], flat[i * 2 + 1] - flat[i * 2 - 1]));
    }
    const original = Array.from({ length: count }, (_, index) => vertexSurfaceHeight(road, index));
    return {
      entry, road, flat, count, chainages, length: chainages.at(-1), original,
      grounded: Array.from({ length: count }, (_, index) => index === 0 || index === count - 1),
      targets: [...original]
    };
  });

  const nodes = new Map();
  for (const way of ways) {
    for (let vertex = 0; vertex < way.count; vertex++) {
      const key = keyFor(way.flat[vertex * 2], way.flat[vertex * 2 + 1]);
      if (!nodes.has(key)) nodes.set(key, []);
      nodes.get(key).push({ way, vertex });
    }
  }
  // A node shared by verified decks must have exactly one height. Unshared ends remain grounded to their original
  // DTM-connected neighbours, including records whose tags have not been supplemented.
  for (const entries of nodes.values()) {
    if (entries.length < 2) continue;
    for (const { way, vertex } of entries) way.grounded[vertex] = false;
  }

  for (const way of ways) {
    const lift = way.entry.layer * LAYER_STEP;
    const ramp = lift * GRADE_RUN;
    const groundedStations = way.chainages.filter((_, index) => way.grounded[index]);
    const start = way.original[0], end = way.original.at(-1);
    for (let vertex = 0; vertex < way.count; vertex++) {
      if (way.grounded[vertex]) continue;
      const s = way.chainages[vertex];
      const edge = groundedStations.length ? Math.min(...groundedStations.map((anchor) => Math.abs(s - anchor))) : ramp;
      const blend = smoothstep(clamp(edge / Math.max(1, ramp), 0, 1));
      const chord = start + (end - start) * (s / Math.max(1, way.length));
      way.targets[vertex] = Math.max(way.original[vertex], chord + lift * blend);
    }
  }
  const sharedVertices = new Map();
  for (const entries of nodes.values()) {
    if (entries.length < 2) continue;
    const height = Math.max(...entries.map(({ way, vertex }) => way.targets[vertex]));
    for (const { way, vertex } of entries) {
      way.targets[vertex] = height;
      if (!sharedVertices.has(way)) sharedVertices.set(way, new Set());
      sharedVertices.get(way).add(vertex);
    }
  }
  // Raising only a shared endpoint would leave a kink at the next OSM vertex. Once a way meets another verified
  // deck, relax its unshared vertices between that anchor and the grounded approach over the whole available run.
  for (const [way, shared] of sharedVertices) {
    const anchors = new Set([...shared]);
    way.grounded.forEach((grounded, vertex) => { if (grounded) anchors.add(vertex); });
    const sorted = [...anchors].sort((a, b) => a - b);
    for (let vertex = 1; vertex + 1 < way.count; vertex++) {
      if (anchors.has(vertex)) continue;
      const before = sorted.filter((anchor) => anchor < vertex).at(-1);
      const after = sorted.find((anchor) => anchor > vertex);
      if (before === undefined || after === undefined) continue;
      const span = way.chainages[after] - way.chainages[before];
      const t = span > 0 ? (way.chainages[vertex] - way.chainages[before]) / span : 0;
      const continuous = way.targets[before] + (way.targets[after] - way.targets[before]) * t;
      way.targets[vertex] = Math.max(way.original[vertex], continuous);
    }
  }

  let segmentCount = 0, stationCount = 0, maxLift = 0, maxGrade = 0;
  const outputWays = ways.map((way) => {
    const isolatedTwoNode = way.count === 2 && way.grounded.every(Boolean);
    const lift = way.entry.layer * LAYER_STEP;
    const ramp = Math.min(way.length * 0.5, lift * GRADE_RUN);
    const segments = [];
    for (let segmentIndex = 0; segmentIndex + 1 < way.count; segmentIndex++) {
      const length = way.chainages[segmentIndex + 1] - way.chainages[segmentIndex];
      const stations = [0, 1];
      for (let distance = PROFILE_STEP; distance < length; distance += PROFILE_STEP) stations.push(distance / length);
      for (const offset of [0, 1, -1]) addTerrainStations(stations, way.road, segmentIndex, offset);
      stations.sort((a, b) => a - b);
      const ts = [], heights = [];
      for (const t of stations) {
        if (ts.length && t - ts.at(-1) < 1e-7) continue;
        const startHeight = way.targets[segmentIndex], endHeight = way.targets[segmentIndex + 1];
        let height = startHeight + (endHeight - startHeight) * t;
        if (isolatedTwoNode) {
          const s = length * t;
          const blend = smoothstep(clamp(Math.min(s, length - s) / Math.max(1, ramp), 0, 1));
          height += lift * blend;
        }
        if (t !== 0 && t !== 1) height = Math.max(height, segmentSurfaceHeight(way.road, segmentIndex, t));
        ts.push(t); heights.push(height);
      }
      if (ts.at(-1) !== 1) { ts.push(1); heights.push(way.targets[segmentIndex + 1]); }
      for (let i = 0; i < ts.length; i++) {
        const t = ts[i];
        maxLift = Math.max(maxLift, heights[i] - segmentSurfaceHeight(way.road, segmentIndex, t));
        if (i) maxGrade = Math.max(maxGrade, Math.abs(heights[i] - heights[i - 1]) / Math.max(0.001, (t - ts[i - 1]) * length));
      }
      segmentCount++; stationCount += ts.length;
      segments.push({ ts, heights: heights.map((height) => Math.round(height * 10000) / 10000) });
    }
    return {
      wayId: way.entry.sourceRecordIndex,
      osmWayId: way.entry.osmWayId,
      bridge: way.entry.bridge,
      layer: way.entry.layer,
      matchDelta: way.entry.matchDelta,
      vertexHeights: way.targets.map((height) => Math.round(height * 10000) / 10000),
      segments
    };
  });
  return {
    version: 1,
    city: 'hongkong',
    source: {
      retrievedOn: source.retrievedOn,
      attribution: source.attribution,
      matchMethod: source.matchMethod,
      heightStatus: source.heightStatus,
      layerStepMetres: LAYER_STEP,
      gradeRunMetresPerMetre: GRADE_RUN,
      profile: 'OSM-verified bridge/layer with DTM-connected approaches and procedural layer-separated decks; not surveyed engineering elevation'
    },
    stats: { ways: outputWays.length, segments: segmentCount, stations: stationCount, maxLift, maxGrade },
    ways: outputWays
  };
}

export async function buildVerifiedBridges({ inputFile = INPUT, outFile = OUTPUT } = {}) {
  const source = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const data = buildVerifiedBridgeProfiles(source);
  const output = `// Generated by tools/cities/hongkong/build-verified-bridges.mjs. Do not hand-edit.\n// OSM bridge tags are source data; deck heights are procedural, not surveyed engineering elevations.\nexport const HK_VERIFIED_BRIDGES = ${JSON.stringify(data)};\n`;
  fs.writeFileSync(outFile, output);
  console.log(`[hk-verified-bridges] ${data.stats.ways} ways / ${data.stats.segments} segments / ${data.stats.stations} stations`);
  console.log(`[hk-verified-bridges] max presentation lift ${data.stats.maxLift.toFixed(2)} m / max profile grade ${(data.stats.maxGrade * 100).toFixed(1)}%`);
  return data;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildVerifiedBridges();
