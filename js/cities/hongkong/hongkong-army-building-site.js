// 中國人民解放軍駐香港部隊大廈 (威爾斯親王大廈 Prince of Wales Building), 中環 (中西區).
// 113-metre military/government office tower.
// OSM Way: 101959095 (113m, 29 levels).
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 中環威爾斯親王大廈 (Prince of Wales Building, Central, Hong Kong).
// Height: 113.0m (29 levels).
// OSM Way: 101959095.
// Key Architectural Highlights:
// - Rectangular military/government office block.
// - Austere modernist facade with regular window grid.
// - Secure perimeter with restricted public access.
//
// NOTE: geometry below is extracted from OSM way 101959095.

export const HONGKONG_ARMY_BUILDING_HERITAGE = Object.freeze({
  address: '香港中環威爾斯親王大廈 (Prince of Wales Building, Central, Hong Kong)',
  district: '中西區中環 (Central, Central and Western District)',
  completionYear: 1986,
  currentName: 'PLA Hong Kong Building (中國人民解放軍駐香港部隊大廈)',
  architect: null,
  developer: null,
  style: 'Modernist Government/Military Office Block (現代主義政府／軍事辦公大樓)',
  osmWay: 101959095,
  height: 113.0,
  storeys: 29
});

export const HONGKONG_ARMY_BUILDING_OSM_SOURCE = authoredOsmSource({
  id: 101959095,
  type: 'way',
  version: null,
  tags: {
    building: 'yes',
    'building:levels': '29',
    height: '113',
    name: '中國人民解放軍駐香港部隊大廈 Chinese People\'s Liberation Army Forces Hong Kong Building',
    'name:en': "Chinese People's Liberation Army Forces Hong Kong Building",
    'name:zh': '中國人民解放軍駐香港部隊大廈',
    'alt_name:en': 'Prince of Wales Building',
    'alt_name:zh': '威爾斯親王大廈',
    'layer': '2'
  },
  geometry: [
    { lon: 114.1640352, lat: 22.2819105 },
    { lon: 114.1639309, lat: 22.2818844 },
    { lon: 114.1639142, lat: 22.2817726 },
    { lon: 114.1640179, lat: 22.2817989 },
    { lon: 114.1640352, lat: 22.2819105 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const HONGKONG_ARMY_BUILDING_RING = Object.freeze(
  HONGKONG_ARMY_BUILDING_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(HONGKONG_ARMY_BUILDING_RING);
export const HONGKONG_ARMY_BUILDING_BOUNDS = Object.freeze(flatRingBounds(HONGKONG_ARMY_BUILDING_RING));

let signedArea = 0;
for (let i = 0; i + 3 < HONGKONG_ARMY_BUILDING_RING.length; i += 2) {
  signedArea += HONGKONG_ARMY_BUILDING_RING[i] * HONGKONG_ARMY_BUILDING_RING[i + 3] -
    HONGKONG_ARMY_BUILDING_RING[i + 2] * HONGKONG_ARMY_BUILDING_RING[i + 1];
}
export const HONGKONG_ARMY_BUILDING_RING_AREA = Math.abs(signedArea * 0.5);

export const HONGKONG_ARMY_BUILDING_SITE = Object.freeze({
  ...makeAuthoredSite('hongkongArmyBuilding', '中國人民解放軍駐香港部隊大廈', "Chinese People's Liberation Army Forces Hong Kong Building", HONGKONG_ARMY_BUILDING_OSM_SOURCE, {
    height: 113.0,
    levels: 29
  }),
  podiumHeight: null,
  shaftHeight: null,
  crownHeight: null
});

export function hongkongArmyBuildingLocalToWorld(lx, lz) {
  const site = HONGKONG_ARMY_BUILDING_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function hongkongArmyBuildingWorldToLocal(wx, wz) {
  const site = HONGKONG_ARMY_BUILDING_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const HONGKONG_ARMY_BUILDING_LOCAL_RING = Object.freeze(
  HONGKONG_ARMY_BUILDING_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = hongkongArmyBuildingWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
