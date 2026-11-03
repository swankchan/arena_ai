import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { makeFrame } from '../../geo/frame.mjs';
import { HK_FULL_ROADS } from '../../../js/hk-full-roads-data.js';
import { roadRibbonHeightAtSegment, surfaceRoadHeight } from '../../../js/cities/hongkong/road-elevation.js';
import { crossingSurfaceAt } from '../../../js/cities/hongkong/crossings.js';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const DEFAULT_SOURCE = path.resolve(HERE, '../../data/hongkong/tram-network-source.json');
const DEFAULT_OUT = path.resolve(HERE, '../../../js/hk-tram-network-data.js');
const DEFAULT_MANIFEST = path.resolve(HERE, '../../data/hongkong/tram-network-manifest.json');
const SAMPLE_STEP = 3;
const SUPPORT_SPACING = 32;
const CONTACT_WIRE_HEIGHT = 6;
const POLE_HEIGHT = 6.65;
const ROAD_MARGIN = 0.45;
const MAX_TRACK_GRADE = 0.12;
const MAX_SUPPORT_SPAN = 32;
const q = (value) => Math.round(value * 100) / 100;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function buildRoadIndex(bounds) {
  const cellSize = 100, margin = 30, cells = new Map();
  const key = (x, z) => `${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`;
  let segments = 0;
  for (let wayId = 0; wayId < HK_FULL_ROADS.roads.length; wayId++) {
    const road = HK_FULL_ROADS.roads[wayId];
    if (road[4] & 6) continue; // Tramways are surface infrastructure; never sample a bridge or tunnel by mistake.
    const flat = road[5];
    for (let segmentIndex = 0; segmentIndex + 3 < flat.length; segmentIndex++) {
      const ax = flat[segmentIndex * 2], az = flat[segmentIndex * 2 + 1];
      const bx = flat[segmentIndex * 2 + 2], bz = flat[segmentIndex * 2 + 3];
      const dx = bx - ax, dz = bz - az, lengthSq = dx * dx + dz * dz;
      if (lengthSq < 1e-8) continue;
      if (Math.max(ax, bx) < bounds.minX || Math.min(ax, bx) > bounds.maxX || Math.max(az, bz) < bounds.minZ || Math.min(az, bz) > bounds.maxZ) continue;
      const item = { wayId, segmentIndex, ax, az, dx, dz, lengthSq, width: road[1] };
      const minX = Math.min(ax, bx) - margin, maxX = Math.max(ax, bx) + margin;
      const minZ = Math.min(az, bz) - margin, maxZ = Math.max(az, bz) + margin;
      for (let cx = Math.floor(minX / cellSize); cx <= Math.floor(maxX / cellSize); cx++) {
        for (let cz = Math.floor(minZ / cellSize); cz <= Math.floor(maxZ / cellSize); cz++) {
          const cellKey = `${cx},${cz}`;
          let list = cells.get(cellKey);
          if (!list) cells.set(cellKey, (list = []));
          list.push(item);
        }
      }
      segments++;
    }
  }
  function projections(x, z) {
    const list = cells.get(key(x, z)) || [], result = [];
    for (const item of list) {
      const t = clamp(((x - item.ax) * item.dx + (z - item.az) * item.dz) / item.lengthSq, 0, 1);
      const px = item.ax + item.dx * t, pz = item.az + item.dz * t;
      const distance = Math.hypot(x - px, z - pz);
      result.push({ ...item, t, x: px, z: pz, distance });
    }
    return result;
  }
  function nearest(x, z) {
    let best = null;
    for (const item of projections(x, z)) if (!best || item.distance < best.distance) best = item;
    return best;
  }
  return { nearest, projections, segments };
}

