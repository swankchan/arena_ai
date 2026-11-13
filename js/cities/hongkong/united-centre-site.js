// 統一中心（United Centre, 95 Queensway, Admiralty, 1981）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 95 Queensway, Admiralty, Hong Kong (香港金鐘金鐘道95號).
// Completed: 1981.
// Architects: Wong & Ouyang (HK) Ltd (王歐陽(香港)有限公司).
// Developers: Cheung Kong (Holdings), Wheelock Marden, MTR Corporation.
// Height: 140.0m (37 storeys), roof crown 140m.
// OSM Way: 107336258.
// Key Architectural Highlights:
// - International Modernist cubic tower with Hong Kong's largest column-free commercial floorplate of its era (~20,400 sq ft).
// - Pristine pale ivory/off-white ceramic mosaic tiled spandrels with continuous dark bronze ribbon glazing.
// - 6-storey commercial podium integrating retail shopping, the Admiralty East bus interchange, and MTR Admiralty Station Exit D.
// - Major elevated skybridge junction linking Queensway Government Offices, Pacific Place, and Admiralty Centre.
// - Stepped mechanical penthouse crown with acoustic louvres and aviation warning beacons.

export const UNITED_CENTRE_HERITAGE = Object.freeze({
  address: '香港金鐘金鐘道95號 (95 Queensway, Admiralty, Hong Kong)',
  district: '中西區金鐘 (Admiralty, Central and Western District)',
  completionYear: 1981,
  currentName: 'United Centre (統一中心)',
  architect: 'Wong & Ouyang (HK) Ltd (王歐陽)',
  developers: 'Cheung Kong, Wheelock Marden & MTR Corp (長實、會德豐及地鐵公司)',
  style: 'International Modernist Ribbon-Window Commercial Skyscraper (國際現代主義帶狀窗商業摩天大樓)',
  osmWay: 107336258,
  height: 140.0,
  storeys: 37
});

export const UNITED_CENTRE_OSM_SOURCE = authoredOsmSource({
  id: 107336258,
  type: 'way',
  version: 8,
  tags: {
    building: 'office',
    'building:levels': '37',
    'building:material': 'glass',
    height: '140',
    layer: '2',
    'addr:street': '金鐘道 Queensway',
    'addr:housenumber': '95',
    name: '統一中心 United Centre',
    'name:en': 'United Centre',
    'name:zh': '統一中心'
  },
  geometry: [
    { lon: 114.1650903, lat: 22.2787603 },
    { lon: 114.1650937, lat: 22.2787852 },
    { lon: 114.1654484, lat: 22.2787345 },
    { lon: 114.1654459, lat: 22.2787128 },
    { lon: 114.1654687, lat: 22.2787102 },
    { lon: 114.1654151, lat: 22.2783648 },
    { lon: 114.1653912, lat: 22.2783677 },
    { lon: 114.1653878, lat: 22.2783446 },
    { lon: 114.1651328, lat: 22.2783801 },
    { lon: 114.1650277, lat: 22.2783947 },
    { lon: 114.1650324, lat: 22.2784184 },
    { lon: 114.1650059, lat: 22.2784227 },
    { lon: 114.165065, lat: 22.2787633 },
    { lon: 114.1650903, lat: 22.2787603 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const UNITED_CENTRE_RING = Object.freeze(
  UNITED_CENTRE_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(UNITED_CENTRE_RING);
export const UNITED_CENTRE_BOUNDS = Object.freeze(flatRingBounds(UNITED_CENTRE_RING));

let signedArea = 0;
for (let i = 0; i + 3 < UNITED_CENTRE_RING.length; i += 2) {
  signedArea += UNITED_CENTRE_RING[i] * UNITED_CENTRE_RING[i + 3] -
    UNITED_CENTRE_RING[i + 2] * UNITED_CENTRE_RING[i + 1];
}
export const UNITED_CENTRE_RING_AREA = Math.abs(signedArea * 0.5);

export const UNITED_CENTRE_SITE = Object.freeze({
  name: '統一中心 United Centre',
  englishName: 'United Centre',
  address: '金鐘金鐘道95號 95 Queensway',
  osmType: 'way',
  osmId: 107336258,
  source: UNITED_CENTRE_OSM_SOURCE,
  ring: UNITED_CENTRE_RING,
  bounds: UNITED_CENTRE_BOUNDS,
  ...footprint,
  height: 140.0,
  storeys: 37,
  podiumHeight: 22.0,
  shaftHeight: 106.0,
  crownHeight: 12.0
});

export function unitedCentreLocalToWorld(lx, lz) {
  const site = UNITED_CENTRE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function unitedCentreWorldToLocal(wx, wz) {
  const site = UNITED_CENTRE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const UNITED_CENTRE_LOCAL_RING = Object.freeze(
  UNITED_CENTRE_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = unitedCentreWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
