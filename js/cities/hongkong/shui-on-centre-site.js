// 瑞安中心 Shui On Centre, 6-8 Harbour Road, 灣仔.
// 118-metre office tower.
// OSM Way: 241998997 (118m, 36 levels).
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 6-8 Harbour Road, 灣仔, Hong Kong.
// Height: 118.0m (36 levels).
// OSM Way: 241998997.
// Key Architectural Highlights:
// - Rectangular office tower with glass curtain wall.
// - Office building fronting Harbour Road in Wan Chai.
//
// NOTE: geometry below is extracted from OSM way 241998997.

export const SHUI_ON_CENTRE_HERITAGE = Object.freeze({
  address: '香港灣仔港灣道6至8號 (6-8 Harbour Road, Wan Chai, Hong Kong)',
  district: '灣仔區灣仔 (Wan Chai, Wan Chai District)',
  completionYear: 1982,
  currentName: 'Shui On Centre (瑞安中心)',
  architect: null,
  developer: null,
  style: 'Modernist Office Tower (現代主義辦公大廈)',
  osmWay: 241998997,
  height: 118.0,
  storeys: 36
});

export const SHUI_ON_CENTRE_OSM_SOURCE = authoredOsmSource({
  id: 241998997,
  type: 'way',
  version: null,
  tags: {
    building: 'office',
    'building:colour': '#6090b0',
    'building:levels': '36',
    height: '118',
    'building:material': 'glass',
    'addr:housenumber': '6-8',
    'addr:street': '港灣道 Harbour Road',
    'addr:street:en': 'Harbour Road',
    'addr:street:zh': '港灣道',
    name: '瑞安中心 Shui On Centre',
    'name:en': 'Shui On Centre',
    'name:zh': '瑞安中心'
  },
  geometry: [
    { lon: 114.1713033, lat: 22.2803121 },
    { lon: 114.1711997, lat: 22.2802966 },
    { lon: 114.1711911, lat: 22.2801627 },
    { lon: 114.1712943, lat: 22.2801784 },
    { lon: 114.1713033, lat: 22.2803121 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const SHUI_ON_CENTRE_RING = Object.freeze(
  SHUI_ON_CENTRE_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(SHUI_ON_CENTRE_RING);
export const SHUI_ON_CENTRE_BOUNDS = Object.freeze(flatRingBounds(SHUI_ON_CENTRE_RING));

let signedArea = 0;
for (let i = 0; i + 3 < SHUI_ON_CENTRE_RING.length; i += 2) {
  signedArea += SHUI_ON_CENTRE_RING[i] * SHUI_ON_CENTRE_RING[i + 3] -
    SHUI_ON_CENTRE_RING[i + 2] * SHUI_ON_CENTRE_RING[i + 1];
}
export const SHUI_ON_CENTRE_RING_AREA = Math.abs(signedArea * 0.5);

export const SHUI_ON_CENTRE_SITE = Object.freeze({
  ...makeAuthoredSite('shuiOnCentre', '瑞安中心', 'Shui On Centre', SHUI_ON_CENTRE_OSM_SOURCE, {
    height: 118.0,
    levels: 36
  }),
  podiumHeight: null,
  shaftHeight: null,
  crownHeight: null
});

export function shuiOnCentreLocalToWorld(lx, lz) {
  const site = SHUI_ON_CENTRE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function shuiOnCentreWorldToLocal(wx, wz) {
  const site = SHUI_ON_CENTRE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const SHUI_ON_CENTRE_LOCAL_RING = Object.freeze(
  SHUI_ON_CENTRE_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = shuiOnCentreWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
