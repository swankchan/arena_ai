import { GEO } from '../../hk-geodata.js';

// Pure site / proportion data for the hand-modelled HSBC Main Building. Keeping this separate from Three.js lets the
// geographic placement and the open plaza clearance be tested without a renderer.
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
      // The same rectangle can be represented with both local axes reversed. Keep the canonical quarter-turn range
      // so local -z consistently means the harbour-facing north side of this site.
      if (ry > Math.PI * 0.5) ry -= Math.PI;
      if (ry < -Math.PI * 0.5) ry += Math.PI;
      best = {
        x: ux * lx - uz * lz,
        z: uz * lx + ux * lz,
        w, d, area,
        // Three.js +y rotation: local x maps to (cos ry, -sin ry) in the world's x/z plane.
        ry
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

const source = GEO.landmarks['滙豐總行大廈'];
if (!source?.ring) throw new Error('The OSM HSBC Main Building footprint is required');
const footprint = minimumAreaObb(source.ring);

export const HSBC_SITE = Object.freeze({
  name: '滙豐總行大廈',
  englishName: 'HSBC Main Building',
  address: '皇后大道中一號 1 Queen’s Road Central',
  source,
  ring: source.ring,
  ...footprint
});

export const HSBC_HEIGHT = 178.8;
export const HSBC_PLAZA_TOP = 0.04;
export const HSBC_BANKING_HALL_BASE = 10.8;
export const HSBC_FLOOR_HEIGHT = 3.6;
export const HSBC_FRAME_WIDTH = Math.min(62, HSBC_SITE.w - 1.6);
export const HSBC_GLASS_WIDTH = Math.min(32, HSBC_SITE.w - 30);
export const HSBC_BAY_DEPTH = (HSBC_SITE.d - 1.6) / 3;

// The supplied harbour-facing photograph shows the tallest 44-storey facade continuing all the way down to the
// raised banking hall. Lower 36- and 29-storey bays step down behind it rather than obscuring that main elevation.
// These are visual storeys, not a claim of surveyed floor elevations.
export const HSBC_BAYS = Object.freeze([
  Object.freeze({ id: 'north', floors: 44, z: -HSBC_BAY_DEPTH }),
  Object.freeze({ id: 'central', floors: 36, z: 0 }),
  Object.freeze({ id: 'south', floors: 29, z: HSBC_BAY_DEPTH })
].map((bay) => Object.freeze({
  ...bay,
  depth: HSBC_BAY_DEPTH - 0.35,
  roofY: HSBC_BANKING_HALL_BASE + bay.floors * HSBC_FLOOR_HEIGHT
})));

// Five coat-hanger / inverted-V suspension levels are visible on the tallest bay. Shorter wings only receive the
// levels below their own roofs.
export const HSBC_MAIN_BAY = HSBC_BAYS[0];
export const HSBC_MAIN_ROOF_Y = HSBC_MAIN_BAY.roofY;
export const HSBC_ENTRANCE = Object.freeze({
  z: -8.8, width: 36, doorWidth: 5.2, doorHeight: 3.4, height: HSBC_BANKING_HALL_BASE
});
export const HSBC_LION_SITES = Object.freeze([
  Object.freeze({ id: 'left', x: -11.5, z: -HSBC_BAY_DEPTH * 1.35, heading: -Math.PI / 2 }),
  Object.freeze({ id: 'right', x: 11.5, z: -HSBC_BAY_DEPTH * 1.35, heading: Math.PI / 2 })
]);
// Viewed from the harbour, screen-right is local -x. The escalators therefore climb from front-right (-x) to rear-left (+x).
export const HSBC_ESCALATOR = Object.freeze({
  startX: -8.4, endX: 4.4,
  startY: 0.38, endY: HSBC_BANKING_HALL_BASE - 0.25,
  startZ: -HSBC_BAY_DEPTH * 1.37, endZ: -HSBC_BAY_DEPTH * 0.51,
  laneOffset: 0.78
});
export const HSBC_TRUSS_LEVELS = Object.freeze([34.2, 67.2, 100.2, 133.2, 166.2]);
export function hsbcSuspensionLevelsForRoof(roofY) {
  // The top chord may project slightly above the office roof into the mast / crown zone; do not drop the fifth V.
  return HSBC_TRUSS_LEVELS.filter((level) => level <= roofY + 0.5);
}
// Four front columns: the inner pair sits immediately outside the narrow central curtain wall, as in the photograph.
export const HSBC_MAST_X = Object.freeze([
  -HSBC_FRAME_WIDTH * 0.5, -HSBC_FRAME_WIDTH * 0.3,
  HSBC_FRAME_WIDTH * 0.3, HSBC_FRAME_WIDTH * 0.5
]);

export function hsbcLocalToWorld(x, z) {
  const cs = Math.cos(HSBC_SITE.ry), sn = Math.sin(HSBC_SITE.ry);
  return { x: HSBC_SITE.x + cs * x + sn * z, z: HSBC_SITE.z - sn * x + cs * z };
}

export function hsbcWorldToLocal(x, z) {
  const cs = Math.cos(HSBC_SITE.ry), sn = Math.sin(HSBC_SITE.ry);
  const dx = x - HSBC_SITE.x, dz = z - HSBC_SITE.z;
  return { x: dx * cs - dz * sn, z: dx * sn + dz * cs };
}

export function isHsbcPlazaPoint(x, z) {
  return pointInFlatRing(HSBC_SITE.ring, x, z);
}

// Exact oriented collider for a local-space rectangle. minY can begin above the plaza so people and cars remain
// beneath the raised banking hall while helicopters still collide with the elevated tower.
export function hsbcLocalCollider({ x, z, w, d, minY, maxY }) {
  const centre = hsbcLocalToWorld(x, z), cs = Math.cos(HSBC_SITE.ry), sn = Math.sin(HSBC_SITE.ry);
  const hx = w * 0.5, hz = d * 0.5;
  return {
    minX: centre.x - Math.abs(cs) * hx - Math.abs(sn) * hz,
    maxX: centre.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: centre.z - Math.abs(sn) * hx - Math.abs(cs) * hz,
    maxZ: centre.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    minY, maxY,
    obb: { cx: centre.x, cz: centre.z, hx, hz, cs, sn }
  };
}
