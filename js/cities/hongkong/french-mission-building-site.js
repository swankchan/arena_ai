// 法國外方傳道會大樓 French Mission Building, 1 Battery Path, 中環 (中西區).
// Declared Monument, 4 levels.
// OSM Way: 85320697.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 1 Battery Path, 中環, Hong Kong (香港中環炮台里1號).
// Levels: 4.
// OSM Way: 85320697.
// Key Architectural Highlights:
// - Declared Monument (法定古蹟 DM37).
// - Former Court of Final Appeal Building, French Renaissance style.
//
// NOTE: geometry below is extracted from OSM way 85320697.

export const FRENCH_MISSION_BUILDING_HERITAGE = Object.freeze({
  address: '香港中環炮台里1號 (1 Battery Path, Central, Hong Kong)',
  district: '中西區中環 (Central, Central and Western District)',
  completionYear: 1917,
  currentName: 'French Mission Building (法國外方傳道會大樓)',
  architect: null,
  developer: null,
  style: 'French Renaissance Heritage Building (法式文藝復興風格古蹟)',
  osmWay: 85320697,
  height: null,
  storeys: 4
});

export const FRENCH_MISSION_BUILDING_OSM_SOURCE = authoredOsmSource({
  id: 85320697,
  type: 'way',
  version: null,
  tags: {
    building: 'office',
    'building:levels': '4',
    'heritage': '2',
    'heritage:ref': 'M0037',
    'historic': 'building',
    'addr:housenumber': '1',
    'addr:street': '炮台里 Battery Path',
    'addr:street:en': 'Battery Path',
    'addr:street:zh': '炮台里',
    name: '法國外方傳道會大樓 French Mission Building',
    'name:en': 'French Mission Building',
    'name:zh': '法國外方傳道會大樓',
    'name:zh-Hans': '法国外方传道会大楼',
    'name:zh-Hant': '法國外方傳道會大樓',
    'old_name': '終審法院大樓 Court of Final Appeal Building',
    'old_name:en': 'Court of Final Appeal Building',
    'old_name:zh': '終審法院大樓',
    'protection_title': '法定古蹟 Declared Monument',
    'protection_title:en': 'Declared Monument',
    'protection_title:zh': '法定古蹟',
    'ref:HK': 'DM37',
    'roof': 'separate',
    'roof:levels': '2',
    'start_date': '1917',
    'wikidata': 'Q1595391',
    'wikipedia': 'en:Former French Mission Building'
  },
  geometry: [
    { lon: 114.1596598, lat: 22.2792486 },
    { lon: 114.1598706, lat: 22.2794864 },
    { lon: 114.1596352, lat: 22.2796522 },
    { lon: 114.1596117, lat: 22.2796464 },
    { lon: 114.159551, lat: 22.27957 },
    { lon: 114.1596111, lat: 22.2795259 },
    { lon: 114.159485, lat: 22.2793758 },
    { lon: 114.1596598, lat: 22.2792486 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const FRENCH_MISSION_BUILDING_RING = Object.freeze(
  FRENCH_MISSION_BUILDING_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(FRENCH_MISSION_BUILDING_RING);
export const FRENCH_MISSION_BUILDING_BOUNDS = Object.freeze(flatRingBounds(FRENCH_MISSION_BUILDING_RING));

let signedArea = 0;
for (let i = 0; i + 3 < FRENCH_MISSION_BUILDING_RING.length; i += 2) {
  signedArea += FRENCH_MISSION_BUILDING_RING[i] * FRENCH_MISSION_BUILDING_RING[i + 3] -
    FRENCH_MISSION_BUILDING_RING[i + 2] * FRENCH_MISSION_BUILDING_RING[i + 1];
}
export const FRENCH_MISSION_BUILDING_RING_AREA = Math.abs(signedArea * 0.5);

export const FRENCH_MISSION_BUILDING_SITE = Object.freeze({
  ...makeAuthoredSite('frenchMissionBuilding', '法國外方傳道會大樓', 'French Mission Building', FRENCH_MISSION_BUILDING_OSM_SOURCE, {
    height: null,
    levels: 4
  }),
  podiumHeight: null,
  shaftHeight: null,
  crownHeight: null
});

export function frenchMissionBuildingLocalToWorld(lx, lz) {
  const site = FRENCH_MISSION_BUILDING_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function frenchMissionBuildingWorldToLocal(wx, wz) {
  const site = FRENCH_MISSION_BUILDING_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const FRENCH_MISSION_BUILDING_LOCAL_RING = Object.freeze(
  FRENCH_MISSION_BUILDING_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = frenchMissionBuildingWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