function chainLine(line, toWorld) {
  const coordinates = [];
  for (const segment of line.segments) {
    const geometry = segment[2];
    if (!Array.isArray(geometry) || geometry.length < 2) throw new Error(`${line.id}: invalid segment geometry`);
    if (coordinates.length) {
      const previous = coordinates.at(-1), next = geometry[0];
      if (Math.abs(previous[0] - next[0]) > 1e-8 || Math.abs(previous[1] - next[1]) > 1e-8) {
        throw new Error(`${line.id}: route-relation chain is not continuous`);
      }
    }
    coordinates.push(...(coordinates.length ? geometry.slice(1) : geometry));
  }
  const points = [];
  for (const [lon, lat] of coordinates) {
    const [x, z] = toWorld(lon, lat);
    if (points.length && Math.hypot(x - points.at(-1).x, z - points.at(-1).z) < 0.005) continue;
    points.push({ x, z });
  }
  if (points.length < 2) throw new Error(`${line.id}: no usable track geometry`);
  return points;
}

function resampleAndElevate(points, roadIndex, lineId) {
  const result = [];
  let roadFallbacks = 0, offCarriagewayPoints = 0, maxRoadDistance = 0, previousWayId = -1;
  for (let index = 0; index < points.length - 1; index++) {
    const a = points[index], b = points[index + 1];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const divisions = Math.max(1, Math.ceil(length / SAMPLE_STEP));
    for (let step = index === 0 ? 0 : 1; step <= divisions; step++) {
      const t = step / divisions;
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      const previousY = result.at(-1)?.y;
      let hit = null, y = null, bestScore = Infinity;
      const nearby = roadIndex.projections(x, z).filter((option) => option.distance <= 18);
      const onRoad = nearby.filter((option) => option.distance <= option.width * 0.5 + 2.4);
      for (const option of (onRoad.length ? onRoad : nearby)) {
        const height = roadRibbonHeightAtSegment(option.wayId, option.segmentIndex, option.t);
        const continuity = previousY === undefined ? 0 : Math.abs(height - previousY) * 2.4;
        const sameWay = option.wayId === previousWayId ? -0.8 : 0;
        const score = option.distance + continuity + sameWay;
        if (score < bestScore) { bestScore = score; hit = option; y = height; }
      }
      if (!hit) { y = surfaceRoadHeight(x, z); roadFallbacks++; offCarriagewayPoints++; }
      else {
        maxRoadDistance = Math.max(maxRoadDistance, hit.distance); previousWayId = hit.wayId;
        if (hit.distance > hit.width * 0.5 + 2.4) offCarriagewayPoints++;
      }
      const needsPaving = !hit || hit.distance > hit.width * 0.5 + 0.45;
      result.push({ x: q(x), y: q(y), z: q(z), rawY: q(y), needsPaving });
    }
  }
  if (result.length < 2) throw new Error(`${lineId}: resampling failed`);
  return { points: result, roadFallbacks, offCarriagewayPoints, maxRoadDistance };
}

function smoothTrackHeights(points) {
  const heights = points.map((point) => point.y);
  // Road matching can change ways at a junction. Limit both upward and downward steps in both directions so a single
  // overlapping OSM profile cannot turn embedded rails into a staircase. This is a visual profile constraint, not a
  // claim that the approximate DTM is an engineering survey of the tramway.
  for (let i = 1; i < points.length; i++) {
    const horizontal = Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
    const allowance = horizontal * MAX_TRACK_GRADE;
    heights[i] = clamp(heights[i], heights[i - 1] - allowance, heights[i - 1] + allowance);
  }
  for (let i = points.length - 2; i >= 0; i--) {
    const horizontal = Math.hypot(points[i].x - points[i + 1].x, points[i].z - points[i + 1].z);
    const allowance = horizontal * MAX_TRACK_GRADE;
    heights[i] = clamp(heights[i], heights[i + 1] - allowance, heights[i + 1] + allowance);
  }
  let maxCorrection = 0;
  points.forEach((point, index) => {
    maxCorrection = Math.max(maxCorrection, Math.abs(heights[index] - point.y));
    point.y = q(heights[index]);
  });
  return maxCorrection;
}

