// 香港君悅酒店（Grand Hyatt Hong Kong, 1 Harbour Road, Wan Chai, 1989）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
// Source: OSM Way 107497699.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { minimumAreaObb, pointInFlatRing, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 1 Harbour Road, Wan Chai, Hong Kong (香港灣仔港灣道1號, 香港會議展覽中心旁).
// Completed: 1989.
// Height: 129.0m (36 storeys).
// Developer: MTR Corporation / Hong Kong Convention and Exhibition Centre (by New World Development).
// Architect: Wong & Ouyang (HK) Ltd (王歐陽(香港)有限公司).
// OSM Way: 107497699.
// Key Architectural Highlights:
// - 129-metre, 36-storey five-star hotel tower adjacent to HKCEC, overlooking Victoria Harbour.
// - Long rectangular glass curtain-wall block with silver-blue reflective glazing.
// - Grand porte-cochère entrance canopy and stone-clad podium base.
// - Rooftop plant room with parapet and aviation obstacle lighting.

export const GRAND_HYATT_HONG_KONG_HERITAGE = Object.freeze({
  address: '香港灣仔港灣道1號 1 Harbour Road, Wan Chai, Hong Kong',
  district: '灣仔 (Wan Chai)',
  completionYear: 1989,
  currentName: 'Grand Hyatt Hong Kong (香港君悅酒店)',
  developer: 'MTR Corporation and New World Development',
  architect: 'Wong & Ouyang (HK) Ltd (王歐陽(香港)有限公司)',
  style: 'Late-Modernist Reflective Glass Hotel Tower (晚期現代主義反光玻璃酒店摩天大樓)',
  osmWay: 107497699,
  height: 129.0,
  storeys: 36
});

export const GRAND_HYATT_HONG_KONG_OSM_SOURCE = authoredOsmSource({
  id: 107497699,
  type: 'way',
  version: 4,
  tags: {
    building: 'hotel',
    'building:levels': '36',
    height: '129',
    name: '香港君悅酒店 Grand Hyatt Hong Kong',
    'name:en': 'Grand Hyatt Hong Kong',
    'name:zh': '香港君悅酒店',
    tourism: 'hotel',
    stars: '5',
    rooms: '542',
    wikidata: 'Q5594657',
    wikipedia: 'zh:香港君悅酒店'
  },
  geometry: [
    { lat: 22.2814116, lon: 114.1725065 },
    { lat: 22.2814956, lon: 114.1724992 },
    { lat: 22.2814681, lon: 114.1721304 },
    { lat: 22.2814667, lon: 114.1721111 },
    { lat: 22.2812319, lon: 114.1718951 },
    { lat: 22.2810594, lon: 114.1719101 },
    { lat: 22.2810729, lon: 114.1720916 },
    { lat: 22.2811759, lon: 114.1720826 },
    { lat: 22.2813044, lon: 114.1722008 },
    { lat: 22.2813209, lon: 114.1724231 },
    { lat: 22.2814116, lon: 114.1725065 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const GRAND_HYATT_HONG_KONG_RING = Object.freeze(
  GRAND_HYATT_HONG_KONG_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(GRAND_HYATT_HONG_KONG_RING);
export const GRAND_HYATT_HONG_KONG_BOUNDS = Object.freeze(flatRingBounds(GRAND_HYATT_HONG_KONG_RING));

let signedArea = 0;
for (let i = 0; i + 3 < GRAND_HYATT_HONG_KONG_RING.length; i += 2) {
  signedArea += GRAND_HYATT_HONG_KONG_RING[i] * GRAND_HYATT_HONG_KONG_RING[i + 3] -
    GRAND_HYATT_HONG_KONG_RING[i + 2] * GRAND_HYATT_HONG_KONG_RING[i + 1];
}
export const GRAND_HYATT_HONG_KONG_RING_AREA = Math.abs(signedArea * 0.5);

export const GRAND_HYATT_HONG_KONG_SITE = makeAuthoredSite('grand-hyatt-hong-kong', '香港君悅酒店', 'Grand Hyatt Hong Kong', GRAND_HYATT_HONG_KONG_OSM_SOURCE, {
  height: 129.0,
  levels: 36
});

export function grandHyattHongKongLocalToWorld(lx, lz) {
  const site = GRAND_HYATT_HONG_KONG_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function grandHyattHongKongWorldToLocal(wx, wz) {
  const site = GRAND_HYATT_HONG_KONG_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const GRAND_HYATT_HONG_KONG_LOCAL_RING = Object.freeze(
  GRAND_HYATT_HONG_KONG_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = grandHyattHongKongWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
