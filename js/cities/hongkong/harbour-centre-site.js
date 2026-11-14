// 海港中心（Harbour Centre, 25 Harbour Road, Wan Chai, 1977）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { minimumAreaObb, pointInFlatRing, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 25 Harbour Road, Wan Chai, Hong Kong (香港灣仔港灣道25號).
// Completed: 1977.
// Height: 146.0m (35 storeys).
// Developer: Sun Hung Kai & Co. (新鴻基地產).
// Architect: P&T Group (巴馬丹拿集團).
// OSM Relation: 18183384.
// Key Architectural Highlights:
// - Slender vertical glass office tower above a broad stone-and-glass podium.
// - Silver-blue reflective curtain wall with horizontal spandrel ribbons and vertical mullions.
// - Grand double-height lobby with cantilevered glass canopy on Harbour Road.
// - Crown parapet with mechanical plant tier and rooftop aviation obstacle beacons.

export const HARBOUR_CENTRE_HERITAGE = Object.freeze({
  address: '香港灣仔港灣道25號 25 Harbour Road, Wan Chai, Hong Kong',
  district: '灣仔 (Wan Chai)',
  completionYear: 1977,
  currentName: '海港中心 Harbour Centre',
  developer: 'Sun Hung Kai & Co. (新鴻基地產)',
  architect: 'P&T Group (巴馬丹拿集團)',
  style: 'Late-Modernist Reflective Glass Office Skyscraper (晚期現代主義反光玻璃寫字樓摩天大樓)',
  osmRelation: 18183384,
  height: 146.0,
  storeys: 35
});

export const HARBOUR_CENTRE_OSM_SOURCE = authoredOsmSource({
  id: 18183384,
  type: 'relation',
  version: 3,
  tags: {
    building: 'office',
    'building:levels': '35',
    height: '146',
    'building:colour': '#303030',
    'building:material': 'glass',
    'addr:housenumber': '25',
    'addr:street': '港灣道 Harbour Road',
    name: '海港中心 Harbour Centre',
    'name:en': 'Harbour Centre',
    'name:zh': '海港中心'
  },
  geometry: [
    { lat: 22.281215, lon: 114.1753659 },
    { lat: 22.281206, lon: 114.1753667 },
    { lat: 22.2811971, lon: 114.1753675 },
    { lat: 22.2811117, lon: 114.1753751 },
    { lat: 22.2811027, lon: 114.1753759 },
    { lat: 22.2810218, lon: 114.1753831 },
    { lat: 22.2810129, lon: 114.1753839 },
    { lat: 22.2809275, lon: 114.1753916 },
    { lat: 22.2809185, lon: 114.1753924 },
    { lat: 22.2809096, lon: 114.1753932 },
    { lat: 22.2809103, lon: 114.1754029 },
    { lat: 22.280911, lon: 114.1754125 },
    { lat: 22.2809182, lon: 114.1755056 },
    { lat: 22.2809189, lon: 114.1755153 },
    { lat: 22.2809257, lon: 114.1756036 },
    { lat: 22.2809264, lon: 114.1756132 },
    { lat: 22.2809332, lon: 114.1757015 },
    { lat: 22.2809339, lon: 114.1757112 },
    { lat: 22.2809411, lon: 114.1758042 },
    { lat: 22.2809418, lon: 114.1758139 },
    { lat: 22.2809425, lon: 114.1758236 },
    { lat: 22.2809515, lon: 114.1758228 },
    { lat: 22.2809604, lon: 114.175822 },
    { lat: 22.2810458, lon: 114.1758143 },
    { lat: 22.2810548, lon: 114.1758135 },
    { lat: 22.2811357, lon: 114.1758063 },
    { lat: 22.2811447, lon: 114.1758055 },
    { lat: 22.28123, lon: 114.1757979 },
    { lat: 22.281239, lon: 114.1757971 },
    { lat: 22.281248, lon: 114.1757963 },
    { lat: 22.2812472, lon: 114.1757866 },
    { lat: 22.2812465, lon: 114.1757769 },
    { lat: 22.2812393, lon: 114.1756838 },
    { lat: 22.2812386, lon: 114.1756742 },
    { lat: 22.2812318, lon: 114.1755859 },
    { lat: 22.2812311, lon: 114.1755762 },
    { lat: 22.2812243, lon: 114.175488 },
    { lat: 22.2812236, lon: 114.1754783 },
    { lat: 22.2812165, lon: 114.1753852 },
    { lat: 22.2812157, lon: 114.1753755 },
    { lat: 22.281215, lon: 114.1753659 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const HARBOUR_CENTRE_RING = Object.freeze(
  HARBOUR_CENTRE_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(HARBOUR_CENTRE_RING);
export const HARBOUR_CENTRE_BOUNDS = Object.freeze(flatRingBounds(HARBOUR_CENTRE_RING));

let signedArea = 0;
for (let i = 0; i + 3 < HARBOUR_CENTRE_RING.length; i += 2) {
  signedArea += HARBOUR_CENTRE_RING[i] * HARBOUR_CENTRE_RING[i + 3] -
    HARBOUR_CENTRE_RING[i + 2] * HARBOUR_CENTRE_RING[i + 1];
}
export const HARBOUR_CENTRE_RING_AREA = Math.abs(signedArea * 0.5);

export const HARBOUR_CENTRE_SITE = makeAuthoredSite('harbour-centre', '海港中心', 'Harbour Centre', HARBOUR_CENTRE_OSM_SOURCE, {
  height: 146.0,
  levels: 35
});

export function harbourCentreLocalToWorld(lx, lz) {
  const site = HARBOUR_CENTRE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function harbourCentreWorldToLocal(wx, wz) {
  const site = HARBOUR_CENTRE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}
