import { HK_FULL_ROADS, buildingPriorityRoadWidth } from './building-priority-roads.js';
import { fullRoadWaysNear } from './full-meta.js';

// Reattach the renderer's original intermediate vertices to the topology graph. Shared endpoints handle whole ways;
// two endpoints on the same original way handle links split by junctions. AI then follows the rendered ribbon.
const endpointKey = (x, z) => `${Math.round(x * 10)},${Math.round(z * 10)}`;
const pairKey = (a, b) => {
  const ak = endpointKey(a[0], a[1]), bk = endpointKey(b[0], b[1]);
  return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
};
const waysByEndpoints = new Map(), rawWayIds = new Map();
for (let id = 0; id < HK_FULL_ROADS.roads.length; id++) {
  const way = HK_FULL_ROADS.roads[id], flat = way[5];
  rawWayIds.set(way, id);
  if (!flat || flat.length < 4) continue;
  const key = pairKey([flat[0], flat[1]], [flat.at(-2), flat.at(-1)]);
  let list = waysByEndpoints.get(key);
  if (!list) waysByEndpoints.set(key, (list = []));
  list.push(way);
}

function originalPoints(link, nodes) {
  const points = [[nodes[link[0] * 2], nodes[link[0] * 2 + 1]]];
  for (let i = 0; i + 1 < link[6].length; i += 2) points.push([link[6][i], link[6][i + 1]]);
  points.push([nodes[link[1] * 2], nodes[link[1] * 2 + 1]]);
  return points;
}
function pathLength(points) {
  let length = 0;
  for (let i = 1; i < points.length; i++) length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return length;
}
function projectOnFlat(flat, point) {
  let best = null, bestDistanceSq = Infinity, cumulative = 0;
  for (let i = 2; i < flat.length; i += 2) {
    const ax = flat[i - 2], az = flat[i - 1], bx = flat[i], bz = flat[i + 1];
    const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz);
    const t = length > 1e-8 ? Math.max(0, Math.min(1, ((point[0] - ax) * dx + (point[1] - az) * dz) / (length * length))) : 0;
    const x = ax + dx * t, z = az + dz * t, distanceSq = (point[0] - x) ** 2 + (point[1] - z) ** 2;
    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq;
      best = { x, z, along: cumulative + length * t, distance: Math.sqrt(distanceSq) };
    }
    cumulative += length;
  }
  return best;
}
function extractBetween(flat, a, b) {
  if (!a || !b || Math.abs(a.along - b.along) < 0.2) return null;
  const forward = a.along < b.along, start = forward ? a : b, end = forward ? b : a;
  const points = [[start.x, start.z]], cumulative = [0];
  for (let i = 2; i < flat.length; i += 2) cumulative.push(cumulative.at(-1) + Math.hypot(flat[i] - flat[i - 2], flat[i + 1] - flat[i - 1]));
  for (let i = 0; i < flat.length; i += 2) {
    const along = cumulative[i / 2];
    if (along > start.along + 0.05 && along < end.along - 0.05) points.push([flat[i], flat[i + 1]]);
  }
  points.push([end.x, end.z]);
  if (!forward) points.reverse();
  return points;
}
function candidateFromWay(way, id, a, b, tolerance) {
  const flat = way.flat || way[5];
  const aHit = projectOnFlat(flat, a), bHit = projectOnFlat(flat, b);
  if (!aHit || !bHit || aHit.distance > tolerance || bHit.distance > tolerance) return null;
  const points = extractBetween(flat, aHit, bHit);
  if (!points) return null;
  return { points, wayId: id, flat, endpointError: aHit.distance + bHit.distance, width: way.width ?? way[1], dir: way.dir ?? way[2], flags: way.flags ?? way[4] };
}

export function buildTrafficRouteGeometry(graph, nodes) {
  const paths = [], routes = [];
  for (const link of graph) {
    const original = originalPoints(link, nodes), a = original[0], b = original.at(-1);
    const originalLength = pathLength(original);
    let best = null, bestScore = Infinity;
    const consider = (way, id, tolerance) => {
      const candidate = candidateFromWay(way, id, a, b, tolerance);
      if (!candidate) return;
      const score = Math.abs(candidate.width - link[3]) * 30 + (candidate.dir === link[5] ? 0 : 250)
        + Math.abs(pathLength(candidate.points) - originalLength) + candidate.endpointError * 100;
      if (score < bestScore) { best = candidate; bestScore = score; }
    };
    for (const way of waysByEndpoints.get(pairKey(a, b)) || []) consider(way, rawWayIds.get(way), 0.11);
    if (!best) {
      const middle = original[Math.floor(original.length / 2)];
      const radius = Math.min(700, originalLength * 0.75 + 40);
      for (const way of fullRoadWaysNear(middle[0], middle[1], radius)) consider(way, way.id, 0.8);
    }
    if (best) {
      paths.push(best.points);
      routes.push({ wayId: best.wayId, flat: best.flat, flags: best.flags, laneWidth: buildingPriorityRoadWidth(best.wayId) });
    } else {
      paths.push(original);
      routes.push(null);
    }
  }
  return { paths, routes };
}
export function buildTrafficPaths(graph, nodes) {
  return buildTrafficRouteGeometry(graph, nodes).paths;
}