function pathMetrics(points) {
  const distances = [0];
  let maxHeightStep = 0, maxGrade = 0;
  for (let i = 1; i < points.length; i++) {
    const horizontal = Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
    const dy = Math.abs(points[i].y - points[i - 1].y);
    distances.push(distances[i - 1] + horizontal);
    maxHeightStep = Math.max(maxHeightStep, dy);
    if (horizontal > 0.01) maxGrade = Math.max(maxGrade, dy / horizontal);
  }
  return { distances, length: distances.at(-1), maxHeightStep, maxGrade };
}

function projectToPath(points, distances, x, z) {
  let best = null;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dz = b.z - a.z;
    const lengthSq = dx * dx + dz * dz || 1;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / lengthSq, 0, 1);
    const px = a.x + dx * t, pz = a.z + dz * t;
    const distance = Math.hypot(x - px, z - pz);
    if (!best || distance < best.distance) {
      best = { distance, s: distances[i - 1] + Math.sqrt(lengthSq) * t };
    }
  }
  return best;
}

function samplePath(points, distances, s) {
  let low = 0, high = distances.length - 1;
  const value = clamp(s, 0, distances.at(-1));
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (distances[middle] <= value) low = middle;
    else high = middle;
  }
  const a = points[low], b = points[Math.min(points.length - 1, low + 1)];
  const span = Math.max(1e-9, distances[Math.min(distances.length - 1, low + 1)] - distances[low]);
  const t = (value - distances[low]) / span;
  const dx = b.x - a.x, dz = b.z - a.z, horizontal = Math.hypot(dx, dz) || 1;
  return { x: a.x + dx * t, y: a.y + (b.y - a.y) * t, z: a.z + dz * t, dx: dx / horizontal, dz: dz / horizontal };
}

function baseHeight(x, z) {
  const crossing = crossingSurfaceAt(x, z, 1);
  return crossing?.kind === 'bridge' ? crossing.height : surfaceRoadHeight(x, z);
}

function clearPole(x, z, nx, nz, roadIndex) {
  let px = x, pz = z;
  for (let iteration = 0; iteration < 36; iteration++) {
    const hit = roadIndex.nearest(px, pz);
    if (!hit || hit.distance >= hit.width * 0.5 + ROAD_MARGIN) {
      if (Math.hypot(px - x, pz - z) > MAX_SUPPORT_SPAN * 0.5) break;
      return [q(px), q(baseHeight(px, pz)), q(pz)];
    }
    const move = Math.max(0.65, hit.width * 0.5 + ROAD_MARGIN + 0.55 - hit.distance);
    px += nx * move; pz += nz * move;
  }
  // Dense terminus junctions can have overlapping carriageways in the original normal direction. Try a bounded radial
  // fallback, then omit that support rather than putting a pole in traffic or inventing an unreachable kerb position.
  for (const radius of [2, 4, 7, 11, 16]) {
    for (let step = 0; step < 16; step++) {
      const angle = step * Math.PI / 8;
      const px = x + Math.sin(angle) * radius, pz = z + Math.cos(angle) * radius;
      const hit = roadIndex.nearest(px, pz);
      if (!hit || hit.distance >= hit.width * 0.5 + ROAD_MARGIN) return [q(px), q(baseHeight(px, pz)), q(pz)];
    }
  }
  return null;
}

