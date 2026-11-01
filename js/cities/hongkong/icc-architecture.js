import { GEO } from '../../hk-geodata.js';
import { flatRingBounds, minimumAreaObb, pointInFlatRing } from './landmark-site.js';

// International Commerce Centre: source metadata and renderer-independent architectural controls.
// The local OSM snapshot supplies the site and height. KPF / Wong & Ouyang publish 118 storeys while other
// summaries count 108 occupied floors above ground; neither convention is silently substituted for the other.
const source = GEO.landmarks['環球貿易廣場'];
if (!source?.ring) throw new Error('The OSM International Commerce Centre footprint is required');
const footprint = minimumAreaObb(source.ring);

export const ICC_SITE = Object.freeze({
  name: '環球貿易廣場',
  englishName: 'International Commerce Centre',
  address: '柯士甸道西一號 1 Austin Road West',
  osmType: 'way',
  osmId: 25590249,
  source,
  ring: source.ring,
  bounds: flatRingBounds(source.ring),
  ...footprint
});

export const ICC_OSM_HEIGHT = 484;
export const ICC_OSM_LEVELS = 118;
export const ICC_DESIGN_LEVELS = 118;
export const ICC_REPORTED_ABOVE_GROUND_LEVELS = 108;
export const ICC_HEIGHT = ICC_OSM_HEIGHT;
if (source.h !== ICC_OSM_HEIGHT) throw new Error('ICC source height metadata has changed');

export const ICC_PLAZA_TOP = 0.12;
export const ICC_LOBBY_HEIGHT = 14;
export const ICC_ROOF_Y = 478;
export const ICC_PARAPET_HEIGHT = ICC_HEIGHT - ICC_ROOF_Y;
export const ICC_FACADE_ROWS = 108; // visual curtain-wall courses, not a second storey-count claim
export const ICC_FACADE_ROW_HEIGHT = (ICC_ROOF_Y - ICC_LOBBY_HEIGHT) / ICC_FACADE_ROWS;
export const ICC_BAY_WIDTH = 3;
export const ICC_VISION_HEIGHT = 1.5;
export const ICC_PANEL_TILT = 5 * Math.PI / 180;
export const ICC_BASE_PANEL_TILT = 8 * Math.PI / 180;
export const ICC_UPPER_PANEL_TILT = 6 * Math.PI / 180;
export const ICC_BASE_FLARE_END_Y = 70;
export const ICC_UPPER_TAPER_START_Y = 320;
export const ICC_UPPER_TAPER = Math.PI / 180;
export const ICC_SHAFT_SCALE = 0.91;
export const ICC_REENTRANT_WIDENING = 2.2;
export const ICC_MEGA_COLUMN_SPLAY = 3 * Math.PI / 180;
export const ICC_MEGA_COLUMN_COUNT = 8;

export const ICC_DRAGON_TAIL = Object.freeze({
  y0: 11.5,
  y1: 52,
  projection: 12,
  halfWidthBottom: 18,
  halfWidthTop: 18,
  ribs: 13
});

// Visual articulation only: the published structure has four outrigger levels, but no surveyed level schedule is
// inferred here. The top plant enclosure remains below the six-metre parapet and never becomes a spire.
export const ICC_MECHANICAL_BANDS = Object.freeze([
  Object.freeze({ y0: 104, y1: 110 }),
  Object.freeze({ y0: 238, y1: 245 }),
  Object.freeze({ y0: 360, y1: 367 }),
  Object.freeze({ y0: 438, y1: 446 })
]);
export const ICC_CROWN_PLANT_BAND = Object.freeze({ y0: 466, y1: 473.5 });

export const ICC_LOCAL_RING = Object.freeze((() => {
  const cs = Math.cos(ICC_SITE.ry), sn = Math.sin(ICC_SITE.ry), ring = [];
  for (let i = 0; i + 1 < ICC_SITE.ring.length; i += 2) {
    const dx = ICC_SITE.ring[i] - ICC_SITE.x;
    const dz = ICC_SITE.ring[i + 1] - ICC_SITE.z;
    ring.push(dx * cs - dz * sn, dx * sn + dz * cs);
  }
  return ring;
})());

const HALF = (ICC_SITE.w + ICC_SITE.d) * 0.25;
const MAX_X = Math.max(...ICC_LOCAL_RING.filter((_, index) => index % 2 === 0).map(Math.abs));
const MAX_Z = Math.max(...ICC_LOCAL_RING.filter((_, index) => index % 2 === 1).map(Math.abs));
const clamp01 = (value) => Math.max(0, Math.min(1, value));

