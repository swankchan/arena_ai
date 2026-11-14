// 啟匯 Harbourside HQ, 8 Lam Chak Street, 啟德 (九龍城區).
// 85-metre commercial tower.
// OSM Way: 198558927 (85m).
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 8 Lam Chak Street, 啟德, Hong Kong (香港啟德臨澤街8號).
// Height: 85.0m.
// OSM Way: 198558927.
// Key Architectural Highlights:
// - Rectangular commercial tower.
// - Contemporary design in Kai Tak.
//
// NOTE: geometry below is extracted from OSM way 198558927.

export const HARBOURSIDE_HQ_HERITAGE = Object.freeze({
  address: '香港啟德臨澤街8號 (8 Lam Chak Street, Kai Tak, Hong Kong)',
  district: '九龍城區啟德 (Kai Tak, Kowloon City District)',
  completionYear: 2019,
  currentName: 'Harbourside HQ (啟匯)',
  architect: null,
  developer: null,
  style: 'Contemporary Commercial Tower (當代商業大廈)',
  osmWay: 198558927,
  height: 85.0,
  storeys: null
});

export const HARBOURSIDE_HQ_OSM_SOURCE = authoredOsmSource({
  id: 198558927,
  type: 'way',
  version: null,
  tags: {
    building: 'commercial',
    height: '85',
    'addr:housenumber': '8',
    'addr:street': '臨澤街 Lam Chak Street',
    'addr:street:en': 'Lam Chak Street',
    'addr:street:zh': '臨澤街',
    name: '啟匯 Harbourside HQ',
    'name:en': 'Harbourside HQ',
    'name:zh': '啟匯',
    'old_name': '傲騰廣場 Octa Tower',
    'old_name:en': 'Octa Tower',
    'old_name:zh': '傲騰廣場'
  },
  geometry: [
    { lon: 114.1999182, lat: 22.3124065 },
    { lon: 114.1998508, lat: 22.3123647 },
    { lon: 114.1997835, lat: 22.3123231 },
    { lon: 114.1997341, lat: 22.3122805 },
    { lon: 114.1997039, lat: 22.312233 },
    { lon: 114.1996905, lat: 22.3121815 },
    { lon: 114.1996934, lat: 22.312134 },
    { lon: 114.1997122, lat: 22.3120918 },
    { lon: 114.1997455, lat: 22.3120567 },
    { lon: 114.1997914, lat: 22.3120288 },
    { lon: 114.1998498, lat: 22.312008 },
    { lon: 114.1999182, lat: 22.3124065 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const HARBOURSIDE_HQ_RING = Object.freeze(
  HARBOURSIDE_HQ_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(HARBOURSIDE_HQ_RING);
export const HARBOURSIDE_HQ_BOUNDS = Object.freeze(flatRingBounds(HARBOURSIDE_HQ_RING));

let signedArea = 0;
for (let i = 0; i + 3 < HARBOURSIDE_HQ_RING.length; i += 2) {
  signedArea += HARBOURSIDE_HQ_RING[i] * HARBOURSIDE_HQ_RING[i + 3] -
    HARBOURSIDE_HQ_RING[i + 2] * HARBOURSIDE_HQ_RING[i + 1];
}
export const HARBOURSIDE_HQ_RING_AREA = Math.abs(signedArea * 0.5);

export const HARBOURSIDE_HQ_SITE = Object.freeze({
  ...makeAuthoredSite('harboursideHq', '啟匯', 'Harbourside HQ', HARBOURSIDE_HQ_OSM_SOURCE, {
    height: 85.0,
    levels: 24
  }),
  podiumHeight: null,
  shaftHeight: null,
  crownHeight: null
});

export function harboursideHqLocalToWorld(lx, lz) {
  const site = HARBOURSIDE_HQ_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function harboursideHqWorldToLocal(wx, wz) {
  const site = HARBOURSIDE_HQ_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const HARBOURSIDE_HQ_LOCAL_RING = Object.freeze(
  HARBOURSIDE_HQ_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = harboursideHqWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
