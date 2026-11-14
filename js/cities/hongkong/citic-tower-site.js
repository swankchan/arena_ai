// 中信大廈（CITIC Tower, 1 Tim Mei Avenue, Tamar, Admiralty, 1997）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 1 Tim Mei Avenue, Tamar, Admiralty, Hong Kong (香港金鐘添美道1號).
// Completed: 1997 (Hong Kong Handover Year).
// Height: 126.0m (33 storeys), roof crown 126m.
// Architect: P&T Architects and Engineers Ltd (巴馬丹拿建築及工程有限公司).
// Developer: CITIC Pacific (中信泰富).
// OSM Way: 107353963.
// Wikidata: Q375628.
// Key Architectural Highlights:
// - Equilateral triangular plan with chamfered rounded corners, framing Tamar and the waterfront.
// - Emerald / sea-green reflective glass curtain wall with white/silver horizontal spandrel bands.
// - 4-storey commercial podium with circular atrium and landscaped drop-off plaza.
// - 29 office storeys with panoramic views across Victoria Harbour.
// - Symmetrical crown featuring illuminated red CITIC (中信) roundel logo signs on all three triangular faces.

export const CITIC_TOWER_HERITAGE = Object.freeze({
  address: '香港金鐘添美道1號 (1 Tim Mei Avenue, Tamar, Admiralty, Hong Kong)',
  district: '中西區添馬/金鐘 (Tamar, Admiralty, Central and Western District)',
  completionYear: 1997,
  currentName: 'CITIC Tower (中信大廈)',
  architect: 'P&T Architects and Engineers Ltd (巴馬丹拿)',
  developer: 'CITIC Pacific (中信泰富)',
  style: 'Late Modernist Triangular Skyscraper (晚期現代主義幾何標誌建築)',
  osmWay: 107353963,
  wikidata: 'Q375628',
  height: 126.0,
  storeys: 33
});

export const CITIC_TOWER_OSM_SOURCE = authoredOsmSource({
  id: 107353963,
  type: 'way',
  version: 8,
  tags: {
    building: 'yes',
    'building:levels': '34',
    height: '126',
    'addr:street': '添美道 Tim Mei Avenue',
    'addr:housenumber': '1',
    name: '中信大廈 CITIC Tower',
    'name:en': 'CITIC Tower',
    'name:zh': '中信大廈',
    'name:zh-Hans': '中信大厦',
    'name:zh-Hant': '中信大廈',
    wikidata: 'Q375628',
    wikimedia_commons: 'Category:CITIC Tower (Hong Kong)'
  },
  geometry: [
    { lon: 114.1671565, lat: 22.2803951 },
    { lon: 114.1674221, lat: 22.2806022 },
    { lon: 114.1674401, lat: 22.2806259 },
    { lon: 114.1674493, lat: 22.2806536 },
    { lon: 114.1674489, lat: 22.2806825 },
    { lon: 114.1674388, lat: 22.28071 },
    { lon: 114.16742, lat: 22.2807331 },
    { lon: 114.1673944, lat: 22.2807498 },
    { lon: 114.1670719, lat: 22.2808603 },
    { lon: 114.167042, lat: 22.2808688 },
    { lon: 114.1670107, lat: 22.2808684 },
    { lon: 114.1669811, lat: 22.280859 },
    { lon: 114.166956, lat: 22.2808417 },
    { lon: 114.166938, lat: 22.280818 },
    { lon: 114.1669287, lat: 22.2807903 },
    { lon: 114.1669292, lat: 22.2807614 },
    { lon: 114.1669862, lat: 22.2804438 },
    { lon: 114.1669963, lat: 22.2804163 },
    { lon: 114.1670151, lat: 22.2803932 },
    { lon: 114.1670406, lat: 22.2803765 },
    { lon: 114.1670705, lat: 22.2803679 },
    { lon: 114.1671018, lat: 22.2803684 },
    { lon: 114.1671315, lat: 22.2803777 },
    { lon: 114.1671565, lat: 22.2803951 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const CITIC_TOWER_RING = Object.freeze(
  CITIC_TOWER_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(CITIC_TOWER_RING);
export const CITIC_TOWER_BOUNDS = Object.freeze(flatRingBounds(CITIC_TOWER_RING));

let signedArea = 0;
for (let i = 0; i + 3 < CITIC_TOWER_RING.length; i += 2) {
  signedArea += CITIC_TOWER_RING[i] * CITIC_TOWER_RING[i + 3] -
    CITIC_TOWER_RING[i + 2] * CITIC_TOWER_RING[i + 1];
}
export const CITIC_TOWER_RING_AREA = Math.abs(signedArea * 0.5);

export const CITIC_TOWER_SITE = Object.freeze({
  ...makeAuthoredSite('citicTower', '中信大廈', 'CITIC Tower', CITIC_TOWER_OSM_SOURCE, {
    height: 126.0,
    levels: 33
  }),
  podiumHeight: 18.0,
  shaftHeight: 96.0,
  crownHeight: 12.0
});

export function citicTowerLocalToWorld(lx, lz) {
  const site = CITIC_TOWER_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function citicTowerWorldToLocal(wx, wz) {
  const site = CITIC_TOWER_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const CITIC_TOWER_LOCAL_RING = Object.freeze(
  CITIC_TOWER_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = citicTowerWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
