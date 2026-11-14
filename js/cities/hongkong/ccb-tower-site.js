// 中國建設銀行大廈（CCB Tower, 3 Connaught Road Central, 2012）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 3 Connaught Road Central, Central, Hong Kong (香港中環干諾道中3號).
// Completed: 2012.
// Architect: Aedas.
// Developer: China Construction Bank & Lai Sun Development (中國建設銀行及麗新發展).
// Height: 135.0m (31 storeys), roof crown 135m.
// OSM Way: 242113651.
// Wikidata: Q10874575.
// Key Architectural Highlights:
// - Replaced the former Ritz-Carlton Hotel Hong Kong (香港麗嘉酒店, 1993–2008).
// - Sits prominently along Connaught Road Central between Hong Kong Club and AIA Central, facing Chater Garden and Victoria Harbour.
// - High-performance dark blue-grey Low-E reflective glass curtain wall with crisp silver-anodized vertical mullions.
// - 3-storey grand banking hall podium with granite framing and double-height transparent glazing.
// - Angled geometric crown with illuminated blue/white China Construction Bank corporate signage and aviation beacons.

export const CCB_TOWER_HERITAGE = Object.freeze({
  address: '香港中環干諾道中3號 (3 Connaught Road Central, Central, Hong Kong)',
  district: '中西區中環 (Central, Central and Western District)',
  completionYear: 2012,
  currentName: 'CCB Tower (中國建設銀行大廈)',
  formerSite: 'The Ritz-Carlton Hotel Hong Kong (香港麗嘉酒店)',
  architect: 'Aedas',
  developers: 'China Construction Bank & Lai Sun Development (中國建設銀行及麗新發展)',
  style: 'Contemporary Sustainable Commercial Skyscraper (當代可持續商業地標)',
  osmWay: 242113651,
  wikidata: 'Q10874575',
  height: 135.0,
  storeys: 31
});

export const CCB_TOWER_OSM_SOURCE = authoredOsmSource({
  id: 242113651,
  type: 'way',
  version: 6,
  tags: {
    building: 'office',
    'building:levels': '31',
    height: '135',
    'addr:street': '干諾道中 Connaught Road Central',
    'addr:housenumber': '3',
    name: '中國建設銀行大廈 CCB Tower',
    'name:en': 'CCB Tower',
    'name:zh': '中國建設銀行大廈',
    'name:zh-Hans': '中国建设银行大厦',
    'name:zh-Hant': '中國建設銀行大廈',
    wikidata: 'Q10874575',
    wikimedia_commons: 'Category:CCB Tower'
  },
  geometry: [
    { lon: 114.1614018, lat: 22.2815906 },
    { lon: 114.1613034, lat: 22.2812787 },
    { lon: 114.1612915, lat: 22.2812412 },
    { lon: 114.1614112, lat: 22.2812089 },
    { lon: 114.1615308, lat: 22.2811765 },
    { lon: 114.1615427, lat: 22.281214 },
    { lon: 114.1616411, lat: 22.281526 },
    { lon: 114.1616535, lat: 22.281565 },
    { lon: 114.1614142, lat: 22.2816297 },
    { lon: 114.1614018, lat: 22.2815906 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const CCB_TOWER_RING = Object.freeze(
  CCB_TOWER_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(CCB_TOWER_RING);
export const CCB_TOWER_BOUNDS = Object.freeze(flatRingBounds(CCB_TOWER_RING));

let signedArea = 0;
for (let i = 0; i + 3 < CCB_TOWER_RING.length; i += 2) {
  signedArea += CCB_TOWER_RING[i] * CCB_TOWER_RING[i + 3] -
    CCB_TOWER_RING[i + 2] * CCB_TOWER_RING[i + 1];
}
export const CCB_TOWER_RING_AREA = Math.abs(signedArea * 0.5);

export const CCB_TOWER_SITE = Object.freeze({
  ...makeAuthoredSite('ccbTower', '中國建設銀行大廈', 'CCB Tower', CCB_TOWER_OSM_SOURCE, {
    height: 135.0,
    levels: 31
  }),
  podiumHeight: 14.0,
  shaftHeight: 108.0,
  crownHeight: 13.0
});

export function ccbTowerLocalToWorld(lx, lz) {
  const site = CCB_TOWER_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function ccbTowerWorldToLocal(wx, wz) {
  const site = CCB_TOWER_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const CCB_TOWER_LOCAL_RING = Object.freeze(
  CCB_TOWER_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = ccbTowerWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
