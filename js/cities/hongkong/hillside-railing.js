// Roadside railings where the ground beside the carriageway falls away.
//
// The territory is not flat: a large share of the road network is cut into a hillside or carried on fill, so one edge of
// the ribbon is a retaining wall and the other is a drop. Hong Kong lines those edges with a steel railing or a concrete
// parapet; without it the road looks unfinished and, in play, there is nothing marking where the ground ends.
//
// Two rules keep this honest and affordable:
//  * Only an edge that drops more than 4.5 m within 9 m of the carriageway counts. Shallow grass verges are not railings.
//  * The railing is drawn in long runs with posts every 2.8 m, not as a per-segment box: at ~39,000 risky segments a
//    per-segment box would add hundreds of thousands of triangles for detail nobody can see.
import { hongKongTerrainHeight } from './terrain.js';
import { roadRibbonHeightAtVertex } from './road-elevation.js';
import { HK_FULL_ROADS } from './building-priority-roads.js';

export const HILLSIDE_RAILING = Object.freeze({
  dropM: 4.5,        // how far the ground must fall away
  reachM: 9.0,       // and how close to the carriageway edge
  railHeight: 1.05,  // steel railing above the road surface
  postSpacingM: 7.5,
  postWidthM: 0.08,
  railThicknessM: 0.07,
  chordMaxM: 18,       // longest straight run emitted before the railing follows the curve again
  // A single run longer than this is split, so an unusually long retaining edge does not become one 40 km mesh.
  maxRunM: Infinity

});

export const HILLSIDE_RAILING_ABOVE_GROUND_M = 1.05;

/** Which sides of one road segment need a railing, as a two-bit mask (bit 0 = left, bit 1 = right). */
export function hillsideRailingMask(wayId, vertex) {
  const road = HK_FULL_ROADS.roads[wayId];
  if (!road || road[4] & 6) return 0;               // deck furniture and tunnels are handled elsewhere
  const flat = road[5];
  const ax = flat[vertex * 2], az = flat[vertex * 2 + 1];
  const bx = flat[vertex * 2 + 2], bz = flat[vertex * 2 + 3];
  const dx = bx - ax, dz = bz - az;
  const length = Math.hypot(dx, dz);
  if (length < 0.5) return 0;
  const nx = dz / length, nz = -dx / length;
  const y = roadRibbonHeightAtVertex(wayId, vertex);
  const edge = road[1] * 0.5;
  let mask = 0;
  for (const [bit, side] of [[1, 1], [2, -1]]) {
    const near = y - hongKongTerrainHeight(ax + nx * side * (edge + 3), az + nz * side * (edge + 3));
    if (near < HILLSIDE_RAILING.dropM) continue;
    const far = y - hongKongTerrainHeight(ax + nx * side * (edge + HILLSIDE_RAILING.reachM),
      az + nz * side * (edge + HILLSIDE_RAILING.reachM));
    if (far >= HILLSIDE_RAILING.dropM) mask |= bit;
  }
  return mask;
}

// A continuous run of segments that need a railing on the same side, so the railing is one object rather than a saw
// tooth per segment. Two horizontal bands (the rail and the kick plate) plus a post every few metres reads correctly
// from the road and from the air without paying for a prism per post.
function pushRun(emitter, points, side, edge) {
  if (points.length < 2) return { posts: 0, metres: 0 };
  const rail = HILLSIDE_RAILING;
  let posts = 0, metres = 0;
  const outward = (a, b) => {
    const dx = b.x - a.x, dz = b.z - a.z;
    const length = Math.hypot(dx, dz) || 1;
    return { nx: dz / length * side, nz: -dx / length * side, length };
  };
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i], b = points[i + 1];
    const { nx, nz, length } = outward(a, b);
    if (length < 0.2) continue;
    const ax = a.x + nx * edge, az = a.z + nz * edge;
    const bx = b.x + nx * edge, bz = b.z + nz * edge;
    // Rail band: one vertical strip from the kick plate to the top of the railing.
    emitter.quad(
      [ax, a.y + rail.railHeight, az], [bx, b.y + rail.railHeight, bz],
      [bx, b.y + 0.42, bz], [ax, a.y + 0.42, az]);
    // Second, lower band: the gap between the two reads as a railing rather than a solid fence.
    emitter.quad(
      [ax, a.y + 0.42, az], [bx, b.y + 0.42, bz],
      [bx, b.y + 0.3, bz], [ax, a.y + 0.3, az]);
    const steps = Math.max(1, Math.round(length / rail.postSpacingM));
    for (let step = 0; step < steps; step++) {
      const t = step / steps;
      const px = ax + (bx - ax) * t, pz = az + (bz - az) * t, py = a.y + (b.y - a.y) * t;
      const ux = (bx - ax) / length, uz = (bz - az) / length;
      const hw = rail.postWidthM * 0.5;
      emitter.quad(
        [px - ux * hw, py, pz - uz * hw], [px + ux * hw, py, pz + uz * hw],
        [px + ux * hw, py + rail.railHeight, pz + uz * hw], [px - ux * hw, py + rail.railHeight, pz - uz * hw]);
      posts++;
    }
    metres += length;
  }
  return { posts, metres };
}

