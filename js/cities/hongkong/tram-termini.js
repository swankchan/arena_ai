import { HK_TRAM_NETWORK } from '../../hk-tram-network-data.js';
import { createTramPath, sampleTramPath } from './tram-motion.js';

// Official terminus-stop positions drive both the 3D platforms and their map markers. Platform dimensions are scene
// values, not a surveyed claim about each stop; their envelope is checked against every generated running rail.
export const TRAM_TERMINUS_PLATFORM = Object.freeze({ width: 1.8, height: 0.24, offset: 2.3, length: 18 });
const PLATFORM_OFFSETS = [2.3, 3.0, 3.8, 4.6];
const PLATFORM_LENGTHS = [18, 14, 10, 8];
let cachedTermini = null;

function makeSegment(ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  return {
    ax, az, bx, bz, dx, dz, lengthSq: dx * dx + dz * dz,
    minX: Math.min(ax, bx), maxX: Math.max(ax, bx), minZ: Math.min(az, bz), maxZ: Math.max(az, bz)
  };
}

function networkSegments(network) {
  const segments = [];
  for (const track of network.tracks) {
    for (let index = 3; index < track.points.length; index += 3) {
      const segment = makeSegment(track.points[index - 3], track.points[index - 1], track.points[index], track.points[index + 2]);
      if (segment.lengthSq > 1e-8) segments.push(segment);
    }
  }
  return segments;
}

function pointToSegment(x, z, segment) {
  const t = Math.max(0, Math.min(1, ((x - segment.ax) * segment.dx + (z - segment.az) * segment.dz) / segment.lengthSq));
  return Math.hypot(x - segment.ax - segment.dx * t, z - segment.az - segment.dz * t);
}

function distanceToNetwork(x, z, segments) {
  let best = Infinity;
  for (const segment of segments) {
    best = Math.min(best, pointToSegment(x, z, segment));
    if (best < 0.02) return best;
  }
  return best;
}

function segmentToSegmentDistance(a, b) {
  const denominator = a.dx * b.dz - a.dz * b.dx;
  if (Math.abs(denominator) > 1e-12) {
    const qx = b.ax - a.ax, qz = b.az - a.az;
    const t = (qx * b.dz - qz * b.dx) / denominator;
    const u = (qx * a.dz - qz * a.dx) / denominator;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return 0;
  }
  // Collinear overlap and parallel/free segments are both covered by their endpoint distances.
  return Math.min(pointToSegment(a.ax, a.az, b), pointToSegment(a.bx, a.bz, b),
    pointToSegment(b.ax, b.az, a), pointToSegment(b.bx, b.bz, a));
}

function platformClearance(center, side, offset, length, segments) {
  const nx = center.dz, nz = -center.dx, width = TRAM_TERMINUS_PLATFORM.width;
  let clearance = Infinity;
  // Samples provide a tight upper bound for the broad-phase search. The exact rectangle-to-polyline pass below is
  // still required: a curved junction rail can cross a platform corner between samples (notably at Western Market).
  for (const along of [-0.5, -0.25, 0, 0.25, 0.5]) {
    for (const across of [-0.5, 0, 0.5]) {
      const x = center.x + center.dx * along * length + nx * side * (offset + across * width);
      const z = center.z + center.dz * along * length + nz * side * (offset + across * width);
      clearance = Math.min(clearance, distanceToNetwork(x, z, segments));
    }
  }
  const platformX = center.x + nx * side * offset, platformZ = center.z + nz * side * offset;
  const halfLength = length * 0.5, halfWidth = width * 0.5;
  const corners = [[-halfLength, -halfWidth], [halfLength, -halfWidth], [halfLength, halfWidth], [-halfLength, halfWidth]]
    .map(([along, across]) => ({
      x: platformX + center.dx * along + nx * across,
      z: platformZ + center.dz * along + nz * across
    }));
  const edges = corners.map((corner, index) => {
    const next = corners[(index + 1) % corners.length];
    return makeSegment(corner.x, corner.z, next.x, next.z);
  });
  const minX = Math.min(...corners.map((corner) => corner.x)), maxX = Math.max(...corners.map((corner) => corner.x));
  const minZ = Math.min(...corners.map((corner) => corner.z)), maxZ = Math.max(...corners.map((corner) => corner.z));
  const inside = (x, z) => {
    const rx = x - platformX, rz = z - platformZ;
    return Math.abs(rx * center.dx + rz * center.dz) <= halfLength + 1e-8
      && Math.abs(rx * nx + rz * nz) <= halfWidth + 1e-8;
  };
  for (const segment of segments) {
    const gapX = Math.max(segment.minX - maxX, minX - segment.maxX, 0);
    const gapZ = Math.max(segment.minZ - maxZ, minZ - segment.maxZ, 0);
    if (gapX * gapX + gapZ * gapZ >= clearance * clearance) continue;
    if (inside(segment.ax, segment.az) || inside(segment.bx, segment.bz)) return 0;
    for (const edge of edges) {
      clearance = Math.min(clearance, segmentToSegmentDistance(segment, edge));
      if (clearance === 0) return 0;
    }
  }
  return clearance;
}