function buildTerminusCrossovers(tracks, roadIndex) {
  const east = tracks.find((track) => track.id === 'hk-tram-east');
  const west = tracks.find((track) => track.id === 'hk-tram-west');
  const definitions = [
    ['hk-tram-x-wst', '石塘咀總站渡線', 'Shek Tong Tsui Terminus crossover', 'wst'],
    ['hk-tram-x-wmt', '西港城總站渡線', 'Western Market Terminus crossover', 'wmt'],
    ['hk-tram-x-cbt', '銅鑼灣總站渡線', 'Causeway Bay Terminus crossover', 'cbt']
  ];
  const crossovers = [];
  for (const [id, name, nameEn, stopCode] of definitions) {
    const eastStop = east.stops.find((stop) => stop[0].endsWith(`-${stopCode}`));
    const westStop = west.stops.find((stop) => stop[0].endsWith(`-${stopCode}`));
    const anchorTrack = eastStop ? east : west, anchorStop = eastStop || westStop;
    if (!anchorStop) throw new Error(`Missing official terminus stop ${stopCode}`);
    const otherTrack = eastStop ? west : east;
    const anchor = samplePath(anchorTrack.pointObjects, anchorTrack.distances, anchorStop[3]);
    const projected = eastStop && westStop
      ? { s: westStop[3] }
      : projectToPath(otherTrack.pointObjects, otherTrack.distances, anchor.x, anchor.z);
    let eastS = eastStop ? anchorStop[3] : projected.s;
    let westS = eastStop ? projected.s : anchorStop[3];
    let a = samplePath(east.pointObjects, east.distances, eastS);
    let b = samplePath(west.pointObjects, west.distances, westS);
    if (Math.hypot(b.x - a.x, b.z - a.z) < 20) {
      eastS = Math.max(0, eastS - 16); westS = Math.max(0, westS - 16);
      a = samplePath(east.pointObjects, east.distances, eastS);
      b = samplePath(west.pointObjects, west.distances, westS);
    }
    const separation = Math.hypot(b.x - a.x, b.z - a.z);
    const control = clamp(separation * 0.42, 8, 24);
    // The reversing move leaves the westbound alignment against its normal service direction, so the rail itself stays
    // tangent to the shared corridor instead of making a 90-degree jump between the two carriageways.
    const c1 = { x: a.x + a.dx * control, z: a.z + a.dz * control };
    const c2 = { x: b.x + b.dx * control, z: b.z + b.dz * control };
    const chained = [];
    for (let step = 0; step <= 40; step++) {
      const t = step / 40, u = 1 - t;
      chained.push({
        x: u ** 3 * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t ** 3 * b.x,
        z: u ** 3 * a.z + 3 * u * u * t * c1.z + 3 * u * t * t * c2.z + t ** 3 * b.z
      });
    }
    const elevated = resampleAndElevate(chained, roadIndex, id);
    smoothTrackHeights(elevated.points);
    const metrics = pathMetrics(elevated.points);
    crossovers.push({
      id, name, nameEn, derived: 'official-terminus-crossover', points: elevated.points.flatMap((point) => [point.x, point.y, point.z]),
      stops: [], length: q(metrics.length), sourceDistanceKm: q(metrics.length / 1000), distances: metrics.distances,
      pointObjects: elevated.points, roadFallbacks: elevated.roadFallbacks,
      offCarriagewayPoints: elevated.offCarriagewayPoints, maxRoadDistance: elevated.maxRoadDistance
    });
  }
  return crossovers;
}

