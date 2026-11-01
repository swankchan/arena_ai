import { GEO } from '../../hk-geodata.js';
import { HK_FULL_ROADS } from '../../hk-full-roads-data.js';
import { ROAD_MARK_STYLES } from './traffic-aid-geometry.js';

// Auxiliary paint is evaluated in the existing asphalt shader, not emitted as millions of coincident triangles.
// Its coordinates come from each OSM way's centreline, width, lane count and direction. It is not surveyed paint.
export const DERIVED_LINE_WIDTH = 0.12;
export const DERIVED_EDGE_INSET = 0.24;
export const DERIVED_DASH = Object.freeze({ mark: 3, gap: 3 });
export const DERIVED_JUNCTION_CLEARANCE = 7;
export const DERIVED_SURVEYED_CLEARANCE = 1.25;
const SURVEY_GUARD_MARGIN = 8;
const REF_VERTEX_SCALE = 1000000;
const CROSSING_TYPES = new Set(['SOLID', 'NONE', 'RM1076', 'ZEBRA4']);

function surveyedPaintBounds(aids = GEO.trafficAids) {
  if (!aids) return null;
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const key of ['marks', 'crossings', 'yellowBoxes', 'yellowBoxPolygons']) {
    for (const entry of aids[key] || []) {
      for (const part of entry.parts || []) {
        for (let i = 0; i + 1 < part.length; i += 2) {
          minX = Math.min(minX, part[i]); maxX = Math.max(maxX, part[i]);
          minZ = Math.min(minZ, part[i + 1]); maxZ = Math.max(maxZ, part[i + 1]);
        }
      }
    }
  }
  if (!Number.isFinite(minX)) return null;
  return {
    minX: minX - SURVEY_GUARD_MARGIN, maxX: maxX + SURVEY_GUARD_MARGIN,
    minZ: minZ - SURVEY_GUARD_MARGIN, maxZ: maxZ + SURVEY_GUARD_MARGIN
  };
}

export const SURVEYED_PAINT_GUARD = surveyedPaintBounds();
export const DERIVED_ROAD_MARKINGS = Object.freeze({
  lineWidth: DERIVED_LINE_WIDTH,
  edgeInset: DERIVED_EDGE_INSET,
  dashMark: DERIVED_DASH.mark,
  dashGap: DERIVED_DASH.gap,
  junctionClearance: DERIVED_JUNCTION_CLEARANCE,
  surveyedClearance: DERIVED_SURVEYED_CLEARANCE
});

// Negative means a two-way carriageway; the absolute value is always the recorded total lane count. This packs the
// direction distinction into the existing vec4 without adding another per-vertex attribute to the territory roads.
export function signedRoadLaneCount(road) {
  const lanes = Math.max(1, Math.round(road[3] || 1));
  return road[2] === 0 ? -lanes : lanes;
}

function pointSegmentDistance(point, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const length2 = dx * dx + dz * dz;
  const t = length2 ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / length2)) : 0;
  return Math.hypot(point[0] - a[0] - dx * t, point[1] - a[1] - dz * t);
}

function segmentsDistance(a, b, c, d) {
  const cross = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b);
  if (((abC <= 0 && abD >= 0) || (abC >= 0 && abD <= 0)) &&
      ((cdA <= 0 && cdB >= 0) || (cdA >= 0 && cdB <= 0))) {
    const denominator = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
    if (Math.abs(denominator) > 1e-7) return 0;
  }
  return Math.min(pointSegmentDistance(a, c, d), pointSegmentDistance(b, c, d),
    pointSegmentDistance(c, a, b), pointSegmentDistance(d, a, b));
}

function surveyedParts(aids) {
  const parts = [];
  for (const mark of aids?.marks || []) {
    // Only guard paint that the official renderer can actually draw. Unknown/elevated records must not leave a
    // second, invisible exclusion zone with neither the official mark nor a useful auxiliary line.
    if (mark.elevation == null && ROAD_MARK_STYLES[mark.type]) parts.push(...mark.parts);
  }
  for (const crossing of aids?.crossings || []) if (CROSSING_TYPES.has(crossing.type)) parts.push(...crossing.parts);
  for (const box of aids?.yellowBoxes || []) parts.push(...box.parts);
  for (const polygon of aids?.yellowBoxPolygons || []) parts.push(...(polygon.parts || polygon.rings || []));
  return parts;
}

function nearSurveyedPaint(road, segmentIndex, parts) {
  const flat = road[5], start = segmentIndex * 2;
  const a = [flat[start], flat[start + 1]], b = [flat[start + 2], flat[start + 3]];
  const clearance = road[1] * 0.5 + DERIVED_SURVEYED_CLEARANCE;
  for (const part of parts) {
    for (let i = 0; i + 3 < part.length; i += 2) {
      if (segmentsDistance(a, b, [part[i], part[i + 1]], [part[i + 2], part[i + 3]]) <= clearance) return true;
    }
  }
  return false;
}

const segmentKey = (wayId, segmentIndex) => wayId * 100000 + segmentIndex;
const nodeKey = (x, z) => Math.round(x * 10) * 1000000 + Math.round(z * 10);

