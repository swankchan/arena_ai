import { GEO } from '../../hk-geodata.js';
import { flatRingBounds, minimumAreaObb, pointInFlatRing } from './landmark-site.js';

const source = GEO.landmarks['中環中心'];
if (!source?.ring) throw new Error('The OSM The Center footprint is required');
const ring = Object.freeze([...source.ring, source.ring[0], source.ring[1]]);
const footprint = minimumAreaObb(ring);
export const THE_CENTER_SITE = Object.freeze({
  name: '中環中心', englishName: 'The Center', address: "皇后大道中九十九號 99 Queen's Road Central",
  osmType: 'way', osmId: 148228888, source, ring, bounds: flatRingBounds(ring), ...footprint
});
export const THE_CENTER_HEIGHT = 346;
export const THE_CENTER_ROOF_HEIGHT = 292;
export const THE_CENTER_OCCUPIED_HEIGHT = 275;
export const THE_CENTER_LEVELS = 73;
export const THE_CENTER_TOURISM_LEVELS = 79;
export const THE_CENTER_BELOW_GROUND_LEVELS = 3;
export const THE_CENTER_BODY_START = 12;
export const THE_CENTER_FLOOR_HEIGHT = 4;
export const THE_CENTER_BAY_WIDTH = 1.5;
export const THE_CENTER_PLAZA_TOP = 0.12;
export const THE_CENTER_MAST_SUPPORT_TOP = 328;
export const THE_CENTER_CROWN_SEGMENTS = Object.freeze([
  Object.freeze({ y0: 292, y1: 296, s0: 1, s1: 0.88, kind: 'hip' }),
  Object.freeze({ y0: 296, y1: 300, s0: 0.84, s1: 0.72, kind: 'hip' }),
  Object.freeze({ y0: 300, y1: 304, s0: 0.68, s1: 0.56, kind: 'hip' }),
  Object.freeze({ y0: 304, y1: 315, s0: 0.48, s1: 0.48, kind: 'drum' }),
  Object.freeze({ y0: 315, y1: 318, s0: 0.48, s1: 0.32, kind: 'hip' })
]);
if (source.h !== THE_CENTER_HEIGHT) throw new Error('The Center OSM architectural height metadata has changed');

export const THE_CENTER_LOCAL_RING = Object.freeze((() => {
  const cs = Math.cos(THE_CENTER_SITE.ry), sn = Math.sin(THE_CENTER_SITE.ry), local = [];
  for (let i = 0; i < ring.length - 2; i += 2) {
    const dx = ring[i] - THE_CENTER_SITE.x, dz = ring[i + 1] - THE_CENTER_SITE.z;
    local.push(dx * cs - dz * sn, dx * sn + dz * cs);
  }
  return local;
})());
export function theCenterPlanAt(y) {
  if (y <= THE_CENTER_ROOF_HEIGHT) return [...THE_CENTER_LOCAL_RING];
  const segment = THE_CENTER_CROWN_SEGMENTS.find((entry) => y >= entry.y0 && y <= entry.y1);
  if (!segment) return THE_CENTER_LOCAL_RING.map((value) => value * 0.32);
  const scale = segment.s0 + (segment.s1 - segment.s0) * (y - segment.y0) / (segment.y1 - segment.y0);
  return THE_CENTER_LOCAL_RING.map((value) => value * scale);
}
export function theCenterLocalToWorld(x, z) {
  const cs = Math.cos(THE_CENTER_SITE.ry), sn = Math.sin(THE_CENTER_SITE.ry);
  return { x: THE_CENTER_SITE.x + cs * x + sn * z, z: THE_CENTER_SITE.z - sn * x + cs * z };
}
export function theCenterWorldToLocal(x, z) {
  const cs = Math.cos(THE_CENTER_SITE.ry), sn = Math.sin(THE_CENTER_SITE.ry);
  const dx = x - THE_CENTER_SITE.x, dz = z - THE_CENTER_SITE.z;
  return { x: dx * cs - dz * sn, z: dx * sn + dz * cs };
}
export function isTheCenterPlazaPoint(x, z) { return pointInFlatRing(THE_CENTER_SITE.ring, x, z); }
export function theCenterLocalCollider({ x = 0, z = 0, w, d, minY, maxY, ry = 0 }) {
  const centre = theCenterLocalToWorld(x, z), heading = THE_CENTER_SITE.ry + ry;
  const cs = Math.cos(heading), sn = Math.sin(heading), hx = w * 0.5, hz = d * 0.5;
  return {
    minX: centre.x - Math.abs(cs) * hx - Math.abs(sn) * hz,
    maxX: centre.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: centre.z - Math.abs(sn) * hx - Math.abs(cs) * hz,
    maxZ: centre.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    minY, maxY, obb: { cx: centre.x, cz: centre.z, hx, hz, cs, sn }
  };
}
export function theCenterBodyColliders(minY = THE_CENTER_BODY_START, maxY = THE_CENTER_ROOF_HEIGHT) {
  const colliders = [theCenterLocalCollider({ w: 43, d: 43, minY, maxY })];
  for (let index = 0; index < THE_CENTER_LOCAL_RING.length; index += 4) {
    const x = THE_CENTER_LOCAL_RING[index], z = THE_CENTER_LOCAL_RING[index + 1];
    colliders.push(theCenterLocalCollider({ x: x * 0.86, z: z * 0.86, w: 9, d: 9,
      ry: -Math.atan2(z, x), minY, maxY }));
  }
  return colliders;
}
export function theCenterNeonZone(y) {
  if (y < 90) return 0;
  if (y < 160) return 1;
  if (y < 220) return 2;
  if (y < THE_CENTER_OCCUPIED_HEIGHT) return 3;
  if (y <= THE_CENTER_ROOF_HEIGHT) return 4;
  return 5;
}
export function theCenterNeonRow(row, y) {
  const zone = theCenterNeonZone(y);
  return zone >= 3 || (zone === 2 && row % 2 === 0) || (zone === 1 && row % 3 === 0) || (zone === 0 && row % 4 === 0);
}
