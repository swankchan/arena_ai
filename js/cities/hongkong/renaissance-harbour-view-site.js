// 萬麗海景酒店（Renaissance Hong Kong Harbour View Hotel, 101-109 Harbour Road, Wan Chai, 1989）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { minimumAreaObb, pointInFlatRing, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 101-109 Harbour Road, Wan Chai, Hong Kong (香港灣仔港灣道101-109號).
// Completed: 1989 (as the Harbour View Hotel; rebranded Renaissance Hong Kong Harbour View Hotel).
// Height: 150.0m (42 storeys).
// Developer: Cheung Kong (Holdings) (長江實業).
// Architect: P&T Group (巴馬丹拿集團).
// OSM Way: 107497707.
// Key Architectural Highlights:
// - Long rectangular hotel tower above a broad stone-and-glass podium overlooking Victoria Harbour.
// - Silver-blue reflective curtain wall with horizontal spandrel ribbons and vertical mullions.
// - Grand double-height lobby with cantilevered glass canopy on Harbour Road.
// - Crown parapet with mechanical plant tier and rooftop aviation obstacle beacons.

export const RENAISSANCE_HARBOUR_VIEW_HERITAGE = Object.freeze({
  address: '香港灣仔港灣道101-109號 101-109 Harbour Road, Wan Chai, Hong Kong',
  district: '灣仔 (Wan Chai)',
  completionYear: 1989,
  currentName: '萬麗海景酒店 Renaissance Hong Kong Harbour View Hotel',
  developer: 'Cheung Kong (Holdings) (長江實業)',
  architect: 'P&T Group (巴馬丹拿集團)',
  style: 'Late-Modernist Reflective Glass Hotel Skyscraper (晚期現代主義反光玻璃酒店摩天大樓)',
  osmWay: 107497707,
  height: 150.0,
  storeys: 42
});

export const RENAISSANCE_HARBOUR_VIEW_OSM_SOURCE = authoredOsmSource({
  id: 107497707,
  type: 'way',
  version: 5,
  tags: {
    building: 'hotel',
    'building:levels': '42',
    height: '150',
    name: '萬麗海景酒店 Renaissance Hong Kong Harbour View Hotel',
    'name:en': 'Renaissance Hong Kong Harbour View Hotel',
    'name:zh': '萬麗海景酒店'
  },
  geometry: [
    { lat: 22.2815586, lon: 114.1732883 },
    { lat: 22.2814901, lon: 114.1732936 },
    { lat: 22.2814106, lon: 114.1733911 },
    { lat: 22.2814185, lon: 114.1735091 },
    { lat: 22.2814264, lon: 114.1736271 },
    { lat: 22.2813044, lon: 114.1737724 },
    { lat: 22.2812026, lon: 114.1737832 },
    { lat: 22.2812102, lon: 114.1738621 },
    { lat: 22.2812178, lon: 114.173941 },
    { lat: 22.2812746, lon: 114.1739364 },
    { lat: 22.281366, lon: 114.1739289 },
    { lat: 22.2815111, lon: 114.1737427 },
    { lat: 22.281584, lon: 114.1736519 },
    { lat: 22.2815822, lon: 114.1736255 },
    { lat: 22.2815745, lon: 114.1735164 },
    { lat: 22.2815586, lon: 114.1732883 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const RENAISSANCE_HARBOUR_VIEW_RING = Object.freeze(
  RENAISSANCE_HARBOUR_VIEW_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(RENAISSANCE_HARBOUR_VIEW_RING);
export const RENAISSANCE_HARBOUR_VIEW_BOUNDS = Object.freeze(flatRingBounds(RENAISSANCE_HARBOUR_VIEW_RING));

let signedArea = 0;
for (let i = 0; i + 3 < RENAISSANCE_HARBOUR_VIEW_RING.length; i += 2) {
  signedArea += RENAISSANCE_HARBOUR_VIEW_RING[i] * RENAISSANCE_HARBOUR_VIEW_RING[i + 3] -
    RENAISSANCE_HARBOUR_VIEW_RING[i + 2] * RENAISSANCE_HARBOUR_VIEW_RING[i + 1];
}
export const RENAISSANCE_HARBOUR_VIEW_RING_AREA = Math.abs(signedArea * 0.5);

export const RENAISSANCE_HARBOUR_VIEW_SITE = makeAuthoredSite('renaissance-harbour-view', '萬麗海景酒店', 'Renaissance Hong Kong Harbour View Hotel', RENAISSANCE_HARBOUR_VIEW_OSM_SOURCE, {
  height: 150.0,
  levels: 42
});

export function renaissanceHarbourViewLocalToWorld(lx, lz) {
  const site = RENAISSANCE_HARBOUR_VIEW_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function renaissanceHarbourViewWorldToLocal(wx, wz) {
  const site = RENAISSANCE_HARBOUR_VIEW_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}
