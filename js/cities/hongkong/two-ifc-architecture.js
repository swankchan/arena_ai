import { GEO } from '../../hk-geodata.js';
import { flatRingBounds, minimumAreaObb, pointInFlatRing } from './landmark-site.js';

// Two International Finance Centre: renderer-independent site, source metadata and visual proportion controls.
// The OSM way and the architect / curtain-wall contractor do not publish identical height / floor conventions.
// Keep those values separate instead of presenting one blended, falsely precise surveyed specification.
const source = GEO.landmarks['國際金融中心二期'];
if (!source?.ring) throw new Error('The OSM Two International Finance Centre footprint is required');
const footprint = minimumAreaObb(source.ring);

export const TWO_IFC_SITE = Object.freeze({
  name: '國際金融中心二期',
  englishName: 'Two International Finance Centre',
  address: '金融街八號 8 Finance Street',
  osmType: 'way',
  osmId: 25589595,
  source,
  ring: source.ring,
  bounds: flatRingBounds(source.ring),
  ...footprint
});

export const TWO_IFC_OSM_HEIGHT = 415.8;
export const TWO_IFC_OSM_LEVELS = 90;
export const TWO_IFC_DESIGN_HEIGHT = 412;
export const TWO_IFC_DESIGN_LEVELS = 88;
export const TWO_IFC_HEIGHT = TWO_IFC_OSM_HEIGHT;
if (source.h !== TWO_IFC_OSM_HEIGHT) throw new Error('Two IFC source height metadata has changed');

export const TWO_IFC_PLAZA_TOP = 0.12;
// A facade grid module, not a claim that every real floor has this surveyed height.
export const TWO_IFC_FLOOR_HEIGHT = 4.2;
export const TWO_IFC_BAY_WIDTH = 27;
export const TWO_IFC_CONVEX_PROJECTION = 1.05;

// The source describes a succession of setbacks, convex central facade fields and an open sculptural crown.
// Each interval has its own lower / upper plan scale, so the silhouette is a set of tapered, stepped volumes,
// not one rectangular box with a uniformly shrunken top. Scales are visual controls around the OSM site centre.
export const TWO_IFC_TIERS = Object.freeze([
  Object.freeze({ id: 'podium', kind: 'podium', y0: TWO_IFC_PLAZA_TOP, y1: 14, bottomScale: 1, topScale: 1 }),
  Object.freeze({ id: 'lower-shaft', kind: 'office', y0: 14, y1: 178, bottomScale: 0.985, topScale: 0.965 }),
  Object.freeze({ id: 'middle-shaft', kind: 'office', y0: 178, y1: 270, bottomScale: 0.948, topScale: 0.89 }),
  Object.freeze({ id: 'upper-shaft', kind: 'office', y0: 270, y1: 344, bottomScale: 0.87, topScale: 0.79 }),
  Object.freeze({ id: 'crown-shoulder', kind: 'office', y0: 344, y1: 374, bottomScale: 0.77, topScale: 0.70 }),
  Object.freeze({ id: 'glazed-crown', kind: 'crown', y0: 374, y1: 390, bottomScale: 0.69, topScale: 0.60 })
]);
export const TWO_IFC_CURTAIN_TIERS = Object.freeze(TWO_IFC_TIERS.filter((tier) => tier.kind !== 'podium'));
export const TWO_IFC_OPEN_CROWN = Object.freeze({ y0: 390, y1: TWO_IFC_HEIGHT, bottomScale: 0.60, topScale: 0.47 });
export const TWO_IFC_SETBACK_COUNT = TWO_IFC_TIERS.slice(1).filter((tier, index) =>
  tier.bottomScale < TWO_IFC_TIERS[index].topScale).length;
export const TWO_IFC_BELT_LEVELS = Object.freeze([178, 270, 344, 374]);

export const TWO_IFC_LOCAL_RING = Object.freeze((() => {
  const cs = Math.cos(TWO_IFC_SITE.ry), sn = Math.sin(TWO_IFC_SITE.ry), ring = [];
  for (let i = 0; i + 1 < TWO_IFC_SITE.ring.length; i += 2) {
    const dx = TWO_IFC_SITE.ring[i] - TWO_IFC_SITE.x;
    const dz = TWO_IFC_SITE.ring[i + 1] - TWO_IFC_SITE.z;
    ring.push(dx * cs - dz * sn, dx * sn + dz * cs);
  }
  return ring;
})());

export function twoIfcScaleAt(y) {
  if (y >= TWO_IFC_OPEN_CROWN.y0) {
    const crown = TWO_IFC_OPEN_CROWN;
    const t = Math.max(0, Math.min(1, (y - crown.y0) / (crown.y1 - crown.y0)));
    return crown.bottomScale + (crown.topScale - crown.bottomScale) * t;
  }
  const tier = TWO_IFC_TIERS.find((entry) => y >= entry.y0 && y <= entry.y1) || TWO_IFC_TIERS[0];
  const t = Math.max(0, Math.min(1, (y - tier.y0) / (tier.y1 - tier.y0)));
  return tier.bottomScale + (tier.topScale - tier.bottomScale) * t;
}

export function twoIfcLocalToWorld(x, z) {
  const cs = Math.cos(TWO_IFC_SITE.ry), sn = Math.sin(TWO_IFC_SITE.ry);
  return { x: TWO_IFC_SITE.x + cs * x + sn * z, z: TWO_IFC_SITE.z - sn * x + cs * z };
}

export function twoIfcWorldToLocal(x, z) {
  const cs = Math.cos(TWO_IFC_SITE.ry), sn = Math.sin(TWO_IFC_SITE.ry);
  const dx = x - TWO_IFC_SITE.x, dz = z - TWO_IFC_SITE.z;
  return { x: dx * cs - dz * sn, z: dx * sn + dz * cs };
}

export function isTwoIfcPlazaPoint(x, z) {
  return pointInFlatRing(TWO_IFC_SITE.ring, x, z);
}

export function twoIfcLocalCollider({ x = 0, z = 0, w, d, minY, maxY }) {
  const centre = twoIfcLocalToWorld(x, z), cs = Math.cos(TWO_IFC_SITE.ry), sn = Math.sin(TWO_IFC_SITE.ry);
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