function connectTrackJunctions(tracks) {
  const byId = new Map(tracks.map((track, index) => [track.id, index]));
  const nearestIndex = (track, point) => {
    let best = -1, distance = Infinity;
    track.pointObjects.forEach((candidate, index) => {
      const next = Math.hypot(candidate.x - point.x, candidate.z - point.z);
      if (next < distance) { distance = next; best = index; }
    });
    if (distance > 1.6) throw new Error(`${track.id}: junction is ${distance.toFixed(2)} m from its parent track`);
    return best;
  };
  const endpoint = (trackIndex, end) => ({ trackIndex, pointIndex: end ? tracks[trackIndex].pointObjects.length - 1 : 0 });
  const branch = (id, end, parentId) => {
    const trackIndex = byId.get(id), parentIndex = byId.get(parentId);
    const pointIndex = end ? tracks[trackIndex].pointObjects.length - 1 : 0;
    return [endpoint(trackIndex, end), { trackIndex: parentIndex, pointIndex: nearestIndex(tracks[parentIndex], tracks[trackIndex].pointObjects[pointIndex]) }];
  };
  const links = [
    [endpoint(byId.get('hk-tram-east'), 1), endpoint(byId.get('hk-tram-west'), 0)],
    [endpoint(byId.get('hk-tram-west'), 1), endpoint(byId.get('hk-tram-east'), 0)],
    branch('hk-tram-hv', 0, 'hk-tram-east'), branch('hk-tram-hv', 1, 'hk-tram-west'),
    branch('hk-tram-np', 0, 'hk-tram-east'), branch('hk-tram-np', 1, 'hk-tram-west'),
    branch('hk-tram-x-wst', 0, 'hk-tram-east'), branch('hk-tram-x-wst', 1, 'hk-tram-west'),
    branch('hk-tram-x-wmt', 0, 'hk-tram-east'), branch('hk-tram-x-wmt', 1, 'hk-tram-west'),
    branch('hk-tram-x-cbt', 0, 'hk-tram-east'), branch('hk-tram-x-cbt', 1, 'hk-tram-west')
  ];
  const equalize = () => {
    for (const [a, b] of links) {
      const pa = tracks[a.trackIndex].pointObjects[a.pointIndex], pb = tracks[b.trackIndex].pointObjects[b.pointIndex];
      const height = (pa.y + pb.y) * 0.5;
      pa.y = height; pb.y = height;
    }
  };
  for (let iteration = 0; iteration < 24; iteration++) {
    equalize();
    for (const track of tracks) smoothTrackHeights(track.pointObjects);
  }
  equalize();
  let maxMismatch = 0;
  for (const [a, b] of links) {
    maxMismatch = Math.max(maxMismatch, Math.abs(tracks[a.trackIndex].pointObjects[a.pointIndex].y - tracks[b.trackIndex].pointObjects[b.pointIndex].y));
  }
  return maxMismatch;
}

function buildSpans(tracks, roadIndex) {
  const candidates = [];
  tracks.forEach((track, trackIndex) => {
    for (let s = 18; s < track.length - 10; s += SUPPORT_SPACING) {
      const p = samplePath(track.pointObjects, track.distances, s);
      candidates.push({ trackIndex, s, ...p });
    }
  });
  // Westbound drops reuse nearby eastbound spans wherever the same roadside poles can physically support both wires.
  const order = { 'hk-tram-east': 0, 'hk-tram-hv': 1, 'hk-tram-np': 2, 'hk-tram-west': 3 };
  candidates.sort((a, b) => (order[tracks[a.trackIndex].id] ?? 10) - (order[tracks[b.trackIndex].id] ?? 10) || a.s - b.s);
  const spans = [];
  for (const candidate of candidates) {
    const track = tracks[candidate.trackIndex];
    let host = null;
    for (const span of spans) {
      if (span.drops.some((drop) => drop[0] === candidate.trackIndex)) continue;
      const dx = candidate.x - span.cx, dz = candidate.z - span.cz;
      const distance = Math.hypot(dx, dz);
      const tangentDot = candidate.dx * span.dx + candidate.dz * span.dz;
      const along = Math.abs(dx * span.dx + dz * span.dz);
      const lateral = Math.abs(dx * span.dz - dz * span.dx);
      if (distance <= 8 && tangentDot >= 0.45 && along <= span.halfLength - 0.5 && lateral <= 3.5) { host = span; break; }
    }
    if (host) { host.drops.push([candidate.trackIndex, q(candidate.s)]); continue; }
    const hit = roadIndex.nearest(candidate.x, candidate.z);
    const halfSpan = clamp((hit?.width || 8) * 0.5 + 1.1, 4.5, 10);
    const nx = candidate.dz, nz = -candidate.dx;
    const left = clearPole(candidate.x + nx * halfSpan, candidate.z + nz * halfSpan, nx, nz, roadIndex);
    const right = clearPole(candidate.x - nx * halfSpan, candidate.z - nz * halfSpan, -nx, -nz, roadIndex);
    if (!left || !right || Math.hypot(left[0] - right[0], left[2] - right[2]) > MAX_SUPPORT_SPAN) continue;
    spans.push({
      left, right, drops: [[candidate.trackIndex, q(candidate.s)]],
      cx: (left[0] + right[0]) * 0.5, cz: (left[2] + right[2]) * 0.5,
      dx: candidate.dx, dz: candidate.dz,
      halfLength: Math.hypot(left[0] - right[0], left[2] - right[2]) * 0.5
    });
  }
  return spans.map((span) => ({ left: span.left, right: span.right, drops: span.drops }));
}

