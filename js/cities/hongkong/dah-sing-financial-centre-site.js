// 大新金融中心（Dah Sing Financial Centre, 108 Gloucester Road, Wan Chai, 1999）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { minimumAreaObb, pointInFlatRing, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 108 Gloucester Road, Wan Chai, Hong Kong (香港灣仔告士打道108號).
// Completed: 1999.
// Height: 150.0m (40 storeys).
// Developer: Dah Sing Bank (大新銀行).
// Architect: P&T Group (巴馬丹拿集團).
// OSM Way: 200283000.
// Key Architectural Highlights:
// - Slim vertical glass office tower with a narrow deep plan above a stone-and-glass podium.
// - Silver-blue reflective curtain wall with horizontal spandrel ribbons and vertical mullions.
// - Grand double-height lobby with cantilevered glass canopy on Gloucester Road.
// - Crown parapet with mechanical plant tier and rooftop aviation obstacle beacons.

export const DAH_SING_FINANCIAL_CENTRE_HERITAGE = Object.freeze({
  address: '香港灣仔告士打道108號 108 Gloucester Road, Wan Chai, Hong Kong',
  district: '灣仔 (Wan Chai)',
  completionYear: 1999,
  currentName: '大新金融中心 Dah Sing Financial Centre',
  developer: 'Dah Sing Bank (大新銀行)',
  architect: 'P&T Group (巴馬丹拿集團)',
  style: 'Late-Modernist Reflective Glass Office Skyscraper (晚期現代主義反光玻璃寫字樓摩天大樓)',
  osmWay: 200283000,
  height: 150.0,
  storeys: 40
});

export const DAH_SING_FINANCIAL_CENTRE_OSM_SOURCE = authoredOsmSource({
  id: 200283000,
  type: 'way',
  version: 1,
  tags: {
    building: 'office',
    'building:levels': '40',
    height: '150',
    'addr:street': "皇后大道東 Queen's Road East",
    name: '大新金融中心 Dah Sing Financial Centre',
    'name:en': 'Dah Sing Financial Centre',
    'name:zh': '大新金融中心'
  },
  geometry: [
    { lat: 22.2749452, lon: 114.1734089 },
    { lat: 22.274535, lon: 114.1734556 },
    { lat: 22.2745522, lon: 114.1736321 },
    { lat: 22.2747185, lon: 114.1736132 },
    { lat: 22.274723, lon: 114.173659 },
    { lat: 22.2749668, lon: 114.1736313 },
    { lat: 22.2749452, lon: 114.1734089 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const DAH_SING_FINANCIAL_CENTRE_RING = Object.freeze(
  DAH_SING_FINANCIAL_CENTRE_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(DAH_SING_FINANCIAL_CENTRE_RING);
export const DAH_SING_FINANCIAL_CENTRE_BOUNDS = Object.freeze(flatRingBounds(DAH_SING_FINANCIAL_CENTRE_RING));

let signedArea = 0;
for (let i = 0; i + 3 < DAH_SING_FINANCIAL_CENTRE_RING.length; i += 2) {
  signedArea += DAH_SING_FINANCIAL_CENTRE_RING[i] * DAH_SING_FINANCIAL_CENTRE_RING[i + 3] -
    DAH_SING_FINANCIAL_CENTRE_RING[i + 2] * DAH_SING_FINANCIAL_CENTRE_RING[i + 1];
}
export const DAH_SING_FINANCIAL_CENTRE_RING_AREA = Math.abs(signedArea * 0.5);

export const DAH_SING_FINANCIAL_CENTRE_SITE = makeAuthoredSite('dah-sing-financial-centre', '大新金融中心', 'Dah Sing Financial Centre', DAH_SING_FINANCIAL_CENTRE_OSM_SOURCE, {
  height: 150.0,
  levels: 40
});

export function dahSingLocalToWorld(lx, lz) {
  const site = DAH_SING_FINANCIAL_CENTRE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function dahSingWorldToLocal(wx, wz) {
  const site = DAH_SING_FINANCIAL_CENTRE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}
