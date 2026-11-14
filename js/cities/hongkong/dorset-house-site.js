// 多盛大廈 Dorset House, 979 King's Road, 鰂魚涌 (東區).
// 151-metre office tower fronting King's Road.
// OSM Way: 100652800 (151m, 40 levels).
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 979 King's Road, 鰂魚涌, Hong Kong (香港鰂魚涌英皇道979號).
// Height: 151.0m (40 levels).
// OSM Way: 100652800.
// Key Architectural Highlights:
// - Rectangular office tower with glass curtain wall.
// - Ground-floor retail podium with entrance facing King's Road.
//
// NOTE: geometry below is extracted from OSM way 100652800.

export const DORSET_HOUSE_HERITAGE = Object.freeze({
  address: '香港鰂魚涌英皇道979號 (979 King\'s Road, 鰂魚涌, Hong Kong)',
  district: '東區鰂魚涌 (Quarry Bay, Eastern District)',
  completionYear: 1982,
  currentName: 'Dorset House (多盛大廈)',
  architect: null,
  developer: null,
  style: 'Modernist Office Tower (現代主義辦公大廈)',
  osmWay: 100652800,
  height: 151.0,
  storeys: 40
});

export const DORSET_HOUSE_OSM_SOURCE = authoredOsmSource({
  id: 100652800,
  type: 'way',
  version: null,
  tags: {
    building: 'office',
    'building:levels': '40',
    height: '151',
    'addr:housename': 'Dorset House',
    'addr:housename:en': 'Dorset House',
    'addr:housename:zh': '多盛大廈',
    'addr:street': '英皇道 King\'s Road',
    'addr:street:en': "King's Road",
    'addr:street:zh': '英皇道',
    'addr:housenumber': '979',
    name: '多盛大廈 Dorset House',
    'name:en': 'Dorset House',
    'name:zh': '多盛大廈'
  },
  geometry: [
    { lon: 114.2120006, lat: 22.28701 },
    { lon: 114.2119345, lat: 22.2869546 },
    { lon: 114.2118626, lat: 22.2868943 },
    { lon: 114.211736, lat: 22.2868972 },
    { lon: 114.2115916, lat: 22.2870375 },
    { lon: 114.211592, lat: 22.287052 },
    { lon: 114.2115948, lat: 22.2871547 },
    { lon: 114.2115993, lat: 22.2871587 },
    { lon: 114.2117191, lat: 22.2872642 },
    { lon: 114.2117464, lat: 22.2872883 },
    { lon: 114.2118731, lat: 22.2872854 },
    { lon: 114.2118991, lat: 22.2872601 },
    { lon: 114.2120059, lat: 22.2871562 },
    { lon: 114.2120006, lat: 22.28701 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const DORSET_HOUSE_RING = Object.freeze(
  DORSET_HOUSE_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(DORSET_HOUSE_RING);
export const DORSET_HOUSE_BOUNDS = Object.freeze(flatRingBounds(DORSET_HOUSE_RING));

let signedArea = 0;
for (let i = 0; i + 3 < DORSET_HOUSE_RING.length; i += 2) {
  signedArea += DORSET_HOUSE_RING[i] * DORSET_HOUSE_RING[i + 3] -
    DORSET_HOUSE_RING[i + 2] * DORSET_HOUSE_RING[i + 1];
}
export const DORSET_HOUSE_RING_AREA = Math.abs(signedArea * 0.5);

export const DORSET_HOUSE_SITE = Object.freeze({
  ...makeAuthoredSite('dorsetHouse', '多盛大廈', 'Dorset House', DORSET_HOUSE_OSM_SOURCE, {
    height: 151.0,
    levels: 40
  }),
  podiumHeight: null,
  shaftHeight: null,
  crownHeight: null
});

export function dorsetHouseLocalToWorld(lx, lz) {
  const site = DORSET_HOUSE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function dorsetHouseWorldToLocal(wx, wz) {
  const site = DORSET_HOUSE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const DORSET_HOUSE_LOCAL_RING = Object.freeze(
  DORSET_HOUSE_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = dorsetHouseWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
