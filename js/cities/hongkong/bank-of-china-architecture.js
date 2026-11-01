import { flatRingBounds, minimumAreaObb, pointInFlatRing } from './landmark-site.js';

// Bank of China Tower, 1 Garden Road. The current OSM API way is absent from the older local landmark cache, so
// preserve its retrieved geometry and provenance here instead of silently substituting a nearby building or site.
// Coordinates below are the same WGS84 -> app-grid transform used by tools/geo/frame.mjs and the Hong Kong builders.
export const BANK_OF_CHINA_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-01',
  sourceUrl: 'https://api.openstreetmap.org/api/0.6/way/25604760/full.json',
  type: 'way', id: 25604760, version: 12, timestamp: '2023-10-21T07:19:47Z',
  geometry: Object.freeze([
    Object.freeze({ lon: 114.1613912, lat: 22.2795640 }),
    Object.freeze({ lon: 114.1612491, lat: 22.2791025 }),
    Object.freeze({ lon: 114.1617463, lat: 22.2789714 }),
    Object.freeze({ lon: 114.1618884, lat: 22.2794329 }),
    Object.freeze({ lon: 114.1613912, lat: 22.2795640 })
  ]),
  // Deliberately no h / height / levels: this OSM way has none of those tags.
  tags: Object.freeze({ building: 'office', name: '中銀大廈 Bank of China Tower', wikidata: 'Q214855' })
});

const ring = Object.freeze([
  184.59537156904122, 258.67484888258593,
  169.95099779823246, 309.77863431039407,
  221.19084747654728, 324.2958743312528,
  235.835221247356, 273.19208890344464,
  184.59537156904122, 258.67484888258593
]);
const footprint = minimumAreaObb(ring);
export const BANK_OF_CHINA_SITE = Object.freeze({
  name: '中銀大廈', englishName: 'Bank of China Tower', address: '花園道一號 1 Garden Road',
  osmType: 'way', osmId: 25604760, source: BANK_OF_CHINA_OSM_SOURCE,
  ring, bounds: flatRingBounds(ring), ...footprint
});

// External architectural conventions stay separate from OSM. BOCHK publishes 70 floors above the ground-floor
// level, a 315 m tower structure and 367.4 m to the masts; another common reference convention reports 72 floors.
export const BANK_OF_CHINA_HEIGHT = 367.4;
export const BANK_OF_CHINA_ROOF_HEIGHT = 315;
export const BANK_OF_CHINA_MAST_HEIGHT = BANK_OF_CHINA_HEIGHT - BANK_OF_CHINA_ROOF_HEIGHT;
export const BANK_OF_CHINA_OFFICIAL_LEVELS = 70;
export const BANK_OF_CHINA_OTHER_REPORTED_LEVELS = 72;
export const BANK_OF_CHINA_ARCHITECT = 'I. M. Pei & Partners / I. M. Pei and L. C. Pei';
export const BANK_OF_CHINA_PLAZA_TOP = 0.12;
export const BANK_OF_CHINA_PODIUM_HEIGHT = 18;
// Visual curtain-wall module only; it is not a surveyed floor-to-floor schedule.
export const BANK_OF_CHINA_FLOOR_HEIGHT = 4.2;
export const BANK_OF_CHINA_BAY_WIDTH = 1.45;

const hx = BANK_OF_CHINA_SITE.w * 0.5, hz = BANK_OF_CHINA_SITE.d * 0.5;
const corners = Object.freeze([[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]]);

// A square plan cut along both diagonals. The north quadrant terminates first; the south prism remains to 315 m.
// Roof elevations are visual design controls inferred from the published massing and photographs, not surveyed
// floor levels. Each roof is one inclined triangular plane, never a flat cap on a generic tapered box.
export const BANK_OF_CHINA_PRISMS = Object.freeze([
  Object.freeze({ id: 'north', outer: 'harbour', vertices: Object.freeze([0, 1, 4]), roof: Object.freeze([68, 88, 88]) }),
  Object.freeze({ id: 'east', outer: 'garden-road', vertices: Object.freeze([1, 2, 4]), roof: Object.freeze([136, 158, 178]) }),
  Object.freeze({ id: 'west', outer: 'cotton-tree', vertices: Object.freeze([3, 0, 4]), roof: Object.freeze([202, 224, 244]) }),
  Object.freeze({ id: 'south', outer: 'garden', vertices: Object.freeze([2, 3, 4]), roof: Object.freeze([288, 315, 315]) })
]);

