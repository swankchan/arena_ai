// 中國工商銀行大廈（ICBC Tower, Three Garden Road, 3 Garden Road, Central, 1992）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 3 Garden Road, Central, Hong Kong (香港中環花園道3號).
// Completed: 1992.
// Complex: Three Garden Road (花園道3號, formerly Citibank Plaza 花旗銀行廣場).
// Architects: Rocco Design Architects (嚴迅奇 / 許李嚴建築師事務所).
// Award: HKIA Silver Medal 1995 (香港建築師學會銀牌獎).
// Height: 167.0m (37 office storeys, 40 structural levels), roof crown 167m.
// OSM way: 107497693.
// Key Architectural Highlights:
// - Forms an iconic architectural gateway on Garden Road together with Champion Tower (冠君大廈 / 原花旗銀行大廈).
// - Angled faceted prism geometry maximizing views toward Victoria Harbour, The Peak, and Chater Garden.
// - High-performance silver-blue reflective curtain wall with crisp horizontal spandrel bands and vertical mullions.
// - Multi-level pedestrian circulation connecting Garden Road and Cotton Tree Drive via cascading escalators and public atrium.
// - Mechanical penthouse crown with illuminated ICBC (中國工商銀行) corporate red-and-gold emblem.

export const ICBC_TOWER_HERITAGE = Object.freeze({
  address: '香港中環花園道3號 (3 Garden Road, Central, Hong Kong)',
  district: '中西區中環 (Central, Central and Western District)',
  complex: 'Three Garden Road (花園道3號)',
  architects: 'Rocco Design Architects (嚴迅奇 / 許李嚴建築師事務所)',
  completionYear: 1992,
  award: 'HKIA Silver Medal 1995 (香港建築師學會銀牌獎)',
  currentName: 'ICBC Tower (中國工商銀行大廈)',
  style: 'Late Modernist Commercial Landmark (晚期現代主義商業地標)',
  osmWay: 107497693,
  height: 167.0,
  storeys: 37,
  levels: 40
});

export const ICBC_TOWER_OSM_SOURCE = authoredOsmSource({
  id: 107497693,
  type: 'way',
  version: 8,
  tags: {
    building: 'yes',
    'building:levels': '40',
    'building:use': 'office',
    height: '167',
    name: '中國工商銀行大廈 ICBC Tower',
    'name:en': 'ICBC Tower',
    'name:zh': '中國工商銀行大廈',
    'name:zh-Hans': '中国工商银行大厦',
    'name:zh-Hant': '中國工商銀行大廈'
  },
  geometry: [
    { lon: 114.1608057, lat: 22.27842 },
    { lon: 114.1607454, lat: 22.2781332 },
    { lon: 114.1608611, lat: 22.2781367 },
    { lon: 114.1608752, lat: 22.2780917 },
    { lon: 114.1609261, lat: 22.2780963 },
    { lon: 114.1609816, lat: 22.2781198 },
    { lon: 114.1611204, lat: 22.2782501 },
    { lon: 114.1611952, lat: 22.2783944 },
    { lon: 114.1611465, lat: 22.278553 },
    { lon: 114.1611062, lat: 22.278701 },
    { lon: 114.1608057, lat: 22.27842 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const ICBC_TOWER_RING = Object.freeze(
  ICBC_TOWER_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(ICBC_TOWER_RING);
export const ICBC_TOWER_BOUNDS = Object.freeze(flatRingBounds(ICBC_TOWER_RING));

let signedArea = 0;
for (let i = 0; i + 3 < ICBC_TOWER_RING.length; i += 2) {
  signedArea += ICBC_TOWER_RING[i] * ICBC_TOWER_RING[i + 3] -
    ICBC_TOWER_RING[i + 2] * ICBC_TOWER_RING[i + 1];
}
export const ICBC_TOWER_RING_AREA = Math.abs(signedArea * 0.5);

export const ICBC_TOWER_SITE = Object.freeze({
  name: '中國工商銀行大廈 ICBC Tower',
  englishName: 'ICBC Tower',
  address: '花園道3號 3 Garden Road',
  osmType: 'way',
  osmId: ICBC_TOWER_OSM_SOURCE.id,
  source: ICBC_TOWER_OSM_SOURCE,
  ring: ICBC_TOWER_RING,
  bounds: ICBC_TOWER_BOUNDS,
  ...footprint,
  height: 167.0,
  storeys: 37,
  levels: 40,
  podiumHeight: 18.0,
  shaftHeight: 133.0,
  crownHeight: 16.0
});

export function icbcTowerLocalToWorld(lx, lz) {
  const site = ICBC_TOWER_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function icbcTowerWorldToLocal(wx, wz) {
  const site = ICBC_TOWER_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const ICBC_TOWER_LOCAL_RING = Object.freeze(
  ICBC_TOWER_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = icbcTowerWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