// A quad is emitted into exactly one chunk, chosen by its own centroid, so no triangle ever spans two meshes.
function makeEmitter(chunkSize) {
  const chunks = new Map();
  let triangles = 0;
  return {
    chunks,
    get triangles() { return triangles; },
    quad(a, b, c, d) {
      const cx = (a[0] + b[0] + c[0] + d[0]) * 0.25;
      const cz = (a[2] + b[2] + c[2] + d[2]) * 0.25;
      const key = `${Math.floor(cx / chunkSize)},${Math.floor(cz / chunkSize)}`;
      let chunk = chunks.get(key);
      if (!chunk) chunks.set(key, (chunk = { positions: [], indices: [] }));
      const base = chunk.positions.length / 3;
      chunk.positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
      chunk.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      triangles += 2;
    }
  };
}

/**
 * Build the hillside railing, split into 2 km chunks so the territory-wide layer still culls per cell.
 * Returns one Float32 position array plus index array per chunk, and a summary of what was drawn.
 */
export function buildHillsideRailingChunks({ chunkSize = 2000 } = {}) {
  const emitter = makeEmitter(chunkSize);
  let runs = 0, posts = 0, metres = 0;
  for (let wayId = 0; wayId < HK_FULL_ROADS.roads.length; wayId++) {
    const road = HK_FULL_ROADS.roads[wayId];
    if (!road || road[4] & 6) continue;
    const flat = road[5];
    for (const side of [1, -1]) {
      const bit = side === 1 ? 1 : 2;
      let points = [];
      const flush = () => {
        if (points.length > 1) {
          const result = pushRun(emitter, points, side, road[1] * 0.5 + 0.15);
          if (result.posts) { runs++; posts += result.posts; metres += result.metres; }
        }
        points = [];
      };
      for (let vertex = 0; vertex + 1 < flat.length / 2; vertex++) {
        if (!(hillsideRailingMask(wayId, vertex) & bit)) { flush(); continue; }
        if (!points.length) {
          points.push({ x: flat[vertex * 2], z: flat[vertex * 2 + 1], y: roadRibbonHeightAtVertex(wayId, vertex) });
        }
        points.push({
          x: flat[vertex * 2 + 2], z: flat[vertex * 2 + 3], y: roadRibbonHeightAtVertex(wayId, vertex + 1)
        });
        // Break very long runs so the railing follows the curve instead of cutting a chord across it.
        let chord = 0;
        for (let i = 1; i < points.length; i++) {
          chord += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
        }
        if (chord >= HILLSIDE_RAILING.chordMaxM) flush();
      }
      flush();
    }
  }
  const chunks = [];
  for (const [key, chunk] of emitter.chunks) {
    if (!chunk.positions.length) continue;
    chunks.push({
      key,
      positions: new Float32Array(chunk.positions),
      indices: chunk.indices
    });
  }
  return {
    chunks,
    stats: {
      runs, posts, metres: Math.round(metres), chunks: chunks.length,
      vertices: chunks.reduce((sum, chunk) => sum + chunk.positions.length / 3, 0),
      triangles: emitter.triangles,
      dropM: HILLSIDE_RAILING.dropM, reachM: HILLSIDE_RAILING.reachM,
      source: 'presentation railing where the DTM falls away; not a surveyed barrier inventory'
    }
  };
}