function sourceBounds(lines, toWorld) {
  const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const line of lines) for (const segment of line.segments) for (const [lon, lat] of segment[2]) {
    const [x, z] = toWorld(lon, lat);
    bounds.minX = Math.min(bounds.minX, x - 60); bounds.maxX = Math.max(bounds.maxX, x + 60);
    bounds.minZ = Math.min(bounds.minZ, z - 60); bounds.maxZ = Math.max(bounds.maxZ, z + 60);
  }
  return bounds;
}

export async function buildHongKongTramNetwork({
  sourceFile = DEFAULT_SOURCE, outFile = DEFAULT_OUT, manifestFile = DEFAULT_MANIFEST
} = {}) {
  const { default: cfg } = await import('./config.mjs');
  const frame = makeFrame(cfg.frame);
  const source = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
  const roadIndex = buildRoadIndex(sourceBounds(source.lines, frame.toWorld));
  const tracks = [];
  let totalRoadFallbacks = 0, totalOffCarriageway = 0, maxRoadDistance = 0, maxHeightStep = 0, maxGrade = 0, maxHeightCorrection = 0;
  for (const line of source.lines) {
    const chained = chainLine(line, frame.toWorld);
    const elevated = resampleAndElevate(chained, roadIndex, line.id);
    const points = elevated.points;
    smoothTrackHeights(points);
    const metrics = pathMetrics(points);
    const stops = line.stations.map((station) => {
      const [x, z] = frame.toWorld(station[2], station[3]);
      const projected = projectToPath(points, metrics.distances, x, z);
      if (projected.distance > 3) throw new Error(`${line.id}: ${station[0]} is ${projected.distance.toFixed(2)} m off its track`);
      return [station[0], station[1], station[4], q(projected.s)];
    });
    for (let i = 1; i < points.length; i++) {
      const horizontal = Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
      const dy = Math.abs(points[i].y - points[i - 1].y);
      maxHeightStep = Math.max(maxHeightStep, dy);
      if (horizontal > 0.01) maxGrade = Math.max(maxGrade, dy / horizontal);
    }
    totalRoadFallbacks += elevated.roadFallbacks;
    totalOffCarriageway += elevated.offCarriagewayPoints;
    maxRoadDistance = Math.max(maxRoadDistance, elevated.maxRoadDistance);
    tracks.push({
      id: line.id, name: line.name, nameEn: line.nameRoma,
      points: points.flatMap((point) => [point.x, point.y, point.z]),
      stops, length: q(metrics.length), sourceDistanceKm: q(line.segments.reduce((sum, segment) => sum + segment[0], 0) * 100) / 100,
      distances: metrics.distances, pointObjects: points
    });
  }
  const crossovers = buildTerminusCrossovers(tracks, roadIndex);
  for (const track of crossovers) {
    totalRoadFallbacks += track.roadFallbacks;
    totalOffCarriageway += track.offCarriagewayPoints;
    maxRoadDistance = Math.max(maxRoadDistance, track.maxRoadDistance);
    tracks.push(track);
  }
  const junctionMaxHeightMismatch = connectTrackJunctions(tracks);
  for (const track of tracks) track.points = track.pointObjects.flatMap((point) => [point.x, q(point.y), point.z]);
  const spans = buildSpans(tracks, roadIndex);
  const publicTracks = tracks.map((track) => ({
    id: track.id, name: track.name, nameEn: track.nameEn, derived: track.derived, points: track.points,
    paving: track.pointObjects.flatMap((point, index) => point.needsPaving ? [index] : []),
    stops: track.stops, length: track.length, sourceDistanceKm: track.sourceDistanceKm
  }));
  const uniquePoles = new Set();
  for (const span of spans) for (const pole of [span.left, span.right]) uniquePoles.add(pole.map((value) => Math.round(value * 10)).join(','));
  maxHeightStep = 0; maxGrade = 0;
  for (const track of tracks) {
    const metrics = pathMetrics(track.pointObjects);
    maxHeightStep = Math.max(maxHeightStep, metrics.maxHeightStep); maxGrade = Math.max(maxGrade, metrics.maxGrade);
    for (const point of track.pointObjects) maxHeightCorrection = Math.max(maxHeightCorrection, Math.abs(point.y - point.rawY));
  }
  const stats = {
    trackCount: tracks.length,
    trackLengthM: q(tracks.reduce((sum, track) => sum + track.length, 0)),
    trackPointCount: tracks.reduce((sum, track) => sum + track.points.length / 3, 0),
    stopAssignments: tracks.reduce((sum, track) => sum + track.stops.length, 0),
    uniqueStops: new Set(tracks.flatMap((track) => track.stops.map((stop) => stop[0].replace(/^hk-official-tram-/, '').toUpperCase()))).size,
    supportSpans: spans.length,
    supportPoles: uniquePoles.size,
    maxSupportSpanM: q(spans.reduce((maximum, span) => Math.max(maximum, Math.hypot(span.left[0] - span.right[0], span.left[2] - span.right[2])), 0)),
    roadFallbacks: totalRoadFallbacks,
    offCarriagewayPoints: totalOffCarriageway,
    asphaltInfillPoints: publicTracks.reduce((sum, track) => sum + track.paving.length, 0),
    maxRoadDistanceM: q(maxRoadDistance),
    maxHeightStepM: q(maxHeightStep),
    maxGrade: Math.round(maxGrade * 10000) / 10000,
    maxHeightCorrectionM: q(maxHeightCorrection),
    junctionMaxHeightMismatchM: q(junctionMaxHeightMismatch)
  };
  const data = {
    version: 1,
    source: source.source,
    gauge: 1.067,
    railHeadWidth: 0.064,
    voltageDC: 550,
    contactWireHeight: CONTACT_WIRE_HEIGHT,
    poleHeight: POLE_HEIGHT,
    supportSpacing: SUPPORT_SPACING,
    tracks: publicTracks,
    spans,
    stats
  };
  const output = `// Generated by tools/cities/hongkong/build-tram-network.mjs.\n// Track centre-lines: © OpenStreetMap contributors, ODbL 1.0. See tools/data/hongkong/tram-network-source.json.\nexport const HK_TRAM_NETWORK = ${JSON.stringify(data)};\n`;
  const manifest = {
    version: 1,
    source: { file: path.relative(process.cwd(), sourceFile), sha256: sha256(sourceFile), ...source.source },
    roadSource: { sha256: HK_FULL_ROADS.source.sha256, timestamp: HK_FULL_ROADS.source.sourceTimestamp, indexedSurfaceSegments: roadIndex.segments },
    derivation: { sampleStepM: SAMPLE_STEP, supportSpacingM: SUPPORT_SPACING, contactWireHeightM: CONTACT_WIRE_HEIGHT, poleHeightM: POLE_HEIGHT, roadMarginM: ROAD_MARGIN, maxTrackGrade: MAX_TRACK_GRADE, maxSupportSpanM: MAX_SUPPORT_SPAN, derivedTerminusCrossovers: 3 },
    output: path.relative(process.cwd(), outFile), bytes: Buffer.byteLength(output), stats
  };
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(outFile, output);
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`[hk-tram] ${stats.trackCount} tracks, ${(stats.trackLengthM / 1000).toFixed(3)} km, ${stats.stopAssignments} stop assignments`);
  console.log(`[hk-tram] ${stats.supportSpans} spans / ${stats.supportPoles} poles, ${stats.roadFallbacks} terrain fallbacks, max grade ${(stats.maxGrade * 100).toFixed(2)}%`);
  console.log(`[hk-tram] ${outFile} (${manifest.bytes} bytes)`);
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildHongKongTramNetwork();
}
