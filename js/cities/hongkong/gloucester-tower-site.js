// 告羅士打大廈（Gloucester Tower, 1-3 Gloucester Road, Central, 1987）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { minimumAreaObb, pointInFlatRing, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 1-3 Gloucester Road, Central, Hong Kong (香港中環告士打道1-3號).
// Completed: 1987.
// Height: 159.0m (47 storeys).
// Developer: Hongkong Land (香港置地).
// Architect: P&T Group (巴馬丹拿集團).
// OSM Way: 107302745.
// Key Architectural Highlights:
// - Square-plan, 47-storey glass office tower with chamfered corners.
// - Silver-blue reflective curtain wall with horizontal spandrel ribbons and vertical mullions.
// - Monumental stone and glass podium with cantilevered lobby canopy on Gloucester Road.
// - Crown parapet with mechanical plant tier and rooftop aviation obstacle beacons.

export const GLOUCESTER_TOWER_HERITAGE = Object.freeze({
  address: '香港中環告士打道1-3號 1-3 Gloucester Road, Central, Hong Kong',
  district: '中西區中環 (Central, Central and Western District)',
  completionYear: 1987,
  currentName: '告羅士打大廈 Gloucester Tower',
  developer: 'Hongkong Land (香港置地)',
  architect: 'P&T Group (巴馬丹拿集團)',
  style: 'Late-Modernist Reflective Glass Office Skyscraper (晚期現代主義反光玻璃寫字樓摩天大樓)',
  osmWay: 107302745,
  height: 159.0,
  storeys: 47
});

export const GLOUCESTER_TOWER_OSM_SOURCE = authoredOsmSource({
  id: 107302745,
  type: 'way',
  version: 4,
  tags: {
    building: 'office',
    'building:levels': '47',
    height: '159',
    'addr:street': "皇后大道中 Queen's Road Central",
    name: '告羅士打大廈 Gloucester Tower',
    'name:en': 'Gloucester Tower',
    'name:zh': '告羅士打大廈'
  },
  geometry: [
    { lat: 22.2815518, lon: 114.1575066 },
    { lat: 22.281754, lon: 114.1578036 },
    { lat: 22.281753, lon: 114.1578162 },
    { lat: 22.2814773, lon: 114.1580355 },
    { lat: 22.2814628, lon: 114.1580336 },
    { lat: 22.2812604, lon: 114.1577365 },
    { lat: 22.2812625, lon: 114.1577232 },
    { lat: 22.2815375, lon: 114.1575045 },
    { lat: 22.2815518, lon: 114.1575066 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const GLOUCESTER_TOWER_RING = Object.freeze(
  GLOUCESTER_TOWER_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(GLOUCESTER_TOWER_RING);
export const GLOUCESTER_TOWER_BOUNDS = Object.freeze(flatRingBounds(GLOUCESTER_TOWER_RING));

let signedArea = 0;
for (let i = 0; i + 3 < GLOUCESTER_TOWER_RING.length; i += 2) {
  signedArea += GLOUCESTER_TOWER_RING[i] * GLOUCESTER_TOWER_RING[i + 3] -
    GLOUCESTER_TOWER_RING[i + 2] * GLOUCESTER_TOWER_RING[i + 1];
}
export const GLOUCESTER_TOWER_RING_AREA = Math.abs(signedArea * 0.5);

export const GLOUCESTER_TOWER_SITE = makeAuthoredSite('gloucester-tower', '告羅士打大廈', 'Gloucester Tower', GLOUCESTER_TOWER_OSM_SOURCE, {
  height: 159.0,
  levels: 47
});

export function gloucesterTowerLocalToWorld(lx, lz) {
  const site = GLOUCESTER_TOWER_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function gloucesterTowerWorldToLocal(wx, wz) {
  const site = GLOUCESTER_TOWER_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}
