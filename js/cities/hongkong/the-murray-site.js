// 美利尼依格羅酒店 The Murray, Hong Kong, A Niccolo Hotel, 22 Garden Road, 中環 (中西區).
// 5-star hotel, 21 levels.
// OSM Way: 85320844.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 22 Garden Road, 中環, Hong Kong (香港中環花園道22號).
// Levels: 21.
// OSM Way: 85320844.
// Key Architectural Highlights:
// - 5-star Niccolo Hotel.
// - Former Government offices building, redeveloped as hotel.
//
// NOTE: geometry below is extracted from OSM way 85320844.

export const THE_MURRAY_HERITAGE = Object.freeze({
  address: '香港中環花園道22號 (22 Garden Road, Central, Hong Kong)',
  district: '中西區中環 (Central, Central and Western District)',
  completionYear: 1974,
  currentName: 'The Murray, Hong Kong, A Niccolo Hotel (美利尼依格羅酒店)',
  architect: null,
  developer: null,
  style: 'Modernist Hotel Tower (現代主義酒店大廈)',
  osmWay: 85320844,
  height: null,
  storeys: 21
});

export const THE_MURRAY_OSM_SOURCE = authoredOsmSource({
  id: 85320844,
  type: 'way',
  version: null,
  tags: {
    building: 'yes',
    'building:levels': '21',
    'level': '25',
    'layer': '2',
    'addr:housenumber': '22',
    'addr:street': '花園道 Garden Road',
    'addr:street:en': 'Garden Road',
    'addr:street:zh': '花園道',
    'addr:city': 'Central',
    name: '美利尼依格羅酒店 The Murray, Hong Kong, A Niccolo Hotel',
    'name:en': 'The Murray, Hong Kong, A Niccolo Hotel',
    'name:zh': '美利尼依格羅酒店',
    'name:zh-Hans': '美利尼依格罗酒店',
    'name:zh-Hant': '美利尼依格羅酒店',
    'email': 'themurray@niccolohotels.com',
    'phone': '+852 3141 8888',
    'rooms': '336',
    'stars': '5',
    'tourism': 'hotel',
    'operator': 'Marco Polo Hotels',
    'website': 'https://www.marcopolohotels.com/ch/niccolo/hotels/hongkong/central/the_murray/index.html'
  },
  geometry: [
    { lon: 114.1600711, lat: 22.2778044 },
    { lon: 114.15985, lat: 22.2779787 },
    { lon: 114.1601748, lat: 22.2783317 },
    { lon: 114.1603815, lat: 22.2781732 },
    { lon: 114.1603937, lat: 22.27816 },
    { lon: 114.1600711, lat: 22.2778044 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const THE_MURRAY_RING = Object.freeze(
  THE_MURRAY_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(THE_MURRAY_RING);
export const THE_MURRAY_BOUNDS = Object.freeze(flatRingBounds(THE_MURRAY_RING));

let signedArea = 0;
for (let i = 0; i + 3 < THE_MURRAY_RING.length; i += 2) {
  signedArea += THE_MURRAY_RING[i] * THE_MURRAY_RING[i + 3] -
    THE_MURRAY_RING[i + 2] * THE_MURRAY_RING[i + 1];
}
export const THE_MURRAY_RING_AREA = Math.abs(signedArea * 0.5);

export const THE_MURRAY_SITE = Object.freeze({
  ...makeAuthoredSite('theMurray', '美利尼依格羅酒店', 'The Murray', THE_MURRAY_OSM_SOURCE, {
    height: null,
    levels: 21
  }),
  podiumHeight: null,
  shaftHeight: null,
  crownHeight: null
});

export function theMurrayLocalToWorld(lx, lz) {
  const site = THE_MURRAY_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function theMurrayWorldToLocal(wx, wz) {
  const site = THE_MURRAY_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const THE_MURRAY_LOCAL_RING = Object.freeze(
  THE_MURRAY_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = theMurrayWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
