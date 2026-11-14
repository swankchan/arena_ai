// 香港JW萬豪酒店（JW Marriott Hotel Hong Kong, 8 Pacific Place, Admiralty, 1989/2013）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { minimumAreaObb, pointInFlatRing, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 8 Pacific Place, Queen's Road East, Admiralty, Hong Kong (香港金鐘太古廣場8號).
// Completed: 1989 (as the Marriott Hotel Hong Kong); comprehensively refurbished and rebranded
// as the JW Marriott Hotel Hong Kong in 2013.
// Height: 164.0m (51 storeys).
// Developer: Swire Properties (太古地產).
// Architect: P&T Group (巴馬丹拿集團).
// OSM Way: 41499014.
// Key Architectural Highlights:
// - Square-plan, 51-storey full-height glass hotel tower above a 4-storey stone and glass podium.
// - Sleek silver-blue reflective curtain wall with horizontal sunshade louvres and vertical mullions.
// - Grand double-height lobby with cantilevered glass entrance canopy on Queen's Road East.
// - Rooftop mechanical plant tier, parapet crown and aviation obstacle beacons.

export const JW_MARRIOTT_HERITAGE = Object.freeze({
  address: "香港金鐘太古廣場8號 8 Pacific Place, Queen's Road East, Admiralty, Hong Kong",
  district: '中西區金鐘 (Admiralty, Central and Western District)',
  completionYear: 1989,
  refurbishmentYear: 2013,
  currentName: '香港JW萬豪酒店 JW Marriott Hotel Hong Kong',
  developer: 'Swire Properties (太古地產)',
  architect: 'P&T Group (巴馬丹拿集團)',
  style: 'Late-Modernist Reflective Glass Hotel Skyscraper (晚期現代主義反光玻璃酒店摩天大樓)',
  osmWay: 41499014,
  height: 164.0,
  storeys: 51
});

export const JW_MARRIOTT_OSM_SOURCE = authoredOsmSource({
  id: 41499014,
  type: 'way',
  version: 1,
  tags: {
    building: 'hotel',
    'building:levels': '51',
    height: '164',
    name: '香港JW萬豪酒店 JW Marriott Hotel Hong Kong',
    'name:en': 'JW Marriott Hotel Hong Kong',
    'name:zh': '香港JW萬豪酒店'
  },
  geometry: [
    { lat: 22.2776948, lon: 114.166248 },
    { lat: 22.2776606, lon: 114.1662762 },
    { lat: 22.2776761, lon: 114.1662982 },
    { lat: 22.2776551, lon: 114.1663155 },
    { lat: 22.2776714, lon: 114.1663386 },
    { lat: 22.2776495, lon: 114.1663567 },
    { lat: 22.2776648, lon: 114.1663782 },
    { lat: 22.2776437, lon: 114.1663956 },
    { lat: 22.2776594, lon: 114.1664178 },
    { lat: 22.2776369, lon: 114.1664365 },
    { lat: 22.2776613, lon: 114.166471 },
    { lat: 22.2775804, lon: 114.1665378 },
    { lat: 22.2775552, lon: 114.1665022 },
    { lat: 22.2775323, lon: 114.1665211 },
    { lat: 22.2775172, lon: 114.1664997 },
    { lat: 22.2774955, lon: 114.1665176 },
    { lat: 22.2774803, lon: 114.1664961 },
    { lat: 22.2774592, lon: 114.1665135 },
    { lat: 22.277443, lon: 114.1664906 },
    { lat: 22.2774213, lon: 114.1665085 },
    { lat: 22.2774055, lon: 114.1664862 },
    { lat: 22.2773702, lon: 114.1665153 },
    { lat: 22.2773113, lon: 114.166432 },
    { lat: 22.2773466, lon: 114.1664028 },
    { lat: 22.2773276, lon: 114.166376 },
    { lat: 22.2773494, lon: 114.1663581 },
    { lat: 22.2773325, lon: 114.1663343 },
    { lat: 22.2773531, lon: 114.1663173 },
    { lat: 22.2773363, lon: 114.1662937 },
    { lat: 22.2773579, lon: 114.1662759 },
    { lat: 22.277342, lon: 114.1662536 },
    { lat: 22.2773648, lon: 114.1662347 },
    { lat: 22.2773358, lon: 114.1661936 },
    { lat: 22.2774176, lon: 114.166126 },
    { lat: 22.277447, lon: 114.1661676 },
    { lat: 22.2774691, lon: 114.1661494 },
    { lat: 22.2774857, lon: 114.1661729 },
    { lat: 22.2775061, lon: 114.166156 },
    { lat: 22.2775232, lon: 114.1661801 },
    { lat: 22.2775449, lon: 114.1661622 },
    { lat: 22.2775615, lon: 114.1661856 },
    { lat: 22.2775833, lon: 114.1661676 },
    { lat: 22.2776029, lon: 114.1661954 },
    { lat: 22.2776375, lon: 114.1661669 },
    { lat: 22.2776948, lon: 114.166248 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const JW_MARRIOTT_RING = Object.freeze(
  JW_MARRIOTT_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(JW_MARRIOTT_RING);
export const JW_MARRIOTT_BOUNDS = Object.freeze(flatRingBounds(JW_MARRIOTT_RING));

let signedArea = 0;
for (let i = 0; i + 3 < JW_MARRIOTT_RING.length; i += 2) {
  signedArea += JW_MARRIOTT_RING[i] * JW_MARRIOTT_RING[i + 3] -
    JW_MARRIOTT_RING[i + 2] * JW_MARRIOTT_RING[i + 1];
}
export const JW_MARRIOTT_RING_AREA = Math.abs(signedArea * 0.5);

export const JW_MARRIOTT_SITE = makeAuthoredSite('jw-marriott', '香港JW萬豪酒店', 'JW Marriott Hotel Hong Kong', JW_MARRIOTT_OSM_SOURCE, {
  height: 164.0,
  levels: 51
});

export function jwMarriottLocalToWorld(lx, lz) {
  const site = JW_MARRIOTT_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function jwMarriottWorldToLocal(wx, wz) {
  const site = JW_MARRIOTT_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}
