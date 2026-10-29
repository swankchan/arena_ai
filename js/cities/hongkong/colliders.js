// Collider construction shared by the Hong Kong world builder and its tests.
//
// js/controllers.js tests colliders as oriented boxes when `obb` is present: the AABB fields stay the broad-phase
// bounds, while `obb` is the exact footprint. Rotated Hong Kong lots and diagonal seawalls must use OBBs — an
// axis-aligned box around a rotated rectangle bulges into the street and becomes an invisible wall.

// Thin wall along a coastline segment. `thickness` is half the wall width; `obb.hx` covers the segment plus caps.
export function segmentWall(x1, z1, x2, z2, { thickness = 0.8, base = -1, top = 3.4 } = {}) {
  const dx = x2 - x1, dz = z2 - z1;
  const length = Math.hypot(dx, dz);
  if (length < 0.3) return null;
  const ux = dx / length, uz = dz / length;
  return {
    minX: Math.min(x1, x2) - thickness,
    maxX: Math.max(x1, x2) + thickness,
    minZ: Math.min(z1, z2) - thickness,
    maxZ: Math.max(z1, z2) + thickness,
    minY: base,
    maxY: top,
    // Local x runs along the segment: lx = dx * cs - dz * sn with cs = ux, sn = -uz.
    obb: { cx: (x1 + x2) * 0.5, cz: (z1 + z2) * 0.5, hx: length * 0.5 + thickness, hz: thickness, cs: ux, sn: -uz }
  };
}

// Oriented footprint for a generated lot, in the same frame the block generator used.
export function lotObb(lot, margin = 0) {
  return {
    cx: lot.x,
    cz: lot.z,
    hx: lot.w * 0.5 + margin,
    hz: lot.d * 0.5 + margin,
    cs: Math.cos(lot.ry),
    sn: Math.sin(lot.ry)
  };
}

// Narrow-phase point test matching controllers.js buildingContact: OBB when present, AABB otherwise.
export function colliderContains(collider, x, z, margin = 0) {
  if (x + margin <= collider.minX || x - margin >= collider.maxX
    || z + margin <= collider.minZ || z - margin >= collider.maxZ) return false;
  const o = collider.obb;
  const cs = o ? o.cs : 1, sn = o ? o.sn : 0;
  const hx = o ? o.hx : (collider.maxX - collider.minX) * 0.5;
  const hz = o ? o.hz : (collider.maxZ - collider.minZ) * 0.5;
  const dx = x - (o ? o.cx : (collider.minX + collider.maxX) * 0.5);
  const dz = z - (o ? o.cz : (collider.minZ + collider.maxZ) * 0.5);
  const lx = dx * cs - dz * sn;
  const lz = dx * sn + dz * cs;
  return Math.abs(lx) < hx + margin && Math.abs(lz) < hz + margin;
}
