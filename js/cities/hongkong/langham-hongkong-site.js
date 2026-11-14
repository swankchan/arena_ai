// 香港朗廷酒店 The Langham Hong Kong, 8 Peking Road, 尖沙咀 (油尖區).
// 55-metre 5-star hotel on Victoria Harbour waterfront.
// OSM Way: 159324344 (55m, 17 levels).
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 8 Peking Road, 尖沙咀, Hong Kong (香港尖沙咀北京道8號).
// Height: 55.0m (17 levels).
// OSM Way: 159324344.
// Key Architectural Highlights:
// - 5-star hotel on Victoria Harbour waterfront.
// - Curved facade facing the harbour.
//
// NOTE: geometry below is extracted from OSM way 159324344.

export const LANGHAM_HONGKONG_HERITAGE = Object.freeze({
  address: '香港尖沙咀北京道8號 (8 Peking Road, Tsim Sha Tsui, Hong Kong)',
  district: '油尖區尖沙咀 (Tsim Sha Tsui, Yau Tsim Mong District)',
  completionYear: 1991,
  currentName: 'The Langham Hong Kong (香港朗廷酒店)',
  architect: null,
  developer: null,
  style: 'Modern Hotel Tower (現代酒店大廈)',
  osmWay: 159324344,
  height: 55.0,
  storeys: 17
});