export function iccScaleAt(y) {
  if (y <= ICC_BASE_FLARE_END_Y) {
    return 1 + (ICC_SHAFT_SCALE - 1) * clamp01(y / ICC_BASE_FLARE_END_Y);
  }
  if (y <= ICC_UPPER_TAPER_START_Y) return ICC_SHAFT_SCALE;
  const half = HALF * ICC_SHAFT_SCALE - Math.tan(ICC_UPPER_TAPER) * (y - ICC_UPPER_TAPER_START_Y);
  return half / HALF;
}

export function iccReentrantExtraAt(y) {
  return ICC_REENTRANT_WIDENING * clamp01((y - ICC_BASE_FLARE_END_Y) / (ICC_ROOF_Y - ICC_BASE_FLARE_END_Y));
}

// A twenty-edge square plan with four re-entrant corners. The base follows the OSM-derived ring; above the flared
// base the main faces hold, then incline inward by one degree. Corner crevasses widen independently of that taper.
export function iccPlanAt(y, outwardOffset = 0) {
  const scale = iccScaleAt(y), extra = iccReentrantExtraAt(y), ring = [];
  for (let i = 0; i < ICC_LOCAL_RING.length; i += 2) {
    const sourceX = ICC_LOCAL_RING[i], sourceZ = ICC_LOCAL_RING[i + 1];
    const notchX = Math.abs(sourceX) < MAX_X * 0.97 ? extra : 0;
    const notchZ = Math.abs(sourceZ) < MAX_Z * 0.97 ? extra : 0;
    let x = Math.sign(sourceX) * Math.max(0.1, Math.abs(sourceX) * scale - notchX);
    let z = Math.sign(sourceZ) * Math.max(0.1, Math.abs(sourceZ) * scale - notchZ);
    if (outwardOffset) {
      const length = Math.hypot(x, z) || 1;
      x += x / length * outwardOffset;
      z += z / length * outwardOffset;
    }
    ring.push(x, z);
  }
  return ring;
}

export function iccLocalToWorld(x, z) {
  const cs = Math.cos(ICC_SITE.ry), sn = Math.sin(ICC_SITE.ry);
  return { x: ICC_SITE.x + cs * x + sn * z, z: ICC_SITE.z - sn * x + cs * z };
}

export function iccWorldToLocal(x, z) {
  const cs = Math.cos(ICC_SITE.ry), sn = Math.sin(ICC_SITE.ry);
  const dx = x - ICC_SITE.x, dz = z - ICC_SITE.z;
  return { x: dx * cs - dz * sn, z: dx * sn + dz * cs };
}

export function isIccPlazaPoint(x, z) {
  return pointInFlatRing(ICC_SITE.ring, x, z);
}

export function iccLocalCollider({ x = 0, z = 0, w, d, minY, maxY }) {
  const centre = iccLocalToWorld(x, z), cs = Math.cos(ICC_SITE.ry), sn = Math.sin(ICC_SITE.ry);
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

// Eight structural piers sit in pairs near the four re-entrant corners. Only their visual base is exposed; this is
// not a claimed surveyed structural setting-out. At ground they splay radially by exactly three degrees over 70 m.
export const ICC_MEGA_COLUMNS = Object.freeze((() => {
  const columns = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    columns.push(Object.freeze({ sx, sz, x: sx * 22, z: sz * 17 }));
    columns.push(Object.freeze({ sx, sz, x: sx * 17, z: sz * 22 }));
  }
  return Object.freeze(columns);
})());

export function iccMegaColumnPoint(column, y) {
  const t = clamp01(y / ICC_BASE_FLARE_END_Y);
  const scale = 1 + (ICC_SHAFT_SCALE - 1) * t;
  const topX = column.x * ICC_SHAFT_SCALE, topZ = column.z * ICC_SHAFT_SCALE;
  const length = Math.hypot(topX, topZ) || 1;
  const splay = Math.tan(ICC_MEGA_COLUMN_SPLAY) * ICC_BASE_FLARE_END_Y * (1 - t);
  return {
    x: topX + topX / length * splay,
    z: topZ + topZ / length * splay,
    // Keep the parameter used by callers obvious while retaining the same scale convention as the tower plan.
    scale
  };
}

export const ICC_LOBBY_COLLIDER = Object.freeze({ x: 0, z: 0, w: 34, d: 30, minY: 0, maxY: ICC_LOBBY_HEIGHT });
export const ICC_ARRIVAL_ROAD_WAY_IDS = Object.freeze([51143, 51157]);