function placePlatform(path, stopS, segments) {
  let best = null;
  for (const length of PLATFORM_LENGTHS) {
    // A terminal platform sits beside the last metres of rail instead of projecting halfway beyond the alignment end.
    const s = Math.max(length * 0.5, Math.min(path.length - length * 0.5, stopS));
    const center = sampleTramPath(path, s);
    for (const offset of PLATFORM_OFFSETS) {
      for (const side of [1, -1]) {
        const clearance = platformClearance(center, side, offset, length, segments);
        // Once the complete platform clears the tram envelope, prefer the default side, smaller offset and full length.
        const score = Math.min(clearance, 1.4) * 100 - (offset - TRAM_TERMINUS_PLATFORM.offset) * 1.5
          - (TRAM_TERMINUS_PLATFORM.length - length) * 0.08 + (side === 1 ? 0.001 : 0);
        if (!best || score > best.score) best = { ...center, s, side, offset, length, clearance, score };
      }
    }
  }
  return best;
}

export function getTramTermini(network = HK_TRAM_NETWORK) {
  if (network === HK_TRAM_NETWORK && cachedTermini) return cachedTermini;
  const segments = networkSegments(network), byCode = new Map();
  network.tracks.forEach((track, trackIndex) => {
    const path = createTramPath(track);
    for (const stop of track.stops) {
      if (!/Terminus$/i.test(stop[2]) || !/總站$/.test(stop[1])) continue;
      const code = stop[0].replace(/^hk-official-tram-/, '').toUpperCase();
      let terminus = byCode.get(code);
      if (!terminus) {
        terminus = { code, name: stop[1], nameEn: stop[2], platforms: [] };
        byCode.set(code, terminus);
      }
      const anchor = sampleTramPath(path, stop[3]);
      // Opposing route relations share some physical termini. Keep genuinely separate stops such as Western Market,
      // but do not put two shelters on top of one another where east/west records have the same official position.
      if (terminus.platforms.some((platform) => Math.hypot(platform.anchorX - anchor.x, platform.anchorZ - anchor.z) < 5)) continue;
      const placement = placePlatform(path, stop[3], segments);
      terminus.platforms.push({
        id: `${code}-${terminus.platforms.length + 1}`, code, trackIndex, trackId: track.id, stopS: stop[3],
        anchorX: anchor.x, anchorY: anchor.y, anchorZ: anchor.z,
        x: placement.x, y: placement.y, z: placement.z, dx: placement.dx, dz: placement.dz,
        heading: placement.heading, grade: placement.grade, s: placement.s,
        side: placement.side, offset: placement.offset, length: placement.length,
        width: TRAM_TERMINUS_PLATFORM.width, height: TRAM_TERMINUS_PLATFORM.height,
        clearance: Math.round(placement.clearance * 1000) / 1000
      });
    }
  });
  const termini = [...byCode.values()];
  if (network === HK_TRAM_NETWORK) cachedTermini = termini;
  return termini;
}
