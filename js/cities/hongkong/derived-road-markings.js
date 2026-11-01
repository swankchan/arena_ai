import { GEO } from '../../hk-geodata.js';
import { HK_FULL_ROADS } from '../../hk-full-roads-data.js';
import { ROAD_MARK_STYLES } from './traffic-aid-geometry.js';
import { roadRibbonHeightAtSegment } from './road-elevation.js';

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
const SHARED_EDGE_CELL = 64;
const SHARED_EDGE_MIN_CENTRE_GAP = 0.25;
const SHARED_EDGE_MAX_GROUND_GAP = 1.2;
const SHARED_EDGE_MIN_OVERLAP = 1;
const SHARED_EDGE_PARALLEL = 0.94;
const SHARED_EDGE_MAX_HEIGHT_DIFFERENCE = 2;

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

function linearRange(p0, p1, start, end, minimum, maximum) {
  const delta = p1 - p0;
  if (Math.abs(delta) < 1e-9) return p0 >= minimum && p0 <= maximum ? [start, end] : null;
  let lo = 0, hi = 1;
  const a = (minimum - p0) / delta, b = (maximum - p0) / delta;
  lo = Math.max(lo, Math.min(a, b));
  hi = Math.min(hi, Math.max(a, b));
  if (hi - lo <= 1e-9) return null;
  return [start + (end - start) * lo, start + (end - start) * hi];
}

// Return chainage ranges on `road` where a neighbouring, opposite-flow carriageway shares the same paved corridor.
// Coordinates are exact for the straight source segments: longitudinal overlap and signed lateral separation are
// both linear, so the paint stations can be inserted at the real transitions rather than sampled every few metres.
function sharedCarriagewayRanges(road, other) {
  const q0 = (other.ax - road.ax) * road.ux + (other.az - road.az) * road.uz;
  const q1 = (other.bx - road.ax) * road.ux + (other.bz - road.az) * road.uz;
  const overlapStart = Math.max(0, Math.min(q0, q1));
  const overlapEnd = Math.min(road.length, Math.max(q0, q1));
  if (overlapEnd - overlapStart < SHARED_EDGE_MIN_OVERLAP) return [];
  const sourceP0 = road.ux * (other.az - road.az) - road.uz * (other.ax - road.ax);
  const sourceP1 = road.ux * (other.bz - road.az) - road.uz * (other.bx - road.ax);
  const atOverlap = (chainage, p0, p1) => Math.abs(q1 - q0) < 1e-9
    ? (p0 + p1) * 0.5 : p0 + (p1 - p0) * (chainage - q0) / (q1 - q0);
  const p0 = atOverlap(overlapStart, sourceP0, sourceP1);
  const p1 = atOverlap(overlapEnd, sourceP0, sourceP1);
  const maximum = road.halfWidth + other.halfWidth + SHARED_EDGE_MAX_GROUND_GAP;
  const ranges = [];
  for (const side of [-1, 1]) {
    const range = linearRange(p0 * side, p1 * side, overlapStart, overlapEnd,
      SHARED_EDGE_MIN_CENTRE_GAP, maximum);
    if (!range || range[1] - range[0] < SHARED_EDGE_MIN_OVERLAP) continue;
    // A positive cross product is the negative `roadPaint.x` side (see addRoadQuad's right-hand normal).
    ranges.push([road.chainage + range[0], road.chainage + range[1], -side]);
  }
  return ranges;
}

function sameLevelRanges(road, other, ranges, heightAt) {
  if (!heightAt) return ranges;
  return ranges.filter(([start, end]) => {
    // Check both ends and the middle. A conservative rejection leaves ordinary independent edge paint in place on
    // stacked ramps; it is safer than joining two decks merely because their plan geometry is close.
    for (const chainage of [start, (start + end) * 0.5, end]) {
      const local = chainage - road.chainage;
      const x = road.ax + road.ux * local, z = road.az + road.uz * local;
      const otherLocal = (x - other.ax) * other.ux + (z - other.az) * other.uz;
      const a = heightAt(road.wayId, road.segmentIndex, local / road.length);
      const b = heightAt(other.wayId, other.segmentIndex, otherLocal / other.length);
      if (!Number.isFinite(a) || !Number.isFinite(b) ||
          Math.abs(a - b) > SHARED_EDGE_MAX_HEIGHT_DIFFERENCE) return false;
    }
    return true;
  });
}