export const LANGHAM_HONGKONG_OSM_SOURCE = authoredOsmSource({
  id: 159324344,
  type: 'way',
  version: null,
  tags: {
    building: 'hotel',
    'building:levels': '17',
    'building:min_level': '4',
    height: '55',
    'addr:housenumber': '8',
    'addr:street': '北京道 Peking Road',
    'addr:street:en': 'Peking Road',
    'addr:street:zh': '北京道',
    'addr:city': '尖沙咀 Tsim Sha Tsui',
    name: '香港朗廷酒店 The Langham Hong Kong',
    'name:en': 'The Langham Hong Kong',
    'name:zh': '香港朗廷酒店',
    'rooms': '498',
    'stars': '5',
    'tourism': 'hotel',
    'layer': '1'
  },
  geometry: [
    { lon: 114.1696121, lat: 22.2965163 },
    { lon: 114.1695939, lat: 22.2965129 },
    { lon: 114.1695812, lat: 22.2965714 },
    { lon: 114.1695593, lat: 22.2965673 },
    { lon: 114.1695437, lat: 22.2966392 },
    { lon: 114.1695688, lat: 22.296674 },
    { lon: 114.1695875, lat: 22.2966775 },
    { lon: 114.1695977, lat: 22.2966712 },
    { lon: 114.1696045, lat: 22.2966807 },
    { lon: 114.1696232, lat: 22.2966842 },
    { lon: 114.1696336, lat: 22.2966778 },
    { lon: 114.1696404, lat: 22.2966874 },
    { lon: 114.1696588, lat: 22.2966908 },
    { lon: 114.1696693, lat: 22.2966844 },
    { lon: 114.1696763, lat: 22.2966941 },
    { lon: 114.1696945, lat: 22.2966975 },
    { lon: 114.169705, lat: 22.2966909 },
    { lon: 114.1697122, lat: 22.2967007 },
    { lon: 114.1697302, lat: 22.2967041 },
    { lon: 114.1697409, lat: 22.2966975 },
    { lon: 114.1697479, lat: 22.2967074 },
    { lon: 114.1697659, lat: 22.2967108 },
    { lon: 114.1697767, lat: 22.2967042 },
    { lon: 114.1697837, lat: 22.2967141 },
    { lon: 114.1698016, lat: 22.2967174 },
    { lon: 114.1698124, lat: 22.2967108 },
    { lon: 114.1698196, lat: 22.2967208 },
    { lon: 114.1698374, lat: 22.2967241 },
    { lon: 114.1698481, lat: 22.2967175 },
    { lon: 114.1698553, lat: 22.2967274 },
    { lon: 114.1698732, lat: 22.2967307 },
    { lon: 114.1698839, lat: 22.2967241 },
    { lon: 114.1699304, lat: 22.2967327 },
    { lon: 114.1699699, lat: 22.2966208 },
    { lon: 114.1700026, lat: 22.29647 },
    { lon: 114.1700129, lat: 22.2964222 },
    { lon: 114.1700288, lat: 22.2963489 },
    { lon: 114.1699816, lat: 22.2963404 },
    { lon: 114.1699745, lat: 22.2963305 },
    { lon: 114.1699566, lat: 22.2963272 },
    { lon: 114.1699458, lat: 22.2963338 },
    { lon: 114.1699387, lat: 22.2963238 },
    { lon: 114.1699209, lat: 22.2963205 },
    { lon: 114.1699101, lat: 22.2963271 },
    { lon: 114.1699029, lat: 22.2963172 },
    { lon: 114.169885, lat: 22.2963138 },
    { lon: 114.1698744, lat: 22.2963204 },
    { lon: 114.1698672, lat: 22.2963105 },
    { lon: 114.1698492, lat: 22.2963072 },
    { lon: 114.1698386, lat: 22.2963138 },
    { lon: 114.1698315, lat: 22.2963039 },
    { lon: 114.1698135, lat: 22.2963005 },
    { lon: 114.1698028, lat: 22.296307 },
    { lon: 114.1697958, lat: 22.2962972 },
    { lon: 114.1697776, lat: 22.2962938 },
    { lon: 114.1697671, lat: 22.2963003 },
    { lon: 114.1697601, lat: 22.2962906 },
    { lon: 114.1697417, lat: 22.2962871 },
    { lon: 114.1697314, lat: 22.2962935 },
    { lon: 114.1697245, lat: 22.2962839 },
    { lon: 114.1697058, lat: 22.2962805 },
    { lon: 114.1696956, lat: 22.2962868 },
    { lon: 114.1696888, lat: 22.2962773 },
    { lon: 114.1696701, lat: 22.2962738 },
    { lon: 114.1696598, lat: 22.2962802 },
    { lon: 114.1696529, lat: 22.2962706 },
    { lon: 114.1696345, lat: 22.2962671 },
    { lon: 114.169624, lat: 22.2962736 },
    { lon: 114.1695557, lat: 22.2962609 },
    { lon: 114.1695422, lat: 22.2963232 },
    { lon: 114.1695609, lat: 22.2963267 },
    { lon: 114.169548, lat: 22.2963864 },
    { lon: 114.1695632, lat: 22.2963892 },
    { lon: 114.1695753, lat: 22.296417 },
    { lon: 114.1696043, lat: 22.2964061 },
    { lon: 114.1696121, lat: 22.2964239 },
    { lon: 114.1696411, lat: 22.296413 },
    { lon: 114.1696489, lat: 22.2964308 },
    { lon: 114.1696779, lat: 22.2964199 },
    { lon: 114.1696857, lat: 22.2964376 },
    { lon: 114.1697147, lat: 22.2964267 },
    { lon: 114.1697225, lat: 22.2964445 },
    { lon: 114.1697515, lat: 22.2964336 },
    { lon: 114.1697593, lat: 22.2964514 },
    { lon: 114.1697883, lat: 22.2964405 },
    { lon: 114.1697961, lat: 22.2964583 },
    { lon: 114.1697823, lat: 22.2965219 },
    { lon: 114.1697677, lat: 22.2965355 },
    { lon: 114.1697455, lat: 22.2965152 },
    { lon: 114.1697309, lat: 22.2965288 },
    { lon: 114.1697087, lat: 22.2965084 },
    { lon: 114.1696941, lat: 22.296522 },
    { lon: 114.1696718, lat: 22.2965016 },
    { lon: 114.1696573, lat: 22.2965153 },
    { lon: 114.169635, lat: 22.2964949 },
    { lon: 114.1696121, lat: 22.2965163 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const LANGHAM_HONGKONG_RING = Object.freeze(
  LANGHAM_HONGKONG_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(LANGHAM_HONGKONG_RING);
export const LANGHAM_HONGKONG_BOUNDS = Object.freeze(flatRingBounds(LANGHAM_HONGKONG_RING));

let signedArea = 0;
for (let i = 0; i + 3 < LANGHAM_HONGKONG_RING.length; i += 2) {
  signedArea += LANGHAM_HONGKONG_RING[i] * LANGHAM_HONGKONG_RING[i + 3] -
    LANGHAM_HONGKONG_RING[i + 2] * LANGHAM_HONGKONG_RING[i + 1];
}
export const LANGHAM_HONGKONG_RING_AREA = Math.abs(signedArea * 0.5);

export const LANGHAM_HONGKONG_SITE = Object.freeze({
  ...makeAuthoredSite('langhamHongkong', '香港朗廷酒店', 'The Langham Hong Kong', LANGHAM_HONGKONG_OSM_SOURCE, {
    height: 55.0,
    levels: 17
  }),
  podiumHeight: null,
  shaftHeight: null,
  crownHeight: null
});

export function langhamHongkongLocalToWorld(lx, lz) {
  const site = LANGHAM_HONGKONG_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function langhamHongkongWorldToLocal(wx, wz) {
  const site = LANGHAM_HONGKONG_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const LANGHAM_HONGKONG_LOCAL_RING = Object.freeze(
  LANGHAM_HONGKONG_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = langhamHongkongWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
