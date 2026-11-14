// 太古廣場一座（One Pacific Place, 1 Pacific Place, Queen's Road East, Admiralty, 2004）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { minimumAreaObb, pointInFlatRing, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 1 Pacific Place, Queen's Road East, Admiralty, Hong Kong (香港金鐘皇后大道東1號太古廣場一座).
// Completed: 2004.
// Height: 161.0m (41 storeys).
// Developer: Swire Properties (太古地產).
// Architect: Wong & Ouyang (HK) Ltd (王歐陽(香港)有限公司).
// OSM Way: 41498860.
// Key Architectural Highlights:
// - Sculpted parallelogram-plan Grade-A office tower aligned along Queen's Road East.
// - Deep-set vertical glass curtain wall with silver spandrel ribbons and projecting sunshade fins.
// - Four-storey stone-clad podium with double-height lobby and covered pedestrian arcade.
// - Rooftop parapet crown with mechanical plant enclosure and aviation obstacle beacons.

export const ONE_PACIFIC_PLACE_HERITAGE = Object.freeze({
  address: "香港金鐘皇后大道東1號太古廣場一座 1 Pacific Place, Queen's Road East, Admiralty, Hong Kong",
  district: '中西區金鐘 (Admiralty, Central and Western District)',
  completionYear: 2004,
  currentName: '太古廣場一座 One Pacific Place',
  developer: 'Swire Properties (太古地產)',
  architect: 'Wong & Ouyang (HK) Ltd (王歐陽(香港)有限公司)',
  style: 'Late-Modernist Glass Office Skyscraper (晚期現代主義玻璃寫字樓摩天大樓)',
  osmWay: 41498860,
  height: 161.0,
  storeys: 41
});

export const ONE_PACIFIC_PLACE_OSM_SOURCE = authoredOsmSource({
  id: 41498860,
  type: 'way',
  version: 2,
  tags: {
    building: 'office',
    'building:levels': '41',
    height: '161',
    name: '太古廣場一座 One Pacific Place',
    'name:en': 'One Pacific Place',
    'name:zh': '太古廣場一座'
  },
  geometry: [
    { lat: 22.2779052, lon: 114.165204 },
    { lat: 22.2778774, lon: 114.1652014 },
    { lat: 22.27788, lon: 114.165169 },
    { lat: 22.277838, lon: 114.165165 },
    { lat: 22.2778405, lon: 114.1651341 },
    { lat: 22.2777994, lon: 114.1651302 },
    { lat: 22.2778017, lon: 114.1651024 },
    { lat: 22.2776903, lon: 114.1650919 },
    { lat: 22.2776875, lon: 114.1651261 },
    { lat: 22.2776505, lon: 114.1651226 },
    { lat: 22.2776483, lon: 114.1651506 },
    { lat: 22.277607, lon: 114.1651467 },
    { lat: 22.2776049, lon: 114.1651719 },
    { lat: 22.2775679, lon: 114.1651684 },
    { lat: 22.2775263, lon: 114.1656686 },
    { lat: 22.2775642, lon: 114.1656722 },
    { lat: 22.2775632, lon: 114.1656989 },
    { lat: 22.2776075, lon: 114.1657049 },
    { lat: 22.2776045, lon: 114.1657318 },
    { lat: 22.2776465, lon: 114.1657346 },
    { lat: 22.2776427, lon: 114.1657601 },
    { lat: 22.2777494, lon: 114.1657709 },
    { lat: 22.2777508, lon: 114.1657442 },
    { lat: 22.2777902, lon: 114.1657471 },
    { lat: 22.2777923, lon: 114.1657187 },
    { lat: 22.2778265, lon: 114.1657211 },
    { lat: 22.2778271, lon: 114.1656951 },
    { lat: 22.2778645, lon: 114.1656981 },
    { lat: 22.2779052, lon: 114.165204 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const ONE_PACIFIC_PLACE_RING = Object.freeze(
  ONE_PACIFIC_PLACE_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(ONE_PACIFIC_PLACE_RING);
export const ONE_PACIFIC_PLACE_BOUNDS = Object.freeze(flatRingBounds(ONE_PACIFIC_PLACE_RING));

let signedArea = 0;
for (let i = 0; i + 3 < ONE_PACIFIC_PLACE_RING.length; i += 2) {
  signedArea += ONE_PACIFIC_PLACE_RING[i] * ONE_PACIFIC_PLACE_RING[i + 3] -
    ONE_PACIFIC_PLACE_RING[i + 2] * ONE_PACIFIC_PLACE_RING[i + 1];
}
export const ONE_PACIFIC_PLACE_RING_AREA = Math.abs(signedArea * 0.5);

export const ONE_PACIFIC_PLACE_SITE = makeAuthoredSite('one-pacific-place', '太古廣場一座', 'One Pacific Place', ONE_PACIFIC_PLACE_OSM_SOURCE, {
  height: 161.0,
  levels: 41
});

export function onePacificPlaceLocalToWorld(lx, lz) {
  const site = ONE_PACIFIC_PLACE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function onePacificPlaceWorldToLocal(wx, wz) {
  const site = ONE_PACIFIC_PLACE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}
