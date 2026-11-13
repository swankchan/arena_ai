// 華潤大廈（China Resources Building, 26 Harbour Road, Wan Chai, 1983/2012）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 26 Harbour Road, Wan Chai, Hong Kong (香港灣仔港灣道26號).
// Completed: 1983 (retrofitted with state-of-the-art sustainable curtain wall in 2012 by Foster + Partners & Lead8).
// Height: 178.0m (49 storeys), roof crown 178m.
// Developer / Owner: China Resources (Holdings) Co., Ltd. (華潤(集團)有限公司).
// OSM Way: 107497701.
// Wikidata: Q15909631.
// Key Architectural Highlights:
// - Modernist rectangular mass with aerodynamically rounded corners overlooking Victoria Harbour.
// - High-performance silver-blue Low-E double-glazed curtain wall with vertical sunshading louvre fins.
// - 4-storey commercial podium featuring grand transparent lobby, landscaped deck, and skybridges to Sun Hung Kai Centre and Central Plaza.
// - 44 office storeys with panoramic harbour and mountain views.
// - Iconic illuminated "China Resources / 華潤" corporate emblem crown facing Victoria Harbour.

export const CHINA_RESOURCES_HERITAGE = Object.freeze({
  address: '香港灣仔港灣道26號 (26 Harbour Road, Wan Chai, Hong Kong)',
  district: '灣仔區灣仔北 (Wan Chai North, Wan Chai District)',
  completionYear: 1983,
  renovationYear: 2012,
  currentName: 'China Resources Building (華潤大廈)',
  developer: 'China Resources (Holdings) (華潤集團)',
  style: 'Sustainable Contemporary Skyscraper Retrofit (可持續當代超甲級摩天大廈)',
  osmWay: 107497701,
  wikidata: 'Q15909631',
  height: 178.0,
  storeys: 49
});

export const CHINA_RESOURCES_OSM_SOURCE = authoredOsmSource({
  id: 107497701,
  type: 'way',
  version: 9,
  tags: {
    building: 'office',
    'building:levels': '49',
    height: '178',
    layer: '1',
    'addr:street': '港灣道 Harbour Road',
    'addr:housenumber': '26',
    name: '華潤大廈 China Resources Building',
    'name:en': 'China Resources Building',
    'name:zh': '華潤大廈',
    'name:zh-Hans': '华润大厦',
    'name:zh-Hant': '華潤大廈',
    wikidata: 'Q15909631',
    wikimedia_commons: 'Category:China Resources Building'
  },
  geometry: [
    { lon: 114.1751816, lat: 22.2801663 },
    { lon: 114.1752082, lat: 22.2798358 },
    { lon: 114.1757621, lat: 22.279874 },
    { lon: 114.1757355, lat: 22.2802045 },
    { lon: 114.1751816, lat: 22.2801663 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const CHINA_RESOURCES_RING = Object.freeze(
  CHINA_RESOURCES_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(CHINA_RESOURCES_RING);
export const CHINA_RESOURCES_BOUNDS = Object.freeze(flatRingBounds(CHINA_RESOURCES_RING));

let signedArea = 0;
for (let i = 0; i + 3 < CHINA_RESOURCES_RING.length; i += 2) {
  signedArea += CHINA_RESOURCES_RING[i] * CHINA_RESOURCES_RING[i + 3] -
    CHINA_RESOURCES_RING[i + 2] * CHINA_RESOURCES_RING[i + 1];
}
export const CHINA_RESOURCES_RING_AREA = Math.abs(signedArea * 0.5);

export const CHINA_RESOURCES_SITE = Object.freeze({
  name: '華潤大廈 China Resources Building',
  englishName: 'China Resources Building',
  address: '灣仔港灣道26號 26 Harbour Road',
  osmType: 'way',
  osmId: 107497701,
  source: CHINA_RESOURCES_OSM_SOURCE,
  ring: CHINA_RESOURCES_RING,
  bounds: CHINA_RESOURCES_BOUNDS,
  ...footprint,
  height: 178.0,
  storeys: 49,
  podiumHeight: 18.0,
  shaftHeight: 144.0,
  crownHeight: 16.0
});

export function chinaResourcesLocalToWorld(lx, lz) {
  const site = CHINA_RESOURCES_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function chinaResourcesWorldToLocal(wx, wz) {
  const site = CHINA_RESOURCES_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const CHINA_RESOURCES_LOCAL_RING = Object.freeze(
  CHINA_RESOURCES_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = chinaResourcesWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
