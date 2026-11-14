// 新世界大廈 New World Tower, 22-38 Queen's Road Central, Central (1983).
//
// 151-metre, 41-storey Grade-A office tower fronting Queen's Road Central.
// Rectangular tower block with reflective glass curtain wall and aluminium spandrel bands.
//
// OSM Way: 1323550598 (151m, 41 levels).
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 22-38 Queen's Road Central, Central, Hong Kong (香港中環皇后大道中22至38號).
// Completed: 1983.
// Height: 151.0m (41 levels).
// OSM Way: 1323550598.
// Key Architectural Highlights:
// - Rectangular office tower with reflective glass curtain wall.
// - Aluminium spandrel bands separating office floors.
// - Ground-floor retail podium with entrance facing Queen's Road Central.
//
// NOTE: geometry below is extracted from OSM way 1323550598.

export const NEW_WORLD_TOWER_HERITAGE = Object.freeze({
  address: '香港中環皇后大道中22至38號 (22-38 Queen\'s Road Central, Central, Hong Kong)',
  district: '中西區中環 (Central, Central and Western District)',
  completionYear: 1983,
  currentName: 'New World Tower (新世界大廈)',
  architect: null,
  developer: null,
  style: 'Late Modernist Office Tower (晚期現代主義辦公摩天大廈)',
  osmWay: 1323550598,
  height: 151.0,
  storeys: 41
});

export const NEW_WORLD_TOWER_OSM_SOURCE = authoredOsmSource({
  id: 1323550598,
  type: 'way',
  version: null,
  tags: {
    building: 'office',
    'building:levels': '41',
    height: '151',
    'addr:housename': 'New World Tower',
    'addr:housename:en': 'New World Tower',
    'addr:housename:zh': '新世界大廈',
    'addr:street': '皇后大道中 Queen\'s Road Central',
    'addr:street:en': "Queen's Road Central",
    'addr:street:zh': '皇后大道中',
    name: '新世界大廈 New World Tower',
    'name:en': 'New World Tower',
    'name:zh': '新世界大廈'
  },
  geometry: [
    { lon: 114.1569954, lat: 22.2802815 },
    { lon: 114.1568528, lat: 22.280179 },
    { lon: 114.1567191, lat: 22.2803383 },
    { lon: 114.1568617, lat: 22.2804408 },
    { lon: 114.1568706, lat: 22.2804303 },
    { lon: 114.1568869, lat: 22.280442 },
    { lon: 114.1568169, lat: 22.2805255 },
    { lon: 114.1571129, lat: 22.2807381 },
    { lon: 114.1572323, lat: 22.2808239 },
    { lon: 114.1573633, lat: 22.2806682 },
    { lon: 114.1574433, lat: 22.2805731 },
    { lon: 114.1574279, lat: 22.280562 },
    { lon: 114.1573133, lat: 22.2804796 },
    { lon: 114.1572192, lat: 22.2804121 },
    { lon: 114.1571958, lat: 22.2803952 },
    { lon: 114.1571159, lat: 22.2804905 },
    { lon: 114.1569477, lat: 22.2803696 },
    { lon: 114.1569313, lat: 22.2803579 },
    { lon: 114.1569954, lat: 22.2802815 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const NEW_WORLD_TOWER_RING = Object.freeze(
  NEW_WORLD_TOWER_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(NEW_WORLD_TOWER_RING);
export const NEW_WORLD_TOWER_BOUNDS = Object.freeze(flatRingBounds(NEW_WORLD_TOWER_RING));

let signedArea = 0;
for (let i = 0; i + 3 < NEW_WORLD_TOWER_RING.length; i += 2) {
  signedArea += NEW_WORLD_TOWER_RING[i] * NEW_WORLD_TOWER_RING[i + 3] -
    NEW_WORLD_TOWER_RING[i + 2] * NEW_WORLD_TOWER_RING[i + 1];
}
export const NEW_WORLD_TOWER_RING_AREA = Math.abs(signedArea * 0.5);

export const NEW_WORLD_TOWER_SITE = Object.freeze({
  ...makeAuthoredSite('newWorldTower', '新世界大廈', 'New World Tower', NEW_WORLD_TOWER_OSM_SOURCE, {
    height: 151.0,
    levels: 41
  }),
  podiumHeight: null,
  shaftHeight: null,
  crownHeight: null
});

export function newWorldTowerLocalToWorld(lx, lz) {
  const site = NEW_WORLD_TOWER_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function newWorldTowerWorldToLocal(wx, wz) {
  const site = NEW_WORLD_TOWER_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const NEW_WORLD_TOWER_LOCAL_RING = Object.freeze(
  NEW_WORLD_TOWER_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = newWorldTowerWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