function buildSharedCarriagewayEdges(roads, heightAt) {
  const records = [], grid = new Map();
  let maxHalfWidth = 0;
  for (const [wayId, road] of roads.entries()) {
    // Two-way ways already have an explicit centre line. This policy only deduplicates the inner edge lines of
    // separately mapped one-way carriageways; it never rewrites their lane counts or asphalt geometry.
    if (road[2] !== 1) continue;
    const flat = road[5], halfWidth = road[1] * 0.5;
    maxHalfWidth = Math.max(maxHalfWidth, halfWidth);
    let chainage = 0;
    for (let vertex = 0; vertex + 1 < flat.length / 2; vertex++) {
      const ax = flat[vertex * 2], az = flat[vertex * 2 + 1];
      const bx = flat[vertex * 2 + 2], bz = flat[vertex * 2 + 3];
      const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz);
      if (length >= 1) {
        const record = {
          index: records.length, wayId, segmentIndex: vertex, chainage, length, halfWidth,
          flags: road[4] & 6, width: road[1], ax, az, bx, bz, ux: dx / length, uz: dz / length,
          minX: Math.min(ax, bx), maxX: Math.max(ax, bx), minZ: Math.min(az, bz), maxZ: Math.max(az, bz)
        };
        records.push(record);
        for (let col = Math.floor(record.minX / SHARED_EDGE_CELL); col <= Math.floor(record.maxX / SHARED_EDGE_CELL); col++) {
          for (let row = Math.floor(record.minZ / SHARED_EDGE_CELL); row <= Math.floor(record.maxZ / SHARED_EDGE_CELL); row++) {
            const key = `${col},${row}`;
            let bucket = grid.get(key);
            if (!bucket) grid.set(key, (bucket = []));
            bucket.push(record);
          }
        }
      }
      chainage += length;
    }
  }

  const sharedEdges = new Map();
  const addRanges = (wayId, ranges) => {
    if (!ranges.length) return;
    let target = sharedEdges.get(wayId);
    if (!target) sharedEdges.set(wayId, (target = []));
    target.push(...ranges);
  };
  for (const record of records) {
    const reach = record.halfWidth + maxHalfWidth + SHARED_EDGE_MAX_GROUND_GAP;
    const candidates = new Set();
    for (let col = Math.floor((record.minX - reach) / SHARED_EDGE_CELL); col <= Math.floor((record.maxX + reach) / SHARED_EDGE_CELL); col++) {
      for (let row = Math.floor((record.minZ - reach) / SHARED_EDGE_CELL); row <= Math.floor((record.maxZ + reach) / SHARED_EDGE_CELL); row++) {
        for (const other of grid.get(`${col},${row}`) || []) {
          // Each unordered pair is considered from its lower record index; the local set removes repeated grid hits.
          if (other.index <= record.index || candidates.has(other.index)) continue;
          candidates.add(other.index);
          if (record.wayId === other.wayId || record.flags !== other.flags) continue;
          const dot = record.ux * other.ux + record.uz * other.uz;
          if (dot > -SHARED_EDGE_PARALLEL) continue;
          // The wider way owns the single remaining boundary. Equal widths use the lower source id, making the
          // result stable regardless of spatial-hash iteration order.
          const recordWins = record.width > other.width ||
            (record.width === other.width && record.wayId < other.wayId);
          const loser = recordWins ? other : record, winner = recordWins ? record : other;
          const ranges = sharedCarriagewayRanges(loser, winner);
          addRanges(loser.wayId, sameLevelRanges(loser, winner, ranges, heightAt));
        }
      }
    }
  }

  let rangeCount = 0;
  for (const [wayId, ranges] of sharedEdges) {
    ranges.sort((a, b) => a[2] - b[2] || a[0] - b[0] || a[1] - b[1]);
    const merged = [];
    for (const range of ranges) {
      const last = merged.at(-1);
      if (last && last[2] === range[2] && range[0] <= last[1] + 1e-7) {
        last[1] = Math.max(last[1], range[1]);
      } else merged.push(range);
    }
    sharedEdges.set(wayId, merged);
    rangeCount += merged.length;
  }
  return { sharedEdges, ways: sharedEdges.size, ranges: rangeCount };
}

const segmentKey = (wayId, segmentIndex) => wayId * 100000 + segmentIndex;
const nodeKey = (x, z) => Math.round(x * 10) * 1000000 + Math.round(z * 10);

// Build a compact paint policy from geometry, not from road names. A node with three or more incident segments is a
// junction even when a through-road and a terminating side road are represented by only two OSM ways.
export function buildDerivedRoadPaintPolicy(roads = HK_FULL_ROADS.roads, aids = GEO.trafficAids,
  heightAt = roads === HK_FULL_ROADS.roads ? roadRibbonHeightAtSegment : null) {
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

  const shared = buildSharedCarriagewayEdges(roads, heightAt);
  return {
    ways, surveyed, sharedEdges: shared.sharedEdges,
    stats: {
      junctionNodes,
      junctionWays: ways.size,
      surveyedSegments: surveyed.size,
      sharedCarriagewayWays: shared.ways,
      sharedCarriagewayRanges: shared.ranges,
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
  for (const range of policy.sharedEdges.get(wayId) || []) {
    for (const chainage of [range[0], range[1]]) {
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

// Bit 0 is the negative-lateral edge, bit 1 the positive-lateral edge. Lane dashes and two-way centre lines are not
// changed: only a duplicated inner edge is removed where a wider neighbouring carriageway owns the shared boundary.
export function derivedPaintEdgeMask(policy, wayId, chainage) {
  let mask = 3;
  for (const [start, end, side] of policy.sharedEdges.get(wayId) || []) {
    if (chainage < start - 1e-7 || chainage > end + 1e-7) continue;
    mask &= side < 0 ? ~1 : ~2;
  }
  return mask;
}
