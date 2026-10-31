import { HK_FULL_MAP } from '../../hk-full-map-data.js';
import { FULL_BOUNDS, isDetailedCore, nearestFullRoad } from './full-meta.js';
import { segmentWall, isDataBoundarySegment } from './colliders.js';

// Pure data/geometry logic, kept separate from three.js so the exact ship-to-shore collision path is testable in Node.
export function territoryCoastHasRoadOpening(x1, z1, x2, z2) {
  const length = Math.hypot(x2 - x1, z2 - z1);
  const steps = Math.max(1, Math.ceil(length / 6));
  // A midpoint-only test misses bridges that meet a long coast segment away from its centre. Sample the whole segment
  // and reserve the carriageway plus a vehicle margin before adding an invisible collision wall.
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const hit = nearestFullRoad(x1 + (x2 - x1) * t, z1 + (z2 - z1) * t, { radius: 60 });
    if (hit && hit.distance <= hit.width * 0.5 + 6) return true;
  }
  return false;
}

export function buildTerritoryCoastColliders(includeCore = false) {
  const segments = [];
  const wallSegments = [];
  const colliders = [];
  let openings = 0;
  for (const ring of HK_FULL_MAP.land) {
    for (let i = 2; i + 1 < ring.length; i += 2) {
      const x1 = ring[i - 2], z1 = ring[i - 1], x2 = ring[i], z2 = ring[i + 1];
      const mx = (x1 + x2) * 0.5, mz = (z1 + z2) * 0.5;
      if ((!includeCore && isDetailedCore(mx, mz)) || isDataBoundarySegment(x1, z1, x2, z2, FULL_BOUNDS)) continue;
      segments.push([x1, z1, x2, z2]);
      if (territoryCoastHasRoadOpening(x1, z1, x2, z2)) { openings++; continue; }
      wallSegments.push([x1, z1, x2, z2]);
      const wall = segmentWall(x1, z1, x2, z2);
      if (wall) colliders.push(wall);
    }
  }
  return { segments, wallSegments, colliders, openings };
}
