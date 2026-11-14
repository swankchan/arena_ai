// 海港政府大樓 Harbour Building, 38 Pier Road, 中環 (中西區).
// 96-metre government office tower.
// OSM Way: 26599387 (96m, 25 levels).
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 38 Pier Road, 中環, Hong Kong (香港中環統一碼頭道38號).
// Height: 96.0m (25 levels).
// OSM Way: 26599387.
// Key Architectural Highlights:
// - Rectangular government office building.
// - Concrete facade with regular window grid.
// - Government offices with waterfront frontage.
//
// NOTE: geometry below is extracted from OSM way 26599387.

export const HARBOUR_BUILDING_HERITAGE = Object.freeze({
  address: '香港中環統一碼頭道38號 (38 Pier Road, Central, Hong Kong)',
  district: '中西區中環 (Central, Central and Western District)',
  completionYear: 1978,
  currentName: 'Harbour Building (海港政府大樓)',
  architect: null,
  developer: null,
  style: 'Modernist Government Office Block (現代主義政府辦公大樓)',
  osmWay: 26599387,
  height: 96.0,
  storeys: 25
});

export const HARBOUR_BUILDING_OSM_SOURCE = authoredOsmSource({
  id: 26599387,
  type: 'way',
  version: null,
  tags: {
    building: 'public',
    'building:levels': '25',
    height: '96',
    'addr:housenumber': '38',
    'addr:street': '統一碼頭道 Pier Road',
    'addr:street:en': 'Pier Road',
    'addr:street:zh': '統一碼頭道',
    name: '海港政府大樓 Harbour Building',
    'name:en': 'Harbour Building',
    'name:zh': '海港政府大樓',
    'office': 'government',
    'landmark': 'motor_vehicle',
    'layer': '2'
  },
  geometry: [
    { lon: 114.1725127, lat: 22.2854224 },
    { lon: 114.1723979, lat: 22.2853576 },
    { lon: 114.1722895, lat: 22.2852977 },
    { lon: 114.1721991, lat: 22.2852431 },
    { lon: 114.1721266, lat: 22.2851936 },
    { lon: 114.1720717, lat: 22.2851488 },
    { lon: 114.1720339, lat: 22.2851083 },
    { lon: 114.1720131, lat: 22.2850714 },
    { lon: 114.1720093, lat: 22.2850262 },
    { lon: 114.1720226, lat: 22.2849858 },
    { lon: 114.1720524, lat: 22.2849501 },
    { lon: 114.1720986, lat: 22.2849194 },
    { lon: 114.1721598, lat: 22.2848934 },
    { lon: 114.1722342, lat: 22.2848719 },
    { lon: 114.1723193, lat: 22.2848547 },
    { lon: 114.1724147, lat: 22.2848418 },
    { lon: 114.1725127, lat: 22.2854224 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const HARBOUR_BUILDING_RING = Object.freeze(
  HARBOUR_BUILDING_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(HARBOUR_BUILDING_RING);
export const HARBOUR_BUILDING_BOUNDS = Object.freeze(flatRingBounds(HARBOUR_BUILDING_RING));

let signedArea = 0;
for (let i = 0; i + 3 < HARBOUR_BUILDING_RING.length; i += 2) {
  signedArea += HARBOUR_BUILDING_RING[i] * HARBOUR_BUILDING_RING[i + 3] -
    HARBOUR_BUILDING_RING[i + 2] * HARBOUR_BUILDING_RING[i + 1];
}
export const HARBOUR_BUILDING_RING_AREA = Math.abs(signedArea * 0.5);

export const HARBOUR_BUILDING_SITE = Object.freeze({
  ...makeAuthoredSite('harbourBuilding', '海港政府大樓', 'Harbour Building', HARBOUR_BUILDING_OSM_SOURCE, {
    height: 96.0,
    levels: 25
  }),
  podiumHeight: null,
  shaftHeight: null,
  crownHeight: null
});

export function harbourBuildingLocalToWorld(lx, lz) {
  const site = HARBOUR_BUILDING_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function harbourBuildingWorldToLocal(wx, wz) {
  const site = HARBOUR_BUILDING_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const HARBOUR_BUILDING_LOCAL_RING = Object.freeze(
  HARBOUR_BUILDING_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = harbourBuildingWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
