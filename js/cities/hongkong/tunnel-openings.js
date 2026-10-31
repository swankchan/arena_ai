import { CROSSING_ROUTES } from './crossings.js';

const LAND_TOP = -0.08;
const TUBE_HEIGHT = 5.5;

// Only shallow portal zones need a hole in the 2D ground. Once the whole tube is below ground, the ordinary land and
// park surfaces stay intact above it. Rectangles follow each 20 m profile segment, including its curved approaches.
export function buildTunnelOpeningRects(routes = CROSSING_ROUTES, surfaceY = LAND_TOP) {
  const rects = [];
  for (const route of routes) {
    if (route.kind !== 'tunnel') continue;
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1], b = route.points[i];
      if (Math.min(a.y, b.y) >= 0.5 || Math.max(a.y, b.y) + TUBE_HEIGHT <= surfaceY + 0.05) continue;
      const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      if (length < 0.01) continue;
      const ux = dx / length, uz = dz / length;
      const cx = (a.x + b.x) * 0.5, cz = (a.z + b.z) * 0.5;
      const hx = length * 0.5 + 0.35, hz = Math.max(a.width, b.width) * 0.5 + 0.75;
      const ex = Math.abs(ux) * hx + Math.abs(uz) * hz;
      const ez = Math.abs(uz) * hx + Math.abs(ux) * hz;
      rects.push({
        cx, cz, ux, uz, hx, hz, routeId: route.id,
        minX: cx - ex, maxX: cx + ex, minZ: cz - ez, maxZ: cz + ez
      });
    }
  }
  return rects;
}

function clipHalfPlane(polygon, rect, nx, nz, limit, keepInside) {
  const result = [];
  if (!polygon.length) return result;
  const distance = (point) => nx * (point[0] - rect.cx) + nz * (point[1] - rect.cz) - limit;
  const inside = (d) => keepInside ? d <= 1e-8 : d >= -1e-8;
  let previous = polygon[polygon.length - 1], previousDistance = distance(previous);
  for (const current of polygon) {
    const currentDistance = distance(current);
    const previousInside = inside(previousDistance), currentInside = inside(currentDistance);
    if (previousInside !== currentInside) {
      const denominator = previousDistance - currentDistance;
      const t = Math.abs(denominator) > 1e-12 ? previousDistance / denominator : 0;
      result.push([
        previous[0] + (current[0] - previous[0]) * t,
        previous[1] + (current[1] - previous[1]) * t
      ]);
    }
    if (currentInside) result.push(current);
    previous = current;
    previousDistance = currentDistance;
  }
  return result;
}

export function polygonArea(polygon) {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(area) * 0.5;
}

// Partition a polygon into disjoint pieces outside one convex rectangle. The final inside piece is deliberately
// discarded; earlier outside pieces do not overlap because each remaining piece is inside all preceding half-planes.
function subtractRect(polygon, rect) {
  const edges = [
    [rect.ux, rect.uz, rect.hx],
    [-rect.ux, -rect.uz, rect.hx],
    [-rect.uz, rect.ux, rect.hz],
    [rect.uz, -rect.ux, rect.hz]
  ];
  let remaining = polygon;
  const outside = [];
  for (const [nx, nz, limit] of edges) {
    if (remaining.length < 3) break;
    const piece = clipHalfPlane(remaining, rect, nx, nz, limit, false);
    if (piece.length >= 3 && polygonArea(piece) > 1e-7) outside.push(piece);
    remaining = clipHalfPlane(remaining, rect, nx, nz, limit, true);
  }
  return outside;
}

export function subtractTunnelOpenings(triangle, rects) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of triangle) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  let pieces = [triangle];
  for (const rect of rects) {
    if (!pieces.length) break;
    if (maxX < rect.minX || minX > rect.maxX || maxZ < rect.minZ || minZ > rect.maxZ) continue;
    pieces = pieces.flatMap((piece) => subtractRect(piece, rect));
  }
  return pieces.filter((piece) => piece.length >= 3 && polygonArea(piece) > 1e-7);
}