export function bankOfChinaPrismPoints(prism) {
  return prism.vertices.map((index) => index === 4 ? [0, 0] : [...corners[index]]);
}

export function bankOfChinaRoofAt(prism, x, z) {
  const points = bankOfChinaPrismPoints(prism);
  const [a, b, c] = points;
  const denominator = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  if (Math.abs(denominator) < 1e-9) return Math.min(...prism.roof);
  const wa = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (z - c[1])) / denominator;
  const wb = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (z - c[1])) / denominator;
  const wc = 1 - wa - wb;
  return wa * prism.roof[0] + wb * prism.roof[1] + wc * prism.roof[2];
}

export const BANK_OF_CHINA_LOCAL_RING = Object.freeze((() => {
  const cs = Math.cos(BANK_OF_CHINA_SITE.ry), sn = Math.sin(BANK_OF_CHINA_SITE.ry), local = [];
  for (let i = 0; i + 1 < ring.length; i += 2) {
    const dx = ring[i] - BANK_OF_CHINA_SITE.x, dz = ring[i + 1] - BANK_OF_CHINA_SITE.z;
    local.push(dx * cs - dz * sn, dx * sn + dz * cs);
  }
  return local;
})());

export function bankOfChinaLocalToWorld(x, z) {
  const cs = Math.cos(BANK_OF_CHINA_SITE.ry), sn = Math.sin(BANK_OF_CHINA_SITE.ry);
  return { x: BANK_OF_CHINA_SITE.x + cs * x + sn * z, z: BANK_OF_CHINA_SITE.z - sn * x + cs * z };
}

export function bankOfChinaWorldToLocal(x, z) {
  const cs = Math.cos(BANK_OF_CHINA_SITE.ry), sn = Math.sin(BANK_OF_CHINA_SITE.ry);
  const dx = x - BANK_OF_CHINA_SITE.x, dz = z - BANK_OF_CHINA_SITE.z;
  return { x: dx * cs - dz * sn, z: dx * sn + dz * cs };
}

export function isBankOfChinaPlazaPoint(x, z) {
  return pointInFlatRing(BANK_OF_CHINA_SITE.ring, x, z);
}

export function bankOfChinaLocalCollider({ x = 0, z = 0, w, d, minY, maxY }) {
  const centre = bankOfChinaLocalToWorld(x, z), cs = Math.cos(BANK_OF_CHINA_SITE.ry), sn = Math.sin(BANK_OF_CHINA_SITE.ry);
  const halfX = w * 0.5, halfZ = d * 0.5;
  return {
    minX: centre.x - Math.abs(cs) * halfX - Math.abs(sn) * halfZ,
    maxX: centre.x + Math.abs(cs) * halfX + Math.abs(sn) * halfZ,
    minZ: centre.z - Math.abs(sn) * halfX - Math.abs(cs) * halfZ,
    maxZ: centre.z + Math.abs(sn) * halfX + Math.abs(cs) * halfZ,
    minY, maxY,
    obb: { cx: centre.x, cz: centre.z, hx: halfX, hz: halfZ, cs, sn }
  };
}

export function bankOfChinaMastPositions() {
  const south = BANK_OF_CHINA_PRISMS.find((prism) => prism.id === 'south');
  const points = bankOfChinaPrismPoints(south);
  // The south prism's second and third vertices form its 315 m high edge.
  const a = points[1], b = points[2];
  return [0.16, 0.39].map((t, index) => ({
    x: a[0] + (b[0] - a[0]) * t,
    z: a[1] + (b[1] - a[1]) * t,
    baseY: BANK_OF_CHINA_ROOF_HEIGHT,
    topY: index === 0 ? BANK_OF_CHINA_HEIGHT : BANK_OF_CHINA_HEIGHT - 7
  }));
}
