// 會展廣場辦公大樓（Convention Plaza Office Tower, 1 Harbour Road, Wan Chai, 1989）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 1 Harbour Road, Wan Chai, Hong Kong (香港灣仔港灣道1號).
// Completed: 1989 (Hong Kong Convention and Exhibition Centre Phase 1).
// Height: 181.0m (51 storeys), roof crown 181m.
// Developers: New World Development & HKTDC (新世界發展與香港貿易發展局).
// Architects: Ng Chun Man & Associates (伍振民建築師事務所).
// OSM Way: 107497689.
// Key Architectural Highlights:
// - Triangular/trapezoidal plan oriented towards Victoria Harbour above the HKCEC Phase 1 podium.
// - Champagne-gold / warm bronze reflective curtain wall with anodized champagne spandrel panels.
// - 8-storey Convention Plaza podium integrating exhibition facilities, bus terminus, and skybridges to Central Plaza and Harbour Centre.
// - 43 office storeys with sweeping panoramic views of Victoria Harbour and Kowloon.
// - Rooftop mechanical penthouse crown with acoustic louvres and aviation warning beacons.

export const CONVENTION_PLAZA_OFFICE_HERITAGE = Object.freeze({
  address: '香港灣仔港灣道1號 (1 Harbour Road, Wan Chai, Hong Kong)',
  district: '灣仔區灣仔北 (Wan Chai North, Wan Chai District)',
  completionYear: 1989,
  currentName: 'Convention Plaza Office Tower (會展廣場辦公大樓)',
  developers: 'New World Development & HKTDC (新世界發展與香港貿發局)',
  architect: 'Ng Chun Man & Associates (伍振民建築師事務所)',
  style: 'Late Modernist Champagne-Gold Skyscraper (晚期現代主義香檳金玻璃摩天大樓)',
  osmWay: 107497689,
  height: 181.0,
  storeys: 51
});

export const CONVENTION_PLAZA_OFFICE_OSM_SOURCE = authoredOsmSource({
  id: 107497689,
  type: 'way',
  version: 8,
  tags: {
    building: 'office',
    'building:levels': '51',
    'building:material': 'glass',
    'building:min_level': '10',
    height: '181',
    location: 'podium',
    'addr:street': '港灣道 Harbour Road',
    'addr:housenumber': '1',
    name: '會展廣場辦公大樓 Convention Plaza Office Tower',
    'name:en': 'Convention Plaza Office Tower',
    'name:zh': '會展廣場辦公大樓'
  },
  geometry: [
    { lon: 114.1737832, lat: 22.2812026 },
    { lon: 114.173784, lat: 22.2811883 },
    { lon: 114.1735616, lat: 22.2809585 },
    { lon: 114.1735866, lat: 22.2807313 },
    { lon: 114.1737293, lat: 22.2807411 },
    { lon: 114.17382, lat: 22.2807473 },
    { lon: 114.1739665, lat: 22.280908 },
    { lon: 114.173961, lat: 22.2809754 },
    { lon: 114.173941, lat: 22.2812178 },
    { lon: 114.1738621, lat: 22.2812102 },
    { lon: 114.1737832, lat: 22.2812026 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const CONVENTION_PLAZA_OFFICE_RING = Object.freeze(
  CONVENTION_PLAZA_OFFICE_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(CONVENTION_PLAZA_OFFICE_RING);
export const CONVENTION_PLAZA_OFFICE_BOUNDS = Object.freeze(flatRingBounds(CONVENTION_PLAZA_OFFICE_RING));

let signedArea = 0;
for (let i = 0; i + 3 < CONVENTION_PLAZA_OFFICE_RING.length; i += 2) {
  signedArea += CONVENTION_PLAZA_OFFICE_RING[i] * CONVENTION_PLAZA_OFFICE_RING[i + 3] -
    CONVENTION_PLAZA_OFFICE_RING[i + 2] * CONVENTION_PLAZA_OFFICE_RING[i + 1];
}
export const CONVENTION_PLAZA_OFFICE_RING_AREA = Math.abs(signedArea * 0.5);

export const CONVENTION_PLAZA_OFFICE_SITE = Object.freeze({
  name: '會展廣場辦公大樓 Convention Plaza Office Tower',
  englishName: 'Convention Plaza Office Tower',
  address: '灣仔港灣道1號 1 Harbour Road',
  osmType: 'way',
  osmId: 107497689,
  source: CONVENTION_PLAZA_OFFICE_OSM_SOURCE,
  ring: CONVENTION_PLAZA_OFFICE_RING,
  bounds: CONVENTION_PLAZA_OFFICE_BOUNDS,
  ...footprint,
  height: 181.0,
  storeys: 51,
  podiumHeight: 28.0, // HKCEC Phase 1 integrated commercial podium deck
  shaftHeight: 139.0,
  crownHeight: 14.0
});

export function conventionPlazaOfficeLocalToWorld(lx, lz) {
  const site = CONVENTION_PLAZA_OFFICE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function conventionPlazaOfficeWorldToLocal(wx, wz) {
  const site = CONVENTION_PLAZA_OFFICE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const CONVENTION_PLAZA_OFFICE_LOCAL_RING = Object.freeze(
  CONVENTION_PLAZA_OFFICE_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = conventionPlazaOfficeWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
