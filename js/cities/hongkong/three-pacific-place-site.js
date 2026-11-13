// 太古廣場三座（Three Pacific Place, 1 Queen's Road East, Admiralty, 2004）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 1 Queen's Road East, Admiralty, Hong Kong (香港金鐘皇后大道東1號).
// Completed: 2004.
// Height: 182.0m (40 storeys).
// Developer: Swire Properties (太古地產).
// Architect: Wong & Ouyang (HK) Ltd (王歐陽(香港)有限公司).
// OSM Way: 88391081.
// Key Architectural Highlights:
// - Prismatic chamfered parallelogram tower plan oriented along Queen's Road East.
// - Pale blue-green / silver reflective double-glazed Low-E curtain wall.
// - Horizontal aerodynamic silver sunshade louvres and vertical aluminium mullions.
// - 4-storey commercial podium with double-height entrance lobby and air-conditioned pedestrian tunnel connecting to MTR Admiralty Station & Pacific Place.
// - Open ground-floor vehicular building passage (Wing Fung Street West / drop-off underpass) with 5.1m vertical clearance.
// - Stepped mechanical plant crown with acoustic louvres and rooftop aviation warning beacons.

export const THREE_PACIFIC_PLACE_HERITAGE = Object.freeze({
  address: "香港金鐘皇后大道東1號 (1 Queen's Road East, Admiralty, Hong Kong)",
  district: '中西區金鐘 (Admiralty, Central and Western District)',
  completionYear: 2004,
  currentName: 'Three Pacific Place (太古廣場三座)',
  developer: 'Swire Properties (太古地產)',
  architect: 'Wong & Ouyang (HK) Ltd (王歐陽(香港)有限公司)',
  style: 'High-Tech Late Modernist Prismatic Glass Skyscraper (高科技晚期現代主義菱柱玻璃摩天大樓)',
  osmWay: 88391081,
  height: 182.0,
  storeys: 40
});

export const THREE_PACIFIC_PLACE_OSM_SOURCE = authoredOsmSource({
  id: 88391081,
  type: 'way',
  version: 12,
  tags: {
    building: 'office',
    'building:levels': '40',
    height: '182',
    layer: '1',
    name: '太古廣場三座 Three Pacific Place',
    'name:en': 'Three Pacific Place',
    'name:zh': '太古廣場三座',
    office: 'yes'
  },
  geometry: [
    { lat: 22.2770877, lon: 114.168295 },
    { lat: 22.277099, lon: 114.1682777 },
    { lat: 22.2771313, lon: 114.1683024 },
    { lat: 22.277239, lon: 114.1681377 },
    { lat: 22.2772171, lon: 114.168121 },
    { lat: 22.2772349, lon: 114.1680938 },
    { lat: 22.2772096, lon: 114.1680745 },
    { lat: 22.2772253, lon: 114.1680505 },
    { lat: 22.2771969, lon: 114.1680288 },
    { lat: 22.2772112, lon: 114.1680069 },
    { lat: 22.2771567, lon: 114.1679653 },
    { lat: 22.2768533, lon: 114.1677336 },
    { lat: 22.2768262, lon: 114.1677751 },
    { lat: 22.2767895, lon: 114.1677471 },
    { lat: 22.2767684, lon: 114.1677794 },
    { lat: 22.2767156, lon: 114.1678601 },
    { lat: 22.2766781, lon: 114.1679175 },
    { lat: 22.2767045, lon: 114.1679376 },
    { lat: 22.2766861, lon: 114.1679657 },
    { lat: 22.2767167, lon: 114.167989 },
    { lat: 22.2767, lon: 114.1680146 },
    { lat: 22.2767323, lon: 114.1680392 },
    { lat: 22.2767235, lon: 114.1680527 },
    { lat: 22.2770579, lon: 114.1683081 },
    { lat: 22.2770721, lon: 114.1683189 },
    { lat: 22.2770761, lon: 114.1683126 },
    { lat: 22.2770877, lon: 114.168295 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const THREE_PACIFIC_PLACE_RING = Object.freeze(
  THREE_PACIFIC_PLACE_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(THREE_PACIFIC_PLACE_RING);
export const THREE_PACIFIC_PLACE_BOUNDS = Object.freeze(flatRingBounds(THREE_PACIFIC_PLACE_RING));

let signedArea = 0;
for (let i = 0; i + 3 < THREE_PACIFIC_PLACE_RING.length; i += 2) {
  signedArea += THREE_PACIFIC_PLACE_RING[i] * THREE_PACIFIC_PLACE_RING[i + 3] -
    THREE_PACIFIC_PLACE_RING[i + 2] * THREE_PACIFIC_PLACE_RING[i + 1];
}
export const THREE_PACIFIC_PLACE_RING_AREA = Math.abs(signedArea * 0.5);

export const THREE_PACIFIC_PLACE_SITE = Object.freeze({
  name: '太古廣場三座 Three Pacific Place',
  englishName: 'Three Pacific Place',
  address: "金鐘皇后大道東1號 1 Queen's Road East",
  osmType: 'way',
  osmId: 88391081,
  source: THREE_PACIFIC_PLACE_OSM_SOURCE,
  ring: THREE_PACIFIC_PLACE_RING,
  bounds: THREE_PACIFIC_PLACE_BOUNDS,
  ...footprint,
  height: 182.0,
  storeys: 40,
  podiumHeight: 18.0,
  shaftHeight: 150.0,
  crownHeight: 14.0
});

export function threePacificPlaceLocalToWorld(lx, lz) {
  const site = THREE_PACIFIC_PLACE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function threePacificPlaceWorldToLocal(wx, wz) {
  const site = THREE_PACIFIC_PLACE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const THREE_PACIFIC_PLACE_LOCAL_RING = Object.freeze(
  THREE_PACIFIC_PLACE_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = threePacificPlaceWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