// Build a compact paint policy from geometry, not from road names. A node with three or more incident segments is a
// junction even when a through-road and a terminating side road are represented by only two OSM ways.
export function buildDerivedRoadPaintPolicy(roads = HK_FULL_ROADS.roads, aids = GEO.trafficAids) {
  const nodes = new Map();
  for (const [wayId, road] of roads.entries()) {
    const flat = road[5];
    for (let vertex = 0; vertex < flat.length / 2; vertex++) {
      const key = nodeKey(flat[vertex * 2], flat[vertex * 2 + 1]);
      const ref = wayId * REF_VERTEX_SCALE + vertex;
      const existing = nodes.get(key);
      if (existing === undefined) nodes.set(key, ref);
      else if (Array.isArray(existing)) existing.push(ref);
      else nodes.set(key, [existing, ref]);
    }
  }

  const junctionVertices = new Map();
  let junctionNodes = 0;
  for (const refs of nodes.values()) {
    if (!Array.isArray(refs)) continue;
    let degree = 0;
    for (const ref of refs) {
      const wayId = Math.floor(ref / REF_VERTEX_SCALE), vertex = ref % REF_VERTEX_SCALE;
      const count = roads[wayId][5].length / 2;
      degree += (vertex > 0 ? 1 : 0) + (vertex + 1 < count ? 1 : 0);
    }
    if (degree < 3) continue;
    junctionNodes++;
    for (const ref of refs) {
      const wayId = Math.floor(ref / REF_VERTEX_SCALE), vertex = ref % REF_VERTEX_SCALE;
      if (!junctionVertices.has(wayId)) junctionVertices.set(wayId, []);
      junctionVertices.get(wayId).push(vertex);
    }
  }
  nodes.clear();

  const ways = new Map();
  for (const [wayId, vertices] of junctionVertices) {
    const flat = roads[wayId][5], chainages = [0];
    for (let i = 1; i < flat.length / 2; i++) {
      chainages.push(chainages.at(-1) + Math.hypot(flat[i * 2] - flat[i * 2 - 2], flat[i * 2 + 1] - flat[i * 2 - 1]));
    }
    const gaps = [];
    for (const vertex of vertices.sort((a, b) => a - b)) {
      const start = Math.max(0, chainages[vertex] - DERIVED_JUNCTION_CLEARANCE);
      const end = Math.min(chainages.at(-1), chainages[vertex] + DERIVED_JUNCTION_CLEARANCE);
      if (gaps.length && start <= gaps.at(-1)[1]) gaps.at(-1)[1] = Math.max(gaps.at(-1)[1], end);
      else gaps.push([start, end]);
    }
    ways.set(wayId, { gaps });
  }

  const surveyed = new Set(), bounds = surveyedPaintBounds(aids), parts = surveyedParts(aids);
  if (bounds && parts.length) {
    for (const [wayId, road] of roads.entries()) {
      const flat = road[5];
      let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
      for (let i = 0; i < flat.length; i += 2) {
        minX = Math.min(minX, flat[i]); maxX = Math.max(maxX, flat[i]);
        minZ = Math.min(minZ, flat[i + 1]); maxZ = Math.max(maxZ, flat[i + 1]);
      }
      if (maxX < bounds.minX || minX > bounds.maxX || maxZ < bounds.minZ || minZ > bounds.maxZ) continue;
      for (let segmentIndex = 0; segmentIndex + 1 < flat.length / 2; segmentIndex++) {
        if (nearSurveyedPaint(road, segmentIndex, parts)) surveyed.add(segmentKey(wayId, segmentIndex));
      }
    }
  }

  return {
    ways, surveyed,
    stats: {
      junctionNodes,
      junctionWays: ways.size,
      surveyedSegments: surveyed.size,
      clearanceMetres: DERIVED_JUNCTION_CLEARANCE,
      surveyedClearanceMetres: DERIVED_SURVEYED_CLEARANCE
    }
  };
}

export const DERIVED_ROAD_PAINT_POLICY = buildDerivedRoadPaintPolicy();
export const DERIVED_ROAD_PAINT_STATS = Object.freeze({ ...DERIVED_ROAD_PAINT_POLICY.stats });

// Insert exact gap boundaries into the existing terrain/profile stations. A quad is then either fully painted or
// fully clear; interpolation can never drag a white line through a junction or produce a long fade on a short road.
export function addDerivedPaintPolicyStations(stations, policy, wayId, segmentStart, segmentLength, minT = 0, maxT = 1) {
  if (!(segmentLength > 0)) return;
  for (const gap of policy.ways.get(wayId)?.gaps || []) {
    for (const chainage of gap) {
      const t = (chainage - segmentStart) / segmentLength;
      if (t > minT + 1e-7 && t < maxT - 1e-7) stations.push(t);
    }
  }
}

export function derivedPaintAllowed(policy, wayId, segmentIndex, chainage) {
  if (policy.surveyed.has(segmentKey(wayId, segmentIndex))) return false;
  for (const [start, end] of policy.ways.get(wayId)?.gaps || []) {
    if (chainage >= start - 1e-7 && chainage <= end + 1e-7) return false;
  }
  return true;
}
