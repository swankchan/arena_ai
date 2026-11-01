// Renderer-independent geometry shared by authored Hong Kong landmark sites.
// Rings are flat world-space [x, z, ...] arrays in the app's metre grid.

export function minimumAreaObb(flat) {
  let best = null;
  for (let i = 0; i + 3 < flat.length; i += 2) {
    const dx = flat[i + 2] - flat[i], dz = flat[i + 3] - flat[i + 1];
    const length = Math.hypot(dx, dz);
    if (length < 0.01) continue;
    const ux = dx / length, uz = dz / length;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let j = 0; j + 1 < flat.length; j += 2) {
      const lx = flat[j] * ux + flat[j + 1] * uz;
      const lz = -flat[j] * uz + flat[j + 1] * ux;
      minX = Math.min(minX, lx); maxX = Math.max(maxX, lx);
      minZ = Math.min(minZ, lz); maxZ = Math.max(maxZ, lz);
    }
    const w = maxX - minX, d = maxZ - minZ, area = w * d;
    if (!best || area < best.area) {
      const lx = (minX + maxX) * 0.5, lz = (minZ + maxZ) * 0.5;
      let ry = Math.atan2(-uz, ux);
      // Keep a canonical quarter-turn range so local -z has a stable geographic meaning for each authored site.
      if (ry > Math.PI * 0.5) ry -= Math.PI;
      if (ry < -Math.PI * 0.5) ry += Math.PI;
      best = {
        x: ux * lx - uz * lz,
        z: uz * lx + ux * lz,
        w, d, area, ry
      };
    }
  }
  if (!best) throw new Error('An oriented footprint needs at least one nonzero edge');
  return best;
}

export function pointInFlatRing(flat, x, z) {
  let inside = false;
  for (let i = 0, j = flat.length - 2; i + 1 < flat.length; j = i, i += 2) {
    const xi = flat[i], zi = flat[i + 1], xj = flat[j], zj = flat[j + 1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function flatRingBounds(flat) {
  const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (let i = 0; i + 1 < flat.length; i += 2) {
    bounds.minX = Math.min(bounds.minX, flat[i]);
    bounds.maxX = Math.max(bounds.maxX, flat[i]);
    bounds.minZ = Math.min(bounds.minZ, flat[i + 1]);
    bounds.maxZ = Math.max(bounds.maxZ, flat[i + 1]);
  }
  return bounds;
}
