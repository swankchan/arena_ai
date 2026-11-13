// 交易廣場第三座（Three Exchange Square, 8 Connaught Place, Central, 1988）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 8 Connaught Place, Central, Hong Kong (香港中環康樂廣場8號).
// Completed: 1988 (Phase 2 of Exchange Square).
// Height: 144.0m (32 storeys), roof crown 144m.
// Architect: Palmer & Turner (P&T Architects, 巴馬丹拿).
// Developer: Hongkong Land (香港置地).
// OSM Way: 148554950.
// Key Architectural Highlights:
// - Curved quadrant / fan-shaped modernist plan completing the Exchange Square complex.
// - Rose-beige polished Spanish granite cladding (#c3ae99) with dark bronze reflective ribbon glazing.
// - 4-storey commercial podium integrated with the Exchange Square bus terminus and elevated pedestrian skybridge deck.
// - 28 office storeys with warm scattered interior office illumination at night.
// - Rooftop mechanical penthouse crown with acoustic louvres and aviation warning beacons.

export const THREE_EXCHANGE_HERITAGE = Object.freeze({
  address: '香港中環康樂廣場8號 (8 Connaught Place, Central, Hong Kong)',
  district: '中西區中環 (Central, Central and Western District)',
  completionYear: 1988,
  currentName: 'Three Exchange Square (交易廣場第三座)',
  architect: 'Palmer & Turner (巴馬丹拿)',
  developer: 'Hongkong Land (香港置地)',
  style: 'Late Modernist Granite & Glass Highrise (晚期現代主義花崗石玻璃摩天大廈)',
  osmWay: 148554950,
  height: 144.0,
  storeys: 32
});

export const THREE_EXCHANGE_OSM_SOURCE = authoredOsmSource({
  id: 148554950,
  type: 'way',
  version: 8,
  tags: {
    building: 'office',
    'building:colour': '#c3ae99',
    'building:levels': '32',
    height: '144',
    location: 'podium',
    name: '交易廣場第三座 Three Exchange Square',
    'name:en': 'Three Exchange Square',
    'name:zh': '交易廣場第三座',
    'name:zh-Hans': '交易广场第三座',
    'name:zh-Hant': '交易廣場第三座'
  },
  geometry: [
    { lon: 114.1573151, lat: 22.2847198 },
    { lon: 114.1575689, lat: 22.2845723 },
    { lon: 114.157398, lat: 22.2843244 },
    { lon: 114.1572941, lat: 22.2843423 },
    { lon: 114.157291, lat: 22.2843483 },
    { lon: 114.1572716, lat: 22.2843459 },
    { lon: 114.1572538, lat: 22.2843467 },
    { lon: 114.1572366, lat: 22.2843506 },
    { lon: 114.1572215, lat: 22.284357 },
    { lon: 114.1572098, lat: 22.2843645 },
    { lon: 114.1572004, lat: 22.2843719 },
    { lon: 114.1571889, lat: 22.2843819 },
    { lon: 114.1570829, lat: 22.284512 },
    { lon: 114.1572495, lat: 22.2847579 },
    { lon: 114.1573151, lat: 22.2847198 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const THREE_EXCHANGE_RING = Object.freeze(
  THREE_EXCHANGE_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(THREE_EXCHANGE_RING);
export const THREE_EXCHANGE_BOUNDS = Object.freeze(flatRingBounds(THREE_EXCHANGE_RING));

let signedArea = 0;
for (let i = 0; i + 3 < THREE_EXCHANGE_RING.length; i += 2) {
  signedArea += THREE_EXCHANGE_RING[i] * THREE_EXCHANGE_RING[i + 3] -
    THREE_EXCHANGE_RING[i + 2] * THREE_EXCHANGE_RING[i + 1];
}
export const THREE_EXCHANGE_RING_AREA = Math.abs(signedArea * 0.5);

export const THREE_EXCHANGE_SITE = Object.freeze({
  name: '交易廣場第三座 Three Exchange Square',
  englishName: 'Three Exchange Square',
  address: '中環康樂廣場8號 8 Connaught Place',
  osmType: 'way',
  osmId: 148554950,
  source: THREE_EXCHANGE_OSM_SOURCE,
  ring: THREE_EXCHANGE_RING,
  bounds: THREE_EXCHANGE_BOUNDS,
  ...footprint,
  height: 144.0,
  storeys: 32,
  podiumHeight: 16.0,
  shaftHeight: 116.0,
  crownHeight: 12.0
});

export function threeExchangeLocalToWorld(lx, lz) {
  const site = THREE_EXCHANGE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function threeExchangeWorldToLocal(wx, wz) {
  const site = THREE_EXCHANGE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const THREE_EXCHANGE_LOCAL_RING = Object.freeze(
  THREE_EXCHANGE_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = threeExchangeWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
